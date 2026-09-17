import { handleResponse } from './errors';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:8000';

export async function apiClient<T>(
  endpoint: string,
  options?: RequestInit,
  timeoutMs = 15000,
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const controller = new AbortController();

  const timeoutId = window.setTimeout(
    () => controller.abort(),
    timeoutMs,
  );

  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    signal: controller.signal,
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
        'Network error. Ensure the ANTARBODH backend is running on port 8000.',
      );
    }

    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}