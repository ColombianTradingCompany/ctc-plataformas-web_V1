# Charter · `varietales` — Varietales Registrados (captación Clase B)

> Se lee con `docs/ALINEACION.md` al lado. Grupo de la barra lateral: **Varietales Registrados**.

## Qué es

La superficie de **captación** para productores que piden el catálogo de plántulas de variedades
registradas (`varietales.ctcexport.com`). **Clase B** como CTC Tech: sin login, una landing y un formulario
que deposita en `leads` (pilar `varietales`), aprovisiona la cuenta del productor y le abre Kaffetal Regal,
donde las respuestas llegan a «Mis solicitudes». Comparte con CTC Tech y CaaS **toda** la mecánica de leads.

## Superficies y rutas

| Ruta | Qué |
|---|---|
| `/varietales` | landing + formulario (`VarietalesLanding.tsx` sobre `SurfaceShell`; copy en `servicesCopy.tsx`) |
| `/ecp/varietales` | el tablero de leads del pilar `varietales` |

## Mapa de código

- `src/components/services/{VarietalesLanding,SurfaceShell,servicesCopy}.tsx`.
- `src/lib/leads/actions.ts` (compartido: `FIELD_KEYS.varietales`), `src/app/ecp/(app)/varietales/page.tsx`,
  `src/app/ecp/(app)/leadsActions.ts` (`PILLAR_CONSOLE`), `src/lib/email/leadEmails.ts`.
- El **catálogo de variedades** que se le enseña al productor sale de la fuente única de la Ficha:
  `VARIETIES` en `src/components/kaffetal-regal/ficha/fichaData.ts` (dueño: `kaffetal-regal`) — no se duplica.

## Tablas que posee

Ninguna propia: escribe en `leads` (pilar `varietales`); la consola en `lead_replies`.

## Guardianes

Ninguno propio (deuda compartida con CTC Tech). Cubierto por `qa-solicitudes-kr-check.mjs` en el espejo.

## Reglas propias

- Las de CTC Tech: lista blanca `FIELD_KEYS.varietales`, cuenta al vuelo, contraseña temporal en claro por
  decisión de producto, tres idiomas.
- **Las variedades se nombran como en `VARIETIES`** (Bourbon, Castillo, Tabi, Gesha…): un nombre nuevo se da
  de alta allí, no en el copy de esta landing.

## Lo que las consolas gobiernan de este componente

**ECP · Varietales / Leads**: leer, responder, cambiar de estado. Un cambio en `PILLARS`/`FIELD_KEYS`
alcanza a CTC Tech y CaaS; un cambio en `VARIETIES` alcanza a la Ficha de Kaffetal Regal.

## Pendientes

- Guardián ligero de leads compartido con CTC Tech (`qa-leads-check.mjs`).
- El catálogo real de plántulas (qué se ofrece, precios, viveros) es del owner: hoy la landing recoge el
  interés, no vende.

## Kick-off

```
Trabajas SOLO en el componente «Varietales Registrados» (clave: varietales) de la plataforma CTC
(repo C:\dev\ctc-platforms\ctc-platform, rama main). Antes de tocar nada lee, en este orden:
1. docs/componentes/varietales.md   ← tu charter
2. docs/ALINEACION.md               ← contratos transversales y el registro de permeación (§3)
3. AGENTS.md                        ← la compuerta y las reglas de la casa
Clase B: sin login, deposita en leads bajo lista blanca. `lib/leads/actions.ts` y `VARIETIES` son
compartidos: tocarlos es cambio transversal (línea en §3). Al terminar: compuerta completa,
APP_VERSION + CHANGELOG, sello, push, verificación en vivo, log de arquitectura, y «Pendientes» al día.
Hoy: <la tarea>.
```
