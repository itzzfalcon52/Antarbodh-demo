# ANTARBODH — Copernicus Marine Data Access & Download Guide

This section documents the workflow used to access Copernicus Marine data, identify the correct product/dataset/variable, test a subset, and store downloaded files in the ANTARBODH `data/` structure.

> **Git rule:** Raw/large scientific datasets must not be committed to GitHub. Keep them local or in external/cloud storage. The repository should contain code, configuration, documentation, and small reproducible test artifacts.

## 1. Set up the Python environment

From the repository root:

```bash
python3 -m venv .venv
source .venv/bin/activate
python --version
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Verify Copernicus Marine:

```bash
copernicusmarine --help
copernicusmarine --version
```

## 2. Configure Copernicus Marine credentials

Use the toolbox login:

```bash
copernicusmarine login
```

Alternatively, credentials can be supplied through environment variables:

```bash
export COPERNICUSMARINE_SERVICE_USERNAME="YOUR_USERNAME"
export COPERNICUSMARINE_SERVICE_PASSWORD="YOUR_PASSWORD"
```

Never place real credentials in source code, README files, commits, or public repositories.

## 3. Create the data directories

ANTARBODH uses:

```text
data/
├── raw/
│   ├── glorys/
│   ├── sst/
│   ├── sss/
│   ├── ssh/
│   ├── currents/
│   │   ├── u/
│   │   └── v/
│   ├── winds/
│   │   ├── u/
│   │   └── v/
│   └── argo/
├── interim/
│   ├── glorys/
│   ├── surface/
│   └── argo/
├── processed/
│   ├── inputs/
│   └── targets/
└── validation/
```

Create them with:

```bash
mkdir -p data/raw/glorys data/raw/sst data/raw/sss data/raw/ssh
mkdir -p data/raw/currents/u data/raw/currents/v
mkdir -p data/raw/winds/u data/raw/winds/v data/raw/argo
mkdir -p data/interim/glorys data/interim/surface data/interim/argo
mkdir -p data/processed/inputs data/processed/targets data/validation
```

### Folder meaning

| Folder | Purpose |
|---|---|
| `data/raw/` | Original downloads; do not modify |
| `data/interim/` | Intermediate QC, interpolation, regridding, alignment |
| `data/processed/` | Final ML-ready `X` and `Y` |
| `data/validation/` | Validation-ready ARGO/INCOIS data |

## 4. Find a Copernicus dataset

Do **not** guess dataset IDs or variable names.

Run:

```bash
copernicusmarine describe > copernicus_catalogue.txt
```

Search the saved catalogue instead of scrolling through the terminal:

```bash
grep -n -i "GLORYS" copernicus_catalogue.txt
```

Search for a product:

```bash
grep -n -i "GLOBAL_MULTIYEAR_PHY_001_030" copernicus_catalogue.txt
```

Search for a variable:

```bash
grep -n -i "potential_temperature" copernicus_catalogue.txt
```

Show surrounding lines:

```bash
grep -n -i -C 10 "GLORYS12V1" copernicus_catalogue.txt
```

For each dataset, record:

1. Product ID
2. Dataset ID
3. Dataset version
4. Dataset part
5. Variable name(s)
6. Variable description
7. Units
8. Horizontal resolution
9. Temporal resolution
10. Vertical/depth coverage
11. Time coverage

## 5. Check the subset syntax

Before writing a download command:

```bash
copernicusmarine subset --help
```

Useful options include:

```text
--dataset-id
--variable
--minimum-longitude
--maximum-longitude
--minimum-latitude
--maximum-latitude
--minimum-depth
--maximum-depth
--start-datetime
--end-datetime
--output-directory
--output-filename
--file-format
--netcdf-compression-level
--dry-run
```

## 6. ANTARBODH prototype domain

Do not initially download the entire North Indian Ocean.

Prototype region:

```text
Latitude:  5°N – 20°N
Longitude: 80°E – 100°E
```

This is the initial Bay of Bengal prototype.

First test period:

```text
2020-01-01 → 2020-01-03
```

The three-day test is used to verify authentication, dataset selection, variables, coordinates, file output, and preprocessing before scaling.

## 7. Always perform a dry run first

Example:

```bash
copernicusmarine subset   --dataset-id <DATASET_ID>   --variable <VARIABLE>   --start-datetime 2020-01-01   --end-datetime 2020-01-03   --minimum-longitude 80   --maximum-longitude 100   --minimum-latitude 5   --maximum-latitude 20   --minimum-depth <MIN_DEPTH>   --maximum-depth <MAX_DEPTH>   --output-directory data/raw/<DATASET_FOLDER>   --output-filename <OUTPUT_NAME>   --file-format netcdf   --netcdf-compression-level 4   --dry-run
```

If the request is valid, remove `--dry-run` and run it again.

## 8. GLORYS example

The GLORYS product is:

```text
Product ID:
GLOBAL_MULTIYEAR_PHY_001_030
```

The daily dataset used for the prototype:

```text
cmems_mod_glo_phy_my_0.083deg_P1D-m
```

Temperature variable:

```text
thetao
```

`thetao` is sea-water potential temperature.

### GLORYS prototype download

Create the folder:

```bash
mkdir -p data/raw/glorys
```

Dry run:

```bash
copernicusmarine subset   --dataset-id cmems_mod_glo_phy_my_0.083deg_P1D-m   --variable thetao   --start-datetime 2020-01-01   --end-datetime 2020-01-03   --minimum-longitude 80   --maximum-longitude 100   --minimum-latitude 5   --maximum-latitude 20   --minimum-depth 0   --maximum-depth 1100   --output-directory data/raw/glorys   --output-filename glorys_bob_test   --file-format netcdf   --netcdf-compression-level 4   --dry-run
```

Actual download:

```bash
copernicusmarine subset   --dataset-id cmems_mod_glo_phy_my_0.083deg_P1D-m   --variable thetao   --start-datetime 2020-01-01   --end-datetime 2020-01-03   --minimum-longitude 80   --maximum-longitude 100   --minimum-latitude 5   --maximum-latitude 20   --minimum-depth 0   --maximum-depth 1100   --output-directory data/raw/glorys   --output-filename glorys_bob_test   --file-format netcdf   --netcdf-compression-level 4
```

> The first successful test used `--maximum-depth 1000`. GLORYS native coordinates in that extraction reached about 902.3 m, so the request produced a warning. For the proper 1000 m target, request deeper native levels (for example 1100 m) and interpolate to 1000 m rather than extrapolating.

## 9. Verify every downloaded file

List the files:

```bash
ls -lh data/raw/glorys/
```

Inspect a NetCDF file:

```bash
python -c "import xarray as xr; ds=xr.open_dataset('data/raw/glorys/glorys_bob_test.nc'); print(ds)"
```

Inspect variables, dimensions, coordinates, and time:

```bash
python -c "import xarray as xr; ds=xr.open_dataset('data/raw/glorys/glorys_bob_test.nc'); print('VARIABLES:', list(ds.data_vars)); print('DIMS:', ds.dims); print('DEPTH:', ds.depth.values); print('LAT:', ds.latitude.values[:5], '...', ds.latitude.values[-5:]); print('LON:', ds.longitude.values[:5], '...', ds.longitude.values[-5:]); print('TIME:', ds.time.values)"
```

Confirm that the returned dataset matches the requested region, period, variables, and depth range.

## 10. Planned surface datasets

The intended ANTARBODH input channels are:

| Channel | Quantity | Raw folder |
|---|---|---|
| 0 | SST | `data/raw/sst/` |
| 1 | SSS | `data/raw/sss/` |
| 2 | SSH/SLA | `data/raw/ssh/` |
| 3 | Surface current U | `data/raw/currents/u/` |
| 4 | Surface current V | `data/raw/currents/v/` |
| 5 | Surface wind U | `data/raw/winds/u/` |
| 6 | Surface wind V | `data/raw/winds/v/` |

For each product, first run `copernicusmarine describe`, identify the exact dataset ID and variable names, then perform a three-day prototype download.

### Planned Copernicus products

- SST: Copernicus Marine ODYSSEA global SST
- SSS: Copernicus Marine SMOS CATDS SSS
- SSH/SLA: Copernicus Marine global sea-level product
- Surface currents: Copernicus Marine GLOBCURRENT
- Surface winds: Copernicus Marine daily scatterometer winds

Official product pages should be recorded in the corresponding dataset documentation.

## 11. Dataset-specific documentation

Create one `.md` file for each dataset, for example:

```text
docs/data/
├── glorys.md
├── sst.md
├── sss.md
├── ssh.md
├── currents.md
├── winds.md
└── argo.md
```

Use this template:

```markdown
# <DATASET NAME>

