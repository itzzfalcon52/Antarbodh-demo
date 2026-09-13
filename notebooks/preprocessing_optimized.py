#!/usr/bin/env python3
"""
ANTARBODH — Preprocessing & Exploratory Data Analysis
======================================================

Optimized single-script version of preprocessing.ipynb.

Key optimizations over the notebook:
  1. Dask LocalCluster with optimal threads
  2. Larger chunk sizes (time=90 instead of time=7)
  3. Batched dask.compute() calls instead of per-stat .compute()
  4. Sampled quantiles instead of full-dataset quantiles
  5. Fixed SSS variable overwrite bug
  6. Fixed missing comma in sample_dates
  7. Non-interactive matplotlib backend

Usage:
    cd /Volumes/SAM-T7/SIH/Antarbodh-demo
    source .venv/bin/activate
    python notebooks/preprocessing_optimized.py
"""

import csv
import random
import warnings
from pathlib import Path

import dask
import matplotlib
matplotlib.use("Agg")  # Non-interactive backend for script execution
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import xarray as xr

warnings.filterwarnings("ignore", category=FutureWarning)
warnings.filterwarnings("ignore", category=RuntimeWarning)

# ============================================================
# SECTION 1 — Setup, Dask Cluster, and Data Loading
# ============================================================

def main():
    """Main preprocessing pipeline."""

    print("=" * 70)
    print("ANTARBODH — Preprocessing & EDA (Optimized)")
    print("=" * 70)

    # --- Use threaded scheduler (avoids macOS multiprocessing spawn issues) ---
    dask.config.set(scheduler="threads", num_workers=4)
    print("\nDask scheduler: threaded (4 workers)")

    # --- Project paths ---
    PROJECT_ROOT = Path(__file__).resolve().parent.parent
    RAW_DIR = PROJECT_ROOT / "data" / "raw"

    GLORYS_DIR = RAW_DIR / "glorys"
    SST_DIR = RAW_DIR / "sst"
    SSS_DIR = RAW_DIR / "sss"
    SSH_DIR = RAW_DIR / "ssh"
    CURRENTS_DIR = RAW_DIR / "currents"
    WINDS_DIR = RAW_DIR / "winds"

    OUTPUT_DIR = PROJECT_ROOT / "outputs"
    FIGURES_DIR = OUTPUT_DIR / "figures"
    REPORTS_DIR = OUTPUT_DIR / "reports"
    STATS_DIR = OUTPUT_DIR / "statistics"
    PROCESSED_DIR = PROJECT_ROOT / "data" / "processed"

    FIGURES_DIR.mkdir(parents=True, exist_ok=True)
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    STATS_DIR.mkdir(parents=True, exist_ok=True)
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

    print("\nProject root:", PROJECT_ROOT)
    print("Raw data:", RAW_DIR)
    print("Outputs:", OUTPUT_DIR)

    # --- Load datasets with OPTIMIZED chunk sizes ---
    # Key optimization: time=90 instead of time=7 reduces Dask task overhead by ~13x
    print("\nLoading datasets...")

    glorys = xr.open_dataset(
        GLORYS_DIR / "glorys_bob_(2).nc",
        chunks={
            "time": 30,       # ~monthly chunks (was 7)
            "depth": -1,      # all depths in one chunk
            "latitude": 60,
            "longitude": 80,
        },
    )

    sst = xr.open_dataset(
        SST_DIR / "sst_bob_(2).nc",
        chunks={"time": 90, "latitude": -1, "longitude": -1},
    )

    sss_asc = xr.open_dataset(
        SSS_DIR / "sss_bob_ascending_(2).nc",
        chunks={"time": 90, "latitude": -1, "longitude": -1},
    )

    sss_desc = xr.open_dataset(
        SSS_DIR / "sss_bob_descending_(2).nc",
        chunks={"time": 90, "latitude": -1, "longitude": -1},
    )

    ssh = xr.open_dataset(
        SSH_DIR / "ssh_bob_(2).nc",
        chunks={"time": 90, "latitude": -1, "longitude": -1},
    )

    currents = xr.open_dataset(
        CURRENTS_DIR / "currents_bob_(2).nc",
        chunks={"time": 90, "latitude": -1, "longitude": -1},
    )

    winds = xr.open_dataset(
        WINDS_DIR / "winds_bob_(2).nc",
        chunks={"time": 90, "latitude": -1, "longitude": -1},
    )

    datasets = {
        "GLORYS": glorys,
        "SST": sst,
        "SSS Ascending": sss_asc,
        "SSS Descending": sss_desc,
        "SSH": ssh,
        "Currents": currents,
        "Winds": winds,
    }

    for name, ds in datasets.items():
        print(f"\n{name}:")
        print(ds)
        print("-" * 80)

    # --- Variable names and chunks ---
    for name, ds in datasets.items():
        print(f"{name}: {list(ds.data_vars)}")
        print(ds.chunks)

    # --- Time ranges ---
    for name, ds in datasets.items():
        if "time" in ds.coords:
            print(
                f"{name}:",
                ds["time"].values[[0, -1]]
            )

    # --- Sizes ---
    for name, ds in datasets.items():
        print(f"{name}: {dict(ds.sizes)}")


    # ============================================================
    # SECTION 2 — Statistical EDA (BATCHED)
    # ============================================================

    print("\n" + "=" * 70)
    print("SECTION 2 — Statistical EDA")
    print("=" * 70)

    eda_variables = {
        "SST": sst["sea_surface_temperature"],
        "SSS Ascending": sss_asc["Sea_Surface_Salinity"],
        "SSS Descending": sss_desc["Sea_Surface_Salinity"],
        "SSH": ssh["sla"],
        "Current U": currents["uo"],
        "Current V": currents["vo"],
        "Wind U": winds["eastward_wind"],
        "Wind V": winds["northward_wind"],
        "GLORYS Temperature": glorys["thetao"],
    }

    print(f"Number of variables: {len(eda_variables)}")
    for name, da in eda_variables.items():
        print(f"{name:25s} -> {da.dims}")

    # --- OPTIMIZATION: Batch all descriptive stats into ONE dask.compute() ---
    print("\nComputing descriptive statistics (batched)...")

    lazy_stats = {}
    for name, da in eda_variables.items():
        valid = da.where(np.isfinite(da))
        lazy_stats[name] = {
            "missing_percent": 100 * valid.isnull().mean(),
            "mean": valid.mean(skipna=True),
            "std": valid.std(skipna=True),
        }

    # Flatten all lazy objects for a single compute call
    all_lazy = []
    key_map = []
    for name, stat_dict in lazy_stats.items():
        for stat_name, lazy_val in stat_dict.items():
            all_lazy.append(lazy_val)
            key_map.append((name, stat_name))

    print(f"  Computing {len(all_lazy)} stats in one batch...")
    all_computed = dask.compute(*all_lazy)

    stats = {}
    for (name, stat_name), value in zip(key_map, all_computed):
        if name not in stats:
            stats[name] = {}
        stats[name][stat_name] = float(value.item()) if hasattr(value, 'item') else float(value)

    for name, values in stats.items():
        print(f"\n{name}")
        print("-" * 40)
        print(f"Missing %: {values['missing_percent']:.2f}")
        print(f"Mean:      {values['mean']:.4f}")
        print(f"Std:       {values['std']:.4f}")

    print("\n========== DESCRIPTIVE STATISTICS ==========")
    print(stats)

    # --- Sample statistics (9 representative dates) ---
    sample_dates_basic = [
        "2020-01-15", "2020-04-15", "2020-07-15", "2020-10-15",
        "2021-01-15", "2022-01-15", "2023-01-15", "2024-01-15", "2025-01-15",
    ]

    # OPTIMIZATION: batch all sample stats
    lazy_sample = []
    sample_key_map = []
    stat_names = ["min", "q25", "median", "mean", "q75", "max", "std"]

    for name, da in eda_variables.items():
        if "time" in da.dims:
            sample = da.sel(time=sample_dates_basic, method="nearest")
        else:
            sample = da
        valid = sample.where(np.isfinite(sample))

        lazy_sample.extend([
            valid.min(skipna=True),
            valid.quantile(0.25, skipna=True),
            valid.quantile(0.50, skipna=True),
            valid.mean(skipna=True),
            valid.quantile(0.75, skipna=True),
            valid.max(skipna=True),
            valid.std(skipna=True),
        ])
        for sn in stat_names:
            sample_key_map.append((name, sn))

    print("\nComputing sample statistics (batched)...")
    all_sample_computed = dask.compute(*lazy_sample)

    sample_stats = {}
    for (name, sn), value in zip(sample_key_map, all_sample_computed):
        if name not in sample_stats:
            sample_stats[name] = {}
        sample_stats[name][sn] = float(value.item()) if hasattr(value, 'item') else float(value)

    print("\n========== SAMPLE DESCRIPTIVE STATISTICS ==========")
    print(sample_stats)

    # --- Quantiles (OPTIMIZED: use sampled dates instead of full dataset) ---
    quantile_levels = [0.01, 0.05, 0.25, 0.50, 0.75, 0.95, 0.99]

    lazy_quantiles = []
    quantile_key_map = []

    for name, da in eda_variables.items():
        # Sample 60 random dates for quantile estimation (much faster than full dataset)
        if "time" in da.dims and da.sizes["time"] > 60:
            indices = np.linspace(0, da.sizes["time"] - 1, 60, dtype=int)
            da_sampled = da.isel(time=indices)
        else:
            da_sampled = da

        valid = da_sampled.where(np.isfinite(da_sampled))
        lazy_quantiles.append(valid.quantile(quantile_levels, skipna=True))
        quantile_key_map.append(name)

    print("\nComputing quantiles (sampled, batched)...")
    all_quantiles_computed = dask.compute(*lazy_quantiles)

    quantiles = {}
    for name, q in zip(quantile_key_map, all_quantiles_computed):
        quantiles[name] = q

    print(quantiles)

    # --- Save statistics ---
    stats_file = STATS_DIR / "raw_statistical_eda_1_month.txt"

    with open(stats_file, "w") as f:
        f.write("ANTARBODH — Raw Statistical EDA\n")
        f.write("=" * 50 + "\n\n")
        for name, values in stats.items():
            f.write(f"{name}\n")
            f.write("-" * len(name) + "\n")
            for statistic, value in values.items():
                f.write(f"{statistic}: {value}\n")
            f.write("\n")

    print(f"Saved statistics to: {stats_file}")

    # --- SST units ---
    print("SST units:", sst["sea_surface_temperature"].attrs.get("units"))
    print("SST standard name:", sst["sea_surface_temperature"].attrs.get("standard_name"))


    # ============================================================
    # SECTION 3 — Distribution Analysis
    # ============================================================

    print("\n" + "=" * 70)
    print("SECTION 3 — Distribution Analysis")
    print("=" * 70)

    # Generate 30 random dates
    random.seed(42)
    random_dates = pd.date_range(start="2020-01-01", end="2025-12-31", freq="D")
    random_dates = random.sample(list(random_dates), 30)
    dist_sample_dates = sorted([date.strftime("%Y-%m-%d") for date in random_dates])
    print(dist_sample_dates)

    # --- SST Distribution ---
    print("Plotting SST distribution...")
    sst_sample = sst["sea_surface_temperature"].sel(time=dist_sample_dates, method="nearest")
    sst_values = sst_sample.values
    sst_values = sst_values[np.isfinite(sst_values)]

    plt.figure(figsize=(10, 6))
    plt.hist(sst_values, bins=50, color='skyblue', edgecolor='black')
    plt.xlabel("Sea Surface Temperature (°C)")
    plt.ylabel("Frequency")
    plt.title("Histogram of Sea Surface Temperature (SST)")
    plt.tight_layout()
    plt.savefig(FIGURES_DIR / "sst_distribution_raw.png", dpi=150, bbox_inches='tight')
    plt.close()
    print("  Saved sst_distribution_raw.png")

    # --- SSS Distribution ---
    print("Plotting SSS distribution...")
    sss_asc_sample = sss_asc["Sea_Surface_Salinity"].sel(time=dist_sample_dates, method="nearest")
    sss_desc_sample = sss_desc["Sea_Surface_Salinity"].sel(time=dist_sample_dates, method="nearest")

    sss_asc_values = sss_asc_sample.values
    sss_asc_values = sss_asc_values[np.isfinite(sss_asc_values)]
    sss_desc_values = sss_desc_sample.values
    sss_desc_values = sss_desc_values[np.isfinite(sss_desc_values)]

    plt.figure(figsize=(8, 5))
    plt.hist(sss_asc_values, bins=50, alpha=0.6, label="Ascending")
    plt.hist(sss_desc_values, bins=50, alpha=0.6, label="Descending")
    plt.xlabel("Sea Surface Salinity")
    plt.ylabel("Frequency")
    plt.title("SSS Distribution — Raw Data")
    plt.legend()
    plt.tight_layout()
    plt.savefig(FIGURES_DIR / "sss_distribution_raw.png", dpi=150, bbox_inches="tight")
    plt.close()
    print("  Saved sss_distribution_raw.png")

    # --- SSH Distribution ---
    print("Plotting SSH distribution...")
    ssh_sample = ssh["sla"].sel(time=dist_sample_dates, method="nearest")
    ssh_values = ssh_sample.values
    ssh_values = ssh_values[np.isfinite(ssh_values)]

    plt.figure(figsize=(8, 5))
    plt.hist(ssh_values, bins=50)
    plt.xlabel("Sea Level Anomaly (m)")
    plt.ylabel("Frequency")
    plt.title("SSH/SLA Distribution — Raw Data")
    plt.tight_layout()
    plt.savefig(FIGURES_DIR / "ssh_distribution_raw.png", dpi=150, bbox_inches="tight")
    plt.close()
    print("  Saved ssh_distribution_raw.png")

    # --- Current Distribution ---
    print("Plotting current distribution...")
    uo_sample = currents["uo"].sel(time=dist_sample_dates, method="nearest")
    vo_sample = currents["vo"].sel(time=dist_sample_dates, method="nearest")

    uo_values = uo_sample.values
    uo_values = uo_values[np.isfinite(uo_values)]
    # BUG FIX: original notebook used uo_sample.values for vo_values
    vo_values = vo_sample.values
    vo_values = vo_values[np.isfinite(vo_values)]

    plt.figure(figsize=(8, 5))
    plt.hist(uo_values, bins=50, alpha=0.6, label="U Current")
    plt.hist(vo_values, bins=50, alpha=0.6, label="V Current")
    plt.xlabel("Current Velocity (m/s)")
    plt.ylabel("Frequency")
    plt.title("Surface Current Component Distributions")
    plt.legend()
    plt.tight_layout()
    plt.savefig(FIGURES_DIR / "current_distribution_raw.png", dpi=150, bbox_inches="tight")
    plt.close()
    print("  Saved current_distribution_raw.png")

    # --- Wind Distribution ---
    print("Plotting wind distribution...")
    wind_u_sample = winds["eastward_wind"].sel(time=dist_sample_dates, method="nearest")
    wind_v_sample = winds["northward_wind"].sel(time=dist_sample_dates, method="nearest")

    wind_u_values = wind_u_sample.values
    wind_u_values = wind_u_values[np.isfinite(wind_u_values)]
    wind_v_values = wind_v_sample.values
    wind_v_values = wind_v_values[np.isfinite(wind_v_values)]

    plt.figure(figsize=(8, 5))
    plt.hist(wind_u_values, bins=50, alpha=0.6, label="U Wind")
    plt.hist(wind_v_values, bins=50, alpha=0.6, label="V Wind")
    plt.xlabel("Wind Velocity (m/s)")
    plt.ylabel("Frequency")
    plt.title("Surface Wind Component Distributions")
    plt.legend()
    plt.tight_layout()
    plt.savefig(FIGURES_DIR / "wind_distribution_raw.png", dpi=150, bbox_inches="tight")
    plt.close()
    print("  Saved wind_distribution_raw.png")


    # ============================================================
    # SECTION 4 — SSS Ascending/Descending Outlier Investigation
    # ============================================================

    print("\n" + "=" * 70)
    print("SECTION 4 — SSS Outlier Investigation")
    print("=" * 70)

    sss_asc_da = sss_asc["Sea_Surface_Salinity"]
    sss_desc_da = sss_desc["Sea_Surface_Salinity"]

    # --- OPTIMIZATION: Batch quantile computations ---
    sss_quantile_levels = [0.90, 0.95, 0.975, 0.99, 0.995, 0.999]

    asc_q_lazy = (
        sss_asc_da
        .where(np.isfinite(sss_asc_da))
        .quantile(sss_quantile_levels)
    )

    desc_q_lazy = (
        sss_desc_da
        .where(np.isfinite(sss_desc_da))
        .quantile(sss_quantile_levels)
    )

    print("Computing SSS quantiles (batched)...")
    asc_quantiles, desc_quantiles = dask.compute(asc_q_lazy, desc_q_lazy)

    print("SSS Ascending quantiles")
    print("-" * 35)
    for q, value in zip(sss_quantile_levels, asc_quantiles.values):
        print(f"{q * 100:5.1f}% : {value:.3f}")

    print("\nSSS Descending quantiles")
    print("-" * 35)
    for q, value in zip(sss_quantile_levels, desc_quantiles.values):
        print(f"{q * 100:5.1f}% : {value:.3f}")

    # --- OPTIMIZATION: Batch threshold counts ---
    thresholds = [35, 36, 38, 40]

    asc_count_lazy = sss_asc_da.count()
    desc_count_lazy = sss_desc_da.count()
    asc_threshold_lazies = [
        sss_asc_da.where(sss_asc_da > t).count() for t in thresholds
    ]
    desc_threshold_lazies = [
        sss_desc_da.where(sss_desc_da > t).count() for t in thresholds
    ]

    print("\nComputing SSS threshold counts (batched)...")
    results = dask.compute(
        asc_count_lazy, desc_count_lazy,
        *asc_threshold_lazies, *desc_threshold_lazies
    )

    asc_valid_count = results[0].item()
    desc_valid_count = results[1].item()
    asc_threshold_counts = [r.item() for r in results[2:2 + len(thresholds)]]
    desc_threshold_counts = [r.item() for r in results[2 + len(thresholds):]]

    print("SSS Ascending extreme-value counts")
    print("-" * 45)
    for threshold, count in zip(thresholds, asc_threshold_counts):
        percentage = count / asc_valid_count * 100
        print(f"> {threshold:2d}: {count:8d} observations ({percentage:.3f}%)")

    print("\nSSS Descending extreme-value counts")
    print("-" * 45)
    for threshold, count in zip(thresholds, desc_threshold_counts):
        percentage = count / desc_valid_count * 100
        print(f"> {threshold:2d}: {count:8d} observations ({percentage:.3f}%)")

    # --- SSS overlap analysis (batched) ---
    asc = sss_asc_da
    desc = sss_desc_da
    overlap = asc.notnull() & desc.notnull()

    overlap_count_lazy = overlap.sum()
    asc_valid_lazy = asc.notnull().sum()
    desc_valid_lazy = desc.notnull().sum()

    print("\nComputing SSS overlap (batched)...")
    overlap_count, asc_valid_count, desc_valid_count = dask.compute(
        overlap_count_lazy, asc_valid_lazy, desc_valid_lazy
    )
    overlap_count = overlap_count.item()
    asc_valid_count = asc_valid_count.item()
    desc_valid_count = desc_valid_count.item()

    print("SSS Ascending/Descending overlap")
    print("-" * 40)
    print("Overlap observations:", overlap_count)
    print("Ascending valid observations:", asc_valid_count)
    print("Descending valid observations:", desc_valid_count)

    overlap_from_asc = overlap_count / asc_valid_count * 100 if asc_valid_count > 0 else 0
    overlap_from_desc = overlap_count / desc_valid_count * 100 if desc_valid_count > 0 else 0
    print(f"Overlap relative to ascending valid data: {overlap_from_asc:.3f}%")
    print(f"Overlap relative to descending valid data: {overlap_from_desc:.3f}%")

    # --- High ascending analysis (batched) ---
    high_asc = asc > 35
    high_asc_overlap = high_asc & overlap

    high_asc_count_lazy = high_asc.sum()
    high_asc_with_desc_lazy = high_asc_overlap.sum()

    high_asc_count, high_asc_with_desc = dask.compute(
        high_asc_count_lazy, high_asc_with_desc_lazy
    )
    high_asc_count = high_asc_count.item()
    high_asc_with_desc = high_asc_with_desc.item()

    print("\nHigh ascending SSS observations")
    print("-" * 45)
    print("Ascending SSS > 35:", high_asc_count)
    print("SSS > 35 with descending counterpart:", high_asc_with_desc)
    if high_asc_count > 0:
        print(f"Percentage with descending counterpart: {high_asc_with_desc / high_asc_count * 100:.3f}%")

    # --- Monthly extreme counts ---
    print("\nComputing monthly SSS extreme counts...")
    sss_asc_high = sss_asc_da > 35
    monthly_high_count = sss_asc_high.resample(time="1MS").sum().compute()

    plt.figure(figsize=(12, 5))
    monthly_high_count.plot()
    plt.xlabel("Time")
    plt.ylabel("Number of observations > 35")
    plt.title("Monthly Count of SSS Ascending Observations > 35")
    plt.tight_layout()
    plt.savefig(FIGURES_DIR / "sss_ascending_extreme_temporal.png", dpi=150, bbox_inches="tight")
    plt.close()
    print("  Saved sss_ascending_extreme_temporal.png")

    # --- Monthly extreme percentage ---
    monthly_valid_lazy = sss_asc_da.notnull().resample(time="1MS").sum()
    monthly_extreme_lazy = (sss_asc_da > 35).resample(time="1MS").sum()

    print("Computing monthly extreme percentage (batched)...")
    monthly_valid, monthly_extreme = dask.compute(monthly_valid_lazy, monthly_extreme_lazy)
    monthly_extreme_percentage = monthly_extreme / monthly_valid * 100

    plt.figure(figsize=(12, 5))
    monthly_extreme_percentage.plot()
    plt.xlabel("Time")
    plt.ylabel("Percentage of valid observations (%)")
    plt.title("Monthly Percentage of SSS Ascending Observations > 35")
    plt.tight_layout()
    plt.savefig(FIGURES_DIR / "sss_ascending_extreme_percentage_temporal.png", dpi=150, bbox_inches="tight")
    plt.close()
    print("  Saved sss_ascending_extreme_percentage_temporal.png")

    # --- Spatial extreme frequency ---
    print("Computing spatial extreme frequency...")
    sss_asc_extreme_frequency = (sss_asc_da > 35).sum(dim="time")
    sss_asc_valid_frequency = sss_asc_da.notnull().sum(dim="time")

    extreme_freq, valid_freq = dask.compute(sss_asc_extreme_frequency, sss_asc_valid_frequency)
    sss_asc_extreme_percentage = extreme_freq / valid_freq * 100

    sss_asc_extreme_percentage.plot(figsize=(9, 6))
    plt.title("Frequency of SSS Ascending Observations > 35")
    plt.xlabel("Longitude")
    plt.ylabel("Latitude")
    plt.tight_layout()
    plt.savefig(FIGURES_DIR / "sss_ascending_extreme_frequency.png", dpi=150, bbox_inches="tight")
    plt.close()
    print("  Saved sss_ascending_extreme_frequency.png")

    # --- SSS metadata ---
    print("\nSSS Ascending variables:")
    print(list(sss_asc.variables))
    print("\nSSS Descending variables:")
    print(list(sss_desc.variables))
    print("\nSSS Ascending data variables:")
    print(list(sss_asc.data_vars))
    print("\nSSS Descending data variables:")
    print(list(sss_desc.data_vars))


    # ============================================================
    # SECTION 5 — Spatial EDA
    # ============================================================

    print("\n" + "=" * 70)
    print("SECTION 5 — Spatial EDA")
    print("=" * 70)

    # These are efficient already (single timestep .isel)
    print("Plotting spatial distributions...")

    # SST spatial
    plt.figure(figsize=(9, 6))
    sst["sea_surface_temperature"].isel(time=0).plot(cmap="turbo")
    plt.title("SST — Raw Spatial Distribution")
    plt.xlabel("Longitude")
    plt.ylabel("Latitude")
    plt.tight_layout()
    plt.savefig(FIGURES_DIR / "sst_spatial_raw.png", dpi=150, bbox_inches="tight")
    plt.close()

    # SST missing
    sst_missing = sst["sea_surface_temperature"].isel(time=0).isnull()
    plt.figure(figsize=(9, 6))
    sst_missing.plot()
    plt.title("SST — Missing Data Pattern")
    plt.xlabel("Longitude")
    plt.ylabel("Latitude")
    plt.tight_layout()
    plt.savefig(FIGURES_DIR / "sst_missing_pattern.png", dpi=150, bbox_inches="tight")
    plt.close()

    # SSH spatial
    plt.figure(figsize=(9, 6))
    ssh["sla"].isel(time=0).plot(cmap="RdBu_r", center=0)
    plt.title("SSH/SLA — Raw Spatial Distribution")
    plt.xlabel("Longitude")
    plt.ylabel("Latitude")
    plt.tight_layout()
    plt.savefig(FIGURES_DIR / "ssh_spatial_raw.png", dpi=150, bbox_inches="tight")
    plt.close()

    # Current U
    plt.figure(figsize=(9, 6))
    currents["uo"].isel(time=0, depth=0).plot(cmap="RdBu_r", center=0)
    plt.title("Surface Current U — Raw Spatial Distribution")
    plt.xlabel("Longitude")
    plt.ylabel("Latitude")
    plt.tight_layout()
    plt.savefig(FIGURES_DIR / "current_u_spatial_raw.png", dpi=150, bbox_inches="tight")
    plt.close()

    # Current V
    plt.figure(figsize=(9, 6))
    currents["vo"].isel(time=0, depth=0).plot(cmap="RdBu_r", center=0)
    plt.title("Surface Current V — Raw Spatial Distribution")
    plt.xlabel("Longitude")
    plt.ylabel("Latitude")
    plt.tight_layout()
    plt.savefig(FIGURES_DIR / "current_v_spatial_raw.png", dpi=150, bbox_inches="tight")
    plt.close()

    # Wind U
    plt.figure(figsize=(9, 6))
    winds["eastward_wind"].isel(time=0).plot(cmap="RdBu_r", center=0)
    plt.title("Surface Wind U — Raw Spatial Distribution")
    plt.xlabel("Longitude")
    plt.ylabel("Latitude")
    plt.tight_layout()
    plt.savefig(FIGURES_DIR / "wind_u_spatial_raw.png", dpi=150, bbox_inches="tight")
    plt.close()

    # Wind V
    plt.figure(figsize=(9, 6))
    winds["northward_wind"].isel(time=0).plot(cmap="RdBu_r", center=0)
    plt.title("Surface Wind V — Raw Spatial Distribution")
    plt.xlabel("Longitude")
    plt.ylabel("Latitude")
    plt.tight_layout()
    plt.savefig(FIGURES_DIR / "wind_v_spatial_raw.png", dpi=150, bbox_inches="tight")
    plt.close()

    # SSS Descending spatial
    plt.figure(figsize=(9, 6))
    sss_desc["Sea_Surface_Salinity"].isel(time=0).plot(cmap="viridis")
    plt.title("SSS Descending — Raw Spatial Distribution")
    plt.xlabel("Longitude")
    plt.ylabel("Latitude")
    plt.tight_layout()
    plt.savefig(FIGURES_DIR / "sss_descending_spatial_raw.png", dpi=150, bbox_inches="tight")
    plt.close()

    # SSS Descending missing
    sss_desc_missing = sss_desc["Sea_Surface_Salinity"].isel(time=0).isnull()
    plt.figure(figsize=(9, 6))
    sss_desc_missing.plot()
    plt.title("SSS Descending — Missing Data Pattern")
    plt.xlabel("Longitude")
    plt.ylabel("Latitude")
    plt.tight_layout()
    plt.savefig(FIGURES_DIR / "sss_descending_missing_pattern.png", dpi=150, bbox_inches="tight")
    plt.close()

    # GLORYS surface
    plt.figure(figsize=(9, 6))
    glorys["thetao"].isel(time=0, depth=0).plot(cmap="turbo")
    plt.title(
        f"GLORYS Temperature — Shallowest Available Depth "
        f"({glorys.depth.isel(depth=0).item():.2f} m)"
    )
    plt.xlabel("Longitude")
    plt.ylabel("Latitude")
    plt.tight_layout()
    plt.savefig(FIGURES_DIR / "glorys_surface_spatial_raw.png", dpi=150, bbox_inches="tight")
    plt.close()

    print("  All spatial plots saved.")


    # ============================================================
    # SECTION 6 — GLORYS Depth-wise EDA
    # ============================================================

    print("\n" + "=" * 70)
    print("SECTION 6 — GLORYS Depth-wise EDA")
    print("=" * 70)

    print("Number of native GLORYS depth levels:", glorys.sizes["depth"])
    print("\nNative GLORYS depths:")
    print(glorys["depth"].values)

    thetao = glorys["thetao"]
    depth_dims = ["time", "latitude", "longitude"]

    # --- OPTIMIZATION: build all depth stats lazily, compute once ---
    glorys_depth_stats = xr.Dataset({
        "valid_count": thetao.notnull().sum(dim=depth_dims),
        "missing_fraction": thetao.isnull().mean(dim=depth_dims),
        "min": thetao.min(dim=depth_dims, skipna=True),
        "mean": thetao.mean(dim=depth_dims, skipna=True),
        "max": thetao.max(dim=depth_dims, skipna=True),
        "std": thetao.std(dim=depth_dims, skipna=True),
    })

    print("\nComputing GLORYS depth-wise statistics...")
    glorys_depth_stats = glorys_depth_stats.compute()
    print(glorys_depth_stats)

    # --- Mean temperature profile ---
    print("Computing mean temperature profile...")
    mean_profile = thetao.mean(dim=["time", "latitude", "longitude"], skipna=True).compute()

    plt.figure(figsize=(7, 8))
    plt.plot(mean_profile.values, glorys["depth"].values)
    plt.gca().invert_yaxis()
    plt.xlabel("Mean Temperature (°C)")
    plt.ylabel("Depth (m)")
    plt.title("GLORYS Mean Temperature Profile")
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig(FIGURES_DIR / "glorys_mean_temperature_profile.png", dpi=150, bbox_inches="tight")
    plt.close()
    print("  Saved glorys_mean_temperature_profile.png")

    # --- Missing by depth ---
    print("Computing missing data by depth...")
    missing_by_depth = (thetao.isnull().mean(dim=["time", "latitude", "longitude"]) * 100).compute()

    plt.figure(figsize=(7, 8))
    plt.plot(missing_by_depth.values, glorys["depth"].values)
    plt.gca().invert_yaxis()
    plt.xlabel("Missing Data (%)")
    plt.ylabel("Depth (m)")
    plt.title("GLORYS Missing Data Percentage by Depth")
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig(FIGURES_DIR / "glorys_missingness_by_depth.png", dpi=150, bbox_inches="tight")
    plt.close()
    print("  Saved glorys_missingness_by_depth.png")

    # --- Target depths ---
    target_depths = np.array([0, 5, 10, 20, 30, 50, 75, 100, 125, 150, 200, 300, 500, 700, 1000])
    print("\nANTARBODH target depths (m):")
    print(target_depths)

    native_depths = glorys["depth"].values
    print("\nANTARBODH Target Depth → Nearest Native GLORYS Level")
    print("=" * 70)
    for td in target_depths:
        nearest_index = np.abs(native_depths - td).argmin()
        nearest_depth = float(native_depths[nearest_index])
        difference = abs(nearest_depth - td)
        print(f"{td:>5.0f} m → {nearest_depth:>9.3f} m (difference = {difference:.3f} m)")

    # --- 1000m support ---
    target_depth = 1000.0
    shallower = native_depths[native_depths <= target_depth]
    deeper = native_depths[native_depths >= target_depth]
    print("\n1000 m target support")
    print("=" * 50)
    if len(shallower) > 0 and len(deeper) > 0:
        print(f"Shallower native level : {float(shallower.max()):.3f} m")
        print(f"Deeper native level    : {float(deeper.min()):.3f} m")
        print("Result: 1000 m is bracketed and can be vertically interpolated.")
    else:
        print("Result: 1000 m is outside the native GLORYS depth range.")

    # --- 0m support ---
    native_surface_depth = float(native_depths[0])
    print(f"\nShallowest native GLORYS level: {native_surface_depth:.3f} m")
    if native_surface_depth > 0:
        print("0 m is above the shallowest native level.")
        print("Use the shallowest native level as the 0 m proxy.")

    # --- Availability at target depths (batched) ---
    print("\nComputing availability at target depths (batched)...")
    availability_lazies = []
    for td in target_depths:
        field = thetao.sel(depth=td, method="nearest")
        availability_lazies.append(field.notnull().mean())
        availability_lazies.append(field["depth"])

    avail_results = dask.compute(*availability_lazies)

    target_availability = []
    for i, td in enumerate(target_depths):
        valid_fraction = avail_results[i * 2].item() * 100
        native_d = float(avail_results[i * 2 + 1].item())
        target_availability.append({
            "target_depth_m": td,
            "nearest_native_depth_m": native_d,
            "valid_fraction_percent": valid_fraction,
        })
    print(target_availability)

    # --- GLORYS 1000m plot ---
    glorys_1000m = thetao.sel(depth=1000, method="nearest")
    nearest_depth_1000m = float(glorys_1000m["depth"].compute().item())
    field_1000m = glorys_1000m.sel(time="2020-01-15", method="nearest")

    plt.figure(figsize=(9, 6))
    field_1000m.plot.pcolormesh(cmap="turbo")
    plt.title(f"GLORYS Temperature Near 1000 m (Native Level: {nearest_depth_1000m:.2f} m)")
    plt.xlabel("Longitude")
    plt.ylabel("Latitude")
    plt.tight_layout()
    plt.savefig(FIGURES_DIR / "glorys_1000m_temperature.png", dpi=150, bbox_inches="tight")
    plt.close()
    print("  Saved glorys_1000m_temperature.png")


    # ============================================================
    # SECTION 7 — Multi-variable Relationship Analysis
    # ============================================================

    print("\n" + "=" * 70)
    print("SECTION 7 — Multi-variable Relationship Analysis")
    print("=" * 70)

    # --- SST Kelvin → Celsius ---
    sst_c = sst["sea_surface_temperature"] - 273.15
    sst_c.attrs = sst["sea_surface_temperature"].attrs.copy()
    sst_c.attrs["units"] = "degrees_Celsius"

    print("Type:", type(sst_c))
    print("Dimensions:", sst_c.dims)
    print("Units:", sst_c.attrs["units"])

    sst_range_lazy = (sst_c.min(), sst_c.max())
    sst_min_val, sst_max_val = dask.compute(*sst_range_lazy)
    print(f"SST range: {float(sst_min_val.item()):.4f} to {float(sst_max_val.item()):.4f} °C")

    # --- SST vs GLORYS surface correlation ---
    correlation_date = "2020-01-15"

    glorys_surface = glorys["thetao"].sel(time=correlation_date, method="nearest").isel(depth=0)
    sst_surface = sst_c.sel(time=correlation_date, method="nearest")

    print("GLORYS type:", type(glorys_surface))
    print("GLORYS dimensions:", glorys_surface.dims)
    print("GLORYS depth:", float(glorys["depth"].isel(depth=0).compute().item()), "m")
    print("GLORYS selected time:", glorys_surface["time"].values)
    print("SST dimensions:", sst_surface.dims)
    print("SST selected time:", sst_surface["time"].values)

    glorys_surface_on_sst = glorys_surface.interp(
        latitude=sst_surface.latitude,
        longitude=sst_surface.longitude
    )

    valid_surface = np.isfinite(sst_surface) & np.isfinite(glorys_surface_on_sst)

    valid_count_lazy = valid_surface.sum()
    valid_pct_lazy = valid_surface.mean() * 100
    surface_corr_lazy = xr.corr(
        sst_surface.where(valid_surface),
        glorys_surface_on_sst.where(valid_surface)
    )

    print("\nComputing SST-GLORYS surface correlation (batched)...")
    valid_count, valid_percentage, surface_corr_value = dask.compute(
        valid_count_lazy, valid_pct_lazy, surface_corr_lazy
    )
    valid_count = int(valid_count.item())
    valid_percentage = float(valid_percentage.item())
    surface_corr_value = float(surface_corr_value.item())

    print(f"Valid SST–GLORYS surface comparison points: {valid_count:,}")
    print(f"Valid comparison percentage: {valid_percentage:.2f}%")
    print(f"SST vs GLORYS surface temperature correlation: {surface_corr_value:.4f}")

    # --- Scatter plot ---
    sst_vals = sst_surface.where(valid_surface).values.ravel()
    glorys_vals = glorys_surface_on_sst.where(valid_surface).values.ravel()
    valid_mask = np.isfinite(sst_vals) & np.isfinite(glorys_vals)
    sst_vals = sst_vals[valid_mask]
    glorys_vals = glorys_vals[valid_mask]

    max_scatter_points = 10000
    if len(sst_vals) > max_scatter_points:
        rng = np.random.default_rng(42)
        idx = rng.choice(len(sst_vals), size=max_scatter_points, replace=False)
        sst_plot = sst_vals[idx]
        glorys_plot = glorys_vals[idx]
    else:
        sst_plot = sst_vals
        glorys_plot = glorys_vals

    print(f"Points used in scatter plot: {len(sst_plot):,}")

    plt.figure(figsize=(8, 7))
    plt.scatter(sst_plot, glorys_plot, s=8, alpha=0.35)
    mn = min(sst_plot.min(), glorys_plot.min())
    mx = max(sst_plot.max(), glorys_plot.max())
    plt.plot([mn, mx], [mn, mx], linestyle="--", linewidth=1.5)
    plt.xlabel("Satellite SST (°C)")
    plt.ylabel("GLORYS Surface Temperature (°C)")
    plt.title(f"SST vs GLORYS Surface Temperature\n{correlation_date}")
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig(FIGURES_DIR / "sst_vs_glorys_surface_temperature.png", dpi=150, bbox_inches="tight")
    plt.close()
    print("  Saved sst_vs_glorys_surface_temperature.png")

    # --- SST-GLORYS Seasonal Correlations (batched) ---
    representative_dates = [
        "2020-01-15", "2020-04-15", "2020-07-15", "2020-10-15",
        "2021-01-15", "2021-04-15", "2021-07-15", "2021-10-15",
        "2022-01-15", "2022-04-15", "2022-07-15", "2022-10-15",
        "2023-01-15", "2023-04-15", "2023-07-15", "2023-10-15",
        "2024-01-15", "2024-04-15", "2024-07-15", "2024-10-15",
    ]

    seasonal_corr_lazies = []
    seasonal_count_lazies = []

    for date in representative_dates:
        sst_day = sst_c.sel(time=date, method="nearest")
        glorys_day = glorys["thetao"].sel(time=date, method="nearest").isel(depth=0)
        glorys_on_sst = glorys_day.interp(latitude=sst_day.latitude, longitude=sst_day.longitude)
        valid = np.isfinite(sst_day) & np.isfinite(glorys_on_sst)
        seasonal_corr_lazies.append(xr.corr(sst_day.where(valid), glorys_on_sst.where(valid)))
        seasonal_count_lazies.append(valid.sum())

    print("\nComputing seasonal correlations (batched)...")
    seasonal_results = dask.compute(*seasonal_corr_lazies, *seasonal_count_lazies)
    n = len(representative_dates)

    seasonal_correlations = {}
    for i, date in enumerate(representative_dates):
        corr_value = float(seasonal_results[i].item())
        count_value = int(seasonal_results[n + i].item())
        seasonal_correlations[date] = {"correlation": corr_value, "valid_count": count_value}
        print(f"{date} → r = {corr_value:.4f}, n = {count_value:,}")

    # Plot seasonal correlations
    dates = list(seasonal_correlations.keys())
    correlations = [seasonal_correlations[d]["correlation"] for d in dates]

    plt.figure(figsize=(9, 5))
    plt.bar(dates, correlations)
    plt.axhline(0, linestyle="--", linewidth=1)
    plt.ylabel("Pearson Correlation (r)")
    plt.xlabel("Representative Date")
    plt.title("SST vs GLORYS Surface Temperature Across Representative Dates")
    plt.ylim(-1, 1)
    plt.xticks(rotation=30)
    plt.tight_layout()
    plt.savefig(FIGURES_DIR / "sst_glorys_representative_date_correlation.png", dpi=150, bbox_inches="tight")
    plt.close()

    # --- SST–Subsurface correlation profile ---
    test_depths = [5, 50, 100, 200, 500, 700, 1000]
    correlation_date = "2020-01-15"
    sst_surface = sst_c.sel(time=correlation_date, method="nearest")

    depth_corr_lazies = []
    depth_count_lazies = []

    for td in test_depths:
        theta_depth = (
            glorys["thetao"]
            .sel(time=correlation_date, method="nearest")
            .interp(depth=td)
        )
        theta_on_sst = theta_depth.interp(
            latitude=sst_surface.latitude,
            longitude=sst_surface.longitude
        )
        valid = np.isfinite(sst_surface) & np.isfinite(theta_on_sst)
        depth_corr_lazies.append(xr.corr(sst_surface.where(valid), theta_on_sst.where(valid)))
        depth_count_lazies.append(valid.sum())

    print("\nComputing SST-subsurface depth correlations (batched)...")
    depth_results = dask.compute(*depth_corr_lazies, *depth_count_lazies)
    nd = len(test_depths)
    sst_depth_correlations = []

    for i, td in enumerate(test_depths):
        corr_value = float(depth_results[i].item())
        valid_count = int(depth_results[nd + i].item())
        sst_depth_correlations.append(corr_value)
        print(f"{td:>4} m : correlation = {corr_value:.4f} | valid points = {valid_count}")

    sst_corr_profile = xr.DataArray(
        sst_depth_correlations,
        coords={"depth": test_depths},
        dims=["depth"],
        name="sst_temperature_correlation"
    )
    sst_corr_profile.attrs = {
        "description": "Pearson correlation between satellite SST and GLORYS temperature at selected depths",
        "units": "correlation coefficient",
        "date": correlation_date,
    }

    plt.figure(figsize=(8, 7))
    plt.plot(sst_corr_profile.values, sst_corr_profile.depth.values, marker="o")
    plt.gca().invert_yaxis()
    plt.axvline(0, linestyle="--", linewidth=1)
    plt.xlabel("Pearson Correlation: SST vs Temperature")
    plt.ylabel("Depth (m)")
    plt.title(f"SST–Subsurface Temperature Correlation\n{correlation_date}")
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig(FIGURES_DIR / "sst_subsurface_temperature_correlation_20200115.png", dpi=150, bbox_inches="tight")
    plt.close()

    sst_corr_profile.to_netcdf(OUTPUT_DIR / "sst_subsurface_temperature_correlation_20200115.nc")
    print("  Saved correlation profile")

    # --- Multi-season SST-Subsurface (4 dates) ---
    representative_4dates = ["2020-01-15", "2020-04-15", "2020-07-15", "2020-10-15"]
    season_labels = {
        "2020-01-15": "Winter",
        "2020-04-15": "Pre-monsoon",
        "2020-07-15": "Monsoon",
        "2020-10-15": "Post-monsoon",
    }

    # Build all lazily, compute once
    all_seasonal_depth_lazies = []
    for correlation_date in representative_4dates:
        sst_surf = sst_c.sel(time=correlation_date, method="nearest")
        for td in test_depths:
            theta_depth = glorys["thetao"].sel(time=correlation_date, method="nearest").interp(depth=td)
            theta_on_sst = theta_depth.interp(latitude=sst_surf.latitude, longitude=sst_surf.longitude)
            valid = np.isfinite(sst_surf) & np.isfinite(theta_on_sst)
            all_seasonal_depth_lazies.append(
                xr.corr(sst_surf.where(valid), theta_on_sst.where(valid))
            )

    print("\nComputing multi-season SST-subsurface correlations (batched)...")
    all_seasonal_results = dask.compute(*all_seasonal_depth_lazies)

    all_correlations = []
    idx = 0
    for correlation_date in representative_4dates:
        date_corrs = []
        print(f"\n{'=' * 60}")
        print(f"Date: {correlation_date} ({season_labels[correlation_date]})")
        print("=" * 60)
        for td in test_depths:
            corr_value = float(all_seasonal_results[idx].item())
            date_corrs.append(corr_value)
            print(f"{td:>4} m : correlation = {corr_value:.4f}")
            idx += 1
        all_correlations.append(date_corrs)

    sst_seasonal_corr = xr.DataArray(
        np.array(all_correlations),
        coords={"date": representative_4dates, "depth": test_depths},
        dims=["date", "depth"],
        name="sst_temperature_correlation"
    )

    plt.figure(figsize=(9, 7))
    for date in representative_4dates:
        plt.plot(
            sst_seasonal_corr.sel(date=date).values,
            sst_seasonal_corr.depth.values,
            marker="o",
            label=f"{season_labels[date]} ({date})"
        )
    plt.gca().invert_yaxis()
    plt.axvline(0, linestyle="--", linewidth=1)
    plt.xlabel("Pearson Correlation: SST vs Temperature")
    plt.ylabel("Depth (m)")
    plt.title("SST–Subsurface Temperature Correlation\nRepresentative Seasonal Dates")
    plt.legend()
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig(FIGURES_DIR / "sst_subsurface_temperature_correlation_seasonal.png", dpi=150, bbox_inches="tight")
    plt.close()

    sst_seasonal_corr.to_netcdf(OUTPUT_DIR / "sst_subsurface_temperature_correlation_seasonal.nc")
    print("  Saved seasonal correlation profile")

    # --- Multi-variable cross-correlation analysis ---
    # BUG FIX: Use different variable names to avoid overwriting sss_asc/sss_desc datasets
    correlation_date = "2020-01-15"

    surface_variables = {
        "SST": sst_c.sel(time=correlation_date, method="nearest"),
        "SSH": ssh["sla"].sel(time=correlation_date, method="nearest"),
        "Current_U": currents["uo"].sel(time=correlation_date, method="nearest").squeeze(),
        "Current_V": currents["vo"].sel(time=correlation_date, method="nearest").squeeze(),
        "Wind_U": winds["eastward_wind"].sel(time=correlation_date, method="nearest"),
        "Wind_V": winds["northward_wind"].sel(time=correlation_date, method="nearest"),
    }

    # BUG FIX: use sss_asc_da/sss_desc_da (DataArrays), NOT overwriting the Dataset variables
    sss_asc_day = sss_asc["Sea_Surface_Salinity"].sel(time=correlation_date, method="nearest")
    sss_desc_day = sss_desc["Sea_Surface_Salinity"].sel(time=correlation_date, method="nearest")

    sss_combined = xr.where(
        sss_asc_day.notnull() & sss_desc_day.notnull(),
        (sss_asc_day + sss_desc_day) / 2,
        xr.where(sss_asc_day.notnull(), sss_asc_day, sss_desc_day)
    )
    surface_variables["SSS"] = sss_combined

    # Print surface variable info
    for name, variable in surface_variables.items():
        v_min, v_max = dask.compute(variable.min(), variable.max())
        print(
            f"{name:12s} | shape={variable.shape} | "
            f"min={float(v_min.item()):.3f} | max={float(v_max.item()):.3f}"
        )

    relationship_depths = [5, 50, 100, 200, 500, 700, 1000]

    # Build surface_variables_by_date for 4 dates
    surface_variables_by_date = {}
    for date in representative_4dates:
        sst_date = sst_c.sel(time=date, method="nearest")
        ssh_date = ssh["sla"].sel(time=date, method="nearest")
        current_u_date = currents["uo"].sel(time=date, method="nearest").squeeze()
        current_v_date = currents["vo"].sel(time=date, method="nearest").squeeze()
        wind_u_date = winds["eastward_wind"].sel(time=date, method="nearest")
        wind_v_date = winds["northward_wind"].sel(time=date, method="nearest")
        # BUG FIX: use the dataset, not the overwritten variable
        sss_asc_date = sss_asc["Sea_Surface_Salinity"].sel(time=date, method="nearest")
        sss_desc_date = sss_desc["Sea_Surface_Salinity"].sel(time=date, method="nearest")
        sss_combined_date = xr.where(
            sss_asc_date.notnull() & sss_desc_date.notnull(),
            (sss_asc_date + sss_desc_date) / 2,
            xr.where(sss_asc_date.notnull(), sss_asc_date, sss_desc_date)
        )
        surface_variables_by_date[date] = {
            "SST": sst_date,
            "SSS": sss_combined_date,
            "SSH": ssh_date,
            "Current_U": current_u_date,
            "Current_V": current_v_date,
            "Wind_U": wind_u_date,
            "Wind_V": wind_v_date,
        }

    glorys_by_date = {}
    for date in representative_4dates:
        glorys_by_date[date] = glorys["thetao"].sel(time=date, method="nearest")

    # Build ALL cross-variable correlation lazily
    print("\nBuilding cross-variable correlation graph...")
    all_cross_lazies = []
    surface_var_names = ["SST", "SSS", "SSH", "Current_U", "Current_V", "Wind_U", "Wind_V"]

    for date in representative_4dates:
        theta_selected = glorys_by_date[date]
        for variable_name in surface_var_names:
            surface_variable = surface_variables_by_date[date][variable_name]
            surface_on_glorys = surface_variable.interp(
                latitude=glorys.latitude,
                longitude=glorys.longitude
            )
            for td in relationship_depths:
                theta_depth = theta_selected.interp(depth=td)
                valid = np.isfinite(surface_on_glorys) & np.isfinite(theta_depth)
                corr = xr.corr(surface_on_glorys.where(valid), theta_depth.where(valid))
                all_cross_lazies.append(corr)

    print(f"Computing {len(all_cross_lazies)} cross-correlations (batched)...")
    all_cross_results = dask.compute(*all_cross_lazies)

    # Reshape results
    idx = 0
    cross_corr_data = np.zeros((len(representative_4dates), len(surface_var_names), len(relationship_depths)))
    for i, date in enumerate(representative_4dates):
        for j, variable_name in enumerate(surface_var_names):
            for k, td in enumerate(relationship_depths):
                cross_corr_data[i, j, k] = float(all_cross_results[idx].item())
                idx += 1

    correlation_all_dates = xr.DataArray(
        cross_corr_data,
        coords={
            "date": representative_4dates,
            "surface_variable": surface_var_names,
            "depth": relationship_depths,
        },
        dims=["date", "surface_variable", "depth"],
        name="surface_subsurface_temperature_correlation"
    )

    correlation_all_dates.attrs = {
        "description": "Pearson correlation between surface observations and GLORYS temperature",
        "units": "correlation coefficient",
    }

    print(correlation_all_dates)

    # Mean correlation matrix
    mean_correlation_matrix = correlation_all_dates.mean(dim="date")
    print("\nMean correlation matrix:")
    print(mean_correlation_matrix)

    # Absolute correlation
    mean_absolute_correlation = abs(correlation_all_dates).mean(dim="date")
    print("\nMean absolute correlation:")
    print(mean_absolute_correlation)

    # --- Heatmap plots ---
    for date in representative_4dates:
        matrix = correlation_all_dates.sel(date=date)
        plt.figure(figsize=(10, 6))
        plt.imshow(matrix.values, aspect="auto", interpolation="nearest", vmin=-1, vmax=1)
        plt.colorbar(label="Pearson Correlation")
        plt.xticks(range(len(relationship_depths)), relationship_depths)
        plt.yticks(range(len(matrix.surface_variable)), matrix.surface_variable.values)
        plt.xlabel("Depth (m)")
        plt.ylabel("Surface Variable")
        plt.title(f"Surface Variables vs GLORYS Subsurface Temperature\n{season_labels[date]} ({date})")
        plt.tight_layout()
        plt.savefig(FIGURES_DIR / f"surface_variables_vs_subsurface_temperature_{date}.png", dpi=150, bbox_inches="tight")
        plt.close()

    # Mean heatmap
    plt.figure(figsize=(10, 6))
    plt.imshow(mean_correlation_matrix.values, aspect="auto", interpolation="nearest", vmin=-1, vmax=1)
    plt.colorbar(label="Mean Pearson Correlation")
    plt.xticks(range(len(relationship_depths)), relationship_depths)
    plt.yticks(range(len(mean_correlation_matrix.surface_variable)), mean_correlation_matrix.surface_variable.values)
    plt.xlabel("Depth (m)")
    plt.ylabel("Surface Variable")
    plt.title("Mean Surface Variables vs GLORYS Subsurface Temperature\nFour Representative Dates")
    plt.tight_layout()
    plt.savefig(FIGURES_DIR / "surface_variables_vs_subsurface_temperature_mean.png", dpi=150, bbox_inches="tight")
    plt.close()

    # Save correlation results
    correlation_all_dates.to_netcdf(OUTPUT_DIR / "surface_subsurface_temperature_correlations_4dates.nc")
    mean_correlation_matrix.to_netcdf(OUTPUT_DIR / "surface_subsurface_temperature_correlations_mean.nc")
    print("  Saved cross-variable correlation results")


    # ============================================================
    # SECTION 8-11 — QC, Physical Checks, Unit Standardization
    # ============================================================

    print("\n" + "=" * 70)
    print("SECTION 8-11 — QC, Physical Checks, Unit Standardization")
    print("=" * 70)

    # --- 9.1 QC metadata ---
    qc_variables = {
        "SST": (sst, "sea_surface_temperature"),
        "SSS_ascending": (sss_asc, "Sea_Surface_Salinity"),
        "SSS_descending": (sss_desc, "Sea_Surface_Salinity"),
        "SSH": (ssh, "sla"),
        "Current_U": (currents, "uo"),
        "Current_V": (currents, "vo"),
        "Wind_U": (winds, "eastward_wind"),
        "Wind_V": (winds, "northward_wind"),
        "GLORYS": (glorys, "thetao"),
    }

    for name, (dataset, variable_name) in qc_variables.items():
        if variable_name in dataset:
            var = dataset[variable_name]
            print("\n" + "=" * 60)
            print(name)
            print("=" * 60)
            print("Variable:", variable_name)
            print("dtype:", var.dtype)
            print("Attributes:")
            for key, value in var.attrs.items():
                print(f"  {key}: {value}")
            print("Encoding:")
            for key, value in var.encoding.items():
                if key in ["_FillValue", "missing_value", "dtype", "scale_factor", "add_offset"]:
                    print(f"  {key}: {value}")

    # --- Apply QC ---
    sst_raw = sst["sea_surface_temperature"]
    sst_qc = sst_raw.where(np.isfinite(sst_raw))
    sst_mask = sst_qc.notnull()

    sss_asc_raw = sss_asc["Sea_Surface_Salinity"]
    sss_desc_raw = sss_desc["Sea_Surface_Salinity"]
    sss_asc_qc = sss_asc_raw.where(np.isfinite(sss_asc_raw))
    sss_desc_qc = sss_desc_raw.where(np.isfinite(sss_desc_raw))
    sss_asc_qc = sss_asc_qc.where((sss_asc_qc >= 0) & (sss_asc_qc <= 38))
    sss_desc_qc = sss_desc_qc.where((sss_desc_qc >= 0) & (sss_desc_qc <= 38))
    sss_asc_mask = sss_asc_qc.notnull()
    sss_desc_mask = sss_desc_qc.notnull()

    ssh_raw = ssh["sla"]
    ssh_qc = ssh_raw.where(np.isfinite(ssh_raw))
    ssh_mask = ssh_qc.notnull()

    current_u_raw = currents["uo"]
    current_v_raw = currents["vo"]
    current_u_qc = current_u_raw.where(np.isfinite(current_u_raw))
    current_v_qc = current_v_raw.where(np.isfinite(current_v_raw))
    current_u_mask = current_u_qc.notnull()
    current_v_mask = current_v_qc.notnull()

    wind_u_raw = winds["eastward_wind"]
    wind_v_raw = winds["northward_wind"]
    wind_u_qc = wind_u_raw.where(np.isfinite(wind_u_raw))
    wind_v_qc = wind_v_raw.where(np.isfinite(wind_v_raw))
    wind_u_mask = wind_u_qc.notnull()
    wind_v_mask = wind_v_qc.notnull()

    thetao_raw = glorys["thetao"]
    thetao_qc = thetao_raw.where(np.isfinite(thetao_raw))
    thetao_mask = thetao_qc.notnull()

    # --- QC report (batched) ---
    print("\nComputing QC statistics (batched)...")
    qc_count_lazies = [
        sst_mask.sum(), sss_asc_mask.sum(), sss_desc_mask.sum(),
        ssh_mask.sum(), current_u_mask.sum(), current_v_mask.sum(),
        wind_u_mask.sum(), wind_v_mask.sum(), thetao_mask.sum(),
    ]

    qc_count_results = dask.compute(*qc_count_lazies)

    qc_names = ["SST", "SSS Ascending", "SSS Descending", "SSH",
                 "Current U", "Current V", "Wind U", "Wind V", "GLORYS thetao"]
    qc_raws = [sst_raw, sss_asc_raw, sss_desc_raw, ssh_raw,
                current_u_raw, current_v_raw, wind_u_raw, wind_v_raw, thetao_raw]

    qc_report = {}
    for name, raw, valid_result in zip(qc_names, qc_raws, qc_count_results):
        total = raw.size
        valid = int(valid_result.item())
        rejected = total - valid
        qc_report[name] = {
            "total": total, "valid": valid, "rejected": rejected,
            "rejection_pct": rejected / total * 100,
            "retention_pct": valid / total * 100,
        }

    print("\n========== QC REPORT ==========")
    for name, s in qc_report.items():
        print(
            f"{name:20s} | Total: {s['total']:,} | Valid: {s['valid']:,} | "
            f"Rejected: {s['rejected']:,} | Reject: {s['rejection_pct']:.2f}% | "
            f"Retain: {s['retention_pct']:.2f}%"
        )

    # --- Export QC report ---
    qc_report_path = OUTPUT_DIR / "qc_report.csv"
    with open(qc_report_path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["Dataset", "Total Observations", "Valid After QC", "Rejected", "Rejection %", "Retention %"])
        for name, s in qc_report.items():
            writer.writerow([name, s["total"], s["valid"], s["rejected"],
                             round(s["rejection_pct"], 4), round(s["retention_pct"], 4)])
    print(f"QC report saved to: {qc_report_path}")

    # --- Physical sanity checks (batched) ---
    sst_c = sst_qc - 273.15
    sst_physical = sst_c.where((sst_c >= -2) & (sst_c <= 40))
    sst_physical_bad = (sst_c < -2) | (sst_c > 40)

    ssh_physical = ssh_qc.where((ssh_qc >= -5) & (ssh_qc <= 5))
    current_u_physical = current_u_qc.where((current_u_qc >= -5) & (current_u_qc <= 5))
    current_v_physical = current_v_qc.where((current_v_qc >= -5) & (current_v_qc <= 5))
    wind_u_physical = wind_u_qc.where((wind_u_qc >= -50) & (wind_u_qc <= 50))
    wind_v_physical = wind_v_qc.where((wind_v_qc >= -50) & (wind_v_qc <= 50))
    thetao_physical = thetao_qc.where((thetao_qc >= -2) & (thetao_qc <= 40))

    print("\nComputing physical sanity checks (batched)...")
    phys_lazies = [
        sst_physical.min(), sst_physical.max(), sst_physical_bad.sum(),
        sss_asc_qc.min(), sss_asc_qc.max(), sss_desc_qc.min(), sss_desc_qc.max(),
        ssh_physical.min(), ssh_physical.max(),
        current_u_physical.min(), current_u_physical.max(),
        current_v_physical.min(), current_v_physical.max(),
        wind_u_physical.min(), wind_u_physical.max(),
        wind_v_physical.min(), wind_v_physical.max(),
        thetao_physical.min(), thetao_physical.max(),
    ]
    phys_results = dask.compute(*phys_lazies)

    print(f"\nSST °C: min={float(phys_results[0].item()):.4f}, max={float(phys_results[1].item()):.4f}")
    print(f"SST outside physical range: {int(phys_results[2].item())} ({int(phys_results[2].item()) / sst_c.size * 100:.4f}%)")
    print(f"SSS ascending: min={float(phys_results[3].item()):.4f}, max={float(phys_results[4].item()):.4f}")
    print(f"SSS descending: min={float(phys_results[5].item()):.4f}, max={float(phys_results[6].item()):.4f}")
    print(f"SSH: min={float(phys_results[7].item()):.4f}, max={float(phys_results[8].item()):.4f}")
    print(f"Current U: min={float(phys_results[9].item()):.4f}, max={float(phys_results[10].item()):.4f}")
    print(f"Current V: min={float(phys_results[11].item()):.4f}, max={float(phys_results[12].item()):.4f}")
    print(f"Wind U: min={float(phys_results[13].item()):.4f}, max={float(phys_results[14].item()):.4f}")
    print(f"Wind V: min={float(phys_results[15].item()):.4f}, max={float(phys_results[16].item()):.4f}")
    print(f"GLORYS: min={float(phys_results[17].item()):.4f}, max={float(phys_results[18].item()):.4f}")

    # --- Unit standardization ---
    sst_c = sst_qc - 273.15
    sst_c.attrs["units"] = "degrees_C"
    sst_c.attrs["long_name"] = "Sea surface temperature"

    sss_asc_std = sss_asc_qc
    sss_desc_std = sss_desc_qc
    ssh_std = ssh_qc
    current_u_std = current_u_qc
    current_v_std = current_v_qc
    wind_u_std = wind_u_qc
    wind_v_std = wind_v_qc
    thetao_std = thetao_qc

    print("\nUnits after standardization:")
    print("SST:", sst_c.attrs.get("units"))
    print("SSS:", sss_asc_std.attrs.get("units"))
    print("SSH:", ssh_std.attrs.get("units"))
    print("Current U:", current_u_std.attrs.get("units"))
    print("Current V:", current_v_std.attrs.get("units"))
    print("Wind U:", wind_u_std.attrs.get("units"))
    print("Wind V:", wind_v_std.attrs.get("units"))
    print("GLORYS:", thetao_std.attrs.get("units"))


    # ============================================================
    # SECTION 12-16 — Regridding, Alignment, X/Y Construction
    # ============================================================

    print("\n" + "=" * 70)
    print("SECTION 12-16 — Regridding & X/Y Construction")
    print("=" * 70)

    # --- SSS anomaly investigation ---
    print("\nSSS anomaly investigation...")
    sss_asc_high = sss_asc_std.where(sss_asc_std > 50)
    sss_desc_high = sss_desc_std.where(sss_desc_std > 50)

    sss_high_lazies = [
        sss_asc_high.notnull().sum(), sss_asc_high.min(skipna=True), sss_asc_high.max(skipna=True),
        sss_desc_high.notnull().sum(), sss_desc_high.min(skipna=True), sss_desc_high.max(skipna=True),
    ]
    sss_high_results = dask.compute(*sss_high_lazies)

    print("SSS Ascending values > 50")
    print("-" * 32)
    print(f"Count: {int(sss_high_results[0].item())}")
    print(f"Min: {float(sss_high_results[1].item())}")
    print(f"Max: {float(sss_high_results[2].item())}")
    print("\nSSS Descending values > 50")
    print("-" * 32)
    print(f"Count: {int(sss_high_results[3].item())}")
    print(f"Min: {float(sss_high_results[4].item())}")
    print(f"Max: {float(sss_high_results[5].item())}")

    # --- SSS threshold counts ---
    sss_thresholds = [35, 36, 38, 40, 50, 55, 60]
    sss_thresh_lazies = []
    for t in sss_thresholds:
        sss_thresh_lazies.append((sss_asc_std > t).sum())
    for t in sss_thresholds:
        sss_thresh_lazies.append((sss_desc_std > t).sum())

    sss_thresh_results = dask.compute(*sss_thresh_lazies)

    print("\n========== SSS ASCENDING ==========")
    for i, t in enumerate(sss_thresholds):
        print(f"> {t}: {int(sss_thresh_results[i].item()):,}")
    print("\n========== SSS DESCENDING ==========")
    for i, t in enumerate(sss_thresholds):
        print(f"> {t}: {int(sss_thresh_results[len(sss_thresholds) + i].item()):,}")

    # --- Common 0.25° grid ---
    common_lat = xr.DataArray(np.arange(5.125, 20.0, 0.25), dims="latitude", name="latitude")
    common_lon = xr.DataArray(np.arange(80.125, 100.0, 0.25), dims="longitude", name="longitude")

    print("\nCommon latitude:", common_lat.values[[0, -1]], f"({common_lat.size} points)")
    print("Common longitude:", common_lon.values[[0, -1]], f"({common_lon.size} points)")

    # --- Regrid all surface variables ---
    print("\nRegridding surface variables to common grid...")

    sst_common = sst_c.interp(latitude=common_lat, longitude=common_lon)
    print("  SST done")

    sss_asc_common = sss_asc_std.interp(latitude=common_lat, longitude=common_lon)
    sss_desc_common = sss_desc_std.interp(latitude=common_lat, longitude=common_lon)
    print("  SSS done")

    # Combine SSS
    asc_valid = sss_asc_common.notnull()
    desc_valid = sss_desc_common.notnull()
    sss_common = xr.where(
        asc_valid & desc_valid,
        (sss_asc_common + sss_desc_common) / 2,
        xr.where(asc_valid, sss_asc_common, sss_desc_common)
    )
    sss_common.name = "SSS"
    sss_common.attrs["long_name"] = "Combined practical sea surface salinity"
    sss_common.attrs["units"] = sss_asc_qc.attrs.get("units")
    print("  SSS combined")

    ssh_common = ssh_std.interp(latitude=common_lat, longitude=common_lon)
    print("  SSH done")

    current_u_common = current_u_std.interp(latitude=common_lat, longitude=common_lon)
    current_v_common = current_v_std.interp(latitude=common_lat, longitude=common_lon)
    print("  Currents done")

    wind_u_common = wind_u_std.interp(latitude=common_lat, longitude=common_lon)
    wind_v_common = wind_v_std.interp(latitude=common_lat, longitude=common_lon)
    print("  Winds done")

    # Drop extra depth dimension from currents
    current_u_common = current_u_common.sel(depth=0, drop=True)
    current_v_common = current_v_common.sel(depth=0, drop=True)

    # --- Surface common dataset ---
    surface_common = xr.Dataset({
        "SST": sst_common,
        "SSS": sss_common,
        "SSH": ssh_common,
        "Current_U": current_u_common,
        "Current_V": current_v_common,
        "Wind_U": wind_u_common,
        "Wind_V": wind_v_common,
    })
    print("\n", surface_common)

    # Rechunk
    surface_common = surface_common.chunk({
        "time": 30,
        "latitude": 60,
        "longitude": 80,
    })
    print("Chunks:", surface_common.chunks)

    # --- Coverage (batched) ---
    print("\nComputing common-grid coverage...")
    coverage = surface_common.notnull().mean(dim=("time", "latitude", "longitude")).compute()

    for var in coverage.data_vars:
        valid_pct = coverage[var].item() * 100
        missing_pct = 100 - valid_pct
        print(f"{var:12s} | valid={valid_pct:.2f}% | missing={missing_pct:.2f}%")

    # --- Common grid plots ---
    print("\nPlotting common-grid variables...")
    variables = ["SST", "SSS", "SSH", "Current_U", "Current_V", "Wind_U", "Wind_V"]

    for var in variables:
        plt.figure(figsize=(8, 5))
        surface_common[var].isel(time=0).plot()
        plt.title(f"{var} — Common 0.25° Grid")
        plt.xlabel("Longitude")
        plt.ylabel("Latitude")
        plt.tight_layout()
        plt.savefig(FIGURES_DIR / f"{var.lower()}_common_grid_20200101.png", dpi=150, bbox_inches="tight")
        plt.close()

    for var in variables:
        plt.figure(figsize=(8, 5))
        surface_common[var].isel(time=0).notnull().plot()
        plt.title(f"{var} — Observation Mask")
        plt.xlabel("Longitude")
        plt.ylabel("Latitude")
        plt.tight_layout()
        plt.close()

    print("  All common-grid plots saved.")

    # --- GLORYS vertical interpolation ---
    print("\nStep 14 — GLORYS vertical interpolation...")
    target_depths_da = xr.DataArray(
        [0, 5, 10, 20, 30, 50, 75, 100, 125, 150, 200, 300, 500, 700, 1000],
        dims="depth",
        name="depth"
    )
    print("Target depths:", target_depths_da.values)

    print("Original shallowest depth:", float(thetao_std.depth.values[0]))
    print("Original deepest depth:", float(thetao_std.depth.values[-1]))

    thetao_for_interp = thetao_std.assign_coords(
        depth=xr.where(
            thetao_std.depth == thetao_std.depth[0],
            0,
            thetao_std.depth
        )
    )
    print("Modified depth coord:", thetao_for_interp.depth.values[:5], "...")

    thetao_15depth = thetao_for_interp.interp(depth=target_depths_da)
    print("Target depths after interp:", thetao_15depth.depth.values)

    # Missing profile
    print("\nComputing missing profile at target depths...")
    missing_profile = (100 * thetao_15depth.isnull().mean(dim=["time", "latitude", "longitude"])).compute()

    for depth in target_depths_da.values:
        missing_pct = missing_profile.sel(depth=depth).item()
        print(f"{depth:4.0f} m | missing = {missing_pct:.2f}%")

    # --- GLORYS horizontal regrid ---
    print("\nStep 15 — GLORYS horizontal regridding...")
    thetao_common = thetao_15depth.interp(latitude=common_lat, longitude=common_lon)

    print("Shape:", thetao_common.shape)
    print("Depths:", thetao_common.depth.values)
    print("Lat:", thetao_common.latitude.values[[0, -1]])
    print("Lon:", thetao_common.longitude.values[[0, -1]])

    # --- Step 16: Align and construct X/Y ---
    print("\nStep 16 — Aligning X and Y...")
    surface_common, thetao_common = xr.align(surface_common, thetao_common, join="exact")

    print("Surface dimensions:", surface_common.sizes)
    print("Target dimensions:", thetao_common.sizes)

    assert surface_common.sizes["time"] == thetao_common.sizes["time"]
    assert surface_common.sizes["latitude"] == thetao_common.sizes["latitude"]
    assert surface_common.sizes["longitude"] == thetao_common.sizes["longitude"]

    input_variables = ["SST", "SSS", "SSH", "Current_U", "Current_V", "Wind_U", "Wind_V"]

    X_da = xr.concat([surface_common[var] for var in input_variables], dim="channel")
    X_da = X_da.assign_coords(channel=input_variables)
    X_da.name = "surface_inputs"

    Y_da = thetao_common.rename("subsurface_temperature")

    X_mask = X_da.notnull()
    X_mask.name = "surface_observation_mask"

    Y_mask = Y_da.notnull()
    Y_mask.name = "target_valid_mask"

    X_da = X_da.transpose("time", "channel", "latitude", "longitude")
    X_mask = X_mask.transpose("time", "channel", "latitude", "longitude")

    print("\n========== FINAL PROTOTYPE SHAPES ==========")
    print("X:", X_da.shape)
    print("Y:", Y_da.shape)
    print("X mask:", X_mask.shape)
    print("Y mask:", Y_mask.shape)
    print("\nChannels:", X_da.channel.values)
    print("Target depths:", Y_da.depth.values)

    # Rechunk X_mask
    X_mask = X_mask.chunk({"time": 30, "channel": 7, "latitude": 60, "longitude": 80})


    # ============================================================
    # SECTION 17-36 — Missing Strategy, Split, Normalize, Save
    # ============================================================

    print("\n" + "=" * 70)
    print("SECTION 17-36 — Split, Normalize, Save")
    print("=" * 70)

    # --- Coverage ---
    print("\nComputing input/target coverage (batched)...")
    channel_coverage = (100 * X_mask.mean(dim=["time", "latitude", "longitude"])).compute()

    print("========== INPUT COVERAGE ==========")
    for channel in X_mask.channel.values:
        cov = channel_coverage.sel(channel=channel).item()
        print(f"{channel:12s} | coverage = {cov:.2f}%")

    target_coverage = (100 * Y_mask.mean(dim=["time", "latitude", "longitude"])).compute()

    print("\n========== TARGET COVERAGE ==========")
    for depth in Y_da.depth.values:
        cov = target_coverage.sel(depth=depth).item()
        print(f"{depth:4.0f} m | coverage = {cov:.2f}%")

    # --- Time checks ---
    time_values = X_da.time.values
    print(f"\nDuplicate timestamps: {len(time_values) - len(np.unique(time_values))}")

    time_diff = X_da.time.diff("time")
    print("Time differences:")
    print(time_diff.to_pandas().value_counts())

    # --- Daily coverage ---
    print("\nComputing daily coverage...")
    all_inputs_available = X_mask.all(dim="channel")
    daily_input_coverage = (100 * all_inputs_available.mean(dim=["latitude", "longitude"])).compute()
    daily_target_coverage = (100 * Y_mask.mean(dim=["depth", "latitude", "longitude"])).compute()

    joint_target_input = X_mask.any(dim="channel") & Y_mask.any(dim="depth")
    overall_joint_fraction = joint_target_input.mean().compute().item()
    print(f"Overall input-target spatial coverage: {overall_joint_fraction * 100:.2f}%")

    # --- Step 30: Chronological split ---
    print("\n--- Chronological Split ---")
    train_mask = X_da.time.dt.year <= 2023
    val_mask = X_da.time.dt.year == 2024
    test_mask = X_da.time.dt.year == 2025

    X_train = X_da.sel(time=train_mask)
    X_val = X_da.sel(time=val_mask)
    X_test = X_da.sel(time=test_mask)

    Y_train = Y_da.sel(time=train_mask)
    Y_val = Y_da.sel(time=val_mask)
    Y_test = Y_da.sel(time=test_mask)

    Xmask_train = X_mask.sel(time=train_mask)
    Xmask_val = X_mask.sel(time=val_mask)
    Xmask_test = X_mask.sel(time=test_mask)

    Ymask_train = Y_mask.sel(time=train_mask)
    Ymask_val = Y_mask.sel(time=val_mask)
    Ymask_test = Y_mask.sel(time=test_mask)

    print("Train:", X_train.time.values[0], "→", X_train.time.values[-1])
    print("Val:  ", X_val.time.values[0], "→", X_val.time.values[-1])
    print("Test: ", X_test.time.values[0], "→", X_test.time.values[-1])

    # --- Step 31: Normalization stats from TRAIN ONLY ---
    print("\nStep 31 — Computing normalization statistics from training set...")
    train_mean_lazy = X_train.mean(dim=["time", "latitude", "longitude"], skipna=True)
    train_std_lazy = X_train.std(dim=["time", "latitude", "longitude"], skipna=True)
    train_mean, train_std = dask.compute(train_mean_lazy, train_std_lazy)

    print("Train mean:", train_mean.values)
    print("Train std:", train_std.values)

    # --- Step 32: Normalize X ---
    print("\nStep 32 — Normalizing X...")
    X_train_norm = (X_train - train_mean) / train_std
    X_val_norm = (X_val - train_mean) / train_std
    X_test_norm = (X_test - train_mean) / train_std

    # --- Step 33: Fill missing ---
    print("Step 33 — Filling missing values with 0...")
    X_train_norm = X_train_norm.fillna(0)
    X_val_norm = X_val_norm.fillna(0)
    X_test_norm = X_test_norm.fillna(0)

    # --- Step 34: 14-channel input ---
    print("Step 34 — Creating 14-channel model input...")

    def make_14_channel_input(X_norm, Xmask):
        mask_channels = Xmask.astype(np.float32)
        mask_channels = mask_channels.assign_coords(
            channel=[f"{c}_mask" for c in X_norm.channel.values]
        )
        return xr.concat([X_norm, mask_channels], dim="channel")

    X_train_14 = make_14_channel_input(X_train_norm, Xmask_train)
    X_val_14 = make_14_channel_input(X_val_norm, Xmask_val)
    X_test_14 = make_14_channel_input(X_test_norm, Xmask_test)

    # --- Step 35: Final datasets ---
    print("Step 35 — Creating final dataset objects...")

    train_ds = xr.Dataset({
        "X": X_train_14,
        "Y": Y_train,
        "Y_mask": Ymask_train.astype(np.int8),
    })

    val_ds = xr.Dataset({
        "X": X_val_14,
        "Y": Y_val,
        "Y_mask": Ymask_val.astype(np.int8),
    })

    test_ds = xr.Dataset({
        "X": X_test_14,
        "Y": Y_test,
        "Y_mask": Ymask_test.astype(np.int8),
    })

    print("\n========== FINAL ML SHAPES ==========")
    print("Train X:", train_ds["X"].shape)
    print("Train Y:", train_ds["Y"].shape)
    print("Val X:", val_ds["X"].shape)
    print("Val Y:", val_ds["Y"].shape)
    print("Test X:", test_ds["X"].shape)
    print("Test Y:", test_ds["Y"].shape)

    print("\nChannels:", train_ds.X.channel.values)
    print("Depths:", train_ds.Y.depth.values)

    assert train_ds.X.dims == ("time", "channel", "latitude", "longitude")
    assert train_ds.Y.dims == ("time", "depth", "latitude", "longitude")
    print("✓ Dimension assertions passed")

    # --- QC checks (batched) ---
    print("\nFinal QC checks...")
    x_nan_lazy = train_ds["X"].isnull().sum()
    y_nan_lazy = train_ds["Y"].isnull().sum()
    x_inf_lazy = np.isinf(train_ds["X"]).any()
    y_inf_lazy = np.isinf(train_ds["Y"]).any()

    x_nans, y_nans, x_inf, y_inf = dask.compute(x_nan_lazy, y_nan_lazy, x_inf_lazy, y_inf_lazy)
    print("X NaNs:", int(x_nans.item()))
    print("Y NaNs:", int(y_nans.item()))
    print("X has Inf:", bool(x_inf.item()))
    print("Y has Inf:", bool(y_inf.item()))

    # --- Step 36: Save to disk ---
    print("\n" + "=" * 70)
    print("Step 36 — Saving processed datasets to disk...")
    print("=" * 70)

    encoding_float = {"dtype": "float32", "zlib": True, "complevel": 4}
    encoding_int = {"dtype": "int8", "zlib": True, "complevel": 4}

    for name, ds, fname in [
        ("Train", train_ds, "train.nc"),
        ("Validation", val_ds, "val.nc"),
        ("Test", test_ds, "test.nc"),
    ]:
        path = PROCESSED_DIR / fname
        print(f"\n  Saving {name} → {path}")
        ds.to_netcdf(
            path,
            encoding={
                "X": encoding_float,
                "Y": encoding_float,
                "Y_mask": encoding_int,
            },
        )
        print(f"  ✓ {name} saved ({path.stat().st_size / 1e6:.1f} MB)")

    # Save normalization stats
    norm_stats = xr.Dataset({
        "train_mean": train_mean,
        "train_std": train_std,
    })
    norm_path = PROCESSED_DIR / "normalization_stats.nc"
    norm_stats.to_netcdf(norm_path)
    print(f"\n  ✓ Normalization stats saved to {norm_path}")

    # --- Cleanup ---

    print("\n" + "=" * 70)
    print("ANTARBODH Preprocessing Complete!")
    print("=" * 70)
    print(f"Processed data: {PROCESSED_DIR}")
    print(f"Figures: {FIGURES_DIR}")
    print(f"Reports/Stats: {STATS_DIR}")


if __name__ == "__main__":
    main()
