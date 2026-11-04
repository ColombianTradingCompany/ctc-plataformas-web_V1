# CTCx OS · Módulo «Reuniones» — STRETCH (antes / durante / después)

> Solo lectura. Fuentes: `docs/UNIFICACION_ALINEACION.md` (D-002, D-003, D-007, D-009 3.4, D-013, D-014, D-025, D-031, D-032), `docs/PLAN_UNIFICACION.md` (P5, P6/H8, P7, P25–P33, matriz de entidades, flujos 22/26–29), `docs/SECRETARIA_PLAN.md`, `docs/componentes/{secretaria,consolas}.md`, `docs/BCP_USER_ADMIN_PLAN.md` (niveles) y el código citado. En Notion solo se leyeron esquemas: nombres de bases, propiedades y tipos.
> **BORRADOR · decide el owner.** El charter del componente (`docs/componentes/ctcx-os.md`) y el atlas (`docs/componentes/ctcx-os/atlas.md`) llegan en PR aparte, sin fusionar; hoy no hay ruta `/m/…` ni tablas de juego. Solo nombres de bases, propiedades, tablas, rutas y funciones: ningún dato, id ni persona.

---

## 1 · Qué es «Reuniones» en el juego

Una reunión es la **jugada base** del juego. Un Jugador (GVG o GVB) se sienta con uno o varios Personajes, y eso pasa dentro de una Misión y de un Turno. De la reunión salen Acciones (Tareas) y hechos.

| Pieza del juego | Dónde vive hoy | Cómo se une a la reunión |
|---|---|---|
| **Reunión** | Notion **«Reuniones»** (hub `8 · Ejecución`). Es la base de reuniones por defecto en Notion AI y Notion Calendar desde D-009 3.4 y P6/H8. Por D-031, **cada reunión es una fila**, enlazada a sus sujetos | — |
| **Misión** = Objetivo | Notion **«Objetivos»** (Tipo: Estratégico · Proyecto; Estado; Fechas/Inicio/Final; Progreso, un rollup sobre Hitos) | `Reuniones.Objetivo` (relation, límite 1) ↔ `Objetivos.Reuniones` |
| **Etapa** = Hito | Notion **«Hitos»** (Tipo: Hito · Fase · Bloqueo de calendario; Fechas, cuyo fin es el plazo; Plazo, una fórmula; Bloquea/Bloqueado por; Estado; Responsable) | **Sin relación directa con Reuniones**. Solo se llega por `Objetivo → Hitos` o por `Tareas.Hito` |
| **Acción** = Tarea | Notion **«Tareas»**, la única fuente de tareas (D-003) | `Reuniones.Tareas` ↔ `Tareas.Reunión` (límite 1). La tarea lleva `Tareas.Origen = «Reunión»`. El rollup `Reuniones.Tareas abiertas` cuenta las tareas sin «Cerrada el» |
| **Turno** = Sesión diaria | Notion **«Briefings»** (Tipo: Apertura · Cierre; Para; Fecha; Vencidas, Hoy, Esperando, Correo nuevo, Pendientes de la plataforma, Días sin cierre; Estado: Generado · Revisado). La bitácora de corridas es la tabla `latidos` de la plataforma | Fórmula `Reuniones.Cuándo` (Hoy · Próxima · Pasada). **Briefings no tiene relación con Reuniones** |
| **Personaje** | Notion «7 · Directorios»: **Proveedores**, **Clientes**, **Aliados** y **Contactos**. «Evento» va aparte. Los tres primeros llevan el trío `ctc_id` · `CTC` · `Enlace CTC` hacia la plataforma | Relaciones de Reuniones: `Proveedores`, `Clientes`, `Aliados`, `Contactos`, `Evento` (límite 1). Cada directorio enseña sus reuniones en una vista enlazada (D-031) |
| **Jugador** | Notion **«Equipo»**, cuyo `Código Responsable` vale GVG · GVB · Contador · Externo, y `panel_users` en la plataforma | `Reuniones.Equipo` (relation) y `Reuniones.Responsable` (select). El Responsable solo se **propone**, nunca se escribe solo (matriz de entidades) |
| **Cuartel** = proyecto de Claude | Notion **«Proyectos Claude»** (Nombre, Descripción, Enlace, Estado: Planeado · Activo · Archivado, Personas, Revisado el, Tareas programadas) | Solo de forma indirecta: `Reuniones.Objetivo → Objetivos.Proyectos Claude` |
| **Ficha** / **Cuenta** / **Partida** | La plataforma: `lots`, `contract_despachos`, `stock_partidas`, `quotes`, `sample_pack_orders`, `leads`… | Solo por `Enlace CTC` (url). **Reuniones no tiene `ctc_id` ni `CTC`** |
| **Casilla** (H3 res. 10) | No existe. En la plataforma hay coordenadas en `fincas.eudr_lat`, `fincas.eudr_lng` y `fincas.eudr_polygon_geojson`. En Notion, la propiedad `Ubicación` (place) de Proveedores, Clientes y Aliados | Reuniones **no tiene lugar** |

