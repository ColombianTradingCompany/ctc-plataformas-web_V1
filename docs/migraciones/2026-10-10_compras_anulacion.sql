-- ACTA · 2026-10-10 · V5.203 · migración `compras_anulacion` (POR APLICAR)
--
-- El owner, 2026-10-10: «CTCx Compras no parece estar funcionando bien; revísalo y mejora el UI/UX con la nueva información que
-- tienes donde sea pertinente (también en relación a su interacción con el Triage de Catálogo Activo y la Oferta de CTCx
-- Selection)». El diagnóstico (bug B9) encontró que una compra no se podía anular ni corregir: la fila de prueba «Test Nota 1» era
-- permanente, inflaba los indicadores y ofrecía 15 kg en el Triage.
--
-- ⚠️ ORDEN: esta migración va ANTES de `2026-10-10_vitrina_sin_finca.sql` (V5.202): sus dos vistas exigen `c.anulada_at is null`.
-- Y va ANTES de desplegar el código de la V5.203: Adquisición, CTCx Selection y /ocp/kr leen `compras.anulada_at`.
--
-- (1) `compras.anulada_at · anulada_por · anulada_motivo` (≤ 300; fecha y motivo van juntos), como `stock_partidas`. Nada se borra.
-- (2) `compra_anular(compra, motivo, por)`: anula la compra Y su partida raíz del Stock CTCx en la MISMA transacción. Solo una compra
--     registrada A MANO (la de un contrato —el pago de un mes, el saco o el adelanto recibidos— la sostiene su contrato), sin
--     componentes en una mezcla viva y con una raíz sin movimientos (transformaciones, salidas, kits ni declaración viva en el Triage
--     — `stock_tiene_movimientos`). La acción `anularCompra` (comprasActions.ts) repite las reglas antes, con mensajes claros.
-- (3) `guard_compra` (antes de UPDATE en `compras`): una compra anulada no cambia ni vuelve; anularla no cambia nada más y exige la
--     raíz ya anulada (por eso se anula con `compra_anular`); y el DESTINO (B5) no cambia si la compra está en una mezcla viva (a
--     stock), si viene de un despacho de un trato por ventana (a Selection: ocultaría la finca de un lote que se vende a nombre del
--     productor) o si su lote tiene café declarado vivo en el Catálogo Activo (cualquier cambio: cambiaría la vitrina sin aviso).
--     El DELETE no se toca: el borrado nuclear de un lote sigue pudiendo llevarse sus compras sin partidas.
-- (4) Una compra anulada no entra al Stock CTCx (`guard_stock_partida_compra`, antes de INSERT) ni a una mezcla
--     (`guard_mezcla_componente`, reescrita con LA MISMA regla de antes más esa línea).
-- `stock_disponible` ya da 0 a una partida anulada y `triage_declarar` / `guard_sample_kit_stock` ya la rechazan: no cambian.
-- (5) V5.203 · corrección (nodo final, 2026-10-10 · revisión de privacidad, hallazgo 3): una compra anulada NO bloquea borrar a quien
--     la registró o la anuló, ni la edición del PVC o el contrato que cita — las FK `ON DELETE SET NULL` son un UPDATE que pasa por
--     `guard_compra`: en la rama anulada, `registrada_por`, `anulada_por`, `pvc_edition_id` y `contract_id` pueden pasar a NULL (y
--     nada más). El mismo defecto en `guard_stock_partida` (`created_by` y `anulada_por` de una partida anulada): se reescribe desde
--     su definición viva (2026-10-09_stock_ctcx.sql) cambiando SOLO eso.
-- (6) V5.203 · corrección (H1/H2): `compras.despacho_id` — la compra que nace del recibo de un saco o un adelanto de un trato por
--     ventana dice de QUÉ despacho es (UNIQUE: un despacho, una compra; `guard_compra` la lee también en B5). Hasta aquí ese vínculo solo vivía en la partida
--     (`stock_partidas.despacho_id` + `compra_id`), y la base no deja cambiar el vínculo de una partida: si la compra fallaba al
--     recibir, ya no había cómo enlazarla. Con la columna, «Reintentar la compra» (ventanaActions.ts) es idempotente por despacho y
--     Adquisición encuentra la partida de esa compra por su despacho. Se rellena desde las partidas que ya enlazan los dos.
-- Service-role-only (RLS sin políticas), como el resto del circuito. Ninguna fila existente cambia (salvo el relleno de (6)).

-- ── (1) las columnas ─────────────────────────────────────────────────────────────────────────────────────────────────────────
alter table public.compras add column if not exists anulada_at timestamptz;
alter table public.compras add column if not exists anulada_por uuid references public.profiles(id) on delete set null;
alter table public.compras add column if not exists anulada_motivo text;
alter table public.compras drop constraint if exists compras_anulada_motivo_check;
alter table public.compras add constraint compras_anulada_motivo_check check (anulada_motivo is null or length(anulada_motivo) <= 300);
alter table public.compras drop constraint if exists compras_anulada_check;
alter table public.compras add constraint compras_anulada_check check ((anulada_at is null) = (anulada_motivo is null));
comment on column public.compras.anulada_at is 'V5.203 · la compra se anuló (con su partida raíz del Stock CTCx): no cuenta en Adquisición, CTCx Selection, mezclas ni la vitrina. Nada se borra.';
comment on column public.compras.anulada_motivo is 'V5.203 · por qué se anuló (3–300 caracteres; obligatorio con anulada_at).';

