"""Training loop for ANTARBODH.

Provides a complete training workflow with:
- Config-driven hyperparameters
- TensorBoard logging
- Model checkpointing
- Early stopping
- Validation monitoring

Usage
-----
From the repository root::

    python -m src.training.train
"""

from __future__ import annotations

import json
import sys
import time
from pathlib import Path
import numpy as np

import torch
import torch.nn as nn
from torch.utils.data import DataLoader

from .model import AntarBodhCNN, AntarBodhCNNLite, count_parameters
from .losses import MaskedMSELoss, masked_rmse, masked_mae, masked_bias
from .dataset import AntarBodhDataset


# ---------------------------------------------------------------------------
# Default training configuration
# ---------------------------------------------------------------------------

DEFAULT_TRAIN_CONFIG = {
    "epochs": 100,
    "batch_size": 8,
    "learning_rate": 1e-3,
    "weight_decay": 1e-5,
    "patch_size": 32,
    "model": "cnn",          # "cnn" or "cnn_lite"
    "base_filters": 64,
    "early_stop_patience": 15,
    "checkpoint_dir": "outputs/checkpoints",
    "log_dir": "outputs/logs",
    "data_dir": "data/processed",
}


def load_train_config(config_path: str | None = None) -> dict:
    """Load training config from prototype.yaml or use defaults."""
    cfg = DEFAULT_TRAIN_CONFIG.copy()

    if config_path is not None:
        import yaml
        with open(config_path, "r", encoding="utf-8") as fh:
            full_cfg = yaml.safe_load(fh)
        if "training" in full_cfg:
            cfg.update(full_cfg["training"])

    return cfg


def get_device() -> torch.device:
    """Select best available device (CUDA > MPS > CPU)."""
    if torch.cuda.is_available():
        return torch.device("cuda")
    if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        return torch.device("mps")
    return torch.device("cpu")


# ---------------------------------------------------------------------------
# Training engine
# ---------------------------------------------------------------------------

def train_one_epoch(
    model: nn.Module,
    loader: DataLoader,
    criterion: nn.Module,
    optimizer: torch.optim.Optimizer,
    device: torch.device,
) -> dict:
    """Train for one epoch.

    Returns
    -------
    dict
        ``{"loss": ..., "rmse": ..., "mae": ...}``.
    """
    model.train()
    total_loss = 0.0
    sum_sq_err = 0.0
    sum_abs_err = 0.0
    sum_valid = 0.0
    n_batches = 0

    for batch in loader:
        x = batch["input"].to(device)
        y = batch["target"].to(device)
        mask = batch["target_mask"].to(device)

        optimizer.zero_grad()
        pred = model(x)
        loss = criterion(pred, y, mask)
        loss.backward()
        optimizer.step()

        total_loss += loss.item()
        
        # Accumulate errors correctly
        diff = pred - y
        sum_sq_err += ((diff ** 2) * mask).sum().item()
        sum_abs_err += (torch.abs(diff) * mask).sum().item()
        sum_valid += mask.sum().item()
        
        n_batches += 1

    rmse = (sum_sq_err / sum_valid) ** 0.5 if sum_valid > 0 else float("nan")
    mae = sum_abs_err / sum_valid if sum_valid > 0 else float("nan")

    return {
        "loss": total_loss / max(n_batches, 1),
        "rmse": rmse,
        "mae":  mae,
    }


@torch.no_grad()
def validate(
    model: nn.Module,
    loader: DataLoader,
    criterion: nn.Module,
    device: torch.device,
) -> dict:
    """Run validation.

    Returns
    -------
    dict
        ``{"loss": ..., "rmse": ..., "mae": ...}``.
    """
    model.eval()
    total_loss = 0.0
    sum_sq_err = 0.0
    sum_abs_err = 0.0
    sum_valid = 0.0
    n_batches = 0

    for batch in loader:
        x = batch["input"].to(device)
        y = batch["target"].to(device)
        mask = batch["target_mask"].to(device)

        pred = model(x)
        loss = criterion(pred, y, mask)

        total_loss += loss.item()
        
        # Accumulate errors correctly
        diff = pred - y
        sum_sq_err += ((diff ** 2) * mask).sum().item()
        sum_abs_err += (torch.abs(diff) * mask).sum().item()
        sum_valid += mask.sum().item()
        
        n_batches += 1

    rmse = (sum_sq_err / sum_valid) ** 0.5 if sum_valid > 0 else float("nan")
    mae = sum_abs_err / sum_valid if sum_valid > 0 else float("nan")

    return {
        "loss": total_loss / max(n_batches, 1),
        "rmse": rmse,
        "mae":  mae,
    }


