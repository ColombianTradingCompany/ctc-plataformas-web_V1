-- 2026-11-02 · Integraciones · el enum `integration_domain` se PARTE en el «Mapa CTC» 0–9 (D-007; P20 del plan de unificación,
-- `docs/PLAN_UNIFICACION.md`). Se parte, no se renombra: dos valores viejos alimentan `operacion_logistica`, dos alimentan
-- `conocimiento`, y `ventas_marketing` se reparte entre `comercial` y `marca_contenido`.
--
-- Qué hace (up, UNA transacción):
--   0. Guarda: el enum tiene que seguir siendo el viejo (una segunda corrida aborta aquí y no toca nada).
--   1. Instantánea `dominio_split_snapshot_20261102 (tabla, id, dominio_antiguo, clave)`: cada fila de las dos tablas con su valor
--      viejo y lo que decide su reparto (`tipo` del evento, `nombre` de la automatización). Sin payloads. RLS encendida, sin
--      políticas y sin permisos para anon/authenticated: solo el service role. La lee el down. Una migración posterior, aprobada,
--      la borra a los 30 días.
--   2. El tipo viejo pasa a `integration_domain_old` y nace el nuevo, en el orden 0–9.
--   3. `integration_events.dominio` y `automations.dominio` se convierten con un CASE. Las pruebas de tipo y de nombre van ANTES
--      que los mapeos simples. El tipo se lee sin el prefijo `entrante.`, así que la copia de entrada sigue a su tipo de salida.
--      Un valor que el CASE no conozca da NULL y la columna es NOT NULL: la transacción entera aborta.
--   4. Se borra el tipo viejo.
--   Defaults: ninguna de las dos columnas tiene default (leído el 2026-11-02), así que no hay default que reponer.
--
-- Catálogo (leído el 2026-11-02, solo lectura): del tipo dependen SOLO las dos columnas; 0 vistas, 0 funciones (cuerpo o firma),
-- 0 políticas, 0 CHECK y 0 expresiones de índice con un literal viejo. Los triggers `automations_touch_trg` e
-- `integration_events_guard_trg` no miran `dominio` y un ALTER COLUMN TYPE no los dispara. El índice simple `automations_orden
-- (etapa, dominio, nombre)` se reconstruye solo con el ALTER.
--
-- Orden de uso: (A) pre-chequeos, solo lectura · (B) up · (C) post-chequeos, solo lectura · (D) down, solo para revertir y
-- SIEMPRE junto con el rollback del código (cada versión del código rechaza los valores de la otra).
--
-- Reparto previsto (filas de producción el 2026-11-02; se re-cuentan en la ventana con los pares guardados):
--   integration_events (26): ventas_marketing → marca_contenido 2 (tipo coffeed.% / rts.%) · → comercial 16
--                             it_plataforma → conocimiento 1 (tipo herramienta.%) · → plataformas_it 4 · origen_suministro → origen 3
--   automations (18):         admin_estrategia → direccion 5 · it_plataforma → plataformas_it 4 · origen_suministro → origen 2
--                             transito_importacion → operacion_logistica 1 · ventas_marketing → marca_contenido 1 (nombre
--                             «RT-Scriptor…») · → comercial 5
--   directorios / ejecucion / archivo: 0. Instantánea: 44 filas.
-- Ensayo en una rama de Supabase el 2026-11-02 (sesión 1, rama borrada el mismo día): up → conteos = previstos; down → los 44
-- valores viejos exactos; up otra vez → conteos = previstos. Las cifras reales de producción se añaden al sellar el sha.


-- ═══ (A) Pre-chequeos · solo lectura ═══════════════════════════════════════════════════════════════════════════════════════════
-- Esperado: los 7 valores viejos en su orden · un solo tipo integration_domain* · sin default · sin instantánea todavía.
select
  (select string_agg(enumlabel, ',' order by enumsortorder) from pg_enum
    where enumtypid = 'public.integration_domain'::regtype)                                      as enum_actual,
  (select count(*) from pg_type where typname like 'integration_domain%' and typtype = 'e')      as tipos_dominio,
  (select count(*) from information_schema.columns
    where udt_name = 'integration_domain' and column_default is not null)                        as columnas_con_default,
  to_regclass('public.dominio_split_snapshot_20261102') is null                                  as sin_instantanea,
  (select count(*) from public.integration_events)                                               as eventos,
  (select count(*) from public.automations)                                                      as automatizaciones;

