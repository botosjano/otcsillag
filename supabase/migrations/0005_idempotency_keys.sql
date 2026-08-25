-- FR-WH-002: generikus, kliens-oldali `Idempotency-Key` fejlécre épülő
-- védelem, legalább 24 órás megőrzéssel és a VÁLASZ visszajátszásával
-- (ugyanaz a kulcs -> ugyanaz a válasz, ne új mellékhatás).
--
-- Miért külön tábla, nem a meglévő `webhook_events` vagy
-- `review_requests.idempotency_key`: a `webhook_events` a PROVIDER
-- esemény-azonosítójára dedupol (FR-MSG-004, l. 0001 migráció), a
-- `review_requests.idempotency_key` egy konkrét domain-műveletre (kérés
-- létrehozás) épített dedup, ami a sor JELENLEGI állapotát adja vissza, nem
-- a LÉTREHOZÁSKORI válaszet. Ez a tábla az ÁLTALÁNOS, bármilyen tenant-
-- webhook végponthoz (FR-WH-001, `/webhooks/events`) tartozó réteg: a
-- válasz-testet is tárolja, hogy pontosan ugyanazt tudja visszaadni.
create table idempotency_keys (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  key text not null,
  -- 'pending': egy hívás éppen feldolgozza -- amíg ez a státusz áll, egy
  -- párhuzamos, ugyanazzal a kulccsal érkező hívás konfliktust kap, NEM fut
  -- le még egyszer a mellékhatás (l. lib/server/idempotency.ts).
  status text not null default 'pending' check (status in ('pending', 'completed')),
  response_status smallint,
  response_body jsonb,
  created_at timestamptz not null default now()
);
create unique index idempotency_keys_org_key_unique on idempotency_keys (organization_id, key);

alter table idempotency_keys enable row level security;
