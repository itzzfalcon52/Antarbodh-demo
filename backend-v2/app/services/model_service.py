import torch
from fastapi import HTTPException

from ..config import settings
from ..model.antarbodh_cnn import AntarBodhCNN


class ModelService:

    def __init__(self):
        self.device = torch.device(
            "cuda"
            if torch.cuda.is_available()
            else "mps"
            if torch.backends.mps.is_available()
            else "cpu"
        )

        self.model = None
        self._is_loaded = False

    def load(self):
        """Load the frozen ANTARBODH CNN v1 checkpoint."""

        if self._is_loaded:
            return

        print(
            f"Loading Frozen CNN v1 from "
            f"{settings.checkpoint_path}"
        )

        if not settings.checkpoint_path.exists():
            raise FileNotFoundError(
                f"Checkpoint not found at "
                f"{settings.checkpoint_path}"
            )

        # Build the exact architecture used during training.
        self.model = AntarBodhCNN(
            in_channels=settings.input_channels,
            out_depths=len(settings.target_depths),
        )

        checkpoint = torch.load(
            settings.checkpoint_path,
            map_location=self.device,
            weights_only=True,
        )

        if "model_state_dict" not in checkpoint:
            raise RuntimeError(
                "Invalid ANTARBODH checkpoint: "
                "'model_state_dict' not found."
            )

        state_dict = checkpoint["model_state_dict"]

        self.model.load_state_dict(
            state_dict
        )

        # Frozen inference mode.
        self.model.to(self.device)
        self.model.eval()

        self._is_loaded = True

        print(
            f"Model loaded successfully on "
            f"{self.device}."
        )

    def is_loaded(self):
        """Return whether the model has been loaded."""

        return self._is_loaded

    def predict(self, input_tensor):
        """Run inference using the frozen ANTARBODH CNN."""

        if not self._is_loaded:
            self.load()

        # Expected:
        # [batch, channels, latitude, longitude]

        if input_tensor.ndim != 4:
            raise HTTPException(
                status_code=500,
                detail=(
                    "Model expects a 4D tensor "
                    "[batch, channels, latitude, longitude], "
                    f"got shape {tuple(input_tensor.shape)}"
                ),
            )

        if (
            input_tensor.shape[1]
            != settings.input_channels
        ):
            raise HTTPException(
                status_code=500,
                detail=(
                    f"Model expects "
                    f"{settings.input_channels} channels, "
                    f"got {input_tensor.shape[1]}"
                ),
            )

        with torch.no_grad():

            input_tensor = input_tensor.to(
                self.device
            )

            output = self.model(
                input_tensor
            )

            return (
                output
                .cpu()
                .numpy()
                .squeeze(0)
            )


model_service = ModelService()