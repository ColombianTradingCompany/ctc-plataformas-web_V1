# Lector de Cromatografía de Suelo · guía de trabajo

Estado al 2026-09-14: **V5.41 en producción**. Herramienta `cromatografia-suelo` del componente **herramientas-cafe**,
plan **plus**. Esta guía basta para entender lo construido y cambiarlo sin releer las sesiones anteriores. La historia
de cada decisión está en el brief (`docs/componentes/briefs/herramientas-cafe-cromatografia-suelo.md`, un acta por
versión, V5.32–V5.41) y el estado del componente en su charter (`docs/componentes/herramientas-cafe.md`, «Pendientes»).

---

## 1. Qué es y la regla de oro

Lee la foto de un cromatograma circular de Pfeiffer de un suelo cafetero y produce dos informes: uno sencillo y
accionable para el **productor** (campesino, usuario principal) y uno técnico para el **laboratorio**, que revisa la
lectura y la devuelve como **Feedback Técnico** para refinar el modelo. Habla **español, inglés y alemán** (V5.39).

La regla de oro, que manda sobre cualquier pedido:
- La cromatografía es **cualitativa**: lenguaje probabilístico siempre; nunca medición científica, certificación ni
  equivalente a laboratorio.
- **Nunca** se vincula con calidad en taza, puntaje SCA/CVA, catación o precio.
- La foto **no ve nutrientes ni acidez**: no se inventan cifras, y en la cara del productor ni se nombran
  (potasio, fósforo, pH, acidez, nitrógeno…). El owner pidió una vez «potasio bajo → mezclar…» y se decidió NO hacerlo.
  Desde V5.39 el productor puede **declarar su análisis de laboratorio**: es un dato suyo, se le muestra en una tabla
  tal como lo escribió y el modelo solo lo **contrasta en la cara técnica**; nunca lo convierte en lectura de la foto
  ni lo califica («pH bajo» es trabajo del agrónomo).
- El **descargo obligatorio** sale de las reglas, nunca lo escribe el modelo.
- Recomendar laboratorio o repetir el croma **siempre**, pero **nunca como primer consejo** (van al final).
- Al modelo no llegan el nombre de la finca, las coordenadas ni el nombre de quien prepara el informe; el nombre de la
  finca se guarda solo con consentimiento. Dentro de Cherry Picked no se ofrecen fincas.

## 2. Lo que ve cada usuario

**Cabecera**: las dos caras (Productor · Laboratorio) y el conmutador **ES · EN · DE**. El idioma se recuerda en
`localStorage["ctc-croma-idioma"]`; al cambiarlo se repinta todo y la próxima lectura se pide en ese idioma. Una lectura
guardada conserva el suyo (`lectura.idioma`) y la cara del laboratorio avisa si no coincide con la interfaz.

**Productor** (cara por defecto)
1. Paso 1, la foto: consejos, subir o tomar la foto. La **compuerta** dice en palabras del campo si sirve y cómo
   repetirla. El botón **«?» amarillo** (arriba a la derecha) explica qué es la cromatografía: 5 puntos, un dibujo y un
   cierre, más **3 fotos de ejemplo** que pasan por la misma compuerta y quedan marcadas como ejemplo.
2. Paso 2, datos: finca y lote (de su cuenta si las tiene), departamento, manejo, fecha, prácticas; «Más datos»:
   municipio, altitud, variedad, papel, dilución de NaOH, días desde el revelado; **«Análisis cuantitativo (si lo
   tiene)»**: laboratorio, fecha, pH, MO, N, P, K, Ca, Mg, con la explicación de qué es (el examen que suele hacer la
   Federación a través de Cenicafé); consentimiento; **«Preparada por»** opcional (nombre de la cuenta por defecto,
   editable).
3. Paso 3, «Leer mi suelo · ≈ US$ 0,02».
4. Informe: **foto anotada** (un número y una flecha por conjetura) → señal (buena/mixta/atención, con su «i») → resumen →
   **conjeturas** (lo que se ve · podría significar · también podría ser · si es así · certeza baja/media, con su «i») →
   **prácticas** por prioridad → «Para confirmar y seguir el avance» (laboratorio y repetir, plegados) → **su análisis
   de laboratorio** (tabla, solo si lo declaró) → descargo. PDF por impresión del navegador con cabecera
   «Colombian Trading Company SAS», pie con NIT y web, y «Página n de N».

