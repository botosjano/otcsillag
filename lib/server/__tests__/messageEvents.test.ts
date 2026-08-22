import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { processProviderCallbackEvent } from "@/lib/server/messageEvents";

function fakeSupabase(opts: {
  insertError?: { code?: string; message: string } | null;
  currentMessage: { status: string; updated_at: string };
  updateError?: { message: string } | null;
}) {
  const insert = vi.fn().mockResolvedValue({ error: opts.insertError ?? null });
  const single = vi.fn().mockResolvedValue({ data: opts.currentMessage, error: null });
  const eqForSelect = vi.fn().mockReturnValue({ single });
  const select = vi.fn().mockReturnValue({ eq: eqForSelect });
  const eqForUpdate = vi.fn().mockResolvedValue({ error: opts.updateError ?? null });
  const update = vi.fn().mockReturnValue({ eq: eqForUpdate });

  const from = vi.fn((table: string) => {
    if (table === "message_events") return { insert };
    if (table === "messages") return { select, update };
    throw new Error(`unexpected table ${table}`);
  });

  const client = { from } as unknown as SupabaseClient;
  return { client, update };
}

describe("processProviderCallbackEvent", () => {
  it("logs the event and advances the canonical status forward", async () => {
    const { client, update } = fakeSupabase({ currentMessage: { status: "submitted", updated_at: "2026-08-20T10:00:00Z" } });
    const result = await processProviderCallbackEvent(client, {
      messageId: "msg_1",
      type: "delivered",
      occurredAt: "2026-08-20T10:05:00Z",
      rawPayload: { any: "thing" },
    });
    expect(result.logged).toBe(true);
    expect(result.canonicalStatusChanged).toBe(true);
    expect(result.appliedStatus).toBe("delivered");
    expect(update).toHaveBeenCalledWith({ status: "delivered", updated_at: "2026-08-20T10:05:00Z" });
  });

  it("logs a duplicate event (unique_violation) without treating it as an error", async () => {
    const { client } = fakeSupabase({
      insertError: { code: "23505", message: "duplicate" },
      currentMessage: { status: "delivered", updated_at: "2026-08-20T10:00:00Z" },
    });
    const result = await processProviderCallbackEvent(client, {
      messageId: "msg_1",
      type: "delivered",
      occurredAt: "2026-08-20T10:00:00Z",
      rawPayload: {},
    });
    expect(result.logged).toBe(false);
    expect(result.canonicalStatusChanged).toBe(false);
  });

  it("logs an out-of-order regression but does not apply it to the canonical status", async () => {
    const { client, update } = fakeSupabase({ currentMessage: { status: "delivered", updated_at: "2026-08-20T10:05:00Z" } });
    const result = await processProviderCallbackEvent(client, {
      messageId: "msg_1",
      type: "submitted",
      occurredAt: "2026-08-20T09:59:00Z",
      rawPayload: {},
    });
    expect(result.logged).toBe(true);
    expect(result.canonicalStatusChanged).toBe(false);
    expect(result.appliedStatus).toBe("delivered");
    expect(update).not.toHaveBeenCalled();
  });

  it("propagates a genuine insert failure", async () => {
    const { client } = fakeSupabase({
      insertError: { message: "connection refused" },
      currentMessage: { status: "submitted", updated_at: "2026-08-20T10:00:00Z" },
    });
    await expect(
      processProviderCallbackEvent(client, {
        messageId: "msg_1",
        type: "delivered",
        occurredAt: "2026-08-20T10:05:00Z",
        rawPayload: {},
      }),
    ).rejects.toThrow("connection refused");
  });
});
