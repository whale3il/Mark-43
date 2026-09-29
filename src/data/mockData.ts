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

export const USER_PROFILE = {
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
    colorTheme: 'zinc'
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
    colorTheme: 'emerald'
  },
  {
    id: 'acc-3',
    name: 'Zurich Multi-Currency Vault',
    type: 'multicurrency',
    accountNumber: 'CH93 0076 2011 6238 5291 1',
    routingNumber: '021000089',
    iban: 'CH9300762011623852911',
    swiftBic: 'AURECHZZ',
    balance: 238420.10,
    availableBalance: 238420.10,
    currency: 'EUR',
    colorTheme: 'amber'
  },
  {
    id: 'acc-4',
    name: 'Venture Escrow & Angel Capital',
    type: 'investment',
    accountNumber: '6102 4492 8831',
    routingNumber: '021000089',
    balance: 120000.00,
    availableBalance: 120000.00,
    currency: 'USD',
    colorTheme: 'indigo'
  }
];

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-1',
    accountId: 'acc-1',
    date: '2026-09-22',
    time: '16:42',
    merchant: 'NetJets Europe Charter',
    category: 'Travel & Flights',
    amount: -18450.00,
    currency: 'USD',
    status: 'settled',
    iconType: 'plane',
    paymentMethod: 'Obsidian Metal •• 9012',
    referenceNumber: 'NJ-882941-Z',
    notes: 'Fractional flight block Geneva to London Farnborough'
  },
  {
    id: 'tx-2',
    accountId: 'acc-2',
    date: '2026-09-21',
    time: '09:00',
    merchant: 'US Treasury 4-Week T-Bill Coupon',
    category: 'Income & Dividends',
    amount: 3395.00,
    currency: 'USD',
    status: 'settled',
    iconType: 'trend-up',
    paymentMethod: 'Direct Deposit',
    referenceNumber: 'UST-9120482',
    notes: 'Automated 28-day yield reinvestment dividend'
  },
  {
    id: 'tx-3',
    accountId: 'acc-1',
    date: '2026-09-20',
    time: '20:15',
    merchant: 'Four Seasons George V Paris',
    category: 'Dining & Hospitality',
    amount: -2840.60,
    currency: 'USD',
    status: 'settled',
    iconType: 'coffee',
    paymentMethod: 'Obsidian Metal •• 9012',
    referenceNumber: 'FS-PAR-44910'
  },
  {
    id: 'tx-4',
    accountId: 'acc-1',
    date: '2026-09-19',
    time: '14:28',
    merchant: 'Stripe Corporate Disbursement',
    category: 'Income & Dividends',
    amount: 45000.00,
    currency: 'USD',
    status: 'settled',
    iconType: 'wallet',
    paymentMethod: 'Fedwire Transfer',
    referenceNumber: 'STRIPE-PAY-8812',
    notes: 'Q3 Advisory management distribution'
  },
  {
    id: 'tx-5',
    accountId: 'acc-1',
    date: '2026-09-18',
    time: '11:05',
    merchant: 'Amazon Web Services Cloud Infrastructure',
    category: 'Tech & Cloud',
    amount: -4120.80,
    currency: 'USD',
    status: 'settled',
    iconType: 'server',
    paymentMethod: 'Titanium Virtual •• 3341',
    referenceNumber: 'AWS-INV-9902'
  },
  {
    id: 'tx-6',
    accountId: 'acc-4',
    date: '2026-09-17',
    time: '15:30',
    merchant: 'Axiom Neural Seed Round Tranche II',
    category: 'Investments',
    amount: -25000.00,
    currency: 'USD',
    status: 'settled',
    iconType: 'briefcase',
    paymentMethod: 'Wire Out',
    referenceNumber: 'WIRE-AXIOM-002',
    notes: 'SAFE note participation via Syndicate'
  },
  {
    id: 'tx-7',
    accountId: 'acc-1',
    date: '2026-09-16',
    time: '18:40',
    merchant: 'Patek Philippe Salons London',
    category: 'Luxury & Retail',
    amount: -32000.00,
    currency: 'USD',
    status: 'settled',
    iconType: 'shopping-bag',
    paymentMethod: 'Obsidian Metal •• 9012',
    referenceNumber: 'PP-LON-8891'
  },
  {
    id: 'tx-8',
    accountId: 'acc-1',
    date: '2026-09-15',
    time: '12:00',
    merchant: 'Internal Transfer: Checking to Treasury Reserve',
    category: 'Transfers',
    amount: -50000.00,
    currency: 'USD',
    status: 'settled',
    iconType: 'arrow-right-left',
    paymentMethod: 'Internal Instant',
    referenceNumber: 'TRF-INT-7712'
  },
  {
    id: 'tx-9',
    accountId: 'acc-1',
    date: '2026-09-23',
    time: '05:30',
    merchant: 'Bloomberg Professional Terminal Service',
    category: 'Tech & Cloud',
    amount: -2250.00,
    currency: 'USD',
    status: 'pending',
    iconType: 'laptop',
    paymentMethod: 'Titanium Virtual •• 3341',
    referenceNumber: 'BBG-SUB-0926'
  }
];

