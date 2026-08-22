import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/server/supabase";
import { buildBillingProvider } from "@/lib/server/billingDeps";
import { requireDefaultOrganizationId } from "@/lib/server/env";

export const runtime = "nodejs";

/** FR-BILL-002: hosted checkout indítása egy csomagra. */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { plan_key?: string };
  if (!body.plan_key) {
    return NextResponse.json({ code: "invalid_body", message: "plan_key kötelező." }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const organizationId = requireDefaultOrganizationId();

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("provider_customer_id")
    .eq("organization_id", organizationId)
    .neq("status", "cancelled")
    .maybeSingle();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.otcsillag.hu";
  const provider = buildBillingProvider();
  const session = await provider.createCheckoutSession({
    organizationId,
    planKey: body.plan_key,
    customerId: subscription?.provider_customer_id ?? null,
    successUrl: `${appUrl}/app/beallitasok?checkout=success`,
    cancelUrl: `${appUrl}/app/beallitasok?checkout=cancelled`,
  });

  return NextResponse.json({ url: session.url });
}
