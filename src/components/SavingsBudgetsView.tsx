import React, { useState } from 'react';
import {
  Target,
  Plus,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Sliders,
  CheckCircle2,
  DollarSign
} from 'lucide-react';
import { SavingsGoal, BudgetCategory, CurrencyCode } from '../types/banking';

interface SavingsBudgetsViewProps {
  goals: SavingsGoal[];
  budgets: BudgetCategory[];
  currency: CurrencyCode;
  onDepositToGoal: (goalId: string, amount: number) => void;
  onCreateGoal: (goal: SavingsGoal) => void;
}

export const SavingsBudgetsView: React.FC<SavingsBudgetsViewProps> = ({
  goals,
  budgets,
  currency,
  onDepositToGoal,
  onCreateGoal
}) => {
  const [selectedGoalForDeposit, setSelectedGoalForDeposit] = useState<SavingsGoal | null>(null);
  const [depositAmount, setDepositAmount] = useState('20000');
  const [showCreateGoalModal, setShowCreateGoalModal] = useState(false);

  // New goal form
  const [newTitle, setNewTitle] = useState('');
  const [newTarget, setNewTarget] = useState('500000');
  const [newTargetDate, setNewTargetDate] = useState('Dec 2027');
  const [newMonthly, setNewMonthly] = useState('25000');

  const handleDepositSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoalForDeposit) return;
    const amt = parseFloat(depositAmount) || 0;
    if (amt <= 0) return;
    onDepositToGoal(selectedGoalForDeposit.id, amt);
    setSelectedGoalForDeposit(null);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;
    onCreateGoal({
      id: `goal-${Date.now()}`,
      title: newTitle,
      targetAmount: parseFloat(newTarget) || 100000,
      currentAmount: 0,
      currency: 'USD',
      targetDate: newTargetDate,
      category: 'Property',
      monthlyContribution: parseFloat(newMonthly) || 10000,
      color: 'emerald'
    });
    setShowCreateGoalModal(false);
    setNewTitle('');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-100 font-sans">
            Savings Goals & Capital Allocations
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Automated compounding vaults earmarked for major real-estate and direct equity acquisitions
          </p>
        </div>

        <button
          onClick={() => setShowCreateGoalModal(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500 text-neutral-950 font-semibold text-xs hover:bg-emerald-400 transition-colors shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Capital Allocation Goal</span>
        </button>
      </div>

      {/* Savings Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {goals.map((g) => {
          const percent = Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100));
          const remaining = Math.max(0, g.targetAmount - g.currentAmount);

          return (
            <div
              key={g.id}
              className="p-6 rounded-2xl border border-neutral-800 bg-neutral-900/50 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-xs text-neutral-400 mb-2">
                  <span className="font-mono uppercase text-[10px] text-emerald-400">{g.category}</span>
                  <span className="font-mono text-[10px]">Target: {g.targetDate}</span>
                </div>

                <h3 className="text-sm font-semibold text-neutral-100 leading-snug">{g.title}</h3>

                <div className="mt-4 flex items-baseline justify-between">
                  <div className="text-2xl font-bold font-sans text-neutral-100 tabular-nums">
                    ${g.currentAmount.toLocaleString()}
                  </div>
                  <div className="text-xs font-mono text-neutral-400">
                    of ${g.targetAmount.toLocaleString()}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-3 w-full bg-neutral-950 h-2.5 rounded-full overflow-hidden border border-neutral-850">
                  <div
                    style={{ width: `${percent}%` }}
                    className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                  />
                </div>

                <div className="mt-2 flex justify-between text-[11px] font-mono text-neutral-500">
                  <span>{percent}% funded</span>
                  <span>${remaining.toLocaleString()} to goal</span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-neutral-800/80 flex items-center justify-between">
                <span className="text-[11px] text-neutral-400 font-mono">
                  +${g.monthlyContribution.toLocaleString()}/mo auto
                </span>
                <button
                  onClick={() => setSelectedGoalForDeposit(g)}
                  className="px-3 py-1.5 rounded-lg bg-neutral-850 hover:bg-neutral-800 text-emerald-400 text-xs font-medium transition-colors border border-neutral-750 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Deposit</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Monthly Category Budgets Section */}
      <div className="p-6 rounded-2xl border border-neutral-800 bg-neutral-900/50 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-neutral-100">Monthly Operating Budgets & Ceilings</h2>
            <p className="text-xs text-neutral-400 mt-0.5">Automated alerts trigger at 85% expenditure</p>
          </div>
          <span className="text-xs font-mono text-neutral-400">September 2026 Cycle</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {budgets.map((b) => {
            const pct = Math.min(100, Math.round((b.spent / b.budgeted) * 100));
            const isNearCap = pct >= 80;

            return (
              <div key={b.id} className="p-4 rounded-xl bg-neutral-950/70 border border-neutral-800/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-neutral-200">{b.name}</span>
                  <span className="font-mono text-neutral-300">
                    ${b.spent.toLocaleString()} / <span className="text-neutral-500">${b.budgeted.toLocaleString()}</span>
                  </span>
                </div>

                <div className="w-full bg-neutral-900 h-2 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${pct}%` }}
                    className={`h-full rounded-full transition-all ${
                      isNearCap ? 'bg-amber-400' : 'bg-emerald-400'
                    }`}
                  />
                </div>

                <div className="flex justify-between text-[10px] font-mono">
                  <span className={isNearCap ? 'text-amber-400' : 'text-neutral-400'}>
                    {pct}% utilized
                  </span>
                  <span className="text-neutral-500">
                    ${(b.budgeted - b.spent).toLocaleString()} headroom
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Deposit to Goal Modal */}
      {selectedGoalForDeposit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl">
            <h3 className="text-sm font-semibold text-neutral-100">Deposit Funds to Vault</h3>
            <p className="text-xs text-neutral-400 mt-1">Earmark capital for: {selectedGoalForDeposit.title}</p>

            <form onSubmit={handleDepositSubmit} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block text-neutral-300 mb-1">Deposit Amount (USD)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-neutral-400">$</span>
                  <input
                    type="number"
                    required
                    min="1"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100 font-mono text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                {[5000, 10000, 25000, 50000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setDepositAmount(amt.toString())}
                    className="flex-1 py-1 rounded bg-neutral-950 border border-neutral-800 font-mono text-[10px] text-neutral-400 hover:text-neutral-200"
                  >
                    +${(amt / 1000).toFixed(0)}k
                  </button>
                ))}
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedGoalForDeposit(null)}
                  className="px-4 py-2 rounded-lg text-neutral-400 hover:text-neutral-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-500 text-neutral-950 font-semibold hover:bg-emerald-400"
                >
                  Confirm Deposit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create New Goal Modal */}
      {showCreateGoalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl">
            <h3 className="text-sm font-semibold text-neutral-100">Establish Capital Goal Vault</h3>
            <p className="text-xs text-neutral-400 mt-1">Earmark future cash flows into an interest-bearing escrow</p>

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block text-neutral-300 mb-1">Goal Designation</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Monaco Grand Prix Berth Syndicate"
                  className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-300 mb-1">Target Capital (USD)</label>
                  <input
                    type="number"
                    required
                    value={newTarget}
                    onChange={(e) => setNewTarget(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-neutral-300 mb-1">Target Date</label>
                  <input
                    type="text"
                    required
                    value={newTargetDate}
                    onChange={(e) => setNewTargetDate(e.target.value)}
                    placeholder="e.g. Dec 2027"
                    className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-200 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-neutral-300 mb-1">Automated Monthly Contribution (USD)</label>
                <input
                  type="number"
                  value={newMonthly}
                  onChange={(e) => setNewMonthly(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-200 font-mono"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateGoalModal(false)}
                  className="px-4 py-2 rounded-lg text-neutral-400 hover:text-neutral-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-500 text-neutral-950 font-semibold hover:bg-emerald-400"
                >
                  Create Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
