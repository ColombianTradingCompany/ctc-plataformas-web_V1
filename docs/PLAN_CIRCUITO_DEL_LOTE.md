# Etapa 1 · Reestructurar y conectar el circuito del lote (del perfil al Catálogo Activo)

**Estado (wrap V47, 2026-09-25): PLAN aprobado en sus decisiones (§6, 2026-09-24); fase 0 ejecutada en la V5.76; fase 1 ejecutada en la V5.77 (con lo diferido anotado en §5); fase 2 ejecutada en la V5.78 (OCP) y la V5.79 (KR, con el sí del owner); fases 3–8 ejecutadas en la V5.80–V5.85; y, con las decisiones del owner del 2026-09-25, la V5.86 (recordatorios de mora), la V5.87 y la V5.91 (mezclas; la regla 3–4 retirada), la V5.88 (revisión de almacenaje y pedidos de muestra), la V5.89 (bodegas y kilo CTCx), la V5.90 (Adquisición de Stock Café y Sample Kits) y la V5.92 (§10: CVA corregido, planilla dual, Punto homologado) — **la Etapa 1 queda EJECUTADA en código, sin conducir en navegador** (las fases 6, 7 y 8 no se condujeron; ~~exigen las cuentas `prueba-*`~~: esas cuentas se eliminaron el 2026-09-25, V5.89/V5.92). Sigue la **Etapa 2**: correr el proceso de punta a punta con Asistencia a Proveedores y Proveedor Desacoplado; el owner declara la V6.0 al cerrarla. Lo que quedó sin fase está al final del §5 («Pendiente de la Etapa 1, sin fase»).** (escrito sobre la V5.75). Lo pidió el owner con once folios («CTC Platforms
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
| 12 | Cada alta entra a **«Evaluados → Pendiente de Oferta»** (OCP) y a **«Lotes Galardonados»** (KR) con la **Ficha completa**; el galardón sale del puntaje y los factores de grado. Costo para el productor: 2 kg + **~$100.000 COP** [7]. **Bajo los mínimos de Black: rechazo automático con reporte de feedback gratis**; **re-evaluación a tarifa plena ($200.000)**, con **80 % de reembolso si sube un grado** — y antes CTCx analiza que esa mejora aseguraría la oferta [6] | C | ⚠ La cifra del folio 7 (~$100.000) la superó la decisión 2 (§6): tarifa plana de $200.000 |
| 13 | CTCx decide si **tiene sentido comercial** ofertar (por defecto **sí**; puede no ofertar, sin devolución). Idealmente **5–6 semanas antes de los volúmenes** de cosecha | C | [8] |
| 14 | **Oferta «Lote de Temporada»** para el trimestre por comenzar, **anclada al PVC vigente** (PVC × multiplicador, % de modificación): **compromiso de disponibilidad** (cantidad ancla en CPS para el mes 1 + aceptación de las condiciones de retiro) y **compra inmediata de CTCx de una carga (125 kg)** al precio acordado, como inversión en la promoción. Opcional: promoción desde el acuerdo con compra por CaaS al PVC actual | C→P | [8] |
| 15 | **Acepta con claridad**: una **calculadora** que simula escenarios y sobre la que decide la cantidad. **Mínimos por grado: Black/Red 7 cargas · Blue 4 cargas · Gold/Tyrian 200 kg**. Declaración de **trimestre** (periodo por empezar) o de **30 días** (periodo en curso) | P | [4][6] · ⚠ Los mínimos del folio 4 los superó la decisión 1 (§6): 6 · 3 cargas · 200 kg (Tyrian va a subasta) |
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
| **Recordatorios** | consolas | `/api/cron/recordatorios` semanal: certificaciones con evidencia pedida (×4 → retirar), mora; correo al productor (con el remitente único, que ya filtra etiquetas) + nota en su feed. `finca_certificates.status` (`declarada` · `corroborada` · `evidencia_pedida` · `retirada`) + `recordatorios`, `ultimo_recordatorio_at`. ✅ Certificaciones en la V5.78; **mora en la V5.86** (`contract_months.recordatorios_mora` + `ultimo_recordatorio_mora_at`; regla pura `src/lib/trato/mora.ts`: desde que corre el recargo, semanal, tope ×4, nada automático; el mismo cron) |
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
la tabla de evaluaciones (~~promedio de aceptadas al leer~~ — ⚠ superado en la V5.77 por la nota del owner del §6: el grado lo rige UNA
evaluación, `rige_grado`; desde la V5.92 su `sca_total` es el Punto); `arena_inscriptions` como la solicitud (se le cambia el nombre en el
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
| **0 · Limpieza y foto** — ✅ **EJECUTADA en la V5.76** (el borrado; el wrap, pendiente) | V5.76 (docs + Datos) | Borrar el contrato `8618ecda`, sus liberaciones, el listado y el lote `f5187234` (el owner lo pidió) — **hecho en la V5.76** (el video queda huérfano en `kaffetal-media`, se retira por la Storage API); wrap V47 del mapa (~~el log ya tiene 5 asientos~~ compila los 22 asientos V5.71–V5.92; **pendiente**) — desde WRAP-COMMIT-PUSH | consolas · nodo final | ~~permiso explícito del owner para el borrado~~ concedido (decisión 8) |
| **1 · Retiros y mudanzas** — ✅ **EJECUTADA en la V5.77** | V5.77 | **Hecho**: la Arena REHECHA (sesiones de segunda apreciación, `rige_grado`; la jornada, la vitrina y los reclamos fuera de allí); Club fuera (gates de firma y publicación, membresía en el veredicto); campañas → `/ocp/subvenciones` (30–70 % sobre $200.000); reclamos → vista del lote; los diez atributos SCA en una fuente; KPI y tareas de Arena fuera. **Diferido**: temporadas → `/ocp/temporadas`; `src/lib/arena` → `evaluacion`/`trato`; `/ocp/fichas` fundido (fase 2); `RANGOS` ↔ `definicion.ts` (fase 5, con `pvcParaGrado`); contratos NO se funden (decisión 7: son el staging); copy de KR (su charter) | consolas (+ kaffetal-regal copy, herramientas-internas `RANGOS`, socios sello) | — |
| **2 · El registro** — ✅ **EJECUTADA (lado OCP) en la V5.78** | V5.78 | **Hecho**: la vista completa del lote monta el set de Fichas (escáner IA, compilar reporte, **transcribir a mano** = fuente «ctc») junto a la checklist de Visa; la finca gana el **chequeo contra bases EUDR** (texto + adjuntos); **estado por certificación** + **recordatorios semanales ×4** y retiro (cron `/api/cron/recordatorios`, `src/lib/registro/`). **Y en la V5.79 (con el sí del owner, en código de KR)**: A5 al final del intake; el dossier del lote ES/EN (`LotDossierDoc`) = la Ficha descargable; el estado de las certificaciones en la finca del productor y fuera del Pasaporte impreso las retiradas. Queda en ES el Pasaporte de la finca. La Datasheet interna embebida (variante `interna`) sigue en la fase 4 | consolas · kaffetal-regal | — |
| **3 · Solicitud, factura, muestra** — ✅ **EJECUTADA en la V5.80** | V5.80 | **Hecho**: «Solicitudes de Evaluación» (`/ocp/solicitudes`) con la nota de descuento, la subvención decidida por CTCx (emite y canjea el KRX-), la factura de cobro (`FE-AAAA-NNNNN`, imprimible en las dos caras), el pago SOBRE la factura y el recibo con kilos reales; `terminos.ts` (tarifa $200.000, mínimos, 2 kg, contra entrega); Gestión de Muestras 1.ª tanda (partición 500/500/1000, saldo derivado, salidas, pedidos de muestra); **Baches de Evaluación** abierto → en_centro → cerrado (sin laboratorio ni prueba); el circuito gana «solicitada». **Hasta la fase 4** el Q-Grader se teclea al enviar el bache y CTCx registra el veredicto en «Lotes en Evaluación». **Diferido**: la 2.ª tanda de Muestras (alerta de 90 días derivada, muestras para comprador) | consolas · kaffetal-regal | — |
| **4 · Centro de Calidad · Evaluación de Lotes** — ✅ **EJECUTADA en la V5.81** | V5.81 | **Hecho**: `panel/evaluacion` del socio (baches `en_centro` a su nombre, lote a lote anónimo, planilla SCA **o CVA** + factor + mallas + rueda, dar de alta → `lot_evaluations` pendiente con `batch_id`/`escala`/`rueda`/`uid_anonimo`); `partner_accounts.modulos` conmutado en BCP; el Q-Grader es el contacto de la credencial; CTCx confirma o devuelve en «Lotes en Evaluación» (registrar ≠ confirmar); el circuito gana «evaluado»; la taxonomía de la rueda quedó en `src/lib/catacion/rueda.ts` (no en `tools/`: es de `consolas` y el taller la importará). **Diferido**: `green-datasheet` variante interna (herramientas-cafe), el «uso directo» sin bache, `evaluacionPendiente` en la barra de KR; ~~la fórmula del CVA la valida el Q-Grader~~ → **validada y corregida en la V5.92** (§10: ocho secciones, Impresión general ×1, redondeo al 0,25, tazas con tipo de defecto, incompleto sin puntaje; la planilla es DUAL con vista SCA · CVA · Ambas; el Punto homologado desde CVA lleva intervalo, rige el piso y nunca da Tyrian) | socios · consolas · herramientas-cafe | — |
| **5 · Confirmar y ofertar** — ✅ **EJECUTADA en la V5.82** | V5.82 | **Hecho**: `pvcParaGrado(grado, fecha?, {modificadorPct})` en `servicio.ts` sobre `precio.ts` (puro; `RANGOS` del motor derivados de `definicion.ts` — conflicto n.º 1 cerrado); la **oferta anclada** en `/ocp/ofertas` (temporada: PVC × banda, mínimo del grado, compra inicial de una carga, términos versionados; **`directa`** PVC − 8 % con ventana de 30 días y máx.; **`excepcion`** a mano con motivo; past crop −10 %), con `pvc_edition_id`/`pvc_cop_kg`/`modificador_pct` y `reference_price_*` por fin escritos; la **decisión comercial** «no ofertar» con motivo (paso 13); el **rechazo bajo Black gratis** (sin cashback) y la **re-evaluación** a tarifa plena con 80 % si sube de grado (`reevaluar`, previa razón de CTCx); `terminos.ts` completo (compra inicial, tramos 25/25, 4 %, mora 2+2/5 %, renovación 90 d, past crop 9 m/−10 %, ventana 30 d/−8 %) con `qa-trato-check` leyendo el §0; el circuito gana «no superó» y «sin oferta». La confirmación del grado quedó en la fase 4 (`recordEvaluationVerdict` con el alta del Centro): el folio separa confirmar (12), decidir (13) y ofertar (14), y así quedó — no hay `confirmarGradoYOfertar` en una sola acción. **Diferido**: `moqCargas` de `lectura.ts` (es el MOQ de la mezcla de Cherry Picked, §14.4, no el mínimo por lote); los rótulos `RANGOS` del motor Python y del tablero HTML (herramientas-internas) | consolas · herramientas-internas | — |
| **6 · Aceptar con claridad** — ✅ **EJECUTADA en la V5.83 (código de KR con el «continúa» del owner; NO conducida en navegador)** | V5.83 | **Hecho**: la **calculadora** (`src/lib/trato/simulador.ts`, puro: compra inicial, pedido y pago por mes, tramo libre 25/25, «retirar todo costaría» al 4 % — reproduce el ejemplo del §12.9) dentro de `OfferCard`; la **declaración** al aceptar (`respondToOffer(…, {lockedKg ≥ min_kg y ≤ max_kg, trimestre \| 30_dias, aceptaTerminos})` → `lot_offers.locked_kg/declaracion/terms_accepted_at`); el **contrato nace LLENO** (`offer_id`, precio de la oferta, cantidad declarada, `reference_price_*`, `freeze_months` 3 \| 1, `terms_version`, `declaracion`, `compra_inicial_kg`, anclaje) y **`signContract` solo firma**; «Mi trato» en Contratos de Temporada; la directa vencida queda `expirada`; el copy del Club salió de la pestaña. **Pendiente**: conducirla en la **Etapa 2** (aceptar, ver el contrato, firmar en el OCP) con Asistencia a Proveedores y Proveedor Desacoplado — ~~con `prueba-*`~~ (esas cuentas se eliminaron el 2026-09-25) | kaffetal-regal · consolas | ~~cuentas `prueba-*` para verla en vivo~~ → la Etapa 2 |
| **7 · El trato mes a mes** — ✅ **EJECUTADA en la V5.84 (código de KR con el «continúa» del owner; NO conducida en navegador)** | V5.84 | **Hecho**: `contract_months` (pedido · envío · pago · retiro por mes; RLS select-own; **sin `mora_estado`**: la mora se deriva) y `src/lib/trato/mesAMes.ts` (puro: mora 2+2/5 % → ruptura POTENCIAL, mes en curso en tramos de 30 días, tramo libre, `retiro()` al 4 % — reproduce el §12.9 —, past crop 9 m, renovación 90 d); en `/ocp/contratos/[id]` `pedirDelMes` → `registrarEnvioDelMes` (espejo en `contract_releases` al 100 %: el stock del catálogo sigue leyendo lo mismo) → `registrarPagoDelMes` (solo lo enviado) y el cierre solo a `completed`; **la ruptura la declara el owner** (`declararRuptura`, motivo → `status: ruptura` + cuenta **congelada** en `producer_profiles.estado_cuenta`; `descongelarCuenta`) — decisión 6: la mora y la ruptura potencial se DERIVAN y se pintan en el OCP y en KR con la misma función, nada se persiste; **renovación** (`ofrecerRenovacion`: cumplido + 90 d → oferta nueva al PVC vigente con `renewal_of_contract_id`; el contrato viejo queda `renovado`); **past crop** también desde `harvest_to` + 9 m; en KR «Mi trato» con los meses, la mora, el **retiro** (`previsualizarRetiro` → `retirarDelTrato`) y el banner de cuenta congelada; una cuenta congelada no acepta ofertas, no retira y no recibe ofertas; `RELEASE_STAIRCASE`/`recordContractRelease` retirados; el circuito gana «en mora» y «ruptura». **No hecho aquí**: «publicación sin Club» ya estaba (V5.77); los **recordatorios** de mora por correo son la fila «Recordatorios» del ~~§4 (sin ejecutar)~~ §3 (CREAR) — ✅ **ejecutados en la V5.86**. **Pendiente**: conducirla en la **Etapa 2** (~~con `prueba-*`~~, eliminadas el 2026-09-25) | consolas · kaffetal-regal | decisión 6 ✔ (Identidad tocada: `producer_profiles.estado_cuenta`, con línea en `ALINEACION` §3) |
| **8 · CTCx Selection y Compras** — ✅ **EJECUTADA en la V5.85 (código de `cherry-picked` y una línea de KR con el «continúa» del owner; NO conducida en navegador)** | V5.85 | **Hecho**: **`compras`** (el registro de cada compra en firme: lote, grado, kg, COP/kg con su edición del PVC, pagada, recibida, origen) — nace sola al **pagar el mes** de un contrato de compra en firme (oferta `directa` · `black`, `registrarPagoDelMes`) o a mano en `/ocp/compras` (`registrarCompraManual`, con nota); lo disponible se DERIVA (`src/lib/compras/reglas.ts`); **«Oferta desde CTCx Selection» = la disponibilidad** (decisión 7: por lote, comprado · pagado · listado · disponible · «Pasar al Catálogo Activo»; `publishLot` admite un contrato cumplido); **el perfil único** (nombre, lema, descripción, imagen — `platform_settings.ctcx_selection_perfil` → vista `public_ctcx_selection_perfil`) y **la imagen por lote** (`ctcx_selection_lotes`, bucket público `ctcx-selection`, subida firmada); **la vitrina enmascarada** con el perfil en la cinta, la tienda, el portal y la ficha (`src/lib/catalogo/perfilCtcx.ts`, `rotuloCtcx` cae a `CTC_RAZON`); `public_lot_catalog.ctc_selection` sale de `compras` (cualquier grado menos Tyrian) + `ctcx_imagen_path`; el **CRM de `black_negotiations` retirado** (tabla dormida; un Black recibe temporada/directa como los demás); el circuito gana el lateral **«CTCx Selection»** (OCP y KR con `esCompraEnFirme`). `qa-compras-check` (51). **2.ª tanda EJECUTADA en la V5.87**: las **mezclas** (`mezclas` · `mezcla_componentes`; ~~Black 3–4 orígenes y/o variedades · Red una sola variedad · una carga por productor~~ — ⚠ regla superada en la V5.91, abajo — la regla LEÍDA de `lectura.ts` en `src/lib/compras/mezclas.ts` y repetida por el guard `guard_mezcla_cerrada`; borrador → cerrada · anulada, nada se borra; lo asignado descuenta de lo disponible), la **ubicación física** (`compras.ubicacion`, texto libre — decisión 2) y la **unidad** (todo en kg de CPS; la conversión a verde es del Modelo de Producción — decisión 5); la decisión 1 quedó resuelta por diseño (se paga por mes/envío). ~~**Queda con el owner** la decisión 4 (¿la mezcla es un lote nuevo con código público y ficha? — llevarla a la vitrina es otra tanda)~~ — la decisión 4 la **contestó el owner el 2026-09-25 y se ejecutó en la V5.91** (abajo); sigue como pregunta explícita al owner, en el brief de Compras, si una mezcla CERRADA lleva código público y ficha propia en la vitrina. Queda con dueño la imagen en la tarjeta de la tienda (`cherry-picked`). **3.ª tanda (owner, 2026-09-25) EJECUTADA en la V5.90 — «Adquisición de Stock Café (Selection/Sample Kits)»**: la entrada `/ocp/compras` se llama así porque CTCx adquiere con la misma herramienta el stock de CTCx Selection y el de los **Sample Kits** (`compras.destino` = `selection` · `sample_kits`; se elige al registrar y se cambia por fila mientras no tenga kilos en kits); el módulo nuevo **«Stock de Sample Kits»** (`/ocp/sample-kits` + `[id]`, en OCP · Catálogo) gestiona el café adquirido que NO va a «Oferta desde CTCx Selection» (que desde ahora solo cuenta lo destinado a `selection`): los kits **CP** = 8 lotes × 250 g de verde (4 Black/Red, 4 Blue/Gold, 1–2 sobres de 30 g de Tyrian tostado; solo donde hay un Master Roaster o partner CaaS que haga de pivote; ≈ 65 € · US$65) · **Plus** = 5 lotes × 2 kg de verde (envío directo a cualquier región enabled; FOB US$120–170) · **Max** = 4 lotes × 6 kg de CPS (FOB US$280–400); la conversión de la nota del owner: 125 kg de CPS ≈ 90 kg de verde (250 g de verde ≈ 350 g de CPS). Un kit (`sample_kits` SK-AAAA-NNN · `sample_kit_items`) se arma lote a lote con compras destinadas a `sample_kits` —lo disponible = comprado − asignado a kits no anulados, DERIVADO; `guard_sample_kit_stock`—, sale **enviado** completo (con guía; si nació de un pedido de la tienda, `sample_pack_orders` pasa a enviado) o se **anula** con motivo; sus componentes solo cambian armado (`guard_sample_kit_item`); nada se borra. Los 2 kg de muestra del circuito NO surten kits (uso exclusivo de CTCx, V5.89). Regla pura `src/lib/compras/sampleKits.ts`; `qa-compras` 73 → 95 (§11). **Compras 4 EJECUTADA en la V5.91** (owner, 2026-09-25): la regla 3–4 retirada de raíz (`lectura.ts`, `mezclas.ts`, guard); cada lote trae su composición; una mezcla Black/Red es Single Origin (varios estates, misma variedad y proceso) o Regional Blend (misma región), tipo DERIVADO (`mezclas.tipo`); el mínimo es el MOQ de compra (3 cargas) y CTCx asegura un mínimo por temporada (`objetivo_temporada_kg`, informativo); `PVC_BCP_PLAN` §14.8. **Pendiente**: conducirla con Asistencia y Desacoplado (Etapa 2) | consolas · cherry-picked (· kaffetal-regal una línea) | decisión 7 ✔ · respuesta 7 del 23-sep ✔ |
| **Etapa 2** | — | Correr todo con Asistencia y Desacoplado; afinar cada pantalla en sesión de fine tuning; al cerrarla el owner declara la V6.0 | owner + consolas | una credencial `centro-calidad` activa y productores asistidos o desacoplados (~~las cuentas `prueba-*`~~, eliminadas el 2026-09-25) |

Las fases 1–5 no necesitan las cuentas de prueba (se verifican por guardianes, SQL y el lado del socio, que sí se conduce). La 6
y la 7 son las que el productor ve: es donde la Etapa 2 hará su trabajo.

**Pendiente de la Etapa 1, sin fase** (anotado por el nodo final en el wrap V47; nada de esto lo ejecutó ninguna fila de arriba):

- **Ficha retenida del desacoplado** (§3 CREAR; respuesta 6 del brief de rutas): no hay rastro en `src/`. La cifra ya está decidida
  ($200.000, decisión 2). Dueño `kaffetal-regal`.
- **Llamada de bienvenida** (§3 CREAR, paso 2): la tarea derivada `bienvenida` no existe (`TIPOS_DE_TAREA`, `src/lib/panel/tareas.ts`).
  Dueño `consolas`.
- **`qa-evaluacion-check`** (§3 CREAR, Guardianes) no existe: vigilan `qa-evaluaciones-check` y `qa-centro-calidad-check`. Decidir si se
  renombra o se retira la línea. Dueño `consolas`.
- **`/ocp/fichas`**: el §3 (RETIRAR) pedía un 308; la V5.78 lo dejó como índice fuera del rail. Decidir 308 o índice. Dueño `consolas`.
- **La revisión de almacenaje a los 90 días y el kilo CTCx** (V5.88 contra V5.89): la revisión se hace «con 1 kg» de la porción de
  testeo (`src/lib/muestras/almacenaje.ts`), y desde la V5.89 ese kilo se trilla entero (`trillarMuestraCtcx`); sin saldo, la
  pantalla pide un kilo nuevo al productor. **Decisión del owner**: ¿con qué se revisa (reserva CPS, verde al vacío o un kilo nuevo)?
- **El QR y el sticker del lote** (CN-7, absorbida arriba): sin fase; esperan el diseño de la bolsa (O-4 del plan de narrativa).
- **Arrastrado de las fases 1, 4 y 5** (diferido, con dueño): temporadas → `/ocp/temporadas` (siguen en `/bcp/arena/temporadas`);
  `src/lib/arena` → `evaluacion`/`trato`; la variante interna de `green-datasheet` (`herramientas-cafe`); el «uso directo» del Centro;
  que KR alimente `evaluacionPendiente` (hoy solo la tabla del OCP, `ocp/(app)/kr/carga.ts`); los rótulos `RANGOS` del motor Python y
  del tablero HTML (`herramientas-internas`).

## 6 · Decisiones del owner — CONTESTADAS el 2026-09-24

| # | Respuesta del owner | Lo que cambia en este plan |
|---|---|---|
| 1 | Son las cantidades **mínimas declaradas por cada lote**; las baja a **Black/Red 6 cargas · Blue 3 cargas · Gold 200 kg** | `terminos.ts` lleva esa tabla (`MINIMO_POR_GRADO`); ~~`lectura.ts` (`moqCargas`) y `PVC_BCP_PLAN` §14.4 se alinean a ella (herramientas-internas)~~ — ⚠ **no se alinean** (fase 5, V5.82): **son dos mínimos distintos** — el mínimo declarado por lote (`terminos.ts`) y el MOQ de compra (`moqCargas` en `lectura.ts`, `PVC_BCP_PLAN` §12.6/§14.8: Black y Red 3 cargas desde la V5.91); la compra inicial de CTCx sigue siendo 1 carga |
| 2 | **$200.000 COP es la tarifa plana** (2026); los descuentos los da el **código de Subvención (30 % a 70 %)** | La tarifa vive en `terminos.ts`; los códigos de campaña **se conservan** (renombrados a subvención, 30–70 %) y los aplica CTCx o los canjea el productor; el rechazo automático es gratis; la re-evaluación es a tarifa plena con 80 % si sube de grado |
| 3 | **La subasta sigue adelante**; MOQ de Tyrian **100 kg de CPS** | `/ocp/subastas` NO se retira ni se duerme: queda dentro de Catálogo Activo; Tyrian no entra por oferta; CN-4 (US$) sigue en pie |
| 4 | **Un solo dossier por Lote**; una finca puede tener solo su dossier (Pasaporte) | Dos documentos ES/EN: el del lote (trazabilidad + Visa + caracterización) y el de la finca (Pasaporte) |
| 5 | Sí: la credencial `centro-calidad` **activa uno o ambos módulos** (Evaluación de Lotes · Procesamiento de Lotes) y una **versión de uso directo**: emitir una Ficha Técnica o un reporte de procesamiento con la info de su propia interfaz, sin el OCP | `partner_accounts.modulos` jsonb (`{evaluacion, procesamiento}`) y un modo «uso directo» del módulo que no exige un bache; el nombre del Q-Grader deja de teclearse |
| 6 | **Nunca automática; se hace visible de manera automática** | La mora y la ruptura potencial se DERIVAN y se pintan (OCP y KR); `estado_cuenta = congelada` lo escribe solo el owner a mano |
| 7 | Sí. **Oferta desde CTCx Selection** toma lo confirmado como comprado en Compras y dice cuánto pasa al Catálogo Activo, en los mismos términos que cualquier productor (cantidad disponible). **Ofertas CP Aceptadas** viene de los contratos de KR con disponibilidad y contrato firmado, y se aceptan para moverlas al Catálogo Activo. **Las dos son el staging del Catálogo Activo** | `/ocp/contratos` («Ofertas CP Aceptadas») **se queda como módulo** (no se funde): es el staging del lado KR, con la acción «Pasar al Catálogo Activo»; «Oferta desde CTCx Selection» es el staging del lado Compras. El rail del OCP · Catálogo queda: Solicitudes de Evaluación · Lotes a Evaluar · Lotes en Evaluación · Evaluados → Pendiente Oferta · Ofertas CP Aceptadas · Oferta desde CTCx Selection · Catálogo Activo |
| 8 | **Concedido** | **Ejecutado en la V5.76**: borrados contrato, liberaciones, oferta, listado y lote; el video queda huérfano en el bucket (Storage API); el wrap V47 lo llama WRAP-COMMIT-PUSH |

**Y una nota del owner que cambia el §3**: **la Arena se queda** en BCP · Ecosistema de Valor y se rehará para su nueva función.
Por ahora: (a) los **«Reclamos de oficialización pendientes»** (los `lot_evaluations` `producer_claim` = FT2 con soportes) salen
de `/bcp/arena` y entran al chequeo del registro en el OCP (ya estaba en MOVER); (b) **se limpian todas las sesiones** y queda una
interfaz mínima: crear una sesión **con nombre, sin temporada**; dentro, escoger cafés **galardonados** para llenarla; a cada uno
se le puede hacer una **segunda apreciación con la Datasheet Tool**, que se **adjunta al lote** como una `lot_evaluations` más; **el
grado lo rige UNA sola evaluación**, por defecto la inicial (`lot_evaluations.rige_grado`, una por lote) — así que
`officialAverages` (el promedio de las aceptadas) **se retira** y el grado sale de la que rige. En §3, la fila «La Arena como
evento» pasa de RETIRAR a **REHACER** (fase 1: limpiar sesiones y jornada; la interfaz nueva, con la Datasheet interna, en la fase 4).

### Las preguntas tal como se hicieron (para el registro)

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
| Un productor acepta sin declarar cantidad (guard antes que pantalla) | La declaración es obligatoria SOLO para ofertas con `terms_version`; ~~la fase 6 sale con las cuentas de prueba~~ la fase 6 salió en la V5.83 sin conducirse y se conduce en la Etapa 2 (Asistencia · Desacoplado; las cuentas de prueba se eliminaron el 2026-09-25) |
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

## 10 · El Q-Grader corrobora la fórmula CVA y pide una homologación (2026-09-25) — EJECUTADO en la V5.92

**La fuente.** El informe «CTCx · Homologación SCA 2004 ↔ CVA · Consultant report · 25 Sept 2026» (9 páginas, en inglés; copia en
`reference/homologacion-sca-cva-2026-09-25/`, fuera del repo), escrito sobre el one-pager de la V5.81 (`docs/CVA_one-pager_para_el_Q-Grader.pdf`) y
sobre «El Punto y la Tríada» (`PVC_BCP_PLAN` §9.1). El autor advierte que no pudo descargar el PDF oficial del SCA-104 y que el Q-Grader
debe refrendar contra el formulario impreso: las correcciones 1–4 coinciden con el sistema publicado por el SCA (junio de 2024) y se
adoptan; la homologación es una propuesta de diseño y se adopta con las decisiones del owner de abajo.

**Lo que el owner fijó al leerlo (2026-09-25).** «SCA nativo significa que es la evaluación que se busca hacer por defecto y que se usa en
la calibración de la escala de grados. El puntaje CVA de una evaluación debe ser homologado (generalmente se reduce) para evitar
desbalances, con la claridad de que se hace de manera metódica y determinística para hacer la transformación de manera concienzuda y
justa. Además, se le solicitará a los Q-Grader del Centro de Calidad que hagan la evaluación en ambos sistemas de manera paralela, de tal
manera que podamos recoger también ese banco comparativo (la herramienta "CTCx Coffee Datasheet Tool" debe entonces permitir esta
valoración dual con un toggle que hace una, otra o ambas visibles en el formato de evaluación).»

### 10.1 Las seis respuestas al one-pager de la V5.81

| # | Pregunta | Veredicto | Corrección (en código desde la V5.92) |
|---|---|---|---|
| 1 | Constantes 0,65625 · 52,75 · −2 por taza no uniforme · −4 por defectuosa | Sí | Correctas (pendiente 21/32 entre 79 con todo 5 y 100 con todo 9). Redondeo oficial **al 0,25 más cercano**; se retira el redondeo a dos decimales. |
| 2 | Impresión general ×2 (ocho términos) | No | Ocho términos, pero el octavo es **Aroma**. La Impresión general cuenta **una** vez. |
| 3 | Siete secciones en ese orden | No | **Ocho**: Fragancia · Aroma · Sabor · Sabor residual · Acidez · Dulzor · Sensación en boca · Impresión general (la fragancia del molido en seco y el aroma de la bebida son percepciones distintas). |
| 4 | u y d sobre cinco tazas, −2 / −4, sin tope | Sí, con reglas | Cinco tazas obligatorias (cada contador 0–5). **Toda taza defectuosa es también no uniforme** (una defectuosa resta 6), salvo que las cinco sean defectuosas por igual. Un defecto cuenta solo con su **tipo** (moho, fenólico, papa). Las diferencias de intensidad no son falta de uniformidad. |
| 5 | ¿Los mismos umbrales 80/82/84/86/88 para el CVA? | No | El CVA es otra escala: hace falta un **Punto homologado** (§10.3). |
| 6 | ¿Cuál escala rige cuando hay las dos? | El protocolo primario nativo | Rige la catada NATIVA (SCA 2004); un equivalente estimado nunca fija un grado; el protocolo primario se fija por programa o temporada, nunca por lote. |

**Otras correcciones adoptadas**: una planilla con menos de ocho secciones es **Incompleto** (sin puntaje, sin grado) en vez de sumar lo
calificado; los valores fuera de 1–9 o con decimales se **rechazan**, no se recortan; las tazas se guardan una a una con su tipo de
defecto (auditable); y el lado **SCA 2004** aplica sus dominios —los siete atributos escalados van de 6,00 a 10,00 en pasos de 0,25;
Uniformidad, Taza limpia y Dulzor son 2 puntos por taza; los defectos son tazas × intensidad (taint 2, fault 4)—, porque el 2004 ES el
Punto y tampoco admite sumas parciales.

### 10.2 Los ejemplos recalculados (los vectores de prueba de `qa-centro-calidad-check`)

Cada fila es una planilla CVA; «u · d» son las tazas no uniformes y defectuosas. La columna oficial es la que el código tiene que dar.

| Caso | u · d | V5.81 (siete secciones, general ×2) | Oficial SCA-104 (ocho secciones, general ×1) |
|---|---|---|---|
| Todo 9 | 0 · 0 | 100 | 100 |
| Todo 8 | 0 · 0 | 94.75 | 94.75 |
| Todo 7 | 0 · 0 | 89.5 | 89.5 |
| Todo 6 | 0 · 0 | 84.25 | 84.25 |
| Todo 5 | 0 · 0 | 79 | 79 |
| Todo 1 | 0 · 0 | 58 | 58 |
| Todo 7, una taza no uniforme | 1 · 0 | 87.5 | 87.5 |
| Siete 7 e Impresión general 8 | 0 · 0 | 90.81 | 90.25 |
| Todo 7, una taza defectuosa | 1 · 1 | 85.5 | 83.5 |
| Todo 6 e Impresión general 8 | 0 · 0 | 86.88 | 85.5 |
| Todo 7 e Impresión general 5 | 0 · 0 | 86.88 | 88.25 |
| Fragancia 8, Aroma 6, resto 7 | 0 · 0 | — | 89.5 |

Con todas las secciones iguales los dos métodos coinciden; el sesgo de la V5.81 era 0,65625 × (Impresión general − Fragancia/Aroma) y
bastaba para cambiar de grado («Todo 6 e Impresión general 8»: Gold en la V5.81, Blue en el oficial). No había evaluaciones CVA en la
base (las dos que existen son SCA), así que no hubo nada que recalcular.

### 10.3 El Punto homologado (la propuesta del informe, adoptada)

Un CVA no es un SCA 2004: con todas las secciones en 7 el CVA da 89,5 y el formulario 2004 da 79; el SCA no espera una correlación
lineal y no hay conversión publicada. Como El Punto está anclado en el SCA 2004 y el programa Q Grader, la FNC y la BSCA ya se pasaron
al CVA, hace falta una homologación que proteja el significado del grado. Reglas (R1–R8 del informe):

- **R1 · Origen.** Todo Punto viaja con `origen` ∈ {nativo SCA 2004, homologado desde CVA}, su modelo y su panel. **R2 · Lo nativo manda**:
  si hay una catada 2004, ES el Punto; el CVA se guarda y se enseña, nunca se mezcla. **R3 · Intervalo**: un homologado es una terna
  [bajo, valor, alto] en la rejilla de 0,25. **R4 · Grado firme sobre el piso** (`bajo`); si el techo da un grado mayor, se enseña «hasta
  X con recata SCA». **R5 · Compuertas conservadoras**: bajo 80 se rechaza solo si `alto` < 80; si el intervalo cruza los 80, el lote queda
  **pendiente de recata** (ni galardón ni rechazo). **R6 · Tyrian es nativo**: un homologado tope en Gold. **R7** el surplus (la Tríada)
  se aplica al piso, no a la estimación. **R8** se promedia dentro del protocolo y luego se homologa; nunca un 2004 con un CVA convertido.
- **La banda sin calibrar** (mientras no haya datos): SCA ≈ 79 + (CVA − 79) / k, con k de 1 a 2, bordes redondeados hacia afuera en la
  rejilla de 0,25 y el valor con k = 1,5. Ejemplos: CVA 89,5 → Punto 84,25–89,50; CVA 84,25 → 81,50–84,25. Es una heurística transparente
  y ancha a propósito: empuja las decisiones al límite a una recata nativa. Modelo: `banda-k1-2` (sin calibrar).
- **Catación a ciegas en los dos protocolos**: la Tríada es información extrínseca y se oculta al catador hasta enviar la planilla (ya era
  así en el Centro: solo el UID).

### 10.4 Las decisiones del informe, contestadas

| # | Decisión | Lo adoptado (owner 2026-09-25 + recomendación del informe) |
|---|---|---|
| 1 | Protocolo primario de El Punto en la transición | **SCA 2004 nativo**: la evaluación por defecto y la que calibra la escala de grados (owner). Panel de 3 o más cuando lo haya. |
| 2 | ¿Graduar los homologados sobre el piso del intervalo? | **Sí** (R4, R7). |
| 3 | ¿Tyrian desde un Punto homologado? | **No**: solo nativo (R6). |
| 4 | Frase de propósito CVA de la casa | **«Evaluación de lotes de especialidad para comercialización CTCx»** (`CVA_PROPOSITO`), en la planilla. |
| 5 | Presupuesto de calibración | **30 lotes catados en las dos escalas** antes de estrechar la banda (`LOTES_PARA_CALIBRAR`); 100 en dos cosechas. El banco lo alimenta la planilla dual: `lot_evaluations` con `escala = 'sca'` y `cva_total` no nulo. |
| 6 | Ancla de largo plazo (¿reanclar El Punto en CVA?) | **Diferida** a después de la calibración. |

### 10.5 Lo que quedó en código (V5.92) y lo que sigue

- `src/lib/arena/labEvaluation.ts`: planilla DUAL con `vista` (sca · cva · ambas); ocho secciones CVA con enteros 1–9; `cva_tazas` (cinco
  tazas: no uniforme · defectuosa · tipo); `computeCva` con la fórmula oficial, redondeo al 0,25, Incompleto sin puntaje, errores en vez de
  recortes; `computeSca2004` con los dominios del formulario y los defectos por taza (`sca_taint_cups` · `sca_fault_cups`);
  `puntoDeLaPlanilla` (nativo si el SCA está completo, homologado si solo hay CVA, con «Ambas» las dos completas); `escala` derivada.
- `src/lib/arena/homologacion.ts` (puro): `PuntoSca`, `homologarCva` (la banda k 1–2), `puntoNativo` · `puntoHomologado` · `puntoDeFila`,
  `gradoFirme` (piso; Tyrian → Gold si homologado), `techoDelPunto`, `decidirPorPunto` (galardón · sin grado · pendiente de recata),
  `rotuloDelPunto` (nunca un homologado se lee como un SCA catado), `CVA_PROPOSITO`, `LOTES_PARA_CALIBRAR`.
- Base: `lot_evaluations.punto` (jsonb con la procedencia), `cva_total`; `sca_total` sigue siendo la columna que leen todos y desde ahora
  es EL PUNTO (nativo, o el piso del homologado). Acta `docs/migraciones/2026-09-25_evaluaciones_punto_homologado.sql`.
- Pantallas: el Datasheet Tool (`LabEvalEditor`) con el conmutador de vista, los dos bloques con sus dominios, las tazas y el Punto con su
  rótulo; el Centro, «Lotes en Evaluación», la Arena y KR enseñan la procedencia («Punto homologado desde CVA … hasta X con recata SCA»).
  El veredicto: galardón con el grado firme; «pendiente de recata» bloquea galardón y rechazo (R5); una apreciación de la Arena y «la que
  rige» pasan por la misma decisión.
- **Sigue**: (a) la fase 2 del informe —cuando `escala.ts` pase a `definicion.ts` (PVC fase 2, herramientas-internas) consume `PuntoSca`
  y aplica R1–R8 sobre los puntos CTC—; (b) la calibración (≥ 30 lotes duales; regresión de Deming / equipercentil por letra de proceso;
  intervalo de predicción del 80 %; versionar el modelo, p. ej. `calib-v1-2027A`) y el monitoreo (1 de cada 10 lotes duales para siempre);
  (c) la decisión 6; (d) la ficha pública y el dossier dicen el protocolo de la ficha, no aún el origen del Punto — con dueño en
  `cherry-picked` y `kaffetal-regal`.
