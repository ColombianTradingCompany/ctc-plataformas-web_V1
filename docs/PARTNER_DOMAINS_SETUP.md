# Dominios de los nodos partner · configuración

Estado del código: **CONSTRUIDO (2026-07-15).** Los 5 "pares" (landing + login) viven en
`/socios/<nodo>` y `src/proxy.ts` ya mapea cada subdominio a su ruta. Falta solo el
paso externo (Vercel + Hostinger), igual al que ya se hizo para `kaffetal-regal` y
`cherry-picked`.

## Los 5 subdominios

| Subdominio | Nodo |
|---|---|
| `centro-calidad.ctcexport.com` | Centro de Calidad |
| `agente-carga.ctcexport.com` | Agente de Carga |
| `agente-nacionalizacion.ctcexport.com` | Agente de Nacionalización |
| `master-roaster.ctcexport.com` | Master Roaster |
| `estudio-contenido.ctcexport.com` | Estudio de Contenido |

En desarrollo y sin DNS, las mismas páginas responden por ruta: `/socios/<nodo>`.

## Pasos (por cada subdominio)

1. **Vercel → proyecto `ctc-plataformas-web-v1` → Settings → Domains → Add**: el
   subdominio completo (p. ej. `centro-calidad.ctcexport.com`). Vercel mostrará el
   CNAME a crear — históricamente el mismo target para todo el proyecto
   (`ade3fc85fa244f17.vercel-dns-017.com`), pero usa el que Vercel muestre.
2. **Hostinger → hPanel → Dominios → ctcexport.com → DNS**: crear registro **CNAME**,
   Nombre = la etiqueta del subdominio a secas (p. ej. `centro-calidad`), destino = el
   target de Vercel, TTL 300.
3. Esperar a que Vercel marque "Valid Configuration". Listo — el proxy hace el resto.

No se toca nada más: ni los MX, ni los registros de correo, ni los CNAME existentes.
