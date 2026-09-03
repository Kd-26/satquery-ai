from backend.schemas.input_profile import InputProfile
from datetime import datetime

def check_pair_compatibility(profile_a: InputProfile, profile_b: InputProfile) -> dict:
    results = {}
    
    crs_match = profile_a.crs == profile_b.crs and profile_a.crs is not None
    results['crs_match'] = crs_match
    
    # In reality, this requires intersecting geotransformed bounding boxes
    overlap_valid = True 
    results['bounding_box_overlap'] = overlap_valid
    
    date_gap_days = None
    if profile_a.acquisition_date and profile_b.acquisition_date:
        try:
            d1 = datetime.fromisoformat(profile_a.acquisition_date.replace("Z", "+00:00"))
            d2 = datetime.fromisoformat(profile_b.acquisition_date.replace("Z", "+00:00"))
            date_gap_days = abs((d2 - d1).days)
        except ValueError:
            pass
    
    results['date_gap_days'] = date_gap_days
    
    compatible = crs_match and overlap_valid
    results['compatible'] = compatible
    
    return results
