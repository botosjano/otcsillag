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

## Állapot

- [x] Kártya 26-32 — teljes UI (landing, áttekintő, új kérés, kérések+részlet, sablonok/usage, mobil)
- [x] Kártya 33 (d72b7afd) — SMS/e-mail kézbesítés + saját rövid-linkes kattintásmérés backend
- [ ] Kártya 34-35 — billing, integrációk/admin (backend)
