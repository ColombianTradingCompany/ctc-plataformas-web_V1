# CTC · Ecosystem Unification — Kickoff Brief

> **How to use this file:** put it in the platform repo (suggested path: `docs/UNIFICACION_KICKOFF.md`) and open the Claude Code session with:
> *"Read docs/UNIFICACION_KICKOFF.md in full and start Phase 0."*

---

## 0. Your role and how this engagement runs

You are the lead engineer and systems architect for unifying the operating ecosystem of **CTC (Colombian Trading Company / CTCx / Papagayo Beans)**. The ecosystem today is spread across four places: Gmail, Notion, Google Drive and the CTCx platform (Next.js on Vercel + Supabase), glued together in places by Make.com scenarios.

This is a large, multi-week job. Run it in three strict phases and **do not skip ahead**:

| Phase | What you do | What you must NOT do | Exit condition |
|---|---|---|---|
| **0 · Alignment** | Read this brief and the repo's `docs/`. Run a **read-only** audit to confirm the facts in §3. Then interview the owner (Gabriel) in rounds using the question bank in §5. | Write to any system (Supabase, Notion, Drive, Gmail, Make, Vercel). Propose final solutions before the questions are answered. | Gabriel confirms the alignment summary (`docs/UNIFICACION_ALINEACION.md`). |
| **1 · Plan** | Write `docs/PLAN_UNIFICACION.md` (format in §6). | Build anything. | Gabriel approves the plan, phase by phase. |
| **2 · Build by parts** | Execute one approved part at a time using the protocol in §7. | Start the next part before the current one is verified and signed off. | Each part is verified, logged, and signed off. |

**Working style**
- Gabriel writes in English or Spanish. Reply in the language he uses. The business content (Notion, Drive, labels, DB comments) is in Spanish, so new names follow existing Spanish conventions.
- Ask questions in **rounds of 3–6**, grouped by topic. For each question, give your recommended default and a one-line reason, so Gabriel can answer "ok" quickly.
- When something you find contradicts this brief, say so and trust what you verified, not the brief.
- Keep a running decisions log in `docs/UNIFICACION_ALINEACION.md` (decision, date, reason).

---

## 1. Target architecture (the owner's rules — non-negotiable)

1. **Notion is the centre.** It is where CRM, Admin and Knowhow (knowledge/procedures) are managed. It also **keeps track of every element of the system**: platforms, automations, integrations, accounts, data flows. Several Notion tables must show data that lives in Supabase.
2. **Google Drive is auxiliary.** It holds large files and is where work programs are used (Docs, Sheets, Slides…). Many Notion tables link back to a Drive folder, and that pattern stays.
3. **Deletion rule:** a file in Google Drive may only be deleted if it is **provably redundant**, meaning an equivalent copy exists elsewhere, typically in Notion. Nothing else is ever deleted.
4. **All email is managed from one mailbox: `ctcexportmain@gmail.com`.** Every other address forwards into it.
5. **The CTCx platform (Supabase) remains the operational system** for what it already runs (producers, lots, contracts, leads, quotes, samples, courier…). Whether Supabase or Notion is the record holder for each entity is decided in Phase 0. Don't assume.

### Additional safety rules (from the engineering side)
- **Read-only first.** Every write operation needs a dry run that produces a human-readable report before it executes for real.
- **Prefer reversible operations.** Archive or move instead of delete. Label instead of move. Back up before migrating, and snapshot tables before bulk updates.
- **Do not break production.** The platform serves ~20 live subdomains (`ctcexport.com`, `panel.`, `kaffetal-regal.`, `cherry-picked*.`, `directoriodelcafe.`…). Schema changes go through migrations with a rollback path. Keep RLS conventions (the house pattern is RLS on + service-role-only writes).
- **Secrets never go into Notion, Drive, docs or commits.** The Notion system registry records *where* a credential lives, never the credential.
- **Email:** never send email on Gabriel's behalf without explicit approval of the exact message, unless a rule he approved says otherwise.
- **Ask before acting** on anything ambiguous, destructive, or affecting external parties (producers, buyers, partners).

---

## 2. Accounts and access the session needs

Before Phase 0, check (e.g. with `/mcp`) that the session can reach the following. Report anything missing to Gabriel. Don't work around it.

