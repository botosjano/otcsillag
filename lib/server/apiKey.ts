import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * FR-API-001 -- tenant API-kulcs: létrehozás/scope/visszavonás (spec 8.2,
 * 9.1, 11.4). A nyers kulcs formátuma `csillag_live_{id}_{secret}`: az `{id}`
 * (8 hex karakter) a publikus, adatbázis-keresésre használt `prefix`, a
 * `{secret}` (40 hex karakter) a titok, aminek csak a hash-e kerül tárolásra
 * -- a nyers kulcs a létrehozás válaszán kívül soha többé nem érhető el.
 */

export const API_KEY_SCOPES = ["contacts:write", "requests:write", "requests:read", "reports:read"] as const;
export type ApiKeyScope = (typeof API_KEY_SCOPES)[number];

const KEY_PREFIX_MARKER = "csillag_live_";
const ID_BYTES = 4; // 8 hex karakter -- csak keresési kulcs, nem titok.
const SECRET_BYTES = 20; // 40 hex karakter, 160 bit -- ez a tényleges titok.

export type GeneratedApiKey = {
  /** Csak létrehozáskor létezik -- ez az egyetlen alkalom, hogy visszaadható. */
  fullKey: string;
  prefix: string;
  secretHash: string;
};

export async function generateApiKey(): Promise<GeneratedApiKey> {
  const id = randomHex(ID_BYTES);
  const secret = randomHex(SECRET_BYTES);
  const prefix = `${KEY_PREFIX_MARKER}${id}`;
  const fullKey = `${prefix}_${secret}`;
  const secretHash = await sha256Hex(secret);
  return { fullKey, prefix, secretHash };
}

/** A bejövő `Authorization: Bearer <kulcs>` fejlécből bontja szét a prefixet és a titkot. */
export function parseApiKey(presented: string): { prefix: string; secret: string } | null {
  if (!presented.startsWith(KEY_PREFIX_MARKER)) return null;
  const rest = presented.slice(KEY_PREFIX_MARKER.length);
  const separatorIndex = rest.indexOf("_");
  if (separatorIndex === -1) return null;
  const id = rest.slice(0, separatorIndex);
  const secret = rest.slice(separatorIndex + 1);
  if (id.length !== ID_BYTES * 2 || secret.length !== SECRET_BYTES * 2) return null;
  if (!/^[0-9a-f]+$/.test(id) || !/^[0-9a-f]+$/.test(secret)) return null;
  return { prefix: `${KEY_PREFIX_MARKER}${id}`, secret };
}

export type ApiKeyAuthResult = {
  keyId: string;
  organizationId: string;
  scopes: ApiKeyScope[];
};

/**
 * Bejövő kérés hitelesítése egy nyers `Authorization: Bearer` érték alapján.
 * `null`, ha a formátum érvénytelen, a kulcs nem található, vagy vissza van
 * vonva -- a hívó oldal ebből 401-et ad, a konkrét okot NEM különbözteti meg
 * kifelé (ne segítsük a kulcs-kitalálást).
 */
export async function authenticateApiKey(
  supabase: SupabaseClient,
  presented: string,
): Promise<ApiKeyAuthResult | null> {
  const parsed = parseApiKey(presented);
  if (!parsed) return null;

  const { data: row, error } = await supabase
    .from("api_keys")
    .select("id, organization_id, secret_hash, scopes, revoked_at")
    .eq("prefix", parsed.prefix)
    .maybeSingle();
  if (error) throw new Error(`authenticateApiKey lookup failed: ${error.message}`);
  if (!row || row.revoked_at) return null;

  const presentedHash = await sha256Hex(parsed.secret);
  if (!timingSafeEqualHex(presentedHash, row.secret_hash)) return null;

  // A last_used_at frissítés nem blokkolja a hitelesítés kimenetét -- egy
  // elhalt update még mindig érvényes kulcsot jelent, csak a "mikor
  // használták utoljára" adat marad el egy körre.
  const { error: touchError } = await supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", row.id);
  if (touchError) {
    console.error("[apiKey] last_used_at frissítés sikertelen", { keyId: row.id, error: touchError.message });
  }

  return {
    keyId: row.id,
    organizationId: row.organization_id,
    scopes: (row.scopes ?? []) as ApiKeyScope[],
  };
}

export function hasScope(auth: ApiKeyAuthResult, required: ApiKeyScope): boolean {
  return auth.scopes.includes(required);
}

function randomHex(byteLength: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256Hex(raw: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Konstans idejű összehasonlítás -- ne adjunk timing-oracle-t a kulcs-hash ellenőrzésén (l. signature.ts). */
function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
