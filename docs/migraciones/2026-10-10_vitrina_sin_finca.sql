-- V5.202 (owner, 2026-10-10) · La vitrina pública sin datos que lleven al productor.
-- El owner: el Dossier público «necesita mantener el Watermark y omitir info que haga fácil circumventar a CTCx para llegar al
-- Productor». La auditoría del 2026-10-10 encontró que cualquier visitante anónimo llegaba al productor en dos pasos: veía el
-- nombre de la finca y el municipio (y los 6 lotes de la vitrina llevaban la finca o el municipio en su nombre) y los buscaba en
-- un mapa. Rehecha tras la revisión del nodo final (mismo día): sin orden frágil de despliegue, sin texto libre en el nombre,
-- `public_lot_catalog` con el mismo nombre generado, y las fotos solo si CTCx las aprobó.
--
-- ⚠️ ORDEN DE APLICACIÓN (y por qué ya no importa el despliegue):
--   1. `2026-10-10_compras_anulacion.sql` (V5.203): añade `compras.anulada_at`, que las dos vistas leen.
--   2. `2026-10-10_fotos_publicas.sql`: crea `lot_fotos_publicas`, que la vitrina lee para `tiene_foto`.
--   3. ESTA. Va en una transacción y empieza comprobando 1 y 2: si falta alguna, se niega y no cambia NADA.
--   Las dos vistas conservan sus columnas, en su orden y con sus tipos (`create or replace view`): el código que está hoy en
--   producción (pide `finca_name` y `municipio`) y el de la V5.202 funcionan contra la vista vieja y contra la nueva, así que
--   se puede aplicar ANTES o DESPUÉS de desplegar. `finca_name` y `municipio` quedan como `null::text` en su sitio.
--   PENDIENTE (limpieza futura, con su propia migración y cuando ningún código desplegado las pida): borrar `finca_name` y
--   `municipio` de las dos vistas (`drop view` + `create view`, porque `create or replace` no quita columnas).
--
-- (0) Cuatro funciones comunes, PURAS (no leen tablas), para que las dos vistas digan lo mismo:
--     · `public.clave_de_variedad(text)`: NFC, sin tildes, minúscula, sin paréntesis, solo `a-z 0-9 . espacio`.
--     · `public.variedad_publica(text)`: el nombre CANÓNICO de una variedad, o null si no está en la lista. La lista VALUES es
--       `VARIEDADES_PUBLICAS` de `src/lib/catalogo/nombrePublico.ts` (la Ficha B1 + el Mapa de Variedades + unos alias), y
--       `qa-sneak-peek-check` exige que coincidan fila a fila. Lo que escribió el productor y no está, NO sale.
--     · `public.proceso_publico(text)`: Lavado · Honey · Natural (el enum `PROCESOS_BASE` de la Ficha); cualquier otra cosa, null.
--     · `public.nombre_publico_lote(…)`: variedades + proceso · región + año («Castillo Lavado · Santander 2026»). NUNCA
--       `lots.name` ni `datasheet.product_name` (los escribe el productor, o el OCP al renombrar, y suelen llevar la finca).
--     Las cuatro las ejecuta anon a través de las vistas (una vista llama a sus funciones con los permisos de quien la consulta):
--     por eso conservan el EXECUTE por defecto. No leen nada: con ellas solo se calcula sobre lo que uno mismo les pasa.
-- (1) `public_lot_vitrina` (`create or replace`, las mismas 18 columnas en el mismo orden):
--     · `nombre` = `nombre_publico_lote(…)`; `variedad` y `proceso` normalizados igual (lo desconocido, null).
--     · `altitud_m` en tramos de 100 m, redondeada hacia ABAJO (1794 → 1700): la altitud exacta, junto con una variedad rara y el
--       departamento, puede señalar una sola finca. La pinta «1.700–1.800 m» (`tramoDeAltitud`, `vitrinaVista.ts`).
--     · `finca_name` y `municipio` = `null::text`.
--     · `tiene_foto` solo con una foto del LOTE (`datasheet.b4_files_foto`) que CTCx APROBÓ (`lot_fotos_publicas`). Nunca la de
--       perfil de la finca. Un lote de CTCx Selection no enseña foto propia (lleva la imagen de CTCx).
--     · CTCx Selection exige la compra no anulada (`anulada_at is null`, V5.203).
--     · Permisos: los de `2026-10-10_vitrina_publica.sql` (anon y authenticated solo leen); se reafirman igual.
-- (2) `public_lot_catalog` (la lee la tienda con sesión y `vitrina.ts` para resolver un código `CTCX-…`; `anon` la puede leer por
--     REST): `create or replace` con las mismas 16 columnas y una nueva AL FINAL (`pais`, para la región «Santander, Colombia»).
--     · `name` = el MISMO nombre generado; `ficha_variedad` y `ficha_proceso` normalizados; `ficha_altitud_m` en tramos de 100 m.
--     · `ficha_notas_cata`, `finca_name` y `municipio` = `null::text` (las notas eran texto libre del productor).
--     · Permisos: hasta hoy anon y authenticated tenían TODOS los privilegios (no se podía escribir porque la vista tiene joins, pero
--       no debían tenerlos): `revoke all` + `grant select`.
-- (3) `public.place_order(text)`: el renglón del pedido (`order_items.lot_name`, que el comprador ve en «Mis pedidos») guardaba
--     `lots.name`. Ahora guarda el nombre generado. El resto de la función es IDÉNTICO a `pg_get_functiondef` del 2026-10-10.

