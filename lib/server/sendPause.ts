import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * FR-ADM-003 -- provider outage alatt globális vagy tenant send pause.
 *
 * A tábla (`send_pauses`, l. migráció 0004) sor-jelenléttel fejezi ki az
 * aktív szünetet: nincs `active` flag, a feloldás = törlés. A globális szünet
 * (`organization_id IS NULL`) minden szervezetre vonatkozik, a tenant-szintű
 * csak a sajátjára -- ha mindkettő aktív, a globális ok kerül jelentésre
 * (a súlyosabb, szélesebb hatókörű eset).
 */

export type SendPauseCheck = { paused: false } | { paused: true; scope: "global" | "organization"; reason: string };

export async function checkSendPause(supabase: SupabaseClient, organizationId: string): Promise<SendPauseCheck> {
  const { data, error } = await supabase
    .from("send_pauses")
    .select("organization_id, reason")
    .or(`organization_id.is.null,organization_id.eq.${organizationId}`);
  if (error) throw new Error(`checkSendPause lookup failed: ${error.message}`);
  if (!data || data.length === 0) return { paused: false };

  // Ha mindkét szintű szünet aktív egyszerre, a globális a jelentendő --
  // az szélesebb hatókörű, és a tenant-szintű felszabadítása nem oldaná fel
  // a küldést, tehát a hívónak a globálisról kell tudnia.
  const global = data.find((row) => row.organization_id === null);
  const row = global ?? data[0];
  return { paused: true, scope: global ? "global" : "organization", reason: row.reason };
}

export async function setSendPause(
  supabase: SupabaseClient,
  input: { organizationId: string | null; reason: string; createdBy: string },
): Promise<void> {
  const { error } = await supabase.from("send_pauses").insert({
    organization_id: input.organizationId,
    reason: input.reason,
    created_by: input.createdBy,
  });
  if (error) throw new Error(`setSendPause insert failed: ${error.message}`);
}

export async function clearSendPause(supabase: SupabaseClient, organizationId: string | null): Promise<void> {
  const query = supabase.from("send_pauses").delete();
  const { error } =
    organizationId === null ? await query.is("organization_id", null) : await query.eq("organization_id", organizationId);
  if (error) throw new Error(`clearSendPause delete failed: ${error.message}`);
}
