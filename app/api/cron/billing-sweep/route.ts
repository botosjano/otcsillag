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
  let raced = 0;
  for (const row of pastDue ?? []) {
    if (shouldSuspendForExpiredGrace(row.status, row.grace_period_ends_at, now)) {
      // FELTÉTELES UPDATE (Elemér PR#12-review-jának másodlagos találata):
      // a fenti SELECT és ez az írás között a Stripe-webhook `active`-ra
      // válthatta a státuszt -- egy ÉPPEN FIZETŐ ügyfelet függesztenénk fel.
      // Az ablak szűk, de a minta ugyanaz, mint a dispatch-claimnél: az írás
      // csak abból az állapotból léphet tovább, amit olvastunk.
      const { data: updated, error: updateError } = await supabase
        .from("subscriptions")
        .update({ status: "suspended", updated_at: now.toISOString() })
        .eq("id", row.id)
        .eq("status", "past_due")
        .select("id");
      if (updateError) throw new Error(`billing-sweep suspend failed: ${updateError.message}`);
      if (updated && updated.length > 0) suspended += 1;
      else raced += 1;
    }
  }
  if (raced > 0) {
    // Nem hiba, de tudni akarunk róla: ennyi előfizetés státusza változott meg
    // a sweep alatt (jellemzően sikeres fizetés futott be közben).
    console.info("[cron/billing-sweep] a felfüggesztés kimaradt, mert a státusz közben megváltozott", { raced });
  }

  return NextResponse.json({ suspended });
}
