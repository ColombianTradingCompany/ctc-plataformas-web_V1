# Plan de ejecución · la narrativa de CTCx en la plataforma (2026-09-18)

Nace de las tres rondas de decisiones del owner del 2026-09-17 (`PVC_BCP_PLAN.md` §14) y de los cuatro documentos de
narrativa (`reference/narrativa-2026-09-17/`, fuera del repo). Convierte lo decidido en **tandas** —una tanda = una
sesión de un componente = una versión = un push (`ALINEACION.md` §5)— ordenadas por dependencias en **olas**. Cada tanda
lleva su alcance, sus archivos, sus guardianes, lo que desbloquea y la línea **«Hoy:»** que se pega al final del
kick-off del componente (`docs/componentes/<clave>.md`, sección Kick-off).

**Cómo se usa.** El charter de cada componente sigue siendo su estado vivo («Pendientes»); este plan es la vista
transversal y el orden. Cuando una tanda se cierra, se marca en el tablero del §8 **en el mismo commit** que sube la
versión, y el charter borra su pendiente. Si una tanda cambia de alcance, se corrige aquí, no en la memoria.

## 0 · Reglas de lectura

- **Olas**: 0 = insumos del owner (sin código) · 1 = sin dependencias, en paralelo · 2 = sobre la 1 · 3 = regiones y
  modelo v2.2.0 · 4 = la escala de puntos. Dentro de una ola, el orden es indiferente salvo donde se dice.
- **Tamaño**: S = una sesión corta · M = una sesión larga o dos · L = varias sesiones.
- **Compuerta de toda tanda** (`AGENTS.md`): `tsc` limpio · `eslint` en su línea base · `build` · los guardianes de la
  tanda · `APP_VERSION` + `CHANGELOG` + asiento en el log de arquitectura en el mismo commit · sello del sha · push ·
  verificación en vivo · línea en `ALINEACION.md` §3 si cruza componentes · «Pendientes» del charter al día.
- **Backstage** (§2): cuando una tanda de consolas cambia lo que una superficie muestra o exige, la superficie se
  hace en la misma tanda o queda como pendiente con dueño en su charter. Las parejas están marcadas abajo.
- **Una sola fecha dura**: el PVC de ene–mar 2027 se publica **antes del 15-oct-2026** (CN-1).

## 1 · Mapa de olas

