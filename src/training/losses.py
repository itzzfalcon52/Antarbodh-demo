"""Loss functions and evaluation metrics for ANTARBODH.

All losses are mask-aware: they ignore grid cells where the target
observation is missing (NaN → mask = 0).

Metrics
-------
- Masked MSE / RMSE
- Masked MAE
- Bias (mean signed error)
- Pearson correlation coefficient
"""

from __future__ import annotations

import torch
import torch.nn as nn
import torch.nn.functional as F


class MaskedMSELoss(nn.Module):
    """MSE loss that ignores masked (NaN/invalid) target positions.

    Parameters
    ----------
    depth_weights : torch.Tensor, optional
        Per-depth weighting, shape ``(15,)`` or ``(n_depths,)``.
        If given, the loss for each depth level is multiplied by the
        corresponding weight before averaging.
    """

    def __init__(self, depth_weights: torch.Tensor | None = None):
        super().__init__()
        self.depth_weights = depth_weights

    def forward(
        self,
        pred: torch.Tensor,
        target: torch.Tensor,
        mask: torch.Tensor,
    ) -> torch.Tensor:
        """Compute masked MSE.

        Parameters
        ----------
        pred : (B, D, H, W)
            Model predictions.
        target : (B, D, H, W)
            Ground-truth GLORYS temperatures.
        mask : (B, D, H, W)
            Binary mask (1 = valid, 0 = missing).

        Returns
        -------
        torch.Tensor
            Scalar loss.
        """
        diff2 = (pred - target) ** 2 * mask

        if self.depth_weights is not None:
            w = self.depth_weights.to(pred.device)
            # Broadcast: (D,) → (1, D, 1, 1)
            w = w.view(1, -1, 1, 1)
            diff2 = diff2 * w

        n_valid = mask.sum()
        if n_valid == 0:
            return torch.tensor(0.0, device=pred.device, requires_grad=True)
        return diff2.sum() / n_valid


class MaskedMAELoss(nn.Module):
    """MAE loss that ignores masked positions."""

    def forward(
        self,
        pred: torch.Tensor,
        target: torch.Tensor,
        mask: torch.Tensor,
    ) -> torch.Tensor:
        diff = torch.abs(pred - target) * mask
        n_valid = mask.sum()
        if n_valid == 0:
            return torch.tensor(0.0, device=pred.device, requires_grad=True)
        return diff.sum() / n_valid


# ---------------------------------------------------------------------------
# Evaluation metrics (no gradient required)
# ---------------------------------------------------------------------------

@torch.no_grad()
def masked_rmse(
    pred: torch.Tensor,
    target: torch.Tensor,
    mask: torch.Tensor,
) -> float:
    """Root mean squared error on valid cells."""
    diff2 = (pred - target) ** 2 * mask
    n = mask.sum().item()
    if n == 0:
        return float("nan")
    return (diff2.sum().item() / n) ** 0.5


@torch.no_grad()
def masked_mae(
    pred: torch.Tensor,
    target: torch.Tensor,
    mask: torch.Tensor,
) -> float:
    """Mean absolute error on valid cells."""
    diff = torch.abs(pred - target) * mask
    n = mask.sum().item()
    if n == 0:
        return float("nan")
    return diff.sum().item() / n


@torch.no_grad()
def masked_bias(
    pred: torch.Tensor,
    target: torch.Tensor,
    mask: torch.Tensor,
) -> float:
    """Mean signed error (bias) on valid cells."""
    diff = (pred - target) * mask
    n = mask.sum().item()
    if n == 0:
        return float("nan")
    return diff.sum().item() / n


@torch.no_grad()
def masked_correlation(
    pred: torch.Tensor,
    target: torch.Tensor,
    mask: torch.Tensor,
) -> float:
    """Pearson correlation coefficient on valid cells."""
    valid = mask.bool()
    p = pred[valid].flatten()
    t = target[valid].flatten()

    if len(p) < 2:
        return float("nan")

    p_mean = p.mean()
    t_mean = t.mean()
    cov = ((p - p_mean) * (t - t_mean)).mean()
    p_std = p.std(unbiased=False)
    t_std = t.std(unbiased=False)

    if p_std == 0 or t_std == 0:
        return float("nan")

    return (cov / (p_std * t_std)).item()


@torch.no_grad()
def per_depth_metrics(
    pred: torch.Tensor,
    target: torch.Tensor,
    mask: torch.Tensor,
    depth_names: list[str] | None = None,
) -> list[dict]:
    """Compute RMSE, MAE, bias, and correlation for each depth level.

    Parameters
    ----------
    pred, target, mask : (B, D, H, W)
    depth_names : list[str], optional
        Human-readable depth labels.

    Returns
    -------
    list[dict]
        One dict per depth with keys ``depth``, ``rmse``, ``mae``,
        ``bias``, ``corr``.
    """
    n_depths = pred.shape[1]
    if depth_names is None:
        depth_names = [str(i) for i in range(n_depths)]

    results = []
    for d in range(n_depths):
        p = pred[:, d:d+1]
        t = target[:, d:d+1]
        m = mask[:, d:d+1]

        results.append({
            "depth":  depth_names[d] if d < len(depth_names) else str(d),
            "rmse":   round(masked_rmse(p, t, m), 6),
            "mae":    round(masked_mae(p, t, m), 6),
            "bias":   round(masked_bias(p, t, m), 6),
            "corr":   round(masked_correlation(p, t, m), 6),
        })

    return results
