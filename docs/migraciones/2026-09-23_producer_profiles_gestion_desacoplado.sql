-- V5.75 · Proveedor Desacoplado (owner, 2026-09-23). Migración `producer_profiles_gestion_desacoplado`.
-- Se aplica con `apply_migration` (patrón de la casa: DDL solo por ahí). Copia en el repo porque no hay
-- carpeta de migraciones: la fuente de verdad es la base; esto es el acta.
--
-- Una cuenta de productor que CTCx crea y lleva en nombre del dueño del café, sin buzón, hasta que se
-- le entrega. `gestion` la escribe SOLO el OCP (service role); el productor no puede tocarla ni al
-- insertar ni al actualizar — el guard que ya protegía `club_member_since` protege también estas tres.

alter table public.producer_profiles
  add column if not exists gestion text check (gestion in ('desacoplado', 'entregado')),
  add column if not exists gestion_desde timestamptz,
  add column if not exists entregado_at timestamptz;

comment on column public.producer_profiles.gestion is
  'null = cuenta propia del productor · desacoplado = la creó y la lleva CTCx sin buzón (Ruta Desacoplado) · entregado = ya se le asignó un correo real y se le entregó. Solo el OCP la escribe.';

create or replace function public.guard_producer_protected_columns()
 returns trigger
 language plpgsql
 set search_path to 'public'
as $function$
declare
  actor text := coalesce(auth.role(), 'postgres');
begin
  if actor in ('service_role', 'postgres', 'supabase_admin') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.club_member_since is not null then
      raise exception 'La membresía del Kaffetal Club solo puede otorgarla CTC.';
    end if;
    if new.gestion is not null or new.gestion_desde is not null or new.entregado_at is not null then
      raise exception 'La gestión de la cuenta (proveedor desacoplado) solo puede escribirla CTC.';
    end if;
    return new;
  end if;

  if new.club_member_since is distinct from old.club_member_since then
    raise exception 'La membresía del Kaffetal Club solo puede otorgarla CTC.';
  end if;
  if new.gestion is distinct from old.gestion
     or new.gestion_desde is distinct from old.gestion_desde
     or new.entregado_at is distinct from old.entregado_at then
    raise exception 'La gestión de la cuenta (proveedor desacoplado) solo puede escribirla CTC.';
  end if;

  return new;
end;
$function$;
