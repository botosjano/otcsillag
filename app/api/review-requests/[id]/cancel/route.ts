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

  const { error: updateError } = await supabase
    .from("review_requests")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "scheduled");
  if (updateError) throw new Error(`cancel review-requests/${id} update failed: ${updateError.message}`);

  return NextResponse.json({ id, status: "cancelled" }, { status: 200 });
}
