import { STAFF_CONFIG } from '../config/staffConfig';

import type {
  InviteVerificationData,
  StaffApiResult,
  StaffAvailabilityEnum,
  StaffMemberProfile,
  StaffSessionState,
} from '../types/staff.types';

import { staffApiRequest } from './staffApiClient';

/**
 * Normalize staff availability to values supported
 * by our Prisma StaffProfile model.
 */
export function normalizeAvailability(
  raw?: unknown
): StaffAvailabilityEnum {
  const value = String(raw ?? '')
    .trim()
    .toUpperCase();

  if (
    value === 'ONLINE' ||
    value === 'BUSY' ||
    value === 'AWAY' ||
    value === 'OFFLINE'
  ) {
    return value;
  }

  return 'OFFLINE';
}

/**
 * Convert Express/Prisma staff data into the
 * structure expected by the WhalesVault Staff Portal.
 */
export function normalizeStaffProfile(
  raw: any
): StaffMemberProfile {
  const fullName = [
    raw?.firstName ?? raw?.first_name,
    raw?.lastName ?? raw?.last_name,
  ]
    .filter(Boolean)
    .join(' ');

  const name = String(
    raw?.name ||
    raw?.fullName ||
    fullName ||
    raw?.email ||
    'Staff Member'
  );

  const parts = name.trim().split(/\s+/);

  const initials =
    raw?.initials ||
    (
      parts.length >= 2
        ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
        : name.slice(0, 2).toUpperCase()
    );

  const rawMaxChats = Number(
    raw?.maxChats ??
    raw?.max_chats ??
    STAFF_CONFIG.defaultMaxChats
  );

  const maxChats =
    Number.isFinite(rawMaxChats) && rawMaxChats > 0
      ? rawMaxChats
      : STAFF_CONFIG.defaultMaxChats;

  const rawActiveChats = Number(
    raw?.activeChats ??
    raw?.activeChatsCount ??
    raw?.active_chats ??
    raw?.active_chats_count ??
    raw?.activeConversationsCount ??
    0
  );

  const activeChatsCount =
    Number.isFinite(rawActiveChats)
      ? Math.max(0, rawActiveChats)
      : 0;

  return {
    id: String(raw?.id || raw?.staffId || raw?.userId || ''),

    email: String(raw?.email || ''),

    name,

    initials,

    role: String(raw?.role || 'STAFF'),

    department: String(raw?.department || 'SUPPORT'),

    specialization:
      raw?.specialization ??
      raw?.specialty ??
      undefined,

    avatarUrl:
      raw?.avatarUrl ??
      raw?.avatar_url ??
      undefined,

    availability: normalizeAvailability(
      raw?.availability ?? raw?.staffProfile?.availability
    ),

    maxChats,

    activeChatsCount,

    license: raw?.license,

    office: raw?.office,

    directPhone:
      raw?.directPhone ??
      raw?.direct_phone,

    responseTime:
      raw?.responseTime ??
      raw?.response_time,

    rating:
      typeof raw?.rating === 'number'
        ? raw.rating
        : undefined,

    lastSeenAt:
      raw?.lastSeenAt ??
      raw?.last_seen_at,
  };
}

/**
 * Extract staff identity from supported backend
 * authentication response structures.
 */
function extractStaff(raw: any): any {
  return raw?.staff ?? raw?.user ?? raw;
}

/**
 * Validate the identity supplied by the backend.
 *
 * This is frontend response validation only.
 * Actual authorization remains the responsibility
 * of Express requireStaff middleware.
 */
function isValidStaff(raw: any): boolean {
  return Boolean(
    raw &&
    typeof raw.id === 'string' &&
    raw.id.length > 0 &&
    typeof raw.email === 'string' &&
    raw.email.length > 0 &&
    raw.role === 'STAFF'
  );
}