**Esquema de «Reuniones»**, leído en Notion:
- **Propiedades vigentes:**
  - `Nombre` (title), `Código` (auto_increment_id), `Fecha` (date), `Cuándo` (formula).
  - `Estado` (status: Programada · Realizada · Cerrada · Cancelada).
  - `Tipo` (select: Interna · Estratégica · Externa).
  - `Responsable` (select: GVG · GVB · Contador · Externo).
  - `Área` (select 0 · Dirección … 8 · Ejecución) y `Línea` (multi_select de las seis líneas).
  - `Resumen` (text).
  - Enlaces (url): `Enlace CTC`, `Enlace de la llamada`, `Evento de calendario`, `Carpeta Drive`, `Archivo principal`.
  - Relaciones: `Tareas`, `Objetivo`, `Evento`, `Proveedores`, `Clientes`, `Aliados`, `Contactos`, `Equipo`.
  - `Tareas abiertas` (rollup), `Creada`, `Última edición`.
- **Columnas heredadas** que siguen ahí: `Status` (Programada · Open Points · Concluida), `Priority`, `Effort level` y `Assignee` (person).
- **Plantilla por defecto:** la «Reunión», con su botón de tarea.

---

## 2 · ANTES: preparar la reunión

### 2.1 Qué lee

**a) La reunión y su Misión, en Notion**
- `Reuniones`: la fila con `Fecha`, `Tipo`, `Área`, `Línea`, `Responsable`, sus relaciones y los enlaces de llamada, calendario y Drive. También las filas **anteriores con el mismo Personaje**, con su `Estado`, su `Resumen` y sus `Tareas abiertas`.
- `Objetivos`: `Estado`, `Fechas`, `Progreso`, `Criterios de cumplimiento`, `Proyectos Claude`.
- `Hitos` del Objetivo: `Fechas` (el fin es el plazo), `Plazo`, `Estado`, `Bloqueado por`.

**b) El Personaje y su historial**

| Personaje | Notion | Plataforma (`ctc_id` → id) |
|---|---|---|
| **Proveedor / productor** | `Proveedores`: Estado, Lista KR, Notas de estado, Última revisión, Última revisión de RFQ, Relevancia y Tipo. Relaciones Fincas, Contactos, Compras, Tareas y Reuniones. Campos de la plataforma: `Estado KR (CTC)`, `Gestión (CTC)`, `Cuenta (CTC)`. `Datos bancarios` y `NIT` son sensibles: **nunca se leen** | `profiles` + `producer_profiles` (incluidos `gestion` y `estado_cuenta`) · `fincas` · `finca_parcelas` · `finca_certificates` · `lots` · `arena_inscriptions` · `lot_offers` · `purchase_contracts` (incluido `provisional_at`) · `contract_despachos` · `compras` · `muestras` / `muestra_movimientos` · `producer_inactividad` · **`producer_comm_log`** (hilo con el productor: `context_label`, `note`, `author_role`, `finca_id`, `lot_id`, `lead_id`, `parent_id`, `seccion`, adjunto) · `audit_log` (`entity_type` producer, lot, finca, lot_offer, purchase_contract…). La lectura agregada ya existe: `cargarKr(service, { productorId })` en `src/app/ocp/(app)/kr/carga.ts`, más `src/lib/ocp/circuito.ts` (estado derivado del lote) |
| **Cliente / comprador / lead** | `Clientes`: Estado, Interés en la oferta, Relevancia, Tipo, Oportunidades (→ «Oportunidades de venta»), Contactos, Tareas, Reuniones, `Baja (CTC)` | `buyer_profiles` · `orders` · `sample_pack_orders` · `quotes` (`counterparty_kind`, `profile_id`, `lead_id`, `status`, `total`, `valid_until`, `nota_comercial`, `notion_url`) · `leads` (`status`, `first_replied_at`, `profile_id`) · **`lead_replies`** (`subject`, `body`, `sent_at`, `send_error`) · `event_leads` (`status`, `notes`, `replied_at`, `unsubscribed_at`) · `newsletter_subscribers` |
| **Aliado / socio** | `Aliados`: Estado, Relevancia, Tipo, Contactos, Compras de Insumos, Proceso hasta Producto Terminado, `Nodo CTC (CTC)`, `Credencial (CTC)` (estado, nunca el valor) | `partner_accounts`. Para el nodo del Centro de Calidad, `lot_evaluations` |
| **Contacto** | `Contactos`: Cargo, Notas, Datos clave, `Último contacto` (rollup: la Fecha de reunión más reciente), relaciones Aliado, Cliente, Proveedor y Reuniones | **Sin contraparte** a propósito: `panel_users` nunca se espeja |
| **Finca** | Solo desde `Proveedores.Fincas` | `fincas` (`status`, `eudr_*`), `finca_parcelas`, `finca_certificates` |

