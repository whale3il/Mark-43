/**
 * Aureus Wealth - Customer Ably Real-Time Support Service
 *
 * Uses backend-issued Ably TokenRequests (`GET /api/ably/token?conversationId=...` with HTTP-only cookies).
 * Never stores tokens in localStorage, never exposes Ably API secrets on client, and never simulates replies.
 */

import * as Ably from 'ably';
import { API_BASE_URL } from './apiClient';
import {
  normalizeConversationStatus,
  normalizeSupportAgent,
  normalizeSupportMessage,
  normalizeCallSession,
} from './supportService';
import {
  SupportMessage,
  StaffAvailability,
  SupportConversationStatus,
  SupportAgent,
  SupportCallSession,
  SupportCallSignalPayload,
} from '../types/support';

export interface AblyPresenceMember {
  clientId: string;
  data: {
    name: string;
    role: 'customer' | 'agent' | 'admin';
    status: StaffAvailability;
    avatarUrl?: string;
  };
}

export type CustomerRealtimeStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'unavailable';

export interface CustomerConversationRealtimeHandlers {
  onMessageNew?: (message: SupportMessage) => void;
  onTyping?: (userId: string, isTyping: boolean, name?: string) => void;
  onReceipt?: (messageId: string, status: 'delivered' | 'read') => void;
  onPresence?: (members: AblyPresenceMember[]) => void;
  onConversationUpdated?: (patch: {
    conversationId: string;
    status?: SupportConversationStatus;
    agent?: SupportAgent;
    queuePosition?: number;
  }) => void;
  onSessionEnded?: (payload: { conversationId: string; endedAt?: string }) => void;
  onCallEvent?: (
    eventType: 'incoming' | 'accepted' | 'rejected' | 'ended',
    call: SupportCallSession
  ) => void;
  onCallSignal?: (signal: SupportCallSignalPayload) => void;
  onReconnected?: () => void;
  onStatusChange?: (status: CustomerRealtimeStatus, detail?: string) => void;
}

class AblySupportService {
  private clientsByConv = new Map<string, Ably.Realtime>();
  private statusByConv = new Map<string, CustomerRealtimeStatus>();

  private getChannelName(conversationId: string): string {
    return `support:conv-${conversationId}`;
  }

