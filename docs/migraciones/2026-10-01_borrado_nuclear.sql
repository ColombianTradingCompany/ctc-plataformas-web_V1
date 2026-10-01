-- ── Acta · 2026-10-01 · V5.134 · el BORRADO NUCLEAR de un lote o una finca, y su archivo ─────────────────────────────
-- Aplicada con `apply_migration` (nombre `borrado_nuclear`) en el proyecto sjznkzvefqfcysczllli.
--
-- Owner (2026-10-01): «necesito tener una manera desde OCP para poder borrar Lotes y Fincas, incluso después de haber
-- procesado todo, el cual remueva completamente la información como si no hubiese existido. Para ello, dame ese "Botón
-- Nuclear", el cual tenga doble confirmación y le mande un mensaje al Productor que le anuncie que hubo esta operación
-- unilateral por cuestiones del sistema. Agreguemos un módulo que guarde esta info como archivo.»
--
-- CÓMO ESTÁ HECHO, y por qué en la base y no en el servidor de la aplicación:
--   · Un lote arrastra unas 25 tablas (solicitud, factura, muestras, evaluaciones, ofertas, contratos y sus meses,
--     compras, subastas, fichas…). Borrarlas con llamadas sueltas dejaría medio lote si una falla. Aquí TODO ocurre en
--     UNA transacción: `nuclear_borrar` recoge la instantánea, la guarda en `borrados_nucleares` y borra — o no hace nada.
--   · `_nuclear_recoger` es la ÚNICA lectura: la usan el inventario (lo que la pantalla enseña antes de confirmar) y el
--     borrado, para que lo que se anuncia sea exactamente lo que se borra.
--   · LO QUE NO SE BORRA DESDE AQUÍ (bloqueos — la función se niega y dice por qué):
--       – pedidos y reservas de COMPRADORES sobre el lote publicado (`order_items`, `lot_reservations`) y pujas de una
--         subasta (`auction_bids`): es dinero y registro de un tercero;
--       – una compra del lote que ya está dentro de una MEZCLA o de Sample Kits (`mezcla_componentes`,
--         `sample_kit_items`, que protegen a `compras` con RESTRICT a propósito): borrarla falsearía un stock que
--         también es de otros lotes;
--       – una finca que APORTA a un lote cuya finca principal es otra: se borra primero ese lote.
--   · Los ARCHIVOS (fotos, videos, documentos): las filas de `media_assets` se borran aquí; los objetos de Storage los
--     quita el servidor después (`src/lib/ocp/borradoNuclear.ts`) y anota el resultado en el archivo.
--   · El rastro del lote o la finca en `audit_log` y en `producer_comm_log` también se va (queda en la instantánea); se
--     deja UNA fila de auditoría de la operación, que apunta al archivo.
--   · `borrados_nucleares` es service-role-only (RLS sin políticas), como casi todas. No tiene llave foránea al
--     productor a propósito: el archivo sobrevive aunque la cuenta se borre después.

create table if not exists public.borrados_nucleares (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('lote', 'finca')),
  entidad_id uuid not null,
  codigo text not null,
  nombre text not null,
  producer_id uuid,
  productor_nombre text,
  productor_email text,
  motivo text not null,
  conteos jsonb not null default '{}'::jsonb,
  snapshot jsonb not null default '{}'::jsonb,
  archivos jsonb not null default '[]'::jsonb,
  archivos_borrados_at timestamptz,
  archivos_error text,
  aviso_nota text,
  aviso_comm_at timestamptz,
  aviso_email_estado text,
  aviso_email_error text,
  ejecutado_por uuid,
  ejecutado_por_nombre text,
  ejecutado_at timestamptz not null default now()
);
alter table public.borrados_nucleares enable row level security;
comment on table public.borrados_nucleares is 'V5.134: el archivo de los borrados nucleares de lotes y fincas (OCP). Una fila por operación: quién, cuándo, por qué, qué se borró (instantánea completa) y cómo se avisó al productor. Service-role-only.';

-- Las filas de una tabla cuya columna está en una lista de ids, como jsonb.
create or replace function public._nuclear_filas(p_tabla regclass, p_col text, p_ids uuid[])
returns jsonb language plpgsql security invoker set search_path = public as $$
declare r jsonb;
begin
  if p_ids is null or cardinality(p_ids) = 0 then return '[]'::jsonb; end if;
  execute format('select coalesce(jsonb_agg(to_jsonb(t)), ''[]''::jsonb) from %s t where t.%I = any($1)', p_tabla, p_col) into r using p_ids;
  return r;
end $$;

