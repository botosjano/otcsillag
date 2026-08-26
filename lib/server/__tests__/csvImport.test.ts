import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  parseCsvText,
  previewCsvImport,
  summarizePreview,
  commitCsvImport,
  type CsvFieldMapping,
} from "@/lib/server/csvImport";
import type { CreateReviewRequestInput, CreateReviewRequestResult } from "@/lib/server/dispatch";

describe("parseCsvText", () => {
  it("egyszerű, idézőjel nélküli sorokat helyesen bont", () => {
    const parsed = parseCsvText("Name,Phone,Email\nAnna,+36301234567,anna@example.hu\n");
    expect(parsed.headers).toEqual(["Name", "Phone", "Email"]);
    expect(parsed.rows).toEqual([["Anna", "+36301234567", "anna@example.hu"]]);
  });

  it("idézőjeles mezőben lévő vesszőt nem vág külön mezőre", () => {
    const parsed = parseCsvText('Name,Note\n"Kovács, Béla",note\n');
    expect(parsed.rows).toEqual([["Kovács, Béla", "note"]]);
  });

  it("escapelt \"\" idézőjelet egyetlen idézőjelként tartja meg", () => {
    const parsed = parseCsvText('Name,Note\n"Az ""Anna"" becenevén",x\n');
    expect(parsed.rows[0][0]).toBe('Az "Anna" becenevén');
  });

  it("idézőjelen belüli sortörést a mező részének tekinti", () => {
    const parsed = parseCsvText('Name,Note\nAnna,"sor1\nsor2"\n');
    expect(parsed.rows).toEqual([["Anna", "sor1\nsor2"]]);
  });

  it("CRLF sorvégeket ugyanúgy kezeli, mint az LF-et", () => {
    const parsed = parseCsvText("Name,Phone\r\nAnna,+36301234567\r\n");
    expect(parsed.rows).toEqual([["Anna", "+36301234567"]]);
  });

  it("záró üres sort nem ad hozzá a rows-hoz", () => {
    const parsed = parseCsvText("Name\nAnna\nBéla\n");
    expect(parsed.rows).toHaveLength(2);
  });

  it("záró sortörés nélküli fájlt is helyesen zár", () => {
    const parsed = parseCsvText("Name\nAnna");
    expect(parsed.rows).toEqual([["Anna"]]);
  });

  it("üres bemenetre üres fejléc- és sorlistát ad", () => {
    const parsed = parseCsvText("");
    expect(parsed.headers).toEqual([]);
    expect(parsed.rows).toEqual([]);
  });
});

const MAPPING: CsvFieldMapping = { firstName: "Name", phone: "Phone", email: "Email" };

