# Guion · «Así funciona Cherry Picked» — video para el comprador (≈ 5:20)

(componente: `cherry-picked` · slug: `guion-video-comprador` · **v0.1 · primer borrador, para revisión del owner**)

**Historial.**
- **v0.1 (2026-09-18): primer borrador.** Gemelo del guion del productor (`kaffetal-regal-guion-video-productor.md`, v0.9.1):
  mismo formato, mismo tope de 6:00, la misma voz cercana —frases cortas, las preguntas que el comprador se haría y cada
  bloque entregándole el turno al siguiente—, el bloque «en limpio» con lo que gana, y la misma frase de cierre del video
  original. Fuente: la narrativa v3 de Cherry Picked (`reference/narrativa-2026-09-17/`), este charter,
  `PVC_BCP_PLAN.md` §12 y §14, y `src/lib/pvc/canales.ts`.

**Qué es.** El guion locutado de la pieza larga para quien compra: qué es Papagayo Beans®, cómo se mide, qué trae cada
lote, cómo se fija el precio, cómo llega a su bodega, cuánto hay que comprar, los cuatro programas, la subasta Tyrian y
cómo empezar.

**Para quién.** Tostadores, marcas y compradores HORECA en cualquier parte del mundo; el consumidor directo es público de
X, no de esta pieza. **Tratamiento de «tú»**, como toda la tienda («Reserva tu fracción», «Tu cuenta madura como la cereza»).

**Antes de rodar la versión final.**
1. **La plataforma debe decir lo mismo que el video** (§6). Hoy la tienda y la subasta corren en **EUR**, nada dice
   «Papagayo Beans», no existen las regiones como dato y **no se puede cobrar** (sin pasarela ni entidad legal).
2. **El primer lote publicado** (decidido el 2026-09-18: «Gesha 72h Ferm», Gold): hoy hay 0 lotes en Green.
3. **El idioma de la locución** es decisión del owner (§5): el público es internacional.

La **animática** se puede hacer ya.

---

## 1 · Principios de la pieza

- **Una sola idea**: *un café que puedes demostrar —origen, calidad y cumplimiento—, a un precio público, con el nombre de
  quien lo cultivó.*
- **La regla antes que la promesa.** El video dura más que el estado de hoy: se dice **cómo funciona** («si tu región tiene
  Master Roaster…»), no qué regiones están abiertas este mes. Lo que cambia —el mapa, las fechas, los precios— va en
  **pantalla**, que se re-renderiza.
- **Transparencia radical**, igual que con el productor: precio público, no negociable, igual para todos; y el comprador
  oye que el 80 % del alza de la subasta es del productor.
- **Las cifras en dólares no se dicen**: van en pantalla, rotuladas con su edición de PVC.
- **La marca del café es Papagayo Beans®**; Cherry Picked es la plataforma y CTCx el motor.
- Ritmo ~2,3 palabras por segundo más 1,5 s de imagen por bloque. Tres idiomas en toda superficie pública (EN · ES · DE).

## 2 · El guion

`IMAGEN` = lo que se ve · `VOZ` = locución · `PANTALLA` = texto sobreimpreso.

### Bloque 0 · Apertura (0:00–0:24)

- **IMAGEN.** Una mesa de catación en una tostaduría: cucharas, tazas, silencio. Corte a una caja que llega a una bodega; nadie sabe qué finca hay dentro. Corte a la misma caja con el sello del grado y un QR.
- **VOZ.** Un gran café se defiende solo en la taza. Lo difícil es todo lo demás: saber de qué finca viene, probar que es lo que dice ser, demostrarlo ante tus clientes y ante la aduana. Y pagarlo a un precio que no dependa de quién negocia mejor.
  Para eso existe Cherry Picked.
- **PANTALLA.** *Origen que puedes demostrar.* · *Calidad que puedes comparar.* · *Un precio igual para todos.*

### Bloque 1 · Qué es (0:24–0:38)

