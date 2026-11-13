import React, { useState } from 'react';
import {
  X,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Send,
  CreditCard,
  Building2,
  Lock,
  Headphones,
  CheckCircle2,
  UserCheck
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
    agentId: string;
  }) => void;
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
    recommendedDepartment: 'Treasury & Wires'
  },
  {
    category: 'Account Issues',
    title: 'Cards & Vault Operations',
    description: 'Obsidian card limits, concierge booking, and currency vault sweeps.',
    icon: <CreditCard className="w-5 h-5 text-sky-400" />,
    recommendedDepartment: 'Card Concierge'
  },
  {
    category: 'Security',
    title: 'Security & Access Governance',
    description: 'FIDO2 hardware key binding, KYC Tier 3, and biometric authorization.',
    icon: <Lock className="w-5 h-5 text-amber-400" />,
    recommendedDepartment: 'Security & Compliance'
  },
  {
    category: 'General Support',
    title: 'Private Wealth & Advisory',
    description: 'Treasury 4.85% APY yield, private syndicate carry, and credit lines.',
    icon: <Building2 className="w-5 h-5 text-purple-400" />,
    recommendedDepartment: 'Private Wealth'
  }
];

export const CustomerWelcomeModal: React.FC<CustomerWelcomeModalProps> = ({
  isOpen,
  onClose,
  staffList,
  onStartInquiry,
  theme = 'dark'
}) => {
  const isLight = theme === 'light';

  const [selectedCategory, setSelectedCategory] = useState<InquiryCategory>('Transfers');
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [autoAssign, setAutoAssign] = useState<boolean>(true);
  const [subject, setSubject] = useState<string>('');
  const [message, setMessage] = useState<string>('');

  if (!isOpen) return null;

  // Find best matched specialist for category
  const targetCategoryInfo = CATEGORY_CARDS.find((c) => c.category === selectedCategory);
  const matchedAgent =
    staffList.find(
      (a) => a.department === targetCategoryInfo?.recommendedDepartment && a.status === 'online'
    ) || staffList.find((a) => a.status === 'online') || staffList[0];

  const effectiveAgentId = autoAssign ? matchedAgent.id : selectedAgentId || matchedAgent.id;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    onStartInquiry({
      category: selectedCategory,
      subject: subject.trim(),
      initialMessage: message.trim(),
      agentId: effectiveAgentId
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90dvh] ${
          isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-neutral-900 border-neutral-800 text-neutral-100'
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
              <h2 className="text-sm sm:text-base font-semibold tracking-tight truncate">Initiate Private Wealth Consultation</h2>
              <p className={`text-[11px] sm:text-xs truncate ${isLight ? 'text-slate-500' : 'text-neutral-400'}`}>
                Connect securely with a licensed Aureus Private Banking specialist
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors shrink-0 ${
              isLight ? 'hover:bg-slate-200 text-slate-400' : 'hover:bg-neutral-800 text-neutral-400'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-5 sm:space-y-6 flex-1 min-h-0">
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
                    <div className={`font-medium text-xs ${isLight ? 'text-slate-900' : 'text-neutral-100'}`}>{card.title}</div>
                    <p className={`text-[11px] mt-0.5 line-clamp-2 ${isLight ? 'text-slate-500' : 'text-neutral-400'}`}>
                      {card.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step 2: Officer Assignment */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-emerald-500">
                2. Assigned Specialist Desk
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={autoAssign}
                  onChange={(e) => setAutoAssign(e.target.checked)}
                  className="rounded border-neutral-700 text-emerald-500 focus:ring-emerald-500/20"
                />
                <span className={isLight ? 'text-slate-600' : 'text-neutral-300'}>
                  Auto-route to optimal specialist
                </span>
              </label>
            </div>

            {autoAssign ? (
              <div
                className={`p-3.5 rounded-xl border flex items-center justify-between ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-neutral-950/60 border-neutral-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs border border-emerald-500/30">
                    {matchedAgent.initials}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold">{matchedAgent.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {matchedAgent.status}
                      </span>
                    </div>
                    <div className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-neutral-400'}`}>
                      {matchedAgent.role} · {matchedAgent.specialization}
                    </div>
                  </div>
                </div>
                <span className="text-[11px] font-mono text-emerald-500 font-medium">
                  {matchedAgent.responseTime}
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto pr-1">
                {staffList.map((agent) => {
                  const isSelected = effectiveAgentId === agent.id;
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
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-neutral-800 text-neutral-200 flex items-center justify-center text-xs font-bold">
                          {agent.initials}
                        </div>
                        <div>
                          <div className={`text-xs font-medium ${isLight ? 'text-slate-900' : 'text-neutral-100'}`}>{agent.name}</div>
                          <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-neutral-400'}`}>
                            {agent.department} · {agent.specialization}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-neutral-400">{agent.status}</span>
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
                isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-neutral-950 border-neutral-800 text-neutral-100'
              }`}
            />
            <textarea
              required
              rows={3}
              placeholder="Describe your request in detail. Our desk will authenticate and prepare the order..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className={`w-full px-3.5 py-2.5 rounded-xl border text-xs transition-colors focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none ${
                isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-neutral-950 border-neutral-800 text-neutral-100'
              }`}
            />
          </div>

          {/* Modal Footer */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-xl text-xs font-medium transition-colors ${
                isLight ? 'text-slate-600 hover:bg-slate-100' : 'text-neutral-400 hover:bg-neutral-800'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-semibold text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Connect with Desk</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
