# PVC · módulo del BCP · Business Core — plan de acople

Estado: **fase 1 ejecutada** (V5.28, 10-sep-2026): tablas, motor, `/bcp/pvc`, vista pública. Fases 2–4 pendientes de las decisiones de §8. El modelo de referencia sigue en
`reference_internal_apps/PVC - Modelo/v2.0` (motor Python, dossier D0–D9, calculadora) y el tablero interactivo en
`reference_html_tools/PVC_Tablero_de_Control_CTC_V1.html`.

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
| `src/lib/grados/definicion.ts` (fuente única de bandas, enum `lot_grade`) | SCA de dos en dos: black 80–82, red 82–84, blue 84–86, gold 86–88, tyrian 88+ | Bandas PVC v2.0.1: 80–83,9 / 84–85,9 / 86–87,9 / 88–88,9 / ≥ 89 con puertas de genética y FR | **#1 Una sola definición de banda.** Recomendación: la plataforma adopta las del PVC (D2 §8.1) y `GradosBoard`, jsonLd y `GradosSection` cambian solos |
| `purchase_contracts.reference_price_source/_snapshot`, `price_per_kg_locked`, `grade_snapshot` (`ocp/contractActions.ts`) | Referencia escrita a mano ("ICE C + Fedecafé") | FK a `pvc_editions` + multiplicador + coeficiente FR; precio congelado = PVC × coef FR × mult ÷ 125 por kg pergamino | Carga vs kg: el contrato guarda por kg; el PVC por carga. Mostrar ambos |
| `lot_offers.price_per_kg` (`ofertasActions.ts`, `producerActions.ts`) | Precio libre | Derivado de edición × banda; la oferta muestra "PVC-F4-2026 × 1,15"; reemisión automática −5% por franja | — |
| `lot_listings.price_per_kg, moq_kg, unit_kg` y Cherry Picked (`CherryPickedExperience`, `LotCard`, `data.ts`) | `ASSOC_BLACK_MOQ = 350`, precio libre | Precio = pila N2/N3/N4 en US$ a la TRM del corte; MOQ por banda 228/150/60/30; bolsa 6 kg | **#2 MOQ 350 vs 228** y kilos garantizados 78 por carga |
| `market_anchors` + cron `/api/cron/market-anchors` (11:10 UTC, `parseFnc`) | Sólo FNC carga | Añadir kinds `trm` (datos.gov.co 32sa-8pi3) e `ice_c_strip` (del ticker); la ventana de 30 días y el disparador se calculan de aquí | Vercel Hobby: 2 crons. El semanal va por Make (abajo) |
| Subastas Tyrian (`src/lib/subastas`, `precio_salida_eur_kg`) | Salida en EUR | Salida = precio Gold de la edición; excedente 80:20 | **#3 Moneda:** el PVC al comprador es US$ a la TRM del corte; las subastas están en EUR |
| Roast landing (`FEE_EUR_KG = 9.50`, MOQ por grado) | Constantes | Tarifa CTCx = base × factor de banda + recargo por nivel, desde la edición | Misma decisión de moneda |
| Arena (`ARENA_FEE_COP`, `EVALUATION_FEE_COP`) | Constantes | Tarifa de evaluación $200.000 y subsidios 30/50/60/70 desde `pvc_model_versions.params` | — |
| `public_transparency_pricing`, jsonLd SEO | — | Exponen `public_pvc_current` | Sneak peek sigue sin precio (`qa-sneak-peek-check.mjs`) |
| `/bcp/documentacion/[file]`, `tools` + `tool_versions` | Registro de herramientas versionadas | El dossier D0–D9 + calculadora + one-pager se registran por edición (`tool_versions`) y se sirven desde storage `pvc/<código>/` | El pipeline de PDF es Python; se ejecuta fuera del Next (GitHub Action o Make → runner) |
| Cola de integraciones → Make (`src/lib/integraciones/emit.ts`) | Eventos de dominio | `pvc.published`, `pvc.corrected`, `pvc.cycle_ready`: Canva del one-pager, correo a productores (D8), WhatsApp, campaña D9 | Regla vigente: las Server Actions insertan en la cola, nunca llaman el webhook |

## 5. El ciclo semanal (automatización)

1. **Lunes 06:00 COT · Make scheduler** llama `POST /api/pvc/cycle` con `CRON_SECRET` (no consume cron de Vercel).
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
| 2 | Contratos, ofertas y listados leen la edición (decisiones #1, #2, #3 resueltas) | QA de rutas y sneak peek |
| 3 | Endpoint de ciclo, capturas, Make semanal, avisos, dossier por edición en storage | Prueba de un ciclo completo antes del corte del 30-sep-2026 |
| 4 | Disparador diario, certeza, informe de afinación | Primera franja cerrada (F4-2026) |

## 8. Decisiones que necesita el owner

1. Bandas de grado: una sola definición (recomendado: las del PVC).
2. MOQ Black 228 kg y 78 kg garantizados por carga en Cherry Picked (hoy 350).
3. Moneda al comprador: US$ a la TRM del corte (PVC) frente a EUR (subastas y roast).
4. Ciclo semanal por Make (sin consumir cron de Vercel) o cambiar el plan de Vercel.
5. Dónde corre el pipeline Python del dossier (GitHub Action recomendado; artefactos a storage).
