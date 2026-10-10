# Registro de versiones · CTC Web Platform

El informe **estándar** de qué trajo cada versión de la plataforma — la vista de consulta rápida,
paralela a la narrativa de `docs/architecture/Log_Documentacion_Interactiva_V*.txt` (que existe para
compilar el mapa interactivo, no para buscar «¿qué trajo la V4.42?»).

**El contrato** (2026-08-19, y lo vigila `scripts/qa-changelog-check.mjs`):

- **Una entrada por `APP_VERSION`**, escrita **en el mismo commit que sube la versión** — la misma
  disciplina que ya rige el bump de `src/lib/version.ts`. El guardián falla si la versión de la
  insignia no tiene entrada aquí.
- Formato de cabecera: `## [VN.N] — AAAA-MM-DD (commit sha)`. El sha se sella en cuanto existe
  (`pendiente` solo puede decirlo la entrada de arriba).
- Cada viñeta empieza por su categoría: **Hito** · **Añadido** · **Cambiado** · **Corregido** ·
  **Retirado** · **Seguridad** · **Datos** · **Docs**.
- Al cerrar un Version Wrap, el ciclo queda estampado con el snapshot del mapa que lo compiló.
- La historia anterior a la V4.27 no se reconstruyó: vive en los logs sellados de
  `docs/architecture/` y en el historial de git. Este archivo empieza donde empieza el ciclo V5.

---

## [V6.0] — 2026-10-10 (commit 1130833)

> **Wrap V48** (2026-10-10): ciclo compilado en `Documentacion_Interactiva_V48.0(f21b327).html` — 45 nodos (+3) · 208 fichas (+33) · 82 trazas (+14, y unas 25 reescritas sobre su sucesor) · 135 wires (+27) · 42 CTX (+4) · 666 ANN (+191) · Postgres 144 tablas. Ciento doce asientos (V5.93–V6.0), compilados en siete lotes con dueño exclusivo y un verificador cada uno; tres nodos nuevos (el OCP, el Dossier, la Coffee Datasheet Tool); el renderizador ya no pinta «undefined» en las ANN de un solo tag. La auditoría documental salió antes, en el commit de docs 95ef547.

- **Hito**: **V6.0** — el owner cierra el sprint de desarrollo («quiero cerrar este largo sprint de desarrollo para llevar todo el
  sistema a la V6.0») y deja el terreno para tres objetivos de mejora, cada uno con su plan y su prompt de arranque:
  **(1)** las landing pages con la narrativa y los conceptos vigentes, **(2)** el Triage y el Catálogo Activo, **(3)** el login de
  Cherry Picked (UI/UX y contenido). Desde la V5.92 (V47 del mapa) la plataforma ganó: el Centro de Calidad con su informe, la
  equivalencia CVA ↔ SCA 2004 con el CVA como protocolo principal (V5.189) y el grado por El Punto y la Tríada; ofertas ancladas al
  PVC con firma y contrato provisional; los Ciclos de Cherry Picked por ventanas (venta semanal, baches, despachos, 60/40, flete) con
  la vigilancia y el agente del PVC; el Stock CTCx, el Triage de Catálogo Activo con su FOB mínimo y Adquisición de Stock Café; el
  Dossier CTCx y el Dossier público con su vitrina, Find my Lot por `CTC-L-` y la regla de que nada público lleve al productor.
- **Docs**: `docs/PLAN_V6_OBJETIVOS.md` (estado de partida, incongruencias por tema, tandas y las decisiones del owner que las
  condicionan); `docs/KICKOFF.md` con la sección «Objetivos V6»; `ALINEACION.md` con los contratos «Lo público del lote» y «El
  calendario de los Ciclos», §3b al día y los tres objetivos con dueño; los trece charters reconciliados con §3; AGENTS y HANDOFF en
  la V6.0 (144 tablas base y 7 vistas, 77 guardianes, los planes en vigor).

## [V5.203] — 2026-10-10 (commit 46323af)

- **Corregido**: **«CTCx Compras» (Adquisición de Stock Café, `/ocp/compras`) se caía cada vez que se abría** desde la primera compra
  (owner: «no parece estar funcionando bien»): `stock_partidas.compra_id` es único y PostgREST devuelve un objeto, no una lista
  (`a.stock_partidas.find is not a function`, en los registros de Vercel). Normalizado en todo el OCP, y el OCP tiene por fin un
  `error.tsx` (un tablero que falla ya no tumba la consola). Además: una compra «solo stock» ya no marca el lote como CTCx Selection
  en `/ocp/kr` (una sola regla, `lib/compras/selection.ts`); la nota al productor depende del destino; no se aceptan fechas futuras;
  «Es de» no cambia en una mezcla viva, en un saco de trato ni con café declarado; el precio ya no dice «PVC PVC-»; ubicar una
  compra ubica su partida; los fallos al registrar la compra de un saco o de un mes ya no se tragan.
- **Añadido**: **anular una compra** a mano (con su partida, en la misma transacción: `compra_anular`; columnas `anulada_*` y guards
  en la base) y **«Reintentar la compra»** en la ficha del contrato cuando un despacho o un mes quedó sin su compra (aviso fijo
  derivado de los datos; `compras.despacho_id`). Al quitar la última compra Selection de un lote que sale en la vitrina, o al
  registrar una en un lote que ya sale, la pantalla pide confirmar qué cambia en lo público.
- **Cambiado**: **Adquisición rehecha** (pestañas Por recibir · Compras · Mezclas; «Por recibir» con los sacos de los tratos por
  ventana y su plazo; tabla compacta con el origen legible, «Es de», la partida y el siguiente paso; formulario a mano plegado, sin
  destino por defecto y con aviso de trato vivo) y **el circuito como uno**: una franja común (Por recibir → En stock → Por declarar
  en kg de verde → En el Catálogo Activo) arriba de Adquisición, Stock CTCx, Triage, CTCx Selection y Catálogo Activo; el Triage
  abre una entrada por enlace (`?partida=`, `?contrato=`), dice de dónde viene cada partida y qué queda fuera; CTCx Selection lee el
  stock real; el disponible en pantalla resta lo declarado, como la base.
- **Seguridad**: **la imagen de CTCx Selection** sube a un bucket privado de staging con nombre aleatorio y el servidor la publica
  re-codificada (sin EXIF/GPS); el bucket público ya no se puede listar y solo admite WebP; al dejar de ser Selection, su imagen se
  borra.
- **Datos**: migraciones `2026-10-10_compras_anulacion` y `2026-10-10_ctcx_selection_imagenes` aplicadas.
- **Seguridad**: guardianes `qa-compras` (190), `qa-stock-ctcx` (79), `qa-triage-catalogo` (61) y `qa-circuito` (60); 39 mutaciones,
  todas atrapadas.

## [V5.202] — 2026-10-10 (commit f012665)

- **Seguridad**: **lo público del lote ya no lleva al productor** (owner, 2026-10-10: el Dossier público «necesita mantener el
  Watermark y omitir info que haga fácil circumventar a CTCx para llegar al Productor»). La auditoría del día encontró que un
  anónimo llegaba al productor en dos pasos: veía la finca y el municipio (en la vista que lee `anon` por REST, la tarjeta de la
  cinta, el título y la descripción de la página —también al compartir el enlace—, el pie de la foto del Dossier) y los 6 lotes
  llevaban la finca o el municipio en su nombre. Ahora el **nombre público se genera** (variedades canónicas + proceso base ·
  departamento + año: «Castillo Lavado · Santander 2026»; lo que escribió el productor y no está en la lista canónica no sale) en
  `public_lot_vitrina`, `public_lot_catalog` (la tienda) y `place_order` (el pedido), con una sola función SQL
  (`nombre_publico_lote`); `finca_name` y `municipio` quedan a `null` en las dos vistas (se borran en una limpieza futura); el
  Dossier público pierde la historia y las características de la finca (texto libre), su foto de perfil, el área y la
  infraestructura que delata canal propio (tostadora, molino, empacadora, vacío); la altitud sale en tramos de 100 m; el mapa
  regional se centra por el nombre del departamento, sin coordenadas; la subasta Tyrian sin sesión ya no enseña la finca.
- **Añadido**: **las fotos del lote solo salen si CTCx las aprueba** (tabla `lot_fotos_publicas`; en la vista del lote de
  `/ocp/kr`, «Pública en la vitrina: sí/no», clase emite, con rastro): la revisión encontró una cara en primer plano y a una persona
  junto a una casa. Hasta aprobar, la tarjeta y el Dossier pintan el sello del grado. El productor ve al subir sus fotos B4 el
  consejo «sin personas reconocibles, letreros, logos ni datos de contacto».
- **Añadido**: **marca de agua pública** en cada sección del Dossier público («CTCx Public Catalogue · CTC-L-… · Se compra solo a
  través de CTCx · ctcexport.com · fecha»), en mosaico SVG que cubre cualquier alto; no nombra a nadie. La tarjeta de la cinta
  pinta la referencia bajo el nombre (dos lotes pueden llamarse igual).
- **Retirado**: el logotipo completo grande y el loop de íconos de los pies de Kaffetal Regal y Cherry Picked Green (owner: «quítalos
  también allí»; como el pie de CTC Home en la V5.201).
- **Seguridad**: `public_lot_catalog` queda de solo lectura para `anon`/`authenticated` (tenía todos los privilegios); una foto que
  falla en público ya no devuelve la URL firmada del original (con EXIF); la caché de la foto pública baja a 10 minutos.
- **Datos**: migraciones `2026-10-10_fotos_publicas` y `2026-10-10_vitrina_sin_finca` aplicadas (con `compras_anulacion` de la V5.203
  antes, que sus vistas leen). Verificado con SQL: los 6 lotes salen con su nombre generado, sin finca ni municipio, sin foto.
- **Seguridad**: guardianes `qa-ficha-publica` (82), `qa-sneak-peek` (146, compara fila a fila la lista de variedades de SQL con la
  de TS), `qa-catalogo-publico` (157), `qa-subastas` (35) y `qa-centro-calidad` (313); 57 mutaciones, todas atrapadas.

## [V5.201] — 2026-10-10 (commit 742536f)

- **Cambiado**: el **gráfico de «Contexto · Por qué ahora»** de la portada de CTC (owner, 2026-10-10). El nombre de cada ola va
  PEGADO a su cima, en una píldora de su color unida por un hilo a su punto numerado (antes flotaban a media altura y el de la 4.ª
  se leía como el rótulo de la flecha roja); la **línea del valor de la identidad** corre por encima de los cuatro nombres y lleva
  su rótulo en la punta, con su muestra punteada y un ícono de información: es un botón que abre una explicación breve de qué es
  el valor de la identidad (ES · EN · DE). El **tiempo** pasó de la esquina de arriba a un eje de lado a lado al pie del gráfico,
  con su nombre abajo a la izquierda. La geometría está calculada para que la línea pase limpia sobre los nombres también en el
  ancho mínimo del lienzo (600 px, el móvil), donde los nombres se achican un poco (consulta de contenedor).
- **Cambiado**: el **carrusel del Catálogo Activo** (CTC, KR y la familia CP) en una **pantalla táctil**: sigue andando solo de
  izquierda a derecha, pero tocarlo —arrastrarlo, abrir una tarjeta, pulsar una flecha— lo pone en manual: sigue al dedo de lado a
  lado, se desliza con inercia al soltarlo con impulso, y a los **20 s sin tocarlo** vuelve a andar solo, sin salto. Bajar por la
  página pasando el dedo por encima no lo detiene (`touch-action: pan-y`), un arrastre que acaba sobre una tarjeta no la abre, y en
  táctil cada flecha desliza la cinta una tarjeta hacia su lado. Con ratón no cambia nada: las flechas aceleran al pasar por encima
  (ahora SOLO el ratón y el foco de teclado: el toque de un dedo las dejaba «encima» y la cinta se quedaba acelerando).
- **Cambiado**: el **Dossier público** (el que abre el carrusel, `/ctcx-public-catalogue/CTC-L-…`) **ya no se imprime ni se guarda
  en PDF**: sin el botón, y si alguien imprime desde el navegador sale solo el aviso de que se consulta en línea, con su dirección.
  Y es un **HTML continuo**: una sola columna de papel con las secciones una tras otra (cada una con su número, su nombre y su
  ancla; sin cabecera ni pie por hoja; la línea legal va una vez, al final), el índice de la portada lleva a cada sección, y un
  botón fijo abajo («Contenido · la sección en curso») abre la lista de sus titulares y lleva a cada uno. El Dossier del productor
  sigue en hojas A4, con su botón de imprimir y su blindaje.
- **Cambiado**: en el móvil, los bloques de **«CTC Value Ecosystem»** de la portada de CTC van de dos en dos.
- **Añadido**: una señal **«Click me»** («Haz clic» · «Klick mich») en el calendario del año (CTC, Kaffetal Regal y Cherry Picked)
  para que se vea que las barras se abren; late suave y se va con la primera etapa abierta. Con el año entero a la vista va en el
  hueco de julio a diciembre de la mitaca; cuando el año se desliza (el móvil), junto a la pista de arriba, señalando hacia abajo.
- **Retirado**: el logotipo grande sobre plato claro que cerraba el pie de la portada de CTC (la marca sigue en la cabecera, en la
  primera línea del pie y en la barra legal).
- **Seguridad**: `qa-sneak-peek` (+9: el dedo, la inercia, los 20 s, el gesto vertical que no la para, las flechas solo de ratón o
  teclado), `qa-ficha-publica` (+5: el documento continuo, sin imprimir, la navegación de abajo; el del productor intacto) y
  `qa-catalogo-publico` (la marca de CTCx en la portada del Dossier público). Probado con mutaciones: las nueve muerden.

## [V5.200] — 2026-10-10 (commit 3795a92)

- **Corregido**: el **ticker de noticias de la portada de CTC** mostraba temas que no son del café (owner, 2026-10-10). La causa: tomaba
  los tres últimos titulares de cada medio aprobado SIN el filtro de café que sí usa la Redacción de Coffeed, y desde el 2026-08-20 la
  lista blanca incluye medios generalistas (El Espectador, El Tiempo · Economía, La República · Globoeconomía, Agronegocios): su
  portada entraba entera. Ahora un medio generalista solo da sus titulares del café; los medios 100 % cafeteros (Daily Coffee News,
  Global Coffee Report, Perfect Daily Grind, SCA News) siguen enteros. Probado con los titulares reales del día: de los cuatro
  generalistas solo pasaron las dos noticias cafeteras de Agronegocios.
- **Añadido**: `esTitularDelCafe` (`lib/coffeed/feeds.ts`): para un titular que se publica sin mirada humana, además del filtro de la
  Redacción, una palabra que SOLO hable de café y entera («una economía robusta», «la cosecha de arroz», «Cafesalud» o «cafetería» no
  pasan).
- **Seguridad**: `qa-redaccion` (+5): titulares reales que deben pasar y que no, y que el ticker lea las palabras clave y aplique los
  dos filtros antes de cortar.

## [V5.199] — 2026-10-10 (commit 57d8d46)

- **Añadido**: **«Find my Lot» en las páginas de CTC, Kaffetal Regal y Cherry Picked** (owner, 2026-10-10): el pie del bloque del
  Catálogo Activo lleva el acceso al portal y, al lado, el campo con **«CTC-L-» fijo** donde se escriben solo los ocho caracteres;
  la flecha lleva al Dossier público del lote. Si todavía no hay tarjetas que enseñar, el bloque se queda solo con «Find my Lot».
- **Cambiado**: el buscador del **CTCx Public Catalogue** pide la referencia del lote con el prefijo fijo (pegar la referencia
  entera, con minúsculas o guiones, también vale) y **encuentra los lotes que llegaron al Triage**, estén o no declarados todavía; la
  portada del portal lo dice así en los tres idiomas.
- **Añadido**: una referencia que no lleva a un lote pinta **«No encontramos ese lote»** con el buscador y las puertas del portal (la
  página genérica del framework, en inglés y sin salida, ya no se ve); sigue respondiendo 404.
- **Seguridad**: `qa-catalogo-publico` (147: el campo que se queda con los ocho caracteres, «Find my Lot» en el pie de la cinta en
  las tres familias, el buscador sin el código viejo, la portada y la página de «no encontrado») y `qa-sneak-peek` (116) al día.

## [V5.198] — 2026-10-10 (commit 00b518d)

- **Cambiado**: el **bloque del Catálogo Activo** de CTC, Kaffetal Regal y la familia Cherry Picked enseña los **lotes reales** que
  llegaron al Triage de Catálogo Activo (un trato por ventana vigente, una declaración viva o una partida libre del Stock CTCx), los
  más recientes primero (owner, 2026-10-10). Cada tarjeta lleva la foto de la finca o del lote, el Punto con su protocolo (CVA), las
  notas que marcó el Q-Grader y, si aún no está declarado en el catálogo, «Próximamente». En el reverso, la **telaraña de 8 esquinas
  del CVA**, las notas con su ícono y su intensidad, y el botón al Dossier público.
- **Añadido**: el **Dossier público** del lote en el CTCx Public Catalogue (`/ctcx-public-catalogue/CTC-L-XXXXXXXX`), una versión
  simplificada del Dossier que **reemplaza a la ficha técnica**: portada, origen por región, perfil de taza, grado, análisis físico
  y respaldo (con la lectura del perfil). Sin la Visa ni el Pasaporte EUDR ni sus enlaces, sin el productor, sin las coordenadas ni
  el mapa de los cafetales (el mapa regional lleva el pin a un decimal, ~11 km), sin lo que el productor declaró, sin las
  anotaciones de mejora ni las conjeturas, sin el número de cada certificado y sin marca de agua; se puede imprimir. En español e
  inglés, con la vuelta a «Find my Lot».
- **Cambiado**: la dirección pública de un lote es su **referencia** `CTC-L-XXXXXXXX` (la que ya lleva en el paquete de muestra y en
  el Dossier). Un código viejo `CTCX-…` y una referencia mal escrita redirigen con 308; la ficha técnica vieja
  (`/docs/ficha/[lotId]`) redirige al Dossier público; el QR del Dossier del productor lleva allí cuando el lote está en la vitrina.
- **Retirado**: los siete lotes **mock** de la temporada anterior (`sneakPeekMock.ts`, sus fotos, sus ruedas y sus fichas en PDF, y
  los generadores `build-fichas-mock`, `build-ruedas-mock` y `analisis-intrinseco`), el paquete público (`PaquetePublico.tsx`), la
  proyección de la ficha (`fichaPublica.ts`) y la telaraña de diez atributos SCA de la tarjeta (`RadarIntrinseco.tsx`).
- **Datos**: vista nueva `public_lot_vitrina` (la lee `anon`, solo en lectura): los lotes del Triage con sus columnas de exhibición;
  del `datasheet` solo el nombre del producto y la bandera de la foto; un lote de CTCx Selection no devuelve su finca ni su foto.
  La foto de la tarjeta la sirve `/api/catalogo/foto/[referencia]` pasando por esa vista (recortada a 3:2 en WebP, nunca la URL
  firmada).
- **Seguridad**: el Dossier público es una **lista blanca** (`lib/kaffetal/dossierPublico.ts`) y lo carga el service role SOLO
  después de la vista. `qa-ficha-publica` reescrito (28: un dossier lleno de centinelas, ninguno privado sobrevive; dos mutaciones
  muerden), `qa-sneak-peek` reescrito (117: la vista, los mock retirados, el reverso nuevo), `qa-catalogo-publico` (133: la
  referencia carácter a carácter, la página nueva) y `qa-compras` (107) al día.

## [V5.197] — 2026-10-10 (commit d80e49d)

- **Cambiado**: el **Perfil de taza del Dossier del lote** (owner, 2026-10-10): la evaluación afectiva del CVA es ahora una
  **telaraña de 8 esquinas** (octógono de cara plana, de 1 en el centro a 9 en el borde, el 5 «ni alta ni baja» punteado y el valor
  junto a cada atributo); las barras salieron. Al lado, el total del CVA con sus tazas y si es el Punto que rige el grado. Un lote
  evaluado en SCA 2004 conserva su radar de diez atributos.
- **Añadido**: la **evaluación descriptiva con íconos**. Cada nota de la rueda lleva su ícono en el tinte de su familia, lo que el
  Q-Grader escribió de ella («Albaricoque», «Panela»), de dónde cuelga en la rueda y en qué etapa se percibió, y su intensidad de 0 a
  15 en quince casillas que separan las zonas baja, media y alta. La acidez (dulce o seca) y la sensación en boca (por textura) tienen
  su ícono, su intensidad y la nota del catador. Hasta siete notas van junto a la rueda; con más, la lista pasa a dos columnas.
- **Añadido**: `src/components/catacion/IconosDeSabor.tsx`, un ícono por cada punto de la rueda del sabor (9 familias, 22
  subcategorías, 85 notas) y por cada opción del formato descriptivo, en el trazo de lucide (los de lucide cuando existen; el resto
  dibujado aquí: fresa, mora, arándano, durazno, chocolate, miel, canela, anís…). Puro: lo pinta igual el servidor que el cliente.
- **Corregido**: la hoja decía «los diez atributos del formulario SCA 2004» aunque desde la V5.189 rige el CVA, y el comentario del
  Q-Grader en cada nota de la rueda no salía en el dossier.
- **Seguridad**: `qa-centro-calidad` (+8, 313): cada punto de la rueda con su ícono explícito y sin claves sueltas, las cifras nuevas,
  la telaraña y la descriptiva. Dos mutaciones (un ícono que falta, la escala del CVA): las dos muerden.

## [V5.196] — 2026-10-09 (commit c9ae72d)

- **Hito**: **«Ofertas CP Aceptadas» es el Triage de Catálogo Activo** (owner, 2026-10-09; tanda C de `docs/PLAN_TRIAGE_CATALOGO.md`):
  el punto de control entre lo que los productores aceptaron, lo que está físicamente en CTCx y lo que se ofrece. Recibe las dos
  entradas —los tratos por ventana vigentes (lo declarado menos lo retirado, en kg de CPS) y las partidas libres del Stock CTCx—, y
  cada una se corrige o se acepta y se declara en el Catálogo Activo con su **FOB mínimo** = (café + Empacado hasta FOB) × (1 + O&P de
  CTCx), en COP y en US$ por kg de verde, desglosado en vivo. Al lado, exhibido y sin gobernar, el N2 de su banda en el PVC vigente.
- **Añadido**: el **ancla** de cada lote: el mayor FOB mínimo de sus declaraciones. El precio de venta **no puede bajar de ella** (lo
  cuida la base) y, si una declaración nueva lo deja por debajo, sube solo al ancla redondeada a US$ 0,05. Declarar el primer café de
  un lote crea su listado y lo publica (con su código público), con la bolsa del modelo (6 kg) y el MOQ de su banda.
- **Añadido**: los **ajustes del triage** —el O&P de CTCx y la trilla por defecto—, que escribe un colaborador con nivel para emitir y
  que viven SOLO en la base (`platform_settings`); cada declaración guarda los suyos.
- **Cambiado**: el **listado lo gobiernan las declaraciones**: `total_kg` son kg de **verde** declarados (hasta aquí eran kg de CPS
  copiados 1:1). Un retiro del productor o un contrato cancelado ya no tocan el listado: el Triage marca en rojo lo «declarado de más» o
  el «contrato no vigente», y CTCx lo corrige (corregir = retirar y declarar en una sola operación). Sin declaraciones vivas, el listado
  se archiva.
- **Cambiado**: el **Catálogo Activo** ya no publica a mano: enseña cada listado con sus entradas y su ancla, edita lo comercial
  (precio ≥ ancla, unidad, MOQ, depósito, llegada, modalidad, crédito de transparencia) y archiva lo que no tiene entradas. «Oferta desde
  CTCx Selection» y el detalle de un contrato mandan a declarar en el Triage; la lista de contratos por estado vive en
  `/ocp/contratos/lista` (un enlace viejo con `?status=` llega allí).
- **Retirado**: `publishLot` (kg de CPS 1:1 y precio tecleado sin costo ni FOB), `sincronizarListado`, `totalEnVentaPorVentanas` y el
  trigger `contract_releases_sync_listing_total` con su función.
- **Corregido**: un valor por defecto con tres decimales en una casilla («597.444») se leía como miles (597 444) en el Stock CTCx, el
  Empacado hasta FOB y el Triage: los valores por defecto se escriben ahora con coma decimal.
- **Datos**: tabla nueva `catalogo_fuentes` (CF-AAAA-NNNN: cada declaración con su cuenta congelada; una viva por contrato y por
  partida; se retira, no se edita); funciones `triage_declarar`, `triage_retirar`, `triage_recalcular_listado`, `triage_ancla_usd`,
  `contrato_base_kg`; la compuerta `guard_listing_ancla`. El FOB mínimo NO es una columna de `lot_listings` (esa tabla la lee
  cualquiera). El Stock CTCx descuenta lo declarado; el borrado nuclear suma su séptimo bloqueo. Probado en la base de producción con
  uno de los contratos reales dentro de transacciones revertidas; ninguna fila quedó.
- **Seguridad**: guardián nuevo `qa-triage-catalogo` (46: la cuenta con un O&P ficticio, la base, la confidencialidad del O&P, las
  acciones, las pantallas; siete mutaciones, todas muerden). Puestos al día: `qa-compras` 109, `qa-ciclos` 146. La batería pasa a 72.

## [V5.195] — 2026-10-09 (commit f520178)

- **Añadido**: **el Stock CTCx** (OCP · Manejo de Stock Físico, `/ocp/stock`; owner, 2026-10-09; tanda B de
  `docs/PLAN_TRIAGE_CATALOGO.md`): el café que está físicamente en CTCx en **partidas** de pergamino, verde, tostado o empacado
  (`SX-AAAA-NNNN`), cada una con su lote, sus kg, su costo por kg, su ubicación y a cuántos kg de su estado de origen **equivale**.
  Se **transforma** —trilla (pergamino → verde), tostión (verde → tostado), empaque (pergamino, verde o tostado → empacado)— partiendo
  una madre en una o varias hijas, y cada transformación (`TR-AAAA-NNNN`) **cuadra**: lo que entra = las hijas + la merma de humedad +
  los residuos + las pérdidas (± 0,01 kg). Las hijas absorben el costo de lo que entró más el de la operación; su equivalencia carga
  la humedad y los residuos (las pérdidas quedan aparte). Las salidas —venta, consumo interno, ajuste— llevan motivo; nada se borra,
  todo se anula con motivo.
- **Añadido**: **el linaje interactivo**, como lo dibujó el owner: cada familia (el café tal como entró y todo lo que salió de él) en
  cuatro columnas de colores con curvas de la madre a las hijas; pasar el cursor por una caja enciende su camino (de dónde viene, a
  dónde fue) y un clic abre la partida para trillarla, tostarla, empacarla, darle salida o ubicarla, con el cuadre en vivo, la
  propuesta de reparto y el costo y la equivalencia que tendrán las hijas. Debajo de cada familia, **el cuadre**: cada kilo de la
  raíz en una cubeta (lo que sigue por estado, lo que salió, la humedad, los residuos, las pérdidas), en masa y en equivalente.
- **Cambiado**: el café **entra solo** al Stock CTCx: al **recibir** un despacho de un trato (saco, adelanto y también lo vendido, que
  entra **comprometido**: no surte kits ni se declarará al catálogo; una devolución no entra), al **pagar** el mes de una compra en
  firme y al registrar una **compra a mano** que ya llegó; la que se registró antes de llegar entra con «Entrar al stock» desde
  Adquisición. Y a mano, con nota, desde el propio Stock CTCx.
- **Cambiado**: **los Sample Kits se arman con partidas** del Stock CTCx —verde (o empacado de verde) para CP y Plus, pergamino para
  Max— y viven como su segunda pestaña (`/ocp/stock/sample-kits`; la URL vieja va con un 308). Lo que un kit armado tiene queda
  reservado en su partida; al **enviarse**, sale del stock (lo escribe la base); al anular un kit enviado, vuelve.
- **Cambiado**: una compra es **de CTCx Selection o solo de stock** (`compras.destino` = `selection` · `stock`; hasta aquí
  `sample_kits`); la entrada del rail pasa a llamarse «Adquisición de Stock Café» y le sigue «Stock CTCx»; «Stock de Sample Kits» sale
  del grupo Catálogo.
- **Corregido**: `public_lot_catalog.ctc_selection` contaba **cualquier** compra: un saco recibido por un trato por ventanas convertía
  el lote en CTCx Selection y le ocultaba la finca en la vitrina. Ahora solo cuentan las compras de Selection.
- **Corregido**: un mismo kilo podía ir a una mezcla y a un kit: una mezcla mira ahora el disponible de la raíz de su compra en el
  stock, y el stock descuenta lo asignado a mezclas.
- **Corregido**: la ubicación del alta a mano de una compra se escribía en el formulario y la acción no la guardaba.
- **Datos**: tablas nuevas `stock_partidas`, `stock_transformaciones`, `stock_salidas` (service-role-only; compuertas que congelan lo
  registrado y rechazan el DELETE); funciones atómicas `stock_raiz` (idempotente por compra y por despacho), `stock_transformar`,
  `stock_anular_transformacion`, `stock_disponible`; `sample_kit_items` gana `partida_id` y `kg`; la compuerta del stock de los kits se
  reescribió sobre partidas y `stock_kit_estado` saca del stock lo enviado. El borrado nuclear suma su sexto bloqueo (el lote con café
  en el stock). Probado en la base de producción dentro de una transacción revertida (cuadre de 100 kg, costos, equivalencias,
  compuertas); ninguna fila quedó y las secuencias volvieron a su inicio. Ninguna fila existente cambió.
- **Seguridad**: guardián nuevo `qa-stock-ctcx` (50: el mismo escenario que la base, las reglas, el acomodo, el acta, las raíces, las
  acciones, la pantalla y el rail; siete mutaciones, todas muerden). Puestos al día: `qa-compras` 101 → 109 (y ve lo nuevo sin
  versionar), `qa-ciclos` 145 → 146, `qa-solicitud-evaluacion` 96, `qa-borrado-nuclear` 33 → 34, `qa-rutas-consolas` 538 (58 rutas
  mudadas). La batería pasa a 71 guardianes.

## [V5.194] — 2026-10-09 (commit 50d4c4a)

- **Hito**: arranca el **Triage de Catálogo Activo** (owner, 2026-10-09): «Ofertas CP Aceptadas» se rebautiza y pasa a ser el punto
  de control entre lo que el productor aceptó, el Stock CTCx y el Catálogo Activo, con el **precio FOB mínimo** como ancla de cada
  lote. El plan, en tres tandas, es `docs/PLAN_TRIAGE_CATALOGO.md`: A · Empacado hasta FOB (esta) · B · Stock CTCx (partidas en
  pergamino, verde, tostado y empacado, con su linaje y su cuadre de masa) · C · el Triage.
- **Añadido**: **«Empacado hasta FOB»** (ECP · Modelo de Producción, `/ecp/cotizador-empaque`): lo que cuesta llevar un embarque de
  café verde de la bodega de CTCx a FOB — **cinco modos de empaque** (al vacío en bolsas de 3, 6 o 12 kg dentro de cajas; GrainPro +
  yute en sacos de 35 o 70 kg), la **paletización** (estibas ISPM-15), el **flete al puerto** (Cartagena · Santa Marta · Buenaventura;
  El Dorado por aire, FCA) y los **trámites FOB** (agencia de aduanas, certificados, re-pesaje DIAN, inspección, terminal, contribución
  cafetera), por kg de verde en COP y en US$ a la TRM de la edición vigente del PVC. Cálculo en vivo y línea por línea, los cinco modos
  lado a lado y la comparación con los estimados del Modelo Económico. Cada valor por defecto tiene fuente (el cotizador logístico de
  CTCx); un puerto marítimo no trae tarifa de flete: hay que escribir la del transportador.
- **Añadido**: las **referencias** de Empacado hasta FOB (código `EF-AAAA-NNN`): un cálculo con nombre que queda CONGELADO (no se
  edita ni se borra: se retira, con motivo). Al guardar, el servidor vuelve a calcular con los parámetros (del navegador no viaja
  ninguna cifra), exige la tarifa del flete y deja auditoría. Son las que el Triage sumará al café para anclar el FOB mínimo.
- **Datos**: tabla nueva `empaque_fob_referencias` (service-role-only; la compuerta `trg_guard_empaque_fob_referencia` rechaza
  editarla, borrarla o devolver una retirada a vigente). Ninguna fila existente cambió.
- **Retirado**: el **«Costo de empaque»** de la máquina de sellado al vacío dentro del ECP, por pedido del owner — la amortización de
  la máquina, el Cuadro de evaluación y el detalle de cada cotización: el `kind` «empaque» de los cotizadores, `listQuoteMetrics` y
  el puente `CTC_TOOL` del marco. Las URLs viejas (`/ecp/cotizador-empaque/<id>`, `/evaluacion`) van con un 308 a la herramienta
  nueva; la única fila de `quotes` con ese `kind` se queda como historia. **La herramienta pública** `costo-empaque` del banco de
  herramientas **no cambió**.
- **Cambiado**: el rail del ECP dice «Empacado hasta FOB».
- **Seguridad**: guardián nuevo `qa-empaque-fob` (47): el cálculo contra cuatro casos hechos a mano, que la máquina no vuelva, que el
  servidor recalcule y emita, la compuerta de la tabla y el rail (siete mutaciones, todas muerden); `qa-rutas-consolas` declara
  `src/lib/produccion/actions.ts` (533). La batería pasa a 70 guardianes.
- **Docs**: `docs/PLAN_TRIAGE_CATALOGO.md` (nuevo); las fichas de `costo-empaque` en `herramientas-cafe` dicen que ya no tiene
  consumidor interno.

## [V5.193] — 2026-10-08 (commit 64670cf)

- **Corregido**: **los lotes Black galardonados no aparecían en «Lotes Evaluados → Pendiente Oferta»** (owner, tras galardonar la fila
  de «Lotes en Evaluación»). La acción que emite ya admitía Black en temporada, directa y excepción desde la V5.85 (al retirarse el CRM
  de `black_negotiations`), pero la cola de la página seguía con su lista de la V5.18 (`red | blue | gold`): un Black galardonado no
  estaba en ninguna parte. Los dos Black de hoy entran a la cola, con su precio anclado al PVC (banda Black) y su mínimo (6 cargas).
- **Cambiado**: la regla «qué grado admite cada clase de oferta» vive en UNA tabla pura (`src/lib/ofertas/gradosPorClase.ts`:
  `kindAllowsGrade`, `GRADOS_DE_TEMPORADA`, `vaALaColaDeTemporada`) que leen la acción que emite y la cola de la página.
- **Seguridad**: `qa-ofertas` 38 → 39: la tabla se prueba por comportamiento y se exige que la acción y la cola la lean (probado
  devolviendo la lista vieja: falla); `qa-compras` lee también la tabla en vez del texto de la acción.

## [V5.192] — 2026-10-08 (commit 7ca21be)

- **Cambiado**: **«Agregar Referencias, Fotos y Videos»** (Kaffetal Regal; owner): «Lo que ya agregó a este lote» va ARRIBA y solo
  cuando hay al menos una; y un REPORTE ya no se agrega al elegir el archivo —así se iba sin lo que se escribía después: el factor de
  un análisis físico tecleado tras elegir el PDF nunca llegó (CTC-L-323FEDE6)—. El archivo queda elegido, los datos se llenan en
  cualquier orden y se envía con «Agregar este reporte»; enviado, TODO vuelve a quedar en blanco (datos, casilla, archivo) para
  agregar otro. Una foto o un video siguen agregándose al elegirlos.
- **Añadido**: **la evaluación que rige, en el OCP** (owner: «si entro a un lote galardonado no puedo ver ninguna información de la
  Evaluación»). En la vista del lote, «FT2 · Análisis Físico (B2/B3)» —marcada «evaluado ✓»— enseña la evaluación que rige el grado
  (la misma regla del dossier y de las ofertas, `evaluacionQueRige`): su Punto, de dónde vino, el Q-Grader, la fecha, el código del
  laboratorio, el reporte adjunto y el ajuste de CTCx, con la planilla completa (B2 y B3) en solo lectura; debajo, lo que declaró el
  productor en su Ficha.
- **Añadido**: **el Dossier, junto a las fichas del lote** (UID · Visa · grado) en el OCP: «Dossier ↗» abre el Dossier CTCx en Kaffetal
  Regal. Su página —y la de la Visa, que el dossier enlaza— admiten una SEGUNDA llave: un operador activo del OCP
  (`tieneConsola("ocp")`, sin redirigir; la cookie del panel se comparte entre subdominios), preguntada solo cuando no es el dueño;
  el título (= el nombre del PDF) también lleva el lote.
- **Añadido**: **«Ver planilla» en el Centro de Calidad** (owner: «que pueda abrir las fichas ya dadas de alta, ¡sin poder editarlas!»):
  la hoja de un alta confirmada o en espera de CTC, con el editor apagado, sus notas, su código y su reporte; sin botón que guarde.
- **Cambiado**: `requireConsoleAccess.ts` lee la identidad en un solo sitio (`leerIdentidad`); quien la exige redirige y `tieneConsola`
  solo pregunta. `qa-rutas-consolas` reconoce `tieneConsola("…")` como una forma más de nombrar la consola.
- **Docs**: `PLAN_CICLOS.md` §11 con las decisiones del owner sobre el contrato provisional (1–3 confirmadas; las tres firmas huérfanas
  de los intentos, pendientes de borrar por el owner); charters `consolas`, `kaffetal-regal`, `socios`; ALINEACION §3.
- **Seguridad**: `qa-kr-ficha` 277 → 281, `qa-evaluaciones` 61 → 65, `qa-centro-calidad` 302 → 304, `qa-visa` 97 → 100; `qa-registro`
  y `qa-centro-calidad` leen la segunda llave del dossier. Cada comprobación nueva se probó haciéndola morder.

## [V5.191] — 2026-10-08 (commit f90b2f1)

- **Cambiado**: **«Marcar revisada» → «Hacer revisión»** en las referencias que el productor agrega a su lote (OCP · vista del lote;
  owner, sobre CTC-L-323FEDE6). El botón abre un panel a pantalla completa con el ADJUNTO y la planilla de evaluación LADO A LADO —dos
  columnas que corren cada una por su cuenta—, con SOLO el bloque del reporte: B2 si es de perfil de taza, B3 si es de análisis físico o
  granulometría (el otro se puede incluir con una casilla, si el adjunto lo trae). Se guarda en formato CTCx (`planilla_ctcx`), la
  referencia queda revisada (una vez) y el productor lo lee bajo su referencia y en su feed. Sigue sin cambiar el puntaje ni el grado del
  lote. Ya revisada, «Ver la revisión».
- **Añadido**: **el lector de reportes** (`src/lib/kaffetal/lectorDeReportes.ts`, puro): lee la capa de texto del PDF (`unpdf`, solo
  servidor) y propone la planilla, cada dato con el trozo del reporte de donde salió y su modo —leído, derivado o interpretado—. Con el
  formato de la FNC: humedades, factor, almendra, el pergamino de la muestra derivado de la merma, los defectos, las mallas a las de CTCx
  (13 y 12 en Pea Berry), el puntaje y su protocolo, el perfil, la rueda con la etapa en que se nombra cada nota, y la acidez y la boca
  del formato descriptivo. La identidad del reporte se coteja con el lote (nombre, finca, municipio, vereda) y sus advertencias («solo
  educativo») se avisan. Probado con el reporte real: el factor de los pesos da el del reporte (86,46) y las mallas cuadran.
- **Añadido**: **«Leer también con IA»** (opt-in, con su aviso de costo; vía de gasto nueva `kr:referencia-lector`): para lo que el texto
  no trae —el radar de atributos de la FNC es una imagen— o un reporte en foto. Pasa por el mismo mapeo y no pisa lo ya llenado: lo que
  difiere se enseña como choque.
- **Cambiado**: `LabEvalEditor` acepta `bloques` (B2, B3 o los dos, por defecto); sin B2 el idioma se elige en B3. `labEvaluation.ts`:
  `BloqueDePlanilla`, `CLAVES_B3`, `recortaABloques`. La acción vieja `revisarReferencia` se retiró con su botón.
- **Datos**: migración `referencia_planilla_ctcx` (`planilla_ctcx` y `lectura_ctcx`, nulas; un check: sin revisión no hay planilla ni
  lectura; la política de INSERT del productor las exige en null; 0 filas tocadas).
- **Seguridad**: `qa-kr-ficha` 250 → 277 (§ V5.191: el lector con un reporte de formato FNC inventado, otro con los atributos en texto y
  uno CVA; la IA saneada y opt-in; los bloques; el panel lado a lado; leer no escribe, guardar es `emite` y una vez; el acta).
- **Seguridad**: **el punto ciego de la compuerta**: `qa-rutas-consolas`, `qa-niveles` y `qa-encoding` listaban las fuentes con
  `git ls-files`, que no ve lo NUEVO antes del commit —justo cuando corre la compuerta—. Así entró en la V5.190
  `src/lib/ofertas/aceptacion.ts` con la compuerta del OCP sin declararse (lo cazó la compuerta de esta versión, ya versionado). Los
  tres suman `--others --exclude-standard`; `aceptacion.ts` queda declarado en `MODULOS_LIB` (vive en la Asistencia del OCP);
  `qa-rutas-consolas` 521 → 527, probado con un módulo nuevo sin versionar.
- **Añadido**: la dependencia `unpdf` 1.8.1 (MIT, sin dependencias). `npm audit` sigue en 26 por avisos nuevos de paquetes que ya estaban (`next`,
  `nodemailer`, `undici`…); `unpdf` no está entre ellos.
- **Docs**: charters `consolas`, `kaffetal-regal`; ALINEACION §3.

## [V5.190] — 2026-10-08 (commit acfd605)

- **Corregido**: **la firma de una invitación «cargaba, pero no hacía nada»** (sesión asistida de «Castillo Lavado Ruizeñores 2026»,
  2026-10-08). No era un bloqueo de seguridad: la V5.175 dejó `purchase_contracts.freeze_months` NOT NULL y el insert de un trato por
  ventana la manda en null; Postgres rechazaba el contrato (23502) después de subir la firma, y la pantalla solo lo decía en un aviso
  fugaz con un mensaje genérico. La columna admite null; el error sale ahora con su código, se queda escrito junto al botón y va al
  registro del servidor, y la firma subida de un intento fallido se retira. Las tres imágenes de los intentos del 2026-10-08 quedan
  en Storage, sin contrato.
- **Añadido**: **el contrato PROVISIONAL de la sesión asistida** (owner). Justo debajo de la casilla, resaltado, «Aceptar contrato
  provisionalmente»: CTCx acepta en favor del Productor («grupo de Pioneros») sin insertar su firma, su nombre ni su documento, con el
  «Nombre de responsable CTCx». Solo lo puede hacer un colaborador del OCP con nivel para emitir, con su sesión de consola, dentro de una
  sesión asistida de ese productor, y solo sobre una participación en Cherry Picked anclada al PVC de su grado. El contrato nace
  **vigente** (firmado por CTCx) y su texto nombra al Productor por su cuenta (CTC-P-…), dice que queda vigente desde la aceptación y
  lleva la cláusula 13 con la nota de Pioneros («ningún cambio será unilateral»). Texto `2026-10-08.3`.
- **Añadido**: **«Ratificar y firmar»** en «Contratos»: el productor, desde su cuenta (no en una sesión asistida), lee el texto ya con
  su nombre y su documento, puede ajustar la cantidad declarada —dentro del mínimo de su ventana, de lo que le queda al lote y de lo ya
  vendido o retirado— y firma con el dedo; el precio, la ventana y lo demás no cambian. Una sola vez; la huella nueva se guarda.
- **Cambiado**: la validación y el insert del contrato viven en `src/lib/ofertas/aceptacion.ts`, compartidos por la firma y la
  aceptación provisional (un solo insert); `src/lib/trato/contratoDeFila.ts` arma los datos del texto desde la fila (la página del
  contrato y la ratificación). Una firma trazada dentro de una sesión asistida queda sellada con el operador de consola y el OCP lo dice.
- **Cambiado**: el OCP marca el contrato provisional (quién lo aceptó, cuándo, si ya se ratificó) y lo lista «Provisional · por
  ratificar»; la página del contrato del productor enseña el texto provisional y su huella, y después el ratificado.
- **Datos**: migración `contrato_provisional` (`freeze_months` admite null; cinco columnas nulas y un check; 0 filas tocadas).
- **Seguridad**: `qa-ciclos` 133 → 145 (§18: la regresión de `freeze_months`, el texto provisional y el ratificado, la sesión de consola
  y la marca, la ratificación una vez y fuera de la asistida, las pantallas); `qa-ofertas`, `qa-trato` y `qa-ciclos` leen la aceptación
  en sus dos archivos.
- **Docs**: `PLAN_CICLOS.md` §11; charters `kaffetal-regal`, `consolas`; ALINEACION §3.

## [V5.189] — 2026-10-08 (commit bdec167)

- **Hito**: **la escala de valor de los Grados CTCx cambia de protocolo** (owner): «CVA y SCA 2004 deben tener un valor EQUIVALENTE
  para transformarse, cambiando el valor de los criterios de manera proporcional y teniendo en cuenta el efecto de las tazas no
  uniforme/defectuosas (vamos a anular la otra equivalencia y a rehacer su lógica). Además, hagamos que CVA sea la principal.»
  **El CVA es el protocolo principal** y **un SCA 2004 vale lo mismo**: el Punto es uno solo, sin intervalo.
- **Retirado**: la homologación de la V5.92 (`homologacion.ts`): la banda k 1–2, el intervalo [bajo, valor, alto], el grado sobre el
  piso, «hasta X con recata SCA», el estado «pendiente de recata» y el tope en Gold de un CVA. El plan la marca ANULADA (§10.3).
- **Añadido**: **la equivalencia** (`src/lib/arena/equivalencia.ts`, modelo `equivalencia-2026-10-08`, plan §10.6): las tazas con el
  mismo efecto (CVA −2 por no uniforme y −4 por defectuosa ↔ 2004 Uniformidad −2, Taza limpia −2 y un taint −2); los criterios en
  proporción con una recta fija, atributo 2004 = 3,25 + 0,75 × sección CVA (9 ↔ 10 · 6 ↔ 7,75 · 5 ↔ 7), de modo que ocho secciones
  iguales y un 2004 con las tazas llenas suman lo mismo; Fragancia/Aroma = promedio de las dos, Cuerpo = Sensación en boca, Balance =
  promedio de las ocho, Dulzor del 2004 = 10; lo que no cuadra uno a uno se ajusta en proporción (sobre el piso de cada escala) hasta
  que el total sea idéntico, sin salir del dominio. Y al revés (2004 → CVA). Los criterios transformados llevan dos decimales.
- **Cambiado**: **el Punto** (`src/lib/arena/punto.ts`, antes `homologacion.ts`): `puntoCva` · `puntoSca2004`; con «Ambas» rige el CVA
  y el total del 2004 queda al lado (banco comparativo); el grado se lee del Punto con la tríada, igual en los dos protocolos (Tyrian
  incluido). `puntoDeFila` lee las filas viejas: un «homologado» vale su CVA y un «nativo» de la V5.92 era un 2004 catado.
- **Cambiado**: **la planilla abre en CVA** (vista «CVA · principal», «SCA 2004 · equivalente», «Ambas»), y junto al Punto enseña **su
  equivalente en el otro protocolo** (calculado, mismo total). Los textos de la planilla y sus ayudas «i» (ES · EN) ya no dicen que un
  84 del 2004 y un 84 del CVA «no son comparables»: las dos ayudas («SCA 2004 y CVA no son lo mismo» y «El puntaje afectivo CVA»)
  se cambiaron en su fuente, la CTCx Coffee Datasheet Tool (ES · EN · DE), que sigue sin mezclar los métodos en una planilla y dice
  que en CTCx valen lo mismo; `planillaInfo.ts` se regeneró. El veredicto del OCP, la Arena, el Centro de Calidad, «Lotes Galardonados» y el
  dossier dicen con qué protocolo se cató; ninguna pantalla habla ya de homologación, piso ni recata.
- **Datos**: el único Punto homologado de la base (alta del Centro de «Castillo Lavado Ruizeñores 2026», pendiente de confirmar) pasa
  de su piso 81,50 a su CVA 84,25, con su fila en `audit_log` (`docs/migraciones/2026-10-08_punto_equivalente.sql`). Las tres
  evaluaciones del Gesha (SCA 2004, 85) no cambian.
- **Seguridad**: `qa-centro-calidad` 287 → 302: lee la recta y los vectores del §10.6 (CVA → 2004 y 2004 → CVA, con Ruizeñores y el
  Gesha), prueba ida y vuelta sobre 300 planillas, las filas viejas, el grado igual en los dos protocolos, y que ninguna pantalla
  hable de homologación; `qa-coffee-datasheet` (1410) y `qa-evaluaciones` leen los textos nuevos.
- **Docs**: `PLAN_CIRCUITO_DEL_LOTE.md` §10.6; ALINEACION (contrato de grados, §3b y §3); charters `consolas`, `socios`,
  `kaffetal-regal`, `herramientas-internas`, `cherry-picked`, `herramientas-cafe`.

## [V5.188] — 2026-10-08 (commit 260426a)

- **Cambiado**: la revisión de una oferta en «Contratos y Compras» (feedback de revisión, seis puntos). **El escenario es un
  supuesto del productor, no un pronóstico de CTCx**: la sección se titula «Simule un escenario de ventas · es un supuesto suyo»,
  la barra dice «Supongamos que CTCx vende el X % (usted elige el supuesto)», las cifras van en condicional («Si se vendiera…»,
  «Se vendería», «Recibiría en total» = el saco + lo vendido) y la gráfica separa la firma (seguro) de las semanas (supuesto). Un
  recuadro verde dice **lo único seguro con la firma: el saco de 70 kg** y su valor, con el pago 60/40.
- **Corregido**: «Más que vendiéndolo a la FNC» contaba el saco pero decía «por lo vendido a CTCx»; ahora dice qué kilos cuenta
  («por 520 kg: 450 kg vendidos en el escenario + el saco de 70 kg»), y «Precio frente a la FNC» dice que es por kilo.
- **Añadido**: **«Las palabras de este trato»** (`GlosarioDelTrato.tsx`), en cada oferta de Cherry Picked o de CTCx Selection: PVC,
  CPS, carga, grado (los multiplicadores del modelo y la línea del grado del lote), Cherry Picked, CTCx Selection, ventana, saco,
  retiro libre, bache, Flete a CTCx y 60/40. La oferta dice «CPS (café pergamino seco)», «carga (125 kg)» y «del PVC (el precio de
  referencia de CTCx)», y el contrato define Cherry Picked (la vitrina de CTCx) y CTCx Selection (las compras directas de CTCx).
- **Añadido**: **el documento de quien firma**. Al firmar se escribe el tipo (CC por defecto; CE, PPT, pasaporte o NIT) y el número;
  el contrato dice «identificado(a) con CC 1.098.765.432» y el documento entra al texto firmado y a su huella. El servidor lo valida
  (`documento.ts`) y lo guarda en `purchase_contracts.producer_signer_doc_tipo` · `producer_signer_doc_numero` (con checks de forma y
  de pareja); la página del contrato y su vista en el OCP lo muestran junto a la firma. Texto del contrato `2026-10-08.2` (no hay contratos firmados).
- **Corregido**: **las fechas**. «Vence el 4/1/2027» se podía leer como 4 de enero o 1 de abril, y además era el día en UTC: la oferta
  vence el 3 de enero al terminar el día en Colombia. `fechas.ts` (`fechaParaElProductor`, en la hora de Bogotá y con el mes en letras)
  reemplaza las fechas numéricas de Kaffetal Regal: la oferta, el contrato, los chequeos, los documentos EUDR, la Ficha, la
  retroalimentación, el aviso de oferta vencida y los recordatorios de la mora. La ventana dice su duración exacta («88 días · 12
  semanas y 4 días»), y las semanas de venta de la calculadora cuentan la semana parcial (`Math.ceil`).
- **Corregido**: **CTCx, no CTC**, en lo que ve el productor: 223 reemplazos en 61 archivos de Kaffetal Regal y en los avisos del OCP
  al productor. Quedan a propósito la razón social, «CTC Tech», «CTC UID», los códigos CTC-L/F/P, los nombres de un estándar y de un
  sello, y los `includes("CTC")` que reconocen los mensajes de los guardas de la base. La Ficha toma su razón social y su correo de
  `legal.ts` (decía info@colombiantradingcompany.com; el de la casa es info@ctcexport.com).
- **Datos**: migración `documento_del_firmante` (dos columnas nulas y tres checks en `purchase_contracts`; 0 filas tocadas).
- **Seguridad**: `qa-ciclos` 17.ª sección (fechas, duración, documento, contrato, escenario, glosario y la marca en todo Kaffetal Regal);
  `qa-trato` con la versión nueva del texto y la firma que pide el documento; `qa-evaluaciones`, `qa-registro` y
  `qa-solicitud-evaluacion` leen los textos con CTCx.
- **Docs**: charters `kaffetal-regal`, `consolas`; ALINEACION §3.

## [V5.187] — 2026-10-08 (commit 7aa3d8f)

- **Corregido**: la sigla del PVC. El contrato decía «Precio de Valor de Compra (PVC)»; ahora dice **«Ponderación de Valor de
  Cosecha (PVC)»**, el nombre del motor y de Ediciones del ECP, en las dos clases (Cherry Picked, con sus tres reglas de precio, y
  CTCx Selection), y el precio queda fijo «**con base en**» el PVC (antes la aposición lo leía como si el precio fuera el PVC). Texto del
  contrato `2026-10-08.1` (no hay contratos firmados). El prompt del agente del PVC usa la misma sigla.
- **Corregido**: la evaluación **no se rebaja, se coinvierte** (PVC_BCP_PLAN §14.2 n.º 11-bis, owner 2026-09-18). Lo que Kaffetal
  Regal le dice al productor ya no habla de «descuento» ni de «subvención del X %»: «Evaluar mi Café» (la tarifa, la nota para pedir
  más, el código y el aviso al aplicarlo, «Su cuenta»), las instrucciones de envío, «Por qué inscribirse» y el FAQ en ES · EN · DE
  dicen **coinversión de CTCx** (co-investment · Ko-Investition), y también los avisos del feed que mandan KR y el OCP. El código
  sigue llamándose «de subvención» y el campo, `discount_pct`.
- **Seguridad**: `qa-trato` (131 → 133), `qa-solicitud-evaluacion` (95 → 96, y dos comprobaciones al día); `qa-ciclos` con la versión
  nueva del texto.
- **Docs**: charters `kaffetal-regal`, `consolas`; ALINEACION §3. Fuera del repo, las narrativas v4 de CTCx y Kaffetal Regal
  (`reference/narrativa-2026-10-08-en/`) señalaron las dos cosas.

## [V5.186] — 2026-10-07 (commit 45ea226)

- **Añadido**: en «Mi trato», **el bache abierto con su plazo** (owner): qué lleva (las ventas de cada semana), cuánto vale, a más
  tardar cuándo sale (o hasta cuándo con la prórroga), los días que faltan —verde, ámbar a 7 días, rojo si venció—, cuánto le pagan
  al registrar el tiquete (60 %) y al recibirlo (40 %), y su registro de despacho. Sin bache abierto, dice que se abre con la próxima
  venta confirmada. Las ventas saben ya a qué bache van (`despachoId`).
- **Añadido**: en «Pendiente de Oferta», bajo el precio por carga, **la FNC del día** (última lectura y su fecha) y cuánto está la
  oferta por encima o por debajo de ella.
- **Corregido**: «Pedir prórroga» ya no se ofrece en un despacho que ya la tuvo (el servidor la rechazaba).
- **Seguridad**: `qa-ciclos` (123 → 125).
- **Docs**: charters `kaffetal-regal`, `consolas`.

## [V5.185] — 2026-10-07 (commit 37672f3)

- **Cambiado**: en la calculadora, el retiro dice **«Penalidad total a pagar: $X»** con su desglose (el 4 % del precio de cada una de las
  N cargas penalizadas, a $Y la carga); antes se leía como si el monto fuera solo el 4 %. «Mi trato» y su confirmación usan la misma
  palabra.
- **Añadido**: el número comparativo del owner: la penalidad como % de lo que el productor gana de más vendiendo a CTCx en vez de a la
  FNC («Más que vendiendo a la FNC»), y lo que le queda de ventaja después de pagarla —o, si se la come, cuánto quedaría por debajo—.
- **Cambiado**: en la invitación, justo después de «Oferta de CTCx: $X/kg de CPS», el precio por carga y, entre paréntesis, el Flete a
  CTCx que incluye.
- **Seguridad**: `qa-ciclos` (121 → 123).
- **Docs**: charter `kaffetal-regal`.

## [V5.184] — 2026-10-07 (commit c5e9a47)

- **Cambiado**: **«🎲 Escenario aleatorio» ya no cambia el % vendido** (owner: «no hagas que esto cambie el "CTCx termina vendiendo
  el 10 % de lo declarado"»): cada clic reparte al azar lo vendido en las semanas; el % lo sigue fijando el productor con su barra.
- **Seguridad**: `qa-ciclos` vigila que el escenario aleatorio no toque el % vendido.

## [V5.183] — 2026-10-07 (commit a22f716)

- **Añadido**: en la calculadora de la participación en Cherry Picked, **«🎲 Escenario aleatorio»**: cada clic arma otro escenario
  al azar —cuánto termina vendiendo CTCx (10–100 %) y cómo se reparte en las semanas, con semanas sin compras y alguna más fuerte—
  y dice lo que pasa en él (cuánto vende, en cuántas semanas compra, la semana más fuerte, lo que recibe y en cuántos envíos). El
  azar es reproducible por semilla (`escenarioAleatorio`, simulador.ts).
- **Añadido**: **«💵 ¿Cuándo me pagan?»**: cada envío se paga 60 % con el tiquete de despacho y 40 % al recibirlo con la calidad en
  rango; el saco sale con la firma; lo vendido se despacha por baches con la cadencia que el productor elija (cada semana, 2 ★, 3 ★,
  4 o 5 semanas) y una tabla dice qué sale cuándo y cuánto paga cada parte (`pagosPorBaches`).
- **Cambiado**: **lo vendido sale por baches que decide el productor** (owner: «tiene la potestad de enviar el café en baches que no
  sean semanales —cada 3, 4 o hasta 5 semanas—, pero se recomienda cada 2 o 3; depende de que haya compras confirmadas»). Antes
  salía en la semana 1 del ciclo siguiente. La venta que confirma el OCP se agrega al bache abierto del contrato o abre uno, con
  plazo al cierre de la 5.ª semana contando la de su primera venta (`plazoDelBache`); el productor lo despacha cuando quiera dentro de
  ese plazo. Contrato (versión `2026-10-07.3`), aviso de la firma, aviso de cada venta y la vista del contrato en el OCP lo dicen.
- **Seguridad**: `qa-ciclos` (114 → 121), `qa-trato`.
- **Docs**: `PLAN_CICLOS.md` §3; charters `kaffetal-regal`, `consolas`; ALINEACION §3.

## [V5.182] — 2026-10-07 (commit bfe32f3)

- **Añadido**: **el ancla de control de la existencia** (owner: «que este cambio de dato no se pierda, de tal manera que se pueda
  tener un ancla de control que muestre y demuestre si hay cambios abruptos o desproporcionados»). La base guarda CADA cambio de
  la existencia de CPS en `lot_existencia_historial` —antes, ahora, punto de control (Ficha A2 · invitación/renovación ·
  solicitud de evaluación · CTCx en el OCP · sistema), quién, la etapa y la producción estimada de A2— con un trigger en `lots`
  que ningún camino esquiva (una sesión de productor queda siempre como «Ficha»). El historial es inmutable: ni el service role
  lo edita o borra, y no depende del lote (sobrevive si se borra).
- **Añadido**: la vista del lote en el OCP enseña el **Historial de la existencia** calificado (`controlDeExistencia.ts`): notable si
  cambia ≥ 20 % de una vez, se borra o es el 3.º cambio en 30 días; abrupto si cambia ≥ 50 % o supera la producción estimada de A2
  en más de 10 %. «Pendiente de Oferta» muestra la existencia de cada lote con su alerta antes de ofertar.
- **Datos**: migraciones `2026-10-07_historial_de_existencia.sql` (tabla, triggers y arranque) y `…_arranque.sql` (corrección
  única del arranque: tomaba solo el último registro; CTC-L-0B9C1C04 pasó de 5.000 a 2.000 kg desde la invitación a las 13:54 y el
  ancla perdía el 5.000 — ahora tiene los dos, y el cambio sale ABRUPTO, −60 %).
- **Seguridad**: `qa-ciclos` (107 → 114).
- **Docs**: charters `kaffetal-regal`, `consolas`; ALINEACION §3.

## [V5.181] — 2026-10-07 (commit 4b1300e)

- **Cambiado**: **la existencia del lote es obligatoria al enviar la muestra** (owner: «es un valor no-obligatorio en A2, pero se
  vuelve obligatorio cuando se envía para la muestra, preguntándolo de nuevo si no fue ya registrado, y permite corregirlo»).
  «Solicitar evaluación» en Kaffetal Regal la pide (prellenada con la de la Ficha, corregible) y no deja solicitar sin ella; el
  servidor la exige igual, también cuando CTCx postula en nombre del productor. En la Ficha (A2) sigue opcional y lo dice.
- **Añadido**: CTCx registra o corrige la existencia desde la vista del lote en el OCP (owner: «no puedo registrar la existencia
  en este punto»), con aviso al productor. Un solo escritor fuera de la Ficha (`src/lib/kaffetal/existencia.ts`: columna + A2 +
  auditoría) para el productor, la solicitud y el OCP.
- **Datos**: `2026-10-07_existencia_de_lotes.sql`: la existencia de CPS de los lotes registrados y por evaluar —CTC-L-0B9C1C04
  5.000 kg y los seis de la tabla del owner (016DF280 10.000 · 323FEDE6 4.000 · 7E360302 15.000 · 8946DC24 4.000 · FDA6B795
  8.500 · 7AEDF5A4 700)— y dos ESTIMADOS por la región, que el productor confirma al solicitar: 403D5C8B 2.500 (Castillo Honey,
  Piedecuesta, cultivo de 1 año) y DA154613 500 (Gesha Natural, micro-lote). Solo llenó vacíos; una fila de auditoría por lote.
- **Seguridad**: `qa-ciclos` (102 → 107).
- **Docs**: charters `kaffetal-regal`, `consolas`; ALINEACION §3.

## [V5.180] — 2026-10-07 (commit 9b01703)

- **Corregido**: **la calculadora de la participación en Cherry Picked desaparecía** cuando el lote no tenía registrada su
  existencia total (owner: «no quedó ninguna herramienta de análisis de escenarios»): la tarjeta solo pedía la existencia.
  Ahora la calculadora —la ventana de hoy, el precio con el Flete a CTCx, la cantidad, el escenario de ventas y el retiro— se
  enseña siempre que la ventana esté abierta; sin la existencia se juega igual con el escenario y solo «Tomar la decisión»
  espera, con el aviso de registrarla arriba (el servidor la sigue exigiendo al aceptar).
- **Seguridad**: `qa-ciclos` (101 → 102), `qa-trato` (la casilla de decidir también espera la existencia).
- **Docs**: charter `kaffetal-regal`.

## [V5.179] — 2026-10-07 (commit d6b7031)

- **Añadido**: **el agente de la edición siguiente del PVC** (tanda 4 de los Ciclos, `docs/PLAN_CICLOS.md` §6; owner: «sí, que
  prepare el borrador ya», presupuesto de IA ~US$10). En la semana 1 del ciclo 2 —o cuando el owner lo pide— deja la edición
  siguiente como BORRADOR (`pvc_editions`, status draft): las fechas del trimestre ISO siguiente con sus ciclos, los insumos FNC
  medidos (5 meses —oficiales o de la serie diaria—, corte, 30, 90 y 180 días: `src/lib/pvc/insumos.ts`), la TRM oficial del día
  (datos.gov.co) y lo que no se puede medir —C strip, diferencial, costo, escalamiento, score— ARRASTRADO de la vigente y marcado.
  El motor da el PVC; el informe va en dos pasos acotados (investigar: modelo pequeño con 3 búsquedas web directas · redactar:
  modelo mediano sin búsqueda) y SUGIERE valores con fuente para lo arrastrado, sin aplicarlos. Aviso por correo, tarea en el
  Tablero de Ejecución y recordatorios del plazo (3 días antes y al vencer). Cron `/api/cron/agente-pvc` (11:40 UTC).
- **Añadido**: en ECP → Modelo Económico → Ediciones, la tarjeta **«Edición siguiente»**: el PVC propuesto frente al vigente, de
  dónde sale cada insumo (lo arrastrado resaltado), el informe con sus fuentes y los botones «Revisar y publicar en el Tablero»
  (`/ecp/pvc/tablero?borrador=<id>` arranca el tablero desde el borrador) y «Regenerar» (owner, ≈ US$0,15 de IA).
- **Cambiado**: una edición publicada nace con sus variables —del borrador del mismo código, de la que reemplaza o de la última
  publicada— y con los ciclos del calendario ISO (antes nacía sin ciclos y las ventanas de firma quedaban cerradas hasta fijarlos a
  mano); el borrador de ese código queda sustituido.
- **Cambiado**: el cliente compartido de IA (`src/lib/coffeed/claude.ts`) acepta `webSearchDirecto` (opt-in): la búsqueda web la
  llama el modelo directamente (`allowed_callers: ["direct"]`). Con el modo por defecto una corrida del agente pasó de 200 s y se
  abortó; directo, 3 búsquedas tardan ~10 s. Los usos que ya existían no cambian.
- **Datos**: migración `2026-10-07_agente_pvc.sql` (aditiva): `pvc_editions.agente` (jsonb) y un solo borrador por código (índice
  único parcial). Primer borrador, pedido por el owner: **PVC-F1-2027 = $2.500.000** (gobierna el piso; TRM oficial 3.216,01;
  4–ene → 4–abr 2027, se publica a más tardar el 29-nov-2026). Gasto de IA de la puesta a punto: US$0,32 anotados en `ai_usage`
  (`pvc:agente`) más dos llamadas abortadas por tiempo, que el libro no puede anotar, y las búsquedas (~US$0,01 cada una).
- **Seguridad**: `qa-ciclos` (89 → 101: insumos FNC con la paridad de F4-2026, lo arrastrado, los dos pasos del informe, el
  borrador único, la herencia de variables, el Tablero con borrador, la tarea).
- **Docs**: `PLAN_CICLOS.md` §9 (tanda 4 hecha); charters `herramientas-internas`, `consolas`, `coffeed`; ALINEACION §3.

## [V5.178] — 2026-10-07 (commit 605110b)

- **Añadido**: **la vigilancia de la corrección del PVC** (tanda 4 de los Ciclos, `docs/PLAN_CICLOS.md` §6). Cada día, después de
  leer el FNC, el cron `/api/cron/vigilancia-pvc` (11:25 UTC) mide el ciclo en curso contra el PVC vigente y, en el ciclo 2 con
  el siguiente publicado, contra ese por separado (se enmienda). Con 15 de 20 lecturas seguidas —alza si FNC > PVC, baja si
  FNC ≤ PVC / 1,2— PROPONE la corrección (tope ±10 %, redondeo a $1.000), una por ciclo y por PVC, avisa por correo (el
  resultado queda en la fila) y la pone en el Tablero de Ejecución. Lo que nadie resuelve en su ciclo, vence.
- **Añadido**: en ECP → Modelo Económico → Ediciones, la tarjeta **«Vigilancia de la corrección»**: lo medido hoy (lecturas del
  ciclo, cuántas cuentan como alza y como baja, el umbral) y las propuestas por resolver. **Aprobar** (owner) publica la edición
  corregida —las mismas entradas y variables (fechas, ciclos, mínimos, calidad, flete), el PVC nuevo, escalera y pila
  recalculadas (`calcularConPvc`)—; la anterior queda sustituida. **Rechazar** pide el motivo.
- **Cambiado**: la corrección aplica a lo que se firme DESPUÉS de aprobarla: una invitación de Cherry Picked anclada a una edición
  que se corrigió firma con el PVC corregido (mismo %, mismo flete congelado); los contratos ya firmados no cambian. La
  pestaña Lectura deja de hablar del disparador «10 de 15» y enlaza la vigilancia; el estado «corrected» se lee «Corregida».
- **Datos**: migración `2026-10-07_vigilancia_correccion_pvc.sql` (aditiva): `pvc_correcciones` (una por ciclo y por PVC,
  service-role only); `pvc_trigger_watch` y `pvc_cycles` quedan documentadas como dormidas. La V5.177 cerró con
  `2026-10-07_flete_retira_auxilio.sql` (commit 47a9722), aplicada tras su despliegue: las dos columnas vacías del auxilio.
- **Seguridad**: `qa-ciclos` (77 → 89: paridad de `calcularConPvc`, la medición del ciclo, el cableado y los permisos).
- **Docs**: `PLAN_CICLOS.md` §6 y §9; charters `herramientas-internas`, `consolas`; ALINEACION §3.

## [V5.177] — 2026-10-07 (commit 2ed009d)

- **Cambiado**: **«Flete a CTCx» reemplaza el «auxilio de transporte»** (owner, 2026-10-07: no existe; las cooperativas le
  DESCUENTAN el flete a la base FNC, que es puesta en bodega de Almacafé). CTCx suma al precio final un flete fijo por carga
  equivalente en tres niveles por región de despacho —Regional Santander $25.000, Nacional Centro $50.000, Nacional Sur $70.000
  (200 · 400 · 560 COP/kg)—; el productor despacha con el código corporativo de CTCx en Servientrega y paga el resto en la
  oficina. Precio final = PVC × multiplicador del grado (con su %) + flete de la región (`src/lib/trato/flete.ts`).
- **Añadido**: los tres valores son **variables de la edición** en ECP → Modelo Económico → Ediciones (owner, con auditoría;
  ajustables, no entran en la huella del PVC). En «Confirmar la oferta» del OCP, CTCx **elige la región** (la sugiere el
  departamento de la finca) y el precio se mueve con ella; la oferta congela región y valor, y la renovación conserva la región.
  El precio del PVC siguiente (ventanas al promedio o al siguiente) lleva el mismo flete congelado. CTCx Selection: el tope es
  PVC − 8 % más el flete.
- **Cambiado**: el contrato (versión `2026-10-07.2`), la calculadora, la oferta y la propuesta de Selection en Kaffetal Regal
  citan el Flete a CTCx de su región y el despacho con el código corporativo. Las cajas de cifras de «Confirmar la oferta» se
  ensanchan (el precio por carga ya no se corta).
- **Datos**: migración `2026-10-07_flete_a_ctcx.sql` (aditiva): `pvc_editions.flete_por_region` (con su check; PVC-F4-2026 con
  los valores del owner y auditoría), `lot_offers.flete_region`/`flete_carga`, `purchase_contracts.flete_region`/`flete_carga`;
  el guard de la edición ya no protege el auxilio. Sus dos columnas (nunca llenadas) se retiran tras el despliegue.
- **Corregido**: `qa-compras` no contaba `ventanaActions.ts` (V5.176) como escritor de Compras —el saco y el adelanto recibidos—
  porque el archivo no estaba en git cuando corrió; ahora lo admite y vigila que vaya a Sample Kits.
- **Seguridad**: `qa-ciclos` (66 → 77), `qa-pvc-precio`, `qa-trato`, `qa-compras` (99 → 101).
- **Docs**: `PLAN_CICLOS.md` §3, §6, §9 y §10; nota en `PVC_BCP_PLAN.md`; charters `herramientas-internas`, `consolas`,
  `kaffetal-regal`; ALINEACION §3.

## [V5.176] — 2026-10-07 (commit 70ab89b)

- **Añadido**: **tanda 3 de los Ciclos: la operación del trato por ventanas en el OCP** (`docs/PLAN_CICLOS.md` §3–§5). En el
  contrato: confirmar la venta de la semana (se agrega al despacho de la semana 1 del ciclo siguiente), confirmar el tiquete y
  pagar el 60 % (CTCx puede registrar la guía por el productor), recibir con peso, humedad y actividad de agua (en rango paga el
  resto sobre lo recibido; fuera de rango, devolución o compra con 0–15 % adicional), la prórroga de lo vendido y el cobro del
  faltante (la venta se anula —no se borra— y entra como retiro penalizado). El saco y el adelanto recibidos quedan en Compras
  con destino Sample Kits. Cada acción deja auditoría y avisa al productor por su feed y por correo.
- **Añadido**: **la renovación a una aprobación**: desde la semana 4 del último ciclo de una ventana, «Pendiente de Oferta» tiene
  la columna «Renovaciones de ventana» con la invitación siguiente prellenada (mínimo de continuidad −10 % por trimestre, compra
  adelantada de 10 kg, la misma entrega); convive con el contrato que renueva y vence al terminar su ventana. El productor
  reconfirma la disponibilidad, la humedad y el bodegaje, y puede actualizar la existencia del lote.
- **Cambiado**: **la vitrina de Cherry Picked para los lotes por ventana**: se venden con el café en la finca (owner, V5.169: «el
  café declarado queda disponible para la venta en Cherry Picked»): el stock publicado es lo declarado menos lo retirado,
  sumado sobre las ventanas del lote, y se sincroniza al aceptar, retirar o cancelar; lo vendido lo lleva el catálogo. Los
  tratos viejos siguen publicando lo recibido (`contract_releases`).
- **Cambiado**: el barrido diario de la redeclaración (V5.171) se reemplaza por `/api/cron/renovaciones`: recuerda una vez la
  renovación que vence en 7 días, expira las invitaciones vencidas y cierra las ventanas cumplidas. La redeclaración y su código
  se retiran (sus columnas quedan dormidas). Al firmar, el aviso al productor habla de su ventana.
- **Datos**: migración `2026-10-07_ciclos_operacion_ocp.sql` (aditiva): `contract_ventas.anulada_at`/`anulada_motivo`,
  `lot_offers.recordatorio_at`.
- **Seguridad**: `qa-ciclos` (53 → 66).
- **Docs**: `PLAN_CICLOS.md` (tanda 3 hecha); charters `consolas`, `kaffetal-regal`, `cherry-picked`; ALINEACION §3.

## [V5.175] — 2026-10-07 (commit 23c4210)

- **Cambiado**: **tanda 2 de los Ciclos: el trato de Cherry Picked va por VENTANAS** (`docs/PLAN_CICLOS.md` §2–§5). El productor
  ya no elige modalidad: la fecha de firma decide la ventana (un ciclo con 25 % de retiro libre, o extendida al ciclo siguiente
  con 30 %) y la regla de precio (vigente · promedio con el PVC siguiente · siguiente). Una sola cuenta del servidor
  (`condicionesDeFirma`) alimenta la vista previa de la calculadora y la aceptación. La calculadora enseña la ventana de hoy, el
  saco, la cantidad con el mínimo y la existencia del lote, el escenario de ventas por semanas y el retiro.
- **Añadido**: **el saco y los despachos**: con el primer contrato del lote CTCx compra un saco de 70–200 kg FUERA de lo declarado
  (en las renovaciones, una compra adelantada de 0–200 kg); su despacho nace con plazo al cierre de la semana de firma. El
  productor lo registra (guía, peso, foto), pide prórroga (con advertencia; no si firmó en la semana 1), cancela el contrato o lo
  pasa a la ventana siguiente. «Mi trato» enseña la ventana, la cuenta (declarado · vendido · retirado · en la vitrina · retiro
  libre que queda), las ventas semanales y los despachos con sus pagos 60/40.
- **Cambiado**: **el retiro** se hace solo sobre lo no vendido (`cuenta.ts`, con el ejemplo del owner como prueba); una
  declaración reducida por existencia insuficiente no tiene retiro libre. La existencia del lote (A2) se registra desde la oferta
  aunque la Ficha ya no se edite.
- **Cambiado**: **el contrato** (texto 2026-10-07.1): ventana y cantidad, compra con la firma (o adelantada), ventas y
  confirmaciones semanales, precio con el auxilio citado, entrega y despachos (prórroga, cancelar, ventana siguiente), pago 60/40
  con humedad y actividad de agua, retiro, renovación con el mínimo −10 % por trimestre. La calidad y el auxilio quedan congelados
  en el contrato para que la huella siga íntegra. CTCx Selection no cambia.
- **Cambiado**: **la invitación del OCP** lleva el saco (validado 70–200, o 0–200 si el lote continúa), vence al terminar su
  edición del PVC y «Confirmar la oferta» enseña la ventana que tocaría si el productor firmara hoy. El contrato del OCP se lee
  por su ventana (las acciones de CTCx sobre ventas, despachos y pagos llegan en la tanda 3).
- **Datos**: migración `2026-10-07_ciclos_trato_por_ventanas.sql` (aditiva): columnas de ventana, saco, mínimo, sin retiro,
  existencia, renovación, calidad y auxilio en `purchase_contracts`; saco y renovación en `lot_offers`; tablas `contract_ventas`,
  `contract_retiros` y `contract_despachos` con lectura solo del dueño.
- **Seguridad**: `qa-ciclos` (37 → 53); `qa-trato` retira los bloques de la V5.170, V5.171 y V5.173 y queda en 131; `qa-ofertas`
  al día.
- **Docs**: `PLAN_CICLOS.md` (tanda 2 hecha); charters `kaffetal-regal`, `consolas`; ALINEACION §3.

## [V5.174] — 2026-10-07 (commit 4af0619)

- **Añadido**: **tanda 1 de los Ciclos de Cherry Picked** (`docs/PLAN_CICLOS.md`, owner 2026-10-07): las reglas puras del
  calendario ISO (`src/lib/trato/calendario.ts`: trimestres de 13 semanas, 14 en los años de 53; ciclos 6 + 7 o 7 + 7; semanas
  sin contratos desde 2027; agente y plazo de publicación del PVC siguiente), de la ventana que decide la fecha de firma
  (`ventanas.ts`: ciclo con 25 %, extendida con 30 %, promedio de los dos PVC, renovación), de los mínimos (`minimos.ts`:
  continuidad lineal −10 % por trimestre, existencia insuficiente hasta la mitad sin retiro, producción 5 : 1) y de la
  corrección del PVC por ciclo (`src/lib/pvc/correccion.ts`: 15 de 20 lecturas FNC, alza y baja con tope del 10 %).
- **Añadido**: **las variables de cada edición del PVC** en el Modelo Económico (pestaña Ediciones): fechas (con la propuesta
  ISO a un clic y su validación), mínimos por grado, rangos de calidad de recepción (humedad 10–12 %, aw ≤ 0,70) y auxilio de
  transporte por carga. Las fija el owner, con auditoría. El mínimo de las ofertas del OCP sale ahora de la edición, y el auxilio
  se suma al precio del grado (PVC × multiplicador + auxilio; por fijar = $0). D1 §5 del modelo lo tenía en $0 porque las
  cooperativas no lo pagan por carga.
- **Añadido**: **Ficha A2**: existencia total del lote (kg de CPS, espejada a `lots.existencia_cps_kg`), número de plantas y
  producción estimada con selector cereza/pergamino (5 : 1). Se ven en la vista previa de la Ficha y en el OCP.
- **Cambiado**: **PVC-F4-2026 re-fechado al calendario ISO** (owner: «vale»): 28 sep 2026 – 3 ene 2027, ciclo 1 al 15 nov;
  la oferta abierta que guardaba las fechas viejas se alineó. El PVC siguiente se publica a más tardar el domingo de la semana 2
  del ciclo 2 (para T1-2027: el 29 de noviembre).
- **Datos**: migración `2026-10-07_ciclos_variables_de_edicion.sql`: `pvc_editions.ciclo1_hasta`, `minimos_por_grado`,
  `rangos_calidad`, `auxilio_transporte_cop` (el guard lo deja fijar una sola vez en una publicada); `lots.existencia_cps_kg`;
  re-fechado con fila de auditoría.
- **Seguridad**: guardián nuevo `qa-ciclos-check` (37); `qa-trato` y `qa-pvc-precio` al día.
- **Docs**: `PLAN_CICLOS.md` (tanda 1 hecha); charters `kaffetal-regal`, `consolas`, `herramientas-internas`; ALINEACION §3.

## [V5.173] — 2026-10-06 (commit b5f5e4f)

- **Cambiado**: **«Declarar para Temporada Actual» reemplaza a «Declarar Ahora»** (owner, 2026-10-06: «este modelo es demasiado
  inflexible» — sin el PVC de la siguiente temporada y a 71 días de ella, solo quedaban 30 días renovables). La declaración cubre
  lo que queda de la Temporada Trimestral en curso (si faltan al menos 30 días), al PVC vigente, con la misma lógica de meses del
  trimestre: los meses son los que le quedan, redondeados (30–44 días: 1; 45–74: 2; 75 o más: 3), y el último llega al fin de la
  temporada. CTCx compra entre 10 y 25 kg a su discreción con la firma (no la carga de 125 kg). La renovación de 30 días desaparece.
- **Cambiado**: **la escalera de retiro libre se reparte en los meses del trato**: cada mes cerrado libera su parte del 75 %
  (`TRAMO_LIBRE_DEL_TRATO_PCT`). En el trimestre sigue igual (0 · 25 · 50 %); en dos meses, 37,5 % al cerrar el primero; en un mes,
  nada. La calculadora deja elegir el mes de retiro entre los del trato y muestra la escalera; «Mi trato», el retiro y el
  contrato (texto 2026-10-06.5) la leen de `tramoLibrePct`.
- **Cambiado**: la renovación también se debe al terminar la vigencia del trato (un trato de 70 días no espera los 90 días); el
  contrato de «Temporada Actual» dice que, al terminar la temporada, CTCx puede ofrecer la siguiente con el PVC publicado para ella.
- **Datos**: migración `2026-10-06_declarar_temporada_actual.sql`: `declaracion` admite `temporada_actual` en lugar de `30_dias`
  (ninguna oferta ni contrato lo había guardado).
- **Seguridad**: `qa-trato` (147 → 154).
- **Docs**: `PLAN_CIRCUITO_DEL_LOTE.md` (paso 15, con la decisión del owner); charters `kaffetal-regal`, `consolas`; ALINEACION §3.

## [V5.172] — 2026-10-06 (commit 9458215)

- **Cambiado**: **«Confirmar la oferta» (OCP · Pendiente de Oferta) deja ver que las cifras son dinero y kilos, y que se cambian**
  (owner, 2026-10-06: «no hace muy claro que los números son dinero y que se pueden cambiar, igual que la cantidad»). El precio
  por kg y por carga van en cajas con borde, «$» delante y «COP / kg» o «COP / carga» detrás; la cantidad, con «kg de CPS»;
  todas con separador de miles, un lápiz y resalte al enfocarlas. Debajo de cada una, de dónde sale la cifra (el PVC o el tope
  PVC − 8 %) y, si se cambió, «volver a ese precio». Las condiciones de entrega y las notas, también con borde.
- **Seguridad**: `qa-trato` (146 → 147).
- **Docs**: charter `consolas`; la redeclaración de «Ahora y Siguiente» queda con diez días (owner, 2026-10-06).

## [V5.171] — 2026-10-06 (commit 4ee9532)

- **Añadido**: **la redeclaración de «Declarar Ahora y Siguiente Temporada»** (owner, 2026-10-06: «la opción 1, que quede en el
  70 %»). Diez días antes de que empiece la siguiente Temporada Trimestral se le pide al productor (nota y correo) y en «Mis
  contratos» se abre el botón «Redeclarar»: dice cuánto café deja disponible para la siguiente temporada, nunca menos del mínimo
  (el 70 % de lo declarado, y nunca menos del mínimo del grado), y puede dejar más. Se cierra al terminar el primer día de la
  temporada; sin respuesta, el barrido diario `/api/cron/redeclaraciones` (11:20 UTC) la deja en el mínimo. Lo ya pedido por CTCx
  y lo ya retirado no cambian. Cada redeclaración deja su enmienda en el contrato, su fila en `audit_log` y su nota al productor;
  el OCP la ve en el contrato (pendiente, hecha por el productor o al mínimo).
- **Cambiado**: el contrato de «Ahora y Siguiente» dice cuándo se abre la redeclaración y que sin respuesta queda en el mínimo
  (texto 2026-10-06.4).
- **Datos**: migración `2026-10-06_redeclaracion_ahora_y_siguiente.sql` (aditiva): `purchase_contracts.redeclarado_at`,
  `redeclarado_kg`, `redeclaracion_origen` (productor · automatica), `redeclarar_aviso_at`.
- **Seguridad**: `qa-trato` (137 → 146).
- **Docs**: charters `kaffetal-regal`, `consolas`; ALINEACION §3.

## [V5.170] — 2026-10-06 (commit 6b9222f)

- **Cambiado**: **«Declarar Siguiente Temporada Trimestral» va al PVC de la EDICIÓN SIGUIENTE** (owner, 2026-10-06: «esta ancla
  debe ser fijada en las primeras dos semanas del segundo mes del trimestre anterior»). La oferta de Cherry Picked guarda ese
  precio al emitir (con el mismo % del trato); si la edición siguiente aún no se publica, esa modalidad no se abre en la oferta y
  dice la fecha límite en que se fija (para PVC-F4-2026: el 28 de octubre de 2026). «Declarar Ahora» y «Ahora y Siguiente»
  siguen al PVC de la temporada vigente. La calculadora, el contrato (texto 2026-10-06.3) y el precio fijado usan el de la
  modalidad; el OCP avisa al emitir si conviene esperar a la publicación.
- **Datos**: migración `2026-10-06_oferta_pvc_siguiente.sql` (aditiva): `lot_offers.price_next_kg`, `pvc_next_edition_id`,
  `pvc_next_code`, `temporada_desde`.
- **Seguridad**: `qa-trato` (131 → 137).
- **Docs**: charters `kaffetal-regal`, `consolas`.

## [V5.169] — 2026-10-06 (commit 59b3b8c)

- **Cambiado**: **CTCx ofrece una de dos cosas** (owner, 2026-10-06): **participar en Cherry Picked** (al PVC de la temporada) o
  una **compra de CTCx Selection** (propuesta de venta a **hasta PVC − 8 %**, que no es el PVC). En el OCP el desplegable elige
  entre las dos; en Kaffetal Regal van en secciones separadas.
- **Añadido**: **las tres modalidades de Cherry Picked** (`src/lib/trato/modalidades.ts`): «Declarar Ahora» (los próximos 30
  días si faltan ≥ 30 para la siguiente Temporada Trimestral; CTCx compra entre 10 y 25 kg a su discreción; renovable en la
  ventana, cada renovación enmienda la cantidad y no obliga a más compras), «Declarar Siguiente Temporada Trimestral» (lo usual)
  y «Declarar Ahora y Siguiente Temporada» (si faltan ≤ 50 días; 30 % de retiro libre sin escalones; redeclarar ≥ 70 % al
  empezar la siguiente; CTCx compra 125 kg). La disponibilidad sale de la fecha real de la temporada (edición del PVC).
- **Añadido**: **escenarios de venta en la calculadora**: CTCx no se compromete a comprar fracciones mes a mes; el productor
  elige cuánto vende CTCx (0–100 %) y cuándo (todo apenas empieza, parejo, al final, un mes sin ventas) y ve los KPIs: % vendido,
  lo que recibe, la prima sobre la referencia FNC del día de la oferta, cuánto más que vendiendo a la FNC y lo que le queda.
- **Añadido**: **la negociación de CTCx Selection**: el productor acepta y firma, contraoferta (precio y kilos) o desiste; la
  contraoferta vuelve al OCP («le toca a CTCx»), que acepta (si cabe en el tope), contraoferta o desiste, las veces que haga falta.
  Cada paso queda en `lot_offer_rondas`.
- **Cambiado**: el contrato tiene una versión por tipo (Cherry Picked con su modalidad y la cláusula «sin compromiso de compra
  mensual»; Selection como compra en firme) — texto versión 2026-10-06.2.
- **Añadido**: **el nombre con que se guarda cada documento** lleva el nombre general y el código: «Dossier del lote · Nombre ·
  CTC-L-…», «Visa EUDR · …», «Pasaporte EUDR · Finca · CTC-F-…», «Contrato · …» y la Ficha Técnica al imprimir y al descargar.
- **Añadido**: **la Visa EUDR del lote enlaza el Pasaporte EUDR de cada finca de origen** (también desde el dossier).
- **Datos**: migración `2026-10-06_modalidades_y_contraofertas.sql` (aditiva): `ahora_y_siguiente`, el estado `contraofertada`
  (cuenta como oferta abierta), el tope, la FNC y el fin de temporada en la oferta, la vigencia, el retiro libre, la
  redeclaración y las enmiendas en el contrato, y la tabla `lot_offer_rondas` (RLS: el productor lee las suyas).
- **Seguridad**: `qa-trato` (116 → 131); `qa-ofertas` con las secciones nuevas.
- **Docs**: charters `kaffetal-regal`, `consolas`; ALINEACION §3.

## [V5.168] — 2026-10-06 (commit a252474)

- **Añadido**: **OCP · «Pendiente de Oferta»: cada lote se despliega** (owner, 2026-10-06) con su resumen (sello, Punto SCA,
  tríada, factor, variedad, proceso, altitud, origen, cosecha) y se **confirman los parámetros de la oferta**: cantidad mínima
  disponible de CPS, condiciones de entrega (por defecto: Bucaramanga, en las instalaciones de CTCx) y el precio por kg y por
  carga. El precio llega del PVC; si se cambia, la oferta sale como excepción con motivo.
- **Añadido**: **la calculadora del trato para el productor**: cuánto compromete (en cargas), las dos opciones lado a lado
  (este periodo · 30 días, o el próximo trimestre), cómo llegarían los pedidos y los pagos y qué pasaría si retira café
  (tramo libre y penalidad), sobre el mismo simulador del trato. Al final, «Tomar la decisión».
- **Añadido**: **el contrato con firma con el dedo**: el productor lee las once cláusulas armadas con su decisión
  (`src/lib/trato/contrato.ts`, versión 2026-10-06), escribe su nombre y firma en el recuadro. Aceptar ES firmar: la imagen va a
  Storage privado y el contrato guarda fecha, nombre, dispositivo y la huella SHA-256 del texto firmado. El contrato se ve en
  `/kaffetal-regal/contrato/[id]` (huella comprobada, las dos firmas) y la firma del productor sale en el contrato del OCP.
- **Seguridad**: **el blindaje de los documentos del productor** (owner: el «moat»): el dossier, la Visa EUDR del lote, el
  Pasaporte de la finca, la Ficha y el contrato llevan **marca de agua** (CTCx · referencia · productor · uso exclusivo con
  CTCx · fecha), y **solo se imprimen o descargan con un contrato firmado** (del lote; para la finca, de un lote que salga de
  ella). Sin contrato no hay botón, se bloquean copiar, el menú contextual y los atajos de imprimir y guardar, e imprimir desde
  el navegador saca un aviso en vez del documento (`src/lib/kaffetal/blindaje.ts`).
- **Datos**: migración `2026-10-06_oferta_entrega_y_firma_del_productor.sql` (aditiva): `lot_offers.lugar_entrega` y, en
  `purchase_contracts`, la entrega y la firma del productor (`producer_signed_at`, `producer_signer_name`,
  `producer_signature_path`, `producer_signature_meta`, `contract_text_version`, `contract_text_sha256`).
- **Seguridad**: `qa-trato` (106 → 116).
- **Docs**: charters `kaffetal-regal`, `consolas`; ALINEACION §3.

## [V5.167] — 2026-10-06 (commit 60b77a7)

- **Cambiado**: **el productor ya no ve el ajuste CTCx en el dossier** (owner, 2026-10-06). El grado se presenta como Punto SCA ×
  tríada = puntos CTCx (los puntos finales, sin nombrar el ajuste ni la base); se retiró «lo que pide cada grado con esta tríada».
- **Cambiado**: **«CTC» pasa a «CTCx» en todo el dossier** y en las etiquetas de grado que ve el productor en Kaffetal Regal
  («Grado CTCx»). El barrido del resto de la plataforma quedó como tarea aparte (no toca la razón social ni los códigos CTC-L/F/P).
- **Cambiado**: el perfil de taza es la segunda sección; la mejora y el respaldo van en dos hojas; el contenido de cada hoja
  deja aire abajo (la portada ya no pega el índice al pie).
- **Añadido**: **la hoja del grado, reorganizada**: la tríada junto a una imagen (foto del lote, una de la galería que no se haya
  usado, o la ilustración de CTCx por defecto) y **las variedades del lote según el Mapa de Variedades** (grupo genético, tipo,
  origen, historia, altitud en que se da, grano y notas típicas en taza). Generador nuevo `scripts/build-variedades-datos.mjs`
  → `src/lib/catacion/variedadesDatos.ts` (88 fichas, ES/EN) y emparejador `variedades.ts` (castillo, Gesha, Maragogipe…).
- **Añadido**: **ilustraciones conceptuales minimalistas**: la altitud de la finca sobre una silueta de montañas, una taza en la
  cabecera del perfil de taza y tres granos en la del análisis físico.
- **Añadido**: **conjeturas en «Mejora»** (owner): la lectura del perfil redactada como el reporte de la Rueda del Café (familia
  dominante, una frase por familia, síntesis varietal; la taxonomía de la rueda trae ahora sus varietales) y las hipótesis que
  salen de lo medido y lo declarado (margen en taza, humedad, aw, defecto principal y su causa probable, mallas, factor, densidad,
  altitud frente a la variedad), cada una con su evidencia (`src/lib/kaffetal/conjeturas.ts`).
- **Añadido**: **«Mis Lotes» en Kaffetal Regal trae el botón «Ver el Dossier del lote»** dentro de cada lote galardonado (fila
  completa y tarjeta del carrusel).
- **Seguridad**: `qa-centro-calidad` (278 → 287), con `build-variedades-datos.mjs --check`.
- **Docs**: charters `kaffetal-regal`, `herramientas-cafe`; ALINEACION §3.

## [V5.166] — 2026-10-06 (commit 44426c3)

- **Cambiado**: **el dossier del lote se rehízo con formato CTCx, por hojas A4** (owner, 2026-10-06: «es muy simple; quiero un
  formato interesante, que use los recursos que hemos coleccionado del Lote, la Finca y el Productor, con las gráficas, el mapa
  y figuras conceptuales […] organízalo en páginas […] de la marca CTCx»). Siete hojas que se leen en pantalla y se imprimen
  tal cual (ES y EN): portada con la foto de la finca, el grado y el índice; origen con el mapa de los cafetales (polígono
  encuadrado, sin rótulos ajenos), la ubicación regional, la regla de altitud, la finca y el productor con su avatar, su historia
  y su galería; el grado (El Punto → base × tríada = puntos CTC, la escalera A/B/C de cada atributo, la composición varietal,
  la escala CTC y el Punto SCA que pide cada grado con la tríada del lote); el perfil de taza (radar, rueda de familias con las
  notas marcadas por intensidad); el análisis físico (rendimiento de la muestra, factor, humedad, aw, densidad, granulometría,
  defectos, declarado contra medido); mejora y respaldo (anotaciones de la Rueda del Sabor, certificaciones y la matriz de quién
  respalda cada dato). Hecho con las skills de diseño instaladas el 2026-10-06 (guía anti-plantilla, pautas de interfaz web
  de Vercel y playwright-cli para verificar el PDF hoja por hoja).
- **Añadido**: **la Visa EUDR dentro del dossier** (owner): estado, la cadena finca → lote → DDS → comprador UE, los siete
  criterios del Pasaporte de la finca, riesgo del país, DDS, sellos con cobertura total y la geolocalización con las
  coordenadas de cada vértice (Art. 9).
- **Cambiado**: el grado del dossier muestra el ajuste CTCx cuando lo hubo (era un pendiente de la V5.165).
- **Corregido**: el PDF del dossier pesaba 35 MB (una foto de 5.700 px y el sello EUDR de 4.266 px se incrustaban sin
  compresión): las fotos van orientadas, reducidas a 1.600 px y en JPEG, los mapas en JPG y el sello en 560 px. Ahora ~3 MB.
- **Datos**: `sharp` pasa a dependencia explícita (ya venía con Next).
- **Seguridad**: `qa-centro-calidad` (269 → 278); `qa-registro` apunta al documento nuevo.
- **Docs**: charter `kaffetal-regal`; ALINEACION §3.

## [V5.165] — 2026-10-06 (commit 2938408)

- **Añadido**: **el dossier del lote galardonado incluye TODO: B1, B2 y B3** (owner, 2026-10-06), en ES y EN. B1 es lo que
  declaró el productor (variedades con su %, especie, humedad, densidad, aw y factor, con «No lo sabe» dato por dato); B2 y B3
  salen de la planilla de la evaluación que rige el grado: los diez atributos SCA con total y tazas (o el CVA), la rueda del
  sabor con etapas e intensidad, acidez y sensación en boca, el perfil; pesos, humedades, aw, densidad, % de almendra
  defectuosa, factor de rendimiento, el detalle de defectos (la Broca primero), la granulometría y las notas del análisis
  (`src/lib/kaffetal/dossierEvaluacion.ts`, `LotDossierDoc`).
- **Añadido**: **las anotaciones de mejora de la Rueda del Sabor** (owner) — lo que la herramienta llama «Aspectos a revisar
  en el beneficio»: cada nota de defecto marcada con su posible causa. Van en el dossier, en la tarjeta del productor en
  Kaffetal Regal (galardonado y «No supera», bajo el feedback del Q-Grader) y en el reporte de mejoras con IA, que ahora
  parte de ellas. Si la rueda no marcó defectos, se dice («perfil sin defectos de proceso»).
- **Cambiado**: la taxonomía de la rueda (`ruedaDatos.ts`, generada por `scripts/build-rueda-datos.mjs`) trae ya las 25
  causas de la herramienta en ES y EN; `anotacionesDeMejora(rueda, lang)` en `src/lib/catacion/rueda.ts`.
- **Seguridad**: `qa-centro-calidad` (258 → 269).
- **Docs**: charters `kaffetal-regal`, `herramientas-cafe`, `consolas`; ALINEACION §3.

## [V5.164] — 2026-10-06 (commit 86340d2)

- **Cambiado**: el **resumen del resultado es OPCIONAL y va al lado de los botones** del veredicto (owner, 2026-10-06: «que sea
  obligatorio lo hace muchas veces innecesario, y además está muy lejos del botón»), en el informe del Centro y en «Registrar a
  mano». Si se deja vacío, el servidor escribe uno por defecto para el productor («Galardonado Red · SCA 2004 nativo 85.00.» /
  «No superó la evaluación esta vez · …»), del que también parte el reporte de mejoras con IA.
- **Añadido**: **el avance se extiende a las demás acciones largas de las consolas** (owner) con un hook compartido
  (`useAvance` / `conAvance`, `src/components/panel/ProgresoDeAccion.tsx`) y una tabla de tiempos típicos (`AVANCE`) que se
  ajusta con lo que tarda cada acción en el navegador: OCP — emitir la factura, enviar el bache al Centro, acordar la
  re-evaluación, generar las mejoras con IA, escanear los soportes con IA y compilar la ficha; BCP — invitar y reenviar la
  credencial de un socio, invitar, reenviar y restablecer la contraseña de un usuario de las consolas, reenviar el correo de
  un llamado de Terratalento (`EnviarConAvance`, para formularios de servidor); LCP — responder desde el buzón; ECP —
  redactar con IA en la Definición de Contexto. Un fallo de red ya no deja ninguno de esos botones colgado.
- **Seguridad**: `qa-centro-calidad` (255 → 258).
- **Docs**: charter `consolas`.

## [V5.163] — 2026-10-06 (commit f70ed29)

- **Corregido**: en el informe del Centro (OCP) y en «Registrar a mano», **«Galardonar», «No supera» y «Enviar de vuelta» ya no
  quedan mudos** (owner, 2026-10-06: «al dar click a Galardonar no sucede nada; si hay algo bloqueando, debe aparecer un
  mensaje»). Se deshabilitaban en silencio cuando faltaba algo —típicamente el «Resumen del resultado»—. Ahora responden
  siempre: si falta algo, lo dicen justo debajo («Para galardonar falta: escribir el «Resumen del resultado» (el productor lo
  verá)»; el Punto, los puntos para Black, el argumento del ajuste, el Q-Grader, la recata) y llevan el foco a la casilla.
- **Añadido**: **el avance de la acción** (owner: «si se hizo el trigger pero toma un momento, necesito algo que muestre que es
  así y cuánto falta»): mientras corre, «⏳ Registrando el galardón (Red)… 4 s · faltan ~16 s (estimado)» con una barra; si
  tarda más de lo habitual, lo dice y pide no cerrar la ventana. El estimado parte de un valor típico (galardonar ~4 s; «No
  supera» ~25 s porque redacta las mejoras con IA; devolver ~2 s) y aprende de lo que de verdad tarda en ese navegador
  (`src/components/panel/ProgresoDeAccion.tsx`). Un fallo de red ya no deja el botón colgado: se dice.
- **Seguridad**: `qa-centro-calidad` (250 → 255).

## [V5.162] — 2026-10-06 (commit 2d671ea)

- **Añadido**: **el ajuste CTCx** en el informe del Centro (OCP): CTCx puede sumar **hasta 100 puntos** al puntaje final, que
  mueven el grado hacia arriba (owner, 2026-10-06), **con un argumento obligatorio** (al menos 30 caracteres) que justifique el
  incremento — pensado para un lote a poco del siguiente grado con un factor extraordinario que va más allá de lo registrado.
  El informe dice cuántos puntos le faltan al siguiente grado; «Galardonar» queda bloqueado sin argumento; la tríada y la
  curva enseñan el ajuste. Se suma a Punto × Tríada (`puntosCtc(sca, tríada, ajuste)`) sin saltar las dos puertas duras: sin
  especialidad (SCA < 80) no hay ajuste y Tyrian sigue exigiendo SCA ≥ 89 y surplus (si no, tope 2.000).
- **Datos**: migración `evaluaciones_ajuste_ctcx` (acta `docs/migraciones/2026-10-06_…sql`): `lot_evaluations.ajuste_ctcx_puntos`
  (0–100), `ajuste_ctcx_justificacion` (la base exige ≥ 30 caracteres si hay puntos), `ajuste_ctcx_por`, `ajuste_ctcx_at`. El
  ajuste vive en la evaluación que rige: «la que rige» de la Arena recalcula el grado con él. Cada ajuste deja `ajuste_ctcx`
  en `audit_log`.
- **Añadido**: **el log de devoluciones** (owner: «que queden los comentarios enviados de vuelta en un Log al final»): al final
  del informe del OCP y de la planilla del Centro, cada devolución del lote con su fecha y su motivo, la más reciente primero.
- **Seguridad**: `qa-grados` (+6: el ajuste y sus puertas), `qa-centro-calidad` (244 → 250).
- **Docs**: ALINEACION §1 (contrato de grados: el ajuste) y §3; charters `consolas` y `socios`.

## [V5.161] — 2026-10-06 (commit 7060037)

- **Corregido**: **un lote devuelto desde el OCP al Centro de Calidad ya no llega con la planilla vacía** (owner, 2026-10-06:
  «toda la información registrada se borra cuando llega de vuelta»). La información nunca se borró —la fila devuelta conserva
  la planilla en `physical_data.planilla`, las notas, el código interno y el reporte adjunto—, pero la pantalla del Centro
  solo sabía arrancar desde un borrador y abría la hoja vacía. Ahora un alta devuelta reabre con todo lo registrado
  (`semillaDeDevuelta`); si el Q-Grader guardó un borrador después, manda el borrador.
- **Corregido**: el motivo de CTC ya no se mezcla con las notas del Q-Grader (`src/lib/evaluaciones/devolucion.ts`): las notas
  vuelven a su casilla y el motivo se enseña aparte en el Centro y en el OCP; devolver dos veces no apila motivos.
- **Datos**: CTC-L-0B9C1C04 no requirió restauración — su alta devuelta estaba íntegra (diez atributos SCA, rueda, tazas,
  B3, mallas y detalle de defectos, código `CTC-L-0B9C1C04_MOCK`, reporte adjunto) y se reabre con esta versión.
- **Seguridad**: `qa-centro-calidad` (239 → 244: la acción de devolver no toca la planilla; la semilla de la devuelta; el caso
  real del lote).

## [V5.160] — 2026-10-06 (commit 3054f7d)

- **Cambiado**: **CONTRATO (ALINEACION §1) — el grado es El Punto y la Tríada** (owner, 2026-10-06: «la definición de la franja
  [SCA de dos en dos] es OBSOLETA; retirarla de TODOS LADOS y dejar solo la regla del Punto y la Tríada»). La escala de puntos
  CTC del Modelo Económico (`src/lib/pvc/escala.ts`, decisión #1 del plan PVC) GOBIERNA: `definicion.ts` lee de ella sus
  bandas (Black 1000–1399 · Red 1400–1599 · Blue 1600–1799 · Gold 1800–2000 · Tyrian 2001–2500) y deriva el grado con
  `gradoDelLote(sca, tríada)` = Punto SCA de la taza × multiplicador de la tríada (variedad · proceso · reconocimiento, C/B/A).
  Un café común (CCC) entra en Black desde 82, es Red desde 84, Blue desde 88, Gold desde 89 y nunca Tyrian; con surplus las
  bandas se adelantan. `gradoPorPuntaje` y los campos `scaMin`/`scaMax` desaparecen; `gradoFirme`, `techoDelPunto` y
  `decidirPorPunto` exigen la tríada. La tríada de un lote se deriva de su Ficha (`triadaDeLaFicha`; el proceso se lee del
  base y del especial juntos). Ningún lote tenía grado asignado: no hay datos que mover.
- **Cambiado**: lo escriben con la regla nueva el veredicto del OCP (`recordEvaluationVerdict`, tríada de la Ficha del
  lote), «la que rige» de la Arena y las previsualizaciones (informe del Centro, «Registrar a mano», `LabEvalEditor` con
  `triada`). Lo enseñan con ella: el tablero **Grados de Calidad** del ECP (escalera en puntos + calculadora con la tríada),
  el Modelo Económico (ya no avisa «no gobierna»), la escalera de Kaffetal Regal («1.600–1.799 pts · SCA desde 88 (café
  común)»), los rótulos de la escalera del PVC, el JSON-LD de los grados y la memoria de la IA de Direccionamiento.
- **Retirado**: `FranjaDeGrados` (la franja SCA del informe) y las notas «no gobierna / no coinciden» de la V5.159.
- **Datos**: (mock) los siete lotes del Sneak Peek se reclasificaron con su tríada (variedad + proceso): BL-4C1A y BL-9E33
  (antes GD-…), CTCX-0326005 y BL-2F70 Blue, RD-8B15 y RD-3D62 (antes BL-…), BK-6A08 Black con el estimado subido de
  81,50 a 82,50 (un café común por debajo de 82 no entra). PDF regenerados (`build-fichas-mock`), ahora con la banda de puntos.
- **Seguridad**: `qa-grados` reescrito (53: bandas de puntos, SCA desde el que entra un café común, 15 casos Punto × tríada),
  `qa-centro-calidad` (239: R4/R5/R6 con la tríada), `qa-evaluaciones`, `qa-sneak-peek` (grado = Punto × tríada del mock),
  `qa-pvc-escala` (el tablero dice que gobierna), `qa-pvc-precio` (rótulos en puntos), `qa-direccionamiento` (memoria).
- **Docs**: ALINEACION §1 (contrato de grados reescrito) y §3; plan PVC (fase 2: la escala gobierna); charters `consolas`,
  `herramientas-internas`, `kaffetal-regal`, `cherry-picked`.

## [V5.159] — 2026-10-06 (commit 01b2451)

- **Cambiado**: en el informe del Centro, **las dos reglas quedan rotuladas** (owner, 2026-10-06: «no entiendo por qué en un
  lado sale Blue y abajo sale Red»): «1 · Grado que la plataforma asigna hoy — solo el Punto de la taza» (la franja,
  `definicion.ts`, lo que de verdad se galardona) y «2 · Escala de puntos CTC “El Punto y la Tríada” — en validación, todavía
  no gobierna el grado» (§9.1 del plan PVC: la misma taza vale distinto según variedad, proceso y reconocimientos). Cuando
  no coinciden, una línea lo dice con los dos grados y aclara que vale la de arriba.
- **Seguridad**: `qa-centro-calidad` (237 → 239).

## [V5.158] — 2026-10-06 (commit 37a5997)

- **Cambiado**: el informe del Centro en el OCP muestra **la Ficha Técnica completa del lote** (owner, 2026-10-06: «quiero que
  se vean todos los datos») — A1 identidad, A2 origen, A3 certificados y reconocimientos, variedades, caracterización básica,
  B2/B3 y notas — de solo lectura, con el mismo renderizador de la «Vista de Ficha» del productor (`FichaCompletaLectura`),
  abierta por defecto y plegable. El resumen B1 de la V5.157 queda solo cuando la Ficha está plegada.
- **Añadido**: **la tríada A · B · C del lote** (owner: «debe salir la escala A B C para cada parámetro de la tríada en la que
  cae»), derivada de su Ficha (`src/lib/pvc/triadaDelLote.ts`): variedad dominante contra el catálogo semilla (sinónimos:
  Gesha, Maragogipe, Castillo (General)…; fuera del catálogo, C con el porqué), proceso (Lavado C · Honey/Natural/infusiones
  B · fermentaciones/experimental A) y reconocimientos declarados en A3 (0 · 1–3 · 4+). Cada parámetro con sus tres letras
  y la elegida encendida, los puntos de la escala con el Punto de la taza, y **la misma curva del Modelo Económico**
  (`CurvaDeEscala`, que sale de `EscalaBoard` a su propio archivo). La escala sigue siendo referencia: el grado firme sale
  del Punto.
- **Seguridad**: `qa-centro-calidad` (230 → 237).
- **Docs**: charters `consolas` y `herramientas-internas`, ALINEACION §3.

## [V5.157] — 2026-10-06 (commit cd71847)

- **Añadido**: el informe del Centro en el OCP trae **el B1 del lote** —finca, variedades con su proceso, especie, altitud,
  humedad, densidad, aw, factor y puntaje estimado que declaró el productor— y con la planilla del Centro (B2 y B3) forma
  **la vista completa de la Ficha Técnica** antes de decidir (owner, 2026-10-06).
- **Añadido**: **la franja de grados con el Punto encima** (`FranjaDeGrados`): la escalera de `definicion.ts` (Black · Red ·
  Blue · Gold · Tyrian, con «< 80 · sin grado»), la aguja en el piso del Punto, el intervalo sombreado si es homologado, y la
  lectura de **la combinación**: en qué grado cae y qué espera ese grado de la variedad y del lote.
- **Seguridad**: `qa-centro-calidad` (227 → 230).

## [V5.156] — 2026-10-06 (commit cd52a57)

- **Cambiado**: en el detalle de defectos de la planilla, **una «i» en frente de cada defecto** (los 16: qué es, de dónde viene,
  qué hace en la taza y su equivalencia) y ya no una «i» doble junto a la R (owner, 2026-10-06). Los textos viven en el
  catálogo INFO de la Coffee Datasheet Tool (`def_<clave>`, ES · EN · DE), que también los enseña en sus tablas de defectos;
  `planillaInfo.ts` regenerado (58 → 74 conceptos).
- **Seguridad**: `qa-centro-calidad` (227), `qa-coffee-datasheet` (1.346 → 1.410).

## [V5.155] — 2026-10-06 (commit 41178b8)

- **Cambiado**: en el OCP, «Lotes en Evaluación», el alta del Centro ya no se confirma a ciegas (owner, 2026-10-06: «no hay
  forma de ver el trabajo hecho»): el botón es ahora **«Abrir el informe del Centro y decidir…»** — Q-Grader, Punto, código
  del laboratorio, notas, reporte original adjunto y **la planilla completa de solo lectura** (la misma hoja, deshabilitada)
  — y desde ahí se galardona, se registra «No supera» o se **envía de vuelta al Centro para revisión con una nota**.
- **Añadido**: en el Centro de Calidad, «01 Evaluación de Lotes» tiene **dos pestañas: Baches en Fila · Baches completados**
  (un bache está completado cuando todos sus lotes fueron dados de alta y confirmados por CTC, o cuando CTC lo cerró), y
  **cada bache es un bloque desplegable** (los de la fila abiertos; los completados plegados). La página sigue sin leer
  nombres.
- **Seguridad**: `qa-centro-calidad` (223 → 227).
- **Docs**: charters `consolas` y `socios`.

## [V5.154] — 2026-10-06 (commit 754ecc0)

- **Añadido**: en B3 de la planilla, **«% de almendra defectuosa»**, derivado — (defecto primario + secundario) ÷ trillado
  verde restante × 100 — junto al grano sano (owner, 2026-10-06). Misma aritmética en la Ficha (`computeFactor.defectivePct`) y
  en la Coffee Datasheet Tool (`calcFactor.defPct`, en el renglón del factor).
- **Añadido**: la **R** de «Registrar detalle» lleva su «i» (`f_registro`: qué es el detalle y qué no cambia), también en las
  tablas de defectos de la herramienta.
- **Cambiado**: en los defectos primarios, **«Daño por insecto grave (Broca)» va de primero**, en la plataforma y en la
  herramienta (una sola lista; `fisico.ts` y `DEFECTOS`/`df_insecto_grave`).
- **Seguridad**: `qa-centro-calidad` (219 → 223), `qa-coffee-datasheet` (1.340 → 1.346).

## [V5.153] — 2026-10-05 (commit 759f70f)

- **Añadido**: en la planilla de evaluación (Centro de Calidad, «Registrar a mano» del OCP y la Arena) **B3 reporta también
  el factor de rendimiento, la actividad de agua (aw) y la densidad (g/L)** (owner, 2026-10-05) — los mismos campos de la
  Ficha (`b3_factor_reportado`, `b3_actividad_agua`, `b3_densidad_verde`). El factor derivado de los pesos manda; el
  reportado vale cuando no hay pesos (`factorDeLaPlanilla`), y es el que se guarda como `factor_rendimiento`.
- **Añadido**: **un botón «i» en cada concepto de la planilla** — vista, escalas, los diez atributos SCA y las ocho secciones
  CVA, tazas, puntajes, rueda, acidez, boca, perfil y todo B3 — con los textos de la Coffee Datasheet Tool, en ES · EN y con
  su norma: `src/lib/arena/planillaInfo.ts` se GENERA del catálogo INFO de la herramienta (`scripts/build-planilla-info.mjs`),
  una sola fuente. La herramienta gana cinco conceptos (humedad, aw, densidad, factor reportado, perfil) y su «i».
- **Cambiado**: **las tazas usadas se eligen también en el CVA, de 1 a 5**, y en el SCA 2004 pasan de 1–10 a **1–5** (owner:
  el formulario es de cinco tazas). `cva_num_tazas`; u y d se cuentan sobre las tazas usadas (todas defectuosas por igual ⇒
  u = 0, sea cual sea N). Mismo selector en la Coffee Datasheet Tool (`fa_factor_reportado` también allí).
- **Seguridad**: `qa-centro-calidad` (209 → 219: tazas 1–5 en los dos protocolos, los tres campos de B3 en el alta, cada
  «i» con su clave en el catálogo) y `qa-coffee-datasheet` (1.305 → 1.340: paridad CVA con N tazas, factor que vale,
  `planillaInfo.ts` al día con la herramienta).
- **Docs**: charters `consolas` y `herramientas-cafe`, ALINEACION §3.

## [V5.152] — 2026-10-05 (commit 36b5ccd)

- **Cambiado**: el adjunto del reporte original del Q-Grader **se ve como un botón** (owner, 2026-10-05: «no parece un botón
  para hacer una acción»): «📎 Adjuntar el reporte original del Q-Grader (opcional)», como «Usar mi código interno»; abre
  el selector de archivos y el campo nativo queda oculto. Adjunto, enseña el nombre con «Quitar». En el Centro y en el OCP.
- **Seguridad**: `qa-centro-calidad` (208 → 209).

## [V5.151] — 2026-10-05 (commit 6027e6a)

- **Añadido**: en cada evaluación de lote, **el reporte original del Q-Grader en su propio formato institucional**, como
  adjunto opcional (owner, 2026-10-05): PDF, imagen u Office, hasta 20 MB. Está en la planilla del **Centro de Calidad**
  (viaja con «Guardar y terminar más tarde» y con el alta) y en **«Registrar a mano»** del OCP (con su planilla, y de ahí
  a la evaluación oficial al galardonar). El archivo va del navegador a Storage con URL firmada —tras la compuerta de cada
  lado— y solo se registra si llegó (`src/lib/evaluaciones/reporte.ts`, pieza `AdjuntoReporteQGrader`). Se usa
  `lot_evaluations.reference_asset_id`, que ya existía para la oficialización del productor.
- **Cambiado**: el Centro ve el reporte adjunto a su alta; el OCP lo ve en «Lotes en Evaluación» (alta del Centro) y en
  la lista de planillas a mano.
- **Datos**: migración `evaluaciones_reporte_original_q_grader` (acta `docs/migraciones/2026-10-05_…sql`):
  `lot_evaluations.reference_file_name`; `evaluacion_borradores.reference_asset_id` + `reference_file_name`.
- **Seguridad**: `qa-centro-calidad` (197 → 208): reglas del archivo, ruta por lote, registro solo con el objeto en
  Storage, compuertas de los dos lados y la pieza en los dos idiomas. Flujo real firmar→subir→registrar→URL firmada
  comprobado a mano contra Storage (objeto y fila de prueba borrados).
- **Docs**: charters `consolas` y `socios`.

## [V5.150] — 2026-10-05 (commit fae0f0f)

- **Corregido**: **la altura de un cafetal se trae sola del mapa** (owner, 2026-10-05: «no siempre se está guardando la
  altura… asegúrate de que el sistema tome la acción de Traer del mapa»). Antes solo llegaba si el productor pulsaba el
  botón. Ahora, en cuanto se marca la ubicación, se consulta: **la del punto** o, con polígono, **el promedio de la altura
  de sus vértices** (`alturaDeLaGeometria`, `lookupElevations`). Una altura escrita a mano después de ubicar se respeta y
  una ya guardada no se pisa al abrir; con la finca aprobada no se consulta nada. El botón sigue para traerla de nuevo.
- **Corregido**: la Ficha copiaba la altura de la finca **una sola vez**, al elegirla en A2 — si la finca aún no la tenía,
  la Ficha quedaba sin altura para siempre (Alto de Reinas, CTC-L-7E360302). Ahora la toma de la finca primaria cada vez
  que se abre (y la geo-referencia, si no la tenía), y en el OCP la fila «Altitud» cae a la de la finca cuando la Ficha
  se cerró sin ella.
- **Añadido**: en el OCP, en «FT · Identidad y Origen», **«✎ Cambiar el nombre»** del Producto (owner, 2026-10-05).
  `renombrarProducto` (acción `emite`) escribe `lots.name` y `datasheet.product_name` juntos, deja `lote_renombrado` en
  `audit_log` y avisa al productor en su feed — lo que la V5.146 hizo por SQL y sin aviso.
- **Datos**: dos lotes cuya Ficha no tenía altura se completaron con la de su finca (`ficha_altitud_m` + `datasheet.masl`;
  rastro `altitud_completada` en `audit_log`): CTC-L-7E360302 (1624 msnm) y CTC-L-37E426A3 (992 msnm).
- **Seguridad**: `qa-area` (39 → 55: Open-Meteo simulado — promedio de vértices, punto, fallos sin lanzar; atrapó que
  `lookupElevation` dejaba de redondear) y `qa-visa` (89 → 97; su chequeo de orden ya tolera CRLF).
- **Docs**: charters `kaffetal-regal` y `consolas`, ALINEACION §3.

## [V5.149] — 2026-10-04 (commit b119409)

- **Añadido**: **Gulliver · 7 días a Tokio** (`gulliver`, Plus), herramienta NUEVA del taller: japonés de bolsillo para
  hispanohablantes del café que van a SCAJ 2026 (Tokyo Big Sight, 14–17 oct) — siete misiones con voz, misión extra «Negocios»,
  repaso, números y conversor de monedas sin conexión, libro de 98 frases para enseñar en pantalla. V1.1 sobre la V1.0 del owner
  (brief `docs/componentes/briefs/herramientas-cafe-gulliver.md`, aprobado con «sí a todo»). Superficies KR · web · DC.
- **Añadido**: memoria con **esquema propio** y tres modos (suelta · trabajo · marco). **Dentro de un iframe la herramienta no lee
  ni escribe `localStorage`**: un trabajo nuevo llega con `init` sin estado y el puente no llama a `poner()`; con la V1.0, ese
  trabajo abría con el avance del último abierto en el navegador (verificado: 999 granos y un sello ajenos).
- **Añadido**: los **descargos de la casa** — pie legal en la bienvenida, la Ruta y En la feria; «Acerca de esta herramienta» en
  pop-up (Qué es · Límites · La feria · Monedas · Tus datos · Créditos); la hoja impresa con la línea legal y el NIT. La voz
  prefiere una voz japonesa local (una en línea manda el texto, con el nombre de la persona, a su proveedor).
- **Cambiado**: la fecha de la feria vive en UN bloque (`/*<EVENTO>*/`); antes «14 de octubre» estaba en cuatro sitios.
- **Cambiado**: `build-tool-shots.mjs` puede preparar un estado de ejemplo antes de capturar (`PREPARAR`) y, con ids por
  argumento, mide el éxito contra las pedidas.
- **Seguridad**: `qa-gulliver-check.mjs` (63, nuevo); `qa-tools-puente-conformance` con sonda para Gulliver (15/15) y ahora
  **falla si una sonda revienta** (antes aprobaba con una nota); `qa-tools-carpetas` (175 → 185), `qa-tools-seo-check` (257 → 273).
- **Datos**: alta de `gulliver` en `tools` + `tool_versions` (origen `repo`) con el archivo ya desplegado.
- **Docs**: ficha `herramientas-cafe/gulliver/README.md`; charter, recuento y briefs al día.

## [V5.148] — 2026-10-02 (commit 3efd095)

- **Cambiado**: la planilla del **Centro de Calidad ya no enseña el grado** (owner, 2026-10-02: «el grado depende también de
  otros factores que son parte del B1, que aquí no se reflejan»). Bajo el puntaje queda el Punto que rige y su procedencia; se
  quitan «grado firme …», el «hasta … con recata» y «sin grado». El aviso de recata pendiente (cuando el intervalo cruza los
  80) se conserva: habla del puntaje, no del grado. CTCx lo sigue viendo en «Registrar a mano» y en la Arena, y la Coffee
  Datasheet Tool —que sí lleva B1— no cambia (`ocultaGrado` en `LabEvalEditor`).
- **Seguridad**: `qa-centro-calidad` (194 → 197).

## [V5.147] — 2026-10-02 (commit aae7731)

- **Cambiado**: en el Centro de Calidad, **el código interno de la muestra pasa arriba a la derecha de la planilla y llega
  plegado** (owner, 2026-10-02: «que se despliegue si se elige usarlo»): un botón «＋ Usar mi código interno (opcional)» abre
  la casilla; si queda vacía se vuelve a plegar, y un borrador que ya lo traía la muestra abierta.
- **Añadido**: en «Defectos de taza, taza a taza» (SCA 2004) se elige **el número de tazas usadas** (1 a 10; cinco por
  protocolo). Al cambiarlo, las tazas para marcar se ajustan —las que sobran se quitan, las que faltan nacen limpias— y el
  tope de tazas con defecto es ese número (`sca_num_tazas`, `tazasUsadas`, `TAZAS_SCA`). Una planilla anterior, sin el dato,
  se lee con cinco. Las cinco tazas del CVA no cambian.
- **Añadido**: el mismo selector en la **Coffee Datasheet Tool** (ES · EN · DE), con el mismo cálculo que la planilla.
- **Seguridad**: `qa-centro-calidad` (186 → 194) y `qa-coffee-datasheet` (1.300 → 1.305: el puntaje con N tazas es el de la
  plataforma, caso a caso).
- **Docs**: charters `consolas` y `herramientas-cafe`.

## [V5.146] — 2026-10-02 (commit 23112c7)

- **Añadido**: en «Lotes en Evaluación» y «Lotes a Evaluar» (OCP), **el nombre de cada lote es el enlace a su perfil**
  (`/ocp/kr?lote=`): en los baches, las altas del Centro, los que no superaron y los reembolsos pendientes (owner, 2026-10-02).
  En Solicitudes el renglón sigue siendo el acordeón, con el enlace dentro.
- **Datos**: tres lotes que se llamaban «Castillo 2026» cambiaron de nombre en la base, a pedido del owner —`lots.name` y el
  `product_name` de su Ficha—, con rastro en `audit_log` (`lote_renombrado`): CTC-L-7E360302 → «Castillo Lavado Alto de Reinas
  2026»; CTC-L-323FEDE6 → «Castillo Honey + Fermentación anaerobica alcohólica La Floresta 2026»; CTC-L-016DF280 → «Castillo
  Lavado Ruiyeñores 2026». Ninguno tenía fichas emitidas, ofertas, contratos ni publicación que llevaran el nombre viejo.
- **Seguridad**: `qa-solicitud-evaluacion` (93 → 95).

## [V5.145] — 2026-10-02 (commit b0a2ad1)

- **Corregido**: **la sesión del Centro de Calidad (y de todos los socios) ya no se cierra sola** (owner, 2026-10-02: «que dure al
  menos 10 horas sin cerrarse automáticamente»). No había un límite de tiempo: la sesión del socio vivía en la cookie compartida
  de las plataformas públicas, y se la llevaba cualquier otra cosa del mismo navegador —una sesión asistida la reemplazaba,
  Kaffetal Regal la cerraba al ver una cuenta que no es de productor, y salir de cualquier plataforma la borraba—. Ahora vive en
  **su propia cookie** (`ctc-socios-auth`), como la de las consolas. No vence por tiempo: dura hasta que el socio sale.
- **Añadido**: mientras la pantalla de Evaluación de Lotes está abierta, un **latido** cada 15 minutos (y al volver a la pestaña)
  mantiene fresca la sesión. Si aun así se cerró, un aviso lo dice arriba, sin perder lo digitado, con el enlace para entrar de
  nuevo en otra pestaña.
- **Cambiado**: el proxy renueva también la cookie de los socios, solo en las rutas de `/socios`.
- **Seguridad**: `qa-centro-calidad` (173 → 186) ejecuta la librería real: la sesión del socio se escribe en su cookie, sobrevive
  al cierre de una sesión asistida, las plataformas públicas no la ven y su vida supera las 10 horas.
- **Docs**: ALINEACION (contrato «Sesiones y cookies»: son tres) y §3, charter `consolas`.

## [V5.144] — 2026-10-02 (commit 56abe7c)

- **Corregido**: en B3, **la suma de las mallas se compara con el trillado verde restante, no con el grano sano** (owner,
  2026-10-02: «los defectos primarios y secundarios hacen parte del trillado verde restante… ya estaban incluidos allí»). Un
  análisis bien hecho —207,0 g de mallas sobre 207,7 g de verde— salía como «las mallas pesan más que el grano sano»; ahora
  cuadra, con 0,7 g de residuo. El factor de rendimiento no cambia: sigue sobre el grano sano. Vale para la planilla del Centro
  de Calidad, «Registrar a mano» del OCP, la Arena y la Ficha del productor (una fórmula, no dos).
- **Añadido**: en el Centro de Calidad, **«Guardar y terminar más tarde»** — la planilla a medio llenar queda guardada y se retoma
  después, en ese u otro equipo, con «Continuar evaluación…». No exige la planilla completa, CTCx no la ve y se borra al dar de
  alta el lote.
- **Añadido**: arriba de la planilla del Centro, **«Su código interno de la muestra»** (opcional): el código con que el laboratorio
  lleva esa muestra, independiente del de CTCx. Viaja con el alta y con el borrador; lo ve el Centro en su lista y CTCx en «Lotes
  en Evaluación».
- **Añadido**: **comentario opcional** en Acidez y en Sensación en boca (una línea cada uno; no entra en el puntaje).
- **Añadido**: en B3, **Humedad verde (%)**, junto a la del pergamino (el mismo campo de la Ficha del productor).
- **Datos**: migración `evaluacion_borradores_y_codigo_interno` — tabla `evaluacion_borradores` (una por lote y credencial; solo
  service role) y columna `lot_evaluations.codigo_interno`.
- **Seguridad**: `qa-centro-calidad` (152 → 173), con el caso de la captura del owner.
- **Docs**: acta de la migración, charters `consolas` y `kaffetal-regal`, ALINEACION §3.

## [V5.143] — 2026-10-02 (commit 8133062)

- **Cambiado**: en la Ficha del lote (Kaffetal Regal), **las fotos y los videos de B4 son todos opcionales** (owner, 2026-10-02;
  antes se exigían dos fotos). Si el productor cierra el paso sin ninguno, la Ficha le avisa que las imágenes son parte del
  atractivo de su café y le recomienda subir al menos una; si continúa, su lote se muestra con la **imagen por defecto** de CTCx
  («Fincas y lotes de origen respaldado», `src/lib/imagenDeOrigen.ts`). La misma imagen es ahora la de una finca sin foto de perfil.
- **Añadido**: **«Agregar Referencias, Fotos y Videos»**, debajo de «Ficha (vista final)» y en el menú de la Ficha. Con la Ficha ya
  cerrada, el productor suma material nuevo **sin pedir una revisión de la Ficha**: otro reporte de perfil de taza, otro análisis
  físico o granulometría, más fotos y más videos. Solo agrega: lo enviado no se puede retirar ni reemplazar, y la Ficha no cambia.
  De un reporte se puede pedir revisión a CTCx, al agregarlo o después.
- **Añadido**: en el OCP, la vista del lote lista lo que el productor agregó, con sus archivos, lo que está por revisar y
  «Marcar revisada» con una nota que el productor lee bajo su referencia y en su feed.
- **Datos**: migraciones `lot_referencias_y_fotos_opcionales` y `lot_referencias_ficha_cerrada_por_etapa` — se retira el guard
  trigger `guard_lot_fotos_intake`; tabla nueva `lot_referencias` (RLS: el productor solo lee e inserta lo suyo; sin UPDATE ni
  DELETE) y función `solicitar_revision_de_referencia`; el borrado nuclear la incluye en su instantánea. Las 7 imágenes de relleno
  «Paisaje de finca.jpg» se desvincularon de tres lotes y de una finca, que pasan a mostrar la imagen por defecto; los archivos
  se conservan en Storage.
- **Seguridad**: `qa-guard-check` (se corre a mano contra producción: 20 de 20) comprueba que la Ficha cierra sin fotos y que una
  referencia no se agrega con la Ficha abierta, ni se edita, ni se retira, ni se firma como revisada por el productor.
  `qa-kr-ficha` (228 → 250), `qa-borrado-nuclear` (32 → 33).
- **Docs**: acta de la migración, charters `kaffetal-regal` y `consolas`, ALINEACION §3.

## [V5.142] — 2026-10-02 (commit 5c1d669)

- **Añadido**: en la revisión EUDR de una finca (OCP), **cada parcela se puede ver en el mapa** (owner, 2026-10-02: «si una finca
  reportó varios cafetales, solo aparece uno»). Con más de una parcela ubicada, arriba del mapa hay un selector —«Todas (N)» y una
  por cafetal— y los renglones de la lista «Parcelas» también se tocan. «Todas» pinta cada polígono y un pin numerado por parcela;
  una sola la encuadra y trae su área, su coordenada con «Copiar» y su enlace a Google Earth. Con una sola parcela, el mapa sigue
  siendo el de la finca.
- **Cambiado**: **Atributos Complementarios es ahora una tabla**, una fila por atributo, igual para «Áreas de legislación» y para
  «Sostenibilidad y enfoque social» (owner: «las X rojas dan la impresión de que algo está mal o falta»). Columnas: el atributo, su
  estado —verificada · por chequear (la pidió el productor) · no solicitada—, **dónde verificar** (enlaces a las fuentes de
  consulta), la nota de CTCx y la evidencia, con «Adjuntar…» que abre el formulario. Lo que nadie pidió ni verificó va en gris. Ya
  no hay X rojas: estos atributos documentan la revisión de CTCx, no son faltas del productor. El formulario usa la misma tabla.
- **Corregido**: la línea de tiempo del cultivo daba un aviso de hidratación en cada carga (el servidor y el navegador calculan
  «hoy» con milisegundos de diferencia); la posición se redondea a dos decimales.
- **Seguridad**: `qa-visa` (78 → 89).
- **Docs**: charter `consolas`, ALINEACION §3.

## [V5.141] — 2026-10-02 (commit 157b843)

- **Corregido**: en la revisión EUDR de una finca (OCP · Productores, Fincas y Lotes), los rótulos **«siembra» y «corte EUDR
  31/12/2020» de la línea de tiempo se pisaban** cuando las dos fechas quedan cerca —un cultivo establecido en 2020 o 2021— (owner,
  2026-10-02). Ahora van en dos renglones: la siembra arriba de la línea; el corte y «hoy», debajo. Cada rótulo se ancla hacia
  adentro cuando su punto cae cerca de un borde, así que tampoco se sale ni choca con «hoy» en un cultivo antiguo. Probado con
  ocho fechas, de 1960 al mes pasado.
- **Seguridad**: `qa-visa` (76 → 78).

## [V5.140] — 2026-10-02 (commit cca64a3)

- **Cambiado**: en la planilla de evaluación (Centro de Calidad, OCP «Registrar a mano» y Arena), **una nota de la rueda se resalta
  en una o varias etapas** —Fragancia, Aroma, Sabor, Sabor residual— (owner, 2026-10-02; antes era una sola). Cada etapa es una
  píldora que se enciende y se apaga por separado; la última encendida no se apaga, porque una nota sin etapa no dice dónde se
  percibió. La insignia de la marca y las líneas que leen el OCP y el Centro dicen todas: «Frutal · Fragancia + Sabor · 10/15».
- **Añadido**: **comentario opcional por nota** (una línea, hasta 240 caracteres). Se ve bajo la marca cuando está cerrada y viaja
  con la evaluación: «… · 10/15 — «ciruela pasa al enfriar»».
- **Cambiado**: la **CTCx Coffee Datasheet Tool** del taller hace lo mismo —varias etapas y comentario por nota, en ES · EN · DE—,
  y lo lleva a la ficha y al archivo. En CVA las etapas de una nota siguen siendo las de donde se marcó (nariz: fragancia · aroma;
  boca: sabor · residual), ahora una o las dos.
- **Datos**: sin cambio de esquema. `lot_evaluations.rueda_detalle` guarda `{ etapas, intensidad, nota }` por nota; lo guardado con
  una sola `etapa` (V5.133) se lee como una lista de una, igual que los archivos anteriores de la herramienta.
- **Corregido**: las píldoras de etapa mezclaban `border` y `borderColor`; al apagar una podía quedarle el borde encendido.
- **Seguridad**: `qa-centro-calidad` (144 → 152) y `qa-coffee-datasheet` (1.291 → 1.300) comparan la normalización de etapas, el
  alternado y el tope del comentario entre la planilla y la herramienta.
- **Docs**: guía de `coffee-datasheet`, charters `herramientas-cafe` y `consolas`, ALINEACION §3.

## [V5.139] — 2026-10-02 (commit 99c4ebd)

- **Añadido**: franja **«Sesión asistida · productor · código»** en Kaffetal Regal (owner, 2026-10-02). Sale fija arriba, por encima
  de todo, cuando la sesión cargada es la que abrió el OCP con «Entrar como el productor»; dice como quién se está trabajando y
  trae «Salir». La enciende una marca (`ctc-sesion-asistida`, `src/lib/asistencia/marca.ts`) que el OCP escribe al abrir la sesión y
  borra al cerrarla; solo cuenta si dice el mismo productor que la sesión cargada, y no autoriza nada. El productor de verdad, en
  su navegador, nunca la ve. No se imprime.
- **Añadido**: **polígono opcional con 4 ha o menos** (owner, 2026-10-02). En el mapa del cafetal, con la respuesta «no» a «área
  mayor a 4 ha», aparece «＋ Dibujar el polígono (opcional)». Si el productor lo dibuja, el **punto de referencia pasa a ser el
  centro geométrico del polígono** —se calcula solo, el pin deja de arrastrarse y el GPS no lo pisa— y el polígono se guarda como
  información adicional. Vale para el Cafetal 1 y para los adicionales. Avisa si el polígono mide más de 4 ha (ahí el EUDR sí lo
  exige). Un cafetal ya guardado con polígono y su punto marcado a mano no se cambia solo: el editor ofrece «Usar el centro del
  polígono». La regla vive en `src/lib/geo/referencia.ts`.
- **Cambiado**: el expediente EUDR y el OCP distinguen las dos cosas: con 4 ha o menos presentan el **punto** como geolocalización
  y nombran el polígono como información adicional; con más de 4 ha, el polígono, como hasta ahora.
- **Datos**: sin cambios de esquema — `fincas.eudr_polygon_geojson` y `finca_parcelas.polygon_geojson` ya admitían un polígono con
  cualquier área. Cruce del registro de sesiones asistidas (2026-09-30 a 2026-10-02) contra lo cargado: ninguna finca, lote,
  cafetal, archivo ni solicitud quedó bajo un productor distinto del de la sesión abierta.
- **Seguridad**: `qa-asistencia` (88 → 105: la marca y la franja) y `qa-area` (10 → 39: el centro geométrico y el editor).
- **Docs**: ALINEACION §3, charters `kaffetal-regal` y `consolas`.

## [V5.138] — 2026-10-02 (commit 9727285)

- **Corregido**: **la sesión asistida abría Kaffetal Regal como el productor ANTERIOR, o vacío** (owner, 2026-10-02: «La Asistencia a
  Proveedores no está cargando nada de la información correspondiente»). Al cerrar una sesión o cambiarla por otra, `@supabase/ssr`
  pide borrar cada cookie vieja dos veces —con `Domain=.ctcexport.com` y host-only— y `cookies()` de Next guarda UNA por nombre: se
  quedaba con el borrado host-only, que no borra la cookie compartida. «Cerrar sesión asistida» no cerraba, y al entrar como otro
  productor el trozo viejo de la cookie le tapaba la sesión nueva. Ese día la sesión pegada era la de una cuenta ya eliminada, y
  Kaffetal Regal pintaba un panel sin datos. Ahora las escrituras pasan por `unaPorNombre` (`src/lib/supabase/cookiesDeSesion.ts`):
  un valor le gana a un borrado y, entre dos borrados, queda el que lleva dominio. Vale para los dos clientes de servidor (cookie
  compartida y cookie de las consolas) y para el proxy.
- **Corregido**: una sesión cuya cuenta se **borró** con el navegador abierto quedaba viva hasta vencer (Auth responde
  `user_not_found`, que la librería no trata como sesión cerrada) y cada petición repetía la llamada. El proxy la cierra en la
  siguiente petición.
- **Corregido**: el borrado de la cookie host-only heredada que el proxy mandaba como encabezado crudo **no llegaba** con Next 16.3
  (cada `.set()` posterior reescribe los `set-cookie`); ahora va después de los `.set()`, y nunca en el dominio raíz.
- **Seguridad**: `qa-asistencia` (67 → 88) ejecuta la librería real contra el almacén de cookies real de Next y comprueba qué le
  llega al navegador al cerrar, al cambiar de productor y con una cuenta borrada — con y sin la regla.
- **Docs**: ALINEACION §3 (contrato «Sesiones y cookies»), charter `consolas`.

## [V5.137] — 2026-10-01 (commit d9bc732)

- **Cambiado**: la **CTCx Coffee Datasheet Tool** del taller tiene los MISMOS campos que la planilla del Centro de Calidad (owner,
  2026-10-01: «este tiene que ser la misma herramienta, agregándole B1»). **SCA 2004**: Uniformidad, Taza limpia y Dulzor se califican
  como los demás atributos (de 0 a 10 en pasos de 0,25; antes eran cinco casillas por atributo); los defectos de taza se marcan **taza a
  taza** —leve (taint) o grave (fault)— con el mismo selector de tipo que la taza defectuosa del CVA, y cada uno tiene su botón «i».
  **CVA**: la afectiva admite **cuartos de punto** (los nueve botones siguen; al lado, una casilla de 1 a 9 al 0,25) y la sección de
  acidez pide su **tipo** (seca · dulce, se elige una). **Rueda**: cada nota marcada lleva su **etapa** (fragancia · aroma · sabor ·
  residual; en CVA, las dos de donde se marcó) y su **intensidad** de 0 a 15 al 0,5, y así sale en la ficha. **Radar**: el centro es 0.
- **Añadido**: parte **B1 · Variedades y caracterización básica** en la herramienta —especie, variedades con su proporción, tipo de
  proceso, humedad, densidad, actividad de agua y el factor de rendimiento—. Es la primera pestaña, se puede apagar como las otras y
  sale en la ficha. No son campos nuevos: son los de las partes 2 y 3, juntos en una pantalla (lo que se escribe en una aparece en la otra).
- **Corregido**: un archivo `.json` guardado con la herramienta anterior se abre sin perder nada —las casillas por taza se convierten
  a puntos (2 por taza marcada) y los dos contadores de defectos se reparten en tazas—.
- **Seguridad**: `qa-coffee-datasheet` (1.197 → 1.291) vigila que la herramienta y la planilla sigan teniendo los mismos campos: etapas,
  intensidad, tipos de acidez, texturas, defectos físicos, colores, tipos de defecto de taza y la migración de archivos anteriores.
- **Docs**: guía de `coffee-datasheet` (cuatro partes; el pendiente de la V5.135 queda cerrado), charter `herramientas-cafe`, ALINEACION §3.

## [V5.136] — 2026-10-01 (commit 19dc6d4)

- **Cambiado**: el **Instagram de CTC** es `https://www.instagram.com/ctc.oficiall/` (owner, 2026-10-01; antes `instagram.com/ctcexport`).
  Estaba escrito en dos sitios —el pie de CTC Home y `SocialLinks` (Kaffetal Regal y la familia Cherry Picked)—; ahora los dos leen
  de `src/lib/redesSociales.ts`, junto con el YouTube.

## [V5.135] — 2026-10-01 (commit 4b595bb)

- **Corregido**: el **botón de borrado nuclear no se veía** (owner). Estaba al final de la sección del lote, en mitad de una página
  larga; ahora va **arriba, junto al título** del lote o de la finca.
- **Cambiado**: en la planilla, **Uniformidad, Taza limpia y Dulzor** se teclean como los demás atributos (pasos de 0,25, de 0 a 10)
  en lugar del selector de pares.
- **Cambiado**: el **CVA admite aumentos de 0,25** en cada sección (antes, solo enteros).
- **Corregido**: la **gráfica de araña** partía del mínimo del formulario y un 6 se leía como un cero. Ahora el centro es 0.
- **Cambiado**: **taint y fault** se anotan taza a taza, con el mismo selector de tipo de defecto que la taza defectuosa del CVA, y
  cada uno tiene su «i» que lo explica. La fórmula no cambia: los dos contadores salen de las tazas.
- **Añadido**: en B3, **«Registrar detalle» (R)** junto al defecto primario y al secundario —los 16 defectos del formato físico, con
  granos y defectos completos— y el selector de **color** del grano verde. Los gramos siguen siendo lo que entra en el factor.
- **Añadido**: **acidez** (intensidad 0–15 y un tipo) y **sensación en boca** (intensidad y hasta dos texturas), que no están en la
  rueda. No entran en el puntaje.
- **Cambiado**: el núcleo de la CTCx Coffee Datasheet Tool acepta los mismos dominios que la planilla (una fórmula, no dos); sus
  campos de pantalla quedan como pendiente de `herramientas-cafe`.
- **Docs**: charters `consolas`, `socios` y `herramientas-cafe`, ALINEACION §3. `qa-centro-calidad` 127 → 144.

## [V5.134] — 2026-10-01 (commit 32e0007)

- **Añadido**: **borrado nuclear** de un lote o una finca desde el OCP (owner, 2026-10-01), aunque ya haya pasado por todo el circuito:
  desaparece «como si no hubiese existido» — solicitud y factura, muestras, evaluaciones, ofertas, contratos y sus meses, compras,
  fichas, archivos, mensajes y rastro de auditoría. Vive en la vista del lote y en la de la finca (`/ocp/kr?lote=` · `?finca=`); el de
  una finca se lleva sus lotes.
- **Añadido**: **doble confirmación**. Primera: el inventario de lo que se va a borrar, tabla por tabla, el motivo (interno) y una
  casilla. Segunda: escribir la frase «BORRAR <código>». El servidor vuelve a comprobar las tres cosas.
- **Añadido**: el **productor recibe un aviso** —nota en su hilo y correo— de que CTCx retiró su lote o su finca en una operación
  unilateral por razones del sistema, sin el motivo interno. El resultado de cada envío queda registrado.
- **Añadido**: módulo **«Archivo de Borrados»** (`/ocp/borrados`, solo lectura): por cada operación, quién, cuándo, el motivo, lo
  borrado, qué pasó con los archivos, el aviso al productor y la instantánea completa descargable en JSON.
- **Seguridad**: el borrado corre en la base en una sola transacción (primero archiva, después borra) y **se niega** si el lote tiene
  pedidos, reservas o pujas de compradores, si una compra suya ya está en una mezcla o en Sample Kits, o si la finca aporta a un lote
  de otra finca. Solo quien administra el OCP puede hacerlo; las funciones de la base solo las llama el servidor.
- **Datos**: migraciones `borrado_nuclear` y `borrado_nuclear_jsonpath_solo_objetos` — tabla `borrados_nucleares` y funciones
  `nuclear_inventario` · `nuclear_borrar`. Acta en `docs/migraciones/`.
- **Docs**: charters `consolas` y `kaffetal-regal`, ALINEACION §3. Guardián nuevo `qa-borrado-nuclear` (32).

## [V5.133] — 2026-10-01 (commit caf2410)

- **Añadido**: en la planilla de evaluación, **cada marca de la rueda lleva su etapa y su intensidad** (owner, 2026-10-01), como el
  modo Catar de la Rueda del Café: la **etapa** en que se percibió (Fragancia · Aroma · Sabor · Sabor residual — una por nota) y la
  **intensidad** de 0 a 15 en pasos de 0,5 (baja · media · alta). Tocar una nota marcada abre su editor; la recién marcada llega
  abierta, con el valor por defecto de la herramienta (Sabor · 10).
- **Cambiado**: el OCP («Lotes en Evaluación») y el Centro de Calidad leen cada marca completa: «Frutal › Cítricos › Lima · Sabor ·
  10/15».
- **Datos**: migración `lot_evaluations_rueda_detalle` — `lot_evaluations.rueda_detalle jsonb` (por id marcado, `{etapa,
  intensidad}`); `rueda` no cambia. Acta en `docs/migraciones/`.
- **Docs**: charter `consolas`, ficha `catacion`, ALINEACION §3. `qa-centro-calidad` 116 → 127.

## [V5.132] — 2026-10-01 (commit 759765d)

- **Añadido**: **CTCx Coffee Datasheet Tool** (`herramientas.ctcexport.com`, id `coffee-datasheet`), una herramienta NUEVA que combina la
  Rueda del Café y la Ficha de café verde (owner, 2026-10-01) para evaluar **uno o varios lotes** con **SCA 2004 o con CVA**, llenando
  una o varias de tres partes: **Perfil de Sabores · Granulometría · Caracterización Extrínseca**.
- **Añadido**: **el método se elige primero y manda en toda la pantalla** — «es FUNDAMENTAL hacer esta distinción». Una cinta fija dice
  cuál se está usando (azul marino «SCA 2004» · dorada «CVA»), las casillas son las de ese método y la ficha impresa, el HTML exportado y
  el nombre del archivo lo llevan. SCA 2004: siete atributos de 6,00 a 10,00 al 0,25, tres por taza, defectos que restan. CVA: cada
  sección en dos columnas que no se copian — descriptiva (intensidad 0–15 y casillas CATA, SCA 103) y afectiva (1–9, SCA 104) —, las
  cinco tazas con su tipo de defecto, la física del formato CVA (mallas 10 a 23) y la extrínseca del SCA 105 con sus casillas oficiales.
- **Añadido**: **49 botones «i»** que explican cada casilla y citan su estándar (SCA 102–105 y protocolo de 2004), una guía de preparación
  de la muestra, y tres idiomas (ES · EN · DE). La rueda de sabores marca por el usuario la casilla CATA de cada nota.
- **Añadido**: trabajos guardados con esquema propio, borrador en el navegador fuera de la concha, archivo `.json` que se vuelve a
  cargar, CSV resumen, ficha por lote o de todos, y tabla de comparación entre lotes. Sin CDN: abre sin internet.
- **Cambiado**: los catálogos de la herramienta **se generan, no se copian** — `scripts/build-coffee-datasheet.mjs` escribe dentro del
  HTML la rueda (de la Rueda del Café publicada) y los municipios, variedades y partidas arancelarias (de la Ficha de Kaffetal Regal).
- **Corregido** (frente a las dos herramientas de origen, que siguen vivas): la intensidad ya no es por nota sino por sección, como pide
  el SCA 103; una evaluación afectiva incompleta no da puntaje (antes arrancaba en 5); el «puntaje SCA» ya no acepta un atributo fuera
  de 6–10.
- **Seguridad**: todo lo que escribe el usuario o llega de un archivo cargado se escapa al pintarse y se normaliza al entrar.
- **Datos**: alta de `coffee-datasheet` en `tools` + `tool_versions` (default · KR · web · DC · con memoria), hecha con el archivo ya en vivo.
- **Docs**: ficha `herramientas-cafe/coffee-datasheet`, charter y recuento de `herramientas-cafe`, fichas de `catacion` y
  `green-datasheet`, ALINEACION §3. Guardián nuevo `qa-coffee-datasheet` (1.197: paridad de las dos fórmulas con la planilla del
  Centro de Calidad sobre 1.200 planillas). `build-tool-shots` acepta ids para capturar una sola herramienta.

## [V5.131] — 2026-10-01 (commit be4f2b4)

- **Corregido**: la **rueda de la planilla de evaluación ES la Rueda del Café del taller** (owner, 2026-10-01: «no entiendo por qué
  la rueda es diferente… ¡deben ser iguales!»). La V5.130 dibujaba una rueda de dos anillos sobre una taxonomía resumida escrita a
  mano (28 descriptores). Ahora trae la de la herramienta: **9 familias → 22 subcategorías → 85 notas**, sus colores, sus iconos, los
  tres anillos y la banda exterior, con la misma geometría. Se **marca en cualquier nivel** y cada marca deja su aguja, como en el
  modo Catar.
- **Cambiado**: **una sola taxonomía**. `scripts/build-rueda-datos.mjs` la saca del HTML de la herramienta y genera
  `src/lib/catacion/ruedaDatos.ts`; el guardián falla si dejan de coincidir. Los ids que se guardan son los de la herramienta
  (`frutal` · `frutal-citricos` · `frutal-citricos|lima`); los 28 ids viejos se traducen (ningún dato vivo los usaba).
- **Cambiado**: en la planilla la rueda va **a lo ancho** para que se lea, con las marcas listadas por su camino («Frutal › Cítricos ›
  Lima») y las notas descriptivas al lado; los protocolos SCA/CVA quedan arriba, a todo el ancho. El OCP y el Centro leen las marcas
  con ese mismo camino.
- **Cambiado**: de la herramienta **no se traen** girar la rueda y la lupa (un renglón dice lo que hay bajo el cursor), ni la etapa e intensidad
  de cada marca.
- **Docs**: charters `consolas` y `herramientas-cafe`, ficha `catacion`, ALINEACION §3. `qa-centro-calidad` 105 → 116.

## [V5.130] — 2026-10-01 (commit a279d4e)

- **Cambiado**: la **planilla de evaluación** (Centro de Calidad · «Registrar a mano» del OCP · apreciación de la Arena) se rehízo
  con las piezas de la **CTCx Datasheet Tool** (owner, 2026-10-01): abre con el **radar** vivo de los atributos de taza junto al
  puntaje grande y su franja; la **rueda de sabores es una rueda** que se toca (nueve familias, sus descriptores), no una lista de
  botones; la **granulometría** lleva una barra por malla, el total y su estado. Son SVG nativo sobre la misma aritmética y la
  taxonomía única de la rueda — la herramienta HTML no se embebe porque no es dual (SCA 2004 + CVA) ni bilingüe.
- **Cambiado**: **sin el espacio muerto**. Los protocolos quedan junto a la rueda y los pesos junto a las mallas (dos columnas
  donde caben, una en teléfono); cada cifra va al lado de su rótulo. Se añade la merma de trilla, derivada.
- **Añadido**: conmutador **ES · EN** en la planilla. Traduce los rótulos, la rueda, las mallas, los mensajes de error y el rótulo
  del Punto; en el Centro de Calidad también lo que rodea a la hoja. No toca un dato ni una fórmula.
- **Docs**: charters `consolas`, `socios` y `herramientas-cafe`, ALINEACION §3. `qa-centro-calidad` 95 → 105.

## [V5.129] — 2026-10-01 (commit 6218778)

- **Cambiado**: en Kaffetal Regal, «Solicitudes de Evaluación» dice **cuánto y dónde se paga** (owner, 2026-10-01). El párrafo de
  ocho líneas pasa a tres cifras (tarifa · con la subvención del 30 % · con código o descuento) y cuatro pasos. Cada solicitud
  trae **su cuenta**: tarifa − subvención = **total a pagar**.
- **Cambiado**: la **factura que CTCx emite en el OCP se ve en la tarjeta**: «FACTURA EMITIDA», su número, la fecha, «Ver factura» y
  dónde pagar con la referencia del lote. Antes de emitirse, la tarjeta dice «Todavía no pague». Botón «↻ Actualizar».
- **Añadido**: el **medio de pago es un dato del OCP** («Medio de pago que ve el productor», en Solicitudes de Evaluación): medio,
  número, titular e indicaciones. Hasta hoy era una constante vacía en el código y el productor solo leía «escríbanos». Lo leen la
  tarjeta del productor y la factura imprimible; sin número, las dos siguen mandando a escribir a CTCx.
- **Docs**: charter `kaffetal-regal`, ALINEACION §3. `qa-solicitud-evaluacion` 86 → 93.

## [V5.128] — 2026-10-01 (commit a50f41c)

- **Añadido**: en Kaffetal Regal, pestaña 3 de la finca, el bloque **«Chequeos que hace CTCx»** (owner, 2026-10-01): el productor
  **marca y solicita** el chequeo de las cinco áreas de legislación y de los cuatro ítems de sostenibilidad, con una **nota y una
  imagen opcionales** por cada uno. Reemplaza el aviso «no requieren acción suya aquí». Funciona también con la finca aprobada y
  no frena el Pasaporte. Cada ítem dice «Chequeo solicitado» o «✓ Verificado por CTCx».
- **Añadido**: en el OCP (`/ocp/kr?finca=` → EUDR → Atributos Complementarios), cada ítem enseña **lo que el productor pidió** (nota e
  imagen) y lleva, además de la marca, una **nota de CTCx y su evidencia**. El sub-tab cuenta los chequeos pedidos y sin hacer, y
  cada solicitud nueva deja una nota en la Comunicación de la finca.
- **Corregido**: la nota automática «CTC actualizó la información EUDR: …» listaba **nombres crudos de columna**
  (`eudr_evidence_files`…) en cada guardado aunque nada hubiera cambiado: los jsonb se comparaban por referencia. Ahora se comparan
  por contenido y tienen rótulo.
- **Datos**: migración `fincas_chequeo_de_atributos` — `eudr_chequeo_solicitudes` (la escribe el productor), `eudr_legal_files` y
  `eudr_atributos_notas` (solo CTC, en `guard_finca_protected_columns`). Acta en `docs/migraciones/`.
- **Docs**: charter `kaffetal-regal`, ALINEACION §3. `qa-visa` 67 → 76.

## [V5.127] — 2026-10-01 (commit 1267d44)

- **Corregido**: en Kaffetal Regal, el editor de la finca ofrecía **ocho departamentos y «Otro»** (owner, 2026-10-01). Ahora
  trae **los 32 departamentos y Bogotá D.C.**, de una sola fuente (`src/lib/geo/departamentos.ts`) que también usan la
  Información general del productor y el Proveedor Desacoplado (antes, los 22 de `DEP_MUNI`).
- **Añadido**: interruptor **«Fuera de Colombia»** en la finca: congela el Departamento y pide el **país** entre Perú, Ecuador,
  Venezuela, Panamá, Costa Rica, Guatemala y El Salvador. Con país, la finca se guarda sin departamento; la tarjeta de la
  finca, la Ficha del lote (País «desde la finca») y la solicitud de revisión enseñan el país.
- **Cambiado**: el **Pasaporte EUDR** y los documentos del lote (dossier, certificación) declaran el **país real** de la finca
  en vez de «Colombia» fijo, con su nivel de riesgo según la lista de la Comisión Europea: los seis nuevos son estándar salvo
  **Costa Rica, que es bajo** (`EUDR_COUNTRY_RISK`). La presentación de la debida diligencia guarda el país de las fincas de
  origen.
- **Cambiado**: en el OCP, la finca enseña «Municipio · país», el **DANE «No aplica · fuera de Colombia»** (no en rojo), y el
  editor en nombre del productor trae el campo País y sugiere los departamentos.
- **Datos**: migración `fincas_pais` — `fincas.pais text` (null = Colombia). Acta en `docs/migraciones/2026-10-01_fincas_pais.sql`.
- **Docs**: charter `kaffetal-regal`, ALINEACION §3. `qa-visa` 60 → 67; `qa-asistencia` ajustado a la lista nueva.

## [V5.126] — 2026-10-01 (commit 9edf0ee)

- **Añadido**: en la EVA del lote, el bloque **Fotos y video (B4)** enseña las **miniaturas allí mismo** (owner, 2026-10-01): cada foto
  como miniatura que abre la foto completa, y cada video reproducible en el sitio; lo que no tenga URL firmada sigue en la lista.
- **Cambiado**: en **Campañas de Subvención**, «Usado por» enlaza al **lote** que usó el código (`/ocp/kr?lote=`), además del productor.
- **Docs**: `qa-evaluaciones` 59 → 61.

## [V5.125] — 2026-10-01 (commit 77cd1e4)

- **Corregido**: en la EVA del lote, el panel **EUDR** decía «Sin definir» / «Pendiente» con la finca completa (el owner lo vio en un
  lote de Alto de Reinas): las fichas leían las columnas `eudr_*` del LOTE, que son legado desde que la debida diligencia vive en la
  finca. Ahora se leen de la(s) **finca(s) de origen** (`lots.finca_id` + aportes): cadena de custodia, afirmaciones del producto,
  indicios, documentos, nivel de riesgo (derivado) y mitigación — con «No aplica» cuando el riesgo ya es insignificante.
- **Añadido**: junto a «Visa: …», **cada finca de origen con su estado y enlace** a su vista completa; con varias fincas, un bloque
  por finca.
- **Docs**: `qa-evaluaciones` 56 → 59.

## [V5.124] — 2026-10-01 (commit acf8be2)

- **Cambiado**: en Kaffetal Regal, **una finca aprobada ya no se edita: se revisa** (owner, 2026-10-01). El botón de la tarjeta dice
  «Revisar» y la página abre en solo lectura (sin autosave ni «Guardar Finca»), con un aviso que remite a la solicitud de revisión.
- **Cambiado**: **«Solicitar revisión de datos»** pide ahora uno de los **cuatro puntos** de la finca (Información general · Ubicación y
  medidas · Cuestionario EUDR · Certificaciones), una **nota** y un **archivo adjunto** opcional (PDF o foto, 10 MB). El pop-up se queda
  abierto tras enviar: el productor puede mandar varias.
- **Añadido**: en el OCP, **CTCx edita toda la información de la finca en nombre del productor**: nombre, vereda, municipio,
  departamento, altura, historia y características; el **polígono** (un vértice «lat, lng» por línea); la **infraestructura local**; y
  **adjunta o reemplaza el SICA**. Con «Guardar en nombre del productor» (marcado por defecto) lo guardado queda también como la
  respuesta del productor; la parcela 1 se espeja. La pestaña **Comunicación** de la finca enseña cada solicitud con su punto y su adjunto.
- **Datos**: `producer_comm_log` gana `seccion`, `adjunto_asset_id`, `adjunto_filename` (acta `2026-10-01_comm_log_seccion_y_adjunto.sql`).
- **Docs**: charters `kaffetal-regal` y `consolas`, ALINEACION §3. `qa-visa` 55 → 60.

## [V5.123] — 2026-10-01 (commit a3207c3)

- **Cambiado**: en el editor de la finca (Kaffetal Regal · Ubicación y medidas), el bloque de cada cafetal pone **Área a la izquierda y
  Altura a la derecha**, el mismo orden que «Totales de la finca» (owner: estaban cruzados). `qa-visa` 54 → 55.

## [V5.122] — 2026-10-01 (commit e78f98c)

- **Corregido**: en Kaffetal Regal, el área escrita a mano del Cafetal 1 (obligatoria con 4 ha o menos) **se perdía** al guardar la
  finca (el owner lo topó en `CTC-F-54657EF2` con 3 ha): solo la guardaba el botón del cafetal, y el espejo de la parcela no escribía
  nada sin geometría. Ahora el nombre, el área, la altura y la respuesta «> 4 ha» del Cafetal 1 **viajan con Guardar Finca** y el
  autosave, y el espejo los escribe aunque aún no haya punto ni polígono.
- **Cambiado**: los **Totales de la finca se calculan solos** (owner): el área es la suma de los cafetales y la altura es la del
  Cafetal 1; desaparecen los campos editables y los botones «Calcular del polígono» y «Traer del mapa» del total.
- **Datos**: `Alto de Reinas` (CTC-F-54657EF2) quedó con 3 ha en su Cafetal 1 y en la finca, como el owner lo registró.
- **Docs**: charter `kaffetal-regal`. `qa-visa` 51 → 54.

## [V5.121] — 2026-10-01 (commit a016720)

- **Cambiado**: en la vista de la finca del OCP, la pestaña **General** con el mismo tratamiento visual (owner, 2026-10-01): lo que le
  falta a la declaración EUDR en insignias rojas (o «Declaración EUDR completa» en verde), y fichas en grilla con vereda, municipio y
  departamento, código DANE (rojo si no coincide), altitud, punto marcado y polígono (Sí/No, exigido si > 4 ha), parcelas, lotes
  asociados, certificaciones (y corroboradas), fecha de registro; el área cultivada como barra contra los 4 ha; y la historia y las
  características de la finca. `qa-visa` 49 → 51.

## [V5.120] — 2026-10-01 (commit 02c224a)

- **Cambiado**: en la **EVA del lote** (OCP · vista completa del lote), el mismo tratamiento visual de la finca (owner, 2026-10-01):
  las filas de FT y FT2 se leen como fichas en una grilla; B2 y B3 muestran el camino elegido («No lo sé» / «Tengo un reporte»), el
  puntaje grande con su escala, quién emitió el reporte y cuántos soportes (rojo si faltan); las fotos con su mínimo de 2 en verde o
  rojo; y el panel EUDR enseña lo que la finca declaró en fichas y Sí/No (cadena de custodia, afirmaciones del producto, indicios,
  documentos, nivel de riesgo, mitigación), solo lectura.
- **Corregido**: en la FT de la EVA, un **blend** mostraba solo la primera variedad y su proceso (`ficha_variedad` y
  `base_processing` son la proyección de la dominante): ahora lista todas las variedades con su % y el proceso de cada una
  (el owner lo vio en `CTC-L-323FEDE6`). `qa-evaluaciones` 53 → 56.

## [V5.119] — 2026-10-01 (commit 9f98387)

- **Cambiado**: en **Productores, Fincas y Lotes**, la revisión EUDR de la finca se lee de un vistazo (owner, 2026-10-01). **Declaración**:
  el área cultivada como barra contra la referencia de 4 ha (tope visual de 30 ha; más allá, la barra se corta y lo dice), la fecha de
  establecimiento como línea de tiempo con la siembra, el corte EUDR (31/12/2020) y hoy, los Sí/No en verde o rojo según la buena
  respuesta, y el documento de respaldo en rojo si falta. **Análisis y Evidencia**: la coordenada del predio (centro del polígono, o el
  punto) con botón de copiar, y «Adjuntar evidencia» del chequeo contra bases EUDR oficiales hasta 4 archivos. **Atributos
  Complementarios** y **Riesgo y Mitigación**: fichas verdes/rojas (la legislación no verificada en rojo; la infraestructura local con
  las fichas del cuestionario del productor; las afirmaciones del producto al derecho). Piezas puras en `kr/EudrPiezas.tsx`.
- **Añadido**: en **Certificaciones**, al corroborar CTC puede adjuntar **un archivo por certificación** (`finca_certificates.corroboracion_*`,
  solo CTC por el guard; acta `docs/migraciones/2026-10-01_finca_certificates_corroboracion.sql`).
- **Corregido**: el formulario del Pasaporte EUDR mandaba el archivo del chequeo como `File` por la Server Action (tope de 1 MB): ahora se
  sube al Storage como los demás y solo viaja su id.
- **Docs**: charter `consolas`, ALINEACION §3. `qa-visa` 41 → 49.

## [V5.118] — 2026-10-01 (commit 74ba262)

- **Cambiado**: en **Solicitudes de Evaluación**, **toda la solicitud es un acordeón compacto** (owner, 2026-10-01): cerrada muestra
  una línea (lote · productor · código · fecha) con sus insignias (subvención, factura, pago, muestra, «Pide descuento»); abierta,
  la nota de descuento, la Ficha del lote (su propio acordeón) y los cuatro pasos. `qa-solicitud-evaluacion` 85 → 86.

## [V5.117] — 2026-09-30 (commit 8de66d3)

- **Añadido**: en Kaffetal Regal, la tarjeta del lote (carrusel y lista completa) tiene **«¿Qué sigue?»** cuando la Ficha está
  completa: abre el mismo aviso «Ficha completa» (lo que ya está · lo que sigue si quiere evaluarlo) con la Visa según el Pasaporte
  de la finca (owner, 2026-09-30).
- **Añadido**: en **Solicitudes de Evaluación** (OCP), la **Ficha del lote se despliega en acordeón** dentro de cada solicitud: los
  cuatro pasos, la finca y su Pasaporte, variedades, proceso, altitud, lo reportado en B2 y B3 (o «No lo sé»), las fotos, y el enlace
  a la vista completa. La consulta de la solicitud trae el `datasheet` y la finca.
- **Docs**: `qa-solicitud-evaluacion` 84 → 85, `qa-kr-panel` 122 → 123.

## [V5.116] — 2026-09-30 (commit 8faa9bc)

- **Cambiado**: el aviso **«¡Ficha completa!»** al cerrar la Ficha del lote (owner, 2026-09-30) ahora separa **lo que ya está** —la
  Ficha enviada a revisión y la **Visa EUDR** (lista si el Pasaporte de la finca está vigente; pendiente del Pasaporte si no)— de
  **lo que sigue solo si quiere evaluarlo**: la solicitud desde «Evaluar mi Café», la factura, la tarifa con la subvención de KR (cifras
  desde la fuente: tarifa, 30 % por defecto, hasta 70 %), los 2 kg de pergamino contra entrega marcados con el código, y el camino
  Q-Grader → grado → oferta. Deja claro que enviar la muestra no es obligatorio.
- **Docs**: `qa-solicitud-evaluacion` 81 → 84.

## [V5.115] — 2026-09-30 (commit 040f6e8)

- **Cambiado**: en la Ficha del lote, con **«No lo sé»** marcado en B2 (o «No lo sé / solo información básica» en B3) **los soportes
  desaparecen** (owner, 2026-09-30): no hay nada que adjuntar. Si ya había archivos subidos, una línea dice que siguen guardados en
  la Ficha. `qa-reportado-productor` 55 → 56.

## [V5.114] — 2026-09-30 (commit 9b3c8cb)

- **Cambiado**: en Kaffetal Regal, el **documento de respaldo de la finca es solo el SICA** (Registro SICA / cédula cafetera de la
  FNC; owner, 2026-09-30): desapareció el selector de tipo (escritura, tradición y libertad, arrendamiento, acta, otro); al subir el
  PDF el tipo queda en `sica`. Las fincas guardadas con un tipo viejo lo conservan y la pantalla lo dice.
- **Cambiado**: en **Productores, Fincas y Lotes**, la vista de **Mapa pinta siempre las fincas** (nunca los lotes; con «Ver lotes»,
  las fincas de los lotes filtrados) y **dibuja el polígono** de la finca que lo declaró, con el color de su Pasaporte y tocable
  (`GeoMap` con `PolygonF`; el encuadre incluye los vértices).
- **Docs**: charters `consolas` y `kaffetal-regal`, ALINEACION §3. `qa-visa` 39 → 41, `qa-boards` 33 → 35.

## [V5.113] — 2026-09-30 (commit 2149582)

- **Añadido**: en Kaffetal Regal, **«⬇ Descargar Visa EUDR de <lote>»** en la tarjeta del lote (el carrusel de «Mis Lotes» y la lista
  completa), con el mismo estilo del botón del Pasaporte de la finca (owner, 2026-09-30). Aparece cuando CTCx otorgó la Visa
  (veredicto documental `apto` o etapa posterior; `no_apto` no) y el documento existe (el Pasaporte EUDR de la finca de origen
  vigente, `lotEudrStatus` = «Visa lista»). Con la Visa otorgada y el Pasaporte aún sin compartir, la tarjeta lo dice en vez de
  esconder el botón. El viejo «Visa EUDR ↗» de la lista completa queda absorbido.
- **Docs**: charter `kaffetal-regal`. `qa-kr-panel` 119 → 122.

## [V5.112] — 2026-09-30 (commit db5a437)

- **Cambiado**: en Kaffetal Regal, **registrar una finca nueva también es una página completa** (`FincaView` con `finca = null`; owner,
  2026-09-30), desde «+ Agregar finca» y desde A2 de la Ficha del lote — en este caso, al guardar o volver se regresa a la Ficha. El
  pop-up `FincaModal` desaparece. Con esto ningún alta ni edición de KR (Información general, finca, lote) abre un pop-up.
- **Docs**: charter `kaffetal-regal`. `qa-kr-ficha` 230 (una comprobación reescrita).

## [V5.111] — 2026-09-30 (commit 6420251)

- **Cambiado**: en **Proveedor Desacoplado** (`/ocp/desacoplado`), el departamento se elige de un **selector** con la misma lista que
  el productor ve en su Información general (`DEP_MUNI`, sin «Multi-Origin»), con **«Otro…»** que abre un campo libre (owner,
  2026-09-30). Así el OCP y Kaffetal Regal escriben el departamento igual y los filtros de `/ocp/kr` lo agrupan bien.
- **Docs**: charter `consolas`. `qa-asistencia` 65 → 67.

## [V5.110] — 2026-09-30 (commit 8c6c9ca)

- **Corregido**: en Kaffetal Regal la geolocalización de la finca «se borraba» al salir de «Editar finca» (el owner lo topó con
  «Finca La Muestra CTCx»). La causa estaba en la base: la V5.65 dijo que `finca_parcelas.requires_polygon` guarda la respuesta
  «¿mayor a 4 ha?», pero la columna siguió siendo GENERADA, y Postgres rechazaba toda escritura de parcelas desde KR (el espejo de
  la parcela 1 se lo tragaba en silencio): las fincas nuevas quedaban sin Cafetal 1, la respuesta «> 4 ha» no se guardaba, la
  pantalla volvía al modo punto y el polígono (que sí estaba en `fincas`) dejaba de verse; sin parcela, la declaración EUDR daba
  «incompleta» y el OCP no podía evaluar la finca. La columna es real desde hoy y el espejo avisa cuando no puede escribir.
- **Datos**: la parcela 1 de cada finca con geometría se puso al día con la geometría de `fincas`, y «Finca La Muestra CTCx» recibió
  su Cafetal 1 con el polígono declarado. Acta `docs/migraciones/2026-09-30_parcelas_requires_polygon_es_declaracion.sql`.
- **Docs**: charter `kaffetal-regal`. `qa-visa` 36 → 39.

## [V5.109] — 2026-09-30 (commit f901e90)

- **Cambiado**: en la Ficha del lote, **B2 y B3 son o lo uno o lo otro** (owner, 2026-09-30). **«No lo sé»** deja todo opcional (B2:
  puntaje, escala y perfil; B3: factor o almendra). **«Tengo un reporte»** (casilla nueva, excluyente) hace obligatorios el puntaje, la
  escala y el perfil (B2) / el factor o la almendra (B3), al menos un soporte (PDF o foto) y **quién emitió el reporte**. El «No lo sé»
  de B2 bajó de la barra al pane, en par con la casilla nueva.
- **Cambiado**: **«Tengo un reporte» es la solicitud de oficialización**: sale sola al enviar la FT2, con el primer soporte y el nombre
  de quien lo emitió (`producer_claim`). El formulario aparte del banner «Solicitar oficialización» (nombre + otro adjunto) se retiró:
  pedía lo mismo que los soportes. El banner solo informa (estimación vs. oficial, solicitud pendiente).
- **Cambiado**: la EVA del OCP enseña quién emitió el reporte de B2 y de B3; la vista previa de la Ficha lo dice junto al puntaje.
- **Docs**: charter `kaffetal-regal`, ALINEACION §3. `qa-reportado-productor` 45 → 55.

## [V5.108] — 2026-09-30 (commit 8fb5f32)

- **Cambiado**: en **Productores, Fincas y Lotes**, los cuatro chips de finca y lote son ahora dos pares de casillas **«Finca ☐✅ ☐❌»**
  y **«Lote ☐✅ ☐❌»** (owner, 2026-09-30): una casilla marcada filtra, ninguna o las dos = todas.
- **Añadido**: el filtro **«Por revisar»**: «Pasaporte listo» (fincas cuya declaración EUDR está aparentemente completa y esperan la
  revisión de CTCx) y «Ficha lista» (lotes con la Ficha completa que esperan la Visa documental). La tabla lo dice en cada fila: bajo el
  Pasaporte, «Declaración completa · esperando a CTCx» o «Declaración incompleta»; bajo la Ficha, «Ficha completa · esperando a CTCx».
  También por URL (`?filtro=pasaporte-por-revisar|lote-por-revisar`).
- **Docs**: charter `consolas`. `qa-boards` 32 → 33.

## [V5.107] — 2026-09-30 (commit ea3a5d8)

- **Cambiado**: en Kaffetal Regal, **la Información general se edita a pantalla completa** (`InfoView`, owner 2026-09-30), con la
  misma cabecera y el mismo lienzo que la Ficha del lote y la página de la finca; «Editar información» ya no abre un pop-up. El cuerpo
  del editor no cambió (`InfoEditorBody` en `InfoModal.tsx`, que conserva el nombre y deja de montar el pop-up). Es una capa más del
  botón atrás del teléfono.
- **Docs**: charter `kaffetal-regal`. `qa-kr-ficha` 226 → 227.

## [V5.106] — 2026-09-30 (commit c83554c)

- **Cambiado**: en la vista completa del productor (`/ocp/kr?productor=`), las pestañas **Fincas · Lotes · Arena · Contratos** dejan
  de ser una línea por entrada y traen **un buen vistazo** (owner, 2026-09-30: «no toda la info, pero suficiente»): la finca con código,
  Pasaporte, ubicación, hectáreas, altitud, lotes, certificaciones y fecha de registro; el lote con código, etapa, estado del circuito,
  los cuatro pasos de la Ficha, grado, temporada, muestra, oferta y trato (con enlace al contrato); la Arena con fase, pago, puntaje
  y decisión; el contrato con estado, kg, $/kg, meses y firma. Cada tarjeta enlaza a la vista completa de lo que nombra.
- **Cambiado**: `cargarKr(service, { productorId })` sabe cargar UN productor (filtra perfiles, fincas, lotes, inscripciones y ofertas):
  la vista del productor deriva Pasaporte, circuito, muestra, oferta y trato con la misma función que la tabla, no a mano.
- **Docs**: charter `consolas`. `qa-asistencia` 62 → 65.

## [V5.105] — 2026-09-30 (commit 4f1a12f)

- **Añadido**: en **Asistencia a Proveedores** (`/ocp/asistencia`), filtros y buscador (owner, 2026-09-30): el buscador mira al
  productor (nombre, correo, código, empresa) y, con el toggle de **búsqueda profunda**, también a sus fincas (nombre, `CTC-F-`, vereda,
  municipio) y a sus lotes (nombre, `CTC-L-`), diciendo en la fila dónde coincidió. Filtros: cuenta (propia · desacoplado · entregado),
  estado del productor por casillas, departamento, «Finca ✅» / «Sin finca», «Lote ✅» / «Sin lote». La tabla pasó a cliente
  (`AsistenciaTabla.tsx`); la página solo carga, con el mismo estado del productor que `/ocp/kr`.
- **Docs**: charter `consolas`. `qa-asistencia` 59 → 62.

## [V5.104] — 2026-09-30 (commit 35a3ad1)

- **Corregido**: «Borrar cuenta» fallaba con `producer_profiles_avatar_asset_id_fkey` (el owner lo topó limpiando cuentas): las fotos
  del productor no se pueden borrar ANTES del perfil porque `producer_profiles.avatar_asset_id` / `video_asset_id` (y `fincas` / `lots`)
  apuntan a `media_assets` sin cascada. `borrarCuenta.ts` ahora suelta `uploaded_by`, borra el usuario (la cascada se lleva las
  referencias) y al final borra las filas de `media_assets` y sus objetos de Storage. `qa-inactividad` 26 → 27 (vigila el orden).

## [V5.103] — 2026-09-30 (commit 4eb1f9e)

- **Añadido**: **la inactividad de las cuentas «Marchitando»** (owner, 2026-09-30) — tercer barrido del cron semanal
  `/api/cron/recordatorios` (`src/lib/inactividad/`: regla pura `reglas.ts`, `barrido.ts`, `correos.ts`): un productor Marchitando sin
  finca ni lote recibe un correo recordándole la cuenta y cómo entrar; 30 días después, el aviso de que se borrará en un mes; 30 días
  después la cuenta se borra sola (solo si sigue sin finca ni lote). Nunca las cuentas **protegidas**, las de prueba ni las que lleva
  CTCx; una finca o un lote reinician el reloj. Cada paso deja rastro en `audit_log` y en el feed del productor; el sello se escribe
  solo si el correo salió.
- **Añadido**: en `/ocp/kr?productor=`, el bloque **Inactividad de la cuenta**: en qué va el barrido y el próximo paso, **«Proteger
  cuenta»** (no se borra nunca) y **«Borrar cuenta»** con la frase escrita «Borrar Cuenta» para una cuenta sin finca ni lote
  (`inactividadActions.ts`, clase `emite`). Una sola rutina de borrado (`borrarCuenta.ts`) para el botón y el barrido: limpia lo que no
  cae en cascada (`producer_comm_log`, `producer_comm_ack`, `media_assets`; `audit_log` conserva el rastro sin autor) y vuelve a
  comprobar la regla con datos frescos.
- **Datos**: tabla `producer_inactividad` (service-role-only; acta `docs/migraciones/2026-09-30_inactividad_marchitando.sql`); quedaron
  protegidas las tres cuentas de amigos y familia y CTC Redes.
- **Docs**: charters `consolas` y `kaffetal-regal`, HANDOFF (crons), ALINEACION §3. Nuevo `qa-inactividad` (26); `qa-trato` cuenta tres barridos.

## [V5.102] — 2026-09-30 (commit ec96ce6)

- **Añadido**: en Kaffetal Regal, **«Borrar» dentro de la pantalla de edición del lote y de la finca**, con un pop-up en el que el
  productor **escribe «Borrar Lote» o «Borrar Finca»** para confirmar (`ConfirmarBorradoModal`; owner, 2026-09-30). Las tarjetas de
  «Mis Fincas» y de los lotes pasan por el mismo pop-up. La regla de qué se puede borrar no cambió (`isLotCommitted` /
  `fincaSelfDeletable`).
- **Cambiado**: **editar una finca es una página completa** (`FincaView`), con la misma cabecera y el mismo lienzo que la Ficha del lote,
  en vez del pop-up de 560 px; el pop-up (`FincaModal`) queda solo para registrar una finca nueva. (Código de `kaffetal-regal` con el
  «organiza todo» del owner; ALINEACION §3.)
- **Corregido**: el borrado del lote fallaba en silencio cuando la RLS lo filtraba (PostgREST devuelve cero filas, no error): los dos
  DELETE piden `.select("id")` y tratan cero filas como fallo.
- **Docs**: charter `kaffetal-regal` (mapa de código, dos reglas propias), ALINEACION §3. `qa-kr-ficha` +6.

## [V5.101] — 2026-09-30 (commit 0654a1f)

- **Añadido**: en **Productores, Fincas y Lotes** (`/ocp/kr`), tres cosas que el owner pidió al empezar a cargar productores para la
  Etapa 2 (2026-09-30): los filtros rápidos **«Finca ✅» y «Lote ✅»** junto a «Sin finca» y «Sin lote» (`?filtro=con-finca|con-lote`);
  **el correo del productor** bajo su código y su estado, en las dos vistas; y **el estado del productor como filtro de casillas**
  (Marchitando · Nuevos · Primíparos · Establecidos · Activos, uno o varios a la vez, `?segmento=a,b`), que hasta ahora solo se leía
  en cada fila. `KrFila` lleva `segmentoId` (el id, no solo el rótulo) y `productorEmail`.
- **Docs**: charter `consolas` (V5.76 → V5.101 en `/ocp/kr`, guardianes). `qa-boards` +5.

## [V5.100] — 2026-09-30 (commit 7997468)

- **Cambiado**: **el código del lote es `CTC-L-XXXXXXXX` en todas partes** (owner, 2026-09-30) — la misma forma que `CTC-P-` y
  `CTC-F-`, derivado del uuid en una sola fuente (`ctcLotReference` = `ctcLotReferenceShort`, `src/components/kaffetal-regal/data.ts`).
  Sustituye al `CTC_` + 32 hex y a los 7 hex sueltos que iban en el paquete de muestra, la factura, la Ficha (A1, `datasheet.ctc_uid`, la
  vista previa), el dossier, la certificación EUDR, el UID anónimo del Q-Grader y todo el OCP. El `CTCX-XXXX-XXXX` público del catálogo
  no cambió. (Código de `kaffetal-regal` con el «organiza todo» del owner; ALINEACION §3.)
- **Datos**: las 13 fichas guardadas con el formato viejo (`datasheet.ctc_uid`) se reescribieron por SQL.
- **Docs**: charter `kaffetal-regal`, ALINEACION §3. `qa-evaluaciones` 51 → 53.

## [V5.99] — 2026-09-30 (commit cf3155e)

- **Cambiado**: **las mezclas son un tipo de lote** (owner, 2026-09-30). El arquetipo de la Ficha cruza el conjunto de fincas (A2) con la
  composición (B1): `deriveArchetype(contribs, composicion?)` + `composicionDeVariedades()` (`src/lib/lotComposition.ts`); nacen **Single
  Estate Blend** (una finca, varias variedades y/o procesos) y **Single Origin Regional** (varias fincas del mismo departamento, una
  variedad y un proceso); Regional Blend queda para la región con varias. Lo pasan `PaneA2`, la vista del lote del OCP, el dossier, la
  certificación y el snapshot de la DDS (código de `kaffetal-regal`, con el «organiza todo» del owner; ALINEACION §3).
- **Cambiado**: **la mezcla de CTCx Selection es de varios productores** y lee la composición ENTERA de cada lote (todas las variedades
  con su proceso, todas las fincas: `SELECT_LOTE_PARA_MEZCLA` embebe `datasheet` y `lot_contributions`; `tipoDeMezcla` deriva sobre la
  unión; `validarCierre` exige ≥ 2 productores — un blend de un solo productor es un lote). `guard_mezcla_cerrada` reescrito igual
  (migración `mezclas_como_tipo_de_lote`, acta en `docs/migraciones/`). Las pantallas de mezclas enseñan las listas.
- **Docs**: `PVC_BCP_PLAN` §14.8 n.º 33; el brief de Compras cierra la sub-pregunta de la decisión 4; HANDOFF; charters. `qa-claims`
  y `qa-compras` prueban la composición.

## [V5.98] — 2026-09-30 (commit fe288a1)

- **Añadido**: **las dos cuentas de auditoría** (owner, 2026-09-30: «creemos 2 y toma control total de ellas»): un productor y un
  comprador `@ctc-qa-test.co`, del nodo final, con credenciales SOLO en `.env.local` (`QA_PRODUCER_EMAIL`, `QA_BUYER_EMAIL`,
  `QA_PASSWORD`). `src/lib/email/cuentasDePrueba.ts` (`esCorreoDePrueba`) y el remitente único las salta: nunca reciben correo.
- **Cambiado**: `qa-guard-check` y `qa-checkout-check` leen las cuentas del entorno, solo aceptan el dominio de pruebas y **limpian lo
  que escriben** (el lote de prueba, el nombre y la razón social; el pedido y la reserva). `create-qa-producer` / `create-qa-buyer`
  solo crean en ese dominio. `qa-asistencia` 57 → 59.
- **Corregido**: la primera corrida real de `qa-guard-check` (12/12) destapó una expectativa vieja suya: desde la V5.64 un productor NO
  cierra la Ficha sin dos fotos (`guard_lot_fotos_intake`); la prueba exige ahora el rechazo sin fotos y el paso con dos.
- **Docs**: ALINEACION §4.6 y §3; charter `consolas` (g); HANDOFF; AGENTS.

## [V5.97] — 2026-09-30 (commit 8f28aa7)

- **Cambiado**: la checklist de la Visa dice **«EUDR · Pasaporte de la finca»** y **«Fotos y video (B4)»** (`evaChecklist.ts`); la
  vista del lote firma y enseña las fotos B4 junto al video (antes solo el video).
- **Retirado**: el índice **`/ocp/fichas`** (owner, 2026-09-30: «lo puedo ver en Productores, Fincas y Lotes»): 308 a `/ocp/kr`
  (talón fuera de `(app)`, `rutasMovidas.ts` con 57 rutas); `FichasClient.tsx` vive en `kr/`. `qa-fichas` y `qa-registro` leen la vista del lote.
- **Añadido**: **lectura de una cotización courier desde la LCP** (`/lcp/crm/caas/cotizacion/[id]`, compuerta del layout de la LCP;
  `src/lib/courier/lectura.ts`): piezas, opciones y desglose por concepto del acta congelada, sin los % del acuerdo con FedEx. La
  tarjeta del CRM CaaS enlaza «Ver desglose» y «Abrir en el cotizador (ECP)». Cierra la decisión (a) del charter.
- **Añadido**: **la firma del contrato avisa al productor** (`signContract`): nota en su feed y correo por el remitente único; el
  resultado del envío queda en el rastro (`audit_log.notes`). Cierra la decisión (c) para la firma.
- **Cambiado** (código de CTC Home, `plataforma`, con el «organiza todo» del owner): `EcosystemSection` (ES · EN · DE) deja de hablar
  del Kaffetal Club, de la Cupping Arena como competencia y de la escalera de entregas — dice Q-Grader certificado, precio anclado
  al PVC, trato mes a mes y evaluación subvencionada; `Hero`, `MomentSection` y `pageIndex` dicen «temporadas de evaluación» y «puntaje
  del Q-Grader». Cierra la fila de §3b del wrap V47.
- **Docs**: charter `consolas` (a · c · e), plan §«Pendiente de la Etapa 1», ALINEACION §3 y §3b, AGENTS (57 rutas).

## [V5.96] — 2026-09-30 (commit 203ec44)

- **Cambiado**: **los mínimos que el productor declara por lote, confirmados por el owner** (2026-09-30): Black y Red 6 cargas ·
  Blue 3 cargas · **Gold 150 kg** (era 200) · **Tyrian sin mínimo** (`MINIMO_POR_GRADO`, `src/lib/trato/terminos.ts`). La oferta,
  la calculadora y «Mi trato» lo leen de ahí.
- **Retirado**: `MOQ_SUBASTA_TYRIAN_KG` (100 kg de CPS): ningún código lo aplicaba y el owner fijó que Tyrian no tiene mínimo.
- **Docs**: `PVC_BCP_PLAN` §14.8 n.º 31 redactado como lo dijo el owner —la carga de CPS es el común denominador; el MOQ de compra de
  CaaS es de cara al comprador, el reflejo en verde de una carga— y §12.6 lo repite; plan §6 decisiones 1 y 3; charters.
- **Cambiado** (código de `herramientas-internas`, con el «organiza todo» del owner; ALINEACION §3): `LecturaBoard.tsx` deja de decir
  «mezclas de 3 a 4 productores … 3 o 4 cargas» (el pendiente que dejó el wrap V47). `qa-trato` 106 (sin el MOQ de Tyrian).

## [V5.95] — 2026-09-30 (commit d47dfc4)

- **Añadido**: **la subvención por defecto del 30 %** (owner, 2026-09-30): toda solicitud de evaluación que entra por el panel del
  productor nace con la campaña «Kaffetal Regal · subvención por defecto» (`SUBVENCION_KR_PCT`, `campanaPorDefecto()` en
  `src/lib/arena/subvencionServidor.ts`; `postularLote` emite un KRX- del 30 % y guarda `subvencion_id`). CTCx la sube a 60–70 % o la
  quita en Solicitudes de Evaluación; **la tarifa plena ($200.000) queda solo para quien pide la evaluación sola**, que CTCx registra desde
  el OCP. Solicitudes, Campañas y el panel del productor lo dicen.
- **Corregido**: el pago se confirma sobre el monto congelado en la solicitud (`dueFor(pct, ins.amount_cop)`; antes leía la tarifa
  vigente) y las notas al productor ya no hablan de «inscripción de Arena».
- **Cambiado** (código de `kaffetal-regal`, con el «organiza todo» del owner; ALINEACION §3): la página pública de Kaffetal Regal
  (`PorQueSection`) y su FAQ (`faq.ts`, que alimenta el JSON-LD) dicen **$200.000 con el 30 % por defecto** y la muestra **contra
  entrega**, en ES · EN · DE — decían $80.000 y «envío por su cuenta» desde julio.
- **Docs**: plan §6 decisión 2; ALINEACION §3. `qa-solicitud-evaluacion` 79 → 81.

## [V5.94] — 2026-09-30 (commit a382f5c)

- **Cambiado**: **la muestra de 2 kg se parte como la dibujó el owner** (feedback del 2026-09-30): el primer kilo de CPS son **cuatro
  porciones de 250 g** — una la cata el Q-Grader de inmediato (`evaluacion`, 250 g) y **tres quedan de reserva** (`contramuestra`, 750 g) —
  y el segundo es el kilo CTCx que se trilla entero (~750 g de verde = **2 × 125 g al vacío** + ~500 g a tostar → ~400 g). `PARTICION_KG`
  pasa de 500/500/1000 a 250/750/1000 (`PORCION_CPS_KG = 0.25`); lo que ya estaba recibido no cambia (el saldo se deriva).
- **Cambiado**: **la revisión de almacenaje a los 90 días toma UNA contramuestra de reserva CPS (250 g)**, no el kilo de testeo que
  desde la V5.89 se trilla entero: `KG_REVISION_ALMACENAJE = PORCION_CPS_KG`; `almacenajeCarga.ts`, `anotarRevisionDeAlmacenaje`, la
  pestaña de `/ocp/muestras` y la tarea `muestra` del Tablero miran la reserva (`saldoReservaKg`). Cierra la decisión (b) del charter.
- **Cambiado** (código de `kaffetal-regal`, con el «organiza todo» del owner; ALINEACION §3): las instrucciones de envío y su etiqueta
  recortable dicen que los 2 kg son representativos y de uso exclusivo de CTCx, con las porciones, y ya no nombran la «Cupping Arena».
- **Docs**: `PLAN_CIRCUITO_DEL_LOTE` §0 paso 10 y «Pendiente de la Etapa 1»; brief de Muestras; charters `consolas` y `kaffetal-regal`;
  HANDOFF. `qa-muestras` lee ahora la regla de la fila V5.94 de ALINEACION §3 (porción y días) y prueba la partición nueva.

## [V5.93] — 2026-09-26 (commit a37bc60)

- **Cambiado**: **el Disco Agtron V8** (`public/tools/agtron/agtron-dial.html`; la fuente del owner, `reference/html_tools/agtron/agtron_dial_metre-V8.html`).
  **La lectura por foto sale de la luminosidad (L\*)**, lo más cercano en luz visible a lo que mide un Agtron. La V7 buscaba a la vez
  el número, el matiz y el brillo: podía «pagar» puntos Agtron con un escalón de brillo, y una dominante de color moderada movía la
  lectura entre 56 y 76 sobre una muestra de 63 (una foto más oscura llegaba a leer más clara). Ahora el matiz y el brillo son solo
  de visualización.
- **Añadido**: **blanco de referencia** opcional (se toca el papel bajo la muestra): corrige la exposición y la dominante de la luz
  antes de leer, y avisa si el blanco está quemado o no es más claro que el café. Probado con fotos sintéticas: una subexpuesta ×0,7
  con dominante cálida leía 62 sobre un 70 real; con blanco lee 70.
- **Añadido** (feedback del owner): **7 puntos o áreas arrastradas, con el % del área marcada en vivo y un mínimo del 10 %** de la
  foto para aplicar (siete puntos bien repartidos ≈ 10,5 %; se promedia la unión en luz lineal). Las instrucciones piden **luz de día
  o luz blanca, a unos 12 cm de la superficie**, sin flash y con papel blanco en el encuadre.
- **Añadido**: **la ventana de tueste de catación SCA** (≈ 58 en grano entero y 63 en molido, escala Gourmet, ±1) como banda en el
  dial y estado en la lectura, con un conmutador Grano entero · Molido.
- **Añadido**: **alemán** (la herramienta ya traía inglés y español) y apertura en el idioma de quien la usa: `?lang=` → el idioma
  que la superficie guardó en ese origen (`ctc-lang`, `cp-lang`, `kr-lang`) → el navegador → inglés.
- **Corregido**: **la memoria**. El puente por defecto solo guardaba el matiz y el zoom de la foto (el único trabajo guardado era
  `{hueSlider:"0", zoomSelect:"1"}`, resumen «1 · 0»); ahora la herramienta entrega su propio esquema (`agtron-dial/1`: número,
  escala, forma, matiz, brillo y de dónde salió la lectura) y el resumen «Agtron 58 · Gourmet · Medium Dark». Los trabajos de la V7
  se siguen abriendo.
- **Corregido**: el aplicado automático a los 10 s dispara **una vez** por muestra nueva; en la V7 era un intervalo que sobrescribía
  para siempre cualquier movimiento manual del dial.
- **Añadido**: `qa-tools-puente-conformance` gana **sondas** para herramientas con esquema propio: el Agtron deja de pasar como
  «SIN-CAMPOS» y se le exige que el número llegue al estado y vuelva (13/13).
- **Datos**: `tools.guia` de `agtron` reescrita con el método nuevo.

## [V5.92] — 2026-09-25 (commit 0f12bb1)

> **Wrap V47** (2026-09-25): ciclo compilado en `Documentacion_Interactiva_V47.0(322fc67).html` — 42 nodos (=) · 175 fichas (+20: la Etapa 1 del circuito del lote —`plancircuito`, `sesionasistida`, `desacoplado`, `gradoquerige`, `certificacionconestado`, `dossierlote`, `solicitudevaluacion`, `terminos`, `gestionmuestras`, `almacenaje`, `modulosdelsocio`, `escala`, `homologacion`, `pvcparagrado`, `simulador`, `mesames`, `mora`, `compras`, `mezclas`, `samplekits`) · 68 trazas (+6, y 10 reescritas sobre su sucesor) · 108 wires (+4, −1) · 38 CTX (13 ampliadas) · 475 ANN (+54; 5 repuntadas, 13 reescritas, 8 ampliadas) · Postgres 128 tablas. Veintidós asientos (V5.71–V5.92); la auditoría previa reconcilió maestro, charters, AGENTS, HANDOFF, planes y briefs en el mismo commit.

- **Corregido**: **la fórmula CVA**, tal como la corroboró el Q-Grader (informe del 2026-09-25, `PLAN_CIRCUITO_DEL_LOTE` §10): **ocho**
  secciones (Fragancia y Aroma aparte), la Impresión general cuenta **una** vez, redondeo al 0,25, cinco tazas registradas una a una con
  su tipo de defecto (una defectuosa es también no uniforme), una planilla incompleta no da puntaje y un valor fuera de 1–9 es un error.
  El formulario SCA 2004 aplica sus dominios (atributos 6,00–10,00 en pasos de 0,25; uniformidad · taza limpia · dulzor 2 puntos por
  taza; defectos por taza ×2 · ×4) y exige los diez atributos. No había evaluaciones CVA en la base.
- **Añadido**: **la planilla dual** del CTCx Coffee Datasheet Tool (owner): un conmutador de vista SCA 2004 · CVA · Ambas. El SCA 2004
  nativo es el protocolo primario (rige y calibra la escala de grados); «Ambas» registra las dos y alimenta el **banco comparativo** que
  se pedirá a los Q-Graders del Centro de Calidad.
- **Añadido**: **el Punto homologado** (`src/lib/arena/homologacion.ts`): un puntaje CVA no es un Punto y se homologa de forma
  determinista con un intervalo (banda 79 + (CVA − 79)/k, k de 1 a 2, mientras no haya calibración); el grado firme se lee del piso,
  Tyrian exige un Punto nativo y un intervalo que cruce los 80 queda «pendiente de recata» (ni galardón ni rechazo). El veredicto, «la
  evaluación que rige» y la apreciación de la Arena deciden por el Punto; el Centro, «Lotes en Evaluación» y KR enseñan su procedencia
  («Punto homologado desde CVA … hasta X con recata SCA»). `sca_total` sigue siendo la columna que leen todos y ahora ES el Punto.
- **Datos**: migración `evaluaciones_punto_homologado` (acta): `lot_evaluations.punto`, `cva_total`. Las cuatro cuentas de prueba
  `@ctc-qa-test.co` que quedaban y sus 5 leads se eliminaron (owner).
- **Docs**: plan del circuito §10 (las seis respuestas, los vectores, R1–R8, las seis decisiones contestadas, lo que sigue);
  `qa-centro-calidad` 65 → 95 (los vectores se leen del §10.2); `PVC_BCP_PLAN` §9.1 recuadro; charters `consolas` y `socios`; HANDOFF;
  ALINEACION §3. El one-pager del Q-Grader se regeneró con la lógica corregida.

## [V5.91] — 2026-09-25 (commit 015e284)

- **Cambiado**: **las mezclas de CTCx Selection por composición** (owner, 2026-09-25; decisión 4 del brief de Compras). **La regla
  «3 a 4 productores, una carga por productor, Red de una sola variedad» se retira de raíz.** Cada lote trae su composición en la
  ficha (variedad, proceso, la finca —el estate— y su región); una mezcla Black o Red es **Single Origin** (varios estates con la misma
  variedad y proceso) o **Regional Blend** (varios lotes de la misma región) y el tipo **se deriva** de sus lotes al añadir y al
  cerrar (la base lo vuelve a derivar). Blue, Gold y Tyrian son casi siempre Single Estate.
- **Cambiado**: **el mínimo es el MOQ de compra** —una demanda de al menos **3 cargas** para Black y Red (`lectura.ts`; los dos tableros
  del Modelo Económico lo dicen; el incremento sigue siendo la mitad, 1,5 cargas)—, y **CTCx asegura un mínimo por temporada** desde
  Adquisición para cada mezcla (temporada + kilos objetivo: informa cuánto falta, no bloquea el cierre). Las mezclas se arman solo con
  compras destinadas a CTCx Selection. `PVC_BCP_PLAN` gana el §14.8 (n.º 30–32) y deja tachada la regla vieja.
- **Datos**: migración `mezclas_composicion` (acta en `docs/migraciones/`): `mezclas.tipo` (single_origin · regional_blend),
  `temporada`, `objetivo_temporada_kg`; `guard_mezcla_cerrada` reescrito (varios lotes, un grado, el tipo derivado, dentro de lo
  disponible). `LOTES_EN_MEZCLA`, `CARGAS_POR_PRODUCTOR`, `MOQ_MEZCLA` y `COMPOSICION_MEZCLA` ya no existen.
- **Docs**: `qa-compras-check` 95 → 96 (§10 reescrito: lee el §14.8 del plan del PVC), `qa-pvc-lectura` 67 → 60; charters de
  `consolas` y `herramientas-internas`, brief de Compras (sin decisiones abiertas), HANDOFF, ALINEACION §3.

## [V5.90] — 2026-09-25 (commit 8fb7c6f)

- **Cambiado**: **«CTCx Selection · Compras» pasa a llamarse «Adquisición de Stock Café (Selection/Sample Kits)»** (owner, 2026-09-25;
  misma ruta `/ocp/compras`): CTCx adquiere con la misma herramienta el stock de la oferta y el de los kits para compradores. Cada compra
  en firme dice **a qué stock va** (`compras.destino`: CTCx Selection · Sample Kits; se elige al registrar y se cambia por fila mientras no
  tenga kilos en kits). «Oferta desde CTCx Selection» solo cuenta lo destinado a Selection.
- **Añadido**: **«Stock de Sample Kits»** (`/ocp/sample-kits`, en OCP · Catálogo): el café adquirido que NO va a la oferta, gestionado en
  kits — **Sample Kit (CP)** 8 lotes × 250 g de verde (solo donde hay un Master Roaster o partner CaaS; ≈ 65 € · US$65), **Plus** 5 lotes
  × 2 kg de verde (FOB US$120–170), **Max** 4 lotes × 6 kg de CPS (FOB US$280–400). Un kit se arma lote a lote con compras destinadas a
  Sample Kits (lo disponible se DERIVA: comprado − asignado a kits no anulados), sale **enviado** completo con su guía (si nació de un pedido
  de la tienda, el pedido pasa a enviado) o se **anula** con motivo; nada se borra. La conversión CPS → verde es la de la nota del owner
  (125 kg de CPS ≈ 90 kg de verde). Regla pura en `src/lib/compras/sampleKits.ts`.
- **Datos**: migración `adquisicion_stock_sample_kits` (acta en `docs/migraciones/`): `compras.destino`, `sample_kits` (SK-AAAA-NNN),
  `sample_kit_items`, guards `guard_sample_kit_item` (componentes solo con el kit armado) y `guard_sample_kit_stock` (lo asignado nunca
  supera lo comprado). RLS, cero políticas.
- **Docs**: `qa-compras-check` 73 → 95 (§11: los números de los kits se leen de la fila 8 del §5 del plan). El one-pager de la fórmula CVA
  para el Q-Grader queda en `docs/CVA_one-pager_para_el_Q-Grader.pdf`.

## [V5.89] — 2026-09-25 (commit 2d0c8e2)

- **Añadido**: **las bodegas de muestras** (owner, 2026-09-25; decisión 1 del brief → opción C): `bodegas_muestras` con responsable,
  dirección, capacidad en muestras de 1 kg y estado, y las cuatro sedes de arranque (Planta de Empaque Santillana 400 · Oficina CCB
  100 · CIR Bucaramanga y Manuel Specialty Roasters pendientes). La ocupación se deriva de las muestras con saldo. Pestaña «Bodegas»
  en `/ocp/muestras`; la bodega se elige al recibir la muestra y al ubicarla.
- **Cambiado**: **la partición real de los 2 kg**, tal como la dibujó el owner: 2 × 250 g «Evaluación Inicial Q-Grader», 2 × 250 g
  «Contramuestras de Reserva CPS» y 1 kg «Muestra de Evaluación CTCx» que se **trilla** por completo (~750 g de verde: 400 g de
  tostado para ensayos piloto + 250 g de verde al vacío). `trillarMuestraCtcx` anota la salida del kilo y crea las dos muestras
  derivadas; los kilos 500/500/1000 del folio 7 no cambian. Los 2 kg son de uso exclusivo de CTCx: las muestras para compradores
  (Sample Kits) salen de Adquisición de Stock.
- **Datos**: migración `bodegas_muestras` (acta en `docs/migraciones/`): la tabla y sus cuatro filas, `muestras.bodega_id`,
  `muestras.origen_muestra_id`, tipos `verde_vacio` · `tostado_ensayo`, motivo `trilla_verde`. Las cinco cuentas `prueba-*` se
  eliminaron a pedido del owner (las pruebas se harán con Asistencia a Proveedores y Proveedor Desacoplado).
- **Docs**: `qa-muestras-check` 67 → 85 (las bodegas, las cuatro sedes, el kilo CTCx contra los números del diagrama).

## [V5.88] — 2026-09-25 (commit fff34d8)

- **Añadido**: **la revisión de almacenaje a los 90 días** (2.ª tanda de Gestión de Muestras; owner, 2026-09-16: «a más de 90 días
  de la catación no se recata, se hace revisión de almacenaje con 1 kg»). Se DERIVA de la fecha de la evaluación que rige el grado y
  de la última revisión anotada — sin campo aparte (`src/lib/muestras/almacenaje.ts`, puro; el kilo es la porción de testeo del
  folio 7) — y sale como tarea `muestra` del Tablero de Ejecución y como pestaña de `/ocp/muestras`; anotarla es una salida más
  de la muestra de testeo con su resultado. Un lote cuyo último contrato ya cerró no se revisa.
- **Añadido**: **las muestras para comprador**: los pedidos de pack (`sample_pack_orders`) se arman con salidas «a un comprador»
  ligadas al pedido (`agregarMuestraAlPedido`, borrador) y se marcan **enviados** con guía (`marcarPedidoEnviado`, emite); el
  pedido pasa por pedido → en preparación → enviado. Qué lotes y cuántos gramos van los decide CTC (decisiones 4 y 5 del brief:
  del owner).
- **Datos**: migración `muestras_pedidos_envio` (acta en `docs/migraciones/`): `sample_pack_status` + `preparado` · `enviado`;
  `sample_pack_orders.preparado_at/enviado_at/enviado_por/guia/notas_ctc`; `muestra_movimientos.pedido_id`. Ninguna columna para
  la alerta de los 90 días.
- **Docs**: `qa-muestras-check` 41 → 67 (la regla de los 90 días leída de `ALINEACION` §3; la tarea derivada; los pedidos).
  La columna «laboratorio» del brief no vuelve: el Centro de Calidad la sustituyó (fase 4).

## [V5.87] — 2026-09-25 (commit 8a5e25a)

- **Añadido**: **las mezclas de CTCx Selection** (2.ª tanda del brief de Compras): `/ocp/compras/mezclas` arma una mezcla como
  borrador, componente a componente, con compras en firme del mismo grado, y la **cierra** cuando cumple la regla del owner —
  **Black** blend de 3 a 4 orígenes y/o variedades, **Red** una sola variedad y 3 a 4 orígenes, **una carga (125 kg de CPS) por
  productor**, ni de dos ni de cinco—. La regla se LEE de `src/lib/pvc/lectura.ts` (`src/lib/compras/mezclas.ts`, puro) y la base la
  repite al cerrar (`guard_mezcla_cerrada`); los componentes se congelan fuera del borrador; una mezcla no se borra, se anula con motivo.
- **Añadido**: **lo disponible descuenta lo asignado a mezclas** (comprado − en mezclas − vendido, derivado) en «Oferta desde CTCx
  Selection» y en Compras; la **ubicación física** de cada compra (`compras.ubicacion`, texto libre hasta que el owner fije los sitios).
- **Cambiado**: Compras enseña «En mezcla» y «Ubicación» por compra y habla en kg de CPS (la conversión a verde es del Modelo de
  Producción: aquí no se inventa un factor).
- **Datos**: migración `mezclas_ctcx_selection` (acta en `docs/migraciones/`): `mezclas` (código `MZ-AAAA-NNN`), `mezcla_componentes`,
  `compras.ubicacion`, guards `guard_mezcla_cerrada` y `guard_mezcla_componente`; RLS y cero políticas.
- **Docs**: `qa-compras-check` 51 → 73 (§10: la regla desde `lectura.ts` y el PVC plan, la base con las mismas cifras, lo asignado
  descuenta, nada se borra). Queda con el owner la decisión 4 del brief (¿una mezcla es un lote nuevo con código público y ficha?).

## [V5.86] — 2026-09-25 (commit c1ba77e)

- **Añadido**: **los recordatorios de mora** (fila «Recordatorios» del §4 del `PLAN_CIRCUITO_DEL_LOTE.md`; decisión 6: visible,
  nunca automática). El cron semanal `/api/cron/recordatorios` corre ahora dos barridos, y solo dos: las certificaciones con
  evidencia pedida (V5.78) y el **pedido del mes sin envío mientras esté en mora** — el primero al entrar en recargo, luego cada
  semana, como mucho 4 por mes (el mismo tope de las certificaciones). Cada recordatorio deja rastro en `audit_log`
  (`mora_recordatorio_enviado`), una nota en el feed del productor y un correo por el remitente único. **Nada cambia de estado**:
  la ruptura sigue siendo del owner. Regla pura en `src/lib/trato/mora.ts`; el OCP enseña cuántos recordatorios van por mes.
- **Datos**: migración `mora_recordatorios` (acta en `docs/migraciones/`): `contract_months.recordatorios_mora`,
  `ultimo_recordatorio_mora_at`.
- **Docs**: `qa-trato-check` 90 → 106 (§7: la regla desde el §4 y el §7 del plan; el barrido no toca estados).

## [V5.85] — 2026-09-24 (commit 85e5014)

- **Hito**: **la fase 8 del `PLAN_CIRCUITO_DEL_LOTE.md` — CTCx Selection y Compras** (folio 8, paso 19; decisión 7; respuesta 7
  del 23-sep). Con ella **la Etapa 1 queda ejecutada en código** (fases 0–8, V5.76–V5.85); las fases 6–8 no se condujeron en
  navegador (exigen las cuentas `prueba-*`). Código de `cherry-picked` y `kaffetal-regal` tocado con el «continúa» del owner
  (`ALINEACION` §3).
- **Añadido**: **`compras`** — el registro de cada compra en firme de CTCx (lote, grado, kg, COP/kg con su edición del PVC, pagada,
  recibida, origen). Nace sola al **pagar el mes** de un contrato de compra en firme (oferta `directa` · `black`;
  `registrarPagoDelMes`) o a mano en `/ocp/compras` (`registrarCompraManual`, con nota). Lo disponible no se guarda: se deriva
  (`src/lib/compras/reglas.ts`).
- **Añadido**: **«Oferta desde CTCx Selection» = la disponibilidad de lo comprado** (decisión 7): por lote, lo comprado, lo pagado,
  su listado en Cherry Picked, lo disponible y «Pasar al Catálogo Activo»; `publishLot` admite un contrato cumplido.
- **Añadido**: **el perfil único de CTCx Selection** (nombre, lema, descripción e imagen; `platform_settings.ctcx_selection_perfil`,
  vista pública `public_ctcx_selection_perfil`) y la **imagen por lote** (`ctcx_selection_lotes`, bucket público `ctcx-selection`,
  subida firmada desde el navegador). La cinta, la tienda, el portal y la ficha enseñan el perfil en vez de la finca; la cinta y
  el portal pintan la imagen.
- **Cambiado**: `public_lot_catalog.ctc_selection` sale de `compras` (cualquier grado menos Tyrian) y la vista gana
  `ctcx_imagen_path`; un **Black** recibe oferta de temporada/directa/excepción como los demás grados; el circuito gana el lateral
  **«CTCx Selection»** (OCP y KR con la misma regla, `esCompraEnFirme`).
- **Retirado**: el CRM de `black_negotiations` (kanban Black Stock · Selección, `decideBlackNegotiation`, `ctcSelectionActions`, la
  negociación que nacía en el veredicto): tabla dormida, sin lector ni escritor; la pestaña «Selección» dejó su talón 308.
- **Datos**: migración `compras_ctcx_selection` (acta en `docs/migraciones/`): `compras`, `ctcx_selection_lotes`, bucket
  `ctcx-selection` (lectura anónima), `public_lot_catalog` v2, `public_ctcx_selection_perfil`, semilla del perfil.
- **Docs**: `qa-compras-check` (51, nuevo — desde el brief, el paso 19 y la decisión 7); `qa-circuito` 56 → 60; `qa-ofertas` y
  `qa-sneak-peek` al rótulo nuevo; `qa-rutas-consolas` 512 (56 rutas mudadas).

## [V5.84] — 2026-09-24 (commit 6be424e)

- **Hito**: **la fase 7 del `PLAN_CIRCUITO_DEL_LOTE.md` — el trato mes a mes** (folio 8, pasos 16–18; decisión 6 del owner:
  «nunca automática; se hace visible de manera automática»). Código de `kaffetal-regal` tocado desde la sesión `consolas` con el
  «continúa» del owner y línea en `ALINEACION` §3. **No se condujo en navegador**: exige las cuentas `prueba-*`.
- **Añadido**: **`contract_months`** — el trato vive mes a mes: CTCx **pide** la cantidad del mes (`pedirDelMes`), registra el
  **envío** (`registrarEnvioDelMes`, que se espeja en `contract_releases` al 100 % para que el stock del catálogo siga leyendo lo
  mismo) y el **pago** (`registrarPagoDelMes`, solo sobre lo enviado); con los meses enviados y pagados el trato queda `completed`
  solo. `/ocp/contratos` gana «Renovados» y «Ruptura».
- **Añadido**: **lo derivado se deriva** (`src/lib/trato/mesAMes.ts`, puro): la mora de cada mes (2 semanas sin cargo · 2 con
  5 % · después **ruptura potencial**), el mes en curso, el tramo libre de retiro, el past crop y si toca renovar. El OCP
  (`/ocp/contratos/[id]`, la tabla de `/ocp/kr`) y el productor («Mi trato», la barra del lote) la leen con la MISMA función;
  nada se persiste; el circuito gana las laterales **«en mora»** y **«ruptura»**.
- **Añadido**: **el retiro del productor** (`previsualizarRetiro` → `retirarDelTrato`, `src/lib/trato/producerActions.ts`): ve
  la cuenta antes de confirmar — lo que cabe en el tramo libre acumulado sale sin costo, el resto paga el 4 % del precio de cada
  carga (`retiro()` reproduce el §12.9: $1.040.000 · $780.000 · $520.000).
- **Añadido**: **la ruptura contractual la declara el owner** (`declararRuptura`, con motivo): `status: ruptura` y la cuenta del
  productor **congelada** (`producer_profiles.estado_cuenta`, Identidad — decisión 6); `descongelarCuenta` también es del owner.
  Una cuenta congelada no acepta ofertas, no retira y no recibe ofertas nuevas.
- **Añadido**: **la renovación** (`ofrecerRenovacion`): a los 90 días de la firma, sobre un trato cumplido, emite la oferta nueva
  al PVC vigente (`renewal_of_contract_id`; el contrato viejo queda `renovado`); **past crop** también desde `lots.harvest_to` +
  9 meses (−10 %).
- **Retirado**: la escalera `RELEASE_STAIRCASE` 50/75/100 y `recordContractRelease`; `signContract` ya no siembra liberaciones.
- **Datos**: migración `trato_mes_a_mes` (acta en `docs/migraciones/`): `contract_months` (RLS select-own), `contract_status` +
  `ruptura` · `renovado`, `purchase_contracts.ruptura_at/ruptura_motivo/renovado_at/renewal_offer_id`,
  `lot_offers.renewal_of_contract_id`, `producer_profiles.estado_cuenta/_at/_motivo` con guard trigger (un JWT no la cambia).
- **Docs**: `qa-trato-check` 54 → 90 (§6: mora, retiro, renovación, past crop, decisión 6 — desde el plan);
  `qa-circuito` 45 → 56 (`en_mora`/`ruptura`, TOTAL sobre `enMora`, los dos lectores de la mora derivada).

## [V5.83] — 2026-09-24 (commit ef64fcb)

- **Hito**: **la fase 6 del `PLAN_CIRCUITO_DEL_LOTE.md` — aceptar con claridad** (folio 8, pasos 14–16). Código de
  `kaffetal-regal` tocado desde la sesión `consolas` con el «continúa» del owner y línea en `ALINEACION` §3. **No se condujo en
  navegador**: exige las cuentas `prueba-*`.
- **Añadido**: **la calculadora del trato** (`src/lib/trato/simulador.ts`, puro): con la cantidad que el productor piensa
  comprometer y el precio anclado dice qué compra CTC de inmediato (una carga), qué pediría y pagaría cada mes, qué puede
  retirar sin costo al cerrar cada mes (25 % · 25 %) y cuánto costaría retirar todo (4 % por carga sobre el tramo libre).
  Reproduce el ejemplo del §12.9 del PVC plan; `qa-trato-check` lo exige.
- **Cambiado**: **el productor acepta CON declaración**: en «Ofertas de Temporada» ve el anclaje (PVC, %, mínimo, máximo,
  compra inicial, vencimiento, términos), usa la calculadora, declara los kg (≥ mínimo del grado, ≤ máximo de una directa) por
  trimestre o por 30 días, marca las condiciones de retiro, mora y ruptura y acepta. `respondToOffer` lo exige para toda oferta
  con términos (temporada · directa · excepción); Black y subasta se aceptan como antes. Una directa vencida queda `expirada`.
- **Cambiado**: **el contrato nace LLENO**: precio de la oferta, cantidad declarada, referencia del PVC, términos, declaración,
  compra inicial y anclaje quedan en `purchase_contracts` al aceptar; **`signContract` solo firma** (y se niega si un contrato
  nació vacío). «Contratos de Temporada» es **«Mi trato»**: lo declarado, el precio, lo que CTC compra hoy, los tramos y los
  términos. El copy del Kaffetal Club salió de la pestaña.
- **Datos**: migración `aceptacion_con_declaracion` (acta en `docs/migraciones/`): `lot_offers.locked_kg/declaracion/
  terms_accepted_at`; `purchase_contracts.offer_id/terms_version/declaracion/compra_inicial_kg/pvc_edition_id/modificador_pct`.
- **Docs**: `qa-trato-check` 35 → 54 (la calculadora contra el §12.9; la declaración; el contrato lleno; la firma que no teclea).

## [V5.82] — 2026-09-24 (commit 2e35ddf)

- **Hito**: **la fase 5 del `PLAN_CIRCUITO_DEL_LOTE.md` — confirmar y ofertar** (folio 8 del owner, pasos 12–14 y 19; respuestas
  1–3). El PVC **gobierna por primera vez un precio real**: código de `herramientas-internas` (`src/lib/pvc/`) tocado desde la sesión
  `consolas` con línea en `ALINEACION` §3.
- **Añadido**: **`pvcParaGrado(grado, fecha?, {modificadorPct})`** — LA puerta al precio (`src/lib/pvc/servicio.ts` sobre
  `precio.ts`, puro): edición vigente en la fecha → banda del grado (minúscula → mayúscula por `definicion.ts`) → COP/kg y COP/carga
  × (1 ± %). Tyrian no tiene precio de oferta (se subasta). `RANGOS` del motor se **deriva de `definicion.ts`** (conflicto n.º 1
  cerrado); nadie lee el `rango` de una edición publicada.
- **Cambiado**: **la oferta se ancla, no se teclea** (`/ocp/ofertas`): CTCx decide «no ofertar» con motivo (paso 13) o emite un
  **Lote de Temporada** (PVC × banda, mínimo del grado, CTC compra una carga de inmediato, términos versionados; past crop −10 %),
  una **directa** de CTCx Selection (PVC − 8 %, ventana de 30 días, máximo) o una **excepción** con precio a mano y motivo
  obligatorio. La oferta guarda `pvc_edition_id`, `pvc_cop_kg`, `modificador_pct`, `terms_version`, `min_kg`, `max_kg`,
  `ventana_dias`, `expira_at`, `compra_inicial_kg` y, por fin, `reference_price_*`. Black conserva el precio negociado; Tyrian, el
  mejor postor.
- **Cambiado**: **el rechazo bajo Black es gratis** (reporte de mejoras, sin cashback) y nace la **re-evaluación** (`reevaluar`):
  CTCx la acuerda con su razón, la solicitud vuelve a empezar a tarifa plena sin subvención (factura y muestra nuevas), y si el lote
  **sube de grado** se le reembolsa el 80 % (`cashback_*` cambia de sentido). «Lotes en Evaluación» enseña «No superaron» y
  «Reembolsos pendientes».
- **Añadido**: `terminos.ts` completo — compra inicial (1 carga), tramos libres 25/25, penalidad 4 %, mora 2+2 semanas/5 %,
  renovación 90 días, past crop 9 meses/−10 %, directa −8 %/30 días, declaraciones — y **el circuito gana «no superó» y «sin
  oferta»** (laterales).
- **Datos**: migración `ofertas_ancladas` (acta en `docs/migraciones/`): `lot_offers.kind` con `directa` y `excepcion` + nueve
  columnas del anclaje; `arena_inscriptions` con la decisión comercial y la re-evaluación.
- **Docs**: guardianes nuevos **`qa-pvc-precio`** (52 — reproduce la escalera publicada grado por grado desde `paridad.json`,
  `RANGOS` = `definicion.ts`, las ancladas no teclean precio) y **`qa-trato-check`** (35 — cada cifra de `terminos.ts` contra el
  §0/§6 del plan; rechazo gratis; re-evaluación; «sin oferta»); `qa-circuito` 41 → 45.

## [V5.81] — 2026-09-24 (commit ebb5861)

- **Hito**: **la fase 4 del `PLAN_CIRCUITO_DEL_LOTE.md` — Centro de Calidad · Evaluación de Lotes** (folio 7 del owner, paso 11;
  respuesta 5). Código de `socios` tocado desde la sesión `consolas` con el «continúa con la fase 4» del owner; línea en `ALINEACION` §3.
- **Añadido**: **el módulo del socio** `/socios/centro-calidad/panel/evaluacion`: los Baches de Evaluación en manos de esa
  credencial, cada lote **anónimo (solo su código)**, la planilla (SCA **o CVA**, factor, mallas, **rueda de sabores**) y **«dar de
  alta»** lote a lote → `lot_evaluations` pendiente. El Q-Grader puede anular su alta mientras CTCx no decida.
- **Añadido**: **la credencial activa módulos** (`partner_accounts.modulos`: Evaluación de Lotes · Procesamiento de Lotes),
  conmutados por el owner en `/bcp/socios/[nodo]`; el panel del socio enseña el módulo o dice que no está activo.
- **Cambiado**: **registrar ≠ confirmar**: en «Lotes en Evaluación» CTCx ve el alta del Centro y la **confirma** (galardona con el
  grado derivado del puntaje / no supera; la fila pasa a `accepted` y rige el grado) o la **devuelve** con motivo; registrar a
  mano queda plegado como recurso. Al enviar un bache, el **Q-Grader es el contacto de la credencial elegida** — deja de teclearse.
- **Cambiado**: **la planilla distingue SCA y CVA en la información** (folio 11): escala como dato, siete secciones afectivas 1–9
  con la fórmula del SCA (`computeCva`), y la **rueda** con UNA taxonomía (`src/lib/catacion/rueda.ts`, ES/EN, solo ids en la
  base). Defectos del Café y el Coffee Varieties Map se enlazan desde la planilla, no se embeben.
- **Cambiado**: **el circuito gana «evaluado»** (alta del Centro pendiente, entre «en evaluación» y «pendiente de oferta»); la tabla
  del OCP lo alimenta; la barra del productor conoce el orden (y queda con dueño KR alimentar el dato).
- **Datos**: migración `centro_calidad_evaluacion` (acta en `docs/migraciones/`): `partner_accounts.modulos` (la credencial interna
  queda con Evaluación activa), `lot_evaluations.batch_id/escala/rueda/uid_anonimo`.
- **Docs**: guardián nuevo `qa-centro-calidad-check` (65 — anonimato, módulo por credencial, registrar ≠ confirmar, CVA 58–100,
  rueda única); `qa-circuito` 38 → 41; `qa-solicitud-evaluacion` re-apuntado al Q-Grader por credencial.

## [V5.80] — 2026-09-24 (commit bf2a0a5)

- **Hito**: **la fase 3 del `PLAN_CIRCUITO_DEL_LOTE.md` — solicitud, factura, muestra y Baches de Evaluación** (folio 7 del
  owner, pasos 7–10). El lado de Kaffetal Regal se ejecutó desde la sesión `consolas` con el sí del owner y línea en `ALINEACION` §3.
- **Añadido**: **«Solicitudes de Evaluación»** (`/ocp/solicitudes`, primera entrada de OCP · Catálogo): la solicitud del productor
  con su **nota de descuento**; CTCx **decide la subvención** (una campaña del 30–70 %, o ninguna; emite y canjea el código KRX-
  a nombre del productor), **corrobora y emite la factura de cobro** (`FE-AAAA-NNNNN` de una secuencia de la base; documento
  imprimible con la tarifa, la subvención, el total y el carril), **confirma el pago SOBRE la factura** (sin ella no hay qué
  conciliar; la única puerta sin factura es «CTCx asume el costo») y **recibe la muestra** con los kilos reales.
- **Añadido**: **la tarifa vive en `src/lib/trato/terminos.ts`** ($200.000, respuesta 2 del owner), con los mínimos por grado de
  la respuesta 1 (Black/Red 6 cargas · Blue 3 · Gold 200 kg), la muestra de 2 kg y la regla **contra entrega** (el flete lo paga
  CTC al recibir). `ARENA_FEE_COP`/`EVALUATION_FEE_COP` son ahora ese mismo número.
- **Añadido**: **Gestión de Muestras, 1.ª tanda** (`/ocp/muestras` deja de decir que no existe): tablas `muestras` y
  `muestra_movimientos`; el recibo crea las filas con la **partición del folio 7 (500 g evaluación · 500 g contramuestra · 1 kg
  testeo)** Y la marca que lee el circuito, en una sola acción (`src/lib/muestras/recibo.ts`; si una falla, no queda la otra);
  la lista «qué hay y dónde» con el **saldo derivado** (recibido − Σ salidas, nunca guardado), ubicar y anotar salidas
  (`borrador`, en la lista blanca), y la pestaña **Pedidos de muestra** que por fin enseña `sample_pack_orders`.
- **Cambiado**: **los baches son «Baches de Evaluación»** que van al **Centro de Calidad**: `abierto` (se arma en «Lotes a Evaluar»
  con los pagados y recibidos, ≤30) → `en_centro` («Enviar al Centro de Calidad», con el Q-Grader que firmará —se teclea hasta
  la fase 4—; la muestra de evaluación de cada lote deja su salida `a_centro`; nota a cada productor) → `cerrado` (solo cuando
  cae el último veredicto). El veredicto exige el bache `en_centro` y lo registra CTCx en «Lotes en Evaluación» hasta que el
  socio tenga su módulo. **Retirado** el kanban de sondeo con laboratorio externo, prueba de envío y «solicitud formal».
- **Cambiado**: **el circuito derivado gana «solicitada»** (`estadoDelCircuito` v2): *solicitada* (pidió; falta factura, pago o
  muestra) → *a evaluar* (pagado y recibido, sin bache) → *en evaluación* (en un bache en el Centro). La tabla del OCP y la barra
  del lote del productor lo leen de la misma función. El rail de OCP · Catálogo queda en el orden de la respuesta 7 (las dos
  «Ofertas» son el staging; Catálogo Activo al final).
- **Cambiado**: **Kaffetal Regal**: al solicitar, el productor puede **pedir un descuento por nota**; ve **«Solicitud recibida —
  CTC la corrobora y emite su factura»** y luego **la factura con su total** (la misma plantilla que el OCP); las instrucciones de
  pago aparecen solo con factura emitida; el envío dice **contra entrega**; «en fila» y «en bache» hablan del Bache de Evaluación
  y del Centro de Calidad, no de un laboratorio.
- **Datos**: migración `solicitudes_muestras_baches` (acta en `docs/migraciones/`): cinco columnas en `arena_inscriptions`,
  `next_factura_ref()` (SECURITY DEFINER, solo service role), el CHECK de `sondeo_batches.status` con los tres estados nuevos +
  `centro_calidad_account_id` y `cerrado_at`, y las dos tablas de muestras (RLS, cero políticas).
- **Docs**: guardianes nuevos `qa-solicitud-evaluacion-check` (78 — la tarifa, los mínimos, la partición y «contra entrega» se
  leen DEL PLAN; el pago sobre la factura; los tres estados del bache; el rail de la respuesta 7) y `qa-muestras-check` (41 — los
  cinco puntos del brief); `qa-circuito-check` 31 → 38 (el estado nuevo, `enBache`, la barra del productor).

## [V5.79] — 2026-09-24 (commit ef8f87b)

- **Hito**: **la fase 2 del `PLAN_CIRCUITO_DEL_LOTE.md` cierra por el lado de Kaffetal Regal** — código de `kaffetal-regal`
  tocado desde la sesión `consolas` con el sí del owner («hazlo tú desde esta sesión», 2026-09-24) y línea en `ALINEACION` §3.
- **Cambiado**: **A5 (EUDR) es el ÚLTIMO paso del intake y B4 (fotos) va antes** (folio 7 del owner): el orden es
  **FT · FT2 · FOTO · EUDR → VISA** en la Ficha (`FichaView`: panes, compuertas y botones), su navegación (`FichaNav`), la barra
  del lote (`LotKanbanStepper`) y la etiqueta del OCP (`PASOS_DE_LA_FICHA`). La finca completa su Pasaporte mientras el productor
  termina el lote; la Visa se hereda al final.
- **Añadido**: **el dossier del lote en español e inglés** (`/kaffetal-regal/dossier/[id]?lang=es|en`, `LotDossierDoc`): UN documento
  imprimible con la identidad y trazabilidad, el Pasaporte de la(s) finca(s) y la Visa del lote (con la DDS), la caracterización
  (la ficha oficial ★ y la evaluación que rige el grado) y las certificaciones **corroboradas**. Solo afirma lo que la plataforma
  tiene. Enlazado desde «Lotes Galardonados» (ES y EN); es la «Ficha descargable» de la respuesta 5 (Imprimir / PDF).
- **Añadido**: **el productor ve el estado de cada certificación** en su finca («CTC pidió el respaldo · recordatorio n de 4»,
  «corroborado por CTC», «retirada del Pasaporte por CTC», con la nota de CTC), y el **Pasaporte impreso deja fuera las retiradas**.
- **Datos**: el único borrador que iba por `intake_step = 3` (EUDR hecho, fotos pendientes) pasa a `2` para que el orden nuevo
  lo lea bien (las fotos son lo que le falta; el EUDR ya cargado se confirma en un clic).
- **Docs**: `qa-registro-check` (67) vigila también el lado de KR: el orden en las tres piezas, el estado visible y el dossier.

## [V5.78] — 2026-09-24 (commit a5a7f1c)

- **Hito**: **fase 2 del `PLAN_CIRCUITO_DEL_LOTE.md` — el registro** (lado OCP; lo de Kaffetal Regal queda con dueño en su charter).
- **Añadido**: **las certificaciones de la finca tienen estado** (folio 7 del owner): `declarada` → **evidencia pedida** (CTC
  pide el respaldo con una nota: correo + feed) → `corroborada` (contrastada, exige vigencia) — o **retirada del Pasaporte** si
  nunca se respaldó; el registro queda. **Recordatorio semanal** al productor, **máximo cuatro**, y a la quinta semana se retira
  sola: cron nuevo `/api/cron/recordatorios` (lunes 12:00 UTC, `vercel.json`), regla PURA en `src/lib/registro/reglas.ts`,
  servidor en `src/lib/registro/certificados.ts`. En el panel de certificaciones del OCP: Corroborar · Pedir evidencia… ·
  Retirar… · Reabrir, con el estado y el conteo de recordatorios a la vista.
- **Añadido**: **el chequeo contra bases EUDR oficiales** en la finca (manual por ahora, como pidió el owner): un cuadro de
  texto y adjuntos en «Análisis y Evidencia» del editor de asistencia (`fincas.eudr_chequeo_notas`, `eudr_chequeo_files`, solo CTC).
- **Cambiado**: **la transcripción de FT2 se hace en la vista completa del lote** (`/ocp/kr?lote=`): el set de Fichas Técnicas
  (soportes adjuntos, escáner con IA opt-in, compilar del reporte, la oficial ★) se monta allí; `/ocp/fichas` queda como índice.
  Y nace la **transcripción a mano en el formato de la Datasheet** (`crearFichaManual`, fuente «Compilada por CTC» que estaba
  reservada sin escritor): los mismos campos y rangos del escáner; lo que el documento no muestra se deja vacío.
- **Datos**: migración `registro_chequeo_y_certificados` (acta en `docs/migraciones/`): `finca_certificates.status` +
  `nota_ctc` + `evidencia_pedida_at` + `recordatorios` + `ultimo_recordatorio_at` + `retirada_at` (backfill: las verificadas
  → corroborada; guard: solo CTC mueve el estado, un INSERT nace «declarada», editar una corroborada la devuelve a «declarada»);
  `fincas.eudr_chequeo_*` protegidas por `guard_finca_protected_columns`.
- **Docs**: guardián nuevo `qa-registro-check` (50: la regla desde el folio, rastro en cada movimiento, remitente único, cron
  con secreto, el OCP como único escritor). **Lo que la fase 2 deja a `kaffetal-regal`**: A5 como último paso del intake, el
  dossier ES/EN por lote, la Ficha descargable, y enseñarle al productor el estado de cada certificación (hoy lo sabe por su feed).

## [V5.77] — 2026-09-24 (commit 1c80795)

- **Hito**: **fase 1 del `PLAN_CIRCUITO_DEL_LOTE.md` — retiros y mudanzas**, con la nota del owner sobre la Arena.
- **Cambiado**: **la Kaffetal Regal Arena se rehace como sesiones de segunda apreciación** (BCP · Ecosistema de Valor). Una sesión es
  un NOMBRE (sin temporada ni fecha); se llena con cafés **galardonados**; a cada uno se le hace una apreciación más con la planilla
  B2 · B3 (`LabEvalEditor`), que se **adjunta al lote** como `lot_evaluations` (`bcp_arena`, aceptada); y **el Grado lo rige UNA
  sola evaluación** (`lot_evaluations.rige_grado`, por defecto la inicial del Q-Grader), que se elige en la sesión y es lo único que
  reescribe `lots.grade` fuera del veredicto. `officialAverages` deja de promediar: devuelve la que rige (mismo nombre y forma,
  para que ofertas, subastas y la Ficha del productor no cambien).
- **Retirado**: la jornada en vivo de la Arena (runner, jueces, descartes, ganador, registro de tazas, sesión a ciegas
  `revealSessionIdentities`, `jornada.ts`, `qa-jornada-check`), la **vitrina** (`showcaseGate`, `inviteLotToArena`,
  `assignLotToSession` y sus botones) y los KPI/tareas «en fila para Arena». Las fases `arena · sesion · competido` quedan en el
  CHECK sin escritor; `arena_scores` dormida.
- **Retirado**: **el Kaffetal Club como membresía** — el galardón ya no la reparte (`grantClubMembershipOnce`), **firmar un
  contrato y publicar al catálogo ya no la exigen**, `revokeClubMembership`, `clubEmails.ts` (sin importadores) y la insignia
  «Kaffetal Club ✓» del OCP. `producer_profiles.club_member_since` queda dormida.
- **Añadido**: **«Campañas de Subvención»** en OCP · Manejo de Stock Físico (`/ocp/subvenciones`, `+ campanas/[id]`): las
  campañas de descuento del Club, con el nombre que el owner pidió, la tarifa plana de **$200.000** a la vista y la subvención
  acotada al **30–70 %**. `/bcp/club` y `/ocp/club` → 308 (`rutasMovidas`, `/ocp/club` reapuntada, sin cadena).
- **Cambiado**: los **reclamos de oficialización** del productor (FT2 con soportes, `producer_claim` pendientes) se revisan en la
  **vista completa del lote** (`/ocp/kr?lote=`), no en la Arena; `reviewEvaluationClaim` es del OCP y devuelve resultado. El Panel
  del OCP cambia sus dos KPI de Arena por «Solicitudes de evaluación por resolver» y «Reclamos por revisar».
- **Datos**: migración `arena_apreciaciones` — `arena_sessions.name` (temporada y fecha ahora opcionales); `lot_evaluations.rige_grado`
  con índice único parcial por lote y backfill (la más antigua del Q-Grader, si no la más antigua aceptada). Acta en
  `docs/migraciones/2026-09-24_arena_apreciaciones.sql`.
- **Docs**: los diez atributos SCA tienen UNA fuente (`ATRIBUTOS_SCA`, `src/lib/fichas/tipos.ts`; `SCA_KEYS` se fue con la
  jornada). `qa-evaluaciones` (51) reescrita: sin Club, y la Arena como apreciación que no toca el circuito. Lo que la fase 1
  DEJA para después: temporadas siguen en `/bcp/arena/temporadas`; `src/lib/arena/` no se renombra todavía; el cashback del 80 %
  y `RELEASE_STAIRCASE` salen en la fase 5; el copy de KR sobre Arena y Club es de `kaffetal-regal`.

## [V5.76] — 2026-09-24 (commit 4f3490c)

- **Hito**: **fase 0 del `PLAN_CIRCUITO_DEL_LOTE.md`** (el owner contestó las ocho decisiones y concedió el borrado) y las cuatro
  indicaciones del owner al ver por fin `/ocp/kr`.
- **Cambiado**: **«Productores, Fincas y Lotes» según el owner** — (1) se retira «Nuevo lote (en nombre del productor)» y su acción
  `createLot` (eso se hace con la sesión asistida); (2) la tabla nace **agrupada por productor**; (3) el mapa pinta los pines del
  **elemento** principal (fincas o lotes), no los dos a la vez; (4) filtro principal **«Ver lotes / Ver fincas»**: con fincas, una fila
  por finca con cuántos lotes tiene, y el filtro de **Pasaporte** (con · sin · o la etapa: sin Pasaporte, en trámite, en revisión por
  CTCx, aprobado sin remitir, vigente, rechazado — las etapas de `fincaEudrStatus`, no una lista a mano). `?elemento=` y
  `?pasaporte=` en la URL; el KPI «Fincas pendientes» del Panel del OCP abre `?elemento=fincas&pasaporte=en_revision`
  (cierra el pendiente (g) del charter).
- **Datos**: **borrado el juego de prueba** que el owner pidió retirar: el contrato `8618ecda` con sus 3 liberaciones, la oferta
  aceptada, el listado publicado y el lote `f5187234` («Gesha 72h Ferm», Gold) con sus evaluaciones, aportes y snapshots.
  `audit_log` se conserva; dos notas del productor quedan sin `lot_id`. ⚠️ El archivo del video queda huérfano en el bucket
  `kaffetal-media` (Supabase no deja borrar `storage.objects` por SQL): se retira por la Storage API.
- **Docs**: las ocho decisiones del owner escritas en el plan (§6) y lo que cambian en él: la Arena **se queda** en el BCP (se
  rehace como sesiones de segunda apreciación), «Ofertas CP Aceptadas» y «Oferta desde CTCx Selection» son el **staging** del
  Catálogo Activo, la subasta Tyrian sigue (MOQ 100 kg CPS), mínimos 6 · 3 · 200 kg, tarifa $200.000 con subvención 30–70 %.

## [V5.75] — 2026-09-23 (commit f4f7c66)

- **Hito**: **nacen «Asistencia a Proveedores» y «Proveedor Desacoplado»** en OCP · Kaffetal Regal — la primera tanda del brief
  `consolas-rutas-del-proveedor.md` (los tres diagramas del owner: Estándar · CTCx Selection · Desacoplado), autorizada por el
  owner el 2026-09-23 sobre el contrato de Identidad: **sí a la sesión asistida, sí a la cuenta sin buzón**.
- **Añadido**: **la sesión asistida** (`src/lib/asistencia/actions.ts`): «Entrar como el productor» genera un enlace de sesión
  (`auth.admin.generateLink`, sin correo) y lo canjea en la cookie COMPARTIDA, así que Kaffetal Regal se abre en otra pestaña
  como ese productor y toda su interfaz (finca, parcelas, mapa EUDR, la Ficha, fotos) sirve tal cual; las subidas caen en su
  carpeta y los guard triggers aplican como a él. La consola sigue en `ctc-panel-auth`. **Solo para cuentas de productor**, y
  siempre con rastro: `audit_log` + una nota en su feed. «Cerrar sesión asistida» limpia SOLO este navegador (`scope: local`).
  El botón vive en `/ocp/asistencia` (lista de productores) y en la vista completa del productor (`/ocp/kr?productor=`).
- **Añadido**: **Proveedor Desacoplado** (`/ocp/desacoplado`): CTCx crea una cuenta de productor con correo-etiqueta sin
  buzón (`desacoplado-<slug>@ctcexport.com`, el precedente de `delivery_email`), contraseña que nadie ve y
  `producer_profiles.gestion = desacoplado`; la carga con la sesión asistida; y la **entrega** asignándole el correo real de
  alguien (una identidad, una cuenta) + el enlace de contraseña por el flujo de «Recuperar acceso». Mientras es desacoplado,
  **ningún correo sale hacia él** (el remitente compartido filtra la etiqueta) y `/ocp/kr` lo rotula.
- **Añadido**: **«CTCx asume el costo»** de una evaluación (`asumirEvaluacion`, junto a «Confirmar pago» en Lotes a Evaluar):
  la inscripción queda `exento` con la razón escrita, sin fingir un código de campaña al 100 %.
- **Datos**: migración `producer_profiles_gestion_desacoplado` — `gestion` (`desacoplado` · `entregado`), `gestion_desde`,
  `entregado_at`; `guard_producer_protected_columns` las protege al insertar y al actualizar. Acta en
  `docs/migraciones/2026-09-23_producer_profiles_gestion_desacoplado.sql`.
- **Corregido**: `createLot` devolvía `throw` en dos rechazos alcanzables (tumbaba la tabla): ahora `{ ok: false, error }`.
- **Docs**: guardián nuevo `qa-asistencia-check` (57); `qa-rutas-consolas` (500) declara el módulo; charter y §3.

## [V5.74] — 2026-09-23 (commit 5ef97d6)

- **Cambiado**: **el OCP dice el vocabulario EUDR asentado en la V5.65** (`src/lib/eudr.ts`): la columna «EVA» de `/ocp/kr` es
  **«Visa»** (el veredicto documental del lote), la columna «Visa EUDR» de la finca es **«Pasaporte EUDR»**, el badge «Veredicto
  EVA» es **«Veredicto de Visa»**, «Esperando EVA» es «Esperando Visa», el editor de asistencia dice «Pasaporte EUDR de la finca»
  y los mensajes de `markLotApto` · `registerLotDds` · `setEvaChecklistItem` hablan de la Visa del lote y del Pasaporte de la
  finca (ya no de «Sello»). Cierra la divergencia declarada en `ALINEACION` §3 el 2026-09-20 — primera tanda del brief
  `consolas-simplificar-ocp-al-circuito.md`. **Ninguna regla cambió**; los identificadores (`EvaReviewCard`, `EVA_CHECKLIST_ITEMS`,
  `lots.eva_checklist`) se quedan con nota en el archivo hasta la tanda de bandejas.
- **Corregido**: `fichasActions.ts` decía «muestra de 205 g» en la instrucción del escáner de Fichas; es **250 g**, el único
  valor con el que cuadra el rango 150–245 y la aritmética del repo (`computeFactor`, `fa_start`).
- **Docs**: `qa-evaluaciones-check` (53) vigila ahora las DOS caras del vocabulario: la del productor (V5.65) y la del OCP.

## [V5.73] — 2026-09-23 (commit aa681e4)

- **Hito**: **cierra el primer ciclo del Cotizador Courier · FedEx** (V5.68 → V5.73, un día): brief aprobado, cálculo con el acuerdo
  confidencial, combustible automático, correcciones del primer recorrido, borrar, y ahora el enlace con el CRM.
- **Añadido**: **enlace con LCP · CRM CP CaaS**. Cada cotización courier puede pertenecer a UN item CaaS (una tarjeta del CRM =
  un lead del pilar `cocreate`); un item puede tener varias. En la tarjeta del CRM, la sección «Cotizaciones courier · FedEx»
  enseña las suyas (total, destino, peso real y cobrado, servicio, envío, nota) con «Abrir», y el botón «Nueva cotización courier
  para este item». El cotizador lee `?lead=` (banner «Cotizando para el item CaaS…», con «Ver en el CRM» y «Quitar vínculo»; lo
  que se guarde queda en la tarjeta) y `?abrir=` (abre una guardada). La lista de guardadas gana la columna «Item CaaS», con
  enlace a la tarjeta.
- **Añadido**: **editar la nota** de una cotización guardada (en la misma fila, Guardar/Cancelar). Acción
  `editarNotaCotizacionCourier`, clase `borrador` (entra en la lista blanca de `BCP_USER_ADMIN_PLAN.md`). Lo cotizado sigue
  congelado por el guard trigger.
- **Datos**: `courier_cotizaciones.lead_id` → `leads(id)` `on delete set null` (si el lead se borra, el acta se queda sin vínculo).
- **Cambiado** (código ajeno, `consolas`): `LeadsBoard.tsx` lee `courier_cotizaciones` solo para el pilar `cocreate`. Línea en
  `ALINEACION` §3.

## [V5.72] — 2026-09-23 (commit 8f6e969)

- **Añadido**: botón **Borrar** en «Cotizaciones guardadas» del Cotizador Courier, junto a «Abrir», con confirmación que nombra
  la cotización (fecha, destino, peso y total). Acción `borrarCotizacionCourier` (clase `emite`: borrar nunca es borrador). Si
  la cotización borrada estaba abierta, se cierra. El guard trigger sigue impidiendo REESCRIBIR un acta; retirarla, no.

## [V5.71] — 2026-09-23 (commit 7fab5b6)

- **Añadido**: botón **Borrar** en el recargo de combustible del Cotizador Courier: la lista «Semanas anotadas» (cerrada por
  defecto, bajo la gráfica) enseña cada semana con su origen y su fuente, y se borra con confirmación. Acción
  `borrarCombustible` (clase `emite`: borrar nunca es borrador). Una semana automática borrada la vuelve a anotar el cron
  si la EIA aún la trae; el mensaje lo dice.
- **Datos**: borrado, a petición del owner, el 40 % anotado a mano del 16 al 30 de septiembre (era una prueba y pisaba
  la semana del 21 al 27).

## [V5.70] — 2026-09-23 (commit c49ec33)

> **Wrap V46** (2026-09-23): ciclo compilado en `Documentacion_Interactiva_V46.0(35ebddd).html` — 42 nodos (+2: la LCP, el Courier) · 155 fichas (+7: `lcp`, `tablerodeejecucion`, `tablaunica`, `circuitodellote`, `courier`, `espejoamano`, `derivadonosepersiste`) · 62 trazas (+3) · 105 wires (+10) · 38 CTX (+2) · 421 ANN (+32 y una ampliada, con 22 repuntadas). Doce asientos de cuatro sesiones: el overhaul de las consolas hasta donde se pudo.

- **Corregido**: el Cotizador Courier ya no deja un envío futuro sin combustible. Si la semana del envío aún no está
  publicada, usa la última conocida y lo marca **provisional** (antes: «INCOMPLETO» y combustible US$ 0,00). Solo falta
  de verdad si no hay ninguna semana anotada antes de la fecha.
- **Corregido**: la frontera paquete/carga ya no usa el peso VOLUMÉTRICO: una pieza es carga (Freight) si pesa más de 68 kg
  reales, mide más de 274 cm de largo o más de 330 cm de largo + contorno (la regla de FedEx), y el aviso dice cuál. El
  volumétrico solo decide lo que se cobra (una caja de 70×70×70 sigue siendo carga, ahora por sus 350 cm de largo + contorno).
- **Corregido**: los mensajes de «Actualizar ahora», «Anotar» y «Guardar» salen junto al botón que los dispara (antes solo
  dentro de la tarjeta de resultados, invisibles si no había cotización); «Actualizar ahora» dice qué semanas anotó y por qué
  omitió las demás.
- **Añadido**: **gráfica del recargo de combustible** semana a semana (automático vs a mano, con su fuente al pasar el cursor)
  y los enlaces a la tabla de FedEx y a la serie de la EIA.
- **Añadido**: las **cotizaciones guardadas se abren de nuevo**: el resultado tal como quedó ese día (congelado) y sus datos de
  vuelta en el formulario, con «Recotizar con tarifas de hoy». La lista enseña el peso REAL y el cobrado, la fecha del envío, el
  país y el nombre del servicio (antes solo el peso cobrado y el código `IEF:carga`).
- **Cambiado**: el tablero tiene su propio diseño (`courier.module.css`): `shared.module.css .card` es una fila flex con
  `space-between` y repartía el formulario a las esquinas. Las piezas van en una rejilla con los rótulos encima de su casilla y
  el volumétrico de cada pieza calculado al escribir.
- **Añadido**: `qa-courier-check` 44 → 51.

## [V5.69] — 2026-09-23 (commit b33ed67)

- **Añadido**: **el recargo de combustible del Cotizador Courier se anota solo**, con un cron semanal
  (`/api/cron/courier-combustible`, jueves 13:30 UTC). fedex.com no responde a un servidor (Akamai), así que el % se
  **deriva como lo deriva FedEx**: precio semanal del queroseno de aviación USGC de la EIA (serie EER_EPJK_PF4_RGC_DPG) →
  tabla de escalones de FedEx → rige el lunes 10 días después del viernes de la semana EIA. Comprobado contra las 11 semanas
  que publicaba fedex.com el 2026-09-23. **Nunca pisa lo anotado a mano.** Botón «Actualizar ahora» en la pantalla, y cada
  semana del historial dice si fue automática o a mano.
- **Datos**: tabla `courier_combustible_escalas` (la de FedEx vigente desde 2026-05-11, 125 escalones);
  `courier_recargos` gana `automatico`, `indice_usd`, `indice_semana`. Sembradas las semanas del 7 y 14 de septiembre.
- **Añadido**: `qa-courier-check` 37 → 44 (el desfase y la tabla contra el historial publicado por FedEx; el lector de la EIA).

## [V5.68] — 2026-09-23 (commit 113f56b)

- **Añadido**: **Cotizador Courier · FedEx** en `/ecp/cotizador-courier` («ECP · Modelo Logístico»): el costo para CTCx de un
  envío de café (verde o tostado, < 100 kg). Tarifa de lista de la guía pública de FedEx Colombia 2026 − descuentos del acuerdo
  firmado el 2026-09-22 (zona y banda de peso + descuento adquirido en gracia/escalón + bonificación por automatización) → cargo
  mínimo → + combustible de la semana sobre la neta. Compara International Priority Express · Priority · Economy (y la caja
  FedEx 10/25 kg, el Pak y el Freight cuando aplican), con el desglose línea a línea y la fuente de cada cifra; guarda la
  cotización como acta congelada. Brief aprobado por el owner el mismo día (`briefs/herramientas-internas-cotizador-courier.md`).
- **Datos**: ocho tablas `courier_*` (acuerdos, descuentos, descuento adquirido, bonificaciones, tarifas base, zonas, recargos,
  cotizaciones), RLS + cero políticas; `guard_courier_cotizacion_inmutable`. Cargadas con `scripts/seed-courier.mjs` desde una
  carpeta FUERA del repo: 1.350 tarifas de exportación, 85 zonas, el acuerdo, y el combustible de la semana 21–27 sep (41 %).
- **Seguridad**: el acuerdo es **confidencial** (cláusula 6) y el repo es público: ninguna cifra, número de acuerdo ni de cuenta
  entra al repo; el cálculo corre en el servidor y el navegador solo recibe el desglose de su envío.
- **Añadido**: guardián `qa-courier-check` (37): el cálculo contra un acuerdo FICTICIO y la fuga cero por hash.
  `qa-rutas-consolas` declara el módulo; `guardarCotizacionCourier` entra en la lista blanca de borradores (`qa-niveles`).

## [V5.67] — 2026-09-22 (commit 3c94c4b)

- **Retirado**: **el «Reporte de proceso de café» (`mermas-detallada`) sale de la web** por decisión del owner: se borra
  `public/tools/mermas-detallada/mermas-detallada.html`, archivada desde el 2026-08-15 y servida hasta hoy con `noindex`
  (archivar no retira). Sus dos URLs —la plana y la de carpeta— **no dan 404**: van con 308 a su sucesora, la Calculadora de
  mermas · Detallada (`mermas-ctc`), porque pueden estar enlazadas desde fuera. La fila de `tools` y su versión se quedan,
  archivadas, como registro (sin trabajos, permisos ni solicitudes); la fuente original del owner sigue en
  `reference/html_tools/mermas-detallada/`.
- **Cambiado**: `src/lib/tools/carpetas.ts` gana `HERRAMIENTAS_BORRADAS` (id, archivo y sucesora), de donde salen esas 308;
  `qa-tools-carpetas` (165) exige que una borrada no vuelva a tener carpeta y que su sucesora esté viva, y
  `qa-tools-seo-espejo` (86) exige lo contrario que a una archivada: que el archivo **ya no esté**.

## [V5.66] — 2026-09-21 (commit 3467576)

- **Hito**: **Herramientas del Café: una carpeta por herramienta, y el recuento para abrir una conversación por cada una**
  (owner, 2026-09-21). Los 16 HTML sueltos de `public/tools/` pasan a `public/tools/<id>/` —la carpeta se llama como el
  `tools.id` de la base, no como el archivo, así que los ids cruzados de mermas dejan de confundir—. La lista vive en UNA
  fuente, `src/lib/tools/carpetas.ts`, y de ella salen las **16 redirecciones 308** de `next.config.ts`: toda URL plana de
  antes (`/tools/agtron-dial.html`) sigue abriendo, incluidos enlaces impresos y resultados de Google.
- **Docs**: **el recuento** en `docs/componentes/herramientas-cafe/README.md` —15 herramientas en la base (13 vivas, una
  `noindex` a propósito, una archivada) + una candidata sin alta (Atlas cafetero)— con una **ficha por herramienta** en
  `herramientas-cafe/<id>/README.md` (estado, dónde vive, dónde se reutiliza, qué queda abierto y la línea «Hoy:» de su
  conversación) y el **mapa de interfaces**: qué otra parte de la plataforma usa ya cada herramienta y cuál la va a usar
  (la Rueda del Café en el Centro de Calidad). Lo que destapó: la Rueda vive en dos versiones y el Sneak Peek dibuja con
  la vieja; `mermas-ctc` y `cogs-verde` tienen **copias** en `public/ocp-apps/` para los cotizadores (CoGS ya en V19
  contra la V18 pública); dos fichas del café verde; cuatro herramientas solo en inglés.
- **Añadido**: `scripts/qa-tools-carpetas.mjs` (166): carpeta ↔ lista ↔ disco ↔ 308, nada suelto en la raíz, ninguna
  carpeta llamada como lo compartido (`assets`, `h`), y **nadie en el código vuelve a escribir una ruta plana** (funcionaría
  por la 308 y nadie lo notaría).
- **Cambiado**: `qa-tools-seo-check` recorre las carpetas (257); `qa-taller-check`, `qa-tools-puente-conformance`,
  `build-tool-shots`, `qa-cromatografia-check`, `cromatografia-recorrido`, `build-ruedas-mock` y `qa-sneak-peek-check`
  apuntan a las rutas nuevas; el cotizador de empaque (`AppFrame.tsx`, `herramientas-internas`) embebe la nueva URL sin salto.
- **Datos**: `tool_versions.src_publico` reapuntado a `/tools/<id>/<archivo>.html` en las 16 versiones del repo, **con esta
  versión ya desplegada** (antes la base habría señalado archivos que aún no existían).
- **Docs**: las fuentes del owner quedan en `reference/html_tools/<id>/` (fuera de git); las nuevas sin id, en `_candidatas/`.

## [V5.65] — 2026-09-20 (commit 0ba60b1)

- **Hito**: **el vocabulario EUDR queda asentado, una palabra por objeto en toda la red** (owner, 2026-09-20). **PASAPORTE** es de la
  **FINCA** —su debida diligencia—; **VISA** es del **LOTE**, se hereda del Pasaporte y es el **primer entregable de CTCx, y gratis**:
  la documentación EUDR no necesita al Q-Grader, así que la Visa llega **antes** de la evaluación. Y **EVA** deja de ser ambigua para
  siempre: es **«Evaluación de Muestras en Origen»** —mandar las muestras al Q-Grader y recibir granulometría y perfil sensorial, que
  dan el Punto y la Tríada y de ahí el Grado. Hasta hoy la finca tenía «Visa», el lote «Sello» y el OCP llamaba «EVA» al veredicto
  documental: tres nombres para dos cosas y una palabra prestada. La definición vive escrita en la cabecera de `src/lib/eudr.ts` y la
  vigila `qa-evaluaciones` por las dos caras (que la barra lo diga, y que las pantallas del productor **no** vuelvan a decir «Sello»).
- **Hito**: **el mapa EUDR se rehízo con el flujo que dibujó el owner**, y lo primero que arregla es que **todos los cafetales sean la
  misma cosa**: hasta ayer la Parcela 1 era un mapa suelto con el área y la altura de la FINCA lejos, arriba, y las 2..N eran tarjetas
  con otro formulario — dos piezas para el mismo objeto. Ahora las dos montan **un solo `CafetalEditor`**.
- **Cambiado**: **la pregunta «¿el área del cultivo es mayor a 4 ha?» se DECLARA antes de tocar el mapa**, y es por cafetal. Antes la
  exigencia de polígono se **deducía** de un área que el productor todavía no había medido, así que el mapa **cambiaba de modo debajo
  de sus manos** mientras escribía. Ahora contesta primero —que es el orden en que lo sabe— y el mapa abre ya en su modo. La respuesta
  se guarda en `finca_parcelas.requires_polygon`, una columna que existía desde F1 y que **nadie escribía**; `null` sigue significando
  «sin contestar» y se resuelve por área, así que ninguna parcela vieja necesita migración.
- **Añadido**: **cada cafetal tiene su propia altura** (`finca_parcelas.altitude_masl`, migración `parcelas_altura_y_declaracion_area`),
  con su «Traer del mapa ⛰», y su propia área con «Calcular del polígono 📐». El área y la altura de `fincas` se quedan donde estaban
  —las leen el dossier, el KML y el OCP— pero bajan debajo de los cafetales y se rotulan como lo que son: **los totales de la finca**.
- **Añadido**: el **nombre de cada cafetal se edita con un lápiz** junto al título (objetivo táctil de 44 px, no un glifo de 12), y el
  bloque enseña su resumen «(3,5 ha · 1.354 msnm)» en cuanto existe. En modo punto, los **puntos de geo-referencia van escritos**: es
  lo que viaja al expediente, y verlos es lo que deja comprobar que el pin cayó donde el productor cree.
- **Cambiado**: **B1 pide un proceso por VARIEDAD, no uno por lote** (owner). Un mismo lote puede llevar la Typica lavada y la Gesha en
  honey; con un solo proceso, el productor tenía que elegir cuál de sus dos verdades escribía. `VarietyRow` gana `base` y `special`
  con **default seguro**: `seedProcesos()` siembra cada variedad con el proceso que el lote ya tenía, así que ningún datasheet
  anterior pierde nada ni obliga a reescribir.
- **Retirado**: **el selector de «Especie» de B1** (owner: «es redundante, se consulta desde la variedad»). Dejó de ser un campo y pasó
  a ser lo que siempre fue: una consecuencia — `especieDelLote()` la deriva de las variedades y dice «Mezcla» cuando no son todas de
  la misma especie. `species`, `base_processing` y `special_processing` **se siguen escribiendo** como proyección de la variedad
  dominante, porque los leen el OCP, el catálogo público, la ficha pública y el runner de Arena — código de otros componentes, que no
  se toca desde aquí. Una fuente, varias copias de lectura; no dos verdades.
- **Cambiado**: **la declaración final de la Ficha habla solo de la Ficha** (owner): «Declaro que la información es veraz y entregada
  en buena fe para identificar este lote con la mejor información disponible». Lo de la muestra de 2 kg marcada con el código del lote
  **sale de aquí** y se dirá donde se confirme la muestra: cerrar el expediente y comprometerse a despachar café son dos actos
  distintos, y juntarlos hacía que el productor firmara el segundo sin haberlo decidido.
- **Docs**: `qa-evaluaciones` pasa de 46 a **50** comprobaciones — vigila el reparto de nombres por las dos caras y se probó haciéndolo
  morder (devolver «Sello EUDR» a `PerfilTab` lo pone rojo). ⚠️ **El OCP todavía dice «EVA» y «Visa EUDR»** en su tabla y en
  `EvaReviewCard`: **pendiente con dueño `consolas`**, con su brief de simplificación (`briefs/consolas-simplificar-ocp-al-circuito.md`).

## [V5.64] — 2026-09-20 (commit fcc8bed)

- **Hito**: **la barra del lote se redibuja en DOS líneas** (owner, 2026-09-20), y con ella se reparten de nuevo dos nombres que
  llevaban meses significando cosas distintas en cada superficie. Arriba el **expediente** — `FT · FT2 · EUDR · FOTO → VISA` —,
  donde **VISA** es el veredicto documental de CTCx (el chip que hasta hoy se llamaba EVA en esta barra). Abajo el **tramo
  comercial** — `MUE → EVA → GRADO → CONT` —, donde **EVA** pasa a ser lo que siempre significó fuera de aquí: la **evaluación**
  con el Q-Grader (perfil sensorial + granulometría). `GAL` y `ARE` dejan de existir: el galardón es `GRADO` y la vitrina ya no
  es un paso de esta barra. Los chips de la línea comercial son **botones**: llevan a «Evaluaciones» o a «Contratos», que es la
  pregunta que el productor tenía que resolver saltando entre pestañas.
- **Hito**: **fase 5 del overhaul de consolas, ejecutada en el lado del productor**: el paso 4 del intake deja de ser «Video» y
  pasa a **«Fotos y video»** — **2 fotos del lote obligatorias, video opcional**. Hasta hoy el video se exigía **solo en el
  cliente**: la regla era a la vez más dura de cumplir y más fácil de saltarse.
- **Seguridad**: la regla de las fotos se exige **en el servidor**. Kaffetal Regal escribe directo contra Supabase con el JWT del
  productor (RLS + guard triggers, sin Server Action de por medio), así que «servidor» aquí es un **guard trigger**: nace
  `guard_lot_fotos_intake` sobre `lots` (migración `lots_fotos_obligatorias`), el tercero de la tabla, que rechaza el paso a
  `ficha_completa` sin las dos fotos. Solo muerde en la **transición**: un lote ya cerrado no se re-valida — no se le cambian las
  reglas a algo que ya entregó. `EXECUTE` revocado a `public`/`anon`/`authenticated`, como los demás triggers de la casa.
- **Cambiado**: **B3 · Caracterización Física pide UN número, no tres.** El factor de rendimiento y la almendra total son la
  misma medida dicha de dos maneras, así que el productor reporta **uno de los dos** y el otro se **deriva** y se le muestra
  (`almendraDesdeFactor` / `factorDesdeAlmendra`: **factor × almendra = 17.500**). Lo derivado **no se persiste** (ALINEACIÓN §1):
  se calcula al leer, y así la Ficha y el OCP siempre distinguen el número declarado del calculado. La **Densidad en Verde** deja
  de ser obligatoria y baja al bloque opcional, con las humedades.
- **Corregido**: **B3 le decía al productor un número imposible.** La ayuda de Almendra Total hablaba de una muestra de **205 g**
  mientras el rango declarado llega a **245 g** — una muestra no puede pesar menos que lo que sale de ella. La aritmética de
  laboratorio del propio repo (`computeFactor`, `fa_start` = **250**) ya usaba 250, y solo con 250 cuadran los dos rangos
  (AT 150–245 g ↔ factor 71–117, contra el 75–120 declarado). Copy corregida en KR. ⚠️ El mismo «205 g» sigue escrito en
  `fichasActions.ts` del OCP: **pendiente con dueño `consolas`** (no se toca código ajeno).
- **Añadido**: **el mapa EUDR enseña TODAS las parcelas a la vez** (owner). La que se edita va en oro; las hermanas ya guardadas,
  fijas en gris y rotuladas con su nombre — antes cada cafetal se dibujaba en su propio mapa, a ciegas, y dos podían solaparse
  sin que nadie se enterara. El mapa arranca centrado sobre ellas cuando la parcela nueva aún no tiene geometría.
- **Corregido**: **el primer vértice del polígono no se veía.** El `<Polygon>` no tiene nada que pintar hasta el segundo clic, así
  que el primero caía en un mapa que no reaccionaba y parecía que el toque no había funcionado (lo vio el owner). Ahora cada
  esquina es un **marcador numerado desde la primera** y se puede **arrastrar** para corregirla sin deshacer.
- **Cambiado**: **una sola puerta de entrada al dibujo.** Los botones de terminar, deshacer, ubicación y cancelar solo existen
  mientras se dibuja; fuera de ese momento no hacían nada y estorbaban. Y un clic suelto en el mapa ya **no** arranca un borrador
  invisible: la entrada es el botón, como pidió el owner.
- **Añadido**: el **nombre de la Parcela 1** ya es editable (las 2..N lo eran desde F1; esa no, porque nace espejada de la finca).
- **Añadido**: **el correo de la cuenta, a la vista** en Información General — en la tarjeta del panel y en el modal, en solo
  lectura. Es la dirección a la que CTCx le escribe, y el productor tenía que salir del panel para acordarse de con cuál se
  registró. Sale de la sesión de Auth, no de `profiles`; cambiarlo es cambiar la identidad y no es un campo de ese formulario.
- **Datos**: `lots.sample_2kg_confirmed_at` entra al modelo cliente del panel (solo lectura — lo protege
  `guard_lot_protected_columns`): es lo que cierra el chip **MUE**. Campo nuevo del datasheet `b4_files_foto` con **default
  seguro `[]`**, como manda el charter.
- **Docs**: dos guardianes se ponen al día con las reglas nuevas en vez de quedarse rojos (regla §4.5): `qa-reportado-productor`
  (38 → **45**) pasa a vigilar que la básica de B3 pida uno u otro, que la densidad **ya no** esté en la compuerta, y que lo
  derivado **no** se escriba al datasheet; `qa-evaluaciones` (40 → **46**) cambia la escalera `GAL`/`ARE` por los nueve chips de
  la barra nueva y **exige que la línea comercial salga de `estadoDelCircuito()`**, no de lógica propia — que es lo que la V5.62
  dejó escrito para cuando el panel del productor mostrara ese estado.

## [V5.63] — 2026-09-19 (commit cc8d39a)

- **Corregido**: **la LCP salía lavada: texto casi invisible sobre blanco.** Lo vio el owner en una captura. A la cuarta consola
  le faltaba su **layout raíz** (`src/app/lcp/layout.tsx`) desde que nació en la V5.59: ese archivo —fuera de `(app)`— es el que
  envuelve la consola en `data-theme="bcp"`, carga el Tailwind del panel y pone el `noindex`. Sin él heredaba los colores de
  otro tema y el rail perdía su fondo. **Nada lo avisó**: `tsc`, el build y los 54 guardianes pasaron en verde tres versiones
  seguidas, porque las consolas no se conducen en navegador. Es el mismo fallo de familia que la V5.59 quiso cerrar —una consola
  nueva son varios archivos, y el que no se deriva de `CONSOLE_ORDER` se olvida—, así que `qa-rutas-consolas` gana **(h)**: exige
  el layout raíz de cada consola, con su tema, su Tailwind y su `noindex` (probado haciéndolo morder).
- **Cambiado**: **el rail del OCP es el cuadro del owner, entrada por entrada.** «OCP · Kaffetal Regal»: Productores, Fincas y
  Lotes. «OCP · Catálogo»: **Lotes a Evaluar · Lotes en Evaluación · Lotes Evaluados → Pendiente Oferta · Catálogo Activo ·
  Ofertas CP Aceptadas · Oferta desde CTCx Selection**. «OCP · Manejo de Stock Físico»: Gestión de Muestras · CTCx Selection ·
  Compras. Las etiquetas son las del cuadro; las rutas, las que existían — y cada página dice en su título lo que dice el rail.
- **Cambiado**: **«Nominados» se parte en dos.** `/ocp/a-evaluar` (nota 2: el productor pidió la evaluación; falta confirmar el
  pago, la muestra o las dos) y `/ocp/en-evaluacion` (nota 3: pagados y recibidos — En Fila, los baches, el veredicto y el
  reembolso). Es UNA carga y UN componente con dos vistas (`nominados/CircuitoVista.tsx`), no dos páginas copiadas. La URL vieja
  es un 308 a la primera (54 rutas en `rutasMovidas.ts`). **Ninguna Server Action ni regla cambió.**
- **Cambiado**: ⚠️ **los baches de sondeo siguen en pantalla, a propósito.** El plan (D5) los saca, pero `recordEvaluationVerdict`
  EXIGE hoy que el lote esté en un bache en estado «registro»: quitarlos sin cambiar esa regla dejaría a la casa sin poder
  evaluar un solo lote. Salen con la fase 4b.
- **Retirado**: **«Panel» sale del rail** del BCP, el OCP y la LCP (la página sigue siendo donde aterriza el conmutador de
  consolas; el ECP conserva el suyo porque ES una entrada del cuadro: el Tablero de Ejecución). **«Fichas Técnicas» sale del
  rail**: se abre desde «Lotes en Evaluación», que es donde se usa. Y las cuatro pestañas repetidas en todas las páginas del
  catálogo se reducen a las que el rail NO tiene: Subastas Tyrian bajo «Catálogo Activo», Humedad bajo «Ofertas CP Aceptadas».
- **Añadido**: **«Gestión de Muestras» y «CTCx Selection · Compras» entran al rail sin módulo**, por decisión del owner (invierte
  la D9 del plan para este grupo). Sus páginas no fingen un tablero vacío: dicen que el módulo no existe, qué hay hoy, qué se
  construiría primero y las cinco preguntas que lo bloquean — las de su brief.
- **Docs**: charter `consolas`, `ALINEACION` §3, `AGENTS.md`, el recuadro de la fase 4 en `OVERHAUL_CONSOLAS_PLAN.md` y los dos
  briefs de Stock Físico.

## [V5.62] — 2026-09-19 (commit eaea06c)

- **Añadido**: **el estado de un lote en el circuito nuevo, DERIVADO** — fase 4a del overhaul (notas 2–5 del owner). El camino
  *a evaluar → en evaluación → evaluado, pendiente de oferta → catálogo activo* no es una columna: sale de datos que ya
  existen —la inscripción y su pago, el recibo de la muestra, el grado, la última oferta, el contrato—. `src/lib/ocp/circuito.ts`
  es una función PURA que lo lee y lo dice, con **lo que falta** para el paso siguiente («confirmar el pago», «recibir la
  muestra», «confirmar el grado y emitir la oferta»…). No escribe nada y no cambia ninguna regla.
- **Añadido**: la tabla `/ocp/kr` gana la columna **Circuito** y su filtro. Sobre los datos de hoy dice lo que es verdad: 14
  lotes en ficha y 1 en catálogo activo (no hay ninguna inscripción todavía, y hay un trato vivo).
- **Añadido**: `qa-circuito-check` (31; el guardián n.º 60). Su tabla de verdad está escrita **desde las notas del owner**, no
  desde el módulo, y exige dos propiedades que importan cuando dos superficies van a leer el mismo estado: que sea **TOTAL**
  (las 13.440 combinaciones de entradas dan un estado conocido) y **MONÓTONA** (confirmar un pago, recibir una muestra, poner
  un grado, emitir o aceptar una oferta nunca hacen RETROCEDER a un lote). Probado haciéndolo morder dos veces.
- **Cambiado**: «Oferta emitida» es un estado que las notas no nombran y que hace falta: entre que CTCx oferta y el productor
  acepta, el lote está en algún sitio. Y una oferta rechazada, retirada o expirada devuelve el lote a «pendiente de oferta»,
  diciendo por qué.
- **Docs**: ⚠️ **la fase 4 se partió en dos, y la 4b está PARADA a propósito.** `OVERHAUL_CONSOLAS_PLAN.md` lo explica: (1) el
  plan tenía un problema de ORDEN — el *guard* «no se acepta una oferta sin disponibilidad declarada ni términos» es de la fase
  4, pero la pantalla del productor que los envía es de la fase 5, bloqueada por las cuentas `prueba-*`: desplegado en ese
  orden, **ningún productor podría aceptar una oferta**; (2) la 4b reemplaza `/ocp/nominados` por cuatro pantallas sin que nadie
  haya visto todavía la de la fase 3; (3) toca dinero —la escalera de liberaciones y el reembolso del 80 %— sobre un contrato
  vivo. Charter `consolas`, `ALINEACION` §3 (para `kaffetal-regal`: ese estado se IMPORTA, no se recalcula) y `AGENTS.md`.

## [V5.61] — 2026-09-19 (commit dd3b734)

- **Hito**: **Productores, Fincas y Lotes son UNA tabla: `/ocp/kr`** — fase 3 del overhaul de las consolas (nota 1 del owner).
  Tres módulos con tres tableros, tres mapas a medias y tres modales pasan a ser una pantalla navegable en cualquier dirección:
  del lote a su finca, de la finca a su productor, y de vuelta.
- **Añadido**: **la tabla de grano LOTE.** Cada fila es un lote con su finca y su productor al lado; **la finca sin lotes y el
  productor sin fincas tienen fila propia** (si no, 18 de los 28 productores de hoy habrían desaparecido de la pantalla — justo
  a los que hay que acompañar). Columnas: Productor · Finca · Lote · **Visa EUDR · Ficha (FT · FT2 · EUDR · Video) · EVA ·
  Muestra · Grado · Oferta CP · Trato**, cada una con enlace a lo que nombra. Búsqueda libre; filtros por país, departamento,
  grado y rango de temporadas; filtros rápidos **Galardonados · Sin finca · Sin lote**; agrupable por productor o por finca.
- **Añadido**: **el mapa se conserva, y por fin dice lo mismo que la tabla.** Es una segunda vista de LA MISMA carga con LOS
  MISMOS filtros: un pin por finca (color = su Visa) y uno por lote (color = su grado) sobre ella, agrupados por cercanía, con
  el dial de temporadas de dos perillas. Antes el mapa de Fincas no filtraba por temporada y el de Lotes solo enseñaba los que
  iban camino de la Arena.
- **Añadido**: **la vista completa** — `?lote=` · `?finca=` · `?productor=` — con protagonista **Lote → Finca → Productor** y
  migas para saltar entre los tres. Monta como secciones de UNA página lo que eran tres modales: la checklist de la EVA con
  su veredicto, el recibo de la muestra, la DDS y reabrir un No apto; el veredicto de la Visa con el editor EUDR, las
  parcelas y los certificados; y el panel del productor con sus seis pestañas. Lee SOLO lo que se abre: la página de
  Productores leía los perfiles, fincas, lotes, inscripciones, contratos y notas de todos para pintar un tablero.
- **Cambiado**: **las tres páginas no se reescribieron: se convirtieron** en esas tres secciones (con `git mv`, conservando su
  historia). **Ninguna Server Action cambió**, ni sus reglas, ni lo que ve el productor.
- **Retirado**: **Galardonados deja de ser módulo**: es el filtro «Galardonados» de la tabla (D4 del plan). Se retiran también
  `FincaModalRow`, `ProductoresBoard` y `FincasViewSwitch`; de `LotesViews` sobreviven el dial de temporadas y dos botones.
- **Corregido**: **la etapa de un lote se rotulaba de tres maneras.** `ficha_completa` era «En evaluación (EVA)» en Productores,
  «Ficha enviada» en Fincas y «En EVA» en Lotes. Una fuente: `src/lib/ocp/etapas.ts`. Y el constructor de los campos de la
  Visa EUDR —quince columnas, escritas dos veces— pasa a `src/lib/ocp/fincaEudr.ts`: un campo olvidado en una copia no falla,
  deja la Visa clavada en «en revisión» para todo el mundo. `qa-visa-check` (36) lo vigila ahora en un sitio, y exige que el
  SELECT de quien lo usa pida `status` y `eudr_cert_shared` (probado haciéndolo morder).
- **Corregido**: dos enlaces del Panel llevaban meses mandando a Fincas un `?status=pending_review` **que ninguna página leía**.
  Las tareas enlazan ahora por parámetro a la vista completa de SU finca o SU lote.
- **Cambiado**: cuatro rutas se mudan a una — `/ocp/productores`, `/ocp/fincas`, `/ocp/lotes`, `/ocp/galardonados` → `/ocp/kr` —
  y las cuatro `/bcp/…` de la V4.24 que apuntaban a ellas se reapuntaron (53 rutas en `rutasMovidas.ts`, todas en un salto).
  Es la primera mudanza «muchas a una»: las sub-rutas viajan pegadas al destino, así que **el dossier y el KML de la Visa se
  mudaron a `/ocp/kr/<id>/…`** para que las URLs `/ocp/fincas/<id>/dossier` impresas en correos y expedientes sigan abriendo.
  Un ancla (`#lot-…`) no viaja en un 308 —el servidor ni la ve—: la traduce la página nueva al llegar.
- **Docs**: charter `consolas` (el mapa de código de `kr/` y de `src/lib/ocp/`; lo que la fase dejó abierto) y `kaffetal-regal`;
  `ALINEACION` §3; `AGENTS.md`; `OVERHAUL_CONSOLAS_PLAN.md`, con lo que cambió al ejecutarla.
  ⚠️ **Nadie ha visto la pantalla pintada**: las consolas no se conducen en navegador (OTP real). Se verificó por `tsc`,
  `eslint`, build, guardianes y SQL — las 41 columnas que piden sus consultas existen, y la lógica de filas replicada en SQL
  da 35 (15 lotes + 2 fincas sin lote + 18 productores sin nada). Queda como pendiente del owner en el charter.

## [V5.60] — 2026-09-19 (commit 257c42d)

- **Hito**: **el nuevo reparto BCP ↔ ECP** — fase 2 del overhaul de las consolas (`docs/OVERHAUL_CONSOLAS_PLAN.md`), según el
  cuadro del owner. El **BCP** es *lo que la casa ES*: «Ecosistema de Valor» —el tablero de cada plataforma de la red— y
  «Configuración del Sistema». El **ECP** es *con qué decide y qué tiene pendiente*: «Herramientas Internas», agrupadas por
  modelo, y el Tablero de Ejecución.
- **Cambiado**: **dieciséis módulos cambian de consola.** Al BCP: Herramientas del Café, Directorio, Coffeed, CTC Tech,
  Varietales, Terratalento y Manejo de Plataformas (del ECP), y **Kaffetal Regal Arena con su Club** (del OCP). Al ECP:
  Direccionamiento, el Modelo Económico (`/ecp/pvc`), los tres cotizadores, las anclas de mercado y Automatizaciones. «Socios
  de la red» deja de ser grupo aparte y entra en Configuración. Todas las URLs viejas siguen vivas como **308 en un salto**
  (49 rutas en `rutasMovidas.ts`).
- **Cambiado**: **nueve de las dieciséis son viajes de vuelta**, y un viaje de vuelta no se escribe como una mudanza: la página
  real vuelve a una URL que era un talón. Se borraron nueve talones (chocarían con la página), sus nueve entradas (la vieja y
  la inversa juntas son un bucle) y se reapuntó lo que apuntaba a la casa que se deja: las cuatro `/ocp/cotizador-*|anclas`,
  `/ecp/grados` y las dos de la pestaña que dejó el rename de la V5.45. `/ecp/direccionamiento/{plataformas,modelo-economico}`
  pasan a talón EXPLÍCITO: su padre volvió a ser una página real. Los cotizadores habían salido del ECP esa misma tarde (V5.56).
- **Añadido**: **el Tablero de Ejecución** (`/ecp`). El Panel del ECP era un índice con cuatro casillas de módulos por
  construir; ahora enseña **lo que la casa tiene pendiente en las cuatro consolas**, agrupado por la consola dueña. Nada se
  escribe a mano: cada tarea se DEDUCE de un estado que pide a alguien (un lead sin responder, una finca por revisar, un mensaje
  de productor, una humedad fuera de rango, un lote en fila para la Arena) y enlaza a su elemento. El motor nació dentro del
  Panel del OCP y se generalizó: `src/lib/panel/tareas.ts` (puro) + `tareasCarga.ts`. El Panel del OCP enseña ya solo las suyas.
- **Corregido**: **marcar una tarea no refrescaba nada, y a quien no tenía permiso la casilla le mentía.** `setTaskState`
  revalidaba `/bcp` — la casa de la que el Panel se fue en la V4.24. Ahora revalida el Panel de cada consola que enseña la
  tarea. Y devolvía el rechazo, pero `PanelTasks` lo ignoraba: la casilla se quedaba marcada en pantalla y desmarcada en la
  base. Ahora deshace y lo dice. Qué consolas pueden marcarla sale de la CLAVE de la tarea (su dueña y el ECP), no del cliente.
- **Seguridad**: **las compuertas de Coffeed leen su consola del rail.** `coffeedGate` y `studioGate` llevaban `"ecp"` escrito
  dentro — un permiso sin barras, de los que ninguna mudanza de rutas toca. Ahora llaman a `consolaDelModulo("coffeed")`, y si
  nadie enlaza Coffeed en el rail, **cierran**. Las 17 compuertas de cotizadores/anclas/integraciones volvieron a `"ecp"` (una
  línea por módulo, gracias a la V5.56); PVC a `"ecp"`; herramientas, directorio, plataformas, Arena y Club a `"bcp"`; las dos
  listas de espera compartidas a `["lcp","bcp"]` / `["bcp","lcp"]`. `qa-rutas-consolas` (468) lo contrastó todo con el rail.
- **Cambiado**: **la Arena vive en el BCP, pero no se despega limpia del OCP.** Su página asigna lotes a sesiones, invita a la
  vitrina y revisa reclamos: tres acciones del circuito del lote, que abren ahora las DOS consolas (`["ocp","bcp"]`), con dos
  componentes importados del árbol del OCP por ruta absoluta. Queda anotado en el charter: la fase 4 decide.
- **Cambiado**: **lo que sirve a varias consolas sale del árbol del OCP**: `ActionForm`, `PanelTasks` y `tareasActions`
  (antes `dashboardActions`) viven en `src/components/panel/`.
- **Corregido**: **el diagrama de `/bcp/documentacion` llevaba un mes pintando una casa que ya no existía.** «Dentro del
  Control Panel» era un SVG con cada caja escrita a mano como «espejo del menú»: seguía dibujando el reparto de antes de la
  V4.24, con tres consolas. Ya no se dibuja: **se genera del rail**, y en el diagrama de la red la consola que recibe cada
  formulario se lee también de ahí. Una consola o un módulo nuevo aparecen solos.
- **Cambiado**: el Panel del BCP es el índice del Ecosistema de Valor y la Configuración; **conserva los KPI del Modelo
  Económico** (son las cifras del negocio) aunque el módulo viva en el ECP. Títulos de pestaña, cabeceras y mensajes de las
  páginas mudadas dicen su consola de hoy. El rail **no promete lo que no hay** (D9): «Seguimiento de Temas» y «Plataformas de
  Pagos» no entraron.
- **Docs**: charters `consolas`, `herramientas-internas` (vive en el ECP), `coffeed`, `directorio`, `herramientas-cafe`,
  `terratalento`, `ctc-tech`, `varietales`, `kaffetal-regal`, `socios`, `cherry-picked`; `ALINEACION` §1 (vocabulario) y §3;
  `AGENTS.md`; `BCP_USER_ADMIN_PLAN.md`; nota de cabecera en `PVC_BCP_PLAN.md`; `OVERHAUL_CONSOLAS_PLAN.md` — fase 2 marcada
  como ejecutada, con las siete cosas que cambiaron al ejecutarla; `KICKOFF` recompilado.

## [V5.59] — 2026-09-19 (commit cfb0808)

- **Hito**: **nace la LCP · Lead Control Panel — *Relationship*, la cuarta consola.** Fase 1 del overhaul aprobado por el
  owner (`docs/OVERHAUL_CONSOLAS_PLAN.md`). La LCP es la consola de **lo que entra de fuera y a quién se le responde**: no
  decide precios ni mueve lotes. Mismo login maestro, mismo conmutador, su tarjeta en `/panel` y su línea en la puerta
  pública (ES · EN · DE).
- **Cambiado**: **siete rutas se mudan a la LCP.** Del ECP: `/ecp/buzon` → `/lcp/buzon`, `/ecp/leads` → `/lcp/leads`,
  `/ecp/ctc-home` → `/lcp/lista-espera`. Del OCP: `/ocp/crm/{caas,green,roast,x}` → `/lcp/crm/…` (el grupo «OCP · Cherry
  Picked» desaparece del rail). Las siete URLs viejas siguen vivas como **308 en un salto**; `/bcp/caas` y `/ocp/leads`, que
  apuntaban a rutas que hoy se mudan, se **reapuntaron** (42 rutas en `rutasMovidas.ts`; regla F2: jamás un talón contra otro).
- **Añadido**: **«Lista de espera» reúne todas las listas de la red.** Era solo la de la portada; ahora enseña, con un filtro
  que dice cuántos quedan sin contactar en cada una, las cinco fuentes de `newsletter_subscribers` (CTC Home, Roast, X,
  Directorio, Herramientas) y la lista de Terratalento, que tiene tabla propia. No sustituye a los tableros que cada lista
  tiene junto a lo suyo: es el mismo componente leyendo la misma tabla — marcar a alguien aquí lo marca allá.
- **Seguridad**: **la consola que administra un lead ya no se escribe a mano, y su compuerta fina mira el NIVEL.**
  `leadsActions.ts` tenía un mapa `PILLAR_CONSOLE` —permisos sin barras, invisibles a toda reescritura de rutas— que se quedó
  atrás en dos mudanzas. Desapareció: `src/lib/panel/leadsPilares.ts` guarda UN mapa, pilar → ruta del tablero, y la consola
  se deduce de su primer segmento. Y la compuerta fina (`requireLeadConsole`) solo comprobaba el GRANT, no el nivel: un
  colaborador «admin» en una consola y «viewer» en la dueña del lead podía responderlo. Ahora pide nivel `emite` en la
  consola dueña, y **devuelve** el rechazo en vez de lanzar. Sin daño: las tres credenciales tienen el mismo nivel en todas.
  De paso se cura el doble grant que pedía CaaS (ECP para entrar a la acción + OCP por el pilar): ahora es solo LCP.
- **Cambiado**: **lo que sirve a dos consolas no cuelga del árbol de ninguna.** `leadsActions.ts` y `LeadModalRow.tsx` pasan a
  `src/components/panel/` (los usan la LCP y los tableros de CTC Tech y Varietales del ECP). Las compuertas del Buzón y del
  CRM CP Green pasan a `"lcp"`; la de las listas de espera a `["lcp","ecp"]`; la de Terratalento a `["ecp","lcp"]`.
- **Cambiado**: **la lista de consolas tiene una sola fuente.** `qa-rutas-consolas` y `qa-niveles` tenían `bcp|ecp|ocp`
  escrito a mano nueve veces; ahora leen `CONSOLE_ORDER`, igual que `/panel`, el conmutador y la pantalla de credenciales
  (cuyo mapa de niveles vacío también se deriva). `/panel` pasa a una rejilla que acepta cuatro tarjetas; `robots.txt` cierra `/lcp`.
- **Añadido**: `qa-rutas-consolas` (431) aprende dos cosas. **La compuerta en ARRAY**: hasta hoy era invisible para él, y por
  eso la lista de espera compartida «no entraba en el mapa» — nadie la vigilaba. Ahora las consolas esperadas se deducen del
  rail (`rail` + `tambien`) y la compuerta tiene que nombrar exactamente ese conjunto. **(g) los pilares de leads**: cada
  tablero es un enlace real del rail de su consola, y `leadsActions` no vuelve a escribir una consola a mano. Las tres
  comprobaciones se probaron haciéndolas morder. `qa-crm-interes` (63) exige que la lista reunida enseñe TODA fuente de
  `SOURCES`, y deja de dar por buena la compuerta por una palabra que estaba en la ruta del `import`. `qa-nav` (22) cubre el
  primer grupo anidado del rail (`/lcp/crm/…`).
- **Datos**: `panel_users.consoles` gana `lcp` en las tres credenciales — el owner `admin`, los dos colaboradores `viewer`,
  igual que en las otras tres (D2 del plan, con permiso explícito del owner). Comprobado por SQL antes del push: nadie con
  `ecp` u `ocp` y sin `lcp`.
- **Docs**: charter `consolas` (cuatro consolas; fases que quedan), `ctc-tech`, `varietales`, `cherry-picked`; `ALINEACION`
  §1 (vocabulario: LCP = *Relationship*) y §3; `AGENTS.md`; `BCP_USER_ADMIN_PLAN.md` (la columna «Módulo» de la lista blanca);
  `OVERHAUL_CONSOLAS_PLAN.md` — fase 1 marcada como ejecutada, **con lo que cambió al ejecutarla**: el color (el azul acero
  propuesto no se distinguía del OCP; quedó el carmesí corporativo aclarado), y las cinco decisiones de diseño de arriba.
  **Pendiente a propósito**: el diagrama «espejo del menú» de `/bcp/documentacion` sigue dibujando tres consolas; se
  redibuja una vez, al cerrar la fase 2.

## [V5.58] — 2026-09-19 (commit 8fa0441)

> **Wrap V45** (2026-09-19): ciclo compilado en `Documentacion_Interactiva_V45.0(55c8aaa).html` — 40 nodos · 148 fichas (+2: `nivelesconsola`, `guardianespejo`) · 59 trazas (+1) · 95 wires · 36 CTX (+1) · 389 ANN (+8). Primer wrap llamado desde su vía, y fase 0 del overhaul de las consolas: es la foto del ANTES.

- **Seguridad**: **el Buzón se le escapó a la V5.57: un «viewer» podía responder correos.** Cuatro acciones de
  `src/app/ecp/(app)/buzonActions.ts` —`sendBuzonReply`, `setBuzonStatus`, `setBuzonTags`, `markInboundEmailRead`— no llaman
  a `requireActiveAdmin()`: llaman a un AYUDANTE (`loadIfAllowed` → `buzonIdentity`) que la llama. El inventario de la V5.57
  y su guardián miraban la llamada a la vista, función por función, y un ayudante que no escribe pasa limpio. Lo destapó el
  mapa que se hizo para planificar la cuarta consola (LCP), horas después. **Sin daño**: `buzon_outbound` tiene cero filas —
  nadie ha enviado nunca una respuesta desde el Buzón.
- **Corregido**: responder o reenviar un correo y archivarlo o borrarlo (que lo mueve también en el buzón remoto) exigen
  nivel **admin** del ECP. Etiquetar y marcar leído/no leído entran en la lista blanca de **borradores** —son orden interno
  y reversible, y sin lo segundo un viewer fallaría en silencio al abrir su propio correo—: la lista pasa de 12 a **14**,
  primero en `BCP_USER_ADMIN_PLAN.md` y después en el código, como manda la regla.
- **Añadido**: `qa-niveles-check` (35 → **36**) **sigue la cadena de ayudantes** dentro de cada archivo: toda función
  exportada que llegue a la compuerta vieja —directa o por ayudantes— y escriba tiene que pasar además por una compuerta
  que mire el nivel. Probado mordiendo: quitarle la compuerta a `sendBuzonReply` lo pone rojo. Es la única familia de
  compuerta indirecta del repo (comprobado: el otro caso, `revealSessionIdentities`, solo lee).

## [V5.57] — 2026-09-19 (commit 66cb351)

- **Seguridad**: **el nivel «viewer» de un colaborador por fin se hace cumplir.** `panel_users.consoles` guarda desde el
  2026-07-15 un nivel por consola —`admin` o `viewer`— y durante dos meses **ningún código lo leyó**: `grantedConsoles()`
  solo preguntaba si la consola estaba concedida (`Boolean("viewer")` es tan verdadero como `Boolean("admin")`), y las
  compuertas se conformaban. `requireActiveAdmin()` —detrás de **124 acciones**, casi todo el OCP— no miraba ni la consola.
  Un «viewer» podía emitir una oferta, firmar un contrato, publicar un lote o adjudicar una subasta. **Lo destapó la
  auditoría del nodo final, no un incidente**: los dos colaboradores «viewer» llevaban desde el 20 de julio sin escribir
  nada (siete acciones en total, todas de sus días de alta).
- **Añadido**: **la regla**, decidida por el owner (cierra la pregunta abierta n.º 2 de `BCP_USER_ADMIN_PLAN.md`): dos
  niveles bastan, pero el de abajo no es «solo mirar» — es **leer y preparar borradores**. Toda acción del servidor declara
  su **clase** —`lectura` · `borrador` · `emite`— y la clase decide el nivel: un viewer pasa las dos primeras. Vive en
  `src/lib/panel/niveles.ts` (puro) y su FUENTE es la sección nueva «Niveles por consola» del plan.
- **Añadido**: `permisoDeEscritura(consola, clase)` — la compuerta de las 124 acciones que nacieron detrás de
  `requireActiveAdmin()`. **Lanza** solo cuando no hay sesión (inalcanzable desde una pantalla legítima) y **devuelve**
  `{ ok:false, error }` cuando lo que falta es nivel: un viewer pulsando un botón ve un mensaje que dice qué pasó y a
  quién pedírselo, y la página no se cae. `requireConsoleWrite`, `coffeedGate` y `studioGate` ganan el mismo argumento.
- **Seguridad**: **fallo CERRADO.** La clase por defecto de las cuatro compuertas es `emite`: una acción nueva que olvide
  declararse queda cerrada al viewer, no abierta. De 228 acciones, **174 exigen nivel admin**, 42 son lectura y **12 son
  borradores**, en una lista blanca corta: las cinco de una cotización sin emitir, rotular una transcripción (2), guardar
  una propuesta del Mapa de Trabajo, la casilla de una tarea, la etapa manual del CRM y las dos marcas de «ya le escribí».
- **Corregido**: `logProducerComm` —la nota sobre un productor— parecía un borrador y **no lo es: el productor la ve** en
  su panel. Salió de la lista blanca al revisar los formularios, y el plan lo deja escrito para que nadie lo «arregle».
- **Cambiado**: siete acciones atadas a `<form action>` devolvían `void` y no tenían cómo mostrar un rechazo
  (`createHarvestSeason`, `createArenaSession`, `recordHumidityReading`, `markReconditioning`, `resolveReconditioning`,
  `createLot`, `logProducerComm`): devuelven `ActionResult` y sus ocho formularios pasan al `ActionForm` de la casa.
- **Añadido**: el rail de la consola dice **«Lectura y borradores»** bajo el nombre de un viewer, y `/bcp/usuarios`
  explica qué hace cada nivel al concederlo («Viewer — lee y prepara borradores»). Los botones siguen visibles: esconderlos
  es una tanda por consola, posterior. Quince mensajes «Tu sesión no está activa» dicen ahora la verdad para los dos casos.
- **Añadido**: guardián **`qa-niveles-check.mjs`** (35) — **lee la regla y la lista blanca DEL PLAN**, no del código, y
  exige que `niveles.ts` y las llamadas digan lo mismo; que las cuatro compuertas miren el nivel y cierren por defecto; que
  detrás de `requireActiveAdmin()` a secas no quede nada que escriba; y que ningún borrador exista sin estar antes en el
  plan. Probado mordiendo: marcar `emitOffer` como borrador lo pone rojo.
- **Cambiado**: `qa-rutas-consolas` (341 → **365**) entiende las compuertas con clase y `permisoDeEscritura("ocp", …)`, y
  declara cuatro módulos de `src/lib/` que ahora nombran su consola; `qa-fichas`, `qa-redaccion` y `qa-subastas` afirman
  que sus acciones exigen nivel admin, no solo que tienen compuerta.
- **Datos**: ninguno. Los dos colaboradores se quedan como `viewer` en las tres consolas (decisión del owner) y pasan a
  leer y preparar borradores en cuanto despliega; comprobado por SQL que ningún nivel guardado es inválido.

## [V5.56] — 2026-09-19 (commit 867a4b5)

- **Hito**: **«BCP · Herramientas Internas» recibe sus piezas: los tres cotizadores y las anclas de mercado dejan el ECP.**
  Ejecuta `docs/MUDANZA_HERRAMIENTAS_INTERNAS_PLAN.md` entero (tandas A y B; el owner aprobó las cinco decisiones tal como
  se recomendaban). Es la **segunda** mudanza de estos módulos (OCP → ECP en la V4.26): las cuatro entradas `/ocp/…` de
  `rutasMovidas.ts` se **reapuntaron** al BCP —regla F2, jamás un talón contra otro— y nacen las cuatro `/ecp/… → /bcp/…`
  con sus talones 308. `qa-rutas-consolas`: 29 → **35** rutas mudadas.
- **Seguridad**: **`qa-rutas-consolas` aprende a mirar `src/lib/` — y caza una compuerta viva.** La comprobación (f) solo
  veía `src/app/<consola>/`, y las Server Actions de media casa viven en `src/lib/<módulo>/actions.ts`, donde la consola es
  un identificador que ninguna mudanza de rutas toca. La nueva **(f-bis)** declara qué entrada del rail sirve a cada módulo
  y exige que todas sus compuertas (y sus `revalidatePath`) sean de ESA consola — **la consola esperada sale del rail, no
  del módulo** — y que ningún módulo con compuerta quede sin declarar. El día que se escribió encontró dos cosas:
  **Automatizaciones** llevaba desde la V4.25 en `/bcp/automatizaciones` con sus seis acciones pidiendo
  `requireConsoleWrite("ecp")` (no le fallaba a nadie: el owner tiene las tres consolas; le habría fallado al primer
  colaborador con grant solo de BCP), y `src/lib/coffeed/studioGate.ts`, una compuerta que nadie tenía en la lista. 264 →
  **341** comprobaciones.
- **Corregido**: `src/lib/integraciones/actions.ts` — las seis compuertas de Automatizaciones pasan a la consola donde
  vive su pantalla (`CONSOLA = "bcp"`), y el mensaje «Tu sesión del ECP no está activa» dice BCP.
- **Cambiado**: las **17 compuertas de escritura** de `src/lib/cotizador/actions.ts` (13) y `src/lib/anclas/actions.ts` (4)
  ya no llevan la consola escrita a mano: cada módulo la declara UNA vez (`const CONSOLA: PanelConsoleKey = "bcp"`) y (f-bis)
  la contrasta con el rail. Los tres `revalidatePath("/ecp/anclas-mercado")` leen `ANCLAS_PATH`, y los seis `basePath` de las
  páginas y los seis enlaces escritos a mano del costo de empaque leen `QUOTE_BASE_PATH`: la próxima mudanza es una línea.
- **Cambiado**: **el rail** — «BCP · Herramientas Internas» queda ordenado por modelo: Panel · Direccionamiento · Modelo
  Económico · Anclas de mercado · Cotizador de lotes · Costo de empaque · Cotizador logístico (sin `ownerOnly`: quien los
  veía en el ECP los sigue viendo). «ECP · Caja de herramientas» se queda con Transcripciones.
- **Cambiado**: `QuoteDetail.tsx` sale de la carpeta de rutas a `src/components/cotizador/`: dos páginas lo importaban desde
  `@/app/ecp/(app)/cotizador-lotes/[id]/…`, un import de ruta a ruta que la mudanza habría roto.
- **Retirado**: la pestaña vacía **«Modelo Económico» de Direccionamiento** (`/bcp/direccionamiento/modelo-economico`), que
  el rename de la V5.45 dejó atrás: había dos entradas con el mismo nombre en la misma consola. Queda como 308 hacia
  `/bcp/pvc`, y la URL antiquísima del ECP llega en UN salto (entrada propia; `destinoDe()` resuelve por el `de` más largo).
  Su talón es un `page.tsx` a secas —las hermanas de la ruta siguen vivas y un catch-all chocaría—, y el guardián aprendió
  a reconocer esa forma por lo que HACE (fuera de `(app)`, redirigiendo con `destinoDe()`).
- **Cambiado**: los dos «Grados» ya no se llaman igual — en Direccionamiento, «Grados de Calidad · definición vigente»; en
  el Modelo Económico, «Escala de puntos · en validación». Se funden cuando la fase 2 lleve la escala a `definicion.ts`.
- **Corregido**: ocho títulos de página decían «· OCP» y cinco cabeceras de archivo «OCP ·» — dos consolas atrás; y los dos
  módulos respondían «Tu sesión del OCP no está activa». Dicen BCP.
- **Corregido**: el prompt del nodo final pedía correr «TODOS los `qa-*.mjs`», y dos **gastan dinero**:
  `qa-cromatografia-modelo` (API de Anthropic, ≈ US$ 0,013 por corrida × 3) dice en su cabecera que NO es parte de la
  compuerta, y la batería de esta vía lo corrió cinco veces el 2026-09-19 (≈ US$ 0,20–0,35; no escribe en `ai_usage`, así
  que el libro no lo muestra). El prompt y `ALINEACION` §5.3 nombran ahora las excepciones.
- **Docs**: el plan pasa a EJECUTADO; `herramientas-internas.md` y `consolas.md` al día (la mudanza se cierra; queda con
  dueño en `consolas` el nivel `viewer`, que sigue sin hacerse cumplir); línea en `ALINEACION` §3.

## [V5.55] — 2026-09-19 (commit 912d7e5)

- **Hito**: **Herramientas Internas se redefine: es lo que el rail del BCP llamaba «Business Core».** El owner se
  arrepintió de la definición de dos componentes y la cambió: Herramientas Internas deja de ser un cajón de utilidades
  del equipo y pasa a ser **los cinco modelos con los que la casa piensa y fija sus cifras** — **Definición de
  Contexto · Misión y Visión · Modelo Económico (PVC y Grados de Calidad) · Modelo de Procesamiento (de la finca, de CPS
  a verde empacado y embalado) · Modelo de Logística (estimaciones y cotizaciones que definen precios post-FOB, según
  volúmenes y regiones)**. Invierte su propia decisión de esa mañana (V5.53: «el PVC es únicamente del BCP», charter
  `consolas`): el Modelo Económico vuelve a `herramientas-internas`, ahora como pieza central.
- **Cambiado**: el primer grupo del rail del BCP se llama **«BCP · Herramientas Internas»** (antes «BCP · Business
  Core», `src/lib/panel/consoles.ts`). **Solo cambió el nombre: ninguna ruta se movió** — traer `/ecp/cotizador-*` y
  `/ecp/anclas-mercado` al BCP es una mudanza con talones 308 y 14 compuertas de permiso que el owner aplazó.
- **Docs**: `docs/componentes/herramientas-internas.md` **reescrito**: la tabla de los cinco modelos con dónde vive
  HOY cada pieza (dos no tienen módulo: Procesamiento y Logística son piezas sueltas en `lectura.ts`, `canales.ts`, el
  motor y los cotizadores del ECP), sus tablas (`direccionamiento_context`, `pvc_*`, `quotes`, `market_anchors`), sus
  once guardianes, sus reglas («un modelo se EXHIBE antes de GOBERNAR», «un modelo nuevo empieza por un brief») y su
  kick-off — una conversación por MODELO. Recibe de `consolas` los pendientes del PVC (fase 2, refurbish, CN-1, CN-8, la
  mitad de modelo de CN-9) **y el contrato de Grados de `ALINEACION` §1** (`definicion.ts`).
- **Docs**: `docs/componentes/consolas.md` — el BCP de este charter queda en **configuración del sistema y red de
  socios**; suelta Direccionamiento y el Modelo Económico y **recibe el Transcriptor, Stripe y la Herramienta de Guion**
  (con sus tablas `transcripts`/`transcript_workers` y sus dos guardianes). Nace con dueño aquí el pendiente de la mudanza.
- **Docs**: reparto de lo que sobraba, **por modelo** — cotizador logístico → Logística; cotizador de empaque →
  Procesamiento; anclas de mercado y cotizador de lotes → Económico; las pestañas «Grados de Calidad» y «Mercado Global»
  de Direccionamiento → Modelo Económico (Mercado Global es el «Marco de mercado» del plan §11).
- **Docs**: `ALINEACION` — línea en §3, regla nueva en §2 (**Herramientas Internas es el backstage del backstage**), nota
  de lectura y tres filas con dueño nuevo en §3b; `PLAN_NARRATIVA` §1 (CN-1, CN-8, CN-9 cambian de dueño y conservan la
  clave); cabecera de `PVC_BCP_PLAN.md`; `AGENTS.md`; y los kick-offs recompilados (`docs/KICKOFF.{md,html}`).

## [V5.54] — 2026-09-19 (commit 6e90d79)

- **Corregido**: **Sonnet 5 cuesta 2/10 por millón, sin promoción.** `src/lib/ai/precios.ts` lo tenía como base 3/15 con
  un «precio de lanzamiento» 2/10 hasta el 2026-08-31 — la promo no existía: 2/10 ES la tarifa (tabla de modelos de la API,
  verificada el 2026-09-19; lo avisó CommaaS el 2026-09-14 y la auditoría del nodo final le puso dueño). Desde el 1 de
  septiembre cada llamada de Sonnet 5 se habría anotado un 50 % por encima de lo facturado. **No llegó a pasar**: el libro
  no tiene ni una fila de Sonnet 5 entre el 1 y el 19 de septiembre (las cinco que hay son de agosto, a 2/10, comprobado
  por SQL), así que no hay histórico que decidir. De paso entra la tarifa de `claude-fable-5-1` (10/50).
- **Corregido**: **`qa-consumo-check` afirmaba la tarifa equivocada EN VERDE** — «el 2026-09-01 ya va a tarifa plena
  (3 y 15)», «la misma llamada cuesta un 50 % más pasada la promo». Segunda vez en dos versiones que un guardián copia
  la regla del código (la otra: la Base física, V5.53). Ahora afirma 2/10 antes y después del 1 de septiembre, que
  ninguna tarifa declara una promoción, y contrasta siete modelos contra la tabla publicada (20 → **22**).
- **Corregido**: **`qa-transcripciones-nube.mjs` estaba roto** (como muy tarde desde la reorganización de carpetas del 2026-09-11): buscaba su audio de prueba en
  `../reference_html_tools/_whatsapp-transcript-html/…`, carpeta que dejó de existir, y moría con `ENOENT` a mitad de la
  parte pagada. El audio vive en `tools/transcriptor/tests/fixtures/`; la ruta se ancla ahora al script (no al directorio
  desde el que se corre) y su existencia se comprueba en la parte GRATIS. **Corrido de punta a punta**: subió los 43 s,
  AssemblyAI devolvió 6 segmentos y 2 voces, el aviso llegó por webhook y la fila de prueba se borró (19 → **20**).
- **Cambiado**: `ConsumoBoard` — el aviso «Sonnet 5 está a precio de lanzamiento» anunciaba una promo que no existía;
  se queda dormido y despierta solo si `precios.ts` vuelve a declarar una. `docs/CLAVES_IA_Y_COSTE.md` deja de decir que
  el capítulo con Sonnet cuesta «~$0.016 desde el 01/09».
- **Cambiado**: **`docs/KICKOFF.html`** — **«Copiar prompt» copia primero por el camino síncrono**, dentro del clic, que
  es lo único que un marco aislado como el visor de artefactos acepta siempre (la API moderna del portapapeles puede
  estar vetada ahí y antes iba primero); probado con la API bloqueada y un clic real. El prompt de la ficha **se reescribe
  en vivo** al teclear en «Hoy:», así que lo que se ve es lo que se copia — también en el último recurso, que selecciona
  el texto para Ctrl+C. Los enlaces internos se resuelven a mano, por si el visor no navega a un «#ancla».
- **Añadido**: **botón «↑ Arriba»** arriba a la derecha de cada una de las 18 fichas del KICKOFF (44 px, vuelve al
  inicio —al índice, en el teléfono— y deja el foco allí).
- **Docs**: cerradas las dos filas de `ALINEACION` §3b (`precios.ts`, el guardián de transcripciones) y los pendientes
  (b) y (c) de la auditoría en `consolas.md`; `herramientas-internas.md` deja de anunciar el guardián como roto.

## [V5.53] — 2026-09-19 (commit a53a27d)

- **Hito**: **el nodo final estrena oficio, y el owner cierra cinco decisiones en un día.** La conversación
  «WRAP-COMMIT-PUSH (CTC Platforms)» —la vía de los wraps que `ALINEACION` §5.3 nombraba y nunca existió— auditó por
  primera vez que el maestro y los charters estuvieran en el mismo punto (`d563a44`, solo docs). No lo estaban. De lo que
  encontró, el owner decidió el mismo día: **(1)** el Modelo Económico (PVC) es **únicamente del BCP**; **(2)** los
  métodos de pago serán **Nequi Y Zulu, los dos**, a configurar más adelante; **(3)** la regla de la mezcla, reconciliada
  en todos lados; **(4)** las sesiones de componente siguen empujando su tanda y esta vía es el cierre; **(5)** un
  documento nuevo con todos los prompts de arranque.
- **Corregido**: **la Base física estaba implementada AL REVÉS de lo decidido.** `src/lib/pvc/escala.ts` exigía
  `factor > 94` («mayor que 94») cuando el owner fijó **≤ 94, y un Black hasta 98** (`PVC_BCP_PLAN.md` §14 n.º 9): el
  factor de rendimiento son los kilos de pergamino por 70 kg de excelso, y más bajo es mejor. El tablero publicado
  siempre lo dijo bien. `revisarBaseFisica(b, banda)` recibe ahora el grado que el lote llevaría, y nacen
  `FACTOR_MAXIMO`, `FACTOR_MAXIMO_BLACK` y `factorMaximoDe`. La calculadora de BCP · Grados arranca en 92,8 (la base
  de la FNC) en vez de en un 95 que ya no cumple. Hoy solo lo lee esa pantalla; es la puerta que el veredicto heredará.
- **Corregido**: **`qa-pvc-escala` afirmaba la regla invertida EN VERDE** («factor 95 cumple · 93 no cumple»). Un
  guardián que copia la regla del código no verifica nada: ahora la toma del plan — 93 y 94 cumplen, 95 no, 95 sí en
  Black, 98 sí y 98,5 no, y el tope de Black no vale para un Red (63 → **68** comprobaciones).
- **Cambiado**: **la regla de la mezcla** (`src/lib/pvc/lectura.ts`), precisada por el owner. **Black** es un blend de
  3 a 4 **orígenes y/o variedades**; **Red** es **siempre de una sola variedad** —una mezcla regional—; y los 3 o 4
  están **anclados a la compra mínima a cada productor involucrado: una carga**. Sale la fila «2 lotes → 4 cargas»: una
  mezcla de dos ya no existe. Nacen `CARGAS_POR_PRODUCTOR` y `COMPOSICION_MEZCLA`; `MOQ_MEZCLA` se DERIVA
  (`n × CARGAS_POR_PRODUCTOR`) en vez de escribirse a mano. `LecturaBoard` y `EscalaBoard` lo dicen así;
  `qa-pvc-lectura` 59 → **67** (cuatro de ellas leen el PLAN: la regla escrita y la del código tienen que ser la misma).
- **Docs**: la mezcla, **reconciliada en todos lados** — `PVC_BCP_PLAN.md` §9.2 (tabla sin la fila de dos), §12 (el
  «4 · 3 · 2 · 1 · ½, fijos»), §14.4 (la tabla traía «Black 4 · Red 3» fijos; ahora son dos filas que valen para los dos
  grados) y §14.7 n.º 28; `ALINEACION` §3b; el plan de narrativa (CN-1, CP-1); `consolas.md`, `cherry-picked.md`,
  `kaffetal-regal.md` y el brief del guion del productor, que llevaba el 🟡 «consolas reconcilia».
- **Docs**: **el Modelo Económico es solo del BCP.** `consolas.md` gana sus tablas (`pvc_*`, `public_pvc_current`,
  `public_pvc_next`), su mapa de código, sus **siete guardianes** (`qa-pvc-{motor,tablero,vigencia,lectura,escala,
  canales,compromiso}`) y su regla («cambiar el motor empieza en Python»); `herramientas-internas.md` los suelta — llevaba
  congelado en la fase 1 del PVC desde la V5.29.
- **Docs**: **métodos de pago** — `ALINEACION` §1 deja de tener un «conflicto abierto n.º 2»: Nequi y Zulu se integran
  los dos (Stripe sigue aplazado). Reescritas las dos filas de §3b que se contradecían, el O-3 del plan, y los charters
  de consolas, Kaffetal Regal y Cherry Picked.
- **Añadido**: **`docs/KICKOFF.html`** — el documento nuevo con los **18 prompts de arranque** (los doce componentes,
  el nodo final, plataforma, CommaaS y los tres de «proyecto nuevo»): índice, botón de copiar y un campo «Hoy:» que
  rellena `<la tarea>` antes de copiar. Lo compila el mismo `build_kickoff.py` que ya escribía `KICKOFF.md`, desde
  `docs/componentes/kickoff_plantilla.html`, para que no vuelva a quedarse viejo (el PDF que usaba el owner no traía la
  Secretaría y nombraba una vía que no existía). El **prompt de «WRAP-COMMIT-PUSH»** es nuevo y lleva la auditoría en
  siete pasos.

## [V5.52] — 2026-09-18 (commit 7037ec4)

- **Hito**: **CP-1 · la tienda deja el euro.** El precio de un lote lo calcula el PVC en **dólares**
  (`motor.ts`: `n0 = copc / trm / kg_g`) y la tienda Green tenía el símbolo «€» escrito a mano en seis archivos. El
  2026-09-18, con el primer lote publicado, quedó anunciando **«€31,00/kg» sobre un número en dólares**. Ejecuta la
  decisión del owner de `ALINEACION` §3 (2026-09-17).
- **Añadido**: `src/lib/precios/moneda.ts` — **fuente única** de la moneda de cara al comprador: `MONEDA_TIENDA`
  (USD · «US$») y `MONEDA_SUBASTA` (EUR · «€»), más el formateador `importe()`, que antes se llamaba `eur()` — el
  nombre era la mitad del problema: devolvía un número sin moneda y cada sitio le pegaba el símbolo que le parecía.
- **Cambiado**: catálogo, tarjeta de lote, carrito, envíos, perfil y pedidos, el pack de muestras, la narrativa
  (Transparency Credit, que **no llevaba ninguna moneda**), la landing de Roast y el catálogo del OCP pasan a leer el
  símbolo de esa fuente. Ni un «€» suelto queda en la tienda.
- **Datos**: ⚠️ `cartData()` suma en UN total los kilos, el flete y el pack, así que los tres pasan a dólares con el
  **mismo número**. Para el lote es una corrección (siempre fue USD); para el flete (0,10–0,45/kg) y el pack (300) es
  un **cambio de precio implícito de ~8 %**, hecho con eso sabido: 0 pedidos de lote y 1 pack de prueba el día del
  cambio. Si el owner prefiere convertir en vez de reetiquetar, el sitio es ese archivo y una tasa.
- **Retirado**: a medias y declarado — la **subasta Tyrian sigue en euros** y no es un olvido — `lot_auctions` lleva
  la moneda en el NOMBRE de sus columnas (`precio_salida_eur_kg`, `incremento_eur_kg`), así que cambiarle el símbolo a
  la pantalla sin migrar el esquema sería mentir en la dirección contraria a la que se acaba de corregir. Pasa a US$
  en **CN-4**. Su euro ahora sale de `MONEDA_SUBASTA`, no de un literal: una excepción declarada se ve.
- **Corregido**: en el paquete público del lote, el atributo SCA `sca_cuppers` se rotulaba «Catador» — se lee como un
  nombre y es un **puntaje**. Pasa a «Puntaje del catador» en los tres idiomas.
- **Añadido**: guardián `qa-moneda-check.mjs` (24) — ni un símbolo suelto en la tienda, `eur()` no vuelve, los tres
  sumandos del carrito comparten moneda y el euro de la subasta viene declarado.

> **Wrap V44** (2026-09-19): ciclo compilado en `Documentacion_Interactiva_V44.0(f420ad4).html` — 40 nodos (+1: `n-portal`) · 146 fichas (+6: `portalpublico`, `codigopublico`, `moneda`, `canales`, `compromiso`, `narrativa`) · 58 trazas (+2: `findmylot`, `programas`) · 95 wires (+4) · 35 CTX (+1) · 381 ANN (+19) · FILETREE 3002. Compila V5.46–V5.52 y la narrativa del 17-sep (solo docs).

## [V5.51] — 2026-09-18 (commit 9ed7b28)

- **Cambiado**: la **primera imagen** del CTCx Public Catalogue pasa a ser la **cesta de cerezas** del owner
  («Flavour · Quality · Traceability»). Va entera y sin retocar sobre una placa blanca —`contain`, nunca `cover`:
  recortar un dibujo le corta el asa a la cesta—, y sobre blanco y no sobre el papel del tema, porque es un grabado a
  línea muy claro que sobre gris se apagaría.
- **Corregido**: la foto de la mesa con el café en sus cinco estados **salía boca abajo**. Es una panorámica tomada de
  lado y se había rotado −90° en vez de +90°, así que los platos colgaban de la madera en lugar de apoyarse en ella.
  Rotada bien y reencuadrada: ahora se ven molido, tostado, verde y pergamino sobre la mesa, con las tazas detrás.
- **Cambiado**: la tira «de la finca a la taza» pasa de cuatro pasos a **cinco** — la foto del patio de secado, que
  hasta ahora hacía de hero, bajó a un paso propio («El secado»). De paso la cadena queda completa: el café no salta
  de la cereza al saco.
- **Retirado**: `hero-patio-guacamayo.webp` (su recorte 3:4 ya no se usa; el patio vive ahora en 4:3 como
  `secado-patio-guacamayo.webp`). Nada apunta a él — se comprueba antes de borrar.
- **Añadido**: `qa-catalogo-publico-check.mjs` sube a **119**. La comprobación nueva empareja la tira: las fotos se
  casan con los pies **por índice**, así que una foto de más —o un pie de menos en un idioma— es una página que
  revienta en producción con `undefined`, y los tipos no lo ven porque es un array.

## [V5.50] — 2026-09-18 (commit c438f9f)

- **Hito**: el **CTCx Public Catalogue** se vistió. La portada pasa de una columna de texto a una página con hero
  fotográfico, firma de procedencia, explicación ilustrada y la tira «de la finca a la taza». Las fotos son del
  **archivo propio de CTC** (originales en `reference/ctcx-public-catalogue/`), no de banco de imágenes: la del hero
  lleva el guacamayo de la casa dentro del encuadre, sobre el patio de secado.
- **Añadido**: la **marca del portal** (`MarcaPortal.tsx` + `marca-ctcx-portal.svg`) — una lupa cuyo cristal es el
  grano: el círculo hace de lente y de grano a la vez y la doble curva es la hendidura del café, así que el símbolo
  dice lo que hace la página. Va en línea y hereda `currentColor`, de modo que se pinta con el tema de cada superficie
  sin una imagen por tema.
- **Añadido**: la **firma de procedencia** (`ProcedenciaCTCx.tsx`) — quién es CTC, Kaffetal Regal y Cherry Picked, con
  sus tres logos y una línea cada uno. Es lo que le faltaba a la página: a este portal se llega tecleando un código
  impreso en una bolsa, sin haber visto nunca la marca. No son botones a propósito — es una firma; las puertas siguen
  abajo. La misma firma, en pequeño, cierra el paquete de cada lote.
- **Añadido**: seis fotos optimizadas en `public/images/ctcx-public-catalogue/` (webp, 72–233 KB frente a originales de
  1,5–6,7 MB) y copias ligeras de los tres logos (los de Kaffetal Regal y Cherry Picked pesaban 852 KB y 1,1 MB).
- **Añadido**: tarjeta **Open Graph propia** (`public/images/og/ctcx-public-catalogue.jpg`, 1200×630, 87 KB), que cierra
  el pendiente abierto en la V5.48: hasta ahora el portal prestaba la de la casa matriz, así que compartir un lote por
  WhatsApp enseñaba el logotipo de CTC sin decir a dónde llevaba el enlace. La usan la portada y cada lote.
- **Cambiado**: `catalogoPublico.module.css` reescrita — hero a dos columnas, tarjetas de procedencia de altura
  pareja con los logos alineados, tira de cuatro pasos, y el paquete del lote con cabecera y firma. Ni un color de
  marca escrito a mano: todo sale de los tokens del tema.
- **Añadido**: `qa-catalogo-publico-check.mjs` sube a **115** — comprueba que las dos copias de la marca dibujen lo
  mismo, que la firma muestre los tres logos y no sea una llamada a la acción, que la portada no apunte a
  `reference/` (esa carpeta no va al build) y que ninguna foto ni la tarjeta se pasen de peso.

## [V5.49] — 2026-09-18 (commit e549669)

- **Añadido**: la cinta del **Catálogo Activo** estrena la puerta al portal público — un botón «Buscar mi lote por su
  código» junto al «Ver el catálogo completo» de siempre. Como el módulo está montado en **siete superficies**, el
  botón aparece de una vez en CTC Home, Kaffetal Regal, CaaS y las cuatro landings de la familia Cherry Picked.
- **Cambiado**: el pie de la cinta pasa a ser una fila (`.pie`) con las dos puertas en los extremos — a la izquierda el
  catálogo completo, que vive tras el login; a la derecha el portal público, que no pide nada. En pantalla estrecha se
  apilan alineadas a la izquierda, y el botón mide 44 px de alto (mínimo táctil de la casa).
- **Corregido**: el enlace es **absoluto** a la casa matriz, antes de que doliera. `/ctcx-public-catalogue`
  vive en `RUTAS_SOLO_WWW` y no tiene subdominio, así que un `href` relativo habría funcionado en `www` y dado **404
  en los otros seis hosts** donde está montada la cinta — la misma trampa del proxy que ya se pagó con el botón de la
  ficha técnica.
- **Añadido**: `RUTA_PORTAL` en `src/lib/catalogo/codigoPublico.ts`, para que la ruta del portal se nombre una vez y
  `rutaDelCodigo()` cuelgue de ella. El guardián comprueba que coincida con la del mapa de la red.
- **Añadido**: `qa-catalogo-publico-check.mjs` sube a **85** — vigila que la cinta enlace absoluto, que no teclee la
  ruta a mano, que el botón conserve los 44 px, y que el diccionario de `SneakPeek.tsx` (el que alimenta las siete
  superficies) tenga las tres lenguas completas.

## [V5.48] — 2026-09-18 (commit 5a3121b)

- **Hito**: nace **CTCx Public Catalogue** (`www.ctcexport.com/ctcx-public-catalogue`), el pivote público del lote:
  **«Find my Lot»** resuelve un código corto al paquete público del café, y debajo van la explicación del portal y las
  tres puertas — Kaffetal Regal, Cherry Picked y el «Escríbenos» con su selector de Tema completo. Es la mitad
  delantera de la tanda **CN-7** del plan de narrativa (identificador público del lote → ficha pública).
- **Añadido**: `lots.public_code` — el código corto, único y ALMACENADO del lote (`CTCX-XXXX-XXXX`, alfabeto Crockford
  base32 sin I/L/O/U). Es la **fuente única** que viene a reemplazar los dos códigos derivados y contradictorios que
  convivían: `codigoDeLote(lot_id, grade)` en la cinta y `listingCode(lot_listings.id, grade)` en la tienda Green.
- **Añadido**: `src/lib/catalogo/codigoPublico.ts` (módulo PURO, sin `server-only`) — `normalizaCodigo()` perdona
  minúsculas, guiones, el prefijo y las tres letras ambiguas (O→0, I/L→1), y devuelve la forma canónica o `null`.
- **Añadido**: `/ctcx-public-catalogue` (estática, con su tarjeta y su canonical) y `/ctcx-public-catalogue/[codigo]`
  (dinámica, con canonical y Open Graph POR LOTE). Un código no canónico responde **308** a su forma canónica; un
  código ilegible o sin lote publicado, **404**. Las dos pantallas en ES · EN · DE.
- **Añadido**: `RUTAS_SOLO_WWW` en `src/lib/red/subdominios.ts` — la red aprende que una superficie pública puede no
  ser un subdominio. La leen **los dos** consumidores del mapa: el sitemap (`sitemap.xml/route.ts`) y el tablero de
  ECP · Manejo de Plataformas (`plataformasActions.rutasDeLaRed`), que sin ella habría rechazado la fila y dejado el
  `superficieConOverrides` de la superficie inerte sin fallar.
- **Cambiado**: `publishLot` (OCP · Catálogo) acuña el código público si falta, con el cliente service-role y de forma
  idempotente — despublicar y volver a publicar conserva el código, porque la URL puede estar impresa en una bolsa.
  `/ocp/catalogo` lo muestra en cada publicación.
- **Datos**: migración `lots_codigo_publico` — columna `lots.public_code` (nullable, sin DEFAULT), función
  `public.ctc_public_code()` (`SECURITY INVOKER`, `search_path = ''`, `EXECUTE` revocado a `public`/`anon`/
  `authenticated`), índice único `lots_public_code_key`, y `public_lot_catalog` recreada con `create or replace`
  añadiendo `public_code` al final — nunca `drop + create`, que habría perdido el `grant select` de `anon`.
- **Seguridad**: `guard_lot_protected_columns` gana `public_code`. `lots_update_own` no tiene `WITH CHECK`, así que sin
  esa línea un productor podía escribir cualquier cadena sobre una URL pública o romper un enlace ya compartido.
  Verificado contra la base: el `UPDATE` del productor responde «Estos campos solo puede actualizarlos CTC.» y el
  control (renombrar su lote) sigue permitido. La columna **no lleva DEFAULT** a propósito: los lotes se insertan desde
  el navegador del productor, y un DEFAULT + el REVOKE habría roto «crear lote» en Kaffetal Regal.
- **Seguridad**: queda escrito, en el módulo y en la ruta, que **el código público no es una credencial** —
  `public_lot_catalog` es legible por `anon`, así que el catálogo publicado entero se lee con sus códigos en una sola
  petición. «Find my Lot» es un índice de conveniencia; la compuerta sigue siendo la vista.
- **Añadido**: guardián `qa-catalogo-publico-check.mjs` (76). `qa-ficha-publica-check.mjs` sube a **115**: su §8 pasa de
  vigilar dos puertas al `datasheet` a vigilar **tres**. `qa-guard-check.mjs` gana «producer CANNOT set public_code».
- **Docs**: `ALINEACION.md` §3 y los «Pendientes» de `consolas`, `cherry-picked` y `kaffetal-regal`.

## [V5.47] — 2026-09-16 (commit ea30260)

- **Cambiado**: las **correcciones del CEO** (2026-09-16) entran como `docs/PVC_BCP_PLAN.md` §12 y **priman** sobre lo
  escrito: §9.2, §9.5 y §9.6 quedan marcados SUPERADO. **Cherry Picked solo se entrega DDP** (consolidado a través del
  master roaster); **CaaS** cotiza **FOB Colombia · puerto de destino · DDP** (envío dedicado). Las habilitaciones no son
  intercambiables: **master roaster** (cliente tipo partner) abre Cherry Picked; **regional enablement** (operador
  logístico contratado por CTC) abre el puerto y el DDP de CaaS. **FOB siempre está disponible**.
- **Cambiado**: `src/lib/pvc/canales.ts` reescrito — programas × tramos, `habilitacionRequerida`, `puedeCotizar` y la
  escalera de acceso del comprador `accesoDelComprador` (con master roaster: CP preferido, CaaS segunda opción; solo
  regional enablement: CaaS completo; sin nada: CaaS FOB). El MOQ es **único, en cargas por grado** (Black/Red 3–4,
  Blue 2, Gold/Tyrian 1 o menos según disponibilidad); el empaque es solo presentación. El MOQ en kilos de CaaS se retira.
- **Añadido**: `src/lib/pvc/compromiso.ts` — la **oportunidad Cherry Picked** del productor: escalera de liberación por
  trimestre acumulada (0 · 25 · 50 %) y penalización del **4 %** sobre lo retirado fuera de tramo; `tablaDeSalida`.
- **Añadido**: pestaña Lectura del Modelo Económico — tarjetas «Programas, incoterms y región» y «Oportunidad Cherry
  Picked · la escalera de compromiso» (tabla de salida mes a mes).
- **Cambiado**: la subasta Tyrian puja sobre **FOB puerto Colombia** y se queda en EUR/kg; calendario del PVC por
  trimestres exactos, público, publicado dos meses antes, rige el PVC vigente en la compra.
- **Añadido**: guardianes `qa-pvc-canales.mjs` reescrito (57) y `qa-pvc-compromiso.mjs` nuevo (31).
- **Seguridad**: se retiró del árbol vigente información sensible de acceso hallada en la documentación; la corrección
  real se atiende con el owner fuera del repo. Regla: ningún documento del repo copia credenciales.
- **Docs**: cartas de Cherry Picked, Kaffetal Regal y Herramientas del Café con las decisiones del CEO; `ALINEACION.md`
  §3 y §3b (pendientes del owner: seguridad, auditoría de exposición del repo público, marca Kaffetal ante la SIC,
  preguntas abiertas y brechas del modelo para la v2.2.0).

## [V5.46] — 2026-09-16 (commit ee1383a)

- **Añadido**: la **matriz comercial** del Modelo Económico (`docs/PVC_BCP_PLAN.md` §9.6, lámina del owner) — **dos
  canales × tres tramos de incoterm**, que es lo que faltaba para poder cotizar. **FOB/FCA es el precio base**: no
  depende del destino, **depende del MOQ** — y eso es literal, porque la pila calcula el flete con `fleteKg(moq)` sobre
  escalones de volumen, así que un Black de Cherry Picked (3 cargas ≈ 234 kg) cae en el tramo de 4,2 US$/kg y el mismo
  Black en CaaS (1000 kg) en el de **2,9**. La diferencia entre canales es el camión, no una política comercial.
- **Añadido**: **CIF/CIP y DDP solo se cotizan con habilitación regional**, y es distinta en cada canal — **Master
  Roaster** en Cherry Picked (un tostador de referencia que opera ese mercado con CTCx; ya existía en la casa) y
  **Regional Operation Enablement** en CaaS (el papeleo y el conocimiento propios para esa geografía; concepto nuevo).
  Hasta ahora el motor calculaba `n2`/`n3`/`n4` para cualquier destino y **nada impedía** pintar un DDP a un país donde
  CTCx no tiene con quién entregar.
- **Añadido**: MOQ por canal — Cherry Picked en **cargas equivalentes** (Black y Red 3 o 4 · Blue 2 · Gold 1 · Tyrian ½)
  y CaaS en **kilos** (Black y Red 1000 · Blue 500 · Gold y Tyrian 100), este último **componible con fracciones de
  varios cafés**. El módulo puro `src/lib/pvc/canales.ts` lo encierra junto a `puedeCotizar()`.
- **Añadido**: la pestaña **Lectura** muestra la matriz con los precios reales de la edición y **el escalón de flete en
  el que cae el MOQ de cada canal**, con las casillas condicionadas marcadas.
- **Añadido**: guardián **`scripts/qa-pvc-canales.mjs`** (63) — el mapeo tramo → columna de la pila (fob=n2, cif=n3,
  ddp=n4), que FOB sea el único incondicional, las dos habilitaciones, los MOQ de la lámina, que los dos módulos que
  dicen el MOQ de Cherry Picked no se separen, y que el flete siga bajando con el volumen.
- **Docs**: §9.3 anota que CIF/DDP dependen de la habilitación; §11.1 mete la matriz en la pestaña «MOQ y mermas».
  Quedan **dos preguntas al owner**: si el tercer tramo es DDP o hay que partirlo en DDP y **DAP** (entregado sin
  derechos pagados), y la tensión entre el mínimo estándar de Tyrian (½ carga) y el piso de saco de §9.2 (70 kg).

## [V5.45] — 2026-09-16 (commit 8730d9f)

> **Wrap V43** (2026-09-16): ciclo compilado en `Documentacion_Interactiva_V43.0(4418a67).html` — 39 nodos · 140 fichas (+1: `cromatografia`) · 56 trazas (+3) · 91 wires · 34 CTX · 362 ANN (+22) · FILETREE 2864 archivos. Compila V5.32–V5.45.

- **Añadido**: pestaña **Grados** del Modelo Económico (`/bcp/pvc/grados`) — la escala **«El Punto y la Tríada»**
  (`docs/PVC_BCP_PLAN.md` §9.1) con su **calculadora**: puntaje SCA + las tres letras (variedad · proceso ·
  reconocimiento) → puntos → grado → **lo que ese grado vale hoy** (escalón de la edición vigente, empaque y MOQ). Es
  la primera versión de la herramienta «PVC × grado» del §9.5. Trae la curva de la escala sobre las cinco bandas, la
  **Base física** como puerta previa (factor > 94, humedad 10–12 %, densidad por variedad), la tabla de SCA mínimo por
  tríada y el catálogo semilla de variedades con las tres filas que el owner aún no confirma.
- **Añadido**: `src/lib/pvc/escala.ts` — módulo **puro** con el modelo: `baseSca` sobre las anclas de la gráfica del
  owner, el multiplicador con **K derivada** ((2500/1990 − 1)/6, que es lo que lleva el techo del café común al de la
  escala), las tres puertas y `revisarBaseFisica`.
- **Cambiado**: el módulo se llama **«Modelo Económico»** en el rail del BCP (antes «PVC · Valor de Cosecha»). La
  **ruta sigue siendo `/bcp/pvc`** a propósito: el rename es de nombre, no de sitio.
- **Cambiado**: el **panel del BCP deja de ser un índice y es un tablero**. Llevaba escrito desde V4.24 que volvería a
  serlo «cuando haya KPIs de negocio que valga la pena mirar de un vistazo» — el Modelo Económico los trajo: PVC
  vigente, prima mínima, cuánto se ha movido el mercado desde el corte y qué precio viene. El índice de módulos sigue
  debajo, ahora encabezado por Modelo Económico. `ConsoleScaffold` acepta `kpis` y `badge` (sin ellos se comporta igual
  que antes, que es lo que hace el ECP).
- **Añadido**: guardián **`scripts/qa-pvc-escala.mjs`** (63) — K derivada y no elegida; que el surplus **multiplique** y
  no sume; las tres puertas; los cuatro cambios del owner del 16-sep (BCC:86, CBC:86, CCB:87 y ABB:84 son Blue); el
  contraste con la gráfica (19 de 22 puntos en su banda, y **exactamente** los tres conocidos moviéndose); bandas sin
  huecos; monotonía en SCA y en surplus; y que la pantalla siga diciendo que esto **no gobierna**.

## [V5.44] — 2026-09-16 (commit 7f3e9aa)

- **Añadido**: primera cara del refurbish del BCP (`docs/PVC_BCP_PLAN.md` §11) — la pestaña **Lectura**
  (`/bcp/pvc/lectura`, primera del tab strip) responde «qué significa hoy el precio que rige». **No recalcula ni
  publica nada**: el PVC está fijado por tres meses y esta pantalla mide la distancia entre lo que se fijó al corte y lo
  que el mercado hace hoy. Las tres cifras del owner, cada una con su dibujo: **prima mínima** (el escalón Black contra
  el precio de la Federación del día, +40,6 % hoy) con **la regla de precios** a escala real; **sobre base pergamino**
  (+$830.000 por carga de 125 kg) con **la carga apilada**; y **verde empacado FOB** ($45.341/kg, `n2` a la TRM del
  corte) con **el embudo de una carga** — 125 kg CPS → 93,09 excelso → 78 garantizados → unidades de empaque, con el
  COP/kg en cada escalón. Añade la desviación contra la entrada de la edición y la holgura hasta el disparador.
- **Añadido**: `src/lib/pvc/lectura.ts` — módulo **puro** (como `motor.ts`) con las tres fórmulas, el embudo y las
  reglas de MOQ y empaque; y `lecturaDeMercado()` en el servicio, que lee `market_anchors` (90 días, promedio de 30).
- **Cambiado** (addendum del owner, `PVC_BCP_PLAN.md` §9.2): el empaque son **dos estándares**, no cinco formatos —
  **vacío 3 · 6 · 12 kg** para Blue, Gold y Tyrian (los tres con **un solo estimado de costo**) y **GrainPro-type +
  yute de 35 kg** para Black y Red, que deja de venderse en bolsa de 6 kg. El MOQ de Black y Red lo fija **cuántos lotes
  componen la mezcla** (2 → 4 cargas, 3 → 3, 4 → 4; una mezcla de cinco no existe: con seis se hacen dos de tres);
  Blue 2 cargas; Gold 1 carga, con piso excepcional de **un saco** (70 kg CPS ≈ 50 verde ≈ 40 tostado) para Gold y
  Tyrian. El incremento después del mínimo es **la mitad**, fraccionable a cuartos como upsale. Se **exhibe** en
  Lectura; todavía no gobierna precio — eso es la versión v2.2.0 del modelo, con acta.
- **Añadido**: guardián **`scripts/qa-pvc-lectura.mjs`** (59) — las tres fórmulas con los números reales del día, los
  dos estándares de empaque, la regla de la mezcla, el piso de saco, el incremento a la mitad y el embudo; más que la
  pantalla use las funciones en vez de repetir fórmulas.
- **Docs**: el §11.5 corrige el tercer KPI — el owner lo llama «verde FOB», así que es `n2` (FCA Bogotá), no `n1`; y el
  costo de empaque pasa de ser un parámetro a **dos**, uno por estándar, traídos del Cotizador de Empaque del ECP.

## [V5.43] — 2026-09-16 (commit dba3795)

- **Corregido** (hallazgo **A1** de `docs/PVC_BCP_PLAN.md` §10.2): **«vigente» ignoraba la ventana de vigencia del PVC**.
  `edicionVigente()`, la vista `public_pvc_current` y —por su cuenta— la pantalla de Ediciones decidían cuál rige con
  «la última publicada por `published_at`». Como el PVC **se fija por tres meses y se publica siete u ocho semanas antes
  de su fecha efectiva**, publicar la franja siguiente habría puesto su precio a regir el mismo día, con la anterior
  todavía en curso. Ahora rige la edición publicada/corregida **cuya ventana contiene hoy**, y la fecha se toma en hora
  de Colombia (`hoyEnColombia()`): el servidor corre en UTC y adelantaba el cambio de franja cinco horas. No hubo daño
  en producción porque ningún módulo comercial lee todavía el PVC (0 ofertas, 0 contratos, 0 listados).
- **Añadido**: la **próxima edición** deja de estar escondida. Vista `public_pvc_next`, `edicionProxima()`,
  `pvcProximoPublico()`, el campo `proxima` en `GET /api/pvc/current` y una tarjeta propia en Ediciones — que un
  productor o un comprador vea con siete semanas de antelación el precio que viene es el sentido de publicar tan pronto.
  El historial marca «rige hoy» y «próxima».
- **Datos**: migración `pvc_vigencia_por_ventana` — `public_pvc_current` filtra por `[valid_from, valid_to]` con
  `coalesce(valid_from, publish_date)` para que una edición sin ventana no deje al sistema sin precio; nace
  `public_pvc_next`.
- **Añadido**: guardián **`scripts/qa-pvc-vigencia.mjs`** (28) — la regla en los tres sitios que la deciden, que la
  pantalla ya no la derive por su cuenta, y la aritmética de la ventana probada con las fechas de una franja real.
- **Docs**: `PVC_BCP_PLAN.md` gana el **§11, el refurbish del BCP a «Modelo Económico»** (pestañas Lectura · Grados ·
  Marco de mercado · MOQ y mermas; el marco **es dato** y clasifica la Tríada, con el D10 como su impresión; la
  explicación de los dos sistemas de MOQ por la doble unidad carga↔bolsa y el colchón de merma; el Tablero como
  configurador de un agente; los KPI con sus visualizaciones; Month-Wrap ×5 por periodo) y el **§10, la auditoría del
  módulo** (A1–A13) verificada contra la base.

## [V5.42] — 2026-09-15 (commit da793d4)

- **Corregido**: la ayuda «¿Cómo enciendo un equipo?» de OCP · Transcripciones (`WorkersBadge.tsx`) mandaba al
  operador a `reference_html_tools\_whatsapp-transcript-html`, carpeta que dejó de existir con la reorganización de
  `C:\dev` (2026-09-11). Ahora dice `tools\transcriptor` — la misma carpeta que empaqueta `/api/transcripciones/descargar`.
- **Docs**: las cinco decisiones del PVC (`docs/PVC_BCP_PLAN.md` §8) quedan **tomadas por el owner** (2026-09-15) y el
  plan gana el §9 con la **escala de puntos CTC** (1000–2500: base por SCA × surplus multiplicativo por variedad ·
  proceso · reconocimiento, con puerta de entrada en 80–81,99 y Tyrian solo desde 89 SCA), los MOQ por unidades de 6 kg y la doctrina de moneda (US$ FOB a la TRM del corte como normalizador;
  CIF/DDP en la moneda del destino). El conflicto abierto n.º 1 de `ALINEACION.md` §1 se cierra; la fase 2 del PVC
  queda desbloqueada (pendiente con dueño `consolas`).

## [V5.41] — 2026-09-14 (commit 9a16044)

- **Añadido**: botones **«i» en cada campo** del análisis cuantitativo (pH, materia orgánica, nitrógeno, fósforo, potasio,
  calcio, magnesio) con qué es en 15 palabras o menos y los **rangos bajo · medio · alto de Cenicafé** (Sadeghian 2018,
  Avance Técnico 497, tabla 2; café en producción), el rango adecuado resaltado, el método de laboratorio al que valen y
  el aviso de confirmarlos con el técnico. Los rangos viven en las **reglas v2.6** y no llegan al modelo. También hay
  «i» en «NaOH por 5 g de suelo», «Papel del croma» y «¿Cómo maneja la finca?», con una tabla de opciones.
- **Cambiado**: las definiciones con ecuación usan notación simbólica y una **leyenda completa de símbolos**, plegada al
  final en un acordeón (glosario de 99 símbolos en tres idiomas: L*, a*, b*, ΔE*ab, r(θ)…). Abren con un **diagrama de
  lo que se mide**, dibujado sobre la foto del croma con sus fronteras medidas si la hay.
- **Añadido**: en la revisión de la escala de Ford, cada número del **rango que daría el técnico** dice qué significa
  (1 ausente … 5 totalmente desarrollada), junto al rango del programa, el de la lectura y la mediana publicada. Tres «i»
  nuevas (canales, picos, intensidad) con su ecuación, su diagrama y la guía 1–5, aclarando que la fuente solo define 1 y
  5 y que 2 a 4 son la guía de CTC.
- **Añadido**: opción **N/A** en los veredictos por elemento y en la valoración general del laboratorio.
- **Cambiado**: la cara del laboratorio va en **pestañas** (Captura · Rasgos · Lectura · Feedback), con el contador de
  revisados en la pestaña de lectura; al imprimir salen todas.
- **Añadido**: el **PDF del laboratorio abre con un one-pager** del informe del productor (foto anotada, señal, resumen,
  conjeturas con certeza, prácticas, lo que confirma, análisis declarado, «Preparada por» y descargo) y salto de página.
- **Corregido**: el contador de elementos revisados daba 0 cuando la cara del laboratorio estaba oculta.
- **Docs**: PDF de metodología edición 1.3; `cromatografia-recorrido.mjs` pasa por la pestaña Feedback; guardián
  `qa-cromatografia` sube a **294**.

## [V5.40] — 2026-09-13 (commit 0dd40e5)

- **Añadido**: **Tulio Esteban Lozano Vesga** (UIS-IPRED, proyecto Campo Para Todos) entra en el Lector de Cromatografía
  como **referente de la cromatografía cualitativa en la caficultura latinoamericana**. Su trabajo de grado (finca El
  Guacal, Barichara, 2021; 14 cromas con laboratorio Cenicafé pareado) es fuente de nivel B en las **reglas v2.5**:
  protocolo de Restrepo y Pinheiro tal como se practica en Colombia, efecto de la dilución de NaOH (50–200 ml por 5 g),
  terminaciones de los picos («explosión de lunares» frente a «granos de maíz») y un segundo caso colombiano en que un
  croma leído como excelente coincidió con materia orgánica «muy baja» en laboratorio. Dirigió además la tesis UIS 2026
  que ya se citaba. Bloque `referentes` en las reglas (documentación, no criterio).
- **Añadido**: «Bibliografía y metodología» abre con el referente y seis enlaces (tesis en el repositorio UIS, Perfect
  Daily Grind 2025, dos notas de Comunicaciones UIS 2026, taller en SINTERCAFE 2026 y @campoparatodos), con la nota de
  que citarlo no implica que respalde la herramienta; en los tres idiomas. Pie de la herramienta y bibliografía de los
  PDF (edición 1.2) al día; DOC-03 lo nombra en «lo que falta validar» y en la lección de los casos pareados.
- **Docs**: `fuentes/INDEX.md` (fuera del repo) registra la tesis como #24; el guardián `qa-cromatografia` sube a **280**.

## [V5.39] — 2026-09-13 (commit d23352f)

- **Añadido**: el Lector de Cromatografía habla **español, inglés y alemán**. Conmutador ES · EN · DE en la cabecera
  (se recuerda en el navegador); la interfaz entera, los diálogos y las definiciones salen de diccionarios completos; la
  lectura del modelo se pide en ese idioma (prompt `croma-prompt-1.8`) y la validación aplica léxicos por idioma
  (prohibiciones, duda, coherencia con la radialidad, zonas) más el español. Lo que el servidor pone por su cuenta
  (catálogo de prácticas, señales, certezas, descargos, etiquetas de nivel, reglas regionales, compuerta) sale del
  bloque `i18n` de las **reglas v2.4**. Una lectura con campos en español cuando se pidió otro idioma se rechaza.
- **Añadido**: **análisis cuantitativo de laboratorio** (pH, materia orgánica, N, P, K, Ca, Mg, laboratorio y fecha) en
  un acordeón paralelo a «Más datos», con la explicación de qué es (el examen que suele hacer la Federación a través de
  Cenicafé). Se guarda con el trabajo, sale en el informe del productor como tabla con sus propios valores, viaja al
  modelo marcado como dato del laboratorio y solo alimenta un campo técnico nuevo, `contraste_laboratorio`, que la
  validación exige cuando hay análisis, prohíbe cuando no lo hay, y rechaza si califica los valores («pH bajo»,
  «moderate organic matter») o mezcla la taza. La cara del productor sigue sin nombrar nutrientes ni acidez.
- **Añadido**: **«Preparada por»** opcional en el informe del productor: casilla, nombre de la cuenta por defecto (la ruta
  de fincas devuelve `cuenta.nombre` desde `profiles.full_name`) y editable. No viaja al modelo y solo se guarda si se
  marca.
- **Añadido**: botones **«i» de definiciones** en la compuerta, los rasgos medidos, la escala de Ford, la certeza y la
  señal: un diálogo con qué es, la ecuación tal como la calcula el motor, la leyenda de símbolos y el rango, en los
  tres idiomas.
- **Cambiado**: los PDF impresos llevan cabecera explícita **«Colombian Trading Company SAS»**, pie con **NIT
  901.483.425-7 · ctcexport.com** y **«Página n de N»** (cajas de margen `@page`, Chrome y Edge; el pie del documento
  sigue en cualquier navegador).
- **Cambiado**: el «i» verde del laboratorio es ahora el botón **«Bibliografía y metodología»**, en su propia barra
  encima de «Imprimir feedback (PDF)».
- **Corregido**: el patrón de palabras vetadas tomaba «photo» por «pH»; los tokens cortos exigen fin de palabra. Una
  fuente C que **niega** la validación por pares ya no se rechaza.
- **Docs**: PDF de metodología edición 1.1 regenerados; `qa-cromatografia-modelo` acepta `[idioma] [lab]`; el guardián
  `qa-cromatografia` sube a **271** comprobaciones (paridad de diccionarios, léxicos, contraste, PDF, definiciones).

## [V5.38] — 2026-09-13 (commit 6fd3187)

- **Cambiado**: el Lector de Cromatografía usa en modo oscuro **el morado claro de CTCX** (fondo `#451D96`, tarjetas
  `#512AA6`, acentos lavanda) en vez del casi negro que el owner encontró demasiado oscuro.
- **Añadido**: la cara del laboratorio **muestra la foto anotada**, con el id y la zona de cada conjetura bajo su
  título. Cada figura lleva ids propios de flecha y recorte, porque las dos viven a la vez en la página.
- **Añadido**: **identificación del laboratorio** en el Feedback Técnico: laboratorio o institución, RUT con aviso del
  dígito de verificación (algoritmo DIAN), nombre y cargo del técnico, y firma dibujada con el dedo o el mouse. Sale en
  el PDF impreso y en el JSON (esquema 2). Una lectura nueva conserva a quien revisa pero no su firma; los trabajos
  anteriores se migran.
- **Añadido**: botón **«?»** amarillo en el paso 1 del productor: qué es la cromatografía en cinco puntos sencillos,
  un dibujo de las cuatro partes del croma y un cierre, más **tres fotos de ejemplo** que pasan por la misma
  compuerta y quedan marcadas como ejemplo en el informe.
- **Añadido**: botón **«i»** verde en la tarjeta de feedback: el método en unas 150 palabras, un acordeón de recursos
  en línea con licencia y nivel, y otro con **tres PDF de metodología** (metodología · base de conocimiento y fuentes ·
  datos, calibración y validación) con marca de agua, derechos de CTCX, atribución de terceros y limitación de
  responsabilidad. Se generan con `scripts/build-cromatografia-docs.mjs` desde las reglas, el motor y el prompt.
- **Añadido**: el guardián `qa-cromatografia` sube a 213 comprobaciones (tema, figura del laboratorio, identificación y
  NIT, los dos diálogos sin jerga para el productor, fotos y PDF en disco).

## [V5.37] — 2026-09-13 (commit c918c8f)

- **Añadido**: el informe del productor del Lector de Cromatografía **abre con su foto anotada** (pedido del owner): el
  croma recortado y centrado, con un número y una flecha por conjetura que señalan la zona de la que habla, y el
  título al lado. Va en pantalla y en el PDF exportado; las tarjetas de las conjeturas llevan el mismo número.
- **Cambiado**: cada conjetura nombra su **zona** (central · mineral · organic · enzymatic · general; prompt 1.7). La
  flecha se ubica con el centro, el radio y las fronteras que midió el motor de rasgos, no a ojo. Si la zona falta o
  no es válida, `zonaDesdeTexto` la deduce de lo que se ve y queda anotado; las lecturas guardadas sin zona también
  se señalan. La miniatura guardada sube a 560 px para que la foto se imprima nítida.

## [V5.36] — 2026-09-13 (commit d72cdc3)

- **Cambiado**: el informe del productor del Lector de Cromatografía **lee más y no abre con «vaya al laboratorio»**
  (owner). Los hallazgos pasan a ser **conjeturas** (de 2 a 5): lo que se ve, lo que podría significar, otra
  explicación posible y lo que implicaría para el lote, cada una con su **certeza** (baja o media). La certeza no la
  escribe el modelo: la calcula `certezaDe` desde la confianza y el nivel de evidencia de las interpretaciones
  técnicas que la sustentan.
- **Cambiado**: «Qué puede hacer» trae solo prácticas de manejo, ordenadas por prioridad, y al menos una. El análisis de
  laboratorio y repetir el croma siguen siempre, pero en un bloque aparte al final, «Para confirmar y seguir el
  avance»; si el modelo los elige, pasan ahí con su porqué. Reglas v2.3 (textos de certeza) y prompt 1.6.
- **Corregido**: una interpretación que cita dos fuentes («Kokornaczyk…; Graciano…») con nivel «A/B» ya no se rechaza: se acepta con el nivel más conservador y queda anotado; cada fuente debe existir en las reglas. Prompt 1.6 con las listas literales de palabras que la cara del productor no puede usar. Prueba en vivo: 3 de 3 al primer intento, ≈ US$ 0,021 por lectura.
- **Añadido**: la cara del laboratorio revisa cada conjetura (c1…) y cada práctica para confirmar (k1…); las lecturas
  guardadas de V5.35 se siguen pintando. Guardián `qa-cromatografia` con las costuras nuevas.

## [V5.35] — 2026-09-13 (commit 89cf9bf)

- **Cambiado**: **el Lector de Cromatografía tiene dos caras** (reingeniería pedida por el owner). La del **productor**
  es la principal: tres pasos (foto con consejos en palabras del campo, datos de la muestra, «Leer mi suelo») y un
  informe con señal general, resumen, lo que muestra la foto y qué puede hacer, cada acción con su cómo hacerlo, su
  cuidado y su fuente. La del **laboratorio** es el backstage técnico: compuerta, rasgos, Ford, cadena de evidencia,
  contexto regional y recomendaciones técnicas.
- **Añadido**: **Feedback Técnico**. En la cara del laboratorio el técnico da un veredicto y un comentario por cada
  elemento (descripción, rangos de Ford con el rango que él daría, interpretaciones, contexto regional,
  recomendaciones, y cada hallazgo y acción del informe del productor) y una valoración general. Se exporta como
  `feedback-tecnico-<id>.json`, con la lectura, los rasgos, las versiones y la miniatura, para refinar el modelo, y
  se imprime en PDF. Sin consentimiento no lleva el nombre de la finca.
- **Cambiado**: reglas **v2.2** con el catálogo de prácticas de manejo (cómo hacerlo verificado en UIS 2026 pp. 60–62,
  Altepetl y Embrapa 455) y la política de lenguaje del productor (sin jerga y sin nombrar nutrientes ni acidez: la
  foto no los ve). Prompt **1.5**: la IA escribe las dos caras en la misma lectura; la del productor elige prácticas
  del catálogo por id y cada hallazgo y acción apunta a las interpretaciones técnicas que lo sustentan.
  `validarSalida` lo comprueba y añade siempre el análisis de laboratorio y repetir el croma. Prueba en vivo: 2 de 2
  al primer intento, ≈ US$ 0,019 por lectura.
- **Cambiado**: marca **CTCX** como en Defectos del Café: franja de color, loro en cabecera, pie con el logo, la
  propiedad y las fuentes, y la misma firma en los PDF exportados (`public/tools/assets/ctcx-*.png`).
- **Retirado**: las seis fuentes Plex que solo usaba el Lector (el sistema CTCX usa fuentes del sistema).
- **Docs**: brief (acta de la reingeniería) y charter.

## [V5.34] — 2026-09-13 (commit 43917c0)

- **Añadido**: el Lector de Cromatografía usa su **clave propia** `CROMATOGRAPHY_ANTHROPIC_API_KEY` (creada por el owner
  para separar su gasto en la consola de Anthropic) y, si falta, la general `ANTHROPIC_API_KEY`.
- **Añadido**: `GET /api/herramientas/cromatografia/estado` dice si la lectura con IA está disponible y el estado de
  cada variable (ok · sin-clave · clave-invalida · limite-o-saldo), comprobado contra `GET /v1/models` sin gastar
  tokens y guardado 10 minutos. Nunca devuelve la clave. Guardián `qa-cromatografia` con sus costuras.

## [V5.33] — 2026-09-13 (commit ed19bb3)

- **Cambiado**: **reglas de interpretación v2.1** del Lector de Cromatografía (`src/lib/tools/cromatografia/reglas.json`).
  El owner dejó la v2.0 como guía y el criterio de CTC con prelación; cada cambio está contrastado página a página
  con las fuentes abiertas: radios relativos al frente del extracto con priors 0,15 · 0,5 · 0,8; zona periférica
  como papel sin extracto que no se interpreta; escala de Ford con solo sus extremos, procedimiento por cuadrantes y
  distribución observada (mediana 2,5, el color nunca pasó de 4); centro blanco en dos lecturas (nítido y aislado
  frente a cremoso que se integra); fuera el verde oscuro como degradación, dentro el violeta como no deseable; zona
  media ↔ biomasa atribuida a Graciano et al. 2020; terminaciones de los picos según Embrapa 455 en lugar de «borde
  dentado»; nivel de evidencia explícito por fuente; reglas de comparación y metadatos de protocolo.
- **Cambiado**: **compuerta de la foto 1.2**, pensada como «¿se tomó bien la foto?» (owner). El porcentaje del
  encuadre deja de rechazar. Se rechaza un croma de menos de 500 px de diámetro en la foto original y una cámara muy
  inclinada (razón de ejes < 0,80). Las fronteras solo cuentan si son un máximo local dentro de su ventana. Con las
  108 capturas de Martins et al. 2026 pasan 108 y las fronteras medianas medidas son 0,15 · 0,48 · 0,82.
- **Añadido**: el formulario pide el protocolo (papel, NaOH por 5 g de suelo, días desde el revelado) y la lectura lo
  tiene en cuenta. Prompt 1.3 (una fuente C no suena a institución; la observación sale de la imagen; ante dos patrones, las dos lecturas): 3 de 3 lecturas pasan los controles al primer intento, rangos de Ford idénticos, ≈ US$ 0,016 por lectura.
- **Docs**: brief y charter con las tres decisiones del owner resueltas; el dataset propio queda como sugerencia.

## [V5.32] — 2026-09-13 (commit cb4f9e7)

- **Añadido**: **Lector de Cromatografía de Suelo** (`cromatografia-suelo`, Herramientas del Café, Plus), la
  primera herramienta de la suite con pieza de servidor. Lee la foto de una cromatografía de Pfeiffer y el
  contexto de la finca, y da un reporte con cadena de evidencia (observación · lectura · fuente · nivel A/B/C).
  Regla de oro en código: lectura cualitativa, nunca medición ni vínculo con la taza.
  `public/tools/cromatografia-suelo.html` (compuerta, rasgos, Ford programático, reporte y PDF en el navegador,
  sin cuenta y sin internet) · `public/tools/assets/cromatografia-rasgos.js` (visión clásica en JS puro: centro,
  perfil radial CIELAB de 50 anillos, fronteras, radialidad, picos, entropía, simetría) ·
  `src/lib/tools/cromatografia/{reglas.json,prompt.ts,salida.ts}` (prompt armado en tiempo de ejecución desde
  `interpretation_rules.json` v2.0; validación de claims prohibidos, coherencia rasgos↔texto, techo de nivel por
  fuente, descargo forzado, ids por lectura para el futuro modo «expert feedback») ·
  `api/herramientas/cromatografia` (sesión → veredicto de acceso → techo diario de 20 → Haiku 4.5 a temperatura
  0, una corrección si no pasa los controles) · `api/herramientas/cromatografia/fincas` (las fincas de la cuenta
  para prellenar; nunca coordenadas; apagado en Cherry Picked). Trabajos por el puente con esquema propio.
- **Añadido**: guardián `scripts/qa-cromatografia-check.mjs` (122: reglas byte a byte, cromas sintéticos y seis
  rechazos de compuerta, regiones, techos de nivel, salida del modelo, costuras) y prueba en vivo manual
  `scripts/qa-cromatografia-modelo.mjs` (estabilidad a temperatura 0; ≈ US$ 0,013 por lectura, medido).
- **Cambiado**: el libro de consumo gana la vía `herramientas:cromatografia` (`USOS`, `qa-consumo-check`).
- **Datos**: umbrales de la compuerta calibrados con las 108 capturas abiertas de Martins et al. 2026 (Zenodo,
  CC BY 4.0): 107 pasan. El área mínima baja al 20 % frente al 40 % del JSON, que rechazaba capturas bien
  hechas; decisión pendiente del owner.
- **Docs**: brief aprobado `docs/componentes/briefs/herramientas-cafe-cromatografia-suelo.md` (con lo
  construido, la investigación de fuentes y el diseño del modo experto); charter, ALINEACION §3 y §3b.

## [V5.31] — 2026-09-11 (commit 649435c)

- **Docs**: **la plataforma se trabaja por componentes.** Decisión del owner (2026-09-11): un componente por
  conversación, cada uno con su **charter** (`docs/componentes/<clave>.md` — diez: consolas, herramientas-internas,
  biblia, kaffetal-regal, cherry-picked, herramientas-cafe, coffeed, directorio, ctc-tech, varietales), atados
  por **`docs/ALINEACION.md`** (14 contratos transversales, la regla del backstage, el registro de permeación y
  los pendientes cruzados con dueño) y arrancados con **`docs/KICKOFF.md`** (12 prompts compilados desde los
  charters por `docs/componentes/build_kickoff.py`). `docs/HANDOFF.md` se queda con lo transversal (1.397 → 276
  líneas; su cronología íntegra en `docs/archive/HANDOFF_cronologia_2026-07_09.md`); `AGENTS.md` describe el
  trabajo por componentes y el orden de lectura; `README.md` deja de ser el boilerplate de create-next-app; los
  planes ya ejecutados de `docs/` llevan banner de archivado (se quedan en su sitio porque el código los cita).
  Plan y decisiones: `docs/REFURBISH_PLAN.md`.
- **Añadido**: guardián **`scripts/qa-arqlog-check.mjs`** — toda versión del CHANGELOG posterior al último wrap
  del mapa debe tener su asiento en el log de arquitectura vigente. Nació porque V5.25–V5.30 salieron de seis
  sesiones sin dejar asiento; sus seis asientos se compilaron hoy desde este archivo.
- **Cambiado**: **versionado y wraps con desarrollos en paralelo** (`ALINEACION.md` §5): la versión se toma al
  empujar (pull → +1 → push), el asiento es del componente y va en el mismo commit que la versión, el wrap es
  de la plataforma y solo se llama desde la conversación «Wraps del mapa» del grupo CTC Consolas internas.
  CommaaS adopta el mismo contrato a su escala (`commaas/docs/ALINEACION.md`).
- **Datos**: fuera del repo — `C:\dev` ordenado (`reference/<tema>`, `apps-internas/`, los prototipos como
  tenants pendientes de CommaaS), memoria de Claude propia por espacio, barra lateral del Code por componente.

> **Wrap V42** (2026-09-12): ciclo compilado en Documentacion_Interactiva_V42.0(8eb14f5).html —
> 39 nodos · 139 fichas (+2: PVC, componentes) · 53 trazas (+1) · 340 ANN (+15) · batería 9/9 vacías ·
> recupera V5.25–V5.30, que ninguna sesión había anotado.

## [V5.30] — 2026-09-11 (commit 12ea217)

- **Cambiado**: **el video de presentación deja de ser provisional.** Las dos superficies que lo montan —«Tres
  ofertas» en CTC Home (`EcosystemSection`) y «Bienvenidos al Kaffetal Regal» (`BienvenidosSection`)— apuntan al
  video definitivo (`qDAu9mK3KRA`) en lugar del id provisional `Yird1_j6yqo` que compartían desde que se montó el
  `YtEmbed`. Miniatura, reproductor y enlace a YouTube se derivan del id, así que el cambio es una constante por
  superficie.
- **Corregido**: el copy afirmaba una duración que el video definitivo no tiene. El pie visible del reproductor en
  CTC Home decía «CTC, en un minuto» (y sus pares en inglés y alemán) debajo de un video de 5:33, y la entradilla
  del Kaffetal Regal prometía «el camino completo, en un minuto de video». Las seis cadenas de las tres lenguas
  quedaron **neutras respecto a la duración**, que es lo correcto para cualquier montaje futuro.

## [V5.29] — 2026-09-10 (commit 9f57a17)

- **Cambiado**: **PVC · revisión de coherencia.** El dossier v2.1.1 (`docs/pvc/v2.1.1`) se reeditó armonizado con el
  módulo: el código de edición pierde el sufijo de versión (`PVC-F4-2026`; el método se versiona aparte), D2 §7.3–7.4
  describen la publicación con huella en BCP · PVC y los ciclos semanales internos, D3 §1 registra la huella
  (`c476fe80`), y el **D4 en español e inglés lleva el mismo esqueleto que produce «Exportar Reporte» en el
  tablero** (PVC, tres KPIs, escalera con FCA/CIP/DDP, cómo se construye, compromisos; el contexto de mercado
  vive en D3). Una sola etiqueta de versión (v2.1.1) en motor, calculadora y documentos.
- **Cambiado**: el tablero exporta el D4 en **español o inglés** con el título `código · modelo · huella` (ya no
  numera sus propias versiones «D4 v3.n»); abierto sin conexión al BCP, «Publicar» se declara simulación local.
- **Corregido**: el motor Python de referencia redondeaba los empates al par (2.025.000 → 2.020.000) donde Excel
  y el tablero redondean hacia arriba; ahora los cuatro motores coinciden y D2 Anexo A lo fija por escrito.
- **Corregido**: las tablas de `/bcp/pvc` usaban una clase inexistente; ahora llevan el estilo de tabla del panel.
- **Retirado**: las Server Actions de lectura y publicación sin uso en `lib/pvc/actions.ts` — publicar tiene un solo
  camino (la ruta del tablero) para que no existan dos ediciones del mismo código.
- **Añadido**: guardián `scripts/qa-pvc-tablero.mjs` — evalúa el modelo JavaScript del tablero (marcadores
  `@@MODELO`) contra `paridad.json`; con `qa-pvc-motor` y `verify_xlsx.py`, las cuatro implementaciones quedan
  ancladas a la misma referencia.

## [V5.28] — 2026-09-10 (commit 3ae9914)

- **Hito**: **PVC · Ponderación de Valor de Cosecha** entra a la plataforma como módulo del **BCP · Business Core**
  (`/bcp/pvc`, owner-only): la fuente única del indicador principal del negocio. Fase 1 de `docs/PVC_BCP_PLAN.md`.
- **Añadido**: motor TypeScript `src/lib/pvc/motor.ts` (port de `pvc_model_v2.py`, método PVC-D2 v2.1.1: edición,
  escalera, pila FCA/CIP/DDP, back-proof 2019–2026, KPIs, huella) con guardián de paridad
  `scripts/qa-pvc-motor.mjs` contra las cifras exportadas del motor Python (`paridad.json`).
- **Añadido**: cuatro pestañas — **Ediciones** (la vigente con sus KPIs, escalera y pila; historial con huella),
  **Tablero** (el tablero HTML interactivo embebido y autenticado, con puente a la base: publica y lee ediciones),
  **Parámetros del modelo** (versiones inmutables del método, registro de una nueva por acta) y **Dossier**
  (D0–D9 + calculadora por versión, servidos autenticados desde `docs/pvc/`).
- **Añadido**: `GET /api/pvc/current` — la edición vigente pública (código, PVC, vigencia, escalera, pila, KPIs)
  desde la vista `public_pvc_current`, para Cherry Picked, Kaffetal Regal y Make.
- **Datos**: migración `bcp_pvc_core` — `pvc_model_versions`, `pvc_editions` (guard `pvc_editions_guard`: una
  edición publicada es inmutable; una corrección al alza es otra fila con `correction_of`), `pvc_cycles`,
  `pvc_sources`, `pvc_trigger_watch`, `pvc_forecast_scores` (todas service-role-only) y la vista
  `public_pvc_current`. Semilla: modelo v2.1.1 y la edición **PVC-F4-2026 = $2.500.000** publicada.
- **Cambiado**: el rail del BCP · Business Core gana «PVC · Valor de Cosecha»; la pestaña Modelo Económico enlaza al
  módulo. `next.config.ts` traza `docs/pvc/**` para las rutas que lo leen.
- **Docs**: `docs/PVC_BCP_PLAN.md` (el acople completo: tablas, sitios donde repercute, ciclo semanal, certeza,
  fases y las cinco decisiones pendientes del owner); sección en HANDOFF.

## [V5.27] — 2026-08-23 (commit 76993c7)

- **Corregido**: en **Defectos del Café**, la clave de identificación pintaba la foto del grano ENCIMA de
  su etiqueta («Negro o carbón», «Ámbar traslúcido»…). Causa real: la caja de la imagen era una rejilla
  con fila automática y la imagen llevaba `max-height:80%` — ese porcentaje no se resuelve contra una
  fila auto, la imagen salía a tamaño natural (hasta 92 px en una caja de 58) y, como el filtro
  `drop-shadow` crea contexto de apilamiento, se dibujaba sobre la etiqueta que la sigue. Las dos
  correcciones anteriores (V5.25) atacaban el recorte del texto, que era un síntoma secundario. Ahora la
  caja es flex de alto fijo con `overflow:hidden` y la imagen lleva tope en píxeles; medido en el
  navegador: 0/21 imágenes fuera de caja en ES/EN/DE (antes 21/21).

## [V5.26] — 2026-08-22 (commit 4bb787d)

- **Añadido**: captura del carrusel de Herramientas para **Defectos del Café**
  (`public/images/herramientas/shots/defectos-cafe.jpg`, `scripts/build-tool-shots.mjs` registra la
  entrada `defectos-cafe: /tools/defectos-cafe.html`). Sin ella la tarjeta caía al texto de reserva
  en la landing pública.

## [V5.25] — 2026-08-22 (commit 90593cd)

- **Añadido**: nueva herramienta **Defectos del Café** en `public/tools/defectos-cafe.html` —
  catálogo interactivo de los 14 defectos del café verde del afiche oficial de la FNC (fotografía
  propia de CTC, fondo de muestra cambiable gris/blanco/negro/bandeja) y de los defectos del tueste,
  con clave visual de identificación (desde el grano o desde la taza), la matriz de incidencia y
  origen, control de proceso por etapa y una práctica de reconocimiento uno a la vez con
  retroalimentación inmediata. Tres idiomas (español, inglés, alemán). Marca CTCX. Origen `repo`,
  registrada en `tools`/`tool_versions` (id `defectos-cafe`, orden 20) y encendida solo en **web**
  (Herramientas del Café pública) — kr/cp/dc quedan apagados a propósito hasta que el owner decida
  ampliar el reparto.

## [V5.24] — 2026-08-22 (commit edf29ea)

- **Añadido**: **Subastas Tyrian — la puja del comprador**, «el podio de los mejores, al mejor postor».
  Dos tablas service-role-only (`lot_auctions` · `auction_bids`, RLS con cero políticas) y un **guard
  trigger** que hace atómica la regla de la puja (bloquea la fila de la subasta: abierta y vigente,
  fracción válida, monto ≥ líder + incremento o precio de salida; la líder anterior pasa a
  `superada`). En **Cherry Picked Green** la `TyrianSection` dejó de ser demo: lee la subasta real
  (`listarSubastas`, también para visitantes) y puja con `pujar` — sesión + nivel **Pintón o
  superior**; estados «tu puja lidera» / «te superaron»; por mitades A/B o el lote completo; tres
  idiomas. En el OCP, **/ocp/subastas** (pestaña del Catálogo) reemplaza el stub: CTCx abre la
  subasta de un Tyrian galardonado (kilos, salida EUR/kg, incremento, cierre, nivel mínimo, nota
  pública), la mira en vivo (líder y pujadores por mitad), la cierra, la adjudica o la cancela.
- **Cambiado**: adjudicar **no emite oferta ni contrato** — las monedas no se mezclan: la puja es
  EUR/kg, la oferta al productor sigue en COP/kg y se registra en Ofertas como «mejor postor»
  (circuito V5.18 intacto). El perfil del comprador ya no habla del lote demo TY-2713.
- **Añadido**: guardián `scripts/qa-subastas-check.mjs` (30 comprobaciones).
- **Datos**: migración `subastas_tyrian` aplicada en producción (tablas, índices, trigger).

> **Wrap V41** (2026-08-22): ciclo compilado en Documentacion_Interactiva_V41.0(8ac6f6f).html —
> 39 nodos · 137 fichas (+1: Subastas Tyrian) · 52 trazas (+1) · 325 ANN (+6) · batería 9/9 vacías.

## [V5.23] — 2026-08-21 (commit d5d2391)

- **Añadido**: el **escáner visual del OCP y el set de Fichas Técnicas** — el seguimiento acordado
  del rediseño B2/B3 (V5.20). Nueva tabla **`lot_fichas`** (RLS select-own; escrituras solo
  service-role; índice único parcial = a lo sumo **una ficha oficial por lote**). En **/ocp/fichas**
  (riel «OCP · Kaffetal Regal») CTCx ve los soportes B2/B3 de cada lote (URLs firmadas bajo
  demanda), dispara el **escáner** — visión IA (`claude-sonnet-5`, fetch crudo de la casa, gasto
  anotado en `ai_usage` como `kr:ficha-escaner`) que extrae puntaje, escala, atributos SCA, notas,
  factor, almendra, densidad, humedades y mallas al formato `FichaTecnicaData`, saneado por rangos —
  o **compila el reporte del productor** sin IA; y administra el set (oficial ★ · eliminar). El
  escáner es **opt-in** (botón con confirmación de costo): jamás corre en una carga de página ni en
  el veredicto.
- **Añadido**: el productor ve el set en su Ficha — **FichasDelLote** lista las Fichas Técnicas al
  pie de los panes **B2** (cara sensorial) y **B3** (cara física), la oficial primero, solo lectura.
- **Añadido**: guardián `scripts/qa-fichas-check.mjs` (31 comprobaciones: opt-in, modelo pequeño,
  consumo anotado, service-role, una oficial, la extracción no toca `lots` ni `lot_evaluations`).
- **Datos**: migración `lot_fichas_set` aplicada en producción (tabla + índices + política).

> **Wrap V40** (2026-08-21): ciclo compilado en Documentacion_Interactiva_V40.0(1b5720d).html —
> 39 nodos · 136 fichas (+3: el set de Fichas Técnicas, Redacción, el taller de Herramientas) ·
> 51 trazas (+2) · 319 ANN (+10) · batería 9/9 vacías.

## [V5.22] — 2026-08-21 (commit 20832bb)

- **Cambiado**: el **Mapa de Trabajo (`/bcp/mapa`) alcanza al modelo nuevo** — el wrap V39 lo dejó
  señalado como el último rincón narrando el flujo viejo. La banda de la **Arena pasa DESPUÉS del
  Galardón** y se rotula «Arena · vitrina» (tinte de soporte, no del tramo pagado); el bache se
  rotula «Evaluación · bache Q-Grader» y su compuerta «Veredicto Q-Grader · el puntaje manda»
  cablea directo al **GAL** (`gradoPorPuntaje`) y a la planilla oficial en `lot_evaluations`; entra
  el nodo **`lot_offers`** y el comercio se recablea — el galardón emite la oferta, **la aceptación
  crea el contrato**, la negociación Black desemboca en su oferta, y la vitrina cuelga del galardón
  como invitación. El nodo de decisión «Grado CTC» de la jornada se retira (el grado ya no se vota).

## [V5.21] — 2026-08-21 (commit 6a4af47)

- **Corregido**: dos afinados del owner sobre el B2/B3 recién rediseñado. **B2 pierde el bloque
  «Notas de Análisis & Referencia Q-Grader»** (notas de laboratorio y campos del Q-Grader no son
  del reporte del productor — la referencia vive en «Solicitar oficialización», al pie de la Ficha;
  los campos quedan en el tipo por los datasheets guardados). **B3 muestra SIEMPRE sus números**:
  factor (75–120), almendra total (150–245 g) y densidad en verde (600–1000 g/L) a la vista sin
  marcar nada, y las humedades opcionales debajo — la casilla «Solo sé información básica» queda
  solo como declaración de que no habrá soportes (la regla de completar no cambia). Las notas del
  productor alimentan ahora `ficha_notas_cata` vía `cupping_profile` cuando el campo legado viene
  vacío.

## [V5.20] — 2026-08-21 (commit 5e12b04)

- **Hito**: **B2 y B3 de la Ficha se vuelven «Reportado por Productor»** (instrucciones del owner
  sobre el panel nuevo). El productor ya no digita los 10 atributos SCA ni la granulometría malla a
  malla: **B2** pide «No lo sé» O su estimación — puntaje (0–100) + escala **SCA/CVA** + notas — y/o
  sus soportes; **B3** pide «Solo sé información básica» — Factor de Rendimiento (**75–120**) y/o
  Almendra Total (**150–245 g**; AT = 205 g − cisco) con Densidad en Verde (**600–1000 g/L**)
  OBLIGATORIA — o al menos un soporte, con bloque opcional de Humedad en Pergamino / Humedad en
  Verde / Densidad. Ambas pantallas llevan la explicación grande y B2 sus dos bocetos (red de araña
  + rueda de sabores). Los datasheets viejos siguen contando como completos (los campos legados
  quedan en el tipo y en las compuertas).
- **Añadido**: **soportes por sección** — hasta **7 PDFs y 7 fotos** en B2 y en B3, subidos directo
  a Storage con la convención kaffetalMedia y referenciados en el datasheet; con validación de tipo,
  tope aplicado y **re-descarga garantizada incluso con la sección bloqueada** (anclas firmadas
  bajo demanda, que un fieldset disabled no apaga). Son el insumo del seguimiento acordado: el
  escáner visual del OCP que extraerá los datos y compilará el SET de Fichas Técnicas del lote (una
  oficial), listadas en esos mismos panes al existir.
- **Corregido**: **arrastrar un archivo ya no pinta el cursor prohibido** — los inputs de archivo
  (Información general, Finca, certificados, A3, B4 y los soportes nuevos) son ahora destinos de
  arrastre reales (`FileDrop`: dragover + drop al mismo manejador).
- **Cambiado**: la **barra de módulos va ARRIBA en escritorio** (pegajosa bajo la cabecera) y sigue
  fija abajo en el móvil; menos aire entre bloques en todas las pestañas; y el botón **«Mi red»
  sale de la cabecera del panel** — el salto entre plataformas vive en el Ecosistema de Valor. El
  puntaje reportado de B2 alimenta `ficha_puntaje_estimado`; la vista final de la Ficha muestra el
  reporte del productor (puntaje + escala + soportes + almendra/densidad/humedades) cuando no hay
  datos del formato viejo.
- **Docs**: guardián nuevo `scripts/qa-reportado-productor-check.mjs` (40: campos nuevos y legados,
  compuertas y rangos, tope de 7, la re-descarga por ancla, los bocetos, y FileDrop en los cuatro
  formularios).

> **Wrap V39** (2026-08-21): ciclo compilado en `Documentacion_Interactiva_V39.0(5c128cf).html` —
> 39 nodos · 133 fichas (+5) · 49 trazas (+1) · 91 wires · 309 ANN · FILETREE 1827. Compila
> V5.16–V5.20, los pendientes V5.1 y notas compactas de V5.2–V5.15 (deuda declarada en Log V39).

## [V5.19] — 2026-08-21 (commit 3302cf3)

- **Hito**: **el galardón nace del puntaje; la Arena es la vitrina.** Cierra el plan V5.16→V5.19:
  la Arena queda re-gateada como la **gala post-galardón de la temporada**, exclusiva de
  **Blue/Gold/Tyrian con contrato abierto** (`showcaseGate`): se INVITA (`inviteLotToArena`,
  nueva cola «Elegibles para la vitrina» en `/ocp/arena`), se bloquea en sesión sin tocar jamás
  `lots.grade/stage`, y `finalizeJornada` registra el **podio** (arena_scores + planillas
  `bcp_arena` que enriquecen el promedio oficial + nota al productor) sin gradar, sin crear
  contratos ni negociaciones y sin repartir membresías.
- **Corregido**: dos residuos del modelo viejo que habrían corrompido lotes nuevos — «Confirmar
  recibido» en `/ocp/lotes` ya no empuja el stage a `fila_arena` (confirma la muestra y avanza la
  inscripción `postulacion → fila`, como Nominados), y `deleteArenaSession` ya no revierte un
  `galardonado` a `apto` sin grado (el galardón lo escribió el bache, no la sesión que se borra —
  solo los stages legados `fila_arena`/`evaluado` se revierten).
- **Cambiado**: la landing de KR cuenta la historia nueva en los tres idiomas — la Arena pasa de
  «El tiquete de entrada» a **«La vitrina de la temporada»** (todo lote se evalúa a ciegas con un
  Q-Grader certificado; la gala es de los mejores ya galardonados y con contrato), «Por qué
  inscribirse» habla de solicitar la evaluación, la oportunidad cita la catación del Q-Grader y el
  índice anuncia «La vitrina en vivo de los mejores». El productor ve los estados de la vitrina
  (invitado · sesión confirmada · compitió) dentro de Lotes Galardonados.
- **Docs**: **barrido de HANDOFF** — el flujo de negocio central reescrito al modelo V5.16–V5.19,
  banner V5.17–V5.19 sobre «The Arena pipeline» (manda sobre el histórico), correcciones fechadas
  en las viñetas de la tarifa y del Club, y el módulo del productor apuntando a «Evaluar mi Café».
  `qa-evaluaciones-check.mjs` gana la sección de la vitrina (42 comprobaciones) y
  `qa-ofertas-check.mjs` afina su aserción (SELECT sí, INSERT jamás).

## [V5.18] — 2026-08-21 (commit 69f2311)

- **Hito**: **el contrato nace de la aceptación del productor.** Nace el circuito de OFERTAS:
  CTCx confirma el trato desde el OCP (`/ocp/ofertas`, pestaña nueva del Catálogo) referenciando la
  combinación **Grado + Puntaje + Variedad + Proceso congelada como snapshot**, y el productor lo
  acepta o rechaza desde su panel — aceptar crea el `purchase_contract` (pendiente de la firma de
  CTC, que conserva su `signContract` y su escalera de liberación); rechazar cierra sin compromiso.
  El contrato automático que el galardón creaba desde 2026-07-17 queda retirado. Fase 3 de 4 del
  plan V5.16→V5.19.
- **Añadido**: la pestaña **«Contratos y Compras» real, en cuatro secciones** (mockups del owner):
  *Ofertas de Temporada* (galardonados Red o superior, de esta temporada o la pasada), *Contratos
  de Temporada* (el mes a mes de la ventana de venta; un **lote de la temporada pasada se posiciona
  pero SE VE como tal** — el encuadre viaja congelado en la oferta), *Ofertas Black* (la compra
  directa que sale de la negociación Black) y **Subastas Tyrian** — «el podio de los mejores, al
  mejor postor»: el Tyrian va rumbo a subasta, CTC corre la puja fuera y registra el mejor postor
  como oferta que el productor decide. En el OCP: colas de elegibles por clase, abiertas con
  retiro, historial de respuestas.
- **Cambiado**: `recordEvaluationVerdict` ya no inserta contratos (red/blue/gold y tyrian aparecen
  en las colas de Ofertas); `decideBlackNegotiation('comprar')` **emite la oferta Black** (precio
  acordado obligatorio) en vez de crear el contrato; el gate del Club en `signContract` corrige su
  mensaje (la membresía llega con el galardón). Regla de temporada con `seasonKey` (Mitaca antes
  que Principal): más vieja que la pasada, rechazo duro al emitir.
- **Datos**: tabla **`lot_offers`** (kind `temporada|black|subasta`, status
  `emitida|aceptada|rechazada|retirada|expirada`, snapshots, encuadre de temporada congelado,
  índice único parcial de UNA oferta abierta por lote — probado con rollback en producción), RLS
  select-own y escrituras solo por service role; columna **`purchase_contracts.season_id`**
  (temporada de VENTA, heredada de la oferta — no derivada del registro del lote, a propósito).
- **Docs**: guardián nuevo `scripts/qa-ofertas-check.mjs` (máquina de estados, elegibilidad por
  clase, ventana de dos temporadas, propiedad del productor, y que el contrato no nazca en ningún
  otro sitio).

## [V5.17] — 2026-08-21 (commit 5adb30e)

- **Hito**: **el galardón nace del bache — el Q-Grader escribe el grado, y el puntaje manda.** El
  veredicto de la evaluación (`recordEvaluationVerdict`, ex-`recordSondeoResult`) es ahora EL
  escritor del grado: exige una planilla B2/B3 con puntaje SCA, lo pasa por `redondeaPuntaje`,
  **deriva el Grado CTC con `gradoPorPuntaje()`** (nadie digita un grado — la puerta que
  `definicion.ts` §«la jornada de Arena» pedía cerrar), inserta la planilla como evaluación oficial
  y saca el lote **galardonado sin pisar una sesión de Arena**. La sesión de Arena deja de ser el
  paso obligatorio del proceso (su re-gate como vitrina de Blue/Gold/Tyrian llega en V5.19).
  Fase 2 de 4 del plan V5.16→V5.19.
- **Añadido**: la pestaña **«Evaluar mi Café» real, en tres secciones** (mockups del owner):
  *Solicitudes de Evaluación* (lotes Aptos: solicitar, pagar, despachar la muestra), *Evaluaciones
  en Fila* (muestra y pago confirmados, esperando bache/Q-Grader; el «no superó» con su cashback y
  mejoras vive aquí) y *Lotes Galardonados* (el sello del grado, el puntaje, el certificado EUDR y
  el feedback del Q-Grader). El OCP previsualiza el grado derivado antes de firmar («Puntaje 86.5 →
  Gold») y el bache gana su campo **Q-Grader** — su nombre firma la planilla oficial.
- **Cambiado**: la **membresía del Kaffetal Club llega con el Galardón** (una sola función,
  `grantClubMembershipOnce` en `src/lib/arena/club.ts`); `finalizeJornada` ya no la reparte. La
  escalera canónica del lote es **FT·FT2·EUDR·VID → EVA → MUE·SON → GAL → ARE** (ARE al final,
  opcional — la vitrina); el stepper, las etiquetas de etapa («En fila de evaluación»), los avisos
  al productor y el copy de solicitar («Solicitar evaluación», `EVALUATION_FEE_COP`) hablan el
  idioma nuevo. `isLotCommitted` mira también la inscripción (un lote puede galardonarse sin pisar
  `fila_arena`, y el espejo por stage solo cubría la mitad de la delete-RLS).
- **Datos**: fase terminal **`galardonado`** en el CHECK de `arena_inscriptions.phase`; columna
  `sondeo_batches.q_grader_name`; valor **`q_grader_batch`** en el enum `evaluation_source` — la
  procedencia visible en la Ficha dice «Evaluación CTC · Q-Grader en bache», no se disfraza de
  Arena. El trigger M3 (muestra solo con inscripción y en `apto`) NO cambió, a propósito.
- **Docs**: guardián nuevo `scripts/qa-evaluaciones-check.mjs` (la firma del veredicto no acepta
  grados, la procedencia propia, el Club en un solo sitio, las tres secciones, GAL antes que ARE);
  banner V5.17 sobre la sección «The Arena pipeline» del HANDOFF (barrido completo en V5.19).

## [V5.16] — 2026-08-21 (commit c2fc0a1)

- **Hito**: **el panel del productor se rehace en CINCO interfaces** detrás de una barra de
  navegación inferior fija — Mensajes · Ecosistema · **Mi Perfil** (al centro) · Evaluaciones ·
  Contratos — según los mockups del owner (bloque B del review V5.0, ítems B3/B4: el panel se
  rehace ANTES de recorrer el bloque). La rejilla de doce tarjetas y los dos FABs flotantes se
  retiran; cada interfaz vive en `src/components/kaffetal-regal/panel/` y `AppDashboard` queda como
  cascarón. Fase 1 de 4 del plan V5.16→V5.19 (la escalera de etapas, las ofertas/subastas y la
  Arena-vitrina llegan en las siguientes).
- **Añadido**: **Mi Perfil** — Información general + Mis Fincas + Mis Lotes como carruseles (lo
  nuevo empuja lo viejo a la derecha); la flecha de cada sección abre la lista completa con filtros
  (Visa EUDR para fincas, etapa para lotes). **Ecosistema de Valor** — las plataformas de la red
  como tarjetas que VOLTEAN: Directorio, Herramientas y Coffeed abren su plataforma; CTC Tech y
  Varietales abren su solicitud especializada aquí mismo; Terratalento va en gris («En
  desarrollo») y solo registra interés. **Mensajes y Notificaciones** — reemplaza a
  «Retroalimentación y ayuda» y absorbe «Mis solicitudes»: una sola bandeja con dos filtros, la
  partición sigue siendo por CAMPO (`panel/mensajes.ts`, `partirFeed`). La barra inferior lleva la
  insignia de notas sin leer.
- **Cambiado**: el contrato `?m=<módulo>` (V4.34) por fin se LEE: cada clave de la rejilla vieja
  aterriza en su pestaña nueva (`LEGACY_MODULE_TO_TAB`), con el drill abierto para `fincas`/`lotes`
  — los enlaces de vuelta de la concha de herramientas y los marcadores viejos siguen funcionando.
  El botón «Atrás» del teléfono: el drill cuenta como capa de historial; cambiar de pestaña no.
- **Retirado**: los dos FABs (`SideModuleFabs`), el `ToolPanel` embebido con su `KR_TOOL_COPY` y
  «Solicitar Plus» (decisión del owner: la tarjeta de Herramientas ABRE la plataforma y el Plus se
  administra allá), y el módulo de Jornadas de Recolecta (Terratalento queda en gris hasta su
  lanzamiento; su lado ECP no se toca). Evaluaciones y Contratos son por ahora TRASPLANTES de los
  módulos Arena+Certificación y Mis contratos — se reconstruyen en V5.17/V5.18.
- **Docs**: guardián nuevo `scripts/qa-kr-panel-check.mjs` (las 5 pestañas, el mapa `?m=`, la pila
  de «Atrás», los FABs fuera, y la trampa V4.30 de los CSS modules en los 8 archivos del panel);
  `qa-solicitudes-kr-check.mjs` re-apuntado a `panel/mensajes.ts`/`MensajesTab`.

---

## [V5.15] — 2026-08-20 (commit c64beb6)

- **Cambiado**: el **Estándar CTC de Almacenamiento de Pergamino es bilingüe en TODAS las
  superficies** (owner: «en ambos idiomas, y en los formularios de KR sobre todo en español»). La
  V5.14 lo tradujo solo en el formulario del productor; quedaban en inglés puro el editor EUDR del
  OCP (tres sitios), el Expediente EUDR de la finca y el Certificado EUDR del lote. Ahora todos
  dicen «Estándar CTC de Almacenamiento de Pergamino · CTC Parchment Storage Standard» — el
  español dice qué es, el inglés es el nombre registrado con el que el documento viaja a Europa. En
  el formulario de KR el inglés queda en pequeño y entre paréntesis: ahí el que lee es el
  caficultor.
- **Docs**: verificación de la V5.14 contra las filas REALES de producción, ejecutando
  `fincaEudrStatus`/`lotEudrStatus` de verdad sobre las cinco fincas y los cuatro lotes: las dos
  fincas aprobadas con expediente remitido siguen «Visa vigente» (cero regresión); **Palmas — el
  caso exacto del reporte — pasa de la falsa «Visa vigente» a «Visa en revisión por CTC» con su
  botón Aprobar habilitado**, y su lote deja de decir «Sello listo». Las dos incompletas siguen
  «Visa en trámite», que es del productor.

---

## [V5.14] — 2026-08-20 (commit 7e11014)

- **Hito**: primera tanda de la revisión de **Kaffetal Regal y el OCP que lo administra**, sobre
  retroalimentación del owner con capturas de un teléfono real. Catorce puntos, y tres de los
  reportados resultaron ser **síntomas de un mismo defecto**.
- **Corregido**: **la Visa EUDR se afirmaba sola.** `fincaEudrStatus()` derivaba la Visa ÚNICAMENTE
  de lo que contestaba el productor y **no leía `fincas.status` en ninguna parte**. De ese único
  agujero salían los tres síntomas reportados: la finca decía «Visa vigente» **antes** de que el OCP
  la aprobara; aprobarla no cambiaba nada visible; y **«Rechazar» parecía no hacer nada** —sí escribe
  el estado rechazado y su fila de auditoría, pero nadie miraba ese campo—. Ahora la función se parte
  en dos: `fincaEudrDeclaracion()` juzga el expediente del productor (y es lo que gatea
  `approveFinca`, o haría falta estar aprobada para poder aprobarla) y `fincaEudrStatus()` le aplica
  encima el veredicto: **en revisión → aprobada · expediente sin remitir → vigente**, y **rechazada**
  cuando lo está. El Sello del lote hereda los estados nuevos, así que un lote deja de tener «Sello
  listo» con su finca sin aprobar. Sin migración: `status` y `eudr_cert_shared` ya viajaban al
  cliente, y las dos fincas aprobadas de producción ya tenían el expediente remitido.
- **Corregido**: **la FT2 no tenía ningún impasse — tenía un botón tapado.** Los FABs («Ayuda» y
  «Guardar Ficha») estaban `position:fixed` en la esquina inferior derecha del viewport, que es
  exactamente donde la barra pegajosa pone «Completar FT2 y continuar». En un teléfono se posaban
  encima: se tocaba el FAB creyendo tocar el botón y la etapa no avanzaba nunca. Ahora la botonera va
  **anclada a la barra** (`absolute` contra el `sticky` en la Ficha, `sticky` al pie del pop-up en
  Finca) y se apila en vertical, como manda la casa. Ninguna altura de barra puede volver a
  solaparla.
- **Corregido**: la fila de acciones no podía envolver, así que en 375 px el botón que se salía por
  la derecha era el principal. Ahora envuelve, y por debajo de 520 px se apila a lo ancho.
- **Corregido**: **la granulometría solo sabía avisar de un lado.** Como el Residuo absorbe la
  diferencia, la suma daba «100,0 %» siempre que las mallas pesaran de MENOS: pesar una de seis y
  olvidar las otras cinco salía impecable, con un Residuo del 75 % que nadie leía como error. El
  veredicto ahora distingue **se pasó** (y en cuántos gramos), **faltan mallas por pesar** (y cuántos
  gramos quedan sin repartir) y **cuadra**. Se añade además la instrucción que faltaba: tamizar el
  grano sano, y que el Residuo no se teclea.
- **Añadido**: en B3, **el factor de rendimiento del propio productor**, opcional, junto al
  calculado. El campo existía pero enterrado en B1, otra sub-etapa: aquí, donde el número se calcula
  delante de él, ya puede decir «a mí me dio otro». No toca el cálculo; los dos viajan a CTC.
- **Añadido**: **«📍 Estoy aquí»** en el mapa de la finca. Quien está parado en la mitad de su predio
  no debería tener que encontrarse a sí mismo en un satélite arrastrando con el dedo. Un mensaje
  distinto por cada causa de fallo (permiso denegado · GPS lento · error), porque «no se pudo» no le
  dice a nadie qué hacer.
- **Añadido**: en A3, el **atajo del puntaje**. Quien adjunta ahí una foto de su hoja de catación
  suele ponerse después a teclear los diez atributos SCA a mano. El camino corto ya existía en B2
  («Solicitar oficialización», con adjunto, que aterriza en la cola del BCP) pero no lo descubría
  nadie: ahora aparece la señal, con su botón, en cuanto hay un adjunto.
- **Cambiado**: **el aviso de compuerta dice QUÉ falta y DÓNDE.** Recitaba la etapa entera —«Complete
  A3, A4, B2 y B3»— aunque solo faltara una cosa, y había que abrir las cuatro para averiguar cuál.
  Ahora lista solo lo que falta, con el índice del pane y el dato concreto («B3 · Física ·
  Granulometría → el Trillado Verde Restante»), y dura 9 s en vez de 3,2 porque ahora hay algo que
  leer.
- **Cambiado**: **«Solicitar revisión de datos» deja de abrir el correo.** Un `mailto:` sacaba al
  productor de la plataforma para pedir algo sobre la plataforma: la petición caía en una bandeja
  suelta, sin quedar atada a la finca ni aparecer en «Retroalimentación y ayuda» —y en el teléfono de
  un caficultor a menudo no abre nada—. Ahora va por el **canal interno** (`producer_comm_log`), con
  la finca como contexto.
- **Cambiado**: en «Retroalimentación y ayuda» el productor se llama **por su nombre** en sus propios
  mensajes, no «Usted» —que es como le habla CTC a él, no como se nombra él—.
- **Cambiado**: el **riesgo del producto del cuestionario EUDR se pregunta al derecho**. Pedirle al
  caficultor que marque lo malo de su propio café se lee como una acusación, y era la única casilla
  de la pantalla que EMPEORA su perfil al marcarla. Ahora marca lo que **sí** cumple. Es un cambio de
  redacción, no de datos: se sigue guardando la lista de factores negativos, así que ninguna finca ya
  registrada cambia de significado.
- **Cambiado**: el **Estándar CTC de Almacenamiento de Pergamino** se dice en español, con el nombre
  registrado en inglés entre paréntesis —viaja así en el expediente y en el certificado del lote, que
  los lee un comprador europeo—.
- **Cambiado**: **el bucle de la portada de KR sube de `.32` a `.50`** y el velo se aligera. Segunda
  vez que el owner pide lo mismo («apenas se ve que hay algo detrás»); la subida del 14 de agosto se
  quedó corta. Medido contra el fotograma **BLANCO** del bucle, como exige el comentario que dejó
  aquella: la columna del titular cae en ~rgb(32,49,40), que contra el marfil del h1 da **12,4:1** en
  escritorio y **8,2:1** en el peor punto del móvil (la AA pide 4,5; la AAA, 7).
- **Cambiado**: **objetivos táctiles para dedos de caficultor**. `.btn-sm` medía 31 px de alto y las
  casillas 13 px, muy por debajo de los 44 px de la WCAG 2.2. La compuerta es `pointer:coarse`, no el
  ancho de pantalla: lo que decide es con qué se toca. El OCP en portátil no engorda un píxel.
- **Cambiado**: **los pop-up de revisión del OCP dejan de ser estrechos**. Heredaban los 560 px de un
  formulario de contacto, subidos a mano a 680/720 con un `style` en línea. Un expediente de finca en
  720 px de un portátil de 1440 obliga a desplazar dentro de una caja con media pantalla vacía al
  lado. Clase compartida `.modal-wide` = `min(1180px, 94vw)`.
- **Corregido**: el formulario de finca **se salía del pop-up por el ancho** —y lo que se sale por la
  derecha de una caja que solo desplaza en vertical no se puede alcanzar de ninguna forma—.
  `min-width:0` en las rejillas, pestañas que desplazan solas, y la tabla de mallas encerrada en su
  propio contenedor.
- **Corregido** *(ajeno a esta tanda, encontrado al pasar el gate)*: `qa-tools-seo` llevaba **rojo
  desde la V5.7**. `mapa-variedades` y la rueda del sabor cerraban su meta description con «Coffee
  Tools · CTC.» / «Herramientas del Café · CTC.» en vez del sufijo de la casa. Corregidas en el
  archivo y espejadas en la columna `meta_description`, que es lo que el guardián compara.
- **Docs**: **dos guardianes nuevos, los dos probados revirtiendo el arreglo** (cantan ese caso y
  solo ese). `qa-visa-check` (30 comprobaciones) fija que la Visa no se afirme sin veredicto, que
  Rechazar se vea, que aprobar siga siendo posible, y —el fallo mudo de verdad— que **todo el que
  arma un `FincaEudrFields` desde su propio SELECT traiga `status` y `eudr_cert_shared`**: sin esas
  columnas la compuerta de Arena habría cerrado el pago y el recibo de muestra de fincas ya
  aprobadas, sin un solo error en consola. `qa-kr-ficha-check` (212) fija que ningún FAB vuelva a ser
  `position:fixed`, que la fila de acciones envuelva, la aritmética de la granulometría en los dos
  sentidos, y que toda clase de CSS module usada EXISTA (la trampa de la V4.30: `.noteBox` se estrenó
  en esta tanda en una hoja donde no estaba definida).

---

## [V5.13] — 2026-08-20 (commit 10b0cfb)

- **Corregido**: el «Volver a CTC Web Platform» de `/recuperar-acceso?puerta=panel` aterrizaba en la
  **portada de CTC Home**, no en `/login`. `hrefPuerta()` recortaba la base de la superficie del
  camino —correcto en un subdominio, que ya la sirve y a quien el proxy se la vuelve a anteponer—
  pero el login maestro **no tiene subdominio propio**: recortarle `/login` de `/login` dejaba la URL
  desnuda. Ahora la rama se elige por si la ruta tiene subdominio, no por el camino. Detectado en la
  verificación en vivo de la V5.12.
- **Docs**: `qa-recuperacion-check` sube a **154** comprobaciones con la que faltaba, y que es la que
  de verdad importa: **simula la reescritura de `proxy.ts`** sobre cada URL de producción y exige que
  el resultado sea exactamente el camino de la puerta. La comprobación vieja —absoluta y de
  `ctcexport.com`— la pasaba el enlace roto sin despeinarse. Probada revirtiendo el arreglo: canta
  ese caso y solo ese.

---

## [V5.12] — 2026-08-20 (commit 0bfc6a1)

- **Hito**: **«Recuperar acceso» existe**. Hasta hoy la red tenía **siete puertas de entrada y cero
  formas de volver**: quien olvidaba su contraseña perdía la cuenta para siempre, salvo que un
  operador del BCP le emitiera una temporal a mano — y para un productor de Kaffetal Regal, un
  comprador de Cherry Picked, un experto del Directorio o un recolector de Terratalento no había ni
  eso. `grep resetPasswordForEmail` no devolvía una sola línea en todo el repo.
- **Añadido**: `/recuperar-acceso` — **UNA** superficie para las **once** puertas (las cinco
  plataformas públicas, los cinco nodos de socio y el login maestro). Se sirve desde la **raíz en
  todos los hosts** gracias a la lista `RAIZ_COMPARTIDA` nueva de `src/proxy.ts`; sin ella el
  subdominio le antepondría su base y daría 404 justo en la pantalla a la que llega quien ya no
  puede entrar. Segundo tramo en `/recuperar-acceso/[token]`, con las mismas reglas de contraseña
  que el cambio forzado del panel (ahora compartidas, no duplicadas).
- **Añadido**: el enlace «¿Olvidaste tu contraseña?» en **las siete puertas** — Kaffetal Regal,
  Cherry Picked (en sus tres idiomas), Directorio del Café, Terratalento, Herramientas del Café, los
  nodos de la Red de Socios y `/login`. Solo aparece al ENTRAR: en «Crear cuenta» no hay contraseña
  que olvidar.
- **Seguridad**: **la pantalla dice la verdad** (decisión del owner, 2026-08-20). Si el correo no
  existe se dice, si esa cuenta entra con Google se dice, y cada veredicto termina en una SALIDA
  —crear cuenta, botón de Google, escribir a CTC— en vez de en un callejón. Es una excepción
  deliberada a la regla de la casa de no confirmar qué cuentas existen: el usuario real de esta red
  es un caficultor que teclea mal su correo, y con el mensaje genérico de «si existe, te llegará»
  ese error queda invisible para siempre. La base ya traía el caso: `ete0109@yahoo.com` conviviendo
  con `etel0109@yahoo.com`.
- **Seguridad**: el vale es de un solo uso, se guarda **hasheado** (sha256 sobre 32 bytes de
  `randomBytes`), caduca en 60 minutos, tope de 3 por cuenta cada 15 minutos, y pedir uno nuevo
  quema los anteriores. Un envío que falla **anula el vale** en vez de reportar éxito — misma
  lección que el OTP del panel: dejar la fila viva quemaba un intento por un fallo que no era del
  usuario. Lo que viaja en la URL es `?puerta=<id>`, un identificador saneado contra la lista, nunca
  un destino: aceptar un `?volver=<url>` habría sido un redirect abierto **en la pantalla de
  recuperar la contraseña**.
- **Cambiado**: no se usa `supabase.auth.resetPasswordForEmail()`, y el porqué está escrito en
  `lib/auth/recuperacion.ts`. El suyo no sabe (1) que tres usuarios de la casa son etiquetas
  `@ctcexport.com` **sin buzón** y su enlace tiene que ir al `delivery_email` de
  `panel_users`/`partner_accounts` — mandárselo a su propio usuario los dejaría fuera para siempre
  sin que nada fallara de forma visible —, (2) que 8 de las 29 cuentas entran **solo con Google** y
  no hay contraseña que recuperar, y (3) responder si la cuenta existe. Y una cuarta, práctica: su
  enlace obliga a mantener una allowlist de redirecciones con 19 subdominios dentro.
- **Datos**: migraciones `password_reset_tokens` (el vale: RLS activa y **cero políticas**, patrón
  service-role de la casa) y `buscar_identidad_para_recuperacion` — una función `security definer`
  que resuelve el correo contra `auth.users` con un índice, en vez del `admin.listUsers()` que se
  traería la tabla entera. Con su `revoke` explícito a `public`/`anon`/`authenticated`: Postgres
  concede EXECUTE a PUBLIC por defecto, y sin él cualquiera con la clave anon podría preguntarle a
  la base por el estado de credencial de cualquier correo.
- **Corregido**: quien recupera con el correo **sin confirmar** queda confirmado de paso — abrir el
  enlace ES la prueba de posesión del buzón. Sin eso, la cuenta sin confirmar de la base recuperaría
  su contraseña y seguiría sin poder entrar. Y si venía de una temporal del BCP, el
  `must_change_password` se limpia: la persona acaba de elegir la suya.
- **Docs**: guardián nuevo `scripts/qa-recuperacion-check.mjs` (**143** comprobaciones), probado
  saboteando a propósito el enrutado al `delivery_email` para confirmar que canta.

---

## [V5.11] — 2026-08-20 (commit b73d73b)

- **Retirado**: el **GVG-Space** sale de la plataforma. Se extrajo el **CV App Manager** — sus once
  archivos de interfaz y sus nueve de lógica, unas 6.500 líneas — y se montó como servicio del
  **CommaaS Hub**, en `cv.commaas.cloud`. Era el último submodulo del espacio, así que el espacio se
  va con él: fuera el grupo owner-only del rail del BCP, la tarjeta del índice y el nodo del diagrama
  de estructura. Estaba previsto desde la decisión A8 del tablero del 2026-08-17.
- **Seguridad**: con la mudanza **desaparece el candado de contraseña del espacio** (la cookie HMAC
  de 12 h sobre `platform_settings.gvg_space_lock`). No se sustituye por otro candado: en CommaaS el
  permiso es un grant por persona, que se revoca sin cambiársela a nadie más y deja rastro de quién
  entró. Una contraseña compartida no podía hacer ninguna de las dos cosas.
- **Añadido**: `src/lib/panel/salidasDeLaPlataforma.ts` — la lista de los módulos que se **fueron**
  del edificio, hermana de `rutasMovidas.ts` y aparte de ella. Esa lista describe mudanzas ENTRE
  consolas y su guardián exige que el destino tenga página en este repo; aquí el destino es otro
  dominio. Dos talones 308 la usan: `/bcp/gvg/[[...resto]]` y `/ecp/gvg/[[...resto]]`. La regla F2
  sigue en pie — una URL vieja no muere, y la del ECP se REAPUNTA al destino final en vez de
  encadenarse contra el talón del BCP.
- **Cambiado**: `USOS.gvgMatch` y `USOS.gvgReporte` salen de `src/lib/ai/consumo.ts` (de siete vías
  de gasto a cinco) y `qa-consumo-check` deja de exigir el registro en los dos archivos que ya no
  existen. Las filas históricas de `ai_usage` conservan `gvg:match` y `gvg:reporte`, y el tablero de
  Consumo las sigue mostrando: un libro no se reescribe hacia atrás.
- **Datos**: **nada se borró**. Las siete tablas `public.gvg_*` (1 perfil, 18 experiencias, 7 rutas,
  4 muestras, 14 postulaciones, 56 eventos, 2 reportes) y los archivos de `kaffetal-media/gvg/…`
  siguen donde estaban. La copia al hub la hace `scripts/migrate-cv-from-ctc.mjs` de aquel repo, que
  tampoco borra el origen; dar de baja estas tablas es una decisión posterior del owner, cuando haya
  visto la app funcionando allá con sus datos.
- **Docs**: `docs/HANDOFF.md` — la sección del GVG-Space pasa de describir el módulo a describir su
  salida: qué queda aquí, qué cambió al mudarse (el candado, las tablas de una sola fila que ganaron
  `user_id`, el fin del `service_role`, el nombre que salió del código) y qué lecciones sobrevivieron
  intactas en el otro repo.

## [V5.10] — 2026-08-20 (commit 23fd5d6)

- **Añadido**: **«Regenerar»** en Redacción — la primera generación real falló por credenciales y
  la noticia quedaba `elegida` sin forma de reintentarla. Rehace la entrega **solo mientras siga
  esperando luz verde**: lo aceptado o publicado no se reescribe por detrás, porque ya es contenido
  que alguien aprobó.
- **Cambiado** (disciplina de coste, palabra del owner: «use smaller models and avoid work that can
  be done programmatically»): el redactor pasa a **Haiku** (`MODELO_REDACTOR = MODEL_CHEAP`) —
  ~$0.005 por capítulo frente a ~$0.010 con Sonnet, que además sube a ~$0.016 el 1 de septiembre
  cuando caduca su precio de lanzamiento. Escribir 7 paneles a partir de un titular no es una tarea
  de razonamiento. Subir de modelo sigue siendo cambiar UNA constante.
- **Cambiado**: el techo de salida baja de **2200 a 1400** tokens — un cap generoso no es una red de
  seguridad, es divagación pagada.
- **Cambiado**: la **portada de Gemini es opcional y explícita** (casilla «Con portada · lo más
  caro», encendida por defecto pero a un clic de apagarse). Lo caro se pide, no se da por hecho.
- **Docs**: `docs/CLAVES_IA_Y_COSTE.md` — dónde va cada clave, **cómo distinguir «falta la clave»
  de «la clave está revocada»** por el aviso que viaja con la entrega, el coste medido de cada paso,
  y dónde se iba el dinero de verdad: el **barrido agéntico** del Estudio (`webSearch: 5` × 14
  medios = hasta 70 búsquedas facturadas por vuelta), que la ingesta por RSS de la V5.9 ya
  reemplaza por **$0**.
- **Cambiado**: `qa-redaccion-check` 31 → **41** — el modelo barato en el import (el comentario sí
  lo nombra, para explicar cómo escalar), el cap ajustado, la portada opcional, el rehacer que se
  niega sobre lo aprobado, y que la ingesta no llame a ningún modelo.

## [V5.9] — 2026-08-20 (commit d33b187)

- **Hito** (A12, arranca el bloque Coffeed de la revisión V5.0): nace **Redacción** — el módulo del
  ECP **entre Entregas y Muro**, donde el owner lo señaló. Cierra el pendiente que el spec dejó
  escrito («falta el barrido automático»): el muro deja de depender de posts puestos a mano.
- **Añadido**: la **bandeja de noticias** — los feeds de la lista blanca (los mismos que alimentan
  el ticker de la portada) entran solos, por tandas y con dedupe por URL; al abrir el módulo, si el
  último refresco pasa de 6 h, se refresca solo. Ventana de 14 días; solo piezas con fecha.
- **Datos**: **cuatro medios colombianos** (owner): El Tiempo · Economía, El Espectador, La
  República · Globoeconomía y Agronegocios — feeds VERIFICADOS en vivo antes de insertarlos, y con
  **filtro de café** (`coffeed_sources.keywords`, comparación sin tildes): sin él, la bandeja sería
  la portada de un diario. Perfect Daily Grind ganó el feed que le faltaba. El ticker hereda los
  medios nuevos por leer la misma lista.
- **Añadido**: elegir una noticia dispara el **generador**: Claude (MODEL_WRITE, libro de consumo)
  escribe el capítulo **elaborado** — 7 paneles con papeles (apertura → contexto → desarrollo →
  implicación → mirada CTC → cierre), cada uno 2-4 frases COMPLETAS que se entienden solas: la
  respuesta directa al «too simple and almost not understandable» del owner — y **Gemini** pinta la
  portada (4:5, sin texto). La entrega nace **«entregado»** en la cola de Entregas: producir es del
  taller (aunque el taller sea automático); la luz verde y el publicar siguen siendo de la consola.
- **Añadido**: `coffeed.redaccion.post_creado` → `integration_events` (ventas_marketing) — el
  gancho para el escenario de Make que el owner cuelgue (compartir a Instagram, avisos…).
- **Añadido**: el sobre polimórfico aprende **`kind: noticia`** de punta a punta — la cola de
  Entregas la previsualiza con su portada, su fuente y el AVISO del generador (si salió el
  borrador determinista, quien da luz verde lo sabe), y el muro la pinta con la tira de paneles
  del carrusel + la fuente citada al pie: la trazabilidad es la premisa de Coffeed también aquí.
- **Cambiado**: la bandeja se hojea en **Cover Flow** (las constantes de Cool PDF, como en el
  taller de Herramientas); las portadas son papel de exportación — medio, titular en serifa,
  fecha. Sin IA ni Gemini el módulo sigue operable: borrador determinista y entrega sin portada,
  ambos avisando.
- **Añadido**: guardián `qa-redaccion-check.mjs` (**31**) — el filtro de café EJECUTADO con casos
  reales, el dedupe upsert-ignore, el contrato del `saltar` por id (un medio caído encabezaría
  cada tanda para siempre), el orden Entregas → Redacción → Muro, y el fallback sin claves.

## [V5.8] — 2026-08-20 (commit c3ebfbe)

- **Cambiado** (owner, con la referencia en la mano): el taller pasa a **Cover Flow** — la mecánica
  de `RENDER.flow` de **Cool PDF**, transplantada con sus constantes exactas (rotateY 54°, z −170,
  escala −.14, brightness −.38, `perspective:1500px`). Se conduce con arrastre, rueda horizontal,
  flechas y teclado; la portada del centro tiene su ficha debajo, con la salida. Las carátulas que
  volteaban de la V5.7 se retiran: no eran lo que se pidió.
- **Cambiado** (owner): **dos estantes** — «Tus herramientas» arriba y **«Herramientas Plus»** en su
  propio Cover Flow debajo. El reparto es por NIVEL, no por si la cuenta lo abre: una Plus activa
  sigue siendo Plus, y verla en su estante con el sello **ACTIVA** era justo lo que faltaba.
- **Añadido** (owner): **«Obtener Herramientas Plus»** arriba del taller — explica qué es el nivel
  Plus y, en un SEGUNDO gesto, manda la solicitud. No inventa tabla: crea una fila de
  `tool_access_requests` por cada Plus que la cuenta no abre (la misma cola del ECP, el mismo
  conceder deliberado), avisa por correo y nunca pide lo que ya se tiene.
- **Cambiado** (owner, con captura): abrir una herramienta mostraba **CUATRO filas** antes del
  contenido. Ahora es **UNA cinta de 38px** — logotipo, nombre, «Volver a Herramientas» y una
  **rueda dentada**. Dentro de la rueda: Mis trabajos, todas las herramientas, **Mi Red**, la
  cuenta y la salida. La concha ya no repite su cabecera en pantalla completa y la línea de sesión
  se queda en el nombre del trabajo y su estado de guardado.
- **Añadido** (owner): **«Mi Red»** en la rueda — Directorio del Café y Coffeed siempre; Kaffetal
  Regal **o** Cherry Picked según lo que la cuenta ya sea. Si todavía no es ninguna de las dos, no
  se nombra ninguna: ofrecer las dos sería empujar a elegir, y la exclusión productor ⊕ comprador
  es de la matriz, no de un menú.
- **Añadido** (owner): el **logotipo de la superficie** corona la puerta de acceso y preside el
  hero de la landing (el rótulo de texto que hacía de marca sobra con él delante).
- **Cambiado**: `qa-taller-check` 49 → **65** — las constantes de Cool PDF, los dos estantes, la
  rueda y su evento, la cinta sin cabecera repetida, el Plus que explica antes de pedir y los dos
  logotipos.

## [V5.7] — 2026-08-20 (commit efd3633)

- **Cambiado** (owner): el taller deja la lista por **CARÁTULAS que voltean** — la captura es la
  portada; tocarla gira la tarjeta (rotateY, la mecánica del Sneak Peek) y el reverso trae el
  detalle y las salidas. Tocar-para-mirar y tocar-para-abrir son dos gestos distintos a propósito.
- **Corregido** (owner: «tenía Plus y nada me lo decía»): el estado Plus se dice **con todas las
  letras** — arriba del taller («Plus ACTIVO en tu cuenta: abres N de M») y en el reverso de cada
  carátula («Plus · ACTIVA en tu cuenta» / «se activa por solicitud»). La cuenta del owner abre
  Plus por la activación heredada de la red y ahora la pantalla lo celebra.
- **Añadido** (owner): dos altas desde `reference_html_tools` — **la rueda del sabor V23** entra
  como versión 2 publicada de `catacion`, y **Coffee Varieties Map** (V18) como herramienta nueva
  (`mapa-variedades`, en, default, KR/CP/web). Ambas con puente, guía, captura y espejo SEO.
- **Añadido**: el Home Menu gana sustancia — cada trabajo lista su **resumen** (línea derivada del
  estado que el puente manda al guardar; `CTC.usarResumen` para afinarla) y un **acordeón**
  «¿Qué es esta herramienta y cómo funciona?», CERRADO por defecto, con la **guía** nueva de cada
  herramienta (columna `tools.guia`, editable en la ficha del ECP; escritas las 13).
- **Añadido**: `qa-tools-puente-conformance.mjs` (playwright) — la revisión herramienta por
  herramienta que pidió el owner: ready, captura del centinela y restauración tras recarga.
  **12/12 en orden**: 8 con el circuito completo (captura+resumen+restaura) y 4 SIN-CAMPOS
  anotadas (narrativas/lienzo: agtron, cool-pdf, formula-calidad, viaje-cafe — su memoria útil
  llegará por `CTC.usarEstado`). El arnés pagó dos trampas: un goto lento que navegaba a mitad de
  prueba, y el centinela de texto que un `input[type=number]` sanea a «» sin fallar.
- **Datos**: `tool_sessions.resumen` y `tools.guia` (aditivas). `qa-taller` 43 → **49**;
  `qa-tools-seo-espejo` 74/74 con las dos altas espejadas.
- **Docs**: el trabajo pasa al árbol real `C:\dev\ctc-platforms\ctc-platform` (el clon de
  OneDrive queda retirado).

## [V5.6] — 2026-08-19 (commit fcbb85b)

- **Añadido** (segunda pasada del owner sobre el taller, probado en producción): la **barra del
  taller** — marca, «Mis herramientas», el correo de la sesión y **Salir**. El botón avisa que
  salir cierra la identidad única en toda la red (la cookie es una sola — es la otra cara de
  entrar una sola vez).
- **Cambiado**: **pantalla completa en las tres superficies** — la página de una herramienta deja
  la columna de 1180px: la concha llena la ventana (100dvh), la cabecera se aprieta a una línea y
  el marco se queda con todo el alto. Vale para el taller, Kaffetal Regal y Cherry Picked.
- **Cambiado**: el taller enseña **las mismas capturas del carrusel** en sus tarjetas
  (`CapturaMiniatura`, con la misma caída a logo si falta el archivo).
- **Cambiado**: **el puente va en las ONCE herramientas vivas** (antes solo costo-empaque) y
  `soporta_memoria` queda encendida para todas — la archivada se queda fuera: retirada es
  retirada. En las herramientas sin campos que serializar (el disco Agtron, el viaje) el trabajo
  guarda poco, pero el menú y el nombre valen igual; `CTC.usarEstado` queda para cuando quieran
  guardar su estado propio.
- **Cambiado** (el contraparte del panel): el registro del ECP gana la columna **«Memoria»** al
  lado de Nivel — el estado del puente se ve de un vistazo, sin abrir cada ficha (la casilla para
  cambiarla ya estaba desde V5.4).
- **Cambiado**: `qa-taller-check` 29 → **43** — las once herramientas con puente, la salida en la
  barra, la pantalla completa en las tres superficies y las capturas del taller.

## [V5.5] — 2026-08-19 (commit cc954f3)

- **Añadido** (A8b, pregunta del owner al probar la puerta): **«Entrar con Google»** en
  `/herramientas/acceso` — el séptimo callback de la casa
  (`/herramientas/auth/callback`, patrón de KR/Directorio). El callback **no promueve
  roles**: entrar por Herramientas solo identifica; una cuenta nueva queda en el default
  inerte y el taller le explica las tres puertas de la membresía.
- **Docs**: la URL completa del callback debe estar en la allowlist de Supabase
  (Authentication → URL Configuration → Redirect URLs):
  `https://herramientas.ctcexport.com/herramientas/auth/callback`. Si falta, Google
  completa igual pero aterriza en el Site URL CON sesión (la cookie es compartida) —
  degradado, no roto.
- **Cambiado**: `qa-taller-check` aprende el camino Google (25 → 29).

## [V5.4] — 2026-08-19 (commit b7baa12)

- **Hito** (A8–A11): **Herramientas del Café se convierte en una aplicación semi-independiente**
  — el owner lo pidió así en la revisión V5.0: subir versiones y apps nuevas continuamente,
  conectadas a base de datos para que los usuarios conserven su trabajo, y capaces de empujar
  información al resto del ecosistema. Documento de referencia: `docs/HERRAMIENTAS_TALLER.md`.
- **Cambiado** (A8): la landing **ya no abre herramientas** — enseña un **carrusel de capturas
  reales** (cinta rAF como el Sneak Peek: velocidad sin saltos, pausa al pasar, respeta
  `prefers-reduced-motion`) con nombre y descripción, y manda al taller. Capturas por
  `scripts/build-tool-shots.mjs` (playwright, devDependency; 11/11 generadas y comiteadas — el
  modelo de las tarjetas OG). Una herramienta sin captura cae a tarjeta de texto, no a un hueco.
- **Añadido** (A8): la **puerta** `/herramientas/acceso` — la identidad única de la red: entra la
  misma cuenta de Kaffetal Regal, Cherry Picked **o el Directorio del Café** (la membresía ganó
  la tercera puerta en `accesoHerramienta.ts` / `matriz.ts`; la cookie ya viajaba entre
  subdominios). Sin registro aparte; con sesión, la puerta ni se ve.
- **Añadido** (A9): el **taller** `/herramientas/taller` — todo el catálogo compartible con el
  estado a la vista: una Plus bloqueada **se lista** con candado y «Solicitar» (antes ni salía;
  el owner lo señaló con razón). El taller no filtra por la columna `web`: es la casa de las
  herramientas; el reparto por superficie sigue mandando en KR/CP/DC.
- **Corregido** (A10): en la superficie web ahora EXISTE dónde solicitar una Plus — la concha
  bloqueada ofrece el «Solicitar» de siempre (`tool_access_requests` → se concede a mano en el
  ECP, como estaba diseñado).
- **Añadido** (A11): **trabajos guardados** — el Home Menu que pidió el owner («a name and a time
  stamp list to retrieve them»): crear con nombre, retomar, borrar; autoguardado con indicador
  veraz («Guardando…» / «Guardado HH:MM» / el error). `tool_sessions` service-role-only; cada
  verbo comprueba sesión + veredicto + propiedad; techos de 200 KB y 40 trabajos.
- **Añadido** (A11): el **puente** `public/tools/ctc-bridge.js` — una herramienta se vuelve «con
  memoria» con UNA línea en su HTML + la marca «Con memoria (puente)» en el ECP. Serializa los
  campos solo (o `CTC.usarEstado` para estado propio) y expone `CTC.emitir()` →
  `integration_events` (`it_plataforma`), el canal para empujar al ecosistema. Referencia viva:
  `costo-empaque`. La concha valida `source` y `origin` y nunca habla con `*`.
- **Datos**: `tool_sessions` (RLS encendida, cero políticas) + `tools.soporta_memoria`;
  el ECP gana la casilla en la ficha de cada herramienta.
- **Añadido**: guardián `qa-taller-check.mjs` (25) — propiedad en cada verbo, validación de
  origen del puente, el redirect fuera del try, la trampa del `%20` de `pathname` en Windows
  (pagada una vez: la primera corrida de capturas escribió once archivos en una carpeta
  literal `%20` sin fallar nada). `qa-herramientas-acceso-check` aprende la puerta del DC
  (26 → 31).
- **Docs**: `docs/HERRAMIENTAS_TALLER.md` + sección en el HANDOFF. Pendiente a propósito:
  Google OAuth en la puerta (exige callback + allowlist de Supabase) y capturas por versión.

## [V5.3] — 2026-08-19 (commit 5c20bc4)

- **Cambiado** (A4, CTC Home): en el índice de la red, **Herramientas del Café y Varietales
  Registrados intercambian su sitio** (es/en/de).
- **Corregido** (A4): la imagen de cabecera de la ventana de información **no estaba centrada** —
  4px de hueco a la izquierda contra 60px a la derecha. El reset global lleva `img{max-width:100%}`,
  que recortaba el `calc(100% + 56px)` de la sangría mientras el margen negativo SÍ se aplicaba.
  Lleva `max-width:none`, y la compensación pasa de 28px a los 32px/16px que de verdad acolcha
  `.modal` — nunca había llegado a sangrar del todo.
- **Cambiado** (A4): un logotipo deja de dibujarse sobre una franja a sangre de 560×150, donde
  ocupaba ~120px y dejaba ~220px de blanco plano a cada lado. Ahora es un **plato cuadrado de
  150px, centrado**: un 70% menos de blanco. Los seis logotipos de las puertas son PNG de paleta
  **sin transparencia** (el blanco va cocido dentro), así que el blanco no se puede quitar por CSS
  — se declara. `cherry-picked-logo.png` sí trae alfa: el día que lleguen los seis re-exportados,
  solo cambia el `background`.
- **Corregido** (A7): la entradilla en **español** decía «el Value Ecosystem» en inglés mientras su
  propio titular, dos líneas más abajo, dice «Ecosistema de Valor». Inglés y alemán no se tocan.
- **Cambiado** (A5): la línea de la **Ley 1581** sale de la entradilla del Directorio y baja a un
  **pie de página propio** (12,5px contra los 14px del cuerpo, tras la salida y con filete). Se
  amplía con las palabras que ya usaba `directorio/Landing.tsx`, en vez de inventar texto nuevo.
  `InfoPanel` gana `footnote`, calificado como `.inner .footnote` porque el global `.modal p`
  (0,1,1) le gana a una clase suelta.
- **Añadido** (A6): las **tres listas de espera se separan** y cada puerta pregunta lo suyo —
  Directorio: correo + especialidad · Herramientas: correo + herramienta de interés ·
  Terratalento: correo + rol + municipio. Un solo componente parametrizado (`NetNewsletter`), no
  cuatro copias.
- **Datos** (A6): `newsletter_subscribers.fields` (jsonb, aditivo) para el campo propio de cada
  fuente, con lista blanca POR FUENTE en la acción; y **`terratalento_interes`**, tabla propia
  —service-role-only, RLS encendida y cero políticas— porque su captación no es una lista de correo
  sino material de investigación: dónde hay manos antes de abrir.
- **Corregido** (A6): la restricción `newsletter_subscribers_source_check` seguía nombrando SOLO
  las tres fuentes viejas. Las altas de Directorio y Herramientas habrían fallado **contra la base**
  aunque el código las diera por válidas. Encontrado probando la forma real contra producción, no
  leyendo el esquema.
- **Añadido** (A6): sus **tres tableros**, que es lo que `qa-crm-interes-check` exige de toda fuente
  nueva — Directorio y Herramientas cuelgan de su página del ECP; Terratalento estrena tablero
  propio (reparto por rol y municipios con más gente, que es lo que decide por dónde se abre).
  El guardián sube de 37 a **55 comprobaciones**.

## [V5.2] — 2026-08-19 (commit 43cc84c)

- **Hito**: arranca **«Launch Beta Testing»** — la primera tanda que sale de la revisión
  pantalla por pantalla de la V5.0. El owner recorre las 19 superficies con una lista de 145
  puntos (bloques A–K) y marca cada uno *Done* o *Fix*; esta entrada recoge lo que trajo el
  bloque A.
- **Cambiado** (A1, CTC Home): el hero llega hasta el **borde inferior de la primera pantalla**,
  así la cinta de mercado —que es su último hijo— aterriza justo ahí en vez de dejar asomando un
  pico de la sección siguiente. `.hero` gana `min-height:calc(100svh - var(--hdr-h))` y pasa a
  ser columna flex; `.heroGrid` se queda el sobrante (`flex:1 0 auto` + `align-content:center`),
  de modo que el titular y los botones quedan ópticamente centrados y las cualidades + la cinta
  se apoyan abajo.
- **Añadido**: `--hdr-h` en `globals.css` — el alto de la cabecera de CTC Home en UN solo sitio
  (95px; 71px por debajo de 560px). La cabecera es `sticky`, o sea que OCUPA sitio en el flujo,
  y el hero tiene que restarlo para acabar exacto en el pliegue. `Header.module.css` lleva una
  nota junto al padding y junto al corte de 560px para que el número no se desincronice en
  silencio.
- **Docs**: `svh` y no `dvh` (con `dvh` la cinta daría un salto al ocultarse la barra del
  navegador en un móvil), y `min-height` y no `height` (una traducción más larga estira el hero
  en vez de recortarlo) quedan razonados en el propio CSS.

> Medido en la app corriendo, con la cinta al ras del pliegue y hueco 0 en los tres tamaños:
> 1512×912 (cabecera 95, hero 817), 1366×700 (hero 605, los botones aún sobre el pliegue en
> y=537) y 375×812 (cabecera 71, hero 741, sin desbordamiento horizontal).

## [V5.1] — 2026-08-19 (commit 511a526)

- **Añadido**: este registro — `CHANGELOG.md`, la vista estándar de consulta por versión, con el
  ciclo V5 entero respaldado (V4.27 → V5.0) y su contrato en la cabecera.
- **Añadido**: guardián `qa-changelog-check.mjs` (105) — la insignia no puede subir sin su entrada,
  los shas se sellan, las viñetas llevan categoría y el respaldo histórico no se recorta. Verificado
  saboteándolo por tres caminos.
- **Docs**: el mapa interactivo lo referenciará en el próximo wrap (anotación + ficha `versionado`);
  la regla del bump en `AGENTS.md` ahora exige la entrada en el mismo commit.

## [V5.0] — 2026-08-19 (commit 388af4e)

- **Hito**: el owner declara la quinta generación — **«Pre-Launch Beta»**. Cierra el ciclo V5 entero
  (plan de reorganización V4.23→V4.35 + lista de nueve pendientes V4.36→V4.45) y es el corte estable
  sobre el que arranca la etapa **«Launch Beta Testing»**. Solo cambia `src/lib/version.ts`: la
  insignia dice V5.0 en las 19 superficies.

> **Wrap V38** (2026-08-19): el ciclo V4.27 → V5.0 quedó compilado en
> `docs/architecture/Documentacion_Interactiva_V38.0(d200bb0).html` — 39 nodos · 128 fichas ·
> 48 trazas · 310 anotaciones.

## [V4.45] — 2026-08-19 (commit 58c5caf)

- **Cambiado**: `/control-panel` fuera del sitemap (19 → 18 URLs) — es la puerta del equipo y el
  sitemap era lo único que seguía nominándola a Google. `platform_surfaces.en_sitemap = false`; la
  página sigue viva en `panel.ctcexport.com`.
- **Corregido**: `mermas-rapida.html` gana `noindex, follow` — la segunda mitad del arreglo del
  2026-08-14: el título se limpió entonces, pero el CUERPO conserva el modo cacao entero (que no se
  toca) y un buscador indexa el cuerpo.
- **Cambiado**: `qa-tools-seo-espejo.mjs` aprende excepciones declaradas (`FUERA_DEL_INDICE`, cada
  una con su porqué).

## [V4.44] — 2026-08-19 (commit a934249)

- **Corregido**: la escala de grados es **de dos en dos** (owner): Black 80–81.99 · Red 82–83.99 ·
  Blue 84–85.99 · Gold 86–87.99 · Tyrian 88–100, con el límite siempre para el grado de arriba.
  El repo la afirmaba mal desde el 2026-08-05 — y Notion coincidía: *dos copias de acuerdo no son
  una verificación*.
- **Cambiado**: tres lotes de la cinta suben de grado (86.25→Gold, 84.50 y 84.25→Blue); códigos
  RD-*→BL-* y fichas PDF regeneradas. La escalera queda 3 Gold · 3 Blue · 1 Black, sin Red.
- **Corregido**: `GradosBoard` pinta la fila «Oficial» desde `GRADOS` (estaba escrita a mano).
- **Datos**: Notion alineado del todo — cinco rangos, cinco definiciones, «Tiryan» → **«Tyrian»**.
- **Cambiado**: `qa-grados-check` 44 → 48 (los cuatro límites enteros, uno por uno).

## [V4.43] — 2026-08-19 (commit 6398217)

- **Datos**: seis relaciones `Grado CTC` de Notion corregidas para cuadrar con su propio `SCA`
  (verificadas con `gradoPorPuntaje()`), y dos fichas sin puntaje rellenadas como material de
  muestra — marcadas «PUNTAJE DE RELLENO — NO ES DE LABORATORIO» en su propia ficha.
- **Docs**: sin guardián posible — no hay credenciales de Notion en el repo (el prerrequisito que
  falta para el espejo del §1 de INTEGRACIONES_PLAN).

## [V4.42] — 2026-08-19 (commit 84bea49)

- **Añadido**: la ficha pública de un lote vivo — `/docs/ficha/[lotId]` (fuera del matcher del
  proxy, gotcha 12) + `fichaPublica()` con **lista blanca** sobre las 110 claves de
  `lots.datasheet` (NIT, georreferencia y riesgo EUDR se quedan dentro). La compuerta es la vista:
  sin fila publicada, 404.
- **Añadido**: `public_lot_catalog.tiene_ficha` — un booleano, jamás el contenido — enciende el
  botón de la cinta para lotes vivos.
- **Añadido**: guardián `qa-ficha-publica-check.mjs` (105, contra las 110 claves reales).
- **Docs**: la nota del §9 que mandaba «generar el PDF desde `lots.datasheet`» contradecía la
  auditoría del 2026-07-10 — ganó la auditoría, que explica por qué.

## [V4.41] — 2026-08-19 (commit 3c72ca5)

- **Cambiado**: el pilar 01 del Manifiesto dice **dónde** se verifica la trazabilidad («en la ficha
  técnica y en la DDS», es/en/de) — la promesa era cierta pero la tarjeta no la cumplía leída a
  secas (la finca por D3.1; el productor, nunca).
- **Añadido**: `qa-sneak-peek-check` ata la promesa a la vitrina — falla si se quita el «dónde» o si
  la finca vuelve a la tarjeta (189 → 194).

## [V4.40] — 2026-08-19 (commit 7dfd8bb)

- **Corregido**: D0.9 y D0.10 cerradas **sin cambiar un valor** — la tarjeta ya acertaba. D0.9:
  Bourbon (palabra del owner; la taza desempata). D0.10: La Fortaleza, por prueba — La Floresta no
  cultiva Gesha.
- **Añadido**: los cuatro valores quedan CLAVADOS en el guardián (177 → 189): el mock es temporal y
  una reimportación de Notion los habría deshecho sin que falle nada.

## [V4.39] — 2026-08-19 (commit 353b49e)

- **Añadido**: tablero de la lista de espera de CTC Home en `/ecp/ctc-home` — la tercera fuente de
  `newsletter_subscribers` llevaba nueve días recogiendo correos sin tablero. Vive en el ECP (es de
  la red entera), junto a Leads.
- **Cambiado**: `InteresBoard` + acciones se mudan a `src/components/panel/interes/` — sirven a dos
  consolas. `marcarContactado` revalida los tres tableros.
- **Cambiado**: `qa-crm-interes-check` lee las fuentes de `SOURCES` (28 → 37) — una fuente nueva sin
  tablero rompe el guardián el día que se escribe.

## [V4.38] — 2026-08-19 (commit 419aeae)

- **Corregido**: `tools.meta_description` espejada con los archivos — no es decorativa, es el
  **inventario** que lee «Manejo de Plataformas» (y mentía al revés tras V4.37). `tools.lang` de
  `green-datasheet` corregido (`en` → `es`).
- **Corregido**: `mermas-detallada.html` —retirada el 2026-08-15— seguía viva e indexable: archivar
  no retira un archivo del repo de la web. Ahora lleva `noindex, follow`.
- **Añadido**: guardián `qa-tools-seo-espejo.mjs` (68) + aviso en el campo del ECP (el archivo
  manda; la columna es su espejo).

## [V4.37] — 2026-08-19 (commit e1fbe30)

- **Añadido**: `meta description` en las 12 páginas de `public/tools/` (solo 2 la tenían), derivada
  de `tools.descripcion` y sin frases de administración.
- **Corregido**: la de `mermas-ctc.html` describía OTRA calculadora — peor que vacía.
- **Añadido**: guardián `qa-tools-seo-check.mjs` (193): largo útil, sufijo de la casa, ninguna
  repetida, idioma acorde al `<html lang>`.

## [V4.36] — 2026-08-19 (commit 1ff089c)

- **Seguridad**: `npm audit` de 3 altas a **0** vía `overrides` de `deepmerge-ts` — sin degradar
  `mailparser` (el `fix --force` proponía una bajada rompedora del lector del Buzón). Verificado
  comparando la SALIDA de `simpleParser` antes y después: byte a byte idéntica.

## [V4.35] — 2026-08-19 (commit 642796a)

- **Añadido**: módulo **«Mis solicitudes»** en el panel del productor de KR (CTC Tech · Varietales ·
  CaaS), con contador de no leídos. Cierra el paso (v) — **el plan V5 queda completo**.
- **Corregido**: la partición del feed mira `parentId` además de `leadId` — solo la nota de CTC
  lleva el lead; la respuesta del productor habría quedado en la otra pantalla sin un solo error.
- **Cambiado**: el formulario de contacto gana su puerta («Entrar a …» por pilar, es/en/de); dos
  migraciones cosméticas de `context_label`.
- **Docs**: D5.1 quedó sin objeto — los leads ya se vinculan en la captura, no eran anónimos.

## [V4.34] — 2026-08-18 (commit c2519d8)

- **Añadido**: conchas in-app por superficie (`/kaffetal-regal/herramientas/<slug>` y
  `/cherry-picked-green/…`) con **vuelta segura** — el `?volver=` obedecido a ciegas era un redirect
  abierto. Lista blanca por frontera de segmento; nunca devuelve vacío.
- **Añadido**: solicitudes de acceso en `tool_access_requests`, tabla APARTE de los grants — pedir
  no es poder. El aviso a `info@` guarda su resultado en la fila.
- **Añadido**: guardián `qa-concha-herramientas-check.mjs` (42, once vectores de ataque). Cierra el
  paso (iv).

## [V4.33] — 2026-08-18 (commit 266fc9f)

- **Añadido**: modelo de acceso de Herramientas — `tool_user_grants` por **persona y herramienta**
  (la tabla vieja concedía por audiencia y abría todas las Plus de golpe; queda como comodín
  heredado, con `via` en el veredicto para saber a quién migrar).
- **Cambiado**: `herramientas` entra a la matriz de identidad como OBJETIVO, no como identidad.
- **Añadido**: guardián `qa-herramientas-acceso-check.mjs` (26).

## [V4.32] — 2026-08-18 (commit 9028ed7)

- **Cambiado**: «Definición de contexto» deja de ser vendorizado — las tres preguntas por CUATRO
  unidades (CTCX · KR · CHP · **Value Ecosystem**) + tres pestañas placeholder. Las respuestas
  reales se levantaron con migración (15 campos, 4.202 caracteres).
- **Corregido**: `qa-direccionamiento-check` vuelve a 14/14 — llevaba en 13/2 vigilando una premisa
  muerta. La línea base de eslint baja de 27 avisos a **8**.
- **Añadido**: guardián `qa-definicion-check.mjs` (33). Cierra el paso (iii).

## [V4.31] — 2026-08-18 (commit 403f550)

- **Añadido**: una ficha por nodo partner (`/bcp/socios/<nodo>`, ×5) — estado de credenciales, tres
  puertas y KPI de invitaciones fallidas en cabecera.
- **Corregido**: **13 compuertas apuntaban a la consola equivocada** tras la mudanza (las claves de
  consola no llevan barras). Cerrado con la comprobación (f) de `qa-rutas-consolas`.

## [V4.30] — 2026-08-18 (commit 9890659)

- **Añadido**: CRM CP **Roast** y **X** — listas de espera, no embudos; solo se persiste
  `contacted_at` (y se puede desmarcar). El grupo «OCP · Cherry Picked» queda completo.
- **Añadido**: guardián `qa-crm-interes-check.mjs`, que también compara clases de CSS module usadas
  contra declaradas — una inexistente sale `undefined` sin que nada falle.

## [V4.29] — 2026-08-18 (commit 71bd712)

- **Añadido**: CRM CP **Green** — el embudo de compradores de la tienda. La etapa se **deduce** de
  los pedidos al leer (D3.2); solo el anulado manual se persiste. Regla en módulo puro
  (`etapaComprador.ts`) + guardián `qa-crm-green-check.mjs` (21).

## [V4.28] — 2026-08-18 (commit 4de00ab)

- **Añadido**: D3.1 resuelta — el lote comprado en firme tiene DOS caras. `public_lot_catalog` anula
  `finca_name` y expone `ctc_selection`; el rótulo sale de `legal.ts`; se deriva de la compra. Ni
  una fila de `lots`/`fincas` cambia.

## [V4.27] — 2026-08-18 (commit cdc7b22)

- **Añadido**: **CTC Selection** (`/ocp/ctc-selection`) — el paraguas de lo comprado en firme; Black
  Stock pasa a ser su pestaña Black. `black_negotiations.grade` con CHECK que rechaza `tyrian` (va a
  subasta, y eso vive en la base).
- **Cambiado**: el talón de `/bcp/black-stock` reapuntado en un solo salto (regla F2). Abre el ciclo
  del plan V5 sobre la V4.26.
