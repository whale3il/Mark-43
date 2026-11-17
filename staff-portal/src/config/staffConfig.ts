/**
 * Aureus Staff Portal — Independent Application Configuration
 * Strictly cookie-authenticated (`credentials: 'include'`) without localStorage tokens.
 */

function normalizeStaffApiBaseUrl(raw?: string): string {
  const base = String(raw || '').trim().replace(/\/+$/, '');
  if (!base) return 'http://localhost:5000/api';
  return base.endsWith('/api') ? base : `${base}/api`;
}

const RAW_STAFF_API_BASE =
  (typeof import.meta !== 'undefined' &&
    import.meta.env &&
    (import.meta.env.VITE_STAFF_API_URL || import.meta.env.VITE_API_URL)) ||
  'http://localhost:5000';

export const STAFF_CONFIG = {
  appName: 'Aureus Staff Portal',
  appSubtitle: 'Private Wealth Operations Desk',
  apiOrigin: String(RAW_STAFF_API_BASE).trim().replace(/\/+$/, ''),
  apiBaseUrl: normalizeStaffApiBaseUrl(RAW_STAFF_API_BASE),
  themeStorageKey: 'aureus_theme',
  sidebarStorageKey: 'aureus_staff_sidebar_collapsed',
  sidebarModeStorageKey: 'aureus_staff_sidebar_mode',
  defaultMaxChats: 5,
  routes: {
    root: '/staff',
    signIn: '/staff/signin',
    loginAlias: '/staff/login',
    invite: '/staff/invite',
    setPassword: '/staff/set-password',
    dashboard: '/staff/dashboard',
    conversations: '/staff/conversations',
    tickets: '/staff/tickets',
    availability: '/staff/availability',
    settings: '/staff/settings',
  },
  endpoints: {
    auth: {
      signIn: '/staff/auth/signin',
      logout: '/staff/auth/logout',
      session: '/staff/me',
      sessionFallback: '/staff/auth/me',
      inviteVerify: '/staff/auth/invite',
      setPassword: '/staff/auth/set-password',
    },
    ably: {
      token: '/staff/ably/token',
      fallbackToken: '/support/ably/token',
    },
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
    sharedSupport: {
      dashboard: '/support/dashboard',
      conversations: '/support/conversations',
      tickets: '/support/tickets',
      cannedResponses: '/support/canned-responses',
      aiAssist: '/ai/assist',
      aiConversations: '/ai/conversations',
    },
  },
} as const;

export const AVAILABILITY_OPTIONS = [
  {
    value: 'ONLINE',
    label: 'Online',
    summary: 'Accepting new client conversations up to chat capacity',
  },
  {
    value: 'BUSY',
    label: 'Busy',
    summary: 'Handling active threads; defer new routing unless escalated',
  },
  {
    value: 'AWAY',
    label: 'Away',
    summary: 'Temporarily away from desk; existing clients notified',
  },
  {
    value: 'OFFLINE',
    label: 'Offline',
    summary: 'Not accepting routed chats; session remains authenticated',
  },
] as const;
