import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeEmail, normalizePhone } from "@/lib/server/normalize";
import { isSuppressed } from "@/lib/server/suppression";
import { createShortLink } from "@/lib/server/shortlink";
import { renderSmsBody, applyVars } from "@/lib/server/template";
import type { SmsProvider } from "@/lib/server/providers/sms";
import type { EmailProvider } from "@/lib/server/providers/email";

/** FR-REQ-002: azonos kontakt/telephely kombinációra cooldown (órában). */
const DEFAULT_COOLDOWN_HOURS = 72;

export type Channel = "sms" | "email";

export type CreateReviewRequestInput = {
  organizationId: string;
  locationId: string;
  contact: { firstName: string; phone?: string; email?: string };
  channel: Channel;
  source: string;
  externalId?: string;
  /** 9.1: az Idempotency-Key HTTP header értéke -- a duplikáció-védelem
   *  kulcsa, NEM azonos az externalId-vel (l. 9.3 példa). */
  idempotencyKey?: string;
  sendAt?: string;
};

export type CreateReviewRequestResult =
  | { kind: "created" | "idempotent_replay"; id: string; status: string; scheduledAt: string }
  | { kind: "cooldown"; retryAfter: string }
  | { kind: "invalid_contact" };

/** 9.3 request.schedule job: létrehozza a review_request sort, a tényleges
 *  küldés (message.dispatch) a scheduled_at elérésekor, külön hívással
 *  történik -- l. dispatchScheduledMessage. */
export async function createReviewRequest(
  supabase: SupabaseClient,
  input: CreateReviewRequestInput,
): Promise<CreateReviewRequestResult> {
  const phone = input.contact.phone ? normalizePhone(input.contact.phone) : null;
  const email = input.contact.email ? normalizeEmail(input.contact.email) : null;
  if (!phone && !email) return { kind: "invalid_contact" };

  const { data: contact, error: contactError } = await supabase
    .from("contacts")
    .upsert(
      { organization_id: input.organizationId, first_name: input.contact.firstName, phone_e164: phone, email_normalized: email },
      { onConflict: phone ? "organization_id,phone_e164" : "organization_id,email_normalized", ignoreDuplicates: false },
    )
    .select("id")
    .single();
  if (contactError) throw new Error(`createReviewRequest contact upsert failed: ${contactError.message}`);

  // FR-REQ-002 cooldown: legutóbbi, nem visszavont/sikertelen kérés ugyanarra
  // a kontakt+telephely kombinációra.
  const cooldownSince = new Date(Date.now() - DEFAULT_COOLDOWN_HOURS * 3600_000).toISOString();
  const { data: recent, error: recentError } = await supabase
    .from("review_requests")
    .select("id, created_at")
    .eq("contact_id", contact.id)
    .eq("location_id", input.locationId)
    .not("status", "in", "(cancelled,failed)")
    .gte("created_at", cooldownSince)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (recentError) throw new Error(`createReviewRequest cooldown check failed: ${recentError.message}`);
  if (recent) {
    const retryAfter = new Date(new Date(recent.created_at).getTime() + DEFAULT_COOLDOWN_HOURS * 3600_000).toISOString();
    return { kind: "cooldown", retryAfter };
  }

  const scheduledAt = input.sendAt ?? new Date().toISOString();
  const insertResult = await supabase
    .from("review_requests")
    .insert({
      organization_id: input.organizationId,
      location_id: input.locationId,
      contact_id: contact.id,
      source: input.source,
      external_id: input.externalId ?? null,
      idempotency_key: input.idempotencyKey ?? null,
      status: "scheduled",
      scheduled_at: scheduledAt,
    })
    .select("id, status, scheduled_at")
    .single();

  if (insertResult.error) {
    // 23505 = ugyanaz az Idempotency-Key már létezik erre a szervezetre --
    // ugyanazt a kulcsot kétszer küldve csak egy request jön létre (spec
    // "Webhook teszt" elfogadási kritérium).
    if ((insertResult.error as { code?: string }).code === "23505" && input.idempotencyKey) {
      const { data: existing, error: existingError } = await supabase
        .from("review_requests")
        .select("id, status, scheduled_at")
        .eq("organization_id", input.organizationId)
        .eq("idempotency_key", input.idempotencyKey)
        .single();
      if (existingError) throw new Error(`createReviewRequest idempotent lookup failed: ${existingError.message}`);
      return { kind: "idempotent_replay", id: existing.id, status: existing.status, scheduledAt: existing.scheduled_at };
    }
    throw new Error(`createReviewRequest insert failed: ${insertResult.error.message}`);
  }

  const request = insertResult.data;
  return { kind: "created", id: request.id, status: request.status, scheduledAt: request.scheduled_at };
}