| System | Account / identifier | Needed for |
|---|---|---|
| Gmail | ctcexportmain@gmail.com | email hub |
| Google Drive | ctcexportmain@gmail.com | aux storage |
| Notion | workspace **"CTC Main's Space"** (user ctcexportmain@gmail.com) | centre |
| Supabase | project **`ctc-platform`** (ref `sjznkzvefqfcysczllli`, eu-central-1, Postgres 17) | operational data |
| Vercel | team `colombiantradingcompanys-projects`, project **`ctc-plataformas-web-v1`** (Next.js) | platform deploys/logs |
| Make.com | org "Colombian Trading Company", team "Colombian Trading Company Core" (eu2) | existing automations |
| Hostinger | hPanel for `ctcexport.com` (mail + forwarders) | Gabriel operates it; you guide him |

---

## 3. Current state (verified 22 Oct 2026 — re-verify in Phase 0)

### 3.1 Email
- **ctcexportmain@gmail.com** is the hub. Gmail, Drive and Notion are all on this account.
- **the marketing Gmail (CTC Redes)** forwards to ctcexportmain (set up 22 Oct, verified working). It currently *keeps* its copy in its own inbox. A "Send mail as" alias for it was requested on ctcexportmain; check whether it was confirmed.
- **info@ctcexport.com** is hosted at **Hostinger** (MX `mx1/mx2.hostinger.com`). Since 22 Oct a Hostinger forwarder sends it to ctcexportmain, with "save copies" on (verified working). ctcexportmain can already **send as** info@.
  - Hostinger shows **"1/1 usado"**: the plan allows **only one forwarder**. That's why info@ can't forward to both Gmail and the platform's inbound address at the same time.
  - The old Gmail POP3 fetch for info@ ("Check mail from other accounts") has been failing since **16 Mar 2025**. Google is retiring POP fetch anyway. It should be deleted, if Gabriel hasn't already.
- **Platform inbox ("Buzón" in the BCP):** table `public.inbound_emails` (path: Hostinger forwarder → inbound subdomain MX → Resend Inbound → `/api/inbound-email` webhook). It holds **306 emails from 1 Mar 2025 to 16 Jul 2026, 302 unread**, and has **received nothing since 16 Jul 2026**. Outbound replies from the Buzón go through Resend (`public.buzon_outbound`, 0 rows) with an IMAP append to Hostinger's Sent folder. See `docs/INBOUND_EMAIL_SETUP.md`.
  - **Consequence:** mail sent only to info@ between **16 Jul and 22 Oct 2026** exists only in the Hostinger mailbox. Mail from Mar 2025 to Jul 2026 is in the Buzón (mostly unread). Neither has been reviewed.
  - `gvg@ctcexport.com` also exists as an address (seen in `inbound_emails`). Find out which other @ctcexport.com addresses exist.
- **Gmail state:** INBOX has 790 threads, 429 unread. Nothing gets archived.
- **Existing labels** (numbered business flow, in Spanish): `0. ADMIN Y ESTRATEGIA` (/FACTURAS, /TEMP - Lohnrostung Evaluation), `1. ORIGEN Y SUMINISTRO`, `2. TRÁNSITO E IMPORTACIÓN` (/DHL, /FEDEX, /CHAMPION LOGISTICA), `3. TOSTADORES E INVENTARIO`, `4. VENTAS Y MARKETING` (/Cotizaciones JIACUI), `5.IT` (/GAppScripts), `6.INVESTIGACION Y DESARROLLO`, `...OTROS`, plus loose labels `Recibos`, `ALMACAFE` (/CAFE ENLACE), `Coffee USA ofertas`, `[Notion]`.
  - Problems: `...OTROS` (224 threads) mixes promotions with real institutional mail (ProColombia, JETRO, Cancillería, Cámaras de Comercio, EFI/EUDR). `5.IT` mixes vendor marketing with real account/security mail. Automated platform mail (BCP login codes, CC copies of SCAJ follow-up sequences) clutters the inbox.
  - **Gabriel wants the label/email structure redesigned from scratch** as part of this work. Treat the current labels as input, not as the answer.
- **Auto-labeller:** Make scenario **"Gmail · Clasificar por dominio"** (id 9622256) runs every 15 min: Watch new emails → Gemini prompt → update labels. It has run ~2,880 times with 0 errors. It labels but never archives. Any new taxonomy must replace or update this scenario, otherwise the two will fight.
- **Prior design doc:** the Notion page **"📧 Email Secretary — Gmail Triage & Info@ Management with Notion CTC Sync"** describes a triage agent that classifies, drafts replies, logs action items to *Tareas Administrativas* and relationship notes to *Reuniones Generales*. It assumed Gmail *delegation*. That premise has been replaced by *forwarding*. Reuse its logic and update the premise.

