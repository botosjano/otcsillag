import { describe, expect, it } from "vitest";
import type Stripe from "stripe";
import { extractOrganizationId, normalizeStripeEvent } from "@/lib/server/billingProviders/stripeWebhook";

function fakeEvent(type: string, dataObject: Record<string, unknown>): Stripe.Event {
  return { type, data: { object: dataObject } } as unknown as Stripe.Event;
}

describe("normalizeStripeEvent", () => {
  it("maps invoice.paid and checkout.session.completed to payment_succeeded", () => {
    expect(normalizeStripeEvent(fakeEvent("invoice.paid", {}))).toEqual({ type: "payment_succeeded" });
    expect(normalizeStripeEvent(fakeEvent("checkout.session.completed", {}))).toEqual({ type: "payment_succeeded" });
  });

  it("maps invoice.payment_failed to payment_failed", () => {
    expect(normalizeStripeEvent(fakeEvent("invoice.payment_failed", {}))).toEqual({ type: "payment_failed" });
  });

  it("maps customer.subscription.deleted to subscription_cancelled", () => {
    expect(normalizeStripeEvent(fakeEvent("customer.subscription.deleted", {}))).toEqual({
      type: "subscription_cancelled",
    });
  });

  it("returns null for an unmapped event type", () => {
    expect(normalizeStripeEvent(fakeEvent("customer.updated", {}))).toBeNull();
  });
});

describe("extractOrganizationId", () => {
  it("prefers metadata.organization_id", () => {
    const event = fakeEvent("checkout.session.completed", {
      metadata: { organization_id: "org_1" },
      client_reference_id: "org_2",
    });
    expect(extractOrganizationId(event)).toBe("org_1");
  });

  it("falls back to client_reference_id", () => {
    const event = fakeEvent("checkout.session.completed", { client_reference_id: "org_2" });
    expect(extractOrganizationId(event)).toBe("org_2");
  });

  it("returns null when neither is present", () => {
    expect(extractOrganizationId(fakeEvent("invoice.paid", {}))).toBeNull();
  });
});
