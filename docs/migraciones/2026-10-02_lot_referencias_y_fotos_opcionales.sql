-- ACTA · 2026-10-02 · V5.143 · migración `lot_referencias_y_fotos_opcionales` (aplicada a `sjznkzvefqfcysczllli`)
--
-- El owner, 2026-10-02, sobre los lotes en Kaffetal Regal:
--   1. «Las fotos y videos del café en B4 deben ser todas siempre opcionales; si no se incluye ninguna, el productor es
--      notificado de que esto hace parte del atractivo y se recomienda subir algo. De lo contrario, se usa por defecto
--      la imagen [de CTCx].»
--   2. «Cuando un productor tiene ya un lote con Visa debe permitir, sin necesidad de solicitar la revisión, subir nuevas
--      fotos/videos y/o reportes del café… Esta nueva información no permite retirar lo que ya fue enviado. Las
--      referencias pueden ser solicitadas para revisión.»
--
-- (1) LAS FOTOS DEJAN DE SER OBLIGATORIAS. Se retira `guard_lot_fotos_intake` (V5.64), que rechazaba cerrar la Ficha sin
--     dos fotos. Sin fotos, las pantallas pintan la imagen por defecto (`src/lib/imagenDeOrigen.ts`).
--
-- (2) `lot_referencias` — lo que el productor AGREGA a un lote cuya Ficha ya está cerrada: fotos, videos y otros
--     reportes de taza o de análisis físico. Es de solo AGREGAR para el productor: tiene política de SELECT y de INSERT
--     sobre lo suyo, y NINGUNA de UPDATE ni de DELETE — no puede retirar ni cambiar lo que ya envió. Lo único que puede
--     tocar después es pedir la revisión de un reporte, por la función `solicitar_revision_de_referencia` (una vez).
--     CTCx (service role) marca la revisión (`revisada_at`, `revisada_por`, `nota_ctc`).
--     La Ficha congelada NO se toca: estas filas no reemplazan a `lots.datasheet`.
--
-- (3) EL BORRADO NUCLEAR las archiva. Las filas se van solas al borrar el lote (`on delete cascade`) y sus archivos caen
--     en el patrón `<productor>/lots/<lote>/%` que ya recoge; se añade la tabla a la INSTANTÁNEA de `_nuclear_recoger`
--     para que el Archivo de Borrados las conserve.

-- ── (1) las fotos del lote, opcionales ───────────────────────────────────────────────────────────────────────────────
drop trigger if exists trg_guard_lot_fotos_intake on public.lots;
drop function if exists public.guard_lot_fotos_intake();

-- ── (2) lo que el productor agrega después de cerrar la Ficha ────────────────────────────────────────────────────────
create table if not exists public.lot_referencias (
  id uuid primary key default gen_random_uuid(),
  lot_id uuid not null references public.lots(id) on delete cascade,
  producer_id uuid not null references public.profiles(id) on delete cascade,
  tipo text not null check (tipo in ('foto', 'video', 'taza', 'fisico')),
  asset_id uuid not null references public.media_assets(id) on delete cascade,
  file_name text not null check (length(file_name) between 1 and 300),
  -- Solo en reportes (`taza` · `fisico`): quién lo emitió y la cifra que trae. Todo opcional.
  emisor text check (emisor is null or length(emisor) <= 300),
  puntaje numeric check (puntaje is null or (puntaje >= 0 and puntaje <= 100)),
  escala text check (escala is null or escala in ('sca', 'cva')),
  factor numeric check (factor is null or (factor >= 60 and factor <= 150)),
  nota text check (nota is null or length(nota) <= 1200),
  revision_solicitada_at timestamptz,
  revisada_at timestamptz,
  revisada_por uuid references public.profiles(id) on delete set null,
  nota_ctc text check (nota_ctc is null or length(nota_ctc) <= 1200),
  created_at timestamptz not null default now()
);
comment on table public.lot_referencias is 'V5.143 · Fotos, videos y reportes que el productor AGREGA a un lote con la Ficha ya cerrada. Solo agregar: sin UPDATE ni DELETE para el productor.';
create index if not exists lot_referencias_lot_idx on public.lot_referencias (lot_id, created_at);
create index if not exists lot_referencias_producer_idx on public.lot_referencias (producer_id);
create index if not exists lot_referencias_asset_idx on public.lot_referencias (asset_id);

alter table public.lot_referencias enable row level security;

drop policy if exists lot_referencias_select_own on public.lot_referencias;
create policy lot_referencias_select_own on public.lot_referencias
  for select to authenticated using (producer_id = (select auth.uid()));

