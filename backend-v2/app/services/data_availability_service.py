from datetime import date as Date
from typing import Dict, Any

import numpy as np

from .test_data_service import test_data_service


class DataAvailabilityService:

    """
    Determines whether ANTARBODH on-demand reconstruction
    can run for a requested date.

    Runtime inference uses the already-preprocessed
    test.nc dataset.

    No raw surface-data adapters are consulted here.

    The availability response preserves the existing
    response structure expected by the frontend.
    """

    # Mapping between the API-facing physical channel names
    # and the corresponding validity-mask channel in test.nc.
    CHANNEL_TO_MASK = {
        "sst": "SST_mask",
        "sss": "SSS_mask",
        "ssh": "SSH_mask",
        "current_u": "Current_U_mask",
        "current_v": "Current_V_mask",
        "wind_u": "Wind_U_mask",
        "wind_v": "Wind_V_mask",
    }

    def _date_is_supported(
        self,
        date_str: str,
    ) -> bool:

        try:
            requested = Date.fromisoformat(
                date_str
            )
        except ValueError:
            return False

        available_dates = (
            test_data_service.get_available_dates()
        )

        return date_str in available_dates

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
        # Check whether preprocessed model input exists
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
                    "available only for dates contained "
                    "in the preprocessed test dataset."
                ),
            }

        # -----------------------------------------------------
        # Load the model-ready X tensor
        # -----------------------------------------------------

        model_input = (
            test_data_service.get_input(
                date_str
            )
        )

        # -----------------------------------------------------
        # Determine physical-channel availability
        #
        # X contains:
        #
        # 0  SST
        # 1  SSS
        # 2  SSH
        # 3  Current_U
        # 4  Current_V
        # 5  Wind_U
        # 6  Wind_V
        #
        # 7  SST_mask
        # 8  SSS_mask
        # 9  SSH_mask
        # 10 Current_U_mask
        # 11 Current_V_mask
        # 12 Wind_U_mask
        # 13 Wind_V_mask
        # -----------------------------------------------------

        channel_mask_indices = {
            "sst": 7,
            "sss": 8,
            "ssh": 9,
            "current_u": 10,
            "current_v": 11,
            "wind_u": 12,
            "wind_v": 13,
        }

        inputs_status: Dict[str, Any] = {}

        missing_channels: list[str] = []

        for channel, mask_index in (
            channel_mask_indices.items()
        ):

            mask = model_input[
                mask_index
            ]

            available = bool(
                np.any(mask > 0)
            )

            status = {
                "available": available,
                "source": "test.nc",
            }

            if not available:

                status["reason"] = (
                    "The preprocessed validity mask "
                    "contains no valid observations "
                    "for this channel on the "
                    "requested date."
                )

                missing_channels.append(
                    channel
                )

            inputs_status[channel] = status

        # -----------------------------------------------------
        # Determine completeness
        # -----------------------------------------------------

        if len(missing_channels) == 0:

            completeness = "complete"

            reason = (
                "A complete preprocessed model input "
                "is available for the requested date."
            )

        else:

            completeness = "partial"

            reason = (
                "A preprocessed model input is available "
                "for the requested date. Some physical "
                "channels contain missing observations, "
                "which are represented explicitly by "
                "the validity-mask channels."
            )

        # -----------------------------------------------------
        # Prediction is possible whenever X exists.
        #
        # The CNN was trained with explicit missingness
        # representation, so raw source availability is
        # no longer used as a runtime blocker.
        # -----------------------------------------------------

        return {
            "date": date_str,
            "prediction_possible": True,
            "input_completeness": completeness,
            "inputs": inputs_status,
            "missing_inputs": missing_channels,
            "reason": reason,
        }


data_availability_service = (
    DataAvailabilityService()
)