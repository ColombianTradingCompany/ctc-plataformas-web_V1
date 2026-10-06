-- V5.169 (owner, 2026-10-06): CTCx ofrece una de dos cosas — participar en Cherry Picked (con tres modalidades de declaración)
-- o una compra de CTCx Selection (propuesta de venta a hasta PVC − 8 %, que se negocia con contraofertas).
--   · declaracion: además de '30_dias' («Declarar Ahora», los próximos 30 días) y 'trimestre' («Declarar Siguiente Temporada
--     Trimestral»), 'ahora_y_siguiente' («Declarar Ahora y Siguiente Temporada»: 30 % de retiro libre, redeclarar ≥ 70 %).
--   · lot_offers: el estado 'contraofertada' (el productor respondió con una contraoferta y le toca a CTCx), el tope de una
--     Selection (`precio_tope_kg` = PVC − 8 %), la referencia FNC y el fin de la Temporada Trimestral congelados al emitir.
--   · lot_offer_rondas: cada propuesta y contrapropuesta de la negociación (quién, precio, cantidad, nota).
--   · purchase_contracts: la vigencia, el retiro libre de la modalidad, la redeclaración obligada, la compra inicial
--     discrecional de «Declarar Ahora» (10 a 25 kg) y las enmiendas (renovaciones que cambian la cantidad).
-- Aditiva: amplía dos CHECK y agrega columnas y una tabla; ningún dato existente cambia.

alter table public.lot_offers drop constraint if exists lot_offers_declaracion_check;
alter table public.lot_offers add constraint lot_offers_declaracion_check check (declaracion is null or declaracion = any (array['trimestre','30_dias','ahora_y_siguiente']));
alter table public.lot_offers drop constraint if exists lot_offers_status_check;
alter table public.lot_offers add constraint lot_offers_status_check check (status = any (array['emitida','contraofertada','aceptada','rechazada','retirada','expirada']));
alter table public.lot_offers add column if not exists precio_tope_kg numeric;
alter table public.lot_offers add column if not exists fnc_carga_ref numeric;
alter table public.lot_offers add column if not exists temporada_hasta date;

alter table public.purchase_contracts drop constraint if exists purchase_contracts_declaracion_check;
alter table public.purchase_contracts add constraint purchase_contracts_declaracion_check check (declaracion is null or declaracion = any (array['trimestre','30_dias','ahora_y_siguiente']));
alter table public.purchase_contracts add column if not exists vigencia_desde date;
alter table public.purchase_contracts add column if not exists vigencia_hasta date;
alter table public.purchase_contracts add column if not exists retiro_libre_pct numeric;
alter table public.purchase_contracts add column if not exists redeclarar_min_kg numeric;
alter table public.purchase_contracts add column if not exists redeclarar_at date;
alter table public.purchase_contracts add column if not exists compra_inicial_min_kg numeric;
alter table public.purchase_contracts add column if not exists compra_inicial_max_kg numeric;
alter table public.purchase_contracts add column if not exists enmiendas jsonb not null default '[]'::jsonb;

create table if not exists public.lot_offer_rondas (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.lot_offers(id) on delete cascade,
  autor text not null check (autor = any (array['ctcx','productor'])),
  accion text not null check (accion = any (array['propone','contraoferta','acepta','desiste'])),
  price_per_kg numeric check (price_per_kg is null or price_per_kg > 0),
  quantity_kg numeric check (quantity_kg is null or quantity_kg > 0),
  nota text,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index if not exists lot_offer_rondas_offer_idx on public.lot_offer_rondas (offer_id, created_at);
alter table public.lot_offer_rondas enable row level security;
-- El productor lee las rondas de SUS ofertas; toda escritura pasa por acciones de servidor con service role.
drop policy if exists lot_offer_rondas_select_own on public.lot_offer_rondas;
create policy lot_offer_rondas_select_own on public.lot_offer_rondas for select to authenticated
  using (exists (select 1 from public.lot_offers o where o.id = offer_id and o.producer_id = auth.uid()));

-- Una sola oferta ABIERTA por lote: también cuenta la que está en contraoferta.
drop index if exists public.lot_offers_one_open;
create unique index lot_offers_one_open on public.lot_offers using btree (lot_id) where (status = any (array['emitida'::text, 'contraofertada'::text]));
