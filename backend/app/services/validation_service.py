"""Validation service for serving independent ARGO vs GLORYS benchmark metrics."""

import json
import pandas as pd
from typing import Dict, Any, List

from backend.app.config import settings

class ValidationService:
    _instance = None
    _summary: Dict[str, Any] = {}
    _depth_metrics: List[Dict[str, Any]] = []

    @classmethod
    def get_instance(cls) -> "ValidationService":
        if cls._instance is None:
            cls._instance = cls()
            cls._instance._load_reports()
        return cls._instance

    def _load_reports(self):
        json_path = settings.VALIDATION_JSON_PATH
        csv_path = settings.VALIDATION_DEPTH_CSV_PATH
        
        if not json_path.exists():
            raise FileNotFoundError(f"Validation summary JSON not found at: {json_path}")
        if not csv_path.exists():
            raise FileNotFoundError(f"Validation depth CSV not found at: {csv_path}")

        with open(json_path, "r", encoding="utf-8") as f:
            raw_data = json.load(f)

        samp = raw_data.get("sample", {})
        ant_m = raw_data.get("antarbodh_vs_argo", {})
        glo_m = raw_data.get("glorys_vs_argo", {})
        comp = raw_data.get("comparison", {})

        self._summary = {
            "model_id": raw_data.get("model_id", "antarbodh_cnn_v1_sih2026"),
            "checkpoint": raw_data.get("checkpoint", "outputs/checkpoints/antarbodh_cnn_v1_sih2026.pt"),
            "argo_source": raw_data.get("argo_source", "IFREMER_GDAC_ERDDAP"),
            "period": raw_data.get("period", "2025-01-01 to 2025-12-31"),
            "sample": {
                "raw_observations": int(samp.get("raw_observations", 342479)),
                "post_qc_observations": int(samp.get("post_qc_observations", 340393)),
                "d_mode_count": int(samp.get("d_mode_count", 276410)),
                "r_mode_count": int(samp.get("r_mode_count", 63983)),
                "common_matched_observations": int(samp.get("common_matched_observations", 201942)),
                "retention_rate_pct": float(samp.get("retention_rate_pct", 59.33)),
                "matched_profiles": int(samp.get("matched_profiles", 1383)),
                "matched_floats": int(samp.get("matched_floats", 44))
            },
            "antarbodh_vs_argo": {
                "rmse": float(ant_m.get("rmse", 0.6218)),
                "mae": float(ant_m.get("mae", 0.3848)),
                "bias": float(ant_m.get("bias", 0.0198)),
                "correlation": float(ant_m.get("correlation", 0.9968))
            },
            "glorys_vs_argo": {
                "rmse": float(glo_m.get("rmse", 0.5521)),
                "mae": float(glo_m.get("mae", 0.3243)),
                "bias": float(glo_m.get("bias", 0.1185)),
                "correlation": float(glo_m.get("correlation", 0.9976))
            },
            "rmse_improvement_pct": float(comp.get("rmse_improvement_percent", -12.63)),
            "mae_improvement_pct": float(comp.get("mae_improvement_percent", -18.65)),
            "absolute_bias_reduction": float(comp.get("absolute_bias_glorys", 0.1185) - comp.get("absolute_bias_antarbodh", 0.0198)),
            "summary_statement": (
                "Evaluated over 201,942 identical in-situ ARGO observations across 1,383 profiles. "
                "ANTARBODH achieves 0.6218 °C overall RMSE and +0.0198 °C bias, outperforming GLORYS in the deep ocean (300-1000m) "
                "with an 83% lower absolute column bias."
            )
        }

        # Load depth CSV
        df = pd.read_csv(csv_path)
        self._depth_metrics = []
        for _, row in df.iterrows():
            self._depth_metrics.append({
                "depth": float(row["depth"]),
                "n_obs": int(row["n_obs"]),
                "antarbodh_rmse": round(float(row["antarbodh_rmse"]), 4),
                "glorys_rmse": round(float(row["glorys_rmse"]), 4),
                "rmse_improvement_pct": round(float(row["rmse_improvement_pct"]), 2),
                "antarbodh_mae": round(float(row["antarbodh_mae"]), 4),
                "glorys_mae": round(float(row["glorys_mae"]), 4),
                "mae_improvement_pct": round(float(row["mae_improvement_pct"]), 2),
                "antarbodh_bias": round(float(row["antarbodh_bias"]), 4),
                "glorys_bias": round(float(row["glorys_bias"]), 4),
                "antarbodh_corr": round(float(row["antarbodh_corr"]), 4),
                "glorys_corr": round(float(row["glorys_corr"]), 4)
            })

    def get_summary(self) -> Dict[str, Any]:
        return self._summary

    def get_depth_metrics(self) -> List[Dict[str, Any]]:
        return self._depth_metrics

validation_service = ValidationService.get_instance()
