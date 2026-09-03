# AntarBodh

## AI-Powered Subsurface Ocean Intelligence

> **Understanding the Ocean Beneath the Surface**

AntarBodh is a deep-learning framework for reconstructing **subsurface ocean temperature profiles from surface observations** over the North Indian Ocean.

The project is designed around the SIH problem requirement of producing daily, 0.25° × 0.25° subsurface temperature information at **15 standard depths from 0 m to 1000 m**.

---

# 1. Clone the Repository

The repository is currently intended to remain **private** during development.

## Prerequisites

- Git
- Python 3.10+ recommended
- A GitHub account with access to the private repository
- Sufficient local storage for downloaded ocean datasets
- Internet access for downloading public oceanographic datasets

## Clone

```bash
git clone https://github.com/<YOUR-USERNAME>/antarbodh.git
cd antarbodh
```

## Create a virtual environment

### macOS / Linux

```bash
python3 -m venv .venv
source .venv/bin/activate
```

### Windows

```powershell
python -m venv .venv
.venv\Scripts\activate
```

## Install dependencies

```bash
pip install -r requirements.txt
```

## Verify the repository

```bash
git status
```

You should see a clean working tree after the initial clone.

> **Important:** The repository does not contain the large ocean datasets. Dataset directories are excluded through `.gitignore`. Dataset access/download scripts and documentation will explain how to obtain the required public data.

---

# 2. What the AntarBodh Demo Does

The first AntarBodh demo is deliberately smaller than the complete SIH target.

## Demo Region

We will initially target a **Bay of Bengal subset**:

```text
Latitude:   5°N – 20°N
Longitude:  80°E – 100°E
```

This region will be used to build and debug the complete data pipeline before scaling to the full North Indian Ocean.

## Demo Resolution

```text
Spatial resolution: 0.25° × 0.25°
Temporal resolution: Daily
```

## Demo Inputs

The first model will use:

1. Sea Surface Temperature (SST)
2. Sea Surface Height / Sea Level Anomaly (SSH/SLA)
3. Surface current U component
4. Surface current V component
5. Surface wind U component
6. Surface wind V component

**Sea Surface Salinity (SSS)** will be added after the initial six-channel pipeline is stable.

## Demo Target

The target is GLORYS subsurface temperature at:

```text
0 m
5 m
10 m
20 m
30 m
50 m
75 m
100 m
125 m
150 m
200 m
300 m
500 m
700 m
1000 m
```

## Demo Flow

```text
Surface observations
        │
        ├── SST
        ├── SSH/SLA
        ├── U/V currents
        └── U/V winds
        │
        ▼
Data QC + harmonization
        │
        ▼
Daily 0.25° common grid
        │
        ▼
AntarBodh CNN
        │
        ▼
15-depth temperature profile
        │
        ├──────────────► GLORYS comparison
        │
        └──────────────► ARGO/INCOIS validation
                              │
                              ▼
                     RMSE / MAE / Bias / R
                              │
                              ▼
                         Demo dashboard
```

---

# 3. What the Demo Is Trying to Prove

The demo is **not** trying to prove that AntarBodh replaces GLORYS.

GLORYS is used as the large-scale supervised training reference.

The scientific hypothesis is:

> **Surface ocean observations contain enough information about the ocean state for a deep-learning model to learn useful information about subsurface temperature.**

Therefore:

```text
GLORYS
   ↓
provides training target
   ↓
AntarBodh learns
surface → subsurface relationship
   ↓
surface observations
   ↓
AntarBodh prediction
   ↓
independent ARGO/INCOIS observations
```

The most important validation is therefore independent comparison against observed ARGO/INCOIS profiles rather than only measuring how well the model reproduces GLORYS.

---

# 4. Dataset Architecture

AntarBodh integrates multiple public ocean datasets.

## Training Reference

### GLORYS12V1

Used primarily to provide the **subsurface temperature training target**.

We will extract temperature, vertically map it to the 15 requested standard depths, and horizontally regrid it to the common 0.25° grid.

---

## Surface Inputs

### SST

Sea Surface Temperature.

### SSH / SLA

Sea Surface Height / Sea Level Anomaly.

### Surface Currents

Eastward and northward surface current components:

