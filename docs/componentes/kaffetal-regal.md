# Charter · `kaffetal-regal` — Kaffetal Regal (landing + plataforma del productor)

> Se lee con `docs/ALINEACION.md` al lado. Grupo de la barra lateral: **Kaffetal Regal**.

## Qué es

La plataforma del **caficultor**: la landing (`kaffetal-regal.ctcexport.com`, tres idiomas) y, tras el
login, el **panel en cinco interfaces** (V5.16): Mensajes · Ecosistema · Mi Perfil · Evaluaciones ·
Contratos. Desde aquí el productor registra fincas y lotes, llena la **Ficha Técnica** (FT → FT2 → FOTO
→ EUDR, V5.79), pide su **evaluación** (muestra de 2 kg contra entrega + la tarifa de **$200.000**, `EVALUATION_FEE_COP` =
`TARIFA_EVALUACION_COP` de `src/lib/trato/terminos.ts`, V5.80; la landing y el FAQ lo dicen desde la V5.95, con el 30 % por defecto),
sigue su lote hasta el **galardón**, y responde a las **ofertas** (temporada · directa · excepción, ancladas al PVC desde la
V5.82; la subasta Tyrian aparte) cuya aceptación, con su declaración, crea el contrato. El camino base
del lote (**redibujado por el owner, V5.64**; orden del intake de la V5.79) son DOS líneas: el **expediente** `FT · FT2 · FOTO · EUDR → VISA` y el
**tramo comercial** `MUE → EVA → GRADO → CONT`. **VISA** es la del LOTE — se hereda del **Pasaporte** de su finca y es el **primer entregable de CTCx, y gratis** — y **EVA** es la
**Evaluación de Muestras en Origen** (al Q-Grader y de vuelta con granulometría y perfil sensorial); `SON`, `GAL` y `ARE`
salieron de la barra. El vocabulario lo asentó el owner el 2026-09-20 y vive escrito en la cabecera de `src/lib/eudr.ts`.

## Superficies y rutas

| Ruta | Qué |
|---|---|
| `/kaffetal-regal` | landing + app (`KaffetalExperience.tsx`: landing · panel · Ficha; `?m=` legado → pestaña/drill) |
| `/kaffetal-regal/certificacion/[id]` · `/certificacion-lote/[id]` | Pasaporte EUDR de la finca y Visa del lote (vocabulario de la V5.65). V5.113: la Visa se descarga desde la tarjeta del lote («⬇ Descargar Visa EUDR», como el Pasaporte) cuando CTCx la otorgó (`apto` o posterior) Y el Pasaporte de la finca está vigente (`lotEudrStatus` = «Visa lista»); con Visa y sin Pasaporte vigente, la tarjeta lo dice |
| `/kaffetal-regal/dossier/[id]?lang=es\|en` | el **dossier del lote** ES/EN (`LotDossierDoc`, V5.79): la Ficha descargable |
| `/kaffetal-regal/herramientas/[slug]` | la concha de Herramientas del Café en esta superficie (charter `herramientas-cafe`) |
| `/api/kaffetal-regal/next-step` | el asesor «¿Y ahora qué?» (plumbing conservado a propósito) |
| `/kaffetal-regal/auth/callback` | OAuth de Google |

## Mapa de código

- `src/components/kaffetal-regal/` — `KaffetalExperience.tsx` (estado, `loadData`, la pila de capas del
  botón atrás: drill = capa, pestaña = no), `AppDashboard.tsx` (concha + `PanelNav`), **`panel/`**
  (`panelTabs.ts`, `PerfilTab`, `EvaluacionesTab`, `ContratosTab`, `EcosistemaTab`+`FlipCard`, `MensajesTab`,
  `mensajes.ts`), `FichaView.tsx` + **`ficha/`** (8 panes: A1–A5, B1–B4; `fichaData.ts` = `FichaFormData`,
  `ReportFiles`, `FichasDelLote`, `FichaPreview`, `SpiderChart`), `FincaView.tsx` (V5.102: la PÁGINA de la finca, misma cabecera
  que la Ficha; su cuerpo es `FincaEditorBody` de `FincaModal.tsx`, que sigue siendo el pop-up para registrar una finca nueva),
  `ConfirmarBorradoModal` (V5.102: «Borrar Lote» / «Borrar Finca» escritos), `InfoView.tsx` (V5.107: la PÁGINA de la Información
  general; cuerpo `InfoEditorBody` en `InfoModal.tsx`, que ya no monta pop-up), `LotKanbanStepper`,
  `FileDrop`, las secciones de la landing en la misma carpeta (`ArenaSection`, `PorQueSection`, `OportunidadSection`, `TratoSection`, `FaqSection`, `BienvenidosSection`, `CalendarioSection`…), `data.ts`
  (tipos `Lot`/`Finca`, `STAGES`, `isLotCommitted`).
- `src/lib/arena/producerActions.ts` (postular/solicitar evaluación, pagos), `src/lib/ofertas/producerActions.ts`
  (`respondToOffer`, V5.83: con la **declaración** — `lockedKg`, `trimestre | 30_dias`, `aceptaTerminos` — y el contrato que nace lleno),
  `src/lib/trato/simulador.ts` (la **calculadora** del trato, pura; de `consolas`), `src/lib/trato/mesAMes.ts` (lo DERIVADO del trato — mora, mes en curso, retiro, past crop —; puro, de `consolas`, V5.84),
  `src/lib/trato/producerActions.ts` (`previsualizarRetiro` · `retirarDelTrato`, V5.84) y `src/lib/trato/terminos.ts` (los términos que se aceptan), `src/lib/fichas/tipos.ts` (set de Fichas), `src/lib/kaffetalMedia.ts` (subidas + URLs
  firmadas), `src/lib/eudr.ts`, `src/lib/evaluations.ts` (`officialAverages`), `src/lib/lotComposition.ts`,
  `src/lib/geo/` (área, elevación), `src/lib/earthKml.ts`, `src/lib/kaffetal/faq.ts`, `src/lib/grados/` (lee).
- `src/lib/useAutosave.tsx` — autosave con flush de desmontaje: **snapshot y `save()` solo desde estado React**.

## Tablas que posee (con RLS de productor + guard triggers)

`fincas` · `finca_parcelas` · `finca_certificates` · `lots` (`datasheet` jsonb = toda la Ficha; `intake_step`;
`stage` solo `borrador → ficha_completa` desde el JWT) · `lot_contributions` · `ficha_completion_snapshots` ·
`media_assets` (bucket `kaffetal-media`, ruta `{producer_id}/…`) · `producer_profiles` · `producer_comm_log` /
`producer_comm_ack` (hilos) · `lot_evaluations` (filas `producer_claim`).
**Solo lee** (select-own): `arena_inscriptions`, `arena_entry_codes`, `lot_offers`, `lot_fichas`,
`purchase_contracts` (+ releases, humedades, `contract_months` — V5.84), `harvest_seasons` (vía snapshot en la oferta).
`producer_profiles.estado_cuenta*` (V5.84) lo escribe SOLO el owner desde el OCP (`declararRuptura` · `descongelarCuenta`); el JWT
no lo cambia (guard trigger) — una cuenta congelada no acepta ofertas ni retira.

## Guardianes

`qa-kr-panel-check.mjs` (119) · `qa-kr-ficha-check.mjs` (**206**, con `ts-resolve` — el charter decía 207, pero la línea
base real medida el 2026-09-20 era **205**: la V5.64 sumó una) ·
`qa-reportado-productor-check.mjs` (**45**) · `qa-evaluaciones-check.mjs` (**50**, lado productor + vocabulario) ·
`qa-ofertas-check.mjs` (36, `respondToOffer`) · `qa-fichas-check.mjs` (31, panes B2/B3) ·
`qa-solicitudes-kr-check.mjs` (22) · `qa-visa-check.mjs` (97) · `qa-area-check.mjs` (55, con `--import ./scripts/ts-resolve.mjs`) · `qa-claims-check.mjs` ·
`qa-recuperacion-check.mjs` (puerta KR).

## Reglas propias

- **Borrar un lote o una finca se confirma ESCRIBIENDO «Borrar Lote» / «Borrar Finca»** (owner, 2026-09-30, V5.102), desde el botón
  «Borrar» de su pantalla de edición (y desde la tarjeta de «Mis Fincas»); nunca con `window.confirm`. La regla de qué se puede borrar
  sigue en `isLotCommitted` / `fincaSelfDeletable` (`data.ts`, espejo de las RLS `lots_delete_own_before_mue` y
  `fincas_delete_own_not_committed`); los DELETE piden `.select("id")` porque una RLS que filtra devuelve cero filas, no error.
