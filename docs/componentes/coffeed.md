# Charter · `coffeed` — Coffeed (el noticiero de la red)

> Se lee con `docs/ALINEACION.md` al lado. Grupo de la barra lateral: **Coffeed** (crear entradas nuevas
> y administrar la app).

## Qué es

El **muro de noticias** de la red (`coffeed.ctcexport.com`, y montado en Kaffetal Regal, Cherry Picked
y el Directorio) más **la línea de producción editorial** detrás. Partido en dos por decisión del owner
(2026-08-03): el socio **Estudio de Contenido PRODUCE** (Medios · Selección · Propuestas · Posts · el
Canon donde se escribe, y las apps del taller: Source Wrapper, Datawave, RT-Scriptor) y el **ECP recibe,
da luz verde y publica** (Entregas · **Redacción** · Muro · Identidad de marca · Canon en espejo). Las
entregas son **polimórficas** (`coffeed_deliverables`, `kind` carrusel | video | embed | identidad | noticia)
— una cola para todas las apps. **Redacción** (V5.9) es el post que se escribe solo: feeds de la lista
blanca → noticia elegida → capítulo (Haiku, a propósito) + portada (Gemini) → cola de Entregas.

## Superficies y rutas

| Ruta | Qué |
|---|---|
| `/coffeed` | la Home propia del muro (Clase C: solo capítulos `published` + anuncios) |
| `/ecp/coffeed` | `CoffeedConsole`: Entregas · Redacción · Muro · Identidad · Canon |
| `/socios/estudio-contenido/panel` (+ `/source-wrapper`, `/datawave`, `/rt-scriptor`) | el taller del socio (`studioGate()`: socio con cookie pública O operador con grant de ECP) |
| el muro en KR (módulo), CP Green (`#coffeed`) y Directorio (pestaña, miembros verificados) | `CoffeedWall` compartido |

## Mapa de código

- `src/lib/coffeed/` — `redaccion.ts` (los tres verbos: `refrescarNoticias` $0 · `generarPost` · `descartarNoticia`),
  `feeds.ts` + `feedFetch.ts` + `feedActions.ts` (lista blanca, filtro de café, ventana 14 días, tandas de 6),
  `claude.ts` (cliente compartido: `MODEL_CHEAP`/`MODEL_WRITE`, reintentos 529, `parseJson`), `gemini.ts` +
  `geminiImage.ts` (vídeo y portadas), `aiActions.ts` (triaje Haiku, propuestas/guion Sonnet), `actions.ts`
  (taller), `ecpActions.ts` (dirección), `deliverableActions.ts` (la cola), `datawaveActions.ts`,
  `rtScriptorActions.ts` + `rtsPrevis.ts`, `wallActions.ts` (`getCoffeedWall`), `postTemplate.ts` (maqueta
  determinista), `studioApps.ts` (registro del lanzador), `studioGate.ts`, `requireEcp.ts`, `storage.ts`, `types.ts`
  (`validateCoffeedDraft`: 5–10 paneles, máx. 3 por fuente, ninguno sin trazar).
- `src/components/coffeed/` — `CoffeedConsole`, `StudioConsole`, `CanonView`, `CoffeedWall`, `StudioAppShell`,
  `datawave/` (model puro + gráfico + tarjeta canvas/PDF), `rtscriptor/` (model puro + 7 pestañas).
