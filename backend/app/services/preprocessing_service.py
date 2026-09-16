"""
ANTARBODH inference-time surface preprocessing.

IMPORTANT
---------
This service does NOT modify or execute the training dataset-building
pipeline.

It reuses the same low-level QC behavior and the same surface regridding
implementation used by training, but performs only the operations required
for inference:

    raw surface datasets
        ↓
    variable extraction
        ↓
    surface-depth selection for currents
        ↓
    remove singleton/non-spatial dimensions
        ↓
    same configured QC ranges
        ↓
    hourly → daily wind resampling when configured
        ↓
    canonical 0.25° spatial grid
        ↓
    seven physical channels
        ↓
    explicit validity masks

GLORYS is intentionally NOT used here.

Physical channel order:

    SST
    SSS
    SSH
    Current_U
    Current_V
    Wind_U
    Wind_V
"""

from __future__ import annotations

from typing import Dict, Optional, Tuple

import numpy as np
import pandas as pd
import xarray as xr

from ..config import settings

from src.preprocessing.config import (
    PHYSICAL_CHANNELS,
    build_common_grid,
    load_preprocessing_config,
)

from src.preprocessing.qc import (
    _range_filter,
    _resample_hourly_winds,
)

from src.preprocessing.regrid import (
    regrid_surface_variables,
)


