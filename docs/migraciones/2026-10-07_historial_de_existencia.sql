-- V5.182 · el historial de la existencia del lote: un ANCLA DE CONTROL (owner, 2026-10-07). ADITIVA.
-- «Si bien es perfectamente válido que el Productor cambie la cantidad de CPS en cada uno de los puntos de control, es importante
-- que este cambio de dato no se pierda, de tal manera que se pueda tener un ancla de control que muestre y demuestre si hay cambios
-- abruptos o desproporcionados.»
--   · lot_existencia_historial: cada cambio de `lots.existencia_cps_kg` —antes, ahora, punto de control, quién, la etapa del lote y
--     la producción estimada de A2 en ese momento (en CPS)—. APPEND-ONLY: un trigger impide editar o borrar filas, también al
--     service role. Sin FK a `lots` a propósito: el ancla sobrevive aunque se borre el lote. Service-role only (RLS sin políticas).
--   · El trigger `lots_historial_existencia` (BEFORE INSERT/UPDATE en lots, después de los guardias por orden alfabético) es el
--     ÚNICO que escribe aquí: ningún camino se escapa (Ficha A2, invitación/renovación, solicitud de evaluación, OCP, datos).
--     Una sesión de productor queda siempre como «ficha» con su uid (no puede declarar otro origen); los escritores del servidor
--     anotan el punto de control en `lots.existencia_origen` / `existencia_por`, que el trigger lee y limpia.
--   · Arranque: los lotes que ya tienen existencia entran con su valor actual y la nota de su registro.

alter table public.lots
  add column if not exists existencia_origen text,
  add column if not exists existencia_por uuid;
comment on column public.lots.existencia_origen is 'V5.182 · TRANSITORIO: el punto de control del cambio de existencia en curso (lo escribe el servidor, lo lee y limpia el trigger lots_historial_existencia).';
comment on column public.lots.existencia_por is 'V5.182 · TRANSITORIO: quién hace el cambio de existencia en curso desde el servidor (lo lee y limpia el trigger).';

create table if not exists public.lot_existencia_historial (
  id uuid primary key default gen_random_uuid(),
  lot_id uuid not null,
  kg_antes numeric,
  kg_nuevo numeric,
  origen text not null check (origen in ('ficha', 'invitacion', 'solicitud', 'ocp', 'sistema')),
  por_quien uuid,
  etapa text,
  produccion_estimada_cps numeric,
  nota text,
  creado_at timestamptz not null default now()
);
alter table public.lot_existencia_historial enable row level security;
create index if not exists lot_existencia_historial_lote_idx on public.lot_existencia_historial (lot_id, creado_at);
comment on table public.lot_existencia_historial is
  'V5.182 · ancla de control de la existencia de CPS de cada lote: un registro por cambio, inmutable. docs: CHANGELOG V5.182.';

create or replace function public.historial_existencia_inmutable()
returns trigger
language plpgsql
as $function$
begin
  raise exception 'El historial de la existencia es un ancla de control: no se edita ni se borra.';
end $function$;
drop trigger if exists lot_existencia_historial_inmutable on public.lot_existencia_historial;
create trigger lot_existencia_historial_inmutable before update or delete on public.lot_existencia_historial
  for each row execute function public.historial_existencia_inmutable();

create or replace function public.lots_historial_existencia()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_rol text := coalesce(auth.role(), 'postgres');
  v_antes numeric := null;
  v_origen text;
  v_por uuid;
  v_prod numeric := null;
  v_cambio boolean;
begin
  if tg_op = 'UPDATE' then
    v_antes := old.existencia_cps_kg;
    v_cambio := new.existencia_cps_kg is distinct from old.existencia_cps_kg;
  else
    v_cambio := new.existencia_cps_kg is not null;
  end if;
  if v_cambio then
    if v_rol = 'authenticated' then
      -- Una sesión de productor: siempre la Ficha (A2), con su uid; no puede declarar otro punto de control.
      v_origen := 'ficha';
      v_por := auth.uid();
    else
      v_origen := coalesce(new.existencia_origen, 'sistema');
      v_por := new.existencia_por;
    end if;
    if v_origen not in ('ficha', 'invitacion', 'solicitud', 'ocp', 'sistema') then
      v_origen := 'sistema';
    end if;
    begin
      v_prod := nullif(regexp_replace(coalesce(new.datasheet ->> 'produccion_estimada_kg', ''), '[^0-9.]', '', 'g'), '')::numeric;
      if v_prod is not null and new.datasheet ->> 'produccion_unidad' = 'cereza' then
        v_prod := round(v_prod / 5, 1);
      end if;
    exception when others then
      v_prod := null;
    end;
    insert into public.lot_existencia_historial (lot_id, kg_antes, kg_nuevo, origen, por_quien, etapa, produccion_estimada_cps)
    values (new.id, v_antes, new.existencia_cps_kg, v_origen, v_por, new.stage::text, v_prod);
  end if;
  new.existencia_origen := null;
  new.existencia_por := null;
  return new;
end $function$;
drop trigger if exists lots_historial_existencia on public.lots;
create trigger lots_historial_existencia before insert or update on public.lots
  for each row execute function public.lots_historial_existencia();

-- El arranque: lo que ya está registrado entra con su valor y la nota de su registro (las del 2026-10-07, V5.181).
insert into public.lot_existencia_historial (lot_id, kg_antes, kg_nuevo, origen, por_quien, etapa, nota, creado_at)
select l.id, null, l.existencia_cps_kg, 'sistema', a.performed_by, l.stage::text,
       coalesce(a.notes, 'Existencia registrada antes del historial (V5.182).'), coalesce(a.created_at, now())
  from public.lots l
  left join lateral (
    select al.notes, al.created_at, al.performed_by from public.audit_log al
     where al.entity_type = 'lot' and al.entity_id = l.id and al.action = 'existencia_registrada'
     order by al.created_at desc limit 1
  ) a on true
 where l.existencia_cps_kg is not null
   and not exists (select 1 from public.lot_existencia_historial h where h.lot_id = l.id);