| Ola | Tanda | Componente | Qué | Tamaño | Depende de | Desbloquea |
|---|---|---|---|---|---|---|
| 0 | O-1 | owner | F4-2026: extender al 31-dic o publicar oct–dic | — | — | CN-1 |
| 0 | O-2 | owner | Validar la escala de puntos + X % del collar de TRM | — | — | ola 4 |
| 0 | O-3 | owner | Entidad legal + pasarela (Zulu) | — | — | cobros: CN-5, CP-3 |
| 0 | O-4 | owner + Estudio de Contenido | Diseño físico de la bolsa, el sticker y la etiqueta trasera | — | — | CN-7, SO-1 |
| 0 | O-5 | owner | Alianzas: Centro de Calidad + CIR, MR local, operadores y MR «coming soon» | — | — | ola 3 |
| 0 | O-6 | owner | Marcas: «Kaffetal» ante la SIC; registros de Papagayo Beans® y CTCx | — | — | KR, CP |
| 0 | O-7 | owner | Tarifa de conexión del tostado in situ; tríadas de reputación; Plus vs Básica | — | — | CN-8 |
| 0 | O-8 | owner | Video del productor: animática ya, rodaje tras KR-1 y KR-2 | — | KR-1, KR-2 | — |
| 1 | CN-1 | consolas · BCP | **PVC ene–mar 2027 antes del 15-oct** + calendario público | M | O-1 | KR-1 (cita el calendario) |
| 1 | CN-2 | consolas | Marca y catálogo: razón social, CTCx, Papagayo Beans® en ficha/cinta/OG, retiro de `cocreate` | M | — | CN-7, CP-2 |
| 1 | CP-1 | cherry-picked | US$ en tienda y Roast; mínimos en unidades de 6 kg; fin de `ASSOC_BLACK_MOQ` | M | — | CP-3, CN-4 |
| 1 | CP-2 | cherry-picked | Portada y programas con Papagayo Beans®; mapa de Enabled Regions; Roast, X y CaaS; fuera Co-Create | M–L | CN-2 (clave y ruta) | — |
| 1 | KR-1 | kaffetal-regal | Copy del guion v0.6/v0.7: CTCx, Papagayo Beans®, tarifa, los dos caminos, FAQ, Arena | M | — | O-8, KR-2 |
| 1 | SO-1 | socios | Narrativa de nodos: Centro de Calidad + CIR, Master Roaster y etiquetas, razón social | S | O-4 (solo imágenes) | — |
| 1 | SE-1 | secretaria | Vocabulario en Notion: Papagayo Beans®, CTCx, X, razón social | S | — | — |
| 2 | CN-3 | consolas · OCP | **Ofertas y contratos según la narrativa** (prima dentro, `directa`, mínimos, escalera, reporte, pago) | L | CN-1 | KR-2, CP-3, HI-1 |
| 2 | CN-4 | consolas · OCP | Subastas en US$; alza al productor solo en Cherry Picked, a COP el día del pago | M | CP-1 | CP-3 |
| 2 | CN-5 | consolas · OCP | Evaluación: tarifa $200.000 con descuentos, sin reembolso del 80 %, contra-catación con crédito, avisos | M | O-3 (cobro) | KR-2 |
| 2 | CN-6 | consolas · OCP | Arena abierta a Blue+ sin contrato, postulación y fila | M | — | KR-2 |
| 2 | CN-7 | consolas · OCP | UID/QR del lote y sticker imprimible; ficha pública de CTCx Selection | M | CN-2, O-4 | CP-3 |
| 2 | KR-2 | kaffetal-regal | Panel: perfil primero, tabla de salida antes de firmar, Arena, «su café en la bolsa», avisos | M | CN-3, CN-5, CN-6 | O-8 |
| 2 | CP-3 | cherry-picked | Catálogo y ficha: mínimos desde la edición, lista FOB, Papagayo Beans®, CTCx Selection, puja en US$ | M | CN-3, CN-4, CN-7 | primer lote publicado |
| 3 | CN-8 | consolas · BCP/OCP | Regiones como dato, tablas de precio por región, motor v2.2.0 | L | O-5, O-7 | CP-4, SO-2 |
| 3 | CP-4 | cherry-picked | Green por región: acceso, tramos y consolidado con MR | M | CN-8 | — |
| 3 | SO-2 | socios | Panel del Master Roaster con etiquetas (PB · Co-Brand · My Brand) y Centro de Calidad con el CIR | L | CN-8, O-5 | CP-5 |
| 3 | CP-5 | cherry-picked | Roast y X como productos (2027); HORECA por CaaS al 82 % | L | SO-2 | — |
| 3 | HI-1 | herramientas-internas | Calculadora «PVC × grado» / PAD para OCP, KR y campo | M | CN-3 | — |
| 4 | CN-9 | consolas · OCP/BCP | Fase 2 de grados: el Punto y la Tríada + base física en el veredicto | L | O-2 | KR-3, SE-2 |
| 4 | KR-3 | kaffetal-regal | Copy de grados (misma tanda que CN-9) | S | CN-9 | — |
| 4 | SE-2 | secretaria | Notion «Grados» con la escala nueva | S | CN-9 | — |

## 2 · Ola 0 · el owner (sin código)

- **O-1 · F4-2026 y el hueco 15-dic → 1-ene.** Decidir si la edición de transición se extiende al 31-dic
  (`valid_to`) o si se publica una edición oct–dic. Sin esto, CN-1 no puede fijar `valid_from`.
- **O-2 · La escala de puntos.** Validar con la calculadora del artefacto «PVC · Cinco decisiones» (pesos iguales
  V·P·R, caso AAA:80, filas Caturra/Catuaí/Bourbon; `PVC_BCP_PLAN.md` §9.1) y fijar el X % del collar de TRM (§9.3).
  Es la única puerta de la ola 4.
