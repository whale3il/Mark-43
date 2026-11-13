import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Send,
  Search,
  ShieldCheck,
  Paperclip,
  CheckCheck,
  FileText,
  Phone,
  Video,
  Mic,
  Headphones,
  Info,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Users,
  Tag,
  Building2,
  ArrowUpRight,
  Sparkles,
  ArrowLeft,
  ChevronRight
} from 'lucide-react';
import {
  SupportAgent,
  SupportConversation,
  SupportMessage,
  SupportTicket,
  StaffAvailability,
  CannedResponse,
  CustomerProfile,
  TicketStatus
} from '../../types/support';
import { ablyService } from '../../services/ablyService';
import { SupportService } from '../../services/supportService';
import { CannedResponsesMenu } from './CannedResponsesMenu';
import { AiAssistantPanel } from './AiAssistantPanel';
import { AiChatWorkspace } from './AiChatWorkspace';
import { CustomerInfoDrawer } from './CustomerInfoDrawer';

interface StaffWorkspaceViewProps {
  staffList: SupportAgent[];
  conversations: SupportConversation[];
  tickets: SupportTicket[];
  customers: Record<string, CustomerProfile>;
  cannedResponses: CannedResponse[];
  onUpdateConversation: (updatedConv: SupportConversation) => void;
  onUpdateStaffAvailability: (staffId: string, status: StaffAvailability) => void;
  onUpdateTicketStatus?: (ticketId: string, status: TicketStatus) => void;
  onTransferConversation: (conversationId: string, targetStaffId: string, note?: string) => void;
  theme?: 'dark' | 'light';
}

