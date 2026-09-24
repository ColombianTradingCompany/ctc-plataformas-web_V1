-- V5.84 · Fase 7 del PLAN_CIRCUITO_DEL_LOTE (owner, 2026-09-24): el trato mes a mes.
-- Migración `trato_mes_a_mes`. Se aplicó con `apply_migration`; esta copia es el acta (la fuente de verdad es la base).
--
-- (1) `contract_months` (folio 8, pasos 16–17): por mes del periodo (1..3) — `pedido_kg`/`pedido_at`/`pedido_por` (CTCx pide),
--     `enviado_kg`/`enviado_at` (el productor envía; CTC registra el recibo), `pagado_cop`/`pagado_at`/`pago_ref` (CTC paga en la
--     primera semana del mes siguiente), y el RETIRO del productor: `retirado_kg` = `retirado_libre_kg` + `retirado_penalizado_kg`,
--     `penalidad_cop` (4 % del precio de cada carga por encima del tramo libre), `retirado_at`, `retiro_nota`. RLS: el productor
--     LEE los meses de sus contratos (`contract_months_select_own`); toda escritura es del service role. La mora y la ruptura
--     potencial NO se guardan: se derivan (`src/lib/trato/mesAMes.ts`, decisión 6).
-- (2) `contract_status` gana `ruptura` (solo el owner, a mano) y `renovado` (cuando CTCx ofrece la renovación a los ~90 días);
--     `purchase_contracts.ruptura_at/ruptura_motivo/renovado_at/renewal_offer_id`; `lot_offers.renewal_of_contract_id`.
-- (3) Decisión 6 (toca Identidad, ALINEACION §1): `producer_profiles.estado_cuenta` ('activa' | 'congelada') + `_at` + `_motivo`,
--     escritas solo por CTC (guard `guard_producer_estado_cuenta`: un JWT no las toca al insertar ni al actualizar).
-- ⚠️ `contract_releases` NO se retira: sigue siendo el espejo que alimenta `lot_listings.total_kg` (trigger
--     `contract_releases_sync_listing_total`) y la precondición de `publishLot`; desde la V5.84 lo escribe `registrarEnvioDelMes`
--     (una fila por mes enviado, `max_release_pct = 100`) y ya no la escalera 50/75/100 de la firma.

create table if not exists public.contract_months (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.purchase_contracts(id) on delete cascade,
  mes smallint not null check (mes between 1 and 3),
  pedido_kg numeric check (pedido_kg is null or pedido_kg > 0),
  pedido_at timestamptz,
  pedido_por uuid references public.profiles(id) on delete set null,
  enviado_kg numeric check (enviado_kg is null or enviado_kg > 0),
  enviado_at timestamptz,
  pagado_cop numeric check (pagado_cop is null or pagado_cop >= 0),
  pagado_at timestamptz,
  pago_ref text,
  retirado_kg numeric not null default 0 check (retirado_kg >= 0),
  retirado_libre_kg numeric not null default 0 check (retirado_libre_kg >= 0),
  retirado_penalizado_kg numeric not null default 0 check (retirado_penalizado_kg >= 0),
  penalidad_cop numeric not null default 0 check (penalidad_cop >= 0),
  retirado_at timestamptz,
  retiro_nota text,
  notas text,
  created_at timestamptz not null default now(),
  unique (contract_id, mes)
);
alter table public.contract_months enable row level security;
drop policy if exists contract_months_select_own on public.contract_months;
create policy contract_months_select_own on public.contract_months for select
  using (exists (select 1 from public.purchase_contracts c join public.lots l on l.id = c.lot_id where c.id = contract_months.contract_id and l.producer_id = auth.uid()));

alter type public.contract_status add value if not exists 'ruptura';
alter type public.contract_status add value if not exists 'renovado';
alter table public.purchase_contracts
  add column if not exists ruptura_at timestamptz,
  add column if not exists ruptura_motivo text,
  add column if not exists renovado_at timestamptz,
  add column if not exists renewal_offer_id uuid references public.lot_offers(id) on delete set null;
alter table public.lot_offers
  add column if not exists renewal_of_contract_id uuid references public.purchase_contracts(id) on delete set null;

alter table public.producer_profiles
  add column if not exists estado_cuenta text not null default 'activa',
  add column if not exists estado_cuenta_at timestamptz,
  add column if not exists estado_cuenta_motivo text;
alter table public.producer_profiles drop constraint if exists producer_profiles_estado_cuenta_check;
alter table public.producer_profiles
  add constraint producer_profiles_estado_cuenta_check check (estado_cuenta in ('activa', 'congelada'));

create or replace function public.guard_producer_estado_cuenta()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
begin
  if auth.uid() is not null then
    if tg_op = 'INSERT' then
      if new.estado_cuenta is distinct from 'activa' or new.estado_cuenta_at is not null or new.estado_cuenta_motivo is not null then
        raise exception 'El estado de la cuenta lo escribe solo CTC.';
      end if;
    elsif new.estado_cuenta is distinct from old.estado_cuenta
       or new.estado_cuenta_at is distinct from old.estado_cuenta_at
       or new.estado_cuenta_motivo is distinct from old.estado_cuenta_motivo then
      raise exception 'El estado de la cuenta lo escribe solo CTC.';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists guard_producer_estado_cuenta on public.producer_profiles;
create trigger guard_producer_estado_cuenta
  before insert or update on public.producer_profiles
  for each row execute function public.guard_producer_estado_cuenta();
