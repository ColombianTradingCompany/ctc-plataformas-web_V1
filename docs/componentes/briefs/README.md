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
| [`consolas-gestion-de-muestras.md`](consolas-gestion-de-muestras.md) | consolas | OCP · Gestión de Muestras | nada |
| [`consolas-ctcx-selection-compras.md`](consolas-ctcx-selection-compras.md) | consolas | OCP · CTCx Selection · Compras | la fase 4b del overhaul; Pagos; Producción |

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
