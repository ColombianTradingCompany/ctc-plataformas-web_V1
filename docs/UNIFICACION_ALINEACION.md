# Unificación del ecosistema CTC · Alineación (Fase 0)

> Brief: `docs/CTC_UNIFICACION_KICKOFF.md` (the kickoff names it `docs/UNIFICACION_KICKOFF.md`; it was
> dropped in under the `CTC_` name and is still untracked). This file is the **running decisions log** of
> Phase 0. It ends when Gabriel confirms it; then `docs/PLAN_UNIFICACION.md` is written.
>
> ⚠️ **This repository is public.** Nothing here may carry a secret, a password, a token, or personal data
> of a third party (names, addresses or messages of producers, buyers, partners, institutions' staff).
> Those live in Notion. Here: decisions, architecture, counts.

**Status:** Phase 0 · audit done · Rounds 1–6 answered (D-001…D-015, 2026-10-22/23) · Phase 1 plan written: [`docs/PLAN_UNIFICACION.md`](PLAN_UNIFICACION.md) (P0–P37) · awaiting the owner's confirmation of this alignment (P0 step 8) and approval of P0.

---

## 1 · Decisions log

| # | Date | Decision | Reason | Source |
|---|---|---|---|---|
| D-000 | 2026-10-22 | Phase 0 is read-only on Supabase, Notion, Drive, Gmail, Make and Vercel. The only writes are repo docs (this file, later the plan). | Owner's rule in the kickoff. | Gabriel, kickoff message |
| D-001 | 2026-10-22 | **The goal, in order:** (1) **restructure** — one shared structure across Notion (page and database nesting), Drive (folder names and tree) and Gmail (labels), each referencing/mirroring the others in a logical way; (2) **email clean-up** on top of that structure; (3) a **recurring daily opening and closing briefing** of emails and tasks. Drive deletions come after, in approved batches. Replaces the defaults of 1.1 and 1.2. | Fragmentation in how information is grouped is the most fundamental problem; the clean-up and the briefing only hold if the structure underneath is coherent. | Gabriel, Round 1 |
| D-002 | 2026-10-22 | **The CTCx platform stays the interface (and record holder) for what it manages — mainly the OCP**: producers, fincas, lots, samples, evaluations, contracts, stock. Notion is central for the rest of the operation and mirrors the platform's data read-only. | Owner's note: Notion is central to most of the operation, but the OCP is run from the platform. | Gabriel, Round 1 |
| D-003 | 2026-10-22 | **«Objetivos y Tareas» gets a fresh start**: its databases are reworked so tasks are always up to date and can feed the daily briefing. | The closing/opening briefing needs a task source that is trustworthy every day. | Gabriel, Round 1 |
| D-004 | 2026-10-22 | **Credentials leave Notion.** Claude delivers a list of *where* each credential sits (page, block, account — never the value; delivered 2026-10-22, kept outside the repo); the owner moves them into the Nord password manager; once the owner confirms, the values are removed from Notion (redacted, pages kept), with an explicit go-ahead for that write. The important ones are rotated, because Notion keeps page history. | Rule: secrets never live in Notion; the registry records where a credential lives, not the credential. | Gabriel, Round 1 |
| D-005 | 2026-10-22 | Round 1 defaults accepted for 1.3–1.6: access (Gabriel all · GVB Notion editor, no hub mailbox · accountant only «C. CONTABILIDAD» · partners nothing new); budget ≤ US$25/month of new spend, no plan upgrades without asking, rules before AI; the **Secretaría CTC doctrine is the baseline and that component is folded into this project**; the repo holds decisions and architecture only — anything with names goes to Notion. | Recommended defaults, accepted. | Gabriel, Round 1 |
| D-006 | 2026-10-22 | Rounds re-sequenced to follow D-001: R2 the shared structure + who holds each entity · R3 Notion nesting and «Objetivos y Tareas» · R4 Drive · R5 Gmail labels, clean-up and triage · R6 the daily briefing and the engineering choices. Before R2, a read-only map of the Notion and Drive trees. | The owner isn't sure how to map the information; a proposal needs the full current trees first. | Claude, accepted with the defaults |
| D-007 | 2026-10-22 | **Round 2 defaults accepted (2.1–2.6).** «Mapa CTC» 0–9 (Dirección · Origen · Operación y Logística · Comercial · Marca y Contenido · Plataformas e IT · Conocimiento · Directorios · Ejecución · Archivo) is the top level of Notion, Drive and Gmail and the platform's domain enum; business lines are a Notion tag. One Notion page + (if it has files) one same-named Drive folder per record, linked both ways via «Carpeta Drive» and the folder description. Gmail labels = hubs 0–6 + active projects under `8 · Ejecución/` + status labels (R5); no per-company labels. One Notion teamspace «CTC» with the ten hubs. Platform holds what the OCP/LCP run and Notion mirrors it one-way, at least daily; Notion holds organisations, contacts, objectives, tasks, meetings, knowhow and the system registry; Drive files only; Gmail messages only. Naming: Spanish, no ALL-CAPS, `N · Nombre`, `AAAA · Nombre`, one emoji per hub, one property vocabulary. | Recommended defaults, accepted. | Gabriel, Round 2 |
| D-008 | 2026-10-23 | **Phase-0 exception: the SCAJ 2026 follow-ups are paused.** `lead_forms.config.seguimiento` set to `false` for `scaj2026` (05:45 UTC); the confirmation email to new registrations stays on. Snapshot and the resume statement are in `docs/migraciones/2026-10-23_scaj_seguimiento_pausado.sql`. One follow-up had already gone out at 05:05 UTC (the buyer had not written to the hub); 2 pending are held. They resume when the «already replied» check can read replies again (R5, question 5.5). | The check (`yaRespondio`) reads only the Buzón, frozen since 2026-07-16, so buyers who replied by email would still be chased. | Gabriel, 2026-10-23 |
| D-009 | 2026-10-23 | **Round 3 defaults accepted (3.1–3.6).** (3.1) Fresh start: the old Objetivos y Tareas DB is archived as-is; Claude pre-marks every open line (move · idea · done · leave, with date and owner); the owner and GVB change only what they disagree with, in two sittings. (3.2) GVB joins Notion as a free guest with a personal login, editor on the ten hubs, invited only after the credentials are out. (3.3) «Today» = Colombia's date; times in Bogotá with Berlin beside. (3.4) «Reuniones» becomes the default meetings database in Notion and Notion Calendar if the plan allows it without an upgrade; existing notes with content are filed there. (3.5) Objects counted empty right before go to Notion's trash in one owner-approved batch (30 days recoverable); anything with content is archived in «9 · Archivo». (3.6) The owner deletes each credential in Notion right after copying it into NordPass, from a checklist; Claude clears the two task titles and verifies by location only. | Recommended defaults, accepted. | Gabriel, Round 3 |
| D-010 | 2026-10-23 | **Doctrine that comes with the accepted Round 3 design** (to reach the charters at the next docs change): (a) **deletion amendment** — besides Drive's provably-redundant rule, Notion objects counted empty may be trashed in an owner-approved batch (D-009 3.5); the Secretaría rule «nunca borra páginas» holds for everything with content; (b) for the one-time credential clean-up, **D-004 overrides** the Secretaría rule that the agent never touches credentials (the owner deletes values; the agent clears two titles and verifies by location); (c) the mirror's `CTC` select gains **`LCP`**, and a buyer account is told apart from a lead; (d) the **system registry is owned per row**: the platform owns the rows it types (surfaces, automations, consoles), Notion the rest; (e) **order**: credentials → Ejecución core → rest of Notion → Drive (R4) → Gmail (R5); the daily briefing starts only in R6, with the «Tablero diario» page of plain views until then; (f) **grades**: the code (`src/lib/grados/definicion.ts`, point bands since V5.160) is the source; Notion's SCA bands are obsolete and get corrected from the code, the discrepancy recorded, never harmonised silently. | Part of the accepted design; logged so the repo docs stop contradicting it. | Gabriel, Round 3 (with D-009) |
| D-011 | 2026-10-23 | **Round 4 defaults accepted (4.1–4.6).** (4.1) Machine-business files follow their owner: supplier material to its folder in «7 · Directorios», quotes sent to «3 · Comercial/Cotizaciones enviadas», machine projects to «8 · Ejecución/Proyectos», small-equipment manuals to «2 · Operación y Logística/Equipos». (4.2) See D-012. (4.3) Accounting: before any move the owner removes every account except the accounting team (the unidentified one included); the folder then moves whole under «0 · Dirección» as «Contabilidad», nothing inside renamed, access checked before and after. (4.4) Personal files (~7.6 GB) are parked in a private folder in «9 · Archivo», never deleted; the owner pulls out company documents, settles the Colombia colleague's 3 items with them, then transfers the rest to a personal account. (4.5) Drive deletion = only checksum-proven exact copies whose kept copy is in a company-only folder, lotes ≤ 50 files approved in session, only after the R6 briefing is live, Drive's 30-day trash as the waiting period. (4.6) The owner turns off «anyone with the link» on the packaging-artwork folder now; named access stays. | Recommended defaults, accepted. | Gabriel, Round 4 |
| D-012 | 2026-10-23 | **Amendments and rules that come with Round 4:** (a) **D-007's record rule is amended for footage**: a visit or event shoot stays in «4 · Marca y Contenido/Repositorio de contenido crudo», named «AAAA-MM · Tema», and the record's «Carpeta Drive» points to it; a record folder is created only for non-video files; (b) Round 4 deletes **only checksum-proven byte copies** (Google-native twins and content-in-Notion cases are deferred); (c) **empty Drive folders are parked** in «9 · Archivo/Por clasificar/Carpetas vacías», never trashed; (d) **no Drive deletion lote before R6**; (e) bulk Drive metadata (checksums, trash state, permissions, descriptions) comes from a read-only Apps Script the owner runs (S0, after the work, and before each lote); (f) any move into or out of a shared folder needs the owner's OK; (g) `SECRETARIA_PLAN.md`'s claim that the AUX folders mirror the Notion directories is corrected (done 2026-10-23). | Part of the accepted design; logged so the repo docs stop contradicting it. | Gabriel, Round 4 (with D-011) |
| D-013 | 2026-10-23 | **Round 5 defaults accepted (5.1–5.6).** (5.1) Only machine mail leaves the inbox by itself: platform copies, routine service notices, newsletters and promotions, known invoices and bank movements (archived unread = the accounting tray), bulk institutional invitations (archived unread, listed each morning); login codes leave after one day; anything a person wrote and every alert, account, expiry or renewal notice stays. (5.2) Besides the seven hub labels, seven flat status labels — Responder, Esperando (owner), Revisar (classifier), Alerta, Código, Automático, Contabilidad (rules) — are D-007's «few status labels»; no per-company labels, no sub-folders. (5.3) Backlog: keep everything active since 2026-09-22, starred, and what the owner flags on a one-time list of ~125 older conversations; archive the rest under «Barrido 2026-10», unread kept, nothing deleted. (5.4) The Buzón becomes read-only history: its mailbox password leaves Vercel (disabling the deleting sync), then a read-only Hostinger backup, one import into Gmail, and a new info@ password. (5.5) The fair follow-ups stay paused (D-008) until replies can be checked again; the house copy then goes Bcc. (5.6) The classifier stays in the existing Make scenario, updated (hourly, cheapest model, only what rules left, «Revisar» when unsure). Also part of the design: rules before AI as ~20 free Gmail filters kept outside the repo; Notion stores a link and the obligation, never message text; the domain-enum change is a **split**, shipped in one platform batch. | Recommended defaults, accepted. | Gabriel, Round 5 |
| D-014 | 2026-10-23 | **Round 6 defaults accepted (6.1–6.6).** (6.1) The briefing is a **scheduled Claude task in the cloud** on the current plan (cheapest model, usage credits off), reading Notion, Gmail, Calendar and Drive through the approved connectors plus one locked read-only platform route; fixed scripts compute every number and list and build the page, the AI only runs a fixed search plan, sorts unclear meetings and words proposals; a guard allows writes only to its own pages. (6.2) Monday–Friday: owner's opening 07:37 Berlin, the Colombia colleague's 06:47 Bogotá, closing 18:37 Bogotá; one Notion page per run; one short morning email from a no-reply company address (counts and links only); mail detail on a private page; other email only from three fixed alarms. (6.3) «Live» after a supervised week that passes written checks (own pages and proposal rows only during it); then one standing write per week (code-only mail and old briefing emails archived + ticked proposals executed; meeting notes filed into Reuniones; today's external meetings added); it never sends, deletes or relabels anything else; going live unlocks the Drive deletion lotes (D-012 d). (6.4) Plumbing lives in the **platform repo** with one run log (Notion mirror as one daily job with a Notion key connected only to mirrored databases, registry refresh, health checks, domain-enum change); **Make** keeps the Gmail classifier, nightly clean-up, spam count, follow-up reply check, calendar writes, quote note and an independent alarm; nothing in the platform signs in to Google. (6.5) **Phase-0 exception, owner-led today:** identify the secret held in `MAKE_WEBHOOK_URL`, clear that value in Vercel and redeploy, rotate the secret wherever it is used (new value in NordPass); after the owner's OK Claude blanks the 3 stored copies; the code fix (error codes, never free text) ships first in Phase 1. (6.6) An hourly Make check of Gmail (by sender, contacts due in the next two hours) gates every fair follow-up; follow-ups restart only on the owner's separate go after 5 matching days. | Recommended defaults, accepted. | Gabriel, Round 6 |
| D-015 | 2026-10-23 | **Phase-0 exception (D-014 6.5), first half done.** The owner deleted `MAKE_WEBHOOK_URL` in Vercel and redeployed (verified: variable absent, production READY); Claude replaced the misfiled value in the 3 `integration_events.ultimo_error` rows with a fixed note (acta `docs/migraciones/2026-10-23_integration_events_clave_retirada.sql`; verified: no row keeps a 40+ hex string). **Still open:** which secret the value was. Evidence so far: `MAKE_WEBHOOK_URL` was created 26 seconds after `INTEGRACIONES_SECRET_MAKE`, which was then changed ~2 hours later (2026-08-05), and the owner reports Make's current value differs — so it is most likely the inbound secret's **first, retired** value. Recommended (cheap, removes the doubt): rotate the live inbound secret once — Vercel `INTEGRACIONES_SECRET_MAKE` + Make's custom variable `CTC_SECRET` (used by both CTC scenarios), new value in NordPass, then redeploy. **✅ Closed 2026-10-23:** the owner rotated the inbound secret (Vercel `INTEGRACIONES_SECRET_MAKE` changed today; Make variable `CTC_SECRET` updated; new value in NordPass) and redeployed — the new production build is READY on all 24 aliases, and the inbound route answers 401 without a token (it would answer 503 if the secret were missing). **Identification agreed by the owner (2026-10-24):** the value was the inbound secret's first, retired version. **Both sides proven (2026-10-24):** Make's «Run this module only» reached the inbound route and was refused only for its empty body (400), which the route checks after the secret — so Make's new value is accepted; no row was written. | The value was shown in full on an internal console board; the platform would have kept copying it while the setting held it. | Gabriel, 2026-10-23 |
| D-016 | 2026-10-24 | **Credentials: the owner has extracted all of them from Notion (2026-10-24) and administers them in parallel; Claude removes every credential value from Notion.** This amends D-009 3.6 (which had the owner deleting them). Claude deletes around each value (blocks, images, attachments, the two task titles) without ever writing a value anywhere; pages are kept; it verifies by location only. Rotation of the important ones stays with the owner (Notion keeps page history for 30 days). **✅ Executed 2026-10-24:** 24 pages rewritten without their values (each value replaced by the marker «→ NordPass (retirada de Notion el 2026-10-24)»), 2 task titles retitled, 6 screenshots and 1 attached secret file removed; the 26th inventory item had been deleted by the owner and the 25th (an unconfirmed second copy) holds nothing in its live content. The verification sweep found 2 pages the inventory had missed and 1 screenshot showing a password; all three cleaned. Verified by fetching each page (locations only). Left as they are, by design: user names and account emails (not secrets), a meeting note that only hints at which password was meant, and a partner page with bank and identity data (sensitive, not a credential; flagged to the owner). Notion's search index still shows old snippets for a few pages until it re-indexes; the live pages are clean. | Owner's instruction, 2026-10-24: «they can all be deleted and I will administrate them in parallel». | Gabriel, 2026-10-24 |
| D-017 | 2026-10-24 | **Fast track for the SCAJ 2026 email campaign; the three tracks run in parallel (amends D-010 e).** (1) Gmail is made campaign-ready first — the campaign label «8 · Ejecución/SCAJ 2026», the status labels, one imported filter file that takes machine mail out of the inbox (D-013 5.1) and keeps every campaign reply in it, and the archiving of old code and platform-copy mail after an approved dry run. (2) **A Notion campaign dashboard connected to Gmail**: a campaign database (one row per lead, from the Lead Desk export) with views for progress; sending goes through Gmail only when the owner approves the exact message on its row; replies are detected automatically and update the row; the same reply check later gates the platform's fair follow-ups (D-014 6.6). (3) The Notion and Drive restructure continues in parallel; the full label rename, the classifier update with the domain-enum split and the old-backlog sweep come after the launch, so the campaign is never disturbed. **Built 2026-10-24 (track 1 and 2):** in Notion, a campaign page under the SCAJ 2026 event with two linked databases — *Leads* (258 rows seeded once from the Lead Desk export; the commercial status now lives here) and *Envíos* (one row per email) — and five views (funnel chart, «Por aprobar», sends by status, replies, pipeline). In Make, two scenarios on the existing Gmail and Notion connections, each every 5 minutes: the sender takes only rows the owner set to *Aprobado* (at most 10 per run), sends them from the domain address through the hub Gmail and writes the result back (or *Error*, never retried on its own); the reply tracker matches inbound mail by thread, or by the lead's registered address, marks the send and the lead, and adds the campaign label, leaving the mail in the inbox. Both were tested without sending anything: the approval filter on throwaway rows, the tracker on the 50 newest inbox messages (no false match). In Gmail, the campaign label and the seven status labels exist; an 11-filter import file (codes, platform copies, routine notices, alerts kept in the inbox, newsletters, promotions, institutional bulk mail, bounces) waits for the owner, together with deleting one current filter that archives account-security alerts; archiving 68 old code and platform-copy conversations waits for the owner's OK. The first real send is the owner's own test row. | The owner needs the campaign out as soon as possible and expected to run it from Notion. | Gabriel, 2026-10-24 |
| D-018 | 2026-10-24 | **Phase 2 progress.** P0 closed (docs commit live; two owner items open). P1 (S0 dispatcher hardening) written and green locally, not pushed: it waits for the owner's go-ahead. P3 (Notion read-only dry run) done with 0 writes: 24 of 25 ledger entries resolved, 65 meeting notes classified, 18 design corrections proposed, and 5 credential locations the 2026-10-24 sweep could not reach (a toggle on a page that also holds meeting notes, three meeting transcripts and one session link) handed to the owner for P4 together with 7 attachments to open; P4's order is changed by D-016 (values removed first, rotation by the owner in parallel), and a sixth rotation chain is added for the EU sign-in used by the EUDR system. P13 Step 0a: permission reads taken; the owner cleans the accounting folder and names or removes one writer. 68 old code and platform-copy conversations archived with the owner's OK. | Owner's «carry on with the rest of the plan», 2026-10-24. | Claude, 2026-10-24 |
| D-019 | 2026-10-25 | **P1 closed: the outbound integration path is hardened and alive.** The owner approved shipping V6.8 (error fields store codes only; the webhook address is validated before any call; nothing is sent without the key in production; the key travels in Make's API-key header) after the 3 old rows were discarded, and V6.9 (each event is sent within the same request, waited for with a 3-second ceiling, and the dispatcher runs every 10 minutes as the safety net). The owner set the two variables in Production only, turned on API-key authentication on the router webhook and turned off its request-header copy. Proof: an unsigned call is refused; three pings reached Make (the last one 1.4 s after it was created) and no route wrote anything. Still open: watch the first real event end to end. | The V6.8 ping showed the after-response send never fired from the console; the owner chose the immediate send plus the 10-minute backup over a daily run. | Gabriel, 2026-10-25 |
| D-020 | 2026-10-25 | **P2 closed: every platform cron now leaves a run record, and a late or failed one shows on ECP › Automatizaciones.** The owner approved the migration without a branch, release V6.10 and the 14 registry rows after the push, aware that the batch touches other components' cron routes. The new ledger accepts one row per run that is closed exactly once and holds numbers only; its 22 trigger tests passed and left nothing behind. Proof: the live badge shows V6.10; an unauthenticated call is refused and writes nothing; the first dispatcher and hourly runs closed `ok` within seconds; the fair follow-ups stay paused (D-008). Still open: the first runs of the 5 daily crons and the Monday job (2026-10-26), and the Thursday job (2026-10-29). | The dispatcher runs every 10 minutes since V6.9, so the ledger grows by about 172 rows a day instead of 29; still small at 400 days. | Gabriel, 2026-10-25 |
| D-021 | 2026-10-26 | **P4 narrowed, rotations moved to the end, the Gmail filters in.** (1) The owner imported the 11 filters of D-017 and deleted the old filter that archived Google's account-security sender. (2) The owner deleted the EUDR page's «Credenciales» line (checked by location: the toggle now holds only the sign-in link). (3) The other spots on the P4 checklist stay as they are: the password spoken in 3 meeting transcripts, the 7 attachments, the «Cuentas Borradas» list, the Trash search, and an old single-use sign-in link on the EUDR page. (4) The vault and rotation chains A–F move to P37. (5) The two Drive writers stay for now; P13 Step 0a stays open, and the accounting folder still cannot move in P15 before its clean-up (D-011 4.3). What follows from it: B0 must be encrypted because it will hold those spots; the Colombia colleague's Notion invitation, which D-009 3.2 tied to the credentials being out, is decided again in P8. | The owner wants effort on visible progress now and one rotation pass at the end. | Gabriel, 2026-10-26 |
| D-022 | 2026-10-26 | **Drive Step 0a closed by confirmation instead of removal (amends D-011 4.3).** The owner confirmed that every editor of the accounting invoices folder (the accountant's three addresses, the accounting mailbox, the contador and one more person) and the one editor of the sales-resources folder keep editor access. Nothing was removed; the «after» read equals the «before» read of 2026-10-24, the month subfolder included. The accounting folder still moves whole under «0 · Dirección» in P15 with its sharing unchanged: a move by id keeps its direct shares, and its current parent is shared with nobody. Who the two newly confirmed people are is kept only in the local share register. | They work in those folders today; removing and restoring their access would interrupt them and send share notices for no gain. | Gabriel, 2026-10-26 |
| D-023 | 2026-10-26 | **Gmail and Drive run in parallel with Notion.** The owner chose the parallel route proposed in the briefing: the Drive track (P13 onward) and the Gmail track (P17 onward) start now instead of after the Notion parts P5–P11, because the shared vocabulary (the ten hubs, the status labels) is already fixed by D-007 and D-013 and the hubs now exist in Notion (P5). Each part still follows the protocol (dry run, go-ahead, execute, verify). The read-only dry runs of P13 and P17, with a check of every dependency on the Notion parts, started on 2026-10-26; the changed order goes into this plan when they report. | Visible progress in Gmail and Drive was weeks away in the strict order. | Gabriel, 2026-10-26 |
| D-024 | 2026-10-26 | **P17 (local part) closed: every Gmail-side copy exists, is checked, and sits in one encrypted archive outside the repo.** Trash pass: 28 of 52 conversations restored on the owner's marks, before the mailbox snapshot by the owner's choice (the local list keeps each one's labels, so the undo map is complete); Spam reviewed by the owner (1 rescued). The mailbox snapshot was built from a Mail-only Google Takeout instead of ~81 connector pages (1,379 conversations; equal to Gmail's label counts except one email that arrived in between). Filter export from Gmail settings (21 filters, +11 / −1 against the first export); the Takeout's filter file drops some actions and is kept only as a secondary record. Platform mailbox exported by a read-only script (306 messages, 295 attachments, every size and plain checksum equal). Five automation blueprints exported by the owner and redacted locally (0 leftovers in the rescan); two unrelated ones kept apart. Domain mailbox backed up by a read-only IMAP script (455 messages in 10 folders, every checksum re-verified; the verify run found nothing missing or changed on the server). Packed as one encrypted archive (777 files) instead of three; the owner's integrity test passed. Open: the owner's keep or delete marks on the 10 old filters, P17b (Drive copy after P16), the registry row (P11). | Copies first, so every later Gmail step (P18–P22) can be undone and no mail can be lost. | Gabriel, 2026-10-26 |
| D-025 | 2026-10-26 | **P5 closed: the «CTC» teamspace has its ten hubs and the new task system.** Teamspace renamed «CTC»; hubs and fixed pages; Objetivos, Hitos, Tareas, Briefings and Triage with their views; Dependencies and Sub-items on; single-link limits; four automations, two templates (one repeats every Monday) and three buttons set by the owner and tested. Two changes from the runbook: the deadline views filter on a small «Plazo» formula, because Notion's view settings cannot filter on the end of a date range; and Make's access to the quotes database is inherited from its parent page, so the direct grant moves to P9, right before that database moves. | The task system is ready for P6 (meetings) and P7 (triage). | Gabriel, 2026-10-26 |
| D-026 | 2026-10-27 | **P18 closed: the LCP Buzón is read-only history in code (V6.13).** The owner approved the diff, retiring Buzón replies and forwards for good (domain mail is answered from Gmail's send-as) and the push; the mailbox credential stays out of Vercel. No code path can delete, move, flag or write mail at the domain mailbox any more; the sync opens read-only and refuses while frozen; a new guardian keeps it so. Verified live, and walked by the owner. | Gmail is the only place where mail is handled; the Buzón keeps the history up to 2026-07-16. | Gabriel, 2026-10-27 |
| D-027 | 2026-10-27 | **The Buzón's platform copy is removed once it has been reviewed (new part P23b, option 2).** After walking the Buzón the owner confirmed it is an archive of the house's correspondence, not a place to work mail, and dropped the three feature requests of the walk (tag picker, automatic tagging, archive and delete). Asked why it should stay once analysed, the owner chose to keep only the encrypted P17 archive (both tables and all 295 attachments, locally and in Drive after P17b) and remove the platform copy: the LCP screen and its code, the dormant webhook, the two tables and the stored attachments. | P23b runs after P23 and P24, with P17b's copy checked; P23's Notion links into the Buzón are rewritten first; the owner runs the drop and the file deletion. About 230 of the 306 messages then exist only in the archive. | Gabriel, 2026-10-27 |
| D-028 | 2026-10-27 | **The domain mailbox's history reaches Gmail by uploading the verified P17 copy, not through Gmail's import tool.** For this domain Gmail's «Importar correo y contactos» is a POP fetch that reaches the inbox folder only, over an unencrypted port, and its default server name does not exist; the old POP entry was already gone and the other fallback needs the mailbox credential back in Vercel, which the owner ruled out. The owner approved a local script that appends the copy over Gmail IMAP into the backup label with a temporary app-specific Google credential typed at a prompt. Nothing lands in the inbox, so the classifier is not paused and no archive step is needed; the domain mailbox is never contacted. | P19 steps 15–17 replaced; the app credential is deleted after the upload; the rotation of the domain mailbox credential (step 19) stays. Found on the way: forwarded bulk mail lands in Gmail Spam and 2–3 of 14 forwarded messages since 2026-10-22 never reached Gmail, so the monthly forward-gap check starts right after P19. | Gabriel, 2026-10-27 |
| D-029 | 2026-10-27 | **P19 closed and the inbox clean-up started early.** The domain mailbox's history is in Gmail (306 messages uploaded, Hostinger untouched by the recount), the mailbox credential is rotated and mail flows both ways. The owner then chose to run P21's review list (J6) before P20 and to archive the 140 conversations marked for the sweep at once instead of waiting for P22. | P21 J6 and P22's J6 sweep are recorded as done; J7–J8 and the rest of P22 still wait for P20, which waits for P11. | Gabriel, 2026-10-27 |
| D-030 | 2026-10-27 | **A counterparty may sit in more than one directory, with one Drive folder (P13 match list).** Some organisations are at once a supplier and an ally, or an ally and a client. Both Notion records stay. The organisation gets one Drive folder, filed under its main role; the other records reach it by relation, never by a second «Carpeta Drive» (D-007's one-folder rule, applied across databases). The Notion title clean-up never merges such a pair. In the same pass the owner placed the specialists-directory folder with the platforms, because it is the «Directorio del Café» module of the CTC Value Ecosystem, not a project. | P10 (titles and duplicates) keeps cross-directory pairs; P15–P16 file and link the folders by this rule; the first two cases (two coffee farms) have the supplier as their main role. | Gabriel, 2026-10-27 |
| D-031 | 2026-10-28 | **Every meeting is one row in Reuniones, cross-referenced to its subjects (P6 H8).** The owner asked that a meeting be visible on the page of what it concerns (an ally, supplier, customer, project or event) and still be a proper meeting with its own fields. Each meeting is one Reuniones row with the meeting fields, linked to its subjects; each subject's page shows its meetings in a linked list. Notes that live inside other pages stay there and get a Reuniones row that links to them. | H8 files the loose notes and creates the linking rows; the subject pages get their linked lists when each directory or database is rebuilt (P8, P10). | Gabriel, 2026-10-28 |
| D-032 | 2026-10-28 | **Two lanes, and a nearer finish line.** The SCAJ 2026 campaign becomes its own lane, run by «Secretaría CTC» sessions, beside the restructuring. Each object has one owner lane; while the campaign runs, the campaign databases' names, the Gmail label ids, the Make connections and the fair follow-up pause are frozen, and the main Google sign-in is not changed. A shared board outside the repo carries 24-hour notices of every restructuring batch that touches a shared surface and every campaign wave; a wave beats a batch. The campaign uses the shared task, meeting and directory system and keeps its status in Notion. «Restructuring done» is redefined as P6–P11, P14–P16, P20–P22, P17b, P36 and P37 (about 11 owner hours, target late November); the daily briefing (P12, P25–P33) becomes a later project with its own go-ahead; the archive review and the Drive deletions (P23, P23b, P34, P35) are optional and undated; P24 moves to the campaign's close. | PLAN «Two lanes and the finish line (D-032)»; part changes in P9, P10, P11, P14, P15, P20, P21, P22, P24 and P37. | Gabriel, 2026-10-28 |
| D-033 | 2026-10-29 | **Two P12 answers taken early, so the Drive track no longer waits for the briefing project.** D-032 moved P12 into the later briefing project, but P15 and P16 needed two of its answers. The owner took both recommended defaults: the EUDR certificate stays a link in Notion and nothing moves (SECRETARIA_PLAN §5.4); files uploaded straight into Notion («Adjunto» fields) stay in Notion for now (closes design item G.7-3 as «not now»). | P15 and P16 move no EUDR or «Adjunto» file and depend on P12 no more; P12's other decisions stay in the briefing project. | Gabriel, 2026-10-29 |
| D-034 | 2026-10-29 | **Faster finish: Notion first, a standing go-ahead, Drive in one push.** The owner wants the restructuring done sooner. (1) **Standing go-ahead:** after a part's dry run, Claude runs all its batches without asking per batch; it still stops for any change of someone's access, anything deleted or trashed, any email or message sent, and the owner-only steps in the apps; each batch keeps its backup, its check and its Bitácora line, and the owner gets one summary per part. (2) **Notion first:** the Notion track is pushed hardest; Gmail keeps waiting for it (the owner preferred this to splitting Gmail). P7's two sittings become one sitting on Sat 31 Oct, with the colleague if he can join, otherwise he reviews afterwards; P8's early steps run before P7 executes. (3) **Drive in one push:** one owner sitting on Sat 31 Oct approves the rest of P14 and all of P15; P15 runs from 1 to 3 Nov; the accountant was told by email the same day for a move on Mon 2 Nov. Campaign wave days and the board notices of D-032 still apply. | Approval stops drop from per batch to per part; indicative dates in the plan's status rows. | Gabriel, 2026-10-29 |

---

## 2 · Access check (2026-10-22)

| System | Reached as | Status |
|---|---|---|
| Gmail | `ctcexportmain@gmail.com` | ✅ labels, threads, search. **Cannot read Gmail settings** (forwarding, send-as, POP fetch, filters): the connector has no settings API. |
| Google Drive | `ctcexportmain@gmail.com` | ✅ search, metadata, content. |
| Google Calendar | `ctcexportmain@gmail.com` | ✅ (bonus, not in the brief's list). |
| Notion | «CTC Main's Space», user CTC Main | ✅ search, fetch, SQL over data sources. Search filters that need Business are dropped → the plan is below Business. |
| Supabase | project `ctc-platform` (`sjznkzvefqfcysczllli`, eu-central-1, PG 17.6) | ✅ ACTIVE_HEALTHY, SQL. |
| Vercel | team `colombiantradingcompanys-projects`, project `ctc-plataformas-web-v1` | ✅ project, domains, deployments, env names (values not decrypted). |
| Make | org 3400730, team 1569723 (eu2), user CTC Main | ✅ scenarios, executions, hooks, connections. |
| Hostinger | — | ❌ no connector (expected: Gabriel operates hPanel). |
| Google Contacts | — | ❌ no connector in Claude, no connection in Make. |

---

## 3 · Audit against the brief §3 (2026-10-22)

✅ = confirmed · ≠ = differs from the brief · ➕ = not in the brief

### 3.1 Email

- ✅ Forwarding works: a test to `info@` (12:15 UTC) and the marketing forwarding confirmation (12:03 UTC) both reached the hub today.
- ≠ **Send-as for the marketing address**: the confirmation mail arrived in the hub at 12:08 UTC; the connector can't tell whether the link was clicked. Gabriel checks *Settings → Accounts*.
- ≠ **POP3 fetch for `info@`**: not visible through the connector and no fetch-error mail found in Gmail. Gabriel checks / deletes it.
- ✅ Gmail INBOX: 791 threads, 430 unread (brief: 790/429; +1 today). `...OTROS` 225 threads (108 unread); `5.IT` 258 threads (182 unread); `5.IT/GAppScripts` 1,123 messages in 13 threads; `Recibos` 51 threads (41 unread); `[Notion]` empty; `2. …/FEDEX` empty.
- ➕ **~201 threads of BCP login codes** («Tu código de confirmación · CTC BCP», sent from `info@` to the hub). They sit in INBOX and the classifier labels them inconsistently (`5.IT` or `...OTROS`). Plus 7 SCAJ follow-ups with the hub in CC (labelled `4. VENTAS Y MARKETING`), some of them to the owner's own test registrations.
- ≠ **The Buzón is not fed by Resend Inbound.** Per `docs/INBOUND_EMAIL_SETUP.md` and the code, the live route is an **IMAP pull** from the `info@` mailbox (`src/lib/buzon/syncBuzon.ts`), run **by hand** from the «Sincronizar» button; the Resend Inbound webhook is built but dormant (its secret is not set in Vercel). All 306 rows were created in **one run on 2026-07-16** — the Buzón didn't "stop receiving"; nobody has synced since. While Hostinger keeps "save copies" on, the single forwarder does **not** block it.
- ➕ ⚠️ **Pressing «Sincronizar» deletes mail from Hostinger**: archived mail older than 30 days (`RETENTION_DAYS`) is removed from the mailbox (data stays in Supabase). Today Hostinger holds the only copy of 16 Jul → 22 Oct. **Nobody presses it until the Buzón's fate is decided.**
- ≠ The Buzón lives in the **LCP** (since V5.59), not the BCP.
- ✅ `inbound_emails` 306 rows, 302 unread, 1 Mar 2025 → 16 Jul 2026, 0 replied; `buzon_outbound` 0 rows.
- ➕ Other `@ctcexport.com` addresses seen anywhere (Buzón + Gmail): only `info@` and `gvg@` (one typo `infor@`). By design the platform also uses `desacoplado-<slug>@ctcexport.com` labels with no mailbox. The 2026-07-16 setup doc says a **catch-all `*@ctcexport.com → info@`** was configured; Gabriel confirms it's still on and lists real mailboxes in hPanel.

### 3.2 Platform (Supabase + Vercel)

- ✅ 146 base tables + 7 views, **all with RLS**.
- ➕ Volumes are small: 16 producer accounts (18 `producer_profiles`), 3 buyers, 11 `leads`, 11 `event_leads`, 7 `lead_replies`, 12 `fincas`, 17 `lots`, 6 `quotes` (all `borrador`), 7 `purchase_contracts`, 3 `panel_users`, 2 `partner_accounts`, 19 `platform_surfaces`, 6 `transcripts`, 436 `audit_log`. Notion's directories are larger (last counted 2026-09-12: 44 proveedores, 62 clientes, 88 partners, 123 contactos) → **Notion is already the bigger CRM**.
- ✅ `integration_events` 23 rows; `automations` 4 rows (3 Make scenarios + «RT-Scriptor · Tablero en Canva», `propuesta`). The registry's run/error/ops columns were never refreshed from Make (`sincronizado_at` empty).
- ➕ **Why «CTC · Eventos de la plataforma» never ran** — two causes:
  1. The events it routes (`cotizacion.emitida`, jornadas) never happened in production: all 6 quotes are drafts.
  2. Even so, the dispatcher can't reach Make: the 3 outbound events ever queued (2× `coffeed.redaccion.post_creado`, 1× `herramienta.cromatografia-suelo.analisis.generado`) are `fallido` with «Failed to parse URL»: **`MAKE_WEBHOOK_URL` in Vercel holds a 64-char token, not the hook URL**, and `MAKE_WEBHOOK_SECRET` is not set. The 20 other rows are inbound tests from Make (Aug → 27 Sep).
- ✅ Vercel: 21 custom domains = the brief's list; latest production deploy READY (V6.5, 2026-10-12).
- ➕ **Half of this project already has a home in the repo**: the component **Secretaría CTC** (`docs/componentes/secretaria.md`, `docs/SECRETARIA_PLAN.md`) on top of `docs/INTEGRACIONES_PLAN.md`. Doctrine: zones A (platform owns) / B (Notion owns) / C (mirror, not sync); every mirrored Notion DB carries `ctc_id` · `CTC` · `Enlace CTC`; only named handlers bring data back; matching is proposed by the agent and confirmed by the owner. Its phases F0–F3 were planned on 2026-09-12 and **never executed** (its log has only the initial scan). The brief doesn't mention it.

### 3.3 Make

- ✅ The three CTC scenarios and the three «Local Toys GV» ones (out of scope).
- ✅ «Gmail · Clasificar por dominio»: 2,880 runs, 0 errors, ~5,016 credits used so far. Labels, never archives.
- ➕ «Notion · Nota comercial → CTC»: 2,880 runs, 0 errors, ~2,880 credits — **polling every 15 min a Notion DB that has 0 rows** (no quote was ever emitted).
- ➕ Connections: Gmail, Google (Calendar), Notion, Canva, **ClickUp** (+ two ClickUp webhooks, one marked gone), OpenAI (unused). No Google Contacts.

### 3.4 Notion

- ≠ The workspace has **5 teamspaces** — 🧠 Knowhow, Admin, Ejecución, GTM, Operacion; the brief's "hubs" are pages inside them.
- ➕ The brief omits the **Operacion directories**, which are the CRM today: Directorio de Proveedores (formerly «Lista de Proveedores»), Lista de Fincas, Fichas Técnicas de Café, Directorio de Clientes, Directorio de Partners, Directorio de Contactos Personales, Compras e Inventario.
- ✅ «Arquitectura de CTC Main´s Space. Mapa general del espacio» exists (I+D / Referencias de Información / Onboarding Interno; last edited 30 Jun). «Email Secretary — …» exists (last edited 21 Sep).
- ➕ ⚠️ **Secrets in Notion**: credentials are stored in clear in several Notion pages. The inventory of *where* (never the values) was delivered to the owner on 2026-10-22 and is kept **outside this public repo** (D-004). If the `info@` password changes, `BUZON_IMAP_PASSWORD` in Vercel and the Gmail send-as for `info@` must change with it.

### 3.4b Notion — full map (2026-10-22, read-only agent; the detailed map stays local because it carries names)

- Teamspaces: **Ejecución** (Objetivos y Tareas · Reuniones Generales 41 · Proveedores 48 + Fincas 10 + Fichas 11 · Clientes 62 + Seguimiento de Ventas 9 · Partners 93 · Contactos 128) · **Operacion** (Compra, Inventario y Producción; Logística — small DBs, 1–8 rows) · **GTM** (Recursos de Contenido, Banco de Recursos AV, Ejecución de Redes, Narrative Threads, Cotizaciones CTC, Eventos, Catálogo) · **Admin** (Administración y Estratégia, Documentacion Adminstrativa, IT: Plataformas Web CTC 22, Banco de Herramientas 21) · **Knowhow** (I+D, Banco de Ideas 51). «Ecosistema de Valor»: teamspace unverified. 16 private pages, 14 of them meeting transcripts never filed.
- **One human member** («CTC Main») plus three bots: per-person assignment is impossible today.
- Most operational DBs were filled once (2026-06-19..26) and barely touched since.
- **Tasks live in four places** (Tareas, Reuniones, Banco de Ideas, Objetivos Principales) with three status vocabularies; Reuniones has no relation to Objetivos/Tareas.
- **Objetivos y Tareas** = one DB, three data sources: Tareas Administrativas 48 (43 open; 37 without due date; the 6 dated are all overdue; 7 assigned) · Objetivos Estratégicos 80 (79 open, 36 overdue, no owner property) · Objetivos Principales 14 (new 2026-10-21: the dated chain to the first sea shipment; no status, no owner, no relations).
- The Drive link is named **seven different ways** across DBs; six empty «New data source» placeholders; two duplicate relations; typos and mixed Spanish/English.
- The old workspace-map page (2026-06-30) is a pasted Notion-AI analysis; its master index was never built.

### 3.5 Drive

- ✅ The 13 root folders listed in the brief.
- ➕ Full map (2026-10-22, read-only agent; detailed map stays local): 266 folders; ≥1,378 files (the file crawl was capped, counts are minimums); ≥138 files over 50 MB (~126 GB); ~15 % Google-native. Biggest trees: CAPACITACIONES 46.8 GB · A 30 GB · B 15.8 GB · D 11 GB · Z 10 GB · E 8 GB.
- ➕ **Only real sharing**: the accounting subfolder inside C (six writer accounts; part of that subtree is owned by the accountant) and «Directorio de Clientes (AUX)» (two external commenters, though the folder is empty). No "anyone with the link" on the folders checked (~25 of 266).
- ➕ **AUX folders don't match Notion**: only Partners (AUX) has per-record folders (5); Proveedores (AUX) and Clientes (AUX) are **empty**, while Notion holds a Drive link on 39/48 suppliers and 55/62 clients. Supplier material actually lives in «???», in D/CTC Tech and in Z.
- ➕ The A–Z letters cover 7 of 13 root folders; 50 all-caps folder names; 36 empty folders; 68 duplicated titles; personal documents mixed in («Y. OTROS ARCHIVOS» and items shared with the hub).
- ➕ 20 of the 31 loose root files are one KYC pack for a customs agent (2026-06-23), never filed.
- ➕ **~31 loose files at the root**: company and registration documents (RUT, chamber certificate, financial statements, bank certificate, logistics-partner forms), a 69 MB video, spreadsheets, a photo.
- ≠ «Documentos recibidos entrando a Japon» is **not at the root**: it's inside a subfolder (created today 08:17).
- ≠ «[FE] Green Coffee Datasheet» is a **Google Sheet** (with its bound script); no standalone Apps Script project was found.

### 3.6 Calendar (not in the brief)

- ➕ 6 calendars: the main one, GVB (Bogotá), GVG (Berlin), Pico&Placa, German holidays and **«CTC · Operación»** — fed by the Make scenario that never ran, so empty of platform events.

---

## 4 · Owner actions surfaced by the audit (not decisions, just to-dos)

1. Rotate and remove the credentials stored in Notion (§3.4).
2. Don't press «Sincronizar» in LCP · Buzón until the Buzón is decided (§3.1).
3. ✅ **Done 2026-10-24.** In Gmail settings: the marketing address is listed under «Send mail as» (verified, no warning); «Check mail from other accounts» lists **nothing** — the old POP fetch for `info@` is already gone, so P36 has nothing to delete.
4. In hPanel: confirm the catch-all, list the real mailboxes and aliases, read the storage quota.
5. ✅ **Done 2026-10-23 (D-008). Pause the fair follow-ups** in LCP › Formularios: their «already replied» check (`yaRespondio`, `src/lib/leadForms/envios.ts`) reads only the Buzón, frozen since 2026-07-16, so a buyer who replied by email would still be chased. 3 follow-ups are due within two days (none of those three has written to the hub; replies sent to info@ before 22 Oct sit only at Hostinger and are unknown).
6. **(2026-10-23, confirmed by D-011 4.6) Close the "anyone with the link can edit" share** on the packaging-artwork folder in Drive (verified via permissions).
7. **(2026-10-23) Check the Google storage quota**: Drive alone holds ~166 GB of company files; if the account goes over quota, Gmail stops receiving.
8. **(2026-10-23) The accounting subfolder** can be edited by six accounts, one unidentified.
9. **(2026-10-23, D-013 5.4) Remove `BUZON_IMAP_PASSWORD` from Vercel** (Production and Preview), then Redeploy the current production deployment — the Vercel MCP has no delete for environment variables, so this is an owner click. Checked in code: without it, «Sincronizar» returns «Faltan las variables BUZON_IMAP_*» and deletes nothing, and the Buzón's reply path skips the IMAP copy to Sent instead of failing (`src/lib/buzon/{syncBuzon,mailClient}.ts`). The same line in the local `.env.local` should go too.
   **Status 2026-10-23:** ✅ the variable is gone from Vercel (verified via the env list); ✅ the local `.env.local` line is commented out (the file is git-ignored). ⚠️ The owner's redeploy **failed** — not because of the variable: the build could not fetch a Google font (`next/font` «Big Shoulders», the known flake in AGENTS.md; the same commit built fine on 2026-10-12). Production still runs the 2026-10-12 build, which **still carries the old value**, so «Sincronizar» must stay untouched until a redeploy succeeds. Pending: the owner clicks Redeploy once more (Claude's production-deploy permission is off by design).
   ✅ **Closed 2026-10-23:** the owner's second redeploy (same commit, V6.5) is **READY** and holds all 24 production aliases; `ctcexport.com` and `panel.ctcexport.com` answer HTTP 200 with the badge «V6.5 · build 7064650». Production no longer has `BUZON_IMAP_PASSWORD`, so «Sincronizar» can no longer delete mail at Hostinger.

---

## 5 · Question rounds

### Round 1 · Scope, priorities, success (asked 2026-10-22)

| # | Question | Recommended default | Answer |
|---|---|---|---|
| 1.1 | The 3 outcomes that define "done" in 3 months | (a) one inbox under control; (b) Notion as the live map of the system plus a read-only mirror of producers, fincas, lots, leads and buyers; (c) Drive linked to Notion, with deletions only via approved batches | **Changed** → D-001 (restructure → email clean-up → daily briefing) |
| 1.2 | Priority order | Email → System registry → CRM mirror → Drive | **Changed** → D-001 |
| 1.3 | Who works in the system, and with what access | Gabriel: everything. GVB: Notion editor, no hub mailbox. Accountant: only Drive «C. CONTABILIDAD». Partners: nothing new | ✅ default (D-005) |
| 1.4 | Budget ceilings | ≤ US$25/month of new spend; no plan upgrades without asking; programmatic rules before AI | ✅ default (D-005) |
| 1.5 | The Secretaría doctrine already in the repo | Adopt it as the baseline and fold the Secretaría component into this project | ✅ default (D-005) |
| 1.6 | Where working documents with personal data live (the repo is public) | Repo: decisions and architecture only. Lists with names, backlog reviews, deletion batches: Notion | ✅ default (D-005) |

Owner's notes with the answers: the platform stays the interface for the OCP (D-002); fragmentation is the core problem (D-001); «Objetivos y Tareas» gets a fresh start (D-003); credentials go to the Nord password manager (D-004).

### Round 2 · The shared structure + who holds each entity (asked and answered 2026-10-22)

**The proposal: one numbered map, «Mapa CTC», used everywhere.** Today each tool is cut along a different axis — Gmail by value chain (0–6), Notion by function (5 teamspaces), Drive by file lifecycle (A temp · D permanent · Z archive) — so nothing lines up. The proposal gives all of them the same ten slots, in the same order:

| # | Hub | Notion today → | Drive today → | Gmail today → | Platform |
|---|---|---|---|---|---|
| 0 | **Dirección** | Administración y Estratégia · Documentación Administrativa (Contabilidad, Personal, Políticas) | C. CONTABILIDAD · D/Administración y Estrategia · loose company documents at the root | `0. ADMIN Y ESTRATEGIA` (+ /FACTURAS) · `Recibos` | BCP |
| 1 | **Origen** | Lista de Fincas · Fichas Técnicas (mirrors of the OCP) | A/SCAJ/Recursos de Fincas · Z/[FE] Proveedores de Café | `1. ORIGEN Y SUMINISTRO` · `ALMACAFE` | **OCP holds the records** |
| 2 | **Operación y Logística** | Compra, Inventario y Producción · Logística | A/Proyecto Planta Empacado · ???/Empaques y Etiquetas · D/Plantillas/Logistics | `2. TRÁNSITO E IMPORTACIÓN` (+ DHL/FEDEX/CHAMPION) · `3. TOSTADORES E INVENTARIO` | OCP (stock) · ECP (quoters) |
| 3 | **Comercial** | Seguimiento de Ventas · Eventos · Catálogo · Cotizaciones CTC | ANÁLISIS DE MERCADO · quotes sent | `4. VENTAS Y MARKETING` (sales part) · Cotizaciones JIACUI · Coffee USA ofertas | LCP (leads, CRMs) |
| 4 | **Marca y Contenido** | Recursos de Contenido · Banco de Recursos AV · Ejecución de Redes · Narrative Threads | B. Banco Audiovisual | `4. VENTAS Y MARKETING` (marketing part) | Coffeed |
| 5 | **Plataformas e IT** | IT: Plataformas Web CTC · Banco de Herramientas (without secrets) · Ecosistema de Valor pages | D/CTC Platforms Optimization · Cromatografia · Finca Hub | `5.IT` (+ GAppScripts) | BCP/ECP configuration · Automatizaciones |
| 6 | **Conocimiento** | I+D · Conceptos Fundamentales · Capacitaciones · Banco de Ideas | D/I+D (Aux) · CAPACITACIONES CTCX · CURSO IA · D/Conceptos Fundamentales | `6.INVESTIGACION Y DESARROLLO` | Herramientas del Café |
| 7 | **Directorios** | Proveedores · Clientes · Partners · Contactos | D/*(AUX) → one folder per record | — (linked from Notion) | OCP producers ↔ Proveedores · LCP buyers/leads ↔ Clientes · BCP partner accounts ↔ Partners |
| 8 | **Ejecución** | Objetivos y Tareas · Reuniones Generales · the private meeting transcripts | A. Docs Temp (one folder per active objective) · E. Videollamadas | new: `8 · Ejecución/<active project>` | ECP · Tablero de Ejecución |
| 9 | **Archivo** | an Archivo page | Z. ARCHIVE · Y. OTROS ARCHIVOS | — (Gmail's own archive) | — |

Business lines (Cherry Picked, CaaS, Papagayo Beans, CTC Tech, Kaffetal Regal, Ecosistema de Valor) cut across the hubs, so they are a **tag** («Línea») on Notion records — not folders, not labels. Where CTC Tech's machine files land is left for Round 4.

| # | Question | Recommended default | Answer |
|---|---|---|---|
| 2.1 | The backbone | Adopt «Mapa CTC» (0–9 above) as the top level of Notion, Drive and Gmail, and as the platform's domain enum; business lines are a Notion tag | ✅ default (D-007) |
| 2.2 | The record rule | Every counterparty or project = one Notion page + (only if it has files) one Drive folder **with the same name** in the matching hub (`7 · Directorios/Proveedores/<name>`, `8 · Ejecución/Proyectos/<year> · <name>`). Notion links it in one property, «Carpeta Drive»; the Drive folder's description links back to Notion | ✅ default (D-007) |
| 2.3 | Gmail's place in the mirror | Labels = the hubs 0–6 + one label per **active** project under `8 · Ejecución/` (removed when it closes) + a few status labels (Round 5). No label per company or person: that link lives in Notion | ✅ default (D-007) |
| 2.4 | Notion teamspaces | One teamspace, «CTC», with the ten hubs as its top-level pages in order (plus private pages). Today there is one member; per-hub permissions can be added on pages later | ✅ default (D-007) |
| 2.5 | Who holds each entity | **Platform** holds what the OCP/LCP run (producers, fincas, lots, fichas, evaluations, samples, offers, contracts, stock, platform leads and buyer accounts, quotes, partner credentials); Notion mirrors it **one-way**, refreshed at least daily before the morning briefing; only named fields come back (today: the quote's «Nota comercial»). **Notion** holds organisations (a superset of the platform's), contacts, objectives, tasks, meetings, knowhow and the system registry. **Drive** holds files only; **Gmail** holds messages only | ✅ default (D-007) |
| 2.6 | Naming | Spanish only, no ALL-CAPS, no typos; hubs as `N · Nombre`; project folders `AAAA · Nombre`; one emoji per hub and none below; the same property names in every Notion DB (Nombre, Estado, Área, Línea, Responsable, Carpeta Drive, Última edición — automatic; plus `ctc_id` · `CTC` · `Enlace CTC` on mirrored records) | ✅ default (D-007) |

Risks to check in each dry run (not decisions): moving C. CONTABILIDAD must keep the accountant's share on its subfolder and the accountant-owned subfolders inside it · the Make Notion connection reaches «Cotizaciones CTC» through the page it was shared on — moving that DB can cut its access · the Email Secretary page writes to Tareas by property name — renames must be mirrored there · «Directorio de Clientes (AUX)» is shared with two external accounts although empty.
### Round 3 · Notion nesting and «Objetivos y Tareas» (asked and answered 2026-10-23)

Designed by a read-only workflow (4 readers · 3 designs · 2 judges · synthesis · 4 adversarial verifiers · 30 fixes applied, 8 rejected with reasons). The full design stays local (names and ids); this is its public summary.

**Status.** Four review lenses checked the design: completeness, decisions, feasibility and the briefing. Nothing has been executed, and Phase 0 stays read-only. The full design stays local because it carries names and ids.

**Order of execution.** Every step runs after Phase 0 closes, except one read-only dry run.
1. **Credentials leave Notion (D-004).** This happens before any structural write. The owner copies each value into the password manager, rotates the important ones and deletes the value in Notion. The agent clears two task titles and then verifies by location only.
2. **The execution core is rebuilt (D-003).** That means objectives, milestones, tasks, meetings and briefings.
3. **The rest of the restructure.** Directories, cross-teamspace moves, renames and the system registry.
4. **Three platform batches**, each one version behind the gate:
   - the continuous one-way mirror (Secretaría F1);
   - a read-only route that serves the platform's derived pending work;
   - the domain enum moving to the 0–9 map, together with R5.

Drive (R4) and Gmail (R5) follow. **The daily briefing starts only in R6.** Until then the daily surface is a page of plain Notion views.

**Structure.**
- One teamspace, «CTC» (the current execution teamspace, renamed).
- The ten hubs 0–9 are its only top-level pages; every fixed sub-page sits under its hub.
- The four other teamspaces are archived once they are empty.
- Objects are moved, never duplicated, because ids, relations, views and templates survive only a move.
- Every machine-written database ends with a single data source.
- Splits are tried first on a five-row database that nothing reads.

**Task model.**
- Objetivos → Hitos → Tareas.
- One status vocabulary in three fixed groups (Por hacer · En curso · Esperando respuesta · Hecha · Descartada). Machines read the group, not the option.
- Every open task has a due date and exactly one Responsable. Responsable is a select, because the workspace has one member.
- Something without a date is an idea. An overdue task is never silent.
- A milestone is «late» when its end has passed. It is «at risk» only when an open blocker overlaps it or is late itself.

**Platform pending work is not copied into Notion (D-002).** The platform keeps it and keeps its ticking. A Notion task is created only for follow-up outside the platform, and it carries one platform key.

**The fresh start.**
- The old task and objective database is archived as it is.
- A triage table proposes an outcome for every open line: move, idea, already done, or leave. A line left untouched keeps its proposal. «Leave» always needs a stated reason.
- The triage reads unchecked to-dos in every meeting note, wherever the note lives.
- The live milestone chain moves as milestones. Each row is re-read just before it moves, and the owner sets its state and owner in one pass.
- The work is done in two short sittings.

**Meetings.**
- One meetings database.
- Notes are filed there natively if the plan allows it, without an upgrade. Otherwise a sweep that runs as the workspace user files them.
- To-dos found in notes become proposed tasks. The owner of each one comes from the item text, never from the time zone.

**Property standard.**
- One vocabulary: Nombre, Estado, Área 0–8, Línea, Responsable, Carpeta Drive, «Archivo principal» for URLs, «Adjunto» for uploads, automatic timestamps and a prefixed code.
- A rename is only a rename. A type change is new column → copy → hide, and hidden columns are kept.
- Status options are never redefined in place.
- Sensitive columns are only ever renamed. They are never copied, snapshotted, mirrored, exported or briefed, and every machine reader uses a field whitelist.

**Mirror.**
- One-way and at least daily, but only once F1 ships. Until then, mirrored databases carry only the key, the console and the link.
- The console select gains the lead console. A buyer account and a lead are told apart.
- Match proposals are recomputed from current rows, and the owner confirms each one.

**Grades.** The code is the source: the grade is a band of points (the SCA score × the Tríada). The SCA bands still published in Notion are obsolete. They get corrected from the code, and the discrepancy is recorded instead of harmonised silently.

**System registry.**
- One database in hub 5 records every element and where each credential lives, never its value.
- Who owns a row is stated by its console field: the platform owns what it types, and Notion owns the rest.
- The seed is about 130 rows.
- Weekly read-only guards check:
  - drift against code and config;
  - 19 machine-read data sources whose names are frozen;
  - grade drift against the code;
  - new secret hits, reported by location only.

**Backups.** The workspace export is taken after the credential clean-up, kept encrypted, and deleted on a schedule. Per-step snapshots hold schema, ids and converted non-sensitive values only.

**Deletion (proposed amendment).** Only objects counted empty just before, in one owner-approved batch, recoverable for 30 days. Everything with content is archived.

**Lines to log with the answers.**
- The deletion amendment.
- Who deletes credential values, and that D-004 overrides the Secretaría rule for this one-time clean-up.
- The lead console in the mirror select.
- The per-row ownership of the registry.
- The order note (the briefing starts in R6).
- The grade discrepancy.

**Round 3 asks six questions:**
1. the fresh-start rule;
2. guest access for the Colombia-based editor;
3. «today» = the Colombia date;
4. where meeting notes go;
5. emptying empty objects;
6. who deletes credential values.

| # | Question | Recommended default | Answer |
|---|---|---|---|
| 3.1 | How do the old tasks, objectives and open meeting points carry over? | Start clean: the old database is archived as it is. Claude pre-marks every open line (move · idea · already done · leave, with a date and an owner); the owner and GVB change only the lines they disagree with — an untouched line keeps its mark. Two sittings (~30 min tasks and meeting points, ~15 min objectives). | ✅ default (D-009) |
| 3.2 | How does GVB get into Notion? | As a free guest with a personal login, able to edit the ten hubs; invited only after the credentials are out of Notion. No paid seat. | ✅ default (D-009) |
| 3.3 | Which calendar day counts as «today» for due dates? | Colombia's date (Bogotá); times shown in Bogotá time with Berlin time beside them. Briefing times are settled in R6. | ✅ default (D-009) |
| 3.4 | Where do meeting notes go? | «Reuniones» becomes the default meetings database in Notion and Notion Calendar — only if the plan allows it, no upgrade; the existing notes with a title or content are filed there. | ✅ default (D-009) |
| 3.5 | May completely empty objects go to Notion's trash, in one approved batch? | Yes, but only what a count shows empty right before (≈12 empty pages, ≈13 empty tables, one empty database, empty columns, 4 untitled empty meeting notes); recoverable 30 days. Anything with content is archived in «9 · Archivo», never deleted. | ✅ default (D-009) |
| 3.6 | Once a credential is in NordPass, who deletes it from Notion? | The owner, on the same screen, right after copying it, from a checklist with direct links. Claude clears the two task titles and then verifies by location only. | ✅ default (D-009) |

### Round 4 · Drive (designed, asked and answered 2026-10-23)

Designed by a read-only workflow (3 readers · 3 designs · 2 judges · synthesis · 3 adversarial verifiers · 31 fixes applied, 4 rejected). The full design stays local.

Designed by a read-only workflow: 3 readers, 3 designs, 2 judges, a synthesis, then 3 adversarial verifiers. Both blockers, every major issue and the cheap minor ones were applied. The full design stays local because it carries names and ids. Phase 0 stays read-only.

**What was found**
- The Drive holds **2,024 company-owned files (166 GB)**, more than the first map counted.
- 195 files of 50 MB or more make up 95 % of the space.
- Six root folders and 31 loose root files have no clear home.
- **421 of 483 Drive links stored in Notion are dead.** The old per-record folders no longer exist for the hub account. The only trace is three archive ZIPs, which are protected.
- Only 2 of 203 directory records follow the record rule today.
- One packaging-artwork folder can be edited by anyone with its link.
- Six accounts can edit the accounting folder, one of them unidentified.

**Tree**
- The root holds exactly the ten hubs «0 · Dirección» … «9 · Archivo».
- Three current root folders are renamed in place, keeping their ids; seven hubs are new.
- Whole folders are moved, never copied, so every link built on an id keeps working.
- Level-2 names copy the Notion page or database they mirror.
- Hub folders carry no emoji; the Notion page icon does.
- Accounting moves whole under hub 0, and nothing inside it is renamed.
- Personal files are parked in hub 9 until they are transferred out.
- Empty folders are parked in «9 · Archivo/Por clasificar/Carpetas vacías».

**Record rule (D-007, made testable)**
- One Notion page per record, and a same-named Drive folder only when files exist, in the section that mirrors its database.
- One owner per folder; other records reach it by relation.
- The two-way link: «Carpeta Drive» in Notion, and one line `Notion: <page URL>` in the folder description.
- A folder without a record is listed for the owner. The default is to create a title-only page.
- Dead links are saved to a log page first, then the new links are set, then the dead values are cleared.
- In the directories, linked records go from 2 to about 15–28; the rest correctly have no folder.

**Deletion (Round 4)**
- Only **exact byte copies proven by checksum**, whose kept copy sits in a folder only the company can edit.
- No Google-native pairs and no folders.
- Lotes of 50 files and 20 GB or less. Only the owner approves, in the session.
- Execution comes at least 24 h after approval, after a fresh checksum run.
- Drive's 30-day trash is the waiting period, with a day-21 check.
- **No lote runs before the daily briefing (R6) is live.**
- Protected, always: accounting, other accounts' items, archive ZIPs, templates, personal files, anything ever shared with a counterparty, and delivered packages.
- About 15 GB is in view.

**Metadata the Drive connector cannot see**
- The connector cannot see checksums, trash state, permissions in bulk, descriptions or shortcut targets.
- They come from a **read-only Apps Script the owner runs**: once before the work starts, once after it, and before each lote.
- It is bound to a private Sheet, has two scopes, costs $0 and has no trigger.

**Sharing**
- Hubs and level-2 folders are never shared; sharing lives only on record folders and the accounting folder.
- Any move into or out of a shared folder needs the owner's OK, and every access change is listed before it happens.
- No "anyone with the link" except registered, time-boxed cases.

**Order**
1. The owner's checks: storage, a link test of about 17 clicks, the accounting accounts, the open link, AppSheet and Apps Script triggers, and the first script run.
2. A dry run with 0 writes.
3. Hubs.
4. Root moves.
5. Level-2 and level-3 moves.
6. Loose files.
7. Renames.
8. Accounting, alone.
9. Descriptions and Notion links.
10. An after-snapshot diff and five checks.

That is about 320 Drive writes and about 520 Notion writes, all in batches of 50 or fewer, before any deletion. Deletion lotes follow only after R6.

**Round 4 asks six questions:**
1. where the machine-business files go;
2. footage linked from its shoot folder (an amendment to D-007);
3. who keeps access to accounting, and the move;
4. personal files;
5. what may be deleted and how;
6. closing the open-link packaging folder.

**Lines to log with the answers:**
- the footage amendment, if accepted;
- Round 4 deletes only checksum-proven copies;
- empty folders are parked, not deleted;
- no deletion before R6;
- `SECRETARIA_PLAN.md`'s claim about the directory links gets corrected in Phase 1.

| # | Question | Recommended default | Answer |
|---|---|---|---|
| 4.1 | Where do the machine-business files go (supplier material, quotes sent, a machine project, small equipment)? | Each supplier's material goes to its folder in «7 · Directorios»; quotes sent to «3 · Comercial/Cotizaciones enviadas»; a machine project to «8 · Ejecución/Proyectos»; small-equipment manuals to «2 · Operación y Logística/Equipos». | ✅ default (D-011) |
| 4.2 | Can each visit or event video shoot stay in the footage bank, linked from its Notion page, instead of getting its own folder? (amends D-007) | Yes: shoots stay in «4 · Marca y Contenido/Repositorio de contenido crudo», renamed «AAAA-MM · Tema»; «Carpeta Drive» points to the shoot; a record folder only when there are non-video files. | ✅ default (D-011) |
| 4.3 | Who keeps access to the accounting folder when it moves? | Only the accounting team. Before anything moves, the owner removes every other account (the unidentified one included); the folder then moves whole under «0 · Dirección» as «Contabilidad», nothing inside renamed, access checked before and after. | ✅ default (D-011) |
| 4.4 | What happens to personal files in the company Drive (~7.6 GB)? | Parked in a private folder in «9 · Archivo», never deleted; the owner pulls out company documents, settles the Colombia colleague's 3 items with them, then transfers the rest to a personal account. | ✅ default (D-011) |
| 4.5 | What may ever be deleted from Drive, and how? | Only exact copies proven by checksum (a free read-only script the owner runs), whose kept copy sits in a company-only folder; lotes ≤ 50 files approved in session; only after the daily briefing is live; Drive's 30-day trash as the waiting period; empty folders parked, not deleted. | ✅ default (D-011) |
| 4.6 | A packaging-artwork folder is editable by anyone with its link. Close that? | Yes, now: turn off "anyone with the link" in the Drive web page; the printers and the studio keep their named access. | ✅ default (D-011) |

### Round 5 · Gmail labels, clean-up and triage (designed, asked and answered 2026-10-23)

Designed by a read-only workflow (3 readers · 3 designs · 2 judges · synthesis · 3 adversarial verifiers · 37 fixes applied, 6 rejected). The full design stays local.

**Status.** The design is complete and nothing has been executed. Phase 0 is read-only, and every write in Phase 1 is a batch the owner approves first. Concrete filter lines that name counterparties, and all conversation lists, are kept outside this repository.

#### Label model
- **Hubs.** Seven hub labels (0–6) mirror the top-level map used in Notion, Drive and the platform. Each active project gets one label under hub 8, removed when the project closes.
- **Statuses.** There are seven flat status labels, confirmed as the map's «few status labels»:
  - two the owner sets: reply owed, waiting for them;
  - one the classifier sets when unsure: review;
  - four the rules set: alert, code, automatic, accounting.
- **What is not allowed.** There are no per-company or per-person labels; that link lives in Notion. There are no sub-folders under hubs.
- **Naming.** Spanish only, no emoji, «N · Nombre», byte-exact names (NFC, middle dot).
- **Names and IDs.** Automations and API writes use label IDs. Searches and briefings use exact names, and a name↔ID table lives in the Notion registry. Every rename batch updates the briefing's queries.
- **Renames.** Labels are renamed in place, which keeps their IDs, and never deleted and recreated. Child labels are retired or moved to top level before parents are renamed, so no parent is ever created implicitly.

#### Rules before AI
- **Free server-side filters run first** (about 20 of them, written as one import file kept outside the repo and changed through delta files).
- **Gmail behaviours the rules are built around:**
  - one label per filter, so a rule that needs two labels is two twin filters;
  - «skip inbox» wins whenever any matching filter has it;
  - search does not stem, so every inflected word form is written out;
  - `to:` also matches Cc;
  - label, `in:` and `is:` operators are never used in filter criteria;
  - each criteria string is kept below about 900 characters.
- **Archiving filters name sender addresses, not whole platform domains**, and every one excludes code, alert, expiry, renewal, payment-problem and invoice words. They fail safe: in doubt, mail stays in the inbox.
- **Alerts are sender-based** where a service has a dedicated alert sender.
- **Bank notifications all share one subject**, so they are split on body words into three cases: approval or security, codes, and movements.
- **Platform copies are recognised by the platform's fixed template subjects**, never by sender alone. Each template carries a code comment naming the filter that depends on it.

#### Classifier
- **One classifier,** the existing automation, updated in place.
- **What it labels:**
  - It labels only what the rules left, with exactly one hub or «review».
  - It skips messages that carry an explicit list of hub and status label IDs.
  - It skips conversations that already have a hub.
- **How it runs:**
  - It uses the cheapest suitable model and runs hourly.
  - It sends a message excerpt only when the message shows no code, invoice or bank signal.
  - Errors fall back to «review».
- **What it never does:** archive, mark read or set owner statuses.
- **Cost.** About US$0 of new spend, and automation credits fall by about 80%.

#### Inbox policy
- Only machine mail leaves the inbox automatically. Anything a person wrote stays, and so does every alert, account or renewal notice, invitation and registration.
- Codes leave after one day. That is the only standing automatic write, and it applies only to conversations made entirely of code mail.
- Statuses («you owe», «they replied», «still no answer») are computed per conversation, because Gmail labels are per message.

#### Backlog
- **Copies first:**
  - a read-only export of the legacy inbound-mail table, which holds the only copy of some history;
  - a read-only backup of the domain mailbox;
  - a Gmail snapshot that includes the existing filters.
- **Protection and sweep:**
  - A protected list of conversations (recent, starred, owed, mixed, and those the owner flags on a one-time review list) is repaired from that list after every bulk step.
  - The sweep runs on an explicit conversation list, keeps unread state, is labelled, and can be undone.
- **The legacy inbound-mail importer becomes read-only history:**
  - its mailbox credential is removed from the hosting environment today, which disables every path that writes to the mailbox;
  - its deletion code and remote archive/delete actions are removed in a small early release.
- **The domain mailbox's unforwarded window** is backed up read-only, imported once into Gmail with the source left untouched, and verified by recount. Then the mailbox password is rotated.
- **Automatic trade-fair follow-ups are paused,** because their «already replied» check depended on the frozen importer. They resume only once replies can be checked again; the house copy then moves to Bcc and is counted each evening.

#### Notion and briefing
- **Notion stores a link and the obligation, never the message text.** Every Notion write is a batch the owner approves.
- **Counterparty search links** use the organisation's domain only when it is not a public mail provider; otherwise they use the contact's addresses.
- **The daily briefing:**
  - reads metadata only;
  - covers everything since its last run;
  - watches forward health and the spam folder;
  - proposes rule additions every Friday.

#### Platform change shipped with the taxonomy
The domain enum change is a **split, not a rename**. Commercial events and content events move to different hubs. The full list of code literals, the route check, the guardian script and the automations' domain strings ship together in one batch.

| # | Question | Recommended default | Answer |
|---|---|---|---|
| 5.1 | What should leave the inbox by itself? | Only machine mail: platform copies, routine service notices, newsletters and promotions, known invoices and bank movements (archived but left unread as the accounting tray), bulk institutional invitations (archived unread, listed each morning). Login codes leave after one day. Anything a person wrote, every alert, account, expiry or renewal notice stays. | ✅ default (D-013) |
| 5.2 | Which labels besides the seven hubs? | Seven status labels: Responder and Esperando (set by the owner), Revisar (classifier, when unsure), Alerta, Código, Automático, Contabilidad (set by rules). No per-company labels, no sub-folders. | ✅ default (D-013) |
| 5.3 | How is the old inbox cleared? | Keep everything active since 22 Sep, starred threads, and whatever the owner flags on a one-time list of ~125 older conversations from people and institutions; archive the other ~200 under «Barrido 2026-10», unread state kept, nothing deleted. | ✅ default (D-013) |
| 5.4 | The info@ mail stuck at Hostinger, and the Buzón? | Remove the Buzón's mailbox password from Vercel now (disables the sync that deletes); then a read-only backup, one import into Gmail, and a new info@ password. The Buzón stays as read-only history. | ✅ default (D-013) |
| 5.5 | The automatic follow-ups to fair contacts? | Switch them off now in LCP › Formularios; they return only when replies can be checked again (their check reads the frozen Buzón). The house copy then goes Bcc. | ✅ default (D-013); pause done early (D-008) |
| 5.6 | Where does the classifier live? | The existing Make scenario, updated: hourly, cheapest model, labels only what the rules left, «Revisar» when unsure. ~1,500 credits/month, no new spend. | ✅ default (D-013) |

### Round 6 · The daily briefing and the engineering choices (designed, asked and answered 2026-10-23)

Designed by a read-only workflow (3 readers · 3 designs · 2 judges · synthesis · 3 adversarial verifiers · 33 fixes applied, 6 rejected). The full design stays local.

A read-only workflow produced this design: 3 readers, 3 competing designs, 2 judges, a synthesis and 3 adversarial verifiers. Every major finding was applied or replaced by a stated variant. The full design stays local, and nothing was executed.

**Engine**
- A scheduled cloud AI task on the existing plan, with the cheapest model and metered usage switched off.
- **It reads** the task database, mail, calendar and files through connections already approved, plus one locked, read-only door into the platform.
- **It works by fixed rules.** The AI only runs a fixed list of searches. Scripts take every count and list from the raw results, rank «what comes first» and build the page.
- **Writes are guarded.** A guard file and hooks allow a write only to the run's own pages, at an approved location, with exactly the content the scripts produced.
- **Run order:** the owner's opening, the Colombia colleague's opening, and one closing each working day.
  - Dates follow Colombia, with Berlin times beside them.
  - Schedules are fixed in UTC.
  - A second firing repairs a missed opening, and a missed closing is recovered the next morning.

**What it reads**
- Mail is read as metadata only: subjects appear only for conversations the owner has already flagged, with no snippets or bodies.
- File searches run without content snippets.
- Directory lookups read a name and an address only.
- The platform's answer contains no personal addresses.

**Delivery**
- One page per run; the colleague is @-mentioned on that page.
- The owner gets one short morning notice from a dedicated no-reply company address, with counts and links only. Mail detail goes on a private page.
- Other emails come only from three fixed alarms.
- A notice reference code lets look-alike messages be reported as possible spoofing.

**Reliability**
- Each source has a canary check, and paging is checked for completeness, so a failure is never shown as zero.
- A platform run log records each run's start and end.
- A platform watchdog runs every 30 minutes, and an independent watchdog runs in the automation tool.
- Failures are named on the page. They raise an alarm when a run is missing or when a source fails twice in a row.

**Proposals**
- The briefing proposes; it never acts on its own proposals.
- A deterministic executor acts only on ticks made by people outside every run window.

**Plumbing**
- **Platform repo:** most of the plumbing lives there (versioned, guarded, US$0).
- **Automation tool:** keeps the mail classifier, the nightly clean-up, the spam count, the calendar writes and the independent watchdog.
- **Google:** the platform never signs in to it.
- **Notion:** the integration is connected only to the specific mirrored databases, with a property whitelist.
- **Error records:** stored errors are codes, never free text.
- **Fair follow-ups:** an hourly automatic «already replied» check before any follow-up is proposed (question 6.6).

**Rollout**
- Phase 1 opens with a small hardening batch for the existing integration dispatcher (details logged after an owner step), then cron health monitoring.
- The briefing goes live after a supervised pilot week with written exit criteria.
- Going live unlocks the Drive deletion lots. Standing automatic writes are then added one per week.

**Cost:** expected new spend is US$0 a month.

| # | Question | Recommended default | Answer |
|---|---|---|---|
| 6.1 | Who makes the daily briefing? | A scheduled Claude task in the cloud, on the current plan, cheapest model, usage credits off. It reads Notion, Gmail, Calendar and Drive through the already-approved connectors plus one locked read-only route into the platform. Fixed scripts compute every number and list and build the page; the AI only runs a fixed list of searches, sorts unclear meetings and words the proposals. A guard blocks every write except its own pages. | ✅ default (D-014) |
| 6.2 | When does it run, and how does it reach us? | Monday–Friday: the owner's opening at 07:37 Berlin, the Colombia colleague's at 06:47 Bogotá, the closing at 18:37 Bogotá. Every run is a Notion page (the colleague is @-mentioned on theirs). The owner gets one short morning email from a no-reply company address (counts and links only); mail details sit on a private page; any other email comes only from three fixed alarms (run missing, page missing, a source unread twice). | ✅ default (D-014) |
| 6.3 | What may it change by itself, and when is it «live»? | «Live» after a supervised week that passes written checks; during that week it writes only its own pages and proposal rows. Then one standing write per week: (1) Make archives code-only mail and old briefing emails, and ticked proposals are carried out; (2) meeting notes filed into Reuniones; (3) today's external meetings added to Reuniones. It never sends, deletes or relabels anything else. Going live also unlocks the Drive deletion lotes. | ✅ default (D-014) |
| 6.4 | Where does the plumbing live? | In the platform's code, with one run log: the Notion mirror as one daily job (its Notion key connected only to the mirrored databases), the registry refresh, the health checks, the domain-enum change. Make keeps the Gmail classifier, the nightly clean-up, the spam count, the follow-up reply check, the calendar writes, the quote note and an independent alarm. Nothing in the platform signs in to Google. | ✅ default (D-014) |
| 6.5 | An integration secret is stored and shown in full (3 error rows on the ECP Automatizaciones board, from the misfiled `MAKE_WEBHOOK_URL`). Act now? | Yes, today, as a Phase-0 exception: the owner identifies which secret it is, clears the wrong `MAKE_WEBHOOK_URL` value in Vercel and redeploys, then rotates that secret wherever it is used (NordPass keeps the new one). After the owner's OK, Claude blanks the 3 stored copies. The code fix (store error codes, never free text) ships first in Phase 1. | ✅ default (D-014) |
| 6.6 | How does the platform know a fair contact already replied before a follow-up? | Every hour Make checks Gmail by sender only for the contacts due in the next two hours and tells the platform; a follow-up goes out only if that check ran in the last two hours and found no reply. Follow-ups restart only on the owner's separate go, after 5 days in which the checks match the owner's. | ✅ default (D-014) |


---

## 6 · Entity matrix

The final matrix (who holds each kind of record, where it is mirrored, in which direction and how often) lives in [`PLAN_UNIFICACION.md` › Entity matrix](PLAN_UNIFICACION.md#entity-matrix); it follows D-002, D-007 (2.5), D-009, D-010, D-012, D-013 and D-014.

## 7 · Open risks

| Risk | Where | Note |
|---|---|---|
| Hostinger holds the only copy of `info@` mail 16 Jul → 22 Oct | Hostinger | A Buzón sync would move it to Supabase and delete the old part from Hostinger; the mailbox quota is unknown. |
| Secrets in Notion | Notion | The system registry must record *where* a credential lives, never the value. |
| Two classifiers could fight | Make + any new one | Any new taxonomy replaces or updates scenario 9622256. |
| Credits burned on an empty poll | Make 9621737 | ~96 credits/day for nothing until quotes are emitted. |
| **416 of 451 Drive links in Notion are dead** (found 2026-10-22 by the Drive-links reader) | Notion directories, Objetivos, Eventos, Fichas, Banco de Recursos AV | The links were made automatically per record (folder + template copy); those targets no longer exist for ctcexportmain. The only trace is three ZIP exports of the old AppSheet tree in «Z. ARCHIVE / AppSheet (Business)» (5.1 GB, 2026-07-03). Until proven otherwise they may be the **only copy** of ~170 directory sheets: they are excluded from every deletion batch, and the record rule is rebuilt (clear dead links, create folders only where files exist) rather than repaired. |
| The Gmail labels 0–6 are also a code enum | `src/lib/integraciones/dominios.ts` + Postgres enum `integration_domain` (`automations.dominio`, `integration_events.dominio`) + `AutomatizacionesBoard.tsx`, `api/integraciones/[canal]` and `qa-integraciones-check.mjs` | A new shared taxonomy means one migration + one code file + the Make classifier prompt, shipped together. Small, but it is a platform batch with the version gate. |
