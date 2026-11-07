-- V6.23 · TAR-149 (owner, 2026-11-06) · Los códigos CTC se GUARDAN y son jerárquicos · PASO A de 2: ampliar.
--
-- El owner: «I want the UID changes to happen first» y «Update the format to be unified as expressed on the meeting».
-- Hasta hoy `CTC-P-`, `CTC-F-` y `CTC-L-` no se guardaban: se calculaban con los 8 primeros caracteres hexadecimales del uuid
-- (V5.100), sin columna, sin unicidad y sin relación entre los tres. Desde aquí cada productor, finca y lote tiene un código
-- GUARDADO, asignado una sola vez, único y que hereda el de su padre:
--
--     productor  CTC-P-XXX          3 caracteres al azar
--     finca      CTC-F-XXXYY        los 3 del productor + 2 al azar
--     lote       CTC-L-XXXYYZZZZ    los 5 de la finca + 4 al azar (hereda de la PRIMERA finca registrada: `lots.finca_id`)
--
-- Alfabeto Crockford (cifras y mayúsculas sin I, L, O ni U), el mismo de `lots.public_code` desde la V5.48. Un lote sin finca
-- no tiene código ni sale en ninguna lista pública hasta que se le asigne la finca. El código nunca se recalcula: si después
-- cambian las fincas del lote o el dueño de la finca, el código cuenta dónde NACIÓ el registro, no a quién pertenece hoy.
--
-- ⚠️ ORDEN DE APLICACIÓN (expandir → desplegar → cambiar):
--   1. ESTE archivo (paso A). Es ADITIVO: nada de lo que el código desplegado lee cambia de forma. La vitrina conserva
--      `referencia` (el código viejo) y gana `codigo` (el nuevo) AL FINAL; el código de hoy sigue funcionando igual.
--   2. Desplegar la V6.23, que lee los códigos guardados.
--   3. `2026-11-07_codigos_ctc_c_cambiar.sql` (paso C): la vitrina pasa `referencia` al código nuevo y se reescriben las
--      copias guardadas (Fichas y leads). Va DESPUÉS del despliegue porque la Ficha de hoy escribe el código viejo al guardar.
--   Las dos van en una transacción y empiezan comprobando: si algo no cuadra, se niegan y no cambian NADA.
--
-- Lo que hace este paso:
--   (1) `public.codigos_ctc`: el libro de códigos. Cada código que se asigna pasa por aquí y se queda PARA SIEMPRE (clave
--       primaria = el código): un código de un registro borrado no vuelve a salir. Guarda también los 51 códigos viejos con su
--       reemplazo (la tabla viejo → nuevo) y la «segunda puerta» de los 3 lotes del catálogo Japan Pioneers hasta 2027-06-30.
--       Solo el service role lo lee (RLS sin políticas).
--   (2) El generador y los asignadores (`ctc_codigo_productor`, `ctc_codigo_finca`, `ctc_codigo_lote`, `ctc_codigo_ciego`).
--       Ningún productor nuevo recibe 7E3, 016 ni FDA (los 3 primeros caracteres de las puertas: que ninguno se les parezca)
--       ni CTC (un cuerpo que empezara por «CTCX» se leería como un código viejo `CTCX-` en el portal).
--   (3) Columnas: `producer_profiles.codigo`, `fincas.codigo`, `lots.public_code` (la columna de la V5.48 se REUTILIZA para
--       el código del lote: una sola columna, regla 1), `arena_inscriptions.codigo_ciego` (el código de la cata a ciegas) y
--       `purchase_contracts.texto_codigo_lote` / `texto_codigo_productor` (los códigos con los que se firmó el texto).
--   (4) Disparadores `zz_*` (corren DESPUÉS de los guardianes, que van por orden alfabético): asignan al insertar, nunca
--       dejan cambiar un código asignado y no aceptan el que mande el cliente. Un lote solo puede colgar de una finca de su
--       mismo productor.
--   (5) `ctc_public_code()` ya no acuña `CTCX-`: si `triage_declarar` llega a llamarla, el lote no tiene finca y se niega.
--   (6) El relleno: 19 productores, 14 fincas, los lotes con finca; los códigos viejos al libro; las 3 puertas.
--   (7) La cata a ciegas: las inscripciones de hoy conservan como código ciego el que ya va impreso en sus bolsas (el viejo,
--       que no es jerárquico); las nuevas reciben `QG-` + 5 al azar, sin relación con el lote, y una re-evaluación recibe uno
--       fresco (el OCP lo pone a null y la base saca otro).
--   (8) Los contratos ya firmados o provisionales guardan los códigos con los que se calculó su huella SHA-256: su texto se
--       sigue armando con ellos y la huella sigue coincidiendo.
--   (9) La vitrina gana `codigo` al final y deja fuera lo que no tenga código; `nombre_publico_lote` deja de derivar un código
--       del uuid en su respaldo (inalcanzable en la práctica: la región y el año siempre resuelven). `public_lot_catalog` deja
--       su columna `public_code` vacía (null): la vitrina es la única fuente pública del código del lote (nadie la lee ya; la
--       ruta de los `CTCX-` resuelve por el libro).
--  (10) Comprobaciones finales: si una falla, se deshace todo.

