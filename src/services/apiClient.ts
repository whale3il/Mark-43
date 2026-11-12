export const API_BASE_URL = 'http://localhost:5000/api';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: { code: string; message: string; field?: string } | string;
}

export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  body?: any;
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  headers.set('Accept', 'application/json');

  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('whales_token') || localStorage.getItem('aureus_auth_token');
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  let formattedBody: BodyInit | null | undefined = undefined;
  if (options.body) {
    formattedBody = typeof options.body === 'string' || options.body instanceof FormData
      ? options.body
      : JSON.stringify(options.body);
  }

  try {
    const response = await fetch(url, { ...options, headers, body: formattedBody });
    const isJson = response.headers.get('content-type')?.includes('application/json');
    const result = isJson ? await response.json() : null;

    if (!response.ok) {
      return {
        success: false,
        error: {
          code: result?.error?.code || `HTTP_${response.status}`,
          message: typeof result?.error === 'string' ? result.error : result?.error?.message || `Request failed with status ${response.status}`,
        },
      };
    }

    return {
      success: true,
      data: result?.data !== undefined ? result.data : result,
      message: result?.message,
    };
  } catch (err: any) {
    return {
      success: false,
      error: { code: 'NETWORK_ERROR', message: err?.message || 'Unable to connect to gateway.' },
    };
  }
}