- **IMAGEN.** La portada de Cherry Picked; la cinta de tarjetas del catálogo se voltea. La bolsa de Papagayo Beans®: nombre, sello del grado, productor y finca.
- **VOZ.** Es la plataforma de compra de CTCx. Aquí compras **Papagayo Beans®**: microlotes colombianos medidos con rigor, cada uno con el nombre de su productor, su finca y su historia.
- **PANTALLA.** *Papagayo Beans® · el café de CTCx* · *cherry-picked.ctcexport.com · EN · ES · DE*

### Bloque 2 · Cómo se mide (0:38–1:08)

- **IMAGEN.** Laboratorio: factor de rendimiento, humedad, densidad. Una bolsa anónima con un código. Un Q Grader rompe la costra. Los cinco sellos aparecen en escalera.
- **VOZ.** ¿Y quién dice que es bueno? No lo decimos nosotros. Cada lote pasa primero una base física; después lo **cata a ciegas** un Q Grader certificado, que no sabe de quién es el café. De ahí sale su grado: Black, Red, Blue, Gold o Tyrian.
  Son **cinco grados comparables**: cuando compras un Blue, sabes exactamente qué estás comprando, venga de la finca que venga.
- **PANTALLA.** *Base física · cata a ciegas · Q Grader certificado* · *Black · Red · Blue · Gold · Tyrian* · *El grado se lee del puntaje en taza, con variedad, proceso y reconocimientos*

### Bloque 3 · Lo que trae cada lote (1:08–1:32)

- **IMAGEN.** La ficha pública de un lote en pantalla: finca, variedad, proceso, rueda de cata, Visa EUDR. El mapa con el polígono de la finca. Un celular escanea el QR de una bolsa y abre esa misma ficha.
- **VOZ.** Y el grado no viaja solo. Cada lote trae su ficha: la finca, la variedad, el proceso, el perfil de taza, y su **Visa EUDR**, con la finca ubicada en el mapa. En la bolsa va un código que lleva a esa ficha: tu cliente también puede ver de dónde viene su café.
- **PANTALLA.** *Ficha pública del lote* · *Visa EUDR por finca · sello EUDR por lote* · *QR en la bolsa → ficha, Visa y trazabilidad*

### Bloque 4 · El precio (1:32–2:03)

- **IMAGEN.** La tabla de precios por grado de una región, entrando con sesión. Las tres barras del PVC —costo de producir, cooperativa, mercado— y los multiplicadores de grado encima.
- **VOZ.** ¿Y el precio? **Público, en dólares**, por grado y por región. **No se negocia, y es igual para todos**: el tostador pequeño paga lo mismo que el grande.
  Sale del PVC, la misma referencia con la que le pagamos al productor, que nunca queda por debajo de lo que le cuesta producir, multiplicada por el grado. Tú ves cuánto vale el café en origen, y cuánto cuesta llevártelo.
- **PANTALLA.** *Precio público en US$ · por grado y por región* · *Transparente · no negociable · igual para todos* · *Los precios se ven con tu cuenta* · *Ejemplo rotulado: «Gesha 72h Ferm» · Gold · edición PVC-F4-2026*

### Bloque 5 · Cómo llega a tu bodega (2:03–2:37)

- **IMAGEN.** El mapa de regiones con sus pines. Un contenedor consolidado que se reparte desde un Master Roaster. Al lado, un envío dedicado. Por último, el puerto colombiano.
- **VOZ.** ¿Y cómo llega a tu bodega? Depende de dónde estés. Si tu región tiene un Master Roaster habilitado, tu café viaja consolidado y te llega **DDP**: puesto en tu puerta, con aduana e impuestos resueltos. Es el camino que recomendamos.
  Si prefieres un envío propio, eso es CaaS, Coffee as a Service: FOB, puerto de destino o DDP en las regiones habilitadas. Y estés donde estés, siempre puedes comprar **FOB Colombia**. Nadie queda fuera.
- **PANTALLA.** *Con Master Roaster → Cherry Picked · DDP consolidado* · *Región habilitada → CaaS · puerto de destino o DDP* · *En cualquier parte del mundo → FOB Colombia* · *Mapa: Nueva York · Florida · California · Alemania · Japón · Colombia*

### Bloque 6 · Cuánto hay que comprar (2:37–2:57)

