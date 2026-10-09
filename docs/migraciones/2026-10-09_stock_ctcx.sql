-- ACTA · 2026-10-09 · V5.195 · migración `stock_ctcx` (aplicada a `sjznkzvefqfcysczllli`)
--
-- Plan `docs/PLAN_TRIAGE_CATALOGO.md` §2.1 y §4 (tanda B). El owner, 2026-10-09: «El Stock CTCx (que absorberá Stock de Sample
-- kits) = el café que físicamente llega a CTCx bien sea en cantidades grandes, por CTCx Selection o los sacos de 70 kg (excepto
-- las muestras, que siguen en Gestión de Muestras). Este debe poder moverse de estado "Pergamino", "Verde", "Tostado" y
-- "Empacado" […] las cantidades deben sumar al final lo mismo en equivalente del estado más primordial entre mermas de humedad,
-- residuos y pérdidas».
--
-- (1) `stock_partidas` (SX-AAAA-NNNN): una cantidad de café en UN estado, con su lote, sus kg, su costo por kg, a cuántos kg del
--     estado de su raíz EQUIVALE cada kg, y su ubicación. Nace RAÍZ (al recibir un despacho, al registrar una compra o a mano) o
--     HIJA de una transformación. Sus kg y su estado no cambian; los de una raíz SIN movimientos se corrigen cuando su compra cambia.
-- (2) `stock_transformaciones` (TR-AAAA-NNNN): trilla (pergamino → verde), tostión (verde → tostado), empaque (pergamino, verde o
--     tostado → empacado). Una madre, una o varias hijas; los kg que entran = hijas + merma de humedad + residuos + pérdidas
--     (± 0,01 kg). Las hijas absorben el costo de lo que entró más el de la operación, por kg de lo que salió; su equivalencia
--     carga la humedad y los residuos (las pérdidas quedan aparte, a la equivalencia de la madre).
-- (3) `stock_salidas`: kit (la escribe sola el envío del kit), venta, consumo, ajuste — con motivo. Nada se borra: se anula.
-- (4) `stock_disponible(partida)` = kg − lo que entró a transformaciones − salidas − lo reservado en kits armados − lo asignado a
--     mezclas de su compra. Derivado, nunca guardado. `stock_raiz`, `stock_transformar` y `stock_anular_transformacion` son
--     atómicas; las compuertas repiten lo esencial.
-- (5) Los Sample Kits se arman con PARTIDAS (`sample_kit_items.partida_id`; `kg` en el estado de la partida: verde para CP y Plus,
--     pergamino para Max, o empacado con ese contenido); al ENVIARSE el kit sus ítems salen del stock; al ANULAR un kit enviado esas
--     salidas se anulan. `compra_id` y `kg_cps` dejan de ser obligatorios (quedan para los ítems de la V5.90: ninguno hoy).
-- (6) `compras.destino`: 'sample_kits' pasa a 'stock' (0 filas el 2026-10-09). Una compra es de CTCx Selection (la vitrina enseña el
--     perfil de CTCx) o solo stock. `public_lot_catalog.ctc_selection` cuenta SOLO las compras de Selection: un saco recibido por
--     un trato por ventanas ya no oculta la finca.
-- (7) El borrado nuclear de un lote con partidas en el Stock CTCx se bloquea (sexto bloqueo de `_nuclear_recoger`).
--
-- Service-role-only (RLS sin políticas), como el resto del circuito. Ninguna fila existente cambia de valor salvo (6), que no
-- tiene filas.

-- ── (6) compras.destino ──────────────────────────────────────────────────────────────────────────────────────────────────────
alter table public.compras drop constraint if exists compras_destino_check;
update public.compras set destino = 'stock' where destino = 'sample_kits';
alter table public.compras add constraint compras_destino_check check (destino in ('selection', 'stock'));
comment on column public.compras.destino is 'V5.195 · selection = compra de CTCx Selection (la vitrina enseña el perfil de CTCx, no la finca); stock = solo Stock CTCx (V5.90–V5.194 se llamaba sample_kits).';

-- ── (1)–(3) las tablas ───────────────────────────────────────────────────────────────────────────────────────────────────────
create sequence if not exists public.stock_partidas_seq;
create sequence if not exists public.stock_transformaciones_seq;

