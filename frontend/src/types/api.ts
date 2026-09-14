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
  shape: [number, number]; // [lat, lon]
  latitudes: number[];
  longitudes: number[];
  temperature_grid: (number | null)[][];
  min_temp: number | null;
  max_temp: number | null;
  timestamp: string;
}

export interface ProfileResponse {
  date: string;
  latitude: number;
  longitude: number;
  depths: number[];
  temperatures: (number | null)[];
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
  current_speed: VariableObservation;
  wind_speed: VariableObservation;
}

export interface SelectedLocation {
  lat: number;
  lon: number;
}
