# CTC Web Platform — Handoff & Architecture

Last updated: 2026-07-10. This is the living continuation document for this repo — read this first in a new session, before re-deriving context from git history or the plan file.

## What this is

Colombian Trading Company (CTC) is a green-coffee exporter. This repo is a single Next.js app serving **four surfaces** on one deployment, routed by subdomain in production and by path in dev:

| Platform | Audience | Route | Subdomain (prod) |
|---|---|---|---|
| **CTC Home** | Public marketing | `/` | root domain |
| **Kaffetal Regal** | Coffee producers | `/kaffetal-regal` | `kaffetal-regal.*` |
| **Cherry Picked** | European roasters/buyers | `/cherry-picked` | `cherry-picked.*` |
| **BCP** (Business Control Panel) | CTC's own staff (2 founders) | `/bcp` | not on a public subdomain |

The subdomain→path rewrite lives in `src/proxy.ts` (see Gotchas below for why it's not called `middleware.ts`).

**The core business flow this app encodes**: a producer registers a finca + lot and fills out a Ficha Técnica (Kaffetal Regal) → CTC staff schedule an Arena cupping session and grade it (BCP) → a graded lot gets a purchase contract with a 3-month release staircase (BCP) → once at least one month has released, BCP publishes it to the Cherry Picked catalog → a European buyer reserves and checks out (Cherry Picked).

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
    bcp/
      login/, verify/                 password+OTP login (pre-session)
      (app)/                          everything behind the admin session
        layout.tsx, BcpSidebar.tsx     nav shell + centralized bcp_admin read-check
        page.tsx                       dashboard digest
        fincas/, arena/, contratos/, catalogo/, subastas/, leads/
        actions.ts, arenaActions.ts, contractActions.ts, catalogActions.ts
                                        Server Actions — each re-verifies bcp_admin itself
    api/
      bcp/auth/{password,verify,logout}/route.ts   BCP 2FA login endpoints
      kaffetal-regal/next-step/route.ts             Anthropic advisor endpoint
  components/
    ctc-home/, kaffetal-regal/, cherry-picked/       one folder per platform
    kaffetal-regal/ficha/                            Ficha Técnica: 8 panes + preview + AI widget
    ui/                                               shadcn primitives (BCP only)
  lib/
    supabase/{client,server}.ts        3 client factories — see below
    bcp/{otp,sendOtpEmail,requireAdminProfile}.ts
    stableStringify.ts                 deterministic JSON compare, used by the AI-advice cache
scripts/
    create-qa-producer.mjs, create-qa-buyer.mjs, seed-bcp-admin.mjs,
    qa-guard-check.mjs, qa-checkout-check.mjs        disposable QA account + regression helpers
```

## Supabase client factories (`src/lib/supabase/server.ts`)

Three, each for a different trust level — know which one a piece of code should use before touching auth/data code:

1. `createSessionClient()` — cookie-bound, respects RLS as the signed-in user. Default choice for anything a logged-in user does to their own data.
2. `createEphemeralClient()` — no session persistence, used only for the BCP login's password-verify-without-cookie step.
3. `createServiceRoleClient()` — bypasses RLS entirely. **Server-only, never import from a client component.** Reserved for audited admin mutations (BCP approvals/publishing) and system-computed fields a normal user JWT isn't allowed to touch (e.g. the AI-advice cache columns on `lots`, written even when the lot is past the stage a producer's own JWT can modify).

## Database (project `sjznkzvefqfcysczllli`)

Full table list, RLS policies, and triggers were audited 2026-07-10 (see Audit Findings below); the schema is otherwise stable. Domains:

- **Identity**: `profiles` (role enum: producer/buyer/bcp_admin), `producer_profiles`, `buyer_profiles`.
- **Kaffetal Regal**: `fincas`, `lots` (stage enum borrador→...→galardonado, `datasheet` jsonb holding the full ~50-field Ficha, `ai_next_step_advice`/`ai_next_step_context` for the AI-advice cache), `ficha_completion_snapshots`, `media_assets`.
- **Arena/Contracts**: `harvest_seasons`, `arena_sessions`, `arena_session_lots`, `arena_scores`, `purchase_contracts`, `contract_releases`, `humidity_readings`. These four Arena tables are **service-role-only by design** — zero client RLS policies, since they're internal grading machinery BCP alone touches.
- **Cherry Picked**: `lot_listings`, `shipping_zones`, `lot_reservations`, `orders`, `order_items`, `points_ledger`, `sample_pack_orders`.
- **Ops**: `admin_otp_codes` (BCP 2FA), `audit_log`.
- **Two `SECURITY DEFINER` views** for public catalog reads without broadening base-table RLS: `public_lot_catalog` (published/sold-out lots only, curated columns — no raw Ficha datasheet, no geolocation) and `public_transparency_pricing` (locked vs. reference price, only for listings with `transparency_credit_enabled`). Both reviewed 2026-07-10 — column scope is correctly narrow. This pattern exists *because* a naive broad RLS policy on `lots`/`fincas` would have exposed the full private Ficha and exact finca geolocation to any buyer — don't "simplify" these back into RLS policies without re-deriving that constraint.

### The "ironclad guard" trigger model

Every table a normal user JWT can write to has a guard: RLS restricts *whose* rows are visible, and a `BEFORE UPDATE` trigger additionally restricts *which columns/transitions* are legal, keyed off `auth.uid() is not null` (service-role calls have a null uid, so BCP/system writes bypass the guard on purpose). Current guards, all confirmed intact and matching their trigger source during the 2026-07-10 audit:

| Table | Guard function | Producers/buyers cannot... |
|---|---|---|
| `profiles` | `guard_profiles_protected_columns` | change their own `role` or `email` |
| `buyer_profiles` | `guard_buyer_protected_columns` | self-assign `lifetime_points`/`membership_tier` (the points trigger sets `app.syncing_points` to bypass this for its own writes) |
| `lots` | `guard_lots_producer_columns` | touch a lot once its `stage` is past `ficha_completa`, change `stage` outside `{borrador, ficha_completa}`, or ever set `grade` |

If you add a new producer/buyer-writable column to one of these tables, check whether it needs carving out of (or into) its guard function — the AI-advice cache columns deliberately go around this guard via the service-role client rather than punching a hole in it.

## Feature status per platform

**CTC Home** — static marketing, done, no backend.

**Kaffetal Regal** — real auth (email/password + Google), real finca/lot CRUD, full Ficha Técnica (all 8 panes ported 1:1 from the source CTC datasheet tool), dashboard with per-lot sparkline/kanban/AI-advice display. This is the most actively developed surface right now.

**Cherry Picked** — real buyer auth, real catalog (fed only by BCP-published listings), cart/reservations, checkout via the atomic `place_order()` RPC, membership tiers, sample packs. **Tyrian auction is still 100% static demo** (`TyrianSection.tsx`) — explicitly deferred, not started.

**BCP** — password+OTP 2FA login, finca approval, lot list/proxy-create, full Arena workflow (schedule → queue → score → close with majority-vote grading), full Contracts workflow (sign → monthly releases → humidity flagging), catalog publishing (gated on a signed contract with ≥1 confirmed release, `total_kg` auto-synced from releases). `/bcp/subastas` and `/bcp/leads` are still "Próximamente" placeholders.

## Dev workflow

- `npm run dev` (Turbopack). Type-check with `npx tsc --noEmit`, lint with `npx eslint src --max-warnings=0` — both must be clean before considering a change done; this has held throughout the project.
- **QA verification pattern**: create disposable accounts via `scripts/create-qa-producer.mjs` / `create-qa-buyer.mjs` / `seed-bcp-admin.mjs`, seed realistic data via direct SQL (Supabase MCP `execute_sql`/`apply_migration`), drive the flow in the browser preview, clean up after — unless the user says to keep an account alive for continued UI iteration (they've done this at least once; check before deleting a QA account you didn't create this session).
- No test suite exists — verification is always live-browser + direct-SQL-check, not automated tests.

## Gotchas (learned the hard way this project — don't re-learn these)

1. **Two Supabase projects exist on this org; only one is real.** `sjznkzvefqfcysczllli` ("ctc-platform") is `ACTIVE_HEALTHY` and is what `.env.local` actually points at. `dweizejazqeqpiguecxw` ("ColombianTradingCompany's Project") is a long-abandoned early-exploration project, paused >90 days, **unrecoverable**, and not used anywhere. If any Supabase MCP tool call times out with "Connection terminated," check you didn't default to the wrong `project_id` — this happened once and wasted several tool calls before the mismatch was spotted via `list_projects`.
2. **`src/proxy.ts` is this Next.js version's `middleware.ts`.** Not a typo, not custom infra — see `AGENTS.md`'s warning that this Next.js build has real breaking API changes from training-data Next.js.
3. **React `useEffect` + `react-hooks/set-state-in-effect`**: this lint rule flags ANY direct synchronous `setState()` at the top level of an effect body, even before an async chain. Fix pattern used throughout: seed the "loading"/initial state from props at `useState()` time so the effect never needs a synchronous reset call, and only ever chain `.then(handler)` off a promise in the effect body.
4. **`onAuthStateChange`'s `SIGNED_IN` event fires not just on a fresh login but also when it resolves an already-valid session from cookies** (tab refocus, background token refresh). A handler that unconditionally forces the UI back to a "logged in" landing view on `SIGNED_IN` will silently kick a user out of whatever sub-view they were in (this actually happened in Kaffetal Regal's Ficha view — fixed by only forcing the view when coming from the logged-out state, never unconditionally).
5. **Prompt caching (`cache_control`) has a minimum cacheable-prefix token count** (~1024–2048 tokens depending on model tier) — a short system prompt below that silently never caches (no error, just always misses). Don't assume `cache_control` alone solves a token-cost problem; check the actual prompt size first.
6. **Auto-mode classifier blocks, by design, in this environment**: direct `git push` to `main` (needs the user to push themselves, or a feature branch + PR), Supabase `restore_project` on a shared project, and applying DB migrations that go beyond what was explicitly asked (even safe, additive hardening). When blocked, explain what you intended and let the user decide — don't work around it.
7. **Ficha preview HTML is built via raw string templates + `dangerouslySetInnerHTML`** (`fichaPreviewHtml.ts` → `FichaPreview.tsx`) but is properly escaped via a dedicated `esc()` helper on every interpolated field — confirmed safe during the 2026-07-10 audit. If this rendering approach is ever reused elsewhere (e.g. surfacing Ficha text to BCP or buyers), re-verify escaping travels with it.

## Audit findings — 2026-07-10 deep review

Full codebase + Supabase advisors review. Code itself came back clean: no `TODO`/`FIXME`, no `@ts-ignore`/`@ts-expect-error`, no stray `any`, `tsc`/`eslint` both clean. Findings are all on the Supabase side, via `get_advisors` + manual verification of the flagged objects. **None were auto-fixed — applying them was outside the scope of what was asked this session; the DB-migration attempt was correctly blocked by the auto-mode classifier as an unrequested change.**

### Recommended, not yet applied

- **Set `search_path = public`** on 4 guard/trigger functions that don't have it pinned: `sync_buyer_tier`, `guard_profiles_protected_columns`, `guard_buyer_protected_columns`, `guard_lots_producer_columns`. Lower real risk than it sounds — none of these four are `SECURITY DEFINER` (confirmed via `pg_proc`), so the classic search-path-hijack escalation doesn't apply the same way it would for a definer function. Still correct hygiene; the other 5 definer functions (`place_order`, `handle_new_user`, `sync_buyer_points`, `sync_listing_total_from_releases`, `guard_reservation_validity`) already have it set.
- **Revoke direct RPC `EXECUTE`** on 4 pure trigger functions currently callable via `/rest/v1/rpc/...` by `anon`/`authenticated` because Postgres grants `EXECUTE` on public-schema functions to `PUBLIC` by default: `handle_new_user`, `sync_buyer_points`, `sync_listing_total_from_releases`, `guard_reservation_validity`. Practical exploitability is low (calling a `RETURNS trigger` function outside trigger context errors on the unbound `NEW`/`OLD`/`TG_OP`), but there's no legitimate reason to leave it open. **Do not revoke `place_order`** — that one is deliberately called via `supabase.rpc('place_order', ...)` from Cherry Picked's checkout.
- **Missing covering indexes** on ~15 foreign-key columns (`arena_scores.entered_by`, `orders.buyer_id`, `lot_reservations.buyer_id`, etc. — full list in `get_advisors(type: performance)`). Negligible at current row counts (single digits to low tens per table); worth adding once real traffic shows up, not before.
- **RLS policies re-evaluate `auth.uid()`/`auth.<fn>()` per-row** instead of `(select auth.<fn>())` on ~20 policies across `profiles`, `lots`, `orders`, `lot_reservations`, etc. Same story — a real optimization, invisible at current scale, worth a batch pass before any real traffic ramp.
- **Leaked-password protection is disabled** in Supabase Auth settings. This is a dashboard toggle (Authentication → Policies), not a code/migration fix — Authentication → Providers → Email in the Supabase dashboard for project `sjznkzvefqfcysczllli`.

### Reviewed and confirmed fine (no action)

- Both `SECURITY DEFINER` views (`public_lot_catalog`, `public_transparency_pricing`) — column scope is correctly narrow, matches the documented design intent, no leakage of Ficha datasheet/geolocation/full contract terms.
- The 5 `arena_*`/`harvest_seasons` tables flagged "RLS enabled, no policy" — intentional, service-role-only by design (see schema section above), not an oversight.
- `dangerouslySetInnerHTML` usage (the only one in the codebase) — properly escaped.
- All 4 `ai_next_step_*` cache columns — no cross-user leakage; ownership-checked in the API route before any read/write.

## Where to find deeper history

`C:\Users\gabri\.claude\plans\warm-bubbling-dongarra.md` (outside this repo, on the machine that ran these sessions) has the full addendum-by-addendum design rationale for every phase — read it if you need the *why* behind a decision this doc only summarizes.
