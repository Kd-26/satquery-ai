from backend.schemas.execution_plan import ExecutionPlan
from backend.schemas.input_profile import InputProfile
from backend.schemas.validation_result import ValidationResult
from backend.registry import registry_loader

def validate_plan(plan: ExecutionPlan, profiles: list[InputProfile]) -> ValidationResult:
    approved = True
    restrictions = []
    errors = []
    confidence_caps = {}
    
    # Pre-fetch profiles by id for easy lookup
    # Note: A real implementation might map plan.images to profiles. We assume profiles match plan.images.
    # To keep it simple, we just check ALL profiles for the required bands.
    
    # Check (1): every model_id in plan.required_models exists and bands match
    for model_id in plan.required_models:
        try:
            model = registry_loader.get_by_id(model_id)
        except registry_loader.RegistryEntryNotFoundError:
            approved = False
            errors.append(f"Model {model_id} not found in registry.")
            continue
            
        # Check band compatibility
        req_bands = model.input_contract.get("bands")
        if req_bands:
            for profile in profiles:
                # If a profile doesn't have all required bands, that's an error
                missing_bands = [b for b in req_bands if b not in profile.band_identities]
                if missing_bands:
                    approved = False
                    errors.append(f"Model {model_id} requires bands {req_bands}, but profile {profile.image_id} is missing {missing_bands}.")
                    
    # Check (3): area_estimate restriction logic
    if "area_estimate" in plan.requested_outputs:
        for profile in profiles:
            for restriction in profile.capability_restrictions:
                if "area_estimation" in restriction:
                    restrictions.append(f"area_estimate disabled for {profile.image_id}: {restriction}")
                    # Does not set approved = False

    return ValidationResult(
        approved=approved,
        restrictions=restrictions,
        errors=errors,
        confidence_caps=confidence_caps
    )
