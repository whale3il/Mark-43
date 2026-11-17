/**
 * Aureus Admin Portal — Independent Application Configuration
 * Strictly HTTP-only cookie authenticated (`credentials: 'include'`) without localStorage tokens.
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
  appName: 'Aureus Admin Portal',
  appSubtitle: 'Executive Operations Console',
  apiOrigin: String(RAW_ADMIN_API_BASE).trim().replace(/\/+$/, ''),
  apiBaseUrl: normalizeAdminApiBaseUrl(RAW_ADMIN_API_BASE),
  themeStorageKey: 'aureus_theme',
  sidebarModeStorageKey: 'aureus_admin_sidebar_mode',
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

export const ADMIN_DEPARTMENTS = [
  'Private Wealth',
  'Treasury & Wires',
  'Card Concierge',
  'Security & Compliance',
  'Institutional Lending',
] as const;
