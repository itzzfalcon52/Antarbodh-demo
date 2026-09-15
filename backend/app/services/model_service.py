import torch
import sys
from pathlib import Path
import numpy as np
from fastapi import HTTPException

# Ensure root is in path to import from src
REPO_ROOT = Path(__file__).resolve().parent.parent.parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from src.training.model import AntarBodhCNN
from ..config import settings

class ModelService:
    """Immutable service that loads the frozen CNN v1 once into memory and exposes predict()."""
    def __init__(self):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "mps" if torch.backends.mps.is_available() else "cpu")
        self.model = None
        self._is_loaded = False
        
    def load(self):
        if self._is_loaded:
            return
            
        print(f"Loading Frozen CNN v1 from {settings.checkpoint_path}")
        if not settings.checkpoint_path.exists():
            raise FileNotFoundError(f"Checkpoint not found at {settings.checkpoint_path}")
            
        self.model = AntarBodhCNN(
            in_channels=settings.input_channels,
            out_depths=len(settings.target_depths)
        )
        
        state_dict = torch.load(settings.checkpoint_path, map_location=self.device)
        self.model.load_state_dict(state_dict)
        self.model.to(self.device)
        self.model.eval()
        self._is_loaded = True
        print(f"Model loaded successfully on {self.device}.")

    def is_loaded(self) -> bool:
        return self._is_loaded

    def predict(self, input_tensor: torch.Tensor) -> np.ndarray:
        """
        Run inference.
        input_tensor: (1, 14, 60, 80)
        Returns: numpy array of shape (15, 60, 80)
        """
        if not self._is_loaded:
            self.load()
            
        if input_tensor.shape[1] != settings.input_channels:
            raise HTTPException(status_code=500, detail=f"Model expects {settings.input_channels} channels, got {input_tensor.shape[1]}")
            
        with torch.no_grad():
            input_tensor = input_tensor.to(self.device)
            output = self.model(input_tensor)
            return output.cpu().numpy().squeeze(0) # Remove batch dim

model_service = ModelService()
