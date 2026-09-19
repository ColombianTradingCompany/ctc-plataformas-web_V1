# Plan · Identidad y accesos de la CTC Web Platform

> **ARCHIVADO 2026-09-11 · se conserva en su sitio porque el código lo cita.** Plan EJECUTADO (panel_users + partner_accounts, 2026-07-15/20). Lo vivo está en `docs/componentes/consolas.md`. El punto de partida de toda sesión es `docs/KICKOFF.md`.

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
  de consola, selector de consolas en `/panel`. ECP/OCP con módulos por construir.
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
- **Tier de partners — LO ESENCIAL CONSTRUIDO (2026-07-15).** `profiles.role='partner'` +
  tabla `partner_accounts` (service-role-only; `node_type` ∈ los 5 nodos, org/contacto,
  invited/active/suspended). Los 5 "pares" (landing + login) viven en `/socios/<nodo>`
  (config única `src/lib/partners/partners.ts`, contenido/colores/pantallas de la visión v3;
  logos en `public/images/socios/`): login single-factor (`/api/socios/auth/login` — rol
  partner + fila activa para EXACTAMENTE ese nodo; un socio jamás es bcp_admin) y panel
  scaffold tras `requirePartner()` con cambio de contraseña. Credenciales se emiten/revocan
  en **/bcp/socios** (owner-only). Subdominios mapeados en `proxy.ts`; DNS pendiente
  (`docs/PARTNER_DOMAINS_SETUP.md`). **Pendiente**: los flujos reales de cada módulo (los
  sellos del pasaporte), su espejo en el OCP, y la matriz de permisos fina — diseño abajo.

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
la identidad alcanza — paralelas, no anidadas. `/panel` es el selector de consolas neutro post-login.

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
   lee los grants por consola; sidebar/selector filtran por grants; cambio de contraseña
   forzado al primer login.
2. **Fase 2 — Un partner de punta a punta**: elegir el nodo más simple (probablemente
   Centro de Calidad), construir `partner_accounts` + `requirePartner`, su superficie,
   sus vistas estrechas y su sello, y el espejo correspondiente en el OCP. Validar la
   matriz de permisos con datos reales.
3. **Fase 3 — Resto de nodos + ECP**: los otros cuatro partners sobre el mismo patrón;
   construir los módulos reales del ECP (precios/primas, reservas, finanzas, salud de la
   red) y del OCP (despacho/seguimiento/excepciones sobre todos los nodos).

## Niveles por consola · qué puede hacer cada uno (decidido 2026-09-19, V5.57)

**Esta sección es la FUENTE de la regla.** `src/lib/panel/niveles.ts` la implementa y `scripts/qa-niveles-check.mjs` lee
ESTAS dos tablas y falla si el código dice otra cosa (la cifra de un guardián sale del plan, no del módulo que vigila).

**Por qué hubo que escribirla.** `panel_users.consoles` guarda un nivel por consola desde el 2026-07-15, y durante dos
meses **ningún código lo leyó**: `grantedConsoles()` solo preguntaba si la consola estaba concedida —`Boolean("viewer")` es
tan verdadero como `Boolean("admin")`— y las compuertas de escritura se conformaban con eso. Un «viewer» podía emitir una
oferta o adjudicar una subasta. Lo destapó una auditoría (2026-09-19), no un incidente: los dos colaboradores «viewer»
llevaban dos meses sin escribir nada.

Toda acción del servidor declara su **clase** —qué HACE—, y la clase decide qué nivel la ejecuta:

| Nivel | `lectura` | `borrador` | `emite` |
|---|---|---|---|
| `admin` | sí | sí | sí |
| `viewer` | sí | sí | no |

- **`lectura`** — no cambia nada: listar, cargar, firmar una URL para ver un archivo.
- **`borrador`** — crea o edita algo **interno**, que nadie fuera de la consola ve, que no dispara correo, evento, cobro ni
  gasto de IA, y que se puede deshacer.
