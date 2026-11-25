/**
 * Aureus Wealth - Support & Concierge Service Client
 * Provides typed, production-ready API connection points for the separate
 * Express / Prisma / PostgreSQL / Supabase backend.
 *
 * Architectural rules:
 * - Directs all support queries and mutations to `/api/support/*`.
 * - Falls back cleanly to the single isolated mock data source (`src/data/mockData.ts`)
 *   when the external backend is offline or not yet connected.
 */

import { apiRequest, ApiResponse } from './apiClient';
import {
  SupportAgent,
  SupportConversation,
  SupportMessage,
  SupportTicket,
  CannedResponse,
  SupportAnalytics,
  CustomerProfile,
  StaffAvailability,
  InquiryCategory,
  TicketStatus
} from '../types/support';
import {
  SUPPORT_STAFF_LIST,
  SUPPORT_CUSTOMERS,
  INITIAL_CONVERSATIONS,
  INITIAL_TICKETS,
  INITIAL_CANNED_RESPONSES,
  INITIAL_SUPPORT_ANALYTICS
} from '../data/mockData';

export interface SupportDashboardPayload {
  staffList: SupportAgent[];
  conversations: SupportConversation[];
  tickets: SupportTicket[];
  customers: Record<string, CustomerProfile>;
  cannedResponses: CannedResponse[];
  analytics: SupportAnalytics;
}

export class SupportService {
  /**
   * GET /api/support/dashboard
   * Fetches staff desks, conversations, tickets, customer dossiers, canned templates, and analytics.
   */
  static async getDashboard(): Promise<ApiResponse<SupportDashboardPayload>> {
    const res = await apiRequest<SupportDashboardPayload>('/support/dashboard');
    if (res.success && res.data) {
      return res;
    }

    return {
      success: true,
      data: {
        staffList: SUPPORT_STAFF_LIST,
        conversations: INITIAL_CONVERSATIONS,
        tickets: INITIAL_TICKETS,
        customers: SUPPORT_CUSTOMERS,
        cannedResponses: INITIAL_CANNED_RESPONSES,
        analytics: INITIAL_SUPPORT_ANALYTICS
      }
    };
  }

