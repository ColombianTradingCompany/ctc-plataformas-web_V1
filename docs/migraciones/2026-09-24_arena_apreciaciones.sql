-- V5.77 · Fase 1 del PLAN_CIRCUITO_DEL_LOTE (owner, 2026-09-24). Migración `arena_apreciaciones`.
-- Se aplica con `apply_migration`; esta copia es el acta (la fuente de verdad es la base).
--
-- La Arena se rehace como sesiones de SEGUNDA APRECIACIÓN: una sesión tiene nombre (no temporada ni fecha), se
-- llena con cafés galardonados y a cada uno se le adjunta una apreciación más (`lot_evaluations`). El grado lo rige
-- UNA sola evaluación por lote (`rige_grado`), por defecto la inicial: el promedio de las aceptadas deja de mandar.

alter table public.arena_sessions
  add column if not exists name text,
  alter column harvest_season_id drop not null,
  alter column session_date drop not null;

alter table public.lot_evaluations
  add column if not exists rige_grado boolean not null default false;

create unique index if not exists lot_evaluations_una_rige on public.lot_evaluations (lot_id) where rige_grado;

comment on column public.lot_evaluations.rige_grado is
  'La ÚNICA evaluación del lote que rige su grado (V5.77). Por defecto la inicial del Q-Grader; el owner puede elegir otra desde la Arena. Solo el OCP/BCP la escriben.';

-- Backfill: por cada lote con evaluaciones aceptadas, rige la más antigua del Q-Grader (q_grader_batch); si no la hay, la más antigua aceptada.
with candidatas as (
  select id, lot_id,
         row_number() over (partition by lot_id order by (source = 'q_grader_batch') desc, created_at asc) as rn
    from public.lot_evaluations
   where status = 'accepted'
)
update public.lot_evaluations e
   set rige_grado = true
  from candidatas c
 where e.id = c.id and c.rn = 1
   and not exists (select 1 from public.lot_evaluations x where x.lot_id = e.lot_id and x.rige_grado);