create table if not exists public.stock_partidas (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique default ('SX-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.stock_partidas_seq')::text, 4, '0')),
  lot_id uuid references public.lots(id) on delete restrict,
  origen_texto text check (origen_texto is null or length(origen_texto) <= 200),
  estado text not null check (estado in ('pergamino', 'verde', 'tostado', 'empacado')),
  contenido text not null check (contenido in ('pergamino', 'verde', 'tostado')),
  kg numeric not null check (kg > 0),
  costo_cop_kg numeric not null default 0 check (costo_cop_kg >= 0),
  equivalencia numeric not null default 1 check (equivalencia > 0),
  raiz_id uuid not null references public.stock_partidas(id) on delete restrict,
  madre_transformacion_id uuid,
  origen text not null check (origen in ('despacho', 'compra', 'manual', 'transformacion')),
  despacho_id uuid unique references public.contract_despachos(id) on delete restrict,
  compra_id uuid unique references public.compras(id) on delete restrict,
  comprometido boolean not null default false,
  ubicacion text check (ubicacion is null or length(ubicacion) <= 200),
  presentacion text check (presentacion is null or length(presentacion) <= 120),
  nota text check (nota is null or length(nota) <= 500),
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  anulada_at timestamptz,
  anulada_por uuid references public.profiles(id) on delete set null,
  anulada_motivo text check (anulada_motivo is null or length(anulada_motivo) <= 300),
  constraint stock_partidas_empacado_check check (estado = 'empacado' or contenido = estado),
  constraint stock_partidas_vinculo_check check (
    (origen = 'transformacion' and madre_transformacion_id is not null and despacho_id is null and compra_id is null)
    or (origen = 'despacho' and madre_transformacion_id is null and despacho_id is not null)
    or (origen = 'compra' and madre_transformacion_id is null and despacho_id is null and compra_id is not null)
    or (origen = 'manual' and madre_transformacion_id is null and despacho_id is null and compra_id is null)
  ),
  constraint stock_partidas_raiz_check check ((madre_transformacion_id is null) = (raiz_id = id)),
  constraint stock_partidas_lote_check check (lot_id is not null or origen_texto is not null),
  constraint stock_partidas_anulada_check check ((anulada_at is null) = (anulada_motivo is null))
);
comment on table public.stock_partidas is 'V5.195 · Stock CTCx: una cantidad de café en UN estado (pergamino · verde · tostado · empacado). Raíz o hija de una transformación; nada se borra.';

create table if not exists public.stock_transformaciones (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique default ('TR-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.stock_transformaciones_seq')::text, 4, '0')),
  tipo text not null check (tipo in ('trilla', 'tostion', 'empaque')),
  madre_id uuid not null references public.stock_partidas(id) on delete restrict,
  kg_entrada numeric not null check (kg_entrada > 0),
  merma_humedad_kg numeric not null default 0 check (merma_humedad_kg >= 0),
  residuos_kg numeric not null default 0 check (residuos_kg >= 0),
  perdidas_kg numeric not null default 0 check (perdidas_kg >= 0),
  costo_operacion_cop numeric not null default 0 check (costo_operacion_cop >= 0),
  fecha date not null default current_date,
  nota text check (nota is null or length(nota) <= 500),
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  anulada_at timestamptz,
  anulada_por uuid references public.profiles(id) on delete set null,
  anulada_motivo text check (anulada_motivo is null or length(anulada_motivo) <= 300),
  constraint stock_transformaciones_anulada_check check ((anulada_at is null) = (anulada_motivo is null))
);
comment on table public.stock_transformaciones is 'V5.195 · trilla · tostión · empaque: una madre, una o varias hijas; entra = hijas + humedad + residuos + pérdidas (± 0,01 kg). Se anula, no se borra.';

alter table public.stock_partidas drop constraint if exists stock_partidas_madre_fkey;
alter table public.stock_partidas add constraint stock_partidas_madre_fkey foreign key (madre_transformacion_id) references public.stock_transformaciones(id) on delete restrict;

create table if not exists public.stock_salidas (
  id uuid primary key default gen_random_uuid(),
  partida_id uuid not null references public.stock_partidas(id) on delete restrict,
  tipo text not null check (tipo in ('kit', 'venta', 'consumo', 'ajuste')),
  kg numeric not null check (kg > 0),
  kit_id uuid references public.sample_kits(id) on delete restrict,
  motivo text not null check (length(motivo) between 3 and 300),
  fecha date not null default current_date,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  anulada_at timestamptz,
  anulada_por uuid references public.profiles(id) on delete set null,
  anulada_motivo text check (anulada_motivo is null or length(anulada_motivo) <= 300),
  constraint stock_salidas_kit_check check ((tipo = 'kit') = (kit_id is not null)),
  constraint stock_salidas_anulada_check check ((anulada_at is null) = (anulada_motivo is null))
);
comment on table public.stock_salidas is 'V5.195 · lo que sale del Stock CTCx: kit (sola, al enviarse el kit), venta, consumo, ajuste. Se anula, no se borra.';

create index if not exists stock_partidas_lot_idx on public.stock_partidas (lot_id);
create index if not exists stock_partidas_raiz_idx on public.stock_partidas (raiz_id);
create index if not exists stock_partidas_madre_idx on public.stock_partidas (madre_transformacion_id);
create index if not exists stock_transformaciones_madre_idx on public.stock_transformaciones (madre_id);
create index if not exists stock_salidas_partida_idx on public.stock_salidas (partida_id);
create index if not exists stock_salidas_kit_idx on public.stock_salidas (kit_id);

alter table public.stock_partidas enable row level security;
alter table public.stock_transformaciones enable row level security;
alter table public.stock_salidas enable row level security;
-- (sin políticas: solo el service role)

