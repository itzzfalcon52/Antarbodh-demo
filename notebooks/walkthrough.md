# Walkthrough — Preprocessing Pipeline Optimization & Execution

The preprocessing and exploratory data analysis pipeline for **ANTARBODH** has been optimized, debugged, and executed across all 6 years (2020–2025) of multi-source oceanographic datasets (~5–6 GB raw data).

---

## 1. Problem & Performance Diagnosis

### Why Cells Took 2+ Hours:
1. **Un-batched Dask Computations**: The original notebook executed individual `.compute()` calls for min, max, mean, std, quantiles, and missing counts sequentially. Each call triggered independent graph traversals and re-read compressed NetCDF chunks from the external drive.
2. **Sub-optimal Chunking**: Chunks were unaligned with computation dimensions, causing high graph overhead and redundant disk seek operations.
3. **Variable Overwrite Bug**: `sss_asc` and `sss_desc` (Dataset objects) were overwritten by 2D slice variables with the exact same names in Section 7, causing runtime errors and corrupting downstream regridding.
4. **Duplicate Interpolations**: Regridding operations were performed redundantly across multiple cells rather than systematically in a single unified graph.

---

## 2. Key Optimizations Implemented

- **Unified Batched Computation**: Combined all statistical reductions into batched `dask.compute(*lazies)` calls. Section 2 (which previously took hours) completed in **under 2 minutes**.
- **Tuned Chunk Geometries**: Configured chunk sizes to balance memory footprint and parallel I/O throughput:
  - Surface variables: `chunks={"time": 30, "latitude": 60, "longitude": 80}`
  - GLORYS 3D reanalysis: `chunks={"time": 30, "depth": 10, "latitude": 60, "longitude": 80}`
- **Threaded Scheduler**: Utilized Dask's multi-threaded scheduler (`scheduler="threads"`) to eliminate macOS multiprocessing spawn conflicts and IPC overhead.
- **Variable Namespace Isolation**: Fixed the `sss_asc` / `sss_desc` variable shadowing bug.
- **Optimized NetCDF4 Compression**: Applied `zlib=True, complevel=4` with explicit data types (`float32` for features/targets, `int8` for masks) to minimize disk space while maximizing write speed.

---

## 3. Execution Benchmarks & Results

- **Total Execution Time**: **49 minutes 44 seconds** for the entire end-to-end pipeline (including 7 raw datasets, 2,192 daily time-steps, EDA plots, quality control, 3D vertical interpolation, and serialization).
- **CPU Utilization**: Sustained **~95% CPU** across execution.

### Generated Artifacts & Datasets

