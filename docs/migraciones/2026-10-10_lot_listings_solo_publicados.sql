-- 2026-10-10 · V6.1 · «Solo lo publicado es público» (consolas; auditoría de privacidad del 2026-10-10, hallazgos (a) y (b) de
-- `docs/componentes/consolas.md` §Pendientes y filas de `ALINEACION` §3b).
--
-- (a) La política `lot_listings_select_public` era `using (true)` para TODO rol: por REST, `anon` leía también los borradores y
--     los archivados, con su precio. La tienda (`CherryPickedExperience.tsx`) ya pedía `status = 'published'`, pero el filtro no
--     protegía nada. Desde aquí la política deja leer SOLO lo publicado, y solo a `anon` y `authenticated` (el service role no pasa
--     por RLS). Las funciones que leen listados por otro camino no cambian: `place_order` es SECURITY DEFINER, `triage_*` las
--     llama el service role, y las vistas públicas son del dueño (definer) — se estrechan por su propio `where`.
-- (b) `public_transparency_pricing` devolvía el precio al productor (`price_per_kg_locked`, `reference_price_snapshot`) del
--     contrato activo de TODO listado con transparencia encendida, publicado o no, y `anon` tenía todos los privilegios (inútiles
--     en una vista no actualizable, pero sobraban). Desde aquí: solo listados PUBLICADOS y solo SELECT, como hizo la V5.202 con
--     `public_lot_catalog`. Si la transparencia del precio al productor se queda o se retira sigue siendo decisión del owner
--     (`ALINEACION` §3b); esto solo cierra lo que ninguna decisión necesita.
--
-- Hoy (2026-10-10) `lot_listings` tiene 0 filas y la vista devuelve 0: se aplica ANTES de que el Triage declare el primer lote.
-- Reversible: `create policy ... using (true)` y la vista sin `ll.status = 'published'`.

begin;

drop policy if exists lot_listings_select_public on public.lot_listings;
create policy lot_listings_select_public on public.lot_listings
  for select to anon, authenticated
  using (status = 'published');

create or replace view public.public_transparency_pricing as
  select ll.id as lot_listing_id,
         pc.price_per_kg_locked,
         pc.reference_price_snapshot
    from public.lot_listings ll
    join public.lots l on l.id = ll.lot_id
    join public.purchase_contracts pc on pc.lot_id = l.id
   where ll.status = 'published'
     and ll.transparency_credit_enabled = true
     and pc.status = 'active';

revoke all on public.public_transparency_pricing from public, anon, authenticated;
grant select on public.public_transparency_pricing to anon, authenticated, service_role;

commit;
