# Charter · `secretaria` — Secretaría CTC (el espejo plataforma ↔ Notion ↔ Google)

> Se lee con `docs/ALINEACION.md` al lado y con `docs/SECRETARIA_PLAN.md` (el escaneo, la doctrina
> completa, la tabla de correspondencias y la bitácora). Grupo de la barra lateral:
> **Secretaría CTC (Notion · Google)**. Es un componente **de agente**, no de superficie: casi todo su
> trabajo ocurre en Notion y en Make, y solo una parte pequeña en el código (la espina).

## Qué es

La Secretaría mantiene a **Notion como la interfaz principal del equipo** sin que Notion se convierta
en una segunda verdad. La plataforma sigue siendo la fuente de lo que gestiona (productores, fincas,
lotes, fichas, grados, cotizaciones, leads, credenciales, superficies); Notion **refleja** eso — con
una propiedad que dice de dónde viene — y **puede tener más** (prospectos, contactos, orgs sin cuenta).
Google entra por tres puertas: Calendar/Meet (reuniones y jornadas), Drive (el archivo de Notion) y
Contacts (el directorio personal, ida y vuelta).

Tiene dos brazos:

1. **El agente** — una sesión de Claude Code de este grupo, con los conectores (Notion, Drive, Gmail,
   Calendar, Make, Supabase **solo lectura**) y los charters como contexto. Concilia, migra, audita,
   reescribe prosa de Notion y crea/actualiza páginas **con disciplina de `ctc_id`**. Nunca escribe en
   Postgres, nunca borra páginas, nunca toca credenciales.
2. **La espina** — los espejos continuos por eventos (`integration_events` → Make → Notion), que ya
   existen para cotizaciones y jornadas y que `consolas` extiende a productores, fincas, lotes, leads
   y socios (plan §4 F1). La Secretaría los **pide y verifica**; no los construye.

## Superficies y rutas

No tiene superficie propia. Lo que toca:

| Sistema | Dónde |
|---|---|
| Notion | las bases de la tabla de correspondencias (plan §3): Lista de Proveedores · Lista de Fincas · Fichas Técnicas de Café · Grados de Calidad CTC · Cotizaciones CTC · Clientes Potenciales · Directorio de Partners · Directorio de Contactos Personales · Personal · Reuniones Generales · Objetivos y Tareas · Plataformas Web CTC |
| Google | Calendar (`ctcexportmain`, `GVG`, `GVB`, **«CTC · Operación»**), Drive (`A. Docs Temp`, `D. Carpetas Auxiliares Permanentes/<Directorio> (AUX)`), Gmail (etiquetas 0–6), Contacts (vía Make, pendiente) |
| Make | org 3400730 · team 1569723: escenarios 9621729 (eventos de la plataforma), 9621737 (Nota comercial → CTC), 9622256 (Gmail por dominio) |
| Plataforma | `/ecp/automatizaciones` (el registro), `/api/integraciones/[canal]` (la puerta), y de solo lectura todo lo demás |

## Mapa de código

- `src/lib/integraciones/{emit,dominios,dispatch,aplicar}.ts` — la espina (propietario: `plataforma`;
  los manejadores entrantes nuevos los añade `consolas`, uno por tipo, nunca genéricos).
- `src/app/api/integraciones/[canal]/route.ts` — un secreto por canal (`INTEGRACIONES_SECRET_MAKE`).
- `scripts/qa-espejo-notion.mjs` — la prueba de vida del espejo F2 (cotizaciones).
- `docs/INTEGRACIONES_PLAN.md` — la doctrina de zonas (A: Postgres manda · B: Notion manda · C: la
  frontera = espejo, no sincronización). `docs/SECRETARIA_PLAN.md` la completa.
- Pendiente de nacer (F1): `notion_espejos`, `scripts/espejo-reporte.mjs`.

## Tablas que posee

Ninguna todavía. **Leerá** (solo lectura, por MCP): `profiles`, `producer_profiles`, `fincas`, `lots`,
`lot_fichas`, `lot_evaluations`, `quotes`, `leads`, `buyer_profiles`, `partner_accounts`, `panel_users`,
`platform_surfaces`, `transcripts`, `integration_events`, `automations`. En F1, `consolas` crea
**`notion_espejos`** (entidad · entidad_id · notion_page_id · notion_url · synced_at; service-role-only)
y esa tabla pasa a ser de este componente.

## Guardianes

`qa-espejo-notion.mjs` (F2, cotizaciones) y `qa-integraciones-check.mjs` (dominios = enum). Propio,
pendiente: **`espejo-reporte.mjs`** — solo lectura; imprime filas de la plataforma sin espejo y páginas
de Notion con `ctc_id` huérfano. En Notion no hay guardián: la disciplina es el §Reglas.

## Reglas propias

- **Tres propiedades en toda base espejada**: `ctc_id` (no editar) · `CTC` (select `OCP`·`ECP`·`BCP`·`CP`,
  vacío = solo Notion) · `Enlace CTC`. Los campos que manda la plataforma llevan en su descripción
  «Lo manda la plataforma. Cambiarlo aquí no cambia nada allí» (como ya hace Cotizaciones CTC).
