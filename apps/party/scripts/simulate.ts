import WebSocket from "ws";
import crypto from "crypto";

const host = process.env.PARTY_HOST ?? "ws://localhost:1999";
const roomCode = process.env.ROOM_CODE ?? "TEST1";
const playerCount = Number(process.env.PLAYER_COUNT ?? "6");

type Client = {
  id: string;
  ws: WebSocket;
  isHost: boolean;
};

const clients: Client[] = [];

function send(ws: WebSocket, event: unknown) {
  ws.send(JSON.stringify(event));
}

function connectPlayer(index: number): Promise<Client> {
  return new Promise((resolve) => {
    const id = `player-${crypto.randomUUID()}`;
    const ws = new WebSocket(`${host}/party/${roomCode}`);
    ws.on("open", () => {
      send(ws, {
        type: "joinRoom",
        payload: { roomCode, nickname: `P${index}`, clientId: id },
      });
      resolve({ id, ws, isHost: index === 0 });
    });
  });
}

async function main() {
  for (let i = 0; i < playerCount; i += 1) {
    clients.push(await connectPlayer(i));
  }

  const hostClient = clients[0];
  setTimeout(() => {
    send(hostClient.ws, { type: "startRound", payload: {} });
  }, 1000);

  setTimeout(() => {
    for (const client of clients) {
      const target = clients[Math.floor(Math.random() * clients.length)].id;
      send(client.ws, { type: "castVote", payload: { targetId: target } });
    }
  }, 4000);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