## Purpose

Why ANTARBODH uses this dataset.

## Source

- Provider:
- Product:
- Product ID:
- Dataset ID:
- Dataset version:
- Dataset part:
- Official product page:

## Variables

| Variable | Description | Unit |
|---|---|---|
| `<variable>` | `<description>` | `<unit>` |

## Native Resolution

- Horizontal:
- Temporal:
- Vertical:

## Coverage

- Latitude:
- Longitude:
- Time:
- Depth:

## Prototype

- Latitude: 5–20°N
- Longitude: 80–100°E
- Time: 2020-01-01 → 2020-01-03

## Raw Storage

`data/raw/<folder>/`

## Download Command

```bash
<exact command used>
```

## Verification

```bash
<exact inspection command>
```

## Preprocessing

- QC
- temporal alignment
- spatial cropping
- regridding
- missing-value handling
- normalization

## Final ANTARBODH Representation

```text
<final shape/representation>
```

## Notes

Warnings, missing coverage, unusual coordinates, or dataset-specific issues.
```

## 12. Keep raw data untouched

The intended flow is:

```text
data/raw/
    ↓
QC
    ↓
data/interim/
    ↓
interpolation / regridding / time alignment
    ↓
data/processed/
```

Example:

```text
data/raw/glorys/glorys_bob_test.nc
        ↓
