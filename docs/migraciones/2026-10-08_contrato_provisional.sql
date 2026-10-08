-- V5.190 (owner, 2026-10-08) · el contrato PROVISIONAL de la sesión asistida, y el arreglo de la firma.
--
-- 1. EL ARREGLO. La V5.175 (`2026-10-07_ciclos_trato_por_ventanas.sql`) dejó `freeze_months` «dormida» pero NOT NULL (con 3 por
--    defecto), y la firma de una participación por ventana la inserta en null a propósito (un trato por ventana no tiene meses).
--    Postgres rechazaba el insert (23502) y el contrato no nacía: la primera firma real (Castillo Lavado Ruizeñores 2026, sesión
--    asistida, 2026-10-08 13:32) dejó tres imágenes de firma en Storage y ningún contrato. La columna pasa a admitir null; el
--    valor por defecto (3) se queda para los tratos por meses que la omiten.
--
-- 2. EL CONTRATO PROVISIONAL (owner): en una sesión asistida CTCx no firma por el productor. Acepta PROVISIONALMENTE, en su favor
--    («grupo de Pioneros»), con el nombre de un responsable de CTCx; el contrato queda vigente y el productor lo RATIFICA y firma
--    desde su cuenta (puede ajustar la cantidad declarada; lo demás no cambia). Columnas:
--      provisional_at           cuándo CTCx aceptó provisionalmente
--      provisional_responsable  el nombre del responsable de CTCx que escribió el operador
--      provisional_por          el usuario de consola (OCP) que lo hizo — la sesión del panel, no el rótulo de la asistida
--      provisional_sha256       la huella del texto provisional (la de `contract_text_sha256` cambia al ratificar)
--      ratificado_at            cuándo el productor lo ratificó y firmó
-- Aditiva; no toca filas (no hay contratos en producción).

alter table public.purchase_contracts alter column freeze_months drop not null;

alter table public.purchase_contracts
  add column if not exists provisional_at timestamptz,
  add column if not exists provisional_responsable text,
  add column if not exists provisional_por uuid,
  add column if not exists provisional_sha256 text,
  add column if not exists ratificado_at timestamptz;

alter table public.purchase_contracts drop constraint if exists purchase_contracts_provisional_check;
alter table public.purchase_contracts add constraint purchase_contracts_provisional_check check (
  (provisional_at is null) = (provisional_responsable is null)
  and (provisional_at is null) = (provisional_por is null)
  and (provisional_at is null) = (provisional_sha256 is null)
  and (ratificado_at is null or provisional_at is not null)
  and (provisional_responsable is null or length(btrim(provisional_responsable)) >= 5)
);

comment on column public.purchase_contracts.provisional_at is 'V5.190: CTCx aceptó el contrato provisionalmente en una sesión asistida (vigente; el productor lo ratifica).';
comment on column public.purchase_contracts.ratificado_at is 'V5.190: el productor ratificó y firmó un contrato aceptado provisionalmente.';
