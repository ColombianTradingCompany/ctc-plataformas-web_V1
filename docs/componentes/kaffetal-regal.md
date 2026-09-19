# Charter · `kaffetal-regal` — Kaffetal Regal (landing + plataforma del productor)

> Se lee con `docs/ALINEACION.md` al lado. Grupo de la barra lateral: **Kaffetal Regal**.

## Qué es

La plataforma del **caficultor**: la landing (`kaffetal-regal.ctcexport.com`, tres idiomas) y, tras el
login, el **panel en cinco interfaces** (V5.16): Mensajes · Ecosistema · Mi Perfil · Evaluaciones ·
Contratos. Desde aquí el productor registra fincas y lotes, llena la **Ficha Técnica** (FT → FT2 → EUDR
→ VID), pide su **evaluación** (muestra + COP 80.000), sigue su lote hasta el **galardón**, y responde a
las **ofertas** (temporada · black · subasta Tyrian) cuya aceptación crea el contrato. El camino base
del lote: `FT·FT2·EUDR·VID → EVA → MUE·SON → GAL → ARE (vitrina, opcional)`.

## Superficies y rutas

| Ruta | Qué |
|---|---|
| `/kaffetal-regal` | landing + app (`KaffetalExperience.tsx`: landing · panel · Ficha; `?m=` legado → pestaña/drill) |
| `/kaffetal-regal/certificacion/[id]` · `/certificacion-lote/[id]` | sello/visa EUDR de finca y de lote |
| `/kaffetal-regal/herramientas/[slug]` | la concha de Herramientas del Café en esta superficie (charter `herramientas-cafe`) |
| `/api/kaffetal-regal/next-step` | el asesor «¿Y ahora qué?» (plumbing conservado a propósito) |
| `/kaffetal-regal/auth/callback` | OAuth de Google |

## Mapa de código

- `src/components/kaffetal-regal/` — `KaffetalExperience.tsx` (estado, `loadData`, la pila de capas del
  botón atrás: drill = capa, pestaña = no), `AppDashboard.tsx` (concha + `PanelNav`), **`panel/`**
  (`panelTabs.ts`, `PerfilTab`, `EvaluacionesTab`, `ContratosTab`, `EcosistemaTab`+`FlipCard`, `MensajesTab`,
  `mensajes.ts`), `FichaView.tsx` + **`ficha/`** (8 panes: A1–A5, B1–B4; `fichaData.ts` = `FichaFormData`,
  `ReportFiles`, `FichasDelLote`, `FichaPreview`, `SpiderChart`), `FincaModal`, `InfoModal`, `LotKanbanStepper`,
  `FileDrop`, las secciones de la landing en la misma carpeta (`ArenaSection`, `PorQueSection`, `OportunidadSection`, `TratoSection`, `FaqSection`, `BienvenidosSection`, `CalendarioSection`…), `data.ts`
  (tipos `Lot`/`Finca`, `STAGES`, `isLotCommitted`).
- `src/lib/arena/producerActions.ts` (postular/solicitar evaluación, pagos), `src/lib/ofertas/producerActions.ts`
  (`respondToOffer`), `src/lib/fichas/tipos.ts` (set de Fichas), `src/lib/kaffetalMedia.ts` (subidas + URLs
  firmadas), `src/lib/eudr.ts`, `src/lib/evaluations.ts` (`officialAverages`), `src/lib/lotComposition.ts`,
  `src/lib/geo/` (área, elevación), `src/lib/earthKml.ts`, `src/lib/kaffetal/faq.ts`, `src/lib/grados/` (lee).
- `src/lib/useAutosave.tsx` — autosave con flush de desmontaje: **snapshot y `save()` solo desde estado React**.

## Tablas que posee (con RLS de productor + guard triggers)