- **IMAGEN.** Unidades de seis kilos apilándose hasta el mínimo de cada grado. Empaque al vacío de 3, 6 y 12 kilos; sacos de yute con GrainPro.
- **VOZ.** ¿Y cuánto tienes que comprar? Menos de lo que crees. Se compra en **unidades de seis kilos**, y el mínimo baja a medida que sube el grado: desde **treinta y seis kilos** en un Tyrian hasta unos trescientos en Black y Red.
- **PANTALLA.** *Unidades de 6 kg* · *Mínimos: Tyrian 36 kg · Gold 78 kg · Blue 156 kg · Black y Red 252–336 kg* · *Blue, Gold y Tyrian al vacío (3 · 6 · 12 kg) · Black y Red en GrainPro con yute de 35 kg*

### Bloque 7 · Cuatro programas, una cuenta (2:57–3:27)

- **IMAGEN.** La portada reparte cuatro puertas: Green, Roast, X y CaaS. Las tres etiquetas de Roast: Papagayo Beans®, Co-Brand y My Brand.
- **VOZ.** Todo esto cabe en cuatro programas, con una sola cuenta. Green es Papagayo Beans® en verde, para que lo tuestes tú. Roast es el mismo café, tostado por el Master Roaster de tu región: con nuestra etiqueta, con la del productor o con la tuya. X es para quien solo quiere una gran bolsa de café en su casa. Y CaaS, para proyectos a tu medida.
- **PANTALLA.** *Green · en verde* · *Roast · tostado: Papagayo Beans® · Co-Brand · My Brand* · *X · consumidor directo* · *CaaS · Coffee as a Service* · *Roast y X: lista de espera abierta*

### Bloque 8 · La subasta Tyrian (3:27–3:55)

- **IMAGEN.** La sección Tyrian en vivo: el lote, las reglas publicadas, la puja subiendo, el precio final por programa a la vista.
- **VOZ.** Y para los lotes que aparecen una vez por cosecha está la subasta Tyrian. Un lote, en verde, en dólares por kilo sobre FOB Colombia. Las reglas se publican antes de abrir, y ves tu precio final desde el primer momento.
  Y algo que nos importa que sepas: el **ochenta por ciento** de lo que suba la puja es para el productor.
- **PANTALLA.** *Tyrian · una subasta por lote* · *US$/kg sobre FOB Colombia* · *Reglas publicadas antes de abrir · precio final por programa visible* · *Para pujar: nivel Pintón* · *80 % del alza para el productor*

### Bloque 8b · Lo que ganas, en limpio (3:55–4:28)

- **IMAGEN.** Fondo limpio; las cinco ganancias entran una por una. Corte a la bolsa terminada en la estantería de una tostaduría.
- **VOZ.** En limpio: ¿qué ganas tú? Un café que puedes demostrar, lote por lote: su origen, su calidad y su cumplimiento. Un precio público, que no depende de tu tamaño. La logística resuelta hasta tu puerta donde hay Master Roaster, y FOB siempre. Mínimos que un tostador pequeño sí puede comprar.
  Y una historia real, con nombre y con finca, que viaja en la bolsa y le da valor a tu marca.
- **PANTALLA.** *Origen, calidad y cumplimiento · lote por lote* · *Precio público en US$* · *DDP consolidado · o FOB siempre* · *Desde 36 kg* · *El nombre del productor y su finca, en la bolsa*

### Bloque 9 · Cómo empezar (4:28–4:57)

- **IMAGEN.** «Crear cuenta»; el catálogo de la temporada por grado; se abre una ficha; «Pedir paquete de muestras»; el carrito y el checkout. El perfil con el nivel: verde → pintón → maduro.
- **VOZ.** ¿Por dónde empiezas? Crea tu cuenta: sirve para todos los programas. Explora el catálogo de la temporada, abre la ficha de cada lote y pide un paquete de muestras. Cuando encuentres tu café, lo reservas y lo compras desde el carrito.
  Y tu cuenta madura como la cereza: de verde a pintón y a maduro, con cada compra. Desde pintón puedes pujar en la subasta.
- **PANTALLA.** *1 Crea tu cuenta* · *2 Explora el catálogo* · *3 Pide muestras* · *4 Reserva y compra* · *Niveles: verde → pintón → maduro* · *Reputación: compras completadas · diversidad · confiabilidad*

