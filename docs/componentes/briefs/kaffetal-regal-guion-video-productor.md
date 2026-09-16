# Guion · «Así funciona Kaffetal Regal» — video para el productor (5:30–6:00)

(componente: `kaffetal-regal` · slug: `guion-video-productor` · 2026-09-16 · **BORRADOR v0.1, espera al owner**)

**Qué es.** El guion locutado de la pieza larga para el caficultor: cómo funciona Kaffetal Regal de punta a punta:
cuenta, finca, Visa EUDR, lote y Ficha, calendario, evaluación, grado, las **dos oportunidades de oferta**, la operación
del contrato y la reputación. Es la narrativa del productor **según las decisiones del CEO del 2026-09-16**
(`docs/PVC_BCP_PLAN.md` §12), contrastada línea a línea con lo que la plataforma hace hoy (§4).

**Para quién.** El productor colombiano: de finca pequeña o de microlotes, asociado o no, que nunca ha mandado una
muestra. Se ve en el celular, muchas veces sin sonido. **Reemplaza o complementa** el video de bienvenida vigente
(`qDAu9mK3KRA`, 5:33, en `BienvenidosSection.tsx` y en la Home), que no tiene guion ni transcripción en el repo.

**Advertencia antes de rodar.** Tres cosas impiden grabar la versión final hoy:
1. **La plataforma pública contradice el guion** en las condiciones del trato (§6).
2. **Hay cifras sin decidir** (§5).
3. **La marca «Kaffetal»** está pendiente de consulta ante la SIC (pendiente del owner en el charter): un video es
   exactamente el tipo de inversión en el nombre que ese pendiente pide frenar.

Se puede hacer la **animática** (locución provisional sobre capturas) ya.

---

## 1 · Principios de la pieza

- **Una sola idea**: *su café se mide, su precio se explica y su compromiso queda por escrito.* Todo lo demás es
  evidencia de eso.
- **La pantalla es la protagonista.** Dos tercios de la pieza son capturas reales del panel, hechas con las cuentas
  `prueba-*` sobre una finca y un lote de prueba (nunca datos de un productor real sin consentimiento). El otro
  tercio es finca, beneficio y mesa de cata: cámara a la altura de la persona, luz natural, sonido directo.
- **Cada cifra dicha tiene fuente** en el repo (§4). Si la fuente no existe, la cifra no se dice.
- **Sin letra pequeña**: el costo de la evaluación y la penalización de salida se dicen **en voz alta**, antes de que
  el productor las busque.
- **Tratamiento de «usted»**, como toda la plataforma. Ritmo pausado (~2,3 palabras por segundo), español con acento
  colombiano neutro.
- **Tres idiomas** (contrato de ALINEACIÓN §1): locución ES; subtítulos ES · EN · DE. La versión sin sonido se entiende
  completa por el texto en pantalla.

## 2 · El guion

`IMAGEN` = lo que se ve · `VOZ` = locución · `PANTALLA` = texto sobreimpreso. Los tiempos son orientativos: se
ajustan con la locución grabada.

### Bloque 0 · Apertura (0:00–0:25)

- **IMAGEN.** Amanece en un patio de secado. Manos que mueven el pergamino. Corte a un celular con el precio del día.
- **VOZ.** Usted sabe lo que cuesta sacar una carga de café: la recolección, el beneficio, el secado. Y sabe que su
  mejor café, muchas veces, se paga igual que el corriente. Kaffetal Regal existe para cambiar eso: para que su café
  se mida, su precio se explique y su compromiso quede por escrito.
- **PANTALLA.** *Su café se mide. Su precio se explica. Su compromiso, por escrito.*

### Bloque 1 · Qué es y el camino (0:25–0:50)

- **IMAGEN.** La landing en el celular; los seis pasos de «Bienvenidos» aparecen uno a uno.
- **VOZ.** Kaffetal Regal es la plataforma del caficultor de CTC, Colombian Trading Company. Todo se hace desde el
  celular, en seis pasos: crear su cuenta, registrar su finca, agregar su lote, descubrir el potencial de su café,
  recibir una oferta y despachar al mundo. Le mostramos cada paso, con sus tiempos y sus condiciones.
