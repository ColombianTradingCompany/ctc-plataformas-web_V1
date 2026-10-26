# `calculadora-logistica` · Calculadora logística de café

> Ficha de la herramienta dentro del componente `herramientas-cafe`. Se lee DESPUÉS del charter
> (`docs/componentes/herramientas-cafe.md`) y del recuento (`../README.md`). Estado al 2026-10-26 (V6.11, **V4** de la herramienta).

| | |
|---|---|
| Estado | Viva · **V4** · nueva (V6.11) |
| Nivel | default (decisión por omisión de la sesión; se cambia en BCP · Herramientas sin desplegar) |
| Idioma | es · en (conmutador propio; `?lang=es\|en` manda sobre la preferencia guardada) |
| Superficies (`tools.kr/cp/web/dc`) | KR · CP · web (DC apagada) |
| Memoria | sí · **esquema propio** (`CTC.usarEstado`, `v:1`) |
| Trabajos guardados | 0 |

## Qué es

Peso, volumen (CBM) y estiba de una carga de café. Entra: medidas internas de la caja o saco (cm, con «+1 cm por dimensión»
si se suma la caja), densidad (verde 780 g/L, tostado 400 g/L o libre) y la estiba. Sale: peso y CBM unitarios y totales, una
**vista 3D** (three.js) con una **persona de 1,80 m** al lado para dar escala, y un **PDF de una página** (jsPDF) con la marca
de la casa, los parámetros, los resultados, la captura 3D y el QR a `https://ctcexport.com`.

Dos modos de estiba:

- **Cuadrícula libre** (columnas × capas × filas). El **peso objetivo** («Aim Weight», modo «Ajustar estiba») busca el bloque
  más cúbico que no quede por debajo del objetivo: puntaje = sobrepeso × 10 + log(lado mayor / lado menor). Promedio ≈ 2 % de
  sobrepeso, máximo ≈ 9 % en cargas pequeñas (barrido de 50 a 3.000 kg).
- **Pallet estándar** (interruptor). Cinco tamaños ISO: EUR/EPAL 120×80, EUR 2/ISO 120×100, GMA 48×40 in (121,9×101,6),
  Asia T11 110×110, Australia 116,5×116,5. La capa se arma con el patrón que más cajas mete: rejilla, dos bloques con giro de 90°
  o **molinete** (cinco bloques, el que gana en los pallets cuadrados). Se apila hasta **2,2 m contando el pallet** o hasta el
  **tope de peso por pallet** (1.000 kg por omisión; 0 = sin tope), lo que llegue primero, y lo que sobra va a otro pallet al lado
  (fila hasta 4; desde 5, rejilla compacta). El peso objetivo completa capas enteras. Si una sola capa supera el tope, la
  herramienta lo dice en rojo y deja una capa por pallet. El CBM total se queda en el volumen de las cajas; el paletizado
  (huella × altura con el pallet) va aparte, en la tarjeta y en el PDF.

## Dónde vive

**Servida** (`public/tools/calculadora-logistica/`, URL `/tools/calculadora-logistica/<archivo>`):
- `calculadora-logistica-cafe.html` — la V4, idéntica a la fuente V4.
- Librerías vendorizadas en `public/tools/assets/`: `r128-three.min.js`, `controls-OrbitControls.js` (nuevas en la V6.11) y
  `2.5.1-jspdf.umd.min.js` (ya estaba, la usa `mermas-ctc`); tipografías Anton e Inter en `assets/fonts/`.

**Fuentes** (`C:\dev\ctc-platforms\reference\html_tools\calculadora-logistica\`, fuera de git):
- `…_V1.html` — la del owner (artefacto de claude.ai, 2026-10-26). El PDF no salía: `id="qr"` repetido (un `<symbol>` del sprite
  SVG y la imagen del QR; `$("qr").src` era `undefined` y jsPDF reventaba sin avisar).
- `…_V2.html` — PDF arreglado (la imagen pasa a `qr-img`), aviso si falla, peso objetivo con bloque cúbico.
- `…_V3.html` — persona de 1,80 m, modo pallet (tamaños, capa optimizada, 2,2 m, pallets al lado) y tope de peso por pallet.
- `…_V4.html` — la de la plataforma (esta ficha).

**Cómo se editó.** Pesa ~277 KB, casi todo el logo y el QR en base64 en dos **líneas larguísimas** (93 y 153). No se abre entero:
se lee con las líneas largas recortadas y se cambia con reemplazos EXACTOS (cada texto viejo debe aparecer una vez). Desde la V4
la copia servida y la fuente son el mismo archivo: editar la servida y copiarla a `reference\…\Calculadora_Logistica_Cafe_CTC_V5.html`.

## Lo que hizo la V4 (V6.11) sobre la V3

- **`<head>` de la casa**: título «Calculadora Logística de Café · Colombian Trading Company» y meta description (153 caracteres,
  sufijo de la casa).
- **Memoria** con esquema propio: `{v:1, l,w,h, box, d, x,y,z, pal, palSize, cap, aim, aimOn, aimMode}`. `aimOn` es el peso
  objetivo APLICADO, que no vive en ningún campo (por eso no basta el puente por defecto). Resumen del Home Menu:
  «42×26×12 cm · 310 unidades · 3.047 kg · 4 pallets EUR 2 / ISO». `CTC.tocado()` en lo que no es evento de campo (chips de
  densidad, modo del objetivo, Calcular, Quitar). Registro en `DOMContentLoaded` y nuevo `ready` (patrón de `agtron`).
  La trampa de `gulliver` no aplica: la herramienta solo guarda en `localStorage` el idioma, nunca la carga.
- **Descarga**: se quitó el gancho `claude.use("downloads")` del artefacto de claude.ai; siempre `doc.save()` (la concha da
  `allow-downloads`).
- `?lang=es|en` manda sobre `localStorage` y el idioma del navegador (lo usa la captura del carrusel).

## Guardianes

- `qa-tools-puente-conformance` (sonda propia): cambia el largo a 50, enciende el pallet Asia T11, calcula 2.000 kg y exige
  que lleguen al estado (`aimOn` incluido) y vuelvan a la pantalla.
- `qa-tools-seo-check` y `qa-tools-carpetas` la recorren por estar en su carpeta.
- Sin guardián propio todavía: el empaquetador de capas se probó a mano en 2.160 combinaciones caja × pallet (sin solapes, sin
  vuelo, nunca peor que una rejilla). Si la herramienta crece, ese barrido es el primer candidato a `qa-calculadora-logistica`.

## Abierto

- **Tara del pallet**: el peso total no suma el pallet vacío (≈ 25 kg el EUR).
- **Nivel y superficies**: puestos por omisión (default · KR · CP · web); el owner decide en BCP · Herramientas.
- La capa usa patrones de hasta cinco bloques; hay acomodos mejores para algunas cajas (pilas «en ladrillo» que cruzan capas),
  no pedidos.
- La captura del carrusel enseña la cuadrícula libre por omisión; el modo pallet no se puede preparar desde `PREPARAR`
  (la carga no vive en `localStorage`).
