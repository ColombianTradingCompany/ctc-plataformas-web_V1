-- V5.87 · 2.ª tanda de Compras (brief `consolas-ctcx-selection-compras.md`): las MEZCLAS y la ubicación física de cada compra.
-- Migración `mezclas_ctcx_selection`. Se aplicó con `apply_migration`; esta copia es el acta (la fuente de verdad es la base).
--
-- Regla del owner (2026-09-19; `PVC_BCP_PLAN.md` §14.7; `src/lib/pvc/lectura.ts`): Black = blend de 3 a 4 orígenes y/o variedades;
-- Red = una sola variedad, mezcla regional de 3 a 4 orígenes; UNA carga (125 kg de CPS) por productor; una mezcla de dos no
-- existe y una de cinco tampoco. El servidor la impone primero (`src/lib/compras/mezclas.ts`, puro, que LEE `lectura.ts`);
-- el guard `guard_mezcla_cerrada` la repite al CERRAR la mezcla (defensa en profundidad — sus cifras, 3 · 4 · 125, son las
-- mismas que `LOTES_EN_MEZCLA` y la carga; `qa-compras` lo comprueba). Una mezcla es borrador → cerrada · anulada: nada se
-- borra. Lo asignado a una mezcla (no anulada) descuenta de lo disponible de la compra (derivado, `disponibleKg`).
-- Decisión 4 del brief (¿una mezcla es un lote nuevo con código público y ficha?) sigue abierta: aquí la mezcla es un objeto
-- de Compras con su código interno `MZ-AAAA-NNN`; llevarla a la vitrina es otra tanda. Decisión 2 (ubicación física): texto
-- libre en `compras.ubicacion` hasta que el owner fije los sitios. Decisión 5 (pergamino/verde): la pantalla habla en kg de CPS;
-- la conversión a verde la da el Modelo de Producción (su brief), aquí no se inventa un factor.

alter table public.compras add column ubicacion text;
comment on column public.compras.ubicacion is 'V5.87 · dónde está físicamente el café comprado (finca, Centro de Calidad, bodega…): texto libre hasta que el owner fije los sitios (decisión 2 del brief).';

create sequence if not exists public.mezcla_seq;
create table public.mezclas (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique default ('MZ-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.mezcla_seq')::text, 3, '0')),
  nombre text not null,
  grado public.lot_grade not null check (grado in ('black', 'red')),
  status text not null default 'borrador' check (status in ('borrador', 'cerrada', 'anulada')),
  nota text,
  anulada_motivo text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  cerrada_at timestamptz,
  anulada_at timestamptz
);
alter table public.mezclas enable row level security;
comment on table public.mezclas is 'V5.87 · Las mezclas de CTCx Selection (Black · Red) armadas con compras en firme. borrador → cerrada (la regla se impone al cerrar) · anulada (nada se borra).';

create table public.mezcla_componentes (
  id uuid primary key default gen_random_uuid(),
  mezcla_id uuid not null references public.mezclas(id) on delete cascade,
  compra_id uuid not null references public.compras(id) on delete restrict,
  kg numeric not null check (kg > 0),
  created_at timestamptz not null default now(),
  unique (mezcla_id, compra_id)
);
create index mezcla_componentes_compra_idx on public.mezcla_componentes (compra_id);
alter table public.mezcla_componentes enable row level security;

create or replace function public.guard_mezcla_componente()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
declare v_status text;
begin
  select status into v_status from public.mezclas where id = coalesce(new.mezcla_id, old.mezcla_id);
  if v_status is distinct from 'borrador' then
    raise exception 'Los componentes de una mezcla solo cambian mientras es un borrador.';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
create trigger guard_mezcla_componente before insert or update or delete on public.mezcla_componentes
  for each row execute function public.guard_mezcla_componente();

create or replace function public.guard_mezcla_cerrada()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
declare n int; prods int; vars int; minkg numeric; grados_ok boolean; sobre int;
begin
  if old.status = 'cerrada' and new.status = 'borrador' then
    raise exception 'Una mezcla cerrada no vuelve a borrador: anúlela.';
  end if;
  if new.status = 'cerrada' and old.status is distinct from 'cerrada' then
    select count(*), count(distinct l.producer_id), count(distinct lower(trim(l.ficha_variedad))), coalesce(min(mc.kg), 0), coalesce(bool_and(c.grado = new.grado), false)
      into n, prods, vars, minkg, grados_ok
      from public.mezcla_componentes mc
      join public.compras c on c.id = mc.compra_id
      join public.lots l on l.id = c.lot_id
     where mc.mezcla_id = new.id;
    if n < 3 or n > 4 then raise exception 'Una mezcla es de 3 a 4 componentes (tiene %).', n; end if;
    if prods <> n then raise exception 'Una carga por productor: hay productores repetidos en la mezcla.'; end if;
    if minkg < 125 then raise exception 'Cada componente es al menos una carga (125 kg de CPS).'; end if;
    if not grados_ok then raise exception 'Todos los componentes deben ser del grado de la mezcla.'; end if;
    if new.grado = 'red' and vars <> 1 then raise exception 'Una mezcla Red es de una sola variedad.'; end if;
    select count(*) into sobre from (
      select c.id
        from public.mezcla_componentes mc
        join public.compras c on c.id = mc.compra_id
        join public.mezclas m on m.id = mc.mezcla_id
       where m.status <> 'anulada'
         and c.id in (select compra_id from public.mezcla_componentes where mezcla_id = new.id)
       group by c.id, c.kg
      having sum(mc.kg) > c.kg
    ) x;
    if sobre > 0 then raise exception 'Hay componentes que asignan más kilos de los comprados.'; end if;
    new.cerrada_at := now();
  end if;
  if new.status = 'anulada' and old.status is distinct from 'anulada' then
    new.anulada_at := now();
  end if;
  return new;
end;
$$;
create trigger guard_mezcla_cerrada before update on public.mezclas
  for each row execute function public.guard_mezcla_cerrada();
