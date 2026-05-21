// managers/WebSocketManager.ts
// Manages the WebSocket connection to the MUD server.

import type { MudProfile } from '../types';

export interface WebSocketManagerOptions {
  onOpen: () => void;
  onClose: (event: CloseEvent) => void;
  onError: (event: Event) => void;
  onMessage: (data: string) => void;
  onConnected: () => void;
}

export class WebSocketManager {
  private ws: WebSocket | null = null;
  private options: WebSocketManagerOptions;
  private closedByUser = false;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private currentProfile: MudProfile | null = null;
  private connectionId = 0;

  constructor(options: WebSocketManagerOptions) {
    this.options = options;
  }

  public connect(profile: MudProfile): void {
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.onmessage = null;
      this.ws.close();
    }

    this.closedByUser = false;
    this.currentProfile = profile;
    const connectionId = ++this.connectionId;
    const url = import.meta.env.VITE_WS_URL || 'ws://0.0.0.0:3000';
    this.ws = new WebSocket(url);
    this.setupEventHandlers(connectionId);
  }

  public disconnect(): void {
    this.closedByUser = true;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.onmessage = null;
      this.ws.close();
      this.ws = null;
    }
  }

  public send(data: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    }
  }

  public isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private setupEventHandlers(connectionId: number): void {
    if (!this.ws) return;
    const ws = this.ws;

    ws.onopen = () => {
      if (connectionId !== this.connectionId) return;
      this.options.onOpen();
      // Send profile as first message
      if (this.currentProfile) {
        ws.send(
          JSON.stringify({
            address: this.currentProfile.address,
            port: this.currentProfile.port,
            encoding: this.currentProfile.encoding || 'utf8',
          })
        );
      }
    };

    ws.onclose = event => {
      if (connectionId !== this.connectionId) return;
      this.options.onClose(event);
      if (!this.closedByUser && this.currentProfile) {
        this.reconnectTimeout = setTimeout(() => {
          this.connect(this.currentProfile!);
        }, 5000);
      }
    };

    ws.onerror = event => {
      if (connectionId !== this.connectionId) return;
      this.options.onError(event);
    };

    ws.onmessage = event => {
      if (connectionId !== this.connectionId) return;
      this.options.onMessage(event.data);
      if (
        typeof event.data === 'string' &&
        event.data.includes('[INFO] Connected to MUD server')
      ) {
        this.options.onConnected();
      }
    };
  }
}
