-- V5.198 (owner, 2026-10-10) · La vitrina pública de los lotes del Triage de Catálogo Activo.
-- «Quiero que los lotes que lleguen al Triage de Catálogo Activo aparezcan ya en el bloque que usamos en las páginas (CTC, KR,
-- CP), reemplazando los Mock que teníamos y usando la información real» y que «Find my Lot» los encuentre.
--
-- UN lote está en la vitrina cuando ya llegó al Triage: galardonado (con grado, que no sea Tyrian: va a subasta) y con un trato
-- por ventana vigente, una declaración viva en el Catálogo Activo o una partida libre en el Stock CTCx.
--
-- Es una vista ESTRECHA que lee `anon` (el patrón de `public_lot_catalog`, ver HANDOFF): solo columnas de exhibición. Lo que NO
-- sale de aquí, y es a propósito: el `datasheet` (salvo el nombre del producto), la georreferencia, el productor, los precios, los
-- kilos y el FOB mínimo. El lote comprado en firme por CTCx Selection no dice su finca (D3.1).
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
  select distinct cp.lot_id from public.compras cp where cp.destino = 'selection'
)
select
  l.id as lot_id,
  'CTC-L-' || upper(left(replace(l.id::text, '-', ''), 8)) as referencia,
  coalesce(nullif(btrim(l.datasheet ->> 'product_name'), ''), l.name) as nombre,
  l.grade,
  l.ficha_variedad as variedad,
  l.ficha_proceso as proceso,
  l.ficha_altitud_m as altitud_m,
  r.sca_total as punto,
  coalesce(r.punto ->> 'protocoloFuente', 'cva') as protocolo,
  case when cm.lot_id is null then f.name end as finca_name,
  f.municipio,
  f.departamento,
  coalesce(nullif(btrim(f.pais), ''), 'Colombia') as pais,
  cm.lot_id is not null as ctc_selection,
  case when cm.lot_id is null then null else csl.imagen_path end as ctcx_imagen_path,
  d.lot_id is not null as en_catalogo,
  least(ct.desde, d.desde, s.desde) as desde,
  -- Una BANDERA, nunca el archivo: si hay foto de la finca o del lote, la sirve `/api/catalogo/foto/[referencia]` (el lote de
  -- CTCx Selection no enseña la de su finca: lleva la imagen de CTCx).
  cm.lot_id is null
    and (f.profile_photo_asset_id is not null
         or jsonb_array_length(case when jsonb_typeof(l.datasheet -> 'b4_files_foto') = 'array' then l.datasheet -> 'b4_files_foto' else '[]'::jsonb end) > 0)
    as tiene_foto
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
  'V5.198: los lotes que llegaron al Triage de Catálogo Activo (vitrina pública y Find my Lot). Solo columnas de exhibición; la lee anon.';

revoke all on public.public_lot_vitrina from public, anon, authenticated;
grant select on public.public_lot_vitrina to anon, authenticated, service_role;
