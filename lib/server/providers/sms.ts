/**
 * FR-MSG-001: LINK/SeeMe SMS API integráció provider adapteren keresztül.
 * A "Vezetői döntés" (spec 0. rész, 19. sor) ezt a szolgáltatót jelöli ki --
 * ez NEM nyitott kérdés, mint az elmentve email-providere volt. A konkrét
 * mezőnevek/válaszformátum viszont a spec 18.4 hivatkozott dokumentációjából
 * jönne (LINK MyLINK SMS API, SeeMe SMS Gateway paraméterek), amihez még
 * nincs élő szerződés/API-hozzáférés (18.5 checklist, pipálatlan) -- ezért
 * ez az adapter egy ésszerű, szokásos HTTP+API-kulcs sémát követ, és éles
 * bekötés előtt a tényleges dokumentáció alapján finomítandó (l. README
 * "Nyitott döntések").
 *
 * A domainlogika (10.2 pont) nem függhet közvetlenül LINK-specifikus
 * mezőnevektől -- ezért a hívó kód csak ezt az interfészt ismeri.
 */
export interface SendSmsInput {
  to: string;
  body: string;
  /** Dedup-kulcs a szolgáltató felé -- retry ne duplikáljon küldést. */
  idempotencyKey: string;
}

export interface SendSmsResult {
  ok: boolean;
  providerReference: string | null;
  errorMessage: string | null;
  /** FR-MSG-007: átmeneti hiba újrapróbálható, végleges nem. */
  retryable: boolean;
}

export interface SmsProvider {
  send(input: SendSmsInput): Promise<SendSmsResult>;
}

export class LinkSeeMeSmsProvider implements SmsProvider {
  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string = "https://api.seeme.hu/v1",
  ) {}

  async send(input: SendSmsInput): Promise<SendSmsResult> {
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/sms`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": input.idempotencyKey,
        },
        body: JSON.stringify({ to: input.to, text: input.body }),
      });
    } catch (err) {
      // Hálózati hiba -- átmenetinek tekintjük, a hívó a 10.2 backoff-ütemezés
      // szerint próbálkozhat újra.
      return { ok: false, providerReference: null, errorMessage: String(err), retryable: true };
    }

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      // 4xx (pl. érvénytelen szám, feladó-korlát) végleges hiba, 5xx/429
      // átmeneti -- ugyanaz a felosztás, mint a spec 10.2 pontjában.
      const retryable = res.status >= 500 || res.status === 429;
      return {
        ok: false,
        providerReference: null,
        errorMessage: `seeme ${res.status}: ${body.slice(0, 500)}`,
        retryable,
      };
    }

    const data = (await res.json().catch(() => ({}))) as { id?: string };
    return { ok: true, providerReference: data.id ?? null, errorMessage: null, retryable: false };
  }
}

/** Fejlesztéshez/teszthez -- nem hív ki élő szolgáltatót. */
export class NullSmsProvider implements SmsProvider {
  async send(input: SendSmsInput): Promise<SendSmsResult> {
    return { ok: true, providerReference: `null-${input.idempotencyKey}`, errorMessage: null, retryable: false };
  }
}
