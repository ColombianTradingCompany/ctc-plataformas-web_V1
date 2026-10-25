-- 2026-10-25 · Integraciones · B6.0, la salud de los crons (D-014, P2 del plan de unificación, `docs/PLAN_UNIFICACION.md`).
-- Migración `latidos`, ADITIVA, aplicada a producción sin rama (no toca filas ni columnas que existan).
--
-- Qué hace:
--   1. Bitácora nueva `latidos`: UNA fila por corrida de un trabajo (hoy los 8 crons de vercel.json, envueltos en `conLatido()`,
--      `src/lib/integraciones/latido.ts`; mañana los trabajos de Make y del briefing, P25/P30). Nace `en_curso`, se cierra UNA vez en
--      `ok` · `parcial` · `fallido` con su `fin`, y queda congelada. Solo metadatos y números: nunca contenido, direcciones ni asuntos
--      (regla F.4) — `conteos` solo admite números, `fuentes`/`canarios` solo marcas cortas, `codigo_error` sin «@» y ≤ 120.
--      RLS encendida sin políticas y sin permisos para anon/authenticated: la lee y escribe solo el service role. Retención 400 días
--      (la purga la hace la vuelta diaria del despachador; el guardia rechaza borrar nada más reciente).
--   2. `automations.clave`: la ruta del cron (`/api/cron/…`) o una etiqueta estable `familia:trabajo` de un trabajo propuesto. Única
--      cuando existe, inmutable una vez puesta.
--   3. `automations_touch` enmendada: una fila `activa` sin escenario de Make se admite SOLO si es un cron de la plataforma
--      (`disparador = 'cron'` y clave de ruta). `pausada` sigue exigiendo escenario: un cron se para con un deploy, no con un estado.
--      Una fila de cron no deja de serlo.
--
-- Las 14 filas semilla (8 crons `activa` + 6 trabajos `propuesta`) NO están aquí: salen del módulo `src/lib/integraciones/registroCrons.ts`
-- (`node scripts/qa-registro-crons.mjs --semilla-sql` imprime el INSERT) y se insertan DESPUÉS del push, cuando los candados del
-- tablero ya están vivos. El guardián `qa-registro-crons` exige que cada cron de vercel.json tenga su envoltura y su fila.
--
-- Orden de uso: (A) pre-chequeos, solo lectura · (B) up · (C) pruebas del guardia, que terminan lanzando su propio resultado, así que
-- NADA persiste · (D) down, solo si (C) sale mal o hay que revertir.


-- ═══ (A) Pre-chequeos · solo lectura · deben coincidir con la instantánea del 2026-10-25 ═══════════════════════════════════════════
-- Esperado: latidos ausente · 4 filas · sin columna clave · touch con la condición de siempre · 3 restricciones · 7+5+4 valores de enum.
select
  to_regclass('public.latidos') is null                                                           as latidos_ausente,
  (select count(*) from public.automations)                                                      as filas_automations,
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'automations' and column_name = 'clave')       as columna_clave,
  pg_get_functiondef('public.automations_touch'::regproc) like
    '%new.etapa in (''activa'', ''pausada'') and new.make_scenario_id is null then%'            as touch_original,
  (select count(*) from pg_constraint where conrelid = 'public.automations'::regclass)            as restricciones,
  (select count(*) from pg_enum where enumtypid = 'public.integration_domain'::regtype)          as dominios,
  (select count(*) from pg_enum where enumtypid = 'public.automation_stage'::regtype)            as etapas,
  (select count(*) from pg_enum where enumtypid = 'public.automation_criticality'::regtype)      as criticidades;


-- ═══ (B) up ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

-- Solo números (arriba; `conLatido` aplana un nivel como `a.b`), con claves sin texto libre.
create or replace function public.latidos_conteos_numericos(j jsonb)
returns boolean language sql immutable set search_path = '' as $$
  select jsonb_typeof(j) = 'object'
     and not exists (
       select 1 from jsonb_each(j) as e(k, v)
        where jsonb_typeof(e.v) <> 'number' or e.k !~ '^[A-Za-z0-9_.:-]{1,121}$'
     )
$$;

