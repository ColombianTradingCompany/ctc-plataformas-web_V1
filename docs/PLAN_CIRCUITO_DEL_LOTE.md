# Etapa 1 · Reestructurar y conectar el circuito del lote (del perfil al Catálogo Activo)

**Estado: PLAN, sin ejecutar** (2026-09-24, escrito sobre la V5.75). Lo pidió el owner con once folios («CTC Platforms
Optimization v2», fuera del repo en `reference/ocp-rutas-del-proveedor-2026-09-23/`): las tres rutas del proveedor, sus
respuestas a las tres trabas de la 4b, el proceso «desenredado» en prosa (folios 7–8), la ventana de venta y la nota sobre la
**CTCx Coffee Datasheet Tool**. Encargo textual: *«analiza y planea cómo reestructurar y conectar el sistema de tal manera que se
acerque lo mejor posible a lo que estoy describiendo. Define partes del sistema que ya existen que pueden ser retiradas y cuáles
hacen falta mover o crear»*, pensado de manera holística para que después venga la **Etapa 2** (correr el proceso de punta a
punta con Asistencia a Proveedores y Proveedor Desacoplado, afinando cada paso hasta que los lotes queden en el Catálogo Activo) y
la **Etapa 3** (la cara de Cherry Picked / CaaS).

**Sustituye** a las fases 4b, 5 y 6 de `docs/OVERHAUL_CONSOLAS_PLAN.md` (que queda como historia de las fases 0–4a, hechas) y
absorbe los briefs de Muestras, Compras y Simplificar el OCP, y la parte de circuito de `PLAN_NARRATIVA` (CN-3, CN-5, CN-6, CN-7).
Dueño de la ejecución: `consolas`. Alcanza a `kaffetal-regal` (las pantallas del productor), `socios` (el Centro de Calidad),
`herramientas-internas` (la lectura del PVC), `herramientas-cafe` (la Datasheet Tool) y `cherry-picked` (la cara al comprador, Etapa 3).
Cada fase deja su línea en `ALINEACION` §3.

---

## 0 · El proceso del owner, transcrito en pasos (la fuente de este plan)

Los folios dicen UNA cosa: el circuito son doce pasos y cuatro puertas, y cada paso tiene un dueño (P = productor, C = CTCx,
Q = Q-Grader del Centro de Calidad). Lo que sigue es la transcripción; entre corchetes, el folio.

| # | Paso | Quién | Lo que el folio fija |
|---|---|---|---|
| 1 | Crea su perfil | P | — |
| 2 | **Llamada de bienvenida** | C | agendar [1] |
| 3 | Registra al menos **una finca**, que recibe el **Pasaporte** (base EUDR) | P | [7] |
| 4 | **Revisa la finca**: datos completos y con sentido; adjunto de titularidad aceptable; ubicación contra bases EUDR oficiales (manual por ahora: **cuadro de texto + adjunto**); cuestionario EUDR; certificaciones **aprobadas o con evidencia pedida** — lo no corroborado no frena el Pasaporte, queda señalado, **recordatorio semanal ×4**, luego se retira del Pasaporte y el registro queda | C | [7] |
| 5 | Registra lotes; cada uno recibe su **Visa** heredada (una o varias fincas, todas del mismo productor). **B4 (fotos) va ANTES de A5 (EUDR): A5 es el último paso**, para que finca y lote corran en paralelo | P | [7] |
| 6 | **Revisa el registro del lote**: FT completa y lógica; FT2 puede venir vacía (entonces la ficha no caracteriza) o con archivos que CTCx **transcribe al formato «CTCx Coffee Datasheet Tool»** (transcriptor automático después); foto apropiada; EUDR derivado. Resultado: el productor recibe **gratis** su dossier estandarizado, **en inglés y español**, con el chequeo EUDR | C | [7] |
| 7 | **Solicita la evaluación** (Solicitudes de Evaluación); puede pedir un **descuento** por nota → «Kaffetal Club» sale del BCP y pasa a **OCP · Manejo de Stock Físico** como **«Campañas de Subvención»** | P | [7] |
| 8 | Corrobora la solicitud y **emite una factura de cobro**; la subvención se decide en Gestión de Muestras | C | [7] |
| 9 | Paga y envía **2 kg de CPS**, **contra entrega** (gratis para él) | P | [7] |
| 10 | Recibe café Y pago → **Lotes a Evaluar**. El café se parte en **500 g evaluación · 500 g contramuestra · 1 kg testeo in-house**. Los lotes se apilan en **Baches de Evaluación** que van al Q-Grader | C | [7] |
| 11 | En el **Centro de Calidad** (login propio) hay dos módulos: **Evaluación de Lotes** (ahora) y **Procesamiento de Lotes** (trilla, monitoreo, seleccionadora → mermas; después). Recibe baches; evalúa lote a lote, **anónimos (solo UID)**, física y sensorialmente con la **Datasheet Tool**, **sin «01 Extrínsecos» ni la variedad** (sesgo). **Da de alta cada lote individualmente** | Q | [6][7] |
| 12 | Cada alta entra a **«Evaluados → Pendiente de Oferta»** (OCP) y a **«Lotes Galardonados»** (KR) con la **Ficha completa**; el galardón sale del puntaje y los factores de grado. Costo para el productor: 2 kg + **~$100.000 COP** [7]. **Bajo los mínimos de Black: rechazo automático con reporte de feedback gratis**; **re-evaluación a tarifa plena ($200.000)**, con **80 % de reembolso si sube un grado** — y antes CTCx analiza que esa mejora aseguraría la oferta [6] | C | |
| 13 | CTCx decide si **tiene sentido comercial** ofertar (por defecto **sí**; puede no ofertar, sin devolución). Idealmente **5–6 semanas antes de los volúmenes** de cosecha | C | [8] |
| 14 | **Oferta «Lote de Temporada»** para el trimestre por comenzar, **anclada al PVC vigente** (PVC × multiplicador, % de modificación): **compromiso de disponibilidad** (cantidad ancla en CPS para el mes 1 + aceptación de las condiciones de retiro) y **compra inmediata de CTCx de una carga (125 kg)** al precio acordado, como inversión en la promoción. Opcional: promoción desde el acuerdo con compra por CaaS al PVC actual | C→P | [8] |
| 15 | **Acepta con claridad**: una **calculadora** que simula escenarios y sobre la que decide la cantidad. **Mínimos por grado: Black/Red 7 cargas · Blue 4 cargas · Gold/Tyrian 200 kg**. Declaración de **trimestre** (periodo por empezar) o de **30 días** (periodo en curso) | P | [4][6] |
| 16 | **Retiro**: 25 % de lo declarado al cerrar el mes 1 sin penalidad, otro 25 % (del declarado original) al cerrar el mes 2 → el mes 3 ofrece mínimo el 50 %. Puede retirar el 100 %: lo que exceda el tramo libre paga **4 % sobre el precio de cada carga**. **Mora**: 2 semanas sin cargo, 2 más con 5 %; después **«Ruptura Contractual»** (cuenta congelada, demanda). Excepción: causa legítima comunicada antes | P | [6][8] |
| 17 | Mes a mes CTCx **pide una cantidad** del café declarado; el productor la envía; **CTCx paga en la primera semana del mes** | C↔P | [8] |
| 18 | A los ~90 días CTCx ofrece **renovar** con el PVC nuevo y una cantidad nueva. **Past Crop**: recolección final a más de 3 periodos (9 meses) → **PVC − 10 %** | C | [8] |
| 19 | **CTCx Selection**: si rechaza la oferta de temporada pero le interesa la de CTCx, o si no quiere nada y CTCx sí: **ventana de 30 días** desde la aceptación con **PVC % fijo y cantidad mínima y máxima**; **PVC − 8 %**; se documenta en **Compras**; «Oferta desde CTCx Selection» fija la disponibilidad; la vitrina enmascara la finca con **UN perfil de CTCx Selection para toda la casa + imagen por lote** | C↔P | [2][3][8] y respuestas del 23-sep |
| 20 | **Catálogo Activo**: promoción en periodos de 3 meses | C | [9] |

