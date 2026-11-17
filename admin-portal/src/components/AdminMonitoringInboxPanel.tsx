import React from 'react';
import {
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  MessageSquare,
  Tag,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { AdminConversation } from '../types/admin.types';

export type MonitoringInboxFilter =
  | 'All'
  | 'queue'
  | 'active'
  | 'pending'
  | 'resolved';

interface AdminMonitoringInboxPanelProps {
  conversations: AdminConversation[];
  selectedConversationId: string;
  onSelectConversation: (convId: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  statusFilter: MonitoringInboxFilter;
  onStatusFilterChange: (st: MonitoringInboxFilter) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isLoading: boolean;
  theme: 'dark' | 'light';
  widthPx?: number;
  isResizing?: boolean;
}

export const AdminMonitoringInboxPanel: React.FC<
  AdminMonitoringInboxPanelProps
> = ({
  conversations,
  selectedConversationId,
  onSelectConversation,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  isCollapsed,
  onToggleCollapse,
  isLoading,
  theme,
  widthPx,
  isResizing = false,
}) => {
  const isLight = theme === 'light';
  const q = searchQuery.trim().toLowerCase();

  const filtered = conversations.filter((c) => {
    const matchesStatus =
      statusFilter === 'All'
        ? true
        : statusFilter === 'queue'
        ? Boolean(c.isUnassigned || c.waitingSince || c.status === 'pending')
        : c.status === statusFilter;

    const matchesSearch =
      !q ||
      c.customerName.toLowerCase().includes(q) ||
      c.assignedStaffName.toLowerCase().includes(q) ||
      c.subject.toLowerCase().includes(q) ||
      c.department.toLowerCase().includes(q) ||
      c.lastMessage.toLowerCase().includes(q) ||
      (c.linkedTicketId && c.linkedTicketId.toLowerCase().includes(q));

    return matchesStatus && matchesSearch;
  });

  if (isCollapsed) {
    return (
      <div
        className={`hidden md:flex w-[68px] shrink-0 border-r flex-col min-h-0 ${
          isLight
            ? 'bg-slate-50 border-slate-200'
            : 'bg-neutral-950/60 border-neutral-800'
        }`}
      >
        <div className="p-2.5 border-b border-neutral-800/40 flex justify-center shrink-0">
          <button
            type="button"
            onClick={onToggleCollapse}
            title="Expand Monitoring Inbox"
            aria-label="Expand Monitoring Inbox"
            className={`w-9 h-9 rounded-lg border flex items-center justify-center cursor-pointer ${
              isLight
                ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-100'
            }`}
          >
            <PanelLeftOpen className="w-4 h-4 text-emerald-500" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto py-3 px-2 flex flex-col items-center gap-2.5">
          {filtered.map((conv) => {
            const isSelected = conv.id === selectedConversationId;
            return (
              <button
                key={conv.id}
                type="button"
                onClick={() => onSelectConversation(conv.id)}
                title={`${conv.customerName} (${conv.assignedStaffName}) — ${conv.subject}`}
                className={`relative w-10 h-10 rounded-xl border flex items-center justify-center text-xs font-bold shrink-0 cursor-pointer transition-colors ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                    : isLight
                    ? 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                    : 'border-neutral-800 bg-neutral-900 text-neutral-300 hover:bg-neutral-800'
                }`}
              >
                {conv.customerName.slice(0, 2).toUpperCase()}
                {conv.isUnassigned ? (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500" />
                ) : (
                  conv.unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-0.5 rounded-full bg-emerald-500 text-neutral-950 text-[9px] font-mono font-bold flex items-center justify-center">
                      {conv.unreadCount}
                    </span>
                  )
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div
      style={
        widthPx
          ? ({ '--admin-inbox-w': `${widthPx}px` } as React.CSSProperties)
          : undefined
      }
      className={`w-full ${
        widthPx ? 'md:w-[var(--admin-inbox-w)]' : 'md:w-[300px] xl:w-[330px]'
      } ${
        isResizing ? 'transition-none' : 'transition-[width] duration-150'
      } shrink-0 ${
        widthPx ? '' : 'md:border-r'
      } flex flex-col min-h-0 h-full overflow-hidden ${
        isLight
          ? 'bg-slate-50/70 border-slate-200'
          : 'bg-neutral-950/50 border-neutral-800'
      }`}
    >
      {/* Header */}
      <div
        className={`p-3 border-b space-y-2.5 shrink-0 ${
          isLight
            ? 'border-slate-200 bg-white'
            : 'border-neutral-800 bg-neutral-950/80'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-xs font-bold tracking-tight truncate">
              Live Supervision Queue
            </h2>
            <div className="text-[11px] font-mono text-neutral-500 tabular-nums">
              {filtered.length} conversation{filtered.length === 1 ? '' : 's'}
            </div>
          </div>

          <button
            type="button"
            onClick={onToggleCollapse}
            title="Collapse Inbox"
            aria-label="Collapse Inbox"
            className={`hidden md:inline-flex p-1.5 rounded-lg border cursor-pointer ${
              isLight
                ? 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-100'
            }`}
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search client, staff, ticket..."
            className={`w-full pl-8 pr-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
              isLight
                ? 'bg-slate-50 border-slate-200 text-slate-900'
                : 'bg-neutral-900 border-neutral-800 text-neutral-100'
            }`}
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto text-[11px] pb-0.5">
          {(
            [
              { id: 'All', label: 'All' },
              { id: 'queue', label: 'Queue' },
              { id: 'active', label: 'Active' },
              { id: 'pending', label: 'Pending' },
              { id: 'resolved', label: 'Resolved' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onStatusFilterChange(tab.id)}
              className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                statusFilter === tab.id
                  ? 'bg-emerald-500 text-neutral-950 font-semibold'
                  : isLight
                  ? 'text-slate-600 hover:bg-slate-200'
                  : 'text-neutral-400 hover:bg-neutral-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable List */}
      <div className="flex-1 min-h-0 overflow-y-auto p-2.5 space-y-2">
        {isLoading ? (
          <div className="p-6 text-center text-xs text-neutral-500">
            Loading support conversations...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-center space-y-2 text-xs text-neutral-400">
            <MessageSquare className="w-7 h-7 mx-auto opacity-40" />
            <div>No conversations match current filter.</div>
          </div>
        ) : (
          filtered.map((conv) => {
            const isSelected = conv.id === selectedConversationId;
            return (
              <button
                key={conv.id}
                type="button"
                onClick={() => onSelectConversation(conv.id)}
                className={`w-full text-left p-3 rounded-xl border transition-colors flex flex-col gap-1.5 cursor-pointer ${
                  isSelected
                    ? isLight
                      ? 'bg-white border-emerald-500 ring-1 ring-emerald-500/20'
                      : 'bg-neutral-900 border-emerald-500/70'
                    : isLight
                    ? 'bg-white/80 border-slate-200 hover:bg-white'
                    : 'bg-neutral-900/40 border-neutral-800/80 hover:bg-neutral-900'
                }`}
              >
                <div className="flex items-center justify-between gap-2 w-full">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="relative shrink-0">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-500 font-bold text-[10px] flex items-center justify-center">
                        {conv.customerName.slice(0, 2).toUpperCase()}
                      </div>
                      {conv.customerOnline && (
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border ${
                            isLight ? 'border-white' : 'border-neutral-950'
                          } bg-emerald-500`}
                        />
                      )}
                    </div>
                    <span className="text-xs font-semibold truncate">
                      {conv.customerName}
                    </span>
                  </div>

                  <span className="text-[10px] font-mono text-neutral-500 shrink-0 tabular-nums">
                    {conv.lastMessageTimestamp}
                  </span>
                </div>

                <div className="text-xs font-medium text-emerald-500 truncate w-full">
                  {conv.subject}
                </div>

                <div className="text-[11px] text-neutral-400 truncate w-full">
                  {conv.lastMessage}
                </div>

                {/* Staff assignment & status metadata (clean unboxed text) */}
                <div className="flex items-center justify-between gap-2 w-full pt-0.5 text-[11px] font-mono">
                  <div className="flex items-center gap-1.5 min-w-0 text-neutral-500 truncate">
                    <span
                      className={
                        conv.isUnassigned
                          ? 'text-amber-500 font-semibold'
                          : isLight
                          ? 'text-slate-700'
                          : 'text-neutral-300'
                      }
                    >
                      {conv.assignedStaffName}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span
                      className={`capitalize ${
                        conv.status === 'active'
                          ? 'text-emerald-500'
                          : conv.status === 'pending'
                          ? 'text-amber-500'
                          : 'text-sky-500'
                      }`}
                    >
                      {conv.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {conv.isEscalated && (
                      <AlertTriangle
                        className="w-3.5 h-3.5 text-rose-500"
                        aria-label="Escalated thread"
                      />
                    )}
                    {conv.waitingSince && (
                      <span className="flex items-center gap-0.5 text-[10px] text-amber-500 tabular-nums">
                        <Clock className="w-2.5 h-2.5" />
                        {conv.waitingSince}
                      </span>
                    )}
                    {conv.unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-md bg-emerald-500 text-neutral-950 font-bold text-[10px] tabular-nums">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>

                {conv.linkedTicketId && (
                  <div className="flex items-center gap-1 text-[10px] font-mono text-neutral-500">
                    <Tag className="w-2.5 h-2.5 shrink-0" />
                    <span>{conv.linkedTicketId}</span>
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
