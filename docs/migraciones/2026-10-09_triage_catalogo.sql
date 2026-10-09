-- ACTA · 2026-10-09 · V5.196 · migración `triage_catalogo` (aplicada a `sjznkzvefqfcysczllli`)
--
-- Plan `docs/PLAN_TRIAGE_CATALOGO.md` §2.3 y §4 (tanda C). El owner, 2026-10-09: en «Ofertas CP Aceptadas» —que se rebautiza
-- «Triage de Catálogo Activo»— «debo recibir las ofertas que fueron aceptadas y también las cantidades del Stock CTCx, añadirles una
-- referencia de costos de empaque hasta FOB, poner el O&P de CTCx y declararlo con ello como parte del catálogo activo», con «el
-- ancla fundamental de cada lote en precio FOB mínimo».
--
-- (1) `catalogo_fuentes` (CF-AAAA-NNNN): cada DECLARACIÓN al Catálogo Activo — de un trato por ventana vigente (kg de CPS que
--     siguen en la finca) o de una partida del Stock CTCx (pergamino o verde, también empacado; nunca comprometida) —, con su
--     cuenta CONGELADA: kg de verde, conversión, precio de origen, trilla, la referencia de Empacado hasta FOB, el O&P, la TRM y el
--     FOB mínimo en COP y US$ por kg de verde; al lado, exhibido y sin gobernar, el N2 de la banda en la edición vigente del PVC. Una
--     declaración no se edita: se RETIRA (o se corrige: se retira y nace otra, en la misma transacción).
-- (2) El ANCLA de un listado = el mayor FOB mínimo de sus declaraciones vivas. NO vive en `lot_listings`: esa tabla la lee cualquiera
--     (política pública de lectura) y el FOB mínimo es interno. La compuerta `guard_listing_ancla` lo calcula de aquí y no deja que
--     el precio de venta baje de él.
-- (3) El listado del lote lo gobiernan sus declaraciones (`triage_recalcular_listado`): `total_kg` = kg de VERDE declarados; el
--     precio sube al ancla (redondeada hacia arriba a US$ 0,05) si quedó por debajo; sin declaraciones vivas, se archiva. Declarar
--     el primer café de un lote crea su listado y lo publica (acuña el código público si falta).
-- (4) El Stock CTCx descuenta lo declarado de su disponible, y una partida declarada ya «se movió».
-- (5) Se retiran el trigger `contract_releases_sync_listing_total` y su función (los tratos viejos por liberaciones; 0 filas): el
--     total de un listado ya no lo escribe nadie más que el Triage.
-- (6) El borrado nuclear: un lote con declaraciones vivas no se borra (séptimo bloqueo); las retiradas viajan en la copia.
--
-- El O&P no tiene valor por defecto en esta acta (ni en ningún archivo del repositorio): lo escribe un colaborador con nivel para
-- emitir en `platform_settings.triage_catalogo`, y queda en cada declaración. Service-role-only (RLS sin políticas).

-- ── (1) las declaraciones ────────────────────────────────────────────────────────────────────────────────────────────────────
create sequence if not exists public.catalogo_fuentes_seq;

