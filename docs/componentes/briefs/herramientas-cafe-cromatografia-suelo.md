# Brief · Lector de Cromatografía de Suelo  (componente: herramientas-cafe · id: `cromatografia-suelo` · 2026-09-12)

> Acta de origen de la herramienta. Fuente del owner: `C:\dev\ctc-platforms\reference\html_tools\Analisis Cromatografico\`
> (KICKOFF v2, PDF1 validez científica, PDF2 atlas y taxonomía, `interpretation_rules.json` v2.0, maqueta HTML).
> Estado: **aprobado** por el owner el 2026-09-12 («si a todo») · primera tanda construida en **V5.32** (2026-09-13).
> Lo construido y lo aprendido está al final, en «Acta de construcción».

**Qué es** — Una herramienta que recibe la FOTO de una cromatografía de suelo tipo Pfeiffer más el contexto de la
finca (departamento, manejo, altitud, prácticas recientes) y devuelve un reporte justificado: descripción visual
objetiva, rasgos medidos, escala morfológica de Ford (1–5, como rango), lectura tentativa con fuente y nivel de
evidencia (A/B/C) por observación, contexto regional aplicado, recomendaciones de manejo y el descargo obligatorio.
Regla de oro (PDF1 §3/§7, `language_policy`): la técnica es cualitativa y no validada de forma consistente (Ford
2021, n=343); la herramienta **nunca** presenta sus salidas como medición ni las vincula con la taza.

**Para quién** — El **productor** de Kaffetal Regal (monitoreo de su propio suelo a lo largo del tiempo, transición
orgánica) y el **experto** del Directorio del Café (agrónomos que acompañan fincas). Candidata de la Suite con
Tecnicafé/CQI: el tono importa más que en cualquier otra herramienta.

**Ficha para `tools`**

| Campo | Valor propuesto |
|---|---|
| `id` | `cromatografia-suelo` |
| `nombre` | Lector de Cromatografía de Suelo |
| `lang` | `es` (EN es decisión del owner, ver abajo) |
| `tier` | **plus** (cada análisis gasta IA; el ECP lo concede por persona; se lista con candado y «Solicitar») |
| `clase` | compartible |
| Superficies | `web` ✓ · `kr` ✓ · `dc` ✓ · `cp` ✗ (storytelling para compradores queda para después) |
| `soporta_memoria` | **sí** (puente) — un trabajo = un análisis |
| `familia` | — |
| Archivo | `public/tools/cromatografia-suelo.html` |
| `meta description` | «Lector asistido por IA de cromatografías de suelo Pfeiffer en fincas cafeteras. Lectura tentativa, no de laboratorio. Colombian Trading Company SAS · ctcexport.com» (163 caracteres ≤ 165, sufijo de la casa) |
| Captura | `public/images/herramientas/shots/cromatografia-suelo.jpg` (añadir al mapa de `build-tool-shots.mjs`) con un croma sintético cargado para que la captura enseñe un reporte, no un formulario vacío |

**Dónde vivirá** — `public/tools/cromatografia-suelo.html` + registro en `tools` (herramienta pública, misma concha
que las demás) **más una pieza de servidor**, la primera de la suite: el route handler
`src/app/api/herramientas/cromatografia/route.ts`. `/api/` está fuera del matcher del proxy, así que la misma URL
sirve desde `herramientas.`, `kaffetal-regal.` y `directorio.`; la cookie compartida viaja y el handler exige
**sesión + veredicto de `accesoHerramienta.ts`** (miembro y, siendo Plus, permiso) antes de gastar un token.

**Arquitectura (la del kickoff, traducida a la casa)** — El kickoff propone FastAPI + OpenCV + reportlab. La casa
es Next.js + Supabase + HTML autocontenido; lo que en el kickoff es un backend Python queda repartido así:

1. **Compuerta de validación y rasgos objetivos → en el navegador, JS puro sobre `<canvas>`**
   (`public/tools/assets/cromatografia-rasgos.js`, un módulo sin dependencias que también importa el guardián):
   centro y radio por umbral sobre fondo claro, perfil radial en CIELAB (50 anillos del 2 %), fronteras de zona
   por máximos de la derivada, índice de radialidad (varianza angular normalizada en la zona externa), entropía
   por zona, simetría, nitidez (varianza del Laplaciano), balance de blancos y área útil. Rechaza según
   `image_validation_gate.reject_if` y devuelve siempre el `validation_report`. **Funciona sin internet y sin
   cuenta**: la compuerta, los rasgos y una estimación de Ford derivada de los rasgos (programática, sin modelo) se
   dan gratis; solo la lectura interpretativa cuesta.
2. **Lectura interpretativa → el route handler** (la única pieza con IA): recibe la imagen reducida (JPEG ≤ 1 MB,
   lado mayor 1024 px), los rasgos y el contexto; ensambla el prompt **en tiempo de ejecución desde
   `interpretation_rules.json`** (rol y fuentes con nivel, `language_policy` literal con `forbidden_claims`, la
   entrada de `regional_context_rules` del departamento declarado o `unknown_region`, los rasgos completos, y el
   esquema JSON estricto de salida); llama a la API con fetch crudo (patrón de `fichasActions.ts`), valida el JSON
   (reintento con corrección una vez), **inyecta el `mandatory_disclaimer_es` desde el JSON de reglas, nunca desde
   la respuesta**, rechaza cadenas de evidencia con fuente que no exista en el JSON, y anota el gasto.
   `laboratorio_referencia` (si algún día se pide) **no** entra al prompt.
3. **Reporte y PDF → en el navegador**: la plantilla de la maqueta (descripción · rasgos · Ford como rangos · tabla
   de cadena de evidencia · contexto regional · recomendaciones · límites) con `@media print` para «Descargar
   PDF». Sin reportlab.
4. **Registros → el puente**. La maqueta trae menú de registros, fincas y acciones en lote; en la casa eso es el
   **Home Menu de trabajos** de la concha (A11): un trabajo = un análisis (miniatura JPEG ≈ 640 px ≤ 60 KB +
   contexto + rasgos + JSON del modelo + `meta` con `prompt_version`, `rules_version`, `model`, `timestamp`),
   dentro de los 200 KB. `CTC.usarEstado` con esquema propio versionado (la herramienta va a evolucionar; la
   serialización por posición se quedaría vieja), `CTC.usarResumen` → «Finca · departamento · fecha · estado».
   Fuera de la concha: `localStorage` como respaldo, sin sincronizar.

**Datos** — Primera tanda: ninguna tabla nueva (los trabajos viven en `tool_sessions`). Segunda tanda, si el owner
la aprueba: `croma_muestras` (service-role-only, patrón de la casa) + bucket `croma` para la imagen original, que
el handler escribe **solo con consentimiento marcado** — es el dataset propio que PDF1 §9 y PDF2 §7 exigen para
cualquier calibración futura (umbral ≥ 30 pares croma–laboratorio–catación antes de afirmar nada). Nombre de
finca y coordenadas son datos personales: análisis posible sin coordenadas; no salen en el PDF salvo que se marque.

**IA** — Una llamada por análisis, **opt-in con el precio a la vista** en el botón («Interpretar con IA · ≈ US$ 0,01»).
Modelo por defecto `claude-haiku-4-5-20251001` (visión + JSON con rasgos anclados; ≈ 1.500 tokens de entrada
por la imagen + reglas, ≈ 1.200 de salida → ~US$ 0,01); constante `MODEL` con override por variable de entorno
`CROMA_MODEL` (el kickoff pide no cablearlo), `temperature: 0`. Nueva vía en `USOS`:
`herramientasCromatografia: "herramientas:cromatografia"` — **toca `src/lib/ai/consumo.ts`, fuente única del
contrato «libro de consumo»** → línea en ALINEACION §3 en la misma tanda. Sin `ANTHROPIC_API_KEY` el botón lo
dice y la herramienta sigue dando compuerta, rasgos y Ford programático (degradación determinista).

**Contratos que toca** — Libro de consumo de IA (nueva `USOS`) · SEO (el `<head>` del archivo manda; espejo en
`tools`) · Espina de integración (`CTC.emitir("analisis.generado", {sample_id, departamento, ford})` →
`herramienta.cromatografia-suelo.analisis.generado`) · Identidad (el handler reutiliza el veredicto de acceso, no
inventa puerta). No toca grados, subdominios ni vocabulario. **La cadena «suelo → taza» está prohibida** en
código, no solo en prosa: el handler rechaza salidas que la nombren.

**Guardián previsto** — `scripts/qa-cromatografia-check.mjs` (puro, sin servidor):
- Las reglas cargan y traen todos los campos obligatorios (`evidence_levels`, `language_policy.forbidden_claims`,
  `zones`, `ford_scale`, `regional_context_rules.unknown_region`, `mandatory_disclaimer_es`, `image_validation_gate`);
  la copia que lee el navegador (`public/tools/assets/cromatografia-reglas.json`) es **byte a byte** la de
  `src/lib/tools/cromatografia/reglas.json`.
- El ensamblador de prompt inyecta la política de lenguaje literal, la región correcta y `unknown_region` cuando
  el departamento va vacío.
- Motor de rasgos sobre un **croma sintético** generado en el propio test (anillos concéntricos + rayas radiales
  con fronteras y radialidad conocidas): fronteras a ±0,03, radialidad alta con rayas y baja sin ellas; y sobre
  tres fixtures que deben rechazarse (borrosa, recortada, sin círculo).
- Sobre fixtures de salida del modelo: claims prohibidos (`taza`, `SCA`, `puntaje`, `catación`, `certifica`,
  `mide`, `% de materia orgánica`, valores de pH) fuera de «límites» → fallo; coherencia rasgos–texto
  (`radiality_index` < 0,25 ⇒ sin «canales bien desarrollados» ni rango de canales ≥ 4, y simétrico); cada
  interpretación con `observacion`, `fuente` (existente en el JSON) y `nivel`; disclaimer íntegro y forzado.
Se suman `qa-tools-seo-check`, `qa-tools-seo-espejo`, `qa-taller-check`, `qa-tools-puente-conformance` (nueva
entrada) y `qa-consumo-check` (nueva `USOS`).

**Primera tanda (lo mínimo desplegable y verificable en vivo)**
1. `src/lib/tools/cromatografia/` — `reglas.json` (copia literal de la fuente), `prompt.ts` (ensamblador PURO),
   `salida.ts` (esquema, validación, claims prohibidos, coherencia, disclaimer forzado). Guardián verde sobre esto.
2. `public/tools/assets/cromatografia-rasgos.js` — compuerta + rasgos + Ford programático; el guardián lo corre en
   Node con el croma sintético.
3. `public/tools/cromatografia-suelo.html` — maqueta del owner adaptada: sube foto → compuerta con instrucciones
   de captura → rasgos → formulario de contexto con consentimiento → botón opt-in de IA → reporte → imprimir.
   Puente al pie. `vendor-tool-assets.mjs` (Fraunces + IBM Plex Sans a local).
4. Route handler con sesión, veredicto de acceso, fetch crudo, consumo anotado, disclaimer forzado.
5. Alta en `tools` (ECP o SQL), permiso Plus al owner y a las cuentas `prueba-*`, captura, `build-tool-shots`.
6. Verificación en vivo con una cuenta `prueba-*` productora: compuerta con una foto que no es croma; análisis
   completo con un croma real o sintético; el trabajo aparece en el Home Menu; la fila de `ai_usage`.
7. Revisión de tono de 3 reportes por una persona del equipo **antes** de cualquier demo a Tecnicafé/CQI
   (kickoff §9.8) — lo hace el owner, no la sesión.

**Fuera de la primera tanda (backlog explícito)** — dataset `croma_muestras` + bucket; `laboratorio_referencia`;
inglés; series temporales por finca (comparación intra-finca es la única válida, PDF1 §6b); multi-imagen; modelo de
visión entrenado (v3+, solo con ≥ 30 pares y aceptando que vale para una zona edafológica).

**Decisiones del owner (lo que bloquea)**
1. **Nombre**: «Lector de Cromatografía de Suelo» (kickoff y maqueta) o «Análisis Cromatográfico» (tu prompt)?
   Propongo el primero: dice «lector», no «análisis», y eso ya es política de lenguaje.
2. **Nivel**: Plus (propuesto: gasta dinero por uso y es candidata en evaluación) o default para todo miembro?
3. **Superficies**: web + kr + dc (propuesto). ¿CP también?
4. **Modelo**: Haiku 4.5 por defecto (~US$ 0,01/análisis) o Sonnet 5 (~US$ 0,03) como el escáner de fichas?
   La calidad de la lectura la manda el JSON de reglas y los rasgos, no el tamaño del modelo; propongo Haiku y
   que el tablero de consumo decida.
5. **Dataset** (segunda tanda): ¿guardamos imagen original + contexto en `croma_muestras` cuando hay
   consentimiento? Es lo que hace posible la calibración local que PDF1 §7 (Objeción 2) considera la única vía
   defendible frente a Tecnicafé/CQI.
6. **Idioma**: solo español en v1 (propuesto) o también inglés (kickoff §10).
7. **Quién valida agronómicamente** las primeras salidas (¿Tecnicafé?): sin lector humano de cromas los tests
   garantizan honestidad, no acierto.
8. **Registros/Fincas de la maqueta → Home Menu de la concha**: ¿de acuerdo con que la lista de análisis sea la
   lista de trabajos guardados y no una tabla propia dentro de la herramienta?

---

## Acta de construcción (V5.32, 2026-09-13)

**Lo que añadió el owner al aprobar.** (1) Las fincas de la maqueta se conectan con las fincas de la cuenta del
productor, y desde Cherry Picked no se habilitan. (2) La validación agronómica la hará un experto cuando el sistema
funcione, con un **modo «expert feedback»** que se pueda activar. (3) Usar las fuentes y descargar las bases de
datos relevantes para sustentar el modelo.

**Decisiones del brief, todas aprobadas**: nombre «Lector de Cromatografía de Suelo» · Plus · web + kr + dc ·
Haiku 4.5 · dataset propio en segunda tanda · solo español · validador: un experto, después · registros = Home Menu.

**Lo construido.** Ver CHANGELOG V5.32. Diferencias con el brief:
- **Nombre de finca y coordenadas no llegan nunca al modelo.** La herramienta no pide coordenadas; el nombre de
  finca y lote se guarda en el trabajo solo con consentimiento y sale en el PDF solo si se marca.
- **Fincas**: `GET api/herramientas/cromatografia/fincas` devuelve nombre, departamento, municipio, altitud y
  parcelas de las fincas de la cuenta (excepto rechazadas); `?superficie=cp` responde vacío sin consultar, y el HTML
  además detecta Cherry Picked por la ruta de la concha.
- **Techo de nivel por fuente**: se lee del texto de `evidence_levels`; si la fuente no aparece, la letra más
  conservadora de sus criterios. La versión «mejor letra del criterio» le daba nivel A a Restrepo/Pinheiro.
- **Techo diario** de 20 llamadas por persona (un reintento cuenta).

**Pruebas en vivo contra la API** (clave local, Haiku 4.5, croma sintético radial, Santander):
- Prompt 1.0: las 3 corridas fallaron el primer intento por lo mismo. El modelo escribió las palabras prohibidas
  para negarlas («no vincular con puntaje o precio») y «sin canales» acotado a la zona mineral. Pasaban al
  corregir, a ≈ US$ 0,037 por lectura.
- Prompt 1.1 (no escribir lo prohibido ni para negarlo; límites de palabras; recomendaciones sin mecanismos que no
  estén en el JSON) y coherencia por frase: 2 de 2 pasan al primer intento, rangos idénticos, **≈ US$ 0,013 por
  lectura**.

**Investigación de fuentes** (fuera del repo, que es público: `reference/html_tools/Analisis Cromatografico/fuentes/`).
26 documentos abiertos, 168 figuras con su manifiesto, `INDEX.md` y `HALLAZGOS.md`. Lo que cambia el modelo:
- **Sí hay datasets públicos** (PDF2 decía que no): Martins et al. 2026, Zenodo 18840454 (108 cromas de 12 suelos
  con z-scores de 15 propiedades, CC BY 4.0, 35,9 GB) y su código con `raw_448px.zip` (Zenodo 18851814, descargado);
  Calixto et al. 2025, Zenodo 16943808 (35 cromas sin laboratorio). Útiles para la compuerta y la segmentación; no
  para interpretar (suelos brasileños, validación entre suelos negativa según sus autores).
- **Calibración**: la compuerta 1.0 rechazaba 108 de 108 capturas de laboratorio. Con nitidez mínima 10 y área
  mínima 20 % pasan 107. El 40 % del JSON queda como decisión del owner.
- **Propuestas v2.1 para el JSON, NO aplicadas**: los radios relativos no dicen si se normalizan al papel o al
  frente del extracto; la zona «periférica» de las reglas contradice a todas las fuentes (es el papel sin extracto);
  los niveles 3 de la escala de Ford no están en la fuente y en 361 cromas el color nunca llegó a 5; la lectura
  «zona media ↔ carbono de biomasa» es de Graciano 2020 (Oxisol de Paraná, n=12), no de Uberlândia; «borde dentado»
  tiene valencia contraria en varias escalas; faltan metadatos de protocolo que cambian la imagen (papel n.º 1/4,
  dilución, días de revelado); ninguna fuente abierta estudia cromas en Andisoles. UIS 2026 (café en Guadalupe,
  Santander) muestra cromas dorados con MO de 0,82–1,29 %: dorado no equivale a materia orgánica alta.
- `HALLAZGOS.md` quedó con marcadores sin rellenar (§b y partes de §e–f): la investigación se cortó por el límite
  de gasto de la cuenta. Las propuestas están listadas en el charter.

**Diseño del modo «expert feedback»** (para cuando haya uso real):
- Interruptor por persona en ECP · Herramientas (un permiso `experto-cromatografia` en `tool_user_grants` o una
  columna de rol), nunca por superficie.
- En el reporte, junto a cada lectura (`i1…`) y recomendación (`r1…`): «de acuerdo · en desacuerdo · corregir», con
  texto libre y, para Ford, el rango que el experto daría.
- Tabla `croma_feedback` service-role-only: `sample_id`, `lectura_id`, `veredicto`, `correccion`, `rango_ford`,
  `experto_id`, `prompt_version`, `rules_version`, `model_name`. Congela las versiones: una opinión sobre el prompt
  1.1 no se mezcla con la del 1.2.
- Es la materia prima para la v2.1 de las reglas y, con `croma_muestras`, para cualquier calibración futura.

---

## Decisiones del owner del 2026-09-13 y lo que se hizo (V5.33)

El owner delegó: (1) la compuerta de la foto, pensando la limitación como «la capacidad de tomar bien la foto»;
(2) el JSON inicial es una guía y el criterio de CTC tiene prelación; (3) no hay dataset probado: queda como
sugerencia abierta.

**1 · La compuerta mira cómo se tomó la foto.**
- Fuera el porcentaje del encuadre como motivo de rechazo. No dice nada de la calidad de la foto: con papel de 15 cm el
  croma nunca pasa de la mitad del encuadre, y una foto de móvil con el croma al 15 % tiene píxeles de sobra.
- Resolución: el croma debe medir al menos 500 px de diámetro en la foto original, que es el tamaño al que el motor lo
  remuestrea; por debajo tendría que inventar píxeles. Se recomiendan 1.000. Esto frena capturas de pantalla y fotos
  reenviadas por chat.
- Perpendicularidad: razón de ejes del borde ≥ 0,80. Se probó 0,90 y rechazaba 14 de las 108 capturas perpendiculares
  de Martins et al. 2026 (su frente llega a 0,857). Con 0,80 solo se detecta una inclinación fuerte; la protección fina
  es la instrucción de captura, que la herramienta muestra.
- Siguen nitidez, borde completo y fondo claro. Resultado con las 108 capturas de Martins: pasan las 108.

**2 · Reglas v2.1**, contrastadas página a página con las fuentes abiertas antes de aplicarlas. Lo que no se pudo
confirmar en el PDF (por ejemplo, el anillo oscuro del blanco de reactivos) no entró.
- Radios relativos al frente del extracto; priors 0,15 · 0,5 · 0,8. La calibración con las capturas de Martins midió
  fronteras medianas de 0,15 · 0,48 · 0,82 con el motor corregido.
- Zona periférica: el papel sin extracto, que no se interpreta (Embrapa 455, UIS 2026).
- Escala de Ford: la fuente solo define 1 y 5; se puntúan cuadrantes opuestos; en 361 cromas la mediana fue 2,5 y el
  color nunca pasó de 4 (Ford et al. 2019, tabla 4.7).
- Centro blanco nítido y aislado frente a blanco cremoso que se integra (UIS 2026, p. 35).
- Dorado con advertencia: en café de Santander hubo cromas dorados con materia orgánica baja en laboratorio (UIS 2026).
- Zona media ↔ carbono de biomasa: Graciano et al. 2020, r=0,74, n=12, Latosol de Paraná.
- Terminaciones de los picos según la escala de Embrapa 455 (abiertas en manchas: nota 4–5; solo puntiagudas: nota 2).
- Violeta no deseable y verde oscuro fuera de las lecturas de degradación (Restrepo y Pinheiro).
- La dilución cambia la lectura de la misma muestra: a 50 ml de NaOH los cromas no se podían leer (UIS 2026, pp. 46–52).
  Por eso el formulario pide papel, NaOH por 5 g y días desde el revelado, y las reglas solo comparan cromas del mismo
  protocolo.
- Nivel por fuente explícito (`source_levels`): A Ford 2021, Kokornaczyk 2016; B Ford 2019 (informe), Graciano 2020,
  Embrapa 455, Altepetl, UIS 2026; C Restrepo y Pinheiro, Pfeiffer 1984.

**3 · Dataset**: sugerencia abierta en el charter, sin aprobar.

**Calidad de la lectura.** La primera prueba con reglas v2.1 pasó los controles pero mostró tres defectos de honestidad: un
centro «blanco cremoso, separado nítidamente» leído solo en su versión favorable, una fuente C presentada como
«manuales institucionales» y una observación tomada del contexto declarado en vez de la imagen. El prompt 1.3 lo
prohíbe y `validarSalida` rechaza ahora una fuente C con lenguaje institucional o de estudio con n.

**Controles afinados con la salida real.** La primera prueba del prompt 1.3 falló por dos controles demasiado
literales: «sin canales ni variación radial» describía la zona mineral nombrada en la frase anterior, y «no mide
nutrientes» es una negación honesta. `validarSalida` acota ahora la negación de canales con la frase anterior (salvo
que hable del croma entero o de la zona externa), deja pasar «no mide» y cita la frase culpable en el error para que
la corrección del modelo sepa qué cambiar.

**Prueba en vivo con reglas v2.1 y prompt 1.3**: 3 de 3 lecturas pasan los controles al primer intento, rangos de Ford idénticos, ≈ US$ 0,016 por lectura.

---

## Reingeniería: dos caras y Feedback Técnico (V5.35, 2026-09-13)

**Lo que pidió el owner.** El usuario objetivo es un campesino que no necesita el marco teórico. El marco sigue siendo
la columna vertebral, pero la herramienta muestra dos caras: la del productor (principal, sencilla y accionable) y la
del laboratorio (backstage técnico con rigor). La IA produce el informe accionable. El técnico comenta observaciones
y conclusiones y lo exporta como «Feedback Técnico» para refinar el modelo. Marca CTCX en el pie y en lo exportado.

**Un límite que se mantuvo.** El ejemplo del owner fue «se perciben concentraciones bajas de potasio». La foto de una
cromatografía no permite ver potasio, fósforo, calcio, magnesio ni acidez (UNAD 2017, p. 55: no da cantidades), y
nombrarlos sería inventar un análisis de laboratorio. La cara del productor habla de lo que la foto sí sugiere (vida
del suelo, materia orgánica, aireación, abono sin descomponer) y siempre manda al laboratorio antes de comprar
correctivos. `validarSalida` rechaza esas palabras en la cara del productor.

**Cómo quedó.**
- Una sola lectura del modelo trae las dos caras. La del productor tiene señal (buena · mixta · atención), resumen,
  hallazgos y acciones. Cada hallazgo y cada acción nombra las interpretaciones técnicas que lo sustentan
  (`basado_en`), así el laboratorio puede ver de dónde sale cada frase del informe del campesino.
- Las acciones son prácticas del catálogo de las reglas v2.2, elegidas por id. El cómo hacerlo, el cuidado y la fuente
  los pone el servidor desde el catálogo, nunca el modelo. El análisis de laboratorio y repetir el croma van siempre.
- Catálogo inicial: análisis de laboratorio, repetir el croma, compost o bocashi maduro, no usar abono crudo, dejar
  poco a poco los herbicidas, cobertura viva, microorganismos de la finca, no compactar, sombra regulada y croma de un
  bosque de referencia. El cómo sale del plan agroecológico de UIS 2026 (café en Santander, pp. 60–62), de Altepetl y
  de Embrapa 455. La única cantidad que aparece (kilo y medio de compost por planta) va como referencia de esa tesis y
  remite al técnico. Las dosis de cal, yeso o roca fosfórica de UIS no entraron porque dependen del laboratorio.
- Feedback Técnico: veredicto (de acuerdo · parcialmente · en desacuerdo) y comentario por elemento, rango de Ford
  que daría el técnico, quién revisa y valoración general. Se exporta como JSON con la lectura, los rasgos, las
  versiones y la miniatura; sin consentimiento, sin el nombre de la finca. También se imprime.
- Marca CTCX: franja de cuatro colores, loro en la cabecera, pie con el logo, «Herramienta propiedad de CTCX ·
  Colombian Trading Company S.A.S.» y fuentes consultadas; el informe del productor y el feedback impresos llevan la
  misma cabecera y pie.

**Pendiente.** Que un agrónomo revise el catálogo y el tono de tres informes reales; guardar los Feedback Técnicos en
la base cuando haya volumen; restringir la cara del laboratorio a técnicos con permiso.

---

## Conjeturas con certeza y el laboratorio al final (V5.36, 2026-09-13)

**Lo que pidió el owner.** Recomendar un experto o un laboratorio siempre tiene sentido, pero no puede ser el primer
consejo. Sin inventar soluciones, la lectura debe ampliarse y dar conjeturas con su nivel de certeza y lo que
implicarían.

**Cómo quedó.**
- Cada conjetura dice lo que se ve, lo que podría significar, otra explicación posible (solo si las reglas la admiten)
  y lo que implicaría para el lote si es cierta.
- La certeza la calcula el servidor: media solo si alguna interpretación técnica que la sustenta tiene confianza media
  y evidencia A o B; si no, baja. Nunca alta, porque el método no lo admite. Así el modelo no puede inflarla, y el
  técnico ve en la cara del laboratorio de qué interpretaciones sale.
- «Qué puede hacer» trae prácticas de manejo ordenadas por prioridad (al menos una). El laboratorio y repetir el croma
  van al final, en «Para confirmar y seguir el avance», plegados; en el PDF salen abiertos.

---

## La foto anotada abre el informe (V5.37, 2026-09-13)

**Pedido del owner.** El informe exportado incluye, al principio, la imagen con flechas que señalan las observaciones.

**Cómo quedó.** Cada conjetura dice de qué zona del croma habla (central, mineral, media u orgánica, externa, o general
si habla del croma entero). La flecha no se pone a ojo: apunta al punto medio de esa franja, calculado con el centro, el
radio y las fronteras que midió el motor de rasgos, en el ángulo que mira hacia su etiqueta. Si la zona falta, se
deduce de lo que se ve («centro», «dorado del medio», «picos del borde»). Una conjetura «general» lleva número pero no
flecha. La figura es un SVG con la miniatura recortada al croma, así que en el PDF los textos quedan nítidos. Las zonas
son aproximadas y la leyenda lo dice.

---

## Morado claro, identificación del laboratorio y ayudas «?» e «i» (V5.38, 2026-09-13)

**Lo que pidió el owner.** Usar el morado claro de CTCX porque todo se veía muy oscuro; mostrar la foto anotada también
al laboratorio; casillas de identificación del laboratorio (nombre, RUT, técnico y firma); un botón «?» para el
productor que explique la cromatografía en cinco puntos, un dibujo y un cierre, y que ofrezca tres fotos de ejemplo;
y un botón «i» para el laboratorio con el método, los recursos en línea y unos tres PDF de metodología protegidos.

**Cómo quedó.**
- El modo oscuro toma el morado de marca `#451D96` como fondo y lavanda como acento; el modo claro no cambia.
- La figura del laboratorio es la misma del productor, con «c1 · zona orgánica» bajo cada título.
- El RUT se valida con el dígito de verificación de la DIAN solo como aviso: no bloquea. La firma es un trazo en un
  lienzo, guardado como PNG en el trabajo; lo dice la pantalla: identifica a quien revisa y no es firma digital
  certificada. Al pedir una lectura nueva se conservan laboratorio y técnico, pero la firma se borra, porque firma una
  revisión concreta.
