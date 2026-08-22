/**
 * Provider-független HMAC-SHA256 webhook-aláírás-ellenőrzés (Web Crypto).
 *
 * A LINK/SeeMe (SMS DLR) és a MyLINK Email (delivered/bounce/open/click)
 * pontos aláírás-sémáját (fejlécnevek, kódolás, aláírt tartalom összeállítása)
 * a spec (7.1, 9.4) NEM részletezi -- csak azt írja elő, hogy "titkos
 * header/aláírás" legyen. Ez a modul egy szokásos, biztonságos HMAC-SHA256
 * hex-aláírás ellenőrzését adja (jellemző minta ilyen szolgáltatóknál), amit
 * a webhook route-ok hívnak -- ÉLES bekötés előtt a tényleges LINK/SeeMe és
 * MyLINK API-dokumentáció alapján finomítandó, ha eltérő sémát használnak
 * (l. worker/README "Nyitott döntések" mintáját az elmentve repóban).
 */
export async function verifyHmacSignatureHex(
  secret: string,
  rawBody: string,
  signatureHex: string,
): Promise<boolean> {
  if (!signatureHex) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const expectedHex = toHex(new Uint8Array(digest));
  return timingSafeEqualHex(expectedHex, signatureHex.trim().toLowerCase());
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Konstans idejű összehasonlítás -- ne adjunk timing-oracle-t a támadónak. */
function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
