import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/server/supabase";
import { requireDefaultOrganizationId } from "@/lib/server/env";
import { parseCsvText, previewCsvImport, summarizePreview, commitCsvImport, type CsvFieldMapping } from "@/lib/server/csvImport";

export const runtime = "nodejs";

type Mapping = { first_name: string; phone?: string; email?: string; external_id?: string };

type Body = {
  location_id: string;
  channel?: "sms" | "email";
  csv: string;
  mapping: Mapping;
  mode?: "preview" | "commit";
  source?: string;
};

function json(status: number, body: unknown) {
  return NextResponse.json(body, { status });
}

function toMapping(m: Mapping): CsvFieldMapping {
  return { firstName: m.first_name, phone: m.phone, email: m.email, externalId: m.external_id };
}

/**
 * FR-CSV-001 -- CSV-előnézet, mezőpárosítás és soronkénti hibariport.
 * `mode: "preview"` (alap): parszol + validál, NEM ír az adatbázisba -- ez
 * adja a "nézd át mielőtt elküldöd" előnézetet. `mode: "commit"`: minden
 * érvényes sorra ténylegesen létrehozza a review_request-et, ugyanazon a
 * `createReviewRequest` útvonalon, mint a kézi/webhook-kérés (l.
 * lib/server/csvImport.ts).
 *
 * Egyszerű, single-tenant MVP (l. lib/server/env.ts): nincs Bearer API-kulcs
 * hitelesítés -- ez a réteg (FR-API-001) egy másik, még nyitott ágon készül,
 * ettől függetlenül épült, hogy ne blokkolja egymást a két munka.
 */
export async function POST(request: NextRequest) {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return json(400, { code: "invalid_body", message: "Érvénytelen JSON." });
  }

  if (!body.location_id || !body.csv || !body.mapping?.first_name) {
    return json(400, { code: "invalid_body", message: "location_id, csv és mapping.first_name kötelező." });
  }

  const mode = body.mode ?? "preview";
  if (mode === "commit" && !body.channel) {
    return json(400, { code: "invalid_body", message: "channel kötelező commit módban." });
  }

  const parsed = parseCsvText(body.csv);
  if (parsed.headers.length === 0) {
    return json(422, { code: "empty_csv", message: "A CSV üres vagy nem tartalmaz fejlécsort." });
  }

  const mapping = toMapping(body.mapping);

  if (mode === "preview") {
    const preview = previewCsvImport(parsed, mapping);
    return json(200, { mode: "preview", rows: preview, summary: summarizePreview(preview) });
  }

  const supabase = createServiceRoleClient();
  const organizationId = requireDefaultOrganizationId();

  const result = await commitCsvImport(supabase, {
    organizationId,
    locationId: body.location_id,
    channel: body.channel as "sms" | "email",
    source: body.source ?? "csv_import",
    parsed,
    mapping,
  });

  return json(200, { mode: "commit", ...result });
}
