import type { SupabaseClient } from "@supabase/supabase-js";
import { verifyHmacSignatureHex } from "@/lib/server/signature";
import { isNewWebhookEvent } from "@/lib/server/webhookIdempotency";
import { processProviderCallbackEvent } from "@/lib/server/messageEvents";
import type { MessageStatus } from "@/lib/server/canonicalStatus";

export type NormalizedCallbackEvent = {
  externalEventId: string;
  providerReference: string;
  status: MessageStatus;
  occurredAt: string;
};

export type WebhookHandlerResult =
  | { outcome: "invalid_signature" }
  | { outcome: "unparseable" }
  | { outcome: "unknown_message" }
  | { outcome: "duplicate" }
  | { outcome: "processed"; canonicalStatusChanged: boolean };

/**
 * Közös feldolgozó a LINK/SeeMe SMS és a MyLINK Email webhook route-oknak:
 * aláírás-ellenőrzés -> teljes-hívás idempotencia (webhook_events) ->
 * message_id feloldás provider_reference alapján -> kanonikus státusz
 * frissítés (out-of-order védve, l. canonicalStatus.ts).
 */
export async function handleProviderCallback(
  supabase: SupabaseClient,
  params: {
    integration: "link-seeme-sms" | "mylink-email";
    secret: string;
    rawBody: string;
    signatureHeader: string | null;
    normalize: (payload: unknown) => NormalizedCallbackEvent | null;
  },
): Promise<WebhookHandlerResult> {
  const validSignature = await verifyHmacSignatureHex(params.secret, params.rawBody, params.signatureHeader ?? "");
  if (!validSignature) return { outcome: "invalid_signature" };

  let payload: unknown;
  try {
    payload = JSON.parse(params.rawBody);
  } catch {
    return { outcome: "unparseable" };
  }
  const event = params.normalize(payload);
  if (!event) return { outcome: "unparseable" };

  const isNew = await isNewWebhookEvent(supabase, params.integration, event.externalEventId);
  if (!isNew) return { outcome: "duplicate" };

  const { data: message, error } = await supabase
    .from("messages")
    .select("id")
    .eq("provider_reference", event.providerReference)
    .maybeSingle();
  if (error) throw new Error(`handleProviderCallback message lookup failed: ${error.message}`);
  if (!message) return { outcome: "unknown_message" };

  const result = await processProviderCallbackEvent(supabase, {
    messageId: message.id,
    type: event.status,
    occurredAt: event.occurredAt,
    rawPayload: payload,
  });
  return { outcome: "processed", canonicalStatusChanged: result.canonicalStatusChanged };
}
