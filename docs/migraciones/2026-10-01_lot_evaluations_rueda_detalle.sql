-- ── Acta · 2026-10-01 · V5.133 · lot_evaluations.rueda_detalle ───────────────────────────────────────────────────────
-- Aplicada con `apply_migration` (nombre `lot_evaluations_rueda_detalle`) en el proyecto sjznkzvefqfcysczllli.
--
-- Owner (2026-10-01): «Agrega etapa e intensidad por marca en la planilla.» Es lo que la Rueda del Café del taller registra
-- en su modo Catar (formato descriptivo SCA-CVA): QUÉ se percibe (el punto de la rueda), DÓNDE (la etapa: fragancia · aroma ·
-- sabor · sabor residual — una por nota, la dominante) y CON QUÉ INTENSIDAD (0–15 en pasos de 0,5; 0–4 baja · 5–9 media ·
-- 10–15 alta). `rueda` no cambia: sigue siendo la lista de ids marcados, y quien solo la lea sigue funcionando.
-- `rueda_detalle` lleva, por cada id de esa lista, `{etapa, intensidad}`; lo normaliza `normalizaDetalle` (`src/lib/catacion/rueda.ts`).
-- Las evaluaciones anteriores quedan con `{}`: sus marcas se leen con el valor por defecto de la herramienta (sabor · 10).

alter table public.lot_evaluations add column if not exists rueda_detalle jsonb not null default '{}'::jsonb;
comment on column public.lot_evaluations.rueda_detalle is 'V5.133: por cada id de `rueda`, {etapa: fragancia|aroma|sabor|residual, intensidad: 0–15 en pasos de 0,5} (formato descriptivo SCA-CVA).';
