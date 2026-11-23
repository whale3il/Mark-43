import { STAFF_CONFIG } from '../config/staffConfig';

import type {
  StaffApiError,
  StaffApiResult,
} from '../types/staff.types';

/**
 * Allow development mock fallback only when the backend
 * is unreachable or an endpoint is genuinely unavailable.
 *
 * Never use mock fallback for authentication failures,
 * permission errors, validation errors, or server failures.
 */
export function isDevMockFallbackEligible(
  error?: StaffApiError
): boolean {
  if (!import.meta.env.DEV || !error) {
    return false;
  }

  // Never replace authentication or permission errors with mock data.
  if (
    error.status === 400 ||
    error.status === 401 ||
    error.status === 403 ||
    error.status === 422
  ) {
    return false;
  }

  return (
    error.code === 'NETWORK_ERROR' ||
    error.unimplemented === true
  );
}

/**
 * Global unauthorized-session listeners.
 */
type UnauthorizedListener = (reason?: string) => void;

const unauthorizedListeners = new Set<UnauthorizedListener>();

export function onStaffUnauthorized(
  listener: UnauthorizedListener
): () => void {
  unauthorizedListeners.add(listener);

  return () => {
    unauthorizedListeners.delete(listener);
  };
}

/**
 * Notify subscribed components when a staff session expires.
 */
function notifyUnauthorized(reason?: string): void {
  unauthorizedListeners.forEach((listener) => {
    try {
      listener(reason);
    } catch {
      // Prevent one listener from interrupting others.
    }
  });
}

/**
 * Additional request options supported by the Staff API client.
 */
export interface StaffRequestOptions extends RequestInit {
  skipUnauthorizedEvent?: boolean;
}

/**
 * Central HTTP client for the WhalesVault Staff Portal.
 *
 * Authentication is managed by the Express backend using
 * HTTP-only cookies and PostgreSQL-backed staff sessions.
 *
 * No access tokens are stored in localStorage.
 */
export async function staffApiRequest<T = unknown>(
  endpoint: string,
  options: StaffRequestOptions = {}
): Promise<StaffApiResult<T>> {
  const {
    skipUnauthorizedEvent = false,
    ...fetchOptions
  } = options;

  // Normalize relative API paths.
  const rawPath = endpoint.startsWith('/')
    ? endpoint
    : `/${endpoint}`;

  const path = rawPath.startsWith('/api/')
    ? rawPath.slice(4)
    : rawPath;

  const url = `${STAFF_CONFIG.apiBaseUrl}${path}`;

  // Prepare HTTP headers.
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
    /**
     * Send request to WhalesVault Express backend.
     *
     * credentials: 'include' allows the browser to send
     * the HTTP-only staff session cookie automatically.
     */
    const response = await fetch(url, {
      ...fetchOptions,
      credentials: 'include',
      headers,
    });

    const contentType =
      response.headers.get('content-type') || '';

    const isJson =
      contentType.includes('application/json') ||
      contentType.includes('+json');

    let parsed: any = null;
    let jsonParseFailed = false;

    if (isJson) {
      try {
        parsed = await response.json();
      } catch {
        jsonParseFailed = true;
      }
    }

    /**
     * 401 — Staff session expired or authentication failed.
     */
    if (response.status === 401) {
      const code =
        parsed?.error?.code ||
        parsed?.code ||
        'SESSION_EXPIRED';

      const message =
        parsed?.error?.message ||
        parsed?.message ||
        'Your WhalesVault staff session has expired. Please sign in again.';

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

    /**
     * 403 — Authenticated but not authorized.
     */
    if (response.status === 403) {
      return {
        success: false,
        error: {
          code:
            parsed?.error?.code ||
            parsed?.code ||
            'ACCESS_DENIED',

          message:
            parsed?.error?.message ||
            parsed?.message ||
            'You do not have permission to perform this operation.',

          status: 403,
        },
      };
    }

    /**
     * Handle other unsuccessful HTTP responses.
     */
    if (!response.ok) {
      const status = response.status;

      // These responses indicate a potentially missing API endpoint.
      // A 404 may also mean a missing resource, so callers should
      // avoid automatically substituting mock data.
      const unimplemented =
        status === 404 ||
        status === 501 ||
        (status === 405 && !isJson);

      return {
        success: false,
        error: {
          code:
            parsed?.error?.code ||
            parsed?.code ||
            (unimplemented
              ? 'ENDPOINT_UNAVAILABLE'
              : `HTTP_${status}`),

          message:
            parsed?.error?.message ||
            parsed?.message ||
            (unimplemented
              ? `WhalesVault API endpoint ${url} is unavailable.`
              : `Request failed with HTTP status ${status}.`),

          status,

          field:
            parsed?.error?.field ||
            parsed?.field,

          unimplemented,
        },
      };
    }

    /**
     * Handle valid empty responses such as HTTP 204.
     */
    if (response.status === 204 || response.status === 205) {
      return {
        success: true,
        data: undefined as T,
      };
    }

    /**
     * Ensure successful responses contain valid JSON.
     */
    if (!isJson || jsonParseFailed) {
      return {
        success: false,
        error: {
          code: 'INVALID_API_RESPONSE',
          message:
            `WhalesVault API endpoint ${url} did not return valid JSON.`,
          status: response.status,
        },
      };
    }

    /**
     * Handle backend responses that explicitly report failure.
     */
    if (parsed?.success === false) {
      return {
        success: false,
        error: {
          code:
            parsed?.error?.code ||
            parsed?.code ||
            'REQUEST_FAILED',

          message:
            parsed?.error?.message ||
            parsed?.message ||
            'The WhalesVault request could not be completed.',

          status: response.status,

          field:
            parsed?.error?.field ||
            parsed?.field,
        },
      };
    }

    /**
     * Extract successful response data.
     */
    const data =
      parsed?.data !== undefined
        ? parsed.data
        : parsed;

    return {
      success: true,
      data: data as T,
      message: parsed?.message,
    };
  } catch (err: unknown) {
    /**
     * Distinguish cancelled requests from network failures.
     */
    if (err instanceof Error && err.name === 'AbortError') {
      return {
        success: false,
        error: {
          code: 'REQUEST_ABORTED',
          message: 'The request was cancelled.',
        },
      };
    }

    const message =
      err instanceof Error
        ? err.message
        : 'Unable to reach the WhalesVault Staff API.';

    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message,
      },
    };
  }
}