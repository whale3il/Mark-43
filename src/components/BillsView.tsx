import React, { useState } from 'react';
import {
  CalendarCheck,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building2,
  Plane,
  Home,
  ShieldAlert,
  Zap
} from 'lucide-react';
import { BillPayment, CurrencyCode } from '../types/banking';

interface BillsViewProps {
  bills: BillPayment[];
  currency: CurrencyCode;
  onPayBill: (billId: string) => void;
  onToggleAutopay: (billId: string) => void;
  onAddNewBill: (bill: BillPayment) => void;
}

export const BillsView: React.FC<BillsViewProps> = ({
  bills,
  currency,
  onPayBill,
  onToggleAutopay,
  onAddNewBill
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [billerName, setBillerName] = useState('');
  const [amount, setAmount] = useState('1500');
  const [dueDate, setDueDate] = useState('2026-10-20');
  const [category, setCategory] = useState('Utilities');
  const [frequency, setFrequency] = useState<'Monthly' | 'Quarterly' | 'Annual'>('Monthly');

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!billerName) return;
    onAddNewBill({
      id: `bill-${Date.now()}`,
      billerName,
      category,
      accountNumber: `INV-${Math.floor(10000 + Math.random() * 90000)}`,
      amount: parseFloat(amount) || 100,
      dueDate,
      frequency,
      autoPay: true,
      status: 'scheduled'
    });
    setShowAddModal(false);
    setBillerName('');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-100 font-sans">
            Scheduled Disbursements & Invoices
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Automated direct debits, property maintenance retainers, and concierge invoices
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500 text-neutral-950 font-semibold text-xs hover:bg-emerald-400 transition-colors shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Recurring Bill</span>
        </button>
      </div>

      {/* Bill Payments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {bills.map((bill) => {
          const isPaid = bill.status === 'paid';

          return (
            <div
              key={bill.id}
              className="p-5 rounded-2xl border border-neutral-800 bg-neutral-900/50 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-neutral-400">{bill.category}</span>
                    <h3 className="text-sm font-semibold text-neutral-100 mt-0.5">{bill.billerName}</h3>
                  </div>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded capitalize ${
                      isPaid
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-neutral-900 text-neutral-300 border border-neutral-800'
                    }`}
                  >
                    {bill.status}
                  </span>
                </div>

                <div className="mt-3 flex items-baseline justify-between">
                  <div className="text-2xl font-bold font-sans text-neutral-100 tabular-nums">
                    ${bill.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs font-mono text-neutral-400">
                    Due: {bill.dueDate}
                  </div>
                </div>

                <div className="mt-2 text-[11px] font-mono text-neutral-500">
                  Ref: {bill.accountNumber} · Cadence: {bill.frequency}
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-neutral-800/80 flex items-center justify-between">
                {/* Autopay Toggle */}
                <div className="flex items-center gap-2 text-xs">
                  <button
                    onClick={() => onToggleAutopay(bill.id)}
                    className={`w-8 h-4 rounded-full transition-colors relative ${
                      bill.autoPay ? 'bg-emerald-500' : 'bg-neutral-800'
                    }`}
                  >
                    <div
                      className={`w-3 h-3 rounded-full bg-white transition-transform ${
                        bill.autoPay ? 'translate-x-4' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                  <span className="text-neutral-400 text-[11px]">
                    {bill.autoPay ? 'Autopay Active' : 'Manual Settlement'}
                  </span>
                </div>

                {/* Settle Action */}
                {!isPaid ? (
                  <button
                    onClick={() => onPayBill(bill.id)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500 text-neutral-950 font-semibold text-xs hover:bg-emerald-400 transition-colors"
                  >
                    Pay Invoice Now
                  </button>
                ) : (
                  <div className="flex items-center gap-1 text-emerald-400 text-xs font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Settled</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Bill Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl">
            <h3 className="text-sm font-semibold text-neutral-100">Schedule Invoice or Direct Debit</h3>
            <p className="text-xs text-neutral-400 mt-1">Configure automated settlement for upcoming bills</p>

            <form onSubmit={handleAddSubmit} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block text-neutral-300 mb-1">Payee / Organization</label>
                <input
                  type="text"
                  required
                  value={billerName}
                  onChange={(e) => setBillerName(e.target.value)}
                  placeholder="e.g. Zurich Private Jet Hangar Lease"
                  className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-300 mb-1">Disbursement Amount (USD)</label>
                  <input
                    type="number"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-neutral-300 mb-1">Next Settlement Date</label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-200 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-300 mb-1">Sector Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-200"
                  >
                    <option value="Real Estate & Residence">Real Estate & Co-Op</option>
                    <option value="Aviation & Travel">Aviation & Yachting</option>
                    <option value="Utilities">Utilities & Telecom</option>
                    <option value="Insurance">Asset Insurance</option>
                  </select>
                </div>
                <div>
                  <label className="block text-neutral-300 mb-1">Frequency</label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-200"
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Annual">Annual</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg text-neutral-400 hover:text-neutral-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-500 text-neutral-950 font-semibold hover:bg-emerald-400"
                >
                  Schedule Bill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
