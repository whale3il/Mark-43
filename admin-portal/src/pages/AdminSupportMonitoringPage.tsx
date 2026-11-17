import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Eye,
  Sparkles,
  Search,
  Info,
  X,
  Check,
  CheckCheck,
  Lock,
  ChevronUp,
  ChevronDown,
  ShieldCheck,
} from 'lucide-react';
import {
  AdminAiAssistEntry,
  AdminConversation,
  AdminProfile,
  AdminStaffRecord,
  AdminTicket,
  CustomerProfile,
} from '../types/admin.types';
import { adminPortalService } from '../services/adminPortalService';
import { adminAblyService } from '../services/adminAblyService';
import {
  AdminMonitoringInboxPanel,
  MonitoringInboxFilter,
} from '../components/AdminMonitoringInboxPanel';
import { AdminMonitoringCustomerPanel } from '../components/AdminMonitoringCustomerPanel';
import { AdminMonitoringAiWorkspace } from '../components/AdminMonitoringAiWorkspace';
import {
  useResizablePaneWidth,
  ResizableSplitDivider,
} from '@/src/components/support/ResizableMessagingSplit';

interface AdminSupportMonitoringPageProps {
  admin: AdminProfile;
  conversations: AdminConversation[];
  customers: Record<string, CustomerProfile>;
  tickets: AdminTicket[];
  staffDirectory: AdminStaffRecord[];
  selectedConversationId: string;
  onSelectConversation: (convId: string) => void;
  onUpdateConversation: (updated: AdminConversation) => void;
  onOpenTicketView: (ticketId: string) => void;
  isLoadingData: boolean;
  theme: 'dark' | 'light';
}

export const AdminSupportMonitoringPage: React.FC<
  AdminSupportMonitoringPageProps
