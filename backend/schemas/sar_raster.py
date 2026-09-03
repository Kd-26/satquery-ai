from pydantic import BaseModel, ConfigDict
from typing import Literal
import numpy as np

class SARRaster(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)
    
    array: np.ndarray
    representation: Literal['dB', 'linear']
    polarization: Literal['VV', 'VH']
