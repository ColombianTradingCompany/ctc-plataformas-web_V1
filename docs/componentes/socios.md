# Charter · `socios` — Red de Socios (los cinco nodos partner)

> Se lee con `docs/ALINEACION.md` al lado. Grupo de la barra lateral: **Red de Socios** — **una
> conversación por nodo** (Centro de Calidad · Agente de Carga · Agente de Nacionalización · Master
> Roaster · Estudio de Contenido). Atado a las consolas: **BCP · Socios** emite y suspende la
> credencial de cada nodo; **OCP** opera lo que cada nodo sella en el pasaporte del lote.

## Qué es

Los cinco **nodos delegados** de la red orquestada v3 (`reference/html-vision-board/ctc-arquitectura-v3.html`):
CTCx orquesta el pasaporte del lote **y participa en él con las mismas reglas que exige** —hace el acopio, el
procesamiento y el empacado en origen (owner, 2026-09-17, `PVC_BCP_PLAN.md` §14 n.º 1; hasta entonces este charter
decía «no toca un grano ni un contenedor»)— y cada nodo pone el oficio y **sella** su tramo. Cada nodo es una **pareja** en `/socios/<slug>`: una landing pública (qué hace, por
qué se delega, qué sella, sus pantallas) + un login de credencial (`/acceso`) + un panel (`/panel`).
Los socios son un **tier de identidad aparte**: `profiles.role = 'partner'` + una fila activa en
`partner_accounts` para exactamente un nodo — **nunca `bcp_admin`**.

| Nodo (`slug`) | Rol | Sella en el pasaporte | Panel hoy |
|---|---|---|---|
| **Centro de Calidad** (`centro-calidad`) | trilla, monitoreo y selección óptica · pergamino → verde | merma + humedad + verde liberado | **Evaluación de Lotes construido (V5.81)**: `panel/evaluacion` — los baches `en_centro` a su nombre, cada lote anónimo (solo el código), planilla SCA o CVA + factor + mallas + rueda, «dar de alta» → `lot_evaluations` pendiente que CTCx confirma; módulos activables desde BCP (`modulos`). Procesamiento de Lotes: scaffold (Etapa 3) |
| **Agente de Carga** (`agente-carga`) | flete internacional · Colombia → Europa | booking + BL + ETA | scaffold (Lotes listos · Booking · Documentos · Tracking) |
| **Agente de Nacionalización** (`agente-nacionalizacion`) | aduana en destino · importación en la UE | nacionalizado + DDS enlazada | scaffold (Contenedores en tránsito · Expediente aduanero · Liquidación · Liberación) |
| **Master Roaster** (`master-roaster`) | el pivote de destino · bodega, tueste, empaque, última milla | recepción + tueste + despacho | scaffold (Contenedor en camino · Bodega · Desconsolidación y ruta · Cola de tueste · Empaque y despacho) |
| **Estudio de Contenido** (`estudio-contenido`) | la voz de la red · producción de contenido | video de Arena + assets del lote | **construido**: el taller de Coffeed (Source Wrapper · Datawave · RT-Scriptor) — charter `coffeed` |

## Superficies y rutas

| Ruta | Qué |
|---|---|
| `/socios/[partner]` | landing del nodo (`PARTNERS[slug]`: rol, qué hace, por qué, sello, pantallas, color y logo) |
| `/socios/[partner]/acceso` | login de credencial (`PartnerLoginForm` → `POST /api/socios/auth/login`; logout en `/logout`) — un solo factor, por diseño |
| `/socios/[partner]/panel` | el panel (`requirePartner(slug)`: sesión + `role partner` + fila activa de ESE nodo + sus `modulos`); cambio de contraseña (`PartnerPasswordCard`); en el Estudio, `panel/{source-wrapper,datawave,rt-scriptor}` |
| `/socios/centro-calidad/panel/evaluacion` | **Evaluación de Lotes** (V5.81): los baches en manos de esa credencial, lote a lote anónimo, la planilla (`LabEvalEditor`: SCA o CVA, factor, mallas, rueda) y «dar de alta» (`evaluacionActions.ts`: `registrarEvaluacion`, `anularRegistro`; compuerta `getPartnerIdentity("centro-calidad")` + `modulos.evaluacion`) |
| `/bcp/socios` · `/bcp/socios/[nodo]` | **backstage** (consolas): alta, baja, reenvío de invitación; la **ficha de estado por nodo** (V4.31: quién tiene credencial, en qué estado, último acceso, qué sella) |
| subdominios | `centro-calidad.*` · `agente-carga.*` · `agente-nacionalizacion.*` · `master-roaster.*` · `ctc-content.*` (`src/lib/red/subdominios.ts`) |
| `/recuperar-acceso?puerta=<nodo>` | la puerta de servicio común (charter `plataforma`) |

