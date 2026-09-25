-- V5.89 · Gestión de Muestras según el owner (2026-09-25; diagramas en `reference/muestras-y-sample-kits-2026-09-25/`, fuera
-- del repo): las BODEGAS de muestras (decisión 1 del brief → opción C) y la partición real de los 2 kg.
-- Migración `bodegas_muestras`. Se aplicó con `apply_migration`; esta copia es el acta (la fuente de verdad es la base).
--
-- (1) `bodegas_muestras`: responsable, dirección, capacidad (en muestras de 1 kg) y estado; el owner quiere aquí, más adelante,
--     un módulo de administración de bodega con más información. La OCUPACIÓN no se guarda: se deriva de las muestras con saldo.
--     Cuatro sedes de arranque: Planta de Empaque Santillana (400, activa), Oficina CCB (100, activa), CIR Bucaramanga y Manuel
--     Specialty Roasters (capacidad pendiente, estado pendiente). `muestras.bodega_id` reemplaza al texto libre como ubicación
--     principal (`ubicacion` queda para el detalle: estante, caja).
-- (2) La partición de los 2 kg de CPS, tal como la dibujó el owner: 2 × 250 g «Evaluación Inicial Q-Grader» (fila
--     `evaluacion`, 500 g), 2 × 250 g «Contramuestras de Reserva CPS» (fila `contramuestra`, 500 g) y 1 kg «Muestra de Evaluación
--     CTCx» (fila `testeo`) que se TRILLA por completo: ~750 g de verde → ~500 g se tuestan (400 g de tostado para ensayos
--     piloto) + 250 g de verde al vacío. Tipos nuevos `verde_vacio` y `tostado_ensayo` (con `origen_muestra_id` = el kilo del
--     que salieron) y motivo nuevo `trilla_verde` (la salida del kilo CPS). Los kilos 500/500/1000 no cambian.
--     Los 2 kg son de uso EXCLUSIVO de CTCx (evaluación y ensayos): las muestras para compradores salen de Adquisición de Stock.
create table public.bodegas_muestras (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  responsable text,
  direccion text,
  capacidad_muestras integer check (capacidad_muestras is null or capacidad_muestras >= 0),
  estado text not null default 'activa' check (estado in ('activa', 'pendiente', 'inactiva')),
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);
alter table public.bodegas_muestras enable row level security;
comment on table public.bodegas_muestras is 'V5.89 · Las bodegas de muestras de la casa (owner, 2026-09-25): responsable, dirección, capacidad en muestras de 1 kg, estado. La ocupación se deriva de las muestras con saldo.';

insert into public.bodegas_muestras (nombre, responsable, direccion, capacidad_muestras, estado) values
  ('CTCx Planta de Empaque Santillana', 'GVB', 'Carrera 4 #8N-30, Vía Guatiguará, Piedecuesta, Santander', 400, 'activa'),
  ('CTCx Oficina CCB', 'GVB', 'Cra. 19 #36-20, Bolívar, Bucaramanga, Santander', 100, 'activa'),
  ('CIR Bucaramanga', null, 'Calle 17 con carrera 14, Bucaramanga, Santander', null, 'pendiente'),
  ('Manuel Specialty Roasters', null, 'Carrera 1 # 32-32, San Gil, Santander', null, 'pendiente');

alter table public.muestras add column bodega_id uuid references public.bodegas_muestras(id) on delete set null;
create index muestras_bodega_idx on public.muestras (bodega_id);
alter table public.muestras add column origen_muestra_id uuid references public.muestras(id) on delete set null;

alter table public.muestras drop constraint muestras_tipo_check;
alter table public.muestras add constraint muestras_tipo_check check (tipo in ('evaluacion', 'contramuestra', 'testeo', 'comprador', 'verde_vacio', 'tostado_ensayo'));
alter table public.muestra_movimientos drop constraint muestra_movimientos_motivo_check;
alter table public.muestra_movimientos add constraint muestra_movimientos_motivo_check check (motivo in ('analisis_fisico', 'cata', 'a_centro', 'a_comprador', 'revision_almacenaje', 'descarte', 'trilla_verde'));
