import React from 'react';
import {
  MessageSquare,
  FileText,
  Users,
  Clock,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Lock,
  CheckCircle2,
  BarChart3,
} from 'lucide-react';
import {
  AdminConversation,
  AdminNavSection,
  AdminOverviewData,
  AdminProfile,
  AdminStaffRecord,
  AdminTicket,
} from '../types/admin.types';

interface AdminOverviewPageProps {
  admin: AdminProfile;
  overview: AdminOverviewData | null;
  conversations: AdminConversation[];
  tickets: AdminTicket[];
  staffDirectory: AdminStaffRecord[];
  isLoadingData: boolean;
  dataError: string | null;
  onRetryLoad: () => void;
  onNavigateSection: (sec: AdminNavSection) => void;
  onOpenConversation: (convId: string) => void;
  onOpenTicket: (ticketId: string) => void;
  theme: 'dark' | 'light';
}

export const AdminOverviewPage: React.FC<AdminOverviewPageProps> = ({
  admin,
  overview,
  conversations,
  tickets,
  staffDirectory,
  isLoadingData,
  dataError,
  onRetryLoad,
  onNavigateSection,
  onOpenConversation,
  onOpenTicket,
  theme,
}) => {
  const isLight = theme === 'light';

  if (!admin.permissions.canViewReports) {
    return (
      <div className="flex-1 min-h-0 flex items-center justify-center p-6">
        <div
          className={`max-w-md w-full rounded-2xl border p-6 text-center space-y-3 ${
            isLight
              ? 'bg-white border-slate-200'
              : 'bg-neutral-900 border-neutral-800'
          }`}
        >
          <div className="w-11 h-11 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-500 flex items-center justify-center mx-auto">
            <Lock className="w-5 h-5" />
          </div>
          <h1 className="text-base font-bold">
            Reporting Access Restricted (`canViewReports`)
          </h1>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Your administrator profile does not include reporting and executive
            analytics permissions. Contact a root security administrator or
            navigate to permitted operational sections.
          </p>
        </div>
      </div>
    );
  }

  const activeConversationsCount =
    overview?.activeConversations ??
    conversations.filter((c) => c.status === 'active').length;
  const openAndPendingTicketsCount =
    overview?.openAndPendingTickets ??
    tickets.filter((t) => t.status !== 'Resolved').length;
  const onlineStaffCount =
    overview?.onlineAndAvailableStaff ??
    staffDirectory.filter(
      (s) => s.availability === 'ONLINE' && s.accountStatus === 'ACTIVE'
    ).length;
  const totalStaffCount = overview?.totalStaff ?? staffDirectory.length;
  const waitingQueueCount =
    overview?.waitingQueueCount ??
    conversations.filter((c) => Boolean(c.waitingSince || c.status === 'pending'))
      .length;
  const unassignedCount =
    overview?.unassignedConversationsCount ??
    conversations.filter((c) => c.isUnassigned).length;

  const escalations = tickets.filter(
    (t) => t.status === 'Escalated' || t.priority === 'Urgent'
  );

  const activityFeed = overview?.recentActivity || [];
  const deptMetrics = overview?.departmentMetrics || [];
  const maxDeptLoad = Math.max(
    1,
    ...deptMetrics.map((d) => d.activeConversations + d.openTickets)
  );

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="max-w-7xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] font-mono uppercase tracking-wider text-neutral-500">
              Executive Operations Overview
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">
              Command Console · {admin.name}
            </h1>
            <p className="text-xs text-neutral-400 mt-0.5 truncate">
              {admin.role} · {admin.accessLevel}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onRetryLoad}
              disabled={isLoadingData}
              className={`px-3 h-9 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 ${
                isLight
                  ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:bg-neutral-800'
              }`}
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  isLoadingData ? 'animate-spin text-emerald-500' : ''
                }`}
              />
              <span>Refresh Metrics</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigateSection('monitoring')}
              className="px-3.5 h-9 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <span>Open Live Supervision</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {dataError && (
          <div
            className={`p-3.5 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              isLight
                ? 'border-amber-200 bg-amber-50 text-amber-900'
                : 'border-amber-500/40 bg-amber-500/10 text-amber-300'
            }`}
          >
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold">Backend Operations Notice</div>
                <p className="text-[11px] opacity-90">{dataError}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onRetryLoad}
              className="px-3 py-1.5 rounded-lg bg-amber-500 text-neutral-950 font-semibold text-[11px] shrink-0 cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* 4 Responsive KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
          <button
            type="button"
            onClick={() => onNavigateSection('monitoring')}
            className={`text-left p-4 rounded-2xl border transition-colors cursor-pointer ${
              isLight
                ? 'bg-white border-slate-200 hover:border-emerald-300'
                : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span>Active Conversations</span>
              <MessageSquare className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="mt-2.5 text-2xl font-bold font-mono tabular-nums">
              {activeConversationsCount}
            </div>
            <div className="mt-1 text-[11px] text-neutral-500 font-mono tabular-nums">
              {conversations.length} supervised total
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigateSection('tickets')}
            className={`text-left p-4 rounded-2xl border transition-colors cursor-pointer ${
              isLight
                ? 'bg-white border-slate-200 hover:border-emerald-300'
                : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span>Open & Pending Tickets</span>
              <FileText className="w-4 h-4 text-sky-400" />
            </div>
            <div className="mt-2.5 text-2xl font-bold font-mono tabular-nums">
              {openAndPendingTicketsCount}
            </div>
            <div className="mt-1 text-[11px] text-neutral-500 font-mono tabular-nums">
              {escalations.length} urgent / escalated
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigateSection('staff')}
            className={`text-left p-4 rounded-2xl border transition-colors cursor-pointer ${
              isLight
                ? 'bg-white border-slate-200 hover:border-emerald-300'
                : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span>Online & Available Staff</span>
              <Users className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="mt-2.5 text-2xl font-bold font-mono tabular-nums">
              {onlineStaffCount}
              <span className="text-sm font-normal text-neutral-500">
                {' '}
                / {totalStaffCount}
              </span>
            </div>
            <div className="mt-1 text-[11px] text-neutral-500">
              Manage capacity in Staff Directory
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigateSection('monitoring')}
            className={`text-left p-4 rounded-2xl border transition-colors cursor-pointer ${
              isLight
                ? 'bg-white border-slate-200 hover:border-amber-300'
                : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span>Waiting Queue & Unassigned</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="mt-2.5 text-2xl font-bold font-mono tabular-nums text-amber-500">
              {waitingQueueCount}
            </div>
            <div className="mt-1 text-[11px] text-neutral-500 font-mono tabular-nums">
              {unassignedCount} awaiting auto/manual routing
            </div>
          </button>
        </div>

        {/* Two-Column Split: Escalations & Minimal Department Load Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Escalations Requiring Attention */}
          <section
            className={`lg:col-span-7 rounded-2xl border overflow-hidden flex flex-col ${
              isLight
                ? 'bg-white border-slate-200'
                : 'bg-neutral-900 border-neutral-800'
            }`}
          >
            <div
              className={`px-4 sm:px-5 py-3.5 border-b flex items-center justify-between ${
                isLight
                  ? 'bg-slate-50 border-slate-200'
                  : 'bg-neutral-950/60 border-neutral-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <h2 className="text-sm font-semibold">
                  Escalations Requiring Attention
                </h2>
              </div>
              <span className="text-[11px] font-mono text-neutral-500 tabular-nums">
                {escalations.length} active
              </span>
            </div>

            {escalations.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <CheckCircle2 className="w-7 h-7 text-emerald-500 mx-auto" />
                <div className="text-sm font-medium">
                  No Critical Escalations Pending
                </div>
                <p className="text-xs text-neutral-500">
                  All urgent wires, FIDO2 audits, and VIP concierge requests are
                  operating within SLA.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-neutral-800/40">
                {escalations.map((tkt) => (
                  <div
                    key={tkt.id}
                    className={`px-4 sm:px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isLight ? 'hover:bg-slate-50' : 'hover:bg-neutral-950/40'
                    }`}
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 text-[11px] font-mono">
                        <span className="font-bold text-rose-500">
                          {tkt.id}
                        </span>
                        <span aria-hidden="true" className="text-neutral-500">
                          ·
                        </span>
                        <span className="text-amber-500 font-semibold">
                          {tkt.priority}
                        </span>
                        <span aria-hidden="true" className="text-neutral-500">
                          ·
                        </span>
                        <span className="text-neutral-400">{tkt.status}</span>
                      </div>
                      <div className="text-xs font-semibold truncate">
                        {tkt.subject}
                      </div>
                      <div className="text-[11px] text-neutral-400 truncate">
                        {tkt.customerName || 'Private Client'} · Assigned:{' '}
                        {tkt.assignedAgent}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {tkt.conversationId && (
                        <button
                          type="button"
                          onClick={() => onOpenConversation(tkt.conversationId!)}
                          className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-medium cursor-pointer ${
                            isLight
                              ? 'border-slate-200 text-slate-700 hover:bg-slate-100'
                              : 'border-neutral-800 text-neutral-300 hover:bg-neutral-800'
                          }`}
                        >
                          Monitor Chat
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onOpenTicket(tkt.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-semibold text-[11px] cursor-pointer"
                      >
                        Inspect Ticket
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Minimal Department Workload Chart */}
          <section
            className={`lg:col-span-5 rounded-2xl border overflow-hidden flex flex-col ${
              isLight
                ? 'bg-white border-slate-200'
                : 'bg-neutral-900 border-neutral-800'
            }`}
          >
            <div
              className={`px-4 sm:px-5 py-3.5 border-b flex items-center justify-between ${
                isLight
                  ? 'bg-slate-50 border-slate-200'
                  : 'bg-neutral-950/60 border-neutral-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-500" />
                <h2 className="text-sm font-semibold">Department Load</h2>
              </div>
              <span className="text-[11px] font-mono text-neutral-500">
                Chats + Tickets
              </span>
            </div>

            <div className="p-4 sm:p-5 space-y-4">
              {deptMetrics.length === 0 ? (
                <div className="text-xs text-neutral-500 py-6 text-center">
                  No department metrics loaded.
                </div>
              ) : (
                deptMetrics.map((dept) => {
                  const total = dept.activeConversations + dept.openTickets;
                  const pct = Math.min(
                    100,
                    Math.round((total / maxDeptLoad) * 100)
                  );
                  return (
                    <div key={dept.department} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-medium truncate">
                          {dept.department}
                        </span>
                        <span className="text-[11px] font-mono text-neutral-400 tabular-nums shrink-0">
                          {dept.activeConversations}c · {dept.openTickets}t ·{' '}
                          {dept.onlineStaff} online
                        </span>
                      </div>
                      <div
                        className={`h-2 w-full rounded-full overflow-hidden ${
                          isLight ? 'bg-slate-200' : 'bg-neutral-800'
                        }`}
                      >
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>

        {/* Recent Support Activity */}
        <section
          className={`rounded-2xl border overflow-hidden ${
            isLight
              ? 'bg-white border-slate-200'
              : 'bg-neutral-900 border-neutral-800'
          }`}
        >
          <div
            className={`px-4 sm:px-5 py-3.5 border-b flex items-center justify-between ${
              isLight
                ? 'bg-slate-50 border-slate-200'
                : 'bg-neutral-950/60 border-neutral-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-500" />
              <h2 className="text-sm font-semibold">Recent Support Activity</h2>
            </div>
            <span className="text-[11px] font-mono text-neutral-500 tabular-nums">
              {activityFeed.length} events
            </span>
          </div>

          {activityFeed.length === 0 ? (
            <div className="p-8 text-center text-xs text-neutral-500">
              No recent support events recorded yet.
            </div>
          ) : (
            <div className="divide-y divide-neutral-800/40">
              {activityFeed.map((item) => (
                <div
                  key={item.id}
                  className={`px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3 ${
                    isLight ? 'hover:bg-slate-50' : 'hover:bg-neutral-950/40'
                  }`}
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="text-xs font-semibold truncate">
                      {item.title}
                    </div>
                    <div className="text-[11px] text-neutral-400 truncate">
                      {item.detail}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[11px] font-mono text-neutral-500 hidden sm:inline tabular-nums">
                      {item.timestamp}
                    </span>
                    {(item.relatedConversationId || item.relatedTicketId) && (
                      <button
                        type="button"
                        onClick={() => {
                          if (item.relatedConversationId) {
                            onOpenConversation(item.relatedConversationId);
                          } else if (item.relatedTicketId) {
                            onOpenTicket(item.relatedTicketId);
                          }
                        }}
                        className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-medium flex items-center gap-1 cursor-pointer ${
                          isLight
                            ? 'border-slate-200 text-slate-700 hover:bg-slate-100'
                            : 'border-neutral-800 text-neutral-300 hover:bg-neutral-800'
                        }`}
                      >
                        <span>Inspect</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
