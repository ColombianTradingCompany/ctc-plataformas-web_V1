# Brief · Gulliver · 7 días a Tokio  (componente: herramientas-cafe · id: `gulliver` · 2026-10-04)

> Acta de origen de la herramienta. Fuente del owner: `C:\dev\ctc-platforms\reference\html_tools\Gulliver\gulliver_V1.0.html`
> (366 KB, autocontenida: tres tipografías y dos PNG en base64, sin CDN, sin servidor, sin IA).
> Estado: **aprobado** por el owner el 2026-10-04 («sí a todo»: las ocho decisiones como se recomiendan) · construido en la
> **V5.149** el mismo día. Lo construido está al final, en «Acta de construcción»; la ficha viva es
> `docs/componentes/herramientas-cafe/gulliver/README.md`.
>
> ⏰ **Hay un plazo real.** SCAJ 2026 abre el **14 de octubre** (hoy es 4). La herramienta propone «siete misiones, una por
> día»: para que alguien las haga enteras antes de la feria tiene que estar publicada, con permisos dados, **a más tardar el
> 7 de octubre**. Después del 17 de octubre su contenido caduca (ver la decisión 5).

**Qué es** — Japonés de bolsillo para hispanohablantes del café que viajan a **SCAJ 2026** (Specialty Coffee Association of
Japan, Tokyo Big Sight, 14–17 oct). Siete misiones diarias con tarjetas, quiz, «arma la frase», un simulacro de cinco
escenas y un examen final; un libro de frases para enseñar la pantalla en la feria; los números en japonés y un conversor de
seis monedas que funciona sin conexión. Gamificada: sellos (スタンプカード) y granos de café como puntos.

**Para quién** — El **productor** de Kaffetal Regal, el **experto** del Directorio del Café y cualquier persona de la red que
vaya a la feria. La propia herramienta ofrece seis roles: visitante, productor, exportador, tostador, barista, comprador.

## Lo que trae la V1.0 (leído entero)

| Pieza | Qué hace |
|---|---|
| Bienvenida | Perfil: nombre (30 caracteres), país (22: Iberoamérica, España y EE. UU.), rol. Con eso arma «Soy X, vengo de Y, soy Z». «Completar después» la salta. |
| Ruta | Tarjeta de sellos de 7 días + meta «SCAJ 14 oct» + cuenta atrás + **misión extra «Negocios»** (11 frases). |
| Un día | Días 1–6: Tarjetas → Quiz → Arma la frase (aprobado = 60 %; estrellas a 75 y 90 %). Día 7: Simulacro (5 escenas, del taxi a la cena) + Examen final (15 preguntas). |
| Repaso | Prioriza las frases falladas (`ph[id] = {o, b}`). |
| Números | Principales · «Tu número» dicho en japonés (hasta 999 999 999 999, con yenes) · conversor COP · JPY · USD · CNY · KRW · EUR con **tasas ancla editables** (del 2–3 oct 2026). |
| En la feria | Panel «i» con los datos de SCAJ 2026 (fechas, halls, entrada, registro, estaciones, enlaces al sitio oficial, «consultados el 4 de octubre de 2026») · libro de 98 frases en 7 bloques, con buscador · imprimir la hoja · **respaldo por código** (base64 del estado) · borrar avance. |
| Voz | `speechSynthesis` en `ja-JP` con la voz del dispositivo; normal y lenta; silenciable. |
| Estado | UN objeto `state` (`v:1`, `profile`, `beans`, `days`, `ph`, `sound`, `fx`, `updatedAt`) en `localStorage['nihongo-scaj-2026-v1']`, con `normalize()` defensivo. |
| Marca | Bloque `credit()`: logo de Colombian Trading Company (PNG en base64) + «Gulliver es una herramienta hecha por CTCX». Claro/oscuro, `prefers-reduced-motion`, objetivos táctiles de 44 px. |

Es una herramienta bien hecha y casi lista: lo que falta es **la memoria de la red y los descargos de la casa**.

## Ficha para `tools`

