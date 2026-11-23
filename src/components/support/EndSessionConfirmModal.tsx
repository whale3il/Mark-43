import React from 'react';
import { AlertTriangle, Loader2, X } from 'lucide-react';

interface EndSessionConfirmModalProps {
  isOpen: boolean;
  subject?: string;
  isSubmitting?: boolean;
  errorMessage?: string | null;
  role: 'customer' | 'staff';
  onCancel: () => void;
  onConfirm: () => void;
  theme?: 'dark' | 'light';
}

export const EndSessionConfirmModal: React.FC<EndSessionConfirmModalProps> = ({
  isOpen,
  subject,
  isSubmitting = false,
  errorMessage,
  role,
  onCancel,
  onConfirm,
  theme = 'dark',
}) => {
  if (!isOpen) return null;
  const isLight = theme === 'light';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="end-session-modal-title"
        className={`w-full max-w-md rounded-2xl border p-5 sm:p-6 space-y-4 shadow-2xl ${
          isLight
            ? 'border-slate-200 bg-white text-slate-900'
            : 'border-neutral-800 bg-neutral-900 text-neutral-100'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 id="end-session-modal-title" className="text-sm font-semibold">
                End Support Session
              </h3>
              {subject && (
                <p className="text-[11px] text-neutral-400 truncate max-w-[260px]">
                  {subject}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={onCancel}
            aria-label="Close confirmation"
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-200 cursor-pointer disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p
          className={`text-xs leading-relaxed ${
            isLight ? 'text-slate-600' : 'text-neutral-300'
          }`}
        >
          {role === 'staff'
            ? 'Ending this session permanently closes the active support thread, clears the conversation view for both parties, and frees your active chat capacity.'
            : 'Ending this session closes your live consultation thread and clears the conversation history. You can initiate a new inquiry whenever needed.'}
        </p>

        {errorMessage && (
          <div
            role="alert"
            className={`p-3 rounded-xl border text-xs ${
              isLight
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-rose-500/10 border-rose-500/40 text-rose-300'
            }`}
          >
            {errorMessage}
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-1">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onCancel}
            className={`px-4 py-2 rounded-xl text-xs font-medium cursor-pointer disabled:opacity-40 ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
            }`}
          >
            Keep Session Open
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{isSubmitting ? 'Closing...' : 'End Session'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
