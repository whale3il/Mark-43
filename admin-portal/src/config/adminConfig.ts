/**
 * WhalesVault Admin Portal — Independent Application Configuration
 *
 * Authentication:
 * - HTTP-only session cookies
 * - credentials: 'include'
 * - No localStorage authentication tokens
 *
 * Architecture:
 * - Independent Admin Portal
 * - Shared Express backend
 * - Supabase Authentication
 * - Prisma database integration
 */

function normalizeAdminApiBaseUrl(raw?: string): string {
  const base = String(raw || '').trim().replace(/\/+$/, '');

  if (!base) return 'http://localhost:5000/api';

  return base.endsWith('/api') ? base : `${base}/api`;
}

const RAW_ADMIN_API_BASE =
  (typeof import.meta !== 'undefined' &&
    import.meta.env &&
    (import.meta.env.VITE_ADMIN_API_URL ||
      import.meta.env.VITE_STAFF_API_URL ||
      import.meta.env.VITE_API_URL)) ||
  'http://localhost:5000';

export const ADMIN_CONFIG = {
  appName: 'WhalesVault Admin Portal',

  appSubtitle: 'Executive Operations Console',

  apiOrigin: String(RAW_ADMIN_API_BASE)
    .trim()
    .replace(/\/+$/, ''),

  apiBaseUrl: normalizeAdminApiBaseUrl(RAW_ADMIN_API_BASE),

  themeStorageKey: 'whalesvault_admin_theme',

  sidebarModeStorageKey: 'whalesvault_admin_sidebar_mode',

  defaultMaxChats: 5,

  routes: {
    root: '/admin',

    signIn: '/admin/signin',

    loginAlias: '/admin/login',

    dashboard: '/admin/dashboard',

    staff: '/admin/staff',

    monitoring: '/admin/monitoring',

    tickets: '/admin/tickets',

    settings: '/admin/settings',
  },

  endpoints: {
    auth: {
      signIn: '/admin/auth/signin',

      logout: '/admin/auth/logout',

      session: '/admin/me',

      sessionFallback: '/admin/auth/me',

      renew: '/admin/auth/renew',
    },

    ably: {
      token: '/admin/ably/token',

      fallbackToken: '/support/ably/token',
    },

    admin: {
      overview: '/admin/overview',

      staff: '/admin/staff',

      conversations: '/admin/support/conversations',

      waitingQueue: '/admin/support/queue',

      tickets: '/admin/tickets',

      notifications: '/admin/settings/notifications',

      aiAssist: '/admin/ai/assist',
    },

    sharedSupport: {
      conversations: '/support/conversations',

      tickets: '/support/tickets',

      aiAssist: '/ai/assist',
    },
  },
} as const;