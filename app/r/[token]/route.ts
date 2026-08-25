import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/server/supabase";
import { recordClick, resolveShortLink } from "@/lib/server/shortlink";

export const runtime = "nodejs";

/**
 * 9.5 Rövid link: publikus GET /r/{token} -- feloldja a token hash alapján a
 * short_link rekordot, ellenőrzi az aktív/lejárt státuszt, aszinkron
 * kattintási eseményt rögzít, majd 302 redirect a Google-review URL-re.
 * A destination_url a DB-ben már csak validált review_url lehet (l.
 * dispatch.ts createShortLink hívása), így itt nincs open-redirect kockázat.
 */
export async function GET(request: NextRequest, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const supabase = createServiceRoleClient();

  const link = await resolveShortLink(supabase, token);
  if (!link || link.expired) {
    return NextResponse.json({ code: "not_found", message: "A link érvénytelen vagy lejárt." }, { status: 404 });
  }

  // A kattintás rögzítése nem blokkolhatja a redirectet (a végfelhasználó
  // élménye elsődleges), de a spec szerint MINDIG megtörténik -- ezért itt
  // szinkronban várjuk meg (edge/serverless nincs "background task" garancia
  // egy response visszaküldése után), csak a hibáját nyeljük el.
  try {
    const ipHash = await hashIp(request.headers.get("x-forwarded-for"));
    await recordClick(supabase, link.id, { ipHash, uaFamily: uaFamily(request.headers.get("user-agent")) });
  } catch {
    // A kattintás-naplózás hibája nem akadályozhatja a felhasználó
    // átirányítását a review oldalra.
  }

  return NextResponse.redirect(link.destinationUrl, { status: 302 });
}

/**
 * IP-cím álnevesítése kattintás-méréshez.
 *
 * SÓ NÉLKÜL EZ NEM ANONIMIZÁLÁS (Elemér PR#11-review-jának megfigyelése): egy
 * IPv4-cím keresési tere ~4 milliárd érték, amit egy mai gép percek alatt
 * végigpróbál -- a sózatlan SHA-256 tehát csak elrejti a nyers formát, de
 * visszafejthető, vagyis GDPR-értelemben továbbra is személyes adat.
 *
 * A titkos, szerver-oldali só ezt megszünteti: a hash csak akkor fejthető
 * vissza, ha a támadó a sót IS megszerzi (az pedig nem a naplóban/DB-ben van).
 *
 * FAIL-CLOSED: ha a só nincs beállítva, INKÁBB NEM TÁROLUNK IP-t. A sózatlan
 * hash hamis biztonságérzetet adna -- úgy néz ki, mintha anonimizált lenne.
 * A kattintás-mérés IP nélkül is működik (a `null` megengedett).
 */
async function hashIp(forwardedFor: string | null): Promise<string | null> {
  const ip = forwardedFor?.split(",")[0]?.trim();
  if (!ip) return null;
  const salt = process.env.CLICK_IP_HASH_SALT;
  if (!salt) return null;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${salt}:${ip}`));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}

function uaFamily(userAgent: string | null): string | null {
  if (!userAgent) return null;
  if (/iphone|ipad/i.test(userAgent)) return "ios";
  if (/android/i.test(userAgent)) return "android";
  if (/windows/i.test(userAgent)) return "windows";
  if (/macintosh/i.test(userAgent)) return "macos";
  return "other";
}
