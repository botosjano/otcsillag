-- Atomikus dispatch-claim (Elemér PR#11-review-jának blokkoló találata).
--
-- A `dispatchScheduledMessage` bejáratánál nem volt lefoglalás, ezért ugyanaz a
-- `review_requests` sor kétszer is végigfuthatott a dispatch-en. Két valós
-- útvonalon okozott kárt:
--
--  1. TÖRLÉS-VERSENY: a cancel a dispatch KÖZBEN lefutott (a sor ekkor még
--     `scheduled`), a staff 200 OK-t kapott ("visszavontam"), majd a dispatch
--     guard nélküli záró UPDATE-je felülírta -- az üzenet közben KIMENT az
--     ügyfélhez, a törlés pedig csendben elveszett.
--  2. DUPLIKÁLT KÜLDÉS: ha a dispatch a `messages` insert UTÁN dobott, a sor
--     `scheduled` maradt, és a következő cron-tick ÚJRA végigfuttatta -- új
--     üzenet ment ki ugyanannak az ügyfélnek.
--
-- A megoldás ugyanaz a minta, ami a kódbázisban már bevált (webhook_events,
-- review_requests.idempotency_key): feltételes írás + az eredmény ellenőrzése.

-- 1. Új köztes állapot. A `dispatching` azt jelenti: egy futó dispatch
--    lefoglalta ezt a sort, senki más nem nyúlhat hozzá.
alter table review_requests drop constraint if exists review_requests_status_check;
alter table review_requests add constraint review_requests_status_check
  check (status in ('draft', 'scheduled', 'dispatching', 'active', 'completed', 'expired', 'cancelled', 'failed'));

-- 2. Mikor foglalták le. Nem automatikus felszabadításra való (l. lent), hanem
--    hogy a beragadt sorok LÁTHATÓAK legyenek.
alter table review_requests add column if not exists dispatch_claimed_at timestamptz;

-- A beragadt claim-ek kereséséhez (a cron ezzel jelenti őket).
create index if not exists review_requests_dispatching_idx
  on review_requests (status, dispatch_claimed_at) where status = 'dispatching';

-- 3. MÁSODIK VÉDVONAL a duplikált küldés ellen. A claim önmagában megvéd, de
--    ha egy jövőbeli hívó megkerülné, ez az egyedi index HANGOSAN elbuktatja
--    (23505) ahelyett, hogy némán másodszor is kimenne az üzenet.
--    Ugyanaz az elv, mint a messages_provider_reference_unique-nál.
create unique index if not exists messages_request_attempt_unique
  on messages (request_id, attempt_type);

-- MIÉRT NINCS AUTOMATIKUS TIMEOUT-ALAPÚ FELSZABADÍTÁS:
-- Kézenfekvő lenne egy "N percnél régebbi dispatching sort tegyük vissza
-- scheduled-re" szabály, de az pontosan azt a duplikált küldést hozná vissza,
-- ami ellen ez az egész migráció készült: egy lassú (nem halott) dispatch
-- közben a sor visszakerülne a sorba, és az üzenet kétszer menne ki. A
-- fail-safe irány itt az, hogy a sor INKÁBB ragadjon be és legyen látható,
-- mint hogy duplán terheljük az ügyfelet és a küldési keretet. A cron ezért
-- csak JELENTI a régóta dispatching állapotú sorokat; a feloldás emberi
-- döntés, mert azt kell tudni, kiment-e ténylegesen az üzenet.
