# ANTARBODH — Preprocessing & EDA Roadmap

## 0. Where does this belong?

Yes. The **reusable preprocessing logic belongs in `src/preprocessing/`**.

But keep EDA and exploratory visualization separate from the reusable pipeline.

Recommended structure:

```text
antarbodh/
├── configs/
│   └── prototype.yaml
│
├── notebooks/
│   ├── 01_data_access.ipynb
│   ├── 02_data_audit.ipynb
│   └── 03_preprocessing.ipynb
│
├── src/
│   ├── download/
│   ├── preprocessing/
│   │   ├── __init__.py
│   │   ├── coordinates.py
│   │   ├── time.py
│   │   ├── units.py
│   │   ├── qc.py
│   │   ├── eda.py
│   │   ├── masks.py
│   │   ├── sss.py
│   │   ├── regrid.py
│   │   ├── glorys.py
│   │   ├── normalize.py
│   │   ├── validate.py
│   │   └── pipeline.py
│   └── qc/
│
├── data/
│   ├── raw/
│   ├── interim/
│   ├── processed/
│   └── validation/
│
└── outputs/
    ├── figures/
    └── reports/
```

### Important distinction

`02_data_audit.ipynb` and `03_preprocessing.ipynb` are for **exploration, visualization, testing and demonstration**.

`src/preprocessing/` contains the **reusable, reproducible implementation**.

The goal is that changing:

```yaml
time:
  start: "2020-01-01"
  end: "2020-01-03"
```

to:

```yaml
time:
  start: "2020-01-01"
  end: "2025-12-31"
```

does not require rewriting the preprocessing logic.

---

# 1. Big Picture

ANTARBODH preprocessing should follow:

```text
RAW DATA
   ↓
1. Load
   ↓
2. Structural audit
   ↓
3. EDA
   ↓
4. Coordinate/time normalization
   ↓
5. Unit conversion
   ↓
6. Quality control
   ↓
7. Missing-value analysis
   ↓
8. Missing-value treatment
   ↓
9. Combine complementary observations
   ↓
10. Horizontal regridding
   ↓
11. GLORYS vertical interpolation
   ↓
12. Time alignment
   ↓
13. Build masks
   ↓
14. Train/validation/test split
   ↓
15. Normalize
   ↓
16. Final validation
   ↓
17. Save reproducible processed dataset
```

---

# 2. EDA vs Preprocessing

This distinction is extremely important.

## EDA

EDA asks:

> **What does the data look like?**

Examples:

- What is the distribution?
- Are there extreme values?
- Where are values missing?
- Are there spatial patterns?
- Are there temporal patterns?
- Are the two SSS products consistent?
- Are there suspicious values?
- What are the physical ranges?

## Preprocessing

Preprocessing asks:

> **How should we transform the data into a clean model-ready representation?**

Examples:

- Convert Kelvin → Celsius.
- Regrid to 0.25°.
- Combine SSS ascending/descending.
- Interpolate GLORYS to 15 depths.
- Handle missing values.
- Normalize the input channels.

### Therefore:

**EDA comes before final preprocessing decisions.**

We should inspect the data first and only then decide how aggressively to clean/interpolate/transform it.

---

# 3. Stage 1 — Load Data

Use xarray as the canonical data representation.

Example:

```python
import xarray as xr

ds = xr.open_dataset(
    "data/raw/sst/sst_bob.nc"
)

sst = ds["sea_surface_temperature"]
```

For the initial prototype, use one-day files.

Later, when multiple files/days are involved:

```python
xr.open_mfdataset(
    "data/raw/sst/*.nc",
    combine="by_coords"
)
```

Dask can be introduced when the dataset becomes large.

---

# 4. Stage 2 — Structural Validation

Before doing scientific analysis, verify:

- dimensions
- coordinates
- variable names
- coordinate ordering
- coordinate monotonicity
- time coordinate
- depth coordinate
- units
- attributes
- data type
- duplicate coordinates

For every dataset, establish:

```text
What is the variable?
What are its dimensions?
What are its coordinates?
What are its units?
What is its spatial coverage?
What is its temporal coverage?
```

This is partly already covered by `02_data_audit.ipynb`.

---

