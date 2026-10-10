# Charter · `cherry-picked` — Cherry Picked (landing + plataforma del comprador)

> Se lee con `docs/ALINEACION.md` al lado. Grupo de la barra lateral: **Cherry Picked**.

## Qué es

La plataforma de **compra** para tostadores y marcas europeas: la **portada** (`cherry-picked.ctcexport.com`)
que reparte cuatro programas — **Green** (la tienda de microlotes por fracciones, con la **subasta Tyrian**),
**Roast** y **X** (listas de espera para 2027) y **CaaS · Coffee as a Service** (captación Clase B: una
marca propone un proyecto y CTC pone la proveeduría). Una cuenta de comprador (`buyer_profiles`, niveles
verde → pintón → maduro por puntos) sirve para todo. El **Active Catalogue Sneak Peek** (la cinta de tarjetas
que voltean) es la cara pública del catálogo; el catálogo con precios pide sesión.

## Superficies y rutas

| Ruta | Qué |
|---|---|
| `/cherry-picked` | portada (`HubLanding`: vídeo de fondo, sellos pulsables, bandas) |
| `/cherry-picked-green` | la tienda (`CherryPickedExperience.tsx`: catálogo por grado, carrito, checkout `place_order`, perfil, **`TyrianSection`** con la puja real, Coffeed, gadgets) |
| `/cherry-picked-green/herramientas/[slug]` | la concha de Herramientas del Café en esta superficie |
| `/cherry-picked-roast` · `/cherry-picked-x` | scaffolds + suscripción (`newsletter_subscribers`, fuentes `roast`/`x`) |
| `/caas` (`/co-create` → 308) | landing + formulario Clase B (pilar `cocreate` — la MARCA es CaaS, la CLAVE es cocreate) |
| `/api/catalogo/sneak-peek` | la cinta (anon, `s-maxage=900`) |
| `/docs/ficha/[lotId]` | desde la V5.198 solo redirige (308) al Dossier público de un lote de la vitrina, o 404 (la ficha técnica se retiró) |
| `/ctcx-public-catalogue` · `/ctcx-public-catalogue/[codigo]` | «Find my Lot» y el **Dossier público** del lote por su referencia `CTC-L-XXXXXXXX` (V5.198; un código viejo `CTCX-…` redirige; V5.48, charter `plataforma`, nacida en `consolas` · OCP, **solo www**) |
| `/api/catalogo/foto/[referencia]` | la foto de la tarjeta de un lote de la vitrina (V5.198; pasa por la vista, WebP 3:2) |

## Mapa de código

- `src/components/cherry-picked/` — `CherryPickedExperience.tsx`, `TyrianSection.tsx` (subasta real, V5.24),
  `GradosSection`, `BlackSection`, `Cart`, `ProfileView`, `EnviosSection`, `LoginModal`, `i18n.ts` (EN · ES · DE),
  `data.ts` (`moqOf`, `importe` —antes `eur`, V5.52—, `fmt`, `ASSOC_BLACK_MOQ = 350`).
- `src/components/cherry-picked-hub/HubLanding.tsx`, `cherry-picked-roast/`, `cherry-picked-x/`,
  `src/components/services/CaasLanding.tsx`.
- `src/components/catalogo/SneakPeek.tsx` (montado en 7 superficies) y `RadarCvaTarjeta.tsx` (V5.198), `src/lib/catalogo/{sneakPeek,
  vitrina,vitrinaVista,atributosSca,perfilCtcx}.ts` (V5.198: la vitrina de los lotes del Triage y el Dossier público, que proyecta
  `src/lib/kaffetal/dossierPublico.ts`) (`perfilCtcx.ts`, V5.85: el perfil único de CTCx Selection, sin `server-only`, lo leen la cinta, la tienda, el portal y la ficha) (`sneakPeek.ts` es `server-only`: **nunca importar un VALOR desde cliente**).
- `src/lib/subastas/{tipos,buyerActions}.ts` (`listarSubastas`, `pujar`: sesión + Pintón; la regla del
  monto vive en el trigger `auction_bids_guard`).
- `src/lib/newsletter/actions.ts` (`SOURCES`), `src/lib/market/` (lee), `src/lib/leads/actions.ts` (CaaS, compartido).

## Tablas que posee

`buyer_profiles` (guard: no auto-asignar puntos/nivel) · `lot_reservations` · `orders` · `order_items` ·
`points_ledger` · `sample_pack_orders` · `auction_bids` (vía `pujar`) · `newsletter_subscribers` (escritura
por `newsletter/actions`).
**Solo lee**: `lot_listings` (los declara el Triage del OCP desde la V5.196; hoy por una política ancha,
`lot_listings_select_public`, que es fila de `ALINEACION` §3b), `shipping_zones`, `lot_auctions`, las vistas
`public_lot_vitrina` (V5.198, la cinta y el portal), `public_lot_catalog` (la tienda) y `public_transparency_pricing`
(SECURITY DEFINER, columnas estrechas — **jamás** sustituir por una política ancha sobre `lots`/`fincas`), `market_anchors`,
`coffeed_sources`. RPC `place_order`.

## Guardianes

