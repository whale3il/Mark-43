import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  StaffAvailabilityEnum,
  StaffMemberProfile,
  StaffNotificationPreferences,
  StaffSidebarMode,
} from '../types/staff.types';
import { staffAuthService } from '../services/staffAuthService';
import { staffPortalService } from '../services/staffPortalService';
import {
  isDevMockFallbackEligible,
  onStaffUnauthorized,
} from '../services/staffApiClient';
import { staffAblyService, RealtimeConnectionStatus } from '../services/staffAblyService';
import { STAFF_CONFIG } from '../config/staffConfig';
import {
  readStoredSidebarMode,
  writeStoredSidebarMode,
} from '@/src/components/SidebarDisplayControl';
import {
  STAFF_PORTAL_NOTIFICATION_PREFERENCES,
  STAFF_PORTAL_PREVIEW_PROFILE,
} from '@/src/data/mockData';

interface StaffAuthContextValue {
  /** Active profile (verified backend staff session, or dev-only preview profile when isPreviewMode is true). */
  staff: StaffMemberProfile | null;
  /** True ONLY when backed by a verified Express HTTP-only cookie session. */
  isAuthenticated: boolean;
  /** True ONLY in Vite dev mode when user enters preview fallback because backend is unreachable. */
  isPreviewMode: boolean;
  /** True in Vite dev mode when auth backend returned NETWORK_ERROR or ENDPOINT_UNAVAILABLE. */
  backendAuthUnavailable: boolean;
  isLoadingSession: boolean;
  sessionExpiredMessage: string | null;
  clearSessionExpiredMessage: () => void;
  realtimeStatus: RealtimeConnectionStatus;
  realtimeDetail: string | undefined;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  setTheme: (theme: 'dark' | 'light') => void;
  sidebarMode: StaffSidebarMode;
  setSidebarMode: (mode: StaffSidebarMode) => void;
  notificationPrefs: StaffNotificationPreferences;
  updateNotificationPrefs: (
    next: StaffNotificationPreferences
  ) => Promise<{ ok: boolean; error?: string }>;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  enterDevPreviewMode: () => void;
  exitDevPreviewMode: () => void;
  updateAvailabilityConfirmed: (
    nextAvailability: StaffAvailabilityEnum
  ) => Promise<{ ok: boolean; error?: string }>;
  syncActiveChatsCount: (count: number) => void;
}

const StaffAuthContext = createContext<StaffAuthContextValue | null>(null);

