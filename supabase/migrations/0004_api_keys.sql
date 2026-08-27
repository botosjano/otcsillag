-- FR-API-001: tenant API-kulcs (spec 8.2 api_keys, 9.1, 11.4).
-- Kártya f4e5bb99, terv: marveen/docs/otcsillag-integraciok-admin-terv-2026-08-25.md.
--
-- A nyers kulcs csak létrehozáskor látszik (11.4 "API-kulcsok csak hash
-- formában"). A `prefix` a publikus, keresésre használt rész (nem titok --
-- ebből NEM állítható vissza a secret), a `secret_hash` a titkos rész
-- SHA-256 hash-e (l. lib/server/apiKey.ts). A `scopes` a 9.1-ben felsorolt
-- négy scope-ból áll: contacts:write, requests:write, requests:read,
-- reports:read.

create table api_keys (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  name text not null,
  prefix text not null,
  secret_hash text not null,
  scopes text[] not null default '{}',
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  last_used_at timestamptz
);
-- A prefix a keresési kulcs (authenticateApiKey ezzel indul) -- egyediség
-- kell, különben ütköző prefixnél nem egyértelmű, melyik hash-hez mérjünk.
create unique index api_keys_prefix_unique on api_keys (prefix);
create index api_keys_organization_idx on api_keys (organization_id) where revoked_at is null;

alter table api_keys enable row level security;
