import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/server/supabase";
import { authenticateApiKey, hasScope } from "@/lib/server/apiKey";
import { beginIdempotentRequest } from "@/lib/server/idempotency";
import { createReviewRequest, dispatchScheduledMessage } from "@/lib/server/dispatch";
import { buildDispatchDeps } from "@/lib/server/dispatchDeps";

export const runtime = "nodejs";

type EventBody = {
  location_id: string;
  contact: { first_name: string; phone?: string; email?: string };
  channel: "sms" | "email";
  source?: string;
  external_id?: string;
  send_at?: string;
};

function json(status: number, body: unknown) {
  return NextResponse.json(body, { status });
}

/**
 * FR-WH-001 -- 9.2 `POST /webhooks/events`: generikus üzleti esemény, külső
 * rendszer (pl. Make.com/CRM) Bearer API-kulccsal hitelesítve. FR-WH-002:
 * kötelező `Idempotency-Key` fejléc, 24 órás válasz-visszajátszással.
 *
 * NYITOTT FELTEVÉS (nincs a specben pontosan leírva, l. PR-leírás): a
 * generikus esemény ma egyet-az-egyben a review-request létrehozás
 * payload-ját veszi át (`createReviewRequest`) -- ez az egyetlen üzleti
 * esemény, amit a rendszer ma végponttól végpontig ismer. Ha később több
 * eseménytípus kell (pl. `event_type` mezővel elágazó feldolgozás), ez a
 * route bővül, a hitelesítés+idempotencia réteg változatlan marad.
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const presented = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
  if (!presented) {
    return json(401, { code: "unauthorized", message: "Authorization: Bearer <api-kulcs> szükséges." });
  }

  const supabase = createServiceRoleClient();
  const auth = await authenticateApiKey(supabase, presented);
  if (!auth) {
    return json(401, { code: "unauthorized", message: "Érvénytelen vagy visszavont API-kulcs." });
  }
  if (!hasScope(auth, "requests:write")) {
    return json(403, { code: "forbidden", message: "A kulcshoz nincs requests:write scope rendelve." });
  }

  const idempotencyKey = request.headers.get("idempotency-key");
  if (!idempotencyKey) {
    return json(400, { code: "missing_idempotency_key", message: "Idempotency-Key fejléc kötelező (FR-WH-002)." });
  }

  const idempotency = await beginIdempotentRequest(supabase, auth.organizationId, idempotencyKey);
  if (idempotency.kind === "replay") {
    return json(idempotency.status, idempotency.body);
  }
  if (idempotency.kind === "conflict") {
    return json(409, { code: "conflict", message: "Ugyanezzel az Idempotency-Key-jel egy hívás már feldolgozás alatt." });
  }

  let body: EventBody;
  try {
    body = await request.json();
  } catch {
    const result = json(400, { code: "invalid_body", message: "Érvénytelen JSON." });
    await idempotency.commit(400, { code: "invalid_body", message: "Érvénytelen JSON." });
    return result;
  }

  if (!body.location_id || !body.contact || !body.channel) {
    const payload = { code: "invalid_body", message: "location_id, contact és channel kötelező." };
    await idempotency.commit(400, payload);
    return json(400, payload);
  }

  // Tenant-izoláció (11.1): a location a HITELESÍTETT kulcs szervezetéhez
  // kell tartozzon -- egy API-kulcs SOHA nem hozhat létre kérést más tenant
  // telephelyére, még akkor sem, ha kitalálja/megszerzi az UUID-t.
  const { data: location, error: locationError } = await supabase
    .from("locations")
    .select("id")
    .eq("id", body.location_id)
    .eq("organization_id", auth.organizationId)
    .maybeSingle();
  if (locationError) throw new Error(`POST /api/webhooks/events location lookup failed: ${locationError.message}`);
  if (!location) {
    const payload = { code: "invalid_body", message: "location_id nem található ehhez a szervezethez." };
    await idempotency.commit(422, payload);
    return json(422, payload);
  }

  const result = await createReviewRequest(supabase, {
    organizationId: auth.organizationId,
    locationId: body.location_id,
    contact: { firstName: body.contact.first_name, phone: body.contact.phone, email: body.contact.email },
    channel: body.channel,
    source: body.source ?? "webhook",
    externalId: body.external_id,
    sendAt: body.send_at,
  });

  if (result.kind === "invalid_contact") {
    const payload = { code: "invalid_contact", message: "A kontaktnak legalább egy érvényes telefonszám vagy email kell." };
    await idempotency.commit(422, payload);
    return json(422, payload);
  }
  if (result.kind === "cooldown") {
    const payload = { code: "cooldown", message: "Ez a kontakt/telephely kombináció cooldown alatt van.", retry_after: result.retryAfter };
    await idempotency.commit(409, payload);
    return json(409, payload);
  }

  const scheduledAtReached = new Date(result.scheduledAt) <= new Date();
  if (result.kind === "created" && scheduledAtReached) {
    await dispatchScheduledMessage(supabase, result.id, body.channel, buildDispatchDeps());
  }

  const payload = { id: result.id, status: result.status, scheduled_at: result.scheduledAt };
  await idempotency.commit(202, payload);
  return json(202, payload);
}