### Bloque 10 · Cierre y llamado (4:57–5:20)

- **IMAGEN.** Un barista sirve la taza; en la bolsa, el nombre de la finca. Fondo limpio con la dirección grande y los logos.
- **VOZ.** El café colombiano ya tiene lo que tus clientes buscan. Ahora puedes comprarlo con nombre, con grado y con historia.
  Entra a **cherry-picked punto ctcexport punto com** y crea tu cuenta.
  Cherry Picked, de CTCx: un ecosistema para que el café colombiano —tu café— viaje con pasaporte propio.
- **PANTALLA.** *cherry-picked.ctcexport.com* · *Crea tu cuenta* · *Cherry Picked · una iniciativa de CTCx*

**Duración.** La locución tiene 694 palabras, ≈ 5:02; con las pausas de imagen, la pieza dura ≈ 5:20. Los tiempos se recalculan con `guion_tc.py` cada vez que cambia la locución.

**Qué no se recorta.** El precio público e igual para todos; los cinco grados y la cata a ciegas; la ficha con la Visa EUDR;
los tres caminos de entrega (DDP consolidado · CaaS · FOB siempre); los mínimos en unidades de 6 kg; el 80 % del alza para el
productor; el bloque 8b; y el llamado final. Si el montaje queda largo, primero sale el bloque 7 (los programas ya están en
la portada) y después la segunda mitad del bloque 9 (los niveles pasan a pantalla).

## 3 · Reglas de lenguaje

| Nunca se dice | Se dice | Por qué |
|---|---|---|
| «CTC» · «CTCX» | «CTCx» | La marca es CTCx en todo (§14 n.º 2) |
| «café Cherry Picked» · «café Kaffetal Regal» | «Papagayo Beans®» | Es la marca del café; las otras son plataformas (§14.6 n.º 18) |
| precios en euros · cifras en dólares en la voz | «en dólares, por grado y por región»; la cifra, en pantalla con su edición | US$ es la moneda al comprador (§14 n.º 5) y el PVC cambia cada trimestre |
| «te hacemos precio» · «negociamos» · «descuento por volumen» | «no se negocia, y es igual para todos» | Precio público y transparente (narrativa CP p1) |
| «entregamos en toda Europa / en todo el mundo» | «si tu región tiene Master Roaster… · estés donde estés, FOB Colombia» | Se dice la regla, no una cobertura que hoy no existe (`canales.ts`) |
| «Cherry Picked FOB» · «Cherry Picked en puerto» | «Cherry Picked llega DDP consolidado; el envío propio es CaaS» | `puedeCotizar` niega esas casillas (§12.1) |
| «comercio directo» · «precio justo» · «Fairtrade» | — | Hay intermediación declarada; no son sellos propios |
| «Co-Create» | «CaaS · Coffee as a Service» | Co-Create se retira (§14 n.º 17) |
| cacao como producto | solo como nota de cata | Vocabulario congelado |

## 4 · Verificación de afirmaciones

✅ vive hoy · 🟡 decidido, sin construir · 🔴 lo publicado hoy dice otra cosa

