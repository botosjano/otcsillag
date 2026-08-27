import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { authenticateApiKey, generateApiKey, hasScope, parseApiKey } from "@/lib/server/apiKey";

describe("generateApiKey (FR-API-001)", () => {
  it("produces a key that parseApiKey can split back into prefix+secret", async () => {
    const generated = await generateApiKey();
    expect(generated.fullKey.startsWith("csillag_live_")).toBe(true);

    const parsed = parseApiKey(generated.fullKey);
    expect(parsed).not.toBeNull();
    expect(parsed!.prefix).toBe(generated.prefix);
  });

  it("never repeats the same key across calls", async () => {
    const a = await generateApiKey();
    const b = await generateApiKey();
    expect(a.fullKey).not.toBe(b.fullKey);
    expect(a.prefix).not.toBe(b.prefix);
  });

  it("does not store the raw secret anywhere in the hash", async () => {
    const generated = await generateApiKey();
    const parsed = parseApiKey(generated.fullKey)!;
    expect(generated.secretHash).not.toContain(parsed.secret);
  });
});

describe("parseApiKey", () => {
  it("rejects a key without the expected marker", () => {
    expect(parseApiKey("bearer_something_else")).toBeNull();
  });

  it("rejects a key with a missing separator", () => {
    expect(parseApiKey("csillag_live_deadbeef")).toBeNull();
  });

  it("rejects a key with wrong-length segments", () => {
    expect(parseApiKey("csillag_live_dead_beef")).toBeNull();
  });

  it("rejects a key with non-hex characters", () => {
    expect(parseApiKey(`csillag_live_zzzzzzzz_${"a".repeat(39)}g`)).toBeNull();
  });
});

/** Minimál Supabase-utánzat egyetlen api_keys sorral. */
function supabaseStub(row: {
  id: string;
  organization_id: string;
  secret_hash: string;
  scopes: string[];
  revoked_at: string | null;
} | null) {
  const updates: Array<{ table: string; payload: unknown }> = [];
  const client = {
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: row, error: null }),
        }),
      }),
      update: (payload: unknown) => ({
        eq: () => {
          updates.push({ table, payload });
          return Promise.resolve({ data: null, error: null });
        },
      }),
    }),
  };
  return { client: client as unknown as SupabaseClient, updates };
}

describe("authenticateApiKey", () => {
  it("returns null for a malformed presented key without touching the database", async () => {
    const { client, updates } = supabaseStub(null);
    const result = await authenticateApiKey(client, "not-a-key");
    expect(result).toBeNull();
    expect(updates).toHaveLength(0);
  });

  it("returns null when the prefix is not found", async () => {
    const generated = await generateApiKey();
    const { client } = supabaseStub(null);
    const result = await authenticateApiKey(client, generated.fullKey);
    expect(result).toBeNull();
  });

  it("returns null when the secret does not match the stored hash", async () => {
    const generated = await generateApiKey();
    const other = await generateApiKey();
    const { client } = supabaseStub({
      id: "key_1",
      organization_id: "org_1",
      secret_hash: other.secretHash, // rossz hash -- más kulcshoz tartozik
      scopes: ["requests:write"],
      revoked_at: null,
    });
    const result = await authenticateApiKey(client, generated.fullKey);
    expect(result).toBeNull();
  });

  it("returns null when the key is revoked, even with a matching hash", async () => {
    const generated = await generateApiKey();
    const { client } = supabaseStub({
      id: "key_1",
      organization_id: "org_1",
      secret_hash: generated.secretHash,
      scopes: ["requests:write"],
      revoked_at: "2026-08-25T00:00:00Z",
    });
    const result = await authenticateApiKey(client, generated.fullKey);
    expect(result).toBeNull();
  });

  it("authenticates a valid, non-revoked key and returns its org+scopes", async () => {
    const generated = await generateApiKey();
    const { client, updates } = supabaseStub({
      id: "key_1",
      organization_id: "org_1",
      secret_hash: generated.secretHash,
      scopes: ["requests:write", "requests:read"],
      revoked_at: null,
    });
    const result = await authenticateApiKey(client, generated.fullKey);
    expect(result).toEqual({ keyId: "key_1", organizationId: "org_1", scopes: ["requests:write", "requests:read"] });
    // last_used_at frissítés meg kell történjen sikeres hitelesítéskor.
    expect(updates.some((u) => u.table === "api_keys")).toBe(true);
  });
});

describe("hasScope", () => {
  it("true, ha a scope szerepel a kulcs listájában", () => {
    expect(hasScope({ keyId: "k", organizationId: "o", scopes: ["requests:write"] }, "requests:write")).toBe(true);
  });

  it("false, ha nem szerepel", () => {
    expect(hasScope({ keyId: "k", organizationId: "o", scopes: ["requests:read"] }, "requests:write")).toBe(false);
  });
});
