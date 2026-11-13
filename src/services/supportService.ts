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

  /**
   * POST /api/support/conversations
   * Creates a new private support conversation room & linked ticket.
   */
  static async createConversation(payload: {
    customerId: string;
    customerName: string;
    customerTier: string;
    agent: SupportAgent;
    category: InquiryCategory;
    subject: string;
    initialMessage: string;
  }): Promise<ApiResponse<SupportConversation>> {
    const res = await apiRequest<SupportConversation>('/support/conversations', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (res.success && res.data) {
      return res;
    }

    const convId = `conv-${Date.now()}`;
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newConv: SupportConversation = {
      id: convId,
      agent: payload.agent,
      customerId: payload.customerId,
      customerName: payload.customerName,
      customerTier: payload.customerTier,
      subject: payload.subject,
      department: payload.agent.department,
      category: payload.category,
      lastMessage: payload.initialMessage,
      lastMessageTimestamp: timeNow,
      unreadCount: 0,
      status: 'active',
      linkedTicketId: `TKT-${Math.floor(1000 + Math.random() * 9000)}-NY`,
      messages: [
        {
          id: `m-sys-${Date.now()}`,
          conversationId: convId,
          sender: 'system',
          text: `Secure desk opened with ${payload.agent.name} (${payload.agent.role}). Category: ${payload.category}.`,
          timestamp: timeNow,
          status: 'read'
        },
        {
          id: `m-usr-${Date.now()}`,
          conversationId: convId,
          sender: 'customer',
          text: payload.initialMessage,
          timestamp: timeNow,
          status: 'sent'
        }
      ]
    };

    return { success: true, data: newConv };
  }

  /**
   * POST /api/support/conversations/:id/messages
   * Persists a chat message or voice note to PostgreSQL.
   */
  static async sendMessage(
    conversationId: string,
    message: SupportMessage
  ): Promise<ApiResponse<SupportMessage>> {
    const res = await apiRequest<SupportMessage>(`/support/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify(message)
    });

    if (res.success && res.data) return res;
    return { success: true, data: message };
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
  static async addCannedResponse(
    template: Omit<CannedResponse, 'id'>
  ): Promise<ApiResponse<CannedResponse>> {
    const res = await apiRequest<CannedResponse>('/support/canned-responses', {
      method: 'POST',
      body: JSON.stringify(template)
    });

    if (res.success && res.data) return res;
    return {
      success: true,
      data: { ...template, id: `canned-${Date.now()}` }
    };
  }

  /**
   * DELETE /api/support/canned-responses/:id
   */
  static async deleteCannedResponse(templateId: string): Promise<ApiResponse<void>> {
    const res = await apiRequest<void>(`/support/canned-responses/${templateId}`, {
      method: 'DELETE'
    });
    if (res.success) return res;
    return { success: true };
  }
}