`qa-sneak-peek-check.mjs` (194) · `qa-subastas-check.mjs` (30) · `qa-checkout-check.mjs` (`place_order`,
con la cuenta de comprador de auditoría — ~~**hoy no corre**: las cuentas de prueba se eliminaron en la V5.89 y la V5.92~~ desde la
V5.98 la lee de `.env.local` (`QA_BUYER_EMAIL`, del nodo final) y se corre a mano porque escribe en producción; pide además un
listado publicado y al 2026-10-10 hay 0, así que corre cuando el Triage declare el primero; `ALINEACION` §4.6) · `qa-ficha-publica-check.mjs` (desde la V5.198 vigila el
**Dossier público**: la lista blanca con un dossier lleno de centinelas; desde la V5.202, que no salga nada de la finca) ·
`qa-crm-interes-check.mjs` (fuentes de la lista de espera) · `qa-recuperacion-check.mjs` (puerta CP).

## Reglas propias

- **Nada comercial sale por la cinta**: el tipo `SneakPeekLot` no tiene dónde ponerlo; un campo nuevo se
  añade a propósito y el guardián obliga a justificarlo. Tyrian nunca aparece en la cinta (es de subasta).
- **El Dossier público es lista BLANCA** (`lib/kaffetal/dossierPublico.ts`, V5.198; antes la ficha pública, `fichaPublica.ts`): un
  campo nuevo del dossier nace privado, y el service role lo carga SOLO después de la vista `public_lot_vitrina`.
- **Nada público ni del comprador lleva al productor sin pasar por CTCx** (owner, 2026-10-10; V5.202; contrato «Lo público del
  lote» de `ALINEACION` §1): ni el nombre de la finca (tampoco dentro del nombre del lote: la vitrina enseña el que GENERA la vista),
  ni el municipio, ni la historia de la finca, ni su foto de perfil; queda la región (departamento y país), y los documentos que salen
  llevan marca de agua. Toda tarjeta, texto o vista nueva de la tienda la respeta.
- **Dos caras del lote comprado en firme**: la vitrina muestra el **perfil único de CTCx Selection** (`ctc_selection`, que desde la
  V5.85 sale de `compras` y desde la V5.195 solo de las compras de CTCx Selection —un saco recibido por un trato por ventanas ya no
  oculta la finca—; el rótulo es `rotuloCtcx(perfil)`, que cae a `CTC_RAZON`), ~~la ficha muestra la finca real como dato~~ —
  **ya no desde la V5.202**: ningún lote enseña su finca en público; el registro (pasaporte, rastro EUDR) la conserva.
  Se anula en la vista, no en el componente.
- **Subasta**: EUR/kg; el comprador jamás toca `lot_auctions`/`auction_bids` con su sesión; adjudicar es del
  OCP y **no emite oferta** (la oferta al productor es COP/kg).
- La etapa del CRM del comprador se **deduce** de los pedidos (0/1/2+), nunca se persiste.
- Copy EN · ES · DE; la copia de los programas sale del diccionario compartido con la portada.

## Lo que las consolas gobiernan de este componente

| Quién | Qué | Dónde |
|---|---|---|
| OCP · Catálogo | ~~**publicar** un lote (`publishLot`: contrato vigente **o cumplido** —V5.85, lo comprado en firme— con ≥1 envío registrado; el gate del Club se retiró en la V5.77), `lot_listings`, `total_kg` sincronizado de las liberaciones (desde la V5.84, espejo al 100 % de cada envío del mes: la escalera 50/75/100 murió)~~ — **desde la V5.196 lo gobierna el Triage de Catálogo Activo**: CTCx **declara** un trato por ventanas o una partida del Stock CTCx con su FOB mínimo (`declararEnCatalogo`, `retirarDelCatalogo`); `lot_listings.total_kg` son kg de verde declarados y `price_per_kg` no baja del ancla; el Catálogo Activo edita y archiva (`editarListado`, `archivarListado`) | `triageActions.ts`, `catalogActions.ts` |
| OCP · Subastas | abrir · cerrar · adjudicar · cancelar la subasta Tyrian | `subastasActions` |
| OCP · Oferta desde CTCx Selection / Compras (V5.85) | qué lote se muestra como **CTCx Selection** (hay filas en `compras`, cualquier grado menos Tyrian), el **perfil único** de la casa (nombre · lema · descripción · imagen: `platform_settings.ctcx_selection_perfil` → vista `public_ctcx_selection_perfil`) y la **imagen por lote** (`ctcx_selection_lotes` → `public_lot_catalog.ctcx_imagen_path`, bucket público `ctcx-selection`) | vistas `public_lot_catalog` · `public_ctcx_selection_perfil`; `src/lib/catalogo/perfilCtcx.ts` |
| **LCP** · CRM CaaS / Green / Roast / X (del OCP hasta la V5.58) | respuestas a leads, etapa manual del comprador, contacto de la lista de espera | `/lcp/crm/*` (las `/ocp/crm/*` son talones 308) |
| BCP · Modelo Económico (PVC) | MOQ y moneda al comprador — **decididos** (2026-09-15 y §14 del 2026-09-17): la moneda ya se ejecutó (V5.52, `lib/precios/moneda.ts`); los mínimos por grado siguen sin ejecutar (segunda mitad de CP-1) | `PVC_BCP_PLAN.md` §8–§9, §14.4 |
| BCP · Herramientas del Café | gadgets y nivel Plus en la tienda | charter `herramientas-cafe` |

