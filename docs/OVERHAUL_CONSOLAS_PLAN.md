# Overhaul de las consolas · cuarta consola (LCP), nuevo reparto y el circuito del lote sin Sondeo

**Estado: PLAN, sin ejecutar** (2026-09-19, escrito sobre la V5.58). Lo pidió el owner con un cuadro de cuatro columnas
(BCP · ECP · OCP · LCP) y cinco notas sobre el OCP y Kaffetal Regal. Acordado con él: **plan primero, ejecución por fases**,
una versión por fase. Este documento dice qué existe hoy, a dónde va cada cosa, qué hay que decidir y en qué orden se hace.

Dueño de la ejecución: `consolas` (rail, permisos, rutas, OCP). Alcanza a `kaffetal-regal` (fase 5), `herramientas-internas`
(fase 2) y a todo componente con tablero en una consola. Cada fase deja su línea en `ALINEACION` §3.

---

## 0 · El cuadro del owner, transcrito

| Consola | Grupo | Entradas |
|---|---|---|
| **BCP** | Ecosistema de Valor | Herramientas del Café · Directorio del Café · Coffeed · CTC Tech · Varietales Registrados · Terratalento · Kaffetal Regal Arena (Club) |
| | Configuración del Sistema | Usuarios y Credenciales · Socios de la Red · Documentación de sistema · Mapa de Trabajo · Consumo de IA · Manejo de Plataformas |
| **ECP** | *(cabecera)* | Tablero de Ejecución · Seguimiento de Temas · Transcripciones |
| | Herramientas Internas | **Definición de Contexto** (Definición de Contexto · Misión y Visión · Mercado Global) · **Modelo Económico en Origen** (PVC · Grados) · **Modelo de Producción** (Procesamiento · Empacado) · **Modelo Logístico** (Costos en Puerto Colombia · Costos en Puerto de Destino · Costos Puerta a Puerta) · **Configuración de Plataformas de Pagos** (Zulu, Stripe, Nequi…) · **Automatizaciones** |
| **OCP** | Kaffetal Regal | Productores, Fincas y Lotes |
| | Catálogo | Lotes a Evaluar · Lotes en Evaluación · Lotes Evaluados → Pendiente Oferta · Catálogo Activo · Ofertas CP Aceptadas · Oferta desde CTCx Selection |
| | Manejo de Stock Físico | Gestión de Muestras · CTCx Selection – Compras |
| **LCP** | General | Buzón de Entrada · Leads Recepción · Lista de Espera |
| | CRM | CaaS · Green · Roast · X |

Las cinco notas: **(1)** Productor, Finca y Lote se funden en UNA tabla navegable en cualquier dirección, con el mapa
conservado; el estado de las muestras, el grado, la oferta CP y el estado del trato son columnas, y el clic abre la vista
completa con protagonista **Lote → Finca → Productor**. **(2)** «Lotes a evaluar» reemplaza al Sondeo: el lote cae ahí cuando
el productor confirma que quiere la evaluación y se queda mientras se confirman pago y muestra; **el video deja de ser
requisito y pasan a serlo al menos 2 fotos**. **(3)** «En evaluación» = pagados y recibidos, en cola para la evaluación
completa con las herramientas ya hechas. **(4)** «Evaluados → pendiente oferta» = toda la información del Q-Grader está;
falta que alguien de CTCx **confirme el grado y empuje la oferta**. **(5)** «Catálogo activo» = ofertas aceptadas por el
productor, que aceptó los términos y declaró una **Initial Locked Availability**; y las ofertas que nacen de CTCx Selection,
con cantidad tomada de CTCx Selection · Compras.

## 1 · Lo que el análisis encontró (hechos, 2026-09-19)

1. **Una cuarta consola es barata, con UN detalle que duele si se olvida.** `panel_users.consoles` es jsonb sin restricción
   de claves; el selector `/panel`, `/bcp/usuarios` y el rail iteran sobre `CONSOLE_ORDER`. A mano solo está el tipo
   `PanelConsoleKey`, el propio `CONSOLE_ORDER`, la landing pública `ControlPanelLanding` (copy en tres idiomas) y las
   expresiones `(bcp|ecp|ocp)` de `qa-rutas-consolas` y `qa-niveles`. **Pero nadie tiene hoy la clave `lcp` en sus accesos
   — tampoco el owner**: sin un cambio de DATOS, la consola nace invisible para todos.
