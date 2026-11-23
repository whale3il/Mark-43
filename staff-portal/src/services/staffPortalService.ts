import { STAFF_CONFIG } from '../config/staffConfig';
import {
  CallSessionPayload,
  CannedResponse,
  CustomerProfile,
  MessageReaction,
  StaffApiResult,
  StaffAvailabilityEnum,
  StaffChatMessage,
  StaffConversation,
  StaffNotificationPreferences,
  StaffOverviewSummary,
  StaffTicket,
  SupportAgent,
  SupportCallSession,
  SupportCallSignalPayload,
  SupportCallType,
  TicketStatus,
  TicketWhisperNote,
} from '../types/staff.types';
import { staffApiRequest, isDevMockFallbackEligible } from './staffApiClient';
import { normalizeAvailability } from './staffAuthService';
import {
  isSafeMediaUrl,
  normalizeCallSession,
  normalizeConversationStatus,
} from '@/src/services/supportService';
import mockDataJson from '@/src/data/mockData.json';
import {
  INITIAL_CONVERSATIONS,
  INITIAL_TICKETS,
  STAFF_PORTAL_TICKET_EXTENSIONS,
} from '@/src/data/mockData';

const JSON_CANNED_RESPONSES = mockDataJson.cannedResponses as CannedResponse[];
const JSON_NOTIFICATION_PREFS =
  mockDataJson.staffPortalNotificationPreferences as StaffNotificationPreferences;
const JSON_PREVIEW_PROFILE = mockDataJson.staffPortalPreviewProfile as any;
const JSON_RECENT_ACTIVITY = mockDataJson.staffPortalRecentActivity as any[];
const JSON_CUSTOMERS = mockDataJson.supportCustomers as unknown as Record<
  string,
  CustomerProfile
>;

export function normalizeStaffMessage(
  raw: any,
  fallbackConvId: string
): StaffChatMessage {
  const reactions: MessageReaction[] = Array.isArray(raw?.reactions)
    ? raw.reactions.map((r: any) => ({
        emoji: String(r.emoji || ''),
        count: Number(r.count || 0),
        reactedByMe: Boolean(r.reactedByMe),
      }))
    : [];

  const rawSender = String(raw?.sender || raw?.senderRole || '').toLowerCase();
  const sender: StaffChatMessage['sender'] =
    rawSender === 'system'
      ? 'system'
      : rawSender === 'staff' || rawSender === 'agent' || rawSender === 'admin'
      ? 'agent'
      : 'customer';

  const rawAtt = raw?.attachment;
  const attachment: StaffChatMessage['attachment'] = rawAtt
    ? {
        id: rawAtt.id || rawAtt.attachmentId || raw?.attachmentId,
        attachmentId: rawAtt.attachmentId || rawAtt.id || raw?.attachmentId,
        name: String(rawAtt.name || rawAtt.fileName || 'Attachment'),
        size: String(rawAtt.size || rawAtt.fileSize || ''),
        sizeBytes: typeof rawAtt.sizeBytes === 'number' ? rawAtt.sizeBytes : undefined,
        mimeType: rawAtt.mimeType || rawAtt.contentType,
        type: rawAtt.type || 'document',
        url: isSafeMediaUrl(rawAtt.url) ? rawAtt.url : undefined,
      }
    : undefined;

  const rawVoice = raw?.voiceNote || raw?.voice_note;
  const voiceNote: StaffChatMessage['voiceNote'] = rawVoice
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
  const status: StaffChatMessage['status'] =
    rawStatus === 'read' || raw?.readByCustomerAt || raw?.readAt
      ? 'read'
      : rawStatus === 'delivered' || raw?.deliveredAt
      ? 'delivered'
      : 'sent';

  return {
    id: String(raw?.id || `msg-${Date.now()}`),
    conversationId: String(
      raw?.conversationId || raw?.conversation_id || fallbackConvId
    ),
    sender,
    agentId: raw?.agentId || raw?.staffId || raw?.agent_id || raw?.senderId,
    agentName: raw?.agentName || raw?.staffName || raw?.agent_name || raw?.senderName,
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
    type:
      raw?.type ||
      (voiceNote
        ? 'voice'
        : attachment
        ? 'attachment'
        : sender === 'system'
        ? 'system'
        : 'text'),
    attachmentId:
      raw?.attachmentId || attachment?.attachmentId || voiceNote?.attachmentId,
    attachment,
    voiceNote,
    isPrivateNote: Boolean(raw?.isPrivateNote ?? raw?.isWhisper ?? raw?.is_whisper),
    isWhisper: Boolean(raw?.isWhisper ?? raw?.is_whisper ?? raw?.isPrivateNote),
    aiSuggested: Boolean(raw?.aiSuggested),
    clientTempId: raw?.clientTempId || raw?.client_temp_id,
    pending: false,
    failed: false,
    editedAt: raw?.editedAt || raw?.edited_at,
    deletedAt: raw?.deletedAt || raw?.deleted_at,
    reactions,
    readByCustomerAt: raw?.readByCustomerAt,
    readByStaffAt: raw?.readByStaffAt,
  };
}

