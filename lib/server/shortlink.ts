import type { SupabaseClient } from "@supabase/supabase-js";
import { generateShortLinkToken, hashShortLinkToken } from "@/lib/server/shortlinkToken";

/**
 * 9.5 Rövid link: kizárólag validált Google-review URL-re (vagy admin által
 * engedélyezett domainre) mutathat -- ez a hívó (dispatch.ts) felelőssége,
 * itt csak a token-alapú tárolást/redirect-et végezzük.
 */
export async function createShortLink(
  supabase: SupabaseClient,
  requestId: string,
  destinationUrl: string,
): Promise<{ token: string }> {
  const token = generateShortLinkToken();
  const tokenHash = await hashShortLinkToken(token);
  const { error } = await supabase.from("short_links").insert({
    request_id: requestId,
    token_hash: tokenHash,
    destination_url: destinationUrl,
  });
  if (error) throw new Error(`createShortLink failed: ${error.message}`);
  return { token };
}

export type ResolvedShortLink = { id: string; destinationUrl: string; expired: boolean };

export async function resolveShortLink(supabase: SupabaseClient, token: string): Promise<ResolvedShortLink | null> {
  const tokenHash = await hashShortLinkToken(token);
  const { data, error } = await supabase
    .from("short_links")
    .select("id, destination_url, expires_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();
  if (error) throw new Error(`resolveShortLink failed: ${error.message}`);
  if (!data) return null;
  const expired = Boolean(data.expires_at && new Date(data.expires_at) <= new Date());
  return { id: data.id, destinationUrl: data.destination_url, expired };
}

/** FR-LINK: első és ismételt kattintás rögzítése minimális metaadattal (8.2). */
export async function recordClick(
  supabase: SupabaseClient,
  shortLinkId: string,
  meta: { ipHash: string | null; uaFamily: string | null },
): Promise<void> {
  const { error } = await supabase
    .from("click_events")
    .insert({ short_link_id: shortLinkId, ip_hash: meta.ipHash, ua_family: meta.uaFamily });
  if (error) throw new Error(`recordClick failed: ${error.message}`);
}

export async function hasClick(supabase: SupabaseClient, shortLinkId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from("click_events")
    .select("id", { count: "exact", head: true })
    .eq("short_link_id", shortLinkId);
  if (error) throw new Error(`hasClick failed: ${error.message}`);
  return Boolean(count && count > 0);
}