- La explicación del productor no nombra nutrientes, acidez ni jerga; el guardián la pasa por las mismas listas
  vetadas de las reglas. Las fotos de ejemplo son las tres que dejó el owner, convertidas a JPEG (a la 1 se le tapó el
  icono de captura y a la 2 se le quitó el borde de madera y se le dio margen) y pasan la compuerta 1.2.
- Los PDF se generan desde el código (reglas, umbrales, versiones), así que no se desalinean al regenerarlos. Llevan
  marca de agua y pie de derechos en cada página, citan a terceros sin reproducir texto ni figuras, dan atribución
  CC BY 4.0 a los datasets de Martins et al. y cierran con aviso legal (propiedad intelectual con Ley 23 de 1982 y
  Decisión Andina 351, marcas de terceros, limitación de responsabilidad, privacidad).

**Queda para el owner.** Confirmar el origen y los derechos de las tres fotos de ejemplo (la 2 parece una lámina de
libro escaneada) o cambiarlas por cromas propios de CTC, y que un abogado revise el aviso legal de los PDF.

---

## Tres idiomas, análisis de laboratorio declarado y PDF con razón social (V5.39, 2026-09-13)

**Lo que pidió el owner.** Un conmutador de idiomas (inglés y alemán además de español); PDF con cabecera explícita
«Colombian Trading Company SAS», RUT y web en el pie y hojas numeradas «# de #»; «Preparada por» opcional en el informe
del productor con el nombre de la cuenta de KR por defecto y editable; una «i» que amplíe las definiciones en un
diálogo, también para la leyenda de las ecuaciones; un acordeón «Análisis cuantitativo» paralelo a «Más datos», que
explique que es el examen que suele hacer la Federación, porque los productores pueden tener ese análisis (pH, MO, N,
P, K, Ca, Mg) y da datos relacionados útiles para el análisis holístico; y mover la «i» del laboratorio encima de
«Imprimir feedback» con el nombre «Bibliografía y metodología».

