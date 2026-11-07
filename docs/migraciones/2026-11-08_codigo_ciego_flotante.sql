-- V6.24 · TAR-149, punto 4 (owner, 2026-11-07) · El código ciego FLOTANTE de la cata, y el código real cuando CTC decide el alta.
--
-- El owner: «I think they may need a 3 caps letters + 1 number (XXX#) "floating" code, meaning that these are ephimerous (they are
-- kept as a log, but is not truly the identifier) and the evaluator only sees the real one once the Lote has been evaluated (dado de
-- alta) - the goal of this is to avoid giving hints or patterns that could be used to recognize a Lote.»
--
-- El código que va en la bolsa de la cata y que ve el Q-Grader pasa de `QG-` + 5 (V6.23) a 3 letras + 1 cifra, p. ej. KRW7:
--   · 3 letras de las 22 del alfabeto Crockford (sin I, L, O ni U) y una cifra 0–9. Al azar, nunca en secuencia.
--   · Único PARA SIEMPRE: cada código emitido queda en el libro `codigos_ctc` (tipo `ciego`) y no vuelve a salir. Es flotante: no es
--     el identificador del lote, solo su nombre en la cata; una re-evaluación recibe otro (la V6.23 ya lo hacía con el QG-).
--   · Sin pistas: sus 3 letras nunca son las de un productor (`CTC-P-XXX`, vigente o no), ni FDA (el comienzo del código viejo
--     CTC-L-FDA6B795, que sigue público como segunda puerta hasta el 30.06.2027), ni CTC. Y al revés: ningún productor nuevo recibe
--     las 3 letras de un código ciego ya emitido. Los dos asignadores se turnan con el MISMO candado de transacción
--     (`pg_advisory_xact_lock`), así un productor y una muestra creados en el mismo instante no eligen el mismo trío.
--   · Ninguna muestra en juego (postulación, fila o sondeo) tiene un código vecino de otra (que difiera en un solo carácter, como
--     KRW7 y KRW8): dos muestras del mismo productor enviadas juntas no salen pegadas. Una re-evaluación tampoco recibe un vecino de
--     los códigos que ya tuvo.
-- El código REAL del lote (`lots.public_code`) lo ve el Q-Grader en su panel solo después de dar de alta esa muestra, cuando CTC ya
-- confirmó o devolvió esa alta; esa compuerta vive en la aplicación (`src/lib/arena/codigoCiego.ts` y la página del Centro de
-- Calidad), no aquí. Lo que sí vive aquí (4b): el código ciego no se lee con la sesión de un productor ni con la anónima, ni en
-- la inscripción ni en la evaluación que lo copia.
--
-- ⚠️ ORDEN: va DESPUÉS de los dos pasos de la V6.23 (`2026-11-07_codigos_ctc_a_ampliar.sql` y `…_c_cambiar.sql`); lo comprueba.
-- Es compatible con el código de la V6.23 y con el de la V6.24 (los dos solo enseñan el código ciego que lee de la fila); se
-- recomienda aplicarla antes de desplegar la V6.24, para que la primera inscripción que vea la V6.24 ya nazca con el código flotante.
-- Una sola transacción que empieza comprobando: si algo no cuadra, se niega y no cambia NADA.
--
-- Lo que hace:
--   (0) Comprobaciones previas, y un aviso (RAISE NOTICE) por cada inscripción que hoy lleva un QG-, con lo que se hará con ella.
--   (1) El libro acepta el tipo `ciego`, con un índice por sus 3 primeros caracteres (lo que consulta el asignador de productores).
--   (2) Los QG- de hoy entran al libro: el de cada inscripción, vigente; los que solo conserva una evaluación anterior, no vigentes.
--       Las bolsas de antes de la V6.23 (CTC-L- + 8) ya están en el libro desde el paso A, como código viejo de su lote.
--   (3) `ctc_codigo_ciego(p_inscripcion uuid default null)` emite el código flotante y lo asienta en el libro (el anterior de la
--       inscripción queda no vigente, con su reemplazo); `ctc_codigo_productor` evita las letras de los códigos ciegos; el disparador
--       de la inscripción le pasa su id. Mismos permisos que la V6.23: `search_path` vacío y sin EXECUTE para anon ni authenticated.
--   (4) El formato de `arena_inscriptions.codigo_ciego`: el flotante, y siguen valiendo el QG- y el CTC-L- + 8 de las bolsas que ya
--       existen. La unicidad se queda como estaba.
--   (4b) La lectura con la sesión del productor (`authenticated`) pasa a ser POR COLUMNAS en las dos tablas que guardan el código de
--       la cata: `arena_inscriptions`, todas menos `codigo_ciego`, y `lot_evaluations`, todas menos `uid_anonimo` (el mismo código,
--       que el alta del Centro y «Registrar a mano» del OCP copian a la evaluación). `anon` deja de leer las dos tablas. El código de
--       la cata lo leen solo el servidor (service role) y, por su página, el Centro de Calidad. El panel del productor ya pide listas
--       de columnas sin ellos (`KaffetalExperience.tsx`), su reclamo de oficialización inserta sin pedir nada de vuelta, y el
--       disparador `guard_lots_producer_columns` (que corre con la sesión del productor) solo mira `lot_id`. Ninguna política de otra
--       tabla, ninguna función que `authenticated` pueda llamar y ninguna vista `security_invoker` lee `lot_evaluations` (consultado en
--       la base el 2026-11-07, solo lectura): las dos vistas públicas que la leen corren con su dueño.
--   (5) La regla del hueco: una inscripción creada entre la V6.23 y la V6.24 conserva su QG- si su bolsa ya existe; si no, recibe un
--       código flotante. La señal de que la bolsa existe es el RECIBO de la muestra (`lots.sample_2kg_confirmed_at`): CTCx parte la
--       muestra al recibirla y rotula en ese momento la porción de la cata con su código ciego (`src/lib/muestras/recibo.ts`, el único
--       que escribe esa marca; la re-evaluación la borra y pide muestra nueva). Se recodifica solo un QG- en postulación, sin bache,
--       sin muestra recibida y sin ninguna evaluación con ese código. Esperadas hoy: 0.
--   (6) Comprobaciones finales: si una falla, se deshace todo.

