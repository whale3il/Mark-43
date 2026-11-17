import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Sun,
  Moon,
} from 'lucide-react';
import { InviteVerificationData } from '../types/staff.types';
import { staffAuthService } from '../services/staffAuthService';
import { useStaffAuth } from '../context/StaffAuthContext';
import { STAFF_CONFIG } from '../config/staffConfig';

interface StaffSetPasswordPageProps {
  token: string;
  isInviteVerificationRoute?: boolean;
  onNavigate: (path: string, replace?: boolean) => void;
}

export const StaffSetPasswordPage: React.FC<StaffSetPasswordPageProps> = ({
  token,
  isInviteVerificationRoute = false,
  onNavigate,
}) => {
  const { refreshSession, theme, toggleTheme } = useStaffAuth();
  const isLight = theme === 'light';

  const [verifying, setVerifying] = useState<boolean>(true);
  const [inviteInfo, setInviteInfo] = useState<InviteVerificationData | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    let active = true;
    const verify = async () => {
      // Express backend redirects verified invites to /staff/set-password with an HTTP-only onboarding cookie.
      // When ?token= is omitted on /staff/set-password, probe optional invite context gracefully without blocking.
      if (!token.trim() && !isInviteVerificationRoute) {
        setVerifying(true);
        setVerifyError(null);
        const res = await staffAuthService.verifyInvite();
        if (!active) return;

        if (res.success && res.data) {
          if (res.data.valid === false) {
            setVerifyError(
              res.data.message ||
                'Your onboarding session has expired. Open a fresh invitation link.'
            );
          } else {
            setInviteInfo(res.data);
          }
        } else if (res.error?.status === 401 || res.error?.status === 403) {
          setVerifyError(
            res.error.message ||
              'Onboarding cookie is missing or expired. Open the invitation link sent to your email.'
          );
        }
        setVerifying(false);
        return;
      }

      if (!token.trim() && isInviteVerificationRoute) {
        setVerifying(false);
        setVerifyError(
          'Missing invitation token. Open the full invitation link sent to your Aureus staff email.'
        );
        return;
      }

      setVerifying(true);
      setVerifyError(null);
      const res = await staffAuthService.verifyInvite(token);
      if (!active) return;

      if (res.success && res.data && res.data.valid) {
        setInviteInfo(res.data);
        if (isInviteVerificationRoute) {
          onNavigate(
            `${STAFF_CONFIG.routes.setPassword}?token=${encodeURIComponent(token)}`,
            true
          );
        }
      } else {
        setVerifyError(
          res.error?.message ||
            'Invitation token could not be verified or has expired.'
        );
      }
      setVerifying(false);
    };

    verify();
    return () => {
      active = false;
    };
  }, [token, isInviteVerificationRoute, onNavigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (password.length < 10) {
      setSubmitError('Password must be at least 10 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setSubmitError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await staffAuthService.setPassword({
        token: token.trim() || undefined,
        password,
        confirmPassword,
      });

      if (!res.success) {
        setSubmitError(res.error?.message || 'Unable to set password.');
        return;
      }

      setCompleted(true);
      if (res.data?.authenticated) {
        await refreshSession();
        onNavigate(STAFF_CONFIG.routes.dashboard, true);
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
              Invitation Activation
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle color theme"
          className={`p-2 rounded-xl border cursor-pointer shrink-0 ${
            isLight
              ? 'bg-white border-slate-200 text-slate-600'
              : 'bg-neutral-900 border-neutral-800 text-neutral-300'
          }`}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-sky-600" />
          )}
        </button>
      </div>

      <div className="w-full max-w-md mx-auto my-auto py-8">
        <div
          className={`rounded-2xl border p-5 sm:p-7 space-y-5 shadow-xl ${
            isLight
              ? 'bg-white border-slate-200'
              : 'bg-neutral-900 border-neutral-800'
          }`}
        >
          {verifying ? (
            <div className="py-10 flex flex-col items-center justify-center gap-3 text-center">
              <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
              <div className="space-y-1">
                <div className="text-sm font-semibold">Verifying Staff Invitation</div>
                <div className="text-xs font-mono text-neutral-500">
                  GET /api/staff/auth/invite
                </div>
              </div>
            </div>
          ) : verifyError ? (
            <div className="space-y-4">
              <div
                className={`flex items-start gap-3 p-3.5 rounded-xl border text-xs ${
                  isLight
                    ? 'border-rose-200 bg-rose-50 text-rose-800'
                    : 'border-rose-500/40 bg-rose-500/10 text-rose-300'
                }`}
              >
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-semibold">Invitation Verification Failed</div>
                  <p className="leading-relaxed opacity-90">{verifyError}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onNavigate(STAFF_CONFIG.routes.signIn, true)}
                className={`w-full py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer ${
                  isLight
                    ? 'border-slate-200 hover:bg-slate-100 text-slate-700'
                    : 'border-neutral-800 hover:bg-neutral-800 text-neutral-200'
                }`}
              >
                <span>Return to Staff Sign In</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : completed ? (
            <div className="space-y-4 text-center py-4">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <div className="space-y-1">
                <h1 className="text-lg font-bold">Desk Credentials Configured</h1>
                <p
                  className={`text-xs ${
                    isLight ? 'text-slate-600' : 'text-neutral-400'
                  }`}
                >
                  Your password has been saved. Sign in to access your Aureus Staff
                  workspace.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate(STAFF_CONFIG.routes.signIn, true)}
                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Continue to Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <h1 className="text-xl font-bold tracking-tight">
                  Set Staff Desk Password
                </h1>
                <p
                  className={`text-xs ${
                    isLight ? 'text-slate-600' : 'text-neutral-400'
                  }`}
                >
                  Complete account activation for{' '}
                  <strong className="text-emerald-500">
                    {inviteInfo?.email || inviteInfo?.name || 'Invited Specialist'}
                  </strong>
                  {inviteInfo?.department ? ` · ${inviteInfo.department}` : ''}.
                </p>
              </div>

              {submitError && (
                <div
                  role="alert"
                  className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                    isLight
                      ? 'border-rose-200 bg-rose-50 text-rose-800'
                      : 'border-rose-500/40 bg-rose-500/10 text-rose-300'
                  }`}
                >
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>{submitError}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="new-staff-password"
                    className={`text-xs font-medium block ${
                      isLight ? 'text-slate-700' : 'text-neutral-300'
                    }`}
                  >
                    New Password (minimum 10 characters)
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="new-staff-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Create a strong passphrase"
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

                <div className="space-y-1.5">
                  <label
                    htmlFor="confirm-staff-password"
                    className="text-xs font-medium text-neutral-300 block"
                  >
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="confirm-staff-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat your passphrase"
                      disabled={isSubmitting}
                      className={`w-full pl-9 pr-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                        isLight
                          ? 'bg-slate-50 border-slate-300 text-slate-900'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-100'
                      }`}
                    />
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
                      <span>Activating Account...</span>
                    </>
                  ) : (
                    <>
                      <span>Activate & Continue</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      <div className="text-center text-[11px] font-mono text-neutral-500">
        Aureus Sovereign Private Bank · Staff Invitation Verification
      </div>
    </div>
  );
};
