# Plan · Identidad y accesos de la CTC Web Platform

> Reconciliado con la visión v3 (`reference_html-vision-board/ctc-arquitectura-v3.html`)
> el 2026-07-15. Este documento sustituye al plan anterior (que solo contemplaba
> colaboradores internos con rol por módulo). El modelo v3 obliga a **dos capas
> de identidad distintas** — internos y partners — y a tratar BCP/ECP/OCP como
> **consolas paralelas**, no como pestañas de un mismo panel.

Estado por pieza:

- **Login maestro** — **CONSTRUIDO (2026-07-15).** Una sola puerta (`/login` + `/verify`)
  que abre las tres consolas internas con la misma sesión. Ver "Login maestro".
- **Consolas paralelas BCP / ECP / OCP** — **SCAFFOLD CONSTRUIDO (2026-07-15).**
  Árboles de ruta propios (`/bcp`, `/ecp`, `/ocp`), shell compartido con conmutador
  de consola, hub en `/panel`. ECP/OCP con módulos por construir.
- **Tier de colaboradores internos (`panel_users`)** — **FASE 1 COMPLETA (2026-07-15).**
  Tabla `panel_users` (service-role-only) + seed del fundador como owner activo con las
  tres consolas; OTP por usuario; guard `requireConsoleAccess` lee grants + status;
  `/bcp/usuarios` (owner-only) con invitar / suspender / reactivar / reenviar invitación /
  **restablecer contraseña** / **cambiar correo de entrega**.
- **Onboarding con correo de entrega (2026-07-15)** — **CONSTRUIDO.** El usuario de acceso
  puede ser una etiqueta `@ctcexport.com` **sin buzón**; `panel_users.delivery_email` es el
  buzón real donde llegan invitación, OTP de cada login y restablecimientos (vacío = al
  propio usuario de acceso, que entonces sí debe ser buzón real). Emails en
  `src/lib/email/panelEmails.ts`.
- **Cambio de contraseña forzado (2026-07-15)** — **CONSTRUIDO.** `must_change_password`
  se activa en invitación/reset; el guard redirige a `/cambiar-contrasena` (auth ligera
  propia, sin loop) hasta que el usuario cree su contraseña definitiva (≥10 chars, no
  contiene el usuario); audit_log `password_changed`.
- **Endurecimiento del write path (2026-07-15)** — **CONSTRUIDO.** Los 9 `requireAdmin()`
  por archivo delegan en `src/lib/panel/requireActiveAdmin.ts` (rol + `panel_users.status`):
  suspender revoca Server Actions al instante, no solo la navegación.
- **Correo entrante (Buzón)** — **CÓDIGO CONSTRUIDO (2026-07-15); ruta externa pendiente.**
  Webhook `POST /api/inbound-email` (firma Svix) → `inbound_emails` → BCP · Buzón. La
  entrega real (reenviador Hostinger → MX del subdominio `inbox.` → Resend Inbound) la
  configura el owner siguiendo `docs/INBOUND_EMAIL_SETUP.md`.
- **Tier de partners (interfaces delegadas)** — **PLAN.** Diseño abajo.

## La tesis de identidad de v3

> "Ningún actor se registra solo. Cada credencial nace en el BCP y se entrega con
> un alcance definido. CTC administra lo que esas credenciales alcanzan a ver."

Pero **la puerta pública sigue siendo libre**: Kaffetal Regal (productor) y Cherry
Picked (comprador) son de auto-registro — con la salvedad del **Pasaporte del
Kaffetal Club** del lado del productor. Lo que "nace en el BCP" son las credenciales
**internas y de partner**, no las cuentas públicas. De ahí las **dos capas**:

| Capa | Quién | Cómo entra | Rol Supabase | Superficie |
|---|---|---|---|---|
| **Pública** | Productores, compradores | Auto-registro (email/Google) | `producer` / `buyer` | Kaffetal Regal · Cherry Picked |
| **Interna** | Equipo CTC (2 fundadores hoy; colaboradores después) | Login maestro (password+OTP), credencial emitida en BCP | `bcp_admin` | BCP · ECP · OCP |
| **Partner** | Centro de Calidad, Agente de Carga, Agente de Nacionalización, Master Roaster, Estudio de Contenido | Login maestro, credencial emitida en BCP, revocable en un clic | `partner` (nuevo) | Su módulo, y solo el suyo |

**Decisión clave de seguridad (corrige el plan anterior):** un partner **NO es
`bcp_admin`**. El plan viejo metía a todo colaborador bajo `bcp_admin` acotado por
grants de módulo; para el equipo interno funciona, pero para un actor externo
(p. ej. el Master Roaster) es un footgun: cualquier `requireAdmin()` sin migrar le
abriría el panel entero. Los partners son un **tier propio**, con su rol, su
scoping a un tipo de nodo + su organización, y su RLS, guiados por la **matriz de
permisos** (ver abajo). Su acceso se verifica con `requirePartner(...)`, jamás con
el gate de admin.

