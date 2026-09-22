# Xarray for ANTARBODH — Detailed Practical Guide

## 1. Understanding your dataset dimensions

If SST says:

```text
Dimensions:
    time: 1
    latitude: 150
    longitude: 200
```

then the SST variable normally has shape:

```text
(time, latitude, longitude) = (1, 150, 200)
```

So there are 150 latitude coordinate positions and 200 longitude coordinate positions. With one time step, the spatial field is a 150 × 200 grid, containing 30,000 grid positions before accounting for missing values.

The coordinates define the axes:

```text
time[0]
latitude[0] ... latitude[149]
longitude[0] ... longitude[199]
```

and the data variable contains values at combinations of those coordinates.

For example:

```text
temperature(time, latitude, longitude)
```

means:

```text
temperature[time=0, latitude=0, longitude=0]
temperature[time=0, latitude=0, longitude=1]
...
```

---

## 2. Dataset vs DataArray

### Dataset

A Dataset is a container for several related variables and their shared coordinates.

For winds:

```text
Dataset
├── Coordinates
│   ├── time
│   ├── latitude
│   └── longitude
│
├── eastward_wind
└── northward_wind
```

Open it with:

```python
import xarray as xr

ds = xr.open_dataset("winds.nc")
```

### DataArray

A DataArray is one variable together with its dimensions and coordinates.

```python
u = ds["eastward_wind"]
v = ds["northward_wind"]
```

For ANTARBODH, keep related variables in Datasets during preprocessing and extract DataArrays when operating on a particular variable.

---

## 3. Your wind and current variables

Your interpretation is correct.

Winds:

```text
eastward_wind
northward_wind
```

Currents:

```text
uo
vo
```

They are two components of vector fields.

For the model, retain them as separate channels:

```text
1. SST
2. SSS
3. SSH/SLA
4. current_u
5. current_v
6. wind_u
7. wind_v
```

Thus the baseline has seven input channels.

You can derive speed:

```python
current_speed = (uo**2 + vo**2) ** 0.5
wind_speed = (eastward_wind**2 + northward_wind**2) ** 0.5
```

but do not replace U/V with speed automatically. U/V preserve directional information.

---

# 4. The xarray mental model

Pandas mainly thinks:

```text
rows × columns
```

Xarray thinks:

```text
named dimensions × coordinates × variables
```

Pandas example:

```text
time | latitude | longitude | temperature
```

Xarray:

```python
temperature(time, latitude, longitude)
```

The major advantage is that xarray knows what each dimension means.

That lets you write:

```python
ds.sel(latitude=10, longitude=85, method="nearest")
```

instead of manually finding row/column positions.

---

# 5. Opening datasets

### One NetCDF

```python
ds = xr.open_dataset("file.nc")
```

### Multiple files

```python
ds = xr.open_mfdataset(
    "data/*.nc",
    combine="by_coords"
)
```

For many daily files:

```python
ds = xr.open_mfdataset(
    "data/raw/sst/*.nc",
    combine="by_coords"  
)
```

This can give us a single Dataset with a time dimension spanning all the files.

### Close

```python
ds.close()
```

This matters when many files are open.

---

# 6. Inspecting a Dataset

You will use these constantly.

```python
ds
```

```python
ds.dims
```

```python
ds.sizes
```

```python
ds.coords
```

```python
ds.data_vars
```

```python
list(ds.data_vars)
```

```python
list(ds.coords)
```

```python
ds.attrs
```

For one variable:

```python
ds["sea_surface_temperature"]
```

and:

```python
ds["sea_surface_temperature"].attrs
```

---

# 7. `.values`, `.to_numpy()`, and metadata

Get coordinate values:

```python
lat = ds["latitude"].values
lon = ds["longitude"].values
time = ds["time"].values 
```
these return numpy arrays 

For a DataArray:

```python
array = ds["sea_surface_temperature"].to_numpy() shape:(time,lat,lng)
```

for xarray we had:  

DataArray
├── values
├── time coordinates
├── latitude coordinates
├── longitude coordinates
├── dimensions
└── metadata/attributes

but now,when we convert to numpy_array:it sees that only as numbers even though the shape is same


The difference is mostly that `.values` exposes the underlying array while `.to_numpy()` is the explicit conversion method.

---

# 8. Shape and dimensions