  /** Backend conversation and message shapes. These records are intentionally not UI-shaped. */
  static normalizeMessage(raw: any, conversationId: string): SupportMessage {
    const role = raw?.sender?.role;
    return {
      id: String(raw?.id || ''),
      conversationId: String(raw?.conversationId || conversationId),
      sender: role === 'CUSTOMER' ? 'customer' : role === 'STAFF' ? 'agent' : 'system',
      text: String(raw?.content ?? ''),
      timestamp: raw?.createdAt
        ? new Date(raw.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '',
      status: 'sent',
      agentId: role === 'STAFF' ? raw?.senderId : undefined,
      agentName: role === 'STAFF'
        ? [raw?.sender?.firstName, raw?.sender?.lastName].filter(Boolean).join(' ')
        : undefined,
    };
  }

  static normalizeConversation(
    raw: any,
    context: { customerId: string; customerName: string; customerTier: string; staffList?: SupportAgent[]; agent?: SupportAgent; subject?: string; category?: InquiryCategory }
  ): SupportConversation {
    const participants = Array.isArray(raw?.participants) ? raw.participants : [];
    const customerParticipant = participants.find((p: any) => p?.user?.role === 'CUSTOMER');
    const staffParticipant = participants.find((p: any) => p?.user?.role === 'STAFF');
    const assignedId = raw?.assignedStaffId || staffParticipant?.userId;
    const directoryStaff = context.staffList?.find((s) => s.id === assignedId);
    const participantName = staffParticipant?.user
      ? [staffParticipant.user.firstName, staffParticipant.user.lastName].filter(Boolean).join(' ')
      : '';
    const fallbackAgent: SupportAgent = {
      id: assignedId || '',
      name: assignedId ? (participantName || 'Assigned specialist') : 'Waiting for available specialist',
      initials: assignedId ? (participantName.split(/\s+/).map((p: string) => p[0]).slice(0, 2).join('').toUpperCase() || 'SS') : '…',
      role: 'Support Specialist',
      department: 'Private Wealth',
      specialization: '',
      status: 'offline',
      responseTime: '—', license: '', office: '', directPhone: '', email: '',
      activeConversationsCount: 0, availabilityLabel: 'WAITING',
    };
    // Never label an unassigned waiting conversation as connected to the selected agent.
    const agent = directoryStaff || (assignedId && context.agent?.id === assignedId ? context.agent : fallbackAgent);
    const messages = Array.isArray(raw?.messages)
      ? raw.messages.map((m: any) => this.normalizeMessage(m, raw.id))
      : [];
    const last = messages[messages.length - 1];
    return {
      id: String(raw?.id || ''),
      customerId: String(customerParticipant?.userId || context.customerId),
      customerName: context.customerName,
      customerTier: context.customerTier,
      agent,
      subject: context.subject || 'Support inquiry',
      category: context.category || 'General Support',
      department: agent.department,
      status: raw?.status === 'CLOSED' ? 'resolved' : raw?.status === 'ACTIVE' || raw?.status === 'ASSIGNED' ? 'active' : 'pending',
      messages,
      lastMessage: last?.text || (raw?.status === 'WAITING' ? 'Waiting for an available specialist' : 'Conversation opened'),
      lastMessageTimestamp: last?.timestamp || (raw?.createdAt ? new Date(raw.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''),
      unreadCount: 0,
      createdAt: raw?.createdAt,
    };
  }

  static async createConversation(payload: {
    customerId: string;
    customerName: string;
    customerTier: string;
    agent: SupportAgent;
    category: InquiryCategory;
    subject: string;
    initialMessage: string;
  }): Promise<ApiResponse<SupportConversation>> {
    // Backend owns assignment. It currently ignores an explicitly selected agent.
    const res = await apiRequest<any>('/support/conversations', { method: 'POST', body: JSON.stringify({}) });
    if (!res.success || !res.data?.id) return { success: false, error: res.error || 'Could not create conversation.' };
    return { success: true, message: res.message,
      data: this.normalizeConversation(res.data, payload) };
  }

  static async getConversations(context: {
    customerId: string; customerName: string; customerTier: string; staffList: SupportAgent[];
  }): Promise<ApiResponse<SupportConversation[]>> {
    const res = await apiRequest<any[]>('/support/conversations');
    if (!res.success || !Array.isArray(res.data)) return { success: false, error: res.error || 'Could not load conversations.' };
    return { success: true, data: res.data.map((raw) => this.normalizeConversation(raw, context)) };
  }

  static async getMessages(conversationId: string): Promise<ApiResponse<SupportMessage[]>> {
    const res = await apiRequest<any[]>(`/support/conversations/${conversationId}/messages`);
    if (!res.success || !Array.isArray(res.data)) return { success: false, error: res.error || 'Could not load messages.' };
    return { success: true, data: res.data.map((raw) => this.normalizeMessage(raw, conversationId)) };
  }

  /** Backend persists then publishes `message:new` to Ably. No mock-success fallback. */
  static async sendMessage(conversationId: string, message: SupportMessage): Promise<ApiResponse<SupportMessage>> {
    const res = await apiRequest<any>(`/support/conversations/${conversationId}/messages`, {
      method: 'POST', body: JSON.stringify({ content: message.text })
    });
    if (!res.success || !res.data?.id) return { success: false, error: res.error || 'Message was not saved.' };
    return { success: true, data: this.normalizeMessage(res.data, conversationId) };
  }

  /**
   * PATCH /api/support/conversations/:id
   * Updates conversation status or internal staff notes.
   */
  static async updateConversation(
    conversationId: string,
    updates: Partial<Pick<SupportConversation, 'status' | 'internalNotes' | 'unreadCount'>>
  ): Promise<ApiResponse<Partial<SupportConversation>>> {
    const res = await apiRequest<SupportConversation>(`/support/conversations/${conversationId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });

    if (res.success && res.data) return res;
    return { success: true, data: updates };
  }

  /**
   * POST /api/support/conversations/:id/transfer
   * Reassigns a conversation to another support staff specialist.
   */
  static async transferConversation(
    conversationId: string,
    targetStaffId: string,
    note?: string
  ): Promise<ApiResponse<{ conversationId: string; targetStaffId: string }>> {
    const res = await apiRequest<{ conversationId: string; targetStaffId: string }>(
      `/support/conversations/${conversationId}/transfer`,
      {
        method: 'POST',
        body: JSON.stringify({ targetStaffId, note })
      }
    );

    if (res.success && res.data) return res;
    return { success: true, data: { conversationId, targetStaffId } };
  }

  /**
   * PATCH /api/support/staff/:id/availability
   * Updates staff desk availability (online | busy | away | offline).
   */
  static async updateStaffAvailability(
    staffId: string,
    status: StaffAvailability
  ): Promise<ApiResponse<{ staffId: string; status: StaffAvailability }>> {
    const res = await apiRequest<{ staffId: string; status: StaffAvailability }>(
      `/support/staff/${staffId}/availability`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status })
      }
    );

    if (res.success && res.data) return res;
    return { success: true, data: { staffId, status } };
  }

  /**
   * POST /api/support/tickets
   */
  static async createTicket(
    payload: Omit<SupportTicket, 'id' | 'createdAt' | 'updatedAt' | 'status'>
  ): Promise<ApiResponse<SupportTicket>> {
    const res = await apiRequest<SupportTicket>('/support/tickets', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (res.success && res.data) return res;

    const nowStr = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const fallbackTicket: SupportTicket = {
      ...payload,
      id: `TKT-${Math.floor(8000 + Math.random() * 2000)}-FED`,
      status: 'In Review',
      createdAt: nowStr,
      updatedAt: nowStr
    };
    return { success: true, data: fallbackTicket };
  }

  /**
   * PATCH /api/support/tickets/:id
   */
  static async updateTicketStatus(
    ticketId: string,
    status: TicketStatus
  ): Promise<ApiResponse<{ id: string; status: TicketStatus }>> {
    const res = await apiRequest<{ id: string; status: TicketStatus }>(`/support/tickets/${ticketId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });

    if (res.success && res.data) return res;
    return { success: true, data: { id: ticketId, status } };
  }

  /**
   * POST /api/support/canned-responses
   */
  // static async addCannedResponse(
  //   template: Omit<CannedResponse, 'id'>
  // ): Promise<ApiResponse<CannedResponse>> {
  //   const res = await apiRequest<CannedResponse>('/support/canned-responses', {
  //     method: 'POST',
  //     body: JSON.stringify(template)
  //   });

  //   if (res.success && res.data) return res;
  //   return {
  //     success: true,
  //     data: { ...template, id: `canned-${Date.now()}` }
  //   };
  // }

  /**
   * DELETE /api/support/canned-responses/:id
   */
  // static async deleteCannedResponse(templateId: string): Promise<ApiResponse<void>> {
  //   const res = await apiRequest<void>(`/support/canned-responses/${templateId}`, {
  //     method: 'DELETE'
  //   });
  //   if (res.success) return res;
  //   return { success: true };
  // }
}
