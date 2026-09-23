# Brief · Las tres rutas del proveedor y los dos módulos de asistencia  (componente: `consolas` · slug: `rutas-del-proveedor` · 2026-09-23)

> **Lo trajo el owner el 2026-09-23** con tres diagramas («CTC Platforms Optimization», guardado fuera del repo en
> `reference/ocp-rutas-del-proveedor-2026-09-23/`): la **Ruta Estándar** del Kaffetal Regal, la **Ruta CTCx Selection** y la
> **Ruta Desacoplado**. Y pidió dos módulos nuevos en el OCP —**Proveedor Desacoplado** y **Asistencia a Proveedores**— que
> «esencialmente me permiten entrar al perfil de un productor para ejecutar por él la creación de Fincas y Lotes y hacer el
> proceso en su nombre». Este brief compara los tres diagramas con lo que hay, dice qué es evidente y se puede hacer ya, y
> escribe las decisiones que bloquean lo demás. Estado: **en scoping — espera al owner.**

**Qué es** — El proceso de CTCx con un proveedor de café tiene TRES rutas, no una: la Estándar (el productor coopera hasta
llegar a los ciclos de venta trimestrales), la CTCx Selection (no participa en los ciclos, pero acepta precio y cantidad para
venderle directo a CTCx) y la Desacoplada (no tiene intención de entender ni usar las plataformas; CTCx juzga que tiene algo
que vale la pena y toma la iniciativa de llevar el proceso por él). Las dos últimas comparten el final: **Compras → Oferta desde
CTCx Selection → Catálogo Activo con la finca enmascarada**.

**Para quién** — El **equipo CTC** que opera el circuito (OCP). Aguas abajo: el **productor** (Kaffetal Regal), el **comprador**
(Cherry Picked y el catálogo público) y el **Q-Grader** (Centro de Calidad).

---

## 1 · Ruta Estándar — paso a paso contra lo que hay

| # | El diagrama dice | Hoy existe | Hueco |
|---|---|---|---|
| 1 | El proveedor crea su perfil general | Sí — signup KR (`LoginModal`, Google, o cuenta provisionada desde un lead) | — |
| 2 | **CTCx agenda una llamada de bienvenida** | **No hay nada**: ni tarea, ni marca. Solo `producer_comm_log` para anotar después | **Evidente y barato**: una tarea DERIVADA en el Tablero de Ejecución («llamada de bienvenida pendiente» = productor sin nota de CTC en sus primeros N días), tipo `bienvenida` en `TIPOS_DE_TAREA`. No persiste nada |
| 3 | El proveedor crea una finca | Sí — KR escribe directo con su JWT (`KaffetalExperience.tsx`) | — |
| 4 | CTCx revisa los documentos y confirma → el proveedor recibe el **Pasaporte** de la finca | Sí — `approveFinca`, `setFincaCertShared`, dossier `/ocp/kr/<id>/dossier` | — (desde la V5.74 el OCP lo llama Pasaporte) |
| 5 | El proveedor crea un lote; CTCx crea una **Ficha Técnica automatizada (base info)** | El lote sí. La Ficha la llena el productor (FT/FT2/EUDR/FOTO); CTCx puede añadir fichas escaneadas (`fichasActions.ts`) | ¿Qué es «base info»? Si es lo que ya sabe la plataforma (finca, variedad, altitud, cosecha), la Ficha ya lo pre-llena. **Pregunta 5** |
| 6 | El proveedor decide evaluar; envía muestras | Sí — inscripción (`postular`) + `sample_shipped_at` | — |
| 7 | CTCx recibe las muestras y **confirma el pago** | Sí, en DOS acciones (`confirmInscriptionPayment`, `confirmSampleReceived`) | El brief `simplificar-ocp-al-circuito` ya propone UNA bandeja «confirmar muestra y pago» |
| 8 | CTCx compila y manda las muestras al **Evaluador del Centro de Calidad** | Los baches de sondeo (`sondeo_batches`), que la 4b retira | El **Centro de Calidad** con login propio no existe (decisión 3 del brief del OCP) |
| 9 | El Evaluador recibe el bache y llena los informes | Lo digita CTCx en el OCP (`recordEvaluationVerdict`) | Es la mitad `registrarEvaluacion` del veredicto partido (4b, D8) |
| 10 | CTCx revisa y confirma los resultados | Dentro del mismo veredicto | Es la mitad `confirmarGradoYOfertar` (4b) |
| 11 | El proveedor encuentra la **Ficha completa para descargar** y una **oferta** | La Ficha se ve (`lot_fichas_select_own`, sin botón de descarga); la oferta existe con **precio tecleado a mano** | El precio **PVC × mult(grado)** está decidido y no está en código (4b / CN-3a). Descarga: `kaffetal-regal` |
| 12 | El proveedor acepta (o no) y **declara la cantidad disponible** | Acepta/rechaza (`respondToOffer`); **no declara cantidad** | Es la Initial Locked Availability (D7, `lot_offers.locked_kg`) — DDL en 4b, pantalla en la fase 5. **El diagrama confirma D7** |
| 13 | CTCx gestiona las ofertas aceptadas hasta el Catálogo Activo | Sí — contrato → firma → liberaciones → `publishLot` | La escalera 50/75/100 → 25 + 25 y 4 % sigue esperando la cifra del owner (4b) |