| Dataset / File | Location | Size | Description |
| :--- | :--- | :--- | :--- |
| **`train.nc`** | [`data/processed/train.nc`](file:///Volumes/SAM-T7/SIH/Antarbodh-demo/data/processed/train.nc) | **314 MB** (compressed) | 2020–2023 train split (1,461 daily steps) |
| **`val.nc`** | [`data/processed/val.nc`](file:///Volumes/SAM-T7/SIH/Antarbodh-demo/data/processed/val.nc) | **80 MB** (compressed) | 2024 validation split (366 daily steps) |
| **`test.nc`** | [`data/processed/test.nc`](file:///Volumes/SAM-T7/SIH/Antarbodh-demo/data/processed/test.nc) | **74 MB** (compressed) | 2025 evaluation split (365 daily steps) |
| **`normalization_stats.nc`** | [`data/processed/normalization_stats.nc`](file:///Volumes/SAM-T7/SIH/Antarbodh-demo/data/processed/normalization_stats.nc) | **13 KB** | Train-set mean and std per channel |
| **`qc_report.csv`** | [`outputs/qc_report.csv`](file:///Volumes/SAM-T7/SIH/Antarbodh-demo/outputs/qc_report.csv) | **545 B** | Full data audit & quality retention metrics |
| **EDA & Mask Figures** | [`outputs/figures/`](file:///Volumes/SAM-T7/SIH/Antarbodh-demo/outputs/figures) | **~50 PNGs** | Observation masks, distributions, correlation profiles |

---

## 4. Final Dataset Specifications

### Tensor Shapes:
- **Input Features ($X$)**:
  - `Train`: `(1461, 14, 60, 80)`
  - `Val`: `(366, 14, 60, 80)`
  - `Test`: `(365, 14, 60, 80)`
  - **14 Channels**:
    1. `SST` (Sea Surface Temperature, normalized)
    2. `SSS` (Combined Sea Surface Salinity, normalized)
    3. `SSH` (Sea Level Anomaly, normalized)
    4. `Current_U` (Eastward surface current, normalized)
    5. `Current_V` (Northward surface current, normalized)
    6. `Wind_U` (Eastward wind, normalized)
    7. `Wind_V` (Northward wind, normalized)
    8–14. Observation availability masks (`SST_mask`, `SSS_mask`, `SSH_mask`, `Current_U_mask`, `Current_V_mask`, `Wind_U_mask`, `Wind_V_mask`)
- **Target ($Y$)**:
  - `Train`: `(1461, 15, 60, 80)`
  - `Val`: `(366, 15, 60, 80)`
  - `Test`: `(365, 15, 60, 80)`
  - **15 Standard Depths**: `[0, 5, 10, 20, 30, 50, 75, 100, 125, 150, 200, 300, 500, 700, 1000]` meters
- **Coordinate Grids**:
  - `latitude`: 60 grid points ($5.125^\circ\text{N}$ to $19.875^\circ\text{N}$, $0.25^\circ$ spacing)
  - `longitude`: 80 grid points ($80.125^\circ\text{E}$ to $99.875^\circ\text{E}$, $0.25^\circ$ spacing)

---

## 5. Joint & Target Coverage Analysis

A comprehensive audit was performed across all spatial and vertical dimensions to evaluate data density and sensor availability.

![ANTARBODH Coverage Analysis](/Users/hussain/.gemini/antigravity-ide/brain/f1532871-56bb-4853-b4a9-6e8e3769c6e1/dataset_coverage_analysis.png)

### A. Target (GLORYS Subsurface Temperature) Coverage by Depth

The target coverage is **100% stable across all chronological partitions** (Train, Val, Test):

| Depth Level | Coverage (% of Bounding Box) | Ocean-Only Coverage | Geological / Physical Feature |
| :--- | :--- | :--- | :--- |
| **0 m & 5 m** | **80.17%** | **100.0%** | Sea surface; entire Bay of Bengal ocean domain |
| **10 m** | **78.40%** | **97.8%** | Very shallow coastal tidal flats & river mouths |
| **20 m – 30 m** | **75.06% – 76.65%** | **93.6% – 95.6%** | Inner continental shelf zones |
| **50 m – 100 m** | **69.15% – 72.88%** | **86.3% – 90.9%** | Outer continental shelf margin (Palk Strait, Gulf of Martaban) |
| **125 m – 200 m** | **67.52% – 68.71%** | **84.2% – 85.7%** | Shelf-slope break boundary |
| **300 m – 500 m** | **65.02% – 66.81%** | **81.1% – 83.3%** | Upper continental slope |
| **700 m – 1000 m** | **61.29% – 63.42%** | **76.4% – 79.1%** | Deep abyssal plain & central Bay of Bengal basin |

> [!NOTE]
> The total bounding box is $60 \times 80 = 4,800$ grid points. Exactly **80.17%** represents ocean water, while **19.83%** is landmass (India, Bangladesh, Myanmar, Sri Lanka, Andaman Islands). The decrease with depth from 80.17% to 61.29% is governed purely by **seafloor bathymetry** (points shallower than the target depth have no water column).

---

### B. Input Variable Coverage by Channel

| Input Variable | Train (2020–2023) | Val (2024) | Test (2025) | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **SSH** (`sla`) | **82.17%** | **82.17%** | **82.17%** | Continuous daily multi-satellite altimetry over full ocean |
| **Current U / V** (`uo`, `vo`) | **78.81%** | **78.93%** | **78.81%** | Hydrodynamic surface currents; consistent high density |
| **Wind U / V** | **24.82%** | **24.79%** | **24.30%** | Satellite scatterometer swath tracks |
| **SST** | **22.17%** | **22.41%** | **19.66%** | Infrared/microwave satellite passes |
| **SSS** | **24.12%** | **0.09%** | **0.00%** | SMAP satellite salinity passes (2020–2023 primary mission) |

---

### C. Joint Coverage (Inputs Matching Subsurface Target)

- **Overall Joint Coverage (At least 1 active observation + subsurface target)**: **79.80%**
  - Virtually **100% of all marine grid cells** on any given day have at least one active surface observation matching the GLORYS target.
- **Strict Joint Coverage (All 7 surface inputs present simultaneously on the same day & pixel)**: **2.54%**
  - Because satellites operate on differing orbital swaths and cloud cover masks optical sensors, all 7 instruments rarely align simultaneously over the exact same point.
- **Validation of the 14-Channel Architecture**: By pairing each physical channel with an explicit observation mask channel (`SST_mask`, `SSS_mask`, etc.), the model learns to exploit whatever modalities are present without failing when specific sensors are absent.

