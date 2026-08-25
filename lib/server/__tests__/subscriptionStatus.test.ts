import { describe, expect, it } from "vitest";
import { nextSubscriptionStatus, shouldSuspendForExpiredGrace } from "@/lib/server/subscriptionStatus";

const NOW = new Date("2026-08-22T10:00:00Z");

describe("nextSubscriptionStatus (FR-BILL-001/006)", () => {
  it("payment_succeeded always returns to active and clears the grace period", () => {
    expect(nextSubscriptionStatus("past_due", { type: "payment_succeeded" }, NOW)).toEqual({
      status: "active",
      gracePeriodEndsAt: "clear",
    });
    expect(nextSubscriptionStatus("trialing", { type: "payment_succeeded" }, NOW)).toEqual({
      status: "active",
      gracePeriodEndsAt: "clear",
    });
  });

  it("payment_failed from active moves to past_due with a grace period N days out", () => {
    const result = nextSubscriptionStatus("active", { type: "payment_failed" }, NOW, 7);
    expect(result.status).toBe("past_due");
    expect(result.gracePeriodEndsAt).toBe(new Date(NOW.getTime() + 7 * 86_400_000).toISOString());
  });

  it("payment_failed on an already-cancelled/suspended subscription is a no-op", () => {
    expect(nextSubscriptionStatus("cancelled", { type: "payment_failed" }, NOW)).toEqual({
      status: "cancelled",
      gracePeriodEndsAt: null,
    });
    expect(nextSubscriptionStatus("suspended", { type: "payment_failed" }, NOW)).toEqual({
      status: "suspended",
      gracePeriodEndsAt: null,
    });
  });

  it("subscription_cancelled is terminal", () => {
    expect(nextSubscriptionStatus("active", { type: "subscription_cancelled" }, NOW)).toEqual({
      status: "cancelled",
      gracePeriodEndsAt: "clear",
    });
  });

  it("trial_ended_with_payment_method activates the subscription", () => {
    expect(nextSubscriptionStatus("trialing", { type: "trial_ended_with_payment_method" }, NOW)).toEqual({
      status: "active",
      gracePeriodEndsAt: "clear",
    });
  });
});

describe("shouldSuspendForExpiredGrace", () => {
  it("suspends when past_due and the grace period has elapsed", () => {
    expect(shouldSuspendForExpiredGrace("past_due", "2026-08-22T09:00:00Z", NOW)).toBe(true);
  });

  it("does not suspend while still within the grace period", () => {
    expect(shouldSuspendForExpiredGrace("past_due", "2026-08-22T11:00:00Z", NOW)).toBe(false);
  });

  it("does not suspend a non-past_due status", () => {
    expect(shouldSuspendForExpiredGrace("active", "2026-08-22T09:00:00Z", NOW)).toBe(false);
  });

  it("does not suspend when there is no grace period set", () => {
    expect(shouldSuspendForExpiredGrace("past_due", null, NOW)).toBe(false);
  });
});
