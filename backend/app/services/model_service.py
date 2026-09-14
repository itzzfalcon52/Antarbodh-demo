"""Model service for ANTARBODH CNN v1.

Provides frozen model metadata and checkpoint inspection without reloading per request.
"""

import torch
from pathlib import Path
from typing import Dict, Any

from backend.app.config import settings

class ModelService:
    _instance = None
    _model_info: Dict[str, Any] = {}

    @classmethod
    def get_instance(cls) -> "ModelService":
        if cls._instance is None:
            cls._instance = cls()
            cls._instance._initialize()
        return cls._instance

    def _initialize(self):
        ckpt_path = settings.CHECKPOINT_PATH
        if not ckpt_path.exists():
            raise FileNotFoundError(f"Checkpoint not found at: {ckpt_path}")
            
        device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")
        ckpt = torch.load(ckpt_path, map_location=device, weights_only=True)
        
        self._model_info = {
            "model_id": "antarbodh_cnn_v1_sih2026",
            "checkpoint": str(ckpt_path.name),
            "input_channels": 14,
            "input_channel_names": [
                "SST", "SSS", "SSH", "Current_U", "Current_V", "Wind_U", "Wind_V",
                "SST_mask", "SSS_mask", "SSH_mask", "Current_U_mask", "Current_V_mask", "Wind_U_mask", "Wind_V_mask"
            ],
            "output_depths": settings.CANONICAL_DEPTHS,
            "resolution": f"{settings.RESOLUTION_DEG}°",
            "domain": {
                "lat_min": settings.LAT_MIN,
                "lat_max": settings.LAT_MAX,
                "lon_min": settings.LON_MIN,
                "lon_max": settings.LON_MAX
            },
            "test_period": f"{settings.DATE_START} to {settings.DATE_END}",
            "epoch": ckpt.get("epoch", 35)
        }

    def get_model_info(self) -> Dict[str, Any]:
        return self._model_info

model_service = ModelService.get_instance()
