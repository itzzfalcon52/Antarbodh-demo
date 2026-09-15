from typing import Dict, Any
from .surface_data_service import surface_data_service
from ..config import settings

class DataAvailabilityService:
    def check_availability(self, date_str: str) -> Dict[str, Any]:
        """
        Evaluate if surface data is available for the given date according to InferenceAvailabilityPolicy.
        Returns a structured dictionary indicating whether prediction can proceed.
        """
        policy = settings.inference_policy
        adapters = surface_data_service.adapters
        
        inputs_status = {}
        missing_channels = []
        
        # We need to map the 5 adapter folders to the 7 physical channels.
        # sst -> sst
        # sss -> sss
        # ssh -> ssh
        # currents -> current_u, current_v
        # winds -> wind_u, wind_v
        
        channel_to_adapter = {
            "sst": "sst",
            "sss": "sss",
            "ssh": "ssh",
            "current_u": "currents",
            "current_v": "currents",
            "wind_u": "winds",
            "wind_v": "winds"
        }
        
        # First check raw availability by adapter
        adapter_status = {}
        for key, adapter in adapters.items():
            has_data = adapter.has_date(date_str)
            adapter_status[key] = has_data
            
        for ch in channel_to_adapter.keys():
            adapter_key = channel_to_adapter[ch]
            available = adapter_status[adapter_key]
            
            # Record individual channel status
            inputs_status[ch] = {
                "available": available,
                "source": adapters[adapter_key].get_metadata()["source"]
            }
            if not available:
                inputs_status[ch]["reason"] = "No valid observations for requested date"
                missing_channels.append(ch)

        # Apply Policy
        prediction_possible = True
        reason = "Prediction can proceed using complete input."
        completeness = "complete"
        
        if len(missing_channels) > 0:
            completeness = "partial"
            
            if not policy.allow_partial_inputs:
                prediction_possible = False
                reason = "Partial inputs are not allowed by policy."
            elif len(missing_channels) > policy.max_missing_physical_channels:
                prediction_possible = False
                reason = f"Too many missing channels ({len(missing_channels)} > {policy.max_missing_physical_channels})."
            else:
                # Check mandatory channels
                missing_mandatory = [m for m in missing_channels if m in policy.mandatory_channels]
                if missing_mandatory:
                    prediction_possible = False
                    reason = f"Mandatory channels missing: {missing_mandatory}"
                else:
                    reason = "Prediction can proceed using the trained explicit missingness representation."

        if not prediction_possible:
            completeness = "insufficient"

        return {
            "date": date_str,
            "prediction_possible": prediction_possible,
            "input_completeness": completeness,
            "inputs": inputs_status,
            "missing_inputs": missing_channels,
            "reason": reason
        }

data_availability_service = DataAvailabilityService()
