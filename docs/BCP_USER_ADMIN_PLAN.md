# Plan · Administración de usuarios del panel (BCP / ECP / OCP)

Estado: **PLAN — no implementado.** Scaffolding visible: `/bcp/usuarios` (Próximamente) y los grupos de módulos en la sidebar. Este documento es el diseño acordado de partida; se refina antes de construir.

## Qué existe hoy (y por qué no escala)

- El panel tiene **un solo tipo de operador**: `profiles.role = 'bcp_admin'`, verificado en el layout y re-verificado en cada Server Action (`requireAdmin()`).
- El login es contraseña + OTP de 2 factores, pero el OTP se envía a **una dirección fija por entorno** (`BCP_OTP_RECIPIENT_EMAIL`, fallback al correo del fundador) — no al correo del usuario que intenta entrar. Con dos fundadores funciona; con colaboradores externos no.
- No hay forma de invitar, limitar ni revocar a nadie desde la UI: dar acceso hoy = crear el usuario a mano y voltearle el `role` (el "footgun" documentado: cualquier flip accidental deja fuera al admin).

## Objetivo

Que un **fundador (owner)** pueda, desde `/bcp/usuarios`:
1. Invitar a un colaborador por su **propio email**.
2. Concederle acceso **por módulo** (BCP · Negocio, ECP · Ejecución, OCP · Operación) con un nivel por módulo.
3. Ver su estado (invitado / activo / suspendido) y **revocarlo** al instante.

Todo configurado dentro de BCP; nada por consola ni SQL manual.

## Modelo de datos (propuesto)

Nueva tabla `panel_users` — **service-role-only** (RLS activado, cero policies), como Arena/leads/club:

| Columna | Notas |
|---|---|
| `profile_id` uuid PK → profiles | ON DELETE CASCADE. El colaborador ES un usuario auth normal con `role='bcp_admin'` (mantiene compatibles todos los `requireAdmin()` existentes) |
| `email` text | copia estable para la UI y el envío de OTP |
| `display_name` text | |
| `is_owner` boolean | fundadores; solo un owner gestiona usuarios y no puede auto-degradarse (siempre ≥1 owner activo) |
| `modules` jsonb | `{ "bcp": "admin" \| "viewer", "ecp": …, "ocp": … }` — ausencia = sin acceso |
| `status` enum | `invited` → `active` → `suspended` |
| `invited_by`, `invited_at`, `activated_at`, `suspended_at`, `last_login_at` | rastro |
| `invite_email_sent_at`, `invite_email_error` | patrón leads/club: sends rastreados con botón de reintento |

Decisión deliberada: **`profiles.role = 'bcp_admin'` se mantiene como la puerta gruesa** (el modelo de guards/RLS existente no se toca); `panel_users` añade la capa fina por módulo. Un colaborador suspendido conserva el role pero `requireAdmin()` lo rechaza (ver Autorización).

## Flujo de invitación

1. Owner llena email + nombre + módulos en `/bcp/usuarios` (Server Action `invitePanelUser`, service-role).
2. Se crea el usuario auth **pre-confirmado** vía admin API (mismo mecanismo de los QA scripts — evita el SMTP default de Supabase, ver gotcha de KR signups) con contraseña temporal aleatoria, `profiles.role='bcp_admin'`, y la fila `panel_users(status='invited')`.
3. Email de invitación vía **Resend/EMAIL_FROM** (plantilla en `src/lib/email/`, como leads/club): enlace a `/bcp/login` + contraseña temporal (mismo trade-off ya aceptado en leads) y la instrucción de cambiarla al entrar.
4. Primer login exitoso ⇒ `status='active'`, `activated_at`, y se fuerza cambio de contraseña.

## Cambios al login (los importantes)

- `sendOtpEmail` deja de usar el destinatario fijo por env: el OTP viaja **al email del `panel_users` que está entrando**. `BCP_OTP_RECIPIENT_EMAIL` queda solo como override de emergencia del owner.
- El paso de password-verify añade el check: el email debe existir en `panel_users` con `status='active'` (o `invited`, para el primer ingreso).
- `last_login_at` se estampa al verificar el OTP.

## Autorización por módulo

- Nuevo helper `requirePanelUser(module?: "bcp" | "ecp" | "ocp", level?: "admin")` en `src/lib/bcp/` que:
  1. hace lo que hoy hace `requireAdmin()` (sesión + `role='bcp_admin'`),
  2. carga `panel_users` y rechaza si `status !== 'active'` (⇒ **revocación efectiva al instante**, porque cada Server Action re-verifica),
  3. si se pide módulo, exige el grant correspondiente.
- Migración incremental: los `requireAdmin()` existentes se van reemplazando por `requirePanelUser("bcp")` acción por acción; ECP/OCP nacen ya con el helper.
- La sidebar filtra los grupos según los grants del usuario; `/bcp/usuarios` solo para `is_owner`.
- Los dos fundadores se siembran como `is_owner` con los tres módulos en una migración de datos.

## Auditoría y seguridad

- `audit_log` para `panel_user_invited / modules_changed / suspended / reactivated` (entity_type `panel_user`).
- La tabla es service-role-only: ningún JWT de colaborador puede leerla ni editarla; toda mutación pasa por Server Actions de owner.
- El guard `guard_profiles_protected_columns` ya impide que nadie se auto-asigne `role` — sin cambios.
- Suspender ≠ borrar: el rastro (quién evaluó, quién publicó) referencia `profiles` y se conserva.

## Fases

1. **Fase 1 — Núcleo**: migración `panel_users` + seed de owners; OTP por usuario; `/bcp/usuarios` con invitar / suspender / reactivar; email de invitación con retry.
2. **Fase 2 — Módulos**: `requirePanelUser` con grants; sidebar filtrada; ECP/OCP protegidos por su grant desde el día uno.
3. **Fase 3 — Pulido**: cambio de contraseña forzado al primer login, edición de grants, auditoría visible en la ficha del usuario, y (opcional) expiración de invitaciones no usadas.

## Preguntas abiertas (decidir antes de la Fase 1)

1. ¿Los colaboradores entran solo con contraseña+OTP (como hoy) o también quieren Google? (Propuesta: solo contraseña+OTP — superficie mínima.)
2. ¿Bastan dos niveles por módulo (`admin` / `viewer`) o se necesita algo intermedio (p. ej. "editor" que no puede cerrar Arena ni firmar contratos)?
3. ¿El owner puede ver/regenerar la contraseña temporal después de invitar (patrón leads) o solo reenviar la invitación?
