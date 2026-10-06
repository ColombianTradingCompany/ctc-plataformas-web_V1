-- V5.171 (owner, 2026-10-06: «la opción 1, que quede en el 70 %») · la redeclaración de «Declarar Ahora y Siguiente Temporada».
-- Aditiva. `redeclarar_min_kg` y `redeclarar_at` (V5.169) dicen cuánto y cuándo; estas columnas dicen si se hizo, cuánto, quién
-- (el productor con el botón o el barrido diario al mínimo) y cuándo se le pidió. La regla: `estadoDeRedeclaracion`
-- (src/lib/trato/modalidades.ts); el servidor: src/lib/trato/redeclaracion.ts y /api/cron/redeclaraciones.

alter table public.purchase_contracts
  add column if not exists redeclarado_at timestamptz,
  add column if not exists redeclarado_kg numeric,
  add column if not exists redeclaracion_origen text,
  add column if not exists redeclarar_aviso_at timestamptz;

alter table public.purchase_contracts drop constraint if exists purchase_contracts_redeclaracion_origen_check;
alter table public.purchase_contracts
  add constraint purchase_contracts_redeclaracion_origen_check
  check (redeclaracion_origen is null or redeclaracion_origen in ('productor', 'automatica'));

comment on column public.purchase_contracts.redeclarado_kg is
  'V5.171: lo disponible para la siguiente Temporada Trimestral tras redeclarar (≥ redeclarar_min_kg).';
comment on column public.purchase_contracts.redeclaracion_origen is
  'V5.171: productor (botón «Redeclarar») o automatica (sin respuesta: queda en el mínimo, el 70 %).';
