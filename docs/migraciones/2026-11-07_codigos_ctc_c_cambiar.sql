-- V6.23 · TAR-149 (owner, 2026-11-06) · Los códigos CTC guardados · PASO C de 2: cambiar.
--
-- Va DESPUÉS de `2026-11-07_codigos_ctc_a_ampliar.sql` y DESPUÉS de desplegar la V6.23 (ver el orden en el paso A). Antes del
-- despliegue, la Ficha de la V6.22 escribe el código viejo en `datasheet.ctc_uid` cada vez que se guarda, y el portal de la V6.22
-- solo entiende referencias de 8 caracteres: por eso esto no puede ir junto con el paso A.
--
-- El owner (punto 5): «We need to rewrite them all». Lo que hace:
--   (1) La vitrina: `referencia` pasa a ser el código nuevo (= `codigo`). Desde aquí el código viejo no sale por ninguna vista
--       pública; las 3 segundas puertas se resuelven con el libro (`codigos_ctc`, solo service role).
--   (2) Las Fichas: `datasheet.ctc_uid` = el código nuevo del lote, y el viejo queda en `datasheet.ctc_uid_anterior`. Un lote sin
--       finca pierde `ctc_uid` (no tiene código) y conserva el viejo en `ctc_uid_anterior`.
--   (3) Los leads: `extra.lots_of_interest` pasa a los códigos nuevos (por la tabla viejo → nuevo) y la lista original queda en
--       `extra.lots_of_interest_anterior`. Así el seguimiento sigue nombrando los lotes que eligió cada comprador en la feria.
--   (4) Un contrato que la V6.22 firmó entre el paso A y el despliegue guarda los códigos viejos de su texto (con los que se
--       calculó su huella), como hizo el paso A con los anteriores.
--   NO se reescribe (historia, o no es un código nuestro): `lot_evaluations.uid_anonimo` (es el código CIEGO de la cata y coincide
--   con `arena_inscriptions.codigo_ciego`), `lot_evaluations.codigo_interno` (lo teclea el laboratorio), `audit_log`,
--   `producer_comm_log`, `borrados_nucleares` y `media_assets.path`. La tabla viejo → nuevo los traduce.

begin;

do $$
begin
  if to_regclass('public.codigos_ctc') is null then
    raise exception 'Falta `codigos_ctc`: aplique antes el paso A (2026-11-07_codigos_ctc_a_ampliar.sql). No se cambió nada.';
  end if;
  if exists (select 1 from public.lots where finca_id is not null and public_code is null) then
    raise exception 'Hay lotes con finca y sin código: el paso A no quedó completo. No se cambió nada.';
  end if;
  if not exists (select 1 from information_schema.columns
                  where table_schema = 'public' and table_name = 'public_lot_vitrina' and column_name = 'codigo') then
    raise exception 'La vitrina no tiene `codigo`: aplique antes el paso A. No se cambió nada.';
  end if;
end $$;

-- ── (1) La vitrina: `referencia` = el código nuevo ────────────────────────────────────────────────────────────────────────
create or replace view public.public_lot_vitrina as
 WITH rige AS (
         SELECT DISTINCT ON (e.lot_id) e.lot_id,
            e.sca_total,
            e.punto
           FROM lot_evaluations e
          WHERE e.status = 'accepted'::evaluation_status AND e.rige_grado
          ORDER BY e.lot_id, e.created_at DESC
        ), contrato AS (
         SELECT c.lot_id,
            min(COALESCE(c.signed_at, c.created_at)) AS desde
           FROM purchase_contracts c
          WHERE c.status = 'active'::contract_status AND c.ventana_tipo IS NOT NULL
          GROUP BY c.lot_id
        ), declarado AS (
         SELECT cf.lot_id,
            min(cf.created_at) AS desde
           FROM catalogo_fuentes cf
          WHERE cf.estado = 'declarada'::text
          GROUP BY cf.lot_id
        ), en_stock AS (
         SELECT p.lot_id,
            min(p.created_at) AS desde
           FROM stock_partidas p
          WHERE p.lot_id IS NOT NULL AND p.anulada_at IS NULL AND NOT p.comprometido
          GROUP BY p.lot_id
        ), comprado AS (
         SELECT DISTINCT cp.lot_id
           FROM compras cp
          WHERE cp.destino = 'selection'::text AND cp.anulada_at IS NULL
        )
 SELECT l.id AS lot_id,
    l.public_code AS referencia,
    nombre_publico_lote(l.id, l.datasheet, l.ficha_variedad, l.ficha_proceso, f.departamento, f.pais, l.harvest_to, l.harvest_from, l.created_at) AS nombre,
    l.grade,
    variedad_publica(l.ficha_variedad) AS variedad,
    proceso_publico(l.ficha_proceso) AS proceso,
    l.ficha_altitud_m / 100 * 100 AS altitud_m,
    r.sca_total AS punto,
    COALESCE(r.punto ->> 'protocoloFuente'::text, 'cva'::text) AS protocolo,
    NULL::text AS finca_name,
    NULL::text AS municipio,
    f.departamento,
    COALESCE(NULLIF(btrim(f.pais), ''::text), 'Colombia'::text) AS pais,
    cm.lot_id IS NOT NULL AS ctc_selection,
        CASE
            WHEN cm.lot_id IS NULL THEN NULL::text
            ELSE csl.imagen_path
        END AS ctcx_imagen_path,
    d.lot_id IS NOT NULL AS en_catalogo,
    LEAST(ct.desde, d.desde, s.desde) AS desde,
    cm.lot_id IS NULL AND (EXISTS ( SELECT 1
           FROM jsonb_array_elements(
                CASE
                    WHEN jsonb_typeof(l.datasheet -> 'b4_files_foto'::text) = 'array'::text THEN l.datasheet -> 'b4_files_foto'::text
                    ELSE '[]'::jsonb
                END) foto(v)
             JOIN lot_fotos_publicas fp ON fp.lot_id = l.id AND fp.asset_id::text = lower(btrim(foto.v ->> 'assetId'::text)))) AS tiene_foto,
    l.public_code AS codigo
   FROM lots l
     JOIN fincas f ON f.id = l.finca_id
     LEFT JOIN rige r ON r.lot_id = l.id
     LEFT JOIN contrato ct ON ct.lot_id = l.id
     LEFT JOIN declarado d ON d.lot_id = l.id
     LEFT JOIN en_stock s ON s.lot_id = l.id
     LEFT JOIN comprado cm ON cm.lot_id = l.id
     LEFT JOIN ctcx_selection_lotes csl ON csl.lot_id = l.id
  WHERE l.stage = 'galardonado'::lot_stage AND l.grade IS NOT NULL AND l.grade <> 'tyrian'::lot_grade
    AND l.public_code IS NOT NULL
    AND (ct.lot_id IS NOT NULL OR d.lot_id IS NOT NULL OR s.lot_id IS NOT NULL);

