import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/server/supabase";
import { computeDisplayStatus, type MessageStatus } from "@/lib/server/canonicalStatus";
import { hasClick } from "@/lib/server/shortlink";

export const runtime = "nodejs";

/** 9.2: GET /review-requests/{id} -- státusz és idővonal (FR-REQ-004). */
export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const supabase = createServiceRoleClient();

  const { data: reviewRequest, error } = await supabase
    .from("review_requests")
    .select("id, status, scheduled_at, contacts(first_name)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`GET review-requests/${id} lookup failed: ${error.message}`);
  if (!reviewRequest) return NextResponse.json({ code: "not_found" }, { status: 404 });

  const { data: message } = await supabase
    .from("messages")
    .select("id, channel, status, updated_at")
    .eq("request_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: shortLink } = await supabase.from("short_links").select("id").eq("request_id", id).maybeSingle();
  const clicked = shortLink ? await hasClick(supabase, shortLink.id) : false;

  const { data: events } = message
    ? await supabase
        .from("message_events")
        .select("type, occurred_at")
        .eq("message_id", message.id)
        .order("occurred_at", { ascending: true })
    : { data: [] };

  const displayStatus = computeDisplayStatus({
    requestStatus: reviewRequest.status,
    messageStatus: (message?.status as MessageStatus) ?? null,
    hasClick: clicked,
  });

  return NextResponse.json({
    id: reviewRequest.id,
    status: displayStatus,
    scheduled_at: reviewRequest.scheduled_at,
    channel: message?.channel ?? null,
    timeline: (events ?? []).map((e) => ({ status: e.type, occurred_at: e.occurred_at })),
  });
}