export type DispatchMessageDeps = {
  smsProvider: SmsProvider;
  emailProvider: EmailProvider;
  businessName: string;
  fromEmail: string;
  replyToEmail: string;
  smsTemplate: string;
  emailTemplate: { subject: string; html: string; text: string };
};

/** message.dispatch job (10.1): scheduled_at elérésekor limit/suppression
 *  ellenőrzés, provider submit. */
export async function dispatchScheduledMessage(
  supabase: SupabaseClient,
  requestId: string,
  channel: Channel,
  deps: DispatchMessageDeps,
): Promise<{ status: "submitted" | "suppressed" | "failed"; messageId: string }> {
  const { data: request, error: requestError } = await supabase
    .from("review_requests")
    .select("id, organization_id, location_id, contact_id, contacts(phone_e164, email_normalized, first_name), locations(review_url)")
    .eq("id", requestId)
    .single();
  if (requestError) throw new Error(`dispatchScheduledMessage lookup failed: ${requestError.message}`);

  const contact = request.contacts as unknown as { phone_e164: string | null; email_normalized: string | null; first_name: string };
  const location = request.locations as unknown as { review_url: string };
  const destination = channel === "sms" ? contact.phone_e164 : contact.email_normalized;
  if (!destination) throw new Error(`dispatchScheduledMessage: contact has no ${channel} destination`);

  const suppressed = await isSuppressed(supabase, request.organization_id, channel, destination);

  const { data: message, error: messageInsertError } = await supabase
    .from("messages")
    .insert({
      request_id: requestId,
      channel,
      provider: channel === "sms" ? "link-seeme" : "mylink-email",
      status: suppressed ? "suppressed" : "created",
      attempt_type: "initial",
    })
    .select("id")
    .single();
  if (messageInsertError) throw new Error(`dispatchScheduledMessage message insert failed: ${messageInsertError.message}`);

  if (suppressed) {
    await supabase.from("review_requests").update({ status: "failed", updated_at: new Date().toISOString() }).eq("id", requestId);
    return { status: "suppressed", messageId: message.id };
  }

  // A short_links tábla csak a token HASH-ét tárolja (FR-LINK-001) -- ezért a
  // nyers tokent csak most, a tényleges küldés pillanatában generáljuk (ekkor
  // van rá szükség, előbb nem), így soha nem kell titkosított/visszafejthető
  // tárolást megoldani egy köztes állapothoz.
  const { token } = await createShortLink(supabase, requestId, location.review_url);
  const linkBaseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.otcsillag.hu";
  const idempotencyKey = `${message.id}-initial`;

  const link = `${linkBaseUrl}/r/${token}`;
  const vars = { "customer.first_name": contact.first_name, "review.link": link, name: contact.first_name };

  const result =
    channel === "sms"
      ? await deps.smsProvider.send({ to: destination, body: renderSmsBody(deps.businessName, deps.smsTemplate, vars), idempotencyKey })
      : await deps.emailProvider.send({
          to: destination,
          from: deps.fromEmail,
          replyTo: deps.replyToEmail,
          subject: applyVars(deps.emailTemplate.subject, vars),
          html: applyVars(deps.emailTemplate.html, vars),
          text: applyVars(deps.emailTemplate.text, vars),
          idempotencyKey,
        });

  const nowIso = new Date().toISOString();
  await supabase
    .from("messages")
    .update({
      status: result.ok ? "submitted" : "failed",
      provider_reference: result.ok ? result.providerReference : null,
      error_message: result.ok ? null : result.errorMessage,
      updated_at: nowIso,
    })
    .eq("id", message.id);
  await supabase.from("message_events").insert({
    message_id: message.id,
    type: result.ok ? "submitted" : "failed",
    occurred_at: nowIso,
    payload_hash: await sha256Hex(`${message.id}:${nowIso}:${result.ok}`),
    raw_payload: { providerReference: result.providerReference, errorMessage: result.errorMessage },
  });
  await supabase
    .from("review_requests")
    .update({ status: result.ok ? "active" : "failed", updated_at: nowIso })
    .eq("id", requestId);

  return { status: result.ok ? "submitted" : "failed", messageId: message.id };
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
