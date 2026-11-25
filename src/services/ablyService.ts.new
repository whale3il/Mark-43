/**
 * Aureus Wealth - Ably Real-Time Support Messaging Service
 * 
 * Supports both:
 * 1. Live Ably Realtime protocol when `VITE_ABLY_KEY` or `VITE_ABLY_AUTH_URL` is provided.
 * 2. High-fidelity in-browser real-time presence & event pipeline fallback
 *    so multi-agent messaging, typing indicators, read receipts, and presence
 *    work seamlessly out of the box in the preview without requiring external credentials.
 */

import * as Ably from 'ably';
import { SupportMessage, StaffAvailability, SupportAgent } from '../types/support';

export interface AblyPresenceMember {
  clientId: string;
  data: {
    name: string;
    role: 'customer' | 'agent' | 'admin';
    status: StaffAvailability;
    avatarUrl?: string;
  };
}

export type AblyMessageHandler = (message: SupportMessage) => void;
export type AblyTypingHandler = (agentIdOrCustomerId: string, isTyping: boolean, name?: string) => void;
export type AblyPresenceHandler = (presence: AblyPresenceMember[]) => void;
export type AblyReceiptHandler = (messageId: string, status: 'delivered' | 'read') => void;

class AblySupportService {
  private realtimeClient: Ably.Realtime | null = null;
  private isLive = false;

  // Local event bus for resilient zero-config execution
  private messageListeners = new Map<string, Set<AblyMessageHandler>>();
  private typingListeners = new Map<string, Set<AblyTypingHandler>>();
  private presenceListeners = new Map<string, Set<AblyPresenceHandler>>();
  private receiptListeners = new Map<string, Set<AblyReceiptHandler>>();

  // Active channel presence store
  private channelPresence = new Map<string, Map<string, AblyPresenceMember>>();

  constructor() {
    this.initClient();
  }

  private initClient() {
    if (typeof window === 'undefined') return;

    const apiKey = import.meta.env.VITE_ABLY_KEY;
    const authUrl = import.meta.env.VITE_ABLY_AUTH_URL;

    if (apiKey) {
      try {
        this.realtimeClient = new Ably.Realtime({ key: apiKey });
        this.isLive = true;
      } catch (err) {
        console.warn('Ably initialization failed, falling back to sovereign in-memory broker:', err);
        this.isLive = false;
      }
    } else if (authUrl) {
      try {
        this.realtimeClient = new Ably.Realtime({ authUrl });
        this.isLive = true;
      } catch (err) {
        console.warn('Ably authUrl connection failed:', err);
        this.isLive = false;
      }
    }
  }

  /**
   * Channel name format: support:conv-{conversationId}
   */
  private getChannelName(conversationId: string): string {
    return `support:conv-${conversationId}`;
  }

  /**
   * Subscribe to new messages for a specific conversation room
   */
  public subscribeToMessages(conversationId: string, handler: AblyMessageHandler): () => void {
    const channelName = this.getChannelName(conversationId);

    if (!this.messageListeners.has(channelName)) {
      this.messageListeners.set(channelName, new Set());
    }
    this.messageListeners.get(channelName)!.add(handler);

    if (this.isLive && this.realtimeClient) {
      const channel = this.realtimeClient.channels.get(channelName);
      channel.subscribe('message:new', (msg: Ably.Message) => {
        handler(msg.data as SupportMessage);
      });
    }

    return () => {
      this.messageListeners.get(channelName)?.delete(handler);
    };
  }