begin;

-- ── (0) Comprobaciones previas ────────────────────────────────────────────────────────────────────────────────────────────
do $$
begin
  if to_regclass('public.codigos_ctc') is null then
    raise exception 'Falta el libro `codigos_ctc`: aplique antes la V6.23 (pasos A y C). No se cambió nada.';
  end if;
  if not exists (select 1 from information_schema.columns
                  where table_schema = 'public' and table_name = 'public_lot_vitrina' and column_name = 'codigo')
     or exists (select 1 from public.public_lot_vitrina where referencia is distinct from codigo) then
    raise exception 'La vitrina no está en el estado del paso C de la V6.23 (referencia = código nuevo): aplíquelo antes. No se cambió nada.';
  end if;
  if not exists (select 1 from pg_catalog.pg_constraint
                  where conrelid = 'public.arena_inscriptions'::regclass and conname = 'arena_inscriptions_codigo_ciego_formato') then
    raise exception 'Falta el formato del código ciego de la V6.23 (arena_inscriptions_codigo_ciego_formato). No se cambió nada.';
  end if;
  if (select pg_catalog.pg_get_constraintdef(oid) from pg_catalog.pg_constraint
       where conrelid = 'public.arena_inscriptions'::regclass and conname = 'arena_inscriptions_codigo_ciego_formato') like '%{3}[0-9]%' then
    raise exception 'El código ciego ya acepta el formato flotante: esta migración ya se aplicó. No se cambió nada.';
  end if;
  if not exists (select 1 from pg_catalog.pg_constraint
                  where conrelid = 'public.codigos_ctc'::regclass and conname = 'codigos_ctc_tipo_check') then
    raise exception 'Falta el CHECK de tipo del libro (codigos_ctc_tipo_check). No se cambió nada.';
  end if;
  if to_regprocedure('public.ctc_codigo_ciego()') is null then
    raise exception 'Falta `ctc_codigo_ciego()` de la V6.23. No se cambió nada.';
  end if;
  if not exists (select 1 from pg_catalog.pg_trigger
                  where tgrelid = 'public.arena_inscriptions'::regclass and tgname = 'zz_arena_inscriptions_codigo_ciego') then
    raise exception 'Falta el disparador zz_arena_inscriptions_codigo_ciego de la V6.23. No se cambió nada.';
  end if;
  if exists (select 1 from public.arena_inscriptions
              where codigo_ciego is null or codigo_ciego !~ '^(QG-[0-9A-HJKMNP-TV-Z]{5}|CTC-L-[0-9A-F]{8})$') then
    raise exception 'Hay inscripciones sin código ciego o con uno fuera de los formatos de la V6.23. No se cambió nada.';
  end if;
  if exists (select 1 from public.arena_inscriptions a join public.codigos_ctc c on c.codigo = a.codigo_ciego
              where a.codigo_ciego like 'QG-%') then
    raise exception 'Un QG- ya está en el libro: la migración se aplicó a medias o alguien lo escribió a mano. No se cambió nada.';
  end if;
  if exists (select 1 from public.arena_inscriptions a
              where a.codigo_ciego like 'CTC-L-%' and not exists (select 1 from public.codigos_ctc c where c.codigo = a.codigo_ciego)) then
    raise exception 'Una bolsa de antes de la V6.23 (CTC-L- + 8) no está en el libro. No se cambió nada.';
  end if;
