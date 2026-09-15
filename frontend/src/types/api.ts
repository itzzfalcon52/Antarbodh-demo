export interface HealthResponse {
  status: string;
  model_loaded: boolean;
  model_id: string;
  historical_data_available: boolean;
  prediction_service_available: boolean;
}

export interface DomainMetadata {
  lat_min: number;
  lat_max: number;
  lon_min: number;
  lon_max: number;
  resolution: number;
}

export interface PolicyMetadata {
  allow_partial_inputs: boolean;
  max_missing_physical_channels: number;
  mandatory_channels: string[];
}

export interface MetadataResponse {
  model_id: string;
  input_channels: number;
  target_depths: number[];
  domain: DomainMetadata;
  policy: PolicyMetadata;
}

export interface InputStatus {
  available: boolean;
  source?: string;
  reason?: string;
}

export interface AvailabilityResponse {
  date: string;
  prediction_possible: boolean;
  input_completeness: "complete" | "partial" | "insufficient";
  inputs: Record<string, InputStatus>;
  missing_inputs: string[];
  reason: string;
}

export interface TemperatureFieldResponse {
  mode: "historical" | "on_demand_prediction";
  date: string;
  depth_m: number;
  units: string;
  latitude: number[];
  longitude: number[];
  temperature: (number | null)[][];
  model_id: string;
  cached: boolean;
  provenance?: string;
}

export interface ProfileResponse {
  mode: "historical" | "on_demand_prediction";
  date: string;
  latitude: number;
  longitude: number;
  depths_m: number[];
  temperature_degC: (number | null)[];
  cached: boolean;
  provenance?: string;
}

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