> = ({
  admin,
  conversations,
  customers,
  tickets,
  staffDirectory,
  selectedConversationId,
  onSelectConversation,
  onUpdateConversation,
  onOpenTicketView,
  isLoadingData,
  theme,
}) => {
  const isLight = theme === 'light';

  const [inboxCollapsed, setInboxCollapsed] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [mobileView, setMobileView] = useState<'inbox' | 'monitor'>(() =>
    selectedConversationId ? 'monitor' : 'inbox'
  );
  const [centralTab, setCentralTab] = useState<'monitoring' | 'ai'>(
    'monitoring'
  );
  const [headerMinimized, setHeaderMinimized] = useState(false);

  const [inboxSearch, setInboxSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<MonitoringInboxFilter>('All');

  const [msgSearchOpen, setMsgSearchOpen] = useState(false);
  const [msgSearchQuery, setMsgSearchQuery] = useState('');

  // Advisory AI history preserved per conversation across tab switches
  const [aiHistoryByConv, setAiHistoryByConv] = useState<
    Record<string, AdminAiAssistEntry[]>
  >({});

  // Live Ably observer telemetry
  const [typingParty, setTypingParty] = useState<string | null>(null);
  const [customerPresentOnline, setCustomerPresentOnline] = useState<
    boolean | null
  >(null);
  const [staffPresentOnline, setStaffPresentOnline] = useState<boolean | null>(
    null
  );

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const splitContainerRef = useRef<HTMLDivElement | null>(null);

  const {
    width: inboxWidth,
    isDragging: isResizingInbox,
    handlePointerDown: handleInboxSplitPointerDown,
    handleKeyDown: handleInboxSplitKeyDown,
    handleResetWidth: handleInboxSplitReset,
  } = useResizablePaneWidth({
    storageKey: 'aureus_admin_inbox_width',
    defaultWidth: 320,
    minWidth: 240,
    maxWidth: 500,
    minRemainingWidth: detailsOpen ? 620 : 360,
    containerRef: splitContainerRef,
  });

  const activeConv =
    conversations.find((c) => c.id === selectedConversationId) ||
    conversations[0] ||
    null;

  const activeCustomerProfile = activeConv
    ? Object.values(customers).find((c) => c.id === activeConv.customerId)
    : undefined;

  const activeLinkedTicket = activeConv
    ? tickets.find(
        (t) =>
          t.id === activeConv.linkedTicketId ||
          t.conversationId === activeConv.id
      )
    : undefined;

  useEffect(() => {
    if (centralTab === 'monitoring') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [activeConv?.id, activeConv?.messages.length, centralTab]);

  // Read-only Ably live observation subscription
  useEffect(() => {
    if (!activeConv?.id) {
      setTypingParty(null);
      setCustomerPresentOnline(null);
      setStaffPresentOnline(null);
      return;
    }

    const unsub = adminAblyService.observeConversation(activeConv.id, {
      onMessageNew: (incoming) => {
        if (!activeConv.messages.some((m) => m.id === incoming.id)) {
          onUpdateConversation({
            ...activeConv,
            messages: [...activeConv.messages, incoming],
            lastMessage: incoming.text,
            lastMessageTimestamp: incoming.timestamp,
          });
        }
      },
      onMessageUpdated: (partial) => {
        onUpdateConversation({
          ...activeConv,
          messages: activeConv.messages.map((m) =>
            m.id === partial.id ? { ...m, ...partial } : m
          ),
        });
      },
      onMessageDeleted: ({ id, deletedAt }) => {
        onUpdateConversation({
          ...activeConv,
          messages: activeConv.messages.map((m) =>
            m.id === id
              ? { ...m, deletedAt: deletedAt || new Date().toISOString() }
              : m
          ),
        });
      },
      onReaction: ({ messageId, reactions }) => {
        onUpdateConversation({
          ...activeConv,
          messages: activeConv.messages.map((m) =>
            m.id === messageId ? { ...m, reactions } : m
          ),
        });
      },
      onTyping: (_userId, isTyping, name) => {
        setTypingParty(isTyping ? name || 'Participant' : null);
      },
      onReceipt: (messageId, status) => {
        onUpdateConversation({
          ...activeConv,
          messages: activeConv.messages.map((m) =>
            m.id === messageId ? { ...m, status } : m
          ),
        });
      },
      onPresence: (members) => {
        setCustomerPresentOnline(
          members.some(
            (m) =>
              m.data?.role === 'customer' ||
              m.clientId === activeConv.customerId
          )
        );
        setStaffPresentOnline(
          members.some(
            (m) =>
              m.data?.role === 'agent' ||
              m.clientId === activeConv.assignedStaffId
          )
        );
      },
    });

    return () => {
      unsub();
    };
  }, [activeConv?.id]);

  const handleSelectThread = (convId: string) => {
    onSelectConversation(convId);
    setMobileView('monitor');
  };

  const handleReassignConversation = async (
    convId: string,
    staffId: string,
    reason?: string
  ) => {
    const res = await adminPortalService.reassignConversation(
      convId,
      staffId,
      reason
    );
    if (res.success && res.data) {
      onUpdateConversation(res.data);
      return { ok: true };
    }
    return { ok: false, error: res.error?.message };
  };

  const handleEscalateConversation = async (convId: string, reason: string) => {
    const res = await adminPortalService.escalateConversation(convId, reason);
    if (res.success && res.data) {
      onUpdateConversation(res.data);
      return { ok: true };
    }
    return { ok: false, error: res.error?.message };
  };

  const qMsg = msgSearchQuery.trim().toLowerCase();
  const visibleMessages = activeConv
    ? activeConv.messages.filter((m) =>
        !qMsg ? true : m.text.toLowerCase().includes(qMsg)
      )
    : [];

  return (
    <div ref={splitContainerRef} className="flex-1 min-h-0 flex overflow-hidden">
      {/* LEFT PANEL: Queue & Conversation Inbox */}
      <div
        className={`${
          mobileView === 'inbox' ? 'flex w-full md:w-auto' : 'hidden'
        } md:flex h-full min-h-0 shrink-0`}
      >
        <AdminMonitoringInboxPanel
          conversations={conversations}
          selectedConversationId={activeConv?.id || ''}
          onSelectConversation={handleSelectThread}
          searchQuery={inboxSearch}
          onSearchChange={setInboxSearch}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          isCollapsed={inboxCollapsed}
          onToggleCollapse={() => setInboxCollapsed((prev) => !prev)}
          isLoading={isLoadingData}
          theme={theme}
          widthPx={inboxWidth}
          isResizing={isResizingInbox}
        />
      </div>

      {!inboxCollapsed && (
        <ResizableSplitDivider
          isDragging={isResizingInbox}
          onPointerDown={handleInboxSplitPointerDown}
          onKeyDown={handleInboxSplitKeyDown}
          onDoubleClick={handleInboxSplitReset}
          currentWidth={inboxWidth}
          minWidth={240}
          maxWidth={500}
          breakpoint="md"
          isLight={isLight}
          ariaLabel="Resize supervision queue and conversation monitor panels"
        />
      )}

      {/* CENTER WORKSPACE: Fixed Title Bar + Monitoring|AI Tabs + Scrollable Body */}
      <div
        className={`${
          mobileView === 'monitor' ? 'flex' : 'hidden'
        } md:flex flex-1 min-w-0 min-h-0 h-full flex-col overflow-hidden`}
      >
        {!activeConv ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-2">
            <Eye className="w-8 h-8 text-neutral-600" />
            <div className="text-sm font-semibold">
              {isLoadingData
                ? 'Loading support conversations...'
                : 'Select a Conversation to Monitor'}
            </div>
            <p className="text-xs text-neutral-500 max-w-sm">
              Choose an active, waiting-queue, or historical conversation from
              the left panel to inspect messages, staff assignment, and AI
              supervisory analysis.
            </p>
          </div>
        ) : (
          <>
            {/* Fixed / Minimizable Supervision Header + Monitoring | AI Assistant Tabs */}
            <div
              className={`shrink-0 border-b ${
                isLight
                  ? 'bg-white border-slate-200'
                  : 'bg-neutral-950/80 border-neutral-800'
              }`}
            >
              <div className="px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    type="button"
                    onClick={() => setMobileView('inbox')}
                    aria-label="Back to Queue"
                    className={`md:hidden p-2 rounded-lg border cursor-pointer shrink-0 ${
                      isLight
                        ? 'bg-slate-50 border-slate-200 text-slate-700'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-200'
                    }`}
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-xs sm:text-sm font-bold truncate">
                        {activeConv.customerName}
                      </h2>
                      <span className="text-[11px] font-mono text-neutral-500 truncate hidden sm:inline">
                        · Staff: {activeConv.assignedStaffName}
                      </span>
                    </div>
                    {!headerMinimized && (
                      <div className="text-[11px] text-neutral-400 truncate">
                        {activeConv.subject}
                        {activeConv.linkedTicketId
                          ? ` · ${activeConv.linkedTicketId}`
                          : ''}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Controls: Search, Details Drawer, Minimize */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setMsgSearchOpen((prev) => !prev)}
                    title="Search conversation transcript"
                    aria-label="Search conversation transcript"
                    className={`w-8 h-8 rounded-lg border flex items-center justify-center cursor-pointer ${
                      msgSearchOpen
                        ? 'border-emerald-500 bg-emerald-500/15 text-emerald-500'
                        : isLight
                        ? 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                        : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    <Search className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setDetailsOpen((prev) => !prev)}
                    title="Toggle Customer & Staff Details"
                    aria-label="Toggle Customer & Staff Details"
                    className={`w-8 h-8 rounded-lg border flex items-center justify-center cursor-pointer ${
                      detailsOpen
                        ? 'border-emerald-500 bg-emerald-500/15 text-emerald-500'
                        : isLight
                        ? 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                        : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    <Info className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setHeaderMinimized((prev) => !prev)}
                    title={
                      headerMinimized ? 'Expand title bar' : 'Minimize title bar'
                    }
                    aria-label={
                      headerMinimized ? 'Expand title bar' : 'Minimize title bar'
                    }
                    className={`w-8 h-8 rounded-lg border flex items-center justify-center cursor-pointer ${
                      isLight
                        ? 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                        : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    {headerMinimized ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronUp className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Monitoring | AI Assistant Tabs */}
              <div className="px-3 sm:px-4 pb-2 flex flex-wrap items-center justify-between gap-2">
                <div
                  role="tablist"
                  aria-label="Support Monitoring Workspace Mode"
                  className={`inline-flex p-1 rounded-xl border ${
                    isLight
                      ? 'bg-slate-100 border-slate-200'
                      : 'bg-neutral-900 border-neutral-800'
                  }`}
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={centralTab === 'monitoring'}
                    onClick={() => setCentralTab('monitoring')}
                    className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
                      centralTab === 'monitoring'
                        ? 'bg-emerald-500 text-neutral-950 font-semibold'
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Monitoring</span>
                  </button>

                  <button
                    type="button"
                    role="tab"
                    aria-selected={centralTab === 'ai'}
                    onClick={() => setCentralTab('ai')}
                    className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
                      centralTab === 'ai'
                        ? 'bg-amber-500 text-neutral-950 font-semibold'
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>AI Assistant</span>
                  </button>
                </div>

                <div className="flex items-center gap-3 text-[11px] font-mono text-neutral-500">
                  <span>
                    Client:{' '}
                    {customerPresentOnline ?? activeConv.customerOnline
                      ? 'Online'
                      : 'Offline'}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    Staff: {staffPresentOnline ? 'In Room' : activeConv.assignedStaffName}
                  </span>
                </div>
              </div>

              {/* Optional In-Thread Search */}
              {msgSearchOpen && centralTab === 'monitoring' && (
                <div className="px-3 sm:px-4 pb-2.5">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={msgSearchQuery}
                      onChange={(e) => setMsgSearchQuery(e.target.value)}
                      placeholder="Search transcript messages..."
                      className={`w-full pl-8 pr-8 py-1.5 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                        isLight
                          ? 'bg-slate-50 border-slate-200 text-slate-900'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-100'
                      }`}
                    />
                    {msgSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setMsgSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Central Content */}
            {centralTab === 'ai' ? (
              <AdminMonitoringAiWorkspace
                conversation={activeConv}
                linkedTicket={activeLinkedTicket}
                staffDirectory={staffDirectory}
                admin={admin}
                entries={aiHistoryByConv[activeConv.id] || []}
                onAppendEntry={(entry) =>
                  setAiHistoryByConv((prev) => ({
                    ...prev,
                    [activeConv.id]: [...(prev[activeConv.id] || []), entry],
                  }))
                }
                theme={theme}
              />
            ) : (
              <>
                {/* Independently Scrollable Read-Only Transcript */}
                <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 lg:p-5 space-y-3">
                  {visibleMessages.length === 0 ? (
                    <div className="py-12 text-center text-xs text-neutral-500">
                      {qMsg
                        ? `No messages matching "${msgSearchQuery}".`
                        : 'No messages recorded in this thread.'}
                    </div>
                  ) : (
                    visibleMessages.map((msg) => {
                      const isAgent = msg.sender === 'agent';
                      const isSystem = msg.sender === 'system';

                      if (isSystem) {
                        return (
                          <div key={msg.id} className="flex justify-center">
                            <div
                              className={`px-3 py-1 rounded-lg border text-[11px] text-center max-w-lg ${
                                isLight
                                  ? 'bg-slate-100 border-slate-200 text-slate-600'
                                  : 'bg-neutral-900/60 border-neutral-800 text-neutral-400'
                              }`}
                            >
                              {msg.text}
                            </div>
                          </div>
                        );
                      }

                      const isWhisper = Boolean(
                        msg.isWhisper || msg.isPrivateNote
                      );

                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${
                            isAgent ? 'items-end' : 'items-start'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 mb-1 text-[10px] font-mono text-neutral-500">
                            <span>
                              {isAgent
                                ? msg.agentName || activeConv.assignedStaffName
                                : activeConv.customerName}
                            </span>
                            {isWhisper && (
                              <span
                                className={`flex items-center gap-0.5 font-semibold ${
                                  isLight ? 'text-amber-700' : 'text-amber-400'
                                }`}
                              >
                                <Lock className="w-2.5 h-2.5" />
                                Internal Whisper
                              </span>
                            )}
                            <span>·</span>
                            <span className="tabular-nums">{msg.timestamp}</span>
                            {msg.editedAt && <span>(edited)</span>}
                          </div>

                          <div
                            className={`max-w-[88%] sm:max-w-[75%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed break-words border ${
                              msg.deletedAt
                                ? isLight
                                  ? 'bg-slate-100 border-slate-200 text-slate-500 italic'
                                  : 'bg-neutral-900/40 border-neutral-800 text-neutral-500 italic'
                                : isWhisper
                                ? isLight
                                  ? 'bg-amber-50 border-amber-300 text-amber-950'
                                  : 'bg-amber-500/10 border-amber-500/35 text-amber-100'
                                : isAgent
                                ? 'bg-emerald-600 border-emerald-500 text-neutral-950 font-medium'
                                : isLight
                                ? 'bg-white border-slate-200 text-slate-900'
                                : 'bg-neutral-900 border-neutral-800 text-neutral-100'
                            }`}
                          >
                            {msg.deletedAt ? (
                              <span>Message deleted</span>
                            ) : (
                              <>
                                <p className="whitespace-pre-line">{msg.text}</p>
                                {msg.attachment && (
                                  <div className="mt-2 px-2.5 py-1.5 rounded-lg bg-black/20 text-[11px] font-mono">
                                    📎 {msg.attachment.name} (
                                    {msg.attachment.size})
                                  </div>
                                )}
                                {msg.voiceNote && (
                                  <div className="mt-2 px-2.5 py-1.5 rounded-lg bg-black/20 text-[11px] font-mono">
                                    🎙 Voice Note ({msg.voiceNote.durationSeconds}
                                    s)
                                  </div>
                                )}
                              </>
                            )}
                          </div>

                          {isAgent && !msg.deletedAt && (
                            <div className="mt-1 flex items-center gap-1 text-[10px] font-mono text-neutral-500">
                              {msg.status === 'read' ? (
                                <CheckCheck className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Check className="w-3 h-3" />
                              )}
                              <span>{msg.status}</span>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}

                  {typingParty && (
                    <div className="text-[11px] font-mono text-emerald-400 px-1">
                      {typingParty} is typing...
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Read-Only Supervision Notice Footer (No Impersonation / Message Sending) */}
                <div
                  className={`shrink-0 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t flex flex-wrap items-center justify-between gap-2 text-xs ${
                    isLight
                      ? 'bg-slate-50 border-slate-200 text-slate-600'
                      : 'bg-neutral-950/90 border-neutral-800 text-neutral-400'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="truncate">
                      Read-Only Supervision Mode — Administrators monitor live
                      communications without impersonating staff.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCentralTab('ai')}
                    className="text-[11px] font-semibold text-amber-500 hover:underline shrink-0 cursor-pointer"
                  >
                    Ask AI Assistant →
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* RIGHT PANEL: Customer Details, Assignment & Authorized Escalation/Reassignment */}
      {activeConv && (
        <AdminMonitoringCustomerPanel
          conversation={activeConv}
          customer={activeCustomerProfile}
          linkedTicket={activeLinkedTicket}
          staffDirectory={staffDirectory}
          permissions={admin.permissions}
          isOpen={detailsOpen}
          onClose={() => setDetailsOpen(false)}
          onReassignConversation={handleReassignConversation}
          onEscalateConversation={handleEscalateConversation}
          onOpenTicketView={onOpenTicketView}
          theme={theme}
        />
      )}
    </div>
  );
};
