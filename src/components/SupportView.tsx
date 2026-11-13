import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Send,
  Phone,
  Video,
  ShieldCheck,
  Search,
  Plus,
  Paperclip,
  CheckCheck,
  FileText,
  Mic,
  Headphones,
  X,
  Play,
  Pause,
  PanelLeftClose,
  PanelLeftOpen,
  Tag,
  ChevronDown,
  ChevronRight,
  Sparkles,
  ArrowLeft
} from 'lucide-react';
import {
  SupportAgent,
  SupportMessage,
  SupportConversation,
  SupportTicket,
  TicketPriority,
  InquiryCategory
} from '../types/support';
import { ablyService } from '../services/ablyService';
import { SupportService } from '../services/supportService';
import { CustomerWelcomeModal } from './support/CustomerWelcomeModal';
import { AiChatWorkspace } from './support/AiChatWorkspace';

interface SupportViewProps {
  staffList?: SupportAgent[];
  conversations?: SupportConversation[];
  tickets?: SupportTicket[];
  currentCustomer?: {
    id: string;
    name: string;
    clientTier: string;
    avatarUrl?: string;
  };
  onUnreadChange?: (totalUnread: number) => void;
  onUpdateConversations?: (conversations: SupportConversation[]) => void;
  onCreateTicket?: (ticket: SupportTicket) => void;
  theme?: 'dark' | 'light';
}