2. **Es el mejor momento para cambiar el circuito del lote: casi no hay datos.** Producción: 28 productores, 9 fincas
   (3 aprobadas), 15 lotes (13 en borrador, 1 apto, 1 galardonado), **0 inscripciones, 0 baches de sondeo, 0 negociaciones
   Black**, 1 oferta aceptada, 1 contrato activo, 1 lote publicado. No hay nada que migrar en el tramo que se rediseña.
3. **Casi todo el circuito nuevo se puede DERIVAR de columnas que ya existen** («lo derivado no se persiste»):
   «a evaluar» = hay inscripción y falta pago o muestra (`arena_inscriptions.status`, `lots.sample_2kg_confirmed_at`) — es
   exactamente lo que hoy pinta `/ocp/nominados` como «Embotellados / Recién nominados»; «en evaluación» = pagado y recibido
   sin veredicto; y «evaluado, pendiente de oferta» cabe en **`lot_evaluations.status = pending`**, que ya existe y hoy no usa
   el bache. El enum `lot_stage` ya arrastra cuatro valores que nadie escribe (`videos_ok`, `muestra_transito`, `fila_arena`,
   `evaluado`). DDL de verdad solo piden: las fotos del lote, la disponibilidad inicial, las muestras y las compras.
4. **El video es obligatorio SOLO en el cliente.** `FichaView.tsx` exige `videoUrl` para llegar a `intake_step` 4; ningún
   trigger ni action lo valida (el único control más es humano: el ítem «Video (B4)» de la checklist EVA). **Hoy no se
   exige ninguna foto del lote** — ni existe dónde guardarlas.
5. **El veredicto hace cinco cosas de un golpe** (`recordEvaluationVerdict`): inserta la evaluación oficial, escribe el
   grado y `stage = galardonado`, mueve la inscripción, concede la membresía del Club y —si es Black— abre la negociación.
   La nota 4 del owner pide partirlo: **registrar la evaluación** (Q-Grader) y **confirmar el grado + emitir la oferta**
   (CTCx) son dos pasos de dos personas. Hoy la oferta es además un tercer módulo (`/ocp/ofertas`).
6. **Al aceptar una oferta el productor no declara NADA** (`respondToOffer`: solo una nota si rechaza). La «Initial Locked
   Availability» es un campo nuevo, y choca con algo que ya existe: `signContract` escribe `quantity_frozen_kg` y crea tres
   liberaciones 50/75/100 %, escalera que `ALINEACION` §3b ya tiene como pendiente de corregir (25 + 25 y 4 %, CN-3).
7. **No existe nada de stock físico.** Ni tablas de inventario, compras o bodega; «muestras» son dos marcas de tiempo en
   `lots` (`sample_shipped_at`, `sample_2kg_confirmed_at`). «CTCx Selection» hoy es solo `black_negotiations` (3 estados) y un
   flag DERIVADO en la vista pública; su rama Red·Blue·Gold tiene pantalla y ningún escritor.
8. **Las tres pantallas que se funden no se hablan.** Productores, Fincas y Lotes se enlazan solo por `#ancla` (el lote ni
   siquiera enlaza a su finca), ninguna muestra la OFERTA, el contrato solo aparece en el panel del productor, y la etiqueta
   de etapa está copiada en cuatro sitios. El mapa (`src/components/bcp/GeoMap.tsx`) pinta pines —no polígonos— y vive en dos
   de las tres pantallas.
9. **Tres entradas del cuadro no existen en ninguna forma**: «Seguimiento de Temas», «Configuración de Plataformas de Pagos»
   (Nequi es una constante vacía en código; Stripe, cero código; Zulu, solo en documentos) y los dos de stock físico. «Tablero
   de Ejecución» tiene un pariente: el panel del OCP, que deriva tareas al leer y guarda solo Hecho/Pendiente
   (`bcp_task_state`). `/ecp` es hoy un índice estático con cuatro casillas vacías.
