-- V5.173 (owner, 2026-10-06: «reemplazar "Declarar Ahora" por "Declarar para Temporada Actual"») · la modalidad '30_dias' (los
-- próximos 30 días, renovable) se reemplaza por 'temporada_actual' (lo que queda de la temporada en curso, con la escalera de retiro
-- repartida en sus meses). Ninguna oferta ni contrato llegó a guardar '30_dias' (comprobado por SQL el 2026-10-06), así que solo
-- cambia la lista permitida. La regla: src/lib/trato/modalidades.ts.

alter table public.lot_offers drop constraint if exists lot_offers_declaracion_check;
alter table public.lot_offers add constraint lot_offers_declaracion_check
  check (declaracion is null or declaracion = any (array['trimestre'::text, 'temporada_actual'::text, 'ahora_y_siguiente'::text]));

alter table public.purchase_contracts drop constraint if exists purchase_contracts_declaracion_check;
alter table public.purchase_contracts add constraint purchase_contracts_declaracion_check
  check (declaracion is null or declaracion = any (array['trimestre'::text, 'temporada_actual'::text, 'ahora_y_siguiente'::text]));
