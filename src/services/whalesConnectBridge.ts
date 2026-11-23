/**
 * WhalesConnect-style real-time adapter for the existing WhalesVault SupportView.
 * No browser-side API key, fake replies, local event bus, or mock presence.
 *
 * The future WhalesVault backend MUST authorize the HttpOnly customer session
 * and the requested conversation before issuing an Ably token.
 */
import * as Ably from 'ably';
import type { SupportMessage } from '../types/support';

export function apiError(error: unknown, fallback: string): string {
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message || fallback);
  }
  return fallback;
}

type EventWireMessage = {
  id: string;
  conversationId: string;
  senderId?: string;
  sender?: string;
  content?: string;
  text?: string;
  createdAt?: string;
  timestamp?: string;
  status?: string;
  deletedAt?: string | null;
};

export interface BridgeOptions {
  conversationId: string;
  customerId: string;
  staffId?: string;
  onMessage(message: SupportMessage): void;
  onHistory(messages: SupportMessage[]): void;
  onTyping(senderId: string, isTyping: boolean): void;
  onReceipt(messageId: string, status: 'delivered' | 'read'): void;
  onConnectionChange(connected: boolean): void;
  onError(message: string): void;
}

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');
const ABLY_AUTH_PATH = import.meta.env.VITE_SUPPORT_ABLY_AUTH_PATH || '/api/ably/token';
// WhalesConnect used /api/conversations/:id/messages/sync and support:<id>.
// Override these via env if WhalesVault uses different route / channel schemes.
const HISTORY_PATH = import.meta.env.VITE_SUPPORT_SYNC_PATH_PREFIX || '/api/conversations';
const CHANNEL_PREFIX = import.meta.env.VITE_SUPPORT_CHANNEL_PREFIX || 'support:';

function toSupportMessage(wire: EventWireMessage, options: BridgeOptions): SupportMessage {
  const sender = wire.sender === 'system' ? 'system'
    : wire.sender === 'customer' || wire.sender === 'agent' ? wire.sender
    : wire.senderId === options.customerId ? 'customer' : 'agent';
  return {
    id: wire.id,
    conversationId: wire.conversationId,
    sender,
    text: wire.deletedAt ? 'Message deleted' : String(wire.text ?? wire.content ?? ''),
    timestamp: wire.timestamp ?? (wire.createdAt
      ? new Date(wire.createdAt).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})
      : ''),
    status: (wire.status === 'read' || wire.status === 'delivered' ? wire.status : 'sent'),
    ...(sender === 'agent' ? {agentId: options.staffId} : {}),
  } as SupportMessage;
}

export class WhalesConnectBridge {
  private client: Ably.Realtime | null = null;
  private channel: Ably.RealtimeChannel | null = null;
  private closed = false;
  private syncing = false;
  private needsSync = false;
  private callbacks: Array<() => void> = [];

  constructor(private readonly options: BridgeOptions) {}

  private async syncHistory() {
    if (this.syncing) { this.needsSync = true; return; }
    this.syncing = true;
    try {
      do {
        this.needsSync = false;
        const collected: SupportMessage[] = [];
        const seen = new Set<string>();
        let cursor: string | null = null;
        do {
          const path = `${HISTORY_PATH}/${encodeURIComponent(this.options.conversationId)}/messages/sync`;
          const url = new URL(path, API_BASE);
          if (cursor) url.searchParams.set('cursor', cursor);
          const response = await fetch(url.toString(), {credentials: 'include', cache: 'no-store'});
          if (!response.ok) throw new Error(`Message synchronization failed (${response.status}).`);
          const json = await response.json();
          const records = json.data ?? json.messages;
          if (!Array.isArray(records)) throw new Error('Invalid message sync response.');
          collected.push(...records.map((record: EventWireMessage) => toSupportMessage(record, this.options)));
          const next: string | null = json.hasMore ? (json.nextCursor ?? null) : null;
          if (json.hasMore && (!next || seen.has(next))) throw new Error('Invalid message cursor.');
          if (next) seen.add(next);
          cursor = next;
        } while (cursor && !this.closed);
        if (!this.closed) this.options.onHistory(collected);
      } while (this.needsSync && !this.closed);
    } catch (err) {
      if (!this.closed) this.options.onError(apiError(err, 'Unable to synchronize messages.'));
    } finally {
      this.syncing = false;
    }
  }

