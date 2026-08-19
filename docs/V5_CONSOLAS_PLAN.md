# V5 · Plan de consolas — the CTC Platforms re-org (written 2026-08-17)

> ## ▶ EMPIEZA AQUÍ
> **Step 0 (the Sneak Peek) is BUILT and deployed — V4.16 through V4.21.** Everything from §2 onward is
> **Steps (i) and (ii) are COMPLETE**, the **Version Wrap V37 is done**, and **iii-1 «CTC Selection» is
> COMPLETE** — pipeline in V4.27, publication in V4.28 once the owner answered **D3.1**.
> **LOS CINCO PASOS ESTÁN COMPLETOS** (V4.23 → V4.35). Lo que queda no es trabajo de plan:
> **el owner declara V5.0** y se hace el **Version Wrap V38** del mapa interactivo.
> (**V4.22 was spent on an unplanned fix**: the 14 public portadas had a broken text encoding, live in
> production since 2026-08-15. See §9, dev to-do 0. The version map in §7 is renumbered accordingly.)
> Read §0 (ground rules) → §2 (what to do) → §7 (which version number to use). One step, one PR, one
> `APP_VERSION` bump; do not start the next step until the previous one is pushed and green.

**Status: written 2026-08-17, step 0 BUILT (V4.21 in production), steps (i)–(v) still PLAN.**
This document is step (i) of F14 in `docs/ESTADO_Y_PREGUNTAS_2026-08-17.md` ("freeze names + write the plan
doc"), written from the new workspace (`C:\dev\ctc-platforms`).

It turns the owner's 3-page PDF (`reference_html-vision-board/ctc-platforms-structure-2026-08-17.pdf`)
plus the decision record (ESTADO §0: A1–A9, B10–B12, D18–D22, F1–F14 — all decided, defaults taken)
into an ordered list of PRs, each with its own `APP_VERSION` bump. **V5.0 is the milestone the owner
declares when the re-org is complete** (default: at the end of step (v), §7).

**One addition made by the owner on 2026-08-17 (this document's reason to be written now):** a new
reusable module, the **«Active Catalogue Sneak Peek»** (owner's spelling: "Sneak Peak"), goes to the
**front of the to-do list, before the re-org itself** — together with a set of **7 mock lotes** from
"the last season" that feed it while no real lot has been through KR → Arena. See §1.

**Owner's answers, same evening:** *defaults on all D0.x* — so every step-0 decision is settled (§1.6); the
module is **the same on every Cherry Picked landing and replaces the direct catalogue** that stands there today
(§1.1); and the 7 mock lotes are built from **real references in the owner's Notion database «📋 Fichas Técnicas
de Café»**, read on 2026-08-17 (§1.4), with the two gaps and two discrepancies listed rather than papered over.

Sources of truth this plan was checked against (all read today, not recalled): `src/lib/panel/consoles.ts`,
the route tree under `src/app/{bcp,ecp,ocp}/(app)/`, `scripts/qa-nav-check.mjs` + `src/lib/panel/navActivo.ts`,
`src/lib/panel/require*.ts`, `next.config.ts`, the live Supabase schema (`public_lot_catalog` view definition,
`lots`, `lot_listings`, `fincas`, enums), `src/components/ctc-home/*` (`MarketTicker` in particular),
`src/components/cherry-picked/{data.ts,CherryPickedExperience.tsx}`, `docs/HANDOFF.md` (gotchas on redirects and
the proxy) and the memory notes for the re-org.

---

## 0. Ground rules for every PR in this plan

Same rules as `AGENTS.md`, restated because this plan is wide and mechanical — the place mistakes hide.

1. **The gate before "done":** `npx tsc --noEmit` clean · `npx eslint src` at or below the current warning
   baseline · `npm run build` exit 0 · every `scripts/qa-*.mjs` that touches what you moved (run pattern:
   `node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/<x>.mjs`). Consoles are behind
   real 2FA and cannot be driven in a browser: console changes are verified by `tsc`/`eslint`/`build` + the
   node guardians + SQL, and by driving the producer/buyer surfaces that share the code.
2. **One PR per step, one `APP_VERSION` bump per PR** (`src/lib/version.ts`, minor digit, same commit).
   Explicit-path commits, never `git add -A`. The auto-mode classifier blocks direct pushes to `main`:
   feature branch + PR, the owner merges (or pushes) — see memory `reference_github_pr_without_gh`.
3. **URLs move with modules, old URLs stay alive as 308s** (F2). Never leave a redirect chain: when a
   destination moves again, repoint the old stub at the *final* path.
4. **Docs move with code:** an entry in the open `Log_Documentacion_Interactiva_V36.txt` sealed with the
   commit sha; `docs/HANDOFF.md` directory map + feature status; the DICT gets the new names. Never hand-edit
   the interactive HTML — the `architecture-doc-versioning` skill (workspace root `.claude/skills/`) says when a
   Version Wrap happens (`validate_snapshot.mjs`, nine checks, `--prev`).
5. **The house definitions override any external source** (owner, 2026-08-17). When data that comes from
   outside the repo — Notion above all, but also a spreadsheet, a PDF or a partner's export — contradicts a
   definition that lives in code, **the code wins and the external source is the thing that gets corrected**.
   The canonical case is `src/lib/grados/definicion.ts` (rule 1: *el puntaje manda*), which is why every mock
   lot derives its grade from its SCA score instead of copying Notion's `Grado CTC`. Applies to anything with
   a single source in the repo: the grade scale, `harvestYear.ts`, `legal.ts`, `subdominios.ts`. Never
   "fix" the discrepancy by bending the definition to the imported value — flag it and correct it upstream.
6. **`npm audit`**: it was at 0 from 2026-08-13 until a new advisory landed on 2026-08-17 (§9, dev to-do 1).
   Do not let a *new* dependency add to it, and do not force a breaking downgrade to clear it either — that
   one is a tracked to-do with the owner.
7. **Vocabulary is frozen by §2** — use it in code comments, nav labels, docs and commit messages from step (i) on.

### 0.1 How to run one step (the loop, every time)

The steps are meant to be executed **one per session** by someone starting cold. The loop:

1. **Read three things**: `AGENTS.md` (always loaded), the step's section here, and §7 for the version number.
2. **Branch or not**: docs-only steps commit straight to `main` (that is this repo's precedent); code steps
   too, since the owner pushes. The classifier blocks direct pushes — the owner runs `git push`.
3. **Do the work**, keeping the step's scope. If you find something out of scope, write it into §9 as a
   dev to-do; do not widen the step.
4. **Bump `APP_VERSION`** (`src/lib/version.ts`) in the same commit.
5. **Run the gate**: `npx tsc --noEmit` · `npx eslint src` (0 errors; **8** pre-existing warnings is the
   baseline; era 27 hasta que V4.32 retiró el módulo vendorizado) · `npm run build` (exit 0) · every `qa-*.mjs` that touches what you moved.
   ⚠️ `tsc` does **not** catch a client component importing a value from a `server-only` module — that lands
   as a runtime 500. If you touch imports across the client/server line, load the page in a dev server.
6. **Verify what changed**, the way the thing can be verified: consoles are behind 2FA and cannot be driven
   in a browser (SQL + guardians instead); public surfaces get a real Chrome check — the preview pane paints
   no frames and cannot measure transforms or animation.
7. **Write it down**: an entry in the open `Log_Documentacion_Interactiva_V36.txt` sealed with the commit sha
   (commit first, then seal in a second commit), the HANDOFF section, and the memory note.
8. **Stop.** One step per PR. Do not start the next.

---

## 1. Step 0 — «Active Catalogue Sneak Peek» + the 7 mock lotes  ✅ BUILT (V4.16–V4.21)

### 1.0 What shipped (closing the step)

Built across **V4.16 → V4.21**, all pushed. The design notes below (§1.1–§1.7) are kept as the record of
*why* each decision was taken; this is *what exists*:

| Piece | Where |
|---|---|
| The band | `src/components/catalogo/SneakPeek.tsx` + `.module.css` — rAF engine, edge arrows, centre-then-flip, 15 % pop |
| The radar | `src/components/catalogo/RadarIntrinseco.tsx` (React, trilingual) |
| The popup | `src/components/catalogo/CatalogoPopup.tsx` |
| Data + type | `src/lib/catalogo/sneakPeek.ts` (`server-only`), `atributosSca.ts` (pure), `sneakPeekMock.ts` (the 7 mocks) |
| API | `src/app/api/catalogo/sneak-peek/route.ts` |
| Assets | `public/images/catalogo/sneak-peek/` (7 photos, 7+7 wheels) · `public/docs/fichas-mock/` (7 × 3-page PDFs) |
| Workshop scripts | `scripts/build-ruedas-mock.mjs` · `scripts/build-fichas-mock.mjs` · `scripts/lib/analisis-intrinseco.mjs` |
| Guardian | `scripts/qa-sneak-peek-check.mjs` — **177 checks** |
| Mounted on **7 surfaces** | CTC Home · KR landing · CP portada · CP Green (replacing the anonymous grid) · CP Roast · CP X · CaaS |

**Still open on step 0 — two owner questions, neither blocking** (both ship with a value and a `⚠` comment
in `sneakPeekMock.ts`): **D0.9** card #2's variety (title says «Bourbon», Notion's field says `Castillo`) and
**D0.10** card #3's finca (Notion's relation says La Floresta, its title and supplier say La Fortaleza ·
Ragonvalia — the plan uses La Fortaleza). Answer them and it is a one-file edit plus a re-run of the two
workshop scripts.

### 1.1 What it is

A **reusable public module**: a slow-moving band (marquee) of lot cards that gives visitors of the
Home/landing pages **a glance at the Catálogo Activo** — name, grade, score, origin, variety, process, cup —
**without any commercial data**. The full Catálogo Activo is only seen inside the Cherry Picked platforms
after login (owner, 2026-08-17; see D0.5 for the gap between that statement and today's Green store).

It is "reusable" the way `Band`, `HarvestCalendar`, `YtEmbed` and `SellBuyCtas` already are: one component
in `src/components/`, mounted on several surfaces, one data source, trilingual.

**Owner's ruling (2026-08-17):** it is **the same module on every Cherry Picked landing**, and on those it
**replaces the direct catalogue that stands there today** — the logged-out visitor sees the Sneak Peek, and the
real Catálogo Activo only exists behind the login. That is D0.5 option (a), confirmed and extended to the whole
CP family.

| Surface | File | Slot |
|---|---|---|
| CTC Home `/` | `src/app/page.tsx` | right after `<Hero />` (which already ends in the `MarketTicker`), before `<EcosystemSection />` — the second thing a visitor sees |
| Kaffetal Regal landing (logged-out) | `src/components/kaffetal-regal/Landing.tsx` | after the hero block — "así se ven los lotes que llegan al catálogo": the producer sees where the road ends |
| **Cherry Picked portada** | `src/components/cherry-picked-hub/HubLanding.tsx` | after the programme cards, before the `sep-paisaje` band |
| **Cherry Picked Green — the store** | `src/components/cherry-picked/CherryPickedExperience.tsx` | **replaces** the anonymous view of the grid: `loadCatalog()` stops running for visitors, `GradosSection`/`BlackSection`/`LotCard` render only for a logged-in buyer, and the Sneak Peek + login CTA take that place |
| **CaaS · Coffee as a Service** | `src/components/services/CaasLanding.tsx` | between «Las dos clases de café» and «Dónde encaja» — the order is the argument: first what the two classes ARE, then real lots, then the offer models |
| **Cherry Picked Roast · Cherry Picked X** | `src/components/cherry-picked-roast/RoastLanding.tsx` · `src/components/cherry-picked-x/XLanding.tsx` | same module, same slot pattern — these two show no catalogue today, so here it is an addition (uniformity across the family is the point) |

### 1.2 The data contract — what a card may show, and what it must never show

The Green store already reads a **price-free, `SECURITY DEFINER`, anon-readable view**: `public_lot_catalog`
(verified today: `SELECT` granted to `anon, authenticated`; rows = lots whose `lot_listings.status` is
`published` or `sold_out`). Its columns are exactly the display set the Sneak Peek needs — the module reads the
VIEW and only the view, never `lots`/`fincas`/`lot_listings` (memory `feedback_public_catalog_rls`).

```ts
// src/lib/catalogo/sneakPeek.ts — the ONE shape every surface renders
export type SneakPeekLot = {
  id: string;                    // lot_id (live) or the reserved `mock-lote-NN` (mock)
  code: string;                  // short buyer-facing code (GD-…), never the UUID
  name: string;                  // lots.name
  grade: "black" | "red" | "blue" | "gold";  // tyrian excluded: auction-only, never in the catalogue
  score: string;                 // official avg of accepted lot_evaluations, else the producer's estimate
  scoreEstimated: boolean;       // same rule as Green: never let an estimate look verified
  finca: string; municipio: string | null; departamento: string | null;
  altitudeM: number | null; variety: string | null; process: string | null;
  cup: string | null;            // ficha_notas_cata, clipped to ~90 chars for the card
  season: Record<Lang, string>;  // «Temporada actual» / «Temporada anterior · …» — the honesty tag
  mock: boolean;                 // true ⇒ card carries the "temporada anterior" tag and no live link
  image?: string;                // optional photo under public/images/catalogo/sneak-peek/; else the grade seal
};
```

**Never on a card, by construction (the type has no field for them):** `price_per_kg`, `moq_kg`, `unit_kg`,
`total_kg`, `sold_kg`, `deposit_pct`, `arrival_date`, `commercial_mode`, anything from
`public_transparency_pricing`, contract/auction state, producer identity or contact, finca geolocation/EUDR
data, the raw `lots.datasheet`. If a future field is wanted on the card, it is added to the type on purpose.

### 1.3 Data source and the mock fallback

Pattern = `MarketTicker` (proven on Home): the page stays static, the band fetches from an API route with
Next's data cache, and **if the request fails the band simply does not render — it never breaks the hero.**

- `src/lib/catalogo/sneakPeek.ts` (`server-only`): `getSneakPeekLots(): Promise<{ lots: SneakPeekLot[]; source: "live" | "mixed" | "mock" }>`
  - reads `public_lot_catalog` (+ `lot_listings.status='published'` to drop `sold_out` — same filter as the store, D0.2),
  - maps to `SneakPeekLot` with the Green rule for score/estimate (`CherryPickedExperience.listingToLot` is the reference),
  - **fallback rule (D0.2 default):** live lots first; while there are fewer than **7** live lots, pad with the
    mock set up to 7, mocks tagged «Temporada anterior»; with ≥ 7 live lots the mocks retire on their own.
- `src/lib/catalogo/sneakPeekMock.ts`: the 7 mock lotes as a typed constant (`SNEAK_PEEK_MOCK: SneakPeekLot[]`,
  all `mock: true`). **They never touch `lots`, `fincas` or `lot_listings`** — the lot passport stays clean and
  the KR → Arena → contract gates in `publishLot` are not bypassed for a showcase.
- `src/app/api/catalogo/sneak-peek/route.ts`: `GET` → the payload above; `revalidate = 900` (a quarter hour,
  like ticker quotes); no auth, no cookies (public data only).
- Optional graduation (D0.6): a `catalog_showcase` table + an OCP · Catálogo tab «Sneak Peek» so CTC curates
  the band from the console (pin real lots, retire mocks). Not in step 0.

### 1.4 The 7 mock lotes — built from the owner's Notion references (read 2026-08-17)

Ground truth in the platform DB (SQL, 2026-08-17): `lots` = 3 (all `borrador`, producer self-report),
0 `galardonado`, `lot_listings` = 0, `public_lot_catalog` = 0 rows. Nothing to show — hence the mocks.

**Source of the references** (the owner's link, 2026-08-17): the Notion database **«📋 Fichas Técnicas de
Café»** (`app.notion.com/p/384e04a4b7ca80eb864fd7d0e6a4b4a9`), data source **«Fichas Tecnicas»**
(`collection://384e04a4-b7ca-80f4-b64a-000b52353963`) — **11 fichas, 7 of them populated**, 4 empty stubs.
Origin fields come from the linked **«Fincas»** source (`collection://384e04a4-b7ca-8022-8557-000b70428fba`:
Municipio · Departamento · Vereda · MASL) and the ladder from **«Grados»**
(`collection://38ae04a4-b7ca-809e-95d9-000b20a51107`).

**⚠️ The grade is DERIVED from the SCA score, never copied from Notion.** Notion's `Grado CTC` relation
contradicts its own `SCA` column on **6 of the 7** populated fichas (e.g. 84.25 linked to «Tiryan», 87.0
linked to «Black» — full list in §9). `src/lib/grados/definicion.ts` rule 1 is **EL PUNTAJE MANDA**, and this
repo is the definition Notion is supposed to mirror (`docs/INTEGRACIONES_PLAN.md` §1), so every mock grade is
computed from its score. ⚠️ **La escala se corrigió el 2026-08-19 (V4.44)**: es **de dos en dos** —
Black 80–82 · Red 82–84 · Blue 84–86 · Gold 86–88 · Tyrian 88+, es decir 80–81.99 · 82–83.99 · 84–85.99 ·
86–87.99 · 88–100, con el límite siempre para el grado de arriba. Lo que decía antes esta línea
(80–82.99 · 83–84.99 · 85–86.99 · 87–87.99) era lo que decía `definicion.ts`, y `definicion.ts` estaba mal.

**One ficha is excluded on purpose:** «Borbón Rosado - Natural [La Pradera] 2026_1», **SCA 88.5 → Tyrian**.
Tyrian is auction-only and `publishLot` refuses it in the catalogue, so it cannot appear in a catalogue teaser
(it belongs in a future «Subasta Tyrian» teaser). The 7th card is therefore built from the «Cenicafe 1» stub,
and the ladder becomes **3 Gold · 3 Blue · 1 Black** (era 2/2/2/1 con la escala vieja; la corrección del
2026-08-19 subió 86.25 a Gold y 84.50/84.25 a Blue, y **dejó la cinta sin ningún Red**) — this
**supersedes the D0.7 default ladder**:
real data beats an invented one.

Season tag (D0.8), as shipped: the **visible** label is the short form — «Temporada anterior · 2025-26» ·
EN «Last season · 2025-26» · DE «Vorsaison · 2025-26». The longer «cosecha principal 2025-26» broke onto two
lines in a 330 px card and split the year at the hyphen («2025-» / «26»), which is the one datum that cannot be
left ambiguous; the harvest itself is documented here instead. Notion's own `Harvest Season` agrees with the
season — `2025-Q4` for six of them, `2026-Q1` for the Gesha — and is carried in the data as `harvestQuarter`.

| # | Grade ← SCA | Card name | Finca · municipio, depto | Alt. | Variety | Process | Cup notes on the card (≤ 90 chars) | Notion ficha |
|---|---|---|---|---|---|---|---|---|
| 1 | **Gold** ← 87.00 | Tabi · Honey | La Pradera · Aratoca, Santander | 1 650 m | Tabi | Honey | Chocolate, clavo de olor, frutos rojos, arándano; acidez y cuerpo medios, residual dulce | `Tabi - Honey [La Pradera] 2026_1` |
| 2 | **Gold** ← 87.00 | Bourbon · Honey | La Pradera · Aratoca, Santander | 1 650 m | Bourbon ⚠ | Honey | Floral, mandarina, cardamomo; acidez cítrica equilibrada, cuerpo redondo, residual dulce | `Bourbon - Honey [La Pradera] 2026_1` |
| 3 | **Blue** ← 86.25 | Gesha Ragonvalia · Lavado | La Fortaleza · Ragonvalia, Norte de Santander ⚠ | 1 700 m | Gesha | Lavado | Limonaria, té de rosas, miel, manzana; acidez cítrica media a lima, cuerpo delicado | `Gesha (Ragonvalia) - Lavado [La Fortaleza] 2026_1` |
| 4 | **Blue** ← 85.00 | Tabi · Doble Fermentado | Las Cruces · Pinchote, Santander | 1 750 m | Tabi | Doble Fermentado | **GAP** → Frutos rojos en fermento, cacao, acidez vínica media, cuerpo cremoso, residual dulce | `Tabi - Doble Fermentado [Las Cruces] 2026_1` |
| 5 | **Red** ← 84.50 | Castillo · Doble Fermentado | La Pradera · Aratoca, Santander | 1 650 m | Castillo | Doble Fermentado | Chocolate, especias, cítricos, avellana; acidez media, cuerpo medio ligero, residual dulce | `Castillo - Doble Fermentado [La Pradera] 2026_1` |
| 6 | **Red** ← 84.25 | Castillo · Lavado | La Pradera · Aratoca, Santander | 1 650 m | Castillo | Lavado | Caramelo, especias, cítricos, melao; acidez media, cuerpo medio cremoso, residual dulce | `Castillo - Lavado [La Pradera] 2026_1` |
| 7 | **Black** ← 81.50 **GAP** | Cenicafé 1 · Lavado | Agropalencia · Chima, Santander | 1 400 m | Cenicafé 1 | Lavado | **GAP** → Chocolate, nuez, panela; acidez baja, cuerpo pleno, taza limpia y dulce | `Cenicafe 1 - Lavado [Cafe Semilla] 2026_1` |

**The gaps I filled** (each marked `// GAP:` in `sneakPeekMock.ts` so the owner can correct them at a glance):
#4's cup notes (`Notas de Perfil` is empty in Notion) · #7's score, variety and notes (that ficha is a stub —
no SCA, no variety, no notes; **81.50** was chosen inside Black, which is also the grade Notion itself links it
to, and the variety is read from its own title). Cards 1·2·3·5·6 carry the producer's real notes, trimmed to
card length; the full text stays in Notion.

**Discrepancies found in the references — flagged, not silently fixed:**
- **#2** ✅ **RESUELTA (owner, 2026-08-19): es Bourbon.** El título dice «Bourbon», el campo `Variedad` dice
  `Castillo`, y manda el título. Costó preguntarlo bien porque un campo estructurado suele ganarle a un título:
  la ficha hermana `Tabi - Honey [La Pradera]` **sí** lleva `Variedad: Tabi` (el campo no está roto por
  sistema), y `Variedades / %` de La Pradera está vacío (la finca no desempata). **Desempata la taza**: 87.00
  con perfil floral, mandarina y cardamomo, frente a los dos Castillo de la MISMA finca a 84.25 y 84.50 con
  chocolate, especias y avellana.
- **#3** ✅ **RESUELTA (2026-08-19): es La Fortaleza**, y no por criterio sino por prueba. `Pertenece a Finca`
  apunta a **La Floresta** (confines, Santander, 1 300 m) — y **La Floresta no cultiva Gesha**: su propio campo
  `Variedades / %` dice «Castillo 90%, colombia 10%». Un Gesha no puede salir de ahí. Todo lo demás señala a
  **La Fortaleza** (Ragonvalia, Norte de Santander, **1 700 m**): el título dice «(Ragonvalia)», `Supplier Name`
  es «La Fortaleza / Wilmer R», el **RUT adjunto a la finca La Fortaleza es de Wilmer Rodríguez**, y el propio
  datasheet del lote se llama `La_Fortaleza_Wilmer_R_Gesha_Ragonvalia…`. Y se explica solo: **las dos fincas
  cuelgan del mismo proveedor** en Notion, que es exactamente cómo se escoge la equivocada en un desplegable.
- The four empty stubs (Cenicafe 1 · Castillo [La Hacienda] · Chiroso [Los Toro] · Caturra [Los Toro]) have no
  SCA, variety, process or notes at all — only #7 is used, the rest are left alone.

**Never copied from Notion onto a card:** `Verde/Pergamino Precio Pre-Acordado (COP/Carga)` (#3 carries 28 000)
· `Harvest Availability Quantity (kg)` · **`Supplier Name`** (it holds a person's name — «Wilmer R» — and the
public view exposes the finca, never the producer) · `Density` · `Factor de Rendimiento` · `Humidity %` ·
`Water Activity` · `CVA` · the Google-Drive datasheet links · and the internal `[Proveedor] 2026_1` naming
convention (card names are cleaned to «Variedad · Proceso»).

**Files and PDFs checked (as asked):** every populated ficha links a Google-Drive datasheet spreadsheet + its
folder, but those per-lot sheets are **not reachable from the `ctcexportmain` Drive** (the API returns "not
found" — another account or a shared drive), so the card data comes from the Notion properties. Only
«Gesha (Ragonvalia)» carries Notion attachments: **`Gesha_CTCX_0326005_Datasheet.pdf`**, a scanned
**`Form_calificacion_muestra.jpeg`** (the SCA scoring form) and two CSV exports. The master template
**«[FE] Green Coffee Datasheet»** (Drive `1ANtP8xNPmo3hM9n6crlXyLyJJeY903_A_Hlf7dW-Ju4`) was **sampled for its
field labels only** (not read end to end) and its vocabulary matches the platform's `ficha_*` columns:
Variety · Process · Humidity · Density · Water Activity · the eight SCA sub-scores (Fragrance, Flavor,
Aftertaste, Acidity, Body, Balance, Uniformity, Sweetness) · Malla · Notas · CTCX lot codes. That
`CTCX_0326005` is the house lot-code shape: mock cards reuse the real code where a ficha has one (#3) and
otherwise carry a `GD-/BL-/RD-/BK-XXXX` code in the same shape `listingCode()` produces.

Assets: photos (optional) from `reference_kr-mock-profile-data/Finca/*.jpg` and `reference_images/`, resized to
the card size into `public/images/catalogo/sneak-peek/`; when a lot has no photo the card shows the grade seal
(`public/images/shared/grados/<grade>.webp`, 420×420, from `GRADOS[].logo`).

### 1.4.1 The mock flag — one file, one flag, one deletion

The owner's requirement: *"make sure they are flagged internally as such to have them easily removed when the
time comes"*. Four layers, so removal is never archaeology:

1. **One file holds every mock**: `src/lib/catalogo/sneakPeekMock.ts`. Its header states, in one paragraph, that
   the file is temporary, why it exists (no lot has finished KR → Arena yet), where the data came from (the
   Notion database above, read 2026-08-17), and the **removal recipe**: delete this file, delete its single
   import in `sneakPeek.ts`, run the gate. Nothing else references it.
2. **Every entry carries `mock: true`** and an id in the reserved namespace `mock-lote-01 … mock-lote-07`, so a
   mock can never collide with a real `lot_id` (a UUID) and any log line or DOM node is greppable for `mock-lote`.
3. **The API payload is honest**: `source: "live" | "mixed" | "mock"` on the envelope, `mock` on each item —
   the «Temporada anterior» tag is data-driven, not hard-coded in the component, so mocks cannot render
   untagged.
4. **The guardian enforces it**: `qa-sneak-peek-check.mjs` fails if a mock entry lacks `mock: true` or the
   season tag, if a mock id escapes the namespace, or if any file other than `sneakPeekMock.ts` contains a
   `mock-lote` literal. **Self-retiring by design**: mocks are dropped automatically as live lots arrive
   (§1.3), so the day the file is deleted the band simply shows fewer cards until the catalogue fills.
   If the mocks ever graduate to the DB (D0.6), the table carries `is_mock boolean not null default false` and
   removal is one `DELETE … WHERE is_mock`.

### 1.5 The component — a FLIP card (owner, 2026-08-17)

`src/components/catalogo/SneakPeek.tsx` (+ `SneakPeek.module.css`), a **client** component. The card has two
faces and turns on click:

**Front — what makes someone look.** The photo (the card leads with it), the lot name, the grade as a chip in
its official colour, and the variety. The season tag sits **on the photo** for mock lots, so "last season" is
read before anything else. A quiet «Ver detalle +» pinned at the bottom says the card opens.

**Back — the rest, plus the file.** Name + a close ×, the **SCA** score (labelled, with «est.» when the score
is the producer's own), finca · municipio, departamento, process · altitude, the cup notes, and a
**«Ver ficha técnica ↗»** button that opens the lot's datasheet in a new tab.

Mechanics that matter:
- **The band stops while a card is open.** Otherwise the detail someone just opened slides off the screen.
  Hover and keyboard focus already paused it; an open card pauses it outright.
- **The loop's second copy stays clickable but unfocusable** (`tabIndex={-1}`, inside the `aria-hidden`
  clone). Making it inert would leave half the band dead to the mouse; leaving it focusable would put
  focusable content inside `aria-hidden`, which is an accessibility fault. Both copies share one flip state
  keyed by lot id, so a card and its clone turn together.
- **Escape closes** the open card, and the ficha link `stopPropagation`s so opening the PDF does not flip the
  card back.
- `prefers-reduced-motion`: the band becomes a draggable strip **and** the turn loses its animation — the
  faces just swap. Same outcome, no movement.
- Props: `lang` (the value, not a hook — see below), `variant` (`home`/`kr`/`cp`), `onOpenLogin` (CP
  surfaces), `id` (the store passes `grados`, the anchor it inherits from the grid).
- The language arrives **as a prop** because Home/KR and the Cherry Picked family have different providers
  with the same union; that is what makes the module mountable on all six surfaces.
- Empty or failed → renders nothing. Never an empty bar.

### 1.5.2 Second round of owner changes (2026-08-17, V4.19)

- **Edge arrows.** A button on each side; hovering or focusing it **accelerates** the band that way
  (150s → 24s per lap), the left one by reversing direction. They are an accelerator, not a carousel — the
  band never stops being a band. Clicking also nudges `scrollBy`, which is what makes them useful under
  `prefers-reduced-motion`, where the band is a draggable strip with no animation to speed up.
- **The cupping wheel on the back.** Each card now closes with the **extract of its Reporte de Catación**:
  the lot's descriptors lit on the SCA flavour wheel, everything else faded to 10 %. Generated by
  `scripts/build-ruedas-mock.mjs` **driving the house tool** (`public/tools/rueda-catacion.html`) rather than
  drawing a second wheel — a parallel wheel would drift from the real one at the first taxonomy change, which
  is exactly the mistake the grade scale already cost this repo. Two variants per lot: labelled for the PDF,
  label-free for the card (at 222 px a 11 px label is noise).
- **The datasheet is now 3 pages and «red taped»** — see §1.5.1.
- **«Ver el catálogo completo» opens a window**, it no longer just navigates: it explains that the band is a
  peek, that the full catalogue lives inside Cherry Picked, and that **registering is free**. Two actions —
  create an account, or sign in (on CP surfaces the second opens the login without navigating). The link keeps
  a real `href` so it can still be opened in a new tab and followed by a crawler.

### 1.5.3 Third round (2026-08-17, V4.20)

- **The band runs to the RIGHT by default** and its engine is no longer a CSS animation. With `@keyframes`
  the browser restarts the animation whenever duration or direction change — that was the jump on hovering an
  arrow. The position is now driven by `requestAnimationFrame` over a `translate3d`: the speed **chases** its
  target (17 px/s at rest, 155 while an arrow is hovered, negative to the left), so accelerating and releasing
  are continuous. Measured in real Chrome, not in the preview pane, which does not even run rAF.
- **Clicking a card centres it first, then flips it, and it pops 15 %.** The engine takes a target position
  instead of a speed, picks the nearer of the card's two copies (the strip is duplicated), and only calls the
  flip on arrival. ⚠️ The loop must **not** wrap the position while it is chasing a target — wrapping fought
  the chase and the card never arrived, so it never flipped. Verified: 0 px off centre, scale 1.15.
- **Page 2 of the ficha gained the «Análisis Intrínseco»**: the ten SCA form attributes as a radar, with the
  physical attributes compacted into two columns above it.
- **The missing analytical data is now filled in** (owner: *"make it up for the sake of completeness"*).
  Humidity, water activity, density, yield factor, screen, defects and the ten attributes live in
  `scripts/lib/analisis-intrinseco.mjs`, which states in its header that they are **invented on purpose**.
  They are built to be plausible, not true: the ten attributes **sum exactly** to the lot's real SCA score
  (the one thing a Q-grader checks at a glance), uniformity/clean cup/sweetness sit at 10 as in a defect-free
  cup, and the rest is distributed by the lot's character. What is NOT invented: the total score, variety,
  process, farm and cup notes — those come from Notion. The MUESTRA stamp is what keeps the difference legible.

### 1.5.4 The two faces, as the owner drew them (2026-08-17, V4.21)

The owner sent front/back mockups; the card was rebuilt to match, and the split is not decorative — **the
front identifies the lot, the back explains it**.

- **Front** = the lot's ficha: the photo with **«Ver detalle +» laid over its top-right corner** and the
  season tag bottom-left; the name; `variedad · altitud`; the cup notes; and a foot line with the **grade
  seal at 72 px** facing the **SCA score, the finca and the municipio** right-aligned. The seal is back
  because at that size it reads — the illegible grey blob was the 36 px one of the first version.
- **Back** = the analysis: name + ×, the **«Análisis Intrínseco» radar** (the ten SCA form attributes), the
  **«Ver ficha técnica» button centred** between the two graphics, and the **cupping wheel** at the foot.
  Score, origin and cup notes are gone from here — they live on the front now.
- The radar is drawn **in React** (`RadarIntrinseco.tsx`), not generated as an SVG like the wheel, because its
  labels are text and the card speaks three languages: a static SVG would mean 21 files (7 lots × 3 languages)
  regenerated on every wording change. It shares `ATRIBUTOS_SCA` with the PDF version so both figures match.
- ⚠️ **The trap this cost:** `RadarIntrinseco` is a client component and importing a **value** from
  `lib/catalogo/sneakPeek.ts` (which is `server-only`) dragged Supabase and `next/headers` into the browser
  bundle — the whole page 500'd. Type-only imports are free; value imports are not. The list now lives in
  `src/lib/catalogo/atributosSca.ts` with no `server-only`, and the guardian checks it stays that way.
  **`tsc --noEmit` does not catch this** — the dev server did.

### 1.5.1 The datasheets («Ver ficha técnica»)

`SneakPeekLot.datasheetUrl` is optional and the button only exists when it is set.

- **Mock lots**: a **three-page** A4 PDF each (owner, 2026-08-17), generated by **`scripts/build-fichas-mock.mjs`** (same spirit as
  `build-og-cards.mjs`: a workshop script that makes a static asset and is re-run when the data changes).
  Page 1 the lot summary, page 2 the **Ficha de café verde** (physical and analytical attributes; anything
  unknown says «— sin dato» and is **never invented** — a made-up humidity in an official-looking document is
  exactly the number someone quotes later), page 3 the **Rueda de catación** with the lot's wheel and its
  descriptors. All three pages are **«red taped»**: a red diagonal ribbon («Muestra · no es oferta comercial»)
  plus a MUESTRA watermark, so a loose ficha cannot circulate as if it were a live offer. It renders the
  *same* fields the card shows — nothing commercial — plus a **«Documento de referencia»** notice.
  Output: `public/docs/fichas-mock/<code>.pdf`.
- **Where they live is not cosmetic**: `public/docs/` is one of the three prefixes the proxy matcher excludes
  (`images/`, `docs/`, `tools/`). A new top-level folder would 404 on all 18 subdomains — the classic trap of
  this house. The guardian asserts every `datasheetUrl` starts with `/docs/`.
- **Live lots have no datasheet yet**: neither `lots` nor `lot_listings` has a column for one, so the button
  simply does not render for them. Giving real lots a datasheet is dev to-do 2 in §9.
- Card photos live in `public/images/catalogo/sneak-peek/mock-lote-NN.webp` (660×440, ~55 KB each, 382 KB the
  set). They are CTC's own photographs illustrating the process or the landscape — **not** photographs of that
  particular lot, which do not exist; the whole card is flagged as last season. A lot with no photo falls back
  to its grade seal, which never fails.

### 1.6 Decisions for step 0 — ALL ACCEPTED by the owner on 2026-08-17 ("defaults on all D0.x")

- **D0.1 Placement** — ✅ accepted: the slots in §1.1, now five surfaces (Home · KR · CP portada · CP Green ·
  CP Roast/X). The owner may still nudge them visually on the first preview.
- **D0.2 Live vs mock** — ✅ accepted: live first, pad with mocks up to 7, mocks always tagged, mocks retire by
  themselves at ≥ 7 live lots.
- **D0.3 Fields on the card** — ✅ accepted: the list in §1.5, nothing commercial.
- **D0.4 Click destination** — ✅ accepted: Home & KR → Cherry Picked portada (subdomain-absolute in prod via
  `origenDeSuperficie`, relative in dev — the proxy-prefix gotcha); on the CP surfaces the card opens the login
  modal. Mock cards behave the same (they sell the login too).
- **D0.5 Gate the full catalogue behind login** — ✅ **accepted as (a), and extended by the owner to every CP
  landing**: the Sneak Peek *replaces* the direct catalogue for logged-out visitors; the real Catálogo Activo
  exists only behind the login. Consequence to keep in mind: the Green grid stops being crawlable (the portada,
  the grade fichas and the Sneak Peek itself stay indexable), and prices leave the public internet — which was
  the point.
- **D0.6 Mock storage** — ✅ accepted: static TS constant now (`sneakPeekMock.ts`); the `catalog_showcase` table
  + OCP tab stays a later option.
- **D0.7 Grade ladder** — ⚠️ **superseded by the real references** (§1.4): the Notion fichas give
  **3 Gold · 3 Blue · 1 Black** (2/2/2/1 hasta la corrección de escala del 2026-08-19), not 1/3/2/1.
  Real data wins; no new decision needed. ⚠️ Con la escala corregida **no queda ningún Red en la cinta**.
- **D0.8 Which season is "last season"** — ✅ accepted: «cosecha principal 2025-26 (venta abr–jul 2026)», which
  Notion's own `Harvest Season` (2025-Q4 / 2026-Q1) corroborates.

- **D0.9 Bourbon vs Castillo (card #2)** — ✅ resuelta por el owner el 2026-08-19: **Bourbon**, el título manda.
- **D0.10 La Floresta vs La Fortaleza (card #3)** — ✅ resuelta el 2026-08-19 **por prueba**: La Floresta no
  cultiva Gesha. Ver el registro de decisiones y §9 punto 5-bis.

**Ninguna de las dos cambió un valor**: las tarjetas ya mostraban Bourbon y La Fortaleza, así que el diff de
`sneakPeekMock.ts` es SOLO comentarios y **no hizo falta regenerar** ni las ruedas ni las fichas PDF.

### 1.7 Definition of done, verification, version

- Files: `src/lib/catalogo/{sneakPeek.ts,sneakPeekMock.ts}`, `src/app/api/catalogo/sneak-peek/route.ts`,
  `src/components/catalogo/SneakPeek.tsx` + `.module.css`, images, and **six mount points** (Home · KR Landing ·
  CP portada · CP Green · CP Roast · CP X), of which Green is a *replacement* of the anonymous catalogue view.
- New guardian `scripts/qa-sneak-peek-check.mjs`: (1) the `SneakPeekLot` type has no price-shaped key
  (regex over the mapped keys); (2) the API route selects from `public_lot_catalog` and never from `lots`/`fincas`/
  `lot_listings` except the `status` filter; (3) the mock set has exactly 7 entries, all `mock: true`, ids inside
  `mock-lote-NN`, grades matching the ladder derived from each SCA, **no `tyrian`**, and every grade consistent
  with its score under `gradoDeSca()`; (4) each mock has non-empty name/finca/departamento/variety/process/cup
  and a season tag in the three languages; (5) no file other than `sneakPeekMock.ts` contains a `mock-lote`
  literal; (6) `CherryPickedExperience` does not call `loadCatalog()` without a `userId` (the D0.5 gate).
  Run in the gate.
- Manual: `npm run dev` → `/`, `/kaffetal-regal`, `/cherry-picked` render the band; DevTools network shows one
  `sneak-peek` call; kill the API → the band disappears, the pages don't. Reduced-motion emulation → static row.
- Docs: Log V36 entry; HANDOFF § CTC Home + § Cherry Picked; DICT «Sneak Peek», «Mock lote».
- **PR "Sneak Peek" → `APP_VERSION 4.16`.** Owner action after merge: send the real references → one follow-up
  commit overwrites the ⟂ cells (no version bump needed unless something else ships with it).

---

## 2. Step (i) — Freeze names (F1 · F9 · A7 · A1)  → V4.23  ✅ DONE 2026-08-18

A small PR that changes **strings and docs only** — no route moves, no file renames.

| Term | Frozen meaning | Where it changes |
|---|---|---|
| **BCP · Base Control Panel** | «El negocio: dirección, configuración y red de socios» (mission word on the PDF: *Business*) | `consoles.ts` `name`/`tagline`; the header comment block; `ControlPanelLanding` reads `consoles.ts` — nothing to do |
| **OCP · Operational Control Panel** | «La operación: del productor al catálogo» (*Operation*) | idem |
| **ECP · Executive Control Panel** | «La ejecución: plataformas, contacto y caja de herramientas» (*Execution*) — the acronym keeps *Executive* (F1) | idem |
| **selector de consolas** | `/panel` (was called "hub") | HANDOFF, comments, `/panel` page copy |
| **portada de Cherry Picked** | `/cherry-picked` (`HubLanding.tsx` keeps its filename; the word "hub" leaves copy/docs) | HANDOFF, comments |
| **hub** | reserved for **CommaaS** | everywhere else the word disappears |
| **CaaS · Coffee as a Service** vs **CommaaS** vs **CommaaS-OG** | CTC's outlet · the owner's personal deployment hub · the original app as a tenant | DICT (already logged for V36) |
| **CTC Selection** / **Black Stock** | umbrella (any grade bought outright) / its Black-grade branch (F4) | DICT + this plan; code in step (iii) |
| **Catálogo Cherry Picked (Contratos Vigentes)** | the pre-sold contract lots — the model that feeds the Green store | DICT; nav label in step (ii) |
| **Active Catalogue Sneak Peek** | §1 | DICT (step 0) |
| **Value Ecosystem** | the six ECP platforms (CTC Tech, Varietales, Directorio, Coffeed, Herramientas, Terratalento) as the 4th unit of Definición de contexto (F7) | DICT; code in step (iii) |

### 2.1 What to actually edit (measured 2026-08-17)

1. **`src/lib/panel/consoles.ts` — the three taglines.** They still carry the old one-liners. Replace:
   - BCP `"Identidad y pasaporte del lote"` → **`"El negocio: dirección, configuración y red de socios"`**
   - ECP `"Dirección: precios, primas, finanzas, salud de la red"` → **`"La ejecución: plataformas, contacto y caja de herramientas"`**
   - OCP `"Operación: despacho, seguimiento, excepciones, relevos"` → **`"La operación: del productor al catálogo"`**
   ⚠️ The taglines describe the **target** layout, so after this PR they describe modules that have not moved
   yet (§3 moves them). That is deliberate and worth one line of comment in the file — otherwise the next
   reader "fixes" them back.
   `ControlPanelLanding` reads `consoles.ts`, so the public console landing follows for free.
2. **The word «hub»** — reserved for CommaaS (F9). **58 occurrences in `src/**/*.ts(x)`** (excluding
   `HubLanding`/`cherry-picked-hub`/`github`) and **48 in `docs/*.md`**. Nearly all are comments and copy.
   The two meanings to rewrite: the Cherry Picked front page → **«portada de Cherry Picked»**, and `/panel` →
   **«selector de consolas»**. `HubLanding.tsx` **keeps its filename** (D2.1) — renaming a component is a
   different PR and would collide with §3.
3. **The DICT** of the interactive docs gets the frozen terms: CaaS vs CommaaS vs CommaaS-OG, CTC Selection
   vs Black Stock, «Catálogo Cherry Picked (Contratos Vigentes)», «Active Catalogue Sneak Peek», Value
   Ecosystem. ⚠️ Read `reference_dict_wrap_gotcha` first — the DICT mixes `clave:{` and `clave: {`, and a
   naive grep "proves" an entry is missing and you add a silent duplicate (JS keeps the last).
4. **The «planned» warnings** in the architecture map (`direccionamiento`, the PDF's ANN) get a pointer to
   this file, and `docs/ESTADO_Y_PREGUNTAS_2026-08-17.md` §0 gets a line: "F14(i) done → V5_CONSOLAS_PLAN.md".

### 2.2 Definition of done for step (i)

`grep -rn «hub» src docs` returns only CommaaS references (plus the untouched filenames) · the three
taglines read as above · `qa-nav-check` still 18/18 (it reads `consoles.ts`) · gate green · `APP_VERSION`
4.23 · Log entry sealed · this file's §7 ticked.

**✅ Met on 2026-08-18, with the scope sharpened by what the measurement actually found (D2.2 below).**
The «58 in src / 48 in docs» estimate counted three things that are not the word: the Spanish `hubo`
(from «haber»), the substring inside `github`, and — the big one — **code identifiers**. The real work
was **39 rewrites in `src/`** and **30 in `docs/`**, and the word turned out to carry **five** distinct
senses, not the two the table above anticipated:

| Sense | Was | Now |
|---|---|---|
| Cherry Picked's front page | «el hub» | **«la portada de Cherry Picked»** |
| `/panel` after the master login | «the console hub» | **«el selector de consolas»** |
| Kaffetal Regal's producer dashboard | «el hub del productor» | **«el panel del productor»** (its tiles are «la rejilla») |
| CTC Home as the centre of the network | «el hub» | **«la casa matriz»** — the term `src/app/page.tsx` already used |
| Notion's own top-level spaces | «los hubs de Notion» | **«los espacios de Notion»** |
| CommaaS | «hub» | **«hub»** — the reserved meaning, untouched |

Two things this section did NOT say, now settled as D2.2: identifiers stay, and the sealed
`Log_Documentacion_Interactiva_V*.txt` stay.

---

## 3. Step (ii) — Nav + route moves, console by console, with 308s (F2)  ✅ DONE 2026-08-18 (V4.24–V4.26)

### 3.1 The target map (exact hrefs from `consoles.ts` and the route tree)

Legend: **stay** = same route · **←** = moves in from another console (old path becomes a 308 stub) ·
**→** = leaves · **NEW** = built in step (iii), only a placeholder card/tab in step (ii) if at all.

**BCP · Base Control Panel** — «El negocio: dirección, configuración y red de socios»

| Group | Module | Target route | Today | Note |
|---|---|---|---|---|
| — | Panel | `/bcp` (exact) | `/bcp` (passport KPI dashboard) | dashboard content is **rewritten** as a direction dashboard; today's KPI cards move with the passport to `/ocp` |
| Business Core | Direccionamiento | `/bcp/direccionamiento` (+ `/grados`) | `/ecp/direccionamiento` (+ `/grados`, `/plataformas`) | ← ECP. `/plataformas` does **not** come along (F6, see ECP). Old `/ecp/grados` stub repointed to `/bcp/direccionamiento/grados` (no chain) |
| Configuración del Sistema | Usuarios y credenciales | `/bcp/usuarios` · ownerOnly | `/ecp/usuarios` | ← ECP |
| | Documentación del sistema | `/bcp/documentacion` (+ `/[file]`) | `/ecp/documentacion` | ← ECP · ⚠ **`next.config.ts` `outputFileTracingIncludes` keys must change** or the module is empty in prod |
| | Mapa de Trabajo | `/bcp/mapa` · ownerOnly | `/ecp/mapa` | ← ECP |
| | Consumo de IA | `/bcp/consumo` | `/ecp/consumo` | ← ECP |
| | Automatizaciones | `/bcp/automatizaciones` | `/ecp/automatizaciones` | ← ECP |
| | GVG-Space | `/bcp/gvg` (+ `/cv`) · ownerOnly, own lock | `/ecp/gvg` | ← ECP (F13; → CommaaS later) |
| Red de Socios | Socios de la red (credenciales) | `/bcp/socios` · ownerOnly | `/ocp/socios` | ← OCP |
| | Estudio de Contenido · Centro de Calidad · Agente de Carga · Agente de Nacionalización · Master Roaster | `/bcp/socios/<nodo>` | — | **NEW** (F3, step iii) |
| *leaves* | Club, Catálogo, Black Stock, CRM CaaS, Productores, Fincas, Lotes, Nominados, Arena, Galardonados (+ Contratos, Subastas) | → OCP | | |

**OCP · Operational Control Panel** — «La operación: del productor al catálogo»

| Group | Module | Target route | Today | Note |
|---|---|---|---|---|
| — | Panel | `/ocp` (exact) | `/ocp` (module cards) | receives today's `/bcp` KPI dashboard (fincas pending, lots, arena, humedad) |
| Kaffetal Regal | Productores | `/ocp/productores` | `/bcp/productores` | ← BCP |
| | Fincas | `/ocp/fincas` (+ `/[id]`) | `/bcp/fincas` | ← BCP · `?status=pending_review` deep link moves too |
| | Lotes | `/ocp/lotes` | `/bcp/lotes` | ← BCP |
| KR Arena | Nominados | `/ocp/nominados` | `/bcp/nominados` | ← BCP |
| | Arena | `/ocp/arena` (+ `/[sessionId]`, `/temporadas`) | `/bcp/arena` | ← BCP |
| | Galardonados | `/ocp/galardonados` | `/bcp/galardonados` | ← BCP |
| | Kaffetal Club | `/ocp/club` (+ `/campanas`) | `/bcp/club` | ← BCP |
| Catálogo | Catálogo Cherry Picked (Contratos Vigentes) | `/ocp/catalogo` | `/bcp/catalogo` | ← BCP · label gains «(Contratos Vigentes)» |
| | *(tabs of Catálogo)* Contratos · Subastas Tyrian | `/ocp/contratos` (+ `/[id]`, `/humedad`) · `/ocp/subastas` | `/bcp/contratos`, `/bcp/subastas` | ← BCP · not rail entries today, stay that way |
| | Black Stock & CTC Selection | `/ocp/black-stock` in step (ii) → becomes a tab of `/ocp/ctc-selection` in step (iii) (stub repointed then) | `/bcp/black-stock` | ← BCP · F4 |
| Cherry Picked (CRM CP) | CRM CP CaaS | `/ocp/crm/caas` | `/bcp/caas` | ← BCP · `leadsActions.ts`: `PILLAR_CONSOLE.cocreate` `"bcp"` → `"ocp"`, `PILLAR_BOARD_PATH.cocreate` → `/ocp/crm/caas` |
| | CRM CP Green · Roast · X | `/ocp/crm/green` · `/ocp/crm/roast` · `/ocp/crm/x` | — | **NEW** (F5, step iii) |
| *leaves* | Leads · Recepción → ECP Contacto · Socios → BCP · Cotizadores ×3, Anclas, Transcripciones → ECP Toolbox | | | |

**ECP · Executive Control Panel** — «La ejecución: plataformas, contacto y caja de herramientas»

| Group | Module | Target route | Today | Note |
|---|---|---|---|---|
| — | Panel | `/ecp` (exact) | `/ecp` | dashboard cards updated |
| Plataformas | Manejo de Plataformas | `/ecp/plataformas` (standalone, F6) | `/ecp/direccionamiento/plataformas` + rail shortcut | page moves out of Direccionamiento; the shortcut disappears (it *is* the module now); `qa-nav-check`'s "no `/ecp/plataformas`" assertion is inverted on purpose |
| | Directorio del Café · Coffeed · Herramientas del café · Terratalento | `/ecp/directorio` · `/ecp/coffeed` · `/ecp/herramientas` · `/ecp/terratalento` | same | **stay** |
| Contacto | Buzón de entrada | `/ecp/buzon` | same | **stay** |
| | General Leads · Recepción | `/ecp/leads` | `/ocp/leads` | ← OCP · the per-console leads gate lives in `src/app/ocp/(app)/leadsActions.ts` (`PILLAR_CONSOLE.general` `"ocp"` → `"ecp"`, `PILLAR_BOARD_PATH.general` → `/ecp/leads`); the file itself moves with the module |
| | CRM CTC Tech · CRM Varietales | `/ecp/ctc-tech` · `/ecp/varietales` | same | **stay** |
| Internal Toolbox | Lotes de café · Logístico · Costo de empaque | `/ecp/cotizador-lotes` (+ `/[id]`) · `/ecp/cotizador-logistico` (+ `/[id]`) · `/ecp/cotizador-empaque` (+ `/[id]`, `/evaluacion`) | `/ocp/cotizador-*` | ← OCP · `requireConsoleWrite("ocp")` → `"ecp"` in their actions |
| | Anclas de mercado | `/ecp/anclas-mercado` | `/ocp/anclas-mercado` | ← OCP · the daily cron writes the table, not the route — check its `revalidatePath` |
| | Transcripciones | `/ecp/transcripciones` (+ `/[id]`) | `/ocp/transcripciones` | ← OCP · the local worker and AssemblyAI callback hit `/api/transcripciones/*`, unchanged; only the console page moves — but `/api/transcripciones/descargar` gates on `requireConsoleWrite("ocp")` → `"ecp"` (verified call sites today: `lib/anclas/actions.ts` ×4, `lib/cotizador/actions.ts` ×15, that route ×1) |
| *leaves* | Direccionamiento (+ grados) · Usuarios · Documentación · Mapa · Consumo · Automatizaciones · GVG-Space → BCP | | | |

Rail rules kept: `ownerOnly` flags travel with the link; `exact` on every Panel; `hrefActivoDelRail` needs no
change (segment-boundary + longest-wins already handles `/ocp/crm` vs `/ocp/crm/caas` if a group page exists).

### 3.2 Blast radius (measured 2026-08-17)

Hard-coded console paths outside `consoles.ts`: **`/bcp/` 127 · `/ecp/` 57 · `/ocp/` 34** occurrences in
`src/**/*.{ts,tsx}`; **20 files** call `revalidatePath("/bcp|/ecp|/ocp…")`.

> **⚠️ RE-MEDIDO EL 2026-08-18, antes de PR-A — los números de arriba se quedaron CORTOS.** Se dejan como
> estaban para que se vea la diferencia. Lo real, contando solo rutas dentro de literales de cadena:
>
> | | plan (2026-08-17) | real (2026-08-18) |
> |---|---|---|
> | ocurrencias `/bcp/` · `/ecp/` · `/ocp/` | 127 · 57 · 34 = **218** | 189 · 69 · 46 = **304** |
> | archivos con `revalidatePath` de consola | 20 | **29** |
>
> Y el número que de verdad importa para la mudanza no estaba: **solo hay 47 rutas DISTINTAS** repartidas en
> **66 archivos**. Eso es el tamaño del mapa de destinos; las ~300 ocurrencias son repetición. El reparto por
> tipo de uso explica dónde está el riesgo: **`revalidatePath` 108** (casi la mitad), `consoles.ts` 40,
> `href=` 27, `redirect()` 5, `router.push()` 1, y ~53 en mapas y arreglos de rutas (`ENTITY_HREF`, `PATHS`).
>
> **La lección, para PR-B y PR-C**: el grueso NO son enlaces, son `revalidatePath`. Un enlace roto se ve al
> primer clic; un `revalidatePath` a una ruta que ya no existe **no lanza, no avisa y no rompe el build** —
> deja al operador mirando datos rancios después de guardar. Ese es exactamente el fallo que la comprobación
> (c) de `qa-rutas-consolas.mjs` existe para cazar, y por qué el guardián corre en la compuerta y no "cuando
> haga falta". Plus: the three console dashboards,
`EstructuraModal.tsx` (`PanelDiagram`), `qa-nav-check.mjs`, `next.config.ts` (documentación), any email template
that links into a console (grep `ctcexport.com/bcp` and `"/bcp/` in `src/lib/email`), the KR next-step API,
and the docs DICT/FILETREE. It is mechanical but wide — which is exactly why each console is its own PR and why
the guardian in §3.4 exists.

### 3.3 The order of the three PRs (default)

| PR | Version | Receives | From | Size |
|---|---|---|---|---|
| **PR-A «OCP recibe el pasaporte»** ✅ | **4.24, DONE 2026-08-18** | Productores, Fincas, Lotes, Nominados, Arena, Galardonados, Club, Catálogo (+Contratos, Subastas), Black Stock, CRM CaaS (→ `/ocp/crm/caas`); the KPI dashboard | BCP | biggest — 12 modules, 154 route literals, 66 files |
| **PR-B «BCP recibe dirección y configuración»** ✅ | **4.25, DONE 2026-08-18** | Direccionamiento (+grados), Usuarios, Documentación, Mapa, Consumo, Automatizaciones, GVG-Space; Socios de la red | ECP, OCP | medium; touches `next.config.ts` |
| **PR-C «ECP recibe contacto y toolbox»** ✅ | **4.26, DONE 2026-08-18** | Leads, Cotizadores ×3, Anclas, Transcripciones; Manejo de Plataformas standalone | OCP, own | medium |

Between PR-A and PR-B the BCP rail is briefly just «Panel» — acceptable, the owner is the only operator; the
alternative order B → A → C ("no console ever empty") is fine too if preferred. **After PR-C: Version Wrap V37**
of the interactive docs (the FILETREE and node map change shape).

### 3.4 The per-move checklist (repeat per module, tick in the PR description)

1. `git mv src/app/<old>/(app)/<mod>` → `src/app/<new>/(app)/<mod>` (sub-routes come along).
2. Leave **stubs** at the old paths: `page.tsx` → `permanentRedirect(destino)`, and for `[id]`/`[sessionId]`
   sub-routes a stub that forwards the param. Consoles live on `www` (not on a subdomain), so **relative
   destinations are correct** here — unlike the Class B landings, where the proxy prefixes the subdomain base and
   the destination must be absolute (`co-create/page.tsx` documents that trap). Verify once in prod.
3. **Single source for the moves:** `src/lib/panel/rutasMovidas.ts` exporting `RUTAS_MOVIDAS: { de: string; a: string }[]`
   and `destinoDe(old)`. Stubs are one-liners over it; the guardian (§3.5) reads it; HANDOFF lists it once.
4. `consoles.ts`: href, group, label; preserve `ownerOnly`/`exact`; header comment updated to the frozen names.
5. Gates: the `(app)/layout.tsx` of the destination already runs `requireConsoleAccess("<new>")` — nothing to
   do for pages. Actions that call `requireConsoleWrite("<old>")` → `"<new>"`. Actions still on the coarse
   `requireActiveAdmin` keep it in this PR (**no behaviour change in a mechanical PR**); tightening the passport
   actions to `requireConsoleWrite("ocp")` is a follow-up line in §9.
6. grep + replace every hard-coded old path: `<Link href>`, `redirect(`, `router.push`, `revalidatePath(`,
   `href:` in dashboards/KPIs, email templates, API routes, `EstructuraModal.tsx`. The guardian fails on any
   survivor.
7. `next.config.ts` `outputFileTracingIncludes` (PR-B only, documentación).
8. Console dashboards (`/bcp`, `/ocp`, `/ecp` pages) reflect their new module set.
9. `qa-nav-check.mjs`: update the Manejo de Plataformas assertions in PR-C (the module *is* standalone now).
10. Docs: Log V36 entry (sha), HANDOFF map, DICT; `EstructuraModal` diagram; robots rules unchanged (`/bcp|/ecp|/ocp` are already disallowed).
11. Gate (§0) + `qa-guard-check`, `qa-boards-check` (leads), `qa-transcripciones-check` (PR-C), `qa-anclas-check` (PR-C), `qa-consumo-check`/`qa-direccionamiento-check`/`qa-docs-check` (PR-B).

### 3.4 bis — Lo que PR-A añadió a la receta (2026-08-18)

Cuatro cosas que el checklist no decía y que PR-B y PR-C van a necesitar:

1. **Los talones van FUERA del grupo `(app)`.** Dentro, el `layout.tsx` corre `requireConsoleAccess("<vieja>")`
   y quien llegue por un marcador viejo se come un «no tiene acceso» sobre una URL que ya no existe. Fuera del
   grupo redirigen primero y deja que la consola destino haga de portero. Y **un `[[...resto]]` opcional por
   módulo basta**: cubre la ruta y todas sus sub-rutas con UN archivo, con `destinoDe()` reconstruyendo la cola
   (verificado en servidor real: `/bcp/arena/abc123` → 308 → `/ocp/arena/abc123`).
2. **Un `git mv` de módulo deja imports relativos rotos que `tsc` NO ve**: los `*.module.css` no se
   type-chequean, así que un `../shared.module.css` que ya no existe pasa `tsc --noEmit` limpio y muere en el
   build. Tras cada `git mv`, buscar imports relativos que crucen el límite del módulo movido.
3. **`shared.module.css` salió de `bcp/(app)/` a `src/components/panel/`** (62 imports reapuntados). No era un
   activo del BCP: lo importan las tres consolas y `src/components/`. Dejarlo en una consola que se estaba
   vaciando era una señal falsa de propiedad. Si PR-B o PR-C encuentran otro archivo compartido aparcado
   dentro de una consola, mismo trato.
4. **`adminLockActions.ts` se QUEDA en el BCP** aunque su llamador (`arena/[sessionId]/SessionFunnel.tsx`) se
   fuera al OCP: es la cerradura de administrador, y PR-B le trae Usuarios al lado. Import cruzado por alias,
   que es lo que ya hacían 29 archivos.

### 3.4 ter — Lo que PR-B añadió a la receta (2026-08-18)

1. **Un `git mv` de un módulo se lleva a sus hijos, incluidos los que NO se mudan.** `direccionamiento/` viajó
   entero al BCP con `plataformas/` dentro, que debía quedarse en el ECP (F6). Hubo que devolverlo. Antes de
   mover un módulo con sub-módulos, mire si TODOS viajan.
2. **Cuando una sub-ruta se queda, el talón del padre NO puede ser un `[[...resto]]`** — chocaría con la página
   que sigue viva. Va explícito, y la excepción se declara en `NO_SE_MOVIERON` dentro de `rutasMovidas.ts`,
   que es también de donde la lee el guardián. Verificado en servidor real: `/ecp/direccionamiento` → 308 al
   BCP, y `/ecp/direccionamiento/plataformas` → 307 a `/login`, o sea que llega a su página y no al talón.
3. **Un talón viejo se REAPUNTA, no se encadena.** `/ecp/grados` (2026-08-10) ya apuntaba a Direccionamiento;
   ahora va directo a `/bcp/direccionamiento/grados`. Además pasó de `redirect` (307) a `permanentRedirect`
   (308) y salió de `(app)`, como todos los demás.
4. **Una tira de pestañas no puede cruzar dos consolas.** «Manejo de Plataformas» salió de
   `DireccionamientoTabs`: su módulo se fue al BCP y él se quedó en el ECP. Sigue en el rail del ECP y en PR-C
   se vuelve módulo suelto.
5. ⚠️ **La reescritura masiva de rutas también reescribe los GUARDIANES y los comentarios históricos, y ahí
   cambia el significado, no solo el texto.** En `qa-nav-check.mjs` convirtió tres aserciones en afirmaciones
   sobre una consola que ya no las tiene (una pasó a comprobar el rail del ECP contra una ruta del BCP), y en
   `navActivo.ts` dejó un comentario que fechaba un fallo de 2026-08-16 en la consola equivocada. **Revise a
   mano todo `scripts/qa-*.mjs` y todo comentario con fecha que la reescritura haya tocado.**
6. **`next.config.ts` `outputFileTracingIncludes` lleva RUTAS como claves.** Se repuntaron a `/bcp/documentacion*`.
   Si se olvida, el módulo sale vacío en producción — sin error y sin reproducirse en local.

### 3.4 quater — Lo que PR-C añadió, y el saldo del paso (ii) completo (2026-08-18)

1. ⚠️ **Un mapa de PERMISOS no es una ruta, y la reescritura masiva no lo toca.** `PILLAR_CONSOLE` en
   `leadsActions.ts` dice qué consola manda sobre cada pilar de lead. No lleva barras, así que ninguna pasada
   de rutas lo tocó — y **se quedó mal desde PR-A**: `cocreate` seguía apuntando al BCP con su tablero ya en el
   OCP. No falla de forma visible: simplemente le pide al operador el grant de la consola equivocada.
   Corregido en PR-C junto con `general` (→ `ecp`). **Al mover un tablero, busque también los mapas de
   permisos, no solo las rutas.**
2. **Un talón de padre con catch-all sirve a sus hijos, y cada uno va a SU destino.** Tras PR-C,
   `/ecp/direccionamiento/[[...resto]]` manda el padre y `grados` al BCP y `plataformas` al propio ECP, con un
   solo archivo. El guardián acepta ahora el catch-all de un antecesor como talón válido de una sub-ruta.
3. **`NO_SE_MOVIERON` quedó vacío pero se deja montado**: su único inquilino (plataformas) ya se mudó, y el
   caso vuelve en cuanto un módulo con hijos se mude a medias.
4. **Un guardián que revienta a mitad no guarda nada**: `qa-rutas-consolas` leía `git ls-files` y moría con
   ENOENT sobre archivos borrados-sin-`git rm`. Ahora filtra por existencia.

**Saldo del paso (ii):** 29 rutas mudadas, 3 versiones, guardián de 248 comprobaciones. El OCP quedó siendo
solo el pasaporte del lote; el BCP, el negocio; el ECP, la ejecución. Cada consola dice lo que su tagline
prometía desde el paso (i).

### 3.5 The guardian: `scripts/qa-rutas-consolas.mjs` (new; `qa-nav-check` stays as is)

Asserts, against the real `CONSOLES` and the file system: (a) **every rail href has a `page.tsx`** under
`src/app/<console>/(app)/…`; (b) every `RUTAS_MOVIDAS.de` has a stub file and its `.a` has a page; (c) no file
under `src/` (except the stubs and `rutasMovidas.ts` itself) contains a moved old path as a string literal;
(d) no rail href is a prefix-collision of another without a page in between (the 08-16 lesson); (e) no `de` is
also an `a` of another entry (no chains). Runs in the gate for PR-A/B/C and stays forever.

---

## 4. Step (iii) — New modules (F3 · F4 · F5 · F7)  → V4.27 … V4.31 (one PR each)  ← after the Wrap

> **F6 ya está hecho**: «Manejo de Plataformas» salió de Direccionamiento y es módulo suelto (`/ecp/plataformas`)
> desde PR-C. Lo que queda del paso (iii) es F3 (fichas por socio), F4 (CTC Selection), F5 (los tres CRM CP que
> faltan) y F7 (Value Ecosystem en Definición de contexto).

| # | Module | Where | What (default design) | Data | Open point (default) |
|---|---|---|---|---|---|
| iii-1 ✅ **V4.27** | **CTC Selection** umbrella | `/ocp/ctc-selection` with tabs «Black Stock» (today's module, moved under it; `/ocp/black-stock` and `/bcp/black-stock` stubs → final) and «Selección» (pipeline for Red/Blue/Gold bought outright + acquired inventory) | Generalise `black_negotiations` with a `grade` column (default `black`) instead of a second table; publication: Black → Green's Black tab as today; other grades → Green catalogue **with CTC as the producer name** | `black_negotiations`, `lot_listings`, `purchase_contracts` | "CTC as the producer" needs a CTC-owned producer profile + finca rows for `public_lot_catalog` to join through — **decision D3.1**: create the «CTC · Selection» producer identity (default yes, one row, owner-only) |
| iii-2 ✅ **V4.29** | **CRM CP Green** | `/ocp/crm/green` | kanban over buyers: nuevo → activo → recurrente; card = profile, tier/points, reservations, orders; `LeadsBoard` pattern parametrised | `buyer_profiles` (+ new `crm_stage` column with an auto-suggestion from `orders`) | D3.2 stage rule (default: 0 orders = nuevo, 1 = activo, ≥ 2 = recurrente; manual override) |
| iii-3 ✅ **V4.30** | **CRM CP Roast · CRM CP X** | `/ocp/crm/roast`, `/ocp/crm/x` | «interés» boards over `newsletter_subscribers` (source roast / x) + future leads | `newsletter_subscribers` | none — F5 default |
| iii-4 ✅ **V4.31** | **Red de Socios cards** | `/bcp/socios/<nodo>` ×5 | placeholder page per node with the credential state from `partner_accounts` (invited/active/suspended, last login) and the node's landing/login links; built out one partner profile at a time | `partner_accounts` | F3 default (c) |
| iii-5 ✅ **V4.32** | **Definición de contexto rework** | `/bcp/direccionamiento` tab 1 | keep the 3 questions per unit; units CTCx / KR / CP / **Value Ecosystem**; strip FORMATS/DERIVABLES/moodboard/referencias; three placeholder subtabs «Misión y Visión», «Modelo Económico», «Contexto de Mercado Global»; keep stored answers to the three kept questions, drop video-only fields | the direccionamiento table (**read it before touching**; owner: "I can check the table") | D3.3 what to do with the moodboard data-URIs (default: export once to `docs/archive/`, then drop; the 8 MB `serverActions.bodySizeLimit` in `next.config.ts` can come back down afterwards) |

`Manejo de Plataformas` standalone (F6) is a route move → it ships in **PR-C**, not here.

---

## 5. Step (iv) — HC as a login module + in-app shell + per-tool grants (A2 · A5 · A6 · F8)  ✅ COMPLETO

> Se hizo en dos tandas: **(iv-a) el modelo de acceso** ✅ V4.33 y **(iv-b) la concha in-app** ✅ V4.34.

- ✅ **Membership — HECHO en V4.33** (`src/lib/identidad/matriz.ts`): `herramientas` requires an account that is
  a KR producer **or** a CP buyer (same producer ⊕ buyer exclusion as today); no third identity is created.
  `/herramientas` landing stays public but the tools open only after login.
  **Cómo quedó**: `herramientas` es un OBJETIVO de la matriz, no una identidad — la pregunta que responde es
  «¿puedo entrar?», y se contesta con lo que la persona ya es. Crear una tercera identidad habría roto la
  exclusión productor ⊕ comprador sobre la que se sostiene toda la matriz.
- ✅ **Shell — HECHA en V4.34**: cada herramienta se abre en `/kaffetal-regal/herramientas/<slug>` o
  `/cherry-picked-green/herramientas/<slug>` (rutas de la SUPERFICIE → el prefijo del proxy es correcto por
  construcción) con cabecera «← Volver a …», nombre, insignia Plus/bloqueada; el HTML sigue intacto en
  `/tools/h/<slug>`, fuera del matcher del proxy.
  ⚠️ **La vuelta segura resultó ser una cuestión de SEGURIDAD, no de comodidad.** Obedecer el `?volver=` a
  ciegas es un **redirect abierto**: `…/herramientas/agtron?volver=https://sitio-falso/login` pondría, dentro
  del dominio de CTC, un botón «Volver a Kaffetal Regal» que lleva a una copia del login. `vueltaSegura()` es
  lista blanca estrecha —solo rutas relativas de ESA superficie, comparando por frontera de segmento— y todo lo
  demás cae al inicio. **Nunca devuelve vacío**: una concha sin salida es justo lo que A5 quería evitar.
  Comprobado en servidor real: con destino hostil el botón apunta a `/kaffetal-regal`; con destino legítimo,
  a `/kaffetal-regal?m=lotes`.
- ✅ **Grants per user per tool — HECHOS en V4.33**: tabla `tool_user_grants(user_id, tool_id, granted_at,
  granted_by, source 'manual'|'payment', expires_at null)`, service-role-only; `tools_plus_grants` **se sigue
  leyendo como comodín heredado** — tiene 3 filas vivas y retirarla hoy le quitaría el acceso a tres personas
  sin avisar. `quienDependeDelComodin()` es la lista de trabajo de esa migración.
  ⚠️ **El veredicto dice POR QUÉ se abrió** (`via: "permiso"` vs `"comodin-heredado"`): sin eso no habría forma
  de saber a quién falta migrar antes de retirar la tabla vieja.
  ⚠️ La caducidad se filtra **en código, no con un `.lt()`**: `expires_at` nulo significa «no caduca», y un
  filtro por fecha en SQL descartaría esas filas salvo que se escriba el `or(...is.null)` — el tipo de detalle
  que se olvida y quita permisos en silencio. ✅ **Hecho en V4.34**: las bloqueadas siguen **visibles** con «Solicitar» → fila en
  `tool_access_requests`, que el ECP lista.
  ⚠️ **Tabla APARTE de `tool_user_grants`, y a propósito**: una fila de grants significa «puede abrir», sin más
  lectura. Si las peticiones vivieran ahí con un `status`, cualquier consulta que olvidara filtrarlo convertiría
  una PETICIÓN en un PERMISO **sin que nada fallara** — la misma familia de fallo mudo que persigue toda esta
  reorganización. Pedir y poder son dos tablas. El disparador de pago escribirá `source='payment'` en la fila de
  GRANTS, que es donde vive el permiso.
- Verification: `qa-terminos-check`-style guardian for the access rule; drive KR/CP as QA producer/buyer.
- ✅ **D4.1 aplicada con su default (V4.34)**: la solicitud avisa a `info@` por correo, una línea, con las mismas
  reglas que los leads — y **el resultado del envío se guarda en la fila** (`aviso_email_at` / `aviso_email_error`).
  Un aviso que falla en silencio es una solicitud que nadie atiende; es la lección del OTP del BCP, que se tragaba
  su propio fallo. La solicitud queda registrada aunque el correo no salga: el aviso es comodidad, no el registro.

---

## 6. Step (v) — CTC Tech / Varietales inside KR + «Cherry Picked CaaS» → OCP (A3)  ✅ **V4.35, COMPLETO**

- ✅ **CTC Tech / Varietales sub-modules in KR — HECHO en V4.35**, pero **no como el plan suponía**.
  ⚠️ **La premisa era falsa: los leads NO son capturas anónimas.** Ya se vinculan a un perfil EN EL MOMENTO DE
  LA CAPTURA (`leads.profile_id` + `account_provisioning`, creando la cuenta o atándola a una existente): 13 de
  15 leads estaban vinculados antes de empezar. Y las respuestas de CTC **ya llegaban al productor dentro de
  KR** — `mirrorReplyToProducerFeed` las espeja en `producer_comm_log` desde hace tiempo.
  **Así que D5.1 quedó sin objeto** (no hay nada que emparejar en el login) y la tanda fue de PRESENTACIÓN: las
  respuestas aterrizaban mezcladas entre las notas de las fincas y no había forma de encontrarlas.
  **Lo construido**: módulo **«Mis solicitudes»** en el panel del productor, con su tarjeta junto a «Más allá
  de la exportación», su contador de respuestas sin leer y su propio icono. Mismo componente que
  Retroalimentación —el hilo se lee igual— con la copy parametrizada.
  ⚠️ **Y un fallo encontrado con datos reales antes de salir**: partir el feed por `leadId` a secas dejaba la
  RESPUESTA DEL PRODUCTOR en el otro módulo — solo la nota de CTC lleva el lead; la respuesta lleva `parentId`.
  La conversación habría aparecido partida en dos pantallas **sin un solo error**. La partición mira ahora
  también el padre.
- ✅ **«Cherry Picked CaaS» landing → OCP CRM CP CaaS — HECHO en V4.35**, también más pequeño de lo previsto.
  El depósito en `pillar='cocreate'` y el kanban en `/ocp/crm/caas` ya funcionaban desde PR-A. Y el formulario
  **ya CREA la cuenta de Cherry Picked** — así que «el estado de gracias promueve crear un login» no aplicaba:
  la cuenta ya existe cuando ese panel se pinta.
  **Lo que faltaba era la puerta**: el panel terminaba en un «Entendido» que solo cerraba, de modo que la
  persona acababa de recibir un acceso y se quedaba sin forma de usarlo. Ahora hay un CTA **«Entrar a …»** por
  pilar (CaaS → Cherry Picked Green; tech/varietales/general → Kaffetal Regal), en los tres idiomas.

---

## 7. Cadence, versions, wraps

⚠️ **Rebased on 2026-08-17.** The first version map in this document assumed step 0 would take one bump.
It took six (V4.16 the band, 4.17 the flip card, 4.18 the cacao leftover, 4.19 arrows + wheel + 3-page ficha
+ popup + CaaS, 4.20 the rAF engine, 4.21 the two faces). **Production is at V4.21**, so everything below is
renumbered from there. If a step takes more bumps than planned, renumber again — the map is a convenience,
the rule is one bump per deployed batch.

| When | What | Version |
|---|---|---|
| **Step 0** | Sneak Peek + 7 mock lotes | ✅ **V4.16 → V4.21, DONE** |
| — | *(unplanned)* encoding fix of the 14 public portadas + `qa-encoding-check` | ✅ **V4.22, DONE** |
| **Step (i)** | Freeze names (§2) | ✅ **V4.23, DONE** |
| **Step (ii)** | Route moves, one console per PR (§3): PR-A ✅ · PR-B ✅ · PR-C ✅ | ✅ **V4.24 · V4.25 · V4.26** |
| **Version Wrap V37** | El mapa interactivo, al día tras 14 entradas de bitácora | ✅ **DONE** — `Documentacion_Interactiva_V37.0(a3cfe82).html` |
| **Step (iii)** | New modules (§4): CTC Selection ✅ · CRM CP Green ✅ · CRM CP Roast/X ✅ · socio cards ✅ · Definición rework ✅ | ✅ **V4.27 → V4.32, COMPLETO** |
| **Step (iv)** | HC (§5), en dos tandas: **(iv-a)** modelo de acceso ✅ · **(iv-b)** concha in-app ✅ | ✅ **V4.33 · V4.34, COMPLETO** |
| **Step (v)** | KR sub-modules + CaaS → OCP (§6) | ✅ **V4.35, COMPLETO** → **owner declares V5.0** → Version Wrap V38 ← next |

Every PR: Log entry sealed with sha · HANDOFF touched · DICT touched · memory note `project_structure_reorg_2026_08_17`
updated with "done through step X".

---

## 8. Decision register of this plan (all with defaults — "defaults except …" works)

| # | Question | Default |
|---|---|---|
| D0.1–D0.8 | Sneak Peek placement · live/mock mix · fields · click · gate Green behind login · mock storage · grade ladder · which season | ✅ **ALL ACCEPTED 2026-08-17** (§1.6). D0.5 = (a) extended to every CP landing: the module replaces the direct catalogue for visitors. D0.7's ladder is superseded by the real Notion references (3 Gold · 3 Blue · 1 Black tras la corrección de escala del 2026-08-19; 2/2/2/1 antes) |
| D0.9 ✅ **RESUELTA (owner, 2026-08-19)** | Card #2: variety «Bourbon» (title) vs `Castillo` (field) | **Es BOURBON**, que es lo que ya salía. El campo no está roto por sistema —la ficha hermana `Tabi - Honey [La Pradera]` sí lleva `Variedad: Tabi`— y `Variedades / %` de La Pradera está vacío, así que la finca no desempata; **la taza sí**: 87.00 floral/mandarina/cardamomo contra los dos Castillo de la MISMA finca a 84.25 y 84.50 con chocolate y especias. ⚠️ El campo en Notion sigue diciendo Castillo |
| D0.10 ✅ **RESUELTA (2026-08-19), por prueba** | Card #3: finca relation «La Floresta» vs title/supplier «La Fortaleza · Ragonvalia» | **Es LA FORTALEZA**, que es lo que ya salía, y no hizo falta criterio: **La Floresta no cultiva Gesha** — su propio `Variedades / %` dice «Castillo 90%, colombia 10%». Además el RUT adjunto a La Fortaleza es de **Wilmer Rodríguez**, que es el `Supplier Name` del lote, y el datasheet del lote se llama `La_Fortaleza_Wilmer_R_Gesha_Ragonvalia…`. Las DOS fincas cuelgan del MISMO proveedor: así se escoge la equivocada en un desplegable. ⚠️ La relación en Notion sigue mal |
| D2.1 | Rename `HubLanding.tsx` → `PortadaLanding.tsx`? | **No** in step (i); vocabulary only. Rename opportunistically in step (v). |
| D2.2 | Do IDENTIFIERS (`styles.hubTile`, `HUB_ICON`, `kind="hub"`, the `hub` i18n key, `hub.module.css`, `backToHub`) and the SEALED `Log_Documentacion_Interactiva_V*.txt` count as «the word hub»? | **No — taken 2026-08-18.** Step (i) freezes *vocabulary*: prose, copy, comments, docs. Renaming identifiers is refactor, not vocabulary — it moves files and would collide with step (ii) — so it follows D2.1's logic and waits for step (v). The sealed logs are the historical record: rewriting them would falsify what was said on the day. A note saying *why* the identifiers stay is written into `HubLanding.tsx` and `AppDashboard.module.css` themselves, so the next sweep does not "fix" them. |
| D3.1 ✅ **RESUELTA 2026-08-18** | Create a CTC-owned producer identity for CTC Selection lots | **No hace falta ninguna identidad falsa.** Palabras del owner: *«All the lots that CTC buys will be first registered in KR, which means that the real farm is shown in the documentation but is replaced as the Finca in the showcase cards (Not changing the official finca, just how it looks in the UI)»*. Implementado en V4.28: el REGISTRO conserva la finca real, la VITRINA enseña a CTC. Ver §9, punto 5 |
| D3.2 ✅ **APLICADA V4.29** | CRM CP Green stage rule | 0/1/≥2 orders, manual override — **con un giro que conviene repetir en iii-3: la etapa deducida NO se persiste.** En `buyer_profiles.crm_stage` solo vive el anulado manual, y `null` significa «sigue la regla». Guardar la etapa calculada la dejaría rancia en cuanto entrara un pedido. La regla vive en `lib/crm/etapaComprador.ts`, módulo puro, y la comprueba `qa-crm-green-check.mjs` (21) |
| D3.3 ✅ **RESUELTA V4.32** | Direccionamiento moodboard data | **Estaba VACÍO** — la fila `assets` pesaba 28 bytes, no había un solo data-URI que exportar. Se retiró y `bodySizeLimit` volvió al defecto de Next. **La decisión real resultó ser otra**: qué hacer con las respuestas guardadas dentro de la rama «Video largo» (§9, punto 8). Owner: *«Strip it, I'll rescue the text»* |
| D3.4 | PR order A → B → C vs B → A → C | A → B → C |
| D4.1 ✅ **APLICADA V4.34** | «Solicitar» emails info@ | **Sí, con su default** — una línea, mismas reglas que los leads, y el resultado del envío guardado en la fila (`aviso_email_at` / `aviso_email_error`). La solicitud queda registrada aunque el correo falle: el aviso es comodidad, no el registro |
| D5.1 ⚠️ **SIN OBJETO** | Lead ↔ profile linking rule | **La premisa era falsa.** El plan suponía que los leads eran capturas anónimas y había que emparejarlos por correo al entrar. Ya se vinculan **en la captura** (`leads.profile_id` + `account_provisioning`): 13 de 15 lo estaban antes de empezar. No hubo nada que decidir ni que construir |
| D7.1 | When is V5.0 declared | end of step (v) |

---

## 9. Owner-owed and hygiene items carried alongside (not blocking, not forgotten)

From ESTADO §3.5 (unchanged): Search Console `www` property + sitemap · GDPR privacy policy (subprocessors
Resend, AssemblyAI, Anthropic, Google) · Nequi number for the Arena fee (`src/lib/arena/payment.ts`) · Varietales
landing material · Terratalento grey door (`soon: true`) · two YouTube embeds on `Yird1_j6yqo` · Gemini price
in `precios.ts` · Canva scenario in Make · Coffeed 5 media without feed · Supabase leaked-password toggle (D21) ·
worker narrow credential (F10, backlog).

### Dev to-dos (owner's call, tracked here)

0. **✅ DONE 2026-08-18 (V4.22) — the 14 public portadas had a broken text encoding.** Found while measuring
   the «hub» occurrences for step (i): commit `10c9016` (2026-08-15, V4.7) re-saved fourteen
   `src/app/**/page.tsx` with their UTF-8 read as cp1252, corrupting the `<title>`, meta description and
   `siteName` of **every public surface at once** — live in production for three days. Fixed run by run and
   verified byte-identical against `10c9016^`; new guardian `scripts/qa-encoding-check.mjs` (233 on the
   corrupt tree, 0 on the fixed one). **The lesson is a hole in the gate, and it is still open**: `tsc`,
   `eslint` and `next build` all pass on corrupted text, so nothing in the definition of done looks at the
   bytes production actually serves. The guardian closes this one case; consider whether other public-metadata
   properties deserve the same treatment (see to-do 3, the 12 ungoverned tool pages — same blind spot).

5. ✅ **D3.1 RESUELTA (2026-08-18) — el lote tiene dos caras, y ninguna miente.** El default original
   («crear una identidad de productor de CTC + fincas para que la vista una») se descartó: la vista entra por
   `JOIN fincas` sobre `lots.finca_id`, así que aplicarlo habría obligado a repuntar el lote a una finca
   ficticia y **borrar su origen** — pasaporte y rastro EUDR incluidos.
   **Lo que decidió el owner**, literal: *«All the lots that CTC buys will be first registered in KR, which
   means that the real farm is shown in the documentation but is replaced as the Finca in the showcase cards
   (Not changing the official finca, just how it looks in the UI)»*.
   **Cómo quedó** (V4.28): `public_lot_catalog` deja de devolver `finca_name` cuando el lote está comprado y
   expone `ctc_selection`; el rótulo lo pone la aplicación desde `CTC_RAZON` (`lib/legal.ts`), su fuente única.
   Se **deriva de la compra** (`black_negotiations.status = 'comprar'`) — no hay interruptor que olvidar. Ni una
   fila de `lots` o `fincas` cambia. Se anula en la VISTA y no en el componente porque la vista la lee `anon`:
   taparlo en la interfaz habría dejado el nombre a un `curl` de distancia.
   ✅ **La consecuencia quedó cerrada el 2026-08-19 (V4.41), y era más ancha de lo que decía esta nota.** El
   pilar 01 del Manifiesto prometía «finca, personas, proceso y evaluación, **verificables lote a lote**», a
   secas. Leído así, la tarjeta fallaba en DOS puntos, no en uno:
   - la **finca**, por D3.1 — un lote comprado en firme se muestra a nombre de CTC;
   - las **personas**, y esto **NO lo trajo D3.1**: la tarjeta no ha mostrado nunca al productor, de ningún
     lote. El tipo `Lot` de `data.ts` ni siquiera tiene campo. La promesa ya sobrepasaba antes de V4.28.
   **Decisión del owner (2026-08-19): decir DÓNDE se verifica, sin retirar la promesa** — porque la promesa es
   cierta. El pilar añade, en los tres idiomas, «en la ficha técnica y en la DDS» / «on the datasheet and the
   DDS» / «im Datenblatt und in der DDS». No es una rebaja: es el dato que faltaba, y **apunta al mismo sitio
   que ya decía la sección de EUDR** (`GradosSection`, `eudrP2d`: el número de DDS «viaja con cada despacho y
   queda visible en tu factura y en la ficha técnica del lote»), y al mismo sitio que dijo el owner en D3.1
   (la finca real «se muestra en la documentación»).
   **La Historia se deja intacta a propósito**: «sin perder el nombre de quien los cultivó» sigue siendo verdad
   —el nombre no se pierde, vive en la ficha—, así que tocarla habría sido corregir algo que no estaba mal.
   **Y las dos mitades quedan atadas**: `qa-sneak-peek-check.mjs` (194, antes 189) falla tanto si alguien le
   quita el «dónde» al pilar como si alguien devuelve la finca a la tarjeta. Ninguna de las dos rompía nada por
   sí sola en ningún otro sitio. Verificado saboteando las dos.
   ℹ️ Hoy no hay **ningún** lote publicado (`public_lot_catalog` devuelve 0 filas), así que el cambio no altera
   nada que un visitante esté viendo: era el momento barato de arreglarlo.


5-bis. ✅ **D0.9 y D0.10 cerradas (2026-08-19, V4.40) — y ninguna cambió un valor.** Las dos discrepancias que
   el paso 0 dejó marcadas en `sneakPeekMock.ts` ya se resolvieron: la tarjeta #2 es **Bourbon** (palabra del
   owner) y la #3 es **La Fortaleza** (prueba: La Floresta no cultiva Gesha). Como las tarjetas **ya mostraban
   esos dos valores**, el diff del mock es solo comentarios y **no hubo que regenerar ruedas ni fichas PDF**.
   ⚠️ **LO QUE SÍ QUEDA, Y ES PARA EL OWNER: aguas arriba los dos errores siguen ahí.** La ficha del Bourbon
   conserva `Variedad: Castillo`, y el Gesha sigue relacionado con «La Floresta» (que además lo lista en sus
   `Fichas Tecnicas Asociadas`). No estorban hoy porque el mock está escrito a mano — **pero el mock es
   temporal**. El día que los lotes se importen de verdad, esos dos valores volverían a entrar **sin que falle
   nada**: dos campos plausibles en dos tarjetas bonitas.
   Por eso `qa-sneak-peek-check.mjs` (189, antes 177) **clava** los cuatro valores —variedad, finca, municipio y
   altura— y exige que el archivo siga explicando por qué, porque un valor clavado sin su razón se desclava en
   cuanto alguien lo cuestione. Verificado simulando la reimportación: se pusieron Castillo, La Floresta y
   1 300 m, y los denunció.

6. ✅ **La lista de espera de CTC Home ya tiene tablero (2026-08-19, V4.39).** `newsletter_subscribers` tiene
   TRES fuentes —`roast`, `x` y `ctc-home`— y el paso (iii)-3 construyó tablero para las dos primeras, que es
   lo que pedía el plan. La tercera nació el 2026-08-10, cuando el índice de CTC Home dejó de anunciar la puerta
   del Control Panel y ofreció esta suscripción en su lugar: estuvo **nueve días recogiendo correos que nadie
   podía mirar**. Hoy sigue en 0 filas (la única alta de toda la tabla es de `x`), así que no se perdió nada —
   pero eso fue suerte, no diseño.
   **Dónde vive: el ECP, no el OCP**, y eso era la decisión. Roast y X cuelgan de «OCP · Cherry Picked» porque
   son programas de Cherry Picked; ésta es de la red entera, y meterla en ese grupo habría hecho que el sitio
   del tablero contradijera lo que contiene. Queda en «ECP · Dirección», junto a **Leads · Recepción**, que es
   lo otro que entra por la web pública. Ruta `/ecp/ctc-home`, que espeja la clave de la fuente igual que
   `/ocp/crm/roast` espeja la suya.
   ⚠️ **Y por eso el módulo se mudó a `src/components/panel/interes/`.** `InteresBoard`, `InteresRow` y
   `interesActions` colgaban de `src/app/ocp/(app)/crm/`. Sirviendo ya a DOS consolas, dejarlos ahí significaba
   que la siguiente mudanza de módulos del OCP se llevaría por delante una página del ECP — la lección exacta de
   `shared.module.css` en PR-B.
   ⚠️ **`marcarContactado` revalidaba dos rutas y ahora revalida tres**, y con la tercera dejó de ser cosmético:
   su tablero está en OTRA consola. Olvidarlo habría dejado una lista que se llena y no se refresca, sin un solo
   error.
   ⚠️ **El estado vacío se parametrizó**: decía «las altas llegan desde la landing del programa», que para la
   lista de la portada es falso y manda a buscar una landing que no existe.
   **La comprobación que faltaba, y que es la lección de verdad**: `qa-crm-interes-check.mjs` (37) ya no lleva
   las fuentes escritas a mano — las **lee de `SOURCES`** en `src/lib/newsletter/actions.ts` y exige que cada
   una tenga página, entrada en el rail y `revalidatePath`. Una fuente nueva sin tablero rompe el guardián el
   mismo día que se escribe. Verificado saboteándolo: se añadió una cuarta fuente falsa y se borró un
   `revalidatePath`, y denunció las dos cosas.

7. ⚠️ **CORREGIDO EN V4.31, pero la lección sigue abierta: 13 compuertas quedaron apuntando a la consola
   equivocada tras el paso (ii).** Siete archivos bajo `/bcp/` seguían llamando `requireConsoleAccess("ecp")`
   y dos redirigían a `/ecp`; uno bajo `/ocp/` pedía `"bcp"`. Los dejó la mudanza de PR-A y PR-B: **las claves
   de consola no llevan barras**, así que ninguna reescritura de rutas las tocó — exactamente el mismo agujero
   que `PILLAR_CONSOLE` en `leadsActions.ts`.
   **Y no habría fallado nunca para el owner**, que tiene grant de las tres consolas: habría esperado a que un
   colaborador con una sola credencial se topara con un «no tiene acceso» en su propio módulo.
   Cerrado con la comprobación **(f)** de `qa-rutas-consolas.mjs`, que exige que cada página se proteja con la
   compuerta de SU consola. **Lo que queda abierto es el hábito**: al mover un módulo, buscar SIEMPRE los
   identificadores de permiso además de las rutas — `requireConsole*`, `PILLAR_CONSOLE`, cualquier
   `Record<string, PanelConsoleKey>`.

8. ✅ **iii-5 · lo que el rework encontró de verdad (2026-08-18).** El plan preguntaba por el moodboard. El
   moodboard estaba **vacío** — 28 bytes. La decisión real solo apareció al leer la tabla: **las respuestas de
   Producto y Contexto estaban guardadas DENTRO de la rama del formato «Video largo»**
   (`ctcx|largo|producto|promesa`…), porque era la pestaña en la que el owner escribía. Ahí dentro había texto
   de marca de primer orden — la promesa «lo que usted registra en su finca llega intacto hasta la taza que se
   cata en Ámsterdam», el CTA y el objetivo. **Un borrado por prefijo se habría llevado 3.000 caracteres de
   trabajo real.**
   Ejecutado: respaldo de los 20 campos en `docs/archive/direccionamiento_context_2026-08-18.json`, migración
   que **levanta** las respuestas fuera de la rama de vídeo, y retirada solo de los cinco campos que describían
   planos de cámara. Quedan **15 campos, 4.202 caracteres**.
   ⚠️ **Consecuencia que conviene tener presente**: el módulo **dejó de ser vendorizado**. Se mantenía verbatim
   para resincronizarlo con su autor, pero el rework retiraba justo lo que lo hacía suyo, y el archivo ya traía
   dentro las unidades, colores y dominios de CTC — la resincronización era teórica. La pantalla es ahora de la
   casa. La herramienta de guion sigue existiendo **fuera** de la plataforma.
   **Efecto lateral bueno**: al retirar el `.jsx` (1.619 líneas) la línea base de `eslint` bajó de **27 avisos
   a 8** — 19 eran suyos.

1. ✅ **`npm audit` de vuelta a 0 (2026-08-19, V4.36).** La cadena era `deepmerge-ts <8.0.0`
   (GHSA-ggr8-5vv4-36mx, agotamiento de pila) ← `html-to-text` ← **`mailparser`**, dependencia directa del
   Buzón. **NO se aplicó `npm audit fix --force`**, que degradaba `mailparser` a 3.9.8 — una bajada rompedora
   sobre el módulo que lee el correo real de la casa.
   **Lo que se hizo**: un `overrides` de `deepmerge-ts` a `^8.0.1` en `package.json`. `html-to-text` lo pide
   como `^7.1.5`, así que sin el override no sube; con él, `mailparser` se queda en 3.9.14 y la vulnerable
   desaparece del árbol.
   **Cómo se verificó, que es lo que importa aquí**: no basta con que instale. Se capturó la salida COMPLETA de
   `simpleParser` sobre dos correos —uno solo-HTML y uno `multipart/alternative`, con acentos, lista, enlace y
   asunto codificado— **antes y después** del override, y el resultado es **byte a byte idéntico**: mismo
   `text`, mismo `textAsHtml`, mismo `html`, mismos adjuntos. El camino HTML → texto es justo el que pasa por
   `html-to-text` y de ahí por `deepmerge-ts`, así que es el que había que comparar.
   ⚠️ Y una advertencia para quien vuelva a tocar esto: `simpleParser` **no** sintetiza `text` a partir del
   HTML cuando el mensaje es `multipart/mixed` con adjunto — ahí `m.text` es `undefined`, y eso es
   comportamiento normal, no una regresión. Una primera prueba lo dio por fallo.

2. ✅ **Los lotes vivos ya tienen ficha (2026-08-19, V4.42) — pero NO como decía esta nota, porque esta nota
   era peligrosa.** Decía: «generar el PDF desde `lots.datasheet` y el botón se enciende para todo el catálogo
   sin tocar el componente». Hacer literalmente eso habría publicado el NIT y la razón social del productor, su
   nombre, la georreferencia del predio, quién catató y en qué laboratorio, y **todo el bloque `eudr_*` de
   evaluación de riesgo del proveedor** — que es un juicio interno de CTC. `lots.datasheet` son **110 claves**:
   es el formulario entero del expediente, no una hoja de venta.
   ⚠️ **Y el peor era `estate`**: por D3.1 la tarjeta de un lote comprado en firme no enseña la finca, y ese PDF
   la habría puesto **a un clic de esa misma tarjeta**.
   ⚠️ **Dos documentos de este repo se contradecían.** El HANDOFF, en la auditoría del **2026-07-10**, ya dejó
   escrito que `public_lot_catalog` existe precisamente para que «la Ficha privada y la geolocalización exacta»
   no lleguen a un comprador, y advierte por escrito de no deshacerlo. Esta nota, más nueva, mandaba deshacerlo.
   Manda la auditoría.
   **Lo construido (owner, 2026-08-19 — «público, sobre lista blanca»)**:
   - `src/lib/catalogo/fichaPublica.ts`, módulo **puro**: proyecta `datasheet` a lo publicable con **lista
     BLANCA**. Lo que no está nombrado no sale, así que **una clave nueva del formulario nace privada** — con
     lista negra nacería pública y nadie se enteraría hasta ver un NIT en una descarga. La lista no es criterio
     propio: es lo que las fichas de muestra del owner ya publican (finca, municipio y departamento, variedad,
     proceso, notas de cata, puntaje SCA con sus diez atributos, altura). Ensancharla es cambiar una línea.
   - Solo escalares: un objeto o arreglo anidado puede arrastrar dentro una lista de fincas o un adjunto, y la
     lista blanca solo mira el primer nivel.
   - **D3.1 se respeta en la ficha**: en un lote de CTC Selection `estate` se sustituye por el rótulo de CTC,
     también cuando viene vacío. La ficha no puede desmentir a la vitrina.
   - **Migración**: `public_lot_catalog` gana `tiene_ficha` — **un booleano, jamás el contenido**. Misma forma
     que `ctc_selection` en D3.1: se deriva en la vista y la aplicación solo recibe un sí/no.
   - **Página** `/docs/ficha/[lotId]`. ⚠️ Cuelga de `/docs` por la **gotcha 12**: el matcher del proxy excluye
     `docs/`, y una ruta no excluida se reescribiría en un subdominio y daría 404 — y este enlace se abre desde
     las **siete** superficies donde está montada la cinta. Además las fichas de muestra ya viven ahí.
   - **La compuerta es la vista**: si el lote no sale en `public_lot_catalog` no está publicado y responde 404;
     el `datasheet` solo se lee después. **Verificado contra la base**: los dos lotes reales que hoy tienen
     ficha (y NIT dentro) están sin publicar y dan **404**.
   - **Guardián `qa-ficha-publica-check.mjs` (105)**, probado con **las 110 claves reales**, no unas inventadas.
     Verificado saboteándolo cuatro veces: recorriendo la entrada en vez de la lista, tumbando la sustitución de
     D3.1, metiendo `nit_rut` en la lista blanca (revienta al cargar el módulo) y sacando la URL de `/docs`.
   ℹ️ **Lo que NO se pudo verificar**: hoy no hay ningún lote publicado, así que la página no se ha visto
   renderizada con datos de verdad. La proyección y la compuerta sí están probadas; el primer lote que se
   publique es el momento de mirarla con ojos.
3. ✅ **Las 12 herramientas ya tienen descripción (2026-08-19, V4.37).** `public/tools/*.html` son URLs
   **indexables** — el matcher del proxy excluye `/tools/` y `robots.txt` solo cubre `/bcp /ecp /ocp /lab` —, y
   son **archivos estáticos**: no los pinta Next, así que no pasan por `generateMetadata` ni por ningún layout.
   Lo que no esté escrito a mano en su `<head>` no existe. **Diez de las doce no tenían `meta description`**, y
   cuando falta Google no deja el hueco: recorta un trozo del cuerpo y lo pone de titular — en una calculadora,
   normalmente una etiqueta de formulario.
   **El texto no se inventó**: sale de `tools.descripcion`, que el owner ya escribió, recortado a la longitud de
   un resultado (139–160 caracteres) y sin las notas de administración («Se ofrece a productores»,
   «Reemplazada por…»), que dicen a quién se le muestra, no qué hace.
   ℹ️ **De las dos que sí tenían, solo se tocó la rota.** `viaje-cafe.html` tenía una descripción corta pero
   correcta, escrita por el owner, y se deja como está: no había defecto que arreglar.
   ⚠️ **Una estaba peor que vacía: `mermas-ctc.html` SÍ tenía descripción, y describía la calculadora Rápida**
   — pero la base dice que ese archivo es la **Detallada**. Una descripción equivocada no la vuelve a mirar
   nadie. Por eso el guardián nuevo `qa-tools-seo-check.mjs` (193) no comprueba solo que exista: exige largo
   útil, sufijo de la casa, que no se cuele frase de admin, que **no haya dos iguales** (Google colapsa
   duplicados) y que **el idioma case con el `<html lang>` de la página**. Verificado saboteándolo por tres
   caminos: quitando una, duplicando otra y poniendo una en el idioma equivocado.
   ⚠️ **Esa última comprobación existe porque el fallo ya pasó**: a `green-coffee-datasheet.html` —`lang="es"`,
   interfaz entera en español— se le escribió primero la descripción en inglés.
   ⚠️ **CORREGIDO EN V4.38 — aquí se anotó que `tools.meta_description` «no la lee nadie», y era medio cierto y
   por tanto engañoso.** Es verdad que nada la SIRVE, y que no puede: `/tools/h/[slug]` **redirige** al archivo
   estático cuando la versión es del repo, y para una subida responde con `X-Robots-Tag: noindex`. Pero **sí la
   LEE el tablero de «Manejo de Plataformas»** (`cargarHerramientasSeo` → `PlataformasBoard`), que la usa para
   la píldora roja «sin descripción» y el contador de indexables — el propio comentario del código dice que ese
   dato fue lo que abrió el módulo. **No es decoración: es el INVENTARIO.** Y como estaba en 11 NULL + un «Test
   descripcion 1», después de V4.37 el tablero mentía al revés: decía que faltaban descripciones que ya
   existían. Ver §9 to-do 3-bis.
   ⚠️ Al editar estos archivos: son herramientas vendorizadas con JS vivo. Quitar un control sin quitar sus
   referencias en JS deja un `null` que tumba la calculadora entera al cargar — verificar A/B contra el archivo
   anterior, mismo script, mismos números. (Aquí solo se tocó el `<head>`, nunca el cuerpo ni el JS.)

3-bis. ✅ **El espejo del inventario de herramientas (2026-08-19, V4.38).** Se llenó `tools.meta_description`
   con lo que de verdad sirve cada archivo (las 12), y se corrigió `tools.lang` de `green-datasheet`, que decía
   `en` mientras el archivo declara `lang="es"` y tiene la interfaz entera en español — ese campo sale como
   píldora «ES»/«EN» en la tarjeta, así que anunciaba en inglés una herramienta española.
   **La regla queda escrita**: para una herramienta del repositorio **manda el ARCHIVO** (es literalmente lo que
   se descarga el buscador) y la columna es su **espejo**. El guardián nuevo `qa-tools-seo-espejo.mjs` (68) lo
   comprueba contra la base, y el campo del ECP ahora lo dice en pantalla en vez de dejar que el owner lo
   descubra. Verificado saboteándolo: se editó la columna de `qr` y el `lang` de `green-datasheet` y los denunció
   a los dos.
   ⚠️ **Y un hallazgo que salió de ahí: ARCHIVAR NO RETIRA DE LA WEB una herramienta del repositorio.**
   `archivado_at` la saca del inventario del ECP y hace que `/tools/h/<id>` responda 404, **pero el archivo sigue
   en `public/`**, servido estático, en una ruta que el proxy ni mira. `mermas-detallada` («Reporte de proceso de
   café», reemplazada el 2026-08-15) llevaba desde entonces viva e indexable, compitiendo en el buscador con la
   herramienta que la sustituyó — y en V4.37, sin saberlo, **se le escribió una descripción nueva**, que es justo
   lo contrario de retirarla. Ahora lleva `<meta name="robots" content="noindex, follow">`: sale del índice y el
   enlace viejo sigue abriendo. Borrar el archivo es otra decisión, y es del owner: puede estar enlazado desde
   fuera. El guardián exige `noindex` en toda archivada y **ausencia** de `noindex` en toda viva.
   ⚠️ **Ojo con los identificadores, que están cruzados**: la herramienta llamada «Calculadora de mermas ·
   Detallada» tiene el id **`mermas-ctc`**; el id `mermas-detallada` es la vieja «Reporte de proceso de café»,
   que es la retirada. Fue exactamente esa confusión la que dejó a `mermas-ctc.html` describiendo la Rápida.

4. **The empty OneDrive folder stays.** `…/OneDrive/Desktop/CTC Web Platform` is empty since the migration and
   **is not going to be deleted** — Claude Code has it locked as this session's working directory and the owner
   confirmed (2026-08-17) it cannot be removed from the chat. It is inert; ignore it. The workspace is
   `C:\dev\ctc-platforms`.

**Branch `fix/rastro-cacao` — rejected and deleted (2026-08-17).** It existed on the remote since 2026-08-14
(`6ff5f5b`) and proposed removing the **entire cacao mode** from `public/tools/mermas-rapida.html` (toggle,
comparison modal, stage config, its JS). It was the *other* answer to the same problem, and the one that did
**not** ship: `main` fixed it on the same day with `4a7e1e2` — **one line, the `<title>`, tool untouched** —
after the owner stopped the deletion («Wow wow no!!!! ten mucho cuidado»). The real cause was stale positioning
copy cached in the search index, so amputating the tool would not have fixed the symptom. Two things were
cherry-picked out of it before deletion (the KR dashboard copy and dev to-do 3 above); the rest is superseded.
**The standing domain rule from that episode:** in this house `cacao`/`cocoa`/`chocolate` mean two different
things — as a **product** it is gone, as a **tasting note** it is standard coffee vocabulary («Frutos secos /
Cacao» is an SCA flavour-wheel category) and lives legitimately in `rueda-catacion.html`, `viaje-cafe.html` and
`ficha/fichaData.ts`. **Those are never touched.**

✅ **RESUELTO EN NOTION (2026-08-19, V4.43) — higiene de datos en «📋 Fichas Técnicas de Café».** Se leyó de
nuevo antes de tocar nada: los 6 descuadres seguían exactamente igual que el 2026-08-17.

**Lo que se corrigió (autorizado por el owner):** la relación `Grado CTC` de **seis** fichas, para que el grado
enlazado sea el que dicta su propio puntaje. `Bourbon - Honey [La Pradera]` (87.00 → Gold) ya estaba bien.

| Ficha | `SCA` | Enlazaba | Ahora |
|---|---|---|---|
| Borbón Rosado - Natural [La Pradera] | 88.50 | Red | **Tiryan** |
| Tabi - Honey [La Pradera] | 87.00 | Black | **Gold** |
| Gesha (Ragonvalia) - Lavado [La Fortaleza] | 86.25 | Gold | **Blue** |
| Tabi - Doble Fermentado [Las Cruces] | 85.00 | Gold | **Blue** |
| Castillo - Doble Fermentado [La Pradera] | 84.50 | Tiryan | **Red** |
| Castillo - Lavado [La Pradera] | 84.25 | Tiryan | **Red** |

⚠️ **Tres de esas seis se volvieron a mover el mismo día (V4.44)** al corregirse la escala: Gesha 86.25 → **Gold**,
Castillo Doble Ferm. 84.50 → **Blue**, Castillo Lavado 84.25 → **Blue**. El estado final está en el Log V4.44.

⚠️ **Y una corrección a esta misma nota, que a su vez hubo que corregir horas después (V4.44).** Aquí se
escribió que «la escala numérica de Notion nunca estuvo mal» porque sus `Min SCA` / `Max SCA` coincidían
exactamente con `src/lib/grados/definicion.ts`. Coincidían — **y los dos estaban mal**. El owner corrigió el
2026-08-19 que la escala real es **de dos en dos** (80–82 · 82–84 · 84–86 · 86–88 · 88+), no la de
80–82.99 · 83–84.99 · 85–86.99 · 87–87.99 que este repo llevaba afirmando desde el 2026-08-05.
**La lección**: «Notion coincide con el código» no es lo mismo que «está bien». Se comprobó la consistencia
entre dos copias y ninguna de las dos era la fuente — la fuente era el owner. Ver V4.44.

⚠️ **DOS FICHAS QUE ESTA NOTA NO VIO, y eran peores que un descuadre:** «Cenicafe 1 - Lavado [Cafe Semilla]» y
«Castillo - Lavado [La Hacienda]» llevaban un grado enlazado **sin ningún `SCA`** — un grado afirmado sin nada
detrás. Decisión del owner (2026-08-19): rellenarlas, porque son material de muestra. Se puso **81.50** en
Cenicafe (dentro de Black, el grado que ya tenía, y **el mismo número que usa `sneakPeekMock.ts`** en la tarjeta
7) y **83.75** en Castillo [La Hacienda] (dentro de Red, el grado que ya tenía).
**Los dos van marcados en su `Notas de Perfil`** como PUNTAJE DE RELLENO, no de laboratorio, con la fecha y la
instrucción de sustituirlos antes de usar la ficha para nada comercial — misma regla que las fichas PDF de
muestra, que van selladas «MUESTRA» justamente porque sus números son inventados.

**Verificado con la función de la casa**, no a ojo: las 9 fichas con puntaje se pasaron por `gradoPorPuntaje()`
de `definicion.ts` y **las 9 cuadran**. Las otras dos (Chiroso, Caturra) siguen sin puntaje y sin grado, que es
coherente: no afirman nada.

✅ **Y las dos cosas que aquí se dieron por no-tocar quedaron hechas en V4.44**, cuando el owner corrigió: la
página se llama ya **«Tyrian»** y su `Definicion` dice **SCA+88**, igual que su `Min SCA`. Las cinco
definiciones se reescribieron para que su texto concuerde con su número (SCA+80 · +82 · +84 · +86 · +88).

ℹ️ **Por qué esto NO quedó como guardián**: no hay credenciales de Notion en el repositorio (`.env.local` no
tiene ninguna), así que un espejo ejecutable como `qa-tools-seo-espejo.mjs` no se puede escribir hoy. Es el
requisito que falta para el «espejo Notion» que pide `docs/INTEGRACIONES_PLAN.md` §1 — y sin él, esto vuelve a
descuadrarse sin que nadie se entere.


Found today while reading the schema (small, safe, owner's call before any migration):
- `public_lot_catalog` (a join view) has `INSERT/UPDATE/DELETE/TRUNCATE/…` granted to `anon` and `authenticated`
  next to `SELECT`. Ineffective on a non-updatable view, but untidy — `REVOKE ALL … ; GRANT SELECT` in a hygiene
  migration. Same check for `public_transparency_pricing`.
- Once PR-A lands: tighten the passport Server Actions from `requireActiveAdmin` to `requireConsoleWrite("ocp")`
  (behaviour change → its own small PR).
- The former workspace folder on the OneDrive Desktop stays empty and stays put (dev to-do 3 above). The
  transcript leftover in the old Claude memory key can still be tidied — see the `project_workspace_move`
  memory note for the paths; they are not written here because **this repo is public and those paths carry
  the owner's Windows username**.
- **Pre-existing, same reason:** `docs/HANDOFF.md` and `docs/RED_IDENTIDAD_ANALISIS.md` already contain that
  username inside example paths. Harmless in itself, but the repo is public and the standing rule is that no
  user-named path goes in — worth a scrub pass in one of the PRs below (docs-only, no code).

---

## 10. Explicitly not in this plan

CommaaS hub work (own sessions, `C:\dev\commaas-hub`, plan `commaas/docs/HUB-PIVOT-PLAN.md`) · GVG-Space
migration to CommaaS (F13: it just re-hangs under BCP here) · the multi-node socio blocker (`partner_accounts`
PK) · any pricing/model change in the Green store beyond D0.5 · the Estudio's app workshop.
