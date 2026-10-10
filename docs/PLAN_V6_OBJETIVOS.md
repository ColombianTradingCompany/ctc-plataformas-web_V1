# Plan V6 · los tres objetivos de mejora después de la V6.0

> **Origen.** El owner, 2026-10-10, al cerrar el sprint que llevó la plataforma a la **V6.0**: «deja el terreno preparado para
> continuar desde aquí con los siguientes objetivos de mejora: 1. Update de todos los Landing Pages con la narrativa y
> conceptos actualizados. 2. Triage y Catálogo Activo. 3. Cherry Picked Login (mejora de UI/UX y contenido mostrado)».
>
> **Cómo se usa.** Una conversación por objetivo, arrancada con su prompt de `docs/KICKOFF.md` («Objetivos V6»). Cada
> objetivo se ejecuta en **tandas** (una versión cada una, con su guardián), y **ninguna tanda empieza sin las decisiones del
> owner que la condicionan** (§5). Este plan es la materia prima: cada sesión lo relee contra el código antes de tocar nada
> (las líneas citadas son del 2026-10-10 y se mueven). Lo que una tanda cierra se tacha aquí y se anota en el charter de su
> dueño y en `ALINEACION.md` §3.
>
> **Una regla que cruza los tres** (owner, 2026-10-10, ejecutada en el Dossier público y la vitrina en la V5.202): **nada
> público ni del comprador debe facilitar llegar al productor sin pasar por CTCx** — ni el nombre de la finca (tampoco dentro
> del nombre del lote), ni el municipio, ni la historia libre de la finca, ni su foto de perfil; y los documentos que salen
> llevan marca de agua. Cualquier texto, tarjeta o vista nueva de estos objetivos la respeta.

## §0 · Estado de partida (V6.0, 2026-10-10)

| Dato | Valor |
|---|---|
| Lotes en la vitrina pública (`public_lot_vitrina`) | 6, todos CVA, ninguno declarado en el Catálogo Activo («Próximamente») |
| Declaraciones en el Triage (`catalogo_fuentes`) · listados (`lot_listings`) | 0 · 0 |
| Tratos por ventana vigentes (`purchase_contracts`) | 6, todos provisionales (la ratificación es del productor) |
| Despachos pendientes | 6 sacos de 70 kg |
| Stock CTCx | 1 partida (SX-2026-0001, una compra de prueba que el owner puede anular desde la V5.203) |
| Ajustes del Triage | O&P y trilla configurados (su valor vive SOLO en la base); 1 referencia de Empacado hasta FOB, «REF 1 TEST» |
| Compradores | 3, todos en nivel Verde con 0 puntos; uno es la cuenta de comprador de **auditoría** de la V5.98 (`@ctc-qa-test.co`, del nodo final, credenciales solo en `.env.local`; la usan `qa-guard` y `qa-checkout`, que se corren a mano). Si sirve para conducir la tienda con sesión es la decisión 13 |

## §1 · Objetivo 1 — Las landing pages con la narrativa y los conceptos vigentes

**Dueños.** `plataforma` (CTC Home, SEO, calendario compartido), `kaffetal-regal` (su landing y `faq.ts`), `cherry-picked`
(portada, Green, Roast, X, CaaS), y la red (`directorio`, `ctc-tech`, `varietales`, `socios`, `terratalento`).

**La fuente de la narrativa.** Las narrativas v4 (2026-10-08, fuera del repo: `C:\dev\ctc-platforms\reference\narrativa-2026-10-08-en\textos_{es,en,de,ja}.py`)
— **con una corrección**: dicen «el SCA 2004 es el protocolo primario y el CVA se homologa», y desde la V5.189 es al revés (el
**CVA es el principal** y el SCA 2004 vale lo mismo; `docs/PLAN_CIRCUITO_DEL_LOTE.md` §10.6). La narrativa de Cherry Picked v4
**no existe** (solo la v3 en `reference/narrativa-2026-09-17/3-CP.html`): es requisito de la tanda D.