`fincas` · `finca_parcelas` · `finca_certificates` · `lots` (`datasheet` jsonb = toda la Ficha; `intake_step`;
`stage` solo `borrador → ficha_completa` desde el JWT) · `lot_contributions` · `ficha_completion_snapshots` ·
`media_assets` (bucket `kaffetal-media`, ruta `{producer_id}/…`) · `producer_profiles` · `producer_comm_log` /
`producer_comm_ack` (hilos) · `lot_evaluations` (filas `producer_claim`).
**Solo lee** (select-own): `arena_inscriptions`, `arena_entry_codes`, `lot_offers`, `lot_fichas`,
`purchase_contracts` (+ releases, humedades), `harvest_seasons` (vía snapshot en la oferta).

## Guardianes

`qa-kr-panel-check.mjs` (119) · `qa-kr-ficha-check.mjs` (207, con `ts-resolve`) ·
`qa-reportado-productor-check.mjs` (40) · `qa-evaluaciones-check.mjs` (42, lado productor) ·
`qa-ofertas-check.mjs` (36, `respondToOffer`) · `qa-fichas-check.mjs` (31, panes B2/B3) ·
`qa-solicitudes-kr-check.mjs` (22) · `qa-visa-check.mjs` (30) · `qa-area-check.mjs` · `qa-claims-check.mjs` ·
`qa-recuperacion-check.mjs` (puerta KR).

## Reglas propias

- **El productor nunca escribe un grado ni un estado más allá de `ficha_completa`**: lo hace el OCP.
- **Todo campo nuevo del datasheet nace con default seguro** (`{ ...EMPTY_FICHA, ...lot.datasheet }`) — un
  lote guardado antes de que existiera el campo no puede reventar.
- Las subidas van por `kaffetalMedia` con la ruta `{producer_id}/…` (las políticas de Storage la exigen);
  la re-descarga sobrevive al bloqueo de la sección (anclas con URL firmada bajo demanda).
- Reportado por Productor (B2/B3): puntaje + escala o «No lo sé»; los números de B3 **siempre a la vista**.
- Back del teléfono: cambiar de pestaña no sale de la app; drill, Ficha y modales cierran capa a capa.
- Copy en tres idiomas; el cacao solo como nota de cata.

## Lo que las consolas gobiernan de este componente

| Quién | Qué | Dónde |
|---|---|---|
| OCP · Fincas | la **visa EUDR** de la finca (`fincas.status`, `eudr_*` de evaluación) | `/ocp/fincas`, `qa-visa` |
| OCP · Lotes | **EVA** (checklist + `lotEudrGate`) → `apto` + sello; borrado de abandonados | `markLotApto`, `actions.ts` |
| OCP · Productores, Fincas y Lotes (`/ocp/kr`, V5.61 — eran tres módulos) | la **Visa** de la finca (aprobar · rechazar · compartir la certificación), la **EVA** del lote (checklist y veredicto Apto/No apto), el recibo de la muestra, la DDS | `actions.ts` (sin cambios) |
| OCP · Nominados | bache, planilla y **veredicto** (`gradoPorPuntaje` → `galardonado` + Club) | `recordEvaluationVerdict` |
| OCP · Ofertas / Contratos | emisión de ofertas (temporada · black · subasta), precio y firma del contrato, escalera de liberación | `ofertasActions`, `contractActions` |
| OCP · Fichas | el set de Fichas Técnicas y cuál es la **oficial ★** | `fichasActions` |
| BCP · Kaffetal Regal Arena (del OCP hasta la V5.59) | la invitación a la **vitrina** (Blue/Gold/Tyrian con contrato) | `inviteLotToArena` |
| BCP · Kaffetal Club (del OCP hasta la V5.59) | membresía (llega con el galardón), campañas de pasaporte | `club.ts`, `clubActions` |
| LCP · Leads y CRM CaaS · BCP · CTC Tech / Varietales | respuestas a «Mis solicitudes» (CTC Tech · Varietales · CaaS) espejadas en el panel | `producer_comm_log.lead_id` |
| BCP · Herramientas del Café | qué herramientas ve el productor y con qué nivel | charter `herramientas-cafe` |

## Pendientes

