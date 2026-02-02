import type * as PartyKit from "partykit/server";
import { assignRoles, checkWinCondition, resolveVoting } from "@impostor/game";
import type { ClientEvent, Player, PlayerId, Room, ServerEvent, ServerState, Settings } from "@impostor/shared";
import { parseClientEvent } from "./validation";
import { loadState, saveState } from "./storage";
import { createHash, randomUUID } from "crypto";

const DEFAULT_SETTINGS: Settings = {
  maxPlayers: 20,
  impostorCount: 1,
  allowSkipVote: true,
  majorityRule: "absolute",
  timers: { discussionMs: 120000, votingMs: 45000, revealMs: 20000 },
  autoBalanceImpostors: false,
};

const ROLE_REVEAL_MS = 8000;
const GHOST_TIMEOUT_MS = 120000;
const JOIN_RATE_WINDOW_MS = 10000;
const JOIN_RATE_MAX = 8;

export default class Server implements PartyKit.Server {
  private room: PartyKit.Room;
  private state!: ServerState;
  private connectionToPlayer = new Map<string, PlayerId>();
  private phaseTimeout: ReturnType<typeof setTimeout> | undefined;
  private joinTimestamps: number[] = [];
  private ready: Promise<void>;

  constructor(room: PartyKit.Room) {
    this.room = room;
    this.ready = this.init();
    setInterval(() => this.cleanupGhosts(), 30000);
  }

  private async init() {
    const loaded = await loadState(this.room);
    if (loaded) {
      this.state = loaded;
      return;
    }
    const now = Date.now();
    this.state = {
      room: {
        code: this.room.id,
        createdAt: now,
        settings: DEFAULT_SETTINGS,
        players: [],
      },
      bans: [],
      reconnectTokens: {},
    };
    await saveState(this.room, this.state);
  }

  async onConnect(connection: PartyKit.Connection) {
    await this.ready;
    this.send(connection, {
      type: "syncState",
      payload: { state: this.publicRoomState(undefined), youId: "anonymous" },
    });
  }

  onClose(connection: PartyKit.Connection) {
    const playerId = this.connectionToPlayer.get(connection.id);
    if (!playerId) return;
    const player = this.state.room.players.find((p) => p.id === playerId);
    if (player) {
      player.lastSeenAt = Date.now();
      this.persistAndBroadcast();
    }
    this.connectionToPlayer.delete(connection.id);
  }

  async onMessage(message: string, connection: PartyKit.Connection) {
    await this.ready;
    let event: ClientEvent;
    try {
      event = parseClientEvent(message) as ClientEvent;
    } catch (err) {
      this.send(connection, { type: "error", payload: { code: "bad_event", message: "Evento inválido." } });
      return;
    }

    switch (event.type) {
      case "createRoom":
        this.send(connection, { type: "roomCreated", payload: { roomCode: this.room.id } });
        return;
      case "joinRoom":
        await this.handleJoin(event, connection);
        return;
      case "leaveRoom":
        this.handleLeave(event, connection);
        return;
      case "setNickname":
        this.handleSetNickname(event, connection);
        return;
      case "startRound":
        this.handleStartRound(connection);
        return;
      case "castVote":
        this.handleCastVote(event, connection);
        return;
      case "endVoting":
        this.handleEndVoting(connection);
        return;
      case "revealResult":
        this.handleRevealResult(connection);
        return;
      case "restartRound":
        this.handleRestartRound(connection);
        return;
      case "kickPlayer":
        this.handleKickPlayer(event, connection);
        return;
      case "heartbeat":
        this.handleHeartbeat(event, connection);
        return;
      default:
        this.send(connection, { type: "error", payload: { code: "unknown_event", message: "Evento desconocido." } });
    }
  }

  private handleHeartbeat(event: ClientEvent, connection: PartyKit.Connection) {
    if (event.type !== "heartbeat") return;
    const player = this.playerForConnection(connection.id);
    if (player) {
      player.lastSeenAt = event.payload.at;
    }
    this.send(connection, { type: "pong", payload: { at: Date.now() } });
  }