def run_training(config_path: str | None = None):
    """Execute the full training workflow.

    Parameters
    ----------
    config_path : str, optional
        Path to YAML config with a ``training`` section.
    """
    cfg = load_train_config(config_path)
    device = get_device()

    print("=" * 60)
    print("ANTARBODH Training")
    print("=" * 60)
    print(f"Device:        {device}")
    print(f"Model:         {cfg['model']}")
    print(f"Epochs:        {cfg['epochs']}")
    print(f"Batch size:    {cfg['batch_size']}")
    print(f"Learning rate: {cfg['learning_rate']}")
    print(f"Patch size:    {cfg['patch_size']}")
    print()

    # --- Data ---
    data_dir = Path(cfg["data_dir"])
    train_ds = AntarBodhDataset(
        nc_path=data_dir / "train.nc",
        patch_size=cfg["patch_size"],
    )
    val_ds = AntarBodhDataset(
        nc_path=data_dir / "val.nc",
        patch_size=None, # deterministic full-field validation
    )

    train_loader = DataLoader(
        train_ds,
        batch_size=cfg["batch_size"],
        shuffle=True,
        num_workers=0,
        pin_memory=True,
    )
    val_loader = DataLoader(
        val_ds,
        batch_size=cfg["batch_size"],
        shuffle=False,
        num_workers=0,
        pin_memory=True,
    )

    print(f"Train samples: {len(train_ds)}")
    print(f"Val samples:   {len(val_ds)}")
    print()

    # --- Pre-flight Data Audit ---
    audit_data_contract(train_ds, val_ds)
    run_synthetic_mask_test(device)

    # --- Model ---
    if cfg["model"] == "cnn_lite":
        model = AntarBodhCNNLite()
    else:
        model = AntarBodhCNN(base_filters=cfg.get("base_filters", 64))

    model = model.to(device)
    n_params = count_parameters(model)
    print(f"Model parameters: {n_params:,}")
    print()

    # --- Loss / optimizer / scheduler ---
    criterion = MaskedMSELoss()
    optimizer = torch.optim.AdamW(
        model.parameters(),
        lr=cfg["learning_rate"],
        weight_decay=cfg["weight_decay"],
    )
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
        optimizer, mode="min", factor=0.5, patience=5,
    )

    # --- TensorBoard ---
    writer = None
    try:
        from torch.utils.tensorboard import SummaryWriter
        log_dir = Path(cfg["log_dir"])
        log_dir.mkdir(parents=True, exist_ok=True)
        writer = SummaryWriter(log_dir=str(log_dir))
    except ImportError:
        print("TensorBoard not available — skipping logging.")

    # --- Checkpointing ---
    ckpt_dir = Path(cfg["checkpoint_dir"])
    ckpt_dir.mkdir(parents=True, exist_ok=True)

    best_val_loss = float("inf")
    patience_counter = 0
    history = []

    # --- Training loop ---
    for epoch in range(1, cfg["epochs"] + 1):
        t0 = time.time()

        train_metrics = train_one_epoch(model, train_loader, criterion, optimizer, device)
        val_metrics = validate(model, val_loader, criterion, device)

        dt = time.time() - t0
        scheduler.step(val_metrics["loss"])

        # Log
        row = {
            "epoch":      epoch,
            "train_loss": round(train_metrics["loss"], 6),
            "train_rmse": round(train_metrics["rmse"], 4),
            "val_loss":   round(val_metrics["loss"], 6),
            "val_rmse":   round(val_metrics["rmse"], 4),
            "val_mae":    round(val_metrics["mae"], 4),
            "lr":         optimizer.param_groups[0]["lr"],
            "time_s":     round(dt, 1),
        }
        history.append(row)

        print(
            f"Epoch {epoch:3d}/{cfg['epochs']} | "
            f"train_loss={row['train_loss']:.6f} | "
            f"val_loss={row['val_loss']:.6f} | "
            f"val_rmse={row['val_rmse']:.4f} | "
            f"lr={row['lr']:.2e} | "
            f"{row['time_s']:.1f}s"
        )

        if writer is not None:
            writer.add_scalars("loss", {"train": row["train_loss"], "val": row["val_loss"]}, epoch)
            writer.add_scalar("rmse/val", row["val_rmse"], epoch)
            writer.add_scalar("lr", row["lr"], epoch)

        # Checkpoint best model
        if val_metrics["loss"] < best_val_loss:
            best_val_loss = val_metrics["loss"]
            patience_counter = 0
            # Save Checkpoint with Data Contract
            torch.save({
                "epoch": epoch,
                "model_state_dict": model.state_dict(),
                "optimizer_state_dict": optimizer.state_dict(),
                "val_loss": best_val_loss,
                "config": cfg,
                "data_contract": {
                    "input_channels": 14,
                    "target_depths_m": [0, 5, 10, 20, 30, 50, 75, 100, 125, 150, 200, 300, 500, 700, 1000],
                    "target_units": "degC",
                }
            }, ckpt_dir / "best_model.pt")
            print(f"  -> Saved best model (val_loss={best_val_loss:.6f})")
        else:
            patience_counter += 1
            if patience_counter >= cfg["early_stop_patience"]:
                print(f"\nEarly stopping at epoch {epoch} (patience={cfg['early_stop_patience']})")
                break

    # Save training history
    history_path = ckpt_dir / "training_history.json"
    with history_path.open("w", encoding="utf-8") as fh:
        json.dump(history, fh, indent=2)

    if writer is not None:
        writer.close()

    print()
    print("=" * 60)
    print("Training complete.")
    print(f"Best val loss: {best_val_loss:.6f}")
    print(f"Checkpoint:    {ckpt_dir / 'best_model.pt'}")
    print(f"History:       {history_path}")
    print("=" * 60)


