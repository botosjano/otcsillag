import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/server/supabase";
import { handleProviderCallback } from "@/lib/server/webhookRoute";
import { normalizeMyLinkEmailPayload } from "@/lib/server/providers/emailWebhook";

export const runtime = "nodejs";

/** 9.4 /webhooks/providers/link/email -- MyLINK delivered/bounce/open/click. */
export async function POST(request: NextRequest) {
  const secret = process.env.MYLINK_EMAIL_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ code: "not_configured", message: "MYLINK_EMAIL_WEBHOOK_SECRET hiányzik." }, { status: 503 });
  }

  const rawBody = await request.text();
  const result = await handleProviderCallback(createServiceRoleClient(), {
    integration: "mylink-email",
    secret,
    rawBody,
    signatureHeader: request.headers.get("x-mylink-signature"),
    normalize: normalizeMyLinkEmailPayload,
  });

  switch (result.outcome) {
    case "invalid_signature":
      return NextResponse.json({ code: "invalid_signature", message: "Érvénytelen aláírás." }, { status: 401 });
    case "unparseable":
      return NextResponse.json({ code: "unparseable", message: "Ismeretlen payload-formátum." }, { status: 400 });
    case "unknown_message":
      return NextResponse.json({ code: "unknown_message" }, { status: 200 });
    case "duplicate":
      return NextResponse.json({ code: "duplicate" }, { status: 200 });
    case "processed":
      return NextResponse.json({ code: "processed" }, { status: 200 });
  }
}