create table if not exists public.catalogo_fuentes (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique default ('CF-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.catalogo_fuentes_seq')::text, 4, '0')),
  lot_id uuid not null references public.lots(id) on delete cascade,
  listing_id uuid not null references public.lot_listings(id) on delete cascade,
  tipo text not null check (tipo in ('contrato', 'stock')),
  contract_id uuid references public.purchase_contracts(id) on delete cascade,
  partida_id uuid references public.stock_partidas(id) on delete restrict,
  kg_verde numeric not null check (kg_verde > 0),
  kg_origen numeric not null check (kg_origen > 0),
  conversion numeric not null check (conversion > 0 and conversion <= 1),
  precio_origen_cop_kg numeric not null check (precio_origen_cop_kg >= 0),
  trilla_cop_kg numeric not null default 0 check (trilla_cop_kg >= 0),
  cafe_cop_kg numeric not null check (cafe_cop_kg >= 0),
  referencia_id uuid not null references public.empaque_fob_referencias(id) on delete restrict,
  empaque_cop_kg numeric not null check (empaque_cop_kg >= 0),
  op_pct numeric not null check (op_pct >= 0 and op_pct < 1000),
  trm numeric not null check (trm > 0),
  fob_min_cop_kg numeric not null check (fob_min_cop_kg > 0),
  fob_min_usd_kg numeric not null check (fob_min_usd_kg > 0),
  pvc_edition_id uuid references public.pvc_editions(id) on delete set null,
  pvc_n2_usd_kg numeric,
  estado text not null default 'declarada' check (estado in ('declarada', 'retirada')),
  nota text check (nota is null or length(nota) <= 500),
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  retirada_at timestamptz,
  retirada_por uuid references public.profiles(id) on delete set null,
  retirada_motivo text check (retirada_motivo is null or length(retirada_motivo) <= 300),
  constraint catalogo_fuentes_origen_check check (
    (tipo = 'contrato' and contract_id is not null and partida_id is null)
    or (tipo = 'stock' and partida_id is not null and contract_id is null)
  ),
  constraint catalogo_fuentes_retiro_check check ((estado = 'declarada') = (retirada_at is null))
);
comment on table public.catalogo_fuentes is 'V5.196 · Triage de Catálogo Activo: cada declaración de café al Catálogo Activo (de un trato por ventana o del Stock CTCx) con su FOB mínimo congelado. Se retira, no se edita.';
create unique index if not exists catalogo_fuentes_contrato_viva on public.catalogo_fuentes (contract_id) where estado = 'declarada' and contract_id is not null;
create unique index if not exists catalogo_fuentes_partida_viva on public.catalogo_fuentes (partida_id) where estado = 'declarada' and partida_id is not null;
create index if not exists catalogo_fuentes_listing_idx on public.catalogo_fuentes (listing_id, estado);
create index if not exists catalogo_fuentes_lot_idx on public.catalogo_fuentes (lot_id);
alter table public.catalogo_fuentes enable row level security;
-- (sin políticas: solo el service role)

-- Una declaración queda como se hizo: solo se retira, y una retirada no vuelve. (Sin compuerta de DELETE a propósito: el borrado
-- nuclear de un lote SIN declaraciones vivas se lleva en cascada las retiradas —en la copia de `borrados_nucleares`—; ningún código
-- las borra, y lo vigila `qa-triage-catalogo`.)
create or replace function public.guard_catalogo_fuente()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if (to_jsonb(new) - 'estado' - 'retirada_at' - 'retirada_por' - 'retirada_motivo') is distinct from (to_jsonb(old) - 'estado' - 'retirada_at' - 'retirada_por' - 'retirada_motivo') then
    raise exception 'Una declaración al Catálogo Activo queda como se hizo: se retira (o se corrige declarando otra).';
  end if;
  if old.estado = 'retirada' then
    raise exception 'Una declaración retirada no vuelve.';
  end if;
  return new;
end
$$;
drop trigger if exists trg_guard_catalogo_fuente on public.catalogo_fuentes;
create trigger trg_guard_catalogo_fuente before update on public.catalogo_fuentes
  for each row execute function public.guard_catalogo_fuente();

-- ── (2) el ancla y su compuerta ──────────────────────────────────────────────────────────────────────────────────────────────
create or replace function public.triage_ancla_usd(p_listing uuid)
returns numeric
language sql
stable
set search_path = public, pg_temp
as $$
  select max(fob_min_usd_kg) from public.catalogo_fuentes where listing_id = p_listing and estado = 'declarada'
$$;

create or replace function public.guard_listing_ancla()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_ancla numeric;
begin
  v_ancla := public.triage_ancla_usd(new.id);
  if v_ancla is not null and new.price_per_kg < v_ancla then
    raise exception 'El precio de venta (US$ %) no puede bajar del FOB mínimo del lote (US$ %).', round(new.price_per_kg, 2), round(v_ancla, 4);
  end if;
  return new;
end
$$;
drop trigger if exists trg_guard_listing_ancla on public.lot_listings;
create trigger trg_guard_listing_ancla before insert or update on public.lot_listings
  for each row execute function public.guard_listing_ancla();

