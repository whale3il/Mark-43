import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  AdminNotificationPreferences,
  AdminProfile,
  AdminSidebarMode,
} from '../types/admin.types';
import { adminAuthService } from '../services/adminAuthService';
import { adminPortalService } from '../services/adminPortalService';
import {
  isDevMockFallbackEligible,
  onAdminUnauthorized,
} from '../services/adminApiClient';
import {
  adminAblyService,
  AdminRealtimeStatus,
} from '../services/adminAblyService';
import { ADMIN_CONFIG } from '../config/adminConfig';
import {
  ADMIN_PORTAL_NOTIFICATION_PREFERENCES,
  ADMIN_PORTAL_PREVIEW_PROFILE,
} from '@/src/data/mockData';

interface AdminAuthContextValue {
  admin: AdminProfile | null;
  /** True ONLY when backed by a verified Express HTTP-only `aureus_admin_session` cookie. */
  isAuthenticated: boolean;
  /** True ONLY in Vite dev mode when user enters preview fallback because backend is unreachable. */
  isPreviewMode: boolean;
  backendAuthUnavailable: boolean;
  isLoadingSession: boolean;
  sessionExpiredMessage: string | null;
  clearSessionExpiredMessage: () => void;
  realtimeStatus: AdminRealtimeStatus;
  realtimeDetail: string | undefined;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  setTheme: (theme: 'dark' | 'light') => void;
  sidebarMode: AdminSidebarMode;
  setSidebarMode: (mode: AdminSidebarMode) => void;
  notificationPrefs: AdminNotificationPreferences;
  updateNotificationPrefs: (
    next: AdminNotificationPreferences
  ) => Promise<{ ok: boolean; error?: string }>;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  renewSession: () => Promise<{ ok: boolean; error?: string }>;
  enterDevPreviewMode: () => void;
  exitDevPreviewMode: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export const AdminAuthProvider: React.FC<{
  children: React.ReactNode;
  onNavigate: (path: string, replace?: boolean) => void;
}> = ({ children, onNavigate }) => {
  const [verifiedAdmin, setVerifiedAdmin] = useState<AdminProfile | null>(null);
  const [previewAdmin, setPreviewAdmin] = useState<AdminProfile | null>(null);
  const [backendAuthUnavailable, setBackendAuthUnavailable] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState<
    string | null
  >(null);
  const [realtimeStatus, setRealtimeStatus] =
    useState<AdminRealtimeStatus>('idle');
  const [realtimeDetail, setRealtimeDetail] = useState<string | undefined>(
    undefined
  );
  const [notificationPrefs, setNotificationPrefs] =
    useState<AdminNotificationPreferences>(ADMIN_PORTAL_NOTIFICATION_PREFERENCES);

  const [theme, setThemeState] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(ADMIN_CONFIG.themeStorageKey);
      if (saved === 'light' || saved === 'dark') return saved;
    }
    return 'dark';
  });

  const [sidebarMode, setSidebarModeState] = useState<AdminSidebarMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(ADMIN_CONFIG.sidebarModeStorageKey);
      if (
        saved === 'expanded' ||
        saved === 'collapsed' ||
        saved === 'hover'
      ) {
        return saved;
      }
    }
    return 'expanded';
  });

  const isAuthenticated = Boolean(verifiedAdmin);
  const isPreviewMode = !isAuthenticated && Boolean(previewAdmin);
  const admin = verifiedAdmin || previewAdmin;

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
    }
    try {
      localStorage.setItem(ADMIN_CONFIG.themeStorageKey, theme);
    } catch {
      // Ignore storage errors
    }
  }, [theme]);

  const setTheme = useCallback((next: 'dark' | 'light') => {
    setThemeState(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const setSidebarMode = useCallback((mode: AdminSidebarMode) => {
    setSidebarModeState(mode);
    try {
      localStorage.setItem(ADMIN_CONFIG.sidebarModeStorageKey, mode);
    } catch {
      // Ignore storage errors
    }
  }, []);

  const refreshSession = useCallback(async (): Promise<boolean> => {
    setIsLoadingSession(true);
    try {
      const res = await adminAuthService.restoreSession();
      if (res.success && res.data?.admin) {
        setVerifiedAdmin(res.data.admin);
        setPreviewAdmin(null);
        setBackendAuthUnavailable(false);
        setSessionExpiredMessage(null);
        return true;
      }
      setVerifiedAdmin(null);
      setBackendAuthUnavailable(isDevMockFallbackEligible(res.error));
      return false;
    } finally {
      setIsLoadingSession(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  // Load persisted notification settings when admin workspace opens
  useEffect(() => {
    if (!admin) return;
    let active = true;
    adminPortalService.getNotificationPreferences().then((res) => {
      if (active && res.success && res.data) {
        setNotificationPrefs(res.data);
      }
    });
    return () => {
      active = false;
    };
  }, [admin?.id]);

  // Listen for 401 expiration events from Admin API requests
  useEffect(() => {
    return onAdminUnauthorized((reason) => {
      adminAblyService.disconnect();
      setVerifiedAdmin(null);
      setPreviewAdmin(null);
      setSessionExpiredMessage(
        reason ||
          'Your administrator session has expired or was revoked. Please sign in.'
      );
      onNavigate(ADMIN_CONFIG.routes.signIn, true);
    });
  }, [onNavigate]);

  // Connect permission-scoped Ably Realtime ONLY when backend session is verified
  useEffect(() => {
    const unsubStatus = adminAblyService.onStatusChange((status, detail) => {
      setRealtimeStatus(status);
      setRealtimeDetail(detail);
    });

    if (verifiedAdmin?.id) {
      adminAblyService.connect(verifiedAdmin.id);
    } else {
      adminAblyService.disconnect();
    }

    return () => {
      unsubStatus();
    };
  }, [verifiedAdmin?.id]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const res = await adminAuthService.signIn({ email, password });
      if (res.success && res.data?.admin) {
        setVerifiedAdmin(res.data.admin);
        setPreviewAdmin(null);
        setBackendAuthUnavailable(false);
        setSessionExpiredMessage(null);
        onNavigate(ADMIN_CONFIG.routes.dashboard, true);
        return { ok: true };
      }

      setBackendAuthUnavailable(isDevMockFallbackEligible(res.error));
      return {
        ok: false,
        error:
          res.error?.message ||
          'Administrator authentication failed. Check credentials and backend status.',
      };
    },
    [onNavigate]
  );

  const signOut = useCallback(async () => {
    if (isAuthenticated) {
      await adminAuthService.signOut();
    }
    adminAblyService.disconnect();
    setVerifiedAdmin(null);
    setPreviewAdmin(null);
    setSessionExpiredMessage(null);
    onNavigate(ADMIN_CONFIG.routes.signIn, true);
  }, [isAuthenticated, onNavigate]);

  const renewSession = useCallback(async () => {
    if (!isAuthenticated) {
      return {
        ok: false,
        error:
          'Dev Preview Mode: Backend authentication is required to renew a live session.',
      };
    }
    const res = await adminAuthService.renewSession();
    if (res.success && res.data?.admin) {
      setVerifiedAdmin(res.data.admin);
      return { ok: true };
    }
    return {
      ok: false,
      error:
        res.error?.message ||
        'Session renewal endpoint (`POST /api/admin/auth/renew`) is not active yet.',
    };
  }, [isAuthenticated]);

  const enterDevPreviewMode = useCallback(() => {
    if (typeof import.meta === 'undefined' || !import.meta.env?.DEV) return;
    setPreviewAdmin(ADMIN_PORTAL_PREVIEW_PROFILE);
    setSessionExpiredMessage(null);
    onNavigate(ADMIN_CONFIG.routes.dashboard, true);
  }, [onNavigate]);

  const exitDevPreviewMode = useCallback(() => {
    setPreviewAdmin(null);
    onNavigate(ADMIN_CONFIG.routes.signIn, true);
  }, [onNavigate]);

  const updateNotificationPrefs = useCallback(
    async (next: AdminNotificationPreferences) => {
      if (!isAuthenticated) {
        return {
          ok: false,
          error:
            'Dev Preview Mode: Backend authentication is required to persist notification preferences.',
        };
      }
      const res = await adminPortalService.updateNotificationPreferences(next);
      if (res.success && res.data) {
        setNotificationPrefs(res.data);
        return { ok: true };
      }
      return {
        ok: false,
        error:
          res.error?.message ||
          'Unable to persist notification preferences on backend.',
      };
    },
    [isAuthenticated]
  );

  return (
    <AdminAuthContext.Provider
      value={{
        admin,
        isAuthenticated,
        isPreviewMode,
        backendAuthUnavailable,
        isLoadingSession,
        sessionExpiredMessage,
        clearSessionExpiredMessage: () => setSessionExpiredMessage(null),
        realtimeStatus,
        realtimeDetail,
        theme,
        toggleTheme,
        setTheme,
        sidebarMode,
        setSidebarMode,
        notificationPrefs,
        updateNotificationPrefs,
        signIn,
        signOut,
        refreshSession,
        renewSession,
        enterDevPreviewMode,
        exitDevPreviewMode,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
};

export function useAdminAuth(): AdminAuthContextValue {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) {
    throw new Error('useAdminAuth must be used inside AdminAuthProvider');
  }
  return ctx;
}
