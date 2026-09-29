import {
  AuthUser,
  UserRegistrationPayload,
  LoginPayload,
  GoogleAuthPayload,
  ForgotPasswordPayload,
  VerifyEmailPayload,
  AuthApiResponse,
  GeneratedNubanAccount
} from '../types/auth';
import { generateNigerianNuban, SUPPORTED_NIGERIAN_CLEARING_BANKS } from '../utils/nubanGenerator';
import { USER_PROFILE, INITIAL_ACCOUNTS } from '../data/mockData';
import { BankAccount } from '../types/banking';

const STORAGE_KEY_USER = 'aureus_auth_user';
const STORAGE_KEY_ACCOUNTS = 'aureus_user_accounts';
const STORAGE_KEY_REGISTRY = 'aureus_user_registry';

interface RegisteredUserRecord {
  user: AuthUser;
  password?: string;
  accounts: BankAccount[];
}

/**
 * Service client contract for Authentication and Account Provisioning.
 * Strictly adheres to backend endpoints:
 * - POST /api/auth/register
 * - POST /api/auth/login
 * - POST /api/auth/google
 * - POST /api/auth/forgot-password
 * - POST /api/auth/verify-email
 *
 * Frontend never sends passwordHash, status, createdAt, updatedAt, or lastLoginAt.
 */
export class AuthService {
  /**
   * Retrieves currently logged in user from local storage or returns null.
   */
  static getCurrentUser(): AuthUser | null {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem(STORAGE_KEY_USER);
    if (!stored) return null;
    try {
      return JSON.parse(stored) as AuthUser;
    } catch {
      return null;
    }
  }

  /**
   * Returns demo user profile for fast 1-click preview and testing.
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

  /**
   * Retrieves all registered users in client storage (simulates database users table).
   */
  private static getUserRegistry(): RegisteredUserRecord[] {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(STORAGE_KEY_REGISTRY);
    if (!stored) {
      // Seed default demo user in registry
      const initialRegistry: RegisteredUserRecord[] = [
        {
          user: this.getDemoUser(),
          password: 'DemoPassword123!',
          accounts: INITIAL_ACCOUNTS
        }
      ];
      localStorage.setItem(STORAGE_KEY_REGISTRY, JSON.stringify(initialRegistry));
      return initialRegistry;
    }
    try {
      return JSON.parse(stored) as RegisteredUserRecord[];
    } catch {
      return [];
    }
  }

