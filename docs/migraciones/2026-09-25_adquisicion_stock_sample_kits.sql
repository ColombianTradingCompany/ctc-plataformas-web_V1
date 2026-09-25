-- V5.90 · «Adquisición de Stock Café (Selection/Sample Kits)» (owner, 2026-09-25; diagrama «Cherry Picked · Sample Kits» en
-- `reference/muestras-y-sample-kits-2026-09-25/`, fuera del repo). Migración `adquisicion_stock_sample_kits`. Se aplicó con
-- `apply_migration`; esta copia es el acta (la fuente de verdad es la base).
--
-- (1) `compras.destino`: cada compra en firme dice a qué stock va — `selection` (alimenta «Oferta desde CTCx Selection», lo de
--     siempre) o `sample_kits` (el stock con que se arman los kits para compradores y Master Roasters). CTCx no puede prever la
--     demanda de kits: los compra con la misma herramienta y los destina aquí.
-- (2) `sample_kits` (SK-AAAA-NNN; tipo cp · plus · max; destino libre —MR, comprador, región—; `pedido_id` si viene de un pedido
--     de la tienda; armado → enviado · anulado, nada se borra) y `sample_kit_items` (qué compra y cuántos kg de CPS van en el kit).
--     Los tres tipos (owner): Sample Kit CP = 8 lotes × 250 g de verde (≈ 350 g CPS cada uno; solo donde hay un MR o partner
--     CaaS; ~65 € · US$65) · Plus = 5 lotes × 2 kg de verde (~50 servings de 500 ml por lote; FOB US$120–170) · Max = 4 lotes × 6 kg
--     de CPS (~150 servings; FOB US$280–400). La regla vive en `src/lib/compras/sampleKits.ts` (puro); aquí se guardan los kilos
--     reales de CPS que salieron de cada compra.
-- (3) Guards: los componentes solo cambian con el kit armado (`guard_sample_kit_item`); lo asignado a kits no anulados nunca
--     supera lo comprado con destino sample_kits (`guard_sample_kit_stock`). Lo DISPONIBLE no se guarda: comprado − asignado.
alter table public.compras add column destino text not null default 'selection' check (destino in ('selection', 'sample_kits'));
comment on column public.compras.destino is 'V5.90 · a qué stock va la compra: selection (Oferta desde CTCx Selection) o sample_kits (Stock de Sample Kits).';

create sequence if not exists public.sample_kit_seq;
create table public.sample_kits (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique default ('SK-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.sample_kit_seq')::text, 3, '0')),
  tipo text not null check (tipo in ('cp', 'plus', 'max')),
  destino text,
  pedido_id uuid references public.sample_pack_orders(id) on delete set null,
  status text not null default 'armado' check (status in ('armado', 'enviado', 'anulado')),
  guia text,
  notas text,
  anulado_motivo text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  enviado_at timestamptz,
  anulado_at timestamptz
);
alter table public.sample_kits enable row level security;
comment on table public.sample_kits is 'V5.90 · Los Sample Kits (cp · plus · max) armados con compras destinadas a sample_kits. armado → enviado · anulado (nada se borra).';

create table public.sample_kit_items (
  id uuid primary key default gen_random_uuid(),
  kit_id uuid not null references public.sample_kits(id) on delete cascade,
  compra_id uuid not null references public.compras(id) on delete restrict,
  kg_cps numeric not null check (kg_cps > 0),
  created_at timestamptz not null default now(),
  unique (kit_id, compra_id)
);
create index sample_kit_items_compra_idx on public.sample_kit_items (compra_id);
alter table public.sample_kit_items enable row level security;

create or replace function public.guard_sample_kit_item()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
declare v_status text;
begin
  select status into v_status from public.sample_kits where id = coalesce(new.kit_id, old.kit_id);
  if v_status is distinct from 'armado' then
    raise exception 'Los componentes de un Sample Kit solo cambian mientras está armado.';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
create trigger guard_sample_kit_item before insert or update or delete on public.sample_kit_items
  for each row execute function public.guard_sample_kit_item();

create or replace function public.guard_sample_kit_stock()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
declare v_kg numeric; v_destino text; v_asignado numeric;
begin
  select kg, destino into v_kg, v_destino from public.compras where id = new.compra_id;
  if v_destino is distinct from 'sample_kits' then
    raise exception 'Esa compra no está destinada a Sample Kits.';
  end if;
  select coalesce(sum(i.kg_cps), 0) into v_asignado
    from public.sample_kit_items i join public.sample_kits k on k.id = i.kit_id
   where i.compra_id = new.compra_id and k.status <> 'anulado' and i.id is distinct from new.id;
  if v_asignado + new.kg_cps > v_kg then
    raise exception 'Ese kit asigna más kilos de los que quedan de la compra.';
  end if;
  return new;
end;
$$;
create trigger guard_sample_kit_stock before insert or update on public.sample_kit_items
  for each row execute function public.guard_sample_kit_stock();