- **O-3 · Cobrar.** Entidad legal (país) y pasarela (Zulu; Stripe y Nequi aplazados). Hasta entonces, la tarifa de
  evaluación y la tienda no cobran: «Evaluar mi Café» sigue mandando a `info@`.
- **O-4 · La bolsa.** Diseño del frente (Papagayo Beans®, sello del grado, «un café de CTCx»), del sticker de
  productor y finca, del QR y de la etiqueta trasera estándar (Roast: PB por defecto · Co-Brand · My Brand). Lo hace
  el Estudio de Contenido con el diagrama del documento de narrativa como brief.
- **O-5 · Alianzas.** Formalizar el Centro de Calidad con el CIR de Santander; el Master Roaster local (Colombia);
  operadores logísticos y master roasters «coming soon» en Nueva York, Florida, California, Alemania y Japón. Sin esto,
  las regiones no pueden ser dato (CN-8).
- **O-6 · Marcas.** «Kaffetal» ante la SIC antes de invertir más en el nombre; confirmar el registro de Papagayo
  Beans® (el ® lo presupone) y de CTCx.
- **O-7 · Tres decisiones menores** (§12.11): tarifa de conexión del tostado in situ (fija o %), pesos y beneficios
  de las tríadas de reputación, Plus contra Básica.
- **O-8 · El video del productor.** La animática se puede hacer ya; el rodaje final espera a que KR-1 y KR-2 estén en
  vivo (el video no puede decir lo que la plataforma no dice).

## 3 · Ola 1 · en paralelo, sin dependencias

### CN-1 · consolas · BCP · el PVC de ene–mar 2027 (antes del 15-oct-2026) · M

- **Alcance.** Nueva edición con `valid_from` 1-ene-2027 y `valid_to` 31-mar; F4-2026 según O-1; la regla pública
  de anticipación (primeras dos semanas del segundo mes del periodo anterior) en la pestaña Lectura y en
  `GET /api/pvc/current` + `public_pvc_next`; emitir `pvc.published`. Mínimos por grado en la edición con Black y Red
  «3–4 según la mezcla» (tabla §14.4) para que CN-3 y CP-3 los lean.
- **Archivos.** `src/app/bcp/(app)/pvc/*`, `src/lib/pvc/{servicio,actions,lectura}.ts`, migración si cambia `pvc_editions`.
- **Guardianes.** `qa-pvc-vigencia`, `qa-pvc-lectura`, `qa-pvc-motor`, `qa-pvc-tablero`.
- **Backstage.** KR-1 cita el calendario (texto); CP-3 lee la edición. Línea en §3.
- **Hoy:** `Tanda CN-1 del plan de narrativa (docs/PLAN_NARRATIVA_2026-09-17.md §3): publicar el PVC de ene–mar 2027 antes del 15-oct, alinear F4-2026 según O-1, exponer la regla de anticipación y los mínimos por grado en la edición.`

### CN-2 · consolas · marca, razón social y catálogo · M

- **Alcance.** `src/lib/legal.ts`: `CTC_RAZON` → «CTCX Colombian Trading Company SAS» (usos: `LegalFooter`,
  `docs/ficha/[lotId]`, `sneakPeek.ts`, `perfilPrint.ts`, `CherryPickedExperience.tsx`); CTCx en `consoles.ts`
  (taglines) y en el copy de las consolas; **Papagayo Beans®** como nombre del café en `fichaPublica.ts`,
  `sneakPeek.ts`, JSON-LD/OG del lote (`src/lib/seo/`); retirar la clave `cocreate` del pilar de leads (→ `caas`, con
  migración de `leads.pillar`) y la ruta `/co-create` (el 308 se conserva mientras haya enlaces indexados:
  `rutasMovidas.ts`); `qa-crm-interes` y `qa-rutas-consolas` deben seguir en verde.
