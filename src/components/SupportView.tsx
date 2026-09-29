import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Send,
  Phone,
  Mail,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Search,
  Plus,
  Paperclip,
  Check,
  CheckCheck,
  AlertCircle,
  FileText,
  UserCheck,
  Building,
  Sparkles,
  ChevronRight,
  Filter,
  Lock,
  Wifi,
  ExternalLink,
  X
} from 'lucide-react';
import {
  SupportAgent,
  SupportMessage,
  SupportConversation,
  SupportTicket,
  TicketPriority
} from '../types/support';
import {
  SUPPORT_AGENTS,
  INITIAL_CONVERSATIONS,
  INITIAL_TICKETS
} from '../data/supportMockData';

interface SupportViewProps {
  onUnreadChange?: (totalUnread: number) => void;
}

export const SupportView: React.FC<SupportViewProps> = ({ onUnreadChange }) => {
  // Navigation between Live Chat Desk and Tickets Register
  const [activeSubTab, setActiveSubTab] = useState<'chat' | 'tickets'>('chat');
  
  // Conversations State
  const [conversations, setConversations] = useState<SupportConversation[]>(INITIAL_CONVERSATIONS);
  const [selectedConversationId, setSelectedConversationId] = useState<string>(INITIAL_CONVERSATIONS[0].id);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Message input & agent typing
  const [inputText, setInputText] = useState('');
  const [isAgentTyping, setIsAgentTyping] = useState(false);
  const [socketConnected, setSocketConnected] = useState(true);
  
  // Tickets State
  const [tickets, setTickets] = useState<SupportTicket[]>(INITIAL_TICKETS);
  const [ticketFilter, setTicketFilter] = useState<'All' | 'In Review' | 'Resolved'>('All');
  const [showCreateTicketModal, setShowCreateTicketModal] = useState(false);
  
  // New ticket form
  const [newTicketSubject, setNewTicketSubject] = useState('');
  const [newTicketCategory, setNewTicketCategory] = useState<SupportTicket['category']>('Wire Clearance');
  const [newTicketPriority, setNewTicketPriority] = useState<TicketPriority>('High');
  const [newTicketDesc, setNewTicketDesc] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Active conversation
  const currentConversation = conversations.find(c => c.id === selectedConversationId) || conversations[0];

  // Auto scroll to latest message in current conversation
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentConversation?.messages, isAgentTyping]);

  // Synchronize unread count to parent
  useEffect(() => {
    const total = conversations.reduce((acc, c) => acc + c.unreadCount, 0);
    onUnreadChange?.(total);
  }, [conversations, onUnreadChange]);

  // Mark conversation as read on select
  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id);
    setConversations(prev =>
      prev.map(c => (c.id === id ? { ...c, unreadCount: 0 } : c))
    );
  };

  // Send message handler (structured for WebSockets/Socket.IO)
  const handleSendMessage = (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const textToSend = customText || inputText;
    if (!textToSend.trim()) return;

    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newMsg: SupportMessage = {
      id: `msg-${Date.now()}`,
      conversationId: currentConversation.id,
      sender: 'customer',
      text: textToSend,
      timestamp: timeNow,
      status: 'sent'
    };

    // Update conversation locally
    setConversations(prev =>
      prev.map(c => {
        if (c.id === currentConversation.id) {
          return {
            ...c,
            lastMessage: textToSend,
            lastMessageTimestamp: 'Just now',
            messages: [...c.messages, newMsg]
          };
        }
        return c;
      })
    );

    if (!customText) setInputText('');

    // Simulate immediate delivery ack
    setTimeout(() => {
      setConversations(prev =>
        prev.map(c => {
          if (c.id === currentConversation.id) {
            return {
              ...c,
              messages: c.messages.map(m => (m.id === newMsg.id ? { ...m, status: 'delivered' } : m))
            };
          }
          return c;
        })
      );
    }, 400);

    // =========================================================================
    // REAL-TIME WEBSOCKET EMIT HOOK:
    // In a live environment with Socket.IO or native WebSockets:
    // socket.emit('client:message', {
    //   conversationId: currentConversation.id,
    //   senderId: 'client-sovereign-01',
    //   content: textToSend,
    //   timestamp: new Date().toISOString(),
    // });
    // =========================================================================

    // Simulate realistic bank support response
    setIsAgentTyping(true);
    setTimeout(() => {
      setIsAgentTyping(false);
      const agentReplyText = getRealisticAgentReply(textToSend, currentConversation.agent.name);
      const agentMsg: SupportMessage = {
        id: `msg-agent-${Date.now()}`,
        conversationId: currentConversation.id,
        sender: 'agent',
        agentId: currentConversation.agent.id,
        text: agentReplyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'delivered'
      };

      setConversations(prev =>
        prev.map(c => {
          if (c.id === currentConversation.id) {
            return {
              ...c,
              lastMessage: agentReplyText,
              lastMessageTimestamp: 'Just now',
              messages: [...c.messages, agentMsg]
            };
          }
          return c;
        })
      );
    }, 1600);
  };

  // Helper response generator
  const getRealisticAgentReply = (userQuery: string, agentName: string) => {
    const q = userQuery.toLowerCase();
    if (q.includes('wire') || q.includes('fedwire') || q.includes('transfer')) {
      return `Understood. I have pulled up the wire clearance audit log on our terminal. The Federal Reserve IMAD clearing record has been prioritized and our settlement officer is monitoring delivery.`;
    }
    if (q.includes('limit') || q.includes('card') || q.includes('increase')) {
      return `I have reviewed your request. Based on your Sovereign tier collateral balance, I can authorize a temporary limit increase up to $250,000 immediately. Would you like this active for 48 hours or through the weekend?`;
    }
    if (q.includes('tax') || q.includes('statement') || q.includes('1099')) {
      return `I have generated your consolidated tax audit statement package. You can also view the certified cryptographic hash under your Statements tab.`;
    }
    return `Thank you for your instruction, Mr. Wright. I have logged your notes with our private desk at 540 Madison Ave. We are executing this immediately and will provide confirmed receipts shortly.`;
  };

  // Create Ticket handler
  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicketSubject) return;

    const newTicket: SupportTicket = {
      id: `TKT-${Math.floor(1000 + Math.random() * 9000)}-NY`,
      subject: newTicketSubject,
      category: newTicketCategory,
      priority: newTicketPriority,
      status: 'In Review',
      createdAt: 'Just now',
      updatedAt: 'Just now',
      assignedAgent: currentConversation.agent.name,
      description: newTicketDesc || 'Client formal inquiry logged through private banking portal.',
      conversationId: currentConversation.id
    };

    setTickets(prev => [newTicket, ...prev]);
    setShowCreateTicketModal(false);
    setNewTicketSubject('');
    setNewTicketDesc('');

    // Also add notice in chat
    const systemNotice: SupportMessage = {
      id: `sys-${Date.now()}`,
      conversationId: currentConversation.id,
      sender: 'system',
      text: `Formal compliance ticket #${newTicket.id} established: "${newTicket.subject}" assigned to ${newTicket.assignedAgent}.`,
      timestamp: 'Just now',
      status: 'read'
    };

    setConversations(prev =>
      prev.map(c => {
        if (c.id === currentConversation.id) {
          return {
            ...c,
            linkedTicketId: newTicket.id,
            messages: [...c.messages, systemNotice]
          };
        }
        return c;
      })
    );

    setActiveSubTab('tickets');
  };

  // Filter conversations
  const filteredConversations = conversations.filter(c =>
    c.agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter tickets
  const filteredTickets = tickets.filter(t => {
    if (ticketFilter === 'In Review') return t.status === 'In Review';
    if (ticketFilter === 'Resolved') return t.status === 'Resolved';
    return true;
  });

  const totalUnreadCount = conversations.reduce((acc, c) => acc + c.unreadCount, 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner & Mode Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-neutral-100 font-sans">
              Dedicated Customer Support & Private Desk
            </h1>
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Real-Time WebSocket Active</span>
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-0.5">
            24/7 dedicated private banking officers, clearing specialists, and compliance ticket resolution
          </p>
        </div>

        {/* Action Controls & Sub-Tab Switcher */}
        <div className="flex items-center gap-3">
          <div className="flex items-center p-1 rounded-xl bg-neutral-900 border border-neutral-800 text-xs">
            <button
              onClick={() => setActiveSubTab('chat')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-medium transition-colors ${
                activeSubTab === 'chat'
                  ? 'bg-neutral-800 text-neutral-100 shadow-sm font-semibold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
              <span>Live Chat Desk</span>
              {totalUnreadCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-emerald-500 text-neutral-950 font-bold">
                  {totalUnreadCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveSubTab('tickets')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-medium transition-colors ${
                activeSubTab === 'tickets'
                  ? 'bg-neutral-800 text-neutral-100 shadow-sm font-semibold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              <span>Support Tickets ({tickets.length})</span>
            </button>
          </div>

          <button
            onClick={() => setShowCreateTicketModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500 text-neutral-950 font-semibold text-xs hover:bg-emerald-400 transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Open Ticket</span>
          </button>
        </div>
      </div>

      {/* SUB-VIEW 1: LIVE CHAT DESK */}
      {activeSubTab === 'chat' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Conversation Directory & Channel List (4 cols) */}
          <div className="lg:col-span-4 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4 space-y-4 flex flex-col h-[680px]">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                type="text"
                placeholder="Search desks, agents, or topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-neutral-700"
              />
            </div>

            {/* Conversation Threads */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {filteredConversations.map((c) => {
                const isSelected = c.id === selectedConversationId;
                return (
                  <button
                    key={c.id}
                    onClick={() => handleSelectConversation(c.id)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-start gap-3 relative ${
                      isSelected
                        ? 'border-emerald-500/50 bg-neutral-850/90 ring-1 ring-emerald-500/20 shadow-sm'
                        : 'border-neutral-800/80 bg-neutral-950/60 hover:bg-neutral-850/50'
                    }`}
                  >
                    {/* Agent Avatar with online badge */}
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center font-bold text-xs text-neutral-200">
                        {c.agent.initials}
                      </div>
                      <span
                        className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-neutral-900 ${
                          c.agent.status === 'online'
                            ? 'bg-emerald-400'
                            : c.agent.status === 'busy'
                            ? 'bg-amber-400'
                            : 'bg-neutral-500'
                        }`}
                      />
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-semibold text-neutral-100 truncate">
                          {c.agent.name}
                        </span>
                        <span className="text-[10px] font-mono text-neutral-500 shrink-0">
                          {c.lastMessageTimestamp}
                        </span>
                      </div>

                      <div className="text-[11px] text-emerald-400/90 font-medium truncate">
                        {c.department}
                      </div>

                      <p className="text-[11px] text-neutral-400 truncate mt-1">
                        {c.lastMessage}
                      </p>
                    </div>

                    {/* Unread Indicator Badge */}
                    {c.unreadCount > 0 && (
                      <span className="shrink-0 w-4 h-4 rounded-full bg-emerald-500 text-neutral-950 text-[10px] font-bold flex items-center justify-center shadow-sm">
                        {c.unreadCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Sovereign Desk Guarantee Footnote */}
            <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-850 flex items-center gap-2 text-[11px] text-neutral-400">
              <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Federal Reserve & FINRA compliant encrypted audit logging.</span>
            </div>
          </div>

          {/* Right Column: Live Chat Interface (8 cols) */}
          <div className="lg:col-span-8 rounded-2xl border border-neutral-800 bg-neutral-900/50 flex flex-col h-[680px] overflow-hidden">
            {/* Chat Top Header with Agent Profile & Availability */}
            <div className="p-4 border-b border-neutral-800 flex items-center justify-between gap-4 bg-neutral-900/80">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-11 h-11 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center font-bold text-sm text-neutral-200">
                    {currentConversation.agent.initials}
                  </div>
                  <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-neutral-900" />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-neutral-100">
                      {currentConversation.agent.name}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                      Available · Response {currentConversation.agent.responseTime}
                    </span>
                  </div>

                  <div className="text-xs text-neutral-400 flex items-center gap-2 mt-0.5">
                    <span>{currentConversation.agent.role}</span>
                    <span>·</span>
                    <span className="text-neutral-500">{currentConversation.agent.license}</span>
                  </div>
                </div>
              </div>

              {/* Direct Coordinate Actions */}
              <div className="flex items-center gap-2">
                {currentConversation.linkedTicketId && (
                  <button
                    onClick={() => setActiveSubTab('tickets')}
                    className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neutral-850 border border-neutral-750 text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>{currentConversation.linkedTicketId}</span>
                  </button>
                )}

                <a
                  href={`tel:${currentConversation.agent.directPhone}`}
                  className="p-2 rounded-lg bg-neutral-850 hover:bg-neutral-800 border border-neutral-750 text-neutral-300 hover:text-white transition-colors"
                  title="Direct Dedicated Line"
                >
                  <Phone className="w-4 h-4 text-emerald-400" />
                </a>

                <a
                  href={`mailto:${currentConversation.agent.email}`}
                  className="p-2 rounded-lg bg-neutral-850 hover:bg-neutral-800 border border-neutral-750 text-neutral-300 hover:text-white transition-colors"
                  title="Confidential Email"
                >
                  <Mail className="w-4 h-4 text-cyan-400" />
                </a>
              </div>
            </div>

            {/* Chat Messages Feed */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-neutral-950/40">
              {currentConversation.messages.map((msg) => {
                if (msg.sender === 'system') {
                  return (
                    <div key={msg.id} className="flex justify-center my-2">
                      <div className="px-3 py-1.5 rounded-full bg-neutral-900 border border-neutral-800 text-[11px] font-mono text-neutral-400 flex items-center gap-2 shadow-xs">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{msg.text}</span>
                        <span className="text-neutral-500">· {msg.timestamp}</span>
                      </div>
                    </div>
                  );
                }

                const isCustomer = msg.sender === 'customer';

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isCustomer ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[78%] rounded-2xl p-4 text-xs leading-relaxed shadow-sm ${
                        isCustomer
                          ? 'bg-emerald-500 text-neutral-950 font-medium rounded-br-xs'
                          : 'bg-neutral-900 border border-neutral-800 text-neutral-200 rounded-bl-xs'
                      }`}
                    >
                      <p>{msg.text}</p>

                      {/* Mock Attachment Pill */}
                      {msg.attachment && (
                        <div
                          className={`mt-2.5 p-2.5 rounded-xl border flex items-center justify-between gap-3 text-[11px] ${
                            isCustomer
                              ? 'bg-emerald-600/30 border-emerald-600/40 text-neutral-950'
                              : 'bg-neutral-950 border-neutral-800 text-neutral-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <FileText className="w-4 h-4 shrink-0 text-emerald-400" />
                            <span className="font-mono truncate">{msg.attachment.name}</span>
                            <span className="text-[10px] opacity-70">({msg.attachment.size})</span>
                          </div>
                          <button
                            onClick={() => alert(`Simulated Download of ${msg.attachment?.name}`)}
                            className="text-xs font-semibold underline hover:opacity-80 shrink-0"
                          >
                            View
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Timestamp & Read Receipts */}
                    <div className="mt-1 px-1 flex items-center gap-1.5 text-[10px] font-mono text-neutral-500">
                      <span>{msg.timestamp}</span>
                      {isCustomer && (
                        <span>
                          {msg.status === 'read' ? (
                            <CheckCheck className="w-3.5 h-3.5 text-emerald-400 inline" />
                          ) : msg.status === 'delivered' ? (
                            <CheckCheck className="w-3.5 h-3.5 text-neutral-400 inline" />
                          ) : (
                            <Check className="w-3.5 h-3.5 text-neutral-500 inline" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Agent Typing Indicator */}
              {isAgentTyping && (
                <div className="flex items-center gap-2 text-neutral-400 text-xs py-2 px-2">
                  <div className="w-8 h-8 rounded-full bg-neutral-850 border border-neutral-750 flex items-center justify-center font-bold text-[10px] text-neutral-300">
                    {currentConversation.agent.initials}
                  </div>
                  <div className="p-3 rounded-2xl rounded-bl-xs bg-neutral-900 border border-neutral-800 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    <span className="text-[11px] font-mono text-neutral-400 ml-1">
                      {currentConversation.agent.name} is typing...
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Action Suggestion Chips */}
            <div className="px-4 py-2 bg-neutral-900/60 border-t border-neutral-800/80 flex items-center gap-2 overflow-x-auto text-[11px]">
              <span className="text-neutral-500 font-mono shrink-0">Quick prompts:</span>
              {[
                'Confirm Fedwire clearance receipt',
                'Request temporary $150k card limit increase',
                'Schedule 30-min quarterly portfolio review',
                'Inquire on Swiss Franc (CHF) exchange rate'
              ].map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(undefined, chip)}
                  className="px-2.5 py-1 rounded-lg bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 whitespace-nowrap transition-colors"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Chat Input Bar */}
            <form onSubmit={(e) => handleSendMessage(e)} className="p-3 border-t border-neutral-800 flex items-center gap-2 bg-neutral-900">
              <button
                type="button"
                onClick={() => alert('Simulated File Picker: Select statements, wire receipts, or ID documents to transmit to your banker.')}
                className="p-2.5 rounded-xl bg-neutral-950 hover:bg-neutral-850 border border-neutral-800 text-neutral-400 hover:text-neutral-200 transition-colors"
                title="Attach Document"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={`Message ${currentConversation.agent.name} (Press Enter to transmit)...`}
                className="flex-1 px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-neutral-700 font-sans"
              />

              <button
                type="submit"
                disabled={!inputText.trim()}
                className="px-4 py-2.5 rounded-xl bg-emerald-500 text-neutral-950 font-semibold text-xs hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <span>Send</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: SUPPORT TICKETS & COMPLIANCE REGISTER */}
      {activeSubTab === 'tickets' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="p-4 rounded-2xl border border-neutral-800 bg-neutral-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-neutral-300">Filter Status:</span>
              {(['All', 'In Review', 'Resolved'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setTicketFilter(filter)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    ticketFilter === filter
                      ? 'bg-neutral-800 text-neutral-100 border border-neutral-700 shadow-sm'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            <div className="text-xs text-neutral-400 font-mono">
              Showing {filteredTickets.length} of {tickets.length} Registered Tickets
            </div>
          </div>

          {/* Tickets Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTickets.map((ticket) => {
              const isResolved = ticket.status === 'Resolved';

              return (
                <div
                  key={ticket.id}
                  className="p-5 rounded-2xl border border-neutral-800 bg-neutral-900/50 flex flex-col justify-between space-y-4"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-emerald-400">
                          #{ticket.id}
                        </span>
                        <span className="text-[10px] font-mono uppercase text-neutral-400 px-2 py-0.5 rounded bg-neutral-950 border border-neutral-800">
                          {ticket.category}
                        </span>
                      </div>

                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded font-medium capitalize ${
                          isResolved
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {ticket.status}
                      </span>
                    </div>

                    <h3 className="text-sm font-semibold text-neutral-100 leading-snug">
                      {ticket.subject}
                    </h3>

                    <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
                      {ticket.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-neutral-800/80 flex items-center justify-between text-xs">
                    <div className="text-neutral-400 text-[11px]">
                      Officer: <strong className="text-neutral-200">{ticket.assignedAgent}</strong>
                    </div>

                    <button
                      onClick={() => {
                        if (ticket.conversationId) {
                          setSelectedConversationId(ticket.conversationId);
                          setActiveSubTab('chat');
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-neutral-850 hover:bg-neutral-800 text-neutral-200 text-xs font-medium transition-colors border border-neutral-750 flex items-center gap-1.5"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                      <span>View Live Thread</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CREATE TICKET MODAL */}
      {showCreateTicketModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl relative">
            <button
              onClick={() => setShowCreateTicketModal(false)}
              className="absolute right-4 top-4 p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 uppercase mb-1">
              <FileText className="w-4 h-4" />
              <span>Formal Client Ticket Dispatch</span>
            </div>

            <h3 className="text-base font-bold text-neutral-100 mb-1">Open Formal Support Ticket</h3>
            <p className="text-xs text-neutral-400 mb-4">
              Directly routed to senior treasury officers with tracked regulatory audit trailing
            </p>

            <form onSubmit={handleCreateTicket} className="space-y-4 text-xs">
              <div>
                <label className="block text-neutral-300 mb-1 font-medium">Ticket Title / Inquiry</label>
                <input
                  type="text"
                  required
                  value={newTicketSubject}
                  onChange={(e) => setNewTicketSubject(e.target.value)}
                  placeholder="e.g. Request SWIFT MT103 copy for London Wire"
                  className="w-full px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-300 mb-1 font-medium">Category</label>
                  <select
                    value={newTicketCategory}
                    onChange={(e) => setNewTicketCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-200 font-sans"
                  >
                    <option value="Wire Clearance">Wire & Clearing</option>
                    <option value="Limit Increase">Card & Limit Elevation</option>
                    <option value="Custody & Escrow">Custody & Treasury Escrow</option>
                    <option value="Tax & Statements">Tax & Audit Statements</option>
                    <option value="Card Services">Obsidian Concierge</option>
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-300 mb-1 font-medium">Priority Routing</label>
                  <select
                    value={newTicketPriority}
                    onChange={(e) => setNewTicketPriority(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-200 font-sans"
                  >
                    <option value="Urgent">Urgent (&lt; 15 min)</option>
                    <option value="High">High (&lt; 1 hour)</option>
                    <option value="Normal">Normal (&lt; 4 hours)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-neutral-300 mb-1 font-medium">Detailed Instructions & Coordinates</label>
                <textarea
                  rows={3}
                  required
                  value={newTicketDesc}
                  onChange={(e) => setNewTicketDesc(e.target.value)}
                  placeholder="Provide reference numbers, amounts, counterparties, or specific timing requirements..."
                  className="w-full px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-100 font-sans resize-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-850 flex items-start gap-2 text-neutral-400 text-[11px]">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  Tickets are permanently archived in compliance with Federal Reserve Recordkeeping Rule (31 CFR § 1020.410).
                </span>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateTicketModal(false)}
                  className="px-4 py-2 rounded-xl text-neutral-400 hover:text-neutral-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-500 text-neutral-950 font-semibold hover:bg-emerald-400 transition-colors"
                >
                  Authorize & Submit Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