begin;

-- ── (0) Comprobaciones previas ────────────────────────────────────────────────────────────────────────────────────────────
do $$
begin
  if to_regclass('public.codigos_ctc') is not null then
    raise exception '`codigos_ctc` ya existe: el paso A ya se aplicó. No se cambió nada.';
  end if;
  if exists (select 1 from information_schema.columns
              where table_schema = 'public' and table_name in ('fincas', 'producer_profiles') and column_name = 'codigo') then
    raise exception 'Ya existe una columna `codigo` en fincas o producer_profiles. No se cambió nada.';
  end if;
  if exists (select 1 from public.lots where public_code is not null
              and public_code !~ '^CTCX-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$') then
    raise exception '`lots.public_code` tiene valores que no son `CTCX-` (V5.48). No se cambió nada.';
  end if;
  if exists (select 1 from public.lots l join public.fincas f on f.id = l.finca_id where f.producer_id <> l.producer_id) then
    raise exception 'Hay lotes que cuelgan de una finca de otro productor. No se cambió nada.';
  end if;
  if (select count(distinct upper(left(replace(id::text, '-', ''), 8))) from public.lots) <> (select count(*) from public.lots)
     or (select count(distinct upper(left(replace(id::text, '-', ''), 8))) from public.fincas) <> (select count(*) from public.fincas) then
    raise exception 'Dos lotes o dos fincas comparten el código viejo: la tabla viejo → nuevo sería ambigua. No se cambió nada.';
  end if;
  if (select count(*) from public.lots
       where upper(left(replace(id::text, '-', ''), 8)) in ('7E360302', '016DF280', 'FDA6B795') and finca_id is not null) <> 3 then
    raise exception 'Los 3 lotes del catálogo Japan Pioneers (7E360302, 016DF280, FDA6B795) no están, o alguno no tiene finca. No se cambió nada.';
  end if;
end $$;

-- Un `CTCX-` acuñado por `triage_declarar` entre hoy y este paso (hoy no hay ninguno) se aparta antes de crear los disparadores:
-- va al libro como código viejo del lote, y la columna queda libre para el código nuevo.
create temporary table _ctcx_viejos on commit drop as
  select id as lot_id, public_code as codigo from public.lots where public_code is not null;
update public.lots set public_code = null where public_code is not null;

-- ── (1) El libro de códigos ───────────────────────────────────────────────────────────────────────────────────────────────
create table public.codigos_ctc (
  codigo          text primary key,
  tipo            text not null check (tipo in ('productor', 'finca', 'lote')),
  entidad_id      uuid,
  vigente         boolean not null default true,
  reemplazado_por text references public.codigos_ctc (codigo),
  puerta_hasta    date,
  nota            text,
  creado_at       timestamptz not null default now(),
  constraint codigos_ctc_vigente_con_entidad check (not vigente or entidad_id is not null),
  constraint codigos_ctc_puerta_solo_lote_viejo check (puerta_hasta is null or (tipo = 'lote' and not vigente and reemplazado_por is not null))
);
create unique index codigos_ctc_un_vigente on public.codigos_ctc (tipo, entidad_id) where vigente;
create index codigos_ctc_entidad on public.codigos_ctc (entidad_id);
alter table public.codigos_ctc enable row level security;
revoke all on public.codigos_ctc from public, anon, authenticated;
comment on table public.codigos_ctc is
  'V6.23 (TAR-149): el libro de códigos CTC. Todo código asignado pasa por aquí y se queda para siempre (un código de un registro '
  'borrado no se reasigna). Vigente = el código de hoy de la entidad; no vigente = un código viejo (derivado del uuid, V5.100, o un '
  'CTCX- de la V5.48) con su reemplazo. puerta_hasta = la «segunda puerta» del portal (solo los 3 lotes del catálogo Japan Pioneers, '
  'hasta 2027-06-30). Solo service role.';

