-- ACTA · 2026-10-06 · V5.162 · migración `evaluaciones_ajuste_ctcx` (aplicada a `sjznkzvefqfcysczllli`)
--
-- El owner, 2026-10-06: «desde OCP → Informe de Centro: CTCx puede agregar hasta 100 puntos al puntaje final que moverían el
-- grado hacia arriba; de agregarse, se obliga a insertar un argumento que justifique el incremento, el cual está dado sobre todo
-- para pasar al siguiente grado un lote que está a poco de lograr llegar al siguiente escalafón y tiene algún factor
-- extraordinario que va más allá de lo ya registrado.»
--
-- El ajuste vive en la evaluación que RIGE (`lot_evaluations`): son puntos CTC (escala 1000–2500 de `src/lib/pvc/escala.ts`)
-- que se suman a Punto × Tríada. La base exige el argumento (≥ 30 caracteres) cuando hay puntos; el código mantiene las dos
-- puertas duras de la escala: sin especialidad (SCA < 80) no hay ajuste, y Tyrian sigue exigiendo SCA ≥ 89 nativo y surplus.

alter table public.lot_evaluations
  add column if not exists ajuste_ctcx_puntos smallint not null default 0 check (ajuste_ctcx_puntos between 0 and 100),
  add column if not exists ajuste_ctcx_justificacion text check (ajuste_ctcx_justificacion is null or length(ajuste_ctcx_justificacion) <= 2000),
  add column if not exists ajuste_ctcx_por uuid references public.profiles(id) on delete set null,
  add column if not exists ajuste_ctcx_at timestamptz;
alter table public.lot_evaluations drop constraint if exists lot_evaluations_ajuste_ctcx_justificado;
alter table public.lot_evaluations add constraint lot_evaluations_ajuste_ctcx_justificado
  check (ajuste_ctcx_puntos = 0 or (ajuste_ctcx_justificacion is not null and length(btrim(ajuste_ctcx_justificacion)) >= 30));
comment on column public.lot_evaluations.ajuste_ctcx_puntos is 'V5.162 · Puntos CTC que CTCx suma al puntaje final (0–100) por un factor extraordinario; mueven el grado hacia arriba. Exige justificación (≥ 30 caracteres).';
comment on column public.lot_evaluations.ajuste_ctcx_justificacion is 'V5.162 · El argumento obligatorio del ajuste CTCx.';
