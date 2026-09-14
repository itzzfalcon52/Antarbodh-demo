import type { 
  MetadataResponse, 
  TemperatureSliceResponse, 
  ProfileResponse, 
  SurfaceConditionsResponse,
  ValidationSummaryResponse,
  ValidationDepthResponse,
  MatchedProfilesResponse
} from '../types/api'

export class ApiClient {
  private static async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `/api${endpoint}`
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Accept': 'application/json',
        ...options?.headers,
      },
    })

    if (!response.ok) {
      let message = 'An error occurred'
      try {
        const errorData = await response.json()
        message = errorData.detail || message
      } catch {
        message = response.statusText
      }
      throw new Error(message)
    }

    return response.json()
  }

  static async getMetadata(signal?: AbortSignal): Promise<MetadataResponse> {
    try {
      return await this.fetch<MetadataResponse>('/metadata', { signal })
    } catch (err) {
      console.warn('Backend metadata fetch failed, using fallback domain metadata:', err)
      return {
        project_name: "ANTARBODH — AI-Powered Subsurface Ocean Intelligence",
        supported_dates: [
          "2025-01-01", "2025-01-02", "2025-01-03", "2025-01-04", "2025-01-05",
          "2025-02-01", "2025-03-01", "2025-04-01", "2025-05-01", "2025-06-01",
          "2025-07-01", "2025-08-01", "2025-09-01", "2025-10-01", "2025-11-01", "2025-12-31"
        ],
        supported_depths: [0, 5, 10, 20, 30, 50, 75, 100, 125, 150, 200, 300, 500, 700, 1000],
        domain: {
          lat_min: 5.0,
          lat_max: 20.0,
          lon_min: 80.0,
          lon_max: 100.0
        },
        resolution_deg: 0.25,
        variable_names: [
          "temperature", "sst", "sss", "ssh", "current_u", "current_v", "wind_u", "wind_v"
        ],
        units: {
          temperature: "°C",
          sst: "°C",
          sss: "PSU",
          ssh: "m",
          currents: "m/s",
          winds: "m/s",
          depth: "m"
        },
        sss_availability: {
          period: "2025",
          available: false,
          reason: "Level-4 multi-year SSS product terminates Dec 2024; 2025 SSS relies on explicit zero-mask handling"
        },
        model_info: {
          model_id: "antarbodh_cnn_v1_sih2026",
          version: "1.0.0",
          input_channels: ["SST", "SSS", "SSH", "Current_U", "Current_V", "Wind_U", "Wind_V"],
          output_depths: [0, 5, 10, 20, 30, 50, 75, 100, 125, 150, 200, 300, 500, 700, 1000]
        }
      }
    }
  }

  static async getTemperatureSlice(date: string, depth: number, signal?: AbortSignal): Promise<TemperatureSliceResponse> {
    try {
      return await this.fetch<TemperatureSliceResponse>(`/temperature/slice?date=${encodeURIComponent(date)}&depth=${depth}`, { signal })
    } catch {
      return await this.fetch<TemperatureSliceResponse>(`/temperature?date=${encodeURIComponent(date)}&depth=${depth}`, { signal })
    }
  }

  static async getProfile(date: string, lat: number, lon: number, signal?: AbortSignal): Promise<ProfileResponse> {
    try {
      return await this.fetch<ProfileResponse>(`/profile/point?date=${encodeURIComponent(date)}&lat=${lat}&lon=${lon}`, { signal })
    } catch {
      return await this.fetch<ProfileResponse>(`/profile?date=${encodeURIComponent(date)}&lat=${lat}&lon=${lon}`, { signal })
    }
  }

  static async getSurfaceConditions(date: string, lat: number, lon: number, signal?: AbortSignal): Promise<SurfaceConditionsResponse> {
    try {
      return await this.fetch<SurfaceConditionsResponse>(`/surface/conditions?date=${encodeURIComponent(date)}&lat=${lat}&lon=${lon}`, { signal })
    } catch {
      return await this.fetch<SurfaceConditionsResponse>(`/surface?date=${encodeURIComponent(date)}&lat=${lat}&lon=${lon}`, { signal })
    }
  }

  static async getValidationSummary(signal?: AbortSignal): Promise<ValidationSummaryResponse> {
    return this.fetch<ValidationSummaryResponse>('/validation', { signal })
  }

  static async getValidationDepth(signal?: AbortSignal): Promise<ValidationDepthResponse> {
    return this.fetch<ValidationDepthResponse>('/validation/depth', { signal })
  }

  static async getMatchedArgoProfiles(signal?: AbortSignal): Promise<MatchedProfilesResponse> {
    return this.fetch<MatchedProfilesResponse>('/validation/argo/matched', { signal })
  }
  
  static async checkHealth(signal?: AbortSignal): Promise<{ status: string }> {
    return this.fetch<{ status: string }>('/health', { signal })
  }
}
