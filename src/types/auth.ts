import { CurrencyCode } from './banking';

export type KycTier = 'Tier 1' | 'Tier 2' | 'Tier 3 (BVN & ID Verified)';

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
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  phone: string;
  password: string;
}

export interface LoginPayload {
  identifier: string; // Email address or Username
  password: string;
  rememberMe?: boolean;
}

export interface GoogleAuthPayload {
  token: string;
  credential?: string;
}

export interface ForgotPasswordPayload {
  identifier: string;
}

export interface VerifyEmailPayload {
  email: string;
  token: string; // 6-digit verification code
}

export interface ResendVerificationPayload {
  email: string;
}

export interface AuthApiResponse {
  success: boolean;
  user?: AuthUser;
  token?: string;
  message?: string;
  error?: {
    code:
      | 'INVALID_CREDENTIALS'
      | 'EMAIL_EXISTS'
      | 'USERNAME_TAKEN'
      | 'EMAIL_VERIFICATION_REQUIRED'
      | 'INVALID_VERIFICATION_CODE'
      | 'GOOGLE_AUTH_FAILED'
      | 'NETWORK_ERROR'
      | 'VALIDATION_ERROR'
      | 'SERVER_ERROR';
    message: string;
    field?: 'email' | 'username' | 'password' | 'phone' | 'firstName' | 'lastName' | 'code';
  };
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
}