**c) Acciones abiertas**
- **En Notion:** las `Tareas` cuyo `Proveedor`, `Cliente`, `Aliado`, `Contacto` o `Reunión` apunta al Personaje, en el grupo de `Estado` que no es «complete». Se leen `Vence`, `Responsable`, `Esperando desde`, `CTC`, `ctc_id` y `Enlace CTC`.
- **En la plataforma:** las tareas **derivadas** de `cargarTareas()` (`src/lib/panel/tareasCarga.ts`) con la casilla de `bcp_task_state` (`item_key`, `state`). Las claves son `lead:<id>`, `finca:<id>`, `comm:<id>`, `humidity:<id>`, `muestra:<lote>:<fecha>`, `pvc:*`, `despacho:vencido:<id>` y `partida:declarar:<id>`. Leen `fincas`, `humidity_readings`, `producer_comm_log` (las 25 últimas del productor), `leads`, `revisionesDeAlmacenaje`, `propuestasPendientes`, `estadoDelAgente` y `pendientesDelCircuito`.

**d) Fichas y Cuentas en juego**
- Para un productor: sus `lots` en el circuito (`stage`, `grade`, el código público), la oferta vigente (`lot_offers`), el contrato y su ventana (`purchase_contracts`, `contract_despachos`), las `compras`, las `stock_partidas` y `catalogo_fuentes` de sus lotes, y las `muestras`.
- Para una cuenta: `quotes`, `orders`, `sample_pack_orders` y la etapa del comprador.

**e) El contexto de la casa (para un dossier escrito con IA)**
- `direccionamiento_context`, ámbitos `record` y `assets`, por `cargarContexto` en `src/app/ecp/(app)/direccionamientoActions.ts` (`requireActiveAdmin`).
- `textoMemoria()` (`src/lib/direccionamiento/memoria.ts`, los grados desde `definicion.ts`).
- Las unidades de `src/lib/direccionamiento/definicion.ts`.

**f) Google**
- El calendario entra por `Evento de calendario` y por Notion Calendar.
- El correo entra por el enlace de búsqueda de Gmail del registro: solo metadatos, y por el conector de una sesión de Claude. La plataforma no entra a Google (D-014 6.4).

### 2.2 Qué escribe
- **Notion `Reuniones`:**
  - La fila nace desde Notion Calendar (base por defecto) o a mano con la plantilla, con `Estado = Programada`.
  - Se llenan `Fecha`, `Tipo`, `Área`, `Línea`, `Responsable` (solo propuesto), las relaciones de Personajes, Objetivo, Evento y Equipo, y los enlaces de llamada, calendario y `Carpeta Drive`.
  - La preparación va en el cuerpo de la página.
- **Después del go-live del briefing**, peldaño (a) del P33: el ejecutor protegido añade las reuniones externas del día (flujo 29).
- **Plataforma:** no escribe nada, por D-002: las reuniones son de Notion. La única escritura posible es `ai_usage` (`registrarConsumo`, `src/lib/ai/consumo.ts`) si un dossier se redacta con Claude. Para eso haría falta una clave nueva en `USOS`, que hoy no existe.

