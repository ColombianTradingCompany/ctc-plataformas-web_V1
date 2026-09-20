# Brief · Simplificar el OCP al circuito real  (componente: `consolas` · slug: `ocp-al-circuito` · 2026-09-20)

> **Lo pidió el owner el 2026-09-20**, al cerrar el vocabulario EUDR: *«This is also a call to
> simplify the OCP to match this process and the way to visualize the information to be checked and
> accepted.»* Lo escribe la sesión de `kaffetal-regal` porque el cambio **nace** de allí (la V5.65
> movió las palabras), pero **el código es de `consolas`** y no se toca desde fuera (`ALINEACION` §2).

**Qué es** — Poner el OCP a decir lo mismo que el panel del productor, ahora que las palabras están
asentadas, y **reorganizar lo que el operador ve alrededor de lo único que hace: revisar y aceptar**.

**Para quién** — El equipo CTC que opera el circuito del lote.

---

## 1 · El vocabulario, que hoy está partido en dos

El owner lo cerró así (V5.65, escrito en la cabecera de `src/lib/eudr.ts`):

| Palabra | De qué objeto | Qué es |
|---|---|---|
| **Pasaporte** | la **finca** | su debida diligencia EUDR |
| **Visa** | el **lote** | se hereda del Pasaporte; **primer entregable de CTCx, y gratis** — la documentación EUDR no necesita al Q-Grader, así que llega **antes** de la EVA |
| **EVA** | el **lote** | **Evaluación de Muestras en Origen**: al Q-Grader y de vuelta con granulometría y perfil sensorial → el Punto y la Tríada → el Grado |

**Lo que sigue diciendo el OCP y ya no cuadra:**

- `src/app/ocp/(app)/kr/KrTabla.tsx:224` — la columna **«EVA»** nombra el **veredicto documental**.
  Con la definición nueva esa columna es la **Visa**. Hoy el OCP y el panel del productor **llaman EVA
  a cosas distintas**, y está declarado como divergencia deliberada en `ALINEACION` §3 (2026-09-20).
- `src/app/ocp/(app)/kr/EvaReviewCard.tsx:202` — el badge **«Veredicto EVA»**, mismo caso.
- La columna **«Visa EUDR»** de la finca en esa misma tabla pasa a **«Pasaporte EUDR»**.
- `markLotApto`, `lotEudrGate` y compañía: **los nombres de función no urgen** (no los lee nadie de
  fuera), pero si se tocan, que sea en esta tanda y no en tres.

⚠️ **Las etiquetas de estado ya cambiaron debajo**: `fincaEudrStatus()` y `lotEudrStatus()`
(`src/lib/eudr.ts`, V5.65) devuelven «Pasaporte vigente», «Pasaporte de finca en trámite», «Visa
lista»… y el OCP las pinta. O sea: **parte del OCP ya dice lo nuevo y sus encabezados dicen lo
viejo**. Esto no es cómodo de dejar quieto mucho tiempo.

## 2 · La simplificación de fondo

El owner no pidió solo renombrar: pidió que el OCP **se parezca al proceso**. El proceso, dicho por
él, tiene cuatro momentos de decisión y nada más:

1. **Visa** — CTCx revisa la documentación de la finca y la del lote, y emite. Gratis, y primero.
2. **MUE** — llegan la muestra y el pago; CTCx confirma **las dos** cosas.
3. **EVA → GRADO** — el Q-Grader devuelve sus dos informes y de ahí sale el Grado.
4. **CONT** — CTCx decide si el lote entra al catálogo y con qué oferta; el productor toma o no toma.

Ese orden **ya existe derivado** en `estadoDelCircuito()` (`src/lib/ocp/circuito.ts`, V5.62) y desde
la V5.64 lo importa también el panel del productor. **La simplificación es hacer que el rail y la
tabla del OCP sean ese circuito**, en vez de una tabla ancha con siete columnas donde el operador
tiene que reconstruir a ojo en qué punto va cada lote.

Propuesta concreta, para discutir:

- **Una bandeja por momento de decisión**, con el contador en el rail: *Por emitir Visa* · *Por
  confirmar muestra y pago* · *En evaluación* · *Por decidir oferta*. Son filtros de
  `estadoDelCircuito()`, no columnas nuevas ni estado guardado.
- **La vista completa del lote como el sitio donde se revisa y se acepta** (`?lote=`), con lo que hay
  que mirar arriba y el botón de aceptar abajo a la derecha — regla de la casa.
- **Lo que no es decisión, que no ocupe una columna**: el resto va a la vista completa.

## 3 · Lo que este brief NO propone

- Tocar `lots.stage` ni el enum: el circuito **se deriva**, y así debe seguir.
- Cambiar quién escribe el grado (`recordEvaluationVerdict`, «el puntaje manda»).
- Nada de la fase 4b, que sigue parada esperando al owner.

**Contratos que toca** — **Vocabulario congelado** (§1) y, si se reordena el rail,
`src/lib/panel/consoles.ts` + `rutasMovidas.ts`. No toca grados, ni identidad, ni el patrón Supabase.

**Guardián previsto** — extender `qa-rutas-consolas` con la costura de siempre (rótulo ↔ ruta ↔ clave
de permiso) y añadir a `qa-circuito-check` que **las bandejas del OCP salgan de `ORDEN_DEL_CIRCUITO`**
y no de una lista escrita a mano: es exactamente el fallo de familia que el log V45 ya anotó dos veces
(derivar la lista no basta; hay que derivar el inventario).

**Primera tanda** — **solo el vocabulario**: columna `EVA` → `Visa`, `Visa EUDR` → `Pasaporte EUDR`,
«Veredicto EVA» → «Veredicto de Visa». Es media hora, cierra la divergencia declarada y no mueve una
sola regla. La reorganización de bandejas va después, con el owner delante.

---

## Decisiones del owner (bloquean la segunda tanda, no la primera)

1. **¿Las cuatro bandejas sustituyen a la tabla ancha de `/ocp/kr`, o conviven con ella?** Propuesta:
   conviven — la tabla es el mapa, las bandejas son el trabajo del día.
2. **¿«Aceptar» es un botón por lote, o admite lote a lote en bloque?** Hay operaciones (confirmar
   pagos, confirmar muestras) donde el lote a lote es trabajo inútil.
3. **El «Centro de Calidad» del Q-Grader** (owner, 2026-09-20): login propio que recibe la lista y
   deja evaluar **en orden**. ¿Entra en esta tanda o es su propio brief? Propuesta: **propio**, porque
   es una superficie de socio con credenciales, no una pantalla del OCP.
4. **¿La Visa se emite a mano siempre, o se emite sola cuando la finca ya tiene Pasaporte?** Si es el
   productor quien nota que su Visa es «gratis y primero», una cola manual la vuelve lenta por diseño.
5. **¿Qué se enseña de un lote NO apto?** Hoy es una salida lateral del circuito y en el rail no vive
   en ninguna parte.