# 5. Stage 3 — EDA

Yes, EDA is absolutely required.

But do not think of EDA as simply:

```text
histogram
boxplot
normality test
```

For ocean data, EDA should be:

```text
distribution
+
spatial structure
+
temporal structure
+
missingness
+
physical plausibility
```

---

# 6. EDA Part A — Basic Statistics

For every variable calculate:

```text
count
missing count
missing %
min
max
mean
median
standard deviation
quantiles
```

Useful quantiles:

```text
1%
5%
25%
50%
75%
95%
99%
```

Example:

```python
sst.quantile(
    [0.01, 0.05, 0.25, 0.50, 0.75, 0.95, 0.99]
)
```

These are more useful than only looking at min/max.

---

# 7. EDA Part B — Histograms

Create histograms for:

- SST
- SSS
- SSH/SLA
- current U
- current V
- wind U
- wind V
- GLORYS temperature

Purpose:

- understand distributions
- detect extreme tails
- identify suspicious spikes
- compare variables
- understand skewness

For ocean variables, a non-normal distribution is **not automatically a problem**.

---

# 8. Do We Need the Data to Be Normally Distributed?

**No.**

This is an important misconception to avoid.

Machine-learning models do not require every physical variable to follow a Gaussian distribution.

For ANTARBODH, we should not do:

```text
"Data is not normal"
       ↓
"Force it to normal"
```

automatically.

Instead:

```text
inspect distribution
       ↓
understand skew/outliers
       ↓
choose transformation only if useful
```

---

# 9. What About Normalization?

Normalization is different from making a distribution normal.

### Standardization

```text
z = (x - mean) / std
```

produces approximately:

```text
mean ≈ 0
std ≈ 1
```

It does **not** guarantee a normal/Gaussian distribution.

### Min-max scaling

```text
x' = (x - min) / (max - min)
```

maps values into a range such as 0–1.

### Recommended initial ANTARBODH approach

Use **standardization per input channel**, with statistics calculated from the training period only.

Do not force Gaussianity unless EDA demonstrates a strong reason for a specific transformation.

---

# 10. EDA Part C — Boxplots

Boxplots are useful for:

- detecting extreme values
- comparing distributions
- visualizing quartiles
- identifying long tails

But there is an important warning:

> A statistical outlier is not necessarily a physically incorrect ocean observation.

For example, an unusual SST or SSH value may represent a real ocean feature.

Therefore:

```text
statistical outlier
≠
bad observation
```

---

# 11. Outlier Detection Strategy

Use multiple methods.

## Method 1 — Quantiles

Inspect:

```text
1%
99%
```

and possibly:

```text
0.1%
99.9%
```

for large datasets.

## Method 2 — IQR

Classic statistical rule:

```text
Q1 - 1.5 × IQR
Q3 + 1.5 × IQR
```

Use this as a **flag**, not an automatic deletion rule.

## Method 3 — Physical plausibility

Check whether values make physical sense.

## Method 4 — Spatial context

Plot suspicious values.

## Method 5 — Temporal context

Check whether an extreme value is:

- isolated
- persistent
- associated with a known event
- part of a spatial structure

### Rule

Do not delete ocean observations solely because a boxplot labels them as outliers.

---

# 12. EDA Part D — Spatial Maps

For every variable, plot the spatial field.

At minimum:

```text
SST
SSS ascending
SSS descending
SSH
current U
current V
wind U
wind V
GLORYS surface temperature
```

Look for:

- unrealistic stripes
- isolated spikes
- discontinuities
- coastal artifacts
- land contamination
- swath patterns
- physically plausible gradients
- eddies/fronts

Spatial EDA is extremely important for ANTARBODH because this is a spatial reconstruction problem.

---

# 13. EDA Part E — Missingness Maps

For every variable create:

```python
missing_mask = variable.isnull()
```

Then plot it.

This is particularly important for:

```text
SST
SSS
winds
GLORYS
```

Do not rely only on:

```text
missing = 58%
```

We need to know:

> **Where are those missing values?**

---

# 14. EDA Part F — Missingness by Variable

Create a summary table:

```text
variable | total | missing | missing %
```

Current prototype findings:

