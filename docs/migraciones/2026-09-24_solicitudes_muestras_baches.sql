-- V5.80 · Fase 3 del PLAN_CIRCUITO_DEL_LOTE (owner, 2026-09-24): solicitud, factura, muestra, baches de evaluación.
-- Migración `solicitudes_muestras_baches`. Se aplicó con `apply_migration`; esta copia es el acta (la fuente de verdad es la base).
--
-- (1) La solicitud de evaluación (`arena_inscriptions` ES la solicitud): la nota con la que el productor pide un descuento
--     (`nota_solicitud`), la factura de cobro que CTCx emite al corroborar (`factura_ref` FE-AAAA-NNNNN de una secuencia,
--     `factura_emitida_at`, `factura_emitida_by`), la subvención que CTCx decide (`subvencion_id` → `club_campaigns`) y la
--     regla del folio 7 «la muestra viaja contra entrega» (`pago_contra_entrega`, default true). `next_factura_ref()` es
--     SECURITY DEFINER y solo la ejecuta el service role.
-- (2) `sondeo_batches.status` pasa a `abierto` · `en_centro` · `cerrado` (Baches de Evaluación que van al Centro de Calidad;
--     sin laboratorio externo, sin prueba de envío). Columnas nuevas: `centro_calidad_account_id` → `partner_accounts`,
--     `cerrado_at`. Las columnas del kanban viejo (lab_*, proof_*, received_at, delivered_at, result_*) se quedan sin uso.
-- (3) Gestión de Muestras, 1.ª tanda: `muestras` (lot_id, tipo evaluacion·contramuestra·testeo·comprador, kg, recibida_at,
--     ubicacion, custodio, notas, recibida_por) y `muestra_movimientos` (muestra_id, kg, motivo analisis_fisico·cata·a_centro·
--     a_comprador·revision_almacenaje·descarte, destino, batch_id, notas, fecha, por). RLS con cero políticas.

alter table public.arena_inscriptions
  add column if not exists nota_solicitud text,
  add column if not exists factura_ref text,
  add column if not exists factura_emitida_at timestamptz,
  add column if not exists factura_emitida_by uuid references public.profiles(id) on delete set null,
  add column if not exists subvencion_id uuid references public.club_campaigns(id) on delete set null,
  add column if not exists pago_contra_entrega boolean not null default true;
create unique index if not exists arena_inscriptions_factura_ref_key on public.arena_inscriptions (factura_ref) where factura_ref is not null;

create sequence if not exists public.factura_evaluacion_seq;
create or replace function public.next_factura_ref()
returns text
language sql
security definer
set search_path = public, pg_temp
as $$
  select 'FE-' || to_char(now() at time zone 'America/Bogota', 'YYYY') || '-' || lpad(nextval('public.factura_evaluacion_seq')::text, 5, '0');
$$;
revoke all on function public.next_factura_ref() from public;
revoke all on function public.next_factura_ref() from anon, authenticated;
grant execute on function public.next_factura_ref() to service_role;

alter table public.sondeo_batches drop constraint if exists sondeo_batches_status_check;
alter table public.sondeo_batches
  add constraint sondeo_batches_status_check check (status in ('abierto', 'en_centro', 'cerrado'));
alter table public.sondeo_batches
  add column if not exists centro_calidad_account_id uuid references public.partner_accounts(profile_id) on delete set null,
  add column if not exists cerrado_at timestamptz;

create table if not exists public.muestras (
  id uuid primary key default gen_random_uuid(),
  lot_id uuid not null references public.lots(id) on delete cascade,
  tipo text not null check (tipo in ('evaluacion', 'contramuestra', 'testeo', 'comprador')),
  kg numeric(8,3) not null check (kg > 0),
  recibida_at timestamptz not null default now(),
  ubicacion text,
  custodio text,
  notas text,
  recibida_por uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists muestras_lot_id_idx on public.muestras (lot_id);

create table if not exists public.muestra_movimientos (
  id uuid primary key default gen_random_uuid(),
  muestra_id uuid not null references public.muestras(id) on delete cascade,
  kg numeric(8,3) not null check (kg > 0),
  motivo text not null check (motivo in ('analisis_fisico', 'cata', 'a_centro', 'a_comprador', 'revision_almacenaje', 'descarte')),
  destino text,
  batch_id uuid references public.sondeo_batches(id) on delete set null,
  notas text,
  fecha timestamptz not null default now(),
  por uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists muestra_movimientos_muestra_id_idx on public.muestra_movimientos (muestra_id);

alter table public.muestras enable row level security;
alter table public.muestra_movimientos enable row level security;
