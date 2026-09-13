from backend.schemas.input_profile import InputProfile
from datetime import datetime
from math import isclose

import numpy as np

def check_pair_compatibility(profile_a: InputProfile, profile_b: InputProfile) -> dict:
    results = {}
    
    import rasterio.crs

    # 1. CRS comparison: handles EPSG string equivalence and unprojected benchmark chips
    if profile_a.crs and profile_b.crs:
        try:
            c1 = rasterio.crs.CRS.from_user_input(profile_a.crs)
            c2 = rasterio.crs.CRS.from_user_input(profile_b.crs)
            crs_match = (c1 == c2)
        except Exception:
            crs_match = (profile_a.crs.strip().upper() == profile_b.crs.strip().upper())
    elif profile_a.crs is None and profile_b.crs is None:
        # Benchmark dataset chips (e.g. Sen1Floods11) with identical pixel grid dimensions
        crs_match = (profile_a.dimensions == profile_b.dimensions)
    elif (profile_a.crs is None or profile_b.crs is None) and profile_a.dimensions == profile_b.dimensions:
        # Benchmark dataset chips where one chip lacks CRS metadata but grid dimensions match
        crs_match = True
    else:
        crs_match = False

    results['crs_match'] = crs_match
    
    reprojectable = bool(profile_a.crs and profile_b.crs and profile_a.transform and profile_b.transform)
    results['reprojectable'] = reprojectable
    if profile_a.bounds and profile_b.bounds:
        bounds_a = profile_a.bounds
        bounds_b = profile_b.bounds
        if profile_a.crs and profile_b.crs:
            try:
                from rasterio.warp import transform_bounds
                bounds_a = transform_bounds(profile_a.crs, "EPSG:4326", *bounds_a, densify_pts=21)
                bounds_b = transform_bounds(profile_b.crs, "EPSG:4326", *bounds_b, densify_pts=21)
            except Exception:
                pass
        a_left, a_bottom, a_right, a_top = bounds_a
        b_left, b_bottom, b_right, b_top = bounds_b
        overlap_valid = max(a_left, b_left) < min(a_right, b_right) and max(a_bottom, b_bottom) < min(a_top, b_top)
    else:
        overlap_valid = profile_a.dimensions == profile_b.dimensions
    results['bounding_box_overlap'] = overlap_valid

    if profile_a.transform and profile_b.transform:
        grid_match = profile_a.dimensions == profile_b.dimensions and all(
            isclose(float(a), float(b), rel_tol=1e-9, abs_tol=1e-9)
            for a, b in zip(profile_a.transform, profile_b.transform)
        )
    else:
        grid_match = profile_a.dimensions == profile_b.dimensions
    results['grid_match'] = grid_match
    
    date_gap_days = None
    if profile_a.acquisition_date and profile_b.acquisition_date:
        try:
            d1 = datetime.fromisoformat(profile_a.acquisition_date.replace("Z", "+00:00"))
            d2 = datetime.fromisoformat(profile_b.acquisition_date.replace("Z", "+00:00"))
            date_gap_days = abs((d2 - d1).days)
        except ValueError:
            pass
    
    results['date_gap_days'] = date_gap_days
    
    compatible = overlap_valid and (reprojectable or (crs_match and grid_match))
    results['compatible'] = compatible
    
    return results


def align_to_reference(source: np.ndarray, source_profile: InputProfile, reference_profile: InputProfile, categorical: bool = False) -> dict:
    """Reproject/resample a raster exactly onto a verified reference grid."""
    if not source_profile.crs or not source_profile.transform or not reference_profile.crs or not reference_profile.transform:
        raise ValueError("Alignment requires CRS and affine transforms for both rasters")
    import rasterio
    from affine import Affine
    from rasterio.warp import Resampling, reproject

    bands = source[np.newaxis, ...] if source.ndim == 2 else source
    out = np.zeros((bands.shape[0], *reference_profile.dimensions), dtype=bands.dtype)
    method = Resampling.nearest if categorical else Resampling.bilinear
    for index in range(bands.shape[0]):
        reproject(
            bands[index], out[index],
            src_transform=Affine(*source_profile.transform[:6]), src_crs=source_profile.crs,
            dst_transform=Affine(*reference_profile.transform[:6]), dst_crs=reference_profile.crs,
            resampling=method,
        )
    return {"array": out if source.ndim == 3 else out[0], "profile": reference_profile, "resampling": method.name}
