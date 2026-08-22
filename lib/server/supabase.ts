import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Szerver-oldali, service-role kliens (RLS-t megkerüli -- l. migráció
 * megjegyzése). Csak API route-okból/cron jobokból hívható, SOHA a
 * kliens felé nem szivároghat (service role kulcs).
 */
export function createServiceRoleClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY hiányzik -- l. README Nyitott döntések.");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}