- **Cuánto y dónde se paga la evaluación** (owner, 2026-10-01, V5.129). «Solicitudes de Evaluación» abre con tres cifras y cuatro
  pasos (`panel/PagoDeEvaluacion.tsx`); cada solicitud trae su cuenta y el estado de la factura. El medio de pago NO vive en el
  código: lo escribe CTCx en el OCP (`platform_settings.carril_de_pago_evaluacion`) y llega por `carrilDePagoAction`.
- **Un lote o una finca pueden desaparecer por un borrado nuclear de CTCx** (owner, 2026-10-01, V5.134). Lo hace el OCP, no el productor;
  a él le llega una nota en su hilo (sin lote ni finca: ya no existen) y un correo que dicen que fue una operación unilateral por
  razones del sistema. Kaffetal Regal no tiene que hacer nada: al recargar, el lote o la finca ya no vienen. Lo que no se borra así
  y el archivo, en el charter `consolas`.
- **El productor SOLICITA los chequeos de CTCx** (owner, 2026-10-01, V5.128). Legislación y sostenibilidad siguen siendo material de
  la revisión de CTCx (no determinan el Pasaporte), pero el productor los marca y los pide desde la pestaña 3 de la finca, con nota e
  imagen por ítem (`ChequeosCtcx.tsx` → `fincas.eudr_chequeo_solicitudes`; catálogo en `src/lib/eudrAtributos.ts`). Es un envío
  propio, fuera del guardado de la finca y del fieldset de solo lectura: funciona con la finca aprobada.
- **La finca puede estar FUERA de Colombia** (owner, 2026-10-01, V5.127). El Departamento se elige de la lista completa (32 y
  Bogotá D.C., `src/lib/geo/departamentos.ts`); el interruptor «Fuera de Colombia» lo congela y pide el país (Perú, Ecuador,
  Venezuela, Panamá, Costa Rica, Guatemala, El Salvador) → `fincas.pais` (null = Colombia; con país, sin departamento). Quien
  enseñe la región de una finca usa `pais || depto`; el Pasaporte declara ese país y su riesgo (`EUDR_COUNTRY_RISK`).
- **Una finca APROBADA no se edita: se REVISA** (owner, 2026-10-01, V5.124). El botón de la tarjeta dice «Revisar» y la página abre en
  solo lectura (fieldset deshabilitado, sin autosave ni Guardar). Los cambios se piden con **«Solicitar revisión de datos»**: uno de los
  cuatro puntos de la finca, una nota y un adjunto opcional (`producer_comm_log.seccion` / `adjunto_*`); se pueden mandar varias. CTCx
  aplica el cambio desde el OCP, en nombre del productor.
- **El documento de respaldo de la finca es SOLO el SICA** (owner, 2026-09-30, V5.114): sin selector de tipo; al subir el PDF,
  `eudr_support_doc_type` pasa a `sica`. Las fincas con un tipo viejo lo conservan y la pantalla lo dice. `qa-visa` lo vigila.
- **Editar Y registrar una finca son una página completa** (`FincaView`, V5.102 · V5.112), como la Ficha del lote; desde «+ Agregar
  finca» y desde A2 de la Ficha (que vuelve a la Ficha al guardar). **Y la Información general también** (`InfoView`, V5.107). Los
  pop-ups `FincaModal` e `InfoModal` no existen: sus archivos conservan el nombre y solo exportan el cuerpo del editor. En KR solo quedan
  pop-ups para entrar, confirmar un borrado, pedir revisión de datos y las instrucciones de envío. `qa-kr-ficha` vigila las tres reglas.

- **El código del lote es `CTC-L-XXXXXXXX`** (owner, 2026-09-30, V5.100): la misma forma que `CTC-P-` (productor) y `CTC-F-` (finca),
  derivado del uuid en `src/components/kaffetal-regal/data.ts` (`ctcLotReference` = `ctcLotReferenceShort`); es lo que va en el
  paquete de muestra, en la factura, en el UID anónimo del Q-Grader y en `datasheet.ctc_uid`. El `CTCX-XXXX-XXXX` público del catálogo
  (`lots.public_code`) es OTRO código y no cambió. Las 13 fichas guardadas con el `CTC_` viejo se reescribieron por SQL.

- **El productor nunca escribe un grado ni un estado más allá de `ficha_completa`**: lo hace el OCP.
- **La barra del lote son DOS líneas y su segunda línea NO se calcula aquí**: `estadoDelCircuito()`
  (`src/lib/ocp/circuito.ts`) es la fuente única del tramo comercial, y el panel la IMPORTA (V5.62 → V5.64).
  `qa-evaluaciones` lo exige.
- **Pasaporte = finca · Visa = lote · EVA = Evaluación de Muestras en Origen** (owner, 2026-09-20). Una palabra, un
  objeto, en toda la red. La definición está en la cabecera de `src/lib/eudr.ts`; `qa-evaluaciones` la vigila.
- **Un cafetal se edita en UN solo sitio**: `CafetalEditor` lo montan tanto la Parcela 1 como las 2..N. Y la
  pregunta «¿mayor a 4 ha?» se DECLARA antes del mapa — nunca se deduce del área, que es un dato posterior. **V5.122** (owner,
  2026-10-01): el área, la altura y esa respuesta del Cafetal 1 **viajan con Guardar Finca** (`cafetalUno` → `mirrorParcelaUno`), y los
  **Totales de la finca se calculan solos** (área = Cafetal 1 + adicionales; altura = la del Cafetal 1): sin campos ni botones. **Y se GUARDA**
  (`finca_parcelas.requires_polygon`): la V5.65 la declaró pero dejó la columna generada, y del 2026-09-20 al 30 ninguna
  escritura de parcelas entró — el espejo de la parcela 1 callaba y las fincas nuevas quedaban sin Cafetal 1 (V5.110, acta
  `2026-09-30_parcelas_requires_polygon_es_declaracion.sql`). **Un espejo que no puede escribir lo dice**; `qa-visa` lo vigila.
- **El proceso de beneficio es de cada VARIEDAD** y la **Especie se deriva** de ellas. `species`,
  `base_processing` y `special_processing` se siguen escribiendo como PROYECCIÓN de la variedad dominante — los
  leen otros componentes; son copias de lectura, no verdades paralelas.
- **Lo derivado no se persiste**: B3 calcula al leer el factor o la almendra que el productor no reportó
  (`factor × almendra = 17.500`) y jamás lo escribe al datasheet — así el OCP distingue lo declarado de lo calculado.
- **Todo campo nuevo del datasheet nace con default seguro** (`{ ...EMPTY_FICHA, ...lot.datasheet }`) — un
  lote guardado antes de que existiera el campo no puede reventar.
- Las subidas van por `kaffetalMedia` con la ruta `{producer_id}/…` (las políticas de Storage la exigen);
  la re-descarga sobrevive al bloqueo de la sección (anclas con URL firmada bajo demanda).
- Reportado por Productor (B2/B3): **o lo uno o lo otro** (owner, 2026-09-30, V5.109). **«No lo sé»** deja todo opcional (B2: puntaje,
  escala, perfil; B3: factor / almendra). **«Tengo un reporte»** hace obligatorios los números, el perfil (B2), al menos un soporte (PDF o
  foto) y quién lo emitió (`b2_reporte_ref` / `b3_reporte_ref`) — y **es la solicitud de oficialización**: sale sola al enviar la FT2
  (`lot_evaluations` `producer_claim` con el primer soporte); el banner de B2/B3 ya no pide otro adjunto. Los números de B3 **siempre a
  la vista**. `qa-reportado-productor` lo vigila.
- Back del teléfono: cambiar de pestaña no sale de la app; drill, Ficha y modales cierran capa a capa.
- Copy en tres idiomas; el cacao solo como nota de cata.

## Lo que las consolas gobiernan de este componente