export const SupportView: React.FC<SupportViewProps> = ({
  staffList: propStaffList,
  conversations: propConversations,
  tickets: propTickets,
  currentCustomer,
  onUnreadChange,
  onUpdateConversations,
  onCreateTicket,
  theme = 'dark'
}) => {
  const isLight = theme === 'light';

  // Navigation between Live Chat Desk, AI Concierge Room, and Formal Tickets Register
  const [activeSubTab, setActiveSubTab] = useState<'chat' | 'ai-chat' | 'tickets'>('chat');

  // Support Inner Sidebar: expanded by default, manual collapse/expand toggle (no hover)
  const [isInnerSidebarCollapsed, setIsInnerSidebarCollapsed] = useState<boolean>(false);
  const [innerSidebarFilter, setInnerSidebarFilter] = useState<'all' | 'chats' | 'tickets'>('all');
  const [staffSectionExpanded, setStaffSectionExpanded] = useState<boolean>(true);
  // Mobile pane prioritization: active conversation first, intuitive switch to queue/specialists
  const [mobilePane, setMobilePane] = useState<'chat' | 'list'>('chat');

  const customerId = currentCustomer?.id || 'usr_alexander_wright';
  const customerName = currentCustomer?.name || 'Private Client';
  const customerTier = currentCustomer?.clientTier || 'Aureus Sovereign Private Client';

  const [conversations, setConversations] = useState<SupportConversation[]>(() => propConversations || []);
  const [tickets, setTickets] = useState<SupportTicket[]>(() => propTickets || []);

  useEffect(() => {
    if (propConversations) {
      setConversations(propConversations);
    }
  }, [propConversations]);

  useEffect(() => {
    if (propTickets) {
      setTickets(propTickets);
    }
  }, [propTickets]);

  const customerConversations = conversations.filter((c) => c.customerId === customerId);
  const customerTickets = tickets.filter((t) => !t.customerId || t.customerId === customerId);

  const [selectedConversationId, setSelectedConversationId] = useState<string>(
    customerConversations[0]?.id || ''
  );

  useEffect(() => {
    if (
      customerConversations.length > 0 &&
      !customerConversations.some((c) => c.id === selectedConversationId)
    ) {
      setSelectedConversationId(customerConversations[0].id);
    }
  }, [customerConversations, selectedConversationId]);

  const activeConversation =
    customerConversations.find((c) => c.id === selectedConversationId) || customerConversations[0];

  const staff = propStaffList || [];

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [ticketFilter, setTicketFilter] = useState<'All' | 'Open' | 'In Review' | 'Resolved'>('All');

  // Modals & Inputs
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isAgentTyping, setIsAgentTyping] = useState(false);
  const [typingAgentName, setTypingAgentName] = useState('');

  // Voice recording state
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);

  // Audio / Video call modal placeholder
  const [showCallModal, setShowCallModal] = useState(false);

  // New ticket modal
  const [showCreateTicketModal, setShowCreateTicketModal] = useState(false);
  const [newTicketSubject, setNewTicketSubject] = useState('');
  const [newTicketCategory, setNewTicketCategory] = useState<SupportTicket['category']>('Wire Clearance');
  const [newTicketPriority, setNewTicketPriority] = useState<TicketPriority>('High');
  const [newTicketDesc, setNewTicketDesc] = useState('');

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, []);

  // Auto scroll to latest message inside the chat feed only
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [activeConversation?.messages?.length, isAgentTyping]);

  // Synchronize unread count to parent
  useEffect(() => {
    const total = customerConversations.reduce((acc, c) => acc + c.unreadCount, 0);
    onUnreadChange?.(total);
  }, [customerConversations, onUnreadChange]);

  // Subscribe to Ably Realtime for active conversation
  useEffect(() => {
    if (!activeConversation) return;

    const leavePresence = ablyService.enterPresence(activeConversation.id, {
      clientId: customerId,
      data: {
        name: customerName,
        role: 'customer',
        status: 'online'
      }
    });

    const unsubMessages = ablyService.subscribeToMessages(activeConversation.id, (newMsg) => {
      setConversations((prev) => {
        const target = prev.find((c) => c.id === activeConversation.id);
        if (!target || target.messages.some((m) => m.id === newMsg.id)) return prev;
        const nextList = prev.map((c) =>
          c.id === activeConversation.id
            ? {
                ...c,
                messages: [...c.messages, newMsg],
                lastMessage: newMsg.text,
                lastMessageTimestamp: newMsg.timestamp
              }
            : c
        );
        onUpdateConversations?.(nextList);
        return nextList;
      });
    });

    const unsubTyping = ablyService.subscribeToTyping(activeConversation.id, (userId, typing, name) => {
      if (userId !== customerId) {
        setIsAgentTyping(typing);
        if (name) setTypingAgentName(name);
      }
    });

    return () => {
      leavePresence();
      unsubMessages();
      unsubTyping();
    };
  }, [activeConversation?.id, customerId, customerName]);

  const updateConversationInState = (updatedConv: SupportConversation) => {
    setConversations((prev) => {
      const next = prev.map((c) => (c.id === updatedConv.id ? updatedConv : c));
      onUpdateConversations?.(next);
      return next;
    });
  };

  // Mark conversation as read on select
  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id);
    setMobilePane('chat');
    const target = conversations.find((c) => c.id === id);
    if (target && target.unreadCount > 0) {
      updateConversationInState({ ...target, unreadCount: 0 });
      SupportService.updateConversation(id, { unreadCount: 0 });
    }
  };

  // Start or open conversation with a specific staff member
  const handleSelectStaffMember = async (agent: SupportAgent) => {
    const existing = customerConversations.find((c) => c.agent.id === agent.id);
    if (existing) {
      handleSelectConversation(existing.id);
      return;
    }

    const res = await SupportService.createConversation({
      customerId,
      customerName,
      customerTier,
      agent,
      category: 'General Support',
      subject: `Private Consultation with ${agent.name}`,
      initialMessage: `Consultation channel initialized with ${agent.name} (${agent.department}).`
    });

    if (res.success && res.data) {
      const updated = [res.data, ...conversations];
      setConversations(updated);
      onUpdateConversations?.(updated);
      setSelectedConversationId(res.data.id);
      setMobilePane('chat');
    }
  };

  // Send Message from Customer
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !activeConversation) return;

    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userPrompt = inputText.trim();

    const newMsg: SupportMessage = {
      id: `m-${Date.now()}`,
      conversationId: activeConversation.id,
      sender: 'customer',
      text: userPrompt,
      timestamp: timeNow,
      status: 'sent'
    };

    setInputText('');

    const updated: SupportConversation = {
      ...activeConversation,
      messages: [...activeConversation.messages, newMsg],
      lastMessage: newMsg.text,
      lastMessageTimestamp: timeNow,
      unreadCount: 0
    };
    updateConversationInState(updated);

    await SupportService.sendMessage(activeConversation.id, newMsg);
    ablyService.publishMessage(activeConversation.id, newMsg);

    // Real-time staff response hook via service
    ablyService.simulateStaffReply(
      activeConversation.id,
      activeConversation.agent,
      userPrompt,
      (reply) => {
        setConversations((prev) => {
          const fresh = prev.find((c) => c.id === activeConversation.id);
          if (fresh && !fresh.messages.some((m) => m.id === reply.id)) {
            const nextConv = {
              ...fresh,
              messages: [...fresh.messages, reply],
              lastMessage: reply.text,
              lastMessageTimestamp: reply.timestamp
            };
            const nextList = prev.map((c) => (c.id === nextConv.id ? nextConv : c));
            onUpdateConversations?.(nextList);
            return nextList;
          }
          return prev;
        });
      }
    );
  };

  // Voice note recording
  const handleToggleVoiceRecording = async () => {
    if (!isRecordingVoice) {
      setIsRecordingVoice(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      setIsRecordingVoice(false);

      if (recordingSeconds >= 1 && activeConversation) {
        const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const voiceMsg: SupportMessage = {
          id: `m-voice-${Date.now()}`,
          conversationId: activeConversation.id,
          sender: 'customer',
          text: `Voice dispatch (${recordingSeconds}s)`,
          timestamp: timeNow,
          status: 'sent',
          voiceNote: {
            durationSeconds: recordingSeconds,
            waveform: [40, 80, 60, 100, 70, 50, 90, 80, 60, 40, 65, 85, 50, 30]
          }
        };

        await SupportService.sendMessage(activeConversation.id, voiceMsg);
        ablyService.publishMessage(activeConversation.id, voiceMsg);
        updateConversationInState({
          ...activeConversation,
          messages: [...activeConversation.messages, voiceMsg],
          lastMessage: `Voice note (${recordingSeconds}s)`,
          lastMessageTimestamp: timeNow
        });
      }
    }
  };

  // New Inquiry Flow completion
  const handleStartInquiry = async (params: {
    category: InquiryCategory;
    subject: string;
    initialMessage: string;
    agentId: string;
  }) => {
    const targetAgent = staff.find((s) => s.id === params.agentId) || staff[0];
    if (!targetAgent) return;

    const res = await SupportService.createConversation({
      customerId,
      customerName,
      customerTier,
      agent: targetAgent,
      category: params.category,
      subject: params.subject,
      initialMessage: params.initialMessage
    });

    if (res.success && res.data) {
      const newConv = res.data;
      const nextList = [newConv, ...conversations];
      setConversations(nextList);
      onUpdateConversations?.(nextList);
      setSelectedConversationId(newConv.id);
      setActiveSubTab('chat');
      setMobilePane('chat');

      ablyService.simulateStaffReply(newConv.id, targetAgent, params.initialMessage, (reply) => {
        setConversations((prev) => {
          const fresh = prev.find((c) => c.id === newConv.id);
          if (fresh && !fresh.messages.some((m) => m.id === reply.id)) {
            const nextConv = {
              ...fresh,
              messages: [...fresh.messages, reply],
              lastMessage: reply.text,
              lastMessageTimestamp: reply.timestamp
            };
            const updated = prev.map((c) => (c.id === nextConv.id ? nextConv : c));
            onUpdateConversations?.(updated);
            return updated;
          }
          return prev;
        });
      });
    }
  };

  // Create Ticket Submit
  const handleCreateTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicketSubject.trim() || !newTicketDesc.trim()) return;

    const assigned = staff[0];
    const res = await SupportService.createTicket({
      subject: newTicketSubject.trim(),
      category: newTicketCategory,
      priority: newTicketPriority,
      assignedAgent: assigned?.name || 'Private Wealth Desk',
      assignedAgentId: assigned?.id,
      customerId,
      customerName,
      description: newTicketDesc.trim()
    });

    if (res.success && res.data) {
      setTickets((prev) => [res.data!, ...prev]);
      onCreateTicket?.(res.data);
    }

    setShowCreateTicketModal(false);
    setNewTicketSubject('');
    setNewTicketDesc('');
  };

  // Filtered inner sidebar lists
  const q = searchQuery.trim().toLowerCase();
  const filteredStaff = staff.filter(
    (s) =>
      !q ||
      s.name.toLowerCase().includes(q) ||
      s.department.toLowerCase().includes(q) ||
      s.specialization.toLowerCase().includes(q)
  );

  const filteredConversations = customerConversations.filter(
    (c) =>
      !q ||
      c.agent.name.toLowerCase().includes(q) ||
      c.subject.toLowerCase().includes(q) ||
      c.department.toLowerCase().includes(q) ||
      c.lastMessage.toLowerCase().includes(q)
  );

  const filteredSidebarTickets = customerTickets.filter(
    (t) =>
      !q ||
      t.id.toLowerCase().includes(q) ||
      t.subject.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q) ||
      t.assignedAgent.toLowerCase().includes(q)
  );

  const filteredRegisterTickets = customerTickets.filter(
    (t) => ticketFilter === 'All' || t.status === ticketFilter
  );

  return (
    <div className="flex flex-col h-full min-h-0 space-y-1.5 sm:space-y-2 w-full animate-in fade-in duration-200">
      {/* Compact Support Workspace Title & Navigation Bar */}
      <div
        className={`px-2.5 sm:px-3.5 py-2 rounded-xl border shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2 shrink-0 ${
          isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-neutral-900 border-neutral-800 text-neutral-100'
        }`}
      >
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold shrink-0">
              <Headphones className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-xs sm:text-sm md:text-base font-bold tracking-tight truncate">
                Support & Advisory Desk
              </h1>
              <span className="hidden sm:inline-block text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shrink-0">
                FIDO2 Encrypted
              </span>
              <span className={`hidden xl:inline text-[11px] ${isLight ? 'text-slate-500' : 'text-neutral-400'}`}>
                · {staff.length} licensed officers
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowWelcomeModal(true)}
            className="lg:hidden px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-semibold text-[11px] transition-colors flex items-center gap-1 shadow-sm cursor-pointer shrink-0"
          >
            <Plus className="w-3 h-3" />
            <span>New</span>
          </button>
        </div>

        {/* Sub-tab & New Inquiry Controls */}
        <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-0.5 lg:pb-0">
          <div
            className={`flex items-center p-0.5 rounded-xl border text-[11px] sm:text-xs shrink-0 ${
              isLight ? 'bg-slate-100 border-slate-200' : 'bg-neutral-950/60 border-neutral-800'
            }`}
          >
            <button
              type="button"
              onClick={() => setActiveSubTab('chat')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeSubTab === 'chat'
                  ? 'bg-emerald-500 text-neutral-950 shadow-sm'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Live Desk</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('ai-chat')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeSubTab === 'ai-chat'
                  ? 'bg-amber-500 text-neutral-950 shadow-sm'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Concierge</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('tickets')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeSubTab === 'tickets'
                  ? 'bg-emerald-500 text-neutral-950 shadow-sm'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Tickets ({customerTickets.length})</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowWelcomeModal(true)}
            className="hidden lg:flex px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-semibold text-xs transition-colors items-center gap-1 shadow-sm cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Inquiry</span>
          </button>
        </div>
      </div>

      {/* CHAT TAB: FULL-HEIGHT FLEXIBLE TWO-PANEL LAYOUT */}
      {activeSubTab === 'chat' && (
        <div
          className={`flex-1 min-h-0 rounded-2xl border shadow-xl overflow-hidden flex flex-col lg:flex-row ${
            isLight ? 'bg-white border-slate-200' : 'bg-neutral-900 border-neutral-800'
          }`}
        >
          {/* Inner Support Sidebar (Expanded by default, Manual Collapse/Expand Toggle on desktop; dedicated pane on mobile) */}
          <div
            className={`${
              mobilePane === 'list' ? 'flex flex-1 lg:flex-none' : 'hidden lg:flex'
            } ${
              isInnerSidebarCollapsed
                ? 'w-full lg:w-[68px]'
                : 'w-full lg:w-[310px] xl:w-[350px]'
            } shrink-0 lg:border-r flex-col min-h-0 transition-[width] duration-200 overflow-hidden ${
              isLight ? 'border-slate-200 bg-slate-50/70' : 'border-neutral-800 bg-neutral-950/40'
            }`}
          >
            {/* Inner Sidebar Header with Manual Toggle */}
            <div
              className={`p-3 border-b flex items-center justify-between gap-2 shrink-0 ${
                isLight ? 'border-slate-200 bg-slate-100/60' : 'border-neutral-800/80 bg-neutral-950/70'
              }`}
            >
              {!isInnerSidebarCollapsed && (
                <div className="min-w-0">
                  <div className="text-xs font-semibold tracking-tight truncate">
                    Support Queue & Specialists
                  </div>
                  <div className="text-[10px] font-mono text-neutral-500 truncate">
                    {customerConversations.length} active chats · {customerTickets.length} tickets
                  </div>
                </div>
              )}

              {activeConversation && (
                <button
                  type="button"
                  onClick={() => setMobilePane('chat')}
                  className={`lg:hidden px-2.5 py-1 rounded-lg border text-[11px] font-semibold flex items-center gap-1 shrink-0 cursor-pointer ${
                    isLight
                      ? 'bg-white border-slate-200 text-emerald-600'
                      : 'bg-neutral-900 border-neutral-800 text-emerald-400'
                  }`}
                >
                  <span>Active Chat</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsInnerSidebarCollapsed((prev) => !prev)}
                title={isInnerSidebarCollapsed ? 'Expand Support Sidebar' : 'Collapse Support Sidebar'}
                aria-label={isInnerSidebarCollapsed ? 'Expand Support Sidebar' : 'Collapse Support Sidebar'}
                className={`hidden lg:inline-flex p-1.5 rounded-lg border transition-colors cursor-pointer shrink-0 ${
                  isInnerSidebarCollapsed ? 'mx-auto' : ''
                } ${
                  isLight
                    ? 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800'
                }`}
              >
                {isInnerSidebarCollapsed ? (
                  <PanelLeftOpen className="w-4 h-4 text-emerald-500" />
                ) : (
                  <PanelLeftClose className="w-4 h-4" />
                )}
              </button>
            </div>

            {isInnerSidebarCollapsed ? (
              /* COLLAPSED INNER SIDEBAR VIEW (Icons & Avatars Only) */
              <div className="flex-1 min-h-0 overflow-y-auto py-3 px-2 flex lg:flex-col items-center gap-2.5 overflow-x-auto lg:overflow-x-hidden">
                {customerConversations.map((conv) => {
                  const isSelected = conv.id === activeConversation?.id;
                  return (
                    <button
                      key={conv.id}
                      type="button"
                      onClick={() => handleSelectConversation(conv.id)}
                      title={`${conv.agent.name} — ${conv.subject}`}
                      className={`relative w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400 shadow-sm'
                          : isLight
                          ? 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                          : 'border-neutral-800 bg-neutral-900 text-neutral-300 hover:bg-neutral-800'
                      }`}
                    >
                      {conv.agent.initials}
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 ${
                          isLight ? 'border-white' : 'border-neutral-950'
                        } ${
                          conv.agent.status === 'online'
                            ? 'bg-emerald-500'
                            : conv.agent.status === 'busy'
                            ? 'bg-amber-500'
                            : 'bg-sky-500'
                        }`}
                      />
                      {conv.unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] px-0.5 rounded-full bg-emerald-500 text-neutral-950 text-[9px] font-mono font-bold flex items-center justify-center">
                          {conv.unreadCount}
                        </span>
                      )}
                    </button>
                  );
                })}

                <div className={`hidden lg:block w-8 h-px my-1 ${isLight ? 'bg-slate-200' : 'bg-neutral-800'}`} />

                <button
                  type="button"
                  onClick={() => setActiveSubTab('tickets')}
                  title={`View Formal Tickets (${customerTickets.length})`}
                  className={`relative w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-colors cursor-pointer ${
                    isLight
                      ? 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                      : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  {customerTickets.length > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] px-0.5 rounded-full bg-sky-500 text-neutral-950 text-[9px] font-mono font-bold flex items-center justify-center">
                      {customerTickets.length}
                    </span>
                  )}
                </button>
              </div>
            ) : (
              /* EXPANDED INNER SIDEBAR VIEW */
              <>
                {/* Search & Inner Filter Bar */}
                <div
                  className={`p-3 border-b space-y-2.5 shrink-0 ${
                    isLight ? 'border-slate-200' : 'border-neutral-800/70'
                  }`}
                >
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input
                      type="text"
                      placeholder="Search specialists, chats, tickets..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                        isLight
                          ? 'bg-white border-slate-200 text-slate-900'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-100'
                      }`}
                    />
                  </div>

                  {/* Clean Segmented Filter */}
                  <div className="grid grid-cols-3 gap-1 text-[11px]">
                    {(
                      [
                        { id: 'all', label: 'All' },
                        { id: 'chats', label: `Chats (${filteredConversations.length})` },
                        { id: 'tickets', label: `Tickets (${filteredSidebarTickets.length})` }
                      ] as const
                    ).map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setInnerSidebarFilter(tab.id)}
                        className={`py-1 px-2 rounded-lg font-medium transition-colors cursor-pointer truncate ${
                          innerSidebarFilter === tab.id
                            ? 'bg-emerald-500 text-neutral-950 font-bold'
                            : isLight
                            ? 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                            : 'bg-neutral-900 text-neutral-400 hover:bg-neutral-800'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Unified Independently Scrollable Inner Sidebar List */}
                <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-neutral-800/30">
                  {/* Section 1: Active Chats & Conversations */}
                  {(innerSidebarFilter === 'all' || innerSidebarFilter === 'chats') && (
                    <div className="p-2.5 space-y-1.5">
                      <div className="px-1 py-1 flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-neutral-500">
                        <span>Active Chats & Conversations</span>
                        <span>{filteredConversations.length}</span>
                      </div>

                      {filteredConversations.length === 0 ? (
                        <div className="p-4 text-center text-xs text-neutral-500">
                          No matching conversations.
                        </div>
                      ) : (
                        filteredConversations.map((conv) => {
                          const isSelected = conv.id === activeConversation?.id;
                          return (
                            <div
                              key={conv.id}
                              onClick={() => handleSelectConversation(conv.id)}
                              className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col gap-1 ${
                                isSelected
                                  ? isLight
                                    ? 'bg-white shadow-sm border-emerald-500 ring-1 ring-emerald-500/30'
                                    : 'bg-neutral-900 border-emerald-500/70 shadow-sm'
                                  : isLight
                                  ? 'bg-white/60 border-slate-200/80 hover:bg-white'
                                  : 'bg-neutral-900/40 border-neutral-800/70 hover:bg-neutral-800/40'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span
                                    className={`text-xs font-semibold truncate ${
                                      isLight ? 'text-slate-900' : 'text-neutral-100'
                                    }`}
                                  >
                                    {conv.agent.name}
                                  </span>
                                  <span
                                    className={`text-[9px] px-1.5 py-0.2 rounded font-mono shrink-0 ${
                                      isLight
                                        ? 'bg-slate-100 text-slate-600'
                                        : 'bg-neutral-800 text-neutral-400'
                                    }`}
                                  >
                                    {conv.department}
                                  </span>
                                </div>
                                <span className="text-[10px] font-mono text-neutral-400 shrink-0">
                                  {conv.lastMessageTimestamp}
                                </span>
                              </div>

                              <div className="text-xs font-medium text-emerald-500 truncate">{conv.subject}</div>
                              <div className="text-[11px] text-neutral-400 truncate">{conv.lastMessage}</div>

                              <div className="flex items-center justify-between pt-1 text-[10px]">
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={`px-1.5 py-0.2 rounded capitalize ${
                                      conv.status === 'active'
                                        ? 'bg-emerald-500/10 text-emerald-500'
                                        : conv.status === 'pending'
                                        ? 'bg-amber-500/10 text-amber-500'
                                        : 'bg-sky-500/10 text-sky-500'
                                    }`}
                                  >
                                    {conv.status}
                                  </span>
                                  {conv.linkedTicketId && (
                                    <span className="font-mono text-neutral-500">{conv.linkedTicketId}</span>
                                  )}
                                </div>
                                {conv.unreadCount > 0 && (
                                  <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-neutral-950 font-bold text-[10px]">
                                    {conv.unreadCount} unread
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {/* Section 2: 5 Dedicated Support Staff */}
                  {(innerSidebarFilter === 'all' || innerSidebarFilter === 'chats') && (
                    <div className="p-2.5 space-y-1.5">
                      <button
                        type="button"
                        onClick={() => setStaffSectionExpanded((prev) => !prev)}
                        className="w-full px-1 py-1 flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-neutral-500 hover:text-emerald-500 cursor-pointer"
                      >
                        <span className="flex items-center gap-1">
                          {staffSectionExpanded ? (
                            <ChevronDown className="w-3 h-3" />
                          ) : (
                            <ChevronRight className="w-3 h-3" />
                          )}
                          <span>Dedicated Specialists ({filteredStaff.length})</span>
                        </span>
                        <span className="text-emerald-500">Live Desk</span>
                      </button>

                      {staffSectionExpanded && (
                        <div className="space-y-1.5">
                          {filteredStaff.map((agent) => {
                            const isCurrentActive = activeConversation?.agent.id === agent.id;
                            return (
                              <div
                                key={agent.id}
                                onClick={() => handleSelectStaffMember(agent)}
                                className={`p-2 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                                  isCurrentActive
                                    ? 'border-emerald-500/80 bg-emerald-500/10'
                                    : isLight
                                    ? 'border-slate-200 bg-white hover:bg-slate-50'
                                    : 'border-neutral-800/80 hover:bg-neutral-800/40 bg-neutral-900/60'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="relative shrink-0">
                                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-500 font-bold flex items-center justify-center text-xs">
                                      {agent.initials}
                                    </div>
                                    <span
                                      className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 ${
                                        isLight ? 'border-white' : 'border-neutral-950'
                                      } ${
                                        agent.status === 'online'
                                          ? 'bg-emerald-500'
                                          : agent.status === 'busy'
                                          ? 'bg-amber-500'
                                          : agent.status === 'away'
                                          ? 'bg-sky-500'
                                          : 'bg-neutral-500'
                                      }`}
                                    />
                                  </div>
                                  <div className="min-w-0">
                                    <div
                                      className={`text-xs font-semibold truncate ${
                                        isLight ? 'text-slate-900' : 'text-neutral-100'
                                      }`}
                                    >
                                      {agent.name}
                                    </div>
                                    <div className="text-[10px] text-neutral-400 truncate">
                                      {agent.department} · {agent.activeConversationsCount} active
                                    </div>
                                  </div>
                                </div>

                                <div className="text-right shrink-0 pl-2">
                                  <span className="text-[10px] font-mono text-emerald-500 block">
                                    {agent.responseTime}
                                  </span>
                                  <span className="text-[9px] text-neutral-500 capitalize">{agent.status}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Section 3: Support Tickets in Inner Sidebar */}
                  {(innerSidebarFilter === 'all' || innerSidebarFilter === 'tickets') && (
                    <div className="p-2.5 space-y-1.5">
                      <div className="px-1 py-1 flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-neutral-500">
                        <span>Support Tickets</span>
                        <span>{filteredSidebarTickets.length}</span>
                      </div>

                      {filteredSidebarTickets.map((tkt) => (
                        <div
                          key={tkt.id}
                          onClick={() => {
                            if (tkt.conversationId) {
                              const linkedConv = customerConversations.find((c) => c.id === tkt.conversationId);
                              if (linkedConv) {
                                handleSelectConversation(linkedConv.id);
                                return;
                              }
                            }
                            setActiveSubTab('tickets');
                          }}
                          className={`p-2.5 rounded-xl border cursor-pointer transition-all space-y-1 ${
                            activeConversation?.linkedTicketId === tkt.id
                              ? 'border-emerald-500/70 bg-emerald-500/10'
                              : isLight
                              ? 'border-slate-200 bg-white hover:bg-slate-50'
                              : 'border-neutral-800/80 bg-neutral-900/50 hover:bg-neutral-800/40'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-mono font-bold text-emerald-500 flex items-center gap-1">
                              <Tag className="w-3 h-3" />
                              {tkt.id}
                            </span>
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                                tkt.status === 'Resolved'
                                  ? 'bg-sky-500/15 text-sky-400'
                                  : tkt.status === 'In Review'
                                  ? 'bg-amber-500/15 text-amber-400'
                                  : tkt.status === 'Escalated'
                                  ? 'bg-rose-500/15 text-rose-400'
                                  : 'bg-emerald-500/15 text-emerald-400'
                              }`}
                            >
                              {tkt.status}
                            </span>
                          </div>
                          <div
                            className={`text-xs font-medium truncate ${
                              isLight ? 'text-slate-900' : 'text-neutral-200'
                            }`}
                          >
                            {tkt.subject}
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-neutral-500">
                            <span className="truncate">{tkt.assignedAgent}</span>
                            <span
                              className={
                                tkt.priority === 'Urgent'
                                  ? 'text-rose-400 font-semibold'
                                  : tkt.priority === 'High'
                                  ? 'text-amber-400'
                                  : ''
                              }
                            >
                              {tkt.priority}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Right Panel: Active Chat */}
          <div
            className={`${
              mobilePane === 'chat' ? 'flex' : 'hidden'
            } lg:flex flex-1 min-w-0 min-h-0 flex-col overflow-hidden relative`}
          >
            {activeConversation ? (
              <>
                {/* Chat Header */}
                <div
                  className={`py-2 sm:py-2.5 px-2.5 sm:px-4 border-b flex items-center justify-between gap-2 shrink-0 ${
                    isLight ? 'bg-slate-50/90 border-slate-200' : 'bg-neutral-950/80 border-neutral-800'
                  }`}
                >
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => setMobilePane('list')}
                      title="Back to Queue & Specialists"
                      aria-label="Back to Queue"
                      className={`lg:hidden p-1.5 rounded-lg border flex items-center gap-1 text-[11px] font-semibold shrink-0 cursor-pointer ${
                        isLight
                          ? 'bg-white border-slate-200 text-slate-700'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-200'
                      }`}
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Queue</span>
                    </button>

                    <div className="relative shrink-0">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-emerald-500/20 text-emerald-500 font-bold flex items-center justify-center text-xs sm:text-sm border border-emerald-500/30">
                        {activeConversation.agent.initials}
                      </div>
                      <span
                        className={`absolute bottom-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border-2 ${
                          isLight ? 'border-white' : 'border-neutral-950'
                        } ${
                          activeConversation.agent.status === 'online'
                            ? 'bg-emerald-500'
                            : activeConversation.agent.status === 'busy'
                            ? 'bg-amber-500'
                            : 'bg-sky-500'
                        }`}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <span
                          className={`text-xs sm:text-sm font-semibold truncate ${
                            isLight ? 'text-slate-900' : 'text-neutral-100'
                          }`}
                        >
                          {activeConversation.agent.name}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 truncate max-w-[120px] sm:max-w-none">
                          {activeConversation.agent.department}
                        </span>
                        {activeConversation.linkedTicketId && (
                          <span className="hidden sm:inline-block text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                            {activeConversation.linkedTicketId}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] sm:text-[11px] text-neutral-400 truncate max-w-[200px] sm:max-w-lg">
                        {activeConversation.subject}
                        <span className="hidden sm:inline"> · Direct: {activeConversation.agent.directPhone}</span>
                      </div>
                    </div>
                  </div>

                  {/* Header Actions */}
                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowCallModal(true)}
                      className={`p-1.5 sm:p-2 rounded-xl border text-neutral-400 hover:text-emerald-500 transition-colors cursor-pointer ${
                        isLight ? 'border-slate-200 hover:bg-slate-100' : 'border-neutral-800 hover:bg-neutral-800'
                      }`}
                      title="Encrypted Voice Call"
                    >
                      <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCallModal(true)}
                      className={`p-1.5 sm:p-2 rounded-xl border text-neutral-400 hover:text-emerald-500 transition-colors cursor-pointer ${
                        isLight ? 'border-slate-200 hover:bg-slate-100' : 'border-neutral-800 hover:bg-neutral-800'
                      }`}
                      title="Video Consultation"
                    >
                      <Video className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                  </div>
                </div>

                {/* Independently Scrollable Messages Feed */}
                <div className="flex-1 min-h-0 p-3 sm:p-5 overflow-y-auto space-y-3.5 sm:space-y-4">
                  {activeConversation.messages.map((msg) => {
                    const isClient = msg.sender === 'customer';
                    const isSystem = msg.sender === 'system';

                    if (isSystem) {
                      return (
                        <div key={msg.id} className="flex justify-center my-2">
                          <div
                            className={`text-[11px] px-3.5 py-1 rounded-full border font-mono text-center max-w-lg ${
                              isLight
                                ? 'bg-slate-100 border-slate-200 text-slate-600'
                                : 'bg-neutral-800/60 border-neutral-700/40 text-neutral-400'
                            }`}
                          >
                            {msg.text}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={msg.id} className={`flex flex-col ${isClient ? 'items-end' : 'items-start'}`}>
                        <div className="flex items-center gap-1.5 mb-1 text-[10px] text-neutral-400 font-mono">
                          <span>{isClient ? customerName : activeConversation.agent.name}</span>
                          <span>·</span>
                          <span>{msg.timestamp}</span>
                        </div>

                        <div
                          className={`max-w-[88%] sm:max-w-[78%] rounded-2xl p-2.5 sm:p-3 text-xs leading-relaxed shadow-sm break-words ${
                            isClient
                              ? 'bg-emerald-600 text-neutral-950 font-medium rounded-br-xs'
                              : isLight
                              ? 'bg-slate-100 text-slate-900 border border-slate-200 rounded-bl-xs'
                              : 'bg-neutral-800 text-neutral-100 border border-neutral-700/60 rounded-bl-xs'
                          }`}
                        >
                          <p className="whitespace-pre-line">{msg.text}</p>

                          {msg.attachment && (
                            <div className="mt-2 pt-2 border-t border-black/10 flex items-center gap-2 text-[11px]">
                              <FileText className="w-4 h-4 shrink-0" />
                              <span className="font-semibold underline truncate">{msg.attachment.name}</span>
                              <span className="opacity-70">({msg.attachment.size})</span>
                            </div>
                          )}

                          {msg.voiceNote && (
                            <div className="mt-2 p-2 rounded-xl bg-black/15 flex items-center gap-2.5">
                              <button
                                type="button"
                                onClick={() => setPlayingVoiceId(playingVoiceId === msg.id ? null : msg.id)}
                                className="w-7 h-7 rounded-full bg-emerald-500 text-neutral-950 flex items-center justify-center shrink-0 cursor-pointer"
                              >
                                {playingVoiceId === msg.id ? (
                                  <Pause className="w-3.5 h-3.5" />
                                ) : (
                                  <Play className="w-3.5 h-3.5 ml-0.5" />
                                )}
                              </button>
                              <div className="flex-1">
                                <div className="h-1.5 bg-black/20 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full bg-emerald-300 rounded-full ${
                                      playingVoiceId === msg.id ? 'w-full transition-all duration-3000' : 'w-1/3'
                                    }`}
                                  />
                                </div>
                              </div>
                              <span className="font-mono text-[10px]">{msg.voiceNote.durationSeconds}s</span>
                            </div>
                          )}
                        </div>

                        {isClient && (
                          <div className="flex items-center gap-1 mt-0.5 text-[10px] text-neutral-500 font-mono">
                            <CheckCheck className="w-3 h-3 text-emerald-500" />
                            <span>{msg.status}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {isAgentTyping && (
                    <div className="flex items-center gap-2 text-xs text-neutral-400 italic">
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" />
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce delay-100" />
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce delay-200" />
                      </div>
                      <span>{typingAgentName || activeConversation.agent.name} is typing...</span>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Message Composer Footer */}
                <div
                  className={`p-2 sm:p-2.5 px-2.5 sm:px-3.5 border-t shrink-0 ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-neutral-950/80 border-neutral-800'
                  }`}
                >
                  <form onSubmit={handleSendMessage} className="space-y-1.5 sm:space-y-2">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <button
                        type="button"
                        title="Attach Document"
                        className={`p-1.5 sm:p-2 rounded-xl text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer shrink-0 ${
                          isLight ? 'hover:bg-slate-200 hover:text-slate-700' : 'hover:bg-neutral-800'
                        }`}
                      >
                        <Paperclip className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={handleToggleVoiceRecording}
                        title={isRecordingVoice ? 'Stop and send voice dispatch' : 'Record Voice Note'}
                        className={`p-1.5 sm:p-2 rounded-xl transition-all cursor-pointer shrink-0 ${
                          isRecordingVoice
                            ? 'bg-rose-500 text-white animate-pulse'
                            : isLight
                            ? 'text-neutral-500 hover:bg-slate-200'
                            : 'text-neutral-400 hover:bg-neutral-800'
                        }`}
                      >
                        <Mic className="w-4 h-4" />
                      </button>

                      <input
                        type="text"
                        placeholder={
                          isRecordingVoice
                            ? `Recording (${recordingSeconds}s)...`
                            : `Message ${activeConversation.agent.name}...`
                        }
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        className={`flex-1 min-w-0 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors ${
                          isLight
                            ? 'bg-white border-slate-300 text-slate-900'
                            : 'bg-neutral-900 border-neutral-800 text-neutral-100'
                        }`}
                      />

                      <button
                        type="submit"
                        disabled={!inputText.trim()}
                        className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-neutral-950 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm shrink-0"
                      >
                        <span className="hidden sm:inline">Send</span>
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-2 text-[10px] sm:text-[11px] text-neutral-500 px-1">
                      <span className="font-mono truncate">
                        Ably Room:{' '}
                        <span className="text-emerald-500 font-semibold">support:conv-{activeConversation.id}</span>
                      </span>
                      <span className="hidden sm:inline shrink-0">Response SLA: &lt; 2 minutes</span>
                    </div>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-neutral-400 p-6 sm:p-8 space-y-3 text-center">
                <Headphones className="w-11 h-11 text-emerald-500/40" />
                <p className="text-sm font-medium">Select a private banking specialist to begin</p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMobilePane('list')}
                    className={`lg:hidden px-4 py-2 rounded-xl border font-semibold text-xs cursor-pointer ${
                      isLight ? 'border-slate-300 bg-slate-100 text-slate-800' : 'border-neutral-700 bg-neutral-800 text-neutral-100'
                    }`}
                  >
                    Browse Specialists
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowWelcomeModal(true)}
                    className="px-4 py-2 rounded-xl bg-emerald-500 text-neutral-950 font-semibold text-xs hover:bg-emerald-400 cursor-pointer"
                  >
                    Start New Inquiry
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI CONCIERGE TAB: FULL-HEIGHT AI CHAT WORKSPACE */}
      {activeSubTab === 'ai-chat' && (
        <AiChatWorkspace
          scope="client"
          userId={customerId}
          userName={customerName}
          supportConversations={customerConversations}
          initialLinkedSupportConversationId={activeConversation?.id}
          theme={theme}
        />
      )}

      {/* TICKETS TAB: FORMAL REGISTER */}
      {activeSubTab === 'tickets' && (
        <div
          className={`flex-1 min-h-0 overflow-y-auto p-3.5 sm:p-6 rounded-2xl border space-y-4 ${
            isLight
              ? 'border-slate-200 bg-white text-slate-900'
              : 'border-neutral-800 bg-neutral-900/60 text-neutral-100'
          }`}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold tracking-tight">Formal Support Tickets Register</h3>
              <p className="text-xs text-neutral-400">
                Track compliance, wire clearance, and escrow tickets
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-between sm:justify-end">
              <div className="flex items-center gap-1 text-xs overflow-x-auto">
                {(['All', 'Open', 'In Review', 'Resolved'] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setTicketFilter(status)}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer whitespace-nowrap ${
                      ticketFilter === status
                        ? 'bg-emerald-500 text-neutral-950 font-semibold'
                        : isLight
                        ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setShowCreateTicketModal(true)}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-500 text-neutral-950 font-semibold text-xs hover:bg-emerald-400 cursor-pointer shrink-0"
              >
                + File Formal Ticket
              </button>
            </div>
          </div>

          {/* Mobile Ticket Cards */}
          <div className="md:hidden space-y-2.5">
            {filteredRegisterTickets.map((tkt) => (
              <div
                key={tkt.id}
                onClick={() => {
                  if (tkt.conversationId) {
                    handleSelectConversation(tkt.conversationId);
                    setActiveSubTab('chat');
                  }
                }}
                className={`p-3.5 rounded-xl border space-y-2 ${
                  tkt.conversationId ? 'cursor-pointer' : ''
                } ${isLight ? 'border-slate-200 bg-slate-50/70' : 'border-neutral-800 bg-neutral-950/60'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-emerald-500">{tkt.id}</span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        tkt.priority === 'Urgent'
                          ? 'bg-rose-500/10 text-rose-400'
                          : tkt.priority === 'High'
                          ? 'bg-amber-500/10 text-amber-400'
                          : 'bg-sky-500/10 text-sky-400'
                      }`}
                    >
                      {tkt.priority}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] ${
                        isLight ? 'bg-slate-200 text-slate-700' : 'bg-neutral-800 text-neutral-300'
                      }`}
                    >
                      {tkt.status}
                    </span>
                  </div>
                </div>
                <div className="text-xs font-semibold">{tkt.subject}</div>
                <div className="flex items-center justify-between text-[11px] text-neutral-400">
                  <span>{tkt.category}</span>
                  <span className="truncate max-w-[160px]">{tkt.assignedAgent}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Tickets Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead
                className={`font-mono uppercase text-[10px] border-b ${
                  isLight
                    ? 'bg-slate-50 text-slate-500 border-slate-200'
                    : 'bg-neutral-950/60 text-neutral-400 border-neutral-800'
                }`}
              >
                <tr>
                  <th className="p-3">Ticket ID</th>
                  <th className="p-3">Subject</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Priority</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Assigned Officer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/30">
                {filteredRegisterTickets.map((tkt) => (
                  <tr
                    key={tkt.id}
                    onClick={() => {
                      if (tkt.conversationId) {
                        handleSelectConversation(tkt.conversationId);
                        setActiveSubTab('chat');
                      }
                    }}
                    className={`transition-colors ${
                      tkt.conversationId ? 'cursor-pointer' : ''
                    } ${isLight ? 'hover:bg-slate-50' : 'hover:bg-neutral-800/20'}`}
                  >
                    <td className="p-3 font-mono text-emerald-500 font-bold">{tkt.id}</td>
                    <td className="p-3 font-medium">{tkt.subject}</td>
                    <td className="p-3 text-neutral-400">{tkt.category}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          tkt.priority === 'Urgent'
                            ? 'bg-rose-500/10 text-rose-400'
                            : tkt.priority === 'High'
                            ? 'bg-amber-500/10 text-amber-400'
                            : 'bg-sky-500/10 text-sky-400'
                        }`}
                      >
                        {tkt.priority}
                      </span>
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] ${
                          isLight ? 'bg-slate-100 text-slate-700' : 'bg-neutral-800 text-neutral-300'
                        }`}
                      >
                        {tkt.status}
                      </span>
                    </td>
                    <td className="p-3 text-neutral-400">{tkt.assignedAgent}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Customer Welcome Flow Modal */}
      <CustomerWelcomeModal
        isOpen={showWelcomeModal}
        onClose={() => setShowWelcomeModal(false)}
        staffList={staff}
        onStartInquiry={handleStartInquiry}
        theme={theme}
      />

      {/* Audio / Video Calling Modal Placeholder */}
      {showCallModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className={`w-full max-w-md rounded-2xl border p-6 space-y-4 shadow-2xl ${
              isLight
                ? 'border-slate-200 bg-white text-slate-900'
                : 'border-neutral-800 bg-neutral-900 text-neutral-100'
            }`}
          >
            <div className="flex items-center justify-between border-b border-neutral-800/30 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                <h4 className="text-sm font-semibold">Sovereign Voice & Video Bridge</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowCallModal(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div
              className={`p-4 rounded-xl border space-y-2 text-xs ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-neutral-950 border-neutral-800'
              }`}
            >
              <div className="text-emerald-500 font-mono font-semibold">Ready for WebRTC / SIP Bridge</div>
              <p className="text-neutral-400 leading-relaxed">
                Calling infrastructure is pre-architected for end-to-end encrypted voice & video consults.
                Requires secondary hardware key token signing before opening live audio channel.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowCallModal(false)}
                className="px-4 py-2 rounded-xl bg-emerald-500 text-neutral-950 font-semibold text-xs hover:bg-emerald-400 cursor-pointer"
              >
                Acknowledge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Ticket Modal */}
      {showCreateTicketModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm">
          <div
            className={`w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-2xl border p-5 sm:p-6 space-y-4 shadow-2xl ${
              isLight
                ? 'border-slate-200 bg-white text-slate-900'
                : 'border-neutral-800 bg-neutral-900 text-neutral-100'
            }`}
          >
            <div className="flex items-center justify-between border-b border-neutral-800/30 pb-3">
              <h4 className="text-sm font-semibold">File Formal Support Ticket</h4>
              <button
                type="button"
                onClick={() => setShowCreateTicketModal(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTicketSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="text-neutral-400 block mb-1">Subject</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dual-Signatory Escalation for $250k Wire"
                  value={newTicketSubject}
                  onChange={(e) => setNewTicketSubject(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border ${
                    isLight
                      ? 'border-slate-300 bg-white text-slate-900'
                      : 'border-neutral-800 bg-neutral-950 text-neutral-100'
                  }`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-400 block mb-1">Category</label>
                  <select
                    value={newTicketCategory}
                    onChange={(e) => setNewTicketCategory(e.target.value as SupportTicket['category'])}
                    className={`w-full p-2.5 rounded-xl border ${
                      isLight
                        ? 'border-slate-300 bg-white text-slate-900'
                        : 'border-neutral-800 bg-neutral-950 text-neutral-100'
                    }`}
                  >
                    <option value="Wire Clearance">Wire Clearance</option>
                    <option value="Limit Increase">Limit Increase</option>
                    <option value="Card Services">Card Services</option>
                    <option value="Tax & Statements">Tax & Statements</option>
                    <option value="Custody & Escrow">Custody & Escrow</option>
                  </select>
                </div>
                <div>
                  <label className="text-neutral-400 block mb-1">Priority</label>
                  <select
                    value={newTicketPriority}
                    onChange={(e) => setNewTicketPriority(e.target.value as TicketPriority)}
                    className={`w-full p-2.5 rounded-xl border ${
                      isLight
                        ? 'border-slate-300 bg-white text-slate-900'
                        : 'border-neutral-800 bg-neutral-950 text-neutral-100'
                    }`}
                  >
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">Details & Verification References</label>
                <textarea
                  required
                  rows={3}
                  value={newTicketDesc}
                  onChange={(e) => setNewTicketDesc(e.target.value)}
                  placeholder="Provide transaction IDs or specific execution criteria..."
                  className={`w-full p-2.5 rounded-xl border resize-none font-sans ${
                    isLight
                      ? 'border-slate-300 bg-white text-slate-900'
                      : 'border-neutral-800 bg-neutral-950 text-neutral-100'
                  }`}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateTicketModal(false)}
                  className="px-3 py-1.5 rounded-xl text-neutral-400 hover:bg-neutral-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-emerald-500 text-neutral-950 font-semibold hover:bg-emerald-400 cursor-pointer"
                >
                  File Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