```python
sst = ds["sea_surface_temperature"]

print(sst.shape)
print(sst.dims)
print(sst.sizes)
```

Example:

```text
(1, 150, 200)
('time', 'latitude', 'longitude')
```

Remember:

```text
shape → sizes in positional order
dims  → names of those axes
sizes → named dimension lengths
```

---

# 9. `.sel()` — select by coordinate value

```python
sst.sel(latitude=10, method="nearest")
```

Point:

```python
point = sst.sel(
    latitude=10,
    longitude=85,
    method="nearest"
)
```

`method='nearest'` means if the exact coordinate you ask for doesn't exist in the dataset, xarray chooses the available coordinate that is closest to what you asked for.

This is one of the most important xarray methods.

Think:

```text
sel = select using coordinate labels/values
```

---

# 10. `.isel()` — select by integer position/index

```python
ds.isel(time=0)
```

A particular grid cell:

```python
ds.isel(
    time=0,
    latitude=20,
    longitude=30
)
```

Think:

```text
sel  → coordinate
isel → integer position/index
```

---

# 11. `.sel()` with slices

Regional subset:

```python
bob = ds.sel(
    latitude=slice(5, 20),
    longitude=slice(80, 100)
)
```

Time subset:

```python
subset = ds.sel(
    time=slice("2020-01-01", "2020-01-31")
)
```

Combined:

```python
subset = ds.sel(
    time=slice("2020-01-01", "2020-01-31"),
    latitude=slice(5, 20),
    longitude=slice(80, 100)
)
```

Check coordinate ordering first. If latitude is descending, the slice must be reversed.

---

# 12. Selecting multiple coordinates

```python
ds.sel(latitude=[5, 10, 15, 20])
```

Position-based:

```python
ds.isel(latitude=[0, 10, 20])
```

---

# 13. `.interp()` — interpolation

`.sel()` selects an existing coordinate.

`.interp()` calculates values at new coordinates.

Example:

```python
result = ds.interp(
    latitude=[5.125, 5.375, 5.625]
)
```

For GLORYS vertical interpolation:

```python
target_depths = [
    0, 5, 10, 20, 30, 50, 75,
    100, 125, 150, 200, 300,
    500, 700, 1000
]

glorys_target = glorys.interp(
    depth=target_depths
)
```

However, your GLORYS shallowest level is around 0.494 m, so the 0 m target needs an explicit policy. Do not blindly extrapolate.

---

# 14. `.reindex()` — align to exact labels

```python
result = ds.reindex(
    latitude=[5.125, 5.375, 5.625]
)
```

If the requested coordinate does not exist, xarray can create missing values.

Difference:

```text
reindex → requested labels; missing if no exact match

interp → calculate values between existing coordinates
```

---

# 15. Horizontal regridding

Your sources have different native grids:

```text
SST       ~0.1°
SSS       ~0.2°
SSH       0.25°
currents  0.25°
winds     0.25°
GLORYS    ~0.083°
```

They must be brought onto a common 0.25° grid.

For horizontal ocean regridding, use xESMF rather than assuming that `.interp()` is equivalent to a dedicated grid-remapping operation.

Typical pattern:

```python
import xesmf as xe

regridder = xe.Regridder(
    source,
    target_grid,
    "bilinear"
)

result = regridder(source)
```

The regridder/weights can be reused for repeated files.

---

# 16. `.rename()`

Standardize coordinate names:

```python
ds = ds.rename({
    "lat": "latitude",
    "lon": "longitude"
})
```

Standardize variable names:

```python
ds = ds.rename({
    "uo": "current_u",
    "vo": "current_v"
})
```

This can make the rest of the pipeline much cleaner.

---

# 17. `.assign_coords()`

Create or replace coordinates:

```python
ds = ds.assign_coords(
    latitude=("latitude", new_latitudes)
)
```

Useful when constructing the common target grid.

---

# 18. `.sortby()`

Ensure coordinate ordering:

```python
ds = ds.sortby("latitude")
ds = ds.sortby("longitude")
ds = ds.sortby("time")
```

This is particularly important before coordinate slicing and interpolation.

---

# 19. `.drop_vars()`

Remove variables you do not need:

```python
ds = ds.drop_vars("unneeded_variable")
```

This can reduce clutter and memory use.

---

# 20. `.squeeze()`

Remove dimensions whose length is 1:

```python
surface = ds.squeeze()
```

For:

```text
(time=1, latitude=60, longitude=80)
```

this can produce:

```text
(latitude=60, longitude=80)
```

Do not blindly squeeze if the time dimension is still conceptually important.

---

# 21. `.expand_dims()`

Add a dimension:

```python
da = da.expand_dims(channel=["sst"])
```

This becomes useful when explicitly constructing model input channels.

---

# 22. `.transpose()`

Change dimension order:

```python
da = da.transpose(
    "time",
    "latitude",
    "longitude"
)
```

For your target:

```python
Y = Y.transpose(
    "time",
    "depth",
    "latitude",
    "longitude"
)
```

For model input:

```python
X = X.transpose(
    "time",
    "channel",
    "latitude",
    "longitude"
)
```

---

# 23. `.stack()` and `.unstack()`

Combine dimensions:

```python
stacked = ds.stack(
    spatial=("latitude", "longitude")
)
```

Reverse:

```python
unstacked = stacked.unstack("spatial")
```

Useful for some statistics and table-like analysis.

---

# 24. `.where()` — QC and masking

Keep values satisfying a condition:

```python
clean = sst.where(sst > 0)
```

Range example:

```python
clean = sst.where(
    (sst > -2) & (sst < 40)
)
```

These thresholds are examples only; actual scientific QC limits should be defined per variable/source.

Do not use:

```python
sst.fillna(0)
```

as a generic ocean-data QC strategy. Zero is a physical value, not a generic missing-data marker.

---

# 25. Missing data

```python
sst.isnull()
```

```python
sst.notnull()
```

Count missing:

```python
sst.isnull().sum()
```

Count valid:

```python
sst.notnull().sum()
```

Missing fraction:

```python
missing_fraction = sst.isnull().mean()
```

Overall percentage:

```python
missing_percent = sst.isnull().mean().item() * 100
```

---

# 26. `.count()`

Number of non-missing values:

```python
sst.count()
```

Per grid cell through time:

```python
sst.count(dim="time")
```

This is useful for deciding whether a grid cell has enough observations.

---

# 27. Statistical reductions

Basic methods:

```python
sst.mean()
sst.std()
sst.min()
sst.max()
sst.median()
sst.sum()
sst.var()
```

Along one dimension:

```python
sst.mean(dim="time")
```

Spatial mean:

```python
sst.mean(
    dim=("latitude", "longitude")
)
```

All spatial and temporal dimensions:

```python
sst.mean(
    dim=("time", "latitude", "longitude")
)
```

Use:

```python
skipna=True
```

when missing values should be excluded:

```python
sst.mean(skipna=True)
```

---

# 28. `groupby()` — seasonal/monthly analysis

Monthly climatology:

```python
monthly = sst.groupby(
    "time.month"
).mean("time")
```

Seasonal:

```python
seasonal = sst.groupby(
    "time.season"
).mean("time")
```

This becomes useful for ANTARBODH seasonal evaluation.

---

# 29. `resample()` — time frequency

Daily:

```python
daily = ds.resample(
    time="1D"
).mean()
```

Monthly:

```python
monthly = ds.resample(
    time="1MS"
).mean()
```

For ANTARBODH, use this only after understanding the source temporal sampling. Do not blindly resample every product.

---

# 30. `xr.align()` — synchronize coordinates

Example:

```python
sst_aligned, ssh_aligned = xr.align(
    sst,
    ssh,
    join="inner"
)
```

Useful when datasets have slightly different time coordinates.

Important modes include:

```text
inner
outer
left
right
exact
```

For a model input requiring shared timestamps, `inner` is often useful, but it should be part of an explicit missing-data policy.

---

# 31. `xr.merge()` — combine variables

If datasets share compatible coordinates:

```python
surface = xr.merge([
    sst,
    ssh,
    winds,
    currents
])
```

You can end up with:

```text
sst
sss
sla
current_u
current_v
wind_u
wind_v
```

in one Dataset.

---

# 32. `xr.concat()` — concatenate along a dimension

Consecutive times:

```python
combined = xr.concat(
    [day1, day2, day3],
    dim="time"
)
```

It can also create a new dimension:

```python
combined = xr.concat(
    [wind_u, wind_v],
    dim="channel"
)
```

Use carefully when variables have different metadata or coordinate structures.

---

# 33. `xr.combine_by_coords()`

Useful for combining datasets whose coordinates determine how they fit together:

```python
combined = xr.combine_by_coords(
    datasets
)
```

Especially useful for collections of files split across time or spatial chunks.

---

# 34. Combining your two SSS products

Ascending and descending are two sources for the same physical SSS variable.

You want:

```text
SSS
```

not:

```text
SSS_ascending
SSS_descending
```

as separate model channels.

A simple valid-observation fallback:

```python
sss = xr.where(
    sss_asc.notnull(),
    sss_asc,
    sss_desc
)
```

A valid-only mean can be:

```python
sss = xr.concat(
    [sss_asc, sss_desc],
    dim="source"
).mean(
    dim="source",
    skipna=True
)
```

Do not choose between these blindly. Inspect the missing-value patterns and source QC information first.

---

# 35. Unit conversion

Your SST is stored in Kelvin.

Convert:

```python
sst_c = sst - 273.15
```

Update metadata:

```python
sst_c.attrs = sst.attrs.copy()
sst_c.attrs["units"] = "degC"
```

Do unit conversion before normalization.

---

# 36. Derived variables

Current speed:

```python
current_speed = (
    uo**2 + vo**2
) ** 0.5
```

Wind speed:

```python
wind_speed = (
    eastward_wind**2 +
    northward_wind**2
) ** 0.5
```

You can also use:

```python
thetao.differentiate("depth")
```

for a vertical gradient, and:

```python
thetao.diff("depth")
```

for discrete depth differences.

Do not add derived features until the baseline seven-channel model works.

---

# 37. `.rolling()` — moving windows

Seven-step moving mean:

```python
rolling_mean = sst.rolling(
    time=7,
    center=True
).mean()
```

Useful for diagnostics or deliberate temporal smoothing.

Do not automatically smooth model inputs.

---

# 38. `.shift()` — temporal lag

Previous time step:

```python
previous = sst.shift(time=1)
```

Useful if you later build temporal input windows such as:

```text
t-2
t-1
t
```

For the first baseline, daily instantaneous inputs are simpler.

---

# 39. `.differentiate()` and `.diff()`

Vertical gradient:

```python
gradient = thetao.differentiate("depth")
```

Discrete difference:

```python
difference = thetao.diff("depth")
```

These are useful for scientific diagnostics.

---

# 40. `.attrs`

Read:

```python
sst.attrs
```

Write:

```python
sst.attrs["units"] = "degC"
```

Keep useful metadata:

```text
units
long_name
standard_name
source
processing history
```

---

# 41. `.encoding`

Storage-related information:

```python
ds.encoding
```

Variable encoding:

```python
sst.encoding
```

Useful when saving compressed NetCDF files.

---

# 42. Saving NetCDF

```python
ds.to_netcdf("processed.nc")
```

Compression:

```python
encoding = {
    "sst": {
        "zlib": True,
        "complevel": 4
    }
}

ds.to_netcdf(
    "processed.nc",
    encoding=encoding
)
```

NetCDF is a good primary format for your prototype/intermediate data.

---

# 43. Zarr

For larger multi-year workflows:

```python
ds.to_zarr("processed.zarr")
```

Zarr becomes attractive for chunked and parallel workflows.

You do not need to switch to Zarr for the first prototype.

---

# 44. `.load()` and `.compute()`

Explicitly load:

```python
ds.load()
```

With dask-backed/lazy computation:

```python
result = result.compute()
```

Do not load your entire multi-year dataset into RAM unless it actually fits.

---

# 45. Chunking

For large datasets:

```python
ds = xr.open_dataset(
    "file.nc",
    chunks={"time": 10}
)
```

or:

```python
ds = xr.open_mfdataset(
    "data/*.nc",
    chunks={"time": 30}
)
```

Chunking becomes important as you move from one day to years of daily data.

---

# 46. Plotting

You do not need pandas to visualize xarray data.

SST:

```python
sst.isel(time=0).plot(
    figsize=(10, 6)
)
```

GLORYS surface:

```python
thetao.isel(
    time=0,
    depth=0
).plot()
```

At 100 m:

```python
thetao.sel(
    depth=100,
    method="nearest"
).isel(time=0).plot()
```

---

# 47. Vertical profile

```python
profile = thetao.isel(
    time=0,
    latitude=90,
    longitude=120
)

profile.plot(y="depth")
```

Reverse depth axis:

```python
import matplotlib.pyplot as plt

profile.plot(y="depth")
plt.gca().invert_yaxis()
plt.show()
```

This is very useful for understanding your GLORYS target.

---

# 48. Time series at one point

```python
point = sst.sel(
    latitude=10,
    longitude=85,
    method="nearest"
)

point.plot()
```

---

# 49. Pandas conversion

You absolutely can convert xarray to pandas.

DataArray:

```python
series = sst.to_series()
```

or:

```python
df = sst.to_dataframe()
```

Dataset:

```python
df = ds.to_dataframe()
```

Explicit columns:

```python
df = ds.to_dataframe().reset_index()
```

You may get:

```text
time | latitude | longitude | sst
```

For a 4D variable:

```text
time | depth | latitude | longitude | thetao
```

---

# 50. When pandas is useful

Use pandas for genuinely tabular tasks:

```text
ARGO profile tables
metadata
QC reports
summary tables
CSV export
experiment logs
tabular statistics
```

Example:

```python
argo_df = argo_ds.to_dataframe().reset_index()
```

---

# 51. Why xarray should remain your primary format

Your model data is naturally:

```text
X:
(time, channel, latitude, longitude)

Y:
(time, depth, latitude, longitude)
```

Pandas flattens these into rows.

You would then have to reshape the table back into tensors before PyTorch.

With xarray you can preserve the scientific structure through preprocessing.

So:

```text
NetCDF
  ↓
Xarray
  ↓
QC
  ↓
unit conversion
  ↓
SSS combination
  ↓
time alignment
  ↓
horizontal regridding
  ↓
vertical interpolation
  ↓
masking
  ↓
normalization
  ↓
Xarray
  ↓
NumPy
  ↓
PyTorch
```

Pandas can still be used whenever a table is genuinely the right representation.

---

# 52. Normalization with xarray

First split chronologically.

For example:

```python
train = surface.sel(
    time=slice("2020-01-01", "2024-12-31")
)
```

Calculate training statistics only:

```python
mean = train["sst"].mean(
    dim=("time", "latitude", "longitude"),
    skipna=True
)

std = train["sst"].std(
    dim=("time", "latitude", "longitude"),
    skipna=True
)
```

Normalize:

```python
sst_norm = (
    train["sst"] - mean
) / std
```

Save `mean` and `std` for validation/test and inference.

Never calculate normalization statistics from the full dataset before the train/test split.

---

# 53. Broadcasting

This is one of xarray's major advantages.

Suppose:

```python
sst
```

has:

```text
(time, latitude, longitude)
```

and:

```python
mean = sst.mean(dim="time")
```

has:

```text
(latitude, longitude)
```

Then:

```python
anomaly = sst - mean
```

works because xarray understands the named dimensions and broadcasts correctly.

---

# 54. Anomalies

Monthly climatology:

```python
climatology = sst.groupby(
    "time.month"
).mean("time")
```

Anomaly:

```python
anomaly = sst.groupby(
    "time.month"
) - climatology
```

Potentially useful scientifically, but keep the baseline model simple first.

---

# 55. Correlation

For gridded prediction versus observation:

```python
correlation = xr.corr(
    prediction,
    observation,
    dim="time"
)
```

At a particular depth:

```python
correlation = xr.corr(
    prediction.sel(depth=100),
    observation.sel(depth=100),
    dim="time"
)
```

This can produce a spatial correlation field.

---

# 56. RMSE

Error:

```python
error = prediction - observation
```

RMSE over time, latitude, and longitude:

```python
rmse = np.sqrt(
    (error ** 2).mean(
        dim=("time", "latitude", "longitude")
    )
)
```

If depth is retained, the result is:

```text
depth → RMSE
```

which is ideal for your 15-depth evaluation.

---

# 57. MAE

```python
mae = np.abs(
    prediction - observation
).mean(
    dim=("time", "latitude", "longitude")
)
```

Result:

```text
depth → MAE
```

---

# 58. Bias

```python
bias = (
    prediction - observation
).mean(
    dim=("time", "latitude", "longitude")
)
```

Result:

```text
depth → Bias
```

---

# 59. Spatial RMSE map

```python
rmse_map = np.sqrt(
    ((prediction - observation) ** 2)
    .mean(dim=("time", "depth"))
)
```

Result:

```text
(latitude, longitude)
```

Then:

```python
rmse_map.plot()
```

No pandas conversion is necessary.

---

# 60. Seasonal evaluation

```python
error = prediction - observation

rmse_season = np.sqrt(
    (error ** 2)
    .groupby("time.season")
    .mean(
        dim=("time", "latitude", "longitude")
    )
)
```

This can retain depth and give:

```text
season × depth
```

---

# 61. Regional evaluation

Subset first:

```python
region = prediction.sel(
    latitude=slice(10, 15),
    longitude=slice(85, 95)
)
```

Then calculate metrics on that region.

---

# 62. Constructing the seven-channel input

Once all seven fields have been:

- QC'd
- unit converted
- time aligned
- horizontally regridded
- given compatible coordinates

you can construct:

```python
X = xr.concat(
    [
        surface["sst"],
        surface["sss"],
        surface["sla"],
        surface["current_u"],
        surface["current_v"],
        surface["wind_u"],
        surface["wind_v"],
    ],
    dim="channel"
)
```

Then:

```python
X = X.assign_coords(
    channel=[
        "sst",
        "sss",
        "sla",
        "current_u",
        "current_v",
        "wind_u",
        "wind_v"
    ]
)
```

Finally:

```python
X = X.transpose(
    "time",
    "channel",
    "latitude",
    "longitude"
)
```

Expected prototype shape:

```text
(time, channel, latitude, longitude)
```

For one day on the recommended 60 × 80 grid:

```text
(1, 7, 60, 80)
```

---

# 63. Constructing the target

After GLORYS has been horizontally regridded and vertically interpolated:

```python
Y = glorys_target["thetao"]
```

Ensure:

```python
Y = Y.transpose(
    "time",
    "depth",
    "latitude",
    "longitude"
)
```

Expected:

```text
(1, 15, 60, 80)
```

---

# 64. Xarray → NumPy → PyTorch

At the model boundary:

```python
X_np = X.to_numpy()
Y_np = Y.to_numpy()
```

Then:

```python
import torch

X_tensor = torch.from_numpy(X_np)
Y_tensor = torch.from_numpy(Y_np)
```

Your model receives:

```text
X:
(time, channel, latitude, longitude)

Y:
(time, depth, latitude, longitude)
```

---

# 65. The xarray methods you should master first

Do not try to memorize the entire xarray API.

For ANTARBODH, prioritize:

```text
xr.open_dataset()
xr.open_mfdataset()

ds["variable"]

ds.dims
ds.sizes
ds.coords
ds.data_vars
ds.attrs

.sel()
.isel()

.interp()
.reindex()

.rename()
.assign_coords()
.sortby()

.where()
.isnull()
.notnull()
.count()

.mean()
.std()
.min()
.max()
.median()

xr.merge()
xr.concat()
xr.align()
xr.combine_by_coords()

.groupby()
.resample()

.transpose()
.squeeze()
.expand_dims()

.stack()
.unstack()

.load()
.compute()

.to_numpy()
.values

.to_netcdf()
.to_zarr()

.plot()
```

These cover the large majority of the preprocessing, inspection, and evaluation operations you will need.

---

# 66. Pandas-to-xarray translation cheat sheet

| Task | Pandas | Xarray |
|---|---|---|
| Select by label | `.loc[]` | `.sel()` |
| Select by position | `.iloc[]` | `.isel()` |
| Filter/mask | Boolean indexing | `.where()` |
| Missing values | `.isna()` | `.isnull()` |
| Non-missing | `.notna()` | `.notnull()` |
| Mean | `.mean()` | `.mean()` |
| Standard deviation | `.std()` | `.std()` |
| Min | `.min()` | `.min()` |
| Max | `.max()` | `.max()` |
| Group by | `.groupby()` | `.groupby()` |
| Time resampling | `.resample()` | `.resample()` |
| Concatenate | `pd.concat()` | `xr.concat()` |
| Merge | `.merge()` | `xr.merge()` |
| Align | `.join()` / alignment logic | `xr.align()` |
| Rename | `.rename()` | `.rename()` |
| Sort | `.sort_values()` | `.sortby()` |
| Reshape | `.stack()` / `.unstack()` | `.stack()` / `.unstack()` |
| Array conversion | `.to_numpy()` | `.to_numpy()` |
| Convert xarray → pandas | — | `.to_dataframe()` / `.to_series()` |
| Convert pandas → xarray | `.to_xarray()` | `.to_xarray()` |