  async connect() {
    if (this.closed) return;
    const {conversationId} = this.options;
    this.client = new Ably.Realtime({
      autoConnect: true,
      authCallback: async (_tokenParams, callback) => {
        try {
          const url = new URL(ABLY_AUTH_PATH, API_BASE);
          url.searchParams.set('conversationId', conversationId);
          const response = await fetch(url.toString(), {
            method: 'GET', credentials: 'include', cache: 'no-store',
          });
          if (!response.ok) throw new Error(`Ably authorization failed (${response.status}).`);
          const json = await response.json();
          // Backend may return the token request directly or as { data: tokenRequest }.
          const tokenRequest = json.data ?? json;
          if (!tokenRequest || (!tokenRequest.token && !tokenRequest.keyName)) {
            throw new Error('Invalid Ably token response.');
          }
          callback(null, tokenRequest);
        } catch (err) {
          callback(err instanceof Error
            ? {name: err.name, message: err.message, code: 401, statusCode: 401}
            : 'Ably authentication failed.', null);
        }
      }
    });
    const client = this.client;
    const channel = client.channels.get(`${CHANNEL_PREFIX}${conversationId}`);
    this.channel = channel;

    const handleConnection = (event: Ably.ConnectionStateChange) => {
      if (this.closed) return;
      const connected = event.current === 'connected';
      this.options.onConnectionChange(connected);
      if (connected) void this.syncHistory();
      if (event.current === 'failed') this.options.onError('Unable to connect to realtime support.');
    };
    client.connection.on(handleConnection);
    this.callbacks.push(() => client.connection.off(handleConnection));

    const onMessage = (event: Ably.Message) => {
      const wire = event.data as EventWireMessage;
      if (this.closed || !wire?.id || wire.conversationId !== conversationId) return;
      this.options.onMessage(toSupportMessage(wire, this.options));
    };
    const onTyping = (event: Ably.Message) => {
      const data = event.data as {senderId?: string; userId?: string; isTyping?: boolean};
      const senderId = data?.senderId ?? data?.userId;
      if (senderId && !this.closed) this.options.onTyping(senderId, Boolean(data.isTyping));
    };
    const onReceipt = (event: Ably.Message) => {
      const data = event.data as {messageId?: string; status?: string; readAt?: string; deliveredAt?: string};
      if (!data?.messageId || this.closed) return;
      const status = data.readAt || data.status === 'read' ? 'read' : 'delivered';
      this.options.onReceipt(data.messageId, status);
    };
    const onUpdated = (event: Ably.Message) => onMessage(event);
    const onDeleted = (_event: Ably.Message) => { void this.syncHistory(); };
    try {
      await channel.subscribe('new-message', onMessage);
      await channel.subscribe('typing', onTyping);
      await channel.subscribe('receipt-updated', onReceipt);
      await channel.subscribe('message-updated', onUpdated);
      await channel.subscribe('message-deleted', onDeleted);
      this.callbacks.push(() => {
        channel.unsubscribe('new-message', onMessage);
        channel.unsubscribe('typing', onTyping);
        channel.unsubscribe('receipt-updated', onReceipt);
        channel.unsubscribe('message-updated', onUpdated);
        channel.unsubscribe('message-deleted', onDeleted);
      });
      if (this.closed) {
        channel.unsubscribe('new-message', onMessage);
        channel.unsubscribe('typing', onTyping);
        channel.unsubscribe('receipt-updated', onReceipt);
        channel.unsubscribe('message-updated', onUpdated);
        channel.unsubscribe('message-deleted', onDeleted);
      } else {
        await this.syncHistory();
      }
    } catch (err) {
      if (!this.closed) this.options.onError(apiError(err, 'Unable to subscribe to support messages.'));
    }
  }

  async sendTyping(isTyping: boolean) {
    // WhalesConnect publishes typing via the backend instead of trusting client IDs.
    // The backend must derive the sender from the HttpOnly customer session.
    try {
      await fetch(`${API_BASE}/api/typing`, {
        method: 'POST', credentials: 'include',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({conversationId: this.options.conversationId, isTyping}),
      });
    } catch { /* Typing is best effort and must not block sending. */ }
  }

  close() {
    this.closed = true;
    for (const cb of this.callbacks) cb();
    this.callbacks = [];
    this.options.onConnectionChange(false);
    this.client?.close();
    this.client = null;
    this.channel = null;
  }
}
