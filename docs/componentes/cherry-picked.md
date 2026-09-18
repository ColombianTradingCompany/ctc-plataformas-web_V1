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
| `/docs/ficha/[lotId]` | ficha pública de un lote vivo sobre **lista blanca** (charter `plataforma`, la ruta cuelga de `/docs` por el proxy) |
| `/ctcx-public-catalogue` · `/ctcx-public-catalogue/[codigo]` | «Find my Lot» y el paquete público del lote por su `lots.public_code` (V5.48; charter `plataforma`, nacida en `consolas` · OCP, **solo www**) |

## Mapa de código

- `src/components/cherry-picked/` — `CherryPickedExperience.tsx`, `TyrianSection.tsx` (subasta real, V5.24),
  `GradosSection`, `BlackSection`, `Cart`, `ProfileView`, `EnviosSection`, `LoginModal`, `i18n.ts` (EN · ES · DE),
  `data.ts` (`moqOf`, `eur`, `fmt`, `ASSOC_BLACK_MOQ = 350`).
- `src/components/cherry-picked-hub/HubLanding.tsx`, `cherry-picked-roast/`, `cherry-picked-x/`,
  `src/components/services/CaasLanding.tsx`.
- `src/components/catalogo/SneakPeek.tsx` (montado en 7 superficies), `src/lib/catalogo/{sneakPeek,sneakPeekMock,
  atributosSca,fichaPublica}.ts` (`sneakPeek.ts` es `server-only`: **nunca importar un VALOR desde cliente**).
- `src/lib/subastas/{tipos,buyerActions}.ts` (`listarSubastas`, `pujar`: sesión + Pintón; la regla del
  monto vive en el trigger `auction_bids_guard`).
- `src/lib/newsletter/actions.ts` (`SOURCES`), `src/lib/market/` (lee), `src/lib/leads/actions.ts` (CaaS, compartido).

## Tablas que posee

`buyer_profiles` (guard: no auto-asignar puntos/nivel) · `lot_reservations` · `orders` · `order_items` ·
`points_ledger` · `sample_pack_orders` · `auction_bids` (vía `pujar`) · `newsletter_subscribers` (escritura
por `newsletter/actions`).
**Solo lee**: `lot_listings` (los publica el OCP), `shipping_zones`, `lot_auctions`, las vistas
`public_lot_catalog` y `public_transparency_pricing` (SECURITY DEFINER, columnas estrechas — **jamás**
sustituir por una política ancha sobre `lots`/`fincas`), `market_anchors`, `coffeed_sources`. RPC `place_order`.

## Guardianes

`qa-sneak-peek-check.mjs` (194) · `qa-subastas-check.mjs` (30) · `qa-checkout-check.mjs` (`place_order`,
con cuenta QA) · `qa-ficha-publica-check.mjs` (115, contra las 110 claves reales del datasheet; su §8 vigila las
**tres** puertas al `datasheet` desde la V5.48) ·
`qa-crm-interes-check.mjs` (fuentes de la lista de espera) · `qa-recuperacion-check.mjs` (puerta CP).

## Reglas propias

- **Nada comercial sale por la cinta**: el tipo `SneakPeekLot` no tiene dónde ponerlo; un campo nuevo se
  añade a propósito y el guardián obliga a justificarlo. Tyrian nunca aparece en la cinta (es de subasta).
- **La ficha pública es lista BLANCA** (`fichaPublica.ts`): una clave nueva del formulario nace privada.
- **Dos caras del lote comprado en firme**: la vitrina muestra a CTC (`ctc_selection`), la ficha muestra la
  finca real. Se anula en la vista, no en el componente.
- **Subasta**: EUR/kg; el comprador jamás toca `lot_auctions`/`auction_bids` con su sesión; adjudicar es del
  OCP y **no emite oferta** (la oferta al productor es COP/kg).
- La etapa del CRM del comprador se **deduce** de los pedidos (0/1/2+), nunca se persiste.
- Copy EN · ES · DE; la copia de los programas sale del diccionario compartido con la portada.

## Lo que las consolas gobiernan de este componente

