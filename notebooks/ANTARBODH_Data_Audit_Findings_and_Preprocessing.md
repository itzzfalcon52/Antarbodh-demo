# ANTARBODH — Data Audit Findings & Preprocessing Plan

## 1. Executive Summary

The first raw-data audit shows that the selected datasets are broadly suitable for the ANTARBODH prototype, but they are **not directly model-ready**.

The main preprocessing challenges are:

1. Different horizontal grids and native resolutions.
2. Missing observations, especially in SSS, winds, and SST.
3. Different units and variable conventions.
4. Combining ascending and descending SSS into one model channel.
5. Depth-dependent missingness in GLORYS.
6. Aligning all variables to one daily timeline.
7. Building a scientifically defensible dense model tensor without pretending missing observations were actually measured.

### Is missing data a major concern?

**Yes.** It is one of the most important issues in the pipeline.

However, the objective should **not** be to eliminate every NaN. Oceanographic satellite products naturally contain missing observations because of clouds, land, swath geometry, quality control, bathymetry, and other observation constraints.

The correct goal is:

> **Understand the missingness, preserve the observation mask, combine complementary observations, interpolate only defensible small gaps, and prevent the model from confusing missing data with real physical values.**

---

# 2. Prototype Scope

- Region: Bay of Bengal
- Latitude: **5–20°N**
- Longitude: **80–100°E**
- Initial test date: **2020-01-01**
- Intended project period: **2020-01-01 to 2025-12-31**
- Target horizontal resolution: **0.25° × 0.25°**
- Target depths:
  `0, 5, 10, 20, 30, 50, 75, 100, 125, 150, 200, 300, 500, 700, 1000 m`
- Surface inputs:
  - SST
  - SSS
  - SSH/SLA
  - surface current U/V
  - wind U/V
- Target:
  - GLORYS `thetao`
- Independent validation:
  - ARGO / INCOIS

---

# 3. Raw Dataset Audit

| Dataset | Variable(s) | Native structure | Main finding |
|---|---|---|---|
| GLORYS | `thetao` | ~0.0833°, 36 depths | Suitable target source; needs vertical/horizontal processing |
| SST | `sea_surface_temperature` | ~0.10° | Kelvin; ~58.06% missing |
| SSS Ascending | `Sea_Surface_Salinity` | ~0.20° | ~88.13% missing |
| SSS Descending | `Sea_Surface_Salinity` | ~0.20° | ~67.41% missing |
| SSH | `sla` | 0.25° | ~15.90% missing |
| Currents | `uo`, `vo` | 0.25° | ~18.85% missing |
| Winds | `eastward_wind`, `northward_wind` | 0.25° | ~72.40% missing |

All prototype downloads currently contain the single time coordinate **2020-01-01**, because the test request was for one day.

---

# 4. Spatial Grid Findings

## SST

- Latitude: ~5.05 → 19.95°N
- Longitude: ~80.05 → 99.95°E
- Shape: **150 × 200**
- Resolution: ~0.10°

## SSS

Ascending and descending products:

- Latitude: ~5.00 → 19.80°N
- Longitude: ~80.20 → 100.00°E
- Shape: **75 × 100**
- Resolution: ~0.20°

## SSH

- Latitude: **5.125 → 19.875°N**
- Longitude: **80.125 → 99.875°E**
- Shape: **60 × 80**
- Resolution: **0.25°**

## Currents

Same 0.25° grid as SSH:

- 60 × 80
- latitude 5.125 → 19.875
- longitude 80.125 → 99.875

## Winds

Same 0.25° grid:

- 60 × 80
- latitude 5.125 → 19.875
- longitude 80.125 → 99.875

## GLORYS

- Latitude: **5.0 → 20.0°N**
- Longitude: **80.0 → 100.0°E**
- Shape: **181 × 241**
- Resolution: ~0.0833°
- 36 selected depth levels
- Deepest selected native level: ~**1062.44 m**

### Recommended common prototype grid

Use the existing 0.25° source grid:

```text
latitude:  5.125 → 19.875
longitude: 80.125 → 99.875
shape:     60 × 80
```

Treat 5–20°N and 80–100°E as the geographical domain bounds, while using these source-compatible grid centers for the model tensor.

Do not force the common grid to 5.0/20.0 and 80.0/100.0 if doing so requires extrapolation.

---

# 5. Temporal Findings

The current prototype files contain:

```text
time = 2020-01-01
```

This is expected for the one-day download.

For the production pipeline, create one common daily timeline from:

```text
2020-01-01
to
2025-12-31
```

Use the actual `time` coordinate as the authoritative time information for each subset rather than relying only on global metadata.

