import re
from backend.schemas.evidence_package import EvidencePackage
from backend.schemas.verification_result import VerificationResult

def verify_answer(answer_text: str, evidence: EvidencePackage) -> VerificationResult:
    flagged_claims = []
    notes = []
    
    # 1. Numeric claim cross-checking
    # Regex to find numbers possibly followed by units (ha, m2, m², %, etc.)
    # This is a basic regex; robust NLP would be better.
    num_pattern = re.compile(r'\b(\d+(?:\.\d+)?)\b')
    
    mentioned_numbers = [float(match.group(1)) for match in num_pattern.finditer(answer_text)]
    
    valid_measurements = [c.measurement for c in evidence.claims]
    
    tolerance = 0.05 # 5% tolerance for rounding
    
    for num in mentioned_numbers:
        # Ignore small integers often used for counting/general language
        if num < 10 and num.is_integer():
            continue
            
        is_valid = False
        for meas in valid_measurements:
            if meas == 0:
                if num == 0:
                    is_valid = True
                    break
            else:
                if abs(num - meas) / abs(meas) <= tolerance:
                    is_valid = True
                    break
                    
        if not is_valid:
            flagged_claims.append(f"Number {num} not found in evidence.")
            
    # 2. Region/image reference validation
    # Extract potential UUIDs or ID-like strings.
    uuid_pattern = re.compile(r'\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b', re.IGNORECASE)
    mentioned_ids = [match.group(0).lower() for match in uuid_pattern.finditer(answer_text)]
    
    valid_region_ids = set([c.region_id.lower() for c in evidence.claims])
    valid_image_ids = set()
    for c in evidence.claims:
        for img_id in c.source_images:
            valid_image_ids.add(img_id.lower())
            
    for mentioned_id in mentioned_ids:
        if mentioned_id not in valid_region_ids and mentioned_id not in valid_image_ids:
            flagged_claims.append(f"ID {mentioned_id} mentioned but not found in evidence claims or source images.")
            
    passed = len(flagged_claims) == 0
    if not passed:
        notes.append("Answer contains numeric claims or IDs not backed by evidence.")
        
    return VerificationResult(
        passed=passed,
        flagged_claims=flagged_claims,
        notes=notes
    )
