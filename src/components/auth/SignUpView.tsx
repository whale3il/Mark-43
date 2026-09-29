import React, { useState } from 'react';
import {
  ShieldCheck,
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Sun,
  Moon,
  AtSign,
  KeyRound,
  RefreshCw,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { GoogleIcon } from './GoogleIcon';
import { AuthService } from '../../services/authService';
import { AuthUser, UserRegistrationPayload } from '../../types/auth';

interface SignUpViewProps {
  onSuccess: (user: AuthUser) => void;
  onNavigateToLogin: () => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

type RegistrationStatus =
  | 'idle'
  | 'loading'
  | 'email_verification_required'
  | 'success'
  | 'network_error';

export const SignUpView: React.FC<SignUpViewProps> = ({
  onSuccess,
  onNavigateToLogin,
  theme,
  toggleTheme
}) => {
  // Form fields (collects exactly what was requested)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });

  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Field touch tracking for inline errors
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Auth UI state
  const [status, setStatus] = useState<RegistrationStatus>('idle');
  const [serverError, setServerError] = useState<{
    code: string;
    message: string;
    field?: string;
  } | null>(null);

  // Google auth state
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  // Email verification simulation state
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationSending, setVerificationSending] = useState(false);
  const [verificationSuccess, setVerificationSuccess] = useState(false);

  // Success registered user state
  const [registeredUser, setRegisteredUser] = useState<AuthUser | null>(null);

  // Prevent duplicate submissions guard
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form field change handler
  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (serverError?.field === field) {
      setServerError(null);
    }
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  // Validation rules
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  const phoneClean = formData.phone.replace(/[\s()-]/g, '');
  const isPhoneValid = /^\+?[0-9]{8,16}$/.test(phoneClean);

  // Password strength calculation
  const hasMinLength = formData.password.length >= 8;
  const hasUpper = /[A-Z]/.test(formData.password);
  const hasLower = /[a-z]/.test(formData.password);
  const hasNumber = /[0-9]/.test(formData.password);
  const hasSpecial = /[^A-Za-z0-9]/.test(formData.password);

  const passedCriteria = [hasMinLength, hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;
  const isPasswordStrong = hasMinLength && (passedCriteria >= 3);

  const getPasswordStrengthLabel = () => {
    if (!formData.password) return { label: 'Empty', color: 'bg-neutral-800', text: 'text-neutral-500' };
    if (passedCriteria <= 2) return { label: 'Weak', color: 'bg-red-500', text: 'text-red-400' };
    if (passedCriteria === 3 || passedCriteria === 4) return { label: 'Moderate', color: 'bg-amber-400', text: 'text-amber-400' };
    return { label: 'Private Bank Standard', color: 'bg-emerald-400', text: 'text-emerald-400' };
  };

  const strength = getPasswordStrengthLabel();

  // Inline errors evaluation
  const errors: Record<string, string> = {};

  if (touched.firstName && !formData.firstName.trim()) {
    errors.firstName = 'First name is required.';
  }
  if (touched.lastName && !formData.lastName.trim()) {
    errors.lastName = 'Last name is required.';
  }
  if (touched.username) {
    if (!formData.username.trim()) {
      errors.username = 'Username is required.';
    } else if (!usernameRegex.test(formData.username.trim())) {
      errors.username = 'Username must be 3-20 characters with letters, numbers, or underscores only.';
    }
  }
  if (touched.email) {
    if (!formData.email.trim()) {
      errors.email = 'Email address is required.';
    } else if (!emailRegex.test(formData.email.trim())) {
      errors.email = 'Please provide a valid corporate or personal email address.';
    }
  }
  if (touched.phone) {
    if (!formData.phone.trim()) {
      errors.phone = 'Contact phone number is required.';
    } else if (!isPhoneValid) {
      errors.phone = 'Please enter a valid phone number with country prefix (e.g. +234 803 123 4567).';
    }
  }
  if (touched.password) {
    if (!formData.password) {
      errors.password = 'Account password is required.';
    } else if (!hasMinLength) {
      errors.password = 'Password must be at least 8 characters in length.';
    } else if (!isPasswordStrong) {
      errors.password = 'Include a combination of uppercase, lowercase, numbers, and symbols.';
    }
  }
  if (touched.confirmPassword) {
    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Confirmation password is required.';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match. Please verify.';
    }
  }
  if (touched.agreedToTerms && !agreedToTerms) {
    errors.agreedToTerms = 'You must accept the terms & conditions to open a private vault.';
  }

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all as touched to display errors
    setTouched({
      firstName: true,
      lastName: true,
      username: true,
      email: true,
      phone: true,
      password: true,
      confirmPassword: true,
      agreedToTerms: true
    });

    setServerError(null);

    // Validate fields before sending
    if (
      !formData.firstName.trim() ||
      !formData.lastName.trim() ||
      !usernameRegex.test(formData.username.trim()) ||
      !emailRegex.test(formData.email.trim()) ||
      !isPhoneValid ||
      !isPasswordStrong ||
      formData.password !== formData.confirmPassword ||
      !agreedToTerms
    ) {
      return;
    }

    // Idempotency: Prevent duplicate simultaneous submissions
    if (isSubmitting || status === 'loading') return;

    setIsSubmitting(true);
    setStatus('loading');

    // Registration payload exactly as requested:
    // { firstName, lastName, username, email, phone, password }
    const payload: UserRegistrationPayload = {
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      username: formData.username.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      password: formData.password
    };

    try {
      const response = await AuthService.register(payload);

      if (response.success && response.user) {
        setRegisteredUser(response.user);
        setStatus('success');
      } else {
        setStatus('idle');
        if (response.error) {
          setServerError({
            code: response.error.code,
            message: response.error.message,
            field: response.error.field
          });
        } else {
          setServerError({
            code: 'SERVER_ERROR',
            message: response.message || 'Unable to complete sovereign registration. Please try again.'
          });
        }
      }
    } catch {
      setStatus('network_error');
      setServerError({
        code: 'NETWORK_ERROR',
        message: 'Network communication failure. Unable to reach the secure private banking gateway.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Google Sign Up Handler
  const handleGoogleSignUp = async () => {
    if (googleLoading) return;
    setGoogleLoading(true);
    setGoogleError(null);

    try {
      const response = await AuthService.loginWithGoogle({
        token: `google-oauth-token-${Date.now()}`
      });

      if (response.success && response.user) {
        onSuccess(response.user);
      } else {
        setGoogleError(response.error?.message || 'Google authorization failed.');
      }
    } catch {
      setGoogleError('Failed to communicate with Google Identity Services. Please try standard sign up.');
    } finally {
      setGoogleLoading(false);
    }
  };

  // Email verification simulation handler
  const handleVerifyEmail = async () => {
    if (!verificationCode) return;
    setVerificationSending(true);
    try {
      const res = await AuthService.verifyEmail({
        email: formData.email,
        token: verificationCode
      });
      if (res.success && registeredUser) {
        setVerificationSuccess(true);
        setTimeout(() => {
          onSuccess(registeredUser);
        }, 1200);
      }
    } finally {
      setVerificationSending(false);
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
            onClick={onNavigateToLogin}
            className={`text-xs py-1.5 px-3 rounded-lg border transition-colors ${
              isLight
                ? 'text-slate-600 hover:text-slate-900 border-slate-200 hover:border-slate-300 bg-white'
                : 'text-neutral-400 hover:text-neutral-200 border-neutral-800 hover:border-neutral-700 bg-neutral-900/50'
            }`}
          >
            Sign In Instead →
          </button>
        </div>
      </header>

      {/* Main Registration Card / Dynamic States */}
      <main className="w-full max-w-xl mx-auto my-6">
        <div
          className={`rounded-2xl border backdrop-blur-xl p-6 sm:p-8 relative overflow-hidden transition-colors ${
            isLight
              ? 'border-slate-200 bg-white shadow-xl'
              : 'border-neutral-800/90 bg-neutral-900/85 shadow-2xl'
          }`}
        >
          {/* Subtle Ambient Radial Glow */}
          <div
            className={`absolute top-0 right-1/4 w-80 h-32 rounded-full blur-3xl pointer-events-none ${
              isLight ? 'bg-emerald-500/5' : 'bg-emerald-500/10'
            }`}
          />

          {/* STATE: SUCCESSFUL REGISTRATION */}
          {status === 'success' && registeredUser && (
            <div className="py-6 text-center animate-in fade-in zoom-in-95 duration-200">
              <div
                className={`w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center ${
                  isLight
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-600'
                    : 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shadow-lg shadow-emerald-500/10'
                }`}
              >
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className={`text-2xl font-bold tracking-tight font-sans mb-1 ${isLight ? 'text-slate-900' : 'text-neutral-100'}`}>
                Account Successfully Created
              </h2>
              <p className={`text-xs max-w-md mx-auto mb-6 ${isLight ? 'text-slate-500' : 'text-neutral-400'}`}>
                Welcome, {registeredUser.firstName}. Your private sovereign account has been cleared and activated.
              </p>

              {/* Account Credentials Card */}
              <div
                className={`max-w-md mx-auto p-4 rounded-xl border text-left mb-6 space-y-3 font-mono text-xs ${
                  isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-neutral-950/80 border-neutral-800 text-neutral-200'
                }`}
              >
                <div className={`flex items-center justify-between pb-2 border-b ${isLight ? 'border-slate-200' : 'border-neutral-800/80'}`}>
                  <span className={`uppercase text-[10px] ${isLight ? 'text-slate-400' : 'text-neutral-500'}`}>Client Name</span>
                  <span className={`font-semibold ${isLight ? 'text-slate-900' : 'text-neutral-200'}`}>{registeredUser.name}</span>
                </div>
                <div className={`flex items-center justify-between pb-2 border-b ${isLight ? 'border-slate-200' : 'border-neutral-800/80'}`}>
                  <span className={`uppercase text-[10px] ${isLight ? 'text-slate-400' : 'text-neutral-500'}`}>Sovereign Username</span>
                  <span className={`font-semibold ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>@{registeredUser.username}</span>
                </div>
                <div className={`flex items-center justify-between pb-2 border-b ${isLight ? 'border-slate-200' : 'border-neutral-800/80'}`}>
                  <span className={`uppercase text-[10px] ${isLight ? 'text-slate-400' : 'text-neutral-500'}`}>Primary Account</span>
                  <span className={`font-bold tracking-wider ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>{registeredUser.primaryAccountNumber}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`uppercase text-[10px] ${isLight ? 'text-slate-400' : 'text-neutral-500'}`}>Regulatory Status</span>
                  <span className={`flex items-center gap-1 text-[11px] ${isLight ? 'text-slate-600' : 'text-neutral-300'}`}>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Tier 3 Private Operational
                  </span>
                </div>
              </div>

              <div className="space-y-3 max-w-md mx-auto">
                <button
                  type="button"
                  onClick={() => onSuccess(registeredUser)}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.99]"
                >
                  <span>Launch Sovereign Executive Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STATE: EMAIL VERIFICATION REQUIRED */}
          {status === 'email_verification_required' && (
            <div className="py-6 text-center animate-in fade-in duration-200">
              <div
                className={`w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center ${
                  isLight ? 'bg-sky-50 border border-sky-200 text-sky-600' : 'bg-sky-500/15 border border-sky-500/30 text-sky-400'
                }`}
              >
                <Mail className="w-7 h-7" />
              </div>
              <h2 className={`text-xl font-bold tracking-tight font-sans mb-1 ${isLight ? 'text-slate-900' : 'text-neutral-100'}`}>
                Email Verification Required
              </h2>
              <p className={`text-xs max-w-md mx-auto mb-6 ${isLight ? 'text-slate-500' : 'text-neutral-400'}`}>
                A 6-digit confirmation security token was dispatched to{' '}
                <span className={`font-mono font-medium ${isLight ? 'text-slate-900' : 'text-neutral-200'}`}>
                  {formData.email || 'your email address'}
                </span>.
              </p>

              {verificationSuccess ? (
                <div
                  className={`p-4 rounded-xl border text-xs flex items-center justify-center gap-2 mb-6 ${
                    isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Cryptographic token verified. Forwarding to dashboard...</span>
                </div>
              ) : (
                <div className="max-w-sm mx-auto space-y-4 mb-6">
                  <div>
                    <label className={`block text-left text-xs font-medium mb-1.5 ${isLight ? 'text-slate-600' : 'text-neutral-400'}`}>
                      Enter 6-Digit Token or Demo Code (123456)
                    </label>
                    <input
                      type="text"
                      maxLength={8}
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      placeholder="e.g. 123456"
                      className={`w-full text-center tracking-[0.3em] font-mono text-base py-2.5 rounded-xl border focus:outline-none ${
                        isLight
                          ? 'border-slate-200 bg-slate-50 text-slate-900 focus:border-emerald-600'
                          : 'border-neutral-800 bg-neutral-950 text-neutral-100 focus:border-emerald-500'
                      }`}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleVerifyEmail}
                    disabled={verificationSending || !verificationCode}
                    className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    {verificationSending ? (
                      <span className="inline-flex items-center gap-2">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Verifying...
                      </span>
                    ) : (
                      'Confirm Verification Token'
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (registeredUser) onSuccess(registeredUser);
                      else setStatus('idle');
                    }}
                    className={`text-xs underline ${isLight ? 'text-slate-500 hover:text-slate-800' : 'text-neutral-400 hover:text-neutral-200'}`}
                  >
                    Skip for now and enter dashboard
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STATE: NORMAL FORM & SUBMISSION */}
          {status !== 'success' && status !== 'email_verification_required' && (
            <>
              {/* Header */}
              <div className="mb-6 text-center">
                <div
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-mono mb-3 ${
                    isLight
                      ? 'bg-slate-100 border-slate-200 text-slate-700'
                      : 'bg-neutral-800/80 border-neutral-700/60 text-neutral-300'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Sovereign Client Registration</span>
                </div>
                <h1 className={`text-2xl sm:text-3xl font-bold tracking-tight font-sans ${isLight ? 'text-slate-900' : 'text-neutral-100'}`}>
                  Open Private Bank Account
                </h1>
                <p className={`text-xs mt-1.5 max-w-md mx-auto ${isLight ? 'text-slate-500' : 'text-neutral-400'}`}>
                  Create your institutional private banking credentials and provision your portfolio.
                </p>
              </div>

              {/* Prominent Continue with Google Button */}
              <div className="mb-6">
                <button
                  type="button"
                  onClick={handleGoogleSignUp}
                  disabled={googleLoading || isSubmitting}
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
                  <div className="mt-2.5 p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-2 text-xs text-red-500 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{googleError}</span>
                  </div>
                )}

                {/* Aesthetic Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className={`w-full border-t ${isLight ? 'border-slate-200' : 'border-neutral-800'}`} />
                  </div>
                  <div className="relative flex justify-center text-[10px] font-mono uppercase tracking-widest">
                    <span className={`px-3 ${isLight ? 'bg-white text-slate-400' : 'bg-neutral-900 text-neutral-500'}`}>
                      Or Register with Sovereign Credentials
                    </span>
                  </div>
                </div>
              </div>

              {/* Server-Level Error Banners (Email already registered / Username already taken / Network error) */}
              {serverError && (
                <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start justify-between gap-3 text-xs text-red-600 dark:text-red-300 animate-in fade-in">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold block text-red-700 dark:text-red-200">
                        {serverError.code === 'EMAIL_EXISTS'
                          ? 'Email Address Already Registered'
                          : serverError.code === 'USERNAME_TAKEN'
                          ? 'Username Already Claimed'
                          : serverError.code === 'NETWORK_ERROR'
                          ? 'Private Banking Gateway Network Error'
                          : 'Registration Error'}
                      </span>
                      <span className="text-[11px] text-red-600/90 dark:text-red-300/90">{serverError.message}</span>
                    </div>
                  </div>

                  {serverError.code === 'EMAIL_EXISTS' && (
                    <button
                      type="button"
                      onClick={onNavigateToLogin}
                      className="px-2.5 py-1 rounded bg-red-500/20 text-red-700 dark:text-red-200 text-[11px] font-semibold hover:bg-red-500/30 transition-colors shrink-0"
                    >
                      Sign In →
                    </button>
                  )}

                  {serverError.code === 'NETWORK_ERROR' && (
                    <button
                      type="button"
                      onClick={handleSubmit}
                      className="px-2.5 py-1 rounded bg-red-500/20 text-red-700 dark:text-red-200 text-[11px] font-semibold hover:bg-red-500/30 transition-colors shrink-0"
                    >
                      Retry
                    </button>
                  )}
                </div>
              )}

              {/* Exact Registration Form */}
              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                {/* 1 & 2: First Name and Last Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className={`block text-xs font-medium mb-1 ${isLight ? 'text-slate-700' : 'text-neutral-300'}`}>
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={(e) => handleChange('firstName', e.target.value)}
                        onBlur={() => handleBlur('firstName')}
                        placeholder="Alexander"
                        disabled={isSubmitting}
                        className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-xs placeholder:text-neutral-500 focus:outline-none transition-all font-sans ${
                          errors.firstName || serverError?.field === 'firstName'
                            ? 'border-red-500/70 focus:border-red-500 bg-red-500/5'
                            : isLight
                            ? 'border-slate-200 bg-slate-50/80 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500/20'
                            : 'border-neutral-800 bg-neutral-950/80 text-neutral-100 placeholder:text-neutral-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30'
                        }`}
                      />
                      <User className={`w-4 h-4 absolute left-3 top-3 pointer-events-none ${isLight ? 'text-slate-400' : 'text-neutral-500'}`} />
                    </div>
                    {errors.firstName && (
                      <p className="mt-1 text-[11px] text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        {errors.firstName}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className={`block text-xs font-medium mb-1 ${isLight ? 'text-slate-700' : 'text-neutral-300'}`}>
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={(e) => handleChange('lastName', e.target.value)}
                        onBlur={() => handleBlur('lastName')}
                        placeholder="Wright"
                        disabled={isSubmitting}
                        className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-xs placeholder:text-neutral-500 focus:outline-none transition-all font-sans ${
                          errors.lastName || serverError?.field === 'lastName'
                            ? 'border-red-500/70 focus:border-red-500 bg-red-500/5'
                            : isLight
                            ? 'border-slate-200 bg-slate-50/80 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500/20'
                            : 'border-neutral-800 bg-neutral-950/80 text-neutral-100 placeholder:text-neutral-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30'
                        }`}
                      />
                      <User className={`w-4 h-4 absolute left-3 top-3 pointer-events-none ${isLight ? 'text-slate-400' : 'text-neutral-500'}`} />
                    </div>
                    {errors.lastName && (
                      <p className="mt-1 text-[11px] text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        {errors.lastName}
                      </p>
                    )}
                  </div>
                </div>

                {/* 3: Username */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className={`block text-xs font-medium ${isLight ? 'text-slate-700' : 'text-neutral-300'}`}>
                      Sovereign Username <span className="text-red-500">*</span>
                    </label>
                    <span className={`text-[10px] font-mono ${isLight ? 'text-slate-400' : 'text-neutral-500'}`}>
                      Used for wire routing & sign in
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={(e) => handleChange('username', e.target.value.toLowerCase().replace(/\s+/g, ''))}
                      onBlur={() => handleBlur('username')}
                      placeholder="alexander_wright"
                      disabled={isSubmitting}
                      className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-xs placeholder:text-neutral-500 focus:outline-none transition-all font-mono ${
                        errors.username || serverError?.field === 'username'
                          ? 'border-red-500/70 focus:border-red-500 bg-red-500/5'
                          : isLight
                          ? 'border-slate-200 bg-slate-50/80 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500/20'
                          : 'border-neutral-800 bg-neutral-950/80 text-neutral-100 placeholder:text-neutral-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30'
                      }`}
                    />
                    <AtSign className={`w-4 h-4 absolute left-3 top-3 pointer-events-none ${isLight ? 'text-slate-400' : 'text-neutral-500'}`} />
                  </div>
                  {errors.username && (
                    <p className="mt-1 text-[11px] text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      {errors.username}
                    </p>
                  )}
                </div>

                {/* 4: Email Address */}
                <div>
                  <label className={`block text-xs font-medium mb-1 ${isLight ? 'text-slate-700' : 'text-neutral-300'}`}>
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      onBlur={() => handleBlur('email')}
                      placeholder="client@aureusbank.com"
                      disabled={isSubmitting}
                      className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-xs placeholder:text-neutral-500 focus:outline-none transition-all font-mono ${
                        errors.email || serverError?.field === 'email'
                          ? 'border-red-500/70 focus:border-red-500 bg-red-500/5'
                          : isLight
                          ? 'border-slate-200 bg-slate-50/80 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500/20'
                          : 'border-neutral-800 bg-neutral-950/80 text-neutral-100 placeholder:text-neutral-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30'
                      }`}
                    />
                    <Mail className={`w-4 h-4 absolute left-3 top-3 pointer-events-none ${isLight ? 'text-slate-400' : 'text-neutral-500'}`} />
                  </div>
                  {errors.email && (
                    <p className="mt-1 text-[11px] text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      {errors.email}
                    </p>
                  )}
                </div>

                {/* 5: Phone Number */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className={`block text-xs font-medium ${isLight ? 'text-slate-700' : 'text-neutral-300'}`}>
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <span className={`text-[10px] font-mono ${isLight ? 'text-slate-400' : 'text-neutral-500'}`}>
                      Include country code
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      onBlur={() => handleBlur('phone')}
                      placeholder="+234 803 123 4567 or +1 415 555 0199"
                      disabled={isSubmitting}
                      className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-xs placeholder:text-neutral-500 focus:outline-none transition-all font-mono ${
                        errors.phone || serverError?.field === 'phone'
                          ? 'border-red-500/70 focus:border-red-500 bg-red-500/5'
                          : isLight
                          ? 'border-slate-200 bg-slate-50/80 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500/20'
                          : 'border-neutral-800 bg-neutral-950/80 text-neutral-100 placeholder:text-neutral-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30'
                      }`}
                    />
                    <Phone className={`w-4 h-4 absolute left-3 top-3 pointer-events-none ${isLight ? 'text-slate-400' : 'text-neutral-500'}`} />
                  </div>
                  {errors.phone && (
                    <p className="mt-1 text-[11px] text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      {errors.phone}
                    </p>
                  )}
                </div>

                {/* 6 & 7: Password and Confirm Password */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className={`block text-xs font-medium mb-1 ${isLight ? 'text-slate-700' : 'text-neutral-300'}`}>
                      Account Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={formData.password}
                        onChange={(e) => handleChange('password', e.target.value)}
                        onBlur={() => handleBlur('password')}
                        placeholder="••••••••••••"
                        disabled={isSubmitting}
                        className={`w-full pl-9 pr-10 py-2.5 rounded-xl border text-xs placeholder:text-neutral-500 focus:outline-none transition-all font-mono ${
                          errors.password || serverError?.field === 'password'
                            ? 'border-red-500/70 focus:border-red-500 bg-red-500/5'
                            : isLight
                            ? 'border-slate-200 bg-slate-50/80 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500/20'
                            : 'border-neutral-800 bg-neutral-950/80 text-neutral-100 placeholder:text-neutral-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30'
                        }`}
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

                    {/* Password Strength Meter */}
                    {formData.password && (
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className={isLight ? 'text-slate-500' : 'text-neutral-500'}>Security Strength:</span>
                          <span className={`font-mono font-medium ${strength.text}`}>{strength.label}</span>
                        </div>
                        <div className={`w-full h-1 rounded-full overflow-hidden flex gap-1 ${isLight ? 'bg-slate-200' : 'bg-neutral-800'}`}>
                          <div className={`h-full flex-1 rounded-full ${passedCriteria >= 1 ? strength.color : 'bg-transparent'}`} />
                          <div className={`h-full flex-1 rounded-full ${passedCriteria >= 3 ? strength.color : 'bg-transparent'}`} />
                          <div className={`h-full flex-1 rounded-full ${passedCriteria >= 4 ? strength.color : 'bg-transparent'}`} />
                          <div className={`h-full flex-1 rounded-full ${passedCriteria >= 5 ? strength.color : 'bg-transparent'}`} />
                        </div>
                      </div>
                    )}

                    {errors.password && (
                      <p className="mt-1 text-[11px] text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        {errors.password}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className={`block text-xs font-medium mb-1 ${isLight ? 'text-slate-700' : 'text-neutral-300'}`}>
                      Confirm Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={(e) => handleChange('confirmPassword', e.target.value)}
                        onBlur={() => handleBlur('confirmPassword')}
                        placeholder="••••••••••••"
                        disabled={isSubmitting}
                        className={`w-full pl-9 pr-10 py-2.5 rounded-xl border text-xs placeholder:text-neutral-500 focus:outline-none transition-all font-mono ${
                          errors.confirmPassword
                            ? 'border-red-500/70 focus:border-red-500 bg-red-500/5'
                            : isLight
                            ? 'border-slate-200 bg-slate-50/80 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500/20'
                            : 'border-neutral-800 bg-neutral-950/80 text-neutral-100 placeholder:text-neutral-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30'
                        }`}
                      />
                      <KeyRound className={`w-4 h-4 absolute left-3 top-3 pointer-events-none ${isLight ? 'text-slate-400' : 'text-neutral-500'}`} />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className={`absolute right-3 top-3 ${isLight ? 'text-slate-400 hover:text-slate-600' : 'text-neutral-400 hover:text-neutral-200'}`}
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {errors.confirmPassword && (
                      <p className="mt-1 text-[11px] text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        {errors.confirmPassword}
                      </p>
                    )}
                  </div>
                </div>

                {/* Terms and Conditions Checkbox */}
                <div className="pt-2">
                  <label className="flex items-start gap-2.5 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={(e) => {
                        setAgreedToTerms(e.target.checked);
                        if (errors.agreedToTerms) {
                          setTouched((prev) => ({ ...prev, agreedToTerms: true }));
                        }
                      }}
                      disabled={isSubmitting}
                      className={`w-4 h-4 mt-0.5 rounded text-emerald-500 focus:ring-0 focus:ring-offset-0 ${
                        isLight ? 'border-slate-300 bg-white' : 'border-neutral-700 bg-neutral-950'
                      }`}
                    />
                    <span className={`text-[11px] leading-relaxed ${isLight ? 'text-slate-600' : 'text-neutral-400'}`}>
                      I agree to the{' '}
                      <span className={isLight ? 'text-emerald-700 hover:underline' : 'text-emerald-400 hover:underline'}>
                        Terms & Conditions
                      </span>, acknowledge the{' '}
                      <span className={isLight ? 'text-emerald-700 hover:underline' : 'text-emerald-400 hover:underline'}>
                        Privacy Policy
                      </span>, and consent to regulatory sovereign verification.
                    </span>
                  </label>
                  {errors.agreedToTerms && (
                    <p className="mt-1 text-[11px] text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      {errors.agreedToTerms}
                    </p>
                  )}
                </div>

                {/* Submit Button with Loading State & Duplicate Prevention */}
                <button
                  type="submit"
                  disabled={isSubmitting || status === 'loading'}
                  className="w-full py-3 px-4 mt-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {status === 'loading' || isSubmitting ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
                      <span>Provisioning Sovereign Account...</span>
                    </span>
                  ) : (
                    <>
                      <span>Open Account & Activate Portfolio</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Sign In Link */}
              <div className={`mt-6 pt-5 border-t text-center ${isLight ? 'border-slate-100' : 'border-neutral-800'}`}>
                <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-neutral-400'}`}>
                  Already registered with Aureus Wealth?{' '}
                  <button
                    type="button"
                    onClick={onNavigateToLogin}
                    className={`font-semibold underline underline-offset-4 ml-1 transition-colors ${
                      isLight ? 'text-emerald-700 hover:text-emerald-800' : 'text-emerald-400 hover:text-emerald-300'
                    }`}
                  >
                    Sign In to Vault →
                  </button>
                </p>
              </div>
            </>
          )}
        </div>

        {/* Security Disclaimers */}
        <div className={`mt-6 text-center space-y-1 text-[11px] ${isLight ? 'text-slate-500' : 'text-neutral-500'}`}>
          <p className="flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            256-bit TLS Military Encryption · CBN Licensed · NDIC Insured Clearing
          </p>
          <p className={`text-[10px] font-mono ${isLight ? 'text-slate-400' : 'text-neutral-600'}`}>
            POST /api/auth/register · Express + Prisma Backend Ready
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className={`max-w-5xl w-full mx-auto text-center text-[11px] ${isLight ? 'text-slate-400' : 'text-neutral-600'}`}>
        © {new Date().getFullYear()} Aureus Wealth Private Bank. Central Bank of Nigeria Regulatory Standard NUBAN Integration.
      </footer>
    </div>
  );
};