end $$;

-- Las `uid_anonimo` de las evaluaciones, para comprobar al final que esta migración no las toca (son la historia de cada cata).
create temporary table _uid_antes on commit drop as
  select id, uid_anonimo from public.lot_evaluations;

-- Cada QG- de hoy, con la señal de su bolsa y lo que se hará con él (5).
create temporary table _qg on commit drop as
  select a.id as inscripcion_id,
         a.codigo_ciego as codigo,
         a.phase as fase,
         a.created_at,
         a.sondeo_batch_id is not null as en_bache,
         l.sample_2kg_confirmed_at is not null as muestra_recibida,
         (select count(*) from public.lot_evaluations e where e.uid_anonimo = a.codigo_ciego) as evaluaciones
    from public.arena_inscriptions a
    left join public.lots l on l.id = a.lot_id
   where a.codigo_ciego like 'QG-%';
alter table _qg add column recodifica boolean;
update _qg set recodifica = (fase = 'postulacion' and not en_bache and not muestra_recibida and evaluaciones = 0);

do $$
declare
  r record;
  n int := 0;
begin
  for r in select * from _qg order by created_at loop
    n := n + 1;
    raise notice 'Código ciego %: inscripción % (creada %, fase %, en bache: %, muestra recibida: %, evaluaciones con este código: %) → %',
      r.codigo, r.inscripcion_id, r.created_at, r.fase, r.en_bache, r.muestra_recibida, r.evaluaciones,
      case when r.recodifica then 'RECIBE un código flotante (su bolsa todavía no existe)'
           else 'CONSERVA su QG- (su bolsa ya está rotulada o ya se evaluó)' end;
  end loop;
  raise notice 'Inscripciones con QG- antes de la V6.24: % (esperadas: 0). Se recodifican: %.', n, (select count(*) from _qg where recodifica);
end $$;

-- ── (1) El libro acepta el tipo `ciego` ───────────────────────────────────────────────────────────────────────────────────
alter table public.codigos_ctc drop constraint codigos_ctc_tipo_check;
alter table public.codigos_ctc
  add constraint codigos_ctc_tipo_check check (tipo in ('productor', 'finca', 'lote', 'ciego'));
