# CTC Web Platform — Handoff & Architecture

Living continuation document (started 2026-07-10, maintained continuously — the dated headings inside are the change record). Read this first in a new session, before re-deriving context from git history. **State-of-play snapshot + open questions as of 2026-08-17: `docs/ESTADO_Y_PREGUNTAS_2026-08-17.md`** (the owner's answers are recorded at its top; the console re-org it describes is PLANNED, not built). **Traspaso de la sesión del 2026-08-17: `docs/SESION_2026-08-17_SNEAK_PEEK.md`** (qué se hizo, qué hay que saber antes de tocar el módulo, y qué quedó abierto). **The re-org's ordered plan — PR by PR, with step 0 (the «Active Catalogue Sneak Peek») BUILT and steps (i)–(v) still pending — is `docs/V5_CONSOLAS_PLAN.md`** (written 2026-08-17; su §7 lleva el mapa de versiones rebasado sobre V4.21, y el «▶ EMPIEZA AQUÍ» de su cabecera dice cuál es el paso siguiente).

## What this is

Colombian Trading Company (CTC) is a green-coffee exporter. This repo is a single Next.js app serving **19 subdomains** (`src/lib/red/subdominios.ts`) on one deployment, routed by subdomain in production and by path in dev. The main public surfaces:

| Platform | Audience | Route | Subdomain (prod) |
|---|---|---|---|
| **CTC Home** | Public marketing | `/` | root domain |
| **Kaffetal Regal** | Coffee producers | `/kaffetal-regal` | `kaffetal-regal.*` |
| **Cherry Picked** (portada) | Buyers — routes the four programmes | `/cherry-picked` | `cherry-picked.*` |
| **Cherry Picked Green** | European roasters/buyers — the store | `/cherry-picked-green` | `cherry-picked-green.*` |
| **Cherry Picked Roast** | Roasted-fulfillment programme (scaffold) | `/cherry-picked-roast` | `cherry-picked-roast.*` |
| **Cherry Picked X** | Small-format programme (scaffold) | `/cherry-picked-x` | `cherry-picked-x.*` |
| **Directorio del Café** | Coffee professionals of Santander (people layer) | `/directorio` | `directoriodelcafe.*` |
| **CTC Tech** | Producers seeking agronomic tech (capture-only) | `/ctc-tech` | `ctc-tech.*` |
| **CaaS · Coffee as a Service** | Brands proposing US/EU projects (capture-only) | `/caas` (`/co-create` → 308) | `caas.*` (+ `co-create.*`) |
| **Varietales** | Producers requesting seedling catalog (capture-only) | `/varietales` | `varietales.*` |
| **BCP** (Base Control Panel — canonical expansion, owner 2026-08-17; "Business" is its mission word) | CTC's own staff (2 founders) | `/bcp` | not on a public subdomain |
| **Terratalento** | Harvest pickers (recolectores) | `/terratalento` | `terratalento.*` |
| **Coffeed** · **Herramientas del Café** · **Control Panel landing** | Broadcast wall · tools · consoles' public door | `/coffeed` · `/herramientas` · `/control-panel` | `coffeed.*` · `herramientas.*` · `panel.*` |
| **5 partner nodes** | Centro de Calidad, Agente de Carga, Agente de Nacionalización, Master Roaster, Estudio de Contenido | `/socios/<node>` | `centro-calidad.*`, `agente-carga.*`, `agente-nacionalizacion.*`, `master-roaster.*`, `ctc-content.*` |

The subdomain→path rewrite lives in `src/proxy.ts` (see Gotchas below for why it's not called `middleware.ts`).

**The core business flow this app encodes**: a producer registers a finca + lot and fills out a Ficha Técnica (Kaffetal Regal) → CTC staff schedule an Arena cupping session and grade it (BCP) → a graded lot gets a purchase contract with a 3-month release staircase (BCP; **signing requires the producer to be a Kaffetal Club member** — BCP emits a member code in /bcp/club, the producer redeems it in "Mis contratos") → once at least one month has released, BCP publishes it to the Cherry Picked catalog (also member-gated) → a European buyer reserves and checks out (Cherry Picked).

## Stack

- Next.js 16.2.10 (App Router, Turbopack) + TypeScript + React 19. **This Next.js version has real API differences from training-data Next.js** — see `AGENTS.md`, e.g. `middleware.ts` → `proxy.ts`. Before writing Next.js-version-sensitive code, check `node_modules/next/dist/docs/`.
- Supabase (Postgres 17 + Auth + RLS + Storage) — project ref **`sjznkzvefqfcysczllli`** ("ctc-platform"), region `eu-central-1`. **This is the only real project — see Gotchas.**
- Vercel for hosting. GitHub for source.
- Anthropic API (raw `fetch`, not the SDK — see Gotchas) powers one feature: the "¿Y ahora qué?" next-step advisor in Kaffetal Regal's Ficha Técnica.
- CSS Modules throughout for the three consumer-facing sites; shadcn/ui + Tailwind scoped *only* to BCP.

## Directory map

```
src/
  app/
    page.tsx                          CTC Home
    kaffetal-regal/                   Kaffetal Regal route + OAuth callback
    cherry-picked/                    Cherry Picked route + OAuth callback
    login/, verify/                   MASTER LOGIN (platform-level, password+OTP) — one door for all internal consoles
    cambiar-contrasena/               forced password-change step (must_change_password; own light auth to avoid guard loop)
    panel/                            post-login console selector (chooser; auto-forwards if only 1 console)
    bcp/                              BCP · Base Control Panel — «Business»: el negocio
      login/, verify/                 thin redirects → /login, /verify (old URLs kept alive)
      <modulo>/[[...resto]]/          ⬅ los TALONES 308 de la mudanza (V4.24). Fuera de (app) a propósito:
                                        redirigen ANTES del portero, así un marcador viejo no da "sin acceso".
                                        Uno por módulo, cubre sus sub-rutas. Destino: lib/panel/rutasMovidas.ts
      (app)/                          everything behind the internal session
        layout.tsx                     requireConsoleAccess("bcp") + shared <PanelShell>
        page.tsx                       índice de la consola (aún sin KPIs propios: los que había medían la operación)
        direccionamiento/              ⬅ ECP (V4.25) · qué dice la casa (+ grados). Plataformas NO vino: sigue en el ECP
        usuarios/, documentacion/, mapa/, consumo/, automatizaciones/
                                        ⬅ ECP (V4.25) · Configuración del Sistema
        socios/                        ⬅ OCP (V4.25) · Red de Socios: se credencialan aquí, se operan allá
        gvg/                           ⬅ ECP (V4.25) · el espacio personal del owner, con su propio candado
        adminLockActions.ts            la cerradura de administrador (ahora junto a Usuarios, que es su pareja)
    ocp/                              OCP · Operational Control Panel — «Operation»: del productor al catálogo
      (app)/
        layout.tsx                     requireConsoleAccess("ocp") + shared <PanelShell>
        page.tsx                       el tablero de KPIs que era del BCP hasta V4.24
        productores/, fincas/, lotes/          ⬅ BCP (V4.24) · Kaffetal Regal: el origen del lote
        nominados/, arena/, galardonados/, club/  ⬅ BCP (V4.24) · KR Arena: la calificación
        catalogo/, contratos/, subastas/, black-stock/  ⬅ BCP (V4.24) · la salida comercial
        crm/caas/                      ⬅ BCP /bcp/caas (V4.24) · el 1.º de los 4 CRM de Cherry Picked
        arena/[sessionId]/run/         Jornada de Arena live runner (JornadaRunner.tsx)
        actions.ts, arenaActions.ts, contractActions.ts, catalogActions.ts, …
                                        Server Actions — each re-verifies its console itself
      <modulo>/[[...resto]]/          ⬅ talones 308 de lo que se fue al ECP en V4.26
    ecp/                              ECP · Executive Control Panel — «Execution»
      <modulo>/[[...resto]]/          ⬅ talones 308 de lo que se fue al BCP en V4.25
      (app)/
        buzon/, leads/                 Contacto: el buzón y la recepción general (leads ⬅ OCP, V4.26)
        directorio/, coffeed/, herramientas/, terratalento/, ctc-tech/, varietales/
                                        Plataformas y sus CRM
        plataformas/                   ⬅ salió de direccionamiento/ (F6, V4.26): módulo suelto
        cotizador-lotes/, cotizador-logistico/, cotizador-empaque/, anclas-mercado/, transcripciones/
                                        ⬅ OCP (V4.26) · Caja de herramientas interna
    socios/[partner]/                 the 5 partner "couples" (landing + /acceso login + /panel scaffold), config-driven
      panel/source-wrapper/, panel/datawave/   las apps del Estudio (404 for any other slug)
    api/socios/auth/{login,logout}/   partner single-factor auth (role partner + node-exact partner_accounts row)
    api/
      panel/auth/{password,verify,logout}/route.ts  master-login 2FA endpoints (was api/bcp/auth/*)
      inbound-email/route.ts                        inbound-mail webhook (Svix-verified) → inbound_emails → BCP Buzón
      home/ticker/route.ts                          public market ticker feed for CTC Home (see lib/market/ticker.ts)
      kaffetal-regal/next-step/route.ts             Anthropic advisor endpoint
  components/
    ctc-home/, kaffetal-regal/, cherry-picked/       one folder per platform
    coffeed/                                         CoffeedConsole (ECP: entregas+muro) + StudioConsole (taller) + CanonView (las dos) + CoffeedWall (muro público KR/CP/DC) + StudioAppShell
    coffeed/datawave/                                app #2: model.ts (puro) + DatawaveChart + datawaveCard (canvas/PDF) + DatawaveStudio + DatawaveStyles
    coffeed/rtscriptor/                              app #3: model.ts (puro: duración derivada, reglas, propuestas) + RTScriptor (armazón) + Story/Cast/Stage/Script/Series + parts + VoiceOver + RTScriptorStyles
    panel/                                           shared console shell: PanelShell, PanelSidebar (+console switcher), ConsoleScaffold, auth.module.css
    kaffetal-regal/ficha/                            Ficha Técnica: 8 panes + preview + AI widget
    kaffetal-regal/ficha/panes/CertCheckbox.tsx       shared A3/A4 cert row: info toggle + attachment upload
    ui/                                               shadcn primitives (BCP only)
  lib/
    supabase/{client,server}.ts        3 client factories — see below
    coffeed/                           types + studioGate/requireEcp (los DOS gates) + actions (taller) + ecpActions (dirección)
                                       + deliverableActions (la cola) + aiActions + datawaveActions + rtScriptorActions + rtsPrevis (fotogramas fase 1) + claude.ts (cliente compartido) + wallActions + studioApps
    panel/{consoles,requireConsoleAccess}.ts   console config (single source) + internal read-path gate
    bcp/{otp,sendOtpEmail}.ts
    arena/jornada.ts                   Jornada de Arena: script, run_state shape, gates, majorityGrade
    stableStringify.ts                 deterministic JSON compare, used by the AI-advice cache
    kaffetalMedia.ts                   upload-to-storage + batch signed-URL helper, used by every KR upload site
    fileSize.ts                        tiny checkFileSizeMb() shared by every upload field's client-side size gate
    market/ticker.ts                   CTC Home's market ticker: Yahoo chart endpoint (NY-C + FX) + market_anchors
                                       + Coffeed's approved outlet feeds. Degrades source by source, never throws.
tools/
    transcriptor/                  la herramienta local de transcripcion (Python + los .bat); el OCP la sirve en ZIP
scripts/
    create-qa-producer.mjs, create-qa-buyer.mjs, seed-bcp-admin.mjs,
    qa-guard-check.mjs, qa-checkout-check.mjs        disposable QA account + regression helpers
    ts-resolve.mjs                                   resolutor para los QA que corren src/ con node (alias @/, .ts, server-only)
    qa-rtscriptor-check.mjs                          RT-Scriptor: duración derivada, reglas, propuestas, fotogramas (41)
```

## Supabase client factories (`src/lib/supabase/server.ts`)

Three, each for a different trust level — know which one a piece of code should use before touching auth/data code:

1. `createSessionClient()` — cookie-bound, respects RLS as the signed-in user. Default choice for anything a logged-in user does to their own data.
2. `createEphemeralClient()` — no session persistence, used only for the BCP login's password-verify-without-cookie step.
3. `createServiceRoleClient()` — bypasses RLS entirely. **Server-only, never import from a client component.** Reserved for audited admin mutations (BCP approvals/publishing) and system-computed fields a normal user JWT isn't allowed to touch (e.g. the AI-advice cache columns on `lots`, written even when the lot is past the stage a producer's own JWT can modify).

## Database (project `sjznkzvefqfcysczllli`)

Full table list, RLS policies, and triggers were audited 2026-07-10 (see Audit Findings below); the schema is otherwise stable. Domains:

- **Identity**: `profiles` (role enum: producer/buyer/bcp_admin, `phone`), `producer_profiles` (`company_name`, `tax_id`, `cedula_cafetera`, `whatsapp_confirmed`, `country`, `department`, `avatar_asset_id`, `video_asset_id` — the last two added 2026-07-10), `buyer_profiles`.
- **Kaffetal Regal**: `fincas` (+ `video_asset_id`, added 2026-07-10; EUDR due-diligence columns added 2026-07-10/11 — `eudr_lat`/`eudr_lng`/`eudr_polygon_geojson` (plain lat/lng + a click-to-add-vertex polygon from Google Maps, not PostGIS), declarations/evidence/legal-areas/tenure/sustainability, `eudr_legal_docs_asset_id`/`filename` (producer PDF upload); `requires_eudr_polygon` is a Postgres `GENERATED ALWAYS AS (hectares > 4) STORED` column — never send it in an app-side UPDATE, Postgres derives it), `lots` (stage enum borrador→...→galardonado — untouched since 2026-07-10; `intake_step` smallint 0-4 added 2026-07-11, gates the producer-facing FT/FT2/EUDR/Video sub-stages independently of `stage`, see below; `datasheet` jsonb holding the full ~60-field Ficha, `ai_next_step_advice`/`ai_next_step_context` for the AI-advice cache, `video_asset_id`, `sample_shipped_at`, EUDR lot columns added 2026-07-10), `ficha_completion_snapshots`, `media_assets`, `lot_evaluations` (added 2026-07-11 — multi-evaluation cupping/physical scoring, `source` bcp_arena/producer_claim, `status` pending/accepted/rejected; a lot's official score is the average of its accepted rows, computed at read-time in `src/lib/evaluations.ts`, never stored).
- **Storage**: one bucket, `kaffetal-media` (private, 100 MB/file limit, added 2026-07-10), holding producer avatars/videos, finca videos, lot ("café") videos, and A3/A4 certificate support attachments. Path convention is always `{producer_id}/...` (avatar, producer-video, fincas/{id}/video, lots/{id}/video, lots/{id}/certs/{certKey}/...) — the 4 storage.objects RLS policies (select/insert/update/delete) all check `(storage.foldername(name))[1] = auth.uid()::text`, so a new upload site just needs to keep that path shape, no new policy. `src/lib/kaffetalMedia.ts` wraps upload+`media_assets` insert and batch signed-URL resolution (1h expiry, re-fetched on every `loadData()`) — every KR upload site (avatar, producer video, finca video, lot video, cert attachments) goes through it.
- **Arena/Contracts**: `harvest_seasons`, `arena_sessions` (+ `run_state` jsonb y `winner_lot_id` FK→lots ON DELETE SET NULL, added 2026-07-14 for the live Jornada runner — the whole in-flight jornada lives in `run_state`, the winner is promoted to a real column at close), `arena_session_lots`, `arena_scores`, `purchase_contracts`, `contract_releases`, `humidity_readings`. These four Arena tables are **service-role-only by design** — zero client RLS policies, since they're internal grading machinery BCP alone touches.
- **Cherry Picked**: `lot_listings`, `shipping_zones`, `lot_reservations`, `orders`, `order_items`, `points_ledger`, `sample_pack_orders`, `newsletter_subscribers` (**service-role-only**, 2026-07-17 — Roast/X "Coming Soon" email capture, unique per email+source, written only by `src/lib/newsletter/actions.ts`; no BCP surface yet, read via SQL).
- **Ops**: `admin_otp_codes` (master-login 2FA), `audit_log`, `panel_users` (internal-collaborator tier, **service-role-only** — added 2026-07-15, Fase 1: `profile_id` PK→profiles, `is_owner`, `consoles` jsonb `{bcp|ecp|ocp: "admin"|"viewer"}`, `status` invited/active/suspended, `must_change_password`, invite email tracking, **`delivery_email`** — the real inbox where invites/OTPs/resets land, so the login email can be a mailbox-less `@ctcexport.com` label; null = deliver to the login email. Seeded the founder as active owner with all three consoles. `profiles.role='bcp_admin'` stays the coarse gate; this adds per-console grants + lifecycle. A bcp_admin with no row is grandfathered to all consoles as owner. **Write-path hardened 2026-07-15**: all 9 BCP action files' `requireAdmin()` delegate to `src/lib/panel/requireActiveAdmin.ts`, which also checks `panel_users.status` — suspension revokes Server Actions instantly, not just navigation), `inbound_emails` (**service-role-only**, 2026-07-15 — mail received via `POST /api/inbound-email` [Svix-signature-verified, `RESEND_INBOUND_WEBHOOK_SECRET`; 503 in prod if unset, unsigned accepted in dev only]; best-effort extracted fields + full `raw` jsonb; attachments metadata-only; surfaced in BCP → Buzón which renders text_body only, never html. **OPERATIVE via IMAP since 2026-07-16** (Resend Inbound needed a $20/mo plan, so it stays dormant as the future real-time path): Hostinger catch-all `*@ctcexport.com` → the real `info@` mailbox → `src/lib/buzon/syncBuzon.ts` (imapflow+mailparser; env `BUZON_IMAP_*`) pulled on demand by the "Sincronizar buzón" button — dedupe by message-id (partial unique index), attachments to Storage `kaffetal-media/buzon/...`, non-destructive reads, 7-day window / 50 msgs per run, and 30-day retention cleanup of ARCHIVED mail from Hostinger so the free 1 GB mailbox never fills; never-archived history untouched. Both routes feed the same table — see `docs/INBOUND_EMAIL_SETUP.md`).
- **Arena inscription fee (2026-07-16)**: `arena_inscriptions` (**service-role-only**, one row per lot) — participating in the Arena costs **COP 80.000 per lot**. `discount_pct` (smallint, CHECK IN 0/25/50/75/100) is the source of truth for CTC's discretionary exemption; `discount_cop` and `amount_due_cop` are **GENERATED** from `amount_cop` + `discount_pct` (Postgres won't let a generated column reference another, so both derive from base columns), and `amount_cop` freezes the list price per row so a future price change never rewrites history. `status` pendiente/pagado/exento (100% ⇒ exento). Payment happens **out-of-band** (transfer); BCP only confirms, from the "Inscripciones de Arena" block in `/bcp/club`. **Two gates hang off "settled" (pagado|exento)**: `confirmSampleReceived()` won't move a lot to `fila_arena` without it, and — the model inversion — `emitPassportForProducer()` swapped its "has a galardonado lot" rule for "has a settled inscription": **the Pasaporte is now the paid entry ticket, not the post-galardón reward** (campaign `KCX-` codes became the exemption tool). Helpers in `src/lib/arena/inscriptions.ts`. The 3 lots already at the gate when this shipped were **grandfathered** (100% exempt, audit-logged, producers notified). Producers see their own inscription in the Kaffetal Regal producer-panel module **"Mis inscripciones"** — the table has ONE narrow RLS policy (`arena_inscriptions_select_own`, SELECT own rows only), so it's now **writes-are-service-role-only**; verified by simulating a producer JWT (sees only their row; UPDATE/DELETE affect 0 rows). **📌 PINNED / BLOCKING**: payment is by **Nequi** (no gateway — CTC confirms by hand), and the real Nequi number+holder are still missing (`NEQUI` in `src/lib/arena/payment.ts` is empty). While empty, `nequiConfigured()` hides the payment instructions and points the producer to `info@ctcexport.com` instead of showing a half-filled number — filling it in is a one-line change and the last step to make the fee collectable.
- **Kaffetal Club — "Pasaportes" (2026-07-14, passport model same day)**: `club_member_codes` (`code` unique; `kind` `estandar`/`campana` + `campaign` label; `assigned_to`/`assigned_at` for per-producer emission; `email_sent_at`/`email_error` leads-style send tracking; `redeemed_by`/`redeemed_at`, `revoked_at`; all profile FKs `ON DELETE SET NULL` **on purpose** — the first QA teardown proved a plain FK blocks deleting any profile that ever redeemed a code) — **service-role-only by design** (RLS enabled, zero policies, like Arena/leads). Narrative: membership = the producer's **"Pasaporte del Kaffetal Club"**, the code = **"Número de Pasaporte"**. Two kinds: **estándar** (`KC-` prefix) is emitted per-producer from the /bcp/club kanban, server-gated on having a `galardonado` lot; **campaña** (`KCX-` prefix — the prefix meaning is internal, never explained to producers) bypasses the Arena gate for marketing occasions and can be assigned to anyone or left unassigned to hand out (first account to redeem wins). Campaigns are **first-class rows** in `club_campaigns` (service-role-only; `name` unique; codes carry `campaign_id ON DELETE SET NULL` — the old `campaign` text column was dropped): created at the top of /bcp/club, each campaign card links to `/bcp/club/campanas/[id]`, which has **two separate emission forms on purpose** — "Emitir a un productor" (exactly one, delivered by email + panel note, only he can activate it) and "Generar códigos para entregar en mano" (N anonymous codes, up to 50, no email, first account to redeem wins). A single combined form with a `cantidad` field that silently only applied to the unassigned case was confusing; `emitCampaignPassports` still backs both and ignores `cantidad` in assigned mode. Assigned emission sends a passport email (`src/lib/email/clubEmails.ts`, via the shared Resend sender exported from `leadEmails.ts`) + a `producer_comm_log` note carrying the número; an **assigned code can only be redeemed by its assignee**. Membership itself is `producer_profiles.club_member_since` (null = not a member), guard-protected; set only via the producer redemption action (`src/lib/club/actions.ts`, which also writes `audit_log` + a welcome note) and cleared via BCP's `revokeClubMembership`. Producers can also **request** their passport ("Solicitar mi Pasaporte" → a deduplicated producer-authored comm-log note). **Being a member gates**: producer-side "Mis contratos" module (locked tile + passport gate with redemption form in `AppDashboard.tsx`), BCP `signContract`, and BCP `publishLot` (defense in depth). Contracts are still auto-created at grading for everyone; it's *signing* that requires membership. `/bcp/club` is a 3-column kanban (Elegibles: ≥1 lot past Muestras, grayed until a galardón → Pendiente de confirmación: emitted+sent, with email-retry/revoke → Miembros activos), plus campaign-passport creation and a full ledger (`clubActions.ts`).
- **Leads (2026-07-13)**: `leads` (CTC Home "Escríbenos"/servicios submissions; pillar general/tech/cocreate/varietales, status pipeline nuevo→en_conversacion→convertido→cerrado, `fields` jsonb per-pillar, `profile_id` link to the auto-provisioned account, `account_provisioning` created_password/created_google/existing, `temp_password` — plaintext by explicit product decision, delivered in BCP's first reply email then cleared, unreachable from any user JWT) and `lead_replies` (BCP's outbound emails; body stored WITHOUT the password). Both are **service-role-only by design** (RLS enabled, zero policies, like the Arena tables); all writes go through server actions (`src/lib/leads/actions.ts` public intake, `src/app/bcp/(app)/leadsActions.ts` BCP). Emails via Resend in `src/lib/email/leadEmails.ts` — sender from `EMAIL_FROM` env; **until ctcexport.com is verified in Resend, sends to arbitrary addresses fail** and are captured on the row (`welcome_error`/`send_error`) with retry buttons in /bcp/leads. Residual spam risk accepted: a stranger can trigger account creation for an email they don't own — they never learn the password and the account is inert. The conversation is BIDIRECTIONAL for producer-role leads: `producer_comm_log.lead_id` links mirrored notes (welcome + BCP replies) into the producer's in-app "Retroalimentación y ayuda" feed, and the producer's in-app thread replies surface back inside the BCP lead card ("Conversación en la plataforma", resolved via lead_id + parent_id).
- **Partners (2026-07-15)**: `partner_accounts` (**service-role-only** — the v3 partner tier: `profile_id` PK→profiles, `node_type` checked against the 5 partner slugs, `org_name`/`contact_name`, invited/active/suspended lifecycle, invite-email tracking). A partner is `profiles.role='partner'` + an active row for exactly one node — **never `bcp_admin`**. Issued/revoked in `/bcp/socios`; logs in at `/socios/<node>/acceso` (single factor); panel gated by `requirePartner()` (`src/lib/partners/`). **`delivery_email` (2026-07-20)** — mismo desdoblamiento que `panel_users`: el correo de ACCESO es la identidad (fila en `auth.users`, única en toda la plataforma, puede ser una etiqueta sin buzón como `estudio-contenido@ctcexport.com`) y el **buzón real** es a dónde se entregan invitación y restablecimientos. El buzón SÍ se repite entre credenciales y puede coincidir con una cuenta de productor/comprador — es una bandeja, no una identidad. El correo de invitación dice explícitamente cuál es el usuario cuando difieren, si no el socio intenta entrar con la dirección donde lo recibió.
- **Coffeed (2026-07-29, ampliado 2026-08-03)**: 15 tablas `coffeed_*` (**service-role-only**, migraciones `coffeed_editorial_pipeline` + `coffeed_polymorphic_deliverables`) — el muro + el pipeline editorial + **`coffeed_deliverables`** (la cola polimórfica que reciben del Estudio) y **`coffeed_datawave_episodes`** (la biblioteca de Datawave). Reglas de formato (5-10 paneles, máx. 3 por fuente, ninguno sin trazar) en trigger `coffeed_guard_accept` Y de nuevo en `coffeed_guard_deliverable` al aceptar; el canon se actualiza solo (`coffeed_update_canon`). Ver la sección Coffeed más abajo.
- **OCP · Transcripciones (2026-08-17)**: `transcripts` (**service-role-only**, migración `ocp_transcripts`) — el archivo de conversaciones transcritas (notas de voz de WhatsApp, llamadas). La transcripción NO la hace la plataforma: la hace la herramienta local `ogg_transcriber` (repo `reference_html_tools/_whatsapp-transcript-html`, faster-whisper + pyannote vía WhisperX, corre en el equipo con GPU) y aquí se guarda su `.transcript.json` con lo humano encima — `subject`, `recorded_on` (la fecha de la conversación, no de la carga), `notes`, y `speaker_names` jsonb para ponerle nombre a `SPEAKER_00/01/…`. `segments` jsonb tal cual los da la herramienta (`{speaker,start,end,text[,flags]}`), `speakers` en orden de aparición, `full_text` para buscar, `meta` (modelo, dispositivo, tiempos). **Cola de audio** (migración `ocp_transcripts_audio_jobs`, mismo día): `status` pending/processing/ready/error (CHECK), `audio_path` (en `kaffetal-media/transcripts/<uuid>/…`), `audio_size_bytes`, `audio_mime`, `job_options` jsonb (idioma, nº de voces), `error`, `worker`, `claimed_at`, `processed_at`; índice parcial `transcripts_queue_idx` sobre la cola; RPC **`claim_transcript_job(text)`** (`FOR UPDATE SKIP LOCKED`, rescata `processing` > 2 h; EXECUTE revocado a anon/authenticated, concedido a service_role) — la llama el worker local con el service role. Ver la sección OCP · Transcripciones más abajo.
- ⚠️ **El repositorio es PÚBLICO, y ponerlo en privado ROMPE los despliegues** (probado el 2026-08-17). `ColombianTradingCompany/ctc-plataformas-web_V1` nació público el 2026-07-07. Se pasó a privado a petición del owner y **Vercel dejó de poder leerlo**: ningún push desplegó durante los ~12 min que estuvo cerrado, y la API de Vercel respondía `incorrect_git_source_info — the repository does not contain the requested branch` (el síntoma de no tener acceso, no de que falte la rama). Al devolverlo a público, el commit pendiente desplegó solo. **Si se vuelve a intentar, hay que arreglar ANTES el acceso de la GitHub App de Vercel al repo privado** (Vercel → Settings → Git, o GitHub → Settings → Applications → Vercel → acceso a repositorios) y comprobar con un commit de prueba; cerrar el repo sin eso deja la producción sin poder actualizarse (la web sigue en pie sirviendo el último despliegue — no es una caída, es una tubería parada).
- **La historia está limpia** (auditada 2026-08-17, 457 commits): `.env*` ignorado desde el primer commit, ningún `.env` en el historial, y los únicos `hf_`/`sb_secret_` son marcadores de documentación. 0 forks, 0 estrellas. Aun así, siendo público: **nunca una ruta absoluta del owner** (lleva su nombre de usuario) ni una clave en el código — un secreto commiteado queda en el historial aunque se borre después, y habría que rotarlo.
- **Two `SECURITY DEFINER` views** for public catalog reads without broadening base-table RLS: `public_lot_catalog` (published/sold-out lots only, curated columns — no raw Ficha datasheet, no geolocation) and `public_transparency_pricing` (locked vs. reference price, only for listings with `transparency_credit_enabled`). Both reviewed 2026-07-10 — column scope is correctly narrow. This pattern exists *because* a naive broad RLS policy on `lots`/`fincas` would have exposed the full private Ficha and exact finca geolocation to any buyer — don't "simplify" these back into RLS policies without re-deriving that constraint.

### The "ironclad guard" trigger model

Every table a normal user JWT can write to has a guard: RLS restricts *whose* rows are visible, and a `BEFORE UPDATE` trigger additionally restricts *which columns/transitions* are legal, keyed off `auth.uid() is not null` (service-role calls have a null uid, so BCP/system writes bypass the guard on purpose). Current guards, all confirmed intact and matching their trigger source during the 2026-07-10 audit:

| Table | Guard function | Producers/buyers cannot... |
|---|---|---|
| `profiles` | `guard_profiles_protected_columns` | change their own `role` or `email` |
| `buyer_profiles` | `guard_buyer_protected_columns` | self-assign `lifetime_points`/`membership_tier` (the points trigger sets `app.syncing_points` to bypass this for its own writes) |
| `lots` | `guard_lots_producer_columns` | touch a lot once its `stage` is past `ficha_completa`, change `stage` outside `{borrador, ficha_completa}`, or ever set `grade` |
| `lots` (2nd guard) | `guard_lot_protected_columns` | change `sample_2kg_confirmed_at`, `source`, `producer_id`, `cert_verifications` (added 2026-07-20), or make any stage transition other than `borrador → ficha_completa` (added 2026-07-13; overlaps the older guard on purpose — both run, effective rule is the intersection) |
| `fincas` | `guard_finca_protected_columns` | change `status` (no self-approval), `eudr_cert_shared` (no self-release of the certification), `producer_id`, or any of BCP's evaluation columns (`eudr_evidence_*`, `eudr_legal_areas`, `eudr_sustainability_*`); **and once `status = 'approved'`, their own EUDR declarations (deforestation/legal/tenure/planting/system/lat/lng/polygon/hectares/producer_answers) are locked** — changes go through "Solicitar revisión de datos" (added 2026-07-13; keyed off `auth.role()` not in `{service_role, postgres}`) |
| `producer_profiles` | `guard_producer_protected_columns` | self-grant `club_member_since` (Kaffetal Club membership) — guarded on **INSERT too**, because `producer_profiles_insert_own` + the InfoModal upsert path means a producer can create their own row (added 2026-07-14) |

If you add a new producer/buyer-writable column to one of these tables, check whether it needs carving out of (or into) its guard function — the AI-advice cache columns deliberately go around this guard via the service-role client rather than punching a hole in it.

**This guard also blocks `lots.video_asset_id`** — a producer can only attach the "Video del café" (Ficha B4) while the lot is still at `borrador`/`ficha_completa`. Confirmed live 2026-07-10: an upload attempt against a `fila_arena` lot raises `"Este lote ya está en el proceso de CTC y no puede modificarse."` (surfaced as a toast, not a silent no-op) instead of writing. This is almost certainly the right behavior long-term (the video belongs to the producer-editable window), but note it if a future session wants producers to add/replace the café video later in the lifecycle — that would need an explicit carve-out in the guard function, not just a UI change.

**`lots.sample_shipped_at` works within the same guard, on purpose**: a producer sets it via `KaffetalExperience.confirmSampleShipped()` while `stage` stays `ficha_completa` (an ordinary column update, not a stage transition, so the guard's `old.stage`/`new.stage` check both stay in the allowed set and the write succeeds) — it's only reachable during the same window as everything else producer-writable, which is exactly the intended "confirm shipment before CTC picks it up" moment.

**Every KR-introduced datasheet field must default safely for lots saved before that field existed.** `FichaView.tsx` seeds its state as `{ ...EMPTY_FICHA, ...(lot.datasheet ?? {}) }`, not `lot.datasheet ?? EMPTY_FICHA` — the latter crashed A3/A4 in production for any lot with a *non-null* saved datasheet from before `cert_attachments` existed (confirmed live 2026-07-10: `data.cert_attachments[key]` on `undefined`). If you add another field to `FichaFormData`, this merge is what keeps old lots from crashing on it — don't revert to the either/or fallback.

## The Arena pipeline (restructured 2026-07-17 — "Nominados" model)

The intake→Arena flow was rebuilt around one principle: **documentation evaluation is free and comes first; everything after is the paid Arena track.** Read this before touching lots/inscriptions/jornada/club.

**Lot stage machine** (`lots.stage` enum + `STAGE_DB` mirror in `data.ts`, now **9 entries** — `apto`/`no_apto` were inserted BEFORE `videos_ok` so sort-order comparisons like `stage < 'fila_arena'` still hold; `videos_ok`/`muestra_transito` are dead legacy values): `borrador → ficha_completa → [EVA verdict] → apto | no_apto → fila_arena → galardonado`. **`evaluado` is now legacy-only** — every jornada participant exits `galardonado` with a grade. **⚠ STAGE_DB index shift**: `LOT_COMMITTED_STAGE` is now 6 (fila_arena); every numeric `stage === N` comparison was re-audited — don't add a raw numeric stage compare without checking the index.

**The paid track lives on `arena_inscriptions`** (one row per lot, created at postulation): a `phase` pipeline `postulacion → sondeo → fila → sesion → competido | retirado` alongside the unchanged `status` (payment: pendiente → pagado | exento). Phase auto-advances postulacion→sondeo once BOTH settled AND `sample_2kg_confirmed_at`.

**Flow, actor by actor:**
1. **EVA (BCP, `/bcp/lotes`)**: a `ficha_completa` lot waits in the EVA column. BCP resolves its EUDR (still `updateLotEudr`) then `markLotApto` (requires `lotEudrGate` ready) or `markLotNoApto(reason)`. `EvaVerdictButtons.tsx`, result-object no-throw. Apto lots leave the kanban to the "Aptos" strip; No Apto collapse into a rail with `revertNoApto`.
2. **Postulation (producer, "Kaffetal Regal Arena" module)**: `postularLote(lotId, campaignCode?)` in `src/lib/arena/producerActions.ts` creates the inscription + mints a `KRA-` entry code (or claims a campaign `KRX-` code with its discount via `src/lib/arena/entryCodes.ts`). The producer module (`ArenaLotCard` in `AppDashboard.tsx`) is a per-lot tracker: postular → código+pago (Nequi, still behind `nequiConfigured()` 📌) → muestra → sondeo → fila → sesión → resultado. **The old `muestras`+`inscripciones` modules merged into this one `arena` module.**
3. **Nominados (`/bcp/nominados`, SECOND redesign 2026-07-20 evening — owner's board package)**: the inscriptions board is now **Embotellados** (postulado >5 días with pay or sample pending) / **Recién Nominados** (≤5 días, ídem) / **En Fila** — and **the phase order INVERTED: `fila` now comes BEFORE `sondeo`**. Paid+sample ⇒ `maybeAdvanceToFila` sets phase='fila' (the POOL). Sondeo batches pick up to **30** lots from the pool (`assignLotsToBatch`, multi-select, only lots without `sondeo_result`; phase→'sondeo' while in the batch); sondeo-aprobado lots RETURN to `fila` with their score, and only they can be assigned to a session (`assignLotToSession` now requires `sondeo_result='aprobado'`). Below lives the **Baches de Sondeo kanban**: `abierto` (Nuevo Sondeo, picker) → `planeado` (`planSondeoBatch`; define lab via `setBatchLab` + printable **"Solicitud de Bache de muestras"** `src/lib/arena/sondeoRequestPrint.ts`) → `pendiente` (`markBatchSent` REQUIRES the uploaded **prueba de confirmación de recibo**; then `markBatchReceived` + `markBatchDelivered`) → `registro` (per-lot **MULTIPLE B2/B3 planillas** — `sondeo_evaluation` jsonb is now a LIST (`toLabEvaluationList` normalizes the legacy single object), `addSondeoEvaluation` appends, `recordSondeoResult` gives the verdict [needs batch status='registro'], score = last planilla's SCA total unless explicit). Legacy batch statuses migrated: cerrado→pendiente, resultados→registro. Unpostulated Apto lots now live on **/bcp/lotes** (Aptos section), not here.
3b. **Lotes (`/bcp/lotes`)**: below the intake kanban, **Aptos / No aptos sections with a season-of-registration filter** (`AptosNoAptosSections.tsx`; `lots.season_id` + `arena_inscriptions.season_id`, backfilled). **Owner rule: a lot participates in at most 2 seasons** — validated in `postularLote`/`postularOnBehalf` via `lotSeasonCount` (`src/lib/arena/seasons.ts`); note `arena_inscriptions` still has UNIQUE(lot_id), so cross-season re-postulation is second-pass work — the cap is groundwork.
3c. **Productores + Fincas as kanbans (2026-07-20)**: derivation logic is PURE and tested (`src/lib/bcp/producerSegments.ts` + `scripts/qa-boards-check.mjs`, 19 checks). Productores: Marchitando/Nuevos/Primíparos/Establecidos/Activos (avatar on card; tapping opens the producer panel with deep-linked fincas/lotes/Arena/contratos). Fincas: Marchitando/Nuevas/En Proceso/Aprobadas/No Aprobadas (EUDR completeness = `missingChecks()===0`, video excluded). Documented interpretation calls live as comments in producerSegments.ts (e.g. "finca pidió revisión" ≈ tiene fincas; "procesados" = finca aprobada + lote con ficha enviada; >7d-en-camino cae en Primíparos).
3d. **Arena session page**: **SessionFunnel** — the owner's competition-structure diagram (blind session → R1 discard Red/Black → variety/process reveal → R2 discard Red/Blue → origin reveal → final 1º/2º/3º with grades) derived from `run_state`. **Blind by design while running**: identities never travel to the client in the render; "mirar bajo el capó" calls `revealSessionIdentities(sessionId, password)` gated by the **Admin Lock** (`platform_settings.admin_lock`, sha256, seeded "123", changed in ECP → Usuarios y Credenciales → Admin Lock card; `adminLockActions.ts`). Per-cup **B2/B3 registrations are LISTS** (multiple per cup, `saveCupRegistration` appends) and available from the session page from the start (hidden names while a jornada runs — cards go by cup label). The old **Evaluaciones module is GONE** (nav + route); the pending producer-officialization claims queue is embedded at the bottom of /bcp/arena (`reviewEvaluationClaim` kept). **Jornada still does NOT read cup_registrations/sondeo planillas — the jornada-vs-boards reconciliation is the owner's flagged second pass.**
4. **Jornada v2 (`src/lib/arena/jornada.ts` run_state version 2)**: committee assigns ONE grade per lot (per-judge voting + `majorityGrade` retired). Discards graded at each round (`discard_grades`, R1 Black/Red, R2 Red/Blue via `allowedDiscardGrades`); finalists ranked 1º/2º/3º + graded (`verdict.ranking` + `verdict.grades`, `finalistAllowedGrades` drops Red if an R2 discard is Blue). New `reveal_origin` step opens Etapa 4. `startJornada` requires roster == capacity. `finalizeJornada`: lot_evaluations per cup (unchanged) + one committee `arena_scores` row per lot; **every participant → galardonado with its grade**; Red/Blue/Gold → contract, **Black → `black_negotiations` row** (negotiated apart in `/bcp/contratos`, `decideBlackNegotiation`), Tyrian → auction; **auto-grants `club_member_since`** to each participating producer. Legacy manual path (`recordArenaScore`/`closeArenaSession`/"Disponibles") deleted — lots reach a session only from Nominados.
5. **Club (`/bcp/club`)**: membership is **automatic on competing** — no more emitted passports. The page is now a Miembros ledger + **discount campaigns** (each carries a free `discount_pct`, emits `KRX-` arena entry codes via `emitCampaignCodes`). `emitPassportForProducer`/`requestClubPassport`/`redeemClubCode`/`settleArenaInscription`/`InscripcionesBlock` all removed; `src/lib/club/actions.ts` is now an empty placeholder.

**Guard change (M3)**: producers may set `sample_shipped_at` ONLY at `stage='apto'` with an inscription row existing ("Postula tu lote a la Arena antes de enviar la muestra") — verified live (unpostulated ship BLOCKED, postulated ALLOWED). Delete RLS blocks once an inscription exists.

**Verification**: producer side driven live (postularLote minted a real KRA code, all 5 phase states render); BCP via tsc/eslint + SQL (2FA blocks browser); jornada v2 gates via `node --experimental-strip-types scripts/qa-jornada-check.mjs` (11/11 pass against real source). **First live jornada should be a supervised event.**

**BCP owner-feedback pass (2026-07-20, after the first live walkthrough attempt)**: besides the Nominados/Arena changes above — kanban columns now GROW to fill the board width (`shared.module.css` `.column{flex:1 1 260px}`); "Tareas pendientes de CTC" deep-links to the exact element (`#lot-/#finca-/#lead-<id>` hashes auto-open the target modal via `anchorId` on FincaModalRow/LeadModalRow); the EVA panels got: FT "Finca declarada" chip (Apta/No Apta/Pendiente from the joined finca status), FT2 certs as per-cert rows (attachment inline + public registry link from `src/lib/certRegistry.ts` [researched 2026-07-20] + **Confirmado/No confirmado** verdicts persisted in `lots.cert_verifications` jsonb via `setCertVerification` — column producer-protected by `guard_lot_protected_columns`), FT2 físico shows ALL 10 SCA attributes + explicit «No lo sé» callouts + CQI Q-Grader directory link, EUDR panel reordered (Complejidad right under custody stages; cert-schemes chip cross-opens the FT2 certs panel; mitigation-effective is a direct BCP field labeled "evaluación de BCP"; Responsable at the bottom without Corregir). Nav: Club sits below Nominados. The unused "Fundadores" campaign was deleted (its 1 unissued code too).

## Coffeed + el Estudio de Contenido — producir vs. publicar (reparto 2026-08-03)

**La regla que gobierna todo este bloque: el socio *Estudio de Contenido* PRODUCE; el ECP RECIBE, da luz verde y PUBLICA.** Es un afinado de la decisión del 2026-07-30 (que se había llevado el módulo entero al ECP): la narrativa se sigue dirigiendo desde dentro — lo que se delega es su producción, y ahora la delegación tiene sitio propio.

| Dónde | Qué vive ahí | Gate |
|---|---|---|
| **Taller** `/socios/estudio-contenido/panel/...` | las apps de creación + el Canon (aquí SE ESCRIBE) | `studioGate()` |
| **ECP** `/ecp/coffeed` | Entregas, Muro, Identidad de marca, Canon en espejo | `coffeedGate()` |

- **`studioGate()`** (`src/lib/coffeed/studioGate.ts`) abre para **dos** identidades: el socio `estudio-contenido` (cookie PÚBLICA, `createSessionClient`) **o** un operador interno con grant de `ecp` (cookie del panel). Son cookies distintas y se prueban en orden — nunca se mezclan (gotcha 13). El segundo caso no es un atajo: sin él, suspender la credencial del socio deja a CTC fuera del taller que opera. **Publicar sigue siendo solo del ECP.**
- Reparto de archivos: `actions.ts` + `aiActions.ts` = taller (studioGate); `ecpActions.ts` = dirección (marca, anuncios, bundle del ECP); `deliverableActions.ts` = la cola, con el gate que toca en cada extremo. El cliente de Claude vive en `claude.ts` (compartido; `claudeSourced()` devuelve además las fuentes de la búsqueda).

### El Estudio es un taller de apps

`/socios/estudio-contenido/panel` dejó de ser el scaffold de los otros 4 socios: es un **lanzador**, y el registro de apps es `src/lib/coffeed/studioApps.ts` (añadir una app = una entrada ahí + su ruta bajo `panel/<id>`; cualquier otro slug de socio da 404 en esas rutas).

| App | Qué produce | Entrega |
|---|---|---|
| **Source Wrapper** (`panel/source-wrapper`) | el pipeline editorial de siempre | un carrusel trazado |
| **Datawave** (`panel/datawave`) | episodios de carrera de barras, escenario 9:16 grabable | un video (archivo o enlace) |
| **RT-Scriptor** (`panel/rt-scriptor`) | un vídeo construido una toma cada vez: hilos, personajes, escenas, tomas y el guion que sale solo | un `guion` — la tira de fotogramas de unas escenas |
| **Identity Value Creation** | *en construcción* — contenido de finca/lote desde su pasaporte | — |

⚠️ **Identity Value Creation no está bloqueada por UI sino por permisos**: leer finca/lote desde el tier de socios exige vistas `SECURITY DEFINER` estrechas campo a campo (la matriz de permisos del v3), no un grant ancho — misma regla que `public_lot_catalog`. Diséñalo antes de escribir la app.

**Datawave** (`src/components/coffeed/datawave/`) es el puerto de `reference_coffeed/Datawave/datawave.jsx`. Dos muletas del artifact están sustituidas y no deben volver: `window.storage` → tabla `coffeed_datawave_episodes`; `fetch` a `api.anthropic.com` **desde el navegador y sin clave** → Server Actions (`datawaveActions.ts`). El guion NO sale a la web a propósito — los giros los calcula `findBeats()` de la serie, y la IA solo los redacta. El video se graba fuera (pantalla) y se entrega como archivo o enlace ya publicado. `DatawaveStyles.tsx` mantiene la hoja del prototipo verbatim en un `<style>`: desviación consciente de la convención CSS Modules, explicada en el propio archivo.

**RT-Scriptor** (`src/components/coffeed/rtscriptor/` + `src/lib/coffeed/rtScriptorActions.ts` + `rtsPrevis.ts`) es el puerto de `reference_coffeed/RT-Scriptor/`. **Lee esto antes de tocarlo: el paquete de referencia traía su propia arquitectura y NO se adoptó.**

- El paquete pedía un esquema `rts` con tenencia propia (`rts.orgs` + `rts.org_members` + RLS por membresía) y un subdominio `scriptor.`. Habría sido un segundo padrón de identidades dentro de una plataforma cuya regla es *una identidad, muchas membresías*, y que ninguna consola administra. En su lugar: 4 tablas `coffeed_rts_*` **service-role-only** (RLS activa, cero políticas) + `studioGate()` en cada action, igual que Coffeed y Datawave.
- Por lo mismo **no hay Realtime**, aunque la referencia lo llamaba «el producto»: suscribir el navegador exigiría abrir esas tablas al JWT del usuario, y el taller lo operan una o dos personas. Si algún día compensa, el sitio donde entra es `rtScriptorActions.ts`, no los componentes.
- **El proyecto entero se guarda como UN `doc` jsonb** (`coffeed_rts_projects.doc`), mismo patrón que `coffeed_datawave_episodes.spec`: personajes, escenas, hilos, tomas, diálogo y voces en off se editan juntos y se validan juntos. `hydrateDoc()` mezcla siempre sobre un vacío — misma disciplina que `EMPTY_FICHA` en Kaffetal Regal, y por la misma razón: un proyecto viejo no puede reventar por un campo nuevo.
- **La duración de una escena no se teclea: se deriva de sus tomas** (suma de las marcadas `printed`; si no hay ninguna, la más larga, marcada `provisional` en toda la UI). Todo lo que dibuja tiempo pasa por `withDur()` en `model.ts` y por ningún otro sitio. Si añades una superficie que muestre minutaje, úsala.
- **Las reglas viven en `model.ts` y las corren los dos lados**: el taller avisa (`checkProject` / `checkTake`), el servidor decide — `renderTake` y `submitGuion` re-ejecutan la validación y rechazan con bandera de bloqueo. Es el equivalente de los triggers guardián en un módulo cuyo estado es un jsonb.
- **«Acción» produce FOTOGRAMAS, no movimiento** (fase 1, declarado en pantalla con una insignia). `rtsPrevis.ts` compone SVG a partir del ajuste real de la toma y los sube a Storage bajo `coffeed/rts/<project>/frames/`; la fila vive en `coffeed_rts_renders` con forma de cola de render (estado, progreso, proveedor, coste, prompt) **desde el primer día**, para que enchufar un proveedor de imagen en la fase 2 sea cambiar `provider`, no rehacer el módulo. Cada fotograma guarda su prompt compuesto (`framePrompt()`), que es el trabajo caro. Se dibuja en vez de pedirlo a una IA porque la plataforma no tiene clave de ningún proveedor de imagen.
- **El guion es editable y se empuja de vuelta a los mandos** (`ScriptTab`): reglas deterministas primero (`deriveProposals`), una pasada de Claude después (`analyseScript`), y **todo lo que devuelve el modelo se normaliza contra el vocabulario real** antes de llegar a la pantalla. Las propuestas son DATOS (`ProposalOp`), no closures — tienen que cruzar la frontera del servidor; `applyProposal()` es el único sitio que las convierte en cambios.
- Regresión: `node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/qa-rtscriptor-check.mjs` (41 comprobaciones). `scripts/ts-resolve.mjs` es reutilizable: enseña a Node el alias `@/`, las extensiones `.ts` y los centinelas `server-only`/`client-only`, así que un script de QA ya no está limitado a módulos que no importen a nadie. Con `--out DIR` escribe fotogramas de muestra para mirarlos.
- **El Estudio no se puede conducir en un navegador automatizado** (credencial de socio, como el BCP con su 2FA): esta app se verificó con `tsc` + `eslint` + `next build` + ese guardián + SQL.

### Entregas — una cola para todas las apps

**`coffeed_deliverables`** (migración `coffeed_polymorphic_deliverables`, service-role-only) es el sobre polimórfico donde desembocan TODAS las apps del Estudio:

- `kind`: `carrusel` (apunta a su `coffeed_drafts`) · `video` · `embed` (Instagram/YouTube) · `guion` (RT-Scriptor: `payload` lleva `projectId` + `scenes[]` + `frames[]` con RUTAS de Storage, firmadas al leer) · `identidad` (futuro). `app` dice qué app la produjo; `payload` jsonb lleva lo específico del tipo.
- Ciclo: **entregado → aceptado → publicado**, más **devuelto** (rebota al taller con la nota del ECP, sin borrar nada; el taller la re-entrega corregida).
- Trigger `coffeed_guard_deliverable`: nadie nace publicado, no se publica sin aceptar antes, despublicar limpia `published_at`, y **aceptar un carrusel RE-VALIDA en la base** las reglas 5-10 / máx. 3 por fuente / ninguno sin trazar (reusa `coffeed_check_draft`).
- **`coffeed_drafts.state` se queda en `draft → accepted`** (el trigger del canon sigue colgado de ahí). El valor `published` quedó muerto: publicar es cosa de la entrega, no del borrador.
- **El muro cambió de fuente**: `getCoffeedWall()` lee `coffeed_deliverables` publicadas, no `coffeed_drafts`. Es un feed MIXTO y el bundle expone `.items` (`CoffeedWallItem`, con `kind`), no `.chapters`. Afecta a los 4 montajes del muro (panel de KR, Cherry Picked, Directorio, `/coffeed`).
- Incrustados: `resolveEmbed()` en `types.ts` normaliza lo que se pega del navegador (youtu.be, `watch?v=`, shorts, `/p/`, `/reel/`, `/tv/`) a URL de iframe, y **rechaza un perfil o un canal** — el error fácil al pegar. Guardián: `node --experimental-strip-types scripts/qa-coffeed-embed-check.mjs`.

### El pipeline del Source Wrapper

**Es UNA secuencia, y el `status` del ciclo (`coffeed_cycles.status`, enum) ES la columna del kanban donde aparece la tarjeta** — no hay estado de UI que se pueda desincronizar, y una acción larga que se corta deja su tarjeta con botón de reintento:

| Vista | Dónde | Qué hace | Estado del ciclo |
|---|---|---|---|
| **Entregas** | ECP | la cola de las 3 apps: *dar luz verde* / *devolver con nota* / *publicar*; también se comparte un Instagram/YouTube desde aquí | — |
| **Muro** | ECP | lo publicado + anuncios; es el MISMO muro que ven KR/CP/DC | `publicado` |
| **Identidad de marca** | ECP | nombre, slogan, logo, paleta (≤5 + blanco/negro implícitos), tipografía, dirección de arte — **la obedecen todas las apps del taller**, que la leen pero no la cambian | — |
| **Canon** | ECP (espejo) · taller (escritura) | hilos narrativos; se actualizan solos al ACEPTAR un borrador (`coffeed_update_canon`) | — |
| **Medios de Consulta** | taller | lista blanca/negra de canales y medios; añadir = un agente valida la URL (existe, publica recurrentemente, toca el café) y **rechaza con motivo a la lista negra** | — |
| **Selección de Fuentes** | taller | UNA sesión abierta a la vez (índice parcial `coffeed_cycles_one_open`); botón de **barrido de 7 días** sobre la lista blanca (titular+sumario+fecha), ingesta manual de URLs, triaje (IA o a mano) y selección; el ÚLTIMO botón dispara la extracción | `abierto` |
| **Propuestas** | taller | kanban 3 columnas: *En extracción* → *Extraídas* (se ve el material) → *Propuestas* (3 ángulos, se elige uno → **Crear Post**) | `extrayendo` → `extraido` → `propuestas` |
| **Posts en Fila** | taller | kanban 2 columnas: *Creando* → *Listos* (ficha + descarga **HTML** y **PDF**, **Re-editar** con prompt, **Entregar al ECP**) | `post` → `listo` |

**Lo que ya NO existe**: el riel de 7 etapas, la pantalla de Extracción (es backend), el editor de Borrador panel-a-panel y el guion de vídeo. La extracción y la redacción siguen produciendo paneles trazados — pero como proceso, no como pantalla.

- **Reglas del carrusel** (5–10 paneles, máx. 3 por fuente, ninguno sin trazar) se validan TRES veces: cliente (`validateCoffeedDraft`), action, y trigger `coffeed_guard_accept` al publicar. El prompt es una petición, no una garantía.
- **Los agentes** (`src/lib/coffeed/aiActions.ts`, fetch crudo): validación de medio y barrido usan **web_search**; el triaje usa Haiku (barato, sin web); extracción, propuestas y post usan Sonnet. ⚠️ `claude-sonnet-5` **no admite `fallbacks`** (400, verificado 2026-07-30) ni prefill de assistant — no copiar la cabecera de GVG (que usa opus-5) a ciegas.
- **⏱ Presupuesto de tiempo por petición — el `fetch` de Node corta a los 300 s** (headersTimeout de undici) y lo único que se ve es «fetch failed». Una llamada con 2 búsquedas web tarda **~41 s medidos**; el barrido entero en UNA petición tardaba 5,1 min y moría en seco. Por eso el barrido hace **una petición por medio** con concurrencia 5, timeout explícito de 90 s, y **los timeouts se reintentan UNA sola vez** (tres reintentos multiplicaban la espera sin arreglar nada). Si se añade un paso nuevo con web_search, mantenlo dentro de ese presupuesto en lugar de agrandar la petición.
- **La maqueta del post NO la decide un modelo**: `postTemplate.ts` es puro y determinista (patrón `cvTemplate.ts` de GVG), lee la identidad de marca y empotra el logo en base64 para que el HTML descargado sea autosuficiente. El PDF es el "Imprimir" del navegador sobre ese mismo HTML.
- **La identidad de marca viaja en los prompts** (`brandBrief`): la dirección de arte entra como contexto en extracción, propuestas y redacción.
- **Los anuncios SÍ viajan** a KR/CP/DC junto a los capítulos (cambio del 2026-07-30; antes eran solo internos).

## V4 · Superficies de captación Clase B + CRMs por consola (2026-07-31, Fase 1)

The V4 restructure (`docs/V4_RED_RESTRUCTURE_ANALYSIS.md` — read it for the full model: CTC Home as router, three I/O classes, frozen Fase 0 rules incl. the canonical Specialty/Black vocabulary) shipped its Fase 1:

- **Three capture-only surfaces** ("Clase B": landing + project form, NO login, NO new tables): `/ctc-tech`, `/co-create`, `/varietales` — subdomain-routed like everything else (`src/proxy.ts`). Shared mould in `src/components/services/` (`SurfaceShell` + one landing each + `surface.module.css`). They mount the existing `ContactModalProvider` with **`googleAuth={false}`** — these subdomains have no `/auth/callback` route and are not in Supabase's redirect allowlist, so the Google path is deliberately absent (Fase 1 "option a"; adding it later = per-surface callback route + allowlist entry, pattern in KR/CP/Directorio). Forms post to the unchanged `submitLeadPublic` with their pillar.
- **Copy is NOT duplicated**: the landings import `SERVICES_COPY`/`TECH_STATIC`, exported from `src/components/ctc-home/ServicesSection.tsx` (see the comment at its foot). Fase 2 (CTC Home → router) will move the copy out of CTC Home for good; until then ServicesSection is the single source. **Varietales is content-minimal on purpose** — owner material pending; the landing takes it as a new section when it arrives.
- **The leads board became `src/components/panel/LeadsBoard.tsx`** (parametrized by pillar; the old `/ocp/leads` page body verbatim) and split per the Fase 0 rule "the CRM lives in the console that owns the domain": `/ocp/leads` keeps ONLY `general` (Recepción de la red), `/bcp/co-create` = CRM Co-Create (core business; future link to Black Stock), `/ecp/ctc-tech` + `/ecp/varietales` = the strategic-layer CRMs. One `leads` table, unchanged actions (`src/app/ocp/(app)/leadsActions.ts`).
- ~~DNS/Vercel pending~~ **DONE 2026-07-31**: all three subdomains live with TLS (owner added Vercel domains + Hostinger CNAMEs).
- **Terratalento V2 (2026-08-02, V2.37–V2.38)** — plan in `docs/TERRATALENTO_V2_PLAN.md` (its §5 carries the owner's frozen decisions). **(1) Google login** on the surface: `/terratalento/auth/callback` (Directorio clone, no role promotion); the `redirectTo` carries the `/terratalento` prefix ON PURPOSE — the proxy skips rewriting a path already starting with its base, so one URL serves dev and subdomain. **Owner must add it to Supabase → Auth → URL Configuration → Redirect URLs.** **(2) Structured terms** (migration `terratalento_terminos_contractuales`): pago modalidad/valor/unidad/forma/frecuencia, alojamiento/alimentación/transporte + detalle, horario, duración, requisitos — `pago`/`condiciones` KEPT as free notes. Read/formatted ONLY through the pure module `src/lib/terratalento/terminos.ts` (QA `scripts/qa-terminos-check.mjs`, 19 checks) so the three fronts render the deal identically. **(3) Three kanbans**: recolector's own funnel (Postulado/Te llamaron/Confirmado), KR jornadas by estado with a fill meter, ECP two-level (jornadas × postulaciones) + municipio/disponible filters. **(4) Acceptance + frozen snapshot + constancia**: postular now REQUIRES ticking the terms (seals `terminos_aceptados_at`; the button stays disabled until then); confirming freezes `terminos_snapshot` (arena/DDS pattern — **verified live: finca later dropped pago 800→500 and changed horario, the agreed snapshot held**); `constanciaPrint.ts` emits a printable **constancia de acuerdo** — per §5.2 it carries NO obligating clauses and never says "contrato". **(5) §5.1**: the finca now sees name+phone of **confirmados only** (verified: cédula and emergency contact do NOT leak). ⚠ QA note: the owner has their own real jornada + recolector profile in prod — scope every Terratalento cleanup by id, never by table.
- **Terratalento llamado notification (2026-08-02, V2.36)**: marking a postulación `llamado` or `confirmado` in the ECP now emails the recolector (their ecosystem-account address) via Resend — builder is the PURE module `src/lib/email/llamadoEmail.ts` (no imports; QA runs it via `scripts/qa-llamado-email-check.mjs`, 8 checks), sender wraps it in `terratalentoEmails.ts` with the leads never-throw contract. The estado change NEVER blocks on the send; the outcome persists on the row (`notificado_at`/`notificacion_error`, migration `terratalento_llamado_notification`) and the ECP popup shows the chip + Reenviar/Reintentar button (`reenviarNotificacionLlamado`). Local dev has no `RESEND_API_KEY`, so sends fail-and-record there — production sends for real.
- **Terratalento shipped (2026-08-02, V2.35)** — the RECOLECTOR (harvest-picker) service, a new user type. Three legs: **(1) public surface** `/terratalento` (subdomain `terratalento`, DNS pending) — Directorio-pattern identity (same ecosystem Supabase account, roleless — never touches `profiles.role`; a producer account entering Terratalento just sees "completa tu perfil"), landing + email/password acceso (no Google — no callback on that subdomain) + panel: profile upsert, availability toggle, open Jornadas list with postular/retirar and estado chips. **(2) KR producer-panel module "Jornadas de Recolecta"** (`JornadasRecolectaModule`, self-loading like CoffeedWall): publish per-finca jornadas (fechas/cupos/pago/condiciones), see counts only — recolector CONTACT DATA never travels to the producer, CTC brokers it. **(3) ECP match board** `/ecp/terratalento` (replaced the scaffold): jornada popups (LeadModalRow) with the postulados roster + estado actions (llamar/confirmar — cupos-capped —/descartar), jornada estado control, and the full recolector roster. Tables `terratalento_{recolectores,jornadas,postulaciones}` (migration `terratalento_core`), **service-role-only** (RLS, zero policies); all logic in `src/lib/terratalento/actions.ts` + `src/app/ecp/(app)/terratalento/actions.ts` (audit_log on ECP writes). **Verified live end-to-end with QA accounts (deleted after)**: producer login → publish jornada → recolector signup-less login → profile → postular → SQL-simulated ECP confirm → both sides reflect it (ECP itself is 2FA-blocked in browsers, per the standing rule). CTC Home's index gained the Terratalento tile (10 doors).
- **Fase 4 shipped (2026-08-01, V2.33) — Herramientas del Café**: `/herramientas` (subdomain `herramientas`) publishes the tools as a product over the EXISTING matrix — `ToolSurface` gained `"web"` (`ToolSetting.web`, merged safely into stored configs by `toToolsConfig`), `loadToolAccess("web")` rules **Default = anonymous visitor, Plus = any logged-in platform account** (shared cookie recognizes KR/CP/Directorio sessions — no new login), ToolsAdmin got the "Herramientas (web)" column, `TOOL_COPY` moved to `src/lib/tools/toolCopy.ts` (single source, ECP page + landing consume it; KR keeps its own producer-voiced dict on purpose). Page is `force-dynamic` (session changes the list). Web defaults: the 4 mermas/agtron/catación tools on, qr/formula/viaje/datasheet off — owner tunes in Disponibilidad. Remember the standing caveat: files in `public/tools/` are fetchable by URL; the matrix is curation, not secrecy. **Y son SUPERFICIE SEO (2026-08-14)**: esas 12 URLs son indexables —`/tools` está fuera del matcher del proxy y `robots.txt` no lo cubre— así que su `<title>` es el titular que enseña un buscador. Por ahí salía el **rastro del cacao**: `mermas-rapida.html` se titulaba «…para Café y Cacao», producto de una iteración temprana de la compañía. **Solo se cambió el título** («Calculadora de Rendimiento · CTC»); la herramienta conserva su modo cacao entero y funcionando. ⚠️ **REGLA**: `cacao`/`cocoa`/`chocolate` en `rueda-catacion.html`, `viaje-cafe.html` y `fichaData.ts` es **vocabulario de cata** («Frutos secos / Cacao» es categoría de la rueda SCA) — es independiente del producto y **no se toca**. El producto se fue; el descriptor se queda. **Pendiente**: solo 2 de los 12 llevan meta description y los títulos son inconsistentes — superficie que nadie gobierna, candidata del módulo «Manejo de Plataformas». CTC Home's index has **zero "Pronto" tiles left**. DNS pending for `herramientas`.
- **Black Stock shipped (2026-07-31, V2.32)**: `/bcp/black-stock` promotes the orphan `black_negotiations` row into the two-faced module — the purchase **pipeline** (kanban `stage` nueva/en_conversacion/acuerdo_cerca + `target_kg`, actions in `blackStockActions.ts`; the comprar/liberar decision stays `decideBlackNegotiation` in contractActions) and the **acquired inventory** (per bought lot: contract status → confirmed `contract_releases` kg → `lot_listings` state feeding CP Green's Black tab). Migration `black_stock_module` added `stage`/`target_kg`/**`lead_id`** (FK→leads, ON DELETE SET NULL — the Co-Create link seed, column only, NO UI yet by design). `/bcp/contratos` lost its Black block (now a count + link); `BlackNegotiationCard` superseded by `black-stock/BlackStockCard`. Nav: BCP comercial group. Table currently empty (post-reset) — first jornada that grades a Black self-populates it.
- **Fase 3 shipped (2026-07-31, V2.31)**: `/coffeed` (subdomain `coffeed`) — the Class C public Home over the SAME curated wall (`CoffeedHome` mounts the existing self-loading `CoffeedWall`; no login, no capture); `/control-panel` (subdomain `panel`) — the selector's public landing (`ControlPanelLanding`, console data imported from `src/lib/panel/consoles.ts`, CTA → the unchanged `/login` master login; on the `panel` subdomain the login link must be ABSOLUTE to www in prod, the proxy would rewrite a relative `/login`). CTC Home's network index now links both; only Herramientas remains "Pronto". DNS pending for `coffeed` + `panel` (owner, same pattern).
- **Fase 2 shipped (2026-07-31, V2.30) — CTC Home is the router now**: the services copy moved to `src/components/services/servicesCopy.tsx` (single source; the landings AND CTC Home import from it — ServicesSection no longer holds copy). `ServicesSection` is 4 **route cards** (tag/title/sub/body/chips + link to the surface; ids `ctc-tech`/`cocreate`/`directorio`/`varietales` kept for deep links; section id stays `tech` for QuickMenu) plus an "Escríbenos y te orientamos" general-form row — the per-service deep-dive content (5-tech modals, points, specs) renders ONLY on the surfaces now. `EcosystemSection` closes with **the network index** (`netTiles`): Roast, X, Co-Create, CTC Tech, Varietales, Directorio, Control Panel (`/login`) linked; Coffeed + Herramientas as "Pronto" tiles — flip those to links when their surfaces exist (Fase 3/4).

## Feature status per platform

**Cherry Picked is a PLATFORM, not a storefront (owner ruling, 2026-08-11 — SPLIT SHIPPED same day, V3.15)** — the buyer side is one platform with four programmes inside: **Co-Create** (the first door — build a brand's supply; it carries the **Master Roaster** model, a reference roaster implementing it with CTC in their own market), **Green** (green coffee in fractions, enabled **one market at a time**), **Roast** and **X** (both 2027).

- `/cherry-picked` is now the **portada** (`components/cherry-picked-hub/HubLanding.tsx`) — four programme cards + a "what all four share" band. No `FamilyBubble` on it: the page *is* the chooser.
- `/cherry-picked-green` is the **store** — the untouched `CherryPickedExperience`, with its **own** `auth/callback`. That path matters: the proxy prefixes the subdomain's base onto any path that doesn't already start with it, so a `/cherry-picked/auth/callback` requested from `cherry-picked-green.*` would rewrite to `/cherry-picked-green/cherry-picked/auth/callback` and 404. `LoginModal` builds the new path; the **old callback was kept** and now redirects to Green, so a Google consent screen opened before the deploy still lands somewhere real.
- **`FAMILY_LINKS` (`components/cherry-picked/i18n.tsx`) is the single source** for the family: it gained `hub` and `cocreate`, and `green` moved to the new subdomain. Anything that means "go buy" points at `green`; anything that means "meet the house" points at `hub`.
- Links repointed to **Green** (they mean *the store*): `RedSwitcher`, `directorio/data.ts` PLATAFORMA_LINKS, KR's Footer/Hero/TratoSection, `HerramientasLanding`, and the `revalidatePath` lists in `lib/tools/{plusGrants,toolAccess}.ts` — that last pair matters, or the tools tab inside the store goes stale. Left on the **portada** on purpose: CTC Home's hero CTA, its ecosystem card, `pageIndex`, and `leadEmails.platformFor("cocreate")`.
- **OWNER ACTION, still pending**: add `cherry-picked-green` as a domain in the Vercel project and a **CNAME `cherry-picked-green` → the target Vercel shows** (historically `ade3fc85fa244f17.vercel-dns-017.com`) in Hostinger's zone — pattern in `docs/PARTNER_DOMAINS_SETUP.md`. Until that exists the store is reachable at `www.ctcexport.com/cherry-picked-green`, but every in-app link built for production points at the subdomain.
- ~~Not done, deliberately: Co-Create's own landing still self-identifies as "CTC Co-Create"…~~ **SUPERSEDED 2026-08-14**: the whole programme was renamed **CaaS · Coffee as a Service** (portada, landing, seal, `/caas`, `/bcp/caas`) — see the «Co-Create» pasó a llamarse CaaS section below. It still keeps its Class B capture shell (landing + project form), which is by design.

**CTC Home + KR — pass del owner 2026-08-14 (V4.2)**: **(1) «Tres ofertas» se desnudó** — las dos tarjetas insignia quedaron en procedencia + logotipo grande + UN botón punteado; la entradilla, los puntos y las salidas viven en la ventana que abre el botón (`InfoPanel`, que ganó `ctas` múltiples para el par portada/Co-Create de Cherry Picked). La captación de correo (`NetNewsletter`) ya no cierra la sección: era el aviso de Terratalento y vive DENTRO de su ficha (la única puerta «Pronto»). **(2) Video de presentación** en la cabecera de esa sección y en el nuevo bloque **«Bienvenidos al Kaffetal Regal»** de KR (video + 6 pasos numerados, entre la portada y la franja del paisaje): ambos montan el compartido **`src/components/YtEmbed.tsx`** — patrón lite (miniatura estática, iframe de youtube-**nocookie** solo al clic; quien no toca el video no paga el MB de JS de YouTube). Cambiar un video = cambiar el id constante donde se monta (`OFERTAS_VIDEO_ID`, `BIENVENIDA_VIDEO_ID`). **(3) El loop de iconos del hero ocupa ~1/3** del ancho junto al titular (rejilla por `grid-template-areas`; en móvil los botones bajan a su PROPIA fila — su `min-width` de 252 px dentro de la columna del titular empujaba el loop 41 px fuera de la pantalla, recortado en silencio por el overflow-x oculto del body; el titular baja a 23–30 px bajo 560 px, ajuste autorizado). **(4) La pareja vender/comprar se repite** al pie del Contexto y del calendario de cosechas (`SellBuyCtas`, mismo sistema `.ctcb` y mismas URLs del hero). **(5) El velo del hero de KR se aligeró** (loop a opacidad .32, velo abierto sobre todo a la derecha; la columna del titular sigue >10:1 contra el fotograma blanco del zoom).

**CTC Home** — **conversion/UX pass 2026-08-11 (V3.14), read this first for anything on `/`**: the ecosystem section is now just three gestures — the two flagship cards, the **"El puente · Para la industria del café / Ecosistema de Valor CTC"** band with its six modules (CTC Tech, Varietales, Directorio, Coffeed, Herramientas, Terratalento), and the newsletter capture. The numbered 1·2·3 offer rail, the five-cell "Lo que pasa en el medio" grid, the "El hilo de integración" block and the whole eleven-door "Índice de la red" were all removed as restatements of each other; the thread's copy was folded into the Contexto's **La Trazabilidad** popup (the regions map and grade-seal images are no longer on the page, only in `public/images`). The hero was stripped to three hover-explained claims (`Café 100% de Origen · Calidad, Trazabilidad y Perfilamiento · Global SupplyWave 4.0`, tooltips drawn with `content:attr(data-tip)` — no React state), the headline, and **two first-person CTAs** — gold "Produzco un gran café" → Kaffetal Regal, blue "Necesito un gran café" → Cherry Picked. The positioning paragraph was deleted (it repeated the ecosystem intro and pushed the buttons below the fold). The old loose fact strip became **four one-line buttons** that open the shared `InfoModal` (cosechas / cumplimiento EU-USA / logística / grados). **The "Oferta 3 · Value Ecosystem" section no longer exists** — `ServicesSection.tsx`, its CSS and `OpenFormButton.tsx` were deleted and the `#tech` anchor with them; the four service panels now open as modals from their own door in the network index (`EcosystemSection`), reading from `components/services/servicesCopy.tsx` (still the single source the four landings use), and the other seven doors got fichas too. Net tiles stay real `<a href>` (crawlable, ctrl/⌘-click navigates); only the plain click is intercepted. `MomentSection` was cut to heading + chart + two sentences, the chart got four HTML dots over the curve apexes (HTML, not SVG, so touch targets and keyboard focus survive any width) and scrolls horizontally below ~600px instead of squashing, and five same-style concept shapes (olas/diáspora/terruño/trazabilidad/perfil) open their own modals. `pageIndex.ts` lost `tech` and both menus now end with the two real doors. The language bubble moved to the bottom **right** under QuickMenu (`LangBubble` gained `align="right"`; other surfaces unaffected). **New: the market ticker** (`components/ctc-home/MarketTicker.tsx` + `lib/market/ticker.ts` + `app/api/home/ticker/route.ts`) closes the hero — NY-C arabica and FX from Yahoo's keyless chart endpoint, the FNC internal price read from `market_anchors` (already fed by the OCP's daily cron), and headlines from the approved `coffeed_sources` outlet feeds parsed with Coffeed's own `parseFeed`. **Don't go hunting for London robusta or ICE certified stocks again** — neither has a free public source (RC=F/RM=F/LRC=F, Yahoo search and Stooq all checked 2026-08-11); both are declared as anchor kinds (`robusta_londres`, `ice_certificados`) and the ticker draws them automatically once `market_anchors` holds a reading, but the OCP's `AnclasBoard` still only manages `ANCHOR_KINDS[0]`, so entering them needs SQL or a board rebuild.

**CTC Home** — **cosmetic pass 2026-07-14**: the hero is now dynamic (guacamayo/finca loop behind the copy, dark scrim — lightened + re-measured 2026-07-14, see gotcha 9 — light-on-dark type; the aside holds the sketchbook CTC icon loop (**swapped 2026-07-15** to `public/images/shared/ctc-loading-icons.webp`, 310 KB, 300×300, 63 frames @810ms — the replacement `reference_gifs/CTC_Loading_Icons.gif` ships REAL alpha, no white-keying needed; the same loop now also closes the KR and Cherry Picked footers at 96px via each Footer's `.iconLoop`), and the hero grid keeps TWO columns even under 900px on purpose (copy/CTAs left, loop right, no stacking) — the Piedecuesta photo moved to the footer sign-off as the page's closing image). **Shared `QuickNav` (2026-07-15, `src/components/QuickNav.tsx`)**: the same floating index FAB as CTC Home's QuickMenu, mounted on the Kaffetal Regal landing (bottom-right) and Cherry Picked store view (bottom-**left** — the cart owns bottom-right), theme-branded via the site's `[data-theme]` vars, with a fixed first entry back to the casa matriz (`https://ctcexport.com` in prod, `/` in dev via `NODE_ENV` — compile-time constant, no hydration mismatch); "El hilo de integración" shows the coffee-regions map + the CTC grade seals; each CTC Tech technology has an ⓘ deep-dive modal (photo hero + tagline + scannable points + a CTA into the tech contact form); a floating **QuickMenu** FAB (same shape as the Finca panel's save button) opens a section index with the current section highlighted; the footer closes with the full logo. Marketing site + lead capture (2026-07-13): the "Escríbenos"/service contact modals no longer open a mailto — they create a lead + platform account (Google via the root `/auth/callback`, or created on the visitor's behalf with a temp password; Co-Create → Cherry Picked buyer, everything else → Kaffetal Regal producer via the shared `src/lib/auth/promoteFreshBuyerToProducer.ts`) and send a welcome email. Leads are triaged in /bcp/leads.

**Kaffetal Regal** — real auth (email/password + Google), real finca/lot CRUD, full Ficha Técnica (all 8 panes ported 1:1 from the source CTC datasheet tool), dashboard with per-lot sparkline/kanban/AI-advice display. **Ficha UX pass (2026-07-15)**: centered fade-in gate popups + per-stage celebration overlays (replacing toasts); green active nav tab; floating Guardar/Ayuda FABs (Ayuda → comm-log with `Ficha <ref>` context); A2 origin categories as uniform ⓘ-cards; B1 closed % selector (100/75/50/25, +33 at 3 varieties; first-row default 100 or 50 by category) with datalist variety search and Liberica/Mezcla species (Mezcla blocked if any variety is 100%); **soft cert-proof gate** — checked A3/A4 certs without attachment are "Pendiente de soporte" (never hard-block; warned at FT2, final reminder at Ficha submission, then **unproven selections are unmarked** via `stripUnprovenCerts()`; attachments accepted even on locked A3/A4 until submission); B2 five SCA bands (`scaClassFor`: Comercial <80 / Especial / Especialidad / Alta Especialidad / Rareza ≥90), attributes under the chart, single structured Q-Grader block feeding the relocated officialization banner; B3 auto-solved read-only Residuo (always closes granulometry to 100%, red %) + 250 g default sample; A5 reordered (país → separación side-by-side → custodia uniform cards) with a positive traceability checkbox and a **soft finca-aptitude gate** (continue to video with a red EUDR-pending flag); B4 up to 3 videos (extra 2 in `datasheet.extra_video_assets`) with shooting tips + 3 YouTube Shorts references; **Envío de muestras module** now lists pending-sample lots with "Descargar instrucciones" (printable CTC-branded HTML, producer incognito — package carries only the lot code, blind cupping; `shipmentInstructionsPrint.ts`) and the migrated "Confirmar envío" (with warning confirm). **Kaffetal Club "Pasaporte" (2026-07-14)**: the "Mis contratos" producer-panel module is member-only — non-members see a locked tile and a passport gate (exporters-club narrative, "Solicitar mi Pasaporte" request button, Número de Pasaporte redemption form; see the Kaffetal Club schema bullet for the full mechanics). This is the most actively developed surface right now. **UI/UX pass 2026-07-10** (first of an ongoing progressive pass across all platforms) reworked the producer profile and the whole Ficha flow:
  - **"Información general" (`InfoModal.tsx`)** expanded from 3 fields to: razón social, NIT/CC, nombre del agricultor, cédula cafetera, celular (+ "tiene WhatsApp" toggle), foto de perfil (≤5 MB), video del productor y su equipo (≤100 MB), país, departamento base, and an auto-generated supplier code (`supplierCode()` in `data.ts`, derived from the profile id like `lotCode()`/`ctcLotReference()` — no extra column) with a "Exportar QR (.jpg)" button (`qrcode` npm package → canvas → JPEG download, fully client-side, no third-party network call). País/departamento base are also the seed default for a new finca's department and a new Ficha's A2 país/departamento when neither is yet set.
  - **Unified lot reference**: `ctcLotReference(id)`/`ctcLotReferenceShort(id)` in `data.ts` replace the old ad-hoc `CTC_2601{...}` string that used to live inline in `FichaView.tsx` and didn't match the dashboard's separate short code. The short `lotCode()`/`Lot.code`/`ProducerContract.lotCode` were removed entirely in a follow-up round (2026-07-10) — `ctcLotReference()` is now the *only* lot reference anywhere in Kaffetal Regal (dashboard lot cards, contracts, certified list, AI advisor context), always with the first 7 characters after `CTC_` bolded (what actually goes on the physical sample package).
  - **Ficha A1**: Proveedor/NIT/Productor are now read-only, sourced from the producer's profile (`gi`) instead of independently typed — edited via "Editar información," never drift-able from the Ficha. "Especie" moved out of A1 into B1 (next to the variety table, where it's used).
  - **Ficha A2**: selecting a real finca now makes país/departamento/municipio/masl/geo read-only and permanently synced to that finca's own record (edit the finca to change them) — previously it only filled blanks once. Freeform/blend categories are unaffected.
  - **Ficha A3/A4**: every certificate checkbox got a `CertCheckbox` (shared component) with an ⓘ info toggle (short plain-language description, `CERT_INFO` map in `fichaData.ts`) and, once checked, a file upload (≤5 MB) for supporting documentation — stored as `{assetId, fileName}` in a new `cert_attachments` map on `FichaFormData` (jsonb, not a new table/columns).
  - **Ficha footer**: the old Cargar/Guardar CSV + "Guardar y poner en fila" buttons are gone, replaced by **Guardar** (persists progress, stays on the page, never advances `stage`) and **Completar y Enviar** (disabled until A1+A2+B1 are complete; only this button can advance `stage` borrador→ficha_completa, via a new `finalize` flag on `FichaSaveUpdate` — see the guard-model note above for why this distinction matters).
  - **NextStepWidget ("¿Y ahora qué?")** moved from above the panes to below the footer, and no longer auto-fires on mount/lot-switch — it now shows a neutral prompt and only calls the API on an explicit click (the backend route's own `force`-aware cache check still avoids redundant Anthropic calls either way).
  - **B4/B2 restructure**: B4 is now just "Video del Café" (uploads straight to the pre-existing `lots.video_asset_id`, previously unwired to any UI). "Video del productor y su equipo" moved to Información General; "Video de la finca" moved to `FincaModal` (new `fincas.video_asset_id`). Everything B4 used to hold (notas de análisis, Q-Grader refs 1–3) moved into B2, underneath the SCA table.
  - Sample-shipping address corrected across `AppDashboard.tsx`, Kaffetal's `Footer.tsx`, `ParticiparSection.tsx`, and CTC Home's `Footer.tsx` (was a stale `Cra. 4 # 10-8`).

  **Follow-up round, same day (2026-07-10)**, in response to live bug reports and further UI feedback:
  - **Fixed a real production crash** (see guard-model note above): old lots with a saved `datasheet` predating `cert_attachments` threw on A3/A4 mount. Fixed by merging onto `EMPTY_FICHA` instead of an either/or fallback.
  - **"Completar y Enviar"** was a real HTML `disabled` button (so an incomplete attempt did nothing visible) — now `aria-disabled` + dimmed styling, still clickable, and shows a toast naming exactly which panes (A1/A2/B1) are missing.
  - **Fecha de Revisión** (A1) auto-stamps on every Guardar/Completar y Enviar; field is read-only.
  - **FieldInfo tooltips** in B1/B3 now state acceptable ranges, not just definitions (humedad 10–12%, aW 0.55–0.65, factor de rendimiento ref. 94, SCA specialty defect thresholds, etc.).
  - **"Washed" → "Lavado"** in Proceso Base.
  - **Dashboard kanban stepper** relabeled `S1-S4/E1-E2` → `FT/VID/MUE/ARE/EVA/GAL` (`LotKanbanStepper.tsx`), matching the stage names already used as hover tooltips.
  - **De-duplicated** the stage/grade text that used to appear both in the state chip and the "Finca: X · ..." line (`STAGE_EXTRA` in `KaffetalExperience.tsx` is now purely forward-looking guidance, never repeats the stage word); added two more lot-row chips, **Proceso** and **Grado CTC** (`l.grade || "Pendiente"`).
  - **A2 multi-finca**: selecting anything other than "Single Estate" now shows a finca checklist (new `additional_estates: string[]` on `FichaFormData`) instead of forcing a single dropdown.
  - **New two-sided sample-handoff workflow** (was previously just an implicit side effect of BCP picking a stage from a dropdown): producer gets a "Confirmar envío de la muestra" button once `stage` reaches `ficha_completa` (sets new `lots.sample_shipped_at`, only while still in the producer-writable window — see guard note above); BCP's `/bcp/lotes` can no longer reach `fila_arena` via the generic stage-select (that option was removed from the dropdown and `updateLotStage` now rejects it) — only the new `confirmSampleReceived()` action can, and it requires `sample_shipped_at` to be set first (or `source='bcp_manual_entry'`, since those lots have no producer to confirm shipment). This is what sets `sample_2kg_confirmed_at` now — deliberately, not as a side effect of an unrelated dropdown pick.

**Cherry Picked** — real buyer auth, real catalog (fed only by BCP-published listings), cart/reservations, checkout via the atomic `place_order()` RPC, membership tiers, sample packs. **Tyrian auction is still 100% static demo** (`TyrianSection.tsx`) — explicitly deferred, not started. **Family revamp (2026-07-17)**: Cherry Picked became a 3-part family — **Green** (the existing storefront, rebranded with the Green seal), **Roast** (`/cherry-picked-roast`, scaffold landing: full Green offer roasted by the Master Roaster; pricing = live Green price + a flat **9.50 €/kg** fulfillment fee [single source of truth: `FEE_EUR_KG` in `RoastLanding.tsx`]; roasted-kg MOQs Black 200 / Red 150 / Blue 100 / Gold 50 / Tyrian 20 [~20% roast mass loss, batches 100 kg green → ~80 kg roasted]; label programme **My Brand** [full front label + Master Roaster sticker + Finca sticker] / **Co-Brand** [predefined front space] / **Papagayo Beans** [CTC house brand, default], standard back label; the **Master Roaster consumes green through its own Green account** for transparency) and **X** (`/cherry-picked-x`, scaffold landing: the full offer **without Black**, per-season boxes from **3 kg**). Ordering for Roast/X is explicitly NOT built — both scaffolds point at the Green catalog until their product logic connects. **The whole family is trilingual (EN default / ES / DE)**: `src/components/cherry-picked/i18n.tsx` holds `LangProvider`/`useLang`/`LangSwitch` (persisted in `localStorage["cp-lang"]`, shared by all three sites) + `FAMILY_LINKS` (dev paths vs prod subdomains, NODE_ENV compile-time); every component keeps its own `Record<Lang, …>` dictionary next to its JSX; `fmt`/`eur` in `data.ts` now REQUIRE a lang argument (locale-aware number formatting); `HarvestCalendar` gained an optional `months` prop and `QuickNav` an optional `labels` prop (defaults stay Spanish so Kaffetal Regal is untouched). Image pass: the Black section, Grados intro and Historia now use real photos (`27-bodega-costales`, `28-cerezas-rama-real`, Historia diptych `29-fundador-vereda` + `30-tostaduria-europa`); the hero's stock branch cutout was replaced by the Green seal; the 3 family seals live in `public/images/shared/cherry-picked-{green,roast,x}-seal.webp`. Buyer-facing lot references now show the short `code` (BK-/RD-/BL-/GD-XXXX) instead of the raw listing UUID (LotCard summary, cart lines, profile). **UI pass, same day (owner feedback)**: Roast and X are explicitly **"Coming Soon · kickstart 2027"** (the destination network is being built; Green goes first — ripest market, container-breaking volume; nothing sellable on Roast/X) with a **newsletter capture** on both (`newsletter_subscribers` + `NewsletterForm`, honeypot, verified end-to-end); the family switcher pills wear **brand colors when active** (Green=`--primary`, Roast=`#6F4E37` coffee brown, X=`--t-tyrian`, single source `FAMILY_COLORS` in `i18n.tsx`) plus a floating **`FamilyBubble`** FAB stacked above the QuickNav menu-lines FAB (all three sites, always reachable where header pills hide); Green is **product-first** — Grados sits directly below the hero manifest, Black second (QuickNav renumbered); the Grados section's background IS the real branch photo (`32-cerezas-fondo.jpg`, gradient paper wash strong at top, naked-text contrast measured: h2 10.7:1, body 4.98:1 worst-case; everything below sits on solid cards); Black's photo is the roastery-café bar (`31-bar-tostaduria.jpg`) with warp-proof CSS (`width:100%;height:auto`). **Second UI pass, same day**: family AND language switching moved OUT of the headers into a bottom-left **bubble column** (`FamilyBubble` + new `LangBubble`, sharing `FamilyBubble.module.css`; each takes a `bottom` prop — Green stacks 24/92/148 over the QuickNav FAB, scaffolds 24/80; hover opens but only click-outside/Escape/selection closes — the old mouse-leave close made the panel vanish before it could be clicked; each bubble hops independently every 10–15 s via `useRandomBounce`); `#grados` is **catalogue-first** ("The catalogue" title + ~20-word copy → tabs → cards) with the grade-by-grade story + EUDR as one solid `.explain` block underneath; **`VisitCtcBand`** (animated `visit-ctcexport.webp`, 2.3 MB, converted from the owner's 149 MB GIF — ⚠ the asset's frames carry a baked-in typo "Expore"; swap the webp when a fixed GIF exists) sits between Envíos and Tyrian linking home; the Muestras scoop is now the transparent cutout (`scoop-verde.webp`) top-right with reserved heading space; the footer icon loop is centered at the very bottom. **Roast**: pricing formula gained a third component **"Orchestration honoraries · by grade"** (📌 per-grade figures still owed by the owner — copy says "announced with each season's catalog"); the MOQ ladder became a grow-in **bar chart** (bars scaled to Black's 200 kg); the three label options carry minimal **SVG bag sketches** (dashed = the roaster's own space).

**Directorio del Café · Santander (2026-07-24)** — the network's **people layer**: every other surface is about lots and coffee, this one is about the professionals (caficultores, baristas, tostadores, catadores, formadores, logística, comercio exterior). Ported into the repo from the owner's standalone prototype `reference_directorio-expertos/directorio-cafe-santander_V2.html`; lives at `/directorio`, subdomain `directoriodelcafe.ctcexport.com` (DNS steps in `docs/DIRECTORIO_DOMAIN_SETUP.md`). One route, three views held in client state (`DirectorioExperience.tsx`): public **landing** → **ingreso** → **app** with 4 tabs (Muro, Directorio, Mensajes, Mi perfil). Components in `src/components/directorio/`; catalogues + demo records in `data.ts`.
  - **What is real vs. demo, and why it matters**: the LANDING is the real deliverable (it's what a professional finds at the subdomain: the pitch, the 5 requisitos, the Ley-1581 notice, the ecosystem cards). Everything BEHIND the login is a **maqueta with fabricated data** — 44 invented fichas, 3 invented conversations, 8 invented posts — and the UI says so loudly and deliberately (dashed-gold `.mockbar` on Muro and Directorio, a `tag--mock "Simulado"` on every ficha card and post, "Perfil simulado" in the ficha modal, "Demo · no se envía nada" on the inscription form). **Do not quietly remove those markers** — they are the only thing separating a demo directory from a directory that lies about who is in it. The *catalogues* (21 municipios, 12 especialidades + their ⓘ explanations, the 7-group certification bank) ARE real and are what survives into the Supabase-backed version.
  - **Nothing persists yet.** The inscription form, the login, the profile save, the messages and the wall posts are all in-memory; a reload resets the maqueta. The single point that changes when it gets a real backend is `ModalInscripcion`'s `onSubmit` (→ a server action + its own table, `leads`-style service-role-only) and the login (→ the same Supabase Auth account as Kaffetal Regal / Cherry Picked, which is literally what step 02 of the landing promises).
  - **Styling is a route-scoped plain stylesheet**, `src/app/directorio/directorio.css` — same pattern as `src/app/bcp/tailwind.css`, NOT a CSS Module, so the prototype's class names survive verbatim and the diff against the original stays readable. Two deliberate departures from the prototype file, both commented at the top of that CSS: the design tokens hang off a `.dir` wrapper instead of `:root` (next/font exposes its variables through a class that lands on a `<div>`, so a `var(--font-…)` referenced at `:root` would resolve against `:root` and die), and the element selectors (`h1-h4`, `a`, `button`, `p`) carry a `.dir` prefix to outrank `globals.css` on specificity rather than depending on stylesheet load order.
  - Fonts are **Big Shoulders / Lora / IBM Plex Mono via `next/font`** (self-hosted, no Google Fonts `<link>`). ⚠ Google renamed the family: the prototype asked for "Big Shoulders Display" but next/font only exports `Big_Shoulders` — same typeface, the `_Display` variant does not exist.
  - The prototype's inline base64 images were replaced by the real shared assets already in `public/images/shared/` (parrot, full logo, Kaffetal + Cherry Picked logos, the G&G illustration) — the HTML dropped from 247 KB to nothing shipped in markup. The shared `LegalFooter` closes all three views, so the NIT + version badge match the rest of the network.
  - Verified live 2026-07-24 end to end at 1280 and 375 px: inscription → login (email + platform carried through) → app; wall filter/publish/like; directory search (accent-insensitive: "genetica" finds "Genética y viveros"), 5 filters, 4 sorts, empty state, clear-filters; ficha modal → message → thread created at the top of Mensajes with the tab switched and the unread pill dropping 3→2; profile live preview, completeness meter (92% → 83% when the attachment is removed), save committing to the app bar. `curl -H "Host: directoriodelcafe.ctcexport.com"` returns the directorio while `kaffetal-regal` and the root are unaffected. No console errors, all 8 images 200. ⚠ Reading `.opcion:has(input:checked)` in the preview pane needs the transition neutralized first (gotcha 11) or `getComputedStyle` reports the pre-transition white.
  - ⚠ **The three bullets above are STALE** (they describe the original demo import). The Directorio now has a **real Supabase backend** (service-role-only tables `directorio_profiles` / `directorio_documents` / `directorio_messages` / `directorio_posts` / `directorio_post_comments` / `directorio_post_likes`; server actions in `src/lib/directorio/actions.ts`, loader `cargarDirectorio`; the same Supabase Auth account as the rest of the ecosystem; ECP verification at `/ecp/directorio` via `directorioActions.ts`). If you touch this surface, trust the code over those bullets.
  - **Per-certificate verification (2026-08-11).** A support document tied via "¿A qué apoya?" to a **certification** (not specialty/general) now gets a CTC-review badge: **gray "En revisión" on upload → blue "Verificado por CTC" on approve → gray "No aceptado" + a 10-day-removal notice on reject.** Migration `directorio_documents_cert_verification` added `verificacion` (null | pendiente | aprobado | rechazado + CHECK), `verdicto_por/at/nota`, `remover_despues_de`; the trigger is in `sanitizeDoc` (cert-linked ⇒ born `pendiente`). ECP surface: a new **"Certificados"** tab in `DirectorioAdmin.tsx` (queue, pending-first) + `aprobarCertificado`/`rechazarCertificado` (post a CTC message into the user's thread, audit `entity_type='directorio_document'`; reject sets `remover_despues_de = now()+10d`). An approved cert shows a **public blue ✓** on the directory card / ficha / own preview (`Ficha.certsVerificadas`, computed in `loadDirectorio`) — so directorio docs are no longer strictly private: the *fact* a cert is verified is public, though the document itself still isn't. **10-day removal uses no new cron** (Hobby cap): lazy sweep of the owner's own expired rejects in `cargarDirectorio` + a global backstop `barrerCertificadosVencidos()` (`src/lib/directorio/sweep.ts`) hung on the existing daily integraciones cron. Verified: migration columns present via `information_schema`; producer side driven in-browser (gray badge on upload); ECP + sweep verified via SQL (2FA blocks the browser).

**BCP** — password+OTP 2FA login, finca approval, lot list/proxy-create, full Arena workflow (schedule → queue → score → close with majority-vote grading), **Jornada de Arena live runner (2026-07-14)** at `/bcp/arena/[sessionId]/run`: the guided 4-stage event dynamic (host CTC + Q-Grader invitado + invitado especial) — Etapa 1 presentación/dinámica/cafés a ciegas ("Taza N", orden barajado por `startJornada`, mín. 3 lotes) + factor de rendimiento per coffee (trilla manual → defectos → malla → pesos → factor = 70·muestra/excelso, ref ≤94); Etapa 2 fragancia/aroma/primera catación + primer descarte; Etapa 3 revelación *desenlazada* de variedad/proceso/origen + descripciones oficiales del Q-Grader + segunda catación (completa la planilla SCA) + segundo descarte; Etapa 4 filtro de finalistas + veredicto (grado CTC por juez por finalista + UN ganador) + revelación completa con videos (URLs firmadas a 6 h) + cierre. Guion/estado/compuertas compartidos cliente-servidor en `src/lib/arena/jornada.ts`; el estado vivo se autosalva (debounce) en `arena_sessions.run_state`; per-step countdown timers; discard plan adapts below 7 cups (7→2/2, 5→1/1, 3→0/0). `finalizeJornada` re-validates everything server-side and writes: a **full accepted `lot_evaluations` row for every coffee in the run** (SCA sheet + granulometría in `physical_data` → feeds the official averages), per-judge `arena_scores` for finalists → majority grade (ties break upward, same rule as manual close, now shared as `majorityGrade()`) → `galardonado` + contract (non-tyrian), discarded lots → `evaluado` sin grado, and `winner_lot_id` on the session. Once a jornada starts it owns the session (manual score entry, add-lot and manual close are hidden); the legacy manual flow still works for sessions that never start one. Full Contracts workflow (sign → monthly releases → humidity flagging; signing requires Kaffetal Club membership), catalog publishing (gated on a signed contract with ≥1 confirmed release AND club membership, `total_kg` auto-synced from releases). `/bcp/club` (2026-07-14): campaigns block on top (create + clickable campaign cards → `/bcp/club/campanas/[id]` management page), passport kanban below (Elegibles → Pendiente de confirmación → Miembros activos), email retry, full ledger; `/bcp/productores` shows a "Kaffetal Club ✓" chip per member. `/bcp/lotes`'s manual stage dropdown deliberately excludes `evaluado`/`galardonado` (Arena-only) and, as of 2026-07-10, `fila_arena` too (only reachable via the new `confirmSampleReceived()` action — see Kaffetal Regal follow-up round above). `/bcp/subastas` is still a "Próximamente" placeholder. **Master login + parallel consoles (2026-07-15)**: reworked from the earlier "module groups in one sidebar" scaffold to match the v3 vision (`reference_html-vision-board/ctc-arquitectura-v3.html`). There is now **one platform master login** at `/login` + `/verify` (`/api/panel/auth/*`, password+OTP; old `/bcp/login`,`/bcp/verify`,`/api/bcp/auth/*` moved here, old URLs redirect) that opens **three parallel internal consoles sharing one session**: **BCP** (`/bcp`, identity + passport, everything existing + Usuarios), **ECP** (`/ecp`, Executive — direction/pricing/finances, scaffold) and **OCP** (`/ocp`, Operational — mirror of partner interfaces, scaffold). Each is its own route tree with a shared shell (`src/components/panel/`) and a cross-console switcher; `/panel` is the post-login console selector. Console config is centralized in `src/lib/panel/consoles.ts`; the internal read-path gate is `requireConsoleAccess(key)` (returns which consoles the identity may enter — today every `bcp_admin` gets all three). **NOTE the naming correction**: v3 is authoritative — ECP = **Executive** (direction), OCP = **Operational** (execution/partner-mirror); the earlier scaffold had these two roughly swapped. **Two identity tiers** are now the plan (`docs/BCP_USER_ADMIN_PLAN.md`, rewritten 2026-07-15): internal staff (`panel_users` + `bcp_admin`, per-console grants) and — the key correction — **partners as a SEPARATE tier** (`partner` role/table, scoped to a node type + org via the permission matrix, never `bcp_admin`). Both tiers are plan-only; the master login + console scaffold are built. `/bcp/leads` is live (2026-07-13): KPI row + one status-kanban per service pillar, lead popup with captured fields / account provisioning / fincas-lotes-pedidos connections / email thread with retries / reply composer (first reply carries the temp password, then clears it) / status select.

## Coffeed — el módulo editorial del Estudio de Contenido + su muro público (2026-07-29)

Adaptado del prototipo `reference_coffeed/` (v0.2): **el muro de noticias/anuncios internos de CTC + la línea de producción editorial de 7 etapas** (ingesta manual por URL → mesa de cata/triaje → extracción → 3 propuestas → revisión humana → borrador de paneles → aceptación → guion de vídeo). Es el **primer módulo real del socio Estudio de Contenido**: vive en `/socios/estudio-contenido/panel/coffeed` (la page hace 404 para cualquier otro slug + `requirePartner`; cada Server Action re-verifica con `estudioGate()` — `src/lib/coffeed/requireEstudio.ts`). UI en `src/components/coffeed/CoffeedStudio.tsx` (port 1:1 del look "papelería de exportación" del prototipo, CSS Modules, fuentes de la plataforma).

- **Datos**: 13 tablas `coffeed_*` service-role-only (ver el bullet en Database). Las reglas del formato (5–10 paneles, máx. 3 por fuente, ninguno sin trazar) se validan **tres veces**: cliente (`validateCoffeedDraft` en `src/lib/coffeed/types.ts`), server action, y el trigger `coffeed_guard_accept` — "el prompt es una petición, no una garantía" (decisión del prototipo que se conservó). Al aceptar, `coffeed_update_canon` actualiza los hilos del canon solo; publicar exige haber aceptado.
- **Trazabilidad**: el cuerpo de una extracción lleva marcadores `⟦afirmación|¶3⟧` / `⟦afirmación|08:41⟧` que al guardar se convierten en filas de `coffeed_claims`; tocar un claim en la vista de extracción crea un panel con su referencia puesta. Un panel sin fuente **bloquea la aceptación** (regla innegociable del prototipo).
- **IA** (`src/lib/coffeed/aiActions.ts`, fetch crudo patrón GVG): triaje = Haiku, propuestas/expansión/guion = Sonnet (decisión de coste del README del prototipo). ⚠️ **Dos gotchas de API vividos el 2026-07-29**: (1) `claude-sonnet-5` **rechaza el prefill de assistant** que usaba la edge function del prototipo (400 «does not support assistant message prefill») — se eliminó, `parseJson()` rescata el primer bloque JSON; (2) **529 Overloaded en ráfagas** — `claude()` reintenta x3 con backoff y los fallos van a `console.error("[coffeed:ia]")` además del toast. `maxDuration=300` en la page. Todo el pipeline se corrió en vivo de punta a punta (triaje real → 3 propuestas válidas → expansión con 6 paneles trazados → aceptación → guion 6 escenas → publicación). Sin ANTHROPIC_API_KEY el pipeline sigue siendo operable a mano (propuesta manual, paneles desde claims, guion determinista).
- **El muro en las superficies**: `getCoffeedWall()` (`wallActions.ts`) devuelve **SOLO capítulos `published`** con columnas de exhibición (curaduría estilo `public_lot_catalog`); los **anuncios internos nunca viajan**. El componente compartido `CoffeedWall` está montado en: **KR** (módulo `coffeed` del panel del productor), **Cherry Picked** (sección `#coffeed`, QuickNav renumerado a 11 entradas, cabecera EN/ES/DE — el contenido se produce en español a propósito) y **Directorio** (pestaña "Coffeed", solo miembros verificados). KR y CP verificados en vivo; la pestaña DC comparte el componente pero no se navegó (requiere miembro verificado).
- **Fase 1 del spec completa** (+ propuestas/guion de fase 2-3): falta el barrido automático (RSS/YouTube Data API + cron — las listas blanca/negra ya se administran pero hoy solo documentan el criterio), reacciones/comentarios del muro, y el render de paneles a imagen para Instagram.

## GVG-Space — el espacio personal del owner en el ECP (2026-07-27)

Grupo de nav owner-only al final del rail del ECP → `/ecp/gvg`. Doble compuerta: owner-only + candado propio (contraseña sha256 en `platform_settings.gvg_space_lock`, patrón Admin Lock) que acuña una cookie HMAC de 12 h con path `/ecp/gvg` — cambiar la contraseña mata toda sesión abierta (`src/lib/gvg/lock*.ts`; toda Server Action del espacio pasa por `requireGvgOwner`, que exige admin activo + owner + cookie). El contenido se re-tematiza en AZUL (rail sigue morado) — `gvg.module.css`.

**CV App Manager** (`/ecp/gvg/cv`): el motor personal de aplicaciones laborales. 5 tablas **service-role-only** (`gvg_profile` fila única, `gvg_experiences` [Master Experience: 18 ítems sembrados del docx, sections jsonb con las 6 categorías], `gvg_career_paths` [7], `gvg_cover_letter_samples` [máx 4, texto = muestra de estilo], `gvg_applications`). Storage bajo `kaffetal-media/gvg/…` (solo service role — el prefijo no cumple el patrón `{uid}/` de las policies, a propósito; subidas via signed-URL desde `prepareGvgUpload` + `putSignedUrlWithProgress`). Flujo: .mhtml de LinkedIn → `parseJobMhtml` (mailparser) → "Match Me" → Anthropic **fetch crudo** (`claude-opus-5` + `web_search_20260209` + fallbacks server-side; `runGvgMatch` en `src/lib/gvg/matchActions.ts`; `maxDuration=300` en la page porque las Server Actions heredan el segment config) → MatchResult JSON editable → "Render Resources" **determinista** (`src/lib/gvg/cvTemplate.ts`: CV A4 print-perfect con foto data-URI + carta one-pager forzado; PDF = print del navegador). Kanban proceso (nueva→matching→analysis→rendering→ready→sent; columnas de tránsito medio-anchas) + kanban follow-up (Sent → Cold **derivado** a >10 d sin toque, no escrito → Next Steps con ⭐ fecha de entrevista en el tablero principal → Rejected). `cvTemplate.ts`/`mhtml.ts` son puros SIN `server-only` a propósito (QA los importa con `--experimental-strip-types`). Gotcha del gate: el layout muestra el candado en vez de children, pero Next evalúa la page en paralelo — **cada page del espacio debe re-verificar `isGvgUnlocked` y devolver null**, si no revienta con el error de la action en vez de mostrar el gate.

## Versión de la plataforma (2026-07-20)

`src/lib/version.ts` es la **fuente única**: `APP_VERSION` (**"4.0"** desde el salto de hito del 2026-08-13) se pinta como `V4.0` en la insignia junto a "CTC Web Platform" en el rail de las consolas internas y en el **pie legal compartido** (`src/components/LegalFooter.tsx`) que cierra CTC Home, Kaffetal Regal (landing *y* panel del productor), Cherry Picked, las 4 pantallas de acceso interno (`/login`, `/verify`, `/panel`, `/cambiar-contrasena`, vía `InternalAuthShell`) y las dos páginas de cada socio. **Suba el dígito menor en el MISMO commit que despliega una tanda de trabajo** — es lo que permite mirar cualquier pantalla y saber si es lo último. El `title` de cada insignia lleva además el SHA real del build (`NEXT_PUBLIC_BUILD_SHA`, copiado de `VERCEL_GIT_COMMIT_SHA` en `next.config.ts`); si en producción dice `dev`, la variable no llegó al build. **No es** la versión de `docs/architecture/Documentacion_Interactiva_V{N}.0(...).html`, que numera snapshots de documento y avanza con su propio "Version Wrap".

El pie legal lleva el **NIT 901.483.425-7** (entregado por el owner el 2026-07-20; constante `NIT` en `LegalFooter.tsx`, compartida por los tres idiomas). Todavía **no** enlaza política de privacidad porque no existe (pendiente GDPR: debe declarar a Resend como subprocesador). Contraste medido sobre cada fondo (AA en todos): letra pequeña 5.58 sobre el navy de CTC Home, 6.14–7.90 en las superficies claras. **La letra pequeña solo se atenúa en el tono oscuro** — al 0.78 sobre blanco medía 3.73 y reprobaba AA.

## Consolas en móvil — el rail plegable (2026-07-20)

BCP/ECP/OCP eran **inusables en un teléfono**, y no por estar apretadas: medido en un shell real a 375 px, `.main` salía **1100 px de ancho arrancando en x=240**, con **965 px de contenido recortados y sin forma de alcanzarlos** (`html`/`body` llevan `overflow-x:hidden`, así que no había scroll horizontal que valiera). La causa de fondo no era el rail sino `min-width:auto`, el valor por defecto de un hijo flex: el ancho intrínseco del kanban estiraba `.main` y nada podía encogerlo. **`.main{min-width:0}` es la corrección**; sin ella cualquier retoque de anchos vuelve a romperse.

Encima de eso, `PanelChrome` (cliente, envuelve rail + `<main>`; `PanelShell` sigue siendo servidor) hace el rail plegable con **tres estados a propósito**: `null` = manda el CSS (visible ≥1024, cajón cerrado por debajo), `true`/`false` solo cuando el usuario decidió — así el render del servidor y el del cliente coinciden sin leer `window` ni `localStorage` durante el render. Bajo 1024 px hay barra superior con ☰ y el rail es un cajón que cierran el fondo, un enlace (delegación de eventos, sin efecto) o Escape; a partir de 1024 hay botón «Minimizar menú» y uno flotante para devolverlo. Minimizar **también levanta el tope `max-width:1100px` de `.main`** — sin eso el tablero solo ganaba 75 px (nada); con eso gana 255, una columna entera. Solo se recuerda el plegado (`ctc-panel-nav-open`), nunca el abierto: guardar el abierto haría aparecer el cajón encima del contenido al entrar desde un teléfono.

⚠️ **El panel de vista previa no ejecuta transiciones CSS** (gotcha 11), así que una propiedad en transición se queda clavada en su valor inicial y `getComputedStyle` miente: el rail parecía no abrirse nunca. Para medir transformaciones aquí hay que **neutralizar la transición primero** (`*{transition:none!important}`) y entonces sí leer. Medido así: cerrado x=-240, abierto x=0 con los 16 enlaces dentro de pantalla.

## Herramientas embebidas: reparto configurable + niveles (2026-07-20)

El reparto de las herramientas HTML/CSS (disco Agtron, las dos calculadoras de mermas, el generador de QR) **dejó de estar fijo en el código**. `src/lib/tools/catalog.ts` define `ToolsConfig` (`{kr, cp, tier}` por herramienta) y `DEFAULT_TOOLS_CONFIG`, que reproduce exactamente el reparto histórico; lo administrado vive en `platform_settings.tools_config` y se edita en **consola interna → Herramientas → Disponibilidad** (`ToolsAdmin.tsx`). Esa página ahora lista **TODAS** las herramientas, no solo las internas: el equipo necesita poder abrir lo mismo que ve un productor.

**Dos niveles**: `default` la ve cualquier cuenta de esa superficie; `plus` solo quien tiene el estatus. **La regla de "Plus" es una decisión por defecto, no una instrucción del owner** (la preguntamos y no llegó respuesta) y vive en UN solo sitio, `loadToolAccess` en `src/lib/tools/toolAccess.ts`: productor = tener Pasaporte del Kaffetal Club (`club_member_since`); comprador = `membership_tier` **por encima de `verde`** (la escala es verde→pinton→maduro y toda cuenta nace en verde, así que "tiene membresía" no distinguiría a nadie). `platform_settings` es service-role-only, así que la superficie **no lee la config**: pide su lista ya filtrada con la server action, vía el hook `useToolAccess`. Lo que queda fuera no se esconde en silencio — KR dice cuántas herramientas Plus faltan y cómo se ganan. Verificado en vivo en los dos sentidos (con y sin Pasaporte).

## Ficha (vista final): procedencia de cada puntaje sensorial (2026-07-20)

La exportación lista **todos** los puntajes SCA del lote con sus 10 atributos y un rótulo pegado a cada fila: `Declarado por el productor (B2) · sin contrastar` (la autodeclaración, que **nunca** es oficial sola), `Evaluación CTC · Contrastado por CTC`, `Solicitud de oficialización · pendiente de contrastar` / `NO validado por CTC` según el `status`. Los datos entran por `Lot.scaScorings` (`data.ts`), poblado desde `lot_evaluations` (la consulta de `KaffetalExperience` ahora trae `sca_data`, `q_grader_reference`, `created_at`). El objetivo es que un comprador no pueda confundir lo declarado con lo verificado.

## Altura de finca derivada de la geometría (2026-07-20)

«Altura (msnm)» se autocompleta: `src/lib/geo/elevation.ts` calcula el punto de referencia — **centroide del polígono** cuando existe (predios >4 ha, que EUDR obliga a dibujar) o el **punto registrado** cuando solo hay punto (≤4 ha) — y consulta `google.maps.ElevationService`, el mismo SDK y la misma clave que ya carga el mapa. ⚠️ **El owner lo enunció al revés** ("el punto para >4"); el polígono solo existe por encima de 4 ha, así que el mapeo implementado es el único coherente. Escribir el campo a mano lo congela (`altManual`) hasta pulsar «Volver a calcularla». Si la Elevation API no está habilitada en Google Cloud la llamada devuelve null y el campo queda editable — nunca bloquea guardar. Centroide y selección de punto probados en `scripts/qa-boards-check.mjs` (27 checks).

## Open Graph — la tarjeta con la que viaja cada enlace (2026-08-13)

Hasta esta fecha la red **no declaraba Open Graph en ninguna parte**: pegar cualquiera de los 18 subdominios en WhatsApp, LinkedIn o Slack producía una línea de texto gris con la URL. Con un negocio que se mueve por WhatsApp, esa era la primera impresión de la plataforma.

- **Una sola puerta**: `src/lib/seo/openGraph.ts` → `metadatosDeSuperficie({route, title, description, siteName, image, imageAlt, locale?, alternateLocale?})`. Devuelve el objeto `Metadata` completo (título, descripción, canonical, `openGraph`, `twitter`). Ninguna superficie declara `og:*` a mano — si se declara aquí, no puede quedarse a medias.
- **El mapa de la red se unificó**: `SUBDOMAIN_ROUTES` salió de `src/proxy.ts` a **`src/lib/red/subdominios.ts`**, que además deriva `ROUTE_SUBDOMAIN` y `origenDeSuperficie(route)`. El proxy lo importa. Motivo: Open Graph necesita el mapa AL REVÉS (ruta → subdominio) para firmar cada tarjeta con su origen absoluto, y tenerlo dos veces garantizaba que un subdominio nuevo se enrutara bien y se compartiera mal. **Una superficie nueva = una línea en ese archivo** y ya la conocen el enrutado y las tarjetas (el DNS sigue siendo a mano).
- **`metadataBase` es el subdominio, no www.** Cada superficie resuelve su `og:image` y su canonical en su propio origen. En dev todo cae a `localhost:3000` + ruta, con el mismo desdoblamiento `NODE_ENV` de `FAMILY_LINKS` (constante de compilación, no puede desincronizar la hidratación).
- **El canonical arregla un duplicado que ya existía**: toda superficie responde 200 por DOS URLs (su subdominio y su ruta bajo www). Sin canonical los buscadores repartían autoridad entre las dos; ahora manda la del subdominio.
- **Las tarjetas son JPEG 1200×630**, en `public/images/og/` (19 archivos, ~50 KB cada uno, 1,0 MB en total). **JPEG y no WebP a propósito**: WhatsApp no previsualiza WebP de forma fiable. Se generan con **`scripts/build-og-cards.mjs`** (`node scripts/build-og-cards.mjs`) a partir de `reference_logos/`, que vive FUERA del repo — por eso el script se corre a mano y el resultado se comitea; en Vercel no hay logotipos que leer. Diseño: degradado del color de la superficie + placa con el logotipo. Tres detalles que costaron una iteración cada uno y están comentados en el script: la placa **se mide por el logotipo** (fija, los logotipos cuadrados flotaban perdidos), el filo de color va **metido el radio** por cada lado (a ras asomaba por las esquinas redondeadas) y **el blanco de la placa lo dicta el logotipo** (los PNG de marca no vienen sobre blanco puro — el de Kaffetal Regal es 254,254,254 — y contra `#FFFFFF` se veía un recuadro fantasma).
- **Cubiertas**: CTC Home, Kaffetal Regal, Cherry Picked (portada + Green + Roast + X), Co-Create, Directorio, CTC Tech, Varietales, Coffeed, Herramientas, Control Panel, Terratalento y los **5 nodos socios** (vía `generateMetadata` sobre `PARTNERS`, que ya era su fuente única). Las consolas internas no llevan tarjeta a propósito.
- **Datos estructurados · JSON-LD (2026-08-14)** — `src/lib/seo/jsonLd.ts` + `src/components/JsonLd.tsx`. La red no declaraba **ningún** schema.org. **Regla: en `jsonLd.ts` no se escribe ningún dato** — todo sale de la fuente única que ya lo posee (`lib/legal.ts`, `lib/grados/definicion.ts`, `lib/kaffetal/faq.ts`). Emiten: CTC Home `Organization`+`WebSite`, Kaffetal Regal `Organization`+`FAQPage`(12)+`DefinedTermSet`(5 grados), Cherry Picked `Organization`+`DefinedTermSet`; un solo `@graph` por página para que las referencias `@id` resuelvan dentro del documento, y la `Organization` se repite por subdominio a propósito (Google los trata como sitios aparte). Los grados son **`DefinedTermSet`, no `Product`** — son un vocabulario que la casa define, no cinco cosas con precio. `JsonLd.tsx` es **componente de servidor** (el rastreador debe verlo en la primera respuesta) y escapa `<` por construcción, porque dentro de un `<script>` el navegador busca el cierre en texto crudo. Habilitó un refactor: las 12 preguntas salieron de `FaqSection.tsx` a **`src/lib/kaffetal/faq.ts`** (módulo puro) — tienen dos lectores y duplicarlas separaría la respuesta publicada de la visible. **Cobertura completa desde el mismo día: las 19 superficies públicas emiten `Organization`** — las 16 restantes vía el componente de conveniencia `<OrganizationLd />` (una línea por página; el dinámico `socios/[partner]` cubre los 5 nodos de golpe). En los socios se declara a **CTC**, no al socio: los cinco nodos son puertas de esta casa, y la ficha del socio como organización propia no la podemos afirmar nosotros. Verificado superficie por superficie contra el HTML del servidor: 19/19 con JSON válido y `taxID` correcto. Plan completo y decisiones abiertas (canonical, Search Console) en el artifact «Visibilidad de la red CTC».
- **robots.txt y sitemap.xml son ROUTE HANDLERS por host (2026-08-14)** — `robots.ts` ya no existe. Los sitemaps son por host y hay 18 subdominios en un deploy: el `sitemap.ts`/`robots.ts` de Next se generan en build, sin Host que leer, así que se convirtieron en handlers (`src/app/{robots.txt,sitemap.xml}/route.ts`) que leen la cabecera Host. Llegan a todos los hosts porque el proxy EXCLUYE ambos archivos de su matcher — si ese matcher cambia, se rompen juntos. Cada host anuncia su portada y su propio `Sitemap:`; www anuncia solo la casa matriz (anunciar ahí lo que el canonical manda al subdominio sería pedirle al buscador dos cosas contrarias). Las reglas ganaron `/ecp` y `/ocp` (fuera de la lista desde el login maestro del 2026-07-15; es orden, no seguridad — protege `requireConsoleAccess()`).

## Los sellos de los Grados de Calidad (2026-08-13)

`GRADOS` (`src/lib/grados/definicion.ts`) ganó un campo **`logo`** con el sello de cada grado: `public/images/shared/grados/{black,red,blue,gold,tyrian}.webp`. Salen del material de marca del owner (`reference_logos/Grados CTC/`) y se normalizaron a **420×420 sobre blanco** porque los cinco PNG venían con recortes distintos (228×227, 237×219…) y sin alfa — sin cuadrarlos, el sello saltaba de sitio al pasar de un grado a otro en la ventana. Van en la definición y no en cada superficie por la misma razón que los rangos SCA: es LA cara del grado, y la cara y el rango tienen que salir del mismo sitio o acaban contradiciéndose. Primer consumidor: los popups de «La oportunidad, en números» (`OportunidadSection.tsx`), vía los campos `image`/`imageContain` que `InfoPanel` ya tenía. **«Corriente» no lleva sello a propósito** — no es un grado, es el punto de partida.

## El loop de iconos de la casa (V3, 2026-08-14)

`public/images/shared/ctc-loading-icons.webp` sale ahora de `reference_gifs/CTC_Loading_Icons_V3.gif` (800×800, ~510 fotogramas, 45,9 s, **alfa real en todos los fotogramas**). El V1 y el V2 se borraron.

**El arte cambió de naturaleza en el V2/V3.** El V1 eran 63 estampas FIJAS de tinta maciza a 810 ms. El V2/V3 son ~35 iconos que se FUNDEN unos en otros. El V2 además llegó mal exportado —alfa solo en el primer icono, el resto opaco, o sea un cuadro blanco sobre la foto del hero— y se rehízo: el V3 es ese mismo arte con la transparencia puesta.

- **Peso: ~2,6 MB** (el V1 pesaba 310 KB). No es grasa de codificación: son ~370 fotogramas casi todos distintos, y con alfa el codificador no puede reaprovechar el anterior. **La calidad casi no mueve la aguja** (q45 y q55 pesan lo mismo); las palancas reales son la **tasa de fotogramas** y el **tamaño**. Por eso va a **240 px y 8 fps** — a 300 px y 12,5 fps son 5,1 MB, y 240 px sigue por encima de los 210 px a los que como mucho se dibuja. Los dos pies que lo montan (Kaffetal Regal, Cherry Picked) usan **`loading="lazy"`**: están bajo el pliegue, así que solo el hero de CTC Home lo paga en la primera pintura.
- ⚠️ **EL COMANDO DE CONVERSIÓN IMPORTA MÁS QUE LA CALIDAD.** Con `-c:v libwebp` + `-q:v`, y también re-codificando con **sharp**, el WebP animado sale con **fantasmas**: cada icono arrastra restos del anterior detrás. El codificador MEZCLA cada fotograma sobre el lienzo anterior en vez de reemplazarlo, y como este arte es transparente alrededor del dibujo, lo de antes se sigue viendo. Con el V2 no se notaba porque sus fotogramas opacos tapaban el rastro — es decir, **el bug ya estaba ahí y la opacidad lo escondía**. La receta correcta (verificada fotograma a fotograma contra el GIF a los mismos instantes) está en `components/ctc-home/Hero.module.css`; la clave es **`-c:v libwebp_anim -pix_fmt bgra`** y usar **`-quality`**, no `-q:v`.
- Se probó también recortar el blanco del V2 por clave de color: **no sirve** para este arte. Sin su papel, los costales, la taza y la tostadora quedan en contorno fantasma ilegible sobre el azul, porque el sombreado a lápiz *es* gris claro. Queda anotado por si alguien lo intenta con un arte parecido.

## «Co-Create» pasó a llamarse **CaaS · Coffee as a Service** (2026-08-14)

El owner cambió el TÉRMINO, no lo que representa: sigue siendo la superficie Clase B donde una marca con demanda propia (tostaduría, cadena, marca privada, e-commerce) propone un proyecto y CTC pone la proveeduría. Subdominio `caas.ctcexport.com` ya creado en Hostinger y Vercel. De paso se cerró un renombrado a medias que la casa arrastraba: la portada decía «Cherry Picked Co-Create» y la landing «CTC Co-Create»; ahora las dos dicen CaaS.

- **La ruta nueva es `/caas`; la vieja `/co-create` sigue viva y reenvía con 308** (`src/app/co-create/page.tsx`). Los dos subdominios están en `src/lib/red/subdominios.ts` y apuntan a rutas DISTINTAS a propósito: el mapa inverso `ROUTE_SUBDOMAIN` se deriva de ese objeto y, si las dos entradas apuntaran a `/caas`, la última ganaría y las tarjetas OG se firmarían con el dominio viejo. La consola interna también se movió: `/bcp/co-create` → `/bcp/caas`.
- ⚠️ **El pilar del lead sigue siendo `cocreate`, en minúscula, y NO se renombró.** Es la clave interna de `leads.pillar`, que vive bajo un CHECK de Postgres `('general','tech','cocreate','varietales')` y ya tiene filas reales. Renombrarla exigiría migración + reescritura de histórico para cambiar algo que ningún usuario ve. **La MARCA es CaaS; la CLAVE es cocreate** — está anotado en los tres archivos que lo tocan (`app/caas/page.tsx`, `lib/leads/actions.ts`, `lib/email/leadEmails.ts`).
- El redirect apunta a un destino **ABSOLUTO en producción**: en `co-create.ctcexport.com` el proxy antepone la base del subdominio, así que un `redirect("/caas")` relativo se resolvería a `/co-create/caas` → 404. En dev sí es relativo.
- El formulario ganó tres cosas en la misma tanda: **«Otros» en Mercado** (revela un campo de texto libre), el acordeón **«Necesidades particulares»** (Incoterm · Periodicidad · Certificaciones en selección múltiple) y la sección **«Modelos de oferta comunes»** en la landing, con los tres arquetipos que desactivan las tres objeciones típicas de un comprador de marca. Los campos nuevos son OPCIONALES y viajan en el mismo `fields` JSON del lead — están en la lista blanca de `FIELD_KEYS.cocreate`, que es lo único que decide qué se guarda.

## La portada de Cherry Picked: sello de CaaS, vídeo de fondo y bandas (2026-08-15)

- **CaaS ya tiene cara.** `public/images/shared/cherry-picked-caas-seal.webp` (600×635, 60 KB) sirve a los tres sitios que la piden: la tarjeta de la portada, la barra de su landing (`SurfaceShell logo=`) y el adorno de su hero. Una cara, un fichero.
- ⚠️ **Recortar un logotipo que viene sobre blanco**: la familia lleva alfa y el original no. Un umbral a secas agujerea los blancos de DENTRO del arte (los brillos de la mano, el dorado del texto). Se hace con **relleno por inundación desde el borde** —solo es fondo el blanco alcanzable desde fuera— y alfa **gradual** en esa zona, para que un halo se desvanezca en vez de cortarse a cuchillo. Compruébalo componiendo sobre un color saturado: el blanco de fondo no delata flecos, el magenta sí.
- ⚠️ **WebP animado NO es para metraje fotográfico.** `Visit ctcexport.com.gif` pesaba 149 MB; en WebP animado no bajaba de **2,6 MB** ni a 480 px y 8 fps, porque el codificador de imágenes no tiene con qué comprimir fotografía en movimiento. En **H.264 son 826 KB** a 800×600 y 20 fps, más nítido y con más fotogramas. La receta `libwebp_anim` documentada arriba es para el **loop de iconos** (dibujo, alfa, fondos planos); confundir los dos casos cuesta 3× de peso. El comando exacto está en `HubLanding.tsx`.
- **El vídeo no lleva `autoPlay` en el JSX**: se arranca desde un `useEffect`. Así el HTML del servidor y el del cliente coinciden (nada que hidratar mal) y quien pidió `prefers-reduced-motion` simplemente no recibe la llamada a `play()` y se queda con el póster. Con `autoPlay` en el marcado no hay forma de preguntárselo a tiempo. El corte en el segundo 35,1 también es deliberado: ahí entra la tarjeta blanca final del GIF, que detrás de un titular sería un fogonazo.
- **Los cuatro programas siguen el patrón de «Tres ofertas» de CTC Home**: estado + sello pulsable + botón punteado, y todo lo demás dentro de la ficha que abre. Reusa `InfoPanel` (la ventana compartida) y **la copy no se duplicó** — sale del mismo diccionario. Roast y X abren ficha pero sin botón de salida: una puerta que no abre no ofrece un enlace que no lleva a ninguna parte.
- **Las dos bandas ilustradas presentan al bloque que viene detrás**, que es lo que las separa de un adorno. Si se añaden más, esa es la regla.
- Detalle de peso: un `<Image>` declarado a 600 px que el CSS dibuja a 190 **necesita `sizes`**, o Next sirve la variante de 1200.

## OCP · Transcripciones — el archivo de las conversaciones (2026-08-17)

> **Traspaso**: `docs/SESION_2026-08-17_TRANSCRIPCIONES.md` resume la sesión entera (V4.8→V4.15), qué necesita el Version Wrap V36 y la deuda consciente. Las **11** entradas de ese día en `docs/architecture/Log_Documentacion_Interactiva_V35.txt` están selladas con su sha (la de infraestructura —Supabase y Vercel a Pro, $45/mes— lleva `n/a` porque no tocó código).

Cuarto módulo del grupo **OCP · Cotizadores** (`/ocp/transcripciones`, nav en `consoles.ts`). Cotizar es operación y las conversaciones con productores, clientes y aliados también: por eso viven juntos.

- **La plataforma NO transcribe.** El modelo (faster-whisper large-v3 + pyannote, vía WhisperX) necesita GPU y ~9 GB de dependencias: corre en el equipo del owner como herramienta local — **`ctc-platform/tools/transcriptor/`** desde V4.15 (README ahí; la carpeta anterior `reference_html_tools/_whatsapp-transcript-html` ya no existe). Vercel no podría ni debería. El módulo del OCP **guarda el resultado** y le añade lo que la máquina no sabe: **asunto, fecha de la conversación, notas** y **el nombre de cada voz** (clic en el chip → `renameSpeaker`, persiste en `speaker_names`).
- **Tres entradas** (una sola zona de archivo en «Nueva transcripción»):
  1. **El AUDIO** (`.ogg/.opus` de WhatsApp, `.m4a/.mp3/.wav/…`, ≤ 100 MB) — la vía normal (2026-08-17, migración `ocp_transcripts_audio_jobs`). El navegador sube **directo a Storage** con URL firmada (`prepareAudioUpload` la acuña con el service role bajo `kaffetal-media/transcripts/<uuid>/<nombre>` — prefijo que ningún JWT de usuario alcanza; el PUT es el `putSignedUrlWithProgress` de la casa) y luego `createAudioTranscript` crea la fila **`status='pending'`** sin segmentos (comprueba que el objeto exista antes). El **worker local** del equipo con GPU (`python -m ogg_transcriber.worker` / `.\worker.ps1`, en la carpeta de la herramienta) reclama con la RPC **`claim_transcript_job(p_worker)`** (`FOR UPDATE SKIP LOCKED`; un `processing` de más de 2 h se considera huérfano y se vuelve a entregar; ejecución revocada a anon/authenticated), baja el audio, transcribe y escribe segmentos/hablantes/idioma/duración/`meta` en la misma fila (`ready`, o `error` con el mensaje de la herramienta — el mismo que imprime la CLI). El detalle **hace polling cada 10 s** mientras esté `pending`/`processing`; en `error` hay **Reintentar** (`retryTranscript` → `pending`). `job_options` lleva las pistas del formulario (idioma, nº de voces). Credenciales del worker: `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` en el `.env` de la herramienta o, sin configurar nada, las lee de `ctc-platform/.env.local`; la clave no sale del equipo. **Si el PC está apagado, las subidas esperan como Pendiente** — es el diseño, no un fallo. `deleteTranscript` borra también el objeto; `getAudioUrl` firma 1 h para escuchar/descargar desde el detalle.
  1-bis. **O en la NUBE** (2026-08-17, migración `ocp_transcripts_cloud_provider`): en un trabajo `pending` (o en uno con `error`) el detalle ofrece **«Transcribir en la nube»** → `sendTranscriptToCloud` → `src/lib/transcripciones/cloud.ts` firma el audio (6 h) y lo manda a **AssemblyAI** con `speaker_labels: true` + `language_code` + `speakers_expected`; la fila pasa a `processing` con `provider='assemblyai'` y `provider_job_id`. AssemblyAI avisa a **`POST /api/transcripciones/callback`** (cabecera secreta `x-ctc-transcripts-secret` comparada con `timingSafeEqual`; sin `ASSEMBLYAI_WEBHOOK_SECRET` el endpoint responde 503 y no procesa) → `ingestAssemblyResult` trae el resultado con nuestra clave y lo escribe. **Red de seguridad**: el sondeo de 10 s del detalle llama a `refreshCloudStatus`, que pregunta al proveedor — cubre un webhook perdido y el desarrollo en local, donde AssemblyAI no puede alcanzar `localhost`. Sus `utterances` (ms, hablantes "A"/"B") se traducen a los mismos segmentos que la vía local con `mapAssemblyUtterances` (puro, en `model.ts`). El botón solo aparece si `ASSEMBLYAI_API_KEY` está en el entorno (`isCloudConfigured`). Nada espera dentro de una función: ni el envío ni el webhook llegan al segundo (se diseñó bajo el tope de 300 s de Vercel Hobby; el proyecto es **Pro desde el 2026-08-17** —cron por minuto, tope de función mayor— pero el diseño sin esperas se conserva a propósito). Coste ~US$0,17/hora de audio. **Puesta en marcha y advertencias: `docs/TRANSCRIPCIONES_NUBE.md`.** ⚠️ **La URL del webhook se canonicaliza a `www`** (`webhookBaseUrl`): el apex `https://ctcexport.com/...` responde **308** hacia www y un emisor de webhooks no tiene por qué seguir un redirect en un POST — el aviso se perdería en silencio (lo salvaría el sondeo, pero la vía rápida quedaría rota sin que nadie lo note). Verificado de punta a punta contra AssemblyAI el 2026-08-17: `scripts/qa-transcripciones-nube.mjs` (19 comprobaciones, ~US$0,002 por corrida) siembra una fila, la manda de verdad, espera el webhook y limpia. ⚠️ `claim_transcript_job` filtra `provider = 'local'`: el worker del equipo NO debe reclamar algo que ya está en la nube.
  2. El `.transcript.json` de la herramienta (se valida en el navegador con `parseToolJson` — solo exige `segments` con texto; idioma, duración, hablantes y `meta` se toman si vienen y se derivan si no; se descarta `meta.path`, la ruta local del owner). Nace `ready`.
  3. **Texto pegado** (`parsePlainText`: párrafos → segmentos sin tiempos; «Nombre: …» al inicio se toma como hablante). Sin audio o JSON no hay diarización real, y se dice.
- **El modelo es de TIRÓN, no de empuje** (y la interfaz lo dice, 2026-08-17). La plataforma **nunca llama a ninguna máquina**: es el worker el que pregunta (`claim_transcript_job`) cada `--poll` segundos y el que deja su latido. Consecuencias que conviene tener claras: (a) funciona detrás de un router doméstico, **sin IP fija ni puertos abiertos** — al equipo le basta con salida a internet; (b) **no está atado a una máquina concreta**: vale cualquiera donde se arranque el worker con las credenciales, y si hay varias se reparten los trabajos sin pisarse (`FOR UPDATE SKIP LOCKED`); (c) la única forma que tiene el OCP de saber que existe un equipo es el latido. Tabla **`transcript_workers`** (migración `ocp_transcript_workers_heartbeat`, service-role-only): `worker` (hostname) PK, `status` idle/busy, `current_job`, `device`, `gpu`, `tool_version`, `poll_seconds`, `last_seen_at`. El worker late **en un hilo aparte** para seguir latiendo *durante* una transcripción larga (si no, un archivo de 22 min lo haría parecer muerto 4 minutos), y al salir limpio se despide. `listTranscriptWorkers()` marca `online` si el último latido cabe en 3 latidos (`max(15, poll)*3`); `WorkersBadge` lo pinta en la lista y en el detalle. ⚠️ Describir la máquina importa torch (~20 s): va **dentro** del hilo, nunca antes del primer `claim`. ⚠️ **Y NUNCA con `torch.cuda.*`**: `is_available()`/`get_device_name()` inicializan un contexto CUDA (~0,5 GB) y, desde el hilo del latido, lo hacían *a la vez* que el hilo principal cargaba el modelo. Se pregunta a `nvidia-smi`, que es un proceso aparte y no reserva nada. ⚠️⚠️ **La causa REAL de los `out of memory` intermitentes era el lote fijo de 16** (2026-08-17): en una tarjeta de 8 GB el mismo audio entraba unas veces y otras no, y **no dependía de la duración** — uno de 22 min pasó y uno de 10 min falló — sino de la VRAM libre en ese momento y de cuán llenos salieran los trozos del detector de voz. Ahora `default_batch_size` **mide la VRAM libre con nvidia-smi** antes de decidir (≥14 GB→16, ≥6,5→8, ≥4→4, si no 2) y `_asr_with_fallback` baja por una **escalera** `cuda/N → cuda/N//4 → cuda/1 → cpu` en vez de saltar a la CPU al primer tropiezo: 132 s en GPU contra 1019 s en CPU para el mismo audio. Y al fallar hay que **soltar las referencias internas del modelo**: `torch.cuda.empty_cache()` no libera lo de ctranslate2 y un intento fallido dejaba ~4 GB retenidos, medido con nvidia-smi.
- **La herramienta VIVE EN EL REPO** (2026-08-17): `ctc-platform/tools/transcriptor/`. Antes estaba solo en la carpeta personal del owner, sin historial ni forma de volver atrás. Su `.env` (token de Hugging Face + clave del equipo) sigue ignorado por git.
- **Instalar en OTRO equipo**: el desplegable «¿Cómo enciendo un equipo?» trae **Descargar el transcriptor** → `GET /api/transcripciones/descargar` **arma el ZIP en el momento** leyendo `tools/transcriptor/` del despliegue (jszip; `next.config.ts` traza la carpeta con `outputFileTracingIncludes`, igual que `docs/architecture`). Se hizo así a propósito: antes lo subía a mano un script a Storage y **un paso manual se olvida**, con lo que se acaba instalando una versión vieja sin enterarse; generándolo desde el repo no hay dos copias que puedan divergir. Excluye `.env`, venv y cachés explícitamente. Detrás del gate del OCP. Flujo en el equipo nuevo: descargar → `setup.ps1` → `Configurar credenciales.bat` (valida contra la API antes de guardar) → `Iniciar transcriptor.bat`. ⚠️ **La credencial que se escribe ahí es la `service_role`: abre la base entera**; el aviso en pantalla dice que solo se instale en equipos propios. La vía limpia sería una credencial estrecha (RPC dedicada), aún sin construir.
- ⚠️ **Rutas relativas escritas a mano = frágiles**: al mudar la herramienta, el worker dejó de encontrar `.env.local` y solo dijo «este equipo no sabe a qué plataforma conectarse». Ahora `platform_env_candidates()` **busca hacia arriba** por los ancestros en vez de fijar la ruta.
- **Archivos**: `src/lib/transcripciones/{types,model,actions}.ts` (`model.ts` es puro: `collapseBlocks` es el `collapse_blocks` de la herramienta portado, `speakerLabel` traduce `SPEAKER_00` → «Hablante 1» o el nombre puesto), `src/components/transcripciones/{TranscriptsBoard,TranscriptDetail}.tsx` + `.module.css`, pages en `src/app/ocp/(app)/transcripciones/`. Actions detrás de `requireConsoleWrite("ocp")` sobre el service role, como Anclas.
- **QA sin navegador** (el OCP está detrás del master login con OTP): `node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/qa-transcripciones-check.mjs [ruta.transcript.json]` — **50** comprobaciones del modelo puro (verificado 2026-08-17; eran 38 en V4.8), 58 si se le pasa el JSON real de una llamada de 22 min: 208 segmentos, 32 bloques, 3 voces. El round-trip a la tabla (insert 50 KB → anon ve 0 filas → lectura íntegra → rename → delete) se comprobó por PostgREST con el service role el día del alta. ⚠️ Los **secret keys nuevos de Supabase rechazan peticiones con User-Agent de navegador** («Forbidden use of secret API key in browser») — PowerShell `Invoke-RestMethod` sin `-UserAgent` cae ahí; con uno de servidor pasa.
- Tamaño: una llamada de 22 min son ~80 KB de JSON; el `bodySizeLimit` de 8 MB de las Server Actions da para horas.

## «Active Catalogue Sneak Peek» — la cinta del catálogo, y el catálogo detrás del login (2026-08-17, V4.16–V4.21)

Módulo **reutilizable** (`src/components/catalogo/SneakPeek.tsx` + `SneakPeek.module.css`) montado en **seis** superficies: CTC Home (justo tras el hero), la landing de Kaffetal Regal, la portada de Cherry Picked, la tienda **Green**, **Roast** y **X**. Paso 0 de `docs/V5_CONSOLAS_PLAN.md` §1 — el resto de ese plan sigue sin construir.

- **CAMBIO DE CARA PÚBLICA, y es el punto**: en la tienda Green la cinta **sustituye a la parrilla** para quien no ha entrado (decisión del owner, D0.5, extendida a toda la familia CP). `loadCatalog()` ya **no corre sin sesión**, así que los lotes y sus precios dejan de ser públicos; `GradosSection`/`BlackSection` solo se pintan con sesión, la cinta hereda el ancla `grados`, al cerrar sesión se vacían los lotes (`setLots([])`) y el índice rápido no ofrece «Black Selection» a quien no ha entrado (esa sección no existe sin sesión). Lo asumido: la parrilla deja de ser rastreable; la portada, las fichas de grado y la cinta siguen siéndolo.
- **Nada comercial puede salir por la cinta, por construcción**: el tipo `SneakPeekLot` (en `src/lib/catalogo/sneakPeek.ts`) **no tiene dónde** poner precio, MOQ, kilos, anticipo, fecha de llegada ni transparencia. Si mañana hace falta un campo, se añade a propósito y el guardián obliga a justificarlo. Lee **solo** la vista estrecha `public_lot_catalog` cruzada con los `lot_listings` en `published` (la vista incluye `sold_out`, y un teaser no debe anunciar lo agotado), con el cliente **anónimo y sin cookies**. Tyrian queda fuera: es solo de subasta.
- **El grado de un lote VIVO se pinta como lo tiene guardado la plataforma**, igual que la tienda — si la cinta lo derivara del puntaje y la tienda no, las dos dirían cosas distintas del mismo lote. Los **mock** sí lo derivan, y por un motivo concreto: su origen es Notion, donde el grado no es de fiar (ver abajo).
- **`api/catalogo/sneak-peek`**: mismo montaje que la cinta de mercado de Home (`force-dynamic` + `s-maxage=900`). Las seis páginas siguen siendo **estáticas** y un lote publicado aparece **sin desplegar**. Si la petición falla o no hay lotes, la cinta **no se dibuja** — una portada no se cae por un vistazo.
- **Los 7 lotes mock** (`src/lib/catalogo/sneakPeekMock.ts`) salen de referencias REALES de la base de Notion del owner «📋 Fichas Técnicas de Café» (11 fichas, 7 con datos; origen desde su base «Fincas»). Escalera 2 Gold · 2 Blue · 2 Red · 1 Black. Son cafés reales de fincas reales: lo único «mock» es que aparezcan en un catálogo activo que aún no existe, y cada tarjeta lo dice («Temporada anterior · 2025-26»).
  - ⚠️ **La relación `Grado CTC` de Notion contradice su propia columna `SCA` en 6 de las 7 fichas** (84.25 → «Tiryan», 87.0 → «Black», 86.25 → «Gold»…). Manda `lib/grados/definicion.ts` (regla 1: el puntaje manda) y **Notion debe mirar a este repo**, no al revés. Tabla completa en `docs/V5_CONSOLAS_PLAN.md` §9, pendiente del owner.
  - La ficha de 88.5 → **Tyrian** se excluye a mano: `publishLot` la rechazaría en el catálogo.
  - Dos huecos que rellené yo y dos discrepancias de la fuente van marcados **en el archivo** (`// GAP:` y `// ⚠`), no arreglados en silencio.
- **Se retiran de un tirón** (lo pidió el owner) y **también solos**: un archivo con la receta de retirada en su cabecera, `mock: true` en cada entrada, ids en el espacio reservado `mock-lote-NN`, el rótulo de temporada **en el dato** (no en el componente, para que un mock no pueda pintarse sin rótulo) y `qa-sneak-peek-check.mjs` fallando si algo de eso se rompe. El relleno solo llega a **siete** tarjetas: cada lote real publicado desplaza a un mock, y con siete vivos los mock dejan de aparecer sin tocar código.
- **LA TARJETA SE VOLTEA** (V4.17). Delante: foto, nombre, grado y variedad. Detrás, al pulsarla: puntaje SCA, finca · municipio, departamento, proceso · altitud, notas de cata y el botón **«Ver ficha técnica»**, que abre el PDF del lote en otra pestaña. La cinta **se para** mientras una tarjeta está abierta (si no, el detalle recién abierto se va de la pantalla), Escape cierra, el enlace de la ficha no vuelve a voltear la tarjeta, y con `prefers-reduced-motion` el giro desaparece y las caras se cambian sin más. La copia del bucle sigue siendo pulsable con el ratón pero **no recibe foco** (`tabIndex={-1}`): hacerla inerte dejaría media cinta muerta, y dejarla enfocable metería contenido enfocable dentro de un `aria-hidden`.
- **Las fichas técnicas** las fabrica `scripts/build-fichas-mock.mjs` (un PDF A4 por lote mock, los mismos datos de la tarjeta + un aviso de «documento de referencia»; se vuelve a correr si el dato cambia) y viven en **`public/docs/fichas-mock/`**. ⚠️ Bajo `docs/` a propósito: es una de las tres carpetas que el matcher del proxy excluye (`images/`, `docs/`, `tools/`) — una carpeta nueva en la raíz daría 404 en los 18 subdominios. **Los lotes vivos aún no tienen ficha** (no hay columna en `lots`/`lot_listings`), así que su botón no se dibuja; el día que la haya, se enciende solo.
- **Flechas, rueda y ventana (V4.19)**: las flechas de los extremos **aceleran** la cinta hacia su lado con el ratón o el foco (150 s → 24 s; la izquierda invierte el sentido) y al pulsarlas empujan el scroll, que es lo que sirve con `prefers-reduced-motion`. El reverso cierra con el **extracto de la rueda de catación** del lote — la dibuja `scripts/build-ruedas-mock.mjs` **conduciendo `public/tools/rueda-catacion.html`**, no una rueda paralela (⚠️ sus funciones internas no son globales: se trabaja sobre el SVG ya dibujado, cada gajo un `.wedge` con `data-level|fam|sub|leaf`). Y «Ver el catálogo completo» abre una **ventana** que explica dónde está el catálogo y que registrarse es gratis, en vez de navegar a secas.
- **Las dos caras (V4.21, maquetas del owner)**: DELANTE identifica —foto con «Ver detalle» encima, nombre, variedad · altitud, notas de cata y un pie con el sello del grado a 72 px frente al puntaje SCA, la finca y el municipio—; DETRÁS explica —la telaraña del **Análisis Intrínseco** (diez atributos SCA), el botón de la ficha centrado y la rueda de catación al pie—.
- ⚠️ **NO importe un VALOR de `lib/catalogo/sneakPeek.ts` desde un componente de cliente**: ese módulo es `server-only` y arrastra `supabase/server` + `next/headers` al paquete del navegador — página entera en 500. Los tipos sí (se borran al compilar). Por eso los diez atributos viven en `src/lib/catalogo/atributosSca.ts`, sin `server-only`. **`tsc --noEmit` no lo ve**; lo caza el servidor de desarrollo.
- ⚠️ **La cinta la mueve un bucle de `requestAnimationFrame`, NO una animación CSS** (V4.20). Con `@keyframes` el navegador reinicia la animación al cambiar duración o sentido — era el salto que se veía al pasar el ratón por una flecha. La velocidad persigue a su objetivo (17 px/s en reposo, 155 con flecha, negativa hacia la izquierda) y **el sentido por defecto es hacia la DERECHA**. Al pulsar una tarjeta la cinta la CENTRA y solo entonces la voltea, creciendo un 15 %. Trampa: el envoltorio de la posición no debe aplicarse mientras se persigue un destino, o la tarjeta no llega y no se voltea. Y para medir nada de esto sirve el panel de vista previa: ahí ni corre rAF.
- **La ficha técnica son TRES páginas y van selladas** (resumen · Ficha de café verde · Rueda de catación; cinta roja «Muestra · no es oferta comercial» + marca de agua). Lo que no se sabe dice «— sin dato» y no se inventa.
- **La página 2 lleva el «Análisis Intrínseco»** (telaraña de los diez atributos SCA) y los datos analíticos de los mock están **INVENTADOS por encargo del owner** (2026-08-17) para que la muestra esté completa: viven en `scripts/lib/analisis-intrinseco.mjs`, suman exactamente el puntaje real del lote y el archivo lo dice en su cabecera. No inventado: puntaje total, variedad, proceso, finca y notas de cata.
- **Séptima superficie**: la landing de **CaaS** monta el módulo entre «Las dos clases de café» y «Dónde encaja».
- **Las fotos** (`public/images/catalogo/sneak-peek/`) son de CTC e ilustran proceso o paisaje: **no** son fotos de ese lote concreto, que no existen. Sin foto, la tarjeta cae al sello del grado.
- **El idioma llega como prop**, y de ahí que sea reutilizable: Home y KR usan `components/lang/i18n`, la familia Cherry Picked usa `components/cherry-picked/i18n`. Dos proveedores con la misma unión de idiomas, así que el módulo no se engancha a ninguno (`SneakPeekHome.tsx` es el puente en Home, igual que `HomeBand`).
- **`NarrativaSection` recibe `loggedIn`**: su vacío tenía una causa («aún no hay lotes publicados») y ahora tiene dos. Decirle eso a quien no ha entrado sería mentirle.
- **QA**: `node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/qa-sneak-peek-check.mjs` — **177** comprobaciones (nada comercial en el tipo, solo la vista pública, Tyrian fuera, no se cae ni se pinta vacía, movimiento reducido, los 7 mock marcados y coherentes con su puntaje, un solo sitio con datos mock, y `loadCatalog` después de la guarda de sesión).
- ⚠️ **Un volteo 3D NO se puede verificar en el panel de vista previa**: además de no pintar fotogramas, devuelve el valor INICIAL de una transición, así que `getComputedStyle(...).transform` dice «identidad» aunque la tarjeta esté volteada, y un `transform` en línea tampoco cambia la lectura. Se comprueba con Chrome headless conducido por CDP (receta en la memoria `reference_headless_chrome_verification`), que sí compone.
- **Lo que destapó Chrome headless y ninguna aserción habría visto**: el sello de grado de 420×420 reducido a 36 px era una mancha gris ilegible (ahora va el NOMBRE del grado sobre su color oficial), el puntaje salía sin escala (lleva etiqueta «SCA») y el rótulo largo de temporada partía el año por el guion. Ver `reference_headless_chrome_verification` en la memoria: el panel de vista previa no pinta fotogramas.

## Dev workflow

- `npm run dev` (Turbopack). Type-check with `npx tsc --noEmit`, lint with `npx eslint src --max-warnings=0` — both must be clean before considering a change done; this has held throughout the project.
- **QA verification pattern**: create disposable accounts via `scripts/create-qa-producer.mjs` / `create-qa-buyer.mjs` / `seed-bcp-admin.mjs`, seed realistic data via direct SQL (Supabase MCP `execute_sql`/`apply_migration`), drive the flow in the browser preview, clean up after — unless the user says to keep an account alive for continued UI iteration (they've done this at least once; check before deleting a QA account you didn't create this session).
- No test suite exists — verification is always live-browser + direct-SQL-check, not automated tests.

## Gotchas (learned the hard way this project — don't re-learn these)

1. **Only one Supabase project is real: `sjznkzvefqfcysczllli`** ("ctc-platform", `ACTIVE_HEALTHY`, what `.env.local` points at; the CTC org went **Pro on 2026-08-17** and this is its only project). History: a dead early-exploration project `dweizejazqeqpiguecxw` used to sit in the same org (paused >90 days, unrecoverable) — **the owner deleted it on 2026-08-17**; and the `commaas` project (`togwpmprggfvhwwxfzlh`) was moved out to its own org "CommaaS Hub" the same day. If any Supabase MCP tool call times out with "Connection terminated," check the `project_id` first — a wrong/dead ref looks exactly like a network blip.
2. **`src/proxy.ts` is this Next.js version's `middleware.ts`.** Not a typo, not custom infra — see `AGENTS.md`'s warning that this Next.js build has real breaking API changes from training-data Next.js.
3. **React `useEffect` + `react-hooks/set-state-in-effect`**: this lint rule flags ANY direct synchronous `setState()` at the top level of an effect body, even before an async chain. Fix pattern used throughout: seed the "loading"/initial state from props at `useState()` time so the effect never needs a synchronous reset call, and only ever chain `.then(handler)` off a promise in the effect body.
4. **`onAuthStateChange`'s `SIGNED_IN` event fires not just on a fresh login but also when it resolves an already-valid session from cookies** (tab refocus, background token refresh). A handler that unconditionally forces the UI back to a "logged in" landing view on `SIGNED_IN` will silently kick a user out of whatever sub-view they were in (this actually happened in Kaffetal Regal's Ficha view — fixed by only forcing the view when coming from the logged-out state, never unconditionally).
5. **Prompt caching (`cache_control`) has a minimum cacheable-prefix token count** (~1024–2048 tokens depending on model tier) — a short system prompt below that silently never caches (no error, just always misses). Don't assume `cache_control` alone solves a token-cost problem; check the actual prompt size first.
6. **Auto-mode classifier blocks, by design, in this environment**: direct `git push` to `main` (needs the user to push themselves, or a feature branch + PR), Supabase `restore_project` on a shared project, and applying DB migrations that go beyond what was explicitly asked (even safe, additive hardening). When blocked, explain what you intended and let the user decide — don't work around it.
7. **Ficha preview HTML is built via raw string templates + `dangerouslySetInnerHTML`** (`fichaPreviewHtml.ts` → `FichaPreview.tsx`) but is properly escaped via a dedicated `esc()` helper on every interpolated field — confirmed safe during the 2026-07-10 audit. If this rendering approach is ever reused elsewhere (e.g. surfacing Ficha text to BCP or buyers), re-verify escaping travels with it.
8. **Animated media must NOT go through `next/image`** (2026-07-14) — it rasterizes the animation to its first frame, silently. The two site loops (CTC Home's hero `hero-guacamayo-finca.webp`, Kaffetal Regal's `hero-zoom-cereza.webp`) use a plain `<img>` with an `eslint-disable-next-line @next/next/no-img-element` and a comment saying why. Both were **converted GIF → animated WebP with Pillow** (7.3 MB → 2.2 MB and 5.7 MB → 1.6 MB): a multi-MB GIF on an above-the-fold element is an LCP problem, `optimize=True` on the GIF itself makes it *bigger*, and there's no ffmpeg on this machine (so no MP4/WebM route). Also: **the source loops are only 400×225**, so any full-bleed use upscales ~5× — they're deliberately blurred slightly and given short/wide frames rather than tall ones (this is exactly why KR's loop is a slim `TopBanner` and not a hero backdrop). Check new generator output for watermarks before shipping — the cherry loop had a "Veo" mark that had to be cropped out.
9. **`request.nextUrl.hostname` is always `localhost` on the dev server** (found 2026-07-17) — it does NOT reflect the incoming `Host:` header, so Host-header curl tests against `src/proxy.ts` silently rewrote nothing while production (Vercel) kept working. The proxy now reads `request.headers.get("host")` (correct in both dev and prod). If a future subdomain "doesn't work locally", check which of the two the code is reading before debugging DNS.
10. **Text over these loops needs a measured scrim, not a guessed one.** Both heroes compute contrast against the *worst-case* composite (brightest/darkest frame under the scrim): CTC Home is light-on-dark — the scrim was **lightened 2026-07-14** ("too dark" feedback) and re-measured per element band against every frame of the loop (Pillow script compositing the actual CSS gradients): h1 5.5:1, lead 5.8:1, facts 5.2:1, hero gold 4.6:1 worst-case; the lead/facts hexes were brightened and the hero got a local gold (`#F7D287`, `--accent-soft` no longer clears 4.5:1 there) to buy that headroom. Kaffetal Regal stays light-themed with a near-opaque paper wash (h1 12.7:1, and the `--muted` lead needed the wash pushed to .965 to clear AA at 5.1:1). If you retint either scrim, re-measure the small mono text and the gold — they're the ones that fail first.


10b. **Un flush-al-desmontar NO puede leer refs del DOM** (2026-07-29, pérdida de datos real y en producción). `useAutosave` gana un guardado de salida en el cleanup del efecto para que una selección rápida seguida de cerrar el formulario no se pierda (commit `c484c63`). Pero `FincaModal.save()` armaba el payload leyendo `veredaRef.current?.value` para vereda/municipio/departamento/historia/características: **React suelta las refs ANTES de correr la limpieza de los efectos**, así que el guardado de salida las leía `null`, caía al `|| "—"` y escribía null encima de datos buenos. Reproducido en vivo con cuenta QA: abrir la finca, cambiar solo «Tipo de documento», cerrar ⇒ cuatro columnas borradas en Postgres. La corrección fue pasar TODO el formulario a estado controlado (y con eso desapareció el contador `rev`/`bumpRev` que existía solo para que el autosave notara los onInput de los campos con ref). **Regla**: si un formulario tiene autosave con flush de desmontaje, su snapshot y su `save()` deben depender solo de estado de React — cualquier ref del DOM en ese camino es un borrado esperando su turno. Lo mismo aplica a `FichaView` y a cualquier formulario nuevo que adopte `useAutosave`.

11b. **Una política RLS cuya expresión consulta SU MISMA tabla recursa** (2026-07-20). `producer_comm_log_insert_own` validaba `parent_id IN (select id from producer_comm_log ...)` y Postgres abortaba con *infinite recursion detected in policy* — rompía TODAS las inserciones del productor (el WITH CHECK expande todas las ramas del OR, no corta en la primera). El arreglo es envolver la subconsulta autorreferente en una función `SECURITY DEFINER` (`producer_owns_comm`) que lee la tabla con RLS ya resuelta. Migración `fix_producer_comm_log_insert_recursion`.

12. **[RESOLVED 2026-07-24 — the split no longer exists.]** The internal-vs-public tool split bit twice (the owner flipping `kr:true` on an ECP-served tool 404'd in KR both times), so the private-serving mechanism was **retired**: ALL tools now live in `public/tools/*.html`, the `/ecp/herramientas/[tool]` route + `privateTools.ts` + the embedded modules + `embed-private-tools.mjs` are gone, and the **Disponibilidad table is the only availability control**. To add/update a tool now: drop the `.html` in `public/tools/` → `node scripts/vendor-tool-assets.mjs` → register in the catalog + copy maps. The original gotcha is kept below for the history/why:
    Embedded tools: "internal" (ECP-gated) vs "public" (producer/buyer-facing) is an ARCHITECTURE choice, not a `tools_config` toggle (learned the hard way 2026-07-23, after building 3 producer tools as internal and chasing the wrong bug for hours). A tool's `src` in `src/lib/tools/catalog.ts` decides where it can physically work:
    - **Public** tools live in `public/tools/*.html` with `src: "/tools/x.html"`. `/tools` is **excluded from `proxy.ts`'s matcher**, so they serve on every subdomain (root, kaffetal-regal, cherry-picked) with no auth. This is the **only** way a tool works in Kaffetal Regal / Cherry Picked. The `kr`/`cp` flags in `tools_config` only decide whether it's *listed* on a surface — not whether it can load.
    - **Internal** tools live in `private-tools/` with `src: "/ecp/herramientas/<key>"`, an ECP-session-gated route. They work **only** inside the internal console. Flipping `kr:true` on an internal tool makes it *appear* in KR but it **cannot load** there: the iframe URL `/ecp/herramientas/<key>` on the `kaffetal-regal` subdomain gets rewritten by `proxy.ts` to `/kaffetal-regal/ecp/...` (404), and producers have no ECP access anyway. Symptom is exactly "works in ECP, 404s in KR." Rule: **producer/buyer tool ⇒ public; team-only tool ⇒ internal.** (`qr` is the only internal one.)
    - **Don't read internal-tool HTML from disk at runtime.** That relied on `next.config.ts` `outputFileTracingIncludes` bundling `private-tools/**` into the function, which is **fragile with Vercel's restored build cache**: a newly-added `.html` silently isn't re-traced into the serverless function, so `readFile` finds nothing and the handler 404s (no `ENOENT` surfaces; only the already-traced older file keeps working). The internal HTML is now **embedded into the bundle** as a string via `scripts/embed-private-tools.mjs` → `src/lib/tools/embedded/` (no `fs`, no tracing, no cache dependency). **Update flow for an internal tool**: drop the `.html` in `private-tools/` → `node scripts/vendor-tool-assets.mjs` (fonts/CDN → offline) → `node scripts/embed-private-tools.mjs` (regenerate the embedded modules). Adding ANY tool also needs entries in every `Record<ToolId, …>` map: `TOOLS`, `ALL_TOOL_IDS`, `DEFAULT_TOOLS_CONFIG` (catalog), `TOOL_ICON` (ToolIcons), `KR_TOOL_COPY` (AppDashboard), the Cherry Picked `TOOL_COPY` (GadgetsSection), and the ECP page `TOOL_COPY`.

13. **La sesión de las consolas internas vive en su PROPIA cookie (`ctc-panel-auth`) — no en la compartida** (2026-07-29, el loop de login del BCP en producción). La cookie compartida `sb-…-auth-token` (Domain=.ctcexport.com, 2026-07-24) es UN solo slot que se pelean todas las pestañas de todos los subdominios: una pestaña de Kaffetal Regal abierta cuyo cliente supabase-js quedó con un refresh token ya rotado (la rotación la dispara cualquier otro cliente, incluido el proxy en SSR) reintenta cada ~90 s, recibe `refresh_token_not_found` y **borra la cookie compartida** — matando la sesión del BCP que el OTP acababa de acuñar (visto en vivo en los logs de Auth: reintentos desde la IP del owner con referer kaffetal-regal, y dos OTP consumidos que "no entraban"). Por eso el master login (verify), `requireConsoleAccess`, `requireActiveAdmin`, `/cambiar-contrasena` y los `requireOwner` de ECP/OCP usan `createPanelSessionClient()` (`PANEL_AUTH_COOKIE` en `lib/supabase/server.ts`), y el proxy renueva LAS DOS cookies. Efectos colaterales deseados: entrar/salir del BCP ya no toca la sesión de KR/CP/socios del mismo navegador, y ambas conviven. **No "simplificar" esto de vuelta a la cookie única** — el race de refresh-token entre pestañas de subdominios distintos no tiene coordinación posible (navigator.locks no cruza orígenes). Bonus del mismo bug-hunt: en `ResponseCookies` de Next un segundo `.set()` del mismo nombre TRAGA un borrado previo (es un mapa por nombre) — la expiración de la cookie host-only vieja en el proxy ahora va como header `set-cookie` crudo.

14. **La compuerta no mira los BYTES de lo que sirve producción — y una codificación rota no rompe nada** (2026-08-18, V4.22). El commit `10c9016` (2026-08-15) guardó **catorce** `src/app/**/page.tsx` con su UTF-8 leído como cp1252 y vuelto a escribir como UTF-8. Estuvo **tres días en producción** sin que nadie lo notara, porque `tsc`, `eslint` y `next build` pasan los tres: para el compilador una cadena con la mojibake dentro es tan válida como la buena. Lo que se sirvió roto fue el **`<title>`, la meta description y el `siteName` de las catorce superficies públicas a la vez** — pestaña del navegador, resultado de Google y tarjeta de Open Graph de cada enlace compartido. En bytes: la `á` viajó de `c3 a1` a `c3 83 c2 a1`, y el `·` de `c2 b7` a `c3 82 c2 b7`.
    - **Se arregla tramo a tramo, no archivo a archivo.** Tres de los catorce estaban PARCIALMENTE corruptos (commits posteriores les añadieron texto sano); un pase global de `cp1252 → UTF-8` sobre el archivo entero los habría roto. Verificación usada: 89 de las 96 líneas no-ASCII vuelven a ser idénticas byte a byte a su versión en `10c9016^`.
    - **Guardián: `node scripts/qa-encoding-check.mjs`** (sin `ts-resolve`). No busca caracteres «raros» —eso daría falsos positivos en todo el español del repo— sino tramos que **se dejan deshacer** y cuyo resultado cae en el repertorio que este repo escribe. Ojo al falso positivo que obligó a añadir ese repertorio: `AQUÍ»` da bytes UTF-8 válidos (una letra griega). Y **no pegue mojibake de ejemplo en un `.ts`/`.md`**: el guardián se lee a sí mismo y a los docs, y cantaría sobre su propia documentación.
    - **Regla que deja**: cuando una tanda toca metadatos públicos, verifíquelos en el **HTML construido** (`.next/server/app/<ruta>.html`) o en producción con `curl`, mirando los bytes — no en el fuente, que es justo donde el fallo se ve «bien» si el editor lo re-decodifica al pintarlo.

## La reorganización de consolas V5 · PR-A: el OCP recibe el pasaporte (2026-08-18, V4.24)

Primera de las tres mudanzas del paso (ii) de `docs/V5_CONSOLAS_PLAN.md`. **Doce módulos dejaron el BCP y
pasaron al OCP** — Productores, Fincas, Lotes, Nominados, Arena, Galardonados, Club, Catálogo, Contratos,
Subastas, Black Stock y el CRM de CaaS (que además se anida: `/bcp/caas` → **`/ocp/crm/caas`**, primero de los
cuatro tableros de Cherry Picked). El tablero de KPIs que vivía en `/bcp` viajó con ellos y es hoy el panel del
OCP; el BCP estrena un scaffold de dirección y **su rail se queda solo con «Panel» hasta PR-B**, que es lo
previsto y está avisado dentro de `consoles.ts` y de su propia `page.tsx`.

- **`src/lib/panel/rutasMovidas.ts` es la FUENTE ÚNICA de las mudanzas.** Los talones leen de ahí, el guardián
  la comprueba y este documento la nombra en vez de listar rutas. Si un módulo se vuelve a mover —Black Stock
  se convierte en pestaña de CTC Selection en el paso (iii)— **se reapunta su entrada allí**, nunca se encadena
  un talón contra otro. `destinoDe()` compara por frontera de segmento, no por prefijo: la lección del proxy.
- **Los talones viven FUERA del grupo `(app)`.** Dentro, el layout corre `requireConsoleAccess("bcp")` y quien
  llegara por un marcador viejo recibiría un «no tiene acceso» sobre una URL que ya no existe. Un
  `[[...resto]]` opcional por módulo cubre la ruta y todas sus sub-rutas con un archivo. Verificado en un
  servidor de producción real, no solo en el build: `/bcp/arena/abc123` → **308** → `/ocp/arena/abc123`, y
  `/bcp/caas` → 308 → `/ocp/crm/caas`.
- **Guardián nuevo: `scripts/qa-rutas-consolas.mjs`** (164 comprobaciones). Verifica que cada enlace del rail
  tenga página, que cada ruta movida tenga talón y destino, que no haya colisiones de prefijo ni cadenas de
  talones, y —la que importa— **que no sobreviva ni un literal de ruta vieja en `src/`**.
- ⚠️ **Por qué esa última comprobación es la importante.** El grueso de las rutas escritas a mano no son
  enlaces: son **`revalidatePath()`, 108 de ~300**. Un enlace roto se ve al primer clic. Un `revalidatePath` a
  una ruta que ya no existe **no lanza, no avisa y no rompe el build**: deja al operador mirando datos rancios
  después de guardar. Es invisible hasta que alguien dice «guardé y no se actualizó».
- ⚠️ **Un `git mv` de módulo rompe imports que `tsc` NO ve.** Los `*.module.css` no se type-chequean: un
  `../shared.module.css` que ya no existe pasa `tsc --noEmit` limpio y muere en el build. Tras cada `git mv`,
  buscar imports relativos que crucen el límite de lo movido.
- **`shared.module.css` se mudó a `src/components/panel/`** (62 imports reapuntados). Nunca fue un activo del
  BCP: lo importan las tres consolas y `src/components/`. Dejarlo dentro de una consola que se estaba vaciando
  era una señal falsa de propiedad.
- El radio real de la mudanza, re-medido antes de empezar, está en el §3.2 del plan — los números originales
  se habían quedado cortos, y el dato que faltaba era el útil: **47 rutas distintas en 66 archivos**.

## La reorganización V5 · PR-B: el BCP recibe dirección y configuración (2026-08-18, V4.25)

Segunda de las tres mudanzas. **Ocho módulos entran al BCP**: Direccionamiento (+grados), Usuarios y
credenciales, Documentación del sistema, Mapa de Trabajo, Consumo de IA, Automatizaciones y GVG-Space desde el
ECP, y la Red de Socios desde el OCP. Con esto el BCP deja de estar vacío y su rail dice lo que su tagline
prometía desde el paso (i). Diez rutas nuevas en `rutasMovidas.ts` (22 en total) y el guardián en 213 checks.

- ⚠️ **`git mv` de un módulo se lleva a sus hijos, incluidos los que no se mudan.** `direccionamiento/` viajó
  con `plataformas/` dentro, que debía quedarse en el ECP (F6, se vuelve `/ecp/plataformas` en PR-C). Hubo que
  devolverlo a mano.
- ⚠️ **Cuando una sub-ruta se queda, el talón del padre NO puede ser un `[[...resto]]`**: chocaría con la
  página viva. El de `/ecp/direccionamiento` es explícito, y la excepción se declara en **`NO_SE_MOVIERON`**
  dentro de `rutasMovidas.ts` — de donde la lee también el guardián, para no denunciar como muerta una ruta que
  respira. Verificado en servidor real: `/ecp/direccionamiento` → 308 al BCP y
  `/ecp/direccionamiento/plataformas` → 307 a `/login`, o sea que llega a su página.
- **Un talón viejo se REAPUNTA, nunca se encadena.** `/ecp/grados` (de 2026-08-10) ya apuntaba a
  Direccionamiento; ahora va directo al destino final. De paso subió de `redirect` (307) a `permanentRedirect`
  (308) y salió del grupo `(app)`, como todos los demás.
- ⚠️ **La reescritura masiva de rutas también toca los GUARDIANES y los comentarios con fecha — y ahí cambia
  el SIGNIFICADO, no solo el texto.** En `qa-nav-check.mjs` dejó tres aserciones comprobando el rail de una
  consola contra rutas de otra (una «pasaba» por accidente), y en `navActivo.ts` fechó un fallo de 2026-08-16
  en la consola equivocada. Tras un `sed` masivo, **relea a mano `scripts/qa-*.mjs` y todo comentario con
  fecha que haya cambiado**.
- **`next.config.ts` `outputFileTracingIncludes` lleva RUTAS como claves** y se repuntaron a
  `/bcp/documentacion*`. Sin eso, `docs/architecture/**` no se traza dentro de la función y el módulo sale
  VACÍO en producción — sin error, y sin reproducirse en local.
- «Manejo de Plataformas» salió de la tira de pestañas de Direccionamiento: una tira no puede cruzar dos
  consolas. Sigue en el rail del ECP hasta PR-C.

## La reorganización V5 · PR-C y el cierre del paso (ii) (2026-08-18, V4.26)

Última de las tres mudanzas. **El ECP recibe contacto y caja de herramientas**: Leads · Recepción desde el OCP,
más los tres cotizadores, Anclas de mercado y Transcripciones; y «Manejo de Plataformas» deja de colgar de
Direccionamiento para ser módulo suelto en `/ecp/plataformas` (F6), cerrando el interinato que PR-B dejó
abierto. Con esto **el paso (ii) está completo**: 29 rutas mudadas en tres versiones, guardián en 248 checks.
El OCP queda siendo solo el pasaporte del lote, el BCP el negocio y el ECP la ejecución.

- ⚠️ **Un mapa de PERMISOS no es una ruta, y ninguna reescritura masiva lo toca.** `PILLAR_CONSOLE`
  (`leadsActions.ts`) dice qué consola manda sobre cada pilar de lead; no lleva barras, así que sobrevivió
  intacto a las tres pasadas — **y estaba mal desde PR-A**: `cocreate` apuntaba al BCP con su tablero ya en el
  OCP. No falla de forma visible: le pide al operador el grant de la consola equivocada, y quien tiene el
  correcto se queda fuera. Corregido junto con `general` (→ `ecp`). **Al mover un tablero, busque los mapas de
  permisos además de las rutas.**
- Las compuertas de escritura viajaron con sus módulos: **34 `requireConsoleWrite("ocp")` → `"ecp"`** en
  `lib/transcripciones/actions.ts` (15), `lib/cotizador/actions.ts` (14), `lib/anclas/actions.ts` (4) y
  `/api/transcripciones/descargar` (1). Tras PR-C no queda ninguna compuerta de escritura del OCP: sus módulos
  siguen en el `requireActiveAdmin` grueso, que es deuda anotada en el §9 del plan, no un olvido.
- **Un talón de padre con catch-all sirve a sus hijos, y cada uno va a SU destino**: hoy
  `/ecp/direccionamiento/[[...resto]]` manda el padre y `grados` al BCP y `plataformas` al propio ECP, con un
  solo archivo y sin encadenar. Verificado en servidor real, los tres.
- `NO_SE_MOVIERON` quedó **vacío pero montado**: su único inquilino se mudó, y el caso vuelve en cuanto un
  módulo con hijos se mude a medias.
- **Un guardián que revienta a mitad no guarda nada**: `qa-rutas-consolas` leía `git ls-files` y moría con
  ENOENT sobre archivos borrados sin `git rm`. Ahora filtra por existencia antes de leer.

## CTC Selection — el paraguas de lo comprado en firme (2026-08-18, V4.27)

Primer módulo del paso (iii). **Black Stock dejó de ser una entrada del rail** y es la pestaña Black de
**«CTC Selection»** (`/ocp/ctc-selection`), el paraguas de todo lote que CTC compra **en firme** para venderlo
como productor — lo contrario de los «Contratos Vigentes», que se colocan pre-vendidos. La otra pestaña,
**«Selección»**, lleva Red · Blue · Gold.

- **Una columna, no una segunda tabla** (F4): `black_negotiations` ganó `grade` (`lot_grade`, `not null
  default 'black'`, índice `(grade, status)`). La negociación de un Gold comprado en firme es el MISMO objeto
  que la de un Black — mismo pipeline, mismo contrato, mismos releases —, así que dos tablas habrían sido dos
  copias del mismo código divergiendo desde el primer día. La tabla estaba **vacía**, así que el default no
  reescribió nada.
- **`tyrian` no cabe, y lo impide la BASE**: `black_negotiations_grade_check` lo rechaza. Un Tyrian va a
  subasta y no se compra en firme; dejarlo como regla de interfaz habría sido dejarlo como sugerencia.
- **El talón de `/bcp/black-stock` se REAPUNTÓ**, no se encadenó: apunta directo a `/ocp/ctc-selection` en un
  solo salto. Es el primer uso real de la regla F2 que `rutasMovidas.ts` existía para sostener, y se comprobó
  en servidor real (`/bcp/black-stock` → 308 → `/ocp/ctc-selection`, sin escala).
- ✅ **CÓMO SE PUBLICA UN LOTE COMPRADO EN FIRME (D3.1, resuelta por el owner el 2026-08-18, V4.28).**
  Un lote que CTC compra se registra **primero en Kaffetal Regal** con su finca real, y desde ahí lleva **dos
  caras que no se contradicen**: el **REGISTRO** —pasaporte, ficha, rastro EUDR— conserva la finca real, y la
  **VITRINA** —las tarjetas del catálogo y la cinta del Sneak Peek— enseña a **CTC**, que es quien vende.
  Palabras del owner: *«the real farm is shown in the documentation but is replaced as the Finca in the
  showcase cards (Not changing the official finca, just how it looks in the UI)»*.
  - **Ni una fila de `lots` o `fincas` cambia.** La idea original de repuntar `finca_id` a una finca ficticia
    de CTC se descartó porque habría borrado el origen del lote, que es el activo y la obligación EUDR.
  - **Se anula en la VISTA, no en el componente**: `public_lot_catalog` deja de devolver `finca_name` cuando el
    lote está comprado y expone `ctc_selection`. La vista la lee `anon` — taparlo en la interfaz habría dejado
    el nombre de la finca a un `curl` de distancia.
  - **El rótulo lo pone la aplicación** desde `CTC_RAZON` (`src/lib/legal.ts`), su fuente única; escribirlo
    también en el SQL habría sido una segunda definición esperando a divergir.
  - **Se DERIVA de la compra** (`black_negotiations.status = 'comprar'`): no hay interruptor manual que se
    pueda olvidar de marcar. `municipio` y `departamento` se mantienen — el owner dijo «la Finca», y la región
    no identifica a un proveedor como el nombre del predio.
  - Comprobado en una transacción con ROLLBACK sobre datos reales: antes de comprar la vista devuelve
    `finca_name = "Palmas"` con `ctc_selection = false`; después, `finca_name = null` con `ctc_selection = true`.
  - ⚠️ **Consecuencia para el copy público, no bloqueante**: el Manifiesto promete «finca, personas, proceso y
    evaluación, verificables lote a lote» y la Historia habla de no perder «el nombre de quien los cultivó».
    Para un lote de CTC Selection eso sigue siendo cierto en la **ficha**, pero no en la **tarjeta**. Si la
    promesa se lee como «en la documentación», no hay nada que cambiar; si se lee como «en todas partes», el
    texto necesita un matiz. Está anotado en el §9 del plan.

## CRM CP Green — el segundo tablero de Cherry Picked (2026-08-18, V4.29)

`/ocp/crm/green`: los **compradores** de la tienda Green en un embudo de tres etapas (nuevo · activo ·
recurrente). Es el segundo de los cuatro CRM del OCP; Roast y X llegan en iii-3.

- **La etapa se DEDUCE de los pedidos y NO se guarda** (D3.2). 0 pedidos = nuevo, 1 = activo, 2+ = recurrente.
  En `buyer_profiles.crm_stage` —nullable— vive **solo el anulado manual**, y `null` significa «sigue la
  regla», no «sin etapa». Persistir la etapa calculada habría sido el error clásico de este tipo de tablero:
  en cuanto entra un pedido la fila conserva la etapa vieja, nada falla y el tablero miente en silencio. Así no
  hay nada que recalcular — la regla se evalúa al leer.
- **La regla vive en un módulo PURO**, `src/lib/crm/etapaComprador.ts`, por la misma razón que `navActivo.ts`:
  el tablero está detrás del login maestro con 2FA y no se puede conducir en un navegador, así que la lógica
  tiene que ser comprobable sin levantarlo. Guardián `scripts/qa-crm-green-check.mjs` (**21**), probado
  saboteando la página a propósito para confirmar que canta.
- **Fijar a mano la MISMA etapa que dicta la regla no cuenta como excepción**: si contara, el tablero se
  llenaría de avisos «a mano» que no informan de nada. Solo se marca cuando el anulado discrepa.
- **No comparte código con `LeadsBoard`**, y es deliberado: aquél está construido sobre `leads` y sus pilares
  —otra tabla, otro ciclo de vida—. Un lead es alguien que escribió; un comprador ya tiene cuenta y pedidos.
  Unificarlos habría significado un componente lleno de props que solo una de las dos mitades usa.
- No se toca `membership_tier` (verde/pinton/maduro): eso es el Club y sus puntos. Un comprador puede ser
  «recurrente» en el CRM y «verde» en el Club sin contradicción.

## CRM CP Roast y X — las listas de espera de 2027 (2026-08-18, V4.30)

`/ocp/crm/roast` y `/ocp/crm/x`. Con estos dos, **los cuatro tableros de Cherry Picked existen** (CaaS, Green,
Roast, X) y el grupo «OCP · Cherry Picked» del rail queda completo.

- **No son embudos, son listas de espera.** Roast y X abren en 2027 y lo único que recogen hoy es un correo de
  alguien que pidió que se le avise (`newsletter_subscribers`, escrito por `lib/newsletter/actions.ts`). El
  tablero está hecho para la única tarea real que tendrán: el día que el programa abra, escribirle a la lista
  entera a lo largo de varios días **sin perder la cuenta de por dónde se iba**.
- **Un componente para los dos** (`InteresBoard`), parametrizado por fuente — misma tabla, misma forma, misma
  tarea. Dos copias habrían divergido a la primera.
- **Solo se persiste lo que no se puede deducir**, la regla que dejó CRM CP Green: aquí es un único dato,
  `contacted_at`. Idioma, antigüedad, «este mes» y los recuentos se calculan al leer. Y se puede **desmarcar**:
  en una jornada de envíos masivos marcar de más es tan fácil como marcar de menos, y un tablero del que no se
  puede volver atrás acaba siendo un tablero en el que nadie confía.
- ⚠️ **Trampa nueva, y cara porque no falla: una clase de CSS module que no existe sale `undefined`.** Escribí
  `styles.btn` y `shared.module.css` no define `.btn` — el botón se habría pintado sin estilo, y ni `tsc` ni
  `eslint` ni el build dicen una palabra. Los botones de las consolas usan las clases **globales** `btn btn-sm`.
  El guardián nuevo `qa-crm-interes-check.mjs` (17) compara ahora las clases usadas contra las del `.module.css`
  — y hubo que enseñarle a ignorar los comentarios, porque se delató a sí mismo sobre el comentario que explica
  la trampa.
- **La acción revalida los DOS tableros**: una fila pertenece a una sola fuente, pero saber cuál exige leerla.
  Revalidar de más no cuesta nada; revalidar de menos deja el otro tablero rancio **sin avisar** — el mismo
  fallo mudo que persigue `qa-rutas-consolas`.
- ⚠️ `newsletter_subscribers` tiene una **tercera fuente sin tablero**, `ctc-home` (desde 2026-08-10). Hoy son
  0 filas; anotado en el §9 del plan.

## Red de Socios — una ficha por nodo (2026-08-18, V4.31)

`/bcp/socios/<nodo>`, una por cada uno de los cinco nodos partner. Responde de un vistazo a la pregunta que
antes obligaba a cruzar tres pantallas: **¿cómo está este socio ahora mismo?** — quién tiene credencial, en
qué estado, cuándo entró por última vez, por dónde entra y qué sella en el pasaporte.

- **Es una ficha de ESTADO, no un panel de operación.** Lo que cada nodo *hace* se construirá nodo a nodo y
  vivirá en su propia interfaz de socio. Aquí se mira la CREDENCIAL, que es lo que el BCP posee desde PR-B.
  La página **no escribe nada**: alta, baja y reenvío siguen en el tablero de `/bcp/socios`, donde ya
  funcionaban. Se llega desde el chip del nodo en ese tablero, que era decorativo y ahora es el enlace.
- **KPI propio para las invitaciones fallidas**, y no es decoración: un correo de invitación que no sale es el
  fallo mudo de este módulo — la credencial existe, el socio no sabe que existe, y nadie se entera salvo que
  alguien mire esta pantalla. Sacarlo del detalle de la fila y ponerlo arriba es la diferencia entre
  descubrirlo y no descubrirlo.

### ⚠️ Y un defecto que esta tanda destapó: 13 compuertas apuntaban a la consola equivocada

Al abrir el módulo apareció que `/bcp/socios/page.tsx` seguía llamando `requireConsoleAccess("ocp")` y
redirigiendo a `/ocp`. El barrido encontró **13 casos en 8 archivos**: siete módulos que PR-B trajo al BCP
seguían pidiendo la compuerta del ECP, y uno del OCP pedía la del BCP.

- **Lo dejó la mudanza del paso (ii)**: las claves de consola **no llevan barras**, así que la reescritura
  masiva de rutas no las tocó. Es el mismo agujero que `PILLAR_CONSOLE` en `leadsActions.ts`, y es la tercera
  vez que la misma familia de fallo aparece en esta reorganización.
- **No habría fallado nunca para el owner**, que tiene grant de las tres consolas. Habría esperado a que un
  colaborador con una sola credencial se topara con «no tiene acceso» en su propio módulo.
- Cerrado con la comprobación **(f)** de `qa-rutas-consolas.mjs`: cada página bajo `/bcp|/ecp|/ocp` debe
  protegerse con la compuerta de SU consola y no redirigir a otra. Verificada saboteando un archivo a
  propósito. **La regla para la próxima mudanza**: buscar los identificadores de permiso, no solo las rutas.

## Definición de contexto — deja de ser una herramienta de guion (2026-08-18, V4.32)

Último módulo del paso (iii), y con él **el paso (iii) queda completo**. `/bcp/direccionamiento` pasa a ser
las **tres preguntas** —Producto · Cliente · Contexto— por cada una de **cuatro** unidades (CTCX · KR · CHP ·
**Value Ecosystem**, la nueva), más tres campos globales y tres pestañas placeholder: Misión y Visión, Modelo
Económico y Mercado Global.

- ⚠️ **La decisión que el plan no había visto.** D3.3 preguntaba qué hacer con el moodboard; el moodboard
  estaba **vacío** (28 bytes). El problema real solo apareció al leer la tabla: **las respuestas de Producto y
  Contexto vivían DENTRO de la rama del formato «Video largo»** —`ctcx|largo|producto|promesa`…— porque era la
  pestaña en la que el owner escribía. Ahí estaba la promesa de marca, el CTA y el objetivo. Un borrado por
  prefijo se habría llevado **3.000 caracteres de trabajo real**.
- **Cómo se resolvió** (owner: *«Strip it, I'll rescue the text»*): respaldo completo de los 20 campos en
  `docs/archive/direccionamiento_context_2026-08-18.json`, migración que **levanta** las respuestas fuera de la
  rama de vídeo (`unidad|largo|bloque|campo` → `unidad|bloque|campo`), y retirada solo de los cinco campos que
  describían planos de cámara. Quedan **15 campos y 4.202 caracteres**.
- ⚠️ **EL MÓDULO DEJÓ DE SER VENDORIZADO.** `DefinicionDeContexto.jsx` (1.619 líneas) se mantenía verbatim para
  resincronizarlo con su autor. El rework retiraba justo lo que lo hacía suyo —formatos de vídeo, derivables,
  moodboard— y el archivo ya traía dentro las unidades, colores y dominios de CTC, así que la resincronización
  era teórica. La pantalla es ahora un componente de la casa (`.tsx`). **La herramienta de guion no desapareció
  del mundo**: vive fuera de la plataforma, y el owner la estaba usando el mismo día.
- **La estructura vive en `src/lib/direccionamiento/definicion.ts`**, módulo puro, y los `id` de campo se
  conservan EXACTAMENTE como estaban. Renombrar uno deja su texto huérfano en la base **sin que nada falle**:
  la clave deja de casar y el campo sale vacío. Lo vigila `qa-definicion-check.mjs` (33), que lista las 15
  claves ya escritas y exige que sigan teniendo casilla.
- **`serverActions.bodySizeLimit` volvió al defecto** (era 8 MB por los data-URI del moodboard). Si algún
  módulo futuro necesita subir binarios, el camino es Storage, no volver a levantarlo.
- **Dos efectos laterales buenos**: la línea base de `eslint` bajó de **27 avisos a 8** (19 eran del `.jsx`), y
  `qa-direccionamiento-check` volvió a **14 ok / 0 fail** — llevaba en 13/2 desde antes del 2026-08-18 porque
  su sección 2 comprobaba que el `.jsx` siguiera trayendo un párrafo que ya no traía. Vigilaba una premisa que
  había dejado de ser cierta y nadie lo miró: **un guardián que falla y se ignora enseña a ignorar los fallos.**

## Herramientas del Café — el modelo de acceso (2026-08-18, V4.33)

Primera de las dos tandas del paso (iv): **quién puede abrir qué**. La segunda —cómo se abre, con la concha
in-app y la vuelta segura— llega en V4.34.

- **`herramientas` es un OBJETIVO de la matriz de identidad, no una identidad.** Se entra con la cuenta que ya
  se tiene: productor de Kaffetal Regal **o** comprador de Cherry Picked. Crear una tercera identidad habría
  roto la exclusión productor ⊕ comprador sobre la que se sostiene toda `identidad/matriz.ts`. La landing
  `/herramientas` sigue siendo pública; lo que exige cuenta es **abrir** una herramienta.
- **Los permisos pasan a ser por PERSONA y por HERRAMIENTA** (`tool_user_grants`, service-role-only). Antes
  `tools_plus_grants` concedía por AUDIENCIA y abría todas las Plus de golpe — lo que vaciaba de sentido tener
  herramientas «visibles pero bloqueadas para crear deseo», que es justo para lo que existe el nivel Plus.
  `source` distingue `manual` de `payment`, sobre la misma tabla, para que el día que se cobre no haya que
  migrar nada.
- ⚠️ **`tools_plus_grants` NO se retiró.** Tiene 3 filas vivas y se sigue leyendo como **comodín heredado**:
  quitarla hoy le quitaría el acceso a tres personas sin avisar. `quienDependeDelComodin()` es la lista de
  trabajo de esa migración, y el veredicto de acceso **dice por qué se abrió** (`via: "permiso"` frente a
  `"comodin-heredado"`) — sin ese dato no habría forma de saber a quién falta migrar antes de retirar la tabla.
- ⚠️ **La caducidad se filtra en código, no con un `.lt("expires_at", …)`.** `expires_at` nulo significa «no
  caduca»; un filtro por fecha en SQL descartaría esas filas salvo que se escriba el `or(...is.null)`. Es el
  tipo de detalle que se olvida y **quita permisos en silencio** — misma familia que el `revalidatePath` muerto.
- **La regla vive en un módulo puro** (`lib/tools/accesoHerramienta.ts`) y la comprueba
  `qa-herramientas-acceso-check.mjs` (**26**), verificado saboteando la regla para confirmar que una Plus sin
  permiso deja de abrirse. Los tres rechazos —sin cuenta · sin membresía · sin permiso— tienen texto propio a
  propósito: entrar, registrarse y solicitar son tres salidas distintas, y un «no puede» genérico deja a la
  persona sin saber cuál le toca.

## Herramientas del Café — la concha in-app y la vuelta segura (2026-08-18, V4.34)

Segunda tanda del paso (iv), **que queda completo**. Cada herramienta se abre ahora **dentro de la webapp**, en
una ruta de su propia superficie: `/kaffetal-regal/herramientas/<slug>` y su gemela en Cherry Picked Green.

- **La ruta pertenece a la SUPERFICIE, no a una consola**, y eso es lo que la hace funcionar: bajo
  `kaffetal-regal.ctcexport.com` el proxy antepone la base del subdominio, así que una ruta de esa superficie
  es correcta por construcción — mientras que cualquier cosa colgada de `/ecp/…` se reescribiría y daría 404.
  Es la gotcha 12, la que condenó al mecanismo de herramientas «privadas». El HTML de la herramienta **no se
  toca**: sigue en `/tools/h/<slug>`, fuera del matcher del proxy.
- ⚠️ **LA VUELTA SEGURA ES SEGURIDAD, NO COMODIDAD.** El owner la pidió como usabilidad —«que pueda volver a lo
  que estaba haciendo» (A5)— y para eso la concha recibe la URL de origen en `?volver=`. Obedecerla a ciegas
  sería un **redirect abierto**: `…/herramientas/agtron?volver=https://sitio-falso/login` pondría, **dentro del
  dominio de CTC**, un botón «Volver a Kaffetal Regal» que lleva a una copia del login. Phishing servido por la
  casa, y sin que falle nada.
  `vueltaSegura()` (módulo puro) es lista blanca estrecha: solo rutas relativas de ESA superficie, rechazando
  `//host`, esquemas, barras invertidas, saltos de línea y prefijos parecidos —comparando por frontera de
  segmento, la misma lección del proxy y del rail—. **Nunca devuelve vacío**: una concha sin salida es justo lo
  que A5 quería evitar. Guardián `qa-concha-herramientas-check.mjs` (**42**), con once vectores de ataque, y
  verificado en servidor real.
- **Pedir no es poder**: las solicitudes viven en `tool_access_requests`, **tabla aparte** de
  `tool_user_grants`. Una fila de grants significa «puede abrir» sin más lectura; si las peticiones vivieran
  ahí con un `status`, un filtro olvidado convertiría una petición en un permiso **sin que nada fallara**. La
  tabla vieja `tools_plus_grants` sí mezcla ambas cosas — es exactamente lo que no se replicó.
- **D4.1 con su default**: «Solicitar» avisa a `info@`, y **el resultado del envío se guarda en la fila**. Un
  aviso que falla en silencio es una solicitud que nadie atiende — lección del OTP del BCP. La solicitud queda
  registrada aunque el correo no salga: el aviso es comodidad, no el registro.

## «Mis solicitudes» en el panel del productor — y el cierre del plan V5 (2026-08-19, V4.35)

Último paso de la reorganización. **Con V4.35 los cinco pasos del plan V5 están completos**; lo que queda es
que el owner declare V5.0 y el Version Wrap V38.

- ⚠️ **La premisa del plan era falsa, y leer la base antes de construir lo destapó.** El §6 decía que los leads
  son «capturas anónimas» y que había que emparejarlos con una cuenta al entrar (D5.1). **Ya se vinculan en el
  momento de la captura** (`leads.profile_id` + `account_provisioning`, creando la cuenta o atándola a una
  existente): 13 de 15 leads estaban vinculados. Y las respuestas de CTC **ya llegaban al productor dentro de
  KR**, espejadas en `producer_comm_log`. D5.1 quedó sin objeto.
- **Lo que faltaba era encontrarlas.** Aterrizaban mezcladas entre las notas de las fincas. Ahora hay un módulo
  **«Mis solicitudes»** (CTC Tech · Varietales · CaaS) con tarjeta propia junto a «Más allá de la exportación»,
  contador de respuestas sin leer e icono de sobre. Reusa `RetroalimentacionPanel` con la copy parametrizada:
  el hilo se lee igual, cambia de qué habla.
- ⚠️ **EL FALLO QUE CASI SALE, encontrado con datos reales.** Partir el feed por `leadId` a secas parecía
  correcto — pero **solo la nota de CTC lleva el lead**; la RESPUESTA del productor a ese mismo hilo se guarda
  con `parentId` y `leadId` nulo. La conversación habría quedado partida en dos pantallas: el mensaje de CTC en
  «Mis solicitudes» y la respuesta del productor en «Retroalimentación», **sin un solo error**. Eran 2 de 15
  notas. La partición mira ahora el `parentId` además del `leadId`, y `qa-solicitudes-kr-check.mjs` (23) lo
  vigila.
- **La partición es por CAMPO, no por el texto de la etiqueta**, y eso es deliberado: una partición basada en
  copy se rompe el día que alguien mejore el texto, y se rompe en silencio.
- **Dos migraciones de etiqueta, cosméticas pero necesarias**: `context_label` es lo que AGRUPA los hilos, así
  que cambiar el texto solo en el código habría partido conversaciones vivas en dos. Se recortó el prefijo
  «Solicitud CTC Home ·» —falso para quien entra por la landing de un servicio— y se normalizó «CTC Co-Create»
  a «CTC CaaS», que es la marca desde 2026-08-14 (la CLAVE sigue siendo `cocreate`; eso no se toca).
- **El formulario de contacto gana su puerta**: creaba la cuenta y terminaba en un «Entendido» que solo
  cerraba. Ahora ofrece **«Entrar a …»** según el pilar (CaaS → Cherry Picked Green; el resto → Kaffetal
  Regal), en español, inglés y alemán.
- ℹ️ **Los COMPRADORES siguen fuera, por diseño de A3**: el espejo solo dispara cuando el perfil vinculado es
  productor, así que un comprador de Cherry Picked que proponga un proyecto CaaS recibe las respuestas por
  correo pero no dentro de la app. Es el reflejo exacto de lo que se acaba de construir, y está anotado.

## `npm audit` vuelve a 0 sin degradar el Buzón (2026-08-19, V4.36)

La cadena era `deepmerge-ts <8.0.0` (GHSA-ggr8-5vv4-36mx) ← `html-to-text` ← **`mailparser`**, que es
dependencia directa del Buzón. Estuvo en 3 altas desde el 2026-08-17.

- **No se usó `npm audit fix --force`**: instalaba `mailparser@3.9.8`, una bajada que npm marca como
  rompedora, sobre el módulo que parsea el correo real de la casa.
- **Se pinchó la transitiva**: `overrides: { "deepmerge-ts": "^8.0.1" }` en `package.json`. `html-to-text` la
  pide como `^7.1.5`, así que sin override no sube; con él, `mailparser` se queda en 3.9.14 y la versión
  vulnerable sale del árbol. `npm audit` → **0**.
- **Verificado comparando la SALIDA, no la instalación.** Se capturó el resultado completo de `simpleParser`
  sobre dos correos —solo-HTML y `multipart/alternative`, con acentos, lista, enlace y asunto codificado en
  quoted-printable— **antes y después** del cambio: **byte a byte idéntico** (`text`, `textAsHtml`, `html`,
  adjuntos). Ese camino HTML → texto es exactamente el que atraviesa `html-to-text` → `deepmerge-ts`, que es
  lo que se estaba tocando.
- ⚠️ **Aviso para la próxima vez**: `simpleParser` **no** genera `text` desde el HTML cuando el mensaje es
  `multipart/mixed` con adjunto — `m.text` sale `undefined`, y es comportamiento normal. Una primera prueba lo
  interpretó como regresión del override; no lo era.
- **La regla del §0 del plan sigue en pie**: `npm audit` se mantiene en 0, y una dependencia nueva no puede
  subirlo. Si vuelve a aparecer un aviso sobre una transitiva, el primer intento es un `overrides` — no una
  bajada rompedora de la directa.

## Las 12 herramientas dejan de anunciarse solas (2026-08-19, V4.37)

`public/tools/*.html` son **archivos estáticos e indexables**. No los pinta Next: no pasan por
`generateMetadata` ni por ningún layout, así que **lo que no esté escrito a mano en su `<head>` no existe**.
Diez de las doce no tenían `meta description`, y cuando falta, Google no deja el hueco en blanco — recorta un
trozo del cuerpo y lo pone de titular. En una calculadora ese trozo suele ser una etiqueta de formulario. Nada
falla, no hay error en ningún log.

- **El texto no se inventó**: sale de `tools.descripcion`, que el owner ya escribió, recortado a la longitud de
  un resultado de búsqueda (139–160) y sin las notas de administración («Se ofrece a productores»,
  «Reemplazada por…»), que dicen a quién se le muestra y no qué hace.
- ℹ️ **De las dos que sí tenían descripción, solo se tocó la rota.** `viaje-cafe.html` tenía una corta pero
  correcta, escrita por el owner, y se deja tal cual — no había defecto que arreglar. Diez añadidas, una
  corregida, una intacta.
- ⚠️ **Una estaba peor que vacía.** `mermas-ctc.html` sí tenía descripción, y describía la calculadora
  **Rápida** — pero la base dice que ese archivo es la **Detallada**. Una descripción equivocada es peor que
  ninguna, porque nadie vuelve a mirarla.
- **Guardián nuevo `qa-tools-seo-check.mjs` (193 comprobaciones)**, y no se conforma con «existe»: largo útil,
  sufijo de la casa, sin frase de admin, **ninguna repetida** (Google colapsa duplicados y elige él cuál enseña)
  y **idioma acorde al `<html lang>`**. Verificado saboteándolo por tres caminos: quitando una descripción,
  duplicando otra y poniendo una en el idioma equivocado — los tres lo hacen fallar.
- ⚠️ **La comprobación de idioma existe porque el fallo ya pasó, en esta misma tanda**:
  `green-coffee-datasheet.html` declara `lang="es"` y tiene la interfaz entera en español, y aun así se le
  escribió primero una descripción en inglés. Un resultado de búsqueda en un idioma que la página no habla es
  una página que no se abre.
- ⚠️ **CORREGIDO EN V4.38.** Aquí se dijo que `tools.meta_description` era «un campo decorativo». Medio cierto
  y por tanto engañoso: nada la SIRVE —y no puede—, pero **sí la LEE el tablero de «Manejo de Plataformas»**
  para la píldora «sin descripción». Es el inventario, no decoración. Ver la sección de V4.38, abajo.
- **Solo se tocó el `<head>`.** Son herramientas vendorizadas con JS vivo; el cuerpo y los scripts no se
  rozaron.

## El espejo del inventario de herramientas, y una retirada que seguía publicada (2026-08-19, V4.38)

**Primero, una corrección de V4.37.** Allí se anotó que `tools.meta_description` «no la lee nadie». Es verdad
que **nada la sirve**, y que no puede: `/tools/h/[slug]` **redirige** al archivo estático cuando la versión es
del repo, y para una subida responde con `X-Robots-Tag: noindex`. Pero **sí la lee el tablero de «Manejo de
Plataformas»** (`cargarHerramientasSeo` → `PlataformasBoard`): de ahí salen la píldora roja «sin descripción» y
el contador de indexables, y el comentario del propio código dice que ese dato fue lo que abrió el módulo.
**No es decoración: es el inventario.** Y con 11 NULL + un «Test descripcion 1», después de V4.37 el tablero
mentía al revés — marcaba como faltantes descripciones que ya existían.

- **Se llenó la columna** con lo que de verdad sirve cada archivo (las 12), y **se corrigió `tools.lang` de
  `green-datasheet`**: decía `en` mientras el archivo declara `lang="es"` con la interfaz entera en español. Ese
  campo sale como píldora «ES»/«EN» en la tarjeta, así que anunciaba en inglés una herramienta española.
- **La regla, escrita para que no haya que deducirla**: para una herramienta del repositorio manda **el
  ARCHIVO** —es literalmente lo que se descarga el buscador— y la columna es su **espejo**. El campo del ECP
  ahora lo dice en pantalla, junto a la ruta del fichero, en vez de dejar que el owner lo descubra editando.
- **Guardián nuevo `qa-tools-seo-espejo.mjs` (68)**, que toca la base: exige que columna y archivo digan lo
  mismo, y que el idioma case. Verificado saboteándolo — se editó la descripción de `qr` y el `lang` de
  `green-datasheet` desde SQL, y denunció los dos.
- ⚠️ **ARCHIVAR NO RETIRA DE LA WEB una herramienta del repositorio, y eso salió de aquí.** `archivado_at` la
  saca del inventario del ECP y hace que `/tools/h/<id>` dé 404 — **pero el archivo sigue en `public/`**,
  servido estático, en una ruta que el proxy ni mira. `mermas-detallada` («Reporte de proceso de café»,
  reemplazada el 2026-08-15) llevaba desde entonces viva e indexable, compitiendo en el buscador con la
  herramienta que la sustituyó; y en V4.37, sin saberlo, **se le escribió una descripción nueva**, que es lo
  contrario de retirarla. Ahora lleva `<meta name="robots" content="noindex, follow">`: sale del índice y el
  enlace viejo sigue abriendo. **Borrar el archivo es otra decisión y es del owner** — puede estar enlazado
  desde fuera. El guardián exige `noindex` en toda archivada y **ausencia** de `noindex` en toda viva, que es el
  fallo simétrico: reactivar una sin quitarle la etiqueta la dejaría publicada e invisible.
- ⚠️ **Los identificadores están cruzados, y conviene saberlo antes de tocar nada**: la herramienta «Calculadora
  de mermas · Detallada» tiene el id **`mermas-ctc`**; el id `mermas-detallada` es la vieja «Reporte de proceso
  de café», que es la retirada. Esa confusión es la que había dejado a `mermas-ctc.html` describiendo la Rápida.

## La lista de espera de CTC Home gana su tablero (2026-08-19, V4.39)

`newsletter_subscribers` tiene tres fuentes. El paso (iii)-3 dio tablero a `roast` y `x`. La tercera,
`ctc-home`, nació el 2026-08-10 —cuando el índice de la red, en la portada, dejó de anunciar la puerta del
Control Panel y ofreció esta suscripción en su lugar— y estuvo **nueve días recogiendo correos que nadie podía
mirar**. El formulario guardaba, la base guardaba, y no fallaba nada porque no había nada que fallara: no había
dónde verlos. Hoy sigue en 0 filas, así que no se perdió ninguna dirección; eso fue suerte, no diseño.

- **Vive en el ECP, no en el OCP** — ésa era la decisión del punto. Roast y X cuelgan de «OCP · Cherry Picked»
  porque son programas de Cherry Picked. Ésta es de la red entera: en ese grupo, el sitio del tablero habría
  contradicho lo que contiene, y quien buscara la lista de la portada la habría buscado donde no está. Queda en
  «ECP · Dirección», junto a **Leads · Recepción**, que es lo otro que entra por la web pública. Ruta
  `/ecp/ctc-home`, que espeja la clave de la fuente igual que `/ocp/crm/roast` espeja la suya.
- ⚠️ **El módulo se mudó a `src/components/panel/interes/`.** `InteresBoard`, `InteresRow` e `interesActions`
  colgaban de `src/app/ocp/(app)/crm/`. Ahora sirven a DOS consolas, y dejarlos bajo el árbol de una significaba
  que la siguiente mudanza de módulos del OCP se llevaría por delante una página del ECP. Es la lección que dejó
  `shared.module.css` en PR-B, aplicada antes de que costara.
- ⚠️ **`marcarContactado` revalidaba dos rutas; ahora revalida tres.** Con la tercera dejó de ser cosmético: su
  tablero está en otra consola. Olvidarlo deja una lista que se llena y no se refresca, sin un solo error.
- **El estado vacío se parametrizó.** Decía «las altas llegan desde la landing del programa» — falso para la
  lista de la portada, y manda a buscar una landing que no existe.
- ⚠️ **LA LECCIÓN, que es la comprobación que faltaba**: `qa-crm-interes-check.mjs` llevaba las fuentes escritas
  a mano, así que comprobaba muy bien las dos que ya conocía y era ciego a la que se añadió después. Ahora
  **lee `SOURCES`** de `src/lib/newsletter/actions.ts` y exige que cada fuente tenga página, entrada en el rail
  y `revalidatePath`. Una fuente nueva sin tablero rompe el guardián el mismo día que se escribe, que es cuando
  arreglarlo es barato. Verificado saboteándolo: cuarta fuente falsa + un `revalidatePath` borrado → denunció
  las dos.

## D0.9 y D0.10 cerradas: las dos discrepancias del Sneak Peek (2026-08-19, V4.40)

Las dos preguntas que el paso 0 dejó abiertas sobre los lotes de muestra. **Ninguna cambió un valor** —las
tarjetas ya mostraban lo correcto—, así que el diff de `sneakPeekMock.ts` es **solo comentarios** y no hubo que
regenerar ni las ruedas ni las fichas PDF.

- **D0.9 · tarjeta #2, «Bourbon» (título) vs `Castillo` (campo)** → **Bourbon** (owner, 2026-08-19). Lo que
  costó fue preguntarlo bien, porque un campo estructurado normalmente le gana a un título: la ficha hermana
  `Tabi - Honey [La Pradera]` **sí** lleva `Variedad: Tabi`, así que el campo no está roto por sistema; y
  `Variedades / %` de La Pradera está vacío, así que la finca no desempata. **Desempata la taza**: 87.00 con
  perfil floral, mandarina y cardamomo, frente a los dos Castillo de la MISMA finca a 84.25 y 84.50 con
  chocolate, especias y avellana. Dos puntos y medio y otra taza.
- **D0.10 · tarjeta #3, «La Floresta» (relación) vs «La Fortaleza» (título y proveedor)** → **La Fortaleza**, y
  aquí no hizo falta criterio: **La Floresta no cultiva Gesha** — su propio `Variedades / %` dice «Castillo
  90%, colombia 10%». Un Gesha no sale de ahí. Todo lo demás apunta a La Fortaleza: el título dice
  «(Ragonvalia)», `Supplier Name` es «La Fortaleza / Wilmer R», el **RUT adjunto a esa finca es de Wilmer
  Rodríguez**, y el datasheet del lote se llama `La_Fortaleza_Wilmer_R_Gesha_Ragonvalia…`. Y el error se explica
  solo: **las dos fincas cuelgan del mismo proveedor**, que es justo cómo se escoge la equivocada en un
  desplegable.
- ⚠️ **LO QUE QUEDA, Y ES DEL OWNER: aguas arriba los dos errores siguen ahí.** En Notion, la ficha del Bourbon
  conserva `Variedad: Castillo`, y el Gesha sigue relacionado con «La Floresta» (que lo lista en sus `Fichas
  Tecnicas Asociadas`). Hoy no estorban porque el mock está escrito a mano — **pero el mock es temporal**. El
  día que los lotes se importen de verdad, los dos valores volverían a entrar **sin que falle nada**.
- **Por eso se clavan**: `qa-sneak-peek-check.mjs` pasa de 177 a **189** comprobaciones y fija variedad, finca,
  municipio y altura, además de exigir que el archivo siga explicando POR QUÉ —un valor clavado sin su razón se
  desclava en cuanto alguien lo cuestione. Verificado simulando la reimportación: Castillo + La Floresta +
  1 300 m → tres fallos.

## El Manifiesto dice dónde se verifica la trazabilidad (2026-08-19, V4.41)

Consecuencia pendiente de D3.1. El pilar 01 prometía «finca, personas, proceso y evaluación, **verificables
lote a lote**», a secas — y leído así la tarjeta fallaba en **dos** puntos, no en el que estaba anotado:

- la **finca**, por D3.1: un lote que CTC compró en firme se muestra a nombre de CTC;
- las **personas**, que **no lo trajo D3.1**: la tarjeta no ha mostrado nunca al productor, de ningún lote — el
  tipo `Lot` de `data.ts` ni siquiera tiene campo. La promesa ya sobrepasaba antes de V4.28.

**Decisión del owner: decir DÓNDE, sin retirar la promesa**, porque la promesa es cierta. El pilar 01 añade en
los tres idiomas «en la ficha técnica y en la DDS» / «on the datasheet and the DDS» / «im Datenblatt und in der
DDS».

- **No es una rebaja, es el dato que faltaba**, y apunta al mismo sitio que la web ya nombraba: la sección de
  EUDR (`GradosSection`, `eudrP2d`) dice que el número de DDS «viaja con cada despacho y queda visible en tu
  factura y en la ficha técnica del lote». Y coincide con lo que el owner decidió en D3.1 — la finca real «se
  muestra en la documentación».
- **La Historia no se toca, a propósito**: «sin perder el nombre de quien los cultivó» sigue siendo verdad, el
  nombre vive en la ficha. Corregir eso habría sido arreglar algo que no estaba roto.
- ⚠️ **Las dos mitades quedan ATADAS en `qa-sneak-peek-check.mjs`** (194, antes 189): falla si alguien le quita
  el «dónde» al pilar **y** falla si alguien devuelve la finca a la tarjeta. Por separado, ninguna de las dos
  rompía nada en ningún sitio — que es exactamente por qué la promesa y la vitrina se habían separado sin que
  nadie se enterara. Verificado saboteando las dos a la vez.
- ℹ️ **Hoy no hay ningún lote publicado** (`public_lot_catalog` devuelve 0 filas), así que esto no cambia nada
  que un visitante esté viendo. Era el momento barato.

## La ficha pública de un lote vivo, sobre lista blanca (2026-08-19, V4.42)

El §9 del plan V5 decía, para encender el botón «Ver ficha técnica» de los lotes reales: «generar el PDF desde
`lots.datasheet` y el botón se enciende para todo el catálogo sin tocar el componente».

⚠️ **Esa instrucción publicaba el expediente entero.** `lots.datasheet` son **110 claves**: `nit_rut` y
`razon_social` (datos fiscales del productor), `productor` (su nombre), `geo_ref` (la georreferencia del
predio), `qgrader_name` / `qgrader_lab` (quién catató y dónde), y todo el bloque `eudr_*` con la **evaluación
de riesgo** que CTC hace del proveedor. Y `estate`: por D3.1 la tarjeta de un lote comprado en firme no enseña
la finca, y ese PDF la habría dejado **a un clic de esa misma tarjeta**.

⚠️ **Dos documentos de este repo se contradecían, y ganó el viejo.** La auditoría del 2026-07-10 —arriba en
este mismo archivo— ya dejó escrito que `public_lot_catalog` existe *porque* una RLS ancha «would have exposed
the full private Ficha and exact finca geolocation to any buyer», y advierte de no deshacerlo. La nota del §9,
posterior, mandaba deshacerlo. **Si dos notas se contradicen, gana la que explica por qué.**

**Decisión del owner (2026-08-19): público, sobre lista blanca.** Lo construido:

- **`src/lib/catalogo/fichaPublica.ts`** — módulo puro. Lista **BLANCA**, no negra: lo que no está nombrado no
  sale, así que **una clave nueva del formulario nace privada**. Con lista negra nacería pública y no se sabría
  hasta que un productor viera su NIT en una descarga. La lista tampoco es criterio propio: es lo que las
  fichas de muestra ya publican (finca, origen, variedad, proceso, notas, SCA + diez atributos, altura).
- **Solo escalares.** Un objeto o arreglo anidado puede arrastrar dentro una lista de fincas aportantes o un
  adjunto, y una lista blanca solo mira el primer nivel.
- **D3.1 vale también dentro de la ficha**: en CTC Selection, `estate` se sustituye por el rótulo de CTC —
  también si viene vacío, porque una ficha muda ahí se leería como un dato que falta y no como una decisión.
- **`public_lot_catalog` gana `tiene_ficha`**: **un booleano, nunca el contenido**. Misma forma que
  `ctc_selection` en D3.1 — se deriva en la vista, la aplicación recibe un sí/no.
- **Página `/docs/ficha/[lotId]`.** ⚠️ Cuelga de `/docs` por la **gotcha 12**: el matcher del proxy excluye
  `docs/`; una ruta no excluida se reescribiría en un subdominio y daría 404, y el enlace se abre desde las
  siete superficies donde está montada la cinta. Las fichas de muestra ya viven ahí.
- **La compuerta es la vista, no un `if` a mano.** Si el lote no aparece en `public_lot_catalog`, 404 — y el
  `datasheet` solo se lee después de pasar. **Verificado contra la base real**: los dos lotes que hoy tienen
  ficha (con NIT dentro) están sin publicar y devuelven **404**.
- **`qa-ficha-publica-check.mjs` (105 comprobaciones)**, ejecutado contra **las 110 claves reales** leídas de la
  base, no un juego inventado. Verificado con cuatro sabotajes: recorrer la entrada en vez de la lista blanca,
  tumbar la sustitución de D3.1, meter `nit_rut` en la lista blanca (revienta al cargar el módulo) y sacar la
  URL de `/docs`.
- ℹ️ **Lo que NO está verificado**: no hay ningún lote publicado hoy, así que la página no se ha visto
  renderizada con datos reales. Proyección y compuerta sí están probadas. El primer lote publicado es el
  momento de mirarla.

## Los grados de Notion cuadran con su propio puntaje (2026-08-19, V4.43)

Higiene de datos en «📋 Fichas Técnicas de Café». Se releyó antes de tocar: los 6 descuadres detectados el
2026-08-17 seguían idénticos.

- **Seis relaciones `Grado CTC` corregidas** para que el grado enlazado sea el que dicta el puntaje: Borbón
  Rosado 88.50 Red→**Tiryan** · Tabi Honey 87.00 Black→**Gold** · Gesha 86.25 Gold→**Blue** · Tabi Doble Ferm.
  85.00 Gold→**Blue** · Castillo Doble Ferm. 84.50 Tiryan→**Red** · Castillo Lavado 84.25 Tiryan→**Red**.
  Bourbon Honey (87.00 → Gold) ya estaba bien.
- ⚠️ **La escala numérica de Notion nunca estuvo mal.** Los `Min SCA` / `Max SCA` de los cinco grados ya
  coincidían **exactamente** con `src/lib/grados/definicion.ts`. Lo roto eran las relaciones, no los rangos —
  el plan lo describía al revés.
- ⚠️ **Dos fichas que el plan no vio, y peores que un descuadre**: «Cenicafe 1 - Lavado [Cafe Semilla]» y
  «Castillo - Lavado [La Hacienda]» llevaban grado enlazado **sin ningún `SCA`**: un grado afirmado sin nada
  detrás. Por decisión del owner se rellenaron (es material de muestra): **81.50** en Cenicafe —dentro de
  Black, su grado, y el mismo número que ya usa `sneakPeekMock.ts` en la tarjeta 7— y **83.75** en Castillo
  [La Hacienda], dentro de Red.
  **Los dos llevan la marca en `Notas de Perfil`**: «PUNTAJE DE RELLENO — NO ES DE LABORATORIO», con fecha y la
  instrucción de sustituirlo antes de usar la ficha para nada comercial. Misma regla que las fichas PDF de
  muestra, selladas «MUESTRA» precisamente porque sus números son inventados.
- **Verificado con `gradoPorPuntaje()`**, no a ojo: las **9** fichas con puntaje pasan. Las otras dos siguen sin
  puntaje y sin grado, que es coherente — no afirman nada.
- ℹ️ **Decisión explícita del owner de NO tocar dos cosas**, así que no son un olvido: la página del grado sigue
  escrita **«Tiryan»** (la plataforma usa *Tyrian* y nada del código lee esa cadena), y su `Definicion` sigue
  diciendo «SCA+89» contra su propio `Min SCA` de 88.
- ℹ️ **No quedó guardián, y esto importa**: no hay credenciales de Notion en el repo, así que un espejo
  ejecutable no se puede escribir hoy. Es lo que falta para el «espejo Notion» de `INTEGRACIONES_PLAN.md` §1 —
  y sin él, esto se vuelve a descuadrar en silencio.

## La escala de grados era de dos en dos, y el repo llevaba semanas diciendo otra cosa (2026-08-19, V4.44)

Corrección del owner, y la más ancha de la tanda. `src/lib/grados/definicion.ts` afirmaba desde el 2026-08-05:
Black 80–82.99 · Red 83–84.99 · Blue 85–86.99 · Gold 87–87.99 · Tyrian 88–100. **La escala real es de dos en
dos**: **Black 80–82 · Red 82–84 · Blue 84–86 · Gold 86–88 · Tyrian 88+**.

Escrita con la convención del archivo —rango cerrado, dos decimales— eso es **80–81.99 · 82–83.99 · 84–85.99 ·
86–87.99 · 88–100**, y **el límite pertenece siempre al grado de arriba**: un 84.00 es Blue, no Red; un 88.00 es
Tyrian. Es la única lectura en la que las cinco bandas embaldosan sin solaparse.

- ⚠️ **La lección incómoda, y hay que dejarla escrita**: horas antes, en V4.43, se anotó que «la escala numérica
  de Notion nunca estuvo mal» porque sus `Min SCA`/`Max SCA` **coincidían exactamente** con `definicion.ts`.
  Coincidían — **y las dos estaban mal**. Se verificó la consistencia entre dos copias y se dio por validada la
  cifra; pero ninguna de las dos era la fuente. La fuente era el owner. *Dos copias de acuerdo no son una
  verificación.*
- **Qué se movió con la escala nueva**: tres lotes de la cinta suben de grado — **86.25 Blue→Gold**,
  **84.50 Red→Blue**, **84.25 Red→Blue**. Con ellos cambian sus códigos (`RD-8B15`→`BL-8B15`,
  `RD-3D62`→`BL-3D62`) y sus fichas PDF, que se **regeneraron** y cuyas versiones `RD-*` se borraron.
- ⚠️ **La escalera de la cinta pasa de 2 Gold · 2 Blue · 2 Red · 1 Black a 3 Gold · 3 Blue · 1 Black: se queda
  SIN NINGÚN RED.** No es un error — es lo que dicta el puntaje —, pero cambia lo que ve un visitante y merece
  una mirada del owner.
- **`GradosBoard` dejó de mentir**: LA página de referencia de grados **escribía a mano** la fila «Oficial
  (esta)» mientras su propia cabecera dice que los datos salen de `definicion.ts`. Con la corrección se habría
  quedado enseñando la escala vieja bajo el rótulo «Oficial». Ahora se pinta desde `GRADOS`.
- **Todas las demás copias reapuntadas**: el rótulo del cotizador logístico del OCP
  (`public/ocp-apps/cotizador-logistico.html`), los comentarios de `sneakPeekMock.ts`, `jsonLd.ts`,
  `OportunidadSection.tsx` y del propio `definicion.ts`.
- **Notion, alineado del todo**: los cinco grados con sus `Min SCA`/`Max SCA` nuevos, las cinco `Definicion`
  reescritas para que el texto concuerde con el número (SCA+80 · +82 · +84 · +86 · +88), la página **renombrada
  «Tiryan» → «Tyrian»**, y tres relaciones de fichas movidas otra vez. **Las 9 fichas con puntaje verificadas
  contra `gradoPorPuntaje()`: las 9 cuadran.**
- **`qa-grados-check.mjs` 44 → 48**: se añadieron los cuatro límites enteros (82 · 84 · 86 · 88) uno por uno,
  que es donde un error de un punto convierte un Red en Blue y cambia lo que se cobra.

## Audit findings — 2026-07-10 deep review

Full codebase + Supabase advisors review. Code itself came back clean: no `TODO`/`FIXME`, no `@ts-ignore`/`@ts-expect-error`, no stray `any`, `tsc`/`eslint` both clean. Findings are all on the Supabase side, via `get_advisors` + manual verification of the flagged objects. **None were auto-fixed — applying them was outside the scope of what was asked this session; the DB-migration attempt was correctly blocked by the auto-mode classifier as an unrequested change.**

### Recommended, not yet applied

- **Set `search_path = public`** on 4 guard/trigger functions that don't have it pinned: `sync_buyer_tier`, `guard_profiles_protected_columns`, `guard_buyer_protected_columns`, `guard_lots_producer_columns`. Lower real risk than it sounds — none of these four are `SECURITY DEFINER` (confirmed via `pg_proc`), so the classic search-path-hijack escalation doesn't apply the same way it would for a definer function. Still correct hygiene; the other 5 definer functions (`place_order`, `handle_new_user`, `sync_buyer_points`, `sync_listing_total_from_releases`, `guard_reservation_validity`) already have it set.
- **Revoke direct RPC `EXECUTE`** on 4 pure trigger functions currently callable via `/rest/v1/rpc/...` by `anon`/`authenticated` because Postgres grants `EXECUTE` on public-schema functions to `PUBLIC` by default: `handle_new_user`, `sync_buyer_points`, `sync_listing_total_from_releases`, `guard_reservation_validity`. Practical exploitability is low (calling a `RETURNS trigger` function outside trigger context errors on the unbound `NEW`/`OLD`/`TG_OP`), but there's no legitimate reason to leave it open. **Do not revoke `place_order`** — that one is deliberately called via `supabase.rpc('place_order', ...)` from Cherry Picked's checkout.
- **Missing covering indexes** on ~15 foreign-key columns (`arena_scores.entered_by`, `orders.buyer_id`, `lot_reservations.buyer_id`, etc. — full list in `get_advisors(type: performance)`). Negligible at current row counts (single digits to low tens per table); worth adding once real traffic shows up, not before.
- **RLS policies re-evaluate `auth.uid()`/`auth.<fn>()` per-row** instead of `(select auth.<fn>())` on ~20 policies across `profiles`, `lots`, `orders`, `lot_reservations`, etc. Same story — a real optimization, invisible at current scale, worth a batch pass before any real traffic ramp.
- **Leaked-password protection is disabled** in Supabase Auth settings. This is a dashboard toggle, not a code/migration fix. It was plan-gated on Free; the org is **Pro since 2026-08-17** and the owner agreed to switch it on (Supabase dashboard → project `sjznkzvefqfcysczllli` → Authentication → Attack Protection / Password settings → "Prevent use of leaked passwords"). Until someone confirms it, treat it as still off.

### Reviewed and confirmed fine (no action)

- Both `SECURITY DEFINER` views (`public_lot_catalog`, `public_transparency_pricing`) — column scope is correctly narrow, matches the documented design intent, no leakage of Ficha datasheet/geolocation/full contract terms.
- The 5 `arena_*`/`harvest_seasons` tables flagged "RLS enabled, no policy" — intentional, service-role-only by design (see schema section above), not an oversight. Same applies to `leads`/`lead_replies` (2026-07-13).
- `dangerouslySetInnerHTML` usage (the only one in the codebase) — properly escaped.
- All 4 `ai_next_step_*` cache columns — no cross-user leakage; ownership-checked in the API route before any read/write.

## Visual system map (`docs/architecture/` — now version-snapshotted)

A self-contained, no-build-step HTML/CSS/JS page — open the current version directly in a browser (or `npx serve docs/architecture`). It's a node-and-wire diagram of the *actual* system (not a generic teaching example): real components across 6 zones (Clients, Frontend & delivery, Identity & data access, Business logic, Data, Build & ship), real wires between them, and a "Traza" (trace) selector with real business-flow scenarios that animate a packet hop-by-hop through the nodes involved, narrated from the actual Server Action / RPC / route-handler code. Every ⓘ button opens a drawer explaining that piece and cross-links related concepts.

**As of 2026-07-10 this is no longer a single always-live file** — it's versioned snapshots, managed by the `architecture-doc-versioning` skill (`.claude/skills/architecture-doc-versioning/` at the repo root, one level up from `ctc-platform/`). Read that skill before touching anything in `docs/architecture/`. Short version: don't edit the HTML directly mid-session anymore — log what changed to the current `Log_Documentacion_Interactiva_V{N}.txt`, and only compile it into a new HTML snapshot during an explicit "Version Wrap" (user-requested or Claude-suggested). **Only whole-integer versions are ever compiled as real files** — `V1.0`, `V2.0`, `V3.0`, ... — there is no `V1.1`/`V1.2` HTML; those in-between states live purely as entries in the current log file until the next wrap. Every snapshot and log ever produced stays in the folder — nothing gets deleted, so the whole history is browsable by filename.

**Current version: `Documentacion_Interactiva_V37.0(a3cfe82).html`** — **V37.0** (2026-08-18, = CTC Web Platform **V4.26**) compiles the fourteen entries of Log V36, the biggest wrap in a while. **(1) The console re-org (V4.24–V4.26)**: 29 routes changed console until each one answered to its mission word — **BCP = Business**, **OCP = Operation**, **ECP = Execution**. Every node card that named a moved module was repointed (`n-bcp`, `n-consoles`, `n-cotizadores`, `n-anclas`, `n-transcripciones`, `n-direccionamiento`, `n-grados`, `n-socios`, `n-gvg`), and a new node **`n-rutas`** documents the machinery: `rutasMovidas.ts` as the single source, 308 stubs outside `(app)`, and the guardian. New trace **«Un enlace viejo del BCP sigue funcionando tras la mudanza»**. **(2) The Sneak Peek (V4.16–V4.21)** arrives as node **`n-sneakpeek`** with its own trace **«Un visitante sin cuenta mira el catálogo por la rendija»** — the band that cannot leak commercial data because its type has nowhere to put it, and that closed Cherry Picked Green's public catalogue. **(3) Three lessons became DICT entries**: `revalidatemudo` (a dead `revalidatePath` never warns), `permisonoruta` (a permission map is not a route — it survived all three rewrite passes and was wrong for a whole batch) and `codificacion` (a broken encoding passes the entire gate). Plus `vocabcongelado`, `cintavelocidad`, `serveronly`, `sneakpeek`, `rutasmovidas`. DICT 113 → 121, 37 → 39 nodes, 44 → 46 traces, 84 → 91 wires; **30 orphaned `ANN` paths** repointed after the move and 7 new annotations added. ⚠️ The battery caught a **duplicate `vocabulario` DICT key** — the entry already existed for the integration domains, and JS keeps the last, so the old drawer would have vanished silently; renamed to `vocabcongelado`. Same family as the V31 and V34 duplicate lessons; check 9 exists for exactly this. Previous: `Documentacion_Interactiva_V36.0(48bac75).html` — **V36.0** (2026-08-17, = CTC Web Platform **V4.15**) compiles Log V35: the whole **OCP · Transcripciones** arc (V4.8→V4.15) as two new nodes — `n-transcripciones` (the module, next to the cotizadores) and `n-transcriptor` (the local Python tool, in the Clientes zone: the only piece of the system that runs on a PC) — plus the new trace **«Nota de voz → transcripción archivada»** with its equipo-con-GPU | nube fork; six new DICT entries (`transcripciones`, `transcriptor`, `modelotiron` — the pull model —, `transcribirnube` — why the platform doesn't transcribe but can pay a provider, Make discarded —, `repopublico` — the private-repo incident —, `infrapro` — Supabase + Vercel Pro, $45/mo); the rail shortcut noted in `direccionamiento`/`manejoplataformas` (still "third tab"); **BCP = Base Control Panel** in its card; CaaS ≠ CommaaS in `caas`; Vercel at 19 subdomains + Pro; the local machine's guardians + `navActivo.ts`. DICT 107 → 113, 35 → 37 nodes, 43 → 44 traces, ANN 271 → 292 (the archived `PROXIMA_SESION` re-pointed). **The wrap-validation battery is now a file** — `docs/architecture/validate_snapshot.mjs` (nine checks, `--prev` for counters) — run it against the previous snapshot as control and the new one before saving. The console re-org from the owner's 2026-08-17 board is in the map only as a *planned* warning (in `direccionamiento` and the PDF's ANN), not as state. Previous: `Documentacion_Interactiva_V35.0(10c9016).html` — **V35.0** (2026-08-15, = CTC Web Platform **V4.7**) compiles the three entries of Log V34, all from one batch. **(1) The canonical moved to the casa matriz**: every surface now points at `www.ctcexport.com` + its route instead of its own subdomain — Google treats subdomains as separate sites, so eighteen of them split the network's reputation eighteen ways. It dragged the **sitemap** with it, which had the opposite rule written into a comment: www now lists the 19 canonical URLs and a subdomain lists only its own front door. `gradosLd()` also landed on Cherry Picked Green. **(2) The Herramientas stopped being code**: the `ToolId` union, the `TOOLS` map and `TOOL_COPY` (deleted) are replaced by a registry in the database (`tools` + `tool_versions`), so a new version is uploaded and published from the ECP without a deploy — plus the **interna/compartible** class, whose guard refuses to mark a tool internal while its live version is a file in `public/tools/` (that one is a public URL by construction, and no gate can cover it — V17's lesson turned into a database invariant). The three mermas calculators consolidated into one Rápida and one Detallada after confirming they shared **1 line out of ~1.600**. **(3) Manejo de Plataformas** arrived as Direccionamiento's third tab — not a separate module, by the owner's ruling — governing each surface's title, description and sitemap membership as a layer of *exceptions* over what the code declares. DICT 104 → 107 (`registrotools`, `claseinterna`, `manejoplataformas`), one new trace (`subirtool`). The wrap also found `CTX` declaring `"n-consoles"` **twice** — JS silently kept the last, so one chip list had never rendered; same family as the V31 DICT-duplicate lesson, now merged. Previous: `Documentacion_Interactiva_V34.0(0931345).html` (V34.0, = platform V4.6) which compiled the single entry of Log V33: **the buying portada stops being a list and becomes a cover page**. Cherry Picked's four programme cards adopt CTC Home's «Tres ofertas» gesture (state + clickable seal + dotted button, everything else inside the card that button opens — same shared `InfoPanel`, same dictionary copy, nothing duplicated); the header gains a background video; two illustrated bands now introduce the block that follows them. **CaaS gains a seal** — it was the last programme in the family still using a colour disc — and one file serves its portada card, its landing's topbar and its hero. Two gotchas earned their own DICT entries: `videofondo` (**a 149 MB GIF of photographic footage is not an animated WebP** — the house recipe is for line art with alpha; here a video codec weighs a third and looks better; plus why the video carries no `autoPlay` in the markup) and `recorteblanco` (**cutting a logo that arrives on white is decided by connectivity from the border, not by a colour threshold**, or you punch holes through the whites inside the artwork). DICT 102 → 104. ⚠️ The wrap also found that the node→card map is called **`CTX`, not `NODEDICT`**: the old validation was wrapped in a `typeof` guard and had silently never run — no wrap check may be guarded like that again; the corrected battery lives at the top of `Log_Documentacion_Interactiva_V34.txt`. Previous: `Documentacion_Interactiva_V33.0(c70573b).html` (V33.0, = platform V4.5 — JSON-LD, the cocoa trail, Co-Create → CaaS). Older snapshots and every `Log_Documentacion_Interactiva_V*.txt` stay in `docs/architecture/` as browsable history.

## Where to find deeper history

`C:\Users\gabri\.claude\plans\warm-bubbling-dongarra.md` (outside this repo, on the machine that ran these sessions) has the full addendum-by-addendum design rationale for every phase — read it if you need the *why* behind a decision this doc only summarizes.