-- ── (5) los Sample Kits sobre partidas (antes de las funciones que los leen) ─────────────────────────────────────────────────
alter table public.sample_kit_items add column if not exists partida_id uuid references public.stock_partidas(id) on delete restrict;
alter table public.sample_kit_items add column if not exists kg numeric check (kg is null or kg > 0);
alter table public.sample_kit_items alter column compra_id drop not null;
alter table public.sample_kit_items alter column kg_cps drop not null;
alter table public.sample_kit_items drop constraint if exists sample_kit_items_fuente_check;
alter table public.sample_kit_items add constraint sample_kit_items_fuente_check check ((partida_id is not null and kg is not null) or (compra_id is not null and kg_cps is not null));
alter table public.sample_kit_items drop constraint if exists sample_kit_items_kit_id_partida_id_key;
alter table public.sample_kit_items add constraint sample_kit_items_kit_id_partida_id_key unique (kit_id, partida_id);
create index if not exists sample_kit_items_partida_idx on public.sample_kit_items (partida_id);
comment on column public.sample_kit_items.partida_id is 'V5.195 · la partida del Stock CTCx de la que sale el ítem; kg en el estado de la partida. compra_id y kg_cps quedan para los ítems de la V5.90 (ninguno el 2026-10-09).';

-- ── (4) lo derivado ──────────────────────────────────────────────────────────────────────────────────────────────────────────
create or replace function public.stock_disponible(p_partida uuid)
returns numeric
language sql
stable
set search_path = public, pg_temp
as $$
  select case when p.anulada_at is not null then 0::numeric else
    p.kg
    - coalesce((select sum(t.kg_entrada) from public.stock_transformaciones t where t.madre_id = p.id and t.anulada_at is null), 0)
    - coalesce((select sum(s.kg) from public.stock_salidas s where s.partida_id = p.id and s.anulada_at is null), 0)
    - coalesce((select sum(i.kg) from public.sample_kit_items i join public.sample_kits k on k.id = i.kit_id
                 where i.partida_id = p.id and k.status = 'armado'), 0)
    - case when p.compra_id is null then 0::numeric else
        coalesce((select sum(mc.kg) from public.mezcla_componentes mc join public.mezclas m on m.id = mc.mezcla_id
                   where mc.compra_id = p.compra_id and m.status <> 'anulada'), 0) end
  end
  from public.stock_partidas p
  where p.id = p_partida
$$;

create or replace function public.stock_tiene_movimientos(p_partida uuid)
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select exists (select 1 from public.stock_transformaciones t where t.madre_id = p_partida and t.anulada_at is null)
      or exists (select 1 from public.stock_salidas s where s.partida_id = p_partida and s.anulada_at is null)
      or exists (select 1 from public.sample_kit_items i join public.sample_kits k on k.id = i.kit_id
                  where i.partida_id = p_partida and k.status <> 'anulado')
$$;

-- ── las compuertas ───────────────────────────────────────────────────────────────────────────────────────────────────────────
create or replace function public.guard_stock_partida()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Una partida del Stock CTCx no se borra: se anula.';
  end if;
  if new.id is distinct from old.id or new.codigo is distinct from old.codigo or new.lot_id is distinct from old.lot_id
     or new.origen_texto is distinct from old.origen_texto or new.estado is distinct from old.estado
     or new.contenido is distinct from old.contenido or new.raiz_id is distinct from old.raiz_id
     or new.madre_transformacion_id is distinct from old.madre_transformacion_id or new.origen is distinct from old.origen
     or new.despacho_id is distinct from old.despacho_id or new.compra_id is distinct from old.compra_id
     or new.comprometido is distinct from old.comprometido or new.equivalencia is distinct from old.equivalencia
     or new.created_at is distinct from old.created_at or new.created_by is distinct from old.created_by then
    raise exception 'De una partida solo cambian su ubicación, su presentación y su nota (y los kg o el costo de una raíz sin movimientos).';
  end if;
  if new.kg is distinct from old.kg or new.costo_cop_kg is distinct from old.costo_cop_kg then
    if old.madre_transformacion_id is not null or old.anulada_at is not null or public.stock_tiene_movimientos(old.id) then
      raise exception 'Los kg y el costo de una partida no cambian después de moverse (solo los de una raíz sin movimientos).';
    end if;
  end if;
  if old.anulada_at is not null and (new.anulada_at is distinct from old.anulada_at or new.anulada_motivo is distinct from old.anulada_motivo
     or new.anulada_por is distinct from old.anulada_por) then
    raise exception 'Una partida anulada no vuelve.';
  end if;
  if old.anulada_at is null and new.anulada_at is not null and public.stock_tiene_movimientos(old.id) then
    raise exception 'Una partida con movimientos no se anula: anule primero lo que salió de ella.';
  end if;
  return new;
end
$$;
drop trigger if exists trg_guard_stock_partida on public.stock_partidas;
create trigger trg_guard_stock_partida before update or delete on public.stock_partidas
  for each row execute function public.guard_stock_partida();