---

## 3 · DURANTE: capturar

### 3.1 Transcripción: dos sistemas, sin vínculo entre ellos
- **Notion AI meeting notes**, dentro de la página de la fila de `Reuniones`, porque es la base por defecto.
- **La plataforma, ECP · Transcripciones**, charter `consolas`. La tabla es `transcripts`: service-role, RLS sin políticas.
  - Columnas: `subject`, `recorded_on`, `notes`, `source_name`, `language`, `duration_seconds`, `speakers`, `speaker_names`, `segments`, `segment_count`, `full_text`, `meta`, `status`, `provider`, `provider_job_id`, `audio_path`, `audio_size_bytes`, `audio_mime`, `job_options`, `error`, `worker`, `claimed_at`, `processed_at`, `created_by`, más las marcas de fecha.
  - El audio va a Storage, en `kaffetal-media`, bajo `transcripts/<uuid>/<archivo>`.
  - **Server Actions** (`src/lib/transcripciones/actions.ts`), todas tras `requireConsoleWrite("ecp", clase)`:
    - Subir audio: `prepareAudioUpload` y luego `createAudioTranscript` (emite).
    - Subir el JSON de la herramienta: `createTranscript` (emite).
    - Corregir lo escrito a mano: `updateTranscriptInfo` y `renameSpeaker` (borrador; los dos están en la lista blanca).
    - Gestionar el trabajo: `retryTranscript`, `sendTranscriptToCloud` y `deleteTranscript` (emite).
    - Leer: `listTranscripts`, `getTranscript`, `getAudioUrl`, `listTranscriptWorkers`, `refreshCloudStatus` e `isCloudConfigured` (lectura).
  - **Worker local** (`tools/transcriptor/ogg_transcriber/worker.py`): RPC `claim_transcript_job`, escribe en `transcripts` y deja su latido en `transcript_workers`.
  - **Nube:** `src/lib/transcripciones/cloud.ts` manda el trabajo a AssemblyAI. El resultado vuelve por el webhook `/api/transcripciones/callback` → `ingestAssemblyResult`, y `pollAssemblyJob` es la red de seguridad.
  - **Hoy no escribe** `audit_log`, `integration_events` ni `ai_usage`.
  - `speaker_names` es texto libre, sin vínculo con Contactos ni con Personajes.

### 3.2 Notas y decisiones
- **Notion:**
  - Notas en el cuerpo de la fila de `Reuniones` y en `Resumen`. `Estado` pasa a «Realizada».
  - Los to-dos que se escriben en el cuerpo los recoge más tarde el Cierre como propuestas.
  - Reuniones **no tiene** propiedad «Decisiones».
- **Notas de directorio, de Notion:** `Proveedores.Notas de estado`, `Contactos.Notas` y `Contactos.Datos clave`, `Clientes.Interés en la oferta`.
- **Cuidado: canales de la plataforma que NO son internos:**
  - `logProducerComm` (`src/app/ocp/(app)/commActions.ts`, emite) escribe en `producer_comm_log`, y **el productor la lee** en su panel (RLS `producer_comm_log_select_own`).
  - `replyToLead` (`src/components/panel/leadsActions.ts`) **manda correo** e inserta en `lead_replies` y en `audit_log` (`replied`).
  - Ninguno de los dos sirve para la nota interna de una reunión.
- **Notas internas de la plataforma que sí lo son:** `anotarLeadDeEvento` y `setEstadoLeadDeEvento` (`src/app/lcp/(app)/formulariosActions.ts`, borrador) → `event_leads.notes` y `status`.

### 3.3 Jugadas en vivo: acciones reales que ya dejan rastro
- **Sesión asistida con un productor** (`src/lib/asistencia/actions.ts`): `abrirSesionAsistida` y `cerrarSesionAsistida`. Escriben `audit_log` (`assisted_session_opened`, `assisted_session_closed`) y una nota «Asistencia CTCx» en `producer_comm_log`.
- **Aceptación provisional en sesión asistida**, V5.190 (`src/lib/ofertas/producerActions.ts`): escribe `audit_log` (`provisional_notified`; luego `ratified` cuando el productor ratifica) y manda correo.
- **Otras acciones del circuito**, cada una con su acción de `audit_log`:
  - ofertas (`src/app/ocp/(app)/ofertasActions.ts`);
  - ventana y despachos (`src/app/ocp/(app)/ventanaActions.ts`: `venta_semanal_confirmada`, `despacho_confirmado_60`, `despacho_recibido`…);
  - cotizaciones (`src/lib/cotizador/actions.ts`: `setQuoteCounterparty` y `saveQuoteDraft` como borrador; `issueQuote` emite `cotizacion.emitida`).
