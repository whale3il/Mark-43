/**
 * WhalesVault Staff Portal — Independent Application Configuration
 *
 * Authentication uses HTTP-only cookies through Express.
 * Requests use credentials: 'include'.
 *
 * No authentication tokens are stored in localStorage.
 */

function normalizeStaffApiBaseUrl(raw?: string): string {
  const base = String(raw || '')
    .trim()
    .replace(/\/+$/, '');

  if (!base) {
    return 'http://localhost:5000/api';
  }

  return base.endsWith('/api')
    ? base
    : `${base}/api`;
}

/**
 * Extract the backend origin without the /api path.
 */
function normalizeStaffApiOrigin(raw?: string): string {
  const base = String(raw || 'http://localhost:5000').trim();

  try {
    return new URL(base).origin;
  } catch {
    return 'http://localhost:5000';
  }
}

/**
 * WhalesVault Express backend configuration.
 */
const RAW_STAFF_API_BASE =
  import.meta.env.VITE_STAFF_API_URL ||
  import.meta.env.VITE_API_URL ||
  'http://localhost:5000';

export const STAFF_CONFIG = {
  appName: 'WhalesVault Staff Portal',
  appSubtitle: 'Support Operations Desk',

  apiOrigin: normalizeStaffApiOrigin(RAW_STAFF_API_BASE),

  apiBaseUrl: normalizeStaffApiBaseUrl(RAW_STAFF_API_BASE),

  // Preserve existing storage keys to avoid losing saved preferences.
  themeStorageKey: 'aureus_theme',
  sidebarStorageKey: 'aureus_staff_sidebar_collapsed',
  sidebarModeStorageKey: 'aureus_staff_sidebar_mode',

  defaultMaxChats: 5,

  /**
   * Frontend routes.
   */
  routes: {
    root: '/staff',

    signIn: '/staff/signin',

    loginAlias: '/staff/login',

    // Supabase invitation callback page.
    invite: '/staff/accept-invite',

    // Password creation after invitation verification.
    setPassword: '/staff/set-password',

    dashboard: '/staff/dashboard',

    conversations: '/staff/conversations',

    tickets: '/staff/tickets',

    availability: '/staff/availability',

    settings: '/staff/settings',
  },

  /**
   * Express backend endpoints.
   *
   * These paths are relative to apiBaseUrl.
   */
  endpoints: {
    auth: {
      // Implemented staff authentication endpoints.
      signIn: '/staff/auth/signin',

      logout: '/staff/auth/logout',

      setPassword: '/staff/auth/set-password',

      // Session restoration endpoints.
      // Verify their implementation before using them.
      session: '/staff/me',

      sessionFallback: '/staff/auth/me',

      /**
       * Invitation verification.
       *
       * GET /api/staff/auth/invite
       *
       * This endpoint verifies the invitation and redirects
       * the browser to /staff/set-password.
       *
       * It is not a normal JSON API endpoint.
       */
      inviteVerify: '/staff/auth/invite',
    },

    /**
     * Ably authorization endpoints.
     *
     * These are retained for frontend compatibility.
     * Confirm the actual backend routes during Ably integration.
     */
    ably: {
      token: '/staff/ably/token',

      fallbackToken: '/support/ably/token',
    },

    /**
     * Staff operations.
     */
    staff: {
      overview: '/staff/overview',

      availability: '/staff/availability',

      profile: '/staff/profile',

      notifications: '/staff/settings/notifications',

      conversations: '/staff/conversations',

      tickets: '/staff/tickets',

      attachments: '/staff/attachments',

      voiceNotes: '/staff/voice-notes',

      callSession: '/staff/calls/session',

      aiAssist: '/staff/ai/assist',

      aiChat: '/staff/ai/chat',
    },

    /**
     * Shared support services.
     */
    sharedSupport: {
      dashboard: '/support/dashboard',

      conversations: '/support/conversations',

      tickets: '/support/tickets',

      // cannedResponses: '/support/canned-responses'

      aiAssist: '/ai/assist',

      aiConversations: '/ai/conversations',
    },
  },
} as const;

/**
 * Staff availability options.
 *
 * Values match our backend availability enum.
 */
export const AVAILABILITY_OPTIONS = [
  {
    value: 'ONLINE',
    label: 'Online',
    summary: 'Accepting new client conversations up to chat capacity',
  },
  {
    value: 'BUSY',
    label: 'Busy',
    summary: 'Handling active conversations; defer new assignments',
  },
  {
    value: 'AWAY',
    label: 'Away',
    summary: 'Temporarily unavailable for new conversations',
  },
  {
    value: 'OFFLINE',
    label: 'Offline',
    summary: 'Not accepting new conversations; session remains authenticated',
  },
] as const;