-- ── (2) Generador y asignadores ───────────────────────────────────────────────────────────────────────────────────────────
create or replace function public.ctc_cuerpo_aleatorio(p_largo integer)
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  -- Crockford base32: sin I, L, O ni U. La MISMA cadena es `ALFABETO` en src/lib/catalogo/codigoPublico.ts
  -- (lo vigila qa-codigos-ctc-check): si una cambia sin la otra, se acuñan códigos que el portal rechaza.
  alfabeto constant text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  cuerpo text := '';
  i int;
begin
  for i in 1..p_largo loop
    cuerpo := cuerpo || pg_catalog.substr(alfabeto, 1 + pg_catalog.floor(pg_catalog.random() * 32)::int, 1);
  end loop;
  return cuerpo;
end;
$$;

create or replace function public.ctc_codigo_productor(p_productor uuid)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_codigo text;
  v_cuerpo text;
  v_intentos int := 0;
begin
  if p_productor is null then
    raise exception 'ctc_codigo_productor: falta el productor.';
  end if;
  loop
    select c.codigo into v_codigo from public.codigos_ctc c
     where c.tipo = 'productor' and c.entidad_id = p_productor and c.vigente;
    if v_codigo is not null then
      return v_codigo;
    end if;
    v_intentos := v_intentos + 1;
    if v_intentos > 200 then
      raise exception 'ctc_codigo_productor: 200 intentos sin un código libre.';
    end if;
    v_cuerpo := public.ctc_cuerpo_aleatorio(3);
    -- Reservados: los 3 primeros caracteres de las segundas puertas (que ningún código nuevo se les parezca) y CTC.
    continue when v_cuerpo = any (array['7E3', '016', 'FDA', 'CTC']);
    insert into public.codigos_ctc (codigo, tipo, entidad_id) values ('CTC-P-' || v_cuerpo, 'productor', p_productor)
      on conflict do nothing;
  end loop;
end;
$$;

create or replace function public.ctc_codigo_finca(p_finca uuid, p_productor uuid)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_codigo text;
  v_productor text;
  v_intentos int := 0;
begin
  if p_finca is null then
    raise exception 'ctc_codigo_finca: falta la finca.';
  end if;
  loop
    select c.codigo into v_codigo from public.codigos_ctc c
     where c.tipo = 'finca' and c.entidad_id = p_finca and c.vigente;
    if v_codigo is not null then
      return v_codigo;
    end if;
    v_intentos := v_intentos + 1;
    if v_intentos > 200 then
      raise exception 'ctc_codigo_finca: 200 intentos sin un código libre para este productor.';
    end if;
    v_productor := coalesce(v_productor, public.ctc_codigo_productor(p_productor));
    insert into public.codigos_ctc (codigo, tipo, entidad_id)
      values ('CTC-F-' || pg_catalog.substr(v_productor, 7, 3) || public.ctc_cuerpo_aleatorio(2), 'finca', p_finca)
      on conflict do nothing;
  end loop;
end;
$$;

create or replace function public.ctc_codigo_lote(p_lote uuid, p_finca uuid)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_codigo text;
  v_finca text;
  v_intentos int := 0;
begin
  if p_lote is null or p_finca is null then
    raise exception 'ctc_codigo_lote: un lote sin finca no tiene código.';
  end if;
  loop
    select c.codigo into v_codigo from public.codigos_ctc c
     where c.tipo = 'lote' and c.entidad_id = p_lote and c.vigente;
    if v_codigo is not null then
      return v_codigo;
    end if;
    v_intentos := v_intentos + 1;
    if v_intentos > 200 then
      raise exception 'ctc_codigo_lote: 200 intentos sin un código libre para esta finca.';
    end if;
    if v_finca is null then
      select f.codigo into v_finca from public.fincas f where f.id = p_finca;
      if v_finca is null then
        select c.codigo into v_finca from public.codigos_ctc c where c.tipo = 'finca' and c.entidad_id = p_finca and c.vigente;
      end if;
      if v_finca is null then
        raise exception 'ctc_codigo_lote: la finca todavía no tiene código.';
      end if;
    end if;
    insert into public.codigos_ctc (codigo, tipo, entidad_id)
      values ('CTC-L-' || pg_catalog.substr(v_finca, 7, 5) || public.ctc_cuerpo_aleatorio(4), 'lote', p_lote)
      on conflict do nothing;
  end loop;
end;
$$;

-- El código de la cata a ciegas: al azar y sin relación con el lote, para que el Q-Grader no sepa qué muestras son hermanas.
create or replace function public.ctc_codigo_ciego()
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_codigo text;
  v_intentos int := 0;
begin
  loop
    v_codigo := 'QG-' || public.ctc_cuerpo_aleatorio(5);
    exit when not exists (select 1 from public.arena_inscriptions a where a.codigo_ciego = v_codigo);
    v_intentos := v_intentos + 1;
    if v_intentos > 50 then
      raise exception 'ctc_codigo_ciego: 50 intentos sin un código libre.';
    end if;
  end loop;
  return v_codigo;
