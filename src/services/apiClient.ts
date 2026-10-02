/**
 * Aureus Private Bank - Frontend API Client
 * Clean HTTP client connection point for separate real backend.
 */

export const API_BASE_URL = (typeof process !== 'undefined' && process.env?.VITE_API_URL) || '/api';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    field?: string;
  };
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }
  headers.set('Accept', 'application/json');

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    const isJson = response.headers.get('content-type')?.includes('application/json');
    const result = isJson ? await response.json() : null;

    if (!response.ok) {
      return {
        success: false,
        error: {
          code: result?.error?.code || result?.code || `HTTP_${response.status}`,
          message: result?.error?.message || result?.message || `Request failed with status ${response.status}`,
          field: result?.error?.field || result?.field
        }
      };
    }

    return {
      success: true,
      data: result?.data !== undefined ? result.data : result,
      message: result?.message
    };
  } catch (err: any) {
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: err?.message || 'Unable to connect to private banking gateway API.'
      }
    };
  }
}