-- Lo que pregunta el asignador de productores: «¿estas 3 letras ya las llevó un código ciego?».
create index codigos_ctc_ciego_letras on public.codigos_ctc (left(codigo, 3)) where tipo = 'ciego';
comment on table public.codigos_ctc is
  'V6.23 (TAR-149): el libro de códigos CTC. Todo código asignado pasa por aquí y se queda para siempre (un código de un registro '
  'borrado no se reasigna). Vigente = el código de hoy de la entidad; no vigente = un código viejo (derivado del uuid, V5.100, o un '
  'CTCX- de la V5.48) con su reemplazo. puerta_hasta = la «segunda puerta» del portal (solo los 3 lotes del catálogo Japan Pioneers, '
  'hasta 2027-06-30). V6.24: también los códigos CIEGOS de la cata (tipo ciego, entidad = la inscripción; vigente = el de su bolsa '
  'de hoy, no vigente = uno que ya tuvo, con su reemplazo). Solo service role.';

-- ── (2) Los QG- de hoy entran al libro ────────────────────────────────────────────────────────────────────────────────────
insert into public.codigos_ctc (codigo, tipo, entidad_id, vigente, nota)
select a.codigo_ciego, 'ciego', a.id, true, 'Código ciego QG- de la V6.23; asentado en el libro en la V6.24.'
  from public.arena_inscriptions a
 where a.codigo_ciego like 'QG-%';
-- Un QG- que una re-evaluación ya reemplazó solo sobrevive en la evaluación que se hizo con él: también queda reservado.
insert into public.codigos_ctc (codigo, tipo, entidad_id, vigente, nota)
select distinct on (e.uid_anonimo) e.uid_anonimo, 'ciego', a.id, false,
       'Código ciego QG- de una evaluación anterior (V6.23); asentado en el libro en la V6.24.'
  from public.lot_evaluations e
  left join public.arena_inscriptions a on a.lot_id = e.lot_id
 where e.uid_anonimo ~ '^QG-[0-9A-HJKMNP-TV-Z]{5}$'
 order by e.uid_anonimo, e.created_at
on conflict do nothing;

-- ── (3) Los asignadores ───────────────────────────────────────────────────────────────────────────────────────────────────
-- El código flotante. Sin inscripción (`p_inscripcion` null) el código se emite igual y queda en el libro como no vigente: nunca
-- vuelve a salir. Con inscripción, queda vigente y el que ella tenía pasa a no vigente, con este como reemplazo.
drop function public.ctc_codigo_ciego();
create function public.ctc_codigo_ciego(p_inscripcion uuid default null)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  -- Las 22 letras del alfabeto Crockford (sin I, L, O ni U). La MISMA cadena es `LETRAS_CIEGO` en src/lib/arena/codigoCiego.ts
  -- (lo vigila qa-codigos-ctc-check).
  letras constant text := 'ABCDEFGHJKMNPQRSTVWXYZ';
  v_letras text;
  v_codigo text;
  v_anterior text;
  v_intentos int := 0;
  i int;
