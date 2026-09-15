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
| Edición (`pvc_editions`) | Los números de una franja: entradas, salidas, PVC, escalera, pila, KPIs | Trimestral + correcciones al alza | Publicación del owner |
| Dossier (`tool_versions` / storage) | Los PDF D0–D9, calculadora y one-pager regenerados con la edición publicada | Por edición | Pipeline Python |

Además, un **ciclo** (`pvc_cycles`) es cada corrida semanal del cálculo con los datos capturados ese día: produce una
edición *preliminar* para la próxima franja, guarda cada dato con su fuente y compara contra el ciclo anterior. Al
llegar la fecha de corte, el último ciclo se convierte en el borrador que el comité publica.

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
| Subastas Tyrian (`src/lib/subastas`, `precio_salida_eur_kg`) | Salida en EUR | Salida = precio Gold de la edición **en US$ FOB**, mostrada al comprador en la moneda de su destino (§9.3) | **#3 decidido**: US$ FOB del periodo; CIF/DDP en EUR o la moneda de la geografía. `precio_salida_eur_kg` → `precio_salida_usd_kg` + moneda de exhibición |
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


### 9.2 MOQ en unidades de 6 kg (decisión #2)

Merma pergamino → verde 70 %; carga = 125 kg CPS; unidad de venta = bolsa de 6 kg.

| Grado | Cargas mín. | kg CPS | kg verde | Unidades (máx.) | **MOQ unidades** | **kg ajustados** | Delta |
|---|---|---|---|---|---|---|---|
| Black | 4 | 500 | 350 | 58,0 | **56** | **336** | −14 kg (−4,0 %) |
| Red | 3 | 375 | 262,5 | 43,0 | **42** | **252** | −10,5 kg (−4,0 %) |
| Blue | 2 | 250 | 175 | 29,0 | **26** | **156** | −19 kg (−10,9 %) |
| Gold | 1 | 125 | 87,5 | 14,0 | **13** | **78** | −9,5 kg (−10,9 %) |
| Tyrian | 0,5 | 62,5 | 43,75 | 7,0 | **6** | **36** | −7,75 kg (−17,7 %) |

Los MOQ son **cifras del owner, no una fórmula**: se guardan como tabla (`pvc_model_versions.params.moq`) y
`moqPorGrado(grado)` la lee de la edición vigente. `ASSOC_BLACK_MOQ = 350` se retira; el catálogo muestra unidades y
kilos («56 unidades · 336 kg»). Gold = 13 unidades = 78 kg es la carga garantizada que ya nombraba §4.

### 9.3 Moneda y la protección contra la TRM (decisión #3)

- **El PVC nace en COP por carga** (origen). **El precio FOB del periodo se publica en US$/kg** convertido a la **TRM
  del corte**, congelada en la edición (`pvc_editions.outputs.trm_corte`). El dólar es el normalizador: todas las demás
  monedas se derivan de él, nunca del peso directamente.
- **CIF y DDP se exhiben en la moneda de la geografía del comprador** (EUR para Europa, y la que corresponda: GBP, JPY,
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
