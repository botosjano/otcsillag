/**
 * FR-BILL-002: hosted checkout + customer portal. Stripe a spec referencia-
 * választása (7.1: "Stripe Billing; Barion opció") -- a hivatalos `stripe`
 * npm csomagot használjuk, NEM saját HTTP-hívást, mert a webhook-aláírás-
 * ellenőrzésnél (`stripe.webhooks.constructEvent`) ez a biztonságos,
 * hivatalosan karbantartott út, ellentétben a LINK/SeeMe és MyLINK
 * adapterekkel, ahol nincs hivatalos Node SDK.
 */
import Stripe from "stripe";

export interface BillingProvider {
  createCheckoutSession(input: {
    organizationId: string;
    planKey: string;
    customerId: string | null;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ url: string }>;

  createPortalSession(input: { customerId: string; returnUrl: string }): Promise<{ url: string }>;

  constructWebhookEvent(rawBody: string, signatureHeader: string): Stripe.Event;
}

export class StripeBillingProvider implements BillingProvider {
  private readonly client: Stripe;

  constructor(
    apiKey: string,
    private readonly webhookSecret: string,
    private readonly priceIdByPlanKey: Record<string, string>,
  ) {
    this.client = new Stripe(apiKey);
  }

  async createCheckoutSession(input: {
    organizationId: string;
    planKey: string;
    customerId: string | null;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ url: string }> {
    const priceId = this.priceIdByPlanKey[input.planKey];
    if (!priceId) throw new Error(`ismeretlen plan_key -> Stripe price mapping hiányzik: ${input.planKey}`);

    const session = await this.client.checkout.sessions.create({
      mode: "subscription",
      customer: input.customerId ?? undefined,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      client_reference_id: input.organizationId,
      metadata: { organization_id: input.organizationId },
    });
    if (!session.url) throw new Error("Stripe checkout session nem adott vissza url-t");
    return { url: session.url };
  }

  async createPortalSession(input: { customerId: string; returnUrl: string }): Promise<{ url: string }> {
    const session = await this.client.billingPortal.sessions.create({
      customer: input.customerId,
      return_url: input.returnUrl,
    });
    return { url: session.url };
  }

  constructWebhookEvent(rawBody: string, signatureHeader: string): Stripe.Event {
    return this.client.webhooks.constructEvent(rawBody, signatureHeader, this.webhookSecret);
  }
}