**Lo que el folio 11 añade**: la Datasheet Tool (= `green-datasheet`, «Ficha de café verde», 01 Extrínsecos · 02 Intrínsecos ·
03 Ficha) conecta a **módulos complementarios** —Defectos del Café (al analizar granulometría) y Coffee Varieties Map (al elegir
variedad)— que se abren rápido pero **no son contenido**; y mejoras: **distinguir SCA y CVA** en la información, no solo en un
selector; **omitir redundancias**; **caracterizar uno o varios lotes** en una sola interfaz. El PS del owner: **algunas herramientas
del café son también interfaz interna.** El folio 10 (Sample Kit Plus/Max, CaaS Shipment, zonas FedEx, referencias US$/kg por grado)
es **Etapa 3**: se transcribe al final (§9) y no se ejecuta aquí.

## 1 · Lo que hay hoy contra ese proceso (hechos, 2026-09-24)

Inventario de tres barridos del repo y lecturas de la base. **La base está casi vacía**: 28 productores, 9 fincas (3 aprobadas),
17 lotes (15 borrador · 1 apto · 1 galardonado), **0 solicitudes de evaluación, 0 baches, 0 sesiones de Arena, 0 negociaciones,
0 subastas, 0 fichas escaneadas**, 1 oferta aceptada → **1 contrato de prueba** (`8618ecda`, 100 kg a $31, 2 liberaciones) → 1 lote
publicado (`f5187234`). El owner decidió **eliminar ese contrato y su lote** (folio 4). Es el mejor momento: no hay nada que migrar.