**Lectura**: la Ruta Estándar YA ESTÁ construida de punta a punta salvo lo que la 4b tiene parado (partir el veredicto, precio
desde el PVC, cantidad al aceptar, escalera) y dos cosas que no estaban en ningún plan: la **llamada de bienvenida** (paso 2)
y el **Centro de Calidad** (pasos 8–9). Nada de esta ruta exige un módulo nuevo.

## 2 · Ruta CTCx Selection — lo que el diagrama AÑADE al brief de Compras

El brief `consolas-ctcx-selection-compras.md` ya describe el módulo. El diagrama fija cinco cosas que ese brief dejaba abiertas
o no decía:

1. **El disparador es el rechazo con interés**: «el proveedor decide NO aceptar [la oferta de los ciclos], pero le interesa la
   oferta PVC por ahora». Hoy `respondToOffer("rechazar")` solo guarda una nota. Falta que el rechazo pueda decir «me interesa
   la oferta directa de CTCx» — y que ESO abra la negociación en «Oferta desde CTCx Selection». **Es el escritor que le falta a
   la rama Red · Blue · Gold** (hoy solo Black abre negociación, y desde el veredicto).
2. **La oferta es por una CANTIDAD, a PVC − 8 %**. `lot_offers.quantity_kg` existe (opcional); el tipo `directa` no (la base
   lo rechaza) y el precio se teclea. **El diagrama confirma la prima del 8 %** (pregunta 3 del brief de Compras: sigue vigente).
3. **Compras documenta y confirma la transacción como hecha**, y **solo entonces** el lote pasa a «Oferta desde CTCx Selection»,
   **donde se fija la disponibilidad** (la nota 5 del owner: la cantidad de CTCx Selection sale de Compras).
4. **La vitrina enmascara la finca en TODOS los espacios de marketing, imágenes incluidas**, y «debemos poder crear ese perfil
   desde Oferta desde CTCx Selection»: es decir, **CTCx Selection tiene un PERFIL editable** (nombre, imágenes, texto) que
   reemplaza al de la finca. Hoy `public_lot_catalog.ctc_selection` solo borra `finca_name` y solo si hubo un «comprar» Black.
   Un perfil de CTCx Selection no existe en ninguna tabla.
5. **La finca queda en la documentación, pero «red taped»** (visible a CTC, no al comprador): la ficha pública y el paquete del
   lote deben leer el perfil de CTCx Selection donde hoy leen la finca (`fichaPublica.ts` ya reemplaza `estate` por `CTC_RAZON`;
   falta el resto).

**Lectura**: esta ruta es el brief de Compras + un perfil de CTCx Selection + el rechazo con interés. Sigue dependiendo de la
4b (el tipo `directa`, el precio desde el PVC) — **pero la 4b ya no depende de nada que el owner no haya contestado hoy** (ver
§6).

## 3 · Ruta Desacoplado — lo nuevo de verdad

| # | El diagrama dice | Hoy existe | Hueco |
|---|---|---|---|
| 1 | Contacto fuera de la plataforma: CTCx encuentra una finca/lote interesante; el proveedor no quiere participar ni entender el trato | — | — |
| 2 | **CTCx crea una cuenta «Proveedor Desacoplado»** para llevar la información en su nombre. **El login queda sin llenar**, para poder asignarle un correo y **entregársela** más adelante. Mientras no, su información pública es la de CTCx Selection | **No existe**: toda cuenta de productor nace de un correo real (signup, Google o `admin.createUser` desde un lead) | El módulo **Proveedor Desacoplado** (§4) |
| 3 | CTCx gestiona TODA la información en lugar del productor (finca, lote, ficha) | A medias: `createLot` en nombre del productor (`source = bcp_manual_entry`), edición del Pasaporte (`updateFincaEudr`). **No hay crear finca, ni parcelas, ni la Ficha (60 campos), ni fotos** desde el OCP | El módulo **Asistencia a Proveedores** (§4) — el mismo mecanismo sirve a los dos |
| 4 | Las muestras van en un bache como cualquier lote; **CTCx asume el costo** de la evaluación (los mismos 2 kg) | La exención existe por rodeo: `postularOnBehalf` + código de campaña al 100 % → `exento` | Una razón explícita «asumido por CTCx» en la inscripción, sin fingir un código de campaña |
| 5 | Si el café corresponde, oferta por una cantidad a **PVC − 8 %** | Igual que §2 (4b) | — |
| 6 | **La Ficha Técnica NO se entrega**; podría entregarse si el proveedor entra al Kaffetal Y paga la evaluación | La Ficha se ve en KR por RLS en cuanto existe. Sin login no hay quien la vea, así que hoy se cumple por accidente; **al entregar la cuenta se vería** | Una marca de **Ficha retenida** que KR respete (`kaffetal-regal`, pregunta 6) |
| 7 | Acepta o rechaza → Compras → Oferta desde CTCx Selection → Catálogo Activo enmascarado | Igual que §2 | ¿Quién acepta, si no tiene login? **Pregunta 4** |