  /**
   * Publish a message to a conversation room
   */
  public async publishMessage(conversationId: string, message: SupportMessage): Promise<void> {
    const channelName = this.getChannelName(conversationId);

    if (this.isLive && this.realtimeClient) {
      try {
        const channel = this.realtimeClient.channels.get(channelName);
        await channel.publish('message:new', message);
      } catch (err) {
        console.error('Failed to publish Ably message:', err);
      }
    }

    // Broadcast through local pipeline
    const listeners = this.messageListeners.get(channelName);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(message);
        } catch (e) {
          console.error(e);
        }
      });
    }
  }

  /**
   * Subscribe to typing indicators
   */
  public subscribeToTyping(conversationId: string, handler: AblyTypingHandler): () => void {
    const channelName = this.getChannelName(conversationId);

    if (!this.typingListeners.has(channelName)) {
      this.typingListeners.set(channelName, new Set());
    }
    this.typingListeners.get(channelName)!.add(handler);

    if (this.isLive && this.realtimeClient) {
      const channel = this.realtimeClient.channels.get(channelName);
      channel.subscribe('typing', (msg: Ably.Message) => {
        handler(msg.data.userId, msg.data.isTyping, msg.data.name);
      });
    }

    return () => {
      this.typingListeners.get(channelName)?.delete(handler);
    };
  }

  /**
   * Broadcast typing indicator to conversation room
   */
  public async setTyping(
    conversationId: string,
    userId: string,
    isTyping: boolean,
    name?: string
  ): Promise<void> {
    const channelName = this.getChannelName(conversationId);

    if (this.isLive && this.realtimeClient) {
      try {
        const channel = this.realtimeClient.channels.get(channelName);
        await channel.publish('typing', { userId, isTyping, name });
      } catch {}
    }

    const listeners = this.typingListeners.get(channelName);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(userId, isTyping, name);
        } catch {}
      });
    }
  }

  /**
   * Read receipts
   */
  public subscribeToReceipts(conversationId: string, handler: AblyReceiptHandler): () => void {
    const channelName = this.getChannelName(conversationId);

    if (!this.receiptListeners.has(channelName)) {
      this.receiptListeners.set(channelName, new Set());
    }
    this.receiptListeners.get(channelName)!.add(handler);

    return () => {
      this.receiptListeners.get(channelName)?.delete(handler);
    };
  }

  public notifyReceipt(conversationId: string, messageId: string, status: 'delivered' | 'read'): void {
    const channelName = this.getChannelName(conversationId);
    const listeners = this.receiptListeners.get(channelName);
    if (listeners) {
      listeners.forEach((listener) => listener(messageId, status));
    }
  }

  /**
   * Presence: enter room, update status, and leave
   */
  public enterPresence(
    conversationId: string,
    member: AblyPresenceMember
  ): () => void {
    const channelName = this.getChannelName(conversationId);

    if (!this.channelPresence.has(channelName)) {
      this.channelPresence.set(channelName, new Map());
    }
    this.channelPresence.get(channelName)!.set(member.clientId, member);

    this.notifyPresenceChanged(channelName);

    return () => {
      this.channelPresence.get(channelName)?.delete(member.clientId);
      this.notifyPresenceChanged(channelName);
    };
  }

  public subscribeToPresence(conversationId: string, handler: AblyPresenceHandler): () => void {
    const channelName = this.getChannelName(conversationId);

    if (!this.presenceListeners.has(channelName)) {
      this.presenceListeners.set(channelName, new Set());
    }
    this.presenceListeners.get(channelName)!.add(handler);

    // Initial presence push
    const members = Array.from(this.channelPresence.get(channelName)?.values() || []);
    handler(members);

    return () => {
      this.presenceListeners.get(channelName)?.delete(handler);
    };
  }

  private notifyPresenceChanged(channelName: string) {
    const members = Array.from(this.channelPresence.get(channelName)?.values() || []);
    const listeners = this.presenceListeners.get(channelName);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(members);
        } catch {}
      });
    }
  }

  /**
   * Simulation helper: auto reply from assigned staff specialist
   * Used when a customer sends a message in client view and tests real-time feedback
   */
  public simulateStaffReply(
    conversationId: string,
    agent: SupportAgent,
    customerPrompt: string,
    onMessageCreated: (msg: SupportMessage) => void
  ): void {
    // 1. Trigger typing indicator after 800ms
    setTimeout(() => {
      this.setTyping(conversationId, agent.id, true, agent.name);

      // 2. Clear typing and dispatch contextual reply after 2.4s
      setTimeout(() => {
        this.setTyping(conversationId, agent.id, false, agent.name);

        let replyText = `Thank you for contacting my desk. I am reviewing your request regarding "${customerPrompt.slice(0, 40)}..." and will update your portfolio ledger momentarily.`;

        const lower = customerPrompt.toLowerCase();
        if (lower.includes('wire') || lower.includes('transfer') || lower.includes('fedwire')) {
          replyText = `Understood. I have initiated the Fedwire Realtime pre-clearance check for your transfer. Expected settlement window is within 15 minutes.`;
        } else if (lower.includes('card') || lower.includes('limit') || lower.includes('obsidian')) {
          replyText = `I have received your card threshold adjustment inquiry. Your Obsidian limit elevation has been temporarily queued for compliance verification.`;
        } else if (lower.includes('yield') || lower.includes('treasury') || lower.includes('sweep')) {
          replyText = `Your treasury allocation instructions have been recorded. At 4.85% APY, this sweep accrues daily with compounding at month-end.`;
        } else if (lower.includes('key') || lower.includes('fido') || lower.includes('security')) {
          replyText = `Security operations have verified your active session. Cryptographic dual-key authorization remains active.`;
        }

        const replyMsg: SupportMessage = {
          id: `m-reply-${Date.now()}`,
          conversationId,
          sender: 'agent',
          agentId: agent.id,
          agentName: agent.name,
          text: replyText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'delivered'
        };

        this.publishMessage(conversationId, replyMsg);
        onMessageCreated(replyMsg);
      }, 2000);
    }, 800);
  }
}

export const ablyService = new AblySupportService();