-- Los ids de las filas de una clave de la instantánea.
create or replace function public._nuclear_ids(p_snap jsonb, p_clave text)
returns uuid[] language sql immutable as $$
  select coalesce(array_agg((e->>'id')::uuid), '{}'::uuid[]) from jsonb_array_elements(coalesce(p_snap->p_clave, '[]'::jsonb)) e where e ? 'id';
$$;

-- LA lectura: todo lo que cuelga de un lote o de una finca, los bloqueos y los archivos.
create or replace function public._nuclear_recoger(p_tipo text, p_id uuid)
returns jsonb language plpgsql security invoker set search_path = public as $$
declare
  v_lotes uuid[] := '{}';
  v_fincas uuid[] := '{}';
  v_producer uuid;
  v_nombre text;
  snap jsonb;
  bloqueos text[] := '{}';
  v_ids uuid[];
  v_comms uuid[];
  v_assets uuid[];
  v_patrones text[] := '{}';
  v_archivos jsonb;
  n int;
  t text;
begin
  if p_tipo = 'lote' then
    select producer_id, name into v_producer, v_nombre from lots where id = p_id;
    if not found then raise exception 'El lote no existe (¿ya se borró?).'; end if;
    v_lotes := array[p_id];
  elsif p_tipo = 'finca' then
    select producer_id, name into v_producer, v_nombre from fincas where id = p_id;
    if not found then raise exception 'La finca no existe (¿ya se borró?).'; end if;
    v_fincas := array[p_id];
    select coalesce(array_agg(id), '{}') into v_lotes from lots where finca_id = p_id;
    select string_agg(l.name, ', ') into t from lot_contributions c join lots l on l.id = c.lot_id where c.finca_id = p_id and l.finca_id is distinct from p_id;
    if t is not null then bloqueos := bloqueos || format('La finca aporta café a lotes de otra finca (%s): borre primero esos lotes.', t); end if;
  else
    raise exception 'Tipo desconocido: %', p_tipo;
  end if;

  -- Nivel 1: lo que apunta al lote o a la finca.
  snap := jsonb_build_object(
    'fincas', _nuclear_filas('fincas', 'id', v_fincas),
    'finca_parcelas', _nuclear_filas('finca_parcelas', 'finca_id', v_fincas),
    'finca_certificates', _nuclear_filas('finca_certificates', 'finca_id', v_fincas),
    'terratalento_jornadas', _nuclear_filas('terratalento_jornadas', 'finca_id', v_fincas),
    'lots', _nuclear_filas('lots', 'id', v_lotes),
    'lot_contributions', _nuclear_filas('lot_contributions', 'lot_id', v_lotes),
    'lot_fichas', _nuclear_filas('lot_fichas', 'lot_id', v_lotes),
    'ficha_completion_snapshots', _nuclear_filas('ficha_completion_snapshots', 'lot_id', v_lotes),
    'arena_inscriptions', _nuclear_filas('arena_inscriptions', 'lot_id', v_lotes),
    'arena_entry_codes', _nuclear_filas('arena_entry_codes', 'lot_id', v_lotes),
    'arena_scores', _nuclear_filas('arena_scores', 'lot_id', v_lotes),
    'arena_session_lots', _nuclear_filas('arena_session_lots', 'lot_id', v_lotes),
    'muestras', _nuclear_filas('muestras', 'lot_id', v_lotes),
    'lot_evaluations', _nuclear_filas('lot_evaluations', 'lot_id', v_lotes),
    'lot_offers', _nuclear_filas('lot_offers', 'lot_id', v_lotes),
    'black_negotiations', _nuclear_filas('black_negotiations', 'lot_id', v_lotes),
    'purchase_contracts', _nuclear_filas('purchase_contracts', 'lot_id', v_lotes),
    'compras', _nuclear_filas('compras', 'lot_id', v_lotes),
    'ctcx_selection_lotes', _nuclear_filas('ctcx_selection_lotes', 'lot_id', v_lotes),
    'lot_listings', _nuclear_filas('lot_listings', 'lot_id', v_lotes),
    'lot_auctions', _nuclear_filas('lot_auctions', 'lot_id', v_lotes)
  );
  -- Nivel 2: lo que apunta a lo anterior.
  snap := snap || jsonb_build_object(
    'terratalento_postulaciones', _nuclear_filas('terratalento_postulaciones', 'jornada_id', _nuclear_ids(snap, 'terratalento_jornadas')),
    'muestra_movimientos', _nuclear_filas('muestra_movimientos', 'muestra_id', _nuclear_ids(snap, 'muestras')),
    'contract_months', _nuclear_filas('contract_months', 'contract_id', _nuclear_ids(snap, 'purchase_contracts')),
    'contract_releases', _nuclear_filas('contract_releases', 'contract_id', _nuclear_ids(snap, 'purchase_contracts')),
    'humidity_readings', _nuclear_filas('humidity_readings', 'contract_id', _nuclear_ids(snap, 'purchase_contracts'))
  );
  -- Las aportaciones de una finca: las de sus propios lotes ya están; las que hace a otros lotes son un bloqueo (arriba).

  -- Los bloqueos: lo que es de un tercero o de un stock compartido.
  select count(*) into n from order_items where lot_listing_id = any(_nuclear_ids(snap, 'lot_listings'));
  if n > 0 then bloqueos := bloqueos || format('Hay %s ítem(s) de pedidos de compradores sobre este café: un pedido de un comprador no se borra desde aquí.', n); end if;
  select count(*) into n from lot_reservations where lot_listing_id = any(_nuclear_ids(snap, 'lot_listings'));
  if n > 0 then bloqueos := bloqueos || format('Hay %s reserva(s) de compradores sobre este café.', n); end if;
  select count(*) into n from auction_bids where auction_id = any(_nuclear_ids(snap, 'lot_auctions'));
  if n > 0 then bloqueos := bloqueos || format('La subasta del lote tiene %s puja(s) de compradores.', n); end if;
  select count(*) into n from mezcla_componentes where compra_id = any(_nuclear_ids(snap, 'compras'));
  if n > 0 then bloqueos := bloqueos || format('Una compra de este café ya está dentro de una mezcla (%s componente(s)): deshaga la mezcla primero.', n); end if;
  select count(*) into n from sample_kit_items where compra_id = any(_nuclear_ids(snap, 'compras'));
  if n > 0 then bloqueos := bloqueos || format('Una compra de este café ya está en el stock de Sample Kits (%s ítem(s)).', n); end if;

  -- El hilo con el productor sobre el lote o la finca, y sus respuestas.
  select coalesce(array_agg(id), '{}') into v_comms from producer_comm_log
    where lot_id = any(v_lotes) or finca_id = any(v_fincas);
  select coalesce(array_agg(distinct id), '{}') into v_comms from producer_comm_log where id = any(v_comms) or parent_id = any(v_comms);
  snap := snap || jsonb_build_object('producer_comm_log', _nuclear_filas('producer_comm_log', 'id', v_comms));

  -- El rastro de auditoría de TODO lo anterior (audit_log.entity_id no es llave foránea: se busca por id).
  select coalesce(array_agg(distinct (e->>'id')::uuid), '{}') into v_ids
    from jsonb_each(snap) s(k, arr), jsonb_array_elements(arr) e
    where e ? 'id' and (e->>'id') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  snap := snap || jsonb_build_object('audit_log', _nuclear_filas('audit_log', 'entity_id', v_ids));

  -- (`.keyvalue()` solo se aplica a objetos y `$.**` también recorre textos: se filtra por tipo — corregido en la
  -- migración `borrado_nuclear_jsonpath_solo_objetos`, aplicada el mismo día; este texto ya es el vigente.)
  -- Los archivos: los que la instantánea nombra (claves …assetId / …asset_id) y los que viven en la carpeta del lote o la finca.
  select coalesce(array_agg(distinct (kv->>'value')::uuid), '{}') into v_assets
    from jsonb_path_query(snap, '$.** ? (@.type() == "object").keyvalue() ? (@.key like_regex "(assetId|asset_id)$")') kv
    where jsonb_typeof(kv->'value') = 'string' and (kv->>'value') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  select coalesce(array_agg(v_producer::text || '/lots/' || x::text || '/%'), '{}') into v_patrones from unnest(v_lotes) x;
  select v_patrones || coalesce(array_agg(v_producer::text || '/fincas/' || x::text || '/%'), '{}') into v_patrones from unnest(v_fincas) x;
  select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'bucket', m.bucket, 'path', m.path, 'size_bytes', m.size_bytes)), '[]'::jsonb) into v_archivos
    from media_assets m where m.id = any(v_assets) or m.path like any(v_patrones);

  return jsonb_build_object(
    'tipo', p_tipo, 'id', p_id, 'nombre', v_nombre, 'producer_id', v_producer,
    'lotes', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name)), '[]'::jsonb) from lots where id = any(v_lotes)),
    'snapshot', snap, 'bloqueos', to_jsonb(bloqueos), 'archivos', v_archivos,
    'conteos', (select coalesce(jsonb_object_agg(k, jsonb_array_length(arr)), '{}'::jsonb) from jsonb_each(snap) s(k, arr) where jsonb_array_length(arr) > 0)
  );
