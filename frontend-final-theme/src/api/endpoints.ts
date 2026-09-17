import { apiClient } from './client';

import type {
  HealthResponse,
  MetadataResponse,
  AvailabilityResponse,
  TemperatureFieldResponse,
  ProfileResponse,
  ValidationReportResponse,
  HistoricalTemperatureSeriesResponse,
  PredictionAvailabilityResponse,
  PredictionProfileResponse,

} from '../types/api';

import type {
  ArgoProfileResponse,
  ArgoObservationResponse,
} from '../types/api';

export const api = {

  getPredictionAvailability: (
    date: string,
  ) =>
    apiClient<PredictionAvailabilityResponse>(
      `/api/prediction/availability?date=${encodeURIComponent(date)}`,
      undefined,
      30000,
    ),

  getPrediction: (
    date: string,
    lat: number,
    lon: number,
  ) =>
    apiClient<PredictionProfileResponse>(
      `/api/prediction/reconstruct?date=${encodeURIComponent(
        date,
      )}&lat=${encodeURIComponent(
        lat,
      )}&lon=${encodeURIComponent(
        lon,
      )}`,
      undefined,
      120000,
    ),

  getArgoProfile: (
    date: string,
    lat: number,
    lon: number,
  ) =>
    apiClient<ArgoProfileResponse>(
      `/api/argo/profile?date=${encodeURIComponent(date)}&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`,
      undefined,
      30000,
    ),

  getArgoObservation: (
    date: string,
    lat: number,
    lon: number,
    depth: number,
  ) =>
    apiClient<ArgoObservationResponse>(
      `/api/argo/observation?date=${encodeURIComponent(date)}&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&depth=${encodeURIComponent(depth)}`,
      undefined,
      10000,
    ),

  getHistoricalTemperatureSeries: (
    depth: number,
  ) =>
    apiClient<HistoricalTemperatureSeriesResponse>(
      `/api/historical/temperature-series?depth=${encodeURIComponent(depth)}`,
      undefined,
      120000,
    ),
  getHealth: (
    timeoutMs = 5000,
    signal?: AbortSignal,
  ) =>
    apiClient<HealthResponse>(
      import.meta.env.VITE_HEALTH_ENDPOINT || '/api/health',
      undefined,
      timeoutMs,
      signal,
    ),

  getMetadata: () =>
    apiClient<MetadataResponse>('/api/metadata'),

  getAvailability: (date: string) =>
    apiClient<AvailabilityResponse>(
      `/api/availability?date=${encodeURIComponent(date)}`,
    ),

  getTemperature: (
    date: string,
    depth: number,
    mode: 'auto' | 'historical' | 'predict' = 'auto',
  ) =>
    apiClient<TemperatureFieldResponse>(
      `/api/temperature?date=${encodeURIComponent(date)}&depth=${encodeURIComponent(depth)}&mode=${encodeURIComponent(mode)}`,
      undefined,
      mode === 'predict' ? 120000 : 30000,
    ),

  getProfile: (
    date: string,
    lat: number,
    lon: number,
    mode: 'auto' | 'historical' | 'predict' = 'auto',
  ) =>
    apiClient<ProfileResponse>(
      `/api/profile?date=${encodeURIComponent(date)}&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&mode=${encodeURIComponent(mode)}`,
      undefined,
      mode === 'predict' ? 120000 : 30000,
    ),

  getValidationReport: () =>
    apiClient<ValidationReportResponse>(
      '/api/validation/report',
    ),
};