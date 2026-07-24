# Ötcsillag

Mobil-first magyar B2B SaaS: a vállalkozó néhány érintéssel küld Google-értékeléskérést
SMS-ben vagy e-mailben, majd látja a kézbesítést és a kattintást.

> A jó munkád ötcsillagos nyomot hagy.

Spec: `docs/csillagflow-reszletes-fejlesztesi-specifikacio.md` · Visual kit:
`docs/otcsillag-visual-kit/` (a marveen repóban).

## Stack

- **Next.js 16** (App Router, Turbopack) + **Tailwind v4**
- **Manrope** (latin-ext, magyar ő/ű)
- SMS/e-mail küldés, saját rövid-linkes kattintásmérés, billing — *következő szakasz (backend)*

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

Minden webes projekt alapértelmezett animáció/scroll-stackje: **`framer-motion` + `lenis`**
(Janos döntése, 2026-07-24) — buttery-smooth momentum-görgetés + elemenként késleltetett
(staggered) fade+slide-up appear-animációk.

- Új szekció/feature: **ezzel épül** (Lenis + Framer Motion `whileInView`, staggered delay).
- `prefers-reduced-motion` kötelező tisztelet.

## Fejlesztés

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
npm run lint
```

## Állapot

- [x] Kártya 26-32 — teljes UI (landing, áttekintő, új kérés, kérések+részlet, sablonok/usage, mobil)
- [ ] Kártya 33-35 — SMS/e-mail kézbesítés, billing, integrációk/admin (backend)
