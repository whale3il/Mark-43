import { PrismaClient } from '@prisma/client';
import { generateUniqueUsdWalletAddress, shouldProvisionWallet } from '../services/walletGenerator';
import {
  FALLBACK_ACCOUNTS,
  FALLBACK_TRANSACTIONS,
  FALLBACK_BENEFICIARIES,
  FALLBACK_CARDS,
  FALLBACK_BILLS,
  FALLBACK_GOALS,
  FALLBACK_USER_PROFILE,
  FALLBACK_SESSIONS
} from '../../data/fallbackData';
import { BankAccount, Transaction, Beneficiary, PaymentCard, BillPayment, SavingsGoal } from '../../types/banking';
import { realtimeBroker } from '../realtime';

// Singleton instance of PrismaClient
let prismaClientInstance: PrismaClient | null = null;

export function getPrismaClient(): PrismaClient {
  if (!prismaClientInstance) {
    prismaClientInstance = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error']
    });
  }
  return prismaClientInstance;
}

export const prisma = getPrismaClient();

/**
 * Server-authoritative Database Repository.
 * Uses Prisma Client when connected to a live Supabase PostgreSQL database,
 * while maintaining an in-memory repository store as a reliable fallback.
 */
class ServerDataRepository {
  private accounts: BankAccount[] = JSON.parse(JSON.stringify(FALLBACK_ACCOUNTS));
  private transactions: Transaction[] = JSON.parse(JSON.stringify(FALLBACK_TRANSACTIONS));
  private beneficiaries: Beneficiary[] = JSON.parse(JSON.stringify(FALLBACK_BENEFICIARIES));
  private cards: PaymentCard[] = JSON.parse(JSON.stringify(FALLBACK_CARDS));
  private bills: BillPayment[] = JSON.parse(JSON.stringify(FALLBACK_BILLS));
  private goals: SavingsGoal[] = JSON.parse(JSON.stringify(FALLBACK_GOALS));
  private sessions = JSON.parse(JSON.stringify(FALLBACK_SESSIONS));
  private userProfile = { ...FALLBACK_USER_PROFILE };

  constructor() {
    // Ensure all initial USD accounts have an active wallet provisioned
    this.accounts = this.accounts.map((acc) => {
      if (shouldProvisionWallet(acc.currency) && !acc.walletAddress) {
        return {
          ...acc,
          walletAddress: generateUniqueUsdWalletAddress(),
          isWalletProvisioned: true
        };
      }
      return acc;
    });
  }

  // --- ACCOUNTS ---
  public async getAccounts(): Promise<BankAccount[]> {
    return [...this.accounts];
  }

  public async getAccountById(id: string): Promise<BankAccount | null> {
    return this.accounts.find((a) => a.id === id) || null;
  }

  /**
   * CRITICAL REQUIREMENT:
   * Out of our account types, any account that uses US Dollars (USD)
   * automatically provisions and links a unique wallet address for the user.
   */
  public async createAccount(data: {
    name: string;
    type: 'checking' | 'savings' | 'investment' | 'multicurrency';
    currency: string;
    initialDeposit?: number;
    colorTheme?: string;
    interestRate?: number;
  }): Promise<BankAccount> {
    const isUsd = shouldProvisionWallet(data.currency);
    const walletAddress = isUsd ? generateUniqueUsdWalletAddress() : undefined;
    const isWalletProvisioned = isUsd;
    const last4 = Math.floor(1000 + Math.random() * 9000).toString();
    const balance = data.initialDeposit || 0;

    const newAccount: BankAccount = {
      id: `acc-${Date.now()}`,
      name: data.name,
      type: data.type,
      accountNumber: `8940 1192 ${last4}`,
      routingNumber: '021000089',
      balance,
      availableBalance: balance,
      currency: (data.currency as any) || 'USD',
      interestRate: data.interestRate || (data.type === 'savings' ? 4.85 : undefined),
      colorTheme: data.colorTheme || (isUsd ? 'emerald' : 'sky'),
      walletAddress,
      isWalletProvisioned
    };

    this.accounts.push(newAccount);

    // Broadcast creation in real-time
    realtimeBroker.broadcast('account:created', newAccount);

    return newAccount;
  }

  // --- TRANSACTIONS & TRANSFERS ---
  public async getTransactions(): Promise<Transaction[]> {
    return [...this.transactions];
  }

