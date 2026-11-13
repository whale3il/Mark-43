/**
 * Aureus Wealth - Centralized AI Chat & Copilot Service
 *
 * Provides typed, backend-ready API connection points for:
 * - GET    /api/ai/conversations
 * - POST   /api/ai/conversations
 * - PATCH  /api/ai/conversations/:id
 * - DELETE /api/ai/conversations/:id
 * - DELETE /api/ai/conversations/:id/messages
 * - POST   /api/ai/conversations/:id/messages
 * - POST   /api/ai/assist
 *
 * ARCHITECTURAL RULES:
 * - Contains NO hardcoded AI responses and NO simulated artificial delays.
 * - Initial conversation history falls back cleanly to `src/data/mockData.ts` when offline.
 * - Prompt completions (`sendMessage`, `runCopilotAction`) return real backend API responses
 *   or structured errors so UI components handle loading, errors, and retries cleanly.
 */

import { apiRequest, ApiResponse } from './apiClient';
import {
  SupportConversation,
  SupportAgent,
  AiActionType,
  AiAssistantResult,
  AiChatConversation,
  AiSendMessagePayload,
  AiSendMessageResponse
} from '../types/support';
import { INITIAL_AI_CONVERSATIONS } from '../data/mockData';

class AiSupportService {
  /**
   * GET /api/ai/conversations
   * Fetches AI conversation threads for the authenticated user & scope ('client' | 'staff').
   */
  public async listConversations(
    scope: 'client' | 'staff',
    userId?: string
  ): Promise<ApiResponse<AiChatConversation[]>> {
    const query = new URLSearchParams({ scope });
    if (userId) query.set('userId', userId);

    const res = await apiRequest<AiChatConversation[]>(`/ai/conversations?${query.toString()}`);
    if (res.success && Array.isArray(res.data)) {
      return res;
    }

    // Fallback to isolated mock history when backend is not connected
    const seeded = INITIAL_AI_CONVERSATIONS.filter((c) => c.scope === scope);
    return {
      success: true,
      data: seeded
    };
  }

  /**
   * POST /api/ai/conversations
   * Creates a new AI chat conversation thread on the backend (or empty local record when offline).
   */
  public async createConversation(payload: {
    title?: string;
    scope: 'client' | 'staff';
    userId: string;
    linkedSupportConversationId?: string;
    linkedSupportSubject?: string;
  }): Promise<ApiResponse<AiChatConversation>> {
    const res = await apiRequest<AiChatConversation>('/ai/conversations', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (res.success && res.data) {
      return res;
    }

    const nowDate = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newConversation: AiChatConversation = {
      id: `ai-conv-${Date.now()}`,
      title: payload.title?.trim() || 'New AI Session',
      scope: payload.scope,
      userId: payload.userId,
      linkedSupportConversationId: payload.linkedSupportConversationId,
      linkedSupportSubject: payload.linkedSupportSubject,
      createdAt: nowDate,
      updatedAt: nowTime,
      messages: []
    };

    return {
      success: true,
      data: newConversation
    };
  }

  /**
   * PATCH /api/ai/conversations/:id
   * Updates conversation title or linked support context.
   */
  public async updateConversation(
    conversationId: string,
    updates: {
      title?: string;
      linkedSupportConversationId?: string | null;
      linkedSupportSubject?: string | null;
    }
  ): Promise<ApiResponse<Partial<AiChatConversation>>> {
    const res = await apiRequest<AiChatConversation>(`/ai/conversations/${conversationId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });

    if (res.success && res.data) {
      return res;
    }

    return {
      success: true,
      data: {
        id: conversationId,
        title: updates.title,
        linkedSupportConversationId: updates.linkedSupportConversationId ?? undefined,
        linkedSupportSubject: updates.linkedSupportSubject ?? undefined
      }
    };
  }

  /**
   * DELETE /api/ai/conversations/:id
   * Deletes an AI conversation thread.
   */
  public async deleteConversation(conversationId: string): Promise<ApiResponse<void>> {
    const res = await apiRequest<void>(`/ai/conversations/${conversationId}`, {
      method: 'DELETE'
    });
    if (res.success) return res;
    return { success: true };
  }

  /**
   * DELETE /api/ai/conversations/:id/messages
   * Clears message history for a specific AI conversation thread.
   */
  public async clearConversationMessages(conversationId: string): Promise<ApiResponse<void>> {
    const res = await apiRequest<void>(`/ai/conversations/${conversationId}/messages`, {
      method: 'DELETE'
    });
    if (res.success) return res;
    return { success: true };
  }

  /**
   * POST /api/ai/conversations/:id/messages
   * Sends a prompt + conversation history + optional authorized support context to the backend AI service.
   * Does NOT fabricate AI answers locally — propagates API errors cleanly for UI retry handling.
   */
  public async sendMessage(
    payload: AiSendMessagePayload
  ): Promise<ApiResponse<AiSendMessageResponse>> {
    return apiRequest<AiSendMessageResponse>(
      `/ai/conversations/${payload.conversationId}/messages`,
      {
        method: 'POST',
        body: JSON.stringify(payload)
      }
    );
  }

  /**
   * POST /api/ai/assist
   * Executes structured staff copilot actions (suggest_reply, summarize, improve_draft, recommend_step)
   * against the backend AI endpoint with authorized conversation context.
   */
  public async runCopilotAction(
    action: Exclude<AiActionType, 'chat'>,
    conversation: SupportConversation,
    staff: SupportAgent,
    currentDraft?: string
  ): Promise<ApiResponse<AiAssistantResult>> {
    return apiRequest<AiAssistantResult>('/ai/assist', {
      method: 'POST',
      body: JSON.stringify({
        action,
        conversationId: conversation.id,
        staffId: staff.id,
        staffName: staff.name,
        staffRole: staff.role,
        draft: currentDraft || '',
        context: {
          customerName: conversation.customerName,
          customerTier: conversation.customerTier,
          subject: conversation.subject,
          category: conversation.category,
          linkedTicketId: conversation.linkedTicketId,
          messages: conversation.messages.map((m) => ({
            sender: m.sender,
            text: m.text,
            timestamp: m.timestamp
          }))
        }
      })
    });
  }
}

export const aiSupportService = new AiSupportService();
export type { AiAssistantResult };