**Laboratorio**
- Compuerta con sus valores y las fronteras dibujadas sobre la foto (cada criterio con su «i»); contexto y protocolo;
  el análisis cuantitativo declarado como tabla; rasgos medidos sin IA (cada rasgo con su «i»); escala de Ford
  programática (con su «i»).
- Lectura técnica: la misma **foto anotada** (con «c1 · zona orgánica»), descripción visual, escala de Ford con rango,
  cadena de evidencia (i1…), contexto regional, recomendaciones (r1…), **contraste con el laboratorio declarado** (solo
  si hubo análisis), y la revisión del informe del productor (c1…, a1…, k1…). Cada elemento tiene veredicto + comentario
  (y rango corregido en Ford).
- Feedback técnico: **identificación del laboratorio** (institución, RUT con aviso de dígito DIAN, técnico, cargo,
  firma dibujada), valoración general, botón **«Bibliografía y metodología»** (en su propia barra, encima de la de
  imprimir: el método en ~150 palabras, un acordeón de recursos con licencias y otro con los **3 PDF de metodología**,
  en español), «Imprimir feedback (PDF)», «Exportar Feedback Técnico (.json)».

**Las «i» de definiciones** (V5.39, rehechas en V5.41): un diálogo común (`dlgDef`) con qué es, un **diagrama de lo que
se mide** (`diagramaMedida`, sobre la foto con sus fronteras si la hay), la ecuación en notación simbólica, el rango, la
**guía 1–5** si es un rasgo de Ford y, al final y plegada, la **leyenda completa**. Viven en `DEF` (`formulas`,
`simbolos`, `diag`, `escala`, textos por idioma) y `SIMB` (glosario de símbolos en tres idiomas). Las «i» de los campos del
formulario (`data-def="campo.<k>"`) abren `abrirCampo` con `CAMPO` (qué es en ≤ 15 palabras y tabla de opciones) y, en el
análisis cuantitativo, los rangos de Cenicafé desde las reglas.

**Laboratorio en pestañas** (V5.41): Captura · Rasgos · Lectura (con el contador de revisados) · Feedback (`verTab`,
recordada en `localStorage["ctc-croma-tab"]`). Veredictos con **N/A**; el rango corregido de Ford muestra qué significa
cada número y los rangos del programa y de la lectura. Al imprimir salen todas las pestañas, precedidas del **one-pager**
del informe del productor (`#labOnePager`, `pintarOnePager`, figura con prefijo «o») y un salto de página.

## 3. Mapa de archivos

