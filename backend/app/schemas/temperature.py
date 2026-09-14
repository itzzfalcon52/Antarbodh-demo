"""Pydantic schemas for temperature slices and metadata."""

from typing import List, Optional
from pydantic import BaseModel, Field

class TemperatureSliceResponse(BaseModel):
    date: str
    depth: float
    units: str = "°C"
    latitudes: List[float]
    longitudes: List[float]
    temperature_grid: List[List[Optional[float]]]
    valid_mask: List[List[int]]
    min_temp: Optional[float] = None
    max_temp: Optional[float] = None
    mean_temp: Optional[float] = None

class DomainBounds(BaseModel):
    lat_min: float
    lat_max: float
    lon_min: float
    lon_max: float

class ModelInfoResponse(BaseModel):
    model_id: str
    checkpoint: str
    input_channels: int
    input_channel_names: List[str]
    output_depths: List[float]
    resolution: str
    domain: DomainBounds
    test_period: str

class MetadataResponse(BaseModel):
    project_name: str
    supported_dates: List[str]
    supported_depths: List[float]
    domain: DomainBounds
    resolution_deg: float
    variable_names: List[str]
    units: dict
    sss_availability: dict
    model_info: ModelInfoResponse