-- Solo sobre un lote PROPIO con la Ficha ya cerrada, con un archivo que subió él, y sin escribir los campos de CTCx.
-- «Cerrada» = `intake_step >= 4` O una etapa posterior a borrador (lotes anteriores al contador de pasos, o que CTCx
-- movió): la misma regla de la pantalla (`effectiveIntakeStep`). La segunda mitad entró en la migración
-- `lot_referencias_ficha_cerrada_por_etapa`, aplicada el mismo día; aquí queda la política como está en la base.
drop policy if exists lot_referencias_insert_own on public.lot_referencias;
create policy lot_referencias_insert_own on public.lot_referencias
  for insert to authenticated
  with check (
    producer_id = (select auth.uid())
    and revisada_at is null and revisada_por is null and nota_ctc is null
    and exists (
      select 1 from public.lots l
       where l.id = lot_id and l.producer_id = (select auth.uid())
         and (coalesce(l.intake_step, 0) >= 4 or l.stage::text <> 'borrador')
    )
    and exists (select 1 from public.media_assets m where m.id = asset_id and m.uploaded_by = (select auth.uid()))
  );
-- (sin políticas de UPDATE ni DELETE: lo enviado no se retira)

-- Pedir la revisión de un reporte: lo único que el productor puede cambiar, y una sola vez.
create or replace function public.solicitar_revision_de_referencia(p_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v timestamptz;
begin
  update lot_referencias
     set revision_solicitada_at = now()
   where id = p_id and producer_id = auth.uid() and tipo in ('taza', 'fisico') and revision_solicitada_at is null
   returning revision_solicitada_at into v;
  if v is null then
    select revision_solicitada_at into v from lot_referencias where id = p_id and producer_id = auth.uid() and tipo in ('taza', 'fisico');
    if v is null then
      raise exception 'Solo se puede pedir la revisión de un reporte propio (taza o análisis físico).';
    end if;
  end if;
  return v;
end;
$$;
revoke all on function public.solicitar_revision_de_referencia(uuid) from public, anon;
grant execute on function public.solicitar_revision_de_referencia(uuid) to authenticated;

-- ── (3) el borrado nuclear las guarda en su instantánea ──────────────────────────────────────────────────────────────
-- `_nuclear_recoger` es una función larga: se le añade UNA línea a su instantánea, sobre su definición vigente.
do $$
declare
  def text;
  ancla constant text := '''lot_evaluations'', _nuclear_filas(''lot_evaluations'', ''lot_id'', v_lotes),';
  linea constant text := '''lot_referencias'', _nuclear_filas(''lot_referencias'', ''lot_id'', v_lotes),';
begin
  select pg_get_functiondef(p.oid) into def
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = '_nuclear_recoger';
  if def is null then raise exception 'No existe _nuclear_recoger'; end if;
  if position(linea in def) > 0 then return; end if; -- ya está
  if position(ancla in def) = 0 then raise exception 'No se encontró el ancla en _nuclear_recoger: revise la migración.'; end if;
  execute replace(def, ancla, ancla || E'\n    ' || linea);
end;
$$;

-- ── DATOS · el PS del owner: «hay varios lotes y fincas con una imagen adjunta "Paisaje de finca.jpg", reemplázala por
--    nuestro nuevo placeholder en cada una» ─────────────────────────────────────────────────────────────────────────
-- Eran 7 archivos idénticos (5.242.638 bytes), subidos como relleno: 2 fotos de B4 en cada uno de tres lotes —Gesha
-- Honey Ragonvalia, Gesha Lavado Ragonvalia, Maragogipe Lavado Mirador del Pino 2026— y la foto de perfil de la finca
-- Mirador del Pino. Se DESVINCULARON (no se borraron: los archivos y sus filas de `media_assets` siguen en Storage):
-- sin foto, las pantallas pintan la imagen por defecto, que es justo el placeholder nuevo. Ejecutado el 2026-10-02:
--
--   with ids as (select id from media_assets where path ilike '%Paisaje_de_finca%')
--   update lots l set datasheet = jsonb_set(l.datasheet, '{b4_files_foto}', coalesce((select jsonb_agg(e)
--     from jsonb_array_elements(l.datasheet->'b4_files_foto') e where (e->>'assetId') not in (select id::text from ids)), '[]'::jsonb))
--    where exists (select 1 from jsonb_array_elements(l.datasheet->'b4_files_foto') e where (e->>'assetId') in (select id::text from ids));
--   update fincas set profile_photo_asset_id = null where profile_photo_asset_id in (select id from media_assets where path ilike '%Paisaje_de_finca%');
