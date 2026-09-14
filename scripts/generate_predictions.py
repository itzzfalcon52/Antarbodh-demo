"""Generate precomputed 2025 predictions for ANTARBODH CNN v1.

Loads the frozen model checkpoint and processed 2025 test dataset, runs single-pass
inference, and serializes the 3D temperature reconstruction field to:
outputs/inference/2025/antarbodh_2025_predictions.nc
"""

import sys
import json
import torch
import numpy as np
import xarray as xr
from pathlib import Path

# Ensure repo root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.training.model import AntarBodhCNN
from src.training.dataset import AntarBodhDataset

def generate_predictions():
    print("============================================================")
    print("GENERATING 2025 INFERENCE PREDICTIONS")
    print("============================================================")
    
    ckpt_path = PROJECT_ROOT / "outputs/checkpoints/antarbodh_cnn_v1_sih2026.pt"
    test_nc_path = PROJECT_ROOT / "data/processed/test.nc"
    out_dir = PROJECT_ROOT / "outputs/inference/2025"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_nc_path = out_dir / "antarbodh_2025_predictions.nc"
    out_meta_path = out_dir / "metadata.json"
    
    if not ckpt_path.exists():
        raise FileNotFoundError(f"Checkpoint not found: {ckpt_path}")
    if not test_nc_path.exists():
        raise FileNotFoundError(f"Test dataset not found: {test_nc_path}")
        
    device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")
    print(f"Using inference device: {device}")
    
    # Load model state
    ckpt = torch.load(ckpt_path, map_location=device, weights_only=True)
    model = AntarBodhCNN(in_channels=14, out_depths=15, base_filters=64).to(device)
    model.load_state_dict(ckpt["model_state_dict"])
    model.eval()
    print("✓ Model loaded successfully from checkpoint (eval mode).")
    
    # Load test dataset
    test_ds = AntarBodhDataset(test_nc_path)
    total_days = len(test_ds)
    print(f"Loaded test dataset: {total_days} daily timesteps.")
    
    # Run batch inference
    batch_size = 16
    preds_list = []
    with torch.no_grad():
        for i in range(0, total_days, batch_size):
            batch_x = [test_ds[j]["input"] for j in range(i, min(i + batch_size, total_days))]
            x_tensor = torch.stack(batch_x).to(device)
            out = model(x_tensor).cpu().numpy()
            preds_list.append(out)
            
    all_preds = np.concatenate(preds_list, axis=0) # (365, 15, 60, 80)
    print(f"Inference complete. Output array shape: {all_preds.shape}")
    
    # Open test.nc to retrieve exact coordinates and mask
    with xr.open_dataset(test_nc_path) as ds_test:
        time_coords = ds_test.time.values
        depth_coords = ds_test.depth.values
        lat_coords = ds_test.latitude.values
        lon_coords = ds_test.longitude.values
        y_mask = ds_test["Y_mask"].values # (365, 15, 60, 80)
        
    # Apply land/ocean mask: where Y_mask == 0, set temperature to NaN for clean spatial raster
    # Note: the raw model predicts over land if unmasked; masking guarantees ocean-only domain
    all_preds_masked = np.where(y_mask > 0, all_preds, np.nan).astype(np.float32)
    
    ds_pred = xr.Dataset(
        data_vars={
            "temperature": (
                ["time", "depth", "latitude", "longitude"],
                all_preds_masked,
                {
                    "long_name": "Reconstructed Subsurface Ocean Temperature",
                    "standard_name": "sea_water_temperature",
                    "units": "degrees_C",
                    "valid_min": float(np.nanmin(all_preds_masked)),
                    "valid_max": float(np.nanmax(all_preds_masked)),
                    "model_id": "antarbodh_cnn_v1_sih2026"
                }
            ),
            "valid_mask": (
                ["time", "depth", "latitude", "longitude"],
                y_mask.astype(np.int8),
                {"long_name": "Ocean Validity Mask (1=ocean, 0=land)"}
            )
        },
        coords={
            "time": time_coords,
            "depth": depth_coords,
            "latitude": lat_coords,
            "longitude": lon_coords
        },
        attrs={
            "title": "ANTARBODH 2025 Subsurface Ocean Temperature Predictions",
            "model_id": "antarbodh_cnn_v1_sih2026",
            "checkpoint": str(ckpt_path.relative_to(PROJECT_ROOT)),
            "spatial_resolution": "0.25 degree",
            "temporal_resolution": "daily",
            "vertical_levels": 15,
            "domain": "Bay of Bengal (5-20N, 80-100E)"
        }
    )
    
    encoding = {
        "temperature": {"zlib": True, "complevel": 4},
        "valid_mask": {"zlib": True, "complevel": 4}
    }
    
    ds_pred.to_netcdf(out_nc_path, encoding=encoding)
    file_size_mb = out_nc_path.stat().st_size / (1024 * 1024)
    print(f"✓ Saved prediction NetCDF to: {out_nc_path} ({file_size_mb:.2f} MB)")
    
    metadata = {
        "model_id": "antarbodh_cnn_v1_sih2026",
        "checkpoint": str(ckpt_path.relative_to(PROJECT_ROOT)),
        "generation_timestamp": "2026-09-14T18:00:00Z",
        "time_start": str(time_coords[0])[:10],
        "time_end": str(time_coords[-1])[:10],
        "num_days": len(time_coords),
        "depths": [float(d) for d in depth_coords],
        "num_depths": len(depth_coords),
        "latitude_bounds": [float(lat_coords[0]), float(lat_coords[-1])],
        "num_lat": len(lat_coords),
        "longitude_bounds": [float(lon_coords[0]), float(lon_coords[-1])],
        "num_lon": len(lon_coords),
        "resolution_deg": 0.25,
        "temperature_stats": {
            "min": float(np.nanmin(all_preds_masked)),
            "max": float(np.nanmax(all_preds_masked)),
            "mean": float(np.nanmean(all_preds_masked))
        },
        "units": "degrees_C",
        "file": str(out_nc_path.relative_to(PROJECT_ROOT))
    }
    
    with open(out_meta_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
    print(f"✓ Saved prediction metadata to: {out_meta_path}")
    print("============================================================")

if __name__ == "__main__":
    generate_predictions()
