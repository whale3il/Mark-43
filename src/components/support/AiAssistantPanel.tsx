import React, { useState } from 'react';
import {
  Sparkles,
  X,
  RefreshCw,
  CornerDownLeft,
  FileText,
  Lightbulb,
  Check,
  Wand2,
  Maximize2,
  AlertCircle
} from 'lucide-react';
import { SupportConversation, SupportAgent, AiActionType } from '../../types/support';
import { aiSupportService, AiAssistantResult } from '../../services/aiSupportService';

interface AiAssistantPanelProps {
  conversation: SupportConversation;
  currentStaff: SupportAgent;
  currentDraft: string;
  onInsertToDraft: (text: string) => void;
  onOpenFullAiChat?: () => void;
  theme?: 'dark' | 'light';
}

type CopilotAction = Exclude<AiActionType, 'chat'>;

export const AiAssistantPanel: React.FC<AiAssistantPanelProps> = ({
  conversation,
  currentStaff,
  currentDraft,
  onInsertToDraft,
  onOpenFullAiChat,
  theme = 'dark'
}) => {
  const isLight = theme === 'light';

  const [isOpen, setIsOpen] = useState(false);
  const [activeAction, setActiveAction] = useState<CopilotAction | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AiAssistantResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const executeAction = async (action: CopilotAction) => {
    setActiveAction(action);
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await aiSupportService.runCopilotAction(
        action,
        conversation,
        currentStaff,
        currentDraft
      );
      if (res.success && res.data) {
        setResult(res.data);
      } else {
        setResult(null);
        setErrorMessage(
          res.error?.message ||
            'AI Copilot endpoint unavailable. Ensure POST /api/ai/assist is connected.'
        );
      }
    } catch (err: any) {
      setResult(null);
      setErrorMessage(err?.message || 'Unable to reach AI Copilot backend.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInsert = () => {
    if (result?.content) {
      onInsertToDraft(result.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      setIsOpen(false);
    }
  };

  const handleDismiss = () => {
    setResult(null);
    setErrorMessage(null);
    setActiveAction(null);
  };

  return (
    <div className="relative">
      {/* Floating AI Assistant Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        title="Open AI Private Wealth Copilot"
        className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all shadow-md group cursor-pointer ${
          isOpen
            ? 'bg-amber-500 text-neutral-950 ring-2 ring-amber-400/40'
            : isLight
            ? 'bg-amber-500/10 text-amber-600 hover:bg-amber-500 hover:text-white border border-amber-500/20'
            : 'bg-amber-500/15 text-amber-300 hover:bg-amber-500 hover:text-neutral-950 border border-amber-500/30'
        }`}
      >
        <Sparkles className="w-4 h-4 transition-transform group-hover:rotate-12" />
      </button>

      {/* Popover Card */}
      {isOpen && (
        <div
          className={`absolute bottom-full right-0 mb-3 w-[26rem] max-w-[90vw] rounded-2xl border shadow-2xl overflow-hidden z-50 flex flex-col animate-in fade-in zoom-in-95 duration-150 ${
            isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-neutral-900 border-neutral-800 text-neutral-100'
          }`}
        >
          {/* Header */}
          <div
            className={`p-3 px-4 border-b flex items-center justify-between gap-2 ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-neutral-950/80 border-neutral-800'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-semibold tracking-tight truncate">Private Banking AI Copilot</h4>
                <p className="text-[10px] text-neutral-400 truncate">Scoped to authorized conversation context</p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {onOpenFullAiChat && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onOpenFullAiChat();
                  }}
                  title="Expand Full AI Chat Room"
                  className={`px-2 py-1 rounded-lg border text-[10px] font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                    isLight
                      ? 'bg-white border-slate-200 text-amber-600 hover:bg-slate-100'
                      : 'bg-neutral-900 border-neutral-800 text-amber-400 hover:bg-neutral-800'
                  }`}
                >
                  <Maximize2 className="w-3 h-3" />
                  <span>Full Room</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Action Pills */}
          <div className="p-3 border-b border-neutral-800/40 grid grid-cols-2 gap-2 bg-neutral-950/30">
            <button
              type="button"
              onClick={() => executeAction('suggest_reply')}
              disabled={isLoading}
              className={`p-2 rounded-xl text-left border text-[11px] font-medium transition-all flex items-center gap-2 cursor-pointer ${
                activeAction === 'suggest_reply'
                  ? 'border-emerald-500/80 bg-emerald-500/15 text-emerald-300'
                  : isLight
                  ? 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                  : 'border-neutral-800 hover:border-neutral-700 bg-neutral-900 text-neutral-300'
              }`}
            >
              <Wand2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <div className="truncate">Suggest Reply</div>
            </button>

            <button
              type="button"
              onClick={() => executeAction('summarize')}
              disabled={isLoading}
              className={`p-2 rounded-xl text-left border text-[11px] font-medium transition-all flex items-center gap-2 cursor-pointer ${
                activeAction === 'summarize'
                  ? 'border-sky-500/80 bg-sky-500/15 text-sky-300'
                  : isLight
                  ? 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                  : 'border-neutral-800 hover:border-neutral-700 bg-neutral-900 text-neutral-300'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <div className="truncate">Summarize Chat</div>
            </button>

            <button
              type="button"
              onClick={() => executeAction('improve_draft')}
              disabled={isLoading}
              className={`p-2 rounded-xl text-left border text-[11px] font-medium transition-all flex items-center gap-2 cursor-pointer ${
                activeAction === 'improve_draft'
                  ? 'border-purple-500/80 bg-purple-500/15 text-purple-300'
                  : isLight
                  ? 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                  : 'border-neutral-800 hover:border-neutral-700 bg-neutral-900 text-neutral-300'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <div className="truncate">Improve Draft</div>
            </button>

            <button
              type="button"
              onClick={() => executeAction('recommend_step')}
              disabled={isLoading}
              className={`p-2 rounded-xl text-left border text-[11px] font-medium transition-all flex items-center gap-2 cursor-pointer ${
                activeAction === 'recommend_step'
                  ? 'border-amber-500/80 bg-amber-500/15 text-amber-300'
                  : isLight
                  ? 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                  : 'border-neutral-800 hover:border-neutral-700 bg-neutral-900 text-neutral-300'
              }`}
            >
              <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <div className="truncate">Recommend Step</div>
            </button>
          </div>

          {/* Results / Error Area */}
          <div className="p-3.5 max-h-64 overflow-y-auto">
            {isLoading ? (
              <div className="py-8 flex flex-col items-center justify-center gap-2 text-neutral-400">
                <RefreshCw className="w-5 h-5 animate-spin text-amber-400" />
                <span className="text-xs font-mono">Querying AI backend service...</span>
              </div>
            ) : errorMessage ? (
              <div className="p-3 rounded-xl border border-rose-500/40 bg-rose-500/10 space-y-2 text-xs">
                <div className="flex items-start gap-2 text-rose-300 font-semibold">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>AI Copilot Request Failed</span>
                </div>
                <p className="text-[11px] text-rose-200/80 leading-relaxed">{errorMessage}</p>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleDismiss}
                    className="px-2.5 py-1 rounded-lg border border-rose-500/30 text-[10px] text-rose-300 hover:bg-rose-500/20"
                  >
                    Dismiss
                  </button>
                  {activeAction && (
                    <button
                      type="button"
                      onClick={() => executeAction(activeAction)}
                      className="px-2.5 py-1 rounded-lg bg-rose-500 text-white font-semibold text-[10px] flex items-center gap-1 hover:bg-rose-400"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Retry</span>
                    </button>
                  )}
                </div>
              </div>
            ) : result ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider font-semibold">
                    {result.title}
                  </span>
                  {result.metadata?.confidence && (
                    <span className="text-[10px] font-mono text-neutral-500">
                      Confidence: {(result.metadata.confidence * 100).toFixed(0)}%
                    </span>
                  )}
                </div>

                <div
                  className={`p-3 rounded-xl border text-xs leading-relaxed whitespace-pre-line font-sans ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-neutral-950 border-neutral-800 text-neutral-200'
                  }`}
                >
                  {result.content}
                </div>

                {/* Actions: Insert, Regenerate, Dismiss */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1.5">
                    {activeAction && (
                      <button
                        type="button"
                        onClick={() => executeAction(activeAction)}
                        className={`p-1.5 px-2.5 rounded-lg border text-[10px] font-medium transition-colors flex items-center gap-1 ${
                          isLight
                            ? 'border-slate-200 hover:bg-slate-100 text-slate-600'
                            : 'border-neutral-800 hover:bg-neutral-800 text-neutral-400'
                        }`}
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Regenerate</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleDismiss}
                      className={`p-1.5 px-2.5 rounded-lg border text-[10px] font-medium transition-colors ${
                        isLight
                          ? 'border-slate-200 hover:bg-slate-100 text-slate-600'
                          : 'border-neutral-800 hover:bg-neutral-800 text-neutral-400'
                      }`}
                    >
                      Dismiss
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleInsert}
                    className="p-1.5 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-semibold text-xs transition-colors flex items-center gap-1 shadow-sm cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <CornerDownLeft className="w-3.5 h-3.5" />}
                    <span>Insert to Composer</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-5 text-center text-xs text-neutral-400 space-y-1">
                <p>Select an AI assistance action above or open the full AI Chat Room.</p>
                <p className="text-[10px] text-neutral-500">
                  Outputs require human review before dispatch.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