## Mapa de código

- `src/lib/partners/partners.ts` — **fuente única** de los cinco nodos (`PARTNERS`, `PartnerSlug`,
  `isPartnerSlug`); copy y colores vienen del vision board. `src/lib/partners/requirePartner.ts` (la
  compuerta del panel: redirige a `/socios/<slug>/acceso` si falta cualquiera de las tres condiciones; V5.81:
  `getPartnerIdentity` es la misma compuerta SIN redirect, para las Server Actions, y la identidad trae `modulos`).
- **Centro de Calidad · Evaluación de Lotes** (V5.81): `src/app/socios/[partner]/panel/evaluacion/{page,PlanillaCentro}.tsx`,
  `panel/evaluacionActions.ts`; la planilla es `src/components/bcp/LabEvalEditor.tsx` + `src/lib/arena/labEvaluation.ts`
  (SCA / CVA, `computeCva`) y la rueda `src/lib/catacion/rueda.ts` (los tres de `consolas`).
- `src/app/socios/layout.tsx`, `src/app/socios/[partner]/{page,acceso/page,panel/page}.tsx`,
  `panel/actions.ts`, `socios.module.css`; `src/app/api/socios/auth/{login,logout}/route.ts`.
- `src/app/bcp/(app)/socios/{page,SociosClient}.tsx`, `[nodo]/page.tsx`, `sociosActions.ts` (invitación
  por Resend con resultado guardado en la fila; KPI de invitaciones fallidas).
- Open Graph: `generateMetadata` sobre `PARTNERS` (una tarjeta por nodo); JSON-LD declara a **CTC**, no al
  socio (los nodos son puertas de esta casa).
- Docs: `docs/PARTNER_DOMAINS_SETUP.md` (los 5 subdominios), `docs/archive/HANDOFF_cronologia_2026-07_09.md`
  §«Partners (2026-07-15)» y §«Red de Socios — una ficha por nodo (V4.31)».

## Tablas que posee

`partner_accounts` (service-role-only: `profile_id` PK → `profiles`, `node_type` CHECK contra los 5 slugs,
`org_name`, `contact_name`, `status` invited/active/suspended, rastro de invitación, **`delivery_email`** —
el buzón real, distinto del correo de acceso, que puede ser una etiqueta sin buzón como
`estudio-contenido@ctcexport.com`, **`modulos`** jsonb — V5.81: `{evaluacion, procesamiento}`, lo conmuta el owner en
`/bcp/socios/[nodo]`). Solo lee: `profiles`. Lo que el Estudio produce vive en `coffeed_*` (charter `coffeed`). El Centro de
Calidad **escribe** `lot_evaluations` (procedencia `q_grader_batch`, `pending`; con `batch_id`, `escala`, `rueda`, `uid_anonimo`)
por Server Action con el service role — la tabla es de `consolas`. Ningún otro nodo tiene tablas operativas todavía.

## Guardianes

**`qa-centro-calidad-check.mjs`** (65, V5.81 — el paso 11 del folio: la pantalla y las acciones del Centro no leen productor,
finca, variedad ni ficha; el módulo se activa por credencial y el Q-Grader firma con su contacto; registrar ≠ confirmar; la
fórmula del CVA y la rueda única). Lo tocan también `qa-recuperacion-check.mjs` (las cinco puertas de socio) y
`qa-rutas-consolas` (el rail de `/bcp/socios`).

## Reglas propias

- **Un socio nunca es `bcp_admin`**, y una credencial vale para **exactamente un nodo** (`node_type`).
- **Correo de acceso ≠ buzón**: la identidad puede ser una etiqueta sin buzón; la invitación y los
  restablecimientos viajan al `delivery_email`, y el correo de invitación dice cuál es el usuario.
- **Una credencial suspendida no se reactiva sola** y la suspensión gana a Google en el veredicto de
  «Recuperar acceso».
