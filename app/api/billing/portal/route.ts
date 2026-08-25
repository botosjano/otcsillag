import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/server/supabase";
import { buildBillingProvider } from "@/lib/server/billingDeps";
import { requireDefaultOrganizationId } from "@/lib/server/env";

export const runtime = "nodejs";

/** FR-BILL-002: customer portal (számla-előzmény, fizetési mód csere, lemondás). */
export async function POST() {
  const supabase = createServiceRoleClient();
  const organizationId = requireDefaultOrganizationId();

  const { data: subscription, error } = await supabase
    .from("subscriptions")
    .select("provider_customer_id")
    .eq("organization_id", organizationId)
    .neq("status", "cancelled")
    .maybeSingle();
  if (error) throw new Error(`billing/portal lookup failed: ${error.message}`);
  if (!subscription?.provider_customer_id) {
    return NextResponse.json(
      { code: "no_customer", message: "Nincs még Stripe-ügyfél ehhez a szervezethez." },
      { status: 409 },
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.otcsillag.hu";
  const provider = buildBillingProvider();
  const session = await provider.createPortalSession({
    customerId: subscription.provider_customer_id,
    returnUrl: `${appUrl}/app/beallitasok`,
  });

  return NextResponse.json({ url: session.url });
}
