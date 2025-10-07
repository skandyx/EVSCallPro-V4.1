
type MessageHandler = (data: any) => void;

class WebSocketClient {
  private ws: WebSocket | null = null;
  private messageHandlers: MessageHandler[] = [];
  private url: string | null = null;
  private reconnectInterval: number = 5000; // 5 seconds
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private token: string | null = null;

  constructor() {
    // URL is now set in connect()
  }

  connect(token: string): void {
    if (!token) {
        console.error("WebSocket connection requires a token.");
        return;
    }
    this.token = token;

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('WebSocket is already connected.');
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // FIX: The WebSocket endpoint path must end with a slash to match the Nginx proxy configuration.
    this.url = `${protocol}//${window.location.host}/api/?token=${this.token}`;

    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0; // Reset on successful connection
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.messageHandlers.forEach(handler => handler(data));
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected.');
      if (this.reconnectAttempts < this.maxReconnectAttempts && this.token) {
        this.reconnectAttempts++;
        setTimeout(() => {
          console.log(`Reconnecting... (Attempt ${this.reconnectAttempts})`);
          this.connect(this.token!);
        }, this.reconnectInterval * this.reconnectAttempts); // Exponential backoff
      } else if (this.token) {
        console.error('Max reconnect attempts reached.');
      }
    };
  }

  disconnect(): void {
    this.token = null; // Prevent reconnection on manual disconnect
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  send(data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.error('WebSocket is not connected.');
    }
  }

  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.push(handler);
    // Return a function to unsubscribe
    return () => {
      this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
    };
  }
}

// Export a singleton instance
const wsClient = new WebSocketClient();
export default wsClient;