-- V5.179 · el agente de la edición siguiente del PVC (tanda 4 de los Ciclos · docs/PLAN_CICLOS.md §6). ADITIVA.
-- En la semana 1 del ciclo 2 (o cuando el owner lo pide) el agente deja la edición siguiente como BORRADOR en `pvc_editions`
-- (status 'draft'): las fechas del calendario ISO, los insumos FNC derivados de la serie diaria y mensual, la TRM oficial
-- (datos.gov.co), lo que arrastra de la edición vigente (C strip, diferencial, costo, escalamiento, score) marcado como tal,
-- las variables (ciclos, mínimos, calidad, flete) y un informe con fuentes. Un responsable lo revisa en el Tablero y lo publica;
-- al publicarse, el borrador del mismo código queda sustituido.
--   · pvc_editions.agente: lo que el agente hizo y por qué (fuentes por insumo, arrastradas, meses, informe, avisos).
--   · un solo borrador vivo por código (índice único parcial): regenerar sustituye el anterior.

alter table public.pvc_editions add column if not exists agente jsonb;
comment on column public.pvc_editions.agente is
  'V5.179 · el borrador del agente: fuentes por insumo, insumos arrastrados, meses FNC, informe (IA, con fuentes web), avisos y recordatorios. docs/PLAN_CICLOS.md §6.';
create unique index if not exists pvc_editions_un_borrador_por_codigo on public.pvc_editions (code) where status = 'draft';