| Archivo | Qué hace |
|---|---|
| `public/tools/cromatografia-suelo/cromatografia-suelo.html` | La herramienta entera (HTML + CSS + JS ES5, sin librerías). Dos caras, diálogos, figura SVG, firma, export, diccionarios `T.es/en/de` y definiciones `DEF`. El puente `ctc-bridge.js` es la última línea antes de `</body>`. |
| `public/tools/assets/cromatografia-rasgos.js` | Motor `croma-rasgos-1.2` (global `CromaRasgos`): compuerta + rasgos + Ford programático. Corre en el navegador y en los guardianes. |
| `public/tools/assets/cromatografia-reglas.json` | Copia **byte a byte** de `reglas.json` para el navegador. |
| `src/lib/tools/cromatografia/reglas.json` | **Reglas vivas v2.6**, de CTC (la v2.0 de `reference/` fue solo guía). Con `analisis_cuantitativo` (campos, límites de saneo y rangos bajo/medio/alto de Cenicafé con método y rango adecuado), `i18n.en/de` y `referentes` (documentación: quién es el referente y qué obras suyas se citan; el prompt no lo inyecta). |
| `src/lib/tools/cromatografia/prompt.ts` | `croma-prompt-1.8`: ensambla sistema y usuario desde las reglas; esquema de salida; idioma y análisis declarado. |
| `src/lib/tools/cromatografia/salida.ts` | Validación de la respuesta del modelo (ver §4). Puro. Léxicos EN/DE, `pareceEspanol`, contraste. |
| `src/app/api/herramientas/cromatografia/route.ts` | POST de la lectura: sesión, acceso, techo diario, saneo (idioma, análisis), llamada, validación, un reintento, registro de consumo. |
| `…/cromatografia/fincas/route.ts` | Fincas de la cuenta (sin coordenadas; `?superficie=cp` devuelve vacío) y `cuenta.nombre` (`profiles.full_name`) para «Preparada por». |
| `…/cromatografia/estado/route.ts` | Estado de las claves sin gastar tokens (`GET /v1/models`, caché 10 min, nunca devuelve la clave). |
| `public/tools/assets/cromatografia-ejemplos/ejemplo-{1,2,3}.jpg` | Fotos de ejemplo del «?». |
| `public/tools/assets/cromatografia-docs/CTCX-Croma-0{1,2,3}-*.pdf` | PDF de «Bibliografía y metodología», generados (edición 1.3). |
| `public/tools/assets/ctcx-{logo,loro,loro-claro}.png` | Marca CTCX de pie, cabecera e impresos. |
| `scripts/qa-cromatografia-check.mjs` | Guardián puro (294 comprobaciones). |
| `scripts/qa-cromatografia-modelo.mjs` | Prueba con el modelo real (gasta). `[imagen] [departamento] [corridas] [idioma] [lab]`. Escribe `<tmp>/croma-modelo-*.json`. |
| `scripts/build-cromatografia-docs.mjs` | Genera los 3 PDF desde reglas, motor y prompt. |
| `scripts/cromatografia-calibrar.mjs` | Pasa una carpeta de fotos por la compuerta y resume umbrales y fronteras. |
| `scripts/cromatografia-recorrido.mjs` | Recorrido visual completo en Chromium sin cabeza (dos temas). |
| `scripts/qa-tools-puente-conformance.mjs` | Conformidad del puente de todas las herramientas (campo centinela `#municipio`). |
| `public/images/herramientas/shots/cromatografia-suelo.jpg` | Captura del carrusel (`scripts/build-tool-shots.mjs`). |

En Supabase (proyecto `sjznkzvefqfcysczllli`): fila en `tools` y `tool_versions`; permisos por persona en
`tool_user_grants`; consumo en `ai_usage` con la vía `USOS.herramientasCromatografia`; lee `fincas`, `finca_parcelas` y
`profiles.full_name`. No hay tablas propias: los análisis son **trabajos del taller** guardados por el puente.

