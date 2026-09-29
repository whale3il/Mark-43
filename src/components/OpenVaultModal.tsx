import React, { useState } from 'react';
import { X, Landmark, Plus, Shield } from 'lucide-react';
import { BankAccount, CurrencyCode } from '../types/banking';

interface OpenVaultModalProps {
  onClose: () => void;
  onCreateAccount: (account: BankAccount) => void;
}

export const OpenVaultModal: React.FC<OpenVaultModalProps> = ({ onClose, onCreateAccount }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<'savings' | 'investment' | 'multicurrency'>('savings');
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [initialDeposit, setInitialDeposit] = useState('50000');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    const last4 = Math.floor(1000 + Math.random() * 9000).toString();
    const newAcc: BankAccount = {
      id: `acc-${Date.now()}`,
      name,
      type,
      accountNumber: `8940 1192 ${last4}`,
      routingNumber: '021000089',
      balance: parseFloat(initialDeposit) || 0,
      availableBalance: parseFloat(initialDeposit) || 0,
      currency,
      interestRate: type === 'savings' ? 4.85 : undefined,
      colorTheme: 'emerald'
    };

    onCreateAccount(newAcc);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 uppercase mb-2">
          <Landmark className="w-4 h-4" />
          <span>New Segregated Account</span>
        </div>

        <h3 className="text-base font-bold text-neutral-100 mb-1">Open Private Vault</h3>
        <p className="text-xs text-neutral-400 mb-4">
          Instant provisioning with dedicated sub-ledger and independent clearing coordinates
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-neutral-300 mb-1 font-medium">Vault Title / Designation</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Q4 Capital Gains Tax Reserve"
              className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-200"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-neutral-300 mb-1 font-medium">Account Category</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-200"
              >
                <option value="savings">High-Yield Vault (4.85% APY)</option>
                <option value="investment">Angel & Syndicate Escrow</option>
                <option value="multicurrency">Zurich Multi-Currency</option>
              </select>
            </div>

            <div>
              <label className="block text-neutral-300 mb-1 font-medium">Base Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-200 font-mono"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="CHF">CHF (Fr)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-neutral-300 mb-1 font-medium">Initial Sweep Allocation (USD)</label>
            <input
              type="number"
              value={initialDeposit}
              onChange={(e) => setInitialDeposit(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-200 font-mono"
            />
          </div>

          <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-850 flex items-start gap-2 text-neutral-400 text-[11px] leading-relaxed">
            <Shield className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              FDIC insured up to $25,000,000 via reciprocal intraFi deposit network.
            </span>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-neutral-400 hover:text-neutral-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-emerald-500 text-neutral-950 font-semibold hover:bg-emerald-400 transition-colors"
            >
              Authorize & Provision
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
