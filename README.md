# Ötcsillag

Mobil-first magyar B2B SaaS: a vállalkozó néhány érintéssel küld Google-értékeléskérést
SMS-ben vagy e-mailben, majd látja a kézbesítést és a kattintást.

> A jó munkád ötcsillagos nyomot hagy.

Spec: `docs/csillagflow-reszletes-fejlesztesi-specifikacio.md` · Visual kit:
`docs/otcsillag-visual-kit/` (a marveen repóban).

## Stack

- **Next.js 16** (App Router, Turbopack) + **Tailwind v4**
- **Manrope** (latin-ext, magyar ő/ű)
- SMS/e-mail küldés + saját rövid-linkes kattintásmérés backend kész (l. lentebb); billing/integrációk — *következő szakasz*

## Design token rendszer (visual-direction v2)

| Szerep | Token | Érték |
| --- | --- | --- |
| Fő szöveg | `ink` | `#04345A` |
| Primer CTA / link | `blue` | `#007BC1` |
| Aktív / fényél | `cyan` | `#44E3EC` |
| Csillag / eredmény (NEM CTA) | `gold` | `#DFAE58` |
| Gyöngyház háttér | `page` | `#F4F7FF` |

CTA = ciánból mélykékbe futó gradiens. Arany **kizárólag** ratinghez/eredményhez.
Nincs neon/lila, sötét dashboard vagy dekoratív 3D UI.

## Animáció-stack (flotta-szabvány)

Minden webes projekt alapértelmezett animáció/scroll-stackje: **saját könnyű `Reveal`
(IntersectionObserver, 0 külső lib) + `lenis`** (Janos döntése, 2026-07-24) —
buttery-smooth momentum-görgetés + elemenként késleltetett (staggered) fade+slide-up
appear-animációk. **NEM `framer-motion`** (kevesebb JS, jobb Lighthouse).

- Új szekció/feature: **ezzel épül** (Lenis + IntersectionObserver Reveal, staggered
  CSS `transition-delay`).
- `prefers-reduced-motion` kötelező tisztelet.

## Fejlesztés

```bash
npm install
npm run dev        # http://localhost:3000
npm run build
npm run lint
npm test           # vitest, élő Supabase/provider nélkül fut
npm run typecheck
```

## Backend: kézbesítés + saját rövid-linkes kattintásmérés (kártya d72b7afd)

Forrás: `docs/csillagflow-reszletes-fejlesztesi-specifikacio.md` (marveen repo)
8-10-11. rész. Lásd `.env.example` a szükséges környezeti változókért.

### Amit ez a kártya lefed

- `supabase/migrations/0001_delivery_tracking.sql` — teljes adatmodell a
  messaging+tracking modulhoz (`organizations`/`locations`/`contacts`
  minimál-készlettel, `review_requests`, `messages`, `message_events`,
  `short_links`, `click_events`, `webhook_events`, `suppression_entries`),
  RLS bekapcsolva minden táblán (fail-closed, amíg az Identity-modul nincs
  megírva).
