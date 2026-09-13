# Lector de Cromatografía de Suelo · guía de trabajo

Estado al 2026-09-13: **V5.38 en producción** (build `4add333`). Herramienta `cromatografia-suelo` del componente
**herramientas-cafe**, plan **plus**. Esta guía basta para entender lo construido y cambiarlo sin releer las
sesiones anteriores. La historia de cada decisión está en el brief
(`docs/componentes/briefs/herramientas-cafe-cromatografia-suelo.md`, un acta por versión, V5.32–V5.38) y el estado del
componente en su charter (`docs/componentes/herramientas-cafe.md`, «Pendientes»).

---

## 1. Qué es y la regla de oro

Lee la foto de un cromatograma circular de Pfeiffer de un suelo cafetero y produce dos informes: uno sencillo y
accionable para el **productor** (campesino, usuario principal) y uno técnico para el **laboratorio**, que revisa la
lectura y la devuelve como **Feedback Técnico** para refinar el modelo.

La regla de oro, que manda sobre cualquier pedido:
- La cromatografía es **cualitativa**: lenguaje probabilístico siempre; nunca medición científica, certificación ni
  equivalente a laboratorio.
- **Nunca** se vincula con calidad en taza, puntaje SCA/CVA, catación o precio.
- La foto **no ve nutrientes ni acidez**: no se inventan cifras, y en la cara del productor ni se nombran
  (potasio, fósforo, pH, acidez, nitrógeno…). El owner pidió una vez «potasio bajo → mezclar…» y se decidió NO hacerlo.
- El **descargo obligatorio** sale de las reglas, nunca lo escribe el modelo.
- Recomendar laboratorio o repetir el croma **siempre**, pero **nunca como primer consejo** (van al final).
- Al modelo no llegan el nombre de la finca ni coordenadas; el nombre de la finca se guarda solo con consentimiento.
  Dentro de Cherry Picked no se ofrecen fincas.

## 2. Lo que ve cada usuario

**Productor** (cara por defecto)
1. Paso 1, la foto: consejos, subir o tomar la foto. La **compuerta** dice en palabras del campo si sirve y cómo
   repetirla. El botón **«?» amarillo** (arriba a la derecha) explica qué es la cromatografía: 5 puntos, un dibujo y un
   cierre, más **3 fotos de ejemplo** que pasan por la misma compuerta y quedan marcadas como ejemplo.
2. Paso 2, datos: finca y lote (de su cuenta si las tiene), departamento, manejo, fecha, prácticas; «Más datos»:
   municipio, altitud, variedad, papel, dilución de NaOH, días desde el revelado; consentimiento.
3. Paso 3, «Leer mi suelo · ≈ US$ 0,02».
4. Informe: **foto anotada** (un número y una flecha por conjetura) → señal (buena/mixta/atención) → resumen →
   **conjeturas** (lo que se ve · podría significar · también podría ser · si es así · certeza baja/media) →
   **prácticas** por prioridad → «Para confirmar y seguir el avance» (laboratorio y repetir, plegados) → descargo.
   PDF por impresión del navegador con cabecera y pie CTCX.

**Laboratorio**
- Compuerta con sus valores y las fronteras dibujadas sobre la foto; contexto y protocolo; rasgos medidos sin IA;
  escala de Ford programática.
- Lectura técnica: la misma **foto anotada** (con «c1 · zona orgánica»), descripción visual, escala de Ford con rango,
  cadena de evidencia (i1…), contexto regional, recomendaciones (r1…), y la revisión del informe del productor
  (c1…, a1…, k1…). Cada elemento tiene veredicto + comentario (y rango corregido en Ford).
- Feedback técnico: **identificación del laboratorio** (institución, RUT con aviso de dígito DIAN, técnico, cargo,
  firma dibujada), valoración general, «Imprimir feedback (PDF)», «Exportar Feedback Técnico (.json)». El botón
  **«i» verde** (abajo a la izquierda) abre el método en ~150 palabras, un acordeón de recursos con licencias y otro
  con los **3 PDF de metodología**.

## 3. Mapa de archivos