---

# 6. Units and Variable Findings

## SST

Variable:

```text
sea_surface_temperature
```

Units:

```text
kelvin
```

Observed range:

```text
296.94 K → 302.53 K
```

Approximately:

```text
23.79°C → 29.38°C
mean ≈ 27.81°C
```

Convert values:

```python
sst = sst - 273.15
sst.attrs["units"] = "degC"
```

Changing only `.attrs["units"]` does not convert the data.

## GLORYS

`thetao` is already in degrees Celsius.

## SSH

`sla` is in meters.

## Currents

`uo` and `vo` are in m/s.

## Winds

`eastward_wind` and `northward_wind` are in m/s.

## SSS

The reported units are `0.001`. Verify the product convention before applying any scaling. Do not blindly multiply or divide the values.

---

# 7. Missing-Value Findings

Observed missing fractions from the one-day prototype:

| Dataset | Missing fraction |
|---|---:|
| SST | **58.06%** |
| SSS Ascending | **88.13%** |
| SSS Descending | **67.41%** |
| SSH | **15.90%** |
| Currents | **18.85%** |
| Winds | **72.40%** |
| GLORYS | **26.45%** |

These are large percentages, but they do **not** automatically make the datasets unusable.

The critical question is **where and why** the values are missing.

---

# 8. Why Missing Values Matter

Missingness is often structured rather than random.

### SST

Potential causes include:

- clouds
- land
- quality-control filtering
- observation gaps

### SSS

Satellite salinity is much sparser than SST. Ascending and descending observations have complementary coverage.

### Winds

The selected ASCAT product is an observation/swath product, so daily coverage can be spatially incomplete.

### GLORYS

Missingness must be analyzed by depth because land/bathymetry can produce very different masks at shallow and deep levels.

Therefore, a global missing percentage is only the first diagnostic.

---

# 9. What NOT To Do

## Never fill all NaNs with zero

Do not do:

```python
ds = ds.fillna(0)
```

Zero has physical meaning and would make the model interpret missing data as a real ocean observation.

## Never fill all NaNs with a global mean

Avoid:

```python
ds = ds.fillna(ds.mean())
```

This can create artificial spatial structure and suppress variability.

## Do not blindly extrapolate

Do not create values outside the valid source domain simply to obtain a rectangular tensor.

## Do not aggressively smooth observations

Large interpolation gaps can erase fronts, eddies, gradients, and other important ocean structure.

---

# 10. Recommended Missing-Value Strategy

Use a **mask-aware hierarchy**:

```text
1. Detect invalid/fill values
        ↓
2. Convert them to NaN
        ↓
3. Create a validity mask
        ↓
4. Combine complementary observations
        ↓
5. Interpolate only small defensible gaps
        ↓
6. Leave large unsupported gaps masked
        ↓
7. Give the model information about observation availability
```

The key distinction is:

> **Estimating a missing physical value and telling the model that the original observation was missing are two different problems.**

---

# 11. SST Missing-Value Plan

SST has ~58.06% missingness.

### First

Plot the missing mask:

```python
sst_mask = sst.notnull()
```

Determine whether missing values are primarily land/coastal/cloud-related or whether large open-ocean regions are absent.

### Then

Preserve the original mask:

```python
sst_valid = sst.notnull().astype("float32")
```

For small isolated gaps, conservative spatial interpolation can be tested.

Do not interpolate across large contiguous missing regions.

### Model experiment later

Compare:

```text
A: 7 physical channels
B: physical channels + observation masks
```

Do not automatically assume one is superior; measure validation performance.

---

# 12. SSS Missing-Value Plan

SSS is the highest-priority missing-data issue.

Observed:

```text
Ascending ≈88.13% missing
Descending ≈67.41% missing
```

Do not use them as two independent model channels. Combine them into the single intended SSS channel.

## First calculate overlap

```python
overlap = (
    sss_asc.notnull()
    & sss_desc.notnull()
)

print("Overlap count:", overlap.sum().item())
print("Overlap %:", overlap.mean().item() * 100)
```

Then calculate the difference where both are valid:

```python
sss_diff = (
    sss_asc.where(overlap)
    - sss_desc.where(overlap)
)
```

The previous audit showed approximately:

```text
min  = -3.37
max  =  2.08
mean = -0.029
```

The near-zero mean indicates broad agreement where both exist, but local extremes need investigation.

## Initial combination rule

```text
both valid:
    mean(ascending, descending)

only ascending valid:
    ascending

only descending valid:
    descending

both missing:
    NaN
```

Do not blindly average missing values.

