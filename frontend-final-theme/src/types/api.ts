export interface HealthResponse {
  status: string;
  api_online: boolean;

  model_id: string;
  model_loaded: boolean;
  model_ready: boolean;

  checkpoint_exists: boolean;
  device: string;

  version: string;
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

export interface ValidationSample {
  common_matched_observations: number;
  matched_profiles: number;
  matched_floats: number;
}

export interface ValidationOverallMetrics {
  rmse: number;
  mae: number;
  bias: number;
  corr: number;
}

export interface ValidationReportResponse {
  sample: ValidationSample;

  antarbodh_vs_argo: ValidationOverallMetrics;

  glorys_vs_argo: ValidationOverallMetrics;

  per_depth: ValidationDepthMetrics[];

  [key: string]: unknown;
}

export interface HistoricalTemperatureSeriesResponse {
  mode: 'historical';
  model_id: string;
  year: number;

  requested_depth_m: number;
  depth_m: number;

  units: string;

  dates: string[];

  latitude: number[];
  longitude: number[];

  shape: [number, number, number];

  scale_factor: number;
  add_offset: number;

  temperature_encoded: number[][][];
  valid_mask: number[][][];

  source: string;

  provenance: {
    dataset: string;
    temporal_resolution: string;
    spatial_resolution: string;
    domain: string;
  };
}

export interface ArgoObservation {
  pressure_dbar: number;
  depth_m_approx: number;
  temperature_degC: number;
  temperature_source: 'adjusted' | 'raw' | string;
  qc: number;
  time: string;
}

export interface ArgoProfileResponse {
  available: boolean;

  date_requested: string;
  date_observed?: string;

  latitude?: number;
  longitude?: number;

  distance_km?: number;

  platform_number?: string;
  cycle_number?: number | null;
  profile_id?: string;

  observations?: ArgoObservation[];

  reason?: string;

  source: string;
  usage: string;
}

export interface ArgoObservationResponse {
  available: boolean;

  date_requested?: string;
  date_observed?: string;

  latitude?: number;
  longitude?: number;

  distance_km?: number;

  requested_depth_m?: number;
  depth_m_approx?: number;
  pressure_dbar?: number;

  temperature_degC?: number;
  temperature_source?: 'adjusted' | 'raw' | string;

  qc?: number;

  platform_number?: string;
  cycle_number?: number | null;

  reason?: string;

  source: string;
  usage: string;
}
export interface PredictionAvailabilityResponse {
  date: string;
  prediction_possible: boolean;
  input_completeness:
  | 'complete'
  | 'partial'
  | 'insufficient';

  inputs: Record<
    string,
    {
      available: boolean;
      source?: string;
      reason?: string;
    }
  >;

  missing_inputs: string[];

  reason: string;
}


export interface PredictionProfileResponse {
  mode: 'on_demand_prediction';

  date: string;

  requested_latitude: number;
  requested_longitude: number;

  latitude: number;
  longitude: number;

  depths_m: number[];

  temperature_degC: (
    number | null
  )[];

  model_id: string;

  cached: boolean;

  provenance: string;
}