end;
$$;

revoke all on function public.ctc_cuerpo_aleatorio(integer) from public, anon, authenticated;
revoke all on function public.ctc_codigo_productor(uuid) from public, anon, authenticated;
revoke all on function public.ctc_codigo_finca(uuid, uuid) from public, anon, authenticated;
revoke all on function public.ctc_codigo_lote(uuid, uuid) from public, anon, authenticated;
revoke all on function public.ctc_codigo_ciego() from public, anon, authenticated;

-- ── (3) Columnas ──────────────────────────────────────────────────────────────────────────────────────────────────────────
alter table public.producer_profiles
  add column codigo text,
  add constraint producer_profiles_codigo_formato check (codigo ~ '^CTC-P-[0-9A-HJKMNP-TV-Z]{3}$'),
  add constraint producer_profiles_codigo_key unique (codigo);
alter table public.fincas
  add column codigo text,
  add constraint fincas_codigo_formato check (codigo ~ '^CTC-F-[0-9A-HJKMNP-TV-Z]{5}$'),
  add constraint fincas_codigo_key unique (codigo);
-- `lots.public_code` ya tiene su índice único (`lots_public_code_key`, V5.48) y el guardián que lo protege.
alter table public.lots
  add constraint lots_public_code_formato check (public_code ~ '^CTC-L-[0-9A-HJKMNP-TV-Z]{9}$');
alter table public.arena_inscriptions
  add column codigo_ciego text,
  add constraint arena_inscriptions_codigo_ciego_formato check (codigo_ciego ~ '^(QG-[0-9A-HJKMNP-TV-Z]{5}|CTC-L-[0-9A-F]{8})$'),
  add constraint arena_inscriptions_codigo_ciego_key unique (codigo_ciego);
alter table public.purchase_contracts
  add column texto_codigo_lote text,
  add column texto_codigo_productor text;

comment on column public.producer_profiles.codigo is 'V6.23 (TAR-149): CTC-P-XXX. Lo asigna la base (codigos_ctc); nunca cambia.';
comment on column public.fincas.codigo is 'V6.23 (TAR-149): CTC-F-XXXYY (los 3 del productor + 2). Lo asigna la base; nunca cambia.';
comment on column public.lots.public_code is
  'V6.23 (TAR-149): EL código del lote, CTC-L-XXXYYZZZZ (los 5 de su primera finca + 4). Lo asigna la base al tener finca; nunca cambia; '
  'null = lote sin finca (sin código y fuera de toda lista pública). Hasta la V6.22 guardaba el CTCX- de la V5.48, que ya no se acuña.';
comment on column public.arena_inscriptions.codigo_ciego is
  'V6.23 (TAR-149): el código que ve el Q-Grader y que va en la bolsa de la cata a ciegas. QG-XXXXX al azar; las inscripciones '
  'anteriores conservan el CTC-L-XXXXXXXX que ya llevaban impreso.';
comment on column public.purchase_contracts.texto_codigo_lote is
  'V6.23 (TAR-149): el código del lote con el que se armó el texto que se firmó (y su huella SHA-256). El texto se rearma con este.';
comment on column public.purchase_contracts.texto_codigo_productor is
  'V6.23 (TAR-149): el código del productor con el que se armó el texto que se firmó. El texto se rearma con este.';

-- ── (4) Disparadores ──────────────────────────────────────────────────────────────────────────────────────────────────────
create or replace function public.zz_producer_profiles_codigo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and old.codigo is not null then
    new.codigo := old.codigo;
  else
    new.codigo := public.ctc_codigo_productor(new.profile_id);
  end if;
  return new;
end;
$$;

create or replace function public.zz_fincas_codigo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and old.codigo is not null then
    new.codigo := old.codigo;
  else
    new.codigo := public.ctc_codigo_finca(new.id, new.producer_id);
  end if;
  return new;
end;
$$;

create or replace function public.zz_lots_codigo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.finca_id is not null and (tg_op = 'INSERT' or new.finca_id is distinct from old.finca_id) then
    if not exists (select 1 from public.fincas f where f.id = new.finca_id and f.producer_id = new.producer_id) then
      raise exception 'Esa finca no es del productor del lote.';
    end if;
  end if;
  if tg_op = 'UPDATE' and old.public_code is not null then
    new.public_code := old.public_code;
  elsif new.finca_id is null then
    new.public_code := null;
  else
    new.public_code := public.ctc_codigo_lote(new.id, new.finca_id);
  end if;
  return new;
end;
$$;

