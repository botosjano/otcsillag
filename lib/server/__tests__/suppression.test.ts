import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { addSuppression, isSuppressed, normalizeDestination } from "@/lib/server/suppression";

describe("normalizeDestination", () => {
  it("normalizes email", () => {
    expect(normalizeDestination("email", " Foo@Bar.com ")).toBe("foo@bar.com");
  });
  it("normalizes phone", () => {
    expect(normalizeDestination("sms", "06301234567")).toBe("+36301234567");
  });
  it("returns null for garbage", () => {
    expect(normalizeDestination("email", "garbage")).toBeNull();
  });
});

describe("isSuppressed", () => {
  it("calls the is_suppressed rpc with the normalized destination", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: true, error: null });
    const supabase = { rpc } as unknown as SupabaseClient;
    const result = await isSuppressed(supabase, "org_1", "email", "Foo@Bar.com");
    expect(result).toBe(true);
    expect(rpc).toHaveBeenCalledWith("is_suppressed", {
      p_organization_id: "org_1",
      p_channel: "email",
      p_destination: "foo@bar.com",
    });
  });

  it("returns false without calling the rpc when the destination cannot be normalized", async () => {
    const rpc = vi.fn();
    const supabase = { rpc } as unknown as SupabaseClient;
    expect(await isSuppressed(supabase, "org_1", "email", "garbage")).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("throws (fail-open at the call site) when the rpc errors", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: "connection refused" } });
    const supabase = { rpc } as unknown as SupabaseClient;
    await expect(isSuppressed(supabase, "org_1", "email", "foo@bar.com")).rejects.toThrow("connection refused");
  });
});

describe("addSuppression", () => {
  it("upserts the normalized destination", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn().mockReturnValue({ upsert });
    const supabase = { from } as unknown as SupabaseClient;

    await addSuppression(supabase, "org_1", "sms", "+36301234567", "bounced");

    expect(from).toHaveBeenCalledWith("suppression_entries");
    expect(upsert).toHaveBeenCalledWith(
      { organization_id: "org_1", channel: "sms", normalized_destination: "+36301234567", reason: "bounced" },
      { onConflict: "organization_id,channel,normalized_destination", ignoreDuplicates: false },
    );
  });
});