- El panel de un nodo se construye **nodo a nodo, en su propia interfaz**; la ficha del BCP es de ESTADO,
  no de operación — lo único que escribe (V5.81) son los **módulos** que activa una credencial del Centro de Calidad,
  porque eso es configuración de la credencial.
- **El Centro de Calidad evalúa a ciegas**: su pantalla y sus acciones no leen productor, finca, variedad ni ficha — solo el
  bache, el código corto del lote y los gramos de la muestra (`qa-centro-calidad`). Registrar ≠ confirmar: el Q-Grader da de
  alta, CTCx confirma el veredicto en el OCP.
- Máxima lectura narrativa, **cero acceso al dinero** para el Estudio (vision board): ningún panel de
  socio ve precios, contratos ni datos comerciales del productor — si algún día uno los necesita, es una
  vista `SECURITY DEFINER` estrecha, nunca una política ancha.

## Lo que las consolas gobiernan de este componente

| Quién | Qué | Dónde |
|---|---|---|
| BCP · Socios | emitir, reenviar, suspender y revocar la credencial de cada nodo; la ficha de estado | `sociosActions.ts`, `/bcp/socios/[nodo]` |
| OCP | lo que cada sello significa en el pasaporte: liberación de verde (Centro de Calidad), booking/BL (Carga), DDS y nacionalización (Nacionalización), recepción y tueste (Roaster) — **hoy sin módulo de OCP que los reciba** | pendiente por nodo |
| BCP · Coffeed (del ECP hasta la V5.59) | el trabajo del Estudio (luz verde, publicar) | charter `coffeed` |
| BCP · Manejo de Plataformas | título, descripción y sitemap de los cinco subdominios | `platform_surfaces` |

## Pendientes

- **V5.77 (`consolas`, fase 1 del `PLAN_CIRCUITO_DEL_LOTE`) — dos cosas con dueño aquí**: (a) la Arena ya no es una gala con
  jornada en vivo sino una sesión de segunda apreciación, así que el sello del **Estudio de Contenido** «video de Arena + assets del
  lote» (`partners.ts`) queda sin objeto en su primera mitad: pasa a «assets del lote»; (b) la fase 4 del plan construye el módulo
  **Evaluación de Lotes** del Centro de Calidad sobre su credencial (hoy suspendida), con módulos activables (Evaluación ·
  Procesamiento) y uso directo (respuesta 5 del owner, 2026-09-24). **(c) V5.80 (fase 3)**: los baches ya LLEGAN al Centro —
  `sondeo_batches.status = en_centro`, con `centro_calidad_account_id` (= la credencial `centro-calidad` activa, si hay UNA) y
  `q_grader_name` tecleado por CTCx al enviarlos; cada lote trae su muestra de evaluación (`muestra_movimientos` `a_centro`).
  **(d) V5.81 (fase 4) — HECHO**: `panel/evaluacion` construido; el bache va a UNA credencial con Evaluación activa y el
  Q-Grader es su contacto (nadie lo teclea); dar de alta → `lot_evaluations` pendiente; CTCx confirma o devuelve. ~~⚠️ La fórmula
  del CVA la debe validar el Q-Grader~~ **(e) V5.92 — el Q-Grader la corroboró y la corrigió (informe del 2026-09-25, plan del circuito
  §10)**: ocho secciones (Fragancia y Aroma aparte), Impresión general ×1, redondeo al 0,25, cinco tazas con tipo de defecto (una
  defectuosa es también no uniforme), Incompleto sin puntaje, el formulario 2004 con sus dominios. **La planilla del Centro es DUAL**
  (owner: vista SCA · CVA · Ambas; el SCA 2004 nativo es el protocolo primario y calibra la escala; un CVA solo se homologa —por lo
  general baja— con intervalo y rige el piso, nunca Tyrian; «Ambas» alimenta el banco comparativo que el owner pedirá a los Q-Graders).
  `src/lib/arena/homologacion.ts` (de `consolas`); `lot_evaluations.punto` · `cva_total`; el Centro enseña el Punto con su procedencia
  (`rotuloDelPunto`). `qa-centro-calidad` §5 y §7 (los vectores del informe se leen del plan). **Queda**: el «uso
  directo» (emitir una Ficha Técnica o un reporte sin bache — respuesta 5), `Procesamiento de Lotes` (Etapa 3), la variante
  interna de la Datasheet Tool (charter `herramientas-cafe`), y **nadie ha conducido el módulo en vivo** con la credencial
  (se verificó por `tsc`, build y guardianes; la credencial interna existe y tiene Evaluación activa).