-- El código ciego no lo elige quien escribe: al insertar sale uno nuevo; al actualizar se conserva, SALVO que se ponga a null a
-- propósito (la re-evaluación, `reevaluar` en el OCP): entonces sale uno fresco, para que el Q-Grader no reconozca la muestra
-- que ya calificó.
create or replace function public.zz_arena_inscriptions_codigo_ciego()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and old.codigo_ciego is not null and new.codigo_ciego is not null then
    new.codigo_ciego := old.codigo_ciego;
  else
    new.codigo_ciego := public.ctc_codigo_ciego();
  end if;
  return new;
end;
$$;

revoke all on function public.zz_producer_profiles_codigo() from public, anon, authenticated;
revoke all on function public.zz_fincas_codigo() from public, anon, authenticated;
revoke all on function public.zz_lots_codigo() from public, anon, authenticated;
revoke all on function public.zz_arena_inscriptions_codigo_ciego() from public, anon, authenticated;

-- Las inscripciones de hoy: su código ciego es el que ya va en sus bolsas y en sus evaluaciones (`uid_anonimo`), ANTES del
-- disparador (que daría un QG- nuevo a toda fila sin código).
update public.arena_inscriptions
   set codigo_ciego = 'CTC-L-' || upper(left(replace(lot_id::text, '-', ''), 8))
 where codigo_ciego is null;

create trigger zz_producer_profiles_codigo before insert or update on public.producer_profiles
  for each row execute function public.zz_producer_profiles_codigo();
create trigger zz_fincas_codigo before insert or update on public.fincas
  for each row execute function public.zz_fincas_codigo();
create trigger zz_lots_codigo before insert or update on public.lots
  for each row execute function public.zz_lots_codigo();
create trigger zz_arena_inscriptions_codigo_ciego before insert or update on public.arena_inscriptions
  for each row execute function public.zz_arena_inscriptions_codigo_ciego();

-- ── (5) `CTCX-` ya no se acuña ────────────────────────────────────────────────────────────────────────────────────────────
-- `triage_declarar` la llama solo si el lote no tiene `public_code`; desde aquí eso es un lote sin finca, y no se declara.
create or replace function public.ctc_public_code()
returns text
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Este lote no tiene código CTC: asígnele su finca antes de declararlo al Catálogo Activo.';
end;
$$;

-- ── (6) El relleno ────────────────────────────────────────────────────────────────────────────────────────────────────────
-- Las actualizaciones «vacías» disparan `zz_*`, que asignan el código a cada fila que no lo tiene: productores, luego fincas
-- (heredan del productor), luego lotes con finca (heredan de la finca). Los guardianes dejan pasar a `postgres`.
update public.producer_profiles set codigo = codigo where codigo is null;
update public.fincas set codigo = codigo where codigo is null;
update public.lots set public_code = public_code where public_code is null and finca_id is not null;
-- Una cuenta con fincas o lotes y sin fila en producer_profiles (hoy ninguna) recibe igualmente su código en el libro.
select public.ctc_codigo_productor(x.id)
  from (select producer_id as id from public.fincas union select producer_id from public.lots) x;

-- La tabla viejo → nuevo: los códigos derivados del uuid (V5.100) quedan en el libro, no vigentes, con su reemplazo.
insert into public.codigos_ctc (codigo, tipo, entidad_id, vigente, reemplazado_por, nota)
select 'CTC-P-' || upper(left(replace(x.id::text, '-', ''), 8)), 'productor', x.id, false,
       (select c.codigo from public.codigos_ctc c where c.tipo = 'productor' and c.entidad_id = x.id and c.vigente),
       'Derivado del uuid (V5.100); reemplazado en la V6.23 (TAR-149).'
  from (select profile_id as id from public.producer_profiles
        union select producer_id from public.fincas
        union select producer_id from public.lots) x;
insert into public.codigos_ctc (codigo, tipo, entidad_id, vigente, reemplazado_por, nota)
select 'CTC-F-' || upper(left(replace(f.id::text, '-', ''), 8)), 'finca', f.id, false, f.codigo,
       'Derivado del uuid (V5.100); reemplazado en la V6.23 (TAR-149).'
  from public.fincas f;
insert into public.codigos_ctc (codigo, tipo, entidad_id, vigente, reemplazado_por, nota)
select 'CTC-L-' || upper(left(replace(l.id::text, '-', ''), 8)), 'lote', l.id, false, l.public_code,
       case when l.public_code is null
            then 'Derivado del uuid (V5.100). Lote sin finca: no tiene código nuevo hasta que se le asigne una.'
            else 'Derivado del uuid (V5.100); reemplazado en la V6.23 (TAR-149).' end
  from public.lots l;