- **Guardianes.** `qa-rutas-consolas`, `qa-nav-check`, `qa-sneak-peek-check`, `qa-ficha-publica-check`, `qa-crm-interes-check`.
- **Backstage.** CP-2 retira Co-Create de logos y copy en su tanda; KR-1 y SO-1 usan la razón social nueva. Línea en §3.
- **Hoy:** `Tanda CN-2 del plan de narrativa (§3): razón social completa en legal.ts, marca CTCx en las consolas, Papagayo Beans® en ficha pública, cinta y OG del lote, y retiro de la clave cocreate y la ruta /co-create con su 308.`

### CP-1 · cherry-picked · US$ y mínimos · M

- **Alcance.** `data.ts`: `eur` → formato US$, `price` en US$/kg, retirar `ASSOC_BLACK_MOQ = 350`; `LotCard` con el
  mínimo en unidades de 6 kg por grado (Black y Red 42–56 según la mezcla · Blue 26 · Gold 13 · Tyrian 6) y el empaque
  como presentación; `RoastLanding` (`FEE_EUR_KG` → US$); `TyrianSection` exhibe US$/kg (la puja real cambia con CN-4:
  o se hace en la misma tanda con línea en §3, o CP-1 solo cambia la exhibición).
- **Guardianes.** `qa-sneak-peek-check`, `qa-subastas-check` (lado CP), `qa-checkout-check`.
- **Hoy:** `Tanda CP-1 del plan de narrativa (§3): US$ en la tienda Green, Roast y la subasta; mínimos en unidades de 6 kg por grado con el empaque como presentación; fuera ASSOC_BLACK_MOQ.`

### CP-2 · cherry-picked · portada y programas con Papagayo Beans® · M–L

- **Alcance.** `HubLanding`: un solo café (Papagayo Beans®) y cuatro programas; **mapa de Enabled Regions** con los
  pines MR (base: `reference/narrativa-2026-09-17/img/mapa-regiones.svg`, en los tres idiomas); Green: catálogo de
  Papagayo Beans® por grado, lista FOB principal y lista CaaS «en construcción»; Roast: tostado del MR con etiquetas
  PB por defecto · Co-Brand · My Brand, HORECA vía CaaS al 82 %; X: la cara al consumidor directo; CaaS: el camino no
  consolidado (FOB · puerto · DDP, Enabled Regions); retirar Co-Create de logos y copy (`i18n.ts` de la familia CP).
- **Guardianes.** `qa-nav-check`, `qa-crm-interes-check`, `qa-tools-seo-check` (OG), `qa-sneak-peek-check`.
- **Backstage.** Depende de CN-2 solo para la clave y la ruta de Co-Create; el copy puede ir antes.
- **Hoy:** `Tanda CP-2 del plan de narrativa (§3): portada y los cuatro programas con Papagayo Beans® (Green, Roast con sus tres etiquetas, X consumidor directo, CaaS no consolidado), mapa de Enabled Regions con pines MR en tres idiomas, y Co-Create fuera de logos y copy.`

### KR-1 · kaffetal-regal · el copy del guion (v0.6 + v0.7) · M

- **Alcance** (guion §6): CTCx y **Papagayo Beans®** («su café sale al mundo como…»); tarifa `ARENA_FEE_COP`
  80.000 → 200.000 con descuento del 30 al 70 % y envío incluido (la leen `nominadosActions`, `inscriptions`,
  `producerActions`: línea en §3 a consolas; el cobro real espera O-3); `TratoSection` con los dos caminos (prima
  dentro del PVC; CaaS sin prima; compra inicial por grado; mínimos 3–4 · 2 · 1 · ½; escalera 25 % + 25 % con el 4 %;
  pago a 2 días; reporte en la primera semana del mes); `faq.ts` en tres idiomas; `BienvenidosSection` con Perfil ·
  Finca · Lote · Evaluación · Oferta · Despacho; `OportunidadSection` con los multiplicadores reales en vez de índices
  base 100; la Arena como herramienta abierta a Blue+; el calendario del PVC. **No toca el copy de grados** (ola 4).