### 3.2 CTCx platform
- Next.js app on Vercel (`ctc-plataformas-web-v1`, Node 24), serving these domains: `ctcexport.com`, `www`, `panel`, `caas`, `coffeed`, `ctc-tech`, `co-create`, `varietales`, `ctc-content`, `agente-carga`, `herramientas`, `terratalento`, `cherry-picked` (+`-x`, `-green`, `-roast`), `centro-calidad`, `kaffetal-regal`, `master-roaster`, `directoriodelcafe`, `agente-nacionalizacion`.
- Internal consoles: **BCP / ECP / OCP** (`public.panel_users`). Partner nodes are in `public.partner_accounts`.
- Supabase `public` schema has ~150 tables, all with RLS. Ones relevant to unification (non-exhaustive):
  - CRM-like: `profiles`, `producer_profiles`, `buyer_profiles`, `leads`, `lead_replies`, `event_leads`, `lead_forms`, `newsletter_subscribers`, `producer_comm_log`, `producer_comm_ack`, `directorio_*`
  - Operations: `fincas`, `lots`, `lot_*`, `purchase_contracts`, `contract_*`, `quotes`, `muestras`, `sample_*`, `compras`, `stock_*`, `courier_*`, `orders`
  - Email: `inbound_emails`, `buzon_outbound`
  - Integration plumbing: **`integration_events`** (23 rows), **`automations`** (4 rows), `audit_log`, `platform_settings`, `platform_surfaces`, `tools`, `ai_usage`
  - Knowledge/content: `coffeed_*`, `transcripts`
- The repo has versioned plans in `docs/` (e.g. `PLAN_CIRCUITO_DEL_LOTE`, `PLAN_CICLOS.md`, `BCP_USER_ADMIN_PLAN.md`, `INBOUND_EMAIL_SETUP.md`) and a CHANGELOG (currently around V6.x). Read the relevant ones and follow their conventions.
- **Out of scope unless Gabriel says otherwise:** the `gvg_*` tables (personal), the `commaas-*` and `wanst-me` Vercel projects, and the "Local Toys GV" Make folder.

### 3.3 Make.com scenarios (team "Colombian Trading Company Core")
| Scenario | Trigger | Does | Status |
|---|---|---|---|
| Gmail · Clasificar por dominio (9622256) | every 15 min | Gmail → Gemini → labels | active, ~2.9k runs |
| Notion · Nota comercial → CTC (9621737) | every 15 min | watch Notion DB items → JSON → HTTP to platform | active, ~2.9k runs |
| CTC · Eventos de la plataforma (9621729) | webhook | router → Notion item / HTTP / Google Calendar create & delete | active, **0 runs since Aug 2026**. Find out why |

### 3.4 Notion — "CTC Main's Space"
- Hubs: **Administración y Estratégia** (DBs *Tareas Administrativas* / *Tareas y Objetvos Estratégicos* and *Conceptos Fundamentales y Procesos Estándar*), **Go To Market / Recursos de Contenido** (*Recursos de GTM*, *Cotizaciones CTC*, *Banco de Recursos AV*), **(I+D)** (*Papers CTC*, *Hilos de I+D*, *Referencias de Información*), **Ecosistema de Valor / CTC Tech** (*Documentación CTC Tech*), **IT / Plataformas Web** (*Plataformas Web CTC*, page *Admin CTC Platform (B/E/OCP)*), **Reuniones Generales**, **Directorio de Partners**, **Objetivos y Tareas**, **Banco de Ideas y Brainstorm**.
- Useful existing pages: *"Arquitectura de CTC Main´s Space. Mapa general del espacio"* (a workspace map with a self-diagnosis of gaps), *"CTC Platforms: Projects como módulos operativos con Claude Code"*, *"Email Secretary…"* (see §3.1).
- Notion cannot query Supabase live. "Notion tables that query Supabase" means a **sync job** that writes Supabase data into Notion databases (and possibly back again). How that sync works is a Phase 0 decision.

