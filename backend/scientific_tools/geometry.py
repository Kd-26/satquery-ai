import numpy as np
from affine import Affine


class UnverifiedGeometryError(Exception):
    pass


def measure_regions(mask: np.ndarray, pixel_spacing_m: float = None, crs: str = None, transform=None) -> dict:
    if crs is None:
        raise UnverifiedGeometryError("Cannot calculate physical area: CRS is missing.")
    if transform is None and pixel_spacing_m is None:
        raise UnverifiedGeometryError(
            "Cannot calculate physical area: both affine transform and pixel spacing are missing."
        )

    pixel_count = int(np.sum(mask > 0))

    if transform is not None and crs:
        try:
            from rasterio.crs import CRS
            affine = transform if isinstance(transform, Affine) else Affine(*transform[:6])
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
                return {
                    "pixel_count": pixel_count,
                    "area_m2": float(area_m2),
                    "area_hectares": float(area_m2 / 10000.0),
                    "is_geographic": True,
                    "method": "geodesic_polygon",
                    "uncertainty_pct": 0.5,
                }
            raise UnverifiedGeometryError(f"CRS {crs!r} is neither projected nor geographic.")
        except UnverifiedGeometryError:
            raise
        except Exception as exc:
            raise UnverifiedGeometryError(
                f"Exact area calculation failed for CRS {crs!r}: {type(exc).__name__}."
            ) from exc

    # No affine transform is available, so this is explicitly approximate even
    # if the CRS itself is known.
    is_geographic = any(
        marker in crs.upper() for marker in ("EPSG:4326", "GEOGCS", "WGS 84")
    )
    if pixel_spacing_m is None:
        raise UnverifiedGeometryError("Pixel spacing is required when no affine transform is available.")
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
