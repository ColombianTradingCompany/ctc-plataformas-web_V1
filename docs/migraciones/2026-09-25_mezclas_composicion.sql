-- V5.91 · Las mezclas por COMPOSICIÓN (owner, 2026-09-25 — decisión 4 del brief de Compras; PVC_BCP_PLAN §14.8). Migración
-- `mezclas_composicion`. Se aplicó con `apply_migration`; esta copia es el acta (la fuente de verdad es la base).
--
-- Lo que se retira DE RAÍZ: «3 a 4 productores, una carga por productor, Red de una sola variedad» (guard de la V5.87).
-- Lo que entra: cada lote especifica su composición —variedad y proceso de su ficha, la finca (el estate) y su región—;
-- una mezcla Black/Red es SINGLE ORIGIN (varios estates con la misma variedad y proceso) o REGIONAL BLEND (varios lotes
-- de la misma región). El tipo se DERIVA al cerrar y se guarda en `mezclas.tipo`. El mínimo ya no sale de contar
-- productores: es el MOQ de compra (demanda ≥ 3 cargas, `src/lib/pvc/lectura.ts`); para estas mezclas CTCx asegura un
-- mínimo por temporada desde Adquisición (`temporada`, `objetivo_temporada_kg`: informativo, no bloquea el cierre).
-- Siguen: un solo grado, dentro de lo disponible, cerrada no vuelve a borrador, los componentes solo cambian en borrador
-- (`guard_mezcla_componente`, intacto), nada se borra.
alter table public.mezclas add column tipo text check (tipo in ('single_origin', 'regional_blend'));
alter table public.mezclas add column temporada text;
alter table public.mezclas add column objetivo_temporada_kg numeric check (objetivo_temporada_kg > 0);
comment on column public.mezclas.tipo is 'V5.91 · Derivado de los componentes al cerrar (owner, 2026-09-25): single_origin (varios estates, misma variedad y proceso) o regional_blend (varios lotes de la misma región).';
comment on column public.mezclas.temporada is 'V5.91 · La temporada para la que CTCx asegura esta mezcla (texto libre, p. ej. 2026-B).';
comment on column public.mezclas.objetivo_temporada_kg is 'V5.91 · El mínimo por temporada que CTCx asegura desde Adquisición para esta mezcla, en kg de CPS (informativo: no bloquea el cierre).';

create or replace function public.guard_mezcla_cerrada()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
declare n int; estates int; composiciones int; regiones int; grados_ok boolean; composicion_ok boolean; region_ok boolean; v_tipo text; sobre int;
begin
  if old.status = 'cerrada' and new.status = 'borrador' then
    raise exception 'Una mezcla cerrada no vuelve a borrador: anúlela.';
  end if;
  if new.status = 'cerrada' and old.status is distinct from 'cerrada' then
    select count(*),
           count(distinct l.finca_id),
           count(distinct (lower(trim(l.ficha_variedad)), lower(trim(l.ficha_proceso)))),
           count(distinct lower(trim(f.departamento))),
           coalesce(bool_and(c.grado = new.grado), false),
           coalesce(bool_and(nullif(trim(l.ficha_variedad), '') is not null and nullif(trim(l.ficha_proceso), '') is not null), false),
           coalesce(bool_and(nullif(trim(f.departamento), '') is not null), false)
      into n, estates, composiciones, regiones, grados_ok, composicion_ok, region_ok
      from public.mezcla_componentes mc
      join public.compras c on c.id = mc.compra_id
      join public.lots l on l.id = c.lot_id
      left join public.fincas f on f.id = l.finca_id
     where mc.mezcla_id = new.id;
    if n < 2 then raise exception 'Una mezcla es de varios lotes (tiene %).', n; end if;
    if not grados_ok then raise exception 'Todos los componentes deben ser del grado de la mezcla.'; end if;
    if composicion_ok and composiciones = 1 and estates >= 2 then v_tipo := 'single_origin';
    elsif region_ok and regiones = 1 then v_tipo := 'regional_blend';
    else raise exception 'Una mezcla Black/Red es Single Origin (varios estates, misma variedad y proceso) o Regional Blend (varios lotes de la misma región): esta no es ninguna de las dos.';
    end if;
    if new.tipo is not null and new.tipo <> v_tipo then
      raise exception 'El tipo de la mezcla (%) no corresponde a sus componentes (%).', new.tipo, v_tipo;
    end if;
    new.tipo := v_tipo;
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
-- El trigger `guard_mezcla_cerrada before update on public.mezclas` de la V5.87 sigue; solo cambió la función.
