import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { STAFF_CONFIG } from './config/staffConfig';
import { StaffAuthProvider, useStaffAuth } from './context/StaffAuthContext';
import { StaffPortalLayout } from './layouts/StaffPortalLayout';
import { StaffSignInPage } from './pages/StaffSignInPage';
import { StaffSetPasswordPage } from './pages/StaffSetPasswordPage';
import { StaffOverviewPage } from './pages/StaffOverviewPage';
import { StaffConversationsPage } from './pages/StaffConversationsPage';
import { StaffTicketsPage } from './pages/StaffTicketsPage';
import { StaffAvailabilityPage } from './pages/StaffAvailabilityPage';
import { StaffSettingsPage } from './pages/StaffSettingsPage';
import { staffPortalService } from './services/staffPortalService';
import { staffAblyService } from './services/staffAblyService';
import {
  CannedResponse,
  CustomerProfile,
  StaffActivityItem,
  StaffConversation,
  StaffNavSection,
  StaffTicket,
  TicketStatus,
} from './types/staff.types';

function sectionToPath(section: StaffNavSection): string {
  switch (section) {
    case 'conversations':
      return STAFF_CONFIG.routes.conversations;
    case 'tickets':
      return STAFF_CONFIG.routes.tickets;
    case 'availability':
      return STAFF_CONFIG.routes.availability;
    case 'settings':
      return STAFF_CONFIG.routes.settings;
    case 'overview':
    default:
      return STAFF_CONFIG.routes.dashboard;
  }
}

function pathToSection(pathname: string): StaffNavSection {
  const clean = pathname.toLowerCase().replace(/\/+$/, '');
  if (clean === STAFF_CONFIG.routes.conversations) return 'conversations';
  if (clean === STAFF_CONFIG.routes.tickets) return 'tickets';
  if (clean === STAFF_CONFIG.routes.availability) return 'availability';
  if (clean === STAFF_CONFIG.routes.settings) return 'settings';
  return 'overview';
}

