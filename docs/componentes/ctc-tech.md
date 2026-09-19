# Charter · `ctc-tech` — CTC Tech (captación Clase B)

> Se lee con `docs/ALINEACION.md` al lado. Grupo de la barra lateral: **CTC Tech**.

## Qué es

La superficie de **captación** para productores que buscan tecnología agronómica (`ctc-tech.ctcexport.com`).
**Clase B**: sin login; una landing que explica la oferta y un formulario que deposita en `leads` (pilar
`tech`), **aprovisiona la cuenta** del productor al vuelo (`account_provisioning`: creada / Google / existente)
y le abre la puerta a Kaffetal Regal, donde las respuestas de CTC le llegan espejadas en **«Mis solicitudes»**.
La conversación la lleva CTC desde el ECP.

## Superficies y rutas

| Ruta | Qué |
|---|---|
| `/ctc-tech` | landing + formulario (`CtcTechLanding.tsx` sobre `SurfaceShell`; copy en `servicesCopy.tsx`, EN · ES · DE) |
| `/ecp/ctc-tech` | el tablero de leads del pilar `tech` (kanban por estado, respuesta con correo, aprovisionamiento) |
| `/lcp/leads` | la recepción general (pilar `general`), en la LCP desde la V5.59 — `/ecp/leads` es su talón 308 |

## Mapa de código

- `src/components/services/{CtcTechLanding,SurfaceShell,servicesCopy}.tsx` (+ `surface.module.css`).
- `src/lib/leads/actions.ts` — **compartido con Varietales y CaaS**: `PILLARS`, `FIELD_KEYS` (lista blanca de
  campos por pilar — lo que no está nombrado se descarta), `sanitize`, la creación/atado de la cuenta.
- `src/app/ecp/(app)/ctc-tech/` + `src/components/panel/{LeadsBoard.tsx,leadsActions.ts}` (compartidos con la LCP) +
  `src/lib/panel/leadsPilares.ts`: **qué tablero administra cada pilar, y de ahí se DEDUCE la consola** (V5.59). Al mover
  este tablero de consola se cambia esa línea y el permiso viaja con ella; `qa-rutas-consolas` (g) lo contrasta con el rail.
- `src/lib/email/leadEmails.ts` (bienvenida + respuestas por Resend; el resultado se guarda en la fila).

## Tablas que posee

Ninguna propia: **escribe en `leads`** (pilar `tech`, `fields` jsonb bajo lista blanca, `status`
nuevo → en_conversacion → convertido → cerrado) y la consola en `lead_replies`. Solo lee `profiles`; el espejo
al panel del productor va por `producer_comm_log.lead_id` (dueño: consolas).

## Guardianes

No tiene guardián propio. Lo cubren `qa-solicitudes-kr-check.mjs` (el espejo al panel del productor),
`qa-sneak-peek-check.mjs` y `qa-taller-check.mjs` (la concha `SurfaceShell`).

## Reglas propias

- **Lista blanca de campos** (`FIELD_KEYS.tech`): un campo nuevo del formulario se añade allí o no se guarda.
- **Sin login, con cuenta**: el formulario crea o ata la cuenta; el riesgo residual (un extraño provoca la
  creación de una cuenta inerte) está aceptado y documentado.
- La contraseña temporal vive en `leads.temp_password` **en claro por decisión de producto**, viaja en la
  primera respuesta y se borra; inalcanzable desde un JWT de usuario.
- Copy en tres idiomas; el botón final ofrece «Entrar a Kaffetal Regal».

## Lo que las consolas gobiernan de este componente

**ECP · CTC Tech / Leads** lo es todo aquí: leer, responder (con la contraseña temporal la primera vez),
cambiar de estado, ver fincas/lotes/pedidos vinculados. **OCP** no interviene. Un cambio en `PILLARS` o en
`FIELD_KEYS` alcanza a Varietales y CaaS a la vez.

## Pendientes

- Un guardián ligero para la lista blanca y el aprovisionamiento (`qa-leads-check.mjs`), compartido con
  Varietales y CaaS.
- El contenido de la landing (oferta agronómica concreta) es del owner; hoy es la propuesta genérica.
- **Política de privacidad** de la red (declara a Resend como subprocesador) — pendiente transversal.

## Kick-off

```
Trabajas SOLO en el componente «CTC Tech» (clave: ctc-tech) de la plataforma CTC
(repo C:\dev\ctc-platforms\ctc-platform, rama main). Antes de tocar nada lee, en este orden:
1. docs/componentes/ctc-tech.md   ← tu charter
2. docs/ALINEACION.md             ← contratos transversales y el registro de permeación (§3)
3. AGENTS.md                      ← la compuerta y las reglas de la casa
Clase B: sin login, deposita en leads bajo lista blanca y aprovisiona la cuenta. `lib/leads/actions.ts`
es COMPARTIDO con Varietales y CaaS: tocarlo es cambio transversal (línea en §3). La respuesta al
productor es del ECP. Al terminar: compuerta completa, APP_VERSION + CHANGELOG, sello, push,
verificación en vivo, log de arquitectura, y «Pendientes» de este charter al día.
Hoy: <la tarea>.
```