export const StaffWorkspaceView: React.FC<StaffWorkspaceViewProps> = ({
  staffList,
  conversations,
  tickets,
  customers,
  cannedResponses,
  onUpdateConversation,
  onUpdateStaffAvailability,
  onUpdateTicketStatus,
  onTransferConversation,
  theme = 'dark'
}) => {
  const isLight = theme === 'light';

  // Staff Section Navigation Tabs (with icons)
  const [staffSectionTab, setStaffSectionTab] = useState<'desk' | 'ai-chat' | 'tickets' | 'customers'>('desk');

  // Staff Inner Sidebar: expanded by default, manual collapse/expand toggle (no hover)
  const [isInnerSidebarCollapsed, setIsInnerSidebarCollapsed] = useState<boolean>(false);
  const [innerQueueView, setInnerQueueView] = useState<'all' | 'conversations' | 'tickets'>('all');
  // Mobile pane prioritization: active customer conversation first, smooth toggle to Desk Queue
  const [mobilePane, setMobilePane] = useState<'chat' | 'list'>('chat');

  // Current authenticated staff member (selectable across all 5 desks)
  const [activeStaffId, setActiveStaffId] = useState<string>(staffList[0]?.id || 'agent-1');
  const currentStaff = staffList.find((s) => s.id === activeStaffId) || staffList[0];

  // Scoped operational data: Staff sees ONLY their assigned customers, conversations, and tickets
  const assignedConversations = conversations.filter((c) => c.agent.id === currentStaff?.id);
  const assignedTickets = tickets.filter(
    (t) =>
      t.assignedAgentId === currentStaff?.id ||
      t.assignedAgent === currentStaff?.name ||
      assignedConversations.some((c) => c.linkedTicketId === t.id)
  );

  // Derive unique customers currently being attended to by this staff member
  const allCustomerProfiles = Object.values(customers);
  const attendingCustomerIds = Array.from(
    new Set([
      ...assignedConversations.map((c) => c.customerId),
      ...allCustomerProfiles.filter((c) => c.assignedStaffId === currentStaff?.id).map((c) => c.id)
    ])
  );

  const attendingCustomers = attendingCustomerIds.map((custId) => {
    const profile = allCustomerProfiles.find((p) => p.id === custId);
    const custConvs = assignedConversations.filter((c) => c.customerId === custId);
    const custTickets = assignedTickets.filter((t) => t.customerId === custId);
    return {
      id: custId,
      name: profile?.name || custConvs[0]?.customerName || 'Private Client',
      tier: profile?.clientTier || custConvs[0]?.customerTier || 'Private Client',
      profile,
      conversations: custConvs,
      tickets: custTickets,
      primaryConversationId: custConvs[0]?.id
    };
  });

  const [selectedConversationId, setSelectedConversationId] = useState<string>(
    assignedConversations[0]?.id || ''
  );

  // Sync selected conversation when switching staff desk
  useEffect(() => {
    if (assignedConversations.length > 0) {
      if (!assignedConversations.some((c) => c.id === selectedConversationId)) {
        setSelectedConversationId(assignedConversations[0].id);
      }
    } else {
      setSelectedConversationId('');
    }
  }, [activeStaffId, assignedConversations, selectedConversationId]);

  const activeConversation =
    assignedConversations.find((c) => c.id === selectedConversationId) || assignedConversations[0];

  // Match active customer dossier & linked ticket
  const activeCustomerProfile = activeConversation
    ? allCustomerProfiles.find((c) => c.id === activeConversation.customerId)
    : undefined;

  const activeLinkedTicket = activeConversation?.linkedTicketId
    ? tickets.find((t) => t.id === activeConversation.linkedTicketId)
    : assignedTickets.find((t) => t.conversationId === activeConversation?.id);

  // Search & Status Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'active' | 'pending' | 'resolved'>('All');

  // Slide-out Dossier Drawer State
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Composer State
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showCannedMenu, setShowCannedMenu] = useState(false);
  const [cannedQuery, setCannedQuery] = useState('');

  // Audio / Call modal & voice note state
  const [showCallModal, setShowCallModal] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  // Customer typing indicator via Ably
  const [isCustomerTyping, setIsCustomerTyping] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, []);

  // Auto-scroll messages feed only
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [activeConversation?.messages?.length, isCustomerTyping]);

  // Subscribe to Ably Realtime for active conversation
  useEffect(() => {
    if (!activeConversation || !currentStaff) return;

    const leavePresence = ablyService.enterPresence(activeConversation.id, {
      clientId: currentStaff.id,
      data: {
        name: currentStaff.name,
        role: 'agent',
        status: currentStaff.status
      }
    });

    const unsubMessages = ablyService.subscribeToMessages(activeConversation.id, (newMsg) => {
      if (!activeConversation.messages.some((m) => m.id === newMsg.id)) {
        const updated: SupportConversation = {
          ...activeConversation,
          messages: [...activeConversation.messages, newMsg],
          lastMessage: newMsg.text,
          lastMessageTimestamp: newMsg.timestamp
        };
        onUpdateConversation(updated);
      }
    });

    const unsubTyping = ablyService.subscribeToTyping(activeConversation.id, (userId, typing) => {
      if (userId !== currentStaff.id) {
        setIsCustomerTyping(typing);
      }
    });

    return () => {
      leavePresence();
      unsubMessages();
      unsubTyping();
    };
  }, [activeConversation?.id, currentStaff?.id]);

  // Select a conversation & clear unread count
  const handleSelectConversation = (convId: string) => {
    setSelectedConversationId(convId);
    setStaffSectionTab('desk');
    setMobilePane('chat');
    const target = assignedConversations.find((c) => c.id === convId);
    if (target && target.unreadCount > 0) {
      onUpdateConversation({ ...target, unreadCount: 0 });
      SupportService.updateConversation(convId, { unreadCount: 0 });
    }
  };

  // Select a ticket and load its conversation & details
  const handleSelectTicket = (ticket: SupportTicket) => {
    const matchedConv =
      assignedConversations.find((c) => c.id === ticket.conversationId) ||
      assignedConversations.find((c) => c.linkedTicketId === ticket.id) ||
      assignedConversations.find((c) => c.customerId === ticket.customerId);

    if (matchedConv) {
      handleSelectConversation(matchedConv.id);
      setDrawerOpen(true);
    }
  };

  // Handle composer input & "/" detection
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputText(val);

    if (activeConversation && currentStaff) {
      if (!isTyping && val.length > 0) {
        setIsTyping(true);
        ablyService.setTyping(activeConversation.id, currentStaff.id, true, currentStaff.name);
      } else if (isTyping && val.length === 0) {
        setIsTyping(false);
        ablyService.setTyping(activeConversation.id, currentStaff.id, false, currentStaff.name);
      }
    }

    const lastWord = val.split(' ').pop() || '';
    if (lastWord.startsWith('/')) {
      setShowCannedMenu(true);
      setCannedQuery(lastWord);
    } else {
      setShowCannedMenu(false);
    }
  };

  const handleSelectCannedResponse = (content: string) => {
    const words = inputText.split(' ');
    words.pop();
    const newText = words.length > 0 ? `${words.join(' ')} ${content}` : content;
    setInputText(newText);
    setShowCannedMenu(false);
  };

  // Send message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !activeConversation || !currentStaff) return;

    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newMsg: SupportMessage = {
      id: `m-${Date.now()}`,
      conversationId: activeConversation.id,
      sender: 'agent',
      agentId: currentStaff.id,
      agentName: currentStaff.name,
      text: inputText.trim(),
      timestamp: timeNow,
      status: 'delivered'
    };

    setInputText('');
    setShowCannedMenu(false);

    if (isTyping) {
      setIsTyping(false);
      ablyService.setTyping(activeConversation.id, currentStaff.id, false, currentStaff.name);
    }

    const updated: SupportConversation = {
      ...activeConversation,
      messages: [...activeConversation.messages, newMsg],
      lastMessage: newMsg.text,
      lastMessageTimestamp: timeNow,
      unreadCount: 0
    };

    onUpdateConversation(updated);
    await SupportService.sendMessage(activeConversation.id, newMsg);
    ablyService.publishMessage(activeConversation.id, newMsg);
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

      if (recordingSeconds >= 1 && activeConversation && currentStaff) {
        const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const voiceMsg: SupportMessage = {
          id: `m-voice-${Date.now()}`,
          conversationId: activeConversation.id,
          sender: 'agent',
          agentId: currentStaff.id,
          agentName: currentStaff.name,
          text: `Voice dispatch (${recordingSeconds}s)`,
          timestamp: timeNow,
          status: 'delivered',
          voiceNote: {
            durationSeconds: recordingSeconds,
            waveform: [35, 60, 45, 90, 75, 40, 85, 95, 65, 40, 70, 50, 80, 60, 30]
          }
        };

        await SupportService.sendMessage(activeConversation.id, voiceMsg);
        ablyService.publishMessage(activeConversation.id, voiceMsg);
        onUpdateConversation({
          ...activeConversation,
          messages: [...activeConversation.messages, voiceMsg],
          lastMessage: `Voice note (${recordingSeconds}s)`,
          lastMessageTimestamp: timeNow
        });
      }
    }
  };

  // Filtered operational lists
  const q = searchQuery.trim().toLowerCase();
  const filteredConversations = assignedConversations.filter((c) => {
    const matchesSearch =
      !q ||
      c.customerName.toLowerCase().includes(q) ||
      c.subject.toLowerCase().includes(q) ||
      c.lastMessage.toLowerCase().includes(q) ||
      (c.linkedTicketId && c.linkedTicketId.toLowerCase().includes(q));

    const matchesStatus = statusFilter === 'All' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredTickets = assignedTickets.filter((t) => {
    const matchesSearch =
      !q ||
      t.id.toLowerCase().includes(q) ||
      t.subject.toLowerCase().includes(q) ||
      (t.customerName && t.customerName.toLowerCase().includes(q));
    return matchesSearch;
  });

  const filteredAttendingCustomers = attendingCustomers.filter(
    (cust) =>
      !q ||
      cust.name.toLowerCase().includes(q) ||
      cust.tier.toLowerCase().includes(q)
  );

  // Workload statistics
  const activeCount = assignedConversations.filter((c) => c.status === 'active').length;
  const pendingCount = assignedConversations.filter((c) => c.status === 'pending').length;
  const resolvedCount = assignedConversations.filter((c) => c.status === 'resolved').length;

  if (!currentStaff) {
    return (
      <div className="p-8 text-center text-xs text-neutral-400">
        No staff desk profiles available.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 space-y-1.5 sm:space-y-2 w-full animate-in fade-in duration-200">
      {/* Compact Top Operational Command Bar */}
      <div
        className={`px-2.5 sm:px-3.5 py-2 rounded-xl border shadow-sm space-y-1.5 sm:space-y-2 shrink-0 ${
          isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-neutral-900 border-neutral-800 text-neutral-100'
        }`}
      >
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-2">
          {/* Staff Identity Selector */}
          <div className="flex items-center gap-2 w-full xl:w-auto min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 font-bold flex items-center justify-center text-xs shrink-0">
              {currentStaff.initials}
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
              <span className="text-xs sm:text-sm font-bold tracking-tight truncate">{currentStaff.name}</span>
              <span className="hidden sm:inline-block text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shrink-0">
                {currentStaff.department}
              </span>
              <select
                value={activeStaffId}
                onChange={(e) => setActiveStaffId(e.target.value)}
                aria-label="Active staff desk"
                className={`text-[11px] sm:text-xs py-1 px-2 rounded-lg border font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 max-w-[165px] sm:max-w-xs truncate ml-auto xl:ml-0 ${
                  isLight
                    ? 'bg-slate-50 border-slate-300 text-slate-800'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-200'
                }`}
              >
                {staffList.map((st) => (
                  <option key={st.id} value={st.id}>
                    Desk: {st.name} ({st.department})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Workload Stats & Availability Toggle */}
          <div className="flex items-center gap-2 w-full xl:w-auto justify-start xl:justify-end overflow-x-auto whitespace-nowrap pb-0.5 xl:pb-0">
            {/* Compact Workload Metrics */}
            <div
              className={`flex items-center gap-2 text-[10px] sm:text-[11px] font-mono px-2 sm:px-2.5 py-1 rounded-lg border shrink-0 ${
                isLight ? 'border-slate-200 bg-slate-50' : 'border-neutral-800 bg-neutral-950/50'
              }`}
            >
              <span className="text-neutral-500">
                Clients <strong className="text-emerald-500">{attendingCustomers.length}</strong>
              </span>
              <span className="text-neutral-600">·</span>
              <span className="text-neutral-500">
                Active <strong className="text-emerald-400">{activeCount}</strong>
              </span>
              <span className="text-neutral-600">·</span>
              <span className="text-neutral-500">
                Pending <strong className="text-amber-400">{pendingCount}</strong>
              </span>
              <span className="hidden sm:inline text-neutral-600">·</span>
              <span className="hidden sm:inline text-neutral-500">
                Resolved <strong className="text-sky-400">{resolvedCount}</strong>
              </span>
              <span className="hidden md:inline text-neutral-600">·</span>
              <span className="hidden md:inline text-neutral-500">
                SLA <strong className={isLight ? 'text-slate-700' : 'text-neutral-300'}>{currentStaff.responseTime}</strong>
              </span>
            </div>

            {/* Availability Status Selector */}
            <div className="flex items-center gap-1 shrink-0">
              {(['online', 'busy', 'away', 'offline'] as const).map((status) => {
                const isSelected = currentStaff.status === status;
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => onUpdateStaffAvailability(currentStaff.id, status)}
                    className={`px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-semibold capitalize transition-all cursor-pointer ${
                      isSelected
                        ? status === 'online'
                          ? 'bg-emerald-500 text-neutral-950 shadow-sm'
                          : status === 'busy'
                          ? 'bg-amber-500 text-neutral-950'
                          : status === 'away'
                          ? 'bg-sky-500 text-neutral-950'
                          : 'bg-neutral-700 text-neutral-200'
                        : isLight
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                        : 'bg-neutral-800/60 hover:bg-neutral-800 text-neutral-400'
                    }`}
                  >
                    {status}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Staff Section Navigation Items with Icons */}
        <div
          className={`pt-1.5 sm:pt-2 border-t flex items-center justify-between gap-2 ${
            isLight ? 'border-slate-200' : 'border-neutral-800/80'
          }`}
        >
          <div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap w-full sm:w-auto pb-0.5 sm:pb-0 text-[11px] sm:text-xs">
            {(
              [
                {
                  id: 'desk',
                  label: `Live Desk Queue (${assignedConversations.length})`,
                  icon: MessageSquare
                },
                {
                  id: 'ai-chat',
                  label: 'AI Copilot Room',
                  icon: Sparkles
                },
                {
                  id: 'tickets',
                  label: `Assigned Tickets (${assignedTickets.length})`,
                  icon: FileText
                },
                {
                  id: 'customers',
                  label: `Attending Customers (${attendingCustomers.length})`,
                  icon: Users
                }
              ] as const
            ).map((nav) => {
              const Icon = nav.icon;
              const isSelected = staffSectionTab === nav.id;
              return (
                <button
                  key={nav.id}
                  type="button"
                  onClick={() => setStaffSectionTab(nav.id)}
                  className={`px-2.5 py-1 rounded-lg font-medium flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                    isSelected
                      ? nav.id === 'ai-chat'
                        ? 'bg-amber-500 text-neutral-950 font-semibold shadow-sm'
                        : 'bg-emerald-500 text-neutral-950 font-semibold shadow-sm'
                      : isLight
                      ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                      : 'bg-neutral-950/60 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100 border border-neutral-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{nav.label}</span>
                </button>
              );
            })}
          </div>

          <div className="text-[11px] font-mono text-neutral-500 hidden md:block shrink-0">
            Scoped Identity: <span className="text-emerald-500">{currentStaff.id}</span>
          </div>
        </div>
      </div>

      {/* SECTION 1: FULL-HEIGHT FLEXIBLE TWO-PANEL STAFF DESK */}
      {staffSectionTab === 'desk' && (
        <div
          className={`flex-1 min-h-0 rounded-2xl border shadow-xl overflow-hidden flex flex-col lg:flex-row ${
            isLight ? 'bg-white border-slate-200' : 'bg-neutral-900 border-neutral-800'
          }`}
        >
          {/* Staff Inner Sidebar (Expanded by default, Manual Collapse/Expand Toggle on desktop; dedicated pane on mobile) */}
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
                    Desk Operational Queue
                  </div>
                  <div className="text-[10px] font-mono text-neutral-500 truncate">
                    {attendingCustomers.length} attending · {assignedTickets.length} tickets
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
                title={isInnerSidebarCollapsed ? 'Expand Operational Sidebar' : 'Collapse Operational Sidebar'}
                aria-label={isInnerSidebarCollapsed ? 'Expand Operational Sidebar' : 'Collapse Operational Sidebar'}
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
              /* COLLAPSED STAFF INNER SIDEBAR (Avatars & Ticket Badge Only) */
              <div className="flex-1 min-h-0 overflow-y-auto py-3 px-2 flex lg:flex-col items-center gap-2.5 overflow-x-auto lg:overflow-x-hidden">
                {assignedConversations.map((conv) => {
                  const isSelected = conv.id === activeConversation?.id;
                  return (
                    <button
                      key={conv.id}
                      type="button"
                      onClick={() => handleSelectConversation(conv.id)}
                      title={`${conv.customerName} — ${conv.subject} (${conv.status})`}
                      className={`relative w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400 shadow-sm'
                          : isLight
                          ? 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                          : 'border-neutral-800 bg-neutral-900 text-neutral-300 hover:bg-neutral-800'
                      }`}
                    >
                      {conv.customerName.slice(0, 2).toUpperCase()}
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 ${
                          isLight ? 'border-white' : 'border-neutral-950'
                        } ${
                          conv.status === 'active'
                            ? 'bg-emerald-500'
                            : conv.status === 'pending'
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
                  onClick={() => setStaffSectionTab('tickets')}
                  title={`Assigned Tickets (${assignedTickets.length})`}
                  className={`relative w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-colors cursor-pointer ${
                    isLight
                      ? 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                      : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  {assignedTickets.length > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] px-0.5 rounded-full bg-amber-500 text-neutral-950 text-[9px] font-mono font-bold flex items-center justify-center">
                      {assignedTickets.length}
                    </span>
                  )}
                </button>
              </div>
            ) : (
              /* EXPANDED STAFF INNER SIDEBAR */
              <>
                {/* Search, Queue View Switcher & Status Pills */}
                <div
                  className={`p-3 border-b space-y-2.5 shrink-0 ${
                    isLight ? 'border-slate-200' : 'border-neutral-800/70'
                  }`}
                >
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input
                      type="text"
                      placeholder="Search clients, tickets, topics..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                        isLight
                          ? 'bg-white border-slate-200 text-slate-900'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-100'
                      }`}
                    />
                  </div>

                  {/* Operational Queue Mode */}
                  <div className="grid grid-cols-3 gap-1 text-[11px]">
                    {(
                      [
                        { id: 'all', label: 'All Ops' },
                        { id: 'conversations', label: `Chats (${filteredConversations.length})` },
                        { id: 'tickets', label: `Tickets (${filteredTickets.length})` }
                      ] as const
                    ).map((mode) => (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => setInnerQueueView(mode.id)}
                        className={`py-1 px-2 rounded-lg font-medium transition-colors cursor-pointer truncate ${
                          innerQueueView === mode.id
                            ? 'bg-emerald-500 text-neutral-950 font-bold'
                            : isLight
                            ? 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                            : 'bg-neutral-900 text-neutral-400 hover:bg-neutral-800'
                        }`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>

                  {/* Conversation Status Pills */}
                  {innerQueueView !== 'tickets' && (
                    <div className="flex items-center gap-1 overflow-x-auto text-[11px]">
                      {(['All', 'active', 'pending', 'resolved'] as const).map((tab) => (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => setStatusFilter(tab)}
                          className={`px-2.5 py-0.5 rounded-lg font-medium capitalize transition-colors cursor-pointer ${
                            statusFilter === tab
                              ? isLight
                                ? 'bg-slate-900 text-white font-semibold'
                                : 'bg-neutral-100 text-neutral-950 font-semibold'
                              : isLight
                              ? 'text-slate-600 hover:bg-slate-200'
                              : 'text-neutral-400 hover:bg-neutral-800'
                          }`}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Unified Independently Scrollable Operational List */}
                <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-neutral-800/30">
                  {/* Operational Group 1: Customers Currently Attended To */}
                  {innerQueueView === 'all' && filteredAttendingCustomers.length > 0 && (
                    <div className="p-2.5 space-y-1.5">
                      <div className="px-1 py-0.5 flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-neutral-500">
                        <span>Currently Attending</span>
                        <span>{filteredAttendingCustomers.length} Clients</span>
                      </div>

                      <div className="space-y-1.5">
                        {filteredAttendingCustomers.map((cust) => {
                          const isSelected = activeConversation?.customerId === cust.id;
                          return (
                            <div
                              key={cust.id}
                              onClick={() => {
                                if (cust.primaryConversationId) {
                                  handleSelectConversation(cust.primaryConversationId);
                                }
                              }}
                              className={`p-2 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-2 ${
                                isSelected
                                  ? 'border-emerald-500/70 bg-emerald-500/10'
                                  : isLight
                                  ? 'border-slate-200 bg-white hover:bg-slate-50'
                                  : 'border-neutral-800/70 bg-neutral-900/50 hover:bg-neutral-800/40'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-500 font-bold flex items-center justify-center text-[11px] shrink-0">
                                  {cust.name.slice(0, 2).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <div
                                    className={`text-xs font-semibold truncate ${
                                      isLight ? 'text-slate-900' : 'text-neutral-100'
                                    }`}
                                  >
                                    {cust.name}
                                  </div>
                                  <div className="text-[10px] text-neutral-400 truncate">{cust.tier}</div>
                                </div>
                              </div>
                              <div className="text-right shrink-0 text-[10px] font-mono">
                                <span className="text-emerald-500 block">
                                  {cust.conversations.length} chat{cust.conversations.length === 1 ? '' : 's'}
                                </span>
                                <span className="text-neutral-500">
                                  {cust.tickets.length} tkt{cust.tickets.length === 1 ? '' : 's'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Operational Group 2: Assigned Conversations */}
                  {(innerQueueView === 'all' || innerQueueView === 'conversations') && (
                    <div className="p-2.5 space-y-1.5">
                      <div className="px-1 py-0.5 flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-neutral-500">
                        <span>Assigned Conversations</span>
                        <span>{filteredConversations.length}</span>
                      </div>

                      {filteredConversations.length === 0 ? (
                        <div className="p-6 text-center text-xs text-neutral-400 space-y-1.5">
                          <MessageSquare className="w-7 h-7 mx-auto opacity-30 text-emerald-500" />
                          <p>No conversations match this filter.</p>
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
                                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-500 font-bold flex items-center justify-center text-[10px] shrink-0">
                                    {conv.customerName.slice(0, 2).toUpperCase()}
                                  </div>
                                  <span
                                    className={`text-xs font-semibold truncate ${
                                      isLight ? 'text-slate-900' : 'text-neutral-100'
                                    }`}
                                  >
                                    {conv.customerName}
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
                                    className={`px-1.5 py-0.5 rounded capitalize ${
                                      conv.status === 'active'
                                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                        : conv.status === 'pending'
                                        ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                        : 'bg-sky-500/10 text-sky-500 border border-sky-500/20'
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
                                    {conv.unreadCount} new
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {/* Operational Group 3: Active Tickets & Statuses */}
                  {(innerQueueView === 'all' || innerQueueView === 'tickets') && (
                    <div className="p-2.5 space-y-1.5">
                      <div className="px-1 py-0.5 flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-neutral-500">
                        <span>Active Tickets & Statuses</span>
                        <span>{filteredTickets.length}</span>
                      </div>

                      {filteredTickets.length === 0 ? (
                        <div className="p-4 text-center text-xs text-neutral-500">No tickets assigned.</div>
                      ) : (
                        filteredTickets.map((tkt) => (
                          <div
                            key={tkt.id}
                            onClick={() => handleSelectTicket(tkt)}
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
                              <span className="truncate">{tkt.customerName || 'Client'}</span>
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
                        ))
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Right Panel: Active Conversation */}
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
                      title="Back to Desk Queue"
                      aria-label="Back to Desk Queue"
                      className={`lg:hidden p-1.5 rounded-lg border flex items-center gap-1 text-[11px] font-semibold shrink-0 cursor-pointer ${
                        isLight
                          ? 'bg-white border-slate-200 text-slate-700'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-200'
                      }`}
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Queue</span>
                    </button>

                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-500/20 text-emerald-500 font-bold flex items-center justify-center text-xs border border-emerald-500/30 shrink-0">
                      {activeConversation.customerName.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <span
                          className={`text-xs sm:text-sm font-semibold truncate ${
                            isLight ? 'text-slate-900' : 'text-neutral-100'
                          }`}
                        >
                          {activeConversation.customerName}
                        </span>
                        <span
                          className={`hidden sm:inline-block text-[10px] font-mono px-1.5 py-0.2 rounded ${
                            isLight ? 'bg-slate-200 text-slate-700' : 'bg-neutral-800 text-neutral-300'
                          }`}
                        >
                          {activeConversation.customerTier}
                        </span>
                        {activeLinkedTicket && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-400 border border-amber-500/25 truncate max-w-[120px] sm:max-w-none">
                            {activeLinkedTicket.id} · {activeLinkedTicket.status}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] sm:text-[11px] text-emerald-500 truncate max-w-[190px] sm:max-w-lg">
                        {activeConversation.subject}
                      </div>
                    </div>
                  </div>

                  {/* Header Actions */}
                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowCallModal(true)}
                      className={`hidden sm:inline-flex p-2 rounded-xl border text-neutral-400 hover:text-emerald-500 transition-colors cursor-pointer ${
                        isLight ? 'border-slate-200 hover:bg-slate-100' : 'border-neutral-800 hover:bg-neutral-800'
                      }`}
                      title="Encrypted Voice Bridge"
                    >
                      <Phone className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCallModal(true)}
                      className={`hidden sm:inline-flex p-2 rounded-xl border text-neutral-400 hover:text-emerald-500 transition-colors cursor-pointer ${
                        isLight ? 'border-slate-200 hover:bg-slate-100' : 'border-neutral-800 hover:bg-neutral-800'
                      }`}
                      title="Video Consultation"
                    >
                      <Video className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDrawerOpen(true)}
                      className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                        isLight
                          ? 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                          : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
                      }`}
                    >
                      <Info className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span className="sm:hidden">Dossier</span>
                      <span className="hidden sm:inline">Dossier & Controls</span>
                    </button>
                  </div>
                </div>

                {/* Independently Scrollable Messages Feed */}
                <div className="flex-1 min-h-0 p-3 sm:p-5 overflow-y-auto space-y-3.5 sm:space-y-4">
                  {activeConversation.messages.map((msg) => {
                    const isAgent = msg.sender === 'agent';
                    const isSystem = msg.sender === 'system';

                    if (isSystem) {
                      return (
                        <div key={msg.id} className="flex justify-center my-2">
                          <div
                            className={`text-[11px] px-3 py-1 rounded-full border font-mono text-center max-w-md ${
                              isLight
                                ? 'bg-slate-100 border-slate-200 text-slate-600'
                                : 'bg-neutral-800/70 border-neutral-700/50 text-neutral-400'
                            }`}
                          >
                            {msg.text}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={msg.id} className={`flex flex-col ${isAgent ? 'items-end' : 'items-start'}`}>
                        <div className="flex items-center gap-1.5 mb-1 text-[10px] text-neutral-400 font-mono">
                          <span>{isAgent ? currentStaff.name : activeConversation.customerName}</span>
                          <span>·</span>
                          <span>{msg.timestamp}</span>
                        </div>

                        <div
                          className={`max-w-[88%] sm:max-w-[78%] rounded-2xl p-2.5 sm:p-3 text-xs leading-relaxed shadow-sm break-words ${
                            isAgent
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
                            <div className="mt-2 p-2 rounded-xl bg-black/15 flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-black/20 flex items-center justify-center">
                                <Mic className="w-3.5 h-3.5" />
                              </div>
                              <div className="flex-1">
                                <div className="h-1.5 bg-black/20 rounded-full overflow-hidden">
                                  <div className="h-full bg-emerald-300 w-2/3 rounded-full" />
                                </div>
                              </div>
                              <span className="font-mono text-[10px]">{msg.voiceNote.durationSeconds}s</span>
                            </div>
                          )}
                        </div>

                        {isAgent && (
                          <div className="flex items-center gap-1 mt-0.5 text-[10px] text-neutral-500 font-mono">
                            <CheckCheck className="w-3 h-3 text-emerald-500" />
                            <span>{msg.status}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {isCustomerTyping && (
                    <div className="flex items-center gap-2 text-xs text-neutral-400 italic">
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" />
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce delay-100" />
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce delay-200" />
                      </div>
                      <span>{activeConversation.customerName} is typing...</span>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Message Composer Footer */}
                <div
                  className={`p-2 sm:p-2.5 px-2.5 sm:px-3.5 border-t relative shrink-0 ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-neutral-950/80 border-neutral-800'
                  }`}
                >
                  {showCannedMenu && (
                    <CannedResponsesMenu
                      filterQuery={cannedQuery}
                      templates={cannedResponses}
                      onSelect={handleSelectCannedResponse}
                      onClose={() => setShowCannedMenu(false)}
                      theme={theme}
                    />
                  )}

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
                            : 'Type reply or "/" for canned responses...'
                        }
                        value={inputText}
                        onChange={handleInputChange}
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
                      <span className="font-mono truncate min-w-0">
                        Tip: Type <strong className="text-emerald-500">/greeting</strong> or{' '}
                        <strong className="text-emerald-500">/transfer</strong> for templates.
                      </span>

                      <AiAssistantPanel
                        conversation={activeConversation}
                        currentStaff={currentStaff}
                        currentDraft={inputText}
                        onInsertToDraft={(text) => setInputText(text)}
                        onOpenFullAiChat={() => setStaffSectionTab('ai-chat')}
                        theme={theme}
                      />
                    </div>
                  </form>
                </div>

                {/* Slide-out Customer Dossier Drawer */}
                <CustomerInfoDrawer
                  isOpen={drawerOpen}
                  onClose={() => setDrawerOpen(false)}
                  conversation={activeConversation}
                  customer={activeCustomerProfile}
                  linkedTicket={activeLinkedTicket}
                  staffList={staffList}
                  onUpdateStatus={(st) => {
                    onUpdateConversation({ ...activeConversation, status: st });
                    SupportService.updateConversation(activeConversation.id, { status: st });
                  }}
                  onUpdateTicketStatus={onUpdateTicketStatus}
                  onUpdateNotes={(notes) => {
                    onUpdateConversation({ ...activeConversation, internalNotes: notes });
                    SupportService.updateConversation(activeConversation.id, { internalNotes: notes });
                  }}
                  onTransferConversation={(targetId, note) => {
                    onTransferConversation(activeConversation.id, targetId, note);
                  }}
                  theme={theme}
                />
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-neutral-400 p-6 sm:p-8 space-y-3 text-center">
                <Headphones className="w-10 h-10 text-emerald-500/40" />
                <p className="text-sm font-medium">Select a client conversation from your queue</p>
                <p className="text-xs text-neutral-500">All customer communications are FIDO2 encrypted.</p>
                <button
                  type="button"
                  onClick={() => setMobilePane('list')}
                  className="lg:hidden px-4 py-2 rounded-xl bg-emerald-500 text-neutral-950 font-semibold text-xs cursor-pointer"
                >
                  Open Desk Queue
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 2: FULL-HEIGHT AI COPILOT CHAT ROOM */}
      {staffSectionTab === 'ai-chat' && (
        <AiChatWorkspace
          scope="staff"
          userId={currentStaff.id}
          userName={currentStaff.name}
          currentStaff={currentStaff}
          supportConversations={assignedConversations}
          initialLinkedSupportConversationId={activeConversation?.id}
          onInsertReply={(text, targetSupportConvId) => {
            setInputText(text);
            if (targetSupportConvId) {
              handleSelectConversation(targetSupportConvId);
            }
            setStaffSectionTab('desk');
          }}
          theme={theme}
        />
      )}

      {/* SECTION 3: ASSIGNED TICKETS OPERATIONAL VIEW */}
      {staffSectionTab === 'tickets' && (
        <div
          className={`flex-1 min-h-0 overflow-y-auto p-3.5 sm:p-6 rounded-2xl border space-y-4 ${
            isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-neutral-900/60 border-neutral-800 text-neutral-100'
          }`}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold tracking-tight">
                Assigned Operational Tickets — {currentStaff.name}
              </h3>
              <p className="text-xs text-neutral-400">
                Inspect ticket statuses, update escalation stages, or jump into the client chat thread
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Filter assigned tickets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-9 pr-3 py-1.5 rounded-xl border text-xs ${
                  isLight ? 'border-slate-300 bg-white text-slate-900' : 'border-neutral-800 bg-neutral-950 text-neutral-100'
                }`}
              />
            </div>
          </div>

          {/* Mobile Ticket Cards */}
          <div className="md:hidden space-y-2.5">
            {filteredTickets.length === 0 ? (
              <div className="p-6 text-center text-xs text-neutral-500">
                No assigned tickets match your search.
              </div>
            ) : (
              filteredTickets.map((tkt) => (
                <div
                  key={tkt.id}
                  className={`p-3.5 rounded-xl border space-y-2.5 ${
                    isLight ? 'border-slate-200 bg-slate-50/70' : 'border-neutral-800 bg-neutral-950/60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-emerald-500">{tkt.id}</span>
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
                  </div>
                  <div>
                    <div className="text-xs font-semibold">{tkt.subject}</div>
                    <div className="text-[11px] text-neutral-400 mt-0.5">{tkt.customerName || 'Private Client'}</div>
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-1">
                    {onUpdateTicketStatus ? (
                      <select
                        value={tkt.status}
                        onChange={(e) => onUpdateTicketStatus(tkt.id, e.target.value as TicketStatus)}
                        className={`px-2 py-1 rounded-lg border text-[11px] font-medium ${
                          isLight
                            ? 'bg-white border-slate-300 text-slate-800'
                            : 'bg-neutral-900 border-neutral-800 text-neutral-200'
                        }`}
                      >
                        <option value="Open">Open</option>
                        <option value="In Review">In Review</option>
                        <option value="Escalated">Escalated</option>
                        <option value="Resolved">Resolved</option>
                      </select>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 text-[10px]">
                        {tkt.status}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleSelectTicket(tkt)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-500 font-semibold text-xs inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>Open Thread</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

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
                  <th className="p-3">Client</th>
                  <th className="p-3">Subject & Scope</th>
                  <th className="p-3">Priority</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Workspace</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/30">
                {filteredTickets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-neutral-500">
                      No assigned tickets match your search.
                    </td>
                  </tr>
                ) : (
                  filteredTickets.map((tkt) => (
                    <tr
                      key={tkt.id}
                      className={`transition-colors ${isLight ? 'hover:bg-slate-50' : 'hover:bg-neutral-800/20'}`}
                    >
                      <td className="p-3 font-mono font-bold text-emerald-500">{tkt.id}</td>
                      <td className="p-3 font-medium">{tkt.customerName || 'Private Client'}</td>
                      <td className="p-3">
                        <div className="font-medium">{tkt.subject}</div>
                        <div className="text-[11px] text-neutral-400 line-clamp-1">{tkt.description}</div>
                      </td>
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
                        {onUpdateTicketStatus ? (
                          <select
                            value={tkt.status}
                            onChange={(e) => onUpdateTicketStatus(tkt.id, e.target.value as TicketStatus)}
                            className={`px-2 py-1 rounded-lg border text-[11px] font-medium ${
                              isLight
                                ? 'bg-white border-slate-300 text-slate-800'
                                : 'bg-neutral-950 border-neutral-800 text-neutral-200'
                            }`}
                          >
                            <option value="Open">Open</option>
                            <option value="In Review">In Review</option>
                            <option value="Escalated">Escalated</option>
                            <option value="Resolved">Resolved</option>
                          </select>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 text-[10px]">
                            {tkt.status}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleSelectTicket(tkt)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-500 font-semibold text-xs inline-flex items-center gap-1 cursor-pointer"
                        >
                          <span>Open Thread</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION 3: ATTENDING CUSTOMERS DIRECTORY */}
      {staffSectionTab === 'customers' && (
        <div
          className={`flex-1 min-h-0 overflow-y-auto p-3.5 sm:p-6 rounded-2xl border space-y-4 ${
            isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-neutral-900/60 border-neutral-800 text-neutral-100'
          }`}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold tracking-tight">
                Customers Currently Attended By {currentStaff.name}
              </h3>
              <p className="text-xs text-neutral-400">
                Select any client dossier to inspect portfolio metadata and load their active conversation
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Search attending clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-9 pr-3 py-1.5 rounded-xl border text-xs ${
                  isLight ? 'border-slate-300 bg-white text-slate-900' : 'border-neutral-800 bg-neutral-950 text-neutral-100'
                }`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAttendingCustomers.map((cust) => (
              <div
                key={cust.id}
                className={`p-5 rounded-2xl border flex flex-col justify-between space-y-4 ${
                  isLight
                    ? 'border-slate-200 bg-slate-50/70'
                    : 'border-neutral-800 bg-neutral-950/50'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 font-bold flex items-center justify-center text-xs shrink-0">
                        {cust.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate">{cust.name}</div>
                        <div className="text-[11px] font-mono text-emerald-500 truncate">{cust.tier}</div>
                      </div>
                    </div>
                  </div>

                  <div className="text-xs space-y-1 text-neutral-400 pt-2 border-t border-neutral-800/20">
                    <div className="flex items-center justify-between">
                      <span>KYC Status:</span>
                      <span className="text-emerald-500 font-medium">
                        {cust.profile?.kycLevel || 'Verified'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Jurisdiction:</span>
                      <span className={isLight ? 'text-slate-700' : 'text-neutral-200'}>
                        {cust.profile?.primaryJurisdiction || '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Assigned Chats / Tickets:</span>
                      <span className="font-mono font-semibold text-emerald-500">
                        {cust.conversations.length} / {cust.tickets.length}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!cust.primaryConversationId}
                  onClick={() => {
                    if (cust.primaryConversationId) {
                      handleSelectConversation(cust.primaryConversationId);
                    }
                  }}
                  className="w-full py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-neutral-950 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Open Client Workspace</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

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
    </div>
  );
};