| Archivo | Qué hace |
|---|---|
| `public/tools/cromatografia-suelo.html` | La herramienta entera (HTML + CSS + JS ES5, sin librerías). Dos caras, diálogos, figura SVG, firma, export. El puente `ctc-bridge.js` es la última línea antes de `</body>`. |
| `public/tools/assets/cromatografia-rasgos.js` | Motor `croma-rasgos-1.2` (global `CromaRasgos`): compuerta + rasgos + Ford programático. Corre en el navegador y en los guardianes. |
| `public/tools/assets/cromatografia-reglas.json` | Copia **byte a byte** de `reglas.json` para el navegador. |
| `src/lib/tools/cromatografia/reglas.json` | **Reglas vivas v2.3**, de CTC (la v2.0 de `reference/` fue solo guía). |
| `src/lib/tools/cromatografia/prompt.ts` | `croma-prompt-1.7`: ensambla sistema y usuario desde las reglas; esquema de salida. |
| `src/lib/tools/cromatografia/salida.ts` | Validación de la respuesta del modelo (ver §4). Puro. |
| `src/app/api/herramientas/cromatografia/route.ts` | POST de la lectura: sesión, acceso, techo diario, llamada, validación, un reintento, registro de consumo. |
| `…/cromatografia/fincas/route.ts` | Fincas de la cuenta (sin coordenadas; `?superficie=cp` devuelve vacío). |
| `…/cromatografia/estado/route.ts` | Estado de las claves sin gastar tokens (`GET /v1/models`, caché 10 min, nunca devuelve la clave). |
| `public/tools/assets/cromatografia-ejemplos/ejemplo-{1,2,3}.jpg` | Fotos de ejemplo del «?». |
| `public/tools/assets/cromatografia-docs/CTCX-Croma-0{1,2,3}-*.pdf` | PDF del «i», generados. |
| `public/tools/assets/ctcx-{logo,loro,loro-claro}.png` | Marca CTCX de pie, cabecera e impresos. |
| `scripts/qa-cromatografia-check.mjs` | Guardián puro (213 comprobaciones). |
| `scripts/qa-cromatografia-modelo.mjs` | Prueba con el modelo real (gasta). Escribe `<tmp>/croma-modelo-*.json`. |
| `scripts/build-cromatografia-docs.mjs` | Genera los 3 PDF desde reglas, motor y prompt. |
| `scripts/cromatografia-calibrar.mjs` | Pasa una carpeta de fotos por la compuerta y resume umbrales y fronteras. |
| `scripts/cromatografia-recorrido.mjs` | Recorrido visual completo en Chromium sin cabeza (dos temas). |
| `scripts/qa-tools-puente-conformance.mjs` | Conformidad del puente de todas las herramientas (campo centinela `#municipio`). |
| `public/images/herramientas/shots/cromatografia-suelo.jpg` | Captura del carrusel (`scripts/build-tool-shots.mjs`). |

En Supabase (proyecto `sjznkzvefqfcysczllli`): fila en `tools` y `tool_versions`; permisos por persona en
`tool_user_grants`; consumo en `ai_usage` con la vía `USOS.herramientasCromatografia`; lee `fincas` y `finca_parcelas`.
No hay tablas propias: los análisis son **trabajos del taller** guardados por el puente.

