-- Ötcsillag -- kézbesítési (SMS/email) + saját rövid-linkes kattintásmérés backend.
-- Forrás: docs/csillagflow-reszletes-fejlesztesi-specifikacio.md (8. adatmodell, 9.5 rövid link,
-- 10. háttérfolyamatok, 11.1 tenant izoláció) -- marveen repo, kanban kártya d72b7afd.
--
-- Amit ez a migráció NEM fed le (más kártyák dolga): Identity/Org/Auth (FR-AUTH-*, FR-ORG-*),
-- CSV-import, API-kulcsok/integrations, billing/usage_ledger/subscriptions, templates, reviews.
-- Ezért az organizations/locations/contacts táblák itt a legszükségesebb minimumra szorítkoznak,
-- amennyi a messaging+tracking modulhoz kell -- a teljes onboarding-adatmodellt a saját kártyája
-- fogja bővíteni.

create extension if not exists pgcrypto;

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  timezone text not null default 'Europe/Budapest',
  quiet_hours_start smallint not null default 21 check (quiet_hours_start between 0 and 23),
  quiet_hours_end smallint not null default 8 check (quiet_hours_end between 0 and 23),
  max_reminders smallint not null default 1 check (max_reminders >= 0),
  created_at timestamptz not null default now()
);

create table locations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  name text not null,
  -- FR-LOC-002: kizárólag validált, https Google-review URL -- ezt az alkalmazás-réteg
  -- ellenőrzi írás előtt, a short-link redirect (9.5) csak erre a mezőre irányíthat.
  review_url text not null,
  status text not null default 'active' check (status in ('active', 'paused')),
  created_at timestamptz not null default now()
);

create table contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  first_name text not null,
  -- FR-CON-002: E.164 telefonszám és kanonikus (kisbetűs, trimmelt) email.
  phone_e164 text,
  email_normalized text,
  created_at timestamptz not null default now(),
  constraint contacts_has_channel check (phone_e164 is not null or email_normalized is not null)
);
-- FR-CON-003: duplikációjelzéshez tenanton belüli normalizált egyediség.
create unique index contacts_org_phone_unique on contacts (organization_id, phone_e164) where phone_e164 is not null;
create unique index contacts_org_email_unique on contacts (organization_id, email_normalized) where email_normalized is not null;

create table review_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  location_id uuid not null references locations (id) on delete restrict,
  contact_id uuid not null references contacts (id) on delete restrict,
  source text not null default 'manual',
  external_id text,
  -- 9.1: "Minden létrehozó POST támogat Idempotency-Key headert." Ez a
  -- header-érték (nem az external_id) a dedup-kulcs, mert a spec 9.3
  -- példájában a kettő szándékosan eltér ("{external_id}-review").
  idempotency_key text,
  status text not null default 'draft'
    check (status in ('draft', 'scheduled', 'active', 'completed', 'expired', 'cancelled', 'failed')),
  scheduled_at timestamptz not null default now(),
  -- FR-REQ-002: azonos kontakt/telephely kombinációra cooldown.
  cooldown_until timestamptz,
  reminder_count smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index review_requests_org_idempotency_key_unique
  on review_requests (organization_id, idempotency_key) where idempotency_key is not null;
create index review_requests_org_status_scheduled_idx on review_requests (organization_id, status, scheduled_at);
-- FR-REQ-002 cooldown-ellenőrzéshez: legutóbbi (nem visszavont) kérés kontakt+telephely szerint.
create index review_requests_cooldown_idx on review_requests (contact_id, location_id, created_at desc)
  where status not in ('cancelled', 'failed');

create table messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references review_requests (id) on delete cascade,
  channel text not null check (channel in ('sms', 'email')),
  provider text not null,
  status text not null default 'created'
    check (status in ('created', 'queued', 'submitted', 'sent', 'delivered', 'bounced', 'failed', 'suppressed')),
  provider_reference text,
  -- FR-MSG-007 újrapróbálás egyedi kulcsa: message_id + attempt_type (10.2).
  attempt_type text not null default 'initial' check (attempt_type in ('initial', 'reminder')),
  segment_count smallint,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index messages_provider_reference_unique
  on messages (provider, provider_reference) where provider_reference is not null;
