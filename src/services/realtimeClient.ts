/**
 * Aureus Wealth - Real-time Event Client Pipeline
 * 
 * Ready to connect to backend Server-Sent Events (SSE), WebSockets, or Supabase Realtime channels.
 * When the server is connected, events stream over the configured REALTIME_URL.
 * Also provides client-side event emission for zero-latency UI updates during development.
 */

export type RealtimeHandler = (eventType: string, payload: any) => void;

export const REALTIME_URL =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_REALTIME_URL) ||
  '/api/realtime';

class RealtimeClient {
  private eventSource: EventSource | null = null;
  private listeners: Set<RealtimeHandler> = new Set();
  private isConnecting = false;
  private reconnectTimer: any = null;
  private maxReconnectAttempts = 3;
  private reconnectAttempts = 0;

  public connect(): void {
    if (typeof window === 'undefined') return;
    if (this.eventSource && this.eventSource.readyState === EventSource.OPEN) return;
    if (this.isConnecting) return;

    this.isConnecting = true;

    try {
      this.eventSource = new EventSource(REALTIME_URL);

      this.eventSource.onopen = () => {
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
      };

      this.eventSource.onerror = () => {
        this.isConnecting = false;
        if (this.eventSource) {
          this.eventSource.close();
          this.eventSource = null;
        }
        // Limit auto-reconnect backoff so we don't spam if backend is not yet started
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          if (!this.reconnectTimer) {
            this.reconnectTimer = setTimeout(() => {
              this.reconnectTimer = null;
              this.connect();
            }, 5000);
          }
        }
      };

      // Standard private banking event topics
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
    } catch {
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

  public emit(eventType: string, payload: any): void {
    this.notifyListeners(eventType, payload);
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