Fuera del repo (con derechos de terceros, **no se publica**):
`C:\dev\ctc-platforms\reference\html_tools\Analisis Cromatografico\` → `fuentes/INDEX.md` (26 PDF con nivel,
licencia y URL), `fuentes/HALLAZGOS.md` (verificación página a página contra las reglas), `fuentes/datasets/`
(Martins D2 `raw_448px.zip` para calibrar), el paquete original del owner (KICKOFF, PDF1, PDF2, JSON v2.0, mock) y
`cromatografias_mock/` (origen de las fotos de ejemplo).

## 4. Flujo y contratos

1. **Compuerta** (navegador). Foto → lienzo de 900 px; la resolución se juzga sobre la original
   (`escalaOriginal: img.naturalWidth / lienzo`). Seis motivos en el orden de `image_validation_gate.reject_if`:
   `sin_circulo`, `nitidez` (≥ 10, varianza del laplaciano sobre radio 250 px), `resolucion` (≥ 500 px de diámetro
   original), `recorte`, `fondo` (L* ≥ 55, C* ≤ 18), `oblicua` (razón de ejes ≥ 0,80). El área del encuadre se
   informa y **no rechaza** (con papel de 15 cm nunca pasa del ~50 %).
2. **Rasgos** (navegador): perfil CIELAB de 50 anillos, 3 fronteras por máximo local con priors 0,15 · 0,5 · 0,8
   (`ZONAS_NOMINALES` = `zones[].relative_radius` de las reglas; lo exige el guardián), color y entropía por zona,
   radialidad, picos, irregularidad, intensidad, simetría, Ford programático. Definiciones en DOC-01.
3. **Lectura** (`POST /api/herramientas/cromatografia`): cuerpo `{imagen (1024 px), validacion, rasgos,
   ford_programatico, rasgos_version, contexto sin finca}`. Exige sesión, `puedeAbrir`, `validacion.valida === true`
   y el techo diario (20 por cuenta). Modelo `CROMA_MODEL` o `claude-haiku-4-5-20251001`, temperatura 0,
   `max_tokens` 4500. Clave `CROMATOGRAPHY_ANTHROPIC_API_KEY` y, si falta, `ANTHROPIC_API_KEY` (la de toda la
   plataforma: no se retira). Respuesta `{ok, reporte, meta}`; 422 si la validación falla tras el reintento;
   `codigo: "sin-ia"` sin clave.
4. **Validación** (`salida.ts`): afirmaciones prohibidas (con «no mide» permitido); lenguaje probabilístico;
   fuentes solo de `source_levels` y nunca por encima de su nivel (varias fuentes → el nivel más conservador);
   confianza baja/media (alta se baja); coherencia con `radiality_index` por cláusula y zona; cara del productor:
   2–5 conjeturas con `zona` (si falta, `zonaDesdeTexto`), `certeza` calculada por `certezaDe` (media solo si una
   interpretación que la sustenta es confianza media y nivel A/B), prácticas solo del catálogo, ordenadas y al
   menos una, `confirmar` con laboratorio y repetir siempre al final, sin nutrientes ni jerga (el motivo de la
   práctica de laboratorio está exento). Ids estables: `i` interpretaciones, `r` recomendaciones, `c` conjeturas,
   `a` acciones, `k` confirmar.
5. **Guardado**: el trabajo es el estado `esquema: 2` (`sample_id`, `estado`, `miniatura` 560 px, `foto_ejemplo`,
   `validacion`, `rasgos`, `ford_programatico`, `contexto`, `lectura`, `meta`, `feedback`) vía `CTC.usarEstado`;
   límite 200 KB (si se pasa, cae la miniatura). Respaldo en `localStorage["ctc-croma-ultimo"]`. `restaurar` migra
   esquema 1 y feedback sin `laboratorio`/`firma`. La foto de 1024 px **no** se guarda.
6. **Feedback Técnico** exportado: `feedback-tecnico-<sample_id>.json`, `tipo: "feedback_tecnico"`, `esquema: 2`,
   con versiones, contexto (sin finca si no hubo consentimiento), validación, rasgos, Ford, lectura, miniatura y
   `feedback = {laboratorio {nombre, rut}, tecnico {nombre, rol, firma (PNG dataURL), firmado_at}, general,
   items{<id>: {veredicto, comentario, rango_corregido}}, actualizado}`. Una lectura nueva conserva laboratorio y
   técnico pero borra firma e items. **Estos archivos son los que el owner traerá para refinar reglas y prompt.**
7. **Evento** al puente: `analisis.generado` sin nombre de finca.

Versiones vivas: reglas **2.3** · motor **croma-rasgos-1.2** · prompt **croma-prompt-1.7** · estado **2** ·
feedback **2** · PDF edición **1.0**.

## 5. Cómo cambiar cada cosa

- **Reglas** (`reglas.json`): edita la de `src/lib/…`, cópiala idéntica a `public/tools/assets/cromatografia-reglas.json`,
  sube `$schema_version` y añade su `changelog_v*`. Si cambias `zones[].relative_radius`, cambia `ZONAS_NOMINALES` del
  motor. Luego guardián, prueba con el modelo y regenera los PDF.
- **Prompt** (`prompt.ts`): sube `PROMPT_VERSION`. Corre `qa-cromatografia-modelo` y **lee el informe**, no solo si
  pasa: los controles pueden pasar con lecturas deshonestas. Cuidado al reemplazar trozos: una vez se borraron en
  silencio las frases de palabras vetadas (el guardián lo atrapó).
- **Validación** (`salida.ts`): cada regla nueva lleva su caso `mal(...)` en el guardián, y el mensaje de error debe
  citar la frase culpable para que el reintento del modelo la corrija.
- **Compuerta o rasgos** (`cromatografia-rasgos.js`): sube `VERSION`, recalibra (§6) y actualiza las cifras fijas de
  DOC-03 en `build-cromatografia-docs.mjs` (tablas de la sección 2) antes de regenerar.
- **Cara del productor** (HTML): textos en palabras del campo; el guardián pasa el diálogo «?» por las listas
  `prohibido_nombrar` y `palabras_tecnicas_prohibidas`. Los botones de acción van abajo a la derecha; los acordeones
  nacen cerrados.
- **Fotos de ejemplo**: reemplaza `ejemplo-1..3.jpg` con los **mismos nombres** (JPEG, < 120 KB, lado ~900–1000 px),
  comprueba que pasan con `node scripts/cromatografia-calibrar.mjs public/tools/assets/cromatografia-ejemplos 1` y
  ajusta las etiquetas («compost», «lámina», «bocashi») en `#dlgCroma`. Si agregas o quitas una, el guardián espera 3.