**El límite que se mantuvo con el análisis de laboratorio.** Los valores del laboratorio son un dato del productor, no
de la foto. Se guardan, salen en su informe como tabla con sus propios números y van en el Feedback Técnico (es el
primer par croma–laboratorio que la herramienta recoge). Al modelo llegan marcados como «DATO del laboratorio, NO de la
foto» y solo pueden alimentar un campo técnico nuevo, `contraste_laboratorio`: si lo que sugiere la foto va en la misma
dirección que lo declarado o no. La cara del productor sigue sin nombrar nutrientes ni acidez, porque la foto no los
ve y porque interpretar un análisis de laboratorio (qué le falta al suelo y cuánto) es trabajo del agrónomo. La
validación lo sostiene: el contraste es obligatorio cuando hay análisis, se descarta cuando no lo hay, y se rechaza si
califica los valores («pH bajo», «moderate organic matter», «acidic pH») o si el modelo cuela el valor del
laboratorio en una interpretación de la imagen. En las pruebas Haiku hizo las dos cosas al primer intento y las
corrigió al segundo.

**Cómo quedaron los idiomas.** Un diccionario por idioma en el HTML (`T.es`, `T.en`, `T.de`, unas 250 claves; el guardián
exige paridad exacta), definiciones (`DEF`) en los tres, y en las reglas v2.4 un bloque `i18n` con lo que el servidor
pone por su cuenta: catálogo de prácticas con su cómo, señales, certezas, descargos, etiquetas de nivel, reglas
regionales, compuerta y las listas de palabras que el productor no puede leer en cada idioma. Los criterios siguen
siendo uno solo, en español. El prompt 1.8 pide el idioma al principio y al final, con los ejemplos de duda en ese
idioma («seems, may, looks like»), porque con los ejemplos en español el modelo escribía el resumen y los títulos en
español y las conjeturas en alemán; `validarSalida` rechaza además cualquier campo que parezca español
(`pareceEspanol`, dos palabras funcionales) cuando se pidió otro idioma, y aplica léxicos por idioma para las
prohibiciones (cup, score, price, Tasse, Preis, misst…), la duda, la coherencia con la radialidad y las zonas. En
inglés «spikes» es lenguaje llano y salió de la lista de jerga; «photo» dejó de caer por «pH» (los tokens cortos exigen
fin de palabra). Los PDF de metodología siguen en español, y el diálogo lo dice.

