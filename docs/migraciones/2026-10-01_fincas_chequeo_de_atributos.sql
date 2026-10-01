-- ── Acta · 2026-10-01 · V5.128 · fincas: solicitud de chequeo de atributos ──────────────────────────────
-- Aplicada con `apply_migration` (nombre `fincas_chequeo_de_atributos`) en el proyecto sjznkzvefqfcysczllli.
--
-- Owner (2026-10-01): en Kaffetal Regal, pestaña 3 de la finca, el productor MARCA y SOLICITA el chequeo de las «Áreas de
-- legislación» y de «Sostenibilidad y enfoque social», con una nota y una imagen opcionales por ítem. En el OCP esa
-- solicitud se ve, y cada ítem lleva —además de la marca— una NOTA de CTCx y su EVIDENCIA.
--
-- La migración se aplicó antes que el código (misma fecha); el código que las usa entró con la V5.128:
-- `src/lib/eudrAtributos.ts`, `ChequeosCtcx.tsx` (KR), `AtributosChequeo.tsx` + `FincaEudrEditor.tsx` (OCP), `updateFincaEudr`.
--
--   eudr_chequeo_solicitudes  la escribe el PRODUCTOR (finca pendiente o aprobada) — fuera del guard, a propósito.
--                             {"legal:<clave>" | "sost:<clave>": {nota, assetId, fileName, at}}
--   eudr_legal_files          evidencia de CTCx por área de legislación — {<clave>: {assetId, fileName}}. Solo CTC.
--   eudr_atributos_notas      nota de CTCx por ítem — {"legal:<clave>" | "sost:<clave>": texto}. Solo CTC.

alter table public.fincas
  add column if not exists eudr_chequeo_solicitudes jsonb not null default '{}'::jsonb,
  add column if not exists eudr_legal_files jsonb not null default '{}'::jsonb,
  add column if not exists eudr_atributos_notas jsonb not null default '{}'::jsonb;

-- `guard_finca_protected_columns` se reescribió entera con `create or replace`: es la misma función de antes más dos
-- líneas en el bloque «CTC-only columns»:
--      or new.eudr_legal_files is distinct from old.eudr_legal_files
--      or new.eudr_atributos_notas is distinct from old.eudr_atributos_notas
-- El bloque «finca aprobada» no cambió. El texto vigente se lee con:
--   select pg_get_functiondef(oid) from pg_proc where proname = 'guard_finca_protected_columns';
