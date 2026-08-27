import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/server/supabase";
import { requireDefaultOrganizationId } from "@/lib/server/env";

export const runtime = "nodejs";

/** FR-API-001 -- API-kulcs visszavonása. Nem törli a sort (audit), csak revoked_at-ot állít. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const secret = process.env.ADMIN_API_SECRET;
  if (!secret || request.headers.get("x-admin-secret") !== secret) {
    return NextResponse.json({ code: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createServiceRoleClient();
  const organizationId = requireDefaultOrganizationId();

  const { data, error } = await supabase
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organization_id", organizationId)
    .is("revoked_at", null)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(`POST /api/admin/api-keys/${id}/revoke failed: ${error.message}`);
  if (!data) {
    return NextResponse.json({ code: "not_found", message: "A kulcs nem található, vagy már vissza van vonva." }, { status: 404 });
  }

  return NextResponse.json({ id: data.id, revoked: true });
}