create or replace function public.guard_stock_transformacion()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Una transformación del Stock CTCx no se borra: se anula.';
  end if;
  if (to_jsonb(new) - 'anulada_at' - 'anulada_por' - 'anulada_motivo') is distinct from (to_jsonb(old) - 'anulada_at' - 'anulada_por' - 'anulada_motivo') then
    raise exception 'Una transformación queda como se registró: solo se anula.';
  end if;
  if old.anulada_at is not null then
    raise exception 'Una transformación anulada no vuelve.';
  end if;
  return new;
end
$$;
drop trigger if exists trg_guard_stock_transformacion on public.stock_transformaciones;
create trigger trg_guard_stock_transformacion before update or delete on public.stock_transformaciones
  for each row execute function public.guard_stock_transformacion();

create or replace function public.guard_stock_salida()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_anulada timestamptz;
  v_disp numeric;
begin
  if tg_op = 'DELETE' then
    raise exception 'Una salida del Stock CTCx no se borra: se anula.';
  end if;
  if tg_op = 'UPDATE' then
    if (to_jsonb(new) - 'anulada_at' - 'anulada_por' - 'anulada_motivo') is distinct from (to_jsonb(old) - 'anulada_at' - 'anulada_por' - 'anulada_motivo') then
      raise exception 'Una salida queda como se registró: solo se anula.';
    end if;
    if old.anulada_at is not null then
      raise exception 'Una salida anulada no vuelve.';
    end if;
    return new;
  end if;
  select anulada_at into v_anulada from public.stock_partidas where id = new.partida_id for update;
  if not found or v_anulada is not null then
    raise exception 'Esa partida no existe o está anulada.';
  end if;
  -- La salida de un kit convierte su reserva en salida (la escribe `stock_kit_estado` al enviarse el kit): ya estaba contada.
  if new.tipo = 'kit' then
    return new;
  end if;
  v_disp := coalesce(public.stock_disponible(new.partida_id), 0);
  if new.kg > v_disp + 0.0005 then
    raise exception 'De esa partida quedan % kg disponibles.', round(v_disp, 3);
  end if;
  return new;
end
$$;
drop trigger if exists trg_guard_stock_salida on public.stock_salidas;
create trigger trg_guard_stock_salida before insert or update or delete on public.stock_salidas
  for each row execute function public.guard_stock_salida();

-- La compuerta del stock de los kits, reescrita sobre partidas (V5.90: sobre compras con destino sample_kits).
create or replace function public.guard_sample_kit_stock()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  p record;
  v_tipo text;
  v_requerido text;
  v_disp numeric;
begin
  if new.partida_id is null then
    raise exception 'Desde la V5.195 un Sample Kit se arma con partidas del Stock CTCx.';
  end if;
  select * into p from public.stock_partidas where id = new.partida_id for update;
  if not found or p.anulada_at is not null then
    raise exception 'Esa partida no existe o está anulada.';
  end if;
  if p.comprometido then
    raise exception 'Esa partida está comprometida (vendida a nombre del productor): no surte kits.';
  end if;
  if p.lot_id is null then
    raise exception 'Un Sample Kit lleva lotes: esa partida no tiene lote.';
  end if;
  select tipo into v_tipo from public.sample_kits where id = new.kit_id;
  v_requerido := case when v_tipo = 'max' then 'pergamino' else 'verde' end;
  if p.contenido <> v_requerido then
    raise exception 'Este kit lleva café %: esa partida es % (%).', v_requerido, p.estado, p.contenido;
  end if;
  v_disp := coalesce(public.stock_disponible(new.partida_id), 0)
            + case when tg_op = 'UPDATE' and old.partida_id = new.partida_id then coalesce(old.kg, 0) else 0 end;
  if new.kg > v_disp + 0.0005 then
    raise exception 'Ese kit asigna más kilos de los que quedan de la partida (% kg).', round(v_disp, 3);
  end if;
  return new;
end
$$;

-- Al enviarse un kit, sus ítems SALEN del stock; al anular un kit enviado, esas salidas se anulan (los kilos vuelven).
create or replace function public.stock_kit_estado()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if old.status = 'armado' and new.status = 'enviado' then
    insert into public.stock_salidas (partida_id, tipo, kg, kit_id, motivo, fecha)
    select i.partida_id, 'kit', i.kg, new.id, 'Sample Kit ' || new.codigo, (coalesce(new.enviado_at, now()) at time zone 'America/Bogota')::date
      from public.sample_kit_items i
     where i.kit_id = new.id and i.partida_id is not null;
  elsif old.status = 'enviado' and new.status = 'anulado' then
    update public.stock_salidas
       set anulada_at = now(), anulada_motivo = left('Kit anulado: ' || coalesce(nullif(btrim(new.anulado_motivo), ''), 'sin motivo'), 300)
     where kit_id = new.id and anulada_at is null;
  end if;
  return new;
end
$$;
drop trigger if exists trg_stock_kit_estado on public.sample_kits;
create trigger trg_stock_kit_estado after update of status on public.sample_kits
  for each row execute function public.stock_kit_estado();

