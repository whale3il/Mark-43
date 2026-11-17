import * as Ably from 'ably';
import { STAFF_CONFIG } from '../config/staffConfig';
import { AblyPresenceMember } from '@/src/services/ablyService';
import {
  MessageReaction,
  StaffAvailabilityEnum,
  StaffChatMessage,
  StaffTicket,
} from '../types/staff.types';

export type RealtimeConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'unavailable';

export interface StaffRealtimeCallbacks {
  onStatusChange?: (status: RealtimeConnectionStatus, detail?: string) => void;
  onAssignment?: (payload: { conversationId: string; customerName?: string }) => void;
  onTicketEvent?: (ticket: Partial<StaffTicket> & { id: string }) => void;
}

class StaffAblyService {
  private client: Ably.Realtime | null = null;
  private status: RealtimeConnectionStatus = 'idle';
  private activeStaffId: string | null = null;
  private staffChannel: Ably.RealtimeChannel | null = null;
  private assignmentListeners = new Set<
    (payload: { conversationId: string; customerName?: string }) => void
  >();
  private ticketEventListeners = new Set<
    (ticket: Partial<StaffTicket> & { id: string }) => void
  >();
  private statusListeners = new Set<
    (status: RealtimeConnectionStatus, detail?: string) => void
  >();

  public getStatus(): RealtimeConnectionStatus {
    return this.status;
  }

  public onStaffAssignment(
    handler: (payload: { conversationId: string; customerName?: string }) => void
  ): () => void {
    this.assignmentListeners.add(handler);
    return () => {
      this.assignmentListeners.delete(handler);
    };
  }

  public onStaffTicketEvent(
    handler: (ticket: Partial<StaffTicket> & { id: string }) => void
  ): () => void {
    this.ticketEventListeners.add(handler);
    return () => {
      this.ticketEventListeners.delete(handler);
    };
  }

  private setStatus(next: RealtimeConnectionStatus, detail?: string) {
    this.status = next;
    this.statusListeners.forEach((cb) => cb(next, detail));
  }

  public onStatusChange(
    handler: (status: RealtimeConnectionStatus, detail?: string) => void
  ): () => void {
    this.statusListeners.add(handler);
    handler(this.status);
    return () => {
      this.statusListeners.delete(handler);
    };
  }

  /**
   * Initializes permission-scoped Ably Realtime connection using backend cookie-authenticated token endpoint.
   */
  public async connect(
    staffId: string,
    callbacks?: StaffRealtimeCallbacks
  ): Promise<void> {
    if (typeof window === 'undefined' || !staffId) return;
    if (this.client && this.activeStaffId === staffId && this.status === 'connected') {
      return;
    }

    this.disconnect();
    this.activeStaffId = staffId;
    this.setStatus('connecting');

    const tokenEndpoint = `${STAFF_CONFIG.apiBaseUrl}${STAFF_CONFIG.endpoints.ably.token}`;

    try {
      const client = new Ably.Realtime({
        clientId: staffId,
        authCallback: async (_tokenParams, callback) => {
          try {
            let response = await fetch(tokenEndpoint, {
              method: 'POST',
              credentials: 'include',
              headers: { Accept: 'application/json' },
            });

            if (response.status === 404 || response.status === 405) {
              response = await fetch(tokenEndpoint, {
                method: 'GET',
                credentials: 'include',
                headers: { Accept: 'application/json' },
              });
            }

            const contentType = response.headers.get('content-type') || '';
            if (!response.ok || !contentType.includes('application/json')) {
              const errMsg = `Ably token endpoint ${tokenEndpoint} unavailable (${response.status}).`;
              this.setStatus('unavailable', errMsg);
              callback(new Error(errMsg) as any, null);
              return;
            }

            const payload = await response.json();
            const tokenRequest = payload?.data || payload;
            callback(null, tokenRequest);
          } catch (err: any) {
            const msg = err?.message || 'Unable to acquire Ably token.';
            this.setStatus('unavailable', msg);
            callback(err, null);
          }
        },
      });

      client.connection.on('connected', () => {
        this.setStatus('connected');
        callbacks?.onStatusChange?.('connected');
      });

      client.connection.on('disconnected', () => {
        this.setStatus('disconnected');
        callbacks?.onStatusChange?.('disconnected');
      });

      client.connection.on('failed', (stateChange) => {
        const msg = stateChange?.reason?.message || 'Ably connection failed';
        this.setStatus('unavailable', msg);
        callbacks?.onStatusChange?.('unavailable', msg);
      });

      this.client = client;

      // Subscribe to scoped staff notifications channel
      const channel = client.channels.get(`staff:${staffId}`);
      this.staffChannel = channel;

      channel.subscribe('assignment:new', (msg) => {
        if (msg.data) {
          callbacks?.onAssignment?.(msg.data);
          this.assignmentListeners.forEach((cb) => cb(msg.data));
        }
      });
      channel.subscribe('ticket:updated', (msg) => {
        if (msg.data?.id) {
          callbacks?.onTicketEvent?.(msg.data);
          this.ticketEventListeners.forEach((cb) => cb(msg.data));
        }
      });
      channel.subscribe('ticket:assigned', (msg) => {
        if (msg.data?.id) {
          callbacks?.onTicketEvent?.(msg.data);
          this.ticketEventListeners.forEach((cb) => cb(msg.data));
        }
      });
    } catch (err: any) {
      this.setStatus(
        'unavailable',
        err?.message || 'Failed to initialize Ably realtime client.'
      );
    }
  }