const StaffPortalShell: React.FC<{
  pathname: string;
  search: string;
  onNavigate: (path: string, replace?: boolean) => void;
}> = ({ pathname, search, onNavigate }) => {
  const {
    staff,
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
    exitDevPreviewMode,
    updateAvailabilityConfirmed,
    syncActiveChatsCount,
  } = useStaffAuth();

  const normalizedPath = pathname.toLowerCase().replace(/\/+$/, '') || '/staff';
  const queryParams = new URLSearchParams(search);
  const inviteToken = queryParams.get('token') || '';

  const isSignInPath =
    normalizedPath === STAFF_CONFIG.routes.signIn ||
    normalizedPath === STAFF_CONFIG.routes.loginAlias;
  const isInvitePath = normalizedPath === STAFF_CONFIG.routes.invite;
  const isSetPasswordPath = normalizedPath === STAFF_CONFIG.routes.setPassword;
  const isPublicAuthPath = isSignInPath || isInvitePath || isSetPasswordPath;

  // Protected workspace data state (strictly scoped to authenticated or preview staff)
  const [conversations, setConversations] = useState<StaffConversation[]>([]);
  const [customers, setCustomers] = useState<Record<string, CustomerProfile>>({});
  const [tickets, setTickets] = useState<StaffTicket[]>([]);
  const [cannedResponses, setCannedResponses] = useState<CannedResponse[]>([]);
  const [recentActivity, setRecentActivity] = useState<StaffActivityItem[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string>('');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [previewFallbackSources, setPreviewFallbackSources] = useState<string[]>([]);
  const [previewFallbackReason, setPreviewFallbackReason] = useState<string | undefined>(
    undefined
  );

  // Route protection & canonical redirects
  useEffect(() => {
    if (isLoadingSession) return;

    if (!staff) {
      if (!isPublicAuthPath) {
        onNavigate(STAFF_CONFIG.routes.signIn, true);
      }
      return;
    }

    // Authenticated staff visiting /staff or /staff/signin -> redirect to /staff/dashboard.
    // Allow preview mode users to stay on /staff/signin if they explicitly return there to sign in.
    if (normalizedPath === '/staff' || (isSignInPath && isAuthenticated)) {
      onNavigate(STAFF_CONFIG.routes.dashboard, true);
    }
  }, [
    isLoadingSession,
    staff,
    isAuthenticated,
    normalizedPath,
    isPublicAuthPath,
    isSignInPath,
    onNavigate,
  ]);

  // Fetch scoped conversations, tickets, overview, and canned responses.
  // Automatically uses live Express endpoints whenever available; dev-only fallback flags preview mode.
  const loadDeskData = useCallback(async () => {
    if (!staff) return;
    setIsLoadingData(true);
    setDataError(null);

    try {
      const [convRes, ticketRes, overviewRes, cannedRes] = await Promise.all([
        staffPortalService.listScopedConversations(staff.id),
        staffPortalService.listScopedTickets(staff.id),
        staffPortalService.getOverview(staff.id),
        staffPortalService.listCannedResponses(),
      ]);

      const errors: string[] = [];
      const fallbackSources: string[] = [];
      let firstReason: string | undefined;

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
        const activeChats = convRes.data.conversations.filter(
          (c) => c.status === 'active'
        ).length;
        syncActiveChatsCount(activeChats);
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

      if (overviewRes.success && overviewRes.data?.recentActivity) {
        setRecentActivity(overviewRes.data.recentActivity);
        if (overviewRes.isMockFallback) {
          fallbackSources.push('overview');
          firstReason ||= overviewRes.fallbackReason;
        }
      }

      if (cannedRes.success && cannedRes.data) {
        setCannedResponses(cannedRes.data);
        if (cannedRes.isMockFallback) {
          fallbackSources.push('canned responses');
          firstReason ||= cannedRes.fallbackReason;
        }
      }

      setPreviewFallbackSources(fallbackSources);
      setPreviewFallbackReason(firstReason);

      if (errors.length > 0) {
        setDataError(errors[0]);
      }
    } finally {
      setIsLoadingData(false);
    }
  }, [staff?.id, syncActiveChatsCount]);

  useEffect(() => {
    if (staff) {
      loadDeskData();
    } else {
      setConversations([]);
      setTickets([]);
      setCustomers({});
      setRecentActivity([]);
      setPreviewFallbackSources([]);
      setPreviewFallbackReason(undefined);
      setSelectedConversationId('');
      setSelectedTicketId(null);
    }
  }, [staff?.id, loadDeskData]);

  // Listen for live Ably staff assignment & ticket notifications
  useEffect(() => {
    if (!staff) return;
    const unsubAssign = staffAblyService.onStaffAssignment(() => {
      loadDeskData();
    });
    const unsubTicket = staffAblyService.onStaffTicketEvent((partial) => {
      setTickets((prev) => {
        const exists = prev.some((t) => t.id === partial.id);
        if (!exists) {
          loadDeskData();
          return prev;
        }
        return prev.map((t) =>
          t.id === partial.id ? ({ ...t, ...partial } as StaffTicket) : t
        );
      });
    });

    return () => {
      unsubAssign();
      unsubTicket();
    };
  }, [staff?.id, loadDeskData]);

  const handleRetryLiveConnection = useCallback(async () => {
    const authed = await refreshSession();
    if (authed) {
      await loadDeskData();
    } else if (staff) {
      await loadDeskData();
    }
  }, [refreshSession, loadDeskData, staff]);

  // Session restoration splash
  if (isLoadingSession) {
    return (
      <div className="min-h-dvh w-full flex flex-col items-center justify-center gap-3 bg-neutral-950 text-neutral-100 p-6">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-emerald-500" />
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-neutral-400">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500" />
          <span>Verifying staff security session...</span>
        </div>
      </div>
    );
  }

  // Public Auth Routes
  if (isInvitePath || isSetPasswordPath) {
    return (
      <StaffSetPasswordPage
        token={inviteToken}
        isInviteVerificationRoute={isInvitePath}
        onNavigate={onNavigate}
      />
    );
  }

  if (!staff || isSignInPath) {
    return <StaffSignInPage />;
  }

  const activeSection = pathToSection(normalizedPath);
  const unreadConversationsCount = conversations.filter(
    (c) => (c.unreadCount || 0) > 0
  ).length;
  const openTicketsCount = tickets.filter((t) => t.status !== 'Resolved').length;

  const handleUpdateConversation = (updated: StaffConversation) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c))
    );
  };

  const handleUpdateTicketStatusFromChat = async (
    ticketId: string,
    status: TicketStatus
  ) => {
    const res = await staffPortalService.updateTicket(ticketId, { status });
    if (res.success && res.data) {
      setTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? res.data! : t))
      );
    } else if (res.error) {
      setDataError(res.error.message);
    }
  };

  return (
    <StaffPortalLayout
      staff={staff}
      activeSection={activeSection}
      onSelectSection={(sec) => onNavigate(sectionToPath(sec))}
      onSignOut={signOut}
      sidebarMode={sidebarMode}
      onChangeSidebarMode={setSidebarMode}
      unreadConversationsCount={unreadConversationsCount}
      openTicketsCount={openTicketsCount}
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
        <StaffOverviewPage
          staff={staff}
          conversations={conversations}
          tickets={tickets}
          recentActivity={recentActivity}
          isLoadingData={isLoadingData}
          dataError={dataError}
          onRetryLoad={loadDeskData}
          onNavigateSection={(sec) => onNavigate(sectionToPath(sec))}
          onOpenConversation={(convId) => {
            setSelectedConversationId(convId);
            onNavigate(STAFF_CONFIG.routes.conversations);
          }}
          onOpenTicket={(ticketId) => {
            setSelectedTicketId(ticketId);
            onNavigate(STAFF_CONFIG.routes.tickets);
          }}
          theme={theme}
        />
      )}

      {activeSection === 'conversations' && (
        <StaffConversationsPage
          staff={staff}
          conversations={conversations}
          customers={customers}
          tickets={tickets}
          cannedResponses={cannedResponses}
          selectedConversationId={selectedConversationId}
          onSelectConversation={setSelectedConversationId}
          onUpdateConversation={handleUpdateConversation}
          onUpdateTicketStatus={handleUpdateTicketStatusFromChat}
          onOpenTicketView={(ticketId) => {
            setSelectedTicketId(ticketId);
            onNavigate(STAFF_CONFIG.routes.tickets);
          }}
          isLoadingData={isLoadingData}
          theme={theme}
        />
      )}

      {activeSection === 'tickets' && (
        <StaffTicketsPage
          staff={staff}
          tickets={tickets}
          conversations={conversations}
          selectedTicketId={selectedTicketId}
          onSelectTicket={setSelectedTicketId}
          onTicketUpdated={(updated) =>
            setTickets((prev) =>
              prev.map((t) => (t.id === updated.id ? updated : t))
            )
          }
          onOpenLinkedConversation={(convId) => {
            setSelectedConversationId(convId);
            onNavigate(STAFF_CONFIG.routes.conversations);
          }}
          isLoadingData={isLoadingData}
          dataError={dataError}
          onRetryLoad={loadDeskData}
          theme={theme}
        />
      )}

      {activeSection === 'availability' && (
        <StaffAvailabilityPage
          staff={staff}
          conversations={conversations}
          tickets={tickets}
          onConfirmAvailability={updateAvailabilityConfirmed}
          theme={theme}
        />
      )}

      {activeSection === 'settings' && (
        <StaffSettingsPage
          staff={staff}
          theme={theme}
          onSetTheme={setTheme}
          sidebarMode={sidebarMode}
          onChangeSidebarMode={setSidebarMode}
          notificationPrefs={notificationPrefs}
          onSaveNotificationPrefs={updateNotificationPrefs}
        />
      )}
    </StaffPortalLayout>
  );
};

export const StaffApp: React.FC = () => {
  const [locationState, setLocationState] = useState<{
    pathname: string;
    search: string;
  }>(() => ({
    pathname:
      typeof window !== 'undefined'
        ? window.location.pathname
        : STAFF_CONFIG.routes.dashboard,
    search: typeof window !== 'undefined' ? window.location.search : '',
  }));

  useEffect(() => {
    const onPopState = () => {
      setLocationState({
        pathname: window.location.pathname,
        search: window.location.search,
      });
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((path: string, replace = false) => {
    if (typeof window === 'undefined') return;
    const [nextPathname, nextQuery] = path.split('?');
    const nextSearch = nextQuery ? `?${nextQuery}` : '';

    if (
      window.location.pathname !== nextPathname ||
      window.location.search !== nextSearch
    ) {
      if (replace) {
        window.history.replaceState(null, '', path);
      } else {
        window.history.pushState(null, '', path);
      }
      setLocationState({ pathname: nextPathname, search: nextSearch });
    }
  }, []);

  return (
    <StaffAuthProvider onNavigate={navigate}>
      <StaffPortalShell
        pathname={locationState.pathname}
        search={locationState.search}
        onNavigate={navigate}
      />
    </StaffAuthProvider>
  );
};
