import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MessageSquare,
  Send,
  Phone,
  Video,
  Search,
  Plus,
  Paperclip,
  CheckCheck,
  Check,
  FileText,
  Mic,
  Square,
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
  ArrowLeft,
  Clock,
  AlertCircle,
  Download,
  Loader2,
  LogOut,
  RotateCcw,
} from 'lucide-react';
import {
  SupportAgent,
  SupportMessage,
  SupportConversation,
  SupportTicket,
  TicketPriority,
  InquiryCategory,
  SupportCallSession,
  SupportCallType,
} from '../types/support';
import { ablyService } from '../services/ablyService';
import { SupportService, isSafeMediaUrl } from '../services/supportService';
import { WebRtcCallManager } from '../services/webrtcCallManager';
import { CustomerWelcomeModal } from './support/CustomerWelcomeModal';
import { AiChatWorkspace } from './support/AiChatWorkspace';
import { SupportCallOverlay, CallOverlayPhase } from './support/SupportCallOverlay';
import { EndSessionConfirmModal } from './support/EndSessionConfirmModal';
import {
  useResizablePaneWidth,
  ResizableSplitDivider,
} from './support/ResizableMessagingSplit';

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
  isLoadingConversations?: boolean;
  onUnreadChange?: (totalUnread: number) => void;
  onUpdateConversations?: (conversations: SupportConversation[]) => void;
  onCreateTicket?: (ticket: SupportTicket) => void;
  theme?: 'dark' | 'light';
}

function mergeConversationMessages(
  existing: SupportMessage[],
  incoming: SupportMessage[]
): SupportMessage[] {
  const byKey = new Map<string, SupportMessage>();
  const failedLocals: SupportMessage[] = [];

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
    byKey.set(srv.id, prev ? { ...prev, ...srv, pending: false, failed: false } : srv);
  }

  return [...Array.from(byKey.values()), ...failedLocals];
}

function appendOrReconcileMessage(
  existing: SupportMessage[],
  incoming: SupportMessage
): SupportMessage[] {
  const idx = existing.findIndex(
    (m) =>
      m.id === incoming.id ||
      (Boolean(incoming.clientTempId) &&
        (m.clientTempId === incoming.clientTempId || m.id === incoming.clientTempId))
  );
  if (idx >= 0) {
    const next = [...existing];
    next[idx] = { ...next[idx], ...incoming, pending: false, failed: false };
    return next;
  }
  return [...existing, incoming];
}

