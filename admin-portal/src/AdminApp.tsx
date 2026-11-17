import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { ADMIN_CONFIG } from './config/adminConfig';
import { AdminAuthProvider, useAdminAuth } from './context/AdminAuthContext';
import { AdminPortalLayout } from './layouts/AdminPortalLayout';
import { AdminSignInPage } from './pages/AdminSignInPage';
import { AdminOverviewPage } from './pages/AdminOverviewPage';
import { AdminStaffManagementPage } from './pages/AdminStaffManagementPage';
import { AdminSupportMonitoringPage } from './pages/AdminSupportMonitoringPage';
import { AdminTicketManagementPage } from './pages/AdminTicketManagementPage';
import { AdminSettingsPage } from './pages/AdminSettingsPage';
import { adminPortalService } from './services/adminPortalService';
import { adminAblyService } from './services/adminAblyService';
import {
  AdminConversation,
  AdminNavSection,
  AdminOverviewData,
  AdminStaffRecord,
  AdminTicket,
  CustomerProfile,
} from './types/admin.types';

function sectionToPath(section: AdminNavSection): string {
  switch (section) {
    case 'staff':
      return ADMIN_CONFIG.routes.staff;
    case 'monitoring':
      return ADMIN_CONFIG.routes.monitoring;
    case 'tickets':
      return ADMIN_CONFIG.routes.tickets;
    case 'settings':
      return ADMIN_CONFIG.routes.settings;
    case 'overview':
    default:
      return ADMIN_CONFIG.routes.dashboard;
  }
}

function pathToSection(pathname: string): AdminNavSection {
  const clean = pathname.toLowerCase().replace(/\/+$/, '');
  if (clean === ADMIN_CONFIG.routes.staff) return 'staff';
  if (clean === ADMIN_CONFIG.routes.monitoring) return 'monitoring';
  if (clean === ADMIN_CONFIG.routes.tickets) return 'tickets';
  if (clean === ADMIN_CONFIG.routes.settings) return 'settings';
  return 'overview';
}

