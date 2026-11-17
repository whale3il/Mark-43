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
  TicketStatus,
  TicketWhisperNote,
} from '../types/staff.types';
import { staffApiRequest } from './staffApiClient';
import { normalizeAvailability } from './staffAuthService';

function normalizeMessage(raw: any, fallbackConvId: string): StaffChatMessage {
  const reactions: MessageReaction[] = Array.isArray(raw?.reactions)
    ? raw.reactions.map((r: any) => ({
        emoji: String(r.emoji || ''),
        count: Number(r.count || 0),
        reactedByMe: Boolean(r.reactedByMe),
      }))
    : [];

  return {
    id: String(raw?.id || `msg-${Date.now()}`),
    conversationId: String(raw?.conversationId || raw?.conversation_id || fallbackConvId),
    sender: raw?.sender === 'staff' ? 'agent' : raw?.sender || 'customer',
    agentId: raw?.agentId || raw?.staffId || raw?.agent_id,
    agentName: raw?.agentName || raw?.staffName || raw?.agent_name,
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
    status: raw?.status || 'delivered',
    attachment: raw?.attachment,
    voiceNote: raw?.voiceNote || raw?.voice_note,
    isPrivateNote: Boolean(raw?.isPrivateNote ?? raw?.isWhisper ?? raw?.is_whisper),
    isWhisper: Boolean(raw?.isWhisper ?? raw?.is_whisper ?? raw?.isPrivateNote),
    aiSuggested: Boolean(raw?.aiSuggested),
    editedAt: raw?.editedAt || raw?.edited_at,
    deletedAt: raw?.deletedAt || raw?.deleted_at,
    reactions,
    readByCustomerAt: raw?.readByCustomerAt,
    readByStaffAt: raw?.readByStaffAt,
  };
}

