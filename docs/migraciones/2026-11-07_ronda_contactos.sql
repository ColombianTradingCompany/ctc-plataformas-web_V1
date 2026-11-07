-- 2026-11-07 · CTCx OS · el módulo «Rondas» (charter `ctcx-os`): la BITÁCORA de las rondas de contacto, `ronda_contactos`.
-- Migración ADITIVA (una tabla nueva, su guardia y su índice; no toca filas ni columnas que existan). **SIN APLICAR**: se escribió
-- en la rama `os/rondas` y la aplica el owner con `apply_migration` en su sesión, ANTES de encender el módulo (`os_modulos`).
-- Sin ella, `/os/m/rondas/<slug>` se pinta igual (la bitácora dice «sin registro») y «Registrar respuesta» no guarda nada: el
-- escritor (`src/app/ocp/(app)/rondasActions.ts`) comprueba la tabla antes de escribir.
--
-- Por qué una tabla nueva: lo que un productor contesta en una llamada no tiene dónde vivir hoy. `producer_comm_log` es el hilo que
-- VE el productor (su feed), no una bitácora interna; `audit_log` guarda el hecho pero no lo dicho (y el OS no lee sus notas). Y el
-- precio que pide el productor, los términos A/B y la venta anticipada son PROPUESTAS, no contratos (guardarraíl 8 del charter):
-- no caben en `lot_offers` ni en `purchase_contracts`, que nacen de CTCx y de la firma.
--
-- Qué hace:
--   1. `ronda_contactos`: UNA fila por contacto de una ronda con un productor. Quién la anotó (`registrado_por`) y cuándo
--      (`registrado_at`); cómo fue (`resultado`: alcanzado · no_contesta · volver_a_llamar, éste con su `volver_el`); la `nota`; lo
--      que dijo (`respuestas`: `{ "lotes": { "<lot_id>": { "<campo>": valor } }, "productor": { "<campo>": valor } }`, los campos
--      de la DEFINICIÓN de la ronda, `src/lib/os/rondas/definiciones.ts`) y lo que ya se escribió en su registro dueño
--      (`aplicadas`: `{ "<lot_id>.<campo>": "ok" | "<error>" }`, hoy solo la existencia por `registrarExistenciaOcp`).
--   2. Guardia: la fila es INMUTABLE (una bitácora no se reescribe: un error se corrige con un contacto nuevo). Se puede borrar
--      solo con el productor (ON DELETE CASCADE desde `profiles`, el borrado nuclear de un productor) o por el service role a mano.
--   3. RLS encendida SIN políticas y sin permisos para anon/authenticated: la leen y escriben solo el service role (la OS y el
--      escritor del OCP). El productor NO la ve.
--
-- Orden de uso: (A) pre-chequeos, solo lectura · (B) up · (C) post-chequeos, solo lectura · (D) down, solo para revertir (junto
-- con apagar el módulo: sin la tabla la ronda sigue pintándose, sin bitácora).


-- ═══ (A) Pre-chequeos · solo lectura ═══════════════════════════════════════════════════════════════════════════════════════════
-- Esperado: la tabla ausente · profiles presente.
select
  to_regclass('public.ronda_contactos') is null as ronda_contactos_ausente,
  to_regclass('public.profiles') is not null    as profiles_presente;


-- ═══ (B) up ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
-- Por `apply_migration` el texto corre como una transacción: se pasa SIN begin/commit.

create table public.ronda_contactos (
  id              uuid primary key default gen_random_uuid(),
  ronda           text not null check (ronda ~ '^[a-z0-9-]{2,60}$'),
  producer_id     uuid not null references public.profiles(id) on delete cascade,
  resultado       text not null check (resultado in ('alcanzado', 'no_contesta', 'volver_a_llamar')),
  volver_el       date,
  nota            text check (nota is null or char_length(nota) <= 1000),
  respuestas      jsonb not null default '{}'::jsonb check (jsonb_typeof(respuestas) = 'object'),
  aplicadas       jsonb not null default '{}'::jsonb check (jsonb_typeof(aplicadas) = 'object'),
  registrado_por  uuid not null references public.profiles(id),
  registrado_at   timestamptz not null default now(),
  constraint ronda_contactos_volver_con_fecha check (resultado <> 'volver_a_llamar' or volver_el is not null),
  constraint ronda_contactos_respuestas_solo_alcanzado check (resultado = 'alcanzado' or respuestas = '{}'::jsonb or respuestas = '{"lotes":{},"productor":{}}'::jsonb)
);

comment on table public.ronda_contactos is
  'CTCx OS · Rondas: una fila por contacto de una ronda con un productor (quién, cuándo, cómo fue, nota, lo dicho y lo aplicado). Inmutable. Service role únicamente.';

create index ronda_contactos_ronda_productor on public.ronda_contactos (ronda, producer_id, registrado_at desc);

alter table public.ronda_contactos enable row level security;
revoke all on public.ronda_contactos from anon, authenticated;

create or replace function public.ronda_contactos_inmutable()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'ronda_contactos es una bitácora: no se reescribe (anote un contacto nuevo)';
end;
$$;

create trigger ronda_contactos_inmutable_trg
  before update on public.ronda_contactos
  for each row execute function public.ronda_contactos_inmutable();


-- ═══ (C) Post-chequeos · solo lectura ═════════════════════════════════════════════════════════════════════════════════════════
-- Esperado: la tabla presente · RLS encendida · 0 políticas · el disparador de inmutabilidad · 0 filas.
select
  to_regclass('public.ronda_contactos') is not null                                                        as tabla,
  (select relrowsecurity from pg_class where oid = 'public.ronda_contactos'::regclass)                     as rls,
  (select count(*) from pg_policies where schemaname = 'public' and tablename = 'ronda_contactos')          as politicas,
  (select count(*) from pg_trigger where tgrelid = 'public.ronda_contactos'::regclass and not tgisinternal) as disparadores,
  (select count(*) from public.ronda_contactos)                                                            as filas;


-- ═══ (D) down · solo para revertir (apague antes el módulo en os_modulos) ═══════════════════════════════════════════════════════
-- drop trigger if exists ronda_contactos_inmutable_trg on public.ronda_contactos;
-- drop function if exists public.ronda_contactos_inmutable();
-- drop table if exists public.ronda_contactos;
