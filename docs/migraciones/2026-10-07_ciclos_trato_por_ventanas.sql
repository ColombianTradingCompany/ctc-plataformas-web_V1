-- V5.175 (owner, 2026-10-07 · docs/PLAN_CICLOS.md §2–§5, tandas 2–3) · el trato por VENTANAS de ciclos.
-- Aditiva. No hay contratos en producción: las columnas del modelo por meses (`freeze_months`, `contract_months`, la
-- redeclaración, `declaracion`) quedan para los tratos viejos y se documentan como dormidas donde viven.
--
--   · purchase_contracts: la ventana (tipo, ciclos, regla de precio), el saco inicial FUERA de lo declarado, el mínimo con que
--     nació, si es una declaración reducida SIN retiro, la existencia del lote al firmar y la renovación de la que viene.
--   · lot_offers: el saco que CTCx propone al emitir (70–200 kg) y la marca de renovación prellenada.
--   · contract_ventas: las confirmaciones SEMANALES de lo vendido en Cherry Picked (lo que el productor despacha al empezar el
--     ciclo siguiente).
--   · contract_retiros: cada retiro (libre y penalizado), solo sobre lo no vendido.
--   · contract_despachos: cada envío (saco, adelanto, vendido) con su plazo, prórroga, guía, recepción (humedad, aw) y el pago
--     60 % al despacho / 40 % al recibir.
-- RLS: el productor LEE lo suyo (select-own por lots.producer_id); TODA escritura pasa por acciones de servidor (service role).

alter table public.purchase_contracts
  add column if not exists ventana_tipo text,
  add column if not exists ventana_ciclos text[],
  add column if not exists precio_regla text,
  add column if not exists saco_kg numeric,
  add column if not exists minimo_kg numeric,
  add column if not exists sin_retiro boolean not null default false,
  add column if not exists existencia_al_firmar numeric,
  add column if not exists renovacion_de uuid references public.purchase_contracts(id) on delete set null;
alter table public.purchase_contracts drop constraint if exists purchase_contracts_ventana_tipo_check;
alter table public.purchase_contracts add constraint purchase_contracts_ventana_tipo_check check (ventana_tipo is null or ventana_tipo in ('ciclo', 'extendida'));
alter table public.purchase_contracts drop constraint if exists purchase_contracts_precio_regla_check;
alter table public.purchase_contracts add constraint purchase_contracts_precio_regla_check check (precio_regla is null or precio_regla in ('vigente', 'promedio', 'siguiente'));
alter table public.purchase_contracts drop constraint if exists purchase_contracts_saco_check;
alter table public.purchase_contracts add constraint purchase_contracts_saco_check check (saco_kg is null or (saco_kg >= 0 and saco_kg <= 200));

alter table public.lot_offers
  add column if not exists saco_kg numeric,
  add column if not exists es_renovacion boolean not null default false,
  add column if not exists renovacion_de uuid references public.purchase_contracts(id) on delete set null;
alter table public.lot_offers drop constraint if exists lot_offers_saco_check;
alter table public.lot_offers add constraint lot_offers_saco_check check (saco_kg is null or (saco_kg >= 0 and saco_kg <= 200));

create table if not exists public.contract_despachos (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.purchase_contracts(id) on delete cascade,
  tipo text not null check (tipo in ('saco', 'adelanto', 'vendido')),
  kg numeric not null check (kg > 0),
  cop_kg numeric not null check (cop_kg >= 0),
  total_cop numeric not null check (total_cop >= 0),
  plazo date not null,
  prorroga_hasta date,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'despachado', 'recibido', 'cancelado', 'movido')),
  guia text,
  peso_kg numeric,
  foto_path text,
  despachado_at timestamptz,
  recibido_at timestamptz,
  humedad_pct numeric,
  aw numeric,
  resultado text check (resultado is null or resultado in ('aceptado', 'devolucion', 'compra_ajustada')),
  ajuste_pct numeric check (ajuste_pct is null or (ajuste_pct >= 0 and ajuste_pct <= 15)),
  pago_despacho_cop numeric,
  pago_despacho_at timestamptz,
  pago_recepcion_cop numeric,
  pago_recepcion_at timestamptz,
  pago_ref text,
  advertencias smallint not null default 0,
  nota text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists contract_despachos_contract_idx on public.contract_despachos (contract_id);

create table if not exists public.contract_ventas (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.purchase_contracts(id) on delete cascade,
  semana date not null,
  kg numeric not null check (kg > 0),
  cop_kg numeric not null check (cop_kg >= 0),
  total_cop numeric not null check (total_cop >= 0),
  nota text,
  confirmada_at timestamptz not null default now(),
  confirmada_por uuid,
  despacho_id uuid references public.contract_despachos(id) on delete set null
);
create index if not exists contract_ventas_contract_idx on public.contract_ventas (contract_id);

create table if not exists public.contract_retiros (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.purchase_contracts(id) on delete cascade,
  kg numeric not null check (kg > 0),
  libre_kg numeric not null check (libre_kg >= 0),
  penalizado_kg numeric not null check (penalizado_kg >= 0),
  penalidad_cop numeric not null check (penalidad_cop >= 0),
  nota text,
  created_at timestamptz not null default now(),
  created_by uuid
);
create index if not exists contract_retiros_contract_idx on public.contract_retiros (contract_id);

alter table public.contract_despachos enable row level security;
alter table public.contract_ventas enable row level security;
alter table public.contract_retiros enable row level security;

drop policy if exists contract_despachos_select_own on public.contract_despachos;
create policy contract_despachos_select_own on public.contract_despachos for select using (
  exists (select 1 from public.purchase_contracts c join public.lots l on l.id = c.lot_id where c.id = contract_despachos.contract_id and l.producer_id = (select auth.uid()))
);
drop policy if exists contract_ventas_select_own on public.contract_ventas;
create policy contract_ventas_select_own on public.contract_ventas for select using (
  exists (select 1 from public.purchase_contracts c join public.lots l on l.id = c.lot_id where c.id = contract_ventas.contract_id and l.producer_id = (select auth.uid()))
);
drop policy if exists contract_retiros_select_own on public.contract_retiros;
create policy contract_retiros_select_own on public.contract_retiros for select using (
  exists (select 1 from public.purchase_contracts c join public.lots l on l.id = c.lot_id where c.id = contract_retiros.contract_id and l.producer_id = (select auth.uid()))
);

comment on table public.contract_despachos is 'V5.175 (docs/PLAN_CICLOS.md §3): cada envío del trato por ventanas (saco · adelanto · vendido), con plazo, prórroga, guía, recepción (humedad, aw) y pago 60/40. Escribe solo el servidor.';
comment on table public.contract_ventas is 'V5.175 (docs/PLAN_CICLOS.md §5): las confirmaciones semanales de lo vendido en Cherry Picked; se despacha al empezar el ciclo siguiente.';
comment on table public.contract_retiros is 'V5.175 (docs/PLAN_CICLOS.md §4): los retiros del trato por ventanas, solo sobre lo no vendido (libre 25/30 %, el resto al 4 % por carga).';

-- Addendum (misma V5.175): los rangos de calidad y el auxilio con que se firmó, congelados en el contrato — el texto firmado los
-- cita y la página del contrato reconstruye su huella con ellos (la edición puede fijar después su auxilio).
alter table public.purchase_contracts
  add column if not exists calidad_snapshot jsonb,
  add column if not exists auxilio_carga numeric;