10. **El cuadro invierte dos cosas decididas HOY**: Herramientas Internas vuelve al ECP (la V5.55–V5.56 la puso en el BCP y
    llevó allí los cotizadores: será su **tercera mudanza**, y un **viaje de vuelta** — hay que BORRAR los talones
    `/ecp/cotizador-*` de esta tarde y reapuntar las entradas), y «Mercado Global» va bajo Definición de Contexto, no bajo el
    Modelo Económico. Es barato (`rutasMovidas.ts` está hecho para esto), pero es una reversión y hay que confirmarla.
11. **Deuda que este overhaul cruza**: `leadsActions` exige hoy grant del ECP **y** del OCP para un lead CaaS
    (`PILLAR_CONSOLE` + compuerta fija); `coffeedGate` y `studioGate` llevan `"ecp"` escrito dentro; `/ocp/fincas?status=…`
    se enlaza desde el panel y nadie lee ese parámetro; `setTaskState` revalida `/bcp` y el tablero vive en `/ocp`; y varios
    textos del OCP aún dicen que el grado «viene de la Arena» (desde la V5.17 viene del veredicto).

## 2 · A dónde va cada cosa

**BCP · Ecosistema de Valor** ← `/ecp/herramientas` · `/ecp/directorio` · `/ecp/coffeed` · `/ecp/ctc-tech` · `/ecp/varietales`
· `/ecp/terratalento` · y del OCP `/ocp/arena` (+ `temporadas`, el corredor de la jornada) con `/ocp/club`.
**BCP · Configuración del Sistema** ← lo que ya tiene (`usuarios`, `documentacion`, `mapa`, `consumo`) + `/bcp/socios` (deja de
ser grupo aparte) + `/ecp/plataformas`. **Sale** `/bcp/automatizaciones` hacia el ECP.

**ECP · cabecera** ← `/ecp` (pasa de índice a «Tablero de Ejecución») · «Seguimiento de Temas» (NUEVO) · `/ecp/transcripciones`.
**ECP · Herramientas Internas** ← `/bcp/direccionamiento` (+ `mision-vision`, `mercado-global`) · `/bcp/pvc/*` +
`/bcp/direccionamiento/grados` · `/bcp/cotizador-empaque` (→ Modelo de Producción) · `/bcp/cotizador-logistico` (→ Modelo
Logístico) · `/bcp/anclas-mercado` y `/bcp/cotizador-lotes` (→ bajo el Modelo Económico; no están en el cuadro, D4) ·
«Plataformas de Pagos» (NUEVO) · `/bcp/automatizaciones`.

**OCP · Kaffetal Regal** ← `/ocp/productores` + `/ocp/fincas` + `/ocp/lotes` fundidos en una ruta.
**OCP · Catálogo** ← `/ocp/nominados` (partido en «a evaluar» y «en evaluación») · `/ocp/fichas` (dentro de «en evaluación») ·
`/ocp/ofertas` (partido en «pendiente oferta» y «ofertas CP aceptadas») · `/ocp/contratos` (dentro de «ofertas CP aceptadas») ·
`/ocp/catalogo` + `/ocp/subastas` («catálogo activo») · `/ocp/ctc-selection` («oferta desde CTCx Selection»).
**OCP · Stock físico** ← NUEVO (muestras) y NUEVO (compras; hereda el tablero de negociación de `ctc-selection`).
**Sin sitio en el cuadro**: `/ocp/galardonados` (D4).

**LCP · General** ← `/ecp/buzon` · `/ecp/leads` · `/ecp/ctc-home` (que pasa a ser «Lista de espera» de TODAS las fuentes).
**LCP · CRM** ← `/ocp/crm/{caas,green,roast,x}`.

Son **23 rutas que cambian de consola** (7 en la fase 1, 16 en la fase 2), **7 de ellas de vuelta** al ECP, de donde salieron en
la V4.25 o esta misma tarde (`direccionamiento` y sus `grados`, `automatizaciones`, los tres cotizadores y las anclas). Todas
dejan su 308.

## 3 · Decisiones del owner (con recomendación)