| Paso | Existe | Falta | Sobra |
|---|---|---|---|
| 1–2 | Signup (correo, Google, desde lead); sesión asistida y desacoplado (V5.75) | La **llamada de bienvenida** como tarea derivada del Tablero | — |
| 3–4 | `approveFinca`/`rejectFinca`; editor de asistencia con 5 pestañas (Declaración · Análisis y Evidencia · Atributos · Riesgo · Certificaciones); `finca_certificates` con `verified_by_ctc`; `eudr_google_earth_url` (sin uso) | El **cuadro de texto + adjunto** del chequeo contra bases EUDR; **estado de cada certificación** (declarada · corroborada · evidencia pedida · retirada); **recordatorios semanales ×4** — hoy **no existe ningún recordatorio** ni correo al productor: solo notas en su feed | — |
| 5 | Ficha con 9 panes A1–A5, B1–B4; `intake_step` 0–4 = FT · FT2 · **EUDR (A5)** · **FOTO (B4)** · Ficha; Visa heredada del Pasaporte (`eudr.ts`) | **Invertir B4 y A5** (A5 último); `PASOS_DE_LA_FICHA` aún dice «Video» | — |
| 6 | Checklist de Visa en el OCP (`EvaReviewCard`); escáner de soportes con IA (`scanFichaSoportes`, sonnet, `lot_fichas`); ficha «a mano» (`crearFichaDesdeReporte`); dossier del Pasaporte, Visa del lote, Ficha exportable — **cuatro documentos sueltos, solo en español** | **UN dossier imprimible ES/EN** (trazabilidad + EUDR + caracterización si la hay); la transcripción de FT2 **en el formato de la Datasheet Tool**; la cola de «claims» del productor vive en `/bcp/arena` | `/ocp/fichas` como módulo aparte (se funde en la revisión del lote) |
| 7–9 | `arena_inscriptions` (= la solicitud: código, `discount_pct`, pago a mano, `sample_shipped_at`); códigos de campaña `KRX-` desde `/bcp/club`; «CTCx asume el costo» (V5.75); Nequi vacío | **Factura de cobro** (documento con referencia y carril); **subvención** como decisión de CTCx en Muestras (no como código que el productor teclea); «Campañas de Subvención» en el OCP; **pago contra entrega** como regla; tarifa: código **$80.000**, folio 7 **~$100.000**, folio 6 y PVC plan **$200.000** | El **Kaffetal Club** entero: membresía `club_member_since` (gate de `signContract` y `publishLot`), `grantClubMembershipOnce`, `club_member_codes`, `clubEmails.ts` (sin importadores), copy «Pasaporte del Club» |
| 10 | `confirmSampleReceived` (marca de tiempo); `sondeo_batches` (kanban abierto → planeado → pendiente → registro, con laboratorio, prueba de envío y «solicitud formal») | **Muestras con kilos y partición** (500/500/1000) — brief de Gestión de Muestras; los baches como **«Baches de Evaluación»** que van al Centro de Calidad, sin laboratorio externo ni prueba de envío | El kanban de sondeo con laboratorio, prueba y solicitud formal |
| 11 | Nodo `centro-calidad` (**esqueleto**: cuatro pantallas estáticas de trilla; credencial `suspendida`); `LabEvalEditor` (SCA + factor + mallas, la planilla); `green-datasheet` público (01/02/03, SCA, sin CVA); `clase: interna` en el registro de herramientas + ruta `/tools/h/[slug]` solo para consola; `catacion` README pide UNA taxonomía de la rueda | **Evaluación de Lotes** en el Centro de Calidad: baches recibidos, lote a lote **anónimo (UID)**, planilla **02 Intrínsecos sin variedad**, escala **SCA o CVA**, rueda de sabor, «dar de alta»; `lot_evaluations` en `pending` desde el Q-Grader; la taxonomía de la rueda en `src/lib/tools/catacion/` | El veredicto lo digita CTCx en el OCP con el bache en «registro» |
| 12 | `recordEvaluationVerdict`: exige bache en registro + planilla + Q-Grader; escribe grado (`gradoPorPuntaje`) + `galardonado` + Club + Black; rechazo → cashback **80 %** + `generateMejorasDoc` (IA) | Partir en **registrar** (Q) y **confirmar** (C); **rechazo automático bajo Black** con el reporte de mejoras (ya existe, con IA); **re-evaluación** ($200.000, 80 % si sube de grado, previa decisión de CTCx) | El cashback del 80 % al rechazado |
| 13–14 | `/ocp/ofertas`: `emitOffer(temporada·black·subasta)` con **precio tecleado** y cantidad opcional; `lot_offers.reference_price_*` existen y **nadie las escribe**; la edición PVC-F4-2026 publicada con escalera por grado (COP/carga) y `params.mult`/`prima`; `compromiso.ts` (4 %, tramos) solo se exhibe | **`pvcParaGrado(grado, fecha)`** (no existe: cada tablero busca la banda a mano); precio de la oferta = PVC × mult × (1 ± %); el tipo **`directa`** (PVC − 8 %); **compra inicial de una carga**; términos versionados; la decisión «tiene sentido comercial» como paso; Tyrian sin escalón en el PVC | `black_negotiations` como CRM (nace solo en el veredicto, solo Black; «comprar» emite `black`, que rechaza Red/Blue/Gold); subastas Tyrian en EUR (`lot_auctions`) — **decisión 3** |
| 15–16 | `respondToOffer`: acepta o rechaza, **no declara nada**; el contrato nace vacío y el OCP **teclea** precio y cantidad al firmar (`signContract`); `RELEASE_STAIRCASE` 50/75/100 sin penalidad; `humidity_readings` (0 filas) | **Calculadora** en KR (sobre `compromiso.ts` + términos); **cantidad ancla + mínimos por grado + términos** al aceptar; `locked_kg` → `quantity_frozen_kg` (una cifra, un dueño); **retiro 25/25 + 4 %**, **mora 2+2/5 %**, **ruptura** (congelar cuenta) | La escalera 50/75/100 y el «firmar a mano» |
| 17–18 | `recordContractRelease` (kg liberados, pago, despacho por mes) | **Pedido mensual** de CTCx, envío, pago en la primera semana; **renovación** a los 90 días; **Past Crop** (−10 % a partir de `harvest_to` + 9 meses) | — |
| 19 | `public_lot_catalog.ctc_selection` (solo Black «comprar», borra `finca_name`); `/ocp/ctc-selection` (dos pestañas); `/ocp/compras` (página que dice que no existe) | `compras`, el perfil único de CTCx Selection + imagen por lote, `directa` con ventana de 30 días y mín/máx — brief de Compras + respuestas del 23-sep | — |
| 20 | `publishLot` → `lot_listings` (exige Club + contrato activo + liberación) | Publicar desde el acuerdo (opcional, folio 8) | El gate del Club |
| Arena | `/bcp/arena` (sesiones, jornada, puntajes, vitrina), `inviteLotToArena`/`assignLotToSession` (abren dos consolas), fases `arena·sesion·competido`, `ArenaSection` en la landing de KR, tareas `fila_arena`, KPIs del OCP, `qa-jornada` | — | **Todo**: ningún folio la nombra; 0 sesiones; la evaluación es del Centro de Calidad |

**Cinco hallazgos que condicionan el plan:**
1. **Nada lee el PVC fuera de los tableros del ECP/BCP**: ni ofertas, ni contratos, ni KR. Y **no hay función «precio del PVC
   para el grado X en la fecha D»**: cada lectura busca `outputs.escalera.find(banda === "Black")`, con la banda en mayúscula y el
   grado del lote en minúscula. Además **los rangos de grado del motor (`RANGOS`: Red 84–85,9…) no son los de `definicion.ts`**
   (Red 82–83,99): conflicto n.º 1 de `ALINEACION` §1, todavía abierto y ahora en el camino de un precio real.
