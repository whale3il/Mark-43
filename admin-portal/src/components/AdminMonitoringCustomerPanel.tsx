import React, { useState, useEffect } from 'react';
import {
  User,
  X,
  ShieldCheck,
  Mail,
  Phone,
  UserCheck,
  AlertTriangle,
  ExternalLink,
  Tag,
  Lock,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowRightLeft,
} from 'lucide-react';
import {
  AdminConversation,
  AdminPermissions,
  AdminStaffRecord,
  AdminTicket,
  CustomerProfile,
} from '../types/admin.types';

interface AdminMonitoringCustomerPanelProps {
  conversation: AdminConversation;
  customer?: CustomerProfile;
  linkedTicket?: AdminTicket;
  staffDirectory: AdminStaffRecord[];
  permissions: AdminPermissions;
  isOpen: boolean;
  onClose: () => void;
  onReassignConversation: (
    conversationId: string,
    staffId: string,
    reason?: string
  ) => Promise<{ ok: boolean; error?: string }>;
  onEscalateConversation: (
    conversationId: string,
    reason: string
  ) => Promise<{ ok: boolean; error?: string }>;
  onOpenTicketView?: (ticketId: string) => void;
  theme: 'dark' | 'light';
}

export const AdminMonitoringCustomerPanel: React.FC<
  AdminMonitoringCustomerPanelProps
