import type { ClientEvent, ServerEvent } from "@impostor/shared";

export type PartyClientOptions = {
  roomCode: string;
  onEvent: (event: ServerEvent) => void;
};

export class PartyClient {
  private ws: WebSocket;
  private isOpen = false;
  private queue: ClientEvent[] = [];

  constructor(options: PartyClientOptions) {
    const baseUrl = process.env.NEXT_PUBLIC_PARTYKIT_HOST ?? "http://localhost:1999";
    const wsUrl = baseUrl.replace("http", "ws");
    this.ws = new WebSocket(`${wsUrl}/party/${options.roomCode}`);
    this.ws.onopen = () => {
      this.isOpen = true;
      this.flushQueue();
    };
    this.ws.onmessage = (msg) => {
      try {
        const event = JSON.parse(msg.data as string) as ServerEvent;
        options.onEvent(event);
      } catch {
        // ignore malformed
      }
    };
  }

  send(event: ClientEvent) {
    if (!this.isOpen) {
      this.queue.push(event);
      return;
    }
    this.ws.send(JSON.stringify(event));
  }

  close() {
    this.ws.close();
  }

  private flushQueue() {
    while (this.queue.length > 0) {
      const event = this.queue.shift();
      if (event) {
        this.ws.send(JSON.stringify(event));
      }
    }
  }
}