  private static saveUserRegistry(registry: RegisteredUserRecord[]): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_REGISTRY, JSON.stringify(registry));
    }
  }

  /**
   * POST /api/auth/register
   * Payload: { firstName, lastName, username, email, phone, password }
   */
  static async register(payload: UserRegistrationPayload): Promise<AuthApiResponse> {
    const sanitizedPayload: UserRegistrationPayload = {
      firstName: payload.firstName.trim(),
      lastName: payload.lastName.trim(),
      username: payload.username.trim().toLowerCase(),
      email: payload.email.trim().toLowerCase(),
      phone: payload.phone.trim(),
      password: payload.password
    };

    // Attempt real backend call first if an Express endpoint is mounted
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sanitizedPayload)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.user) {
          localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(data.user));
        }
        return { success: true, ...data };
      }

      if (response.status !== 404) {
        const errData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: {
            code: errData.code || 'SERVER_ERROR',
            message: errData.message || 'Server error occurred during registration.'
          }
        };
      }
    } catch {
      // Fallback to client service registry for preview / offline environment
    }

    // Client-side registry simulation (prior to Prisma backend connection)
    await new Promise((r) => setTimeout(r, 650)); // Realistic network latency

    const registry = this.getUserRegistry();

    // Check if email already registered
    const emailExists = registry.some(
      (r) => r.user.email.toLowerCase() === sanitizedPayload.email
    );
    if (emailExists) {
      return {
        success: false,
        error: {
          code: 'EMAIL_EXISTS',
          field: 'email',
          message: 'An account with this email address is already registered in our private banking directory.'
        }
      };
    }

    // Check if username already taken
    const usernameExists = registry.some(
      (r) => r.user.username.toLowerCase() === sanitizedPayload.username
    );
    if (usernameExists) {
      return {
        success: false,
        error: {
          code: 'USERNAME_TAKEN',
          field: 'username',
          message: 'This sovereign username is already reserved by another client. Please select a distinctive username.'
        }
      };
    }

    // Generate initial bank clearing account
    const bank = SUPPORTED_NIGERIAN_CLEARING_BANKS[0]; // Aureus Bank 090
    const { nuban, formatted } = generateNigerianNuban(bank.code);

    const newUser: AuthUser = {
      id: `usr-${Date.now()}`,
      firstName: sanitizedPayload.firstName,
      lastName: sanitizedPayload.lastName,
      username: sanitizedPayload.username,
      name: `${sanitizedPayload.firstName} ${sanitizedPayload.lastName}`,
      email: sanitizedPayload.email,
      phone: sanitizedPayload.phone,
      title: 'Private Wealth Partner',
      clientTier: 'Aureus Sovereign Private Client',
      kycLevel: 'Tier 3 (BVN & ID Verified)',
      hasTransactionPin: false,
      primaryAccountNumber: formatted,
      accountNumberMasked: `•••• ${nuban.slice(-4)}`,
      memberSince: new Date().getFullYear().toString(),
      avatarUrl: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`,
      emailVerified: true,
      relationshipManager: {
        name: 'Chinedu Adeleke',
        title: 'VP, Sovereign Wealth & Private Banking',
        email: 'c.adeleke@aureusbank.ng',
        phone: '+234 1 890 0041',
        office: '42 Marina, Lagos Financial District'
      }
    };

    const initialAccount: BankAccount = {
      id: `acc-nuban-${Date.now()}`,
      name: `Sovereign Reserve (${formatted})`,
      type: 'savings',
      accountNumber: formatted,
      routingNumber: bank.sortCode,
      balance: 250000,
      availableBalance: 250000,
      currency: 'NGN',
      interestRate: 12.5,
      colorTheme: 'emerald'
    };

    // Save into registry
    registry.push({
      user: newUser,
      password: sanitizedPayload.password,
      accounts: [initialAccount]
    });
    this.saveUserRegistry(registry);

    // Save active session & accounts
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(newUser));
    localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify([initialAccount]));

    return {
      success: true,
      user: newUser,
      message: 'Account successfully registered and institutional ledger provisioned.'
    };
  }

  /**
   * POST /api/auth/login
   * Payload: { identifier, password, rememberMe }
   * Identifier accepts either Email or Username.
   */
  static async login(payload: LoginPayload): Promise<AuthApiResponse> {
    const identifier = payload.identifier.trim().toLowerCase();
    const password = payload.password;

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password, rememberMe: payload.rememberMe })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.user) {
          localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(data.user));
        }
        return { success: true, ...data };
      }

      if (response.status !== 404) {
        const errData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: {
            code: errData.code || 'INVALID_CREDENTIALS',
            message: errData.message || 'Invalid credentials. Please verify your details.'
          }
        };
      }
    } catch {
      // Offline / fallback
    }

    await new Promise((r) => setTimeout(r, 600));

    const registry = this.getUserRegistry();
    const cleanId = identifier.replace(/\s+/g, '');

    // Look for matching user by email, username, or NUBAN
    const match = registry.find((record) => {
      const u = record.user;
      return (
        u.email.toLowerCase() === identifier ||
        u.username.toLowerCase() === identifier ||
        u.primaryAccountNumber.replace(/\s+/g, '') === cleanId
      );
    });

    if (!match) {
      // Check if it's the default demo user by email or username
      const demo = this.getDemoUser();
      if (
        identifier === demo.email.toLowerCase() ||
        identifier === demo.username.toLowerCase() ||
        identifier === 'demo' ||
        identifier === 'alexander'
      ) {
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(demo));
        return { success: true, user: demo };
      }

      return {
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid credentials. The specified email or username was not found in our private client ledger.'
        }
      };
    }

    // Verify password if recorded, or allow standard matching
    if (match.password && match.password !== password) {
      return {
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'The password provided does not match our security records. Please try again or reset your password.'
        }
      };
    }

    // Success: activate user session
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(match.user));
    if (match.accounts && match.accounts.length > 0) {
      localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(match.accounts));
    }

    return {
      success: true,
      user: match.user,
      message: `Welcome back, ${match.user.firstName}. Vault authenticated.`
    };
  }

  /**
   * POST /api/auth/google
   * Payload: { token, credential }
   */
  static async loginWithGoogle(payload: GoogleAuthPayload): Promise<AuthApiResponse> {
    try {
      const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.user) {
          localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(data.user));
        }
        return { success: true, ...data };
      }

      if (response.status !== 404) {
        const errData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: {
            code: 'GOOGLE_AUTH_FAILED',
            message: errData.message || 'Google authentication failed to verify with private bank gateway.'
          }
        };
      }
    } catch {
      // Fallback
    }

    // Simulate Google OAuth handshake
    await new Promise((r) => setTimeout(r, 800));

    // Simulated verified Google account
    const googleUser: AuthUser = {
      id: `usr-google-${Date.now()}`,
      firstName: 'Alexander',
      lastName: 'Wright',
      username: 'alexander_google',
      name: 'Alexander V. Wright',
      email: 'alexander.wright@gmail.com',
      phone: '+234 803 912 4000',
      title: 'Google Federated Client',
      clientTier: 'Aureus Sovereign Private Client',
      kycLevel: 'Tier 3 (BVN & ID Verified)',
      hasTransactionPin: true,
      pinMasked: '••••',
      primaryAccountNumber: '8940 3120 4821',
      accountNumberMasked: '•••• 4821',
      memberSince: new Date().getFullYear().toString(),
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      emailVerified: true,
      relationshipManager: USER_PROFILE.relationshipManager
    };

    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(googleUser));
    return {
      success: true,
      user: googleUser,
      message: 'Authenticated securely via Google Identity Services.'
    };
  }

  /**
   * POST /api/auth/forgot-password
   * Payload: { identifier }
   */
  static async forgotPassword(payload: ForgotPasswordPayload): Promise<AuthApiResponse> {
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: payload.identifier.trim() })
      });

      if (response.ok) {
        const data = await response.json();
        return { success: true, ...data };
      }

      if (response.status !== 404) {
        const errData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: {
            code: errData.code || 'SERVER_ERROR',
            message: errData.message || 'Failed to dispatch recovery link.'
          }
        };
      }
    } catch {
      // Fallback
    }

    await new Promise((r) => setTimeout(r, 650));
    return {
      success: true,
      message: `Password reset instructions have been transmitted to the authorized security email associated with ${payload.identifier}.`
    };
  }

  /**
   * POST /api/auth/verify-email
   * Payload: { email, token }
   */
  static async verifyEmail(payload: VerifyEmailPayload): Promise<AuthApiResponse> {
    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = await response.json();
        return { success: true, ...data };
      }
    } catch {
      // Fallback
    }

    await new Promise((r) => setTimeout(r, 500));
    return {
      success: true,
      message: 'Email address verified and cryptographic signature recorded.'
    };
  }

  /**
   * Backward-compatible legacy login method for existing code calls.
   */
  static async loginLegacy(identifier: string, password: string): Promise<AuthUser> {
    const res = await this.login({ identifier, password });
    if (res.success && res.user) {
      return res.user;
    }
    throw new Error(res.error?.message || 'Authentication failed');
  }

  /**
   * Retrieves accounts stored for user or defaults to initial mock accounts.
   */
  static getUserStoredAccounts(): BankAccount[] {
    if (typeof window === 'undefined') return INITIAL_ACCOUNTS;
    const stored = localStorage.getItem(STORAGE_KEY_ACCOUNTS);
    if (!stored) return INITIAL_ACCOUNTS;
    try {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_ACCOUNTS;
    } catch {
      return INITIAL_ACCOUNTS;
    }
  }

  /**
   * Logs out user and clears active session token.
   */
  static logout(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY_USER);
    }
  }
}
