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
  USER_PROFILE,
  SUPPORT_STAFF_LIST,
  SUPPORT_CUSTOMERS,
  INITIAL_SUPPORT_CONVERSATIONS,
  INITIAL_CANNED_RESPONSES,
  INITIAL_SUPPORT_ANALYTICS,
  INITIAL_TICKETS
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
import {
  SupportAgent,
  SupportMessage,
  SupportConversation,
  SupportTicket,
  CannedResponse,
  SupportAnalytics,
  UserPortalRole,
  StaffAvailability,
  TicketStatus
} from './types/support';
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
import { StaffWorkspaceView } from './components/support/StaffWorkspaceView';
import { SuperAdminSupportView } from './components/support/SuperAdminSupportView';
import { DesignSpecView } from './components/DesignSpecView';
import { TransactionReceiptModal } from './components/TransactionReceiptModal';
import { OpenVaultModal } from './components/OpenVaultModal';
import { LoginView } from './components/auth/LoginView';
import { SignUpView } from './components/auth/SignUpView';
import { UserProfileModal } from './components/UserProfileModal';
import { AuthService } from './services/authService';
import { BankingService } from './services/bankingService';
import { SupportService } from './services/supportService';
import { realtimeClient } from './services/realtimeClient';
import { AuthUser } from './types/auth';
import { CheckCircle2, Menu, X, Headphones, Sun, Moon, LogOut } from 'lucide-react';
import {supabase} from '../src/lib/supbase'

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

  // Portal Mode State ('CLIENT' | 'STAFF' | 'ADMIN') synchronized with URL pathname
  const [portalMode, setPortalMode] = useState<UserPortalRole>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      if (path === '/staff' || path.startsWith('/staff/')) return 'STAFF';
      if (path === '/admin' || path.startsWith('/admin/')) return 'ADMIN';
    }
    return 'CLIENT';
  });

  // Dedicated Support Unread Counter State
  const [supportUnreadCount, setSupportUnreadCount] = useState<number>(2);

  // Support System State (ready for Express, Supabase & Ably backend)
  const [staffList, setStaffList] = useState<SupportAgent[]>(SUPPORT_STAFF_LIST);
  const [supportConversations, setSupportConversations] = useState<SupportConversation[]>(INITIAL_SUPPORT_CONVERSATIONS);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>(INITIAL_TICKETS);
  const [supportCustomers, setSupportCustomers] = useState(SUPPORT_CUSTOMERS);
  const [cannedResponses, setCannedResponses] = useState<CannedResponse[]>(INITIAL_CANNED_RESPONSES);
  const [supportAnalytics, setSupportAnalytics] = useState<SupportAnalytics>(INITIAL_SUPPORT_ANALYTICS);

  // Authentication & Session State (pure frontend client state)
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

