import numpy as np

class UnverifiedGeometryError(Exception):
    pass

def measure_regions(mask: np.ndarray, pixel_spacing_m: float = None, crs: str = None) -> dict:
    if pixel_spacing_m is None or crs is None:
        raise UnverifiedGeometryError("Cannot calculate physical area: pixel_spacing_m or crs is missing.")
        
    pixel_count = np.sum(mask > 0)
    
    # Basic check if CRS looks geographic
    is_geographic = False
    if crs and ("EPSG:4326" in crs.upper() or "GEOGCS" in crs.upper() or "WGS 84" in crs.upper()):
        is_geographic = True
        
    # In a full implementation, if is_geographic is True, we would use pyproj.Geod 
    # to calculate the exact geodesic area of the polygons formed by the mask.
    # For this baseline, we use the provided pixel_spacing_m as the linear dimension.
    
    area_m2 = float(pixel_count * (pixel_spacing_m ** 2))
    area_ha = area_m2 / 10000.0
    
    return {
        "pixel_count": int(pixel_count),
        "area_m2": area_m2,
        "area_hectares": area_ha,
        "is_geographic": is_geographic
    }