After combination, calculate the new missing fraction and plot the resulting mask.

---

# 13. Wind Missing-Value Plan

Wind has ~72.40% missingness.

Because both components have the same missing count, the missingness appears strongly related to the observation pattern rather than an isolated problem in one component.

### Required investigation

Plot:

```python
eastward_wind.isnull()
northward_wind.isnull()
```

Look for swath-like patterns.

### Recommended approach

- preserve the original wind mask
- interpolate only small gaps if justified
- avoid broad spatial filling
- keep U/V validity consistent
- later test whether explicit wind masks improve model performance

Do not remove winds solely because the raw missing percentage is high.

---

# 14. SSH Missing-Value Plan

SSH has ~15.90% missingness and is comparatively manageable.

Steps:

1. Plot the mask.
2. Determine whether missing values are mainly coastal/land-related.
3. Apply conservative local interpolation only where appropriate.
4. Preserve the original mask.
5. Regrid to the common 0.25° grid.

---

# 15. Current Missing-Value Plan

Currents have ~18.85% missingness.

Use a joint validity rule for U and V where possible.

Do not create an artificial U value while V remains invalid, or vice versa, without documenting the behavior.

Recommended:

- inspect the joint mask
- fill only small gaps
- preserve the mask
- ensure U/V remain physically consistent

---

# 16. GLORYS Missing-Value Plan

GLORYS has ~26.45% overall missingness.

This number is insufficient by itself.

Calculate missingness separately for every native depth:

```text
depth | missing %
```

Then repeat after interpolation to the 15 target depths.

The mask should not be treated as uniform through the water column.

Never fill land/depth-inaccessible regions using arbitrary neighboring values.

---

# 17. GLORYS Vertical Interpolation

GLORYS contains 36 native depth levels and reaches approximately 1062.44 m in the selected subset.

Therefore the deepest ANTARBODH target:

```text
1000 m
```

is supported.

Use:

```python
target_depths = [
    0, 5, 10, 20, 30, 50, 75,
    100, 125, 150, 200, 300,
    500, 700, 1000
]

thetao_15 = thetao.interp(depth=target_depths)
```

### Surface caution

The shallowest GLORYS native level is approximately 0.494 m rather than exactly 0 m.

Document how the 0 m target is handled. Do not silently assume it is an exact observed surface measurement.

---

# 18. Horizontal Regridding

All variables need to reach:

```text
60 × 80
```

on the same latitude/longitude coordinates.

For learning and simple regular grids, xarray `.interp()` is useful.

For the production geophysical pipeline, use a consistent dedicated regridding method such as xESMF and document the chosen method.

The important rule is:

```text
all surface variables
        ↓
same grid
        ↓
same coordinate centers
```

---

# 19. Time Alignment

Every variable must be aligned to the same daily timestamps.

Conceptually:

```text
SST
SSS
SSH
current U
current V
wind U
wind V
        ↓
common daily time
```

Use xarray tools such as:

```python
xr.align(...)
```

and/or explicit reindexing.

Never silently combine values from different dates.

---

# 20. Recommended Preprocessing Pipeline

```text
RAW NETCDF
    ↓
Open with xarray
    ↓
Select required variables
    ↓
Normalize coordinate names/order
    ↓
Normalize time
    ↓
Convert units
    ↓
Create source masks
    ↓
Combine SSS ascending + descending
    ↓
Run QC/range checks
    ↓
Analyze missingness
    ↓
Conservatively fill small gaps where justified
    ↓
Horizontal regrid to 0.25°
    ↓
GLORYS vertical interpolation to 15 depths
    ↓
Time alignment
    ↓
Final mask checks
    ↓
Normalization
    ↓
X / Y model tensors
```

---

# 21. Recommended `src/preprocessing/` Structure

```text
src/preprocessing/
├── __init__.py
├── common.py
├── coordinates.py
├── time.py
├── units.py
├── masks.py
├── sss.py
├── regrid.py
├── glorys.py
├── normalize.py
├── validate.py
└── pipeline.py
```

Suggested responsibilities:

- `coordinates.py` — coordinate normalization and common grid
- `time.py` — daily alignment
- `units.py` — Kelvin/Celsius and unit checks
- `masks.py` — masks and missingness statistics
- `sss.py` — ascending/descending combination
- `regrid.py` — horizontal regridding
- `glorys.py` — depth interpolation
- `normalize.py` — train-set statistics and normalization
- `validate.py` — shape/range/NaN checks
- `pipeline.py` — end-to-end preprocessing

---

# 22. Model-Ready Shapes

After preprocessing:

## Surface input

```text
X:
(time, channel, latitude, longitude)
```

