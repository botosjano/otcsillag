import type Stripe from "stripe";
import type { BillingEvent } from "@/lib/server/subscriptionStatus";

/**
 * Stripe canonikus esemény-típusait fordítja a rendszer saját, provider-
 * független `BillingEvent`-jére (l. subscriptionStatus.ts) -- a domainlogika
 * nem függhet közvetlenül Stripe-specifikus event-nevektől, ugyanaz az elv,
 * mint a messaging-modul provider-webhookjainál (spec 8.5).
 */
export function normalizeStripeEvent(event: Stripe.Event): BillingEvent | null {
  switch (event.type) {
    case "invoice.paid":
    case "checkout.session.completed":
      return { type: "payment_succeeded" };
    case "invoice.payment_failed":
      return { type: "payment_failed" };
    case "customer.subscription.deleted":
      return { type: "subscription_cancelled" };
    default:
      return null;
  }
}

export function extractOrganizationId(event: Stripe.Event): string | null {
  const obj = event.data.object as { metadata?: Record<string, string>; client_reference_id?: string };
  return obj.metadata?.organization_id ?? obj.client_reference_id ?? null;
}
