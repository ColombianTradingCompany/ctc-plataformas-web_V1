-- ── Acta · 2026-10-01 · V5.124 · la solicitud de revisión de datos lleva sección y adjunto ─────────────────────────
-- Aplicada con `apply_migration` (nombre `comm_log_seccion_y_adjunto`) en el proyecto sjznkzvefqfcysczllli.
--
-- Owner (2026-10-01): «una vez una finca es aprobada no puede ser editada, solo puede solicitar revisión de datos…
-- la revisión de datos debe permitir seleccionar uno de los 4 puntos, poner una nota y adjuntar un archivo. El
-- productor puede enviar varias solicitudes». La solicitud sigue siendo una nota del productor en el hilo de la finca
-- (`producer_comm_log`, política `producer_comm_log_insert_own`): gana tres columnas, no una tabla nueva.
--   · seccion: general · ubicacion · eudr · certs (los cuatro puntos del editor de la finca);
--   · adjunto_asset_id / adjunto_filename: UN archivo (sube al Storage del productor; `media_assets`).
-- El OCP las lee en la pestaña Comunicación de la finca (`FincaSeccion` → `FincaPanel`).

alter table public.producer_comm_log
  add column if not exists seccion text,
  add column if not exists adjunto_asset_id uuid references public.media_assets(id) on delete set null,
  add column if not exists adjunto_filename text;
comment on column public.producer_comm_log.seccion is 'V5.124: en una solicitud de revisión de datos de finca, el punto al que se refiere (general · ubicacion · eudr · certs).';
comment on column public.producer_comm_log.adjunto_asset_id is 'V5.124: archivo adjunto a la nota (uno), p. ej. el soporte de una solicitud de revisión de datos.';
