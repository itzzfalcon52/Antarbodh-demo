"""ANTARBODH Independent ARGO Validation.

Matches pointwise ARGO observations against ANTARBODH CNN predictions.
Implements rigorous QC, spatial interpolation, and depth interpolation.
"""

import sys
import json
import yaml
import torch
import numpy as np
import pandas as pd
import xarray as xr
from pathlib import Path
from datetime import datetime

def load_config(config_path="configs/prototype.yaml"):
    with open(config_path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)

def run_argo_validation(config_path="configs/prototype.yaml"):
    cfg = load_config(config_path)
    argo_cfg = cfg["argo"]
    
    print("============================================================")
    print("PHASE 4 & 5: ARGO QC & PREPROCESSING")
    print("============================================================")
    
    raw_path = Path(argo_cfg["output_directory"]) / argo_cfg["filename"]
    if not raw_path.exists():
        print(f"Error: {raw_path} does not exist.")
        return
        
    df = pd.read_csv(raw_path, skiprows=[1]) # Skip ERDDAP units row
    print(f"Raw observations loaded: {len(df):,}")
    print(f"Raw profiles: {df['cycle_number'].nunique():,} (across {df['platform_number'].nunique()} floats)")
    
    # 1. Parse dates and filter to 2025
    df['time'] = pd.to_datetime(df['time']).dt.tz_localize(None)
    df = df[(df['time'] >= '2025-01-01') & (df['time'] <= '2025-12-31')]
    
    # 2. Strict QC Hierarchy
    # D-mode: temp_adjusted_qc == 1
    # R-mode/A-mode: temp_qc == 1
    
    # Convert QC flags to numeric safely (they might be strings like '1')
    df['temp_qc'] = pd.to_numeric(df['temp_qc'], errors='coerce')
    df['temp_adjusted_qc'] = pd.to_numeric(df['temp_adjusted_qc'], errors='coerce')
    
    df['valid_temp'] = np.nan
    df['obs_type'] = 'INVALID'
    
    # Delayed mode (D) or Adjusted (A) with valid adjusted data
    d_mask = df['data_mode'].isin(['D', 'A']) & (df['temp_adjusted_qc'] == 1) & df['temp_adjusted'].notna()
    df.loc[d_mask, 'valid_temp'] = df.loc[d_mask, 'temp_adjusted']
    df.loc[d_mask, 'obs_type'] = 'D-MODE'
    
    # Real-time (R) or A/D where adjusted failed but raw is good
    r_mask = (~d_mask) & (df['temp_qc'] == 1) & df['temp'].notna()
    df.loc[r_mask, 'valid_temp'] = df.loc[r_mask, 'temp']
    df.loc[r_mask, 'obs_type'] = 'R-MODE'
    
    # Drop invalid
    df = df.dropna(subset=['valid_temp', 'pres', 'latitude', 'longitude'])
    
    # Filter impossible pressure
    df = df[(df['pres'] >= 0) & (df['pres'] <= 2000)]
    
    num_obs_post_qc = len(df)
    d_mode_count = (df['obs_type'] == 'D-MODE').sum()
    r_mode_count = (df['obs_type'] == 'R-MODE').sum()
    unique_profiles = df.groupby(['platform_number', 'cycle_number']).ngroups
    
    print(f"Observations post-QC: {num_obs_post_qc:,}")
    print(f"  D-MODE (Adjusted):  {d_mode_count:,}")
    print(f"  R-MODE (Realtime):  {r_mode_count:,}")
    print(f"Unique profiles:      {unique_profiles:,}")
    
    if num_obs_post_qc == 0:
        print("No valid ARGO observations remaining after QC.")
        return

    print("\n============================================================")
    print("PHASE 6: MATCHING ARGO TO ANTARBODH")
    print("============================================================")
    
    # Load ANTARBODH CNN Model and Test Data
    from src.training.model import AntarBodhCNN
    from src.training.dataset import AntarBodhDataset
    
    device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")
    print(f"Generating predictions on {device}...")
    
    ckpt = torch.load("outputs/checkpoints/antarbodh_cnn_v1_sih2026.pt", map_location=device, weights_only=True)
    model = AntarBodhCNN(in_channels=14, out_depths=15).to(device)
    model.load_state_dict(ckpt["model_state_dict"])
    model.eval()
    
    test_ds = AntarBodhDataset("data/processed/test.nc")
    
    # Generate full 2025 predictions
    preds_list = []
    with torch.no_grad():
        for i in range(0, len(test_ds), 16): # Batch size 16
            batch_x = []
            for j in range(i, min(i+16, len(test_ds))):
                batch_x.append(test_ds[j]["input"])
            x_tensor = torch.stack(batch_x).to(device)
            preds = model(x_tensor).cpu().numpy()
            preds_list.append(preds)
            
    all_preds = np.concatenate(preds_list, axis=0) # (365, 15, 60, 80)
    
    # Convert predictions to xarray for easy spatial interpolation
    with xr.open_dataset("data/processed/test.nc") as ds_test:
        pred_da = xr.DataArray(
            all_preds,
            coords=[ds_test.time, ds_test.depth, ds_test.latitude, ds_test.longitude],
            dims=["time", "depth", "latitude", "longitude"]
        )
    
    canonical_depths = pred_da.depth.values
    
    print("Matching ARGO profiles to predictions via spatial & depth interpolation...")
    
    matched_obs = []
    matched_preds = []
    matched_depths = []
    
    # Group ARGO by date to minimize time indexing overhead
    df['date'] = df['time'].dt.floor('D')
    grouped = df.groupby('date')
    
    for date, group in grouped:
        if date not in pred_da.time.values:
            continue
            
        daily_pred = pred_da.sel(time=date) # (15, 60, 80)
        
        # We group by profile to avoid interpolating horizontally for every single depth measurement
        for (plat, cyc), profile in group.groupby(['platform_number', 'cycle_number']):
            plat_lat = profile['latitude'].iloc[0]
            plat_lon = profile['longitude'].iloc[0]
            
            # 1. Spatially interpolate ANTARBODH 15-depth profile to the float location
            try:
                profile_pred = daily_pred.interp(
                    latitude=plat_lat, 
                    longitude=plat_lon, 
                    method="linear"
                )
                
                # Check if it interpolated to NaNs (land or outside domain)
                if np.isnan(profile_pred.values).all():
                    continue
                    
                # 2. Vertically interpolate ANTARBODH to the exact ARGO measurement depths
                argo_depths = profile['pres'].values
                argo_temps = profile['valid_temp'].values
                
                # We use numpy linear interpolation for depth
                pred_at_argo_depths = np.interp(
                    argo_depths, 
                    canonical_depths, 
                    profile_pred.values, 
                    left=np.nan, 
                    right=np.nan
                )
                
                # Mask out NaNs where ARGO depth is outside the 0-1000m range of our model
                valid_mask = ~np.isnan(pred_at_argo_depths)
                
                matched_obs.extend(argo_temps[valid_mask])
                matched_preds.extend(pred_at_argo_depths[valid_mask])
                matched_depths.extend(argo_depths[valid_mask])
                
            except Exception as e:
                continue

    matched_obs = np.array(matched_obs)
    matched_preds = np.array(matched_preds)
    matched_depths = np.array(matched_depths)
    
    print(f"Successfully matched {len(matched_obs):,} observations inside valid ocean domain (0-1000m).")
    
    print("\n============================================================")
    print("PHASE 7 & 8: INDEPENDENT ARGO METRICS")
    print("============================================================")
    
    def calc_metrics(obs, pred):
        if len(obs) == 0:
            return np.nan, np.nan, np.nan, np.nan
        rmse = np.sqrt(np.mean((obs - pred)**2))
        mae = np.mean(np.abs(obs - pred))
        bias = np.mean(pred - obs)
        # Pearson correlation
        if len(obs) > 1 and np.std(obs) > 0 and np.std(pred) > 0:
            corr = np.corrcoef(obs, pred)[0, 1]
        else:
            corr = np.nan
        return rmse, mae, bias, corr
        
    overall_rmse, overall_mae, overall_bias, overall_corr = calc_metrics(matched_obs, matched_preds)
    
    print(f"OVERALL ARGO VALIDATION METRICS:")
    print(f"  RMSE: {overall_rmse:.4f} °C")
    print(f"  MAE:  {overall_mae:.4f} °C")
    print(f"  Bias: {overall_bias:.4f} °C")
    print(f"  Corr: {overall_corr:.4f}")
    
    print("\nMetrics mapped to nearest Canonical Depths (+/- 10% bounds):")
    
    depth_metrics = []
    print(f"{'Depth':>6} | {'N_obs':>6} | {'RMSE':>6} | {'MAE':>6} | {'Bias':>7} | {'Corr':>6}")
    print("-" * 55)
    
    for d in canonical_depths:
        # Define a bin around the canonical depth
        if d == 0:
            bounds = (0, 2.5)
        elif d < 50:
            bounds = (d - 2.5, d + 2.5)
        elif d < 200:
            bounds = (d - 12.5, d + 12.5)
        else:
            bounds = (d - 50, d + 50)
            
        mask = (matched_depths >= bounds[0]) & (matched_depths <= bounds[1])
        n_obs = mask.sum()
        
        if n_obs > 10:
            r, m, b, c = calc_metrics(matched_obs[mask], matched_preds[mask])
        else:
            r, m, b, c = np.nan, np.nan, np.nan, np.nan
            
        depth_metrics.append({
            "depth": float(d),
            "n_obs": int(n_obs),
            "rmse": float(r) if not np.isnan(r) else None,
            "mae": float(m) if not np.isnan(m) else None,
            "bias": float(b) if not np.isnan(b) else None,
            "corr": float(c) if not np.isnan(c) else None
        })
        
        if n_obs > 10:
            print(f"{d:>5.0f}m | {n_obs:>6} | {r:>6.4f} | {m:>6.4f} | {b:>7.4f} | {c:>6.4f}")
        else:
            print(f"{d:>5.0f}m | {n_obs:>6} |   --   |   --   |    --   |   --  ")
            
    # Save Report
    report_dict = {
        "model_id": "antarbodh_cnn_v1_sih2026",
        "checkpoint": "outputs/checkpoints/antarbodh_cnn_v1_sih2026.pt",
        "argo_source": argo_cfg["source"],
        "argo_period": f"{argo_cfg['start_date']} to {argo_cfg['end_date']}",
        "observations": {
            "raw": int(len(df) + len(matched_obs)), # Approx original total
            "post_qc": int(num_obs_post_qc),
            "d_mode": int(d_mode_count),
            "r_mode": int(r_mode_count),
            "matched": int(len(matched_obs)),
            "unique_profiles": int(unique_profiles)
        },
        "overall_metrics": {
            "rmse": float(overall_rmse),
            "mae": float(overall_mae),
            "bias": float(overall_bias),
            "corr": float(overall_corr)
        },
        "per_depth": depth_metrics
    }
    
    out_dir = Path("outputs/evaluation")
    out_dir.mkdir(parents=True, exist_ok=True)
    
    with open(out_dir / "argo_validation_report.json", "w") as f:
        json.dump(report_dict, f, indent=2)
        
    print("\nValidation report saved to: outputs/evaluation/argo_validation_report.json")
    
if __name__ == "__main__":
    run_argo_validation()
