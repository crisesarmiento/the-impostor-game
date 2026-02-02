import type { Player, PlayerId, Role, Round, Settings, Vote } from "@impostor/shared";
import { createSeededRng } from "./seededRng";

export type RoleMap = Record<PlayerId, Role>;

export function assignRoles(playerIds: PlayerId[], impostorCount: number, seed: string): RoleMap {
  if (impostorCount < 1) {
    throw new Error("impostorCount must be >= 1");
  }
  if (impostorCount >= playerIds.length) {
    throw new Error("impostorCount must be less than player count");
  }
  const rng = createSeededRng(seed);
  const ids = [...playerIds];
  for (let i = ids.length - 1; i > 0; i -= 1) {
    const j = rng.nextInt(i + 1);
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  const roleMap: RoleMap = {};
  ids.forEach((id, idx) => {
    roleMap[id] = idx < impostorCount ? "impostor" : "crew";
  });
  return roleMap;
}

export function buildRound(players: Player[], settings: Settings, seed: string, now: number): Round {
  const aliveIds = players.filter((p) => p.isAlive).map((p) => p.id);
  const roles = assignRoles(aliveIds, settings.impostorCount, seed);
  return {
    roundId: `${now}`,
    phase: "role",
    startedAt: now,
    phaseEndsAt: undefined,
    votes: [],
    seed,
    expelledId: undefined,
    wasImpostor: undefined,
    winner: undefined,
  };
}

export function getPhaseDurationMs(phase: Round["phase"], settings: Settings): number | undefined {
  if (phase === "discussion") return settings.timers.discussionMs;
  if (phase === "voting") return settings.timers.votingMs;
  if (phase === "reveal") return settings.timers.revealMs;
  return undefined;
}

export function setPhase(round: Round, phase: Round["phase"], settings: Settings, now: number): Round {
  const duration = getPhaseDurationMs(phase, settings);
  return {
    ...round,
    phase,
    phaseEndsAt: duration ? now + duration : undefined,
  };
}

export function tallyVotes(
  votes: Vote[],
  alivePlayerIds: PlayerId[],
  allowSkip: boolean
): Record<PlayerId | "skip", number> {
  const counts: Record<PlayerId | "skip", number> = {};
  alivePlayerIds.forEach((id) => {
    counts[id] = 0;
  });
  if (allowSkip) {
    counts.skip = 0;
  }
  for (const vote of votes) {
    if (!alivePlayerIds.includes(vote.voterId)) continue;
    if (vote.targetId === "skip") {
      if (allowSkip) counts.skip += 1;
      continue;
    }
    if (counts[vote.targetId] !== undefined) {
      counts[vote.targetId] += 1;
    }
  }
  return counts;
}

export function resolveVoting(
  votes: Vote[],
  alivePlayerIds: PlayerId[],
  settings: Settings,
  roleMap: RoleMap
): { expelledId?: PlayerId; wasImpostor?: boolean; counts: Record<PlayerId | "skip", number> } {
  const counts = tallyVotes(votes, alivePlayerIds, settings.allowSkipVote);
  const totalVotes = Object.values(counts).reduce((sum, v) => sum + v, 0);
  const majority = Math.floor(totalVotes / 2) + 1;
  let expelledId: PlayerId | undefined;
  let topCount = 0;
  let topId: PlayerId | "skip" | undefined;

  for (const [id, count] of Object.entries(counts)) {
    if (count > topCount) {
      topCount = count;
      topId = id as PlayerId | "skip";
    } else if (count === topCount) {
      topId = undefined;
    }
  }

  if (topId && topId !== "skip" && topCount >= majority) {
    expelledId = topId;
  }

  return {
    expelledId,
    wasImpostor: expelledId ? roleMap[expelledId] === "impostor" : undefined,
    counts,
  };
}

export function checkWinCondition(players: Player[]): "crew" | "impostor" | "none" {
  const alive = players.filter((p) => p.isAlive);
  const impostors = alive.filter((p) => p.role === "impostor").length;
  const crew = alive.filter((p) => p.role === "crew").length;
  if (impostors === 0) return "crew";
  if (impostors >= crew) return "impostor";
  return "none";
}
