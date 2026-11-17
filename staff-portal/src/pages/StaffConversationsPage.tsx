import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  MessageSquare,
  Sparkles,
  Search,
  Send,
  Paperclip,
  Mic,
  Square,
  Phone,
  Video,
  Info,
  X,
  Check,
  CheckCheck,
  Edit2,
  Trash2,
  Lock,
  ChevronUp,
  ChevronDown,
  AlertCircle,
  Loader2,
  Smile,
} from 'lucide-react';
import {
  AiAssistEntry,
  CannedResponse,
  CustomerProfile,
  StaffChatMessage,
  StaffConversation,
  StaffMemberProfile,
  StaffTicket,
  TicketStatus,
} from '../types/staff.types';
import { staffPortalService } from '../services/staffPortalService';
import { staffAblyService } from '../services/staffAblyService';
import { CannedResponsesMenu } from '@/src/components/support/CannedResponsesMenu';
import { StaffInboxPanel } from '../components/StaffInboxPanel';
import { StaffCustomerDetailsPanel } from '../components/StaffCustomerDetailsPanel';
import { StaffAiTabWorkspace } from '../components/StaffAiTabWorkspace';
import {
  useResizablePaneWidth,
  ResizableSplitDivider,
} from '@/src/components/support/ResizableMessagingSplit';

interface StaffConversationsPageProps {
  staff: StaffMemberProfile;
  conversations: StaffConversation[];
  customers: Record<string, CustomerProfile>;
  tickets: StaffTicket[];
  cannedResponses: CannedResponse[];
  selectedConversationId: string;
  onSelectConversation: (convId: string) => void;
  onUpdateConversation: (updated: StaffConversation) => void;
  onUpdateTicketStatus?: (ticketId: string, status: TicketStatus) => Promise<void>;
  onOpenTicketView?: (ticketId: string) => void;
  isLoadingData: boolean;
  theme: 'dark' | 'light';
}

const REACTION_EMOJIS = ['👍', '✅', '🙏'];