- **Casilla de una tarea derivada:** `setTaskState` (`src/components/panel/tareasActions.ts`, borrador) → `bcp_task_state`.

---

## 4 · DESPUÉS: Acciones, hechos y barras

### 4.1 Acciones nacidas (Tareas en Notion)
- **Base:** `Tareas`.
- **Campos:**
  - `Nombre`, `Estado = Por hacer`, `Vence` y **un solo** `Responsable` (obligatorio en toda tarea abierta).
  - `Área`, `Línea`, **`Origen = Reunión`**, **`Reunión`** (relation).
  - `Objetivo` y `Hito`.
  - `Proveedor`, `Cliente`, `Aliado`, `Contacto`.
  - `Descripción`, `Enlace de origen`.
  - **Solo si es un seguimiento de algo de la plataforma:** `CTC`, `ctc_id` (una sola clave de plataforma) y `Enlace CTC`.
- **Quién la crea:**
  - Hoy, la persona, con el botón de la plantilla «Reunión».
  - Con el briefing: una propuesta «Crear tarea» en Propuestas. Tras el go-live la ejecuta el peldaño (d) del P33, y el (b) archiva las notas en Reuniones.
- **Lo que no se copia (D-002):** el trabajo pendiente de la plataforma, por ejemplo emitir una oferta, se hace en su consola. Cerrar una Tarea nunca cierra nada de la plataforma.
- **Al cerrar, en `Reuniones`:**
  - `Estado`: Realizada → Cerrada.
  - `Resumen`.
  - `Enlace CTC`, apuntando a `/ecp/transcripciones/<id>`.
  - `Archivo principal`: la grabación, en Drive «8 · Ejecución/Reuniones» o en la carpeta de la contraparte.
  - `Tareas abiertas` baja sola: una automatización de Tareas fija «Cerrada el».

### 4.2 Hechos emitidos (propuesta de nombres)
Hoy **ningún código emite eventos de reuniones ni de transcripciones**. Los nombres siguen el patrón de la casa: `cotizacion.emitida`, `jornada.creada`, `herramienta.<id>.<evento>`. El `dominio` es el enum `integration_domain` (`src/lib/integraciones/dominios.ts`) y se toma **del `Área` de la reunión**, 1 a 1: `direccion`, `origen`, `operacion_logistica`, `comercial`, `marca_contenido`, `plataformas_it`, `conocimiento`, `directorios`, `ejecucion`.

| Sentido | `tipo` propuesto | Quién | Payload, solo claves y números, nunca texto (S0, D-013) |
|---|---|---|---|
| Saliente | `transcripcion.lista` | `cloud.ts::ingestAssemblyResult`, el worker o `createTranscript` | id de la transcripción, `recorded_on`, duración, `segment_count`, ref de la reunión si ya está vinculada |
| Saliente | `transcripcion.vinculada` | una acción nueva que vincula una transcripción con una fila de Reuniones | id de la transcripción, ref de la fila; Make escribe `Enlace CTC` en la fila |
| Entrante | `reunion.espejada` | Make → `/api/integraciones/make` → **manejador nuevo** en `aplicar.ts` | devuelve dónde quedó la fila; la columna nueva de `transcripts` sigue el patrón de `cotizacion.espejada` |
| Entrante | `reunion.realizada` · `reunion.cerrada` | Make, al vigilar `Reuniones.Estado` | ref de la fila, `Área`, `Tipo`, los `ctc_id` de los Personajes, número de tareas nacidas |
| Entrante | `tarea.cerrada` (con `Origen = Reunión`) | Make | ref de la tarea y de la reunión, ¿a tiempo? (Vence frente a Cerrada el) |