  public disconnect(): void {
    if (this.staffChannel) {
      try {
        this.staffChannel.unsubscribe();
      } catch {
        // Ignore cleanup errors
      }
      this.staffChannel = null;
    }
    if (this.client) {
      try {
        this.client.close();
      } catch {
        // Ignore close errors
      }
      this.client = null;
    }
    this.activeStaffId = null;
    this.setStatus('idle');
  }

  public subscribeConversation(
    conversationId: string,
    staffMember: { id: string; name: string; availability: StaffAvailabilityEnum },
    handlers: {
      onMessageNew?: (message: StaffChatMessage) => void;
      onMessageUpdated?: (message: Partial<StaffChatMessage> & { id: string }) => void;
      onMessageDeleted?: (payload: { id: string; deletedAt?: string }) => void;
      onReaction?: (payload: { messageId: string; reactions: MessageReaction[] }) => void;
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
      if (msg.data) handlers.onMessageNew?.(msg.data as StaffChatMessage);
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
        handlers.onTyping?.(msg.data.userId, Boolean(msg.data.isTyping), msg.data.name);
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
        // Presence read unavailable if token not granted
      }
    };

    channel.presence.subscribe(() => {
      refreshPresence();
    });

    channel.presence
      .enter({
        name: staffMember.name,
        role: 'agent',
        status: staffMember.availability.toLowerCase(),
      })
      .then(refreshPresence)
      .catch(() => {});

    return () => {
      try {
        channel.unsubscribe('message:new', onMsgNew);
        channel.unsubscribe('message:updated', onMsgUpdated);
        channel.unsubscribe('message:deleted', onMsgDeleted);
        channel.unsubscribe('message:reaction', onMsgReaction);
        channel.unsubscribe('typing', onTypingEvt);
        channel.unsubscribe('receipt:read', onReceiptEvt);
        channel.presence.unsubscribe();
        channel.presence.leave().catch(() => {});
      } catch {
        // Safe cleanup
      }
    };
  }

  public async publishTyping(
    conversationId: string,
    staffId: string,
    name: string,
    isTyping: boolean
  ): Promise<void> {
    if (!this.client || this.status !== 'connected') return;
    try {
      const channel = this.client.channels.get(`support:conv-${conversationId}`);
      await channel.publish('typing', { userId: staffId, name, isTyping });
    } catch {
      // Non-fatal typing telemetry error
    }
  }
}

export const staffAblyService = new StaffAblyService();
