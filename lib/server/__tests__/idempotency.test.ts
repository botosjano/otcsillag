import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { beginIdempotentRequest } from "@/lib/server/idempotency";

type Row = {
  organization_id: string;
  key: string;
  status: "pending" | "completed";
  response_status: number | null;
  response_body: unknown;
  created_at: string;
};

/**
 * Állapottal rendelkező Supabase-utánzat egyetlen `idempotency_keys` táblára
 * -- a valós egyediség-kényszert (23505) és a feltételes UPDATE (reclaim)
 * viselkedését szimulálja, nem csak lekódolt válaszsorozatot ad vissza.
 */
function idempotencyKeysStub() {
  const rows = new Map<string, Row>();
  const keyOf = (org: string, key: string) => `${org}::${key}`;

  type SelectChain = { eq: (col: string, val: string) => SelectChain; single: () => Promise<{ data: Row | null; error: { message: string } | null }> };
  function makeSelectChain(filters: Record<string, string>): SelectChain {
    return {
      eq(col: string, val: string) {
        return makeSelectChain({ ...filters, [col]: val });
      },
      single() {
        const row = rows.get(keyOf(filters.organization_id, filters.key));
        return Promise.resolve({ data: row ? { ...row } : null, error: row ? null : { message: "not found" } });
      },
    };
  }

  type UpdateResult = { data: { id: string } | null; error: null };
  type UpdateChain = {
    eq: (col: string, val: string) => UpdateChain;
    select: () => { maybeSingle: () => Promise<UpdateResult> };
    then: (resolve: (v: UpdateResult) => void) => void;
  };
  function makeUpdateChain(payload: Partial<Row>, filters: Record<string, string>): UpdateChain {
    const chain: UpdateChain = {
      eq(col: string, val: string) {
        return makeUpdateChain(payload, { ...filters, [col]: val });
      },
      select() {
        return {
          maybeSingle: () => Promise.resolve(runUpdate()),
        };
      },
      then(resolve: (v: UpdateResult) => void) {
        resolve({ data: null, error: runUpdate().error });
      },
    };
    function runUpdate() {
      const k = keyOf(filters.organization_id, filters.key);
      const row = rows.get(k);
      if (!row) return { data: null, error: null };
      if (filters.status && row.status !== filters.status) return { data: null, error: null }; // feltétel nem talál
      Object.assign(row, payload);
      return { data: { id: k }, error: null };
    }
    return chain;
  }

  const client = {
    from: () => ({
      insert: (payload: Partial<Row>) => {
        const k = keyOf(payload.organization_id!, payload.key!);
        if (rows.has(k)) return Promise.resolve({ data: null, error: { code: "23505" } });
        rows.set(k, {
          organization_id: payload.organization_id!,
          key: payload.key!,
          status: (payload.status as Row["status"]) ?? "pending",
          response_status: null,
          response_body: null,
          created_at: new Date().toISOString(),
        });
        return Promise.resolve({ data: null, error: null });
      },
      select: () => makeSelectChain({}),
      update: (payload: Partial<Row>) => makeUpdateChain(payload, {}),
    }),
  };
  return { client: client as unknown as SupabaseClient, rows };
}

describe("beginIdempotentRequest (FR-WH-002)", () => {
  it("fresh key -> proceed, then commit stores the response for replay", async () => {
    const { client } = idempotencyKeysStub();
    const outcome = await beginIdempotentRequest(client, "org_1", "key_1");
    expect(outcome.kind).toBe("proceed");
    if (outcome.kind !== "proceed") throw new Error("unreachable");
    await outcome.commit(202, { id: "req_1" });

    const replay = await beginIdempotentRequest(client, "org_1", "key_1");
    expect(replay).toEqual({ kind: "replay", status: 202, body: { id: "req_1" } });
  });

  it("second call while the first is still pending -> conflict, no mellékhatás", async () => {
    const { client } = idempotencyKeysStub();
    const first = await beginIdempotentRequest(client, "org_1", "key_1");
    expect(first.kind).toBe("proceed");

    const second = await beginIdempotentRequest(client, "org_1", "key_1");
    expect(second).toEqual({ kind: "conflict" });
  });

  it("different organizations with the same key are independent", async () => {
    const { client } = idempotencyKeysStub();
    const a = await beginIdempotentRequest(client, "org_a", "shared_key");
    const b = await beginIdempotentRequest(client, "org_b", "shared_key");
    expect(a.kind).toBe("proceed");
    expect(b.kind).toBe("proceed");
  });

  it("expired completed key (>24h) is reclaimed and proceeds again", async () => {
    const { client, rows } = idempotencyKeysStub();
    const first = await beginIdempotentRequest(client, "org_1", "key_1");
    if (first.kind !== "proceed") throw new Error("unreachable");
    await first.commit(202, { id: "req_1" });

    // Szimulált idő: a sor 25 órával ezelőtt készült.
    const row = rows.get("org_1::key_1")!;
    row.created_at = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();

    const outcome = await beginIdempotentRequest(client, "org_1", "key_1");
    expect(outcome.kind).toBe("proceed");
    if (outcome.kind !== "proceed") throw new Error("unreachable");
    await outcome.commit(202, { id: "req_2" });

    const replay = await beginIdempotentRequest(client, "org_1", "key_1");
    expect(replay).toEqual({ kind: "replay", status: 202, body: { id: "req_2" } });
  });

  it("non-expired completed key replays the ORIGINAL response, not a new one", async () => {
    const { client } = idempotencyKeysStub();
    const first = await beginIdempotentRequest(client, "org_1", "key_1");
    if (first.kind !== "proceed") throw new Error("unreachable");
    await first.commit(422, { code: "invalid_contact" });

    const replay = await beginIdempotentRequest(client, "org_1", "key_1");
    expect(replay).toEqual({ kind: "replay", status: 422, body: { code: "invalid_contact" } });
  });
});
