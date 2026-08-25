import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * FR-WH-002 -- generikus `Idempotency-Key` réteg (spec 9.1, 10.2). Külön
 * módul a domain-specifikus deduptól (`webhookIdempotency.ts` a provider
 * event ID-ra, `dispatch.ts` a `review_requests.idempotency_key`-re): ez
 * bármelyik POST route elé tehető, és a VÁLASZT is visszajátssza, nem csak
 * azt akadályozza meg, hogy a mellékhatás kétszer fusson le.
 */

const TTL_MS = 24 * 60 * 60 * 1000;

export type IdempotencyOutcome =
  | { kind: "replay"; status: number; body: unknown }
  /** Egy másik hívás UGYANAZZAL a kulccsal még feldolgozás alatt van. */
  | { kind: "conflict" }
  | { kind: "proceed"; commit: (status: number, body: unknown) => Promise<void> };

/**
 * Lefoglalja a kulcsot (vagy visszaadja a korábbi eredményt). A hívó a
 * `"proceed"` ágon köteles a végén `commit`-tal lezárni -- enélkül a sor
 * `pending` marad, és minden újrapróbálkozás `conflict`-ot kap 24 óráig.
 */
export async function beginIdempotentRequest(
  supabase: SupabaseClient,
  organizationId: string,
  key: string,
): Promise<IdempotencyOutcome> {
  const { error: insertError } = await supabase
    .from("idempotency_keys")
    .insert({ organization_id: organizationId, key, status: "pending" });

  if (!insertError) return proceedOutcome(supabase, organizationId, key);
  if ((insertError as { code?: string }).code !== "23505") {
    throw new Error(`beginIdempotentRequest insert failed: ${insertError.message}`);
  }

  const { data: existing, error: selectError } = await supabase
    .from("idempotency_keys")
    .select("status, response_status, response_body, created_at")
    .eq("organization_id", organizationId)
    .eq("key", key)
    .single();
  if (selectError) throw new Error(`beginIdempotentRequest lookup failed: ${selectError.message}`);

  if (existing.status === "pending") return { kind: "conflict" };

  const ageMs = Date.now() - new Date(existing.created_at).getTime();
  if (ageMs < TTL_MS) {
    return { kind: "replay", status: existing.response_status ?? 200, body: existing.response_body };
  }

  // Lejárt a 24 órás megőrzés -- atomikusan visszafoglaljuk `pending`-re,
  // mintha friss kulcs lenne. Ugyanaz a feltételes-UPDATE minta, mint a
  // dispatch-claimnél (0003 migráció): csak akkor sikerül, ha még mindig
  // `completed` ÉS lejárt, különben valaki más már megelőzött.
  const { data: reclaimed, error: reclaimError } = await supabase
    .from("idempotency_keys")
    .update({ status: "pending", response_status: null, response_body: null, created_at: new Date().toISOString() })
    .eq("organization_id", organizationId)
    .eq("key", key)
    .eq("status", "completed")
    .select("id")
    .maybeSingle();
  if (reclaimError) throw new Error(`beginIdempotentRequest reclaim failed: ${reclaimError.message}`);
  if (!reclaimed) return { kind: "conflict" };

  return proceedOutcome(supabase, organizationId, key);
}

function proceedOutcome(supabase: SupabaseClient, organizationId: string, key: string): IdempotencyOutcome {
  return {
    kind: "proceed",
    commit: async (status: number, body: unknown) => {
      const { error } = await supabase
        .from("idempotency_keys")
        .update({ status: "completed", response_status: status, response_body: body })
        .eq("organization_id", organizationId)
        .eq("key", key);
      if (error) throw new Error(`idempotency commit failed: ${error.message}`);
    },
  };
}
