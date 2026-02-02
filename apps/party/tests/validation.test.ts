import { describe, expect, it } from "vitest";
import { parseClientEvent } from "../src/validation";

describe("parseClientEvent", () => {
  it("accepts castVote only with valid payload", () => {
    const raw = JSON.stringify({ type: "castVote", payload: { targetId: "player-1234" } });
    const event = parseClientEvent(raw);
    expect(event.type).toBe("castVote");
  });
});
