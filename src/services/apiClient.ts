/**
 * Aureus Private Bank - Frontend API Client
 * Uses backend-managed HTTP-only cookies (`credentials: 'include'`), never localStorage tokens.
 */

function normalizeApiBaseUrl(raw?: string): string {
  const trimmed = String(raw || '').trim().replace(/\/+$/, '');
  if (!trimmed) return '/api';
  if (trimmed === '/api' || trimmed.endsWith('/api')) return trimmed;
  return `${trimmed}/api`;
}

export const API_BASE_URL = normalizeApiBaseUrl(
  typeof import.meta !== 'undefined' && import.meta.env
    ? import.meta.env.VITE_API_URL
    : undefined
);

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    field?: string;
    status?: number;
    unimplemented?: boolean;
  };
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const rawPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const path = rawPath.startsWith('/api/') ? rawPath.slice(4) : rawPath;
  const url = `${API_BASE_URL}${path}`;

  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }
  headers.set('Accept', 'application/json');

  try {
    const response = await fetch(url, {
      ...options,
      credentials: 'include',
      headers,
    });

    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    let result: Record<string, any> | null = null;
    if (isJson) {
      try {
        result = await response.json();
      } catch {
        result = null;
      }
    }

    if (!response.ok) {
      const isHtmlFallback = !isJson && (response.status === 404 || response.status === 405);
      const unimplemented =
        response.status === 404 ||
        response.status === 501 ||
        response.status === 502 ||
        response.status === 503 ||
        response.status === 504 ||
        isHtmlFallback;

      return {
        success: false,
        error: {
          code:
            result?.error?.code ||
            result?.code ||
            (unimplemented ? 'ENDPOINT_UNAVAILABLE' : `HTTP_${response.status}`),
          message:
            result?.error?.message ||
            result?.message ||
            (unimplemented
              ? `Backend endpoint ${url} is not active in this environment.`
              : `Request failed with status ${response.status}`),
          field: result?.error?.field || result?.field,
          status: response.status,
          unimplemented,
        },
      };
    }

    if (!isJson) {
      return {
        success: false,
        error: {
          code: 'ENDPOINT_UNAVAILABLE',
          message: `API endpoint ${url} returned a non-JSON response.`,
          status: response.status,
          unimplemented: true,
        },
      };
    }

    return {
      success: true,
      data: result?.data !== undefined ? result.data : (result as T),
      message: result?.message,
    };
  } catch (err: any) {
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: err?.message || 'Unable to connect to private banking gateway API.',
      },
    };
  }
}