The important distinction is that xarray operations understand named scientific dimensions.

---

# 67. Your actual ANTARBODH preprocessing workflow

Use:

```text
RAW NETCDF
    ↓
xr.open_dataset()
    ↓
Inspect dimensions, coordinates, variables, units
    ↓
QC
    ↓
Unit conversion
    ↓
Standardize names
    ↓
SSS ascending + descending → one SSS field
    ↓
Time alignment
    ↓
Horizontal regridding
    ↓
Common 0.25° grid
    ↓
GLORYS vertical interpolation
    ↓
15 target depths
    ↓
Missing-data masks
    ↓
Chronological train/validation/test split
    ↓
Training-only normalization
    ↓
Merge 7 input variables
    ↓
X = (time, channel, latitude, longitude)
    ↓
Y = (time, depth, latitude, longitude)
    ↓
NumPy
    ↓
PyTorch
```

---

# 68. Recommended prototype grid

For the Bay of Bengal prototype, use the 0.25° cell-center grid approximately:

```text
latitude:
5.125 ... 19.875

longitude:
80.125 ... 99.875
```

This gives:

```text
60 latitude cells
80 longitude cells
```

Therefore after horizontal regridding:

```text
SST       → (time, 60, 80)
SSS       → (time, 60, 80)
SSH       → (time, 60, 80)
current_u → (time, 60, 80)
current_v → (time, 60, 80)
wind_u    → (time, 60, 80)
wind_v    → (time, 60, 80)
```

Then:

```text
X → (time, 7, 60, 80)
Y → (time, 15, 60, 80)
```

for the prototype.

---

# 69. A first xarray practice notebook

Create:

```text
notebooks/01_xarray_basics.ipynb
```

Start:

```python
import xarray as xr
import matplotlib.pyplot as plt

sst = xr.open_dataset(
    "../data/raw/sst/sst_bob.nc"
)

sst
```

Inspect:

```python
print(sst.dims)
print(sst.sizes)
print(sst.coords)
print(sst.data_vars)
```

Get the variable:

```python
temperature = sst["sea_surface_temperature"]

print(temperature.dims)
print(temperature.shape)
print(temperature.attrs)
```

Plot:

```python
temperature.isel(time=0).plot(
    figsize=(10, 6)
)

plt.show()
```

Select a point:

```python
point = temperature.sel(
    latitude=10,
    longitude=85,
    method="nearest"
)

print(point)
```

Convert only that point/time series to pandas:

```python
df = point.to_dataframe().reset_index()

print(df.head())
```

Inspect GLORYS:

```python
glorys = xr.open_dataset(
    "../data/raw/glorys/glorys_bob.nc"
)

print(glorys)
print(glorys["thetao"].dims)
print(glorys["thetao"].shape)
print(glorys.depth.values)
```

Plot the surface:

```python
glorys["thetao"].isel(
    time=0,
    depth=0
).plot(figsize=(10, 6))

plt.show()
```

Plot a profile:

```python
profile = glorys["thetao"].isel(
    time=0,
    latitude=90,
    longitude=120
)

profile.plot(y="depth")

plt.gca().invert_yaxis()
plt.show()
```

---

# 70. The three concepts to master before preprocessing

## Coordinates

Understand:

```text
time
latitude
longitude
depth
```

as actual coordinate axes.

## Dimensions

Understand:

```text
dims  = ("time", "latitude", "longitude")
shape = (1, 150, 200)
```

## Variables

Understand:

```text
Dataset
    ↓
multiple variables + coordinates

DataArray
    ↓
one variable + dimensions + coordinates
```

Once these are comfortable, the rest of xarray becomes much easier.

---

# 71. Recommended rule for ANTARBODH

Keep the data in xarray for as long as possible.

Use:

```text
NetCDF
 ↓
Xarray
 ↓
Xarray preprocessing
 ↓
Xarray QC
 ↓
Xarray regridding
 ↓
Xarray alignment
 ↓
Xarray normalization
 ↓
Xarray → NumPy
 ↓
PyTorch
```

Use pandas when the task is genuinely tabular.

Examples:

```text
ARGO profile tables
QC summary tables
metadata
experiment logs
CSV exports
```

You are not avoiding pandas because it is bad. You are using xarray because the scientific structure of your data is multidimensional.
