-- ACTA · 2026-10-10 · V5.203 (corrección) · migración `ctcx_selection_imagenes` (POR APLICAR)
--
-- La revisión de privacidad de la V5.203 (hallazgo 1, ALTA) encontró que la imagen de CTCx Selection —justo la del lote que debe
-- ocultar su finca— se publicaba CRUDA: el navegador subía el archivo tal cual al bucket PÚBLICO `ctcx-selection` (con su EXIF: una
-- foto de teléfono tomada en la finca lleva el GPS a pocos metros), con el NOMBRE ORIGINAL del archivo en la URL pública
-- («Finca_La_Floresta_….jpg») y con una política que dejaba a cualquier anónimo LISTAR el bucket (`POST /storage/v1/object/list/…`),
-- también las imágenes que quedaban huérfanas al anular la compra o pasarla a «solo stock». Decisión del nodo final (2026-10-10):
--
-- (1) Un bucket PRIVADO de staging, `ctcx-selection-staging`: el navegador sube ahí (URL firmada, nombre aleatorio = uuid + la
--     extensión de su tipo), y `fijarImagenCtcx` (comprasActions.ts) la descarga con el service role, la RE-CODIFICA con sharp
--     (`.rotate().webp({ quality: 82 })`: sin EXIF ni GPS), sube el resultado al bucket público con otro nombre aleatorio y borra el
--     staging. 5 MB y solo JPEG · PNG · WebP. Sin políticas: solo el service role (y la URL firmada que él emite) lo toca.
-- (2) El bucket público `ctcx-selection` sigue sirviendo `/storage/v1/object/public/…` (un bucket público no necesita política para
--     eso), pero ya no se puede LISTAR: se quita la política `ctcx selection public read` (verificada por SELECT sobre `pg_policies`
--     el 2026-10-10: SELECT para {anon, authenticated} con `bucket_id = 'ctcx-selection'`). Y solo admite WebP de hasta 5 MB: lo
--     único que escribe es el servidor, ya re-codificado.
-- Hoy el bucket tiene 0 objetos (consultado el 2026-10-10): no hay nada que re-codificar ni que renombrar.
-- No depende de otra migración: puede aplicarse antes o después de `2026-10-10_compras_anulacion.sql`, pero ANTES de desplegar el
-- código (el uploader sube al bucket de staging).

-- ── (1) el staging privado ───────────────────────────────────────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ctcx-selection-staging', 'ctcx-selection-staging', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ── (2) el bucket público: sin listado anónimo, solo lo que re-codifica el servidor ─────────────────────────────────────────────
drop policy if exists "ctcx selection public read" on storage.objects;
update storage.buckets
   set file_size_limit = 5242880,
       allowed_mime_types = array['image/webp']
 where id = 'ctcx-selection';
