import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { dispatchScheduledMessage, type DispatchMessageDeps } from "@/lib/server/dispatch";

/**
 * Az atomikus dispatch-claim (Elemér PR#11-review-jának blokkoló találata).
 *
 * A lényeg nem az, hogy a függvény mit ad vissza, hanem hogy MI NEM TÖRTÉNIK
 * MEG: ha a sort nem sikerült lefoglalni, a provider hívása EL SEM INDUL.
 * Enélkül ugyanaz az üzenet kétszer ment ki ugyanannak az ügyfélnek.
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

/**
 * Minimál Supabase-utánzat. A `claimedRows` dönti el, hogy a lefoglaló
 * feltételes UPDATE talált-e sort -- pontosan ez a valós verseny kimenetele.
 */
function supabaseStub(claimedRows: Array<{ id: string }>) {
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
      chain.insert = () => {
        calls.push(`insert:${table}`);
        return chain;
      };
      chain.eq = self;
      chain.lt = self;
      chain.lte = self;
      chain.limit = self;
      chain.select = () => {
        // A claim a `.select("id")`-ből olvassa ki, hány sort érintett.
        if (table === "review_requests") {
          return Promise.resolve({ data: claimedRows, error: null });
        }
        return chain;
      };
      chain.single = () => Promise.resolve({ data: { id: "x" }, error: null });
      chain.maybeSingle = () => Promise.resolve({ data: null, error: null });
      return chain;
    },
    rpc: vi.fn().mockResolvedValue({ data: false, error: null }),
  };
  return { client: client as unknown as SupabaseClient, calls };
}

describe("dispatchScheduledMessage -- atomikus claim", () => {
  it("ha a sort NEM sikerült lefoglalni, a provider hívása EL SEM INDUL", async () => {
    // Üres claim-eredmény = valaki más már elvitte, vagy időközben visszavonták.
    const { client, calls } = supabaseStub([]);
    const d = deps();

    const result = await dispatchScheduledMessage(client, "req_1", "sms", d);

    expect(result.status).toBe("skipped");
    expect(result.messageId).toBeNull();
    // EZ A LÉNYEG: nincs küldés, és nem is jött létre messages sor.
    expect(d.sent).toEqual([]);
    expect(d.smsProvider.send).not.toHaveBeenCalled();
    expect(calls).not.toContain("insert:messages");
  });

  it("a lefoglalás a review_requests-en feltételes UPDATE-tel történik", async () => {
    const { client, calls } = supabaseStub([]);
    await dispatchScheduledMessage(client, "req_1", "sms", deps());
    // A legelső művelet a lefoglalás, nem az olvasás -- különben a verseny
    // ablaka nyitva maradna a select és az update között.
    expect(calls[0]).toBe("from:review_requests");
    expect(calls[1]).toBe("update:review_requests");
  });

  it("a claim hibáját NEM nyeli el (nem megy tovább küldeni)", async () => {
    const client = {
      from: () => ({
        update: () => ({
          eq: () => ({
            eq: () => ({
              select: () => Promise.resolve({ data: null, error: { message: "deadlock detected" } }),
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;
    const d = deps();

    await expect(dispatchScheduledMessage(client, "req_1", "sms", d)).rejects.toThrow("deadlock detected");
    expect(d.smsProvider.send).not.toHaveBeenCalled();
  });
});

describe("dispatchScheduledMessage -- a 3.3 kapu a küldési útvonalon", () => {
  it("ha a kapu TILT, a provider hívása el sem indul és nincs messages sor", async () => {
    // A kapu bekötésének lényege nem az, hogy a függvény jól számol (azt a
    // sendAllowance.test.ts fedi), hanem hogy a KÜLDÉSI ÚTVONAL tényleg
    // megáll rajta. Korábban a `canSendWithinOrOverLimit`-et alkalmazáskód
    // sehol nem hívta, tehát a limitjét túllépő szervezet üzenetei kimentek.
    const calls: string[] = [];
    const client = {
      from: (table: string) => {
        calls.push(`from:${table}`);
        const chain: Record<string, unknown> = {};
        const self = () => chain;
        chain.update = () => { calls.push(`update:${table}`); return chain; };
        chain.insert = () => { calls.push(`insert:${table}`); return chain; };
        chain.eq = self;
        chain.neq = self;
        chain.gte = self;
        chain.lt = () => (table === "usage_ledger" ? Promise.resolve({ data: [{ unit: "sms_segment", quantity: 999 }], error: null }) : chain);
        chain.limit = self;
        // A review_requests-en a select() KÉTFÉLE szerepben hívódik: a claim
        // után eredményként (await-elve), a lookupnál láncként (.eq().single()).
        // Ezért thenable ÉS láncolható egyszerre.
        chain.select = () => {
          if (table !== "review_requests") return chain;
          const hybrid: Record<string, unknown> = { ...chain };
          hybrid.then = (resolve: (v: unknown) => unknown) => resolve({ data: [{ id: "req_1" }], error: null });
          hybrid.eq = () => hybrid;
          hybrid.single = chain.single;
          return hybrid;
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
    } as unknown as SupabaseClient;

    const d = deps();
    const result = await dispatchScheduledMessage(client, "req_1", "sms", d);

    expect(result.status).toBe("blocked");
    expect(d.smsProvider.send).not.toHaveBeenCalled();
    expect(calls).not.toContain("insert:messages");
  });
});