- **⚠️ El overhaul de las consolas toca este componente en su fase 5** (`docs/OVERHAUL_CONSOLAS_PLAN.md`, 2026-09-19, sin
  ejecutar): el paso 4 del intake pasa de «Video» a **«Fotos y video» — 2 fotos obligatorias, video opcional**, validado en
  el servidor (hoy el video solo se exige en el cliente y no se pide ninguna foto del lote); «Evaluar mi Café» pasa a **Por
  evaluar · En evaluación · Evaluados** (el Sondeo desaparece como concepto); y al aceptar una oferta el productor acepta los
  términos y declara su **Initial Locked Availability**. Se verifica en vivo con las cuentas `prueba-*`.
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
  15-oct** (como dice el guion); Black y Red 3–4 cargas según la mezcla (no fijos: **una carga por productor**, mezcla de
  3 a 4; Black = blend de orígenes y/o variedades, Red = siempre una sola variedad, mezcla regional — owner, 2026-09-19).
- **Papagayo Beans® (owner, 2026-09-17, `PVC_BCP_PLAN.md` §14.6)**: el café del productor sale al mundo como **Papagayo
  Beans®**, la marca de CTCx, con el sello de su grado (loro y monograma PB) y, en Cherry Picked, con su nombre y su finca en
  la vitrina; falta decir la marca en la landing, el FAQ y «Su café en el mundo»;
  **el guion ya lo dice (v0.7, 2026-09-18: bloques 0, 8b, 9 y 12)**. El nombre del productor y la finca en la bolsa quedó
  confirmado en la ronda 3 (§14.7).
- **Decisiones de narrativa del owner (2026-09-17, `PVC_BCP_PLAN.md` §14)**: la prima del 8 % **está dentro del PVC**
  (Cherry Picked paga PVC × grado tal cual; CaaS la retira y luego multiplica) — **el guion ya está en v0.7 (2026-09-18)**;
  faltan `TratoSection` y el FAQ; factor ≤ 94 confirmado; mínimo del lote de Cherry Picked por grado **3–4 según la mezcla · 2 ·
  1 · ½ cargas** (§14.7 corrige el «4 · 3 · 2 · 1 · ½» del §14.4 — ~~**consolas reconcilia**~~ **reconciliado el 2026-09-19** en
  el plan, los charters y `lectura.ts`, V5.53) y
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
    por encima del tramo libre). La aritmética vive en `src/lib/pvc/compromiso.ts`; el productor debe **ver la tabla de
    salida antes de firmar**.
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
       - evaluación de $200.000 con envío incluido;
       - `TratoSection` con los dos caminos: Cherry Picked recomendado con prima del 8 %, compra inicial, escalera
         25 % + 25 % y 4 %; CaaS sin prima con 15–25 kg;
       - pago a 2 días hábiles y reporte de ventas en la primera semana del mes;
       - `faq.ts`, con preguntas nuevas de PVC, base física y Tríada;
       - `BienvenidosSection` con Perfil;
       - multiplicadores en `OportunidadSection`;
       - la Arena abierta a Blue+.
    2. Panel:
       - perfil antes que finca;
       - postulación a la Arena para todo lote Blue+, con su fila.
    3. Grados: el Punto y la Tríada con la base física (factor ≤ 94, Black hasta 98), **en la misma tanda** en que
       consolas lleve la escala al veredicto (fase 2).
  - **Depende de consolas** (ALINEACIÓN §3b):
    - el PVC de ene–mar 2027 **antes del 15-oct-2026**;
    - base física y Tríada en el veredicto;
    - ofertas con prima y compra inicial;
    - `compromiso.ts` conectado a contratos;
    - reporte de ventas;
    - fin del reembolso del 80 %;
    - `showcaseGate` sin contrato.
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
default seguro. Se verifica en vivo con las cuentas prueba-* (memoria ctc-qa-fleet). Al terminar:
compuerta completa (incl. qa-kr-panel, qa-kr-ficha), APP_VERSION + CHANGELOG, sello del sha, push,
verificación en vivo, log de arquitectura, y «Pendientes» de este charter al día.
Hoy: <la tarea>.
```