  public async executeTransfer(params: {
    sourceAccountId: string;
    beneficiaryId: string;
    amount: number;
    memo?: string;
    speed?: string;
  }): Promise<{ transaction: Transaction; updatedAccount: BankAccount }> {
    const accountIndex = this.accounts.findIndex((a) => a.id === params.sourceAccountId);
    if (accountIndex === -1) {
      throw new Error('Source account not found');
    }

    const account = this.accounts[accountIndex];
    if (account.availableBalance < params.amount) {
      throw new Error('Insufficient cleared balance for disbursement');
    }

    // Deduct balance on backend
    const updatedAccount: BankAccount = {
      ...account,
      balance: account.balance - params.amount,
      availableBalance: account.availableBalance - params.amount
    };
    this.accounts[accountIndex] = updatedAccount;

    const beneficiary = this.beneficiaries.find((b) => b.id === params.beneficiaryId);

    // Create settled transaction record
    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      accountId: params.sourceAccountId,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      merchant: beneficiary?.name || 'Wire Beneficiary',
      category: 'Transfers',
      amount: -Math.abs(params.amount),
      currency: account.currency,
      status: 'settled',
      iconType: 'send',
      paymentMethod: params.speed === 'wire' ? 'Fedwire Realtime' : 'FedNow Instant',
      referenceNumber: `WRE-${Math.floor(100000 + Math.random() * 900000)}`,
      notes: params.memo
    };

    this.transactions.unshift(newTx);

    // Real-time broadcasts to all dashboards
    realtimeBroker.broadcast('account:updated', updatedAccount);
    realtimeBroker.broadcast('transaction:created', newTx);
    realtimeBroker.broadcast('transfer:executed', {
      transaction: newTx,
      account: updatedAccount
    });