2. **Dos modelos de liberación conviven**: `RELEASE_STAIRCASE` (contratos) y `compromiso.ts` (PVC, exhibición). El folio 6 fija
   un tercero —**25 % al cerrar el mes 1 y 25 % al cerrar el mes 2**— que no coincide con `TRAMO_LIBRE_ACUMULADO {1:0, 2:0.25,
   3:0.5}` del §12.9 (que daba 0 en el mes 1). Manda el folio; el §12.9 y `compromiso.ts` se corrigen.
3. **Los mínimos por grado están escritos tres veces y las tres distintas**: `lectura.ts` (`moqCargas`: Black/Red 3–4, Blue 2,
   Gold/Tyrian 1), `PVC_BCP_PLAN` §14.4 (igual) y el **folio 4: Black/Red 7 cargas · Blue 4 · Gold/Tyrian 200 kg**. Y la
   **compra inicial de CTCx**: folio 8 «una carga»; `ALINEACION` §1 «Black/Red 1 carga · Blue 200 kg · Gold hasta 100 kg». Hay que
   dejar UNA tabla (decisión 1).
4. **La tarifa de evaluación tiene tres cifras**: `ARENA_FEE_COP = 80000` (código), «~$100.000» (folio 7), «$200.000» (folio 6 y
   `PVC_BCP_PLAN` §14). Y la re-evaluación «a tarifa plena de $200.000». Decisión 2.
5. **El Centro de Calidad no tiene nada debajo** (panel estático, credencial suspendida, sin tablas) y el Q-Grader de hoy es un
   nombre tecleado en el bache. **La Datasheet Tool existe tres veces**: el HTML público `green-datasheet`, su port React en KR
   (`ficha/panes`, «Ported verbatim»), y la planilla del laboratorio (`LabEvalEditor` + `labEvaluation.ts`). Las tres comparten los
   diez atributos SCA, escritos **cuatro veces** (`SCA_KEYS`, `SCA_ATTRS`, `ATRIBUTOS_SCA`, `evaluationActions`), y **ninguna
   sabe de CVA** más allá de un selector.

## 2 · El sistema objetivo (a dónde va cada cosa)

Cuatro superficies, un solo circuito. **El OCP es el backstage** (ALINEACION §2); **el Centro de Calidad es un socio** con
credencial (`requirePartner("centro-calidad")`) que ve solo su bache; **KR es la cara del productor**; **el ECP no cambia**.

**OCP · Kaffetal Regal** — Productores, Fincas y Lotes (tabla única; la vista completa del lote ES la pantalla de revisión del
registro: checklist de Visa + transcripción FT2 + dossier) · Asistencia a Proveedores · Proveedor Desacoplado · **Temporadas**
(viene de `/bcp/arena/temporadas`: las usan solicitudes, ofertas y la tabla).
**OCP · Catálogo** (el circuito, en su orden) — **Solicitudes de Evaluación** (nuevo: la solicitud, la factura, la subvención
decidida, el pago contra entrega) → **Lotes a Evaluar** (recibidos y pagados; la partición de la muestra; **armar Baches de
Evaluación** y mandarlos) → **Lotes en Evaluación** (baches en manos del Q-Grader; solo lectura) → **Evaluados → Pendiente de
Oferta** (la evaluación registrada, el grado que sale, el precio del PVC, la decisión comercial, **emitir**; re-evaluación) →
**Catálogo Activo** (aceptadas con cantidad ancla; pedido mensual, pagos, retiros y mora; renovación; publicación) → **Oferta
desde CTCx Selection** (disponibilidad de lo comprado). «Ofertas CP Aceptadas» se funde en Catálogo Activo (el contrato es el
lote aceptado; deja de ser un módulo aparte).
**OCP · Manejo de Stock Físico** — Gestión de Muestras (brief) · **Campañas de Subvención** (viene de `/bcp/club`) · CTCx Selection · Compras (brief).
**BCP · Ecosistema de Valor** — pierde «Kaffetal Regal Arena» y «Kaffetal Club» (308 a sus destinos; la Arena queda dormida).
**Centro de Calidad (socio)** — `panel/evaluacion` (**Evaluación de Lotes**: baches recibidos → lote a lote, anónimo, planilla +
rueda, dar de alta) y, en la Etapa 3, `panel/procesamiento` (**Procesamiento de Lotes**, con el Modelo de Producción).
**KR** — Ficha con A5 al final; **Solicitudes de Evaluación** (pedir, ver la factura, marcar el envío); **Lotes Galardonados** con la
Ficha completa; **la oferta con su calculadora** y la declaración; **Mi trato** (pedidos mensuales, retiros, pagos); el **dossier
ES/EN** descargable.

## 3 · Inventario de cambios — RETIRAR · MOVER · CREAR · CONSERVAR

**RETIRAR** (se saca del rail y del código de superficie; las tablas se quedan dormidas si tienen filas o si borrarlas es DDL
destructivo sin necesidad; **las URLs viejas nunca mueren**: 308).

