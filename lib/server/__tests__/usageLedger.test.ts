import { describe, expect, it } from "vitest";
import { canSendWithinOrOverLimit, computeOverage } from "@/lib/server/usageLedger";

const STARTER_LIMITS = { smsSegmentLimit: 50, emailLimit: 500, overageSmsHuf: 29 };
const TRIAL_LIMITS = { smsSegmentLimit: 20, emailLimit: 50, overageSmsHuf: null };

describe("computeOverage (FR-BILL-005)", () => {
  it("returns zero overage when usage is within limits", () => {
    expect(computeOverage(STARTER_LIMITS, { smsSegments: 10, emails: 100 })).toEqual({
      smsOverageSegments: 0,
      smsOverageHuf: 0,
      emailOverageCount: 0,
      blockedByPlan: false,
    });
  });

  it("computes SMS overage cost when the plan allows it", () => {
    expect(computeOverage(STARTER_LIMITS, { smsSegments: 60, emails: 100 })).toEqual({
      smsOverageSegments: 10,
      smsOverageHuf: 290,
      emailOverageCount: 0,
      blockedByPlan: false,
    });
  });

  it("flags blockedByPlan when overage is not allowed (e.g. trial)", () => {
    expect(computeOverage(TRIAL_LIMITS, { smsSegments: 25, emails: 10 })).toEqual({
      smsOverageSegments: 5,
      smsOverageHuf: 0,
      emailOverageCount: 0,
      blockedByPlan: true,
    });
  });
});

describe("canSendWithinOrOverLimit (3.3 SMS-költségvédelem)", () => {
  it("allows sending while under the limit regardless of payment method", () => {
    expect(canSendWithinOrOverLimit(STARTER_LIMITS, { smsSegments: 49, emails: 0 }, "sms_segment", false)).toBe(true);
  });

  it("blocks overage on a plan with no overage rate (trial) even with a payment method", () => {
    expect(canSendWithinOrOverLimit(TRIAL_LIMITS, { smsSegments: 20, emails: 0 }, "sms_segment", true)).toBe(false);
  });

  it("allows overage on a paid plan only with a valid payment method", () => {
    expect(canSendWithinOrOverLimit(STARTER_LIMITS, { smsSegments: 50, emails: 0 }, "sms_segment", true)).toBe(true);
    expect(canSendWithinOrOverLimit(STARTER_LIMITS, { smsSegments: 50, emails: 0 }, "sms_segment", false)).toBe(false);
  });
});
