import { ADMIN_CONFIG } from '../config/adminConfig';
import { AdminApiError, AdminApiResult } from '../types/admin.types';

/**
 * Returns true ONLY during Vite development (`import.meta.env.DEV`) when a backend
 * endpoint is unreachable or unimplemented. Never masks 401/403/400/422/500 responses
 * and never triggers in production builds.
 */
export function isDevMockFallbackEligible(error?: AdminApiError): boolean {
  if (typeof import.meta === 'undefined' || !import.meta.env?.DEV) {
    return false;
  }
  if (!error || error.forbidden) return false;
  return Boolean(error.unimplemented || error.code === 'NETWORK_ERROR');
}

type UnauthorizedListener = (reason?: string) => void;
const unauthorizedListeners = new Set<UnauthorizedListener>();

export function onAdminUnauthorized(listener: UnauthorizedListener): () => void {
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

export interface AdminRequestOptions extends RequestInit {
  /** Skip broadcasting global session-expired event (used by signin or initial session probe). */
  skipUnauthorizedEvent?: boolean;
}

export async function adminApiRequest<T = unknown>(
  endpoint: string,
  options: AdminRequestOptions = {}
): Promise<AdminApiResult<T>> {
  const { skipUnauthorizedEvent = false, ...fetchOptions } = options;
  const rawPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const path = rawPath.startsWith('/api/') ? rawPath.slice(4) : rawPath;
  const url = `${ADMIN_CONFIG.apiBaseUrl}${path}`;

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
        'Your administrator session expired. Please sign in again.';
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

    if (response.status === 403) {
      return {
        success: false,
        error: {
          code: parsed?.error?.code || parsed?.code || 'ACCESS_DENIED',
          message:
            parsed?.error?.message ||
            parsed?.message ||
            'Administrator permission denied for this operation (`requireAdminPermission`).',
          status: 403,
          forbidden: true,
        },
      };
    }

    if (!response.ok) {
      const isHtmlFallback =
        !isJson && (response.status === 404 || response.status === 405);
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
      return {
        success: false,
        error: {
          code: 'ENDPOINT_UNAVAILABLE',
          message: `API endpoint ${url} did not return JSON. Ensure the Express Admin backend is connected.`,
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
        : 'Unable to reach Aureus Admin Gateway API.';
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message,
      },
    };
  }
}
