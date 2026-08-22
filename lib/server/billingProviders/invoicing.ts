/**
 * FR-BILL-004: sikeres fizetés után Billingo/Számlázz.hu számlaindítás.
 * A spec (7.1) mindkettőt megnevezi mint magyar számlázási adapter-jelölt,
 * nem dönt véglegesen egyik mellett sem -- ugyanúgy nyitott, mint a JAWAD
 * projektnél a Stripe/Barion választás volt. Ezért `InvoiceProvider`
 * interfész mögé kerül, Billingo alapértelmezett referencia-adapterrel
 * (jobban dokumentált nyilvános API), Számlázz.hu-ra váltás csak ezt a
 * fájlt érintené.
 */
export interface IssueInvoiceInput {
  organizationName: string;
  organizationTaxNumber: string | null;
  amountHuf: number;
  periodStart: string;
  periodEnd: string;
  idempotencyKey: string;
}

export interface IssueInvoiceResult {
  ok: boolean;
  providerInvoiceId: string | null;
  errorMessage: string | null;
}

export interface InvoiceProvider {
  issueInvoice(input: IssueInvoiceInput): Promise<IssueInvoiceResult>;
}

export class BillingoInvoiceProvider implements InvoiceProvider {
  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string = "https://api.billingo.hu/v3",
  ) {}

  async issueInvoice(input: IssueInvoiceInput): Promise<IssueInvoiceResult> {
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/documents`, {
        method: "POST",
        headers: {
          "X-API-KEY": this.apiKey,
          "Content-Type": "application/json",
          "Idempotency-Key": input.idempotencyKey,
        },
        body: JSON.stringify({
          partner_name: input.organizationName,
          partner_taxcode: input.organizationTaxNumber,
          net_total: input.amountHuf,
          fulfillment_date: input.periodEnd,
        }),
      });
    } catch (err) {
      return { ok: false, providerInvoiceId: null, errorMessage: String(err) };
    }

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, providerInvoiceId: null, errorMessage: `billingo ${res.status}: ${body.slice(0, 500)}` };
    }

    const data = (await res.json().catch(() => ({}))) as { id?: string };
    return { ok: true, providerInvoiceId: data.id ?? null, errorMessage: null };
  }
}

/** Fejlesztéshez/teszthez -- nem hív ki élő szolgáltatót. */
export class NullInvoiceProvider implements InvoiceProvider {
  async issueInvoice(input: IssueInvoiceInput): Promise<IssueInvoiceResult> {
    return { ok: true, providerInvoiceId: `null-${input.idempotencyKey}`, errorMessage: null };
  }
}
