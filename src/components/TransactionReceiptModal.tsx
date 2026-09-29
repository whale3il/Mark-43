import React from 'react';
import {
  X,
  FileCheck,
  Download,
  Share2,
  Copy,
  Check,
  Building,
  Calendar,
  CreditCard,
  Hash
} from 'lucide-react';
import { Transaction, CurrencyCode } from '../types/banking';

interface TransactionReceiptModalProps {
  transaction: Transaction | null;
  onClose: () => void;
  currency: CurrencyCode;
}

export const TransactionReceiptModal: React.FC<TransactionReceiptModalProps> = ({
  transaction,
  onClose,
  currency
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!transaction) return null;

  const handleCopyRef = () => {
    navigator.clipboard.writeText(transaction.referenceNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isInflow = transaction.amount > 0;
  const absAmount = Math.abs(transaction.amount);
  const symbol = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : currency === 'CHF' ? 'CHF ' : currency === 'NGN' ? '₦' : '$';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2.5 text-xs text-neutral-400 font-mono uppercase mb-4">
          <FileCheck className="w-4 h-4 text-emerald-400" />
          <span>Official Transaction Receipt</span>
        </div>

        {/* Amount Header */}
        <div className="text-center py-4 border-y border-neutral-800 my-2">
          <div className="text-xs text-neutral-400 font-mono">
            {isInflow ? 'CREDIT / INFLOW' : 'DEBIT / OUTFLOW'}
          </div>
          <div className={`text-3xl font-bold font-sans mt-1 tabular-nums ${isInflow ? 'text-emerald-400' : 'text-neutral-100'}`}>
            {isInflow ? '+' : '-'}{symbol}{absAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-neutral-300 font-medium mt-1">
            {transaction.merchant}
          </div>
        </div>

        {/* Transaction Details */}
        <div className="space-y-3 py-3 text-xs">
          <div className="flex items-center justify-between text-neutral-400">
            <span>Reference Code</span>
            <div className="flex items-center gap-1.5 font-mono text-neutral-200">
              <span>{transaction.referenceNumber}</span>
              <button onClick={handleCopyRef} className="text-neutral-400 hover:text-white">
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-neutral-400">
            <span>Date & Time</span>
            <span className="font-mono text-neutral-200">{transaction.date} at {transaction.time} EST</span>
          </div>

          <div className="flex items-center justify-between text-neutral-400">
            <span>Category</span>
            <span className="text-neutral-200">{transaction.category}</span>
          </div>

          <div className="flex items-center justify-between text-neutral-400">
            <span>Payment Method</span>
            <span className="font-mono text-neutral-200">{transaction.paymentMethod}</span>
          </div>

          <div className="flex items-center justify-between text-neutral-400">
            <span>Settlement Status</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 capitalize">
              {transaction.status}
            </span>
          </div>

          {transaction.notes && (
            <div className="pt-2 border-t border-neutral-800 text-neutral-400">
              <span className="text-[10px] font-mono text-neutral-500 uppercase block mb-0.5">Wire Memorandum</span>
              <p className="text-neutral-300 italic">{transaction.notes}</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-neutral-800 flex items-center justify-between gap-3">
          <button
            onClick={() => {
              window.print();
            }}
            className="flex-1 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-200 text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Print Receipt</span>
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-xs font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