describe("previewCsvImport", () => {
  it("érvényes sort telefonnal és/vagy emaillel normalizálva ad vissza", () => {
    const parsed = parseCsvText("Name,Phone,Email\nAnna,06301234567,ANNA@Example.hu\n");
    const [result] = previewCsvImport(parsed, MAPPING);
    expect(result).toEqual({
      row: 2,
      ok: true,
      contact: { firstName: "Anna", phone: "+36301234567", email: "anna@example.hu", externalId: undefined },
    });
  });

  it("hiányzó nevet 'missing_name' hibaként jelöl", () => {
    const parsed = parseCsvText("Name,Phone\n,+36301234567\n");
    const [result] = previewCsvImport(parsed, MAPPING);
    expect(result).toEqual({ row: 2, ok: false, issue: "missing_name" });
  });

  it("hiányzó telefon ÉS email esetén 'missing_contact_method'", () => {
    const parsed = parseCsvText("Name,Phone,Email\nAnna,,\n");
    const [result] = previewCsvImport(parsed, MAPPING);
    expect(result).toEqual({ row: 2, ok: false, issue: "missing_contact_method" });
  });

  it("érvénytelen telefonszámot 'invalid_phone'-ként jelöl, nem hagyja csendben null-ra esni", () => {
    const parsed = parseCsvText("Name,Phone,Email\nAnna,not-a-phone,\n");
    const [result] = previewCsvImport(parsed, MAPPING);
    expect(result).toEqual({ row: 2, ok: false, issue: "invalid_phone" });
  });

  it("érvénytelen emailt 'invalid_email'-ként jelöl", () => {
    const parsed = parseCsvText("Name,Phone,Email\nAnna,,not-an-email\n");
    const [result] = previewCsvImport(parsed, MAPPING);
    expect(result).toEqual({ row: 2, ok: false, issue: "invalid_email" });
  });

  it("a sorszám 1-alapú és a fejlécsort is számolja (2 = első adatsor)", () => {
    const parsed = parseCsvText("Name,Phone\nAnna,+36301234567\nBéla,+36309876543\n");
    const results = previewCsvImport(parsed, MAPPING);
    expect(results.map((r) => r.row)).toEqual([2, 3]);
  });

  it("case-insensitive fejléc-egyeztetés (a mapping és a CSV fejléce eltérő betűmérettel is)", () => {
    const parsed = parseCsvText("name,phone\nAnna,+36301234567\n");
    const [result] = previewCsvImport(parsed, MAPPING);
    expect(result.ok).toBe(true);
  });

  it("nem-mappelt external_id mezőt átveszi, ha meg van adva", () => {
    const parsed = parseCsvText("Name,Phone,ID\nAnna,+36301234567,CRM-42\n");
    const [result] = previewCsvImport(parsed, { ...MAPPING, externalId: "ID" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.contact.externalId).toBe("CRM-42");
  });
});

describe("summarizePreview", () => {
  it("típusonként összegez és total mezőt is ad", () => {
    const parsed = parseCsvText("Name,Phone\nAnna,+36301234567\n,\nBéla,+36309876543\n");
    const preview = previewCsvImport(parsed, MAPPING);
    const summary = summarizePreview(preview);
    expect(summary).toEqual({ valid: 2, missing_name: 1, total: 3 });
  });
});

describe("commitCsvImport", () => {
  function stubSupabase(): SupabaseClient {
    return {} as unknown as SupabaseClient;
  }

  it("csak az ÉRVÉNYES sorokra hívja a createRequest-et -- az érvénytelen sor be sem kerül a hívásba", async () => {
    const parsed = parseCsvText("Name,Phone\nAnna,+36301234567\n,\n");
    const createRequest = vi.fn(
      async (): Promise<CreateReviewRequestResult> => ({
        kind: "created",
        id: "req_1",
        status: "scheduled",
        scheduledAt: "2026-08-26T00:00:00.000Z",
      }),
    );

    const result = await commitCsvImport(
      stubSupabase(),
      {
        organizationId: "org_1",
        locationId: "loc_1",
        channel: "sms",
        source: "csv_import",
        parsed,
        mapping: MAPPING,
      },
      createRequest,
    );

    expect(createRequest).toHaveBeenCalledTimes(1);
    expect(result.rows).toEqual([
      { row: 2, status: "created", id: "req_1" },
      { row: 3, status: "missing_name" },
    ]);
    expect(result.summary).toEqual({ created: 1, missing_name: 1, total: 2 });
  });

  it("a createRequest cooldown/invalid_contact eredményét soronként adja tovább", async () => {
    const parsed = parseCsvText("Name,Phone\nAnna,+36301234567\nBéla,+36309876543\n");
    let call = 0;
    const createRequest = vi.fn(async (): Promise<CreateReviewRequestResult> => {
      call += 1;
      if (call === 1) return { kind: "cooldown", retryAfter: "2026-08-27T00:00:00.000Z" };
      return { kind: "invalid_contact" };
    });

    const result = await commitCsvImport(
      stubSupabase(),
      { organizationId: "org_1", locationId: "loc_1", channel: "sms", source: "csv_import", parsed, mapping: MAPPING },
      createRequest,
    );

    expect(result.rows).toEqual([
      { row: 2, status: "cooldown", retryAfter: "2026-08-27T00:00:00.000Z" },
      { row: 3, status: "invalid_contact" },
    ]);
  });

  it("egy sor kivétele NEM állítja meg a többi sor feldolgozását, és 'error' státuszként jelenik meg", async () => {
    const parsed = parseCsvText("Name,Phone\nAnna,+36301234567\nBéla,+36309876543\n");
    let call = 0;
    const createRequest = vi.fn(async (): Promise<CreateReviewRequestResult> => {
      call += 1;
      if (call === 1) throw new Error("db unavailable");
      return { kind: "created", id: "req_2", status: "scheduled", scheduledAt: "2026-08-26T00:00:00.000Z" };
    });

    const result = await commitCsvImport(
      stubSupabase(),
      { organizationId: "org_1", locationId: "loc_1", channel: "sms", source: "csv_import", parsed, mapping: MAPPING },
      createRequest,
    );

    expect(result.rows[0]).toEqual({ row: 2, status: "error", message: "db unavailable" });
    expect(result.rows[1]).toEqual({ row: 3, status: "created", id: "req_2" });
  });

  it("a createRequest hívást a helyes CreateReviewRequestInput alakkal kapja (contact/channel/source/externalId)", async () => {
    const parsed = parseCsvText("Name,Phone,ID\nAnna,+36301234567,CRM-9\n");
    let received: CreateReviewRequestInput | undefined;
    const createRequest = vi.fn(async (_supabase: SupabaseClient, input: CreateReviewRequestInput) => {
      received = input;
      return { kind: "created", id: "req_1", status: "scheduled", scheduledAt: "x" } as CreateReviewRequestResult;
    });

    await commitCsvImport(
      stubSupabase(),
      {
        organizationId: "org_1",
        locationId: "loc_1",
        channel: "sms",
        source: "csv_import",
        parsed,
        mapping: { ...MAPPING, externalId: "ID" },
      },
      createRequest,
    );

    expect(received).toEqual({
      organizationId: "org_1",
      locationId: "loc_1",
      contact: { firstName: "Anna", phone: "+36301234567", email: undefined },
      channel: "sms",
      source: "csv_import",
      externalId: "CRM-9",
    });
  });
});
