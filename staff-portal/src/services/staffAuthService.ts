import { STAFF_CONFIG } from '../config/staffConfig';
import {
  InviteVerificationData,
  StaffApiResult,
  StaffAvailabilityEnum,
  StaffMemberProfile,
  StaffSessionState,
} from '../types/staff.types';
import { staffApiRequest } from './staffApiClient';

export function normalizeAvailability(raw?: unknown): StaffAvailabilityEnum {
  const val = String(raw || '').trim().toUpperCase();
  if (val === 'ONLINE' || val === 'BUSY' || val === 'AWAY' || val === 'OFFLINE') {
    return val;
  }
  return 'OFFLINE';
}

export function normalizeStaffProfile(raw: any): StaffMemberProfile {
  const name = raw?.name || raw?.fullName || raw?.email || 'Staff Specialist';
  const parts = String(name).trim().split(/\s+/);
  const initials =
    raw?.initials ||
    (parts.length >= 2
      ? `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase()
      : name.slice(0, 2).toUpperCase());

  return {
    id: String(raw?.id || raw?.staffId || ''),
    email: String(raw?.email || ''),
    name,
    role: String(raw?.role || raw?.title || 'Support Specialist'),
    department: String(raw?.department || 'Private Wealth Support'),
    specialization: raw?.specialization || raw?.specialty || undefined,
    initials,
    avatarUrl: raw?.avatarUrl || raw?.avatar_url || undefined,
    availability: normalizeAvailability(raw?.availability ?? raw?.status),
    maxChats: Number(raw?.maxChats ?? raw?.max_chats ?? STAFF_CONFIG.defaultMaxChats) || STAFF_CONFIG.defaultMaxChats,
    activeChatsCount: Number(
      raw?.activeChatsCount ??
        raw?.active_chats_count ??
        raw?.activeConversationsCount ??
        0
    ),
    license: raw?.license,
    office: raw?.office,
    directPhone: raw?.directPhone || raw?.direct_phone,
    responseTime: raw?.responseTime || raw?.response_time,
    rating: typeof raw?.rating === 'number' ? raw.rating : undefined,
    lastSeenAt: raw?.lastSeenAt || raw?.last_seen_at,
  };
}

export const staffAuthService = {
  /**
   * Restores active cookie-backed staff session from verified backend endpoint.
   */
  async restoreSession(): Promise<StaffApiResult<StaffSessionState>> {
    let res = await staffApiRequest<any>(STAFF_CONFIG.endpoints.auth.session, {
      method: 'GET',
      skipUnauthorizedEvent: true,
    });

    if (!res.success && res.error?.unimplemented) {
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
          message: 'No active staff session.',
        },
      };
    }

    const rawStaff = res.data.staff || res.data.user || res.data;
    if (!rawStaff || (!rawStaff.id && !rawStaff.email)) {
      return {
        success: false,
        error: {
          code: 'INVALID_SESSION_PAYLOAD',
          message: 'Session response missing verified staff identity.',
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
   * Authenticates staff user and receives HTTP-only session cookie.
   */
  async signIn(payload: {
    email: string;
    password: string;
  }): Promise<StaffApiResult<StaffSessionState>> {
    const res = await staffApiRequest<any>(STAFF_CONFIG.endpoints.auth.signIn, {
      method: 'POST',
      skipUnauthorizedEvent: true,
      body: JSON.stringify({
        email: payload.email.trim(),
        password: payload.password,
      }),
    });

    if (!res.success) {
      return {
        success: false,
        error: res.error,
      };
    }

    const rawStaff = res.data?.staff || res.data?.user || res.data;
    if (rawStaff && (rawStaff.id || rawStaff.email)) {
      return {
        success: true,
        data: {
          staff: normalizeStaffProfile(rawStaff),
          expiresAt: res.data?.expiresAt,
        },
      };
    }

    // Some cookie auth endpoints return { ok: true } and require /me follow-up
    return this.restoreSession();
  },

  /**
   * Verifies a staff onboarding invitation via GET /api/staff/auth/invite (query token or onboarding cookie).
   */
  async verifyInvite(
    token?: string
  ): Promise<StaffApiResult<InviteVerificationData>> {
    const trimmed = token?.trim();
    const path = trimmed
      ? `${STAFF_CONFIG.endpoints.auth.inviteVerify}?${new URLSearchParams({ token: trimmed }).toString()}`
      : STAFF_CONFIG.endpoints.auth.inviteVerify;

    const res = await staffApiRequest<any>(path, {
      method: 'GET',
      skipUnauthorizedEvent: true,
    });

    if (!res.success || !res.data) {
      return {
        success: false,
        error: res.error,
      };
    }

    return {
      success: true,
      data: {
        valid: res.data.valid !== false,
        email: res.data.email,
        name: res.data.name,
        department: res.data.department,
        role: res.data.role,
        expiresAt: res.data.expiresAt,
        message: res.data.message,
      },
    };
  },

  /**
   * Submits password setup for an invited staff member via POST /api/staff/auth/set-password.
   * Uses HTTP-only onboarding cookie (`credentials: 'include'`) and optional token if present.
   */
  async setPassword(payload: {
    token?: string;
    password: string;
    confirmPassword?: string;
  }): Promise<StaffApiResult<{ authenticated: boolean; staff?: StaffMemberProfile }>> {
    const bodyPayload: Record<string, string> = {
      password: payload.password,
      confirmPassword: payload.confirmPassword ?? payload.password,
    };
    if (payload.token?.trim()) {
      bodyPayload.token = payload.token.trim();
    }

    const res = await staffApiRequest<any>(
      STAFF_CONFIG.endpoints.auth.setPassword,
      {
        method: 'POST',
        skipUnauthorizedEvent: true,
        body: JSON.stringify(bodyPayload),
      }
    );

    if (!res.success) {
      return {
        success: false,
        error: res.error,
      };
    }

    const rawStaff = res.data?.staff || res.data?.user;
    return {
      success: true,
      message: res.message || 'Password configured successfully.',
      data: {
        authenticated: Boolean(res.data?.authenticated || rawStaff),
        staff: rawStaff ? normalizeStaffProfile(rawStaff) : undefined,
      },
    };
  },

  /**
   * Terminates HTTP-only staff cookie session via POST /api/staff/auth/logout.
   */
  async signOut(): Promise<StaffApiResult<void>> {
    return staffApiRequest<void>(STAFF_CONFIG.endpoints.auth.logout, {
      method: 'POST',
      skipUnauthorizedEvent: true,
    });
  },
};