export const INITIAL_BENEFICIARIES: Beneficiary[] = [
  {
    id: 'ben-1',
    name: 'Elena Rostova',
    email: 'elena.rostova@rostova-design.com',
    bankName: 'JPMorgan Chase Wealth',
    accountNumber: '•••• 4419',
    routingNumber: '021000021',
    initials: 'ER',
    avatarUrl: '/src/assets/images/avatar_beneficiary_1_1790168738414.jpg',
    category: 'Personal',
    verified: true,
    lastTransferDate: '2026-09-10'
  },
  {
    id: 'ben-2',
    name: 'Kensington Property Management LLC',
    email: 'accounts@kensington-properties.co.uk',
    bankName: 'Barclays Private International',
    accountNumber: '•••• 9021',
    routingNumber: '200000',
    initials: 'KP',
    category: 'Real Estate',
    verified: true,
    lastTransferDate: '2026-09-01'
  },
  {
    id: 'ben-3',
    name: 'Axiom Neural Inc.',
    email: 'treasury@axiomneural.ai',
    bankName: 'Silicon Valley Bridge Bank',
    accountNumber: '•••• 1184',
    routingNumber: '121140399',
    initials: 'AN',
    category: 'Business',
    verified: true,
    lastTransferDate: '2026-09-17'
  },
  {
    id: 'ben-4',
    name: 'Wright Family Office Trust',
    email: 'trustee@wrightfamily.org',
    bankName: 'Northern Trust Geneva',
    accountNumber: '•••• 5520',
    routingNumber: '071000152',
    initials: 'WF',
    category: 'Family Office',
    verified: true,
    lastTransferDate: '2026-08-25'
  }
];

export const INITIAL_CARDS: PaymentCard[] = [
  {
    id: 'card-1',
    nameOnCard: 'ALEXANDER V WRIGHT',
    cardType: 'physical',
    tier: 'Obsidian Black Metal',
    last4: '9012',
    fullNumberMasked: '4000 •••• •••• 9012',
    fullNumberRevealed: '4000 8920 4410 9012',
    expiry: '09/29',
    cvv: '842',
    billingZip: '10022',
    isFrozen: false,
    contactlessEnabled: true,
    onlinePaymentsEnabled: true,
    atmWithdrawalsEnabled: true,
    monthlyLimit: 75000,
    spentThisMonth: 53290.60,
    dailyAtmLimit: 5000,
    atmSpentToday: 0,
    pin: '7419',
    linkedAccountId: 'acc-1'
  },
  {
    id: 'card-2',
    nameOnCard: 'ALEXANDER WRIGHT (DISPOSABLE)',
    cardType: 'virtual',
    tier: 'Titanium Precision Virtual',
    last4: '3341',
    fullNumberMasked: '4242 •••• •••• 3341',
    fullNumberRevealed: '4242 7109 8834 3341',
    expiry: '12/27',
    cvv: '391',
    billingZip: '10022',
    isFrozen: false,
    contactlessEnabled: false,
    onlinePaymentsEnabled: true,
    atmWithdrawalsEnabled: false,
    monthlyLimit: 20000,
    spentThisMonth: 6370.80,
    dailyAtmLimit: 0,
    atmSpentToday: 0,
    pin: '9021',
    linkedAccountId: 'acc-1'
  }
];