-- ── (4) el Stock CTCx cuenta lo declarado ────────────────────────────────────────────────────────────────────────────────────
create or replace function public.stock_disponible(p_partida uuid)
returns numeric
language sql
stable
set search_path = public, pg_temp
as $$
  select case when p.anulada_at is not null then 0::numeric else
    p.kg
    - coalesce((select sum(t.kg_entrada) from public.stock_transformaciones t where t.madre_id = p.id and t.anulada_at is null), 0)
    - coalesce((select sum(s.kg) from public.stock_salidas s where s.partida_id = p.id and s.anulada_at is null), 0)
    - coalesce((select sum(i.kg) from public.sample_kit_items i join public.sample_kits k on k.id = i.kit_id
                 where i.partida_id = p.id and k.status = 'armado'), 0)
    - case when p.compra_id is null then 0::numeric else
        coalesce((select sum(mc.kg) from public.mezcla_componentes mc join public.mezclas m on m.id = mc.mezcla_id
                   where mc.compra_id = p.compra_id and m.status <> 'anulada'), 0) end
    - coalesce((select sum(cf.kg_origen) from public.catalogo_fuentes cf where cf.partida_id = p.id and cf.estado = 'declarada'), 0)
  end
  from public.stock_partidas p
  where p.id = p_partida
$$;

create or replace function public.stock_tiene_movimientos(p_partida uuid)
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select exists (select 1 from public.stock_transformaciones t where t.madre_id = p_partida and t.anulada_at is null)
      or exists (select 1 from public.stock_salidas s where s.partida_id = p_partida and s.anulada_at is null)
      or exists (select 1 from public.sample_kit_items i join public.sample_kits k on k.id = i.kit_id
                  where i.partida_id = p_partida and k.status <> 'anulado')
      or exists (select 1 from public.catalogo_fuentes cf where cf.partida_id = p_partida and cf.estado = 'declarada')
$$;

-- ── (3) el listado lo gobiernan sus declaraciones ────────────────────────────────────────────────────────────────────────────
-- Lo que un trato por ventana puede llegar a ofrecer: declarado − retirado (kg de CPS). Lo vendido sale de lo ya declarado al
-- catálogo, así que no se resta otra vez (lo mismo que `baseDelContrato`, `src/lib/triage/fobMinimo.ts`).
create or replace function public.contrato_base_kg(p_contract uuid)
returns numeric
language sql
stable
set search_path = public, pg_temp
as $$
  select greatest(0, coalesce(pc.quantity_frozen_kg, 0) - coalesce((select sum(r.kg) from public.contract_retiros r where r.contract_id = pc.id), 0))
  from public.purchase_contracts pc
  where pc.id = p_contract
$$;

create or replace function public.triage_recalcular_listado(p_listing uuid)
returns void
language plpgsql
set search_path = public, pg_temp
as $$
declare
  l record;
  v_total numeric;
  v_ancla numeric;
begin
  select * into l from public.lot_listings where id = p_listing for update;
  if not found then
    return;
  end if;
  select coalesce(sum(kg_verde), 0), max(fob_min_usd_kg) into v_total, v_ancla
    from public.catalogo_fuentes where listing_id = p_listing and estado = 'declarada';
  if v_total <= 0 then
    update public.lot_listings set total_kg = 0, status = 'archived' where id = p_listing;
  else
    update public.lot_listings
       set total_kg = round(v_total, 3),
           price_per_kg = greatest(price_per_kg, ceil(v_ancla * 20) / 20),
           status = case when sold_kg >= round(v_total, 3) then 'sold_out'::listing_status else 'published'::listing_status end,
           published_at = coalesce(published_at, now())
     where id = p_listing;
  end if;
end
$$;

-- DECLARAR (o corregir: `p_reemplaza` retira primero la declaración que se corrige, en la misma transacción).
create or replace function public.triage_declarar(
  p_lot uuid,
  p_tipo text,
  p_contract uuid,
  p_partida uuid,
  p_kg_verde numeric,
  p_conversion numeric,
  p_precio_origen numeric,
  p_trilla numeric,
  p_referencia uuid,
  p_empaque_cop numeric,
  p_op_pct numeric,
  p_trm numeric,
  p_pvc_edition uuid,
  p_pvc_n2 numeric,
  p_nota text,
  p_por uuid,
  p_reemplaza uuid default null,
  p_modo text default 'spot',
  p_unit_kg numeric default 6,
  p_moq_kg numeric default 6
)
returns uuid
language plpgsql
set search_path = public, pg_temp
as $$
declare
  l record;
  c record;
  p record;
  v_ref record;
  v_listing uuid;
  v_kg_origen numeric;
  v_disp numeric;
  v_trilla numeric := coalesce(p_trilla, 0);
  v_cafe numeric;
  v_fob_cop numeric;
  v_fob_usd numeric;
  v_id uuid;
  v_codigo text;
