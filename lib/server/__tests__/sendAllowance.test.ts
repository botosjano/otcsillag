import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { checkSendAllowance } from "@/lib/server/sendAllowance";

/**
 * A 3.3 küldés-előtti kapu BEKÖTÉSE (Elemér PR#12-review-jának blokkoló
 * találata). A `canSendWithinOrOverLimit` maga korábban is jól számolt -- a
 * hiba az volt, hogy alkalmazáskód SEHOL nem hívta. Ezek a tesztek ezért nem
 * a számolást ismétlik meg, hanem azt rögzítik, hogy a kapu a valós
 * adatforrásokból (előfizetés, csomag, usage ledger) helyes döntést hoz.
 */

const PLAN = { sms_segment_limit: 50, email_limit: 100, overage_sms_huf: null };

function supabaseStub(opts: {
  subscription: Record<string, unknown> | null;
  ledger?: Array<{ unit: string; quantity: number }>;
}) {
  const client = {
    from: (table: string) => {
      if (table === "subscriptions") {
        const chain: Record<string, unknown> = {};
        chain.select = () => chain;
        chain.eq = () => chain;
        chain.neq = () => chain;
        chain.maybeSingle = () => Promise.resolve({ data: opts.subscription, error: null });
        return chain;
      }
      const chain: Record<string, unknown> = {};
      chain.select = () => chain;
      chain.eq = () => chain;
      chain.gte = () => chain;
      chain.lt = () => Promise.resolve({ data: opts.ledger ?? [], error: null });
      return chain;
    },
    rpc: vi.fn(),
  };
  return client as unknown as SupabaseClient;
}

const ACTIVE_SUB = {
  status: "active",
  current_period_start: "2026-08-01T00:00:00Z",
  current_period_end: "2026-09-01T00:00:00Z",
  plans: PLAN,
};

describe("checkSendAllowance -- a 3.3 kapu tényleges bekötése", () => {
  it("enged, ha a szervezet a kereten BELÜL van", async () => {
    const supabase = supabaseStub({ subscription: ACTIVE_SUB, ledger: [{ unit: "sms_segment", quantity: 10 }] });
    expect(await checkSendAllowance(supabase, "org_1", "sms_segment")).toEqual({ allowed: true });
  });

  it("TILT, ha a keret betelt és a csomag nem enged túlfogyasztást", async () => {
    // overage_sms_huf: null -> a csomagnál egyáltalán nincs túlfogyasztás.
    const supabase = supabaseStub({ subscription: ACTIVE_SUB, ledger: [{ unit: "sms_segment", quantity: 50 }] });
    const result = await checkSendAllowance(supabase, "org_1", "sms_segment");
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.reason).toBe("limit_reached");
  });

  it("TILT előfizetés nélkül -- fail-closed, nem termelünk számlázhatatlan forgalmat", async () => {
    const supabase = supabaseStub({ subscription: null });
    const result = await checkSendAllowance(supabase, "org_1", "sms_segment");
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.reason).toBe("no_subscription");
  });

  it("TILT felfüggesztett előfizetésnél, akkor is ha van szabad keret", async () => {
    const supabase = supabaseStub({
      subscription: { ...ACTIVE_SUB, status: "suspended" },
      ledger: [{ unit: "sms_segment", quantity: 0 }],
    });
    const result = await checkSendAllowance(supabase, "org_1", "sms_segment");
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.reason).toBe("subscription_inactive");
  });

  it("a PRÓBAIDŐSZAK nem számít érvényes fizetési módnak a keret fölött", async () => {
    // Ez a 3.3 lényege: túlfogyasztás CSAK érvényes fizetési móddal. A
    // `trialing` státusznál még nem terhelt sikeresen a szolgáltató.
    const supabase = supabaseStub({
      subscription: { ...ACTIVE_SUB, status: "trialing", plans: { ...PLAN, overage_sms_huf: 25 } },
      ledger: [{ unit: "sms_segment", quantity: 50 }],
    });
    const result = await checkSendAllowance(supabase, "org_1", "sms_segment");
    expect(result.allowed).toBe(false);
  });

  it("a keret fölött ENGED, ha van érvényes fizetési mód és a csomag enged túlfogyasztást", async () => {
    const supabase = supabaseStub({
      subscription: { ...ACTIVE_SUB, plans: { ...PLAN, overage_sms_huf: 25 } },
      ledger: [{ unit: "sms_segment", quantity: 50 }],
    });
    expect(await checkSendAllowance(supabase, "org_1", "sms_segment")).toEqual({ allowed: true });
  });

  it("az e-mail keretet külön számolja, az SMS-fogyasztás nem szivárog bele", async () => {
    const supabase = supabaseStub({
      subscription: ACTIVE_SUB,
      ledger: [
        { unit: "sms_segment", quantity: 50 },
        { unit: "email", quantity: 10 },
      ],
    });
    expect(await checkSendAllowance(supabase, "org_1", "email")).toEqual({ allowed: true });
  });
});
