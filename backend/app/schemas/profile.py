"""Pydantic schemas for vertical temperature profiles."""

from typing import List, Optional
from pydantic import BaseModel

class ProfileResponse(BaseModel):
    date: str
    latitude: float
    longitude: float
    depths: List[float]
    temperatures: List[Optional[float]]
    units: str = "°C"
    is_ocean: bool = True