| Quién | Qué | Dónde |
|---|---|---|
| OCP · Catálogo | **publicar** un lote (`publishLot`: contrato firmado + ≥1 liberación + Club), `lot_listings`, `total_kg` sincronizado de las liberaciones | `catalogActions` |
| OCP · Subastas | abrir · cerrar · adjudicar · cancelar la subasta Tyrian | `subastasActions` |
| OCP · CTC Selection | qué lote se muestra a nombre de CTC (`black_negotiations.status='comprar'`) | vista `public_lot_catalog` |
| OCP · CRM CaaS / Green / Roast / X | respuestas a leads, etapa manual del comprador, contacto de la lista de espera | `/ocp/crm/*` |
| BCP · PVC | (futuro) MOQ y moneda al comprador — **pendiente de decisión** | `PVC_BCP_PLAN.md` §8 |
| ECP · Herramientas | gadgets y nivel Plus en la tienda | charter `herramientas-cafe` |

## Pendientes

- **Unificar el código del lote sobre `lots.public_code`** (dueño: **cherry-picked**, nace en consolas V5.48,
  `ALINEACION` §3). Desde la V5.48 el lote tiene UN código corto, único y almacenado (`CTCX-XXXX-XXXX`), y ya viaja en
  `public_lot_catalog`. Mientras tanto siguen vivos los dos derivados que se contradicen: `codigoDeLote(lot_id, grade)`
  en `lib/catalogo/sneakPeek.ts` («GD-A1B2») y `listingCode(lot_listings.id, grade)` en `cherry-picked/data.ts`
  («GD-7F3C») — el MISMO café con dos cadenas según la superficie. Sustituirlos por la columna es tanda **CP-3**; ojo a
  que un lote publicado siempre tiene código, y uno sin publicar no aparece en la vista.
- **La ficha pública de un lote CTCx Selection se arregla EN LA VISTA, no en la página** (§14.7: la finca «visible como
  dato, no protagonista»). `public_lot_catalog` anula `finca_name` cuando `ctc_selection`, y tanto `/docs/ficha/[lotId]`
  como el paquete público de `/ctcx-public-catalogue/[codigo]` solo pueden pintar lo que la vista devuelve. D3.1 se
  aplica en SQL a propósito: taparlo en la interfaz dejaría el nombre a un `curl` de distancia.
- **Plan de ejecución de la narrativa** (`docs/PLAN_NARRATIVA_2026-09-17.md`): **CP-1** (US$ y mínimos) y **CP-2**
  (portada, programas, mapa; ola 1) · CP-3 (catálogo y ficha para el primer lote publicado; espera CN-3, CN-4 y CN-7) ·
  CP-4 (Green por región; espera CN-8) · CP-5 (Roast y X como productos, 2027).
- **Tercera ronda de narrativa (2026-09-17, `PVC_BCP_PLAN.md` §14.7)**: Roast con etiquetas **Papagayo Beans por defecto · Co-Brand
  (productor y finca) · My Brand (diseño del comprador, que lo entrega o aprueba)**; ficha pública de un lote CTCx Selection con la
  finca **visible como dato, no protagonista**; tostado HORECA al **82 %**; los pines «MR coming soon» **también en la portada**;
  Black y Red 3–4 cargas según la mezcla.
- **Papagayo Beans® (owner, 2026-09-17, `PVC_BCP_PLAN.md` §14.6)**: es la marca del café en los tres programas —Green lo
  vende en verde por grado, Roast tostado por el Master Roaster (etiqueta Papagayo Beans por defecto; My Brand · Co-Brand por
  confirmar) y **X es la cara al consumidor directo** (tostado y empacado, venta directa)—; la bolsa lleva Papagayo Beans® +
  sello del grado + referencia a CTCx como motor. Hoy ninguna superficie de este componente dice «Papagayo Beans».
