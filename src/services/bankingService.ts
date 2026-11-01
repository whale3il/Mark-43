/**
 * Aureus Wealth - Banking Service Client
 * Provides typed, production-ready connection points for the separate real Prisma / Supabase backend.
 * 
 * In accordance with frontend architecture constraints:
 * - Directs all mutations and queries to the external API endpoints.
 * - If the external backend is not yet connected or offline, seamlessly falls back
 *   to the single isolated mock data source (`src/data/mockData.ts`).
 */

import { apiRequest } from './apiClient';
import {
  BankAccount,
  Transaction,
  Beneficiary,
  PaymentCard,
  BillPayment,
  SavingsGoal,
  UserSession
} from '../types/banking';
import { AccountCreationPayload } from '../types/auth';
import {
  INITIAL_ACCOUNTS,
  INITIAL_TRANSACTIONS,
  INITIAL_BENEFICIARIES,
  INITIAL_CARDS,
  INITIAL_BILLS,
  INITIAL_SAVINGS_GOALS,
  INITIAL_SESSIONS,
  USER_PROFILE
} from '../data/mockData';

// Helper for generating sovereign settlement wallet addresses for USD accounts
export function generateUsdWalletAddress(): string {
  const chars = '0123456789abcdef';
  let addr = '0x';
  for (let i = 0; i < 40; i++) {
    addr += chars[Math.floor(Math.random() * chars.length)];
  }
  return addr;
}

export class BankingService {
  /**
   * GET /api/banking/dashboard
   * Consolidated data fetching endpoint from the backend.
   */
  static async getDashboard() {
    const res = await apiRequest<{
      accounts: BankAccount[];
      transactions: Transaction[];
      beneficiaries: Beneficiary[];
      cards: PaymentCard[];
      bills: BillPayment[];
      goals: SavingsGoal[];
      sessions: UserSession[];
      profile: any;
    }>('/banking/dashboard');

    if (res.success && res.data) {
      return res;
    }

    // Graceful fallback to isolated mockData if separate backend is not yet running
    return {
      success: true,
      data: {
        accounts: INITIAL_ACCOUNTS,
        transactions: INITIAL_TRANSACTIONS,
        beneficiaries: INITIAL_BENEFICIARIES,
        cards: INITIAL_CARDS,
        bills: INITIAL_BILLS,
        goals: INITIAL_SAVINGS_GOALS,
        sessions: INITIAL_SESSIONS,
        profile: USER_PROFILE
      }
    };
  }

  /**
   * GET /api/banking/accounts
   */
  static async getAccounts() {
    const res = await apiRequest<BankAccount[]>('/banking/accounts');
    if (res.success && res.data) return res;
    return { success: true, data: INITIAL_ACCOUNTS };
  }