-- Marcas de una corrida (qué fuentes se leyeron, qué canarios dieron): booleanos, números o una palabra corta. Nunca texto libre.
create or replace function public.latidos_marcas_validas(j jsonb)
returns boolean language sql immutable set search_path = '' as $$
  select jsonb_typeof(j) = 'object'
     and not exists (
       select 1 from jsonb_each(j) as e(k, v)
        where e.k !~ '^[A-Za-z0-9_.:-]{1,80}$'
           or not (jsonb_typeof(e.v) in ('boolean', 'number')
                   or (jsonb_typeof(e.v) = 'string' and (e.v #>> '{}') ~ '^[a-z0-9_]{1,24}$'))
     )
$$;

create table public.latidos (
  id            uuid primary key default gen_random_uuid(),
  -- identidad
  clave         text not null check (clave ~ '^(/api/cron/[a-z0-9-]+|[a-z0-9-]+:[a-z0-9-]+)$'),
  trabajo       text not null check (char_length(trabajo) between 1 and 80),
  motor         text not null check (motor in ('vercel_cron', 'make', 'briefing')),
  -- la corrida
  inicio        timestamptz not null default now(),
  fin           timestamptz,
  estado        text not null default 'en_curso' check (estado in ('en_curso', 'ok', 'parcial', 'fallido')),
  -- comprobaciones (P25 en adelante)
  fuentes       jsonb not null default '{}'::jsonb check (public.latidos_marcas_validas(fuentes)),
  canarios      jsonb not null default '{}'::jsonb check (public.latidos_marcas_validas(canarios)),
  -- números
  conteos       jsonb not null default '{}'::jsonb check (public.latidos_conteos_numericos(conteos)),
  codigo_error  text check (codigo_error is null or (strpos(codigo_error, '@') = 0 and char_length(codigo_error) <= 120)),
  aviso_ref     text check (aviso_ref is null or aviso_ref ~ '^[A-Za-z0-9]{1,16}$'),
  aviso_estado  text check (aviso_estado is null or aviso_estado ~ '^[a-z_]{1,24}$'),
  prueba        boolean not null default false
);

comment on table public.latidos is
  'B6.0 (P2): una fila por corrida de un trabajo; nace en_curso, se cierra una vez y queda congelada. Solo metadatos y números (F.4). Service role únicamente; 400 días.';

create index latidos_clave_inicio on public.latidos (clave, inicio desc);

alter table public.latidos enable row level security;
revoke all on public.latidos from anon, authenticated;

create or replace function public.latidos_guard()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if new.estado <> 'en_curso' or new.fin is not null then
      raise exception 'latidos: una corrida nace en_curso y sin fin';
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if old.estado <> 'en_curso' then
      raise exception 'latidos: una corrida cerrada no se cambia';
    end if;
    if new.estado not in ('ok', 'parcial', 'fallido') or new.fin is null then
      raise exception 'latidos: una corrida se cierra una sola vez, con su estado final y su fin';
    end if;
    if new.id <> old.id or new.clave <> old.clave or new.trabajo <> old.trabajo or new.motor <> old.motor
       or new.inicio <> old.inicio or new.prueba <> old.prueba then
      raise exception 'latidos: la identidad y el inicio de una corrida no cambian';
    end if;
    return new;
  end if;

  -- DELETE: solo la purga de lo que pasó la retención.
  if old.inicio > now() - interval '400 days' then
    raise exception 'latidos: solo se borran corridas de más de 400 días';
  end if;
  return old;
end $$;

create trigger latidos_guard_trg
  before insert or update or delete on public.latidos
  for each row execute function public.latidos_guard();

-- automations.clave
alter table public.automations add column clave text;
alter table public.automations add constraint automations_clave_forma
  check (clave is null or clave ~ '^(/api/cron/[a-z0-9-]+|[a-z0-9-]+:[a-z0-9-]+)$');
create unique index automations_clave_unica on public.automations (clave) where clave is not null;

-- automations_touch enmendada (la original, para el down, está en (D)).
create or replace function public.automations_touch()
returns trigger language plpgsql set search_path to 'public' as $function$
begin
  new.updated_at := now();
  -- B6.0: la clave no cambia una vez puesta.
  if tg_op = 'UPDATE' and old.clave is not null and new.clave is distinct from old.clave then
    raise exception 'La clave de una automatización no cambia una vez puesta';
  end if;
  -- B6.0: una fila de cron lleva la ruta de su cron como clave, y no deja de ser cron.
  if new.disparador = 'cron' and (new.clave is null or new.clave !~ '^/api/cron/[a-z0-9-]+$') then
    raise exception 'Una fila de cron lleva la ruta de su cron como clave';
  end if;
  if tg_op = 'UPDATE' and old.disparador = 'cron' and new.disparador <> 'cron' then
    raise exception 'Una fila de cron no cambia de disparador: sale del registro con su cron';
  end if;
  -- Una automatización activa tiene que existir en Make. Una propuesta, no. Un cron de la plataforma corre en Vercel
  -- (B6.0); pausarlo no es un estado sino un deploy, así que `pausada` sigue exigiendo escenario.
  if new.etapa in ('activa', 'pausada') and new.make_scenario_id is null
     and not (new.etapa = 'activa' and new.disparador = 'cron') then
    raise exception 'Una automatización % tiene que estar enlazada a un escenario de Make', new.etapa;
  end if;
  return new;
end $function$;


-- ═══ (C) Pruebas del guardia · NADA persiste: el bloque termina lanzando su propio resultado ═════════════════════════════════════
-- Cada caso corre en su propio sub-bloque; el resultado sale en el mensaje del error final («… · 0 fallos» es el bueno).
do $$
declare
  r text := '';
  mal int := 0;
  res text;
  esp text;
  v_id uuid;
  v_viejo uuid;
  v_a uuid;
  n int;
begin
  -- 01 · insert en_curso
  esp := 'aceptado';
  begin
    insert into public.latidos (clave, trabajo, motor) values ('/api/cron/prueba-acta', 'prueba-acta', 'vercel_cron') returning id into v_id;
    res := 'aceptado';
  exception when others then res := 'rechazado'; end;
  r := r || format(E'\n01 insert en_curso                      %-9s esperado %-9s %s', res, esp, case when res = esp then 'OK' else 'MAL' end);
  if res <> esp then mal := mal + 1; end if;

  -- 02 · insert nacido final
  esp := 'rechazado';
  begin
    insert into public.latidos (clave, trabajo, motor, estado, fin) values ('/api/cron/prueba-acta', 'prueba-acta', 'vercel_cron', 'ok', now());
    res := 'aceptado';
  exception when others then res := 'rechazado'; end;
  r := r || format(E'\n02 insert nacido final                  %-9s esperado %-9s %s', res, esp, case when res = esp then 'OK' else 'MAL' end);
  if res <> esp then mal := mal + 1; end if;

  -- 03 · cambiar la clave de una corrida en curso
  esp := 'rechazado';
  begin
    update public.latidos set clave = '/api/cron/otra' where id = v_id;
    res := 'aceptado';
  exception when others then res := 'rechazado'; end;
  r := r || format(E'\n03 cambio de clave                      %-9s esperado %-9s %s', res, esp, case when res = esp then 'OK' else 'MAL' end);
  if res <> esp then mal := mal + 1; end if;

  -- 04 · cambiar el inicio
  esp := 'rechazado';
  begin
    update public.latidos set inicio = inicio - interval '1 hour', estado = 'ok', fin = now() where id = v_id;
    res := 'aceptado';
  exception when others then res := 'rechazado'; end;
  r := r || format(E'\n04 cambio de inicio                     %-9s esperado %-9s %s', res, esp, case when res = esp then 'OK' else 'MAL' end);
  if res <> esp then mal := mal + 1; end if;

  -- 05 · cerrar sin fin
  esp := 'rechazado';
  begin
    update public.latidos set estado = 'ok' where id = v_id;
    res := 'aceptado';
  exception when others then res := 'rechazado'; end;
  r := r || format(E'\n05 en_curso → ok sin fin                %-9s esperado %-9s %s', res, esp, case when res = esp then 'OK' else 'MAL' end);
  if res <> esp then mal := mal + 1; end if;

  -- 06 · codigo_error con «@»
  esp := 'rechazado';
  begin
    update public.latidos set estado = 'fallido', fin = now(), codigo_error = 'error_' || chr(64) || '_x' where id = v_id;
    res := 'aceptado';
  exception when others then res := 'rechazado'; end;
  r := r || format(E'\n06 codigo_error con @                   %-9s esperado %-9s %s', res, esp, case when res = esp then 'OK' else 'MAL' end);
  if res <> esp then mal := mal + 1; end if;

  -- 07 · codigo_error de más de 120
  esp := 'rechazado';
  begin
    update public.latidos set estado = 'fallido', fin = now(), codigo_error = repeat('x', 121) where id = v_id;
    res := 'aceptado';
  exception when others then res := 'rechazado'; end;
  r := r || format(E'\n07 codigo_error > 120                   %-9s esperado %-9s %s', res, esp, case when res = esp then 'OK' else 'MAL' end);
  if res <> esp then mal := mal + 1; end if;

  -- 08 · conteos con texto
  esp := 'rechazado';
  begin
    update public.latidos set estado = 'ok', fin = now(), conteos = '{"enviados": 2, "asunto": "texto"}'::jsonb where id = v_id;
    res := 'aceptado';
  exception when others then res := 'rechazado'; end;
  r := r || format(E'\n08 conteos no numéricos                 %-9s esperado %-9s %s', res, esp, case when res = esp then 'OK' else 'MAL' end);
  if res <> esp then mal := mal + 1; end if;

  -- 09 · fuentes con texto libre
  esp := 'rechazado';
  begin
    update public.latidos set estado = 'ok', fin = now(), fuentes = '{"gmail": "Asunto: hola"}'::jsonb where id = v_id;
    res := 'aceptado';
  exception when others then res := 'rechazado'; end;
  r := r || format(E'\n09 fuentes con texto libre             %-9s esperado %-9s %s', res, esp, case when res = esp then 'OK' else 'MAL' end);
  if res <> esp then mal := mal + 1; end if;

  -- 10 · el cierre bueno
  esp := 'aceptado';
  begin
    update public.latidos set estado = 'ok', fin = now(), conteos = '{"enviados": 0, "errores": 0}'::jsonb where id = v_id;
    res := 'aceptado';
  exception when others then res := 'rechazado'; end;
  r := r || format(E'\n10 en_curso → ok con fin                %-9s esperado %-9s %s', res, esp, case when res = esp then 'OK' else 'MAL' end);
  if res <> esp then mal := mal + 1; end if;

  -- 11 · reabrir o recerrar una corrida final
  esp := 'rechazado';
  begin
    update public.latidos set estado = 'fallido', fin = now() where id = v_id;
    res := 'aceptado';
  exception when others then res := 'rechazado'; end;
  r := r || format(E'\n11 ok → fallido                         %-9s esperado %-9s %s', res, esp, case when res = esp then 'OK' else 'MAL' end);
  if res <> esp then mal := mal + 1; end if;

  -- 12 · borrar una corrida reciente
  esp := 'rechazado';
  begin
    delete from public.latidos where id = v_id;
    res := 'aceptado';
  exception when others then res := 'rechazado'; end;
  r := r || format(E'\n12 borrar una corrida reciente          %-9s esperado %-9s %s', res, esp, case when res = esp then 'OK' else 'MAL' end);
  if res <> esp then mal := mal + 1; end if;

  -- 13 · una corrida de hace 401 días, y su purga
  esp := 'aceptado';
  begin
    insert into public.latidos (clave, trabajo, motor, inicio) values ('/api/cron/prueba-acta', 'prueba-acta', 'vercel_cron', now() - interval '401 days') returning id into v_viejo;
    delete from public.latidos where id = v_viejo;
    get diagnostics n = row_count;
    res := case when n = 1 then 'aceptado' else 'rechazado' end;
  exception when others then res := 'rechazado'; end;
  r := r || format(E'\n13 insert de hace 401 días y su borrado %-9s esperado %-9s %s', res, esp, case when res = esp then 'OK' else 'MAL' end);
  if res <> esp then mal := mal + 1; end if;

  -- 14 · fila cron activa con clave de ruta
  esp := 'aceptado';
  begin
    insert into public.automations (nombre, proposito, dominio, disparador, sistemas, criticidad, etapa, clave)
    values ('Cron · prueba del acta', 'Prueba del acta; no persiste.', 'it_plataforma', 'cron', '{plataforma}', 'experimental', 'activa', '/api/cron/prueba-acta')
    returning id into v_a;
    res := 'aceptado';
  exception when others then res := 'rechazado'; end;
  r := r || format(E'\n14 cron activa con clave de ruta        %-9s esperado %-9s %s', res, esp, case when res = esp then 'OK' else 'MAL' end);
  if res <> esp then mal := mal + 1; end if;

  -- 15 · fila cron activa sin clave
  esp := 'rechazado';
  begin
    insert into public.automations (nombre, proposito, dominio, disparador, sistemas, criticidad, etapa)
    values ('Cron · prueba sin clave', 'Prueba del acta; no persiste.', 'it_plataforma', 'cron', '{plataforma}', 'experimental', 'activa');
    res := 'aceptado';
  exception when others then res := 'rechazado'; end;
  r := r || format(E'\n15 cron activa sin clave                %-9s esperado %-9s %s', res, esp, case when res = esp then 'OK' else 'MAL' end);
  if res <> esp then mal := mal + 1; end if;

  -- 16 · fila no-cron activa sin escenario
  esp := 'rechazado';
  begin
    insert into public.automations (nombre, proposito, dominio, disparador, sistemas, criticidad, etapa)
    values ('Prueba webhook activa', 'Prueba del acta; no persiste.', 'it_plataforma', 'webhook', '{plataforma}', 'experimental', 'activa');
    res := 'aceptado';
  exception when others then res := 'rechazado'; end;
  r := r || format(E'\n16 no-cron activa sin escenario         %-9s esperado %-9s %s', res, esp, case when res = esp then 'OK' else 'MAL' end);
  if res <> esp then mal := mal + 1; end if;

  -- 17 · fila cron pausada (pausar un cron es un deploy)
  esp := 'rechazado';
  begin
    update public.automations set etapa = 'pausada' where id = v_a;
    res := 'aceptado';
  exception when others then res := 'rechazado'; end;
  r := r || format(E'\n17 cron → pausada                       %-9s esperado %-9s %s', res, esp, case when res = esp then 'OK' else 'MAL' end);
  if res <> esp then mal := mal + 1; end if;

  -- 18 · cambiar la clave de una automatización
  esp := 'rechazado';
  begin
    update public.automations set clave = '/api/cron/otra' where id = v_a;
    res := 'aceptado';
  exception when others then res := 'rechazado'; end;
  r := r || format(E'\n18 cambio de automations.clave          %-9s esperado %-9s %s', res, esp, case when res = esp then 'OK' else 'MAL' end);
  if res <> esp then mal := mal + 1; end if;

  -- 19 · una fila cron deja de ser cron
  esp := 'rechazado';
  begin
    update public.automations set disparador = 'webhook' where id = v_a;
    res := 'aceptado';
  exception when others then res := 'rechazado'; end;
  r := r || format(E'\n19 cron → webhook                       %-9s esperado %-9s %s', res, esp, case when res = esp then 'OK' else 'MAL' end);
  if res <> esp then mal := mal + 1; end if;

  -- 20 · las 4 filas de siempre siguen pasando el touch enmendado
  esp := 'aceptado';
  begin
    update public.automations set nombre = nombre where clave is null;
    get diagnostics n = row_count;
    res := case when n = 4 then 'aceptado' else 'rechazado' end;
  exception when others then res := 'rechazado'; end;
  r := r || format(E'\n20 las 4 filas de siempre (sin cambio)  %-9s esperado %-9s %s', res, esp, case when res = esp then 'OK' else 'MAL' end);
  if res <> esp then mal := mal + 1; end if;

  -- 21 · anon no lee nada (hay al menos una fila en este momento)
  esp := 'nada';
  begin
    set local role anon;
    begin
      select count(*) into n from public.latidos;
      res := case when n = 0 then 'nada' else 've filas' end;
    exception when insufficient_privilege then res := 'nada'; end;
    reset role;
  exception when others then res := 'error'; end;  -- p. ej. el rol no se pudo asumir: sale MAL, no «nada»
  r := r || format(E'\n21 lectura como anon                    %-9s esperado %-9s %s', res, esp, case when res = esp then 'OK' else 'MAL' end);
  if res <> esp then mal := mal + 1; end if;

  -- 22 · authenticated no lee nada
  esp := 'nada';
  begin
    set local role authenticated;
    begin
      select count(*) into n from public.latidos;
      res := case when n = 0 then 'nada' else 've filas' end;
    exception when insufficient_privilege then res := 'nada'; end;
    reset role;
  exception when others then res := 'error'; end;  -- p. ej. el rol no se pudo asumir: sale MAL, no «nada»
  r := r || format(E'\n22 lectura como authenticated           %-9s esperado %-9s %s', res, esp, case when res = esp then 'OK' else 'MAL' end);
  if res <> esp then mal := mal + 1; end if;

  raise exception 'PRUEBAS DEL ACTA latidos (nada persiste) · % fallos%', mal, r;
end $$;


-- ═══ (D) down · solo si (C) sale mal o hay que revertir (tras el rollback del código) ════════════════════════════════════════════
-- Antes: exportar las filas de `latidos` si las hay (solo metadatos y números). Las filas semilla se borran por clave: en el P2 solo
-- ellas la llevan. Soltar la tabla no dispara el guardia de borrado.
--
-- delete from public.automations where clave is not null;
-- create or replace function public.automations_touch()
--  returns trigger
--  language plpgsql
--  set search_path to 'public'
-- as $function$
-- begin
--   new.updated_at := now();
--   -- Una automatización activa tiene que existir en Make. Una propuesta, no.
--   if new.etapa in ('activa', 'pausada') and new.make_scenario_id is null then
--     raise exception 'Una automatización % tiene que estar enlazada a un escenario de Make', new.etapa;
--   end if;
--   return new;
-- end $function$;
-- drop index if exists public.automations_clave_unica;
-- alter table public.automations drop constraint if exists automations_clave_forma;
-- alter table public.automations drop column if exists clave;
-- drop table if exists public.latidos;
-- drop function if exists public.latidos_guard();
-- drop function if exists public.latidos_conteos_numericos(jsonb);
-- drop function if exists public.latidos_marcas_validas(jsonb);