| # | Decisión | Recomendación |
|---|---|---|
| D1 | **¿Se confirma la doble reversión?** Herramientas Internas al ECP (tercera mudanza de los cotizadores) y Ecosistema de Valor al BCP | **Sí, como en el cuadro.** El cuadro es coherente: el BCP queda como «lo que la casa ES» (su ecosistema y su configuración) y el ECP como «con qué decide y ejecuta». Se hace UNA vez, en la fase 2, con todo lo demás |
| D2 | **Accesos a la LCP** (cambio de datos en `panel_users`) | Owner: `admin`. Los dos colaboradores: `viewer`, igual que en las otras tres. Lo ejecuto con su permiso explícito en la fase 1, por SQL, y queda en el CHANGELOG como **Datos** |
| D3 | **Palabra de misión y color de la LCP** (vocabulario congelado: BCP *Business* · OCP *Operation* · ECP *Execution*) | **LCP · Lead Control Panel — *Relationship***: todo lo que entra de fuera y a quién se le responde. Color: el verde de Cherry Picked no (es de una marca); propongo un azul acero que no choque con lavanda / oro / el del OCP |
| D4 | **Lo que el cuadro no dibuja** | `galardonados` → deja de ser módulo: es un FILTRO de la tabla única (grado ≠ vacío). `fichas` → dentro de «Lotes en evaluación». `contratos` y `humedad` → dentro de «Ofertas CP aceptadas». `subastas` → dentro de «Catálogo activo» (pestaña Tyrian). `anclas-mercado` y `cotizador-lotes` → bajo «Modelo Económico en Origen», junto a PVC y Grados. CRM de CTC Tech y de Varietales → **se quedan con su superficie** en BCP · Ecosistema de Valor (son el tablero de esa plataforma, no un CRM de Cherry Picked). Listas de espera de Roast y X → se ven en su CRM **y** en LCP · Lista de espera, que reúne las seis fuentes |
| D5 | **¿Desaparecen los baches de sondeo?** | **Sí, de la pantalla.** El cuadro no tiene sitio para ellos y la nota 3 habla de evaluar «con las herramientas ya hechas», lote por lote. Cero filas en producción. Las tablas `sondeo_batches` no se borran (DDL destructivo que nadie necesita): quedan dormidas y el archivo dice por qué. Si algún día se manda café a un laboratorio externo en tandas, vuelve como una columna «laboratorio», no como un kanban |
| D6 | **Las 2 fotos** | Se guardan como assets del lote (misma tubería que el video, `kaffetal-media`), **mínimo 2, máximo 6**, sugeridas «el café en verde/pergamino» y «el secado o el beneficio». El video pasa a **opcional** y se conserva. El paso 4 del intake se llama «Fotos y video». La checklist EVA cambia su ítem `video` por `fotos`. **Se valida en el servidor**, no solo en el cliente como hoy |
| D7 | **Initial Locked Availability** | Un campo `kg` que el productor declara AL ACEPTAR, junto a una casilla de aceptación de términos (con la versión de los términos congelada como snapshot). **Es lo que alimenta `quantity_frozen_kg` al firmar**, no un número aparte: una cifra, un dueño. La escalera de liberaciones (hoy 50/75/100, pendiente de pasar a 25 + 25 y 4 % por CN-3) **se corrige en la misma fase**, porque se toca el mismo código |
| D8 | **Confirmar el grado y emitir la oferta: ¿un paso o dos?** | **Un paso, una pantalla**: «Evaluados → pendiente oferta» muestra la evaluación del Q-Grader, el grado que resulta (`gradoPorPuntaje`) y el precio que sale del PVC × grado; quien confirma, emite. La membresía del Club y la negociación Black se disparan ahí, no al registrar la evaluación. Rechazar la evaluación devuelve el lote a «en evaluación» con nota |
| D9 | **Las entradas que no existen** (Seguimiento de Temas · Plataformas de Pagos · Procesamiento · Empacado · los tres costos logísticos · Gestión de Muestras · Compras) | **El rail no promete lo que no hay.** Entran cuando tienen módulo, cada una con su **brief** de una página aprobado por el owner. Excepción: «Tablero de Ejecución» SÍ nace en la fase 2, porque su motor ya existe (las tareas derivadas del panel del OCP, generalizadas a las cuatro consolas). Procesamiento/Empacado y los tres costos arrancan enlazando a los cotizadores que ya existen |
| D10 | **¿Wrap del mapa antes de empezar?** | **Sí: Wrap V45 antes de la fase 1.** El log acumula seis asientos (V5.53–V5.58) y el overhaul va a mover media arquitectura: conviene una foto del «antes». Y otro wrap al cerrar la fase 5 |