## Pendientes

- **V5.202 · la vitrina y la tienda sin datos que lleven al productor** (owner, 2026-10-10; ejecutado desde WRAP-COMMIT-PUSH). La
  cinta pinta el nombre generado, la referencia, el sello, el Punto y la región; `public_lot_catalog` (la tienda) sirve el mismo
  nombre, sin finca, municipio ni notas libres, y es de solo lectura; el pedido guarda el nombre generado; la subasta Tyrian sin
  sesión ya no enseña la finca. Abierto, decisión del owner: el pilar 01 del Manifiesto sigue prometiendo «finca, personas…
  verificables lote a lote en la ficha técnica» (lo fija `qa-sneak-peek`). Y el pie de Green ya no lleva el loop grande.
- **V6 · lo que sigue: tres frentes de este componente** (owner, 2026-10-10, al declarar la V6.0; plan
  `docs/PLAN_V6_OBJETIVOS.md`, una conversación por objetivo desde `docs/KICKOFF.md` «Objetivos V6»; **ninguna tanda empieza sin
  las decisiones del owner de su §5**; fila en `ALINEACION` §3b):
  - **Objetivo 1, tanda D · la portada y los programas** (CP-2 y lo que queda de CP-1): `HubLanding`, `RoastLanding` (con
    `FEE_EUR_KG`), `XLanding`, `CaasLanding`, `servicesCopy` y las secciones de Green que no venden (Hero, Envíos, Muestras,
    Cosecha, Narrativa, Manifiesto, Historia, Footer, el texto de Tyrian). Requiere la narrativa CP v4, que no existe (solo la v3), y
    las decisiones 3, 4 y 5. Guardianes: `qa-sneak-peek` (fija el Manifiesto y la tienda), `qa-moneda`, `qa-muestras`,
    `qa-crm-interes`, `qa-tools-seo`, `qa-subastas`.
  - **Objetivo 2, tanda B · del Triage a la tienda sin perder reglas** (con `consolas`): `deposit_pct` y `arrival_date` en la
    tienda y en `place_order` (hoy el 30 % está fijo en `data.ts`, `LotCard.tsx` y la función de la base), un solo MOQ (retirar
    `ASSOC_BLACK_MOQ = 350`), `spot` y `pre` visibles por grado (hoy `GradosSection` solo enseña los `pre` de Red, Blue y Gold, y un
    Black `pre` sale dos veces), «kg de verde», una sola proyección pública con la referencia `CTC-L-`. Decisiones 6, 7 y 8.
  - **Objetivo 3 · el login de Cherry Picked**: **(A)** entrada y continuidad — **lo más grave**: un comprador con sesión ve el
    catálogo VACÍO (desaparecen la cinta y «Find my Lot», y `GradosSection` no dice nada con 0 listados); el login solo vive en
    Green y la portada no le pasa `onOpenLogin` a la ventana; **(B)** la tarjeta del lote (referencia `CTC-L-`, el Punto con
    `rotuloDelPunto`, sello, Dossier público, foto, «kg de verde», la base del precio, sin finca ni municipio); **(C)** las reglas
    comerciales desde el Triage (espera al objetivo 2 B); **(D)** Mi cuenta (estado de los Sample Kits, región, reputación
    ponderada, la puja Tyrian y CN-4). Decisiones 3, 6, 7, 8, 11, 12 y 13 (A: 6, 11 y 13 · B: 3 · C: 3, 7, 8 y 12 · D: 12). **La cuenta de comprador de prueba existe** desde la V5.98 (una de las
    dos de auditoría del nodo final, credenciales solo en `.env.local`; `ALINEACION` §4.6): ~~el plan V6 la da por inexistente en su §0
    y §3, y eso está desfasado~~ (corregido en el plan el mismo día). Usarla para conducir la tienda con sesión es la decisión 13 del
    owner.
- **Lo que la auditoría del 2026-10-10 encontró aquí, con la V5.202 en obra** (anotado por el nodo final): la tienda con sesión
  sigue leyendo `public_lot_catalog`, que desde la V5.202 devuelve `finca_name` y `municipio` a null, ~~pero su `name` sigue siendo
  `lots.name`, el nombre que escribe el productor (suele llevar la finca; la vitrina ya enseña el que genera la vista), y
  `CherryPickedExperience.tsx` lo pinta en la tarjeta. Hoy no se ve (0 listados publicados); antes del primero, la tarjeta debe
  leer el nombre público (objetivo 3 B).~~ — **corregido en la misma V5.202** (la migración rehecha,
  `docs/migraciones/2026-10-10_vitrina_sin_finca.sql`): su `name` es el MISMO nombre generado que la vitrina, `ficha_notas_cata`
  va a null y la tarjeta pinta la región con `pais` (`CherryPickedExperience.tsx`); `place_order` guarda también el nombre
  generado. Queda la lectura doble (`public_lot_catalog` y `public_lot_vitrina`), que es la tanda B del objetivo 3. Y la tienda lee también `public_transparency_pricing` (el precio al productor; `anon` la
  puede leer) y `lot_listings`, cuya política deja a `anon` leer todos los listados: las dos son filas de `ALINEACION` §3b.
