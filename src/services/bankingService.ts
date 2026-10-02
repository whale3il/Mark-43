/**
 * Aureus Wealth - Banking Service Client
 * Provides typed connection points for separate real backend API endpoints.
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

export class BankingService {
  /**
   * GET /api/banking/accounts
   */
  static async getAccounts() {
    return apiRequest<BankAccount[]>('/banking/accounts');
  }

  /**
   * POST /api/banking/accounts
   */
  static async createAccount(payload: AccountCreationPayload) {
    return apiRequest<BankAccount>('/banking/accounts', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  /**
   * GET /api/banking/transactions
   */
  static async getTransactions() {
    return apiRequest<Transaction[]>('/banking/transactions');
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
    return apiRequest<Transaction>('/banking/transfers', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  /**
   * GET /api/banking/cards
   */
  static async getCards() {
    return apiRequest<PaymentCard[]>('/banking/cards');
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
    return apiRequest<Beneficiary[]>('/banking/beneficiaries');
  }

  /**
   * POST /api/banking/beneficiaries
   */
  static async addBeneficiary(payload: Omit<Beneficiary, 'id'>) {
    return apiRequest<Beneficiary>('/banking/beneficiaries', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
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
    return apiRequest<BillPayment[]>('/banking/bills');
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
    return apiRequest<SavingsGoal[]>('/banking/goals');
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
    return apiRequest<UserSession[]>('/banking/sessions');
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