- **Recursos del «i»**: lista `<ol class="recursos">` en `#dlgMetodo` (cada ítem con `<span class="lic">`; el guardián
  pide ≥ 15). Bibliografía de los PDF: en `build-cromatografia-docs.mjs`.
- **PDF de metodología**: `node scripts/build-cromatografia-docs.mjs`. Todo lo versionado se lee del código; el texto
  y el aviso legal viven en el script. Revisa el resultado rasterizando páginas (PyMuPDF está instalado).
- **Tema**: tokens CSS en `:root` (claro) y en los dos bloques oscuros (`prefers-color-scheme` y `[data-theme="dark"]`),
  que deben quedar iguales; el guardián exige fondo oscuro `#451D96`.
- **Figura anotada**: `dibujarFigura(conjeturas, pref)` con `pref` «p» (productor) o «l» (laboratorio); los ids
  `p-flecha`/`l-flecha` y `p-recorte`/`l-recorte` deben ser únicos porque las dos figuras viven a la vez.

## 6. Verificar

```bash
node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/qa-cromatografia-check.mjs
node scripts/qa-cromatografia-modelo.mjs
node scripts/cromatografia-recorrido.mjs
node scripts/cromatografia-calibrar.mjs "<carpeta con raw_448px>" 18.07
node scripts/build-cromatografia-docs.mjs
```

- El guardián **necesita** el cargador TS (sin él falla importando `prompt.ts`).
- La prueba del modelo gasta (≈ US$ 0,02 por lectura) y usa la clave de `.env.local`.
- Conformidad del puente: `qa-tools-puente-conformance.mjs` con `CONF_BASE` apuntando a un servidor que sirva
  `public/` (p. ej. `npx next dev -p 3210`).
- Compuerta de la casa antes de entregar (AGENTS.md): `npx tsc --noEmit`, `npx eslint src` (8 avisos de base),
  `npm run build`, los guardianes tocados, `qa-encoding-check`, `qa-changelog-check`, `qa-arqlog-check`; luego
  `APP_VERSION` + CHANGELOG + asiento en `docs/architecture/Log_Documentacion_Interactiva_V42.txt`, commit con rutas
  explícitas, sello del sha, push y `curl -L https://ctcexport.com` hasta ver `V5.NN · build <sha>`.
