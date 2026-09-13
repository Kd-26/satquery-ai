from pydantic import BaseModel, ConfigDict, Field
from typing import Literal, Optional, List

class InputProfile(BaseModel):
    model_config = ConfigDict(extra='forbid')
    
    image_id: str
    format: str
    dimensions: List[int]
    channels: int
    band_identities: List[str]
    sensor_type: Optional[str]
    sensor_family: Literal['sentinel-1','sentinel-2','landsat-8','landsat-9','cartosat-2s','risat','unknown']
    crs: Optional[str]
    pixel_spacing_m: Optional[float]
    acquisition_date: Optional[str]
    sar_polarization: Optional[str]
    nodata_value: Optional[float]
    valid_pixel_fraction: Optional[float]
    verified_fields: List[str]
    missing_fields: List[str]
    capability_restrictions: List[str]
    transform: Optional[List[float]] = None
    bounds: Optional[List[float]] = None
    band_identity_source: str = "approximation"
    metadata_confidence: float = 0.5
    approximate_fields: List[str] = Field(default_factory=list)
    scale_factors: List[float] = Field(default_factory=list)
    offsets: List[float] = Field(default_factory=list)
    band_units: List[Optional[str]] = Field(default_factory=list)
    calibration: dict = Field(default_factory=dict)
