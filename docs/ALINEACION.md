# ALINEACIÓN · lo que ningún componente cambia solo

**Se lee en TODA sesión, en paralelo al charter del componente** (`docs/componentes/<clave>.md`).
Existe porque el trabajo se segmentó por componentes (2026-09-11, `REFURBISH_PLAN.md`) y el owner
puso la condición: «tie all up somehow to avoid silo development that may cause divergent or
inconsistent logic». Este archivo es el atado. Tiene cuatro partes: los **contratos transversales**
(§1), la **regla del backstage** (§2), el **registro de permeación** (§3) y las **reglas de trabajo**
(§4) que valen igual en los diez componentes.

**Cómo se usa, en tres líneas.** Al empezar: leer §3 desde la última fecha que conozcas — ahí se
entera Cherry Picked de que Kaffetal Regal cambió algo que lo alcanza. Al trabajar: si vas a tocar
una fuente única de §1, o código de otro componente, PARA y díselo al owner (o anótalo como
pendiente con dueño en el charter afectado). Al terminar la tanda: si el cambio tiene alcance más
allá de tu componente, **una línea en §3**, en el mismo commit.

---

## 1 · Contratos transversales

Cada uno tiene UNA fuente en el código. Se cambia allí y solo allí, y quien lo cambie avisa en §3.

