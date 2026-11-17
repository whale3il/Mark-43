import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  MessageSquare,
  Lock,
  Save,
  Send,
  AlertCircle,
  Loader2,
  X,
  CheckCircle2,
  RefreshCw,
  ArrowUpDown,
  ArrowRightLeft,
  AlertTriangle,
} from 'lucide-react';
import {
  AdminConversation,
  AdminProfile,
  AdminStaffRecord,
  AdminTicket,
  TicketPriority,
  TicketStatus,
} from '../types/admin.types';
import { adminPortalService } from '../services/adminPortalService';

interface AdminTicketManagementPageProps {
  admin: AdminProfile;
  tickets: AdminTicket[];
  conversations: AdminConversation[];
  staffDirectory: AdminStaffRecord[];
  selectedTicketId: string | null;
  onSelectTicket: (ticketId: string | null) => void;
  onTicketUpdated: (updated: AdminTicket) => void;
  onOpenLinkedConversation: (conversationId: string) => void;
  isLoadingData?: boolean;
  dataError?: string | null;
  onRetryLoad?: () => void;
  theme: 'dark' | 'light';
}

type TicketSortKey = 'id' | 'customerName' | 'priority' | 'status' | 'createdAt';

export const AdminTicketManagementPage: React.FC<
  AdminTicketManagementPageProps
