# Brief · Cotizador Courier (FedEx)  (componente: herramientas-internas · slug: `cotizador-courier` · 2026-09-23)

> Proyecto nuevo que trajo el owner el 2026-09-23 con el **acuerdo de precios que CTC firmó con FedEx** (vigente desde el
> 2026-09-22). No estaba en el charter. Es la **modalidad courier del Modelo Logístico** (fila 5; brief hermano
> `herramientas-internas-modelo-logistico.md`), y la primera tarifa real y fechada que ese modelo va a tener. Estado:
> **APROBADO por el owner el 2026-09-23 y construido en la V5.68** (primera tanda). Queda como acta de origen.

> ⚠️ **Este brief NO lleva ninguna cifra del acuerdo, y el código tampoco la llevará.** La cláusula 6 del acuerdo declara
> **confidenciales** sus términos y sus precios y prohíbe publicarlos; **el repo es PÚBLICO** (`ALINEACION` §4, regla 9).
> Por eso aquí no aparecen porcentajes, cargos mínimos, escalones, ni el número de acuerdo ni el de cuenta. El PDF no entra
> al repo. Los números viven SOLO en la base.

**Qué es** — Una calculadora interna donde el equipo mete **origen/destino, servicio, peso y medidas** del envío y obtiene
**cuánto le cobra FedEx a CTC**, desglosado: tarifa de lista de FedEx → descuento del acuerdo → cargo mínimo → recargo de
combustible y demás recargos a precio de lista. Reemplaza la «tarifa courier por kg» que hoy se teclea a mano en el
cotizador logístico.

**Para quién** — El **owner** y el **equipo CTC** que despacha muestras y cotiza envíos. Aguas abajo: la Gestión de Muestras
del OCP (brief `consolas-gestion-de-muestras.md`: cada muestra que sale al comprador es un envío courier) y el cotizador
logístico (su modalidad «Courrier (DHL/FedEx)»).

**Cómo está hecho el acuerdo (estructura, sin cifras)**
- **Precio = tarifa base publicada por FedEx** (la «Guía de servicios» de Colombia **vigente en la fecha del envío**) **menos
  descuentos**. El acuerdo NO trae tarifas en dinero: trae porcentajes. Si FedEx sube su tarifa base, el precio de CTC sube
  con ella. → **hacen falta dos fuentes**: el acuerdo (descuentos) y la guía de tarifas de FedEx Colombia (base + zonas).
- **Tres familias**: Exportación · Importación · Terceros. Dentro de cada una, servicios (International Priority, Priority
  Express, Economy, sus variantes Envelope y Pak, y los Freight ATA/ATD/DTA/DTD, Deferred…).
- **Descuento por zona A–I**; en los servicios de paquete, **dos bandas de peso** (hasta 10 kg · desde 10,5 kg); **cargo
  mínimo** por envío.
- **Descuento adquirido (Earned Discount)**, que se SUMA al anterior: un **periodo de gracia** con un descuento fijo, y después
  una tabla de **escalones según el gasto anualizado** en transporte (bruto, antes de descuentos, recalculado cada semana).
- **Bonificación por automatización**: un descuento adicional, explícitamente acumulable, al despachar con una solución
  FedEx aprobada.
- **Recargos sin modificación**: combustible, peso dimensional, manejos especiales, accesorios, aranceles e impuestos se
  cobran **a precio de lista** y **sin descuento**.
- Redondeo: toda fracción de peso sube al siguiente escalón de la guía.

**Dónde vivirá** — Módulo de consola: **`/ecp/cotizador-courier`**, en «ECP · Modelo Logístico», al lado de los otros tres
cotizadores (mismo patrón `/ecp/cotizador-*`; la entrada del rail la añade `consolas`). Lógica **pura** en
`src/lib/courier/` (`calculo.ts`: peso facturable, zona, descuento compuesto, mínimo, recargos) — **sin un solo número del
acuerdo**; recibe las tablas como parámetro. Pensado **sin atarse a FedEx** (columna `transportista`), para que un acuerdo
DHL entre como datos, no como código.

**Datos** — Tablas nuevas, patrón de la casa (**RLS + cero políticas**, service-role-only, solo lectura/escritura desde la
consola con `requireConsoleWrite`), versionadas por `vigente_desde` (una tarifa nueva no borra la anterior):
- `courier_acuerdos` — transportista, referencia interna, vigencia, estado. (El número real, solo aquí.)
- `courier_descuentos` — acuerdo, familia, servicio, zona, banda de peso, % descuento, cargo mínimo.
- `courier_descuento_adquirido` — acuerdo, grupo de servicios, % de gracia, fin de la gracia, escalones (desde · hasta · %).
- `courier_bonificaciones` — acuerdo, servicio, % (la de automatización).
- `courier_tarifas_base` — transportista, servicio, zona, peso (kg), USD, `vigente_desde`, `fuente` (qué guía, qué fecha).
- `courier_zonas` — transportista, país destino/origen, zona, `vigente_desde`.
- `courier_recargos` — transportista, concepto (combustible…), tipo (% · fijo), valor, `vigente_desde`, `fuente`.
- Las cotizaciones guardadas: **snapshot congelado** (entradas + tablas usadas + resultado), en `quotes` si su forma lo
  admite, o en `courier_cotizaciones`; se decide al leer `quotes` en la primera tanda.
