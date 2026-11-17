import { ADMIN_CONFIG } from '../config/adminConfig';
import {
  AdminAiAssistEntry,
  AdminAiAssistMode,
  AdminApiResult,
  AdminConversation,
  AdminProfile,
  AdminStaffRecord,
  AdminTicket,
} from '../types/admin.types';
import { adminApiRequest } from './adminApiClient';

const MODE_TO_ACTION: Record<AdminAiAssistMode, string> = {
  summary: 'summarize_conversation_and_ticket',
  escalation_analysis: 'analyze_escalation_risk',
  staff_workload: 'evaluate_staff_workload',
  activity_summary: 'summarize_support_activity',
  troubleshooting: 'recommend_supervisory_steps',
};

export const adminAiService = {
  /**
   * Runs advisory AI analysis scoped to the supervised conversation, linked ticket, and staff workload.
   * Strictly advisory — never modifies tickets, reassigns staff, edits customer records, or sends messages.
   */
  async runAssist(params: {
    mode: AdminAiAssistMode;
    prompt?: string;
    conversation: AdminConversation;
    linkedTicket?: AdminTicket;
    staffDirectory: AdminStaffRecord[];
    admin: AdminProfile;
  }): Promise<AdminApiResult<AdminAiAssistEntry>> {
    const payload = {
      scope: 'admin_monitoring',
      advisoryOnly: true,
      mode: params.mode,
      action: MODE_TO_ACTION[params.mode],
      prompt: params.prompt || '',
      adminId: params.admin.id,
      adminName: params.admin.name,
      conversationId: params.conversation.id,
      context: {
        customerName: params.conversation.customerName,
        customerTier: params.conversation.customerTier,
        assignedStaffName: params.conversation.assignedStaffName,
        department: params.conversation.department,
        subject: params.conversation.subject,
        status: params.conversation.status,
        linkedTicket: params.linkedTicket
          ? {
              id: params.linkedTicket.id,
              priority: params.linkedTicket.priority,
              status: params.linkedTicket.status,
              category: params.linkedTicket.category,
              description: params.linkedTicket.description,
            }
          : undefined,
        staffLoadSnapshot: params.staffDirectory.map((s) => ({
          name: s.fullName,
          department: s.department,
          availability: s.availability,
          activeChats: s.activeConversationsCount,
          maxChats: s.maxChats,
        })),
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

    let res = await adminApiRequest<any>(ADMIN_CONFIG.endpoints.admin.aiAssist, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (!res.success && res.error?.unimplemented) {
      res = await adminApiRequest<any>(
        ADMIN_CONFIG.endpoints.sharedSupport.aiAssist,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      );
    }

    if (!res.success || !res.data) {
      return {
        success: false,
        error: res.error || {
          code: 'AI_UNAVAILABLE',
          message:
            'Admin AI Advisory endpoint is not active. Ensure /api/admin/ai/assist or /api/ai/assist is running.',
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
          message: 'AI advisory endpoint returned an empty response.',
        },
      };
    }

    return {
      success: true,
      data: {
        id: `adm-ai-${Date.now()}`,
        mode: params.mode,
        prompt: params.prompt || params.mode,
        content,
        createdAt: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        model: res.data.metadata?.model || res.data.model,
        conversationId: params.conversation.id,
      },
    };
  },
};
