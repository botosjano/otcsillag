import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeEmail, normalizePhone } from "@/lib/server/normalize";

export type Channel = "sms" | "email";
export type SuppressionReason = "bounced" | "complained" | "unsubscribed" | "manual";

export function normalizeDestination(channel: Channel, destination: string): string | null {
  return channel === "email" ? normalizeEmail(destination) : normalizePhone(destination);
}

export async function isSuppressed(
  supabase: SupabaseClient,
  organizationId: string,
  channel: Channel,
  destination: string,
): Promise<boolean> {
  const normalized = normalizeDestination(channel, destination);
  if (!normalized) return false;
  const { data, error } = await supabase.rpc("is_suppressed", {
    p_organization_id: organizationId,
    p_channel: channel,
    p_destination: normalized,
  });
  if (error) {
    // Fail-open a hívó felé (l. elmentve worker/src/lib/suppression.ts azonos
    // döntése): egy átmeneti DB-hiba miatt ne veszítsünk el legitim küldést,
    // de a hiba mindenképp propagálódjon és naplózódjon.
    throw new Error(`is_suppressed rpc failed: ${error.message}`);
  }
  return Boolean(data);
}

export async function addSuppression(
  supabase: SupabaseClient,
  organizationId: string,
  channel: Channel,
  destination: string,
  reason: SuppressionReason,
): Promise<void> {
  const normalized = normalizeDestination(channel, destination);
  if (!normalized) return;
  const { error } = await supabase.from("suppression_entries").upsert(
    { organization_id: organizationId, channel, normalized_destination: normalized, reason },
    { onConflict: "organization_id,channel,normalized_destination", ignoreDuplicates: false },
  );
  if (error) {
    throw new Error(`addSuppression failed: ${error.message}`);
  }
}
