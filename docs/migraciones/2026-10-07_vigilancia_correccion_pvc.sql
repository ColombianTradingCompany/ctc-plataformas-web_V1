-- V5.178 · la vigilancia de la corrección del PVC (tanda 4 de los Ciclos · docs/PLAN_CICLOS.md §6). ADITIVA.
-- Cada día, después de leer el FNC, el sistema mide las lecturas del ciclo en curso contra el PVC vigente (y, en el ciclo 2, ya
-- publicado el siguiente, contra ese por separado: respuesta 1 = b). Si en 20 lecturas seguidas 15 cumplen (alza: FNC > PVC;
-- baja: FNC ≤ PVC / 1,2), PROPONE la corrección (tope ±10 %, redondeada a $1.000). Una por ciclo y por PVC: la clave única
-- (edition_code, ciclo) lo garantiza. Un responsable de CTCx la aprueba (se publica la edición corregida: aplica solo a los
-- contratos que se firmen después) o la rechaza; si nadie la resuelve antes de terminar el ciclo, vence.
-- `pvc_trigger_watch` y `pvc_cycles` (de `bcp_pvc_core`, el disparador «10 de 15» del PVC_BCP_PLAN §5.6) siguen vacías y
-- DORMIDAS: la regla nueva vive aquí.
-- Service-role only (RLS sin políticas), como las demás tablas del PVC.

create table if not exists public.pvc_correcciones (
  id uuid primary key default gen_random_uuid(),
  edition_code text not null,
  edition_id uuid not null references public.pvc_editions(id),
  relacion text not null check (relacion in ('vigente', 'siguiente')),
  ciclo text not null,
  ciclo_desde date not null,
  ciclo_hasta date not null,
  tipo text not null check (tipo in ('alza', 'baja')),
  bloque_desde date not null,
  bloque_hasta date not null,
  aciertos integer not null check (aciertos between 0 and 20),
  promedio numeric not null,
  monto integer not null check (monto >= 0),
  topado boolean not null default false,
  pvc_actual integer not null check (pvc_actual > 0),
  pvc_nuevo integer not null check (pvc_nuevo > 0),
  estado text not null default 'propuesta' check (estado in ('propuesta', 'aprobada', 'rechazada', 'vencida')),
  propuesta_at timestamptz not null default now(),
  resuelta_at timestamptz,
  resuelta_por uuid,
  nota text,
  edicion_corregida_id uuid references public.pvc_editions(id),
  aviso_enviado_at timestamptz,
  aviso_error text,
  constraint pvc_correcciones_una_por_ciclo unique (edition_code, ciclo)
);
alter table public.pvc_correcciones enable row level security;
create index if not exists pvc_correcciones_estado_idx on public.pvc_correcciones (estado, ciclo_hasta);
comment on table public.pvc_correcciones is
  'V5.178 · propuestas de corrección del PVC por ciclo (15 de 20 lecturas FNC; alza si FNC > PVC, baja si FNC ≤ PVC/1,2; tope ±10 %). Una por ciclo y por PVC. docs/PLAN_CICLOS.md §6.';
comment on table public.pvc_trigger_watch is 'DORMIDA desde la V5.178: el disparador «10 de 15» se reemplazó por pvc_correcciones (docs/PLAN_CICLOS.md §6).';
comment on table public.pvc_cycles is 'DORMIDA: nada la escribe; la vigilancia por ciclo vive en pvc_correcciones (V5.178) y el agente de la edición siguiente en pvc_editions.';
