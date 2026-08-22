/**
 * FR-MSG-002: email küldés provider adapteren keresztül. A "Vezetői döntés"
 * a MyLINK Email API-t jelöli ki (spec 7.1/18.4) -- ugyanaz a megjegyzés
 * vonatkozik rá, mint az SMS-adapterre (l. sms.ts fejrésze): a pontos API
 * séma élő dokumentáció/hozzáférés nélkül nem ismert, ez egy ésszerű
 * alapértelmezés, éles bekötés előtt finomítandó.
 */
export interface SendEmailInput {
  to: string;
  from: string;
  replyTo: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey: string;
}

export interface SendEmailResult {
  ok: boolean;
  providerReference: string | null;
  errorMessage: string | null;
  retryable: boolean;
}

export interface EmailProvider {
  send(input: SendEmailInput): Promise<SendEmailResult>;
}

export class MyLinkEmailProvider implements EmailProvider {
  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string = "https://api.mylink.hu/email/v1",
  ) {}

  async send(input: SendEmailInput): Promise<SendEmailResult> {
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": input.idempotencyKey,
        },
        body: JSON.stringify({
          to: input.to,
          from: input.from,
          reply_to: input.replyTo,
          subject: input.subject,
          html: input.html,
          text: input.text,
        }),
      });
    } catch (err) {
      return { ok: false, providerReference: null, errorMessage: String(err), retryable: true };
    }

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      const retryable = res.status >= 500 || res.status === 429;
      return {
        ok: false,
        providerReference: null,
        errorMessage: `mylink ${res.status}: ${body.slice(0, 500)}`,
        retryable,
      };
    }

    const data = (await res.json().catch(() => ({}))) as { id?: string };
    return { ok: true, providerReference: data.id ?? null, errorMessage: null, retryable: false };
  }
}

/** Fejlesztéshez/teszthez -- nem hív ki élő szolgáltatót. */
export class NullEmailProvider implements EmailProvider {
  async send(input: SendEmailInput): Promise<SendEmailResult> {
    return { ok: true, providerReference: `null-${input.idempotencyKey}`, errorMessage: null, retryable: false };
  }
}
