/**
 * FR-BILL-005: "Usage ledgerből havi túlfogyasztás számítása." Tiszta
 * függvény -- a hívó összegzi a usage_ledger sorokat egységenként, ez csak
 * a limit-összevetést és a díjszámítást végzi.
 */
export type PlanLimits = {
  smsSegmentLimit: number;
  emailLimit: number;
  /** null = a csomagnál egyáltalán nincs engedélyezett túlfogyasztás. */
  overageSmsHuf: number | null;
};

export type UsageTotals = {
  smsSegments: number;
  emails: number;
};

export type OverageResult = {
  smsOverageSegments: number;
  smsOverageHuf: number;
  emailOverageCount: number;
  /** true, ha lenne túlfogyasztás, de a csomag nem engedi (fizetés/kredit hiány -- l. 3.3). */
  blockedByPlan: boolean;
};

export function computeOverage(limits: PlanLimits, usage: UsageTotals): OverageResult {
  const smsOverageSegments = Math.max(0, usage.smsSegments - limits.smsSegmentLimit);
  const emailOverageCount = Math.max(0, usage.emails - limits.emailLimit);
  const hasOverage = smsOverageSegments > 0 || emailOverageCount > 0;

  if (hasOverage && limits.overageSmsHuf === null) {
    return { smsOverageSegments, smsOverageHuf: 0, emailOverageCount, blockedByPlan: true };
  }

  return {
    smsOverageSegments,
    smsOverageHuf: smsOverageSegments * (limits.overageSmsHuf ?? 0),
    emailOverageCount,
    blockedByPlan: false,
  };
}

/**
 * 3.3: "Túlfogyasztás csak érvényes fizetési móddal vagy előre vásárolt
 * kredittel engedélyezett." Küldés előtti kapu -- ha a szervezet már a
 * limitnél tart és a csomag nem engedi/nincs érvényes fizetési mód, a
 * dispatch-nek le kell állnia (nem csak utólag számlázni).
 */
export function canSendWithinOrOverLimit(
  limits: PlanLimits,
  usage: UsageTotals,
  unit: "sms_segment" | "email",
  hasValidPaymentMethod: boolean,
): boolean {
  const currentCount = unit === "sms_segment" ? usage.smsSegments : usage.emails;
  const limit = unit === "sms_segment" ? limits.smsSegmentLimit : limits.emailLimit;
  if (currentCount < limit) return true;
  if (unit === "sms_segment" && limits.overageSmsHuf === null) return false;
  return hasValidPaymentMethod;
}