- **PANTALLA.** 1 Cuenta · 2 Finca · 3 Lote · 4 Evaluación · 5 Oferta · 6 Despacho

### Bloque 2 · La cuenta y la finca (0:50–1:33)

- **IMAGEN.** «Crear cuenta gratis» → «Continuar con Google» → Mi Perfil y la barra de cinco botones. Luego
  `FincaModal`: pestaña Ubicación, toque en «📍 Estoy aquí», el polígono se dibuja, «Calcular del polígono 📐»,
  «Traer del mapa ⛰». Pestaña Cuestionario EUDR, desplazándose.
- **VOZ.** Crear la cuenta es gratis: nombre, correo y contraseña, o su cuenta de Google. Su panel tiene cinco botones:
  Mensajes, Ecosistema, Mi Perfil, Evaluaciones y Contratos.
  Lo primero es la finca. Parado en el cafetal, toque «Estoy aquí» y el mapa toma su ubicación. Si la finca pasa de
  cuatro hectáreas, dibuje el contorno: la plataforma calcula el área y trae la altura. Luego responde el cuestionario
  EUDR, el reglamento europeo contra la deforestación. Todo se guarda mientras escribe, y el contorno se levanta una
  sola vez: sirve para toda la vida del predio.
- **PANTALLA.** *Más de 4 ha → contorno completo* · *EUDR: sin deforestación después del 31-dic-2020*

### Bloque 3 · El primer resultado, gratis (1:33–1:53)

- **IMAGEN.** Tarjeta de la finca: «Visa EUDR: en trámite» → «Visa vigente» → «⬇ Descargar Visa EUDR».
- **VOZ.** Y aquí recibe lo primero, sin pagar nada: CTC revisa su declaración y le devuelve el análisis EUDR de su
  finca. Cuando todo está en regla, su Visa EUDR queda en su panel para descargar. Esa visa es la puerta de Europa.
- **PANTALLA.** *Registro de finca y análisis EUDR: $0*

### Bloque 4 · El lote y la Ficha Técnica (1:53–2:32)

- **IMAGEN.** «+ Registrar nuevo lote» → Ficha Técnica. La barra de pasos FT · FT2 · EUDR · VID avanzando. En B2, la
  casilla «No lo sé» se marca. En B4, un video de 30 s grabándose en vertical. Celebración de «¡Ficha completa!».
- **VOZ.** Con la finca lista, registre su lote: el café de una cosecha. La Ficha tiene cuatro pasos. Uno: de qué
  fincas sale, sus variedades y su proceso. Dos: lo que usted sabe de su taza y de su grano. Y si no lo sabe, marque
  «No lo sé»: es una respuesta válida y CTC lo medirá. Tres: la Visa EUDR, que el lote hereda de sus fincas. Cuatro:
  un video corto de su café, hecho con el celular. Al final, declara que la información es veraz.
- **PANTALLA.** FT · FT2 · EUDR · VID · *«No lo sé» también es una respuesta*

### Bloque 5 · El calendario (2:32–2:57)

- **IMAGEN.** El calendario de la landing (dos cosechas) y una línea de tiempo trimestral con la publicación del PVC
  dos meses antes de cada trimestre.
- **VOZ.** ¿Cuándo hay oferta? CTC publica un calendario público. El precio de referencia, el PVC, se fija por
  trimestre y se publica con dos meses de anticipación, para que usted planee. Y una regla clara: se aplica el PVC
  vigente el día de la compra. La publicación anticipada sirve para planear, no para escoger precio.
- **PANTALLA.** *PVC · Ponderación de Valor de Cosecha* · ene–mar · abr–jun · jul–sep · oct–dic ·
  *se publica 2 meses antes* · *aplica el vigente el día de la compra*

### Bloque 6 · La evaluación (2:57–3:39)

- **IMAGEN.** Mensaje «¡Su lote fue declarado APTO…!» → «Evaluar mi Café» → «Instrucciones de envío (2 kg)» → bolsa
  anónima con el código de 7 caracteres dentro de la caja. Mesa de cata: un Q-Grader rompe la costra.
