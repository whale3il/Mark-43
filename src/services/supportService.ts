/**
 * Aureus Wealth - Customer Support & Concierge Service Client
 * Connects directly to the Express / Prisma / PostgreSQL / Supabase backend.
 *
 * Rules:
 * - Never returns fake `{ success: true }` objects when backend requests fail.
 * - Uses HTTP-only session cookies via `apiRequest` (`credentials: 'include'`).
 */

import { apiRequest, ApiResponse } from './apiClient';
import {
  SupportAgent,
  SupportConversation,
  SupportConversationStatus,
  SupportMessage,
  SupportTicket,
  CannedResponse,
  SupportAnalytics,
  CustomerProfile,
  StaffAvailability,
  InquiryCategory,
  TicketStatus,
  SupportAttachment,
  VoiceNoteData,
  SupportCallSession,
  SupportCallType,
  SupportCallSignalPayload,
} from '../types/support';

export interface SupportDashboardPayload {
  staffList: SupportAgent[];
  conversations: SupportConversation[];
  tickets: SupportTicket[];
  customers: Record<string, CustomerProfile>;
  cannedResponses: CannedResponse[];
  analytics: SupportAnalytics;
}

export function isSafeMediaUrl(rawUrl?: string | null): boolean {
  if (!rawUrl || typeof rawUrl !== 'string') return false;
  const trimmed = rawUrl.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('/')) return true;
  if (trimmed.startsWith('blob:')) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export function normalizeConversationStatus(raw?: unknown): SupportConversationStatus {
  const val = String(raw || '').trim().toUpperCase();
  if (val === 'WAITING' || val === 'QUEUED') return 'waiting';
  if (val === 'ACTIVE' || val === 'OPEN') return 'active';
  if (val === 'PENDING') return 'pending';
  if (val === 'RESOLVED') return 'resolved';
  if (val === 'CLOSED' || val === 'ENDED') return 'closed';
  return 'active';
}

export function normalizeStaffAvailabilityStatus(raw?: unknown): StaffAvailability {
  const val = String(raw || '').trim().toLowerCase();
  if (val === 'online' || val === 'busy' || val === 'away' || val === 'offline') {
    return val;
  }
  return 'offline';
}