-- Los `CTCX-` apartados arriba (hoy ninguno).
insert into public.codigos_ctc (codigo, tipo, entidad_id, vigente, reemplazado_por, nota)
select v.codigo, 'lote', v.lot_id, false, l.public_code, 'CTCX- de la V5.48; reemplazado en la V6.23 (TAR-149).'
  from _ctcx_viejos v join public.lots l on l.id = v.lot_id;
-- Los códigos de lo que se borró con el borrado nuclear: reservados para siempre, sin entidad.
insert into public.codigos_ctc (codigo, tipo, entidad_id, vigente, nota)
select distinct b.codigo,
       case when b.codigo like 'CTC-P-%' then 'productor' when b.codigo like 'CTC-F-%' then 'finca' else 'lote' end,
       null::uuid, false, 'Borrado nuclear: el código queda reservado.'
  from public.borrados_nucleares b
 where b.codigo ~ '^CTC-[PFL]-[0-9A-F]{8}$'
on conflict do nothing;

-- Las 3 segundas puertas (owner, punto 5): la dirección vieja abre el Dossier nuevo hasta el 30.06.2027.
update public.codigos_ctc
   set puerta_hasta = date '2027-06-30',
       nota = 'Segunda puerta (owner, 2026-11-06): va en el catálogo Japan Pioneers ya enviado. Abre el Dossier nuevo hasta el 30.06.2027.'
 where codigo in ('CTC-L-7E360302', 'CTC-L-016DF280', 'CTC-L-FDA6B795');

-- ── (8) Los contratos guardan los códigos de su texto firmado ─────────────────────────────────────────────────────────────
update public.purchase_contracts c
   set texto_codigo_lote = 'CTC-L-' || upper(left(replace(c.lot_id::text, '-', ''), 8)),
       texto_codigo_productor = 'CTC-P-' || upper(left(replace(l.producer_id::text, '-', ''), 8))
  from public.lots l
 where l.id = c.lot_id
   and (c.contract_text_sha256 is not null or c.provisional_sha256 is not null)
   and c.texto_codigo_lote is null;

-- ── (9) La vitrina y el nombre público ────────────────────────────────────────────────────────────────────────────────────
-- Mismo cuerpo que `pg_get_viewdef` del 2026-11-06, con dos cambios: `codigo` AL FINAL (create or replace solo deja añadir
-- columnas al final) y fuera lo que no tenga código. `referencia` sigue siendo el código viejo hasta el paso C.
create or replace view public.public_lot_vitrina as
 WITH rige AS (
         SELECT DISTINCT ON (e.lot_id) e.lot_id,
            e.sca_total,
            e.punto
           FROM lot_evaluations e
          WHERE e.status = 'accepted'::evaluation_status AND e.rige_grado
          ORDER BY e.lot_id, e.created_at DESC
        ), contrato AS (
         SELECT c.lot_id,
            min(COALESCE(c.signed_at, c.created_at)) AS desde
           FROM purchase_contracts c
          WHERE c.status = 'active'::contract_status AND c.ventana_tipo IS NOT NULL
          GROUP BY c.lot_id
        ), declarado AS (
         SELECT cf.lot_id,
            min(cf.created_at) AS desde
           FROM catalogo_fuentes cf
          WHERE cf.estado = 'declarada'::text
          GROUP BY cf.lot_id
        ), en_stock AS (
         SELECT p.lot_id,
            min(p.created_at) AS desde
           FROM stock_partidas p
          WHERE p.lot_id IS NOT NULL AND p.anulada_at IS NULL AND NOT p.comprometido
          GROUP BY p.lot_id
        ), comprado AS (
         SELECT DISTINCT cp.lot_id
           FROM compras cp
          WHERE cp.destino = 'selection'::text AND cp.anulada_at IS NULL
        )
 SELECT l.id AS lot_id,
    'CTC-L-'::text || upper("left"(replace(l.id::text, '-'::text, ''::text), 8)) AS referencia,
    nombre_publico_lote(l.id, l.datasheet, l.ficha_variedad, l.ficha_proceso, f.departamento, f.pais, l.harvest_to, l.harvest_from, l.created_at) AS nombre,
    l.grade,
    variedad_publica(l.ficha_variedad) AS variedad,
    proceso_publico(l.ficha_proceso) AS proceso,
    l.ficha_altitud_m / 100 * 100 AS altitud_m,
    r.sca_total AS punto,
    COALESCE(r.punto ->> 'protocoloFuente'::text, 'cva'::text) AS protocolo,
    NULL::text AS finca_name,
    NULL::text AS municipio,
    f.departamento,
    COALESCE(NULLIF(btrim(f.pais), ''::text), 'Colombia'::text) AS pais,
    cm.lot_id IS NOT NULL AS ctc_selection,
        CASE
            WHEN cm.lot_id IS NULL THEN NULL::text
            ELSE csl.imagen_path
        END AS ctcx_imagen_path,
    d.lot_id IS NOT NULL AS en_catalogo,
    LEAST(ct.desde, d.desde, s.desde) AS desde,
    cm.lot_id IS NULL AND (EXISTS ( SELECT 1
           FROM jsonb_array_elements(
                CASE
                    WHEN jsonb_typeof(l.datasheet -> 'b4_files_foto'::text) = 'array'::text THEN l.datasheet -> 'b4_files_foto'::text
                    ELSE '[]'::jsonb
                END) foto(v)
             JOIN lot_fotos_publicas fp ON fp.lot_id = l.id AND fp.asset_id::text = lower(btrim(foto.v ->> 'assetId'::text)))) AS tiene_foto,
    l.public_code AS codigo
   FROM lots l
     JOIN fincas f ON f.id = l.finca_id
     LEFT JOIN rige r ON r.lot_id = l.id
     LEFT JOIN contrato ct ON ct.lot_id = l.id
     LEFT JOIN declarado d ON d.lot_id = l.id
     LEFT JOIN en_stock s ON s.lot_id = l.id
     LEFT JOIN comprado cm ON cm.lot_id = l.id
     LEFT JOIN ctcx_selection_lotes csl ON csl.lot_id = l.id
  WHERE l.stage = 'galardonado'::lot_stage AND l.grade IS NOT NULL AND l.grade <> 'tyrian'::lot_grade
    AND l.public_code IS NOT NULL
    AND (ct.lot_id IS NOT NULL OR d.lot_id IS NOT NULL OR s.lot_id IS NOT NULL);

