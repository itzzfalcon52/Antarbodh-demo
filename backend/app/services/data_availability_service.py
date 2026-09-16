from datetime import date as Date
from typing import Dict, Any

import numpy as np
import xarray as xr

from .surface_data_service import surface_data_service
from ..config import settings


class DataAvailabilityService:
    """
    Determines whether ANTARBODH on-demand reconstruction
    can run for a requested date.

    Prototype scope:
        2025-01-01 through 2025-12-31

    No fallback data source is used.
    """

    CHANNEL_TO_ADAPTER = {
        "sst": "sst",
        "sss": "sss",
        "ssh": "ssh",
        "current_u": "currents",
        "current_v": "currents",
        "wind_u": "winds",
        "wind_v": "winds",
    }

    def _date_is_supported(self, date_str: str) -> bool:
        try:
            requested = Date.fromisoformat(date_str)
            start = Date.fromisoformat(
                settings.inference_start_date
            )
            end = Date.fromisoformat(
                settings.inference_end_date
            )

            return start <= requested <= end

        except ValueError:
            return False

    @staticmethod
    def _dataset_has_finite_values(
        ds: xr.Dataset | None,
    ) -> bool:

        if ds is None:
            return False

        if not ds.data_vars:
            return False

        for variable in ds.data_vars.values():

            try:
                values = np.asarray(
                    variable.values
                )

                if values.size == 0:
                    continue

                if np.isfinite(values).any():
                    return True

            except Exception:
                continue

        return False

    def check_availability(
        self,
        date_str: str,
    ) -> Dict[str, Any]:

        # -----------------------------------------------------
        # Validate date
        # -----------------------------------------------------

        try:
            Date.fromisoformat(date_str)
        except ValueError:

            return {
                "date": date_str,
                "prediction_possible": False,
                "input_completeness": "insufficient",
                "inputs": {},
                "missing_inputs": [],
                "reason": (
                    "Invalid date. "
                    "Expected YYYY-MM-DD."
                ),
            }

        # -----------------------------------------------------
        # Prototype date window
        # -----------------------------------------------------

        if not self._date_is_supported(
            date_str
        ):

            return {
                "date": date_str,
                "prediction_possible": False,
                "input_completeness": "insufficient",
                "inputs": {},
                "missing_inputs": [],
                "reason": (
                    "ANTARBODH v1 on-demand "
                    "reconstruction is currently "
                    "available only from "
                    f"{settings.inference_start_date} "
                    "to "
                    f"{settings.inference_end_date}."
                ),
            }

        # -----------------------------------------------------
        # Load actual surface datasets
        # -----------------------------------------------------

        raw_datasets = (
            surface_data_service.fetch_all(
                date_str
            )
        )

        adapters = surface_data_service.adapters
        policy = settings.inference_policy

        inputs_status: Dict[str, Any] = {}
        missing_channels: list[str] = []

        # -----------------------------------------------------
        # Inspect each physical channel
        # -----------------------------------------------------

        for channel, adapter_key in (
            self.CHANNEL_TO_ADAPTER.items()
        ):

            ds = raw_datasets.get(
                adapter_key
            )

            available = (
                self._dataset_has_finite_values(
                    ds
                )
            )

            try:
                source = (
                    adapters[
                        adapter_key
                    ]
                    .get_metadata()
                    .get(
                        "source",
                        adapter_key,
                    )
                )
            except Exception:
                source = adapter_key

            status = {
                "available": available,
                "source": source,
            }

            if not available:

                status["reason"] = (
                    "No usable finite observations "
                    "were loaded for this channel "
                    "on the requested date."
                )

                missing_channels.append(
                    channel
                )

            inputs_status[channel] = status

        # -----------------------------------------------------
        # Apply inference policy
        # -----------------------------------------------------

        missing_count = len(
            missing_channels
        )

        prediction_possible = True
        completeness = "complete"

        if missing_count == 0:

            reason = (
                "All required surface observations "
                "are available."
            )

        else:

            completeness = "partial"

            if not policy.allow_partial_inputs:

                prediction_possible = False

                reason = (
                    "Partial inputs are not allowed "
                    "by the inference policy."
                )

            elif (
                missing_count
                > policy.max_missing_physical_channels
            ):

                prediction_possible = False

                reason = (
                    f"Too many missing physical "
                    f"channels "
                    f"({missing_count} > "
                    f"{policy.max_missing_physical_channels})."
                )

            else:

                missing_mandatory = [
                    channel
                    for channel in missing_channels
                    if channel
                    in policy.mandatory_channels
                ]

                if missing_mandatory:

                    prediction_possible = False

                    reason = (
                        "Mandatory surface channels "
                        "are missing: "
                        + ", ".join(
                            missing_mandatory
                        )
                    )

                else:

                    reason = (
                        "Prediction can proceed with "
                        "the trained explicit "
                        "missingness representation."
                    )

        if not prediction_possible:
            completeness = "insufficient"

        return {
            "date": date_str,
            "prediction_possible": prediction_possible,
            "input_completeness": completeness,
            "inputs": inputs_status,
            "missing_inputs": missing_channels,
            "reason": reason,
        }


data_availability_service = (
    DataAvailabilityService()
)