- **Decisiones de narrativa del owner (2026-09-17, `PVC_BCP_PLAN.md` §14)**: **US$ en toda la tienda y la subasta**
  (adiós EUR: `eur`, `price`, `FEE_EUR_KG`, `precio_salida_eur_kg`; supera el §12.7); portada con el **mapa de Enabled
  Regions** (Nueva York · Florida · California · Alemania · Japón con «MR · coming soon», Colombia con MR local, EE. UU. y
  Europa como cobertura potencial — el SVG está en `reference/narrativa-2026-09-17/img/mapa-regiones.svg`); Green hoy =
  **lista FOB** principal + lista CaaS en construcción (Cherry Picked consolidado cuando haya MR); Roast = tostado del MR de
  la región + **tostado HORECA por CaaS** (MOQ de verde × 80 %); **CTCx Selection reemplaza el nombre de la finca** en la
  vitrina (decidir si la ficha pública es documentación o vitrina); mínimos del comprador en unidades de 6 kg
  (56 · 42 · 26 · 13 · 6, tabla §14.4); **retirar Co-Create** (logos y copy aquí; la clave y la ruta con consolas); marca CTCx.
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
  - **Retirar `ASSOC_BLACK_MOQ = 350`**: el MOQ es uno solo, **en cargas** y por grado (Black y Red 3–4 · Blue 2 · Gold
    y Tyrian 1 carga o menos según disponibilidad). El empaque se muestra como **presentación**, no como mínimo.
  - **Subasta Tyrian**: una sola por lote, en verde; **el bid es sobre FOB puerto Colombia** y el programa se elige al
    cerrar. **Las reglas de ajuste por programa se publican antes de abrir la puja**: el pujador ve su precio final
    desde el principio. **Se mantiene EUR/kg** y la adjudicación del OCP.
  - **Tríada de reputación del comprador** (niveles verde → pintón → maduro): compras completadas · diversidad de
    grados y orígenes probados · confiabilidad (paga a tiempo, no abandona carritos ni pujas). **Ponderación, no
    acumulación**; no se agregan más factores; **CaaS queda fuera** de los niveles. Pesos, fórmula y beneficios: por
    definir.
  - **Stripe, aplazado**; se evalúa **Zulu** como pasarela. La entidad legal sigue bloqueando cobrar.

- **La primera subasta real** cuando el bache galardone un Tyrian (hoy la sección dice «no hay subasta abierta»).
- **Cobros**: sin código de Stripe (aplazado, 2026-09-16); bloqueado por la entidad legal.
- ~~MOQ Black 350 vs 228 kg y EUR vs US$ a la TRM~~ — **resuelto** por el CEO (arriba): MOQ en cargas y subasta en EUR.
  Hasta que este componente lo ejecute, el código sigue con `ASSOC_BLACK_MOQ = 350`.
- Un comprador que propone un proyecto CaaS recibe las respuestas **solo por correo** (el espejo al panel es
  de productores, diseño A3) — anotado, no roto.
- Roast y X: listas de espera hasta 2027; el día que abran, el tablero del OCP ya existe.
- **No hay ningún lote publicado hoy**: la ficha pública y la cinta con lotes vivos no se han visto con datos
  reales — el primer lote publicado es el momento de mirarlas.

## Kick-off

```
Trabajas SOLO en el componente «Cherry Picked» (clave: cherry-picked) de la plataforma CTC
(repo C:\dev\ctc-platforms\ctc-platform, rama main). Antes de tocar nada lee, en este orden:
1. docs/componentes/cherry-picked.md   ← tu charter
2. docs/ALINEACION.md                  ← contratos transversales y el registro de permeación (§3)
3. AGENTS.md                           ← la compuerta y las reglas de la casa
Nada comercial sale por la cinta; la ficha pública es lista blanca; las lecturas públicas van por las
vistas estrechas, nunca por una política ancha; la subasta es EUR/kg y adjudicar es del OCP. Si tu
tarea necesita que el OCP publique, adjudique o responda distinto, es pendiente con dueño «consolas»
y una línea en el §3. Se verifica con una cuenta de comprador QA. Al terminar: compuerta completa
(incl. qa-sneak-peek, qa-subastas), APP_VERSION + CHANGELOG, sello, push, verificación en vivo, log
de arquitectura, y «Pendientes» al día.
Hoy: <la tarea>.
```
