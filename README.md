# CTC Web Platform

The web platform of **Colombian Trading Company** (CTC), a green-coffee exporter: one Next.js 16 app
serving the 19 subdomains of `ctcexport.com` — the producer platform (Kaffetal Regal), the buyer
platform (Cherry Picked), the coffee people directory, the public tools, the Coffeed wall, the capture
landings and three internal consoles — on one Supabase project and one Vercel deployment.

## Where to start

Work here happens **one component per session**. Read, in this order:

1. `docs/KICKOFF.md` — the start-up prompt of each component (and how a session is opened).
2. `docs/componentes/<clave>.md` — the component's charter: what it is, routes, code map, tables, guardians, rules, open items.
3. `docs/ALINEACION.md` — what no component changes alone, and the permeation log between them.
4. `AGENTS.md` — the shipping gate and the house rules. `docs/HANDOFF.md` — the transversal architecture.

`CHANGELOG.md` records every version; `docs/architecture/` holds the versioned interactive system map.

## Run

```bash
npm install
npm run dev        # http://localhost:3000 — subdomains are routed by path in dev
npx tsc --noEmit && npx eslint src && npm run build   # the gate, before calling anything done
```

Environment: `.env.local` with the public Supabase values (never committed). The repository is public
by necessity of the deploy pipeline: no absolute local paths, no secrets, ever.

Copyright © Colombian Trading Company S.A.S. · NIT 901.483.425-7
