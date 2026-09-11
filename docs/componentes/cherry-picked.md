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
con cuenta QA) · `qa-ficha-publica-check.mjs` (105, contra las 110 claves reales del datasheet) ·
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

- **La primera subasta real** cuando el bache galardone un Tyrian (hoy la sección dice «no hay subasta abierta»).
- **Cobros**: sin código de Stripe; bloqueado por la entidad legal (charter `herramientas-internas`, Stripe).
- **MOQ Black 350 vs 228 kg y EUR vs US$ a la TRM** — decisión del owner en el PVC; hasta entonces manda
  `ASSOC_BLACK_MOQ = 350` y EUR.
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