export function normalizeStaffConversation(raw: any): StaffConversation {
  const id = String(raw?.id || '');
  const rawAgent = raw?.agent || raw?.staff || {};
  const agent: SupportAgent = {
    id: String(rawAgent?.id || raw?.assignedStaffId || raw?.staffId || ''),
    name: String(rawAgent?.name || 'Assigned Specialist'),
    role: String(rawAgent?.role || 'Support Specialist'),
    department: rawAgent?.department || raw?.department || 'Private Wealth',
    specialization: String(rawAgent?.specialization || ''),
    initials:
      rawAgent?.initials ||
      String(rawAgent?.name || 'SP')
        .slice(0, 2)
        .toUpperCase(),
    status: String(
      normalizeAvailability(rawAgent?.availability ?? rawAgent?.status)
    ).toLowerCase() as SupportAgent['status'],
    responseTime: String(rawAgent?.responseTime || '< 2 mins'),
    license: String(rawAgent?.license || ''),
    office: String(rawAgent?.office || ''),
    directPhone: String(rawAgent?.directPhone || ''),
    email: String(rawAgent?.email || ''),
    activeConversationsCount: Number(rawAgent?.activeConversationsCount || 0),
    availabilityLabel: String(rawAgent?.availabilityLabel || ''),
  };

  const messages = Array.isArray(raw?.messages)
    ? raw.messages.map((m: any) => normalizeStaffMessage(m, id))
    : [];

  return {
    id,
    agent,
    assignedStaffId: String(
      raw?.assignedStaffId || raw?.staffId || rawAgent?.id || ''
    ),
    customerId: String(raw?.customerId || raw?.customer?.id || ''),
    customerName: String(
      raw?.customerName || raw?.customer?.name || 'Private Client'
    ),
    customerTier: String(
      raw?.customerTier || raw?.customer?.clientTier || 'Private Client'
    ),
    customerAvatar: raw?.customerAvatar || raw?.customer?.avatarUrl,
    customerOnline: Boolean(raw?.customerOnline),
    customerLastSeenAt: raw?.customerLastSeenAt,
    subject: String(raw?.subject || 'Client Support Thread'),
    department: String(raw?.department || agent.department || 'Private Wealth'),
    category: raw?.category || 'General Support',
    lastMessage: String(
      raw?.lastMessage ||
        messages[messages.length - 1]?.text ||
        'Conversation opened'
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
    status: normalizeConversationStatus(raw?.status),
    queuePosition:
      typeof raw?.queuePosition === 'number' ? raw.queuePosition : undefined,
    closedAt: raw?.closedAt || raw?.closed_at,
    linkedTicketId: raw?.linkedTicketId || raw?.ticketId,
    internalNotes: raw?.internalNotes,
    messages,
    createdAt: raw?.createdAt,
  };
}

function normalizeTicket(raw: any): StaffTicket {
  const whisperNotes: TicketWhisperNote[] = Array.isArray(raw?.whisperNotes)
    ? raw.whisperNotes.map((w: any) => ({
        id: String(w.id || `wsp-${Date.now()}`),
        ticketId: String(w.ticketId || raw.id || ''),
        authorId: String(w.authorId || ''),
        authorName: String(w.authorName || 'Staff Member'),
        content: String(w.content || w.text || ''),
        isWhisper: true,
        createdAt: String(w.createdAt || ''),
      }))
    : [];

  return {
    id: String(raw?.id || ''),
    subject: String(raw?.subject || ''),
    category: raw?.category || 'Wire Clearance',
    priority: raw?.priority || 'Normal',
    status: raw?.status || 'Open',
    createdAt: String(raw?.createdAt || ''),
    updatedAt: String(raw?.updatedAt || ''),
    assignedAgent: String(raw?.assignedAgent || raw?.staffName || ''),
    assignedAgentId: raw?.assignedAgentId || raw?.staffId,
    customerId: raw?.customerId,
    customerName: raw?.customerName,
    description: String(raw?.description || ''),
    conversationId: raw?.conversationId,
    investigationNotes: raw?.investigationNotes || raw?.investigation_notes,
    resolution: raw?.resolution,
    whisperNotes,
    slaDueAt: raw?.slaDueAt,
  };
}

export const staffPortalService = {
  /**
   * Fetches scoped overview metrics & recent activity.
   */
  async getOverview(
    scopedStaffId?: string
  ): Promise<StaffApiResult<StaffOverviewSummary>> {
    const res = await staffApiRequest<StaffOverviewSummary>(
      STAFF_CONFIG.endpoints.staff.overview
    );

    if (res.success && res.data) {
      return { ...res, isMockFallback: false };
    }

    if (isDevMockFallbackEligible(res.error)) {
      const targetStaffId = scopedStaffId || JSON_PREVIEW_PROFILE.id;
      const scopedConvs = INITIAL_CONVERSATIONS.filter(
        (c) => c.agent.id === targetStaffId
      );
      const scopedTickets = INITIAL_TICKETS.filter(
        (t) => t.assignedAgentId === targetStaffId
      );
      const resolvedCount = scopedTickets.filter(
        (t) => t.status === 'Resolved'
      ).length;

      return {
        success: true,
        isMockFallback: true,
        fallbackReason: res.error?.message,
        data: {
          activeConversations: scopedConvs.filter((c) => c.status === 'active')
            .length,
          pendingConversations: scopedConvs.filter((c) => c.status === 'pending')
            .length,
          unreadMessages: scopedConvs.reduce(
            (sum, c) => sum + (c.unreadCount || 0),
            0
          ),
          maxChats: JSON_PREVIEW_PROFILE.maxChats,
          assignedTickets: scopedTickets.length,
          openTickets: scopedTickets.length - resolvedCount,
          resolvedTickets: resolvedCount,
          availability: JSON_PREVIEW_PROFILE.availability,
          recentActivity: JSON_RECENT_ACTIVITY,
        },
      };
    }

    return { success: false, error: res.error };
  },

  /**
   * Fetches live staff availability & active chat capacity.
   */
  async getAvailability(): Promise<
    StaffApiResult<{
      availability: StaffAvailabilityEnum;
      activeChatsCount?: number;
      maxChats?: number;
    }>
  > {
    const res = await staffApiRequest<any>(
      STAFF_CONFIG.endpoints.staff.availability
    );
    if (!res.success || !res.data) {
      return { success: false, error: res.error };
    }
    const d = res.data;
    return {
      success: true,
      data: {
        availability: normalizeAvailability(d.availability ?? d.status),
        activeChatsCount:
          typeof d.activeChatsCount === 'number'
            ? d.activeChatsCount
            : typeof d.activeChats === 'number'
            ? d.activeChats
            : undefined,
        maxChats: typeof d.maxChats === 'number' ? d.maxChats : undefined,
      },
    };
  },

  /**
   * Updates staff availability (`ONLINE` | `BUSY` | `AWAY` | `OFFLINE`).
   * OFFLINE stops new routing while keeping staff authenticated.
   */
  async updateAvailability(
    availability: StaffAvailabilityEnum
  ): Promise<
    StaffApiResult<{
      availability: StaffAvailabilityEnum;
      activeChatsCount?: number;
      maxChats?: number;
    }>
  > {
    const res = await staffApiRequest<any>(
      STAFF_CONFIG.endpoints.staff.availability,
      {
        method: 'PATCH',
        body: JSON.stringify({ availability }),
      }
    );
    if (!res.success || !res.data) {
      return { success: false, error: res.error };
    }
    const d = res.data;
    return {
      success: true,
      data: {
        availability: normalizeAvailability(d.availability ?? d.status ?? availability),
        activeChatsCount:
          typeof d.activeChatsCount === 'number'
            ? d.activeChatsCount
            : typeof d.activeChats === 'number'
            ? d.activeChats
            : undefined,
        maxChats: typeof d.maxChats === 'number' ? d.maxChats : undefined,
      },
    };
  },

  /**
   * Fetches conversations strictly scoped to authenticated staff member (`requireStaff`).
   */
  async listScopedConversations(scopedStaffId?: string): Promise<
    StaffApiResult<{
      conversations: StaffConversation[];
      customers: Record<string, CustomerProfile>;
    }>
  > {
    const res = await staffApiRequest<any>(
      STAFF_CONFIG.endpoints.staff.conversations
    );

    if (res.success && res.data) {
      const list = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data.conversations)
        ? res.data.conversations
        : [];
      const customers =
        res.data.customers && typeof res.data.customers === 'object'
          ? res.data.customers
          : {};
      return {
        success: true,
        isMockFallback: false,
        data: {
          conversations: list
            .map(normalizeStaffConversation)
            .filter((c: StaffConversation) => c.status !== 'closed'),
          customers,
        },
      };
    }

    if (isDevMockFallbackEligible(res.error)) {
      const targetStaffId = scopedStaffId || JSON_PREVIEW_PROFILE.id;
      const scopedConvs = INITIAL_CONVERSATIONS.filter(
        (c) => c.agent.id === targetStaffId
      ).map((c) =>
        normalizeStaffConversation({
          ...c,
          assignedStaffId: c.agent.id,
          customerOnline: c.id === 'conv-1',
        })
      );

      return {
        success: true,
        isMockFallback: true,
        fallbackReason: res.error?.message,
        data: {
          conversations: scopedConvs,
          customers: JSON_CUSTOMERS,
        },
      };
    }

    return {
      success: false,
      error: res.error,
    };
  },

  /**
   * GET /api/staff/conversations/:id/messages
   */
  async getConversationMessages(
    conversationId: string
  ): Promise<StaffApiResult<StaffChatMessage[]>> {
    const res = await staffApiRequest<any>(
      `${STAFF_CONFIG.endpoints.staff.conversations}/${encodeURIComponent(
        conversationId
      )}/messages`
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
      data: list.map((m: any) => normalizeStaffMessage(m, conversationId)),
    };
  },

  /**
   * Sends a reply or internal whisper note inside a scoped conversation.
   */
  async sendMessage(
    conversationId: string,
    payload: {
      text: string;
      isWhisper?: boolean;
      type?: 'text' | 'attachment' | 'voice';
      attachmentId?: string;
      attachment?: StaffChatMessage['attachment'];
      voiceNote?: StaffChatMessage['voiceNote'];
      clientTempId?: string;
    }
  ): Promise<StaffApiResult<StaffChatMessage>> {
    const res = await staffApiRequest<any>(
      `${STAFF_CONFIG.endpoints.staff.conversations}/${encodeURIComponent(
        conversationId
      )}/messages`,
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
      data: normalizeStaffMessage(rawMsg, conversationId),
    };
  },

  /**
   * POST /api/support/conversations/:id/end-session
   * Permanently closes session & releases staff active chat capacity.
   */
  async endSession(
    conversationId: string
  ): Promise<StaffApiResult<{ conversationId: string; status?: string }>> {
    return staffApiRequest<{ conversationId: string; status?: string }>(
      `${STAFF_CONFIG.endpoints.sharedSupport.conversations}/${encodeURIComponent(
        conversationId
      )}/end-session`,
      {
        method: 'POST',
      }
    );
  },

  /**
   * Edits an existing staff message.
   */
  async editMessage(
    conversationId: string,
    messageId: string,
    text: string
  ): Promise<StaffApiResult<StaffChatMessage>> {
    const res = await staffApiRequest<any>(
      `${STAFF_CONFIG.endpoints.staff.conversations}/${encodeURIComponent(
        conversationId
      )}/messages/${encodeURIComponent(messageId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ text }),
      }
    );

    if (!res.success || !res.data) {
      return { success: false, error: res.error };
    }

    return {
      success: true,
      data: normalizeStaffMessage(res.data.message || res.data, conversationId),
    };
  },

  /**
   * Soft-deletes or removes an existing staff message.
   */
  async deleteMessage(
    conversationId: string,
    messageId: string
  ): Promise<StaffApiResult<{ id: string; deletedAt?: string }>> {
    return staffApiRequest<{ id: string; deletedAt?: string }>(
      `${STAFF_CONFIG.endpoints.staff.conversations}/${encodeURIComponent(
        conversationId
      )}/messages/${encodeURIComponent(messageId)}`,
      {
        method: 'DELETE',
      }
    );
  },

  /**
   * Toggles a reaction emoji on a message.
   */
  async reactToMessage(
    conversationId: string,
    messageId: string,
    emoji: string
  ): Promise<StaffApiResult<{ messageId: string; reactions: MessageReaction[] }>> {
    return staffApiRequest<{ messageId: string; reactions: MessageReaction[] }>(
      `${STAFF_CONFIG.endpoints.staff.conversations}/${encodeURIComponent(
        conversationId
      )}/messages/${encodeURIComponent(messageId)}/reactions`,
      {
        method: 'POST',
        body: JSON.stringify({ emoji }),
      }
    );
  },

  /**
   * Updates conversation status, unread count, or private dossier notes.
   */
  async updateConversation(
    conversationId: string,
    updates: {
      status?: 'active' | 'pending' | 'resolved';
      unreadCount?: number;
      internalNotes?: string;
    }
  ): Promise<StaffApiResult<Partial<StaffConversation>>> {
    return staffApiRequest<Partial<StaffConversation>>(
      `${STAFF_CONFIG.endpoints.staff.conversations}/${encodeURIComponent(
        conversationId
      )}`,
      {
        method: 'PATCH',
        body: JSON.stringify(updates),
      }
    );
  },

  /**
   * Marks messages in a conversation as read by staff.
   */
  async markConversationRead(
    conversationId: string
  ): Promise<StaffApiResult<void>> {
    return staffApiRequest<void>(
      `${STAFF_CONFIG.endpoints.staff.conversations}/${encodeURIComponent(
        conversationId
      )}/read`,
      {
        method: 'POST',
      }
    );
  },

  /**
   * POST /api/support/conversations/:id/typing
   */
  async sendTyping(
    conversationId: string,
    isTyping: boolean
  ): Promise<StaffApiResult<void>> {
    return staffApiRequest<void>(
      `${STAFF_CONFIG.endpoints.sharedSupport.conversations}/${encodeURIComponent(
        conversationId
      )}/typing`,
      {
        method: 'POST',
        body: JSON.stringify({ isTyping }),
      }
    );
  },

  /**
   * POST /api/support/conversations/:id/receipts/delivered
   */
  async markDelivered(
    conversationId: string,
    messageId?: string
  ): Promise<StaffApiResult<void>> {
    return staffApiRequest<void>(
      `${STAFF_CONFIG.endpoints.sharedSupport.conversations}/${encodeURIComponent(
        conversationId
      )}/receipts/delivered`,
      {
        method: 'POST',
        body: JSON.stringify(messageId ? { messageId } : {}),
      }
    );
  },

  /**
   * POST /api/support/conversations/:id/receipts/read
   */
  async markRead(
    conversationId: string,
    messageId?: string
  ): Promise<StaffApiResult<void>> {
    return staffApiRequest<void>(
      `${STAFF_CONFIG.endpoints.sharedSupport.conversations}/${encodeURIComponent(
        conversationId
      )}/receipts/read`,
      {
        method: 'POST',
        body: JSON.stringify(messageId ? { messageId } : {}),
      }
    );
  },

  /**
   * Searches message history via backend endpoint when implemented.
   */
  async searchConversationMessages(
    conversationId: string,
    query: string
  ): Promise<StaffApiResult<StaffChatMessage[]>> {
    const q = new URLSearchParams({ q: query });
    const res = await staffApiRequest<any>(
      `${STAFF_CONFIG.endpoints.staff.conversations}/${encodeURIComponent(
        conversationId
      )}/messages/search?${q.toString()}`
    );

    if (!res.success || !res.data) {
      return { success: false, error: res.error };
    }
    const items = Array.isArray(res.data) ? res.data : res.data.messages || [];
    return {
      success: true,
      data: items.map((m: any) => normalizeStaffMessage(m, conversationId)),
    };
  },

  /**
   * POST /api/support/conversations/:id/attachments (falls back to /staff/attachments on 404/405).
   */
  async uploadAttachment(
    conversationId: string,
    file: File
  ): Promise<StaffApiResult<StaffChatMessage['attachment']>> {
    const formData = new FormData();
    formData.append('conversationId', conversationId);
    formData.append('type', 'attachment');
    formData.append('file', file, file.name);

    let res = await staffApiRequest<any>(
      `${STAFF_CONFIG.endpoints.sharedSupport.conversations}/${encodeURIComponent(
        conversationId
      )}/attachments`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (
      !res.success &&
      (res.error?.status === 404 || res.error?.status === 405)
    ) {
      const legacyFd = new FormData();
      legacyFd.append('conversationId', conversationId);
      legacyFd.append('file', file);
      res = await staffApiRequest<any>(STAFF_CONFIG.endpoints.staff.attachments, {
        method: 'POST',
        body: legacyFd,
      });
    }

    if (!res.success || !res.data) {
      return { success: false, error: res.error };
    }

    const d = res.data.attachment || res.data;
    const attachmentId = String(d.attachmentId || d.id || '');
    const safeUrl = isSafeMediaUrl(d.url) ? d.url : undefined;

    return {
      success: true,
      data: {
        id: attachmentId || undefined,
        attachmentId: attachmentId || undefined,
        name: String(d.name || d.fileName || file.name),
        size: String(
          d.size ||
            (file.size >= 1024 * 1024
              ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
              : `${Math.max(1, Math.round(file.size / 1024))} KB`)
        ),
        sizeBytes: file.size,
        mimeType: d.mimeType || file.type || undefined,
        type:
          d.type ||
          (file.name.toLowerCase().endsWith('.pdf')
            ? 'pdf'
            : file.type.startsWith('image/')
            ? 'image'
            : 'document'),
        url: safeUrl,
      },
    };
  },

  /**
   * POST /api/support/conversations/:id/attachments with type='voice' (falls back to /staff/voice-notes on 404/405).
   */
  async uploadVoiceNote(
    conversationId: string,
    audioBlob: Blob,
    durationSeconds: number
  ): Promise<StaffApiResult<StaffChatMessage['voiceNote']>> {
    const fileName = `voice-${Date.now()}.webm`;
    const formData = new FormData();
    formData.append('conversationId', conversationId);
    formData.append('type', 'voice');
    formData.append('durationSeconds', String(durationSeconds));
    formData.append('file', audioBlob, fileName);

    let res = await staffApiRequest<any>(
      `${STAFF_CONFIG.endpoints.sharedSupport.conversations}/${encodeURIComponent(
        conversationId
      )}/attachments`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (
      !res.success &&
      (res.error?.status === 404 || res.error?.status === 405)
    ) {
      const legacyFd = new FormData();
      legacyFd.append('conversationId', conversationId);
      legacyFd.append('durationSeconds', String(durationSeconds));
      legacyFd.append('audio', audioBlob, fileName);
      res = await staffApiRequest<any>(STAFF_CONFIG.endpoints.staff.voiceNotes, {
        method: 'POST',
        body: legacyFd,
      });
    }

    if (!res.success || !res.data) {
      return { success: false, error: res.error };
    }

    const d = res.data.attachment || res.data.voiceNote || res.data;
    const attachmentId = String(d.attachmentId || d.id || '');
    const safeUrl = isSafeMediaUrl(d.audioUrl || d.url)
      ? d.audioUrl || d.url
      : undefined;

    return {
      success: true,
      data: {
        id: attachmentId || undefined,
        attachmentId: attachmentId || undefined,
        durationSeconds: Number(d.durationSeconds || durationSeconds),
        audioUrl: safeUrl,
        mimeType: d.mimeType || audioBlob.type || 'audio/webm',
      },
    };
  },

  /**
   * GET /api/support/attachments/:attachmentId/url
   */
  async getAttachmentUrl(
    attachmentId: string
  ): Promise<StaffApiResult<{ url: string; expiresAt?: string }>> {
    const res = await staffApiRequest<any>(
      `${STAFF_CONFIG.endpoints.sharedSupport.attachments}/${encodeURIComponent(
        attachmentId
      )}/url`
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
  },

  /**
   * POST /api/support/conversations/:id/calls
   */
  async startCall(
    conversationId: string,
    type: SupportCallType
  ): Promise<StaffApiResult<SupportCallSession>> {
    const res = await staffApiRequest<any>(
      `${STAFF_CONFIG.endpoints.sharedSupport.conversations}/${encodeURIComponent(
        conversationId
      )}/calls`,
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
  },

  /**
   * GET /api/support/conversations/:id/calls
   */
  async listCalls(
    conversationId: string
  ): Promise<StaffApiResult<SupportCallSession[]>> {
    const res = await staffApiRequest<any>(
      `${STAFF_CONFIG.endpoints.sharedSupport.conversations}/${encodeURIComponent(
        conversationId
      )}/calls`
    );
    if (!res.success || !res.data) {
      return { success: false, error: res.error };
    }
    const items = Array.isArray(res.data) ? res.data : res.data.calls || [];
    return {
      success: true,
      data: items.map((c: any) => normalizeCallSession(c, conversationId)),
    };
  },

  /**
   * POST /api/support/calls/:callId/accept
   */
  async acceptCall(callId: string): Promise<StaffApiResult<SupportCallSession>> {
    const res = await staffApiRequest<any>(
      `${STAFF_CONFIG.endpoints.sharedSupport.calls}/${encodeURIComponent(
        callId
      )}/accept`,
      { method: 'POST' }
    );
    if (!res.success || !res.data) {
      return { success: false, error: res.error };
    }
    return {
      success: true,
      data: normalizeCallSession(res.data.call || res.data),
    };
  },

  /**
   * POST /api/support/calls/:callId/reject
   */
  async rejectCall(callId: string): Promise<StaffApiResult<SupportCallSession>> {
    const res = await staffApiRequest<any>(
      `${STAFF_CONFIG.endpoints.sharedSupport.calls}/${encodeURIComponent(
        callId
      )}/reject`,
      { method: 'POST' }
    );
    if (!res.success || !res.data) {
      return { success: false, error: res.error };
    }
    return {
      success: true,
      data: normalizeCallSession(res.data.call || res.data),
    };
  },

  /**
   * POST /api/support/calls/:callId/end
   */
  async endCall(callId: string): Promise<StaffApiResult<SupportCallSession>> {
    const res = await staffApiRequest<any>(
      `${STAFF_CONFIG.endpoints.sharedSupport.calls}/${encodeURIComponent(
        callId
      )}/end`,
      { method: 'POST' }
    );
    if (!res.success || !res.data) {
      return { success: false, error: res.error };
    }
    return {
      success: true,
      data: normalizeCallSession(res.data.call || res.data),
    };
  },

  /**
   * POST /api/support/calls/:callId/signal
   */
  async sendCallSignal(
    callId: string,
    signal: Omit<SupportCallSignalPayload, 'callId'>
  ): Promise<StaffApiResult<void>> {
    return staffApiRequest<void>(
      `${STAFF_CONFIG.endpoints.sharedSupport.calls}/${encodeURIComponent(
        callId
      )}/signal`,
      {
        method: 'POST',
        body: JSON.stringify(signal),
      }
    );
  },

  /**
   * Legacy signaling probe retained for compatibility.
   */
  async initiateCallSession(
    conversationId: string,
    mode: 'audio' | 'video'
  ): Promise<StaffApiResult<CallSessionPayload>> {
    return staffApiRequest<CallSessionPayload>(
      STAFF_CONFIG.endpoints.staff.callSession,
      {
        method: 'POST',
        body: JSON.stringify({ conversationId, mode }),
      }
    );
  },

  /**
   * Fetches tickets strictly assigned to authenticated staff member.
   */
  async listScopedTickets(
    scopedStaffId?: string
  ): Promise<StaffApiResult<StaffTicket[]>> {
    const res = await staffApiRequest<any>(STAFF_CONFIG.endpoints.staff.tickets);
    if (res.success && res.data) {
      const list = Array.isArray(res.data) ? res.data : res.data.tickets || [];
      return {
        success: true,
        isMockFallback: false,
        data: list.map(normalizeTicket),
      };
    }

    if (isDevMockFallbackEligible(res.error)) {
      const targetStaffId = scopedStaffId || JSON_PREVIEW_PROFILE.id;
      const scopedTickets = INITIAL_TICKETS.filter(
        (t) => t.assignedAgentId === targetStaffId
      ).map((t) => {
        const ext = STAFF_PORTAL_TICKET_EXTENSIONS[t.id];
        return normalizeTicket({
          ...t,
          investigationNotes: ext?.investigationNotes,
          resolution: ext?.resolution,
          whisperNotes: ext?.whisperNotes || [],
        });
      });

      return {
        success: true,
        isMockFallback: true,
        fallbackReason: res.error?.message,
        data: scopedTickets,
      };
    }

    return { success: false, error: res.error };
  },

  /**
   * Updates ticket status, investigation notes, or resolution.
   */
  async updateTicket(
    ticketId: string,
    updates: {
      status?: TicketStatus;
      investigationNotes?: string;
      resolution?: string;
    }
  ): Promise<StaffApiResult<StaffTicket>> {
    const res = await staffApiRequest<any>(
      `${STAFF_CONFIG.endpoints.staff.tickets}/${encodeURIComponent(ticketId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(updates),
      }
    );
    if (!res.success || !res.data) {
      return { success: false, error: res.error };
    }
    return {
      success: true,
      data: normalizeTicket(res.data),
    };
  },

  /**
   * Adds an authorized `isWhisper` internal note onto a ticket.
   */
  async addTicketWhisperNote(
    ticketId: string,
    content: string
  ): Promise<StaffApiResult<TicketWhisperNote>> {
    return staffApiRequest<TicketWhisperNote>(
      `${STAFF_CONFIG.endpoints.staff.tickets}/${encodeURIComponent(
        ticketId
      )}/notes`,
      {
        method: 'POST',
        body: JSON.stringify({ content, isWhisper: true }),
      }
    );
  },

  /**
   * Fetches approved canned responses for "/" shortcuts in composer.
   */
  async listCannedResponses(): Promise<StaffApiResult<CannedResponse[]>> {
    const res = await staffApiRequest<any>(
      STAFF_CONFIG.endpoints.sharedSupport.cannedResponses
    );
    if (res.success && res.data) {
      const items = Array.isArray(res.data) ? res.data : res.data.templates || [];
      return {
        success: true,
        isMockFallback: false,
        data: items,
      };
    }

    if (isDevMockFallbackEligible(res.error)) {
      return {
        success: true,
        isMockFallback: true,
        fallbackReason: res.error?.message,
        data: JSON_CANNED_RESPONSES,
      };
    }

    return { success: false, error: res.error };
  },

  /**
   * Fetches notification preferences for staff settings page.
   */
  async getNotificationPreferences(): Promise<
    StaffApiResult<StaffNotificationPreferences>
  > {
    const res = await staffApiRequest<StaffNotificationPreferences>(
      STAFF_CONFIG.endpoints.staff.notifications
    );
    if (res.success && res.data) {
      return { ...res, isMockFallback: false };
    }

    if (isDevMockFallbackEligible(res.error)) {
      return {
        success: true,
        isMockFallback: true,
        fallbackReason: res.error?.message,
        data: JSON_NOTIFICATION_PREFS,
      };
    }

    return { success: false, error: res.error };
  },

  /**
   * Saves notification preferences for staff settings page.
   */
  async updateNotificationPreferences(
    prefs: StaffNotificationPreferences
  ): Promise<StaffApiResult<StaffNotificationPreferences>> {
    return staffApiRequest<StaffNotificationPreferences>(
      STAFF_CONFIG.endpoints.staff.notifications,
      {
        method: 'PATCH',
        body: JSON.stringify(prefs),
      }
    );
  },
};
