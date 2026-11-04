# private/ocp-apps · las calculadoras de los cotizadores (no son públicas)

Dos HTML del owner que los cotizadores del ECP embeben **tal cual** en un iframe (`src/components/cotizador/AppFrame.tsx`):

| Archivo | App | La monta |
|---|---|---|
| `cotizador-lotes.html` | Mermas V15 | `/ecp/cotizador-lotes` |
| `cotizador-logistico.html` | CoGS V19 | `/ecp/cotizador-logistico` |

**Por qué aquí y no en `public/`** (TAR-119): lo que está en `public/` se sirve estático a cualquiera, sin sesión. Desde TAR-119
estos archivos viven fuera de `public/` y los sirve `src/app/ocp-apps/[archivo]/route.ts` en la misma URL de siempre
(`/ocp-apps/<archivo>`), solo a quien tenga la consola del cotizador que la monta (leída del rail). La lista blanca está en
`src/lib/cotizador/apps.ts`, la carpeta viaja a producción por `outputFileTracingIncludes` en `next.config.ts`, y lo vigila
`scripts/qa-cotizador-apps-check.mjs`.

**Actualizar una calculadora** sigue siendo reemplazar su archivo aquí, con el mismo nombre. **Un archivo nuevo** necesita
su línea en `APPS_COTIZADOR`. Las copias públicas de estas herramientas (Mermas, CoGS) viven en `public/tools/` y son del
componente `herramientas-cafe`; estas son copias, no la fuente. Retirarlas es decisión del owner.
