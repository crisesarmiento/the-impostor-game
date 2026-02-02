export type PlayerId = string;
export type RoomCode = string;

export type Role = "impostor" | "crew";
export type Phase = "lobby" | "role" | "discussion" | "voting" | "reveal" | "ended";

export type Timers = {
  discussionMs: number;
  votingMs: number;
  revealMs: number;
};

export type Settings = {
  maxPlayers: number;
  impostorCount: number;
  allowSkipVote: boolean;
  majorityRule: "absolute";
  timers: Timers;
  roomPasswordHash?: string;
  autoBalanceImpostors: boolean;
};

export type Player = {
  id: PlayerId;
  nickname: string;
  isHost: boolean;
  isAlive: boolean;
  role?: Role;
  joinedAt: number;
  lastSeenAt: number;
};

export type Vote = {
  voterId: PlayerId;
  targetId: PlayerId | "skip";
  at: number;
};

export type Round = {
  roundId: string;
  phase: Phase;
  startedAt: number;
  phaseEndsAt?: number;
  votes: Vote[];
  expelledId?: PlayerId;
  wasImpostor?: boolean;
  winner?: "crew" | "impostor" | "none";
  seed: string;
};

export type Room = {
  code: RoomCode;
  createdAt: number;
  settings: Settings;
  players: Player[];
  currentRound?: Round;
};

export type ServerState = {
  room: Room;
  bans: PlayerId[];
  reconnectTokens: Record<PlayerId, string>;
};
