import React, { useState } from 'react';
import {
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
  Copy,
  Check,
  CreditCard,
  Send,
  Calendar,
  Sparkles,
  Search,
  Filter,
  ArrowRight,
  Shield,
  Plane,
  Coffee,
  Wallet,
  Server,
  Briefcase,
  ShoppingBag,
  Laptop
} from 'lucide-react';
import { BankAccount, Transaction, BillPayment, CurrencyCode } from '../types/banking';
import { CASHFLOW_CHART_DATA } from '../data/mockData';

interface DashboardViewProps {
  accounts: BankAccount[];
  transactions: Transaction[];
  bills: BillPayment[];
  maskBalance: boolean;
  currency: CurrencyCode;
  onOpenTransfer: () => void;
  onSelectTransaction: (tx: Transaction) => void;
  onNavigateTab: (tab: any) => void;
  onPayBillQuick: (billId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  accounts,
  transactions,
  bills,
  maskBalance,
  currency,
  onOpenTransfer,
  onSelectTransaction,
  onNavigateTab,
  onPayBillQuick
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [txFilter, setTxFilter] = useState<'all' | 'inflow' | 'outflow'>('all');
  const [activeChartMonth, setActiveChartMonth] = useState<number | null>(4); // August index default

  // Calculate Net Worth
  const totalNetWorth = accounts.reduce((acc, a) => acc + a.balance, 0);
  const liquidChecking = accounts.find(a => a.type === 'checking')?.balance || 0;
  const yieldVault = accounts.find(a => a.type === 'savings')?.balance || 0;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const formatAmount = (num: number, cur: CurrencyCode = 'USD') => {
    if (maskBalance) return '••••••';
    const symbol = cur === 'EUR' ? '€' : cur === 'GBP' ? '£' : cur === 'CHF' ? 'CHF ' : cur === 'NGN' ? '₦' : '$';
    return `${symbol}${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Filter transactions
  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch =
      tx.merchant.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (txFilter === 'inflow') return tx.amount > 0;
    if (txFilter === 'outflow') return tx.amount < 0;
    return true;
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Travel & Flights': return <Plane className="w-4 h-4 text-sky-400" />;
      case 'Dining & Hospitality': return <Coffee className="w-4 h-4 text-amber-400" />;
      case 'Income & Dividends': return <Wallet className="w-4 h-4 text-emerald-400" />;
      case 'Tech & Cloud': return <Server className="w-4 h-4 text-purple-400" />;
      case 'Investments': return <Briefcase className="w-4 h-4 text-indigo-400" />;
      case 'Luxury & Retail': return <ShoppingBag className="w-4 h-4 text-rose-400" />;
      case 'Transfers': return <ArrowRight className="w-4 h-4 text-neutral-400" />;
      default: return <Laptop className="w-4 h-4 text-neutral-400" />;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner: Total Portfolio Net Worth & Quick KPI strip */}
      <div className="rounded-2xl border border-neutral-800 bg-gradient-to-b from-neutral-900/90 to-neutral-950 p-6 md:p-8 backdrop-blur-md relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-neutral-400 uppercase tracking-wider">
              <span>Consolidated Private Net Worth</span>
              <span className="text-neutral-600">·</span>
              <span className="text-emerald-400 flex items-center gap-1 font-sans">
                <TrendingUp className="w-3.5 h-3.5" /> +2.84% MTD
              </span>
            </div>

            <div className="mt-2 text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-neutral-100 font-sans tabular-nums">
              {formatAmount(totalNetWorth, currency)}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-neutral-400">
              <div>
                <span>Liquid Operating: </span>
                <span className="font-mono text-neutral-200 tabular-nums">{formatAmount(liquidChecking, currency)}</span>
              </div>
              <span className="text-neutral-700">·</span>
              <div>
                <span>High-Yield Treasury Reserve: </span>
                <span className="font-mono text-emerald-400 tabular-nums">{formatAmount(yieldVault, currency)} (4.85% APY)</span>
              </div>
            </div>
          </div>

          {/* Quick Action Matrix */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onOpenTransfer}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 text-neutral-950 text-xs font-semibold hover:bg-emerald-400 transition-colors shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Wire Transfer</span>
            </button>
            <button
              onClick={() => onNavigateTab('cards')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-200 text-xs font-medium hover:bg-neutral-850 hover:text-white transition-colors"
            >
              <CreditCard className="w-3.5 h-3.5 text-neutral-400" />
              <span>Card Controls</span>
            </button>
            <button
              onClick={() => onNavigateTab('bills')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-200 text-xs font-medium hover:bg-neutral-850 hover:text-white transition-colors"
            >
              <Calendar className="w-3.5 h-3.5 text-neutral-400" />
              <span>Schedule Bill</span>
            </button>
          </div>
        </div>
      </div>

      {/* Account Cards Carousel Grid */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-sm font-semibold text-neutral-200 tracking-tight">Active Accounts & Vaults</h2>
          <button
            onClick={() => onNavigateTab('accounts')}
            className="text-xs text-neutral-400 hover:text-emerald-400 transition-colors flex items-center gap-1"
          >
            Manage All Accounts <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {accounts.map((acc) => (
            <div
              key={acc.id}
              className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/60 hover:border-neutral-700/80 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between text-xs text-neutral-400">
                  <span className="truncate max-w-[150px] font-medium text-neutral-300">{acc.name}</span>
                  {acc.interestRate && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {acc.interestRate}% APY
                    </span>
                  )}
                </div>

                <div className="mt-3 text-xl font-bold tracking-tight text-neutral-100 font-sans tabular-nums">
                  {formatAmount(acc.balance, acc.currency)}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-neutral-800/80 flex items-center justify-between text-xs text-neutral-500 font-mono">
                <span>•• {acc.accountNumber.slice(-4)}</span>
                <button
                  onClick={() => copyToClipboard(acc.accountNumber, acc.id)}
                  className="flex items-center gap-1 text-[11px] text-neutral-400 hover:text-neutral-200 transition-colors"
                  title="Copy Account Number"
                >
                  {copiedId === acc.id ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400 text-[10px]">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2-Column Section: Financial Cashflow Chart & Upcoming Bills + Smart Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Cashflow & Net Worth Chart */}
        <div className="lg:col-span-2 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-800/80">
              <div>
                <div className="text-sm font-semibold text-neutral-100">Monthly Cash Inflow vs Outflow</div>
                <div className="text-xs text-neutral-400 mt-0.5">6-month treasury liquidity movements</div>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> Inflow
                </span>
                <span className="flex items-center gap-1.5 text-neutral-400">
                  <span className="w-2.5 h-2.5 rounded-sm bg-neutral-600 inline-block" /> Outflow
                </span>
              </div>
            </div>

            {/* Interactive SVG / Bar visualization */}
            <div className="mt-6 h-56 flex items-end justify-between gap-3 pt-4 px-2">
              {CASHFLOW_CHART_DATA.map((item, idx) => {
                const maxVal = 150000;
                const incomeHeight = Math.min(100, Math.round((item.income / maxVal) * 100));
                const spendHeight = Math.min(100, Math.round((item.spend / maxVal) * 100));
                const isSelected = activeChartMonth === idx;

                return (
                  <div
                    key={item.month}
                    onClick={() => setActiveChartMonth(idx)}
                    className="flex-1 flex flex-col items-center gap-2 group cursor-pointer"
                  >
                    {/* Hover Value Badge */}
                    <div
                      className={`text-[10px] font-mono transition-opacity ${
                        isSelected ? 'opacity-100 text-emerald-400 font-semibold' : 'opacity-0 group-hover:opacity-100 text-neutral-400'
                      }`}
                    >
                      +${(item.net / 1000).toFixed(0)}k
                    </div>

                    {/* Bars Container */}
                    <div className="w-full flex items-end justify-center gap-1.5 h-40">
                      {/* Inflow Bar */}
                      <div
                        style={{ height: `${incomeHeight}%` }}
                        className={`w-3.5 sm:w-5 rounded-t-md transition-all ${
                          isSelected ? 'bg-emerald-400 shadow-lg shadow-emerald-950' : 'bg-emerald-500/80 group-hover:bg-emerald-400'
                        }`}
                        title={`Inflow: $${item.income.toLocaleString()}`}
                      />
                      {/* Outflow Bar */}
                      <div
                        style={{ height: `${spendHeight}%` }}
                        className={`w-3.5 sm:w-5 rounded-t-md transition-all ${
                          isSelected ? 'bg-neutral-500' : 'bg-neutral-700 group-hover:bg-neutral-600'
                        }`}
                        title={`Outflow: $${item.spend.toLocaleString()}`}
                      />
                    </div>

                    <div className={`text-xs font-mono transition-colors ${isSelected ? 'text-neutral-100 font-bold' : 'text-neutral-500'}`}>
                      {item.month}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Month Detail Strip */}
          {activeChartMonth !== null && (
            <div className="mt-4 p-3 rounded-xl bg-neutral-950/70 border border-neutral-800 flex items-center justify-between text-xs">
              <span className="text-neutral-400">
                Selected: <strong className="text-neutral-200">{CASHFLOW_CHART_DATA[activeChartMonth].month}</strong>
              </span>
              <div className="flex items-center gap-4 font-mono tabular-nums">
                <span className="text-emerald-400">
                  Inflow: ${CASHFLOW_CHART_DATA[activeChartMonth].income.toLocaleString()}
                </span>
                <span className="text-neutral-400">
                  Outflow: ${CASHFLOW_CHART_DATA[activeChartMonth].spend.toLocaleString()}
                </span>
                <span className="text-neutral-200">
                  Net Delta: +${CASHFLOW_CHART_DATA[activeChartMonth].net.toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right Col: Upcoming Payments & Private Wealth Insight */}
        <div className="space-y-6">
          {/* Upcoming Payments */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-semibold text-neutral-200">Upcoming Payments</div>
              <button
                onClick={() => onNavigateTab('bills')}
                className="text-[11px] text-neutral-400 hover:text-emerald-400 transition-colors"
              >
                View all
              </button>
            </div>

            <div className="space-y-2.5">
              {bills.slice(0, 3).map((bill) => (
                <div
                  key={bill.id}
                  className="p-2.5 rounded-lg border border-neutral-800/80 bg-neutral-900/60 flex items-center justify-between text-xs"
                >
                  <div className="truncate mr-2">
                    <div className="font-medium text-neutral-200 truncate">{bill.billerName}</div>
                    <div className="text-[10px] text-neutral-500 font-mono">Due {bill.dueDate}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono text-neutral-200 tabular-nums">
                      {formatAmount(bill.amount, currency)}
                    </div>
                    <button
                      onClick={() => onPayBillQuick(bill.id)}
                      className="mt-1 text-[10px] text-emerald-400 hover:text-emerald-300 font-medium"
                    >
                      Pay Now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Smart Insights & Yield Optimization Card */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 relative overflow-hidden">
            <div className="flex items-center gap-2 text-xs font-medium text-emerald-400 mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Treasury Yield Optimization</span>
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed">
              Your checking account currently holds $284,520. Sweeping $80,000 into the 4.85% APY Treasury Vault will generate approximately <strong>+$323.33/month</strong> in risk-free yield.
            </p>
            <button
              onClick={onOpenTransfer}
              className="mt-3 inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-medium"
            >
              <span>Execute Yield Sweep</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Recent Activity Table with Filters & Search */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800/80">
          <div>
            <h2 className="text-sm font-semibold text-neutral-100">Recent Transactions & Ledger</h2>
            <p className="text-xs text-neutral-400 mt-0.5">Real-time settled and pending debits</p>
          </div>

          {/* Search & Filter Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search transactions..."
                className="pl-8 pr-3 py-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-neutral-700 w-44 sm:w-56"
              />
            </div>

            <div className="flex items-center p-0.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs">
              <button
                onClick={() => setTxFilter('all')}
                className={`px-2.5 py-1 rounded text-xs transition-colors ${
                  txFilter === 'all' ? 'bg-neutral-800 text-neutral-100 font-medium' : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setTxFilter('inflow')}
                className={`px-2.5 py-1 rounded text-xs transition-colors ${
                  txFilter === 'inflow' ? 'bg-neutral-800 text-emerald-400 font-medium' : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Inflow
              </button>
              <button
                onClick={() => setTxFilter('outflow')}
                className={`px-2.5 py-1 rounded text-xs transition-colors ${
                  txFilter === 'outflow' ? 'bg-neutral-800 text-neutral-100 font-medium' : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Outflow
              </button>
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-800/80 text-neutral-500 font-mono uppercase text-[10px] tracking-wider">
                <th className="pb-3 font-medium">Merchant / Destination</th>
                <th className="pb-3 font-medium">Category</th>
                <th className="pb-3 font-medium">Payment Method</th>
                <th className="pb-3 font-medium">Date & Time</th>
                <th className="pb-3 font-medium text-right">Amount</th>
                <th className="pb-3 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/50">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-neutral-500">
                    No transactions match the selected filter criteria.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
                  const isInflow = tx.amount > 0;
                  return (
                    <tr
                      key={tx.id}
                      onClick={() => onSelectTransaction(tx)}
                      className="hover:bg-neutral-850/50 cursor-pointer transition-colors group"
                    >
                      <td className="py-3.5 pr-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-neutral-950 border border-neutral-800 group-hover:border-neutral-700 transition-colors shrink-0">
                            {getCategoryIcon(tx.category)}
                          </div>
                          <div>
                            <div className="font-medium text-neutral-200 group-hover:text-emerald-400 transition-colors">
                              {tx.merchant}
                            </div>
                            <div className="text-[10px] text-neutral-500 font-mono">{tx.referenceNumber}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 pr-4 text-neutral-400 whitespace-nowrap">{tx.category}</td>
                      <td className="py-3.5 pr-4 text-neutral-400 font-mono text-[11px] whitespace-nowrap">
                        {tx.paymentMethod}
                      </td>
                      <td className="py-3.5 pr-4 text-neutral-400 font-mono text-[11px] whitespace-nowrap">
                        {tx.date} <span className="text-neutral-600">·</span> {tx.time}
                      </td>
                      <td className="py-3.5 pr-4 text-right font-mono font-medium whitespace-nowrap tabular-nums">
                        <span className={isInflow ? 'text-emerald-400' : 'text-neutral-200'}>
                          {isInflow ? '+' : ''}{formatAmount(tx.amount, tx.currency)}
                        </span>
                      </td>
                      <td className="py-3.5 text-right whitespace-nowrap">
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded capitalize ${
                            tx.status === 'settled'
                              ? 'bg-neutral-900 text-neutral-400 border border-neutral-800'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