**Superficies y archivos.** CTC Home (`src/components/ctc-home/*`, ES·EN·DE) · Kaffetal Regal (`src/components/kaffetal-regal/{Landing,Hero,BienvenidosSection,OportunidadSection,CalendarioSection,MercadoBand,TratoSection,ArenaSection,PorQueSection,FaqSection,GygSection,Footer,Header,LoginModal}`,
`src/lib/kaffetal/faq.ts` que alimenta el JSON-LD `FAQPage`; ES·EN·DE, el `LoginModal` solo ES) · Cherry Picked (`cherry-picked-hub/HubLanding.tsx`,
`cherry-picked/*`, `cherry-picked-roast/RoastLanding.tsx`, `cherry-picked-x/XLanding.tsx`) · servicios (`services/*`, `servicesCopy.tsx`) ·
Directorio, Terratalento y Socios (**solo ES**, contra «tres idiomas en toda superficie pública») · compartidos (`src/lib/harvestYear.ts`
+ `src/components/HarvestCalendar.tsx`, `src/lib/seo/jsonLd.ts`, las metadatas de cada `page.tsx`).

**Incongruencias, por tema** (inventario del 2026-10-10; cada tanda las re-verifica):
1. **La Arena como competencia** («podio», «otra vez a ciegas», «Jornada de Arena»): desde la V5.77 son sesiones de segunda
   apreciación. KR `ArenaSection`, `Landing`, `LoginModal:85`, `faq.ts`, `HarvestCalendar`, `harvestYear.ts`, CP `GradosSection`,
   `CosechaSection`, `NarrativaSection`, `CatalogoPopup`, `HubLanding`, `RoastLanding`, `CaasLanding`, `servicesCopy`, Varietales,
   Directorio, `partners.ts`, metadatas de `app/page.tsx`, `app/kaffetal-regal/page.tsx`, `cherry-picked-green`, `caas` y `jsonLd.ts`.
2. **«SCA» como protocolo** donde el principal es el CVA: KR `OportunidadSection` (y `rangoDelGrado` «SCA desde 82»), CTC
   `MomentSection` (atributos del 2004), CP `NarrativaSection` («pts SCA»), `jsonLd.ts`. (Los cursos SCA del Directorio son legítimos.)
3. **El calendario de «dos cosechas, S1/S2, dos veces al año»**, con TRES definiciones de temporada que se contradicen (CTC
   `Hero`, `harvestYear.ts`, CP `Hero`): rige el calendario de ciclos (`docs/PLAN_CICLOS.md`, `src/lib/trato/calendario.ts`).
4. **El trato viejo** (15 kg, congelar 3 meses, escalera 400 → 200 → 100, pago al mes 3, humedad 10–11,5 %): rigen el saco de
   70–200 kg, las ventanas, el 25/30 % libre, el 4 %, los baches y el 60/40. KR `TratoSection`, `faq.ts`, CTC `EcosystemSection`
   («Trato mes a mes»), `HarvestCalendar`, `OportunidadSection` («precio del día»), CP `ManifiestoSection`, `BienvenidosSection`.
5. **La evaluación**: «certificación gratuita» (`faq.ts`, Directorio) contra la tarifa de $200.000; «Evaluación subvencionada»
   en CTC `EcosystemSection` (la regla es **coinversión**); los videos como obligatorios (opcionales desde la V5.143).
6. **Kaffetal Club** en KR `PorQueSection` (retirado en la V5.77).
7. **«Ficha técnica» o «datasheet» para el comprador** (desde la V5.198 es el Dossier público): CP `ManifiestoSection` (fijado por
   `qa-sneak-peek`), `GradosSection`, `LotCard` («demo PDF»), `CatalogoPopup`, `HubLanding`, `NarrativaSection`, KR `TratoSection`,
   `servicesCopy`, `HarvestCalendar`. (La Ficha Técnica DEL PRODUCTOR sigue vigente.)
8. **Europa, Ámsterdam, EXW y zonas UE** donde la narrativa dice FOB en US$ y regiones habilitadas: CTC `Hero`, `EcosystemSection`,
   `MomentSection`; KR `OportunidadSection`, `TratoSection`, `faq.ts`; CP `EnviosSection`, `Cart`, `ProfileView`, `Footer`,
   `HistoriaSection`, `HubLanding`, `RoastLanding`; `ContactModal`, `servicesCopy`, Directorio, `partners.ts`, metadatas, `jsonLd.ts`.
9. **Los programas de Cherry Picked** (CaaS, Green, Roast, X) descritos con el modelo viejo (tanda CP-2 del plan de narrativa).
10. **Papagayo Beans®** casi ausente (solo en `RoastLanding`).
11. **La razón social en tres versiones** (`legal.ts`/contrato «Colombian Trading Company», Base Corporativa «… S.A.S.», narrativa
    «CTCX Colombian Trading Company SAS») y unas 200 menciones de «CTC» suelto.