```text
SST              58.06%
SSS ascending    88.13%
SSS descending   67.41%
SSH              15.90%
Currents         18.85%
Winds            72.40%
GLORYS           26.45%
```

These should become automatically generated statistics in the reusable audit/QC code.

---

# 15. EDA Part G — Missingness by Time

Once multiple days are available, calculate:

```text
date | missing %
```

This can reveal:

- bad observation days
- seasonal coverage patterns
- satellite acquisition differences
- sudden product failures

This is one reason the audit must become multi-day reproducible.

---

# 16. EDA Part H — Missingness by Depth

For GLORYS:

```text
depth | missing %
```

This is mandatory.

Do not treat:

```text
surface missingness
```

and:

```text
1000 m missingness
```

as equivalent.

---

# 17. EDA Part I — SSS Ascending vs Descending

Calculate:

```text
ascending valid
descending valid
both valid
only ascending
only descending
both missing
```

Then calculate:

```python
sss_diff = sss_asc - sss_desc
```

where both are valid.

Inspect:

- histogram of differences
- spatial difference map
- mean difference
- standard deviation
- extreme differences

Current prototype:

```text
min  ≈ -3.37
max  ≈  2.08
mean ≈ -0.029
```

The near-zero mean is encouraging, but the local extremes need inspection.

---

# 18. EDA Part J — Correlations

Calculate correlations among surface variables.

For example:

```text
SST ↔ SSS
SST ↔ SSH
SSH ↔ currents
wind ↔ SST
etc.
```

But be careful:

> Correlation does not prove physical causation.

The purpose is to understand relationships and potential redundancy.

Later, correlations with GLORYS subsurface temperature at different depths can be especially informative.

---

# 19. EDA Part K — Depth Profiles

For GLORYS, inspect representative temperature-depth profiles.

Plot:

```text
temperature
    |
    |\
    | \
    |  \
    |   \
    |    \
    +---------------- depth
```

Look for:

- thermocline structure
- realistic temperature decrease with depth
- unusual profiles
- shallow/deep differences

This directly relates to ANTARBODH's scientific hypothesis.

---

# 20. EDA Part L — Temporal EDA

Once multiple days exist, examine:

- daily means
- daily standard deviation
- monthly distributions
- seasonal behavior
- temporal continuity

For example:

```text
2020
2021
2022
...
2025
```

This becomes important for preventing seasonal leakage and understanding generalization.

---

# 21. Stage 4 — Coordinate Normalization

Before combining datasets:

- standardize latitude name
- standardize longitude name
- standardize time name
- standardize depth name
- ensure latitude is increasing
- ensure longitude is increasing
- remove duplicate coordinates if present

Example:

```python
ds = ds.sortby("latitude")
ds = ds.sortby("longitude")
```

Do this through reusable functions rather than repeating it in notebooks.

---

# 22. Stage 5 — Unit Normalization

Create a consistent unit convention.

For ANTARBODH:

```text
Temperature → °C
SSS         → verified product convention
SSH         → m
Currents    → m/s
Winds       → m/s
```

SST:

```python
sst = sst - 273.15
```

Never modify metadata without modifying the underlying values when a real conversion is required.

---

# 23. Stage 6 — Quality Control

QC should combine:

```text
metadata checks
+
statistical checks
+
physical checks
+
spatial checks
+
temporal checks
```

Examples:

- non-finite values
- known fill values
- impossible coordinates
- duplicate coordinates
- suspicious ranges
- sudden spikes
- inconsistent U/V masks

QC should **flag** questionable values first.

Automatic removal should require a clear rule.

---

# 24. Stage 7 — Missing-Value Handling

This is a major stage.

Use:

```text
detect
→ understand
→ mask
→ combine
→ conservative interpolation
→ preserve provenance
```

Do not:

```python
fillna(0)
```

and do not:

```python
fillna(global_mean)
```

---

# 25. Stage 8 — Create Observation Masks

For each input variable:

```python
valid_mask = variable.notnull()
```

Potential masks:

```text
SST_valid
SSS_valid
SSH_valid
current_valid
wind_valid
```

Keep these available even if values are interpolated.

This allows the model and validation pipeline to know which values were originally observed.

---