- **V5.132 · la Coffee Datasheet Tool no está repartida a Cherry Picked** (`cp = false`; `GadgetsSection` nombra las herramientas
  por id): anotado aquí por el nodo final (2026-10-10), porque la fila de `ALINEACION` §3 no llegó a este charter. Si el owner la
  quiere en Green, es el registro de `herramientas-cafe` más un nombre en `GadgetsSection`.
- **V5.201 · el carrusel con el dedo y el Dossier público continuo, sin imprimir** (owner, 2026-10-10; ejecutado desde
  WRAP-COMMIT-PUSH). La cinta (`SneakPeek.tsx`) en una pantalla táctil: tocarla la pone en manual (sigue al dedo, inercia al
  soltar) y a los `INACTIVIDAD_MS` (20 s) vuelve a andar sola; el ratón no cambia. El Dossier público
  (`/ctcx-public-catalogue/CTC-L-…`) es un HTML continuo con `NavegacionDelDossier` abajo y no se imprime (el componente es de
  `kaffetal-regal`, que lo anota). Compartido: el calendario del año de la landing CP también lleva ya la señal «Click me»
  (`HarvestCalendar`, el mismo de CTC y KR).
- **V5.199 · «Find my Lot» por la referencia, en CTC, KR y CP** (owner, 2026-10-10; ejecutado desde WRAP-COMMIT-PUSH). El pie de
  la cinta (`SneakPeek.tsx`, `FindMyLot`) y el buscador del portal (`BuscadorDeLote.tsx`) llevan «CTC-L-» fijo; el campo lo limpia
  `cuerpoDeReferencia` y la referencia la valida `normalizaReferencia` (`lib/catalogo/codigoPublico.ts`). La página de «no
  encontrado» es `ctcx-public-catalogue/[codigo]/not-found.tsx`. Abierto: una muestra que el Centro de Calidad cata a ciegas lleva la
  misma referencia; un lote que ya está en el Triage y vuelve a catarse (recata) deja de ser anónimo para quien lo busque en el
  portal. Si eso importa, la recata debería llevar un código propio (decisión del owner).
- **V5.198 · la vitrina real y el Dossier público** (owner, 2026-10-10; ejecutado desde WRAP-COMMIT-PUSH). La cinta lee
  `public_lot_vitrina` (los lotes que llegaron al Triage) y ya no tiene mock; el reverso pinta la telaraña del CVA, las notas con su
  ícono (`components/catacion/IconosDeSabor.tsx`) y el botón al Dossier público, que reemplazó a la ficha técnica. Abierto: (1) el
  Manifiesto (pilar 01) sigue diciendo «en la ficha técnica y en la DDS» — hoy esa ficha es el Dossier público; cambiar el texto en
  los tres idiomas lo decide el owner; **desde la V5.202 choca además con la regla del owner**: el pilar promete «finca, personas,
  proceso y evaluación, verificables lote a lote», y lo público ya no nombra la finca (fila en `ALINEACION` §3b; lo ejecuta la tanda D
  del objetivo 1); (2) la tienda (catálogo con sesión) sigue leyendo `public_lot_catalog` y sus fichas propias:
  llevarle el Dossier público al detalle de un listado es una tanda aparte.
- **V5.196 · el Catálogo Activo lo gobierna el Triage** (ejecutado desde `consolas`; sin código de la tienda tocado salvo dos
  comentarios de `src/lib/catalogo/sneakPeek{,Mock}.ts` que nombraban `publishLot`): `lot_listings.total_kg` son ahora kg de **verde**
  declarados (antes kg de CPS 1:1) y `price_per_kg` no puede bajar del FOB mínimo del lote (la base lo rechaza). La tienda no cambia: ya
  vendía «kg» y ya leía `total_kg − sold_kg`. **Sigue con dueño aquí**: (1) el comprador ve «kg» sin decir «de verde» en la tarjeta —
  conviene decirlo—; (2) cuando una venta de la tienda deba bajar el stock físico o la cuenta del contrato (la conversión verde → CPS),
  es la tanda que el plan dejó fuera (§7, `consolas` · `cherry-picked`).
- **V5.189 · `official_score` es el Punto de cualquiera de los dos protocolos** (ejecutado desde `consolas`, plan §10.6): el CVA es el
  protocolo principal y un SCA 2004 vale lo mismo; ya no existe el piso de un CVA homologado. **Sigue con dueño aquí**: decir con qué
  protocolo se cató (`rotuloDelPunto`, `src/lib/arena/punto.ts`) en la tienda, ~~la ficha pública y el portal~~ — **el portal ya lo
  dice** (el Dossier público, V5.198, pinta «Punto CVA» o «Punto SCA 2004»; la ficha pública ya no existe). Queda la tienda:
  `CherryPickedExperience.tsx` pinta `official_score` con un decimal y sin protocolo (objetivo 3 B).