## Login maestro (construido)

Una sola puerta para toda la capa interna y de partner:

- `/login` → `POST /api/panel/auth/password` (verifica contraseña con un cliente
  efímero; hoy exige `role='bcp_admin'`; emite OTP; parquea la sesión en cookie
  httpOnly `panel_pending`).
- `/verify` → `POST /api/panel/auth/verify` (consume el OTP; recién ahí promueve la
  sesión real) → redirige a `/panel`.
- `/api/panel/auth/logout` → cierra sesión → `/login`.
- Las URLs viejas `/bcp/login` y `/bcp/verify` **redirigen** a `/login` y `/verify`.
- El OTP hoy va a **una dirección fija** (`sendOtpEmail`, correo de seguridad de CTC).
  Con dos fundadores basta; con colaboradores debe ir **al correo de cada usuario**
  (ver Fase 1 abajo).

Punto de extensión ya dejado listo: `src/lib/panel/requireConsoleAccess.ts` decide
qué consolas alcanza una identidad. Hoy todo `bcp_admin` alcanza las tres; cuando
exista `panel_users`, ahí se leen los grants por módulo sin tocar los call sites.
El router post-login (`/panel`) ya reenvía directo si la identidad alcanza una sola
consola — justo lo que necesita un partner (una sola superficie).

## Consolas paralelas (scaffold construido)

Tres árboles de ruta independientes, un shell compartido
(`src/components/panel/PanelShell.tsx` + `PanelSidebar.tsx`), configurados desde una
sola fuente (`src/lib/panel/consoles.ts`):

- **BCP · Base Control Panel** (`/bcp`) — identidad y pasaporte del lote. Todo lo que
  ya existía. La gestión de **Usuarios y credenciales** vive aquí (identidad es tarea
  del BCP en v3).
- **ECP · Executive Control Panel** (`/ecp`) — dirección: precios, primas, finanzas,
  libro de reservas, alta/baja de partners, salud de la red. La única consola que ve
  todo el modelo a la vez.
- **OCP · Operational Control Panel** (`/ocp`) — el espejo de cada interfaz de partner:
  despacho, seguimiento, excepciones, relevos.

> **Corrección de nombres:** el scaffold anterior tenía ECP="Execution" y OCP="Operation"
> con significados casi invertidos respecto a v3. La fuente de verdad es v3:
> **ECP = Executive** (dirección), **OCP = Operational** (ejecución/espejo de partners).

El conmutador de consola (arriba de la sidebar) permite saltar entre las consolas que
la identidad alcanza — paralelas, no anidadas. `/panel` es el hub neutro post-login.

## Tier interno · `panel_users` (plan)

Tabla `panel_users` — **service-role-only** (RLS activado, cero policies), como
Arena/leads/club:

| Columna | Notas |
|---|---|
| `profile_id` uuid PK → profiles | ON DELETE CASCADE. El colaborador ES un usuario auth con `role='bcp_admin'` (mantiene compatibles todos los `requireAdmin()`/`requireConsoleAccess` existentes) |
| `email` text | copia estable para la UI y el envío de OTP |
| `display_name` text | |
| `is_owner` boolean | fundadores; solo un owner gestiona usuarios y no puede auto-degradarse (siempre ≥1 owner activo) |
| `consoles` jsonb | `{ "bcp": "admin"\|"viewer", "ecp": …, "ocp": … }` — ausencia = sin acceso a esa consola |
| `status` enum | `invited` → `active` → `suspended` |
| `invited_by`, `invited_at`, `activated_at`, `suspended_at`, `last_login_at` | rastro |
| `invite_email_sent_at`, `invite_email_error` | patrón leads/club: envíos rastreados con botón de reintento |

`profiles.role = 'bcp_admin'` se mantiene como la **puerta gruesa** (el modelo de
guards/RLS no se toca); `panel_users.consoles` añade la capa fina por consola. Un
colaborador suspendido conserva el role pero `requireConsoleAccess` lo rechaza.

**Flujo de invitación:** owner llena email + nombre + consolas en `/bcp/usuarios`
(Server Action service-role) → se crea el usuario auth **pre-confirmado** vía admin
API (mismo mecanismo de los QA scripts — evita el SMTP default de Supabase) con
contraseña temporal, `role='bcp_admin'`, fila `panel_users(status='invited')` → email
de invitación vía Resend/`EMAIL_FROM` con enlace a `/login` + contraseña temporal →
primer login exitoso ⇒ `status='active'` + cambio de contraseña forzado.

