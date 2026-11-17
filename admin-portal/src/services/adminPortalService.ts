import { ADMIN_CONFIG } from '../config/adminConfig';
import {
  AdminAccountStatus,
  AdminApiResult,
  AdminAvailabilityEnum,
  AdminChatMessage,
  AdminConversation,
  AdminNotificationPreferences,
  AdminOverviewData,
  AdminStaffRecord,
  AdminTicket,
  AdminTicketWhisperNote,
  CreateStaffInput,
  CustomerProfile,
  MessageReaction,
  SupportAgent,
  TicketStatus,
  UpdateStaffInput,
} from '../types/admin.types';
import {
  adminApiRequest,
  isDevMockFallbackEligible,
} from './adminApiClient';
import {
  ADMIN_PORTAL_ACTIVITY_FEED,
  ADMIN_PORTAL_DEPARTMENT_METRICS,
  ADMIN_PORTAL_EXTRA_TICKETS,
  ADMIN_PORTAL_NOTIFICATION_PREFERENCES,
  ADMIN_PORTAL_STAFF_DIRECTORY,
  ADMIN_PORTAL_WAITING_QUEUE,
  INITIAL_CONVERSATIONS,
  INITIAL_TICKETS,
  SUPPORT_AGENTS,
  SUPPORT_CUSTOMERS,
} from '@/src/data/mockData';
import { STAFF_PORTAL_TICKET_EXTENSIONS } from '@/src/data/mockData';

function normalizeAvailability(raw?: unknown): AdminAvailabilityEnum {
  const val = String(raw || '').trim().toUpperCase();
  if (val === 'ONLINE' || val === 'BUSY' || val === 'AWAY' || val === 'OFFLINE') {
    return val;
  }
  return 'OFFLINE';
}

function normalizeAccountStatus(raw?: unknown): AdminAccountStatus {
  const val = String(raw || '').trim().toUpperCase();
  if (
    val === 'ACTIVE' ||
    val === 'INVITED' ||
    val === 'SUSPENDED' ||
    val === 'DEACTIVATED'
  ) {
    return val;
  }
  return 'ACTIVE';
}

function normalizeStaffRecord(raw: any): AdminStaffRecord {
  const fullName =
    raw?.fullName ||
    raw?.name ||
    [raw?.firstName, raw?.lastName].filter(Boolean).join(' ') ||
    raw?.email ||
    'Support Specialist';
  const nameParts = String(fullName).trim().split(/\s+/);
  const firstName = String(raw?.firstName || nameParts[0] || '');
  const lastName = String(
    raw?.lastName || (nameParts.length > 1 ? nameParts.slice(1).join(' ') : '')
  );

  return {
    id: String(raw?.id || raw?.staffId || ''),
    firstName,
    lastName,
    fullName,
    username: String(
      raw?.username ||
        String(raw?.email || fullName)
          .split('@')[0]
          .toLowerCase()
          .replace(/[^a-z0-9._-]/g, '')
    ),
    email: String(raw?.email || ''),
    department: String(raw?.department || 'Private Wealth'),
    role: String(raw?.role || raw?.title || 'Support Specialist'),
    availability: normalizeAvailability(raw?.availability ?? raw?.status),
    activeConversationsCount: Number(
      raw?.activeConversationsCount ??
        raw?.activeChatsCount ??
        raw?.active_chats_count ??
        0
    ),
    maxChats: Number(raw?.maxChats ?? raw?.max_chats ?? ADMIN_CONFIG.defaultMaxChats),
    accountStatus: normalizeAccountStatus(
      raw?.accountStatus ?? raw?.account_status ?? (raw?.isActive === false ? 'DEACTIVATED' : 'ACTIVE')
    ),
    lastSeenAt: raw?.lastSeenAt || raw?.last_seen_at,
    createdAt: raw?.createdAt || raw?.created_at,
  };
}

