# Stripe Plugin Setup Report

> Integrado el 2026-09-11 en `docs/` (pertenece al componente **Herramientas Internas**; la implementación de cobros vive en Cherry Picked). El plan canónico sigue en la raíz del repo, `connect-recommend-plan.md`, porque el skill `connect-recommend` lo detecta ahí — no moverlo.

Written 2026-09-11 from the (decommissioned) OneDrive `CTC Web Platform` session, for a wrap session running in `C:\dev\ctc-platforms`. It documents the Stripe setup work done on **2026-07-14** in that old session, plus a state check of this dev tree performed today. Self-contained — no other session context needed.

## 1. What was done (2026-07-14)

### 1a. Stripe plugin installed in Claude Code

- Installed **`stripe@claude-plugins-official` v0.2.5** (publisher: Stripe), **user scope** — available in every project on this machine.
- Install mechanics, since they were non-obvious on this machine: the `claude` CLI is not on PATH; the desktop app's bundled binary at `%APPDATA%\Claude\claude-code\<highest-version>\claude.exe` was used. The official marketplace was not registered, so it took two steps:
  1. `claude plugin marketplace add anthropics/claude-plugins-official`
  2. `claude plugin install stripe@claude-plugins-official`
- Plugin contents: the **Stripe MCP server** (`https://mcp.stripe.com`, HTTP + OAuth), skills (`stripe-best-practices`, `connect-recommend`, `stripe-directory`, `stripe-projects`, `upgrade-stripe`), commands (`/stripe:explain-error`, `/stripe:test-cards`), and a `company-researcher` agent.

### 1b. Architecture decision — ran the `connect-recommend` skill

The skill's discovery (business research + codebase scan) produced a firm recommendation, accepted by the owner:

**No Stripe Connect. Two separate rails:**

1. **Money in (EU roasters → CTC): standard Stripe.** Hosted Stripe Checkout in EUR on Cherry Picked, wired into the existing reservation → `place_order()` RPC flow; orders finalized on the `checkout.session.completed` webhook (service-role client, idempotent by session id); reservation released on expiry/failure. Also covers `sample_pack_orders`.
2. **Money out (CTC → producers): Nequi/Bancolombia, off-Stripe, tracked in BCP.** Producers are suppliers under `purchase_contracts`/`contract_releases`, paid from CTC working capital on the 3-month release staircase — payout-tracking columns on `contract_releases` (e.g. `paid_at`, `payout_reference`, `payout_method`) + owed-vs-paid UI in `/bcp/contratos`. Scale path (verify terms when needed): Conecta Nequi APIs, or Wise/dLocal from a foreign entity.

Why Connect was rejected (the owner had asked, wanting to eventually pay producers via Nequi):
- CTC is **merchant of record** — it buys the coffee and resells it; there is no buyer→seller money routing with a platform fee.
- **Payment timing is decoupled** — producers are paid before/independently of buyer charges; Connect anchors seller payouts to buyer charges.
- **Colombia is not a supported Stripe country** for connected accounts, and Nequi is not a Stripe payout destination — Connect could not reach the producers even if the model fit.
- Revisit only if producers ever sell directly to buyers with CTC taking a per-transaction fee (and re-check the Colombia limitation first).

### 1c. Prerequisite identified (still open as far as this session knows)

**Stripe requires a legal entity in a supported country; Colombia is not one.** Entity location was answered "not sure yet" on 2026-07-14. An EU entity is the natural fit (European buyers, EUR pricing, Supabase in `eu-central-1`). Everything on the money-in rail is blocked on this decision.

### 1d. Sandbox API keys

Stripe issued sandbox keys (`pk_test_...` / `sk_test_...`). The owner saved them **themselves** into the OneDrive tree's `ctc-platform/.env.local` as `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (gitignored via `.env*`). The keys never passed through Claude.

## 2. State of THIS dev tree, verified 2026-09-11

| Item | State |
|---|---|
| Plan document | **Present** at `C:\dev\ctc-platforms\ctc-platform\connect-recommend-plan.md` — migrated with the workspace move; it is the canonical write-up of everything in §1b–§1c, including a 7-step implementation checklist. The Stripe plugin's `connect-recommend` skill auto-detects this file and reuses it instead of re-running discovery. |
| Plugin | Still installed (v0.2.5, user scope) — its skills/commands load in any new session. |
| Stripe MCP | **Still NOT authorized.** `plugin:stripe:stripe` requires OAuth; it must be authorized from an interactive session (`/mcp` or first-use prompt) before Stripe tools work. |
| Sandbox keys | **LOST in the workspace move.** `C:\dev\ctc-platforms\ctc-platform\.env.local` exists but contains **no `STRIPE_*` entries**, and the old OneDrive `.env.local` no longer exists. Not a real loss: sandbox keys remain viewable anytime in the Stripe Dashboard (Developers → API keys). The owner must re-copy them into the new `.env.local` themselves (`STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`). Do not ask them to paste keys into chat. |
| Implementation code | None was ever written — as of 2026-07-14 the repo had zero Stripe code (checkout ended at `place_order()` with no payment step). This report does not know what later sessions in `C:\dev` may have added; grep for `stripe` before assuming. |

## 3. Open items (as known to this session)

1. **Entity country decision** — business decision, blocks creating the real Stripe account (test/sandbox work is not blocked).
2. **Re-save sandbox keys** into `C:\dev\ctc-platforms\ctc-platform\.env.local` (owner action, from the Stripe Dashboard).
3. **Authorize the Stripe MCP** (OAuth) in an interactive session if agent access to the sandbox is wanted.
4. **First implementation slice** suggested at the time: producer-payout tracking in BCP (schema + UI, no Stripe account needed), then Checkout per the plan file's step list.
5. When implementing: use a **restricted key** instead of the full secret key at go-live, and test with `/stripe:test-cards`.