export const INITIAL_BILLS: BillPayment[] = [
  {
    id: 'bill-1',
    billerName: 'Manhattan Penthouse HOA & Co-Op Fees',
    category: 'Real Estate & Residence',
    accountNumber: 'HOA-77401-NY',
    amount: 6850.00,
    dueDate: '2026-10-01',
    frequency: 'Monthly',
    autoPay: true,
    status: 'scheduled',
    lastPaidDate: '2026-09-01'
  },
  {
    id: 'bill-2',
    billerName: 'NetJets Quarterly Fractional Maintenance',
    category: 'Aviation & Travel',
    accountNumber: 'NJ-AC-5510',
    amount: 14200.00,
    dueDate: '2026-10-15',
    frequency: 'Quarterly',
    autoPay: true,
    status: 'scheduled',
    lastPaidDate: '2026-07-15'
  },
  {
    id: 'bill-3',
    billerName: 'ConEdison Private Service Grid',
    category: 'Utilities',
    accountNumber: 'CE-992014-9',
    amount: 940.25,
    dueDate: '2026-09-28',
    frequency: 'Monthly',
    autoPay: false,
    status: 'scheduled',
    lastPaidDate: '2026-08-28'
  },
  {
    id: 'bill-4',
    billerName: 'Chubb Masterpiece Luxury Asset Insurance',
    category: 'Insurance',
    accountNumber: 'CHB-POL-00281',
    amount: 4600.00,
    dueDate: '2026-10-05',
    frequency: 'Quarterly',
    autoPay: true,
    status: 'scheduled',
    lastPaidDate: '2026-07-05'
  }
];

export const INITIAL_SAVINGS_GOALS: SavingsGoal[] = [
  {
    id: 'goal-1',
    title: 'Aspen Winter Residence Acquisition',
    targetAmount: 1500000,
    currentAmount: 1120000,
    currency: 'USD',
    targetDate: 'Dec 2026',
    category: 'Property',
    monthlyContribution: 45000,
    color: 'emerald'
  },
  {
    id: 'goal-2',
    title: 'Angel Syndicate Capital Call Reserve',
    targetAmount: 300000,
    currentAmount: 240000,
    currency: 'USD',
    targetDate: 'Mar 2027',
    category: 'Venture Fund',
    monthlyContribution: 15000,
    color: 'amber'
  },
  {
    id: 'goal-3',
    title: 'Offshore Yacht Charter Escrow',
    targetAmount: 120000,
    currentAmount: 95000,
    currency: 'USD',
    targetDate: 'Jun 2027',
    category: 'Acquisition',
    monthlyContribution: 10000,
    color: 'cyan'
  }
];

export const INITIAL_BUDGETS: BudgetCategory[] = [
  { id: 'b-1', name: 'Travel & Private Aviation', budgeted: 35000, spent: 18450, currency: 'USD', color: '#0ea5e9' },
  { id: 'b-2', name: 'Luxury & Lifestyle Retail', budgeted: 40000, spent: 32000, currency: 'USD', color: '#f59e0b' },
  { id: 'b-3', name: 'Fine Dining & Hospitality', budgeted: 8000, spent: 4840, currency: 'USD', color: '#10b981' },
  { id: 'b-4', name: 'Technology & Data Services', budgeted: 10000, spent: 6371, currency: 'USD', color: '#8b5cf6' },
  { id: 'b-5', name: 'Residence Operations & Staff', budgeted: 15000, spent: 9400, currency: 'USD', color: '#ec4899' }
];