begin
  select id, stage, grade, public_code into l from public.lots where id = p_lot for update;
  if not found then
    raise exception 'Lote no encontrado.';
  end if;
  if l.stage <> 'galardonado' or l.grade is null then
    raise exception 'Solo se declara un lote galardonado (con grado).';
  end if;
  if l.grade = 'tyrian' then
    raise exception 'Un Tyrian no se declara al Catálogo Activo: va a subasta.';
  end if;
  if not (p_kg_verde > 0) then
    raise exception 'Escriba los kg de verde que se declaran.';
  end if;
  if not (p_conversion > 0 and p_conversion <= 1) then
    raise exception 'La conversión va entre 0 y 1 kg de verde por kg de origen.';
  end if;
  if not (coalesce(p_precio_origen, -1) >= 0 and v_trilla >= 0 and coalesce(p_empaque_cop, -1) >= 0 and coalesce(p_op_pct, -1) >= 0) then
    raise exception 'El precio, la trilla, el empacado y el O&P no son negativos (y el O&P se escribe en los ajustes del triage).';
  end if;
  if not (p_trm > 0) then
    raise exception 'Escriba la TRM.';
  end if;
  select * into v_ref from public.empaque_fob_referencias where id = p_referencia;
  if not found or v_ref.estado <> 'vigente' then
    raise exception 'Elija una referencia de Empacado hasta FOB vigente (ECP · Modelo de Producción).';
  end if;

  if p_reemplaza is not null then
    update public.catalogo_fuentes
       set estado = 'retirada', retirada_at = now(), retirada_por = p_por, retirada_motivo = 'Corregida: la reemplaza una declaración nueva.'
     where id = p_reemplaza and lot_id = p_lot and estado = 'declarada';
    if not found then
      raise exception 'La declaración que se corrige ya no está vigente.';
    end if;
  end if;
  -- Una declaración viva por fuente (los índices únicos lo repiten): para cambiar sus kilos, se corrige.
  if p_tipo = 'contrato' and exists (select 1 from public.catalogo_fuentes where contract_id = p_contract and estado = 'declarada') then
    raise exception 'Ese contrato ya está declarado: corrija su declaración para cambiar los kilos.';
  end if;
  if p_tipo = 'stock' and exists (select 1 from public.catalogo_fuentes where partida_id = p_partida and estado = 'declarada') then
    raise exception 'Esa partida ya está declarada: corrija su declaración para cambiar los kilos.';
  end if;

  v_kg_origen := p_kg_verde / p_conversion;
  if p_tipo = 'contrato' then
    select * into c from public.purchase_contracts where id = p_contract for update;
    if not found or c.lot_id <> p_lot then
      raise exception 'Ese contrato no es de este lote.';
    end if;
    if c.status <> 'active' or c.ventana_tipo is null then
      raise exception 'Se declara lo de un trato por ventana vigente.';
    end if;
    v_disp := public.contrato_base_kg(p_contract)
              - coalesce((select sum(kg_origen) from public.catalogo_fuentes where contract_id = p_contract and estado = 'declarada'), 0);
    if v_kg_origen > v_disp + 0.0005 then
      raise exception 'Del contrato quedan % kg de CPS por declarar; % kg de verde son % kg de CPS.', round(v_disp, 1), round(p_kg_verde, 2), round(v_kg_origen, 1);
    end if;
  elsif p_tipo = 'stock' then
    select * into p from public.stock_partidas where id = p_partida for update;
    if not found or p.anulada_at is not null then
      raise exception 'La partida no existe o está anulada.';
    end if;
    if p.lot_id is distinct from p_lot then
      raise exception 'Esa partida no es de este lote.';
    end if;
    if p.comprometido then
      raise exception 'Lo comprometido (vendido a nombre del productor) no se declara.';
    end if;
    if p.contenido not in ('pergamino', 'verde') then
      raise exception 'La tienda vende verde: se declara pergamino (convertido) o verde, también empacado.';
    end if;
    if p.contenido = 'verde' and p_conversion <> 1 then
      raise exception 'Lo que ya es verde se declara uno a uno.';
    end if;
    if p.contenido = 'verde' then
      v_trilla := 0;
    end if;
    v_disp := coalesce(public.stock_disponible(p_partida), 0);
    if v_kg_origen > v_disp + 0.0005 then
      raise exception 'De la partida quedan % kg disponibles.', round(v_disp, 3);
    end if;
  else
    raise exception 'Una entrada es de un contrato o del Stock CTCx.';
  end if;

  v_cafe := (p_precio_origen + v_trilla) / p_conversion;
  v_fob_cop := (v_cafe + p_empaque_cop) * (1 + p_op_pct / 100);
  v_fob_usd := v_fob_cop / p_trm;

  select id into v_listing from public.lot_listings where lot_id = p_lot for update;
  if not found then
    if l.public_code is null then
      v_codigo := public.ctc_public_code();
      update public.lots set public_code = v_codigo where id = p_lot and public_code is null;
    end if;
    insert into public.lot_listings (lot_id, commercial_mode, unit_kg, moq_kg, total_kg, sold_kg, price_per_kg, deposit_pct, status)
    values (p_lot, (case when p_modo = 'pre' then 'pre' else 'spot' end)::listing_mode, greatest(coalesce(p_unit_kg, 6), 0.1),
            greatest(coalesce(p_moq_kg, 6), 0.1), 0, 0, ceil(v_fob_usd * 20) / 20, 30, 'draft')
    returning id into v_listing;
  end if;

  insert into public.catalogo_fuentes (lot_id, listing_id, tipo, contract_id, partida_id, kg_verde, kg_origen, conversion, precio_origen_cop_kg,
                                       trilla_cop_kg, cafe_cop_kg, referencia_id, empaque_cop_kg, op_pct, trm, fob_min_cop_kg, fob_min_usd_kg,
                                       pvc_edition_id, pvc_n2_usd_kg, nota, created_by)
  values (p_lot, v_listing, p_tipo, case when p_tipo = 'contrato' then p_contract end, case when p_tipo = 'stock' then p_partida end,
          p_kg_verde, round(v_kg_origen, 3), p_conversion, p_precio_origen, v_trilla, round(v_cafe, 4), p_referencia, p_empaque_cop,
          p_op_pct, p_trm, round(v_fob_cop, 4), round(v_fob_usd, 6), p_pvc_edition, p_pvc_n2, nullif(btrim(coalesce(p_nota, '')), ''), p_por)
  returning id into v_id;

  perform public.triage_recalcular_listado(v_listing);
  return v_id;