Fuera del repo (con derechos de terceros, **no se publica**):
`C:\dev\ctc-platforms\reference\html_tools\cromatografia-suelo\Analisis Cromatografico\` → `fuentes/INDEX.md` (26 PDF con nivel,
licencia y URL), `fuentes/HALLAZGOS.md` (verificación página a página contra las reglas), `fuentes/datasets/`
(Martins D2 `raw_448px.zip` para calibrar), la tesis de Lozano Vesga 2021 (#24 del INDEX, entregada por el owner), el
paquete original del owner (KICKOFF, PDF1, PDF2, JSON v2.0, mock) y `cromatografias_mock/` (origen de las fotos de ejemplo).

## 4. Flujo y contratos

1. **Compuerta** (navegador). Foto → lienzo de 900 px; la resolución se juzga sobre la original
   (`escalaOriginal: img.naturalWidth / lienzo`). Seis motivos en el orden de `image_validation_gate.reject_if`:
   `sin_circulo`, `nitidez` (≥ 10, varianza del laplaciano sobre radio 250 px), `resolucion` (≥ 500 px de diámetro
   original), `recorte`, `fondo` (L* ≥ 55, C* ≤ 18), `oblicua` (razón de ejes ≥ 0,80). El área del encuadre se
   informa y **no rechaza** (con papel de 15 cm nunca pasa del ~50 %).
2. **Rasgos** (navegador): perfil CIELAB de 50 anillos, 3 fronteras por máximo local con priors 0,15 · 0,5 · 0,8
   (`ZONAS_NOMINALES` = `zones[].relative_radius` de las reglas; lo exige el guardián), color y entropía por zona,
   radialidad, picos, irregularidad, intensidad, simetría, Ford programático. Definiciones en DOC-01 y en `DEF`.
3. **Lectura** (`POST /api/herramientas/cromatografia`): cuerpo `{imagen (1024 px), validacion, rasgos,
   ford_programatico, rasgos_version, idioma (es|en|de), contexto sin finca (+ analisis_cuantitativo)}`. Exige sesión,
   `puedeAbrir`, `validacion.valida === true` y el techo diario (20 por cuenta). El análisis declarado se sanea con los
   rangos de `reglas.analisis_cuantitativo.campos` (fuera de rango = se descarta). Modelo `CROMA_MODEL` o
   `claude-haiku-4-5-20251001`, temperatura 0, `max_tokens` 4500. Clave `CROMATOGRAPHY_ANTHROPIC_API_KEY` y, si falta,
   `ANTHROPIC_API_KEY` (la de toda la plataforma: no se retira). Respuesta `{ok, reporte, meta}` con
   `meta.idioma` y `meta.con_laboratorio`; 422 si la validación falla tras el reintento; `codigo: "sin-ia"` sin clave.
   El HTML traduce el `codigo` del error; el texto crudo es el respaldo.
4. **Prompt** (`prompt.ts`): en inglés o alemán el sistema pide el idioma al principio y al final, con los ejemplos de
   duda en ese idioma y las listas vetadas de `i18n`; el mensaje del usuario lleva el análisis declarado como «DATO
   del laboratorio, NO de la foto», con las etiquetas en el idioma pedido, y el esquema añade `contraste_laboratorio`.
5. **Validación** (`salida.ts`, `validarSalida(bruto, reglas, rasgos, regional, {idioma, conLaboratorio})`):
   afirmaciones prohibidas (con «no mide» permitido) en español **más** el léxico del idioma (`LEXICO.en/de`: cup,
   score, price, Tasse, Preis, misst…); lenguaje probabilístico y duda por idioma; fuentes solo de `source_levels` y
   nunca por encima de su nivel (varias fuentes → el nivel más conservador); una fuente C no suena institucional ni
   revisada por pares salvo para negarlo; confianza baja/media (alta se baja); coherencia con `radiality_index` por
   cláusula y zona (patrones por idioma); cara del productor: 2–5 conjeturas con `zona` (si falta, `zonaDesdeTexto`
   por idioma), `certeza` calculada por `certezaDe`, prácticas solo del catálogo (traducido desde `i18n`), ordenadas y
   al menos una, `confirmar` con laboratorio y repetir siempre al final, sin nutrientes (listas de todos los idiomas) ni
   jerga (lista del idioma pedido; el motivo del laboratorio está exento). **Idioma**: si se pidió inglés o alemán,
   cualquier campo que parezca español (`pareceEspanol`: dos palabras funcionales) es error. **Contraste**: obligatorio
   con análisis declarado (≥ 30 caracteres, probabilístico, sin taza ni precio, puede citar los valores declarados,
   **no puede calificarlos**: «pH bajo», «moderate organic matter», «acidic pH» junto a un parámetro se rechazan;
   «high colour intensity» describe la foto y pasa), descartado con nota si no hubo análisis. Los textos forzados
   (descargo, señal, certeza, etiquetas de nivel, regla regional) salen de `i18n` cuando no es español. Ids estables:
   `i` interpretaciones, `r` recomendaciones, `c` conjeturas, `a` acciones, `k` confirmar; `contraste` en el feedback.
6. **Guardado**: el trabajo es el estado `esquema: 2` (`sample_id`, `estado`, `idioma`, `miniatura` 560 px,
   `foto_ejemplo`, `validacion`, `rasgos`, `ford_programatico`, `contexto` (+ `analisis_cuantitativo`, `preparada_por`,
   `preparada_por_en_informe`), `lectura`, `meta`, `feedback`) vía `CTC.usarEstado`; límite 200 KB (si se pasa, cae la
   miniatura). Respaldo en `localStorage["ctc-croma-ultimo"]`. `restaurar` migra esquema 1, feedback sin
   `laboratorio`/`firma` y contextos sin análisis ni «preparada por». `preparada_por` se guarda solo si está marcado.
   La foto de 1024 px **no** se guarda.
7. **Feedback Técnico** exportado: `feedback-tecnico-<sample_id>.json`, `tipo: "feedback_tecnico"`, `esquema: 2`,
   con `idioma`, versiones, contexto (sin finca si no hubo consentimiento; con el análisis declarado), validación,
   rasgos, Ford, lectura, miniatura y `feedback = {laboratorio {nombre, rut}, tecnico {nombre, rol, firma (PNG
   dataURL), firmado_at}, general, items{<id>: {veredicto, comentario, rango_corregido}}, actualizado}`. Una lectura
   nueva conserva laboratorio y técnico pero borra firma e items. **Estos archivos son los que el owner traerá para
   refinar reglas y prompt; con el análisis declarado son el primer par croma–laboratorio.**
8. **Evento** al puente: `analisis.generado` sin nombre de finca, con `idioma` y `con_laboratorio`.
9. **Impresión**: `imprimir(cara)` inyecta en `#estiloImpresion` las cajas de margen `@page` (`@top-center` empresa y
   título, `@bottom-left` NIT y web, `@bottom-right` «Página n de N» con `counter(pages)`) en el idioma de la interfaz.
   Chrome y Edge las pintan; Firefox no, y queda la cabecera y el pie del documento (que también llevan empresa, NIT y web).

