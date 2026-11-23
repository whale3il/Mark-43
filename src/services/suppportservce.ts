/**
 * WhalesVault support API: production-style, fail-closed version.
 * REPLACES the old service with mock success fallbacks.
 *
 * Keep /api/support routes as this frontend's stable contract; adapt your
 * WhalesConnect Express implementation when you integrate it later.
 */
import { apiRequest, type ApiResponse } from './apiClient';
import type {
  SupportAgent, SupportConversation, SupportMessage, SupportTicket,
  CannedResponse, SupportAnalytics, CustomerProfile, StaffAvailability,
  InquiryCategory, TicketStatus,
} from '../types/support';

export interface SupportDashboardPayload {
  staffList: SupportAgent[];
  conversations: SupportConversation[];
  tickets: SupportTicket[];
  customers: Record<string, CustomerProfile>;
  cannedResponses: CannedResponse[];
  analytics: SupportAnalytics;
}

const segment = (v: string) => encodeURIComponent(v);
export class SupportService {
  static getDashboard(): Promise<ApiResponse<SupportDashboardPayload>> {
    return apiRequest('/support/dashboard');
  }
  static createConversation(payload: {
    customerId: string; customerName: string; customerTier: string;
    agent?: SupportAgent; category: InquiryCategory; subject: string; initialMessage: string;
  }): Promise<ApiResponse<SupportConversation>> {
    // Backend derives customerId from cookie and assigns staff. Do not trust
    // caller-supplied customerId or agent as an authorization or routing decision.
    return apiRequest('/support/conversations', {
      method: 'POST', body: JSON.stringify({
        category: payload.category,
        subject: payload.subject,
        initialMessage: payload.initialMessage,
        requestedAgentId: payload.agent?.id,
      })
    });
  }
  static sendMessage(conversationId: string, message: SupportMessage): Promise<ApiResponse<SupportMessage>> {
    // Server decides sender, ID, time and broadcasts ONLY after persistence.
    return apiRequest(`/support/conversations/${segment(conversationId)}/messages`, {
      method: 'POST', body: JSON.stringify({text: message.text})
    });
  }
  static updateConversation(conversationId: string, updates: Partial<Pick<SupportConversation, 'status' | 'internalNotes' | 'unreadCount'>>): Promise<ApiResponse<Partial<SupportConversation>>> {
    return apiRequest(`/support/conversations/${segment(conversationId)}`, {
      method: 'PATCH', body: JSON.stringify(updates)
    });
  }
  static transferConversation(conversationId: string, targetStaffId: string, note?: string): Promise<ApiResponse<{conversationId: string; targetStaffId: string}>> {
    return apiRequest(`/support/conversations/${segment(conversationId)}/transfer`, {
      method: 'POST', body: JSON.stringify({targetStaffId, note})
    });
  }
  static updateStaffAvailability(staffId: string, status: StaffAvailability): Promise<ApiResponse<{staffId: string; status: StaffAvailability}>> {
    return apiRequest(`/support/staff/${segment(staffId)}/availability`, {
      method: 'PATCH', body: JSON.stringify({status})
    });
  }
  static createTicket(payload: Omit<SupportTicket, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<ApiResponse<SupportTicket>> {
    // Backend owns assignment, customer identity, status, and ticket ID.
    return apiRequest('/support/tickets', {
      method: 'POST', body: JSON.stringify({
        subject: payload.subject, category: payload.category,
        priority: payload.priority, description: payload.description,
      })
    });
  }
  static updateTicketStatus(ticketId: string, status: TicketStatus): Promise<ApiResponse<{id: string; status: TicketStatus}>> {
    return apiRequest(`/support/tickets/${segment(ticketId)}`, {
      method: 'PATCH', body: JSON.stringify({status})
    });
  }
  // static addCannedResponse(template: Omit<CannedResponse, 'id'>): Promise<ApiResponse<CannedResponse>> {
  //   return apiRequest('/support/canned-responses', {
  //     method: 'POST', body: JSON.stringify(template)
  //   });
  // }
  // static deleteCannedResponse(templateId: string): Promise<ApiResponse<void>> {
  //   return apiRequest(`/support/canned-responses/${segment(templateId)}`, {method: 'DELETE'});
  // }
}