-- ── las operaciones atómicas ─────────────────────────────────────────────────────────────────────────────────────────────────
-- Una RAÍZ: idempotente por compra o por despacho (una compra o un despacho tienen UNA raíz). Si ya existe y no se ha movido, se
-- corrigen sus kg y su costo (la compra de un mes se vuelve a registrar); si se movió, queda como está.
create or replace function public.stock_raiz(
  p_lot uuid,
  p_estado text,
  p_contenido text,
  p_kg numeric,
  p_costo_cop_kg numeric,
  p_origen text,
  p_despacho uuid default null,
  p_compra uuid default null,
  p_comprometido boolean default false,
  p_ubicacion text default null,
  p_presentacion text default null,
  p_nota text default null,
  p_origen_texto text default null,
  p_por uuid default null
)
returns uuid
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
  v record;
begin
  if p_origen not in ('despacho', 'compra', 'manual') then
    raise exception 'Una raíz nace de un despacho, de una compra o de un ingreso a mano.';
  end if;
  if not (p_kg > 0) then
    raise exception 'Una partida lleva kg.';
  end if;
  if p_compra is not null or p_despacho is not null then
    select * into v from public.stock_partidas
     where (p_compra is not null and compra_id = p_compra) or (p_despacho is not null and despacho_id = p_despacho)
     limit 1
     for update;
    if found then
      if v.anulada_at is null and not public.stock_tiene_movimientos(v.id)
         and (v.kg is distinct from p_kg or v.costo_cop_kg is distinct from coalesce(p_costo_cop_kg, 0)) then
        update public.stock_partidas set kg = p_kg, costo_cop_kg = coalesce(p_costo_cop_kg, 0) where id = v.id;
      end if;
      return v.id;
    end if;
  end if;
  v_id := gen_random_uuid();
  insert into public.stock_partidas (id, lot_id, origen_texto, estado, contenido, kg, costo_cop_kg, equivalencia, raiz_id, origen,
                                     despacho_id, compra_id, comprometido, ubicacion, presentacion, nota, created_by)
  values (v_id, p_lot, nullif(btrim(coalesce(p_origen_texto, '')), ''), p_estado, coalesce(p_contenido, p_estado), p_kg,
          coalesce(p_costo_cop_kg, 0), 1, v_id, p_origen, p_despacho, p_compra, coalesce(p_comprometido, false),
          nullif(btrim(coalesce(p_ubicacion, '')), ''), nullif(btrim(coalesce(p_presentacion, '')), ''), nullif(btrim(coalesce(p_nota, '')), ''), p_por);
  return v_id;
end
$$;

-- Una TRANSFORMACIÓN: valida la transición, el disponible de la madre y el cuadre; reparte el costo y la equivalencia.
create or replace function public.stock_transformar(
  p_madre uuid,
  p_tipo text,
  p_kg_entrada numeric,
  p_hijas jsonb,
  p_humedad numeric default 0,
  p_residuos numeric default 0,
  p_perdidas numeric default 0,
  p_costo numeric default 0,
  p_fecha date default null,
  p_nota text default null,
  p_por uuid default null
)
returns uuid
language plpgsql
set search_path = public, pg_temp
as $$
declare
  m record;
  h jsonb;
  v_hacia text;
  v_contenido text;
  v_disp numeric;
  v_suma numeric := 0;
  v_kg numeric;
  v_h numeric := coalesce(p_humedad, 0);
  v_r numeric := coalesce(p_residuos, 0);
  v_p numeric := coalesce(p_perdidas, 0);
  v_c numeric := coalesce(p_costo, 0);
  v_tx uuid;
  v_costo_hija numeric;
  v_eq numeric;
