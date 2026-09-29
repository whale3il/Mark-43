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
            onClick={onNavigateToLogin}
            className="text-xs text-neutral-400 hover:text-neutral-200 py-1.5 px-3 rounded-lg border border-neutral-800 hover:border-neutral-700 transition-colors"
          >
            Sign In Instead →
          </button>
        </div>
      </header>

      {/* Main Registration Card / Dynamic States */}
      <main className="w-full max-w-xl mx-auto my-6">
        <div className="rounded-2xl border border-neutral-800/90 bg-neutral-900/85 backdrop-blur-xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          {/* Subtle Ambient Radial Glow */}
          <div className="absolute top-0 right-1/4 w-80 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* STATE: SUCCESSFUL REGISTRATION */}
          {status === 'success' && registeredUser && (
            <div className="py-6 text-center animate-in fade-in zoom-in-95 duration-200">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-neutral-100 font-sans mb-1">
                Account Successfully Created
              </h2>
              <p className="text-xs text-neutral-400 max-w-md mx-auto mb-6">
                Welcome, {registeredUser.firstName}. Your private sovereign account and institutional NUBAN ledger have been cleared and activated.
              </p>

              {/* Account Credentials Card */}
              <div className="max-w-md mx-auto p-4 rounded-xl bg-neutral-950/80 border border-neutral-800 text-left mb-6 space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-neutral-800/80">
                  <span className="text-neutral-500 uppercase text-[10px]">Client Name</span>
                  <span className="text-neutral-200 font-semibold">{registeredUser.name}</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-neutral-800/80">
                  <span className="text-neutral-500 uppercase text-[10px]">Sovereign Username</span>
                  <span className="text-emerald-400 font-semibold">@{registeredUser.username}</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-neutral-800/80">
                  <span className="text-neutral-500 uppercase text-[10px]">Primary NUBAN Account</span>
                  <span className="text-emerald-400 font-bold tracking-wider">{registeredUser.primaryAccountNumber}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500 uppercase text-[10px]">Regulatory Status</span>
                  <span className="text-neutral-300 flex items-center gap-1 text-[11px]">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> CBN Tier 3 Operational
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

                <button
                  type="button"
                  onClick={() => setStatus('email_verification_required')}
                  className="text-xs text-neutral-400 hover:text-emerald-400 transition-colors flex items-center justify-center gap-1 mx-auto"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Verify Email Cryptographic Key</span>
                </button>
              </div>
            </div>
          )}

          {/* STATE: EMAIL VERIFICATION REQUIRED */}
          {status === 'email_verification_required' && (
            <div className="py-6 text-center animate-in fade-in duration-200">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
                <Mail className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-neutral-100 font-sans mb-1">
                Email Verification Required
              </h2>
              <p className="text-xs text-neutral-400 max-w-md mx-auto mb-6">
                A 6-digit confirmation security token was dispatched to{' '}
                <span className="text-neutral-200 font-mono font-medium">{formData.email || 'your email address'}</span>.
              </p>

              {verificationSuccess ? (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-center gap-2 mb-6">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Cryptographic token verified. Forwarding to dashboard...</span>
                </div>
              ) : (
                <div className="max-w-sm mx-auto space-y-4 mb-6">
                  <div>
                    <label className="block text-left text-xs font-medium text-neutral-400 mb-1.5">
                      Enter 6-Digit Token or Demo Code (123456)
                    </label>
                    <input
                      type="text"
                      maxLength={8}
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      placeholder="e.g. 123456"
                      className="w-full text-center tracking-[0.3em] font-mono text-base py-2.5 rounded-xl border border-neutral-800 bg-neutral-950 text-neutral-100 focus:outline-none focus:border-emerald-500"
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
                    className="text-xs text-neutral-400 hover:text-neutral-200 underline"
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
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-800/80 border border-neutral-700/60 text-[11px] font-mono text-neutral-300 mb-3">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Sovereign Client Registration</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-sans text-neutral-100">
                  Open Private Bank Account
                </h1>
                <p className="text-xs text-neutral-400 mt-1.5 max-w-md mx-auto">
                  Create your institutional private banking credentials and provision your unique NUBAN clearing vault.
                </p>
              </div>

              {/* Prominent Continue with Google Button */}
              <div className="mb-6">
                <button
                  type="button"
                  onClick={handleGoogleSignUp}
                  disabled={googleLoading || isSubmitting}
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
                  <div className="mt-2.5 p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-2 text-xs text-red-400 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{googleError}</span>
                  </div>
                )}

                {/* Aesthetic Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-neutral-800" />
                  </div>
                  <div className="relative flex justify-center text-[10px] font-mono uppercase tracking-widest">
                    <span className="bg-neutral-900 px-3 text-neutral-500">
                      Or Register with Sovereign Credentials
                    </span>
                  </div>
                </div>
              </div>

              {/* Server-Level Error Banners (Email already registered / Username already taken / Network error) */}
              {serverError && (
                <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start justify-between gap-3 text-xs text-red-300 animate-in fade-in">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold block text-red-200">
                        {serverError.code === 'EMAIL_EXISTS'
                          ? 'Email Address Already Registered'
                          : serverError.code === 'USERNAME_TAKEN'
                          ? 'Username Already Claimed'
                          : serverError.code === 'NETWORK_ERROR'
                          ? 'Private Banking Gateway Network Error'
                          : 'Registration Error'}
                      </span>
                      <span className="text-[11px] text-red-300/90">{serverError.message}</span>
                    </div>
                  </div>

                  {serverError.code === 'EMAIL_EXISTS' && (
                    <button
                      type="button"
                      onClick={onNavigateToLogin}
                      className="px-2.5 py-1 rounded bg-red-500/20 text-red-200 text-[11px] font-semibold hover:bg-red-500/30 transition-colors shrink-0"
                    >
                      Sign In →
                    </button>
                  )}

                  {serverError.code === 'NETWORK_ERROR' && (
                    <button
                      type="button"
                      onClick={handleSubmit}
                      className="px-2.5 py-1 rounded bg-red-500/20 text-red-200 text-[11px] font-semibold hover:bg-red-500/30 transition-colors shrink-0"
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
                    <label className="block text-xs font-medium text-neutral-300 mb-1">
                      First Name <span className="text-red-400">*</span>
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
                        className={`w-full pl-9 pr-3 py-2.5 rounded-xl border ${
                          errors.firstName || serverError?.field === 'firstName'
                            ? 'border-red-500/70 focus:border-red-500 bg-red-500/5'
                            : 'border-neutral-800 focus:border-emerald-500 bg-neutral-950/80'
                        } text-xs text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 transition-all font-sans`}
                      />
                      <User className="w-4 h-4 text-neutral-500 absolute left-3 top-3 pointer-events-none" />
                    </div>
                    {errors.firstName && (
                      <p className="mt-1 text-[11px] text-red-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        {errors.firstName}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">
                      Last Name <span className="text-red-400">*</span>
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
                        className={`w-full pl-9 pr-3 py-2.5 rounded-xl border ${
                          errors.lastName || serverError?.field === 'lastName'
                            ? 'border-red-500/70 focus:border-red-500 bg-red-500/5'
                            : 'border-neutral-800 focus:border-emerald-500 bg-neutral-950/80'
                        } text-xs text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 transition-all font-sans`}
                      />
                      <User className="w-4 h-4 text-neutral-500 absolute left-3 top-3 pointer-events-none" />
                    </div>
                    {errors.lastName && (
                      <p className="mt-1 text-[11px] text-red-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        {errors.lastName}
                      </p>
                    )}
                  </div>
                </div>

                {/* 3: Username */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-neutral-300">
                      Sovereign Username <span className="text-red-400">*</span>
                    </label>
                    <span className="text-[10px] text-neutral-500 font-mono">Used for wire routing & sign in</span>
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
                      className={`w-full pl-9 pr-3 py-2.5 rounded-xl border ${
                        errors.username || serverError?.field === 'username'
                          ? 'border-red-500/70 focus:border-red-500 bg-red-500/5'
                          : 'border-neutral-800 focus:border-emerald-500 bg-neutral-950/80'
                      } text-xs text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 transition-all font-mono`}
                    />
                    <AtSign className="w-4 h-4 text-neutral-500 absolute left-3 top-3 pointer-events-none" />
                  </div>
                  {errors.username && (
                    <p className="mt-1 text-[11px] text-red-400 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      {errors.username}
                    </p>
                  )}
                </div>

                {/* 4: Email Address */}
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    Email Address <span className="text-red-400">*</span>
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
                      className={`w-full pl-9 pr-3 py-2.5 rounded-xl border ${
                        errors.email || serverError?.field === 'email'
                          ? 'border-red-500/70 focus:border-red-500 bg-red-500/5'
                          : 'border-neutral-800 focus:border-emerald-500 bg-neutral-950/80'
                      } text-xs text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 transition-all font-mono`}
                    />
                    <Mail className="w-4 h-4 text-neutral-500 absolute left-3 top-3 pointer-events-none" />
                  </div>
                  {errors.email && (
                    <p className="mt-1 text-[11px] text-red-400 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      {errors.email}
                    </p>
                  )}
                </div>

                {/* 5: Phone Number */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-neutral-300">
                      Phone Number <span className="text-red-400">*</span>
                    </label>
                    <span className="text-[10px] text-neutral-500 font-mono">Include country code</span>
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
                      className={`w-full pl-9 pr-3 py-2.5 rounded-xl border ${
                        errors.phone || serverError?.field === 'phone'
                          ? 'border-red-500/70 focus:border-red-500 bg-red-500/5'
                          : 'border-neutral-800 focus:border-emerald-500 bg-neutral-950/80'
                      } text-xs text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 transition-all font-mono`}
                    />
                    <Phone className="w-4 h-4 text-neutral-500 absolute left-3 top-3 pointer-events-none" />
                  </div>
                  {errors.phone && (
                    <p className="mt-1 text-[11px] text-red-400 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      {errors.phone}
                    </p>
                  )}
                </div>

                {/* 6 & 7: Password and Confirm Password */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">
                      Account Password <span className="text-red-400">*</span>
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
                        className={`w-full pl-9 pr-10 py-2.5 rounded-xl border ${
                          errors.password || serverError?.field === 'password'
                            ? 'border-red-500/70 focus:border-red-500 bg-red-500/5'
                            : 'border-neutral-800 focus:border-emerald-500 bg-neutral-950/80'
                        } text-xs text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 transition-all font-mono`}
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

                    {/* Password Strength Meter */}
                    {formData.password && (
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-neutral-500">Security Strength:</span>
                          <span className={`font-mono font-medium ${strength.text}`}>{strength.label}</span>
                        </div>
                        <div className="w-full h-1 bg-neutral-800 rounded-full overflow-hidden flex gap-1">
                          <div className={`h-full flex-1 rounded-full ${passedCriteria >= 1 ? strength.color : 'bg-transparent'}`} />
                          <div className={`h-full flex-1 rounded-full ${passedCriteria >= 3 ? strength.color : 'bg-transparent'}`} />
                          <div className={`h-full flex-1 rounded-full ${passedCriteria >= 4 ? strength.color : 'bg-transparent'}`} />
                          <div className={`h-full flex-1 rounded-full ${passedCriteria >= 5 ? strength.color : 'bg-transparent'}`} />
                        </div>
                      </div>
                    )}

                    {errors.password && (
                      <p className="mt-1 text-[11px] text-red-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        {errors.password}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">
                      Confirm Password <span className="text-red-400">*</span>
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
                        className={`w-full pl-9 pr-10 py-2.5 rounded-xl border ${
                          errors.confirmPassword
                            ? 'border-red-500/70 focus:border-red-500 bg-red-500/5'
                            : 'border-neutral-800 focus:border-emerald-500 bg-neutral-950/80'
                        } text-xs text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 transition-all font-mono`}
                      />
                      <KeyRound className="w-4 h-4 text-neutral-500 absolute left-3 top-3 pointer-events-none" />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-3 text-neutral-400 hover:text-neutral-200"
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {errors.confirmPassword && (
                      <p className="mt-1 text-[11px] text-red-400 flex items-center gap-1">
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
                      className="w-4 h-4 mt-0.5 rounded border-neutral-700 bg-neutral-950 text-emerald-500 focus:ring-0 focus:ring-offset-0"
                    />
                    <span className="text-[11px] text-neutral-400 leading-relaxed">
                      I agree to the{' '}
                      <span className="text-emerald-400 hover:underline">Terms & Conditions</span>, acknowledge the{' '}
                      <span className="text-emerald-400 hover:underline">Privacy Policy</span>, and consent to regulatory sovereign verification.
                    </span>
                  </label>
                  {errors.agreedToTerms && (
                    <p className="mt-1 text-[11px] text-red-400 flex items-center gap-1">
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
                      <span>Open Account & Generate NUBAN</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Sign In Link */}
              <div className="mt-6 pt-5 border-t border-neutral-800 text-center">
                <p className="text-xs text-neutral-400">
                  Already registered with Aureus Wealth?{' '}
                  <button
                    type="button"
                    onClick={onNavigateToLogin}
                    className="text-emerald-400 hover:text-emerald-300 font-semibold underline underline-offset-4 ml-1 transition-colors"
                  >
                    Sign In to Vault →
                  </button>
                </p>
              </div>
            </>
          )}
        </div>

        {/* Security Disclaimers */}
        <div className="mt-6 text-center space-y-1 text-[11px] text-neutral-500">
          <p className="flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            256-bit TLS Military Encryption · CBN Licensed · NDIC Insured Clearing
          </p>
          <p className="text-[10px] text-neutral-600 font-mono">
            POST /api/auth/register · Express + Prisma Backend Ready
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-5xl w-full mx-auto text-center text-[11px] text-neutral-600">
        © {new Date().getFullYear()} Aureus Wealth Private Bank. Central Bank of Nigeria Regulatory Standard NUBAN Integration.
      </footer>
    </div>
  );
};