- **`emite`** — todo lo demás: cambia lo que ve un productor, un comprador, un socio o el público; mueve dinero; gasta;
  notifica; concede permisos; borra. **En caso de duda es `emite`**, y es el valor por defecto de las cuatro compuertas
  (`requireConsoleWrite`, `permisoDeEscritura`, `coffeedGate`, `studioGate`): una acción nueva que olvide declararse queda
  cerrada al viewer, no abierta.

**La lista blanca de borradores** — corta a propósito; se amplía aquí primero y en el código después:

| Acción | Módulo | Por qué es un borrador |
|---|---|---|
| `createQuote` | BCP · cotizadores | una cotización nace como borrador; nadie la ve hasta `issueQuote` |
| `saveQuoteDraft` | BCP · cotizadores | guarda el borrador |
| `setQuoteCounterparty` | BCP · cotizadores | a quién iría dirigida; no se le avisa |
| `renameQuote` | BCP · cotizadores | el título interno |
| `duplicateQuote` | BCP · cotizadores | copia un borrador |
| `updateTranscriptInfo` | ECP · transcripciones | rotula una transcripción ya hecha |
| `renameSpeaker` | ECP · transcripciones | nombra una voz |
| `saveProposal` | BCP · Mapa de Trabajo | una propuesta es, por definición, algo que otro confirma |
| `setTaskState` | OCP · panel | la casilla de una tarea del tablero |
| `setEtapaComprador` | OCP · CRM Green | la excepción manual de la etapa; solo la lee ese tablero |
| `marcarContactado` | OCP · ECP · listas de espera | «ya le escribí»; se puede desmarcar |
| `marcarInteresTtContactado` | ECP · Terratalento | lo mismo |
| `setBuzonTags` | ECP · Buzón | etiquetas internas del correo; reversible |
| `markInboundEmailRead` | ECP · Buzón | leído / no leído; si un viewer no pudiera, abrir su propio correo fallaría en silencio |

**Lo que parece un borrador y NO lo es** (para que nadie lo «arregle»): `logProducerComm` —la nota sobre un productor—
**la ve el productor** en su panel; `guardarContexto` es la doctrina que lee la redacción asistida; `recordAnchor` alimenta
la lectura de mercado del PVC; `redactarContexto`, `scanFichaSoportes` y todo el Estudio de Coffeed **gastan** en IA;
`createTranscript`/`sendTranscriptToCloud` abren un trabajo que cuesta; **responder o reenviar un correo del Buzón
notifica a alguien de fuera**, y archivarlo lo mueve también en el buzón remoto; y borrar nunca es un borrador.

**Cómo se entera un viewer.** El rail de la consola dice «Lectura y borradores» bajo su nombre, y la acción responde con
un mensaje que explica qué pasó y a quién pedírselo — **sin tumbar la página**: `permisoDeEscritura` LANZA solo cuando no
hay sesión (inalcanzable desde una pantalla legítima) y DEVUELVE `{ ok:false, error }` cuando lo que falta es nivel. Los
botones siguen visibles; esconderlos es una tanda por consola, posterior. Siete acciones atadas a `<form action>` pasaron
a `ActionForm` para poder mostrar ese rechazo.

**Lo que NO cambia**: `is_owner` sigue gobernando usuarios y socios; cambiar la propia contraseña no pasa por estas
compuertas; el socio del Estudio de Contenido no tiene niveles (su credencial es para producir).

## Preguntas abiertas (decidir antes de la Fase 1)

1. ¿Los colaboradores entran solo con contraseña+OTP (como hoy) o también con Google?
   (Propuesta: solo contraseña+OTP — superficie mínima para lo interno.)
2. ~~¿Bastan dos niveles por consola (`admin`/`viewer`) o hace falta algo intermedio?~~ — **decidido por el owner el
   2026-09-19 (V5.57)**: bastan dos, pero el de abajo no es «solo mirar»: **lee y prepara borradores**. Ver «Niveles por
   consola», abajo.
3. ¿El owner puede ver/regenerar la contraseña temporal tras invitar (patrón leads) o
   solo reenviar la invitación?
4. Partners: ¿`role='partner'` en el enum de `profiles`, o tabla `partner_accounts`
   aparte con su propio auth? (Propuesta: tabla aparte, para no mezclar con el enum
   público y dejar el scoping por nodo/org explícito.)
