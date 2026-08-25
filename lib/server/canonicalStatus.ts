/**
 * Kanonikus üzenet- és kérés-státusz, out-of-order callback ellen védve.
 *
 * Spec 10.2: "Out-of-order callbacknél a monotónikus állapot és az occurred_at
 * időpont dönt; az esemény minden esetben naplózódik." A nyers eseményt a
 * hívó MINDIG rögzíti (l. message_events tábla + recordMessageEvent), ez a
 * modul csak azt dönti el, hogy egy új esemény felülírhatja-e a tárolt
 * kanonikus `messages.status`-t.
 *
 * A Timeline komponens szabálya (components/app/Timeline.tsx: "időrend
 * stabil, kattintás után nincs visszaírás") ebből következik: egy régebbi
 * (alacsonyabb rangú) esemény, ami később érkezik be a hálózaton, nem
 * léptetheti vissza az állapotot.
 */
export type MessageStatus =
  | "created"
  | "queued"
  | "submitted"
  | "sent"
  | "delivered"
  | "bounced"
  | "failed"
  | "suppressed";

const MESSAGE_STATUS_RANK: Record<MessageStatus, number> = {
  created: 0,
  queued: 1,
  submitted: 2,
  sent: 3,
  delivered: 4,
  // bounced/failed/suppressed a szállítási kísérlet lezárása -- egy szinten,
  // egymást nem "előzik meg", csak az occurred_at dönt köztük.
  bounced: 5,
  failed: 5,
  suppressed: 5,
};

export type CanonicalMessageState = { status: MessageStatus; occurredAt: string };

/**
 * @returns az alkalmazandó állapot -- ha az esemény alacsonyabb rangú, mint a
 *   jelenlegi kanonikus állapot, a jelenlegit adja vissza változatlanul
 *   (elutasítva a regressziót), de a hívó ekkor is naplózza a nyers eseményt.
 */
export function nextCanonicalMessageState(
  current: CanonicalMessageState | null,
  incoming: CanonicalMessageState,
): CanonicalMessageState {
  if (!current) return incoming;
  const currentRank = MESSAGE_STATUS_RANK[current.status];
  const incomingRank = MESSAGE_STATUS_RANK[incoming.status];
  if (incomingRank > currentRank) return incoming;
  if (incomingRank < currentRank) return current;
  // Azonos rang: az occurred_at dönt, melyik a "később" történt esemény.
  return incoming.occurredAt > current.occurredAt ? incoming : current;
}

export type DisplayStatus =
  | "scheduled"
  | "submitted"
  | "delivered"
  | "clicked"
  | "failed"
  | "cancelled"
  | "suppressed";

export type RequestLifecycleStatus =
  | "draft"
  | "scheduled"
  | "active"
  | "completed"
  | "expired"
  | "cancelled"
  | "failed";

/**
 * A frontend `components/app/Timeline.tsx` / `lib/mockData.ts` által elvárt
 * megjelenítési státuszt számolja ki -- ez egy tiszta max-over-signals
 * függvény, NEM "utolsó írás nyer": a kattintás egyszer megjelenve nem
 * tűnhet el egy később feldolgozott, de korábban történt DLR-esemény miatt.
 */
export function computeDisplayStatus(input: {
  requestStatus: RequestLifecycleStatus;
  messageStatus: MessageStatus | null;
  hasClick: boolean;
}): DisplayStatus {
  if (input.requestStatus === "cancelled") return "cancelled";
  if (input.messageStatus === "suppressed") return "suppressed";
  if (input.hasClick) return "clicked";
  if (input.messageStatus === "delivered") return "delivered";
  if (input.messageStatus === "bounced" || input.messageStatus === "failed") return "failed";
  if (input.messageStatus === "queued" || input.messageStatus === "submitted" || input.messageStatus === "sent") {
    return "submitted";
  }
  return "scheduled";
}