| Quién | Qué | Dónde |
|---|---|---|
| OCP · Fincas | el **Pasaporte EUDR** de la finca (~~visa EUDR~~, vocabulario de la V5.65/V5.74; `fincas.status`, `eudr_*` de evaluación) | `/ocp/fincas`, `qa-visa` |
| OCP · Lotes | **EVA** (checklist + `lotEudrGate`) → `apto` + sello; borrado de abandonados | `markLotApto`, `actions.ts` |
| OCP · Productor (V5.103) | **la vida de la cuenta**: una cuenta Marchitando sin finca ni lote recibe un recordatorio, al mes un aviso y al mes siguiente se borra sola (cron semanal), salvo que el owner la proteja; el owner también puede borrarla a mano («Borrar Cuenta» escrito). Los dos correos son texto plano por el remitente único (`src/lib/inactividad/correos.ts`) | `src/lib/inactividad/`, `/ocp/kr?productor=`, `qa-inactividad` |
| OCP · Productores, Fincas y Lotes (`/ocp/kr`, V5.61 — eran tres módulos) | la **Visa** de la finca (aprobar · rechazar · compartir la certificación), la **EVA** del lote (checklist y veredicto Apto/No apto), el recibo de la muestra, la DDS | `actions.ts` (sin cambios) |
| OCP · Nominados (Lotes a Evaluar · en Evaluación) | bache al Centro de Calidad (V5.80–V5.81), confirmar o devolver el alta del Q-Grader y el **veredicto** — decide **el Punto** (`decidirPorPunto`, `src/lib/arena/homologacion.ts`, V5.92) → `gradoPorPuntaje` → `galardonado` (~~+ Club~~: el galardón no reparte membresía desde la V5.77) | `recordEvaluationVerdict` |
| OCP · Ofertas / Contratos | emisión de ofertas ancladas al PVC (temporada · directa · excepción · black · subasta) y la decisión «sin oferta»; la firma del contrato (que nace lleno de la aceptación con declaración, V5.83); **el trato mes a mes** (V5.84: pedido · envío · pago por mes; la **ruptura** la declara el owner y congela la cuenta — `producer_profiles.estado_cuenta` —; la renovación a los 90 días) | `ofertasActions`, `contractActions` |
| OCP · Fichas | el set de Fichas Técnicas y cuál es la **oficial ★** | `fichasActions` |
| BCP · Kaffetal Regal Arena (del OCP hasta la V5.59) | ~~la invitación a la **vitrina** (Blue/Gold/Tyrian con contrato)~~ — desde la V5.77, **sesiones de segunda apreciación** sobre lotes galardonados: cada apreciación llega al productor como nota y como una evaluación más, y el owner puede elegir la que rige | `arenaActions.ts` (`registrarApreciacion`, `elegirEvaluacionQueRige`) |
| ~~BCP · Kaffetal Club (del OCP hasta la V5.59)~~ OCP · Campañas de Subvención (V5.77) | ~~membresía (llega con el galardón), campañas de pasaporte~~ — el Club dejó de ser membresía en la V5.77; quedan los **códigos de subvención** (30–70 % sobre la tarifa de $200.000) que el productor canjea al solicitar | `subvencionesActions.ts`, `/ocp/subvenciones` |
| LCP · Leads y CRM CaaS · BCP · CTC Tech / Varietales | respuestas a «Mis solicitudes» (CTC Tech · Varietales · CaaS) espejadas en el panel | `producer_comm_log.lead_id` |
| BCP · Herramientas del Café | qué herramientas ve el productor y con qué nivel | charter `herramientas-cafe` |

## Pendientes

- **V5.191 · la referencia revisada en formato CTCx** (código tocado desde el nodo final): bajo una referencia que CTCx revisó con
  «Hacer revisión», «Agregar Referencias, Fotos y Videos» enseña la línea del reporte en formato CTCx (`resumenDePlanillaCtcx`: el
  Punto del perfil de taza, o el factor, las humedades y las mallas del análisis físico) y su feed lo dice. La política de INSERT de
  `lot_referencias` exige en null las dos columnas nuevas de CTCx (`planilla_ctcx`, `lectura_ctcx`). **Queda**: nada.
- **V5.190 · el contrato provisional de la sesión asistida y su ratificación** (`PLAN_CICLOS.md` §11): bajo la casilla de la firma, en
  una sesión asistida, «Aceptar contrato provisionalmente» (CTCx, con el nombre de su responsable; sin firma, nombre ni documento del
  productor); en «Contratos», el aviso del contrato provisional con «Ratificar y firmar» (`RatificarContrato.tsx`), donde el productor
  ajusta lo declarado y firma; la página del contrato enseña el texto provisional y después el ratificado. Y el arreglo: la firma no
  creaba el contrato (`freeze_months` NOT NULL, 23502) y el error no se veía. **Queda**: conducirlo con la oferta de Ruizeñores.
- **V5.189 · el Punto dice con qué protocolo se cató** (ejecutado desde `consolas`, plan §10.6): «Lotes Galardonados» enseña «Punto
  (CVA)» o «Punto (SCA 2004)» —valen lo mismo— y el dossier «Punto CVA (SCA-104)» o «Punto SCA 2004 (vale lo mismo en CVA)»; ya no hay
  «Punto homologado (piso)» ni «recata». La Ficha B2 del productor sigue siendo SCA 2004 (su total vale lo mismo en CVA).
- **V5.188 · «Contratos y Compras» tras la revisión** (feedback de seis puntos): el escenario de la calculadora es **un supuesto
  del productor** y lo único seguro es el saco (recuadro verde); «Más que vendiéndolo a la FNC» dice qué kilos cuenta (lo vendido +
  el saco); **«Las palabras de este trato»** (`GlosarioDelTrato`) define PVC, CPS, carga, grado, Cherry Picked y el resto; las fechas
  van en letras y en la hora de Colombia (`fechas.ts`), con la duración exacta de la ventana; el contrato lleva **el documento de
  quien firma** (CC, CE, PPT, pasaporte o NIT, `documento.ts`; texto `2026-10-08.2`); y Kaffetal Regal dice **CTCx**, no CTC.
  **Queda**: «El trato» de la portada (`TratoSection`) y el FAQ (ES · EN · DE) todavía cuentan el trato viejo —15 kg de entrada,
  opción de compra a 3 meses, liberación mensual— y contradicen el contrato (saco de 70–200 kg, ventanas por ciclo, retiro libre,
  baches): rehacerlos con el modelo de `PLAN_CICLOS.md` (dueño: Kaffetal Regal).
- **V5.187 · la evaluación se coinvierte** (§14.2 n.º 11-bis, owner 2026-09-18): «Evaluar mi Café», «Su cuenta», las instrucciones de
  envío, «Por qué inscribirse» y el FAQ (ES · EN · DE) dicen **coinversión de CTCx**, nunca «descuento» ni «subvención del X %»; el código
  sigue siendo «de subvención». El contrato que se firma aquí dice **Ponderación de Valor de Cosecha (PVC)** (texto `2026-10-08.1`).
- **V5.186 · «Mi trato» enseña el bache abierto** (`BacheAbierto`): lo que lleva, su plazo y los días que faltan, y el pago 60/40; «Pedir prórroga» solo si no la tuvo.
- **V5.185 · el retiro** dice «Penalidad total a pagar» y la compara con «Más que vendiendo a la FNC» (cuánto de la ventaja se come); la invitación enseña el precio por carga con el Flete a CTCx entre paréntesis.
- **V5.183 · la calculadora** suma «🎲 Escenario aleatorio» (otro en cada clic) y «💵 ¿Cuándo me pagan?» (60/40 por envío, cadencia de baches 1–5 semanas, ★ 2 y 3). Lo vendido sale por baches que decide el productor (contrato `2026-10-07.3`). Pendiente: en «Mi trato», enseñar el bache abierto con su plazo de forma más visible.
- **V5.182 · cada cambio de la existencia queda en `lot_existencia_historial`** (trigger en `lots`, inmutable), también el de la Ficha A2: el productor puede cambiarla en cada punto de control y el cambio no se pierde.
- **V5.181 · la existencia del lote es obligatoria al solicitar la evaluación** (prellenada desde A2, corregible; `postularLote` la exige). En A2 sigue opcional. Dos lotes llevan una existencia ESTIMADA por CTCx (CTC-L-403D5C8B 2.500 kg, CTC-L-DA154613 500 kg): la confirma su productor al solicitar.
- **V5.180 · la calculadora de escenarios va siempre** que la ventana esté abierta (antes se escondía hasta registrar la existencia del lote); sin existencia, solo «Tomar la decisión» espera (`puedeDecidir`).
- **V5.177 · el Flete a CTCx** se lee en la oferta, la propuesta de Selection, la calculadora y el contrato (versión `2026-10-07.2`): región, valor por carga y por kg, y el despacho con el código corporativo de CTCx en Servientrega (el productor paga el resto en la oficina). Ya no se habla de «auxilio de transporte».
- **V5.176 · la renovación**: la invitación prellenada llega a «Participación en Cherry Picked»; el productor reconfirma disponibilidad, humedad y bodegaje y puede actualizar la existencia. Las ventas anuladas no cuentan en «Mi trato».
- **V5.175 · el trato de Cherry Picked por ventanas** (docs/PLAN_CICLOS.md, tanda 2): la fecha de firma decide la ventana; calculadora con la vista previa del servidor (`previsualizarOferta`), saco fuera de lo declarado con su despacho, retiro solo de lo no vendido, «Mi trato» con cuenta, ventas y despachos (registrar, prórroga, cancelar, ventana siguiente), existencia registrable desde la oferta. Pendiente (tanda 3): la renovación de un paso desde «Mi trato» y las confirmaciones que escribe el OCP.
- **V5.174 · Ficha A2**: existencia total del lote (kg de CPS, espejo en `lots.existencia_cps_kg`), número de plantas y producción estimada cereza/pergamino (5 : 1). Pendiente (tanda 2): en lotes que ya avanzaron del circuito el guard impide editar la Ficha; la existencia se reconfirma en la renovación con una acción de servidor.
- **2026-10-07 · `docs/PLAN_CICLOS.md` manda sobre el trato** (owner, desde WRAP-COMMIT-PUSH): ventanas de ciclos de 6–7 semanas por la fecha de firma, saco inicial de 70–200 kg fuera de lo declarado, pago 60/40 con humedad y aw, retiro 25/30 % solo de lo no vendido, mínimos por ventana con continuidad lineal −10 %/trimestre, renovación de un paso, Ficha A2 con existencia, plantas y producción 5 : 1. Se ejecuta en cuatro tandas (§9); hasta la tanda 2, las modalidades de la V5.169–V5.173 siguen en el código.
- **V5.173 · «Declarar para Temporada Actual» reemplaza a «Declarar Ahora»** (owner, 2026-10-06; ejecutado desde WRAP-COMMIT-PUSH):
  lo que queda de la temporada en curso (≥ 30 días), al PVC vigente, 10 a 25 kg con la firma, meses redondeados
  (`mesesDeLaTemporadaActual`); la escalera de retiro se reparte en los meses (`tramoLibrePct` · `TRAMO_LIBRE_DEL_TRATO_PCT` 75):
  2 meses → 37,5 % al cerrar el primero. Sin renovación de 30 días. Decisión de diseño para que el owner la confirme: el reparto
  proporcional (37,5 %) en vez de 25 % por mes.
