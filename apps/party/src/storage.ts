import type * as PartyKit from "partykit/server";
import type { ServerState } from "@impostor/shared";

const STORAGE_KEY = "server_state";

export async function loadState(room: PartyKit.Room): Promise<ServerState | null> {
  const stored = await room.storage.get<ServerState>(STORAGE_KEY);
  return stored ?? null;
}

export async function saveState(room: PartyKit.Room, state: ServerState) {
  await room.storage.put(STORAGE_KEY, state);
}
