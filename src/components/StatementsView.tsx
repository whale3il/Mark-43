import React, { useState } from 'react';
import {
  FileText,
  Download,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  FileCheck,
  ArrowRight
} from 'lucide-react';
import { BankStatement } from '../types/banking';

interface StatementsViewProps {
  statements: BankStatement[];
  onSimulateDownload: (fileName: string) => void;
}

export const StatementsView: React.FC<StatementsViewProps> = ({
  statements,
  onSimulateDownload
}) => {
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  const handleDownload = (fileName: string) => {
    onSimulateDownload(fileName);
    setDownloadSuccess(fileName);
    setTimeout(() => setDownloadSuccess(null), 2500);
  };

  const taxDocuments = [
    { name: '2025 Consolidated Form 1099-INT (Interest Yield)', size: '420 KB', date: 'Jan 31, 2026' },
    { name: '2025 Form 1099-B (Proceeds from Broker & Barter)', size: '890 KB', date: 'Feb 15, 2026' },
    { name: '2025 Foreign Bank & Financial Accounts (FBAR FinCEN 114)', size: '310 KB', date: 'Apr 02, 2026' },
    { name: '2025 Aureus Sovereign Annual Audit Report', size: '2.4 MB', date: 'Mar 10, 2026' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-neutral-100 font-sans">
          Certified Statements & Tax Disclosures
        </h1>
        <p className="text-xs text-neutral-400 mt-0.5">
          Tamper-evident cryptographically signed PDF ledgers and year-end IRS/FINMA filings
        </p>
      </div>

      {downloadSuccess && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Export generated successfully: <strong className="font-mono">{downloadSuccess}</strong></span>
        </div>
      )}

      {/* Monthly Statements Table */}
      <div className="p-6 rounded-2xl border border-neutral-800 bg-neutral-900/50 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-100">Monthly Wealth Ledgers</h2>
          <span className="text-xs font-mono text-neutral-400">PDF Format (AES-256 Encrypted)</span>
        </div>

        <div className="divide-y divide-neutral-800/60">
          {statements.map((stmt) => (
            <div
              key={stmt.id}
              className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 first:pt-0 last:pb-0"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-center text-emerald-400 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-neutral-200">
                    {stmt.month} {stmt.year} Consolidated Wealth Statement
                  </div>
                  <div className="text-[11px] font-mono text-neutral-400 mt-0.5">
                    Opening: ${stmt.startingBalance.toLocaleString()} · Closing: ${stmt.closingBalance.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs font-mono text-neutral-400">
                <span className="text-neutral-500 text-[11px]">{stmt.fileSize}</span>
                <button
                  onClick={() => handleDownload(stmt.fileName)}
                  className="px-3 py-1.5 rounded-lg bg-neutral-850 hover:bg-neutral-800 text-neutral-200 text-xs font-medium transition-colors border border-neutral-750 flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Download PDF</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tax Filings Grid */}
      <div className="p-6 rounded-2xl border border-neutral-800 bg-neutral-900/50 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-neutral-100">Tax Year Filings & Disclosures</h2>
            <p className="text-xs text-neutral-400 mt-0.5">Directly compatible with CPA and Family Office ledgers</p>
          </div>
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {taxDocuments.map((tax) => (
            <div
              key={tax.name}
              className="p-4 rounded-xl bg-neutral-950/70 border border-neutral-800/80 flex items-center justify-between gap-3"
            >
              <div className="truncate">
                <div className="text-xs font-semibold text-neutral-200 truncate">{tax.name}</div>
                <div className="text-[10px] text-neutral-500 font-mono mt-0.5">
                  Published {tax.date} · {tax.size}
                </div>
              </div>
              <button
                onClick={() => handleDownload(`${tax.name}.pdf`)}
                className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white shrink-0"
                title="Download Tax Document"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
