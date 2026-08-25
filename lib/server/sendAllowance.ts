import type { SupabaseClient } from "@supabase/supabase-js";
import { canSendWithinOrOverLimit, type PlanLimits, type UsageTotals } from "@/lib/server/usageLedger";

/**
 * A 3.3 küldés-előtti kapu TÉNYLEGES bekötése (Elemér PR#12-review-jának
 * blokkoló találata).
 *
 * A `canSendWithinOrOverLimit` maga helyes és jól tesztelt volt, de SEHOL nem
 * hívta alkalmazáskód -- csak a saját tesztje. Vagyis a kártya saját nevű
 * funkciója a valóságban nem védett semmit: egy limitjét túllépő, érvényes
 * fizetési mód nélküli szervezet üzenetei változatlanul kimentek.
 *
 * Ez a modul a hiányzó darab: összeszedi a döntéshez kellő állapotot (csomag,
 * időszaki fogyasztás, előfizetés-státusz), és egy eldöntött választ ad.
 * A tiszta számoló-logika marad a `usageLedger.ts`-ben.
 */

export type SendUnit = "sms_segment" | "email";

export type SendAllowance =
  | { allowed: true }
  | { allowed: false; reason: "no_subscription" | "subscription_inactive" | "limit_reached"; detail: string };

/**
 * Az "érvényes fizetési mód" nincs külön oszlopban a `subscriptions`-ben, de a
 * státusz ezt hordozza: `active` = a szolgáltató sikeresen terhelt. A
 * `trialing` szándékosan NEM számít érvényes fizetési módnak -- próbaidőszakban
 * a limit fölé menni pont az a költség, ami ellen a 3.3 véd.
 */
function hasValidPaymentMethod(status: string): boolean {
  return status === "active";
}

export async function checkSendAllowance(
  supabase: SupabaseClient,
  organizationId: string,
  unit: SendUnit,
): Promise<SendAllowance> {
  const { data: subscription, error: subError } = await supabase
    .from("subscriptions")
    .select("status, current_period_start, current_period_end, plans(sms_segment_limit, email_limit, overage_sms_huf)")
    .eq("organization_id", organizationId)
    .neq("status", "cancelled")
    .maybeSingle();
  if (subError) throw new Error(`checkSendAllowance subscription lookup failed: ${subError.message}`);

  // Nincs előfizetés -> nem küldünk. Fail-closed: inkább ne menjen ki üzenet,
  // mint hogy számlázhatatlan forgalmat termeljünk.
  if (!subscription) {
    return { allowed: false, reason: "no_subscription", detail: "A szervezetnek nincs aktív előfizetése." };
  }
  if (subscription.status === "suspended") {
    return { allowed: false, reason: "subscription_inactive", detail: `Az előfizetés állapota: ${subscription.status}.` };
  }

  const plan = subscription.plans as unknown as {
    sms_segment_limit: number;
    email_limit: number;
    overage_sms_huf: number | null;
  };
  const limits: PlanLimits = {
    smsSegmentLimit: plan.sms_segment_limit,
    emailLimit: plan.email_limit,
    overageSmsHuf: plan.overage_sms_huf,
  };

  const { data: ledger, error: ledgerError } = await supabase
    .from("usage_ledger")
    .select("unit, quantity")
    .eq("organization_id", organizationId)
    .gte("occurred_at", subscription.current_period_start)
    .lt("occurred_at", subscription.current_period_end);
  if (ledgerError) throw new Error(`checkSendAllowance ledger lookup failed: ${ledgerError.message}`);

  const usage: UsageTotals = { smsSegments: 0, emails: 0 };
  for (const row of (ledger ?? []) as Array<{ unit: string; quantity: number }>) {
    if (row.unit === "sms_segment") usage.smsSegments += row.quantity;
    else if (row.unit === "email") usage.emails += row.quantity;
  }

  if (!canSendWithinOrOverLimit(limits, usage, unit, hasValidPaymentMethod(subscription.status))) {
    const used = unit === "sms_segment" ? usage.smsSegments : usage.emails;
    const limit = unit === "sms_segment" ? limits.smsSegmentLimit : limits.emailLimit;
    return {
      allowed: false,
      reason: "limit_reached",
      detail: `Elérte a csomag keretét (${used}/${limit} ${unit}), és a túlfogyasztás nem engedélyezett.`,
    };
  }

  return { allowed: true };
}
