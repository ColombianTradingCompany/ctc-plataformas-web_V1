-- ACTA · 2026-10-08 · V5.191 · migración `referencia_planilla_ctcx` (aplicada a `sjznkzvefqfcysczllli`)
--
-- El owner, 2026-10-08, sobre el lote CTC-L-323FEDE6 (un reporte de perfil de taza con la revisión pedida): «En este momento, la
-- acción desde OCP es solo "Marcar Revisada" y poner una nota opcional. Cambiemos esto para que entre a revisarlo y homologarlo en el
-- formato CTCx. Para ello, cambiemos este botón de "Marcar Revisada" por "Hacer Revisión", lo cual abre un panel igual al de la
-- evaluación, pero solo con la parte relevante (solo B2 o solo B3 si es de granulometría).»
--
-- (1) Dos columnas de CTCx en `lot_referencias`, nulas:
--       · `planilla_ctcx` — el reporte en formato CTCx: {version, bloques, planilla} (la planilla de evaluación, solo con los bloques
--         que se revisaron: B2 de un perfil de taza, B3 de un análisis físico, o los dos si el revisor incluyó el otro);
--       · `lectura_ctcx`  — lo que el lector del adjunto propuso (el texto del PDF y/o la IA): cada dato con su modo —leído, derivado,
--         interpretado— y los avisos. Sin la identidad del reporte (nombre, documento): esa se ve en el adjunto.
--     Las escribe solo el service role, al guardar la revisión (`src/app/ocp/(app)/referenciasActions.ts`), junto con `revisada_at`.
--     El check lo dice en la base: sin revisión, no hay planilla ni lectura de CTCx.
-- (2) La política de INSERT del productor se rehace con las dos columnas nuevas en null: no puede agregar una referencia con una
--     planilla de CTCx. Lo demás, igual a la viva (acta `2026-10-02_lot_referencias_y_fotos_opcionales.sql` y su enmienda
--     `lot_referencias_ficha_cerrada_por_etapa`): el lote propio con la Ficha cerrada —por paso o por etapa— y un archivo propio.
--
-- No toca datos: 0 filas (la única referencia viva, la de CTC-L-323FEDE6, queda con las dos columnas en null hasta su revisión).

alter table public.lot_referencias
  add column if not exists planilla_ctcx jsonb,
  add column if not exists lectura_ctcx jsonb;

comment on column public.lot_referencias.planilla_ctcx is 'V5.191 · El reporte en formato CTCx que guarda la revisión de CTCx: {version, bloques, planilla} (la planilla de evaluación, solo los bloques revisados).';
comment on column public.lot_referencias.lectura_ctcx is 'V5.191 · Lo que el lector del adjunto propuso (texto del PDF y/o IA), con el modo de cada dato y los avisos; sin la identidad del reporte.';

alter table public.lot_referencias drop constraint if exists lot_referencias_planilla_ctcx_check;
alter table public.lot_referencias add constraint lot_referencias_planilla_ctcx_check
  check ((planilla_ctcx is null and lectura_ctcx is null) or revisada_at is not null);

drop policy if exists lot_referencias_insert_own on public.lot_referencias;
create policy lot_referencias_insert_own on public.lot_referencias
  for insert to authenticated
  with check (
    producer_id = (select auth.uid())
    and revisada_at is null and revisada_por is null and nota_ctc is null
    and planilla_ctcx is null and lectura_ctcx is null
    and exists (
      select 1 from public.lots l
       where l.id = lot_id and l.producer_id = (select auth.uid())
         and (coalesce(l.intake_step, 0) >= 4 or l.stage::text <> 'borrador')
    )
    and exists (select 1 from public.media_assets m where m.id = asset_id and m.uploaded_by = (select auth.uid()))
  );