- **V5.171 · la redeclaración de «Ahora y Siguiente»** (owner, 2026-10-06: «la opción 1, que quede en el 70 %»; ejecutado desde
  WRAP-COMMIT-PUSH): se pide `DIAS_ANTES_REDECLARAR` (10) días antes, el botón «Redeclarar» de «Mis contratos» no acepta menos
  del mínimo y se cierra al terminar el primer día de la temporada; sin respuesta, `/api/cron/redeclaraciones` la deja en el
  mínimo. Cierra el abierto de la V5.170. Sin manejar con una cuenta real (no hay contratos en producción).
- **V5.170 · «Siguiente Temporada» al PVC de la edición siguiente** (owner, 2026-10-06; ejecutado desde WRAP-COMMIT-PUSH): el
  precio viaja congelado en la oferta (`price_next_kg`); sin edición siguiente publicada, la modalidad no se abre y dice la fecha
  límite (`fechaLimitePvcSiguiente`). Sustituye el abierto (1) de la V5.169. Abierto: la redeclaración de «Ahora y Siguiente»
  espera la decisión del owner sobre qué pasa si el productor no redeclara.
- **V5.169 · Cherry Picked con tres modalidades y escenarios de venta; CTCx Selection negociable; nombres de archivo; Visa →
  Pasaportes** (owner, 2026-10-06; ejecutado desde WRAP-COMMIT-PUSH). Las reglas de las modalidades viven en
  `src/lib/trato/modalidades.ts` (la Temporada Trimestral = la ventana de la edición del PVC). Abierto: (1) el precio de
  «Siguiente Temporada» sigue siendo el PVC vigente al emitir, no el de la edición siguiente; (2) la redeclaración obligada de
  «Ahora y Siguiente» queda anotada en el contrato pero todavía no abre sola una declaración nueva al empezar la temporada;
  (3) la renovación de «Declarar Ahora» enmienda la cantidad sobre el mismo mes del trato; (4) los flujos no se condujeron con
  una cuenta real de productor.
- **V5.168 · la calculadora del trato, el contrato con firma con el dedo y el blindaje de los documentos** (owner, 2026-10-06;
  ejecutado desde WRAP-COMMIT-PUSH). Aceptar una oferta ES firmar (`respondToOffer` exige la firma; sin firma no nace contrato).
  El texto del contrato vive en `src/lib/trato/contrato.ts` con versión propia: cambiarlo es subir `CONTRATO_VERSION` (los viejos
  conservan su huella). El blindaje está en `src/lib/kaffetal/blindaje.ts`: todo documento nuevo del productor lleva
  `<MarcaDeAgua>` y `<Blindaje>`. Abierto: (1) el texto del contrato es una redacción operativa de los términos; la revisión
  jurídica la decide el owner; (2) el contrato no lleva todavía el documento de identidad del productor; (3) una captura de
  pantalla no se puede impedir (para eso la marca); (4) el flujo de firma no se condujo con una cuenta real de productor.
- **V5.167 · el dossier sin ajuste CTCx, en CTCx, con la taza segunda, el grado con imagen y variedades, ilustraciones y
  conjeturas; «Ver el Dossier del lote» en Mis Lotes** (owner, 2026-10-06; ejecutado desde WRAP-COMMIT-PUSH). Decisión del owner:
  **el productor no ve el ajuste CTCx** en el dossier (va dentro de los puntos, sin nombrarse). Las conjeturas viven en
  `src/lib/kaffetal/conjeturas.ts` (reglas con su evidencia; se redactan como hipótesis). El orden de hojas está en
  `ORDEN_DE_HOJAS` (`DossierCtcx.tsx`). Abierto: el barrido «CTC» → «CTCx» del resto de la plataforma (tarea aparte).
- **V5.166 · el dossier del lote con formato CTCx, por hojas A4, con la Visa EUDR dentro** (owner, 2026-10-06; ejecutado desde
  WRAP-COMMIT-PUSH). Datos: `src/lib/kaffetal/dossierDatos.ts` (`cargarDossier`); documento: `components/kaffetal-regal/dossier/`
  (`DossierCtcx`, figuras SVG en `figuras.tsx`, textos ES/EN en `textos.ts`, hojas A4 en `dossier.module.css`). Una hoja nueva
  se suma al arreglo `hojas` y al índice de la portada sola. Las fotos se reducen en el servidor con `sharp` (`fotoParaImprimir`)
  porque el PDF del navegador re-codifica sin pérdida lo que no es un JPEG pequeño. Abierto: el dossier no adjunta el reporte
  original del Q-Grader; la ficha pública solo trae QR cuando el lote tiene `public_code`; el motivo de cada nivel de la tríada
  solo existe en español (en inglés se omite).
- **V5.165 · el dossier del lote galardonado lleva B1, B2 y B3 y las anotaciones de mejora de la Rueda del Sabor**
  (owner, 2026-10-06; ejecutado desde WRAP-COMMIT-PUSH). El constructor es `src/lib/kaffetal/dossierEvaluacion.ts`
  (`caracterizacionDelDossier(ficha, planillaDeEvaluacion(fila que rige), lang)`); B2/B3 salen SOLO de la evaluación que rige
  (aceptada). La tarjeta del productor (`EvaluacionesTab`, `AnotacionesDeMejora`) lee `lot.officialRueda`. Abierto: el
  dossier no muestra aún el adjunto original del Q-Grader (el ajuste CTCx ya sale en la V5.166).
- **V5.160 · la escalera de grados de la Oportunidad enseña puntos** (ejecutado desde `consolas`, contrato nuevo de
  grados). `OportunidadSection`: «1.600–1.799 pts · SCA desde 88 (café común)» en ES/EN/DE. El productor ya no ve un rango
  SCA por grado. Abierto: el copy largo de cada grado (bullets) sigue diciendo «la puntuación decide el grado»; vale, pero
  podría nombrar la tríada.
- **V5.150 · la altura del cafetal se trae sola del mapa** (owner, 2026-10-05; ejecutado desde `consolas`). `CafetalEditor`
  consulta Open-Meteo al cambiar la geometría: la del punto o el promedio de los vértices del polígono
  (`alturaDeLaGeometria`); respeta la escrita a mano después de ubicar y la ya guardada. La Ficha toma `masl` de la finca
  primaria al abrir (antes se copiaba una sola vez). Abierto: la altura de la FINCA sigue siendo la del Cafetal 1 (V5.122),
  no el promedio de todos sus cafetales — si el owner quiere el promedio, es una línea en `FincaModal` (`alt`).
- **V5.144 · la granulometría de la Ficha se compara con el trillado verde restante** (owner, 2026-10-02; ejecutado desde la
  conversación de `consolas`). `FichaView` pasa `factor.remainder` a `computeMesh` (antes el grano sano): los porcentajes y el
  residuo de la vista final cambian para los lotes que digitaron mallas. El factor de rendimiento no cambia.
