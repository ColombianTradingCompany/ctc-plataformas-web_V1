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
| OCP · Nominados | bache, planilla y **veredicto** (`gradoPorPuntaje` → `galardonado` + Club) | `recordEvaluationVerdict` |
| OCP · Ofertas / Contratos | emisión de ofertas (temporada · black · subasta), precio y firma del contrato, escalera de liberación | `ofertasActions`, `contractActions` |
| OCP · Fichas | el set de Fichas Técnicas y cuál es la **oficial ★** | `fichasActions` |
| OCP · Arena | la invitación a la **vitrina** (Blue/Gold/Tyrian con contrato) | `inviteLotToArena` |
| OCP · Club | membresía (llega con el galardón), campañas de pasaporte | `club.ts`, `clubActions` |
| ECP · Leads | respuestas a «Mis solicitudes» (CTC Tech · Varietales · CaaS) espejadas en el panel | `producer_comm_log.lead_id` |
| ECP · Herramientas | qué herramientas ve el productor y con qué nivel | charter `herramientas-cafe` |

## Pendientes

- **Recorrer el bloque B del artefacto de revisión V5.0** sobre el panel nuevo (owner; B3/B4 primero)
  — el artefacto: `C:\dev\ctc-platforms\reference\review-v5\ctc-v5-review.html`.
- **Estrenar el escáner visual** con soportes reales (los 7 lotes de producción siguen en `borrador`).
- **Número de Nequi** (dueño: consolas) — hasta entonces «Evaluar mi Café» manda a `info@`.
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