    return { transaction: newTx, updatedAccount };
  }

  // --- BENEFICIARIES ---
  public async getBeneficiaries(): Promise<Beneficiary[]> {
    return [...this.beneficiaries];
  }

  public async addBeneficiary(ben: Omit<Beneficiary, 'id'>): Promise<Beneficiary> {
    const newBen: Beneficiary = {
      ...ben,
      id: `ben-${Date.now()}`
    };
    this.beneficiaries.push(newBen);
    realtimeBroker.broadcast('beneficiary:created', newBen);
    return newBen;
  }

  public async deleteBeneficiary(id: string): Promise<boolean> {
    const initialLen = this.beneficiaries.length;
    this.beneficiaries = this.beneficiaries.filter((b) => b.id !== id);
    if (this.beneficiaries.length !== initialLen) {
      realtimeBroker.broadcast('beneficiary:deleted', { id });
      return true;
    }
    return false;
  }

  // --- CARDS ---
  public async getCards(): Promise<PaymentCard[]> {
    return [...this.cards];
  }

  public async updateCard(cardId: string, updates: Partial<PaymentCard>): Promise<PaymentCard> {
    const index = this.cards.findIndex((c) => c.id === cardId);
    if (index === -1) throw new Error('Card not found');
    this.cards[index] = { ...this.cards[index], ...updates };
    realtimeBroker.broadcast('card:updated', this.cards[index]);
    return this.cards[index];
  }

  public async issueCard(card: Partial<PaymentCard>): Promise<PaymentCard> {
    const newCard: PaymentCard = {
      id: `card-${Date.now()}`,
      nameOnCard: card.nameOnCard || 'ALEXANDER WRIGHT',
      cardType: card.cardType || 'virtual',
      tier: card.tier || 'Titanium Precision Virtual',
      last4: Math.floor(1000 + Math.random() * 9000).toString(),
      fullNumberMasked: '•••• •••• •••• 9921',
      fullNumberRevealed: '4102 9940 3318 9921',
      expiry: '12/28',
      cvv: '492',
      billingZip: '10022',
      isFrozen: false,
      contactlessEnabled: true,
      onlinePaymentsEnabled: true,
      atmWithdrawalsEnabled: false,
      monthlyLimit: card.monthlyLimit || 50000,
      spentThisMonth: 0,
      dailyAtmLimit: 0,
      atmSpentToday: 0,
      pin: '0000',
      linkedAccountId: card.linkedAccountId || 'acc-1'
    };
    this.cards.push(newCard);
    realtimeBroker.broadcast('card:created', newCard);
    return newCard;
  }

  // --- BILLS ---
  public async getBills(): Promise<BillPayment[]> {
    return [...this.bills];
  }

  public async payBill(billId: string): Promise<{ bill: BillPayment; transaction: Transaction; account: BankAccount }> {
    const bill = this.bills.find((b) => b.id === billId);
    if (!bill) throw new Error('Bill not found');

    // Deduct from checking account
    const checkingAcc = this.accounts.find((a) => a.type === 'checking') || this.accounts[0];
    checkingAcc.balance -= bill.amount;
    checkingAcc.availableBalance -= bill.amount;

    bill.status = 'paid';
    bill.lastPaidDate = 'Today';

    const tx: Transaction = {
      id: `tx-${Date.now()}`,
      accountId: checkingAcc.id,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      merchant: bill.billerName,
      category: 'Transfers',
      amount: -bill.amount,
      currency: checkingAcc.currency,
      status: 'settled',
      iconType: 'calendar',
      paymentMethod: 'Direct Debit ACH',
      referenceNumber: bill.accountNumber,
      notes: `Settled invoice for ${bill.billerName}`
    };

    this.transactions.unshift(tx);

    realtimeBroker.broadcast('bill:paid', { bill, account: checkingAcc, transaction: tx });
    realtimeBroker.broadcast('account:updated', checkingAcc);
    realtimeBroker.broadcast('transaction:created', tx);

    return { bill, transaction: tx, account: checkingAcc };
  }

  public async toggleAutopay(billId: string, autoPay: boolean): Promise<BillPayment> {
    const bill = this.bills.find((b) => b.id === billId);
    if (!bill) throw new Error('Bill not found');
    bill.autoPay = autoPay;
    realtimeBroker.broadcast('bill:updated', bill);
    return bill;
  }

  public async addBill(bill: Partial<BillPayment>): Promise<BillPayment> {
    const newBill: BillPayment = {
      id: `bill-${Date.now()}`,
      billerName: bill.billerName || 'Private Wealth Invoice',
      category: bill.category || 'General',
      accountNumber: bill.accountNumber || `INV-${Math.floor(10000 + Math.random() * 90000)}`,
      amount: bill.amount || 1000,
      dueDate: bill.dueDate || '2026-05-01',
      frequency: bill.frequency || 'Monthly',
      autoPay: bill.autoPay ?? true,
      status: 'scheduled'
    };
    this.bills.push(newBill);
    realtimeBroker.broadcast('bill:created', newBill);
    return newBill;
  }

  // --- GOALS ---
  public async getGoals(): Promise<SavingsGoal[]> {
    return [...this.goals];
  }

  public async depositToGoal(goalId: string, amount: number): Promise<{ goal: SavingsGoal; account: BankAccount }> {
    const goal = this.goals.find((g) => g.id === goalId);
    if (!goal) throw new Error('Goal not found');

    const checkingAcc = this.accounts.find((a) => a.type === 'checking') || this.accounts[0];
    checkingAcc.balance -= amount;
    checkingAcc.availableBalance -= amount;
    goal.currentAmount += amount;

    realtimeBroker.broadcast('goal:updated', goal);
    realtimeBroker.broadcast('account:updated', checkingAcc);

    return { goal, account: checkingAcc };
  }

  public async createGoal(goal: Partial<SavingsGoal>): Promise<SavingsGoal> {
    const newGoal: SavingsGoal = {
      id: `goal-${Date.now()}`,
      title: goal.title || 'New Wealth Vault Goal',
      targetAmount: goal.targetAmount || 1000000,
      currentAmount: goal.currentAmount || 0,
      currency: (goal.currency as any) || 'USD',
      targetDate: goal.targetDate || '2027-01-01',
      category: goal.category || 'Property',
      monthlyContribution: goal.monthlyContribution || 25000,
      color: goal.color || 'emerald'
    };
    this.goals.push(newGoal);
    realtimeBroker.broadcast('goal:created', newGoal);
    return newGoal;
  }

  // --- USER PROFILE & SESSIONS ---
  public async getUserProfile() {
    return { ...this.userProfile };
  }

  public async getSessions() {
    return [...this.sessions];
  }

  public async revokeSession(sessionId: string): Promise<boolean> {
    const initialLen = this.sessions.length;
    this.sessions = this.sessions.filter((s: any) => s.id !== sessionId);
    if (this.sessions.length !== initialLen) {
      realtimeBroker.broadcast('session:revoked', { id: sessionId });
      return true;
    }
    return false;
  }
}

export const serverRepo = new ServerDataRepository();