12. **Cómo se explica el grado** («lo asigna un comité», «el puntaje decide», escala base 100 que no coincide con los
    multiplicadores de `motor.ts`, «100 % de origen · nada se mezcla» contra los Regional Blend).
13. **Las consolas** («tres consolas» contra cuatro; «CTC no es dueño de ninguna máquina» contra el Stock CTCx).
14. **Los nodos socio** (tanda SO-1 pendiente: el Centro de Calidad sin su papel en la evaluación).
15. **Promesas sin código** (el QR de la bolsa, CN-7; Tyrian en EUR, CN-4).
16. **La promesa de la finca** en la vitrina («de qué finca salió», el pilar 01 del Manifiesto): choca con la regla de arriba.

**Tandas.** **A** · fuentes compartidas y SEO (el calendario de ciclos para las tres superficies, `jsonLd.ts`, las ~15 metadatas,
`legal.ts` cuando el owner fije la razón social) — guardianes `qa-grados`, `qa-tools-seo`, `qa-catalogo-publico`, `qa-nav`.
**B** · Kaffetal Regal (índice, Bienvenidos con los 6 pasos de la v4, Oportunidad con multiplicadores y Punto/Tríada leídos de la
fuente, Trato con la tabla Cherry Picked vs CTCx Selection, PorQué, Arena, las preguntas de `faq.ts` con PVC, Flete, Tríada,
Selection y Dossier/Find my Lot, `LoginModal`, metadata) — `qa-solicitud-evaluacion`, `qa-kr-panel`, `qa-nav`, `qa-catalogo-publico`.
**C** · CTC Home (Hero, Ecosystem, Moment, `pageIndex`, `ContactModal`, la arquitectura de marca «CTCx motor / Papagayo Beans®
café») — `qa-crm-interes`, `qa-nav`, `qa-catalogo-publico`; retirar la clave `cocreate` exige migrar `leads.pillar`.
**D** · Cherry Picked (portada y programas: CP-2 y el resto de CP-1; requiere la narrativa CP v4) — `qa-sneak-peek` (fija el
Manifiesto y la tienda), `qa-moneda`, `qa-muestras`, `qa-crm-interes`, `qa-tools-seo`, `qa-subastas`.
**E** · el resto de la red (Directorio y su i18n, `partners.ts`, `ControlPanelLanding`, Varietales, la marca en CTC Tech, Coffeed,
Herramientas y Terratalento) — `qa-recuperacion`, `qa-rutas-consolas`, `qa-nav`.

## §2 · Objetivo 2 — Triage y Catálogo Activo

**Dueño.** `consolas` (el Triage, el Stock, el Catálogo Activo), con `cherry-picked` (la tienda que vende lo declarado).
**Plan que manda:** `docs/PLAN_TRIAGE_CATALOGO.md` (§6 las 12 suposiciones, §7 lo que quedó fuera de alcance). La V5.203 ya unió
Adquisición de Stock Café → Stock CTCx → Triage → CTCx Selection → Catálogo Activo como un circuito (franja común, enlaces
profundos `?partida=`/`?contrato=`, disponible coherente con la base, anulación de compras): **leer su entrada del CHANGELOG antes
de empezar**.

**Incongruencias abiertas** (2026-10-10):
- El **anticipo** (`deposit_pct`) y la **llegada** que se editan en el Catálogo Activo **no llegan a la tienda ni a `place_order`**
  (30 % fijo en `data.ts`, `LotCard.tsx` y la función de la base).
- El **MOQ del Black tiene tres números**: 228 kg (`motor.ts`, el que pone el Triage), 42 × 6 kg = 252 kg (charter de CP) y 350 kg
  (`ASSOC_BLACK_MOQ` en `data.ts`, que pisa el del listado para todo comprador con sesión).
- **Lo declarado desde el stock (`spot`) no se vende salvo si es Black**: `GradosSection` solo enseña los `pre` (Red, Blue, Gold) y
  `BlackSection` enseña todo Black (un Black `pre` sale dos veces).
- **Dos proyecciones públicas del mismo lote**: la tienda lee `public_lot_catalog` (promedio de evaluaciones, código «BK-XXXX») y la
  vitrina `public_lot_vitrina` (el Punto de la evaluación que rige, la referencia CTC-L-). Hoy coinciden; con una re-evaluación no.
