import * as Ably from 'ably';
import { STAFF_CONFIG } from '../config/staffConfig';
import type { AblyPresenceMember } from '@/src/services/ablyService';
import type {
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

export type DeliveryStatus = 'sent' | 'delivered' | 'read';

export type CallKind = 'audio' | 'video';

export type CallState =
  | 'ringing'
  | 'accepted'
  | 'rejected'
  | 'busy'
  | 'ended'
  | 'missed';

export interface CallSignal {
  callId: string;
  conversationId: string;
  fromUserId: string;
  toUserId?: string;
  kind: CallKind;
  state: CallState;
  createdAt?: string;
  /** Signaling metadata only; never media streams. */
  metadata?: Record<string, unknown>;
}

export interface AttachmentInput {
  file: File;
  conversationId: string;
  kind: 'image' | 'video' | 'audio' | 'document' | 'voice';
}

export interface MessageInput {
  conversationId: string;
  text?: string;
  attachmentIds?: string[];
  replyToId?: string;
  clientMutationId?: string;
}

/**
 * The existing backend service implements these adapters.
 *
 * Durable mutations MUST be authenticated and authorized
 * server-side, persisted in PostgreSQL, then broadcast
 * by the server.
 *
 * This realtime service never fabricates persistence.
 */
export interface StaffCommunicationApi {
  sendMessage(input: MessageInput): Promise<StaffChatMessage>;

  editMessage(
    conversationId: string,
    messageId: string,
    text: string
  ): Promise<void>;

  deleteMessage(
    conversationId: string,
    messageId: string
  ): Promise<void>;

  reactToMessage(
    conversationId: string,
    messageId: string,
    emoji: string
  ): Promise<void>;

  updateReceipt(
    conversationId: string,
    messageId: string,
    status: DeliveryStatus
  ): Promise<void>;

  uploadAttachment(
    input: AttachmentInput
  ): Promise<{ id: string; url?: string }>;

  updateConversationStatus(
    conversationId: string,
    status: 'active' | 'pending' | 'resolved'
  ): Promise<void>;

  saveInternalNotes(
    conversationId: string,
    notes: string
  ): Promise<void>;

  updateTicketStatus(
    ticketId: string,
    status: string
  ): Promise<void>;

  updateAvailability(
    availability: StaffAvailabilityEnum
  ): Promise<void>;

  sendCallSignal(signal: CallSignal): Promise<void>;
}

export interface StaffRealtimeCallbacks {
  onStatusChange?: (
    status: RealtimeConnectionStatus,
    detail?: string
  ) => void;

  onAssignment?: (payload: {
    conversationId: string;
    customerName?: string;
  }) => void;

  onTicketEvent?: (
    ticket: Partial<StaffTicket> & { id: string }
  ) => void;

  onConversationEvent?: (
    payload: ConversationEvent
  ) => void;

  onUnreadChange?: (payload: {
    conversationId: string;
    unreadCount: number;
  }) => void;
}

export interface ConversationEvent {
  conversationId: string;
  status?: 'active' | 'pending' | 'resolved';
  assignedStaffId?: string | null;
  updatedAt?: string;
}

export interface ConversationHandlers {
  onMessageNew?: (message: StaffChatMessage) => void;

  onMessageUpdated?: (
    message: Partial<StaffChatMessage> & { id: string }
  ) => void;

  onMessageDeleted?: (payload: {
    id: string;
    deletedAt?: string;
  }) => void;

  onReaction?: (payload: {
    messageId: string;
    reactions: MessageReaction[];
  }) => void;

  onTyping?: (
    userId: string,
    isTyping: boolean,
    name?: string
  ) => void;

  onReceipt?: (
    messageId: string,
    status: DeliveryStatus
  ) => void;

  onPresence?: (
    members: AblyPresenceMember[]
  ) => void;

  onCallSignal?: (signal: CallSignal) => void;

  onConversationEvent?: (
    event: ConversationEvent
  ) => void;

  onError?: (error: Error) => void;
}

type Listener<T> = (event: T) => void;

const conversationChannel = (id: string) =>
  `support:conv-${id}`;

class StaffAblyService {
  private client: Ably.Realtime | null = null;

  private status: RealtimeConnectionStatus = 'idle';

  private activeStaffId: string | null = null;

  private staffChannel: Ably.RealtimeChannel | null = null;

  private api: StaffCommunicationApi | null = null;

  private generation = 0;

  private lastTypingAt = new Map<string, number>();

  private conversationCleanups = new Set<() => void>();

  private assignmentListeners = new Set<
    Listener<{
      conversationId: string;
      customerName?: string;
    }>
  >();

  private ticketEventListeners = new Set<
    Listener<Partial<StaffTicket> & { id: string }>
  >();

  private statusListeners = new Set<
    (
      status: RealtimeConnectionStatus,
      detail?: string
    ) => void
  >();

  private conversationListeners = new Set<
    Listener<ConversationEvent>
  >();

  private unreadListeners = new Set<
    Listener<{
      conversationId: string;
      unreadCount: number;
    }>
  >();

  /**
   * Inject existing authenticated REST API implementation.
   */
  public configure(api: StaffCommunicationApi): void {
    this.api = api;
  }

  private requireApi(): StaffCommunicationApi {
    if (!this.api) {
      throw new Error(
        'StaffCommunicationApi is not configured.'
      );
    }

    return this.api;
  }

  public getStatus(): RealtimeConnectionStatus {
    return this.status;
  }

  public getStaffId(): string | null {
    return this.activeStaffId;
  }

  private setStatus(
    next: RealtimeConnectionStatus,
    detail?: string
  ): void {
    this.status = next;

    this.statusListeners.forEach((cb) =>
      cb(next, detail)
    );
  }

  public onStatusChange(
    handler: (
      status: RealtimeConnectionStatus,
      detail?: string
    ) => void
  ): () => void {
    this.statusListeners.add(handler);

    handler(this.status);

    return () => {
      this.statusListeners.delete(handler);
    };
  }

  public onStaffAssignment(
    handler: Listener<{
      conversationId: string;
      customerName?: string;
    }>
  ): () => void {
    this.assignmentListeners.add(handler);

    return () => {
      this.assignmentListeners.delete(handler);
    };
  }

  public onStaffTicketEvent(
    handler: Listener<
      Partial<StaffTicket> & { id: string }
    >
  ): () => void {
    this.ticketEventListeners.add(handler);

    return () => {
      this.ticketEventListeners.delete(handler);
    };
  }

  public onConversationEvent(
    handler: Listener<ConversationEvent>
  ): () => void {
    this.conversationListeners.add(handler);

    return () => {
      this.conversationListeners.delete(handler);
    };
  }

  public onUnreadChange(
    handler: Listener<{
      conversationId: string;
      unreadCount: number;
    }>
  ): () => void {
    this.unreadListeners.add(handler);

    return () => {
      this.unreadListeners.delete(handler);
    };
  }

  /**
   * Single Ably connection per authenticated staff session.
   *
   * Backend token endpoint must:
   * - Authenticate HTTP-only cookies.
   * - Derive the authenticated staff identity.
   * - Grant permission-scoped channel capabilities.
   */
  public async connect(
    staffId: string,
    callbacks?: StaffRealtimeCallbacks
  ): Promise<void> {
    if (
      typeof window === 'undefined' ||
      !staffId
    ) {
      return;
    }

    if (
      this.client &&
      this.activeStaffId === staffId &&
      this.status !== 'unavailable'
    ) {
      return;
    }

    this.disconnect();

    const generation = this.generation;

    this.activeStaffId = staffId;

    this.setStatus('connecting');

    const tokenEndpoint =
      `${STAFF_CONFIG.apiBaseUrl}` +
      `${STAFF_CONFIG.endpoints.ably.token}`;

    try {
      const client = new Ably.Realtime({
        authCallback: async (_params, callback) => {
          try {
            const response = await fetch(
              tokenEndpoint,
              {
                method: 'GET',
                credentials: 'include',
                headers: {
                  Accept: 'application/json',
                },
              }
            );

            if (!response.ok) {
              throw new Error(
                `Ably authentication failed (${response.status}).`
              );
            }

            const body = await response.json();

            const token =
              body?.data ??
              body?.tokenRequest ??
              body;

            if (!token) {
              throw new Error(
                'Empty Ably token response.'
              );
            }

            callback(null, token);
          } catch (err) {
            const error =
              err instanceof Error
                ? err
                : new Error(
                    'Ably authentication failed.'
                  );

            if (
              generation === this.generation
            ) {
              this.setStatus(
                'unavailable',
                error.message
              );
            }

            callback(error.message, null);
          }
        },
      });

      if (
        generation !== this.generation
      ) {
        client.close();
        return;
      }

      this.client = client;

      client.connection.on(
        'connecting',
        () => {
          this.setStatus('connecting');
        }
      );

      client.connection.on(
        'connected',
        () => {
          this.setStatus('connected');

          callbacks?.onStatusChange?.(
            'connected'
          );
        }
      );

      client.connection.on(
        'disconnected',
        () => {
          this.setStatus('disconnected');

          callbacks?.onStatusChange?.(
            'disconnected'
          );
        }
      );

      client.connection.on(
        'suspended',
        () => {
          this.setStatus(
            'disconnected',
            'Connection suspended; recovering.'
          );
        }
      );

      client.connection.on(
        'failed',
        (state) => {
          const reason =
            state.reason?.message ??
            'Ably connection failed.';

          this.setStatus(
            'unavailable',
            reason
          );

          callbacks?.onStatusChange?.(
            'unavailable',
            reason
          );
        }
      );

      client.connection.on(
        'closed',
        () => {
          this.setStatus('idle');
        }
      );

      const channel =
        client.channels.get(
          `staff:${staffId}`
        );

      this.staffChannel = channel;

      await channel.subscribe(
        'assignment:new',
        (msg) => {
          if (
            !msg.data?.conversationId
          ) {
            return;
          }

          callbacks?.onAssignment?.(
            msg.data
          );

          this.assignmentListeners.forEach(
            (listener) =>
              listener(msg.data)
          );
        }
      );

      const onTicket = (
        msg: Ably.Message
      ) => {
        if (!msg.data?.id) {
          return;
        }

        callbacks?.onTicketEvent?.(
          msg.data
        );

        this.ticketEventListeners.forEach(
          (listener) =>
            listener(msg.data)
        );
      };

      await channel.subscribe(
        'ticket:updated',
        onTicket
      );

      await channel.subscribe(
        'ticket:assigned',
        onTicket
      );

      await channel.subscribe(
        'conversation:updated',
        (msg) => {
          if (
            !msg.data?.conversationId
          ) {
            return;
          }

          callbacks?.onConversationEvent?.(
            msg.data
          );

          this.conversationListeners.forEach(
            (listener) =>
              listener(msg.data)
          );
        }
      );

      await channel.subscribe(
        'unread:updated',
        (msg) => {
          if (
            !msg.data?.conversationId ||
            typeof msg.data.unreadCount !==
              'number'
          ) {
            return;
          }

          callbacks?.onUnreadChange?.(
            msg.data
          );

          this.unreadListeners.forEach(
            (listener) =>
              listener(msg.data)
          );
        }
      );
    } catch (err) {
      if (
        generation === this.generation
      ) {
        this.setStatus(
          'unavailable',
          err instanceof Error
            ? err.message
            : 'Ably setup failed.'
        );
      }
    }
  }

  /**
   * Subscribe to an individual conversation.
   */
  public subscribeConversation(
    conversationId: string,

    staffMember: {
      id: string;
      name: string;
      availability: StaffAvailabilityEnum;
    },

    handlers: ConversationHandlers
  ): () => void {
    if (
      !this.client ||
      !conversationId ||
      staffMember.id !==
        this.activeStaffId
    ) {
      return () => {};
    }

    const channel =
      this.client.channels.get(
        conversationChannel(
          conversationId
        )
      );

    let disposed = false;

    const subscriptions: Array<
      [
        string,
        (msg: Ably.Message) => void
      ]
    > = [];

    const listen = (
      event: string,
      fn: (msg: Ably.Message) => void
    ) => {
      subscriptions.push([
        event,
        fn,
      ]);

      void channel
        .subscribe(event, fn)
        .catch((err) =>
          handlers.onError?.(err)
        );
    };

    // New messages
    listen(
      'message:new',
      (msg) => {
        if (msg.data?.id) {
          handlers.onMessageNew?.(
            msg.data
          );
        }
      }
    );

    // Edited messages
    listen(
      'message:updated',
      (msg) => {
        if (msg.data?.id) {
          handlers.onMessageUpdated?.(
            msg.data
          );
        }
      }
    );

    // Deleted messages
    listen(
      'message:deleted',
      (msg) => {
        if (msg.data?.id) {
          handlers.onMessageDeleted?.(
            msg.data
          );
        }
      }
    );

    // Reactions
    listen(
      'message:reaction',
      (msg) => {
        if (
          msg.data?.messageId
        ) {
          handlers.onReaction?.(
            msg.data
          );
        }
      }
    );

    // Typing indicators
    listen(
      'typing',
      (msg) => {
        if (
          msg.data?.userId &&
          msg.data.userId !==
            this.activeStaffId
        ) {
          handlers.onTyping?.(
            msg.data.userId,
            Boolean(
              msg.data.isTyping
            ),
            msg.data.name
          );
        }
      }
    );

    // Delivery receipts
    const receiptHandler = (
      msg: Ably.Message
    ) => {
      if (
        msg.data?.messageId
      ) {
        handlers.onReceipt?.(
          msg.data.messageId,
          msg.data.status
        );
      }
    };

    listen(
      'receipt:delivered',
      receiptHandler
    );

    listen(
      'receipt:read',
      receiptHandler
    );

    // Audio/video call signaling
    listen(
      'call:signal',
      (msg) => {
        if (
          msg.data?.callId
        ) {
          handlers.onCallSignal?.(
            msg.data
          );
        }
      }
    );

    // Conversation updates
    listen(
      'conversation:updated',
      (msg) => {
        if (
          msg.data?.conversationId
        ) {
          handlers.onConversationEvent?.(
            msg.data
          );
        }
      }
    );

    /**
     * Realtime presence tracking.
     */
    const refreshPresence =
      async () => {
        try {
          const members =
            await channel.presence.get();

          if (disposed) {
            return;
          }

          handlers.onPresence?.(
            members.map((m) => ({
              clientId:
                m.clientId,

              data:
                (m.data as AblyPresenceMember['data']) ??
                {
                  name: m.clientId,
                  role: 'customer',
                  status: 'online',
                },
            }))
          );
        } catch (err) {
          if (!disposed) {
            handlers.onError?.(
              err instanceof Error
                ? err
                : new Error(
                    'Presence unavailable.'
                  )
            );
          }
        }
      };

    const presenceListener = (
      _member: Ably.PresenceMessage
    ) => {
      void refreshPresence();
    };

    void channel.presence
      .subscribe(
        presenceListener
      )
      .then(async () => {
        if (disposed) {
          return;
        }

        await channel.presence.enter({
          name: staffMember.name,
          role: 'agent',
          status:
            staffMember.availability.toLowerCase(),
        });

        await refreshPresence();
      })
      .catch((err) => {
        if (!disposed) {
          handlers.onError?.(
            err
          );
        }
      });

    /**
     * Cleanup subscriptions.
     */
    const cleanup = () => {
      if (disposed) {
        return;
      }

      disposed = true;

      for (
        const [
          event,
          fn,
        ] of subscriptions
      ) {
        channel.unsubscribe(
          event,
          fn
        );
      }

      channel.presence.unsubscribe(
        presenceListener
      );

      void channel.presence
        .leave()
        .catch(() => {});

      this.conversationCleanups.delete(
        cleanup
      );
    };

    this.conversationCleanups.add(
      cleanup
    );

    return cleanup;
  }

  /**
   * Publish typing indicator.
   */
  public async publishTyping(
    conversationId: string,
    staffId: string,
    name: string,
    isTyping: boolean
  ): Promise<void> {
    if (
      !this.client ||
      this.status !== 'connected' ||
      staffId !==
        this.activeStaffId
    ) {
      return;
    }

    const now =
      Date.now();

    const last =
      this.lastTypingAt.get(
        conversationId
      ) ?? 0;

    // Throttle typing events
    if (
      isTyping &&
      now - last < 900
    ) {
      return;
    }

    this.lastTypingAt.set(
      conversationId,
      now
    );

    await this.client.channels
      .get(
        conversationChannel(
          conversationId
        )
      )
      .publish(
        'typing',
        {
          userId: staffId,
          name,
          isTyping,
        }
      );
  }

  /**
   * Update presence.
   */
  public async updatePresence(
    conversationId: string,

    member: {
      name: string;
      availability: StaffAvailabilityEnum;
    }
  ): Promise<void> {
    if (!this.client) {
      throw new Error(
        'Ably client not connected.'
      );
    }

    await this.client.channels
      .get(
        conversationChannel(
          conversationId
        )
      )
      .presence.update({
        name: member.name,
        role: 'agent',
        status:
          member.availability.toLowerCase(),
      });
  }

  /**
   * Persistent messaging operations.
   *
   * These call authenticated backend APIs.
   */

  public sendMessage(
    input: MessageInput
  ) {
    return this.requireApi()
      .sendMessage(input);
  }

  public editMessage(
    conversationId: string,
    messageId: string,
    text: string
  ) {
    return this.requireApi()
      .editMessage(
        conversationId,
        messageId,
        text
      );
  }

  public deleteMessage(
    conversationId: string,
    messageId: string
  ) {
    return this.requireApi()
      .deleteMessage(
        conversationId,
        messageId
      );
  }

  public reactToMessage(
    conversationId: string,
    messageId: string,
    emoji: string
  ) {
    return this.requireApi()
      .reactToMessage(
        conversationId,
        messageId,
        emoji
      );
  }

  public updateReceipt(
    conversationId: string,
    messageId: string,
    status: DeliveryStatus
  ) {
    return this.requireApi()
      .updateReceipt(
        conversationId,
        messageId,
        status
      );
  }

  /**
   * File uploads.
   *
   * Supports:
   * - Images
   * - Videos
   * - Audio
   * - Documents
   * - Voice notes
   */
  public uploadAttachment(
    input: AttachmentInput
  ) {
    return this.requireApi()
      .uploadAttachment(input);
  }

  /**
   * Conversation management.
   */
  public updateConversationStatus(
    conversationId: string,
    status:
      | 'active'
      | 'pending'
      | 'resolved'
  ) {
    return this.requireApi()
      .updateConversationStatus(
        conversationId,
        status
      );
  }

  /**
   * Private staff notes.
   */
  public saveInternalNotes(
    conversationId: string,
    notes: string
  ) {
    return this.requireApi()
      .saveInternalNotes(
        conversationId,
        notes
      );
  }

  /**
   * Ticket management.
   */
  public updateTicketStatus(
    ticketId: string,
    status: string
  ) {
    return this.requireApi()
      .updateTicketStatus(
        ticketId,
        status
      );
  }

  /**
   * Staff availability.
   */
  public updateAvailability(
    availability:
      StaffAvailabilityEnum
  ) {
    return this.requireApi()
      .updateAvailability(
        availability
      );
  }

  /**
   * WebRTC call signaling.
   *
   * Actual audio/video media is handled
   * by a separate WebRTC call manager.
   */
  public sendCallSignal(
    signal: CallSignal
  ) {
    return this.requireApi()
      .sendCallSignal(
        signal
      );
  }

  /**
   * Disconnect and cleanup.
   */
  public disconnect(): void {
    this.generation++;

    for (
      const cleanup of [
        ...this.conversationCleanups,
      ]
    ) {
      cleanup();
    }

    this.conversationCleanups.clear();

    this.lastTypingAt.clear();

    this.staffChannel?.unsubscribe();

    this.staffChannel = null;

    this.client?.close();

    this.client = null;

    this.activeStaffId = null;

    this.setStatus('idle');
  }
}

export const staffAblyService =
  new StaffAblyService();