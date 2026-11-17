import React, { useState } from 'react';
import {
  Radio,
  CheckCircle2,
  AlertCircle,
  Loader2,
  MessageSquare,
  FileText,
  ShieldCheck,
} from 'lucide-react';
import {
  StaffAvailabilityEnum,
  StaffConversation,
  StaffMemberProfile,
  StaffTicket,
} from '../types/staff.types';
import { AVAILABILITY_OPTIONS } from '../config/staffConfig';
import { AVAILABILITY_STYLE } from '../layouts/StaffPortalLayout';

interface StaffAvailabilityPageProps {
  staff: StaffMemberProfile;
  conversations: StaffConversation[];
  tickets: StaffTicket[];
  onConfirmAvailability: (
    next: StaffAvailabilityEnum
  ) => Promise<{ ok: boolean; error?: string }>;
  theme: 'dark' | 'light';
}

export const StaffAvailabilityPage: React.FC<StaffAvailabilityPageProps> = ({
  staff,
  conversations,
  tickets,
  onConfirmAvailability,
  theme,
}) => {
  const isLight = theme === 'light';
  const [pendingStatus, setPendingStatus] = useState<StaffAvailabilityEnum | null>(
    null
  );
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [confirmedNotice, setConfirmedNotice] = useState<string | null>(null);

  const activeChats =
    conversations.length > 0
      ? conversations.filter((c) => c.status === 'active').length
      : staff.activeChatsCount;
  const maxChats = Math.max(staff.maxChats || 5, 1);
  const openTickets = tickets.filter((t) => t.status !== 'Resolved').length;
  const resolvedTickets = tickets.filter((t) => t.status === 'Resolved').length;

  const handleSelectAvailability = async (status: StaffAvailabilityEnum) => {
    if (pendingStatus || status === staff.availability) return;
    setFeedbackError(null);
    setConfirmedNotice(null);
    setPendingStatus(status);

    try {
      const res = await onConfirmAvailability(status);
      if (res.ok) {
        setConfirmedNotice(`Backend confirmed routing status: ${status}`);
      } else {
        setFeedbackError(
          res.error ||
            'Availability update was not confirmed by backend. Status unchanged.'
        );
      }
    } finally {
      setPendingStatus(null);
    }
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="max-w-5xl mx-auto w-full space-y-6">
      <div className="space-y-1">
        <div className="text-[11px] font-mono uppercase tracking-wider text-neutral-500">
          Routing & Workload Capacity
        </div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
          Desk Availability
        </h1>
        <p
          className={`text-xs ${
            isLight ? 'text-slate-600' : 'text-neutral-400'
          }`}
        >
          Updates require live backend confirmation (`PATCH /api/staff/availability`).
          Changing availability does not sign you out of your authenticated session.
        </p>
      </div>

      {feedbackError && (
        <div
          role="alert"
          className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
            isLight
              ? 'border-rose-200 bg-rose-50 text-rose-800'
              : 'border-rose-500/40 bg-rose-500/10 text-rose-300'
          }`}
        >
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <span>{feedbackError}</span>
        </div>
      )}

      {confirmedNotice && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
            isLight
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
          <span>{confirmedNotice}</span>
        </div>
      )}

      {/* Availability Selector Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {AVAILABILITY_OPTIONS.map((opt) => {
          const isCurrent = staff.availability === opt.value;
          const isConfirming = pendingStatus === opt.value;
          const meta = AVAILABILITY_STYLE[opt.value];

          return (
            <button
              key={opt.value}
              type="button"
              disabled={pendingStatus !== null}
              onClick={() => handleSelectAvailability(opt.value)}
              className={`text-left p-4 rounded-2xl border transition-all cursor-pointer disabled:opacity-70 ${
                isCurrent
                  ? isLight
                    ? 'bg-emerald-50 border-emerald-400 ring-1 ring-emerald-400/40'
                    : 'bg-neutral-900 border-emerald-500/70 ring-1 ring-emerald-500/30'
                  : isLight
                  ? 'bg-white border-slate-200 hover:border-slate-300'
                  : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${meta.dot}`} />
                  <span className="text-sm font-bold font-mono">{opt.value}</span>
                </div>
                {isConfirming ? (
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                ) : isCurrent ? (
                  <span className="text-[11px] font-mono text-emerald-500 font-semibold">
                    Active
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-xs text-neutral-400 leading-relaxed">
                {opt.summary}
              </p>
            </button>
          );
        })}
      </div>

      {/* Separate Chat Capacity vs Ticket Workload Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          className={`p-5 rounded-2xl border space-y-3 ${
            isLight
              ? 'bg-white border-slate-200'
              : 'bg-neutral-900 border-neutral-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <MessageSquare className="w-4 h-4 text-emerald-500" />
              <span>Real-Time Chat Capacity</span>
            </div>
            <span className="text-xs font-mono font-bold tabular-nums text-emerald-500">
              {activeChats} / {maxChats}
            </span>
          </div>

          <div
            className={`h-2 rounded-full overflow-hidden ${
              isLight ? 'bg-slate-200' : 'bg-neutral-800'
            }`}
          >
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-300"
              style={{
                width: `${Math.min(100, Math.round((activeChats / maxChats) * 100))}%`,
              }}
            />
          </div>

          <p className="text-xs text-neutral-400">
            Active live conversations count toward your `maxChats` ({maxChats})
            concurrency limit for inbound client routing.
          </p>
        </div>

        <div
          className={`p-5 rounded-2xl border space-y-3 ${
            isLight
              ? 'bg-white border-slate-200'
              : 'bg-neutral-900 border-neutral-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <FileText className="w-4 h-4 text-sky-400" />
              <span>Ticket Workload (Tracked Separately)</span>
            </div>
            <span className="text-xs font-mono font-bold tabular-nums">
              {tickets.length} Total
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs pt-1">
            <div
              className={`p-3 rounded-xl border ${
                isLight
                  ? 'bg-slate-50 border-slate-200'
                  : 'bg-neutral-950/60 border-neutral-800'
              }`}
            >
              <div className="text-[11px] text-neutral-500">Open / In Review</div>
              <div className="text-lg font-bold font-mono tabular-nums mt-0.5 text-amber-400">
                {openTickets}
              </div>
            </div>
            <div
              className={`p-3 rounded-xl border ${
                isLight
                  ? 'bg-slate-50 border-slate-200'
                  : 'bg-neutral-950/60 border-neutral-800'
              }`}
            >
              <div className="text-[11px] text-neutral-500">Resolved</div>
              <div className="text-lg font-bold font-mono tabular-nums mt-0.5 text-sky-400">
                {resolvedTickets}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Session vs Availability clarification */}
      <div
        className={`p-4 rounded-2xl border flex items-start gap-3 text-xs ${
          isLight
            ? 'bg-white border-slate-200 text-slate-600'
            : 'bg-neutral-900/60 border-neutral-800 text-neutral-400'
        }`}
      >
        <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <div
            className={`font-semibold ${
              isLight ? 'text-slate-900' : 'text-neutral-200'
            }`}
          >
            Session & Routing Separation
          </div>
          <p className="leading-relaxed">
            Your HTTP-only authentication cookie stays active regardless of your
            routing availability (`OFFLINE`, `AWAY`, `BUSY`, or `ONLINE`). Use
            Sign Out in the navigation rail when ending your shift.
          </p>
        </div>
      </div>
      </div>
    </div>
  );
};
