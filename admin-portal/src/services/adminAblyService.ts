import * as Ably from 'ably';
import { ADMIN_CONFIG } from '../config/adminConfig';
import type { AblyPresenceMember } from '@/src/services/ablyService';
import {
  AdminAvailabilityEnum,
  AdminChatMessage,
  AdminTicket,
  MessageReaction,
} from '../types/admin.types';

export type AdminRealtimeStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'unavailable';

class AdminAblyService {
  private client: Ably.Realtime | null = null;
  private status: AdminRealtimeStatus = 'idle';
  private activeAdminId: string | null = null;
  private adminOpsChannel: Ably.RealtimeChannel | null = null;

  private statusListeners = new Set<
    (status: AdminRealtimeStatus, detail?: string) => void
  >();
  private queueListeners = new Set<(payload: any) => void>();
  private staffStatusListeners = new Set<
    (payload: {
      staffId: string;
      availability: AdminAvailabilityEnum;
      activeConversationsCount?: number;
    }) => void
  >();
  private ticketEventListeners = new Set<
    (ticket: Partial<AdminTicket> & { id: string }) => void
  >();

  public getStatus(): AdminRealtimeStatus {
    return this.status;
  }

  private setStatus(next: AdminRealtimeStatus, detail?: string) {
    this.status = next;
    this.statusListeners.forEach((cb) => cb(next, detail));
  }

  public onStatusChange(
    handler: (status: AdminRealtimeStatus, detail?: string) => void
  ): () => void {
    this.statusListeners.add(handler);
    handler(this.status);
    return () => {
      this.statusListeners.delete(handler);
    };
  }

  public onQueueOrAssignment(handler: (payload: any) => void): () => void {
    this.queueListeners.add(handler);
    return () => {
      this.queueListeners.delete(handler);
    };
  }

  public onStaffAvailability(
    handler: (payload: {
      staffId: string;
      availability: AdminAvailabilityEnum;
      activeConversationsCount?: number;
    }) => void
  ): () => void {
    this.staffStatusListeners.add(handler);
    return () => {
      this.staffStatusListeners.delete(handler);
    };
  }

  public onTicketEvent(
    handler: (ticket: Partial<AdminTicket> & { id: string }) => void
  ): () => void {
    this.ticketEventListeners.add(handler);
    return () => {
      this.ticketEventListeners.delete(handler);
    };
  }

  /**
   * Connects permission-scoped Ably Realtime using cookie-authenticated backend token endpoint.
   * Never exposes private Ably API keys in client code.
   */
  public async connect(adminId: string): Promise<void> {
    if (typeof window === 'undefined' || !adminId) return;
    if (
      this.client &&
      this.activeAdminId === adminId &&
      this.status === 'connected'
    ) {
      return;
    }

    this.disconnect();
    this.activeAdminId = adminId;
    this.setStatus('connecting');

    const primaryTokenEndpoint = `${ADMIN_CONFIG.apiBaseUrl}${ADMIN_CONFIG.endpoints.ably.token}`;
    const fallbackTokenEndpoint = `${ADMIN_CONFIG.apiBaseUrl}${ADMIN_CONFIG.endpoints.ably.fallbackToken}`;

    try {
      const client = new Ably.Realtime({
        clientId: adminId,
        authCallback: async (_tokenParams, callback) => {
          try {
            let response = await fetch(primaryTokenEndpoint, {
              method: 'POST',
              credentials: 'include',
              headers: { Accept: 'application/json' },
            });

            if (response.status === 404 || response.status === 405) {
              response = await fetch(primaryTokenEndpoint, {
                method: 'GET',
                credentials: 'include',
                headers: { Accept: 'application/json' },
              });
            }

            if (response.status === 404 || response.status === 405) {
              response = await fetch(fallbackTokenEndpoint, {
                method: 'GET',
                credentials: 'include',
                headers: { Accept: 'application/json' },
              });
            }

            const contentType = response.headers.get('content-type') || '';
            if (!response.ok || !contentType.includes('application/json')) {
              const errMsg = `Ably admin token endpoint unavailable (${response.status}).`;
              this.setStatus('unavailable', errMsg);
              callback(new Error(errMsg) as any, null);
              return;
            }

            const payload = await response.json();
            const tokenRequest = payload?.data || payload;
            callback(null, tokenRequest);
          } catch (err: any) {
            const msg = err?.message || 'Unable to acquire Ably admin token.';
            this.setStatus('unavailable', msg);
            callback(err, null);
          }
        },
      });

      client.connection.on('connected', () => {
        this.setStatus('connected');
      });

      client.connection.on('disconnected', () => {
        this.setStatus('disconnected');
      });

      client.connection.on('failed', (stateChange) => {
        const msg = stateChange?.reason?.message || 'Ably connection failed';
        this.setStatus('unavailable', msg);
      });

      this.client = client;

      // Subscribe to organization-wide admin operations channel
      const opsChannel = client.channels.get('admin:operations');
      this.adminOpsChannel = opsChannel;

      opsChannel.subscribe('queue:updated', (msg) => {
        this.queueListeners.forEach((cb) => cb(msg.data));
      });
      opsChannel.subscribe('assignment:new', (msg) => {
        this.queueListeners.forEach((cb) => cb(msg.data));
      });
      opsChannel.subscribe('staff:availability', (msg) => {
        if (msg.data?.staffId) {
          this.staffStatusListeners.forEach((cb) => cb(msg.data));
        }
      });
      opsChannel.subscribe('ticket:created', (msg) => {
        if (msg.data?.id) this.ticketEventListeners.forEach((cb) => cb(msg.data));
      });
      opsChannel.subscribe('ticket:updated', (msg) => {
        if (msg.data?.id) this.ticketEventListeners.forEach((cb) => cb(msg.data));
      });
      opsChannel.subscribe('ticket:escalated', (msg) => {
        if (msg.data?.id) this.ticketEventListeners.forEach((cb) => cb(msg.data));
      });
      opsChannel.subscribe('ticket:resolved', (msg) => {
        if (msg.data?.id) this.ticketEventListeners.forEach((cb) => cb(msg.data));
      });
    } catch (err: any) {
      this.setStatus(
        'unavailable',
        err?.message || 'Failed to initialize Ably realtime observer.'
      );
    }
  }