function normalizeConversation(raw: any): StaffConversation {
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
    status: String(normalizeAvailability(rawAgent?.availability ?? rawAgent?.status)).toLowerCase() as SupportAgent['status'],
    responseTime: String(rawAgent?.responseTime || '< 2 mins'),
    license: String(rawAgent?.license || ''),
    office: String(rawAgent?.office || ''),
    directPhone: String(rawAgent?.directPhone || ''),
    email: String(rawAgent?.email || ''),
    activeConversationsCount: Number(rawAgent?.activeConversationsCount || 0),
    availabilityLabel: String(rawAgent?.availabilityLabel || ''),
  };

  const messages = Array.isArray(raw?.messages)
    ? raw.messages.map((m: any) => normalizeMessage(m, id))
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
        ''
    ),
    unreadCount: Number(raw?.unreadCount ?? 0),
    status: raw?.status || 'active',
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
  async getOverview(): Promise<StaffApiResult<StaffOverviewSummary>> {
    const res = await staffApiRequest<StaffOverviewSummary>(
      STAFF_CONFIG.endpoints.staff.overview
    );
    return res;
  },

  /**
   * Fetches conversations strictly scoped to authenticated staff member (`requireStaff`).
   */
  async listScopedConversations(): Promise<
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
        data: {
          conversations: list.map(normalizeConversation),
          customers,
        },
      };
    }

    return {
      success: false,
      error: res.error,
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
      attachment?: StaffChatMessage['attachment'];
      voiceNote?: StaffChatMessage['voiceNote'];
    }
  ): Promise<StaffApiResult<StaffChatMessage>> {
    const res = await staffApiRequest<any>(
      `${STAFF_CONFIG.endpoints.staff.conversations}/${conversationId}/messages`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );

    if (!res.success || !res.data) {
      return { success: false, error: res.error };
    }

    return {
      success: true,
      data: normalizeMessage(res.data, conversationId),
    };
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
      `${STAFF_CONFIG.endpoints.staff.conversations}/${conversationId}/messages/${messageId}`,
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
      data: normalizeMessage(res.data, conversationId),
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
      `${STAFF_CONFIG.endpoints.staff.conversations}/${conversationId}/messages/${messageId}`,
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
      `${STAFF_CONFIG.endpoints.staff.conversations}/${conversationId}/messages/${messageId}/reactions`,
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
      `${STAFF_CONFIG.endpoints.staff.conversations}/${conversationId}`,
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
      `${STAFF_CONFIG.endpoints.staff.conversations}/${conversationId}/read`,
      {
        method: 'POST',
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
      `${STAFF_CONFIG.endpoints.staff.conversations}/${conversationId}/messages/search?${q.toString()}`
    );

    if (!res.success || !res.data) {
      return { success: false, error: res.error };
    }
    const items = Array.isArray(res.data) ? res.data : res.data.messages || [];
    return {
      success: true,
      data: items.map((m: any) => normalizeMessage(m, conversationId)),
    };
  },

  /**
   * Uploads attachment metadata / binary via FormData.
   */
  async uploadAttachment(
    conversationId: string,
    file: File
  ): Promise<StaffApiResult<StaffChatMessage['attachment']>> {
    const formData = new FormData();
    formData.append('conversationId', conversationId);
    formData.append('file', file);

    return staffApiRequest<StaffChatMessage['attachment']>(
      STAFF_CONFIG.endpoints.staff.attachments,
      {
        method: 'POST',
        body: formData,
      }
    );
  },

  /**
   * Uploads recorded voice note blob.
   */
  async uploadVoiceNote(
    conversationId: string,
    audioBlob: Blob,
    durationSeconds: number
  ): Promise<StaffApiResult<StaffChatMessage['voiceNote']>> {
    const formData = new FormData();
    formData.append('conversationId', conversationId);
    formData.append('durationSeconds', String(durationSeconds));
    formData.append('audio', audioBlob, `voice-${Date.now()}.webm`);

    return staffApiRequest<StaffChatMessage['voiceNote']>(
      STAFF_CONFIG.endpoints.staff.voiceNotes,
      {
        method: 'POST',
        body: formData,
      }
    );
  },

  /**
   * Prepares / initiates WebRTC or voice/video session via backend signaling endpoint.
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
  async listScopedTickets(): Promise<StaffApiResult<StaffTicket[]>> {
    const res = await staffApiRequest<any>(STAFF_CONFIG.endpoints.staff.tickets);
    if (!res.success || !res.data) {
      return { success: false, error: res.error };
    }
    const list = Array.isArray(res.data) ? res.data : res.data.tickets || [];
    return {
      success: true,
      data: list.map(normalizeTicket),
    };
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
      `${STAFF_CONFIG.endpoints.staff.tickets}/${ticketId}`,
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
      `${STAFF_CONFIG.endpoints.staff.tickets}/${ticketId}/notes`,
      {
        method: 'POST',
        body: JSON.stringify({ content, isWhisper: true }),
      }
    );
  },

  /**
   * Updates staff availability (`ONLINE` | `BUSY` | `AWAY` | `OFFLINE`).
   * Must be confirmed by backend before UI reflects the change.
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
    return staffApiRequest<{
      availability: StaffAvailabilityEnum;
      activeChatsCount?: number;
      maxChats?: number;
    }>(STAFF_CONFIG.endpoints.staff.availability, {
      method: 'PATCH',
      body: JSON.stringify({ availability }),
    });
  },

  /**
   * Fetches approved canned responses for "/" shortcuts in composer.
   */
  async listCannedResponses(): Promise<StaffApiResult<CannedResponse[]>> {
    const res = await staffApiRequest<any>(
      STAFF_CONFIG.endpoints.sharedSupport.cannedResponses
    );
    if (!res.success || !res.data) {
      return { success: false, error: res.error };
    }
    const items = Array.isArray(res.data) ? res.data : res.data.templates || [];
    return {
      success: true,
      data: items,
    };
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
