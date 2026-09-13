// Los tres documentos de metodología del Lector de Cromatografía de Suelo (V5.38).
//
//   node scripts/build-cromatografia-docs.mjs
//
// Salen a public/tools/assets/cromatografia-docs/ y se enlazan desde el botón «i»
// de la cara del laboratorio. Todo lo que cambia con el código se lee del código:
// las reglas (reglas.json), los umbrales y la versión del motor (cromatografia-rasgos.js)
// y la versión del prompt (prompt.ts). Lo demás es texto de CTCX.
//
// Propiedad intelectual: cada página lleva marca de agua y aviso de derechos de
// CTCX. Las obras de terceros solo se citan (autor, año, página, licencia); no se
// reproduce su texto ni sus figuras. Los datasets CC BY 4.0 llevan su atribución.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const SALIDA = join(RAIZ, "public/tools/assets/cromatografia-docs");
const leer = (p) => readFileSync(join(RAIZ, p), "utf8");

const reglas = JSON.parse(leer("src/lib/tools/cromatografia/reglas.json"));
const motor = leer("public/tools/assets/cromatografia-rasgos.js");
const VERSION_MOTOR = motor.match(/var VERSION = "([^"]+)"/)[1];
const UMBRALES = Object.fromEntries([...motor.match(/var UMBRALES = \{([\s\S]*?)\};/)[1].matchAll(/(\w+):\s*([\d.]+)/g)].map((m) => [m[1], Number(m[2])]));
const VERSION_PROMPT = leer("src/lib/tools/cromatografia/prompt.ts").match(/PROMPT_VERSION = "([^"]+)"/)[1];
const LOGO = "data:image/png;base64," + readFileSync(join(RAIZ, "public/tools/assets/ctcx-logo.png")).toString("base64");
const LORO = "data:image/png;base64," + readFileSync(join(RAIZ, "public/tools/assets/ctcx-loro.png")).toString("base64");

const FECHA = "2026-09-13";
const EDICION = "1.1"; // 1.1 (V5.39): tres idiomas, análisis de laboratorio declarado y contraste técnico
const ANIO = FECHA.slice(0, 4);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const coma = (n) => String(n).replace(".", ",");
const NOMBRE_ZONA = { central: "Central", mineral: "Interna o mineral", organic: "Media u orgánica", enzymatic: "Externa", peripheral: "Periférica" };

// ── Plantilla común ──────────────────────────────────────────────────────────
const CSS = `
@page{size:A4;margin:24mm 17mm 22mm}
*{box-sizing:border-box}
body{margin:0;font:10.2pt/1.5 "Segoe UI",system-ui,sans-serif;color:#1E1033}
.marca-agua{position:fixed;top:0;left:0;width:100%;height:100%;display:grid;place-items:center;pointer-events:none;z-index:0}
.marca-agua div{transform:rotate(-34deg);text-align:center;opacity:.075;color:#451D96;white-space:nowrap}
.marca-agua b{display:block;font-size:92pt;letter-spacing:.12em;font-weight:900}
.marca-agua small{display:block;font-size:17pt;letter-spacing:.3em;font-weight:700}
main{position:relative;z-index:1}
.portada{display:flex;gap:16px;align-items:center;border-bottom:3px solid #451D96;padding-bottom:12px;margin-bottom:14px}
.portada img{height:62px}
.portada .t small{display:block;font-size:8.5pt;letter-spacing:.14em;text-transform:uppercase;color:#6E5F8A}
.portada .t b{display:block;font-size:20pt;line-height:1.15;color:#2B1160}
.ficha{display:grid;grid-template-columns:repeat(4,1fr);gap:6px 12px;font-size:8.6pt;background:#F6F2FD;border-radius:8px;padding:8px 12px;margin-bottom:12px}
.ficha b{display:block;font-size:7.4pt;letter-spacing:.1em;text-transform:uppercase;color:#6E5F8A}
.aviso-ip{border-left:3px solid #FDC70C;background:#FFFBEA;padding:7px 11px;font-size:8.6pt;margin:0 0 12px}
h1{font-size:14pt;color:#2B1160;margin:18px 0 6px;border-bottom:1px solid #E6DEF7;padding-bottom:3px;break-after:avoid}
h2{font-size:11.5pt;color:#451D96;margin:12px 0 4px;break-after:avoid}
p{margin:4px 0 7px}
ul,ol{margin:4px 0 8px;padding-left:20px}
li{margin:2px 0}
table{border-collapse:collapse;width:100%;margin:6px 0 10px;font-size:8.7pt;break-inside:auto}
tr{break-inside:avoid}
th,td{border:1px solid #DDD3F2;padding:4px 6px;text-align:left;vertical-align:top}
th{background:#F0EAFC;color:#2B1160;font-weight:700}
code,.mono{font-family:Consolas,monospace;font-size:8.6pt}
.nivel{display:inline-block;font-weight:700;border-radius:4px;padding:0 5px;background:#F0EAFC;color:#2B1160}
.nota{font-size:8.6pt;color:#555}
.flujo{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:8px 0 10px}
.flujo span{border:1px solid #CDB9F0;background:#F6F2FD;border-radius:8px;padding:5px 8px;font-size:8.6pt;font-weight:600;color:#2B1160}
.flujo i{color:#451D96;font-style:normal;font-weight:700}
.legal{margin-top:16px;border-top:2px solid #451D96;padding-top:6px}
.legal h1{border:0;margin-top:4px}
.legal p{font-size:8.6pt}
.firma-doc{display:flex;gap:12px;align-items:center;margin:4px 0 2px;font-size:8.4pt;color:#555}
.firma-doc img{height:36px}
`;

