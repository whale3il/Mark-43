import React, { useState, useEffect } from 'react';
import {
  User,
  X,
  ShieldCheck,
  Mail,
  Phone,
  FileText,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  Tag,
} from 'lucide-react';
import {
  CustomerProfile,
  StaffConversation,
  StaffTicket,
  TicketStatus,
} from '../types/staff.types';

interface StaffCustomerDetailsPanelProps {
  conversation: StaffConversation;
  customer?: CustomerProfile;
  linkedTicket?: StaffTicket;
  isOpen: boolean;
  onClose: () => void;
  onUpdateConversationStatus: (status: 'active' | 'pending' | 'resolved') => Promise<void>;
  onSaveInternalNotes: (notes: string) => Promise<{ ok: boolean; error?: string }>;
  onUpdateTicketStatus?: (ticketId: string, status: TicketStatus) => Promise<void>;
  onOpenTicketView?: (ticketId: string) => void;
  theme: 'dark' | 'light';
}

export const StaffCustomerDetailsPanel: React.FC<
  StaffCustomerDetailsPanelProps
> = ({
  conversation,
  customer,
  linkedTicket,
  isOpen,
  onClose,
  onUpdateConversationStatus,
  onSaveInternalNotes,
  onUpdateTicketStatus,
  onOpenTicketView,
  theme,
}) => {
  const isLight = theme === 'light';

  const formatNotes = (raw?: string | string[]) =>
    Array.isArray(raw) ? raw.join('\n') : raw || '';

  const [notesDraft, setNotesDraft] = useState<string>(() =>
    formatNotes(conversation.internalNotes)
  );
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesFeedback, setNotesFeedback] = useState<{
    type: 'ok' | 'err';
    msg: string;
  } | null>(null);

  useEffect(() => {
    setNotesDraft(formatNotes(conversation.internalNotes));
    setNotesFeedback(null);
  }, [conversation.id, conversation.internalNotes]);

  if (!isOpen) return null;

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    setNotesFeedback(null);
    try {
      const res = await onSaveInternalNotes(notesDraft);
      if (res.ok) {
        setNotesFeedback({ type: 'ok', msg: 'Internal dossier notes saved.' });
      } else {
        setNotesFeedback({
          type: 'err',
          msg: res.error || 'Unable to save internal notes on backend.',
        });
      }
    } finally {
      setSavingNotes(false);
    }
  };

  const panelBody = (
    <div className="flex flex-col h-full min-h-0">
      <div
        className={`px-4 py-3 border-b flex items-center justify-between gap-2 shrink-0 ${
          isLight
            ? 'bg-slate-50 border-slate-200'
            : 'bg-neutral-950/70 border-neutral-800'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <User className="w-4 h-4 text-emerald-500 shrink-0" />
          <h3 className="text-xs font-bold tracking-tight truncate">
            Customer & Ticket Details
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close customer details"
          className={`p-1.5 rounded-lg cursor-pointer ${
            isLight
              ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
              : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800'
          }`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-5">
        {/* Customer Identity */}
        <div
          className={`p-3.5 rounded-xl border space-y-3 ${
            isLight
              ? 'bg-slate-50 border-slate-200'
              : 'bg-neutral-950/60 border-neutral-800'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 font-bold text-xs flex items-center justify-center shrink-0">
              {(customer?.name || conversation.customerName)
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">
                {customer?.name || conversation.customerName}
              </div>
              <div className="text-[11px] font-mono text-emerald-500 truncate">
                {customer?.clientTier || conversation.customerTier}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-2.5 border-t border-neutral-800/40 text-xs">
            <div>
              <div className="text-[10px] text-neutral-500 uppercase">Account</div>
              <div className="font-mono mt-0.5">
                {customer?.accountNumberMasked || 'Not Linked'}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-neutral-500 uppercase">KYC</div>
              <div className="text-emerald-500 flex items-center gap-1 mt-0.5 truncate">
                <ShieldCheck className="w-3 h-3 shrink-0" />
                <span className="truncate">
                  {customer?.kycLevel || 'Verified'}
                </span>
              </div>
            </div>
          </div>

          {(customer?.email || customer?.phone) && (
            <div className="space-y-1.5 pt-2 border-t border-neutral-800/40 text-xs text-neutral-400">
              {customer?.email && (
                <div className="flex items-center gap-2 truncate">
                  <Mail className="w-3.5 h-3.5 shrink-0 text-neutral-500" />
                  <span className="truncate">{customer.email}</span>
                </div>
              )}
              {customer?.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 shrink-0 text-neutral-500" />
                  <span className="font-mono">{customer.phone}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Conversation Status */}
        <div className="space-y-2">
          <div className="text-[11px] font-mono uppercase tracking-wider text-neutral-500">
            Conversation Status
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {(['active', 'pending', 'resolved'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => onUpdateConversationStatus(st)}
                className={`py-2 px-2 rounded-xl border text-xs font-medium capitalize transition-colors cursor-pointer ${
                  conversation.status === st
                    ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400 font-semibold'
                    : isLight
                    ? 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                    : 'border-neutral-800 bg-neutral-950/60 text-neutral-400 hover:bg-neutral-800'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Linked Ticket Info */}
        {linkedTicket && (
          <div
            className={`p-3.5 rounded-xl border space-y-2.5 ${
              isLight
                ? 'bg-slate-50 border-slate-200'
                : 'bg-neutral-950/60 border-neutral-800'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-500">
                <Tag className="w-3.5 h-3.5" />
                <span>{linkedTicket.id}</span>
              </div>
              <span className="text-[11px] font-mono text-amber-400">
                {linkedTicket.priority}
              </span>
            </div>

            <div className="text-xs font-semibold">{linkedTicket.subject}</div>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              {linkedTicket.description}
            </p>

            {onUpdateTicketStatus && (
              <div className="grid grid-cols-2 gap-1.5 pt-1">
                {(['Open', 'In Review', 'Escalated', 'Resolved'] as const).map(
                  (tSt) => (
                    <button
                      key={tSt}
                      type="button"
                      onClick={() => onUpdateTicketStatus(linkedTicket.id, tSt)}
                      className={`py-1.5 px-2 rounded-lg border text-[11px] font-medium cursor-pointer ${
                        linkedTicket.status === tSt
                          ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400 font-semibold'
                          : isLight
                          ? 'border-slate-200 bg-white text-slate-600'
                          : 'border-neutral-800 bg-neutral-900 text-neutral-400'
                      }`}
                    >
                      {tSt}
                    </button>
                  )
                )}
              </div>
            )}

            {onOpenTicketView && (
              <button
                type="button"
                onClick={() => onOpenTicketView(linkedTicket.id)}
                className={`w-full py-2 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer ${
                  isLight
                    ? 'border-slate-200 hover:bg-slate-100 text-slate-700'
                    : 'border-neutral-800 hover:bg-neutral-800 text-neutral-200'
                }`}
              >
                <span>Open Full Ticket Dossier</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Internal Staff Notes (Private) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-neutral-500">
            <span className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-amber-500" />
              Internal Dossier Notes
            </span>
            <span>Private</span>
          </div>

          <textarea
            rows={4}
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
            placeholder="Authorized internal observations (never shared with client)..."
            className={`w-full p-3 rounded-xl border text-xs resize-none focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
              isLight
                ? 'bg-white border-slate-300 text-slate-900'
                : 'bg-neutral-950 border-neutral-800 text-neutral-100'
            }`}
          />

          {notesFeedback && (
            <div
              className={`p-2.5 rounded-lg border text-[11px] flex items-center gap-1.5 ${
                notesFeedback.type === 'ok'
                  ? isLight
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                  : isLight
                  ? 'border-rose-200 bg-rose-50 text-rose-800'
                  : 'border-rose-500/40 bg-rose-500/10 text-rose-300'
              }`}
            >
              {notesFeedback.type === 'ok' ? (
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>{notesFeedback.msg}</span>
            </div>
          )}

          <button
            type="button"
            disabled={savingNotes}
            onClick={handleSaveNotes}
            className={`w-full py-2 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
                : 'bg-neutral-800 hover:bg-neutral-700 border-neutral-700 text-neutral-200'
            }`}
          >
            {savingNotes ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>Save Dossier Notes</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Inline Right Panel (xl+) */}
      <aside
        className={`hidden xl:flex w-[320px] shrink-0 border-l flex-col min-h-0 h-full ${
          isLight
            ? 'bg-white border-slate-200'
            : 'bg-neutral-900 border-neutral-800'
        }`}
      >
        {panelBody}
      </aside>

      {/* Tablet & Mobile Overlay Drawer (<xl) */}
      <div className="xl:hidden fixed inset-0 z-50 flex justify-end">
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/65"
          aria-hidden="true"
        />
        <aside
          className={`relative z-10 w-full sm:w-[360px] max-w-full h-full border-l flex flex-col shadow-2xl ${
            isLight
              ? 'bg-white border-slate-200'
              : 'bg-neutral-900 border-neutral-800'
          }`}
        >
          {panelBody}
        </aside>
      </div>
    </>
  );
};