export const INITIAL_NOTIFICATIONS: BankNotification[] = [
  {
    id: 'notif-1',
    title: 'Wire Confirmation - Axiom Neural',
    message: 'Outgoing domestic wire for $25,000.00 was confirmed and settled by the Federal Reserve Bank.',
    timestamp: '2 hours ago',
    read: false,
    type: 'transaction'
  },
  {
    id: 'notif-2',
    title: 'Monthly Interest Accrual',
    message: 'Your Treasury Reserve Vault generated $3,395.00 in yield for the recent cycle.',
    timestamp: 'Yesterday at 09:00',
    read: false,
    type: 'yield'
  },
  {
    id: 'notif-3',
    title: 'New Device Authentication',
    message: 'Authorized login detected from MacBook Pro M3 Max in London, UK via YubiKey hardware token.',
    timestamp: '2 days ago',
    read: true,
    type: 'security'
  },
  {
    id: 'notif-4',
    title: 'Quarterly Statement Available',
    message: 'Your consolidated Q3 2026 wealth and tax statement is ready for download.',
    timestamp: 'Sep 15, 2026',
    read: true,
    type: 'system'
  }
];

export const INITIAL_STATEMENTS: BankStatement[] = [
  {
    id: 'stmt-1',
    month: 'August',
    year: 2026,
    accountName: 'Consolidated Wealth Portfolio',
    startingBalance: 1412080.00,
    closingBalance: 1482940.50,
    totalInflow: 138395.00,
    totalOutflow: 67534.50,
    fileName: 'Aureus_Consolidated_Statement_Aug_2026.pdf',
    fileSize: '1.8 MB'
  },
  {
    id: 'stmt-2',
    month: 'July',
    year: 2026,
    accountName: 'Consolidated Wealth Portfolio',
    startingBalance: 1360000.00,
    closingBalance: 1412080.00,
    totalInflow: 112000.00,
    totalOutflow: 59920.00,
    fileName: 'Aureus_Consolidated_Statement_Jul_2026.pdf',
    fileSize: '1.7 MB'
  },
  {
    id: 'stmt-3',
    month: 'June',
    year: 2026,
    accountName: 'Consolidated Wealth Portfolio',
    startingBalance: 1310500.00,
    closingBalance: 1360000.00,
    totalInflow: 98400.00,
    totalOutflow: 48900.00,
    fileName: 'Aureus_Consolidated_Statement_Jun_2026.pdf',
    fileSize: '1.6 MB'
  },
  {
    id: 'stmt-4',
    month: 'May',
    year: 2026,
    accountName: 'Consolidated Wealth Portfolio',
    startingBalance: 1280000.00,
    closingBalance: 1310500.00,
    totalInflow: 85000.00,
    totalOutflow: 54500.00,
    fileName: 'Aureus_Consolidated_Statement_May_2026.pdf',
    fileSize: '1.6 MB'
  }
];

export const INITIAL_SESSIONS: UserSession[] = [
  {
    id: 'sess-1',
    device: 'MacBook Pro 16" M3 Max',
    browser: 'Safari 19.4 · macOS Sequoia',
    location: 'London, United Kingdom',
    ipAddress: '194.223.82.11',
    lastActive: 'Active now',
    isCurrent: true
  },
  {
    id: 'sess-2',
    device: 'iPhone 16 Pro Max',
    browser: 'Aureus Mobile App 4.2 · iOS 19',
    location: 'London, United Kingdom',
    ipAddress: '82.165.197.4',
    lastActive: '34 minutes ago',
    isCurrent: false
  },
  {
    id: 'sess-3',
    device: 'iPad Pro 13" M4',
    browser: 'Safari 19.4 · iPadOS',
    location: 'Zurich, Switzerland',
    ipAddress: '178.63.14.99',
    lastActive: '3 days ago',
    isCurrent: false
  }
];

export const CASHFLOW_CHART_DATA = [
  { month: 'Apr', income: 84000, spend: 42000, net: 42000 },
  { month: 'May', income: 98000, spend: 54500, net: 43500 },
  { month: 'Jun', income: 112000, spend: 48900, net: 63100 },
  { month: 'Jul', income: 105000, spend: 59920, net: 45080 },
  { month: 'Aug', income: 138395, spend: 67534, net: 70861 },
  { month: 'Sep (MTD)', income: 48395, spend: 25411, net: 22984 }
];