- **Carga inicial**: un script local (`scripts/seed-courier.mjs`) que lee un JSON **fuera del repo** transcrito del PDF;
  después, la pantalla permite corregir. Lo derivado (el gasto anualizado para el escalón) **no se persiste**: la primera
  versión deja elegir el escalón a mano; calcularlo de las facturas reales es otra tanda.

**IA** — Ninguna. Es aritmética sobre tablas.

**Contratos que toca** — **Moneda** (la tarifa es en US$; la vista en COP usa la TRM que ya lee el cotizador logístico) ·
**el Modelo Logístico** (la modalidad courier del cotizador logístico pasa a poder LEER esta tarifa en vez del valor tecleado:
eso es un cambio en una superficie de `consolas` y va con línea en §3) · **la regla del repo público** (§4.9) · **la auditoría
de exposición** pendiente del owner (§3b). No toca grados, identidad, subdominios ni el PVC (el motor del PVC no modela
courier).

**Guardián previsto** — `qa-courier-check.mjs`: (1) el cálculo con un **acuerdo FICTICIO** de fixture (números inventados,
jamás los reales): peso dimensional contra real, redondeo al escalón, descuento compuesto, cargo mínimo, recargos sin
descuento; (2) **fuga cero**: ningún archivo versionado contiene el número de acuerdo ni el de cuenta — el guardián guarda
solo su **hash**, así vigila sin publicarlos; (3) sin tarifa base vigente para la fecha del envío, la cotización **lo dice en
voz alta** y no inventa un precio; (4) cada tarifa y recargo con `fuente` y `vigente_desde`.

**Primera tanda** — Solo **Exportación de paquetes** (International Priority / Priority Express / Economy, con Envelope y Pak),
que es lo que CTC despacha hoy: muestras. Las siete tablas + la carga inicial + `/ecp/cotizador-courier` con un formulario
(país destino, servicio, piezas con peso y medidas, fecha de envío, escalón de descuento adquirido) y el desglose línea a línea
**con la fuente de cada cifra a la vista**. Se verifica con `tsc`/`eslint`/guardián + SQL, y comparando **tres envíos
reales** contra la cotización que da fedex.com con la cuenta de CTC. Importación, Terceros y Freight, en la segunda tanda.

**Decisiones del owner**
1. **La tarifa base.** El acuerdo remite a la guía de FedEx Colombia (fedex.com/co/rates). ¿Me autorizas a descargar la guía
   de tarifas y el cuadro de zonas vigentes, o me los pasas tú? Sin ellos no hay precio, solo porcentajes.
2. **¿Qué envías de verdad?** Propuesta: primera tanda = muestras (exportación de paquetes hasta ~68 kg). ¿Hay importaciones
   (insumos, equipos) o carga Freight a la vista que deban entrar ya?
3. **¿Los descuentos se suman?** El acuerdo lo dice explícito para la automatización; para zona + adquirido lo leo igual
   (suma de porcentajes sobre la base). Conviene **confirmarlo con el ejecutivo de FedEx** con un envío de ejemplo; la
   primera tanda lo deja como parámetro.
4. **¿Costo CTC o también precio al cliente?** La cláusula 2 prohíbe **revender o extender** estos precios a terceros sin
   permiso escrito de FedEx (incluida la «facturación externa»). Cobrarle a un comprador el envío de SU muestra con un precio
   propio es normal; dejar que un socio despache con la cuenta de CTC, no. Propuesta: la herramienta da **costo CTC**, y el
   precio al cliente, si lo quieres, es una línea aparte con margen, sin nombrar la tarifa de FedEx.
5. **¿API de FedEx después?** FedEx tiene una API de tarifas (developer.fedex.com) que devuelve el precio neto de la cuenta,
   con recargos. Requiere que registres la cuenta de desarrollador. Propuesta: **no en la primera tanda**; más adelante, como
   contraste automático de la calculadora.

**Respuestas del owner (2026-09-23)** — (1) descargar la guía de FedEx Colombia: hecho (2026, exportación, en `apps-internas/courier-fedex/`); (2) envíos de **café verde y/o tostado, paquetes de menos de 100 kg**; (3) **costos para CTCx** (sin precio al cliente); (4) la **API, después**; (5) ejemplo inicial: **25 kg a Alemania** (zona F). La decisión 3 —si los descuentos se suman— sigue abierta con FedEx: se cargó «aditivo».
