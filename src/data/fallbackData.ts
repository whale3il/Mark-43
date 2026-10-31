/**
 * Isolated Fallback Seed Data
 * 
 * STRICT ARCHITECTURAL ISOLATION:
 * This file serves purely as an isolated fallback seed database for server initialization
 * or when offline. The frontend components never import this file directly; all data
 * is fetched dynamically via the backend Prisma/Supabase API routes.
 */

import {
  BankAccount,
  Transaction,
  Beneficiary,
  PaymentCard,
  BillPayment,
  SavingsGoal,
  BudgetCategory,
  BankNotification,
  BankStatement,
  UserSession
} from '../types/banking';

export const FALLBACK_USER_PROFILE = {
  id: 'usr_alexander_wright',
  name: 'Alexander V. Wright',
  title: 'Managing Partner & Principal',
  email: 'a.wright@wrightcapital.co',
  phone: '+1 (415) 890-4421',
  clientTier: 'Aureus Sovereign Private Client',
  accountNumberMasked: '•••• 8924',
  memberSince: '2021',
  relationshipManager: {
    name: 'Marcus Sterling',
    title: 'Senior VP, Private Banking & Wealth',
    email: 'marcus.sterling@aureusbank.com',
    phone: '+1 (212) 555-0199',
    office: '540 Madison Ave, New York, NY'
  },
  avatarUrl: '/src/assets/images/avatar_bank_user_1790168725177.jpg'
};

export const FALLBACK_ACCOUNTS: BankAccount[] = [
  {
    id: 'acc-1',
    name: 'Premier Liquidity Checking',
    type: 'checking',
    accountNumber: '8940 3120 4821',
    routingNumber: '021000089',
    balance: 284520.40,
    availableBalance: 282120.40,
    currency: 'USD',
    colorTheme: 'zinc',
    walletAddress: '0x8b32A46F0C9d71A12B8025e16738Eb2463FbcE39',
    isWalletProvisioned: true
  },
  {
    id: 'acc-2',
    name: 'Treasury Reserve Vault (4.85% APY)',
    type: 'savings',
    accountNumber: '7721 9904 1184',
    routingNumber: '021000089',
    balance: 840000.00,
    availableBalance: 840000.00,
    currency: 'USD',
    interestRate: 4.85,
    colorTheme: 'emerald',
    walletAddress: '0x3F7291cBfD1A9e63479B055C2e59178E89cA5E91',
    isWalletProvisioned: true
  },
  {
    id: 'acc-3',
    name: 'Zurich Multi-Currency Vault',
    type: 'multicurrency',
    accountNumber: 'CH93 0076 2011 6238 5291 1',
    routingNumber: 'UBSWCHZH80A',
    iban: 'CH93 0076 2011 6238 5291 1',
    swiftBic: 'UBSWCHZH',
    balance: 1425000.00,
    availableBalance: 1425000.00,
    currency: 'CHF',
    colorTheme: 'sky'
  },
  {
    id: 'acc-4',
    name: 'London Sterling Operating Account',
    type: 'checking',
    accountNumber: 'GB29 NWBK 6016 1331 9268 19',
    routingNumber: '60-16-13',
    iban: 'GB29 NWBK 6016 1331 9268 19',
    swiftBic: 'NWBKGB2L',
    balance: 382400.00,
    availableBalance: 382400.00,
    currency: 'GBP',
    colorTheme: 'amber'
  },
  {
    id: 'acc-5',
    name: 'Apex Growth Opportunities Fund',
    type: 'investment',
    accountNumber: '5519 2831 0942',
    routingNumber: '021000089',
    balance: 4250000.00,
    availableBalance: 4250000.00,
    currency: 'USD',
    interestRate: 8.40,
    colorTheme: 'violet',
    walletAddress: '0x9924CdA1E612B7095F275Ac2593b1236C87d65B0',
    isWalletProvisioned: true
  }
];

