import { Router, Request, Response } from 'express';
import { FALLBACK_USER_PROFILE } from '../../data/fallbackData';

export const authRouter = Router();

// Store temporary email verification tokens
const verificationCodes: Map<string, string> = new Map();

// POST /api/auth/register
authRouter.post('/register', (req: Request, res: Response) => {
  const { firstName, lastName, username, email, phone } = req.body;

  if (!email || !firstName || !lastName || !username) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'All registration credentials are required' }
    });
  }

  // Issue 6-digit verification code
  const code = '123456';
  verificationCodes.set(email.toLowerCase(), code);

  res.status(200).json({
    success: true,
    message: 'Verification code dispatched to email.'
  });
});

// POST /api/auth/verify-email
authRouter.post('/verify-email', (req: Request, res: Response) => {
  const { email, token } = req.body;

  if (!email || !token) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Email and 6-digit token are required' }
    });
  }

  // Demo accepts any valid 6-digit code or matched token
  if (token.length !== 6 || !/^\d{6}$/.test(token)) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_VERIFICATION_CODE', message: 'Invalid 6-digit token format.' }
    });
  }

  const user = {
    id: `usr_${Date.now()}`,
    firstName: email.split('@')[0],
    lastName: 'Client',
    username: email.split('@')[0].toLowerCase(),
    name: email.split('@')[0],
    email: email.toLowerCase(),
    phone: '+1 (415) 890-4421',
    title: 'Sovereign Client',
    clientTier: 'Aureus Sovereign Private Client',
    kycLevel: 'Tier 3 (BVN & ID Verified)',
    hasTransactionPin: true,
    primaryAccountNumber: '8940 3120 4821',
    accountNumberMasked: '•••• 4821',
    memberSince: new Date().getFullYear().toString(),
    avatarUrl: FALLBACK_USER_PROFILE.avatarUrl,
    emailVerified: true,
    relationshipManager: FALLBACK_USER_PROFILE.relationshipManager
  };

  res.json({
    success: true,
    user,
    token: `jwt_aureus_${Date.now()}`,
    message: 'Security token verified.'
  });
});

// POST /api/auth/resend-code
authRouter.post('/resend-code', (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, error: { message: 'Email required' } });
  }

  const code = '123456';
  verificationCodes.set(email.toLowerCase(), code);

  res.json({
    success: true,
    message: 'A new 6-digit verification code has been dispatched.'
  });
});

// POST /api/auth/login
authRouter.post('/login', (req: Request, res: Response) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_CREDENTIALS', message: 'Please provide identifier and password.' }
    });
  }

  const user = {
    id: 'usr-demo-alexander',
    firstName: 'Alexander',
    lastName: 'Wright',
    username: 'alexander_wright',
    name: FALLBACK_USER_PROFILE.name,
    email: FALLBACK_USER_PROFILE.email,
    phone: FALLBACK_USER_PROFILE.phone,
    title: FALLBACK_USER_PROFILE.title,
    clientTier: FALLBACK_USER_PROFILE.clientTier,
    kycLevel: 'Tier 3 (BVN & ID Verified)',
    hasTransactionPin: true,
    primaryAccountNumber: '8940 3120 4821',
    accountNumberMasked: FALLBACK_USER_PROFILE.accountNumberMasked,
    memberSince: FALLBACK_USER_PROFILE.memberSince,
    avatarUrl: FALLBACK_USER_PROFILE.avatarUrl,
    emailVerified: true,
    relationshipManager: FALLBACK_USER_PROFILE.relationshipManager
  };

  res.json({
    success: true,
    user,
    token: `jwt_aureus_session_${Date.now()}`,
    message: 'Authenticated successfully.'
  });
});

// POST /api/auth/google
authRouter.post('/google', (req: Request, res: Response) => {
  const user = {
    id: 'usr_google_federated',
    firstName: 'Alexander',
    lastName: 'Wright',
    username: 'alexander_wright',
    name: FALLBACK_USER_PROFILE.name,
    email: 'alexander.wright@gmail.com',
    phone: FALLBACK_USER_PROFILE.phone,
    title: FALLBACK_USER_PROFILE.title,
    clientTier: FALLBACK_USER_PROFILE.clientTier,
    kycLevel: 'Tier 3 (BVN & ID Verified)',
    hasTransactionPin: true,
    primaryAccountNumber: '8940 3120 4821',
    accountNumberMasked: FALLBACK_USER_PROFILE.accountNumberMasked,
    memberSince: '2024',
    avatarUrl: FALLBACK_USER_PROFILE.avatarUrl,
    emailVerified: true,
    relationshipManager: FALLBACK_USER_PROFILE.relationshipManager
  };

  res.json({
    success: true,
    user,
    token: `jwt_google_${Date.now()}`
  });
});

// POST /api/auth/forgot-password
authRouter.post('/forgot-password', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Password reset instructions have been dispatched.'
  });
});

// GET /api/auth/me
authRouter.get('/me', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      id: 'usr-demo-alexander',
      firstName: 'Alexander',
      lastName: 'Wright',
      username: 'alexander_wright',
      name: FALLBACK_USER_PROFILE.name,
      email: FALLBACK_USER_PROFILE.email,
      phone: FALLBACK_USER_PROFILE.phone,
      title: FALLBACK_USER_PROFILE.title,
      clientTier: FALLBACK_USER_PROFILE.clientTier,
      kycLevel: 'Tier 3 (BVN & ID Verified)',
      hasTransactionPin: true,
      primaryAccountNumber: '8940 3120 4821',
      accountNumberMasked: FALLBACK_USER_PROFILE.accountNumberMasked,
      memberSince: FALLBACK_USER_PROFILE.memberSince,
      avatarUrl: FALLBACK_USER_PROFILE.avatarUrl,
      emailVerified: true,
      relationshipManager: FALLBACK_USER_PROFILE.relationshipManager
    }
  });
});

// POST /api/auth/logout
authRouter.post('/logout', (req: Request, res: Response) => {
  res.json({ success: true, message: 'Logged out.' });
});
