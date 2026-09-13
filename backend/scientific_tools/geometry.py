import numpy as np
from affine import Affine

class UnverifiedGeometryError(Exception):
    pass

def measure_regions(mask: np.ndarray, pixel_spacing_m: float = None, crs: str = None, transform=None) -> dict:
    if pixel_spacing_m is None or crs is None:
        raise UnverifiedGeometryError("Cannot calculate physical area: pixel_spacing_m or crs is missing.")
        
    pixel_count = int(np.sum(mask > 0))

    if transform is not None and crs:
        affine = transform if isinstance(transform, Affine) else Affine(*transform[:6])
        try:
            from rasterio.crs import CRS

            parsed_crs = CRS.from_user_input(crs)
            if parsed_crs.is_projected:
                _, unit_factor = parsed_crs.linear_units_factor
                area_m2 = pixel_count * abs(affine.a * affine.e - affine.b * affine.d) * unit_factor**2
                return {
                    "pixel_count": pixel_count,
                    "area_m2": float(area_m2),
                    "area_hectares": float(area_m2 / 10000.0),
                    "is_geographic": False,
                    "method": "projected_affine",
                    "uncertainty_pct": 0.1,
                }
            if parsed_crs.is_geographic:
                from pyproj import Geod
                from rasterio.features import shapes
                from shapely.geometry import shape

                geod = Geod(ellps="WGS84")
                area_m2 = 0.0
                binary = (mask > 0).astype(np.uint8)
                for geom, value in shapes(binary, mask=binary.astype(bool), transform=affine):
                    if value:
                        area_m2 += abs(geod.geometry_area_perimeter(shape(geom))[0])
                method = "geodesic_polygon"
                uncertainty_pct = 0.5
                return {
                    "pixel_count": pixel_count,
                    "area_m2": float(area_m2),
                    "area_hectares": float(area_m2 / 10000.0),
                    "is_geographic": True,
                    "method": "geodesic_polygon",
                    "uncertainty_pct": 0.5,
                }
        except Exception:
            pass
    
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
        "pixel_count": pixel_count,
        "area_m2": area_m2,
        "area_hectares": area_ha,
        "is_geographic": is_geographic,
        "method": "pixel_spacing_approximation",
        "uncertainty_pct": 10.0,
    }
