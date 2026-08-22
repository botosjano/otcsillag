-- Ötcsillag -- előfizetés + számlázás (FR-BILL-001..006, spec 3. és 5.6 rész,
-- kanban kártya 3a9a231f). A 0001_delivery_tracking.sql-re épül (organizations
-- tábla). Az itteni táblák NEM fedik le: API-kulcsok/scope-ok (FR-API-001,
-- külön kártya, f4e5bb99), a teljes Identity/Org auth (FR-AUTH-*, FR-ORG-*).

-- 3.1: a csomagok (Próba/Starter/Pro/Partner) konfigurálhatók, NEM kódba
-- égetve -- ez a tábla az admin által szerkeszthető katalógus.
create table plans (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  monthly_price_huf integer not null check (monthly_price_huf >= 0),
  trial_days smallint not null default 0 check (trial_days >= 0),
  location_limit smallint not null check (location_limit >= 1),
  sms_segment_limit integer not null check (sms_segment_limit >= 0),
  email_limit integer not null check (email_limit >= 0),
  -- 3.1: túlfogyasztás fillérben/Ft-ban SMS-szegmensenkénti díj -- null, ha
  -- a csomagnál egyáltalán nem engedélyezett túlfogyasztás (pl. Próba).
  overage_sms_huf integer check (overage_sms_huf >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  plan_id uuid not null references plans (id) on delete restrict,
  -- FR-BILL-001: trialing, active, past_due, suspended, cancelled (8.3).
  status text not null default 'trialing'
    check (status in ('trialing', 'active', 'past_due', 'suspended', 'cancelled')),
  provider text not null default 'stripe' check (provider in ('stripe', 'barion')),
  provider_customer_id text,
  provider_subscription_id text,
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz not null,
  trial_ends_at timestamptz,
  -- FR-BILL-006: fizetési hiba után grace period, utána suspended.
  grace_period_ends_at timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- 11.1 elv: egy szervezetnek egy aktív előfizetése lehet (8.2 "subscriptions:
-- egy aktív subscription").
create unique index subscriptions_one_active_per_org
  on subscriptions (organization_id) where status != 'cancelled';
create unique index subscriptions_provider_subscription_id_unique
  on subscriptions (provider, provider_subscription_id) where provider_subscription_id is not null;

-- Append-only: minden mértékegység-fogyasztás (SMS-szegmens, email) ide kerül
-- -- ebből számol a havi túlfogyasztás (FR-BILL-005) és a napi usage-reconcile
-- (3.3 "provider-billing eltérést napi usage reconcile folyamat jelezzen").
create table usage_ledger (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  unit text not null check (unit in ('sms_segment', 'email')),
  quantity integer not null check (quantity > 0),
  -- Visszakövethetőség: melyik message okozta a fogyasztást (nem kötelező,
  -- pl. egy reconcile-korrekciós sornak nincs egyetlen message-e).
  message_id uuid references messages (id) on delete set null,
  occurred_at timestamptz not null default now()
);
create index usage_ledger_org_occurred_idx on usage_ledger (organization_id, occurred_at, unit);

-- FR-BILL-004: sikeres fizetés utáni számlaindítás állapota.
create table invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  subscription_id uuid references subscriptions (id) on delete set null,
  provider text not null default 'stripe' check (provider in ('stripe', 'barion')),
  provider_invoice_id text,
  invoicing_provider text check (invoicing_provider in ('billingo', 'szamlazz')),
  invoicing_reference text,
  invoicing_status text not null default 'pending'
    check (invoicing_status in ('pending', 'issued', 'failed')),
  amount_huf integer not null check (amount_huf >= 0),
  period_start timestamptz not null,
  period_end timestamptz not null,
  created_at timestamptz not null default now()
);
create unique index invoices_provider_invoice_id_unique
  on invoices (provider, provider_invoice_id) where provider_invoice_id is not null;

-- FR-WH-001/002 altalanos mintaja, de a billing-providerek SAJAT webhook-
-- eseményeire (a 0001-es webhook_events tábla a messaging-csatorna
-- providereire van elkülönítve `integration` mezővel -- ugyanaz a tábla,
-- csak más `integration` érték, pl. 'stripe'/'billingo', hogy egy helyen
-- legyen az idempotencia-ellenőrzés minden bejövő webhookhoz).

alter table plans enable row level security;
alter table subscriptions enable row level security;
alter table usage_ledger enable row level security;
alter table invoices enable row level security;

insert into plans (key, name, monthly_price_huf, trial_days, location_limit, sms_segment_limit, email_limit, overage_sms_huf)
values
  ('trial', 'Próba', 0, 7, 1, 20, 50, null),
  ('starter', 'Starter', 2990, 0, 1, 50, 500, 29),
  ('pro', 'Pro', 5990, 0, 3, 200, 2000, 25);
-- Partner: egyedi ár/limit -- adminfelületen vagy közvetlen SQL-lel vitetik
-- fel esetenként (3.1: "Partner: Egyedi"), nincs alapértelmezett sor.
