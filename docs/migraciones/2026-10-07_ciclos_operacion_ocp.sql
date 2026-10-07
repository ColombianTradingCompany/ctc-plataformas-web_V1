-- V5.176 (owner, 2026-10-07 · docs/PLAN_CICLOS.md §3, §5, tanda 3) · la operación del trato por ventanas en el OCP. Aditiva.
--
--   · contract_ventas.anulada_at / anulada_motivo: lo vendido que el productor no despacha (pasada su prórroga) NO se borra: la
--     venta se ANULA (deja de contar como vendida) y el faltante se cobra como retiro penalizado (`contract_retiros`). Así la
--     cuenta declarado = vendido + retirado + en la vitrina sigue cerrando y el registro queda.
--   · lot_offers.recordatorio_at: el barrido diario (antes de la redeclaración de la V5.171, ahora de las renovaciones) le
--     recuerda una sola vez al productor que su renovación vence.
-- Las columnas de la redeclaración de la V5.171 en `purchase_contracts` (redeclarar_*, redeclarado_*, redeclaracion_origen)
-- quedan DORMIDAS: ningún contrato las usó y ningún código las lee desde la V5.176.

alter table public.contract_ventas
  add column if not exists anulada_at timestamptz,
  add column if not exists anulada_motivo text;

alter table public.lot_offers
  add column if not exists recordatorio_at timestamptz;

comment on column public.contract_ventas.anulada_at is 'V5.176: venta anulada porque el productor no la despachó (el faltante va a contract_retiros como retiro penalizado). No se borra.';
comment on column public.lot_offers.recordatorio_at is 'V5.176: cuándo el barrido diario le recordó al productor que su renovación vence (una sola vez).';