function documento({ codigo, titulo, resumen, cuerpo }) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(titulo)} · CTCX</title><meta name="author" content="Colombian Trading Company S.A.S. (CTCX)"><style>${CSS}</style></head><body>
<div class="marca-agua" aria-hidden="true"><div><b>CTCX</b><small>COLOMBIAN TRADING COMPANY · ${ANIO}</small></div></div>
<main>
<div class="portada"><img src="${LORO}" alt="CTCX"><div class="t"><small>CTCX · Herramientas del Café · Lector de Cromatografía de Suelo</small><b>${esc(titulo)}</b></div></div>
<div class="ficha">
  <div><b>Código</b>${codigo}</div><div><b>Edición</b>${EDICION} · ${FECHA}</div>
  <div><b>Versiones</b>reglas v${esc(reglas.$schema_version)} · ${esc(VERSION_MOTOR)} · ${esc(VERSION_PROMPT)}</div><div><b>Titular</b>Colombian Trading Company S.A.S.</div>
</div>
<p class="aviso-ip"><b>© ${ANIO} Colombian Trading Company S.A.S. (CTCX). Todos los derechos reservados.</b> Documento de consulta. Puede citarse con atribución; no puede reproducirse, modificarse ni distribuirse, total o parcialmente, sin autorización escrita de CTCX. Las obras de terceros mencionadas pertenecen a sus titulares y conservan sus licencias. Ver el aviso legal al final.</p>
<p><b>Resumen.</b> ${resumen}</p>
${cuerpo}
${avisoLegal(codigo)}
</main></body></html>`;
}

function avisoLegal(codigo) {
  return `<section class="legal">