| Campo | Valor propuesto |
|---|---|
| `id` | `gulliver` |
| `nombre` | Gulliver · 7 días a Tokio |
| `descripcion` (tarjeta del taller) | Japonés de bolsillo para SCAJ 2026: siete misiones con voz, libro de frases para la feria y conversor de monedas sin conexión. |
| `lang` | `es` (decisión 3) |
| `tier` | **plus** (lo pidió el owner) |
| `clase` | compartible |
| Superficies | `kr` ✓ · `web` ✓ · `dc` ✓ · `cp` ✗ (decisión 2; se cambia en BCP · Herramientas sin desplegar) |
| `soporta_memoria` | **sí**, con esquema propio (`CTC.usarEstado`) — **un trabajo = la libreta de una persona** |
| `familia` | — |
| Archivo | `public/tools/gulliver/gulliver-7-dias-a-tokio.html` (+ su línea en `src/lib/tools/carpetas.ts`) |
| `<title>` | Gulliver · 7 días a Tokio — japonés de bolsillo para SCAJ 2026 |
| `meta description` | «Japonés de bolsillo para viajar a SCAJ 2026 en Tokio: frases con voz, siete misiones y conversor de yenes. Colombian Trading Company SAS · ctcexport.com» (**152** caracteres, sufijo de la casa, en español como la página) |
| `guia` (acordeón del Home Menu) | «Cada trabajo es la libreta de una persona: su nombre, sus sellos y sus granos. Haz una misión al día; en la feria, abre "En la feria" y enseña la frase en pantalla.» |
| Captura | `public/images/herramientas/shots/gulliver.jpg` (línea nueva en el mapa de `build-tool-shots.mjs`). Sin estado sale la bienvenida; si el script admite preparar `localStorage`, mejor la Ruta con dos sellos. |
| Icono | uno nuevo en `src/components/tools/ToolIcons.tsx` (hoy cada herramienta tiene el suyo). |

## Dónde vivirá

