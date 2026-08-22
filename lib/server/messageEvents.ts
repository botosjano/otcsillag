import type { SupabaseClient } from "@supabase/supabase-js";
import { nextCanonicalMessageState, type MessageStatus } from "@/lib/server/canonicalStatus";

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export type ProviderCallbackEvent = {
  messageId: string;
  type: MessageStatus;
  occurredAt: string;
  rawPayload: unknown;
};

export type ProcessResult = { logged: boolean; canonicalStatusChanged: boolean; appliedStatus: MessageStatus };

/**
 * FR-MSG-004 (DLR/bounce callback idempotens feldolgozása) + spec 10.2:
 * a nyers eseményt MINDIG naplózzuk (dedupelve), a kanonikus `messages.status`
 * viszont csak akkor lép előre, ha az esemény nem egy korábbi (alacsonyabb
 * rangú) állapotra vonatkozik, mint ami már rögzítve van -- l.
 * canonicalStatus.ts. A webhook_events tábla egyedisége (l. migráció) a
 * teljes webhook-hívást dedupolja már a route szintjén; ez a függvény a
 * message_events szinten véd (egy webhook több eseményt is hordozhat).
 */
export async function processProviderCallbackEvent(
  supabase: SupabaseClient,
  event: ProviderCallbackEvent,
): Promise<ProcessResult> {
  const payloadHash = await sha256Hex(JSON.stringify(event.rawPayload ?? null));

  const { error: insertError } = await supabase.from("message_events").insert({
    message_id: event.messageId,
    type: event.type,
    occurred_at: event.occurredAt,
    payload_hash: payloadHash,
    raw_payload: event.rawPayload ?? null,
  });
  // 23505 = unique_violation -- ugyanaz a message+type+payload_hash már
  // rögzítve van, ez egy duplikált (retry) callback, nem hiba.
  const logged = !insertError;
  if (insertError && (insertError as { code?: string }).code !== "23505") {
    throw new Error(`processProviderCallbackEvent insert failed: ${insertError.message}`);
  }

  const { data: message, error: fetchError } = await supabase
    .from("messages")
    .select("status, updated_at")
    .eq("id", event.messageId)
    .single();
  if (fetchError) throw new Error(`processProviderCallbackEvent fetch failed: ${fetchError.message}`);

  const current = { status: message.status as MessageStatus, occurredAt: message.updated_at as string };
  const next = nextCanonicalMessageState(current, { status: event.type, occurredAt: event.occurredAt });
  const canonicalStatusChanged = next.status !== current.status || next.occurredAt !== current.occurredAt;

  if (canonicalStatusChanged) {
    const { error: updateError } = await supabase
      .from("messages")
      .update({ status: next.status, updated_at: next.occurredAt })
      .eq("id", event.messageId);
    if (updateError) throw new Error(`processProviderCallbackEvent update failed: ${updateError.message}`);
  }

  return { logged, canonicalStatusChanged, appliedStatus: next.status };
}