with:

```text
channel = 7
latitude = 60
longitude = 80
```

Therefore:

```text
X.shape = (time, 7, 60, 80)
```

Channels:

```text
0 SST
1 SSS
2 SSH/SLA
3 current U
4 current V
5 wind U
6 wind V
```

## Target

```text
Y:
(time, depth, latitude, longitude)
```

with:

```text
depth = 15
latitude = 60
longitude = 80
```

Therefore:

```text
Y.shape = (time, 15, 60, 80)
```

---

# 23. The Dense-Tensor Problem

A CNN normally expects a dense tensor.

But observational data may contain NaNs.

Therefore ANTARBODH needs a deliberate strategy.

A useful architecture experiment is:

### Experiment A

Seven physical channels after conservative preprocessing.

### Experiment B

Seven physical channels plus observation masks.

For example:

```text
SST
SSS
SSH
Ucurrent
Vcurrent
Uwind
Vwind

+

SST_valid
SSS_valid
SSH_valid
Current_valid
Wind_valid
```

This lets the model distinguish:

```text
real measured value
```

from:

```text
estimated / unavailable observation
```

The masks should not be treated as physical measurements; they are observation metadata.

---

# 24. Normalization

Normalize **after deciding the train/validation/test split**.

Do not compute normalization statistics from the entire 2020–2025 period.

Recommended:

```text
mean = training-set mean
std  = training-set standard deviation
```

Then apply those same statistics to validation and test.

For xarray:

```python
mean = X.mean(skipna=True)
std = X.std(skipna=True)
```

But remember: normalization does not solve the NaN problem. Missing-data handling must happen separately.

---

# 25. Train / Validation / Test Split

Do not randomly split individual grid cells.

That can create spatial/temporal leakage.

Initial recommended split:

```text
Train:      2020–2023
Validation: 2024
Test:       2025
```

This gives a meaningful temporal generalization test.

Later, consider geographic holdouts as an additional robustness test.

---

# 26. GLORYS and ARGO/INCOIS Roles

GLORYS is the supervised reference used to train the reconstruction model.

ARGO/INCOIS provides independent observational validation.

Conceptually:

```text
Surface observations
        ↓
ANTARBODH
        ↓
Subsurface reconstruction
        ↓
Compare against ARGO/INCOIS
```

A useful project statement is:

> **GLORYS teaches the model; ARGO/INCOIS tests whether it learned the real ocean.**

Do not describe GLORYS as an operational input to the final prediction system.

---

# 27. Immediate Next Steps

Before writing the full preprocessing pipeline:

## Step 1 — Plot raw fields

For every variable:

- spatial field
- histogram
- missing mask

## Step 2 — Investigate SSS

Calculate:

- ascending valid fraction
- descending valid fraction
- overlap fraction
- both-missing fraction
- ascending-minus-descending difference

## Step 3 — Investigate winds

Determine whether the 72.40% missingness follows swath/coverage geometry.

## Step 4 — Investigate SST

Determine whether the 58.06% missingness is primarily cloud/land/observation related.

## Step 5 — Investigate GLORYS by depth

Produce:

```text
depth | missing fraction
```

for all native depths.

## Step 6 — Define conservative filling rules

Only after the mask plots are understood.

---

# 28. First Preprocessing Milestone

Do not immediately process six years.

First make one clean day:

```text
2020-01-01
     ↓
7 surface variables
     ↓
common 0.25° grid
     ↓
60 × 80
     ↓
GLORYS
     ↓
15 target depths
     ↓
X = (1, 7, 60, 80)
Y = (1, 15, 60, 80)
```

Then verify:

- coordinate equality
- units
- physical ranges
- missingness
- masks
- target depth coverage
- no accidental extrapolation

Then scale:

```text
1 day
→ 3 days
→ 1 month
→ 3 months
→ 1 year
→ 2020–2025
```

---

# 29. Final Assessment

## Are the datasets usable?

**Yes.** The audit does not show a fundamental blocker for the prototype.

The main challenge is harmonization and missing observations.

## Is missingness a major concern?

**Yes, especially for SSS, winds, and SST.**

But missingness is also an intrinsic property of the observational products.

Therefore, the scientifically correct approach is not:

```text
NaN → arbitrary number
```

It is:

```text
detect
→ understand
→ mask
→ combine
→ conservatively interpolate
→ preserve observation availability
→ validate
```

## One-sentence takeaway

> **ANTARBODH's raw datasets are usable, but the preprocessing pipeline must be mask-aware, grid-aware, unit-aware, time-aligned, and conservative about filling missing observations—especially for satellite SSS and winds.**
