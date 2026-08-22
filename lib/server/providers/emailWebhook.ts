import type { MessageStatus } from "@/lib/server/canonicalStatus";

/**
 * Normalizálja a MyLINK Email delivered/bounce/open/click webhookot a
 * canonikus eseményformára -- ugyanaz a megjegyzés, mint smsWebhook.ts-nél:
 * a pontos séma élő dokumentáció nélkül nem ismert, ez az egyetlen hely,
 * amit a valós API alapján módosítani kell. Az "open"/"click" eseményeket a
 * spec 8.2 "minimal data" elve miatt itt NEM tekintjük a saját rövid-linkes
 * kattintásmérés helyettesítőjének (az a /r/{token} útvonal dolga, 9.5) --
 * csak a szállítási állapotot (delivered/bounced/failed) vezetjük tovább.
 */
export type NormalizedEmailEvent = {
  externalEventId: string;
  providerReference: string;
  status: MessageStatus;
  occurredAt: string;
};

const EVENT_STATUS_MAP: Record<string, MessageStatus> = {
  delivered: "delivered",
  bounced: "bounced",
  hard_bounce: "bounced",
  soft_bounce: "bounced",
  dropped: "failed",
  failed: "failed",
};

export function normalizeMyLinkEmailPayload(payload: unknown): NormalizedEmailEvent | null {
  if (typeof payload !== "object" || payload === null) return null;
  const p = payload as Record<string, unknown>;
  const providerReference = String(p.message_id ?? p.messageId ?? "");
  const eventId = String(p.event_id ?? p.eventId ?? p.id ?? "");
  const rawStatus = String(p.event ?? p.type ?? "").toLowerCase();
  const status = EVENT_STATUS_MAP[rawStatus];
  const occurredAt = typeof p.occurred_at === "string" ? p.occurred_at : new Date().toISOString();
  if (!providerReference || !eventId || !status) return null;
  return { externalEventId: eventId, providerReference, status, occurredAt };
}