- **V5.176 · el stock de un lote por VENTANAS** (docs/PLAN_CICLOS.md): `lot_listings.total_kg` = lo declarado menos lo retirado, sumado sobre sus ventanas (`sincronizarListado`, `totalEnVentaPorVentanas` en `src/lib/trato/ventanaServidor.ts`); el café se vende mientras sigue en la finca y `sold_kg` lo lleva el checkout como siempre. Los tratos viejos no cambian (`contract_releases`). Pendiente: si un productor no despacha lo vendido, CTCx resuelve al comprador fuera de la plataforma.
- **V5.160 · el JSON-LD de los grados y los lotes mock del Sneak Peek cambian con el contrato nuevo** (ejecutado desde
  `consolas`). Los siete mock se reclasificaron con su tríada (dos Gold → Blue, dos Blue → Red; BK-6A08 sube a 82,50) y sus
  PDF se regeneraron con códigos nuevos (BL-4C1A, BL-9E33, RD-8B15, RD-3D62). ~~Los mock~~ **se retiraron en la V5.198**: la cinta
  lee `public_lot_vitrina`. Abierto: `GradosSection` y el copy público que describa un grado por SCA debe pasar a puntos (revisar el
  componente; lo recoge la tanda D del objetivo 1 de `PLAN_V6_OBJETIVOS.md`, tema 12).
- **CTCx Selection en la vitrina (V5.85, fase 8 del `PLAN_CIRCUITO_DEL_LOTE`; código de este componente tocado desde `consolas`
  con el «continúa» del owner, línea en `ALINEACION` §3)**: la tarjeta de la tienda y la cinta enseñan el **perfil único** en vez de
  la finca; la cinta y el portal (~~`PaquetePublico`~~, que se borró en la V5.198: el portal es ahora el Dossier público) pintan la
  **imagen por lote** (`ctcx_imagen_path`) o, si no hay, la del perfil.
  **Queda con dueño aquí**: la tarjeta de la tienda (`LotCard`, tipo `Lot`) no tiene campo de imagen — decidir si la lleva (objetivo
  3 B); el copy EN · ES · DE alrededor del perfil («CTCx Selection» como rótulo se pinta tal cual); nada se condujo en navegador con
  un lote comprado (al 2026-10-10 hay 1 compra, solo de stock, y 0 de CTCx Selection). `qa-sneak-peek` ya vigila el rótulo nuevo.
- **Las muestras para compradores son los Sample Kits (V5.88 → V5.90, `consolas`; sin código de este componente tocado)** — lo anota
  el nodo final (wrap V47, 2026-09-25), porque ninguna de las tres tandas lo trajo aquí. Las decisiones 4 y 5 del brief de Muestras
  (¿la muestra de UN lote?, ¿el pack de cosecha?) **ya no están abiertas**: el owner contestó el 2026-09-25 que las muestras para
  compradores son los **Sample Kits** —CP (8 × 250 g de verde, ≈ US$65) · Plus (5 × 2 kg de verde) · Max (4 × 6 kg de CPS)—, que el
  OCP surte desde «Adquisición de Stock Café (Selection/Sample Kits)» y no de los 2 kg del productor. **Queda con dueño aquí**:
  **(a)** enseñarle al comprador el **estado de su pedido** —`sample_pack_orders.status` pedido · preparado · enviado, `guia`,
  `enviado_at`; lo escriben `marcarPedidoEnviado` (V5.88) y `marcarKitEnviado` (V5.90) cuando el kit nació de un pedido de la
  tienda; la tienda sigue insertando el pedido igual y su comprobación «ya pidió» no cambia—; **(b)** cuando la tienda venda kits
  (UI/UX de Etapa 3; el folio 10 está transcrito en `PLAN_CIRCUITO_DEL_LOTE` §9), **leer los tres kits de
  `src/lib/compras/sampleKits.ts` (`KITS`)** —lotes, pesos, para quién, precio de referencia—, nunca copiarlos; **(c)** reconciliar
  el «pack» que vende hoy `MuestrasSection` (`PACK_PRICE = 300`, `data.ts`) con el Sample Kit (CP) ≈ US$65. Fila en `ALINEACION` §3b.
  Desde el 2026-10-10 son las tandas C y D del objetivo 3 de `PLAN_V6_OBJETIVOS.md` (decisión 12 del owner). Los Sample Kits viven ahora
  en la segunda pestaña del Stock CTCx (`/ocp/stock/sample-kits`, V5.195).
- **El Punto homologado (V5.92, `consolas`; sin código de este componente tocado; la homologación se anuló en la V5.189 — arriba)**: `public_lot_catalog.official_score` sigue
  leyendo `lot_evaluations.sca_total`, que desde la V5.92 **ES el Punto** — el piso del intervalo si la evaluación fue CVA
  homologada, nunca Tyrian. **Queda con dueño aquí**: decir la procedencia (`rotuloDelPunto`, ~~`src/lib/arena/homologacion.ts`~~
  `src/lib/arena/punto.ts` desde la V5.189, que anuló la homologación) en
  la tienda (`CherryPickedExperience` pinta `official_score` con un decimal y sin origen), ~~la ficha pública y el portal~~ (el
  portal ya lo dice desde la V5.198; arriba). Y ~~el **dossier del lote ES/EN** (`/kaffetal-regal/dossier/[id]`, V5.79) es el
  documento que un comprador debería recibir del lote (hoy solo lo ve el productor): decidir si la vitrina lo enlaza~~ — **resuelto en
  la V5.198**: la vitrina enlaza el **Dossier público** de cada lote, la versión del Dossier CTCx sin lo privado. Fila en
  `ALINEACION` §3b (nodo final, wrap V47; resuelta salvo la tienda el 2026-10-10).