| Qué | Dónde | Por qué | Cómo |
|---|---|---|---|
| **La Arena como evento** | `/bcp/arena` (+ `temporadas`, `[sessionId]`, `run`), `arenaActions.ts` (salvo `createHarvestSeason`), `JornadaRunner`, `SessionFunnel`, `ArenaBoardClient`, `jornada.ts` (salvo `SCA_KEYS`), `inviteLotToArena`/`assignLotToSession`/`showcaseGate` (nominadosActions 803–919), `InviteToShowcaseButton`/`AssignSessionControls`, KPIs de sesiones en `/ocp`, tareas `fila_arena` (`tareasCarga`), `ArenaSection` + copy de la landing de KR, líneas «vitrina» de `EvaluacionesTab`, «postular a la Arena» de `PerfilTab`, `qa-jornada-check` | Ningún folio la nombra; el Q-Grader evalúa en el Centro de Calidad; 0 sesiones; abría dos consolas | Rail y páginas fuera; `arena_sessions`/`arena_session_lots`/`arena_scores` dormidas con nota; las fases `arena·sesion·competido` se quedan en el CHECK sin escritor; `/bcp/arena` → 308 a `/ocp/kr`; `temporadas` se MUEVE (abajo). `socios`: el sello del Estudio «video de Arena» pasa a «assets del lote» |
| **El Kaffetal Club como membresía** | `club_member_since` como gate (`signContract`, `publishLot`), `grantClubMembershipOnce`, `revokeClubMembership`, `club_member_codes` (2 filas, sin lector), `clubEmails.ts` (sin importadores), copy «Pasaporte del Club» en `ContratosTab`, insignia «Kaffetal Club ✓» | El folio no tiene Club: la firma y la publicación nacen del trato, no de una membresía | Gates fuera; columna dormida con nota; `/bcp/club` → 308 a `/ocp/subvenciones`. Las **campañas de descuento** NO se retiran: se MUEVEN |
| **El cashback del 80 % al rechazado** | `recordEvaluationVerdict` 727–737, `markCashbackPaid`, «Cashback pendiente» de la vista | Folio 6: el rechazo bajo Black es gratis (reporte); el 80 % es de la **re-evaluación** que sube de grado | Se reescribe como reembolso de re-evaluación (columnas `cashback_*` se reutilizan con ese sentido) |
| **La escalera 50/75/100** y **firmar a mano** | `RELEASE_STAIRCASE`, el formulario de `signContract` (precio y cantidad tecleados) | El precio viene de la oferta y la cantidad del productor | Sustituidos en la fase 5 |
| **El kanban de sondeo con laboratorio externo** | `setBatchLab`, `createBatchProofUploadUrl`, `markBatchSent` (prueba), `sondeoRequestPrint.ts`, columnas `lab_*`, `proof_*`, `result_*` | El bache va al Centro de Calidad por la plataforma, no a un laboratorio por mensajería | La tabla `sondeo_batches` se **conserva** como «bache de evaluación» con tres estados (abierto · en el Centro de Calidad · cerrado); las columnas viejas quedan sin escritor |
| **`black_negotiations` como CRM** | `/ocp/ctc-selection` kanban (nueva · en conversación · acuerdo cerca), `ctcSelectionActions`, `decideBlackNegotiation` (que emite `black` y rechaza Red/Blue/Gold) | La negociación de CTCx Selection es una **oferta `directa`** con ventana de 30 días; lo comprado va a `compras` | Tabla dormida (0 filas); la pantalla «Oferta desde CTCx Selection» pasa a leer `compras` |
| **`/ocp/fichas` como módulo** | `fichas/page.tsx`, `FichasClient` | La transcripción de FT2 es un paso de la revisión del lote, no un módulo | Las acciones (`scanFichaSoportes`, `crearFichaDesdeReporte`, `setFichaOficial`) se **conservan** y se montan en la vista completa del lote; 308 |
| **La cola de «claims» en `/bcp/arena`** | `reviewEvaluationClaim` (evaluationActions), `submitOfficializationClaim` (KR) | Un «claim» es FT2 con soportes: lo revisa CTCx al transcribir | Se funde en la revisión del lote; `submitLotEvaluation` (sin importadores) se borra |
| **El código de campaña que teclea el productor** | `aplicarCodigoCampana`, `peekCampaignCodeAction`, la casilla de `EvaluacionesTab`, `applyCodeOnBehalf` | Folio 7: el productor **pide** un descuento por nota; CTCx **decide** la subvención en Muestras | Se sustituye por la nota de solicitud + la decisión en el OCP (`arena_entry_codes`/`club_campaigns` se conservan como registro de campañas) |
| Cuatro copias de los diez atributos SCA | `SCA_KEYS` (jornada), `SCA_ATTRS` (fichaData), `ATRIBUTOS_SCA` (fichas/tipos), `evaluationActions:18` | Una fuente | Queda `src/lib/fichas/tipos.ts`; las otras importan |

**MOVER** (cambia de sitio, no de regla; con su 308 y sus claves de permiso).

| Qué | De → a | Nota |
|---|---|---|
| Campañas de descuento → **Campañas de Subvención** | `/bcp/club` (+ `campanas/[id]`, `createCampaign`, `emitCampaignCodes`, `revokeCampaignCode`) → `/ocp/subvenciones` (OCP · Manejo de Stock Físico) | Compuerta `permisoDeEscritura("ocp", …)`; el vocabulario: «subvención», no «descuento» ni «Club» |
| Temporadas | `/bcp/arena/temporadas` + `createHarvestSeason` → `/ocp/temporadas` (OCP · Kaffetal Regal) | `harvest_seasons` las leen solicitudes, ofertas y `carga.ts` |
| La revisión de «claims» | `/bcp/arena` → vista completa del lote en `/ocp/kr?lote=` | Con la transcripción FT2 |
| Contratos | `/ocp/contratos` (+ `[id]`, `humedad`) → dentro de **Catálogo Activo** (`/ocp/catalogo?trato=`) | «Ofertas CP Aceptadas» sale del rail; 308 |
| Subastas Tyrian | `/ocp/subastas` → **dormidas** dentro de Catálogo Activo hasta la decisión 3 | Tyrian entra hoy por oferta (200 kg) según el folio 4 |
| El paso A5 de la Ficha | `intake_step` 2 → 4 (último); B4 pasa a 3 | `kaffetal-regal` lo ejecuta; `PASOS_DE_LA_FICHA` y `guard_lot_fotos_intake` (que muerde en `ficha_completa`, no en el paso) se ajustan |
| `src/lib/arena/` | → `src/lib/evaluacion/` (inscriptions, entryCodes, seasons, mejoras, payment, producerActions) y `src/lib/trato/` (lo del contrato) | Un `git mv` con sus importadores; `arena/` queda con lo dormido |

