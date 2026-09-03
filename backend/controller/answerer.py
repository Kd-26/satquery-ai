from backend.schemas.evidence_package import EvidencePackage
from backend.schemas.execution_plan import ExecutionPlan
from typing import Dict

# Stub for the ML team's VLM service
class VLMServiceStub:
    @staticmethod
    def generate(prompt: str, images: list, adapter_id: str = None) -> str:
        # This is where the ML team will hook in their actual generate call
        return "Mocked VLM response."

def generate_answer(query: str, evidence: EvidencePackage, plan: ExecutionPlan) -> Dict[str, str]:
    """
    Generates technical and plain-language answers from the evidence package.
    
    IMPORTANT ARCHITECTURAL RULE:
    Do not pass raw rasters or high-res masks directly into the VLM prompt context here.
    The VLM operates on serialized summaries of claims and limitations, along with low-res 
    visual previews. The quantitative facts have already been established by the scientific tools
    and recorded in `evidence.claims`. The VLM's job is purely rhetorical translation, not re-measurement.
    """
    # Serialize the evidence claims and limitations
    claims_text = "\n".join([f"- {c.claim}: {c.measurement} (conf: {c.confidence:.2f})" for c in evidence.claims])
    limits_text = "\n".join([f"- {L}" for L in evidence.limitations])
    
    context = f"Claims:\n{claims_text}\n\nLimitations:\n{limits_text}"
    
    # Technical variant
    technical_prompt = (
        f"You are a GIS analyst. Answer the query using ONLY the provided evidence. "
        f"State exact measurements, units, and all limitations clearly. "
        f"Query: {query}\n\nEvidence:\n{context}"
    )
    
    technical_answer = VLMServiceStub.generate(
        prompt=technical_prompt,
        images=[], # Would pass low-res previews here
        adapter_id=plan.final_adapter
    )
    
    # Plain-language variant
    plain_prompt = (
        f"You are a helpful assistant. Answer the query using ONLY the provided evidence, "
        f"but translate exact GIS measurements into everyday phrasing (e.g., 'about 20 football fields' instead of '14.2 ha'). "
        f"Do not invent numbers. You MUST disclose all limitations mentioned in the evidence, but explain them simply. "
        f"Query: {query}\n\nEvidence:\n{context}"
    )
    
    plain_answer = VLMServiceStub.generate(
        prompt=plain_prompt,
        images=[], 
        adapter_id=plan.final_adapter
    )
    
    return {
        "technical": technical_answer,
        "plain_language": plain_answer
    }
