import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  FileText,
  AlertTriangle,
  Users,
  Activity,
  Wrench,
  Send,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import {
  AdminAiAssistEntry,
  AdminAiAssistMode,
  AdminConversation,
  AdminProfile,
  AdminStaffRecord,
  AdminTicket,
} from '../types/admin.types';
import { adminAiService } from '../services/adminAiService';

interface AdminMonitoringAiWorkspaceProps {
  conversation: AdminConversation;
  linkedTicket?: AdminTicket;
  staffDirectory: AdminStaffRecord[];
  admin: AdminProfile;
  entries: AdminAiAssistEntry[];
  onAppendEntry: (entry: AdminAiAssistEntry) => void;
  theme: 'dark' | 'light';
}

export const AdminMonitoringAiWorkspace: React.FC<
  AdminMonitoringAiWorkspaceProps
> = ({
  conversation,
  linkedTicket,
  staffDirectory,
  admin,
  entries,
  onAppendEntry,
  theme,
}) => {
  const isLight = theme === 'light';
  const [promptInput, setPromptInput] = useState('');
  const [selectedMode, setSelectedMode] =
    useState<AdminAiAssistMode>('summary');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const feedEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [entries.length, isLoading]);

  const executeMode = async (mode: AdminAiAssistMode, customPrompt?: string) => {
    if (isLoading) return;
    setSelectedMode(mode);
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const res = await adminAiService.runAssist({
        mode,
        prompt: customPrompt,
        conversation,
        linkedTicket,
        staffDirectory,
        admin,
      });

      if (res.success && res.data) {
        onAppendEntry(res.data);
        if (customPrompt) setPromptInput('');
      } else {
        setErrorMsg(
          res.error?.message ||
            'Admin AI Advisory backend unavailable. No mock responses were fabricated.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptInput.trim()) return;
    executeMode(selectedMode, promptInput.trim());
  };

  const quickActions: {
    mode: AdminAiAssistMode;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { mode: 'summary', label: 'Summarize Thread & Ticket', icon: FileText },
    { mode: 'escalation_analysis', label: 'Escalation Risk', icon: AlertTriangle },
    { mode: 'staff_workload', label: 'Staff Workload', icon: Users },
    { mode: 'activity_summary', label: 'Activity Summary', icon: Activity },
    { mode: 'troubleshooting', label: 'Troubleshooting', icon: Wrench },
  ];

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      {/* Quick Advisory Toolbar */}
      <div
        className={`p-3 border-b shrink-0 space-y-2 ${
          isLight
            ? 'bg-slate-50 border-slate-200'
            : 'bg-neutral-950/60 border-neutral-800'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-neutral-400">
          <div className="flex items-center gap-1.5 min-w-0">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="truncate">
              Supervisory Intelligence for{' '}
              <strong
                className={isLight ? 'text-slate-900' : 'text-neutral-200'}
              >
                {conversation.customerName}
              </strong>
            </span>
          </div>
          <span
            className={`text-[10px] font-mono shrink-0 ${
              isLight ? 'text-amber-700' : 'text-amber-400'
            }`}
          >
            Advisory Only · Zero Auto-Actions
          </span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          {quickActions.map((act) => {
            const Icon = act.icon;
            const active = selectedMode === act.mode;
            return (
              <button
                key={act.mode}
                type="button"
                disabled={isLoading}
                onClick={() => executeMode(act.mode)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors disabled:opacity-50 ${
                  active
                    ? isLight
                      ? 'border-amber-500 bg-amber-50 text-amber-800 font-semibold'
                      : 'border-amber-500 bg-amber-500/15 text-amber-300 font-semibold'
                    : isLight
                    ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:bg-neutral-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>{act.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Scrollable AI History */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-3.5">
        {entries.length === 0 && !isLoading && !errorMsg && (
          <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-2.5 py-6">
            <Sparkles className="w-8 h-8 text-amber-500 opacity-85" />
            <div className="text-sm font-semibold">
              Executive Operations AI Assistant
            </div>
            <p
              className={`text-xs leading-relaxed ${
                isLight ? 'text-slate-600' : 'text-neutral-400'
              }`}
            >
              Generate conversation and ticket summaries, unresolved issue and
              escalation risk analysis, staff capacity insights, or next-step
              troubleshooting recommendations. All insights are strictly advisory.
            </p>
          </div>
        )}

        {entries.map((entry) => (
          <div
            key={entry.id}
            className={`rounded-2xl border p-3.5 sm:p-4 space-y-2.5 text-xs ${
              isLight
                ? 'bg-slate-50 border-slate-200 text-slate-900'
                : 'bg-neutral-900/90 border-neutral-800 text-neutral-100'
            }`}
          >
            <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-neutral-500">
              <span
                className={`uppercase font-semibold ${
                  isLight ? 'text-amber-700' : 'text-amber-400'
                }`}
              >
                {entry.mode.replace('_', ' ')}
              </span>
              <div className="flex items-center gap-2">
                {entry.model && <span>{entry.model}</span>}
                <span>{entry.createdAt}</span>
              </div>
            </div>

            <div className="whitespace-pre-line leading-relaxed text-xs">
              {entry.content}
            </div>

            <div
              className={`pt-2 border-t flex items-center justify-end gap-2 ${
                isLight ? 'border-slate-200' : 'border-neutral-800/60'
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(entry.content);
                  setCopiedId(entry.id);
                  setTimeout(() => setCopiedId(null), 1600);
                }}
                className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-medium flex items-center gap-1 cursor-pointer ${
                  isLight
                    ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:bg-neutral-800'
                }`}
              >
                {copiedId === entry.id ? (
                  <Check className="w-3 h-3 text-emerald-500" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                <span>{copiedId === entry.id ? 'Copied Summary' : 'Copy'}</span>
              </button>
            </div>
          </div>
        ))}

        {isLoading && (
          <div
            className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs ${
              isLight
                ? 'border-slate-200 bg-slate-50 text-slate-700'
                : 'border-neutral-800 bg-neutral-900/60 text-neutral-300'
            }`}
          >
            <Loader2 className="w-4 h-4 animate-spin text-amber-500 shrink-0" />
            <span>Querying backend operational AI intelligence...</span>
          </div>
        )}

        {errorMsg && (
          <div
            className={`p-3.5 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
              isLight
                ? 'border-rose-200 bg-rose-50 text-rose-800'
                : 'border-rose-500/40 bg-rose-500/10 text-rose-300'
            }`}
          >
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
            <button
              type="button"
              onClick={() =>
                executeMode(selectedMode, promptInput.trim() || undefined)
              }
              className="px-2.5 py-1 rounded-lg bg-rose-500 text-white text-[11px] font-semibold flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry</span>
            </button>
          </div>
        )}

        <div ref={feedEndRef} />
      </div>

      {/* Advisory Prompt Input */}
      <form
        onSubmit={handleSubmitCustom}
        className={`p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t shrink-0 ${
          isLight
            ? 'bg-white border-slate-200'
            : 'bg-neutral-950/80 border-neutral-800'
        }`}
      >
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
            disabled={isLoading}
            placeholder="Ask AI to evaluate SLA risk, unresolved claims, or staff capacity..."
            className={`flex-1 min-w-0 px-3 py-2.5 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 ${
              isLight
                ? 'bg-slate-50 border-slate-300 text-slate-900'
                : 'bg-neutral-900 border-neutral-800 text-neutral-100'
            }`}
          />
          <button
            type="submit"
            disabled={isLoading || !promptInput.trim()}
            className="px-3.5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-neutral-950 font-semibold text-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Analyze</span>
          </button>
        </div>
      </form>
    </div>
  );
};