**CREAR** (lo que no existe; cada pieza con su charter dueño).

| Pieza | Charter | Qué es |
|---|---|---|
| `pvcParaGrado(grado, fecha, {mod})` en `src/lib/pvc/servicio.ts` | herramientas-internas (lo lleva el OCP) | La única puerta al precio: edición vigente en la fecha → banda del grado (mayúscula ↔ minúscula resuelto) → COP/kg y COP/carga × (1 ± % de modificación: −8 % directa, −10 % past crop). Y **`RANGOS` del motor alineados a `definicion.ts`** (conflicto n.º 1). Guardián: `qa-pvc-precio` reproduce la escalera publicada |
| `src/lib/trato/terminos.ts` (puro, versionado) | consolas | **Los términos del Lote de Temporada** como datos con versión: mínimos por grado, compra inicial de CTCx (1 carga), tramos libres (25 % mes 1, 25 % mes 2), penalidad 4 %, mora (2 sem 0 %, 2 sem 5 %), ruptura, renovación a 90 días, past crop (9 meses, −10 %), ventana de 30 días de CTCx Selection con mín/máx. `compromiso.ts` se corrige a los tramos del folio y se apoya aquí. Guardián: `qa-trato-check` lee las cifras de ESTE plan (§0), no del código |
| La **calculadora del trato** (`src/lib/trato/simulador.ts` puro + componente KR) | consolas (puro) + kaffetal-regal (pantalla) | Dada una cantidad declarada, el grado y el PVC: cuánto paga CTCx mes a mes, qué puede retirar sin costo cada mes, cuánto costaría retirar todo; es lo que el productor mira para decidir la cantidad |
| **Solicitudes de Evaluación** (OCP) + `solicitarEvaluacion` (KR) | consolas + kaffetal-regal | `arena_inscriptions` gana `nota_solicitud`, `factura_ref`, `factura_emitida_at`, `subvencion_id`, `pago_contra_entrega`. La factura es un documento imprimible con referencia y carril (Plataformas de Pagos, cuando exista; hasta entonces Nequi/transferencia escritos por el owner) |
| **Baches de Evaluación → Centro de Calidad · Evaluación de Lotes** | consolas (bache) + socios (panel) | `sondeo_batches.status` nuevo (`abierto` · `en_centro` · `cerrado`), `centro_calidad_account_id`; `lot_evaluations` gana `batch_id`, `escala` (sca·cva), `rueda` (jsonb de descriptores), `uid_anonimo`; el Q-Grader escribe con `requirePartner("centro-calidad")` en `pending`; «dar de alta» = insertar la fila y marcar el lote evaluado |
| **La Datasheet Tool interna** | consolas + herramientas-cafe | (a) La planilla del Q-Grader es React (`LabEvalEditor` ampliado: SCA **o** CVA con sus campos propios, factor, mallas, rueda con la taxonomía única de `src/lib/tools/catacion/`) porque su salida tiene que ser DATO; (b) `green-datasheet` se registra como **variante `interna`** para CTCx (transcribir FT2 y caracterizar varios lotes), embebida con el puente `CTC_TOOL` que ya usan los cotizadores; (c) Defectos y Varieties Map se **enlazan** desde la planilla (no se embeben) |
| **Registrar ≠ confirmar** | consolas | `registrarEvaluacion` (Q, Centro de Calidad) y `confirmarGradoYOfertar` (C, OCP); rechazo automático bajo Black con `generateMejorasDoc`; `reevaluar(lotId)` (nueva solicitud a tarifa plena enlazada a la anterior; reembolso 80 % si sube de grado, previa marca «CTCx acuerda») |
| **Ofertas ancladas** | consolas | `lot_offers`: `kind` gana `directa`; `pvc_edition_id`, `pvc_cop_kg`, `modificador_pct`, `terms_version`, `min_kg`, `max_kg`, `ventana_dias`, `compra_inicial_kg`; `reference_price_*` por fin se escriben. `emitOffer` deja de aceptar precio tecleado salvo `kind = excepcion` con nota (para no bloquear la operación) |
| **Aceptación con declaración** | kaffetal-regal (pantalla) + consolas (acción) | `respondToOffer` gana `locked_kg` (≥ mínimo del grado), `declaracion` (`trimestre` · `30_dias`), `terms_version`, `terms_accepted_at`; el contrato nace **con** precio y cantidad de la oferta (`signContract` ya no teclea) |
| **El trato mes a mes** | consolas + kaffetal-regal | `contract_months` (mes, `pedido_kg` de CTCx, `enviado_at`, `pagado_at`, `retirado_kg`, `penalidad_cop`, `mora_estado`); `contract_releases` deja de ser la escalera; estados nuevos del contrato: `en_mora`, `ruptura`, `renovado`; `producer_profiles.estado_cuenta` (`activa` · `congelada`) — **decisión 6** (toca Identidad) |
| **Recordatorios** | consolas | `/api/cron/recordatorios` semanal: certificaciones con evidencia pedida (×4 → retirar), mora; correo al productor (con el remitente único, que ya filtra etiquetas) + nota en su feed. `finca_certificates.status` (`declarada` · `corroborada` · `evidencia_pedida` · `retirada`) + `recordatorios`, `ultimo_recordatorio_at` |
| **El chequeo externo EUDR** | consolas | `fincas.eudr_chequeo_notas` + `eudr_chequeo_files` (jsonb): el cuadro de texto y el adjunto del folio 7 |
| **Dossier del café ES/EN** | kaffetal-regal (documento) + consolas (datos) | UN documento imprimible: identidad y trazabilidad + Pasaporte/Visa + caracterización (si hay evaluación o FT2 transcrita), en español e inglés. Sustituye a los cuatro documentos sueltos en la cara del productor |
| **Gestión de Muestras** (1.ª tanda) | consolas | Su brief, con la partición fija 500 / 500 / 1000 g |
| **Compras + perfil de CTCx Selection** | consolas + cherry-picked | Su brief, con las respuestas del 23-sep (perfil único, imagen por lote); `ctc_selection` se deriva de `compras` |
| **Ficha retenida** del desacoplado | kaffetal-regal | `lots.ficha_retenida_hasta_pago` y KR la respeta |
| **Llamada de bienvenida** | consolas | Tarea derivada `bienvenida` en el Tablero de Ejecución |
| **Guardianes** | consolas | `qa-trato-check`, `qa-evaluacion-check` (sustituye a `qa-evaluaciones`: registrar/confirmar, anonimato, escalas), `qa-centro-calidad-check`, `qa-pvc-precio`, `qa-solicitudes-check`; `qa-circuito-check` gana los estados nuevos |