begin
  -- El mismo candado que `ctc_codigo_productor`: los dos asignadores de 3 caracteres se turnan hasta el final de la transacción.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('codigos_ctc:tres_letras'));
  loop
    v_intentos := v_intentos + 1;
    if v_intentos > 2000 then
      raise exception 'ctc_codigo_ciego: 2000 intentos sin un código libre.';
    end if;
    v_letras := '';
    for i in 1..3 loop
      v_letras := v_letras || pg_catalog.substr(letras, 1 + pg_catalog.floor(pg_catalog.random() * 22)::int, 1);
    end loop;
    v_codigo := v_letras || pg_catalog.floor(pg_catalog.random() * 10)::int::text;
    -- Reservadas: FDA (el comienzo de la segunda puerta CTC-L-FDA6B795) y CTC.
    continue when v_letras = any (array['FDA', 'CTC']);
    -- Las letras de un productor, vigente o no.
    continue when exists (select 1 from public.codigos_ctc c where c.codigo = 'CTC-P-' || v_letras);
    -- Único para siempre.
    continue when exists (select 1 from public.codigos_ctc c where c.codigo = v_codigo);
    continue when exists (select 1 from public.arena_inscriptions a where a.codigo_ciego = v_codigo);
    -- Ningún vecino (un solo carácter distinto) de una muestra en juego, ni de un código que esta inscripción ya tuvo.
    continue when exists (
      select 1 from public.arena_inscriptions a
       where a.phase in ('postulacion', 'fila', 'sondeo')
         and a.codigo_ciego ~ '^[A-HJKMNP-TV-Z]{3}[0-9]$'
         and (pg_catalog.substr(a.codigo_ciego, 1, 1) <> pg_catalog.substr(v_codigo, 1, 1))::int
           + (pg_catalog.substr(a.codigo_ciego, 2, 1) <> pg_catalog.substr(v_codigo, 2, 1))::int
           + (pg_catalog.substr(a.codigo_ciego, 3, 1) <> pg_catalog.substr(v_codigo, 3, 1))::int
           + (pg_catalog.substr(a.codigo_ciego, 4, 1) <> pg_catalog.substr(v_codigo, 4, 1))::int <= 1);
    continue when p_inscripcion is not null and exists (
      select 1 from public.codigos_ctc c
       where c.tipo = 'ciego' and c.entidad_id = p_inscripcion
         and c.codigo ~ '^[A-HJKMNP-TV-Z]{3}[0-9]$'
         and (pg_catalog.substr(c.codigo, 1, 1) <> pg_catalog.substr(v_codigo, 1, 1))::int
           + (pg_catalog.substr(c.codigo, 2, 1) <> pg_catalog.substr(v_codigo, 2, 1))::int
           + (pg_catalog.substr(c.codigo, 3, 1) <> pg_catalog.substr(v_codigo, 3, 1))::int
           + (pg_catalog.substr(c.codigo, 4, 1) <> pg_catalog.substr(v_codigo, 4, 1))::int <= 1);
    exit;
  end loop;

  if p_inscripcion is not null then
    select c.codigo into v_anterior from public.codigos_ctc c
     where c.tipo = 'ciego' and c.entidad_id = p_inscripcion and c.vigente;
    if v_anterior is not null then
      update public.codigos_ctc set vigente = false where codigo = v_anterior;
    end if;
  end if;
  insert into public.codigos_ctc (codigo, tipo, entidad_id, vigente, nota)
    values (v_codigo, 'ciego', p_inscripcion, p_inscripcion is not null, 'Código ciego flotante de la cata (V6.24).');
  if v_anterior is not null then
    update public.codigos_ctc set reemplazado_por = v_codigo where codigo = v_anterior;
  end if;
  return v_codigo;
end;
$$;

-- El asignador de productores de la V6.23, con dos cambios: se turna con el de los códigos ciegos (el mismo candado) y no toma las
-- 3 letras de un código ciego ya emitido.
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
  select c.codigo into v_codigo from public.codigos_ctc c
   where c.tipo = 'productor' and c.entidad_id = p_productor and c.vigente;
  if v_codigo is not null then
    return v_codigo;
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('codigos_ctc:tres_letras'));
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
    -- V6.24: nunca las 3 letras de un código ciego ya emitido.
    continue when exists (select 1 from public.codigos_ctc c where c.tipo = 'ciego' and left(c.codigo, 3) = v_cuerpo);
    insert into public.codigos_ctc (codigo, tipo, entidad_id) values ('CTC-P-' || v_cuerpo, 'productor', p_productor)
      on conflict do nothing;
  end loop;
end;
$$;