-- `public_lot_catalog`: mismo cuerpo que `pg_get_viewdef` del 2026-11-06, con `public_code` en null (misma posición y tipo).
create or replace view public.public_lot_catalog as
 SELECT l.id AS lot_id,
    nombre_publico_lote(l.id, l.datasheet, l.ficha_variedad, l.ficha_proceso, f.departamento, f.pais, l.harvest_to, l.harvest_from, l.created_at) AS name,
    l.grade,
    variedad_publica(l.ficha_variedad) AS ficha_variedad,
    proceso_publico(l.ficha_proceso) AS ficha_proceso,
    l.ficha_altitud_m / 100 * 100 AS ficha_altitud_m,
    l.ficha_puntaje_estimado,
    NULL::text AS ficha_notas_cata,
    NULL::text AS finca_name,
    NULL::text AS municipio,
    f.departamento,
    official.avg_sca_total AS official_score,
    comprado.lot_id IS NOT NULL AS ctc_selection,
    l.datasheet IS NOT NULL AS tiene_ficha,
    NULL::text AS public_code,
        CASE
            WHEN comprado.lot_id IS NULL THEN NULL::text
            ELSE csl.imagen_path
        END AS ctcx_imagen_path,
    COALESCE(NULLIF(btrim(f.pais), ''::text), 'Colombia'::text) AS pais
   FROM lots l
     JOIN fincas f ON f.id = l.finca_id
     JOIN lot_listings ll ON ll.lot_id = l.id
     LEFT JOIN ( SELECT DISTINCT c.lot_id
           FROM compras c
          WHERE c.destino = 'selection'::text AND c.anulada_at IS NULL) comprado ON comprado.lot_id = l.id
     LEFT JOIN ctcx_selection_lotes csl ON csl.lot_id = l.id
     LEFT JOIN ( SELECT lot_evaluations.lot_id,
            avg(lot_evaluations.sca_total) AS avg_sca_total
           FROM lot_evaluations
          WHERE lot_evaluations.status = 'accepted'::evaluation_status AND lot_evaluations.sca_total IS NOT NULL
          GROUP BY lot_evaluations.lot_id) official ON official.lot_id = l.id
  WHERE ll.status = ANY (ARRAY['published'::listing_status, 'sold_out'::listing_status]);

-- El respaldo del nombre público ya no deriva un código del uuid (nunca se alcanza: la región y el año siempre resuelven).
-- Misma firma, para que las vistas y `place_order` no cambien. `src/lib/catalogo/nombrePublico.ts` dice lo mismo.
create or replace function public.nombre_publico_lote(p_lot_id uuid, p_datasheet jsonb, p_ficha_variedad text, p_ficha_proceso text, p_departamento text, p_pais text, p_harvest_to date, p_harvest_from date, p_creado timestamp with time zone)
 returns text
 language sql
 stable parallel safe
 set search_path to ''