end $$;

-- Lo que la pantalla enseña ANTES de confirmar: los conteos, los bloqueos y los lotes que se van — sin la instantánea.
create or replace function public.nuclear_inventario(p_tipo text, p_id uuid)
returns jsonb language sql security invoker set search_path = public as $$
  select r - 'snapshot' || jsonb_build_object('archivos', jsonb_array_length(r->'archivos')) from (select _nuclear_recoger(p_tipo, p_id) as r) x;
$$;

-- EL BORRADO: instantánea → archivo → borrar. Una transacción; devuelve el id de la fila del archivo.
create or replace function public.nuclear_borrar(p_tipo text, p_id uuid, p_codigo text, p_admin uuid, p_admin_nombre text, p_motivo text)
returns uuid language plpgsql security invoker set search_path = public as $$
declare
  r jsonb;
  snap jsonb;
  v_archivo uuid;
  v_lotes uuid[];
  v_asset record;
  v_archivos jsonb := '[]'::jsonb;
  v_perfil record;
begin
  if coalesce(btrim(p_motivo), '') = '' then raise exception 'Falta el motivo del borrado.'; end if;
  r := _nuclear_recoger(p_tipo, p_id);
  if jsonb_array_length(r->'bloqueos') > 0 then
    raise exception 'BLOQUEADO: %', (select string_agg(x, ' · ') from jsonb_array_elements_text(r->'bloqueos') x);
  end if;
  snap := r->'snapshot';
  select full_name, email into v_perfil from profiles where id = (r->>'producer_id')::uuid;

  insert into borrados_nucleares (tipo, entidad_id, codigo, nombre, producer_id, productor_nombre, productor_email, motivo, conteos, snapshot, archivos, ejecutado_por, ejecutado_por_nombre)
  values (p_tipo, p_id, p_codigo, r->>'nombre', (r->>'producer_id')::uuid, v_perfil.full_name, v_perfil.email, btrim(p_motivo), r->'conteos', snap, r->'archivos', p_admin, p_admin_nombre)
  returning id into v_archivo;

  -- 1. Lo que NO cae en cascada con el lote o la finca.
  delete from producer_comm_log where id = any(_nuclear_ids(snap, 'producer_comm_log'));
  delete from audit_log where id = any(_nuclear_ids(snap, 'audit_log'));
  select coalesce(array_agg((e->>'id')::uuid), '{}') into v_lotes from jsonb_array_elements(r->'lotes') e;
  delete from lot_listings where lot_id = any(v_lotes);
  -- 2. La entidad: la cascada se lleva todo lo demás.
  if p_tipo = 'finca' then
    delete from lots where id = any(v_lotes);
    delete from fincas where id = p_id;
  else
    delete from lots where id = p_id;
  end if;
  -- 3. Las filas de sus archivos. Una que todavía use otra cosa (no debería) se deja, y no se borra su objeto.
  for v_asset in select (e->>'id')::uuid as id, e as fila from jsonb_array_elements(r->'archivos') e loop
    begin
      delete from media_assets where id = v_asset.id;
      v_archivos := v_archivos || jsonb_build_array(v_asset.fila);
    exception when foreign_key_violation then
      null;
    end;
  end loop;
  update borrados_nucleares set archivos = v_archivos where id = v_archivo;

  insert into audit_log (entity_type, entity_id, action, performed_by, notes)
  values ('borrado_nuclear', v_archivo, 'borrado_nuclear_' || p_tipo, p_admin, format('%s %s «%s» · %s', p_tipo, p_codigo, r->>'nombre', btrim(p_motivo)));
  return v_archivo;
end $$;

-- Solo el servidor (service role) las llama.
revoke all on function public._nuclear_filas(regclass, text, uuid[]) from public, anon, authenticated;
revoke all on function public._nuclear_ids(jsonb, text) from public, anon, authenticated;
revoke all on function public._nuclear_recoger(text, uuid) from public, anon, authenticated;
revoke all on function public.nuclear_inventario(text, uuid) from public, anon, authenticated;
revoke all on function public.nuclear_borrar(text, uuid, text, uuid, text, text) from public, anon, authenticated;
grant execute on function public._nuclear_filas(regclass, text, uuid[]) to service_role;
grant execute on function public._nuclear_ids(jsonb, text) to service_role;
grant execute on function public._nuclear_recoger(text, uuid) to service_role;
grant execute on function public.nuclear_inventario(text, uuid) to service_role;
grant execute on function public.nuclear_borrar(text, uuid, text, uuid, text, text) to service_role;
