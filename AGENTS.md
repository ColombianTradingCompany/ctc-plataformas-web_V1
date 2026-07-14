<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Start here

Read `docs/HANDOFF.md` before doing anything else in this repo — it's the living architecture/status doc (directory map, Supabase schema + RLS/guard model, per-platform feature status, dev workflow, and a running list of gotchas learned the hard way). Keep it updated as things change; don't let it silently go stale.

# Current snapshot (V3, 2026-07-14)

One Next.js 16 repo, four surfaces (subdomain-routed via `src/proxy.ts`): **CTC Home** (`/`, marketing + lead capture), **Kaffetal Regal** (`/kaffetal-regal`, producer), **Cherry Picked** (`/cherry-picked`, buyer), **BCP** (`/bcp`, admin, 2FA). Supabase (Postgres 17 + Auth + Storage, project `sjznkzvefqfcysczllli`), deployed on Vercel on every push to `main`.

Live now: EUDR due-diligence end-to-end (finca + lot, derived risk factors, producer-answer vs CTC-evaluated split, printable finca **dossier** + lot **certificate**); producer **module hub** dashboard; BCP **Panel triage**, fincas/lotes review, Arena, contracts, catalog publishing; and the **Leads CTC Home** subsystem (Escríbenos + services create accounts + welcome emails → `/bcp/leads` triage → email replies quoting the full thread). Security model = RLS + `BEFORE UPDATE` guard triggers (service-role bypasses by design).

Operational caveats to know before touching email/BCP:
- **Transactional email** (leads + BCP OTP) sends via Resend from `EMAIL_FROM` (`info@ctcexport.com`, domain verified). Never point `EMAIL_FROM` at an unverified domain — it breaks *all* sends including the BCP login OTP.
- **BCP can't be driven in an automated browser** (real 2FA, emailed OTP). Verify BCP changes via `tsc`/`eslint` + SQL, and drive the producer-facing side that exercises the same code.

Docs: the versioned interactive system map lives in `docs/architecture/` (managed by the `architecture-doc-versioning` skill — log changes, don't hand-edit the HTML; wrap on request).