- **Plan de ejecución de la narrativa** (`docs/PLAN_NARRATIVA_2026-09-17.md`): **SO-1** (narrativa de los nodos; ola 1)
  · SO-2 (panel del Master Roaster con etiquetas y Centro de Calidad con el CIR; espera CN-8 y las alianzas O-5).
- **Tercera ronda de narrativa (2026-09-17, `PVC_BCP_PLAN.md` §14.7)**: el **Centro de Calidad** hace el procesamiento (trilla,
  monitoreo y selección óptica) en la mayoría de los casos, **en alianza con el CIR de Santander** —CTCx acopia y empaca—; el
  **Master Roaster** empaca Papagayo Beans® con etiqueta PB por defecto, Co-Brand con productor y finca, o My Brand a diseño del
  comprador. Razón social completa en las landings donde amerite: CTCX Colombian Trading Company SAS.
- **Papagayo Beans® (owner, 2026-09-17, `PVC_BCP_PLAN.md` §14.6)**: el Master Roaster tuesta y empaca **Papagayo Beans®**
  (etiqueta por defecto; My Brand · Co-Brand según el mapa V43, por confirmar) con el sello del grado y la referencia a CTCx
  como motor; su landing y su panel deben nombrar la marca.
- **Decisión del owner (2026-09-17, `PVC_BCP_PLAN.md` §14 n.º 1 y 12)**: CTCx acopia, procesa y empaca —la frase «no toca
  un grano» se corrigió arriba y falta corregirla en el vision board v3 y en las landings de los nodos—; reconciliar el rol
  del **Centro de Calidad** (trilla y selección óptica) con el procesamiento propio de CTCx (§14.5); el **Master Roaster** se
  narra así: uno **local en Colombia** (activo) y «coming soon» en Nueva York, Florida, California, Alemania y Japón (mapa
  en `reference/narrativa-2026-09-17/img/mapa-regiones.svg`, fuera del repo). Marca **CTCx** en las landings.
- **Cuatro paneles son scaffolds**: solo el Estudio de Contenido tiene módulo real. Cada nodo necesita su
  interfaz (las pantallas ya están declaradas en `partners.ts`) **y su contraparte en el OCP** que reciba
  el sello en el pasaporte del lote — eso es lo que abre cada sesión de nodo.
- **Verificar los cinco subdominios** con `curl -I` (el doc de dominio deja el paso Vercel + Hostinger al
  owner).
- **Guardián propio** (`qa-socios-check.mjs`): `PARTNERS` ↔ `SUBDOMAIN_ROUTES` ↔ `puertas.ts` en sincronía;
  `requirePartner` exige las tres condiciones; ningún panel importa un cliente `service_role`.
- La cuarta app del Estudio, **Identity Value Creation** (leer finca y lote desde el tier de socios): exige
  vistas estrechas antes de una línea de UI (charter `coffeed`).

## Kick-off

```
Trabajas SOLO en el componente «Red de Socios» (clave: socios) de la plataforma CTC
(repo C:\dev\ctc-platforms\ctc-platform, rama main), y dentro de él en EL NODO <nodo>
(centro-calidad · agente-carga · agente-nacionalizacion · master-roaster · estudio-contenido).
Antes de tocar nada lee, en este orden:
1. docs/componentes/socios.md   ← tu charter (los cinco nodos, sus sellos, qué está construido)
2. docs/ALINEACION.md           ← contratos transversales (identidad, cookies, patrón Supabase) y el registro de permeación (§3)
3. AGENTS.md                    ← la compuerta y las reglas de la casa
Un socio nunca es bcp_admin y su credencial vale para un solo nodo; el panel del nodo se construye en
SU interfaz (/socios/<nodo>/panel) y lo que sella viaja al pasaporte por el OCP — si tu tarea necesita
un módulo del OCP o una vista nueva, es pendiente con dueño «consolas» y una línea en el §3; ningún
panel de socio ve dinero. Para el Estudio de Contenido, lee además docs/componentes/coffeed.md.
Al terminar: compuerta completa (incl. qa-recuperacion, qa-rutas-consolas), APP_VERSION + CHANGELOG +
asiento en el log de arquitectura, sello, push, verificación en vivo en el subdominio del nodo, y
«Pendientes» de este charter al día.
Hoy: <la tarea>.
```
