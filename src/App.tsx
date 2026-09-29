import React, { useState, useEffect } from 'react';
import {
  INITIAL_ACCOUNTS,
  INITIAL_TRANSACTIONS,
  INITIAL_BENEFICIARIES,
  INITIAL_CARDS,
  INITIAL_BILLS,
  INITIAL_SAVINGS_GOALS,
  INITIAL_BUDGETS,
  INITIAL_NOTIFICATIONS,
  INITIAL_STATEMENTS,
  INITIAL_SESSIONS,
  USER_PROFILE
} from './data/mockData';
import {
  BankAccount,
  Transaction,
  Beneficiary,
  PaymentCard,
  BillPayment,
  SavingsGoal,
  CurrencyCode
} from './types/banking';
import { Header } from './components/Header';
import { Sidebar, NavTab } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { AccountsView } from './components/AccountsView';
import { TransfersView } from './components/TransfersView';
import { CardsView } from './components/CardsView';
import { AnalyticsView } from './components/AnalyticsView';
import { SavingsBudgetsView } from './components/SavingsBudgetsView';
import { BillsView } from './components/BillsView';
import { StatementsView } from './components/StatementsView';
import { SecurityView } from './components/SecurityView';
import { SupportView } from './components/SupportView';
import { DesignSpecView } from './components/DesignSpecView';
import { TransactionReceiptModal } from './components/TransactionReceiptModal';
import { OpenVaultModal } from './components/OpenVaultModal';
import { LoginView } from './components/auth/LoginView';
import { SignUpView } from './components/auth/SignUpView';
import { UserProfileModal } from './components/UserProfileModal';
import { AuthService } from './services/authService';
import { AuthUser } from './types/auth';
import { CheckCircle2, Menu, X, Headphones, Sun, Moon, LogOut } from 'lucide-react';