**Cambios al login (Fase 1):** el OTP deja de ir al destinatario fijo y viaja **al
email del `panel_users` que entra**; el paso de password exige que el email exista en
`panel_users` con `status ∈ {active, invited}`; `last_login_at` se estampa al verificar.

## Tier partner · interfaces delegadas (plan)

El corazón del modelo v3. Cada partner recibe **su módulo y solo su tramo del
pasaporte**, según la **matriz de permisos** (v3, tab "BCP · credenciales"): 9 roles ×
15 campos del pasaporte, cada celda escribe/lee/nada. Ejemplos: el Agente de Carga
escribe booking/BL/tracking pero **no ve** la prima ni el precio en Europa; el Estudio
de Contenido tiene **máxima lectura narrativa y cero acceso a la plata**.

Modelo propuesto (a refinar antes de construir):

- Nuevo valor de rol `partner` en el enum de `profiles` (o tabla `partner_accounts`
  service-role-only análoga a `panel_users`), con:
  - `node_type` — `centro_calidad` | `agente_carga` | `agente_nacionalizacion` |
    `master_roaster` | `estudio_contenido`.
  - `partner_org` — la organización (dos proveedores homologados por nodo desde el día
    uno, ver "Falla 02" en v3; mismo módulo, credencial distinta).
  - `status` invited/active/suspended, mismo rastro que `panel_users`.
- Un helper `requirePartner(nodeType)` — sesión + `role='partner'` + `node_type` correcto
  + `status='active'`. **Nunca** reutiliza el gate de admin.
- La **matriz de permisos** se codifica como la fuente de verdad del scoping: qué campos
  del pasaporte del lote puede leer/escribir cada `node_type`. Las lecturas de partner
  van por **vistas `SECURITY DEFINER` de columnas estrechas** (patrón ya usado en
  `public_lot_catalog`), no por RLS amplio sobre `lots`/`fincas` — así un partner nunca
  ve el expediente completo. Las escrituras (su "sello") van por Server Actions
  `requirePartner`, con guard de columnas como el resto de tablas escribibles.
- Su superficie es un árbol de ruta propio por nodo (p. ej. `/socios/centro-calidad`),
  con el mismo shell/patrón que las consolas pero sin conmutador — un partner ve una
  sola cosa. El OCP es el **espejo interno** de estas superficies.

## Autorización — resumen de gates

- `requireConsoleAccess(console)` — interno; sesión + `bcp_admin` (+ grant de consola
  cuando exista `panel_users`). Usado por los shells de BCP/ECP/OCP.
- `requireAdmin()` (en cada Server Action de BCP) — sin cambios; defensa en profundidad
  en el write path.
- `requirePartner(nodeType)` — **por construir**; nunca cruza con el gate de admin.
- Los guards `BEFORE UPDATE` + RLS existentes no se tocan; el partner añade sus propias
  vistas estrechas + guards.

## Fases

1. **Fase 1 — Colaboradores internos**: migración `panel_users` + seed de los dos
   fundadores como `is_owner` con las tres consolas; OTP por usuario; `/bcp/usuarios`
   con invitar/suspender/reactivar + email de invitación con retry; `requireConsoleAccess`
   lee los grants por consola; sidebar/hub filtran por grants; cambio de contraseña
   forzado al primer login.
2. **Fase 2 — Un partner de punta a punta**: elegir el nodo más simple (probablemente
   Centro de Calidad), construir `partner_accounts` + `requirePartner`, su superficie,
   sus vistas estrechas y su sello, y el espejo correspondiente en el OCP. Validar la
   matriz de permisos con datos reales.
3. **Fase 3 — Resto de nodos + ECP**: los otros cuatro partners sobre el mismo patrón;
   construir los módulos reales del ECP (precios/primas, reservas, finanzas, salud de la
   red) y del OCP (despacho/seguimiento/excepciones sobre todos los nodos).

## Preguntas abiertas (decidir antes de la Fase 1)

1. ¿Los colaboradores entran solo con contraseña+OTP (como hoy) o también con Google?
   (Propuesta: solo contraseña+OTP — superficie mínima para lo interno.)
2. ¿Bastan dos niveles por consola (`admin`/`viewer`) o hace falta algo intermedio?
3. ¿El owner puede ver/regenerar la contraseña temporal tras invitar (patrón leads) o
   solo reenviar la invitación?
4. Partners: ¿`role='partner'` en el enum de `profiles`, o tabla `partner_accounts`
   aparte con su propio auth? (Propuesta: tabla aparte, para no mezclar con el enum
   público y dejar el scoping por nodo/org explícito.)