export function normalizeSupportAgent(raw: any): SupportAgent {
  const name = String(raw?.name || raw?.fullName || 'Private Banking Specialist');
  const parts = name.trim().split(/\s+/);
  const initials =
    raw?.initials ||
    (parts.length >= 2
      ? `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase()
      : name.slice(0, 2).toUpperCase());

  const status = normalizeStaffAvailabilityStatus(raw?.availability ?? raw?.status);

  return {
    id: String(raw?.id || raw?.staffId || ''),
    name,
    role: String(raw?.role || 'Private Wealth Specialist'),
    department: raw?.department || 'Private Wealth',
    specialization: String(raw?.specialization || 'Private Banking Advisory'),
    avatarUrl: raw?.avatarUrl || raw?.avatar_url,
    initials,
    status,
    availability: status,
    online: typeof raw?.online === 'boolean' ? raw.online : status === 'online',
    responseTime: String(raw?.responseTime || '< 2 mins'),
    license: String(raw?.license || ''),
    office: String(raw?.office || ''),
    directPhone: String(raw?.directPhone || raw?.direct_phone || ''),
    email: String(raw?.email || ''),
    activeConversationsCount: Number(
      raw?.activeConversationsCount ?? raw?.activeChatsCount ?? raw?.active_chats_count ?? 0
    ),
    activeChatsCount: Number(
      raw?.activeChatsCount ?? raw?.activeConversationsCount ?? raw?.active_chats_count ?? 0
    ),
    availabilityLabel: String(
      raw?.availabilityLabel ||
        (status === 'online'
          ? 'Available Now'
          : status === 'busy'
          ? 'Handling Inquiries'
          : status === 'away'
          ? 'Temporarily Away'
          : 'Offline')
    ),
    rating: typeof raw?.rating === 'number' ? raw.rating : undefined,
  };
}

export function normalizeSupportMessage(raw: any, fallbackConvId = ''): SupportMessage {
  const rawSender = String(raw?.sender || raw?.senderRole || '').toLowerCase();
  const sender: SupportMessage['sender'] =
    rawSender === 'system'
      ? 'system'
      : rawSender === 'staff' || rawSender === 'agent' || rawSender === 'admin'
      ? 'agent'
      : 'customer';

  const rawAttachment = raw?.attachment;
  const attachment: SupportAttachment | undefined = rawAttachment
    ? {
        id: rawAttachment.id || rawAttachment.attachmentId || raw?.attachmentId,
        attachmentId: rawAttachment.attachmentId || rawAttachment.id || raw?.attachmentId,
        name: String(rawAttachment.name || rawAttachment.fileName || 'Attachment'),
        size: String(rawAttachment.size || rawAttachment.fileSize || ''),
        sizeBytes: typeof rawAttachment.sizeBytes === 'number' ? rawAttachment.sizeBytes : undefined,
        mimeType: rawAttachment.mimeType || rawAttachment.contentType,
        type: rawAttachment.type || 'document',
        url: isSafeMediaUrl(rawAttachment.url) ? rawAttachment.url : undefined,
      }
    : undefined;

  const rawVoice = raw?.voiceNote || raw?.voice_note;
  const voiceNote: VoiceNoteData | undefined = rawVoice
    ? {
        id: rawVoice.id || rawVoice.attachmentId || raw?.attachmentId,
        attachmentId: rawVoice.attachmentId || rawVoice.id || raw?.attachmentId,
        durationSeconds: Number(rawVoice.durationSeconds || rawVoice.duration || 0),
        audioUrl: isSafeMediaUrl(rawVoice.audioUrl || rawVoice.url)
          ? rawVoice.audioUrl || rawVoice.url
          : undefined,
        mimeType: rawVoice.mimeType,
        waveform: Array.isArray(rawVoice.waveform) ? rawVoice.waveform : undefined,
      }
    : undefined;

  const rawStatus = String(raw?.status || '').toLowerCase();
  const status: SupportMessage['status'] =
    rawStatus === 'read' || raw?.readAt || raw?.readByStaffAt || raw?.readByCustomerAt
      ? 'read'
      : rawStatus === 'delivered' || raw?.deliveredAt
      ? 'delivered'
      : 'sent';

  return {
    id: String(raw?.id || `msg-${Date.now()}`),
    conversationId: String(raw?.conversationId || raw?.conversation_id || fallbackConvId),
    sender,
    agentId: raw?.agentId || raw?.staffId || raw?.senderId,
    agentName: raw?.agentName || raw?.staffName || raw?.senderName,
    text: String(raw?.text ?? raw?.content ?? ''),
    timestamp: String(
      raw?.timestamp ||
        (raw?.createdAt
          ? new Date(raw.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })
          : '')
    ),
    status,
    type: raw?.type || (voiceNote ? 'voice' : attachment ? 'attachment' : sender === 'system' ? 'system' : 'text'),
    attachmentId: raw?.attachmentId || attachment?.attachmentId || voiceNote?.attachmentId,
    attachment,
    voiceNote,
    isPrivateNote: Boolean(raw?.isPrivateNote ?? raw?.isWhisper ?? raw?.is_whisper),
    aiSuggested: Boolean(raw?.aiSuggested),
    clientTempId: raw?.clientTempId || raw?.client_temp_id,
    pending: false,
    failed: false,
  };
}

export function normalizeSupportConversation(raw: any): SupportConversation {
  const id = String(raw?.id || '');
  const rawAgent = raw?.agent || raw?.staff || raw?.assignedStaff || {};
  const status = normalizeConversationStatus(raw?.status);
  const agent = normalizeSupportAgent({
    id: rawAgent?.id || raw?.assignedStaffId || raw?.staffId || '',
    name:
      rawAgent?.name ||
      rawAgent?.fullName ||
      (status === 'waiting' ? 'Awaiting Next Available Specialist' : 'Private Banking Specialist'),
    role: rawAgent?.role || (status === 'waiting' ? 'Queue Assignment Pending' : 'Support Specialist'),
    department: rawAgent?.department || raw?.department || 'Private Wealth',
    status: rawAgent?.availability ?? rawAgent?.status ?? (status === 'waiting' ? 'away' : 'online'),
    ...rawAgent,
  });

  const messages = Array.isArray(raw?.messages)
    ? raw.messages
        .filter((m: any) => !m?.isPrivateNote && !m?.isWhisper && !m?.is_whisper)
        .map((m: any) => normalizeSupportMessage(m, id))
    : [];

  return {
    id,
    agent,
    assignedStaffId: raw?.assignedStaffId || raw?.staffId || agent.id || undefined,
    customerId: String(raw?.customerId || raw?.customer?.id || ''),
    customerName: String(raw?.customerName || raw?.customer?.name || 'Private Client'),
    customerTier: String(raw?.customerTier || raw?.customer?.clientTier || 'Private Client'),
    customerAvatar: raw?.customerAvatar || raw?.customer?.avatarUrl,
    subject: String(raw?.subject || 'Private Banking Consultation'),
    department: String(raw?.department || agent.department || 'Private Wealth'),
    category: (raw?.category || 'General Support') as InquiryCategory,
    lastMessage: String(
      raw?.lastMessage ||
        messages[messages.length - 1]?.text ||
        (status === 'waiting'
          ? 'Your inquiry is queued for the next available specialist.'
          : 'Conversation started')
    ),
    lastMessageTimestamp: String(
      raw?.lastMessageTimestamp ||
        messages[messages.length - 1]?.timestamp ||
        (raw?.updatedAt
          ? new Date(raw.updatedAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })
          : '')
    ),
    unreadCount: Number(raw?.unreadCount ?? 0),
    status,
    queuePosition: typeof raw?.queuePosition === 'number' ? raw.queuePosition : undefined,
    closedAt: raw?.closedAt || raw?.closed_at,
    linkedTicketId: raw?.linkedTicketId || raw?.ticketId,
    internalNotes: undefined,
    messages,
    createdAt: raw?.createdAt,
  };
}

export function normalizeCallSession(raw: any, fallbackConvId = ''): SupportCallSession {
  const rawStatus = String(raw?.status || 'ringing').toLowerCase();
  const status: SupportCallSession['status'] =
    rawStatus === 'active' ||
    rawStatus === 'accepted' ||
    rawStatus === 'rejected' ||
    rawStatus === 'ended' ||
    rawStatus === 'missed' ||
    rawStatus === 'failed'
      ? rawStatus
      : 'ringing';

  const rawType = String(raw?.type || raw?.mode || 'audio').toLowerCase();
  const type: SupportCallType = rawType === 'video' ? 'video' : 'audio';

  return {
    id: String(raw?.id || raw?.callId || ''),
    conversationId: String(raw?.conversationId || fallbackConvId),
    type,
    status,
    initiatorId: raw?.initiatorId || raw?.callerId,
    initiatorName: raw?.initiatorName || raw?.callerName,
    initiatorRole: raw?.initiatorRole,
    receiverId: raw?.receiverId,
    receiverName: raw?.receiverName,
    startedAt: raw?.startedAt || raw?.createdAt,
    acceptedAt: raw?.acceptedAt,
    endedAt: raw?.endedAt,
    iceServers: Array.isArray(raw?.iceServers) ? raw.iceServers : undefined,
  };
}

export class SupportService {
  /**
   * GET /api/support/dashboard
   */
  static async getDashboard(): Promise<ApiResponse<SupportDashboardPayload>> {
    const res = await apiRequest<any>('/support/dashboard');
    if (!res.success || !res.data) {
      return { success: false, error: res.error };
    }

    const staffList = Array.isArray(res.data.staffList)
      ? res.data.staffList.map(normalizeSupportAgent)
      : Array.isArray(res.data.staff)
      ? res.data.staff.map(normalizeSupportAgent)
      : [];

    const conversations = Array.isArray(res.data.conversations)
      ? res.data.conversations.map(normalizeSupportConversation)
      : [];

    const tickets = Array.isArray(res.data.tickets) ? res.data.tickets : [];

    return {
      success: true,
      data: {
        staffList,
        conversations,
        tickets,
        customers: res.data.customers || {},
        cannedResponses: res.data.cannedResponses || [],
        analytics: res.data.analytics,
      },
    };
  }

  /**
   * GET /api/support/conversations
   * Fetches active/waiting customer conversations directly from backend.
   */
  static async getConversations(): Promise<ApiResponse<SupportConversation[]>> {
    const res = await apiRequest<any>('/support/conversations');
    if (!res.success || !res.data) {
      return { success: false, error: res.error };
    }

    const rawList = Array.isArray(res.data)
      ? res.data
      : Array.isArray(res.data.conversations)
      ? res.data.conversations
      : [];

    return {
      success: true,
      data: rawList.map(normalizeSupportConversation),
    };
  }

  /**
   * POST /api/support/conversations
   * Creates a new support conversation; backend enforces specialist assignment (ONLINE + activeChats < maxChats) or WAITING queue.
   */
  static async createConversation(payload: {
    category: InquiryCategory;
    subject: string;
    initialMessage: string;
    preferredStaffId?: string;
  }): Promise<ApiResponse<SupportConversation>> {
    const res = await apiRequest<any>('/support/conversations', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (!res.success || !res.data) {
      return { success: false, error: res.error };
    }

    const rawConv = res.data.conversation || res.data;
    return {
      success: true,
      data: normalizeSupportConversation(rawConv),
    };
  }

  /**
   * GET /api/support/conversations/:id/messages
   */
  static async getMessages(conversationId: string): Promise<ApiResponse<SupportMessage[]>> {
    const res = await apiRequest<any>(
      `/support/conversations/${encodeURIComponent(conversationId)}/messages`
    );
    if (!res.success || !res.data) {
      return { success: false, error: res.error };
    }

    const list = Array.isArray(res.data)
      ? res.data
      : Array.isArray(res.data.messages)
      ? res.data.messages
      : [];

    return {
      success: true,
      data: list
        .filter((m: any) => !m?.isPrivateNote && !m?.isWhisper && !m?.is_whisper)
        .map((m: any) => normalizeSupportMessage(m, conversationId)),
    };
  }

  /**
   * POST /api/support/conversations/:id/messages
   * Express persists first to PostgreSQL, then triggers Ably realtime distribution.
   */
  static async sendMessage(
    conversationId: string,
    payload: {
      text: string;
      type?: 'text' | 'attachment' | 'voice';
      attachmentId?: string;
      attachment?: SupportAttachment;
      voiceNote?: VoiceNoteData;
      clientTempId?: string;
    }
  ): Promise<ApiResponse<SupportMessage>> {
    const res = await apiRequest<any>(
      `/support/conversations/${encodeURIComponent(conversationId)}/messages`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );

    if (!res.success || !res.data) {
      return { success: false, error: res.error };
    }

    const rawMsg = res.data.message || res.data;
    return {
      success: true,
      data: normalizeSupportMessage(rawMsg, conversationId),
    };
  }

  /**
   * POST /api/support/conversations/:id/end-session
   * Permanently closes session & clears conversation history on backend.
   */
  static async endSession(
    conversationId: string
  ): Promise<ApiResponse<{ conversationId: string; status?: string; endedAt?: string }>> {
    return apiRequest<{ conversationId: string; status?: string; endedAt?: string }>(
      `/support/conversations/${encodeURIComponent(conversationId)}/end-session`,
      {
        method: 'POST',
      }
    );
  }

  /**
   * POST /api/support/conversations/:id/typing
   */
  static async sendTyping(
    conversationId: string,
    isTyping: boolean
  ): Promise<ApiResponse<void>> {
    return apiRequest<void>(
      `/support/conversations/${encodeURIComponent(conversationId)}/typing`,
      {
        method: 'POST',
        body: JSON.stringify({ isTyping }),
      }
    );
  }

  /**
   * POST /api/support/conversations/:id/receipts/delivered
   */
  static async markDelivered(
    conversationId: string,
    messageId?: string
  ): Promise<ApiResponse<void>> {
    return apiRequest<void>(
      `/support/conversations/${encodeURIComponent(conversationId)}/receipts/delivered`,
      {
        method: 'POST',
        body: JSON.stringify(messageId ? { messageId } : {}),
      }
    );
  }

  /**
   * POST /api/support/conversations/:id/receipts/read
   */
  static async markRead(
    conversationId: string,
    messageId?: string
  ): Promise<ApiResponse<void>> {
    return apiRequest<void>(
      `/support/conversations/${encodeURIComponent(conversationId)}/receipts/read`,
      {
        method: 'POST',
        body: JSON.stringify(messageId ? { messageId } : {}),
      }
    );
  }

  /**
   * POST /api/support/conversations/:id/attachments
   * Uploads file or voice note audio blob via multipart FormData.
   */
  static async uploadAttachment(
    conversationId: string,
    file: File | Blob,
    options?: { fileName?: string; type?: 'attachment' | 'voice'; durationSeconds?: number }
  ): Promise<ApiResponse<{ attachmentId?: string; attachment?: SupportAttachment; voiceNote?: VoiceNoteData }>> {
    const formData = new FormData();
    const resolvedName =
      options?.fileName || (file instanceof File ? file.name : `voice-note-${Date.now()}.webm`);
    formData.append('file', file, resolvedName);
    if (options?.type) {
      formData.append('type', options.type);
    }
    if (typeof options?.durationSeconds === 'number') {
      formData.append('durationSeconds', String(options.durationSeconds));
    }

    const res = await apiRequest<any>(
      `/support/conversations/${encodeURIComponent(conversationId)}/attachments`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!res.success || !res.data) {
      return { success: false, error: res.error };
    }

    const d = res.data.attachment || res.data;
    const attachmentId = String(d.attachmentId || d.id || '');
    const safeUrl = isSafeMediaUrl(d.url || d.audioUrl) ? d.url || d.audioUrl : undefined;

    if (options?.type === 'voice') {
      return {
        success: true,
        data: {
          attachmentId,
          voiceNote: {
            id: attachmentId,
            attachmentId,
            durationSeconds: Number(d.durationSeconds || options.durationSeconds || 1),
            audioUrl: safeUrl,
            mimeType: d.mimeType || (file as File).type || 'audio/webm',
          },
        },
      };
    }

    return {
      success: true,
      data: {
        attachmentId,
        attachment: {
          id: attachmentId,
          attachmentId,
          name: String(d.name || d.fileName || resolvedName),
          size: String(
            d.size ||
              (file.size >= 1024 * 1024
                ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
                : `${Math.max(1, Math.round(file.size / 1024))} KB`)
          ),
          sizeBytes: file.size,
          mimeType: d.mimeType || (file as File).type || undefined,
          type:
            d.type ||
            (resolvedName.toLowerCase().endsWith('.pdf')
              ? 'pdf'
              : (file as File).type?.startsWith('image/')
              ? 'image'
              : 'document'),
          url: safeUrl,
        },
      },
    };
  }

  /**
   * GET /api/support/attachments/:attachmentId/url
   * Fetches protected signed download URL.
   */
  static async getAttachmentUrl(
    attachmentId: string
  ): Promise<ApiResponse<{ url: string; expiresAt?: string }>> {
    const res = await apiRequest<any>(
      `/support/attachments/${encodeURIComponent(attachmentId)}/url`
    );
    if (!res.success || !res.data) {
      return { success: false, error: res.error };
    }
    const signedUrl = res.data.url || res.data.signedUrl;
    if (!isSafeMediaUrl(signedUrl)) {
      return {
        success: false,
        error: {
          code: 'INVALID_ATTACHMENT_URL',
          message: 'Signed download URL returned by backend failed URL safety validation.',
        },
      };
    }
    return {
      success: true,
      data: {
        url: signedUrl,
        expiresAt: res.data.expiresAt,
      },
    };
  }

  /**
   * POST /api/support/conversations/:id/calls
   */
  static async startCall(
    conversationId: string,
    type: SupportCallType
  ): Promise<ApiResponse<SupportCallSession>> {
    const res = await apiRequest<any>(
      `/support/conversations/${encodeURIComponent(conversationId)}/calls`,
      {
        method: 'POST',
        body: JSON.stringify({ type, mode: type }),
      }
    );
    if (!res.success || !res.data) {
      return { success: false, error: res.error };
    }
    return {
      success: true,
      data: normalizeCallSession(res.data.call || res.data, conversationId),
    };
  }

  /**
   * GET /api/support/conversations/:id/calls
   */
  static async listCalls(conversationId: string): Promise<ApiResponse<SupportCallSession[]>> {
    const res = await apiRequest<any>(
      `/support/conversations/${encodeURIComponent(conversationId)}/calls`
    );
    if (!res.success || !res.data) {
      return { success: false, error: res.error };
    }
    const items = Array.isArray(res.data) ? res.data : res.data.calls || [];
    return {
      success: true,
      data: items.map((c: any) => normalizeCallSession(c, conversationId)),
    };
  }

  /**
   * POST /api/support/calls/:callId/accept
   */
  static async acceptCall(callId: string): Promise<ApiResponse<SupportCallSession>> {
    const res = await apiRequest<any>(
      `/support/calls/${encodeURIComponent(callId)}/accept`,
      { method: 'POST' }
    );
    if (!res.success || !res.data) {
      return { success: false, error: res.error };
    }
    return {
      success: true,
      data: normalizeCallSession(res.data.call || res.data),
    };
  }

  /**
   * POST /api/support/calls/:callId/reject
   */
  static async rejectCall(callId: string): Promise<ApiResponse<SupportCallSession>> {
    const res = await apiRequest<any>(
      `/support/calls/${encodeURIComponent(callId)}/reject`,
      { method: 'POST' }
    );
    if (!res.success || !res.data) {
      return { success: false, error: res.error };
    }
    return {
      success: true,
      data: normalizeCallSession(res.data.call || res.data),
    };
  }

  /**
   * POST /api/support/calls/:callId/end
   */
  static async endCall(callId: string): Promise<ApiResponse<SupportCallSession>> {
    const res = await apiRequest<any>(
      `/support/calls/${encodeURIComponent(callId)}/end`,
      { method: 'POST' }
    );
    if (!res.success || !res.data) {
      return { success: false, error: res.error };
    }
    return {
      success: true,
      data: normalizeCallSession(res.data.call || res.data),
    };
  }

  /**
   * POST /api/support/calls/:callId/signal
   */
  static async sendCallSignal(
    callId: string,
    signal: Omit<SupportCallSignalPayload, 'callId'>
  ): Promise<ApiResponse<void>> {
    return apiRequest<void>(`/support/calls/${encodeURIComponent(callId)}/signal`, {
      method: 'POST',
      body: JSON.stringify(signal),
    });
  }

  /**
   * PATCH /api/support/conversations/:id
   */
  static async updateConversation(
    conversationId: string,
    updates: Partial<Pick<SupportConversation, 'status' | 'unreadCount'>>
  ): Promise<ApiResponse<Partial<SupportConversation>>> {
    return apiRequest<Partial<SupportConversation>>(
      `/support/conversations/${encodeURIComponent(conversationId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(updates),
      }
    );
  }

  /**
   * POST /api/support/tickets
   */
  static async createTicket(
    payload: Omit<SupportTicket, 'id' | 'createdAt' | 'updatedAt' | 'status'>
  ): Promise<ApiResponse<SupportTicket>> {
    return apiRequest<SupportTicket>('/support/tickets', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * PATCH /api/support/tickets/:id
   */
  static async updateTicketStatus(
    ticketId: string,
    status: TicketStatus
  ): Promise<ApiResponse<{ id: string; status: TicketStatus }>> {
    return apiRequest<{ id: string; status: TicketStatus }>(
      `/support/tickets/${encodeURIComponent(ticketId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }
    );
  }
}
