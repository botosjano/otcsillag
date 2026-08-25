import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/server/supabase";

export const runtime = "nodejs";

/** 9.2 + FR-REQ-003: ütemezett kérés visszavonása -- csak küldés ELŐTT. */
export async function POST(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const supabase = createServiceRoleClient();

  const { data: reviewRequest, error } = await supabase
    .from("review_requests")
    .select("id, status")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`cancel review-requests/${id} lookup failed: ${error.message}`);
  if (!reviewRequest) return NextResponse.json({ code: "not_found" }, { status: 404 });

  if (reviewRequest.status !== "scheduled") {
    return NextResponse.json(
      { code: "already_dispatched", message: "A kérés küldése már elindult, nem vonható vissza." },
      { status: 409 },
    );
  }

  // A feltételes UPDATE eredményét ELLENŐRIZNI kell (Elemér PR#11-review-ja).
  // A `.eq("status","scheduled")` guard megvolt, de a válasz akkor is 200 lett,
  // ha az UPDATE NULLA sort érintett -- vagyis ha a fenti olvasás óta egy futó
  // dispatch lefoglalta a sort (`dispatching`). A staff ilyenkor azt a
  // visszajelzést kapta, hogy sikeresen visszavonta, miközben az üzenet éppen
  // kiment az ügyfélhez. Ez a legrosszabb fajta hiba: hamis bizonyosság.
  const { data: cancelled, error: updateError } = await supabase
    .from("review_requests")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "scheduled")
    .select("id");
  if (updateError) throw new Error(`cancel review-requests/${id} update failed: ${updateError.message}`);

  if (!cancelled || cancelled.length === 0) {
    return NextResponse.json(
      { code: "already_dispatched", message: "A kérés küldése időközben elindult, már nem vonható vissza." },
      { status: 409 },
    );
  }

  return NextResponse.json({ id, status: "cancelled" }, { status: 200 });
}
