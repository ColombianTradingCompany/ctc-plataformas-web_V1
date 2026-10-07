-- V5.181 · la existencia de CPS de los lotes registrados y por evaluar (owner, 2026-10-07). DATOS, aplicada por MCP.
-- «Para el lote CTC-L-0B9C1C04 usemos 5000 kg de CPS. Para los demás usa la tabla adjunta. Deriva los otros dos números pensando
-- lógicamente en que podría estar en la región cercana correspondiente (todos los números son de CPS disponible).»
-- Solo llena lo que estaba vacío (no pisa una existencia ya registrada), en las dos copias (columna y Ficha A2), y deja su fila de
-- auditoría por lote. Los dos ESTIMADOS los confirma o corrige el productor al solicitar la evaluación (V5.181 la exige ahí):
--   · CTC-L-403D5C8B «Castillo» Honey, finca Cien Soles (Piedecuesta), cultivo de 1 año → 2.500 kg (vecino en honey: Confines 4.000).
--   · CTC-L-DA154613 «Gesha Natural», mismo productor, sin finca aún → 500 kg (micro-lote; Mogotes, 700).
-- Fuera, a propósito: el lote de muestras SCAJ (CTC-L-11D74C88) y el de ejemplo de CTC Redes (CTC-L-37E426A3).
with v(id, kg, origen) as (values
 ('0b9c1c04-ae6a-4c83-bfcd-cc466af124de'::uuid, 5000::numeric, 'owner'),
 ('016df280-4222-4fcb-a8c6-15d575452ef0'::uuid, 10000::numeric, 'owner'),
 ('323fede6-3192-4fbb-bee4-a092ac670476'::uuid, 4000::numeric, 'owner'),
 ('7e360302-e549-4fe7-8f49-4c12ec010a83'::uuid, 15000::numeric, 'owner'),
 ('8946dc24-db38-4e58-9fff-9f05f218adcb'::uuid, 4000::numeric, 'owner'),
 ('fda6b795-be26-4442-a1ba-747fb7f5ea66'::uuid, 8500::numeric, 'owner'),
 ('7aedf5a4-b85d-461b-b552-e8b5ff13947e'::uuid, 700::numeric, 'owner'),
 ('403d5c8b-2bb0-49a6-a19e-eded63c21fca'::uuid, 2500::numeric, 'estimado'),
 ('da154613-0c59-498f-9992-2c5823637be7'::uuid, 500::numeric, 'estimado')
), upd as (
  update public.lots l
     set existencia_cps_kg = v.kg,
         datasheet = coalesce(l.datasheet, '{}'::jsonb) || jsonb_build_object('existencia_cps_kg', v.kg::int::text)
    from v where l.id = v.id and l.existencia_cps_kg is null
  returning l.id, v.kg, v.origen
)
insert into public.audit_log (entity_type, entity_id, action, performed_by, notes)
select 'lot', u.id, 'existencia_registrada', null,
  case when u.origen = 'owner'
       then 'V5.181 · existencia de CPS dada por el owner (2026-10-07): — → ' || u.kg::int || ' kg.'
       else 'V5.181 · existencia de CPS ESTIMADA por CTCx a pedido del owner (por la región cercana; el productor la confirma o corrige al solicitar la evaluación): — → ' || u.kg::int || ' kg.' end
from upd u;