export const StaffConversationsPage: React.FC<StaffConversationsPageProps> = ({
  staff,
  conversations,
  customers,
  tickets,
  cannedResponses,
  selectedConversationId,
  onSelectConversation,
  onUpdateConversation,
  onUpdateTicketStatus,
  onOpenTicketView,
  isLoadingData,
  theme,
}) => {
  const isLight = theme === 'light';

  // Panel / Tab UI states
  const [inboxCollapsed, setInboxCollapsed] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [mobileView, setMobileView] = useState<'inbox' | 'chat'>(() =>
    selectedConversationId ? 'chat' : 'inbox'
  );
  const [centralTab, setCentralTab] = useState<'chat' | 'ai'>('chat');
  const [headerMinimized, setHeaderMinimized] = useState(false);

  // Inbox Filters
  const [inboxSearch, setInboxSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'All' | 'active' | 'pending' | 'resolved'
  >('All');

  // Preserve unsent drafts + whisper mode per conversation across Chat <-> AI tab switches
  const [draftsByConv, setDraftsByConv] = useState<Record<string, string>>({});
  const [whisperModeByConv, setWhisperModeByConv] = useState<Record<string, boolean>>({});
  const [aiHistoryByConv, setAiHistoryByConv] = useState<
    Record<string, AiAssistEntry[]>
  >({});

  // Message actions & composer state
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [showCannedMenu, setShowCannedMenu] = useState(false);
  const [cannedQuery, setCannedQuery] = useState('');
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [reactionPickerMsgId, setReactionPickerMsgId] = useState<string | null>(null);

  // In-conversation message search
  const [msgSearchOpen, setMsgSearchOpen] = useState(false);
  const [msgSearchQuery, setMsgSearchQuery] = useState('');
  const [backendSearchResults, setBackendSearchResults] = useState<StaffChatMessage[] | null>(
    null
  );
  const [isSearchingBackend, setIsSearchingBackend] = useState(false);

  // Attachments, Voice Recording, Call Session Readiness
  const [pendingAttachment, setPendingAttachment] =
    useState<StaffChatMessage['attachment'] | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [callState, setCallState] = useState<{
    open: boolean;
    mode: 'audio' | 'video';
    status: string;
    detail: string;
  } | null>(null);

  // Realtime presence & typing telemetry
  const [isCustomerTyping, setIsCustomerTyping] = useState(false);
  const [customerPresentOnline, setCustomerPresentOnline] = useState<boolean | null>(
    null
  );

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const splitContainerRef = useRef<HTMLDivElement | null>(null);

  const {
    width: inboxWidth,
    isDragging: isResizingInbox,
    handlePointerDown: handleInboxSplitPointerDown,
    handleKeyDown: handleInboxSplitKeyDown,
    handleResetWidth: handleInboxSplitReset,
  } = useResizablePaneWidth({
    storageKey: 'aureus_staff_inbox_width',
    defaultWidth: 310,
    minWidth: 240,
    maxWidth: 500,
    minRemainingWidth: detailsOpen ? 620 : 360,
    containerRef: splitContainerRef,
  });

  const activeConv =
    conversations.find((c) => c.id === selectedConversationId) ||
    conversations[0] ||
    null;

  const activeDraft = activeConv ? draftsByConv[activeConv.id] || '' : '';
  const isWhisperDraft = activeConv
    ? Boolean(whisperModeByConv[activeConv.id])
    : false;

  const activeCustomerProfile = activeConv
    ? Object.values(customers).find((c) => c.id === activeConv.customerId)
    : undefined;

  const activeLinkedTicket = activeConv
    ? tickets.find(
        (t) =>
          t.id === activeConv.linkedTicketId ||
          t.conversationId === activeConv.id
      )
    : undefined;

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  // Scroll messages list to latest message cleanly
  useEffect(() => {
    if (centralTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [activeConv?.id, activeConv?.messages.length, centralTab, isCustomerTyping]);

  // Query backend message search when searching within a conversation
  useEffect(() => {
    const q = msgSearchQuery.trim();
    if (!msgSearchOpen || !activeConv?.id || q.length < 2) {
      setBackendSearchResults(null);
      setIsSearchingBackend(false);
      return;
    }

    let cancelled = false;
    setIsSearchingBackend(true);
    const timer = setTimeout(async () => {
      const res = await staffPortalService.searchConversationMessages(activeConv.id, q);
      if (cancelled) return;
      if (res.success && res.data) {
        setBackendSearchResults(res.data);
      } else {
        setBackendSearchResults(null);
      }
      setIsSearchingBackend(false);
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [msgSearchOpen, msgSearchQuery, activeConv?.id]);

  // Subscribe to Ably channel events & presence for active conversation
  useEffect(() => {
    if (!activeConv?.id) {
      setIsCustomerTyping(false);
      setCustomerPresentOnline(null);
      return;
    }

    const unsub = staffAblyService.subscribeConversation(activeConv.id, staff, {
      onMessageNew: (incoming) => {
        if (!activeConv.messages.some((m) => m.id === incoming.id)) {
          onUpdateConversation({
            ...activeConv,
            messages: [...activeConv.messages, incoming],
            lastMessage: incoming.text,
            lastMessageTimestamp: incoming.timestamp,
          });
        }
      },
      onMessageUpdated: (partial) => {
        onUpdateConversation({
          ...activeConv,
          messages: activeConv.messages.map((m) =>
            m.id === partial.id ? { ...m, ...partial } : m
          ),
        });
      },
      onMessageDeleted: ({ id, deletedAt }) => {
        onUpdateConversation({
          ...activeConv,
          messages: activeConv.messages.map((m) =>
            m.id === id
              ? { ...m, deletedAt: deletedAt || new Date().toISOString() }
              : m
          ),
        });
      },
      onReaction: ({ messageId, reactions }) => {
        onUpdateConversation({
          ...activeConv,
          messages: activeConv.messages.map((m) =>
            m.id === messageId ? { ...m, reactions } : m
          ),
        });
      },
      onTyping: (userId, typing) => {
        if (userId !== staff.id) {
          setIsCustomerTyping(typing);
        }
      },
      onReceipt: (messageId, status) => {
        onUpdateConversation({
          ...activeConv,
          messages: activeConv.messages.map((m) =>
            m.id === messageId ? { ...m, status } : m
          ),
        });
      },
      onPresence: (members) => {
        const customerOnline = members.some(
          (m) => m.data?.role === 'customer' || m.clientId === activeConv.customerId
        );
        setCustomerPresentOnline(customerOnline);
      },
    });

    return () => {
      unsub();
    };
  }, [activeConv?.id, staff.id]);

  const handleSelectThread = async (convId: string) => {
    onSelectConversation(convId);
    setMobileView('chat');
    setSendError(null);
    const conv = conversations.find((c) => c.id === convId);
    if (conv && conv.unreadCount > 0) {
      const res = await staffPortalService.markConversationRead(convId);
      if (res.success) {
        onUpdateConversation({ ...conv, unreadCount: 0 });
      }
    }
  };

  const setDraftForActive = (val: string) => {
    if (!activeConv) return;
    setDraftsByConv((prev) => ({ ...prev, [activeConv.id]: val }));
  };

  const handleDraftChange = (val: string) => {
    setDraftForActive(val);
    if (!activeConv) return;

    staffAblyService.publishTyping(activeConv.id, staff.id, staff.name, val.length > 0);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (val.length > 0) {
      typingTimeoutRef.current = setTimeout(() => {
        staffAblyService.publishTyping(activeConv.id, staff.id, staff.name, false);
      }, 2500);
    }

    const lastWord = val.split(/\s/).pop() || '';
    if (lastWord.startsWith('/') && !isWhisperDraft) {
      setShowCannedMenu(true);
      setCannedQuery(lastWord);
    } else {
      setShowCannedMenu(false);
    }
  };

  const handleSelectCanned = (content: string) => {
    const words = activeDraft.split(' ');
    words.pop();
    const next = words.length > 0 ? `${words.join(' ')} ${content}` : content;
    setDraftForActive(next);
    setShowCannedMenu(false);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeConv || isSending) return;
    const text = activeDraft.trim();
    if (!text && !pendingAttachment) return;

    setSendError(null);
    setIsSending(true);
    staffAblyService.publishTyping(activeConv.id, staff.id, staff.name, false);

    try {
      const res = await staffPortalService.sendMessage(activeConv.id, {
        text: text || `Attachment: ${pendingAttachment?.name}`,
        isWhisper: isWhisperDraft,
        attachment: pendingAttachment || undefined,
      });

      if (res.success && res.data) {
        const sentMsg = res.data;
        onUpdateConversation({
          ...activeConv,
          messages: [...activeConv.messages, sentMsg],
          lastMessage: sentMsg.isWhisper ? activeConv.lastMessage : sentMsg.text,
          lastMessageTimestamp: sentMsg.isWhisper
            ? activeConv.lastMessageTimestamp
            : sentMsg.timestamp,
          unreadCount: 0,
        });
        setDraftForActive('');
        setPendingAttachment(null);
        setShowCannedMenu(false);
      } else {
        setSendError(
          res.error?.message ||
            'Message could not be sent to backend (`POST /api/staff/conversations/:id/messages`). Your draft was preserved.'
        );
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleCommitEdit = async (msg: StaffChatMessage) => {
    if (!activeConv || !editingText.trim()) {
      setEditingMsgId(null);
      return;
    }
    const res = await staffPortalService.editMessage(
      activeConv.id,
      msg.id,
      editingText.trim()
    );
    if (res.success && res.data) {
      onUpdateConversation({
        ...activeConv,
        messages: activeConv.messages.map((m) =>
          m.id === msg.id ? { ...m, ...res.data } : m
        ),
      });
      setEditingMsgId(null);
    } else {
      setSendError(res.error?.message || 'Unable to edit message on backend.');
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (!activeConv) return;
    const res = await staffPortalService.deleteMessage(activeConv.id, msgId);
    if (res.success) {
      onUpdateConversation({
        ...activeConv,
        messages: activeConv.messages.map((m) =>
          m.id === msgId
            ? { ...m, deletedAt: res.data?.deletedAt || new Date().toISOString() }
            : m
        ),
      });
    } else {
      setSendError(res.error?.message || 'Unable to delete message on backend.');
    }
  };

  const handleReactMessage = async (msgId: string, emoji: string) => {
    setReactionPickerMsgId(null);
    if (!activeConv) return;
    const res = await staffPortalService.reactToMessage(activeConv.id, msgId, emoji);
    if (res.success && res.data) {
      onUpdateConversation({
        ...activeConv,
        messages: activeConv.messages.map((m) =>
          m.id === msgId ? { ...m, reactions: res.data!.reactions } : m
        ),
      });
    } else {
      setSendError(res.error?.message || 'Reaction endpoint is not active.');
    }
  };

  const handleFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeConv) return;
    setUploadingFile(true);
    setSendError(null);
    try {
      const res = await staffPortalService.uploadAttachment(activeConv.id, file);
      if (res.success && res.data) {
        setPendingAttachment(res.data);
      } else {
        setSendError(
          res.error?.message ||
            'Attachment upload endpoint (`POST /api/staff/attachments`) is not active.'
        );
      }
    } finally {
      setUploadingFile(false);
      e.target.value = '';
    }
  };

  const handleToggleVoiceNote = async () => {
    if (!activeConv) return;
    if (!isRecording) {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setSendError('Microphone capture is not supported in this browser.');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        audioChunksRef.current = [];
        recorder.ondataavailable = (ev) => {
          if (ev.data.size > 0) audioChunksRef.current.push(ev.data);
        };
        recorder.start();
        mediaRecorderRef.current = recorder;
        setRecordingSeconds(0);
        setIsRecording(true);
        recordingTimerRef.current = setInterval(() => {
          setRecordingSeconds((s) => s + 1);
        }, 1000);
      } catch {
        setSendError('Microphone permission denied or unavailable.');
      }
    } else {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      const duration = Math.max(recordingSeconds, 1);
      setIsRecording(false);
      const recorder = mediaRecorderRef.current;
      if (recorder) {
        recorder.onstop = async () => {
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          recorder.stream.getTracks().forEach((t) => t.stop());
          const uploadRes = await staffPortalService.uploadVoiceNote(
            activeConv.id,
            blob,
            duration
          );
          if (uploadRes.success && uploadRes.data) {
            await staffPortalService.sendMessage(activeConv.id, {
              text: `Voice note (${duration}s)`,
              voiceNote: uploadRes.data,
            });
          } else {
            setSendError(
              uploadRes.error?.message ||
                'Voice note endpoint (`POST /api/staff/voice-notes`) is not active.'
            );
          }
        };
        recorder.stop();
      }
    }
  };

  const handleInitiateCall = async (mode: 'audio' | 'video') => {
    if (!activeConv) return;
    setCallState({
      open: true,
      mode,
      status: 'Initializing signaling...',
      detail: 'Requesting staff call session from backend...',
    });

    const res = await staffPortalService.initiateCallSession(activeConv.id, mode);
    if (res.success && res.data) {
      setCallState({
        open: true,
        mode,
        status: res.data.status,
        detail:
          res.data.providerNote ||
          `Signaling session ${res.data.id} ready for ${activeConv.customerName}.`,
      });
    } else {
      setCallState({
        open: true,
        mode,
        status: 'signaling_unavailable',
        detail:
          res.error?.message ||
          'WebRTC call signaling (`POST /api/staff/calls/session`) is integration-ready and awaiting backend signaling server.',
      });
    }
  };

  const qMsg = msgSearchQuery.trim().toLowerCase();
  const visibleMessages = activeConv
    ? qMsg && backendSearchResults !== null
      ? backendSearchResults
      : activeConv.messages.filter((m) =>
          !qMsg ? true : m.text.toLowerCase().includes(qMsg)
        )
    : [];

  return (
    <div ref={splitContainerRef} className="flex-1 min-h-0 flex overflow-hidden">
      {/* LEFT PANEL: Inbox (Desktop always/collapsible; Mobile full-screen when mobileView==='inbox') */}
      <div
        className={`${
          mobileView === 'inbox' ? 'flex w-full md:w-auto' : 'hidden'
        } md:flex h-full min-h-0 shrink-0`}
      >
        <StaffInboxPanel
          conversations={conversations}
          selectedConversationId={activeConv?.id || ''}
          onSelectConversation={handleSelectThread}
          searchQuery={inboxSearch}
          onSearchChange={setInboxSearch}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          isCollapsed={inboxCollapsed}
          onToggleCollapse={() => setInboxCollapsed((prev) => !prev)}
          isLoading={isLoadingData}
          theme={theme}
          widthPx={inboxWidth}
          isResizing={isResizingInbox}
        />
      </div>

      {!inboxCollapsed && (
        <ResizableSplitDivider
          isDragging={isResizingInbox}
          onPointerDown={handleInboxSplitPointerDown}
          onKeyDown={handleInboxSplitKeyDown}
          onDoubleClick={handleInboxSplitReset}
          currentWidth={inboxWidth}
          minWidth={240}
          maxWidth={500}
          breakpoint="md"
          isLight={isLight}
          ariaLabel="Resize assigned inbox and active conversation panels"
        />
      )}

      {/* CENTER WORKSPACE: Fixed Title Bar + Chat|AI Tabs + Scrollable Body + Keyboard-Safe Composer */}
      <div
        className={`${
          mobileView === 'chat' ? 'flex' : 'hidden'
        } md:flex flex-1 min-w-0 min-h-0 h-full flex-col overflow-hidden`}
      >
        {!activeConv ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-2">
            <MessageSquare className="w-8 h-8 text-neutral-600" />
            <div className="text-sm font-semibold">
              {isLoadingData ? 'Loading inbox...' : 'No Conversation Selected'}
            </div>
            <p className="text-xs text-neutral-500 max-w-sm">
              Select a client conversation from your scoped inbox to view thread
              history, AI copilot drafts, and dossier details.
            </p>
          </div>
        ) : (
          <>
            {/* Fixed / Minimizable Conversation Header + Central Chat|AI Tabs */}
            <div
              className={`shrink-0 border-b ${
                isLight
                  ? 'bg-white border-slate-200'
                  : 'bg-neutral-950/80 border-neutral-800'
              }`}
            >
              <div className="px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    type="button"
                    onClick={() => setMobileView('inbox')}
                    aria-label="Back to Inbox"
                    className={`md:hidden p-2 rounded-lg border cursor-pointer shrink-0 ${
                      isLight
                        ? 'bg-slate-50 border-slate-200 text-slate-700'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-200'
                    }`}
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-xs sm:text-sm font-bold truncate">
                        {activeConv.customerName}
                      </h2>
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          customerPresentOnline ?? activeConv.customerOnline
                            ? 'bg-emerald-500'
                            : 'bg-neutral-600'
                        }`}
                        title={
                          customerPresentOnline ?? activeConv.customerOnline
                            ? 'Customer online in room'
                            : 'Customer offline'
                        }
                      />
                    </div>
                    {!headerMinimized && (
                      <div className="text-[11px] text-neutral-400 truncate">
                        {activeConv.subject}
                        {activeConv.linkedTicketId
                          ? ` · ${activeConv.linkedTicketId}`
                          : ''}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Controls: Search, Calls, Customer Details, Minimize */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setMsgSearchOpen((prev) => !prev)}
                    title="Search messages"
                    aria-label="Search messages"
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg border flex items-center justify-center cursor-pointer ${
                      msgSearchOpen
                        ? 'border-emerald-500 bg-emerald-500/15 text-emerald-500'
                        : isLight
                        ? 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                        : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    <Search className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleInitiateCall('audio')}
                    title="Voice Call"
                    aria-label="Voice Call"
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg border flex items-center justify-center cursor-pointer ${
                      isLight
                        ? 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                        : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleInitiateCall('video')}
                    title="Video Call"
                    aria-label="Video Call"
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg border flex items-center justify-center cursor-pointer ${
                      isLight
                        ? 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                        : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    <Video className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setDetailsOpen((prev) => !prev)}
                    title="Toggle Customer Details"
                    aria-label="Toggle Customer Details"
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg border flex items-center justify-center cursor-pointer ${
                      detailsOpen
                        ? 'border-emerald-500 bg-emerald-500/15 text-emerald-500'
                        : isLight
                        ? 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                        : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    <Info className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setHeaderMinimized((prev) => !prev)}
                    title={headerMinimized ? 'Expand title bar' : 'Minimize title bar'}
                    aria-label={headerMinimized ? 'Expand title bar' : 'Minimize title bar'}
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg border flex items-center justify-center cursor-pointer ${
                      isLight
                        ? 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                        : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    {headerMinimized ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronUp className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Central Chat | AI Assistant Tabs */}
              <div className="px-3 sm:px-4 pb-2 flex items-center justify-between gap-2">
                <div
                  role="tablist"
                  aria-label="Conversation Workspace Mode"
                  className={`inline-flex p-1 rounded-xl border ${
                    isLight
                      ? 'bg-slate-100 border-slate-200'
                      : 'bg-neutral-900 border-neutral-800'
                  }`}
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={centralTab === 'chat'}
                    onClick={() => setCentralTab('chat')}
                    className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
                      centralTab === 'chat'
                        ? 'bg-emerald-500 text-neutral-950 font-semibold'
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Chat</span>
                  </button>

                  <button
                    type="button"
                    role="tab"
                    aria-selected={centralTab === 'ai'}
                    onClick={() => setCentralTab('ai')}
                    className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
                      centralTab === 'ai'
                        ? 'bg-amber-500 text-neutral-950 font-semibold'
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>AI Assistant</span>
                  </button>
                </div>

                {activeDraft.trim().length > 0 && centralTab === 'ai' && (
                  <span className="text-[10px] font-mono text-emerald-400 truncate">
                    Unsent chat draft preserved
                  </span>
                )}
              </div>

              {/* Optional Message Search Bar */}
              {msgSearchOpen && centralTab === 'chat' && (
                <div className="px-3 sm:px-4 pb-2.5 flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={msgSearchQuery}
                      onChange={(e) => setMsgSearchQuery(e.target.value)}
                      placeholder="Search messages in thread..."
                      className={`w-full pl-8 pr-8 py-1.5 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                        isLight
                          ? 'bg-slate-50 border-slate-200 text-slate-900'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-100'
                      }`}
                    />
                    {isSearchingBackend ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500 absolute right-2.5 top-1/2 -translate-y-1/2" />
                    ) : (
                      msgSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setMsgSearchQuery('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Central Content Area */}
            {centralTab === 'ai' ? (
              <StaffAiTabWorkspace
                conversation={activeConv}
                staff={staff}
                currentChatDraft={activeDraft}
                entries={aiHistoryByConv[activeConv.id] || []}
                onAppendEntry={(entry) =>
                  setAiHistoryByConv((prev) => ({
                    ...prev,
                    [activeConv.id]: [...(prev[activeConv.id] || []), entry],
                  }))
                }
                onUseSuggestedReply={(text) => {
                  setDraftForActive(text);
                  setWhisperModeByConv((prev) => ({
                    ...prev,
                    [activeConv.id]: false,
                  }));
                  setCentralTab('chat');
                }}
                onUseInternalNoteDraft={(text) => {
                  setDraftForActive(text);
                  setWhisperModeByConv((prev) => ({
                    ...prev,
                    [activeConv.id]: true,
                  }));
                  setCentralTab('chat');
                }}
                theme={theme}
              />
            ) : (
              <>
                {/* Independently Scrollable Message Feed */}
                <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 lg:p-5 space-y-3">
                  {visibleMessages.length === 0 ? (
                    <div className="py-12 text-center text-xs text-neutral-500">
                      {qMsg
                        ? `No messages matching "${msgSearchQuery}".`
                        : 'No messages in this conversation yet.'}
                    </div>
                  ) : (
                    visibleMessages.map((msg) => {
                      const isAgent = msg.sender === 'agent';
                      const isSystem = msg.sender === 'system';

                      if (isSystem) {
                        return (
                          <div key={msg.id} className="flex justify-center">
                            <div
                              className={`px-3 py-1 rounded-lg border text-[11px] text-center max-w-lg ${
                                isLight
                                  ? 'bg-slate-100 border-slate-200 text-slate-600'
                                  : 'bg-neutral-900/60 border-neutral-800 text-neutral-400'
                              }`}
                            >
                              {msg.text}
                            </div>
                          </div>
                        );
                      }

                      const isWhisper = Boolean(msg.isWhisper || msg.isPrivateNote);

                      return (
                        <div
                          key={msg.id}
                          className={`group flex flex-col ${
                            isAgent ? 'items-end' : 'items-start'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 mb-1 text-[10px] font-mono text-neutral-500">
                            <span>
                              {isAgent
                                ? msg.agentName || staff.name
                                : activeConv.customerName}
                            </span>
                            {isWhisper && (
                              <span
                                className={`flex items-center gap-0.5 font-semibold ${
                                  isLight ? 'text-amber-700' : 'text-amber-400'
                                }`}
                              >
                                <Lock className="w-2.5 h-2.5" />
                                Internal Whisper
                              </span>
                            )}
                            <span>·</span>
                            <span className="tabular-nums">{msg.timestamp}</span>
                            {msg.editedAt && <span>(edited)</span>}
                          </div>

                          <div
                            className={`relative max-w-[88%] sm:max-w-[75%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed break-words border ${
                              msg.deletedAt
                                ? isLight
                                  ? 'bg-slate-100 border-slate-200 text-slate-500 italic'
                                  : 'bg-neutral-900/40 border-neutral-800 text-neutral-500 italic'
                                : isWhisper
                                ? isLight
                                  ? 'bg-amber-50 border-amber-300 text-amber-950'
                                  : 'bg-amber-500/10 border-amber-500/35 text-amber-100'
                                : isAgent
                                ? 'bg-emerald-600 border-emerald-500 text-neutral-950 font-medium'
                                : isLight
                                ? 'bg-white border-slate-200 text-slate-900'
                                : 'bg-neutral-900 border-neutral-800 text-neutral-100'
                            }`}
                          >
                            {msg.deletedAt ? (
                              <span>Message deleted</span>
                            ) : editingMsgId === msg.id ? (
                              <div className="space-y-2 min-w-[220px]">
                                <input
                                  type="text"
                                  value={editingText}
                                  onChange={(e) => setEditingText(e.target.value)}
                                  className="w-full px-2.5 py-1.5 rounded-lg bg-neutral-950 text-neutral-100 border border-neutral-700 text-xs"
                                />
                                <div className="flex justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setEditingMsgId(null)}
                                    className="px-2 py-1 rounded bg-neutral-800 text-neutral-200 text-[10px]"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleCommitEdit(msg)}
                                    className="px-2 py-1 rounded bg-neutral-950 text-emerald-400 text-[10px] font-semibold"
                                  >
                                    Save
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <p className="whitespace-pre-line">{msg.text}</p>
                                {msg.attachment && (
                                  <div className="mt-2 px-2.5 py-1.5 rounded-lg bg-black/20 text-[11px] font-mono">
                                    📎 {msg.attachment.name} ({msg.attachment.size})
                                  </div>
                                )}
                                {msg.voiceNote && (
                                  <div className="mt-2 px-2.5 py-1.5 rounded-lg bg-black/20 text-[11px] font-mono">
                                    🎙 Voice Note ({msg.voiceNote.durationSeconds}s)
                                  </div>
                                )}
                              </>
                            )}
                          </div>

                          {/* Reactions + Read Receipt + Hover Message Actions */}
                          <div className="mt-1 flex items-center gap-2 text-[10px] text-neutral-500">
                            {isAgent && !msg.deletedAt && (
                              <span className="flex items-center gap-0.5 font-mono">
                                {msg.status === 'read' ? (
                                  <CheckCheck className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Check className="w-3 h-3" />
                                )}
                                <span>{msg.status}</span>
                              </span>
                            )}

                            {msg.reactions && msg.reactions.length > 0 && (
                              <div className="flex items-center gap-1">
                                {msg.reactions.map((r) => (
                                  <button
                                    key={r.emoji}
                                    type="button"
                                    onClick={() => handleReactMessage(msg.id, r.emoji)}
                                    className="px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-[10px] cursor-pointer"
                                  >
                                    {r.emoji} {r.count}
                                  </button>
                                ))}
                              </div>
                            )}

                            {!msg.deletedAt && (
                              <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity relative">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setReactionPickerMsgId((prev) =>
                                      prev === msg.id ? null : msg.id
                                    )
                                  }
                                  title="React"
                                  className="p-1 rounded hover:bg-neutral-800 text-neutral-400 cursor-pointer"
                                >
                                  <Smile className="w-3 h-3" />
                                </button>
                                {isAgent && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingMsgId(msg.id);
                                        setEditingText(msg.text);
                                      }}
                                      title="Edit message"
                                      className="p-1 rounded hover:bg-neutral-800 text-neutral-400 cursor-pointer"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteMessage(msg.id)}
                                      title="Delete message"
                                      className="p-1 rounded hover:bg-neutral-800 text-rose-400 cursor-pointer"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </>
                                )}
                                {reactionPickerMsgId === msg.id && (
                                  <div className="flex items-center gap-1 px-1.5 py-1 rounded-lg bg-neutral-900 border border-neutral-800 shadow-lg">
                                    {REACTION_EMOJIS.map((em) => (
                                      <button
                                        key={em}
                                        type="button"
                                        onClick={() => handleReactMessage(msg.id, em)}
                                        className="px-1 hover:scale-110 transition-transform cursor-pointer"
                                      >
                                        {em}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}

                  {isCustomerTyping && (
                    <div className="text-[11px] font-mono text-emerald-400 px-1">
                      {activeConv.customerName} is typing...
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Fixed, Keyboard-Safe Composer */}
                <div
                  className={`relative shrink-0 p-2.5 sm:p-3 pb-[max(0.625rem,env(safe-area-inset-bottom))] border-t ${
                    isLight
                      ? 'bg-white border-slate-200'
                      : 'bg-neutral-950/90 border-neutral-800'
                  }`}
                >
                  {showCannedMenu && (
                    <CannedResponsesMenu
                      filterQuery={cannedQuery}
                      templates={cannedResponses}
                      onSelect={handleSelectCanned}
                      onClose={() => setShowCannedMenu(false)}
                      theme={theme}
                    />
                  )}

                  {sendError && (
                    <div
                      className={`mb-2 p-2.5 rounded-xl border text-[11px] flex items-center justify-between gap-2 ${
                        isLight
                          ? 'border-rose-200 bg-rose-50 text-rose-800'
                          : 'border-rose-500/40 bg-rose-500/10 text-rose-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span className="truncate">{sendError}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSendError(null)}
                        className="text-neutral-400 hover:text-neutral-200 shrink-0 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {pendingAttachment && (
                    <div className="mb-2 px-3 py-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-xs flex items-center justify-between">
                      <span className="truncate font-mono">
                        📎 {pendingAttachment.name} ({pendingAttachment.size})
                      </span>
                      <button
                        type="button"
                        onClick={() => setPendingAttachment(null)}
                        className="text-neutral-400 hover:text-neutral-200 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <form onSubmit={handleSendMessage} className="space-y-2">
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setWhisperModeByConv((prev) => ({
                              ...prev,
                              [activeConv.id]: !isWhisperDraft,
                            }))
                          }
                          className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium flex items-center gap-1 cursor-pointer ${
                            isWhisperDraft
                              ? isLight
                                ? 'border-amber-400 bg-amber-50 text-amber-800 font-semibold'
                                : 'border-amber-500 bg-amber-500/15 text-amber-300 font-semibold'
                              : isLight
                              ? 'border-slate-200 bg-slate-50 text-slate-600'
                              : 'border-neutral-800 bg-neutral-900 text-neutral-400'
                          }`}
                        >
                          <Lock className="w-3 h-3" />
                          <span>
                            {isWhisperDraft
                              ? 'Internal Whisper Note'
                              : 'Public Client Reply'}
                          </span>
                        </button>
                      </div>

                      <span className="text-[10px] font-mono text-neutral-500 hidden sm:inline">
                        Type `/` for canned responses
                      </span>
                    </div>

                    <div className="flex items-end gap-1.5 sm:gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        onChange={handleFilePicked}
                      />

                      <button
                        type="button"
                        disabled={uploadingFile}
                        onClick={() => fileInputRef.current?.click()}
                        title="Attach document"
                        aria-label="Attach document"
                        className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 cursor-pointer ${
                          isLight
                            ? 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                            : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-100'
                        }`}
                      >
                        {uploadingFile ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Paperclip className="w-4 h-4" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleToggleVoiceNote}
                        title={
                          isRecording
                            ? `Stop recording (${recordingSeconds}s)`
                            : 'Record voice note'
                        }
                        aria-label={
                          isRecording ? 'Stop recording' : 'Record voice note'
                        }
                        className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 cursor-pointer ${
                          isRecording
                            ? 'border-rose-500 bg-rose-500/20 text-rose-400'
                            : isLight
                            ? 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                            : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-100'
                        }`}
                      >
                        {isRecording ? (
                          <Square className="w-4 h-4" />
                        ) : (
                          <Mic className="w-4 h-4" />
                        )}
                      </button>

                      <textarea
                        rows={1}
                        value={activeDraft}
                        onChange={(e) => handleDraftChange(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey && !showCannedMenu) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        placeholder={
                          isWhisperDraft
                            ? 'Write authorized internal whisper note...'
                            : `Reply to ${activeConv.customerName}...`
                        }
                        className={`flex-1 min-w-0 px-3.5 py-2.5 rounded-xl border text-xs resize-none focus:outline-none focus:ring-1 ${
                          isWhisperDraft
                            ? 'focus:ring-amber-500 border-amber-500/40'
                            : 'focus:ring-emerald-500'
                        } ${
                          isLight
                            ? 'bg-white border-slate-300 text-slate-900'
                            : 'bg-neutral-900 border-neutral-800 text-neutral-100'
                        }`}
                      />

                      <button
                        type="submit"
                        disabled={
                          isSending || (!activeDraft.trim() && !pendingAttachment)
                        }
                        className={`h-10 px-3.5 rounded-xl font-semibold text-xs flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-40 ${
                          isWhisperDraft
                            ? 'bg-amber-500 hover:bg-amber-400 text-neutral-950'
                            : 'bg-emerald-500 hover:bg-emerald-400 text-neutral-950'
                        }`}
                      >
                        {isSending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                        <span className="hidden sm:inline">
                          {isWhisperDraft ? 'Note' : 'Send'}
                        </span>
                      </button>
                    </div>
                  </form>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* RIGHT PANEL: Collapsible Customer & Ticket Details */}
      {activeConv && (
        <StaffCustomerDetailsPanel
          conversation={activeConv}
          customer={activeCustomerProfile}
          linkedTicket={activeLinkedTicket}
          isOpen={detailsOpen}
          onClose={() => setDetailsOpen(false)}
          onUpdateConversationStatus={async (st) => {
            const res = await staffPortalService.updateConversation(activeConv.id, {
              status: st,
            });
            if (res.success) {
              onUpdateConversation({ ...activeConv, status: st });
            } else {
              setSendError(
                res.error?.message || 'Unable to update conversation status.'
              );
            }
          }}
          onSaveInternalNotes={async (notes) => {
            const res = await staffPortalService.updateConversation(activeConv.id, {
              internalNotes: notes,
            });
            if (res.success) {
              onUpdateConversation({ ...activeConv, internalNotes: notes });
              return { ok: true };
            }
            return { ok: false, error: res.error?.message };
          }}
          onUpdateTicketStatus={onUpdateTicketStatus}
          onOpenTicketView={onOpenTicketView}
          theme={theme}
        />
      )}

      {/* Call Signaling Readiness Modal */}
      {callState?.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75">
          <div
            className={`w-full max-w-sm rounded-2xl border p-5 space-y-4 shadow-2xl ${
              isLight
                ? 'bg-white border-slate-200 text-slate-900'
                : 'bg-neutral-900 border-neutral-800 text-neutral-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold">
                {callState.mode === 'video' ? (
                  <Video className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Phone className="w-4 h-4 text-emerald-500" />
                )}
                <span>
                  {callState.mode === 'video' ? 'Video Call' : 'Voice Call'} Signaling
                </span>
              </div>
              <button
                type="button"
                onClick={() => setCallState(null)}
                className="p-1 text-neutral-400 hover:text-neutral-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs font-mono text-amber-400">
              Status: {callState.status}
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed">
              {callState.detail}
            </p>

            <button
              type="button"
              onClick={() => setCallState(null)}
              className="w-full py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-100 cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