- `lib/server/providers/{sms,email}.ts` — `SmsProvider`/`EmailProvider`
  interfész, `LinkSeeMeSmsProvider`/`MyLinkEmailProvider` adapter (a "Vezetői
  döntés" e két szolgáltatót jelöli ki, spec 0./7.1/18.4 rész) +
  `Null*Provider` dev/tesztre.
- `lib/server/dispatch.ts` — `createReviewRequest` (kontakt upsert, FR-CON-002
  normalizálás, FR-REQ-002 cooldown, Idempotency-Key dedup) +
  `dispatchScheduledMessage` (suppression-ellenőrzés, rövid link generálás
  KÜLDÉS pillanatában -- a hash-only tárolás miatt nem kell visszafejthető
  köztes állapot, provider submit).
- `lib/server/canonicalStatus.ts` + `lib/server/messageEvents.ts` -- FR-MSG-004
  idempotens DLR-feldolgozás, spec 10.2 out-of-order szabály (monotonikus
  rang + occurred_at), ez adja a Timeline komponens invariánsát
  (`components/app/Timeline.tsx`: "időrend stabil, kattintás után nincs
  visszaírás").
- `app/r/[token]/route.ts` -- 9.5 publikus rövid-link redirect + kattintás
  rögzítés.
- `app/api/review-requests/*` -- 9.2/9.3 kérés létrehozás/lekérdezés/cancel.
- `app/api/webhooks/providers/link/{sms,email}/route.ts` -- 9.4 provider
  callback végpontok, HMAC-aláírás-ellenőrzéssel (`lib/server/signature.ts`)
  és teljes-hívás idempotenciával (`webhook_events`).
- `app/api/cron/dispatch/route.ts` -- 10.1 message.dispatch + BOUNDED
  request.evaluate_reminder (10.3 szabály, `lib/server/reminders.ts`): a
  reminder-döntés (stop/expire/enqueue/pause) meg van írva és tesztelve, de a
  tényleges emlékeztető-üzenet KIKÜLDÉSE (csendes időszak, szervezeti
  időzóna) nincs bekötve -- ez `reminder_count`-ot léptet, a valódi
  send-pipeline hívása külön, kisebb kártya.

### Amit ez a kártya NEM fed le (más kártyák dolga)

- Identity/Org/Auth (FR-AUTH-*, FR-ORG-*) -- emiatt a `review-requests`
  API-nak jelenleg NINCS Bearer API-kulcs/session-auth, egyetlen szervezetet
  feltételez (`OTCSILLAG_DEFAULT_ORGANIZATION_ID`). Az Integrations kártya
  (f4e5bb99) hozza az `api_keys`/scope-modellt.
- Billing/usage (kártya 3a9a231f) -- `subscriptionCanSend`/`usageWithinLimit`
  jelenleg mindig `true` a cronban.
- CSV-import, natív connectorok, Google review-szinkron (FR-CSV-*, 5.7).
- Templates szerkesztő UI-hoz kötése (a `lib/server/dispatchDeps.ts`-ben egy
  bedrótozott alap SMS/email sablon van, 18.2/18.3 szerint).
- Csendes időszak (FR-MSG-005) és szervezeti időzóna a tényleges küldésnél.
- A dashboard "Új kérés" form valós adatra kötése (jelenleg `lib/mockData.ts`
  mock-ot használ) -- ez a meglévő UI-kártyák API-ra kötése, külön feladat.

### Nyitott döntések / blokkolók éles indulás előtt

1. **Supabase projekt** -- jelenleg nincs Supabase projekt az Ötcsillaghoz.
   Kell egy, rajta lefuttatva `0001_delivery_tracking.sql`.
2. **LINK/SeeMe és MyLINK Email API-hozzáférés** -- a "Vezetői döntés" a
   szolgáltatót kijelöli, de a 18.5 checklist szerint a szerződés/API-kulcs
   még nincs meg. Az adapterek (`lib/server/providers/{sms,email}.ts`) egy
   ésszerű, szokásos HTTP+Bearer+Idempotency-Key sémát követnek -- éles
   bekötés előtt a tényleges API-dokumentáció (LINK MyLINK SMS/Email API,
   SeeMe SMS Gateway paraméterek) alapján finomítandók (mezőnevek,
   válaszformátum). Ugyanez igaz a webhook-normalizálókra
   (`lib/server/providers/{sms,email}Webhook.ts`) és az aláírás-sémára
   (`lib/server/signature.ts` -- jelenleg egy generikus HMAC-SHA256 hex,
   pontos fejlécnevek/kódolás a valós dokumentáció alapján pontosítandó).
3. **Ütemező-infra** -- `POST /api/cron/dispatch` kész, de nincs bekötve
   tényleges cronhoz (pl. Vercel Cron `vercel.json`-ban, vagy egy külön
   ütemező) -- ez hosting-döntés kérdése.
4. **Review URL formátum-validáció írás oldalon (FR-LOC-002)** -- a
   `locations.review_url`-t ez a kártya csak OLVASSA (a short-link
   destination-jeként); a telephely-szerkesztő UI+validáció külön kártya
   (Onboarding & Configuration modul).
5. **`review_requests` csatorna-mező** -- jelenleg a csatornát (sms/email) a
   hívó adja meg minden dispatch-híváskor, nincs saját oszlopa a
   `review_requests` táblán; a cron ezért egyelőre `"sms"`-t feltételez a
   lejárt ütemezéseknél (l. `app/api/cron/dispatch/route.ts` megjegyzése) --
   apró migráció kellene egy `channel` oszlop hozzáadásához, ha ez éles
   probléma.

## Backend: előfizetés + számlázás (kártya 3a9a231f)

Forrás: spec 3. és 5.6 rész. Erre a kártyára épül a `feat/billing-subscriptions`
ág a `feat/delivery-tracking-backend` (PR#11, `0001_delivery_tracking.sql`)
tetején -- ugyanaz a mintázat, mint az elmentve-projektben a PR#15/PR#13 közti
függés.

### Amit ez a kártya lefed

- `supabase/migrations/0002_billing.sql` -- `plans` (3.1 csomagkatalógus,
  DB-konfigurálható, NEM kódba égetve -- Próba/Starter/Pro seedelve, Partner
  admin/SQL-lel vihető fel), `subscriptions` (FR-BILL-001 állapotgép,
  szervezetenként egy aktív előfizetés), `usage_ledger` (append-only
  fogyasztás-napló), `invoices` (FR-BILL-004 számlaindítás-állapot).
- `lib/server/subscriptionStatus.ts` -- tiszta állapotgép-függvények
  (FR-BILL-001/006): `nextSubscriptionStatus` (fizetési esemény -> új
  státusz + grace period), `shouldSuspendForExpiredGrace` (idő-alapú
  felfüggesztés-döntés a cron számára).
- `lib/server/usageLedger.ts` -- FR-BILL-005 túlfogyasztás-számítás +
  3.3 "SMS-költségvédelem" küldés-előtti kapu (`canSendWithinOrOverLimit`) --
  TISZTA számoló-függvények, adatbázis-hívás nélkül.
- `lib/server/sendAllowance.ts` -- a 3.3 kapu tényleges BEKÖTÉSE: összeszedi
  az előfizetést, a csomag-limiteket és az időszaki usage-t, és a
  `dispatchScheduledMessage` a claim után, a provider-hívás ELŐTT ezen áll
  meg. (A kapu korábban meg volt írva, de alkalmazáskód sehol nem hívta,
  tehát a valóságban nem védett semmit -- Elemér PR#12-review-ja.)
- `lib/server/billingProviders/stripe.ts` -- `BillingProvider` a hivatalos
  `stripe` npm csomaggal (checkout session, customer portal, webhook-
  aláírás-ellenőrzés a Stripe SDK saját `constructEvent`-jével -- ez itt
  NEM saját HMAC-implementáció, mert van hivatalos, karbantartott SDK,
  ellentétben a LINK/SeeMe és MyLINK adapterekkel).
- `lib/server/billingProviders/invoicing.ts` -- `InvoiceProvider` interfész,
  `BillingoInvoiceProvider` alapértelmezett (a spec Billingo/Számlázz.hu
  közt nem dönt, ugyanaz a nyitottság mint a JAWAD-projekt Stripe/Barion
  választásánál) + `NullInvoiceProvider` dev/tesztre.
- `app/api/billing/{checkout,portal}/route.ts` -- FR-BILL-002 hosted
  checkout + customer portal indítás.
- `app/api/webhooks/stripe/route.ts` -- FR-BILL-003 jogosultság/limit
  frissítés Stripe webhookból, FR-BILL-004 számlaindítás sikeres fizetés
  után (idempotens, a Stripe `event.id`-vel).
- `app/api/cron/billing-sweep/route.ts` -- FR-BILL-006 grace period lejárta
  utáni felfüggesztés (időalapú, cron-hívású, nem webhook-triggerelt).
- `app/api/usage/route.ts` -- 9.2 `GET /usage` + FR-DASH-004 (jelenlegi
  időszak fogyasztása/limitje/túlfogyasztása).

### Amit ez a kártya NEM fed le

- API-kulcsok/scope-ok, Google-sync, CSV-import (Integrations kártya, f4e5bb99).
- A dashboard "Beállítások" UI valós billing-adatra kötése (jelenleg
  `lib/mockData.ts USAGE`-t használ).
- Barion adapter (a spec csak "opcióként" említi Stripe mellett -- ha Janos
  ezt választja egy konkrét ügyfélnél, a `BillingProvider` interfész mögé
  új adapter kerülne, a hívó kód nem változna).

### Nyitott döntések / blokkolók éles indulás előtt

1. **Stripe fiók + termék/ár-konfiguráció** -- a `STRIPE_PRICE_STARTER`/
   `STRIPE_PRICE_PRO` env-változók valós Stripe Price ID-kat várnak; ezek
   csak egy éles Stripe-fiókban, a csomagok Stripe-oldali létrehozása után
   léteznek.
2. **Billingo (vagy Számlázz.hu) fiók + API-kulcs** -- `BillingoInvoiceProvider`
   egy ésszerű, szokásos REST-sémát követ, éles hozzáférés/dokumentáció
   nélkül nem ellenőrizhető a pontos payload-forma.
3. **Grace period hossza** -- a spec nem ad meg számot, 7 nap az alapérték
   (`lib/server/subscriptionStatus.ts` `DEFAULT_GRACE_PERIOD_DAYS`),
   paraméterezhető, ha Janos mást szeretne.
   **Nyitott tervezői kérdés (Elemér PR#12-review-ja):** egy MÁR `past_due`
   előfizetésre érkező ÚJABB `payment_failed` (pl. Stripe smart-retry)
   jelenleg minden alkalommal újra +7 napra tolja a `grace_period_ends_at`-ot
   a hívás pillanatától. Ha a Stripe hetekig retry-zik, ez gyakorlatilag
   korlátlanul meghosszabbítja a türelmi időt. A másik olvasat: a türelmi idő
   az ELSŐ sikertelen fizetéstől számított fix ablak. A spec nem dönt, ezért
   ez ma tudatosan a "mindig +7 nap a legutóbbi hibától" ágon áll -- Janos
   döntése kell hozzá, mert bevételi hatása van.
4. **Ütemező-infra** -- `POST /api/cron/billing-sweep` ugyanarra a
   megoldatlan hosting-kérdésre vár, mint a `dispatch` cron (l. az előző
   szakasz 3. pontja).
5. **Napi usage-reconcile** (3.3: "Provider-billing eltérést napi usage
   reconcile folyamat jelezzen") -- nincs megírva; a `usage_ledger` a
   SAJÁT küldéseinket számolja, egy külön folyamat vetné össze a LINK/
   SeeMe és MyLINK tényleges számlázásával.

## Backend: integrációk (kártya f4e5bb99, folyamatban)

Forrás: spec 5.7, 8.2, 9.1, 11.4. Terv: `docs/otcsillag-integraciok-admin-terv-2026-08-25.md`
(marveen repo) -- a PR-bontás, a "mi van már meg" leltár és a nyitott kérdés
(hol éljen az `Idempotency-Key` TTL) ott részletezve.

### Amit ez a kártya EDDIG lefed (PR-A: FR-API-001)

- `supabase/migrations/0004_api_keys.sql` -- `api_keys` tábla (org_id, name,
  prefix, secret_hash, scopes, created_at, revoked_at, last_used_at), RLS
  bekapcsolva (l. a 0001 migráció fail-closed indoklása).
- `lib/server/apiKey.ts` -- kulcs-generálás (`csillag_live_{prefix}_{secret}`
  formátum, a `secret` a titok, csak SHA-256 hash-e tárolódik),
  `authenticateApiKey` (prefix-lookup + konstans idejű hash-összevetés +
  revoked-ellenőrzés + `last_used_at` frissítés), `hasScope` scope-ellenőrzés
  (`contacts:write`, `requests:write`, `requests:read`, `reports:read`).
- `app/api/admin/api-keys/{route.ts,[id]/revoke/route.ts}` -- létrehozás
  (a nyers kulcs KIZÁRÓLAG a létrehozás válaszában látszik), lista (hash
  nélkül) és visszavonás. **Ideiglenes védelem:** `x-admin-secret` fejléc +
  `ADMIN_API_SECRET` env, ugyanaz a minta mint a cron-endpointoknál -- ezt az
  Identity/Org modul (FR-AUTH-*/FR-ORG-*) vagy a platform-admin bejelentkezés
  (FR-ADM-*) váltja ki, amelyik előbb megérkezik.

### PR-B: FR-WH-001/002 (általános tenant-webhook + Idempotency-Key)

- `supabase/migrations/0005_idempotency_keys.sql` -- külön `idempotency_keys`
  tábla (org_id, key, status, response_status, response_body, created_at),
  RLS bekapcsolva. Külön a meglévő `webhook_events`-től (provider event ID
  dedup) és a `review_requests.idempotency_key`-től (domain-szintű, a sor
  JELENLEGI állapotát adja vissza) -- ez a réteg a PONTOS válasz-testet is
  visszajátssza, bármelyik jövőbeli tenant-végponthoz felhasználható.
- `lib/server/idempotency.ts` -- `beginIdempotentRequest`: `proceed` (friss
  kulcs, a hívó a végén `commit`-tal zárja le) / `replay` (24 órán belüli,
  lezárt kulcs -- pontosan az eredeti válasz) / `conflict` (ugyanaz a kulcs
  MÉG feldolgozás alatt, l. Stripe-mintájú idempotencia). A 24 óra lejárta
  után a kulcs atomikusan visszafoglalható (feltételes UPDATE, ugyanaz a
  minta mint a dispatch-claimnél, 0003 migráció).
- `app/api/webhooks/events/route.ts` -- 9.2 `POST /webhooks/events`: Bearer
  API-kulcs (`requests:write` scope) + KÖTELEZŐ `Idempotency-Key` fejléc.
  Tenant-izoláció: a `location_id`-t explicit ellenőrzi a hitelesített kulcs
  `organization_id`-je ellen, mielőtt bármit írna (11.1) -- ez az ELSŐ
  végpont, ahol a szervezet nem a fix env-defaultból jön, hanem a kulcsból,
  tehát ez a check ténylegesen számít, nem csak elméleti védelem.
  **NYITOTT FELTEVÉS (l. PR-leírás):** a generikus esemény ma a
  review-request létrehozás payloadját veszi át (`createReviewRequest`
  újrahasznosításával) -- a spec nem ír le konkrét payload-sémát egy
  "generikus üzleti eseményhez", ez az egyetlen olyan művelet, amit a
  rendszer ma végponttól végpontig ismer.

### Amit ez a kártya MÉG NEM fed le

- FR-ADM-001/002/003 (admin áttekintő, PR-C, a PR#12 usage-ledgerére épül),
  FR-INT-001 (Make-recipe doksi, PR-D). Bontás és sorrend a terv-dokumentumban.
- Az `authenticateApiKey`-t még csak a `/webhooks/events` route hívja. A 9.2
  tábla többi publikus tenant-végpontja (`/contacts`, `/review-requests/{id}`
  stb.) jelenleg csak a fix env-default szervezetet szolgálja ki -- ha ezek
  is API-kulcsos hitelesítést kapnak, ugyanezt a `authenticateApiKey`+scope
  mintát kell rájuk is bekötni (l. spec 9.1 "külső integráció Bearer
  API-kulccsal").

## Állapot

- [x] Kártya 26-32 — teljes UI (landing, áttekintő, új kérés, kérések+részlet, sablonok/usage, mobil)
- [x] Kártya 33 (d72b7afd) — SMS/e-mail kézbesítés + saját rövid-linkes kattintásmérés backend
- [x] Kártya 34 (3a9a231f) — előfizetés + számlázás (billing) backend
- [ ] Kártya 35 (f4e5bb99) — integrációk/admin (backend) — PR-A/B (API-kulcs + webhook/idempotencia) kész, PR-C/D hátra
