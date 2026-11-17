import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  Sun,
  Moon,
  ArrowRight,
} from 'lucide-react';
import { useStaffAuth } from '../context/StaffAuthContext';
import { STAFF_CONFIG } from '../config/staffConfig';

interface StaffSignInPageProps {
  onGoToInvite?: () => void;
}

export const StaffSignInPage: React.FC<StaffSignInPageProps> = () => {
  const {
    signIn,
    backendAuthUnavailable,
    enterDevPreviewMode,
    sessionExpiredMessage,
    clearSessionExpiredMessage,
    theme,
    toggleTheme,
  } = useStaffAuth();
  const isLight = theme === 'light';
  const isDevMode = typeof import.meta !== 'undefined' && Boolean(import.meta.env?.DEV);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearSessionExpiredMessage();
    setErrorMsg(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setErrorMsg('Enter your authorized Aureus staff email address.');
      return;
    }
    if (!password) {
      setErrorMsg('Enter your staff portal password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await signIn(trimmedEmail, password);
      if (!result.ok) {
        setErrorMsg(result.error || 'Unable to sign in.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={`min-h-dvh w-full flex flex-col justify-between p-4 sm:p-6 pb-[max(1rem,env(safe-area-inset-bottom))] ${
        isLight
          ? 'bg-slate-50 text-slate-900'
          : 'bg-neutral-950 text-neutral-100'
      }`}
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between max-w-5xl w-full mx-auto">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold tracking-tight truncate">
              Aureus Staff Portal
            </div>
            <div className="text-[11px] font-mono text-neutral-500 truncate">
              Private Wealth Operations Desk
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle color theme"
          className={`p-2 rounded-xl border transition-colors cursor-pointer shrink-0 ${
            isLight
              ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
              : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:bg-neutral-800'
          }`}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-sky-600" />
          )}
        </button>
      </div>

      {/* Centered Sign In Card */}
      <div className="w-full max-w-md mx-auto my-auto py-8">
        <div
          className={`rounded-2xl border p-5 sm:p-7 space-y-5 shadow-xl ${
            isLight
              ? 'bg-white border-slate-200'
              : 'bg-neutral-900 border-neutral-800'
          }`}
        >
          <div className="space-y-1.5">
            <h1 className="text-xl font-bold tracking-tight">Staff Desk Sign In</h1>
            <p
              className={`text-xs leading-relaxed ${
                isLight ? 'text-slate-600' : 'text-neutral-400'
              }`}
            >
              Sign in with your invitation-provisioned Aureus specialist credentials.
              Sessions use verified HTTP-only security cookies.
            </p>
          </div>

          {sessionExpiredMessage && (
            <div
              role="alert"
              className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                isLight
                  ? 'border-amber-200 bg-amber-50 text-amber-900'
                  : 'border-amber-500/40 bg-amber-500/10 text-amber-300'
              }`}
            >
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <span>{sessionExpiredMessage}</span>
            </div>
          )}

          {errorMsg && (
            <div
              role="alert"
              className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                isLight
                  ? 'border-rose-200 bg-rose-50 text-rose-800'
                  : 'border-rose-500/40 bg-rose-500/10 text-rose-300'
              }`}
            >
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="staff-email"
                className={`text-xs font-medium block ${
                  isLight ? 'text-slate-700' : 'text-neutral-300'
                }`}
              >
                Staff Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="staff-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@aureusbank.com"
                  disabled={isSubmitting}
                  className={`w-full pl-9 pr-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                    isLight
                      ? 'bg-slate-50 border-slate-300 text-slate-900'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-100'
                  }`}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="staff-password"
                className={`text-xs font-medium block ${
                  isLight ? 'text-slate-700' : 'text-neutral-300'
                }`}
              >
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="staff-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  disabled={isSubmitting}
                  className={`w-full pl-9 pr-10 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                    isLight
                      ? 'bg-slate-50 border-slate-300 text-slate-900'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-100'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-200 cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-neutral-950 font-semibold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Desk Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Desk</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div
            className={`pt-4 border-t text-[11px] text-neutral-500 space-y-1 ${
              isLight ? 'border-slate-200' : 'border-neutral-800'
            }`}
          >
            <div>
              Access is restricted to invited Aureus support specialists. Public
              registration is disabled.
            </div>
            <div className="font-mono text-[10px]">
              Auth endpoint: POST {STAFF_CONFIG.apiBaseUrl}
              {STAFF_CONFIG.endpoints.auth.signIn}
            </div>
          </div>

          {isDevMode && backendAuthUnavailable && (
            <div
              className={`p-3.5 rounded-xl border space-y-2.5 ${
                isLight
                  ? 'border-amber-200 bg-amber-50 text-amber-900'
                  : 'border-amber-500/35 bg-amber-500/10 text-amber-200'
              }`}
            >
              <div className="space-y-0.5 text-xs">
                <div className="font-semibold">
                  Development Preview Mode Available
                </div>
                <p className="text-[11px] opacity-90 leading-relaxed">
                  Express backend is currently unreachable. You can preview the
                  workspace UI using read-only mock records without creating a
                  real authenticated session.
                </p>
              </div>
              <button
                type="button"
                onClick={enterDevPreviewMode}
                className="w-full py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold text-xs cursor-pointer transition-colors"
              >
                Open Dev Preview Mode (Not Authenticated)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Minimal Footer */}
      <div className="text-center text-[11px] font-mono text-neutral-500">
        Aureus Sovereign Private Bank · Authenticated Staff Operations
      </div>
    </div>
  );
};
