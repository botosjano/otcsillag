import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/server/supabase";
import { handleProviderCallback } from "@/lib/server/webhookRoute";
import { normalizeSeeMeDlrPayload } from "@/lib/server/providers/smsWebhook";

export const runtime = "nodejs";

/** 9.4 /webhooks/providers/link/sms -- LINK/SeeMe DLR/MO canonical esemény. */
export async function POST(request: NextRequest) {
  const secret = process.env.LINK_SEEME_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ code: "not_configured", message: "LINK_SEEME_WEBHOOK_SECRET hiányzik." }, { status: 503 });
  }

  const rawBody = await request.text();
  const result = await handleProviderCallback(createServiceRoleClient(), {
    integration: "link-seeme-sms",
    secret,
    rawBody,
    signatureHeader: request.headers.get("x-seeme-signature"),
    normalize: normalizeSeeMeDlrPayload,
  });

  switch (result.outcome) {
    case "invalid_signature":
      return NextResponse.json({ code: "invalid_signature", message: "Érvénytelen aláírás." }, { status: 401 });
    case "unparseable":
      return NextResponse.json({ code: "unparseable", message: "Ismeretlen payload-formátum." }, { status: 400 });
    case "unknown_message":
      // Nem hiba a provider felé -- lehet, hogy egy másik környezet
      // (dev/staging) DLR-je jött be. 200-at adunk, hogy ne próbálkozzon
      // vég nélkül újra.
      return NextResponse.json({ code: "unknown_message" }, { status: 200 });
    case "duplicate":
      return NextResponse.json({ code: "duplicate" }, { status: 200 });
    case "processed":
      return NextResponse.json({ code: "processed" }, { status: 200 });
  }
}
