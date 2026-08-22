import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/server/supabase";
import { createReviewRequest, dispatchScheduledMessage } from "@/lib/server/dispatch";
import { buildDispatchDeps } from "@/lib/server/dispatchDeps";
import { requireDefaultOrganizationId } from "@/lib/server/env";

export const runtime = "nodejs";

type CreateBody = {
  location_id: string;
  contact: { first_name: string; phone?: string; email?: string };
  channel: "sms" | "email";
  source?: string;
  external_id?: string;
  send_at?: string;
};

/** 9.2 + 9.3: POST /review-requests -- kérés létrehozása és ütemezése. */
export async function POST(request: NextRequest) {
  let body: CreateBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: "invalid_body", message: "Érvénytelen JSON." }, { status: 400 });
  }

  if (!body.location_id || !body.contact || !body.channel) {
    return NextResponse.json(
      { code: "invalid_body", message: "location_id, contact és channel kötelező." },
      { status: 400 },
    );
  }

  const supabase = createServiceRoleClient();
  const organizationId = requireDefaultOrganizationId();
  const idempotencyKey = request.headers.get("idempotency-key") ?? undefined;

  const result = await createReviewRequest(supabase, {
    organizationId,
    locationId: body.location_id,
    contact: { firstName: body.contact.first_name, phone: body.contact.phone, email: body.contact.email },
    channel: body.channel,
    source: body.source ?? "manual",
    externalId: body.external_id,
    idempotencyKey,
    sendAt: body.send_at,
  });

  if (result.kind === "invalid_contact") {
    return NextResponse.json(
      { code: "invalid_contact", message: "A kontaktnak legalább egy érvényes telefonszám vagy email kell." },
      { status: 422 },
    );
  }
  if (result.kind === "cooldown") {
    return NextResponse.json(
      { code: "cooldown", message: "Ez a kontakt/telephely kombináció cooldown alatt van.", retry_after: result.retryAfter },
      { status: 409 },
    );
  }

  // 4.2: kézi gyorsindításnál a gomb megnyomása után a rendszer AZONNAL
  // visszaadja az ütemezett státuszt -- ha a send_at már elérkezett (vagy
  // nincs megadva), a küldés itt, szinkronban indul (a válasz így sem várja
  // meg feltétlenül a provider választ hosszabb ideig, mint egy tesztüzenet
  // esetén elvárható).
  const scheduledAtReached = new Date(result.scheduledAt) <= new Date();
  if (result.kind === "created" && scheduledAtReached) {
    await dispatchScheduledMessage(supabase, result.id, body.channel, buildDispatchDeps());
  }

  return NextResponse.json(
    { id: result.id, status: result.status, scheduled_at: result.scheduledAt },
    { status: 202 },
  );
}