| Contrato | Fuente única | Quién lo lee | Guardián |
|---|---|---|---|
| **Grados de Calidad CTC** — Black 80–81.99 · Red 82–83.99 · Blue 84–85.99 · Gold 86–87.99 · Tyrian 88+; *el puntaje manda*, el límite pertenece al grado de arriba, dos decimales como máximo | `src/lib/grados/definicion.ts` (`GRADOS`, `gradoPorPuntaje`, `redondeaPuntaje`, sellos en `public/images/shared/grados/`) | KR (Ficha, Evaluaciones), CP (catálogo, sellos, JSON-LD), OCP (veredicto, ofertas, subastas), cotizadores, PVC, Notion (que MIRA aquí, no al revés) | `qa-grados-check.mjs` (48) |
| **La red de subdominios** — 19 superficies + `www`; una superficie nueva = una línea (y el DNS a mano) | `src/lib/red/subdominios.ts` (`SUBDOMAIN_ROUTES` → `ROUTE_SUBDOMAIN`, `origenDeSuperficie`) | `src/proxy.ts` (lee el `Host`, compara por frontera de segmento, excluye `images/`·`docs/`·`tools/`, `RAIZ_COMPARTIDA` para `/recuperar-acceso`), Open Graph, canonical, sitemap | `qa-nav-check`, `qa-rutas-consolas` (248) |
| **Identidad** — UNA cuenta de Supabase Auth para toda la red; productor ⊕ comprador (excluyentes); socios = `role partner` + `partner_accounts` (nunca `bcp_admin`); equipo = `panel_users` con grants por consola | `src/lib/identidad/matriz.ts`, `src/lib/panel/{requireConsoleAccess,requireActiveAdmin,requireConsoleWrite}.ts`, `src/lib/partners/`, `src/lib/auth/{puertas,veredicto,recuperacion}.ts` | todas las puertas (11) y todas las compuertas de escritura | `qa-guard-check`, `qa-recuperacion-check` (154) |
| **Sesiones y cookies** — la cookie compartida `sb-…` (`Domain=.ctcexport.com`) para las superficies públicas; la cookie PROPIA `ctc-panel-auth` para las consolas. **Nunca fusionarlas** (el race de refresh entre pestañas de subdominios mató el login del BCP en producción, 2026-07-29) | `src/lib/supabase/server.ts` (las tres factorías + `PANEL_AUTH_COOKIE`), `src/proxy.ts` (renueva las dos) | todo lo que autentica | — |
| **El patrón Supabase de la casa** — RLS encendida con CERO políticas (service-role-only) por defecto; una política `select-own` estrecha solo cuando el usuario debe leer lo suyo; guard triggers `BEFORE UPDATE` que restringen columnas y transiciones; lecturas públicas por **vista `SECURITY DEFINER` estrecha**, jamás por política ancha; **lo derivado no se persiste** (se calcula al leer); lo histórico se **congela en snapshots**; DDL solo por `apply_migration` | `docs/HANDOFF.md` §Database (la tabla de guards) | cualquier tabla nueva | `qa-guard-check` (suite de seguridad) |
| **Vocabulario congelado** — BCP = *Business* (dirección, configuración, socios) · OCP = *Operation* (el pasaporte del lote, del productor al catálogo) · ECP = *Execution* (plataformas, contacto, herramientas); «CaaS» es la marca y `cocreate` la clave; **Tyrian** (no Tiryan); CommaaS ≠ CaaS; «hub» es de CommaaS; «Value Ecosystem»; el cacao existe como **nota de cata** y jamás como producto | `src/lib/panel/consoles.ts` (taglines), `src/lib/legal.ts` (`CTC_RAZON`, NIT), `src/lib/panel/rutasMovidas.ts` | copy de todas las superficies | `qa-rutas-consolas`, `qa-nav-check` |
| **Temporada y año-cosecha** — Mitaca/Principal, `seasonKey`, ventana de DOS temporadas para ofertar; el calendario de cosecha en tres idiomas | `src/lib/arena/seasons.ts`, `src/lib/harvestYear.ts` | KR, OCP (ofertas), CP (etiquetas), landing | `qa-ofertas-check` (36) |
| **Versión y compuerta de despliegue** — `APP_VERSION` sube en el MISMO commit que la tanda + entrada en `CHANGELOG.md` (Hito · Añadido · Cambiado · Corregido · Retirado · Seguridad · Datos · Docs) + **asiento en el log de arquitectura vigente** + sello del sha en el commit siguiente; la versión se toma al empujar (§5) | `src/lib/version.ts`, `CHANGELOG.md`, `docs/architecture/Log_*.txt` | la insignia de las 19 superficies y las consolas | `qa-changelog-check.mjs`, `qa-arqlog-check.mjs` |
| **El libro de consumo de IA** — toda llamada a un modelo se anota (`registrarConsumo`, superficie en `USOS`), fetch crudo a la API (sin SDK), modelo pequeño por defecto, pasos caros **opt-in** con el precio a la vista, y **sin credencial nada revienta** (degradación determinista que lo dice) | `src/lib/ai/{consumo,precios}.ts`, `src/lib/coffeed/claude.ts` | Coffeed, KR (asesor, escáner), Arena (mejoras), PVC | `qa-consumo-check.mjs` |
| **Tres idiomas** (ES · EN · DE) en toda superficie pública; el contenido de Coffeed se produce en español a propósito | `src/components/lang/i18n.tsx` (Home, KR, Directorio…) y `src/components/cherry-picked/i18n.ts` (la familia CP) — dos proveedores, la misma unión de idiomas | landings, paneles, formularios de captación, correos | — |
| **SEO y tarjetas** — `metadatosDeSuperficie()` es la única puerta al Open Graph; JSON-LD **no escribe datos** (sale de las fuentes únicas); `robots.txt`/`sitemap.xml` son route handlers por host; `platform_surfaces` (ECP · Manejo de Plataformas) es la capa de excepciones; `public/tools/*.html` llevan su `<head>` a mano | `src/lib/seo/{openGraph,jsonLd,superficies}.ts`, `src/app/{robots.txt,sitemap.xml}/route.ts` | todas las superficies públicas | `qa-tools-seo-check` (193), `qa-tools-seo-espejo` (68) |
| **La espina de integración** — los eventos hacia Make/Notion/Google se **emiten** (`emitEvent`, nombrados por dominio: `coffeed.redaccion.post_creado`, `herramienta.<id>.<evento>`…), nunca se llama a la máquina de nadie | `src/lib/integraciones/{emit,dominios,dispatch}.ts` | Coffeed, Herramientas (`CTC.emitir`), leads | `qa-integraciones-check` |
| **El espejo Notion/Google** — la plataforma manda en lo que gestiona; Notion lo **refleja** con tres propiedades (`ctc_id` · `CTC` · `Enlace CTC`) y puede tener más filas; de Notion vuelve **solo** lo que tenga manejador con nombre en `aplicar.ts`; conciliar es humano (propone el agente, confirma el owner); Google Contacts ↔ Notion por campos con dueño; Drive enlaza, no copia | `docs/SECRETARIA_PLAN.md` §2 (doctrina) y §3 (correspondencias), `src/lib/integraciones/aplicar.ts` (lo que vuelve) | Secretaría (agente), consolas (eventos y `notion_espejos`), todo componente cuya base se refleje | `qa-espejo-notion` (F2); `espejo-reporte.mjs` (pendiente) |
| **Codificación** — todo fuente en UTF-8; la compuerta no mira los bytes, el guardián sí | — | todo | `qa-encoding-check.mjs` |
| **Reglas UI/UX de la casa** — botones abajo a la derecha (apilados si hay varios) · acordeones cerrados por defecto · hilos y adjuntos en pop-up · interfaz mínima y técnica · cada pantalla define vacío · edición · guardado · error · pendiente · objetivos táctiles ≥ 44 px | Notion «Checklist de Proceso de Creación» (ya decidido por el owner: no se re-litiga) | toda pantalla nueva | — |