- **VOZ.** CTC no compra nada antes de tener su café en la mesa. Primero revisamos su ficha; cuando el lote queda
  Apto, se lo avisamos en Mensajes y usted solicita la evaluación. Cuesta ochenta mil pesos por lote: análisis físico,
  factor de rendimiento, catación por un Q-Grader certificado e informe escrito. Envíe dos kilos de pergamino marcados
  solo con el código del lote: la cata es a ciegas, nadie sabe de quién es cada taza. Con el pago y la muestra
  confirmados, su lote entra en fila para el siguiente grupo de catación.
- **PANTALLA.** *Evaluación: $80.000 por lote* · *Muestra: 2 kg de pergamino, solo con el código* ·
  *Cata a ciegas · Q-Grader certificado*

### Bloque 7 · El puntaje decide el grado (3:39–4:12)

- **IMAGEN.** Los cinco sellos de grado aparecen en escalera. Tarjeta de «Lotes Galardonados»: Grado CTC, Puntaje
  SCA, Feedback del Q-Grader. Notificación «¡Bienvenido al Kaffetal Club!».
- **VOZ.** El puntaje decide el grado, y no se negocia: Black desde ochenta, Red desde ochenta y dos, Blue desde
  ochenta y cuatro, Gold desde ochenta y seis y Tyrian desde ochenta y ocho. Si su lote gana grado, recibe la hoja del
  catador y su Pasaporte del Kaffetal Club. Si no llega a ochenta, se lleva igual su informe con recomendaciones, y le
  devolvemos el ochenta por ciento de la inscripción.
- **PANTALLA.** Black 80 · Red 82 · Blue 84 · Gold 86 · Tyrian 88 · *Sin grado: informe + 80 % de reembolso*

### Bloque 8 · Dos oportunidades de oferta (4:12–5:08)

- **IMAGEN.** Pantalla dividida en dos tarjetas: **CaaS** y **Cherry Picked**. Sobre Cherry Picked, una escalera de
  tres escalones (0 % · 25 % · 50 %) y la tabla de salida del ejemplo del §12.9 rotulada *«ejemplo»*.
- **VOZ.** Con el grado llega la oferta, y usted escoge entre dos oportunidades.
  La primera, CaaS: CTC le compra el café directamente, al PVC vigente según su grado, y asume el riesgo de venderlo.
  La segunda, Cherry Picked: su lote se ofrece a tostadores del mundo con su nombre y su finca, antes de salir de su
  bodega. Por eso es un compromiso de tres meses: antes de empezar, declara cuántas cargas compromete por mes. El
  primer mes todo queda reservado; el segundo puede liberar una cuarta parte sin costo; el tercero, la mitad. Y si
  necesita retirar más, siempre puede: paga un cuatro por ciento del valor de cada carga por encima de lo libre.
  Antes de firmar, usted ve su tabla de salida completa.
- **PANTALLA.**
  - CaaS · *compra directa · CTC asume el riesgo · PVC vigente × grado*
  - Cherry Picked · *3 meses · mes 1: 0 % · mes 2: 25 % · mes 3: 50 % libre · por encima: 4 % por carga*
  - *Ejemplo: 8 cargas Red · retirar todo: mes 1 $1.040.000 · mes 2 $780.000 · mes 3 $520.000*

### Bloque 9 · Durante el contrato (5:08–5:37)

- **IMAGEN.** Pestaña Contratos: barra de tres meses, liberaciones y lectura de humedad «mes 2: 11,2 % ✓». Una
  papeleta indicadora de humedad dentro de la bolsa.
- **VOZ.** Durante el contrato, usted cuida su café y confirma la humedad cada mes, entre diez y doce por ciento; CTC
  le envía las papeletas indicadoras. Cada liberación y cada pago quedan registrados en su panel. Y no hace falta un
  lote grande: mientras más alto el grado, menor el mínimo. Dos cargas en Blue; en Gold y Tyrian, una carga o menos.
- **PANTALLA.** *Humedad 10–12 %* · *Mínimos: Black y Red 3–4 cargas · Blue 2 · Gold y Tyrian ≤ 1 · 1 carga = 125 kg
  de pergamino*

### Bloque 10 · Reputación y cierre (5:37–5:58)

