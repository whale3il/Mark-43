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
} from 'lucide-react';
import {
  StaffConversation,
  StaffMemberProfile,
  StaffTicket,
  TicketStatus,
} from '../types/staff.types';
import { staffPortalService } from '../services/staffPortalService';

interface StaffTicketsPageProps {
  staff: StaffMemberProfile;
  tickets: StaffTicket[];
  conversations: StaffConversation[];
  selectedTicketId: string | null;
  onSelectTicket: (ticketId: string | null) => void;
  onTicketUpdated: (updated: StaffTicket) => void;
  onOpenLinkedConversation: (conversationId: string) => void;
  isLoadingData?: boolean;
  dataError?: string | null;
  onRetryLoad?: () => void;
  theme: 'dark' | 'light';
}

export const StaffTicketsPage: React.FC<StaffTicketsPageProps> = ({
  staff,
  tickets,
  conversations,
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
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | TicketStatus>('All');

  const activeTicket =
    tickets.find((t) => t.id === selectedTicketId) || tickets[0] || null;

  const [investigationDraft, setInvestigationDraft] = useState('');
  const [resolutionDraft, setResolutionDraft] = useState('');
  const [whisperDraft, setWhisperDraft] = useState('');
  const [savingDetails, setSavingDetails] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingWhisper, setSavingWhisper] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [mobileInspectorOpen, setMobileInspectorOpen] = useState(false);

  useEffect(() => {
    setInvestigationDraft(activeTicket?.investigationNotes || '');
    setResolutionDraft(activeTicket?.resolution || '');
    setActionError(null);
    setActionSuccess(null);
  }, [
    activeTicket?.id,
    activeTicket?.investigationNotes,
    activeTicket?.resolution,
  ]);

  const q = searchQuery.trim().toLowerCase();
  const filteredTickets = tickets.filter((t) => {
    const matchesStatus = statusFilter === 'All' || t.status === statusFilter;
    const matchesSearch =
      !q ||
      t.id.toLowerCase().includes(q) ||
      t.subject.toLowerCase().includes(q) ||
      (t.customerName && t.customerName.toLowerCase().includes(q)) ||
      t.category.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const findLinkedConversation = (ticket: StaffTicket): StaffConversation | undefined =>
    conversations.find(
      (c) =>
        c.id === ticket.conversationId ||
        c.linkedTicketId === ticket.id ||
        (ticket.customerId && c.customerId === ticket.customerId)
    );

  const handleStatusChange = async (ticket: StaffTicket, status: TicketStatus) => {
    setSavingStatus(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await staffPortalService.updateTicket(ticket.id, { status });
      if (res.success && res.data) {
        onTicketUpdated(res.data);
        setActionSuccess(`Ticket status confirmed as ${status}.`);
      } else {
        setActionError(
          res.error?.message ||
            'Unable to update ticket status on backend (`PATCH /api/staff/tickets/:id`).'
        );
      }
    } finally {
      setSavingStatus(false);
    }
  };

  const handleSaveNotesAndResolution = async () => {
    if (!activeTicket) return;
    setSavingDetails(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await staffPortalService.updateTicket(activeTicket.id, {
        investigationNotes: investigationDraft,
        resolution: resolutionDraft,
      });
      if (res.success && res.data) {
        onTicketUpdated(res.data);
        setActionSuccess('Investigation notes and resolution saved.');
      } else {
        setActionError(
          res.error?.message ||
            'Unable to persist investigation notes/resolution on backend.'
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
      const res = await staffPortalService.addTicketWhisperNote(
        activeTicket.id,
        whisperDraft.trim()
      );
      if (res.success && res.data) {
        const nextTicket: StaffTicket = {
          ...activeTicket,
          whisperNotes: [...(activeTicket.whisperNotes || []), res.data],
        };
        onTicketUpdated(nextTicket);
        setWhisperDraft('');
        setActionSuccess('Authorized internal note (`isWhisper`) recorded.');
      } else {
        setActionError(
          res.error?.message ||
            'Unable to post internal whisper note (`POST /api/staff/tickets/:id/notes`).'
        );
      }
    } finally {
      setSavingWhisper(false);
    }
  };

  const renderInspector = (ticket: StaffTicket) => {
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
              {ticket.customerName || 'Private Client'} · {ticket.category}
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

          {/* Description & Linked Conversation Jump */}
          <div className="space-y-2.5">
            <p
              className={`text-xs leading-relaxed ${
                isLight ? 'text-slate-700' : 'text-neutral-300'
              }`}
            >
              {ticket.description || 'No description recorded.'}
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
                <span>Open Linked Conversation ({linkedConv.subject})</span>
              </button>
            )}
          </div>

          {/* Ticket Status Controls */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-neutral-500">
              <span>Ticket Status</span>
              {savingStatus && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(['Open', 'In Review', 'Escalated', 'Resolved'] as const).map(
                (st) => (
                  <button
                    key={st}
                    type="button"
                    disabled={savingStatus}
                    onClick={() => handleStatusChange(ticket, st)}
                    className={`py-2 px-3 rounded-xl border text-xs font-medium transition-colors cursor-pointer ${
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
          </div>

          {/* Investigation Notes & Resolution */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-500 block">
                Investigation Notes
              </label>
              <textarea
                rows={3}
                value={investigationDraft}
                onChange={(e) => setInvestigationDraft(e.target.value)}
                placeholder="Document ledger verification steps, compliance checks, or IMAD trace findings..."
                className={`w-full p-3 rounded-xl border text-xs resize-none focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                  isLight
                    ? 'bg-white border-slate-300 text-slate-900'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-100'
                }`}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-500 block">
                Final Resolution
              </label>
              <textarea
                rows={3}
                value={resolutionDraft}
                onChange={(e) => setResolutionDraft(e.target.value)}
                placeholder="Summarize resolution outcome once ticket is ready to close..."
                className={`w-full p-3 rounded-xl border text-xs resize-none focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                  isLight
                    ? 'bg-white border-slate-300 text-slate-900'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-100'
                }`}
              />
            </div>

            <button
              type="button"
              disabled={savingDetails}
              onClick={handleSaveNotesAndResolution}
              className="w-full py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-neutral-950 font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
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
                Staff-only
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
                      <span>{w.authorName || staff.name}</span>
                      <span>{w.createdAt}</span>
                    </div>
                    <p className="leading-relaxed whitespace-pre-line">{w.content}</p>
                  </div>
                ))
              ) : (
                <div className="text-xs text-neutral-500">
                  No authorized internal notes recorded on this ticket yet.
                </div>
              )}
            </div>

            <form onSubmit={handleSubmitWhisper} className="space-y-2">
              <textarea
                rows={2}
                value={whisperDraft}
                onChange={(e) => setWhisperDraft(e.target.value)}
                placeholder="Add staff-only whisper note (never visible to client)..."
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
      {/* Left/Main Ticket Queue */}
      <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div
          className={`p-4 sm:px-6 border-b space-y-3 shrink-0 ${
            isLight
              ? 'bg-white border-slate-200'
              : 'bg-neutral-950/60 border-neutral-800'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h1 className="text-lg font-bold tracking-tight">My Tickets</h1>
              <p className="text-xs text-neutral-400">
                Strictly scoped to tickets assigned to {staff.name}
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ID, subject, client..."
                className={`w-full pl-9 pr-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                  isLight
                    ? 'bg-slate-50 border-slate-200 text-slate-900'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-100'
                }`}
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs">
            {(['All', 'Open', 'In Review', 'Escalated', 'Resolved'] as const).map(
              (st) => (
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
              )
            )}
          </div>
        </div>

        {/* Ticket List (Mobile Cards) + Desktop Table */}
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
              <span>Loading scoped staff tickets...</span>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="h-full min-h-[240px] flex flex-col items-center justify-center text-center space-y-2 p-6">
              <FileText className="w-8 h-8 text-neutral-500" />
              <div className="text-sm font-medium">No assigned tickets found</div>
              <p className="text-xs text-neutral-500 max-w-sm">
                Tickets assigned to your specialist ID will appear here with linked
                conversations and internal whisper notes.
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Data Table (md+) */}
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
                        <th className="py-3 px-4 font-semibold">Ticket ID</th>
                        <th className="py-3 px-4 font-semibold">Customer</th>
                        <th className="py-3 px-4 font-semibold">Subject</th>
                        <th className="py-3 px-4 font-semibold">Category</th>
                        <th className="py-3 px-4 font-semibold">Priority</th>
                        <th className="py-3 px-4 font-semibold">Status</th>
                        <th className="py-3 px-4 font-semibold text-right">
                          Linked Chat
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
                        const linkedConv = findLinkedConversation(tkt);

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
                            <td className="py-3 px-4 font-medium max-w-[260px] truncate">
                              {tkt.subject}
                            </td>
                            <td className="py-3 px-4 text-neutral-400 whitespace-nowrap">
                              {tkt.category}
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
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              {linkedConv ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenLinkedConversation(linkedConv.id);
                                  }}
                                  className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-500 hover:underline cursor-pointer"
                                >
                                  <MessageSquare className="w-3 h-3" />
                                  <span>Chat</span>
                                </button>
                              ) : (
                                <span className="text-neutral-500">—</span>
                              )}
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
                  const linkedConv = findLinkedConversation(tkt);

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
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs font-mono">
                          <span className="font-bold text-emerald-500">{tkt.id}</span>
                          <span className="text-neutral-500">·</span>
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
                        </div>

                        <span
                          className={`text-[11px] font-mono font-semibold ${
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

                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-400">
                        <span>
                          {tkt.customerName || 'Private Client'} · {tkt.category}
                        </span>
                        {linkedConv && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenLinkedConversation(linkedConv.id);
                            }}
                            className="text-[11px] font-medium text-emerald-500 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <MessageSquare className="w-3 h-3" />
                            <span>Go to Chat</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Desktop Right Inspector Panel */}
      {activeTicket && (
        <aside
          className={`hidden lg:flex w-[380px] xl:w-[420px] shrink-0 border-l flex-col min-h-0 ${
            isLight
              ? 'bg-white border-slate-200'
              : 'bg-neutral-900 border-neutral-800'
          }`}
        >
          {renderInspector(activeTicket)}
        </aside>
      )}

      {/* Mobile & Tablet Inspector Drawer */}
      {activeTicket && mobileInspectorOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex justify-end">
          <div
            onClick={() => setMobileInspectorOpen(false)}
            className="fixed inset-0 bg-black/70"
            aria-hidden="true"
          />
          <aside
            className={`relative z-10 w-full sm:w-[400px] max-w-full h-full border-l flex flex-col shadow-2xl ${
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
