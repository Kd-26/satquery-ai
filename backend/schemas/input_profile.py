from pydantic import BaseModel, ConfigDict
from typing import Literal, Optional, List

class InputProfile(BaseModel):
    model_config = ConfigDict(extra='forbid')
    
    image_id: str
    format: str
    dimensions: List[int]
    channels: int
    band_identities: List[str]
    sensor_type: Optional[str]
    sensor_family: Literal['sentinel-1','sentinel-2','cartosat-2s','risat','unknown']
    crs: Optional[str]
    pixel_spacing_m: Optional[float]
    acquisition_date: Optional[str]
    sar_polarization: Optional[str]
    nodata_value: Optional[float]
    valid_pixel_fraction: Optional[float]
    verified_fields: List[str]
    missing_fields: List[str]
    capability_restrictions: List[str]