- ~~**Las cuentas de prueba ya no existen** (V5.89: las cinco `prueba-*`; V5.92: las cuatro `@ctc-qa-test.co`): `qa-checkout-check`
  (y el lado comprador de `qa-guard-check`) no pueden correr, y la sesión asistida del OCP solo abre cuentas de productor. Qué
  cuenta de comprador de prueba vuelve lo decide el owner (`ALINEACION` §4.6).~~ **Superado en la V5.98** (owner, 2026-09-30): hay
  dos cuentas de auditoría `@ctc-qa-test.co`, un productor y **un comprador**, del nodo final; sus credenciales viven solo en
  `.env.local` y `qa-guard-check` y `qa-checkout-check` las leen de ahí y limpian lo que escriben (se corren a mano). Si un tablero
  cuenta compradores, la de auditoría está (nada la filtra en pantalla). La sesión asistida del OCP sigue abriendo solo cuentas de
  productor.
- **Guion del video del comprador** (`briefs/cherry-picked-guion-video-comprador.md`, **v0.1 · en revisión del owner**, 2026-09-18):
  gemelo del guion del productor, 694 palabras, ≈ 5:20, en «tú». Esperan respuesta cinco decisiones (§5 del brief): idioma de la
  locución, tratamiento, el matiz del 80 % del alza, el ejemplo de precio en pantalla y el QR de la bolsa. **No se rueda la versión
  final hasta que la plataforma diga lo mismo** (US$, Papagayo Beans®, mínimos en unidades de 6 kg, regiones como dato, cobros):
  lo cubren CP-1 a CP-3.
- ~~**BLOQUEANTE: la tienda imprime `€` sobre un precio en USD**~~ — **RESUELTO en la V5.52** por la sesión de
  `consolas`, con el owner avisado y su línea en `ALINEACION` §3 (es código de este componente). La moneda tiene ahora
  UNA fuente, `src/lib/precios/moneda.ts`, y `eur()` pasó a `importe()`. Lo que queda con dueño aquí: **(a)** el flete
  (`shipping_zones.rate_per_kg`, 0,10–0,45) y el **pack de muestras** (`PACK_PRICE = 300`) se escribieron pensando en
  euros y ahora se leen en dólares con el mismo número — un **cambio de precio implícito de ~8 %** que el owner aceptó
  con 0 pedidos de lote y 1 pack de prueba; si se prefiere convertir, es una tasa en ese archivo (el pack, además, se reconcilia
  con los Sample Kits: ver arriba). **(b)** la **subasta
  Tyrian sigue en EUR** y no puede moverse desde aquí: `lot_auctions` lleva la moneda en el nombre de sus columnas
  (`precio_salida_eur_kg`, `incremento_eur_kg`), así que es **CN-4** y lleva DDL. Guardián: `qa-moneda-check` (24).
- **Unificar el código del lote sobre `lots.public_code`** (dueño: **cherry-picked**, nace en consolas V5.48,
  `ALINEACION` §3). Desde la V5.48 el lote tiene UN código corto, único y almacenado (`CTCX-XXXX-XXXX`), y ya viaja en
  `public_lot_catalog`. Mientras tanto siguen vivos los dos derivados que se contradicen: `codigoDeLote(lot_id, grade)`
  en `lib/catalogo/sneakPeek.ts` y `listingCode(lot_listings.id, grade)` en `cherry-picked/data.ts`. **Ya no es
  hipotético**: con el primer lote publicado (2026-09-18) el MISMO café enseña hoy **tres códigos distintos** —
  `GD-F518` en la cinta, `GD-F0F9` en la tienda y `CTCX-V2DD-M24B` en el portal público. Sustituirlos por la columna es
  tanda **CP-3**; ojo a que un lote publicado siempre tiene código, y uno sin publicar no aparece en la vista. **Estado al
  2026-10-10** (nodo final): `codigoDeLote` **ya no existe** (solo lo nombran los comentarios de `src/lib/catalogo/codigoPublico.ts`);
  desde la V5.100 el código del lote es `CTC-L-XXXXXXXX` y desde la V5.198–V5.199 esa **referencia es la dirección pública**: la
  cinta, «Find my Lot» y el portal la usan (un `CTCX-…` viejo redirige). **Queda la tienda**: `listingCode` (`data.ts`) sigue
  pintando «BK-XXXX» — pasarla a la referencia `CTC-L-` es la tanda B del objetivo 3 de `PLAN_V6_OBJETIVOS.md`.
- **La ficha pública de un lote CTCx Selection se arregla EN LA VISTA, no en la página** (§14.7: la finca «visible como
  dato, no protagonista»). `public_lot_catalog` anula `finca_name` cuando `ctc_selection`, y tanto `/docs/ficha/[lotId]`
  como el paquete público de `/ctcx-public-catalogue/[codigo]` solo pueden pintar lo que la vista devuelve. D3.1 se
  aplica en SQL a propósito: taparlo en la interfaz dejaría el nombre a un `curl` de distancia. **Desde la V5.202 vale para todos
  los lotes**, no solo los de CTCx Selection: ninguna vista pública devuelve la finca ni el municipio (contrato «Lo público del lote»,
  `ALINEACION` §1); `/docs/ficha/[lotId]` solo redirige al Dossier público desde la V5.198.