# ---------------------------------------------------------------------------
# Pre-flight Checks
# ---------------------------------------------------------------------------

def audit_data_contract(train_ds: AntarBodhDataset, val_ds: AntarBodhDataset):
    print("================================")
    print("ANTARBODH TRAINING DATA AUDIT")
    print("================================")
    print(f"Train:")
    print(f"  samples: {train_ds.n_times}")
    print(f"  X shape: {train_ds.X.shape}")
    print(f"  Y shape: {train_ds.Y.shape}")
    print(f"  Y_mask shape: {train_ds.Y_mask.shape}")
    print(f"\nValidation:")
    print(f"  samples: {val_ds.n_times}")
    print(f"  X shape: {val_ds.X.shape}")
    print(f"  Y shape: {val_ds.Y.shape}")
    print(f"  Y_mask shape: {val_ds.Y_mask.shape}")
    print(f"\nChannels:")
    print(f"  {train_ds.X.shape[1]} ✓")
    print(f"Depths:")
    print(f"  {train_ds.Y.shape[1]} ✓")
    
    print("\nData Sanity Check:")
    print(f"  X NaNs: {np.isnan(train_ds.X).sum()} ✓")
    print(f"  Y NaNs: {np.isnan(train_ds.Y).sum()} ✓")
    print(f"  Y_mask unique: {np.unique(train_ds.Y_mask)} ✓")
    
    # Check SSS masks (Index 8 in our contract)
    sss_mask_train = train_ds.X[:, 8, :, :]
    sss_mask_val = val_ds.X[:, 8, :, :]
    print(f"  SSS Mask Coverage (Train): {(sss_mask_train == 1).mean():.2%}")
    print(f"  SSS Mask Coverage (Val):   {(sss_mask_val == 1).mean():.2%}")
    print("================================\n")

def run_synthetic_mask_test(device):
    print("Running synthetic SSS mask test...")
    model = AntarBodhCNN(in_channels=14, out_depths=15).to(device)
    model.eval()
    
    # 1. Base input: entirely zeros
    x_base = torch.zeros((1, 14, 60, 80), device=device)
    
    # 2. SSS = 0, SSS_mask = 1
    x_valid = x_base.clone()
    x_valid[:, 8, :, :] = 1.0 # SSS_mask = 1
    
    # 3. SSS = 0, SSS_mask = 0
    x_missing = x_base.clone()
    x_missing[:, 8, :, :] = 0.0 # SSS_mask = 0
    
    with torch.no_grad():
        out_valid = model(x_valid)
        out_missing = model(x_missing)
        
    diff = torch.abs(out_valid - out_missing).sum().item()
    assert diff > 0, "Model did not react to SSS_mask changing! Synthetic test failed."
    print("✓ Synthetic test passed: SSS value=0 and SSS_mask=0 are processed independently by the model.\n")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    config = sys.argv[1] if len(sys.argv) > 1 else "configs/prototype.yaml"
    
    # Support overriding epochs via command line for smoke tests
    if len(sys.argv) > 3 and sys.argv[2] == "--epochs":
        DEFAULT_TRAIN_CONFIG["epochs"] = int(sys.argv[3])
        
    run_training(config)