- La vitrina pública enseña los tratos sin declarar como «Próximamente»; la tienda con sesión, nada.
- La tienda dice «kg» sin decir «de verde» (pendiente del charter de CP desde la V5.196).
- Privacidad (crítico del 2026-10-10): `lot_listings` lo lee `anon` entero (borradores y archivados, con precio); la vista de
  transparencia del precio al productor — ver lo que la V5.203/V6.0 dejó hecho en su CHANGELOG antes de tocarla.
- Fuera de alcance según el plan (§7): que una venta de la tienda descuente el stock o la cuenta del contrato; declarar tostado o
  empacado; las mezclas físicas.

**Tandas.** **A** · activar con datos reales (la referencia de Empacado hasta FOB con flete real, declarar los 6 tratos, comparar
el ancla con el N2 del PVC; verificar con SQL). **B** · del Triage a la tienda sin perder reglas (`deposit_pct` y `arrival_date` en
la tienda y en `place_order`; un solo MOQ; `spot` y `pre` visibles por grado; «kg de verde»; una sola proyección pública con la
referencia CTC-L-) — `qa-triage-catalogo`, `qa-moneda` (fija la fórmula del carrito), `qa-sneak-peek`, `qa-catalogo-publico`,
`qa-ficha-publica`, `qa-compras`; `qa-checkout` escribe en producción con la cuenta de comprador de auditoría (V5.98, `.env.local`), pide un listado publicado y se corre a mano. **C** · las ventas
salen del stock y del contrato (plan §7). **D** · UX del Triage (ruta `/ocp/triage` con 308, declarar en lote, tostado y empacado,
mezclas físicas).

## §3 · Objetivo 3 — El login de Cherry Picked (UI/UX y lo que ve el comprador)

**Dueño.** `cherry-picked`. Depende de la tanda B del objetivo 2 para las reglas comerciales.

**Lo más grave (2026-10-10): un comprador que inicia sesión ve el catálogo VACÍO.** Al entrar desaparecen la cinta y «Find my Lot»
y sale `GradosSection`, que lee `lot_listings` publicados (hoy 0) sin mensaje para el vacío — contra la promesa de `CatalogoPopup`
y contra la regla del owner de la V5.199 («Find my Lot» en CTC, KR y CP).

**Problemas.** (1) El catálogo con sesión vacío (arriba). (2) **Llegar al login es un laberinto**: en CTC, KR y la portada los
botones de la ventana llevan a la portada; la portada no le pasa `onOpenLogin` (`HubLanding.tsx`); «Crear cuenta gratis» saca al
comprador a la portada; Roast y X no tienen acceso. (3) **La tarjeta del lote se quedó atrás**: puntaje sin protocolo ni Tríada, cae
al estimado del productor, enlaces «Cupping/Origin/Datasheet» de demostración en vez del Dossier público, código «BK-XXXX» en vez
de la referencia CTC-L-, sin foto ni sello, sin decir la base del precio. (4) **Reglas comerciales escritas a mano** en conflicto
con el Triage y la narrativa (30 %, 350 kg, `PACK_PRICE = 300` contra los Sample Kits CP/Plus/Max, zonas UE y EXW, Tyrian en EUR
con nivel Pintón obligatorio — los 3 compradores están en Verde: hoy nadie puede pujar —, niveles por puntos acumulados contra la
tríada ponderada del charter). (5) **Contenido con fecha vencida** (`Hero` de julio de 2026, `MuestrasSection`, `ProfileView`).
(6) **A «Mi cuenta» le falta** el estado del pedido de muestras, la región del comprador y el enlace al Dossier de cada lote.
(7) Código muerto (ramas sin sesión de `changeQty`, `moqAnon`).