begin
  select * into m from public.stock_partidas where id = p_madre for update;
  if not found or m.anulada_at is not null then
    raise exception 'La partida no existe o está anulada.';
  end if;
  if p_tipo = 'trilla' then
    if m.estado <> 'pergamino' then raise exception 'Se trilla el pergamino (esta partida es %).', m.estado; end if;
    v_hacia := 'verde';
  elsif p_tipo = 'tostion' then
    if m.estado <> 'verde' then raise exception 'Se tuesta el verde (esta partida es %).', m.estado; end if;
    v_hacia := 'tostado';
  elsif p_tipo = 'empaque' then
    if m.estado = 'empacado' then raise exception 'Lo empacado ya está empacado.'; end if;
    v_hacia := 'empacado';
  else
    raise exception 'Transformación desconocida: %.', p_tipo;
  end if;
  if not (p_kg_entrada > 0) then
    raise exception 'Escriba los kg que entran.';
  end if;
  if v_h < 0 or v_r < 0 or v_p < 0 or v_c < 0 then
    raise exception 'Las mermas, los residuos, las pérdidas y el costo no son negativos.';
  end if;
  v_disp := coalesce(public.stock_disponible(p_madre), 0);
  if p_kg_entrada > v_disp + 0.0005 then
    raise exception 'De esa partida quedan % kg disponibles.', round(v_disp, 3);
  end if;
  if jsonb_typeof(p_hijas) is distinct from 'array' or jsonb_array_length(p_hijas) = 0 then
    raise exception 'Una transformación deja al menos una partida.';
  end if;
  for h in select * from jsonb_array_elements(p_hijas) loop
    v_kg := nullif(h->>'kg', '')::numeric;
    if v_kg is null or not (v_kg > 0) then
      raise exception 'Cada partida que sale lleva sus kg.';
    end if;
    v_suma := v_suma + v_kg;
  end loop;
  if abs(p_kg_entrada - (v_suma + v_h + v_r + v_p)) > 0.01 then
    raise exception 'No cuadra: entran % kg y salen % kg (partidas %, humedad %, residuos %, pérdidas %).',
      p_kg_entrada, v_suma + v_h + v_r + v_p, v_suma, v_h, v_r, v_p;
  end if;

  insert into public.stock_transformaciones (tipo, madre_id, kg_entrada, merma_humedad_kg, residuos_kg, perdidas_kg, costo_operacion_cop, fecha, nota, created_by)
  values (p_tipo, p_madre, p_kg_entrada, v_h, v_r, v_p, v_c, coalesce(p_fecha, (now() at time zone 'America/Bogota')::date), nullif(btrim(coalesce(p_nota, '')), ''), p_por)
  returning id into v_tx;

  -- Lo que entró (a su costo) más la operación, repartido por kg de lo que salió; la humedad y los residuos no tienen valor.
  v_costo_hija := (p_kg_entrada * m.costo_cop_kg + v_c) / v_suma;
  -- Cada kg de hija equivale a (lo que entró − las pérdidas) ÷ lo que salió, en kg de la madre.
  v_eq := m.equivalencia * (p_kg_entrada - v_p) / v_suma;
  v_contenido := case when v_hacia = 'empacado' then m.contenido else v_hacia end;

  for h in select * from jsonb_array_elements(p_hijas) loop
    insert into public.stock_partidas (lot_id, origen_texto, estado, contenido, kg, costo_cop_kg, equivalencia, raiz_id, madre_transformacion_id,
                                       origen, comprometido, ubicacion, presentacion, nota, created_by)
    values (m.lot_id, m.origen_texto, v_hacia, v_contenido, (h->>'kg')::numeric, round(v_costo_hija, 4), round(v_eq, 6), m.raiz_id, v_tx,
            'transformacion', m.comprometido, coalesce(nullif(btrim(coalesce(h->>'ubicacion', '')), ''), m.ubicacion),
            nullif(btrim(coalesce(h->>'presentacion', '')), ''), nullif(btrim(coalesce(h->>'nota', '')), ''), p_por);
  end loop;
  return v_tx;
end
$$;

-- ANULAR una transformación: solo si ninguna de sus hijas se movió. Las hijas quedan anuladas y la madre recupera lo que entró.
create or replace function public.stock_anular_transformacion(p_tx uuid, p_motivo text, p_por uuid default null)
returns void
language plpgsql
set search_path = public, pg_temp
as $$
declare
  t record;
  h record;
begin
  if coalesce(btrim(p_motivo), '') = '' then
    raise exception 'Anular lleva motivo.';
  end if;
  select * into t from public.stock_transformaciones where id = p_tx for update;
  if not found then
    raise exception 'Transformación no encontrada.';
  end if;
  if t.anulada_at is not null then
    raise exception 'Ya estaba anulada.';
  end if;
  for h in select id, codigo from public.stock_partidas where madre_transformacion_id = p_tx and anulada_at is null for update loop
    if public.stock_tiene_movimientos(h.id) then
      raise exception 'La partida % ya se movió (se transformó, salió o está en un kit): anule primero eso.', h.codigo;
    end if;
  end loop;
  update public.stock_partidas
     set anulada_at = now(), anulada_por = p_por, anulada_motivo = left('Transformación anulada: ' || btrim(p_motivo), 300)
   where madre_transformacion_id = p_tx and anulada_at is null;
  update public.stock_transformaciones
     set anulada_at = now(), anulada_por = p_por, anulada_motivo = left(btrim(p_motivo), 300)
   where id = p_tx;
end
$$;