```text
U-current
V-current
```

### Surface Winds

Eastward and northward wind components:

```text
U-wind
V-wind
```

### SSS — Later Stage

Sea Surface Salinity will be introduced after the initial six-channel pipeline is working.

---

## Independent Validation

### Global ARGO

Provides observed temperature/salinity profiles from profiling floats.

### INCOIS ARGO

Provides regional Indian Ocean/Indian Argo observations and will be especially useful for regional validation.

---

## Climatological Baseline

### WOA23

World Ocean Atlas 2023 will be used for climatological comparisons, anomaly analysis and sanity checks.

---

# 5. Data Integration Pipeline

All gridded datasets must ultimately be transformed into a common representation.

## Step 1 — Download

Download only the required variables and geographic/time subset whenever possible.

Do not download unnecessary global data when a regional subset is available.

---

## Step 2 — Raw Data Storage

Original downloaded files are placed under:

```text
data/raw/
```

The raw files are **not committed to GitHub**.

They should remain unchanged so the processing pipeline can be reproduced.

---

## Step 3 — Metadata Audit

For every dataset we record:

- Variable names
- Units
- Latitude/longitude coordinates
- Time convention
- Native resolution
- Missing-value representation
- Quality-control flags
- Coverage
- Vertical levels where applicable

---

## Step 4 — Spatial Harmonization

Every gridded surface product is:

```text
crop
  ↓
5–20°N
80–100°E
  ↓
regrid
  ↓
0.25° × 0.25°
```

Longitude conventions are standardized before joining datasets.

---

## Step 5 — Temporal Harmonization

All gridded inputs are converted to a common daily time axis.

Where an input product is available at a higher temporal frequency, a documented daily aggregation is applied.

The project will use a consistent UTC-based daily convention.

---

## Step 6 — Quality Control

The pipeline will:

- Apply provider QC/status flags
- Remove physically invalid values
- Preserve missing-data information
- Create validity masks
- Record coverage statistics

Missing observations will **not** automatically be replaced with zero.

---

## Step 7 — GLORYS Target Construction

GLORYS temperature is transformed from its native representation into the required target:

```text
GLORYS native temperature
        ↓
vertical interpolation
        ↓
15 standard depths
        ↓
horizontal regridding
        ↓
0.25° × 0.25°
        ↓
daily target
```

---

## Step 8 — Surface Input Assembly

The surface variables are joined using:

```text
(date, latitude, longitude)
```

The initial input tensor contains:

```text
X =
[
    SST,
    SSH/SLA,
    U-current,
    V-current,
    U-wind,
    V-wind
]
```

Later:

```text
X =
[
    SST,
    SSS,
    SSH/SLA,
    U-current,
    V-current,
    U-wind,
    V-wind
]
```

---

## Step 9 — Normalization

Each input channel is normalized independently.

Statistics such as mean and standard deviation are calculated **only from the training period**.

Validation and test data use the training statistics.

This prevents information leakage.

---

## Step 10 — Sample Generation

Instead of loading the entire ocean region into GPU memory, training samples will be generated as spatial patches.

Example:

```text
32 × 32 cells
```

or

```text
64 × 64 cells
```

The exact patch size will be selected after inspecting the data and model memory requirements.

---

# 6. Exploratory Data Analysis

EDA will happen before serious model training.

## Surface Data EDA

For every surface variable:

### Distribution

- Mean
- Median
- Standard deviation
- Minimum/maximum
- Percentiles
- Histograms
- Extreme values

### Spatial

- Mean maps
- Standard-deviation maps
- Seasonal maps
- Coverage maps
- Missing-data maps

### Temporal

- Daily time series
- Monthly climatology
- Seasonal cycle
- Anomaly time series

---

# 7. Cross-Variable EDA

We will investigate whether surface variables contain useful information about subsurface structure.

Examples:

```text
SST ↔ subsurface temperature
SSH/SLA ↔ subsurface temperature
SSS ↔ subsurface temperature
currents ↔ subsurface temperature
winds ↔ subsurface temperature
```

We will calculate:

- Correlation matrices
- Scatter plots
- Depth-wise correlations
- Seasonal correlations
- Regional correlations
- Lagged relationships