# 26. Stage 9 — Combine SSS Ascending + Descending

Create one SSS channel.

Rules:

```text
both valid
    → average initially

only ascending valid
    → ascending

only descending valid
    → descending

both missing
    → NaN
```

Then evaluate the resulting missingness.

This should be implemented as a reusable function in:

```text
src/preprocessing/sss.py
```

---

# 27. Stage 10 — Missing-Value Interpolation

Do this **after EDA**.

Interpolation should be:

- variable-specific
- local
- conservative
- mask-aware
- reproducible

Do not choose an arbitrary method for all variables.

Potentially:

```text
small spatial gaps
    → local spatial interpolation

short temporal gaps
    → temporal interpolation

large gaps
    → remain missing/masked
```

The actual gap threshold should be decided after looking at the missingness maps.

---

# 28. Stage 11 — Horizontal Regridding

Convert every dataset to:

```text
0.25°
60 × 80
```

using the common grid:

```text
latitude:
5.125 → 19.875

longitude:
80.125 → 99.875
```

Use a consistent regridding method.

For simple regular-grid experimentation:

```python
xarray.interp()
```

can be useful.

For production geophysical processing, use a consistent dedicated regridding method such as xESMF.

---

# 29. Stage 12 — GLORYS Vertical Interpolation

Convert GLORYS native depths to:

```text
0
5
10
20
30
50
75
100
125
150
200
300
500
700
1000 m
```

using xarray interpolation.

Verify that 1000 m is supported by the native depth range.

The current prototype reaches approximately 1062.44 m, so 1000 m is within the downloaded vertical range.

---

# 30. Stage 13 — Time Alignment

Create a common daily timeline.

All inputs should eventually have:

```text
same time coordinate
same latitude
same longitude
```

Conceptually:

```text
SST
SSS
SSH
Ucurrent
Vcurrent
Uwind
Vwind
      ↓
same daily coordinate
```

Use xarray alignment/reindexing rather than manually matching dates.

---

# 31. Stage 14 — Train/Validation/Test Split

Split by time, not random grid cells.

Initial recommendation:

```text
Train:
2020–2023

Validation:
2024

Test:
2025
```

This gives a meaningful temporal generalization test.

Do the split **before computing normalization statistics**.

---

# 32. Stage 15 — Normalization

Compute statistics only from the training period.

For each input channel:

```python
mean = X_train.mean(...)
std = X_train.std(...)
```

Then:

```python
X_norm = (X - mean) / std
```

Apply the same training statistics to:

```text
validation
test
```

Never calculate statistics using the test period.

---

# 33. Stage 16 — Final Validation

Before saving model-ready data, verify:

## Surface

```text
X:
(time, 7, 60, 80)
```

## Target

```text
Y:
(time, 15, 60, 80)
```

Check:

- coordinates match
- target depths match
- no unexpected dimensions
- units are correct
- values are finite where required
- masks are consistent
- no accidental extrapolation
- normalization statistics are correct
- time ordering is correct

---

# 34. Stage 17 — Save Reproducible Outputs

A preprocessing run should create something like:

```text
data/processed/
└── 2020-01-01_2020-01-03/
    ├── inputs.nc
    ├── targets.nc
    └── masks.nc
```

And:

```text
outputs/reports/
└── 2020-01-01_2020-01-03/
    ├── preprocessing_report.json
    └── qc_report.json
```

Reports should contain:

```text
date range
region
grid
depths
variables
input files
missing fraction before
missing fraction after
unit conversions
regridding method
interpolation method
normalization statistics
warnings
final shapes
```

This makes the experiment reproducible.

---

# 35. Recommended Notebook Workflow

## `01_data_access.ipynb`

Purpose:

```text
Can we access the datasets?
```

Keep it lightweight.

---

## `02_data_audit.ipynb`

Purpose:

```text
What does the raw data look like?
```

Include:

- structure
- dimensions
- coordinates
- units
- spatial coverage
- temporal coverage
- statistics
- histograms
- boxplots
- missing masks
- spatial maps
- SSS comparison
- GLORYS depth analysis
- basic correlations

This notebook is exploratory.

---

## `03_preprocessing.ipynb`

Purpose:

```text
Does the reusable preprocessing pipeline work?
```

It should call functions from:

```text
src/preprocessing/
```

rather than contain hundreds of lines of preprocessing logic itself.

---

# 36. Recommended Processing Order

The order matters.

Use:

```text
RAW
 ↓
Load
 ↓
Structural checks
 ↓
EDA
 ↓
Coordinate normalization
 ↓
Unit conversion
 ↓
QC
 ↓
Missingness analysis
 ↓
SSS combination
 ↓
Missing-value treatment
 ↓
Regridding
 ↓
GLORYS depth interpolation
 ↓
Time alignment
 ↓
Split
 ↓
Normalization
 ↓
Final validation
 ↓
Save
```

EDA should happen **before final cleaning decisions**.

---

# 37. What We Should NOT Do Yet

Do not immediately:

- process all six years
- use Dask clusters
- train the Transformer
- aggressively interpolate all missing values
- force variables to Gaussian distributions
- remove every statistical outlier
- fill every NaN
- randomly split grid cells

First establish a scientifically defensible one-day pipeline.

---

# 38. Prototype-to-Production Scaling

The same code should work through these stages:

```text
Stage 1:
1 day

Stage 2:
3 days

Stage 3:
1 month

Stage 4:
3 months

Stage 5:
1 year

Stage 6:
2020–2025
```

Only the configuration changes.

Example:

```yaml
time:
  start: "2020-01-01"
  end: "2020-01-03"
```

then:

```yaml
time:
  start: "2020-01-01"
  end: "2025-12-31"
```

The preprocessing functions should remain unchanged.

---

# 39. Where Dask Enters

For the one-day prototype:

```text
xarray only
```

is sufficient.

When processing many files/days:

```text
xarray
+
open_mfdataset
+
Dask
```

becomes useful.

Dask is an execution/scaling mechanism; it does not replace xarray.

---

# 40. Final ANTARBODH Preprocessing Architecture

```text
                 CONFIG YAML
                      │
                      ▼
                DATA LOADING
                      │
                      ▼
              STRUCTURAL QC
                      │
                      ▼
                    EDA
          ┌───────────┼───────────┐
          │           │           │
      statistics   spatial     missingness
          │           │           │
          └───────────┼───────────┘
                      ▼
              COORDINATE CLEANING
                      │
                      ▼
                UNIT NORMALIZATION
                      │
                      ▼
                    QC
                      │
                      ▼
             MISSING-VALUE HANDLING
                      │
                      ▼
            SSS ASC + DESC COMBINE
                      │
                      ▼
               HORIZONTAL REGRID
                      │
                      ▼
          GLORYS VERTICAL INTERPOLATION
                      │
                      ▼
               TIME ALIGNMENT
                      │
                      ▼
                TRAIN / VAL / TEST
                      │
                      ▼
                  NORMALIZE
                      │
                      ▼
               FINAL VALIDATION
                      │
                      ▼
              MODEL-READY DATA
                      │
             ┌────────┴────────┐
             ▼                 ▼
          X INPUT            Y TARGET
      (T, 7, 60, 80)     (T, 15, 60, 80)
```

---

# 41. Core Principle

The preprocessing pipeline should not be:

> **"Clean the data until there are no NaNs."**

It should be:

> **"Transform heterogeneous observations into a consistent, physically defensible, reproducible representation while preserving information about observation availability."**

And EDA should answer the questions needed to make those preprocessing decisions scientifically.

---

# 42. Immediate Next Action

Before implementing interpolation or large-scale preprocessing, we should now build the EDA layer for the **one-day prototype**.

The immediate sequence should be:

```text
1. Histograms
2. Boxplots
3. Spatial fields
4. Missingness maps
5. Missingness statistics
6. SSS ascending/descending overlap + difference
7. GLORYS missingness by depth
8. Basic physical-range/outlier flags
9. Document conclusions
10. Implement preprocessing rules
```

Once those results are understood, we can implement the actual reusable functions under:

```text
src/preprocessing/
```

and test them through:

```text
03_preprocessing.ipynb
```

That gives ANTARBODH a pipeline that can start with one day for debugging and later scale to the full 2020–2025 dataset without changing the scientific logic.