-- ── (6) el despacho de una compra de un trato por ventana ────────────────────────────────────────────────────────────────────
-- ON DELETE SET NULL (como `contract_id`): el borrado nuclear de un lote se lleva sus contratos y sus despachos sin tropezar aquí.
-- El relleno va ANTES de crear `trg_guard_compra` (más abajo): ninguna compra anulada tiene despacho (solo se anulan las a mano).
alter table public.compras add column if not exists despacho_id uuid references public.contract_despachos(id) on delete set null;
create unique index if not exists compras_despacho_id_key on public.compras (despacho_id) where despacho_id is not null;
comment on column public.compras.despacho_id is 'V5.203 · el saco o el adelanto de un trato por ventana del que nace esta compra (uno por despacho). Lo escribe recibirDespacho y su reintento.';
update public.compras c
   set despacho_id = p.despacho_id
  from public.stock_partidas p
 where p.compra_id = c.id and p.despacho_id is not null and c.despacho_id is null;

-- ── lo que una compra tiene «vivo» ───────────────────────────────────────────────────────────────────────────────────────────
create or replace function public.compra_en_mezcla_viva(p_compra uuid)
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select exists (select 1 from public.mezcla_componentes mc join public.mezclas m on m.id = mc.mezcla_id
                  where mc.compra_id = p_compra and m.status <> 'anulada')
$$;

-- ── (3) la compuerta de una compra ───────────────────────────────────────────────────────────────────────────────────────────
create or replace function public.guard_compra()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_raiz record;
  v_cf text;
begin
  if old.anulada_at is not null then
    -- (5) Solo las cuatro FK `ON DELETE SET NULL` pueden pasar a NULL (borrar a un colaborador, una edición del PVC o un contrato);
    -- ningún otro cambio, y ninguna de ellas a otro valor.
    if (to_jsonb(new) - 'registrada_por' - 'anulada_por' - 'pvc_edition_id' - 'contract_id')
         is distinct from (to_jsonb(old) - 'registrada_por' - 'anulada_por' - 'pvc_edition_id' - 'contract_id')
       or (new.registrada_por is distinct from old.registrada_por and new.registrada_por is not null)
       or (new.anulada_por is distinct from old.anulada_por and new.anulada_por is not null)
       or (new.pvc_edition_id is distinct from old.pvc_edition_id and new.pvc_edition_id is not null)
       or (new.contract_id is distinct from old.contract_id and new.contract_id is not null) then
      raise exception 'Una compra anulada no cambia ni vuelve.';
    end if;
    return new;
  end if;
  if new.anulada_at is not null then
    if (to_jsonb(new) - 'anulada_at' - 'anulada_por' - 'anulada_motivo') is distinct from (to_jsonb(old) - 'anulada_at' - 'anulada_por' - 'anulada_motivo') then
      raise exception 'Al anular una compra no cambia nada más.';
    end if;
    if old.origen <> 'manual' then
      raise exception 'Solo se anula una compra registrada a mano: la de un contrato (el pago de un mes, un saco o un adelanto recibidos) la sostiene su contrato.';
    end if;
    if public.compra_en_mezcla_viva(old.id) then
      raise exception 'Esa compra está en una mezcla viva: anule la mezcla (o quite el componente) antes de anular la compra.';
    end if;
    select codigo into v_raiz from public.stock_partidas where compra_id = old.id and anulada_at is null limit 1;
    if found then
      raise exception 'La partida % de esta compra sigue viva: la compra se anula con su partida (compra_anular).', v_raiz.codigo;
    end if;
    return new;
  end if;
  if new.destino is distinct from old.destino then
    if new.destino = 'stock' and public.compra_en_mezcla_viva(old.id) then
      raise exception 'Esa compra está en una mezcla de CTCx Selection: no pasa a «solo stock» mientras la mezcla esté viva.';
    end if;
    -- V5.203 · verificación (nodo final, 2026-10-10): también por `old.despacho_id` (6) — la compra creada al reintentar no está
    -- enlazada a su partida, y su `precio_fuente` no es lo que debe sostener la regla.
    if new.destino = 'selection' and (coalesce(old.precio_fuente, '') like 'trato por ventana%' or old.despacho_id is not null
       or exists (select 1 from public.stock_partidas p where p.compra_id = old.id and p.despacho_id is not null)) then
      raise exception 'Esa compra es un saco o un adelanto de un trato por ventana: el lote se vende a nombre del productor y no pasa a CTCx Selection.';
    end if;
    select codigo into v_cf from public.catalogo_fuentes where lot_id = old.lot_id and estado = 'declarada' order by created_at limit 1;
    if v_cf is not null then
      raise exception 'El lote tiene café declarado en el Catálogo Activo (%): cambiar «Es de» cambiaría la vitrina. Retire primero la declaración en el Triage.', v_cf;
    end if;
  end if;
  return new;