**`audit_log` propuesto** (columnas `entity_type`, `entity_id`, `action`, `previous_status`, `new_status`, `performed_by`, `notes`):
- `entity_type = "transcript"`, con las acciones `transcript_created`, `transcript_sent_to_cloud`, `transcript_ready`, `transcript_linked`, `transcript_deleted`.
- Lo que se hizo en vivo ya tiene sus filas (§3.3).

**`ai_usage`:** una clave nueva en `USOS` (por ejemplo `reuniones:resumen` o `reuniones:dossier`) si la IA prepara o resume.

### 4.3 Efecto en las barras
No hay tabla ni vista de barras. Todo se deriva de cifras reales. Las fórmulas son decisión del owner.

| Barra | De dónde saldría |
|---|---|
| **Financiera** | Filas de `audit_log` con monto en su tabla de origen: `offer_accepted`, `ratified`, `despacho_confirmado_60`, `despacho_recibido`, `compra_registrada`. Más `quotes.total` / `decided_at` y `cotizacion.emitida`. Una reunión **suma solo si el hecho está vinculado a ella**, y hoy no hay ese vínculo |
| **Felicidad** (relación) | Reuniones «Realizada» con un Personaje externo. `Contactos.Último contacto`. Días desde la última reunión por Personaje. `leads.first_replied_at`, `event_leads.replied_at`. Casillas `comm:*` y `lead:*` hechas en `bcp_task_state` |
| **Realización** | Tareas con `Origen = Reunión` en «Hecha» antes de `Vence`, frente a las «Vencidas» del Briefing. `Hitos` en Hecha. `Objetivos.Progreso`. Reuniones «Cerrada» con `Tareas abiertas` = 0 |

---

## 5 · Tabla resumen

| Fase | Fuente | Lee / escribe | Qué | ¿Existe? |
|---|---|---|---|---|
| Antes | Notion `Reuniones` | L/E | fila, Estado = Programada, relaciones, enlaces | ✅ (P6/H8, D-031) |
| Antes | Notion `Objetivos`, `Hitos` | L | Misión, Etapa, plazo, Progreso | ✅ · ❌ sin relación Reuniones↔Hitos |
| Antes | Notion `Proveedores`, `Clientes`, `Aliados`, `Contactos`, `Equipo`, `Eventos` | L | Personaje, historial y Reuniones enlazadas | ✅ |
| Antes | Notion `Proyectos Claude` | L | Cuartel (vía Objetivo) | ✅ (indirecto) |
| Antes | Notion `Tareas` | L | Acciones abiertas por Personaje y Reunión | ✅ |
| Antes | `profiles`, `producer_profiles`, `fincas`, `finca_parcelas`, `finca_certificates`, `lots`, `lot_offers`, `purchase_contracts`, `contract_despachos`, `compras`, `muestras`, `stock_partidas`, `catalogo_fuentes`, `producer_comm_log`, `audit_log` | L | Personaje productor, Fichas y Partidas | ✅ tablas · ⚠️ `cargarKr` vive bajo `src/app/ocp`, no en `lib/` |
| Antes | `buyer_profiles`, `orders`, `sample_pack_orders`, `quotes`, `leads`, `lead_replies`, `event_leads` | L | Personaje cliente y Cuentas | ✅ |
| Antes | `partner_accounts` | L | Personaje socio | ✅ |
| Antes | `cargarTareas` + `bcp_task_state` | L | Acciones derivadas de la plataforma | ✅ · ❌ sin clave de Personaje |
| Antes | `direccionamiento_context`, `memoria.ts` | L | doctrina para un dossier con IA | ✅ |
| Antes | `ai_usage` | E | gasto del dossier | ⚠️ falta la clave en `USOS` |
| Antes | ruta de pendientes del briefing (P25/P26) | L | lectura protegida de la plataforma | ❌ no construida (D-032) |
| Durante | `transcripts` + Storage + `transcript_workers` + RPC `claim_transcript_job` | E | audio y transcripción | ✅ |
| Durante | AssemblyAI → `/api/transcripciones/callback` | E | transcripción en la nube | ✅ · ❌ sin `ai_usage` |
| Durante | Notion AI meeting notes en `Reuniones` | E | transcripción y notas en Notion | ✅ · ❌ sin vínculo con `transcripts` |
| Durante | Notion `Reuniones` (cuerpo, `Resumen`, `Estado = Realizada`) | E | notas | ✅ · ❌ sin «Decisiones» |
| Durante | `producer_comm_log` vía `logProducerComm` | E | nota **visible al productor** | ✅ (no sirve como nota interna) |
| Durante | `event_leads` vía `anotarLeadDeEvento` | E | nota interna del lead de feria | ✅ |
| Durante | sesión asistida y aceptación provisional → `audit_log` + `producer_comm_log` | E | jugadas en vivo | ✅ |
| Después | Notion `Tareas` (`Origen = Reunión`, `Reunión`, una clave de plataforma) | E | Acciones nacidas | ✅ manual · ❌ Propuestas y ejecutor (P29–P33) |
| Después | Notion `Reuniones` (`Cerrada`, `Enlace CTC`, `Archivo principal`) | E | cierre | ✅ manual |
| Después | `transcripts` ↔ Reuniones (`notion_page_id`…) | E | vínculo | ❌ |
| Después | `audit_log` (`entity_type` transcript) | E | rastro | ❌ |
| Después | `integration_events` `transcripcion.*` / `entrante.reunion.*` | E | hechos | ❌ |
| Después | `aplicar.ts` manejador `reunion.espejada` / `reunion.*` | E | retorno Notion → plataforma | ❌ |
| Después | barras (tabla o vista) | E/L | juego | ❌ |
| Turno | Notion `Briefings` + `latidos` | L/E | sesión diaria | ✅ base · ❌ el briefing no es un proyecto en marcha (D-032) |

