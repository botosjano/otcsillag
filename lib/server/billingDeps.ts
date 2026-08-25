import { StripeBillingProvider, type BillingProvider } from "@/lib/server/billingProviders/stripe";
import {
  BillingoInvoiceProvider,
  NullInvoiceProvider,
  type InvoiceProvider,
} from "@/lib/server/billingProviders/invoicing";
import type { InvoicingProviderName } from "@/lib/server/billingWebhook";

export function buildBillingProvider(): BillingProvider {
  const apiKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!apiKey || !webhookSecret) {
    throw new Error("STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET hiányzik -- l. README Nyitott döntések.");
  }
  const priceIdByPlanKey = {
    starter: process.env.STRIPE_PRICE_STARTER ?? "",
    pro: process.env.STRIPE_PRICE_PRO ?? "",
  };
  return new StripeBillingProvider(apiKey, webhookSecret, priceIdByPlanKey);
}

export function buildInvoiceProvider(): InvoiceProvider {
  const apiKey = process.env.BILLINGO_API_KEY;
  return apiKey ? new BillingoInvoiceProvider(apiKey) : new NullInvoiceProvider();
}

export function invoicingProviderName(): InvoicingProviderName {
  return (process.env.INVOICING_PROVIDER as InvoicingProviderName) ?? "billingo";
}
