-- V5.88 · 2.ª tanda de Gestión de Muestras (brief `consolas-gestion-de-muestras.md`): las muestras «para comprador» y la
-- alerta de los 90 días. Migración `muestras_pedidos_envio`. Se aplicó con `apply_migration`; esta copia es el acta.
--
-- (1) La ALERTA DE LOS 90 DÍAS (owner, 2026-09-16, ALINEACION §3: «llamado a más de 90 días de la catación: no se recata, se
--     hace revisión de almacenaje con 1 kg») NO añade columnas: se DERIVA de la fecha de la evaluación que rige el grado
--     (`lot_evaluations.rige_grado`, `reviewed_at`/`created_at`) y del último movimiento `revision_almacenaje` de la muestra de
--     testeo (`src/lib/muestras/almacenaje.ts`, puro). Sale como tarea derivada `muestra:<lot>` del Tablero de Ejecución y como
--     sección de `/ocp/muestras`; anotar la revisión es un movimiento más (motivo `revision_almacenaje`, con el resultado en notas).
-- (2) Las MUESTRAS PARA COMPRADOR: `sample_pack_orders` (tabla de `cherry-picked`; el comprador la inserta desde la tienda) gana
--     los estados `preparado` y `enviado` y las columnas que CTC escribe al armar y despachar el pack (`preparado_at`,
--     `enviado_at`, `enviado_por`, `guia`, `notas_ctc`); cada salida hacia un comprador (`muestra_movimientos.motivo =
--     'a_comprador'`) queda ligada a su pedido por `pedido_id`: «a quién se mandó» sale del mismo cuaderno que el saldo.
--     Qué lotes y cuántos gramos van en el pack lo decide CTC al armarlo (decisiones 4 y 5 del brief siguen con el owner:
--     si el comprador puede pedir la muestra de UN lote desde la tienda, y la composición del pack de cosecha).
alter type public.sample_pack_status add value if not exists 'preparado';
alter type public.sample_pack_status add value if not exists 'enviado';
alter table public.sample_pack_orders
  add column preparado_at timestamptz,
  add column enviado_at timestamptz,
  add column enviado_por uuid references public.profiles(id) on delete set null,
  add column guia text,
  add column notas_ctc text;
alter table public.muestra_movimientos add column pedido_id uuid references public.sample_pack_orders(id) on delete set null;
create index muestra_movimientos_pedido_idx on public.muestra_movimientos (pedido_id);
comment on column public.muestra_movimientos.pedido_id is 'V5.88 · si la salida fue a un comprador, el pedido de pack de muestras al que fue (a quién se mandó).';
