# Stripe recommendation plan — CTC Web Platform

Generated 2026-07-14 by the Stripe plugin's `connect-recommend` skill (run manually from plugin cache; plugin loads natively in new sessions).

## Recommended Connect integration plan

**Decision: no Stripe Connect. Standard Stripe integration for buyer payments; producer payments stay on a separate Colombian rail (Nequi/bank), tracked in BCP.**

### Why not Connect

- **CTC is the merchant of record.** Producers are suppliers under purchase contracts (`purchase_contracts` + `contract_releases`); CTC buys the coffee and resells it to European roasters on Cherry Picked. Connect models buyer→seller money routing with the platform taking a fee — that is not this business.
- **Payment timing is decoupled.** Producer payments follow the 3-month release staircase and begin *before* the lot is published for sale. They are paid from CTC working capital, not from any specific buyer charge. Connect's charge patterns (direct/destination/separate) all anchor seller payouts to buyer charges.
- **Colombia is not a supported Stripe country** for connected accounts, and Nequi is not a Stripe payout destination. Producers could not be onboarded even if the model fit.

### Revisit trigger

Reconsider Connect only if the business model changes so that producers sell directly to buyers with CTC taking a platform fee per transaction — and even then the Colombia limitation must be re-checked first.

## Rail 1 — Money in: standard Stripe (Cherry Picked checkout)

- **Product**: Stripe Checkout (hosted), currency EUR.
- **Flow**: buyer reserves → server action creates a Checkout Session (reservation/order metadata) → buyer pays on Stripe → `checkout.session.completed` webhook (route handler, service-role client) finalizes the order via the existing atomic `place_order()` RPC path → failure/expiry releases the reservation.
- **Also covers**: `sample_pack_orders`.
- **Env**: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (server-only; publishable key only needed if checkout is later embedded rather than hosted).
- **Current state**: no Stripe code exists anywhere in the repo; checkout today ends at `place_order()` with no payment step.

## Rail 2 — Money out: producers via Nequi/Bancolombia, tracked in BCP

- Keep paying producers off-Stripe (Nequi or bank transfer, COP).
- Add payout tracking to `contract_releases` (e.g. `paid_at`, `payout_reference`, `payout_method`) so `/bcp/contratos` shows owed vs. paid per contract. Service-role writes only, consistent with the existing Arena/contracts model.
- Scale path (verify current terms when needed): Conecta Nequi business APIs for automated dispersal, or a cross-border payout provider (Wise Business, dLocal) if paying from a foreign entity.

## Prerequisite (open)

**A Stripe account requires a legal entity in a supported country; Colombia is not one.** Entity location is undecided (answered "not sure yet" on 2026-07-14). An EU entity is the natural fit — buyers are European, sales in EUR, platform already runs in `eu-central-1`. Resolve this before creating the Stripe account; everything in Rail 1 is blocked on it.

## Details / next implementation steps (when entity exists)

1. Create Stripe account (EU entity), enable EUR, cards + SEPA-adjacent methods as desired.
2. `npm i stripe` in `ctc-platform`; add env vars in Vercel + `.env.local`.
3. Server action: create Checkout Session from a reservation (amount from `lot_listings` pricing, metadata `reservation_id`/`buyer_id`).
4. Webhook route handler `src/app/api/stripe/webhook/route.ts`: verify signature, on `checkout.session.completed` run the order-finalization path with `createServiceRoleClient()`; idempotent by session id.
5. Reservation expiry / `checkout.session.expired` → release the hold.
6. BCP: payout-tracking columns on `contract_releases` + UI in `/bcp/contratos`.
7. Test with `/stripe:test-cards` (plugin command) before going live.
