## Data Download Setup

ANTARBODH uses datasets from Copernicus Marine and other ocean-data providers. Large datasets are **not stored in this GitHub repository**. Each team member should configure their own local data environment.

### 1. Create a Copernicus Marine Account

Create an account at the official Copernicus Marine website:

https://data.marine.copernicus.eu/

After registration, verify your email and make sure you can log in.

### 2. Activate the ANTARBODH Environment


```bash
git clone https://github.com/itzzfalcon52/antarbodh.git
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

### 3. Configure Copernicus Marine Login

Run:
```bash
copernicusmarine login
```

### 4. Find a Dataset

Before downloading a dataset, find its exact dataset ID and variable name from the Copernicus Marine catalogue.

Save the catalogue locally:
```bash
copernicusmarine describe > copernicus_catalogue.txt
```
Search for a product/dataset:
```bash
grep -n -i "GLORYS" copernicus_catalogue.txt
```

Search for a variable:
```bash
grep -n -i "potential_temperature" copernicus_catalogue.txt
```
Record the:

Dataset ID
Dataset version
Dataset part
Variable name(s)
Units
Spatial resolution
Temporal resolution
Depth coverage
Time coverage

Do not guess dataset IDs or variable names.


### 5. Download Using `src/download/`:


Dataset-specific download scripts are stored in:
```bash
src/download/
├── glorys.py
├── sst.py
├── sss.py
├── ssh.py
├── currents.py
├── winds.py
└── argo.py
```

The scripts read their settings from:
```bash
configs/prototype.yaml
```

For example, the GLORYS configuration contains:
```bash
glorys:
  dataset_id: "cmems_mod_glo_phy_my_0.083deg_P1D-m"
  variable: "thetao"
  min_depth: 0
  max_depth: 1100
  output_filename: "glorys_bob_test"

```

### 6. Run a Dataset Downloader


```bash
python src/download/glorys.py
```
The raw dataset will be placed under:

```bash
data/raw/glorys/
```

### 7. Data Storage Rules

Keep downloaded data in:
```bash
data/raw/
```

Intermediate processed data goes in:
```bash
data/interim/
```
Final ML-ready datasets go in:
```bash
data/processed/
```
ARGO/INCOIS validation data goes in:

```bash
data/validation/
```