export default function App() {
  // Navigation & View Mode
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [isDesignMode, setIsDesignMode] = useState<boolean>(false);
  const [maskBalance, setMaskBalance] = useState<boolean>(false);
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Theme Management (Dark / Light Theme Switcher)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('aureus_theme');
      if (saved === 'light' || saved === 'dark') return saved;
    }
    return 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
    }
    localStorage.setItem('aureus_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    showToast(`Switched to ${next === 'light' ? 'Executive Slate Light' : 'Obsidian Dark'} theme`);
  };

  // Dedicated Support Unread Counter State
  const [supportUnreadCount, setSupportUnreadCount] = useState<number>(2);

  // Authentication & Session State
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => AuthService.getCurrentUser());
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);

  // Core Data States
  const [accounts, setAccounts] = useState<BankAccount[]>(() => AuthService.getUserStoredAccounts());
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>(INITIAL_BENEFICIARIES);
  const [cards, setCards] = useState<PaymentCard[]>(INITIAL_CARDS);
  const [bills, setBills] = useState<BillPayment[]>(INITIAL_BILLS);
  const [goals, setGoals] = useState<SavingsGoal[]>(INITIAL_SAVINGS_GOALS);
  const [budgets] = useState(INITIAL_BUDGETS);
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [statements] = useState(INITIAL_STATEMENTS);
  const [sessions, setSessions] = useState(INITIAL_SESSIONS);

  // Modals & Inspect
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showNewVaultModal, setShowNewVaultModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Wire transfer handler
  const handleExecuteTransfer = (transfer: {
    sourceAccountId: string;
    beneficiaryId: string;
    amount: number;
    memo: string;
    speed: string;
  }) => {
    // 1. Deduct from source account
    setAccounts((prev) =>
      prev.map((acc) => {
        if (acc.id === transfer.sourceAccountId) {
          return {
            ...acc,
            balance: acc.balance - transfer.amount,
            availableBalance: acc.availableBalance - transfer.amount
          };
        }
        return acc;
      })
    );

    // 2. Add transaction to ledger
    const ben = beneficiaries.find((b) => b.id === transfer.beneficiaryId);
    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      accountId: transfer.sourceAccountId,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      merchant: ben?.name || 'Wire Beneficiary',
      category: 'Transfers',
      amount: -transfer.amount,
      currency: 'USD',
      status: 'settled',
      iconType: 'send',
      paymentMethod: transfer.speed === 'wire' ? 'Fedwire Realtime' : 'FedNow Instant',
      referenceNumber: `WRE-${Math.floor(100000 + Math.random() * 900000)}`,
      notes: transfer.memo
    };

    setTransactions((prev) => [newTx, ...prev]);

    // 3. Add notification
    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        title: 'Fedwire Disbursement Settled',
        message: `Outgoing transfer of $${transfer.amount.toLocaleString()} to ${ben?.name} was processed successfully.`,
        timestamp: 'Just now',
        read: false,
        type: 'transaction'
      },
      ...prev
    ]);

    showToast(`Disbursement of $${transfer.amount.toLocaleString()} transmitted via Fedwire.`);
  };

  // Add beneficiary
  const handleAddBeneficiary = (newBen: Omit<Beneficiary, 'id'>) => {
    const ben: Beneficiary = {
      ...newBen,
      id: `ben-${Date.now()}`
    };
    setBeneficiaries((prev) => [ben, ...prev]);
    showToast(`Added ${ben.name} to verified counterparty directory.`);
  };

  // Delete beneficiary
  const handleDeleteBeneficiary = (id: string) => {
    setBeneficiaries((prev) => prev.filter((b) => b.id !== id));
    showToast('Counterparty removed.');
  };

  // Update card controls (freeze/unfreeze, limits, etc.)
  const handleUpdateCard = (updatedCard: PaymentCard) => {
    setCards((prev) => prev.map((c) => (c.id === updatedCard.id ? updatedCard : c)));
    if (updatedCard.isFrozen) {
      showToast(`${updatedCard.tier} card is now temporarily frozen.`);
    } else {
      showToast(`${updatedCard.tier} card settings updated.`);
    }
  };

  // Issue virtual card
  const handleIssueNewCard = (newCard: PaymentCard) => {
    setCards((prev) => [...prev, newCard]);
    showToast(`New virtual card issued for ${newCard.nameOnCard}.`);
  };

  // Deposit to savings goal
  const handleDepositToGoal = (goalId: string, amount: number) => {
    // Deduct from checking
    setAccounts((prev) =>
      prev.map((acc) =>
        acc.type === 'checking'
          ? { ...acc, balance: acc.balance - amount, availableBalance: acc.availableBalance - amount }
          : acc
      )
    );

    // Add to goal
    setGoals((prev) =>
      prev.map((g) => (g.id === goalId ? { ...g, currentAmount: g.currentAmount + amount } : g))
    );

    showToast(`$${amount.toLocaleString()} swept into goal reserve.`);
  };

  // Create new goal
  const handleCreateGoal = (goal: SavingsGoal) => {
    setGoals((prev) => [...prev, goal]);
    showToast(`Goal vault established: ${goal.title}`);
  };

  // Pay scheduled bill
  const handlePayBill = (billId: string) => {
    const targetBill = bills.find((b) => b.id === billId);
    if (!targetBill) return;

    setBills((prev) =>
      prev.map((b) => (b.id === billId ? { ...b, status: 'paid', lastPaidDate: 'Today' } : b))
    );

    // Deduct
    setAccounts((prev) =>
      prev.map((acc) =>
        acc.type === 'checking'
          ? { ...acc, balance: acc.balance - targetBill.amount, availableBalance: acc.availableBalance - targetBill.amount }
          : acc
      )
    );

    // Add transaction
    setTransactions((prev) => [
      {
        id: `tx-${Date.now()}`,
        accountId: 'acc-1',
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        merchant: targetBill.billerName,
        category: 'Transfers',
        amount: -targetBill.amount,
        currency: 'USD',
        status: 'settled',
        iconType: 'calendar',
        paymentMethod: 'Direct Debit ACH',
        referenceNumber: targetBill.accountNumber,
        notes: `Settled invoice for ${targetBill.billerName}`
      },
      ...prev
    ]);

    showToast(`Invoice of $${targetBill.amount.toLocaleString()} settled for ${targetBill.billerName}.`);
  };

  // Toggle autopay
  const handleToggleAutopay = (billId: string) => {
    setBills((prev) =>
      prev.map((b) => (b.id === billId ? { ...b, autoPay: !b.autoPay } : b))
    );
  };

  // Add scheduled bill
  const handleAddNewBill = (bill: BillPayment) => {
    setBills((prev) => [...prev, bill]);
    showToast(`Scheduled invoice added for ${bill.billerName}.`);
  };

  // Revoke session
  const handleRevokeSession = (sessionId: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    showToast('Device session revoked immediately.');
  };

  // Create new account / vault
  const handleCreateAccount = (newAcc: BankAccount) => {
    setAccounts((prev) => [...prev, newAcc]);
    showToast(`Segregated vault "${newAcc.name}" provisioned.`);
  };

  // Render Authentication Flow when not logged in
  if (!currentUser) {
    if (authMode === 'signup') {
      return (
        <SignUpView
          onSuccess={(user) => {
            setCurrentUser(user);
            setAccounts(AuthService.getUserStoredAccounts());
            setActiveTab('dashboard');
            setIsDesignMode(false);
            showToast(`Welcome to Aureus Wealth, ${user.firstName}. Sovereign Vault Cleared.`);
          }}
          onNavigateToLogin={() => setAuthMode('login')}
          theme={theme}
          toggleTheme={toggleTheme}
        />
      );
    }

    return (
      <LoginView
        onSuccess={(user) => {
          setCurrentUser(user);
          setAccounts(AuthService.getUserStoredAccounts());
          setActiveTab('dashboard');
          setIsDesignMode(false);
          showToast(`Welcome back, ${user.name}`);
        }}
        onNavigateToSignUp={() => setAuthMode('signup')}
        theme={theme}
        toggleTheme={toggleTheme}
      />
    );
  }

  return (
    <div className={`h-screen flex flex-col overflow-hidden ${theme === 'light' ? 'bg-slate-50 text-slate-900' : 'bg-neutral-950 text-neutral-100'} font-sans antialiased selection:bg-emerald-500/20 selection:text-emerald-300 transition-colors duration-200`}>
      {/* Top Bar Contract with Theme Switcher, Main Support Navigation & User Session */}
      <Header
        maskBalance={maskBalance}
        setMaskBalance={setMaskBalance}
        isDesignMode={isDesignMode}
        setIsDesignMode={setIsDesignMode}
        currency={currency}
        setCurrency={setCurrency}
        notifications={notifications}
        setNotifications={setNotifications}
        onOpenTransfer={() => {
          setActiveTab('transfers');
          if (isDesignMode) setIsDesignMode(false);
        }}
        theme={theme}
        toggleTheme={toggleTheme}
        onNavigateSupport={() => {
          setActiveTab('support');
          if (isDesignMode) setIsDesignMode(false);
        }}
        supportUnreadCount={supportUnreadCount}
        user={currentUser}
        onLogout={() => {
          AuthService.logout();
          setCurrentUser(null);
          setAuthMode('login');
          showToast('Session locked. Signed out successfully.');
        }}
        onOpenProfile={() => setShowProfileModal(true)}
      />

      {/* Global Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-neutral-900 border border-emerald-500/40 text-neutral-100 text-xs shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Workspace Frame */}
      <div className="flex-1 flex w-full min-h-0 overflow-hidden">
        {/* Sidebar Navigation */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isDesignMode={isDesignMode}
          setIsDesignMode={setIsDesignMode}
          onOpenAdvisorModal={() => {
            setActiveTab('support');
            if (isDesignMode) setIsDesignMode(false);
          }}
          supportUnreadCount={supportUnreadCount}
          onLogout={() => {
            AuthService.logout();
            setCurrentUser(null);
            setAuthMode('login');
            showToast('Session locked. Signed out successfully.');
          }}
        />

        {/* Viewport Content Area */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto max-w-full h-full">
          {/* Mobile Tab Nav Selector */}
          <div className="md:hidden mb-4 flex items-center justify-between pb-3 border-b border-neutral-800">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-neutral-300 capitalize">
                {isDesignMode ? 'Design System Specs' : activeTab === 'support' ? 'Customer Support' : activeTab}
              </span>
              {activeTab === 'support' && supportUnreadCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-emerald-500 text-neutral-950 font-bold">
                  {supportUnreadCount} unread
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-400"
                title="Toggle Theme"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-sky-500" />}
              </button>

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-400"
              >
                {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {mobileMenuOpen && (
            <div className="md:hidden mb-6 p-3 rounded-xl bg-neutral-900 border border-neutral-800 grid grid-cols-2 gap-2 text-xs">
              {[
                { id: 'dashboard', label: 'Dashboard' },
                { id: 'accounts', label: 'Accounts' },
                { id: 'transfers', label: 'Transfers' },
                { id: 'cards', label: 'Cards' },
                { id: 'analytics', label: 'Analytics' },
                { id: 'goals', label: 'Goals & Budgets' },
                { id: 'bills', label: 'Bills' },
                { id: 'statements', label: 'Statements' },
                { id: 'security', label: 'Security' },
                { id: 'support', label: `Support (${supportUnreadCount})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as NavTab);
                    setIsDesignMode(false);
                    setMobileMenuOpen(false);
                  }}
                  className={`p-2 rounded-lg text-left transition-colors flex items-center justify-between ${
                    activeTab === tab.id && !isDesignMode
                      ? 'bg-emerald-500/10 text-emerald-400 font-semibold'
                      : 'text-neutral-400'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.id === 'support' && supportUnreadCount > 0 && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  )}
                </button>
              ))}
              <button
                onClick={() => {
                  setIsDesignMode(true);
                  setMobileMenuOpen(false);
                }}
                className="col-span-2 p-2 rounded-lg text-center bg-neutral-850 text-emerald-400 font-medium"
              >
                Design System & Spec Sheet
              </button>
              <button
                onClick={() => {
                  AuthService.logout();
                  setCurrentUser(null);
                  setAuthMode('login');
                  setMobileMenuOpen(false);
                  showToast('Session locked. Signed out successfully.');
                }}
                className="col-span-2 p-2 rounded-lg text-center bg-red-500/10 hover:bg-red-500/20 text-red-400 font-medium border border-red-500/25 flex items-center justify-center gap-2"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out / Sign In</span>
              </button>
            </div>
          )}

          {/* Conditional View Rendering */}
          {isDesignMode ? (
            <DesignSpecView onReturnToApp={() => setIsDesignMode(false)} />
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <DashboardView
                  accounts={accounts}
                  transactions={transactions}
                  bills={bills}
                  maskBalance={maskBalance}
                  currency={currency}
                  onOpenTransfer={() => setActiveTab('transfers')}
                  onSelectTransaction={(tx) => setSelectedTransaction(tx)}
                  onNavigateTab={(tab) => setActiveTab(tab)}
                  onPayBillQuick={handlePayBill}
                />
              )}

              {activeTab === 'accounts' && (
                <AccountsView
                  accounts={accounts}
                  transactions={transactions}
                  maskBalance={maskBalance}
                  currency={currency}
                  onOpenTransfer={() => setActiveTab('transfers')}
                  onOpenNewVaultModal={() => setShowNewVaultModal(true)}
                  onSelectTransaction={(tx) => setSelectedTransaction(tx)}
                />
              )}

              {activeTab === 'transfers' && (
                <TransfersView
                  accounts={accounts}
                  beneficiaries={beneficiaries}
                  currency={currency}
                  onExecuteTransfer={handleExecuteTransfer}
                  onAddBeneficiary={handleAddBeneficiary}
                  onDeleteBeneficiary={handleDeleteBeneficiary}
                />
              )}

              {activeTab === 'cards' && (
                <CardsView
                  cards={cards}
                  onUpdateCard={handleUpdateCard}
                  onIssueNewCard={handleIssueNewCard}
                />
              )}

              {activeTab === 'analytics' && (
                <AnalyticsView
                  transactions={transactions}
                  budgets={budgets}
                  currency={currency}
                />
              )}

              {activeTab === 'goals' && (
                <SavingsBudgetsView
                  goals={goals}
                  budgets={budgets}
                  currency={currency}
                  onDepositToGoal={handleDepositToGoal}
                  onCreateGoal={handleCreateGoal}
                />
              )}

              {activeTab === 'bills' && (
                <BillsView
                  bills={bills}
                  currency={currency}
                  onPayBill={handlePayBill}
                  onToggleAutopay={handleToggleAutopay}
                  onAddNewBill={handleAddNewBill}
                />
              )}

              {activeTab === 'statements' && (
                <StatementsView
                  statements={statements}
                  onSimulateDownload={(file) => showToast(`Downloaded ${file}`)}
                />
              )}

              {activeTab === 'security' && (
                <SecurityView
                  sessions={sessions}
                  onRevokeSession={handleRevokeSession}
                />
              )}

              {activeTab === 'support' && (
                <SupportView
                  onUnreadChange={(count) => setSupportUnreadCount(count)}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Transaction Inspection Receipt Modal */}
      {selectedTransaction && (
        <TransactionReceiptModal
          transaction={selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
          currency={currency}
        />
      )}

      {/* Open New Vault Modal */}
      {showNewVaultModal && (
        <OpenVaultModal
          onClose={() => setShowNewVaultModal(false)}
          onCreateAccount={handleCreateAccount}
        />
      )}

      {/* User Profile & KYC Inspection Modal */}
      {showProfileModal && currentUser && (
        <UserProfileModal
          user={currentUser}
          onClose={() => setShowProfileModal(false)}
          onLogout={() => {
            setShowProfileModal(false);
            AuthService.logout();
            setCurrentUser(null);
            setAuthMode('login');
            showToast('Session locked. Signed out successfully.');
          }}
          onOpenSupport={() => {
            setShowProfileModal(false);
            setActiveTab('support');
          }}
        />
      )}
    </div>
  );
}