revoke all on function public.stock_disponible(uuid) from public, anon, authenticated;
revoke all on function public.stock_tiene_movimientos(uuid) from public, anon, authenticated;
revoke all on function public.stock_raiz(uuid, text, text, numeric, numeric, text, uuid, uuid, boolean, text, text, text, text, uuid) from public, anon, authenticated;
revoke all on function public.stock_transformar(uuid, text, numeric, jsonb, numeric, numeric, numeric, numeric, date, text, uuid) from public, anon, authenticated;
revoke all on function public.stock_anular_transformacion(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.stock_disponible(uuid) to service_role;
grant execute on function public.stock_tiene_movimientos(uuid) to service_role;
grant execute on function public.stock_raiz(uuid, text, text, numeric, numeric, text, uuid, uuid, boolean, text, text, text, text, uuid) to service_role;
grant execute on function public.stock_transformar(uuid, text, numeric, jsonb, numeric, numeric, numeric, numeric, date, text, uuid) to service_role;
grant execute on function public.stock_anular_transformacion(uuid, text, uuid) to service_role;

-- ── (6) la vista pública: ctc_selection solo por compras de CTCx Selection ───────────────────────────────────────────────────
create or replace view public.public_lot_catalog as
 SELECT l.id AS lot_id,
    l.name,
    l.grade,
    l.ficha_variedad,
    l.ficha_proceso,
    l.ficha_altitud_m,
    l.ficha_puntaje_estimado,
    l.ficha_notas_cata,
        CASE
            WHEN comprado.lot_id IS NULL THEN f.name
            ELSE NULL::text
        END AS finca_name,
    f.municipio,
    f.departamento,
    official.avg_sca_total AS official_score,
    comprado.lot_id IS NOT NULL AS ctc_selection,
    l.datasheet IS NOT NULL AS tiene_ficha,
    l.public_code,
        CASE
            WHEN comprado.lot_id IS NULL THEN NULL::text
            ELSE csl.imagen_path
        END AS ctcx_imagen_path
   FROM lots l
     JOIN fincas f ON f.id = l.finca_id
     JOIN lot_listings ll ON ll.lot_id = l.id
     LEFT JOIN ( SELECT DISTINCT c.lot_id
           FROM compras c
          WHERE c.destino = 'selection'::text) comprado ON comprado.lot_id = l.id
     LEFT JOIN ctcx_selection_lotes csl ON csl.lot_id = l.id
     LEFT JOIN ( SELECT lot_evaluations.lot_id,
            avg(lot_evaluations.sca_total) AS avg_sca_total
           FROM lot_evaluations
          WHERE lot_evaluations.status = 'accepted'::evaluation_status AND lot_evaluations.sca_total IS NOT NULL
          GROUP BY lot_evaluations.lot_id) official ON official.lot_id = l.id
  WHERE ll.status = ANY (ARRAY['published'::listing_status, 'sold_out'::listing_status]);

-- ── (7) el borrado nuclear: el sexto bloqueo (la función entera, con una sola línea nueva: las partidas del Stock CTCx) ───────
create or replace function public._nuclear_recoger(p_tipo text, p_id uuid)
 returns jsonb
 language plpgsql
 set search_path to 'public'
as $function$
declare
  v_lotes uuid[] := '{}';
  v_fincas uuid[] := '{}';
  v_producer uuid;
  v_nombre text;
  snap jsonb;
  bloqueos text[] := '{}';
  v_ids uuid[];
  v_comms uuid[];
  v_assets uuid[];
  v_patrones text[] := '{}';
  v_archivos jsonb;
  n int;
  t text;
begin
  if p_tipo = 'lote' then
    select producer_id, name into v_producer, v_nombre from lots where id = p_id;
    if not found then raise exception 'El lote no existe (¿ya se borró?).'; end if;
    v_lotes := array[p_id];
  elsif p_tipo = 'finca' then
    select producer_id, name into v_producer, v_nombre from fincas where id = p_id;
    if not found then raise exception 'La finca no existe (¿ya se borró?).'; end if;
    v_fincas := array[p_id];
    select coalesce(array_agg(id), '{}') into v_lotes from lots where finca_id = p_id;
    select string_agg(l.name, ', ') into t from lot_contributions c join lots l on l.id = c.lot_id where c.finca_id = p_id and l.finca_id is distinct from p_id;
    if t is not null then bloqueos := bloqueos || format('La finca aporta café a lotes de otra finca (%s): borre primero esos lotes.', t); end if;
  else
    raise exception 'Tipo desconocido: %', p_tipo;
  end if;

  snap := jsonb_build_object(
    'fincas', _nuclear_filas('fincas', 'id', v_fincas),
    'finca_parcelas', _nuclear_filas('finca_parcelas', 'finca_id', v_fincas),
    'finca_certificates', _nuclear_filas('finca_certificates', 'finca_id', v_fincas),
    'terratalento_jornadas', _nuclear_filas('terratalento_jornadas', 'finca_id', v_fincas),
    'lots', _nuclear_filas('lots', 'id', v_lotes),
    'lot_contributions', _nuclear_filas('lot_contributions', 'lot_id', v_lotes),
    'lot_fichas', _nuclear_filas('lot_fichas', 'lot_id', v_lotes),
    'ficha_completion_snapshots', _nuclear_filas('ficha_completion_snapshots', 'lot_id', v_lotes),
    'arena_inscriptions', _nuclear_filas('arena_inscriptions', 'lot_id', v_lotes),
    'arena_entry_codes', _nuclear_filas('arena_entry_codes', 'lot_id', v_lotes),
    'arena_scores', _nuclear_filas('arena_scores', 'lot_id', v_lotes),
    'arena_session_lots', _nuclear_filas('arena_session_lots', 'lot_id', v_lotes),
    'muestras', _nuclear_filas('muestras', 'lot_id', v_lotes),
    'lot_evaluations', _nuclear_filas('lot_evaluations', 'lot_id', v_lotes),
    'lot_referencias', _nuclear_filas('lot_referencias', 'lot_id', v_lotes),
    'lot_offers', _nuclear_filas('lot_offers', 'lot_id', v_lotes),
    'black_negotiations', _nuclear_filas('black_negotiations', 'lot_id', v_lotes),
    'purchase_contracts', _nuclear_filas('purchase_contracts', 'lot_id', v_lotes),
    'compras', _nuclear_filas('compras', 'lot_id', v_lotes),
    'ctcx_selection_lotes', _nuclear_filas('ctcx_selection_lotes', 'lot_id', v_lotes),
    'lot_listings', _nuclear_filas('lot_listings', 'lot_id', v_lotes),
    'lot_auctions', _nuclear_filas('lot_auctions', 'lot_id', v_lotes)
  );
  snap := snap || jsonb_build_object(
    'terratalento_postulaciones', _nuclear_filas('terratalento_postulaciones', 'jornada_id', _nuclear_ids(snap, 'terratalento_jornadas')),
    'muestra_movimientos', _nuclear_filas('muestra_movimientos', 'muestra_id', _nuclear_ids(snap, 'muestras')),
    'contract_months', _nuclear_filas('contract_months', 'contract_id', _nuclear_ids(snap, 'purchase_contracts')),
    'contract_releases', _nuclear_filas('contract_releases', 'contract_id', _nuclear_ids(snap, 'purchase_contracts')),
    'humidity_readings', _nuclear_filas('humidity_readings', 'contract_id', _nuclear_ids(snap, 'purchase_contracts'))
  );

  select count(*) into n from order_items where lot_listing_id = any(_nuclear_ids(snap, 'lot_listings'));
  if n > 0 then bloqueos := bloqueos || format('Hay %s ítem(s) de pedidos de compradores sobre este café: un pedido de un comprador no se borra desde aquí.', n); end if;
  select count(*) into n from lot_reservations where lot_listing_id = any(_nuclear_ids(snap, 'lot_listings'));
  if n > 0 then bloqueos := bloqueos || format('Hay %s reserva(s) de compradores sobre este café.', n); end if;
  select count(*) into n from auction_bids where auction_id = any(_nuclear_ids(snap, 'lot_auctions'));
  if n > 0 then bloqueos := bloqueos || format('La subasta del lote tiene %s puja(s) de compradores.', n); end if;
  select count(*) into n from mezcla_componentes where compra_id = any(_nuclear_ids(snap, 'compras'));
  if n > 0 then bloqueos := bloqueos || format('Una compra de este café ya está dentro de una mezcla (%s componente(s)): deshaga la mezcla primero.', n); end if;
  select count(*) into n from sample_kit_items where compra_id = any(_nuclear_ids(snap, 'compras'));
  if n > 0 then bloqueos := bloqueos || format('Una compra de este café ya está en el stock de Sample Kits (%s ítem(s)).', n); end if;
  select count(*) into n from stock_partidas where lot_id = any(v_lotes);
  if n > 0 then bloqueos := bloqueos || format('Este café ya está en el Stock CTCx (%s partida(s)): el stock físico no se borra desde aquí.', n); end if;

  select coalesce(array_agg(id), '{}') into v_comms from producer_comm_log
    where lot_id = any(v_lotes) or finca_id = any(v_fincas);
  select coalesce(array_agg(distinct id), '{}') into v_comms from producer_comm_log where id = any(v_comms) or parent_id = any(v_comms);
  snap := snap || jsonb_build_object('producer_comm_log', _nuclear_filas('producer_comm_log', 'id', v_comms));

  select coalesce(array_agg(distinct (e->>'id')::uuid), '{}') into v_ids
    from jsonb_each(snap) s(k, arr), jsonb_array_elements(arr) e
    where e ? 'id' and (e->>'id') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  snap := snap || jsonb_build_object('audit_log', _nuclear_filas('audit_log', 'entity_id', v_ids));

  select coalesce(array_agg(distinct (kv->>'value')::uuid), '{}') into v_assets
    from jsonb_path_query(snap, '$.** ? (@.type() == "object").keyvalue() ? (@.key like_regex "(assetId|asset_id)$")') kv
    where jsonb_typeof(kv->'value') = 'string' and (kv->>'value') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  select coalesce(array_agg(v_producer::text || '/lots/' || x::text || '/%'), '{}') into v_patrones from unnest(v_lotes) x;
  select v_patrones || coalesce(array_agg(v_producer::text || '/fincas/' || x::text || '/%'), '{}') into v_patrones from unnest(v_fincas) x;
  select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'bucket', m.bucket, 'path', m.path, 'size_bytes', m.size_bytes)), '[]'::jsonb) into v_archivos
    from media_assets m where m.id = any(v_assets) or m.path like any(v_patrones);

  return jsonb_build_object(
    'tipo', p_tipo, 'id', p_id, 'nombre', v_nombre, 'producer_id', v_producer,
    'lotes', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name)), '[]'::jsonb) from lots where id = any(v_lotes)),
    'snapshot', snap, 'bloqueos', to_jsonb(bloqueos), 'archivos', v_archivos,
    'conteos', (select coalesce(jsonb_object_agg(k, jsonb_array_length(arr)), '{}'::jsonb) from jsonb_each(snap) s(k, arr) where jsonb_array_length(arr) > 0)
  );
end $function$;
revoke all on function public._nuclear_recoger(text, uuid) from public, anon, authenticated;
grant execute on function public._nuclear_recoger(text, uuid) to service_role;
