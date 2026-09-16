from __future__ import annotations

from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from ..config import settings


class ArgoService:
    """
    Read-only ARGO observation service.

    ARGO is used ONLY for independent observation/validation.
    It is never passed into the ANTARBODH CNN inference pipeline.
    """

    REQUIRED_COLUMNS = {
        "longitude",
        "latitude",
        "time",
        "pres",
        "temp",
        "temp_qc",
        "temp_adjusted",
        "temp_adjusted_qc",
        "data_mode",
        "platform_number",
        "cycle_number",
    }

    def __init__(self) -> None:
        self._data: pd.DataFrame | None = None
        self._csv_path: Path | None = None

    # ---------------------------------------------------------
    # File discovery
    # ---------------------------------------------------------

    def _find_csv(self) -> Path:
        argo_root = Path(settings.argo_data_root)

        if not argo_root.exists():
            raise FileNotFoundError(
                f"ARGO data directory does not exist: {argo_root}"
            )

        csv_files = sorted(argo_root.glob("*.csv"))

        if not csv_files:
            raise FileNotFoundError(
                f"No ARGO CSV found in {argo_root}"
            )

        if len(csv_files) > 1:
            # Prefer the explicitly configured file if available.
            configured = getattr(settings, "argo_csv_path", None)

            if configured:
                configured_path = Path(configured)

                if configured_path.exists():
                    return configured_path

            raise RuntimeError(
                "Multiple ARGO CSV files found. "
                "Set argo_csv_path in backend configuration."
            )

        return csv_files[0]

    # ---------------------------------------------------------
    # Load / cache
    # ---------------------------------------------------------

    def load(self) -> pd.DataFrame:
        if self._data is not None:
            return self._data

        csv_path = self._find_csv()

        print(f"Loading ARGO observations from {csv_path}")

        # ERDDAP CSV downloads commonly contain a units row
        # immediately below the header.
        df = pd.read_csv(
            csv_path,
            skiprows=[1],
            low_memory=False,
        )

        missing = self.REQUIRED_COLUMNS - set(df.columns)

        if missing:
            raise RuntimeError(
                "ARGO CSV is missing required columns: "
                + ", ".join(sorted(missing))
            )

        # -----------------------------------------------------
        # Normalize columns
        # -----------------------------------------------------

        numeric_columns = [
            "longitude",
            "latitude",
            "pres",
            "temp",
            "temp_qc",
            "temp_adjusted",
            "temp_adjusted_qc",
            "cycle_number",
        ]

        for column in numeric_columns:
            df[column] = pd.to_numeric(
                df[column],
                errors="coerce",
            )

        df["time"] = pd.to_datetime(
            df["time"],
            errors="coerce",
            utc=True,
        )

        df["platform_number"] = (
            df["platform_number"]
            .astype(str)
            .str.strip()
        )

        df["data_mode"] = (
            df["data_mode"]
            .astype(str)
            .str.strip()
        )

        # -----------------------------------------------------
        # Basic validity
        # -----------------------------------------------------

        df = df[
            np.isfinite(df["latitude"])
            & np.isfinite(df["longitude"])
            & np.isfinite(df["pres"])
            & np.isfinite(df["time"].astype("int64"))
        ].copy()

        # Prototype domain restriction.
        df = df[
            (df["latitude"] >= settings.lat_min)
            & (df["latitude"] <= settings.lat_max)
            & (df["longitude"] >= settings.lon_min)
            & (df["longitude"] <= settings.lon_max)
        ].copy()

        # -----------------------------------------------------
        # Choose temperature source
        #
        # Priority:
        #   1. adjusted temperature + QC=1
        #   2. raw temperature + QC=1
        # -----------------------------------------------------

        adjusted_valid = (
            (df["temp_adjusted_qc"] == 1)
            & np.isfinite(df["temp_adjusted"])
        )

        raw_valid = (
            (df["temp_qc"] == 1)
            & np.isfinite(df["temp"])
        )

        df["temperature_used"] = np.nan
        df["temperature_source"] = ""

        df.loc[adjusted_valid, "temperature_used"] = (
            df.loc[adjusted_valid, "temp_adjusted"]
        )

        df.loc[adjusted_valid, "temperature_source"] = "adjusted"

        raw_fallback = (
            ~adjusted_valid
            & raw_valid
        )

        df.loc[raw_fallback, "temperature_used"] = (
            df.loc[raw_fallback, "temp"]
        )

        df.loc[raw_fallback, "temperature_source"] = "raw"

        df = df[
            np.isfinite(df["temperature_used"])
        ].copy()

        # ARGO pressure is expressed in dbar.
        # For this prototype we use pressure numerically as
        # an approximate depth coordinate when comparing with
        # ANTARBODH's depth levels.
        df["depth_m_approx"] = df["pres"]

        df["date"] = df["time"].dt.strftime("%Y-%m-%d")

        # Stable profile identifier.
        df["profile_id"] = (
            df["platform_number"].astype(str)
            + "_"
            + df["cycle_number"].fillna(-1).astype(int).astype(str)
        )

        # Sort once so later profile queries are deterministic.
        df = df.sort_values(
            ["time", "platform_number", "cycle_number", "pres"]
        ).reset_index(drop=True)

        self._data = df
        self._csv_path = csv_path

        print(
            f"ARGO loaded: {len(df):,} valid temperature observations "
            f"from {df['profile_id'].nunique():,} profiles."
        )

        return df

    # ---------------------------------------------------------
    # Distance
    # ---------------------------------------------------------

    @staticmethod
    def haversine_km(
        lat1: float,
        lon1: float,
        lat2: np.ndarray | float,
        lon2: np.ndarray | float,
    ) -> np.ndarray:
        """
        Great-circle distance in kilometres.
        """

        lat1_rad = np.radians(lat1)
        lon1_rad = np.radians(lon1)

        lat2_rad = np.radians(lat2)
        lon2_rad = np.radians(lon2)

        dlat = lat2_rad - lat1_rad
        dlon = lon2_rad - lon1_rad

        a = (
            np.sin(dlat / 2.0) ** 2
            + np.cos(lat1_rad)
            * np.cos(lat2_rad)
            * np.sin(dlon / 2.0) ** 2
        )

        return 6371.0088 * 2.0 * np.arcsin(
            np.sqrt(np.clip(a, 0.0, 1.0))
        )

    # ---------------------------------------------------------
    # Profile lookup
    # ---------------------------------------------------------

    def get_profile(
        self,
        date: str,
        lat: float,
        lon: float,
        max_distance_km: float = 100.0,
        date_tolerance_days: int = 1,
    ) -> dict[str, Any] | None:

        df = self.load()

        requested_date = pd.Timestamp(
            date,
            tz="UTC",
        )

        start = requested_date - pd.Timedelta(
            days=date_tolerance_days
        )

        end = requested_date + pd.Timedelta(
            days=date_tolerance_days + 1
        )

        candidates = df[
            (df["time"] >= start)
            & (df["time"] < end)
        ].copy()

        if candidates.empty:
            return None

        # -----------------------------------------------------
        # Create one candidate record per ARGO profile.
        # -----------------------------------------------------

        profiles: list[dict[str, Any]] = []

        for profile_id, group in candidates.groupby(
            "profile_id",
            sort=False,
        ):
            profile_lat = float(group["latitude"].median())
            profile_lon = float(group["longitude"].median())

            distance = float(
                self.haversine_km(
                    lat,
                    lon,
                    profile_lat,
                    profile_lon,
                )
            )

            time_delta = (
                group["time"]
                .sub(requested_date)
                .abs()
                .min()
                .total_seconds()
            )

            profiles.append(
                {
                    "profile_id": profile_id,
                    "group": group,
                    "latitude": profile_lat,
                    "longitude": profile_lon,
                    "distance_km": distance,
                    "time_delta_seconds": time_delta,
                }
            )

        if not profiles:
            return None

        profiles = [
            item
            for item in profiles
            if item["distance_km"] <= max_distance_km
        ]

        if not profiles:
            return None

        # Prefer spatial proximity, then temporal proximity.
        profiles.sort(
            key=lambda item: (
                item["distance_km"],
                item["time_delta_seconds"],
            )
        )

        selected = profiles[0]
        group = selected["group"].copy()

        group = group.sort_values("pres")

        observations = []

        for _, row in group.iterrows():
            observations.append(
                {
                    "pressure_dbar": float(row["pres"]),
                    "depth_m_approx": float(row["depth_m_approx"]),
                    "temperature_degC": float(
                        row["temperature_used"]
                    ),
                    "temperature_source": str(
                        row["temperature_source"]
                    ),
                    "qc": 1,
                    "time": row["time"].isoformat(),
                }
            )

        first_row = group.iloc[0]

        return {
            "available": True,
            "date_requested": date,
            "date_observed": first_row["time"].strftime(
                "%Y-%m-%d"
            ),
            "latitude": selected["latitude"],
            "longitude": selected["longitude"],
            "distance_km": selected["distance_km"],
            "platform_number": str(
                first_row["platform_number"]
            ),
            "cycle_number": (
                int(first_row["cycle_number"])
                if np.isfinite(first_row["cycle_number"])
                else None
            ),
            "profile_id": selected["profile_id"],
            "observations": observations,
            "source": "IFREMER GDAC ARGO",
            "usage": "independent_validation",
        }

    # ---------------------------------------------------------
    # Single-depth observation
    # ---------------------------------------------------------

    def get_observation(
        self,
        date: str,
        lat: float,
        lon: float,
        depth_m: float,
        max_distance_km: float = 100.0,
        date_tolerance_days: int = 1,
        max_depth_difference_m: float = 25.0,
    ) -> dict[str, Any]:

        df = self.load()

        requested_date = pd.Timestamp(
            date,
            tz="UTC",
        )

        start = requested_date - pd.Timedelta(
            days=date_tolerance_days
        )

        end = requested_date + pd.Timedelta(
            days=date_tolerance_days + 1
        )

        candidates = df[
            (df["time"] >= start)
            & (df["time"] < end)
        ].copy()

        if candidates.empty:
            return {
                "available": False,
                "reason": "No ARGO observations near the requested date.",
            }

        candidates["distance_km"] = self.haversine_km(
            lat,
            lon,
            candidates["latitude"].to_numpy(),
            candidates["longitude"].to_numpy(),
        )

        candidates["depth_difference_m"] = (
            candidates["depth_m_approx"] - depth_m
        ).abs()

        candidates = candidates[
            (candidates["distance_km"] <= max_distance_km)
            & (
                candidates["depth_difference_m"]
                <= max_depth_difference_m
            )
        ].copy()

        if candidates.empty:
            return {
                "available": False,
                "reason": (
                    "No suitable ARGO observation within "
                    f"{max_distance_km:.0f} km and "
                    f"{max_depth_difference_m:.0f} m of the request."
                ),
            }

        # Favor depth match first, then spatial proximity,
        # then temporal proximity.
        candidates["time_difference_seconds"] = (
            candidates["time"]
            .sub(requested_date)
            .abs()
            .dt.total_seconds()
        )

        candidates = candidates.sort_values(
            [
                "depth_difference_m",
                "distance_km",
                "time_difference_seconds",
            ]
        )

        row = candidates.iloc[0]

        return {
            "available": True,
            "date_requested": date,
            "date_observed": row["time"].strftime("%Y-%m-%d"),
            "latitude": float(row["latitude"]),
            "longitude": float(row["longitude"]),
            "distance_km": float(row["distance_km"]),
            "requested_depth_m": float(depth_m),
            "depth_m_approx": float(row["depth_m_approx"]),
            "pressure_dbar": float(row["pres"]),
            "temperature_degC": float(
                row["temperature_used"]
            ),
            "temperature_source": str(
                row["temperature_source"]
            ),
            "qc": 1,
            "platform_number": str(
                row["platform_number"]
            ),
            "cycle_number": (
                int(row["cycle_number"])
                if np.isfinite(row["cycle_number"])
                else None
            ),
            "source": "IFREMER GDAC ARGO",
            "usage": "independent_validation",
        }


argo_service = ArgoService()