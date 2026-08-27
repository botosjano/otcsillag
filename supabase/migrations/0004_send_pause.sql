-- FR-ADM-003: provider outage alatt globális vagy tenant send pause.
--
-- Ha a LINK/SeeMe API (vagy egy jövőbeli másik provider) leáll, a rendszernek
-- azonnal, kódmódosítás nélkül le kell tudnia állítani a kiküldést -- vagy az
-- egész platformon, vagy egyetlen szervezetre szűkítve (pl. ha csak egy
-- provider-fiók van felfüggesztve).
--
-- A tábla puszta SOR-JELENLÉTTEL fejezi ki az aktív szünetet (nincs külön
-- `active` boolean): a szünet feloldása = a sor törlése. Ez szándékosan
-- egyszerűbb, mint egy "active" flip-eléssel járó megoldás -- kevesebb az
-- állapot, amit el lehet rontani, és a `resumed_at`/`resumed_by` úgyis egy
-- másik táblába (audit log, FR-ADM-002) tartozna, ha kell.
create table if not exists send_pauses (
  id uuid primary key default gen_random_uuid(),
  -- NULL = GLOBÁLIS szünet (minden szervezet); ha kitöltött, csak az adott
  -- szervezetre vonatkozik.
  organization_id uuid references organizations(id) on delete cascade,
  reason text not null,
  created_by text not null,
  created_at timestamptz not null default now()
);

-- A dispatch-nek MINDEN küldés előtt ellenőriznie kell: (1) van-e globális
-- szünet, (2) van-e az adott szervezetre szóló szünet. Két külön, olcsó
-- lekérdezés helyett egy index mindkettőt kiszolgálja.
create index if not exists send_pauses_org_idx on send_pauses (organization_id);

-- Egyszerre legfeljebb EGY globális és EGY tenant-szintű szünet legyen aktív
-- -- több egyidejű, ugyanarra vonatkozó szünet csak zavart okozna (melyiket
-- oldjuk fel?). A globális sorokra `organization_id IS NULL`, ezért külön
-- parciális unique index kell rá (a sima unique constraint NULL-okra nem
-- érvényesítene semmit, mert NULL != NULL SQL-ben).
create unique index if not exists send_pauses_global_unique
  on send_pauses ((true)) where organization_id is null;
create unique index if not exists send_pauses_org_unique
  on send_pauses (organization_id) where organization_id is not null;
