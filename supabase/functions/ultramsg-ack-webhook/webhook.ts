export type ParsedAck = {
  messageId: string;
  status: "delivered" | "read";
  eventAt: string;
};

export function parseUltramsgAcknowledgement(
  payload: Record<string, unknown>,
  receivedAt = new Date(),
): ParsedAck | null {
  const objects = collectObjects(payload);
  const messageId = firstValue(objects, [
    "message_id", "messageId", "msgId", "msg_id",
  ]) || firstMessageScopedId(objects);
  if (!messageId) return null;

  const rawStatus = firstValue(objects, [
    "ack", "status", "message_status", "messageStatus", "event_type", "event",
  ]).toLowerCase();
  const normalized = normalizeAckStatus(rawStatus);
  if (!normalized) return null;

  const rawTime = firstValue(objects, [
    "timestamp", "time", "event_at", "eventAt", "created_at", "createdAt",
  ]);
  return {
    messageId,
    status: normalized,
    eventAt: normalizeEventTime(rawTime, receivedAt).toISOString(),
  };
}

function collectObjects(root: Record<string, unknown>): Record<string, unknown>[] {
  const output: Record<string, unknown>[] = [];
  const queue: unknown[] = [root];
  const seen = new Set<unknown>();
  while (queue.length > 0 && output.length < 20) {
    const value = queue.shift();
    if (!value || typeof value !== "object" || seen.has(value)) continue;
    seen.add(value);
    if (Array.isArray(value)) {
      queue.push(...value.slice(0, 20));
      continue;
    }
    const object = value as Record<string, unknown>;
    output.push(object);
    for (const child of Object.values(object)) {
      if (child && typeof child === "object") queue.push(child);
      else if (typeof child === "string" && child.trim().startsWith("{")) {
        try {
          queue.push(JSON.parse(child));
        } catch {
          // Ignore provider fields that merely resemble JSON.
        }
      }
    }
  }
  return output;
}

function firstValue(
  objects: Record<string, unknown>[],
  keys: string[],
): string {
  for (const key of keys) {
    for (const object of objects) {
      const value = object[key];
      if (value !== undefined && value !== null && String(value).trim()) {
        return String(value).trim();
      }
    }
  }
  return "";
}

function firstMessageScopedId(objects: Record<string, unknown>[]): string {
  for (const object of objects) {
    const hasAcknowledgement = [
      "ack", "status", "message_status", "messageStatus",
    ].some((key) => object[key] !== undefined && object[key] !== null);
    const value = object.id;
    if (hasAcknowledgement && value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim();
    }
  }
  return "";
}

function normalizeAckStatus(value: string): "delivered" | "read" | null {
  const status = value.trim().toLowerCase();
  if (["read", "viewed", "played", "3", "4"].includes(status)) return "read";
  if (["delivered", "delivery", "received", "device", "2"].includes(status)) {
    return "delivered";
  }
  return null;
}

function normalizeEventTime(value: string, fallback: Date): Date {
  if (/^[0-9]{10,13}$/.test(value)) {
    const numeric = Number(value);
    const milliseconds = value.length === 10 ? numeric * 1000 : numeric;
    const parsed = new Date(milliseconds);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  if (value) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return fallback;
}
