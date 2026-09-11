# Charter · `directorio` — Directorio del Café

> Se lee con `docs/ALINEACION.md` al lado. Grupo de la barra lateral: **Directorio del Café**.

## Qué es

El **Directorio de Especialistas del Café · Santander** (`directoriodelcafe.ctcexport.com`): la capa de
**personas** de la red. Un profesional del café se inscribe, arma su ficha (especialidades, documentos de
soporte, certificaciones), aparece en el directorio con búsqueda y filtros, conversa por mensajes, participa
en un muro propio y ve el muro de Coffeed. CTC **verifica** desde el ECP las certificaciones que un documento
apoya (gris «En revisión» → azul «Verificado por CTC» → gris «No aceptado» + retiro a 10 días).

## Superficies y rutas

| Ruta | Qué |
|---|---|
| `/directorio` | landing + login + app (`DirectorioExperience.tsx`: `AppView` con paneles Directorio · Muro · Mensajes · Perfil · Herramientas · `BancoCertificaciones`) |
| `/directorio/auth/callback` | OAuth de Google |
| `/ecp/directorio` | `DirectorioAdmin.tsx`: verificación, pestaña **Certificados** (cola, pendientes primero) |
| `/herramientas/taller` | el Directorio es la tercera identidad que abre el taller (membresía ampliada en `accesoHerramienta.ts`) |

## Mapa de código

- `src/components/directorio/` — `DirectorioExperience`, `Landing`, `Login`, `ModalInscripcion`, `AppView`,
  `PanelDirectorio` (búsqueda sin tildes, 5 filtros, 4 órdenes), `PanelMuro`, `PanelMensajes`, `PanelPerfil`
  (medidor de completitud), `PanelHerramientas`, `BancoCertificaciones`, `SelectorEspecialidades`, `Modal`, `data.ts`.
- `src/lib/directorio/` — `actions.ts` (`cargarDirectorio`, inscripción, mensajes, muro, documentos; `sanitizeDoc`
  hace nacer `pendiente` todo documento ligado a una certificación), `sweep.ts` (`barrerCertificadosVencidos`,
  colgado del cron diario de integraciones — sin cron nuevo), `perfilPrint.ts`, `types.ts`; `src/lib/directorioLink.ts`.
- `src/app/ecp/(app)/directorio/` + `src/app/ecp/(app)/directorioActions.ts` (`aprobarCertificado` / `rechazarCertificado`: mensaje
  de CTC al hilo del usuario, `audit_log`, `remover_despues_de = now()+10d`).
- Docs: `docs/DIRECTORIO_DOMAIN_SETUP.md` (subdominio: código listo, paso externo Vercel + Hostinger).

## Tablas que posee (service-role-only)

`directorio_profiles` · `directorio_documents` (`verificacion` null | pendiente | aprobado | rechazado,
`verdicto_*`, `remover_despues_de`) · `directorio_messages` · `directorio_posts` · `directorio_post_comments` ·
`directorio_post_likes`. Solo lee: `profiles`, `producer_profiles`, `buyer_profiles` (misma cuenta que el
resto de la red), `media_assets`.

## Guardianes

No tiene guardián propio (deuda). Lo tocan `qa-recuperacion-check.mjs` (la puerta del Directorio),
`qa-crm-interes-check.mjs` y `qa-herramientas-acceso-check.mjs` (la membresía DC en el taller).

## Reglas propias

- **La cuenta es la misma** de Supabase Auth que en toda la red; el Directorio no crea una identidad aparte.
- **Los documentos son privados; el HECHO de que una certificación está verificada es público** (✓ azul en
  tarjeta y ficha; `Ficha.certsVerificadas` se calcula en `loadDirectorio`).
- Aviso **Ley 1581** en la inscripción — es el precedente de la casa para datos personales sensibles.
- El retiro a 10 días de un documento rechazado es **barrido perezoso** (el dueño al cargar) + respaldo diario;
  no consume un cron propio.
- Búsqueda insensible a tildes; estados vacío/filtros-limpios definidos (regla UI/UX de la casa).

## Lo que las consolas gobiernan de este componente

**ECP · Directorio**: la verificación de certificados (aprobar/rechazar, con mensaje al hilo del usuario y
rastro en `audit_log`) y la moderación. **ECP · Plataformas**: título, descripción y sitemap del subdominio.
Un cambio en el modelo de verificación toca `sanitizeDoc`, el ECP y la insignia pública a la vez.

## Pendientes

- **Guardián propio** (`qa-directorio-check.mjs`): el ciclo `pendiente → aprobado/rechazado → retiro`, la
  insignia pública derivada, y que la búsqueda sin tildes siga viva.
- **Verificar que `directoriodelcafe.ctcexport.com` resuelve y sirve con TLS** (el doc de dominio deja el paso
  externo al owner; comprobar con `curl -I`).
- **Política de privacidad** (GDPR / Ley 1581) — pendiente de toda la red; el Directorio es quien más datos
  personales guarda.
- La pestaña Coffeed no se ha navegado con un miembro verificado (charter `coffeed`).

## Kick-off

```
Trabajas SOLO en el componente «Directorio del Café» (clave: directorio) de la plataforma CTC
(repo C:\dev\ctc-platforms\ctc-platform, rama main). Antes de tocar nada lee, en este orden:
1. docs/componentes/directorio.md   ← tu charter
2. docs/ALINEACION.md               ← contratos transversales y el registro de permeación (§3)
3. AGENTS.md                        ← la compuerta y las reglas de la casa
La cuenta es la de toda la red; los documentos son privados y solo el hecho de la verificación es
público; la verificación es del ECP (pendiente con dueño «consolas» si tu tarea la necesita distinta).
Al terminar: compuerta completa, APP_VERSION + CHANGELOG, sello, push, verificación en vivo (curl al
subdominio), log de arquitectura, y «Pendientes» de este charter al día.
Hoy: <la tarea>.
```
