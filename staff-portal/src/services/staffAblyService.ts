import * as Ably from 'ably';
import { STAFF_CONFIG } from '../config/staffConfig';
import { AblyPresenceMember } from '@/src/services/ablyService';
import {
  normalizeCallSession,
  normalizeConversationStatus,
} from '@/src/services/supportService';
import {
  MessageReaction,
  StaffAvailabilityEnum,
  StaffChatMessage,
  StaffTicket,
  SupportCallSession,
  SupportCallSignalPayload,
  SupportConversationStatus,
} from '../types/staff.types';
import { normalizeStaffMessage } from './staffPortalService';

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

export interface StaffConversationRealtimeHandlers {
  onMessageNew?: (message: StaffChatMessage) => void;
  onMessageUpdated?: (message: Partial<StaffChatMessage> & { id: string }) => void;
  onMessageDeleted?: (payload: { id: string; deletedAt?: string }) => void;
  onReaction?: (payload: { messageId: string; reactions: MessageReaction[] }) => void;
  onTyping?: (userId: string, isTyping: boolean, name?: string) => void;
  onReceipt?: (messageId: string, status: 'delivered' | 'read') => void;
  onConversationUpdated?: (patch: {
    conversationId: string;
    status?: SupportConversationStatus;
  }) => void;
  onSessionEnded?: (payload: { conversationId: string; endedAt?: string }) => void;
  onCallEvent?: (
    eventType: 'incoming' | 'accepted' | 'rejected' | 'ended',
    call: SupportCallSession
  ) => void;
  onCallSignal?: (signal: SupportCallSignalPayload) => void;
  onPresence?: (members: AblyPresenceMember[]) => void;
  onReconnected?: () => void;
}

class StaffAblyService {
  private client: Ably.Realtime | null = null;
  private clientsByConv = new Map<string, Ably.Realtime>();
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

  private async fetchTokenRequest(
    conversationId?: string
  ): Promise<Ably.TokenRequest | Ably.TokenDetails> {
    const query = conversationId
      ? `?${new URLSearchParams({ conversationId }).toString()}`
      : '';
    const tokenEndpoint = `${STAFF_CONFIG.apiBaseUrl}${STAFF_CONFIG.endpoints.ably.token}${query}`;

    let response = await fetch(tokenEndpoint, {
      method: 'GET',
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });

    if (response.status === 404 || response.status === 405) {
      response = await fetch(tokenEndpoint, {
        method: 'POST',
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });
    }

    const contentType = response.headers.get('content-type') || '';
    if (!response.ok || !contentType.includes('application/json')) {
      throw new Error(
        `Ably token endpoint ${tokenEndpoint} unavailable (${response.status}).`
      );
    }

    const payload = await response.json();
    return payload?.data || payload;
  }