end
$$;
drop trigger if exists trg_guard_compra on public.compras;
create trigger trg_guard_compra before update on public.compras
  for each row execute function public.guard_compra();

-- ── (2) anular: la compra y su raíz, juntas ──────────────────────────────────────────────────────────────────────────────────
create or replace function public.compra_anular(p_compra uuid, p_motivo text, p_por uuid default null)
returns uuid
language plpgsql
set search_path = public, pg_temp
as $$
declare
  c record;
  p record;
  v_motivo text := btrim(coalesce(p_motivo, ''));
  v_raiz uuid := null;
begin
  if length(v_motivo) < 3 or length(v_motivo) > 300 then
    raise exception 'Anular una compra lleva su motivo (de 3 a 300 caracteres).';
  end if;
  select * into c from public.compras where id = p_compra for update;
  if not found then
    raise exception 'Compra no encontrada.';
  end if;
  if c.anulada_at is not null then
    raise exception 'Esa compra ya estaba anulada.';
  end if;
  select * into p from public.stock_partidas where compra_id = p_compra for update;
  if found and p.anulada_at is null then
    if public.stock_tiene_movimientos(p.id) then
      raise exception 'La partida % ya se movió (se trilló, salió, está en un kit o declarada en el Triage): deshaga eso antes de anular la compra.', p.codigo;
    end if;
    update public.stock_partidas
       set anulada_at = now(), anulada_por = p_por, anulada_motivo = left('Compra anulada: ' || v_motivo, 300)
     where id = p.id;
    v_raiz := p.id;
  end if;
  update public.compras set anulada_at = now(), anulada_por = p_por, anulada_motivo = v_motivo where id = p_compra;
  return v_raiz;
end
$$;

-- ── (4) una compra anulada no entra al stock ni a una mezcla ─────────────────────────────────────────────────────────────────
create or replace function public.guard_stock_partida_compra()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.compra_id is not null and exists (select 1 from public.compras c where c.id = new.compra_id and c.anulada_at is not null) then
    raise exception 'Esa compra está anulada: no entra al Stock CTCx.';
  end if;
  return new;
end
$$;
drop trigger if exists trg_guard_stock_partida_compra on public.stock_partidas;
create trigger trg_guard_stock_partida_compra before insert on public.stock_partidas
  for each row execute function public.guard_stock_partida_compra();

create or replace function public.guard_mezcla_componente()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare v_status text;
begin
  select status into v_status from public.mezclas where id = coalesce(new.mezcla_id, old.mezcla_id);
  if v_status is distinct from 'borrador' then
    raise exception 'Los componentes de una mezcla solo cambian mientras es un borrador.';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  if exists (select 1 from public.compras c where c.id = new.compra_id and c.anulada_at is not null) then
    raise exception 'Esa compra está anulada: no entra a una mezcla.';
  end if;
  return new;
end;
$$;

-- ── (5) la compuerta de una partida, sin bloquear el borrado de un colaborador ──────────────────────────────────────────────
-- Reescrita desde su definición viva (`2026-10-09_stock_ctcx.sql`); cambia SOLO esto: `created_by` puede pasar a NULL (antes
-- cualquier cambio lanzaba) y el `anulada_por` de una partida anulada también (antes «Una partida anulada no vuelve.»).
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
     or new.created_at is distinct from old.created_at
     or (new.created_by is distinct from old.created_by and new.created_by is not null) then
    raise exception 'De una partida solo cambian su ubicación, su presentación y su nota (y los kg o el costo de una raíz sin movimientos).';
  end if;
  if new.kg is distinct from old.kg or new.costo_cop_kg is distinct from old.costo_cop_kg then
    if old.madre_transformacion_id is not null or old.anulada_at is not null or public.stock_tiene_movimientos(old.id) then
      raise exception 'Los kg y el costo de una partida no cambian después de moverse (solo los de una raíz sin movimientos).';
    end if;
  end if;
  if old.anulada_at is not null and (new.anulada_at is distinct from old.anulada_at or new.anulada_motivo is distinct from old.anulada_motivo
     or (new.anulada_por is distinct from old.anulada_por and new.anulada_por is not null)) then
    raise exception 'Una partida anulada no vuelve.';
  end if;
  if old.anulada_at is null and new.anulada_at is not null and public.stock_tiene_movimientos(old.id) then
    raise exception 'Una partida con movimientos no se anula: anule primero lo que salió de ella.';
  end if;
  return new;
end
$$;

-- ── los permisos ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
revoke all on function public.compra_en_mezcla_viva(uuid) from public, anon, authenticated;
revoke all on function public.compra_anular(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.compra_en_mezcla_viva(uuid) to service_role;
grant execute on function public.compra_anular(uuid, text, uuid) to service_role;
