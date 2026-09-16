# PVC · módulo del BCP · Business Core — plan de acople

Estado: **fase 1 ejecutada** (V5.28, 10-sep-2026): tablas, motor, `/bcp/pvc`, vista pública. **Las cinco decisiones de §8
están tomadas (owner, 15-sep-2026)** y el §9 fija lo que cambian; la fase 2 queda desbloqueada (dueño: `consolas`). El
modelo de referencia sigue en `apps-internas/PVC - Modelo/v2.0` (motor Python, dossier D0–D9, calculadora) y el tablero
interactivo en `C:\dev\ctc-platforms\reference\html_tools\PVC_Tablero_de_Control_CTC_V1.html` (copia servida:
`docs/pvc/tablero/PVC_Tablero.html`).

## 1. Qué es el módulo

El PVC (Ponderación de Valor de Cosecha) es el indicador principal del negocio: la referencia en COP/carga desde la que
se derivan el precio al productor (escalera por banda), el contrato de franja, el precio al comprador (pila FCA/CIP/DDP
en US$/kg) y la campaña. El módulo BCP es **la fuente única de ese valor para todo el sistema**, con tres capas
versionadas por separado:

| Capa | Qué versiona | Cadencia | Quién |
|---|---|---|---|
| Modelo (`pvc_model_versions`) | Los parámetros del método (prima, margen, multiplicadores, pila…) = el objeto `S` del tablero | Entre franjas, con acta | Comité PVC |
| Edición (`pvc_editions`) | Los números de una franja: entradas, salidas, PVC, escalera, pila, KPIs | **Fija por 3 meses**; se publica **7–8 semanas antes** de su fecha efectiva; + correcciones al alza | Publicación del owner |
| Dossier (`tool_versions` / storage) | Los PDF D0–D9, calculadora y one-pager regenerados con la edición publicada | Por edición | Pipeline Python |

**La cadencia, con las palabras del owner (2026-09-15):** el PVC **se fija por tres meses** y **se publica siete u ocho
semanas antes de su fecha efectiva**. Entre la publicación y el `valid_from` hay, por diseño, casi dos meses en los que
**dos ediciones están publicadas y solo una rige** — la vieja. Eso no es un caso raro: es el funcionamiento normal, y es
la razón de ser del hallazgo A1 (§10.2). La edición PVC-F4-2026 es la excepción (transición: publicada el 9-sep para
regir el 15-sep).

Además, un **ciclo** (`pvc_cycles`) es cada corrida semanal. **No recalcula el precio para publicarlo**: es la *lectura
del mercado* de esa semana — qué pasó, cuánto se ha separado de lo que el modelo pronosticó al corte, y qué novedades
hubo desde entonces (§10.3). El precio solo cambia al publicar la franja siguiente o al dispararse una corrección al
alza. Al llegar la fecha de corte, el ciclo de esa semana es el borrador que el comité revisa y publica.

## 2. Dónde vive en la consola

- Grupo de navegación **BCP · Business Core** (`src/lib/panel/consoles.ts`, `CONSOLES.bcp.nav[0]`), enlace `/bcp/pvc`
  con `ownerOnly`. La pestaña vacía `direccionamiento/modelo-economico` enlaza al módulo y explica la doctrina
  (el D2 en versión corta).
- Rutas: `src/app/bcp/(app)/pvc/` con tab strip (patrón `DireccionamientoTabs`):
  `tablero` (el tablero portado como componente cliente), `ediciones`, `ciclos`, `parametros`, `dossier`.
- Gate: `requireConsoleAccess("bcp")` en páginas; `requireConsoleWrite("bcp")` + `requireActiveAdmin` en
  `publicar`, `corregir`, `nueva_version_modelo`. Formularios con `ActionForm` (nunca `throw`).
- Motor compartido: `src/lib/pvc/motor.ts` (port TypeScript de `pvc_model_v2.py`; el JS del tablero ya es ese port)
  usado por el tablero, el endpoint de ciclo y las acciones de publicación. Test de paridad: `scripts/qa-pvc-motor.mjs`
  compara contra `_fuentes/vals.json` del motor Python (mismas 55 cifras que verifica la calculadora).

## 3. Datos (Supabase `public`, migraciones por MCP `apply_migration`)

```
pvc_model_versions  id, version text, params jsonb, notes, doc_hash, created_by, created_at            -- inmutable
pvc_editions        id, code text (PVC-F4-2026), model_version_id, status enum(draft|computed|published|corrected|superseded),
                    cut_date, publish_date, valid_from, valid_to, inputs jsonb, outputs jsonb, pvc_cop int,
                    hash, previous_edition_id, correction_of, published_by, published_at, dossier jsonb
pvc_cycles          id, edition_target text, kind enum(weekly|cut|trigger|manual), run_at, model_version_id,
                    inputs jsonb, outputs jsonb, diff jsonb, status, notes
pvc_sources         id, cycle_id, key text (fnc_daily, trm, ice_c_strip, fepcafe_cost, coop_board, enso, brl…),
                    value numeric, unit, captured_at, source_url, method enum(api|parse|manual|llm), confidence
pvc_trigger_watch   date, edition_id, fnc_fr94, pvc_vigente, hit bool, hits_15 int, fired bool
pvc_forecast_scores edition_id, realized_fnc_avg, prima_realizada, err_L, err_P, gobernó, cobertura, computed_at
```

- Guard-trigger `BEFORE UPDATE` (patrón existente en HANDOFF §schema): una edición `published` no se edita; una
  corrección al alza inserta otra fila con `correction_of`.
- Vista `public_pvc_current` (`SECURITY DEFINER`, como `public_transparency_pricing`): código, PVC, vigencia,
  escalera COP por banda, pila US$/kg por banda y nivel, MOQ, KPIs. Es lo único que leen el front público y los
  módulos comerciales.
- `audit_log` recibe publicar / corregir / nueva versión del modelo.

## 4. Sitios donde repercute (y los conflictos que hay que resolver antes)

| Sitio | Hoy | Con el módulo | Conflicto a decidir |
|---|---|---|---|
| `src/lib/grados/definicion.ts` (fuente única de bandas, enum `lot_grade`) | SCA de dos en dos: black 80–82, red 82–84, blue 84–86, gold 86–88, tyrian 88+ | **Escala de puntos CTC** (§9.1): el grado se lee de los puntos (1000–2500), que salen del SCA (base) más el surplus de variedad · proceso · reconocimiento; las bandas SCA de referencia son 80–83,9 / 84–85,9 / 86–87,9 / 88–88,9 / ≥ 89 | **#1 decidido**: `definicion.ts` pasa a `puntosCtc(sca, surplus)` + `gradoPorPuntos`; `gradoPorPuntaje(sca)` sobrevive como «grado sin surplus» (CCC). `GradosBoard`, jsonLd y `GradosSection` cambian solos |
| `purchase_contracts.reference_price_source/_snapshot`, `price_per_kg_locked`, `grade_snapshot` (`ocp/contractActions.ts`) | Referencia escrita a mano ("ICE C + Fedecafé") | FK a `pvc_editions` + multiplicador + coeficiente FR; precio congelado = PVC × coef FR × mult ÷ 125 por kg pergamino | Carga vs kg: el contrato guarda por kg; el PVC por carga. Mostrar ambos |
| `lot_offers.price_per_kg` (`ofertasActions.ts`, `producerActions.ts`) | Precio libre | Derivado de edición × banda; la oferta muestra "PVC-F4-2026 × 1,15"; reemisión automática −5% por franja | — |
| `lot_listings.price_per_kg, moq_kg, unit_kg` y Cherry Picked (`CherryPickedExperience`, `LotCard`, `data.ts`) | `ASSOC_BLACK_MOQ = 350`, precio libre | Precio = pila N2/N3/N4 en US$ a la TRM del corte; **MOQ en unidades de 6 kg** por banda: 56 · 42 · 26 · 13 · 6 = 336 · 252 · 156 · 78 · 36 kg (§9.2) | **#2 decidido**: `ASSOC_BLACK_MOQ` se retira; `moqPorGrado` sale de la edición |
| `market_anchors` + cron `/api/cron/market-anchors` (11:10 UTC, `parseFnc`) | Sólo FNC carga | Añadir kinds `trm` (datos.gov.co 32sa-8pi3) e `ice_c_strip` (del ticker); la ventana de 30 días y los dos disparadores (FNC y TRM, §9.3) se calculan de aquí | **#4 decidido**: Vercel está en **Pro** para CTCx → el ciclo semanal es un cron de Vercel más; Make queda como bus de `pvc.*` |
| Subastas Tyrian (`src/lib/subastas`, `precio_salida_eur_kg`) | Salida en EUR | **Corregido §12.7**: una sola subasta por lote, en verde; **el bid es sobre FOB puerto Colombia** y el programa se elige al cerrar, con los recargos por programa sumados después | **Se mantiene EUR/kg** y la adjudicación por el OCP; las reglas de ajuste por programa se **publican antes** de abrir la puja |
| Roast landing (`FEE_EUR_KG = 9.50`, MOQ por grado) | Constantes | Tarifa CTCx = base × factor de banda + recargo por nivel, desde la edición; se exhibe en la moneda del destino | Misma doctrina de moneda (§9.3) |
| Arena (`ARENA_FEE_COP`, `EVALUATION_FEE_COP`) | Constantes | Tarifa de evaluación $200.000 y subsidios 30/50/60/70 desde `pvc_model_versions.params` | — |
| `public_transparency_pricing`, jsonLd SEO | — | Exponen `public_pvc_current` | Sneak peek sigue sin precio (`qa-sneak-peek-check.mjs`) |
| `/bcp/documentacion/[file]`, `tools` + `tool_versions` | Registro de herramientas versionadas | El dossier D0–D9 + calculadora + one-pager se registran por edición (`tool_versions`) y se sirven desde storage `pvc/<código>/` | **#5 decidido**: el pipeline Python corre en una **GitHub Action** (`repository_dispatch` desde `pvc.published`); los artefactos suben a storage |
| Cola de integraciones → Make (`src/lib/integraciones/emit.ts`) | Eventos de dominio | `pvc.published`, `pvc.corrected`, `pvc.cycle_ready`: Canva del one-pager, correo a productores (D8), WhatsApp, campaña D9 | Regla vigente: las Server Actions insertan en la cola, nunca llaman el webhook |

## 5. El ciclo semanal (automatización)