- **IMAGEN.** Tres barras en un perfil: lotes completados · calidad · confiabilidad. Vuelta al productor en su finca,
  mirando a cámara. Logo y dirección.
- **VOZ.** Cada lote que completa construye su reputación: cuántos lotes, qué calidad y qué tan constante es usted. Se
  pondera, no se acumula: un productor pequeño y constante puede estar arriba. Registre hoy su primera finca, sin
  costo. Porque un precio justo no se promete: se explica.
- **PANTALLA.** *Registre su finca sin costo* · kaffetal-regal.ctcexport.com · *Kaffetal Regal · una iniciativa de CTC*

**Locución: ~780 palabras ≈ 5:40 a 2,3 palabras por segundo; con las pausas de imagen, la pieza dura ≈ 5:58.** Si el montaje queda largo, se recorta primero el bloque 5
(el calendario pasa a solo texto en pantalla, 6 s) y después el bloque 1. **Nunca se recortan** el costo de la
evaluación, la escalera 0/25/50 ni el 4 %.

## 3 · Reglas de lenguaje

| Nunca se dice | Se dice | Por qué |
|---|---|---|
| «Le pagamos el PVC» | «el PVC vigente **según su grado**» | El PVC es la referencia; el grado la multiplica (§9.4) |
| «Compra garantizada» / «le compramos todo» | CaaS: «CTC le compra directamente». Cherry Picked: «su lote se ofrece… usted compromete cargas» | En Cherry Picked la venta es a tostadores; CTC no promete comprar lo no vendido |
| «La evaluación es gratis» | «Registrar la finca y el análisis EUDR: sin costo. La evaluación: $80.000» | Las dos mitades son ciertas y se dicen juntas |
| «Sin letra pequeña», sin decir la cifra | «el 4 % por carga por encima de lo libre» | La cifra de salida se dice antes de que la pregunten |
| «Mejor que la cooperativa» | «Su cooperativa sigue siendo su comprador de todos los días» | CTC no quiere enemistarse con ella |
| «Precio justo» a secas | «Un precio explicado» | «Justo» es opinión; «explicado» se puede verificar |
| «La Arena» como paso de la evaluación | «la evaluación» · «el grupo de catación» | Desde V5.17 la Arena es **vitrina opcional** después del galardón |
| «Comercio directo» · «Fairtrade» · «ingreso vital» | — | Hay intermediación declarada; no son sellos propios |
| Cacao como producto | (solo como nota de cata) | Vocabulario congelado |

## 4 · Verificación de afirmaciones

✅ vive hoy en la plataforma · 🟡 decidido (§12), sin construir · 🔴 lo publicado hoy dice otra cosa

