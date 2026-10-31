/**
 * Aureus Wealth - Real-time SSE Connection Pipeline
 * Listens to server events over /api/realtime for zero-refresh dashboard synchronizations.
 */

export type RealtimeHandler = (eventType: string, payload: any) => void;

class RealtimeClient {
  private eventSource: EventSource | null = null;
  private listeners: Set<RealtimeHandler> = new Set();
  private isConnecting = false;
  private reconnectTimer: any = null;

  public connect(): void {
    if (typeof window === 'undefined') return;
    if (this.eventSource && this.eventSource.readyState === EventSource.OPEN) return;
    if (this.isConnecting) return;

    this.isConnecting = true;

    try {
      this.eventSource = new EventSource('/api/realtime');

      this.eventSource.onopen = () => {
        this.isConnecting = false;
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
      };

      this.eventSource.onerror = () => {
        this.isConnecting = false;
        if (this.eventSource) {
          this.eventSource.close();
          this.eventSource = null;
        }
        // Auto-reconnect after 3 seconds
        if (!this.reconnectTimer) {
          this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect();
          }, 3000);
        }
      };

      // Register standard banking events
      const eventNames = [
        'account:created',
        'account:updated',
        'transaction:created',
        'transfer:executed',
        'card:updated',
        'card:created',
        'bill:paid',
        'bill:updated',
        'bill:created',
        'goal:updated',
        'goal:created',
        'session:revoked',
        'beneficiary:created',
        'beneficiary:deleted'
      ];

      for (const eventName of eventNames) {
        this.eventSource.addEventListener(eventName, (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            this.notifyListeners(eventName, data.payload ?? data);
          } catch (err) {
            console.error('Error parsing real-time event', err);
          }
        });
      }
    } catch (err) {
      this.isConnecting = false;
    }
  }

  public subscribe(handler: RealtimeHandler): () => void {
    this.listeners.add(handler);
    this.connect();
    return () => {
      this.listeners.delete(handler);
    };
  }

  private notifyListeners(eventType: string, payload: any): void {
    for (const listener of this.listeners) {
      try {
        listener(eventType, payload);
      } catch (err) {
        console.error('Realtime listener error:', err);
      }
    }
  }

  public disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

export const realtimeClient = new RealtimeClient();