### 3.5 Google Drive (My Drive root, owner ctcexportmain)
Top-level folders: `A. Docs Temp - Objetivos y Tareas`, `B. Banco Audiovisual de Soporte`, `C. CONTABILIDAD - Carpetas Compartidas` (shared with accounting), `D. Carpetas Auxiliares Permanentes`, `E. Videollamadas (REPO - Grandes Archivos)`, `Y. OTROS ARCHIVOS`, `Z. ARCHIVE`, plus unlettered: `ANALISIS DE MERCADO`, `CAPACITACIONES CTCX`, `CURSO IA procolombia sept 22 2026`, `Cromatografia`, `Finca Hub` (new, 17 Oct), `???`. There's also a recent folder `Documentos recibidos entrando a Japon` (export docs, Oct 2026). One Apps Script project exists: `[FE] Green Coffee Datasheet`.

---

## 4. Known open issues to resolve along the way
1. info@ backlog: about 302 unread in the Buzón (Mar 2025 – Jul 2026), plus everything that only sits in Hostinger (16 Jul – 22 Oct 2026). These need to be reviewed and brought into the hub.
2. Decide the fate of the Buzón / inbound pipeline now that Gmail is the hub. It can't receive while Hostinger's single forwarder points at Gmail.
3. Platform-generated mail (BCP OTP codes, SCAJ follow-up sequences sent as info@ with CC to ctcexportmain) needs a home that isn't the inbox.
4. The "CTC · Eventos de la plataforma" Make scenario has never fired.
5. Forwarded copies pile up in the source mailboxes (marketing Gmail, Hostinger). Hostinger has a storage quota.
6. The Notion workspace map page flags naming inconsistencies and a missing "master map" layer.

---

## 5. Phase 0 question bank (ask in rounds; recommend defaults)

**Round 1 · Scope, priorities, success**
- What does "done" look like in 3 months? Pick the 3 outcomes that matter most (e.g. inbox under control, CRM in Notion fed from the platform, Drive clean and linked).
- Priority order across email / CRM / Drive / system registry. What hurts most today?
- Who works in this system besides Gabriel (team, partners, accountant), and what access does each need?
- Time and budget constraints (Make operations, Notion plan, API costs, AI usage)?

**Round 2 · Source of truth per entity.** Build this matrix with Gabriel, one row per entity:
`Entity | Record holder (Supabase / Notion / Drive / Gmail) | Mirrors where | Sync direction | Sync frequency | Who edits where`
Candidate entities: companies/organizations, contacts, producers, fincas, buyers/roasters/HORECA clients, leads (web + event), deals/opportunities, quotes, lots, samples, purchase contracts & shipments, invoices/receipts, tasks, meetings/notes, institutions (ProColombia, JETRO, FNC…), partners, documents, knowledge/procedures, platform components/automations.
- Default to propose: Supabase holds operational entities the platform already runs, mirrored one-way into Notion read-only views. Notion holds CRM relationships, tasks, meetings, knowhow and the system registry. Use two-way sync only where people truly need to edit on both sides, with an explicit conflict rule.
- For each Notion table that should "query" Supabase: which fields, which filters, how fresh (real time / every 15 min / nightly)?

**Round 3 · Email (from scratch)**
- What jobs must the mailbox do? (e.g. respond to buyers, coordinate logistics, track institutions, receive invoices, platform notifications). Derive the taxonomy from these jobs, not from the old labels.
- Taxonomy dimensions to decide: area/process, counterparty type, status (needs reply / waiting / done), source address (@info / @marketing / @main), and whether to link emails to Notion CRM records.
- Inbox policy: inbox = needs action only? Which mail is auto-archived?
- How autonomous should triage be? (label only → label + archive → draft replies → auto-send low-stakes, as in the Email Secretary page)
- Should the classifier stay in Make + Gemini, move into platform code, or become a Claude agent? What about cost and observability?
- Backlog: import the Buzón's 306 emails and the Hostinger-only mail into Gmail? Or review them in place? With what cut-off?
- Future of the Buzón (BCP): retire it? Keep it as read-only history? Rebuild it to read from Gmail? Outbound platform mail (Resend): which sender identities, and should copies be logged?
- Which emails or events get logged into Notion (contact touchpoints, commitments, decisions)? How much content: link only, summary, or full text?
- Source mailbox hygiene: switch the marketing Gmail forward to "archive copy"? Turn off Hostinger "save copies" after a trust period?

