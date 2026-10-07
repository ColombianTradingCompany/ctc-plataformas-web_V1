-- V5.174 (owner, 2026-10-07 · docs/PLAN_CICLOS.md, tanda 1) · las variables de cada edición del PVC y la existencia del lote.
-- Aditiva, más un re-fechado de PVC-F4-2026 aprobado por el owner («vale por el cambio del PVC»; no hay contratos que distorsionar).
--
--   · pvc_editions.ciclo1_hasta: el domingo en que termina el ciclo 1 (el ciclo 2 empieza el lunes siguiente).
--   · pvc_editions.minimos_por_grado: kg de CPS por ventana {black, red, blue, gold}; los edita el Modelo Económico.
--   · pvc_editions.rangos_calidad: {humedad_min, humedad_max, aw_max} con que se recibe el café (pago del 40 %).
--   · pvc_editions.auxilio_transporte_cop: el auxilio de transporte por carga (null = por fijar). En una edición publicada
--     solo pasa de null a un valor una vez; después se cambia con una corrección (guard).
--   · lots.existencia_cps_kg: la existencia total del lote (Ficha A2), base de lo disponible.

alter table public.pvc_editions
  add column if not exists ciclo1_hasta date,
  add column if not exists minimos_por_grado jsonb,
  add column if not exists rangos_calidad jsonb,
  add column if not exists auxilio_transporte_cop integer;

alter table public.pvc_editions drop constraint if exists pvc_editions_auxilio_check;
alter table public.pvc_editions add constraint pvc_editions_auxilio_check check (auxilio_transporte_cop is null or auxilio_transporte_cop >= 0);
alter table public.pvc_editions drop constraint if exists pvc_editions_ciclo1_check;
alter table public.pvc_editions add constraint pvc_editions_ciclo1_check
  check (ciclo1_hasta is null or (valid_from is not null and valid_to is not null and ciclo1_hasta > valid_from and ciclo1_hasta < valid_to));

create or replace function public.guard_pvc_edition()
 returns trigger
 language plpgsql
as $function$
begin
  if old.status in ('published','corrected') then
    if new.status not in ('published','corrected','superseded') then
      raise exception 'Una edición publicada no vuelve a borrador; publique una corrección.';
    end if;
    if new.code <> old.code or new.inputs <> old.inputs or new.outputs <> old.outputs
       or new.pvc_cop is distinct from old.pvc_cop or new.hash is distinct from old.hash
       or new.model_version_id <> old.model_version_id or new.published_at is distinct from old.published_at then
      raise exception 'Una edición publicada es inmutable: publique una corrección.';
    end if;
    -- V5.174: el auxilio de transporte es parte del precio; en una publicada solo se FIJA una vez (de null a un valor).
    if old.auxilio_transporte_cop is not null and new.auxilio_transporte_cop is distinct from old.auxilio_transporte_cop then
      raise exception 'El auxilio de transporte de una edición publicada ya está fijado: publique una corrección.';
    end if;
  end if;
  new.updated_at := now();
  return new;
end $function$;

alter table public.lots add column if not exists existencia_cps_kg numeric;
alter table public.lots drop constraint if exists lots_existencia_cps_check;
alter table public.lots add constraint lots_existencia_cps_check check (existencia_cps_kg is null or existencia_cps_kg >= 0);
comment on column public.lots.existencia_cps_kg is 'V5.174: existencia total de CPS del lote (Ficha A2, espejo de datasheet.existencia_cps_kg); lo disponible = existencia − vendido − retirado.';

-- PVC-F4-2026 al calendario ISO: 28 sep 2026 – 3 ene 2027 (14 semanas, ciclos 7 + 7), con sus variables.
update public.pvc_editions
   set valid_from = '2026-09-28', valid_to = '2027-01-03', ciclo1_hasta = '2026-11-15',
       minimos_por_grado = '{"black": 750, "red": 750, "blue": 375, "gold": 150}'::jsonb,
       rangos_calidad = '{"humedad_min": 10, "humedad_max": 12, "aw_max": 0.70}'::jsonb
 where code = 'PVC-F4-2026';
insert into public.audit_log (entity_type, entity_id, action, performed_by, notes)
select 'pvc_edition', id, 'refechado_calendario_iso', null,
       'V5.174 (owner, 2026-10-07): 15 sep – 15 dic 2026 → 28 sep 2026 – 3 ene 2027 (T4 de 14 semanas, ciclo 1 al 15 nov); mínimos por grado y rangos de calidad como variables de la edición; auxilio de transporte por fijar.'
  from public.pvc_editions where code = 'PVC-F4-2026';

-- La oferta abierta que guardó las fechas viejas de la temporada se alinea al calendario nuevo.
insert into public.audit_log (entity_type, entity_id, action, performed_by, notes)
select 'lot_offer', id, 'temporada_refechada', null, 'V5.174: temporada 2026-09-15..2026-12-15 → 2026-09-28..2027-01-03 (PVC-F4-2026 re-fechado).'
  from public.lot_offers where temporada_hasta = '2026-12-15' and status in ('emitida', 'contraofertada');
update public.lot_offers set temporada_desde = '2026-09-28', temporada_hasta = '2027-01-03'
 where temporada_hasta = '2026-12-15' and status in ('emitida', 'contraofertada');
