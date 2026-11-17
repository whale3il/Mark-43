import { ADMIN_CONFIG } from '../config/adminConfig';
import {
  AdminApiResult,
  AdminPermissions,
  AdminProfile,
  AdminSessionState,
} from '../types/admin.types';
import { adminApiRequest } from './adminApiClient';

export function normalizeAdminPermissions(raw: any): AdminPermissions {
  const perms = raw?.permissions || raw?.adminProfile || raw || {};
  return {
    canManageStaff: Boolean(perms.canManageStaff ?? perms.can_manage_staff),
    canAssignTickets: Boolean(perms.canAssignTickets ?? perms.can_assign_tickets),
    canViewReports: Boolean(perms.canViewReports ?? perms.can_view_reports),
  };
}

export function normalizeAdminProfile(raw: any): AdminProfile {
  const name =
    raw?.name ||
    raw?.fullName ||
    [raw?.firstName, raw?.lastName].filter(Boolean).join(' ') ||
    raw?.email ||
    'Aureus Administrator';

  const parts = String(name).trim().split(/\s+/);
  const initials =
    raw?.initials ||
    (parts.length >= 2
      ? `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase()
      : name.slice(0, 2).toUpperCase());

  const permissions = normalizeAdminPermissions(raw);

  const defaultAccessLevel =
    permissions.canManageStaff &&
    permissions.canAssignTickets &&
    permissions.canViewReports
      ? 'Full Operations (L4)'
      : 'Restricted Operations';

  return {
    id: String(raw?.id || raw?.adminId || raw?.userId || ''),
    email: String(raw?.email || ''),
    name,
    initials,
    role: String(raw?.role || raw?.title || 'Platform Administrator'),
    accessLevel: String(raw?.accessLevel || raw?.access_level || defaultAccessLevel),
    department: String(raw?.department || 'Executive Operations'),
    office: raw?.office,
    permissions,
  };
}

export const adminAuthService = {
  /**
   * Restores active HTTP-only `aureus_admin_session` cookie session via GET /api/admin/me.
   */
  async restoreSession(): Promise<AdminApiResult<AdminSessionState>> {
    let res = await adminApiRequest<any>(ADMIN_CONFIG.endpoints.auth.session, {
      method: 'GET',
      skipUnauthorizedEvent: true,
    });

    if (!res.success && res.error?.unimplemented) {
      res = await adminApiRequest<any>(
        ADMIN_CONFIG.endpoints.auth.sessionFallback,
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
          message: 'No active administrator session.',
        },
      };
    }

    const rawAdmin =
      res.data.admin || res.data.adminProfile || res.data.user || res.data;
    if (!rawAdmin || (!rawAdmin.id && !rawAdmin.email)) {
      return {
        success: false,
        error: {
          code: 'INVALID_SESSION_PAYLOAD',
          message: 'Session response missing verified administrator identity.',
        },
      };
    }

    return {
      success: true,
      data: {
        admin: normalizeAdminProfile(rawAdmin),
        expiresAt: res.data.expiresAt,
      },
    };
  },

  /**
   * Authenticates administrator email/password via POST /api/admin/auth/signin.
   * Backend sets HTTP-only `aureus_admin_session` cookie backed by PostgreSQL `AdminSession`.
   */
  async signIn(payload: {
    email: string;
    password: string;
  }): Promise<AdminApiResult<AdminSessionState>> {
    const res = await adminApiRequest<any>(ADMIN_CONFIG.endpoints.auth.signIn, {
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

    const rawAdmin =
      res.data?.admin || res.data?.adminProfile || res.data?.user || res.data;
    if (rawAdmin && (rawAdmin.id || rawAdmin.email)) {
      return {
        success: true,
        data: {
          admin: normalizeAdminProfile(rawAdmin),
          expiresAt: res.data?.expiresAt,
        },
      };
    }

    return this.restoreSession();
  },

  /**
   * Renews an active administrator cookie session when supported by backend.
   */
  async renewSession(): Promise<AdminApiResult<AdminSessionState>> {
    const res = await adminApiRequest<any>(ADMIN_CONFIG.endpoints.auth.renew, {
      method: 'POST',
      skipUnauthorizedEvent: true,
    });
    if (!res.success) {
      return { success: false, error: res.error };
    }
    return this.restoreSession();
  },

  /**
   * Revokes PostgreSQL AdminSession and clears HTTP-only cookie via POST /api/admin/auth/logout.
   */
  async signOut(): Promise<AdminApiResult<void>> {
    return adminApiRequest<void>(ADMIN_CONFIG.endpoints.auth.logout, {
      method: 'POST',
      skipUnauthorizedEvent: true,
    });
  },
};