- Prototipos de origen: `C:\dev\ctc-platforms\reference\coffeed\` (Datawave, RT-Scriptor, spec, schema).
- Docs: `docs/MAKE_RTS_CANVA.md` (el reparto real con Make), `docs/CLAVES_IA_Y_COSTE.md`.

## Tablas que posee (19 `coffeed_*`, service-role-only)

`coffeed_sources` · `coffeed_items` · `coffeed_noticias` · `coffeed_extractions` · `coffeed_claims` ·
`coffeed_proposals` · `coffeed_drafts` · `coffeed_panels` · `coffeed_threads` (canon) · `coffeed_cycles` ·
`coffeed_matrix_entries` · `coffeed_announcements` · `coffeed_brand` · `coffeed_deliverables` ·
`coffeed_datawave_episodes` · `coffeed_rts_projects` · `coffeed_rts_decks` · `coffeed_rts_series` ·
`coffeed_rts_renders`. Triggers `coffeed_guard_accept` y `coffeed_guard_deliverable` (las reglas de formato,
por tercera vez), `coffeed_update_canon`. Solo lee: `partner_accounts`, `platform_settings`, `profiles`.

## Guardianes

`qa-redaccion-check.mjs` · `qa-feeds-check.mjs` · `qa-coffeed-embed-check.mjs` · `qa-rtscriptor-check.mjs` (41)
· `qa-consumo-check.mjs` (las vías de gasto de Coffeed).

## Reglas propias

- **Un panel sin fuente bloquea la aceptación** (regla innegociable del prototipo); las reglas de formato
  se validan tres veces (cliente · action · trigger). *El prompt es una petición, no una garantía.*
- **Publicar ES la compuerta**: el muro solo lee `published`; los anuncios internos nunca viajan.
- **Costes** (ALINEACION §1): ingesta $0 (RSS, no búsqueda web); redacción con **Haiku a propósito**; la
  portada de Gemini es el renglón más caro y es **opt-in con el precio a la vista**; sin claves, todo
  degrada y lo dice. `webSearch` no vuelve.
- `claude-sonnet-5` **rechaza el prefill de assistant**; `parseJson()` rescata el primer bloque JSON.
- El contenido se produce en **español** a propósito (las cabeceras del muro sí van EN/ES/DE).
- `coffeed.redaccion.post_creado` se emite por la espina para el escenario de Make del owner.

## Lo que las consolas gobiernan de este componente

**ECP · Coffeed** es la consola de este componente (luz verde, publicar, identidad de marca, Redacción,
lista blanca de medios); **BCP · Socios** emite y suspende la credencial del Estudio de Contenido
(`partner_accounts`, nodo `estudio-contenido`); **BCP · Consumo** ve el gasto. Un cambio en las reglas de
formato toca el trigger, la action y el cliente a la vez — y las tres superficies que montan el muro.

## Pendientes

- **La primera generación real de Redacción** (falló por credenciales en V5.10 — `CLAVES_IA_Y_COSTE.md`)
  y **el escenario de Make** colgado de `coffeed.redaccion.post_creado` (owner).
- **RT-Scriptor nunca fue recorrido por el owner** (V3.1): cuatro decisiones de arquitectura tomadas sin
  confirmar (memoria `project_rt_scriptor`).
- Spec fase 2–3: reacciones/comentarios del muro y el render de paneles a imagen para Instagram.
- **Identity Value Creation** (cuarta app del taller): declarada, no construida — su pendiente real son
  vistas SECURITY DEFINER estrechas para que el socio lea finca y lote.
- La pestaña Coffeed del Directorio comparte el componente pero no se ha navegado con un miembro verificado.

## Kick-off

```
Trabajas SOLO en el componente «Coffeed» (clave: coffeed) de la plataforma CTC
(repo C:\dev\ctc-platforms\ctc-platform, rama main). Antes de tocar nada lee, en este orden:
1. docs/componentes/coffeed.md    ← tu charter
2. docs/ALINEACION.md             ← contratos transversales (sobre todo el libro de consumo) y el registro de permeación (§3)
3. docs/CLAVES_IA_Y_COSTE.md      ← qué clave enciende qué y cuánto cuesta
4. AGENTS.md                      ← la compuerta y las reglas de la casa
Ingesta programática, modelo pequeño por defecto, pasos caros opt-in con precio, sin credencial nada
revienta; un panel sin fuente no se acepta; el muro solo lee published. Al terminar: compuerta
completa (incl. qa-redaccion, qa-feeds, qa-consumo), APP_VERSION + CHANGELOG, sello, push,
verificación en vivo, log de arquitectura, y «Pendientes» de este charter al día.
Hoy: <la tarea>.
```
