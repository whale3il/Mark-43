import { STAFF_CONFIG } from '../config/staffConfig';
import {
  AiAssistEntry,
  AiAssistMode,
  StaffApiResult,
  StaffConversation,
  StaffMemberProfile,
} from '../types/staff.types';
import { staffApiRequest } from './staffApiClient';

const MODE_TO_ACTION: Record<AiAssistMode, string> = {
  summary: 'summarize',
  suggested_reply: 'suggest_reply',
  improve_draft: 'improve_draft',
  troubleshooting: 'recommend_step',
  internal_note: 'internal_note',
};

export const staffAiService = {
  /**
   * Executes an advisory AI copilot action scoped to the selected conversation.
   * Never sends customer messages automatically.
   */
  async runAssist(params: {
    mode: AiAssistMode;
    prompt?: string;
    conversation: StaffConversation;
    staff: StaffMemberProfile;
    currentDraft?: string;
  }): Promise<StaffApiResult<AiAssistEntry>> {
    const payload = {
      mode: params.mode,
      action: MODE_TO_ACTION[params.mode],
      prompt: params.prompt || '',
      conversationId: params.conversation.id,
      staffId: params.staff.id,
      staffName: params.staff.name,
      staffRole: params.staff.role,
      draft: params.currentDraft || '',
      context: {
        customerName: params.conversation.customerName,
        customerTier: params.conversation.customerTier,
        subject: params.conversation.subject,
        category: params.conversation.category,
        linkedTicketId: params.conversation.linkedTicketId,
        messages: params.conversation.messages
          .filter((m) => !m.deletedAt)
          .slice(-25)
          .map((m) => ({
            sender: m.sender,
            text: m.text,
            timestamp: m.timestamp,
            isWhisper: Boolean(m.isWhisper),
          })),
      },
    };

    let res = await staffApiRequest<any>(STAFF_CONFIG.endpoints.staff.aiAssist, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (!res.success && res.error?.unimplemented) {
      res = await staffApiRequest<any>(STAFF_CONFIG.endpoints.sharedSupport.aiAssist, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    }

    if (!res.success || !res.data) {
      return {
        success: false,
        error: res.error || {
          code: 'AI_UNAVAILABLE',
          message:
            'AI Copilot endpoint is not connected. Ensure /api/staff/ai/assist or /api/ai/assist is running.',
        },
      };
    }

    const content = String(
      res.data.content || res.data.reply || res.data.text || ''
    ).trim();

    if (!content) {
      return {
        success: false,
        error: {
          code: 'EMPTY_AI_RESPONSE',
          message: 'AI service returned an empty response.',
        },
      };
    }

    return {
      success: true,
      data: {
        id: `ai-${Date.now()}`,
        mode: params.mode,
        prompt: params.prompt || params.mode,
        content,
        createdAt: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        model: res.data.metadata?.model || res.data.model,
        confidence: res.data.metadata?.confidence,
        conversationId: params.conversation.id,
      },
    };
  },
};