create index messages_org_status_idx on messages (request_id, status, created_at);

-- Append-only, deduplikált eseménynapló minden üzenethez (10.2: "az esemény minden esetben
-- naplózódik", out-of-order callbacknél is). A dedup kulcs message+típus+forrás payload-hash --
-- ugyanaz a DLR kétszer beküldve nem hoz létre új sort, de két KÜLÖNBÖZŐ (pl. delivered majd
-- bounced) eseményt egyaránt megőriz, még ha a state-machine csak az egyiket engedi is
-- canonical-nak (lásd lib/server/messageEvents.ts).
create table message_events (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references messages (id) on delete cascade,
  type text not null,
  occurred_at timestamptz not null,
  payload_hash text not null,
  raw_payload jsonb,
  created_at timestamptz not null default now()
);
create unique index message_events_dedup_unique on message_events (message_id, type, payload_hash);
create index message_events_message_idx on message_events (message_id, occurred_at);

create table short_links (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references review_requests (id) on delete cascade,
  -- FR-LINK-001: csak a hash kerül tárolásra, a nyers token soha -- ugyanaz a minta, mint az
  -- api_keys.secret_hash-nél lenne (más kártya), hogy egy DB-dump se tegye kitalálhatóvá.
  token_hash text not null,
  destination_url text not null,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index short_links_token_hash_unique on short_links (token_hash);
create unique index short_links_request_unique on short_links (request_id);

create table click_events (
  id uuid primary key default gen_random_uuid(),
  short_link_id uuid not null references short_links (id) on delete cascade,
  occurred_at timestamptz not null default now(),
  -- "minimal data" (8.2): nyers IP/UA soha nem kerül tárolásra, csak hash/család.
  ip_hash text,
  ua_family text
);
create index click_events_short_link_idx on click_events (short_link_id, occurred_at);

create table webhook_events (
  id uuid primary key default gen_random_uuid(),
  integration text not null,
  external_event_id text not null,
  status text not null default 'processed',
  created_at timestamptz not null default now()
);
-- 8.4 / FR-MSG-004: idempotencia -- ugyanaz a provider event ID csak egyszer dolgozható fel.
create unique index webhook_events_integration_external_unique on webhook_events (integration, external_event_id);

create table suppression_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  channel text not null check (channel in ('sms', 'email')),
  normalized_destination text not null,
  reason text not null check (reason in ('bounced', 'complained', 'unsubscribed', 'manual')),
  created_at timestamptz not null default now()
);
create unique index suppression_entries_unique on suppression_entries (organization_id, channel, normalized_destination);

create or replace function is_suppressed(p_organization_id uuid, p_channel text, p_destination text)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from suppression_entries
    where organization_id = p_organization_id
      and channel = p_channel
      and normalized_destination = p_destination
  );
$$;

-- Row Level Security: bekapcsolva minden tenant-adatot tartalmazó táblán, de a
-- 11. rész auth/org modulja (FR-AUTH-*, FR-ORG-*) egy másik kártya -- amíg a
-- dashboard-oldali policy nincs megírva, alapértelmezésben senki nem fér hozzá
-- anon/authenticated szerepkörrel, KIVÉVE a service_role-t (ő RLS-t megkerüli).
-- Ez fail-closed: nem enged véletlenül nyitva semmit, amíg az Identity-modul
-- meg nem határozza a tényleges per-tenant policy-t.
alter table organizations enable row level security;
alter table locations enable row level security;
alter table contacts enable row level security;
alter table review_requests enable row level security;
alter table messages enable row level security;
alter table message_events enable row level security;
alter table short_links enable row level security;
alter table click_events enable row level security;
alter table webhook_events enable row level security;
alter table suppression_entries enable row level security;