const AdminPortalShell: React.FC<{
  pathname: string;
  onNavigate: (path: string, replace?: boolean) => void;
}> = ({ pathname, onNavigate }) => {
  const {
    admin,
    isAuthenticated,
    isPreviewMode,
    isLoadingSession,
    realtimeStatus,
    theme,
    setTheme,
    sidebarMode,
    setSidebarMode,
    notificationPrefs,
    updateNotificationPrefs,
    signOut,
    refreshSession,
    renewSession,
    exitDevPreviewMode,
  } = useAdminAuth();

  const normalizedPath =
    pathname.toLowerCase().replace(/\/+$/, '') || '/admin';
  const isSignInPath =
    normalizedPath === ADMIN_CONFIG.routes.signIn ||
    normalizedPath === ADMIN_CONFIG.routes.loginAlias;

  const [overview, setOverview] = useState<AdminOverviewData | null>(null);
  const [staffDirectory, setStaffDirectory] = useState<AdminStaffRecord[]>([]);
  const [conversations, setConversations] = useState<AdminConversation[]>([]);
  const [customers, setCustomers] = useState<Record<string, CustomerProfile>>(
    {}
  );
  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [selectedConversationId, setSelectedConversationId] =
    useState<string>('');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  const [isLoadingData, setIsLoadingData] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [previewFallbackSources, setPreviewFallbackSources] = useState<
    string[]
  >([]);
  const [previewFallbackReason, setPreviewFallbackReason] = useState<
    string | undefined
  >(undefined);

  // Route protection & canonical redirects
  useEffect(() => {
    if (isLoadingSession) return;

    if (!admin) {
      if (!isSignInPath) {
        onNavigate(ADMIN_CONFIG.routes.signIn, true);
      }
      return;
    }

    if (normalizedPath === '/admin' || (isSignInPath && isAuthenticated)) {
      onNavigate(ADMIN_CONFIG.routes.dashboard, true);
    }
  }, [
    isLoadingSession,
    admin,
    isAuthenticated,
    normalizedPath,
    isSignInPath,
    onNavigate,
  ]);

  const loadOperationsData = useCallback(async () => {
    if (!admin) return;
    setIsLoadingData(true);
    setDataError(null);

    try {
      const [overviewRes, staffRes, convRes, ticketRes] = await Promise.all([
        adminPortalService.getOverview(),
        adminPortalService.listStaff(),
        adminPortalService.listConversations(),
        adminPortalService.listTickets(),
      ]);

      const errors: string[] = [];
      const fallbackSources: string[] = [];
      let firstReason: string | undefined;

      if (overviewRes.success && overviewRes.data) {
        setOverview(overviewRes.data);
        if (overviewRes.isMockFallback) {
          fallbackSources.push('overview');
          firstReason ||= overviewRes.fallbackReason;
        }
      } else if (overviewRes.error && !overviewRes.error.forbidden) {
        errors.push(overviewRes.error.message);
      }

      if (staffRes.success && staffRes.data) {
        setStaffDirectory(staffRes.data);
        if (staffRes.isMockFallback) {
          fallbackSources.push('staff directory');
          firstReason ||= staffRes.fallbackReason;
        }
      } else if (staffRes.error) {
        errors.push(staffRes.error.message);
      }

      if (convRes.success && convRes.data) {
        setConversations(convRes.data.conversations);
        setCustomers(convRes.data.customers || {});
        if (convRes.data.conversations.length > 0) {
          setSelectedConversationId((prev) =>
            prev && convRes.data!.conversations.some((c) => c.id === prev)
              ? prev
              : convRes.data!.conversations[0].id
          );
        }
        if (convRes.isMockFallback) {
          fallbackSources.push('conversations');
          firstReason ||= convRes.fallbackReason;
        }
      } else if (convRes.error) {
        errors.push(convRes.error.message);
      }

      if (ticketRes.success && ticketRes.data) {
        setTickets(ticketRes.data);
        if (ticketRes.isMockFallback) {
          fallbackSources.push('tickets');
          firstReason ||= ticketRes.fallbackReason;
        }
      } else if (ticketRes.error) {
        errors.push(ticketRes.error.message);
      }

      setPreviewFallbackSources(fallbackSources);
      setPreviewFallbackReason(firstReason);

      if (errors.length > 0) {
        setDataError(errors[0]);
      }
    } finally {
      setIsLoadingData(false);
    }
  }, [admin?.id]);

  useEffect(() => {
    if (admin) {
      loadOperationsData();
    } else {
      setOverview(null);
      setStaffDirectory([]);
      setConversations([]);
      setTickets([]);
      setCustomers({});
      setPreviewFallbackSources([]);
      setPreviewFallbackReason(undefined);
      setSelectedConversationId('');
      setSelectedTicketId(null);
    }
  }, [admin?.id, loadOperationsData]);

  // Real-time organization event listeners (Ably)
  useEffect(() => {
    if (!admin) return;
    const unsubQueue = adminAblyService.onQueueOrAssignment(() => {
      loadOperationsData();
    });
    const unsubStaff = adminAblyService.onStaffAvailability((evt) => {
      setStaffDirectory((prev) =>
        prev.map((s) =>
          s.id === evt.staffId
            ? {
                ...s,
                availability: evt.availability,
                activeConversationsCount:
                  typeof evt.activeConversationsCount === 'number'
                    ? evt.activeConversationsCount
                    : s.activeConversationsCount,
              }
            : s
        )
      );
    });
    const unsubTicket = adminAblyService.onTicketEvent((partial) => {
      setTickets((prev) => {
        const exists = prev.some((t) => t.id === partial.id);
        if (!exists) {
          loadOperationsData();
          return prev;
        }
        return prev.map((t) =>
          t.id === partial.id ? ({ ...t, ...partial } as AdminTicket) : t
        );
      });
    });

    return () => {
      unsubQueue();
      unsubStaff();
      unsubTicket();
    };
  }, [admin?.id, loadOperationsData]);

  // Hook declared unconditionally BEFORE any early return statements
  const handleRetryLiveConnection = useCallback(async () => {
    const authed = await refreshSession();
    if (authed || admin) {
      await loadOperationsData();
    }
  }, [refreshSession, loadOperationsData, admin]);

  if (isLoadingSession) {
    return (
      <div className="min-h-dvh w-full flex flex-col items-center justify-center gap-3 bg-neutral-950 text-neutral-100 p-6">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-emerald-500" />
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-neutral-400">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500" />
          <span>Verifying administrator session (`aureus_admin_session`)...</span>
        </div>
      </div>
    );
  }

  if (!admin || isSignInPath) {
    return <AdminSignInPage />;
  }

  const activeSection = pathToSection(normalizedPath);
  const waitingQueueCount =
    overview?.waitingQueueCount ??
    conversations.filter((c) => Boolean(c.waitingSince || c.isUnassigned))
      .length;
  const escalationsCount = tickets.filter(
    (t) => t.status === 'Escalated' || t.priority === 'Urgent'
  ).length;

  return (
    <AdminPortalLayout
      admin={admin}
      activeSection={activeSection}
      onSelectSection={(sec) => onNavigate(sectionToPath(sec))}
      onSignOut={signOut}
      sidebarMode={sidebarMode}
      onChangeSidebarMode={setSidebarMode}
      escalationsCount={escalationsCount}
      waitingQueueCount={waitingQueueCount}
      realtimeStatus={realtimeStatus}
      previewInfo={{
        active: isPreviewMode || previewFallbackSources.length > 0,
        isAuthenticated,
        sources: previewFallbackSources,
        reason: previewFallbackReason,
        onRetryLive: handleRetryLiveConnection,
        onReturnToSignIn: exitDevPreviewMode,
      }}
      theme={theme}
    >
      {activeSection === 'overview' && (
        <AdminOverviewPage
          admin={admin}
          overview={overview}
          conversations={conversations}
          tickets={tickets}
          staffDirectory={staffDirectory}
          isLoadingData={isLoadingData}
          dataError={dataError}
          onRetryLoad={loadOperationsData}
          onNavigateSection={(sec) => onNavigate(sectionToPath(sec))}
          onOpenConversation={(convId) => {
            setSelectedConversationId(convId);
            onNavigate(ADMIN_CONFIG.routes.monitoring);
          }}
          onOpenTicket={(ticketId) => {
            setSelectedTicketId(ticketId);
            onNavigate(ADMIN_CONFIG.routes.tickets);
          }}
          theme={theme}
        />
      )}

      {activeSection === 'staff' && (
        <AdminStaffManagementPage
          admin={admin}
          staffDirectory={staffDirectory}
          onStaffCreated={(created) =>
            setStaffDirectory((prev) => [created, ...prev])
          }
          onStaffUpdated={(updated) =>
            setStaffDirectory((prev) =>
              prev.map((s) => (s.id === updated.id ? updated : s))
            )
          }
          isLoadingData={isLoadingData}
          dataError={dataError}
          onRetryLoad={loadOperationsData}
          theme={theme}
        />
      )}

      {activeSection === 'monitoring' && (
        <AdminSupportMonitoringPage
          admin={admin}
          conversations={conversations}
          customers={customers}
          tickets={tickets}
          staffDirectory={staffDirectory}
          selectedConversationId={selectedConversationId}
          onSelectConversation={setSelectedConversationId}
          onUpdateConversation={(updated) =>
            setConversations((prev) =>
              prev.map((c) => (c.id === updated.id ? updated : c))
            )
          }
          onOpenTicketView={(ticketId) => {
            setSelectedTicketId(ticketId);
            onNavigate(ADMIN_CONFIG.routes.tickets);
          }}
          isLoadingData={isLoadingData}
          theme={theme}
        />
      )}

      {activeSection === 'tickets' && (
        <AdminTicketManagementPage
          admin={admin}
          tickets={tickets}
          conversations={conversations}
          staffDirectory={staffDirectory}
          selectedTicketId={selectedTicketId}
          onSelectTicket={setSelectedTicketId}
          onTicketUpdated={(updated) =>
            setTickets((prev) =>
              prev.map((t) => (t.id === updated.id ? updated : t))
            )
          }
          onOpenLinkedConversation={(convId) => {
            setSelectedConversationId(convId);
            onNavigate(ADMIN_CONFIG.routes.monitoring);
          }}
          isLoadingData={isLoadingData}
          dataError={dataError}
          onRetryLoad={loadOperationsData}
          theme={theme}
        />
      )}

      {activeSection === 'settings' && (
        <AdminSettingsPage
          admin={admin}
          isAuthenticated={isAuthenticated}
          theme={theme}
          onSetTheme={setTheme}
          sidebarMode={sidebarMode}
          onChangeSidebarMode={setSidebarMode}
          notificationPrefs={notificationPrefs}
          onSaveNotificationPrefs={updateNotificationPrefs}
          onRenewSession={renewSession}
        />
      )}
    </AdminPortalLayout>
  );
};

export const AdminApp: React.FC = () => {
  const [pathname, setPathname] = useState<string>(() =>
    typeof window !== 'undefined'
      ? window.location.pathname
      : ADMIN_CONFIG.routes.dashboard
  );

  useEffect(() => {
    const onPopState = () => {
      setPathname(window.location.pathname);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((path: string, replace = false) => {
    if (typeof window === 'undefined') return;
    if (window.location.pathname !== path) {
      if (replace) {
        window.history.replaceState(null, '', path);
      } else {
        window.history.pushState(null, '', path);
      }
      setPathname(path);
    }
  }, []);

  return (
    <AdminAuthProvider onNavigate={navigate}>
      <AdminPortalShell pathname={pathname} onNavigate={navigate} />
    </AdminAuthProvider>
  );
};