**Tandas.** **A** · entrada y continuidad (login desde la portada y Roast/X; la ventana abre el alta dentro de CP; con sesión se
conservan la cinta y «Find my Lot»; mensaje del catálogo vacío; aviso de la regla productor/comprador antes del alta) —
`qa-sneak-peek` (fija cómo pinta la tienda con sesión), `qa-catalogo-publico`, `qa-recuperacion`, `qa-nav`. **B** · la tarjeta del
lote con lo vigente (referencia CTC-L-, Punto con su protocolo — `rotuloDelPunto` —, sello, Dossier público, foto, «kg de verde», base
del precio, una sola lectura de datos, y SIN finca ni municipio: la regla de arriba) — `qa-sneak-peek`, `qa-ficha-publica`,
`qa-compras`. **C** · las reglas comerciales desde el Triage (anticipo y llegada, MOQ, Sample Kits en vez del pack de 300, envío y
base del precio, `place_order`; depende del objetivo 2 B) — `qa-moneda`, `qa-muestras`, `qa-triage-catalogo`, `qa-checkout` (a
mano). **D** · Mi cuenta (estado de los Sample Kits, región, reputación ponderada, la puja Tyrian y CN-4 a US$) — `qa-subastas`,
`qa-muestras`. **Riesgo para todas:** la única cuenta de comprador de prueba es la de auditoría de la V5.98 (del nodo final); hasta que el owner decida si sirve para conducir la tienda (decisión 13), el flujo con sesión no se conduce en un navegador.

## §4 · Lo que cruza los tres

- La regla anti-circunvención (arriba) es la misma para las landings (objetivo 1, tema 16), la tienda (objetivo 3 B) y el catálogo
  (objetivo 2 B).
- **FOB Colombia en US$ o DDP por región** decide textos del objetivo 1 (tema 8), la tarjeta y el carrito del 3, y el ancla del 2.
- El objetivo 3 C no empieza antes del objetivo 2 B.
- Las tres sesiones dejan su línea en `ALINEACION.md` §3 y tachan aquí lo que cierran.

## §5 · Decisiones del owner que condicionan las tandas

1. **Razón social única** (`legal.ts`): «CTCX Colombian Trading Company SAS», «Colombian Trading Company» o «… S.A.S.»; y si el paso
   de «CTC» a «CTCx» alcanza a nombres de producto («CTC Tech», «by CTC»). — Objetivo 1 A.
2. **El calendario público**: ¿el gantt de «dos cosechas, dos Arenas, S1/S2» se sustituye por el de ciclos (trimestres ISO,
   publicación, semanas sin contratos) en CTC, KR y CP, o el año agrícola queda como contexto? — Objetivo 1 A.
3. **La base del precio al comprador**: FOB Colombia en US$ (narrativa v4, Triage) o DDP vía el Master Roaster (decisión del
   2026-09-16); ¿salen Ámsterdam, EXW y las zonas UE? — Objetivos 1, 2 y 3.
4. **Los programas de CP**: ¿X = consumidor directo y CaaS = envío dedicado? ¿Se publica el mapa de regiones habilitadas? — Objetivo 1 D.
5. **La narrativa CP v4 y la corrección CVA de las v4**: ¿se rehacen antes de la tanda D? ¿Directorio, Terratalento y Socios pasan a
   ES · EN · DE? — Objetivo 1.
6. **La vitrina y la tienda**: ¿se ve lo «Próximamente» (tratos sin declarar) o solo lo declarado? — Objetivos 2 y 3.
7. **Anticipo y llegada**: ¿mandan los del listado en la tienda y en `place_order`, o se queda el 30 % fijo? — Objetivo 2 B.
8. **El MOQ que ve el comprador**: 228 kg, 252 kg (42 × 6) o 350 kg; ¿en kg de verde o en cargas? — Objetivo 2 B.
9. **Las ventas descuentan solas** el stock y la cuenta del contrato, o CTCx lo confirma a mano. — Objetivo 2 C.
10. **El Triage se muda a `/ocp/triage`**; ¿tostado y empacado entran al catálogo antes de Roast/X? ¿Una referencia de Empacado
    hasta FOB por puerto o una sola? — Objetivo 2 D.
11. **El login**: ¿en la portada de Cherry Picked para toda la familia o solo en Green? — Objetivo 3 A.
12. **Niveles del comprador**: ¿puntos acumulados o la tríada ponderada? ¿La puja Tyrian sigue exigiendo Pintón? ¿La tienda vende
    los tres Sample Kits y retira el pack de US$300? — Objetivo 3 C y D.
13. **Una cuenta de comprador de prueba** (en el dominio de prueba de la casa, credenciales solo en `.env.local`) para conducir la
    tienda con sesión: ¿se usa la de auditoría de la V5.98, que ya existe y es del nodo final (`ALINEACION.md` §4.6), o se crea otra?
    — Objetivos 2 y 3.
