# V5 · Plan de consolas — the CTC Platforms re-org (written 2026-08-17)

**Status: PLAN. Nothing in here is built.** This is step (i) of F14 in
`docs/ESTADO_Y_PREGUNTAS_2026-08-17.md` ("freeze names + write the plan doc"), written from
the new workspace (`C:\dev\ctc-platforms`, repo `main` at `e4da7ed`, production **V4.15**).

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
5. **`npm audit` stays at 0.** Nothing here needs a new dependency.
6. **Vocabulary is frozen by §2** — use it in code comments, nav labels, docs and commit messages from step (i) on.

---

## 1. Step 0 — «Active Catalogue Sneak Peek» + the 7 mock lotes  ← FIRST

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
computed from its score: Black 80–82.99 · Red 83–84.99 · Blue 85–86.99 · Gold 87–87.99 · Tyrian 88–100.

**One ficha is excluded on purpose:** «Borbón Rosado - Natural [La Pradera] 2026_1», **SCA 88.5 → Tyrian**.
Tyrian is auction-only and `publishLot` refuses it in the catalogue, so it cannot appear in a catalogue teaser
(it belongs in a future «Subasta Tyrian» teaser). The 7th card is therefore built from the «Cenicafe 1» stub,
and the ladder becomes **2 Gold · 2 Blue · 2 Red · 1 Black** — this **supersedes the D0.7 default ladder**:
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
- **#2** the title says «Bourbon» but the `Variedad` field says `Castillo`. The card shows **Bourbon** (the
  title is what a buyer would have been told); needs the owner's word.
- **#3** `Pertenece a Finca` points to **La Floresta** (confines, Santander, 1 300 m) while the title says
  «(Ragonvalia)» and `Supplier Name` is «La Fortaleza / Wilmer R» — and a finca **La Fortaleza** (Ragonvalia,
  Norte de Santander, **1 700 m**) does exist with no ficha linked. The card uses La Fortaleza · Ragonvalia ·
  1 700 m (coherent with title + supplier; a Gesha scoring 86.25 fits 1 700 m far better than 1 300 m). The
  Notion relation looks mis-linked.
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

### 1.5 The component

`src/components/catalogo/SneakPeek.tsx` (+ `SneakPeek.module.css`), a **client** component:

- Props: `lang: Lang` (passed by the surface — Home and KR use `components/lang/i18n`, the Cherry Picked family
  uses `components/cherry-picked/i18n`; both define the same `"es"|"en"|"de"` union, so the module takes the value
  and hooks neither provider), `variant?: "home" | "kr" | "cp"` (only accent/CTA copy), `ctaHref` (D0.4).
- Marquee mechanics copied from `MarketTicker`: a strip + an `aria-hidden` duplicate for a seamless loop, CSS
  animation, **pause on hover/focus**, `prefers-reduced-motion` → static row with horizontal scroll, keyboard
  reachable, `role="region"` with a trilingual `aria-label`.
- A card: grade seal/colour (`--t-<grade>` tokens) · name · SCA with «est.» when `scoreEstimated` · finca ·
  municipio, departamento · altitude · variety · process · one line of cup · the season tag (mocks). Whole
  card = one link (D0.4).
- Header line above the band (trilingual): ES «Un vistazo al Catálogo Activo — el catálogo completo se ve dentro
  de Cherry Picked» · EN «A sneak peek at the Active Catalogue — the full catalogue lives inside Cherry Picked»
  · DE «Ein Blick in den aktiven Katalog — der vollständige Katalog liegt in Cherry Picked». Copy is a
  per-component dictionary like `HomeBand`'s.
- Empty/failed → renders nothing (never an empty bar).

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
  **2 Gold · 2 Blue · 2 Red · 1 Black**, not 1/3/2/1. Real data wins; no new decision needed.
- **D0.8 Which season is "last season"** — ✅ accepted: «cosecha principal 2025-26 (venta abr–jul 2026)», which
  Notion's own `Harvest Season` (2025-Q4 / 2026-Q1) corroborates.

Two things in §1.4 do need the owner's word eventually, but **neither blocks the build** (both ship with the
value shown in the table and a `// GAP:` / `// ⚠` comment): the **Bourbon-vs-Castillo** variety on card #2 and
the **mis-linked finca** on card #3 (La Floresta vs La Fortaleza).

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

## 2. Step (i) — Freeze names (F1 · F9 · A7 · A1)  → V4.17

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

