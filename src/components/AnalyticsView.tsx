import React, { useState } from 'react';
import {
  PieChart,
  TrendingDown,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Layers,
  Sparkles,
  BarChart3
} from 'lucide-react';
import { Transaction, BudgetCategory, CurrencyCode } from '../types/banking';

interface AnalyticsViewProps {
  transactions: Transaction[];
  budgets: BudgetCategory[];
  currency: CurrencyCode;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  transactions,
  budgets,
  currency
}) => {
  const [timeRange, setTimeRange] = useState<'30d' | '90d' | 'ytd'>('30d');

  // Compute spend by category
  const categorySpendMap: Record<string, number> = {};
  let totalOutflow = 0;
  let totalInflow = 0;

  transactions.forEach((tx) => {
    if (tx.amount < 0) {
      const positiveAmt = Math.abs(tx.amount);
      totalOutflow += positiveAmt;
      categorySpendMap[tx.category] = (categorySpendMap[tx.category] || 0) + positiveAmt;
    } else {
      totalInflow += tx.amount;
    }
  });

  const categoriesSorted = Object.entries(categorySpendMap)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, amt]) => ({
      category: cat,
      amount: amt,
      percent: Math.round((amt / (totalOutflow || 1)) * 100)
    }));

  // Top merchants
  const merchantSpendMap: Record<string, { total: number; count: number; category: string }> = {};
  transactions
    .filter((t) => t.amount < 0)
    .forEach((tx) => {
      const amt = Math.abs(tx.amount);
      if (!merchantSpendMap[tx.merchant]) {
        merchantSpendMap[tx.merchant] = { total: amt, count: 1, category: tx.category };
      } else {
        merchantSpendMap[tx.merchant].total += amt;
        merchantSpendMap[tx.merchant].count += 1;
      }
    });

  const topMerchants = Object.entries(merchantSpendMap)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 5);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header & Date Range */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-100 font-sans">
            Treasury Analytics & Outflow Intelligence
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Algorithmic categorization and run-rate variance across private accounts
          </p>
        </div>

        <div className="flex items-center p-1 rounded-xl bg-neutral-900 border border-neutral-800 text-xs">
          {(['30d', '90d', 'ytd'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors uppercase font-mono ${
                timeRange === r
                  ? 'bg-neutral-800 text-neutral-100 shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {r === '30d' ? 'Last 30 Days' : r === '90d' ? 'Last 90 Days' : 'Year to Date'}
            </button>
          ))}
        </div>
      </div>

      {/* Top 3 KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl border border-neutral-800 bg-neutral-900/50">
          <div className="flex items-center justify-between text-xs text-neutral-400 mb-2">
            <span>Total Debits & Disbursements</span>
            <ArrowDownRight className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="text-2xl font-bold font-sans text-neutral-100 tabular-nums">
            ${totalOutflow.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-2 text-[11px] text-neutral-400 flex items-center gap-1 font-mono">
            <span className="text-emerald-400">-4.2%</span> vs trailing 30-day run rate
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-neutral-800 bg-neutral-900/50">
          <div className="flex items-center justify-between text-xs text-neutral-400 mb-2">
            <span>Inflows & Dividends</span>
            <ArrowUpRight className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-sans text-emerald-400 tabular-nums">
            +${totalInflow.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-2 text-[11px] text-neutral-400 flex items-center gap-1 font-mono">
            <span className="text-emerald-400">+18.5%</span> yield & syndicate carry
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-neutral-800 bg-neutral-900/50">
          <div className="flex items-center justify-between text-xs text-neutral-400 mb-2">
            <span>Net Liquid Expansion</span>
            <Sparkles className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-sans text-neutral-100 tabular-nums">
            +${(totalInflow - totalOutflow).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-2 text-[11px] text-neutral-400 font-mono">
            Capital retention ratio: <strong className="text-neutral-200">54.2%</strong>
          </div>
        </div>
      </div>

      {/* 2-Column: Category Breakdown & Top Merchants Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <div className="p-6 rounded-2xl border border-neutral-800 bg-neutral-900/50 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-100">Disbursements by Sector</h2>
            <span className="text-xs font-mono text-neutral-400">Total: ${totalOutflow.toLocaleString()}</span>
          </div>

          <div className="space-y-4">
            {categoriesSorted.map((cat, idx) => {
              const colors = ['bg-rose-500', 'bg-amber-500', 'bg-sky-500', 'bg-purple-500', 'bg-emerald-500', 'bg-indigo-500'];
              const color = colors[idx % colors.length];

              return (
                <div key={cat.category} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-200 font-medium">{cat.category}</span>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-neutral-400">${cat.amount.toLocaleString()}</span>
                      <span className="text-neutral-500 text-[10px]">({cat.percent}%)</span>
                    </div>
                  </div>
                  <div className="w-full bg-neutral-950 h-2 rounded-full overflow-hidden border border-neutral-850">
                    <div
                      style={{ width: `${cat.percent}%` }}
                      className={`h-full ${color} rounded-full transition-all duration-500`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Counterparties & Merchants */}
        <div className="p-6 rounded-2xl border border-neutral-800 bg-neutral-900/50 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-100">Top Counterparties by Volume</h2>
            <span className="text-xs font-mono text-neutral-400">MTD Audit</span>
          </div>

          <div className="space-y-3">
            {topMerchants.map(([merchant, data], idx) => (
              <div
                key={merchant}
                className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800/80 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-mono font-bold text-neutral-500 w-4 text-center">
                    0{idx + 1}
                  </span>
                  <div>
                    <div className="font-semibold text-neutral-200">{merchant}</div>
                    <div className="text-[10px] text-neutral-400">{data.category} · {data.count} transaction{data.count > 1 ? 's' : ''}</div>
                  </div>
                </div>
                <div className="text-right font-mono font-bold text-neutral-100 tabular-nums">
                  ${data.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
