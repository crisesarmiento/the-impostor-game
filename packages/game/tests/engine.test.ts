import { describe, expect, it } from "vitest";
import { assignRoles, checkWinCondition, resolveVoting, tallyVotes } from "../src/engine";
import type { Player, Settings, Vote } from "@impostor/shared";

const settings: Settings = {
  maxPlayers: 20,
  impostorCount: 1,
  allowSkipVote: true,
  majorityRule: "absolute",
  timers: { discussionMs: 120000, votingMs: 45000, revealMs: 20000 },
  autoBalanceImpostors: false,
};

describe("assignRoles", () => {
  it("assigns deterministic roles with seed", () => {
    const ids = ["a", "b", "c", "d", "e"];
    const r1 = assignRoles(ids, 1, "seed-1");
    const r2 = assignRoles(ids, 1, "seed-1");
    expect(r1).toEqual(r2);
  });
});

describe("tallyVotes", () => {
  it("counts votes and skip", () => {
    const votes: Vote[] = [
      { voterId: "a", targetId: "b", at: 1 },
      { voterId: "c", targetId: "skip", at: 2 },
    ];
    const counts = tallyVotes(votes, ["a", "b", "c"], true);
    expect(counts.b).toBe(1);
    expect(counts.skip).toBe(1);
  });
});

describe("resolveVoting", () => {
  it("expels only with absolute majority", () => {
    const votes: Vote[] = [
      { voterId: "a", targetId: "b", at: 1 },
      { voterId: "c", targetId: "b", at: 2 },
      { voterId: "d", targetId: "skip", at: 3 },
    ];
    const roleMap = { a: "crew", b: "impostor", c: "crew", d: "crew" } as const;
    const res = resolveVoting(votes, ["a", "b", "c", "d"], settings, roleMap);
    expect(res.expelledId).toBe("b");
    expect(res.wasImpostor).toBe(true);
  });
});

describe("checkWinCondition", () => {
  it("returns crew if no impostors alive", () => {
    const players: Player[] = [
      { id: "a", nickname: "A", isHost: true, isAlive: true, role: "crew", joinedAt: 1, lastSeenAt: 1 },
    ];
    expect(checkWinCondition(players)).toBe("crew");
  });
});