end
$$;

-- RETIRAR una declaración (sin reemplazo): el listado se recalcula y, sin declaraciones vivas, se archiva.
create or replace function public.triage_retirar(p_fuente uuid, p_motivo text, p_por uuid default null)
returns void
language plpgsql
set search_path = public, pg_temp
as $$
declare
  f record;
begin
  if coalesce(btrim(p_motivo), '') = '' then
    raise exception 'Retirar lleva motivo.';
  end if;
  select * into f from public.catalogo_fuentes where id = p_fuente for update;
  if not found then
    raise exception 'Declaración no encontrada.';
  end if;
  if f.estado <> 'declarada' then
    raise exception 'Ya estaba retirada.';
  end if;
  update public.catalogo_fuentes
     set estado = 'retirada', retirada_at = now(), retirada_por = p_por, retirada_motivo = left(btrim(p_motivo), 300)
   where id = p_fuente;
  perform public.triage_recalcular_listado(f.listing_id);
end
$$;

-- ── (5) el sincronizador viejo ───────────────────────────────────────────────────────────────────────────────────────────────
drop trigger if exists contract_releases_sync_listing_total on public.contract_releases;
drop function if exists public.sync_listing_total_from_releases();

revoke all on function public.triage_ancla_usd(uuid) from public, anon, authenticated;
revoke all on function public.contrato_base_kg(uuid) from public, anon, authenticated;
revoke all on function public.triage_recalcular_listado(uuid) from public, anon, authenticated;
revoke all on function public.triage_declarar(uuid, text, uuid, uuid, numeric, numeric, numeric, numeric, uuid, numeric, numeric, numeric, uuid, numeric, text, uuid, uuid, text, numeric, numeric) from public, anon, authenticated;
revoke all on function public.triage_retirar(uuid, text, uuid) from public, anon, authenticated;
revoke all on function public.stock_disponible(uuid) from public, anon, authenticated;
revoke all on function public.stock_tiene_movimientos(uuid) from public, anon, authenticated;
grant execute on function public.triage_ancla_usd(uuid) to service_role;
grant execute on function public.contrato_base_kg(uuid) to service_role;
grant execute on function public.triage_recalcular_listado(uuid) to service_role;
grant execute on function public.triage_declarar(uuid, text, uuid, uuid, numeric, numeric, numeric, numeric, uuid, numeric, numeric, numeric, uuid, numeric, text, uuid, uuid, text, numeric, numeric) to service_role;
grant execute on function public.triage_retirar(uuid, text, uuid) to service_role;
grant execute on function public.stock_disponible(uuid) to service_role;
grant execute on function public.stock_tiene_movimientos(uuid) to service_role;

