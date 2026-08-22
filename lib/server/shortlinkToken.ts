/**
 * FR-LINK-001: kriptográfiailag nem kitalálható rövid token, csak a hash-e
 * kerül tárolásra (l. supabase/migrations/0001_delivery_tracking.sql). Web
 * Crypto SubtleCrypto-ra épül, hogy Node és edge runtime-on is fusson --
 * ugyanaz a minta, mint az elmentve worker webhookVerify.ts-ében.
 */
const TOKEN_BYTES = 20;

export function generateShortLinkToken(): string {
  const bytes = new Uint8Array(TOKEN_BYTES);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

export async function hashShortLinkToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return base64UrlEncode(new Uint8Array(digest));
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
