from abc import ABC, abstractmethod
import xarray as xr
from typing import Optional

class BaseAdapter(ABC):
    @abstractmethod
    def get_available_dates(self) -> list[str]:
        pass

    @abstractmethod
    def has_date(self, date_str: str) -> bool:
        pass

    @abstractmethod
    def load(self, date_str: str) -> Optional[xr.Dataset]:
        pass

    @abstractmethod
    def get_metadata(self) -> dict:
        pass
