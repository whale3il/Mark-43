import React, { useState } from 'react';
import {
  Landmark,
  Plus,
  Copy,
  Check,
  ArrowUpRight,
  ArrowDownLeft,
  Sparkles,
  Download,
  Info,
  Shield,
  Layers,
  ExternalLink
} from 'lucide-react';
import { BankAccount, Transaction, CurrencyCode } from '../types/banking';

interface AccountsViewProps {
  accounts: BankAccount[];
  transactions: Transaction[];
  maskBalance: boolean;
  currency: CurrencyCode;
  onOpenTransfer: () => void;
  onOpenNewVaultModal: () => void;
  onSelectTransaction: (tx: Transaction) => void;
}

export const AccountsView: React.FC<AccountsViewProps> = ({
  accounts,
  transactions,
  maskBalance,
  currency,
  onOpenTransfer,
  onOpenNewVaultModal,
  onSelectTransaction
}) => {
  const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0].id);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId) || accounts[0];
  const accountTransactions = transactions.filter((t) => t.accountId === selectedAccount.id);

  const copyField = (val: string, key: string) => {
    navigator.clipboard.writeText(val);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const formatAmount = (num: number, cur: CurrencyCode = 'USD') => {
    if (maskBalance) return '••••••';
    const symbol = cur === 'EUR' ? '€' : cur === 'GBP' ? '£' : cur === 'CHF' ? 'CHF ' : cur === 'NGN' ? '₦' : '$';
    return `${symbol}${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header and New Account Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-100 font-sans">
            Accounts & Structured Vaults
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Multi-currency treasury accounts with FDIC & FINMA segregation
          </p>
        </div>

        <button
          onClick={onOpenNewVaultModal}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-medium text-neutral-200 hover:bg-neutral-850 hover:text-white transition-colors"
        >
          <Plus className="w-3.5 h-3.5 text-emerald-400" />
          <span>Open Structured Vault</span>
        </button>
      </div>

      {/* Account Selector Tabs / Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {accounts.map((acc) => {
          const isSelected = acc.id === selectedAccountId;
          return (
            <button
              key={acc.id}
              onClick={() => setSelectedAccountId(acc.id)}
              className={`p-4 rounded-xl border text-left transition-all relative ${
                isSelected
                  ? 'border-emerald-500/50 bg-neutral-900/90 shadow-md ring-1 ring-emerald-500/20'
                  : 'border-neutral-800/80 bg-neutral-900/40 hover:bg-neutral-900/70 hover:border-neutral-700'
              }`}
            >
              <div className="flex items-center justify-between text-xs text-neutral-400 mb-2">
                <span className="font-mono uppercase text-[10px]">{acc.type}</span>
                {acc.interestRate && (
                  <span className="text-[10px] font-mono text-emerald-400">
                    {acc.interestRate}% APY
                  </span>
                )}
              </div>
              <div className="text-xs font-semibold text-neutral-200 truncate">{acc.name}</div>
              <div className="mt-2 text-lg font-bold font-sans text-neutral-100 tabular-nums">
                {formatAmount(acc.balance, acc.currency)}
              </div>
              <div className="mt-2 text-[10px] font-mono text-neutral-500">
                •••• {acc.accountNumber.slice(-4)}
              </div>
            </button>
          );
        })}
      </div>

      {/* Detailed Vault Overview Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Account Specification & Wire Instructions */}
        <div className="lg:col-span-2 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
            <div>
              <div className="text-xs font-mono text-emerald-400 uppercase tracking-wider">
                Active Vault Inspection
              </div>
              <h2 className="text-lg font-bold text-neutral-100 mt-1">{selectedAccount.name}</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenTransfer}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-500 text-neutral-950 font-medium text-xs hover:bg-emerald-400 transition-colors"
              >
                Transfer from this Vault
              </button>
            </div>
          </div>

          {/* Wire & Account Coordinates Grid */}
          <div>
            <div className="text-xs font-semibold text-neutral-300 mb-3">
              Official Wire & Clearing Coordinates
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800/80 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-neutral-500 font-mono uppercase">Account Number</div>
                  <div className="font-mono text-neutral-200 mt-0.5">{selectedAccount.accountNumber}</div>
                </div>
                <button
                  onClick={() => copyField(selectedAccount.accountNumber, 'acc-num')}
                  className="p-1.5 text-neutral-400 hover:text-neutral-200"
                >
                  {copiedKey === 'acc-num' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800/80 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-neutral-500 font-mono uppercase">Routing / ABA (Fedwire)</div>
                  <div className="font-mono text-neutral-200 mt-0.5">{selectedAccount.routingNumber}</div>
                </div>
                <button
                  onClick={() => copyField(selectedAccount.routingNumber, 'rout-num')}
                  className="p-1.5 text-neutral-400 hover:text-neutral-200"
                >
                  {copiedKey === 'rout-num' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              {selectedAccount.iban && (
                <div className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800/80 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-neutral-500 font-mono uppercase">International IBAN</div>
                    <div className="font-mono text-neutral-200 mt-0.5">{selectedAccount.iban}</div>
                  </div>
                  <button
                    onClick={() => copyField(selectedAccount.iban!, 'iban')}
                    className="p-1.5 text-neutral-400 hover:text-neutral-200"
                  >
                    {copiedKey === 'iban' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              )}

              {selectedAccount.swiftBic && (
                <div className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800/80 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-neutral-500 font-mono uppercase">SWIFT / BIC Code</div>
                    <div className="font-mono text-neutral-200 mt-0.5">{selectedAccount.swiftBic}</div>
                  </div>
                  <button
                    onClick={() => copyField(selectedAccount.swiftBic!, 'swift')}
                    className="p-1.5 text-neutral-400 hover:text-neutral-200"
                  >
                    {copiedKey === 'swift' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              )}

              <div className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800/80 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-neutral-500 font-mono uppercase">Beneficiary Bank</div>
                  <div className="font-mono text-neutral-200 mt-0.5">Aureus Private Bank NA</div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800/80 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-neutral-500 font-mono uppercase">Bank Address</div>
                  <div className="font-mono text-neutral-200 mt-0.5">540 Madison Ave, New York, NY</div>
                </div>
              </div>
            </div>
          </div>

          {/* Account Ledger History */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-semibold text-neutral-300">Vault Activity</div>
              <span className="text-[11px] text-neutral-500 font-mono">{accountTransactions.length} records</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-neutral-800/80 text-neutral-500 font-mono uppercase text-[10px]">
                    <th className="pb-2 font-medium">Description</th>
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium text-right">Amount</th>
                    <th className="pb-2 font-medium text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/40">
                  {accountTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-neutral-500">
                        No transactions recorded for this vault yet.
                      </td>
                    </tr>
                  ) : (
                    accountTransactions.map((tx) => (
                      <tr
                        key={tx.id}
                        onClick={() => onSelectTransaction(tx)}
                        className="hover:bg-neutral-850/50 cursor-pointer transition-colors"
                      >
                        <td className="py-2.5 pr-3 text-neutral-200 font-medium">{tx.merchant}</td>
                        <td className="py-2.5 pr-3 text-neutral-400 font-mono text-[11px]">{tx.date}</td>
                        <td className="py-2.5 pr-3 text-right font-mono font-medium tabular-nums">
                          <span className={tx.amount > 0 ? 'text-emerald-400' : 'text-neutral-200'}>
                            {tx.amount > 0 ? '+' : ''}{formatAmount(tx.amount, tx.currency)}
                          </span>
                        </td>
                        <td className="py-2.5 text-right font-mono text-[10px] text-neutral-400 capitalize">
                          {tx.status}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Col: Vault Performance & Regulatory Protections */}
        <div className="space-y-6">
          <div className="p-5 rounded-2xl border border-neutral-800 bg-neutral-900/50 space-y-4">
            <div className="text-xs font-semibold text-neutral-200">Balance Breakdown</div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-400">Total Book Balance</span>
                <span className="font-mono text-neutral-200 tabular-nums">{formatAmount(selectedAccount.balance, selectedAccount.currency)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-400">Available Immediately</span>
                <span className="font-mono text-emerald-400 tabular-nums">{formatAmount(selectedAccount.availableBalance, selectedAccount.currency)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-400">Pending Holds</span>
                <span className="font-mono text-neutral-400 tabular-nums">
                  {formatAmount(selectedAccount.balance - selectedAccount.availableBalance, selectedAccount.currency)}
                </span>
              </div>
              {selectedAccount.interestRate && (
                <div className="flex items-center justify-between text-xs pt-2 border-t border-neutral-800">
                  <span className="text-neutral-400">Effective Annual Yield</span>
                  <span className="font-mono text-cyan-400">{selectedAccount.interestRate}% APY</span>
                </div>
              )}
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-neutral-800 bg-neutral-900/50 space-y-3 text-xs">
            <div className="flex items-center gap-2 text-neutral-200 font-semibold">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Custodial Protections</span>
            </div>
            <p className="text-neutral-400 leading-relaxed text-[11px]">
              Deposits are held in segregated master accounts with primary clearing through BNY Mellon and custody insurance up to $25,000,000 through Lloyd&apos;s of London syndicates.
            </p>
            <div className="pt-2 text-[10px] font-mono text-neutral-500">
              REGULATORY ID: SEC-CRD #884920 · FINMA CH-491
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
