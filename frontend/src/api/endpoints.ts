import { apiClient } from './client';
import type { 
  HealthResponse, 
  MetadataResponse, 
  AvailabilityResponse, 
  TemperatureFieldResponse, 
  ProfileResponse,
  ValidationReportResponse
} from '../types/api';

export const api = {
  getHealth: () => 
    apiClient<HealthResponse>('/api/health'),
    
  getMetadata: () => 
    apiClient<MetadataResponse>('/api/metadata'),
    
  getAvailability: (date: string) => 
    apiClient<AvailabilityResponse>(`/api/availability?date=${date}`),
    
  getTemperature: (date: string, depth: number, mode: 'auto' | 'historical' | 'predict' = 'auto') => 
    apiClient<TemperatureFieldResponse>(`/api/temperature?date=${date}&depth=${depth}&mode=${mode}`),
    
  getProfile: (date: string, lat: number, lon: number, mode: 'auto' | 'historical' | 'predict' = 'auto') => 
    apiClient<ProfileResponse>(`/api/profile?date=${date}&lat=${lat}&lon=${lon}&mode=${mode}`),
    
  getValidationReport: () =>
    apiClient<ValidationReportResponse>('/api/validation/report'),
};
