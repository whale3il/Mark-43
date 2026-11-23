import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Play,
  Pause,
  Download,
  LogOut,
  RotateCcw,
} from 'lucide-react';
import {
  AiAssistEntry,
  CannedResponse,
  CustomerProfile,
  StaffChatMessage,
  StaffConversation,
  StaffMemberProfile,
  StaffTicket,
  SupportCallSession,
  SupportCallType,
  TicketStatus,
} from '../types/staff.types';
import { staffPortalService } from '../services/staffPortalService';
import { staffAblyService } from '../services/staffAblyService';
import { isSafeMediaUrl } from '@/src/services/supportService';
import { WebRtcCallManager } from '@/src/services/webrtcCallManager';
import { CannedResponsesMenu } from '@/src/components/support/CannedResponsesMenu';
import {
  SupportCallOverlay,
  CallOverlayPhase,
} from '@/src/components/support/SupportCallOverlay';
import { EndSessionConfirmModal } from '@/src/components/support/EndSessionConfirmModal';
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
  onPatchConversation: (
    convId: string,
    updater: (prev: StaffConversation) => StaffConversation
  ) => void;
  onRemoveConversation: (convId: string) => void;
  onUpdateTicketStatus?: (ticketId: string, status: TicketStatus) => Promise<void>;
  onOpenTicketView?: (ticketId: string) => void;
  isLoadingData: boolean;
  theme: 'dark' | 'light';
}

const REACTION_EMOJIS = ['👍', '✅', '🙏'];

function mergeStaffMessages(
  existing: StaffChatMessage[],
  incoming: StaffChatMessage[]
): StaffChatMessage[] {
  const byKey = new Map<string, StaffChatMessage>();
  const failedLocals: StaffChatMessage[] = [];

  for (const m of existing) {
    if (m.failed) {
      failedLocals.push(m);
      continue;
    }
    byKey.set(m.id, m);
  }

  for (const srv of incoming) {
    if (srv.clientTempId) {
      for (const [k, v] of byKey.entries()) {
        if (k === srv.clientTempId || v.clientTempId === srv.clientTempId) {
          byKey.delete(k);
        }
      }
    }
    const prev = byKey.get(srv.id);
    byKey.set(
      srv.id,
      prev ? { ...prev, ...srv, pending: false, failed: false } : srv
    );
  }

  return [...Array.from(byKey.values()), ...failedLocals];
}

function appendOrReconcileStaffMessage(
  existing: StaffChatMessage[],
  incoming: StaffChatMessage
): StaffChatMessage[] {
  const idx = existing.findIndex(
    (m) =>
      m.id === incoming.id ||
      (Boolean(incoming.clientTempId) &&
        (m.clientTempId === incoming.clientTempId ||
          m.id === incoming.clientTempId))
  );
  if (idx >= 0) {
    const next = [...existing];
    next[idx] = { ...next[idx], ...incoming, pending: false, failed: false };
    return next;
  }
  return [...existing, incoming];
}

