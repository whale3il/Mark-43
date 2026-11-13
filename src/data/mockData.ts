/**
 * Aureus Sovereign Private Bank - Isolated Mock Data Source
 * 
 * ARCHITECTURAL ISOLATION RULE:
 * This is the SINGLE dedicated mock data file for the entire application.
 * No mock data arrays or fake objects are hardcoded directly within UI components.
 * When the real Prisma / Supabase backend is connected via `BankingService` and `AuthService`,
 * all components transition seamlessly by consuming the live API endpoints.
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
import {
  SupportAgent,
  SupportConversation,
  SupportTicket,
  CustomerProfile,
  CannedResponse,
  SupportAnalytics,
  AiChatConversation
} from '../types/support';

// -----------------------------------------------------------------------------
// 1. User Profile & Private Wealth Relationship Manager
// -----------------------------------------------------------------------------
export const USER_PROFILE = {
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

// -----------------------------------------------------------------------------
// 2. Bank Accounts
// CRITICAL RULE: Any account using US Dollars (USD) automatically links
// a unique cryptographic settlement wallet address and has isWalletProvisioned = true.
// -----------------------------------------------------------------------------
export const INITIAL_ACCOUNTS: BankAccount[] = [
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
    colorTheme: 'sky',
    isWalletProvisioned: false
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
    colorTheme: 'amber',
    isWalletProvisioned: false
  }
];

// -----------------------------------------------------------------------------
// 3. Transactions Ledger
// -----------------------------------------------------------------------------
export const INITIAL_TRANSACTIONS: Transaction[] = [
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

// -----------------------------------------------------------------------------
// 4. Beneficiaries Directory
// -----------------------------------------------------------------------------
export const INITIAL_BENEFICIARIES: Beneficiary[] = [
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

// -----------------------------------------------------------------------------
// 5. Payment Cards
// -----------------------------------------------------------------------------
export const INITIAL_CARDS: PaymentCard[] = [
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

// -----------------------------------------------------------------------------
// 6. Scheduled Bills & Executive Invoices
// -----------------------------------------------------------------------------
export const INITIAL_BILLS: BillPayment[] = [
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

// -----------------------------------------------------------------------------
// 7. Savings & Capital Syndicate Goals
// -----------------------------------------------------------------------------
export const INITIAL_SAVINGS_GOALS: SavingsGoal[] = [
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

// -----------------------------------------------------------------------------
// 8. Budget Categories
// -----------------------------------------------------------------------------
export const INITIAL_BUDGETS: BudgetCategory[] = [
  { id: 'b-1', name: 'Investments & Capital Calls', budgeted: 500000, spent: 375000, currency: 'USD', color: 'emerald' },
  { id: 'b-2', name: 'Private Aviation & Travel', budgeted: 80000, spent: 34800, currency: 'USD', color: 'sky' },
  { id: 'b-3', name: 'Real Estate Maintenance', budgeted: 40000, spent: 14200, currency: 'USD', color: 'amber' },
  { id: 'b-4', name: 'Executive Lifestyle & Dining', budgeted: 25000, spent: 18450, currency: 'USD', color: 'purple' }
];

// -----------------------------------------------------------------------------
// 9. Notifications
// -----------------------------------------------------------------------------
export const INITIAL_NOTIFICATIONS: BankNotification[] = [
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

// -----------------------------------------------------------------------------
// 10. Statements & Documents
// -----------------------------------------------------------------------------
export const INITIAL_STATEMENTS: BankStatement[] = [
  {
    id: 'stmt-1',
    month: 'February',
    year: 2026,
    accountName: 'Premier Liquidity Checking (USD)',
    startingBalance: 245000.00,
    closingBalance: 284520.40,
    totalInflow: 188400.00,
    totalOutflow: 148879.60,
    fileName: 'Aureus_Statement_Feb_2026_Checking.pdf',
    fileSize: '1.4 MB'
  },
  {
    id: 'stmt-2',
    month: 'January',
    year: 2026,
    accountName: 'Premier Liquidity Checking (USD)',
    startingBalance: 210000.00,
    closingBalance: 245000.00,
    totalInflow: 195000.00,
    totalOutflow: 160000.00,
    fileName: 'Aureus_Statement_Jan_2026_Checking.pdf',
    fileSize: '1.4 MB'
  }
];

export interface TaxDocumentItem {
  name: string;
  size: string;
  date: string;
}

export const INITIAL_TAX_DOCUMENTS: TaxDocumentItem[] = [
  { name: '2025 Consolidated Form 1099-INT (Interest Yield)', size: '420 KB', date: 'Jan 31, 2026' },
  { name: '2025 Form 1099-B (Proceeds from Broker & Barter)', size: '890 KB', date: 'Feb 15, 2026' },
  { name: '2025 Foreign Bank & Financial Accounts (FBAR FinCEN 114)', size: '310 KB', date: 'Apr 02, 2026' },
  { name: '2025 Aureus Sovereign Annual Audit Report', size: '2.4 MB', date: 'Mar 10, 2026' }
];

// -----------------------------------------------------------------------------
// 11. Security Sessions
// -----------------------------------------------------------------------------
export const INITIAL_SESSIONS: UserSession[] = [
  {
    id: 'sess-1',
    device: 'Apple MacBook Pro 16" M3 Max',
    browser: 'Safari 18.2 (macOS Sequoia)',
    location: 'New York, USA',
    ipAddress: '192.88.99.14 (Bloomberg Gateway)',
    lastActive: 'Active right now',
    isCurrent: true
  },
  {
    id: 'sess-2',
    device: 'Apple iPhone 16 Pro Max',
    browser: 'Aureus Private Mobile 4.2',
    location: 'New York, USA',
    ipAddress: '172.56.21.84',
    lastActive: '42 mins ago',
    isCurrent: false
  }
];

// -----------------------------------------------------------------------------
// 12. Cashflow Chart Visualization Points
// -----------------------------------------------------------------------------
export interface CashflowPoint {
  month: string;
  income: number;
  spend: number;
  net: number;
}

export const CASHFLOW_CHART_DATA: CashflowPoint[] = [
  { month: 'Sep', income: 94000, spend: 62000, net: 32000 },
  { month: 'Oct', income: 112000, spend: 71000, net: 41000 },
  { month: 'Nov', income: 104000, spend: 89000, net: 15000 },
  { month: 'Dec', income: 142000, spend: 95000, net: 47000 },
  { month: 'Jan', income: 128000, spend: 78000, net: 50000 },
  { month: 'Feb', income: 135000, spend: 82000, net: 53000 }
];

// -----------------------------------------------------------------------------
// 13. Dedicated Private Wealth Support Officers & Concierge Desk
// -----------------------------------------------------------------------------
// 13. Dedicated 5 Private Wealth Support Staff Members
// -----------------------------------------------------------------------------
export const SUPPORT_AGENTS: Record<string, SupportAgent> = {
  marcus: {
    id: 'agent-1',
    name: 'Marcus Sterling',
    role: 'Senior VP, Private Banking & Wealth',
    department: 'Private Wealth',
    specialization: 'Private Wealth Advisory & Sovereign Yield Sweeps',
    initials: 'MS',
    status: 'online',
    responseTime: '< 1 min',
    license: 'FINRA Series 7, 66 · Managing Director',
    office: '540 Madison Ave, 28th Floor, New York, NY',
    directPhone: '+1 (212) 555-0199',
    email: 'marcus.sterling@aureusbank.com',
    activeConversationsCount: 3,
    availabilityLabel: 'Available for Advisory',
    rating: 4.98
  },
  wire_desk: {
    id: 'agent-2',
    name: 'Eleanor Vance',
    role: 'Managing Officer, Global Wire Clearing',
    department: 'Treasury & Wires',
    specialization: 'High-Value Fedwire Realtime, IMAD Receipts & FX Clearing',
    initials: 'EV',
    status: 'online',
    responseTime: '< 3 mins',
    license: 'Federal Reserve Fedwire Operations Specialist',
    office: 'Clearing Operations, Zurich / New York',
    directPhone: '+1 (212) 555-0244',
    email: 'clearing.desk@aureusbank.com',
    activeConversationsCount: 4,
    availabilityLabel: 'Clearing Desk Live',
    rating: 4.95
  },
  card_concierge: {
    id: 'agent-3',
    name: 'Julian Croft',
    role: 'Director, Obsidian Lifestyle Concierge',
    department: 'Card Concierge',
    specialization: 'Obsidian Black Metal Cards, Dynamic Limits & VIP Access',
    initials: 'JC',
    status: 'online',
    responseTime: '< 2 mins',
    license: 'Les Clefs d’Or International Partner',
    office: 'Mayfair, London & New York',
    directPhone: '+44 20 7946 0991',
    email: 'concierge.obsidian@aureusbank.com',
    activeConversationsCount: 2,
    availabilityLabel: 'Concierge On Standby',
    rating: 4.99
  },
  security_desk: {
    id: 'agent-4',
    name: 'Dr. Aris Thorne',
    role: 'Head of Information Security & Cryptography',
    department: 'Security & Compliance',
    specialization: 'FIDO2 Hardware Keys, KYC Tier 3 & Biometric Governance',
    initials: 'AT',
    status: 'busy',
    responseTime: '< 5 mins',
    license: 'CISSP · Hardware Security Key Officer',
    office: 'Zurich Security Operations Center',
    directPhone: '+41 44 668 1200',
    email: 'infosec@aureusbank.com',
    activeConversationsCount: 3,
    availabilityLabel: 'Reviewing Security Audit',
    rating: 4.92
  },
  lending_desk: {
    id: 'agent-5',
    name: 'Seraphina Lin, CFA',
    role: 'Principal Fiduciary Officer, Institutional Lending',
    department: 'Institutional Lending',
    specialization: 'Lombard Credit Facilities, Syndicate Escrow & Aircraft Financing',
    initials: 'SL',
    status: 'away',
    responseTime: '< 10 mins',
    license: 'CFA Charterholder · Private Credit Syndicate Partner',
    office: 'Marina Bay Financial Centre, Singapore',
    directPhone: '+65 6712 8800',
    email: 'seraphina.lin@aureusbank.com',
    activeConversationsCount: 2,
    availabilityLabel: 'In Credit Committee (Returns in 10m)',
    rating: 4.97
  }
};

// -----------------------------------------------------------------------------
// 14. Customer Directory (Multi-Customer Support Ecosystem)
// -----------------------------------------------------------------------------
export const SUPPORT_CUSTOMERS: Record<string, CustomerProfile> = {
  alexander: {
    id: 'usr_alexander_wright',
    name: 'Alexander V. Wright',
    email: 'a.wright@wrightcapital.co',
    phone: '+1 (415) 890-4421',
    clientTier: 'Aureus Sovereign Private Client',
    kycLevel: 'Tier 3 (BVN & ID Verified)',
    accountNumberMasked: '•••• 8924',
    avatarUrl: '/src/assets/images/avatar_bank_user_1790168725177.jpg',
    balanceUSD: 5374520.40,
    assignedStaffId: 'agent-1',
    joinedYear: '2021',
    primaryJurisdiction: 'Delaware / New York'
  },
  victoria: {
    id: 'usr_victoria_montclaire',
    name: 'Victoria Montclaire',
    email: 'v.montclaire@montclairetrust.ch',
    phone: '+41 22 710 4400',
    clientTier: 'Sovereign Family Office',
    kycLevel: 'Tier 3 (Swiss Certified)',
    accountNumberMasked: '•••• 4108',
    balanceUSD: 14200000.00,
    assignedStaffId: 'agent-2',
    joinedYear: '2019',
    primaryJurisdiction: 'Geneva / London'
  },
  harrison: {
    id: 'usr_harrison_vance',
    name: 'Harrison Vance',
    email: 'h.vance@apexsyndicate.com',
    phone: '+1 (212) 555-9011',
    clientTier: 'Corporate Ultra Tier',
    kycLevel: 'Tier 3 Verified',
    accountNumberMasked: '•••• 7712',
    balanceUSD: 8900000.00,
    assignedStaffId: 'agent-3',
    joinedYear: '2022',
    primaryJurisdiction: 'New York, USA'
  },
  sophia: {
    id: 'usr_sophia_almansoor',
    name: 'Sophia Al-Mansoor',
    email: 's.almansoor@horizonassets.ae',
    phone: '+971 4 319 8800',
    clientTier: 'Aureus Royal Sovereign',
    kycLevel: 'Tier 3 Verified',
    accountNumberMasked: '•••• 3319',
    balanceUSD: 26500000.00,
    assignedStaffId: 'agent-4',
    joinedYear: '2020',
    primaryJurisdiction: 'DIFC, Dubai'
  },
  lucas: {
    id: 'usr_lucas_fontaine',
    name: 'Lucas Fontaine',
    email: 'l.fontaine@fontainegroup.fr',
    phone: '+33 1 42 68 55 00',
    clientTier: 'Sovereign Private Client',
    kycLevel: 'Tier 3 Verified',
    accountNumberMasked: '•••• 9940',
    balanceUSD: 6200000.00,
    assignedStaffId: 'agent-5',
    joinedYear: '2023',
    primaryJurisdiction: 'Paris / Luxembourg'
  }
};

// -----------------------------------------------------------------------------
// 15. Conversations Across Clients & Staff
// -----------------------------------------------------------------------------
export const INITIAL_CONVERSATIONS: SupportConversation[] = [
  // Conversation 1: Alexander Wright with Marcus Sterling
  {
    id: 'conv-1',
    agent: SUPPORT_AGENTS.marcus,
    customerId: 'usr_alexander_wright',
    customerName: 'Alexander V. Wright',
    customerTier: 'Aureus Sovereign Private Client',
    customerAvatar: '/src/assets/images/avatar_bank_user_1790168725177.jpg',
    category: 'General Support',
    subject: 'Quarterly Liquid Yield & Syndicate Carry Sweep',
    department: 'Private Wealth Advisory',
    lastMessage: 'I have logged your instructions with our private treasury desk at 540 Madison Ave. Documents will be ready by 2 PM.',
    lastMessageTimestamp: '10:42 AM',
    unreadCount: 2,
    status: 'active',
    linkedTicketId: 'TKT-8921-NY',
    internalNotes: 'Client requested sweep of $80k from operating checking to 4.85% APY Treasury vault. Approved allocation order prepared.',
    messages: [
      {
        id: 'm-1',
        conversationId: 'conv-1',
        sender: 'system',
        text: 'Session authenticated. FIDO2 hardware token verified. End-to-end 256-bit encryption active with Marcus Sterling.',
        timestamp: '09:10 AM',
        status: 'read'
      },
      {
        id: 'm-2',
        conversationId: 'conv-1',
        sender: 'agent',
        agentId: 'agent-1',
        agentName: 'Marcus Sterling',
        text: 'Good morning, Mr. Wright. Marcus Sterling here. Your $25,000 disbursement to Axiom Neural cleared seamlessly this morning. How may my desk assist your portfolio today?',
        timestamp: '09:12 AM',
        status: 'read'
      },
      {
        id: 'm-3',
        conversationId: 'conv-1',
        sender: 'customer',
        text: 'Marcus, could we review the Treasury Yield sweep? I want to allocate an additional $80,000 from the operating checking into the 4.85% APY vault before the close of European trading.',
        timestamp: '09:30 AM',
        status: 'read'
      },
      {
        id: 'm-4',
        conversationId: 'conv-1',
        sender: 'agent',
        agentId: 'agent-1',
        agentName: 'Marcus Sterling',
        text: 'Certainly, Mr. Wright. At 4.85% APY, that sweep will add approximately +$323.33/month in risk-free yield with zero lockup period. I have drafted the internal allocation order.',
        timestamp: '09:34 AM',
        status: 'read',
        attachment: {
          name: 'Allocation_Order_80K_Treasury.pdf',
          size: '340 KB',
          type: 'pdf'
        }
      },
      {
        id: 'm-5',
        conversationId: 'conv-1',
        sender: 'customer',
        text: 'Approved. Please execute and send over the updated statement summary when complete.',
        timestamp: '10:38 AM',
        status: 'delivered'
      },
      {
        id: 'm-6',
        conversationId: 'conv-1',
        sender: 'agent',
        agentId: 'agent-1',
        agentName: 'Marcus Sterling',
        text: 'I have logged your instructions with our private treasury desk at 540 Madison Ave. Documents will be ready by 2 PM.',
        timestamp: '10:42 AM',
        status: 'delivered'
      }
    ]
  },
  // Conversation 2: Alexander Wright with Eleanor Vance
  {
    id: 'conv-2',
    agent: SUPPORT_AGENTS.wire_desk,
    customerId: 'usr_alexander_wright',
    customerName: 'Alexander V. Wright',
    customerTier: 'Aureus Sovereign Private Client',
    customerAvatar: '/src/assets/images/avatar_bank_user_1790168725177.jpg',
    category: 'Transfers',
    subject: 'Fedwire Clearing #WRE-882941 Status Confirmation',
    department: 'Treasury & Wires',
    lastMessage: 'Federal Reserve reference Fedwire IMAD 20260922MMQF002491 confirmed settled at 16:42:10 EST.',
    lastMessageTimestamp: 'Yesterday',
    unreadCount: 0,
    status: 'resolved',
    linkedTicketId: 'TKT-8840-FED',
    internalNotes: 'NetJets aviation flight block wire cleared. IMAD confirmation receipt dispatched.',
    messages: [
      {
        id: 'm-201',
        conversationId: 'conv-2',
        sender: 'system',
        text: 'Fedwire tracking channel initialized. Connected to BNY Mellon clearing node.',
        timestamp: 'Yesterday 16:30',
        status: 'read'
      },
      {
        id: 'm-202',
        conversationId: 'conv-2',
        sender: 'customer',
        text: 'Inquiring regarding settlement receipt for the NetJets flight block transfer ($18,450.00).',
        timestamp: 'Yesterday 16:35',
        status: 'read'
      },
      {
        id: 'm-203',
        conversationId: 'conv-2',
        sender: 'agent',
        agentId: 'agent-2',
        agentName: 'Eleanor Vance',
        text: 'Federal Reserve reference Fedwire IMAD 20260922MMQF002491 confirmed settled at 16:42:10 EST. Your correspondent account has been credited and flight dispatch authorized.',
        timestamp: 'Yesterday 16:42',
        status: 'read',
        attachment: {
          name: 'Fedwire_IMAD_Confirmation_Receipt.pdf',
          size: '180 KB',
          type: 'receipt'
        }
      }
    ]
  },
  // Conversation 3: Victoria Montclaire with Eleanor Vance (assigned to Eleanor)
  {
    id: 'conv-3',
    agent: SUPPORT_AGENTS.wire_desk,
    customerId: 'usr_victoria_montclaire',
    customerName: 'Victoria Montclaire',
    customerTier: 'Sovereign Family Office',
    category: 'Transfers',
    subject: 'Cross-Border Escrow Release for Mayfair Property Acquisition ($2.4M)',
    department: 'Treasury & Wires',
    lastMessage: 'Dual-signatory verification received from UBS Zurich. Transfer dispatched over SWIFT GPI.',
    lastMessageTimestamp: '11:15 AM',
    unreadCount: 1,
    status: 'active',
    linkedTicketId: 'TKT-8891-SWIFT',
    internalNotes: 'Fiduciary documents verified by legal. Currency conversion from CHF to GBP completed at preferential private spread.',
    messages: [
      {
        id: 'm-301',
        conversationId: 'conv-3',
        sender: 'customer',
        text: 'Eleanor, Coutts & Co in London requires the UETR reference for our completion deadline at 14:00 GMT.',
        timestamp: '11:05 AM',
        status: 'read'
      },
      {
        id: 'm-302',
        conversationId: 'conv-3',
        sender: 'agent',
        agentId: 'agent-2',
        agentName: 'Eleanor Vance',
        text: 'Dual-signatory verification received from UBS Zurich. Transfer dispatched over SWIFT GPI. UETR is 482910-AA99-BCC2.',
        timestamp: '11:15 AM',
        status: 'sent'
      }
    ]
  },
  // Conversation 4: Harrison Vance with Julian Croft (assigned to Julian)
  {
    id: 'conv-4',
    agent: SUPPORT_AGENTS.card_concierge,
    customerId: 'usr_harrison_vance',
    customerName: 'Harrison Vance',
    customerTier: 'Corporate Ultra Tier',
    category: 'Account Issues',
    subject: 'Temporary Obsidian Card Limit Elevation for Christie’s Auction',
    department: 'Card Concierge',
    lastMessage: 'Limit temporary elevation to $250,000 for London auction acquisition has been activated.',
    lastMessageTimestamp: 'Yesterday',
    unreadCount: 0,
    status: 'resolved',
    linkedTicketId: 'TKT-8799-CC',
    internalNotes: 'Client attended post-war contemporary art evening sale. Cap restored automatically after 48h.',
    messages: [
      {
        id: 'm-401',
        conversationId: 'conv-4',
        sender: 'customer',
        text: 'Julian, good afternoon. I will be bidding in London tonight. Please lift the Obsidian POS ceiling.',
        timestamp: 'Yesterday 14:10',
        status: 'read'
      },
      {
        id: 'm-402',
        conversationId: 'conv-4',
        sender: 'agent',
        agentId: 'agent-3',
        agentName: 'Julian Croft',
        text: 'Limit temporary elevation to $250,000 for London auction acquisition has been activated.',
        timestamp: 'Yesterday 14:15',
        status: 'read'
      }
    ]
  },
  // Conversation 5: Sophia Al-Mansoor with Dr. Aris Thorne (assigned to Aris)
  {
    id: 'conv-5',
    agent: SUPPORT_AGENTS.security_desk,
    customerId: 'usr_sophia_almansoor',
    customerName: 'Sophia Al-Mansoor',
    customerTier: 'Aureus Royal Sovereign',
    category: 'Security',
    subject: 'Dual YubiKey FIDO2 Security Audit & Secondary Key Binding',
    department: 'Security & Compliance',
    lastMessage: 'Secondary hardware token #YB-9942 successfully bonded. Biometric multi-party signing armed.',
    lastMessageTimestamp: '2 days ago',
    unreadCount: 0,
    status: 'resolved',
    linkedTicketId: 'TKT-8650-SEC',
    internalNotes: 'Hardware token issued in person at DIFC desk. Verified with UAE Pass and physical passport.',
    messages: [
      {
        id: 'm-501',
        conversationId: 'conv-5',
        sender: 'customer',
        text: 'Dr. Thorne, we are deploying a backup hardware key for our family office trustees.',
        timestamp: '2 days ago',
        status: 'read'
      },
      {
        id: 'm-502',
        conversationId: 'conv-5',
        sender: 'agent',
        agentId: 'agent-4',
        agentName: 'Dr. Aris Thorne',
        text: 'Secondary hardware token #YB-9942 successfully bonded. Biometric multi-party signing armed.',
        timestamp: '2 days ago',
        status: 'read'
      }
    ]
  },
  // Conversation 6: Lucas Fontaine with Seraphina Lin (assigned to Seraphina)
  {
    id: 'conv-6',
    agent: SUPPORT_AGENTS.lending_desk,
    customerId: 'usr_lucas_fontaine',
    customerName: 'Lucas Fontaine',
    customerTier: 'Sovereign Private Client',
    category: 'General Support',
    subject: 'Lombard Credit Facility Against US Treasury Reserve',
    department: 'Institutional Lending',
    lastMessage: 'Credit committee has approved the $4.5M standby liquidity line at SOFR + 0.90%. Term sheet attached.',
    lastMessageTimestamp: '3 days ago',
    unreadCount: 0,
    status: 'active',
    linkedTicketId: 'TKT-8994-LOMBARD',
    internalNotes: 'Collateralized by 105% US T-Bills held in custody. Zero loan origination fee for Sovereign Tier.',
    messages: [
      {
        id: 'm-601',
        conversationId: 'conv-6',
        sender: 'customer',
        text: 'Seraphina, we need non-dilutive liquidity for our Paris real estate seed round without selling our treasuries.',
        timestamp: '3 days ago',
        status: 'read'
      },
      {
        id: 'm-602',
        conversationId: 'conv-6',
        sender: 'agent',
        agentId: 'agent-5',
        agentName: 'Seraphina Lin, CFA',
        text: 'Credit committee has approved the $4.5M standby liquidity line at SOFR + 0.90%. Term sheet attached.',
        timestamp: '3 days ago',
        status: 'read',
        attachment: {
          name: 'Aureus_Lombard_TermSheet_4.5M.pdf',
          size: '420 KB',
          type: 'pdf'
        }
      }
    ]
  },
  // Conversation 7: Victoria Montclaire with Marcus Sterling (pending estate review)
  {
    id: 'conv-7',
    agent: SUPPORT_AGENTS.marcus,
    customerId: 'usr_victoria_montclaire',
    customerName: 'Victoria Montclaire',
    customerTier: 'Sovereign Family Office',
    category: 'General Support',
    subject: 'Q4 Sovereign Fiduciary Trust Tax-Loss Harvesting Mandate',
    department: 'Private Wealth',
    lastMessage: 'Awaiting your tax counsel signature on Schedule K-1 allocation addendum.',
    lastMessageTimestamp: '11:30 AM',
    unreadCount: 1,
    status: 'pending',
    linkedTicketId: 'TKT-9012-TAX',
    internalNotes: 'Pending Swiss tax counsel co-signature before executing municipal bond rebalance.',
    messages: [
      {
        id: 'm-701',
        conversationId: 'conv-7',
        sender: 'customer',
        text: 'Marcus, please prepare the Q4 tax-loss harvesting schedule for our Geneva family trust.',
        timestamp: '11:18 AM',
        status: 'read'
      },
      {
        id: 'm-702',
        conversationId: 'conv-7',
        sender: 'agent',
        agentId: 'agent-1',
        agentName: 'Marcus Sterling',
        text: 'Awaiting your tax counsel signature on Schedule K-1 allocation addendum.',
        timestamp: '11:30 AM',
        status: 'delivered'
      }
    ]
  },
  // Conversation 8: Alexander Wright with Julian Croft (active card concierge)
  {
    id: 'conv-8',
    agent: SUPPORT_AGENTS.card_concierge,
    customerId: 'usr_alexander_wright',
    customerName: 'Alexander V. Wright',
    customerTier: 'Aureus Sovereign Private Client',
    customerAvatar: '/src/assets/images/avatar_bank_user_1790168725177.jpg',
    category: 'Account Issues',
    subject: 'Obsidian Metal Card Travel Whitelist — Zurich & Tokyo',
    department: 'Card Concierge',
    lastMessage: 'Travel advisory whitelist armed for Zurich and Tokyo through November 28.',
    lastMessageTimestamp: '08:50 AM',
    unreadCount: 0,
    status: 'active',
    linkedTicketId: 'TKT-9018-CC',
    internalNotes: 'Client departing for Zurich Wealth Summit and Tokyo partner meetings.',
    messages: [
      {
        id: 'm-801',
        conversationId: 'conv-8',
        sender: 'customer',
        text: 'Julian, please clear my Obsidian Black Metal card for Zurich and Tokyo merchants over the next two weeks.',
        timestamp: '08:42 AM',
        status: 'read'
      },
      {
        id: 'm-802',
        conversationId: 'conv-8',
        sender: 'agent',
        agentId: 'agent-3',
        agentName: 'Julian Croft',
        text: 'Travel advisory whitelist armed for Zurich and Tokyo through November 28.',
        timestamp: '08:50 AM',
        status: 'read'
      }
    ]
  }
];

// -----------------------------------------------------------------------------
// 16. Support Tickets
// -----------------------------------------------------------------------------
export const INITIAL_TICKETS: SupportTicket[] = [
  {
    id: 'TKT-8921-NY',
    subject: 'Treasury Reserve Yield Allocation ($80,000 Sweep)',
    category: 'Custody & Escrow',
    priority: 'High',
    status: 'In Review',
    createdAt: '2026-09-23 09:30',
    updatedAt: '2026-09-23 10:42',
    assignedAgent: 'Marcus Sterling',
    assignedAgentId: 'agent-1',
    customerId: 'usr_alexander_wright',
    customerName: 'Alexander V. Wright',
    description: 'Internal capital sweep from Operating Liquidity to 4.85% APY Treasury Vault with same-day settlement.',
    conversationId: 'conv-1'
  },
  {
    id: 'TKT-8840-FED',
    subject: 'Fedwire IMAD Clearing Confirmation #WRE-882941',
    category: 'Wire Clearance',
    priority: 'Normal',
    status: 'Resolved',
    createdAt: '2026-09-22 16:30',
    updatedAt: '2026-09-22 16:45',
    assignedAgent: 'Eleanor Vance',
    assignedAgentId: 'agent-2',
    customerId: 'usr_alexander_wright',
    customerName: 'Alexander V. Wright',
    description: 'Outbound Federal Reserve IMAD receipt generation for fractional aviation flight block payment.',
    conversationId: 'conv-2'
  },
  {
    id: 'TKT-8891-SWIFT',
    subject: 'Cross-Border Escrow Release for Mayfair Property Acquisition ($2.4M)',
    category: 'Wire Clearance',
    priority: 'Urgent',
    status: 'In Review',
    createdAt: '2026-09-24 10:00',
    updatedAt: '2026-09-24 11:15',
    assignedAgent: 'Eleanor Vance',
    assignedAgentId: 'agent-2',
    customerId: 'usr_victoria_montclaire',
    customerName: 'Victoria Montclaire',
    description: 'Urgent completion release to Coutts & Co London escrow account for prime Mayfair residence acquisition.',
    conversationId: 'conv-3'
  },
  {
    id: 'TKT-8799-CC',
    subject: 'Obsidian Card Daily Limit Temporary Elevation ($250,000)',
    category: 'Limit Increase',
    priority: 'High',
    status: 'Resolved',
    createdAt: '2026-09-18 14:10',
    updatedAt: '2026-09-18 14:20',
    assignedAgent: 'Julian Croft',
    assignedAgentId: 'agent-3',
    customerId: 'usr_harrison_vance',
    customerName: 'Harrison Vance',
    description: 'Temporary 48-hour card authorization cap enhancement for international Christie’s auction item.',
    conversationId: 'conv-4'
  },
  {
    id: 'TKT-8650-SEC',
    subject: 'Dual YubiKey FIDO2 Provisioning & Hardware Audit',
    category: 'Card Services',
    priority: 'Normal',
    status: 'Resolved',
    createdAt: '2026-08-30 10:45',
    updatedAt: '2026-08-30 11:15',
    assignedAgent: 'Dr. Aris Thorne',
    assignedAgentId: 'agent-4',
    customerId: 'usr_sophia_almansoor',
    customerName: 'Sophia Al-Mansoor',
    description: 'Cryptographic binding of secondary backup hardware key for multi-million dollar wire authorizations.',
    conversationId: 'conv-5'
  },
  {
    id: 'TKT-8994-LOMBARD',
    subject: 'Lombard Credit Facility Against US Treasury Reserve ($4.5M)',
    category: 'Custody & Escrow',
    priority: 'High',
    status: 'Open',
    createdAt: '2026-09-20 08:30',
    updatedAt: '2026-09-21 15:40',
    assignedAgent: 'Seraphina Lin, CFA',
    assignedAgentId: 'agent-5',
    customerId: 'usr_lucas_fontaine',
    customerName: 'Lucas Fontaine',
    description: 'Establishment of revolving standby credit line at SOFR + 0.90% secured against $5.0M in short-term T-bills.',
    conversationId: 'conv-6'
  },
  {
    id: 'TKT-9012-TAX',
    subject: 'Q4 Sovereign Fiduciary Trust Tax-Loss Harvesting Mandate',
    category: 'Tax & Statements',
    priority: 'High',
    status: 'Open',
    createdAt: '2026-11-12 11:18',
    updatedAt: '2026-11-12 11:30',
    assignedAgent: 'Marcus Sterling',
    assignedAgentId: 'agent-1',
    customerId: 'usr_victoria_montclaire',
    customerName: 'Victoria Montclaire',
    description: 'Schedule K-1 allocation addendum awaiting co-signature for Geneva family trust rebalance.',
    conversationId: 'conv-7'
  },
  {
    id: 'TKT-9018-CC',
    subject: 'Obsidian Metal Card Travel Whitelist — Zurich & Tokyo',
    category: 'Card Services',
    priority: 'Normal',
    status: 'In Review',
    createdAt: '2026-11-12 08:42',
    updatedAt: '2026-11-12 08:50',
    assignedAgent: 'Julian Croft',
    assignedAgentId: 'agent-3',
    customerId: 'usr_alexander_wright',
    customerName: 'Alexander V. Wright',
    description: 'Merchant travel clearance for Obsidian Black Metal card across Switzerland and Japan.',
    conversationId: 'conv-8'
  }
];

// -----------------------------------------------------------------------------
// 17. Approved Canned Response Templates
// -----------------------------------------------------------------------------
export const INITIAL_CANNED_RESPONSES: CannedResponse[] = [
  {
    id: 'cr-1',
    shortcut: '/greeting',
    title: 'Executive Welcome & Inquiry',
    category: 'Greetings',
    content: 'Good day. Marcus Sterling here with Aureus Private Wealth. How may my desk assist your portfolio today?'
  },
  {
    id: 'cr-2',
    shortcut: '/transfer',
    title: 'Fedwire IMAD Dispatch Notice',
    category: 'Wires & Transfers',
    content: 'I have confirmed your outbound Fedwire instruction. The IMAD tracking reference will be generated and dispatched once secondary cryptographic authorization clears.'
  },
  {
    id: 'cr-3',
    shortcut: '/kyc',
    title: 'Sovereign Tier 3 Documentation',
    category: 'Security & KYC',
    content: 'To elevate your vault limit to Sovereign Tier, our compliance officers require updated source-of-wealth declarations and active FIDO2 biometric key binding.'
  },
  {
    id: 'cr-4',
    shortcut: '/wait',
    title: 'Treasury Floor Consultation Hold',
    category: 'Hold & Verification',
    content: 'Please allow me 2–3 minutes while I consult our institutional clearing desk on the 28th floor at 540 Madison Ave.'
  },
  {
    id: 'cr-5',
    shortcut: '/closing',
    title: 'Formal Settlement Closure',
    category: 'Closing',
    content: 'It has been my pleasure assisting you today. Your transaction confirmation has been securely archived to your Vault Statements. Have a wonderful day.'
  },
  {
    id: 'cr-6',
    shortcut: '/escrow',
    title: 'Syndicate Escrow Acknowledgement',
    category: 'Wires & Transfers',
    content: 'Our private syndicate escrow desk has acknowledged the capital allocation instructions. Settlement is scheduled for same-day value.'
  }
];

// -----------------------------------------------------------------------------
// 18. Support Analytics (Super Admin KPI Dashboard)
// -----------------------------------------------------------------------------
export const INITIAL_SUPPORT_ANALYTICS: SupportAnalytics = {
  totalActiveChats: 8,
  totalPendingTickets: 3,
  totalResolvedToday: 14,
  avgResponseTime: '1m 18s',
  csatScore: 99.2,
  categoryBreakdown: [
    { category: 'Transfers', count: 18, percentage: 42 },
    { category: 'General Support', count: 12, percentage: 28 },
    { category: 'Security', count: 8, percentage: 18 },
    { category: 'Account Issues', count: 5, percentage: 12 }
  ]
};

// Aliases for seamless component consumption
export const INITIAL_SUPPORT_CONVERSATIONS: SupportConversation[] = INITIAL_CONVERSATIONS;
export const SUPPORT_STAFF_LIST: SupportAgent[] = Object.values(SUPPORT_AGENTS);

// -----------------------------------------------------------------------------
// 19. Initial AI Chat History (Isolated Fallback for AI Chat Room)
// -----------------------------------------------------------------------------
export const INITIAL_AI_CONVERSATIONS: AiChatConversation[] = [
  {
    id: 'ai-conv-staff-1',
    title: 'Fedwire IMAD & Treasury Sweep Briefing',
    scope: 'staff',
    userId: 'agent-1',
    linkedSupportConversationId: 'conv-1',
    linkedSupportSubject: 'Treasury Reserve Yield Allocation ($80,000 Sweep)',
    createdAt: '2026-11-12 09:15',
    updatedAt: '09:42 AM',
    messages: [
      {
        id: 'ai-m-1',
        conversationId: 'ai-conv-staff-1',
        role: 'user',
        content: 'Summarize Alexander Wright’s $80,000 Treasury Reserve sweep request and note any settlement cutoffs.',
        timestamp: '09:40 AM',
        status: 'sent'
      },
      {
        id: 'ai-m-2',
        conversationId: 'ai-conv-staff-1',
        role: 'assistant',
        content:
          'Client Alexander V. Wright requested an $80,000 internal sweep from Premier Liquidity Checking into the 4.85% APY Treasury Reserve Vault.\n\n• Settlement Cutoff: Same-day Fedwire / internal treasury accrual closes at 16:00 EST.\n• Authorization: Within Sovereign Tier daily limit; single biometric signature verified.\n• Recommended Reply: Confirm same-day execution and verify accrual start date.',
        timestamp: '09:42 AM',
        status: 'sent',
        metadata: {
          model: 'aureus-copilot-backend',
          referencedConversationId: 'conv-1'
        }
      }
    ]
  },
  {
    id: 'ai-conv-client-1',
    title: 'Treasury Vault Yield & Liquidity Overview',
    scope: 'client',
    userId: 'usr_alexander_wright',
    linkedSupportConversationId: 'conv-1',
    linkedSupportSubject: 'Treasury Reserve Yield Allocation ($80,000 Sweep)',
    createdAt: '2026-11-12 08:30',
    updatedAt: '08:35 AM',
    messages: [
      {
        id: 'ai-c-1',
        conversationId: 'ai-conv-client-1',
        role: 'user',
        content: 'What is the daily liquidity notice period for my 4.85% APY Treasury Reserve Vault?',
        timestamp: '08:34 AM',
        status: 'sent'
      },
      {
        id: 'ai-c-2',
        conversationId: 'ai-conv-client-1',
        role: 'assistant',
        content:
          'Your Aureus Treasury Reserve Vault (4.85% APY) carries zero lockup penalty. Internal sweeps back to Premier Liquidity Checking settle immediately on business days prior to 16:00 EST, while interest compounds monthly.',
        timestamp: '08:35 AM',
        status: 'sent',
        metadata: {
          model: 'aureus-concierge-backend',
          referencedConversationId: 'conv-1'
        }
      }
    ]
  }
];