- **Guardianes.** `qa-kr-panel-check`, `qa-kr-ficha-check`, `qa-nav-check`.
- **Hoy:** `Tanda KR-1 del plan de narrativa (§3): trasladar el guion v0.6/v0.7 a la landing y el FAQ —CTCx, Papagayo Beans®, tarifa de $200.000 con descuento, los dos caminos con la prima dentro del PVC, escalera 25 % + 25 % y 4 %, pasos con Perfil primero, multiplicadores reales, Arena abierta a Blue+—, sin tocar el copy de grados.`

### SO-1 · socios · la narrativa de los nodos · S

- **Alcance.** Landings: Centro de Calidad procesa (trilla, monitoreo, selección óptica) **con el CIR de Santander**;
  Master Roaster tuesta y empaca Papagayo Beans® con etiquetas PB · Co-Brand · My Brand (aprobación del comprador) y
  «coming soon» en las cinco regiones; corregir «no toca un grano» en el vision board v3
  (`reference/html-vision-board/ctc-arquitectura-v3.html`); marca CTCx y razón social completa.
- **Guardianes.** `qa-recuperacion-check`, `qa-rutas-consolas`.
- **Hoy:** `Tanda SO-1 del plan de narrativa (§3): landings de los nodos con la narrativa del 17-sep —Centro de Calidad con el CIR de Santander, Master Roaster con Papagayo Beans® y sus tres etiquetas, coming soon en las cinco regiones, CTCx y la razón social completa— y el vision board sin «no toca un grano».`

### SE-1 · secretaria · vocabulario en Notion · S

- **Alcance.** Papagayo Beans®, CTCx, X, razón social y Enabled Regions en las páginas de Notion que los nombren; la
  prosa de «Grados de Calidad CTC» sin tocar la base (`definicion.ts` manda hasta la ola 4). Sin escribir en Postgres.
- **Hoy:** `Tanda SE-1 del plan de narrativa (§3): alinear el vocabulario de Notion con PVC_BCP_PLAN.md §14 —Papagayo Beans®, CTCx, X, razón social, Enabled Regions— sin tocar la base de grados.`

## 4 · Ola 2 · sobre la 1

### CN-3 · consolas · OCP · ofertas y contratos según la narrativa · L (dos sesiones: ofertas · contratos)

- **Ofertas.** Precio de toda oferta desde la edición vigente: PVC × multiplicador del grado (la prima ya está dentro);
  `lot_offers.kind` gana `directa` = (PVC − prima) × mult; compra inicial en firme por programa y grado (Cherry Picked
  1 carga · 1 carga · 200 kg · **hasta 100 kg** · ajustada; CaaS 15–25 kg — el Gold entra con MENOS kilos, corregido el
  2026-09-18 con la v0.9.1 del guion); mínimos por programa leídos de la edición
  (`moqPorGrado`; Black y Red 3–4 según la mezcla); reoferta por periodos (siguiente sin descuento, posterior −5 %);
  oferta en 1–3 días tras el veredicto (aviso); `ctc_selection` encendido por cualquier compra en firme (A13), no
  solo por `black_negotiations`.
- **Contratos.** `compromiso.ts` conectado a `purchase_contracts` (cargas comprometidas por mes, retiros, tramo libre
  0/25/50 %, penalización del 4 %); la escalera 25 % + 25 % reemplaza 50/75/100; reporte de ventas en la primera
  semana del mes; recibo y verificación el mismo día; pago por entrega a 2 días hábiles con mora del 0,5 %; el
  productor ve la tabla de salida antes de firmar (KR-2 la muestra).
- **Archivos.** `ofertasActions.ts`, `contractActions.ts`, `src/lib/ofertas/producerActions.ts`,
  `src/lib/pvc/{compromiso,lectura}.ts`, migraciones (`lot_offers.kind`, columnas de compromiso en `purchase_contracts`).
- **Guardianes.** `qa-ofertas-check` (36), `qa-pvc-compromiso` (31), `qa-fichas-check`, `qa-sneak-peek-check`.
- **Backstage.** KR-2 (`ContratosTab`, `respondToOffer`) y CP-3 (mínimos y CTCx Selection) en la misma tanda o como
  pendiente con dueño. Línea en §3.