export const FALLBACK_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-1',
    accountId: 'acc-1',
    date: '2026-03-30',
    time: '14:22',
    merchant: 'Apollo Global Syndicate Escrow',
    category: 'Investments',
    amount: -125000.00,
    currency: 'USD',
    status: 'settled',
    iconType: 'landmark',
    paymentMethod: 'Fedwire Realtime',
    referenceNumber: 'WRE-948201',
    notes: 'Series B follow-on allocation for neurotech portfolio company'
  },
  {
    id: 'tx-2',
    accountId: 'acc-1',
    date: '2026-03-29',
    time: '10:45',
    merchant: 'NetJets Aviation Europe',
    category: 'Travel & Flights',
    amount: -34800.00,
    currency: 'USD',
    status: 'settled',
    iconType: 'plane',
    paymentMethod: 'Obsidian Black Metal (•8942)',
    referenceNumber: 'CC-481902'
  },
  {
    id: 'tx-3',
    accountId: 'acc-1',
    date: '2026-03-28',
    time: '09:15',
    merchant: 'OpenAI Enterprise Compute',
    category: 'Tech & Cloud',
    amount: -18500.00,
    currency: 'USD',
    status: 'settled',
    iconType: 'cpu',
    paymentMethod: 'Titanium Virtual (•1194)',
    referenceNumber: 'INV-2026-992'
  },
  {
    id: 'tx-4',
    accountId: 'acc-1',
    date: '2026-03-27',
    time: '20:30',
    merchant: 'The French Laundry Yountville',
    category: 'Dining & Hospitality',
    amount: -4250.00,
    currency: 'USD',
    status: 'settled',
    iconType: 'utensils',
    paymentMethod: 'Obsidian Black Metal (•8942)',
    referenceNumber: 'CC-991204'
  },
  {
    id: 'tx-5',
    accountId: 'acc-1',
    date: '2026-03-26',
    time: '08:00',
    merchant: 'Carlyle Credit Fund Dividend',
    category: 'Income & Dividends',
    amount: 88400.00,
    currency: 'USD',
    status: 'settled',
    iconType: 'trending-up',
    paymentMethod: 'Direct ACH Deposit',
    referenceNumber: 'ACH-441829'
  },
  {
    id: 'tx-6',
    accountId: 'acc-1',
    date: '2026-03-25',
    time: '11:10',
    merchant: 'Sotheby’s International Realty Escrow',
    category: 'Real Estate',
    amount: -250000.00,
    currency: 'USD',
    status: 'settled',
    iconType: 'building',
    paymentMethod: 'Fedwire Realtime',
    referenceNumber: 'WRE-771920'
  },
  {
    id: 'tx-7',
    accountId: 'acc-1',
    date: '2026-03-24',
    time: '16:45',
    merchant: 'Patek Philippe Geneva Boutique',
    category: 'Luxury & Retail',
    amount: -62000.00,
    currency: 'USD',
    status: 'settled',
    iconType: 'shopping-bag',
    paymentMethod: 'Obsidian Black Metal (•8942)',
    referenceNumber: 'CC-551029'
  },
  {
    id: 'tx-8',
    accountId: 'acc-2',
    date: '2026-03-23',
    time: '00:01',
    merchant: 'Treasury Yield Monthly Sweep',
    category: 'Income & Dividends',
    amount: 3395.00,
    currency: 'USD',
    status: 'settled',
    iconType: 'sparkles',
    paymentMethod: 'Internal Auto-Accrual',
    referenceNumber: 'INT-994821'
  }
];