**Dos conflictos abiertos que este archivo hereda** (los resuelve el owner, no un componente):

1. **Bandas de grado vs PVC** — **decidido por el owner el 2026-09-15** (`docs/PVC_BCP_PLAN.md` §8–§9): el
   grado se leerá de la **escala de puntos CTC** (base por SCA + surplus de variedad · proceso ·
   reconocimiento; 1000–1399 Black … > 2000 Tyrian). Hasta que la fase 2 del PVC lo lleve a
   `definicion.ts` (dueño `consolas`, §3b), **sigue mandando `definicion.ts` tal como está** en toda
   superficie de cara al productor o comprador. MOQ y moneda quedaron decididos en el mismo acto.
2. **El número de Nequi** (`src/lib/arena/payment.ts`, `NEQUI` vacío): la tarifa de evaluación no es
   cobrable hasta que el owner lo escriba; `nequiConfigured()` esconde las instrucciones mientras tanto.

## 2 · La regla del backstage (consolas internas)

Las consolas —BCP · OCP · ECP— son el **origen operativo** de todo lo demás: el veredicto que
galardona, la oferta que se emite, la visa EUDR, la publicación al catálogo, la configuración de
las herramientas, el reparto de superficies. **Por eso mandan hacia fuera, y nunca en silencio**
(NOTA del owner, 2026-09-11):

- Un cambio en una consola que **altere lo que otro componente muestra, exige o permite** se ejecuta
  en ese componente **en la misma tanda** — o queda escrito como **pendiente CON dueño** en la
  sección «Pendientes» del charter afectado, con la versión que lo originó.
- Cada charter de superficie lleva la sección **«Lo que las consolas gobiernan de este componente»**:
  es la lista de puntos donde el backstage manda (estados del lote, grados, visas, publicaciones,
  grants…). Si tocas uno de esos puntos desde la consola, ese charter es tu lista de verificación.
- La sesión de consolas **busca los identificadores de permiso y las claves, no solo las rutas**
  (`PILLAR_CONSOLE`, `requireConsoleAccess("…")`, `revalidatePath`): tres veces en la reorganización
  V5 se movió una ruta y se dejó atrás la clave que la gobernaba, sin que nada fallara.
- Y al revés **no**: un componente de superficie no cambia una regla de negocio por su cuenta. Si un
  panel necesita que el estado del lote se comporte distinto, eso se pide a la consola y se anota.

## 3 · Registro de permeación

Una línea por cambio con alcance más allá de su componente. **Fecha · versión · origen → afectados ·
qué · dónde quedó.** Se escribe en el mismo commit que el cambio; se lee al empezar cada sesión.

