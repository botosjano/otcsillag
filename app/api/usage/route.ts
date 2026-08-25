import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/server/supabase";
import { requireDefaultOrganizationId } from "@/lib/server/env";
import { computeOverage } from "@/lib/server/usageLedger";

export const runtime = "nodejs";

/** 9.2: GET /usage -- aktuális időszak felhasználása + túlfogyasztás (FR-BILL-005/FR-DASH-004). */
export async function GET() {
  const supabase = createServiceRoleClient();
  const organizationId = requireDefaultOrganizationId();

  const { data: subscription, error: subError } = await supabase
    .from("subscriptions")
    .select("current_period_start, current_period_end, plans(sms_segment_limit, email_limit, overage_sms_huf)")
    .eq("organization_id", organizationId)
    .neq("status", "cancelled")
    .maybeSingle();
  if (subError) throw new Error(`GET /usage subscription lookup failed: ${subError.message}`);
  if (!subscription) return NextResponse.json({ code: "no_subscription" }, { status: 404 });

  const plan = subscription.plans as unknown as {
    sms_segment_limit: number;
    email_limit: number;
    overage_sms_huf: number | null;
  };

  const { data: ledgerRows, error: ledgerError } = await supabase
    .from("usage_ledger")
    .select("unit, quantity")
    .eq("organization_id", organizationId)
    .gte("occurred_at", subscription.current_period_start)
    .lt("occurred_at", subscription.current_period_end);
  if (ledgerError) throw new Error(`GET /usage ledger lookup failed: ${ledgerError.message}`);

  const totals = (ledgerRows ?? []).reduce(
    (acc, row) => {
      if (row.unit === "sms_segment") acc.smsSegments += row.quantity;
      else if (row.unit === "email") acc.emails += row.quantity;
      return acc;
    },
    { smsSegments: 0, emails: 0 },
  );

  const overage = computeOverage(
    { smsSegmentLimit: plan.sms_segment_limit, emailLimit: plan.email_limit, overageSmsHuf: plan.overage_sms_huf },
    totals,
  );

  return NextResponse.json({
    period_start: subscription.current_period_start,
    period_end: subscription.current_period_end,
    usage: totals,
    limits: { sms_segment_limit: plan.sms_segment_limit, email_limit: plan.email_limit },
    overage,
  });
}