vertical interpolation
        ↓
data/interim/glorys/
        ↓
horizontal regridding
        ↓
data/processed/targets/
```

## 13. Final ANTARBODH target grid

GLORYS native data is approximately 1/12° (~0.0833°). It will ultimately be transformed to:

```text
0.25° × 0.25°
```

The vertical target is:

```text
0, 5, 10, 20, 30, 50, 75,
100, 125, 150, 200, 300,
500, 700, 1000 m
```

Final target:

```text
Y[time, depth, latitude, longitude]
```

Final surface input:

```text
X[time, latitude, longitude, channel]
```

with seven intended channels:

```text
0 = SST
1 = SSS
2 = SSH/SLA
3 = Current U
4 = Current V
5 = Wind U
6 = Wind V
```

## 14. ARGO and INCOIS

ARGO is an **independent validation source**, not a model input.

Store raw ARGO data in:

```text
data/raw/argo/
```

and processed validation data in:

```text
data/interim/argo/
data/validation/
```

The validation workflow is:

```text
ARGO profile
    ↓
QC
    ↓
pressure → depth
    ↓
interpolate to 15 target depths
    ↓
match with ANTARBODH prediction in space/time
    ↓
RMSE / MAE / Bias / Correlation
```

INCOIS Argo data can be incorporated alongside global Argo for Indian Ocean-focused validation.

## 15. Scaling strategy

Do not immediately download years of data.

Use:

```text
3 days
  ↓
1 month
  ↓
3 months
  ↓
1 year
  ↓
multiple years
  ↓
full North Indian Ocean
```

Full project domain:

```text
5°N – 30°N
45°E – 105°E
```

At each stage check:

- file size
- dimensions
- coordinates
- time continuity
- missing values
- variable ranges
- spatial coverage

## 16. Recommended implementation order

```text
1. GLORYS
2. SST
3. SSH/SLA
4. Surface current U
5. Surface current V
6. Surface wind U
7. Surface wind V
8. SSS
9. Global ARGO
10. INCOIS ARGO
```

The immediate objective is to prove that a small three-day sample can pass the entire pipeline before scaling to months/years.

## 17. Git safety check

Before committing:

```bash
git status
```

Large data files should remain ignored.

Typical ignored scientific-data formats include:

```text
*.nc
*.nc4
*.h5
*.hdf5
*.grib
*.grib2
*.zarr/
*.npy
*.npz
*.parquet
```

Never commit credentials or secret files.

## 18. Data pipeline success criterion

The completed data pipeline should look like:

```text
SST ───────────────┐
SSS ───────────────┤
SSH/SLA ───────────┤
Current U/V ───────┤
Wind U/V ──────────┤
                   ▼
              QC + alignment
                   ▼
             daily 0.25° grid
                   ▼
            X = 7 surface channels
                   ▼
               ANTARBODH
                   ▼
         15-depth temperature
                   ▼
          ARGO / INCOIS validation
```

The key principle is:

> **Find → verify → dry-run → download a tiny subset → inspect → preprocess → validate → scale.**

This keeps the data pipeline reproducible and prevents large incorrect downloads.