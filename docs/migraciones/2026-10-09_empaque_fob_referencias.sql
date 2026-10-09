-- ACTA · 2026-10-09 · V5.194 · migración `empaque_fob_referencias` (aplicada a `sjznkzvefqfcysczllli`)
--
-- Plan `docs/PLAN_TRIAGE_CATALOGO.md` §2.2 (tanda A). El owner, 2026-10-09: «ECP · Modelo de Producción → Empacado […] debe adaptarse
-- un poco mejor para ser una herramienta adecuada que permita calcular diferentes modos de empaque además de la paletización, el
-- transporte a puerto y los trámites para hacerlo FOB (remueve todo lo que tiene que ver con la amortización de la máquina y sus datos
-- de análisis)», y el Triage de Catálogo Activo «debe añadir una de las referencias de "ECP · Modelo de Producción → Empacado"».
--
-- Una REFERENCIA es un cálculo de Empacado hasta FOB con nombre: sus parámetros y su resultado quedan CONGELADOS (el triage la elige
-- y el precio de un lote se ancla en ella), y lo único que cambia después es que se RETIRA. Para otro cálculo, otra referencia.
-- Service-role-only (RLS sin políticas): la escriben las acciones del ECP (`src/lib/produccion/actions.ts`, nivel emite).
-- Nada se borra: la compuerta rechaza el DELETE.
--
-- La cotización vieja de la herramienta de sellado al vacío (`quotes.kind = 'empaque'`, una fila) se queda en `quotes` como historia;
-- ninguna pantalla la lee desde la V5.194. No toca ninguna otra fila.

create sequence if not exists public.empaque_fob_referencias_seq;

create table if not exists public.empaque_fob_referencias (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique default ('EF-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.empaque_fob_referencias_seq')::text, 3, '0')),
  nombre text not null check (length(nombre) between 3 and 120),
  modo text not null,
  destino text not null,
  kg_embarque numeric not null check (kg_embarque > 0),
  trm numeric not null check (trm > 0),
  parametros jsonb not null,
  resultado jsonb not null,
  cop_kg numeric not null check (cop_kg >= 0),
  usd_kg numeric not null check (usd_kg >= 0),
  estado text not null default 'vigente' check (estado in ('vigente', 'retirada')),
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  retirada_at timestamptz,
  retirada_por uuid references public.profiles(id) on delete set null,
  retirada_motivo text check (retirada_motivo is null or length(retirada_motivo) <= 300),
  constraint empaque_fob_referencias_retiro_check check (
    (estado = 'vigente' and retirada_at is null) or (estado = 'retirada' and retirada_at is not null)
  )
);
comment on table public.empaque_fob_referencias is 'V5.194 · Referencias de Empacado hasta FOB (ECP · Modelo de Producción): un cálculo con nombre, CONGELADO; solo se retira. Las elige el Triage de Catálogo Activo.';
create index if not exists empaque_fob_referencias_estado_idx on public.empaque_fob_referencias (estado, created_at desc);

alter table public.empaque_fob_referencias enable row level security;
-- (sin políticas: solo el service role)

create or replace function public.guard_empaque_fob_referencia()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Una referencia de Empacado hasta FOB no se borra: se retira.';
  end if;
  if new.codigo is distinct from old.codigo or new.nombre is distinct from old.nombre or new.modo is distinct from old.modo
     or new.destino is distinct from old.destino or new.kg_embarque is distinct from old.kg_embarque or new.trm is distinct from old.trm
     or new.parametros is distinct from old.parametros or new.resultado is distinct from old.resultado
     or new.cop_kg is distinct from old.cop_kg or new.usd_kg is distinct from old.usd_kg
     or new.created_at is distinct from old.created_at or new.created_by is distinct from old.created_by then
    raise exception 'Una referencia de Empacado hasta FOB queda congelada: solo se retira (para otro cálculo, guarde otra).';
  end if;
  if old.estado = 'retirada' and new.estado <> 'retirada' then
    raise exception 'Una referencia retirada no vuelve a estar vigente.';
  end if;
  return new;
end
$$;

drop trigger if exists trg_guard_empaque_fob_referencia on public.empaque_fob_referencias;
create trigger trg_guard_empaque_fob_referencia
  before update or delete on public.empaque_fob_referencias
  for each row execute function public.guard_empaque_fob_referencia();