-- El código ciego no lo elige quien escribe: al insertar sale uno nuevo; al actualizar se conserva, SALVO que se ponga a null a
-- propósito (la re-evaluación, `reevaluar` en el OCP): entonces sale uno fresco. V6.24: el asignador recibe la inscripción, para
-- asentar el código en el libro y retirar el anterior.
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
    new.codigo_ciego := public.ctc_codigo_ciego(new.id);
  end if;
  return new;
end;
$$;

revoke all on function public.ctc_codigo_ciego(uuid) from public, anon, authenticated;
revoke all on function public.ctc_codigo_productor(uuid) from public, anon, authenticated;
revoke all on function public.zz_arena_inscriptions_codigo_ciego() from public, anon, authenticated;

-- ── (4) El formato del código ciego ───────────────────────────────────────────────────────────────────────────────────────
alter table public.arena_inscriptions
  drop constraint arena_inscriptions_codigo_ciego_formato,
  add constraint arena_inscriptions_codigo_ciego_formato
    check (codigo_ciego ~ '^([A-HJKMNP-TV-Z]{3}[0-9]|QG-[0-9A-HJKMNP-TV-Z]{5}|CTC-L-[0-9A-F]{8})$');
comment on column public.arena_inscriptions.codigo_ciego is
  'V6.24 (TAR-149, punto 4): el código FLOTANTE de la cata, el que va en la bolsa y el único que ve el Q-Grader hasta que CTC '
  'confirma o devuelve su alta: 3 letras + 1 cifra al azar (sin las letras de un productor, ni FDA ni CTC), único para siempre '
  '(libro codigos_ctc, tipo ciego). Una re-evaluación recibe otro. Siguen valiendo el QG-XXXXX de la V6.23 y el CTC-L-XXXXXXXX que '
  'ya llevan impreso las bolsas de antes. Solo lo leen el servidor y el Centro: authenticated lee la tabla por columnas, sin esta.';

-- ── (4b) El código ciego no se lee con la sesión del productor ───────────────────────────────────────────────────────────
-- Hasta aquí `authenticated` y `anon` tenían SELECT sobre la tabla entera (lo de siempre en Supabase), y la política
-- `arena_inscriptions_select_own` deja a cada productor leer SUS filas. Desde aquí `authenticated` lee todas las columnas menos
-- `codigo_ciego`, y `anon` ninguna. Las escrituras no cambian (sin políticas de escritura: van por el service role).
-- Una columna NUEVA de esta tabla no la lee el productor hasta que su migración le dé `grant select (columna) ... to authenticated`.
revoke select on public.arena_inscriptions from anon, authenticated;
revoke select (codigo_ciego) on public.arena_inscriptions from public, anon, authenticated;
do $$
declare
  v_columnas text;
begin
  select pg_catalog.string_agg(pg_catalog.quote_ident(c.attname), ', ' order by c.attnum) into v_columnas
    from pg_catalog.pg_attribute c
   where c.attrelid = 'public.arena_inscriptions'::regclass and c.attnum > 0 and not c.attisdropped
     and c.attname <> 'codigo_ciego';
  execute pg_catalog.format('grant select (%s) on public.arena_inscriptions to authenticated', v_columnas);
  raise notice 'authenticated lee de arena_inscriptions (por columnas, sin codigo_ciego): %', v_columnas;
end $$;

-- El mismo código viaja a `lot_evaluations.uid_anonimo` con el alta (`evaluacionActions.ts`, y `nominadosActions.ts` al registrar a
-- mano), y la política `lot_evaluations_select_own_lot` deja al productor leer las evaluaciones de SUS lotes. Desde aquí
-- `authenticated` lee `lot_evaluations` por columnas, todas menos `uid_anonimo`, y `anon` ninguna. El reclamo de oficialización del
-- productor (política `lot_evaluations_insert_own_claim`) no cambia. Una columna NUEVA de esta tabla tampoco la lee el productor
-- hasta que su migración le dé `grant select (columna) ... to authenticated`.
revoke select on public.lot_evaluations from anon, authenticated;
revoke select (uid_anonimo) on public.lot_evaluations from public, anon, authenticated;
do $$
declare
  v_columnas text;
