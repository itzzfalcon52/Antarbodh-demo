"""AntarBodh CNN baseline model (Stage 2).

Architecture
------------
A multi-scale encoder-decoder CNN that maps surface observations to
subsurface temperature profiles:

    Input:  (B, 13, H, W)  — 13 surface channels
    Output: (B, 15, H, W)  — 15 depth levels

The encoder extracts spatial features at increasing receptive fields.
The decoder maps the feature representation to 15 depth predictions.
Skip connections preserve high-resolution spatial information.

This is intentionally a simple baseline.  More advanced architectures
(CNN+LSTM, Transformer, physics-aware) are planned for later stages.
"""

from __future__ import annotations

import torch
import torch.nn as nn


class ConvBlock(nn.Module):
    """Conv2d → BatchNorm → ReLU → Conv2d → BatchNorm → ReLU."""

    def __init__(self, in_ch: int, out_ch: int):
        super().__init__()
        self.block = nn.Sequential(
            nn.Conv2d(in_ch, out_ch, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(out_ch),
            nn.ReLU(inplace=True),
            nn.Conv2d(out_ch, out_ch, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(out_ch),
            nn.ReLU(inplace=True),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.block(x)


class AntarBodhCNN(nn.Module):
    """Stage-2 CNN baseline for subsurface temperature reconstruction.

    Parameters
    ----------
    in_channels : int
        Number of surface input channels (default 13).
    out_depths : int
        Number of target depth levels (default 15).
    base_filters : int
        Number of filters in the first encoder layer (default 64).
        Subsequent layers double the filter count.
    """

    def __init__(
        self,
        in_channels: int = 13,
        out_depths: int = 15,
        base_filters: int = 64,
    ):
        super().__init__()
        f = base_filters

        # Encoder (no spatial downsampling — preserves H×W)
        self.enc1 = ConvBlock(in_channels, f)
        self.enc2 = ConvBlock(f, f * 2)
        self.enc3 = ConvBlock(f * 2, f * 4)

        # Bottleneck
        self.bottleneck = ConvBlock(f * 4, f * 4)

        # Decoder with skip connections
        self.dec3 = ConvBlock(f * 4 + f * 4, f * 2)   # skip from enc3
        self.dec2 = ConvBlock(f * 2 + f * 2, f)        # skip from enc2
        self.dec1 = ConvBlock(f + f, f)                 # skip from enc1

        # Depth prediction head
        self.head = nn.Sequential(
            nn.Conv2d(f, f, kernel_size=1),
            nn.ReLU(inplace=True),
            nn.Conv2d(f, out_depths, kernel_size=1),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """Forward pass.

        Parameters
        ----------
        x : torch.Tensor
            Input surface observations, shape ``(B, 7, H, W)``.

        Returns
        -------
        torch.Tensor
            Predicted subsurface temperature, shape ``(B, 15, H, W)``.
        """
        # Encoder
        e1 = self.enc1(x)       # (B, f,   H, W)
        e2 = self.enc2(e1)      # (B, 2f,  H, W)
        e3 = self.enc3(e2)      # (B, 4f,  H, W)

        # Bottleneck
        b = self.bottleneck(e3)  # (B, 4f,  H, W)

        # Decoder with skip connections
        d3 = self.dec3(torch.cat([b, e3], dim=1))     # (B, 2f, H, W)
        d2 = self.dec2(torch.cat([d3, e2], dim=1))    # (B, f,  H, W)
        d1 = self.dec1(torch.cat([d2, e1], dim=1))    # (B, f,  H, W)

        # Depth prediction
        out = self.head(d1)      # (B, 15, H, W)

        return out


class AntarBodhCNNLite(nn.Module):
    """Lightweight CNN variant for faster experimentation.

    Uses fewer parameters (half the base filters) and shallower encoder.

    Parameters
    ----------
    in_channels : int
        Number of surface input channels (default 7).
    out_depths : int
        Number of target depth levels (default 15).
    """

    def __init__(self, in_channels: int = 7, out_depths: int = 15):
        super().__init__()
        self.net = nn.Sequential(
            nn.Conv2d(in_channels, 32, kernel_size=3, padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(inplace=True),

            nn.Conv2d(32, 64, kernel_size=3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(inplace=True),

            nn.Conv2d(64, 64, kernel_size=3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(inplace=True),

            nn.Conv2d(64, 32, kernel_size=3, padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(inplace=True),

            nn.Conv2d(32, out_depths, kernel_size=1),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x)


def count_parameters(model: nn.Module) -> int:
    """Count trainable parameters in a model."""
    return sum(p.numel() for p in model.parameters() if p.requires_grad)
