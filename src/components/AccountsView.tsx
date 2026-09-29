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
  theme?: 'dark' | 'light';
}

export const AccountsView: React.FC<AccountsViewProps> = ({
  accounts,
  transactions,
  maskBalance,
  currency,
  onOpenTransfer,
  onOpenNewVaultModal,
  onSelectTransaction,
  theme = 'dark'
}) => {
  const isLight = theme === 'light';
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
          <h1 className={`text-xl font-bold tracking-tight font-sans ${isLight ? 'text-slate-900' : 'text-neutral-100'}`}>
            Accounts & Structured Vaults
          </h1>
          <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-neutral-400'}`}>
            Multi-currency treasury accounts with FDIC & FINMA segregation
          </p>
        </div>

        <button
          onClick={onOpenNewVaultModal}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-colors ${
            isLight
              ? 'bg-white border border-slate-200 text-slate-800 hover:bg-slate-50 shadow-xs'
              : 'bg-neutral-900 border border-neutral-800 text-neutral-200 hover:bg-neutral-850 hover:text-white'
          }`}
        >
          <Plus className="w-3.5 h-3.5 text-emerald-500" />
          <span>Open Structured Vault</span>
        </button>
      </div>

      {/* Account Selector Tabs / Cards - Small Boxes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {accounts.map((acc) => {
          const isSelected = acc.id === selectedAccountId;
          return (
            <button
              key={acc.id}
              onClick={() => setSelectedAccountId(acc.id)}
              className={`p-4 rounded-xl border text-left transition-all relative ${
                isSelected
                  ? isLight
                    ? 'border-emerald-600 bg-emerald-50/50 shadow-sm ring-1 ring-emerald-500/20'
                    : 'border-emerald-500/50 bg-neutral-900/90 shadow-md ring-1 ring-emerald-500/20'
                  : isLight
                  ? 'border-slate-200 bg-white hover:bg-slate-50/60 hover:border-slate-300 shadow-xs'
                  : 'border-neutral-800/80 bg-neutral-900/40 hover:bg-neutral-900/70 hover:border-neutral-700'
              }`}
            >
              <div className={`flex items-center justify-between text-xs mb-2 ${isLight ? 'text-slate-500' : 'text-neutral-400'}`}>
                <span className="font-mono uppercase text-[10px]">{acc.type}</span>
                {acc.interestRate && (
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                    isLight ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  }`}>
                    {acc.interestRate}% APY
                  </span>
                )}
              </div>
              <div className={`text-xs font-semibold truncate ${isLight ? 'text-slate-800' : 'text-neutral-200'}`}>
                {acc.name}
              </div>
              <div className={`mt-2 text-lg font-bold font-sans tabular-nums ${isLight ? 'text-slate-900' : 'text-neutral-100'}`}>
                {formatAmount(acc.balance, acc.currency)}
              </div>
              <div className={`mt-2 text-[10px] font-mono ${isLight ? 'text-slate-400' : 'text-neutral-500'}`}>
                •••• {acc.accountNumber.slice(-4)}
              </div>
            </button>
          );
        })}
      </div>

      {/* Detailed Vault Overview Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Account Specification & Wire Instructions */}
        <div className={`lg:col-span-2 rounded-2xl border p-6 space-y-6 ${
          isLight ? 'border-slate-200 bg-white shadow-xs' : 'border-neutral-800 bg-neutral-900/50'
        }`}>
          <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b ${
            isLight ? 'border-slate-100' : 'border-neutral-800'
          }`}>
            <div>
              <div className="text-xs font-mono text-emerald-600 dark:text-emerald-400 uppercase tracking-wider font-semibold">
                Active Vault Inspection
              </div>
              <h2 className={`text-lg font-bold mt-1 ${isLight ? 'text-slate-900' : 'text-neutral-100'}`}>
                {selectedAccount.name}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenTransfer}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-500 text-neutral-950 font-medium text-xs hover:bg-emerald-400 transition-colors shadow-sm"
              >
                Transfer from this Vault
              </button>
            </div>
          </div>

          {/* Wire & Account Coordinates Grid */}
          <div>
            <div className={`text-xs font-semibold mb-3 ${isLight ? 'text-slate-700' : 'text-neutral-300'}`}>
              Official Wire & Clearing Coordinates
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className={`p-3 rounded-xl border flex items-center justify-between ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-neutral-950/70 border-neutral-800/80'
              }`}>
                <div>
                  <div className={`text-[10px] font-mono uppercase ${isLight ? 'text-slate-500' : 'text-neutral-500'}`}>Account Number</div>
                  <div className={`font-mono mt-0.5 ${isLight ? 'text-slate-900 font-semibold' : 'text-neutral-200'}`}>{selectedAccount.accountNumber}</div>
                </div>
                <button
                  onClick={() => copyField(selectedAccount.accountNumber, 'acc-num')}
                  className={`p-1.5 transition-colors ${isLight ? 'text-slate-400 hover:text-slate-700' : 'text-neutral-400 hover:text-neutral-200'}`}
                >
                  {copiedKey === 'acc-num' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className={`p-3 rounded-xl border flex items-center justify-between ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-neutral-950/70 border-neutral-800/80'
              }`}>
                <div>
                  <div className={`text-[10px] font-mono uppercase ${isLight ? 'text-slate-500' : 'text-neutral-500'}`}>Routing / ABA (Fedwire)</div>
                  <div className={`font-mono mt-0.5 ${isLight ? 'text-slate-900 font-semibold' : 'text-neutral-200'}`}>{selectedAccount.routingNumber}</div>
                </div>
                <button
                  onClick={() => copyField(selectedAccount.routingNumber, 'rout-num')}
                  className={`p-1.5 transition-colors ${isLight ? 'text-slate-400 hover:text-slate-700' : 'text-neutral-400 hover:text-neutral-200'}`}
                >
                  {copiedKey === 'rout-num' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              {selectedAccount.iban && (
                <div className={`p-3 rounded-xl border flex items-center justify-between ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-neutral-950/70 border-neutral-800/80'
                }`}>
                  <div>
                    <div className={`text-[10px] font-mono uppercase ${isLight ? 'text-slate-500' : 'text-neutral-500'}`}>International IBAN</div>
                    <div className={`font-mono mt-0.5 ${isLight ? 'text-slate-900 font-semibold' : 'text-neutral-200'}`}>{selectedAccount.iban}</div>
                  </div>
                  <button
                    onClick={() => copyField(selectedAccount.iban!, 'iban')}
                    className={`p-1.5 transition-colors ${isLight ? 'text-slate-400 hover:text-slate-700' : 'text-neutral-400 hover:text-neutral-200'}`}
                  >
                    {copiedKey === 'iban' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              )}

              {selectedAccount.swiftBic && (
                <div className={`p-3 rounded-xl border flex items-center justify-between ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-neutral-950/70 border-neutral-800/80'
                }`}>
                  <div>
                    <div className={`text-[10px] font-mono uppercase ${isLight ? 'text-slate-500' : 'text-neutral-500'}`}>SWIFT / BIC Code</div>
                    <div className={`font-mono mt-0.5 ${isLight ? 'text-slate-900 font-semibold' : 'text-neutral-200'}`}>{selectedAccount.swiftBic}</div>
                  </div>
                  <button
                    onClick={() => copyField(selectedAccount.swiftBic!, 'swift')}
                    className={`p-1.5 transition-colors ${isLight ? 'text-slate-400 hover:text-slate-700' : 'text-neutral-400 hover:text-neutral-200'}`}
                  >
                    {copiedKey === 'swift' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              )}

              <div className={`p-3 rounded-xl border flex items-center justify-between ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-neutral-950/70 border-neutral-800/80'
              }`}>
                <div>
                  <div className={`text-[10px] font-mono uppercase ${isLight ? 'text-slate-500' : 'text-neutral-500'}`}>Beneficiary Bank</div>
                  <div className={`font-mono mt-0.5 ${isLight ? 'text-slate-900 font-semibold' : 'text-neutral-200'}`}>Aureus Private Bank NA</div>
                </div>
              </div>

              <div className={`p-3 rounded-xl border flex items-center justify-between ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-neutral-950/70 border-neutral-800/80'
              }`}>
                <div>
                  <div className={`text-[10px] font-mono uppercase ${isLight ? 'text-slate-500' : 'text-neutral-500'}`}>Bank Address</div>
                  <div className={`font-mono mt-0.5 ${isLight ? 'text-slate-900 font-semibold' : 'text-neutral-200'}`}>540 Madison Ave, New York, NY</div>
                </div>
              </div>
            </div>
          </div>

          {/* Account Ledger History */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className={`text-xs font-semibold ${isLight ? 'text-slate-700' : 'text-neutral-300'}`}>Vault Activity</div>
              <span className={`text-[11px] font-mono ${isLight ? 'text-slate-500' : 'text-neutral-500'}`}>{accountTransactions.length} records</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className={`border-b font-mono uppercase text-[10px] ${
                    isLight ? 'border-slate-100 text-slate-400' : 'border-neutral-800/80 text-neutral-500'
                  }`}>
                    <th className="pb-2 font-medium">Description</th>
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium text-right">Amount</th>
                    <th className="pb-2 font-medium text-right">Status</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isLight ? 'divide-slate-100' : 'divide-neutral-800/40'}`}>
                  {accountTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={4} className={`py-6 text-center ${isLight ? 'text-slate-400' : 'text-neutral-500'}`}>
                        No transactions recorded for this vault yet.
                      </td>
                    </tr>
                  ) : (
                    accountTransactions.map((tx) => (
                      <tr
                        key={tx.id}
                        onClick={() => onSelectTransaction(tx)}
                        className={`cursor-pointer transition-colors ${
                          isLight ? 'hover:bg-slate-50' : 'hover:bg-neutral-850/50'
                        }`}
                      >
                        <td className={`py-2.5 pr-3 font-medium ${isLight ? 'text-slate-800' : 'text-neutral-200'}`}>{tx.merchant}</td>
                        <td className={`py-2.5 pr-3 font-mono text-[11px] ${isLight ? 'text-slate-500' : 'text-neutral-400'}`}>{tx.date}</td>
                        <td className="py-2.5 pr-3 text-right font-mono font-medium tabular-nums">
                          <span className={tx.amount > 0 ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : isLight ? 'text-slate-900 font-medium' : 'text-neutral-200'}>
                            {tx.amount > 0 ? '+' : ''}{formatAmount(tx.amount, tx.currency)}
                          </span>
                        </td>
                        <td className={`py-2.5 text-right font-mono text-[10px] capitalize ${isLight ? 'text-slate-500' : 'text-neutral-400'}`}>
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
          {/* THE SMALL BOX DISPLAYING TOTAL MONEY (BALANCE BREAKDOWN) */}
          <div className={`p-5 rounded-2xl border space-y-4 ${
            isLight ? 'border-slate-200 bg-white shadow-xs text-slate-900' : 'border-neutral-800 bg-neutral-900/80 text-neutral-100'
          }`}>
            <div className={`text-xs font-semibold ${isLight ? 'text-slate-900' : 'text-neutral-200'}`}>
              Balance Breakdown
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className={isLight ? 'text-slate-500' : 'text-neutral-400'}>Total Book Balance</span>
                <span className={`font-mono font-bold tabular-nums ${isLight ? 'text-slate-900' : 'text-neutral-100'}`}>
                  {formatAmount(selectedAccount.balance, selectedAccount.currency)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className={isLight ? 'text-slate-500' : 'text-neutral-400'}>Available Immediately</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold tabular-nums">
                  {formatAmount(selectedAccount.availableBalance, selectedAccount.currency)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className={isLight ? 'text-slate-500' : 'text-neutral-400'}>Pending Holds</span>
                <span className={`font-mono tabular-nums ${isLight ? 'text-slate-500' : 'text-neutral-400'}`}>
                  {formatAmount(selectedAccount.balance - selectedAccount.availableBalance, selectedAccount.currency)}
                </span>
              </div>
              {selectedAccount.interestRate && (
                <div className={`flex items-center justify-between text-xs pt-2 border-t ${isLight ? 'border-slate-100' : 'border-neutral-800'}`}>
                  <span className={isLight ? 'text-slate-500' : 'text-neutral-400'}>Effective Annual Yield</span>
                  <span className="font-mono text-cyan-600 dark:text-cyan-400 font-semibold">{selectedAccount.interestRate}% APY</span>
                </div>
              )}
            </div>
          </div>

          <div className={`p-5 rounded-2xl border space-y-3 text-xs ${
            isLight ? 'border-slate-200 bg-white shadow-xs text-slate-700' : 'border-neutral-800 bg-neutral-900/50 text-neutral-200'
          }`}>
            <div className={`flex items-center gap-2 font-semibold ${isLight ? 'text-slate-900' : 'text-neutral-200'}`}>
              <Shield className="w-4 h-4 text-emerald-500" />
              <span>Custodial Protections</span>
            </div>
            <p className={`leading-relaxed text-[11px] ${isLight ? 'text-slate-500' : 'text-neutral-400'}`}>
              Deposits are held in segregated master accounts with primary clearing through BNY Mellon and custody insurance up to $25,000,000 through Lloyd&apos;s of London syndicates.
            </p>
            <div className={`pt-2 text-[10px] font-mono ${isLight ? 'text-slate-400' : 'text-neutral-500'}`}>
              REGULATORY ID: SEC-CRD #884920 · FINMA CH-491
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