| Bloque · afirmación | Fuente | Estado |
|---|---|---|
| 1 · Papagayo Beans® como el café que se compra | narrativa v3 · §14.6 | 🔴 Ninguna superficie de este componente dice «Papagayo Beans» |
| 2 · Base física, cata a ciegas por Q Grader, cinco grados | charter KR · `lib/grados/definicion.ts` | ✅ la cata y los grados · 🟡 la base física como puerta es la fase 2 del PVC |
| 3 · Ficha pública con finca, variedad, proceso, taza y Visa EUDR | `lib/catalogo/fichaPublica.ts` · `/docs/ficha/[lotId]` | ✅ (lista blanca; en un lote CTCx Selection la finca es dato, no protagonista) |
| 3 · QR en la bolsa que lleva a la ficha | §14.7 n.º 23 | 🟡 Existe `lots.public_code` y «Find my Lot» (V5.48); **no hay impresión de bolsa** |
| 4 · Precio público en US$ por grado y región, igual para todos, visible con sesión | narrativa CP p1 · `public_transparency_pricing` | 🔴 La tienda imprime **€** (CP-1) · 🟡 no existen tablas por región |
| 4 · Sale del PVC, que nunca queda por debajo del costo del productor | `PVC-D2` §3 · `lib/pvc/motor.ts` | ✅ en el método |
| 5 · DDP consolidado con Master Roaster · CaaS FOB/puerto/DDP · FOB siempre | `lib/pvc/canales.ts` (`accesoDelComprador`) | ✅ la regla · 🟡 **regiones y Master Roasters no existen como dato** («coming soon») · «puerto» usa flete aéreo (n3) |
| 6 · Unidades de 6 kg; mínimos 36 · 78 · 156 · 252–336 kg; empaques | narrativa CP p2 · §14.4 | 🔴 El código usa `ASSOC_BLACK_MOQ = 350` y MOQ por empaque |
| 7 · Cuatro programas, una cuenta; etiquetas de Roast | charter · §14.7 n.º 24 | ✅ portada y cuenta · 🟡 Roast y X son listas de espera (2027); etiquetas sin módulo |
| 8 · Subasta Tyrian en US$/kg sobre FOB, reglas antes de abrir, precio final visible, Pintón | `lib/subastas/` · §14 n.º 11, 16 | ✅ la subasta y el nivel · 🔴 corre en **EUR/kg** · espera un Tyrian galardonado |
| 8 · 80 % del alza para el productor | §14 n.º 11 | 🟡 Solo en Cherry Picked; en CaaS el alza es de CTCx — la voz dice «para el productor» sin matiz: **ver §5 n.º 3** |
| 9 · Cuenta única, catálogo, muestras, reserva, carrito, checkout, niveles | `CherryPickedExperience`, `place_order`, `buyer_profiles` | ✅ · 🔴 **no se puede cobrar** (sin pasarela ni entidad legal) · 0 lotes publicados |

## 5 · Decisiones del owner

1. **Idioma de la locución.** Este borrador está en español para revisarlo; el público es internacional. ¿La pieza se graba
   en **inglés** con subtítulos ES · DE (y JA para Japón, que es Enabled Region), o en español con subtítulos, como el video
   original?
2. **Tratamiento.** Va en «tú», como toda la tienda; el guion del productor va en «usted». ¿Se confirma?
3. **El 80 % del alza** se le dice al comprador sin el matiz de programa. ¿Se deja así (es cierto en Cherry Picked, el camino
   recomendado) o se dice «en Cherry Picked»?
4. **El ejemplo de precio en pantalla**: ¿se usa el primer lote («Gesha 72h Ferm», Gold, DDP US$ 31,00/kg, edición
   PVC-F4-2026) como tarjeta rotulada, o ninguna cifra hasta tener la tabla por región?
5. **El QR de la bolsa** se afirma en la voz (bloque 3) aunque la impresión no existe todavía. ¿Se rueda así o pasa a pantalla?

## 6 · Traslado a las plataformas

De `cherry-picked` (las tandas CP-1 a CP-3 del plan de narrativa ya lo cubren): **US$** en tienda y subasta · mínimos en
unidades de 6 kg · **Papagayo Beans®** en Green, Roast, X y la ficha · mapa de regiones en la portada · Co-Create fuera.
De `consolas`: regiones y Master Roasters como dato · tablas de precio por región · UID/QR de la bolsa · cobros.

## 7 · Producción

- **Capturas** con una cuenta de comprador de prueba sobre la versión ya corregida; lo que no exista al rodar va como **mock
  rotulado «ejemplo»**.
- **Rodaje**: una tostaduría (catación, bodega, barra), el laboratorio (compartido con el rodaje del productor) y el empaque.
- **Gráficos**: los cinco sellos · las barras del PVC · el mapa de regiones (`reference/narrativa-2026-09-17/img/mapa-regiones.svg`)
  · el árbol de entrega (DDP · CaaS · FOB) · la escalera de mínimos.
- **Entregables**: pieza en 16:9 y 9:16 · subtítulos EN · ES · DE · cortes de 90 s (bloques 0, 4, 5, 8b y 10) y 30 s (0, 8b y 10).
