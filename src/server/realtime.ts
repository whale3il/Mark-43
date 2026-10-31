import { Response } from 'express';

export interface RealtimeEvent<T = any> {
  type: string;
  payload: T;
  timestamp: string;
}

class RealtimeBroker {
  private clients: Set<Response> = new Set();

  /**
   * Adds an active HTTP response connection to the real-time SSE stream.
   */
  public addClient(res: Response): void {
    this.clients.add(res);

    // Clean up on disconnect
    res.on('close', () => {
      this.clients.delete(res);
    });
  }

  /**
   * Broadcasts an event to all connected dashboard clients instantly.
   * Enables zero-page-refresh live synchronization.
   */
  public broadcast<T = any>(type: string, payload: T): void {
    const event: RealtimeEvent<T> = {
      type,
      payload,
      timestamp: new Date().toISOString()
    };

    const dataString = `event: ${type}\ndata: ${JSON.stringify(event)}\n\n`;

    for (const client of this.clients) {
      try {
        client.write(dataString);
      } catch (err) {
        this.clients.delete(client);
      }
    }
  }

  public getClientCount(): number {
    return this.clients.size;
  }
}

export const realtimeBroker = new RealtimeBroker();