- **V5.143 · fotos y video opcionales, imagen por defecto y «Agregar Referencias, Fotos y Videos»** (owner, 2026-10-02; ejecutado
  desde la conversación de `consolas`). (1) B4 ya no exige fotos: al cerrar el paso sin fotos ni video, `FichaView` avisa
  (`AVISO_SIN_MEDIOS`) y deja seguir; el guard trigger `guard_lot_fotos_intake` se retiró. (2) `src/lib/imagenDeOrigen.ts` es la
  imagen de una finca o un lote sin foto — se PINTA, nunca se guarda como foto del productor. (3) `lot_referencias`
  (`src/lib/kaffetal/referencias.ts`, `PaneReferencias.tsx`): con la Ficha cerrada (`intake_step >= 4` o etapa posterior a
  borrador) el productor agrega reportes de taza y físicos, fotos y videos; es de solo agregar (RLS sin UPDATE ni DELETE) y de
  un reporte puede pedir revisión. **La Ficha congelada no se toca**: nada de esto entra en `lots.datasheet`, en el puntaje ni
  en el grado. Abierto, **con decisión del owner**: (a) el botón sale con la Ficha cerrada, no solo con la Visa ya emitida —
  si debe esperar a la Visa, es una línea; (b) las fotos agregadas después no pasan a ser «las fotos del lote» en la vitrina
  (hoy la vitrina no pinta fotos de lote; cuando lo haga, decidir si toma B4, las agregadas o ambas); (c) un reporte
  revisado no dispara una evaluación nueva: sigue su circuito aparte.
- **V5.139 · polígono opcional con 4 ha o menos, y franja «Sesión asistida»** (owner, 2026-10-02; ejecutado desde la conversación
  de `consolas`). **La regla del punto** (`src/lib/geo/referencia.ts`): con más de 4 ha el polígono ES la geolocalización y el
  punto es el centro que declara el productor; con 4 ha o menos la geolocalización es el PUNTO y, si el productor dibuja además
  su polígono, el punto es el **centro geométrico** del polígono (se calcula al guardar el polígono, al arrastrar una esquina y
  al pasar de «sí» a «no»; el pin no se arrastra y «Estoy aquí» no lo pisa) y el polígono viaja como información adicional. El
  expediente EUDR lo dice así (`poligonoAdicionalDe`). Sin cambio de esquema. **La franja** (`FranjaAsistida.tsx`): solo la ve
  CTCx, cuando la sesión es la que abrió el OCP (`src/lib/asistencia/marca.ts`). `qa-area` (39) y `qa-asistencia` §10.
  Verificado en el navegador con el editor montado aparte (dibujar, quitar, cambiar la respuesta, GPS). Abierto: (a) el KML del
  OCP exporta el polígono adicional como un polígono más, sin rótulo; (b) los cafetales guardados ANTES con 4 ha o menos y
  polígono (hay uno: «Mirador del pino», 0,36 ha) conservan su punto marcado a mano; el editor ofrece «Usar el centro del polígono».
- ~~**⚠️ El OCP todavía dice «EVA» por el veredicto documental — dueño: `consolas`.**~~ — **cerrado en la V5.74** (`consolas`):
  columna «Visa», «Pasaporte EUDR», «Veredicto de Visa»; `qa-evaluaciones` (53) vigila las dos caras. La segunda tanda del brief
  [`briefs/consolas-simplificar-ocp-al-circuito.md`](briefs/consolas-simplificar-ocp-al-circuito.md) (bandejas) ~~sigue esperando al owner~~
  la absorbió el `PLAN_CIRCUITO_DEL_LOTE` (2026-09-24), ejecutado en código en la V5.76–V5.92.
- **Las tres rutas del proveedor (owner, 2026-09-23; `briefs/consolas-rutas-del-proveedor.md`) — lo que le toca a KR**:
  **(a)** desde la V5.75 el equipo puede abrir KR **como un productor** (sesión asistida, `src/lib/asistencia/actions.ts`): nada
  cambia en el código de KR, pero el productor verá notas «Asistencia CTCx» en su feed y puede haber cuentas cuyo correo es una
  etiqueta `desacoplado-…@ctcexport.com` sin buzón (ningún correo sale hacia ellas). **(b) La Ficha retenida — dueño KR**: la Ficha
  de un desacoplado NO se entrega hasta que, entregada la cuenta, pague (respuesta 6 del owner: «COP 80.000 o tal vez
  200.000», **cifra que el owner no ha cerrado para este caso** — no confundir con la tarifa de evaluación del circuito, que
  desde la V5.80 es $200.000 en `terminos.ts`) — hoy `lot_fichas_select_own` la enseña en cuanto existe; hace falta una marca
  que KR respete. Fila en `ALINEACION` §3b (nodo final, wrap V47).
  **(c) La Ficha descargable** (respuesta 5: la «Ficha automatizada (base info)» del paso 5 es la que se produce para descargar):
  no hay botón de descarga en B2/B3. **(d) El rechazo con interés** (Ruta CTCx Selection): que `respondToOffer("rechazar")` pueda
  decir «me interesa la oferta directa de CTCx» — ~~espera la 4b (`lot_offers.kind = directa`)~~ ya no espera nada: la 4b la
  sustituyó el `PLAN_CIRCUITO_DEL_LOTE` y la clase `directa` existe desde la V5.82. Sin construir; fila en `ALINEACION` §3b.
- ~~**Fase 2 del `PLAN_CIRCUITO_DEL_LOTE` (V5.78) — lo que le toca a KR**~~ — **HECHO en la V5.79 desde la sesión `consolas`, con el sí
  del owner** («hazlo tú desde esta sesión», 2026-09-24; línea en §3): **(a)** A5 es el último paso del intake, B4 va antes
  (`FichaView`, `FichaNav`, `LotKanbanStepper`, `PASOS_DE_LA_FICHA`; el borrador que iba en `intake_step = 3` pasó a 2);
  **(b)** el productor ve el estado de cada certificación en la tarjeta de la finca (`FincaModal`) y el Pasaporte impreso
  (`EudrDossierDoc`) deja fuera las retiradas; **(c)+(d)** el **dossier del lote ES/EN** (`/kaffetal-regal/dossier/[id]?lang=`,
  `LotDossierDoc`), enlazado desde «Lotes Galardonados», es la Ficha descargable. **Lo que sigue siendo de KR**: el Pasaporte
  de la finca sigue solo en español (`EudrDossierDoc`); el dossier del lote muestra el estado del Pasaporte pero no lo reemplaza.
- **Fase 3 del `PLAN_CIRCUITO_DEL_LOTE` (V5.80) — lo que le tocaba a KR, HECHO desde la sesión `consolas` con el mismo sí** (línea
  en §3): al solicitar la evaluación el productor puede **pedir un descuento por nota** (`postularLote(lotId, código?, nota?)`);
  la tarjeta dice «Solicitud recibida — CTC la corrobora y emite su factura», luego enseña **la factura de cobro** (`Ver factura`,
  `src/lib/arena/factura.ts`, la misma plantilla que el OCP) y **solo con factura** las instrucciones de pago; el envío es
  **contra entrega** (instrucciones y confirmación); «en fila» y «en bache» hablan del Bache de Evaluación y del Centro de
  Calidad. La barra del lote lee el estado nuevo **`solicitada`** de `estadoDelCircuito()` (`qa-circuito` lo exige). La tarifa que
  muestra es `EVALUATION_FEE_COP` = $200.000 (`src/lib/trato/terminos.ts`). **Lo que sigue siendo de KR**: el copy «Cupping
  Arena» y «No abrir antes de la Arena» de las instrucciones de envío y su etiqueta recortable (`shipmentInstructionsPrint.ts`); la caja «Cómo pagar · Nequi»
  sigue esperando el número (lo escribe el owner). **Y desde la V5.89** (§3, «Para `kaffetal-regal`», sin código tocado; lo anota el
  nodo final, wrap V47): ~~esas instrucciones ya dicen 2 kg, bolsa zip-lock y solo el código del lote, pero deberían decir lo que
  dibujó el owner~~ — **HECHO en la V5.94** (código de KR tocado por `consolas` con el «organiza todo» del owner, línea en §3): las
  instrucciones y la etiqueta dicen **2 kg de CPS representativos, de uso exclusivo de CTCx** (1 × 250 g al Q-Grader · 3 × 250 g de
  reserva · 1 kg que se trilla para ensayos), y ya no nombran la «Cupping Arena» ni «No abrir antes de la Arena». Fuente fuera del repo:
  `reference/muestras-y-sample-kits-2026-09-25/`.
