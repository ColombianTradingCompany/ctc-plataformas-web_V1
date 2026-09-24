-- V5.78 · Fase 2 del PLAN_CIRCUITO_DEL_LOTE (owner, 2026-09-24): el registro. Migración `registro_chequeo_y_certificados`.
-- Se aplica con `apply_migration`; esta copia es el acta (la fuente de verdad es la base).
--
-- (1) El chequeo de la finca contra bases EUDR oficiales, manual por ahora: un cuadro de texto y adjuntos (solo CTC):
--     `fincas.eudr_chequeo_notas`, `fincas.eudr_chequeo_files` — protegidas en `guard_finca_protected_columns`.
-- (2) Cada certificación declarada tiene ESTADO (`finca_certificates.status`): declarada → evidencia_pedida (recordatorio
--     semanal ×4) → corroborada, o retirada del Pasaporte si nunca se respaldó; el registro queda. Columnas nuevas:
--     `nota_ctc`, `evidencia_pedida_at`, `recordatorios`, `ultimo_recordatorio_at`, `retirada_at`. Solo CTC mueve el
--     estado (`guard_finca_cert_protected`: al INSERT se fuerza «declarada»; editar el contenido de una corroborada la
--     devuelve a «declarada»). Backfill: las verificadas pasan a «corroborada».

alter table public.fincas
  add column if not exists eudr_chequeo_notas text,
  add column if not exists eudr_chequeo_files jsonb not null default '[]'::jsonb;

-- guard_finca_protected_columns: se añaden eudr_chequeo_notas y eudr_chequeo_files a la lista de columnas solo-CTC
-- (el cuerpo completo está en la base; el acta anota el cambio).

alter table public.finca_certificates
  add column if not exists status text not null default 'declarada',
  add column if not exists nota_ctc text,
  add column if not exists evidencia_pedida_at timestamptz,
  add column if not exists recordatorios smallint not null default 0,
  add column if not exists ultimo_recordatorio_at timestamptz,
  add column if not exists retirada_at timestamptz;
alter table public.finca_certificates drop constraint if exists finca_certificates_status_check;
alter table public.finca_certificates
  add constraint finca_certificates_status_check check (status in ('declarada', 'evidencia_pedida', 'corroborada', 'retirada'));
update public.finca_certificates set status = 'corroborada' where verified_by_ctc and status = 'declarada';

-- guard_finca_cert_protected: INSERT fuerza status='declarada' y contadores en cero; UPDATE de no-CTC no puede mover
-- status/nota_ctc/evidencia_pedida_at/recordatorios/ultimo_recordatorio_at/retirada_at; editar scheme/cert_number/
-- valid_from/valid_to de una verificada o corroborada la devuelve a «declarada» (verified_by_ctc=false).
