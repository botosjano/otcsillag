import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/server/supabase";
import { buildBillingProvider, buildInvoiceProvider, invoicingProviderName } from "@/lib/server/billingDeps";
import { processStripeWebhookEvent } from "@/lib/server/billingWebhook";

export const runtime = "nodejs";

/** 9.4 /webhooks/payments/stripe -- Stripe signature ellenőrzés a hivatalos SDK-val. */
export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ code: "missing_signature" }, { status: 400 });
  }

  const rawBody = await request.text();
  const provider = buildBillingProvider();

  let event;
  try {
    event = provider.constructWebhookEvent(rawBody, signature);
  } catch (err) {
    return NextResponse.json({ code: "invalid_signature", message: String(err) }, { status: 400 });
  }

  const result = await processStripeWebhookEvent(
    createServiceRoleClient(),
    event,
    buildInvoiceProvider(),
    invoicingProviderName(),
  );

  return NextResponse.json({ code: result.outcome }, { status: 200 });
}
