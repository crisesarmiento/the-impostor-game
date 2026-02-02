import { clientEventSchema } from "@impostor/shared";

export function parseClientEvent(raw: string) {
  const json = JSON.parse(raw);
  return clientEventSchema.parse(json);
}