Versiones vivas: reglas **2.6** · motor **croma-rasgos-1.2** · prompt **croma-prompt-1.8** · estado **2** ·
feedback **2** · PDF edición **1.3**.

## 4b. El referente: Tulio Esteban Lozano Vesga

Desde V5.40, **Tulio Esteban Lozano Vesga** (UIS-IPRED, proyecto Campo Para Todos) es el referente de la cromatografía
cualitativa en la caficultura latinoamericana con que trabaja el Lector, y el experto con quien el owner tendrá
contacto para la parte técnica y académica. Su trabajo de grado (finca El Guacal, Barichara, 2021, laboratorio
Cenicafé pareado) es la fuente `Lozano Vesga 2021 (café, Barichara, Santander)`, nivel **B** (tesis de pregrado, n
pequeño, lecturas de Restrepo y Pinheiro); dirigió la tesis `UIS 2026 (café, Guadalupe, Santander)`. Dónde aparece:
`reglas.referentes` (perfil, obras con URL y nivel, nota de no respaldo), `source_levels` y las fuentes de zona central,
cuatro lecturas de color, salvedad de la dilución, protocolo y prácticas fijas; en el HTML, el bloque `#referente` al
abrir «Bibliografía y metodología» (claves `d.ref.*` en los tres idiomas), el resumen del método (`d.met.4`) y el pie;
en los PDF, `parrafoReferente` (DOC-02 §11) y DOC-03 §5. **Trato**: se le cita con el nivel de cada obra, nada suyo se
reproduce, y siempre se dice que nombrarlo no implica que respalde la herramienta ni que participe en ella. El
guardián lo comprueba (bloque V5.40).

## 5. Cómo cambiar cada cosa

- **Reglas** (`reglas.json`): edita la de `src/lib/…`, cópiala idéntica a `public/tools/assets/cromatografia-reglas.json`,
  sube `$schema_version` y añade su `changelog_v*`. Si cambias `zones[].relative_radius`, cambia `ZONAS_NOMINALES` del
  motor. Todo texto que el servidor ponga por su cuenta (catálogo, señales, certezas, descargos, etiquetas, reglas
  regionales, compuerta) necesita su traducción en `i18n.en` y `i18n.de` (el guardián lo exige para el catálogo, las
  señales, las certezas, los descargos y las listas). Luego guardián, prueba con el modelo en los tres idiomas y
  regenera los PDF.
- **Prompt** (`prompt.ts`): sube `PROMPT_VERSION`. Corre `qa-cromatografia-modelo` en **es, en y de**, con y sin `lab`,
  y **lee los informes**, no solo si pasan: los controles pueden pasar con lecturas deshonestas, y en inglés y alemán
  el modelo mezcla idiomas o califica el laboratorio con más frecuencia. Cuidado al reemplazar trozos: una vez se
  borraron en silencio las frases de palabras vetadas (el guardián lo atrapó).
- **Validación** (`salida.ts`): cada regla nueva lleva su caso `mal(...)` (y `malEn(...)`) en el guardián, y el mensaje
  de error debe citar la frase culpable para que el reintento del modelo la corrija. Un patrón nuevo de prohibición va
  en `PATRONES_PROHIBIDOS` (español, siempre) y en `LEXICO.en/de`. Los tokens cortos de las listas vetadas exigen fin de
  palabra (`patronDePalabras`): «photo» no es «pH».