-- ── (2) Las Fichas ────────────────────────────────────────────────────────────────────────────────────────────────────────
-- Los guardianes de `lots` dejan pasar a `postgres`; `zz_lots_codigo` no toca `public_code` (ya asignado).
update public.lots l
   set datasheet = (l.datasheet - 'ctc_uid')
                   || jsonb_build_object('ctc_uid_anterior', l.datasheet ->> 'ctc_uid')
                   || case when l.public_code is null then '{}'::jsonb else jsonb_build_object('ctc_uid', l.public_code) end
 where l.datasheet ? 'ctc_uid'
   and l.datasheet ->> 'ctc_uid' ~ '^CTC-L-[0-9A-F]{8}$'
   and not (l.datasheet ? 'ctc_uid_anterior');

-- ── (3) Los leads ─────────────────────────────────────────────────────────────────────────────────────────────────────────
update public.event_leads e
   set extra = e.extra
               || jsonb_build_object('lots_of_interest_anterior', e.extra -> 'lots_of_interest')
               || jsonb_build_object('lots_of_interest',
                    (select coalesce(jsonb_agg(coalesce(c.reemplazado_por, x.v) order by x.n), '[]'::jsonb)
                       from jsonb_array_elements_text(e.extra -> 'lots_of_interest') with ordinality as x(v, n)
                       left join public.codigos_ctc c on c.codigo = upper(btrim(x.v)) and c.tipo = 'lote' and not c.vigente))
 where jsonb_typeof(e.extra -> 'lots_of_interest') = 'array'
   and not (e.extra ? 'lots_of_interest_anterior')
   and exists (select 1 from jsonb_array_elements_text(e.extra -> 'lots_of_interest') v(c) where v.c ~* '^CTC-L-[0-9A-F]{8}$');

-- ── (4) Los contratos firmados entre el paso A y el despliegue ───────────────────────────────────────────────────────────
-- En ese rato la V6.22 seguía en línea: si firmó o aceptó un contrato, armó su texto con los códigos VIEJOS y no guardó cuáles.
-- La V6.23 siempre los guarda en la misma escritura que la huella, así que un contrato con huella y sin códigos solo puede venir
-- de ese rato: se le ponen los viejos (los mismos con los que se calculó su huella), igual que el paso A hizo con los de antes.
update public.purchase_contracts c
   set texto_codigo_lote = 'CTC-L-' || upper(left(replace(c.lot_id::text, '-', ''), 8)),
       texto_codigo_productor = 'CTC-P-' || upper(left(replace(l.producer_id::text, '-', ''), 8))
  from public.lots l
 where l.id = c.lot_id
   and (c.contract_text_sha256 is not null or c.provisional_sha256 is not null)
   and c.texto_codigo_lote is null;

-- ── Comprobaciones finales ────────────────────────────────────────────────────────────────────────────────────────────────
do $$
begin
  if exists (select 1 from public.public_lot_vitrina where referencia is distinct from codigo or referencia is null) then
    raise exception 'La vitrina no quedó con el código nuevo. Se deshace todo.';
  end if;
  if exists (select 1 from public.lots where datasheet ->> 'ctc_uid' ~ '^CTC-L-[0-9A-F]{8}$') then
    raise exception 'Quedó una Ficha con el código viejo. Se deshace todo.';
  end if;
  if exists (select 1 from public.lots where datasheet ? 'ctc_uid' and datasheet ->> 'ctc_uid' is distinct from public_code) then
    raise exception 'Una Ficha no coincide con el código de su lote. Se deshace todo.';
  end if;
  if exists (select 1 from public.event_leads e, jsonb_array_elements_text(
               case when jsonb_typeof(e.extra -> 'lots_of_interest') = 'array' then e.extra -> 'lots_of_interest' else '[]'::jsonb end) v(c)
              where v.c ~* '^CTC-L-[0-9A-F]{8}$'
                and exists (select 1 from public.codigos_ctc k where k.codigo = upper(v.c) and k.reemplazado_por is not null)) then
    raise exception 'Quedó un lead con un código viejo que sí tiene reemplazo. Se deshace todo.';
  end if;
end $$;

commit;
