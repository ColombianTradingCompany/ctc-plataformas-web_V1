-- V5.177 · Flete a CTCx (owner, 2026-10-07 · docs/PLAN_CICLOS.md §6). ADITIVA.
-- El «auxilio de transporte» de la V5.174 no existe: las cooperativas no le suman flete al precio base FNC, se lo DESCUENTAN
-- (la base es puesta en bodega de Almacafé). Lo reemplaza el «Flete a CTCx»: un valor fijo por carga equivalente, en tres
-- niveles por región de despacho, que se SUMA al precio final; el productor despacha con el código corporativo de CTCx en
-- Servientrega y paga el resto en la oficina.
--   · pvc_editions.flete_por_region: {"santander", "centro", "sur"} en COP por carga de 125 kg de CPS. Variable AJUSTABLE de
--     la edición (Modelo Económico, owner, con auditoría): no entra en la huella del PVC; cada oferta congela el suyo.
--   · lot_offers.flete_region / flete_carga: la región elegida en la oferta y su valor por carga, congelados al emitir.
--   · purchase_contracts.flete_region / flete_carga: lo mismo, congelado en el contrato (el texto firmado lo cita).
-- Los campos del auxilio (pvc_editions.auxilio_transporte_cop, purchase_contracts.auxilio_carga) nunca se llenaron (0 filas,
-- comprobado el 2026-10-07): se retiran en `2026-10-07_flete_retira_auxilio.sql`, cuando el código de la V5.177 ya no los lea.

alter table public.pvc_editions add column if not exists flete_por_region jsonb;
alter table public.pvc_editions drop constraint if exists pvc_editions_flete_check;
alter table public.pvc_editions add constraint pvc_editions_flete_check check (
  flete_por_region is null or (
    jsonb_typeof(flete_por_region) = 'object'
    and flete_por_region ?& array['santander', 'centro', 'sur']
    and jsonb_typeof(flete_por_region -> 'santander') = 'number'
    and jsonb_typeof(flete_por_region -> 'centro') = 'number'
    and jsonb_typeof(flete_por_region -> 'sur') = 'number'
    and (flete_por_region ->> 'santander')::numeric >= 0
    and (flete_por_region ->> 'centro')::numeric >= 0
    and (flete_por_region ->> 'sur')::numeric >= 0
  )
);
comment on column public.pvc_editions.flete_por_region is
  'V5.177 · Flete a CTCx en COP por carga (125 kg CPS) por región de despacho {santander, centro, sur}; se suma al precio final de la oferta. Ajustable por el owner con auditoría.';

alter table public.lot_offers
  add column if not exists flete_region text,
  add column if not exists flete_carga integer;
alter table public.lot_offers drop constraint if exists lot_offers_flete_check;
alter table public.lot_offers add constraint lot_offers_flete_check check (
  (flete_region is null or flete_region in ('santander', 'centro', 'sur')) and (flete_carga is null or flete_carga >= 0)
);

alter table public.purchase_contracts
  add column if not exists flete_region text,
  add column if not exists flete_carga integer;
alter table public.purchase_contracts drop constraint if exists purchase_contracts_flete_check;
alter table public.purchase_contracts add constraint purchase_contracts_flete_check check (
  (flete_region is null or flete_region in ('santander', 'centro', 'sur')) and (flete_carga is null or flete_carga >= 0)
);

-- El guard de la edición ya no protege el auxilio (se retira); el flete es ajustable y no toca la huella del PVC.
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
  end if;
  new.updated_at := now();
  return new;
end $function$;

-- La edición vigente recibe los valores del owner, con su fila de auditoría.
insert into public.audit_log (entity_type, entity_id, action, performed_by, notes)
select 'pvc_edition', id, 'flete_a_ctcx', null,
       'V5.177 (owner, 2026-10-07): el auxilio de transporte se descarta (no existe: las cooperativas descuentan el flete). Flete a CTCx por carga: Regional Santander $25.000 · Nacional Centro $50.000 · Nacional Sur $70.000.'
  from public.pvc_editions where code = 'PVC-F4-2026' and flete_por_region is null;
update public.pvc_editions
   set flete_por_region = '{"santander": 25000, "centro": 50000, "sur": 70000}'::jsonb
 where code = 'PVC-F4-2026' and flete_por_region is null;