  private async fetchTokenRequest(conversationId: string): Promise<Ably.TokenRequest | Ably.TokenDetails> {
    const query = new URLSearchParams({ conversationId }).toString();
    const url = `${API_BASE_URL}/ably/token?${query}`;
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });

    const contentType = response.headers.get('content-type') || '';
    if (!response.ok || !contentType.includes('application/json')) {
      throw new Error(`Ably token endpoint ${url} returned HTTP ${response.status}`);
    }

    const payload = await response.json();
    return payload?.data || payload;
  }

  /**
   * Connects to Ably using a conversation-scoped TokenRequest and subscribes to
   * `support:conv-{conversationId}` events + presence with full cleanup.
   */
  public subscribeConversation(
    conversationId: string,
    customer: { id: string; name: string },
    handlers: CustomerConversationRealtimeHandlers
  ): () => void {
    if (typeof window === 'undefined' || !conversationId || !customer.id) {
      return () => {};
    }

    let disposed = false;
    let hasConnectedOnce = false;
    const channelName = this.getChannelName(conversationId);

    // Tear down any previous connection for this same conversationId before re-subscribing
    this.cleanupConversationClient(conversationId);

    handlers.onStatusChange?.('connecting');
    this.statusByConv.set(conversationId, 'connecting');

    const client = new Ably.Realtime({
      clientId: customer.id,
      authCallback: async (_tokenParams, callback) => {
        try {
          const tokenRequest = await this.fetchTokenRequest(conversationId);
          callback(null, tokenRequest as Ably.TokenRequest);
        } catch (err: any) {
          const msg = err?.message || 'Unable to obtain Ably token.';
          this.statusByConv.set(conversationId, 'unavailable');
          handlers.onStatusChange?.('unavailable', msg);
          callback(err, null);
        }
      },
    });

    this.clientsByConv.set(conversationId, client);

    const onConnected = () => {
      if (disposed) return;
      this.statusByConv.set(conversationId, 'connected');
      handlers.onStatusChange?.('connected');
      if (hasConnectedOnce) {
        handlers.onReconnected?.();
      }
      hasConnectedOnce = true;
    };

    const onDisconnected = () => {
      if (disposed) return;
      this.statusByConv.set(conversationId, 'disconnected');
      handlers.onStatusChange?.('disconnected');
    };

    const onFailed = (stateChange: Ably.ConnectionStateChange) => {
      if (disposed) return;
      const reason = stateChange?.reason?.message || 'Ably connection failed';
      this.statusByConv.set(conversationId, 'unavailable');
      handlers.onStatusChange?.('unavailable', reason);
    };

    client.connection.on('connected', onConnected);
    client.connection.on('disconnected', onDisconnected);
    client.connection.on('failed', onFailed);

    const channel = client.channels.get(channelName);

    const onMsg = (msg: Ably.Message) => {
      if (disposed || !msg.data) return;
      const normalized = normalizeSupportMessage(msg.data, conversationId);
      if (!normalized.isPrivateNote) {
        handlers.onMessageNew?.(normalized);
      }
    };

    const onTyping = (msg: Ably.Message) => {
      if (disposed || !msg.data) return;
      const userId = String(msg.data.userId || msg.data.senderId || '');
      if (userId && userId !== customer.id) {
        handlers.onTyping?.(userId, Boolean(msg.data.isTyping), msg.data.name);
      }
    };

    const onReceiptDelivered = (msg: Ably.Message) => {
      if (disposed || !msg.data) return;
      const messageId = String(msg.data.messageId || msg.data.id || '');
      if (messageId) handlers.onReceipt?.(messageId, 'delivered');
    };

    const onReceiptRead = (msg: Ably.Message) => {
      if (disposed || !msg.data) return;
      const messageId = String(msg.data.messageId || msg.data.id || '');
      if (messageId) handlers.onReceipt?.(messageId, 'read');
    };

    const onConvUpdated = (msg: Ably.Message) => {
      if (disposed || !msg.data) return;
      const raw = msg.data;
      handlers.onConversationUpdated?.({
        conversationId: String(raw.conversationId || raw.id || conversationId),
        status: raw.status ? normalizeConversationStatus(raw.status) : undefined,
        agent: raw.agent || raw.staff ? normalizeSupportAgent(raw.agent || raw.staff) : undefined,
        queuePosition: typeof raw.queuePosition === 'number' ? raw.queuePosition : undefined,
      });
    };

    const onSessionEnded = (msg: Ably.Message) => {
      if (disposed) return;
      handlers.onSessionEnded?.({
        conversationId: String(msg.data?.conversationId || conversationId),
        endedAt: msg.data?.endedAt,
      });
    };

    const makeCallHandler =
      (evt: 'incoming' | 'accepted' | 'rejected' | 'ended') => (msg: Ably.Message) => {
        if (disposed || !msg.data) return;
        const call = normalizeCallSession(msg.data.call || msg.data, conversationId);
        handlers.onCallEvent?.(evt, call);
      };

    const onCallIncoming = makeCallHandler('incoming');
    const onCallAccepted = makeCallHandler('accepted');
    const onCallRejected = makeCallHandler('rejected');
    const onCallEnded = makeCallHandler('ended');

    const onCallSignal = (msg: Ably.Message) => {
      if (disposed || !msg.data) return;
      const d = msg.data as SupportCallSignalPayload;
      if (d.fromUserId && d.fromUserId === customer.id) return;
      handlers.onCallSignal?.({
        callId: String(d.callId || ''),
        conversationId: String(d.conversationId || conversationId),
        fromUserId: d.fromUserId,
        signalType: d.signalType,
        sdp: d.sdp,
        candidate: d.candidate,
      });
    };

    channel.subscribe('message:new', onMsg);
    channel.subscribe('message', onMsg);
    channel.subscribe('typing', onTyping);
    channel.subscribe('receipt:delivered', onReceiptDelivered);
    channel.subscribe('receipt:read', onReceiptRead);
    channel.subscribe('conversation:updated', onConvUpdated);
    channel.subscribe('conversation:assigned', onConvUpdated);
    channel.subscribe('conversation:ended', onSessionEnded);
    channel.subscribe('session:ended', onSessionEnded);
    channel.subscribe('call:incoming', onCallIncoming);
    channel.subscribe('call:initiated', onCallIncoming);
    channel.subscribe('call:accepted', onCallAccepted);
    channel.subscribe('call:rejected', onCallRejected);
    channel.subscribe('call:ended', onCallEnded);
    channel.subscribe('call:signal', onCallSignal);

    const refreshPresence = async () => {
      if (disposed) return;
      try {
        const members = await channel.presence.get();
        if (disposed) return;
        const mapped: AblyPresenceMember[] = members.map((m) => ({
          clientId: m.clientId,
          data: (m.data as AblyPresenceMember['data']) || {
            name: m.clientId,
            role: 'customer',
            status: 'online',
          },
        }));
        handlers.onPresence?.(mapped);
      } catch {
        // Presence unavailable if token lacks presence capability
      }
    };

    channel.presence.subscribe(() => {
      refreshPresence();
    });

    channel.presence
      .enter({
        name: customer.name,
        role: 'customer',
        status: 'online',
      })
      .then(refreshPresence)
      .catch(() => {});

    return () => {
      disposed = true;
      try {
        channel.unsubscribe('message:new', onMsg);
        channel.unsubscribe('message', onMsg);
        channel.unsubscribe('typing', onTyping);
        channel.unsubscribe('receipt:delivered', onReceiptDelivered);
        channel.unsubscribe('receipt:read', onReceiptRead);
        channel.unsubscribe('conversation:updated', onConvUpdated);
        channel.unsubscribe('conversation:assigned', onConvUpdated);
        channel.unsubscribe('conversation:ended', onSessionEnded);
        channel.unsubscribe('session:ended', onSessionEnded);
        channel.unsubscribe('call:incoming', onCallIncoming);
        channel.unsubscribe('call:initiated', onCallIncoming);
        channel.unsubscribe('call:accepted', onCallAccepted);
        channel.unsubscribe('call:rejected', onCallRejected);
        channel.unsubscribe('call:ended', onCallEnded);
        channel.unsubscribe('call:signal', onCallSignal);
        channel.presence.unsubscribe();
        channel.presence.leave().catch(() => {});
      } catch {
        // Ignore teardown errors
      }
      this.cleanupConversationClient(conversationId);
    };
  }

  private cleanupConversationClient(conversationId: string): void {
    const existing = this.clientsByConv.get(conversationId);
    if (existing) {
      try {
        existing.close();
      } catch {
        // Ignore close errors
      }
      this.clientsByConv.delete(conversationId);
      this.statusByConv.delete(conversationId);
    }
  }

  public disconnectAll(): void {
    for (const convId of Array.from(this.clientsByConv.keys())) {
      this.cleanupConversationClient(convId);
    }
  }
}

export const ablyService = new AblySupportService();