- **Plan de ejecución de la narrativa** (`docs/PLAN_NARRATIVA_2026-09-17.md`): **CP-1 va por la MITAD** (auditoría del
  2026-09-19: el tablero la daba por cerrada) — **hecha** la moneda de la tienda (V5.52); **faltan** los mínimos en
  unidades de 6 kg en `LotCard`, retirar `ASSOC_BLACK_MOQ = 350` (`data.ts`, `LotCard.tsx`), la constante muerta
  `FEE_EUR_KG` de `RoastLanding.tsx` y el comentario `// EUR/kg` de `data.ts`. Después, **CP-2**
  (portada, programas, mapa; ola 1) · CP-3 (catálogo y ficha para el primer lote publicado; espera CN-3, CN-4 y CN-7) ·
  CP-4 (Green por región; espera CN-8) · CP-5 (Roast y X como productos, 2027). Desde el 2026-10-10 las recogen la tanda D del
  objetivo 1 (CP-1 en el copy y CP-2) y los objetivos 2 B y 3 (CP-1 en la tienda y CP-3) de `PLAN_V6_OBJETIVOS.md`.
- **Tercera ronda de narrativa (2026-09-17, `PVC_BCP_PLAN.md` §14.7)**: Roast con etiquetas **Papagayo Beans por defecto · Co-Brand
  (productor y finca) · My Brand (diseño del comprador, que lo entrega o aprueba)**; ficha pública de un lote CTCx Selection con la
  finca **visible como dato, no protagonista**; tostado HORECA al **82 %**; los pines «MR coming soon» **también en la portada**;
  ~~Black y Red 3–4 cargas según la mezcla — **una carga por productor**, mezcla de 3 a 4; **Black** = blend de orígenes y/o
  variedades, **Red** = siempre una sola variedad, mezcla regional (owner, 2026-09-19)~~ — **superado el 2026-09-25 (V5.91,
  `PVC_BCP_PLAN` §14.8)**: Black y Red **3 cargas**, el MOQ de compra (una demanda de al menos tres cargas); la regla 3–4 se
  retiró de raíz y cada mezcla es **Single Origin** (varios estates, misma variedad y proceso) o **Regional Blend** (varios
  lotes de una región), derivado de la composición ENTERA de sus lotes (V5.99: todas las variedades y fincas, y de varios
  productores; un blend de un solo productor es un tipo de LOTE con su código y su ficha —Single Estate Blend · Single Origin
  Regional · Regional Blend—). Importa para la ficha y la vitrina: un Single Origin puede
  anunciar SU variedad y proceso; un Regional Blend anuncia su región. Donde la tienda repita «3 o 4 cargas», ahora son 3
  (nodo final, wrap V47, 2026-09-25).
- **Papagayo Beans® (owner, 2026-09-17, `PVC_BCP_PLAN.md` §14.6)**: es la marca del café en los tres programas —Green lo
  vende en verde por grado, Roast tostado por el Master Roaster (etiqueta Papagayo Beans por defecto; My Brand · Co-Brand por
  confirmar) y **X es la cara al consumidor directo** (tostado y empacado, venta directa)—; la bolsa lleva Papagayo Beans® +
  sello del grado + referencia a CTCx como motor. Hoy solo el scaffold de Roast dice «Papagayo Beans» (`RoastLanding.tsx`, el
  roundel y `pbT`); Green, la cinta, la ficha y el portal no lo dicen.
- **Decisiones de narrativa del owner (2026-09-17, `PVC_BCP_PLAN.md` §14)**: **US$ en toda la tienda y la subasta**
  (adiós EUR: `eur`, `price`, `FEE_EUR_KG`, `precio_salida_eur_kg`; supera el §12.7); portada con el **mapa de Enabled
  Regions** (Nueva York · Florida · California · Alemania · Japón con «MR · coming soon», Colombia con MR local, EE. UU. y
  Europa como cobertura potencial — el SVG está en `reference/narrativa-2026-09-17/img/mapa-regiones.svg`); Green hoy =
  **lista FOB** principal + lista CaaS en construcción (Cherry Picked consolidado cuando haya MR); Roast = tostado del MR de
  la región + **tostado HORECA por CaaS** (MOQ de verde × 80 %); ~~**CTCx Selection reemplaza el nombre de la finca** en la
  vitrina~~ **hecho en la V5.85** (perfil único, `rotuloCtcx`; queda decidir si la ficha pública es documentación o vitrina); mínimos del comprador en unidades de 6 kg
  (Black y Red ~~**56 o 42** —mezcla de 4 o de 3 productores—~~ **42** —3 cargas, el MOQ de compra, §14.8 (V5.91)— · 26 · 13 · 6); **retirar Co-Create** (logos y copy aquí; la clave y la ruta con consolas); marca CTCx.
