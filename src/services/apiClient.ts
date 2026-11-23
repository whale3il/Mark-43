export const API_BASE_URL = 'http://localhost:5000/api';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    field?: string;
  } | string;
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

  let formattedBody: BodyInit | null | undefined;

  if (options.body !== undefined && options.body !== null) {
    if (
      typeof options.body === 'string' ||
      options.body instanceof FormData
    ) {
      formattedBody = options.body;
    } else {
      formattedBody = JSON.stringify(options.body);
    }
  }

  if (
    formattedBody !== undefined &&
    !(formattedBody instanceof FormData) &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json');
  }

  headers.set('Accept', 'application/json');

  try {
    const response = await fetch(url, {
      ...options,

      // Allow browser to send and receive HttpOnly cookies.
      credentials: 'include',

      headers,
      body: formattedBody,
    });

    const isJson = response.headers
      .get('content-type')
      ?.includes('application/json');

    const result = isJson
      ? await response.json()
      : null;

    if (!response.ok || result?.success === false) {
      return {
        success: false,
        error: {
          code:
            result?.error?.code ||
            `HTTP_${response.status}`,

          message:
            typeof result?.error === 'string'
              ? result.error
              : result?.error?.message ||
                result?.message ||
                `Request failed with status ${response.status}`,
        },
      };
    }

    return {
      success: true,
      data: result?.data !== undefined
        ? result.data
        : result,
      message: result?.message,
    };

  } catch (err: any) {
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message:
          err?.message ||
          'Unable to connect to gateway.',
      },
    };
  }
}