1. **Lunes 06:00 COT · cron de Vercel** (`vercel.json`, plan Pro desde la decisión #4) llama `POST /api/pvc/cycle` con
   `CRON_SECRET`. Make ya no programa nada del PVC: recibe `pvc.*` por la cola y reparte (Canva, correo, WhatsApp).
2. **Captura** (`src/lib/pvc/fuentes/*.ts`, cada una escribe `pvc_sources` con url, hora, método y confianza):
   - FNC diario y mensual: Excel "Precios, área y producción de café" y `precio_cafe.pdf` (ya hay `parseFnc`).
   - TRM: API datos.gov.co. ICE C strip: `src/lib/market/ticker.ts`.
   - FEPCafé costo mensual (PDF), tableros de cooperativas, NOAA ENSO, BRL, Brent, fertilizantes: extracción con
     modelo pequeño sólo para lo no estructurado (disciplina de costo de IA: programático primero; el LLM extrae
     un número y su cita, nada más). Lo que no se captura queda `manual` con aviso.
3. **Cálculo** con `motor.ts` y la versión de modelo vigente: edición preliminar de la próxima franja, escalera,
   pila, KPIs, back-proof incremental. Se guarda `pvc_cycles` con `diff` frente al ciclo anterior (qué dato movió
   el número y cuánto).
4. **Aviso** al owner (Resend): las tres cifras KPI, el término que gobierna, lo que cambió y las fuentes con baja
   confianza. Enlace al tablero con el ciclo cargado.
5. **Corte** (último día hábil de M−3): el ciclo se marca `cut`; el comité revisa el scorecard en `/bcp/pvc/ediciones`
   y publica. La publicación fija `pvc_editions.published`, regenera el dossier y emite `pvc.published`.
6. **Diario durante la franja**: el cron de `market_anchors` escribe `pvc_trigger_watch`; al cumplirse 10 de 15
   se crea una edición `corrected` en borrador y se avisa; el owner confirma.

## 6. Análisis de certeza (cada tantos ciclos)

Al cerrar cada franja, `pvc_forecast_scores` guarda lo realizado contra lo previsto: FNC promedio de los tres meses de
venta, prima realizada, error de la proyección P y de la mirada atrás L, término que gobernó, cobertura y disparos.
Cada cuatro franjas el módulo produce un **informe de afinación**: sensibilidad de la prima realizada a prima objetivo,
peso L/P, tope de impulso y PEC-ADD, con rangos acotados (nunca baja un multiplicador dentro de franja; el piso no se
toca). El owner acepta o no; aceptar crea una fila nueva en `pvc_model_versions` y el D0 registra el cambio. Es la
misma prueba que hoy hace el back-proof, pero con datos propios de la plataforma (ventas, retiros, llamados) además
de la serie FNC.

## 7. Fases

| Fase | Entrega | Gate |
|---|---|---|
| 0 (hoy) | Tablero HTML en `reference_html_tools`; registrarlo en `tools`/`tool_versions` | — |
| 1 | Tablas, `motor.ts` + paridad, `/bcp/pvc` con tablero, ediciones y publicar; vista pública | `tsc`, eslint, build; V5.28 + CHANGELOG |
| 2 | `definicion.ts` con la escala de puntos (§9.1) y `qa-grados-check` al día; MOQ por unidades (§9.2); contratos, ofertas, listados y subastas leen la edición en US$ FOB y exhiben en la moneda del destino (§9.3) | QA de rutas y sneak peek; el owner valida la escala con la calculadora antes del cambio |
| 3 | Endpoint de ciclo, capturas, cron semanal de Vercel, avisos, dossier por edición vía GitHub Action a storage | Prueba de un ciclo completo antes del corte del 30-sep-2026 |
| 4 | Disparador diario, certeza, informe de afinación | Primera franja cerrada (F4-2026) |

## 8. Decisiones tomadas por el owner (2026-09-15)

| # | Pregunta | Decisión | Detalle |
|---|---|---|---|
| 1 | Bandas de grado | **Una escala de puntos CTC, anclada en el SCA pero no determinada solo por él.** Base SCA 80–83,9 / 84–85,9 / 86–87,9 / 88–88,9 / ≥ 89; el grado se lee de los puntos: 1000–1399 Black · 1400–1599 Red · 1600–1799 Blue · 1800–2000 Gold · > 2000 Tyrian. Se aleja a propósito de las cifras SCA para no parecer una tergiversación del puntaje | §9.1 (el modelo, completado a partir de la gráfica y las notas del owner) |
| 2 | MOQ | **En unidades de 6 kg**, con los kilos ajustados: Black 56 u = 336 kg · Red 42 u = 252 kg · Blue 26 u = 156 kg · Gold 13 u = 78 kg · Tyrian 6 u = 36 kg | §9.2 |
| 3 | Moneda | **US$ para el precio FOB del periodo**; CIF y DDP se adaptan a EUR o a la moneda de la geografía del comprador. El dólar es el **normalizador** entre el origen (COP) y las demás monedas | §9.3 (incluye la protección contra movimientos extraordinarios de la TRM que pidió el owner) |
| 4 | Ciclo semanal | **Cron de Vercel**: CTCx está en plan Pro, no hay límite de dos crons. Make no programa nada del PVC | §5 |
| 5 | Pipeline del dossier | **Opción A: GitHub Action**, artefactos a storage `pvc/<código>/` | §4 (fila de documentación) |

## 9. Lo que las decisiones fijan

### 9.1 La escala de puntos CTC (decisión #1)

**Doctrina.** El puntaje SCA sigue siendo el ancla —sin él no hay grado— pero el grado se lee de una escala propia de
puntos (1000–2500) en la que también cuentan tres atributos del lote, cada uno en tres niveles (C · B · A), a los que
el owner llama el **surplus**:

| Atributo | C | B | A |
|---|---|---|---|
| Variedad | **Regional / Tradicional** | **Especial / Híbrido** | **Exótica / Rara** |
| Proceso | **Lavado** | **Honey · Natural · infusiones** | **Experimental · fermentaciones · co-fermentaciones** |
| Reconocimiento | ninguno | 1 a 3 | 4 o más — solo reconocimientos **relevantes y verificables** (no cualquier certificación menor; el OCP los verifica antes de contar) |

**Los nombres.** Al conjunto de las dos medidas se le llama **«El Punto y la Tríada»**: el Punto es el puntaje SCA;
la Tríada son las tres letras (variedad · proceso · reconocimiento), *lo que el café tiene además de la taza*. Antes
de las dos hay una condición previa —los tres físicos (§9.1.b)— que no da puntos: da el derecho a que el lote lleve un
grado. Para no confundirla con la Tríada, en los textos se la llama **«la Base física»** (el owner la enunció como
«tríada de calidad»; el nombre queda por confirmar).

**Las tres clases de variedad** (definiciones del owner, 2026-09-15):

- **C · Regionales / Tradicionales.** Los caballos de batalla de la caficultura. Incluyen las genéticas fundacionales
  (Typica, Bourbon) y las variedades desarrolladas por institutos nacionales para adaptarse al clima local y resistir
  enfermedades (la roya). Perfiles de taza clásicos, achocolatados, de acidez media y excelente rendimiento agronómico.
- **B · Especiales / Híbridos.** Cruces botánicos o mutaciones que logran un punto intermedio excepcional. Atributos en
  taza muy superiores o diferenciados, muchas veces con características físicas únicas (el grano gigante del Maragogype
  o el Pacamara) o una excelente arquitectura de planta y resistencia con alta calidad sensorial.
- **A · Exóticas / Raras.** Variedades (a menudo de origen etíope o mutaciones espontáneas) con perfiles de taza
  extraordinariamente complejos, florales y frutales. Rendimientos muy bajos, cuidados agronómicos extremos y los
  precios más altos en subastas y mercados internacionales.

**Catálogo de variedades** (la semilla de `VARIEDAD_NIVEL`; tabla del owner 2026-09-15 más los acuerdos de la reunión
G&G del mismo día; **se revisa al menos cada tres meses** para seguir al mercado):

| C · Regional / Tradicional | B · Especial / Híbrido | A · Exótica / Rara |
|---|---|---|
| Castillo | Tabi | Geisha (Gesha) |
| Caturra *(la reunión G&G la movía a B — confirmar)* | Bourbon Rosado (Pink Bourbon) | Chiroso |
| Colombia | Pacamara | Sudan Rume |
| Typica | Maragogype | Wush Wush |
| Mundo Novo | SL28 y SL34 | Eugenioides (especie distinta) |
| Cenicafé 1 | Java | Laurina (Bourbon Pointu) |
| Lempira | Maracaturra | Mokka |
| Catimor | Ruiru 11 | Papayo |
| Garnica | Batian | Aji |
| | Sarchimor | Purpurascens |
| | Obatá | Sidra |
| | Catuaí *(acuerdo G&G: a B)* | |
| | Bourbon Rojo y Amarillo *(acuerdo G&G: a B)* | |

En la tabla del owner, Catuaí y Bourbon Rojo/Amarillo quedaron en una columna desplazada (junto a un «Bourbon Rosado»
repetido); se colocan en B siguiendo el acuerdo de la reunión («mover Bourbon Rojo, Caturra y Catuaí a Especiales»).
Caturra sigue en C porque la tabla, posterior a la reunión, la deja ahí — **el owner confirma esas dos filas**. Toda
variedad fuera del catálogo se trata como C hasta que el comité la clasifique.

Las tres reglas de `definicion.ts` (2026-08-05) evolucionan así: **(1) los puntos mandan** —el grado no se negocia, se
lee de los puntos—; **(2) los criterios cualitativos ya no son solo guía de valor: entran en los puntos como surplus**,
pero nunca sustituyen al SCA (ver las puertas); **(3) dos decimales en el SCA, puntos enteros.**

**La narrativa: leer un café entero.** Esta es la explicación que va delante del modelo — la que el productor, el
comprador y Notion deben leer antes que ninguna fórmula (en fase 2 es la fuente del copy de `GradosSection`, de la
Ficha y de la página «Grados de Calidad CTC» que reescribe la Secretaría).

> **La taza es el suelo; el surplus es la altura.** El puntaje SCA dice qué tan bien está resuelto un café en la taza:
> limpieza, dulzor, acidez, cuerpo, balance. Es la medida más honesta que tiene el oficio, y por eso es el ancla: sin
> taza no hay grado, y ningún atributo la maquilla. Pero la taza no dice cuán difícil es que ese café exista. Eso lo
> dicen tres cosas que la taza no puede ver: **de qué planta viene** (variedad: común, exótica, rara), **qué manos y
> qué riesgo hubo en el beneficio** (proceso: clásico, natural o infusión, experimental o co-fermentado) y **quién más
> lo ha mirado** (reconocimiento: ninguno, algunos, muchos). A eso la casa lo llama el **surplus**: lo que el café
> tiene *además* de la taza. Un café íntegro es las dos cosas a la vez, y la escala CTC mide las dos a la vez.
>
> **Por qué el surplus multiplica.** Un varietal raro en una taza de 82 es una promesa; en una de 90 es un hecho. El
> mismo atributo vale más cuanto mejor es la taza que lo sostiene, y por eso el surplus es un porcentaje del café y no
> una cantidad fija de puntos: cada B vale +4,27 %, cada A +8,54 %, y los tres A juntos (+25,6 %) son exactamente el
> tramo que separa el techo de un café común (1990) del techo de la escala (2500). Sumar puntos fijos diría que la
> rareza vale igual en cualquier taza; no es verdad ni en la finca ni en el mercado.
>
> **Las tres puertas.** *Debajo de 80 no hay café de especialidad*, y no hay atributo que lo compense: el surplus no se
> aplica; la escala empieza donde empieza la especialidad. *80 a 81,99 es el umbral*: un café común se queda fuera
> (600–999 puntos: cerca, pero no dentro); un café con algo que contar —una variedad exótica, un natural, un
> reconocimiento— entra, y entra como si fuera un 82: la casa le abre la puerta por lo que promete, no le regala una
> banda. *La taza sola nunca es Tyrian*: un café común de 88 es **excelente** en la taza y es un Blue; uno de 89 o más
> es **extraordinario** y es un Gold — el Gold enaltece la taza. Tyrian es otra cosa: exige un 89 **y** exige surplus,
> porque lo extraordinario del origen no cabe en una sola medida. Y cuanto mejor la taza, menos surplus necesita: a 89
> hacen falta tres cosas que contar (BBB, o un A y un B); a 91,5, dos; a casi 96, una; con ninguna, nunca. Así el número
> de Tyrian posibles no se sobreestima: la puerta es doble, y la abren la taza y el origen juntos.
>
> **Cada grado, leído entero.**
> **Black — the essence of origin.** Una cosecha verificada que llega a 82 en la taza sin más, o a 80 con algo que
> contar. Es el café que la casa se atreve a firmar.
> **Red — the soul of the harvest.** Un 84 común, o un 83 con surplus. La taza ya tiene carácter propio.
> **Blue — the edge of perfection.** Un 88 común: la taza excelente por sí sola. Con surplus se alcanza antes: 86 con
> una cosa que contar, 84,3 con tres.
> **Gold — the standard of excellence.** Un 89 común: la taza extraordinaria. O un 88 con tres cosas que contar; un
> 84,5 con todo.
> **Tyrian — the highest rarity tier.** Nunca por la taza sola. Un 89 con tres cosas que contar; un 91,5 con dos; un 96
> con una; un 100 común, no.

Las letras del surplus se escriben **siempre en el orden Variedad · Proceso · Reconocimiento**: «BCC» es variedad
exótica con proceso y reconocimiento comunes; «CCB» es un café común con 1 a 3 reconocimientos.

**El modelo** (segunda propuesta, 2026-09-15, tras la revisión del owner de la primera: el surplus **no es una suma de
puntos fijos**, es un **porcentaje del café**; la entrada a la escala es una **puerta**, no aritmética):

```
base(SCA): interpolación lineal entre las anclas de la línea CCC de la gráfica
   (82, 1000) (84, 1400) (86, 1540) (88, 1600) (89, 1800) (100, 1990)
   (86 sube de 1500 a 1540 por decisión del owner 2026-09-15: una sola letra B a 86 ya es Blue)
   por debajo de 82 sigue la misma pendiente que 82→84 (200 puntos por punto SCA): 80 → 600 · 79 → 400 · 77 → 0

M(V, P, R) = 1 + K · (w(V) + w(P) + w(R))        w(C) = 0 · w(B) = 1 · w(A) = 2
   K = (2500 / 1990 − 1) / 6 ≈ 0,0427  →  cada B vale +4,27 %, cada A +8,54 %, AAA = ×1,2563
   (K no se elige a mano: es exactamente lo que lleva el techo del café común, 1990, al techo de la escala, 2500)

puntos(SCA, V, P, R) =
   SCA < 80          → round(base(SCA))                 el surplus no aplica: nunca llega a 1000
   80 ≤ SCA < 82     → CCC: round(base(SCA)) — no entra (600–999)
                       con al menos un B o un A: round(1000 × M) — entra «como si fuera un 82»
   SCA ≥ 82          → round(base(SCA) × M), tope 2500
   Tyrian exige SCA ≥ 89 (decidido por el owner 2026-09-15): con 82–88,99 el resultado se topa en 2000 (techo de Gold)

grado(puntos): < 1000 sin grado · 1000–1399 Black · 1400–1599 Red · 1600–1799 Blue · 1800–2000 Gold · 2001–2500 Tyrian
```

**Por qué multiplicativo.** En la gráfica el valor del surplus **crece con el SCA**: AAA vale +200 sobre CCC a 84,
+300 a 86, +400 a 88–89 y +500 a 100. Eso es un porcentaje (≈ +25 % en todos), no una cantidad fija — un varietal raro
con proceso experimental vale más cuanto mejor es la taza. Una suma con pesos fijos es plana y no puede llegar a 2500
sin regalar Tyrian a 84. El único sitio donde la gráfica salta en vez de escalar es la entrada (un solo B lleva un 80 de
500 a 1000): ese salto es la **puerta** de las notas, y así se modela.

**Las puertas** (las notas de la gráfica, cumplidas por construcción):

- **Puerta 0 — la Base física (§9.1.b).** Antes de mirar el Punto y la Tríada, el lote tiene que cumplir los tres
  físicos: factor de rendimiento **> 94**, humedad **10–12 %** y densidad **dentro del rango de su variedad**. Sin eso
  no hay grado que nombrar: el lote queda «apto en taza, pendiente de físico» y no entra en la escala.

- **SCA < 80 → sin grado, sea cual sea el surplus.** La base sigue bajando 200 puntos por punto SCA y el multiplicador
  no aplica: un 79,99 AAA computa 598.
- **Con 80–81,99 solo se entra con al menos un B.** El café común queda entre 600 y 999 (CCC:80 = 600, proporcional a
  la pendiente de la línea, como pidió el owner; en la gráfica de ejemplo eran 500). Con surplus, el café entra como si
  fuera un 82 (1000 × M) — continuo con lo que vale el mismo surplus a 82. El mínimo real sin surplus es **82 SCA**.
- **Un café CCC nunca toca los 2000**: CCC:100 = 1990, el techo de Gold. Tyrian exige surplus **y** SCA ≥ 89 (la banda
  SCA de referencia «≥ 89»): un AAA de 88 se queda en 2000 = Gold, exactamente como está dibujado. Desde Blue, el café
  común va **una banda por debajo** de su banda SCA (CCC:86 = Red, CCC:88 = Blue, CCC:89 = Gold): el surplus es lo que
  la recupera — «los puntos debajo de la raya requieren al menos un aumento proporcional en SCA o al menos un surplus
  más alto en cualquier métrica».

**Contraste con los puntos de la gráfica** (banda que dibuja el owner → banda que da el modelo):

| SCA | CCC | BCC (= CBC = CCB) | BBC | BBB | AAA |
|---|---|---|---|---|---|
| 80 | no entra 600 ✓ | Black 1043 ✓ | | Black 1128 ✓ | Black 1256 (**dibujado Red 1400**) |
| 82 | Black 1000 ✓ | | | | |
| 84 | Red 1400 ✓ | | | Red 1579 ✓ | Blue 1759 ✓ |
| 86 | Red 1540 ✓ | Blue 1606 *(cambio del owner: BCC:86 y CBC:86 son Blue)* | | Blue 1737 ✓ | Gold 1935 ✓ |
| 88 | Blue 1600 ✓ | Blue 1668 ✓ | Blue 1737 (**dibujado Gold 1800**) | Gold 1805 ✓ | Gold 2000 ✓ |
| 89 | Gold 1800 ✓ | | | Tyrian 2031 (**dibujado Gold 2000**) | Tyrian 2261 ✓ |
| 100 | Gold 1990 ✓ | | | Tyrian 2245 ✓ | Tyrian 2500 ✓ |

**Los tres puntos que se mueven, y por qué no se pueden salvar los tres.** (a) **AAA:80 = Red** es incompatible con
AAA:100 = 2500: si tres A valieran ×1,40 a 80, valdrían ×1,40 a 100 (2786). Con el multiplicador que cierra en 2500,
un 80 con todo el surplus es un Black alto (1256), y el owner decide si eso le vale — es coherente con la puerta: el
surplus a 80 compra la entrada, no dos bandas. (b) **BBC:88** queda en Blue (1737): dos B valen +8,5 %, no una banda
entera; a 88 la banda la dan tres B (1805). (c) **BBB:89 = Tyrian** (2031): a 89 ya se cumple el SCA de Tyrian y tres
B sobre 1800 pasan de 2000 por 31 puntos; el dibujo lo deja justo en la raya. **El owner lo confirmó el 2026-09-15**:
la puerta de Tyrian es SCA ≥ 89 **y surplus**, sin exigir un A — BBB:89 es Tyrian. Su razón: no sobreestimar el límite
de algo que ya es más que extraordinario (un 88 común es excelente y es Blue; un 89+ común es extraordinario y es un
Gold que enaltece la taza), y a la vez no admitir a ningún lote como Tyrian solo por su SCA: **CCC nunca es Tyrian**.

**Umbrales: el SCA mínimo para cada grado según el surplus** (calculado del modelo; Σw = w(V)+w(P)+w(R)):

| Surplus | Σw | Black | Red | Blue | Gold | Tyrian |
|---|---|---|---|---|---|---|
| CCC | 0 | 82,00 | 84,00 | 87,99 | 89,00 | **nunca** |
| BCC · CBC · CCB | 1 | 80,00 | 83,72 | 85,92 | 88,63 | 95,87 |
| BBC · ACC (y equivalentes) | 2 | 80,00 | 83,45 | 85,06 | 88,29 | 91,50 |
| BBB · ABC (y equivalentes) | 3 | 80,00 | 83,21 | 84,26 | 87,84 | 89,00 |
| AAC · ABB | 4 | 80,00 | 82,98 | 83,84 | 85,96 | 89,00 |
| AAB | 5 | 80,00 | 82,77 | 83,60 | 85,19 | 89,00 |
| AAA | 6 | 80,00 | 82,58 | 83,37 | 84,47 | 89,00 |

Contra los acuerdos de la reunión G&G (2026-09-15): Black «82 con CCC, 80 con al menos un B» ✓; Red «desde 84, o
≈ 83,5 con tríada favorable» ✓ (83,72 con una B); Blue «≈ 88 con CCC, ≈ 86 con dos o más B, ≈ 84,5 con BBB» ✓ (87,99 ·
85,06 · 84,26) — y con **una** B el owner bajó después el umbral de ≈ 87 a 86 (BCC:86 = Blue) ✓; «desde CCC no se
puede llegar a Tyrian» ✓. Los cambios pedidos el mismo día: BCC:86 y CBC:86 Blue (1606) ✓, CCB:87 Blue (1637) ✓,
ABB:84 Blue (1639) ✓. Con pesos iguales, CCB:86 también es Blue (1606); si el reconocimiento debe pesar menos que la
variedad y el proceso, ahí está la palanca (`w` por atributo).

Lo que la tabla enseña de un vistazo: el surplus adelanta cada banda, pero nunca la regala (Black siempre pide 80 con
algo, 82 sin nada); Tyrian tiene un suelo que no se mueve (89) y un techo que solo el surplus abre.

**Lo que queda por confirmar** (owner): que las tres atribuciones pesan igual (`w` es el mismo para variedad, proceso
y reconocimiento; CCB:86 = Blue lo delata) · el caso AAA:80 (Black alto) · Caturra (C en tu tabla, B en la reunión) y
Catuaí / Bourbon Rojo-Amarillo (a B por la reunión) · el criterio de «reconocimiento relevante y verificable» (qué cuenta
y qué no) · el nombre de la Base física · las densidades de referencia por variedad (§9.1.b). **Se valida con la
calculadora del artefacto «PVC · Cinco decisiones» antes de que la fase 2 toque `definicion.ts`.**

**La especificación alternativa** (`especificacion-grados-ctc.md`, 2026-09-15 15:24, del socio): se leyó entera. Sus tres
restricciones se cumplen aquí — R1 (tope duro 2500, por K derivada), R3 (la excelencia en proceso y reconocimiento no
es atajo: AAA:84 = Blue, AAA:88 = Gold, Tyrian exige 89) — salvo **R2** (ventanas duras por variedad: C solo hasta Blue,
A desde Blue), que **no se adopta**: contradice los acuerdos del mismo día (un CCC de 89 es Gold; la entrada a 80 la
compra cualquier B, no solo la variedad) y la gráfica del owner. El modelo multiplicativo que esa especificación
descarta (§3.1) era otro —sin techo y sin puerta—; este tiene los dos. Lo que sí se toma de ella: la suite de casos
como semilla de `qa-grados-check`, y las invariantes I1 (1000–2500), I5/I7 (2500 solo con AAA y SCA 100; Tyrian solo
desde 89) e I8 (monotonía en SCA, V, P y R), que el guardián comprobará por enumeración.

**De dónde salen las letras** (fase 2, dueño `consolas`): Variedad y Proceso se derivan de la Ficha Técnica del lote
(`lot_fichas.variety` / `.process`) por dos catálogos en `definicion.ts` (`VARIEDAD_NIVEL` —el catálogo de arriba— y
`PROCESO_NIVEL`); el Reconocimiento es una lista nueva (`lot_fichas.reconocimientos`: nombre · año · enlace · verificado
por), y solo cuentan los que el OCP marcó verificados. **El productor declara los tres** —los conoce mejor que nadie
(acuerdo G&G)— y CTC los verifica. El veredicto del Q-Grader (`recordEvaluationVerdict`) pasa a llamar
`puntosCtc(sca, surplus)` **solo si la Base física está cumplida** y a guardar los puntos y las letras en `lots`
(`ctc_points`, `surplus jsonb`) al lado del `grade`; la Ficha y el catálogo los exhiben. `gradoPorPuntaje(sca)`
sobrevive como «el grado sin surplus» y `qa-grados-check` gana las puertas y las invariantes.

### 9.1.b La Base física (la condición previa)

Acuerdo G&G y nota del owner (2026-09-15): antes del grado, el lote cumple tres físicos, que CTC pide junto a la
Tríada y que el formato de características físicas de la Ficha pasa a registrar (`lot_fichas.physical_data` gana los
tres campos; hoy `lot_evaluations` ya lleva `factor_rendimiento` y `physical_data`):

| Físico | Umbral | Quién lo mide |
|---|---|---|
| Factor de rendimiento | **> 94** | laboratorio de CTC (planilla del Q-Grader) |
| Humedad | **10–12 %** | laboratorio de CTC |
| Densidad | **dentro del rango de referencia de la variedad** (tabla `DENSIDAD_REFERENCIA` por variedad, pendiente del comité) | laboratorio de CTC |

No suma puntos ni resta: es una puerta. Un lote que no la cumple no recibe grado («pendiente de físico»), y el productor
ve cuál de los tres falló. La reunión fijó además la expectativa: **al menos 1 de cada 5 cafés no debería pasar** los
criterios mínimos — si todos pasan, la puerta está mal puesta.

### 9.1.c La escala para cada avatar

El material técnico de arriba se lleva a un plano emocional, uno por persona. El marco común, en palabras del owner:
*la escala de grados CTCx se mide en «El Punto y la Tríada», que juntas significan un marco lógico matemáticamente,
coherente conceptualmente y justo entre sus partes.* De ahí, cada avatar lee lo suyo:

- **Productores — una vara clara para lo que pueden ofrecer, y recibir.** El Punto se lo da la taza; la Tríada ya la
  tiene: sabe qué sembró, cómo lo benefició y quién lo ha premiado. Con las dos ve, antes de vender, a qué grado aspira
  su lote y qué le falta para el siguiente — un varietal, un proceso, un reconocimiento — y sabe que el precio que sigue
  al grado es el mismo para todos: *«nuestro precio obedece a un estudio juicioso del mercado; no hacemos margen de
  negociación porque queremos ser justos con todos»* (acuerdo G&G). La escala no le pide que negocie: le pide que mejore.
- **Tostadores — una garantía de calidad, confianza y diferenciación.** Un grado CTC no es un puntaje repetido: es una
  taza medida **y** un origen verificado, con los físicos que hacen que ese café llegue al tambor como se prometió.
  Blue dice «excelente en taza»; Gold, «extraordinario»; Tyrian, «extraordinario y además raro» — y el tostador puede
  contar por qué, con las tres letras delante del cliente.
- **HORECA — un producto de alto atractivo y valor percibido para mis clientes.** El grado es una historia corta que
  cabe en una carta: el color, el lema y la Tríada (de qué planta, qué manos, qué reconocimiento). Vende la taza sin
  tener que explicar el SCA, y vende la diferencia entre un Red y un Gold sin bajar el precio del Red.
- **Consumidor final — la experiencia del café a otros niveles, y un lazo directo a su sostenibilidad.** Detrás de cada
  grado hay un productor con nombre, una variedad que existe porque alguien la cuidó y un precio que llegó a la finca
  por una regla pública. El grado es la puerta a la Ficha: lo que bebe, de dónde viene, y qué parte de lo que pagó
  se quedó en el origen.

Esos cuatro textos son la semilla del copy por superficie (KR para productores; Cherry Picked Green y Roast para
tostadores; CaaS/HORECA; Cherry Picked X y la Ficha pública para el consumidor) y de la página «Grados de Calidad CTC»
de Notion. Se escriben en los tres idiomas cuando la fase 2 los lleve a código.


### 9.2 MOQ y empaque (decisión #2, con el addendum del 2026-09-16)

> ⚠️ **SUPERADO en parte por el §12.6** (CEO, 2026-09-16). El MOQ se dice **en cargas** y es una restricción del
> **origen**, igual para todo programa; el empaque **se mantiene, pero como presentación, no como mínimo**. Gold y Tyrian
> pasan a **«1 carga o menos, según disponibilidad real»**. Lo de abajo queda como historia del razonamiento.

Merma pergamino → verde 70 %; carga = 125 kg CPS; FR 94 → 93,09 kg de excelso por carga; 78 kg garantizados por carga.

**Primera versión (15-sep), en unidades de 6 kg** — sigue valiendo como la conversión a kilos entregados:

| Grado | Cargas mín. | kg CPS | kg verde | Unidades (máx.) | MOQ unidades | kg ajustados | Colchón |
|---|---|---|---|---|---|---|---|
| Black | 4 | 500 | 350 | 58,0 | 56 | 336 | −14 kg (−4,0 %) |
| Red | 3 | 375 | 262,5 | 43,0 | 42 | 252 | −10,5 kg (−4,0 %) |
| Blue | 2 | 250 | 175 | 29,0 | 26 | 156 | −19 kg (−10,9 %) |
| Gold | 1 | 125 | 87,5 | 14,0 | 13 | 78 | −9,5 kg (−10,9 %) |
| Tyrian | 0,5 | 62,5 | 43,75 | 7,0 | 6 | 36 | −7,75 kg (−17,7 %) |

**Addendum del owner (16-sep): el empaque son dos estándares, y el mínimo de Black y Red lo fija la mezcla.**

**El empaque.** No hay cinco formatos con cinco costos: hay **dos estándares**, y dentro de uno el formato es elección
del comprador con **un solo estimado de costo**.

| Estándar | Grados | Formatos |
|---|---|---|
| **Vacío** | Blue · Gold · Tyrian | **3 · 6 · 12 kg** — *los tres en un solo estimado, no tres* |
| **GrainPro-type + yute** | Black · Red | **35 kg** |

Eso cambia la unidad de venta de Black y Red: el saco de 35 kg, no la bolsa de 6. Y cambia el KPI de verde empacado
(§11.5): el costo de empaque deja de ser un número por grado y pasa a ser **dos** parámetros del modelo, uno por
estándar, traídos del Cotizador de Empaque del ECP.

**El mínimo de Black y Red sale de la mezcla, no del kilaje.** Los dos son **combinaciones de lotes**, y el mínimo es
que cada lote de la mezcla aporte al menos una carga, con la mezcla sin bajar de tres:

| Lotes en la mezcla | MOQ | Reparto |
|---|---|---|
| **2 lotes** | **4 cargas** | 2 de cada uno |
| **3 lotes** | **3 cargas** | 1 de cada uno |
| **4 lotes** | **4 cargas** | 1 de cada uno |

**Una mezcla de cinco no existe**: con seis lotes se hacen dos mezclas de tres. Vale igual para Black y para Red.

**Lote único: el mínimo es del lote.** **Blue: 2 cargas.** **Gold: 1 carga** como estándar. **Gold y Tyrian** admiten,
en casos particulares, bajar hasta **un saco — 70 kg de CPS, ≈ 50 kg de verde, ≈ 40 kg de tostado** — incluso al borde
de la carga.

**Los incrementos siguen la misma lógica modular: el siguiente paso es la mitad del mínimo.**

| Grado | MOQ | Incremento |
|---|---|---|
| Black · Red, mezcla de 4 (o de 2) | 4 cargas | **2 cargas** |
| Black · Red, mezcla de 3 | 3 cargas | **1,5 cargas** |
| Blue | 2 cargas | **1 carga** |
| Gold | 1 carga | **½ carga** |

La fracción que sobra (media carga, y hasta cuartos) **se promociona como upsale a otros clientes**: es inventario
colocable, no un residuo. Todo limitado, siempre, a la disponibilidad real del lote.

**Dónde vive esto.** Hoy `pvc_model_versions.params.moq` sigue con la tabla de la primera versión (228/150/60/30) y
`params.proc` con un solo costo de empaque estimado: cambiarlos es la **versión v2.2.0 del modelo**, con acta (§10.4
paso 2). Mientras tanto, la regla de arriba vive en `src/lib/pvc/lectura.ts` (`moqCargas`, `incrementoCargas`,
`EMPAQUES`) y se **exhibe** en la pestaña Lectura, sin gobernar todavía ningún precio. `ASSOC_BLACK_MOQ = 350` se retira
cuando la fase 2 llegue a Cherry Picked.

### 9.3 Moneda y la protección contra la TRM (decisión #3)

- **El PVC nace en COP por carga** (origen). **El precio FOB del periodo se publica en US$/kg** convertido a la **TRM
  del corte**, congelada en la edición (`pvc_editions.outputs.trm_corte`). El dólar es el normalizador: todas las demás
  monedas se derivan de él, nunca del peso directamente.
- **CIF y DDP solo se cotizan donde hay habilitación regional** (§9.6: Master Roaster para Cherry Picked, Regional
  Operation Enablement para CaaS) y **se exhiben en la moneda de la geografía del comprador** (EUR para Europa, y la que corresponda: GBP, JPY,
  CHF…), calculados desde el FOB en US$ más la pila logística de la edición y convertidos con el cruce US$→moneda del
  mismo corte. Las subastas Tyrian y la tarifa Roast siguen la misma regla: `precio_salida_eur_kg` pasa a
  `precio_salida_usd_kg` y la interfaz convierte para mostrar.
- **La nota del owner** —la línea base no puede quedar expuesta a un movimiento extraordinario de la TRM que desbalancee
  la ecuación hacia cualquiera de los dos lados— se resuelve con el mismo mecanismo que ya tiene el disparador de FNC:
  `pvc_trigger_watch` gana la columna `trm` y un **collar simétrico**: si la TRM diaria se aparta más de **X %** de la
  TRM del corte durante 10 de 15 días, se abre una edición `corrected` en borrador y se avisa al owner (una TRM que cae
  golpea el ingreso en COP del productor; una que sube encarece al comprador en US$; el collar cuida los dos lados).
  **X queda por fijar por el owner** (propuesta: 6 %, el mismo orden que la ventana de 30 días del FNC).

### 9.4 Multiplicadores por grado sobre el PBC (acuerdo G&G, 2026-09-15)

El **PBC** (precio base de comercialización: el PVC de la edición en la moneda que toque, §9.3) se multiplica por grado.
Son los coeficientes que la escalera de la edición aplica y que viven en `pvc_model_versions.params.multiplicadores`:

| Grado | Multiplicador sobre PBC |
|---|---|
| Black | **1,15** (+15 %) |
| Red | **1,30** |
| Blue | **1,60** |
| Gold | **2,00** |
| Tyrian | **2,00 de base + subasta**: el excedente se reparte **80 % productor / 20 % CTC** cuando el productor conserva el café y CTC lo subasta; si CTC lo compra antes, el esquema cambia (§4, Subastas). Referencia: Fedecafé cobra ≈ 25 % en subasta — CTC debe ser igual o mejor |

Con la Tríada declarada por el productor y el Punto —real, o estimado por CTC hasta la catación formal—, la calculadora
de costos (PAD: precio ancla en verde, pergamino o tostado, hacia atrás o hacia adelante) da la oferta; el precio es
**transparente, no negociable y el mismo para todos**. Ejemplo de la reunión (Monte Azul, Castillo lavado sin
reconocimientos, ≈ 84 → Red): referencia tostado $70.000/kg; techo sin margen ≈ $39.307/kg pergamino; con 25 % de
margen CTC, oferta máxima ≈ $23.000/kg pergamino frente a ≈ $18.000 de la cooperativa — ≈ 30 % más para los cafés que
cumplen. La PAD es una herramienta interna (`herramientas-internas`); cuando el módulo la absorba, lee la edición.

### 9.5 La oferta al productor: dos caminos (nota del owner, 2026-09-15)

> ⚠️ **SUPERADO por el §12.9** (CEO, 2026-09-16). Los dos caminos se llaman ahora **Oportunidad CaaS** (compra
> directa, CTC asume el riesgo) y **Oportunidad Cherry Picked** (compromiso contractual con escalera de desbloqueo y
> penalización del 4 %). Lo de abajo queda como historia.

El PVC se usa **en tándem** con la escala de grados: la oferta a un productor es `PVC × multiplicador(grado)`, y el grado
sale del Punto y la Tríada (§9.1). Por eso hace falta **una herramienta que compute los dos juntos** — edición vigente ×
grado (SCA + V·P·R + Base física) → oferta por carga y por kg — para el OCP, para el productor en KR y para la visita de
campo (la PAD de la reunión G&G es su antecedente). Dueño: `consolas` (la calculadora vive donde vive la edición);
`herramientas-internas` aporta la PAD.

Dos caminos, y el PVC no cambia en ninguno:

| Camino | Quién | Oferta | Dónde se aplica |
|---|---|---|---|
| **Cherry Picked** (el productor se adscribe al esquema de colaboración y ofrece su café en ese formato) | productor con cuenta KR, lote galardonado | **PVC × multiplicador del grado** (escalera de la edición) | `lot_offers` kind `temporada`/`black`/`subasta` |
| **Compra directa · CTC Selection** (el productor **no se adscribe**, pero CTCx ve valor en comprar una cantidad mínima **asumiendo el riesgo**) | decisión del OCP/BCP, lote a lote | **PVC × multiplicador del grado, menos la prima**: se retira el **8 %** (`params.prima`, la prima de atractivo sobre la cooperativa) **del valor final, no del PVC** — `oferta_directa = PVC × mult(grado) × (1 − prima)` | `lot_offers` kind nuevo `directa` (fase 2) |

**Qué es la compra directa, en el comercio** (owner, 2026-09-15): CTCx compra ese café y **lo vende como suyo**. No como
café de su finca —la finca sigue siendo la del productor y la Ficha lo dice— sino bajo el sello **CTC Selection**:
ofertas **preseleccionadas por CTCx** por ser particularmente interesantes y **listas en bodega**. Es la diferencia
comercial que justifica el riesgo: el comprador no espera una cosecha ni firma una franja, compra algo que ya está.

**Esto ya existe a medias en el código, y ahí está el trabajo.** `public_lot_catalog.ctc_selection` es un campo
**derivado** (nada lo persiste, regla de la casa): vale `true` cuando hay una fila en `black_negotiations` con
`status = 'comprar'` para ese lote. Cuando vale `true`, el catálogo y la ficha pública **sustituyen el nombre de la
finca por `CTC_RAZON`** (`src/lib/catalogo/{fichaPublica,sneakPeek}.ts`, `CherryPickedExperience.tsx`) — exactamente
«lo vende como suyo». Lo que falta:

- La puerta es **solo Black**: `decideBlackNegotiation('comprar')` es el único camino, así que una compra directa de un
  Gold o un Blue no encendería `ctc_selection` y el catálogo seguiría mostrando la finca del productor (hallazgo **A13**).
- El **precio** no sale del PVC: `decideBlackNegotiation` toma `agreed_price_per_kg` a mano.
- No hay **«listo en bodega»**: el catálogo no distingue un lote comprado en firme y disponible de uno por contrato.

*Por confirmar con el owner*: si el 8 % se retira sobre el valor con multiplicador (como está escrito) o sobre el PVC
antes de multiplicar (`PVC × (1 − prima) × mult` — misma aritmética, distinta explicación al productor), y si «cantidad
mínima» es el MOQ del grado (§9.2) u otra.

### 9.6 Canales, tramos de incoterm y MOQ (matriz del owner, 2026-09-16)

> ⚠️ **SUPERADO por el §12.1–§12.6** (CEO, el mismo día, más tarde). Esta matriz daba a Cherry Picked los tres tramos
> y a CaaS un MOQ en kilos. **No es así**: Cherry Picked **solo se entrega DDP** (es consolidado a través del master
> roaster), CaaS tiene **FOB · puerto de destino · DDP**, el «regional enablement» es **un operador logístico contratado
> por CTC** (no capacidad propia) y el MOQ es **uno solo, en cargas**. El código se corrigió en V5.47
> (`src/lib/pvc/canales.ts`). Lo de abajo queda como historia.

Faltaba la capa **comercial**: el §9.2 explica cómo se convierte una carga de pergamino en kilos vendibles, pero no
**quién compra, en qué condición de entrega y con qué mínimo**. Son **dos canales por tres tramos**, y no todas las
casillas se pueden cotizar.

| | **FOB / FCA** | **CIF / CIP** | **DDP** | **MOQ** |
|---|---|---|---|---|
| **Cherry Picked** | US$/kg | US$/kg — *solo con **Master Roaster** regional* | US$/kg — *solo con **Master Roaster** regional* | Black y Red **3 o 4 cargas** equivalentes · Blue **2** · Gold **1** · Tyrian **½** |
| **CaaS** | US$/kg | US$/kg — *solo con **Regional Operation Enablement*** | US$/kg — *solo con **Regional Operation Enablement*** | Black y Red **1000 kg** · Blue **500 kg** · Gold y Tyrian **100 kg** — el mínimo puede componerse de **fracciones de varios cafés**, no de uno solo |

**El tramo base es FOB/FCA**, y su precio **no depende del destino — depende del MOQ**. Eso no es una frase: el motor ya
lo hace. La pila calcula el flete con `fleteKg(params, moq)` sobre la tabla de escalas
(`[0, 6,5] [45, 5,2] [100, 4,2] [300, 3,6] [500, 3,2] [1000, 2,9]` US$/kg), así que **el volumen del canal decide el
escalón de flete**: un Black de Cherry Picked (3 cargas ≈ 234 kg) cae en el tramo de 4,2 y el mismo Black en CaaS
(1000 kg) en el de **2,9**. La diferencia de precio entre canales no es una política comercial: es el camión.

**Los dos tramos de arriba dependen de una habilitación regional, y es distinta en cada canal.**

- **Cherry Picked → Master Roaster regional.** Un tostador de referencia que opera ese mercado junto a CTCx. Ya existe
  como concepto en la casa (el modelo del hub, la promesa de Roast, el «Libro de reservas» y la «Salud de la red» del
  ECP lo cuentan entre sus indicadores). Sin él no hay quién reciba, almacene ni entregue: solo se cotiza el tramo base.
- **CaaS → Regional Operation Enablement.** El **papeleo y el conocimiento** para operar en esa geografía: importación,
  aduana, fitosanitario y quién responde. No es un socio: es capacidad propia. Es un concepto **nuevo** en el sistema.

**Por qué esto importa en el código y no solo en una lámina.** El motor calcula `n2` (FCA Bogotá ≈ FOB), `n3` (CIP
aeropuerto ≈ CIF) y `n4` (DDP) para **todos** los grados y para cualquier destino de `params.destinos` — hoy nada impide
que una superficie pinte un DDP a un país donde CTCx no tiene con quién entregarlo. La regla vive ahora en
`src/lib/pvc/canales.ts` (`puedeCotizar(canal, tramo, habilitacionEnLaRegion)`), se exhibe en la pestaña Lectura y la
fija el guardián `qa-pvc-canales`. **Cotizar una casilla sin habilitación es prometer una entrega que la casa no puede
sostener.**

**Dos cosas por confirmar con el owner:**

1. **El nombre del tercer tramo.** En la lámina dice «DDP/???». DDP entrega con derechos pagados; si en algunos destinos
   la casa entrega **sin** pagarlos, ese caso es **DAP** y son dos tramos distintos, no uno con dos nombres.
2. **Tyrian: media carga contra el saco.** Aquí el mínimo estándar de Tyrian es **½ carga** (62,5 kg de pergamino),
   pero el §9.2 daba a Gold y Tyrian un piso excepcional de **un saco** (70 kg de pergamino) — que es *más* que media
   carga. La lectura coherente es que el saco es la excepción que baja a **Gold** por debajo de su carga, y que Tyrian
   ya nace en media; queda escrito así, y se confirma.

## 10. Auditoría de mejora (2026-09-15)

Hecha sobre el código de V5.42, la semilla `seed-pvc-f4-2026.mjs` y este plan. **Verificada contra la base el
2026-09-16** (el MCP de Supabase había fallado el día anterior; los conteos de abajo salen de consultas reales):

| Tabla | Filas | Lectura |
|---|---|---|
| `pvc_model_versions` | **1** (v2.1.1) | nunca se ha registrado una versión nueva desde la consola |
| `pvc_editions` | **1** (PVC-F4-2026 · `published` · $2.500.000 · corte 4-sep · pub 9-sep · vigencia 15-sep → 15-dic · huella `c476fe80`) | la semilla; ninguna publicada desde el tablero todavía |
| `pvc_cycles` · `pvc_sources` · `pvc_trigger_watch` · `pvc_forecast_scores` | **0 · 0 · 0 · 0** | confirmado: nadie les escribe |
| `market_anchors` (`fnc_carga`) | **45** filas, 2-ene → 15-sep-2026, **29 en los últimos 30 días** | el cron diario **sí corre** y es la única captura viva |
| `integration_events` con dominio PVC | **0** | confirmado: el PVC no emite nada |
| `lot_offers` · `purchase_contracts` · `lot_listings` | **0 · 0 · 0** | nada comercial que pudiera leer el PVC existe todavía |

**Una cifra que vale la pena mirar**: el promedio de `fnc_carga` de los últimos 30 días es **$2.176.069**, contra los
**$2.252.419** de `fnc_30d` con que se calculó la edición vigente. El mercado se ha movido **−3,4 %** desde el corte, el
PVC vigente ($2.500.000) está **~15 % por encima** del PEC de hoy y el disparador (FNC ≥ PVC) está lejísimos. Eso es
exactamente el contenido del reporte semanal que pide el owner (§10.3) — y hoy no lo calcula nadie.

### 10.1 Cómo funciona hoy (lo que existe)

**Tres capas, como diseñó §1, y solo la primera y la segunda tienen código.**

1. **El modelo** — `pvc_model_versions` (inmutable). `PARAMS_V211` en `src/lib/pvc/motor.ts:71` es el objeto entero de
   parámetros (prima 8 %, margen 50 %, peso L 0,6, collar 15 %, banda muerta 5 %, tope bajista 15 %, redondeo 10.000,
   multiplicadores 1,15/1,30/1,60/2,00, Tyrian cierre ×2,6 y reparto 80/20, MOQ **228/228/150/60/30 kg**, pila logística,
   destinos…). Se registra una versión nueva desde `/bcp/pvc/parametros` (`crearVersionModeloAction`, owner, JSON en un
   área de texto, con nota de acta); la vigente es la última creada (`versionModeloVigente`).
2. **La edición** — `pvc_editions`. Entradas (`PvcEntradas`, `motor.ts:61`): FNC de cinco meses, FNC 30 d, FNC del corte,
   máx. 90 d, prom. 180 d, ICE C strip, diferencial, TRM, costo FEPCafé y su escalamiento, el score de siete factores
   (peso × signo) y `pvc_anterior`. El motor (`edicion()`, `motor.ts:133`) calcula L (mirada atrás ponderada), P
   (proyección desde ICE C + impulso), el ancla (0,6 L + 0,4 P), el PEC 30 d + prima (mínimo de atractivo), el piso
   (costo × 1,5), el modificador del score (collar ±15 %), toma el **máximo** de piso · PEC · mercado, aplica banda muerta
   / tope bajista contra `pvc_anterior`, redondea a 10.000 y dice quién gobierna. Con el PVC salen la escalera
   (`escalera()`), la pila N0→N4 en US$/kg (`pila()`), los KPIs y el back-proof 2019–2026 (`backproof()`, sobre la serie
   `FNC_MENSUAL` **embebida en el código**, con datos hasta agosto de 2026). La huella (`huella()`) sella params +
   entradas. Paridad con el motor Python: `qa-pvc-motor.mjs` (contra `paridad.json`) y `qa-pvc-tablero.mjs` (el JS del
   tablero HTML contra la misma referencia).
3. **El dossier** — PDF D0–D7 en `docs/pvc/v2.1.1/`, servidos autenticados. **No se regenera por edición**: es la copia
   estática del pipeline Python de `apps-internas/PVC - Modelo/v2.0`.

**El seguimiento del dato hoy.** Un único cron diario, `/api/cron/market-anchors` (11:10 UTC), lee el precio FNC de la
página de la Federación y lo guarda en `market_anchors` (`kind = fnc_carga`, único por día, idempotente). Nada más se
captura solo: TRM, ICE C, diferencial, costo FEPCafé y el score **se teclean en el tablero**. La cinta de mercado de la
home (`src/lib/market/ticker.ts`) lee Yahoo (KC=F, COP=X, EUR, BRL) en caliente pero **no los persiste** — son la cinta,
no una fuente del PVC. `pvc_cycles`, `pvc_sources`, `pvc_trigger_watch` y `pvc_forecast_scores` existen como tablas
(migración `bcp_pvc_core`) y **nadie les escribe**: no hay `/api/pvc/cycle`, no hay captura de fuentes, no hay
disparador diario ni puntuación de pronóstico.

**La publicación del dato hoy.** Un solo camino, a propósito: el tablero HTML embebido en `/bcp/pvc/tablero` (iframe
autenticado con `window.PVC_DB` inyectado) → «Publicar Reporte» → `POST /bcp/pvc/tablero/embed/publicar` (owner). La
ruta separa el estado `S` del tablero en entradas y parámetros, **rechaza si los parámetros difieren de la versión
vigente** (un cambio de parámetros es una versión nueva, no una edición), calcula con el motor, inserta la fila ya
`published`, marca `superseded` la anterior **del mismo código**, y escribe `audit_log`. El guard `pvc_editions_guard`
impide editar una publicada; una corrección al alza es otra fila con `correction_of` (la ruta lo acepta; **ninguna
pantalla lo envía**). La primera edición (PVC-F4-2026, $2.500.000, vigente 15-sep → 15-dic-2026, modelo v2.1.1) entró
por la semilla.

**Quién lee el dato hoy.** `GET /api/pvc/current` (público, caché 15 min) y la vista `public_pvc_current`. Grep del
repo: **ningún módulo comercial los consume** — ni ofertas, ni contratos, ni Cherry Picked, ni subastas, ni Roast. El
PVC se publica y se mira en el BCP; no gobierna todavía ningún precio (es la fase 2, pendiente de las decisiones ya
tomadas en §8). Tampoco emite eventos: no hay `pvc.published` en `integration_events`, Make y Notion no se enteran.

### 10.2 Hallazgos (de mayor a menor)

| # | Hallazgo | Dónde | Riesgo | Mejora |
|---|---|---|---|---|
| A1 | **La vigencia no se aplica — y la cadencia lo vuelve seguro, no hipotético.** `edicionVigente()` y la vista `public_pvc_current` toman la última `published`/`corrected` por `published_at`, **sin mirar `valid_from`/`valid_to`** (verificado en el `pg_get_viewdef`: `WHERE status IN (…) ORDER BY published_at DESC LIMIT 1`). Como el PVC se publica **7–8 semanas antes** de su fecha efectiva (§1), en cuanto se publique F1-2027 —hacia finales de octubre— **empezará a regir ese mismo día** y durante casi dos meses, con F4-2026 todavía vigente hasta el 15-dic | `servicio.ts:376`, vista `public_pvc_current` | **alto** · ocurre en la próxima publicación, no «si acaso» | «vigente» = `published`/`corrected` **y** `valid_from ≤ hoy ≤ valid_to`; la recién publicada es **«próxima»** y se exhibe como tal (es información valiosa: el productor y el comprador ven con 7 semanas de antelación el precio que viene); la vista pública devuelve **las dos**, marcadas |
| A2 | **`pvc_anterior` lo teclea el usuario.** La banda muerta y el tope bajista dependen de él, y la ruta de publicar toma `S.pvc_anterior ?? 0` del tablero; con 0 la regla no actúa | `publicar/route.ts`, `motor.ts:150` | alto (se pierde la suavización entre franjas) | la ruta lo lee de la última edición publicada de la franja anterior e ignora el del tablero; el tablero lo muestra como dato de la base |
| A3 | **Cinco parámetros escapan al control de deriva.** `NO_PARAM` deja fuera `k`, `lb_excelso`, `lb_pergamino`, `lead` y `disparador`, que sí son parámetros del modelo (k y lb entran en P0); si el tablero los mueve, el número que ve el owner y el que se publica (calculado con los params de la versión) no coinciden | `publicar/route.ts` | medio | comparar todos los `PvcParams`; solo `nivel`/`destino` (UI) quedan fuera |
| A4 | **Supersede solo por código.** Al publicar F1-2027 la F4-2026 sigue `published`; con A1 resuelto es correcto (dos publicadas, una vigente, una próxima), pero `previous_edition_id` solo se llena si el código repite | `servicio.ts:409` | bajo | `previous_edition_id` = la última publicada de cualquier código; estados: `published` + ventana de vigencia deciden |
| A5 | **La serie histórica vive en el código.** `FNC_MENSUAL` llega a ago-2026; el back-proof se congela ahí y cada mes nuevo exige un commit | `motor.ts:111` | medio | el ciclo semanal la extiende desde `market_anchors` (promedio mensual de `fnc_carga`) y `calcular()` recibe la serie |
| A6 | **El dato del PVC no dispara nada.** Sin `pvc.published`, ni Make, ni Notion, ni Coffeed, ni el correo a productores | `servicio.ts:403` | medio | `emitEvent("pvc.published"/"pvc.corrected"/"pvc.cycle_ready")` en la cola, como todo lo demás de la casa |
| A7 | **Lo público expone la estructura de costos.** `/api/pvc/current` devuelve `pila` entera (n0, n1, sin, tarifa, flete, seg…) mientras el dossier es privado *porque* describe los costos | `tipos.ts` `PvcCurrent`, la vista | decisión | la vista pública deja solo lo que se pone en la bolsa: escalera COP/carga y N2/N3/N4 en US$/kg; el desglose queda en el BCP |
| A8 | **Parámetros desactualizados frente a las decisiones.** MOQ 228/228/150/60/30 kg y `min_cargas` 5/5/3/3/1 (§9.2 dice 56/42/26/13/6 unidades = 336/252/156/78/36 kg); Tyrian «cierre ×2,6» es un ejemplo, no una regla; `RANGOS` son las bandas SCA de referencia, no la escala de puntos | `motor.ts:76-83` | medio | versión **v2.2.0** del modelo con acta: MOQ por unidades, `mult` confirmado, `prima` 8 % explícita como la que se retira en compra directa (§9.5), bandas por puntos |
| A9 | **Corrección al alza sin camino.** El disparador «10 de 15 días» no existe; `pvc_trigger_watch` está vacía; el tablero no manda `correctionOf` | plan §5.6 | medio | el cron diario, tras anotar FNC (y TRM, A10), escribe `pvc_trigger_watch` y al cumplirse abre la corrección en borrador y avisa |
| A10 | **Solo se captura FNC.** TRM (datos.gov.co), ICE C (ya está en la cinta, sin persistir), diferencial, costo FEPCafé, ENSO, BRL, Brent: todo manual | `market-anchors/route.ts` | medio | el cron diario gana `kinds` `trm` e `ice_c_strip` (§4); el semanal captura el resto a `pvc_sources` con fuente, hora, método y confianza |
| A11 | **Huella de 32 bits.** `huella()` es un hash multiplicativo (`x*31+c`); para sellar una edición pública, un SHA-256 cuesta lo mismo y no tiene colisiones prácticas | `motor.ts:323` | bajo | `sha256(JSON.stringify({p,e}))` en el servicio; el motor sigue puro |
| A12 | **El dossier no sigue a la edición.** `docs/pvc/v2.1.1/` es estático; D3 y D4 nombran F4-2026 a mano | `dossier.ts` | medio | decisión #5: GitHub Action con `repository_dispatch` desde `pvc.published`, artefactos a storage `pvc/<código>/` |
| A13 | **`ctc_selection` solo lo enciende la vía Black.** El campo derivado de `public_lot_catalog` (`black_negotiations.status = 'comprar'`) es lo que hace que el catálogo muestre `CTC_RAZON` en vez de la finca. Una compra directa de un Gold o un Blue —que es justo lo que el owner describe en §9.5— no lo encendería | vista `public_lot_catalog`, `contractActions.ts:199` | medio (bloquea §9.5) | que `ctc_selection` derive de **la compra en firme, sea cual sea el grado**: una oferta `directa` aceptada, o el contrato que nazca de ella; y un distintivo «listo en bodega» en el catálogo |

### 10.3 Lo que pide el owner (2026-09-15) y cómo encaja

**1 · La lectura semanal del mercado (no un precio nuevo).** El owner lo fijó el 2026-09-15: *«no quiero que el precio
del PVC se mueva cada semana; lo que quiero es una lectura del mercado y comparación con lo que se pronosticó y las
novedades desde entonces, semana a semana»*. El precio se fija por tres meses y se publica 7–8 semanas antes (§1). El
ciclo semanal, por tanto, **corre el cálculo completo pero no publica nada**: lo usa como instrumento de medición.

- **Lunes 06:00 COT**, cron de Vercel → `POST /api/pvc/cycle` (`CRON_SECRET`): captura fuentes → `pvc_sources` (A10),
  extiende la serie mensual (A5), corre `calcular()` completo con la versión vigente y los datos de esa semana, y guarda
  `pvc_cycles` (`kind = weekly`) con `inputs`, `outputs` y **tres comparaciones** en `diff`:
  1. **contra lo que se pronosticó al corte** — la edición vigente fijó L, P, el ancla y el término que gobernaba; el
     ciclo dice cuánto se han movido y **si el pronóstico está aguantando** (es el mismo cálculo que `pvc_forecast_scores`
     hace al cerrar la franja, §6, pero en vivo y semana a semana en vez de una vez al final);
  2. **contra el ciclo de la semana pasada** — qué dato movió qué término y cuánto (el «qué cambió esta semana»);
  3. **contra el precio que rige** — cuánto se ha separado el mercado del PVC vigente, y **a qué distancia está el
     disparador** de corrección al alza (hoy: FNC 30 d $2.176.069 vs PVC $2.500.000 → el mercado está 15 % por debajo,
     el disparador lejísimos).
- **El reporte** nace del ciclo: «PVC · lectura de mercado, semana N» — el precio vigente y desde cuándo, las tres cifras
  KPI, el término que gobierna, la desviación contra el pronóstico, las novedades de la semana (titulares del barrido de
  Coffeed, movimientos de ICE C, TRM, clima/ENSO), las fuentes con baja confianza y la distancia al disparador. Se emite
  `pvc.cycle_ready`; Make lo reparte: correo al owner (Resend, §5.4), PDF del reporte (GitHub Action, la misma de la
  decisión #5) y el **contenido digital** — post de Coffeed Redacción a partir del reporte (`coffeed.redaccion` ya
  existe), one-pager en Canva y pieza para redes. Hacia afuera no va el desglose de costos (A7).
- **Lo que el ciclo NO hace**: publicar, mover el precio o crear una edición. Solo dos cosas cambian el precio — la
  publicación de la franja siguiente (7–8 semanas antes de su `valid_from`) y una **corrección al alza** disparada
  (A9). En la semana del corte, el ciclo es el borrador que el comité revisa y publica; ahí el `kind` es `cut`.

**2 · El marco de mercado de la Tríada: un documento adjunto, semestral (enero y julio).** Factores que **no entran en
el PVC** pero sí en cómo la escala se lee y se vende: la *percepción de mercado* de las variedades A/B/C, de los procesos
A/B/C y de los reconocimientos A/B/C. **Decisión del owner (2026-09-15): no es un tablero ni una tabla con pantalla —
es un archivo adjunto al PVC, accesible desde el menú secundario.**

- **Dónde vive**: como un documento más del dossier, `docs/pvc/<versión>/PVC-D10_Marco_de_Mercado_<periodo>_CTCx.pdf`,
  listado y servido por la pestaña **Dossier** que ya existe (`lib/pvc/dossier.ts` lo recoge solo con añadir su título a
  `TITULOS`; el route handler autenticado ya lo sirve). Sin tabla nueva, sin pantalla nueva, sin migración.
- **Qué contiene**: las nueve celdas (tres atributos × tres niveles) con la prima de mercado observada, una nota de
  demanda y **las fuentes con fecha y enlace** (resultados de subastas de la temporada, informes de mercado, precios de
  referencia, lo que el barrido de Coffeed ya recoge); más el comentario del semestre.
- **Cadencia**: **enero y julio**. Lo produce la misma GitHub Action del dossier (decisión #5) a partir de un
  `marco_<periodo>.json` que el comité llena, y el owner lo aprueba antes de adjuntarlo.
- **Para qué sirve**: (i) la revisión trimestral del catálogo de variedades y de los pesos `w` de la Tríada (§9.1) se
  hace **con el marco delante**, no de memoria; (ii) la oferta se posiciona *dentro* de la banda del grado con el índice
  del semestre; (iii) el reporte semanal lo **cita** («según el marco 2027-H1…»).
- **Resuelto el 2026-09-16 (§11.2)**: la tensión que quedaba aquí —un PDF no lo lee el código— la cerró el owner
  eligiendo las dos cosas. El marco **es dato** (`pvc_marco_mercado`) y es **la referencia que clasifica los grados**;
  el D10 es su impresión, generada desde las filas publicadas, y sigue accesible como archivo en el menú secundario.
  Lo escrito arriba vale salvo en eso: el archivo no es la fuente, es la salida.

### 10.4 Orden propuesto (fase 2 y 3 del §7, revisadas)

1. **Correcciones de base** (una versión, `consolas`): **A1 vigencia primero** — es lo único que se rompe solo, en la
   próxima publicación, y hoy es barato porque nadie lee el PVC todavía (0 ofertas, 0 contratos, 0 listados) · A2
   `pvc_anterior` de la base · A3 comparación completa de parámetros · A4 `previous_edition_id` · A11 SHA-256 · A7 vista
   pública recortada (si el owner confirma).
2. **Modelo v2.2.0** (A8): MOQ por unidades, bandas por puntos, prima explícita; y `definicion.ts` a la escala del
   §9.1 con la Base física (§9.1.b). Con esto, ofertas, contratos, listados y subastas **leen la edición** (§4), nace la
   herramienta «PVC × grado» del §9.5 y con ella la **compra directa / CTC Selection** (oferta `directa`, `ctc_selection`
   por compra en firme de cualquier grado, «listo en bodega» en el catálogo — A13).
3. **La espina** (A6 · A10 · A5 · A9): `pvc.published`/`pvc.corrected`/`pvc.cycle_ready`; cron diario con TRM e ICE C
   y el disparador; `POST /api/pvc/cycle` semanal con captura, serie viva, `diff` y reporte; GitHub Action del dossier y
   del reporte (A12).
4. **El marco de mercado** (§10.3.2): documento D10 en el dossier, primer periodo **2027-H1 en enero** (o un `2026-H2`
   retroactivo ahora, a mano, para que la fase 2 arranque con marco). Una línea en `TITULOS` de `dossier.ts`, nada más.
5. **Certeza** (§6): `pvc_forecast_scores` al cerrar F4-2026 y el informe de afinación cada cuatro franjas.

Cada punto lleva su guardián: `qa-pvc-vigencia` (una edición futura no es vigente), `qa-pvc-publicar` (deriva de
parámetros completa, `pvc_anterior` de la base), `qa-pvc-ciclo` (un ciclo semanal deja fila, diff y evento), y
`qa-pvc-motor`/`qa-pvc-tablero` siguen sellando la paridad.

## 11. El refurbish del BCP · «Modelo Económico» (owner, 2026-09-16)

El módulo deja de llamarse «PVC · Valor de Cosecha» y pasa a ser **Modelo Económico**: el PVC es *una* de las cosas que
vive ahí, no el todo. Junto a él entran la escala de grados con su calculadora, el marco de mercado que clasifica la
Tríada, y los MOQ de las dos puntas del negocio. Esta sección es el diseño; no está construida.

**El nombre resuelve una duplicación que ya existía.** `/bcp/direccionamiento/modelo-economico` es hoy una pestaña vacía
cuyo único contenido es un enlace a `/bcp/pvc` y un resumen del D2 (§2). Con el rename, esa pestaña **se retira** y su
contenido es el módulo. Cambia `src/lib/panel/consoles.ts` (`label: "Modelo Económico"`, la ruta puede seguir siendo
`/bcp/pvc` para no romper enlaces, o mudarse a `/bcp/modelo` con talón 308 — regla de `rutasMovidas.ts`).

### 11.1 Las pestañas

| Pestaña | Qué es | Estado |
|---|---|---|
| **Lectura** *(nueva, por defecto)* | Qué está pasando **hoy**: los KPI del §11.5 y la lectura semanal del ciclo (§10.3.1) | nueva |
| **Ediciones** | Lo publicado, su historial y la huella | existe |
| **Tablero** | El configurador del modelo — ahora también la base con la que un agente propone la configuración del periodo siguiente (§11.4) | existe, gana rol |
| **Grados** *(nueva)* | La escala «El Punto y la Tríada» (§9.1) con **calculadora**: SCA + V·P·R + Base física → puntos → grado → escalón de precio | nueva |
| **Marco de mercado** *(nueva)* | La referencia que **clasifica** variedades, procesos y reconocimientos en A/B/C. Semestral (enero y julio). Su PDF es el D10 (§11.2) | nueva |
| **MOQ y mermas** *(nueva)* | Las dos tablas de mínimos, el embudo de conversión que las explica (§11.3) y la **matriz de canales × tramos de incoterm** (§9.6) | nueva |
| **Parámetros del modelo** | Las versiones inmutables del método | existe |
| **Dossier** | D0–D10 por versión | existe, gana el D10 |

### 11.2 El marco de mercado **es dato**, y el PDF es su impresión

Corrección del owner sobre lo escrito en §10.3.2 el 2026-09-15: el marco **no es solo un PDF adjunto** — es *«la
referencia que clasifica directamente los grados, permitiendo actualizarlo»*. Eso cambia la arquitectura, y la mejora:

- **La estructura vive en el código** (`definicion.ts`, contrato de `ALINEACION` §1): que hay tres niveles C · B · A, qué
  significa cada uno, y cómo entran en los puntos (§9.1). Eso no cambia cada semestre.
- **El contenido vive en el marco vigente**: *qué* variedad es A, *qué* proceso es B, *cuántos* reconocimientos hacen A,
  y con qué prima de mercado observada. Tabla **`pvc_marco_mercado`** (service-role-only, inmutable como las versiones
  del modelo): `periodo` (`2027-H1`), `atributo`, `nivel`, `entradas jsonb` (la lista de variedades/procesos de ese
  nivel), `indice` (prima observada y nota de demanda), `fuentes jsonb` (subastas, informes, con url y fecha), `notas`,
  `published_by`, `published_at`. `definicion.ts` pide la clasificación al marco vigente, con **fallback al catálogo
  semilla del §9.1** si no hay marco publicado (nada revienta sin dato — regla de la casa).
- **El D10 es la impresión del marco**, no su fuente: la GitHub Action del dossier lo genera desde las filas publicadas.
  Así el owner tiene las dos cosas que pidió — un archivo adjunto en el menú secundario **y** un dato actualizable.
- **Cadencia**: enero y julio, con acta, desde la pestaña Marco. La revisión trimestral del catálogo de variedades
  (acuerdo G&G) se hace contra el marco vigente; si mueve una variedad de nivel, **no** se recalculan los lotes ya
  galardonados (sus letras están congeladas en `lots.surplus`, como los snapshots de las ofertas).

### 11.3 Los MOQ: dos mercados, dos unidades, y un puente que no es constante

Esto es lo que el owner pidió explicar. Hay **dos** sistemas de mínimos porque hay **dos unidades de comercio** y entre
ellas no hay un factor fijo, sino un rendimiento variable.

**La unidad del origen es la carga.** El productor cosecha, beneficia y vende **pergamino seco**, y su unidad es la
**carga de 125 kg**: es lo que pesa la cooperativa, lo que cotiza la Federación y en lo que el productor piensa. No
existe media carga en su cabeza salvo como excepción.

**La unidad del mercado es la bolsa de 6 kg de verde.** Es lo que cabe en un batch de tueste y lo que se paletiza. El
comprador no compra cargas: compra bolsas.

**Entre las dos está la merma, y no es un número.** Nominalmente 125 kg de pergamino dan 87,5 kg de verde (70 %). Pero
el rendimiento real depende del **factor de rendimiento** (FR 94 = 94 kg de CPS por cada 70 kg de excelso, o sea 93,09 kg
de excelso por carga), de la humedad, de los defectos y de la **selección por malla**. Por eso el modelo no promete el
nominal: promete **78 kg garantizados por carga** (`params.kg_g`) y se queda el resto como colchón.

De ahí salen las dos tablas, que son la misma cosa vista desde cada punta:

| Grado | **MOQ al productor** (Direct CaaS) | kg CPS | verde nominal (70 %) | **MOQ al comprador** (Cherry Picked) | kg entregados | colchón |
|---|---|---|---|---|---|---|
| Black | **4 cargas** | 500 | 350,0 | **56 unidades** | 336 | −14 kg · **4,0 %** |
| Red | **3 cargas** | 375 | 262,5 | **42 unidades** | 252 | −10,5 kg · **4,0 %** |
| Blue | **2 cargas** | 250 | 175,0 | **26 unidades** | 156 | −19 kg · **10,9 %** |
| Gold | **1 carga** | 125 | 87,5 | **13 unidades** | 78 | −9,5 kg · **10,9 %** |
| Tyrian | **½ carga** | 62,5 | 43,75 | **6 unidades** | 36 | −7,75 kg · **17,7 %** |

Obsérvese que **Gold = 1 carga = 13 bolsas = 78 kg** es exactamente el `kg_g` del modelo: la carga garantizada es la
unidad de referencia de toda la pila de precios (`n0 = COP por carga ÷ TRM ÷ 78`).

**Por qué el colchón crece con el grado** — tres razones que se acumulan, y ninguna es arbitraria:

1. **La varianza no se promedia igual en lo pequeño.** El MOQ Black son 4 cargas: las desviaciones de rendimiento de
   una carga se compensan con las de las otras tres. El MOQ Tyrian es media carga: una sola tanda mal trillada se come
   una fracción desproporcionada. La dispersión relativa de un rendimiento cae con la raíz del volumen, así que para la
   **misma confianza de entrega** hace falta proporcionalmente más colchón cuanto más pequeño es el lote.
2. **El grado alto selecciona más.** «Disponibilidad por malla» está en los criterios de Gold y Tyrian, no en los de
   Black. Seleccionar por tamaño de grano retira masa que un Black conserva: más selección, más merma, y el colchón
   no es opcional sino la consecuencia.
3. **El redondeo a bolsa pesa más en lo pequeño.** La bolsa de 6 kg es indivisible. A Black le cuesta 2 kg sobre 350
   (0,6 %); a Tyrian, 1,75 kg sobre 43,75 (**4 %**). La unidad no cambia; el lote encoge.

**Y por qué Direct CaaS ≠ CTCx Selection.** Son dos negocios distintos aunque el café sea el mismo:

- En **Direct CaaS** el café sigue siendo del productor en identidad y en riesgo compartido: CTCx le compra su cosecha
  dentro del esquema, la vende **con el nombre de su finca**, y es CTCx quien **garantiza al comprador** los kilos de
  verde. El colchón es entonces un seguro operativo sobre un rendimiento que CTCx no controla, y el mínimo se expresa
  **en cargas** porque es lo que el productor entrega y porque el lote tiene que ser lo bastante grande para sostener su
  propia línea en el catálogo, con su Ficha y su historia.
- En **CTCx Selection** CTCx ya compró en firme: la merma **ya ocurrió**, el café está trillado, contado y en bodega, y
  lo que hay es lo que hay. El mínimo deja de ser un pronóstico de rendimiento y pasa a ser una **decisión de
  inventario**: si la compra justifica el capital y la bodega. Ese cambio de quién carga el riesgo es exactamente lo
  que justifica retirar el 8 % de prima del valor final (§9.5): la prima paga estar dentro del esquema, y en compra
  directa el productor no está dentro — es CTCx quien asume el riesgo y vende el café como suyo, listo en bodega.

**El embudo, que es la mejor manera de enseñarlo** (y la visualización de la pestaña, §11.5): una carga entra por arriba
y sale por abajo en bolsas, con el precio por kilo recalculado en cada escalón —
`125 kg CPS → 93,09 kg excelso (FR 94) → 78 kg garantizados → 13 bolsas de 6 kg` — y al lado, en cada escalón, el
`COP/kg` que implica el escalón de precio del grado. Ese dibujo explica la merma, la carga, el kilo garantizado y la
bolsa de una vez, y es el mismo que usa la pestaña de Grados para justificar el MOQ.

### 11.4 El Tablero como configurador del agente

El Tablero deja de ser solo «los diales del owner» y pasa a tener **dos lectores**: la persona y un **agente**.

- **Hacia adelante — proponer la configuración del periodo siguiente.** El agente lee el estado del mercado (las fuentes
  del ciclo, §10.3.1), los cinco Month-Wrap del periodo que cierra (§11.6) y el marco de mercado vigente, y **propone
  un conjunto de parámetros** para la versión siguiente del modelo: peso L/P, tope de impulso, prima objetivo, collar,
  PEC-ADD. La propuesta llega como un **borrador de versión** en la pestaña Parámetros —con su nota de acta redactada y
  el porqué de cada cambio— y **el owner la acepta o no**. Nunca publica: la versión del modelo la registra una persona
  (regla vigente de `crearVersionModeloAction`, owner-only).
- **Hacia ahora — explicar lo que está pasando.** El mismo agente corre `calcular()` con los parámetros hallados y
  **traduce** el resultado: no «PVC 2.500.000 y gobierna PEC», sino qué significa eso para el productor, para el
  comprador y para la caja. Esa traducción es el contenido de la pestaña **Lectura** y del reporte semanal.
- **Los límites**, que valen aquí como en todo el libro de consumo de IA (`ALINEACION` §1): modelo pequeño por defecto,
  el paso caro es **opt-in con el precio a la vista**, todo se anota en `ai_usage` con su vía (`bcp:modelo-economico`), y
  **sin credencial nada revienta**: sin IA la pestaña muestra las cifras y omite la narración.

### 11.5 La pestaña «Lectura»: los KPI, con cara

Las cifras de abajo están calculadas con datos reales de hoy (FNC del 15-sep-2026 = **$2.045.000**/carga; PVC vigente
$2.500.000) para que se vea qué dice cada una cuando está viva.

| KPI | Fórmula | Hoy | Visualización |
|---|---|---|---|
| **% de prima mínima** | `(PVC × 1,15 − FNC hoy) / FNC hoy` — el escalón Black contra el precio de la Federación | **+40,6 %** ($2.875.000 vs $2.045.000) | **La regla de precios**: una barra horizontal con el FNC a la izquierda y los cinco escalones (Black→Tyrian) como marcas a lo largo, cada una con **el sello del grado** (`public/images/shared/grados/*.webp`, que ya existen). El tramo FNC→Black va sombreado: *eso* es la prima mínima. Una sola imagen explica el KPI y la escalera entera |
| **$ sobre base pergamino** | `PVC × 1,15 − FNC hoy`, por carga de 125 kg | **+$830.000 / carga** | **La carga apilada**: una barra vertical que es una carga, con el precio FNC abajo y el sobreprecio encima, rotulado en pesos y en «lo que significa» (cuánto más recibe el productor por carga entregada) |
| **COP/kg de verde empacado FOB** | `n2` de la pila (FCA Bogotá ≈ FOB) × TRM del corte | Black **$45.341/kg** (n0 $36.859 a granel → n1 $39.843 empacado → **n2 $45.341** puesto en FCA) | **El embudo del §11.3**: 125 kg CPS → 93,09 excelso → 78 garantizados → unidades de empaque, con el COP/kg en cada escalón |

**El tercer KPI necesita un dato que hoy está estimado a mano.** El owner lo llama «verde FOB», así que la cifra es `n2`
(FCA Bogotá), no `n1`. Dentro de esa cadena, el salto de `n0` (verde a granel) a `n1` (verde empacado) es
`params.proc = 0,95 US$/kg`, un estimado del D2 §13.1. El owner pide que ese componente **se pueda
añadir desde la pestaña** y que venga de una herramienta que ya existe: es el **Cotizador de Empaque**
(`/ecp/cotizador-empaque` + `public/tools/costo-empaque.html`), con `mermas-detallada.html` al lado para el rendimiento.
El acople: la pestaña trae el costo calculado allí y lo escribe como parámetro de la versión del modelo, con su fecha y
su origen — deja de ser un número inventado y pasa a ser un número **con procedencia**, como todo lo demás. Con el
addendum del §9.2 ya no es **un** parámetro sino **dos**, uno por estándar de empaque: vacío (Blue+) y GrainPro-type +
yute (Black y Red).

*La lista de KPI del owner quedaba abierta (un cuarto viñeta sin texto): cuando lo diga, entra aquí.*

### 11.6 Month-Wrap: cinco hitos por periodo

El periodo de una franja —del **corte** al **cierre de la vigencia**— dura unos **cinco meses**: 7–8 semanas entre la
publicación y el `valid_from`, más los tres meses de vigencia. El owner pide un punto de reflexión por cada mes que
cierra: **cinco Month-Wrap por periodo**.

- **Qué compara cada M-W**: el FNC realizado del mes cerrado contra lo que el modelo implicaba para él; el error de la
  proyección **P** y el de la mirada atrás **L**; si el término que gobierna habría cambiado; si el disparador se acercó
  o se cumplió; y la prima realizada acumulada contra la objetivo.
- **Qué añade sobre la lectura semanal**: la semanal dice *qué está pasando*; el M-W dice *qué patrón se está formando*.
  Es el nivel donde se ve que, por ejemplo, la proyección P se adelanta sistemáticamente en meses de cosecha, o que el
  collar del modificador se satura siempre en la misma dirección. Eso es lo que el owner llama «entendimiento de
  patrones para optimización predictiva y manejo de riesgo».
- **Dónde vive**: `pvc_cycles.kind` gana el valor `month_wrap` (junto a `weekly | cut | trigger | manual`), y el M-W es
  un ciclo como los demás, con su `diff` y su reporte. **El quinto cierra la franja**: consolida los cinco en
  `pvc_forecast_scores` (§6) y dispara el **informe de afinación**, que es la entrada del agente del §11.4 para proponer
  la versión siguiente del modelo. Así se cierra el círculo: publicar → leer cada semana → reflexionar cada mes →
  reasesorar el modelo → publicar mejor.
- **La serie histórica se vuelve viva aquí**: cada M-W consolida el mes cerrado en la serie mensual (hoy `FNC_MENSUAL`
  embebida en el código, hallazgo A5) a partir de las lecturas diarias de `market_anchors`. El back-proof deja de
  congelarse en agosto de 2026 sin que nadie tenga que hacer un commit.

### 11.7 Lo que queda por decidir (owner)

1. La **ruta**: ¿`/bcp/pvc` se queda (enlaces vivos, cero riesgo) o se muda a `/bcp/modelo` con talón 308?
2. El **cuarto KPI** de la lista del §11.5, que quedó sin escribir.
3. Si al mudar la clasificación al marco de mercado, una variedad que **baja** de nivel debe avisar a los lotes ya
   galardonados (hoy la propuesta es no: las letras quedan congeladas en el lote, como los snapshots de las ofertas).
4. El **nombre de la Base física** (§9.1.b) sigue pendiente desde el 2026-09-15.

## 12. Correcciones del CEO (2026-09-16)

Dictadas por Gabriel Vázquez (cofundador y CEO) el 2026-09-16. **Priman sobre todo lo escrito antes en este plan**; las
secciones que reemplazan llevan su banner de SUPERADO. Van aquí las **reglas** que el sistema aplica o le muestra al
cliente. El repositorio es público: el margen de CTC, la comparación con la cooperativa y las palancas de negociación
**no se copian aquí** (ver §12.12).

### 12.1 Programas × incoterm

| Programa | Naturaleza del envío | Incoterms |
|---|---|---|
| **Cherry Picked** | **Consolidado** a través del master roaster de la región | **Solo DDP** |
| **CaaS** (Coffee as a Service) | **Dedicado** / personal | **FOB Colombia · puerto de destino · DDP** |

Cherry Picked **no tiene FOB ni entrega en puerto**: el café llega consolidado, y al comprador le sale más barato esperar
el siguiente envío. **Si alguien quiere su café en un envío propio, eso ya es CaaS.**

### 12.2 Dos habilitaciones regionales, no intercambiables

| Habilitación | Qué la otorga | Qué desbloquea |
|---|---|---|
| **Región con master roaster** | Un master roaster habilitado en la región | Cherry Picked (DDP) |
| **Regional enablement** | Un **operador logístico contratado por CTC** en la región (por ejemplo, Estados Unidos) | El puerto de destino y el DDP de CaaS |

Una región puede tener una, la otra o las dos. **El FOB está siempre disponible, en cualquier parte del mundo.**

### 12.3 La escalera de acceso del comprador

1. **Región con master roaster** → Cherry Picked es el **preferido por defecto** (flexibilidad y costo consolidado). CaaS
   es la segunda opción cuando el consolidado no cubre la necesidad: **volúmenes grandes** o **periodicidad distinta** a
   la de los envíos consolidados. Sin presión de periodicidad, lo ideal es que viaje en el mismo cargamento.
2. **Región con regional enablement y sin master roaster** → solo CaaS: puerto de destino o DDP.
3. **Región sin habilitación** → **FOB**. El comprador asume toda la logística. **Nadie queda fuera**: lo que cambia es
   cuánta logística asume el comprador.

Vive en `src/lib/pvc/canales.ts` (`accesoDelComprador`, `puedeCotizar`) y lo fija `qa-pvc-canales`.

### 12.4 Consolidación operativa de CaaS

Si en una región habilitada hay varios clientes CaaS con destino común y ninguno quiere ser master roaster todavía, CTC
puede **consolidar envíos CaaS**. No es un precio de tabla: se resuelve caso por caso.

### 12.5 El master roaster y las tablas de precio

- El master roaster es un **cliente tipo partner**: le compra a CTC por el mismo canal de Cherry Picked que él habilita.
- Hay **una tabla por región de master roaster**, con los **5 grados** (el grado actúa como multiplicador) y **4 precios
  por grado**: **Cherry Picked DDP · CaaS FOB · CaaS puerto de destino · CaaS DDP**.
- Extremo más económico: **Black por Cherry Picked**. Extremo más costoso: **Tyrian por CaaS** (poco volumen, envío
  propio, sin economía de escala).
- Cada tabla regional incluye además un **precio de café tostado in situ**, que es un **precio aconsejado, no impuesto**:

```
Precio aconsejado tostado in situ =
    precio CTC del café verde          (público, igual para todos)
  + tarifa del master roaster por tostar (la fija él; se muestra como línea aparte)
  + tarifa de CTC por la conexión de tostado con el cliente final
```

  La parte de CTC sigue siendo **pública e igual para todos**; lo que varía por región es la tarifa del master roaster.

### 12.6 MOQ

**Fundamento.** El MOQ sale de **la cantidad de café que se puede comprar y procesar de forma significativa e individual
en Colombia**. Por eso se expresa **en cargas** (1 carga = 125 kg de pergamino) y no en kilos de empaque, y por eso es
**el mismo para todo programa**: es una restricción del origen, no del canal. Hacia el comprador, el mismo lote se ofrece
en verde empacado; la merma de trilla está considerada en los precios.

| Grado | MOQ |
|---|---|
| Black | 3 a 4 cargas, según el componente de café de la mezcla |
| Red | 3 a 4 cargas, según el componente de café de la mezcla |
| Blue | 2 cargas |
| Gold | **1 carga o menos, según disponibilidad real** |
| Tyrian | **1 carga o menos, según disponibilidad real** |

Los MOQ son parte de **cómo se promocionan los lotes**, en escala descendente por grado.

**Empaque: se mantiene, pero como presentación, no como mínimo.** Black y Red en GrainPro-type + yute de 35 kg; Blue, Gold
y Tyrian en vacío de 3 · 6 · 12 kg. Esto **reemplaza** la lógica anterior de MOQ y precio atada a empaque
(`ASSOC_BLACK_MOQ = 350`, y las unidades de 3·6·12 kg o sacos de 35 kg usados como mínimos).

### 12.7 Subasta Tyrian

- **Una sola subasta por lote**, en verde.
- **El bid es sobre FOB puerto Colombia.** El programa (Cherry Picked o CaaS) se elige **al cerrar**; los recargos por
  programa (consolidado con master roaster o envío dedicado) se suman **después**.
- **Requisito:** todas las reglas de ajuste por programa deben estar **publicadas antes de que abra la puja**. El pujador
  ve su precio final según programa desde el principio: no hay sorpresas al cerrar.
- **Se mantiene** la moneda **EUR/kg** y la adjudicación por el OCP. (Corrige el §4, que la movía a US$.)

### 12.8 El calendario PVC

- **Trimestral, en trimestres exactos**: ene–mar · abr–jun · jul–sep · oct–dic.
- **Se publica con dos meses de anticipación** (el PVC de abril se publica en febrero). **El calendario es público.**
- **Aplica el PVC vigente en el momento de la compra**, no el ya publicado para el trimestre siguiente: comprar en febrero
  o marzo es comprar al PVC de ene–mar. La publicación anticipada sirve **para planear, no para escoger precio**.
- La ventana de compra al productor es de **3 a 5 meses** según su ubicación: la anticipación existe porque en ese marco
  hay que evaluar el café para dar la oferta real.

**Esto confirma la corrección A1 de V5.43** (rige la edición cuya ventana contiene hoy, no la última publicada). Pero deja
un **desfase a corregir**: la edición vigente PVC-F4-2026 va del **15-sep al 15-dic**, que no es un trimestre exacto. Es
la edición de transición; la siguiente debe alinearse a trimestre (§12.11).

**Riesgo reconocido:** si el PVC siguiente sube, el productor querrá esperar. La respuesta es la Oportunidad Cherry Picked
con **venta programada** para el trimestre siguiente bajo compromiso contractual (§12.9).

### 12.9 Dos oportunidades de oferta al productor

**Oportunidad CaaS · compra directa.** CTC **compra el café directamente** al productor y **asume el riesgo** de venderlo.
Se aplica el **PVC vigente en el momento de la compra**.

**Oportunidad Cherry Picked · compromiso con escalera de desbloqueo.** El café se vende a compradores **antes** de estar
en manos de CTC. Retirarlo después de vendido crea una responsabilidad grave frente al comprador; por eso **el compromiso
es contractual**.

1. El trato cubre **los tres meses** del periodo PVC.
2. **Antes de empezar**, el productor declara cuántas **cargas por mes** compromete.
3. Lo comprometido queda **retenido al menos un mes** para poder activarse.
4. **Escalera de desbloqueo, en cuartos acumulados**: mes 1 sin tramo libre · mes 2 **25 %** sin cobro · mes 3 otro 25 %,
   **acumulado 50 %** libre.
5. **Siempre puede retirar todo de golpe**, pagando una **penalización por carga** retirada por encima del tramo libre.

```
Penalización = cargas penalizadas × PVC por carga × multiplicador de grado × % penalización
cargas penalizadas = max(0, cargas retiradas − tramo libre del mes)
```

**La penalización es del 4 %** del valor de cada carga penalizada: la **mitad del 8 % de `params.prima`**, así que no es
una cifra nueva. No es un castigo sino un **igualador**: evita que el productor se vaya por una diferencia mínima frente a
otra oferta, sin que se sienta atrapado. La escalera **premia esperar**: quien cumple puede desarmar la mitad en el mes 3
sin costo; quien se va de golpe en el mes 1 paga sobre todo lo comprometido.

**Ejemplo** — 8 cargas (1.000 kg) de Red (×1,3) al PVC de $2.500.000 → $3.250.000 por carga, $26.000.000 comprometidos,
retirando todo:

| Mes | Cargas penalizadas | 3 % | **4 %** | 8 % |
|---|---|---|---|---|
| 1 | 8 | $780.000 | **$1.040.000** | $2.080.000 |
| 2 | 6 | $585.000 | **$780.000** | $1.560.000 |
| 3 | 4 | $390.000 | **$520.000** | $1.040.000 |

Por carga: $97.500 (3 %) · **$130.000 (4 %)** · $260.000 (8 %). Vive en `src/lib/pvc/compromiso.ts`, lo muestra la pestaña
Lectura y `qa-pvc-compromiso` reproduce esta tabla **exacta**.

### 12.10 Respuestas a las preguntas que quedaron abiertas en esta sesión

1. **«DDP/???» — ¿un tramo o dos (DDP y DAP)?** Resuelto: los tres tramos son **FOB Colombia · puerto de destino · DDP**.
   No hay DAP. Y Cherry Picked solo tiene el último.
2. **Tyrian: media carga contra el saco de 70 kg.** Resuelto: Gold y Tyrian son **«1 carga o menos, según disponibilidad
   real»**. No hay un mínimo fijo por debajo de la carga; manda lo que de verdad haya del lote. El saco (70 kg) queda como
   referencia de hasta dónde se ha bajado, no como regla.
3. **CaaS con MOQ en kilos (1000 · 500 · 100).** **Superado**: el MOQ es uno solo, en cargas y por grado, porque es una
   restricción del origen (§12.6). Si CaaS debe llevar además un mínimo propio, es decisión nueva.

**Lo que el modelo todavía no hace** (versión v2.2.0 del modelo, con acta):

- **Puerto de destino es marítimo; el motor modela aéreo.** El `n3` de la pila es CIP en *aeropuerto*, con flete aéreo por
  escalones. `canales.ts` mapea «puerto» a `n3` como aproximación anotada; hace falta una columna marítima propia (el
  motor ya tiene `params.flete_mar` sin usar).
- **Los dos DDP salen de la misma columna.** El DDP consolidado de Cherry Picked debería ser más barato que el dedicado de
  CaaS; hoy el motor no los distingue.
- **Las regiones no existen en la base.** No hay tabla de regiones ni de sus habilitaciones: la pantalla muestra la
  condición, no un permiso concreto. Las tablas por región de master roaster (§12.5) necesitan ese soporte.

### 12.11 Preguntas abiertas (owner)

1. **Tarifa de conexión de CTC** en el tostado in situ: ¿monto fijo por pedido o porcentaje?
2. **Beneficios concretos** por nivel de reputación (charter `cherry-picked` y `kaffetal-regal`).
3. **Pesos y fórmula** de cada pata de la tríada de reputación.
4. **Plus contra Básica**: qué herramientas quedan en cada nivel (hoy el default de Herramientas del Café es Plus).
5. **Zulu** como pasarela de pagos (Stripe y Nequi, aplazados).
6. **Entidad legal** (país) para cobros — bloquea cobrar.
7. **Marca «Kaffetal»** ante la SIC.
8. **Alinear PVC-F4-2026 al trimestre exacto** (hoy 15-sep → 15-dic): ¿la siguiente edición arranca el 1-ene y se acorta
   esta, o se publica una de oct–dic?
9. De sesiones anteriores, siguen abiertas: los pesos iguales de V·P·R en la escala de puntos, el caso AAA:80, las tres
   filas del catálogo de variedades, el X % del collar de TRM y el nombre de la Base física.

### 12.12 Nota de seguridad: el repositorio es público (§0.2 del documento del CEO)

La auditoría de exposición se hizo sobre los archivos **versionados** el 2026-09-16:

- **Grave:** se encontró y se retiró del árbol vigente **información sensible de acceso** en un documento. El detalle y la
  corrección real (rotar las cuentas afectadas) se tratan **con el owner, fuera de este repositorio**: una nota pública no
  debe señalar dónde buscar. Regla desde hoy: **ningún documento del repo copia credenciales**, ni para señalarlas.
- **Márgenes y comparación con la cooperativa:** el §9.4 de este plan cita el margen de CTC y el ejemplo de Monte Azul
  contra la cooperativa, copiados de las actas de la reunión G&G. Pendiente de decidir si sale del repo público (§0.2).
- **Actas de reunión** citadas en `ALINEACION.md` y en los documentos de la Secretaría.
- **Pendiente, no hecho:** la auditoría completa de vulnerabilidades y de niveles de permisos que pide el §0.2 es una
  tanda propia.