begin
  select pg_catalog.string_agg(pg_catalog.quote_ident(c.attname), ', ' order by c.attnum) into v_columnas
    from pg_catalog.pg_attribute c
   where c.attrelid = 'public.lot_evaluations'::regclass and c.attnum > 0 and not c.attisdropped
     and c.attname <> 'uid_anonimo';
  execute pg_catalog.format('grant select (%s) on public.lot_evaluations to authenticated', v_columnas);
  raise notice 'authenticated lee de lot_evaluations (por columnas, sin uid_anonimo): %', v_columnas;
end $$;
comment on column public.lot_evaluations.uid_anonimo is
  'V6.23/V6.24 (TAR-149): el código ciego de la cata con que se hizo esta evaluación (arena_inscriptions.codigo_ciego al dar el '
  'alta), nunca el código del lote. Es historia: no se reescribe. Solo lo leen el servidor y el Centro: authenticated lee la tabla '
  'por columnas, sin esta.';

-- ── (5) La regla del hueco ────────────────────────────────────────────────────────────────────────────────────────────────
-- `null` le pide al disparador un código flotante; el QG- queda en el libro, no vigente, con su reemplazo.
update public.arena_inscriptions a
   set codigo_ciego = null
  from _qg q
 where q.inscripcion_id = a.id
   and q.recodifica;