  private async handleJoin(event: ClientEvent, connection: PartyKit.Connection) {
    if (event.type !== "joinRoom") return;
    if (event.payload.roomCode !== this.room.id) {
      this.send(connection, { type: "error", payload: { code: "room_mismatch", message: "Sala incorrecta." } });
      return;
    }
    if (this.state.bans.includes(event.payload.clientId)) {
      this.send(connection, { type: "error", payload: { code: "banned", message: "Expulsado de la sala." } });
      return;
    }
    if (this.state.room.players.length >= this.state.room.settings.maxPlayers) {
      this.send(connection, { type: "error", payload: { code: "room_full", message: "Sala llena." } });
      return;
    }
    if (!this.checkJoinRateLimit()) {
      this.send(connection, { type: "error", payload: { code: "rate_limited", message: "Demasiados intentos." } });
      return;
    }
    if (this.state.room.settings.roomPasswordHash) {
      const ok = this.verifyPassword(event.payload.password);
      if (!ok) {
        this.send(connection, { type: "error", payload: { code: "bad_password", message: "Password incorrecto." } });
        return;
      }
    } else if (event.payload.password) {
      this.state.room.settings.roomPasswordHash = this.hashPassword(event.payload.password);
    }

    const existing = this.state.room.players.find((p) => p.id === event.payload.clientId);
    if (existing) {
      const expectedToken = this.state.reconnectTokens[existing.id];
      if (event.payload.reconnectToken && expectedToken && event.payload.reconnectToken !== expectedToken) {
        this.send(connection, { type: "error", payload: { code: "bad_reconnect", message: "Token inválido." } });
        return;
      }
      this.connectionToPlayer.set(connection.id, existing.id);
      existing.lastSeenAt = Date.now();
      this.persistAndBroadcast();
      this.sendSyncState(connection, existing.id);
      return;
    }

    const player: Player = {
      id: event.payload.clientId,
      nickname: event.payload.nickname,
      isHost: this.state.room.players.length === 0,
      isAlive: true,
      joinedAt: Date.now(),
      lastSeenAt: Date.now(),
    };
    this.state.room.players.push(player);
    this.connectionToPlayer.set(connection.id, player.id);
    this.state.reconnectTokens[player.id] = randomUUID();
    await this.persistAndBroadcast();
    this.sendSyncState(connection, player.id);
  }

  private handleLeave(event: ClientEvent, connection: PartyKit.Connection) {
    if (event.type !== "leaveRoom") return;
    const player = this.playerForConnection(connection.id);
    if (!player) return;
    player.lastSeenAt = Date.now();
    this.connectionToPlayer.delete(connection.id);
    this.persistAndBroadcast();
  }

  private handleSetNickname(event: ClientEvent, connection: PartyKit.Connection) {
    if (event.type !== "setNickname") return;
    const player = this.playerForConnection(connection.id);
    if (!player) return;
    player.nickname = event.payload.nickname;
    this.persistAndBroadcast();
  }

  private handleStartRound(connection: PartyKit.Connection) {
    const player = this.playerForConnection(connection.id);
    if (!player || !player.isHost) return;
    const now = Date.now();
    const alive = this.state.room.players.filter((p) => p.isAlive);
    const impostorCount = this.computeImpostorCount(alive.length);
    const roles = assignRoles(alive.map((p) => p.id), impostorCount, randomUUID());
    for (const p of this.state.room.players) {
      if (!p.isAlive) continue;
      p.role = roles[p.id];
    }

    this.state.room.currentRound = {
      roundId: `${now}`,
      phase: "role",
      startedAt: now,
      phaseEndsAt: now + ROLE_REVEAL_MS,
      votes: [],
      seed: `${now}`,
    };
    this.persistAndBroadcast();
    this.schedule(() => this.startDiscussion(), ROLE_REVEAL_MS);
  }

  private startDiscussion() {
    if (!this.state.room.currentRound) return;
    const now = Date.now();
    this.state.room.currentRound.phase = "discussion";
    this.state.room.currentRound.phaseEndsAt = now + this.state.room.settings.timers.discussionMs;
    this.persistAndBroadcast();
    this.schedule(() => this.startVoting(), this.state.room.settings.timers.discussionMs);
  }

  private startVoting() {
    if (!this.state.room.currentRound) return;
    const now = Date.now();
    this.state.room.currentRound.phase = "voting";
    this.state.room.currentRound.phaseEndsAt = now + this.state.room.settings.timers.votingMs;
    this.state.room.currentRound.votes = [];
    this.persistAndBroadcast();
    this.schedule(() => this.endVotingInternal(), this.state.room.settings.timers.votingMs);
  }

  private handleCastVote(event: ClientEvent, connection: PartyKit.Connection) {
    if (event.type !== "castVote") return;
    const round = this.state.room.currentRound;
    if (!round || round.phase !== "voting") return;
    const player = this.playerForConnection(connection.id);
    if (!player || !player.isAlive) return;
    const existing = round.votes.find((v) => v.voterId === player.id);
    if (existing) return;
    round.votes.push({ voterId: player.id, targetId: event.payload.targetId, at: Date.now() });
    this.persistAndBroadcast();
  }

  private handleEndVoting(connection: PartyKit.Connection) {
    const player = this.playerForConnection(connection.id);
    if (!player || !player.isHost) return;
    this.endVotingInternal();
  }

