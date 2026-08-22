import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/server/supabase";
import { shouldSuspendForExpiredGrace } from "@/lib/server/subscriptionStatus";

export const runtime = "nodejs";

const BATCH_SIZE = 100;

/** FR-BILL-006 masodik fele: lejart grace period -> suspended (idoalapu, nem webhook). */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("x-cron-secret") !== secret) {
    return NextResponse.json({ code: "unauthorized" }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const now = new Date();

  const { data: pastDue, error } = await supabase
    .from("subscriptions")
    .select("id, status, grace_period_ends_at")
    .eq("status", "past_due")
    .limit(BATCH_SIZE);
  if (error) throw new Error(`billing-sweep lookup failed: ${error.message}`);

  let suspended = 0;
  for (const row of pastDue ?? []) {
    if (shouldSuspendForExpiredGrace(row.status, row.grace_period_ends_at, now)) {
      await supabase
        .from("subscriptions")
        .update({ status: "suspended", updated_at: now.toISOString() })
        .eq("id", row.id);
      suspended += 1;
    }
  }

  return NextResponse.json({ suspended });
}