> = ({
  conversation,
  customer,
  linkedTicket,
  staffDirectory,
  permissions,
  isOpen,
  onClose,
  onReassignConversation,
  onEscalateConversation,
  onOpenTicketView,
  theme,
}) => {
  const isLight = theme === 'light';
  const [selectedStaffId, setSelectedStaffId] = useState(
    conversation.assignedStaffId || ''
  );
  const [reassignReason, setReassignReason] = useState('');
  const [escalateReason, setEscalateReason] = useState('');
  const [confirmReassign, setConfirmReassign] = useState(false);
  const [confirmEscalate, setConfirmEscalate] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{
    type: 'ok' | 'err';
    msg: string;
  } | null>(null);

  useEffect(() => {
    setSelectedStaffId(conversation.assignedStaffId || '');
    setReassignReason('');
    setEscalateReason('');
    setConfirmReassign(false);
    setConfirmEscalate(false);
    setActionFeedback(null);
  }, [conversation.id, conversation.assignedStaffId]);

  if (!isOpen) return null;

  const activeStaffOptions = staffDirectory.filter(
    (s) => s.accountStatus === 'ACTIVE'
  );

  const handleConfirmReassign = async () => {
    if (!permissions.canAssignTickets || !selectedStaffId) return;
    setIsMutating(true);
    setActionFeedback(null);
    try {
      const res = await onReassignConversation(
        conversation.id,
        selectedStaffId,
        reassignReason.trim() || undefined
      );
      if (res.ok) {
        setActionFeedback({
          type: 'ok',
          msg: 'Conversation reassignment confirmed by backend.',
        });
        setConfirmReassign(false);
        setReassignReason('');
      } else {
        setActionFeedback({
          type: 'err',
          msg:
            res.error ||
            'Reassignment not confirmed by backend (`POST /api/admin/support/conversations/:id/reassign`).',
        });
      }
    } finally {
      setIsMutating(false);
    }
  };

  const handleConfirmEscalate = async () => {
    if (!permissions.canAssignTickets || !escalateReason.trim()) return;
    setIsMutating(true);
    setActionFeedback(null);
    try {
      const res = await onEscalateConversation(
        conversation.id,
        escalateReason.trim()
      );
      if (res.ok) {
        setActionFeedback({
          type: 'ok',
          msg: 'Escalation event recorded on backend.',
        });
        setConfirmEscalate(false);
        setEscalateReason('');
      } else {
        setActionFeedback({
          type: 'err',
          msg:
            res.error ||
            'Escalation endpoint (`POST /api/admin/support/conversations/:id/escalate`) is unavailable.',
        });
      }
    } finally {
      setIsMutating(false);
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
            Supervision & Customer Details
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
        {actionFeedback && (
          <div
            role="alert"
            className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
              actionFeedback.type === 'ok'
                ? isLight
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                : isLight
                ? 'border-rose-200 bg-rose-50 text-rose-800'
                : 'border-rose-500/40 bg-rose-500/10 text-rose-300'
            }`}
          >
            {actionFeedback.type === 'ok' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
            )}
            <span>{actionFeedback.msg}</span>
          </div>
        )}

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
              <div className="text-[11px] text-neutral-500">Account</div>
              <div className="font-mono mt-0.5">
                {customer?.accountNumberMasked || 'Private Vault'}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-neutral-500">KYC Status</div>
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

        {/* Assigned Staff & Supervision */}
        <div
          className={`p-3.5 rounded-xl border space-y-2.5 ${
            isLight
              ? 'bg-slate-50 border-slate-200'
              : 'bg-neutral-950/60 border-neutral-800'
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
              Assigned Specialist
            </span>
            <span className="text-[11px] font-mono text-neutral-500">
              {conversation.department}
            </span>
          </div>

          <div className="text-xs">
            <div className="font-semibold">{conversation.assignedStaffName}</div>
            <div className="text-[11px] text-neutral-400">
              {conversation.isUnassigned
                ? 'Awaiting automatic or supervisory assignment'
                : `${conversation.agent.role} · ${conversation.agent.responseTime}`}
            </div>
          </div>
        </div>

        {/* Linked Ticket */}
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
              <span className="text-[11px] font-mono text-amber-500">
                {linkedTicket.priority} · {linkedTicket.status}
              </span>
            </div>

            <div className="text-xs font-semibold">{linkedTicket.subject}</div>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              {linkedTicket.description}
            </p>

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
                <span>Open Ticket Oversight</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Authorized Reassignment & Escalation Controls */}
        <div className="space-y-3 pt-2 border-t border-neutral-800/40">
          <div className="text-xs font-semibold flex items-center justify-between">
            <span>Supervisory Actions</span>
            {!permissions.canAssignTickets && (
              <span className="text-[11px] font-mono text-rose-400 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                Restricted
              </span>
            )}
          </div>

          {!permissions.canAssignTickets ? (
            <div
              className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                isLight
                  ? 'border-slate-200 bg-slate-50 text-slate-600'
                  : 'border-neutral-800 bg-neutral-950/50 text-neutral-400'
              }`}
            >
              <Lock className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" />
              <span>
                Your administrator profile lacks `canAssignTickets` permission to
                reassign or escalate conversations.
              </span>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Reassignment */}
              <div className="space-y-2">
                <label className="text-[11px] text-neutral-400 block">
                  Reassign Specialist
                </label>
                <select
                  value={selectedStaffId}
                  onChange={(e) => {
                    setSelectedStaffId(e.target.value);
                    setConfirmReassign(false);
                  }}
                  disabled={isMutating}
                  className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                    isLight
                      ? 'bg-white border-slate-300 text-slate-900'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-100'
                  }`}
                >
                  <option value="">Select target specialist...</option>
                  {activeStaffOptions.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.fullName} ({st.department} · {st.activeConversationsCount}/{st.maxChats})
                    </option>
                  ))}
                </select>

                {!confirmReassign ? (
                  <button
                    type="button"
                    disabled={
                      !selectedStaffId ||
                      selectedStaffId === conversation.assignedStaffId ||
                      isMutating
                    }
                    onClick={() => setConfirmReassign(true)}
                    className={`w-full py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 ${
                      isLight
                        ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
                        : 'bg-neutral-800 hover:bg-neutral-700 border-neutral-700 text-neutral-200'
                    }`}
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    <span>Reassign Conversation</span>
                  </button>
                ) : (
                  <div
                    className={`p-3 rounded-xl border space-y-2 ${
                      isLight
                        ? 'bg-amber-50 border-amber-200'
                        : 'bg-amber-500/10 border-amber-500/30'
                    }`}
                  >
                    <div className="text-[11px] font-semibold">
                      Confirm Reassignment
                    </div>
                    <input
                      type="text"
                      value={reassignReason}
                      onChange={(e) => setReassignReason(e.target.value)}
                      placeholder="Audit note / reason (optional)..."
                      className={`w-full px-2.5 py-1.5 rounded-lg border text-xs ${
                        isLight
                          ? 'bg-white border-slate-300'
                          : 'bg-neutral-950 border-neutral-800'
                      }`}
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={isMutating}
                        onClick={() => setConfirmReassign(false)}
                        className="flex-1 py-1.5 rounded-lg border border-neutral-700 text-xs cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={isMutating}
                        onClick={handleConfirmReassign}
                        className="flex-1 py-1.5 rounded-lg bg-emerald-500 text-neutral-950 font-semibold text-xs flex items-center justify-center gap-1 cursor-pointer"
                      >
                        {isMutating && (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        )}
                        <span>Confirm</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Escalation */}
              <div className="space-y-2">
                {!confirmEscalate ? (
                  <button
                    type="button"
                    disabled={isMutating}
                    onClick={() => setConfirmEscalate(true)}
                    className={`w-full py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer ${
                      isLight
                        ? 'border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700'
                        : 'border-rose-500/35 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300'
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Escalate Conversation</span>
                  </button>
                ) : (
                  <div
                    className={`p-3 rounded-xl border space-y-2 ${
                      isLight
                        ? 'bg-rose-50 border-rose-200'
                        : 'bg-rose-500/10 border-rose-500/35'
                    }`}
                  >
                    <div className="text-[11px] font-semibold text-rose-400">
                      Confirm Supervisory Escalation
                    </div>
                    <input
                      type="text"
                      value={escalateReason}
                      onChange={(e) => setEscalateReason(e.target.value)}
                      placeholder="Required escalation justification..."
                      className={`w-full px-2.5 py-1.5 rounded-lg border text-xs ${
                        isLight
                          ? 'bg-white border-slate-300'
                          : 'bg-neutral-950 border-neutral-800'
                      }`}
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={isMutating}
                        onClick={() => setConfirmEscalate(false)}
                        className="flex-1 py-1.5 rounded-lg border border-neutral-700 text-xs cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={isMutating || !escalateReason.trim()}
                        onClick={handleConfirmEscalate}
                        className="flex-1 py-1.5 rounded-lg bg-rose-500 text-white font-semibold text-xs disabled:opacity-40 flex items-center justify-center gap-1 cursor-pointer"
                      >
                        {isMutating && (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        )}
                        <span>Escalate</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside
        className={`hidden xl:flex w-[330px] shrink-0 border-l flex-col min-h-0 h-full ${
          isLight
            ? 'bg-white border-slate-200'
            : 'bg-neutral-900 border-neutral-800'
        }`}
      >
        {panelBody}
      </aside>

      <div className="xl:hidden fixed inset-0 z-50 flex justify-end">
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/65"
          aria-hidden="true"
        />
        <aside
          className={`relative z-10 w-full sm:w-[370px] max-w-full h-full border-l flex flex-col shadow-2xl ${
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