> = ({
  admin,
  tickets,
  conversations,
  staffDirectory,
  selectedTicketId,
  onSelectTicket,
  onTicketUpdated,
  onOpenLinkedConversation,
  isLoadingData = false,
  dataError = null,
  onRetryLoad,
  theme,
}) => {
  const isLight = theme === 'light';
  const canAssign = admin.permissions.canAssignTickets;

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | TicketStatus>('All');
  const [priorityFilter, setPriorityFilter] = useState<'All' | TicketPriority>(
    'All'
  );
  const [staffFilter, setStaffFilter] = useState<string>('All');
  const [sortKey, setSortKey] = useState<TicketSortKey>('createdAt');
  const [sortAsc, setSortAsc] = useState(false);

  const activeTicket =
    tickets.find((t) => t.id === selectedTicketId) || tickets[0] || null;

  const [investigationDraft, setInvestigationDraft] = useState('');
  const [resolutionDraft, setResolutionDraft] = useState('');
  const [whisperDraft, setWhisperDraft] = useState('');
  const [reassignStaffId, setReassignStaffId] = useState('');
  const [confirmSensitiveAction, setConfirmSensitiveAction] = useState<
    { type: 'escalate' } | { type: 'reassign'; staffId: string } | null
  >(null);

  const [savingDetails, setSavingDetails] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingWhisper, setSavingWhisper] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [mobileInspectorOpen, setMobileInspectorOpen] = useState(false);

  useEffect(() => {
    setInvestigationDraft(activeTicket?.investigationNotes || '');
    setResolutionDraft(activeTicket?.resolution || '');
    setReassignStaffId(activeTicket?.assignedAgentId || '');
    setConfirmSensitiveAction(null);
    setActionError(null);
    setActionSuccess(null);
  }, [
    activeTicket?.id,
    activeTicket?.investigationNotes,
    activeTicket?.resolution,
    activeTicket?.assignedAgentId,
  ]);

  const handleSort = (key: TicketSortKey) => {
    if (sortKey === key) {
      setSortAsc((p) => !p);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const q = searchQuery.trim().toLowerCase();
  const filteredTickets = tickets
    .filter((t) => {
      const matchesStatus = statusFilter === 'All' || t.status === statusFilter;
      const matchesPriority =
        priorityFilter === 'All' || t.priority === priorityFilter;
      const matchesStaff =
        staffFilter === 'All' || t.assignedAgentId === staffFilter;
      const matchesSearch =
        !q ||
        t.id.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q) ||
        t.assignedAgent.toLowerCase().includes(q) ||
        (t.customerName && t.customerName.toLowerCase().includes(q)) ||
        t.category.toLowerCase().includes(q);
      return matchesStatus && matchesPriority && matchesStaff && matchesSearch;
    })
    .sort((a, b) => {
      const dir = sortAsc ? 1 : -1;
      const aVal = String((a as any)[sortKey] || '');
      const bVal = String((b as any)[sortKey] || '');
      return aVal.localeCompare(bVal) * dir;
    });

  const findLinkedConversation = (
    ticket: AdminTicket
  ): AdminConversation | undefined =>
    conversations.find(
      (c) =>
        c.id === ticket.conversationId ||
        c.linkedTicketId === ticket.id ||
        (ticket.customerId && c.customerId === ticket.customerId)
    );

  const handleStatusChange = async (
    ticket: AdminTicket,
    status: TicketStatus
  ) => {
    if (!canAssign) return;
    if (status === 'Escalated' && !confirmSensitiveAction) {
      setConfirmSensitiveAction({ type: 'escalate' });
      return;
    }

    setSavingStatus(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await adminPortalService.updateTicket(ticket.id, { status });
      if (res.success && res.data) {
        onTicketUpdated(res.data);
        setConfirmSensitiveAction(null);
        setActionSuccess(`Ticket status confirmed as ${status}.`);
      } else {
        setActionError(
          res.error?.message ||
            'Unable to update ticket status (`PATCH /api/admin/tickets/:id`).'
        );
      }
    } finally {
      setSavingStatus(false);
    }
  };

  const handleConfirmReassign = async () => {
    if (
      !activeTicket ||
      !canAssign ||
      confirmSensitiveAction?.type !== 'reassign'
    ) {
      return;
    }
    setSavingStatus(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await adminPortalService.updateTicket(activeTicket.id, {
        assignedAgentId: confirmSensitiveAction.staffId,
      });
      if (res.success && res.data) {
        onTicketUpdated(res.data);
        setConfirmSensitiveAction(null);
        setActionSuccess('Ticket reassignment confirmed by backend.');
      } else {
        setActionError(
          res.error?.message ||
            'Unable to reassign ticket (`PATCH /api/admin/tickets/:id`).'
        );
      }
    } finally {
      setSavingStatus(false);
    }
  };

  const handleSaveNotesAndResolution = async () => {
    if (!activeTicket || !canAssign) return;
    setSavingDetails(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await adminPortalService.updateTicket(activeTicket.id, {
        investigationNotes: investigationDraft,
        resolution: resolutionDraft,
      });
      if (res.success && res.data) {
        onTicketUpdated(res.data);
        setActionSuccess('Investigation notes and resolution saved.');
      } else {
        setActionError(
          res.error?.message ||
            'Unable to save investigation notes/resolution on backend.'
        );
      }
    } finally {
      setSavingDetails(false);
    }
  };

  const handleSubmitWhisper = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicket || !whisperDraft.trim()) return;
    setSavingWhisper(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await adminPortalService.addTicketWhisperNote(
        activeTicket.id,
        whisperDraft.trim()
      );
      if (res.success && res.data) {
        onTicketUpdated({
          ...activeTicket,
          whisperNotes: [...(activeTicket.whisperNotes || []), res.data],
        });
        setWhisperDraft('');
        setActionSuccess('Authorized internal note (`isWhisper`) posted.');
      } else {
        setActionError(
          res.error?.message ||
            'Unable to post internal whisper note (`POST /api/admin/tickets/:id/notes`).'
        );
      }
    } finally {
      setSavingWhisper(false);
    }
  };

  const activeStaffOptions = staffDirectory.filter(
    (s) => s.accountStatus === 'ACTIVE'
  );

  const renderInspector = (ticket: AdminTicket) => {
    const linkedConv = findLinkedConversation(ticket);
    return (
      <div className="flex flex-col h-full min-h-0">
        <div
          className={`p-4 border-b flex items-start justify-between gap-3 shrink-0 ${
            isLight
              ? 'bg-slate-50 border-slate-200'
              : 'bg-neutral-950/70 border-neutral-800'
          }`}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-500 font-semibold">
              <span>{ticket.id}</span>
              <span>·</span>
              <span>{ticket.priority}</span>
            </div>
            <h2 className="text-sm font-bold mt-1">{ticket.subject}</h2>
            <div className="text-xs text-neutral-400 mt-0.5">
              {ticket.customerName || 'Private Client'} · Assigned:{' '}
              {ticket.assignedAgent}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMobileInspectorOpen(false)}
            className={`lg:hidden p-1.5 rounded-lg border cursor-pointer ${
              isLight
                ? 'border-slate-200 text-slate-600'
                : 'border-neutral-800 text-neutral-400'
            }`}
            aria-label="Close ticket details"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-5">
          {actionError && (
            <div
              role="alert"
              className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                isLight
                  ? 'border-rose-200 bg-rose-50 text-rose-800'
                  : 'border-rose-500/40 bg-rose-500/10 text-rose-300'
              }`}
            >
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{actionError}</span>
            </div>
          )}

          {actionSuccess && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                isLight
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>{actionSuccess}</span>
            </div>
          )}

          {/* Description & Linked Thread */}
          <div className="space-y-2.5">
            <div className="text-[11px] font-mono text-neutral-500">
              Created {ticket.createdAt} · {ticket.category} · Auto-routing default
            </div>
            <p
              className={`text-xs leading-relaxed ${
                isLight ? 'text-slate-700' : 'text-neutral-300'
              }`}
            >
              {ticket.description || 'No description provided.'}
            </p>
            {linkedConv && (
              <button
                type="button"
                onClick={() => onOpenLinkedConversation(linkedConv.id)}
                className={`w-full py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer ${
                  isLight
                    ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-800'
                    : 'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/30 text-emerald-400'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Monitor Linked Conversation ({linkedConv.subject})</span>
              </button>
            )}
          </div>

          {!canAssign && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                isLight
                  ? 'border-slate-200 bg-slate-50 text-slate-600'
                  : 'border-neutral-800 bg-neutral-950/50 text-neutral-400'
              }`}
            >
              <Lock className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" />
              <span>
                Read-only oversight (`canAssignTickets` disabled). Reassignment,
                escalation, and resolution edits are disabled.
              </span>
            </div>
          )}

          {/* Status & Escalation Controls */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-neutral-500">
              <span>Status & Escalation</span>
              {savingStatus && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(['Open', 'In Review', 'Escalated', 'Resolved'] as const).map(
                (st) => (
                  <button
                    key={st}
                    type="button"
                    disabled={savingStatus || !canAssign}
                    onClick={() => handleStatusChange(ticket, st)}
                    className={`py-2 px-3 rounded-xl border text-xs font-medium transition-colors cursor-pointer disabled:opacity-40 ${
                      ticket.status === st
                        ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400 font-semibold'
                        : isLight
                        ? 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                        : 'border-neutral-800 bg-neutral-950/50 hover:bg-neutral-800 text-neutral-300'
                    }`}
                  >
                    {st}
                  </button>
                )
              )}
            </div>

            {confirmSensitiveAction?.type === 'escalate' && (
              <div
                className={`p-3 rounded-xl border space-y-2 ${
                  isLight
                    ? 'bg-rose-50 border-rose-200'
                    : 'bg-rose-500/10 border-rose-500/35'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-400">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Confirm Ticket Escalation?</span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmSensitiveAction(null)}
                    className="flex-1 py-1.5 rounded-lg border border-neutral-700 text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusChange(ticket, 'Escalated')}
                    className="flex-1 py-1.5 rounded-lg bg-rose-500 text-white text-xs font-semibold cursor-pointer"
                  >
                    Escalate
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Supervisory Specialist Reassignment */}
          <div className="space-y-2">
            <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-500 block">
              Reassign Ticket Owner
            </label>
            <div className="flex gap-2">
              <select
                value={reassignStaffId}
                disabled={!canAssign || savingStatus}
                onChange={(e) => {
                  setReassignStaffId(e.target.value);
                  setConfirmSensitiveAction(null);
                }}
                className={`flex-1 min-w-0 px-3 py-2 rounded-xl border text-xs disabled:opacity-40 ${
                  isLight
                    ? 'bg-white border-slate-300 text-slate-900'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-100'
                }`}
              >
                <option value="">Select staff specialist...</option>
                {activeStaffOptions.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.fullName} ({st.department})
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={
                  !canAssign ||
                  savingStatus ||
                  !reassignStaffId ||
                  reassignStaffId === ticket.assignedAgentId
                }
                onClick={() =>
                  setConfirmSensitiveAction({
                    type: 'reassign',
                    staffId: reassignStaffId,
                  })
                }
                className={`px-3 py-2 rounded-xl border text-xs font-medium flex items-center gap-1 cursor-pointer disabled:opacity-40 shrink-0 ${
                  isLight
                    ? 'bg-slate-100 border-slate-300 text-slate-800'
                    : 'bg-neutral-800 border-neutral-700 text-neutral-200'
                }`}
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>Reassign</span>
              </button>
            </div>

            {confirmSensitiveAction?.type === 'reassign' && (
              <div
                className={`p-3 rounded-xl border space-y-2 ${
                  isLight
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-amber-500/10 border-amber-500/35'
                }`}
              >
                <div className="text-xs font-semibold">
                  Confirm Manual Override of Auto-Assigned Specialist?
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmSensitiveAction(null)}
                    className="flex-1 py-1.5 rounded-lg border border-neutral-700 text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmReassign}
                    className="flex-1 py-1.5 rounded-lg bg-emerald-500 text-neutral-950 text-xs font-semibold cursor-pointer"
                  >
                    Confirm Reassign
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Investigation History & Resolution */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-500 block">
                Investigation Notes
              </label>
              <textarea
                rows={3}
                disabled={!canAssign}
                value={investigationDraft}
                onChange={(e) => setInvestigationDraft(e.target.value)}
                placeholder="Ledger findings, compliance verification, or supervisory observations..."
                className={`w-full p-3 rounded-xl border text-xs resize-none focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-60 ${
                  isLight
                    ? 'bg-white border-slate-300 text-slate-900'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-100'
                }`}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-500 block">
                Resolution Summary
              </label>
              <textarea
                rows={2}
                disabled={!canAssign}
                value={resolutionDraft}
                onChange={(e) => setResolutionDraft(e.target.value)}
                placeholder="Final outcome recorded upon ticket closure..."
                className={`w-full p-3 rounded-xl border text-xs resize-none focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-60 ${
                  isLight
                    ? 'bg-white border-slate-300 text-slate-900'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-100'
                }`}
              />
            </div>

            <button
              type="button"
              disabled={savingDetails || !canAssign}
              onClick={handleSaveNotesAndResolution}
              className="w-full py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-neutral-950 font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {savingDetails ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>Save Investigation & Resolution</span>
            </button>
          </div>

          {/* Authorized Internal Notes (isWhisper) */}
          <div className="space-y-3 pt-2 border-t border-neutral-800/40">
            <div className="flex items-center justify-between">
              <div
                className={`flex items-center gap-1.5 text-xs font-semibold ${
                  isLight ? 'text-amber-700' : 'text-amber-400'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Authorized Internal Notes (`isWhisper`)</span>
              </div>
              <span className="text-[10px] font-mono text-neutral-500">
                Staff & Admin Only
              </span>
            </div>

            <div className="space-y-2">
              {ticket.whisperNotes && ticket.whisperNotes.length > 0 ? (
                ticket.whisperNotes.map((w) => (
                  <div
                    key={w.id}
                    className={`p-3 rounded-xl border text-xs space-y-1 ${
                      isLight
                        ? 'bg-amber-50 border-amber-200 text-slate-800'
                        : 'bg-amber-500/10 border-amber-500/25 text-neutral-200'
                    }`}
                  >
                    <div
                      className={`flex items-center justify-between text-[10px] font-mono ${
                        isLight ? 'text-amber-700' : 'text-amber-400'
                      }`}
                    >
                      <span>{w.authorName}</span>
                      <span>{w.createdAt}</span>
                    </div>
                    <p className="leading-relaxed whitespace-pre-line">
                      {w.content}
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-xs text-neutral-500">
                  No internal whisper notes on this ticket yet.
                </div>
              )}
            </div>

            <form onSubmit={handleSubmitWhisper} className="space-y-2">
              <textarea
                rows={2}
                value={whisperDraft}
                onChange={(e) => setWhisperDraft(e.target.value)}
                placeholder="Post authorized supervisor whisper note (hidden from client)..."
                className={`w-full p-2.5 rounded-xl border text-xs resize-none focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                  isLight
                    ? 'bg-white border-slate-300 text-slate-900'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-100'
                }`}
              />
              <button
                type="submit"
                disabled={savingWhisper || !whisperDraft.trim()}
                className={`w-full py-2 px-3 rounded-xl border font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 ${
                  isLight
                    ? 'border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800'
                    : 'border-amber-500/40 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300'
                }`}
              >
                {savingWhisper ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>Post Internal Whisper Note</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
      {/* Left/Main Organization Ticket Queue */}
      <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
        <div
          className={`p-4 sm:px-6 border-b space-y-3 shrink-0 ${
            isLight
              ? 'bg-white border-slate-200'
              : 'bg-neutral-950/60 border-neutral-800'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h1 className="text-lg font-bold tracking-tight">
                Ticket Management
              </h1>
              <p className="text-xs text-neutral-400">
                Organization-wide oversight across automated routing, active
                investigations, and escalations
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ticket, client, staff..."
                className={`w-full pl-9 pr-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                  isLight
                    ? 'bg-slate-50 border-slate-200 text-slate-900'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-100'
                }`}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1 overflow-x-auto">
              {(
                ['All', 'Open', 'In Review', 'Escalated', 'Resolved'] as const
              ).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    statusFilter === st
                      ? 'bg-emerald-500 text-neutral-950 font-semibold'
                      : isLight
                      ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      : 'bg-neutral-900 text-neutral-400 hover:bg-neutral-800'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <select
              value={priorityFilter}
              onChange={(e) =>
                setPriorityFilter(e.target.value as 'All' | TicketPriority)
              }
              aria-label="Filter by priority"
              className={`px-2.5 py-1.5 rounded-lg border text-xs ${
                isLight
                  ? 'bg-slate-50 border-slate-200 text-slate-700'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-300'
              }`}
            >
              <option value="All">All Priorities</option>
              <option value="Urgent">Urgent</option>
              <option value="High">High</option>
              <option value="Normal">Normal</option>
            </select>

            <select
              value={staffFilter}
              onChange={(e) => setStaffFilter(e.target.value)}
              aria-label="Filter by assigned staff"
              className={`px-2.5 py-1.5 rounded-lg border text-xs ${
                isLight
                  ? 'bg-slate-50 border-slate-200 text-slate-700'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-300'
              }`}
            >
              <option value="All">All Assigned Staff</option>
              {staffDirectory.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-5 space-y-3">
          {dataError && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                isLight
                  ? 'border-amber-200 bg-amber-50 text-amber-900'
                  : 'border-amber-500/40 bg-amber-500/10 text-amber-300'
              }`}
            >
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span>{dataError}</span>
              </div>
              {onRetryLoad && (
                <button
                  type="button"
                  onClick={onRetryLoad}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 text-neutral-950 font-semibold text-[11px] flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Retry</span>
                </button>
              )}
            </div>
          )}

          {isLoadingData ? (
            <div className="h-full min-h-[240px] flex flex-col items-center justify-center text-center space-y-2 p-6 text-xs text-neutral-400">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
              <span>Loading organization ticket queue...</span>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="h-full min-h-[240px] flex flex-col items-center justify-center text-center space-y-2 p-6">
              <FileText className="w-8 h-8 text-neutral-500" />
              <div className="text-sm font-medium">No tickets found</div>
              <p className="text-xs text-neutral-500 max-w-sm">
                Adjust search filters or wait for newly routed customer tickets.
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div
                className={`hidden md:block rounded-2xl border overflow-hidden ${
                  isLight
                    ? 'bg-white border-slate-200'
                    : 'bg-neutral-900/60 border-neutral-800'
                }`}
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr
                        className={`border-b text-[10px] font-mono uppercase tracking-wider ${
                          isLight
                            ? 'bg-slate-50 border-slate-200 text-slate-500'
                            : 'bg-neutral-950/70 border-neutral-800 text-neutral-500'
                        }`}
                      >
                        <th className="py-3 px-4 font-semibold">
                          <button
                            type="button"
                            onClick={() => handleSort('id')}
                            className="inline-flex items-center gap-1 cursor-pointer"
                          >
                            <span>Ticket ID</span>
                            <ArrowUpDown className="w-3 h-3" />
                          </button>
                        </th>
                        <th className="py-3 px-4 font-semibold">
                          <button
                            type="button"
                            onClick={() => handleSort('customerName')}
                            className="inline-flex items-center gap-1 cursor-pointer"
                          >
                            <span>Customer</span>
                            <ArrowUpDown className="w-3 h-3" />
                          </button>
                        </th>
                        <th className="py-3 px-4 font-semibold">Subject</th>
                        <th className="py-3 px-4 font-semibold">
                          Assigned Staff
                        </th>
                        <th className="py-3 px-4 font-semibold">
                          <button
                            type="button"
                            onClick={() => handleSort('priority')}
                            className="inline-flex items-center gap-1 cursor-pointer"
                          >
                            <span>Priority</span>
                            <ArrowUpDown className="w-3 h-3" />
                          </button>
                        </th>
                        <th className="py-3 px-4 font-semibold">
                          <button
                            type="button"
                            onClick={() => handleSort('status')}
                            className="inline-flex items-center gap-1 cursor-pointer"
                          >
                            <span>Status</span>
                            <ArrowUpDown className="w-3 h-3" />
                          </button>
                        </th>
                        <th className="py-3 px-4 font-semibold">
                          <button
                            type="button"
                            onClick={() => handleSort('createdAt')}
                            className="inline-flex items-center gap-1 cursor-pointer"
                          >
                            <span>Created</span>
                            <ArrowUpDown className="w-3 h-3" />
                          </button>
                        </th>
                      </tr>
                    </thead>
                    <tbody
                      className={`divide-y ${
                        isLight ? 'divide-slate-200' : 'divide-neutral-800/70'
                      }`}
                    >
                      {filteredTickets.map((tkt) => {
                        const isSelected = activeTicket?.id === tkt.id;
                        return (
                          <tr
                            key={tkt.id}
                            onClick={() => onSelectTicket(tkt.id)}
                            className={`cursor-pointer transition-colors ${
                              isSelected
                                ? isLight
                                  ? 'bg-emerald-50/80'
                                  : 'bg-emerald-500/10'
                                : isLight
                                ? 'hover:bg-slate-50'
                                : 'hover:bg-neutral-800/40'
                            }`}
                          >
                            <td className="py-3 px-4 font-mono font-bold text-emerald-500 whitespace-nowrap">
                              {tkt.id}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              {tkt.customerName || 'Private Client'}
                            </td>
                            <td className="py-3 px-4 font-medium max-w-[230px] truncate">
                              {tkt.subject}
                            </td>
                            <td className="py-3 px-4 text-neutral-400 whitespace-nowrap">
                              {tkt.assignedAgent}
                            </td>
                            <td className="py-3 px-4 font-mono whitespace-nowrap">
                              <span
                                className={
                                  tkt.priority === 'Urgent'
                                    ? 'text-rose-500 font-semibold'
                                    : tkt.priority === 'High'
                                    ? 'text-amber-500'
                                    : 'text-neutral-400'
                                }
                              >
                                {tkt.priority}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono font-semibold whitespace-nowrap">
                              <span
                                className={
                                  tkt.status === 'Resolved'
                                    ? 'text-sky-500'
                                    : tkt.status === 'Escalated'
                                    ? 'text-rose-500'
                                    : tkt.status === 'In Review'
                                    ? 'text-amber-500'
                                    : 'text-emerald-500'
                                }
                              >
                                {tkt.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono text-neutral-500 whitespace-nowrap tabular-nums">
                              {tkt.createdAt}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile Cards (<md) */}
              <div className="md:hidden space-y-2.5">
                {filteredTickets.map((tkt) => {
                  const isSelected = activeTicket?.id === tkt.id;
                  return (
                    <div
                      key={tkt.id}
                      onClick={() => {
                        onSelectTicket(tkt.id);
                        setMobileInspectorOpen(true);
                      }}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-colors space-y-2 ${
                        isSelected
                          ? isLight
                            ? 'bg-emerald-50/70 border-emerald-400'
                            : 'bg-neutral-900 border-emerald-500/70'
                          : isLight
                          ? 'bg-white border-slate-200 hover:border-slate-300'
                          : 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-xs font-mono">
                        <span className="font-bold text-emerald-500">
                          {tkt.id} · {tkt.priority}
                        </span>
                        <span
                          className={`font-semibold ${
                            tkt.status === 'Resolved'
                              ? 'text-sky-500'
                              : tkt.status === 'Escalated'
                              ? 'text-rose-500'
                              : tkt.status === 'In Review'
                              ? 'text-amber-500'
                              : 'text-emerald-500'
                          }`}
                        >
                          {tkt.status}
                        </span>
                      </div>
                      <div className="text-sm font-semibold">{tkt.subject}</div>
                      <div className="text-xs text-neutral-400">
                        {tkt.customerName || 'Private Client'} · Assigned:{' '}
                        {tkt.assignedAgent}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Desktop Right Inspector */}
      {activeTicket && (
        <aside
          className={`hidden lg:flex w-[390px] xl:w-[430px] shrink-0 border-l flex-col min-h-0 ${
            isLight
              ? 'bg-white border-slate-200'
              : 'bg-neutral-900 border-neutral-800'
          }`}
        >
          {renderInspector(activeTicket)}
        </aside>
      )}

      {/* Mobile / Tablet Inspector Drawer */}
      {activeTicket && mobileInspectorOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex justify-end">
          <div
            onClick={() => setMobileInspectorOpen(false)}
            className="fixed inset-0 bg-black/70"
            aria-hidden="true"
          />
          <aside
            className={`relative z-10 w-full sm:w-[410px] max-w-full h-full border-l flex flex-col shadow-2xl ${
              isLight
                ? 'bg-white border-slate-200'
                : 'bg-neutral-900 border-neutral-800'
            }`}
          >
            {renderInspector(activeTicket)}
          </aside>
        </div>
      )}
    </div>
  );
};
