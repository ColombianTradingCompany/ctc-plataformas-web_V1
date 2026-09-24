-- V5.85 · Fase 8 del PLAN_CIRCUITO_DEL_LOTE (owner, 2026-09-24): CTCx Selection y Compras.
-- Migración `compras_ctcx_selection`. Se aplicó con `apply_migration`; esta copia es el acta (la fuente de verdad es la base).
--
-- (1) `compras` (folio 8, paso 19; brief `consolas-ctcx-selection-compras.md`, 1.ª tanda): el registro de cada compra EN FIRME
--     de CTCx — lo contrario del contrato de temporada, que congela y libera. Una compra NACE del PAGO de un mes de un contrato
--     de compra en firme (oferta `directa` · `black`; `registrarPagoDelMes`) o a mano (`registrarCompraManual`, origen 'manual').
--     Cita su edición del PVC (`pvc_edition_id`, `modificador_pct`, `precio_fuente`). Tyrian no se compra (CHECK): va a subasta.
--     Lo DISPONIBLE no se guarda: se deriva (comprado − vendido en el listado; `src/lib/compras/reglas.ts`). RLS + cero políticas.
-- (2) `ctcx_selection_lotes`: la imagen por lote del perfil ÚNICO de CTCx Selection (respuesta 7 del owner, 23-sep: «uno para
--     toda la casa, con opción de adjuntar una imagen por lote»). El perfil vive en `platform_settings.ctcx_selection_perfil`.
-- (3) Bucket PÚBLICO `ctcx-selection`: imágenes de la casa (no datos del productor); la tienda las pinta con el cliente anónimo.
--     Escritura solo con service role (URL de subida firmada desde el OCP).
-- (4) `public_lot_catalog`: `ctc_selection` deja de derivarse de `black_negotiations` (CRM retirado; tabla dormida, 0 filas) y
--     sale de `compras` para todo grado menos Tyrian; gana `ctcx_imagen_path`. La finca sigue anulada EN LA VISTA (D3.1).
-- (5) `public_ctcx_selection_perfil`: el perfil, legible por anon con columnas estrechas (mismo patrón que las otras vistas públicas).
-- (6) Semilla del perfil (el owner lo edita desde «Oferta desde CTCx Selection»).
-- Decisión 7 (§6 del plan): «Oferta desde CTCx Selection» es el staging del lado Compras del Catálogo Activo; publicar sigue
-- siendo `publishLot` (que desde la V5.85 admite un contrato cumplido, no solo activo).