This helps determine which variables are informative before building a complex model.

---

# 8. Vertical Ocean EDA

GLORYS target temperature will be analysed at:

```text
0 m
50 m
100 m
200 m
300 m
500 m
700 m
1000 m
```

and ultimately all 15 target depths.

We will examine:

- Mean temperature profiles
- Temperature variance with depth
- Seasonal vertical structure
- Latitude-depth sections
- Regional profiles
- Thermocline behaviour
- Depth-dependent predictability

This is important because the difficulty of reconstruction is expected to change with depth.

---

# 9. ARGO EDA

Before using ARGO for final validation, we will analyse:

- Float locations
- Sampling density
- Observation depths
- Temperature distributions
- Seasonal coverage
- Regional coverage
- Quality-control flags

We will also calculate a **GLORYS-vs-ARGO baseline**.

This tells us how closely the training reference itself represents independent observations.

---

# 10. Model Development Roadmap

We will not begin with a large Transformer.

The model will be developed progressively.

## Stage 0 — Data Pipeline

```text
Public datasets
      ↓
QC
      ↓
Regridding
      ↓
Time alignment
      ↓
Common tensor
```

### Goal

> Produce one clean `(X, Y)` training sample.

---

## Stage 1 — Simple Baselines

### Climatology

Predict temperature from location/month.

### Linear / Ridge

Use surface variables to predict the 15-depth temperature profile.

These establish whether deep learning is actually adding value.

---

## Stage 2 — AntarBodh CNN Baseline

Initial architecture:

```text
Input
6 × H × W
      ↓
Conv2D
      ↓
Conv2D
      ↓
Conv2D
      ↓
Feature representation
      ↓
Depth decoder
      ↓
15 × H × W
```

The model predicts temperature simultaneously at all 15 depths.

---

## Stage 3 — Add SSS

The input becomes seven channels:

```text
SST
SSS
SSH/SLA
U-current
V-current
U-wind
V-wind
```

Compare performance against the six-channel model.

This becomes an ablation experiment.

---

## Stage 4 — Temporal Modelling

Instead of using only one day's surface state:

```text
t
```

use a sequence such as:

```text
t-2
t-1
t
```

or a longer temporal window if justified.

Possible models:

- CNN + LSTM
- CNN + Transformer
- Spatiotemporal Transformer

The exact model will be selected after the baseline CNN is established.

---

## Stage 5 — Physics-Aware Learning

If implemented, physical constraints/losses can be introduced.

Possible components include:

- Vertical gradient regularization
- Profile smoothness constraints
- Physical plausibility checks
- Thermocline-related diagnostics

The physics-aware model must be compared against the non-physics baseline.

> Until an actual physical constraint is implemented, the project should describe this as **physics-aware representation learning**, not simply claim that the model is physics-guided.

---

## Stage 6 — Uncertainty

Later versions can estimate uncertainty so the system can distinguish:

```text
High-confidence prediction
```

from:

```text
Low-confidence prediction
```

This is especially important in areas with sparse observations or poor surface-data coverage.

---

# 11. Train / Validation / Test Strategy

Randomly splitting individual grid cells is discouraged because nearby cells and nearby dates can be highly correlated.

The primary split will be chronological.

Example:

```text
Earlier period
     ↓
TRAIN

Later period
     ↓
VALIDATION

Latest period
     ↓
TEST
```

Additional geographic holdout experiments can test whether the model generalizes to unseen parts of the Bay of Bengal.

---

# 12. Independent ARGO Validation

For every suitable ARGO profile:

```text
ARGO observation
      │
      ├── date
      ├── latitude
      ├── longitude
      └── observed depths
              │
              ▼
        find matching
        AntarBodh output
              │
              ▼
      vertical interpolation
              │
              ▼
      compare temperature
```

Metrics:

```text
RMSE
MAE
Bias
Correlation
```

Results will be reported:

- By depth
- By region
- By season
- By data coverage
- With number of matched observations/profiles

---

# 13. Evaluation Philosophy

There will be two different questions.

## Question 1

### How well does AntarBodh reproduce the GLORYS target?

This measures supervised reconstruction performance.

## Question 2

### How well does AntarBodh agree with independent ARGO observations?