**Round 4 · Notion as the centre**
- Restructure the workspace, or evolve the current hubs? Should the existing workspace map page become the live master index?
- CRM model: Organizations, Contacts, Interactions, Opportunities? How does it relate to `producer_profiles`, `buyer_profiles`, `leads`, `event_leads`?
- **System registry** design ("keep track of all elements"): one DB of components (platforms, subdomains, Supabase tables/areas, Make scenarios, integrations, accounts, Drive roots, automations, agents) with owner, purpose, status, data flows, docs link, where credentials live.
- Naming conventions (Spanish, numbering?) and the fixes already flagged (e.g. "Objetvos").

**Round 5 · Drive**
- Target folder taxonomy, and how it maps to Notion (does every Notion record with files get one Drive folder? what naming pattern? which link property?).
- **Exact definition of "redundant"** for the deletion rule: same file hash? same content in a Notion page? newer version exists? Who approves each deletion batch? Where does the deletion log live?
- Shared folders (accounting, partners): constraints on moving them, since moving can break other people's access.
- What counts as a "large file" that belongs only in Drive (videos, recordings, AV bank)?

**Round 6 · Engineering choices**
- Where sync and automation code lives: platform repo (Vercel cron / route handlers), Supabase Edge Functions + pg_cron, or Make. Recommend one primary home and keep Make only where it clearly wins.
- Notion API integration (token, rate limits ~3 req/s, pagination). Google APIs for a personal Gmail account (OAuth, not domain-wide delegation).
- Use the existing `integration_events` / `automations` tables as the integration ledger?
- Monitoring: where failures surface (Notion registry status, email digest, BCP panel)?
- Testing: staging branch / Supabase branching / a Notion sandbox page?

End Phase 0 by writing `docs/UNIFICACION_ALINEACION.md`: the decisions, the entity matrix, the email taxonomy draft, the Drive rules, and the open risks. Ask Gabriel to confirm it.

---

## 6. Phase 1 deliverable: `docs/PLAN_UNIFICACION.md`
Must contain:
1. **Target architecture**: diagram (Mermaid) of systems, entities and sync flows, with the direction and frequency of each flow.
2. **Entity matrix** (final).
3. **Phased roadmap.** Each part: goal · scope · changes per system · data migration steps · dry-run output · rollback · verification checklist · estimate · dependencies. Keep parts small enough to finish and verify in one or two sessions.
4. **Risk register** and the **deletion protocol** for Drive.

A *starting* skeleton for parts (adjust after alignment):
- **P0** Read-only audit and inventory, written into the Notion system registry (create the registry first).
- **P1** Email hub: new taxonomy, classifier replacement, inbox-zero pass, source-mailbox hygiene, backlog intake (Buzón + Hostinger), decision on Buzón/inbound pipeline.
- **P2** Notion core schema: CRM, Admin, Knowhow, System registry. Migrate or merge existing DBs.
- **P3** Supabase → Notion sync for the agreed tables, plus Notion → platform flows (extend or replace "Nota comercial → CTC"). Fix or retire "Eventos de la plataforma".
- **P4** Drive: taxonomy, Notion↔Drive linking, redundancy detection, then deletion batches approved by Gabriel.
- **P5** Email ↔ Notion logging and the triage agent (Email Secretary v2).
- **P6** Monitoring, documentation, handover (update the workspace master map).

---

## 7. Phase 2 build protocol (every part)
1. Restate the part's goal and acceptance criteria. Confirm nothing has changed since the plan.
2. Backup or snapshot whatever will be touched (table copy, Notion export or duplicate, Drive file list with IDs, Make blueprint export).
3. **Dry run** and report: what would be created, changed, moved or archived, with counts and samples.
4. Get Gabriel's explicit go-ahead.
5. Execute in small batches, logging every operation (IDs, before/after).
6. Verify against the acceptance criteria and show the evidence.
7. Update the CHANGELOG (repo convention), the Notion system registry entries, and `docs/PLAN_UNIFICACION.md` status.
8. Stop. Summarize. Ask whether to proceed to the next part.

---

## 8. Your first message in this session
1. Confirm in a few lines what you understood: the goal, the four rules, the three phases.
2. List what access you have and lack (§2).
3. Say what you will verify in the read-only audit, then run it.
4. Report the discrepancies against §3. Then ask **Round 1** of the questions.
