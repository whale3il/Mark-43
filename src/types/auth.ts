import { CurrencyCode } from './banking';

export type KycTier = 'Tier 1 (Email Verified)' | 'Tier 2' | 'Tier 3 (BVN & ID Verified)';

export interface AuthUser {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  name: string;
  email: string;
  phone: string;
  title?: string;
  clientTier: string;
  kycLevel: KycTier;
  hasTransactionPin: boolean;
  pinMasked?: string;
  primaryAccountNumber: string; 
  accountNumberMasked: string;
  memberSince: string;
  avatarUrl: string;
  emailVerified?: boolean;
  relationshipManager: {
    name: string;
    title: string;
    email: string;
    phone: string;
    office: string;
  };
}

export type AuthMode = 'login' | 'signup';

/**
 * Strict signup flow state sequence: FORM -> VERIFICATION -> SUCCESS
 */
export type SignUpStep = 'FORM' | 'VERIFICATION' | 'SUCCESS';

export interface UserRegistrationPayload {
  email: string;
  password: string;
  username: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface LoginPayload {
  email: string; // Email address or Username
  password: string;
  rememberMe?: boolean;
}

export interface GoogleAuthPayload {
  token: string;
  credential?: string;
}

export interface ForgotPasswordPayload {
  email : string;
}

export interface VerifyEmailPayload {
  email: string;
  token: string; // 6-digit verification code
}

export interface ResendVerificationPayload {
  email: string;
}

export interface BackendUser {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  clientTier: string;
  kycLevel: string;
  emailVerified: boolean;
}

// types/auth.ts

// src/services/authService.ts (or your auth types file)

export interface AuthApiResponse {
  success: boolean;
  message?: string;
  error?: string | AuthApiError;
  token?: string;
  data?: any; // Add data property
  user?: any; // Add user property if you pass user directly
}

export interface AuthApiError {
  code?: string;
  message?: string;
}

export interface PinSetupPayload {
  pin: string;
  confirmPin: string;
  biometricEnabled: boolean;
}

export interface AccountCreationPayload {
  accountType: 'savings' | 'checking' | 'multicurrency' | 'investment';
  accountCategoryTitle: string;
  currency: CurrencyCode;
  accountNickname: string;
  initialDeposit: number;
  dailyTransferLimit: number;
  name?: string;
  type?: 'savings' | 'checking' | 'multicurrency' | 'investment';
  colorTheme?: string;
}