- **Decisiones del CEO del 2026-09-16** (`docs/PVC_BCP_PLAN.md` §12) que este componente tiene que ejecutar:
  - **Cherry Picked solo se entrega DDP.** Es consolidado a través del master roaster de la región: **no hay FOB ni
    entrega en puerto**. Si un comprador quiere su café en un envío propio, eso es **CaaS** (FOB · puerto de destino ·
    DDP). La regla ya vive en `src/lib/pvc/canales.ts` (`puedeCotizar`, `accesoDelComprador`); ninguna superficie de
    este componente debe pintar un tramo que esa función niegue.
  - **Requiere región con master roaster.** El master roaster es un **cliente tipo partner**: le compra a CTC por el
    mismo canal que él habilita. Sin master roaster en la región, el comprador va a CaaS.
  - **Tablas de precio por región de master roaster**: 5 grados × 4 precios (CP DDP · CaaS FOB · CaaS puerto · CaaS
    DDP) más el **precio aconsejado de tostado in situ** (verde CTC público + tarifa del master roaster en línea aparte +
    tarifa de conexión de CTC). Falta decidir si la tarifa de conexión es fija o porcentual.
  - **Retirar `ASSOC_BLACK_MOQ = 350`**: el MOQ es uno solo, **en cargas** y por grado (Black y Red ~~3–4~~ **3**, el MOQ de compra de la V5.91 · Blue 2 · Gold
    y Tyrian 1 carga o menos según disponibilidad). El empaque se muestra como **presentación**, no como mínimo.
  - **Subasta Tyrian**: una sola por lote, en verde; **el bid es sobre FOB puerto Colombia** y el programa se elige al
    cerrar. **Las reglas de ajuste por programa se publican antes de abrir la puja**: el pujador ve su precio final
    desde el principio. ~~**Se mantiene EUR/kg**~~ (**superado por el §14 del 2026-09-17**: US$ en tienda y subasta; la
    subasta cambia con **CN-4**, dueño `consolas`, porque lleva DDL) y la adjudicación del OCP.
  - **Tríada de reputación del comprador** (niveles verde → pintón → maduro): compras completadas · diversidad de
    grados y orígenes probados · confiabilidad (paga a tiempo, no abandona carritos ni pujas). **Ponderación, no
    acumulación**; no se agregan más factores; **CaaS queda fuera** de los niveles. Pesos, fórmula y beneficios: por
    definir.
  - **Stripe, aplazado**; las pasarelas serán **Zulu y Nequi, las dos** (owner, 2026-09-19), a configurar más adelante. La entidad legal sigue bloqueando cobrar.

- **La primera subasta real** cuando el bache galardone un Tyrian (hoy la sección dice «no hay subasta abierta»).
- **Cobros**: sin código de Stripe (aplazado, 2026-09-16); bloqueado por la entidad legal.
- ~~MOQ Black 350 vs 228 kg y EUR vs US$ a la TRM~~ — **resuelto** por el CEO (arriba): MOQ en cargas; la subasta, que
  el CEO dejó en EUR, pasó a **US$ por el §14 del owner** (2026-09-17) y espera a CN-4.
  Hasta que este componente lo ejecute, el código sigue con `ASSOC_BLACK_MOQ = 350`.
- Un comprador que propone un proyecto CaaS recibe las respuestas **solo por correo** (el espejo al panel es
  de productores, diseño A3) — anotado, no roto.
- Roast y X: listas de espera hasta 2027; el día que abran, el tablero del OCP ya existe.
- ~~**No hay ningún lote publicado hoy**~~ — ~~**desde el 2026-09-18 hay uno**: «Gesha 72h Ferm» · `CTCX-V2DD-M24B`
  (`ALINEACION` §3). Es el momento que este pendiente esperaba: **mirar la ficha pública y la cinta con datos reales**
  (y los tres códigos del mismo café, arriba) sigue sin hacerse desde este componente.~~ **Caducado**: ese listado se borró en la
  V5.76 a pedido del owner. Al 2026-10-10 hay **0 listados** (`lot_listings`) y 0 declaraciones en el Triage; la vitrina enseña 6
  lotes, todos de tratos por ventana sin declarar («Próximamente»). La tienda con sesión se mira con datos reales cuando el Triage
  declare el primero (objetivo 2 A).

## Kick-off

```
Trabajas SOLO en el componente «Cherry Picked» (clave: cherry-picked) de la plataforma CTC
(repo C:\dev\ctc-platforms\ctc-platform, rama main). Antes de tocar nada lee, en este orden:
1. docs/componentes/cherry-picked.md   ← tu charter
2. docs/ALINEACION.md                  ← contratos transversales y el registro de permeación (§3)
3. AGENTS.md                           ← la compuerta y las reglas de la casa
Nada comercial sale por la cinta; el Dossier público es lista blanca; nada público ni del comprador
lleva al productor sin pasar por CTCx (ni finca ni municipio: ALINEACION §1, «Lo público del lote»);
las lecturas públicas van por las vistas estrechas, nunca por una política ancha; la subasta es EUR/kg
y adjudicar es del OCP. Si tu tarea necesita que el OCP declare, publique, adjudique o responda
distinto, es pendiente con dueño «consolas» y una línea en el §3. Si es uno de los objetivos V6, lee
además docs/PLAN_V6_OBJETIVOS.md y no empieces una tanda sin las decisiones del owner de su §5.
Se verifica en la vitrina pública; la cuenta de comprador de auditoría (V5.98) es del nodo final y
qa-checkout se corre a mano con ella: si la tarea necesita una sesión de comprador en el navegador,
acuérdalo con el owner. Al terminar: compuerta completa (incl. qa-sneak-peek, qa-subastas,
qa-ficha-publica), APP_VERSION + CHANGELOG, sello, push, verificación en vivo, log de arquitectura,
y «Pendientes» al día.
Hoy: <la tarea>.
```