## 4 · Las fases (una versión cada una, salvo la 5)

**Fase 0 · Wrap V45** (solo docs). Compila V5.53–V5.58. Es la línea base contra la que se medirá el overhaul.

**Fase 1 · La LCP existe** — *riesgo bajo · solo pantallas y permisos* — ✅ **EJECUTADA en la V5.59 (2026-09-19)**
- `PanelConsoleKey` gana `"lcp"`; `CONSOLE_ORDER`, `CONSOLES.lcp` (nombre, palabra, color, rail), `src/app/lcp/(app)/layout.tsx`,
  la tarjeta en `/panel`, el copy de `ControlPanelLanding` en ES · EN · DE.
- **Los guardianes dejan de tener la lista a mano**: `qa-rutas-consolas` y `qa-niveles` derivan las consolas de
  `CONSOLE_ORDER` (hoy tienen `(bcp|ecp|ocp)` escrito nueve veces entre los dos). Se hace PRIMERO, y tiene que pasar en verde con tres.
- Mudanza de 7 rutas: `/ecp/buzon`, `/ecp/leads`, `/ecp/ctc-home` → `/lcp/…`; `/ocp/crm/*` → `/lcp/crm/*`. Con ellas:
  `PILLAR_CONSOLE` y `PILLAR_BOARD_PATH` (todos los pilares → `lcp`, lo que de paso **cura** el doble grant ECP+OCP de CaaS);
  las compuertas de `buzonActions`, `leadsActions`, `crmGreenActions` e `interesActions` a `"lcp"`; los `revalidatePath`; los
  enlaces a mano del panel del OCP; los imports por ruta de archivo de `LeadsBoard` y Terratalento; y los cuatro guardianes
  que leen rutas de archivo (`qa-crm-interes`, `qa-crm-green`, `qa-solicitudes-kr`, `qa-nav`).
- «Lista de espera» pasa de ser solo CTC Home a las seis fuentes de `newsletter_subscribers` + Terratalento, con filtro.
- **Lo que cambió al ejecutarla** (el plan se corrige aquí, no se reescribe): **(1) el color** — D3 proponía un azul acero y
  se descartó: en el conmutador no se distingue del azul del OCP; quedó el carmesí corporativo aclarado (`#F0708A`), el color
  de la paleta que ninguna consola usaba. **(2) `PILLAR_CONSOLE` no se «movió a `lcp`»: desapareció** — la consola de un pilar
  se deduce de la ruta de su tablero (`src/lib/panel/leadsPilares.ts`); CTC Tech y Varietales siguen en el ECP (D4). Y la
  compuerta fina, que solo miraba el GRANT y lanzaba, mira ahora el NIVEL y devuelve el rechazo. **(3) `leadsActions.ts` y
  `LeadModalRow.tsx` no fueron al árbol de la LCP** sino a `src/components/panel/`: sirven a dos consolas. **(4) `interesActions`
  quedó en `["lcp","ecp"]`**, no en `"lcp"`: Directorio y Herramientas siguen enseñando su lista en el ECP hasta la fase 2; el
  guardián aprendió la compuerta en array y la deduce del rail. **(5) Las «seis fuentes»** son cinco de `newsletter_subscribers`
  más la tabla propia de Terratalento. **(6) Queda para la fase 2**: redibujar `EstructuraModal.tsx` con cuatro consolas.
- **Datos (D2)** — ✅ hecho y comprobado por SQL (3 filas; 0 con `ecp`/`ocp` y sin `lcp`): `panel_users.consoles` gana `lcp` para las tres credenciales. Antes del push, SQL: nadie con `ecp` u `ocp`
  y sin `lcp`. Verificación en vivo: `curl -sI` a los siete talones.