Herramienta pública del taller, como las demás: `public/tools/gulliver/` + registro en `tools`. **Sin servidor, sin IA, sin
tablas nuevas.** Las fuentes del owner pasan a `reference\html_tools\gulliver\` (la carpeta se llama como el id, en minúscula):
la V1.0 tal cual y la **V1.1** que sale de esta sesión. Como los cambios tocan el cuerpo, la V1.1 es la versión que se sirve; la
V1.0 queda como acta.

## La memoria: el puente con esquema propio

Gulliver ya guarda TODO en un solo objeto con `normalize()`, así que encaja con el patrón de `agtron` y `coffee-datasheet`:

```js
CTC.usarEstado(() => state, (e) => { state = normalize(e); view = {name: state.profile.set ? 'home' : 'onb'}; render(); });
CTC.usarResumen(() => (nombre || 'Sin nombre') + ' · ' + sellos + ' de 7 sellos · ' + granos + ' granos');
// y CTC.tocado() dentro de save()/saveLocal(); ready repetido en DOMContentLoaded, como agtron
```

⚠️ **La trampa, y por qué no basta con añadir la línea del puente.** Cuando la concha abre un trabajo NUEVO, manda `init` con
`estado: null` y el puente no llama a `poner` (`ctc-bridge.js`, el manejador de `init`). La herramienta se queda con lo que
leyó al arrancar, que es `localStorage`, y `localStorage` es **del navegador, no del trabajo**: un trabajo nuevo heredaría los
sellos, el nombre y el país del último que se abrió en ese navegador (o de la herramienta abierta suelta). Por eso:

- **Dentro de la concha** (`window.parent !== window`): arranca en blanco, **no lee ni escribe** `localStorage`; el trabajo es
  la única memoria.
- **Abierta suelta**: igual que hoy, `localStorage`.
- **El respaldo por código se queda en los dos modos**: es además el camino para pasar a una cuenta el avance hecho suelto
  (crear código fuera → cargarlo en un trabajo).
- La pantalla dice la verdad: en la concha, «El avance se guarda solo en este navegador» pasa a «Tu avance se guarda en tu
  cuenta, en este trabajo», y «Borrar mi avance» a «Borrar el avance de este trabajo».

Peso: perfil + 8 días + 98 contadores + tasas ≈ 5–10 KB por trabajo (techo de `tool_sessions`: 200 KB).
**Emite**: nada en la v1 (decisión 6).

## Los descargos: la forma y el contenido de la casa

Lo que llevan hoy las demás (leído en `public/tools/*/`):

| Herramienta | Pie de propiedad | Límites («no reemplaza…») | Terceros y fuentes | Dónde |
|---|---|---|---|---|
| `agtron` (V8) | «…son propiedad de Colombian Trading Company SAS. Todos los derechos reservados. © 2026. Provista solo con fines de referencia — ver el panel de información… Prohibida su reproducción o redistribución sin autorización.» | «No reemplaza un espectrofotómetro Agtron ni un kit SCA/Agtron…» | Lista de fuentes con enlace | Pie fijo + panel «i» (modal) |
| `defectos-cafe` | «Herramienta propiedad de CTCX · Colombian Trading Company S.A.S. Todos los derechos reservados. ©» | — | Fuentes (FNC, Cenicafé…) + crédito de fotografía y pósters | Pie |
| `viaje-cafe` | «© 2026 Colombian Trading Company SAS. Todos los derechos reservados. Esta herramienta…, su contenido, diseño e ilustraciones… Prohibida su reproducción total o parcial…» | — | — | Pie + «Acerca de esta guía» (modal) |
| `mermas-ctc` | «© 2026 … Todos los derechos reservados.» | «Herramienta de estimación: los promedios… son referencias…» | — | Pie |
| `formula-calidad` | «…propiedad intelectual de CTC… con fines educativos e informativos.» | — | O'Keefe (2007), concepto original | Pie |
| `coffee-datasheet` | pie del documento con la casa | «No reemplaza la evaluación de un Q Grader…» | «…la SCA, que no avala esta herramienta» | Documento + avisos junto al dato |
| `cromatografia-suelo` | razón social + **NIT 901.483.425-7** en el impreso | descargo corto + descargo obligatorio | Bibliografía y metodología | Informe, impreso y diálogos |

**La forma que se repite** (y que Gulliver adopta), en tres piezas:

1. **Pie legal** al final de Ruta, En la feria y la bienvenida (sustituye a `credit()`; el logo se queda): propiedad +
   derechos + © 2026 + una línea de límites + no afiliación + prohibida la reproducción + enlace «Acerca de esta herramienta».
2. **Panel «Acerca de»** en pop-up (regla de la casa: hilos y adjuntos en pop-up; cerrado por defecto): qué es, límites,
   fuentes con su fecha, privacidad y créditos.
3. **Avisos junto al dato**: los que ya tiene (tasas, enlaces, voz) se quedan donde están. Y la **hoja impresa** lleva al pie
   la línea legal de la casa (`src/lib/legal.ts`): «Colombian Trading Company S.A.S. · NIT 901.483.425-7 · ctcexport.com».

**Textos propuestos** (español; el owner aprueba o corrige — decisión 7):

> **Pie.** Gulliver es una herramienta propiedad de CTCx · Colombian Trading Company S.A.S. Todos los derechos reservados.
> © 2026. Guía de bolsillo con fines educativos: no reemplaza un curso de japonés ni a un intérprete. No está afiliada a SCAJ
> ni avalada por ella. Prohibida su reproducción total o parcial sin autorización. · *Acerca de esta herramienta*

> **Acerca de · Qué es.** Una guía de bolsillo para que la gente del café de habla hispana se mueva en Tokio y en SCAJ 2026
> con un japonés básico y cortés: siete misiones, un libro de frases para enseñar en pantalla y un conversor de monedas que
> funciona sin conexión.
>
> **Límites.** Las frases son de uso diario y de feria, en registro cortés. La pronunciación escrita (rōmaji, sistema Hepburn)
> es una aproximación, y la voz la pone tu dispositivo: puede sonar distinta a la de un hablante nativo. Para un trámite
> importante —migración, salud, un contrato— usa un intérprete o la información oficial.
>
> **La feria.** Fechas, horarios, precios, halls y reglas de SCAJ 2026 se tomaron del sitio oficial (scajconference.jp) el 4
> de octubre de 2026 y pueden cambiar: confírmalos allí antes de viajar. SCAJ (Specialty Coffee Association of Japan) y Tokyo
> Big Sight son de sus respectivos dueños; esta herramienta no está afiliada a ellos ni los representa.
>
> **Monedas.** Las tasas del conversor son de referencia, del 2 y 3 de octubre de 2026, y no se actualizan solas. No es
> asesoría financiera; las casas de cambio y las tarjetas cobran su comisión.
>
> **Tus datos.** Tu nombre, país y rol solo sirven para armar tus frases. Abierta suelta, Gulliver guarda tu avance en este
> navegador; dentro de la red CTC, en tu cuenta, como un trabajo. No se envía a terceros. Algunos navegadores generan la voz
> con un servicio en línea de su proveedor, que recibe el texto que se lee.
>
> **Créditos.** Diseño, ilustraciones y frases: CTCx. Tipografías bajo SIL Open Font License 1.1 *(nombres por confirmar al
> construir: el CSS las llama MPR, SMB1 y ANT — parecen M PLUS Rounded 1c, Shippori Mincho B1 y Antonio; **confirmado al
> construir: la tercera es Anton**, no Antonio)*.
> *[Si el japonés no lo ha revisado un hablante nativo — decisión 4 —:]* Las frases están pendientes de revisión por un
> hablante nativo.

Lo de la voz no es de adorno: con la voz «Google 日本語» de Chrome en escritorio, el texto sale a un servidor de Google, y una de
las frases es «Soy <tu nombre>». Por eso la V1.1 **prefiere una voz japonesa local** (`localService`) cuando el dispositivo la
tiene, y solo si no hay ninguna usa la en línea.

## Otros ajustes del cuerpo (V1.1)

- **La fecha del evento en UN sitio.** Hoy «14 de octubre» vive en cuatro: la cuenta atrás (`new Date(2026,9,14)`), la meta
  de la tarjeta, el pie de la tarjeta y el panel «i». Un bloque `EVENTO = {nombre, inicio, fin, lugar, consultado}` los
  alimenta; reeditarla para otra feria pasa a ser cambiar datos (decisión 5).
- `credit()` → pie legal + panel «Acerca de» (arriba).
- `CTC.tocado()` en cada guardado; el puente al pie, con el comentario de la casa.
- Nada más: ni el contenido, ni el diseño, ni el juego se tocan.

## Datos · IA · contratos

**Datos** — ninguna tabla nueva; usa `tool_sessions` (trabajos) como cualquier herramienta con memoria.
**IA** — ninguna llamada; nada que anotar en el libro de consumo.
**Contratos que toca** (`ALINEACION` §1) — ninguna fuente única. **SEO**: `<head>` a mano (title, description, `lang="es"`).
**Tres idiomas**: excepción declarada, solo español (decisión 3). **Vocabulario**: CTCx, Colombian Trading Company S.A.S. y la
línea legal de `legal.ts`, copiada como texto (un HTML autocontenido no importa). No alcanza a otro componente: sin línea en §3,
salvo que el owner quiera el evento `CTC.emitir`.

## Guardián previsto

`qa-gulliver-check.mjs`, puro y barato (~20 comprobaciones), porque la herramienta se va a reeditar:
la fecha del evento aparece en un solo bloque · el pie legal y el panel «Acerca de» existen y dicen «no afiliada» · la línea del
puente al pie y `usarEstado` registrado · en la concha no se lee `localStorage` · ninguna URL de CDN · toda frase tiene silueta
(hoy solo lo avisa un `console.error`).
Y entra en los que ya recorren todas: `qa-tools-carpetas`, `qa-tools-seo-check`, `qa-tools-seo-espejo` y
`qa-tools-puente-conformance` **con sonda de esquema propio**, que además pruebe la trampa: con avance en `localStorage`, un
trabajo nuevo abre en blanco.

## Primera tanda (lo mínimo desplegable y verificable en vivo)

1. V1.1 en `reference\html_tools\gulliver\` → copia a `public/tools/gulliver/gulliver-7-dias-a-tokio.html`, `<head>` de la
   casa, línea en `carpetas.ts`, ficha `docs/componentes/herramientas-cafe/gulliver/README.md`.
2. `vendor-tool-assets.mjs` (se espera que no cambie nada: no hay CDN) · icono en `ToolIcons.tsx` · captura.
3. `qa-gulliver-check` + los cuatro de arriba + compuerta completa · `APP_VERSION` + `CHANGELOG` + asiento en el log de
   arquitectura · push.
4. **Con el archivo ya desplegado**, alta por SQL (el BCP no crea versiones `repo`): `tools` → `tool_versions` (origen `repo`,
   `src_publico`) → `version_publicada`; `qa-tools-seo-espejo` lo comprueba.
5. Verificación en vivo: `curl -L` de la insignia y del archivo; abrir un trabajo en el taller, ganar un sello, recargar,
   retomar; abrir un segundo trabajo y comprobar que empieza en blanco.
6. Permisos Plus por persona en BCP · Herramientas a quien vaya a SCAJ (decisión 1).

## Decisiones del owner

Cada una con mi recomendación; si estás de acuerdo con todas, basta un «sí a todo».

1. **Plus: ¿a quién le das permiso antes del 7 de octubre?** Siendo Plus, en el taller sale con candado y «Solicitar»; nadie la
   abre sin un permiso por persona. *Recomiendo*: la lista de quienes van a SCAJ, por persona, desde BCP · Herramientas.
2. **Superficies.** *Recomiendo* KR · web · DC encendidas y CP apagada (los compradores de Cherry Picked no son el público de un
   japonés para hispanohablantes). Se cambia sin desplegar.
3. **Solo español.** Es japonés PARA hispanohablantes; en inglés o alemán sería otra herramienta. *Recomiendo*: sí, excepción
   declarada.
4. **¿Quién revisó el japonés?** Es una herramienta para aprender un idioma: un error se aprende. *Recomiendo*: pedir la
   revisión de un hablante nativo antes del 10 de octubre y, mientras no esté hecha, que el panel lo diga.
5. **Después del 17 de octubre.** (a) Archivarla (`noindex`, el archivo sigue y los trabajos también) o (b) reeditarla para la
   próxima feria. *Recomiendo*: dejar ya la fecha en un solo bloque (barato) y decidir el 18 de octubre.
6. **¿Emitir eventos al ecosistema?** (`CTC.emitir`, p. ej. «herramienta.gulliver.ruta_completada» hacia Make/Notion).
   *Recomiendo*: no en la v1; nadie los consume.
7. **Los textos de descargo de arriba**: aprobar tal cual o corregir.
8. **El nombre del archivo** (`gulliver-7-dias-a-tokio.html`; la URL que verá Google). *Recomiendo* este; si se reedita para
   otra feria, sigue valiendo.

## Acta de construcción (V5.149, 2026-10-04)

Aprobado con «sí a todo»: Plus · KR, web y DC (CP apagada) · solo español · el panel dice que falta la revisión nativa · fecha del
evento en un bloque y decisión el 18-oct · sin eventos al ecosistema · los textos de descargo tal cual · `gulliver-7-dias-a-tokio.html`.

- **V1.1** escrita sobre la V1.0 con un script de reemplazos exactos (cada texto viejo, una vez); fuentes en
  `reference\html_tools\gulliver\` (la carpeta pasó de `Gulliver` a `gulliver`, como el id). La servida es idéntica a la V1.1.
- **Memoria**: tres modos (suelta · trabajo · marco). La trampa del brief se confirmó en un navegador: la V1.0 con la línea del
  puente, dentro de un iframe y con avance en `localStorage`, abre en la Ruta con el avance ajeno; la V1.1 abre la bienvenida en
  blanco. La sonda nueva de `qa-tools-puente-conformance` lo exige (15/15) y `qa-gulliver` lo prueba en Node.
- **Descargos** con los textos de arriba; tipografías confirmadas leyendo la tabla `name` de los woff2: M PLUS Rounded 1c,
  Shippori Mincho B1 y **Anton**. Revisados en Chrome sin pantalla a 375 px, claro y oscuro, y en modo impresión.
- **Fuera del brief, al pasar**: `build-tool-shots.mjs` gana `PREPARAR` (estado de ejemplo antes de la captura) y su salida con
  ids por argumento se mide contra las pedidas (antes salía 1 aunque todas salieran bien); `qa-tools-puente-conformance` falla si
  una sonda revienta (antes una excepción solo dejaba una nota y aprobaba).
- Icono propio en `ToolIcons.tsx` (bocadillo con un torii) y captura `shots/gulliver.jpg` con dos sellos de ejemplo.
