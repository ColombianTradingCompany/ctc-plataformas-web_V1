<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Start here

Read `docs/HANDOFF.md` before doing anything else in this repo — it's the living architecture/status doc (directory map, Supabase schema + RLS/guard model, per-platform feature status, dev workflow, and a running list of gotchas learned the hard way). Keep it updated as things change; don't let it silently go stale.

# Current snapshot (V4.0, 2026-08-13)

One Next.js **16.3** repo serving **18 subdomains** of `ctcexport.com`, all routed by `src/proxy.ts` (this Next renamed `middleware.ts` → `proxy.ts`; the comparison is by **segment boundary**, not `startsWith` — see the audit note below). Supabase (Postgres 17 + Auth + Storage, project `sjznkzvefqfcysczllli`, ~88 tables), deployed on Vercel on every push to `main`.

The surfaces, by class: **public platforms with login** — CTC Home (`/`), Kaffetal Regal (producer), the Cherry Picked family (hub + Green store + Roast/X scaffolds), Directorio del Café, Terratalento; **capture-only (Class B, no login, deposit into `leads`)** — CTC Tech, Co-Create, Varietales; **broadcast/shared** — Coffeed, Herramientas; **partner nodes** — 5 `socios/*` couples (landing + credential login), one of which is the Estudio de Contenido's app workshop; **internal** — one master login (password + OTP) opening three parallel consoles, **BCP** (base/passport), **ECP** (executive) and **OCP** (operational).

Security model = RLS + `BEFORE UPDATE` guard triggers (service-role bypasses by design) + per-console write gates. **V4.0 is the post-audit baseline**: the whole system was audited on 2026-08-13 (structure, stability, security, dead weight) and the findings remediated — report in `docs/architecture/Auditoria_Estructura_Estabilidad_V30.html`, which also records what was *deliberately* deferred and why. `npm audit` is at **0 vulnerabilities**; keep it there.

Operational caveats to know before touching email/BCP:
- **Transactional email** (leads + BCP OTP) sends via Resend from `EMAIL_FROM` (`info@ctcexport.com`, domain verified). Never point `EMAIL_FROM` at an unverified domain — it breaks *all* sends including the BCP login OTP. Every sender persists its result on the row; **none may swallow a failure silently** (the OTP one did, and it could lock the only door to the panel).
- **BCP can't be driven in an automated browser** (real 2FA, emailed OTP). Verify BCP changes via `tsc`/`eslint` + SQL, and drive the producer-facing side that exercises the same code.
- **A `throw` in a Server Action bound to `<form action>` crashes the whole page** (and prod redacts the message). Reachable business rejections must `return {ok:false,error}` — use `src/app/bcp/(app)/ActionForm.tsx`.

Docs: the versioned interactive system map lives in `docs/architecture/` (managed by the `architecture-doc-versioning` skill — log changes, don't hand-edit the HTML; wrap on request).

# Working rules (learned the hard way — don't rediscover them)

- **The gate before calling anything done**: `npx tsc --noEmit` clean, `npx eslint src` at or below its current warning baseline, `npm run build` exit 0. This has held all project long; don't lower it. Note `npm run build` can flake on a `next/font` Google fetch (`/lab`) — re-run before blaming your change.
- **Commits stage explicit paths, never `git add -A`.** Another session may be working in the same tree; a `git add -A` once swept an unrelated feature into an unrelated commit.
- **Bump `APP_VERSION` (`src/lib/version.ts`) in the same commit that deploys a batch of work** — the badge is how you tell, from any screen, whether you're looking at the latest deploy. Minor per batch; the owner declares majors. **The same commit adds the version's entry to `CHANGELOG.md`** (categorised bullets; seal the sha right after committing) — `scripts/qa-changelog-check.mjs` fails if the badge has no entry.
- **Keep `npm audit` at 0.** It got there on 2026-08-13 and the three high-severity ones that mattered sat exactly on this repo's hot paths (proxy routing, Server Actions).
- **If you keep something that looks dead, write why in the file itself**, not only in the log — the next sweep greps, and a bitácora entry won't reach it. Live examples: `/api/kaffetal-regal/next-step` (plumbing kept on purpose, no caller) and `/lab` (a workshop, not pending cleanup).