- **Textos de la interfaz** (HTML): cada elemento estático lleva `data-t="clave"` (o `data-t-attr="atributo:clave|…"`)
  y el JS pide `t("clave")`. Toda clave nueva va en `T.es`, `T.en` y `T.de` (el guardián exige paridad exacta y que
  no haya claves usadas sin definir). Las claves `api.<codigo>` traducen los errores del handler. Textos en palabras
  del campo; el guardián pasa el diálogo «?» en los tres idiomas por las listas vetadas de su idioma. Los botones de
  acción van abajo a la derecha; los acordeones nacen cerrados.
- **Definiciones «i»**: `DEF.formulas[clave]` (texto, o `{es, en, de}` si lleva palabras), `DEF.simbolos[clave]` (claves de
  `SIMB`), `DEF.diag[clave]` (qué dibuja) y `DEF.es/en/de[clave] = {t, q, r}`. Todo símbolo nuevo va a `SIMB` en los tres
  idiomas; el guardián detecta cualquier símbolo de una fórmula que falte en su leyenda. Un botón: `botonDef("clave")` o
  `<button class="i-def" data-def="clave">`. Si cambias un cálculo del motor, cambia su fórmula aquí y en DOC-01.
- **Análisis cuantitativo**: campos y rangos en `reglas.analisis_cuantitativo.campos` (el handler sanea con ellos);
  inputs `#q<clave>` en el HTML, `CAMPOS_Q`, `UNIDAD_CUANT`; etiquetas traducidas en `i18n.*.analisis_cuantitativo.campos`.
- **Compuerta o rasgos** (`cromatografia-rasgos.js`): sube `VERSION`, recalibra (§6) y actualiza las cifras fijas de
  DOC-03 en `build-cromatografia-docs.mjs` (tablas de la sección 2) y las fórmulas de `DEF` antes de regenerar.
- **Fotos de ejemplo**: reemplaza `ejemplo-1..3.jpg` con los **mismos nombres** (JPEG, < 120 KB, lado ~900–1000 px),
  comprueba que pasan con `node scripts/cromatografia-calibrar.mjs public/tools/assets/cromatografia-ejemplos 1` y
  ajusta las etiquetas `d.ej.1..3` en los tres diccionarios. Si agregas o quitas una, el guardián espera 3.
- **Recursos de «Bibliografía y metodología»**: lista `<ol class="recursos">` en `#dlgMetodo` (cada ítem con
  `<span class="lic">`; el guardián pide ≥ 15). Bibliografía de los PDF: en `build-cromatografia-docs.mjs`.
- **PDF de metodología**: `node scripts/build-cromatografia-docs.mjs` (sube `EDICION` si cambia el texto). Todo lo
  versionado se lee del código; el texto y el aviso legal viven en el script. Revisa el resultado rasterizando páginas
  (PyMuPDF está instalado).
- **Impresión**: cabecera `.impreso-cabecera` (con `<span class="empresa">`) y pie `.impreso-pie` (+ `pieLegal()`) en
  las dos caras; cajas de margen en `estiloImpresion(cara)`; textos `pr.*` del diccionario.
- **Tema**: tokens CSS en `:root` (claro) y en los dos bloques oscuros (`prefers-color-scheme` y `[data-theme="dark"]`),
  que deben quedar iguales; el guardián exige fondo oscuro `#451D96`.
- **Figura anotada**: `dibujarFigura(conjeturas, pref)` con `pref` «p» (productor) o «l» (laboratorio); los ids
  `p-flecha`/`l-flecha` y `p-recorte`/`l-recorte` deben ser únicos porque las dos figuras viven a la vez.

## 6. Verificar

```bash
node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/qa-cromatografia-check.mjs
node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/qa-cromatografia-modelo.mjs "" Santander 2 es 1
node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/qa-cromatografia-modelo.mjs "" Caldas 2 en 1
node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/qa-cromatografia-modelo.mjs "" Huila 2 de 0
node scripts/cromatografia-recorrido.mjs
node scripts/cromatografia-calibrar.mjs "<carpeta con raw_448px>" 18.07
node scripts/build-cromatografia-docs.mjs
```

- El guardián **necesita** el cargador TS (sin él falla importando `prompt.ts`).
- La prueba del modelo gasta (≈ US$ 0,02 por lectura; el doble con reintento) y usa la clave de `.env.local`. Los
  argumentos: `[imagen]` (vacío = croma sintético), `[departamento]`, `[corridas]`, `[idioma]` es|en|de, `[lab]` 1
  declara un análisis de laboratorio.
