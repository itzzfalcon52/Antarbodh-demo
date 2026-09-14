"""Model evaluation for ANTARBODH.

Loads a trained checkpoint and evaluates on the test set, producing:
- Overall RMSE / MAE / Bias / Correlation
- Per-depth metrics
- Results saved to ``outputs/evaluation/``

Usage
-----
::

    python -m src.training.evaluate
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import torch
from torch.utils.data import DataLoader

from .model import AntarBodhCNN, AntarBodhCNNLite
from .losses import (
    masked_rmse,
    masked_mae,
    masked_bias,
    masked_correlation,
    per_depth_metrics,
)
from .dataset import AntarBodhDataset


# ---------------------------------------------------------------------------
# Target depth labels
# ---------------------------------------------------------------------------

DEPTH_LABELS = [
    "0m", "5m", "10m", "20m", "30m", "50m", "75m",
    "100m", "125m", "150m", "200m", "300m", "500m", "700m", "1000m",
]


def evaluate(
    checkpoint_path: str = "outputs/checkpoints/best_model.pt",
    data_dir: str = "data/processed",
    batch_size: int = 8,
    output_dir: str = "outputs/evaluation",
) -> dict:
    """Evaluate a trained model on the test set.

    Parameters
    ----------
    checkpoint_path : str
        Path to the saved checkpoint.
    data_dir : str
        Directory containing processed inputs/targets/masks.
    batch_size : int
        Batch size for evaluation.
    output_dir : str
        Directory to save evaluation results.

    Returns
    -------
    dict
        Evaluation results with overall and per-depth metrics.
    """
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Evaluating on: {device}")

    # Load checkpoint
    ckpt = torch.load(checkpoint_path, map_location=device, weights_only=False)
    cfg = ckpt.get("config", {})

    # Verify data contract from checkpoint
    if "data_contract" in ckpt:
        expected_channels = ckpt["data_contract"].get("input_channels", 14)
    else:
        print("Warning: No data_contract found in checkpoint. Assuming 14 channels.")
        expected_channels = 14

    # Build model
    model_type = cfg.get("model", "cnn")
    if model_type == "cnn_lite":
        model = AntarBodhCNNLite(in_channels=expected_channels)
    else:
        model = AntarBodhCNN(in_channels=expected_channels, base_filters=cfg.get("base_filters", 64))

    model.load_state_dict(ckpt["model_state_dict"])
    model = model.to(device)
    model.eval()

    # Load test data
    test_ds = AntarBodhDataset(
        nc_path=Path(data_dir) / "test.nc",
        patch_size=None,  # Full spatial field for evaluation
    )
    
    if test_ds.X.shape[1] != expected_channels:
        raise ValueError(
            f"Checkpoint expects {expected_channels} channels, "
            f"but test.nc has {test_ds.X.shape[1]} channels."
        )
    test_loader = DataLoader(
        test_ds,
        batch_size=batch_size,
        shuffle=False,
        num_workers=0,
    )

    print(f"Test samples: {len(test_ds)}")

    # Accumulate predictions
    all_preds = []
    all_targets = []
    all_masks = []

    with torch.no_grad():
        for batch in test_loader:
            x = batch["input"].to(device)
            y = batch["target"].to(device)
            mask = batch["target_mask"].to(device)

            pred = model(x)

            all_preds.append(pred.cpu())
            all_targets.append(y.cpu())
            all_masks.append(mask.cpu())

    preds = torch.cat(all_preds, dim=0)
    targets = torch.cat(all_targets, dim=0)
    masks = torch.cat(all_masks, dim=0)

    # Overall metrics
    overall = {
        "rmse": round(masked_rmse(preds, targets, masks), 6),
        "mae":  round(masked_mae(preds, targets, masks), 6),
        "bias": round(masked_bias(preds, targets, masks), 6),
        "corr": round(masked_correlation(preds, targets, masks), 6),
    }

    # Per-depth metrics
    depth_metrics = per_depth_metrics(preds, targets, masks, DEPTH_LABELS)

    results = {
        "checkpoint":  checkpoint_path,
        "test_samples": len(test_ds),
        "overall":     overall,
        "per_depth":   depth_metrics,
    }

    # Print results
    print()
    print("=" * 60)
    print("ANTARBODH Test Evaluation Results")
    print("=" * 60)
    print(f"Overall RMSE:  {overall['rmse']:.4f} °C")
    print(f"Overall MAE:   {overall['mae']:.4f} °C")
    print(f"Overall Bias:  {overall['bias']:.4f} °C")
    print(f"Overall Corr:  {overall['corr']:.4f}")
    print()
    print(f"{'Depth':>8s}  {'RMSE':>8s}  {'MAE':>8s}  {'Bias':>8s}  {'Corr':>8s}")
    print("-" * 44)
    for dm in depth_metrics:
        print(
            f"{dm['depth']:>8s}  "
            f"{dm['rmse']:>8.4f}  "
            f"{dm['mae']:>8.4f}  "
            f"{dm['bias']:>8.4f}  "
            f"{dm['corr']:>8.4f}"
        )

    # Save results
    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)
    result_path = out / "test_results.json"
    with result_path.open("w", encoding="utf-8") as fh:
        json.dump(results, fh, indent=2)
    print(f"\nResults saved to: {result_path}")

    return results


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    ckpt = sys.argv[1] if len(sys.argv) > 1 else "outputs/checkpoints/best_model.pt"
    evaluate(checkpoint_path=ckpt)
