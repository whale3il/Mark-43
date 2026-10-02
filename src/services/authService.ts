import {
  AuthUser,
  UserRegistrationPayload,
  LoginPayload,
  GoogleAuthPayload,
  ForgotPasswordPayload,
  VerifyEmailPayload,
  AuthApiResponse
} from '../types/auth';
import { apiRequest } from './apiClient';
import { USER_PROFILE } from '../data/mockData';

/**
 * AuthService provides clean, typed frontend API connection points
 * for the separate real backend endpoints:
 * - POST /api/auth/register
 * - POST /api/auth/verify-email
 * - POST /api/auth/resend-code
 * - POST /api/auth/login
 * - POST /api/auth/google
 * - POST /api/auth/forgot-password
 * - GET  /api/auth/me
 * - POST /api/auth/logout
 *
 * This frontend-only service contains NO fake database, NO simulated user registry,
 * and NO client-side password hashing/verification.
 */
export class AuthService {
  /**
   * Connection point: POST /api/auth/register
   * Dispatches client-validated registration credentials to the backend.
   */
  static async register(payload: UserRegistrationPayload): Promise<AuthApiResponse> {
    const res = await apiRequest<AuthApiResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (res.success && res.data) {
      return {
        success: true,
        user: res.data.user,
        token: res.data.token,
        message: res.data.message || 'Registration details received. Verification required.'
      };
    }

    return {
      success: false,
      error: res.error as any
    };
  }

  /**
   * Connection point: POST /api/auth/verify-email
   * Submits the 6-digit verification code to the backend.
   */
  static async verifyEmail(payload: VerifyEmailPayload): Promise<AuthApiResponse> {
    const res = await apiRequest<AuthApiResponse>('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (res.success && res.data) {
      return {
        success: true,
        user: res.data.user,
        token: res.data.token,
        message: res.data.message || 'Verification successful.'
      };
    }

    return {
      success: false,
      error: res.error as any
    };
  }

  /**
   * Connection point: POST /api/auth/resend-code
   * Requests a new 6-digit verification code from the backend.
   */
  static async resendVerificationCode(email: string): Promise<AuthApiResponse> {
    const res = await apiRequest<AuthApiResponse>('/auth/resend-code', {
      method: 'POST',
      body: JSON.stringify({ email })
    });

    if (res.success && res.data) {
      return {
        success: true,
        message: res.data.message || 'New verification code dispatched.'
      };
    }

    return {
      success: false,
      error: res.error as any
    };
  }

  /**
   * Connection point: POST /api/auth/login
   * Authenticates client credentials with the backend.
   */
  static async login(payload: LoginPayload): Promise<AuthApiResponse> {
    const res = await apiRequest<AuthApiResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (res.success && res.data) {
      return {
        success: true,
        user: res.data.user,
        token: res.data.token,
        message: res.data.message
      };
    }

    return {
      success: false,
      error: res.error as any
    };
  }

  /**
   * Connection point: POST /api/auth/google
   * Forwards Google authentication token to the backend.
   */
  static async loginWithGoogle(payload: GoogleAuthPayload): Promise<AuthApiResponse> {
    const res = await apiRequest<AuthApiResponse>('/auth/google', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (res.success && res.data) {
      return {
        success: true,
        user: res.data.user,
        token: res.data.token
      };
    }

    return {
      success: false,
      error: res.error as any
    };
  }

  /**
   * Connection point: POST /api/auth/forgot-password
   */
  static async forgotPassword(payload: ForgotPasswordPayload): Promise<AuthApiResponse> {
    const res = await apiRequest<AuthApiResponse>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (res.success && res.data) {
      return {
        success: true,
        message: res.data.message || 'Password reset instructions dispatched.'
      };
    }

    return {
      success: false,
      error: res.error as any
    };
  }

  /**
   * Connection point: GET /api/auth/me
   * Fetches currently authenticated session user from the backend.
   */
  static async getCurrentUser(): Promise<AuthUser | null> {
    const res = await apiRequest<AuthUser>('/auth/me');
    if (res.success && res.data) {
      return res.data;
    }
    return null;
  }

  /**
   * Connection point: POST /api/auth/logout
   * Notifies backend of session termination.
   */
  static async logout(): Promise<void> {
    await apiRequest('/auth/logout', { method: 'POST' });
  }

  /**
   * Pure frontend helper for 1-click preview and testing of the private banking UI.
   * Does NOT interact with localStorage, databases, or backend services.
   */
  static getDemoUser(): AuthUser {
    return {
      id: 'usr-demo-alexander',
      firstName: 'Alexander',
      lastName: 'Wright',
      username: 'alexander_wright',
      name: USER_PROFILE.name,
      email: USER_PROFILE.email,
      phone: USER_PROFILE.phone,
      title: USER_PROFILE.title,
      clientTier: USER_PROFILE.clientTier,
      kycLevel: 'Tier 3 (BVN & ID Verified)',
      hasTransactionPin: true,
      pinMasked: '••••',
      primaryAccountNumber: '8940 3120 4821',
      accountNumberMasked: USER_PROFILE.accountNumberMasked,
      memberSince: USER_PROFILE.memberSince,
      avatarUrl: USER_PROFILE.avatarUrl,
      emailVerified: true,
      relationshipManager: USER_PROFILE.relationshipManager
    };
  }
}