Also in this PR: the "planned" warnings in the architecture map (`direccionamiento`, the PDF's ANN) get a
pointer to this file; `docs/ESTADO_Y_PREGUNTAS_2026-08-17.md` §0 gets a line "F14(i) done → V5_CONSOLAS_PLAN.md".

---

## 3. Step (ii) — Nav + route moves, console by console, with 308s (F2)

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
`src/**/*.{ts,tsx}`; **20 files** call `revalidatePath("/bcp|/ecp|/ocp…")`. Plus: the three console dashboards,
`EstructuraModal.tsx` (`PanelDiagram`), `qa-nav-check.mjs`, `next.config.ts` (documentación), any email template
that links into a console (grep `ctcexport.com/bcp` and `"/bcp/` in `src/lib/email`), the KR next-step API,
and the docs DICT/FILETREE. It is mechanical but wide — which is exactly why each console is its own PR and why
the guardian in §3.4 exists.

### 3.3 The order of the three PRs (default)

| PR | Version | Receives | From | Size |
|---|---|---|---|---|
| **PR-A «OCP recibe el pasaporte»** | 4.18 | Productores, Fincas, Lotes, Nominados, Arena, Galardonados, Club, Catálogo (+Contratos, Subastas), Black Stock, CRM CaaS; the KPI dashboard | BCP | biggest (the 127) |
| **PR-B «BCP recibe dirección y configuración»** | 4.19 | Direccionamiento (+grados), Usuarios, Documentación, Mapa, Consumo, Automatizaciones, GVG-Space; Socios de la red | ECP, OCP | medium; touches `next.config.ts` |
| **PR-C «ECP recibe contacto y toolbox»** | 4.20 | Leads, Cotizadores ×3, Anclas, Transcripciones; Manejo de Plataformas standalone | OCP, own | medium |

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

### 3.5 The guardian: `scripts/qa-rutas-consolas.mjs` (new; `qa-nav-check` stays as is)

Asserts, against the real `CONSOLES` and the file system: (a) **every rail href has a `page.tsx`** under
`src/app/<console>/(app)/…`; (b) every `RUTAS_MOVIDAS.de` has a stub file and its `.a` has a page; (c) no file
under `src/` (except the stubs and `rutasMovidas.ts` itself) contains a moved old path as a string literal;
(d) no rail href is a prefix-collision of another without a page in between (the 08-16 lesson); (e) no `de` is
also an `a` of another entry (no chains). Runs in the gate for PR-A/B/C and stays forever.

---

## 4. Step (iii) — New modules (F3 · F4 · F5 · F6 · F7)  → V4.21 … V4.25 (one PR each)

| # | Module | Where | What (default design) | Data | Open point (default) |
|---|---|---|---|---|---|
| iii-1 | **CTC Selection** umbrella | `/ocp/ctc-selection` with tabs «Black Stock» (today's module, moved under it; `/ocp/black-stock` and `/bcp/black-stock` stubs → final) and «Selección» (pipeline for Red/Blue/Gold bought outright + acquired inventory) | Generalise `black_negotiations` with a `grade` column (default `black`) instead of a second table; publication: Black → Green's Black tab as today; other grades → Green catalogue **with CTC as the producer name** | `black_negotiations`, `lot_listings`, `purchase_contracts` | "CTC as the producer" needs a CTC-owned producer profile + finca rows for `public_lot_catalog` to join through — **decision D3.1**: create the «CTC · Selection» producer identity (default yes, one row, owner-only) |
| iii-2 | **CRM CP Green** | `/ocp/crm/green` | kanban over buyers: nuevo → activo → recurrente; card = profile, tier/points, reservations, orders; `LeadsBoard` pattern parametrised | `buyer_profiles` (+ new `crm_stage` column with an auto-suggestion from `orders`) | D3.2 stage rule (default: 0 orders = nuevo, 1 = activo, ≥ 2 = recurrente; manual override) |
| iii-3 | **CRM CP Roast · CRM CP X** | `/ocp/crm/roast`, `/ocp/crm/x` | «interés» boards over `newsletter_subscribers` (source roast / x) + future leads | `newsletter_subscribers` | none — F5 default |
| iii-4 | **Red de Socios cards** | `/bcp/socios/<nodo>` ×5 | placeholder page per node with the credential state from `partner_accounts` (invited/active/suspended, last login) and the node's landing/login links; built out one partner profile at a time | `partner_accounts` | F3 default (c) |
| iii-5 | **Definición de contexto rework** | `/bcp/direccionamiento` tab 1 | keep the 3 questions per unit; units CTCx / KR / CP / **Value Ecosystem**; strip FORMATS/DERIVABLES/moodboard/referencias; three placeholder subtabs «Misión y Visión», «Modelo Económico», «Contexto de Mercado Global»; keep stored answers to the three kept questions, drop video-only fields | the direccionamiento table (**read it before touching**; owner: "I can check the table") | D3.3 what to do with the moodboard data-URIs (default: export once to `docs/archive/`, then drop; the 8 MB `serverActions.bodySizeLimit` in `next.config.ts` can come back down afterwards) |

`Manejo de Plataformas` standalone (F6) is a route move → it ships in **PR-C**, not here.

---

## 5. Step (iv) — HC as a login module + in-app shell + per-tool grants (A2 · A5 · A6 · F8)  → V4.26+

- **Membership** (`src/lib/identidad/matriz.ts`): `herramientas` requires an account that is a KR producer **or** a
  CP buyer (same producer ⊕ buyer exclusion as today); no third identity is created. `/herramientas` landing stays
  public (Class B-like) but the tools open only after login.
- **Shell**: every tool opens inside `/kaffetal-regal/herramientas/<slug>` or `/cherry-picked-green/herramientas/<slug>`
  (surface-owned routes → the proxy prefix is right by construction) with header «← Volver a Kaffetal Regal /
  Cherry Picked», tool name, Plus/locked badge, help; the tool HTML is untouched at `/tools/h/<slug>` (public,
  outside the proxy matcher — keep it there). **"Safe" back-navigation** = the shell keeps the previous panel URL
  and returns to it (owner's A5 emphasis).
- **Grants per user per tool**: new table `tool_user_grants(user_id, tool_id, granted_at, granted_by, source
  'manual'|'payment', expires_at null)`; `tools_plus_grants` (per user, all Plus tools) is read as a legacy
  wildcard until migrated, then dropped. Locked tools stay **visible** with «Solicitar» → a request row the ECP ·
  Herramientas module lists; the payment trigger later writes `source='payment'` on the same row.
- Verification: `qa-terminos-check`-style guardian for the access rule; drive KR/CP as QA producer/buyer.
- Decision D4.1: does the request («Solicitar») also email `info@` (via Resend, like leads)? Default: yes, one
  line, same sender rules as leads (never swallow the send result).

---

## 6. Step (v) — CTC Tech / Varietales inside KR + «Cherry Picked CaaS» → OCP (A3)  → V4.27+

- **CTC Tech / Varietales sub-modules in KR**: the producer continues the conversation started on the landing
  inside the KR hub. Requires linking a `leads` row to a `profiles` row (today leads are anonymous captures).
  Default D5.1: match on verified email at KR login (lead.email = auth email → offer «vincular»), then a «Mis
  conversaciones» module in the KR hub reading the linked leads + their ECP replies. Landings keep depositing into
  `leads` (`pillar` `tech` / `varietales` — CHECK-constrained, do not rename).
- **«Cherry Picked CaaS» landing → OCP CRM CP CaaS**: `/caas` already deposits `pillar='cocreate'` (the key stays
  `cocreate`, the brand is CaaS); after PR-A the kanban is `/ocp/crm/caas`. New: the thank-you state prompts the
  creation of a Cherry Picked login (CTA → portada login modal), and a lead that later logs in is linked as in D5.1.

---

## 7. Cadence, versions, wraps

| When | What |
|---|---|
| Step 0 | V4.16 (Sneak Peek + mocks) |
| Step (i) | V4.17 (names) |
| Step (ii) | V4.18 / 4.19 / 4.20 (PR-A/B/C) → **Version Wrap V37** of the docs |
| Step (iii) | V4.21–4.25 |
| Step (iv) | V4.26+ |
| Step (v) | V4.27+ → **owner declares V5.0** ("the consoles re-org is complete") → Version Wrap V38 |

Every PR: Log entry sealed with sha · HANDOFF touched · DICT touched · memory note `project_structure_reorg_2026_08_17`
updated with "done through step X".

---

## 8. Decision register of this plan (all with defaults — "defaults except …" works)

| # | Question | Default |
|---|---|---|
| D0.1–D0.8 | Sneak Peek placement · live/mock mix · fields · click · gate Green behind login · mock storage · grade ladder · which season | ✅ **ALL ACCEPTED 2026-08-17** (§1.6). D0.5 = (a) extended to every CP landing: the module replaces the direct catalogue for visitors. D0.7's ladder is superseded by the real Notion references (2 Gold · 2 Blue · 2 Red · 1 Black) |
| D0.9 | Card #2: variety «Bourbon» (title) vs `Castillo` (field) | ships as **Bourbon**, flagged in code; owner confirms later |
| D0.10 | Card #3: finca relation «La Floresta» vs title/supplier «La Fortaleza · Ragonvalia» | ships as **La Fortaleza · Ragonvalia · 1 700 m**, flagged in code; owner confirms later |
| D2.1 | Rename `HubLanding.tsx` → `PortadaLanding.tsx`? | **No** in step (i); vocabulary only. Rename opportunistically in step (v). |
| D3.1 | Create a CTC-owned producer identity for CTC Selection lots | Yes, one owner-only row |
| D3.2 | CRM CP Green stage rule | 0/1/≥2 orders, manual override |
| D3.3 | Direccionamiento moodboard data | export to `docs/archive/`, then drop |
| D3.4 | PR order A → B → C vs B → A → C | A → B → C |
| D4.1 | «Solicitar» emails info@ | Yes |
| D5.1 | Lead ↔ profile linking rule | verified-email match at login + explicit «vincular» |
| D7.1 | When is V5.0 declared | end of step (v) |

---

## 9. Owner-owed and hygiene items carried alongside (not blocking, not forgotten)

From ESTADO §3.5 (unchanged): Search Console `www` property + sitemap · GDPR privacy policy (subprocessors
Resend, AssemblyAI, Anthropic, Google) · Nequi number for the Arena fee (`src/lib/arena/payment.ts`) · Varietales
landing material · Terratalento grey door (`soon: true`) · two YouTube embeds on `Yird1_j6yqo` · Gemini price
in `precios.ts` · Canva scenario in Make · Coffeed 5 media without feed · Supabase leaked-password toggle (D21) ·
worker narrow credential (F10, backlog).

**Found in Notion while collecting the mock references (2026-08-17) — data hygiene in «📋 Fichas Técnicas de
Café», owner's call, nothing changed by me** (I only read the database; the platform stays the source of truth
for grades):

| Ficha | `SCA` | Grade Notion links | Grade the score dictates | |
|---|---|---|---|---|
| Borbón Rosado - Natural [La Pradera] | 88.50 | Red | **Tyrian** | ✗ |
| Tabi - Honey [La Pradera] | 87.00 | Black | **Gold** | ✗ |
| Bourbon - Honey [La Pradera] | 87.00 | Gold | **Gold** | ✓ |
| Gesha (Ragonvalia) - Lavado [La Fortaleza] | 86.25 | Gold | **Blue** | ✗ |
| Tabi - Doble Fermentado [Las Cruces] | 85.00 | Gold | **Blue** | ✗ |
| Castillo - Doble Fermentado [La Pradera] | 84.50 | Tiryan | **Red** | ✗ |
| Castillo - Lavado [La Pradera] | 84.25 | Tiryan | **Red** | ✗ |

Also in that workspace: the grade page is spelled **«Tiryan»** (should be *Tyrian*), and its `Definicion` says
"SCA+89" while its own `Min SCA` field says 88 — the platform's definition is **88.00–100** (`definicion.ts`).
Same family of drift as the two contradictory Notion pages that forced the grade scale into code on 2026-08-05;
the fix is for Notion to mirror `src/lib/grados/definicion.ts`, per `docs/INTEGRACIONES_PLAN.md` §1. Worth a
pass before the fichas feed anything real, and a candidate for the Make/Notion espejo already in the spine.

Found today while reading the schema (small, safe, owner's call before any migration):
- `public_lot_catalog` (a join view) has `INSERT/UPDATE/DELETE/TRUNCATE/…` granted to `anon` and `authenticated`
  next to `SELECT`. Ineffective on a non-updatable view, but untidy — `REVOKE ALL … ; GRANT SELECT` in a hygiene
  migration. Same check for `public_transparency_pricing`.
- Once PR-A lands: tighten the passport Server Actions from `requireActiveAdmin` to `requireConsoleWrite("ocp")`
  (behaviour change → its own small PR).
- The former workspace folder on the OneDrive Desktop is now empty but still there (this session was rooted in
  it) — delete it once no session is rooted there, together with the transcript leftover in the old Claude
  memory key (see the `project_workspace_move` memory note for both paths; they are not written here because
  **this repo is public and those paths carry the owner's Windows username**).
- **Pre-existing, same reason:** `docs/HANDOFF.md` and `docs/RED_IDENTIDAD_ANALISIS.md` already contain that
  username inside example paths. Harmless in itself, but the repo is public and the standing rule is that no
  user-named path goes in — worth a scrub pass in one of the PRs below (docs-only, no code).

---

## 10. Explicitly not in this plan

CommaaS hub work (own sessions, `C:\dev\commaas-hub`, plan `commaas/docs/HUB-PIVOT-PLAN.md`) · GVG-Space
migration to CommaaS (F13: it just re-hangs under BCP here) · the multi-node socio blocker (`partner_accounts`
PK) · any pricing/model change in the Green store beyond D0.5 · the Estudio's app workshop.
