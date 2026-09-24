-- V5.81 · Fase 4 del PLAN_CIRCUITO_DEL_LOTE (owner, 2026-09-24): Centro de Calidad · Evaluación de Lotes.
-- Migración `centro_calidad_evaluacion`. Se aplicó con `apply_migration`; esta copia es el acta (la fuente de verdad es la base).
--
-- (1) Respuesta 5 del owner: la credencial `centro-calidad` ACTIVA uno o ambos módulos (Evaluación de Lotes ·
--     Procesamiento de Lotes): `partner_accounts.modulos` jsonb {"evaluacion": bool, "procesamiento": bool}, que
--     conmuta el owner desde BCP · Socios · [nodo] (`setPartnerModulos`). La credencial interna que ya existía queda con
--     Evaluación activa para poder usarse desde hoy.
-- (2) La evaluación que registra el Q-Grader (`lot_evaluations`, source `q_grader_batch`, status `pending` hasta que CTCx
--     la confirma o la devuelve): `batch_id` (el bache del que salió), `escala` ('sca' | 'cva'), `rueda` (jsonb: la lista de
--     ids de descriptor de `src/lib/catacion/rueda.ts`) y `uid_anonimo` (el código corto con el que evaluó a ciegas).
--     Sin políticas nuevas: el socio escribe por Server Action con el service role; el productor sigue leyendo sus filas
--     (`lot_evaluations_select_own_lot`).

alter table public.partner_accounts
  add column if not exists modulos jsonb not null default '{}'::jsonb;
update public.partner_accounts
  set modulos = '{"evaluacion": true, "procesamiento": false}'::jsonb
  where node_type = 'centro-calidad' and modulos = '{}'::jsonb;

alter table public.lot_evaluations
  add column if not exists batch_id uuid references public.sondeo_batches(id) on delete set null,
  add column if not exists escala text not null default 'sca',
  add column if not exists rueda jsonb not null default '[]'::jsonb,
  add column if not exists uid_anonimo text;
alter table public.lot_evaluations drop constraint if exists lot_evaluations_escala_check;
alter table public.lot_evaluations
  add constraint lot_evaluations_escala_check check (escala in ('sca', 'cva'));
create index if not exists lot_evaluations_batch_id_idx on public.lot_evaluations (batch_id);