| Fecha | Versión | Origen → afectados | Qué cambió | Dónde quedó |
|---|---|---|---|---|
| 2026-08-19 | V4.44 | consolas (grados) → KR, CP, cotizadores, JSON-LD, Notion | La escala de grados pasó a **dos en dos**; tres lotes de la cinta subieron de grado y sus fichas se regeneraron | `definicion.ts`, `qa-grados-check` 48 |
| 2026-08-18 | V4.24–26 | consolas → todas las superficies internas | 29 rutas cambiaron de consola con talones 308; claves de permiso repuntadas después (13 casos) | `rutasMovidas.ts`, `qa-rutas-consolas` |
| 2026-08-21 | V5.17 | consolas (OCP) → Kaffetal Regal | El galardón lo escribe el **veredicto del bache Q-Grader** (`gradoPorPuntaje`); la sesión de Arena deja de ser paso; el Club llega con el galardón; KR estrena «Evaluar mi Café» | `nominadosActions.recordEvaluationVerdict`, `EvaluacionesTab` |
| 2026-08-21 | V5.18 | consolas (OCP) → Kaffetal Regal, Cherry Picked | Nace `lot_offers`: **el contrato nace de la aceptación del productor**; snapshots congelados; ventana de dos temporadas; Black vía negociación | `ofertasActions`, `lib/ofertas/producerActions`, `ContratosTab` |
| 2026-08-21 | V5.19 | consolas → KR landing (3 idiomas), Cherry Picked (copy) | La **Arena es la vitrina** (Blue/Gold/Tyrian con contrato); `finalizeJornada` ya no escribe grado ni contrato | `arenaActions`, `ArenaSection`, `PorQueSection` |
| 2026-08-21 | V5.20–21 | Kaffetal Regal → consolas (OCP) | B2/B3 «Reportado por Productor»: hasta 7 PDFs + 7 fotos por sección en `lots.datasheet`; los números de B3 siempre a la vista | `PaneB2/B3`, `ReportFiles`, `qa-reportado-productor` 40 |
| 2026-08-21 | V5.23 | consolas (OCP) → Kaffetal Regal, libro de consumo | `lot_fichas`: el escáner visual compila el **set de Fichas Técnicas** (una oficial); el productor lo ve en B2/B3; sexta vía de gasto `kr:ficha-escaner` | `fichasActions`, `FichasDelLote`, `qa-fichas-check` 31 |
| 2026-08-22 | V5.24 | Cherry Picked → consolas (OCP) | **Subastas Tyrian**: la puja corre en CP Green (Pintón+, mitades A/B, trigger atómico); `/ocp/subastas` administra; **adjudicar no emite oferta** (EUR/kg vs COP/kg) | `lib/subastas/*`, `subastasActions`, `qa-subastas-check` 30 |
| 2026-08-25–27 | V5.25–27 | Herramientas del Café → ECP (registro), SEO | Nueva herramienta **Defectos del Café** (`public/tools/defectos-cafe.html`) registrada en `tools`, con captura para el carrusel | `reference/html_tools/defectos_cafe`, `qa-tools-seo-*` |
| 2026-09-10 | V5.28–29 | consolas (BCP) → **PENDIENTE**: grados, Cherry Picked (MOQ), subastas (moneda) | **PVC** entra al BCP (`/bcp/pvc`, `pvc_*`, `public_pvc_current`, `/api/pvc/current`); sus bandas y su MOQ **no coinciden** con los de la plataforma — nada de cara al cliente lo lee aún | `lib/pvc/*`, `PVC_BCP_PLAN.md` §8 (dueño: consolas; decide el owner) |
| 2026-09-10 | V5.30 | CTC Home → Kaffetal Regal | El **vídeo de presentación definitivo** se monta en la Home y en la landing de KR (subtítulos ES/EN) | `reference/video-presentacion/` (tras §4 del plan) |
| 2026-09-11 | — | plataforma → todos | **Reorganización por componentes**: charters, este archivo, `C:\dev` ordenado, memoria unificada por espacio | `REFURBISH_PLAN.md` |
| 2026-09-13 | V5.34 | owner → coffeed, consolas, kaffetal-regal, arena, herramientas-cafe | **Claves de Anthropic repuestas en Vercel y verificadas** con `GET /api/herramientas/cromatografia/estado`: `ANTHROPIC_API_KEY` (toda la plataforma) y `CROMATOGRAPHY_ANTHROPIC_API_KEY` (el Lector) responden. Vuelven Coffeed Redacción, Direccionamiento, Datawave, RT-Scriptor, el asesor de KR, las mejoras de Arena y el escáner de fichas | pendiente de §3b cerrado |
| 2026-09-13 | V5.32 | herramientas-cafe → consolas (ECP · Herramientas), libro de consumo, kaffetal-regal | **Lector de Cromatografía de Suelo**: primera herramienta con servidor (`api/herramientas/cromatografia`); séptima vía de gasto `herramientas:cromatografia`; lee `fincas`/`finca_parcelas` de la cuenta (solo nombre, departamento, municipio, altitud, parcelas; nunca coordenadas); alta Plus en `tools` | `componentes/herramientas-cafe.md`, brief, `qa-cromatografia-check` 122 |
| 2026-09-14 | — | **CommaaS · hub-kit** → libro de consumo (todas las vías de gasto con Sonnet 5) | **La tarifa de `claude-sonnet-5` en `precios.ts` es falsa**: dice «promo 2/10 hasta el 2026-08-31» con base 3/15, y la documentación de la API (Models overview, consultada el 2026-09-14) dice **2/10 sin promoción**. Desde el 1 de septiembre cada fila de Sonnet 5 del libro de CTC queda un 50% por encima de lo facturado. CommaaS corrigió su copia (`pricing.ts`, que se trajo de aquí); **la de CTC no se tocó** (fuera del alcance de la sesión de CommaaS). De paso: Sonnet 5 piensa por defecto y `max_tokens` topa pensamiento y respuesta juntos, así que un tope ajustado trunca en silencio | `src/lib/ai/precios.ts` (sin cambiar) · commaas `docs/HANDOFF.md` §2026-09-14 |
| 2026-09-15 | — | owner + socio (reunión «G&G Alignment», Reuniones Generales) → consolas, kaffetal-regal (Ficha: físicos y reconocimientos), cherry-picked, herramientas-internas (PAD), secretaria | **La escala «El Punto y la Tríada» queda acordada con el socio**: Black 82 CCC / 80 con una B · Blue ≈ 88 CCC, ≈ 86 con dos B, ≈ 84,5 BBB · CCC nunca Tyrian; **Base física** previa (factor > 94, humedad 10–12 %, densidad por variedad) que la Ficha debe registrar; Variedad C Regional · B Especial · A Exótica con catálogo revisable cada 3 meses; Proceso C lavado · B honey/natural · A fermentados; reconocimientos solo verificables; **multiplicadores PBC** 1,15 · 1,30 · 1,60 · 2,00 · 2,00 + subasta 80/20; precio transparente y no negociable; rechazo esperado ≥ 1 de 5 | `PVC_BCP_PLAN.md` §9.1–§9.4 |
| 2026-09-15 | V5.42 | owner → consolas (BCP · PVC, OCP · veredicto), kaffetal-regal, cherry-picked (Green, subastas, Roast), cotizadores, secretaria (Notion «Grados») | **Las cinco decisiones del PVC, tomadas**: escala de puntos CTC (el grado se lee de los puntos = base SCA + surplus V·P·R), MOQ en unidades de 6 kg (336/252/156/78/36 kg), US$ FOB a la TRM del corte con CIF/DDP en la moneda del destino y collar de TRM, ciclo semanal por cron de Vercel (Pro), dossier por GitHub Action. **Nada cambia en código todavía**: es la fase 2 del PVC. El conflicto abierto n.º 1 de §1 queda cerrado | `PVC_BCP_PLAN.md` §8–§9, `componentes/consolas.md` §Pendientes |
| 2026-09-12 | — | secretaria → consolas, kaffetal-regal, cherry-picked, ctc-tech, varietales, socios | Nace la **Secretaría CTC** (el espejo con Notion/Google) con su contrato en §1; el escaneo confirma que la base «Grados de Calidad CTC» de Notion **ya coincide** con `definicion.ts` (solo la prosa está vieja); F1 (eventos + `notion_espejos`) es de consolas | `SECRETARIA_PLAN.md`, `componentes/secretaria.md` |