- Estado de las claves en producción, sin gastar: `GET /api/herramientas/cromatografia/estado`.

## 7. Puntos abiertos (en orden)

1. **Revisión experta**: nadie de laboratorio ha revisado reglas v2.3 ni el catálogo de prácticas. Es lo primero que
   corregirá el Feedback Técnico. Revisar el tono de 3 informes reales antes de cualquier demo (Tecnicafé, CQI).
2. **Fotos de ejemplo**: son públicas de internet, de autoría no rastreada (decisión del owner, 2026-09-13); el owner
   las cambiará pronto por cromas propios. Ver §5 para reemplazarlas.
3. **Calibrar con fotos de móvil** del protocolo CTC: la compuerta 1.2 se calibró con capturas de laboratorio
   (Martins D2, 108/108 pasan) y las 3 fotos de ejemplo.
4. **Feedback Técnico a tabla** cuando haya volumen (`croma_feedback`, service-role-only) y **restringir la cara del
   laboratorio** a técnicos con permiso por persona desde ECP · Herramientas (hoy la ve cualquiera con la herramienta).
5. **Aviso legal de los PDF**: redactado por la IA, pendiente de revisión por un abogado. Regenerar los PDF cuando
   cambien reglas, motor o prompt (el guardián solo comprueba que existen).
6. **Identificación**: la firma es dibujada y el RUT solo se valida con el dígito; si el feedback llega a tener valor
   legal, firma digital certificada y verificación del RUT.
7. **Sugerencia abierta, sin aprobar**: dataset propio `croma_muestras` + bucket, con consentimiento, pareando croma y
   laboratorio. El owner no tiene hoy un dataset probado.
8. **Andisoles**: ninguna fuente abierta los estudia; las reglas regionales son hipótesis razonadas.

## 8. Decisiones del owner que siguen en pie

- El juicio de CTC manda sobre el JSON inicial del paquete (2026-09-13).
- La compuerta juzga «la capacidad de tomar bien la foto»; el 40 % de área útil se sustituyó por resolución y
  perpendicularidad (delegado).
- Dos caras: productor principal y sencillo; laboratorio técnico que exporta Feedback Técnico.
- Laboratorio y repetir el croma nunca como primer consejo; conjeturas con certeza y lo que implicarían, sin inventar
  soluciones.
- La foto anotada abre el informe; el morado claro de CTCX en modo oscuro; identificación del laboratorio con firma;
  «?» para el productor y «i» para el laboratorio con 3 PDF protegidos.
- Reglas de la casa: repo **público** (nunca rutas con usuario ni claves en código), commits con rutas explícitas,
  las consolas no se manejan en navegador, las claves nunca se imprimen, las obras de terceros quedan fuera del repo.

## 9. Lecciones

- Calibrar con datos reales antes de publicar: la compuerta 1.0 rechazaba 108/108 capturas buenas.
- Un máximo en el borde de la ventana no es frontera (era la perforación o el fondo entre picos).
- El modelo escribe palabras vetadas incluso negándolas: la lista debe ir literal en la instrucción («ni siquiera para
  negarlas»); y cita dos fuentes con nivel «A/B»: se acepta con el más conservador.
- `scripts/vendor-tool-assets.mjs` reescribe OTRAS herramientas (rueda v23, cogs): revertirlas si se corre.
- Los heredocs de bash rompen barras invertidas: los scripts de edición se escriben como archivo.
- En Playwright, `page.request` no pasa por `context.route` (usa `fetch` dentro de la página), y un lienzo debe estar a
  la vista antes de dibujar con el mouse.
- El panel de vista previa del escritorio no pinta: capturas y PDF, con Chromium sin cabeza.

## 10. Kick-off para una sesión nueva

```
Trabajas SOLO en el componente «Herramientas del Café» (clave: herramientas-cafe) de la plataforma CTC
(repo C:\dev\ctc-platforms\ctc-platform, rama main), y dentro de él en LA HERRAMIENTA cromatografia-suelo
(Lector de Cromatografía de Suelo, en producción desde V5.38).
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