- **Fase 4 (V5.81) — una línea tocada y un pendiente con dueño aquí**: `LotKanbanStepper` conoce el estado **`evaluado`** del
  circuito en su ORDEN (`qa-circuito` lo exige). **Pendiente KR**: alimentar `evaluacionPendiente` a `estadoDelCircuito()` (hay
  una `lot_evaluations` `q_grader_batch` en `pending` para el lote — el productor ya la ve por `lot_evaluations_select_own_lot`)
  para que la barra diga «evaluado» y no «en evaluación» mientras CTCx confirma (fila en `ALINEACION` §3b); y decidir si «Lotes Galardonados» muestra la
  **rueda** (`lot_evaluations.rueda`, etiquetas ES/EN en `src/lib/catacion/rueda.ts`) y la escala (SCA/CVA) de la evaluación
  (desde la V5.92 ya dice cuándo el Punto es homologado desde CVA: abajo).
- **Fase 5 (V5.82) — lo que el productor recibe y lo que queda para la fase 6**: las ofertas llegan **ancladas al PVC** con
  `min_kg`, `compra_inicial_kg`, `terms_version`, `modificador_pct`, `expira_at` (directa) y dos clases nuevas, **`directa`**
  (CTCx Selection, PVC − 8 %, 30 días) y **`excepcion`**; `ProducerOffer.kind` ya las admite (una línea, V5.82) y se muestran
  con las de temporada. ~~**Pendiente KR (fase 6, exige `prueba-*`)**: enseñar el anclaje (PVC, banda, mínimo, compra inicial,
  vencimiento) en `OfferCard`; la **calculadora** del trato (`src/lib/trato/simulador.ts` puro + componente); la **declaración**
  al aceptar (`locked_kg` ≥ `min_kg`, `trimestre` | `30_dias`, `terms_version` aceptado); el contrato nace lleno; «Mi trato».~~
  **Hecho en la V5.83** (bullet siguiente). La nota del feed ya explica la oferta (tarifa, compra inicial, mínimo, ventana).
- **Fase 6 (V5.83) — HECHA desde la sesión `consolas` con el «continúa» del owner, SIN conducirla en navegador**: `OfferCard`
  enseña el anclaje (PVC, %, mínimo, máximo, compra inicial, vencimiento, términos) y trae la **calculadora** (`simularTrato`:
  hoy, mes a mes, retiro libre, «retirar todo costaría»); el productor **declara** los kg (≥ mínimo, ≤ máximo de una directa),
  trimestre o 30 días, marca las condiciones y acepta; `respondToOffer` crea el contrato **lleno** y `signContract` solo firma.
  «Contratos de Temporada» es **«Mi trato»** (declarado, precio, compra inicial, tramos, términos). El copy del Kaffetal Club
  salió de la pestaña (`gi` sigue en la firma por `AppDashboard`). **Pendiente (Etapa 2: se conduce con la sesión asistida o un
  Proveedor Desacoplado — las cuentas `prueba-*` se eliminaron en la V5.89)**: conducir aceptar → contrato →
  firma en el OCP; afinar el copy de la calculadora con el owner; «Mi trato» crece con la fase 7 (pedidos, pagos, retiros, mora).
- **Fase 7 (V5.84) — HECHA desde la sesión `consolas` con el «continúa» del owner, SIN conducirla en navegador**: «Mi trato»
  enseña los meses (`contract_months`: pidió · envió · pagó · retiró · situación), el resumen (comprometido · retirado · vigente ·
  mes en curso) y el **retiro** (`RetiroForm`: `previsualizarRetiro` enseña la cuenta — tramo libre y penalidad al 4 % — y
  `retirarDelTrato` la registra en el mes en curso); la **mora se deriva al cargar** (`loadData` con `mesAMes.ts`, la misma
  función que el OCP; nunca en el render, nunca guardada) y la barra del lote recibe `enMora` (CONT hecho «en mora»; la
  ruptura lo apaga); el banner de **cuenta congelada** (`gi.estadoCuenta`, lo escribe solo el owner por ruptura) y las puertas:
  congelada no acepta ofertas (`respondToOffer`) ni retira. **Pendiente (Etapa 2, sesión asistida o Desacoplado)**: conducir pedir → enviar → pagar →
  retirar; afinar el copy de la mora y de la ruptura con el owner. Los recordatorios de mora llegaron en la V5.86 (`consolas`):
  el productor recibe correo + nota en su feed, hasta 4 por mes, mientras el pedido siga sin envío.
- **Fase 8 (V5.85) — una línea de KR**: `LotKanbanStepper` recibe `compradoEnFirme` (CONT hecho como «CTCx Selection») y `PerfilTab`
  lo deriva con `esCompraEnFirme` (`src/lib/compras/reglas.ts`: la oferta del contrato es `directa` · `black` y CTC ya pagó un mes)
  — la misma regla que el OCP; `qa-compras` lo vigila. **Pendiente (dueño KR)**: desde la V5.85 un lote **Black** recibe oferta de
  temporada/directa/excepción como los demás grados (`kindAllowsGrade`), así que el copy «Red o superior» de «Ofertas de Temporada»
  en `ContratosTab` quedó viejo y la sección «Ofertas Black» solo enseña la clase histórica `black` (que ya nadie emite).
- **V5.92 — el Punto homologado, una tanda tocada desde `consolas` con el sí del owner** (§3; no estaba anotada aquí, lo recoge el
  nodo final, wrap V47, 2026-09-25): `Lot.officialPunto` (opcional, `data.ts`; lo llena `KaffetalExperience` desde
  `lot_evaluations.punto`) y el rótulo de «Lotes Galardonados» (`EvaluacionesTab`): «Punto homologado (piso)» y «Homologado desde
  CVA … · no catado en SCA · hasta X con una recata SCA» cuando la evaluación que rige fue CVA; las notas al productor dicen el
  origen. `sca_total` ES el Punto (el piso si es homologado; nunca Tyrian homologado — **anulado en la V5.189**: el Punto es el CVA o un 2004 que vale lo mismo). **Pendiente KR**: el **dossier ES/EN**
  (`LotDossierDoc`) todavía no dice el origen del Punto (fila en `ALINEACION` §3b, con la ficha pública de `cherry-picked`).
- **La Arena y el Club cambiaron (V5.77, fase 1 del `PLAN_CIRCUITO_DEL_LOTE`) — copy de KR con dueño `kaffetal-regal`**: el
  Club como membresía **ya no existe** (firmar y publicar no lo exigen; el galardón no lo reparte). ~~`ContratosTab`
  («Pasaporte del Club», `isClubMember`) y el gate visual de «Mis contratos» hablan de algo retirado~~ — **retirado de
  `ContratosTab` en la V5.83**; **sigue** en la landing: `PorQueSection.tsx` («la membresía del Kaffetal Club», ES · EN · DE) —
  anotado por el nodo final, wrap V47. La Arena es una **sesión de
  segunda apreciación** (no una gala con vitrina), así que las líneas «Invitado a la vitrina… / Sesión de la vitrina confirmada /
  compitió en la vitrina» de `EvaluacionesTab`, «postular a la Arena →» de `PerfilTab` y `ArenaSection` de la landing hay que
  reescribirlos o retirarlos. **Y el oficial del lote lo rige UNA evaluación** (`rige_grado`; `officialAverages` ya lo devuelve así):
  para honrar una elección explícita del owner, el `select` de `lot_evaluations` en `KaffetalExperience.tsx` (hoy hacia la línea
  411; ya pide `source`, `created_at` y `punto`) debe pedir también `rige_grado`.
- ~~**Tres restos del vocabulario viejo en el copy de KR — dueño: `kaffetal-regal`** (los vio la V5.74 al cerrar el OCP):
  `FichaView.tsx:496` dice que la Visa del lote «se hereda de la Visa de su finca» (es del **Pasaporte**); `:504` dice «Sello EUDR
  PENDIENTE hasta que su(s) finca(s) obtengan la Visa» (es **Visa** del lote y **Pasaporte** de la finca); `EvaluacionesTab.tsx:437`
  dice «a la espera de la Visa de su finca» (Pasaporte).~~ — **corregidos en la V5.79** (misma tanda que A5 al final del intake):
  `FichaView` dice «la Visa del lote se hereda del Pasaporte de su finca» y `EvaluacionesTab` «a la espera del Pasaporte de su finca».
- ~~**El «Centro de Calidad» del Q-Grader — dueño: `consolas` / `socios`** (owner, 2026-09-20): el Q-Grader entrega sus dos
  informes **por un login propio** que recibe la lista de lotes y permite evaluarlos **en orden**. No existe.~~ — **existe desde la
  V5.81** (`/socios/centro-calidad/panel/evaluacion`: baches anónimos, planilla dual SCA 2004 · CVA desde la V5.92; CTCx confirma en
  el OCP). Lo que queda aquí: el chip **EVA** del panel podrá decir «evaluado» cuando KR alimente `evaluacionPendiente` (arriba).