### 3b · Pendientes cruzados con dueño (lo que un componente le debe a otro)

| Dueño | Debe a | Qué | Desde |
|---|---|---|---|
| consolas (OCP · Transcripciones) | herramientas-internas | `WorkersBadge.tsx` sigue diciendo al operador que abra `reference_html_tools\_whatsapp-transcript-html`; la herramienta vive en `tools/transcriptor/` desde V4.15 y la carpeta ya no existe | V4.15 / 2026-09-11 |
| consolas (BCP · PVC) | cherry-picked, kaffetal-regal | Las cinco decisiones del owner (`PVC_BCP_PLAN.md` §8) antes de que contratos, ofertas y listados lean la edición PVC | V5.28 |
| consolas (OCP) | kaffetal-regal | El número de Nequi real en `payment.ts` — la tarifa de evaluación no es cobrable | 2026-07-16 |
| kaffetal-regal | consolas (OCP) | Estrenar el escáner visual con soportes REALES (los 7 lotes de producción siguen en borrador) | V5.23 |
| cherry-picked | consolas (OCP) | La primera subasta real cuando el bache galardone un Tyrian | V5.24 |
| coffeed | consolas (ECP) | La primera generación real de Redacción y el escenario de Make de `coffeed.redaccion.post_creado` | V5.9 |
| consolas | secretaria | F1 del espejo: `notion_espejos`, eventos `productor.registrado` · `finca.aprobada` · `lote.galardonado` · `lead.creado` · `comprador.registrado` · `socio.credencial`, manejadores `<entidad>.espejada`, `espejo-reporte.mjs` (`SECRETARIA_PLAN.md` §4) | 2026-09-12 |
| quien lleve el libro de consumo | todas las vías de gasto | Corregir `claude-sonnet-5` en `src/lib/ai/precios.ts` a 2/10 y quitar la promo; decidir con el owner qué se hace con las filas de Sonnet 5 desde el 2026-09-01 (aviso de CommaaS, §3) | 2026-09-14 |
| consolas | kaffetal-regal, cherry-picked, cotizadores, secretaria | **Fase 2 del PVC** (`PVC_BCP_PLAN.md` §7, §9): `definicion.ts` a la escala de puntos (`puntosCtc`, `gradoPorPuntos`, catálogos `VARIEDAD_NIVEL`/`PROCESO_NIVEL`/`DENSIDAD_REFERENCIA`, `lot_fichas.reconocimientos` y los tres físicos en `physical_data`, `lots.ctc_points`/`surplus`, multiplicadores PBC en `pvc_model_versions.params`), `moqPorGrado` desde la edición (se retira `ASSOC_BLACK_MOQ`), precios FOB en US$ y exhibición por moneda de destino (`precio_salida_usd_kg`), collar de TRM en `pvc_trigger_watch`. Una versión, con aviso previo a cada superficie que lea grados | 2026-09-15 |
| consolas | kaffetal-regal, cherry-picked, herramientas-internas | **La oferta en dos caminos** (`PVC_BCP_PLAN.md` §9.5): Cherry Picked = PVC × mult(grado); **compra directa = CTC Selection** (CTCx compra en firme y lo vende como suyo, preseleccionado y **listo en bodega**) = PVC × mult(grado) × (1 − prima 8 %) con `lot_offers` kind `directa`; hoy `ctc_selection` solo lo enciende la vía Black (**A13**) y hay que abrirlo a cualquier grado; la **herramienta «PVC × grado»** para OCP, KR y campo. Auditoría del módulo en §10 (A1–A13) | 2026-09-15 |
| owner | consolas | Confirmar (§10.3, lo que queda tras el feedback del 2026-09-15): que la vista pública deje de exponer el desglose de costos (A7); cómo se retira el 8 % en compra directa y qué es «cantidad mínima» (§9.5); si el marco de mercado necesita gemelo legible por máquina además del PDF (§10.3.2) | 2026-09-16 |
| owner | consolas | Validar la escala de puntos (multiplicativa: base CCC × M, K = (2500/1990 − 1)/6; puerta de entrada 80–81,99; Tyrian exige SCA ≥ 89) con la calculadora del artefacto «PVC · Cinco decisiones» —pesos iguales de V·P·R y caso AAA:80; la puerta de Tyrian (SCA ≥ 89 y surplus, CCC nunca) ya está confirmada— y fijar el **X %** del collar de TRM (propuesta 6 %) antes de que la fase 2 toque `definicion.ts` (`PVC_BCP_PLAN.md` §9.1) | 2026-09-15 |
| owner | secretaria | Conexión **Google Contacts** en Make (no hay conector en Claude); las coincidencias de proveedores/fincas; sacar y rotar las dos contraseñas en claro de Objetivos y Tareas (`SECRETARIA_PLAN.md` §5) | 2026-09-12 |

