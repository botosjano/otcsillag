import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { isNewWebhookEvent } from "@/lib/server/webhookIdempotency";
import { normalizeStripeEvent, extractOrganizationId } from "@/lib/server/billingProviders/stripeWebhook";
import { nextSubscriptionStatus, type SubscriptionStatus } from "@/lib/server/subscriptionStatus";
import type { InvoiceProvider } from "@/lib/server/billingProviders/invoicing";

export type InvoicingProviderName = "billingo" | "szamlazz";

export type BillingWebhookResult =
  | { outcome: "duplicate" }
  | { outcome: "ignored_event_type" }
  | { outcome: "unknown_organization" }
  | { outcome: "processed"; status: SubscriptionStatus };

/**
 * FR-BILL-003: "Webhook alapján jogosultság és limitek frissítése." A teljes
 * webhook-hívást a `webhook_events` táblával dedupoljuk (ugyanaz a minta,
 * mint a messaging-webhookoknál, l. webhookRoute.ts), a Stripe event.id
 * a dedup-kulcs.
 */
export async function processStripeWebhookEvent(
  supabase: SupabaseClient,
  event: Stripe.Event,
  invoiceProvider: InvoiceProvider,
  invoicingProviderName: InvoicingProviderName,
): Promise<BillingWebhookResult> {
  const isNew = await isNewWebhookEvent(supabase, "stripe", event.id);
  if (!isNew) return { outcome: "duplicate" };

  const billingEvent = normalizeStripeEvent(event);
  if (!billingEvent) return { outcome: "ignored_event_type" };

  const organizationId = extractOrganizationId(event);
  if (!organizationId) return { outcome: "unknown_organization" };

  const { data: subscription, error: fetchError } = await supabase
    .from("subscriptions")
    .select("id, status, organization_id")
    .eq("organization_id", organizationId)
    .neq("status", "cancelled")
    .maybeSingle();
  if (fetchError) throw new Error(`processStripeWebhookEvent lookup failed: ${fetchError.message}`);
  if (!subscription) return { outcome: "unknown_organization" };

  const transition = nextSubscriptionStatus(subscription.status as SubscriptionStatus, billingEvent, new Date());
  const update: Record<string, unknown> = { status: transition.status, updated_at: new Date().toISOString() };
  if (transition.gracePeriodEndsAt === "clear") update.grace_period_ends_at = null;
  else if (transition.gracePeriodEndsAt !== null) update.grace_period_ends_at = transition.gracePeriodEndsAt;

  const { error: updateError } = await supabase.from("subscriptions").update(update).eq("id", subscription.id);
  if (updateError) throw new Error(`processStripeWebhookEvent update failed: ${updateError.message}`);

  if (billingEvent.type === "payment_succeeded") {
    await issueInvoiceForOrganization(
      supabase,
      organizationId,
      subscription.id,
      invoiceProvider,
      invoicingProviderName,
      event.id,
    );
  }

  return { outcome: "processed", status: transition.status };
}

/** FR-BILL-004: sikeres fizetés után számlaindítás -- idempotens a Stripe event.id-vel. */
async function issueInvoiceForOrganization(
  supabase: SupabaseClient,
  organizationId: string,
  subscriptionId: string,
  invoiceProvider: InvoiceProvider,
  invoicingProviderName: InvoicingProviderName,
  stripeEventId: string,
): Promise<void> {
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", organizationId)
    .single();
  if (orgError) throw new Error(`issueInvoiceForOrganization org lookup failed: ${orgError.message}`);

  const { data: sub, error: subError } = await supabase
    .from("subscriptions")
    .select("current_period_start, current_period_end, plan_id, plans(monthly_price_huf)")
    .eq("id", subscriptionId)
    .single();
  if (subError) throw new Error(`issueInvoiceForOrganization subscription lookup failed: ${subError.message}`);
  const plan = sub.plans as unknown as { monthly_price_huf: number };

  const result = await invoiceProvider.issueInvoice({
    organizationName: org.name,
    organizationTaxNumber: null,
    amountHuf: plan.monthly_price_huf,
    periodStart: sub.current_period_start,
    periodEnd: sub.current_period_end,
    idempotencyKey: `stripe-${stripeEventId}`,
  });

  await supabase.from("invoices").insert({
    organization_id: organizationId,
    subscription_id: subscriptionId,
    amount_huf: plan.monthly_price_huf,
    period_start: sub.current_period_start,
    period_end: sub.current_period_end,
    invoicing_provider: invoicingProviderName,
    invoicing_status: result.ok ? "issued" : "failed",
    invoicing_reference: result.providerInvoiceId,
  });
}