**Coste y estabilidad medidos.** Español con laboratorio 2/2 al primer intento; inglés con laboratorio 3 de 5 corridas
al primer intento, el resto al segundo; alemán con laboratorio 0 de 2 al primer intento y 2/2 al segundo. Rangos de Ford
idénticos en todas. Una lectura en inglés o alemán cuesta hoy ≈ US$ 0,02–0,05 según haya reintento.

**Lo demás.** «Preparada por» toma `profiles.full_name` (la ruta de fincas devuelve `cuenta.nombre`, solo el nombre), se
guarda únicamente si se marcó y no viaja al modelo. Las «i» abren un diálogo común con qué es, la ecuación tal como la
calcula el motor, la leyenda de símbolos y el rango: compuerta (6), rasgos (9), Ford, certeza y señal. El PDF lleva la
razón social en la cabecera y, con cajas de margen `@page` inyectadas al imprimir, la empresa arriba, el NIT y la web
abajo y «Página n de N»; los navegadores sin cajas de margen (Firefox) imprimen igual con la cabecera y el pie del
documento. El botón «Bibliografía y metodología» va en su propia barra encima de la de imprimir.

**Queda para el owner.** Que un hablante nativo revise las traducciones al inglés y al alemán (las escribió la IA);
decidir si el contraste con el laboratorio debe llegar también al productor en una frase sin nutrientes (hoy solo lo ve
el laboratorio); y probar la impresión desde el móvil, donde las cajas de margen dependen del navegador.

