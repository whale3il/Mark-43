import React from 'react';
import {
  MessageSquare,
  FileText,
  Radio,
  ArrowRight,
  AlertCircle,
  RefreshCw,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import {
  StaffActivityItem,
  StaffConversation,
  StaffMemberProfile,
  StaffNavSection,
  StaffTicket,
} from '../types/staff.types';
import { AVAILABILITY_STYLE } from '../layouts/StaffPortalLayout';

interface StaffOverviewPageProps {
  staff: StaffMemberProfile;
  conversations: StaffConversation[];
  tickets: StaffTicket[];
  recentActivity: StaffActivityItem[];
  isLoadingData: boolean;
  dataError: string | null;
  onRetryLoad: () => void;
  onNavigateSection: (section: StaffNavSection) => void;
  onOpenConversation: (conversationId: string) => void;
  onOpenTicket: (ticketId: string) => void;
  theme: 'dark' | 'light';
}

export const StaffOverviewPage: React.FC<StaffOverviewPageProps> = ({
  staff,
  conversations,
  tickets,
  recentActivity,
  isLoadingData,
  dataError,
  onRetryLoad,
  onNavigateSection,
  onOpenConversation,
  onOpenTicket,
  theme,
}) => {
  const isLight = theme === 'light';
  const availMeta = AVAILABILITY_STYLE[staff.availability] || AVAILABILITY_STYLE.OFFLINE;

  const activeChats = conversations.filter((c) => c.status === 'active').length;
  const unreadTotal = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
  const resolvedTickets = tickets.filter((t) => t.status === 'Resolved').length;
  const activeTickets = tickets.length - resolvedTickets;
  const capacityDenominator = Math.max(staff.maxChats || 5, 1);
  const effectiveActiveChats =
    conversations.length > 0 ? activeChats : staff.activeChatsCount;
  const capacityPct = Math.min(
    100,
    Math.round((effectiveActiveChats / capacityDenominator) * 100)
  );

  // Build fallback recent activity strictly from already-loaded scoped records if backend didn't supply a dedicated feed
  const activityFeed: StaffActivityItem[] =
    recentActivity.length > 0
      ? recentActivity
      : [
          ...conversations.slice(0, 4).map((c) => ({
            id: `act-conv-${c.id}`,
            type: 'message' as const,
            title: `${c.customerName} · ${c.subject}`,
            detail: c.lastMessage,
            timestamp: c.lastMessageTimestamp || 'Recent',
            relatedConversationId: c.id,
          })),
          ...tickets.slice(0, 3).map((t) => ({
            id: `act-tkt-${t.id}`,
            type: 'ticket' as const,
            title: `${t.id} · ${t.subject}`,
            detail: `${t.status} · Priority ${t.priority}`,
            timestamp: t.updatedAt || t.createdAt || 'Recent',
            relatedTicketId: t.id,
          })),
        ].slice(0, 6);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="max-w-7xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-mono uppercase tracking-wider text-neutral-500">
            Staff Desk Overview
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">
            Welcome back, {staff.name}
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5 truncate">
            {staff.role} · {staff.department}
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
              className={`w-3.5 h-3.5 ${isLoadingData ? 'animate-spin text-emerald-500' : ''}`}
            />
            <span>Refresh Desk</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateSection('conversations')}
            className="px-3.5 h-9 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Open Inbox</span>
          </button>
        </div>
      </div>

      {/* Honest API Error Notice */}
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
              <div className="font-semibold">Backend Data Sync Notice</div>
              <p className="text-[11px] opacity-90">{dataError}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onRetryLoad}
            className="px-3 py-1.5 rounded-lg bg-amber-500 text-neutral-950 font-semibold text-[11px] shrink-0 cursor-pointer"
          >
            Retry Sync
          </button>
        </div>
      )}

      {/* Minimal 4-Card Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
        <button
          type="button"
          onClick={() => onNavigateSection('conversations')}
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
            {effectiveActiveChats}
          </div>
          <div className="mt-1 text-[11px] text-neutral-500 font-mono tabular-nums">
            {unreadTotal} unread · {conversations.length} total assigned
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigateSection('availability')}
          className={`text-left p-4 rounded-2xl border transition-colors cursor-pointer ${
            isLight
              ? 'bg-white border-slate-200 hover:border-emerald-300'
              : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Chat Capacity</span>
            <span className="text-[11px] font-mono text-neutral-500 tabular-nums">
              {capacityPct}%
            </span>
          </div>
          <div className="mt-2.5 text-2xl font-bold font-mono tabular-nums">
            {effectiveActiveChats}
            <span className="text-sm font-normal text-neutral-500">
              {' '}
              / {staff.maxChats}
            </span>
          </div>
          <div
            className={`mt-2 h-1.5 w-full rounded-full overflow-hidden ${
              isLight ? 'bg-slate-200' : 'bg-neutral-800'
            }`}
          >
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${capacityPct}%` }}
            />
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
            <span>Assigned Tickets</span>
            <FileText className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-2.5 text-2xl font-bold font-mono tabular-nums">
            {tickets.length}
          </div>
          <div className="mt-1 text-[11px] text-neutral-500 font-mono tabular-nums">
            {activeTickets} active · {resolvedTickets} resolved
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigateSection('availability')}
          className={`text-left p-4 rounded-2xl border transition-colors cursor-pointer ${
            isLight
              ? 'bg-white border-slate-200 hover:border-emerald-300'
              : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Current Availability</span>
            <Radio className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2.5 flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${availMeta.dot}`} />
            <span className={`text-xl font-bold font-mono ${availMeta.text}`}>
              {staff.availability}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-neutral-500">
            Click to update routing status
          </div>
        </button>
      </div>

      {/* Recent Activity */}
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
            <h2 className="text-sm font-semibold">Recent Scoped Activity</h2>
          </div>
          <span className="text-[11px] font-mono text-neutral-500">
            {activityFeed.length} items
          </span>
        </div>

        {isLoadingData ? (
          <div className="p-8 text-center text-xs text-neutral-400">
            Loading assigned conversations and tickets...
          </div>
        ) : activityFeed.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <CheckCircle2 className="w-7 h-7 text-neutral-600 mx-auto" />
            <div className="text-sm font-medium">No recent desk activity yet</div>
            <p className="text-xs text-neutral-500 max-w-md mx-auto">
              New client conversations and assigned tickets routed to {staff.name}{' '}
              will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-800/40">
            {activityFeed.map((item) => (
              <div
                key={item.id}
                className={`px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3 transition-colors ${
                  isLight ? 'hover:bg-slate-50' : 'hover:bg-neutral-950/40'
                }`}
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="text-xs font-semibold truncate">{item.title}</div>
                  <div className="text-[11px] text-neutral-400 truncate">
                    {item.detail}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[11px] font-mono text-neutral-500 hidden sm:inline">
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
                      <span>Open</span>
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