---

## 6 · Huecos

1. **No hay vínculo entre `transcripts` y Reuniones.**
   - `transcripts` no tiene `notion_page_id`, `notion_url` ni `notion_synced_at`. `quotes` sí los tiene.
   - Reuniones tiene `Enlace CTC` (url), pero no `ctc_id` ni `CTC`.
   - Falta además un emisor y un manejador para unirlos.
2. **`transcripts` no sabe con quién fue la conversación.** No tiene contraparte: ni `counterparty_kind`, ni `profile_id` o `lead_id`, como sí tiene `quotes`. `speaker_names` es texto libre, sin vínculo con Contactos.
3. **Las transcripciones no dejan rastro en `audit_log`.** Crear, enviar a la nube, borrar (con su audio) o renombrar no se anota.
4. **El gasto de AssemblyAI no entra en `ai_usage`.** `ConsumoRegistrable.proveedor` solo acepta `anthropic` o `gemini`.
5. **`aplicar.ts` no tiene ningún manejador para reuniones.** Solo existen `cotizacion.espejada`, `cotizacion.nota`, `jornada.agendada` y `rts.tablero`. Cualquier `reunion.*` entrante queda como `descartado`.
6. **Nadie llama a `emitEvent` para reuniones ni transcripciones.** Hay además un problema de fondo: `integration_events` es la cola **de salida a Make**.
   - Toda fila con `destino` nulo se despacha al único webhook y gasta una operación de Make.
   - El payload viaja a Make.
   - No hay un destino sellado que sea solo un libro de hechos local.
7. **El espejo F1 no existe.** No hay `notion_espejos`, ni cron `espejo-notion`, ni llave de Notion en la plataforma.
   - Los campos «(CTC)» de los Personajes no se refrescan.
   - D-014 6.4 limita la futura llave de Notion a las bases espejadas, así que **no podría leer Reuniones ni Tareas**.
8. **La ruta protegida de pendientes del briefing (P25/P26) no está construida.** La base «Propuestas» no se confirmó en Notion. El briefing pasó a ser un proyecto posterior (D-032).
9. **Las tareas derivadas no se pueden filtrar por Personaje.** `TareaDeConsola` (`key`, `href`, `consola`) no lleva clave de Personaje; habría que cruzar por `producer_id` o `lot_id`. Además, `comm` solo mira las 25 últimas notas del productor.
10. **No hay un lector del historial de `audit_log` por entidad.** Solo el panel del OCP muestra las 8 últimas filas. Tampoco hay un «dossier del Personaje» en `src/lib/`.
11. **A Reuniones le faltan relaciones y propiedades.**
    - Relaciones: Hitos, Fincas, Fichas técnicas, Oportunidades de venta y Proyectos Claude (este solo es indirecto).
    - Propiedades: «Decisiones» y un lugar (Casilla).
    - Arrastra dos vocabularios de estado (`Estado` y `Status`) y columnas heredadas.
    - Cambiar la estructura es del carril R (D-032).
