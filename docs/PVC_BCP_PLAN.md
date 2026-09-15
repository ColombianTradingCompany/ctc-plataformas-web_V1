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
| Variedad | común | exótica | rara |
| Proceso | lavado · honey clásicos | natural · honey+ · infusiones | experimental · fermentaciones · co-fermentaciones |
| Reconocimiento | ninguno | 1 a 3 | 4 o más |

Las tres reglas de `definicion.ts` (2026-08-05) evolucionan así: **(1) los puntos mandan** —el grado no se negocia, se
lee de los puntos—; **(2) los criterios cualitativos ya no son solo guía de valor: entran en los puntos como surplus**,
pero nunca sustituyen al SCA (ver las puertas); **(3) dos decimales en el SCA, puntos enteros.**

**El modelo** (propuesta de esta sesión, calcada de la gráfica del owner y afinada donde la gráfica se contradecía —
ver «Cómo se ajustó»):

```
puntos(SCA, V, P, R) = round( base(SCA) + surplus(V) + surplus(P) + surplus(R) ), tope 2500
surplus(C) = 0 · surplus(B) = +50 · surplus(A) = +100          (máximo AAA = +300)
base(SCA): interpolación lineal entre las anclas
   (80, 950) (82, 1000) (84, 1400) (86, 1500) (88, 1650) (89, 1800) (100, 2000)
grado(puntos): < 1000 sin grado · 1000–1399 Black · 1400–1599 Red · 1600–1799 Blue · 1800–2000 Gold · 2001–2500 Tyrian
```

**Las puertas** (las notas de la gráfica, cumplidas por construcción):

- **SCA < 80 → sin grado, sea cual sea el surplus.** La base baja 50 puntos por cada punto SCA por debajo de 80 y el
  surplus **no se suma**: un 79,9 AAA computa por debajo de 1000.
- **Con 80–81,99 solo se entra con al menos un B** (CCC:80 = 950). Es decir: el mínimo real de un café sin surplus es
  **82 SCA**, exactamente lo que dice la nota.
- **Un café CCC nunca es Tyrian** (CCC:100 = 2000, el techo de Gold): Tyrian exige surplus. Y desde Blue, el café común
  va **una banda por debajo** de su banda SCA (CCC:86 = Red, CCC:88 = Blue, CCC:89 = Gold): el surplus es lo que la
  recupera. Es la traducción de «los puntos debajo de la raya requieren al menos un aumento proporcional en SCA o al menos
  un surplus más alto en cualquier métrica».

**Contraste con los puntos de la gráfica** (banda que dibuja el owner → banda que da el modelo):

| SCA | CCC | B·C·C | BBB | AAA | BBC | BCC |
|---|---|---|---|---|---|---|
| 80 | no entra ✓ | Black 1000 ✓ | Black 1100 ✓ | Black 1250 (**dibujado Red 1400**) | — | — |
| 82 | Black 1000 ✓ | | | | | |
| 84 | Red 1400 ✓ | | Red 1550 ✓ | Blue 1700 ✓ | | |
| 86 | Red 1500 ✓ | | Blue 1650 ✓ | Gold 1800 ✓ | | |
| 88 | Blue 1650 ✓ | | Gold 1800 ✓ | Gold 1950 ✓ | Blue 1750 (**dibujado Gold 1800**) | Blue 1700 ✓ |
| 89 | Gold 1800 ✓ | | Gold 1950 ✓ | Tyrian 2100 ✓ | | |
| 100 | Gold 2000 ✓ | | Tyrian 2150 ✓ | Tyrian 2300 ✓ | | |

**Cómo se ajustó.** La gráfica está dibujada a mano y en dos sitios se contradice a sí misma: al mismo SCA, tres A
valen 200 puntos (84) o 900 (80), y BBB pesa 100 (84) o 300 (88). No hay pesos fijos que reproduzcan los 22 puntos a la
vez; con **B = +50 y A = +100** el modelo respeta la banda de 20 y mueve dos: **AAA:80** se queda en Black (1250) en
vez de Red, y **BBC:88** en Blue (1750) en vez de Gold. Los dos son coherentes con las puertas (un 80 no debería ser
Red por surplus; dos B no deberían valer una banda entera). Si el owner quiere que AAA:80 sea Red, el peso pasa a
B = +75 · A = +150 — y entonces cambian cuatro puntos en vez de dos (BBB:84 y AAA:84 suben una banda, AAA:88 y
BBB:89 llegan a Tyrian). El techo nominal es 2500; con estos pesos el máximo alcanzable es AAA:100 = 2300 (el resto
del eje queda de reserva). **El owner valida los pesos con la calculadora del artefacto «PVC · Cinco decisiones» antes
de que la fase 2 toque `definicion.ts`.**

**De dónde salen las letras** (fase 2, dueño `consolas`): Variedad y Proceso se derivan de la Ficha Técnica del lote
(`lot_fichas.variety` / `.process`) por dos catálogos en `definicion.ts` (`VARIEDAD_NIVEL`, `PROCESO_NIVEL`); el
Reconocimiento es un contador nuevo (`lot_fichas.reconocimientos`, lista con nombre · año · enlace, que el OCP verifica
antes de contar). El veredicto del Q-Grader (`recordEvaluationVerdict`) pasa a llamar `puntosCtc(sca, surplus)` y a
guardar los puntos y las letras en `lots` (`ctc_points`, `surplus jsonb`) al lado del `grade`; la Ficha y el catálogo
los exhiben. `gradoPorPuntaje(sca)` sobrevive como «el grado sin surplus» y `qa-grados-check` gana las puertas.

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