-- ── (6) el borrado nuclear: el séptimo bloqueo (declaraciones vivas) y la copia de las declaraciones ─────────────────────────
-- La función entera (la de la V5.195) con dos líneas nuevas: `catalogo_fuentes` en la copia y su bloqueo.
create or replace function public._nuclear_recoger(p_tipo text, p_id uuid)
 returns jsonb
 language plpgsql
 set search_path to 'public'
as $function$
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
    'lot_referencias', _nuclear_filas('lot_referencias', 'lot_id', v_lotes),
    'lot_offers', _nuclear_filas('lot_offers', 'lot_id', v_lotes),
    'black_negotiations', _nuclear_filas('black_negotiations', 'lot_id', v_lotes),
    'purchase_contracts', _nuclear_filas('purchase_contracts', 'lot_id', v_lotes),
    'compras', _nuclear_filas('compras', 'lot_id', v_lotes),
    'ctcx_selection_lotes', _nuclear_filas('ctcx_selection_lotes', 'lot_id', v_lotes),
    'lot_listings', _nuclear_filas('lot_listings', 'lot_id', v_lotes),
    'catalogo_fuentes', _nuclear_filas('catalogo_fuentes', 'lot_id', v_lotes),
    'lot_auctions', _nuclear_filas('lot_auctions', 'lot_id', v_lotes)
  );
  snap := snap || jsonb_build_object(
    'terratalento_postulaciones', _nuclear_filas('terratalento_postulaciones', 'jornada_id', _nuclear_ids(snap, 'terratalento_jornadas')),
    'muestra_movimientos', _nuclear_filas('muestra_movimientos', 'muestra_id', _nuclear_ids(snap, 'muestras')),
    'contract_months', _nuclear_filas('contract_months', 'contract_id', _nuclear_ids(snap, 'purchase_contracts')),
    'contract_releases', _nuclear_filas('contract_releases', 'contract_id', _nuclear_ids(snap, 'purchase_contracts')),
    'humidity_readings', _nuclear_filas('humidity_readings', 'contract_id', _nuclear_ids(snap, 'purchase_contracts'))
  );

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
  select count(*) into n from stock_partidas where lot_id = any(v_lotes);
  if n > 0 then bloqueos := bloqueos || format('Este café ya está en el Stock CTCx (%s partida(s)): el stock físico no se borra desde aquí.', n); end if;
  select count(*) into n from catalogo_fuentes where lot_id = any(v_lotes) and estado = 'declarada';
  if n > 0 then bloqueos := bloqueos || format('El lote está declarado en el Catálogo Activo (%s entrada(s)): retírelas en el Triage primero.', n); end if;

  select coalesce(array_agg(id), '{}') into v_comms from producer_comm_log
    where lot_id = any(v_lotes) or finca_id = any(v_fincas);
  select coalesce(array_agg(distinct id), '{}') into v_comms from producer_comm_log where id = any(v_comms) or parent_id = any(v_comms);
  snap := snap || jsonb_build_object('producer_comm_log', _nuclear_filas('producer_comm_log', 'id', v_comms));

  select coalesce(array_agg(distinct (e->>'id')::uuid), '{}') into v_ids
    from jsonb_each(snap) s(k, arr), jsonb_array_elements(arr) e
    where e ? 'id' and (e->>'id') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  snap := snap || jsonb_build_object('audit_log', _nuclear_filas('audit_log', 'entity_id', v_ids));

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
end $function$;
revoke all on function public._nuclear_recoger(text, uuid) from public, anon, authenticated;
grant execute on function public._nuclear_recoger(text, uuid) to service_role;
