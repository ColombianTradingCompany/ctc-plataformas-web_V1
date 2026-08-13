<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
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

