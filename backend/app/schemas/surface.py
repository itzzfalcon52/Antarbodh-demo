"""Pydantic schemas for surface conditions."""

from typing import Optional
from pydantic import BaseModel

class SurfaceVariableItem(BaseModel):
    value: Optional[float] = None
    units: str
    available: bool
    reason: Optional[str] = None

class SurfaceConditionsResponse(BaseModel):
    date: str
    latitude: float
    longitude: float
    sst: SurfaceVariableItem
    sss: SurfaceVariableItem
    ssh: SurfaceVariableItem
    current_u: SurfaceVariableItem
    current_v: SurfaceVariableItem
    current_speed: SurfaceVariableItem
    wind_u: SurfaceVariableItem
    wind_v: SurfaceVariableItem
    wind_speed: SurfaceVariableItem