<div class="firma-doc"><img src="${LOGO}" alt="Colombian Trading Company"><div>Herramienta propiedad de CTCX · Colombian Trading Company S.A.S. · ctcexport.com<br>${codigo} · edición ${EDICION} · ${FECHA}</div></div>
<h1>Aviso legal</h1>
<p><b>Propiedad intelectual.</b> Los textos de este documento, la compilación y estructura de las reglas de interpretación, el software del Lector (motor de rasgos, compuerta de captura, validación de la salida) y su diseño gráfico son obra de Colombian Trading Company S.A.S. (CTCX) y están protegidos por el derecho de autor, en particular por la Ley 23 de 1982 y la Decisión Andina 351 de 1993, en lo que resulte protegible. La protección recae sobre la expresión, no sobre los hechos, las ideas ni los métodos científicos de dominio público, ni sobre las obras de terceros citadas. CTCX y sus logotipos son signos distintivos de Colombian Trading Company S.A.S.</p>
<p><b>Obras y marcas de terceros.</b> Las publicaciones, datasets y libros citados pertenecen a sus autores y editores. Se citan con autor, año, página y licencia, sin reproducir su texto ni sus figuras. Los datasets de Martins et al. (Zenodo) se usan bajo licencia CC BY 4.0 con la atribución indicada; su uso no implica que los autores respalden esta herramienta ni este documento. Claude y Anthropic son marcas de Anthropic PBC; Whatman es marca de su titular; Embrapa es marca de la Empresa Brasileira de Pesquisa Agropecuária. Si usted es titular de un derecho y considera que una mención no es correcta, escriba a CTCX a través de ctcexport.com.</p>
<p><b>Limitación de responsabilidad.</b> La cromatografía de Pfeiffer es una técnica cualitativa. El Lector produce una lectura orientativa asistida por inteligencia artificial, con lenguaje probabilístico; no es una medición científica, no es una certificación, no reemplaza un análisis de suelo de laboratorio ni la asesoría de un profesional agrónomo, y no guarda relación con la calidad en taza, el puntaje ni el precio del café. Los resultados dependen de la calidad de la foto y del protocolo con que se hizo el croma. La información se entrega «tal cual», sin garantía de exactitud, integridad o idoneidad para un fin concreto. En la máxima medida permitida por la ley aplicable, CTCX no responde por decisiones de manejo, pérdidas ni daños derivados del uso de la herramienta, de sus lecturas o de este documento. Toda decisión sobre fertilización, enmiendas o manejo del suelo debe confirmarse con análisis de laboratorio y con un profesional.</p>
<p><b>Privacidad.</b> El Lector no envía al modelo el nombre de la finca ni coordenadas, y guarda el nombre de la finca solo con consentimiento. El Feedback Técnico que exporta un laboratorio contiene los datos de identificación que ese laboratorio escribe y su firma dibujada, que no es una firma digital certificada.</p>
</section>`;
}

const tabla = (cab, filas) => `<table><thead><tr>${cab.map((c) => `<th>${c}</th>`).join("")}</tr></thead><tbody>${filas.map((f) => `<tr>${f.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table>`;

// ── 01 · Metodología ─────────────────────────────────────────────────────────
const doc1 = documento({
  codigo: "CTCX-CROMA-DOC-01",
  titulo: "Metodología del Lector de Cromatografía de Suelo",
  resumen: "Describe cómo el Lector pasa de una foto de un cromatograma de Pfeiffer a dos informes: uno sencillo para el productor y uno técnico para el laboratorio. La foto se valida y se mide en el navegador, sin IA; un modelo de lenguaje pequeño interpreta la foto y las medidas con reglas de CTC; el servidor valida la respuesta antes de mostrarla; y el laboratorio devuelve su revisión como Feedback Técnico.",
  cuerpo: `
<h1>1. Propósito, alcance y principios</h1>
<p>El Lector apoya la lectura cualitativa de cromatogramas circulares de Pfeiffer de suelos cafeteros colombianos. Tiene dos usuarios: el productor, que necesita una explicación sencilla y prácticas accionables, y el técnico de laboratorio, que revisa la lectura con rigor y deja su valoración.</p>
<ul>
<li><b>Cualitativo.</b> La lectura es orientativa y usa lenguaje probabilístico. No es una medición científica, una certificación ni un sustituto del laboratorio.</li>
<li><b>Sin taza.</b> Nunca se vincula el croma con la calidad en taza, el puntaje SCA o CVA, la catación o el precio.</li>
<li><b>Sin cifras inventadas.</b> La foto no permite estimar nutrientes, acidez ni materia orgánica en cantidad; la cara del productor ni siquiera los nombra.</li>
<li><b>Programático antes que IA.</b> Todo lo que se puede medir se mide con código determinista; la IA solo interpreta, y lo que dice se contrasta con esas medidas.</li>
<li><b>Evidencia explícita.</b> Cada criterio lleva fuente y nivel (A, B o C), y el lenguaje se ajusta al nivel.</li>
<li><b>Privacidad.</b> Al modelo no llegan el nombre de la finca ni coordenadas. El nombre de la finca se guarda solo con consentimiento.</li>
</ul>

<h1>2. Flujo</h1>
<div class="flujo"><span>Foto</span><i>→</i><span>Compuerta de captura</span><i>→</i><span>Motor de rasgos</span><i>→</i><span>Lectura con IA</span><i>→</i><span>Validación en el servidor</span><i>→</i><span>Cara del productor · cara del laboratorio</span><i>→</i><span>Feedback Técnico</span></div>
<p>La compuerta y el motor corren en el navegador (${esc(VERSION_MOTOR)}), sin internet. La lectura con IA necesita una cuenta con la herramienta activa; tiene un techo diario de lecturas por cuenta y su consumo se registra en el libro de uso de IA de la plataforma.</p>

<h1>3. Compuerta de captura</h1>
<p>Antes de interpretar se decide si la foto sirve. La foto se reduce a 900 px de lado mayor para medir, pero la resolución se juzga sobre la foto original. Si falla un criterio no hay lectura, y el productor recibe en palabras sencillas cómo repetir la foto.</p>
${tabla(["Criterio", "Cómo se mide", "Umbral"], [
  ["Patrón circular", `El fondo es la mediana CIELAB de una banda del 3 % del borde de la foto. Es croma todo píxel a más de ΔE*ab ${UMBRALES.deltaMascara} del fondo. Centro y radio salen de recorridos radiales en 72 ángulos, recentrados tres veces, y del radio mediano en 180 ángulos.`, `desviación del radio / radio ≤ ${coma(UMBRALES.circularidadMax)}; disco relleno ≥ ${coma(UMBRALES.rellenoMin)}; radio ≥ 10 % del lado menor`],
  ["Nitidez", "Varianza del laplaciano de L* dentro de 0,95 R, sobre el croma remuestreado a radio 250 px, para que no dependa de la resolución.", `≥ ${UMBRALES.nitidezMin}`],
  ["Resolución", "Diámetro del croma en píxeles de la foto original.", `≥ ${UMBRALES.diametroMin} px`],
  ["Borde completo", "Ningún recorrido radial toca el borde de la foto y el disco cabe en el encuadre.", "menos de 2 recorridos tocan el borde"],
  ["Fondo claro", "L* y C* medianos de la banda del borde.", `L* ≥ ${UMBRALES.fondoLMin}; C* ≤ ${UMBRALES.fondoCromaMax}`],
  ["Cámara paralela", "Una elipse deja un armónico de orden 2 en el radio del borde r(θ); de su amplitud a₂ se estima la razón de ejes (R − a₂)/(R + a₂). Los picos del borde son de frecuencia alta y no la alteran.", `≥ ${coma(UMBRALES.razonEjesMin)}`],
])}
<p class="nota">La fracción del encuadre que ocupa el croma se informa pero no rechaza: con papel de 15 cm y frente a 6 cm, el croma ocupa como máximo cerca de la mitad del encuadre. La calibración de los umbrales está en CTCX-CROMA-DOC-03.</p>

<h1>4. Motor de rasgos (sin IA)</h1>
<p>Los rasgos se calculan sobre el croma remuestreado a radio 250 px en CIELAB (sRGB, iluminante D65). Todos los radios son relativos al frente del extracto: r = 1 donde termina el croma, no en el borde del papel.</p>
${tabla(["Rasgo", "Definición"], [
  ["Perfil radial", "L*, a* y b* medios en 50 anillos del 2 % del radio."],
  ["Fronteras de zona", `Máximos locales de la diferencia de color ΔE entre anillos vecinos, suavizada [1, 2, 1]/4, buscados en ventanas alrededor de los radios nominales 0,15 · 0,5 · 0,8 (ventanas 0,06–0,32 · 0,36–0,66 · 0,64–0,92). Un máximo en el borde de la ventana no cuenta. Exige contraste ≥ 1 ΔE y 0,08 de separación; si no se ve, se usa el nominal y se marca «nominal».`],
  ["Color por zona", "Mediana de L*, a* y b* en cada zona entre fronteras."],
  ["Entropía de textura", "Entropía en bits del histograma de L* con 32 clases, por zona. No es la entropía GLCM de Haralick usada por Kokornaczyk et al.; es un descriptor más simple y declarado."],
  ["Índice de radialidad", "Energía angular de frecuencia media (6 a 100 ciclos por vuelta) de L* en 256 muestras por círculo, en radios desde la tercera frontera hasta 0,94. Cada radio aporta e/(e + 6) y se promedia. Una luz lateral, que varía despacio alrededor del croma, no suma; canales y picos sí."],
  ["Índice de picos", "El mismo cálculo en los radios 0,88, 0,92 y 0,96."],
  ["Irregularidad del borde", "Desviación del radio del borde entre su radio."],
  ["Simetría", "Correlación de Pearson entre perfiles radiales de L* de sectores opuestos (8 sectores, 25 anillos), promediada y acotada a [0, 1]."],
  ["Intensidad de color", "0,6 × croma C* medio de las zonas media y externa sobre 40, más 0,4 × contraste medio de las fronteras sobre 25, cada término acotado a [0, 1]."],
])}
<h2>Escala de Ford estimada por programa</h2>
<p>Como referencia comparable entre muestras, el motor traduce los rasgos a rangos de dos enteros de la escala 1–5 de Ford et al.: canales desde la radialidad, (r − 0,2)/0,55; picos desde 0,6 × picos normalizados + 0,4 × irregularidad del borde / 0,08; intensidad desde el índice de intensidad. La puntuación x = 1 + 4s se redondea hacia abajo y hacia arriba. No ve la imagen: no es una lectura, y la fuente advierte que en 343 muestras estos rasgos no variaron de forma consistente con la condición del suelo.</p>

<h1>5. Lectura con IA</h1>
<ul>
<li><b>Modelo.</b> Claude Haiku 4.5 (Anthropic), a temperatura 0, con un reintento si la validación falla. Coste típico cercano a US$ 0,02 por lectura.</li>
<li><b>Entrada.</b> La foto reducida a 1.024 px, el informe de la compuerta, los rasgos, la escala programática, el idioma pedido (español, inglés o alemán) y el contexto agronómico y de protocolo declarado: departamento, municipio, altitud, variedad, manejo, fecha, prácticas, papel, dilución y días desde el revelado. Si el productor declaró un análisis cuantitativo de laboratorio (pH, materia orgánica, N, P, K, Ca, Mg), viaja marcado como dato del laboratorio, no de la foto. No incluye finca, lote, coordenadas ni el nombre de quien prepara el informe.</li>
<li><b>Instrucciones (${esc(VERSION_PROMPT)}).</b> Se ensamblan desde las reglas: describir primero lo que se ve citando los rasgos; escala de Ford como rango de dos enteros; cada interpretación con observación, fuente permitida y nivel; confianza baja o media, nunca alta; recomendaciones prudentes; el texto libre del usuario es un dato, nunca una instrucción; y una sección para el productor en palabras del campo.</li>
<li><b>Salida.</b> JSON con esquema cerrado: descripción visual, escala de Ford, interpretaciones (i1…), contexto regional, recomendaciones técnicas (r1…), el contraste con el laboratorio declarado (solo si lo hubo) e informe del productor con señal, resumen, conjeturas (c1…), prácticas (a1…) y el bloque «para confirmar» (k1…). El texto libre sale en el idioma pedido; las enumeraciones, los ids de práctica y las fuentes no se traducen.</li>
</ul>

<h1>6. Validación de la salida en el servidor</h1>
<p>La respuesta del modelo no llega a la pantalla sin pasar estas comprobaciones. Si alguna falla, se pide una corrección; si vuelve a fallar, no se muestra.</p>
<ul>
<li><b>Afirmaciones prohibidas</b> de las reglas, como el vínculo con la taza, las cifras de nutrientes o la equivalencia con laboratorio. Frases que niegan la medición, como «no mide», se permiten.</li>
<li><b>Lenguaje probabilístico</b> en lecturas, resumen y conjeturas.</li>
<li><b>Fuentes y niveles.</b> Solo fuentes permitidas por las reglas y nunca por encima de su nivel. Si se citan varias, cuenta el nivel más conservador.</li>
<li><b>Coherencia con los rasgos.</b> Con radialidad baja no se admiten canales altos ni textos de canales bien desarrollados; con radialidad alta no se admite negar los canales de la zona externa. La comprobación mira la cláusula y la zona.</li>
<li><b>Certeza calculada, no escrita.</b> La certeza de una conjetura es media solo si alguna interpretación que la sustenta tiene confianza media y nivel A o B; si no, baja.</li>
<li><b>Cara del productor.</b> De 2 a 5 conjeturas, cada una con zona del croma; prácticas solo del catálogo, ordenadas por prioridad y al menos una; laboratorio y repetir el croma siempre, al final; sin nombres de nutrientes, acidez ni jerga técnica.</li>
<li><b>Descargo obligatorio.</b> Sale de las reglas y no lo escribe el modelo.</li>
<li><b>Idioma.</b> Las prohibiciones, la duda y la coherencia se comprueban con el léxico del idioma pedido además del español; lo que el servidor pone por su cuenta (catálogo, señales, certezas, etiquetas, descargos, reglas regionales) sale de las traducciones de las reglas.</li>
<li><b>Laboratorio declarado.</b> Si el productor declaró un análisis cuantitativo, el modelo debe escribir el contraste técnico, con lenguaje probabilístico y sin taza ni precio; ahí puede citar los valores declarados porque no los inventa. La cara del productor sigue sin nombrar nutrientes: el productor ve sus propios valores en una tabla aparte, tal como los escribió.</li>
</ul>

<h1>7. Las dos caras y el Feedback Técnico</h1>
<p><b>Productor.</b> La cara del productor abre con la foto anotada: un número y una flecha por conjetura, ubicados con el centro, el radio y las fronteras medidas. Luego vienen la señal (buena, mixta o atención), un resumen, las conjeturas con lo que se ve, lo que podría significar, otra posibilidad, lo que implicaría y su certeza, las prácticas de manejo, lo que conviene hacer para confirmar y, si lo declaró, la tabla de su análisis de laboratorio. El informe puede llevar «Preparada por» con un nombre (el de la cuenta por defecto) y se imprime con la razón social, el NIT, la web y la numeración de páginas. La interfaz y la lectura están en español, inglés o alemán.</p>
<p><b>Laboratorio.</b> Muestra la compuerta con sus valores, las fronteras dibujadas, los rasgos, la escala programática, la lectura técnica completa y la misma foto anotada. El técnico da un veredicto y un comentario por elemento (i, r, c, a, k y la escala de Ford con su rango corregido), se identifica con laboratorio, RUT, nombre y firma dibujada, y exporta un Feedback Técnico en JSON. CTC usa esos archivos para revisar reglas, umbrales e instrucciones; hasta tener esa revisión experta, las reglas se consideran provisionales.</p>

<h1>8. Límites conocidos</h1>
<ul>
<li>El único estudio grande (Ford et al. 2021, n = 343, nivel A) no halló variación consistente de los rasgos con la condición del suelo.</li>
<li>Ninguna fuente abierta estudia cromas de Pfeiffer en Andisoles del Eje Cafetero; las reglas regionales son hipótesis razonadas.</li>
<li>La misma muestra cambia de aspecto con la dilución, el papel, la época y los días de revelado. Solo se comparan cromas hechos con el mismo protocolo.</li>
<li>Una foto de celular no está calibrada en color; la compuerta rechaza lo peor, pero no corrige la dominante de la luz.</li>
<li>No hay todavía un conjunto de cromas colombianos con laboratorio pareado para validar la lectura; el Feedback Técnico es el camino para construirlo.</li>
</ul>`,
});

// ── 02 · Base de conocimiento ────────────────────────────────────────────────
const niveles = reglas.evidence_levels;
const filasZonas = reglas.zones.map((z) => [`<b>${esc(NOMBRE_ZONA[z.id] ?? z.id)}</b><br><span class="nota">${esc(z.names.join(" · "))}</span>`, `${coma(z.relative_radius[0])}–${coma(z.relative_radius[1])}`, esc(z.meaning), esc(z.sources.join("; ")), `<span class="nivel">${esc(z.evidence)}</span>`]);
const filasColor = reglas.colour_readings.map((c) => [esc(c.pattern), esc(c.reading) + (c.caveat ? `<br><span class="nota">Salvedad: ${esc(c.caveat)}</span>` : ""), esc(c.sources.join("; ")), `<span class="nivel">${esc(c.evidence)}</span>`]);
const practicas = Object.entries(reglas.practicas_de_manejo).filter(([, v]) => v && typeof v === "object" && v.titulo);
const filasPracticas = practicas.map(([id, p]) => [`<span class="mono">${esc(id)}</span>`, esc(p.titulo) + (p.siempre ? ' <span class="nota">(siempre, al final)</span>' : ""), esc((p.fuentes ?? []).join("; "))]);
const regional = reglas.regional_context_rules;
const doc2 = documento({
  codigo: "CTCX-CROMA-DOC-02",
  titulo: "Base de conocimiento: reglas de interpretación y fuentes",
  resumen: `Presenta las reglas de interpretación v${esc(reglas.$schema_version)} con que el Lector lee un cromatograma: zonas, escala morfológica, grupos de forma, lecturas de color, contexto regional, reglas de comparación, metadatos de protocolo, catálogo de prácticas y lenguaje para el productor. Cada criterio lleva su fuente y su nivel de evidencia. Las reglas son una compilación de CTC, corregida contra las fuentes primarias abiertas; las tablas de este documento se generan desde el mismo archivo que usa la herramienta.`,
  cuerpo: `
<h1>1. Niveles de evidencia</h1>
${tabla(["Nivel", "Criterio", "Lenguaje permitido"], ["A", "B", "C"].map((k) => [`<span class="nivel">${k}</span>`, esc(niveles[k]), esc((reglas.language_policy[k] ?? []).map((x) => `«${x}»`).join(", "))]))}
<h2>Fuentes y su nivel máximo</h2>
${tabla(["Fuente (tal como la cita el modelo)", "Nivel máximo"], Object.entries(reglas.source_levels).map(([f, n]) => [esc(f), `<span class="nivel">${esc(n)}</span>`]))}
<h2>Afirmaciones prohibidas</h2>
<ul>${reglas.language_policy.forbidden_claims.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>

<h1>2. Zonas del cromatograma</h1>
<p>${esc(reglas.radius_reference)}</p>
${tabla(["Zona", "Radio relativo (prior)", "Significado en la literatura", "Fuentes", "Nivel"], filasZonas)}

<h1>3. Escala morfológica de Ford et al.</h1>
<p>Fuente: ${esc(reglas.ford_scale.source)}; definición en ${esc(reglas.ford_scale.definition_source)}. Nivel ${esc(reglas.ford_scale.evidence)}.</p>
${tabla(["Rasgo", "1", "5"], Object.entries(reglas.ford_scale.features).map(([k, v]) => [esc({ channel_structure: "Estructura de canales", spike_development: "Desarrollo de picos", colour_intensity: "Intensidad de color" }[k] ?? k), esc(v["1"]), esc(v["5"])]))}
<ul>
<li><b>Salvedad.</b> ${esc(reglas.ford_scale.caveat)}</li>
<li><b>Niveles intermedios.</b> ${esc(reglas.ford_scale.intermediate_levels)}</li>
<li><b>Intensidad y tono.</b> ${esc(reglas.ford_scale.scores_intensity_not_hue)}</li>
<li><b>Procedimiento.</b> ${esc(reglas.ford_scale.procedure)}</li>
<li><b>Distribución observada.</b> ${esc(reglas.ford_scale.observed_distribution)}</li>
<li><b>Cómo se informa.</b> ${esc(reglas.ford_scale.reporting_rule)}</li>
</ul>

<h1>4. Grupos de forma</h1>
<p>Fuente: ${esc(reglas.morphology_groups.source)}, nivel ${esc(reglas.morphology_groups.evidence)}.</p>
${tabla(["Grupo", "Descriptores", "Lectura de práctica"], [["Concéntrico", esc(reglas.morphology_groups.concentric.descriptors.join(", ")), esc(reglas.morphology_groups.concentric.practitioner_reading)], ["Radial", esc(reglas.morphology_groups.radial.descriptors.join(", ")), esc(reglas.morphology_groups.radial.practitioner_reading)]])}
<p class="nota">Salvedad: ${esc(reglas.morphology_groups.caveat)}</p>

<h1>5. Lecturas de color y forma</h1>
${tabla(["Patrón", "Lectura", "Fuentes", "Nivel"], filasColor)}

<h1>6. Contexto regional</h1>
<p>Nivel: ${esc(regional.evidence)}.</p>
${tabla(["Grupo de suelos", "Departamentos", "Línea base esperada", "Regla"], [
  ["Andisoles del Eje Cafetero", esc(regional.andisoles_eje_cafetero.departments.join(", ")), esc(regional.andisoles_eje_cafetero.expected_baseline), esc(regional.andisoles_eje_cafetero.rule)],
  ["Sedimentarios y metamórficos", esc(regional.sedimentarios_metamorficos.departments.join(", ")), esc(regional.sedimentarios_metamorficos.expected_baseline), esc(regional.sedimentarios_metamorficos.rule)],
  ["Región desconocida", "—", "—", esc(regional.unknown_region.rule)],
])}

<h1>7. Comparación y protocolo</h1>
<ul>${reglas.comparison_rules.map((r) => `<li>${esc(r)}</li>`).join("")}</ul>
${tabla(["Metadato de protocolo", "Qué registra"], Object.entries(reglas.protocol_metadata.fields).map(([k, v]) => [`<span class="mono">${esc(k)}</span>`, esc(v)]))}
<p>${esc(reglas.protocol_metadata.rule)}</p>

<h1>8. Catálogo de prácticas de manejo</h1>
<p>El modelo solo puede recomendar prácticas de este catálogo. Los pasos de cada práctica están escritos por CTC y no los redacta el modelo; el análisis de laboratorio y repetir el croma se incluyen siempre, al final del informe.</p>
${tabla(["Clave", "Práctica", "Fuentes"], filasPracticas)}

<h1>9. Lenguaje para el productor</h1>
<ul>
<li><b>Tono.</b> ${esc(reglas.lenguaje_productor.tono)}</li>
<li><b>Señales.</b> ${Object.entries(reglas.lenguaje_productor.senales).map(([k, v]) => `${esc(k)}: «${esc(v)}»`).join(" · ")}</li>
<li><b>No se nombran.</b> ${esc(reglas.lenguaje_productor.prohibido_nombrar.join(", "))}. ${esc(reglas.lenguaje_productor.motivo_prohibido)}</li>
<li><b>Palabras técnicas vetadas.</b> ${esc(reglas.lenguaje_productor.palabras_tecnicas_prohibidas.join(", "))}.</li>
<li><b>Certezas.</b> ${Object.values(reglas.lenguaje_productor.certezas).map((v) => `«${esc(v)}»`).join(" ")}</li>
</ul>

<h1>10. Descargo obligatorio</h1>
<p>${esc(reglas.mandatory_disclaimer_es)}</p>

<h1>11. Bibliografía y licencias</h1>
<p class="nota">El nivel es la valoración de CTC para este uso. «Acceso» describe cómo se consultó la obra. Ninguna obra de terceros se reproduce en la herramienta ni en este documento.</p>
${tabla(["Obra", "Licencia o acceso", "Nivel", "Qué aporta a las reglas"], [
  ["Ford, B. M., Stewart, B. A., Tunbridge, D. J. y Tilbrook, P. (2021). Paper chromatography: An inconsistent tool for assessing soil health. <i>Geoderma</i> 383:114783. doi:10.1016/j.geoderma.2020.114783", "de pago; leído en resumen", "A", "salvedad de consistencia de los rasgos (n = 343)"],
  ["Kokornaczyk, M. O. et al. (2016). Analysis of soils by means of Pfeiffer's circular chromatography test and comparison to chemical analysis results. <i>Biol. Agric. Hortic.</i> 33(3):143–157. doi:10.1080/01448765.2016.1214889", "de pago; método conocido a través de Ford et al. 2019 y Domingues et al. 2022", "A", "grupos concéntrico y radial"],
  ["Ford, B., Cook, B., Tunbridge, D. y Tilbrook, P. (2019). Using paper chromatography for assessing soil health in southwestern Australia. UWA.", "acceso abierto", "B", "definición de la escala 1–5, procedimiento y distribución (n = 361)"],
  ["Graciano, I. et al. (2020). Evaluating Pfeiffer Chromatography for Its Validation as an Indicator of Soil Quality. <i>J. Agric. Stud.</i> 8(3).", "CC BY 4.0", "B", "zona media frente a carbono de biomasa microbiana (n = 12)"],
  ["Pilon, L. C., Cardoso, J. H. y Medeiros, F. S. (2018). Guia prático de cromatografia de Pfeiffer. Embrapa, Documentos 455.", "acceso gratuito; derechos de Embrapa", "B", "zona periférica, escala visual de picos"],
  ["Ardila Gómez, J. D. (2026). Análisis de los suelos mediante la cromatografía de Pfeiffer… café orgánico, Guadalupe, Santander. UIS.", "CC BY-NC-ND 4.0", "B", "café colombiano con laboratorio pareado; centro blanco nítido o cremoso; efecto de la dilución; ejemplo negativo de vínculo con la taza"],
  ["Nivia Torres, I. N. (2017). Análisis del uso de la cromatografía como herramienta cualitativa de diagnóstico de la fertilidad del suelo. UNAD.", "acceso abierto", "B", "monografía de lectura por forma y color"],
  ["Programa Altepetl, SEDEMA-CDMX (2021). Manual para la elaboración de cromatografía de suelos mediante el método Pfeiffer.", "acceso restringido", "B", "observación, diagnóstico y manejo"],
  ["Restrepo Rivera, J. y Pinheiro, S. (2011). Cromatografía: imágenes de vida y destrucción del suelo.", "libro con derechos", "C", "criterios de práctica de color y forma, citados a través de fuentes secundarias"],
  ["Pfeiffer, E. E. (1984). Chromatography Applied to Quality Testing.", "libro con derechos", "C", "origen del método"],
  ["Hernández-Rodríguez, A. et al. (2021). <i>Terra Latinoamericana</i> 39:e844; Domingues, S., Boff, P. y Boff, M. I. C. (2022). <i>Rev. Mex. Cienc. Agríc.</i> 13(7):1183; Pian, L. (2017), Dottenfelderhof; Trío Maseda, M. (2016), UPM, CC BY-NC-ND 3.0 ES; Mikrobiomik, guía, CC BY-SA 4.0", "acceso abierto o licencias indicadas", "B–C", "contraste de radios de zona, textura, estaciones, controles con reactivos, estandarización y protocolo"],
])}`,
});

// ── 03 · Datos, calibración y validación ─────────────────────────────────────
const doc3 = documento({
  codigo: "CTCX-CROMA-DOC-03",
  titulo: "Datos, calibración y validación",
  resumen: "Reúne los datos con que se construyó y se prueba el Lector: los datasets abiertos usados, la calibración de la compuerta de captura con capturas de laboratorio, lo que dicen las fuentes sobre las fronteras de zona, las pruebas automáticas del guardián y del modelo, y los límites de validación que siguen abiertos.",
  cuerpo: `
<h1>1. Datos usados</h1>
${tabla(["Dataset", "Contenido", "Licencia", "Uso en el Lector"], [
  ["Martins, D. W. P. y Calixto, W. P. (2026). Digital Pfeiffer chromatogram image dataset for multitarget soil property prediction. Zenodo. doi:10.5281/zenodo.18840454", "108 cromatogramas de 12 suelos (Embrapa Solos, programa PAQLF), capturas de unos 8.096 px con fondo blanco y verde, máscaras, y z-scores de 15 propiedades", "CC BY 4.0", "protocolo de captura y límites documentados; no se descargaron las imágenes completas (35,9 GB)"],
  ["Martins, D. W. P., Martins, K. F. S. O. y Calixto, W. P. (2026). Código y muestras, parte I. Zenodo. doi:10.5281/zenodo.18851814", "las 108 capturas reducidas a 448 × 448 px", "CC BY 4.0", "calibración y prueba de la compuerta; solo se miden, no se redistribuyen"],
  ["Calixto, W. et al. (2025). Circular Chromatography of Pfeiffer: Soil Quality Analysis with Computer Vision. Zenodo. doi:10.5281/zenodo.16943808", "35 cromas sin datos de laboratorio, versiones segmentadas", "CC BY 4.0", "revisado; utilidad baja por falta de etiquetas"],
])}
<p class="nota">Atribución: los datasets de Martins et al. y de Calixto et al. se usan bajo la licencia Creative Commons Atribución 4.0 Internacional. Sus autores no participaron en este trabajo ni lo respaldan. No se modificaron las imágenes; las medidas derivadas son de CTCX.</p>
<p>Búsquedas sin resultados de datasets de cromatogramas de Pfeiffer: Kaggle, Mendeley Data, Dryad y figshare. No hay todavía un dataset de cromas colombianos con laboratorio pareado; es la brecha principal (sección 5).</p>

<h1>2. Calibración de la compuerta de captura</h1>
<p>Las 108 capturas de 448 px de Martins et al. se pasaron por la compuerta con escala original 18,07, que es la razón entre la captura de 8.096 px y el archivo de 448 px. Resultado con ${esc(VERSION_MOTOR)}: <b>108 de 108 pasan</b>.</p>
${tabla(["Medida", "p5", "p50", "p95", "Umbral"], [
  ["Razón de ejes (mínimo observado 0,857)", "0,885", "0,928", "0,961", `≥ ${coma(UMBRALES.razonEjesMin)}`],
  ["Diámetro del croma en la captura original (px)", "4.481", "5.204", "5.782", `≥ ${UMBRALES.diametroMin}`],
])}
${tabla(["Frontera de zona medida", "p10", "p50", "p90", "Medida (no nominal)", "Prior de las reglas"], [
  ["Central / interna", "0,10", "0,15", "0,24", "90 de 108", "0,15"],
  ["Interna / media", "0,40", "0,48", "0,52", "78 de 108", "0,50"],
  ["Media / externa", "0,80", "0,82", "0,90", "60 de 108", "0,80"],
])}
<h2>Decisiones de calibración</h2>
<ul>
<li><b>Área útil.</b> La guía inicial rechazaba si el croma ocupaba menos del 40 % del encuadre. En las capturas de laboratorio el croma ocupa entre el 25 y el 38 % (p10–p90), así que ese criterio rechazaba el 100 % de las fotos buenas. Se reemplazó por resolución del croma y perpendicularidad; el área se informa sin rechazar.</li>
<li><b>Razón de ejes.</b> Un umbral de 0,90 rechazaba 14 capturas de laboratorio hechas desde arriba; el mínimo observado es 0,857. Se fijó en 0,80.</li>
<li><b>Fronteras.</b> Buscar solo el máximo de cada ventana ponía fronteras en sus bordes (la perforación del centro, el fondo entre picos). Se exige un máximo local dentro de la ventana y, si no se ve, se usa el prior marcado como nominal.</li>
<li><b>Nitidez.</b> Se mide sobre el croma normalizado a radio 250 px porque el valor absoluto no es transferible entre resoluciones. El mínimo de las capturas de laboratorio es 13,9; el umbral es ${UMBRALES.nitidezMin}.</li>
<li><b>Fotos de ejemplo de la herramienta.</b> Las tres fotos que ofrece la cara del productor también pasan la compuerta (razón de ejes 0,93–0,99; 631–745 px de diámetro).</li>
</ul>

<h1>3. Radios de zona en las fuentes</h1>
<p>Los radios de las reglas son priors. Las fuentes, medidas respecto al frente del extracto, muestran la variación que justifica medir las fronteras en cada croma. Resumen elaborado por CTC a partir de las figuras y tablas citadas; los valores marcados como medidos tienen un error aproximado de ± 0,05.</p>
${tabla(["Fuente", "Central", "Fin de la interna", "Fin de la media", "Externa"], [
  ["Embrapa Documentos 455, bosque (medido)", "0,03–0,22", "0,54", "0,76", "0,76–1,0"],
  ["Embrapa Documentos 455, barbecho (medido)", "0,02–0,14", "0,72", "0,84", "0,84–1,0"],
  ["UIS 2026, café en Santander (medido)", "0–0,12", "0,45–0,55", "banda de picos 0,5–1,0", "—"],
  ["Ford et al. 2019, promedio de 361 cromas", "central + interna 0–0,45", "—", "0,855", "0,855–1,0"],
  ["Hernández-Rodríguez et al. 2021 (anchuras medias)", "0–0,04", "0,52", "0,77", "0,77–0,84"],
  ["Martins D2 con el motor de CTCX (mediana)", "0–0,15", "0,48", "0,82", "0,82–1,0"],
])}
<p>Ford et al. 2019 informan una mediana de 2,5 en canales, picos y color, y el color nunca pasó de 4. La tesis de la UIS (café, Santander) encontró cromas dorados con picos amplios en suelos que el laboratorio dio ácidos y pobres en materia orgánica: dorado no equivale a materia orgánica alta, y por eso esa lectura lleva salvedad en las reglas.</p>

<h1>4. Pruebas automáticas</h1>
<h2>Guardián sin gasto</h2>
<p>Un guardián determinista (<span class="mono">qa-cromatografia-check</span>) corre en cada entrega. Comprueba que las reglas y el motor coinciden, que la compuerta rechaza casos sintéticos (sin círculo, borrosa, recortada, oblicua, fondo oscuro, baja resolución), y que la validación de la salida rechaza respuestas mal formadas: afirmaciones prohibidas, fuentes inventadas o por encima de su nivel, lenguaje categórico, incoherencias con la radialidad, nutrientes o jerga en la cara del productor, prácticas fuera del catálogo y certezas infladas. También revisa las costuras del servidor (sesión, acceso, techo diario, registro de consumo) y de la herramienta (puente de guardado, consentimiento, descargo que sale de las reglas).</p>
<h2>Prueba con el modelo</h2>
<p>Una prueba manual, con gasto, envía un croma de referencia al modelo real y exige que la respuesta pase la validación completa. En la versión actual pasa al primer intento, con un coste cercano a US$ 0,021 por lectura. El puente de guardado se prueba en un navegador real: la herramienta se anuncia, un cambio llega a la plataforma y el trabajo se restaura al volver.</p>

<h1>5. Lo que falta validar</h1>
<ul>
<li><b>Revisión experta.</b> Las reglas v${esc(reglas.$schema_version)} no han sido revisadas por un laboratorio colombiano. El Feedback Técnico recoge veredicto, comentario y rango corregido por elemento, con la identificación del laboratorio, para esa revisión.</li>
<li><b>Datos colombianos.</b> Hace falta un conjunto de cromas de fincas cafeteras con análisis de laboratorio pareado, protocolo declarado y fotos de celular, para medir acuerdo entre la lectura y el laboratorio.</li>
<li><b>Andisoles.</b> No hay estudios de cromas en Andisoles. Los suelos con mucha arcilla y materia orgánica pueden no completar el desarrollo con el protocolo estándar (Martins et al., limitaciones del dataset).</li>
<li><b>Transferencia.</b> Martins et al. 2026 no lograron transferir su modelo entre tipos de suelo (validación LOSO negativa). Cualquier regla aprendida debe validarse por tipo de suelo.</li>
<li><b>Color.</b> Las fotos de celular no están calibradas; una tarjeta de color en el encuadre mejoraría la comparación entre fotos.</li>
</ul>`,
});

// ── Impresión ────────────────────────────────────────────────────────────────
const PIE = (codigo) => `<div style="width:100%;font:7.5px 'Segoe UI',sans-serif;color:#6E5F8A;padding:0 17mm;display:flex;justify-content:space-between"><span>© ${ANIO} Colombian Trading Company S.A.S. (CTCX) · ${codigo} · Prohibida su reproducción sin autorización escrita</span><span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span></div>`;
const CABECERA = (titulo) => `<div style="width:100%;font:7.5px 'Segoe UI',sans-serif;color:#451D96;padding:0 17mm;display:flex;justify-content:space-between;letter-spacing:.08em"><span>CTCX · LECTOR DE CROMATOGRAFÍA DE SUELO</span><span>${esc(titulo)}</span></div>`;

mkdirSync(SALIDA, { recursive: true });
const b = await chromium.launch();
const p = await b.newPage();
for (const [archivo, codigo, titulo, html] of [
  ["CTCX-Croma-01-Metodologia.pdf", "CTCX-CROMA-DOC-01", "Metodología", doc1],
  ["CTCX-Croma-02-Base-de-conocimiento.pdf", "CTCX-CROMA-DOC-02", "Base de conocimiento y fuentes", doc2],
  ["CTCX-Croma-03-Datos-y-validacion.pdf", "CTCX-CROMA-DOC-03", "Datos, calibración y validación", doc3],
]) {
  await p.setContent(html, { waitUntil: "load" });
  const pdf = await p.pdf({ format: "A4", printBackground: true, displayHeaderFooter: true, headerTemplate: CABECERA(titulo), footerTemplate: PIE(codigo), margin: { top: "20mm", bottom: "18mm", left: "17mm", right: "17mm" } });
  writeFileSync(join(SALIDA, archivo), pdf);
  console.log(`${archivo} · ${(pdf.length / 1024).toFixed(0)} KB`);
}
await b.close();