## 4 · Reglas de trabajo (valen en los diez componentes)

1. **Las definiciones del repo mandan** sobre Notion, hojas y prototipos: cuando una fuente externa
   contradice una definición que vive en código (grados, año-cosecha, legal, subdominios), gana el
   código y se corrige la fuente; la discrepancia se **anota en el archivo de datos**, nunca se
   armoniza en silencio. *Dos copias de acuerdo no son una verificación.*
2. **Investigar no es amputar.** «Debuggea esto» pide un diagnóstico y una propuesta de arreglo
   mínimo; retirar una funcionalidad es decisión del owner.
3. **La compuerta antes de decir «hecho»**: `npx tsc --noEmit` limpio · `npx eslint src` en o bajo
   su línea base (8 avisos, todos `no-img-element` deliberados) · `npm run build` exit 0 · todo
   guardián `qa-*` que toque la tanda · `APP_VERSION` + `CHANGELOG` en el mismo commit · sello del
   sha · push · **verificar en vivo** (`curl -L` a la insignia `V5.NN · build <sha>`) · entrada en el
   log de arquitectura (`docs/architecture/Log_Documentacion_Interactiva_V*.txt`).
4. **`git add` de rutas explícitas, nunca `-A`** — otra sesión puede estar en el mismo árbol.
5. **Un guardián nuevo por cada costura que valga la pena** — y **un guardián que falla y se ignora
   enseña a ignorar los fallos**: se arregla o se retira, jamás se deja rojo.