**Fase 2 · El nuevo reparto BCP ↔ ECP, y el Tablero de Ejecución** — *riesgo bajo-medio · 16 rutas, 7 de vuelta*
- Ecosistema de Valor al BCP (6 del ECP + `arena` y `club` del OCP); `plataformas` al BCP; `socios` entra en Configuración.
- Herramientas Internas al ECP: `direccionamiento`, `pvc`, `grados`, los dos cotizadores y las anclas, `automatizaciones`.
  **Viajes de vuelta**: borrar los talones `/ecp/cotizador-*`, `/ecp/anclas-mercado` y `/ecp/direccionamiento` (chocarían con
  la página real), invertir sus entradas en `rutasMovidas.ts` y reapuntar las `/ocp/…` otra vez. Las 17 compuertas de
  cotizador/anclas vuelven a `CONSOLA = "ecp"` — una línea por módulo, gracias a la V5.56; `integraciones` también.
- `coffeedGate` y `studioGate` dejan de llevar `"ecp"` dentro: leen la consola del rail de Coffeed (pasa al BCP).
- El rail del ECP agrupa Herramientas Internas por MODELO, como el cuadro. «Mercado Global» queda bajo Definición de Contexto.
- **Tablero de Ejecución**: el motor de tareas derivadas del panel del OCP (`PanelTasks`, `bcp_task_state`) se generaliza —
  cada consola aporta sus tareas— y `/ecp` deja de ser un índice con cuatro casillas vacías. Se corrige el `revalidatePath`
  rancio de `setTaskState`.
- Charters: `herramientas-internas.md` (vive en el ECP), `consolas.md`, y un charter nuevo o sección para la LCP.

**Fase 3 · La tabla única · «Productores, Fincas y Lotes»** — *riesgo medio · pantalla nueva, mismas acciones*
- Una ruta (`/ocp/kr`), **una consulta**, grano de LOTE: cada fila es un lote; la finca sin lotes y el productor sin fincas
  tienen su fila propia (si no, desaparecerían de la pantalla al menos 19 de los 28 productores, que aún no tienen finca). Agrupable por productor o por finca.
- Columnas: Productor · Finca · Lote · Visa EUDR · Ficha (FT · FT2 · EUDR · Fotos) · EVA · Muestra · Grado · Oferta CP ·
  Trato. Cada una es un enlace a la vista completa en SU sección. Filtros: país/departamento, temporada, grado, «galardonados»
  (que así deja de ser un módulo, D4), «sin finca», «sin lote».
- **El mapa se conserva** (`GeoMap`, pines por finca y por lote, agrupación, dial de temporadas) como segunda vista de la
  misma consulta — y por fin enlaza al detalle por parámetro, no por ancla.
- **Vista completa**: una ruta con `?lote=` · `?finca=` · `?productor=`, protagonista Lote → Finca → Productor, que reutiliza
  lo que ya existe (`EvaReviewCard`, `FincaEudrEditor`, las pestañas de `ProducerPanel` y `FincaPanel`) como secciones de UNA
  página, con migas para saltar entre los tres. La etiqueta de etapa pasa a una sola fuente.
- Ninguna Server Action cambia. 308 desde `/ocp/productores`, `/ocp/fincas`, `/ocp/lotes` (las anclas viejas `#finca-…` no
  viajan en un 308: la página nueva las traduce al parámetro).

**Fase 4 · El circuito del lote, lado OCP** — *riesgo alto · reglas de negocio, DDL aditivo*
- «Lotes a evaluar» y «Lotes en evaluación» reemplazan a `/ocp/nominados`; los baches salen de la pantalla (D5). Los estados
  se DERIVAN (§1.3) en un módulo puro con su guardián, para que el OCP y KR no puedan decir cosas distintas.
- `recordEvaluationVerdict` se parte (D8): **`registrarEvaluacion`** (Q-Grader: planilla, soportes, escáner de fichas →
  `lot_evaluations` en `pending`) y **`confirmarGradoYOfertar`** (CTCx: grado, `galardonado`, Club, negociación Black, y la
  oferta con el precio del PVC × grado). «Evaluados → pendiente oferta» es la cola entre los dos.