- Una prueba de humo del HTML sin gasto: servir `public/` con `page.route` en Playwright (como hace el recorrido),
  cambiar de idioma, abrir una «i», llenar el análisis y «preparada por», cargar una foto de ejemplo e inyectar la
  última lectura de `<tmp>/croma-modelo-*.json` por el `init` del puente; sin errores de página.
- Conformidad del puente: `qa-tools-puente-conformance.mjs` con `CONF_BASE` apuntando a un servidor que sirva
  `public/` (p. ej. `npx next dev -p 3210`).
- Compuerta de la casa antes de entregar (AGENTS.md): `npx tsc --noEmit`, `npx eslint src` (8 avisos de base),
  `npm run build`, los guardianes tocados, `qa-encoding-check`, `qa-changelog-check`, `qa-arqlog-check`; luego
  `APP_VERSION` + CHANGELOG + asiento en `docs/architecture/Log_Documentacion_Interactiva_V42.txt`, commit con rutas
  explícitas, sello del sha, push y `curl -L https://ctcexport.com` hasta ver `V5.NN · build <sha>`.
- Estado de las claves en producción, sin gastar: `GET /api/herramientas/cromatografia/estado`.

## 7. Puntos abiertos (en orden)

1. **Revisión experta**: nadie de laboratorio ha revisado reglas v2.5 ni el catálogo de prácticas. Es lo primero que
   corregirá el Feedback Técnico. Candidato natural: Lozano Vesga (§4b); antes de cualquier demo, contarle que está
   citado y cómo. Revisar el tono de 3 informes reales antes de cualquier demo (Tecnicafé, CQI).
2. **Traducciones**: inglés y alemán (interfaz, definiciones, catálogo, descargos, listas vetadas) los escribió la IA;
   falta un hablante nativo. Los PDF de metodología siguen solo en español.
3. **Fotos de ejemplo**: son públicas de internet, de autoría no rastreada (decisión del owner, 2026-09-13); el owner
   las cambiará pronto por cromas propios. Ver §5 para reemplazarlas.
4. **Calibrar con fotos de móvil** del protocolo CTC: la compuerta 1.2 se calibró con capturas de laboratorio
   (Martins D2, 108/108 pasan) y las 3 fotos de ejemplo.
5. **Contraste con el laboratorio**: hoy solo lo ve el laboratorio. Decidir con el owner si el productor debe recibir
   una frase de contraste sin nutrientes. En inglés y alemán el modelo falla más al primer intento (mezcla idiomas,
   califica el laboratorio, cuela el valor declarado en la imagen); la validación lo devuelve y a veces llega un 422.
6. **Feedback Técnico a tabla** cuando haya volumen (`croma_feedback`, service-role-only) y **restringir la cara del
   laboratorio** a técnicos con permiso por persona desde ECP · Herramientas (hoy la ve cualquiera con la herramienta).
7. **Impresión desde el móvil**: «Página n de N», NIT y razón social en los márgenes dependen de las cajas de margen
   `@page` (Chrome 131+, Edge). Probar en los móviles del owner.
8. **Aviso legal de los PDF**: redactado por la IA, pendiente de revisión por un abogado. Regenerar los PDF cuando
   cambien reglas, motor o prompt (el guardián solo comprueba que existen).
9. **Identificación**: la firma es dibujada y el RUT solo se valida con el dígito; si el feedback llega a tener valor
   legal, firma digital certificada y verificación del RUT.
10. **Sugerencia abierta, sin aprobar**: dataset propio `croma_muestras` + bucket, con consentimiento, pareando croma y
    laboratorio. El análisis declarado en el Feedback Técnico es la semilla.
11. **Andisoles**: ninguna fuente abierta los estudia; las reglas regionales son hipótesis razonadas.

## 8. Decisiones del owner que siguen en pie

- El juicio de CTC manda sobre el JSON inicial del paquete (2026-09-13).
- La compuerta juzga «la capacidad de tomar bien la foto»; el 40 % de área útil se sustituyó por resolución y
  perpendicularidad (delegado).
- Dos caras: productor principal y sencillo; laboratorio técnico que exporta Feedback Técnico.
- Laboratorio y repetir el croma nunca como primer consejo; conjeturas con certeza y lo que implicarían, sin inventar
  soluciones.
