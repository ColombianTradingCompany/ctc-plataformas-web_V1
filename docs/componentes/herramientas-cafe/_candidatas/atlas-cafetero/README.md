# Candidata · `atlas-cafetero` · Atlas cafetero de Colombia

> Herramienta entregada por el owner que **aún no está en la plataforma**. Estado al 2026-09-21.

- **Fuente**: `reference/html_tools/_candidatas/atlas-cafetero/atlas-cafetero-colombia.html (+ .zip)`
- **Qué es**: Mapa coroplético de la producción cafetera por región (es, ~1 MB, 2026-09-19). **No está registrada** en `tools` ni en `public/tools/`: sin `meta description`, sin puente.
- **Como interfaz, candidata para**: Kaffetal Regal · fincas y regiones; Enabled Regions; Varietales; CTC Home.

## Para darla de alta (receta del charter)

1. Copiar a `public/tools/atlas-cafetero/<archivo>.html` y declararla en `src/lib/tools/carpetas.ts`.
2. `node scripts/vendor-tool-assets.mjs` (fuentes/CDN a local), `<title>` + `meta description` con el sufijo de la casa.
3. Alta en `tools` desde BCP · Herramientas; línea del puente si guarda trabajo; captura con `build-tool-shots.mjs`.
4. `qa-tools-carpetas`, `qa-tools-seo-check`, `qa-tools-seo-espejo` en verde.

```
Hoy: Dar de alta el Atlas cafetero de Colombia como herramienta (carpeta, head SEO, puente, captura).
```
