import { z } from "zod";

const roomCodeSchema = z.string().min(4).max(8).regex(/^[A-Z0-9]+$/);
const nicknameSchema = z
  .string()
  .min(2)
  .max(18)
  .refine((v) => v.trim().length === v.length, "No leading/trailing spaces");

export const createRoomSchema = z.object({
  type: z.literal("createRoom"),
  payload: z.object({
    roomCode: roomCodeSchema,
    password: z.string().min(3).max(32).optional(),
  }),
});

export const joinRoomSchema = z.object({
  type: z.literal("joinRoom"),
  payload: z.object({
    roomCode: roomCodeSchema,
    nickname: nicknameSchema,
    password: z.string().min(3).max(32).optional(),
    clientId: z.string().min(8),
    reconnectToken: z.string().min(8).optional(),
  }),
});

export const leaveRoomSchema = z.object({
  type: z.literal("leaveRoom"),
  payload: z.object({ clientId: z.string().min(8) }),
});

export const setNicknameSchema = z.object({
  type: z.literal("setNickname"),
  payload: z.object({ nickname: nicknameSchema }),
});

export const startRoundSchema = z.object({
  type: z.literal("startRound"),
  payload: z.object({}).optional().default({}),
});

export const castVoteSchema = z.object({
  type: z.literal("castVote"),
  payload: z.object({ targetId: z.union([z.string().min(8), z.literal("skip")]) }),
});

export const endVotingSchema = z.object({
  type: z.literal("endVoting"),
  payload: z.object({}).optional().default({}),
});

export const revealResultSchema = z.object({
  type: z.literal("revealResult"),
  payload: z.object({}).optional().default({}),
});

export const restartRoundSchema = z.object({
  type: z.literal("restartRound"),
  payload: z.object({}).optional().default({}),
});

export const kickPlayerSchema = z.object({
  type: z.literal("kickPlayer"),
  payload: z.object({ playerId: z.string().min(8) }),
});

export const heartbeatSchema = z.object({
  type: z.literal("heartbeat"),
  payload: z.object({ clientId: z.string().min(8), at: z.number() }),
});

export const clientEventSchema = z.discriminatedUnion("type", [
  createRoomSchema,
  joinRoomSchema,
  leaveRoomSchema,
  setNicknameSchema,
  startRoundSchema,
  castVoteSchema,
  endVotingSchema,
  revealResultSchema,
  restartRoundSchema,
  kickPlayerSchema,
  heartbeatSchema,
]);

export type ClientEventInput = z.infer<typeof clientEventSchema>;
