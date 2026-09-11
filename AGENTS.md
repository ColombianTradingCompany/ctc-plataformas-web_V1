<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Start here

**This repo is worked ONE COMPONENT PER SESSION** (owner's decision, 2026-09-11 — `docs/REFURBISH_PLAN.md`). Before touching anything, read in this order:

1. **`docs/componentes/<clave>.md`** — the charter of the component you were assigned (what it is, its routes, code map, tables, guardians, house rules, what the consoles govern of it, open items). If the kick-off prompt didn't name a component, ask.
2. **`docs/ALINEACION.md`** — the cross-cutting contracts nobody changes alone (grades, subdomains, identity, the Supabase pattern, vocabulary, versioning gate, AI ledger, i18n, SEO), the **backstage rule** for the consoles, and the **permeation log** — read its §3 from the last date you know, and write a line there when your change reaches another component.
3. **`docs/HANDOFF.md`** — the transversal architecture (stack, directory map, database + guard triggers, dev workflow, gotchas). Its dated chronology lives in `docs/archive/HANDOFF_cronologia_2026-07_09.md` — the *why* behind every decision, mined by the charters.

Work happens from `C:\dev\ctc-platforms\ctc-platform` (its Claude memory key is `C--dev-ctc-platforms`); CommaaS is a separate repo at `C:\dev\commaas-hub\commaas` with its own memory. The old OneDrive folder is decommissioned.

# Current snapshot (V5.30, 2026-09-11)

One Next.js **16.3** repo serving **19 subdomains** of `ctcexport.com` (`src/lib/red/subdominios.ts`), routed by `src/proxy.ts` (this Next renamed `middleware.ts` → `proxy.ts`; the comparison is by **segment boundary**, not `startsWith`). Supabase (Postgres 17 + Auth + Storage, project `sjznkzvefqfcysczllli`, ~100 tables), deployed on Vercel on every push to `main`.

The surfaces, by class: **public platforms with login** — CTC Home (`/`), Kaffetal Regal (producer: 5-interface panel, Ficha Técnica, evaluación, ofertas), the Cherry Picked family (hub + Green store with Tyrian auctions + Roast/X scaffolds + CaaS), Directorio del Café, Terratalento, Herramientas del Café (taller with saved works); **capture-only (Class B, no login, deposit into `leads`)** — CTC Tech, Varietales; **broadcast** — Coffeed (wall + Redacción); **partner nodes** — 5 `socios/*` couples (landing + credential login), one of which is the Estudio de Contenido's app workshop; **internal** — one master login (password + OTP) opening three parallel consoles, **BCP** (Business: dirección, configuración, socios, PVC), **OCP** (Operation: the lot passport from producer to catalogue — EVA, Q-Grader verdict, ofertas, subastas, fichas, transcripciones) and **ECP** (Execution: plataformas, contacto, herramientas, Coffeed). Standalone internal apps (La Biblia del Café, the PVC model) live beside the repo in `C:\dev\ctc-platforms\apps-internas/`.

Security model = RLS + `BEFORE UPDATE` guard triggers (service-role bypasses by design) + per-console write gates; most tables are service-role-only (RLS on, zero policies) **on purpose**. V4.0 (2026-08-13) was the audited baseline; V5.0 (2026-08-19) the «Pre-Launch Beta» milestone; V5.16–V5.24 (2026-08-21/22) rebuilt the producer panel and the lot's commercial circuit (the grade is derived from the Q-Grader's score, the contract is born from the producer's acceptance of an offer, the Arena is the showcase). `npm audit` is at **0 vulnerabilities**; keep it there.

Operational caveats to know before touching email/consoles:
- **Transactional email** (leads + master-login OTP) sends via Resend from `EMAIL_FROM` (`info@ctcexport.com`, domain verified). Never point `EMAIL_FROM` at an unverified domain — it breaks *all* sends including the login OTP. Every sender persists its result on the row; **none may swallow a failure silently**.
- **The consoles can't be driven in an automated browser** (real 2FA, emailed OTP). Verify console changes via `tsc`/`eslint`/guardians + SQL, and drive the producer/buyer-facing side that exercises the same code.
- **A `throw` in a Server Action bound to `<form action>` crashes the whole page** (and prod redacts the message). Reachable business rejections must `return {ok:false,error}`.

Docs: the versioned interactive system map lives in `docs/architecture/` (managed by the `architecture-doc-versioning` skill — log changes to the current `Log_Documentacion_Interactiva_V*.txt`, don't hand-edit the HTML; wrap on request). `CHANGELOG.md` is the standard per-version record.

# Working rules (learned the hard way — don't rediscover them)

- **Stay inside your component.** Code of another component is touched only with the owner told and a line in `ALINEACION.md` §3; a change born in a console that reaches a surface is executed there in the same batch or left as a pending item **with an owner** in that surface's charter (the backstage rule, `ALINEACION.md` §2).
- **The gate before calling anything done**: `npx tsc --noEmit` clean, `npx eslint src` at or below its current warning baseline (8, all deliberate `<img>`), `npm run build` exit 0, and **every `scripts/qa-*.mjs` guardian the batch touches** (48 of them; some need `node --experimental-strip-types --import ./scripts/ts-resolve.mjs`). Note `npm run build` can flake on a `next/font` Google fetch (`/lab`) — re-run before blaming your change.
- **Commits stage explicit paths, never `git add -A`.** Another session may be working in the same tree.
- **Bump `APP_VERSION` (`src/lib/version.ts`) in the same commit that deploys a batch of work, with its `CHANGELOG.md` entry** (categorised bullets; seal the sha right after committing) — `scripts/qa-changelog-check.mjs` fails otherwise — **and its asiento in the current `docs/architecture/Log_Documentacion_Interactiva_V*.txt`** — `scripts/qa-arqlog-check.mjs` fails otherwise. Take the version number at push time (`git pull` → bump → push at once; a rejected push means re-number). Then **verify live** (`curl -L` the badge `V5.NN · build <sha>`). Docs-only commits don't bump.
- **Wraps of the interactive map are called only from the «Wraps del mapa» conversation of the CTC Consolas internas group** (the plataforma lane), never from a component session — `docs/ALINEACION.md` §5.
- **Keep `npm audit` at 0.**
- **If you keep something that looks dead, write why in the file itself**, not only in a log — the next sweep greps.
- **Update the charter's «Pendientes» when you finish a batch.** The charter is the component's living status; memory is not.