export const StaffConversationsPage: React.FC<StaffConversationsPageProps> = ({
  staff,
  conversations,
  customers,
  tickets,
  cannedResponses,
  selectedConversationId,
  onSelectConversation,
  onUpdateConversation,
  onPatchConversation,
  onRemoveConversation,
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
  const [whisperModeByConv, setWhisperModeByConv] = useState<
    Record<string, boolean>
  >({});
  const [aiHistoryByConv, setAiHistoryByConv] = useState<
    Record<string, AiAssistEntry[]>
  >({});

  // Message actions & composer state
  const [isSending, setIsSending] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [showCannedMenu, setShowCannedMenu] = useState(false);
  const [cannedQuery, setCannedQuery] = useState('');
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [reactionPickerMsgId, setReactionPickerMsgId] = useState<string | null>(
    null
  );

  // In-conversation message search
  const [msgSearchOpen, setMsgSearchOpen] = useState(false);
  const [msgSearchQuery, setMsgSearchQuery] = useState('');
  const [backendSearchResults, setBackendSearchResults] = useState<
    StaffChatMessage[] | null
  >(null);
  const [isSearchingBackend, setIsSearchingBackend] = useState(false);

  // Attachments, Voice Recording & Playback
  const [pendingAttachment, setPendingAttachment] =
    useState<StaffChatMessage['attachment'] | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);

  // Real WebRTC Audio / Video call state
  const [activeCall, setActiveCall] = useState<SupportCallSession | null>(null);
  const [callPhase, setCallPhase] = useState<CallOverlayPhase>('ended');
  const [callError, setCallError] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  // End Session confirmation modal
  const [showEndSessionModal, setShowEndSessionModal] = useState(false);
  const [isEndingSession, setIsEndingSession] = useState(false);
  const [endSessionError, setEndSessionError] = useState<string | null>(null);

  // Realtime per-conversation presence & typing telemetry
  const [typingByConv, setTypingByConv] = useState<Record<string, boolean>>({});
  const [presenceByConv, setPresenceByConv] = useState<
    Record<string, boolean>
  >({});

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingSecondsRef = useRef<number>(0);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const splitContainerRef = useRef<HTMLDivElement | null>(null);
  const callManagerRef = useRef<WebRtcCallManager | null>(null);
  const activeCallRef = useRef<SupportCallSession | null>(null);
  activeCallRef.current = activeCall;

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

  const activeConversations = conversations.filter((c) => c.status !== 'closed');
  const activeConv =
    activeConversations.find((c) => c.id === selectedConversationId) ||
    activeConversations[0] ||
    null;

  const activeConvIdRef = useRef<string>('');
  activeConvIdRef.current = activeConv?.id || '';

  const isCustomerTyping = Boolean(activeConv && typingByConv[activeConv.id]);
  const customerPresentOnline = activeConv
    ? presenceByConv[activeConv.id] ?? null
    : null;

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

  const cleanupMediaAndCall = useCallback(() => {
    if (callManagerRef.current) {
      callManagerRef.current.dispose();
      callManagerRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
  }, []);

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== 'inactive'
      ) {
        try {
          mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
          mediaRecorderRef.current.stop();
        } catch {
          // Safe cleanup
        }
      }
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
      cleanupMediaAndCall();
    };
  }, [cleanupMediaAndCall]);

  // Scroll messages list to latest message cleanly
  useEffect(() => {
    if (centralTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'end',
      });
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
      const res = await staffPortalService.searchConversationMessages(
        activeConv.id,
        q
      );
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

  const fetchConversationMessages = useCallback(
    async (convId: string) => {
      if (!convId) return;
      setIsLoadingMessages(true);
      try {
        const res = await staffPortalService.getConversationMessages(convId);
        if (res.success && res.data) {
          const serverMessages = res.data;
          onPatchConversation(convId, (prev) => {
            const merged = mergeStaffMessages(prev.messages, serverMessages);
            const latest = merged[merged.length - 1];
            return {
              ...prev,
              messages: merged,
              lastMessage: latest?.text || prev.lastMessage,
              lastMessageTimestamp:
                latest?.timestamp || prev.lastMessageTimestamp,
            };
          });
          if (
            serverMessages.some(
              (m) => m.sender === 'customer' && m.status !== 'read'
            )
          ) {
            staffPortalService.markRead(convId).catch(() => {});
          }
        }
      } finally {
        setIsLoadingMessages(false);
      }
    },
    [onPatchConversation]
  );

  // Load persisted messages + active call state when switching active conversation
  useEffect(() => {
    if (!activeConv?.id) return;
    const convId = activeConv.id;
    fetchConversationMessages(convId);

    staffPortalService.listCalls(convId).then((res) => {
      if (!res.success || !res.data || activeConvIdRef.current !== convId) return;
      const incoming = res.data.find(
        (c) =>
          c.status === 'ringing' && c.initiatorId && c.initiatorId !== staff.id
      );
      if (incoming && !activeCallRef.current) {
        setActiveCall(incoming);
        setCallPhase('incoming_ringing');
        setCallError(null);
      }
    });
  }, [activeConv?.id, staff.id, fetchConversationMessages]);

  const createManagerForCall = useCallback(
    (call: SupportCallSession) => {
      cleanupMediaAndCall();
      const manager = new WebRtcCallManager(
        call.conversationId,
        call.type,
        {
          onLocalStream: (s) => setLocalStream(s),
          onRemoteStream: (s) => setRemoteStream(s),
          onConnectionState: (state) => {
            if (state === 'connected') {
              setCallPhase('active');
            } else if (state === 'connecting') {
              setCallPhase('connecting');
            } else if (state === 'failed') {
              setCallPhase('error');
              setCallError('WebRTC peer connection failed to establish media.');
            }
          },
          onSignal: (signal) => {
            staffPortalService
              .sendCallSignal(call.id, {
                ...signal,
                fromUserId: staff.id,
              })
              .catch(() => {});
          },
        },
        call.iceServers
      );
      callManagerRef.current = manager;
      return manager;
    },
    [cleanupMediaAndCall, staff.id]
  );

  // Subscribe to Ably channel events & presence across ALL assigned non-closed conversations
  const activeConvIdsKey = activeConversations.map((c) => c.id).join(',');

  useEffect(() => {
    const convIds = activeConvIdsKey ? activeConvIdsKey.split(',') : [];
    if (convIds.length === 0 || !staff.id) return;

    const unsubscribers = convIds.map((convId) =>
      staffAblyService.subscribeConversation(convId, staff, {
        onMessageNew: (incoming) => {
          const isCurrentlyViewing = activeConvIdRef.current === convId;
          onPatchConversation(convId, (prev) => {
            const nextMessages = appendOrReconcileStaffMessage(
              prev.messages,
              incoming
            );
            return {
              ...prev,
              messages: nextMessages,
              lastMessage: incoming.isWhisper ? prev.lastMessage : incoming.text,
              lastMessageTimestamp: incoming.isWhisper
                ? prev.lastMessageTimestamp
                : incoming.timestamp,
              unreadCount:
                incoming.sender === 'customer' && !isCurrentlyViewing
                  ? (prev.unreadCount || 0) + 1
                  : isCurrentlyViewing
                  ? 0
                  : prev.unreadCount,
            };
          });

          if (incoming.sender === 'customer') {
            staffPortalService.markDelivered(convId, incoming.id).catch(() => {});
            if (isCurrentlyViewing) {
              staffPortalService.markRead(convId, incoming.id).catch(() => {});
            }
          }
        },
        onMessageUpdated: (partial) => {
          onPatchConversation(convId, (prev) => ({
            ...prev,
            messages: prev.messages.map((m) =>
              m.id === partial.id ? { ...m, ...partial } : m
            ),
          }));
        },
        onMessageDeleted: ({ id, deletedAt }) => {
          onPatchConversation(convId, (prev) => ({
            ...prev,
            messages: prev.messages.map((m) =>
              m.id === id
                ? { ...m, deletedAt: deletedAt || new Date().toISOString() }
                : m
            ),
          }));
        },
        onReaction: ({ messageId, reactions }) => {
          onPatchConversation(convId, (prev) => ({
            ...prev,
            messages: prev.messages.map((m) =>
              m.id === messageId ? { ...m, reactions } : m
            ),
          }));
        },
        onTyping: (_userId, typing) => {
          setTypingByConv((prev) => ({ ...prev, [convId]: typing }));
        },
        onReceipt: (messageId, status) => {
          onPatchConversation(convId, (prev) => ({
            ...prev,
            messages: prev.messages.map((m) =>
              m.id === messageId ? { ...m, status } : m
            ),
          }));
        },
        onConversationUpdated: (patch) => {
          if (patch.status) {
            onPatchConversation(convId, (prev) => ({
              ...prev,
              status: patch.status!,
            }));
          }
        },
        onSessionEnded: () => {
          onRemoveConversation(convId);
          if (activeConvIdRef.current === convId) {
            setShowEndSessionModal(false);
            cleanupMediaAndCall();
            setActiveCall(null);
            setSendError(null);
          }
        },
        onCallEvent: (eventType, call) => {
          if (eventType === 'incoming') {
            if (
              call.initiatorId === staff.id ||
              activeCallRef.current?.id === call.id
            ) {
              return;
            }
            setActiveCall(call);
            setCallPhase('incoming_ringing');
            setCallError(null);
          } else if (eventType === 'accepted') {
            if (activeCallRef.current?.id === call.id) {
              setActiveCall((prev) =>
                prev ? { ...prev, status: 'accepted' } : call
              );
              setCallPhase('connecting');
              if (call.initiatorId === staff.id || !callManagerRef.current) {
                const mgr = callManagerRef.current || createManagerForCall(call);
                mgr.createAndSendOffer().catch((err) => {
                  setCallPhase('error');
                  setCallError(
                    err?.message || 'Microphone/camera access denied.'
                  );
                });
              }
            }
          } else if (eventType === 'rejected') {
            if (activeCallRef.current?.id === call.id) {
              cleanupMediaAndCall();
              setCallPhase('rejected');
              setCallError('Client is unavailable or declined the call.');
            }
          } else if (eventType === 'ended') {
            if (activeCallRef.current?.id === call.id) {
              cleanupMediaAndCall();
              setCallPhase('ended');
            }
          }
        },
        onCallSignal: (signal) => {
          if (
            activeCallRef.current?.id === signal.callId &&
            callManagerRef.current
          ) {
            callManagerRef.current.handleSignal(signal).catch((err) => {
              setCallPhase('error');
              setCallError(err?.message || 'WebRTC signaling error.');
            });
          }
        },
        onPresence: (members) => {
          const online = members.some((m) => m.data?.role === 'customer');
          setPresenceByConv((prev) => ({ ...prev, [convId]: online }));
        },
        onReconnected: () => {
          fetchConversationMessages(convId);
        },
      })
    );

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [
    activeConvIdsKey,
    staff.id,
    staff.name,
    staff.availability,
    onPatchConversation,
    onRemoveConversation,
    cleanupMediaAndCall,
    createManagerForCall,
    fetchConversationMessages,
  ]);

  const handleSelectThread = async (convId: string) => {
    onSelectConversation(convId);
    setMobileView('chat');
    setSendError(null);
    const conv = conversations.find((c) => c.id === convId);
    if (conv && conv.unreadCount > 0) {
      onPatchConversation(convId, (prev) => ({ ...prev, unreadCount: 0 }));
      staffPortalService.markConversationRead(convId).catch(() => {});
      staffPortalService.markRead(convId).catch(() => {});
    }
  };

  const setDraftForActive = (val: string) => {
    if (!activeConv) return;
    setDraftsByConv((prev) => ({ ...prev, [activeConv.id]: val }));
  };

  const handleDraftChange = (val: string) => {
    setDraftForActive(val);
    if (!activeConv) return;

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    if (val.trim().length > 0 && !isWhisperDraft) {
      staffAblyService.publishTyping(activeConv.id, staff.id, staff.name, true);
      staffPortalService.sendTyping(activeConv.id, true).catch(() => {});
      typingTimeoutRef.current = setTimeout(() => {
        staffAblyService.publishTyping(
          activeConv.id,
          staff.id,
          staff.name,
          false
        );
        staffPortalService.sendTyping(activeConv.id, false).catch(() => {});
      }, 2500);
    } else {
      staffAblyService.publishTyping(
        activeConv.id,
        staff.id,
        staff.name,
        false
      );
      staffPortalService.sendTyping(activeConv.id, false).catch(() => {});
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

  const dispatchMessagePayload = async (
    convId: string,
    optimisticMsg: StaffChatMessage,
    payload: {
      text: string;
      isWhisper?: boolean;
      type?: 'text' | 'attachment' | 'voice';
      attachmentId?: string;
      attachment?: StaffChatMessage['attachment'];
      voiceNote?: StaffChatMessage['voiceNote'];
      clientTempId: string;
    }
  ) => {
    const res = await staffPortalService.sendMessage(convId, payload);
    if (res.success && res.data) {
      const confirmed = res.data;
      onPatchConversation(convId, (prev) => {
        const nextMsgs = appendOrReconcileStaffMessage(prev.messages, {
          ...confirmed,
          clientTempId: confirmed.clientTempId || payload.clientTempId,
        });
        return {
          ...prev,
          messages: nextMsgs,
          lastMessage: confirmed.isWhisper ? prev.lastMessage : confirmed.text,
          lastMessageTimestamp: confirmed.isWhisper
            ? prev.lastMessageTimestamp
            : confirmed.timestamp,
          unreadCount: 0,
        };
      });
    } else {
      const errText =
        res.error?.message || 'Message could not be delivered. Tap Retry.';
      setSendError(errText);
      onPatchConversation(convId, (prev) => ({
        ...prev,
        messages: prev.messages.map((m) =>
          m.id === optimisticMsg.id || m.clientTempId === payload.clientTempId
            ? { ...m, pending: false, failed: true, errorMessage: errText }
            : m
        ),
      }));
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeConv || isSending) return;
    const text = activeDraft.trim();
    if (!text && !pendingAttachment) return;

    const convId = activeConv.id;
    const msgType = pendingAttachment ? 'attachment' : 'text';
    const msgText = text || `Attached document: ${pendingAttachment?.name}`;
    const attachmentToSend = pendingAttachment;
    const attachmentId =
      attachmentToSend?.attachmentId || attachmentToSend?.id || undefined;
    const clientTempId = `tmp-stf-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 7)}`;
    const timeNow = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    const optimisticMsg: StaffChatMessage = {
      id: clientTempId,
      clientTempId,
      conversationId: convId,
      sender: 'agent',
      agentId: staff.id,
      agentName: staff.name,
      text: msgText,
      timestamp: timeNow,
      status: 'sent',
      type: msgType,
      attachmentId,
      attachment: attachmentToSend || undefined,
      isPrivateNote: isWhisperDraft,
      isWhisper: isWhisperDraft,
      pending: true,
      failed: false,
    };

    setSendError(null);
    setDraftForActive('');
    setPendingAttachment(null);
    setShowCannedMenu(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    staffAblyService.publishTyping(convId, staff.id, staff.name, false);
    staffPortalService.sendTyping(convId, false).catch(() => {});

    onPatchConversation(convId, (prev) => ({
      ...prev,
      messages: [...prev.messages, optimisticMsg],
      lastMessage: isWhisperDraft ? prev.lastMessage : msgText,
      lastMessageTimestamp: isWhisperDraft ? prev.lastMessageTimestamp : timeNow,
      unreadCount: 0,
    }));

    setIsSending(true);
    try {
      await dispatchMessagePayload(convId, optimisticMsg, {
        text: msgText,
        isWhisper: isWhisperDraft,
        type: msgType,
        attachmentId,
        attachment: attachmentToSend || undefined,
        clientTempId,
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleRetryFailedMessage = async (failedMsg: StaffChatMessage) => {
    if (!activeConv) return;
    const convId = activeConv.id;
    const clientTempId = failedMsg.clientTempId || failedMsg.id;

    setSendError(null);
    onPatchConversation(convId, (prev) => ({
      ...prev,
      messages: prev.messages.map((m) =>
        m.id === failedMsg.id
          ? { ...m, pending: true, failed: false, errorMessage: undefined }
          : m
      ),
    }));

    await dispatchMessagePayload(convId, failedMsg, {
      text: failedMsg.text,
      isWhisper: Boolean(failedMsg.isWhisper || failedMsg.isPrivateNote),
      type:
        failedMsg.type === 'attachment' || failedMsg.type === 'voice'
          ? failedMsg.type
          : 'text',
      attachmentId: failedMsg.attachmentId,
      attachment: failedMsg.attachment,
      voiceNote: failedMsg.voiceNote,
      clientTempId,
    });
  };

  const handleCommitEdit = async (msg: StaffChatMessage) => {
    if (!activeConv || !editingText.trim()) {
      setEditingMsgId(null);
      return;
    }
    const convId = activeConv.id;
    const res = await staffPortalService.editMessage(
      convId,
      msg.id,
      editingText.trim()
    );
    if (res.success && res.data) {
      onPatchConversation(convId, (prev) => ({
        ...prev,
        messages: prev.messages.map((m) =>
          m.id === msg.id ? { ...m, ...res.data } : m
        ),
      }));
      setEditingMsgId(null);
    } else {
      setSendError(res.error?.message || 'Unable to edit message on backend.');
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (!activeConv) return;
    const convId = activeConv.id;
    const res = await staffPortalService.deleteMessage(convId, msgId);
    if (res.success) {
      onPatchConversation(convId, (prev) => ({
        ...prev,
        messages: prev.messages.map((m) =>
          m.id === msgId
            ? { ...m, deletedAt: res.data?.deletedAt || new Date().toISOString() }
            : m
        ),
      }));
    } else {
      setSendError(res.error?.message || 'Unable to delete message on backend.');
    }
  };

  const handleReactMessage = async (msgId: string, emoji: string) => {
    setReactionPickerMsgId(null);
    if (!activeConv) return;
    const convId = activeConv.id;
    const res = await staffPortalService.reactToMessage(convId, msgId, emoji);
    if (res.success && res.data) {
      onPatchConversation(convId, (prev) => ({
        ...prev,
        messages: prev.messages.map((m) =>
          m.id === msgId ? { ...m, reactions: res.data!.reactions } : m
        ),
      }));
    } else {
      setSendError(res.error?.message || 'Reaction endpoint is not active.');
    }
  };

  const handleFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !activeConv) return;
    setUploadingFile(true);
    setSendError(null);
    try {
      const res = await staffPortalService.uploadAttachment(activeConv.id, file);
      if (res.success && res.data) {
        setPendingAttachment(res.data);
      } else {
        setSendError(
          res.error?.message || 'Attachment upload failed on backend server.'
        );
      }
    } finally {
      setUploadingFile(false);
    }
  };

  const handleOpenAttachment = async (msg: StaffChatMessage) => {
    const attachmentId =
      msg.attachmentId || msg.attachment?.attachmentId || msg.attachment?.id;
    let targetUrl =
      msg.attachment?.url && isSafeMediaUrl(msg.attachment.url)
        ? msg.attachment.url
        : undefined;

    if (attachmentId) {
      const res = await staffPortalService.getAttachmentUrl(attachmentId);
      if (res.success && res.data?.url) {
        targetUrl = res.data.url;
      } else if (!targetUrl) {
        setSendError(
          res.error?.message ||
            'Unable to generate secure download link for this attachment.'
        );
        return;
      }
    }

    if (!targetUrl || !isSafeMediaUrl(targetUrl)) {
      setSendError('No valid download link is attached to this file.');
      return;
    }

    const link = document.createElement('a');
    link.href = targetUrl;
    link.download = msg.attachment?.name || 'attachment';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleToggleVoiceNote = async () => {
    if (!activeConv) return;
    if (!isRecording) {
      if (
        typeof navigator === 'undefined' ||
        !navigator.mediaDevices?.getUserMedia
      ) {
        setSendError('Microphone capture is not supported in this browser.');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        audioChunksRef.current = [];
        recordingSecondsRef.current = 0;

        recorder.ondataavailable = (ev) => {
          if (ev.data.size > 0) audioChunksRef.current.push(ev.data);
        };
        recorder.start();
        mediaRecorderRef.current = recorder;
        setRecordingSeconds(0);
        setIsRecording(true);
        setSendError(null);
        recordingTimerRef.current = setInterval(() => {
          recordingSecondsRef.current += 1;
          setRecordingSeconds(recordingSecondsRef.current);
        }, 1000);
      } catch {
        setSendError('Microphone permission denied or unavailable.');
      }
      return;
    }

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setIsRecording(false);

    const convId = activeConv.id;
    const duration = Math.max(recordingSecondsRef.current, 1);
    const recorder = mediaRecorderRef.current;
    mediaRecorderRef.current = null;

    if (!recorder) return;

    recorder.onstop = async () => {
      const blob = new Blob(audioChunksRef.current, {
        type: recorder.mimeType || 'audio/webm',
      });
      recorder.stream.getTracks().forEach((t) => t.stop());
      if (blob.size === 0) return;

      const uploadRes = await staffPortalService.uploadVoiceNote(
        convId,
        blob,
        duration
      );
      if (!uploadRes.success || !uploadRes.data) {
        setSendError(
          uploadRes.error?.message || 'Voice note upload failed on backend.'
        );
        return;
      }

      const voiceNote = uploadRes.data;
      const attachmentId = voiceNote.attachmentId || voiceNote.id;
      const clientTempId = `tmp-stf-voice-${Date.now()}`;
      const timeNow = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      const text = `Voice note (${duration}s)`;
      const optimisticMsg: StaffChatMessage = {
        id: clientTempId,
        clientTempId,
        conversationId: convId,
        sender: 'agent',
        agentId: staff.id,
        agentName: staff.name,
        text,
        timestamp: timeNow,
        status: 'sent',
        type: 'voice',
        attachmentId,
        voiceNote,
        pending: true,
      };

      onPatchConversation(convId, (prev) => ({
        ...prev,
        messages: [...prev.messages, optimisticMsg],
        lastMessage: text,
        lastMessageTimestamp: timeNow,
      }));

      await dispatchMessagePayload(convId, optimisticMsg, {
        text,
        type: 'voice',
        attachmentId,
        voiceNote,
        clientTempId,
      });
    };

    try {
      recorder.stop();
    } catch {
      recorder.stream.getTracks().forEach((t) => t.stop());
    }
  };

  const handleToggleVoicePlayback = async (msg: StaffChatMessage) => {
    if (playingVoiceId === msg.id) {
      audioPlayerRef.current?.pause();
      setPlayingVoiceId(null);
      return;
    }

    const attachmentId =
      msg.attachmentId || msg.voiceNote?.attachmentId || msg.voiceNote?.id;
    let audioUrl =
      msg.voiceNote?.audioUrl && isSafeMediaUrl(msg.voiceNote.audioUrl)
        ? msg.voiceNote.audioUrl
        : undefined;

    if (attachmentId) {
      const res = await staffPortalService.getAttachmentUrl(attachmentId);
      if (res.success && res.data?.url) {
        audioUrl = res.data.url;
      }
    }

    if (!audioUrl || !isSafeMediaUrl(audioUrl)) {
      setSendError('Audio playback URL is unavailable for this voice note.');
      return;
    }

    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }

    const audio = new Audio(audioUrl);
    audioPlayerRef.current = audio;
    setPlayingVoiceId(msg.id);
    audio.onended = () => setPlayingVoiceId(null);
    audio.onerror = () => {
      setPlayingVoiceId(null);
      setSendError('Unable to decode or stream voice note audio.');
    };
    audio.play().catch(() => {
      setPlayingVoiceId(null);
    });
  };

  // Real WebRTC Call Lifecycle Handlers
  const handleStartCall = async (type: SupportCallType) => {
    if (!activeConv) return;
    setCallError(null);

    const res = await staffPortalService.startCall(activeConv.id, type);
    if (!res.success || !res.data) {
      setSendError(
        res.error?.message || 'Unable to start encrypted call session.'
      );
      return;
    }

    const call = res.data;
    createManagerForCall(call);
    setActiveCall(call);
    setCallPhase('outgoing_ringing');
  };

  const handleAcceptIncomingCall = async () => {
    if (!activeCall) return;
    setCallError(null);
    const manager = createManagerForCall(activeCall);
    try {
      await manager.initPeer(true);
    } catch (err: any) {
      setCallPhase('error');
      setCallError(
        err?.message ||
          'Microphone/camera permission is required to accept the call.'
      );
      return;
    }

    const res = await staffPortalService.acceptCall(activeCall.id);
    if (res.success && res.data) {
      setActiveCall(res.data);
      setCallPhase('connecting');
    } else {
      cleanupMediaAndCall();
      setCallPhase('error');
      setCallError(res.error?.message || 'Failed to accept call on backend.');
    }
  };

  const handleRejectIncomingCall = async () => {
    if (!activeCall) return;
    await staffPortalService.rejectCall(activeCall.id).catch(() => {});
    cleanupMediaAndCall();
    setActiveCall(null);
    setCallPhase('ended');
  };

  const handleEndActiveCall = async () => {
    const call = activeCall;
    cleanupMediaAndCall();
    setActiveCall(null);
    setCallPhase('ended');
    if (call?.id) {
      await staffPortalService.endCall(call.id).catch(() => {});
    }
  };

  // End Session Handler (Backend permanently closes session & releases capacity)
  const handleConfirmEndSession = async () => {
    if (!activeConv || isEndingSession) return;
    const convId = activeConv.id;
    setIsEndingSession(true);
    setEndSessionError(null);
    try {
      const res = await staffPortalService.endSession(convId);
      if (!res.success) {
        setEndSessionError(
          res.error?.message || 'Unable to close support session.'
        );
        return;
      }
      setShowEndSessionModal(false);
      cleanupMediaAndCall();
      setActiveCall(null);
      onRemoveConversation(convId);
    } finally {
      setIsEndingSession(false);
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
      {/* LEFT PANEL: Inbox */}
      <div
        className={`${
          mobileView === 'inbox' ? 'flex w-full md:w-auto' : 'hidden'
        } md:flex h-full min-h-0 shrink-0`}
      >
        <StaffInboxPanel
          conversations={activeConversations}
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
              {isLoadingData ? 'Loading inbox...' : 'No Active Conversations'}
            </div>
            <p className="text-xs text-neutral-500 max-w-sm">
              Assigned client consultations appear here automatically when routed
              to your desk.
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

                {/* Right Controls: Search, Calls, End Session, Customer Details, Minimize */}
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
                    onClick={() => handleStartCall('audio')}
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
                    onClick={() => handleStartCall('video')}
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
                    onClick={() => {
                      setEndSessionError(null);
                      setShowEndSessionModal(true);
                    }}
                    title="End Support Session"
                    aria-label="End Support Session"
                    className={`h-7 sm:h-8 px-2 rounded-lg border flex items-center gap-1 text-[11px] font-medium cursor-pointer transition-colors ${
                      isLight
                        ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                        : 'border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
                    }`}
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span className="hidden lg:inline">End Session</span>
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
                    title={
                      headerMinimized ? 'Expand title bar' : 'Minimize title bar'
                    }
                    aria-label={
                      headerMinimized ? 'Expand title bar' : 'Minimize title bar'
                    }
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
                  {isLoadingMessages && visibleMessages.length === 0 ? (
                    <div className="py-12 flex items-center justify-center gap-2 text-xs text-neutral-500">
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                      <span>Loading conversation messages...</span>
                    </div>
                  ) : visibleMessages.length === 0 ? (
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

                      const isWhisper = Boolean(
                        msg.isWhisper || msg.isPrivateNote
                      );

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
                                  onChange={(e) =>
                                    setEditingText(e.target.value)
                                  }
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
                                <p className="whitespace-pre-line">
                                  {msg.text}
                                </p>
                                {msg.attachment && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenAttachment(msg)}
                                    className="mt-2 w-full text-left px-2.5 py-1.5 rounded-lg bg-black/20 hover:bg-black/30 text-[11px] font-mono flex items-center justify-between gap-2 cursor-pointer transition-colors"
                                  >
                                    <span className="truncate">
                                      📎 {msg.attachment.name}{' '}
                                      {msg.attachment.size
                                        ? `(${msg.attachment.size})`
                                        : ''}
                                    </span>
                                    <Download className="w-3.5 h-3.5 shrink-0" />
                                  </button>
                                )}
                                {msg.voiceNote && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleToggleVoicePlayback(msg)
                                    }
                                    className="mt-2 w-full px-2.5 py-1.5 rounded-lg bg-black/20 hover:bg-black/30 text-[11px] font-mono flex items-center justify-between gap-2 cursor-pointer transition-colors"
                                  >
                                    <span className="flex items-center gap-1.5">
                                      {playingVoiceId === msg.id ? (
                                        <Pause className="w-3.5 h-3.5 shrink-0" />
                                      ) : (
                                        <Play className="w-3.5 h-3.5 shrink-0" />
                                      )}
                                      <span>
                                        Voice Note (
                                        {msg.voiceNote.durationSeconds}s)
                                      </span>
                                    </span>
                                    <span className="text-[10px] opacity-80">
                                      {playingVoiceId === msg.id
                                        ? 'Playing'
                                        : 'Play'}
                                    </span>
                                  </button>
                                )}
                              </>
                            )}
                          </div>

                          {/* Reactions + Read Receipt + Hover Message Actions / Retry */}
                          <div className="mt-1 flex items-center gap-2 text-[10px] text-neutral-500">
                            {isAgent && !msg.deletedAt && (
                              <span className="flex items-center gap-0.5 font-mono">
                                {msg.failed ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleRetryFailedMessage(msg)
                                    }
                                    className="flex items-center gap-1 text-rose-400 hover:text-rose-300 font-semibold cursor-pointer"
                                  >
                                    <RotateCcw className="w-3 h-3" />
                                    <span>Retry</span>
                                  </button>
                                ) : msg.pending ? (
                                  <span>Sending...</span>
                                ) : (
                                  <>
                                    {msg.status === 'read' ? (
                                      <CheckCheck className="w-3 h-3 text-emerald-400" />
                                    ) : msg.status === 'delivered' ? (
                                      <CheckCheck className="w-3 h-3 text-neutral-400" />
                                    ) : (
                                      <Check className="w-3 h-3" />
                                    )}
                                    <span>{msg.status}</span>
                                  </>
                                )}
                              </span>
                            )}

                            {msg.reactions && msg.reactions.length > 0 && (
                              <div className="flex items-center gap-1">
                                {msg.reactions.map((r) => (
                                  <button
                                    key={r.emoji}
                                    type="button"
                                    onClick={() =>
                                      handleReactMessage(msg.id, r.emoji)
                                    }
                                    className="px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-[10px] cursor-pointer"
                                  >
                                    {r.emoji} {r.count}
                                  </button>
                                ))}
                              </div>
                            )}

                            {!msg.deletedAt && !msg.pending && !msg.failed && (
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
                                        onClick={() =>
                                          handleReactMessage(msg.id, em)
                                        }
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
                          if (
                            e.key === 'Enter' &&
                            !e.shiftKey &&
                            !showCannedMenu
                          ) {
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
                          isSending ||
                          (!activeDraft.trim() && !pendingAttachment)
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
            const res = await staffPortalService.updateConversation(
              activeConv.id,
              {
                status: st,
              }
            );
            if (res.success) {
              onUpdateConversation({ ...activeConv, status: st });
            } else {
              setSendError(
                res.error?.message || 'Unable to update conversation status.'
              );
            }
          }}
          onSaveInternalNotes={async (notes) => {
            const res = await staffPortalService.updateConversation(
              activeConv.id,
              {
                internalNotes: notes,
              }
            );
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

      {/* Real WebRTC Voice / Video Call Overlay */}
      <SupportCallOverlay
        call={activeCall}
        phase={callPhase}
        peerName={
          activeConv?.customerName ||
          activeCall?.initiatorName ||
          'Private Client'
        }
        errorDetail={callError}
        localStream={localStream}
        remoteStream={remoteStream}
        onAccept={handleAcceptIncomingCall}
        onReject={handleRejectIncomingCall}
        onEnd={handleEndActiveCall}
        onDismiss={() => {
          cleanupMediaAndCall();
          setActiveCall(null);
          setCallPhase('ended');
          setCallError(null);
        }}
        onToggleMute={(muted) => callManagerRef.current?.setMuted(muted)}
        onToggleVideo={(enabled) =>
          callManagerRef.current?.setVideoEnabled(enabled)
        }
        theme={theme}
      />

      {/* End Session Confirmation Modal */}
      <EndSessionConfirmModal
        isOpen={showEndSessionModal}
        subject={
          activeConv
            ? `${activeConv.customerName} — ${activeConv.subject}`
            : undefined
        }
        isSubmitting={isEndingSession}
        errorMessage={endSessionError}
        role="staff"
        onCancel={() => {
          if (!isEndingSession) setShowEndSessionModal(false);
        }}
        onConfirm={handleConfirmEndSession}
        theme={theme}
      />
    </div>
  );
};