| Afirmación | Fuente | Estado |
|---|---|---|
| Cuenta gratis, correo o Google | `LoginModal.tsx`, `auth/callback` | ✅ (Google: línea del redirect-allowlist pendiente en el charter) |
| Cinco botones del panel | `panel/panelTabs.ts` | ✅ |
| «Estoy aquí», área del polígono, altura del mapa | `FincaModal.tsx`, `lib/geo/` | ✅ |
| Más de 4 ha → polígono; corte 31-dic-2020 | `lib/eudr.ts`, `faq.ts` | ✅ |
| Todo se guarda mientras escribe | `useAutosave.tsx` (fincas ya creadas y Ficha) | ✅ (la finca **nueva** se guarda con el botón la primera vez) |
| Análisis EUDR gratis como «primer resultado» | charter · decisión CEO | 🟡 La Visa existe y no se cobra, pero **no hay plazo** y **aprobar la finca no avisa al productor** (`approveFinca`) |
| Ficha en cuatro pasos, «No lo sé» válido, video corto | `FichaView.tsx`, `PaneB1–B4` | ✅ (B4 dice 30 s; el FAQ dice «1 a 2 minutos» 🔴) |
| El lote hereda la Visa de sus fincas | `eudr.ts:211-235` | ✅ |
| PVC trimestral, público, dos meses antes, aplica el vigente | `PVC_BCP_PLAN.md` §12.8 | 🟡 La edición vigente va del 15-sep al 15-dic (no es trimestre exacto); no hay calendario PVC en KR |
| «No se compra nada antes de la muestra» | §12 · ofertas solo a galardonados (`ofertasActions.ts`) | ✅ en ofertas · 🔴 «El trato» y el FAQ prometen **comprar 15 kg de entrada** |
| Apto avisado en Mensajes | `markLotApto` | ✅ |
| Evaluación $80.000 por lote | `inscriptions.ts:16-20`, FAQ, `PorQueSection` | ✅ la cifra · 🔴 **no se puede pagar**: Nequi vacío, el panel manda a info@; Zulu en evaluación |
| Muestra de 2 kg solo con el código, cata a ciegas | `shipmentInstructionsPrint.ts` | ✅ (la etiqueta impresa aún dice «No abrir antes de la Arena») |
| Envío de la muestra por cuenta del productor | `faq.ts:70` | ✅ (el guion no lo promete gratis; ver §5) |
| Pago + muestra → fila → grupo de catación | `nominadosActions.ts` | ✅ (sin plazos publicados; la entrada en fila y el bache no avisan) |
| Bandas 80 · 82 · 84 · 86 · 88; el puntaje manda | `lib/grados/definicion.ts` | ✅ (los PDF PVC v2.1.1 usan 80/84/86/88/89: **superados**, manda `definicion.ts`) |
| Pasaporte del Club con el galardón | `lib/arena/club.ts` | ✅ |
| Sin grado: informe + 80 % de reembolso | `recordEvaluationVerdict` (:647, :670) | ✅ en código · el reembolso depende de un medio de pago |
| Oportunidad CaaS (compra directa, PVC vigente × grado) | §12.9 | 🟡 **No existe**: no hay oferta `directa`; los precios se escriben a mano en COP/kg sin PVC |
| Cherry Picked: 3 meses, cargas por mes, 0/25/50, 4 % | §12.9, `lib/pvc/compromiso.ts` | 🟡 El cálculo existe y lo fija `qa-pvc-compromiso` · 🔴 **el contrato real libera 50/75/100 sin penalización** (`contractActions.ts:14-18`) y «El trato» lo publica así |
| Tabla de salida visible antes de firmar | charter (pendiente) | 🟡 Solo la ve el BCP (pestaña Lectura) |
| Humedad mensual 10–12 %, papeletas de CTC | `TratoSection.tsx`, `recordHumidityReading` | ✅ (la landing dice «~10–11,5 %»: unificar) |
| Liberaciones y pagos registrados en el panel | `ContratosTab.tsx` | ✅ |
| Mínimos en cargas por grado | §12.6 | 🟡 Oferta y contrato van en kg; «El trato» promete Black de «2,5–4 toneladas» 🔴 |
| Reputación ponderada (tríada) | charter · §12 | 🟡 Sin fórmula, pesos ni beneficios (§12.11) |
| Tyrian en subasta (no se dice en la locución) | `ContratosTab` · §12.7 | ✅ la subasta existe · 🟡 bid sobre FOB puerto Colombia |

## 5 · Decisiones del owner que bloquean el corte final

1. **Evaluación: $80.000, contra $200.000 con descuentos y envío gratis** (PVC-D7/D8 v2.1.1). El guion usa $80.000
   porque es lo publicado y lo que cobra el código. ¿Se mantiene? ¿Quién paga el envío de la muestra?
2. **El reembolso del 80 % cuando no hay grado** (código) frente a «el informe es suyo aunque el café no entre, sin
   reembolso» (D7). ¿Se dice en el video?
3. **La compra inicial.** «El trato» y el FAQ: 15 kg de entrada. PVC-D7: la primera carga el día que acepta, pagada en
   dos días hábiles. §12: nada antes de la muestra; CaaS compra en firme. ¿Qué queda? El guion no menciona ninguna.
4. **Plazos que el productor preguntará y que no existen en ningún lado**: cuánto tarda la revisión de la Visa, el
   Apto, el resultado de la catación (D7 decía cinco días hábiles) y **el pago tras cada entrega** (D7 decía dos días
   hábiles con 0,5 % por día de retraso). El guion **no promete ningún plazo** hasta que el owner los fije; si se fijan,
   entran en los bloques 3, 6 y 9 (+10 s).
