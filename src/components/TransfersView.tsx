import React, { useState } from 'react';
import {
  Send,
  UserCheck,
  Plus,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building,
  User,
  Sparkles,
  Download,
  Trash2
} from 'lucide-react';
import { BankAccount, Beneficiary, Transaction, CurrencyCode } from '../types/banking';

interface TransfersViewProps {
  accounts: BankAccount[];
  beneficiaries: Beneficiary[];
  currency: CurrencyCode;
  onExecuteTransfer: (transfer: {
    sourceAccountId: string;
    beneficiaryId: string;
    amount: number;
    memo: string;
    speed: string;
  }) => void;
  onAddBeneficiary: (ben: Omit<Beneficiary, 'id'>) => void;
  onDeleteBeneficiary: (id: string) => void;
}

export const TransfersView: React.FC<TransfersViewProps> = ({
  accounts,
  beneficiaries,
  currency,
  onExecuteTransfer,
  onAddBeneficiary,
  onDeleteBeneficiary
}) => {
  const [activeTab, setActiveTab] = useState<'send' | 'beneficiaries'>('send');

  // Transfer form state
  const [sourceAccountId, setSourceAccountId] = useState(accounts[0]?.id || '');
  const [selectedBenId, setSelectedBenId] = useState(beneficiaries[0]?.id || '');
  const [amountInput, setAmountInput] = useState('25000');
  const [speed, setSpeed] = useState<'wire' | 'fednow' | 'ach'>('wire');
  const [memo, setMemo] = useState('Quarterly advisory tranche');

  // Multi-step modal or view state: 'form' | 'confirm' | 'success'
  const [step, setStep] = useState<'form' | 'confirm' | 'success'>('form');
  const [lastTxId, setLastTxId] = useState<string>('');

  // Add Beneficiary Modal State
  const [showAddBenModal, setShowAddBenModal] = useState(false);
  const [newBenName, setNewBenName] = useState('');
  const [newBenEmail, setNewBenEmail] = useState('');
  const [newBenBank, setNewBenBank] = useState('');
  const [newBenAccount, setNewBenAccount] = useState('');
  const [newBenRouting, setNewBenRouting] = useState('');
  const [newBenCategory, setNewBenCategory] = useState<'Personal' | 'Business' | 'Family Office' | 'Real Estate'>('Business');

  const selectedAccount = accounts.find(a => a.id === sourceAccountId) || accounts[0];
  const selectedBen = beneficiaries.find(b => b.id === selectedBenId) || beneficiaries[0];

  const parsedAmount = parseFloat(amountInput) || 0;
  const isSufficient = selectedAccount && selectedAccount.availableBalance >= parsedAmount;

  const handleProceedToConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!parsedAmount || parsedAmount <= 0) return;
    if (!isSufficient) return;
    setStep('confirm');
  };

  const handleFinalSubmit = () => {
    const txRef = `WRE-${Math.floor(100000 + Math.random() * 900000)}`;
    setLastTxId(txRef);
    onExecuteTransfer({
      sourceAccountId,
      beneficiaryId: selectedBenId,
      amount: parsedAmount,
      memo,
      speed
    });
    setStep('success');
  };

  const handleReset = () => {
    setStep('form');
    setAmountInput('');
    setMemo('');
  };

  const handleCreateBeneficiary = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBenName || !newBenAccount) return;
    onAddBeneficiary({
      name: newBenName,
      email: newBenEmail || 'contact@client.org',
      bankName: newBenBank || 'JPMorgan Chase Wealth',
      accountNumber: `•••• ${newBenAccount.slice(-4)}`,
      routingNumber: newBenRouting || '021000021',
      initials: newBenName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
      category: newBenCategory,
      verified: true,
      lastTransferDate: 'Just now'
    });
    setShowAddBenModal(false);
    setNewBenName('');
    setNewBenEmail('');
    setNewBenBank('');
    setNewBenAccount('');
    setNewBenRouting('');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header & Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-100 font-sans">
            Transfers & Global Clearing
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Same-day Fedwire, real-time FedNow, and cross-border SWIFT disbursements
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center p-1 rounded-xl bg-neutral-900 border border-neutral-800 text-xs">
          <button
            onClick={() => { setActiveTab('send'); setStep('form'); }}
            className={`px-4 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'send' ? 'bg-neutral-800 text-neutral-100 shadow-sm' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            New Transfer
          </button>
          <button
            onClick={() => setActiveTab('beneficiaries')}
            className={`px-4 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'beneficiaries' ? 'bg-neutral-800 text-neutral-100 shadow-sm' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Beneficiaries Directory ({beneficiaries.length})
          </button>
        </div>
      </div>

      {activeTab === 'send' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Transfer Form / Confirmation / Success Card */}
          <div className="lg:col-span-2 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6 md:p-8">
            {step === 'form' && (
              <form onSubmit={handleProceedToConfirm} className="space-y-6">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-2">
                    Source Account
                  </label>
                  <select
                    value={sourceAccountId}
                    onChange={(e) => setSourceAccountId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-200 focus:outline-none focus:border-neutral-700"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} — ${acc.balance.toLocaleString()} available (•••• {acc.accountNumber.slice(-4)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-neutral-300">
                      Destination Beneficiary
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowAddBenModal(true)}
                      className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium"
                    >
                      <Plus className="w-3 h-3" /> New Beneficiary
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {beneficiaries.map((ben) => {
                      const isSelected = ben.id === selectedBenId;
                      return (
                        <div
                          key={ben.id}
                          onClick={() => setSelectedBenId(ben.id)}
                          className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-center gap-3 ${
                            isSelected
                              ? 'border-emerald-500/50 bg-neutral-900/90 ring-1 ring-emerald-500/20'
                              : 'border-neutral-800 bg-neutral-950/60 hover:bg-neutral-900/50'
                          }`}
                        >
                          <div className="w-9 h-9 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-xs font-bold text-neutral-200 shrink-0">
                            {ben.avatarUrl ? (
                              <img src={ben.avatarUrl} alt={ben.name} referrerPolicy="no-referrer" className="w-full h-full rounded-full object-cover" />
                            ) : (
                              ben.initials
                            )}
                          </div>
                          <div className="truncate">
                            <div className="text-xs font-medium text-neutral-200 truncate">{ben.name}</div>
                            <div className="text-[10px] text-neutral-400 font-mono">{ben.bankName} · {ben.accountNumber}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-2">
                    Transfer Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-mono text-neutral-400">$</span>
                    <input
                      type="number"
                      value={amountInput}
                      onChange={(e) => setAmountInput(e.target.value)}
                      placeholder="0.00"
                      min="1"
                      className="w-full pl-8 pr-4 py-3 rounded-xl bg-neutral-950 border border-neutral-800 text-lg font-mono text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-neutral-700 tabular-nums"
                      required
                    />
                  </div>
                  {!isSufficient && (
                    <div className="mt-2 text-xs text-rose-400 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" /> Insufficient available balance in selected account.
                    </div>
                  )}

                  {/* Quick Preset Chips */}
                  <div className="flex items-center gap-2 mt-2.5">
                    {[5000, 10000, 25000, 50000, 100000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setAmountInput(amt.toString())}
                        className="px-2.5 py-1 rounded-md bg-neutral-950 border border-neutral-800 text-[11px] font-mono text-neutral-400 hover:text-neutral-200 hover:border-neutral-700 transition-colors"
                      >
                        +${(amt / 1000).toFixed(0)}k
                      </button>
                    ))}
                  </div>
                </div>

                {/* Transfer Speed Selection */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-2">
                    Execution Network Speed
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setSpeed('wire')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        speed === 'wire'
                          ? 'border-emerald-500/50 bg-neutral-900/90 text-neutral-100 ring-1 ring-emerald-500/20'
                          : 'border-neutral-800 bg-neutral-950/60 text-neutral-400 hover:bg-neutral-900/50'
                      }`}
                    >
                      <div className="font-semibold text-xs text-neutral-200">Instant Fedwire</div>
                      <div className="text-[10px] text-emerald-400 font-mono mt-0.5">&lt; 45 Seconds · $0 Fee</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSpeed('fednow')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        speed === 'fednow'
                          ? 'border-emerald-500/50 bg-neutral-900/90 text-neutral-100 ring-1 ring-emerald-500/20'
                          : 'border-neutral-800 bg-neutral-950/60 text-neutral-400 hover:bg-neutral-900/50'
                      }`}
                    >
                      <div className="font-semibold text-xs text-neutral-200">FedNow Realtime</div>
                      <div className="text-[10px] text-neutral-400 font-mono mt-0.5">24/7/365 · $0 Fee</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSpeed('ach')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        speed === 'ach'
                          ? 'border-emerald-500/50 bg-neutral-900/90 text-neutral-100 ring-1 ring-emerald-500/20'
                          : 'border-neutral-800 bg-neutral-950/60 text-neutral-400 hover:bg-neutral-900/50'
                      }`}
                    >
                      <div className="font-semibold text-xs text-neutral-200">Standard ACH</div>
                      <div className="text-[10px] text-neutral-400 font-mono mt-0.5">Next Business Day</div>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-2">
                    Reference Memo / Purpose of Wire
                  </label>
                  <input
                    type="text"
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                    placeholder="e.g. Q3 Syndicate Advisory Distribution"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-neutral-700"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!isSufficient || parsedAmount <= 0}
                  className="w-full py-3 rounded-xl bg-emerald-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-neutral-950 font-semibold text-xs hover:bg-emerald-400 transition-colors flex items-center justify-center gap-2"
                >
                  <span>Review & Verify Wire</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}

            {step === 'confirm' && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-neutral-800">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-neutral-100">Federal Reserve Wire Verification</h3>
                    <p className="text-xs text-neutral-400">Final review before irrevocable ledger dispatch</p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-neutral-950/80 border border-neutral-800 space-y-3 text-xs">
                  <div className="flex justify-between py-1 border-b border-neutral-800/60">
                    <span className="text-neutral-400">Disbursing Account</span>
                    <span className="font-mono text-neutral-200">{selectedAccount.name}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-neutral-800/60">
                    <span className="text-neutral-400">Recipient Beneficiary</span>
                    <span className="font-medium text-neutral-200">{selectedBen.name}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-neutral-800/60">
                    <span className="text-neutral-400">Beneficiary Bank</span>
                    <span className="font-mono text-neutral-200">{selectedBen.bankName}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-neutral-800/60">
                    <span className="text-neutral-400">Transfer Amount</span>
                    <span className="font-mono font-bold text-base text-emerald-400">${parsedAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-neutral-800/60">
                    <span className="text-neutral-400">Network Fee</span>
                    <span className="font-mono text-neutral-200">$0.00 (Waived for Sovereign Tier)</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-neutral-400">Estimated Settlement</span>
                    <span className="font-mono text-emerald-400">Instant (Within 45 seconds)</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setStep('form')}
                    className="flex-1 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-medium text-neutral-300 hover:bg-neutral-800"
                  >
                    Back to Edit
                  </button>
                  <button
                    type="button"
                    onClick={handleFinalSubmit}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-xs font-semibold text-neutral-950 hover:bg-emerald-400 flex items-center justify-center gap-2 shadow-sm"
                  >
                    <span>Authorize & Disburse</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {step === 'success' && (
              <div className="py-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-lg font-bold text-neutral-100">Disbursement Successfully Transmitted</h3>
                <p className="text-xs text-neutral-400 max-w-md mx-auto">
                  Fedwire reference <span className="font-mono text-emerald-400">{lastTxId}</span> has cleared the Aureus master ledger and was dispatched to {selectedBen.name}.
                </p>

                <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 max-w-sm mx-auto text-xs space-y-2 text-left font-mono">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Amount:</span>
                    <span className="text-neutral-200">${parsedAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Ref Code:</span>
                    <span className="text-emerald-400">{lastTxId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Timestamp:</span>
                    <span className="text-neutral-200">{new Date().toLocaleTimeString()}</span>
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-center gap-3">
                  <button
                    onClick={handleReset}
                    className="px-4 py-2 rounded-xl bg-emerald-500 text-xs font-semibold text-neutral-950 hover:bg-emerald-400"
                  >
                    Execute Another Transfer
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Col: Transfer Limits & Regulatory Guardrails */}
          <div className="space-y-6">
            <div className="p-5 rounded-2xl border border-neutral-800 bg-neutral-900/50 space-y-3">
              <div className="text-xs font-semibold text-neutral-200">Daily Transfer Limits</div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-neutral-400">
                  <span>Daily Domestic Wire Cap</span>
                  <span className="font-mono text-neutral-200">$2,500,000</span>
                </div>
                <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-400 h-full w-[12%]" />
                </div>
                <div className="text-[10px] text-neutral-500 font-mono">
                  $2,200,000 remaining headroom today
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl border border-neutral-800 bg-neutral-900/50 space-y-3 text-xs">
              <div className="flex items-center gap-2 font-semibold text-neutral-200">
                <Clock className="w-4 h-4 text-cyan-400" />
                <span>Clearing Windows</span>
              </div>
              <div className="space-y-2 text-neutral-400 text-[11px] leading-relaxed">
                <div><strong>Fedwire:</strong> Monday – Friday 9:00 PM EST cutoff. Real-time gross settlement.</div>
                <div><strong>FedNow:</strong> Instant 24/7/365 participating institutions.</div>
                <div><strong>SWIFT MT103:</strong> Same-day value for European & Swiss market hours.</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Beneficiaries Directory Tab */}
      {activeTab === 'beneficiaries' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs text-neutral-400">
              Verified counterparties for instant low-latency settlement
            </div>
            <button
              onClick={() => setShowAddBenModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-500 text-xs font-semibold text-neutral-950 hover:bg-emerald-400 transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Verified Beneficiary</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {beneficiaries.map((ben) => (
              <div
                key={ben.id}
                className="p-5 rounded-2xl border border-neutral-800 bg-neutral-900/50 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-xs font-bold text-neutral-200 overflow-hidden shrink-0">
                        {ben.avatarUrl ? (
                          <img src={ben.avatarUrl} alt={ben.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                        ) : (
                          ben.initials
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-neutral-200">{ben.name}</div>
                        <div className="text-[10px] text-neutral-400">{ben.category}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => onDeleteBeneficiary(ben.id)}
                      className="text-neutral-500 hover:text-rose-400 p-1 transition-colors"
                      title="Delete Beneficiary"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-1.5 text-xs font-mono p-3 rounded-xl bg-neutral-950 border border-neutral-850">
                    <div className="flex justify-between text-neutral-400 text-[11px]">
                      <span>Bank:</span>
                      <span className="text-neutral-200">{ben.bankName}</span>
                    </div>
                    <div className="flex justify-between text-neutral-400 text-[11px]">
                      <span>Account:</span>
                      <span className="text-neutral-200">{ben.accountNumber}</span>
                    </div>
                    <div className="flex justify-between text-neutral-400 text-[11px]">
                      <span>Routing / ABA:</span>
                      <span className="text-neutral-200">{ben.routingNumber}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-neutral-800/80 flex items-center justify-between">
                  <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                    <UserCheck className="w-3 h-3" /> KYC Verified
                  </span>
                  <button
                    onClick={() => {
                      setSelectedBenId(ben.id);
                      setActiveTab('send');
                      setStep('form');
                    }}
                    className="text-xs text-neutral-200 hover:text-emerald-400 font-medium flex items-center gap-1"
                  >
                    <span>Send Funds</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Beneficiary Modal */}
      {showAddBenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl">
            <h3 className="text-sm font-semibold text-neutral-100 mb-1">Add Verified Payee / Counterparty</h3>
            <p className="text-xs text-neutral-400 mb-4">Input routing coordinates for direct Federal Reserve clearance</p>

            <form onSubmit={handleCreateBeneficiary} className="space-y-4 text-xs">
              <div>
                <label className="block text-neutral-300 mb-1">Entity or Individual Name</label>
                <input
                  type="text"
                  required
                  value={newBenName}
                  onChange={(e) => setNewBenName(e.target.value)}
                  placeholder="e.g. Cambridge Wealth Syndicate LLC"
                  className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-200"
                />
              </div>

              <div>
                <label className="block text-neutral-300 mb-1">Email / Notification Notice</label>
                <input
                  type="email"
                  value={newBenEmail}
                  onChange={(e) => setNewBenEmail(e.target.value)}
                  placeholder="treasury@counterparty.com"
                  className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-200"
                />
              </div>

              <div>
                <label className="block text-neutral-300 mb-1">Beneficiary Bank Name</label>
                <input
                  type="text"
                  required
                  value={newBenBank}
                  onChange={(e) => setNewBenBank(e.target.value)}
                  placeholder="e.g. Goldman Sachs Bank USA"
                  className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-300 mb-1">Account Number</label>
                  <input
                    type="text"
                    required
                    value={newBenAccount}
                    onChange={(e) => setNewBenAccount(e.target.value)}
                    placeholder="99401829"
                    className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-neutral-300 mb-1">Routing / ABA</label>
                  <input
                    type="text"
                    required
                    value={newBenRouting}
                    onChange={(e) => setNewBenRouting(e.target.value)}
                    placeholder="021000021"
                    className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-200 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-neutral-300 mb-1">Category Classification</label>
                <select
                  value={newBenCategory}
                  onChange={(e) => setNewBenCategory(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-200"
                >
                  <option value="Business">Corporate / Venture</option>
                  <option value="Personal">Personal Trust</option>
                  <option value="Family Office">Family Office</option>
                  <option value="Real Estate">Real Estate Title</option>
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddBenModal(false)}
                  className="px-4 py-2 rounded-lg text-neutral-400 hover:text-neutral-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-500 text-neutral-950 font-semibold hover:bg-emerald-400"
                >
                  Save Counterparty
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