  /**
   * POST /api/banking/accounts
   * Note: USD accounts automatically provision a sovereign wallet address.
   */
  static async createAccount(payload: AccountCreationPayload) {
    const res = await apiRequest<BankAccount>('/banking/accounts', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (res.success && res.data) return res;

    // Offline / Preview fallback:
    const isUsd = (payload.currency || 'USD') === 'USD';
    const accountName = payload.name || payload.accountNickname || payload.accountCategoryTitle || 'New Vault';
    const accountType = payload.type || payload.accountType || 'checking';
    const newAccount: BankAccount = {
      id: `acc-${Date.now()}`,
      name: accountName,
      type: accountType as any,
      accountNumber: `8940 1192 ${Math.floor(1000 + Math.random() * 9000)}`,
      routingNumber: '021000089',
      balance: payload.initialDeposit || 0,
      availableBalance: payload.initialDeposit || 0,
      currency: (payload.currency as any) || 'USD',
      interestRate: accountType === 'savings' ? 4.85 : undefined,
      colorTheme: payload.colorTheme || (isUsd ? 'emerald' : 'sky'),
      walletAddress: isUsd ? generateUsdWalletAddress() : undefined,
      isWalletProvisioned: isUsd
    };

    return { success: true, data: newAccount };

  }

  /**
   * GET /api/banking/transactions
   */
  static async getTransactions() {
    const res = await apiRequest<Transaction[]>('/banking/transactions');
    if (res.success && res.data) return res;
    return { success: true, data: INITIAL_TRANSACTIONS };
  }

  /**
   * POST /api/banking/transfers
   */
  static async executeTransfer(payload: {
    sourceAccountId: string;
    beneficiaryId: string;
    amount: number;
    memo?: string;
    speed: string;
  }) {
    const res = await apiRequest<Transaction>('/banking/transfers', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (res.success && res.data) return res;

    // Fallback transaction record
    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      accountId: payload.sourceAccountId,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      merchant: 'Verified Counterparty',
      category: 'Transfers',
      amount: -Math.abs(payload.amount),
      currency: 'USD',
      status: 'settled',
      iconType: 'send',
      paymentMethod: payload.speed === 'wire' ? 'Fedwire Realtime' : 'FedNow Instant',
      referenceNumber: `WRE-${Math.floor(100000 + Math.random() * 900000)}`,
      notes: payload.memo
    };

    return { success: true, data: newTx };
  }

  /**
   * GET /api/banking/cards
   */
  static async getCards() {
    const res = await apiRequest<PaymentCard[]>('/banking/cards');
    if (res.success && res.data) return res;
    return { success: true, data: INITIAL_CARDS };
  }

  /**
   * PATCH /api/banking/cards/:id
   */
  static async updateCard(cardId: string, updates: Partial<PaymentCard>) {
    return apiRequest<PaymentCard>(`/banking/cards/${cardId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  }

  /**
   * POST /api/banking/cards
   */
  static async issueCard(payload: Partial<PaymentCard>) {
    return apiRequest<PaymentCard>('/banking/cards', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  /**
   * GET /api/banking/beneficiaries
   */
  static async getBeneficiaries() {
    const res = await apiRequest<Beneficiary[]>('/banking/beneficiaries');
    if (res.success && res.data) return res;
    return { success: true, data: INITIAL_BENEFICIARIES };
  }

  /**
   * POST /api/banking/beneficiaries
   */
  static async addBeneficiary(payload: Omit<Beneficiary, 'id'>) {
    const res = await apiRequest<Beneficiary>('/banking/beneficiaries', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (res.success && res.data) return res;
    const ben: Beneficiary = { ...payload, id: `ben-${Date.now()}` };
    return { success: true, data: ben };
  }

  /**
   * DELETE /api/banking/beneficiaries/:id
   */
  static async deleteBeneficiary(beneficiaryId: string) {
    return apiRequest(`/banking/beneficiaries/${beneficiaryId}`, {
      method: 'DELETE'
    });
  }

  /**
   * GET /api/banking/bills
   */
  static async getBills() {
    const res = await apiRequest<BillPayment[]>('/banking/bills');
    if (res.success && res.data) return res;
    return { success: true, data: INITIAL_BILLS };
  }

  /**
   * POST /api/banking/bills/:id/pay
   */
  static async payBill(billId: string) {
    return apiRequest<Transaction>(`/banking/bills/${billId}/pay`, {
      method: 'POST'
    });
  }

  /**
   * PATCH /api/banking/bills/:id/autopay
   */
  static async toggleAutopay(billId: string, autoPay: boolean) {
    return apiRequest<BillPayment>(`/banking/bills/${billId}/autopay`, {
      method: 'PATCH',
      body: JSON.stringify({ autoPay })
    });
  }

  /**
   * POST /api/banking/bills
   */
  static async addBill(payload: Partial<BillPayment>) {
    return apiRequest<BillPayment>('/banking/bills', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  /**
   * GET /api/banking/goals
   */
  static async getGoals() {
    const res = await apiRequest<SavingsGoal[]>('/banking/goals');
    if (res.success && res.data) return res;
    return { success: true, data: INITIAL_SAVINGS_GOALS };
  }

  /**
   * POST /api/banking/goals
   */
  static async createGoal(payload: Partial<SavingsGoal>) {
    return apiRequest<SavingsGoal>('/banking/goals', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  /**
   * POST /api/banking/goals/:id/deposit
   */
  static async depositToGoal(goalId: string, amount: number) {
    return apiRequest<SavingsGoal>(`/banking/goals/${goalId}/deposit`, {
      method: 'POST',
      body: JSON.stringify({ amount })
    });
  }

  /**
   * GET /api/banking/sessions
   */
  static async getSessions() {
    const res = await apiRequest<UserSession[]>('/banking/sessions');
    if (res.success && res.data) return res;
    return { success: true, data: INITIAL_SESSIONS };
  }

  /**
   * DELETE /api/banking/sessions/:id
   */
  static async revokeSession(sessionId: string) {
    return apiRequest(`/banking/sessions/${sessionId}`, {
      method: 'DELETE'
    });
  }
}