12. **No hay H3 ni nada del juego.**
    - Ninguna celda H3 (librería ni columna).
    - Ninguna tabla de juego: jugadores, turnos o barras.
    - Ninguna ruta `/m/reuniones` ni charter `ctcx-os`.
13. **Dos capturas en paralelo sin regla.** Notion AI meeting notes y `transcripts` (local o AssemblyAI) conviven sin decir cuál manda.
14. **La plataforma no tiene un canal de nota interna por productor.** `producer_comm_log` la ve el productor. Las notas internas viven en Notion (D-007), lo cual es correcto, pero el juego tendría que leerlas allí.
15. **El Mapa de Trabajo está desfasado.** `src/lib/workmap/schema.ts` sigue con la barra anterior a la V5.64, así que no sirve para ubicar Fichas en el circuito.
16. **Rótulos viejos en Transcripciones.** Los metadatos y comentarios de `/ecp/transcripciones` todavía dicen «OCP».

---

## 7 · Reglas que se mantienen

- **D-002 y la matriz de entidades.**
  - La plataforma manda en lo suyo (OCP y LCP: productores, fincas, lotes, ofertas, contratos, stock, leads, cotizaciones). Notion lo refleja en un solo sentido.
  - Notion manda en reuniones, tareas, objetivos, contactos y conocimiento.
  - La transcripción de la plataforma llega a Notion **solo como enlace** (`Enlace CTC`), nunca como texto.
- **D-003.** `Tareas` es la única fuente de tareas.
  - Una Tarea de Notion existe solo para un seguimiento fuera de la plataforma, y lleva **una** clave de plataforma.
  - Cerrar una Tarea no cierra nada de la plataforma.
  - Toda tarea abierta lleva `Vence` y un solo `Responsable`.
- **D-031.** Una reunión es una fila de Reuniones, enlazada a sus sujetos. El Responsable de una reunión se propone, nunca se escribe solo.
- **Espejo, no sincronización.** De Notion vuelve solo lo que tenga un manejador con nombre en `aplicar.ts`; nunca «el registro entero».
- **Conciliar es humano.** El agente propone un `ctc_id` y el owner lo confirma.
- **Datos que no viajan.**
  - Columnas sensibles (`Datos bancarios`, `NIT`): nunca se espejan, exportan ni entran a un briefing.
  - D-013: Notion guarda el enlace y la obligación, nunca el texto de un correo.
  - Payloads y `ultimo_error`: solo claves, números y códigos (S0, `errores.ts`).
- **D-014.**
  - El briefing escribe solo sus propias páginas y filas de propuesta, y los peldaños de escritura llegan uno por semana tras el go-live.
  - La plataforma no entra a Google.
  - La futura llave de Notion se limita a las bases espejadas.
- **Producción.**
  - Toda Server Action declara su clase: `lectura`, `borrador` o `emite` (por defecto `emite`). Un borrador nuevo entra **primero** en la lista blanca de `docs/BCP_USER_ADMIN_PLAN.md`.
  - Un rechazo devuelve `{ok:false,error}`, nunca lanza.
  - `emitEvent` nunca lanza.
  - Todo gasto de IA pasa por `registrarConsumo`.
  - El audio sale a un tercero solo con el botón explícito.
  - `qa-transcripciones-nube` gasta dinero y no es de batería.
  - Puerta: `tsc`, `eslint` (8), `build` y guardianes; `APP_VERSION`, `CHANGELOG` y el asiento de arquitectura.
- **Componentes.**
  - Las tablas `transcripts` y `integration_events` y los manejadores entrantes son de `consolas`. El espejo es de `secretaria`. La estructura de Reuniones, Tareas, Objetivos, Hitos y Briefings es del carril R de la unificación.
  - Tocar algo de otro componente pide decírselo al owner y dejar una línea en `docs/ALINEACION.md` §3.
- **Anticircunvención.** Nada público ni de cara al comprador (los futuros modos de juego) puede facilitar llegar al productor sin pasar por CTCx.
- **Nada sin el owner.** Ningún esquema nuevo, base, propiedad, manejador ni tabla de juego sin su decisión.
