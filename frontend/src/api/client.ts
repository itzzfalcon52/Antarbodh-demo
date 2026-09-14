import type { 
  MetadataResponse, 
  TemperatureSliceResponse, 
  ProfileResponse, 
  SurfaceConditionsResponse 
} from '../types/api';



export class ApiClient {
  private static async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    // In dev, the backend runs on 8000, but in Vite we can set up a proxy.
    const url = `/api${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Accept': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      let message = 'An error occurred';
      try {
        const errorData = await response.json();
        message = errorData.detail || message;
      } catch {
        message = response.statusText;
      }
      throw new Error(message);
    }

    return response.json();
  }

  static async getMetadata(signal?: AbortSignal): Promise<MetadataResponse> {
    return this.fetch<MetadataResponse>('/metadata', { signal });
  }

  static async getTemperatureSlice(date: string, depth: number, signal?: AbortSignal): Promise<TemperatureSliceResponse> {
    return this.fetch<TemperatureSliceResponse>(`/temperature?date=${encodeURIComponent(date)}&depth=${depth}`, { signal });
  }

  static async getProfile(date: string, lat: number, lon: number, signal?: AbortSignal): Promise<ProfileResponse> {
    return this.fetch<ProfileResponse>(`/profile?date=${encodeURIComponent(date)}&lat=${lat}&lon=${lon}`, { signal });
  }

  static async getSurfaceConditions(date: string, lat: number, lon: number, signal?: AbortSignal): Promise<SurfaceConditionsResponse> {
    return this.fetch<SurfaceConditionsResponse>(`/surface?date=${encodeURIComponent(date)}&lat=${lat}&lon=${lon}`, { signal });
  }
  
  static async checkHealth(signal?: AbortSignal): Promise<{ status: string }> {
    return this.fetch<{ status: string }>('/health', { signal });
  }
}
