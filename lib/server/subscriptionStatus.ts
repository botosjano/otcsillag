/**
 * FR-BILL-001/006: előfizetés-státuszgép. Tiszta függvények -- a hívó
 * (webhook route / cron) dönt a tényleges DB-írásról.
 */
export type SubscriptionStatus = "trialing" | "active" | "past_due" | "suspended" | "cancelled";

export type BillingEvent =
  | { type: "payment_succeeded" }
  | { type: "payment_failed" }
  | { type: "subscription_cancelled" }
  | { type: "trial_ended_with_payment_method" };

const DEFAULT_GRACE_PERIOD_DAYS = 7;

export type SubscriptionTransition = {
  status: SubscriptionStatus;
  /** null = ne módosítsd a mezőt, "clear" = írd nullra. */
  gracePeriodEndsAt: string | null | "clear";
};

/**
 * FR-BILL-006: "Fizetési hiba esetén grace period, majd küldésfelfüggesztés."
 * A grace period pontos hosszát a spec nem adja meg számszerűen -- 7 nap
 * ésszerű, iparági szokásos alapérték (l. README "Nyitott döntések", ha
 * Janos mást szeretne, könnyen paraméterezhető).
 */
export function nextSubscriptionStatus(
  current: SubscriptionStatus,
  event: BillingEvent,
  now: Date,
  gracePeriodDays: number = DEFAULT_GRACE_PERIOD_DAYS,
): SubscriptionTransition {
  switch (event.type) {
    case "payment_succeeded":
      // Sikeres fizetés MINDIG visszaállítja aktívra -- akár trial végén, akár
      // egy korábbi past_due állapotból tér vissza.
      return { status: "active", gracePeriodEndsAt: "clear" };
    case "payment_failed":
      if (current === "cancelled" || current === "suspended") {
        // Egy lemondott/felfüggesztett előfizetésen a fizetési hiba nem
        // állapotváltás -- nincs mit "tovább rontani".
        return { status: current, gracePeriodEndsAt: null };
      }
      return {
        status: "past_due",
        gracePeriodEndsAt: new Date(now.getTime() + gracePeriodDays * 86_400_000).toISOString(),
      };
    case "subscription_cancelled":
      return { status: "cancelled", gracePeriodEndsAt: "clear" };
    case "trial_ended_with_payment_method":
      return { status: "active", gracePeriodEndsAt: "clear" };
  }
}

/**
 * Cron/sweep döntés: a grace period lejárta után a küldés felfüggesztése
 * (FR-BILL-006 második fele). Ez IDŐ alapú, nem webhook-esemény -- külön
 * függvény, mert nincs hozzá bejövő "event", csak "most" és a jelenlegi
 * állapot.
 */
export function shouldSuspendForExpiredGrace(
  status: SubscriptionStatus,
  gracePeriodEndsAt: string | null,
  now: Date,
): boolean {
  if (status !== "past_due" || !gracePeriodEndsAt) return false;
  return new Date(gracePeriodEndsAt) <= now;
}