5. **¿Se dicen los multiplicadores por grado** (×1,15 · 1,30 · 1,60 · 2,00) y el reparto de la subasta Tyrian
   (80/20)? Están decididos (§9.4) pero ninguna oferta los aplica todavía. Hoy el guion dice «PVC vigente según su
   grado», sin números.
6. **Cherry Picked para el productor, en dos detalles de §12.9**: «retenido al menos un mes para activarse» (¿se dice?)
   y si la base del 4 % es «PVC × multiplicador» (así lo calcula `compromiso.ts`) o otra.
7. **Marca «Kaffetal» ante la SIC** antes de rodar con el nombre en pantalla.
8. **Alinear PVC-F4-2026 a trimestre exacto** (§12.11 n.º 8). Sin eso, el bloque 5 describe un calendario que la
   edición vigente no cumple.

## 6 · Lo que hay que corregir en la plataforma antes de publicar

Un video que contradice la landing en la que se reproduce hace más daño que no tener video.

**De `kaffetal-regal` (este componente, una tanda propia cuando el owner cierre §5):**

- `TratoSection.tsx`: la escalera 400 → 200 → 100 kg, «compra de entrada 15 kg», «pago completo al final del mes 3»,
  Black «2,5–4 toneladas» y la humedad «~10–11,5 %».
- `faq.ts`, en tres idiomas:
  - n.º 4 y 5: opción de compra, 15 kg y liberación parcial;
  - n.º 1, 2 y 9: la Arena como paso de catación;
  - n.º 2: videos de 1–2 min;
  - n.º 6: «abril–julio y agosto–marzo»;
  - n.º 11: «la certificación CTC es gratuita para todos los inscritos».
- `OportunidadSection.tsx`: los índices base 100 (105–110 … 150–200) no cuadran con los multiplicadores del PVC.
- `BienvenidosSection.tsx`: el paso 5 «Recibe una oferta fija de temporada» pasa a hablar de dos oportunidades.
- **Vocabulario «Arena»** en la evaluación: `LoginModal.tsx:85`, `FichaView.tsx:583`, `PerfilTab.tsx:171`, la etiqueta
  impresa «No abrir antes de la Arena», y «Envío de muestras» como módulo inexistente en
  `ShipmentInstructionsModal.tsx:26`.

**De `consolas` (anotado en ALINEACIÓN §3b, con dueño: la fila del 2026-09-16 sobre el trato y los avisos, más «La
oferta en dos caminos» y «Modelo v2.2.0»):**

- La escalera real del contrato (`contractActions.ts`, 50/75/100) frente a §12.9 (0/25/50 + 4 %).
- Ofertas calculadas desde el PVC y la oferta CaaS `directa`.
- Cargas en lugar de kg.
- Avisos al productor en los pasos que hoy no avisan: finca aprobada o rechazada, muestra recibida, entrada al grupo de
  catación y firma del contrato.

## 7 · Producción

- **Capturas.** Con `prueba-*` en `kaffetal-regal.ctcexport.com`, en celular vertical, sobre la versión **ya corregida**
  (§6). Las capturas de la Visa, la oferta y el contrato requieren que el OCP lleve el lote de prueba hasta esos
  estados. Si alguna pantalla del §12 no existe al rodar, se muestra un **mock rotulado «ejemplo»**, nunca una pantalla
  inventada sin rótulo.
- **Rodaje.** Un día de finca (patio, cafetal con GPS, empaque de la muestra) y medio día de mesa de cata con el
  Q-Grader. Productor real solo con consentimiento escrito de imagen y nombre.
- **Gráficos.** La escalera de cinco grados con los sellos de `public/images/shared/grados/`; la escalera 0/25/50 y la
  tabla de salida **exportadas de `compromiso.ts`** (las cifras del ejemplo son las que reproduce `qa-pvc-compromiso`).
- **Entregables.**
  - Pieza de ≈ 5:58 en 16:9 y 9:16, locución ES, subtítulos ES/EN/DE (`.srt`).
  - Cortes derivados:
    - 60 s: bloques 0, 6, 8 y 10;
    - 30 s: bloques 0, 8 y cierre, para WhatsApp y redes.
  - Transcripción al repo junto al id de YouTube nuevo, para que la próxima sesión no vuelva a buscarla.
