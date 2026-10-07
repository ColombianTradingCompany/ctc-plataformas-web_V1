-- V5.182 · corrección ÚNICA del arranque del historial de la existencia (minutos después de crearlo, 2026-10-07).
-- El arranque de `2026-10-07_historial_de_existencia.sql` tomó solo el ÚLTIMO registro de cada lote; CTC-L-0B9C1C04 había pasado
-- de 5.000 (dato del owner, 13:25) a 2.000 (el productor, desde la invitación, 13:54) y el ancla perdía el 5.000. Se rehace el
-- arranque con TODOS los registros `existencia_registrada` de la auditoría, en orden, con su antes → ahora y su punto de control.
-- La inmutabilidad se suspende SOLO para esta corrección (las filas borradas eran del arranque, sin ningún cambio real posterior)
-- y se restituye en la misma transacción.
alter table public.lot_existencia_historial disable trigger lot_existencia_historial_inmutable;
delete from public.lot_existencia_historial;
insert into public.lot_existencia_historial (lot_id, kg_antes, kg_nuevo, origen, por_quien, etapa, nota, creado_at)
select al.entity_id,
       nullif(regexp_replace((regexp_match(al.notes, '([0-9.,—-]+) → ([0-9.,]+) kg'))[1], '[^0-9.]', '', 'g'), '')::numeric,
       nullif(regexp_replace((regexp_match(al.notes, '([0-9.,—-]+) → ([0-9.,]+) kg'))[2], '[^0-9.]', '', 'g'), '')::numeric,
       case when al.notes like '%(el productor, al solicitar%' then 'solicitud'
            when al.notes like '%(el productor)%' then 'invitacion'
            when al.notes like '%(CTCx)%' then 'ocp'
            else 'sistema' end,
       al.performed_by, l.stage::text, al.notes, al.created_at
  from public.audit_log al
  join public.lots l on l.id = al.entity_id
 where al.entity_type = 'lot' and al.action = 'existencia_registrada'
   and al.notes ~ '→ [0-9.,]+ kg'
 order by al.created_at;
alter table public.lot_existencia_historial enable trigger lot_existencia_historial_inmutable;
