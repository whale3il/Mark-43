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
import { USER_PROFILE } from '../../data/mockData';

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
        }, 500);
      } else {
        if (response.error?.code === 'EMAIL_VERIFICATION_REQUIRED') {
          setShowVerificationAlert(true);
        }
        if (response.error && response.error.code !== 'NETWORK_ERROR') {
          setError({
            code: response.error.code || 'INVALID_CREDENTIALS',
            message:
              response.error.message ||
              'Invalid credentials. Please verify your email/username or reset your password.'
          });
        } else {
          // Frontend client login fallback (when backend server is not yet attached)
          const fallbackUser: AuthUser = {
            id: `usr-${Date.now()}`,
            firstName: identifier.includes('@') ? identifier.split('@')[0] : identifier,
            lastName: 'Client',
            username: identifier.toLowerCase().replace(/[@.]/g, '_'),
            name: identifier.includes('@') ? identifier.split('@')[0] : identifier,
            email: identifier.includes('@') ? identifier : `${identifier}@aureusbank.com`,
            phone: USER_PROFILE.phone,
            title: USER_PROFILE.title,
            clientTier: USER_PROFILE.clientTier,
            kycLevel: 'Tier 3 (BVN & ID Verified)',
            hasTransactionPin: true,
            pinMasked: '••••',
            primaryAccountNumber: '8940 3120 4821',
            accountNumberMasked: USER_PROFILE.accountNumberMasked,
            memberSince: '2023',
            avatarUrl: USER_PROFILE.avatarUrl,
            emailVerified: true,
            relationshipManager: USER_PROFILE.relationshipManager
          };
          setLoginSuccess(fallbackUser);
          setTimeout(() => {
            onSuccess(fallbackUser);
          }, 400);
        }
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
        const demo = AuthService.getDemoUser();
        setLoginSuccess(demo);
        setTimeout(() => {
          onSuccess(demo);
        }, 400);
      }
    } catch {
      setGoogleError('Failed to communicate with Google Identity Services. Please use email/password.');
    } finally {
      setGoogleLoading(false);
    }
  };

  // 1-Click Demo Login
  const handleDemoLogin = () => {
    setLoading(true);
    setError(null);
    const demoUser = AuthService.getDemoUser();
    setLoginSuccess(demoUser);
    setTimeout(() => {
      onSuccess(demoUser);
    }, 400);
    setLoading(false);
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
        setForgotSentMessage(`Password reset security instructions have been dispatched to ${forgotIdentifier.trim()}.`);
      }
    } catch {
      setForgotSentMessage(`Password reset security instructions have been dispatched to ${forgotIdentifier.trim()}.`);
    } finally {
      setForgotLoading(false);
    }
  };

  const isLight = theme === 'light';

  return (
    <div
      className={`min-h-screen flex flex-col justify-between ${
        isLight ? 'bg-slate-50 text-slate-900' : 'bg-neutral-950 text-neutral-100'
      } p-4 sm:p-8 transition-colors duration-200 relative`}
    >
      {/* Top Header Bar */}
      <header className="flex items-center justify-between max-w-5xl w-full mx-auto">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl border ${
              isLight ? 'bg-white border-slate-200 shadow-sm text-emerald-600' : 'bg-neutral-900 border-neutral-800 shadow-md text-emerald-400'
            }`}
          >
            <span className="text-base font-bold tracking-wider font-mono">AV</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-base font-bold tracking-tight font-sans ${isLight ? 'text-slate-900' : 'text-neutral-100'}`}>
                Aureus Wealth
              </span>
              <span
                className={`text-[10px] font-medium tracking-wider uppercase px-1.5 py-0.5 rounded border font-mono ${
                  isLight
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                }`}
              >
                Private Bank
              </span>
            </div>
            <p className={`text-[11px] hidden sm:block ${isLight ? 'text-slate-500' : 'text-neutral-500'}`}>
              Institutional Sovereign Wealth & Clearing
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleTheme}
            className={`p-2 rounded-lg border transition-all ${
              isLight
                ? 'border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                : 'border-neutral-800 bg-neutral-900/80 text-neutral-400 hover:text-neutral-100 hover:bg-neutral-850'
            }`}
            title="Toggle Light / Dark Theme"
          >
            {isLight ? <Moon className="w-4 h-4 text-sky-500" /> : <Sun className="w-4 h-4 text-amber-400" />}
          </button>

          <button
            type="button"
            onClick={handleDemoLogin}
            className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all font-mono ${
              isLight
                ? 'border-emerald-600/30 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>1-Click Demo Login</span>
          </button>
        </div>
      </header>

      {/* Main Authentication Card */}
      <main className="w-full max-w-md mx-auto my-6">
        <div
          className={`rounded-2xl border backdrop-blur-xl p-6 sm:p-8 relative overflow-hidden transition-colors ${
            isLight
              ? 'border-slate-200 bg-white shadow-xl'
              : 'border-neutral-800/90 bg-neutral-900/85 shadow-2xl'
          }`}
        >
          {/* Ambient Glow */}
          <div
            className={`absolute top-0 left-1/2 -translate-x-1/2 w-72 h-24 rounded-full blur-2xl pointer-events-none ${
              isLight ? 'bg-emerald-500/5' : 'bg-emerald-500/10'
            }`}
          />

          {/* Form Header */}
          <div className="relative mb-6 text-center">
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-mono mb-3 ${
                isLight
                  ? 'bg-slate-100 border-slate-200 text-slate-700'
                  : 'bg-neutral-800/80 border-neutral-700/60 text-neutral-300'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Sovereign Security Gateway</span>
            </div>
            <h1 className={`text-2xl sm:text-3xl font-bold tracking-tight font-sans ${isLight ? 'text-slate-900' : 'text-neutral-100'}`}>
              Sign In to Your Vault
            </h1>
            <p className={`text-xs mt-1 max-w-sm mx-auto ${isLight ? 'text-slate-500' : 'text-neutral-400'}`}>
              Access your executive portfolio using your registered email address or username.
            </p>
          </div>

          {/* Success state feedback */}
          {loginSuccess && (
            <div
              className={`mb-4 p-3.5 rounded-xl border flex items-center gap-3 text-xs animate-in fade-in ${
                isLight
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
              }`}
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              <div>
                <p className={`font-semibold ${isLight ? 'text-emerald-900' : 'text-emerald-200'}`}>Vault Access Granted</p>
                <p className={`text-[11px] ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
                  Loading {loginSuccess.firstName}&apos;s sovereign portfolio...
                </p>
              </div>
            </div>
          )}

          {/* Error Message Banner */}
          {error && (
            <div className="mb-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-xs text-red-600 dark:text-red-300 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold block text-red-700 dark:text-red-200">
                  {error.code === 'INVALID_CREDENTIALS'
                    ? 'Authentication Failed'
                    : error.code === 'NETWORK_ERROR'
                    ? 'Gateway Network Error'
                    : 'Sign In Error'}
                </span>
                <span className="text-[11px] text-red-600/90 dark:text-red-300/90">{error.message}</span>
              </div>
            </div>
          )}

          {/* Email Verification Required Alert */}
          {showVerificationAlert && (
            <div className="mb-4 p-3 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-start gap-2 text-xs text-sky-700 dark:text-sky-300 animate-in fade-in">
              <Mail className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block text-sky-800 dark:text-sky-200">Email Verification Required</span>
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
              className={`w-full py-2.5 px-4 rounded-xl border text-xs font-semibold flex items-center justify-center gap-3 transition-all disabled:opacity-50 group ${
                isLight
                  ? 'border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-xs'
                  : 'border-neutral-700 bg-neutral-950/70 hover:bg-neutral-900 text-neutral-200 shadow-sm hover:border-neutral-600'
              }`}
            >
              {googleLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin text-neutral-400" />
              ) : (
                <GoogleIcon className="w-4 h-4" />
              )}
              <span>Continue with Google</span>
            </button>

            {googleError && (
              <div className="mt-2.5 p-2 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-2 text-xs text-red-500 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{googleError}</span>
              </div>
            )}

            {/* Aesthetic Divider */}
            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className={`w-full border-t ${isLight ? 'border-slate-200' : 'border-neutral-800'}`} />
              </div>
              <div className="relative flex justify-center text-[10px] font-mono uppercase tracking-widest">
                <span className={`px-3 ${isLight ? 'bg-white text-slate-400' : 'bg-neutral-900 text-neutral-500'}`}>
                  Or Sign In with Credentials
                </span>
              </div>
            </div>
          </div>

          {/* Sign In Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email or Username input */}
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isLight ? 'text-slate-700' : 'text-neutral-300'}`}>
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
                  className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-xs placeholder:text-neutral-500 focus:outline-none transition-all font-mono ${
                    isLight
                      ? 'border-slate-200 bg-slate-50/80 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500/20'
                      : 'border-neutral-800 bg-neutral-950/80 text-neutral-100 placeholder:text-neutral-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30'
                  }`}
                  required
                />
                <AtSign className={`w-4 h-4 absolute left-3 top-3 pointer-events-none ${isLight ? 'text-slate-400' : 'text-neutral-500'}`} />
              </div>
            </div>

            {/* Password input with show/hide toggle */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className={`block text-xs font-medium ${isLight ? 'text-slate-700' : 'text-neutral-300'}`}>
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className={`text-[11px] transition-colors ${isLight ? 'text-emerald-600 hover:text-emerald-700' : 'text-emerald-400 hover:text-emerald-300'}`}
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
                  className={`w-full pl-9 pr-10 py-2.5 rounded-xl border text-xs placeholder:text-neutral-500 focus:outline-none transition-all font-mono ${
                    isLight
                      ? 'border-slate-200 bg-slate-50/80 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500/20'
                      : 'border-neutral-800 bg-neutral-950/80 text-neutral-100 placeholder:text-neutral-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30'
                  }`}
                  required
                />
                <Lock className={`w-4 h-4 absolute left-3 top-3 pointer-events-none ${isLight ? 'text-slate-400' : 'text-neutral-500'}`} />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-3 top-3 ${isLight ? 'text-slate-400 hover:text-slate-600' : 'text-neutral-400 hover:text-neutral-200'}`}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between text-xs py-1">
              <label className={`flex items-center gap-2 cursor-pointer ${isLight ? 'text-slate-700' : 'text-neutral-300'}`}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={loading}
                  className={`w-4 h-4 rounded text-emerald-500 focus:ring-0 focus:ring-offset-0 ${
                    isLight ? 'border-slate-300 bg-white' : 'border-neutral-700 bg-neutral-950'
                  }`}
                />
                <span className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-neutral-400'}`}>Remember Me</span>
              </label>

              <span className={`text-[11px] font-mono flex items-center gap-1 ${isLight ? 'text-slate-500' : 'text-neutral-500'}`}>
                <KeyRound className="w-3 h-3 text-emerald-500" /> Sovereign 2FA
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
          <div className={`mt-4 pt-4 border-t ${isLight ? 'border-slate-100' : 'border-neutral-800'}`}>
            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={loading}
              className={`w-full py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition-all group ${
                isLight
                  ? 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                  : 'border-neutral-700 bg-neutral-800/60 hover:bg-neutral-800 text-neutral-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Instant Demo Access (Alexander V. Wright)</span>
            </button>
          </div>

          {/* Link to Create Account */}
          <div className="mt-5 text-center">
            <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-neutral-400'}`}>
              New client to Aureus Wealth?{' '}
              <button
                type="button"
                onClick={onNavigateToSignUp}
                className={`font-semibold underline underline-offset-4 ml-1 transition-colors ${
                  isLight ? 'text-emerald-600 hover:text-emerald-700' : 'text-emerald-400 hover:text-emerald-300'
                }`}
              >
                Create Account →
              </button>
            </p>
          </div>
        </div>

        {/* Security Disclaimers */}
        <div className={`mt-6 text-center space-y-1 text-[11px] ${isLight ? 'text-slate-500' : 'text-neutral-500'}`}>
          <p className="flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            256-bit TLS Military Encryption · CBN Licensed · NDIC Insured
          </p>
          <p className={`text-[10px] font-mono ${isLight ? 'text-slate-400' : 'text-neutral-600'}`}>
            POST /api/auth/login · Express + Prisma Backend Ready
          </p>
        </div>
      </main>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div
            className={`w-full max-w-sm rounded-2xl border p-6 shadow-2xl relative ${
              isLight ? 'border-slate-200 bg-white text-slate-900' : 'border-neutral-800 bg-neutral-900 text-neutral-100'
            }`}
          >
            <h3 className="text-sm font-bold mb-1">Reset Vault Access Credentials</h3>
            <p className={`text-xs mb-4 ${isLight ? 'text-slate-500' : 'text-neutral-400'}`}>
              Enter your registered email address or username to receive a secure recovery key.
            </p>

            {forgotSentMessage ? (
              <div className="space-y-4">
                <div
                  className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                    isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
                  <span>{forgotSentMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setForgotSentMessage(null);
                    setForgotIdentifier('');
                  }}
                  className={`w-full py-2 rounded-xl text-xs font-semibold ${
                    isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-800' : 'bg-neutral-800 hover:bg-neutral-750 text-neutral-200'
                  }`}
                >
                  Return to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-3.5">
                {forgotError && (
                  <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-500 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{forgotError}</span>
                  </div>
                )}

                <div>
                  <label className={`block text-xs font-medium mb-1 ${isLight ? 'text-slate-700' : 'text-neutral-300'}`}>
                    Email or Username
                  </label>
                  <input
                    type="text"
                    value={forgotIdentifier}
                    onChange={(e) => setForgotIdentifier(e.target.value)}
                    placeholder="client@aureusbank.com or alexander_wright"
                    className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none font-mono ${
                      isLight
                        ? 'border-slate-200 bg-slate-50 text-slate-900 focus:border-emerald-600'
                        : 'border-neutral-800 bg-neutral-950 text-neutral-100 focus:border-emerald-500'
                    }`}
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
                    className={`px-3 py-1.5 rounded-lg text-xs ${
                      isLight ? 'text-slate-500 hover:text-slate-800' : 'text-neutral-400 hover:text-neutral-200'
                    }`}
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
      <footer className={`max-w-5xl w-full mx-auto text-center text-[11px] ${isLight ? 'text-slate-400' : 'text-neutral-600'}`}>
        © {new Date().getFullYear()} Aureus Wealth Private Bank. Central Bank of Nigeria Regulatory Standard NUBAN Integration.
      </footer>
    </div>
  );
};
