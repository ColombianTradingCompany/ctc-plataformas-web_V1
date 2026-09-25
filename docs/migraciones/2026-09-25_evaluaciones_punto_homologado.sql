-- V5.92 · El Punto homologado y el banco comparativo SCA ↔ CVA (owner, 2026-09-25, sobre el informe del Q-Grader
-- «CTCx · Homologación SCA 2004 ↔ CVA», copia en `reference/homologacion-sca-cva-2026-09-25/`, fuera del repo).
-- Migración `evaluaciones_punto_homologado`. Se aplicó con `apply_migration`; esta copia es el acta (la fuente de verdad es la base).
--
-- (1) `sca_total` sigue siendo la columna que leen todos (la vista pública, las ofertas, KR): desde ahora es EL PUNTO en unidades
--     SCA 2004 — el total nativo de la planilla SCA o, si la planilla solo trae CVA, el PISO del intervalo homologado (R4 del informe:
--     el grado firme se calcula sobre el piso). (2) `punto` guarda la procedencia completa: valor, bajo, alto, origen (nativo ·
--     homologado), protocolo fuente, modelo de homologación (`banda-k1-2` mientras no haya calibración) y el total CVA. (3) `cva_total`
--     guarda el total CVA registrado, tanto si rige (homologado) como si acompaña a un SCA nativo en una evaluación DUAL: esas filas
--     (`escala = 'sca' and cva_total is not null`) son el banco comparativo con el que se calibrará la homologación (≥ 30 lotes).
-- La regla vive en `src/lib/arena/{labEvaluation,homologacion}.ts` (puros); la base solo guarda.
-- (El CHECK `lot_evaluations_escala_check` (escala in ('sca','cva')) ya existía desde la V5.81: no se toca.)
alter table public.lot_evaluations add column if not exists punto jsonb;
alter table public.lot_evaluations add column if not exists cva_total numeric;
comment on column public.lot_evaluations.sca_total is 'El PUNTO que rige el grado, en unidades SCA 2004: el total nativo de la planilla SCA o, si la planilla solo trae CVA, el PISO del intervalo homologado (V5.92, owner 2026-09-25).';
comment on column public.lot_evaluations.punto is 'V5.92 · El Punto con su procedencia: {valor, bajo, alto, origen nativo|homologado, protocoloFuente sca2004|cva, modelo, cvaTotal}. Null en filas anteriores a la V5.92 (equivalen a nativo = sca_total).';
comment on column public.lot_evaluations.cva_total is 'V5.92 · El total CVA (SCA-104) registrado en la planilla, cuando la hubo (nativo si rige, o junto al SCA en una evaluación dual: el banco comparativo).';
comment on column public.lot_evaluations.escala is 'El protocolo que RIGE el Punto: sca (SCA 2004 nativo) o cva (Punto homologado). La vista del formulario (sca · cva · ambas) va dentro de physical_data.planilla.vista.';
