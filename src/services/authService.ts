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

// Helper function to safely extract error message as a string
function formatErrorMessage(error: any): string | undefined {
  if (!error) return undefined;
  if (typeof error === 'string') return error;
  if (typeof error === 'object' && error.message) return error.message;
  return 'An unexpected error occurred.';
}

export class AuthService {
  /**
   * Connection point: POST /api/auth/register (or /signup)
   */
  static async register(payload: UserRegistrationPayload): Promise<AuthApiResponse> {
    const res = await apiRequest<{ message: string; user?: any; userId?: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (res.success && res.data) {
      return {
        success: true,
        user: res.data.user,
        message: res.data.message || 'Registration details received. Verification required.'
      };
    }

    return {
      success: false,
      error: formatErrorMessage(res.error)
    };
  }

  /**
   * Connection point: POST /api/auth/verify-email (or /verify-otp)
   */
  static async verifyEmail(payload: VerifyEmailPayload): Promise<AuthApiResponse> {
    const bodyPayload = {
      email: payload.email,
      token: (payload as any).code || (payload as any).token
    };

    const res = await apiRequest<{ message: string; user: any; session: any; token?: string }>('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify(bodyPayload)
    });

    if (res.success && res.data) {
      return {
        success: true,
        user: res.data.user,
        token: res.data.session?.access_token || res.data.token,
        message: res.data.message || 'Verification successful.'
      };
    }

    return {
      success: false,
      error: formatErrorMessage(res.error)
    };
  }

  /**
   * Connection point: POST /api/auth/resend-code
   */
  static async resendVerificationCode(email: string): Promise<AuthApiResponse> {
  const res = await apiRequest<{ message: string }>('/auth/resend-otp', {
    method: 'POST',
    body: JSON.stringify({ email, type: 'signup' })
  });

  if (res.success && res.data) {
    return {
      success: true,
      message: res.data.message || 'New verification code dispatched.'
    };
  }

  return {
    success: false,
    error: formatErrorMessage(res.error)
  };
}

  /**
   * Connection point: POST /api/auth/login
   */
  static async login(payload: LoginPayload): Promise<AuthApiResponse> {
    const res = await apiRequest<{ message: string; user: any; session: any; token?: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (res.success && res.data) {
      return {
        success: true,
        user: res.data.user,
        token: res.data.session?.access_token || res.data.token,
        message: res.data.message
      };
    }

    return {
      success: false,
      error: formatErrorMessage(res.error)
    };
  }

  /**
   * Connection point: POST /api/auth/google
   */
// src/services/authService.ts

  static async googleSignIn(accessToken: string) {
    const res = await apiRequest<any>('/auth/google', {
      method: 'POST',
      body: { accessToken },
    });

    if (res.success && res.data) {
      return {
        success: true,
        data: res.data.user || res.data,
        token: res.data.token,
        message: 'Google sign-in successful.',
      };
    }

    return {
      success: false,
      error: typeof res.error === 'string'
        ? res.error
        : (res.error as any)?.message || 'Google sign-in failed.',
    };
  }

static async syncGoogleUser(accessToken: string) {
  return apiRequest<AuthUser>("/auth/google/sync", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}


  /**
   * Connection point: POST /api/auth/forgot-password
   */
  static async forgotPassword(payload: ForgotPasswordPayload): Promise<AuthApiResponse> {
    const res = await apiRequest<{ message: string }>('/auth/forgot-password', {
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
      error: formatErrorMessage(res.error)
    };
  }

  /**
   * Connection point: GET /api/auth/me
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
   */
  static async logout(): Promise<void> {
    await apiRequest('/auth/logout', { method: 'POST' });
  }

  /**
   * Pure frontend demo user helper
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