## 4 · Los dos módulos — propuesta de diseño

Los dos módulos son **el mismo mecanismo con dos puertas**: «entrar al perfil de un productor» para crear fincas y lotes y
hacer el proceso en su nombre. Hay dos maneras de construirlo, y una es claramente mejor:

**A · La sesión asistida (recomendada).** El OCP genera un enlace de sesión para el productor (`auth.admin.generateLink`, tipo
`magiclink`, con `supabase-js` 2.110 ya en el repo) y el operador **abre Kaffetal Regal como ese productor** en otra pestaña.
Toda la interfaz que ya existe —crear finca, parcelas, mapa EUDR, la Ficha entera, fotos, video, pedir evaluación, aceptar una
oferta— se reutiliza tal cual; las subidas caen en `kaffetal-media/{producer_id}/…` porque `auth.uid()` ES el productor (la
política de Storage se cumple sola); los guard triggers aplican como al productor —que es lo correcto: en su nombre CTCx hace lo
que él podría hacer, y lo que solo puede hacer CTC sigue en el OCP—. **Las dos cookies no se pisan** (`ctc-panel-auth` para la
consola, `sb-…` para KR: contrato «Sesiones y cookies», §1), así que el operador conserva su consola abierta. Se deja rastro:
`audit_log` «sesión asistida abierta/cerrada por <admin>» y una nota en `producer_comm_log` que el productor SÍ ve («CTCx editó
tu información el …»). Clase `emite`, solo `admin`.

**B · Reconstruir los editores en el OCP bajo service-role.** Crear finca, parcelas y la Ficha de ~60 campos otra vez, en el
árbol de la consola. Duplica lo que KR ya tiene y pinta, y cada campo nuevo del productor habría que hacerlo dos veces. **No.**

Con A, los dos módulos quedan así:

- **Asistencia a Proveedores** (`/ocp/asistencia`, grupo «OCP · Kaffetal Regal»): la lista de productores inscritos con
  «Entrar como…», y el mismo botón en la vista completa del productor (`/ocp/kr?productor=`). Sirve para el productor que pide
  ayuda por WhatsApp y para el que CTCx acompaña de la mano.
- **Proveedor Desacoplado** (`/ocp/desacoplado`, mismo grupo): «Crear proveedor desacoplado» = `auth.admin.createUser` con un
  correo-etiqueta sin buzón (`desacoplado-<código>@ctcexport.com`, el precedente exacto de `panel_users.delivery_email` y
  `partner_accounts`: el correo de acceso es identidad, no bandeja), `email_confirm`, contraseña aleatoria que nadie ve,
  `user_metadata.role = producer` (el trigger `handle_new_user` hace el resto). DDL aditivo: `producer_profiles.gestion`
  (`desacoplado` · `entregado` · null) con `gestion_desde`, `entregado_at`, protegidos por el guard que ya tiene la tabla.
  Después, el mismo «Entrar como…» de Asistencia para cargar finca, lote y ficha. **Entregar la cuenta**: `updateUserById`
  con el correo real + el flujo de recuperación que ya existe (`src/lib/auth/recuperacion.ts`) → `gestion = entregado`.
  Mientras sea `desacoplado`: **ningún correo automático** al productor (bienvenida, ofertas, notas), su tarjeta en `/ocp/kr`
  lleva la insignia «Desacoplado · gestionado por CTCx», y la vitrina lo trata como CTCx Selection.
- **La evaluación asumida por CTCx**: `postularOnBehalf` gana la razón `asumida_por_ctcx` (hoy exige fingir un código de
  campaña al 100 %); el circuito la lee como `exento`, que ya existe.

**Dónde vivirá** — Dos módulos de consola en el OCP (grupo «OCP · Kaffetal Regal»), lógica en `src/lib/asistencia/`.
**Datos** — DDL aditivo en `producer_profiles` (tres columnas, guard extendido); `arena_inscriptions.discount_reason` o
equivalente. Nada se borra. **IA** — Ninguna.

