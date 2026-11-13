import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  ShieldCheck,
  Phone,
  Mail,
  Save,
  Check,
  ArrowRightLeft,
  FileText,
  Tag
} from 'lucide-react';
import {
  SupportConversation,
  CustomerProfile,
  SupportAgent,
  SupportTicket,
  TicketStatus
} from '../../types/support';

interface CustomerInfoDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  conversation: SupportConversation;
  customer?: CustomerProfile;
  linkedTicket?: SupportTicket;
  staffList: SupportAgent[];
  onUpdateStatus: (newStatus: 'active' | 'resolved' | 'pending') => void;
  onUpdateTicketStatus?: (ticketId: string, status: TicketStatus) => void;
  onUpdateNotes: (notes: string) => void;
  onTransferConversation: (targetAgentId: string, transferNote?: string) => void;
  theme?: 'dark' | 'light';
}

export const CustomerInfoDrawer: React.FC<CustomerInfoDrawerProps> = ({
  isOpen,
  onClose,
  conversation,
  customer,
  linkedTicket,
  staffList,
  onUpdateStatus,
  onUpdateTicketStatus,
  onUpdateNotes,
  onTransferConversation,
  theme = 'dark'
}) => {
  const isLight = theme === 'light';

  const formatNotes = (raw?: string | string[]) =>
    Array.isArray(raw) ? raw.join('\n') : raw || '';

  const [notes, setNotes] = useState<string>(() => formatNotes(conversation.internalNotes));
  const [notesSaved, setNotesSaved] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState(staffList[0]?.id || '');
  const [transferNote, setTransferNote] = useState('');

  // Reset local draft notes whenever the active conversation changes
  useEffect(() => {
    setNotes(formatNotes(conversation.internalNotes));
    setNotesSaved(false);
  }, [conversation.id, conversation.internalNotes]);

  if (!isOpen) return null;

  const handleSaveNotes = () => {
    onUpdateNotes(notes);
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 2000);
  };

  const handleExecuteTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgentId) return;
    onTransferConversation(selectedAgentId, transferNote);
    setShowTransferModal(false);
    setTransferNote('');
    onClose();
  };

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[1px] lg:hidden"
        aria-hidden="true"
      />
      <div
        className={`fixed inset-y-0 right-0 z-50 w-full sm:w-96 max-w-full shadow-2xl flex flex-col border-l animate-in slide-in-from-right duration-200 ${
          isLight
            ? 'bg-white border-slate-200 text-slate-900'
            : 'bg-neutral-900 border-neutral-800 text-neutral-100'
        }`}
      >
      {/* Drawer Header */}
      <div
        className={`p-4 border-b flex items-center justify-between shrink-0 ${
          isLight ? 'border-slate-200 bg-slate-50' : 'border-neutral-800 bg-neutral-950/70'
        }`}
      >
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-emerald-500" />
          <h3 className="text-sm font-semibold tracking-tight">Client Dossier & Ticket Controls</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className={`p-1 rounded-lg transition-colors ${
            isLight ? 'text-slate-500 hover:bg-slate-200' : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
          }`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 sm:p-5 overflow-y-auto space-y-5 sm:space-y-6 flex-1 min-h-0">
        {/* Customer Identity Card */}
        <div
          className={`p-4 rounded-xl border space-y-3 ${
            isLight ? 'border-slate-200 bg-slate-50/70' : 'border-neutral-800 bg-neutral-950/50'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center font-bold text-sm text-emerald-500 shrink-0">
              {(customer?.name || conversation.customerName).slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">{customer?.name || conversation.customerName}</div>
              <div className="text-xs text-emerald-500 font-mono truncate">
                {customer?.clientTier || conversation.customerTier}
              </div>
            </div>
          </div>

          <div
            className={`grid grid-cols-2 gap-2 pt-2 border-t text-xs ${
              isLight ? 'border-slate-200' : 'border-neutral-800/60'
            }`}
          >
            <div>
              <span className="text-[10px] text-neutral-500 uppercase block">Account</span>
              <span className="font-mono">{customer?.accountNumberMasked || 'Not Linked'}</span>
            </div>
            <div>
              <span className="text-[10px] text-neutral-500 uppercase block">KYC Status</span>
              <span className="text-emerald-500 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 shrink-0" />
                <span className="truncate">{customer?.kycLevel || 'Pending Check'}</span>
              </span>
            </div>
            <div>
              <span className="text-[10px] text-neutral-500 uppercase block">Liquid Balance</span>
              <span className="font-mono font-medium text-emerald-500">
                {typeof customer?.balanceUSD === 'number'
                  ? `$${customer.balanceUSD.toLocaleString()}`
                  : 'Restricted'}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-neutral-500 uppercase block">Jurisdiction</span>
              <span>{customer?.primaryJurisdiction || '—'}</span>
            </div>
          </div>

          <div
            className={`space-y-1 pt-2 border-t text-xs ${
              isLight ? 'border-slate-200 text-slate-600' : 'border-neutral-800/60 text-neutral-400'
            }`}
          >
            <div className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
              <span className="truncate">{customer?.email || 'No email on file'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
              <span className="font-mono">{customer?.phone || 'No phone on file'}</span>
            </div>
          </div>
        </div>

        {/* Conversation Status Controls */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400 block">
            Conversation Status
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['active', 'pending', 'resolved'] as const).map((st) => {
              const isSelected = conversation.status === st;
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => onUpdateStatus(st)}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold capitalize transition-all cursor-pointer ${
                    isSelected
                      ? st === 'active'
                        ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                        : st === 'pending'
                        ? 'border-amber-500 bg-amber-500/20 text-amber-400'
                        : 'border-sky-500 bg-sky-500/20 text-sky-400'
                      : isLight
                      ? 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600'
                      : 'border-neutral-800 bg-neutral-950/50 hover:bg-neutral-800/40 text-neutral-400'
                  }`}
                >
                  {st}
                </button>
              );
            })}
          </div>
        </div>

        {/* Linked Formal Ticket Details & Status */}
        {linkedTicket && (
          <div
            className={`p-3.5 rounded-xl border space-y-2.5 ${
              isLight ? 'border-slate-200 bg-slate-50/70' : 'border-neutral-800 bg-neutral-950/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-500">
                <Tag className="w-3.5 h-3.5" />
                <span>{linkedTicket.id}</span>
              </div>
              <span
                className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                  linkedTicket.priority === 'Urgent'
                    ? 'bg-rose-500/15 text-rose-400'
                    : linkedTicket.priority === 'High'
                    ? 'bg-amber-500/15 text-amber-400'
                    : 'bg-sky-500/15 text-sky-400'
                }`}
              >
                {linkedTicket.priority}
              </span>
            </div>
            <div className="text-xs font-medium">{linkedTicket.subject}</div>
            <p className="text-[11px] text-neutral-400 leading-relaxed">{linkedTicket.description}</p>

            {onUpdateTicketStatus && (
              <div className="pt-1">
                <label className="text-[10px] uppercase tracking-wider text-neutral-500 block mb-1">
                  Ticket Status
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['Open', 'In Review', 'Escalated', 'Resolved'] as const).map((tStatus) => (
                    <button
                      key={tStatus}
                      type="button"
                      onClick={() => onUpdateTicketStatus(linkedTicket.id, tStatus)}
                      className={`py-1.5 px-2 rounded-lg border text-[11px] font-medium transition-colors cursor-pointer ${
                        linkedTicket.status === tStatus
                          ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400 font-semibold'
                          : isLight
                          ? 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                          : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:bg-neutral-800'
                      }`}
                    >
                      {tStatus}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Reassign / Transfer Conversation */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400 block">
            Desk Reassignment
          </label>
          <button
            type="button"
            onClick={() => setShowTransferModal(true)}
            className={`w-full py-2.5 px-3 rounded-xl border text-xs font-medium transition-colors flex items-center justify-between cursor-pointer ${
              isLight
                ? 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800'
                : 'border-neutral-800 bg-neutral-950/60 hover:bg-neutral-800/50 text-neutral-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-emerald-500" />
              <span>Transfer to Specialist Desk...</span>
            </div>
            <span className="text-[10px] font-mono text-neutral-500">
              {staffList.filter((s) => s.status === 'online').length} Online
            </span>
          </button>
        </div>

        {/* Internal Private Staff Notes */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              <span>Private Staff Notes</span>
            </label>
            <span className="text-[10px] text-neutral-500">(Hidden from client)</span>
          </div>

          <textarea
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Record compliance observations, wire clearance notes, or account preferences..."
            className={`w-full p-3 rounded-xl border text-xs transition-colors focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none font-sans ${
              isLight
                ? 'border-slate-300 bg-white text-slate-900'
                : 'border-neutral-800 bg-neutral-950 text-neutral-100'
            }`}
          />

          <button
            type="button"
            onClick={handleSaveNotes}
            className={`w-full py-2 rounded-xl text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
              isLight
                ? 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
            }`}
          >
            {notesSaved ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Save className="w-3.5 h-3.5" />}
            <span>{notesSaved ? 'Notes Saved to Dossier' : 'Save Internal Notes'}</span>
          </button>
        </div>
      </div>

      {/* Transfer Conversation Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm">
          <div
            className={`w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-2xl border p-5 sm:p-6 space-y-4 shadow-2xl ${
              isLight
                ? 'border-slate-200 bg-white text-slate-900'
                : 'border-neutral-800 bg-neutral-900 text-neutral-100'
            }`}
          >
            <div className="flex items-center justify-between border-b border-neutral-800/30 pb-3">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-emerald-500" />
                <h4 className="text-sm font-semibold">Transfer Conversation</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowTransferModal(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecuteTransfer} className="space-y-4">
              <div>
                <label className="text-xs text-neutral-400 block mb-1">Select Target Specialist</label>
                <select
                  value={selectedAgentId}
                  onChange={(e) => setSelectedAgentId(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border text-xs ${
                    isLight
                      ? 'border-slate-300 bg-white text-slate-900'
                      : 'border-neutral-800 bg-neutral-950 text-neutral-100'
                  }`}
                >
                  {staffList.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name} — {st.department} ({st.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-neutral-400 block mb-1">Handoff Instructions / Notes</label>
                <textarea
                  rows={2}
                  value={transferNote}
                  onChange={(e) => setTransferNote(e.target.value)}
                  placeholder="e.g. Client requires SWIFT GPI UETR tracking verification."
                  className={`w-full p-2.5 rounded-xl border text-xs ${
                    isLight
                      ? 'border-slate-300 bg-white text-slate-900'
                      : 'border-neutral-800 bg-neutral-950 text-neutral-100'
                  }`}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-3 py-1.5 rounded-xl text-xs text-neutral-400 hover:bg-neutral-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-emerald-500 text-neutral-950 font-semibold text-xs hover:bg-emerald-400"
                >
                  Confirm Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </>
  );
};