create table public.compras (
  id uuid primary key default gen_random_uuid(),
  lot_id uuid not null references public.lots(id) on delete cascade,
  contract_id uuid references public.purchase_contracts(id) on delete set null,
  mes smallint check (mes between 1 and 3),
  grado public.lot_grade not null check (grado <> 'tyrian'),
  kg numeric not null check (kg > 0),
  cop_kg numeric not null check (cop_kg > 0),
  total_cop numeric not null check (total_cop >= 0),
  pvc_edition_id uuid references public.pvc_editions(id) on delete set null,
  modificador_pct numeric,
  precio_fuente text,
  acordada_at timestamptz,
  recibida_at timestamptz,
  pagada_at timestamptz,
  pago_ref text,
  origen text not null default 'contrato' check (origen in ('contrato', 'manual')),
  nota text,
  registrada_por uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index compras_contract_mes_key on public.compras (contract_id, mes) where contract_id is not null;
create index compras_lot_id_idx on public.compras (lot_id);
alter table public.compras enable row level security;
comment on table public.compras is 'V5.85 · Compras en firme de CTCx (fase 8 del PLAN_CIRCUITO_DEL_LOTE). Lo disponible NO se guarda: se deriva (comprado − vendido). ctc_selection de public_lot_catalog sale de aquí.';

create table public.ctcx_selection_lotes (
  lot_id uuid primary key references public.lots(id) on delete cascade,
  imagen_path text,
  imagen_alt text,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);
alter table public.ctcx_selection_lotes enable row level security;
comment on table public.ctcx_selection_lotes is 'V5.85 · La imagen por lote de la vitrina de CTCx Selection (bucket público ctcx-selection). Escribe solo el OCP.';

insert into storage.buckets (id, name, public) values ('ctcx-selection', 'ctcx-selection', true) on conflict (id) do nothing;
create policy "ctcx selection public read" on storage.objects for select to anon, authenticated using (bucket_id = 'ctcx-selection');

create or replace view public.public_lot_catalog as
 SELECT l.id AS lot_id,
    l.name,
    l.grade,
    l.ficha_variedad,
    l.ficha_proceso,
    l.ficha_altitud_m,
    l.ficha_puntaje_estimado,
    l.ficha_notas_cata,
    CASE WHEN comprado.lot_id IS NULL THEN f.name ELSE NULL::text END AS finca_name,
    f.municipio,
    f.departamento,
    official.avg_sca_total AS official_score,
    comprado.lot_id IS NOT NULL AS ctc_selection,
    l.datasheet IS NOT NULL AS tiene_ficha,
    l.public_code,
    CASE WHEN comprado.lot_id IS NULL THEN NULL::text ELSE csl.imagen_path END AS ctcx_imagen_path
   FROM lots l
     JOIN fincas f ON f.id = l.finca_id
     JOIN lot_listings ll ON ll.lot_id = l.id
     LEFT JOIN ( SELECT DISTINCT c.lot_id FROM compras c) comprado ON comprado.lot_id = l.id
     LEFT JOIN ctcx_selection_lotes csl ON csl.lot_id = l.id
     LEFT JOIN ( SELECT lot_evaluations.lot_id, avg(lot_evaluations.sca_total) AS avg_sca_total
           FROM lot_evaluations
          WHERE lot_evaluations.status = 'accepted'::evaluation_status AND lot_evaluations.sca_total IS NOT NULL
          GROUP BY lot_evaluations.lot_id) official ON official.lot_id = l.id
  WHERE ll.status = ANY (ARRAY['published'::listing_status, 'sold_out'::listing_status]);

create or replace view public.public_ctcx_selection_perfil as
  select value->>'nombre' as nombre, value->>'lema' as lema, value->>'descripcion' as descripcion, value->>'imagen_path' as imagen_path, updated_at
    from public.platform_settings
   where key = 'ctcx_selection_perfil';
grant select on public.public_ctcx_selection_perfil to anon, authenticated;

insert into public.platform_settings (key, value, updated_at)
values ('ctcx_selection_perfil', '{"nombre":"CTCx Selection","lema":"Cafés seleccionados y comprados en firme por Colombian Trading Company","descripcion":"CTCx Selection es la selección propia de la casa: lotes galardonados que Colombian Trading Company compra en firme a sus productores y ofrece bajo su nombre. El origen queda documentado lote a lote en el pasaporte y la ficha técnica."}'::jsonb, now())
on conflict (key) do nothing;

-- ── Complemento (misma versión, migración `compras_ctcx_selection_perfil_solo_lectura`) ──────────────────────────────
-- La vista del perfil es SIMPLE (una sola tabla) y por tanto ACTUALIZABLE: los privilegios por defecto del esquema le daban a
-- anon/authenticated INSERT/UPDATE/DELETE, y una escritura a través de la vista corre con los privilegios del dueño (postgres),
-- saltándose la RLS de platform_settings. Se dejó solo lectura. (Las otras vistas públicas tienen JOIN o agregados y no son
-- actualizables — se comprobó con information_schema.views.is_updatable.)
revoke insert, update, delete, truncate, references, trigger on public.public_ctcx_selection_perfil from anon, authenticated, public;
grant select on public.public_ctcx_selection_perfil to anon, authenticated;
