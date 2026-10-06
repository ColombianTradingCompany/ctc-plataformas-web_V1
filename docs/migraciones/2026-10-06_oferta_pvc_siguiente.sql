-- V5.170 (owner, 2026-10-06): «Que Siguiente Temporada use el PVC de la edición siguiente, ya que esta ancla debe ser fijada
-- como hemos dicho en las primeras dos semanas del segundo mes del trimestre anterior.»
-- La oferta de participación en Cherry Picked guarda, además del precio del PVC vigente (Declarar Ahora · Ahora y Siguiente),
-- el precio de la EDICIÓN SIGUIENTE para «Declarar Siguiente Temporada Trimestral» (null si al emitir aún no se publicaba) y
-- el inicio de la temporada vigente (de ahí sale la fecha límite de publicación de la siguiente). Aditiva.
alter table public.lot_offers add column if not exists price_next_kg numeric check (price_next_kg is null or price_next_kg > 0);
alter table public.lot_offers add column if not exists pvc_next_edition_id uuid references public.pvc_editions(id);
alter table public.lot_offers add column if not exists pvc_next_code text;
alter table public.lot_offers add column if not exists temporada_desde date;
