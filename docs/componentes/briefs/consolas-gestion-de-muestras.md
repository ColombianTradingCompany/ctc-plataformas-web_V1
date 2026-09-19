# Brief · Gestión de Muestras  (componente: consolas · slug: `gestion-de-muestras` · 2026-09-19)

> Fase 6 del overhaul (`docs/OVERHAUL_CONSOLAS_PLAN.md`, D9). Primera entrada del grupo nuevo **OCP · Manejo de Stock Físico**.
> El plan la describe en una línea: «una tabla de muestras: qué llegó, cuánto, dónde está, a quién se mandó». Estado: **en
> scoping — espera al owner.** No hay un solo dato que migrar: cero muestras enviadas, cero recibidas.
> **V5.63:** el owner pidió el cuadro completo en el rail, así que la entrada YA EXISTE (`/ocp/muestras`) con una página que dice que el
> módulo no existe, qué será y qué falta decidir. Cuando este brief se apruebe y se construya, esa página se reemplaza entera.

**Qué es** — El registro de cada **muestra física** que pasa por las manos de CTC: qué lote, cuántos kilos llegaron, dónde
está guardada, quién la tiene, qué se sacó de ella y a quién se mandó. Hoy una muestra es **una marca de tiempo**: la
plataforma sabe que «llegó» y nada más — ni cuánto, ni dónde, ni si queda.

**Para quién** — El **equipo CTC** que recibe, guarda y reparte muestras; el **Q-Grader**, que las consume. El **productor**
ve el efecto (que su muestra llegó); el **comprador**, cuando pida una.

**Lo que ya hay (hechos, 2026-09-19)**
- En `lots`: `sample_shipped_at` (lo marca el productor, con un *guard* que exige lote apto e inscripción), `sample_2kg_confirmed_at`
  (lo marca CTC: `confirmSampleReceived` exige EUDR resuelto e inscripción pagada) y `ficha_peso_muestra_kg` (solo al crear un
  lote a mano; **nadie lo vuelve a leer**). Eso es todo. El estado del circuito (`src/lib/ocp/circuito.ts`) lee la segunda.
- **Los baches de sondeo** llevaban muestras a un laboratorio con su solicitud formal y cata a ciegas. **D5: salen de la
  pantalla** (cero baches en producción); si vuelven, vuelven como una columna «laboratorio», no como un kanban.
- **Reglas del owner que no tienen dónde vivir**: la **contramuestra sellada de 0,5 kg** (solo está en el guion del productor) y
  —decidida el 2026-09-16— «a más de 90 días de la catación **no se recata: revisión de almacenaje con 1 kg**». El charter
  anota que esa regla **no está en ninguna tanda de ningún plan**. Este módulo es su sitio.
- **Muestras a compradores**: `sample_pack_orders` guarda solo quién pidió un pack —ni lote, ni kilos, ni dirección, un único
  estado `ordered`— y **ninguna consola la lee**. Hay **un pedido en producción que nadie en CTC ha visto en una pantalla**.
- La humedad (`humidity_readings`) NO es de la muestra: es del café bajo contrato, mes a mes. No entra aquí.
- El Centro de Calidad no recibe muestras (recibe pergamino comercial) y su panel es un esqueleto.

**Dónde vivirá** — Módulo de consola: **`/ocp/muestras`**, grupo nuevo «OCP · Manejo de Stock Físico». Lógica en `src/lib/muestras/`.

**Datos** — Dos tablas, patrón de la casa (RLS + cero políticas): **`muestras`** — `lot_id`, `tipo` (evaluación · contramuestra
· revisión de almacenaje · para comprador), `kg_recibidos`, `recibida_at`, `ubicacion`, `custodio`, `notas`. Y
**`muestra_movimientos`** — cada salida: `kg`, `motivo` (análisis físico · cata · a laboratorio · a comprador · descarte),
`destino`, `fecha`, `por`. **El saldo NO se guarda: se deriva** (recibido − Σ salidas), igual que la etapa del comprador, las
tareas del Tablero y el circuito del lote: un saldo guardado es un número que alguien olvida actualizar.
⚠️ `sample_2kg_confirmed_at` **se queda**: es la señal que lee el circuito. Confirmar el recibo pasa a hacer las dos cosas en la
misma acción —la marca Y la fila de `muestras`—, para que no puedan discrepar.

**IA** — Ninguna.

**Contratos que toca** — El **circuito del lote** (`estadoDelCircuito` sigue leyendo la marca de tiempo; `qa-circuito-check`) ·
**niveles por consola** (recibir una muestra es `emite`: el productor lo ve; ubicarla o anotar una salida interna es `borrador`
→ lista blanca primero) · **Tablero de Ejecución** (un tipo de tarea nuevo, `muestra`, derivado).

**Guardián previsto** — `qa-muestras-check`: (1) el saldo es derivado y nunca negativo; (2) la acción de recibo escribe la marca
Y la fila, o ninguna; (3) toda muestra pertenece a un lote; (4) la alerta de los 90 días sale de la fecha de la evaluación, no de
un campo aparte; (5) las acciones están en la lista blanca con su clase.

**Primera tanda** — Las dos tablas; el recibo que crea la fila (con los kilos que de verdad llegaron); la lista «qué hay y
dónde» con su saldo; y una pestaña **Pedidos de muestra** que por fin enseña `sample_pack_orders`. Verificable en vivo por SQL.
Segunda tanda: salidas y contramuestra; la alerta de los 90 días como tarea derivada; la columna «laboratorio».

**Decisiones del owner**
1. **¿Dónde se guardan físicamente las muestras, y quién responde por ellas?** Necesito la lista de ubicaciones (aunque sea
   una: «oficina, estante A») y si el custodio es una persona o un rol.
2. **Los pesos**: evaluación 2 kg, contramuestra 0,5 kg, revisión de almacenaje 1 kg. ¿La contramuestra sale de los 2 kg o
   llega aparte? ¿Cuánto tiempo se conserva?
3. **La revisión de almacenaje a los 90 días**: ¿quién la pide y a quién — CTC al productor? ¿Tiene costo? ¿Bloquea la oferta
   mientras no llegue?
4. **¿Un comprador puede pedir la muestra de UN lote?** Hoy solo puede añadir al carrito el pack genérico de cosecha. Si sí:
   ¿cuántos gramos, a qué precio, y sale de la muestra de evaluación o de la carga?
5. **El pack de cosecha (28–35 variedades de 125 g, abril y octubre)**: ¿se arma con estas muestras? Si sí, este módulo tiene
   que saber reservar gramos de cada lote para el pack.