export const StaffAuthProvider: React.FC<{
  children: React.ReactNode;
  onNavigate: (path: string, replace?: boolean) => void;
}> = ({ children, onNavigate }) => {
  const [verifiedStaff, setVerifiedStaff] = useState<StaffMemberProfile | null>(null);
  const [previewStaff, setPreviewStaff] = useState<StaffMemberProfile | null>(null);
  const [backendAuthUnavailable, setBackendAuthUnavailable] = useState<boolean>(false);
  const [isLoadingSession, setIsLoadingSession] = useState<boolean>(true);
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState<string | null>(null);
  const [realtimeStatus, setRealtimeStatus] =
    useState<RealtimeConnectionStatus>('idle');
  const [realtimeDetail, setRealtimeDetail] = useState<string | undefined>(undefined);
  const [notificationPrefs, setNotificationPrefs] =
    useState<StaffNotificationPreferences>(STAFF_PORTAL_NOTIFICATION_PREFERENCES);

  const isAuthenticated = Boolean(verifiedStaff);
  const isPreviewMode = !isAuthenticated && Boolean(previewStaff);
  const staff = verifiedStaff || previewStaff;

  const [theme, setThemeState] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STAFF_CONFIG.themeStorageKey);
      if (saved === 'light' || saved === 'dark') return saved;
    }
    return 'dark';
  });

  const [sidebarMode, setSidebarModeState] = useState<StaffSidebarMode>(() =>
    readStoredSidebarMode(
      STAFF_CONFIG.sidebarModeStorageKey,
      'expanded',
      STAFF_CONFIG.sidebarStorageKey
    )
  );

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
      localStorage.setItem(STAFF_CONFIG.themeStorageKey, theme);
    } catch {
      // Ignore storage failures
    }
  }, [theme]);

  const setTheme = useCallback((next: 'dark' | 'light') => {
    setThemeState(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const setSidebarMode = useCallback((next: StaffSidebarMode) => {
    setSidebarModeState(next);
    writeStoredSidebarMode(STAFF_CONFIG.sidebarModeStorageKey, next);
  }, []);

  const refreshSession = useCallback(async (): Promise<boolean> => {
    setIsLoadingSession(true);
    try {
      const res = await staffAuthService.restoreSession();
      if (res.success && res.data?.staff) {
        setVerifiedStaff(res.data.staff);
        setPreviewStaff(null);
        setBackendAuthUnavailable(false);
        setSessionExpiredMessage(null);
        return true;
      }

      setVerifiedStaff(null);
      setBackendAuthUnavailable(isDevMockFallbackEligible(res.error));
      return false;
    } finally {
      setIsLoadingSession(false);
    }
  }, []);

  // Bootstrap cookie session on portal mount
  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  // Load saved notification preferences when workspace opens
  useEffect(() => {
    if (!staff) return;
    let active = true;
    staffPortalService.getNotificationPreferences().then((res) => {
      if (active && res.success && res.data) {
        setNotificationPrefs(res.data);
      }
    });
    return () => {
      active = false;
    };
  }, [staff?.id]);

  // Listen for 401 session expiration from any authenticated Staff API call
  useEffect(() => {
    return onStaffUnauthorized((reason) => {
      staffAblyService.disconnect();
      setVerifiedStaff(null);
      setPreviewStaff(null);
      setSessionExpiredMessage(
        reason || 'Your staff session expired. Please sign in to continue.'
      );
      onNavigate(STAFF_CONFIG.routes.signIn, true);
    });
  }, [onNavigate]);

  // Connect permission-scoped Ably realtime ONLY when staff session is backend-authenticated
  useEffect(() => {
    const unsubStatus = staffAblyService.onStatusChange((status, detail) => {
      setRealtimeStatus(status);
      setRealtimeDetail(detail);
    });

    if (verifiedStaff?.id) {
      staffAblyService.connect(verifiedStaff.id);
    } else {
      staffAblyService.disconnect();
    }

    return () => {
      unsubStatus();
    };
  }, [verifiedStaff?.id]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const res = await staffAuthService.signIn({ email, password });
      if (res.success && res.data?.staff) {
        setVerifiedStaff(res.data.staff);
        setPreviewStaff(null);
        setBackendAuthUnavailable(false);
        setSessionExpiredMessage(null);
        onNavigate(STAFF_CONFIG.routes.dashboard, true);
        return { ok: true };
      }

      setBackendAuthUnavailable(isDevMockFallbackEligible(res.error));
      return {
        ok: false,
        error:
          res.error?.message ||
          'Authentication failed. Verify your staff credentials and backend session endpoint.',
      };
    },
    [onNavigate]
  );

  const signOut = useCallback(async () => {
    if (isAuthenticated) {
      await staffAuthService.signOut();
    }
    staffAblyService.disconnect();
    setVerifiedStaff(null);
    setPreviewStaff(null);
    setSessionExpiredMessage(null);
    onNavigate(STAFF_CONFIG.routes.signIn, true);
  }, [isAuthenticated, onNavigate]);

  const enterDevPreviewMode = useCallback(() => {
    if (typeof import.meta === 'undefined' || !import.meta.env?.DEV) return;
    setPreviewStaff(STAFF_PORTAL_PREVIEW_PROFILE);
    setSessionExpiredMessage(null);
    onNavigate(STAFF_CONFIG.routes.dashboard, true);
  }, [onNavigate]);

  const exitDevPreviewMode = useCallback(() => {
    setPreviewStaff(null);
    onNavigate(STAFF_CONFIG.routes.signIn, true);
  }, [onNavigate]);

  const updateAvailabilityConfirmed = useCallback(
    async (nextAvailability: StaffAvailabilityEnum) => {
      if (!isAuthenticated) {
        return {
          ok: false,
          error:
            'Dev Preview Mode: Backend authentication is required to persist availability changes.',
        };
      }

      const res = await staffPortalService.updateAvailability(nextAvailability);
      if (res.success && res.data) {
        const confirmed = res.data.availability || nextAvailability;
        setVerifiedStaff((prev) =>
          prev
            ? {
                ...prev,
                availability: confirmed,
                activeChatsCount:
                  typeof res.data?.activeChatsCount === 'number'
                    ? res.data.activeChatsCount
                    : prev.activeChatsCount,
                maxChats:
                  typeof res.data?.maxChats === 'number'
                    ? res.data.maxChats
                    : prev.maxChats,
              }
            : null
        );
        return { ok: true };
      }
      return {
        ok: false,
        error:
          res.error?.message ||
          'Backend rejected or could not confirm the availability change.',
      };
    },
    [isAuthenticated]
  );

  const updateNotificationPrefs = useCallback(
    async (next: StaffNotificationPreferences) => {
      if (!isAuthenticated) {
        return {
          ok: false,
          error:
            'Dev Preview Mode: Backend authentication is required to persist notification preferences.',
        };
      }
      const res = await staffPortalService.updateNotificationPreferences(next);
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

  const syncActiveChatsCount = useCallback((count: number) => {
    setVerifiedStaff((prev) =>
      prev && prev.activeChatsCount !== count
        ? { ...prev, activeChatsCount: count }
        : prev
    );
    setPreviewStaff((prev) =>
      prev && prev.activeChatsCount !== count
        ? { ...prev, activeChatsCount: count }
        : prev
    );
  }, []);

  return (
    <StaffAuthContext.Provider
      value={{
        staff,
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
        enterDevPreviewMode,
        exitDevPreviewMode,
        updateAvailabilityConfirmed,
        syncActiveChatsCount,
      }}
    >
      {children}
    </StaffAuthContext.Provider>
  );
};

export function useStaffAuth(): StaffAuthContextValue {
  const ctx = useContext(StaffAuthContext);
  if (!ctx) {
    throw new Error('useStaffAuth must be used inside StaffAuthProvider');
  }
  return ctx;
}