- ~~**El dato falso del 205 g — dueño: `consolas`**: `fichasActions.ts:108` dice «muestra de 205 g»~~ — **corregido en la
  V5.74** (250 g).
- **Compañeros de finca — tanda propia** (brief escrito: [`briefs/kaffetal-regal-companeros-de-finca.md`](briefs/kaffetal-regal-companeros-de-finca.md), con cinco preguntas al owner). Pedido por el owner el 2026-09-20 y aplazado por él mismo: atar una finca (y
  sus lotes) a otros productores, con **un solo admin** (borra y da pasos finales) y colaboradores que solo **agregan**
  información; en trazabilidad **figura únicamente el admin**, y hay que **revisar cada compuerta**. No es interfaz: es
  tabla nueva + RLS + guard triggers y toca el contrato de **Identidad** de `ALINEACION` §1. Se entrega el diseño por
  escrito para aprobar antes de ejecutar.
- **Ergonomía táctil por debajo de la regla de la casa** (auditoría del 2026-09-20, sin ejecutar): ~15 controles del panel
  y la Ficha están bajo los **44 px** que exige `ALINEACION` §1. Los peores: `FlipCard .closeBtn` 26×26,
  `AppDashboard .iconbtn` 30×30, `PaneB1 .unknownRow` ≈17 px, `RetroalimentacionPanel .ackRow` ≈15 px, y
  `.deletebtn`/`.svcChip`/`.chip`/`FichaNav .item` entre 29 y 35 px. `PanelNav` sí cumple (≈69 px).

- **El overhaul de las consolas en su fase 5** (`docs/OVERHAUL_CONSOLAS_PLAN.md`): **el paso 4 del intake está HECHO**
  (V5.64, 2026-09-20) — pasó de «Video» a **«Fotos y video»: 2 fotos obligatorias, video opcional**, validado en el
  servidor por el guard trigger `guard_lot_fotos_intake` (migración `lots_fotos_obligatorias`), no solo en el cliente.
  **Sigue pendiente el resto de la fase 5** (la fase la sustituyó el `PLAN_CIRCUITO_DEL_LOTE`; lo que queda es de KR):
  «Evaluar mi Café» a **Por evaluar · En evaluación · Evaluados** (el Sondeo desaparece como concepto — la barra del lote ya lo
  retiró en la V5.64; hoy las secciones son «Solicitudes de Evaluación · Evaluaciones en Fila · Lotes Galardonados»).
  ~~Y que al aceptar una oferta el productor acepte los términos y declare su **Initial Locked Availability**~~ — **hecho en la
  V5.83** (la declaración al aceptar). ~~Se verifica en vivo con `prueba-*`~~ — esas cuentas se eliminaron en la V5.89: se
  conduce con la sesión asistida o un Proveedor Desacoplado (Etapa 2).

- **Correcciones del owner al guion (2026-09-18, v0.9.1)** que alcanzan a otros: la evaluación deja de hablar de «descuento»
  —**CTCx coinvierte** del 30 % y hasta el 70 % del costo— y la compra inicial de **Gold en Cherry Picked es «hasta 100 kg»**,
  no «> 100 kg». ~~`PVC_BCP_PLAN.md` §14 dice todavía lo anterior: **consolas reconcilia**~~ — **reconciliado**: el plan del PVC
  el 2026-09-18 y el plan de narrativa (que seguía diciendo «descuento») el 2026-09-19; la narrativa v3 (KR p2, CP p2) de
  `reference/narrativa-2026-09-17/` la regenera el owner, fuera del repo. En KR: `EvaluacionesTab`, `PorQueSection`, `faq.ts` n.º 3 y `TratoSection`.
- **`lots.public_code` es de solo lectura para el productor** (dueño: **kaffetal-regal**, nace en consolas V5.48,
  `ALINEACION` §3). El `select("*")` del panel ahora devuelve la columna nueva, y `guard_lot_protected_columns` la
  protege: un `UPDATE` del productor sobre ella responde «Estos campos solo puede actualizarlos CTC.». Si algún día el
  panel quiere enseñarle su código («así encuentran su café en `ctcexport.com/ctcx-public-catalogue`»), sale de esa
  misma fila — **nunca** de una segunda derivación, que es justo el problema que la columna vino a cerrar. Ojo: el
  código se acuña al PUBLICAR, así que un lote que aún no está en el catálogo lo tiene en `null`.
- **Plan de ejecución de la narrativa** (`docs/PLAN_NARRATIVA_2026-09-17.md`): **KR-1** (copy del guion, ola 1, sin
  dependencias) · KR-2 (panel: perfil primero, tabla de salida, Arena, bolsa, avisos; espera CN-3, CN-5 y CN-6) · KR-3
  (copy de grados, en la misma tanda que CN-9). El rodaje del video (O-8) espera a KR-1 y KR-2.
- **Tercera ronda de narrativa (2026-09-17, `PVC_BCP_PLAN.md` §14.7)**: el nombre del productor y su finca **van en la bolsa** de
  Papagayo Beans® si el lote va por Cherry Picked (sticker o escrito + QR/UID); el PVC de ene–mar 2027 se publica **antes del
  15-oct** (como dice el guion); ~~Black y Red 3–4 cargas según la mezcla (no fijos: **una carga por productor**, mezcla de
  3 a 4; Black = blend de orígenes y/o variedades, Red = siempre una sola variedad, mezcla regional — owner, 2026-09-19)~~ —
  **superado el 2026-09-25 (V5.91, `PVC_BCP_PLAN` §14.8)**: la regla 3–4 se retiró de raíz; Black y Red son mezclas Single Origin
  o Regional Blend de CTCx con un MOQ de compra de 3 cargas, y el mínimo que el productor declara por lote es otro:
  **6 · 6 · 3 cargas · 150 kg** (Black · Red · Blue · Gold; Tyrian sin mínimo; `MINIMO_POR_GRADO` en `src/lib/trato/terminos.ts`, V5.80; Gold de 200 a 150 kg en la V5.96).
  **V5.99 (owner, 2026-09-30): una mezcla es un TIPO DE LOTE** — el arquetipo de A2 cruza las fincas con la composición de B1
  (`deriveArchetype(contribs, composicionDeVariedades(varieties))`): Single Estate · **Single Estate Blend** · Single Origin ·
  **Single Origin Regional** · Regional Blend · Multi-Origin Blend (`ARCHETYPE_INFO` explica cada uno); `PaneA2` lo enseña, el
  dossier y la certificación lo imprimen. Un lote puede adjudicarse a varias fincas del mismo productor (F2, como siempre).
- **Papagayo Beans® (owner, 2026-09-17, `PVC_BCP_PLAN.md` §14.6)**: el café del productor sale al mundo como **Papagayo
  Beans®**, la marca de CTCx, con el sello de su grado (loro y monograma PB) y, en Cherry Picked, con su nombre y su finca en
  la vitrina; falta decir la marca en la landing, el FAQ y «Su café en el mundo»;
  **el guion ya lo dice (v0.7, 2026-09-18: bloques 0, 8b, 9 y 12)**. El nombre del productor y la finca en la bolsa quedó
  confirmado en la ronda 3 (§14.7).
- **Decisiones de narrativa del owner (2026-09-17, `PVC_BCP_PLAN.md` §14)**: la prima del 8 % **está dentro del PVC**
  (Cherry Picked paga PVC × grado tal cual; CaaS la retira y luego multiplica) — **el guion ya está en v0.7 (2026-09-18)**;
  faltan `TratoSection` y el FAQ; factor ≤ 94 confirmado; ~~mínimo del lote de Cherry Picked por grado **3–4 según la mezcla · 2 ·
  1 · ½ cargas** (§14.7 corrige el «4 · 3 · 2 · 1 · ½» del §14.4 — reconciliado el 2026-09-19 en
  el plan, los charters y `lectura.ts`, V5.53)~~ **superado**: el mínimo que el productor declara por lote es 6 · 6 · 3 cargas ·
  150 kg (`terminos.ts`, V5.80 · V5.96) y el MOQ de compra de Black y Red es de 3 cargas (§14.8, V5.91) y
  entrada CaaS de 15–25 kg; el 80 % del alza Tyrian **solo en Cherry Picked**, convertido a COP el día del pago; CaaS vende
  como **CTCx Selection** (CTCx figura como productor, la finca queda en la documentación); marca CTCx en todo el copy (ya
  previsto). La regla interna del CaaS sin cooperación (§14 n.º 8) **no va en ninguna pantalla**. El documento:
  `reference/narrativa-2026-09-17/Kaffetal Regal - Narrativa.pdf` (fuera del repo).
