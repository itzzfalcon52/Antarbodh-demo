"""Pydantic schemas for ARGO vs GLORYS independent validation benchmark."""

from typing import List, Optional
from pydantic import BaseModel

class MetricCohort(BaseModel):
    rmse: float
    mae: float
    bias: float
    correlation: float

class ValidationSample(BaseModel):
    raw_observations: int
    post_qc_observations: int
    d_mode_count: int
    r_mode_count: int
    common_matched_observations: int
    retention_rate_pct: float
    matched_profiles: int
    matched_floats: int

class ValidationSummaryResponse(BaseModel):
    model_id: str
    checkpoint: str
    argo_source: str
    period: str
    sample: ValidationSample
    antarbodh_vs_argo: MetricCohort
    glorys_vs_argo: MetricCohort
    rmse_improvement_pct: float
    mae_improvement_pct: float
    absolute_bias_reduction: float
    summary_statement: str

class DepthMetricItem(BaseModel):
    depth: float
    n_obs: int
    antarbodh_rmse: float
    glorys_rmse: float
    rmse_improvement_pct: float
    antarbodh_mae: float
    glorys_mae: float
    mae_improvement_pct: float
    antarbodh_bias: float
    glorys_bias: float
    antarbodh_corr: float
    glorys_corr: float

class ValidationDepthResponse(BaseModel):
    depth_metrics: List[DepthMetricItem]