**CONSERVAR** (no se toca; que nadie lo mueva): `definicion.ts` y los grados; `estadoDelCircuito()` como única derivación (gana
estados: `solicitada`, `evaluado`, `en_mora`); la identidad y las dos cookies; los niveles `admin`/`viewer`; que el contrato nace de
la aceptación del productor; lo derivado no se persiste; los 308; la sesión asistida y el desacoplado; `lot_evaluations` como
la tabla de evaluaciones (promedio de aceptadas al leer); `arena_inscriptions` como la solicitud (se le cambia el nombre en el
vocabulario, no en la base); `sondeo_batches` como el bache; `harvest_seasons`.

## 4 · El circuito derivado, versión 2

`estadoDelCircuito()` sigue siendo LA función, y KR la importa. Estados (en orden, total y monótono; `qa-circuito-check`):
*en registro* (finca o lote sin Visa) → *registrado* (Visa lista, sin solicitud) → *solicitada* (pidió evaluación; falta factura,
pago o muestra) → *a evaluar* (pagado y recibido; sin bache) → *en evaluación* (en un bache en el Centro de Calidad) → *evaluado,
pendiente de oferta* (hay `lot_evaluations` pendiente o grado sin oferta viva) → *oferta emitida* → *catálogo activo* (aceptada:
contrato con cantidad ancla) → *en mora* / *ruptura* (laterales) → *renovado* (vuelve a *oferta emitida*). Salidas laterales:
*no apto* (registro), *rechazado* (bajo Black; puede volver por re-evaluación), *sin oferta* (CTCx decidió no ofertar), *CTCx
Selection* (`directa` aceptada → Compras).

## 5 · Las fases (una versión cada una)

Orden por dependencias y por riesgo: primero lo que quita, luego lo que la Etapa 2 necesita para correr de punta a punta, y al
final lo que solo importa cuando haya un trato vivo. **Ninguna fase toca dinero real** (no lo hay: el contrato de prueba se borra).

| Fase | Versión | Qué | Dueños | Bloquea |
|---|---|---|---|---|
| **0 · Limpieza y foto** | docs + Datos | Borrar el contrato `8618ecda`, sus liberaciones, el listado y el lote `f5187234` (el owner lo pidió); wrap V47 del mapa (el log ya tiene 5 asientos) — desde WRAP-COMMIT-PUSH | consolas · nodo final | permiso explícito del owner para el borrado |
| **1 · Retiros y mudanzas** | V5.76 | Arena fuera del rail y dormida; Club fuera (gates de firma y publicación retirados); campañas → `/ocp/subvenciones`; temporadas → `/ocp/temporadas`; contratos dentro de Catálogo Activo; `/ocp/fichas` fundido en la vista del lote; `src/lib/arena` → `evaluacion`/`trato`; copy de KR sin Arena ni Club; los diez atributos SCA en una fuente; `SCA` ↔ `definicion.ts` en `RANGOS` | consolas (+ kaffetal-regal copy, herramientas-internas `RANGOS`, socios sello) | — |
| **2 · El registro** | V5.77 | OCP: la vista completa del lote como pantalla de revisión (checklist de Visa + transcripción FT2 con la Datasheet interna + escáner + dossier); finca: chequeo externo (texto + adjunto), estado por certificación, recordatorios semanales (cron + correo + feed). KR: A5 al final; dossier ES/EN | consolas · kaffetal-regal | decisión 4 (idioma y forma del dossier) |
| **3 · Solicitud, factura, muestra** | V5.78 | «Solicitudes de Evaluación» (OCP + KR): nota de descuento, factura, subvención decidida, pago contra entrega; recibo con partición 500/500/1000 (Gestión de Muestras, 1.ª tanda); «Lotes a Evaluar» arma **Baches de Evaluación** | consolas · kaffetal-regal | decisión 2 (tarifa) |
| **4 · Centro de Calidad · Evaluación de Lotes** | V5.79 | El módulo del socio: baches recibidos, lote a lote anónimo, planilla SCA/CVA + factor + mallas + rueda, dar de alta → `lot_evaluations` pendiente; credencial activada; taxonomía de la rueda en `src/lib/tools/catacion/`; `green-datasheet` variante interna | socios · consolas · herramientas-cafe | decisión 5 (quién es el Q-Grader) |
| **5 · Confirmar y ofertar** | V5.80 | `pvcParaGrado`; `confirmarGradoYOfertar` (grado, decisión comercial, oferta anclada, compra inicial, términos versionados); rechazo automático + reporte; re-evaluación; `directa` con ventana; los términos en `terminos.ts` con su guardián | consolas · herramientas-internas | decisiones 1 y 2 |
| **6 · Aceptar con claridad** | V5.81 | KR: la calculadora, la declaración (cantidad ≥ mínimo, trimestre/30 días), términos; el contrato nace lleno; «Mi trato» | kaffetal-regal · consolas | cuentas `prueba-*` (aquí SÍ se conduce en navegador) |
| **7 · El trato mes a mes** | V5.82 | Pedido mensual, envío, pago, retiros 25/25 + 4 %, mora 2+2/5 %, ruptura (cuenta congelada), renovación, past crop; publicación sin Club | consolas · kaffetal-regal | decisión 6 |
| **8 · CTCx Selection y Compras** | V5.83 | `compras`, el perfil único + imagen, la vitrina enmascarada, «Oferta desde CTCx Selection» = disponibilidad | consolas · cherry-picked | decisión 7 |
| **Etapa 2** | — | Correr todo con Asistencia y Desacoplado; afinar cada pantalla en sesión de fine tuning | owner + consolas | las cuentas `prueba-*` y una credencial del Centro de Calidad |