- **Hoy (ofertas):** `Tanda CN-3a del plan de narrativa (§4): las ofertas salen de la edición —PVC × grado con la prima dentro, kind directa = (PVC − prima) × grado, compra inicial y mínimos por programa, reoferta por periodos— y CTCx Selection se enciende con cualquier compra en firme.`
- **Hoy (contratos):** `Tanda CN-3b del plan de narrativa (§4): compromiso.ts conectado al contrato —cargas por mes, escalera 25 % + 25 % con el 4 %—, reporte de ventas mensual, pago por entrega a 2 días hábiles con mora, y la tabla de salida visible para el productor antes de firmar.`

### CN-4 · consolas · OCP · subastas en US$ · M

- **Alcance.** `lot_auctions.precio_salida_eur_kg` → US$ (`_usd_kg`), pujas y adjudicación en US$ sobre FOB puerto
  Colombia, reglas de ajuste por programa publicadas antes de abrir, programa elegido al cerrar; el 80 % del alza al
  productor **solo si el lote va por Cherry Picked**, convertido a COP a la TRM del día del pago y registrado en el
  contrato; en CaaS el alza es de CTCx. `subastas/page.tsx`, `subastasActions.ts`, `src/lib/subastas/*`,
  `buyerActions.ts` (con CP-1/CP-3 para la UI).
- **Guardianes.** `qa-subastas-check` (30).
- **Hoy:** `Tanda CN-4 del plan de narrativa (§4): la subasta Tyrian en US$/kg sobre FOB Colombia, reglas por programa publicadas antes de abrir, y el 80 % del alza al productor solo en Cherry Picked, a COP el día del pago.`

### CN-5 · consolas · OCP · la evaluación como la cuenta el guion · M

- **Alcance.** Tarifa $200.000 con descuentos 30/50/60/70 (desde `pvc_model_versions.params` o la constante
  compartida con KR-1); envío incluido (guía prepagada); retirar el reembolso del 80 % al rechazado; contra-catación
  externa pedida en 5 días hábiles con **crédito a favor** (ledger que se liquida al cierre del mes y se hace efectivo
  con un trato); avisos al productor que hoy faltan: finca aprobada (`approveFinca`), lote Apto, resultado. El cobro
  real llega con O-3.
- **Guardianes.** `qa-evaluaciones-check` (42), `qa-jornada-check`, `qa-visa-check`.
- **Hoy:** `Tanda CN-5 del plan de narrativa (§4): tarifa de evaluación de $200.000 con descuentos y envío, sin reembolso del 80 %, contra-catación con crédito a favor, y avisos al productor al aprobar la finca, declarar Apto y publicar el resultado.`

### CN-6 · consolas · OCP · la Arena abierta · M

- **Alcance.** `showcaseGate` sin exigir contrato para Blue+; el productor se postula desde KR (`arena_inscriptions`
  por el productor, `producerActions`) y ve su lugar en la fila de grabación; `inviteLotToArena` pasa a ser la
  aceptación. `nominadosActions.ts`, `arenaActions.ts`, `src/lib/arena/*`.
- **Guardianes.** `qa-jornada-check`, `qa-kr-panel-check`.
- **Hoy:** `Tanda CN-6 del plan de narrativa (§4): Arena abierta a todo café Blue+ sin contrato, postulación desde el panel del productor y fila de grabación, con la invitación del OCP como aceptación.`

### CN-7 · consolas · OCP · UID/QR del lote y el sticker · M

- **Alcance.** Identificador público del lote (el `lotId` de la ficha pública o un UID corto) → QR que resuelve a
  `/docs/ficha/[lotId]` (lista blanca); sticker imprimible desde OCP · Fichas con nombre del productor y finca si el
  lote va por Cherry Picked, o «CTCx Selection» si `ctc_selection`; ficha pública con Papagayo Beans® y la finca como
  dato no protagonista en CTCx Selection (`fichaPublica.ts`, `docs/ficha/[lotId]/page.tsx`). Diseño físico: O-4.
