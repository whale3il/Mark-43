import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Plus,
  Send,
  Trash2,
  Edit2,
  Check,
  X,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  AlertCircle,
  Copy,
  CornerDownLeft,
  Link2,
  RotateCcw,
  MessageSquare,
  ArrowLeft,
  ChevronRight
} from 'lucide-react';
import {
  AiChatConversation,
  AiChatMessage,
  SupportAgent,
  SupportConversation
} from '../../types/support';
import { aiSupportService } from '../../services/aiSupportService';

interface AiChatWorkspaceProps {
  scope: 'client' | 'staff';
  userId: string;
  userName: string;
  currentStaff?: SupportAgent;
  supportConversations: SupportConversation[];
  initialLinkedSupportConversationId?: string;
  onInsertReply?: (text: string, targetSupportConversationId?: string) => void;
  theme?: 'dark' | 'light';
}

export const AiChatWorkspace: React.FC<AiChatWorkspaceProps> = ({
  scope,
  userId,
  userName,
  currentStaff,
  supportConversations,
  initialLinkedSupportConversationId,
  onInsertReply,
  theme = 'dark'
}) => {
  const isLight = theme === 'light';

  const [conversations, setConversations] = useState<AiChatConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string>('');
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [errorState, setErrorState] = useState<{
    message: string;
    code?: string;
    failedPrompt?: string;
  } | null>(null);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [mobilePane, setMobilePane] = useState<'chat' | 'list'>('chat');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [inputValue, setInputValue] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>('');
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Hydrate AI conversation history from centralized AI service
  useEffect(() => {
    let mounted = true;
    const loadConversations = async () => {
      setIsInitializing(true);
      try {
        const res = await aiSupportService.listConversations(scope, userId);
        if (!mounted) return;
        if (res.success && res.data) {
          setConversations(res.data);
          if (res.data.length > 0) {
            const linkedMatch = initialLinkedSupportConversationId
              ? res.data.find(
                  (c) => c.linkedSupportConversationId === initialLinkedSupportConversationId
                )
              : undefined;
            setActiveConversationId((prev) =>
              prev && res.data!.some((c) => c.id === prev)
                ? prev
                : linkedMatch?.id || res.data![0].id
            );
          }
        }
      } catch (err: any) {
        if (mounted) {
          setErrorState({
            code: 'INIT_ERROR',
            message: err?.message || 'Unable to load AI conversation history.'
          });
        }
      } finally {
        if (mounted) setIsInitializing(false);
      }
    };

    loadConversations();
    return () => {
      mounted = false;
    };
  }, [scope, userId, initialLinkedSupportConversationId]);

  const activeConversation =
    conversations.find((c) => c.id === activeConversationId) || conversations[0] || null;

  // Automatic scrolling on new messages, loading indicator, or error display
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [activeConversation?.id, activeConversation?.messages.length, isSending, errorState]);

  const handleCreateConversation = async (linkedConvId?: string) => {
    setErrorState(null);
    const linkedSupport = linkedConvId
      ? supportConversations.find((c) => c.id === linkedConvId)
      : initialLinkedSupportConversationId
      ? supportConversations.find((c) => c.id === initialLinkedSupportConversationId)
      : undefined;

    const res = await aiSupportService.createConversation({
      title: linkedSupport ? `AI: ${linkedSupport.subject.slice(0, 36)}` : 'New AI Session',
      scope,
      userId,
      linkedSupportConversationId: linkedSupport?.id,
      linkedSupportSubject: linkedSupport?.subject
    });

    if (res.success && res.data) {
      const created = res.data;
      setConversations((prev) => [created, ...prev]);
      setActiveConversationId(created.id);
      setMobilePane('chat');
      setInputValue('');
    } else if (res.error) {
      setErrorState({
        code: res.error.code,
        message: res.error.message
      });
    }
  };

  const handleDeleteConversation = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    await aiSupportService.deleteConversation(id);
    setConversations((prev) => {
      const remaining = prev.filter((c) => c.id !== id);
      if (activeConversationId === id) {
        setActiveConversationId(remaining[0]?.id || '');
      }
      return remaining;
    });
    if (editingId === id) {
      setEditingId(null);
    }
  };

  const handleStartRename = (conv: AiChatConversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditingTitle(conv.title);
  };

  const handleCommitRename = async (id: string) => {
    const trimmed = editingTitle.trim();
    if (!trimmed) {
      setEditingId(null);
      return;
    }

    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: trimmed } : c))
    );
    setEditingId(null);
    await aiSupportService.updateConversation(id, { title: trimmed });
  };

  const handleLinkSupportConversation = async (supportConvId: string) => {
    if (!activeConversation) return;
    const matched = supportConversations.find((c) => c.id === supportConvId);
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversation.id
          ? {
              ...c,
              linkedSupportConversationId: matched?.id || undefined,
              linkedSupportSubject: matched?.subject || undefined
            }
          : c
      )
    );
    await aiSupportService.updateConversation(activeConversation.id, {
      linkedSupportConversationId: matched?.id || null,
      linkedSupportSubject: matched?.subject || null
    });
  };

  const handleClearMessages = async () => {
    if (!activeConversation) return;
    setErrorState(null);
    await aiSupportService.clearConversationMessages(activeConversation.id);
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversation.id
          ? { ...c, messages: [], updatedAt: 'Just now' }
          : c
      )
    );
  };

  const transmitPrompt = async (promptText: string, isRetry = false) => {
    const trimmed = promptText.trim();
    if (!trimmed || isSending) return;

    setErrorState(null);

    let targetConv = activeConversation;
    if (!targetConv) {
      const createRes = await aiSupportService.createConversation({
        title: trimmed.slice(0, 40),
        scope,
        userId
      });
      if (!createRes.success || !createRes.data) {
        setErrorState({
          code: createRes.error?.code || 'CREATE_FAILED',
          message: createRes.error?.message || 'Unable to initialize AI conversation.',
          failedPrompt: trimmed
        });
        return;
      }
      targetConv = createRes.data;
      setConversations((prev) => [targetConv!, ...prev]);
      setActiveConversationId(targetConv.id);
    }

    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsgId = `ai-u-${Date.now()}`;

    const optimisticUserMsg: AiChatMessage = {
      id: userMsgId,
      conversationId: targetConv.id,
      role: 'user',
      content: trimmed,
      timestamp: timeNow,
      status: 'sending'
    };

    const nextTitle =
      targetConv.messages.length === 0 && targetConv.title === 'New AI Session'
        ? trimmed.slice(0, 42) + (trimmed.length > 42 ? '...' : '')
        : targetConv.title;

    if (!isRetry) {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === targetConv!.id
            ? {
                ...c,
                title: nextTitle,
                updatedAt: timeNow,
                messages: [...c.messages, optimisticUserMsg]
              }
            : c
        )
      );
      setInputValue('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }

    setIsSending(true);

    const linkedContextConv = targetConv.linkedSupportConversationId
      ? supportConversations.find((c) => c.id === targetConv!.linkedSupportConversationId)
      : undefined;

    const historyForBackend = targetConv.messages.map((m) => ({
      role: m.role,
      content: m.content,
      timestamp: m.timestamp
    }));

    try {
      const res = await aiSupportService.sendMessage({
        conversationId: targetConv.id,
        message: trimmed,
        scope,
        history: historyForBackend,
        context: linkedContextConv
          ? {
              supportConversationId: linkedContextConv.id,
              customerName: linkedContextConv.customerName,
              customerTier: linkedContextConv.customerTier,
              subject: linkedContextConv.subject,
              category: linkedContextConv.category,
              supportMessages: linkedContextConv.messages.map((m) => ({
                sender: m.sender,
                text: m.text,
                timestamp: m.timestamp
              })),
              staffName: currentStaff?.name,
              staffRole: currentStaff?.role
            }
          : currentStaff
          ? {
              staffName: currentStaff.name,
              staffRole: currentStaff.role
            }
          : undefined
      });

      if (res.success && res.data?.assistantMessage) {
        const assistantMsg = res.data.assistantMessage;
        const confirmedTitle = res.data.suggestedTitle || nextTitle;

        setConversations((prev) =>
          prev.map((c) =>
            c.id === targetConv!.id
              ? {
                  ...c,
                  title: confirmedTitle,
                  updatedAt: assistantMsg.timestamp || timeNow,
                  messages: [
                    ...c.messages.map((m) =>
                      m.id === userMsgId ? { ...m, status: 'sent' as const } : m
                    ),
                    assistantMsg
                  ]
                }
              : c
          )
        );
      } else {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === targetConv!.id
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === userMsgId ? { ...m, status: 'error' as const } : m
                  )
                }
              : c
          )
        );
        setErrorState({
          code: res.error?.code || 'AI_GATEWAY_UNAVAILABLE',
          message:
            res.error?.message ||
            'Backend AI service returned an error. Ensure POST /api/ai/conversations/:id/messages is active.',
          failedPrompt: trimmed
        });
      }
    } catch (err: any) {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === targetConv!.id
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === userMsgId ? { ...m, status: 'error' as const } : m
                )
              }
            : c
        )
      );
      setErrorState({
        code: 'REQUEST_FAILED',
        message: err?.message || 'Unexpected error communicating with AI backend.',
        failedPrompt: trimmed
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    transmitPrompt(inputValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      transmitPrompt(inputValue);
    }
  };

  const handleCopyMessage = (msg: AiChatMessage) => {
    navigator.clipboard?.writeText(msg.content);
    setCopiedMessageId(msg.id);
    setTimeout(() => setCopiedMessageId(null), 1800);
  };

  const filteredConversations = conversations.filter((conv) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      conv.title.toLowerCase().includes(q) ||
      (conv.linkedSupportSubject && conv.linkedSupportSubject.toLowerCase().includes(q)) ||
      conv.messages.some((m) => m.content.toLowerCase().includes(q))
    );
  });

  const starterPrompts =
    scope === 'staff'
      ? [
          'Summarize the attached client thread and list pending compliance checks.',
          'Draft an executive reply confirming Fedwire IMAD reference dispatch.',
          'Audit this inquiry for dual-signatory or KYC Tier 3 requirements.'
        ]
      : [
          'What are today’s Fedwire and cross-border SWIFT settlement cutoffs?',
          'Explain how Treasury Reserve Vault liquidity and 4.85% APY sweeps work.',
          'How do I add a secondary FIDO2 hardware key for $250k+ transfers?'
        ];

  return (
    <div
      className={`flex-1 min-h-0 w-full rounded-2xl border shadow-xl overflow-hidden flex flex-col lg:flex-row ${
        isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-neutral-900 border-neutral-800 text-neutral-100'
      }`}
    >
      {/* Left Panel: AI Conversation History & Management */}
      <div
        className={`${
          mobilePane === 'list' ? 'flex flex-1 lg:flex-none' : 'hidden lg:flex'
        } ${
          isSidebarCollapsed
            ? 'w-full lg:w-[64px]'
            : 'w-full lg:w-[270px] xl:w-[310px]'
        } shrink-0 lg:border-r flex-col min-h-0 transition-[width] duration-200 overflow-hidden ${
          isLight ? 'border-slate-200 bg-slate-50/70' : 'border-neutral-800 bg-neutral-950/40'
        }`}
      >
        {/* Sidebar Header */}
        <div
          className={`p-2.5 px-3 border-b flex items-center justify-between gap-2 shrink-0 ${
            isLight ? 'border-slate-200 bg-slate-100/60' : 'border-neutral-800/80 bg-neutral-950/70'
          }`}
        >
          {!isSidebarCollapsed && (
            <button
              type="button"
              onClick={() => handleCreateConversation()}
              className="flex-1 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New AI Chat</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setMobilePane('chat')}
            className={`lg:hidden px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold flex items-center gap-1 shrink-0 cursor-pointer ${
              isLight
                ? 'bg-white border-slate-200 text-amber-600'
                : 'bg-neutral-900 border-neutral-800 text-amber-400'
            }`}
          >
            <span>Chat</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setIsSidebarCollapsed((prev) => !prev)}
            title={isSidebarCollapsed ? 'Expand AI History Sidebar' : 'Collapse AI History Sidebar'}
            className={`hidden lg:inline-flex p-1.5 rounded-lg border transition-colors cursor-pointer shrink-0 ${
              isSidebarCollapsed ? 'mx-auto' : ''
            } ${
              isLight
                ? 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800'
            }`}
          >
            {isSidebarCollapsed ? (
              <PanelLeftOpen className="w-4 h-4 text-amber-400" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        </div>

        {isSidebarCollapsed ? (
          /* Collapsed Icon History Bar */
          <div className="flex-1 min-h-0 overflow-y-auto py-2.5 px-2 flex lg:flex-col items-center gap-2 overflow-x-auto lg:overflow-x-hidden">
            <button
              type="button"
              onClick={() => handleCreateConversation()}
              title="New AI Chat"
              className="w-9 h-9 rounded-xl bg-amber-500 text-neutral-950 flex items-center justify-center shrink-0 hover:bg-amber-400 cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" />
            </button>
            <div className={`hidden lg:block w-8 h-px ${isLight ? 'bg-slate-200' : 'bg-neutral-800'}`} />
            {conversations.map((conv) => {
              const isSelected = conv.id === activeConversation?.id;
              return (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => setActiveConversationId(conv.id)}
                  title={conv.title}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-colors cursor-pointer ${
                    isSelected
                      ? 'border-amber-500 bg-amber-500/15 text-amber-400'
                      : isLight
                      ? 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                      : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:bg-neutral-800'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                </button>
              );
            })}
          </div>
        ) : (
          <>
            {/* Search Box */}
            <div className={`p-2.5 border-b shrink-0 ${isLight ? 'border-slate-200' : 'border-neutral-800/70'}`}>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Search AI sessions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-8 pr-3 py-1.5 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                    isLight
                      ? 'bg-white border-slate-200 text-slate-900'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-100'
                  }`}
                />
              </div>
            </div>

            {/* Independently Scrollable Conversation List */}
            <div className="flex-1 min-h-0 overflow-y-auto p-2.5 space-y-1.5">
              {isInitializing ? (
                <div className="py-8 flex items-center justify-center gap-2 text-xs text-neutral-400">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                  <span>Loading sessions...</span>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-4 text-center text-xs text-neutral-500 space-y-2">
                  <p>No AI conversations found.</p>
                  <button
                    type="button"
                    onClick={() => handleCreateConversation()}
                    className="px-3 py-1.5 rounded-lg bg-amber-500/15 text-amber-400 font-semibold hover:bg-amber-500/25 cursor-pointer"
                  >
                    Start New Session
                  </button>
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const isSelected = conv.id === activeConversation?.id;
                  const isEditing = editingId === conv.id;

                  return (
                    <div
                      key={conv.id}
                      onClick={() => {
                        if (!isEditing) {
                          setActiveConversationId(conv.id);
                          setMobilePane('chat');
                        }
                      }}
                      className={`group p-2.5 rounded-xl border cursor-pointer transition-all space-y-1 ${
                        isSelected
                          ? isLight
                            ? 'bg-white border-amber-500 shadow-sm ring-1 ring-amber-500/30'
                            : 'bg-neutral-900 border-amber-500/70 shadow-sm'
                          : isLight
                          ? 'bg-white/60 border-slate-200/80 hover:bg-white'
                          : 'bg-neutral-900/40 border-neutral-800/70 hover:bg-neutral-800/40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        {isEditing ? (
                          <div
                            className="flex-1 flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="text"
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleCommitRename(conv.id);
                                if (e.key === 'Escape') setEditingId(null);
                              }}
                              autoFocus
                              className={`flex-1 min-w-0 px-2 py-0.5 rounded text-xs border focus:outline-none ${
                                isLight
                                  ? 'bg-white border-slate-300 text-slate-900'
                                  : 'bg-neutral-950 border-neutral-700 text-neutral-100'
                              }`}
                            />
                            <button
                              type="button"
                              onClick={() => handleCommitRename(conv.id)}
                              className="p-1 text-emerald-500 hover:text-emerald-400"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="p-1 text-neutral-400 hover:text-neutral-200"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <span
                                className={`text-xs font-semibold truncate ${
                                  isLight ? 'text-slate-900' : 'text-neutral-100'
                                }`}
                              >
                                {conv.title}
                              </span>
                            </div>

                            <div className="flex items-center gap-0.5 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity shrink-0">
                              <button
                                type="button"
                                onClick={(e) => handleStartRename(conv, e)}
                                title="Rename session"
                                className="p-1 rounded hover:bg-neutral-800/60 text-neutral-400 hover:text-neutral-200"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleDeleteConversation(conv.id, e)}
                                title="Delete session"
                                className="p-1 rounded hover:bg-rose-500/15 text-neutral-400 hover:text-rose-400"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>

                      {conv.linkedSupportSubject && (
                        <div className="flex items-center gap-1 text-[10px] text-emerald-500 truncate">
                          <Link2 className="w-2.5 h-2.5 shrink-0" />
                          <span className="truncate">{conv.linkedSupportSubject}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500 pt-0.5">
                        <span>{conv.messages.length} msgs</span>
                        <span>{conv.updatedAt}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>

      {/* Right Panel: Full-Height Active AI Chat Room */}
      <div
        className={`${
          mobilePane === 'chat' ? 'flex' : 'hidden'
        } lg:flex flex-1 min-w-0 min-h-0 flex-col overflow-hidden`}
      >
        {/* Sticky Chat Room Header */}
        <div
          className={`px-2.5 sm:px-4 py-2 sm:py-2.5 border-b flex flex-wrap items-center justify-between gap-2 shrink-0 ${
            isLight ? 'bg-slate-50/90 border-slate-200' : 'bg-neutral-950/80 border-neutral-800'
          }`}
        >
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
            <button
              type="button"
              onClick={() => setMobilePane('list')}
              title="Back to AI Sessions"
              aria-label="Back to AI Sessions"
              className={`lg:hidden p-1.5 rounded-lg border flex items-center gap-1 text-[11px] font-semibold shrink-0 cursor-pointer ${
                isLight
                  ? 'bg-white border-slate-200 text-slate-700'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-200'
              }`}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sessions</span>
            </button>

            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h3
                  className={`text-xs sm:text-sm font-semibold truncate max-w-[170px] sm:max-w-none ${
                    isLight ? 'text-slate-900' : 'text-neutral-100'
                  }`}
                >
                  {activeConversation ? activeConversation.title : 'Aureus Private AI Room'}
                </h3>
                <span className="hidden sm:inline-block text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  {scope === 'staff' ? 'Staff AI Copilot' : 'Client AI Concierge'}
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-neutral-400 truncate">
                {activeConversation?.linkedSupportSubject
                  ? `Context: ${activeConversation.linkedSupportSubject}`
                  : 'Authorized workspace context · Backend API ready'}
              </p>
            </div>
          </div>

          {/* Context Linker & Thread Management Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap shrink-0 max-w-full">
            {supportConversations.length > 0 && activeConversation && (
              <select
                value={activeConversation.linkedSupportConversationId || ''}
                onChange={(e) => handleLinkSupportConversation(e.target.value)}
                title="Attach Support Thread Context"
                className={`text-[11px] sm:text-xs py-1 px-2 rounded-lg border max-w-[155px] sm:max-w-[200px] truncate focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                  isLight
                    ? 'bg-white border-slate-300 text-slate-700'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-300'
                }`}
              >
                <option value="">No thread context</option>
                {supportConversations.map((sc) => (
                  <option key={sc.id} value={sc.id}>
                    Context: {sc.customerName} — {sc.subject}
                  </option>
                ))}
              </select>
            )}

            {activeConversation && activeConversation.messages.length > 0 && (
              <button
                type="button"
                onClick={handleClearMessages}
                title="Clear conversation messages"
                className={`px-2 sm:px-2.5 py-1 rounded-lg border text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                  isLight
                    ? 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                    : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
                }`}
              >
                <RotateCcw className="w-3 h-3" />
                <span className="hidden sm:inline">Clear</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => handleCreateConversation()}
              title="New AI Chat"
              className={`px-2 sm:px-2.5 py-1 rounded-lg border text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                isLight
                  ? 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                  : 'border-neutral-800 bg-neutral-900 text-neutral-200 hover:bg-neutral-800'
              }`}
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">New Chat</span>
            </button>
          </div>
        </div>

        {/* Independently Scrollable AI Message Feed */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 md:p-5 space-y-3.5 sm:space-y-4">
          {!activeConversation || activeConversation.messages.length === 0 ? (
            <div className="h-full min-h-[260px] flex flex-col items-center justify-center text-center max-w-xl mx-auto space-y-4 py-6">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-semibold">
                  {scope === 'staff'
                    ? `Private Banking AI Copilot — ${currentStaff?.name || userName}`
                    : `Aureus Wealth AI Concierge — ${userName}`}
                </h4>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  {scope === 'staff'
                    ? 'Draft executive client responses, summarize multi-turn threads, and run KYC/Fedwire compliance checks against authorized conversation context.'
                    : 'Ask questions about Fedwire cutoffs, Treasury Reserve liquidity, card travel rules, or your active support tickets.'}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2 w-full">
                {starterPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => transmitPrompt(prompt)}
                    disabled={isSending}
                    className={`p-3 rounded-xl border text-left text-xs transition-all flex items-center justify-between gap-3 cursor-pointer ${
                      isLight
                        ? 'bg-slate-50 border-slate-200 hover:border-amber-500/60 hover:bg-white text-slate-700'
                        : 'bg-neutral-950/60 border-neutral-800 hover:border-amber-500/60 hover:bg-neutral-900 text-neutral-300'
                    }`}
                  >
                    <span>{prompt}</span>
                    <Send className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            activeConversation.messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div key={msg.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-1.5 mb-1 text-[10px] text-neutral-400 font-mono">
                    <span>{isUser ? userName : 'Aureus AI'}</span>
                    <span>·</span>
                    <span>{msg.timestamp}</span>
                    {msg.metadata?.model && (
                      <>
                        <span>·</span>
                        <span className="text-amber-400/90">{msg.metadata.model}</span>
                      </>
                    )}
                  </div>

                  <div
                    className={`max-w-[88%] sm:max-w-[82%] rounded-2xl p-3 sm:p-3.5 text-xs leading-relaxed shadow-sm break-words ${
                      isUser
                        ? 'bg-emerald-600 text-neutral-950 font-medium rounded-br-xs'
                        : isLight
                        ? 'bg-slate-100 text-slate-900 border border-slate-200 rounded-bl-xs'
                        : 'bg-neutral-800/90 text-neutral-100 border border-neutral-700/60 rounded-bl-xs'
                    }`}
                  >
                    <p className="whitespace-pre-line">{msg.content}</p>

                    {!isUser && (
                      <div className="mt-2.5 pt-2 border-t border-neutral-700/30 flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleCopyMessage(msg)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                            isLight
                              ? 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                              : 'bg-neutral-900 border border-neutral-700 text-neutral-300 hover:bg-neutral-950'
                          }`}
                        >
                          {copiedMessageId === msg.id ? (
                            <Check className="w-3 h-3 text-emerald-500" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>{copiedMessageId === msg.id ? 'Copied' : 'Copy'}</span>
                        </button>

                        {onInsertReply && (
                          <button
                            type="button"
                            onClick={() =>
                              onInsertReply(msg.content, activeConversation.linkedSupportConversationId)
                            }
                            className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-semibold text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <CornerDownLeft className="w-3 h-3" />
                            <span>Insert into Staff Reply</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {isUser && msg.status === 'error' && (
                    <span className="mt-0.5 text-[10px] font-mono text-rose-400">
                      Delivery failed
                    </span>
                  )}
                </div>
              );
            })
          )}

          {/* Loading Indicator */}
          {isSending && (
            <div className="flex items-start gap-2.5">
              <div
                className={`rounded-2xl rounded-bl-xs px-4 py-3 border flex items-center gap-2.5 text-xs ${
                  isLight
                    ? 'bg-slate-100 border-slate-200 text-slate-700'
                    : 'bg-neutral-800/80 border-neutral-700/60 text-neutral-300'
                }`}
              >
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400 shrink-0" />
                <span className="font-mono text-[11px]">Awaiting AI backend response...</span>
              </div>
            </div>
          )}

          {/* Backend API Error Banner with Retry */}
          {errorState && (
            <div className="p-3.5 rounded-xl border border-rose-500/40 bg-rose-500/10 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5 min-w-0">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5 min-w-0">
                  <div className="font-semibold text-rose-300 flex items-center gap-2 flex-wrap">
                    <span>AI Request Error</span>
                    {errorState.code && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-rose-500/20 border border-rose-500/30">
                        {errorState.code}
                      </span>
                    )}
                  </div>
                  <p className="text-rose-200/80 text-[11px] leading-relaxed">
                    {errorState.message}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {errorState.failedPrompt && (
                  <button
                    type="button"
                    onClick={() => transmitPrompt(errorState.failedPrompt!, true)}
                    disabled={isSending}
                    className="px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-white font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Retry</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setErrorState(null)}
                  className="px-2.5 py-1.5 rounded-lg border border-rose-500/30 text-rose-300 hover:bg-rose-500/20 text-[11px] cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Anchored Bottom Message Input */}
        <div
          className={`p-2.5 sm:p-3 px-2.5 sm:px-4 border-t shrink-0 ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-neutral-950/80 border-neutral-800'
          }`}
        >
          <form onSubmit={handleSubmit} className="space-y-1.5">
            <div className="flex items-end gap-1.5 sm:gap-2">
              <textarea
                ref={textareaRef}
                rows={1}
                value={inputValue}
                disabled={isSending}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                }}
                onKeyDown={handleKeyDown}
                placeholder={
                  isSending
                    ? 'Awaiting AI backend response...'
                    : 'Ask AI Copilot...'
                }
                className={`flex-1 min-w-0 px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-xl border text-xs resize-none focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors ${
                  isLight
                    ? 'bg-white border-slate-300 text-slate-900'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-100'
                }`}
              />

              <button
                type="submit"
                disabled={!inputValue.trim() || isSending}
                className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-neutral-950 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm shrink-0"
              >
                {isSending ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span className="hidden sm:inline">{isSending ? 'Sending' : 'Send'}</span>
              </button>
            </div>

            <div className="flex items-center justify-between gap-2 text-[10px] text-neutral-500 px-1 font-mono">
              <span className="truncate flex items-center gap-1 min-w-0">
                <MessageSquare className="w-3 h-3 text-amber-400 shrink-0" />
                <span className="truncate">
                  API: <span className="text-amber-400">POST /api/ai/conversations/:id/messages</span>
                </span>
              </span>
              <span className="hidden sm:inline shrink-0">Advisory only · Human approval required</span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