  private endVotingInternal() {
    const round = this.state.room.currentRound;
    if (!round || round.phase !== "voting") return;
    const alive = this.state.room.players.filter((p) => p.isAlive);
    const roleMap: Record<PlayerId, "impostor" | "crew"> = {};
    alive.forEach((p) => {
      if (p.role) roleMap[p.id] = p.role;
    });
    const result = resolveVoting(round.votes, alive.map((p) => p.id), this.state.room.settings, roleMap);
    round.expelledId = result.expelledId;
    round.wasImpostor = result.wasImpostor;
    if (result.expelledId) {
      const expelled = this.state.room.players.find((p) => p.id === result.expelledId);
      if (expelled) expelled.isAlive = false;
    }
    round.phase = "reveal";
    round.phaseEndsAt = Date.now() + this.state.room.settings.timers.revealMs;
    const winner = checkWinCondition(this.state.room.players);
    round.winner = winner;
    this.persistAndBroadcast();
    this.broadcast({ type: "voteTally", payload: { counts: result.counts, expelledId: result.expelledId, wasImpostor: result.wasImpostor } });
    this.schedule(() => this.endReveal(), this.state.room.settings.timers.revealMs);
  }

  private handleRevealResult(connection: PartyKit.Connection) {
    const player = this.playerForConnection(connection.id);
    if (!player || !player.isHost) return;
    this.endReveal();
  }

  private endReveal() {
    if (!this.state.room.currentRound) return;
    this.state.room.currentRound.phase = "ended";
    this.state.room.currentRound.phaseEndsAt = undefined;
    this.persistAndBroadcast();
  }

  private handleRestartRound(connection: PartyKit.Connection) {
    const player = this.playerForConnection(connection.id);
    if (!player || !player.isHost) return;
    for (const p of this.state.room.players) {
      p.isAlive = true;
      p.role = undefined;
    }
    this.state.room.currentRound = undefined;
    this.persistAndBroadcast();
  }

  private handleKickPlayer(event: ClientEvent, connection: PartyKit.Connection) {
    if (event.type !== "kickPlayer") return;
    const player = this.playerForConnection(connection.id);
    if (!player || !player.isHost) return;
    this.state.bans.push(event.payload.playerId);
    this.state.room.players = this.state.room.players.filter((p) => p.id !== event.payload.playerId);
    this.persistAndBroadcast();
    this.broadcast({ type: "playerKicked", payload: { playerId: event.payload.playerId } });
  }

  private checkJoinRateLimit() {
    const now = Date.now();
    this.joinTimestamps = this.joinTimestamps.filter((t) => now - t < JOIN_RATE_WINDOW_MS);
    if (this.joinTimestamps.length >= JOIN_RATE_MAX) return false;
    this.joinTimestamps.push(now);
    return true;
  }

  private hashPassword(password: string) {
    const salt = process.env.ROOM_PASSWORD_SALT ?? "local_salt";
    return createHash("sha256").update(password + salt).digest("hex");
  }

  private verifyPassword(password?: string) {
    if (!password) return false;
    return this.hashPassword(password) === this.state.room.settings.roomPasswordHash;
  }

  private computeImpostorCount(playerCount: number) {
    if (!this.state.room.settings.autoBalanceImpostors) return this.state.room.settings.impostorCount;
    if (playerCount >= 10) return 2;
    return 1;
  }

  private schedule(fn: () => void, delay: number) {
    if (this.phaseTimeout) clearTimeout(this.phaseTimeout);
    this.phaseTimeout = setTimeout(fn, delay);
  }

  private cleanupGhosts() {
    const now = Date.now();
    const before = this.state.room.players.length;
    this.state.room.players = this.state.room.players.filter((p) => now - p.lastSeenAt < GHOST_TIMEOUT_MS);
    if (this.state.room.players.length !== before) {
      this.persistAndBroadcast();
    }
  }

  private playerForConnection(connectionId: string) {
    const playerId = this.connectionToPlayer.get(connectionId);
    if (!playerId) return undefined;
    return this.state.room.players.find((p) => p.id === playerId);
  }

  private publicRoomState(viewerId: PlayerId | undefined): Room {
    const players = this.state.room.players.map((p) => ({
      ...p,
      role: p.id === viewerId ? p.role : undefined,
    }));
    return { ...this.state.room, players };
  }

  private sendSyncState(connection: PartyKit.Connection, viewerId: PlayerId) {
    const state = this.publicRoomState(viewerId);
    const reconnectToken = this.state.reconnectTokens[viewerId];
    const payload = {
      state,
      youId: viewerId,
      yourRole: state.players.find((p) => p.id === viewerId)?.role,
      reconnectToken: this.state.reconnectTokens[viewerId],
    };
    this.send(connection, { type: "syncState", payload });
    if (reconnectToken) {
      this.send(connection, { type: "pong", payload: { at: Date.now() } });
    }
  }

  private async persistAndBroadcast() {
    await saveState(this.room, this.state);
    for (const connection of this.room.getConnections()) {
      const viewerId = this.connectionToPlayer.get(connection.id);
      this.sendSyncState(connection, viewerId ?? "anonymous");
    }
  }

  private send(connection: PartyKit.Connection, event: ServerEvent) {
    connection.send(JSON.stringify(event));
  }

  private broadcast(event: ServerEvent) {
    this.room.broadcast(JSON.stringify(event));
  }
}
