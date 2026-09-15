// Add this to the end of types/api.ts
export interface ValidationDepthMetrics {
  depth: number;
  n_obs: number;
  antarbodh_rmse: number;
  glorys_rmse: number;
  antarbodh_mae: number;
  glorys_mae: number;
  antarbodh_bias: number;
  glorys_bias: number;
  antarbodh_corr: number;
  glorys_corr: number;
}

export interface ValidationReportResponse {
  model_id: string;
  argo_source: string;
  sample: {
    common_matched_observations: number;
    matched_profiles: number;
    matched_floats: number;
  };
  antarbodh_vs_argo: {
    rmse: number;
    mae: number;
    bias: number;
    correlation: number;
  };
  glorys_vs_argo: {
    rmse: number;
    mae: number;
    bias: number;
    correlation: number;
  };
  per_depth: ValidationDepthMetrics[];
}