export const FALLBACK_BENEFICIARIES: Beneficiary[] = [
  {
    id: 'ben-1',
    name: 'Elena Rostova',
    email: 'elena.rostova@genevawealth.ch',
    bankName: 'UBS AG Switzerland',
    accountNumber: 'CH93 0024 0240 1234 5678 9',
    routingNumber: 'UBSWCHZH',
    initials: 'ER',
    category: 'Personal',
    verified: true,
    lastTransferDate: '2026-03-15'
  },
  {
    id: 'ben-2',
    name: 'Sterling & Croft Capital LLP',
    email: 'disbursements@sterlingcroft.co.uk',
    bankName: 'Barclays Private Bank London',
    accountNumber: 'GB29 BARC 2000 0087 6543 21',
    routingNumber: '20-00-00',
    initials: 'SC',
    category: 'Business',
    verified: true,
    lastTransferDate: '2026-03-20'
  },
  {
    id: 'ben-3',
    name: 'Wright Heritage Family Trust',
    email: 'fiduciary@wrighttrust.org',
    bankName: 'J.P. Morgan Private Bank',
    accountNumber: '4410 9928 3109',
    routingNumber: '021000021',
    initials: 'WT',
    category: 'Family Office',
    verified: true,
    lastTransferDate: '2026-02-28'
  },
  {
    id: 'ben-4',
    name: 'Mayfair Properties Acquisition Ltd',
    email: 'settlement@mayfair-re.co.uk',
    bankName: 'Coutts & Co London',
    accountNumber: 'GB82 COUT 1800 0291 8273 64',
    routingNumber: '18-00-02',
    initials: 'MP',
    category: 'Real Estate',
    verified: true,
    lastTransferDate: '2026-03-10'
  }
];

export const FALLBACK_CARDS: PaymentCard[] = [
  {
    id: 'card-1',
    nameOnCard: 'ALEXANDER V WRIGHT',
    cardType: 'physical',
    tier: 'Obsidian Black Metal',
    last4: '8942',
    fullNumberMasked: '•••• •••• •••• 8942',
    fullNumberRevealed: '4892 7710 4492 8942',
    expiry: '09/29',
    cvv: '914',
    billingZip: '10022',
    isFrozen: false,
    contactlessEnabled: true,
    onlinePaymentsEnabled: true,
    atmWithdrawalsEnabled: true,
    monthlyLimit: 250000,
    spentThisMonth: 101050,
    dailyAtmLimit: 10000,
    atmSpentToday: 0,
    pin: '9482',
    linkedAccountId: 'acc-1'
  },
  {
    id: 'card-2',
    nameOnCard: 'ALEXANDER WRIGHT (CLOUD)',
    cardType: 'virtual',
    tier: 'Titanium Precision Virtual',
    last4: '1194',
    fullNumberMasked: '•••• •••• •••• 1194',
    fullNumberRevealed: '4102 9940 3318 1194',
    expiry: '11/27',
    cvv: '381',
    billingZip: '10022',
    isFrozen: false,
    contactlessEnabled: false,
    onlinePaymentsEnabled: true,
    atmWithdrawalsEnabled: false,
    monthlyLimit: 50000,
    spentThisMonth: 18500,
    dailyAtmLimit: 0,
    atmSpentToday: 0,
    pin: '0000',
    linkedAccountId: 'acc-1'
  }
];

export const FALLBACK_BILLS: BillPayment[] = [
  {
    id: 'bill-1',
    billerName: 'Manhattan Penthouse HOA & Reserve',
    category: 'Real Estate & Property',
    accountNumber: 'HOA-77402-NY',
    amount: 14200.00,
    dueDate: '2026-04-05',
    frequency: 'Monthly',
    autoPay: true,
    status: 'scheduled'
  },
  {
    id: 'bill-2',
    billerName: 'Chubb Masterpiece Private Client Insurance',
    category: 'Insurance & Risk',
    accountNumber: 'CHUBB-POL-99201',
    amount: 28500.00,
    dueDate: '2026-04-12',
    frequency: 'Quarterly',
    autoPay: true,
    status: 'scheduled'
  },
  {
    id: 'bill-3',
    billerName: 'Hawker 900XP Hangarage & Maintenance',
    category: 'Aviation',
    accountNumber: 'AV-HGR-TEB-401',
    amount: 9800.00,
    dueDate: '2026-04-15',
    frequency: 'Monthly',
    autoPay: false,
    status: 'scheduled'
  }
];