-- Los pares (tabla, id, dominio, tipo/nombre) se guardan ADEMÁS en un CSV fuera del repo antes de correr (B).


-- ═══ (B) up · una transacción ══════════════════════════════════════════════════════════════════════════════════════════════════
-- Por `apply_migration` el texto corre ya como una transacción (comprobado en la rama del ensayo): se pasa SIN begin/commit.
-- A mano, en el editor SQL, envuélvelo en begin; … commit;.

do $$
begin
  if not exists (select 1 from pg_enum
                 where enumtypid = 'public.integration_domain'::regtype and enumlabel = 'admin_estrategia') then
    raise exception 'P20 up: integration_domain ya no es el vocabulario viejo; esta migración no se corre dos veces';
  end if;
end $$;

create table public.dominio_split_snapshot_20261102 (
  tabla           text        not null check (tabla in ('integration_events', 'automations')),
  id              uuid        not null,
  dominio_antiguo text        not null,
  clave           text        not null,  -- `tipo` del evento o `nombre` de la automatización
  tomada_at       timestamptz not null default now(),
  primary key (tabla, id)
);
alter table public.dominio_split_snapshot_20261102 enable row level security;
revoke all on public.dominio_split_snapshot_20261102 from anon, authenticated;

insert into public.dominio_split_snapshot_20261102 (tabla, id, dominio_antiguo, clave)
  select 'integration_events', id, dominio::text, tipo   from public.integration_events
  union all
  select 'automations',        id, dominio::text, nombre from public.automations;

alter type public.integration_domain rename to integration_domain_old;

create type public.integration_domain as enum (
  'direccion',            -- 0 · Dirección
  'origen',               -- 1 · Origen
  'operacion_logistica',  -- 2 · Operación y Logística
  'comercial',            -- 3 · Comercial
  'marca_contenido',      -- 4 · Marca y Contenido
  'plataformas_it',       -- 5 · Plataformas e IT
  'conocimiento',         -- 6 · Conocimiento
  'directorios',          -- 7 · Directorios
  'ejecucion',            -- 8 · Ejecución
  'archivo'               -- 9 · Archivo
);

alter table public.integration_events
  alter column dominio type public.integration_domain using (
    case
      when dominio::text = 'ventas_marketing'
       and regexp_replace(tipo, '^entrante\.', '') ~ '^(coffeed|rts)\.'               then 'marca_contenido'
      when dominio::text = 'ventas_marketing'                                           then 'comercial'
      when dominio::text = 'it_plataforma'
       and regexp_replace(tipo, '^entrante\.', '') like 'herramienta.%'               then 'conocimiento'
      when dominio::text = 'it_plataforma'                                              then 'plataformas_it'
      when dominio::text = 'investigacion'                                              then 'conocimiento'
      when dominio::text in ('tostadores_inventario', 'transito_importacion')           then 'operacion_logistica'
      when dominio::text = 'admin_estrategia'                                           then 'direccion'
      when dominio::text = 'origen_suministro'                                          then 'origen'
    end
  )::public.integration_domain;

alter table public.automations
  alter column dominio type public.integration_domain using (
    case
      when dominio::text = 'ventas_marketing' and nombre like 'RT-Scriptor%'           then 'marca_contenido'
      when dominio::text = 'ventas_marketing'                                           then 'comercial'
      when dominio::text = 'it_plataforma'                                              then 'plataformas_it'
      when dominio::text = 'investigacion'                                              then 'conocimiento'
      when dominio::text in ('tostadores_inventario', 'transito_importacion')           then 'operacion_logistica'
      when dominio::text = 'admin_estrategia'                                           then 'direccion'
      when dominio::text = 'origen_suministro'                                          then 'origen'
    end
  )::public.integration_domain;

drop type public.integration_domain_old;


-- ═══ (C) Post-chequeos · solo lectura ══════════════════════════════════════════════════════════════════════════════════════════
-- Esperado: los 10 valores en orden 0–9 · un solo tipo · los conteos del reparto previsto · instantánea = eventos + automatizaciones.
select string_agg(enumlabel, ',' order by enumsortorder) as enum_nuevo
  from pg_enum where enumtypid = 'public.integration_domain'::regtype;
