import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  StaffAvailabilityEnum,
  StaffMemberProfile,
  StaffNotificationPreferences,
} from '../types/staff.types';
import { staffAuthService } from '../services/staffAuthService';
import { staffPortalService } from '../services/staffPortalService';
import { onStaffUnauthorized } from '../services/staffApiClient';
import { staffAblyService, RealtimeConnectionStatus } from '../services/staffAblyService';
import { STAFF_CONFIG } from '../config/staffConfig';

interface StaffAuthContextValue {
  staff: StaffMemberProfile | null;
  isLoadingSession: boolean;
  sessionExpiredMessage: string | null;
  clearSessionExpiredMessage: () => void;
  realtimeStatus: RealtimeConnectionStatus;
  realtimeDetail: string | undefined;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  setTheme: (theme: 'dark' | 'light') => void;
  notificationPrefs: StaffNotificationPreferences;
  updateNotificationPrefs: (
    next: StaffNotificationPreferences
  ) => Promise<{ ok: boolean; error?: string }>;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  updateAvailabilityConfirmed: (
    nextAvailability: StaffAvailabilityEnum
  ) => Promise<{ ok: boolean; error?: string }>;
  syncActiveChatsCount: (count: number) => void;
}

const DEFAULT_NOTIFICATION_PREFS: StaffNotificationPreferences = {
  newAssignmentAlert: true,
  unreadMessageChime: true,
  ticketEscalationAlert: true,
  whisperMentionAlert: true,
  desktopNotifications: false,
};

const StaffAuthContext = createContext<StaffAuthContextValue | null>(null);

export const StaffAuthProvider: React.FC<{
  children: React.ReactNode;
  onNavigate: (path: string, replace?: boolean) => void;
}> = ({ children, onNavigate }) => {
  const [staff, setStaff] = useState<StaffMemberProfile | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState<boolean>(true);
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState<string | null>(null);
  const [realtimeStatus, setRealtimeStatus] =
    useState<RealtimeConnectionStatus>('idle');
  const [realtimeDetail, setRealtimeDetail] = useState<string | undefined>(undefined);
  const [notificationPrefs, setNotificationPrefs] =
    useState<StaffNotificationPreferences>(DEFAULT_NOTIFICATION_PREFS);

  const [theme, setThemeState] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STAFF_CONFIG.themeStorageKey);
      if (saved === 'light' || saved === 'dark') return saved;
    }
    return 'dark';
  });

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

  const refreshSession = useCallback(async () => {
    setIsLoadingSession(true);
    try {
      const res = await staffAuthService.restoreSession();
      if (res.success && res.data?.staff) {
        setStaff(res.data.staff);
        setSessionExpiredMessage(null);
      } else {
        setStaff(null);
      }
    } finally {
      setIsLoadingSession(false);
    }
  }, []);

  // Bootstrap cookie session on portal mount
  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  // Listen for 401 session expiration from any authenticated Staff API call
  useEffect(() => {
    return onStaffUnauthorized((reason) => {
      staffAblyService.disconnect();
      setStaff(null);
      setSessionExpiredMessage(
        reason || 'Your staff session expired. Please sign in to continue.'
      );
      onNavigate(STAFF_CONFIG.routes.signIn, true);
    });
  }, [onNavigate]);

  // Connect permission-scoped Ably realtime when staff session is verified
  useEffect(() => {
    const unsubStatus = staffAblyService.onStatusChange((status, detail) => {
      setRealtimeStatus(status);
      setRealtimeDetail(detail);
    });

    if (staff?.id) {
      staffAblyService.connect(staff.id);
    } else {
      staffAblyService.disconnect();
    }

    return () => {
      unsubStatus();
    };
  }, [staff?.id]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const res = await staffAuthService.signIn({ email, password });
      if (res.success && res.data?.staff) {
        setStaff(res.data.staff);
        setSessionExpiredMessage(null);
        onNavigate(STAFF_CONFIG.routes.dashboard, true);
        return { ok: true };
      }
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
    await staffAuthService.signOut();
    staffAblyService.disconnect();
    setStaff(null);
    setSessionExpiredMessage(null);
    onNavigate(STAFF_CONFIG.routes.signIn, true);
  }, [onNavigate]);

  const updateAvailabilityConfirmed = useCallback(
    async (nextAvailability: StaffAvailabilityEnum) => {
      const res = await staffPortalService.updateAvailability(nextAvailability);
      if (res.success && res.data) {
        const confirmed = res.data.availability || nextAvailability;
        setStaff((prev) =>
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
    []
  );

  const updateNotificationPrefs = useCallback(
    async (next: StaffNotificationPreferences) => {
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
    []
  );

  const syncActiveChatsCount = useCallback((count: number) => {
    setStaff((prev) =>
      prev && prev.activeChatsCount !== count
        ? { ...prev, activeChatsCount: count }
        : prev
    );
  }, []);

  return (
    <StaffAuthContext.Provider
      value={{
        staff,
        isLoadingSession,
        sessionExpiredMessage,
        clearSessionExpiredMessage: () => setSessionExpiredMessage(null),
        realtimeStatus,
        realtimeDetail,
        theme,
        toggleTheme,
        setTheme,
        notificationPrefs,
        updateNotificationPrefs,
        signIn,
        signOut,
        refreshSession,
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