begin;

do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'compras' and column_name = 'anulada_at') then
    raise exception 'Falta `compras.anulada_at`: aplique antes 2026-10-10_compras_anulacion.sql (V5.203). No se cambió nada.';
  end if;
  if to_regclass('public.lot_fotos_publicas') is null then
    raise exception 'Falta `lot_fotos_publicas`: aplique antes 2026-10-10_fotos_publicas.sql. No se cambió nada.';
  end if;
end $$;

-- ── (0) las funciones comunes ───────────────────────────────────────────────────────────────────────────────────────────────
create or replace function public.clave_de_variedad(p_nombre text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select btrim(regexp_replace(regexp_replace(regexp_replace(
           lower(translate(normalize(coalesce(p_nombre, ''), NFC),
                           'ÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇáàäâãéèëêíìïîóòöôõúùüûñç',
                           'AAAAAEEEEIIIIOOOOOUUUUNCaaaaaeeeeiiiiooooouuuunc')),
           '\(.*?\)', ' ', 'g'), '[^a-z0-9. ]+', ' ', 'g'), '\s+', ' ', 'g'))
$$;

create or replace function public.variedad_publica(p_nombre text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select c.nombre
    from (values
      ('anacafe 14', 'Anacafe 14'), ('anthonyi', 'Anthonyi'), ('arabusta', 'Arabusta'), ('arara', 'Arara'),
      ('barako', 'Barako'), ('batian', 'Batian'), ('bernardina', 'Bernardina'), ('borbon', 'Bourbon'),
      ('borbon rosado', 'Borbón Rosado'), ('bourbon', 'Bourbon'), ('bourbon aji', 'Bourbon Ají'), ('bourbon amarillo', 'Bourbon'),
      ('bourbon mayaguez 139', 'Bourbon Mayaguez 139'), ('bourbon mayaguez 71', 'Bourbon Mayaguez 71'), ('bourbon rojo', 'Bourbon'), ('bourbon rosado', 'Borbón Rosado'),
      ('bp 534', 'BP 534'), ('bp 939', 'BP 939'), ('brs 2314', 'BRS 2314'), ('brs 3137', 'BRS 3137'),
      ('caripe', 'Caripe'), ('casiopea', 'Casiopea'), ('cast centro', 'Castillo Zona Centro'), ('cast norte', 'Castillo Zona Norte'),
      ('cast sur', 'Castillo Zona Sur'), ('castillo', 'Castillo'), ('castillo 2', 'Castillo 2'), ('castillo 2.0', 'Castillo 2'),
      ('castillo centro', 'Castillo Centro'), ('castillo general', 'Castillo'), ('castillo norte', 'Castillo Norte'), ('castillo sur', 'Castillo Sur'),
      ('castillo zona centro', 'Castillo Zona Centro'), ('castillo zona norte', 'Castillo Zona Norte'), ('castillo zona sur', 'Castillo Zona Sur'), ('catimor 129', 'Catimor 129'),
      ('catisic', 'Catisic'), ('catuai', 'Catuai'), ('catucai', 'Catucaí'), ('caturra', 'Caturra'),
      ('cenicafe 1', 'Cenicafé 1'), ('cenicafe uno', 'Cenicafé 1'), ('centroamericano', 'Centroamericano'), ('charrieriana', 'Charrieriana'),
      ('chiroso', 'Chiroso'), ('colombia', 'Variedad Colombia'), ('congensis', 'Congensis'), ('conilon', 'Conilon'),
      ('costa rica 95', 'Costa Rica 95'), ('cuscatleco', 'Cuscatleco'), ('e531', 'E531'), ('esperanza', 'Esperanza'),
      ('et01', 'ET01'), ('et06', 'ET06'), ('et25', 'ET25'), ('et26', 'ET26'),
      ('et41', 'ET41'), ('eugenioides', 'Eugenioides'), ('evaluna', 'Evaluna'), ('excelsa', 'Excelsa'),
      ('french mission', 'French Mission'), ('fronton', 'Fronton'), ('geisha', 'Gesha'), ('gesha', 'Gesha'),
      ('h3', 'H3'), ('harrar rwanda', 'Harrar Rwanda'), ('heterocalyx', 'Heterocalyx'), ('iapar 59', 'IAPAR 59'),
      ('icatu', 'Icatu'), ('ihcafe 90', 'IHCAFE 90'), ('inifap 00 28', 'INIFAP 00-28'), ('jackson', 'Jackson'),
      ('jackson 2 1257', 'Jackson 2/1257'), ('java', 'Java'), ('k7', 'K7'), ('kapeng barako', 'Kapeng Barako'),
      ('kent', 'Kent'), ('kouilou', 'Kouilou'), ('kp423', 'KP423'), ('kr1', 'KR1'),
      ('kr6', 'KR6'), ('laurina', 'Laurina'), ('lempira', 'Lempira'), ('liberica excelsa', 'Liberica Excelsa'),
      ('limani', 'Limani'), ('maracaturra', 'Maracaturra'), ('maragogipe', 'Maragogipe'), ('maragogype', 'Maragogipe'),
      ('marsellesa', 'Marsellesa'), ('mauritiana', 'Mauritiana'), ('mibirizi', 'Mibirizi'), ('milenio', 'Milenio'),
      ('moka', 'Moka'), ('monte claro', 'Monte Claro'), ('mundo maya', 'Mundo Maya'), ('mundo novo', 'Mundo Novo'),
      ('naryelis', 'Naryelis'), ('nayarita', 'Nayarita'), ('nemaya', 'Nemaya'), ('nganda', 'Nganda'),
      ('nyasaland', 'Nyasaland'), ('obata', 'Obatã'), ('obata rojo', 'Obata Rojo'), ('ombligon', 'Ombligón'),
      ('oro azteca', 'Oro Azteca'), ('pacamara', 'Pacamara'), ('pacas', 'Pacas'), ('pache', 'Pache'),
      ('papayo', 'Papayo'), ('parainema', 'Parainema'), ('pink bourbon', 'Pink Bourbon'), ('pop3303 21', 'Pop3303/21'),
      ('pseudozanguebariae', 'Pseudozanguebariae'), ('rab c15', 'RAB C15'), ('racemosa', 'Racemosa'), ('roubi 1', 'Roubi 1'),
      ('roubi 6', 'Roubi 6'), ('ruiru 11', 'Ruiru 11'), ('rume sudan', 'Rume Sudan'), ('s795', 'S795'),
      ('salvatrix', 'Salvatrix'), ('san bernardo', 'San Bernardo'), ('sidra', 'Sidra'), ('sl14', 'SL14'),
      ('sl28', 'SL28'), ('sl34', 'SL34'), ('starmaya', 'Starmaya'), ('stenophylla', 'Stenophylla'),
      ('t5175', 'T5175'), ('t5296', 'T5296'), ('t8667', 'T8667'), ('tabi', 'Tabi'),
      ('tekisic', 'Tekisic'), ('tipica', 'Typica'), ('tr11', 'TR11'), ('tr4', 'TR4'),
      ('tr9', 'TR9'), ('typica', 'Typica'), ('typica mejorado', 'Typica Mejorado'), ('typica tradicional', 'Typica'),
      ('umbral', 'Umbral'), ('variedad castillo', 'Castillo'), ('variedad colombia', 'Variedad Colombia'), ('venecia', 'Venecia'),
      ('villa sarchi', 'Villa Sarchi'), ('wild ethiopian sudanese mutant', 'Wild Ethiopian/Sudanese mutant'), ('wush wush', 'Wush Wush')
    ) as c(clave, nombre)
   where c.clave = public.clave_de_variedad(p_nombre)
$$;

create or replace function public.proceso_publico(p_proceso text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select case lower(btrim(coalesce(p_proceso, '')))
           when 'lavado' then 'Lavado'
           when 'honey' then 'Honey'
           when 'natural' then 'Natural'
         end
$$;

create or replace function public.nombre_publico_lote(
  p_lot_id uuid,
  p_datasheet jsonb,
  p_ficha_variedad text,
  p_ficha_proceso text,
  p_departamento text,
  p_pais text,
  p_harvest_to date,
  p_harvest_from date,
  p_creado timestamptz
)
returns text
language sql
stable
parallel safe
set search_path = ''
as $$
  select coalesce(
    nullif(concat_ws(' · ',
      nullif(concat_ws(' ',
        coalesce(
          -- Las variedades canónicas del lote, sin repetir, en el orden de la Ficha; si no hay, la que manda.
          (select string_agg(x.nombre, ' + ' order by x.orden)
             from (select distinct on (v.nombre) v.nombre, v.orden
                     from (select public.variedad_publica(e.v ->> 'name') as nombre, e.orden
                             from jsonb_array_elements(case when jsonb_typeof(p_datasheet -> 'varieties') = 'array' then p_datasheet -> 'varieties' else '[]'::jsonb end)
                                  with ordinality as e(v, orden)) v
                    where v.nombre is not null
                    order by v.nombre, v.orden) x),
          public.variedad_publica(p_ficha_variedad)),
        public.proceso_publico(p_ficha_proceso)), ''),
      concat_ws(' ', coalesce(nullif(btrim(p_departamento), ''), nullif(btrim(p_pais), ''), 'Colombia'),
                     coalesce(to_char(p_harvest_to, 'YYYY'), to_char(p_harvest_from, 'YYYY'), to_char(p_creado at time zone 'UTC', 'YYYY')))
    ), ''),
    'CTC-L-' || upper(left(replace(p_lot_id::text, '-', ''), 8))
  )
$$;

comment on function public.variedad_publica(text) is
  'V5.202: el nombre canónico de una variedad (lista = VARIEDADES_PUBLICAS de src/lib/catalogo/nombrePublico.ts; qa-sneak-peek la compara), o null.';
comment on function public.nombre_publico_lote(uuid, jsonb, text, text, text, text, date, date, timestamptz) is
  'V5.202: el nombre PÚBLICO de un lote (variedades + proceso · región + año), sin texto libre del productor. Lo usan public_lot_vitrina, public_lot_catalog y place_order.';

-- ── (1) la vitrina ──────────────────────────────────────────────────────────────────────────────────────────────────────────
create or replace view public.public_lot_vitrina as
with rige as (
  select distinct on (e.lot_id) e.lot_id, e.sca_total, e.punto
    from public.lot_evaluations e
   where e.status = 'accepted' and e.rige_grado
   order by e.lot_id, e.created_at desc
),
contrato as (
  select c.lot_id, min(coalesce(c.signed_at, c.created_at)) as desde
    from public.purchase_contracts c
   where c.status = 'active' and c.ventana_tipo is not null
   group by c.lot_id
),
declarado as (
  select cf.lot_id, min(cf.created_at) as desde
    from public.catalogo_fuentes cf
   where cf.estado = 'declarada'
   group by cf.lot_id
),
en_stock as (
  select p.lot_id, min(p.created_at) as desde
    from public.stock_partidas p
   where p.lot_id is not null and p.anulada_at is null and not p.comprometido
   group by p.lot_id
),
comprado as (
  -- V5.203: una compra ANULADA no hace del lote un lote de CTCx Selection.
  select distinct cp.lot_id from public.compras cp where cp.destino = 'selection' and cp.anulada_at is null
)
select
  l.id as lot_id,
  'CTC-L-' || upper(left(replace(l.id::text, '-', ''), 8)) as referencia,
  -- V5.202: el nombre PÚBLICO se genera; nunca el que escribió el productor (suele llevar la finca).
  public.nombre_publico_lote(l.id, l.datasheet, l.ficha_variedad, l.ficha_proceso, f.departamento, f.pais, l.harvest_to, l.harvest_from, l.created_at) as nombre,
  l.grade,
  public.variedad_publica(l.ficha_variedad) as variedad,
  public.proceso_publico(l.ficha_proceso) as proceso,
  -- V5.202: tramos de 100 m, hacia abajo (división entera: sigue siendo `integer`).
  (l.ficha_altitud_m / 100) * 100 as altitud_m,
  r.sca_total as punto,
  coalesce(r.punto ->> 'protocoloFuente', 'cva') as protocolo,
  -- V5.202: siguen en su sitio, siempre null, para que el código viejo y el nuevo lean la misma vista (ver ORDEN arriba).
  null::text as finca_name,
  null::text as municipio,
  f.departamento,
  coalesce(nullif(btrim(f.pais), ''), 'Colombia') as pais,
  cm.lot_id is not null as ctc_selection,
  case when cm.lot_id is null then null else csl.imagen_path end as ctcx_imagen_path,
  d.lot_id is not null as en_catalogo,
  least(ct.desde, d.desde, s.desde) as desde,
  -- Una BANDERA, nunca el archivo: si el LOTE tiene una foto que CTCx APROBÓ, la sirve `/api/catalogo/foto/[referencia]`.
  -- V5.202: ni la foto de perfil de la finca ni una foto sin aprobar (puede enseñar a una persona, la casa o un letrero).
  cm.lot_id is null
    and exists (
      select 1
        from jsonb_array_elements(case when jsonb_typeof(l.datasheet -> 'b4_files_foto') = 'array' then l.datasheet -> 'b4_files_foto' else '[]'::jsonb end) as foto(v)
        join public.lot_fotos_publicas fp on fp.lot_id = l.id and fp.asset_id::text = lower(btrim(foto.v ->> 'assetId'))
    ) as tiene_foto
from public.lots l
join public.fincas f on f.id = l.finca_id
left join rige r on r.lot_id = l.id
left join contrato ct on ct.lot_id = l.id
left join declarado d on d.lot_id = l.id
left join en_stock s on s.lot_id = l.id
left join comprado cm on cm.lot_id = l.id
left join public.ctcx_selection_lotes csl on csl.lot_id = l.id
where l.stage = 'galardonado'
  and l.grade is not null
  and l.grade <> 'tyrian'
  and (ct.lot_id is not null or d.lot_id is not null or s.lot_id is not null);

comment on view public.public_lot_vitrina is
  'V5.198/V5.202: los lotes que llegaron al Triage de Catálogo Activo (vitrina pública y Find my Lot). Solo columnas de exhibición; nombre generado sin texto libre, altitud en tramos de 100 m, finca_name y municipio siempre null, foto solo aprobada por CTCx; la lee anon.';

revoke all on public.public_lot_vitrina from public, anon, authenticated;
grant select on public.public_lot_vitrina to anon, authenticated, service_role;

-- ── (2) la vista vieja del catálogo ─────────────────────────────────────────────────────────────────────────────────────────
-- Mismas columnas, nombres, tipos y orden (create or replace no deja cambiarlos), más `pais` al final.
create or replace view public.public_lot_catalog as
select
  l.id as lot_id,
  public.nombre_publico_lote(l.id, l.datasheet, l.ficha_variedad, l.ficha_proceso, f.departamento, f.pais, l.harvest_to, l.harvest_from, l.created_at) as name,
  l.grade,
  public.variedad_publica(l.ficha_variedad) as ficha_variedad,
  public.proceso_publico(l.ficha_proceso) as ficha_proceso,
  (l.ficha_altitud_m / 100) * 100 as ficha_altitud_m,
  l.ficha_puntaje_estimado,
  null::text as ficha_notas_cata,
  null::text as finca_name,
  null::text as municipio,
  f.departamento,
  official.avg_sca_total as official_score,
  comprado.lot_id is not null as ctc_selection,
  l.datasheet is not null as tiene_ficha,
  l.public_code,
  case when comprado.lot_id is null then null::text else csl.imagen_path end as ctcx_imagen_path,
  coalesce(nullif(btrim(f.pais), ''), 'Colombia') as pais
from public.lots l
join public.fincas f on f.id = l.finca_id
join public.lot_listings ll on ll.lot_id = l.id
left join (
  select distinct c.lot_id from public.compras c where c.destino = 'selection' and c.anulada_at is null
) comprado on comprado.lot_id = l.id
left join public.ctcx_selection_lotes csl on csl.lot_id = l.id
left join (
  select lot_evaluations.lot_id, avg(lot_evaluations.sca_total) as avg_sca_total
    from public.lot_evaluations
   where lot_evaluations.status = 'accepted' and lot_evaluations.sca_total is not null
   group by lot_evaluations.lot_id
) official on official.lot_id = l.id
where ll.status = any (array['published'::listing_status, 'sold_out'::listing_status]);

comment on view public.public_lot_catalog is
  'V5.202: el catálogo de la tienda (listados publicados o agotados). El nombre es el generado (public.nombre_publico_lote); finca_name, municipio y ficha_notas_cata van a null: lo que lee anon no lleva al productor.';

revoke all on public.public_lot_catalog from public, anon, authenticated;
grant select on public.public_lot_catalog to anon, authenticated, service_role;

-- ── (3) el pedido guarda el nombre PÚBLICO del lote ─────────────────────────────────────────────────────────────────────────
-- Copiada de `pg_get_functiondef('public.place_order'::regproc)` (2026-10-10). Lo ÚNICO que cambia es el `select … into
-- v_lot_name` (antes `select name into v_lot_name from lots where id = v_listing.lot_id;`). `create or replace` conserva el
-- dueño y los permisos (authenticated y service_role ejecutan; anon no).
CREATE OR REPLACE FUNCTION public.place_order(p_zone_code text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_buyer_id uuid := auth.uid();
  v_zone_id uuid;
  v_rate numeric;
  v_order_id uuid;
  v_reservation record;
  v_listing record;
  v_lot_name text;
  v_min_kg numeric;
  v_subtotal_now numeric := 0;
  v_subtotal_later numeric := 0;
  v_shipping_cost numeric := 0;
  v_points int := 0;
  v_line_total numeric;
  v_is_pre boolean;
begin
  if v_buyer_id is null then
    raise exception 'No autenticado.';
  end if;

  select id, rate_per_kg into v_zone_id, v_rate from shipping_zones where code = p_zone_code;
  if v_zone_id is null then
    raise exception 'Zona de envío inválida.';
  end if;

  v_order_id := gen_random_uuid();
  insert into orders (id, buyer_id, shipping_zone_id, subtotal_now, subtotal_later, shipping_cost, total_now, points_earned)
    values (v_order_id, v_buyer_id, v_zone_id, 0, 0, 0, 0, 0);

  for v_reservation in
    select * from lot_reservations where buyer_id = v_buyer_id for update
  loop
    select * into v_listing from lot_listings where id = v_reservation.lot_listing_id for update;
    if v_listing is null then
      raise exception 'Lote no encontrado.';
    end if;
    if v_listing.status <> 'published' then
      raise exception 'Uno de los lotes de tu pedido ya no está disponible.';
    end if;
    if v_reservation.kg <= 0 or mod(v_reservation.kg, v_listing.unit_kg) <> 0 then
      raise exception 'Cantidad inválida en el carrito.';
    end if;
    v_min_kg := case when v_listing.commercial_mode = 'spot'
                     then least(v_listing.moq_kg, 350) else v_listing.moq_kg end;
    if v_reservation.kg < v_min_kg then
      raise exception 'La cantidad mínima de este lote es % kg.', v_min_kg;
    end if;
    if (v_listing.total_kg - v_listing.sold_kg) < v_reservation.kg then
      raise exception 'Ya no hay suficiente disponible de %.', v_listing.lot_id;
    end if;

    -- V5.202 (owner, 2026-10-10): el nombre PÚBLICO (generado), nunca `lots.name` (solía llevar la finca o el municipio).
    select public.nombre_publico_lote(l.id, l.datasheet, l.ficha_variedad, l.ficha_proceso, f.departamento, f.pais, l.harvest_to, l.harvest_from, l.created_at)
      into v_lot_name
      from lots l
      left join fincas f on f.id = l.finca_id
     where l.id = v_listing.lot_id;

    v_line_total := v_reservation.kg * v_listing.price_per_kg;
    v_is_pre := v_listing.commercial_mode = 'pre';

    insert into order_items (order_id, lot_listing_id, kg, unit_price_per_kg, line_total, lot_name)
      values (v_order_id, v_listing.id, v_reservation.kg, v_listing.price_per_kg, v_line_total, coalesce(v_lot_name, '—'));

    update lot_listings set sold_kg = sold_kg + v_reservation.kg,
      status = case when sold_kg + v_reservation.kg >= total_kg then 'sold_out'::listing_status else status end
      where id = v_listing.id;

    if v_is_pre then
      v_subtotal_now := v_subtotal_now + v_line_total * 0.3;
      v_subtotal_later := v_subtotal_later + v_line_total * 0.7;
    else
      v_subtotal_now := v_subtotal_now + v_line_total;
    end if;
    v_shipping_cost := v_shipping_cost + v_reservation.kg * v_rate;
    v_points := v_points + v_reservation.kg::int;
  end loop;

  if v_points = 0 then
    raise exception 'El carrito está vacío.';
  end if;

  update orders set
    subtotal_now = v_subtotal_now,
    subtotal_later = v_subtotal_later,
    shipping_cost = v_shipping_cost,
    total_now = v_subtotal_now + v_shipping_cost,
    points_earned = v_points
    where id = v_order_id;

  delete from lot_reservations where buyer_id = v_buyer_id;

  insert into points_ledger (buyer_id, points_delta, reason, order_id)
    values (v_buyer_id, v_points, 'order_placed', v_order_id);

  return v_order_id;
end;
$function$;

commit;