export const FALLBACK_GOALS: SavingsGoal[] = [
  {
    id: 'goal-1',
    title: 'Aspen Ski Compound Acquisition',
    targetAmount: 12000000,
    currentAmount: 8400000,
    currency: 'USD',
    targetDate: 'Dec 2026',
    category: 'Property',
    monthlyContribution: 250000,
    color: 'emerald'
  },
  {
    id: 'goal-2',
    title: 'Biotech Seed Syndicate Fund IV',
    targetAmount: 5000000,
    currentAmount: 3250000,
    currency: 'USD',
    targetDate: 'Aug 2026',
    category: 'Venture Fund',
    monthlyContribution: 150000,
    color: 'sky'
  }
];

export const FALLBACK_BUDGETS: BudgetCategory[] = [
  { id: 'b-1', name: 'Investments & Capital Calls', budgeted: 500000, spent: 375000, currency: 'USD', color: 'emerald' },
  { id: 'b-2', name: 'Private Aviation & Travel', budgeted: 80000, spent: 34800, currency: 'USD', color: 'sky' },
  { id: 'b-3', name: 'Real Estate Maintenance', budgeted: 40000, spent: 14200, currency: 'USD', color: 'amber' },
  { id: 'b-4', name: 'Executive Lifestyle & Dining', budgeted: 25000, spent: 18450, currency: 'USD', color: 'purple' }
];

export const FALLBACK_NOTIFICATIONS: BankNotification[] = [
  {
    id: 'notif-1',
    title: 'Fedwire Disbursement Completed',
    message: '$125,000.00 successfully wired to Apollo Global Syndicate Escrow.',
    timestamp: '14:23 Today',
    read: false,
    type: 'transaction'
  },
  {
    id: 'notif-2',
    title: 'Sovereign Treasury Yield Credited',
    message: 'Monthly yield of $3,395.00 automatically credited to Treasury Reserve Vault.',
    timestamp: 'Yesterday',
    read: false,
    type: 'yield'
  },
  {
    id: 'notif-3',
    title: 'USD Sovereign Wallet Linked',
    message: 'Unique cryptographic settlement wallet provisioned and linked to Premier Checking.',
    timestamp: '2 days ago',
    read: true,
    type: 'security'
  }
];

export const FALLBACK_STATEMENTS: BankStatement[] = [
  { id: 'stmt-1', month: 'February', year: 2026, accountName: 'Premier Liquidity Checking (USD)', startingBalance: 245000.00, closingBalance: 284520.40, totalInflow: 188400.00, totalOutflow: 148879.60, fileName: 'Aureus_Statement_Feb_2026_Checking.pdf', fileSize: '1.4 MB' },
  { id: 'stmt-2', month: 'January', year: 2026, accountName: 'Premier Liquidity Checking (USD)', startingBalance: 210000.00, closingBalance: 245000.00, totalInflow: 195000.00, totalOutflow: 160000.00, fileName: 'Aureus_Statement_Jan_2026_Checking.pdf', fileSize: '1.4 MB' }
];

export const FALLBACK_SESSIONS: UserSession[] = [
  { id: 'sess-1', device: 'Apple MacBook Pro 16" M3 Max', browser: 'Safari 18.2 (macOS Sequoia)', location: 'New York, USA', ipAddress: '192.88.99.14 (Bloomberg Gateway)', lastActive: 'Active right now', isCurrent: true },
  { id: 'sess-2', device: 'Apple iPhone 16 Pro Max', browser: 'Aureus Private Mobile 4.2', location: 'New York, USA', ipAddress: '172.56.21.84', lastActive: '42 mins ago', isCurrent: false }
];

export interface CashflowPoint {
  month: string;
  income: number;
  spend: number;
  net: number;
}

export const FALLBACK_CASHFLOW_CHART_DATA: CashflowPoint[] = [
  { month: 'Sep', income: 94000, spend: 62000, net: 32000 },
  { month: 'Oct', income: 112000, spend: 71000, net: 41000 },
  { month: 'Nov', income: 104000, spend: 89000, net: 15000 },
  { month: 'Dec', income: 142000, spend: 95000, net: 47000 },
  { month: 'Jan', income: 128000, spend: 78000, net: 50000 },
  { month: 'Feb', income: 135000, spend: 82000, net: 53000 }
];