- «Catálogo activo», «Ofertas CP aceptadas» (con contratos, liberaciones y humedad dentro) y «Oferta desde CTCx Selection».
- DDL aditivo por `apply_migration`: `lot_offers.locked_kg` + `terms_version` + `terms_accepted_at`; guard que impida aceptar
  sin ellos; la escalera de `contract_releases` corregida (D7). Nada se borra.
- Se corrigen los textos que aún dicen que el grado viene de la Arena.
- **Absorbe del plan de narrativa**: CN-3a/b (ofertas y contratos), CN-5 (evaluación: tarifa, sin reembolso del 80 %, avisos
  al productor) y la mitad de CN-6. Se marcan en su tablero al cerrar.

**Fase 5 · Kaffetal Regal** — *riesgo alto · lo ve el productor; se verifica EN VIVO con las cuentas `prueba-*`*
- Intake: el paso 4 pasa a «Fotos y video» — **2 fotos obligatorias, video opcional**, validado en el servidor (D6); DDL:
  dónde viven las fotos del lote y el guard que las congela en `apto`, igual que hoy congela `video_asset_id`.
- «Evaluar mi Café»: las secciones pasan a **Por evaluar · En evaluación · Evaluados**, con lo que falta en cada una (pago,
  muestra) dicho en claro; el stepper del lote cambia `SON` por `EVAL`.
- Aceptar una oferta: casilla de términos + **Initial Locked Availability** (D7), en los tres idiomas.
- Exige las cuentas `prueba-*`, que esta vía no ha tenido en ninguna tanda: **sin ellas la fase no se cierra**.

**Fase 6 · Stock físico y lo que falte** — *briefs primero*
- «Gestión de Muestras» (una tabla de muestras: qué llegó, cuánto, dónde está, a quién se mandó) y «CTCx Selection · Compras»
  (lo que CTCx compra en firme y lo que de ahí se ofrece) **no tienen nada debajo**: cada uno empieza por su brief. Igual
  «Seguimiento de Temas» y «Plataformas de Pagos». Entran al rail cuando existan (D9).
- Wrap V46 del mapa.

## 5 · Lo que no cambia, para que nadie lo mueva

Los grados y su escala (`definicion.ts`); el PVC; la identidad y las cookies; los niveles `admin`/`viewer` (V5.57–V5.58: las
compuertas nuevas declaran su clase desde el primer día); que el contrato nace de la aceptación del productor; que lo
derivado no se persiste; que las URLs viejas no mueren; y que una consola no se conduce en un navegador.

## 6 · Riesgos y su red

| Riesgo | Red |
|---|---|
| La LCP nace y nadie puede entrar | SQL de grants ANTES del push (fase 1) |
| Un permiso se queda en la consola vieja | `qa-rutas-consolas` (f) y (f-bis), ya con las consolas derivadas |
| Una acción nueva queda abierta a un viewer | `qa-niveles`: por defecto `emite`, y sigue la cadena de ayudantes |
| Un talón choca con la página que vuelve | guardián (e) + borrar el talón en el mismo commit (fase 2) |
| OCP y KR dicen estados distintos del mismo lote | UN módulo puro deriva el estado; los dos lo importan; guardián propio |
| Se rompe el único contrato vivo | fase 4: DDL solo aditivo; el contrato `8618ecda` se comprueba por SQL antes y después |
| El productor se queda sin poder postular | fase 5 se verifica en vivo con `prueba-*`; sin cuentas no se cierra |
| Marcha atrás | cada fase es un `git revert`; el DDL es aditivo y no estorba al código anterior |

## 7 · Lo que necesito del owner para arrancar

1. **D1–D10**: «todo lo recomendado», o lo que cambie.
2. **Permiso explícito** para el cambio de datos de la fase 1 (añadir `lcp` a las tres credenciales).
3. **Las cuentas `prueba-*`** antes de la fase 5 (y de paso corren `qa-guard-check` y `qa-checkout-check`, que llevan
   varias tandas sin ejecutarse).
