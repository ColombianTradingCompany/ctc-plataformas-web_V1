# Brief · CTCx Selection · Compras  (componente: consolas · slug: `ctcx-selection-compras` · 2026-09-19)

> Fase 6 del overhaul (`docs/OVERHAUL_CONSOLAS_PLAN.md`, D9). Segunda entrada de **OCP · Manejo de Stock Físico**. El plan: «lo
> que CTCx compra en firme y lo que de ahí se ofrece», y hereda el tablero de negociación de `/ocp/ctc-selection`. La nota 5 del
> owner la necesita: las ofertas de CTCx Selection toman su cantidad **de aquí**. Estado: **en scoping — espera al owner, y a la fase 4b.**
> **V5.63:** el owner pidió el cuadro completo en el rail, así que la entrada YA EXISTE (`/ocp/compras`) con una página que dice que el
> módulo no existe, qué será y qué falta decidir. Cuando este brief se apruebe y se construya, esa página se reemplaza entera.

**Qué es** — El registro de **cada compra en firme**: qué café, a quién, cuántos kilos, a qué precio, cuándo se pagó y cuándo
llegó; de **cómo se combina** (los blends de Black y Red); y de **cuánto queda por ofrecer**. Es lo contrario del contrato de
hoy, que no compra: CONGELA una cantidad y un precio, el café se queda en la finca y se libera mes a mes. Cuando CTCx compra en
firme, el café es suyo, figura como productor, y la finca pasa a la documentación.

**Para quién** — El **owner** (decide la compra) y el **equipo CTC**. Aguas abajo: el catálogo de Cherry Picked y la ficha
pública de CTCx Selection.

**Lo que ya hay (hechos, 2026-09-19)**
- **No hay compra en firme como mecanismo.** `purchase_contracts` congela (`quantity_frozen_kg`, `price_per_kg_locked`) y
  `contract_releases` libera por meses; el catálogo publica SOLO lo liberado. No existe orden de compra, ni pago de compra, ni
  recepción de carga. **No hay ninguna tabla de inventario, bodega ni existencias** (barrido del esquema completo).
- **`/ocp/ctc-selection` es un CRM de negociación, no un almacén.** `black_negotiations` tiene una etapa (nueva · en conversación
  · acuerdo cerca), un objetivo en kilos y un veredicto (abierta · comprar · liberado). Su única fila nace dentro del veredicto
  del Q-Grader, **solo si el grado es Black**. La pestaña «Selección» (Red · Blue · Gold) **tiene pantalla y ningún escritor**.
  «Comprar» pide un precio **escrito a mano** y emite una oferta `black`. Cero negociaciones en producción.
- **«CTCx Selection» en la vitrina es un dato DERIVADO**: la vista pública lo enciende si existe una negociación Black decidida
  como «comprar», y entonces **oculta el nombre de la finca**. Decidido y sin hacer: que lo encienda **cualquier** compra en
  firme, de cualquier grado (A13 · tanda CN-3a).
- **La regla de las mezclas** (owner, 2026-09-19): **Black = blend de 3 a 4 orígenes y/o variedades; Red = siempre una sola
  variedad, mezcla regional de 3 a 4 orígenes**; el mínimo es **una carga (125 kg de pergamino) por productor**. Una mezcla de
  dos no existe; de cinco, tampoco. Está en `src/lib/pvc/lectura.ts` (`COMPOSICION_MEZCLA`, `MOQ_MEZCLA`), y su propio
  comentario lo dice: «hoy se EXHIBE; el día que el OCP arme blends, esta es la regla que tendrá que hacer cumplir». **Ese día es este módulo.**
- **El precio de la compra directa está decidido y no está en código**: `PVC × multiplicador del grado × (1 − prima del 8 %)`
  (`PVC_BCP_PLAN.md` §9.5, «La oferta al productor: dos caminos»), con un tipo de oferta nuevo, `directa`, que hoy la base rechaza.

**Dónde vivirá** — Módulo de consola: **`/ocp/compras`**, en «OCP · Manejo de Stock Físico», con el tablero de negociación de
`/ocp/ctc-selection` como su primera pestaña (la ruta vieja queda como 308). Lógica en `src/lib/compras/` — la regla de la
mezcla es **pura** y lee `COMPOSICION_MEZCLA`: una fuente.

**Datos** — Patrón de la casa (RLS + cero políticas; nada se borra). **`compras`** — `lot_id`, `productor`, `grado`,
`kg_pergamino`, `precio_por_kg`, `precio_fuente` (la edición del PVC de la que salió), `acordada_at`, `pagada_at` + referencia
(el carril, de «Plataformas de Pagos»), `recibida_at`, `kg_recibidos`. Segunda tanda: **`mezclas`** y **`mezcla_componentes`**
(qué compras, con cuántos kilos cada una), con la regla del owner impuesta en el servidor y por un *guard* en la base.
**Lo disponible NO se guarda: se deriva** (comprado − lo asignado a una mezcla o a un listado). La conversión de pergamino a
verde la da el **Modelo de Producción** (su brief): aquí no se inventa un factor.

**IA** — Ninguna.

**Contratos que toca** — **Grados** (Tyrian no se compra: va a subasta; lo impide un CHECK) · **el PVC** (el precio sale de la
edición vigente) · **la vitrina pública** (`public_lot_catalog.ctc_selection`: cambia de qué se deriva — lo ve el comprador) ·
**vocabulario** (CTCx Selection, Papagayo Beans®) · **ofertas** (`lot_offers.kind = 'directa'`, DDL de la fase 4b / CN-3a).

**Guardián previsto** — `qa-compras-check`: (1) la regla de la mezcla se LEE de `lectura.ts` —3 o 4 componentes, al menos una
carga cada uno, Red de una sola variedad—, no se copia; (2) lo disponible es derivado y nunca negativo; (3) `ctc_selection` sale
de `compras`, para todo grado menos Tyrian; (4) el precio de una compra cita su edición del PVC.

**Primera tanda** — La tabla `compras`; registrar una compra desde un «comprar» del tablero (que hoy solo emite una oferta); el
**escritor que le falta a la rama Red · Blue · Gold**; y la pestaña «Compras» con lo comprado, lo pagado, lo recibido y lo
disponible. Sin mezclas todavía. Verificable en vivo por SQL. **No antes de la fase 4b** (comparte el veredicto y las ofertas).

**Decisiones del owner**
1. **¿Cómo se paga una compra en firme?** ¿El 100 % al acordar, o también por tramos? Es la diferencia de fondo con el contrato
   de hoy, y decide si `compras` lleva una fecha de pago o una escalera.
2. **¿Dónde está físicamente el café comprado?** ¿En la finca hasta el despacho, en el Centro de Calidad, en una bodega? El
   grupo se llama «Stock Físico»: sin ubicación, esto es contabilidad, no stock.
3. **La prima del 8 %** de la compra directa: ¿sigue vigente? ¿Es la misma para todos los grados?
4. **¿Una mezcla es un lote nuevo?** Con su propio código público, su ficha y su nombre (Papagayo Beans®) — ¿o una etiqueta
   sobre los lotes que la componen? Decide si `mezclas` cuelga de `lots` o vive aparte.
5. **La unidad**: se compra en **cargas de pergamino** y se vende en **kilos de verde**. ¿La pantalla habla en las dos, con el
   factor del Modelo de Producción a la vista?
