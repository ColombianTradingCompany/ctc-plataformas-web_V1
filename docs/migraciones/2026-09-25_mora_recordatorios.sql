-- V5.86 · Recordatorios de mora (fila «Recordatorios» del §4 del PLAN_CIRCUITO_DEL_LOTE; riesgo «correos a productores que
-- no los pidieron»: solo dos disparadores —evidencia pedida y mora—, semanal, tope ×4, el remitente único que filtra etiquetas).
-- Migración `mora_recordatorios`. Se aplicó con `apply_migration`; esta copia es el acta (la fuente de verdad es la base).
--
-- Decisión 6 del owner: la mora se DERIVA (`src/lib/trato/mesAMes.ts`) y se hace visible sola; el recordatorio es la forma de
-- hacerla visible al productor por correo y en su feed. NADA cambia de estado por el cron: la ruptura sigue siendo del owner.
-- Contador y fecha por mes del trato; la regla pura vive en `src/lib/trato/mora.ts` y la corre `/api/cron/recordatorios`.
alter table public.contract_months
  add column recordatorios_mora smallint not null default 0,
  add column ultimo_recordatorio_mora_at timestamptz;
comment on column public.contract_months.recordatorios_mora is 'V5.86 · cuántos recordatorios de mora se han mandado por este mes (tope 4, src/lib/trato/mora.ts).';