as $function$
  select coalesce(
    nullif(concat_ws(' · ',
      nullif(concat_ws(' ',
        coalesce(
          (select string_agg(x.nombre, ' + ' order by x.orden)
             from (select distinct on (v.nombre) v.nombre, v.orden
                     from (select public.variedad_publica(e.v ->> 'name') as nombre, e.orden
                             from jsonb_array_elements(case when jsonb_typeof(p_datasheet -> 'varieties') = 'array' then p_datasheet -> 'varieties' else '[]'::jsonb end)
                                  with ordinality as e(v, orden)) v
                    where v.nombre is not null
                    order by v.nombre, v.orden) x),
          public.variedad_publica(p_ficha_variedad)),
        public.proceso_publico(p_ficha_proceso)), ''),
      concat_ws(' ', coalesce(nullif(btrim(p_departamento), ''), nullif(btrim(p_pais), ''), 'Colombia'),
                     coalesce(to_char(p_harvest_to, 'YYYY'), to_char(p_harvest_from, 'YYYY'), to_char(p_creado at time zone 'UTC', 'YYYY')))
    ), ''),
    'Café de Colombia'
  )
$function$;

-- ── (10) Comprobaciones finales ───────────────────────────────────────────────────────────────────────────────────────────
do $$
declare
  n int;
begin
  if exists (select 1 from public.producer_profiles where codigo is null) then
    raise exception 'Quedó un productor sin código. Se deshace todo.';
  end if;
  if exists (select 1 from public.fincas where codigo is null) then
    raise exception 'Quedó una finca sin código. Se deshace todo.';
  end if;
  if exists (select 1 from public.lots where finca_id is not null and public_code is null) then
    raise exception 'Quedó un lote con finca y sin código. Se deshace todo.';
  end if;
  if exists (select 1 from public.lots where finca_id is null and public_code is not null) then
    raise exception 'Un lote sin finca recibió código. Se deshace todo.';
  end if;
  -- La herencia: finca = productor + 2; lote = finca + 4.
  if exists (select 1 from public.fincas f
               join public.codigos_ctc p on p.tipo = 'productor' and p.entidad_id = f.producer_id and p.vigente
              where substr(f.codigo, 7, 3) <> substr(p.codigo, 7, 3)) then
    raise exception 'Una finca no hereda el código de su productor. Se deshace todo.';
  end if;
  if exists (select 1 from public.lots l join public.fincas f on f.id = l.finca_id
              where substr(l.public_code, 7, 5) <> substr(f.codigo, 7, 5)) then
    raise exception 'Un lote no hereda el código de su finca. Se deshace todo.';
  end if;
  if exists (select 1 from public.producer_profiles pp
               join public.codigos_ctc p on p.tipo = 'productor' and p.entidad_id = pp.profile_id and p.vigente
              where p.codigo <> pp.codigo) then
    raise exception 'producer_profiles.codigo no coincide con el libro. Se deshace todo.';
  end if;
  if exists (select 1 from public.codigos_ctc
              where tipo = 'productor' and vigente and substr(codigo, 7, 3) in ('7E3', '016', 'FDA', 'CTC')) then
    raise exception 'Un productor recibió un prefijo reservado. Se deshace todo.';
  end if;
  select count(*) into n from public.codigos_ctc
   where puerta_hasta = date '2027-06-30' and reemplazado_por is not null
     and codigo in ('CTC-L-7E360302', 'CTC-L-016DF280', 'CTC-L-FDA6B795');
  if n <> 3 then
    raise exception 'Las 3 segundas puertas no quedaron (hay %). Se deshace todo.', n;
  end if;
  if exists (select 1 from public.codigos_ctc where puerta_hasta is not null
              and codigo not in ('CTC-L-7E360302', 'CTC-L-016DF280', 'CTC-L-FDA6B795')) then
    raise exception 'Hay una segunda puerta que el owner no pidió. Se deshace todo.';
  end if;
  if exists (select 1 from public.lots l where not exists
               (select 1 from public.codigos_ctc c where c.tipo = 'lote' and c.entidad_id = l.id and not c.vigente
                  and c.codigo = 'CTC-L-' || upper(left(replace(l.id::text, '-', ''), 8)))) then
    raise exception 'Falta un código viejo de lote en la tabla viejo → nuevo. Se deshace todo.';
  end if;
  if exists (select 1 from public.arena_inscriptions where codigo_ciego is null) then
    raise exception 'Quedó una inscripción sin código ciego. Se deshace todo.';
  end if;
  if exists (select 1 from public.public_lot_vitrina where codigo is null) then
    raise exception 'La vitrina muestra un lote sin código. Se deshace todo.';
  end if;
end $$;

commit;
