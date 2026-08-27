import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { checkSendPause } from "@/lib/server/sendPause";

function supabaseStub(rows: Array<{ organization_id: string | null; reason: string }>) {
  const client = {
    from: () => ({
      select: () => ({
        or: () => Promise.resolve({ data: rows, error: null }),
      }),
    }),
  };
  return client as unknown as SupabaseClient;
}

describe("checkSendPause (FR-ADM-003)", () => {
  it("nincs szünet -> nincs blokkolás", async () => {
    const result = await checkSendPause(supabaseStub([]), "org_1");
    expect(result).toEqual({ paused: false });
  });

  it("csak tenant-szintű szünet -> 'organization' scope-pal blokkol", async () => {
    const result = await checkSendPause(supabaseStub([{ organization_id: "org_1", reason: "Provider karbantartás" }]), "org_1");
    expect(result).toEqual({ paused: true, scope: "organization", reason: "Provider karbantartás" });
  });

  it("globális szünet -> 'global' scope-pal blokkol, akkor is ha nincs tenant-szintű sor", async () => {
    const result = await checkSendPause(supabaseStub([{ organization_id: null, reason: "LINK API leállt" }]), "org_1");
    expect(result).toEqual({ paused: true, scope: "global", reason: "LINK API leállt" });
  });

  it("ha MINDKÉT szintű szünet aktív, a GLOBÁLIS okot jelenti (szélesebb hatókör)", async () => {
    const result = await checkSendPause(
      supabaseStub([
        { organization_id: "org_1", reason: "Tenant-specifikus ok" },
        { organization_id: null, reason: "Globális leállás" },
      ]),
      "org_1",
    );
    expect(result).toEqual({ paused: true, scope: "global", reason: "Globális leállás" });
  });

  it("a lekérdezés hibáját nem nyeli el", async () => {
    const client = {
      from: () => ({
        select: () => ({
          or: () => Promise.resolve({ data: null, error: { message: "connection reset" } }),
        }),
      }),
    } as unknown as SupabaseClient;
    await expect(checkSendPause(client, "org_1")).rejects.toThrow("connection reset");
  });
});