  /**
   * Initializes permission-scoped Ably Realtime connection for staff assignments & ticket notifications.
   */
  public async connect(
    staffId: string,
    callbacks?: StaffRealtimeCallbacks
  ): Promise<void> {
    if (typeof window === 'undefined' || !staffId) return;
    if (
      this.client &&
      this.activeStaffId === staffId &&
      this.status === 'connected'
    ) {
      return;
    }

    this.disconnect();
    this.activeStaffId = staffId;
    this.setStatus('connecting');

    try {
      const client = new Ably.Realtime({
        clientId: staffId,
        authCallback: async (_tokenParams, callback) => {
          try {
            const tokenRequest = await this.fetchTokenRequest();
            callback(null, tokenRequest as Ably.TokenRequest);
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

  private cleanupConversationClient(conversationId: string): void {
    const existing = this.clientsByConv.get(conversationId);
    if (existing) {
      try {
        existing.close();
      } catch {
        // Ignore close errors
      }
      this.clientsByConv.delete(conversationId);
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
    for (const convId of Array.from(this.clientsByConv.keys())) {
      this.cleanupConversationClient(convId);
    }
    this.activeStaffId = null;
    this.setStatus('idle');
  }

  /**
   * Subscribes to `support:conv-{conversationId}` using a conversation-scoped backend TokenRequest
   * (`GET /api/ably/token?conversationId=...` with `credentials: 'include'`).
   */
  public subscribeConversation(
    conversationId: string,
    staffMember: {
      id: string;
      name: string;
      availability: StaffAvailabilityEnum;
    },
    handlers: StaffConversationRealtimeHandlers
  ): () => void {
    if (typeof window === 'undefined' || !conversationId || !staffMember.id) {
      return () => {};
    }

    let disposed = false;
    let hasConnectedOnce = false;

    this.cleanupConversationClient(conversationId);

    const convClient = new Ably.Realtime({
      clientId: staffMember.id,
      authCallback: async (_tokenParams, callback) => {
        try {
          const tokenRequest = await this.fetchTokenRequest(conversationId);
          callback(null, tokenRequest as Ably.TokenRequest);
        } catch (err: any) {
          callback(err, null);
        }
      },
    });

    this.clientsByConv.set(conversationId, convClient);

    convClient.connection.on('connected', () => {
      if (disposed) return;
      if (hasConnectedOnce) {
        handlers.onReconnected?.();
      }
      hasConnectedOnce = true;
    });

    const channel = convClient.channels.get(`support:conv-${conversationId}`);

    const onMsgNew = (msg: Ably.Message) => {
      if (disposed || !msg.data) return;
      handlers.onMessageNew?.(normalizeStaffMessage(msg.data, conversationId));
    };
    const onMsgUpdated = (msg: Ably.Message) => {
      if (disposed || !msg.data?.id) return;
      handlers.onMessageUpdated?.(msg.data);
    };
    const onMsgDeleted = (msg: Ably.Message) => {
      if (disposed || !msg.data?.id) return;
      handlers.onMessageDeleted?.(msg.data);
    };
    const onMsgReaction = (msg: Ably.Message) => {
      if (disposed || !msg.data?.messageId) return;
      handlers.onReaction?.(msg.data);
    };
    const onTypingEvt = (msg: Ably.Message) => {
      if (disposed || !msg.data) return;
      const userId = String(msg.data.userId || msg.data.senderId || '');
      if (userId && userId !== staffMember.id) {
        handlers.onTyping?.(userId, Boolean(msg.data.isTyping), msg.data.name);
      }
    };
    const onDeliveredEvt = (msg: Ably.Message) => {
      if (disposed || !msg.data) return;
      const messageId = String(msg.data.messageId || msg.data.id || '');
      if (messageId) handlers.onReceipt?.(messageId, 'delivered');
    };
    const onReadEvt = (msg: Ably.Message) => {
      if (disposed || !msg.data) return;
      const messageId = String(msg.data.messageId || msg.data.id || '');
      if (messageId) {
        handlers.onReceipt?.(messageId, msg.data.status || 'read');
      }
    };
    const onConvUpdated = (msg: Ably.Message) => {
      if (disposed || !msg.data) return;
      handlers.onConversationUpdated?.({
        conversationId: String(
          msg.data.conversationId || msg.data.id || conversationId
        ),
        status: msg.data.status
          ? normalizeConversationStatus(msg.data.status)
          : undefined,
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
      (evt: 'incoming' | 'accepted' | 'rejected' | 'ended') =>
      (msg: Ably.Message) => {
        if (disposed || !msg.data) return;
        const call = normalizeCallSession(
          msg.data.call || msg.data,
          conversationId
        );
        handlers.onCallEvent?.(evt, call);
      };

    const onCallIncoming = makeCallHandler('incoming');
    const onCallAccepted = makeCallHandler('accepted');
    const onCallRejected = makeCallHandler('rejected');
    const onCallEnded = makeCallHandler('ended');

    const onCallSignal = (msg: Ably.Message) => {
      if (disposed || !msg.data) return;
      const d = msg.data as SupportCallSignalPayload;
      if (d.fromUserId && d.fromUserId === staffMember.id) return;
      handlers.onCallSignal?.({
        callId: String(d.callId || ''),
        conversationId: String(d.conversationId || conversationId),
        fromUserId: d.fromUserId,
        signalType: d.signalType,
        sdp: d.sdp,
        candidate: d.candidate,
      });
    };

    channel.subscribe('message:new', onMsgNew);
    channel.subscribe('message', onMsgNew);
    channel.subscribe('message:updated', onMsgUpdated);
    channel.subscribe('message:deleted', onMsgDeleted);
    channel.subscribe('message:reaction', onMsgReaction);
    channel.subscribe('typing', onTypingEvt);
    channel.subscribe('receipt:delivered', onDeliveredEvt);
    channel.subscribe('receipt:read', onReadEvt);
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
      disposed = true;
      try {
        channel.unsubscribe('message:new', onMsgNew);
        channel.unsubscribe('message', onMsgNew);
        channel.unsubscribe('message:updated', onMsgUpdated);
        channel.unsubscribe('message:deleted', onMsgDeleted);
        channel.unsubscribe('message:reaction', onMsgReaction);
        channel.unsubscribe('typing', onTypingEvt);
        channel.unsubscribe('receipt:delivered', onDeliveredEvt);
        channel.unsubscribe('receipt:read', onReadEvt);
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
        // Safe cleanup
      }
      this.cleanupConversationClient(conversationId);
    };
  }

  public async publishTyping(
    conversationId: string,
    staffId: string,
    name: string,
    isTyping: boolean
  ): Promise<void> {
    const convClient = this.clientsByConv.get(conversationId) || this.client;
    if (!convClient) return;
    try {
      const channel = convClient.channels.get(`support:conv-${conversationId}`);
      await channel.publish('typing', { userId: staffId, name, isTyping });
    } catch {
      // Non-fatal typing telemetry error
    }
  }
}

export const staffAblyService = new StaffAblyService();
