import type { PlayerId, Room, RoomCode, Role } from "./types";

export type ClientEvent =
  | { type: "createRoom"; payload: { roomCode: RoomCode; password?: string } }
  | {
      type: "joinRoom";
      payload: {
        roomCode: RoomCode;
        nickname: string;
        password?: string;
        clientId: PlayerId;
        reconnectToken?: string;
      };
    }
  | { type: "leaveRoom"; payload: { clientId: PlayerId } }
  | { type: "setNickname"; payload: { nickname: string } }
  | { type: "startRound"; payload: Record<string, never> }
  | { type: "castVote"; payload: { targetId: PlayerId | "skip" } }
  | { type: "endVoting"; payload: Record<string, never> }
  | { type: "revealResult"; payload: Record<string, never> }
  | { type: "restartRound"; payload: Record<string, never> }
  | { type: "kickPlayer"; payload: { playerId: PlayerId } }
  | { type: "heartbeat"; payload: { clientId: PlayerId; at: number } };

export type ServerEvent =
  | { type: "roomCreated"; payload: { roomCode: RoomCode } }
  | {
      type: "syncState";
      payload: { state: Room; youId: PlayerId; yourRole?: Role; reconnectToken?: string };
    }
  | { type: "phaseChanged"; payload: { phase: string; endsAt?: number } }
  | {
      type: "voteTally";
      payload: { counts: Record<PlayerId | "skip", number>; expelledId?: PlayerId; wasImpostor?: boolean };
    }
  | { type: "playerKicked"; payload: { playerId: PlayerId } }
  | { type: "error"; payload: { code: string; message: string } }
  | { type: "pong"; payload: { at: number } };