function normalizeMessage(raw: any, fallbackConvId: string): AdminChatMessage {
  const reactions: MessageReaction[] = Array.isArray(raw?.reactions)
    ? raw.reactions.map((r: any) => ({
        emoji: String(r.emoji || ''),
        count: Number(r.count || 0),
        reactedByMe: Boolean(r.reactedByMe),
      }))
    : [];

  return {
    id: String(raw?.id || `msg-${Date.now()}`),
    conversationId: String(
      raw?.conversationId || raw?.conversation_id || fallbackConvId
    ),
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
    isPrivateNote: Boolean(
      raw?.isPrivateNote ?? raw?.isWhisper ?? raw?.is_whisper
    ),
    isWhisper: Boolean(
      raw?.isWhisper ?? raw?.is_whisper ?? raw?.isPrivateNote
    ),
    editedAt: raw?.editedAt || raw?.edited_at,
    deletedAt: raw?.deletedAt || raw?.deleted_at,
    reactions,
    readByCustomerAt: raw?.readByCustomerAt,
    readByStaffAt: raw?.readByStaffAt,
  };
}

function normalizeConversation(raw: any): AdminConversation {
  const id = String(raw?.id || '');
  const rawAgent = raw?.agent || raw?.staff || {};
  const assignedStaffId = String(
    raw?.assignedStaffId || raw?.staffId || rawAgent?.id || ''
  );
  const isUnassigned = Boolean(raw?.isUnassigned || !assignedStaffId);

  const assignedStaffName = isUnassigned
    ? 'Unassigned Queue'
    : String(
        raw?.assignedStaffName || rawAgent?.name || 'Assigned Specialist'
      );

  const agent: SupportAgent = {
    id: assignedStaffId,
    name: assignedStaffName,
    role: String(rawAgent?.role || 'Support Specialist'),
    department: rawAgent?.department || raw?.department || 'Private Wealth',
    specialization: String(rawAgent?.specialization || ''),
    initials:
      rawAgent?.initials ||
      assignedStaffName.slice(0, 2).toUpperCase(),
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
    ? raw.messages.map((m: any) => normalizeMessage(m, id))
    : [];

  return {
    id,
    agent,
    assignedStaffId,
    assignedStaffName,
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
    isUnassigned,
    waitingSince: raw?.waitingSince,
    isEscalated: Boolean(raw?.isEscalated),
  };
}

function normalizeTicket(raw: any): AdminTicket {
  const whisperNotes: AdminTicketWhisperNote[] = Array.isArray(raw?.whisperNotes)
    ? raw.whisperNotes.map((w: any) => ({
        id: String(w.id || `wsp-${Date.now()}`),
        ticketId: String(w.ticketId || raw.id || ''),
        authorId: String(w.authorId || ''),
        authorName: String(w.authorName || 'Operations Staff'),
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
    assignedAgent: String(raw?.assignedAgent || raw?.staffName || 'Auto-Routing'),
    assignedAgentId: raw?.assignedAgentId || raw?.staffId,
    customerId: raw?.customerId,
    customerName: raw?.customerName,
    description: String(raw?.description || ''),
    conversationId: raw?.conversationId,
    investigationNotes: raw?.investigationNotes || raw?.investigation_notes,
    resolution: raw?.resolution,
    whisperNotes,
    slaDueAt: raw?.slaDueAt,
    autoAssigned: raw?.autoAssigned ?? true,
  };
}

function buildPreviewConversations(): {
  conversations: AdminConversation[];
  customers: Record<string, CustomerProfile>;
} {
  const sarahAgent: SupportAgent = {
    ...SUPPORT_AGENTS.wire_desk,
    id: 'agent-6',
    name: 'Sarah Okafor',
    role: 'Settlement Operations Specialist',
    initials: 'SO',
    email: 'sarah.okafor@aureusbank.com',
    activeConversationsCount: 2,
  };

  const queueConvs: AdminConversation[] = ADMIN_PORTAL_WAITING_QUEUE.map((q) => {
    const isDavid = q.id === 'conv-queue-1';
    return normalizeConversation({
      ...q,
      agent: q.isUnassigned ? { id: '', name: 'Unassigned Queue', department: q.department } : sarahAgent,
      customerOnline: true,
      isEscalated: isDavid,
      messages: isDavid
        ? [
            {
              id: 'm-q1-1',
              conversationId: q.id,
              sender: 'system',
              text: 'Automated Rule Triggered: High-priority transfer discrepancy auto-assigned to Sarah Okafor (Treasury & Wires).',
              timestamp: '11:40 AM',
              status: 'read',
            },
            {
              id: 'm-q1-2',
              conversationId: q.id,
              sender: 'customer',
              text: 'My ₦50,000 NIP instant transfer failed twice at 11:36 AM, yet my operating balance was debited on reference #NIP-994182.',
              timestamp: '11:41 AM',
              status: 'read',
            },
            {
              id: 'm-q1-3',
              conversationId: q.id,
              sender: 'agent',
              agentId: 'agent-6',
              agentName: 'Sarah Okafor',
              text: 'Good morning Mr. Mensah. I have initiated a NIBSS TSQ ledger trace on #NIP-994182 and placed a priority settlement hold review.',
              timestamp: '11:44 AM',
              status: 'delivered',
            },
          ]
        : [
            {
              id: 'm-q2-1',
              conversationId: q.id,
              sender: 'customer',
              text: q.lastMessage,
              timestamp: q.lastMessageTimestamp,
              status: 'delivered',
            },
          ],
    });
  });

  const existing = INITIAL_CONVERSATIONS.map((c) =>
    normalizeConversation({
      ...c,
      assignedStaffId: c.agent.id,
      assignedStaffName: c.agent.name,
      customerOnline: c.id === 'conv-1' || c.id === 'conv-3',
      isEscalated: c.id === 'conv-3',
    })
  );

  const customersWithDavid: Record<string, CustomerProfile> = {
    ...SUPPORT_CUSTOMERS,
    david: {
      id: 'usr_david_mensah',
      name: 'David Mensah',
      email: 'd.mensah@mensahholdings.ng',
      phone: '+234 803 555 0148',
      clientTier: 'Sovereign Private Client',
      kycLevel: 'Tier 3 (BVN & Passport Verified)',
      accountNumberMasked: '•••• 6182',
      balanceUSD: 1840000.0,
      assignedStaffId: 'agent-6',
      joinedYear: '2022',
      primaryJurisdiction: 'Lagos / London',
    },
  };

  return {
    conversations: [...queueConvs, ...existing],
    customers: customersWithDavid,
  };
}

function buildPreviewTickets(): AdminTicket[] {
  const merged = [...ADMIN_PORTAL_EXTRA_TICKETS, ...INITIAL_TICKETS];
  return merged.map((t) => {
    const ext = STAFF_PORTAL_TICKET_EXTENSIONS[t.id];
    return normalizeTicket({
      ...t,
      investigationNotes: ext?.investigationNotes,
      resolution: ext?.resolution,
      whisperNotes: ext?.whisperNotes || [],
    });
  });
}

export const adminPortalService = {
  /**
   * Fetches executive operational KPIs, activity, and department breakdown.
   * Always calls GET /api/admin/overview first; dev-only fallback computes metrics from mockData.ts.
   */
  async getOverview(): Promise<AdminApiResult<AdminOverviewData>> {
    const res = await adminApiRequest<AdminOverviewData>(
      ADMIN_CONFIG.endpoints.admin.overview
    );
    if (res.success && res.data) {
      return { ...res, isMockFallback: false };
    }

    if (isDevMockFallbackEligible(res.error)) {
      const { conversations } = buildPreviewConversations();
      const tickets = buildPreviewTickets();
      const staff = ADMIN_PORTAL_STAFF_DIRECTORY;

      const activeConversations = conversations.filter(
        (c) => c.status === 'active'
      ).length;
      const openAndPendingTickets = tickets.filter(
        (t) => t.status !== 'Resolved'
      ).length;
      const onlineAndAvailableStaff = staff.filter(
        (s) => s.availability === 'ONLINE' && s.accountStatus === 'ACTIVE'
      ).length;
      const waitingQueueCount = ADMIN_PORTAL_WAITING_QUEUE.length;
      const unassignedConversationsCount = conversations.filter(
        (c) => c.isUnassigned
      ).length;
      const escalationsCount = tickets.filter(
        (t) => t.status === 'Escalated' || t.priority === 'Urgent'
      ).length;

      return {
        success: true,
        isMockFallback: true,
        fallbackReason: res.error?.message,
        data: {
          activeConversations,
          openAndPendingTickets,
          onlineAndAvailableStaff,
          totalStaff: staff.length,
          waitingQueueCount,
          unassignedConversationsCount,
          escalationsCount,
          recentActivity: ADMIN_PORTAL_ACTIVITY_FEED,
          departmentMetrics: ADMIN_PORTAL_DEPARTMENT_METRICS,
        },
      };
    }

    return { success: false, error: res.error };
  },

  /**
   * Lists staff directory via GET /api/admin/staff.
   */
  async listStaff(): Promise<AdminApiResult<AdminStaffRecord[]>> {
    const res = await adminApiRequest<any>(ADMIN_CONFIG.endpoints.admin.staff);
    if (res.success && res.data) {
      const rawList = Array.isArray(res.data)
        ? res.data
        : res.data.staff || res.data.members || [];
      return {
        success: true,
        isMockFallback: false,
        data: rawList.map(normalizeStaffRecord),
      };
    }

    if (isDevMockFallbackEligible(res.error)) {
      return {
        success: true,
        isMockFallback: true,
        fallbackReason: res.error?.message,
        data: ADMIN_PORTAL_STAFF_DIRECTORY.map(normalizeStaffRecord),
      };
    }

    return { success: false, error: res.error };
  },

  /**
   * Provisions a new support specialist via POST /api/admin/staff.
   * Never simulates staff creation or onboarding invitations.
   */
  async createStaff(
    input: CreateStaffInput
  ): Promise<AdminApiResult<AdminStaffRecord>> {
    const res = await adminApiRequest<any>(ADMIN_CONFIG.endpoints.admin.staff, {
      method: 'POST',
      body: JSON.stringify({
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        username: input.username.trim(),
        email: input.email.trim(),
        department: input.department,
        maxChats: Number(input.maxChats),
      }),
    });

    if (!res.success || !res.data) {
      return { success: false, error: res.error };
    }

    const rawRecord = res.data.staff || res.data;
    return {
      success: true,
      message: res.message,
      data: normalizeStaffRecord(rawRecord),
    };
  },

  /**
   * Updates staff profile, department, maxChats capacity, or account status via PATCH /api/admin/staff/:id.
   * Never simulates account activation/deactivation.
   */
  async updateStaff(
    staffId: string,
    updates: UpdateStaffInput
  ): Promise<AdminApiResult<AdminStaffRecord>> {
    const res = await adminApiRequest<any>(
      `${ADMIN_CONFIG.endpoints.admin.staff}/${staffId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(updates),
      }
    );

    if (!res.success || !res.data) {
      return { success: false, error: res.error };
    }

    const rawRecord = res.data.staff || res.data;
    return {
      success: true,
      message: res.message,
      data: normalizeStaffRecord(rawRecord),
    };
  },

  /**
   * Lists organization-wide conversations & waiting queue for Support Monitoring.
   */
  async listConversations(): Promise<
    AdminApiResult<{
      conversations: AdminConversation[];
      customers: Record<string, CustomerProfile>;
    }>
  > {
    let res = await adminApiRequest<any>(
      ADMIN_CONFIG.endpoints.admin.conversations
    );

    if (!res.success && res.error?.unimplemented) {
      res = await adminApiRequest<any>(
        ADMIN_CONFIG.endpoints.sharedSupport.conversations
      );
    }

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
          conversations: list.map(normalizeConversation),
          customers,
        },
      };
    }

    if (isDevMockFallbackEligible(res.error)) {
      return {
        success: true,
        isMockFallback: true,
        fallbackReason: res.error?.message,
        data: buildPreviewConversations(),
      };
    }

    return { success: false, error: res.error };
  },

  /**
   * Reassigns an authorized conversation to another staff specialist (requires `canAssignTickets`).
   */
  async reassignConversation(
    conversationId: string,
    targetStaffId: string,
    reason?: string
  ): Promise<AdminApiResult<AdminConversation>> {
    const res = await adminApiRequest<any>(
      `${ADMIN_CONFIG.endpoints.admin.conversations}/${conversationId}/reassign`,
      {
        method: 'POST',
        body: JSON.stringify({ staffId: targetStaffId, reason }),
      }
    );
    if (!res.success || !res.data) {
      return { success: false, error: res.error };
    }
    return {
      success: true,
      data: normalizeConversation(res.data),
    };
  },

  /**
   * Escalates a supervised conversation via backend authorization.
   */
  async escalateConversation(
    conversationId: string,
    reason: string
  ): Promise<AdminApiResult<AdminConversation>> {
    const res = await adminApiRequest<any>(
      `${ADMIN_CONFIG.endpoints.admin.conversations}/${conversationId}/escalate`,
      {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }
    );
    if (!res.success || !res.data) {
      return { success: false, error: res.error };
    }
    return {
      success: true,
      data: normalizeConversation(res.data),
    };
  },

  /**
   * Lists organization-wide support tickets.
   */
  async listTickets(): Promise<AdminApiResult<AdminTicket[]>> {
    let res = await adminApiRequest<any>(ADMIN_CONFIG.endpoints.admin.tickets);

    if (!res.success && res.error?.unimplemented) {
      res = await adminApiRequest<any>(
        ADMIN_CONFIG.endpoints.sharedSupport.tickets
      );
    }

    if (res.success && res.data) {
      const list = Array.isArray(res.data) ? res.data : res.data.tickets || [];
      return {
        success: true,
        isMockFallback: false,
        data: list.map(normalizeTicket),
      };
    }

    if (isDevMockFallbackEligible(res.error)) {
      return {
        success: true,
        isMockFallback: true,
        fallbackReason: res.error?.message,
        data: buildPreviewTickets(),
      };
    }

    return { success: false, error: res.error };
  },

  /**
   * Updates ticket status, priority, investigation notes, resolution, or assigned specialist.
   */
  async updateTicket(
    ticketId: string,
    updates: {
      status?: TicketStatus;
      investigationNotes?: string;
      resolution?: string;
      assignedAgentId?: string;
    }
  ): Promise<AdminApiResult<AdminTicket>> {
    const res = await adminApiRequest<any>(
      `${ADMIN_CONFIG.endpoints.admin.tickets}/${ticketId}`,
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
   * Appends an authorized `isWhisper` internal supervisor note on a ticket.
   */
  async addTicketWhisperNote(
    ticketId: string,
    content: string
  ): Promise<AdminApiResult<AdminTicketWhisperNote>> {
    return adminApiRequest<AdminTicketWhisperNote>(
      `${ADMIN_CONFIG.endpoints.admin.tickets}/${ticketId}/notes`,
      {
        method: 'POST',
        body: JSON.stringify({ content, isWhisper: true }),
      }
    );
  },

  /**
   * Fetches administrator notification preferences (with dev-only fallback defaults).
   */
  async getNotificationPreferences(): Promise<
    AdminApiResult<AdminNotificationPreferences>
  > {
    const res = await adminApiRequest<AdminNotificationPreferences>(
      ADMIN_CONFIG.endpoints.admin.notifications
    );
    if (res.success && res.data) {
      return { ...res, isMockFallback: false };
    }

    if (isDevMockFallbackEligible(res.error)) {
      return {
        success: true,
        isMockFallback: true,
        fallbackReason: res.error?.message,
        data: ADMIN_PORTAL_NOTIFICATION_PREFERENCES,
      };
    }

    return { success: false, error: res.error };
  },

  /**
   * Saves administrator notification preferences to backend.
   */
  async updateNotificationPreferences(
    prefs: AdminNotificationPreferences
  ): Promise<AdminApiResult<AdminNotificationPreferences>> {
    return adminApiRequest<AdminNotificationPreferences>(
      ADMIN_CONFIG.endpoints.admin.notifications,
      {
        method: 'PATCH',
        body: JSON.stringify(prefs),
      }
    );
  },
};
