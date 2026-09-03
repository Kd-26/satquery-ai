import rasterio
import numpy as np

def read_raster_metadata(path: str) -> dict:
    with rasterio.open(path) as src:
        return {
            "dimensions": [src.height, src.width],
            "dtype": src.dtypes[0] if src.dtypes else None,
            "channel_count": src.count,
            "crs": src.crs.to_string() if src.crs else None,
            "transform": [src.transform.a, src.transform.b, src.transform.c,
                          src.transform.d, src.transform.e, src.transform.f] if src.transform else None,
            "nodata": src.nodatavals[0] if src.nodatavals else None
        }

def read_bands(path: str, band_indices: list[int] = None) -> np.ndarray:
    with rasterio.open(path) as src:
        if band_indices:
            return src.read(band_indices)
        return src.read()

def is_georeferenced(path: str) -> bool:
    with rasterio.open(path) as src:
        return src.crs is not None and src.transform != rasterio.transform.IDENTITY