  public disconnect(): void {
    if (this.adminOpsChannel) {
      try {
        this.adminOpsChannel.unsubscribe();
      } catch {
        // Ignore cleanup errors
      }
      this.adminOpsChannel = null;
    }
    if (this.client) {
      try {
        this.client.close();
      } catch {
        // Ignore close errors
      }
      this.client = null;
    }
    this.activeAdminId = null;
    this.setStatus('idle');
  }

  /**
   * Subscribes to an active conversation channel strictly in read-only supervision mode.
   * Never enters presence as staff or impersonates an assigned specialist.
   */
  public observeConversation(
    conversationId: string,
    handlers: {
      onMessageNew?: (message: AdminChatMessage) => void;
      onMessageUpdated?: (
        message: Partial<AdminChatMessage> & { id: string }
      ) => void;
      onMessageDeleted?: (payload: { id: string; deletedAt?: string }) => void;
      onReaction?: (payload: {
        messageId: string;
        reactions: MessageReaction[];
      }) => void;
      onTyping?: (userId: string, isTyping: boolean, name?: string) => void;
      onReceipt?: (messageId: string, status: 'delivered' | 'read') => void;
      onPresence?: (members: AblyPresenceMember[]) => void;
    }
  ): () => void {
    if (!this.client || !conversationId) {
      return () => {};
    }

    const channel = this.client.channels.get(`support:conv-${conversationId}`);

    const onMsgNew = (msg: Ably.Message) => {
      if (msg.data) handlers.onMessageNew?.(msg.data as AdminChatMessage);
    };
    const onMsgUpdated = (msg: Ably.Message) => {
      if (msg.data?.id) handlers.onMessageUpdated?.(msg.data);
    };
    const onMsgDeleted = (msg: Ably.Message) => {
      if (msg.data?.id) handlers.onMessageDeleted?.(msg.data);
    };
    const onMsgReaction = (msg: Ably.Message) => {
      if (msg.data?.messageId) handlers.onReaction?.(msg.data);
    };
    const onTypingEvt = (msg: Ably.Message) => {
      if (msg.data) {
        handlers.onTyping?.(
          msg.data.userId,
          Boolean(msg.data.isTyping),
          msg.data.name
        );
      }
    };
    const onReceiptEvt = (msg: Ably.Message) => {
      if (msg.data?.messageId) {
        handlers.onReceipt?.(msg.data.messageId, msg.data.status || 'read');
      }
    };

    channel.subscribe('message:new', onMsgNew);
    channel.subscribe('message:updated', onMsgUpdated);
    channel.subscribe('message:deleted', onMsgDeleted);
    channel.subscribe('message:reaction', onMsgReaction);
    channel.subscribe('typing', onTypingEvt);
    channel.subscribe('receipt:read', onReceiptEvt);

    const refreshPresence = async () => {
      try {
        const members = await channel.presence.get();
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
        // Presence read unavailable if token capability excludes presence
      }
    };

    channel.presence.subscribe(() => {
      refreshPresence();
    });
    refreshPresence();

    return () => {
      try {
        channel.unsubscribe('message:new', onMsgNew);
        channel.unsubscribe('message:updated', onMsgUpdated);
        channel.unsubscribe('message:deleted', onMsgDeleted);
        channel.unsubscribe('message:reaction', onMsgReaction);
        channel.unsubscribe('typing', onTypingEvt);
        channel.unsubscribe('receipt:read', onReceiptEvt);
        channel.presence.unsubscribe();
      } catch {
        // Safe cleanup
      }
    };
  }
}

export const adminAblyService = new AdminAblyService();