export const SupportView: React.FC<SupportViewProps> = ({
  staffList: propStaffList,
  conversations: propConversations,
  tickets: propTickets,
  currentCustomer,
  isLoadingConversations = false,
  onUnreadChange,
  onUpdateConversations,
  onCreateTicket,
  theme = 'dark',
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
  const splitContainerRef = useRef<HTMLDivElement | null>(null);
  const {
    width: supportListWidth,
    isDragging: isResizingSupportList,
    handlePointerDown: handleSupportSplitPointerDown,
    handleKeyDown: handleSupportSplitKeyDown,
    handleResetWidth: handleSupportSplitReset,
  } = useResizablePaneWidth({
    storageKey: 'aureus_customer_support_list_width',
    defaultWidth: 330,
    minWidth: 250,
    maxWidth: 520,
    minRemainingWidth: 380,
    containerRef: splitContainerRef,
  });

  const customerId = currentCustomer?.id || 'usr_alexander_wright';
  const customerName = currentCustomer?.name || 'Private Client';

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

  const customerConversations = conversations.filter(
    (c) => (!c.customerId || c.customerId === customerId) && c.status !== 'closed'
  );
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
    } else if (customerConversations.length === 0 && selectedConversationId) {
      setSelectedConversationId('');
    }
  }, [customerConversations, selectedConversationId]);

  const activeConversation =
    customerConversations.find((c) => c.id === selectedConversationId) || customerConversations[0];

  const activeConvIdRef = useRef<string>('');
  activeConvIdRef.current = activeConversation?.id || '';

  const staff = propStaffList || [];

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [ticketFilter, setTicketFilter] = useState<'All' | 'Open' | 'In Review' | 'Resolved'>('All');

  // Modals & Inputs
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [inputText, setInputText] = useState('');
  const [typingByConv, setTypingByConv] = useState<Record<string, { active: boolean; name?: string }>>({});
  const [actionNotice, setActionNotice] = useState<{ type: 'info' | 'error'; text: string } | null>(null);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  // Voice recording & playback state
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);

  // Real WebRTC Audio / Video call state
  const [activeCall, setActiveCall] = useState<SupportCallSession | null>(null);
  const [callPhase, setCallPhase] = useState<CallOverlayPhase>('ended');
  const [callError, setCallError] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  // End Session Confirmation state
  const [showEndSessionModal, setShowEndSessionModal] = useState(false);
  const [isEndingSession, setIsEndingSession] = useState(false);
  const [endSessionError, setEndSessionError] = useState<string | null>(null);

  // New ticket modal
  const [showCreateTicketModal, setShowCreateTicketModal] = useState(false);
  const [newTicketSubject, setNewTicketSubject] = useState('');
  const [newTicketCategory, setNewTicketCategory] = useState<SupportTicket['category']>('Wire Clearance');
  const [newTicketPriority, setNewTicketPriority] = useState<TicketPriority>('High');
  const [newTicketDesc, setNewTicketDesc] = useState('');

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingSecondsRef = useRef<number>(0);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const callManagerRef = useRef<WebRtcCallManager | null>(null);
  const activeCallRef = useRef<SupportCallSession | null>(null);
  activeCallRef.current = activeCall;
  const onUpdateConversationsRef = useRef(onUpdateConversations);
  onUpdateConversationsRef.current = onUpdateConversations;

  const isAgentTyping = Boolean(
    activeConversation && typingByConv[activeConversation.id]?.active
  );
  const typingAgentName = activeConversation
    ? typingByConv[activeConversation.id]?.name || activeConversation.agent.name
    : '';

  const applyConversationsUpdate = useCallback(
    (updater: (prev: SupportConversation[]) => SupportConversation[]) => {
      setConversations((prev) => {
        const next = updater(prev);
        onUpdateConversationsRef.current?.(next);
        return next;
      });
    },
    []
  );

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
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
          mediaRecorderRef.current.stop();
        } catch {
          // Ignore recorder teardown
        }
      }
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
      cleanupMediaAndCall();
    };
  }, [cleanupMediaAndCall]);

  // Auto scroll to latest message inside the chat feed only
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [activeConversation?.messages?.length, isAgentTyping]);

  // Synchronize unread count to parent
  useEffect(() => {
    const total = customerConversations.reduce((acc, c) => acc + c.unreadCount, 0);
    onUnreadChange?.(total);
  }, [customerConversations, onUnreadChange]);

  const fetchConversationMessages = useCallback(
    async (convId: string) => {
      if (!convId) return;
      setIsLoadingMessages(true);
      try {
        const res = await SupportService.getMessages(convId);
        if (res.success && res.data) {
          const serverMessages = res.data;
          applyConversationsUpdate((prev) =>
            prev.map((c) => {
              if (c.id !== convId) return c;
              const merged = mergeConversationMessages(c.messages, serverMessages);
              const latest = merged[merged.length - 1];
              return {
                ...c,
                messages: merged,
                lastMessage: latest?.text || c.lastMessage,
                lastMessageTimestamp: latest?.timestamp || c.lastMessageTimestamp,
              };
            })
          );
          if (serverMessages.some((m) => m.sender === 'agent' && m.status !== 'read')) {
            SupportService.markRead(convId).catch(() => {});
          }
        }
      } finally {
        setIsLoadingMessages(false);
      }
    },
    [applyConversationsUpdate]
  );

  // Load persisted messages + active call status whenever active conversation changes
  useEffect(() => {
    if (!activeConversation?.id) return;
    const convId = activeConversation.id;
    fetchConversationMessages(convId);

    SupportService.listCalls(convId).then((res) => {
      if (!res.success || !res.data || activeConvIdRef.current !== convId) return;
      const incoming = res.data.find(
        (c) => c.status === 'ringing' && c.initiatorId && c.initiatorId !== customerId
      );
      if (incoming && !activeCallRef.current) {
        setActiveCall(incoming);
        setCallPhase('incoming_ringing');
        setCallError(null);
      }
    });
  }, [activeConversation?.id, customerId, fetchConversationMessages]);

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
            SupportService.sendCallSignal(call.id, {
              ...signal,
              fromUserId: customerId,
            }).catch(() => {});
          },
        },
        call.iceServers
      );
      callManagerRef.current = manager;
      return manager;
    },
    [cleanupMediaAndCall, customerId]
  );

  // Subscribe to Ably Realtime for all active/waiting customer conversations
  const activeConvIdsKey = customerConversations.map((c) => c.id).join(',');

  useEffect(() => {
    const convIds = activeConvIdsKey ? activeConvIdsKey.split(',') : [];
    if (convIds.length === 0 || !customerId) return;

    const unsubscribers = convIds.map((convId) =>
      ablyService.subscribeConversation(convId, { id: customerId, name: customerName }, {
        onMessageNew: (incomingMsg) => {
          const isCurrentlyViewing = activeConvIdRef.current === convId;
          applyConversationsUpdate((prev) =>
            prev.map((c) => {
              if (c.id !== convId) return c;
              const nextMessages = appendOrReconcileMessage(c.messages, incomingMsg);
              return {
                ...c,
                messages: nextMessages,
                lastMessage: incomingMsg.text,
                lastMessageTimestamp: incomingMsg.timestamp,
                unreadCount:
                  incomingMsg.sender === 'agent' && !isCurrentlyViewing
                    ? c.unreadCount + 1
                    : isCurrentlyViewing
                    ? 0
                    : c.unreadCount,
              };
            })
          );

          if (incomingMsg.sender === 'agent') {
            SupportService.markDelivered(convId, incomingMsg.id).catch(() => {});
            if (isCurrentlyViewing) {
              SupportService.markRead(convId, incomingMsg.id).catch(() => {});
            }
          }
        },
        onTyping: (_userId, isTyping, name) => {
          setTypingByConv((prev) => ({
            ...prev,
            [convId]: { active: isTyping, name },
          }));
        },
        onReceipt: (messageId, status) => {
          applyConversationsUpdate((prev) =>
            prev.map((c) =>
              c.id === convId
                ? {
                    ...c,
                    messages: c.messages.map((m) =>
                      m.id === messageId ? { ...m, status } : m
                    ),
                  }
                : c
            )
          );
        },
        onConversationUpdated: (patch) => {
          applyConversationsUpdate((prev) =>
            prev.map((c) => {
              if (c.id !== convId) return c;
              return {
                ...c,
                status: patch.status || c.status,
                agent: patch.agent ? { ...c.agent, ...patch.agent } : c.agent,
                assignedStaffId: patch.agent?.id || c.assignedStaffId,
                department: patch.agent?.department || c.department,
                queuePosition:
                  patch.queuePosition !== undefined ? patch.queuePosition : c.queuePosition,
              };
            })
          );
        },
        onSessionEnded: () => {
          applyConversationsUpdate((prev) => prev.filter((c) => c.id !== convId));
          if (activeConvIdRef.current === convId) {
            setSelectedConversationId('');
            setShowEndSessionModal(false);
            cleanupMediaAndCall();
            setActiveCall(null);
            setActionNotice({
              type: 'info',
              text: 'Your support session has been closed. Start a new inquiry anytime.',
            });
          }
        },
        onCallEvent: (eventType, call) => {
          if (eventType === 'incoming') {
            if (call.initiatorId === customerId || activeCallRef.current?.id === call.id) return;
            setActiveCall(call);
            setCallPhase('incoming_ringing');
            setCallError(null);
          } else if (eventType === 'accepted') {
            if (activeCallRef.current?.id === call.id) {
              setActiveCall((prev) => (prev ? { ...prev, status: 'accepted' } : call));
              setCallPhase('connecting');
              if (call.initiatorId === customerId || !callManagerRef.current) {
                const mgr = callManagerRef.current || createManagerForCall(call);
                mgr.createAndSendOffer().catch((err) => {
                  setCallPhase('error');
                  setCallError(err?.message || 'Microphone/camera access denied.');
                });
              }
            }
          } else if (eventType === 'rejected') {
            if (activeCallRef.current?.id === call.id) {
              cleanupMediaAndCall();
              setCallPhase('rejected');
              setCallError('The specialist is unavailable or declined the call.');
            }
          } else if (eventType === 'ended') {
            if (activeCallRef.current?.id === call.id) {
              cleanupMediaAndCall();
              setCallPhase('ended');
            }
          }
        },
        onCallSignal: (signal) => {
          if (activeCallRef.current?.id === signal.callId && callManagerRef.current) {
            callManagerRef.current.handleSignal(signal).catch((err) => {
              setCallPhase('error');
              setCallError(err?.message || 'WebRTC signaling error.');
            });
          }
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
    customerId,
    customerName,
    applyConversationsUpdate,
    cleanupMediaAndCall,
    createManagerForCall,
    fetchConversationMessages,
  ]);

  // Mark conversation as read on select
  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id);
    setMobilePane('chat');
    setActionNotice(null);
    const target = conversations.find((c) => c.id === id);
    if (target && target.unreadCount > 0) {
      applyConversationsUpdate((prev) =>
        prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c))
      );
      SupportService.markRead(id).catch(() => {});
      SupportService.updateConversation(id, { unreadCount: 0 }).catch(() => {});
    }
  };

  // Start or open conversation when clicking a specialist card
  const handleSelectStaffMember = async (agent: SupportAgent) => {
    const existing = customerConversations.find((c) => c.agent.id === agent.id);
    if (existing) {
      handleSelectConversation(existing.id);
      return;
    }

    const res = await SupportService.createConversation({
      category: 'General Support',
      subject: `Private Consultation with ${agent.name}`,
      initialMessage: `Hello ${agent.name}, I would like to initiate a consultation.`,
      preferredStaffId: agent.id,
    });

    if (res.success && res.data) {
      const newConv = res.data;
      applyConversationsUpdate((prev) =>
        prev.some((c) => c.id === newConv.id) ? prev : [newConv, ...prev]
      );
      setSelectedConversationId(newConv.id);
      setMobilePane('chat');
      setActionNotice(null);
    } else {
      setActionNotice({
        type: 'error',
        text: res.error?.message || 'Unable to start conversation with backend server.',
      });
    }
  };

  const handleInputTextChange = (val: string) => {
    setInputText(val);
    if (!activeConversation) return;
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    if (val.trim().length > 0) {
      SupportService.sendTyping(activeConversation.id, true).catch(() => {});
      typingTimeoutRef.current = setTimeout(() => {
        SupportService.sendTyping(activeConversation.id, false).catch(() => {});
      }, 2500);
    } else {
      SupportService.sendTyping(activeConversation.id, false).catch(() => {});
    }
  };

  const dispatchMessagePayload = async (
    convId: string,
    optimisticMsg: SupportMessage,
    payload: {
      text: string;
      type?: 'text' | 'attachment' | 'voice';
      attachmentId?: string;
      attachment?: SupportMessage['attachment'];
      voiceNote?: SupportMessage['voiceNote'];
      clientTempId: string;
    }
  ) => {
    const res = await SupportService.sendMessage(convId, payload);
    if (res.success && res.data) {
      const confirmed = res.data;
      applyConversationsUpdate((prev) =>
        prev.map((c) => {
          if (c.id !== convId) return c;
          const nextMsgs = appendOrReconcileMessage(c.messages, {
            ...confirmed,
            clientTempId: confirmed.clientTempId || payload.clientTempId,
          });
          return {
            ...c,
            messages: nextMsgs,
            lastMessage: confirmed.text,
            lastMessageTimestamp: confirmed.timestamp,
          };
        })
      );
    } else {
      applyConversationsUpdate((prev) =>
        prev.map((c) =>
          c.id === convId
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === optimisticMsg.id || m.clientTempId === payload.clientTempId
                    ? {
                        ...m,
                        pending: false,
                        failed: true,
                        errorMessage:
                          res.error?.message || 'Message failed to send. Tap Retry.',
                      }
                    : m
                ),
              }
            : c
        )
      );
    }
  };

  // Send Message from Customer (Express persists first, Ably distributes after)
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !activeConversation) return;

    const convId = activeConversation.id;
    const text = inputText.trim();
    const clientTempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const optimisticMsg: SupportMessage = {
      id: clientTempId,
      clientTempId,
      conversationId: convId,
      sender: 'customer',
      text,
      timestamp: timeNow,
      status: 'sent',
      type: 'text',
      pending: true,
      failed: false,
    };

    setInputText('');
    setActionNotice(null);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    SupportService.sendTyping(convId, false).catch(() => {});

    applyConversationsUpdate((prev) =>
      prev.map((c) =>
        c.id === convId
          ? {
              ...c,
              messages: [...c.messages, optimisticMsg],
              lastMessage: text,
              lastMessageTimestamp: timeNow,
              unreadCount: 0,
            }
          : c
      )
    );

    await dispatchMessagePayload(convId, optimisticMsg, {
      text,
      type: 'text',
      clientTempId,
    });
  };

  const handleRetryFailedMessage = async (failedMsg: SupportMessage) => {
    if (!activeConversation) return;
    const convId = activeConversation.id;
    const clientTempId = failedMsg.clientTempId || failedMsg.id;

    applyConversationsUpdate((prev) =>
      prev.map((c) =>
        c.id === convId
          ? {
              ...c,
              messages: c.messages.map((m) =>
                m.id === failedMsg.id ? { ...m, pending: true, failed: false, errorMessage: undefined } : m
              ),
            }
          : c
      )
    );

    await dispatchMessagePayload(convId, failedMsg, {
      text: failedMsg.text,
      type: failedMsg.type === 'attachment' || failedMsg.type === 'voice' ? failedMsg.type : 'text',
      attachmentId: failedMsg.attachmentId,
      attachment: failedMsg.attachment,
      voiceNote: failedMsg.voiceNote,
      clientTempId,
    });
  };

  // Real File Attachment Upload
  const handleFileAttachmentSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !activeConversation) return;

    const convId = activeConversation.id;
    setUploadingAttachment(true);
    setActionNotice(null);
    try {
      const uploadRes = await SupportService.uploadAttachment(convId, file, {
        fileName: file.name,
        type: 'attachment',
      });
      if (!uploadRes.success || !uploadRes.data?.attachment) {
        setActionNotice({
          type: 'error',
          text: uploadRes.error?.message || 'Attachment upload failed.',
        });
        return;
      }

      const { attachmentId, attachment } = uploadRes.data;
      const clientTempId = `tmp-att-${Date.now()}`;
      const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const text = `Attached document: ${attachment.name}`;
      const optimisticMsg: SupportMessage = {
        id: clientTempId,
        clientTempId,
        conversationId: convId,
        sender: 'customer',
        text,
        timestamp: timeNow,
        status: 'sent',
        type: 'attachment',
        attachmentId,
        attachment,
        pending: true,
      };

      applyConversationsUpdate((prev) =>
        prev.map((c) =>
          c.id === convId
            ? {
                ...c,
                messages: [...c.messages, optimisticMsg],
                lastMessage: text,
                lastMessageTimestamp: timeNow,
              }
            : c
        )
      );

      await dispatchMessagePayload(convId, optimisticMsg, {
        text,
        type: 'attachment',
        attachmentId,
        attachment,
        clientTempId,
      });
    } finally {
      setUploadingAttachment(false);
    }
  };

  // Protected Attachment Download via Signed URL
  const handleOpenAttachment = async (msg: SupportMessage) => {
    const attachmentId = msg.attachmentId || msg.attachment?.attachmentId || msg.attachment?.id;
    let targetUrl = msg.attachment?.url && isSafeMediaUrl(msg.attachment.url) ? msg.attachment.url : undefined;

    if (attachmentId) {
      const res = await SupportService.getAttachmentUrl(attachmentId);
      if (res.success && res.data?.url) {
        targetUrl = res.data.url;
      } else if (!targetUrl) {
        setActionNotice({
          type: 'error',
          text: res.error?.message || 'Unable to generate secure download link for this attachment.',
        });
        return;
      }
    }

    if (!targetUrl || !isSafeMediaUrl(targetUrl)) {
      setActionNotice({
        type: 'error',
        text: 'No valid download link is attached to this file yet.',
      });
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

  // Real MediaRecorder Voice Note Capture + Playback
  const handleToggleVoiceRecording = async () => {
    if (!activeConversation) return;

    if (!isRecordingVoice) {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setActionNotice({
          type: 'error',
          text: 'Microphone audio capture is not supported in this browser.',
        });
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
        setIsRecordingVoice(true);
        setActionNotice(null);

        recordingTimerRef.current = setInterval(() => {
          recordingSecondsRef.current += 1;
          setRecordingSeconds(recordingSecondsRef.current);
        }, 1000);
      } catch {
        setActionNotice({
          type: 'error',
          text: 'Microphone permission denied or no input device available.',
        });
      }
      return;
    }

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setIsRecordingVoice(false);

    const convId = activeConversation.id;
    const duration = Math.max(recordingSecondsRef.current, 1);
    const recorder = mediaRecorderRef.current;
    mediaRecorderRef.current = null;

    if (!recorder) return;

    recorder.onstop = async () => {
      const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
      recorder.stream.getTracks().forEach((t) => t.stop());

      if (blob.size === 0) return;

      const uploadRes = await SupportService.uploadAttachment(convId, blob, {
        fileName: `voice-dispatch-${Date.now()}.webm`,
        type: 'voice',
        durationSeconds: duration,
      });

      if (!uploadRes.success || !uploadRes.data?.voiceNote) {
        setActionNotice({
          type: 'error',
          text: uploadRes.error?.message || 'Voice note upload failed.',
        });
        return;
      }

      const { attachmentId, voiceNote } = uploadRes.data;
      const clientTempId = `tmp-voice-${Date.now()}`;
      const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const text = `Voice dispatch (${duration}s)`;
      const optimisticMsg: SupportMessage = {
        id: clientTempId,
        clientTempId,
        conversationId: convId,
        sender: 'customer',
        text,
        timestamp: timeNow,
        status: 'sent',
        type: 'voice',
        attachmentId,
        voiceNote,
        pending: true,
      };

      applyConversationsUpdate((prev) =>
        prev.map((c) =>
          c.id === convId
            ? {
                ...c,
                messages: [...c.messages, optimisticMsg],
                lastMessage: text,
                lastMessageTimestamp: timeNow,
              }
            : c
        )
      );

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

  const handleToggleVoicePlayback = async (msg: SupportMessage) => {
    if (playingVoiceId === msg.id) {
      audioPlayerRef.current?.pause();
      setPlayingVoiceId(null);
      return;
    }

    const attachmentId = msg.attachmentId || msg.voiceNote?.attachmentId || msg.voiceNote?.id;
    let audioUrl =
      msg.voiceNote?.audioUrl && isSafeMediaUrl(msg.voiceNote.audioUrl)
        ? msg.voiceNote.audioUrl
        : undefined;

    if (attachmentId) {
      const res = await SupportService.getAttachmentUrl(attachmentId);
      if (res.success && res.data?.url) {
        audioUrl = res.data.url;
      }
    }

    if (!audioUrl || !isSafeMediaUrl(audioUrl)) {
      setActionNotice({
        type: 'error',
        text: 'Audio playback URL is unavailable for this voice note.',
      });
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
      setActionNotice({
        type: 'error',
        text: 'Unable to decode or stream voice note audio.',
      });
    };
    audio.play().catch(() => {
      setPlayingVoiceId(null);
    });
  };

  // Real WebRTC Call Lifecycle Handlers
  const handleStartCall = async (type: SupportCallType) => {
    if (!activeConversation) return;
    setCallError(null);

    const res = await SupportService.startCall(activeConversation.id, type);
    if (!res.success || !res.data) {
      setActionNotice({
        type: 'error',
        text: res.error?.message || 'Unable to start encrypted call session.',
      });
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
      setCallError(err?.message || 'Microphone/camera access is required to accept the call.');
      return;
    }

    const res = await SupportService.acceptCall(activeCall.id);
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
    await SupportService.rejectCall(activeCall.id).catch(() => {});
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
      await SupportService.endCall(call.id).catch(() => {});
    }
  };

  // End Support Session (Customer)
  const handleConfirmEndSession = async () => {
    if (!activeConversation || isEndingSession) return;
    const convId = activeConversation.id;
    setIsEndingSession(true);
    setEndSessionError(null);

    try {
      const res = await SupportService.endSession(convId);
      if (res.success) {
        setShowEndSessionModal(false);
        cleanupMediaAndCall();
        setActiveCall(null);
        applyConversationsUpdate((prev) => prev.filter((c) => c.id !== convId));
        setSelectedConversationId('');
        setActionNotice({
          type: 'info',
          text: 'Support session ended cleanly. You can initiate a new inquiry anytime.',
        });
      } else {
        setEndSessionError(
          res.error?.message || 'Unable to close support session on backend.'
        );
      }
    } finally {
      setIsEndingSession(false);
    }
  };

  // New Inquiry Flow completion (POST /api/support/conversations)
  const handleStartInquiry = async (params: {
    category: InquiryCategory;
    subject: string;
    initialMessage: string;
    preferredStaffId?: string;
  }): Promise<{ ok: boolean; error?: string }> => {
    const res = await SupportService.createConversation(params);

    if (res.success && res.data) {
      const newConv = res.data;
      applyConversationsUpdate((prev) =>
        prev.some((c) => c.id === newConv.id) ? prev : [newConv, ...prev]
      );
      setSelectedConversationId(newConv.id);
      setActiveSubTab('chat');
      setMobilePane('chat');
      setActionNotice(null);
      return { ok: true };
    }

    return {
      ok: false,
      error: res.error?.message || 'Failed to create inquiry on backend.',
    };
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
      description: newTicketDesc.trim(),
    });

    if (res.success && res.data) {
      setTickets((prev) => [res.data!, ...prev]);
      onCreateTicket?.(res.data);
      setShowCreateTicketModal(false);
      setNewTicketSubject('');
      setNewTicketDesc('');
    } else {
      setActionNotice({
        type: 'error',
        text: res.error?.message || 'Unable to submit support ticket.',
      });
    }
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
          ref={splitContainerRef}
          className={`flex-1 min-h-0 rounded-2xl border shadow-xl overflow-hidden flex flex-col lg:flex-row ${
            isLight ? 'bg-white border-slate-200' : 'bg-neutral-900 border-neutral-800'
          }`}
        >
          {/* Inner Support Sidebar (Expanded by default, Manual Collapse/Expand Toggle on desktop; dedicated pane on mobile) */}
          <div
            style={
              !isInnerSidebarCollapsed
                ? ({ '--support-list-w': `${supportListWidth}px` } as React.CSSProperties)
                : undefined
            }
            className={`${
              mobilePane === 'list' ? 'flex flex-1 lg:flex-none' : 'hidden lg:flex'
            } ${
              isInnerSidebarCollapsed
                ? 'w-full lg:w-[68px] lg:border-r'
                : 'w-full lg:w-[var(--support-list-w)]'
            } shrink-0 flex-col min-h-0 ${
              isResizingSupportList ? 'transition-none' : 'transition-[width] duration-200'
            } overflow-hidden ${
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

                      {isLoadingConversations ? (
                        <div className="p-4 text-center text-xs text-neutral-500">
                          Loading active conversations...
                        </div>
                      ) : filteredConversations.length === 0 ? (
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
                                        : conv.status === 'waiting' || conv.status === 'pending'
                                        ? 'bg-amber-500/10 text-amber-500'
                                        : 'bg-sky-500/10 text-sky-500'
                                    }`}
                                  >
                                    {conv.status === 'waiting' ? 'In Queue' : conv.status}
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

          {!isInnerSidebarCollapsed && (
            <ResizableSplitDivider
              isDragging={isResizingSupportList}
              onPointerDown={handleSupportSplitPointerDown}
              onKeyDown={handleSupportSplitKeyDown}
              onDoubleClick={handleSupportSplitReset}
              currentWidth={supportListWidth}
              minWidth={250}
              maxWidth={520}
              breakpoint="lg"
              isLight={isLight}
              ariaLabel="Resize support queue and active chat panels"
            />
          )}

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
                      onClick={() => handleStartCall('audio')}
                      className={`p-1.5 sm:p-2 rounded-xl border text-neutral-400 hover:text-emerald-500 transition-colors cursor-pointer ${
                        isLight ? 'border-slate-200 hover:bg-slate-100' : 'border-neutral-800 hover:bg-neutral-800'
                      }`}
                      title="Encrypted Voice Call"
                      aria-label="Encrypted Voice Call"
                    >
                      <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStartCall('video')}
                      className={`p-1.5 sm:p-2 rounded-xl border text-neutral-400 hover:text-emerald-500 transition-colors cursor-pointer ${
                        isLight ? 'border-slate-200 hover:bg-slate-100' : 'border-neutral-800 hover:bg-neutral-800'
                      }`}
                      title="Video Consultation"
                      aria-label="Video Consultation"
                    >
                      <Video className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEndSessionError(null);
                        setShowEndSessionModal(true);
                      }}
                      className={`px-2 sm:px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                        isLight
                          ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                          : 'border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
                      }`}
                      title="End Support Session"
                    >
                      <LogOut className="w-3.5 h-3.5 shrink-0" />
                      <span className="hidden sm:inline">End Session</span>
                    </button>
                  </div>
                </div>

                {/* Waiting Queue Banner */}
                {activeConversation.status === 'waiting' && (
                  <div
                    className={`px-3 sm:px-4 py-2 border-b text-xs flex items-center justify-between gap-2 shrink-0 ${
                      isLight
                        ? 'bg-amber-50 border-amber-200 text-amber-900'
                        : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="truncate">
                        Waiting in priority queue for the next available online specialist
                        {typeof activeConversation.queuePosition === 'number'
                          ? ` (Position #${activeConversation.queuePosition})`
                          : ''}
                        . You can still leave details below.
                      </span>
                    </div>
                  </div>
                )}

                {/* Inline Notice / Error Banner */}
                {actionNotice && (
                  <div
                    className={`px-3 sm:px-4 py-2 border-b text-xs flex items-center justify-between gap-2 shrink-0 ${
                      actionNotice.type === 'error'
                        ? isLight
                          ? 'bg-rose-50 border-rose-200 text-rose-800'
                          : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                        : isLight
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{actionNotice.text}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActionNotice(null)}
                      className="p-0.5 opacity-70 hover:opacity-100 cursor-pointer shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Independently Scrollable Messages Feed */}
                <div className="flex-1 min-h-0 p-3 sm:p-5 overflow-y-auto space-y-3.5 sm:space-y-4">
                  {isLoadingMessages && activeConversation.messages.length === 0 && (
                    <div className="flex items-center justify-center gap-2 py-8 text-xs text-neutral-400">
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                      <span>Synchronizing conversation history...</span>
                    </div>
                  )}

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
                            msg.failed
                              ? 'bg-rose-950/70 border border-rose-500/50 text-rose-100 rounded-br-xs'
                              : isClient
                              ? 'bg-emerald-600 text-neutral-950 font-medium rounded-br-xs'
                              : isLight
                              ? 'bg-slate-100 text-slate-900 border border-slate-200 rounded-bl-xs'
                              : 'bg-neutral-800 text-neutral-100 border border-neutral-700/60 rounded-bl-xs'
                          }`}
                        >
                          <p className="whitespace-pre-line">{msg.text}</p>

                          {msg.attachment && (
                            <button
                              type="button"
                              onClick={() => handleOpenAttachment(msg)}
                              className="mt-2 pt-2 border-t border-black/15 flex items-center gap-2 text-[11px] w-full text-left hover:opacity-80 cursor-pointer"
                            >
                              <FileText className="w-4 h-4 shrink-0" />
                              <span className="font-semibold underline truncate flex-1">
                                {msg.attachment.name}
                              </span>
                              {msg.attachment.size && (
                                <span className="opacity-70 shrink-0">({msg.attachment.size})</span>
                              )}
                              <Download className="w-3.5 h-3.5 shrink-0" />
                            </button>
                          )}

                          {msg.voiceNote && (
                            <div className="mt-2 p-2 rounded-xl bg-black/15 flex items-center gap-2.5">
                              <button
                                type="button"
                                onClick={() => handleToggleVoicePlayback(msg)}
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
                                    className={`h-full bg-emerald-300 rounded-full transition-all ${
                                      playingVoiceId === msg.id ? 'w-full animate-pulse' : 'w-1/3'
                                    }`}
                                  />
                                </div>
                              </div>
                              <span className="font-mono text-[10px]">
                                {msg.voiceNote.durationSeconds}s
                              </span>
                            </div>
                          )}
                        </div>

                        {isClient && (
                          <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-neutral-500 font-mono">
                            {msg.failed ? (
                              <>
                                <span className="text-rose-400">
                                  {msg.errorMessage || 'Failed to send'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRetryFailedMessage(msg)}
                                  className="text-emerald-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                                >
                                  <RotateCcw className="w-2.5 h-2.5" />
                                  <span>Retry</span>
                                </button>
                              </>
                            ) : msg.pending ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin text-emerald-500" />
                                <span>sending</span>
                              </>
                            ) : (
                              <>
                                {msg.status === 'sent' ? (
                                  <Check className="w-3 h-3 text-neutral-400" />
                                ) : (
                                  <CheckCheck
                                    className={`w-3 h-3 ${
                                      msg.status === 'read' ? 'text-emerald-400' : 'text-neutral-400'
                                    }`}
                                  />
                                )}
                                <span>{msg.status}</span>
                              </>
                            )}
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
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        onChange={handleFileAttachmentSelected}
                      />

                      <button
                        type="button"
                        disabled={uploadingAttachment}
                        onClick={() => fileInputRef.current?.click()}
                        title="Attach Document"
                        className={`p-1.5 sm:p-2 rounded-xl text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer shrink-0 disabled:opacity-40 ${
                          isLight ? 'hover:bg-slate-200 hover:text-slate-700' : 'hover:bg-neutral-800'
                        }`}
                      >
                        {uploadingAttachment ? (
                          <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                        ) : (
                          <Paperclip className="w-4 h-4" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleToggleVoiceRecording}
                        title={
                          isRecordingVoice
                            ? `Stop & send voice dispatch (${recordingSeconds}s)`
                            : 'Record Voice Note'
                        }
                        className={`p-1.5 sm:p-2 rounded-xl transition-all cursor-pointer shrink-0 ${
                          isRecordingVoice
                            ? 'bg-rose-500 text-white animate-pulse'
                            : isLight
                            ? 'text-neutral-500 hover:bg-slate-200'
                            : 'text-neutral-400 hover:bg-neutral-800'
                        }`}
                      >
                        {isRecordingVoice ? (
                          <Square className="w-4 h-4" />
                        ) : (
                          <Mic className="w-4 h-4" />
                        )}
                      </button>

                      <input
                        type="text"
                        placeholder={
                          isRecordingVoice
                            ? `Recording (${recordingSeconds}s)... tap stop to send`
                            : activeConversation.status === 'waiting'
                            ? 'Send details while waiting for specialist assignment...'
                            : `Message ${activeConversation.agent.name}...`
                        }
                        value={inputText}
                        onChange={(e) => handleInputTextChange(e.target.value)}
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
                {actionNotice && (
                  <div
                    className={`max-w-md px-3.5 py-2 rounded-xl border text-xs ${
                      actionNotice.type === 'error'
                        ? isLight
                          ? 'bg-rose-50 border-rose-200 text-rose-800'
                          : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                        : isLight
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    }`}
                  >
                    {actionNotice.text}
                  </div>
                )}
                <p className="text-sm font-medium">
                  {customerConversations.length === 0
                    ? 'No active support session — start a new inquiry to connect with a specialist'
                    : 'Select a private banking specialist to begin'}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {customerConversations.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setMobilePane('list')}
                      className={`lg:hidden px-4 py-2 rounded-xl border font-semibold text-xs cursor-pointer ${
                        isLight ? 'border-slate-300 bg-slate-100 text-slate-800' : 'border-neutral-700 bg-neutral-800 text-neutral-100'
                      }`}
                    >
                      Browse Specialists
                    </button>
                  )}
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

      {/* Real-Time WebRTC Audio / Video Call Overlay */}
      <SupportCallOverlay
        call={activeCall}
        phase={callPhase}
        peerName={activeConversation?.agent.name || activeCall?.initiatorName || 'Support Specialist'}
        errorDetail={callError}
        localStream={localStream}
        remoteStream={remoteStream}
        onAccept={handleAcceptIncomingCall}
        onReject={handleRejectIncomingCall}
        onEnd={handleEndActiveCall}
        onDismiss={() => {
          cleanupMediaAndCall();
          setActiveCall(null);
        }}
        onToggleMute={(muted) => callManagerRef.current?.setMuted(muted)}
        onToggleVideo={(enabled) => callManagerRef.current?.setVideoEnabled(enabled)}
        theme={theme}
      />

      {/* End Session Confirmation Modal */}
      <EndSessionConfirmModal
        isOpen={showEndSessionModal}
        subject={activeConversation?.subject}
        isSubmitting={isEndingSession}
        errorMessage={endSessionError}
        role="customer"
        onCancel={() => {
          setShowEndSessionModal(false);
          setEndSessionError(null);
        }}
        onConfirm={handleConfirmEndSession}
        theme={theme}
      />

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
