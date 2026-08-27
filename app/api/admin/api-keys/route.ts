import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/server/supabase";
import { requireDefaultOrganizationId } from "@/lib/server/env";
import { API_KEY_SCOPES, generateApiKey, type ApiKeyScope } from "@/lib/server/apiKey";

export const runtime = "nodejs";

function requireAdminSecret(request: NextRequest): NextResponse | null {
  const secret = process.env.ADMIN_API_SECRET;
  if (!secret || request.headers.get("x-admin-secret") !== secret) {
    return NextResponse.json({ code: "unauthorized" }, { status: 401 });
  }
  return null;
}

/** FR-API-001 -- a szervezet (MVP: az egyetlen default org) API-kulcsainak listája, hash NÉLKÜL. */
export async function GET(request: NextRequest) {
  const unauthorized = requireAdminSecret(request);
  if (unauthorized) return unauthorized;

  const supabase = createServiceRoleClient();
  const organizationId = requireDefaultOrganizationId();
  const { data, error } = await supabase
    .from("api_keys")
    .select("id, name, prefix, scopes, created_at, revoked_at, last_used_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`GET /api/admin/api-keys failed: ${error.message}`);

  return NextResponse.json({ api_keys: data ?? [] });
}

type CreateBody = {
  name?: string;
  scopes?: string[];
};

/**
 * FR-API-001 -- új API-kulcs létrehozása. A nyers kulcs KIZÁRÓLAG ebben a
 * válaszban látszik -- utána csak a hash marad, visszaállítás nincs (11.4).
 */
export async function POST(request: NextRequest) {
  const unauthorized = requireAdminSecret(request);
  if (unauthorized) return unauthorized;

  let body: CreateBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: "invalid_body", message: "Érvénytelen JSON." }, { status: 400 });
  }

  if (!body.name || !body.name.trim()) {
    return NextResponse.json({ code: "invalid_body", message: "name kötelező." }, { status: 400 });
  }

  const scopes = body.scopes ?? [];
  const invalidScopes = scopes.filter((s) => !API_KEY_SCOPES.includes(s as ApiKeyScope));
  if (scopes.length === 0 || invalidScopes.length > 0) {
    return NextResponse.json(
      {
        code: "invalid_scopes",
        message: `scopes legalább egy elemet kell tartalmazzon, ezek egyike lehet: ${API_KEY_SCOPES.join(", ")}.`,
        field_errors: invalidScopes.length > 0 ? { scopes: invalidScopes } : undefined,
      },
      { status: 422 },
    );
  }

  const supabase = createServiceRoleClient();
  const organizationId = requireDefaultOrganizationId();
  const generated = await generateApiKey();

  const { data, error } = await supabase
    .from("api_keys")
    .insert({
      organization_id: organizationId,
      name: body.name.trim(),
      prefix: generated.prefix,
      secret_hash: generated.secretHash,
      scopes,
    })
    .select("id, name, prefix, scopes, created_at")
    .single();
  if (error) throw new Error(`POST /api/admin/api-keys insert failed: ${error.message}`);

  return NextResponse.json(
    {
      id: data.id,
      name: data.name,
      prefix: data.prefix,
      scopes: data.scopes,
      created_at: data.created_at,
      // Csak most, egyszer -- a hívó félnek EL KELL mentenie, nincs újralekérés.
      key: generated.fullKey,
    },
    { status: 201 },
  );
}
