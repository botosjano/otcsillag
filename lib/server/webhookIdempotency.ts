import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * 8.4 / FR-MSG-004: a teljes bejövő webhook-hívást (nem csak az abban leírt
 * message_event-et) dedupoljuk a `webhook_events (integration, external_event_id)`
 * egyediséggel. Ez a szint a "ugyanazt a providertől kapott eseményt kétszer
 * dolgozzuk-e fel" kérdésre válaszol; a message_events dedup (l.
 * messageEvents.ts) egy szinttel lejjebb, magára a canonikus státuszra véd.
 */
export async function isNewWebhookEvent(
  supabase: SupabaseClient,
  integration: string,
  externalEventId: string,
): Promise<boolean> {
  const { error } = await supabase.from("webhook_events").insert({ integration, external_event_id: externalEventId });
  if (!error) return true;
  if ((error as { code?: string }).code === "23505") return false; // már feldolgozva
  throw new Error(`isNewWebhookEvent insert failed: ${error.message}`);
}