**Contratos que toca** — ⚠️ **Identidad** (§1): una cuenta de productor sin buzón y una sesión de productor abierta por el
equipo son dos cosas que la matriz de identidad no contempla; **no se construye sin el sí del owner** (regla de §1: «PARA y
díselo»). **Vocabulario**: «Proveedor Desacoplado» entra al congelado. **Patrón Supabase** (DDL aditivo con guard). **Niveles**
(las dos puertas son `emite`).

**Guardián previsto** — `qa-asistencia-check`: (1) el enlace de sesión solo se genera para `profiles.role = producer` — jamás
para `bcp_admin`, `partner` ni comprador; (2) toda apertura deja su fila en `audit_log` Y su nota en `producer_comm_log`, o
ninguna; (3) un desacoplado no recibe correos (los tres remitentes miran `gestion`); (4) `gestion` la escribe solo el OCP; (5)
la insignia de `/ocp/kr` sale de la columna, no de una lista.

**Primera tanda** — Asistencia a Proveedores (la sesión asistida con su rastro) + Proveedor Desacoplado (crear, insignia,
entregar) + la evaluación asumida. **No toca ofertas, compras ni la vitrina**: eso viaja con la 4b y el brief de Compras.
Verificable en vivo por SQL y con las cuentas `prueba-*` (la sesión asistida SÍ se puede conducir en navegador: es KR).

## 5 · Lo evidente que se puede hacer sin decisión (y sin este brief)

- La tarea derivada **«llamada de bienvenida»** en el Tablero de Ejecución (paso 2 de la Ruta Estándar).
- `createLot` todavía hace `throw` («Finca no encontrada», «No se pudo crear el lote»): tumba la página. Deuda (c) del charter.
- Los comentarios de `src/lib/ocp/circuito.ts` aún dicen «la EVA documental» (es la Visa; no se pinta, pero se lee).

## 6 · Lo que el diagrama YA contesta de lo que la 4b esperaba

La 4b está parada por tres respuestas del owner (recuadro de la fase 4 del plan). Los diagramas dan dos:
- **D7 confirmada**: «el proveedor decide aceptar y, si sí, declara la cantidad disponible» → `lot_offers.locked_kg` y la
  pantalla de la fase 5 van juntas. La salida propuesta (DDL en 4b sin guard; guard con la fase 5 solo para ofertas con
  `terms_version`) sigue siendo la buena.
- **La prima del 8 % sigue vigente** para CTCx Selection y para Desacoplado («PVC − 8 %»).
Faltan las mismas de siempre: **que el owner abra `/ocp/kr`**, y **las cifras** (25 + 25 y 4 %; retirar el 80 %).

## Decisiones del owner

1. **Identidad — la sesión asistida.** ¿Autoriza que un admin del OCP abra Kaffetal Regal COMO un productor (enlace de sesión
   generado por la consola, con rastro en `audit_log` y una nota que el productor ve)? Es la opción A de §4; la B duplica KR.
2. **Identidad — la cuenta sin buzón.** ¿Autoriza crear productores con un correo-etiqueta `desacoplado-<código>@ctcexport.com`
   (como los socios y el equipo), sin contraseña conocida, hasta que se entregue? Alternativa: exigir siempre un correo real del
   proveedor, aunque no lo use.
3. **La 4b arranca**: con D7 y el 8 % confirmados por los diagramas, ¿confirma las **cifras** (escalera 25 + 25 y 4 %; retirar
   el reembolso del 80 %) y el **orden** (DDL en 4b, guard con la fase 5)? Y ¿abrió `/ocp/kr`? Sin eso no se toca el veredicto.
4. **Quién acepta en la ruta Desacoplada.** El proveedor no tiene login: ¿CTCx registra la aceptación en su nombre? ¿Con qué
   evidencia (mensaje de WhatsApp adjunto, documento firmado)? Decide si la oferta de un desacoplado se acepta desde el OCP.
5. **«Ficha Técnica automatizada (base info)»** del paso 5: ¿es lo que la plataforma ya sabe (finca, variedad, altitud,
   cosecha) volcado en la Ficha, o una ficha en `lot_fichas` que CTCx genera con el escáner? Cambia quién la escribe.
6. **La Ficha retenida del desacoplado**: al entregarle la cuenta, ¿la Ficha se libera solo si paga la tarifa de evaluación
   (la misma de COP 80.000) o sigue retenida? Es una marca en `lots`/`lot_fichas` que KR debe respetar (`kaffetal-regal`).
7. **El perfil de CTCx Selection** (nombre, imágenes, texto que reemplaza a la finca en la vitrina): ¿se crea desde «Oferta
   desde CTCx Selection», como dice el diagrama, uno por lote o uno solo para toda la casa? Va con el brief de Compras.