- **Guardianes.** `qa-ficha-publica-check` (105), `qa-fichas-check` (31).
- **Hoy:** `Tanda CN-7 del plan de narrativa (§4): QR/UID del lote hacia la ficha pública, sticker imprimible de productor y finca (o CTCx Selection) desde OCP · Fichas, y la ficha pública con Papagayo Beans® y la finca como dato en CTCx Selection.`

### KR-2 · kaffetal-regal · el panel · M

- **Alcance.** Perfil antes que finca (`PerfilTab`); `ContratosTab` con la tabla de salida de la escalera antes de
  firmar, el reporte de ventas y los pagos por entrega (CN-3); postulación a la Arena para Blue+ con su fila (CN-6);
  «Su café en el mundo»: cómo se ve la bolsa (Papagayo Beans®, sello, su nombre y su finca); avisos de finca, Apto y
  resultado (CN-5); vocabulario «Arena» en `LoginModal`, `FichaView`, `ShipmentInstructionsModal`.
- **Guardianes.** `qa-kr-panel-check` (119), `qa-ofertas-check`, `qa-evaluaciones-check`.
- **Hoy:** `Tanda KR-2 del plan de narrativa (§4): perfil antes que finca, tabla de salida de la escalera y reporte de ventas en Contratos, postulación a la Arena con fila, «su café en la bolsa» y los avisos del OCP en el panel.`

### CP-3 · cherry-picked · catálogo y ficha · M

- **Alcance.** Green lee mínimos por grado desde la edición (CN-3) y muestra la lista FOB desde
  `public_pvc_current` (pila n2 en US$) con la lista CaaS marcada «en construcción» según `canales.ts`; ficha pública
  y sneak peek con Papagayo Beans® y CTCx Selection con la finca como dato (CN-7); la puja en US$ en `TyrianSection`
  (CN-4). Es la tanda que deja la tienda lista para **el primer lote publicado**.
- **Guardianes.** `qa-sneak-peek-check` (194), `qa-ficha-publica-check`, `qa-checkout-check`, `qa-subastas-check`.
- **Hoy:** `Tanda CP-3 del plan de narrativa (§4): Green con mínimos desde la edición y lista FOB en US$, lista CaaS en construcción, ficha pública y cinta con Papagayo Beans® y CTCx Selection con la finca como dato, y la puja en US$.`

## 5 · Ola 3 · regiones y modelo v2.2.0

### CN-8 · consolas · BCP/OCP · regiones como dato y motor v2.2.0 · L

- **Alcance.** Tabla de regiones con sus habilitaciones (master roaster · regional enablement; «coming soon» como
  estado) y el MR ligado a `partner_accounts`; tablas de precio por región (5 grados × 4 precios + tostado in situ con
  la tarifa del MR y la conexión de CTCx, O-7); motor v2.2.0 (columna marítima para «puerto», DDP consolidado ≠
  dedicado, prima explícita, MOQ único en cargas); `canales.ts` leyendo la base en vez de la condición.
- **Guardianes.** `qa-pvc-canales` (57), `qa-pvc-motor`, `qa-pvc-lectura`.
- **Hoy:** `Tanda CN-8 del plan de narrativa (§5): regiones y habilitaciones como dato con el master roaster ligado a la región, tablas de precio por región con tostado in situ, y motor v2.2.0 con columna marítima y DDP consolidado distinto del dedicado.`

### CP-4 · cherry-picked · Green por región · M

- El comprador declara su región → `accesoDelComprador` desde la base; precios por tramo; Cherry Picked consolidado
  cuando haya MR; el mapa con estados reales. **Hoy:** `Tanda CP-4 del plan de narrativa (§5): Green por región —acceso, tramos y consolidado con master roaster— sobre las regiones como dato.`

### SO-2 · socios · el Master Roaster y el Centro de Calidad de verdad · L

