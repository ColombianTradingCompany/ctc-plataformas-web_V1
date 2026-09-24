# Briefs · proyectos nuevos (Herramientas Internas · Herramientas del Café)

Un proyecto que el owner trae y que **no está en ningún charter** empieza aquí, no en el código. La
sesión (arrancada con la variante «PROYECTO NUEVO» de `docs/KICKOFF.md`) escribe UN archivo
`<clave>-<slug>.md` con esta plantilla, añade la fila «en scoping» al inventario de su charter, y
espera la aprobación del owner. Aprobado el brief, el proyecto vive en el charter como cualquier otro
y el brief queda como acta de origen.

```
# Brief · <nombre>  (componente: <clave> · slug: <slug> · fecha)

**Qué es** — en tres líneas, para alguien que no lo ha visto.
**Para quién** — productor · comprador · equipo CTC · socio · el owner.
**Dónde vivirá** — apps-internas/<slug> (app propia) · tools/<slug> (herramienta local) ·
  public/tools/<slug>.html + registro `tools` (herramienta pública) · módulo de consola (cuál).
**Datos** — tablas nuevas (patrón de la casa: RLS + cero políticas, guard triggers) o ninguna.
**IA** — llamadas pagadas, modelo (pequeño por defecto), qué es opt-in, superficie en USOS.
**Contratos que toca** — grados · subdominios · identidad · vocabulario · … (ALINEACION §1) o ninguno.
**Guardián previsto** — qué costura protegerá `qa-<slug>-check.mjs`.
**Primera tanda** — lo mínimo que se puede desplegar y verificar en vivo.
**Decisiones del owner** — lo que bloquea, con la pregunta escrita.
```

## En scoping — esperan al owner

**Fase 6 del overhaul de las consolas** (`docs/OVERHAUL_CONSOLAS_PLAN.md`, D9: «el rail no promete lo que no hay; cada entrada
entra con su brief»). El cuadro del owner nombra NUEVE entradas sin módulo; son **seis briefs**, porque cinco de ellas son
vistas de dos modelos. Escritos el 2026-09-19 desde un inventario del repo y del esquema; ninguno tiene una línea de código.

| Brief | Componente | Entradas del cuadro que cubre | Depende de |
|---|---|---|---|
| [`consolas-plataformas-de-pagos.md`](consolas-plataformas-de-pagos.md) | consolas | ECP · Configuración de Plataformas de Pagos | nada (la 1.ª tanda); la entidad legal, para cobrar |
| [`consolas-seguimiento-de-temas.md`](consolas-seguimiento-de-temas.md) | consolas (+ secretaria) | ECP · Seguimiento de Temas | que el owner confirme QUÉ es |
| [`herramientas-internas-modelo-de-produccion.md`](herramientas-internas-modelo-de-produccion.md) | herramientas-internas | ECP · Procesamiento · Empacado | nada (la 1.ª tanda); la paridad del PVC, después |
| [`herramientas-internas-modelo-logistico.md`](herramientas-internas-modelo-logistico.md) | herramientas-internas | ECP · Costos en Puerto Colombia · en Puerto de Destino · Puerta a Puerta | nada (la 1.ª tanda); CN-8, después |
| [`consolas-gestion-de-muestras.md`](consolas-gestion-de-muestras.md) | consolas | OCP · Gestión de Muestras — **1.ª tanda EJECUTADA en la V5.80** (fase 3 del `PLAN_CIRCUITO_DEL_LOTE`): las dos tablas, el recibo con la partición del folio 7, el saldo derivado, salidas y pedidos de muestra; queda la 2.ª (alerta de 90 días, muestras para comprador) | nada |
| [`consolas-ctcx-selection-compras.md`](consolas-ctcx-selection-compras.md) | consolas | OCP · CTCx Selection · Compras — **1.ª tanda EJECUTADA en la V5.85** (fase 8 del `PLAN_CIRCUITO_DEL_LOTE`): `compras`, el alta a mano, el perfil único + imagen por lote, «Oferta desde CTCx Selection» = disponibilidad, el CRM de negociación retirado; **2.ª tanda EJECUTADA en la V5.87** (mezclas con la regla leída de `lectura.ts`, ubicación física, todo en kg de CPS); queda con el owner la decisión 4 (¿la mezcla es un lote nuevo con código público y ficha?) | Producción (la conversión a verde); Pagos (el carril) |

**Las tres rutas del proveedor y los dos módulos de asistencia** (`consolas`, 2026-09-23). El owner trajo tres diagramas —Ruta
Estándar · Ruta CTCx Selection · Ruta Desacoplado— y pidió dos módulos en el OCP: **Proveedor Desacoplado** y **Asistencia a
Proveedores** (entrar al perfil de un productor y hacer el proceso en su nombre). El brief compara paso a paso con lo que hay,
propone UN mecanismo para los dos (la sesión asistida: abrir KR como el productor, con rastro) y una cuenta sin buzón para el
desacoplado. [`consolas-rutas-del-proveedor.md`](consolas-rutas-del-proveedor.md) · **las siete decisiones están contestadas** (al final del
brief) y la **primera tanda está construida en la V5.75** (`/ocp/asistencia`, `/ocp/desacoplado`, «CTCx asume el costo»). Lo que
sigue: la 4b (el owner la revisa en el paso siguiente), la Ficha retenida y descargable (KR), el perfil único de CTCx Selection (Compras).

**Simplificar el OCP al circuito** (`consolas`, 2026-09-20). Lo pidió el owner al cerrar el vocabulario EUDR; lo escribe la sesión de
`kaffetal-regal` porque el cambio nace allí, pero el código es de `consolas`. Dos tandas: la **primera es media hora de vocabulario**
(columna «EVA» → «Visa», «Visa EUDR» → «Pasaporte EUDR») y cierra una divergencia hoy declarada en §3; la segunda reorganiza el OCP en
bandejas derivadas de `estadoDelCircuito()`. [`consolas-simplificar-ocp-al-circuito.md`](consolas-simplificar-ocp-al-circuito.md) ·
**cinco decisiones del owner**, que bloquean la segunda tanda pero no la primera.

**Compañeros de Finca** (`kaffetal-regal`, 2026-09-20). Pedido por el owner dentro de la tanda de interfaz de la V5.64 y
aplazado por él mismo a tanda propia el mismo día: no es interfaz, es **control de acceso** —tabla nueva, RLS, guard triggers y
revisar cada compuerta de escritura del productor—, y toca el contrato de **Identidad** de `ALINEACION` §1.
[`kaffetal-regal-companeros-de-finca.md`](kaffetal-regal-companeros-de-finca.md) · **bloqueado por cinco decisiones del owner**,
la más dura la del bucket `kaffetal-media` (la ruta `{producer_id}/…` no contempla que suba alguien que no es el dueño).

**Cotizador Courier (FedEx)** (`herramientas-internas`, 2026-09-23). Lo trajo el owner con el acuerdo de precios firmado con FedEx: calculadora de envíos courier (tarifa base publicada − descuentos del acuerdo + recargos a lista), modalidad courier del Modelo Logístico. ⚠️ El acuerdo es confidencial y el repo es público: las cifras viven solo en la base. [`herramientas-internas-cotizador-courier.md`](herramientas-internas-cotizador-courier.md) · **APROBADO y construido en la V5.68** (2026-09-23): vive en `/ecp/cotizador-courier`.

Orden recomendado si se aprueban todos: **Pagos → Muestras → Producción → Logístico → Compras**; Temas, cuando el owner diga qué es.
Las cuatro primeras tandas no se pisan entre sí y ninguna cambia un precio ni una regla.