select count(*) as tipos_dominio from pg_type where typname like 'integration_domain%' and typtype = 'e';
select 'integration_events' as tabla, dominio::text, count(*) from public.integration_events group by 2
union all
select 'automations', dominio::text, count(*) from public.automations group by 2
order by 1, 2;
select tabla, dominio_antiguo, count(*) from public.dominio_split_snapshot_20261102 group by 1, 2 order by 1, 2;


-- ═══ (D) down · solo para revertir, junto con el rollback del código ═══════════════════════════════════════════════════════════
-- Cada fila de la instantánea recibe su valor viejo EXACTO. Una fila nacida después del reparto se devuelve por la regla inversa
-- (direccion→admin_estrategia · origen→origen_suministro · operacion_logistica→transito_importacion · comercial y
-- marca_contenido→ventas_marketing · plataformas_it→it_plataforma · conocimiento→it_plataforma si su tipo es herramienta.%, si no
-- investigacion). Una fila en directorios / ejecucion / archivo no tiene equivalente viejo: el down PARA y se pregunta al owner.
-- La función auxiliar nace y muere dentro de la misma transacción. La instantánea no se borra: queda renombrada
-- `…_revertida` (así un up posterior toma una instantánea nueva; un segundo down aborta en vez de pisarla).

do $$
begin
  if to_regclass('public.dominio_split_snapshot_20261102') is null then
    raise exception 'P20 down: falta la instantánea dominio_split_snapshot_20261102; sin ella el reparto no se deshace exacto';
  end if;
  if not exists (select 1 from pg_enum
                 where enumtypid = 'public.integration_domain'::regtype and enumlabel = 'direccion') then
    raise exception 'P20 down: integration_domain no es el vocabulario nuevo';
  end if;
  if exists (select 1 from public.integration_events where dominio::text in ('directorios', 'ejecucion', 'archivo'))
     or exists (select 1 from public.automations where dominio::text in ('directorios', 'ejecucion', 'archivo')) then
    raise exception 'P20 down: hay filas en directorios / ejecucion / archivo, sin equivalente viejo; para y pregunta al owner';
  end if;
end $$;

create function public.p20_dominio_antiguo(p_tabla text, p_id uuid, p_nuevo text, p_clave text)
returns text
language sql
stable
set search_path = ''
as $$
  select coalesce(
    (select s.dominio_antiguo from public.dominio_split_snapshot_20261102 s where s.tabla = p_tabla and s.id = p_id),
    case p_nuevo
      when 'direccion'           then 'admin_estrategia'
      when 'origen'              then 'origen_suministro'
      when 'operacion_logistica' then 'transito_importacion'
      when 'comercial'           then 'ventas_marketing'
      when 'marca_contenido'     then 'ventas_marketing'
      when 'plataformas_it'      then 'it_plataforma'
      when 'conocimiento'        then case when regexp_replace(coalesce(p_clave, ''), '^entrante\.', '') like 'herramienta.%'
                                           then 'it_plataforma' else 'investigacion' end
    end
  )
$$;

alter type public.integration_domain rename to integration_domain_nuevo;

create type public.integration_domain as enum (
  'admin_estrategia', 'origen_suministro', 'transito_importacion', 'tostadores_inventario',
  'ventas_marketing', 'it_plataforma', 'investigacion'
);

alter table public.integration_events
  alter column dominio type public.integration_domain
  using public.p20_dominio_antiguo('integration_events', id, dominio::text, tipo)::public.integration_domain;

alter table public.automations
  alter column dominio type public.integration_domain
  using public.p20_dominio_antiguo('automations', id, dominio::text, nombre)::public.integration_domain;

drop type public.integration_domain_nuevo;
drop function public.p20_dominio_antiguo(text, uuid, text, text);
alter table public.dominio_split_snapshot_20261102 rename to dominio_split_snapshot_20261102_revertida;

-- Tras el down: el enum vuelve a los 7 valores en su orden; cada fila de la instantánea tiene su dominio_antiguo
-- (select … from public.dominio_split_snapshot_20261102_revertida s join … where s.dominio_antiguo <> t.dominio::text → 0 filas).