class PreprocessingService:

    def __init__(self) -> None:

        # ==============================================================
        # Load the SAME preprocessing configuration used by training.
        # ==============================================================

        self.prep_config = load_preprocessing_config()

        # Keep inference domain/grid synchronized with backend settings.
        self.prep_config.min_lat = settings.lat_min
        self.prep_config.max_lat = settings.lat_max
        self.prep_config.min_lon = settings.lon_min
        self.prep_config.max_lon = settings.lon_max
        self.prep_config.grid_resolution = settings.resolution

        self.common_lat, self.common_lon = build_common_grid(
            self.prep_config
        )

    # ==================================================================
    # Helper: select requested day
    # ==================================================================

    @staticmethod
    def _select_requested_day(
        ds: xr.Dataset,
        date_str: str,
    ) -> xr.Dataset:
        """
        Restrict an already-loaded dataset to the requested day.
        """

        if (
            "time" not in ds.dims
            and "time" not in ds.coords
        ):
            return ds

        requested = pd.Timestamp(date_str)

        day = ds.sel(
            time=slice(
                requested,
                requested + pd.Timedelta(days=1),
            )
        )

        return day

    # ==================================================================
    # Helper: select surface current depth
    # ==================================================================

    @staticmethod
    def _select_surface_depth(
        da: xr.DataArray,
        name: str,
    ) -> xr.DataArray:
        """
        Select the native current level nearest to 0 m.

        No vertical extrapolation is performed.

        The depth dimension is explicitly removed from the returned
        DataArray.
        """

        if "depth" not in da.dims:

            print(
                f"[PREPROCESS] {name}: "
                "no depth dimension; using variable directly"
            )

            return da

        depths = np.asarray(
            da["depth"].values,
            dtype=float,
        )

        if depths.size == 0:
            raise ValueError(
                f"{name}: depth coordinate is empty."
            )

        index = int(
            np.abs(depths - 0.0).argmin()
        )

        selected_depth = float(
            depths[index]
        )

        if abs(selected_depth) > 5.0:
            raise ValueError(
                f"{name}: nearest available depth is "
                f"{selected_depth:.3f} m, which is more than "
                "5 m from the required surface level."
            )

        print(
            f"[PREPROCESS] {name}: using native surface depth "
            f"{selected_depth:.3f} m"
        )

        # IMPORTANT:
        # drop=True removes the depth dimension.
        return da.isel(
            depth=index,
            drop=True,
        )

    # ==================================================================
    # Helper: remove singleton dimensions
    # ==================================================================

    @staticmethod
    def _remove_singleton_dimensions(
        da: xr.DataArray,
        name: str,
        allowed_dims: tuple[str, ...] = (
            "time",
            "latitude",
            "longitude",
        ),
    ) -> xr.DataArray:
        """
        Remove dimensions that are not part of the 2-D surface field
        when they have exactly one element.

        Example:

            (time=2, depth=1, latitude=120, longitude=160)

        becomes:

            (time=2, latitude=120, longitude=160)

        This is particularly important for SSS L4 files, which may carry
        a singleton depth dimension even though the product represents
        surface salinity.

        We NEVER silently remove a non-singleton dimension.

        If an unexpected dimension has size > 1, inference fails loudly.
        """

        for dim in list(da.dims):

            if dim in allowed_dims:
                continue

            size = da.sizes.get(dim)

            if size == 1:

                print(
                    f"[PREPROCESS] {name}: removing singleton "
                    f"dimension '{dim}'"
                )

                da = da.isel(
                    {dim: 0},
                    drop=True,
                )

            else:

                raise ValueError(
                    f"{name}: unexpected dimension '{dim}' "
                    f"has size {size}. "
                    "Only singleton non-spatial dimensions "
                    "may be removed during surface preprocessing."
                )

        return da

    # ==================================================================
    # Helper: extract variable
    # ==================================================================

    @staticmethod
    def _dataset_variable(
        ds: xr.Dataset,
        variable: str,
        channel_name: str,
    ) -> xr.DataArray:
        """
        Extract a required DataArray with a useful error message.
        """

        if variable not in ds.data_vars:
            raise KeyError(
                f"{channel_name}: required variable "
                f"'{variable}' was not found. "
                f"Available variables: {list(ds.data_vars)}"
            )

        return ds[variable]

    # ==================================================================
    # Helper: missing SSS
    # ==================================================================

    @staticmethod
    def _missing_sss_template(
        sst: xr.DataArray,
    ) -> xr.DataArray:
        """
        Create an all-NaN SSS field using SST's spatial/time shape.

        No SSS value is fabricated.
        """

        template = xr.full_like(
            sst,
            np.nan,
            dtype=np.float32,
        )

        template.name = "sss"

        return template

    # ==================================================================
    # Main preprocessing
    # ==================================================================

    def preprocess(
        self,
        date_str: str,
        raw_datasets: Dict[
            str,
            Optional[xr.Dataset],
        ],
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Convert raw surface observations into:

            physical_array -> (7, H, W)
            missing_masks  -> (7, H, W)

        Physical channel order:

            SST
            SSS
            SSH
            Current_U
            Current_V
            Wind_U
            Wind_V
        """

        print(
            f"[PREPROCESS] Starting inference preprocessing "
            f"for {date_str}"
        )

        canonical_time = pd.DatetimeIndex(
            [pd.Timestamp(date_str)]
        )

        # ==============================================================
        # 1. Validate mandatory source datasets
        # ==============================================================

        mandatory_sources = [
            "sst",
            "ssh",
            "currents",
            "winds",
        ]

        for source in mandatory_sources:

            ds = raw_datasets.get(source)

            if ds is None:

                raise RuntimeError(
                    f"Required surface dataset '{source}' "
                    f"is unavailable for {date_str}."
                )

        # ==============================================================
        # 2. Restrict all available datasets to requested date
        # ==============================================================

        datasets: Dict[
            str,
            xr.Dataset,
        ] = {}

        for key, ds in raw_datasets.items():

            if ds is None:
                continue

            datasets[key] = self._select_requested_day(
                ds,
                date_str,
            )

        # ==============================================================
        # 3. SST
        # ==============================================================

        sst_spec = self.prep_config.source_files["sst"]

        sst_raw = self._dataset_variable(
            datasets["sst"],
            sst_spec.expected_variable,
            "SST",
        )

        if (
            sst_spec.units_conversion
            == "kelvin_to_celsius"
        ):

            sst = sst_raw - 273.15

        else:

            sst = sst_raw

        # Remove unexpected singleton dimensions.
        sst = self._remove_singleton_dimensions(
            sst,
            "SST",
        )

        sst = _range_filter(
            sst,
            self.prep_config.qc.sst_min,
            self.prep_config.qc.sst_max,
        )

        sst.name = "sst"

        print(
            "[PREPROCESS] SST prepared: "
            f"dims={sst.dims}, "
            f"sizes={dict(sst.sizes)}"
        )

        # ==============================================================
        # 4. SSH
        # ==============================================================

        ssh_spec = self.prep_config.source_files["ssh"]

        ssh_raw = self._dataset_variable(
            datasets["ssh"],
            ssh_spec.expected_variable,
            "SSH",
        )

        ssh = self._remove_singleton_dimensions(
            ssh_raw,
            "SSH",
        )

        ssh = _range_filter(
            ssh,
            self.prep_config.qc.ssh_min,
            self.prep_config.qc.ssh_max,
        )

        ssh.name = "ssh"

        print(
            "[PREPROCESS] SSH prepared: "
            f"dims={ssh.dims}, "
            f"sizes={dict(ssh.sizes)}"
        )

        # ==============================================================
        # 5. Currents
        #
        # Extract uo/vo and REMOVE depth before regridding.
        # ==============================================================

        currents = datasets["currents"]

        current_u_raw = self._dataset_variable(
            currents,
            "uo",
            "Current_U",
        )

        current_v_raw = self._dataset_variable(
            currents,
            "vo",
            "Current_V",
        )

        current_u_raw = self._select_surface_depth(
            current_u_raw,
            "Current_U",
        )

        current_v_raw = self._select_surface_depth(
            current_v_raw,
            "Current_V",
        )

        current_u = _range_filter(
            current_u_raw,
            self.prep_config.qc.current_min,
            self.prep_config.qc.current_max,
        )

        current_v = _range_filter(
            current_v_raw,
            self.prep_config.qc.current_min,
            self.prep_config.qc.current_max,
        )

        current_u = self._remove_singleton_dimensions(
            current_u,
            "Current_U",
        )

        current_v = self._remove_singleton_dimensions(
            current_v,
            "Current_V",
        )

        current_u.name = "current_u"
        current_v.name = "current_v"

        print(
            "[PREPROCESS] Current_U prepared: "
            f"dims={current_u.dims}, "
            f"sizes={dict(current_u.sizes)}"
        )

        print(
            "[PREPROCESS] Current_V prepared: "
            f"dims={current_v.dims}, "
            f"sizes={dict(current_v.sizes)}"
        )

        # ==============================================================
        # 6. Winds
        # ==============================================================

        winds = datasets["winds"]

        wind_u_raw = self._dataset_variable(
            winds,
            "eastward_wind",
            "Wind_U",
        )

        wind_v_raw = self._dataset_variable(
            winds,
            "northward_wind",
            "Wind_V",
        )

        is_hourly = (
            self.prep_config
            .source_files["winds"]
            .temporal_resolution
            == "hourly"
        )

        if is_hourly:

            min_obs = (
                self.prep_config
                .wind_min_hourly_obs_per_day
            )

            print(
                "[PREPROCESS] Resampling hourly winds "
                f"to daily mean "
                f"({min_obs}/24 minimum coverage)"
            )

            wind_u_daily = _resample_hourly_winds(
                wind_u_raw,
                min_obs,
            )

            wind_v_daily = _resample_hourly_winds(
                wind_v_raw,
                min_obs,
            )

        else:

            wind_u_daily = wind_u_raw
            wind_v_daily = wind_v_raw

        wind_u = _range_filter(
            wind_u_daily,
            self.prep_config.qc.wind_min,
            self.prep_config.qc.wind_max,
        )

        wind_v = _range_filter(
            wind_v_daily,
            self.prep_config.qc.wind_min,
            self.prep_config.qc.wind_max,
        )

        wind_u = self._remove_singleton_dimensions(
            wind_u,
            "Wind_U",
        )

        wind_v = self._remove_singleton_dimensions(
            wind_v,
            "Wind_V",
        )

        wind_u.name = "wind_u"
        wind_v.name = "wind_v"

        print(
            "[PREPROCESS] Wind_U prepared: "
            f"dims={wind_u.dims}, "
            f"sizes={dict(wind_u.sizes)}"
        )

        print(
            "[PREPROCESS] Wind_V prepared: "
            f"dims={wind_v.dims}, "
            f"sizes={dict(wind_v.sizes)}"
        )

        # ==============================================================
        # 7. SSS
        #
        # IMPORTANT:
        #
        # Your sss_bob_full.nc currently has:
        #
        #     time=2
        #     depth=1
        #     latitude=120
        #     longitude=160
        #
        # SSS is a surface product, so the singleton depth dimension
        # must be removed before regridding.
        # ==============================================================

        sss_ds = datasets.get("sss")

        if sss_ds is not None:

            sss_spec = self.prep_config.source_files["sss"]

            sss_raw = self._dataset_variable(
                sss_ds,
                sss_spec.expected_variable,
                "SSS",
            )

            print(
                "[PREPROCESS] SSS raw: "
                f"dims={sss_raw.dims}, "
                f"sizes={dict(sss_raw.sizes)}"
            )

            # ----------------------------------------------------------
            # Remove singleton depth.
            #
            # This converts:
            #
            # (time, depth, latitude, longitude)
            #
            # into:
            #
            # (time, latitude, longitude)
            # ----------------------------------------------------------

            sss_raw = self._remove_singleton_dimensions(
                sss_raw,
                "SSS",
            )

            sss = _range_filter(
                sss_raw,
                self.prep_config.qc.sss_min,
                self.prep_config.qc.sss_max,
            )

            sss.name = "sss"

            print(
                "[PREPROCESS] SSS available for "
                f"{date_str}: "
                f"dims={sss.dims}, "
                f"sizes={dict(sss.sizes)}"
            )

        else:

            # Explicit missingness.
            sss = self._missing_sss_template(
                sst
            )

            print(
                "[PREPROCESS] SSS unavailable for "
                f"{date_str}; using explicit missing mask"
            )

        # ==============================================================
        # 8. Build exact dictionary expected by the existing
        #    regrid_surface_variables() implementation.
        # ==============================================================

        qc_vars = {
            "sst": sst,
            "sss": sss,
            "ssh": ssh,
            "current_u": current_u,
            "current_v": current_v,
            "wind_u": wind_u,
            "wind_v": wind_v,
        }

        print(
            "[PREPROCESS] Prepared seven physical surface channels."
        )

        # ==============================================================
        # 9. Existing training regrid implementation
        # ==============================================================

        try:

            surface_common = regrid_surface_variables(
                qc_vars,
                self.common_lat,
                self.common_lon,
                canonical_time,
                interp_method=(
                    self.prep_config
                    .interpolation_method
                ),
            )

        except Exception as exc:

            print(
                "[PREPROCESS] Error in surface regridding: "
                f"{exc}"
            )

            raise

        print(
            "[PREPROCESS] Regridding returned successfully."
        )

        print(
            "[PREPROCESS] Regridded variables:",
            list(surface_common.data_vars),
        )

        print(
            "[PREPROCESS] Regridded dataset sizes:",
            dict(surface_common.sizes),
        )

        # ==============================================================
        # 10. Extract physical channels in EXACT training order
        # ==============================================================

        physical_channels = []

        print(
            "[PREPROCESS] Final channel shapes before stacking:"
        )

        for channel in PHYSICAL_CHANNELS:

            if channel not in surface_common.data_vars:

                raise RuntimeError(
                    f"Regridded surface dataset is missing "
                    f"physical channel '{channel}'. "
                    f"Available variables: "
                    f"{list(surface_common.data_vars)}"
                )

            da = surface_common[channel]

            print(
                f"  {channel}: "
                f"dims={da.dims}, "
                f"sizes={dict(da.sizes)}"
            )

            # ----------------------------------------------------------
            # Select exactly one requested time.
            # ----------------------------------------------------------

            if "time" in da.dims:

                time_size = da.sizes.get(
                    "time",
                    0,
                )

                if time_size != 1:

                    raise RuntimeError(
                        f"{channel}: expected exactly one "
                        f"time slice after regridding, "
                        f"got {time_size}"
                    )

                da = da.isel(
                    time=0,
                    drop=True,
                )

            # ----------------------------------------------------------
            # Remove any remaining singleton dimensions.
            #
            # This is an additional defensive check. The main SSS fix
            # already happens before regridding.
            # ----------------------------------------------------------

            da = self._remove_singleton_dimensions(
                da,
                channel,
                allowed_dims=(
                    "latitude",
                    "longitude",
                ),
            )

            value = np.asarray(
                da.values,
                dtype=np.float32,
            )

            print(
                f"      numpy shape={value.shape}"
            )

            # ----------------------------------------------------------
            # Every physical channel must now be exactly 2D.
            # ----------------------------------------------------------

            if value.ndim != 2:

                raise RuntimeError(
                    f"{channel}: expected a 2D "
                    f"(latitude, longitude) field after "
                    f"time/depth selection, "
                    f"got shape {value.shape}"
                )

            physical_channels.append(
                value
            )

        # ==============================================================
        # 11. Explicit shape validation before np.stack()
        # ==============================================================

        channel_shapes = {
            channel: array.shape
            for channel, array in zip(
                PHYSICAL_CHANNELS,
                physical_channels,
            )
        }

        print(
            "[PREPROCESS] Channel shape summary:"
        )

        for channel, shape in channel_shapes.items():

            print(
                f"  {channel}: {shape}"
            )

        unique_shapes = set(
            channel_shapes.values()
        )

        if len(unique_shapes) != 1:

            raise RuntimeError(
                "Physical channel shapes do not match "
                "before stacking.\n"
                + "\n".join(
                    f"{channel}: {shape}"
                    for channel, shape
                    in channel_shapes.items()
                )
            )

        # ==============================================================
        # 12. Stack seven physical channels
        # ==============================================================

        physical_array = np.stack(
            physical_channels,
            axis=0,
        ).astype(
            np.float32
        )

        # ==============================================================
        # 13. Build explicit validity masks
        #
        # 1 = valid observation
        # 0 = missing / invalid
        # ==============================================================

        missing_masks = (
            np.isfinite(
                physical_array
            )
        ).astype(
            np.float32
        )

        # ==============================================================
        # 14. Final exact inference contract
        # ==============================================================

        expected_shape = (
            7,
            len(self.common_lat),
            len(self.common_lon),
        )

        if physical_array.shape != expected_shape:

            raise RuntimeError(
                "Invalid physical-array shape.\n"
                f"Expected: {expected_shape}\n"
                f"Received: {physical_array.shape}\n"
                f"Channels: {channel_shapes}"
            )

        if missing_masks.shape != expected_shape:

            raise RuntimeError(
                "Invalid missing-mask shape.\n"
                f"Expected: {expected_shape}\n"
                f"Received: {missing_masks.shape}"
            )

        if not np.all(
            np.isfinite(
                missing_masks
            )
        ):

            raise RuntimeError(
                "Missing masks contain non-finite values."
            )

        print(
            "[PREPROCESS] Inference preprocessing complete:"
        )

        print(
            f"  physical={physical_array.shape}"
        )

        print(
            f"  masks={missing_masks.shape}"
        )

        print(
            "[PREPROCESS] Valid fraction by channel:"
        )

        for index, channel in enumerate(
            PHYSICAL_CHANNELS
        ):

            valid_fraction = float(
                missing_masks[index].mean()
            )

            print(
                f"  {channel}: "
                f"{valid_fraction * 100:.2f}%"
            )

        return (
            physical_array,
            missing_masks,
        )


preprocessing_service = PreprocessingService()