- La foto anotada abre el informe; el morado claro de CTCX en modo oscuro; identificación del laboratorio con firma;
  «?» para el productor y «Bibliografía y metodología» para el laboratorio con 3 PDF protegidos.
- Tres idiomas, PDF con razón social, NIT y páginas, «Preparada por», «i» de definiciones y análisis cuantitativo
  declarado (2026-09-13). Lozano Vesga como referente, reflejado y validado, nunca aprovechado (2026-09-13). El análisis del laboratorio no convierte la lectura en interpretación de nutrientes: se
  contrasta en la cara técnica y el productor ve sus propios valores.
- Reglas de la casa: repo **público** (nunca rutas con usuario ni claves en código), commits con rutas explícitas,
  las consolas no se manejan en navegador, las claves nunca se imprimen, las obras de terceros quedan fuera del repo.

## 9. Lecciones

- Calibrar con datos reales antes de publicar: la compuerta 1.0 rechazaba 108/108 capturas buenas.
- Un máximo en el borde de la ventana no es frontera (era la perforación o el fondo entre picos).
- El modelo escribe palabras vetadas incluso negándolas: la lista debe ir literal en la instrucción («ni siquiera para
  negarlas»); y cita dos fuentes con nivel «A/B»: se acepta con el más conservador. Pero una fuente C que **niega** la
  validación por pares es honesta y debe pasar.
- Pedido otro idioma, Haiku mezcla: con ejemplos de duda en español («parece, puede que») escribía el resumen y los
  títulos en español y las conjeturas en alemán. Los ejemplos y las señales van en el idioma pedido, la instrucción va
  al principio y al final, y la validación rechaza campos en español (`pareceEspanol`).
- Un patrón de «principio de palabra» con tokens cortos muerde: «photo» caía por «pH». Los tokens de ≤ 4 letras exigen
  fin de palabra.
- Con un análisis de laboratorio a la vista, el modelo tiende a calificarlo («moderate», «acidic») y a colar el valor en
  la lectura de la imagen. Se prohíbe en el prompt con ejemplos y se rechaza en la validación (calificador pegado a un
  parámetro; el «% de materia orgánica» en una interpretación sigue siendo claim prohibido).
- «Foto» existe en alemán: no sirve como palabra funcional del español para detectar mezcla de idiomas.
- `scripts/vendor-tool-assets.mjs` reescribe OTRAS herramientas (rueda v23, cogs): revertirlas si se corre.
- Los heredocs de bash rompen barras invertidas: los scripts de edición se escriben como archivo.
- En Playwright, `page.request` no pasa por `context.route` (usa `fetch` dentro de la página), y un lienzo debe estar a
  la vista antes de dibujar con el mouse. Un script fuera del repo no resuelve `playwright`: cópialo a `scripts/`.
- El panel de vista previa del escritorio no pinta: capturas y PDF, con Chromium sin cabeza.

## 10. Kick-off para una sesión nueva

```
Trabajas SOLO en el componente «Herramientas del Café» (clave: herramientas-cafe) de la plataforma CTC
(repo C:\dev\ctc-platforms\ctc-platform, rama main), y dentro de él en LA HERRAMIENTA cromatografia-suelo
(Lector de Cromatografía de Suelo, en producción desde V5.41).
Antes de tocar nada lee, en este orden:
1. src/lib/tools/cromatografia/README.md   ← esta guía: lo construido, contratos, cómo cambiar y puntos abiertos
2. docs/componentes/herramientas-cafe.md   ← el charter del componente («Pendientes»)
3. docs/componentes/briefs/herramientas-cafe-cromatografia-suelo.md ← el porqué de cada versión, si lo necesitas
4. docs/ALINEACION.md §3 y AGENTS.md       ← contratos transversales, la compuerta y las reglas de la casa
La regla de oro manda: cualitativo y probabilístico, nunca taza ni precio, nunca nutrientes ni acidez al productor,
laboratorio siempre pero nunca primero. Corre el guardián antes y después de cambiar
(node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/qa-cromatografia-check.mjs).
Al terminar: compuerta completa, APP_VERSION + CHANGELOG + asiento del log, sello, push, verificación en vivo,
y esta guía, el brief y los «Pendientes» del charter al día.
Hoy: <la tarea>.
```
