import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeEmail, normalizePhone } from "@/lib/server/normalize";
import { createReviewRequest, type Channel } from "@/lib/server/dispatch";

/**
 * FR-CSV-001 -- CSV-előnézet, mezőpárosítás és soronkénti hibariport (spec
 * 5.3, FR-REQ-001 "kérés indítása ... CSV-ből"). A tenant a saját CRM/CSV
 * exportjának oszlopneveit adja meg (`mapping`), nem kell fix fejléc-formátum.
 */
export type CsvFieldMapping = {
  firstName: string;
  phone?: string;
  email?: string;
  externalId?: string;
};

export type ParsedCsv = { headers: string[]; rows: string[][] };

/**
 * Minimál RFC4180-szerű CSV-parszer (idézőjeles mezők, escapelt `""`,
 * vesszők/sortörések idézőjelben, CRLF/LF). Miért nincs külső könyvtár: a
 * bemenet mindig a tenant saját exportja (kis méret, ismert forma), és így
 * nulla új függőség kerül be egy olyan rétegbe, ahol egy rossz sorolvasás
 * rossz címzettet jelentene (pénzügyi/kommunikációs hatás).
 */
export function parseCsvText(raw: string): ParsedCsv {
  const text = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += ch;
      i += 1;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (ch === ",") {
      pushField();
      i += 1;
      continue;
    }
    if (ch === "\n") {
      pushRow();
      i += 1;
      continue;
    }
    field += ch;
    i += 1;
  }
  // Az utolsó mező/sor csak akkor kerül be, ha a fájl nem záró üres sorral
  // végződik -- különben egy extra üres sor kerülne a rows végére.
  if (field.length > 0 || row.length > 0) pushRow();

  const nonEmpty = rows.filter((r) => !(r.length === 1 && r[0] === ""));
  const [headerRow, ...dataRows] = nonEmpty;
  return { headers: (headerRow ?? []).map((h) => h.trim()), rows: dataRows };
}

function headerIndex(headers: string[], name?: string): number {
  if (!name) return -1;
  return headers.findIndex((h) => h.toLowerCase() === name.toLowerCase());
}

function cell(row: string[], idx: number): string {
  return idx >= 0 ? (row[idx] ?? "").trim() : "";
}

export type RowIssue = "missing_name" | "missing_contact_method" | "invalid_phone" | "invalid_email";

export type CsvRowPreview =
  | {
      row: number;
      ok: true;
      contact: { firstName: string; phone: string | null; email: string | null; externalId?: string };
    }
  | { row: number; ok: false; issue: RowIssue };

/**
 * Előnézet: parszolás + validáció, ADATBÁZIS-ÍRÁS NÉLKÜL -- ez adja a
 * "nézd át mielőtt elküldöd" előnézetet és a soronkénti hibariportot.
 * A `row` szám 1-alapú és a fejlécsort is számolja (2 = az első adatsor),
 * hogy a felhasználó a saját CSV-jében ugyanazt a sorszámot lássa.
 */
export function previewCsvImport(parsed: ParsedCsv, mapping: CsvFieldMapping): CsvRowPreview[] {
  const nameIdx = headerIndex(parsed.headers, mapping.firstName);
  const phoneIdx = headerIndex(parsed.headers, mapping.phone);
  const emailIdx = headerIndex(parsed.headers, mapping.email);
  const externalIdx = headerIndex(parsed.headers, mapping.externalId);

  return parsed.rows.map((raw, i) => {
    const row = i + 2;
    const firstName = cell(raw, nameIdx);
    const rawPhone = cell(raw, phoneIdx);
    const rawEmail = cell(raw, emailIdx);
    const externalId = externalIdx >= 0 ? cell(raw, externalIdx) || undefined : undefined;

    if (!firstName) return { row, ok: false, issue: "missing_name" };

    const phone = rawPhone ? normalizePhone(rawPhone) : null;
    if (rawPhone && !phone) return { row, ok: false, issue: "invalid_phone" };

    const email = rawEmail ? normalizeEmail(rawEmail) : null;
    if (rawEmail && !email) return { row, ok: false, issue: "invalid_email" };

    if (!phone && !email) return { row, ok: false, issue: "missing_contact_method" };

    return { row, ok: true, contact: { firstName, phone, email, externalId } };
  });
}

export function summarizePreview(preview: CsvRowPreview[]): Record<string, number> {
  const summary = preview.reduce<Record<string, number>>((acc, r) => {
    const key = r.ok ? "valid" : r.issue;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  summary.total = preview.length;
  return summary;
}

export type CsvCommitRowResult =
  | { row: number; status: "created" | "idempotent_replay"; id: string }
  | { row: number; status: "cooldown"; retryAfter: string }
  | { row: number; status: RowIssue | "invalid_contact" }
  | { row: number; status: "error"; message: string };

export type CommitCsvImportInput = {
  organizationId: string;
  locationId: string;
  channel: Channel;
  source: string;
  parsed: ParsedCsv;
  mapping: CsvFieldMapping;
};

type CreateReviewRequestFn = typeof createReviewRequest;

/**
 * A ténylegesen küldendő sorokat UGYANAZON a `createReviewRequest`
 * útvonalon viszi át, mint a kézi/webhook-kérés (FR-REQ-001 három belépési
 * pontja közös motorra épül) -- kontakt-upsert, FR-REQ-002 cooldown, minden
 * ugyanúgy érvényes.
 *
 * SZÁNDÉKOSAN SOROS (nem Promise.all): ha a CSV-ben ugyanaz a kontakt/
 * telephely kombináció többször szerepel, a soros feldolgozás a 2. sortól a
 * cooldownt a VALÓSAN LÉTREJÖTT első kéréshez képest látja -- párhuzamosítva
 * ez versenyhelyzet lenne (mindkettő "created"-et kapna).
 */
export async function commitCsvImport(
  supabase: SupabaseClient,
  input: CommitCsvImportInput,
  createRequest: CreateReviewRequestFn = createReviewRequest,
): Promise<{ rows: CsvCommitRowResult[]; summary: Record<string, number> }> {
  const preview = previewCsvImport(input.parsed, input.mapping);
  const results: CsvCommitRowResult[] = [];

  for (const item of preview) {
    if (!item.ok) {
      results.push({ row: item.row, status: item.issue });
      continue;
    }
    try {
      const result = await createRequest(supabase, {
        organizationId: input.organizationId,
        locationId: input.locationId,
        contact: {
          firstName: item.contact.firstName,
          phone: item.contact.phone ?? undefined,
          email: item.contact.email ?? undefined,
        },
        channel: input.channel,
        source: input.source,
        externalId: item.contact.externalId,
      });
      if (result.kind === "cooldown") {
        results.push({ row: item.row, status: "cooldown", retryAfter: result.retryAfter });
      } else if (result.kind === "invalid_contact") {
        results.push({ row: item.row, status: "invalid_contact" });
      } else {
        results.push({ row: item.row, status: result.kind, id: result.id });
      }
    } catch (err) {
      results.push({ row: item.row, status: "error", message: err instanceof Error ? err.message : String(err) });
    }
  }

  const summary = results.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});
  summary.total = results.length;

  return { rows: results, summary };
}
