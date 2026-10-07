-- V5.177 (después del despliegue) · se retiran los dos campos del «auxilio de transporte» (V5.174/V5.175), reemplazado por
-- el Flete a CTCx (`2026-10-07_flete_a_ctcx.sql`, docs/PLAN_CICLOS.md §6). Comprobado el 2026-10-07 antes de correr: 0 filas
-- con valor en ambas columnas, ninguna función ni vista las lee, y el código de la V5.177 (en vivo) ya no las selecciona.
-- No se pierde ningún dato.

alter table public.pvc_editions drop constraint if exists pvc_editions_auxilio_check;
alter table public.pvc_editions drop column if exists auxilio_transporte_cop;
alter table public.purchase_contracts drop column if exists auxilio_carga;