export const staffAuthService = {
  /**
   * Restore an existing HTTP-only cookie session.
   *
   * Requires a protected backend session endpoint.
   */
  async restoreSession(): Promise<
    StaffApiResult<StaffSessionState>
  > {
    let res = await staffApiRequest<any>(
      STAFF_CONFIG.endpoints.auth.session,
      {
        method: 'GET',
        skipUnauthorizedEvent: true,
      }
    );

    // Temporary compatibility with an alternative
    // backend session endpoint.
    if (
      !res.success &&
      res.error?.unimplemented &&
      res.error.status === 404
    ) {
      res = await staffApiRequest<any>(
        STAFF_CONFIG.endpoints.auth.sessionFallback,
        {
          method: 'GET',
          skipUnauthorizedEvent: true,
        }
      );
    }

    if (!res.success || !res.data) {
      return {
        success: false,
        error: res.error || {
          code: 'NO_SESSION',
          message: 'No active WhalesVault staff session.',
        },
      };
    }

    const rawStaff = extractStaff(res.data);

    if (!isValidStaff(rawStaff)) {
      return {
        success: false,
        error: {
          code: 'INVALID_SESSION_PAYLOAD',
          message:
            'The backend did not return a valid staff identity.',
        },
      };
    }

    return {
      success: true,
      data: {
        staff: normalizeStaffProfile(rawStaff),
        expiresAt: res.data.expiresAt,
      },
    };
  },

  /**
   * Authenticate a staff member using Express
   * and Supabase Auth.
   *
   * Express creates a PostgreSQL-backed session
   * and sets the HTTP-only staff cookie.
   */
  async signIn(payload: {
    email: string;
    password: string;
  }): Promise<StaffApiResult<StaffSessionState>> {
    const res = await staffApiRequest<any>(
      STAFF_CONFIG.endpoints.auth.signIn,
      {
        method: 'POST',
        skipUnauthorizedEvent: true,
        body: JSON.stringify({
          email: payload.email.trim(),
          password: payload.password,
        }),
      }
    );

    if (!res.success) {
      return {
        success: false,
        error: res.error,
      };
    }

    const rawStaff = extractStaff(res.data);

    if (isValidStaff(rawStaff)) {
      return {
        success: true,
        data: {
          staff: normalizeStaffProfile(rawStaff),
          expiresAt: res.data?.expiresAt,
        },
      };
    }

    // Only an authenticated backend session
    // endpoint can establish the staff identity.
    return staffAuthService.restoreSession();
  },

  /**
   * Begin Supabase invitation verification.
   *
   * Our Express backend uses:
   *
   * GET /api/staff/auth/invite
   *   ?token_hash=...
   *   &type=invite
   *
   * The backend verifies the invitation, creates
   * an HTTP-only onboarding cookie, and redirects
   * the browser to /staff/set-password.
   *
   * This is navigation, not a JSON API request.
   */
  async verifyInvite(
    tokenHash?: string
  ): Promise<StaffApiResult<InviteVerificationData>> {
    const trimmed = tokenHash?.trim();

    if (!trimmed) {
      return {
        success: false,
        error: {
          code: 'INVITE_CALLBACK_REQUIRED',
          message:
            'Invitation verification must begin through the secure WhalesVault invitation link.',
        },
      };
    }

    if (typeof window === 'undefined') {
      return {
        success: false,
        error: {
          code: 'BROWSER_REQUIRED',
          message:
            'Invitation verification requires a browser.',
        },
      };
    }

    const query = new URLSearchParams({
      token_hash: trimmed,
      type: 'invite',
    });

    const url =
      `${STAFF_CONFIG.apiBaseUrl}` +
      `${STAFF_CONFIG.endpoints.auth.inviteVerify}` +
      `?${query.toString()}`;

    // Navigate directly so the browser follows
    // the backend's invitation verification redirect.
    window.location.assign(url);

    // This is not proof of verification.
    // The browser is navigating to the backend.
    return {
      success: false,
      error: {
        code: 'INVITE_REDIRECT_STARTED',
        message: 'Opening secure invitation verification.',
      },
    };
  },

  /**
   * Set the password for an invited staff member.
   *
   * The backend reads the secure HTTP-only
   * onboarding cookie.
   *
   * No invitation token needs to be sent
   * in the request body.
   */
  async setPassword(payload: {
    token?: string;
    password: string;
    confirmPassword?: string;
  }): Promise<
    StaffApiResult<{
      authenticated: boolean;
      staff?: StaffMemberProfile;
    }>
  > {
    const password = payload.password;

    const confirmPassword =
      payload.confirmPassword ?? password;

    if (!password || password !== confirmPassword) {
      return {
        success: false,
        error: {
          code: 'PASSWORD_VALIDATION_FAILED',
          message:
            'Password and confirmation must match.',
        },
      };
    }

    const res = await staffApiRequest<any>(
      STAFF_CONFIG.endpoints.auth.setPassword,
      {
        method: 'POST',
        skipUnauthorizedEvent: true,
        body: JSON.stringify({
          password,
          confirmPassword,
        }),
      }
    );

    if (!res.success) {
      return {
        success: false,
        error: res.error,
      };
    }

    return {
      success: true,
      message:
        res.message ||
        'Password configured successfully. Please sign in.',
      data: {
        // Password setup does not create
        // a signed-in staff session.
        authenticated: false,
      },
    };
  },

  /**
   * Revoke the staff session on Express
   * and clear the HTTP-only session cookie.
   */
  async signOut(): Promise<StaffApiResult<void>> {
    return staffApiRequest<void>(
      STAFF_CONFIG.endpoints.auth.logout,
      {
        method: 'POST',
        skipUnauthorizedEvent: true,
      }
    );
  },
};