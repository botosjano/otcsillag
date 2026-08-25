import type { MessageStatus } from "@/lib/server/canonicalStatus";

/**
 * Normalizálja a LINK/SeeMe DLR/MO callback payloadot a rendszer canonikus
 * eseményformájára. Spec 8.5: "A domainlogika nem függhet közvetlenül
 * LINK-specifikus mezőnevektől... a rendszer canonical eseményeket
 * használjon." A pontos mezőnevek a tényleges SeeMe SMS Gateway
 * dokumentációból jönnének (18.4/18.5, még nincs élő hozzáférés) -- ez a
 * függvény az EGYETLEN hely, amit a valós séma ismeretében módosítani kell.
 */
export type NormalizedSmsEvent = {
  externalEventId: string;
  providerReference: string;
  status: MessageStatus;
  occurredAt: string;
};

const DLR_STATUS_MAP: Record<string, MessageStatus> = {
  DELIVERED: "delivered",
  DELIVRD: "delivered",
  UNDELIVERABLE: "bounced",
  UNDELIV: "bounced",
  REJECTED: "failed",
  EXPIRED: "failed",
};

export function normalizeSeeMeDlrPayload(payload: unknown): NormalizedSmsEvent | null {
  if (typeof payload !== "object" || payload === null) return null;
  const p = payload as Record<string, unknown>;
  const providerReference = String(p.message_id ?? p.messageId ?? "");
  const eventId = String(p.event_id ?? p.eventId ?? p.id ?? "");
  const rawStatus = String(p.status ?? p.dlr_status ?? "").toUpperCase();
  const status = DLR_STATUS_MAP[rawStatus];
  const occurredAt = typeof p.occurred_at === "string" ? p.occurred_at : new Date().toISOString();
  if (!providerReference || !eventId || !status) return null;
  return { externalEventId: eventId, providerReference, status, occurredAt };
}
