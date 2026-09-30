-- V5.99 · Las mezclas como tipo de lote (owner, 2026-09-30). Migración `mezclas_como_tipo_de_lote`.
-- Se aplica con `apply_migration` (patrón de la casa: DDL solo por ahí). Copia en el repo: la fuente de verdad es la base; esto es el acta.
--
-- El owner: «Las mezclas (blends) son simplemente un tipo de Lote con más de una variedad y/o proceso. Cada Lote permite
-- adjudicarse a diferentes fincas (del mismo productor). En el caso de tener blends de diferentes Productores, estos serán tipo
-- CTCx Selection». Dos consecuencias para el guard que cierra una mezcla de CTCx Selection:
--   (1) la COMPOSICIÓN de cada lote se lee ENTERA: sus variedades con su proceso (`lots.datasheet->'varieties'`, cada fila con su
--       `base`/`special`; si el lote no tiene filas, la proyección `ficha_variedad` / `ficha_proceso` de siempre) y TODAS sus fincas
--       (`lot_contributions` + la primaria `lots.finca_id`) — no solo la variedad dominante y la finca primaria (V5.91);
--   (2) una mezcla es de VARIOS PRODUCTORES: la de un solo productor con varias fincas es un LOTE, y se arma en Kaffetal Regal.
-- El tipo sigue derivándose igual: Single Origin (varios estates, UNA variedad y UN proceso en la unión) o Regional Blend
-- (una sola región). `src/lib/compras/mezclas.ts` (`tipoDeMezcla`, `validarCierre`) dice lo mismo desde el servidor.

create or replace function public.guard_mezcla_cerrada()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
declare n int; productores int; estates int; variedades int; procesos int; regiones int;
        grados_ok boolean; composicion_ok boolean; region_ok boolean; v_tipo text; sobre int;
begin
  if old.status = 'cerrada' and new.status = 'borrador' then
    raise exception 'Una mezcla cerrada no vuelve a borrador: anúlela.';
  end if;
  if new.status = 'cerrada' and old.status is distinct from 'cerrada' then
    select count(*), count(distinct l.producer_id), coalesce(bool_and(c.grado = new.grado), false)
      into n, productores, grados_ok
      from public.mezcla_componentes mc
      join public.compras c on c.id = mc.compra_id
      join public.lots l on l.id = c.lot_id
     where mc.mezcla_id = new.id;
    if n < 2 then raise exception 'Una mezcla es de varios lotes (tiene %).', n; end if;
    if not grados_ok then raise exception 'Todos los componentes deben ser del grado de la mezcla.'; end if;
    if productores < 2 then
      raise exception 'Una mezcla de CTCx Selection junta lotes de varios productores (esta tiene %): un lote con varias fincas del mismo productor es un tipo de lote y se arma en Kaffetal Regal.', productores;
    end if;

    -- La composición: las variedades con su proceso, de cada lote (o su proyección si la ficha no trae filas).
    with comp as (
      select l.id as lot_id, l.finca_id, l.datasheet, l.ficha_variedad, l.ficha_proceso
        from public.mezcla_componentes mc
        join public.compras c on c.id = mc.compra_id
        join public.lots l on l.id = c.lot_id
       where mc.mezcla_id = new.id
    ), vj as (
      select comp.lot_id,
             lower(trim(v->>'name')) as variedad,
             lower(trim(coalesce(nullif(trim(v->>'special'), ''), v->>'base'))) as proceso
        from comp,
             jsonb_array_elements(case when jsonb_typeof(comp.datasheet->'varieties') = 'array' then comp.datasheet->'varieties' else '[]'::jsonb end) v
       where nullif(trim(v->>'name'), '') is not null
         and coalesce(substring(replace(v->>'pct', ',', '.') from '^[0-9]+(\.[0-9]+)?')::numeric, 1) > 0
    ), vari as (
      select lot_id, variedad, proceso from vj
      union all
      select comp.lot_id, lower(trim(comp.ficha_variedad)), lower(trim(comp.ficha_proceso))
        from comp where not exists (select 1 from vj where vj.lot_id = comp.lot_id)
    )
    select count(distinct variedad), count(distinct proceso),
           coalesce(bool_and(nullif(variedad, '') is not null and nullif(proceso, '') is not null), false)
      into variedades, procesos, composicion_ok
      from vari;

    -- Los estates y su región: todas las fincas del lote (aportes + la primaria).
    with comp as (
      select l.id as lot_id, l.finca_id
        from public.mezcla_componentes mc
        join public.compras c on c.id = mc.compra_id
        join public.lots l on l.id = c.lot_id
       where mc.mezcla_id = new.id
    ), fin as (
      select comp.lot_id, f.id as finca_id, lower(trim(f.departamento)) as departamento
        from comp join public.lot_contributions lc on lc.lot_id = comp.lot_id join public.fincas f on f.id = lc.finca_id
      union
      select comp.lot_id, f.id, lower(trim(f.departamento))
        from comp join public.fincas f on f.id = comp.finca_id
    )
    select count(distinct finca_id), count(distinct departamento), coalesce(bool_and(nullif(departamento, '') is not null), false)
      into estates, regiones, region_ok
      from fin;

    if composicion_ok and variedades = 1 and procesos = 1 and estates >= 2 then v_tipo := 'single_origin';
    elsif region_ok and regiones = 1 then v_tipo := 'regional_blend';
    else raise exception 'Una mezcla Black/Red es Single Origin (varios estates, una variedad y un proceso) o Regional Blend (varios lotes de la misma región): esta no es ninguna de las dos.';
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
-- El trigger `guard_mezcla_cerrada before update on public.mezclas` (V5.87) sigue; solo cambió la función.
