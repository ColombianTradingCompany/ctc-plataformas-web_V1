-- V5.83 · Fase 6 del PLAN_CIRCUITO_DEL_LOTE (owner, 2026-09-24): aceptar con claridad.
-- Migración `aceptacion_con_declaracion`. Se aplicó con `apply_migration`; esta copia es el acta (la fuente de verdad es la base).
--
-- (1) La aceptación con DECLARACIÓN (folio 8, paso 15): `lot_offers.locked_kg` (lo que el productor compromete, ≥ `min_kg`
--     del grado y ≤ `max_kg` de una directa), `declaracion` ('trimestre' = el periodo por empezar · '30_dias' = el periodo en
--     curso) y `terms_accepted_at` (aceptó las condiciones de retiro, mora y ruptura de `terms_version`).
-- (2) El contrato NACE LLENO (§3 del plan, «signContract ya no teclea»): `price_per_kg_locked` = el precio de la oferta,
--     `quantity_frozen_kg` = `locked_kg`, `reference_price_*` = los de la oferta, `freeze_months` = 3 (trimestre) o 1 (30 días);
--     columnas nuevas `offer_id`, `terms_version`, `declaracion`, `compra_inicial_kg`, `pvc_edition_id`, `modificador_pct`.
--     Las escribe `respondToOffer` (service role) al aceptar; CTCx solo FIRMA.

alter table public.lot_offers
  add column if not exists locked_kg numeric,
  add column if not exists declaracion text,
  add column if not exists terms_accepted_at timestamptz;
alter table public.lot_offers drop constraint if exists lot_offers_declaracion_check;
alter table public.lot_offers
  add constraint lot_offers_declaracion_check check (declaracion is null or declaracion in ('trimestre', '30_dias'));

alter table public.purchase_contracts
  add column if not exists offer_id uuid references public.lot_offers(id) on delete set null,
  add column if not exists terms_version text,
  add column if not exists declaracion text,
  add column if not exists compra_inicial_kg numeric,
  add column if not exists pvc_edition_id uuid references public.pvc_editions(id) on delete set null,
  add column if not exists modificador_pct numeric;
alter table public.purchase_contracts drop constraint if exists purchase_contracts_declaracion_check;
alter table public.purchase_contracts
  add constraint purchase_contracts_declaracion_check check (declaracion is null or declaracion in ('trimestre', '30_dias'));