-- ── (6) Comprobaciones finales ────────────────────────────────────────────────────────────────────────────────────────────
do $$
begin
  if to_regprocedure('public.ctc_codigo_ciego()') is not null or to_regprocedure('public.ctc_codigo_ciego(uuid)') is null then
    raise exception 'ctc_codigo_ciego no quedó con su firma nueva (uuid). Se deshace todo.';
  end if;
  if pg_catalog.has_function_privilege('authenticated', 'public.ctc_codigo_ciego(uuid)', 'execute')
     or pg_catalog.has_function_privilege('anon', 'public.ctc_codigo_ciego(uuid)', 'execute')
     or pg_catalog.has_function_privilege('authenticated', 'public.ctc_codigo_productor(uuid)', 'execute') then
    raise exception 'Un asignador quedó al alcance de anon o authenticated. Se deshace todo.';
  end if;
  if exists (select 1 from public.arena_inscriptions
              where codigo_ciego is null
                 or codigo_ciego !~ '^([A-HJKMNP-TV-Z]{3}[0-9]|QG-[0-9A-HJKMNP-TV-Z]{5}|CTC-L-[0-9A-F]{8})$') then
    raise exception 'Quedó una inscripción sin código ciego o con uno fuera de formato. Se deshace todo.';
  end if;
  -- Todo QG- y todo flotante de una inscripción está en el libro, vigente y a su nombre.
  if exists (select 1 from public.arena_inscriptions a
              where a.codigo_ciego !~ '^CTC-L-'
                and not exists (select 1 from public.codigos_ctc c
                                 where c.codigo = a.codigo_ciego and c.tipo = 'ciego' and c.vigente and c.entidad_id = a.id)) then
    raise exception 'Un código ciego de una inscripción no quedó vigente en el libro. Se deshace todo.';
  end if;
  if exists (select 1 from public.codigos_ctc c
              where c.tipo = 'ciego' and c.vigente
                and not exists (select 1 from public.arena_inscriptions a where a.id = c.entidad_id and a.codigo_ciego = c.codigo)) then
    raise exception 'El libro tiene un código ciego vigente que no es el de su inscripción. Se deshace todo.';
  end if;
  -- Sin pistas: ningún trío de un código flotante es el de un productor, ni FDA ni CTC.
  if exists (select 1 from public.codigos_ctc c
              where c.tipo = 'ciego' and c.codigo ~ '^[A-HJKMNP-TV-Z]{3}[0-9]$'
                and (left(c.codigo, 3) in ('FDA', 'CTC')
                     or exists (select 1 from public.codigos_ctc p where p.codigo = 'CTC-P-' || left(c.codigo, 3)))) then
    raise exception 'Un código ciego lleva las letras de un productor, FDA o CTC. Se deshace todo.';
  end if;
  -- La regla del hueco: lo que debía recodificarse ya no lleva su QG-, y el QG- quedó en el libro con su reemplazo.
  if exists (select 1 from _qg q join public.arena_inscriptions a on a.id = q.inscripcion_id
              where q.recodifica and (a.codigo_ciego = q.codigo or a.codigo_ciego !~ '^[A-HJKMNP-TV-Z]{3}[0-9]$')) then
    raise exception 'Una inscripción del hueco no recibió su código flotante. Se deshace todo.';
  end if;
  if exists (select 1 from _qg q join public.codigos_ctc c on c.codigo = q.codigo
              where q.recodifica and (c.vigente or c.reemplazado_por is null)) then
    raise exception 'Un QG- recodificado no quedó en el libro con su reemplazo. Se deshace todo.';
  end if;
  if exists (select 1 from _qg q join public.arena_inscriptions a on a.id = q.inscripcion_id
              where not q.recodifica and a.codigo_ciego is distinct from q.codigo) then
    raise exception 'Una bolsa ya rotulada cambió de código. Se deshace todo.';
  end if;
  -- (4b) El código ciego no lo lee ni la sesión del productor ni la anónima; el productor conserva todas las demás columnas.
  -- Primero en `arena_inscriptions`.
  if pg_catalog.has_column_privilege('authenticated', 'public.arena_inscriptions', 'codigo_ciego', 'select')
     or pg_catalog.has_column_privilege('anon', 'public.arena_inscriptions', 'codigo_ciego', 'select')
     or pg_catalog.has_any_column_privilege('anon', 'public.arena_inscriptions', 'select') then
    raise exception 'El código ciego quedó legible con la sesión del productor o la anónima. Se deshace todo.';
  end if;
  if exists (select 1 from pg_catalog.pg_attribute c
              where c.attrelid = 'public.arena_inscriptions'::regclass and c.attnum > 0 and not c.attisdropped
                and c.attname <> 'codigo_ciego'
                and not pg_catalog.has_column_privilege('authenticated', 'public.arena_inscriptions', c.attname::text, 'select')) then
    raise exception 'El panel del productor perdió una columna de arena_inscriptions. Se deshace todo.';
  end if;
  -- (4b) Lo mismo en `lot_evaluations`, donde el alta copia el código de la cata (`uid_anonimo`).
  if pg_catalog.has_column_privilege('authenticated', 'public.lot_evaluations', 'uid_anonimo', 'select')
     or pg_catalog.has_column_privilege('anon', 'public.lot_evaluations', 'uid_anonimo', 'select')
     or pg_catalog.has_any_column_privilege('anon', 'public.lot_evaluations', 'select') then
    raise exception 'El código de la cata quedó legible en lot_evaluations con la sesión del productor o la anónima. Se deshace todo.';
  end if;
  if exists (select 1 from pg_catalog.pg_attribute c
              where c.attrelid = 'public.lot_evaluations'::regclass and c.attnum > 0 and not c.attisdropped
                and c.attname <> 'uid_anonimo'
                and not pg_catalog.has_column_privilege('authenticated', 'public.lot_evaluations', c.attname::text, 'select')) then
    raise exception 'El panel del productor perdió una columna de lot_evaluations. Se deshace todo.';
  end if;
  -- Las evaluaciones conservan el código con que se hicieron.
  if exists (select 1 from public.lot_evaluations e join _uid_antes u on u.id = e.id
              where e.uid_anonimo is distinct from u.uid_anonimo) then
    raise exception 'Cambió el uid_anonimo de una evaluación. Se deshace todo.';
  end if;
end $$;

commit;