6. **Las consolas no se conducen en un navegador** (login maestro con OTP real): se verifican por
   `tsc`/`eslint`/guardianes + SQL, y se conduce la superficie de productor/comprador que ejercita el
   mismo código (cuentas `prueba-*`, ver memoria `ctc-qa-fleet`).
7. **Lo que parece muerto y se queda, dice por qué en el propio archivo** — el siguiente barrido hace
   `grep`, no lee bitácoras.
8. **Un `throw` en una Server Action atada a `<form action>` tumba la página**: los rechazos de
   negocio se devuelven como `{ ok: false, error }`.
9. **El repo es PÚBLICO**: nunca una ruta absoluta con el nombre de usuario ni una clave en el
   código; y ponerlo en privado rompe los despliegues de Vercel (probado).
10. **Costes de IA**: lo que un programa puede hacer, un modelo no lo hace; modelo pequeño por
    defecto; `webSearch` es el parámetro más caro del repo; los pasos caros se piden con el precio a
    la vista.

## 5 · Versionado y wraps con desarrollos en paralelo (2026-09-11)

Diez conversaciones despliegan sobre el mismo `main`. Las dos cosas que antes hacía una sola sesión
lineal —numerar versiones y compilar el mapa— se reparten así:

1. **La versión se toma al empujar, no al empezar.** `git pull --ff-only` → leer `APP_VERSION` →
   sumar uno → commit (con su entrada en `CHANGELOG.md` y su asiento, ver 2) → `git push` de
   inmediato. Si el push se rechaza (otra sesión llegó antes), se vuelve a hacer pull, se renumera y
   se vuelve a sellar. **Una tanda = una versión = un push.** `qa-changelog-check` vigila que las
   cabeceras no se repitan ni desordenen.
2. **El asiento es del componente.** En el MISMO commit que sube la versión, la sesión escribe
   `## [fecha] V5.NN · …` en el log vigente (`docs/architecture/Log_Documentacion_Interactiva_V<N>.txt`,
   el de mayor N) con lo que el mapa deberá reflejar (nodos, fichas DICT, trazas, ANN). Solo se
   añade al final; nunca se reescribe un asiento ajeno. Lo exige **`scripts/qa-arqlog-check.mjs`**
   (parte de la compuerta): toda versión del CHANGELOG posterior al último wrap debe estar en el log.
   Nació porque V5.25–V5.30 salieron de seis sesiones sin dejar asiento.
3. **El wrap es de la plataforma.** Solo se llama desde la conversación **«Wraps del mapa»** del
   grupo *CTC Consolas internas* (la vía `plataforma`), nunca desde una sesión de componente — así
   dos wraps no pueden cruzarse ni dos sesiones editar el mismo HTML. Un componente puede PEDIR un
   wrap (una línea en su charter o al owner). **Cadencia**: cuando el log acumule cinco asientos o
   más, al cerrar un hito de un componente, o antes de declarar una versión mayor — lo primero que
   ocurra. El wrap compila los asientos de TODOS los componentes, corre la batería de nueve
   comprobaciones, regenera el FILETREE, estampa CHANGELOG y HANDOFF y abre el log siguiente.
4. **El log siguiente nace vacío con su cabecera** («plataforma V5.NN» = la versión sobre la que se
   cerró el wrap): esa cabecera es lo que `qa-arqlog` usa de referencia.
5. **CommaaS, a su escala**: no tiene mapa HTML. Su `CHANGELOG.md` sigue el mismo contrato (una
   entrada por tanda empujada; clave = fecha + sha, sin insignia); el asiento lo escribe quien
   empuja (sesión del hub o del tenant), y la **consolidación** —la sección fechada del `HANDOFF.md`
   y el índice de tenants de su `ALINEACION.md` §2— la hace la sesión del hub, que es el backstage
   de los tenants. Detalle en `commaas/docs/ALINEACION.md` §6.
