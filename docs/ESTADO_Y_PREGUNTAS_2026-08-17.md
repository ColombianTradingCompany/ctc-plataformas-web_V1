# Estado del proyecto y preguntas de desambiguación — 2026-08-17

Written at the owner's request after several messy sessions, to fix the ground before continuing.
Input: the repo (code + `docs/`), the memory notes, and the owner's PDF **"CTC Platforms Structure"**
(3 pages — BCP / OCP / ECP — parked at `reference_html-vision-board/ctc-platforms-structure-2026-08-17.pdf`,
plus the two-box "CTC Platforms | CommaaS Hub" image sent with it).
§1–§3 were verified against code/git today; §0 records the owner's answers; §5 is what is still open.

---

## 0. Decision record (owner, 2026-08-17 — answers to §4)

**Structure & memberships**
- **A1** BCP = **Base Control Panel** (canonical expansion). *(The PDF's BCP box says "Business" — see follow-up F1: mission word vs. expansion.)*
- **A2** **HC (Herramientas del Café) becomes a login module** with the same rule as DC: entered with the same credentials as either KR or CP.
- **A3** Coffeed = public wall, any platform, no login. **CTC Tech** = landing that sends a message to **ECP → Contacto**, and *also* lives as a **sub-module inside the KR login** to carry on the conversation. **Varietales** = same as CTC Tech. **"Cherry Picked CaaS"** = a landing that sends a project to **OCP → CRM CP CaaS** and prompts the creation of a Cherry Picked login. **Black Stock** lives only in **OCP**, combined with **"CTC Selection"** = lots directly purchased by CTC to be sold by CTC as the producer (negotiated and bought *before* being sold — unlike the **"Contratos Vigentes"** placed in CP).
- **A4** CP has **4 funnels** (CaaS · Green · Roast · X) that must be split and each work with its own logic (→ four CRMs in OCP, PDF p.2).
- **A5** HC rule = option **(a)**: login required; account must be a KR producer or a CP buyer; same producer⊕buyer exclusion as today; **Plus must be activated** (grant). **IMPORTANT: the tools must work *inside* the webapp, with "safe" buttons/menus that let the user return to their previous work.**
- **A6** HC is DC-like but adapted: not a community, a **single-user set of applications**; some tools are **visible but not available** (to create desire); the owner **activates them per user, individually**; eventually a **payment trigger** activates them.
- **A7 / B10** One name: **CommaaS**. "GV Toys Hub" is dropped. The hub's admin is the CommaaS Backstage; the old app is **CommaaS-OG**, an independent module (tenant).
- **A8** **GVG-Space** (`/ecp/gvg`, personal) → moves to the CommaaS side (later, as a tenant app).
- **A9** The tools built in CommaaS-OG will be pushed into the **Estudio de Contenido**, where the owner will review usefulness and keep/delete.

**Vocabulary**
- **B11** ("hub" — three meanings) — owner didn't follow the question; re-asked in plain words as F9 below.
- **B12** Manejo de Plataformas: OK as "Direccionamiento's 3rd tab + shortcut" — **but PDF p.3 draws it as its own module under ECP → Plataformas while Direccionamiento moves to BCP**; see F6.

**Cleanup — all approved and DONE this session (see §6)**: C13 archive PROXIMA_SESION · C14 HANDOFF pass · C15 log SHAs + missing entry · C16 **Version Wrap V36 done** (`Documentacion_Interactiva_V36.0(48bac75).html`) · C17 battery persisted as `docs/architecture/validate_snapshot.mjs`.

**Security / infra**
- **D18** Owner **rotated** the AssemblyAI webhook secret and put it "in the .env file" → F11: it must also be in **Vercel → Production** + redeploy.
- **D19** Repo stays **public** for now; may go private later (fix Vercel's GitHub App access first, verify with a test commit).
- **D20** (worker uses the service_role key) — owner didn't follow; re-explained in F10; default = backlog.
- **D21** Turn on leaked-password protection — **owner action** in the Supabase dashboard (org is Pro now).
- **D22** "What 3 projects? All stay on the ctcexportmain@gmail.com account" → Vercel (Pro team) is under ctcexportmain; the hub plan's "Vercel stays under contacto@ Hobby" is **outdated** (fix in the hub session, F12).

**Workspace move & order**
- **E23** Move to `C:\dev\ctc-platforms` + `C:\dev\commaas-hub`: "I guess so" → planned for the next fresh session, with the checklist in `_WORKSPACE-MOVE-PLAN.md`.
- **E24** Display names "CTC Platforms" / "CommaaS Hub", hyphenated folders — confirmed.
- **F25** Order confirmed: (1) housekeeping + V36 wrap → (2) workspace move → (3) the re-org → (4) hub in its own sessions → (5) owner-owed items.

**Second round (owner, 2026-08-17 evening): "defaults on all follow-ups" — F1–F14 of §5 are DECIDED as their defaults:**
- **F1** Acronyms unchanged — BCP = Base Control Panel, OCP = Operational Control Panel, **ECP = Executive Control Panel**; "Business / Operation / Execution" are the mission subtitles (taglines: BCP «El negocio: dirección, configuración y red de socios» · OCP «La operación: del productor al catálogo» · ECP «La ejecución: plataformas, contacto y caja de herramientas»).
- **F2** **URLs move with the modules** (route folders + permanent redirects from the old paths), one console per PR, `qa-nav-check` extended to assert every nav href has a page.
- **F3** Red de Socios cards in BCP = **placeholders + credential state** per node; built out one partner profile at a time.
- **F4** **CTC Selection = the umbrella** (any grade bought outright, pipeline + inventory); **Black Stock = its Black-grade branch** (existing tables); Black publishes to Green's Black tab as today, other grades bought outright publish in the Green catalogue with **CTC as the producer name**.
- **F5** CRM CP Green = buyer accounts + reservations/orders (kanban nuevo → activo → recurrente); CRM CP Roast / X = `newsletter_subscribers` (roast|x) + future leads; CRM CP CaaS = today's `/bcp/caas` moved.
- **F6** Manejo de Plataformas becomes a **standalone ECP module** under Plataformas when Direccionamiento moves to BCP; Grados de Calidad stays a subtab of Direccionamiento.
- **F7** Definición de contexto: keep the 3 questions per unit; units CTCx / KR / CP / **Value Ecosystem** (= the six ECP platforms); strip formats/derivables/moodboard/referencias; add the 3 placeholder subtabs; keep stored answers to the 3 kept questions, drop video-only fields.
- **F8** HC tools open inside a **shell** (← back to KR/CP, tool name, Plus/locked badge; tool HTML untouched at `/tools/h/<slug>`); activation becomes **per user per tool** (payment trigger later on that same row); locked tools stay visible with «Solicitar».
- **F9** "hub" reserved for **CommaaS**; Cherry Picked's front page = **portada de Cherry Picked**; `/panel` = **selector de consolas**.
- **F10** Worker narrow credential → **backlog** until a second person/machine runs a worker.
- **F11** Rotated webhook secret in **Vercel → Production**: **verified 2026-08-17 evening** — a POST without header to `https://www.ctcexport.com/api/transcripciones/callback` answers **401** (secret configured; 503 would mean none), and Vercel shows a manual redeploy of `48bac75` ~50 min after the rotation. Closed.
- **F12** Vercel under ctcexportmain (Pro team, 3 projects); hub plan §0.3 to be corrected in the hub session.
- **F13** GVG-Space stays owner-only in place; re-hung under BCP → Configuración del Sistema at re-org time; migrates to CommaaS later.
- **F14** Re-org order: (i) freeze names + plan doc `docs/V5_CONSOLAS_PLAN.md` → (ii) nav + route moves console by console with redirects → (iii) new modules (CRM CP ×3, CTC Selection, partner cards, Definición rework) → (iv) HC as membership + shell + per-tool grants → (v) CTC Tech/Varietales sub-module in KR + Cherry Picked CaaS → OCP. One PR + `APP_VERSION` bump per step.

---

## 1. Where we are (verified)

| Fact | Value |
|---|---|
| Production version | **V4.15** (`src/lib/version.ts`), `main` clean at review time, last commit `48bac75` (2026-08-17) |
| Repo | `ColombianTradingCompany/ctc-plataformas-web_V1` — **PUBLIC** (making it private broke Vercel deploys today; reverted) |
| Surfaces | 19 subdomains in `src/lib/red/subdominios.ts`; 3 internal consoles in `src/lib/panel/consoles.ts` |
| Infra | Supabase **Pro** ($25/mo, project `sjznkzvefqfcysczllli`, only project in the CTC org) + Vercel **Pro** ($20/mo, team under ctcexportmain). CommaaS project moved to its own Free org "CommaaS Hub" |
| Docs of record | `AGENTS.md` (V4.0 snapshot + rules) → `docs/HANDOFF.md` (living) → `docs/architecture/` snapshot **V36.0(48bac75)** (wrapped 2026-08-17 evening) + open **Log V36** |
| Second workspace | CommaaS Hub at `C:\dev\commaas\commaas-blueprint` — pivoted 2026-08-16 to the owner's personal deployment hub; plan `docs/HUB-PIVOT-PLAN.md`, §9 decisions answered 2026-08-17. Live DB paused (not deleted). First tenant: Tuki Take |
| Workspace move | Planned (`_WORKSPACE-MOVE-PLAN.md`), **not executed** — must run in a fresh session |

### What shipped since the V4.0 baseline (2026-08-13)
- **4.1–4.4** Open Graph, robots/sitemap per host, JSON-LD on 19 surfaces (`b362921`, `f1118f3`, `59e3524`, `3f2be94`).
- **4.5** Co-Create → **CaaS · Coffee as a Service** (`/caas`, `/bcp/caas`, 308 from old routes; lead pillar stays `cocreate` on purpose) (`c70573b`).
- **4.6** Cherry Picked hub: CaaS seal, background video, programme cards (`0931345`).
- **4.7** Canonical → `www` + route; **tools registry** (`tools` + `tool_versions`, `/tools/h/<slug>`, interna/compartible); **Manejo de Plataformas** as Direccionamiento's 3rd tab (`platform_surfaces`) (`10c9016`).
- 08-16, no bump: rail shortcut to Manejo de Plataformas + `navActivo.ts` (`b3f96e6`); sitemap trailing-slash fix (`f3265e2`, was unlogged — logged today).
- **4.8–4.15** OCP · Transcripciones arc: archive → audio queue + local GPU worker → AssemblyAI cloud path → heartbeat → `.bat` starters → downloadable installer → tool moved into repo `tools/transcriptor/`.
- Infra day: Supabase + Vercel to Pro; repo private/public incident.

---

## 2. The PDF vs. what exists

### 2.1 The two-box image — "CTC Platforms | CommaaS Hub"
| Element | Exists today as | Note |
|---|---|---|
| **Admin Interface (ECP, BC, OCP)** | Master login `/login`+`/verify` → `/panel` chooser → `/bcp`, `/ecp`, `/ocp` | "BC" = BCP (A1) |
| **Landing/Home pages** | CTC Home `/`; Class B captures `/ctc-tech`, `/varietales`, `/caas`; `/coffeed`; `/control-panel`; `/herramientas` landing | Everything with no login |
| **Plataformas de Socios** | 5 `socios/*` couples (landing + `/acceso` + `/panel`); Estudio hosts Source Wrapper, Datawave, RT-Scriptor | Multi-node socio still blocked on `partner_accounts` PK |
| **KR · CP · DC · TT · HC** (stack) | KR, CP family, Directorio, Terratalento — memberships in `src/lib/identidad/matriz.ts`; **HC is not yet a membership** (A2/A5 make it one) | HC change = new work |
| **CommaaS · Backstage · App 1…N** | HUB-PIVOT-PLAN; nothing built yet | "GV Toys" dropped (A7) |

### 2.2 The three console pages — the console re-org (NEW, not built)
Legend: **[today]** = where the module lives now (`src/lib/panel/consoles.ts`); **NEW** = no module today.

**BCP · "Business"** (today: the lot passport — becomes direction + configuration + partner network)
| Group | Module (PDF) | Today | Note |
|---|---|---|---|
| Business Core | **Direccionamiento** | `/ecp/direccionamiento` (tabs: Definición de contexto · Grados de Calidad · Manejo de Plataformas) | PDF note: rework *Definición de contexto* — keep the 3 questions (Producto / Cliente / Contexto) as the "North Star", define **4 units: CTCx, KR, CP, Value Ecosystem** (the last not there now), **strip the video-content-tool parts** (Video largo/corto plus/fast, derivables, moodboard/referencias — today's `DefinicionDeContexto.jsx` FORMATS/DERIVABLES), keep **Grados de Calidad** as a subtab, add placeholders **Misión y Visión de CTC**, **Modelo Económico del Negocio**, **Contexto General de Mercado Global del Café** |
| Configuración del Sistema | Usuarios y credenciales · Documentación del sistema · Mapa de Trabajo · Consumo de IA · Automatizaciones | all `/ecp/*` (ECP · IT y Plataforma) | move ECP → BCP |
| Red de Socios | Socios de la red (Credenciales) | `/ocp/socios` (ownerOnly) | move OCP → BCP |
| | Estudio de Contenido · Centro de Calidad · Agente de Carga · Agente de Nacionalización · Master Roaster | **NEW** — no console module per node today (partner nodes are external couples) | see F3 |
| *(not drawn)* | GVG-Space | `/ecp/gvg` | → CommaaS later (A8); stays owner-only meanwhile (F13) |

**OCP · "Operation"** (today: leads reception + socios + cotizadores — becomes the whole lot passport + the CP funnels)
| Group | Module (PDF) | Today | Note |
|---|---|---|---|
| Kaffetal Regal | Productores · Fincas · Lotes | `/bcp/*` | move BCP → OCP |
| KR Arena | Nominados · Arena · Galardonados · Kaffetal Club | `/bcp/*` | move BCP → OCP |
| Catálogo | Catálogo Cherry Picked (Contratos Vigentes) | `/bcp/catalogo` (+ contratos/subastas tabs) | move; "Contratos Vigentes" = the pre-sold contract model |
| | **Black Stock & CTC Selection** | `/bcp/black-stock` | move + **CTC Selection is a NEW concept** (see F4) |
| Cherry Picked | CRM CP CaaS | `/bcp/caas` | move BCP → OCP |
| | CRM CP Green · CRM CP Roast · CRM CP X | **NEW** | see F5 for what feeds them |
| *(leaves OCP)* | Leads · Recepción → ECP Contacto; Socios → BCP; Cotizadores + Anclas + Transcripciones → ECP Toolbox | | |

**ECP · "Execution"** (today: direction + IT + platforms — becomes platforms + contact + internal toolbox)
| Group | Module (PDF) | Today | Note |
|---|---|---|---|
| Plataformas | Manejo de Plataformas | tab of `/ecp/direccionamiento` + rail shortcut | becomes standalone when Direccionamiento leaves (F6) |
| | Directorio del Café · Coffeed · Herramientas del café · Terratalento | `/ecp/*` | stay |
| Contacto | Buzón de entrada | `/ecp/buzon` | stay |
| | General Leads · Recepción | `/ocp/leads` | move OCP → ECP |
| | CRM CTC Tech · CRM Varietales | `/ecp/*` | stay |
| Internal Toolbox | Lotes de café · Logístico · Costo de empaque · Anclas de mercado · Transcripciones | `/ocp/*` | move OCP → ECP |
| *(leaves ECP)* | Direccionamiento + the whole IT y Plataforma group → BCP; GVG-Space → CommaaS | | |

**Size of the move**: BCP loses 11 modules to OCP and gains 6 from ECP + 1 from OCP (+5 partner cards); OCP loses 8 and gains 11 + 3 new CRMs; ECP loses 7 and gains 6. Every `href` in `consoles.ts`, every route folder under `src/app/{bcp,ecp,ocp}/(app)/`, the `revalidatePath` lists, `PanelDiagram` in `EstructuraModal.tsx`, `qa-nav-check.mjs`, and the docs' DICT are touched. It is mechanical, but wide — it needs its own phased plan (F2).

### 2.3 The identity matrix today (`src/lib/identidad/matriz.ts`)
- One `auth.users` identity, several memberships: `productor ⊕ compradorReal ⊕ recolector ⊕ socio` are mutually exclusive; **`directorio` composes with all**; `admin` = bcp_admin.
- Memberships that count for the network switcher: KR, CP, DC, TT, interno. **HC and Coffeed are "open modules"**, no membership. A5 turns HC into a gated module (KR or CP account required); DC is not touched by the answers.

---

## 3. Sources of confusion found (with locations) — status after today's cleanup

### 3.1 Naming drift
- **CaaS** (Coffee as a Service, CTC) vs **CommaaS** (the personal hub) vs **CommaaS-OG** (the original app as a tenant). Settled by A7/B10; the DICT must distinguish them (logged for V36).
- **BCP** expansion: HANDOFF now says **Base** everywhere (A1). ⚠ PDF p.1 labels the box "Business" — F1.
- **"hub"** means three things (CP front page, `/panel` chooser, CommaaS) — F9.
- **Manejo de Plataformas**: tab + shortcut today; PDF makes it standalone in ECP — F6.
- `HANDOFF.md:267` (stale Co-Create line) — **fixed**.

### 3.2 Stale documents — **fixed today**
- `docs/PROXIMA_SESION.md` → **archived** as `docs/archive/PROXIMA_SESION_2026-08-06.md` with a warning banner.
- HANDOFF header, BCP expansion, transcriptor path, gotcha 1 (`dweizejazqeqpiguecxw` deleted), Vercel Hobby cap, QA count 38→50/58, leaked-password note — **fixed**.
- `TRANSCRIPCIONES_NUBE.md`: dead worker path — **fixed**; the "mejor calidad" headline softened to match its own §4.

### 3.3 Log/version hygiene — **fixed today**
- Log V32 wrong seals → `59e3524 + 3f2be94` (JSON-LD) and `4a7e1e2` (cocoa title); Log V34's three `pending` → `10c9016`.
- `f3265e2` (2026-08-16 sitemap fix) now has its Log V35 entry, noting that it and `b3f96e6` shipped without an `APP_VERSION` bump (not retro-numbered).
- Today's housekeeping has its own Log V35 entry (`commit: pending` until committed).
- The wrap-validation battery is now `docs/architecture/validate_snapshot.mjs` (nine checks, `--prev`), run against V35 (control) and V36 — both clean.

### 3.4 Security / hygiene flags
- **`docs/TRANSCRIPCIONES_NUBE.md:30`** literal webhook-secret example — **removed from the doc**; owner rotated the value (D18). Remaining check: F11.
- Local worker authenticates with the **service_role** key — backlog (F10).
- Leaked-password protection — owner to toggle in the Supabase dashboard (D21).

### 3.5 Owner-owed items still open (collected)
Search Console `www` property + new sitemap (urgent after canonical inversion) · GDPR privacy policy (subprocessors now Resend, AssemblyAI, Anthropic, Google) · Nequi number for the Arena fee (`src/lib/arena/payment.ts` still empty) · Varietales landing material · Terratalento grey door (`soon: true`) · two YouTube embeds on the same provisional id `Yird1_j6yqo` · Gemini price missing in `precios.ts` (Sonnet 5 launch price expires 2026-08-31) · Canva scenario in Make · Coffeed 5 media without feed · Supabase leaked-password toggle (D21).

---

## 4. Original questions (2026-08-17, first round) — answered, see §0
*(kept for the record; the text of the 25 questions is in git history of this file, commit pending — the answers above supersede them)*

---

## 5. Follow-up questions (second round) — the console pages raise these
Again with a **recommended default** so "defaults except …" works.

**F1 · Console names.** The PDF labels the boxes BCP "Business", OCP "Operation", ECP "Execution". Are those the *mission words* (subtitles) while the acronyms keep their expansions — BCP = Base Control Panel (A1), OCP = Operational Control Panel, ECP = **Executive** Control Panel? Or does ECP become "Execution Control Panel"? → Default: acronyms unchanged; taglines become BCP «El negocio: dirección, configuración y red de socios», OCP «La operación: del productor al catálogo», ECP «La ejecución: plataformas, contacto y caja de herramientas». Confirm "Executive" vs "Execution".

**F2 · URLs move with the modules?** (a) Move the route folders (`/bcp/fincas` → `/ocp/fincas`, etc.) with permanent redirects from the old paths, one console per PR, `qa-nav-check` extended to assert every nav href has a page; or (b) re-hang only the navigation and leave URLs where they are (fast, but `/bcp/fincas` would then live in the OCP — a URL that lies). → Default: **(a)**, phased: nav + redirects first for one console, verify, then the other two.

**F3 · "Red de Socios" cards** (Estudio de Contenido, Centro de Calidad, Agente de Carga, Agente de Nacionalización, Master Roaster) as modules in BCP — what does each show? (a) CTC's mirror of that partner's panel (their status/queue as CTC sees it), (b) only that node's credentials/config, (c) placeholders until each partner profile is worked (consistent with the 2026-08-03 ruling that partner surfaces evolve one profile at a time). → Default: **(c)** — a card per node with its credential state, built out later.

**F4 · CTC Selection.** Confirmed as "lots CTC buys outright to sell as the producer". Is **Black Stock a subset** (the Black-grade pipeline of CTC Selection) or a **sibling**? Where does bought inventory publish — Black → Green's Black tab (as today); Specialty grades bought outright → the Green catalogue with **CTC as the producer name**? → Default: CTC Selection = the umbrella (any grade bought outright, pipeline + inventory), Black Stock = its Black-grade branch (existing tables `black_negotiations`, `lot_listings`); publication as described.

**F5 · CRM CP Green / Roast / X — what feeds them?** → Default: **Green** = the buyer accounts + reservations/orders (a kanban over buyers: nuevo → activo → recurrente, with the profile/points/orders in the card); **Roast / X** = `newsletter_subscribers` (source roast|x) + future leads, as "interés" boards. **CaaS** = today's `/bcp/caas` moved. Confirm, or describe the funnel you have in mind for each.

**F6 · Manejo de Plataformas** — with Direccionamiento moving to BCP, the PDF makes MdP a **standalone module under ECP → Plataformas** (reversing the 08-15 "fusionado en uno" ruling, which was about not having it in two places at once). Grados de Calidad stays a subtab of Direccionamiento (now in BCP). → Default: follow the PDF.

**F7 · Definición de contexto rework.** Keep the three questions per unit; units = CTCx, KR, CP, **Value Ecosystem** (= the six ECP platforms — CTC Tech, Varietales, Directorio, Coffeed, Herramientas, Terratalento — i.e. the old «Ecosistema de Valor CTC» band?); remove FORMATS/DERIVABLES/moodboard/referencias; add the three placeholder subtabs. Is there anything saved in the current tool worth preserving (I can check the table before touching it)? → Default: keep stored answers for the three kept questions, drop the video-only fields; "Value Ecosystem" = the six platforms.

**F8 · HC inside the webapp (A5) + per-tool activation (A6).** Proposal: every tool opens inside a **shell** (header with «← Volver a Kaffetal Regal / Cherry Picked», tool name, Plus/locked badge, help) instead of a raw iframe or a new tab; the tool's own HTML is untouched (still `/tools/h/<slug>`). And activation becomes **per user per tool** (today `tools_plus_grants` is per user for *all* Plus tools of an audience) — the payment trigger later attaches to that same row. Locked tools stay visible with a «Solicitar» button. → Default: yes to both.

**F9 · "hub" (Q11 re-explained).** Three different things are called "hub" today: (1) Cherry Picked's front page `/cherry-picked` (code calls it `HubLanding`), (2) the console chooser at `/panel` (HANDOFF calls it "hub"), (3) CommaaS. Proposal: reserve "hub" for CommaaS only; call (1) the **portada de Cherry Picked** and (2) the **selector de consolas**. → Default: yes.

**F10 · Worker credential (Q20 re-explained).** The transcriber on your PC connects to the database with the **master key** (`service_role`) — the same key can read and write *every* table. If someone else runs the worker some day, or that `.env` file leaks, they hold the whole DB. The clean fix is a **narrow key**: an RPC + token that can only claim/finish transcription jobs. Not urgent while only you run it. → Default: backlog until a second person/machine runs a worker.

**F11 · Rotated secret — where?** "Placed in the .env file": the value the callback route checks in **production** is the one in **Vercel → Project → Settings → Environment Variables → Production** (then Deployments → Redeploy). Local `.env.local` only affects `npm run dev`. → Please confirm it is in Vercel (or say so and I'll walk you through it).

**F12 · Vercel (Q22 clarified).** Everything sits under ctcexportmain@gmail.com — the Pro team holds `ctc-plataformas-web-v1`, `commaas-web`, `wanst-me`. So the hub plan's line "Vercel stays under contacto@ (Hobby)" is outdated. → I'll correct HUB-PIVOT-PLAN §0.3 in the hub session; nothing to answer unless that's wrong.

**F13 · GVG-Space meanwhile.** Until it migrates to CommaaS, keep it where it is (owner-only), re-hung under BCP → Configuración del Sistema when the re-org happens? → Default: yes.

**F14 · Order inside step (3), the re-org** (after V36 wrap and the workspace move): (i) freeze names + write the plan doc (`docs/V5_CONSOLAS_PLAN.md`) → (ii) nav + route moves console by console with redirects → (iii) new modules (CRM CP Green/Roast/X, CTC Selection, Red de Socios cards, Definición de contexto rework) → (iv) HC as membership + in-app shell + per-tool grants → (v) CTC Tech/Varietales sub-module in KR + Cherry Picked CaaS → OCP. → Default: that order; each step its own PR and APP_VERSION bump.

---

## 6. Done this session (docs only, no code, no commits yet)
- Parked the PDF at `reference_html-vision-board/ctc-platforms-structure-2026-08-17.pdf`.
- Wrote this document (v1 with 25 questions; v2 with the decision record, the console pages and the follow-ups).
- **C13** `docs/PROXIMA_SESION.md` → `docs/archive/PROXIMA_SESION_2026-08-06.md` (git mv + banner).
- **C14** HANDOFF stale-line pass (header, BCP=Base, :267, transcriptor path, Vercel cap, QA count, gotcha 1, leaked-password note).
- **C15** Log V32/V34 seals corrected; `f3265e2` entry + today's housekeeping entry added to Log V35.
- **D18** Literal secret removed from `TRANSCRIPCIONES_NUBE.md`; dead path fixed.
- Memory notes corrected (transcript tool location/version, RT-Scriptor deploy state) and a new note for this re-org.
- **C16/C17** Version Wrap **V36.0(48bac75)** compiled (2 nodes, 1 trace, 6 DICT entries, ANN re-pointed, FILETREE regenerated, all nine checks empty); Log V36 opened; HANDOFF points at V36.
- **Next**: commit these docs (owner's call), then step (2) the workspace move in a fresh session.