- **Decisiones del CEO del 2026-09-16** (`docs/PVC_BCP_PLAN.md` §12) que este componente tiene que ejecutar:
  - **El recorrido del productor**: llega con contexto de la propuesta de valor → crea cuenta → crea finca y lote →
    **primer win, gratis: se le devuelve el análisis EUDR del lote** → recibe la **expectativa de oferta** según el
    calendario PVC → envía muestra y se evalúa (**no se compra nada antes de tener la muestra y estar seguros de que
    funciona**) → elige oportunidad.
  - **Dos oportunidades de oferta**: **CaaS** (CTC compra directo y asume el riesgo, al PVC vigente en el momento de la
    compra) y **Cherry Picked** (compromiso contractual de tres meses, cargas declaradas por mes, **escalera de
    desbloqueo en cuartos acumulados** —mes 2 un 25 %, mes 3 la mitad— y **penalización del 4 %** por carga retirada
    por encima del tramo libre). La aritmética vive en `src/lib/pvc/compromiso.ts` (y la del trato real, desde la V5.82–V5.84,
    en `src/lib/trato/terminos.ts` y `mesAMes.ts`); el productor debe **ver la tabla de salida antes de firmar** — ~~pendiente~~
    **hecho en la V5.83**: la calculadora del trato (`simulador.ts`) en `OfferCard`.
  - **El calendario PVC es público**: trimestres exactos, publicado con dos meses de anticipación, y **aplica el PVC
    vigente en el momento de la compra**. Si el siguiente sube, la respuesta es la venta programada con compromiso.
  - **Tres niveles de acceso a herramientas**: **Default** (cualquier cuenta de KR o de Cherry Picked — la primera regla
    compartida entre las dos plataformas), **Básica** (productor con al menos un lote completado hasta EUDR: incluye
    herramientas del café, directorio y servicios de Kaffetal) y **Plus**. El reparto concreto está por definir con
    `herramientas-cafe`.
  - **Tríada de reputación del productor**: lotes completados · calidad (promedio ponderado por cargas y por grado) ·
    confiabilidad **con la consistencia dentro** (quien deja de mover café se enfría solo, sin castigo brusco).
    **Ponderación, no acumulación**: un productor pequeño y consistente puede estar arriba. Pesos y beneficios: por
    definir (ideas: compra anticipada de ciertas cargas, que consume caja y hay que dosificar; mejores precios en lotes
    selectos).
- **Narrativa del productor · cerrada** (2026-09-16, guion **v0.6**, 30 decisiones del owner, sin preguntas abiertas):
  `docs/componentes/briefs/kaffetal-regal-guion-video-productor.md`, con página de rodaje publicada para el equipo.
  **Es la fuente de lo que deben decir la landing, el FAQ y el panel**; el video se publica cuando la plataforma diga
  lo mismo. El traslado está en su §6.
  - **Tandas de este componente**:
    1. Copy:
       - CTCx;
       - ~~evaluación de $200.000 con envío incluido — **la cara pública sigue diciendo $80.000**~~ **HECHO en la V5.95** (código de KR tocado por `consolas` con el «organiza todo» del owner: $200.000, 30 % por defecto, contra entrega, ES · EN · DE) (era pendiente de CÓDIGO, dueño KR;
         lo anota el nodo final, wrap V47): `PorQueSection.tsx` en ES · EN · DE («la inscripción cuesta $80.000») y
         `src/lib/kaffetal/faq.ts` (n.º 3 en los tres idiomas), **que alimenta el JSON-LD** de la landing; la tarifa es
         `TARIFA_EVALUACION_COP` = $200.000 (`src/lib/trato/terminos.ts`, V5.80);
       - `TratoSection` con los dos caminos: Cherry Picked recomendado con prima del 8 %, compra inicial, escalera
         25 % + 25 % y 4 %; CaaS sin prima con 15–25 kg;
       - pago a 2 días hábiles y reporte de ventas en la primera semana del mes;
       - `faq.ts`, con preguntas nuevas de PVC, base física y Tríada;
       - `BienvenidosSection` con Perfil;
       - multiplicadores en `OportunidadSection`;
       - ~~la Arena abierta a Blue+~~ — **superado en la V5.77**: la Arena son sesiones de segunda apreciación sobre lotes galardonados, sin postulación.
    2. Panel:
       - perfil antes que finca;
       - ~~postulación a la Arena para todo lote Blue+, con su fila~~ — **superado en la V5.77** (igual).
    3. Grados: el Punto y la Tríada con la base física (factor ≤ 94, Black hasta 98), **en la misma tanda** en que
       consolas lleve la escala al veredicto (fase 2).
  - **Depende de consolas** (ALINEACIÓN §3b):
    - el PVC de ene–mar 2027 **antes del 15-oct-2026** (dueño `herramientas-internas` desde el 2026-09-19);
    - base física y Tríada en el veredicto;
    - ~~ofertas con prima y compra inicial~~ — **hecho en la V5.82** (oferta anclada al PVC, compra inicial de una carga);
    - ~~`compromiso.ts` conectado a contratos~~ — **hecho en la V5.82–V5.84** (el trato: `terminos.ts`, `simulador.ts`, `mesAMes.ts`);
    - reporte de ventas;
    - ~~fin del reembolso del 80 %~~ — **hecho en la V5.82** (el rechazo es gratis; el 80 % solo si una re-evaluación sube de grado);
    - ~~`showcaseGate` sin contrato~~ — **superado en la V5.77** (la Arena dejó de ser vitrina).
  - **Reconciliar el guion con el código antes de rodar** (pendiente KR, lo anota el nodo final, wrap V47, 2026-09-25): el
    guion (`briefs/kaffetal-regal-guion-video-productor.md`) promete **pago a 2 días hábiles con una mora del 0,5 % por día
    hábil** a cargo de CTCx (el OCP paga lo enviado del mes y avisa «en la primera semana del mes siguiente»; `terminos.ts` no
    tiene esa mora de CTCx — su `MORA` es la del productor: dos semanas sin cargo y dos con el 5 %, luego ruptura potencial),
    **reoferta −5 %** (el trato real tiene renovación a los 90 días y past crop −10 %),
    **Black y Red 3–4 cargas** (superado por la V5.91) y **la Arena abierta a Blue+ con postulación** (bloque 11; superado por la
    V5.77). Manda `src/lib/trato/terminos.ts`: el guion se corrige, o el owner decide cambiar los términos.
- ⚠️ **Marca «Kaffetal»** (owner): existe una marca colombiana homónima (Kaffetal, Villavicencio, Meta). Consultar ante
  la **SIC** y actuar en consecuencia **antes de invertir más** en el nombre de este componente.

- **Recorrer el bloque B del artefacto de revisión V5.0** sobre el panel nuevo (owner; B3/B4 primero)
  — el artefacto: `C:\dev\ctc-platforms\reference\review-v5\ctc-v5-review.html`.
- **Estrenar el escáner visual** con soportes reales (los 7 lotes de producción siguen en `borrador`).
- **Pagos**: se integrarán **los dos, Nequi y Zulu** (owner, 2026-09-19; el 16-sep el CEO había aplazado Nequi) — se
  configuran más adelante; Stripe sigue aplazado. «Evaluar mi Café» sigue mandando a
  `info@` mientras no haya medio de pago.
- **Google OAuth**: la línea del redirect-allowlist en Supabase para las puertas que lo ofrecen.
- **Confirmación de correo en el alta** (memoria `project_kr_email_confirmation`): verificar que el
  SMTP/rate-limit de Supabase no bloquea registros reales antes de la beta.
- `/api/kaffetal-regal/next-step` no tiene llamador: se conserva a propósito (dicho en el archivo).

## Kick-off

```
Trabajas SOLO en el componente «Kaffetal Regal» (clave: kaffetal-regal) de la plataforma CTC
(repo C:\dev\ctc-platforms\ctc-platform, rama main). Antes de tocar nada lee, en este orden:
1. docs/componentes/kaffetal-regal.md   ← tu charter
2. docs/ALINEACION.md                   ← contratos transversales y el registro de permeación (§3, desde la última fecha que conozcas)
3. AGENTS.md                            ← la compuerta y las reglas de la casa
El productor nunca escribe grado ni estado: si tu tarea necesita que el OCP haga algo distinto, se
anota como pendiente con dueño «consolas» y una línea en el §3. Campos nuevos del datasheet con
default seguro. Se verifica en vivo con la sesión asistida del OCP sobre un productor o un Proveedor
Desacoplado (las cuentas prueba-* ya no existen desde la V5.89). Al terminar:
compuerta completa (incl. qa-kr-panel, qa-kr-ficha), APP_VERSION + CHANGELOG, sello del sha, push,
verificación en vivo, log de arquitectura, y «Pendientes» de este charter al día.
Hoy: <la tarea>.
```
