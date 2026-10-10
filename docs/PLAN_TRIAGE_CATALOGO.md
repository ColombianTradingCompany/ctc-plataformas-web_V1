# Plan · Triage de Catálogo Activo, Stock CTCx y Empacado hasta FOB

> **Owner, 2026-10-09.** Este plan manda sobre el paso de lo aceptado (contratos) y de lo físico (stock) al Catálogo Activo, y sobre
> «ECP · Modelo de Producción → Empacado». Se ejecuta en tres tandas que se despliegan solas (§5). Lo que este plan supone y el
> owner puede corregir está en §6; lo que deja fuera, con dueño, en §7.

> **Estado (V6.0, 2026-10-10).** Las tres tandas están hechas (A V5.194 · B V5.195 · C V5.196) y la V5.203 unió Adquisición de Stock
> Café → Stock CTCx → Triage → CTCx Selection → Catálogo Activo como un circuito. El plan sigue mandando sobre el Stock, el Empacado
> hasta FOB y el Triage; lo que sigue es el **objetivo 2 de `docs/PLAN_V6_OBJETIVOS.md`** (Triage y Catálogo Activo), que continúa
> desde los §6 y §7 de este plan.

## 0. Lo que pidió el owner

> «Tenemos que hacer un cambio importante en la interfaz y funcionalidad del módulo de "Ofertas CP Aceptadas". La idea de este es ser
> un punto de control y pivote entre las ofertas aceptadas por el productor y dos formas de entender la disponibilidad:
>
> * El **Stock CTCx** (que absorberá Stock de Sample Kits) = el café que físicamente llega a CTCx bien sea en cantidades grandes, por
>   CTCx Selection o los sacos de 70 kg (excepto las muestras, que siguen en Gestión de Muestras). Este debe poder moverse de estado
>   "Pergamino", "Verde", "Tostado" y "Empacado" (adjunto), de tal manera que pueda saber qué viene de dónde de manera visual (hazlo
>   interactivo e intuitivo, las cantidades deben sumar al final lo mismo en equivalente del estado más primordial entre mermas de
>   humedad, residuos y pérdidas).
> * El **Catálogo Activo** = lo que hay disponible desde lo declarado por los contratos de los productores y lo que se habilita del
>   Stock CTCx.
>
> Con esto claro, en este módulo debo poder ver lo que es enviado desde estas dos interfaces y sencillamente corregir o aceptar lo que
> se proyectará en el Catálogo Activo, añadiendo a este el ancla fundamental de cada lote en **precio FOB mínimo** (esto implica que
> el costo a mostrar debe añadir una de las referencias de "ECP · Modelo de Producción → Empacado", el cual debe adaptarse un poco
> mejor para ser una herramienta adecuada que permita calcular diferentes modos de empaque además de la paletización, el transporte a
> puerto y los trámites para hacerlo FOB (remueve todo lo que tiene que ver con la amortización de la máquina y sus datos de
> análisis). En otras palabras, en las "Ofertas CP Aceptadas" (que quiero que rebauticemos como **"Triage de Catálogo Activo"**) debo
> recibir las ofertas que fueron aceptadas y también las cantidades del Stock CTCx, añadirles una referencia de costos de empaque
> hasta FOB, poner el **O&P de CTCx** y declararlo con ello como parte del catálogo activo.»

El adjunto: cuatro columnas —**Pergamino** (amarillo) · **Verde** (verde) · **Tostado** (granate) · **Empacado** (azul)— con cajas
unidas por curvas: un pergamino que se parte en dos verdes, un verde que pasa a tostado y un tostado que se parte en dos empacados; y
abajo una cadena lineal de una caja por estado.

## 1. Lo que hay hoy (y por qué no alcanza)

- «Ofertas CP Aceptadas» (`/ocp/contratos`) opera los contratos —ventanas, despachos, pagos 60/40, humedad— y el paso al catálogo es
  `publishLot`, desde «Catálogo Activo», con el precio de venta **tecleado** en US$/kg: sin costo, sin FOB, sin margen.
- El listado copia **kg de CPS 1:1** (`lot_listings.total_kg`) mientras la tienda vende **verde** por kg: las unidades no casan.
- Un lote con trato por ventana no se puede publicar desde la pantalla («Listos para publicar» solo cuenta `contract_releases`, que
  las ventanas no escriben); una compra manual tampoco (exige contrato).
- Cada saco recibido marca el lote como «CTCx Selection» y oculta su finca (`public_lot_catalog.ctc_selection` = cualquier compra).
- Un mismo kilo de una compra puede asignarse a una mezcla y a un kit.
- **No existe el stock físico**: hay `compras` (el dinero) con un `destino`, y los kits salen de ahí. Nada dice en qué estado está el
  café ni cuánto se perdió al trillarlo, tostarlo o empacarlo.
- «ECP · Modelo de Producción → Empacado» es la herramienta pública del sellado al vacío (bolsa, mano de obra y **amortización de la
  máquina**): no llega a FOB y nadie la lee.
- El Modelo Económico ya calcula una pila hasta **N2 (FCA Bogotá ≈ FOB)** por banda, con estimados (`proc 0,95 · palet 0,10 ·
  transp 0,20 · exp 0,25` US$/kg, `motor.ts`); el catálogo no la usa.

## 2. El modelo

### 2.1 Stock CTCx — el café que está físicamente en CTCx

- Una **partida** es una cantidad de café en UN estado —pergamino · verde · tostado · empacado—, con código (`SX-AAAA-NNNN`), su lote de
  origen, sus kg, su costo por kg y su ubicación. Los colores son los del dibujo del owner.
- **De dónde nacen** (raíces, sin teclear dos veces): al **recibir** un despacho del productor (`recibirDespacho`: saco, adelanto,
  vendido), al **pagar** un mes de una compra en firme (`registrarPagoDelMes`: directa o black) y al registrar una **compra manual**
  (`registrarCompraManual`). Y un **ingreso a mano** en el propio Stock CTCx (inventario inicial), con nota. Las muestras no: siguen
  en Gestión de Muestras.
- **Lo vendido llega comprometido**: un despacho «vendido» es café que ya tiene comprador; entra al stock (está en la bodega) pero no
  se puede declarar al catálogo.
- **Transformaciones**: trilla (pergamino → verde), tostión (verde → tostado), empaque (pergamino, verde o tostado → empacado). Una
  partida madre; una o varias hijas (se parte). Cada transformación registra los kg que entran y lo que sale: las hijas, la **merma
  de humedad**, los **residuos** (cascarilla, cisco, pasilla) y las **pérdidas**. **Tiene que cuadrar** (± 0,01 kg). Un costo
  opcional de la operación (maquila, tostión, materiales).
- **El costo viaja**: las hijas absorben el costo de lo que entró más el de la operación, por kg de lo que salió (la humedad y los
  residuos no tienen valor).
- **El cuadre** de cada familia (la raíz y todo lo que salió de ella): *kg de la raíz = kg que siguen en cada estado + lo que salió
  (kits, ventas, consumo) + mermas de humedad + residuos + pérdidas*. Cada kilo del origen está en una sola cubeta. Y cada partida dice
  a cuántos kg del estado de origen **equivale** (un factor que carga la humedad y los residuos de su camino; las pérdidas quedan
  aparte): «Verde · 80 kg ≈ 100 kg de pergamino».
- **Salidas**: kit (al enviarlo), venta, consumo interno, ajuste de inventario —con motivo—. Nada se borra: se anula con motivo.
- **Disponible** de una partida = kg − lo que entró a transformaciones − salidas − reservado en kits armados − declarado en el
  catálogo. Derivado, nunca guardado.
- **Sample Kits, dentro del Stock CTCx**: un kit se arma con partidas (CP y Plus: verde, o empacado de verde; Max: pergamino), y al
  enviarse sus ítems salen del stock. Lo que hoy pide `compras.destino = sample_kits` deja de hacer falta.
- **La pantalla**: el linaje de cada familia en cuatro columnas, con curvas de la madre a las hijas; pasar el cursor resalta el camino
  (de dónde viene, a dónde fue); un clic abre la partida con sus acciones (transformar, dar salida, ubicar); la barra del cuadre bajo
  cada familia. Pestañas: Linaje · Sample Kits.

### 2.2 Empacado hasta FOB — ECP · Modelo de Producción

Una herramienta que calcula, para un embarque de café verde, lo que cuesta dejarlo **FOB**:

1. **Modo de empaque**: vacío en bolsas de 3, 6 o 12 kg dentro de cajas; GrainPro + yute de 35 o 70 kg. Bolsa o saco, forro, caja,
   etiqueta, tarjeta de humedad (HIC) y mano de obra (jornal × jornales, por productividad).
2. **Paletizado**: kg por estiba, estiba ISPM-15, film y esquineros.
3. **Transporte a puerto o aeropuerto**: Cartagena, Santa Marta, Buenaventura (marítimo, FOB) o Bogotá · El Dorado (aéreo, FCA):
   costo por viaje y kg por viaje.
4. **Trámites FOB** (por embarque): agencia de aduanas y declaración de exportación; certificados (origen OIC, VUCE, fitosanitario
   ICA); re-pesaje y guía DIAN; inspección; gastos de terminal en origen; fumigación; otros. Y la **contribución cafetera** (US$ 0,06
   por libra exportada).

Da el total del embarque y el costo **por kg de verde** (COP y US$ a la TRM), con su desglose, y lo compara con los estimados del
Modelo Económico. Cada cálculo se puede guardar como una **referencia** con nombre: sus parámetros quedan congelados y el Triage la
elige. Los valores por defecto salen del cotizador logístico (2026-08, embarque de 500 kg) y se ajustan en pantalla; un puerto
marítimo no trae tarifa por defecto —hay que escribir la cotización del transportador—.

**Se retira del ECP**: la herramienta de sellado al vacío con la **amortización de la máquina**, el cuadro de evaluación (sus lentes de
máquina) y la página de las configuraciones guardadas. La herramienta pública «Costo de empaque» del taller de Herramientas del Café
**no cambia** (es de los productores).

### 2.3 Triage de Catálogo Activo — el pivote

- **Entradas**: (a) los **contratos aceptados** con su disponible —declarado − vendido − retirado, en kg de CPS— y su precio (COP/kg
  de CPS, con el flete a CTCx ya sumado); (b) el **Stock CTCx libre** (partidas no comprometidas, con disponible).
- **El triage de cada entrada** (corregir o aceptar):
  - **cantidad** a declarar (kg de verde; corregible);
  - **conversión** a verde para lo que está en pergamino: por defecto, la del factor de rendimiento del lote —70 ÷ FR × 78 ÷ 93,09,
    que en FR 94 da 0,624, el rendimiento garantizado del PVC—; corregible;
  - **costo del café** por kg de verde: (precio + trilla) ÷ conversión, o el costo de la partida si ya es verde;
  - **referencia de Empacado hasta FOB** (una vigente del ECP);
  - **O&P de CTCx** (el del triage por defecto; corregible por entrada);
  - **TRM** (la del PVC vigente; corregible);
  - → **FOB mínimo** en COP y US$ por kg de verde: *(café + empacado hasta FOB) × (1 + O&P)*, con su desglose. Al lado, exhibida y
    sin gobernar, la referencia del Modelo Económico: el **N2** de la banda (FCA Bogotá ≈ FOB).
- **Declarar**: la entrada queda en el Catálogo Activo. El listado del lote suma lo declarado (kg de **verde**), su **ancla** es el
  mayor FOB mínimo de sus entradas, y su precio de venta **no puede bajar del ancla** (lo cuida la base). Si el lote no estaba
  publicado, se publica (código público). **Retirar** la entrada la saca; un listado en cero se archiva.
- **Si una entrada cambia** después de declararla (el productor retira, se vende), el triage la marca «declarado de más» en rojo; no
  se corrige sola.
- **Catálogo Activo** enseña los listados con sus entradas y su ancla, y edita lo comercial (precio ≥ ancla, unidad, MOQ, anticipo,
  llegada, modo). Publicar se hace solo desde el triage.
- **El O&P vive solo en la base** (`platform_settings.triage_catalogo`), lo edita un colaborador con nivel para emitir, y **ni el
  repositorio ni la documentación llevan su valor** (es margen de CTCx: `PVC_BCP_PLAN.md`, confidencialidad).

## 3. Unidades y conversiones

| Qué | Unidad |
|---|---|
| Contratos y compras | kg de CPS (pergamino seco); el precio, COP/kg de CPS (flete a CTCx incluido) |
| Stock CTCx | kg del estado de cada partida; su costo, COP/kg de ese estado |
| Catálogo (tienda Green) | kg de **verde**; el precio de venta y el FOB mínimo, US$/kg de verde |
| Empacado hasta FOB | COP y US$ por kg de verde del embarque |
| Conversión por defecto | kg de verde por kg de CPS = 70 ÷ FR × 78 ÷ 93,09 (PVC v2.1.1: 125 kg CPS → 93,09 excelso en FR 94 → 78 garantizados) |

## 4. Datos

- `stock_partidas` · `stock_transformaciones` · `stock_salidas`; funciones `stock_transformar` y `stock_anular_transformacion`
  (atómicas: validan el disponible, las transiciones y el cuadre); los kg y el estado de una partida no cambian después de nacer.
- `sample_kit_items.partida_id` (la compra deja de ser obligatoria); la compuerta del stock de kits se reescribe sobre partidas.
- `empaque_fob_referencias` (congeladas: solo se retiran).
- `catalogo_fuentes` (las entradas declaradas) y en `lot_listings`: `fob_min_usd_kg`, `fob_min_cop_kg`, con la compuerta del precio ≥
  ancla.
- `platform_settings.triage_catalogo` (O&P por defecto, trilla por kg de CPS).
- `public_lot_catalog.ctc_selection` solo por compras de CTCx Selection (un saco ya no oculta la finca).
- `contract_releases_sync_listing_total` y la escritura de `total_kg` desde las ventanas se retiran: el total del listado lo da el triage.

## 5. Tandas

| Tanda | Versión | Qué deja | Guardián |
|---|---|---|---|
| **A · Empacado hasta FOB** | V5.194 | La herramienta (pura + pantalla), las referencias, el rail; fuera la máquina | `qa-empaque-fob` |
| **B · Stock CTCx** | V5.195 | Partidas, transformaciones y salidas; raíces desde recepciones y compras; el linaje interactivo con su cuadre; los Sample Kits sobre partidas; «Stock CTCx» en Manejo de Stock Físico (talón de `/ocp/sample-kits`); `ctc_selection` corregido | `qa-stock-ctcx` |
| **C · Triage de Catálogo Activo** | V5.196 | El módulo renombrado con sus dos entradas, el FOB mínimo, las declaraciones, el Catálogo Activo sobre ellas, el O&P en la base | `qa-triage-catalogo` |

**Hechas:** A (V5.194) · B (V5.195) · C (V5.196). Lo que la tanda C decidió al ejecutarse, además de lo de §2.3:

- El ancla NO es una columna de `lot_listings`: esa tabla la lee cualquiera (política pública de lectura) y el FOB mínimo es interno.
  Vive en las declaraciones (`catalogo_fuentes`) y la compuerta del precio la lee de allí.
- Una declaración viva por contrato y por partida; para cambiar sus kilos se CORRIGE (se retira y se declara otra en la misma
  transacción). Lo que un contrato puede ofrecer es declarado − retirado: lo vendido sale de lo ya declarado y no se resta dos veces.
- Lo tostado (y lo empacado de tostado) se ve en el triage pero no se declara mientras la tienda solo venda verde (ajusta §6.10).
- El O&P no tiene valor por defecto en ningún lado del repositorio: hasta que un colaborador lo escriba en los ajustes, el triage lo
  pide en cada declaración.
- Un listado nace en «pre-venta» si viene de un contrato (el café sigue en la finca) y «spot» si viene del stock, con la bolsa del
  modelo (6 kg) y el MOQ de su banda; todo se corrige en Catálogo Activo.

Lo que la tanda B decidió al ejecutarse, además de lo de §2.1:

- Los Sample Kits viven en `/ocp/stock/sample-kits` (pestaña del Stock CTCx); la URL vieja va con un 308 (`RUTAS_MOVIDAS`).
- `compras.destino` pasó a `selection` · `stock` (el valor `sample_kits` no tenía filas): una compra es de CTCx Selection —la que hace
  del lote un Selection en la vitrina— o solo de stock (un saco, café para kits). La entrada del rail quedó «Adquisición de Stock Café».
- Una compra registrada antes de llegar entra al stock con «Entrar al stock» (Adquisición); la que ya llegó, sola.
- Mientras las mezclas sigan sobre `compras` (§6.12), lo asignado a una mezcla se descuenta del disponible de la raíz de su compra.
- Los kilos de un kit van en el estado de su partida (verde para CP y Plus, pergamino para Max); al enviarse, la base los saca del
  stock, y al anular un kit enviado los devuelve.
- Las propuestas de reparto del formulario (trilla ≈ 80 % de verde y 20 % de residuos; tostión ≈ 85 % y 15 % de merma) son un punto
  de partida que se corrige con lo pesado; no gobiernan nada.

## 6. Supuestos (el owner los corrige)

1. El triage vive en `/ocp/contratos` (las páginas de cada contrato siguen ahí, con sus operaciones de ventana y despacho).
2. «Stock CTCx» va en «OCP · Manejo de Stock Físico»; sale «Stock de Sample Kits» del grupo «Catálogo».
3. Las raíces nacen solas al recibir, al pagar y al comprar; lo vendido entra comprometido.
4. Se empaca desde pergamino, verde o tostado (los kits Max son de CPS; los CP y Plus, de verde).
5. El cuadre es de masa (cada kilo en una cubeta) y cada partida enseña además su equivalencia en el estado de origen.
6. La conversión por defecto es la del FR del lote (§3) y se corrige por entrada.
7. La trilla de lo que está en pergamino se cuenta en el triage (COP por kg de CPS, de sus ajustes).
8. El O&P es un porcentaje sobre (café + empacado hasta FOB).
9. Declarar publica; el precio de venta arranca en el FOB mínimo redondeado hacia arriba a US$ 0,05 y se sube en Catálogo Activo.
10. Tostado y empacado se pueden declarar, pero la tienda Green solo vende verde: quedan en el Catálogo Activo, sin tienda.
11. Los valores por defecto de Empacado hasta FOB salen del cotizador logístico (2026-08) y se ajustan; los puertos marítimos van sin
    tarifa por defecto.
12. Las mezclas siguen sobre `compras` en esta tanda.

## 7. Fuera de alcance, con dueño

- **Mezclas físicas** (una partida que nace de varias) — consolas, tanda siguiente.
- **Ventas de la tienda → salidas del stock y ventas del contrato** (la conversión de verde a CPS) — consolas · cherry-picked.
- **Tienda de tostado y empacado** — cherry-picked.
- El crédito de transparencia que pinta COP como US$ y el anticipo fijo de `place_order` — cherry-picked.
- El taller público «Costo de empaque» no cambia — herramientas-cafe.
