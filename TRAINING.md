# AntarBodh — Training Guide

> **From raw ocean data to trained subsurface temperature model**

This guide covers the complete workflow: downloading data, running the preprocessing pipeline, training the CNN model, and evaluating results.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Data Download](#2-data-download)
3. [Preprocessing Pipeline](#3-preprocessing-pipeline)
4. [Training Configuration](#4-training-configuration)
5. [Training the Model](#5-training-the-model)
6. [Evaluation](#6-evaluation)
7. [Model Architecture](#7-model-architecture)
8. [Training Data Format](#8-training-data-format)
9. [Progressive Development](#9-progressive-development)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Prerequisites

### System Requirements

- Python 3.10+
- 16 GB RAM minimum (32 GB recommended for full 6-year dataset)
- GPU with CUDA support (recommended, not required)
- ~50 GB disk space for raw + processed datasets

### Environment Setup

```bash
git clone https://github.com/itzzfalcon52/Antarbodh-demo.git
cd Antarbodh-demo
```

#### macOS / Linux

```bash
python3 -m venv .venv
source .venv/bin/activate
```

#### Windows

```powershell
python -m venv .venv
.venv\Scripts\activate
```

#### Install Dependencies

```bash
pip install -r requirements.txt
```

### Copernicus Marine Account

All ocean datasets are downloaded from the Copernicus Marine Data Store. You need an account:

1. Register at [https://data.marine.copernicus.eu/](https://data.marine.copernicus.eu/)
2. Verify your email
3. Configure CLI credentials:

```bash
copernicusmarine login
```

---

## 2. Data Download

### Overview

AntarBodh uses 7 datasets from Copernicus Marine plus Argo for validation:

| Dataset | Variable(s) | Script |
|---|---|---|
| GLORYS12V1 | `thetao` (subsurface temperature) | `src/download/glorys.py` |
| SST | `sea_surface_temperature` | `src/download/sst.py` |
| SSS | `Sea_Surface_Salinity` (asc + desc) | `src/download/sss.py` |
| SSH/SLA | `sla` | `src/download/ssh.py` |
| Currents | `uo`, `vo` | `src/download/currents.py` |
| Winds | `eastward_wind`, `northward_wind` | `src/download/winds.py` |
| Argo | temperature/salinity profiles | `src/download/argo.py` |

### Configure the Download

All download parameters are in `configs/prototype.yaml`:

```yaml
region:
  min_lat: 5
  max_lat: 20
  min_lon: 80
  max_lon: 100

time:
  start: "2020-01-01"
  end: "2025-12-31"
```

> **Start small:** For your first run, change the time range to a short period:
> ```yaml
> time:
>   start: "2020-01-01"
>   end: "2020-01-03"
> ```

### Run Downloads

```bash
# Download each dataset (run from repository root)
python src/download/glorys.py
python src/download/sst.py
python src/download/sss.py
python src/download/ssh.py
python src/download/currents.py
python src/download/winds.py

# Optional: Argo for validation
python src/download/argo.py
```

### Verify Downloads

After downloading, your `data/raw/` directory should contain:

```text
data/raw/
├── glorys/
│   └── glorys_bob.nc
├── sst/
│   └── sst_bob.nc
├── sss/
│   ├── sss_bob_ascending.nc
│   └── sss_bob_descending.nc
├── ssh/
│   └── ssh_bob.nc
├── currents/
│   └── currents_bob.nc
└── winds/
    └── winds_bob.nc
```

You can inspect the raw data:

```bash
python src/preprocessing/inspect_raw.py
```

---

## 3. Preprocessing Pipeline

### What it Does

The preprocessing pipeline transforms raw NetCDF downloads into model-ready tensors through 17 stages:

```text
RAW NETCDF
    ↓
1.  Load with xarray
2.  Normalize coordinate names
3.  Sort coordinates ascending
4.  Convert units (SST: Kelvin → Celsius)
5.  Quality control (range checks, fill values)
6.  Build observation masks
7.  Combine SSS ascending + descending
8.  Horizontal regridding to 0.25° (60 × 80)
9.  GLORYS vertical interpolation (36 → 15 depths)
10. Time alignment
11. Conservative gap filling (NaN → 0, masks preserved)
12. Assemble input tensor
    ↓
MODEL-READY DATA
    X = (T, 7, 60, 80)    — surface inputs
    Y = (T, 15, 60, 80)   — subsurface targets
    M = observation masks
```

### Run the Pipeline

```bash
python -m src.preprocessing.pipeline
```

Or programmatically:

```python
from src.preprocessing.pipeline import run_pipeline

X, Y, masks = run_pipeline()
```

### Output

The pipeline saves three files to `data/processed/`:

| File | Shape | Description |
|---|---|---|
| `inputs.nc` | `(T, 7, 60, 80)` | Surface observations |
| `targets.nc` | `(T, 15, 60, 80)` | GLORYS subsurface temperature |
| `masks.nc` | various | Observation validity masks |

Plus `preprocessing_report.json` with diagnostics.

### Input Channels

| Index | Channel | Variable | Units |
|---|---|---|---|
| 0 | SST | Sea Surface Temperature | °C |
| 1 | SSS | Sea Surface Salinity | PSU |
| 2 | SSH | Sea Level Anomaly | m |
| 3 | Current U | Eastward current | m/s |
| 4 | Current V | Northward current | m/s |
| 5 | Wind U | Eastward wind | m/s |
| 6 | Wind V | Northward wind | m/s |

### Target Depths

```text
0, 5, 10, 20, 30, 50, 75, 100, 125, 150, 200, 300, 500, 700, 1000 m
```

### Missing Data Strategy

Missing observations are **not blindly filled with zeros**. The pipeline:

1. Records which cells were originally observed (validity masks)
2. Fills NaN with 0.0 in the input tensor
3. Provides masks as a separate tensor so the model knows what was real

The training loss uses these masks to ignore invalid target positions.

---

## 4. Training Configuration

All training settings are in `configs/prototype.yaml`:

```yaml
training:
  # Model architecture
  model: "cnn"              # "cnn" or "cnn_lite"
  base_filters: 64

  # Optimizer
  learning_rate: 0.001
  weight_decay: 0.00001

  # Schedule
  epochs: 100
  batch_size: 8
  early_stop_patience: 15

  # Spatial patching
  patch_size: 32             # 32×32 patches, or null for full field

  # Temporal split
  train_years: [2020, 2023]
  val_years: [2024, 2024]
  test_years: [2025, 2025]
```

### Key Parameters

| Parameter | Default | Notes |
|---|---|---|
| `model` | `"cnn"` | Use `"cnn_lite"` for faster experimentation |
| `base_filters` | `64` | Reduce to 32 for smaller GPU memory |
| `learning_rate` | `0.001` | AdamW optimizer |
| `batch_size` | `8` | Reduce if GPU OOM |
| `patch_size` | `32` | Set to `null` for full 60×80 field |
| `epochs` | `100` | Early stopping may terminate sooner |

### Train / Validation / Test Split

The split is **chronological** to prevent temporal leakage:

```text
Train:      2020–2023 (4 years)
Validation: 2024      (1 year)
Test:       2025      (1 year)
```

> Do not randomly split grid cells — nearby cells and dates are highly correlated.

---

## 5. Training the Model

### Run Training

```bash
python -m src.training.train configs/prototype.yaml
```

### What Happens

1. Loads processed data from `data/processed/`
2. Splits by year (train/val/test)
3. Extracts spatial patches during training
4. Trains with masked MSE loss (ignores NaN targets)
5. Monitors validation loss, reduces LR on plateau
6. Saves best model checkpoint
7. Early stops if no improvement

### Output

```text
outputs/
├── checkpoints/
│   ├── best_model.pt           ← best model weights
│   └── training_history.json   ← per-epoch metrics
└── logs/
    └── events.out.tfevents.*   ← TensorBoard logs
```

### Monitor Training

```bash
tensorboard --logdir outputs/logs
```

### Quick Experiment (Lite Model)

For fast debugging, use the lightweight model:

```yaml
# In configs/prototype.yaml
training:
  model: "cnn_lite"
  epochs: 10
  batch_size: 16
```

---

## 6. Evaluation

### Run Evaluation

```bash
python -m src.training.evaluate outputs/checkpoints/best_model.pt
```

### Output

The evaluation produces:
- **Overall metrics**: RMSE, MAE, Bias, Correlation
- **Per-depth metrics**: breakdown at each of the 15 target depths
- Results saved to `outputs/evaluation/test_results.json`

### Example Output

```text
ANTARBODH Test Evaluation Results
============================================================
Overall RMSE:  1.2345 °C
Overall MAE:   0.9876 °C
Overall Bias:  0.0123 °C
Overall Corr:  0.9456

   Depth      RMSE       MAE      Bias      Corr
--------------------------------------------
      0m    0.3456    0.2345    0.0123    0.9912
      5m    0.3567    0.2456    0.0134    0.9901
    ...
   1000m    2.1234    1.6789    0.1234    0.8234
```

### Understanding Results

- **RMSE increases with depth** — deeper levels are harder to predict
- **Bias** should be near zero — systematic over/under-prediction
- **Correlation** measures spatial pattern accuracy
- Compare against GLORYS first, then against independent Argo profiles

---

## 7. Model Architecture

### Stage 2: CNN Baseline (`AntarBodhCNN`)

```text
Input (B, 7, H, W)
        │
        ▼
    Encoder 1: Conv3×3 → BN → ReLU → Conv3×3 → BN → ReLU  (64 filters)
        │
        ▼
    Encoder 2: Conv3×3 → BN → ReLU → Conv3×3 → BN → ReLU  (128 filters)
        │
        ▼
    Encoder 3: Conv3×3 → BN → ReLU → Conv3×3 → BN → ReLU  (256 filters)
        │
        ▼
    Bottleneck: Conv3×3 → BN → ReLU → Conv3×3 → BN → ReLU  (256 filters)
        │
        ▼
    Decoder 3 + Skip from Enc3  (128 filters)
        │
        ▼
    Decoder 2 + Skip from Enc2  (64 filters)
        │
        ▼
    Decoder 1 + Skip from Enc1  (64 filters)
        │
        ▼
    Prediction Head: Conv1×1 → ReLU → Conv1×1
        │
        ▼
Output (B, 15, H, W)
```

- No spatial downsampling (preserves H×W throughout)
- Skip connections preserve fine spatial details
- ~4.5M trainable parameters

### Lite Variant (`AntarBodhCNNLite`)

A simpler 5-layer sequential CNN for fast experimentation (~85K parameters).

### Loss Function

**Masked MSE Loss**: only computes error where the GLORYS target is valid.

```python
loss = ((pred - target)² × mask).sum() / mask.sum()
```

This prevents the model from being penalized for predicting values at
land/bathymetry/missing-data positions.

---

## 8. Training Data Format

### Surface Inputs — `X`

```text
Shape:    (time, 7, 60, 80)
Type:     float32
Missing:  filled with 0.0 (masks indicate original availability)
```

### Subsurface Targets — `Y`

```text
Shape:    (time, 15, 60, 80)
Type:     float32
Missing:  filled with 0.0 (mask prevents loss computation here)
```

### Observation Masks — `M`

```text
5 mask variables (SST, SSS, SSH, current, wind)
Values:  1.0 = originally observed, 0.0 = missing
```

### Coordinate Grid

```text
Latitude:  5.125° → 19.875°N  (60 points, 0.25° spacing)
Longitude: 80.125° → 99.875°E (80 points, 0.25° spacing)
```

---

## 9. Progressive Development

Follow this order — do not jump ahead:

### Stage 0: Data Pipeline ← **YOU ARE HERE**

```text
✓ Download raw datasets
✓ Run preprocessing pipeline
✓ Verify X and Y shapes
✓ Inspect preprocessed data
```

### Stage 1: Simple Baselines

```text
→ Climatology baseline (predict from location/month)
→ Linear/Ridge regression baseline
→ Establish: "does deep learning add value?"
```

### Stage 2: CNN Baseline

```text
→ Train AntarBodhCNN
→ Evaluate vs GLORYS
→ Per-depth error analysis
```

### Stage 3: Add SSS

```text
→ 6-channel vs 7-channel ablation
→ Does SSS improve subsurface prediction?
```

### Stage 4: Temporal Modelling

```text
→ Use t-2, t-1, t as input sequence
→ CNN + LSTM or CNN + Transformer
```

### Stage 5: Physics-Aware Learning

```text
→ Vertical gradient regularization
→ Profile smoothness constraints
→ Thermocline diagnostics
```

### Stage 6: Uncertainty Estimation

```text
→ Ensemble methods or MC dropout
→ Distinguish high/low confidence predictions
```

---

## 10. Troubleshooting

### "Raw data file not found"

Run the download scripts first:

```bash
copernicusmarine login
python src/download/glorys.py
python src/download/sst.py
# ... etc.
```

### GPU Out of Memory

Reduce batch size and/or patch size:

```yaml
training:
  batch_size: 4
  patch_size: 16
```

Or use the lite model:

```yaml
training:
  model: "cnn_lite"
```

### "No module named 'src.preprocessing'"

Run from the repository root:

```bash
cd Antarbodh-demo
python -m src.preprocessing.pipeline
```

### Very High Loss / NaN Loss

Check that:
1. Raw data downloaded successfully (`python src/preprocessing/inspect_raw.py`)
2. SST was converted from Kelvin to Celsius
3. Target masks are not all zero

### Slow Training

- Use GPU (`torch.cuda.is_available()` should return `True`)
- Enable patch-based training (`patch_size: 32`)
- Reduce `base_filters` to 32
- Use `cnn_lite` model for debugging

### Missing xESMF

xESMF is optional. The pipeline uses `xarray.interp()` by default. For production:

```bash
conda install -c conda-forge xesmf
```

---

## Project Principle

> **GLORYS teaches the model; ARGO/INCOIS tests whether it learned the real ocean.**

AntarBodh is a **data-driven complementary reconstruction framework**, not a replacement for GLORYS. The most important validation is independent comparison against observed Argo profiles.