This is more important for establishing real-world credibility.

Therefore results should not be presented as:

```text
AntarBodh vs GLORYS
```

alone.

Instead:

```text
GLORYS → training reference

AntarBodh → prediction

ARGO/INCOIS → independent observation
```

---

# 14. Demo Output

The eventual demo interface will show:

## A. Surface Inputs

Maps for:

```text
SST
SSS
SSH/SLA
U/V currents
U/V winds
```

---

## B. Reconstructed Subsurface Temperature

Interactive depth selection:

```text
0 m
5 m
10 m
20 m
30 m
50 m
75 m
100 m
125 m
150 m
200 m
300 m
500 m
700 m
1000 m
```

---

## C. Vertical Profile

For a selected location:

```text
Temperature
    │
0 m ├────────
    │
50m ├───────
    │
100m├──────
    │
200m├─────
    │
500m├───
    │
1000├──
    └────────────
```

The exact visualization will be developed after the model works.

---

## D. Validation

Display:

```text
AntarBodh
    vs
ARGO
```

with:

```text
RMSE
MAE
Bias
Correlation
```

---

# 15. Scaling Roadmap

The project will scale in stages.

```text
Stage 1
Bay of Bengal subset
5–20°N, 80–100°E
        ↓
Stage 2
Full Bay of Bengal
        ↓
Stage 3
Full North Indian Ocean
5–30°N, 45–105°E
        ↓
Stage 4
Temporal modelling
        ↓
Stage 5
Physics-aware learning
        ↓
Stage 6
Uncertainty estimation
        ↓
Stage 7
Operational-style dashboard
```

The geographic region should be stored in configuration files so the code does not need to be rewritten when scaling.

---

# 16. Repository Structure

```text
antarbodh/
│
├── README.md
├── .gitignore
├── requirements.txt
│
├── configs/
│   └── prototype.yaml
│
├── data/
│   ├── raw/
│   ├── interim/
│   ├── processed/
│   └── validation/
│
├── notebooks/
│   ├── 01_data_access.ipynb
│   └── 02_data_audit.ipynb
│
├── src/
│   ├── download/
│   ├── preprocessing/
│   └── qc/
│
├── outputs/
│   └── figures/
│
└── docs/
```

---

# 17. Folder Responsibilities

## `README.md`

The project entry point.

Contains:

- Project description
- Demo scope
- Dataset architecture
- Pipeline
- Setup instructions
- Roadmap
- Usage instructions

---

## `.gitignore`

Prevents large datasets, credentials, environments, checkpoints and temporary files from being committed.

Large ocean datasets remain outside GitHub.

---

## `requirements.txt`

Contains Python dependencies required to run the project.

---

# `configs/`

Contains configuration rather than hard-coding parameters throughout the code.

### `prototype.yaml`

Defines the first Bay of Bengal experiment:

```text
Region
Resolution
Depth levels
Time period
Input variables
Paths
Training settings
```

---

# `data/`

This directory is for local data only.

## `data/raw/`

Original downloaded datasets.

```text
data/raw/
├── glorys/
├── sst/
├── sss/
├── ssh/
├── currents/
├── winds/
└── argo/
```

Never modify the raw files.

---

## `data/interim/`

Data after intermediate operations such as:

```text
cropping
QC
regridding
temporal aggregation
```

---

## `data/processed/`

Final model-ready datasets.

Example:

```text
inputs/
targets/
masks/
```

---

## `data/validation/`

ARGO/INCOIS profiles and collocated validation products.

---

# `notebooks/`

Notebooks are for exploration, visualization and experiments.

## `01_data_access.ipynb`

First objective:

> Successfully access and inspect one small sample from every required dataset.

Check:

- Coordinates
- Variables
- Units
- Time
- Spatial coverage
- Example maps

---

## `02_data_audit.ipynb`

Checks whether datasets can actually be integrated.

Includes:

- Missing values
- Coverage
- Resolution
- Time overlap
- QC
- Units
- Coordinate consistency

Additional EDA notebooks will be added after the initial pipeline is working.

---

# `src/`

This contains reusable project code.

## `src/download/`

Dataset download/access scripts.

Examples:

```text
glorys.py
sst.py
sss.py
ssh.py
currents.py
winds.py
argo.py
```

These scripts should download/subset data rather than requiring datasets to be stored in GitHub.

---

## `src/preprocessing/`

Responsible for transforming raw data.

Examples:

```text
crop.py
regrid.py
temporal.py
normalize.py
assemble.py
```

---

## `src/qc/`

Quality-control functions.

Examples:

```text
satellite_qc.py
glorys_qc.py
argo_qc.py
```

---

# `outputs/`

Generated project results.

## `outputs/figures/`

Stores useful EDA and model-result figures.

Examples:

```text
coverage maps
SST maps
GLORYS depth maps
temperature profiles
error plots
validation plots
```

Large bulk outputs should not be committed.

---

# `docs/`

Project documentation beyond the main README.

Planned documents:

```text
DATA_PIPELINE.md
EDA.md
MODEL.md
VALIDATION.md
```

These will contain technical details as the project develops.

---

# 18. GitHub Data Policy

The GitHub repository will contain:

```text
✓ Source code
✓ Configuration
✓ Notebooks
✓ Documentation
✓ Small example files
✓ Reproducible download/processing scripts
✓ Figures and selected results
```

The repository will not contain:

```text
✗ Multi-GB raw datasets
✗ Large processed datasets
✗ ARGO archives
✗ GLORYS archives
✗ Model checkpoints
✗ API credentials
✗ Secrets
```

The large datasets remain locally or in appropriate external/cloud storage.

---

# 19. First Development Milestone

Before building the neural network, the first milestone is:

> **Create one clean, reproducible daily sample containing aligned surface observations and a 15-depth GLORYS target on the 0.25° Bay of Bengal grid.**

The pipeline should successfully produce:

```text
X:
surface variables
      ↓
[H × W × channels]

Y:
subsurface temperature
      ↓
[15 × H × W]
```

Once this works, EDA and baseline modelling can begin.

---

# 20. Immediate Development Order

Follow this order rather than building everything simultaneously:

```text
1. GitHub repository
        ↓
2. Python environment
        ↓
3. prototype.yaml
        ↓
4. Dataset access
        ↓
5. One-day data test
        ↓
6. Metadata audit
        ↓
7. Crop Bay of Bengal
        ↓
8. QC
        ↓
9. Regrid to 0.25°
        ↓
10. Daily temporal alignment
        ↓
11. GLORYS 15-depth target
        ↓
12. Surface + target assembly
        ↓
13. EDA
        ↓
14. Train/validation/test split
        ↓
15. Climatology baseline
        ↓
16. Ridge/linear baseline
        ↓
17. CNN baseline
        ↓
18. ARGO/INCOIS validation
        ↓
19. Add SSS
        ↓
20. Add temporal modelling
        ↓
21. Add physics-aware learning
        ↓
22. Add uncertainty
        ↓
23. Scale to North Indian Ocean
        ↓
24. Build dashboard
```

---

# 21. Current Status

**Current project stage: Data pipeline setup**

```text
✓ AntarBodh concept
✓ GitHub repository structure
✓ Private repository strategy
✓ Dataset architecture
✓ Bay of Bengal prototype scope
✓ Data pipeline design
✓ EDA plan
✓ Model roadmap

→ NEXT:
   Configure prototype.yaml
        ↓
   Set up data-access scripts
        ↓
   Download first small dataset samples
        ↓
   Perform data audit
```

---

# 22. Project Principle

> **GLORYS teaches the model; ARGO/INCOIS tests whether it learned the real ocean.**

AntarBodh is therefore positioned as a **data-driven complementary reconstruction framework**, not simply a replacement for an existing ocean reanalysis.

---

# Official Data Sources

The project uses publicly available oceanographic datasets.

Dataset access and licensing/usage conditions should always be checked on the provider's current official page before downloading or redistributing data.

- Copernicus Marine Data Store
- GLORYS12V1
- Copernicus Global SST
- Copernicus Sea Surface Salinity
- Copernicus Global Sea Level
- Copernicus Global Currents
- Copernicus Scatterometer Winds
- Global Argo / Argo GDAC
- INCOIS Argo
- NOAA World Ocean Atlas 2023