- Panel del MR (recepción, tueste, empaque, despacho) con el módulo de etiquetas (PB por defecto, Co-Brand con
  productor y finca, My Brand con el diseño que entrega o aprueba el comprador) y su contraparte en el OCP; Centro de
  Calidad sellando merma, humedad y verde liberado con el CIR. **Hoy:** `Tanda SO-2 del plan de narrativa (§5): panel del Master Roaster con el módulo de etiquetas y su contraparte en el OCP; sello del Centro de Calidad con el CIR.`

### CP-5 · cherry-picked · Roast y X como productos (2027) · L

- Roast desde el catálogo de Green con las tres etiquetas; X con Papagayo Beans® tostado y empacado al consumidor
  directo; HORECA por CaaS con el MOQ de verde × 82 %. **Hoy:** `Tanda CP-5 del plan de narrativa (§5): Roast y X como productos —etiquetas, consumidor directo, HORECA al 82 %—.`

### HI-1 · herramientas-internas · «PVC × grado» · M

- Calculadora edición vigente × grado (SCA + V·P·R + base física) → oferta por carga y por kg, para OCP, KR y la
  visita de campo (la PAD de la reunión G&G como antecedente). **Hoy:** `Tanda HI-1 del plan de narrativa (§5): la calculadora «PVC × grado» sobre la edición vigente, para OCP, KR y campo.`

## 6 · Ola 4 · la escala de puntos (con O-2 validado)

### CN-9 · consolas · fase 2 de grados · L

- `definicion.ts` a «el Punto y la Tríada» (`puntosCtc`, `gradoPorPuntos`, catálogos `VARIEDAD_NIVEL` /
  `PROCESO_NIVEL` / `DENSIDAD_REFERENCIA`); base física como puerta en el veredicto (factor ≤ 94, Black hasta 98;
  humedad 10–12 %; densidad); `lot_fichas.reconocimientos`; multiplicadores PBC en `params`; JSON-LD y `GradosBoard`.
  Aviso previo a cada superficie que lea grados; KR-3 y el copy de grados de CP **en la misma tanda**.
- **Guardianes.** `qa-grados-check` (48), `qa-evaluaciones-check`, `qa-pvc-escala` (63).
- **Hoy:** `Tanda CN-9 del plan de narrativa (§6): definicion.ts a la escala de puntos con la base física como puerta del veredicto, y el copy de grados de KR y CP en la misma tanda.`

### KR-3 · kaffetal-regal y SE-2 · secretaria

- `OportunidadSection`, fichas de grado y FAQ con el Punto y la Tríada + base física (misma tanda que CN-9); Notion
  «Grados de Calidad CTC» con la escala nueva.

## 7 · Lo que ya estaba pendiente y se ordena detrás

No nace de la narrativa, pero compite por las mismas sesiones (`PVC_BCP_PLAN.md` §13.3): la espina (eventos `pvc.*`,
cron diario TRM/ICE C, ciclo semanal, dossier por GitHub Action), la pestaña Marco de mercado, la pestaña MOQ y mermas
rehecha sobre la tabla §14.4, la certeza al cerrar F4-2026, las correcciones de base A2–A11, los hallazgos de seguridad
del 2026-07-10 y la F1 del espejo con Notion. Van después de la ola 2 salvo que el owner los suba.

## 8 · Tablero

Se marca en el mismo commit que cierra la tanda (con su versión).

- [ ] O-1 · [ ] O-2 · [ ] O-3 · [ ] O-4 · [ ] O-5 · [ ] O-6 · [ ] O-7 · [ ] O-8
- [ ] CN-1 · [ ] CN-2 · [ ] CP-1 · [ ] CP-2 · [ ] KR-1 · [ ] SO-1 · [ ] SE-1
- [ ] CN-3a · [ ] CN-3b · [ ] CN-4 · [ ] CN-5 · [ ] CN-6 · [ ] CN-7 · [ ] KR-2 · [ ] CP-3
- [ ] CN-8 · [ ] CP-4 · [ ] SO-2 · [ ] CP-5 · [ ] HI-1
- [ ] CN-9 · [ ] KR-3 · [ ] SE-2
