-- ACTA · 2026-10-05 · V5.151 · migración `evaluaciones_reporte_original_q_grader` (aplicada a `sjznkzvefqfcysczllli`)
--
-- El owner, 2026-10-05: «agregar en cada evaluación de Lote la opción de agregar un archivo adjunto, el cual es la
-- referencia original del reporte del Q-Grader en su propio formato institucional (opcional en caso que lo tengan, no
-- requerido). Esto debe estar presente también si se registra desde OCP.»
--
-- `lot_evaluations.reference_asset_id` ya existía (lo usaba la solicitud de oficialización del productor, V5.109): el
-- archivo vive en `media_assets` (bucket `kaffetal-media`, ruta `evaluaciones/<lote>/q-grader/…`). Se añade el NOMBRE con
-- que se mostró el archivo (la ruta de Storage es segura, no legible) y el borrador del Centro lo conserva para
-- «Guardar y terminar más tarde». La subida va del navegador a Storage con URL firmada (service role la firma tras la
-- compuerta de cada lado: credencial del Centro con el bache en sus manos, o `permisoDeEscritura("ocp","emite")`).

alter table public.lot_evaluations add column if not exists reference_file_name text check (reference_file_name is null or length(reference_file_name) <= 200);
comment on column public.lot_evaluations.reference_asset_id is 'El reporte original del Q-Grader (media_assets) — opcional. V5.151: también en las altas del Centro y en las planillas del OCP; antes solo en la solicitud de oficialización del productor.';
comment on column public.lot_evaluations.reference_file_name is 'V5.151 · Nombre con que se mostró el reporte original (el de Storage es seguro, no legible).';
alter table public.evaluacion_borradores
  add column if not exists reference_asset_id uuid references public.media_assets(id) on delete set null,
  add column if not exists reference_file_name text check (reference_file_name is null or length(reference_file_name) <= 200);
