import { STAFF_CONFIG } from '../config/staffConfig';
import { StaffApiResult } from '../types/staff.types';

type UnauthorizedListener = (reason?: string) => void;
const unauthorizedListeners = new Set<UnauthorizedListener>();

export function onStaffUnauthorized(listener: UnauthorizedListener): () => void {
  unauthorizedListeners.add(listener);
  return () => {
    unauthorizedListeners.delete(listener);
  };
}

function notifyUnauthorized(reason?: string) {
  unauthorizedListeners.forEach((listener) => {
    try {
      listener(reason);
    } catch {
      // Ignore listener exceptions
    }
  });
}

export interface StaffRequestOptions extends RequestInit {
  /** Skip broadcasting global session-expired event (used by signin / invite / initial probe). */
  skipUnauthorizedEvent?: boolean;
}

export async function staffApiRequest<T = unknown>(
  endpoint: string,
  options: StaffRequestOptions = {}
): Promise<StaffApiResult<T>> {
  const { skipUnauthorizedEvent = false, ...fetchOptions } = options;
  const rawPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const path = rawPath.startsWith('/api/') ? rawPath.slice(4) : rawPath;
  const url = `${STAFF_CONFIG.apiBaseUrl}${path}`;

  const headers = new Headers(fetchOptions.headers || {});
  if (
    !headers.has('Content-Type') &&
    fetchOptions.body &&
    typeof fetchOptions.body === 'string'
  ) {
    headers.set('Content-Type', 'application/json');
  }
  headers.set('Accept', 'application/json');

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      credentials: 'include',
      headers,
    });

    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    let parsed: Record<string, any> | null = null;

    if (isJson) {
      try {
        parsed = await response.json();
      } catch {
        parsed = null;
      }
    }

    if (response.status === 401) {
      const code = parsed?.error?.code || parsed?.code || 'SESSION_EXPIRED';
      const message =
        parsed?.error?.message ||
        parsed?.message ||
        'Your staff session has expired. Please sign in again.';
      if (!skipUnauthorizedEvent) {
        notifyUnauthorized(message);
      }
      return {
        success: false,
        error: {
          code,
          message,
          status: 401,
        },
      };
    }

    if (!response.ok) {
      const isHtmlFallback = !isJson && (response.status === 404 || response.status === 405);
      const unimplemented =
        response.status === 404 || response.status === 501 || isHtmlFallback;

      return {
        success: false,
        error: {
          code:
            parsed?.error?.code ||
            parsed?.code ||
            (unimplemented ? 'ENDPOINT_UNAVAILABLE' : `HTTP_${response.status}`),
          message:
            parsed?.error?.message ||
            parsed?.message ||
            (unimplemented
              ? `Backend endpoint ${url} is not active in this environment.`
              : `Request failed with HTTP status ${response.status}.`),
          status: response.status,
          field: parsed?.error?.field || parsed?.field,
          unimplemented,
        },
      };
    }

    if (!isJson) {
      // Vite SPA fallback can serve index.html with 200 OK if /api isn't mounted
      return {
        success: false,
        error: {
          code: 'ENDPOINT_UNAVAILABLE',
          message: `API endpoint ${url} did not return JSON. Ensure the Express Staff backend is connected.`,
          status: response.status,
          unimplemented: true,
        },
      };
    }

    const data = parsed?.data !== undefined ? parsed.data : parsed;
    return {
      success: true,
      data: data as T,
      message: parsed?.message,
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : 'Unable to reach Aureus Staff Gateway API.';
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message,
      },
    };
  }
}