Las fases 1–5 no necesitan las cuentas de prueba (se verifican por guardianes, SQL y el lado del socio, que sí se conduce). La 6
y la 7 son las que el productor ve: es donde la Etapa 2 hará su trabajo.

## 6 · Decisiones del owner

1. **Una tabla de mínimos y compra inicial.** Propongo la del folio 4 como fuente y borro las otras dos: **Black/Red 7 cargas ·
   Blue 4 cargas · Gold/Tyrian 200 kg**, compra inicial de CTCx **1 carga (125 kg)** para todos. ¿Confirma? (7 cargas son 875 kg de
   pergamino por productor: es cinco veces lo que dice hoy `lectura.ts`; si es a propósito, va; si era «3–4», dígalo.)
2. **La tarifa.** ¿$80.000 (código), ~$100.000 (folio 7) o $200.000 con envío (folio 6 y plan)? Y la re-evaluación «a tarifa plena».
   Una cifra, en `terminos.ts`, y el 80 % se calcula sobre ella.
3. **Tyrian.** Con «Gold/Tyrian 200 kg» Tyrian entra por oferta. ¿Se retira la subasta (EUR, CN-4) o queda dormida para después?
   Propongo dormida.
4. **El dossier.** Un solo documento ES/EN (trazabilidad + Pasaporte/Visa + caracterización) que reemplaza a los cuatro de hoy,
   ¿sí? ¿Con la marca Papagayo Beans® solo cuando hay galardón?
5. **El Q-Grader.** ¿Una credencial de socio `centro-calidad` por persona (hay una, suspendida) y el bache se asigna a esa
   credencial? Propongo sí; el nombre del Q-Grader deja de teclearse.
6. **Congelar la cuenta por ruptura** toca Identidad (`producer_profiles.estado_cuenta` y las puertas de KR). ¿Autoriza? Y la
   ruptura la declara el owner a mano (nunca automática): propongo eso.
7. **Ofertas CP Aceptadas y Contratos** dejan de ser módulo (viven dentro de Catálogo Activo) y **«Oferta desde CTCx Selection»**
   pasa a ser la disponibilidad de lo comprado. ¿De acuerdo con ese rail?
8. **Fase 0**: permiso explícito para borrar el contrato de prueba, su lote y su listado (tres tablas, cuatro filas más las
   liberaciones), y para que el nodo final compile el wrap V47 antes de empezar.

## 7 · Riesgos y su red

| Riesgo | Red |
|---|---|
| Un precio real sale de una banda equivocada (mayúscula/minúscula, rangos del motor) | `pvcParaGrado` es la única puerta; `qa-pvc-precio` reproduce la escalera publicada grado por grado y exige `RANGOS` = `definicion.ts` |
| Un guardián copia la cifra del código y afirma en verde una regla equivocada (V5.53, V5.54) | Todas las cifras de `terminos.ts` se comprueban contra §0 de ESTE documento |
| El Q-Grader ve la variedad o el nombre del productor | `qa-centro-calidad-check`: la consulta del bache selecciona SOLO las columnas anónimas; el UID es `ctcLotReferenceShort` |
| Un productor acepta sin declarar cantidad (guard antes que pantalla) | La declaración es obligatoria SOLO para ofertas con `terms_version`; la fase 6 sale con las cuentas de prueba |
| Se pierde algo al retirar la Arena | Tablas dormidas; 308; `git revert` por fase; el wrap V47 es la foto del antes |
| El socio escribe fuera de su bache | `requirePartner` + el bache lleva `centro_calidad_account_id`; RLS cero políticas, Server Actions con service role |
| Correos a productores que no los pidieron (recordatorios) | Solo dos disparadores (evidencia pedida, mora), semanal, con tope ×4 y el remitente único que ya filtra etiquetas |

## 8 · Lo que no cambia

Los grados y su escala (`definicion.ts`); el PVC como modelo (solo gana una función de lectura); la identidad y las cookies
(salvo la decisión 6); los niveles `admin`/`viewer`; que el contrato nace de la aceptación del productor; lo derivado no se
persiste; los 308; las consolas no se conducen en navegador (el Centro de Calidad y KR sí).

## 9 · Etapa 3, transcrito para no perderlo (folio 10)

Sample Kit Plus (10 kg verde, 5 lotes × 2 kg, US$120–~170 FOB) · Sample Kit Max (24 kg CPS, 5 × 2 kg, US$280–~400) · CaaS
Shipment (500–800 kg verde, cualquier mezcla, MOQ por grado, US$5.900–8.400 hasta 9.400–13.400). Envío FedEx por zonas A–G (Plus
US$65–220; Max US$120–350; Champion para el shipment: zona B 1.750–2.500, F 1.900–2.700, G 3.100–4.900). Referencias por kg de
verde: Black 11 · Red 13 · Blue 16 · Gold 20 US$/kg; mínimo 60 % Black + 40 % Red; ~máximo 80 % Blue + 20 % Gold. Se afinan en
tándem con el PVC. Vive aquí hasta que la Etapa 3 tenga su plan.
