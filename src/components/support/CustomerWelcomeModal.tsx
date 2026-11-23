import React, { useState, useEffect } from 'react';
import {
  X,
  Send,
  CreditCard,
  Building2,
  Lock,
  Headphones,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { SupportAgent, InquiryCategory } from '../../types/support';

interface CustomerWelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffList: SupportAgent[];
  onStartInquiry: (params: {
    category: InquiryCategory;
    subject: string;
    initialMessage: string;
    preferredStaffId?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  theme?: 'dark' | 'light';
}

const CATEGORY_CARDS: {
  category: InquiryCategory;
  title: string;
  description: string;
  icon: React.ReactNode;
  recommendedDepartment: string;
}[] = [
  {
    category: 'Transfers',
    title: 'Wires & Global Transfers',
    description: 'Fedwire Realtime clearance, international SWIFT GPI, and IMAD receipts.',
    icon: <Send className="w-5 h-5 text-emerald-400" />,
    recommendedDepartment: 'Treasury & Wires',
  },
  {
    category: 'Account Issues',
    title: 'Cards & Vault Operations',
    description: 'Obsidian card limits, concierge booking, and currency vault sweeps.',
    icon: <CreditCard className="w-5 h-5 text-sky-400" />,
    recommendedDepartment: 'Card Concierge',
  },
  {
    category: 'Security',
    title: 'Security & Access Governance',
    description: 'FIDO2 hardware key binding, KYC Tier 3, and biometric authorization.',
    icon: <Lock className="w-5 h-5 text-amber-400" />,
    recommendedDepartment: 'Security & Compliance',
  },
  {
    category: 'General Support',
    title: 'Private Wealth & Advisory',
    description: 'Treasury 4.85% APY yield, private syndicate carry, and credit lines.',
    icon: <Building2 className="w-5 h-5 text-purple-400" />,
    recommendedDepartment: 'Private Wealth',
  },
];

export const CustomerWelcomeModal: React.FC<CustomerWelcomeModalProps> = ({
  isOpen,
  onClose,
  staffList,
  onStartInquiry,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';

  const [selectedCategory, setSelectedCategory] = useState<InquiryCategory>('Transfers');
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [autoAssign, setAutoAssign] = useState<boolean>(true);
  const [subject, setSubject] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSubmitError(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const targetCategoryInfo = CATEGORY_CARDS.find((c) => c.category === selectedCategory);
  const onlineMatched =
    staffList.find(
      (a) => a.department === targetCategoryInfo?.recommendedDepartment && a.status === 'online'
    ) ||
    staffList.find((a) => a.status === 'online') ||
    staffList[0];

  const preferredStaffId = autoAssign
    ? undefined
    : selectedAgentId || onlineMatched?.id || undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !subject.trim() || !message.trim()) return;

    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const res = await onStartInquiry({
        category: selectedCategory,
        subject: subject.trim(),
        initialMessage: message.trim(),
        preferredStaffId,
      });

      if (res.ok) {
        setSubject('');
        setMessage('');
        onClose();
      } else {
        setSubmitError(
          res.error || 'Unable to start support inquiry with backend server.'
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90dvh] ${
          isLight
            ? 'bg-white border-slate-200 text-slate-900'
            : 'bg-neutral-900 border-neutral-800 text-neutral-100'
        }`}
      >
        {/* Modal Header */}
        <div
          className={`p-4 sm:p-5 sm:px-6 border-b flex items-center justify-between gap-2 shrink-0 ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-neutral-950/70 border-neutral-800'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <Headphones className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-semibold tracking-tight truncate">
                Initiate Private Wealth Consultation
              </h2>
              <p
                className={`text-[11px] sm:text-xs truncate ${
                  isLight ? 'text-slate-500' : 'text-neutral-400'
                }`}
              >
                Backend auto-routes to an available online specialist or priority queue
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors shrink-0 cursor-pointer disabled:opacity-40 ${
              isLight
                ? 'hover:bg-slate-200 text-slate-400'
                : 'hover:bg-neutral-800 text-neutral-400'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form
          onSubmit={handleSubmit}
          className="p-4 sm:p-6 overflow-y-auto space-y-5 sm:space-y-6 flex-1 min-h-0"
        >
          {submitError && (
            <div
              role="alert"
              className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                isLight
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : 'bg-rose-500/10 border-rose-500/40 text-rose-300'
              }`}
            >
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Step 1: Inquiry Categorization */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-emerald-500">
              1. Select Inquiry Classification
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {CATEGORY_CARDS.map((card) => {
                const isSelected = selectedCategory === card.category;
                return (
                  <div
                    key={card.category}
                    onClick={() => setSelectedCategory(card.category)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? isLight
                          ? 'border-emerald-600 bg-emerald-50/50 ring-1 ring-emerald-500'
                          : 'border-emerald-500/80 bg-emerald-950/20 ring-1 ring-emerald-500/50'
                        : isLight
                        ? 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                        : 'border-neutral-800 hover:border-neutral-700 bg-neutral-950/40'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="p-2 rounded-lg bg-neutral-800/40 border border-neutral-700/40 mb-2">
                        {card.icon}
                      </div>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                    </div>
                    <div
                      className={`font-medium text-xs ${
                        isLight ? 'text-slate-900' : 'text-neutral-100'
                      }`}
                    >
                      {card.title}
                    </div>
                    <p
                      className={`text-[11px] mt-0.5 line-clamp-2 ${
                        isLight ? 'text-slate-500' : 'text-neutral-400'
                      }`}
                    >
                      {card.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step 2: Specialist Routing */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-emerald-500">
                2. Specialist Desk Routing
              </label>
              {staffList.length > 0 && (
                <label className="flex items-center gap-2 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={autoAssign}
                    onChange={(e) => setAutoAssign(e.target.checked)}
                    className="rounded border-neutral-700 text-emerald-500 focus:ring-emerald-500/20"
                  />
                  <span className={isLight ? 'text-slate-600' : 'text-neutral-300'}>
                    Auto-route by backend capacity
                  </span>
                </label>
              )}
            </div>

            {autoAssign || staffList.length === 0 ? (
              <div
                className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                  isLight
                    ? 'bg-slate-50 border-slate-200'
                    : 'bg-neutral-950/60 border-neutral-800'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs border border-emerald-500/30 shrink-0">
                    {onlineMatched ? (
                      onlineMatched.initials
                    ) : (
                      <ShieldCheck className="w-4 h-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold truncate">
                        {onlineMatched
                          ? `${onlineMatched.name} (Eligible)`
                          : 'Automatic Capacity Routing'}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Least-Busy ONLINE
                      </span>
                    </div>
                    <div
                      className={`text-[11px] mt-0.5 ${
                        isLight ? 'text-slate-500' : 'text-neutral-400'
                      }`}
                    >
                      Routes to an ONLINE specialist with available capacity, or enters the
                      waiting queue automatically.
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto pr-1">
                {staffList.map((agent) => {
                  const isSelected = (selectedAgentId || onlineMatched?.id) === agent.id;
                  return (
                    <div
                      key={agent.id}
                      onClick={() => setSelectedAgentId(agent.id)}
                      className={`p-2.5 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-500/10'
                          : isLight
                          ? 'border-slate-200 hover:bg-slate-50'
                          : 'border-neutral-800 hover:bg-neutral-800/40'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-neutral-800 text-neutral-200 flex items-center justify-center text-xs font-bold shrink-0">
                          {agent.initials}
                        </div>
                        <div className="min-w-0">
                          <div
                            className={`text-xs font-medium truncate ${
                              isLight ? 'text-slate-900' : 'text-neutral-100'
                            }`}
                          >
                            {agent.name}
                          </div>
                          <div
                            className={`text-[10px] truncate ${
                              isLight ? 'text-slate-500' : 'text-neutral-400'
                            }`}
                          >
                            {agent.department} · {agent.specialization}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-neutral-400 capitalize shrink-0 pl-2">
                        {agent.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Step 3: Inquiry Subject & Details */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-emerald-500">
              3. Inquiry Details & Instructions
            </label>
            <input
              type="text"
              required
              placeholder="Brief summary subject (e.g. Fedwire release for syndicate allocation)"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className={`w-full px-3.5 py-2.5 rounded-xl border text-xs transition-colors focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                isLight
                  ? 'bg-white border-slate-300 text-slate-900'
                  : 'bg-neutral-950 border-neutral-800 text-neutral-100'
              }`}
            />
            <textarea
              required
              rows={3}
              placeholder="Describe your request in detail. Our desk will authenticate and prepare the order..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className={`w-full px-3.5 py-2.5 rounded-xl border text-xs transition-colors focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none ${
                isLight
                  ? 'bg-white border-slate-300 text-slate-900'
                  : 'bg-neutral-950 border-neutral-800 text-neutral-100'
              }`}
            />
          </div>

          {/* Modal Footer */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className={`px-4 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer disabled:opacity-40 ${
                isLight
                  ? 'text-slate-600 hover:bg-slate-100'
                  : 'text-neutral-400 hover:bg-neutral-800'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !subject.trim() || !message.trim()}
              className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-neutral-950 font-semibold text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>{isSubmitting ? 'Connecting...' : 'Connect with Desk'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

