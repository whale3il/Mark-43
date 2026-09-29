export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'CHF' | 'NGN';

export interface BankAccount {
  id: string;
  name: string;
  type: 'checking' | 'savings' | 'investment' | 'multicurrency';
  accountNumber: string;
  routingNumber: string;
  iban?: string;
  swiftBic?: string;
  balance: number;
  availableBalance: number;
  currency: CurrencyCode;
  interestRate?: number;
  colorTheme: string;
}

export interface Transaction {
  id: string;
  accountId: string;
  date: string;
  time: string;
  merchant: string;
  category: 'Investments' | 'Travel & Flights' | 'Tech & Cloud' | 'Dining & Hospitality' | 'Income & Dividends' | 'Real Estate' | 'Luxury & Retail' | 'Transfers';
  amount: number; // positive = inflow, negative = outflow
  currency: CurrencyCode;
  status: 'settled' | 'pending' | 'processing';
  iconType: string;
  paymentMethod: string;
  referenceNumber: string;
  notes?: string;
}

export interface Beneficiary {
  id: string;
  name: string;
  email: string;
  bankName: string;
  accountNumber: string;
  routingNumber: string;
  avatarUrl?: string;
  initials: string;
  category: 'Personal' | 'Business' | 'Family Office' | 'Real Estate';
  verified: boolean;
  lastTransferDate?: string;
}

export interface PaymentCard {
  id: string;
  nameOnCard: string;
  cardType: 'physical' | 'virtual';
  tier: 'Obsidian Black Metal' | 'Titanium Precision Virtual' | 'Corporate Platinum';
  last4: string;
  fullNumberMasked: string;
  fullNumberRevealed: string;
  expiry: string;
  cvv: string;
  billingZip: string;
  isFrozen: boolean;
  contactlessEnabled: boolean;
  onlinePaymentsEnabled: boolean;
  atmWithdrawalsEnabled: boolean;
  monthlyLimit: number;
  spentThisMonth: number;
  dailyAtmLimit: number;
  atmSpentToday: number;
  pin: string;
  linkedAccountId: string;
}

export interface BillPayment {
  id: string;
  billerName: string;
  category: string;
  accountNumber: string;
  amount: number;
  dueDate: string;
  frequency: 'Monthly' | 'Quarterly' | 'Annual' | 'One-Time';
  autoPay: boolean;
  status: 'scheduled' | 'paid' | 'overdue';
  lastPaidDate?: string;
}

export interface SavingsGoal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  currency: CurrencyCode;
  targetDate: string;
  category: 'Property' | 'Acquisition' | 'Emergency' | 'Venture Fund';
  monthlyContribution: number;
  color: string;
}

export interface BudgetCategory {
  id: string;
  name: string;
  budgeted: number;
  spent: number;
  currency: CurrencyCode;
  color: string;
}

export interface BankNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'security' | 'transaction' | 'yield' | 'system';
}

export interface BankStatement {
  id: string;
  month: string;
  year: number;
  accountName: string;
  startingBalance: number;
  closingBalance: number;
  totalInflow: number;
  totalOutflow: number;
  fileName: string;
  fileSize: string;
}

export interface UserSession {
  id: string;
  device: string;
  browser: string;
  location: string;
  ipAddress: string;
  lastActive: string;
  isCurrent: boolean;
}
