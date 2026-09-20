import { handleResponse } from './errors';

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:8000'
).replace(/\/$/, '');

export async function apiClient<T>(
  endpoint: string,
  options?: RequestInit,
  timeoutMs = 15000,
  externalSignal?: AbortSignal,
): Promise<T> {
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${normalizedEndpoint}`;

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    signal: externalSignal ?? controller.signal,
  };

  const config: RequestInit = {
    ...defaultOptions,
    ...options,
  };

  try {
    const response = await fetch(url, config);
    return await handleResponse(response);
  } catch (error) {
    if (
      error instanceof DOMException &&
      error.name === 'AbortError'
    ) {
      throw new Error(
        `API request timed out after ${timeoutMs / 1000}s.`,
      );
    }

    if (
      error instanceof TypeError &&
      error.message === 'Failed to fetch'
    ) {
      throw new Error(
        `Unable to reach the ANTARBODH backend at ${API_BASE_URL}. ` +
        'Start FastAPI on port 8000 and verify /api/health is reachable.',
      );
    }

    throw error;
  } finally {
    if (!externalSignal) {
      window.clearTimeout(timeoutId);
    }
  }
}
