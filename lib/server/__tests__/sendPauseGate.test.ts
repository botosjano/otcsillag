import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { dispatchScheduledMessage, type DispatchMessageDeps } from "@/lib/server/dispatch";

/**
 * FR-ADM-003 bekötése a küldési útvonalon -- ugyanaz a fajta ellenőrzés, mint
 * a 3.3 keret-kapunál (dispatchClaim.test.ts): nem elég, hogy a `sendPause`
 * modul önmagában helyes (l. sendPause.test.ts), a tényleges KÜLDÉSI
 * ÚTVONALNAK is meg kell állnia rajta.
 */

function deps(): DispatchMessageDeps & { sent: string[] } {
  const sent: string[] = [];
  return {
    sent,
    smsProvider: {
      send: vi.fn(async (m: { to: string }) => {
        sent.push(m.to);
        return { ok: true as const, providerReference: "ref_1" };
      }),
    } as unknown as DispatchMessageDeps["smsProvider"],
    emailProvider: { send: vi.fn() } as unknown as DispatchMessageDeps["emailProvider"],
    businessName: "Teszt Kft",
    fromEmail: "no-reply@pelda.hu",
    replyToEmail: "info@pelda.hu",
    smsTemplate: "Szia {{customer.first_name}}, {{review.link}}",
    emailTemplate: { subject: "s", html: "h", text: "t" },
  };
}

function supabaseStub(pauseRows: Array<{ organization_id: string | null; reason: string }>) {
  const calls: string[] = [];
  const client = {
    from: (table: string) => {
      calls.push(`from:${table}`);
      const chain: Record<string, unknown> = {};
      const self = () => chain;
      chain.update = () => {
        calls.push(`update:${table}`);
        return chain;
      };
      chain.eq = self;
      chain.neq = self;
      chain.gte = self;
      chain.limit = self;
      chain.lt = () => {
        if (table === "usage_ledger") return Promise.resolve({ data: [], error: null });
        return chain;
      };
      chain.or = () => {
        if (table === "send_pauses") return Promise.resolve({ data: pauseRows, error: null });
        return chain;
      };
      chain.insert = () => {
        calls.push(`insert:${table}`);
        return chain;
      };
      chain.select = () => {
        if (table === "review_requests") {
          const hybrid: Record<string, unknown> = { ...chain };
          hybrid.then = (resolve: (v: unknown) => unknown) => resolve({ data: [{ id: "req_1" }], error: null });
          hybrid.eq = () => hybrid;
          hybrid.single = chain.single;
          return hybrid;
        }
        return chain;
      };
      chain.single = () =>
        Promise.resolve({
          data: {
            id: "req_1",
            organization_id: "org_1",
            contacts: { phone_e164: "+36301234567", email_normalized: null, first_name: "Teszt" },
            locations: { review_url: "https://g.page/x" },
          },
          error: null,
        });
      chain.maybeSingle = () =>
        Promise.resolve({
          data: {
            status: "active",
            current_period_start: "2026-08-01T00:00:00Z",
            current_period_end: "2026-09-01T00:00:00Z",
            plans: { sms_segment_limit: 50, email_limit: 100, overage_sms_huf: null },
          },
          error: null,
        });
      return chain;
    },
    rpc: vi.fn().mockResolvedValue({ data: false, error: null }),
  };
  return { client: client as unknown as SupabaseClient, calls };
}

describe("dispatchScheduledMessage -- FR-ADM-003 send-pause kapu", () => {
  it("aktív GLOBÁLIS szünet esetén a provider hívása el sem indul, a sor visszakerül 'scheduled'-be", async () => {
    const { client, calls } = supabaseStub([{ organization_id: null, reason: "LINK API leállt" }]);
    const d = deps();

    const result = await dispatchScheduledMessage(client, "req_1", "sms", d);

    expect(result.status).toBe("blocked");
    expect(result.blockedReason).toBe("send_paused:global:LINK API leállt");
    expect(d.smsProvider.send).not.toHaveBeenCalled();
    expect(calls).not.toContain("insert:messages");
    expect(calls).toContain("update:review_requests");
  });

  it("aktív TENANT-szintű szünet is blokkol, még ha nincs globális szünet", async () => {
    const { client } = supabaseStub([{ organization_id: "org_1", reason: "Ügyfél kérésére szüneteltetve" }]);
    const d = deps();

    const result = await dispatchScheduledMessage(client, "req_1", "sms", d);

    expect(result.status).toBe("blocked");
    expect(result.blockedReason).toBe("send_paused:organization:Ügyfél kérésére szüneteltetve");
    expect(d.smsProvider.send).not.toHaveBeenCalled();
  });

  it("szünet NÉLKÜL a küldés simán végigmegy a kapun (nem blokkol feleslegesen)", async () => {
    const { client } = supabaseStub([]);
    const d = deps();

    const result = await dispatchScheduledMessage(client, "req_1", "sms", d);

    expect(result.status).not.toBe("blocked");
    expect(d.smsProvider.send).toHaveBeenCalledTimes(1);
  });
});
