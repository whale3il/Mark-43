import React, { useState } from 'react';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Sun,
  Moon,
  AtSign,
  KeyRound,
  RefreshCw,
  Send
} from 'lucide-react';
import { GoogleIcon } from './GoogleIcon';
import { AuthService } from '../../services/authService';
import { AuthUser, LoginPayload } from '../../types/auth';

interface LoginViewProps {
  onSuccess: (user: AuthUser) => void;
  onNavigateToSignUp: () => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onSuccess,
  onNavigateToSignUp,
  theme,
  toggleTheme
}) => {
  // Credentials
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // States
  const [loading, setLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState<AuthUser | null>(null);
  const [error, setError] = useState<{
    code: string;
    message: string;
  } | null>(null);

  // Google Auth
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  // Forgot Password Modal
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSentMessage, setForgotSentMessage] = useState<string | null>(null);
  const [forgotError, setForgotError] = useState<string | null>(null);

  // Email verification required alert
  const [showVerificationAlert, setShowVerificationAlert] = useState(false);

  // Handle Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setShowVerificationAlert(false);

    if (!identifier.trim()) {
      setError({
        code: 'VALIDATION_ERROR',
        message: 'Please enter your registered email address or username.'
      });
      return;
    }
    if (!password) {
      setError({
        code: 'VALIDATION_ERROR',
        message: 'Please provide your vault access password.'
      });
      return;
    }

    setLoading(true);

    const payload: LoginPayload = {
      identifier: identifier.trim(),
      password,
      rememberMe
    };

    try {
      const response = await AuthService.login(payload);

      if (response.success && response.user) {
        setLoginSuccess(response.user);
        setTimeout(() => {
          onSuccess(response.user!);
        }, 600);
      } else {
        if (response.error?.code === 'EMAIL_VERIFICATION_REQUIRED') {
          setShowVerificationAlert(true);
        }
        setError({
          code: response.error?.code || 'INVALID_CREDENTIALS',
          message:
            response.error?.message ||
            'Invalid credentials. Please verify your email/username or reset your password.'
        });
      }
    } catch {
      setError({
        code: 'NETWORK_ERROR',
        message: 'Network error connecting to private banking gateway. Please check your connection and retry.'
      });
    } finally {
      setLoading(false);
    }
  };

  // Google Sign In
  const handleGoogleSignIn = async () => {
    if (googleLoading || loading) return;
    setGoogleLoading(true);
    setGoogleError(null);
    setError(null);

    try {
      const response = await AuthService.loginWithGoogle({
        token: `google-oauth-${Date.now()}`
      });

      if (response.success && response.user) {
        setLoginSuccess(response.user);
        setTimeout(() => {
          onSuccess(response.user!);
        }, 500);
      } else {
        setGoogleError(response.error?.message || 'Google identity verification could not be validated.');
      }
    } catch {
      setGoogleError('Failed to communicate with Google Identity Services. Please use email/password.');
    } finally {
      setGoogleLoading(false);
    }
  };

  // 1-Click Demo Login
  const handleDemoLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const demoUser = AuthService.getDemoUser();
      setLoginSuccess(demoUser);
      setTimeout(() => {
        onSuccess(demoUser);
      }, 500);
    } finally {
      setLoading(false);
    }
  };

  // Forgot Password Submit
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotIdentifier.trim()) return;

    setForgotLoading(true);
    setForgotError(null);

    try {
      const response = await AuthService.forgotPassword({ identifier: forgotIdentifier.trim() });
      if (response.success) {
        setForgotSentMessage(response.message || 'Recovery security link dispatched.');
      } else {
        setForgotError(response.error?.message || 'Unable to dispatch recovery instructions.');
      }
    } catch {
      setForgotError('Network error while requesting password reset.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div
      className={`min-h-screen flex flex-col justify-between ${
        theme === 'light' ? 'bg-slate-50 text-slate-900' : 'bg-neutral-950 text-neutral-100'
      } p-4 sm:p-8 transition-colors duration-200 relative`}
    >
      {/* Top Header Bar */}
      <header className="flex items-center justify-between max-w-5xl w-full mx-auto">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-900 border border-neutral-800 shadow-md">
            <span className="text-base font-bold tracking-wider text-emerald-400 font-mono">AV</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight font-sans">Aureus Wealth</span>
              <span className="text-[10px] font-medium tracking-wider text-emerald-500 uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 font-mono">
                Private Bank
              </span>
            </div>
            <p className="text-[11px] text-neutral-500 hidden sm:block">
              Institutional Sovereign Wealth & Clearing
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-lg border border-neutral-800 bg-neutral-900/80 text-neutral-400 hover:text-neutral-100 hover:bg-neutral-850 transition-all"
            title="Toggle Light / Dark Theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-sky-500" />}
          </button>

          <button
            type="button"
            onClick={handleDemoLogin}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-xs font-semibold transition-all font-mono"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>1-Click Demo Login</span>
          </button>
        </div>
      </header>

      {/* Main Authentication Card */}
      <main className="w-full max-w-md mx-auto my-6">
        <div className="rounded-2xl border border-neutral-800/90 bg-neutral-900/85 backdrop-blur-xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          {/* Subtle Ambient Radial Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Form Header */}
          <div className="relative mb-6 text-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-800/80 border border-neutral-700/60 text-[11px] font-mono text-neutral-300 mb-3">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Sovereign Security Gateway</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-sans text-neutral-100">
              Sign In to Your Vault
            </h1>
            <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
              Access your executive portfolio using your registered email address or username.
            </p>
          </div>

          {/* Success state feedback */}
          {loginSuccess && (
            <div className="mb-4 p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center gap-3 text-xs text-emerald-300 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <p className="font-semibold text-emerald-200">Vault Access Granted</p>
                <p className="text-[11px] text-emerald-400">Loading {loginSuccess.firstName}'s sovereign portfolio...</p>
              </div>
            </div>
          )}

          {/* Error Message Banner */}
          {error && (
            <div className="mb-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-xs text-red-300 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold block text-red-200">
                  {error.code === 'INVALID_CREDENTIALS'
                    ? 'Authentication Failed'
                    : error.code === 'NETWORK_ERROR'
                    ? 'Gateway Network Error'
                    : 'Sign In Error'}
                </span>
                <span className="text-[11px] text-red-300/90">{error.message}</span>
              </div>
              {error.code === 'NETWORK_ERROR' && (
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="px-2 py-1 rounded bg-red-500/20 text-red-200 text-[10px] font-semibold hover:bg-red-500/30"
                >
                  Retry
                </button>
              )}
            </div>
          )}

          {/* Email Verification Required Alert */}
          {showVerificationAlert && (
            <div className="mb-4 p-3 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-start gap-2 text-xs text-sky-300 animate-in fade-in">
              <Mail className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block text-sky-200">Email Verification Required</span>
                <span className="text-[11px]">Please check your inbox to verify your private bank account before signing in.</span>
              </div>
            </div>
          )}

          {/* Prominent Continue with Google Button */}
          <div className="mb-5">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading || loading}
              className="w-full py-2.5 px-4 rounded-xl border border-neutral-700 bg-neutral-950/70 hover:bg-neutral-900 text-neutral-200 text-xs font-semibold flex items-center justify-center gap-3 transition-all shadow-sm hover:border-neutral-600 disabled:opacity-50 group"
            >
              {googleLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin text-neutral-400" />
              ) : (
                <GoogleIcon className="w-4 h-4" />
              )}
              <span>Continue with Google</span>
            </button>

            {googleError && (
              <div className="mt-2.5 p-2 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-2 text-xs text-red-400 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{googleError}</span>
              </div>
            )}

            {/* Aesthetic Divider */}
            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-800" />
              </div>
              <div className="relative flex justify-center text-[10px] font-mono uppercase tracking-widest">
                <span className="bg-neutral-900 px-3 text-neutral-500">
                  Or Sign In with Credentials
                </span>
              </div>
            </div>
          </div>

          {/* Sign In Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email or Username input */}
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                Email Address or Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="client@aureusbank.com or alexander_wright"
                  disabled={loading}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-neutral-800 bg-neutral-950/80 text-xs text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all font-mono"
                  required
                />
                <AtSign className="w-4 h-4 text-neutral-500 absolute left-3 top-3 pointer-events-none" />
              </div>
            </div>

            {/* Password input with show/hide toggle */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-neutral-300">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="••••••••••••"
                  disabled={loading}
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-neutral-800 bg-neutral-950/80 text-xs text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all font-mono"
                  required
                />
                <Lock className="w-4 h-4 text-neutral-500 absolute left-3 top-3 pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-neutral-400 hover:text-neutral-200"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between text-xs py-1">
              <label className="flex items-center gap-2 cursor-pointer text-neutral-300">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={loading}
                  className="w-4 h-4 rounded border-neutral-700 bg-neutral-950 text-emerald-500 focus:ring-0 focus:ring-offset-0"
                />
                <span className="text-[11px] text-neutral-400">Remember Me</span>
              </label>

              <span className="text-[11px] font-mono text-neutral-500 flex items-center gap-1">
                <KeyRound className="w-3 h-3 text-emerald-400" /> Sovereign 2FA
              </span>
            </div>

            {/* Sign In Button with loading state */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50 active:scale-[0.99]"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Authenticating Vault...</span>
                </span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* 1-Click Demo Login */}
          <div className="mt-4 pt-4 border-t border-neutral-800">
            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={loading}
              className="w-full py-2 px-3 rounded-xl border border-neutral-700 bg-neutral-800/60 hover:bg-neutral-800 text-neutral-200 text-xs font-medium flex items-center justify-center gap-2 transition-all group"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Instant Demo Access (Alexander V. Wright)</span>
            </button>
          </div>

          {/* Link to Create Account */}
          <div className="mt-5 text-center">
            <p className="text-xs text-neutral-400">
              New client to Aureus Wealth?{' '}
              <button
                type="button"
                onClick={onNavigateToSignUp}
                className="text-emerald-400 hover:text-emerald-300 font-semibold underline underline-offset-4 ml-1 transition-colors"
              >
                Create Account →
              </button>
            </p>
          </div>
        </div>

        {/* Security Disclaimers */}
        <div className="mt-6 text-center space-y-1 text-[11px] text-neutral-500">
          <p className="flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            256-bit TLS Military Encryption · CBN Licensed · NDIC Insured
          </p>
          <p className="text-[10px] text-neutral-600 font-mono">
            POST /api/auth/login · Express + Prisma Backend Ready
          </p>
        </div>
      </main>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl relative">
            <h3 className="text-sm font-bold text-neutral-100 mb-1">Reset Vault Access Credentials</h3>
            <p className="text-xs text-neutral-400 mb-4">
              Enter your registered email address or username to receive a secure recovery key.
            </p>

            {forgotSentMessage ? (
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{forgotSentMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setForgotSentMessage(null);
                    setForgotIdentifier('');
                  }}
                  className="w-full py-2 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-200 text-xs font-semibold"
                >
                  Return to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-3.5">
                {forgotError && (
                  <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{forgotError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    Email or Username
                  </label>
                  <input
                    type="text"
                    value={forgotIdentifier}
                    onChange={(e) => setForgotIdentifier(e.target.value)}
                    placeholder="client@aureusbank.com or alexander_wright"
                    className="w-full px-3 py-2 rounded-xl border border-neutral-800 bg-neutral-950 text-xs text-neutral-100 focus:outline-none focus:border-emerald-500 font-mono"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(false);
                      setForgotError(null);
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs text-neutral-400 hover:text-neutral-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading || !forgotIdentifier.trim()}
                    className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {forgotLoading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3 h-3" />
                    )}
                    <span>Send Recovery Link</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="max-w-5xl w-full mx-auto text-center text-[11px] text-neutral-600">
        © {new Date().getFullYear()} Aureus Wealth Private Bank. Central Bank of Nigeria Regulatory Standard NUBAN Integration.
      </footer>
    </div>
  );
};