- **Espejo, no sincronización**: de Notion vuelve solo lo que tenga manejador con nombre en
  `aplicar.ts`. Nunca «el registro entero».
- **Conciliar es humano**: por `ctc_id`; si no, por correo; si no, por nombre normalizado — y en esos
  dos casos el agente **propone y el owner confirma** antes de escribir. Nunca fusiona ni borra.
- **Google Contacts ↔ Notion por campos con dueño** (Google: nombre · teléfonos · correos · empresa;
  Notion: Role · Key Contact Facts · notas · relaciones); llaves cruzadas en ambos lados; lo ajeno se
  reporta, no se propaga.
- **Drive es el archivo de Notion; Storage el de la plataforma**: enlaces, no copias.
- **Excluidos del espejo por regla**: cuentas `prueba-*`, fincas no aprobadas, lotes antes de
  `galardonado` (salvo decisión del owner, plan §5.5).
- **Presupuesto**: SQL sobre data sources para leer; escritura página a página; corridas de más de
  100 páginas se anuncian antes (el agente de Notion agotó un mes de tokens en una corrida, 11.07).
- **Cada corrida deja una fila en la bitácora** (`SECRETARIA_PLAN.md` §6).

## Lo que las consolas gobiernan de este componente

| Quién | Qué | Dónde |
|---|---|---|
| ECP · Automatizaciones | el registro de cada escenario de Make (propósito, dominio, criticidad, ciclo de vida) | `automations` |
| consolas (OCP/BCP/ECP) | los eventos que la espina emite y los manejadores entrantes; `notion_espejos`; `espejo-reporte` | `src/lib/integraciones/*`, F1 del plan |
| BCP · Socios | qué orgs de Notion son nodo (`Nodo CTC`) y en qué estado está su credencial | `partner_accounts` |
| ECP · Manejo de Plataformas | la fila de cada superficie que Plataformas Web CTC refleja | `platform_surfaces` |

## Pendientes

- **F0** (esta semana, sin código): propiedades `ctc_id`/`CTC`/`Enlace CTC` en Proveedores, Fincas,
  Fichas y Clientes; limpiar la relación duplicada «Lista de Proveedores 1» y el data source vacío de
  Proveedores; proponer las coincidencias (Doña Hortencia ↔ Hortencia PALMAS · Hacienda Calapo ↔ «Finca
  calapo» · La Pradera y La Fortaleza sin cuenta · La Ceiba fuera de la Lista de Fincas); reescribir la
  prosa de «Grados de Calidad CTC» desde su base (la base ya coincide con `definicion.ts`; la prosa no).
- **Dos contraseñas en claro** en títulos de páginas de Objetivos y Tareas (cuentas de KR): sacarlas y
  rotarlas — **owner**; la Secretaría solo señala.
- **Google Contacts**: no hay conector en Claude ni conexión en Make — **owner** crea la conexión (o
  elige Apps Script); después F2.
- **F1** con dueño `consolas`: `notion_espejos`, seis eventos nuevos, manejadores `<entidad>.espejada`,
  ramas en el escenario 9621729, `espejo-reporte.mjs`. Una versión.
- **F3**: Plataformas Web CTC con versión viva y charter; Reuniones ↔ `transcripts`; Objetivos y Tareas ↔
  «Pendientes» de los charters con propiedad `Componente`.
- Datos de humo en producción (cuentas y fincas de prueba fuera de `prueba-*`): lista previa y limpieza
  desde el BCP antes de conciliar (owner, plan §5.6).

## Kick-off

```
Trabajas SOLO en el componente «Secretaría CTC» (clave: secretaria) de la plataforma CTC
(repo C:\dev\ctc-platforms\ctc-platform, rama main). Eres el ESPEJO entre la plataforma, Notion y
Google: la plataforma manda en lo que gestiona; Notion lo refleja con ctc_id · CTC · Enlace CTC y
puede tener más; de Notion vuelve solo lo que tenga manejador con nombre. Antes de tocar nada lee:
1. docs/componentes/secretaria.md   ← tu charter (reglas: conciliar es humano, nunca borrar, nunca Postgres)
2. docs/SECRETARIA_PLAN.md          ← el escaneo, la tabla de correspondencias (§3), las decisiones (§5) y la bitácora (§6)
3. docs/ALINEACION.md               ← contratos transversales (el espejo es uno) y el registro de permeación (§3)
4. el charter del componente cuya base vayas a espejar (kaffetal-regal, consolas, cherry-picked…)
Herramientas: Notion (fetch/query SQL para leer; create/update página a página para escribir), Drive,
Gmail, Calendar, Make (lectura de escenarios y ejecuciones) y Supabase SOLO LECTURA. Propón cada
coincidencia por correo o nombre y espera mi confirmación antes de escribir el ctc_id; anuncia antes
cualquier corrida de más de 100 páginas. Lo que exija código (eventos, tablas, manejadores) es
pendiente con dueño «consolas» y una línea en ALINEACION §3, no lo escribes tú.
Al terminar: fila en la bitácora del plan (§6), «Pendientes» de este charter al día, y si tocaste
una base que otro componente refleja, su charter lo sabe.
Hoy: <la tarea>.
```
