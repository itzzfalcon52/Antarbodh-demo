export interface Domain {
  lat_min: number;
  lat_max: number;
  lon_min: number;
  lon_max: number;
}

export interface Units {
  temperature: string;
  sst: string;
  sss: string;
  ssh: string;
  currents: string;
  winds: string;
  depth: string;
}

export interface ModelInfo {
  model_id: string;
  version: string;
  input_channels: string[];
  output_depths: number[];
}

export interface MetadataResponse {
  project_name: string;
  supported_dates: string[];
  supported_depths: number[];
  domain: Domain;
  resolution_deg: number;
  variable_names: string[];
  units: Units;
  sss_availability: {
    period: string;
    available: boolean;
    reason: string;
  };
  model_info: ModelInfo;
}

export interface TemperatureSliceResponse {
  date: string;
  depth: number;
  units: string;
  latitudes: number[];
  longitudes: number[];
  temperature_grid: (number | null)[][];
  valid_mask?: number[][];
  min_temp: number | null;
  max_temp: number | null;
  mean_temp?: number | null;
}

export interface ProfileResponse {
  date: string;
  latitude: number;
  longitude: number;
  depths: number[];
  temperatures: (number | null)[];
  climatology_temperatures?: (number | null)[];
}

export interface VariableObservation {
  value: number | null;
  units: string;
  available: boolean;
  reason?: string;
}

export interface SurfaceConditionsResponse {
  date: string;
  latitude: number;
  longitude: number;
  sst: VariableObservation;
  sss: VariableObservation;
  ssh: VariableObservation;
  current_u: VariableObservation;
  current_v: VariableObservation;
  wind_u: VariableObservation;
  wind_v: VariableObservation;
  current_speed?: VariableObservation;
  wind_speed?: VariableObservation;
}

export interface SelectedLocation {
  lat: number;
  lon: number;
}

export interface ValidationSample {
  raw_observations: number;
  post_qc_observations: number;
  d_mode_count: number;
  r_mode_count: number;
  common_matched_observations: number;
  retention_rate_pct: number;
  matched_profiles: number;
  matched_floats: number;
}

export interface ModelMetrics {
  rmse: number;
  mae: number;
  bias: number;
  correlation: number;
}

export interface ValidationSummaryResponse {
  model_id: string;
  checkpoint: string;
  argo_source: string;
  period: string;
  sample: ValidationSample;
  antarbodh_vs_argo: ModelMetrics;
  glorys_vs_argo: ModelMetrics;
  rmse_improvement_pct: number;
  mae_improvement_pct: number;
  absolute_bias_reduction: number;
  summary_statement: string;
}

export interface ValidationDepthMetric {
  depth: number;
  n_obs: number;
  antarbodh_rmse: number;
  glorys_rmse: number;
  rmse_improvement_pct: number;
  antarbodh_mae: number;
  glorys_mae: number;
  mae_improvement_pct: number;
  antarbodh_bias: number;
  glorys_bias: number;
  antarbodh_corr: number;
  glorys_corr: number;
  climatology_rmse?: number;
}

export interface ValidationDepthResponse {
  depth_metrics: ValidationDepthMetric[];
}

export interface MatchedProfile {
  profile_id: string;
  platform_number: number;
  cycle_number: number;
  time: string;
  latitude: number;
  longitude: number;
  n_obs: number;
  antarbodh_rmse: number;
  glorys_rmse: number;
  antarbodh_bias: number;
  glorys_bias: number;
  antarbodh_better: boolean;
}

export interface MatchedProfilesResponse {
  total_profiles: number;
  profiles: MatchedProfile[];
}