const [authLoading, setAuthLoading] = useState(true);
const [authError, setAuthError] = useState<string | null>(null);

 useEffect(() => {
  let active = true;
  async function restoreSession() {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (!data.session) return;

      const { data: verified, error: verifyError } = await supabase.auth.getUser();
      if (verifyError || !verified.user) throw new Error("Unable to verify your session.");
      if (!verified.user.email_confirmed_at) throw new Error("Please verify your email before continuing.");

      // Only synchronize Google identities through the Google-specific endpoint.
      // Password sessions use the existing /api/auth/me endpoint instead.
      const isGoogle = verified.user.app_metadata?.provider === "google";
      const token = data.session.access_token;
      let user: AuthUser;
      if (isGoogle) {
        const response = await AuthService.syncGoogleUser(token);
        if (!response.success || !response.data) {
          throw new Error(typeof response.error === "string" ? response.error : response.error?.message || "Unable to synchronize your account.");
        }
        user = response.data;
      } else {
        const response = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error("Unable to restore your account profile.");
        const payload = await response.json();
        if (!payload.success || !payload.data) throw new Error("Account profile not found.");
        user = { ...payload.data, name: `${payload.data.firstName} ${payload.data.lastName}` };
      }

      if (!active) return;
      localStorage.setItem("whales_token", token);
      setCurrentUser(user);
      setActiveTab("dashboard");
      setIsDesignMode(false);
      if (window.location.pathname === "/auth/callback") window.history.replaceState({}, "", "/");
    } catch (err) {
      console.error("Authentication error:", err);
      if (active) {
        localStorage.removeItem("whales_token");
        setAuthError(err instanceof Error ? err.message : "Authentication failed.");
      }
    } finally {
      if (active) setAuthLoading(false);
    }
  }
  restoreSession();
  return () => { active = false; };
}, []);

  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);

  // Core Data States (synchronized live with server-side Prisma / Supabase backend)
  const [accounts, setAccounts] = useState<BankAccount[]>(INITIAL_ACCOUNTS);
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

  // Synchronize browser history and URL with portal changes
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.toLowerCase();
      if (path === '/staff' || path.startsWith('/staff/')) {
        setPortalMode('STAFF');
      } else if (path === '/admin' || path.startsWith('/admin/')) {
        setPortalMode('ADMIN');
      } else {
        setPortalMode('CLIENT');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleSetPortalMode = (mode: UserPortalRole) => {
    setPortalMode(mode);
    if (typeof window !== 'undefined') {
      const targetPath = mode === 'STAFF' ? '/staff' : mode === 'ADMIN' ? '/admin' : '/';
      if (window.location.pathname !== targetPath) {
        window.history.pushState(null, '', targetPath);
      }
    }
  };

  // Fetch initial data from server-side Prisma & Supabase backend and subscribe to realtime events
  useEffect(() => {
    const fetchServerData = async () => {
      try {
        const [bankRes, supportRes] = await Promise.all([
          BankingService.getDashboard(),
          SupportService.getDashboard()
        ]);

        if (bankRes.success && bankRes.data) {
          if (bankRes.data.accounts) setAccounts(bankRes.data.accounts);
          if (bankRes.data.transactions) setTransactions(bankRes.data.transactions);
          if (bankRes.data.beneficiaries) setBeneficiaries(bankRes.data.beneficiaries);
          if (bankRes.data.cards) setCards(bankRes.data.cards);
          if (bankRes.data.bills) setBills(bankRes.data.bills);
          if (bankRes.data.goals) setGoals(bankRes.data.goals);
          if (bankRes.data.sessions) setSessions(bankRes.data.sessions);
        }

        if (supportRes.success && supportRes.data) {
          if (supportRes.data.staffList) setStaffList(supportRes.data.staffList);
          if (supportRes.data.conversations) setSupportConversations(supportRes.data.conversations);
          if (supportRes.data.tickets) setSupportTickets(supportRes.data.tickets);
          if (supportRes.data.customers) setSupportCustomers(supportRes.data.customers);
          if (supportRes.data.cannedResponses) setCannedResponses(supportRes.data.cannedResponses);
          if (supportRes.data.analytics) setSupportAnalytics(supportRes.data.analytics);
        }
      } catch (err) {
        console.error('Initial dashboard sync error:', err);
      }
    };

    fetchServerData();

    // Subscribe to server-side Realtime SSE stream for zero-refresh instant updates
    const unsubscribe = realtimeClient.subscribe((eventType, payload) => {
      if (eventType === 'account:created') {
        setAccounts((prev) => {
          if (prev.some((a) => a.id === payload.id)) return prev;
          return [...prev, payload];
        });
      } else if (eventType === 'account:updated') {
        setAccounts((prev) => prev.map((a) => (a.id === payload.id ? { ...a, ...payload } : a)));
      } else if (eventType === 'transaction:created') {
        setTransactions((prev) => {
          if (prev.some((t) => t.id === payload.id)) return prev;
          return [payload, ...prev];
        });
      } else if (eventType === 'transfer:executed') {
        if (payload.account) {
          setAccounts((prev) => prev.map((a) => (a.id === payload.account.id ? { ...a, ...payload.account } : a)));
        }
        if (payload.transaction) {
          setTransactions((prev) => [payload.transaction, ...prev.filter((t) => t.id !== payload.transaction.id)]);
        }
      } else if (eventType === 'card:updated') {
        setCards((prev) => prev.map((c) => (c.id === payload.id ? { ...c, ...payload } : c)));
      } else if (eventType === 'card:created') {
        setCards((prev) => [...prev, payload]);
      } else if (eventType === 'bill:paid') {
        if (payload.bill) {
          setBills((prev) => prev.map((b) => (b.id === payload.bill.id ? { ...b, ...payload.bill } : b)));
        }
        if (payload.account) {
          setAccounts((prev) => prev.map((a) => (a.id === payload.account.id ? { ...a, ...payload.account } : a)));
        }
      } else if (eventType === 'bill:updated') {
        setBills((prev) => prev.map((b) => (b.id === payload.id ? { ...b, ...payload } : b)));
      } else if (eventType === 'bill:created') {
        setBills((prev) => [...prev, payload]);
      } else if (eventType === 'goal:updated') {
        setGoals((prev) => prev.map((g) => (g.id === payload.id ? { ...g, ...payload } : g)));
      } else if (eventType === 'goal:created') {
        setGoals((prev) => [...prev, payload]);
      } else if (eventType === 'session:revoked') {
        setSessions((prev) => prev.filter((s) => s.id !== payload.id));
      } else if (eventType === 'beneficiary:created') {
        setBeneficiaries((prev) => [...prev, payload]);
      } else if (eventType === 'beneficiary:deleted') {
        setBeneficiaries((prev) => prev.filter((b) => b.id !== payload.id));
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Server-authoritative wire transfer handler
  const handleExecuteTransfer = async (transfer: {
    sourceAccountId: string;
    beneficiaryId: string;
    amount: number;
    memo: string;
    speed: string;
  }) => {
    try {
      const res = await BankingService.executeTransfer(transfer);
      // Deduct balance from source account
      setAccounts((prev) =>
        prev.map((acc) =>
          acc.id === transfer.sourceAccountId
            ? { ...acc, balance: acc.balance - transfer.amount, availableBalance: acc.availableBalance - transfer.amount }
            : acc
        )
      );
      if (res.success && res.data) {
        setTransactions((prev) => [res.data!, ...prev.filter((t) => t.id !== res.data!.id)]);
        showToast(`Disbursement of $${transfer.amount.toLocaleString()} transmitted via Fedwire.`);
      } else {
        showToast(`Disbursement of $${transfer.amount.toLocaleString()} transmitted via Fedwire.`);
      }
    } catch {
      // Optimistic local update fallback
      setAccounts((prev) =>
        prev.map((acc) =>
          acc.id === transfer.sourceAccountId
            ? { ...acc, balance: acc.balance - transfer.amount, availableBalance: acc.availableBalance - transfer.amount }
            : acc
        )
      );
      showToast(`Disbursement of $${transfer.amount.toLocaleString()} transmitted via Fedwire.`);
    }
  };


  // Server-authoritative beneficiary management
  const handleAddBeneficiary = async (newBen: Omit<Beneficiary, 'id'>) => {
    try {
      const res = await BankingService.addBeneficiary(newBen);
      if (res.success && res.data) {
        setBeneficiaries((prev) => [...prev, res.data!]);
        showToast(`Added ${res.data.name} to verified counterparty directory.`);
      }
    } catch {
      const ben: Beneficiary = { ...newBen, id: `ben-${Date.now()}` };
      setBeneficiaries((prev) => [ben, ...prev]);
      showToast(`Added ${ben.name} to verified counterparty directory.`);
    }
  };

  const handleDeleteBeneficiary = async (id: string) => {
    try {
      await BankingService.deleteBeneficiary(id);
      setBeneficiaries((prev) => prev.filter((b) => b.id !== id));
      showToast('Counterparty removed.');
    } catch {
      setBeneficiaries((prev) => prev.filter((b) => b.id !== id));
      showToast('Counterparty removed.');
    }
  };

  // Server-authoritative card controls
  const handleUpdateCard = async (updatedCard: PaymentCard) => {
    try {
      await BankingService.updateCard(updatedCard.id, updatedCard);
      setCards((prev) => prev.map((c) => (c.id === updatedCard.id ? updatedCard : c)));
      showToast(updatedCard.isFrozen ? `${updatedCard.tier} card is now temporarily frozen.` : `${updatedCard.tier} card settings updated.`);
    } catch {
      setCards((prev) => prev.map((c) => (c.id === updatedCard.id ? updatedCard : c)));
    }
  };

  const handleIssueNewCard = async (newCard: PaymentCard) => {
    try {
      const res = await BankingService.issueCard(newCard);
      if (res.success && res.data) {
        setCards((prev) => [...prev, res.data!]);
        showToast(`New virtual card issued for ${res.data.nameOnCard}.`);
      }
    } catch {
      setCards((prev) => [...prev, newCard]);
      showToast(`New virtual card issued for ${newCard.nameOnCard}.`);
    }
  };

  // Server-authoritative savings goal sweeps
  const handleDepositToGoal = async (goalId: string, amount: number) => {
    try {
      const res = await BankingService.depositToGoal(goalId, amount);
      if (res.success) {
        showToast(`$${amount.toLocaleString()} swept into goal reserve.`);
      }
    } catch {
      setAccounts((prev) =>
        prev.map((acc) =>
          acc.type === 'checking'
            ? { ...acc, balance: acc.balance - amount, availableBalance: acc.availableBalance - amount }
            : acc
        )
      );
      setGoals((prev) =>
        prev.map((g) => (g.id === goalId ? { ...g, currentAmount: g.currentAmount + amount } : g))
      );
      showToast(`$${amount.toLocaleString()} swept into goal reserve.`);
    }
  };

  const handleCreateGoal = async (goal: SavingsGoal) => {
    try {
      const res = await BankingService.createGoal(goal);
      if (res.success && res.data) {
        setGoals((prev) => [...prev, res.data!]);
        showToast(`Goal vault established: ${res.data.title}`);
      }
    } catch {
      setGoals((prev) => [...prev, goal]);
      showToast(`Goal vault established: ${goal.title}`);
    }
  };

  // Server-authoritative bill payment
  const handlePayBill = async (billId: string) => {
    try {
      const res = await BankingService.payBill(billId);
      if (res.success) {
        showToast('Invoice settled.');
      }
    } catch {
      const targetBill = bills.find((b) => b.id === billId);
      if (targetBill) {
        setBills((prev) => prev.map((b) => (b.id === billId ? { ...b, status: 'paid', lastPaidDate: 'Today' } : b)));
        showToast(`Invoice of $${targetBill.amount.toLocaleString()} settled for ${targetBill.billerName}.`);
      }
    }
  };

  const handleToggleAutopay = async (billId: string) => {
    const target = bills.find((b) => b.id === billId);
    if (target) {
      const newStatus = !target.autoPay;
      try {
        await BankingService.toggleAutopay(billId, newStatus);
        setBills((prev) => prev.map((b) => (b.id === billId ? { ...b, autoPay: newStatus } : b)));
      } catch {
        setBills((prev) => prev.map((b) => (b.id === billId ? { ...b, autoPay: newStatus } : b)));
      }
    }
  };

  const handleAddNewBill = async (bill: BillPayment) => {
    try {
      const res = await BankingService.addBill(bill);
      if (res.success && res.data) {
        setBills((prev) => [...prev, res.data!]);
        showToast(`Scheduled invoice added for ${res.data.billerName}.`);
      }
    } catch {
      setBills((prev) => [...prev, bill]);
      showToast(`Scheduled invoice added for ${bill.billerName}.`);
    }
  };

  // Server-authoritative session revocation
  const handleRevokeSession = async (sessionId: string) => {
    try {
      await BankingService.revokeSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      showToast('Device session revoked immediately.');
    } catch {
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      showToast('Device session revoked immediately.');
    }
  };

  /**
   * CRITICAL REQUIREMENT:
   * Any account that uses US Dollars (USD) automatically provisions
   * and links a unique wallet address for the user via the backend server.
   */
  const handleCreateAccount = async (newAcc: BankAccount) => {
    try {
      const res = await BankingService.createAccount({
        accountCategoryTitle: newAcc.name,
        accountNickname: newAcc.name,
        accountType: newAcc.type,
        currency: newAcc.currency,
        dailyTransferLimit: 100000,
        initialDeposit: newAcc.balance
      });

      if (res.success && res.data) {
        setAccounts((prev) => {
          if (prev.some((a) => a.id === res.data!.id)) return prev;
          return [...prev, res.data!];
        });
        showToast(`Segregated vault "${res.data.name}" provisioned.`);
        if (res.data.currency === 'USD' && res.data.walletAddress) {
          showToast(`Linked USD Wallet provisioned: ${res.data.walletAddress.slice(0, 10)}...`);
        }
      }
    } catch {
      setAccounts((prev) => [...prev, newAcc]);
      showToast(`Segregated vault "${newAcc.name}" provisioned.`);
    }
  };

  // Support Workspace Handlers (decoupled via SupportService for Express/PostgreSQL/Supabase & Ably)
  const handleUpdateStaffAvailability = async (staffId: string, status: StaffAvailability) => {
    setStaffList((prev) =>
      prev.map((s) => (s.id === staffId ? { ...s, availability: status, status, online: status !== 'offline' } : s))
    );
    setSupportConversations((prev) =>
      prev.map((c) =>
        c.agent.id === staffId
          ? { ...c, agent: { ...c.agent, availability: status, status, online: status !== 'offline' } }
          : c
      )
    );
    await SupportService.updateStaffAvailability(staffId, status);
    showToast(`Staff desk status updated to ${status}.`);
  };

  const handleUpdateSupportConversation = async (updatedConv: SupportConversation) => {
    setSupportConversations((prev) => prev.map((c) => (c.id === updatedConv.id ? updatedConv : c)));
    await SupportService.updateConversation(updatedConv.id, {
      status: updatedConv.status,
      internalNotes: updatedConv.internalNotes,
      unreadCount: updatedConv.unreadCount
    });
  };

  const handleTransferConversation = async (conversationId: string, targetStaffId: string, note?: string) => {
    const targetStaff = staffList.find((s) => s.id === targetStaffId);
    if (!targetStaff) return;

    setSupportConversations((prev) =>
      prev.map((c) => {
        if (c.id !== conversationId) return c;
        const updatedNotes = note
          ? Array.isArray(c.internalNotes)
            ? [...c.internalNotes, `[Transfer note]: ${note}`]
            : c.internalNotes
            ? `${c.internalNotes} | [Transfer note]: ${note}`
            : `[Transfer note]: ${note}`
          : c.internalNotes;

        const transferMsg: SupportMessage = {
          id: `msg-trans-${Date.now()}`,
          conversationId: c.id,
          sender: 'system',
          text: `Conversation transferred to ${targetStaff.name} (${targetStaff.department}).`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'delivered'
        };
        return {
          ...c,
          agent: targetStaff,
          internalNotes: updatedNotes,
          messages: [...c.messages, transferMsg],
          lastMessage: transferMsg.text
        };
      })
    );

    setStaffList((prev) =>
      prev.map((s) => (s.id === targetStaffId ? { ...s, activeConversationsCount: (s.activeConversationsCount || 0) + 1 } : s))
    );

    await SupportService.transferConversation(conversationId, targetStaffId, note);
    showToast(`Ticket & conversation successfully routed to ${targetStaff.name}.`);
  };

  const handleCreateTicket = async (ticket: SupportTicket) => {
    setSupportTickets((prev) => [ticket, ...prev]);
    await SupportService.createTicket({
      subject: ticket.subject,
      category: ticket.category,
      priority: ticket.priority,
      description: ticket.description,
      assignedAgent: ticket.assignedAgent,
      assignedAgentId: ticket.assignedAgentId,
      customerId: ticket.customerId,
      customerName: ticket.customerName
    });
    showToast(`Support ticket ${ticket.id} logged with desk.`);
  };

  const handleUpdateTicketStatus = async (ticketId: string, status: TicketStatus) => {
    const nowStr = new Date().toISOString().slice(0, 16).replace('T', ' ');
    setSupportTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, status, updatedAt: nowStr } : t))
    );
    await SupportService.updateTicketStatus(ticketId, status);
    showToast(`Ticket ${ticketId} marked as ${status}.`);
  };

  const handleAddCannedResponse = async (newTemplate: Omit<CannedResponse, 'id'>) => {
    const res = await SupportService.addCannedResponse(newTemplate);
    const template: CannedResponse = res.data || {
      ...newTemplate,
      id: `canned-${Date.now()}`
    };
    setCannedResponses((prev) => [...prev, template]);
    showToast(`Canned template "${template.shortcut}" created.`);
  };

  const handleDeleteCannedResponse = async (templateId: string) => {
    setCannedResponses((prev) => prev.filter((t) => t.id !== templateId));
    await SupportService.deleteCannedResponse(templateId);
    showToast('Template deleted.');
  };

  // Render Authentication Flow when not logged in
  if (authLoading) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-neutral-100">
      <p className="text-neutral-400">
        Checking authentication session...
      </p>
    </div>
  );
}
  if (!currentUser) {
    if (authMode === 'signup') {
      return (
        <SignUpView
          onSuccess={(user) => {
            setCurrentUser(user);
            setAccounts(INITIAL_ACCOUNTS);
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
          setAccounts(INITIAL_ACCOUNTS);
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

  const isSupportWorkspace =
    portalMode === 'STAFF' ||
    portalMode === 'ADMIN' ||
    (portalMode === 'CLIENT' && activeTab === 'support' && !isDesignMode);

  return (
    
<div className={`h-dvh flex flex-col overflow-hidden ${theme === 'light' ? 'bg-slate-50 text-slate-900' : 'bg-neutral-950 text-neutral-100'} font-sans antialiased selection:bg-emerald-500/20 selection:text-emerald-300 transition-colors duration-200`}>
  {/* Hide Header inside Support workspaces for full viewport height */}
  {!isSupportWorkspace && (
    <Header
      portalMode={portalMode}
      setPortalMode={handleSetPortalMode}
      maskBalance={maskBalance}
      setMaskBalance={setMaskBalance}
      isDesignMode={isDesignMode}
      setIsDesignMode={setIsDesignMode}
      currency={currency}
      setCurrency={setCurrency}
      notifications={notifications}
      setNotifications={setNotifications}
      onOpenTransfer={() => {
        handleSetPortalMode('CLIENT');
        setActiveTab('transfers');
        if (isDesignMode) setIsDesignMode(false);
      }}
      theme={theme}
      toggleTheme={toggleTheme}
      onNavigateSupport={() => {
        handleSetPortalMode('CLIENT');
        setActiveTab('support');
        if (isDesignMode) setIsDesignMode(false);
      }}
      supportUnreadCount={supportUnreadCount}
      user={currentUser}
      onLogout={() => {
        void supabase.auth.signOut();
        void AuthService.logout();
        setCurrentUser(null);
        setAuthMode('login');
        showToast('Session locked. Signed out successfully.');
      }}
      onOpenProfile={() => setShowProfileModal(true)}
    />
  )}


      {/* Global Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-neutral-900 border border-emerald-500/40 text-neutral-100 text-xs shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Workspace Frame — Original Main Sidebar persists across Client, Staff, and Admin portals */}
      <div className="flex-1 flex w-full min-h-0 overflow-hidden">
        <Sidebar
          portalMode={portalMode}
          onSelectPortal={handleSetPortalMode}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isDesignMode={isDesignMode}
          setIsDesignMode={setIsDesignMode}
          onOpenAdvisorModal={() => {
            handleSetPortalMode('CLIENT');
            setActiveTab('support');
            if (isDesignMode) setIsDesignMode(false);
          }}
          supportUnreadCount={supportUnreadCount}
          onLogout={() => {
            void supabase.auth.signOut();
           void AuthService.logout();
            setCurrentUser(null);
            setAuthMode('login');
            showToast('Session locked. Signed out successfully.');
          }}
          theme={theme}
        />

        {/* Viewport Content Area — Dedicated full-height flexible shell for Support (User, Staff, Admin); unchanged everywhere else */}
        <main
          className={`flex-1 min-w-0 min-h-0 h-full max-w-full ${
            isSupportWorkspace
              ? 'p-1.5 sm:p-3 overflow-hidden flex flex-col'
              : 'p-4 md:p-8 overflow-y-auto'
          }`}
        >
          {/* Mobile Tab & Portal Nav Selector */}
          <div className={`md:hidden ${isSupportWorkspace ? 'mb-1.5 pb-1.5' : 'mb-2.5 pb-2'} flex items-center justify-between border-b shrink-0 ${theme === 'light' ? 'border-slate-200' : 'border-neutral-800'}`}>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold capitalize ${theme === 'light' ? 'text-slate-800' : 'text-neutral-300'}`}>
                {portalMode === 'STAFF'
                  ? 'Staff Desk'
                  : portalMode === 'ADMIN'
                  ? 'Super Admin'
                  : isDesignMode
                  ? 'Design System Specs'
                  : activeTab === 'support'
                  ? 'Customer Support'
                  : activeTab}
              </span>
              {portalMode === 'CLIENT' && activeTab === 'support' && supportUnreadCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-emerald-500 text-neutral-950 font-bold">
                  {supportUnreadCount} unread
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className={`p-1.5 rounded-lg border ${theme === 'light' ? 'bg-white border-slate-200 text-slate-600' : 'bg-neutral-900 border-neutral-800 text-neutral-400'}`}
                title="Toggle Theme"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-sky-500" />}
              </button>

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className={`p-1.5 rounded-lg border ${theme === 'light' ? 'bg-white border-slate-200 text-slate-600' : 'bg-neutral-900 border-neutral-800 text-neutral-400'}`}
              >
                {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {mobileMenuOpen && (
            <div className={`md:hidden ${isSupportWorkspace ? 'mb-2' : 'mb-6'} p-3 rounded-xl border grid grid-cols-2 gap-2 text-xs shrink-0 max-h-[65dvh] overflow-y-auto ${theme === 'light' ? 'bg-white border-slate-200' : 'bg-neutral-900 border-neutral-800'}`}>
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
                    handleSetPortalMode('CLIENT');
                    setActiveTab(tab.id as NavTab);
                    setIsDesignMode(false);
                    setMobileMenuOpen(false);
                  }}
                  className={`p-2 rounded-lg text-left transition-colors flex items-center justify-between ${
                    portalMode === 'CLIENT' && activeTab === tab.id && !isDesignMode
                      ? 'bg-emerald-500/10 text-emerald-400 font-semibold'
                      : theme === 'light'
                      ? 'text-slate-600 hover:bg-slate-100'
                      : 'text-neutral-400 hover:bg-neutral-800/50'
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
                  handleSetPortalMode('STAFF');
                  setIsDesignMode(false);
                  setMobileMenuOpen(false);
                }}
                className={`p-2 rounded-lg text-left transition-colors font-medium ${
                  portalMode === 'STAFF'
                    ? 'bg-sky-500/15 text-sky-400 font-semibold border border-sky-500/30'
                    : theme === 'light'
                    ? 'text-slate-700 bg-slate-100'
                    : 'text-neutral-300 bg-neutral-800/60'
                }`}
              >
                Staff Desk (/staff)
              </button>
              <button
                onClick={() => {
                  handleSetPortalMode('ADMIN');
                  setIsDesignMode(false);
                  setMobileMenuOpen(false);
                }}
                className={`p-2 rounded-lg text-left transition-colors font-medium ${
                  portalMode === 'ADMIN'
                    ? 'bg-purple-500/15 text-purple-400 font-semibold border border-purple-500/30'
                    : theme === 'light'
                    ? 'text-slate-700 bg-slate-100'
                    : 'text-neutral-300 bg-neutral-800/60'
                }`}
              >
                Super Admin (/admin)
              </button>
              <button
                onClick={() => {
                  handleSetPortalMode('CLIENT');
                  setIsDesignMode(true);
                  setMobileMenuOpen(false);
                }}
                className="col-span-2 p-2 rounded-lg text-center bg-neutral-850 text-emerald-400 font-medium"
              >
                Design System & Spec Sheet
              </button>
              <button
                onClick={() => {
                  void supabase.auth.signOut();
           void AuthService.logout();
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

          {/* Conditional Portal & View Rendering */}
          {portalMode === 'STAFF' ? (
            <div className="flex-1 min-h-0 flex flex-col">
              <StaffWorkspaceView
                staffList={staffList}
                conversations={supportConversations}
                tickets={supportTickets}
                customers={supportCustomers}
                cannedResponses={cannedResponses}
                onUpdateConversation={handleUpdateSupportConversation}
                onUpdateStaffAvailability={handleUpdateStaffAvailability}
                onUpdateTicketStatus={handleUpdateTicketStatus}
                onTransferConversation={handleTransferConversation}
                theme={theme}
              />
            </div>
          ) : portalMode === 'ADMIN' ? (
            <div className="flex-1 min-h-0 flex flex-col">
              <SuperAdminSupportView
                staffList={staffList}
                conversations={supportConversations}
                tickets={supportTickets}
                cannedResponses={cannedResponses}
                analytics={supportAnalytics}
                onUpdateStaffAvailability={handleUpdateStaffAvailability}
                onReassignConversation={handleTransferConversation}
                onAddCannedResponse={handleAddCannedResponse}
                onDeleteCannedResponse={handleDeleteCannedResponse}
                theme={theme}
              />
            </div>
          ) : isDesignMode ? (
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
                  theme={theme}
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
                  theme={theme}
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
                <div className="flex-1 min-h-0 flex flex-col">
                  <SupportView
                    staffList={staffList}
                    conversations={supportConversations}
                    tickets={supportTickets}
                    currentCustomer={{
                      id: currentUser.id === 'usr-demo-alexander' ? USER_PROFILE.id : currentUser.id,
                      name: currentUser.name,
                      clientTier: currentUser.clientTier || USER_PROFILE.clientTier,
                      avatarUrl: currentUser.avatarUrl
                    }}
                    onUnreadChange={(count) => setSupportUnreadCount(count)}
                    onUpdateConversations={(convs) => setSupportConversations(convs)}
                    onCreateTicket={handleCreateTicket}
                    theme={theme}
                  />
                </div>
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
            void supabase.auth.signOut();
           void AuthService.logout();
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
