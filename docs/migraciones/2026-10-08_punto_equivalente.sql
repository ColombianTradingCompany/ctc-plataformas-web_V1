-- V5.189 (owner, 2026-10-08) · El Punto: el CVA es el protocolo principal y la homologación con intervalo de la V5.92 se ANULA
-- (`docs/PLAN_CIRCUITO_DEL_LOTE.md` §10.6). La base tenía UNA fila con un Punto homologado: el alta del Centro de Calidad del
-- 2026-10-08 del lote «Castillo Lavado Ruizeñores 2026» (pendiente de confirmar en el OCP), con CVA 84,25 y piso 81,50 (banda k 1–2).
-- Desde esta versión vale su CVA: 84,25. No se borra nada: la fila queda anotada en audit_log con lo que tenía, y se actualizan
-- `sca_total` (EL PUNTO, lo que leen todos) y `punto` (la forma nueva). Las demás filas no cambian de valor: las tres del Gesha son
-- SCA 2004 catados (85) y `puntoDeFila` lee su forma vieja. Idempotente: solo actúa sobre la fila mientras siga «homologada».

insert into public.audit_log (entity_type, entity_id, action, previous_status, new_status, performed_by, notes)
select 'lot_evaluation', id, 'punto_equivalente', 'homologado', 'cva', null,
       'V5.189 (owner, 2026-10-08): la homologación CVA → SCA 2004 con intervalo se anuló y el CVA es el protocolo principal; el Punto es el CVA. '
       || 'Antes: sca_total ' || sca_total::text || ', punto ' || punto::text || '. Ahora: sca_total 84.25.'
  from public.lot_evaluations
 where id = 'cee7bdef-15eb-497b-af57-82bfa24bfed0' and punto->>'origen' = 'homologado';

update public.lot_evaluations
   set sca_total = 84.25,
       punto = '{"valor": 84.25, "origen": "nativo", "protocoloFuente": "cva", "modelo": null, "comparativo": null}'::jsonb
 where id = 'cee7bdef-15eb-497b-af57-82bfa24bfed0' and punto->>'origen' = 'homologado' and cva_total = 84.25;
