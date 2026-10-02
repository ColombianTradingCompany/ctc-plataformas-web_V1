-- ACTA · 2026-10-02 · V5.144 · migración `evaluacion_borradores_y_codigo_interno` (aplicada a `sjznkzvefqfcysczllli`)
--
-- El owner, 2026-10-02, sobre el Centro de Calidad: «Agrega un botón de "Guardar y terminar más tarde" y una casilla en
-- la parte superior que permita al evaluador insertar su propio código de muestra interno (independiente de CTCx).»
--
-- (1) `evaluacion_borradores` — la planilla A MEDIO LLENAR de un lote de un bache, por credencial del Centro. UNA fila
--     por (lote, cuenta): guardar otra vez la reemplaza. No es una evaluación: nadie más la lee, no tiene puntaje ni
--     estado, y se borra al dar de alta el lote (o con el lote). Solo service role (RLS encendido, sin políticas): la
--     escriben las acciones del Centro, que ya comprueban la credencial y que el bache esté en sus manos.
--
-- (2) `lot_evaluations.codigo_interno` — el código con el que el laboratorio lleva ESA muestra en sus propios registros.
--     Es del evaluador; no reemplaza al código de CTCx ni identifica al productor (la evaluación sigue a ciegas).

create table if not exists public.evaluacion_borradores (
  lot_id uuid not null references public.lots(id) on delete cascade,
  account_id uuid not null references public.profiles(id) on delete cascade,
  batch_id uuid references public.sondeo_batches(id) on delete cascade,
  planilla jsonb not null default '{}'::jsonb,
  notas text check (notas is null or length(notas) <= 4000),
  codigo_interno text check (codigo_interno is null or length(codigo_interno) <= 80),
  updated_at timestamptz not null default now(),
  primary key (lot_id, account_id)
);
comment on table public.evaluacion_borradores is 'V5.144 · La planilla a medio llenar del Centro de Calidad («Guardar y terminar más tarde»). Una por (lote, cuenta). Solo service role.';
create index if not exists evaluacion_borradores_account_idx on public.evaluacion_borradores (account_id);
create index if not exists evaluacion_borradores_batch_idx on public.evaluacion_borradores (batch_id);
alter table public.evaluacion_borradores enable row level security;
-- (sin políticas: solo el service role)

alter table public.lot_evaluations add column if not exists codigo_interno text;
alter table public.lot_evaluations drop constraint if exists lot_evaluations_codigo_interno_largo;
alter table public.lot_evaluations add constraint lot_evaluations_codigo_interno_largo check (codigo_interno is null or length(codigo_interno) <= 80);
comment on column public.lot_evaluations.codigo_interno is 'V5.144 · El código interno de la muestra en el laboratorio que evalúa (independiente del código de CTCx).';
