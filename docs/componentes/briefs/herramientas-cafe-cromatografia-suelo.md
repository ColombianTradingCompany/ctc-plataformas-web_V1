# Brief · Lector de Cromatografía de Suelo  (componente: herramientas-cafe · id: `cromatografia-suelo` · 2026-09-12)

> Acta de origen de la herramienta. Fuente del owner: `C:\dev\ctc-platforms\reference\html_tools\Analisis Cromatografico\`
> (KICKOFF v2, PDF1 validez científica, PDF2 atlas y taxonomía, `interpretation_rules.json` v2.0, maqueta HTML).
> Estado: **en scoping** — no se escribe código hasta que el owner apruebe este brief.

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
