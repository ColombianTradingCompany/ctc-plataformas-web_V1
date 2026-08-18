// Construye la RUEDA DE CATACIÓN de cada lote mock de la cinta.
//
//   node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/build-ruedas-mock.mjs
//
// POR QUÉ ASÍ, Y NO DIBUJANDO UNA RUEDA NUEVA. La rueda de sabores de la casa ya
// existe y es la buena: `public/tools/rueda-catacion.html`, la herramienta que usa
// el equipo. Tiene la taxonomía SCA entera (familias → subfamilias → hojas) y su
// paleta. Redibujarla aquí habría creado una SEGUNDA rueda que se separaría de la
// primera al primer cambio de taxonomía — exactamente el error que este repo ya
// cometió con los grados y que costó meterlos en un solo archivo.
//
// CÓMO. Se abre la herramienta en Chrome headless por CDP (no hay puppeteer en el
// repo; receta de la memoria) y se trabaja sobre el SVG YA DIBUJADO: cada gajo es
// un `.wedge` con `data-level|fam|sub|leaf`, y cada rótulo un `.wedge-label` con
// los mismos atributos. Se buscan las notas de cata del lote entre las hojas, se
// dejan encendidos sus gajos (y los de su familia y subfamilia) y se apaga el
// resto al 10 % — que es el mismo tratamiento que la herramienta aplica en su
// propia exportación (`buildWheelSnapshotSVG`, leída para copiar sus reglas).
//
// ⚠️ Las funciones internas de la herramienta (`toggleNeedle`, `buildSearchIndex`)
// NO son globales: viven en el ámbito del módulo y desde CDP no se ven. Por eso se
// conduce el DOM y no la API. Si algún día se exponen, esto se puede simplificar.
//
// SALIDA, dos por lote:
//   · `rueda-<id>.svg`      — con los rótulos de lo encendido, para la ficha PDF.
//   · `rueda-<id>-mini.svg` — sin una sola letra, para el reverso de la tarjeta:
//                             a 250 px un rótulo de 11 px es ruido, no información.
// Se retiran con el resto de los mock (receta en `sneakPeekMock.ts`).

import { writeFileSync, mkdirSync, existsSync, rmSync } from "node:fs";
import { execFile } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { SNEAK_PEEK_MOCK } from "../src/lib/catalogo/sneakPeekMock.ts";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const HERRAMIENTA = `${RAIZ}/public/tools/rueda-catacion.html`;
const SALIDA = `${RAIZ}/public/images/catalogo/sneak-peek`;
const PERFIL = `${RAIZ}/.rueda-tmp-profile`;
const CHROME = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";

// Las notas de cata son prosa («Chocolate, clavo de olor, frutos rojos…»), no una
// lista de etiquetas. Se parten por comas y se tiran los descriptores de CUERPO y
// ACIDEZ: son atributos de la taza, no sabores, y no viven en la rueda.
const NO_ES_SABOR = new Set(
  ("acidez cuerpo residual taza dulzor final sabor aroma fragancia notas nota de y con a media medias medio medios " +
    "alta alto baja bajo limpia limpio equilibrada equilibrado brillante delicada delicado cremosa cremoso " +
    "redonda redondo sedosa sedoso larga largo plena pleno suave vinica vinico compleja complejo en dulce")
    .split(" ")
);

function terminos(cup) {
  const frases = String(cup || "")
    .split(/[;,.]/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  const salida = [];
  for (const frase of frases) {
    salida.push(frase); // «clavo de olor», «frutos rojos» — la frase entera primero
    for (const palabra of frase.split(/\s+/)) {
      const p = palabra.replace(/[^\p{L}]/gu, "");
      if (p.length >= 4 && !NO_ES_SABOR.has(p.normalize("NFD").replace(/[\u0300-\u036f]/g, ""))) {
        salida.push(p);
      }
    }
  }
  return [...new Set(salida)];
}

if (!existsSync(CHROME)) {
  console.error(`No encuentro Chrome en ${CHROME}. Defina CHROME_PATH y vuelva a correr.`);
  process.exit(1);
}
mkdirSync(SALIDA, { recursive: true });

const chrome = execFile(CHROME, [
  "--headless=new",
  "--disable-gpu",
  "--remote-debugging-port=9333",
  `--user-data-dir=${PERFIL}`,
  "--window-size=1300,1300",
  "about:blank",
]);
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
await espera(2500);

const objetivos = await (await fetch("http://127.0.0.1:9333/json")).json();
const ws = new WebSocket(objetivos.find((t) => t.type === "page").webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));

const pendientes = new Map();
let n = 0;
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pendientes.has(m.id)) {
    pendientes.get(m.id)(m);
    pendientes.delete(m.id);
  }
};
const enviar = (method, params = {}) =>
  new Promise((res) => {
    const id = ++n;
    pendientes.set(id, res);
    ws.send(JSON.stringify({ id, method, params }));
  });

await enviar("Page.enable");
await enviar("Runtime.enable");
await enviar("Page.navigate", { url: pathToFileURL(HERRAMIENTA).href });
await espera(3200);

// El guion que corre DENTRO de la herramienta. Recibe los términos del lote y
// devuelve las dos variantes del SVG más las hojas que encendió.
const GUION = (terminosLote) => `(() => {
  const norm = (s) => (s || '').normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().trim();
  const cont = document.getElementById('wheelContent');
  const svgRaiz = cont.closest('svg') || cont;

  const wedges = [...cont.querySelectorAll('.wedge')];
  const rotulos = [...cont.querySelectorAll('.wedge-label')];   // NO .wedge-icon: son emojis
  const iconos = [...cont.querySelectorAll('.wedge-icon')];

  // Índice de TODOS los gajos, no solo las hojas: «Floral», «Cacao» o «Caramelo»
  // son notas legítimas que en la rueda viven como familia o subfamilia, y
  // buscarlas solo entre las hojas las dejaba fuera (pasó con 3 de los 7 lotes).
  const candidatos = wedges.map((w) => {
    const nivel = +w.getAttribute('data-level');
    const leaf = w.getAttribute('data-leaf');
    const rot = rotulos.find((r) =>
      r.getAttribute('data-level') === String(nivel) &&
      r.getAttribute('data-fam') === w.getAttribute('data-fam') &&
      (nivel < 2 || r.getAttribute('data-sub') === w.getAttribute('data-sub')) &&
      (nivel < 3 || r.getAttribute('data-leaf') === leaf));
    const propio = nivel === 3 ? leaf : nivel === 2 ? w.getAttribute('data-sub') : w.getAttribute('data-fam');
    return {
      nivel,
      fam: w.getAttribute('data-fam'),
      sub: w.getAttribute('data-sub'),
      leaf,
      label: rot ? rot.textContent.trim() : String(propio || '').replace(/-/g, ' '),
      slug: String(propio || ''),
    };
  });

  // Puntuación por CONJUNTOS DE PALABRAS, sin expresiones regulares: construir
  // una regex a partir del término obliga a escapar, y ese escape tiene que
  // sobrevivir a dos capas de comillas hasta llegar aquí — ya se rompió una vez.
  // Exacto manda; luego que la nota quepa entera en el término (o al revés); el
  // «contiene» suelto va de último, que es el que hacía que «nuez» cayera en
  // «nuez moscada».
  const palabras = (x) => norm(x).split(/[^a-z0-9]+/).filter(Boolean);
  function puntua(t, c) {
    const l = norm(c.label), sl = norm(c.slug);
    if (l === t || sl === t) return 100;
    const pt = palabras(t), pl = palabras(c.label);
    if (pl.length && pl.every((w) => pt.includes(w))) return 70;
    if (pt.length >= 2 && pt.every((w) => pl.includes(w))) return 65;
    if (l.length >= 5 && pt.length >= 2 && (l.includes(t) || t.includes(l))) return 30;
    return 0;
  }

  const elegidas = [];
  for (const termino of ${JSON.stringify(terminosLote)}) {
    if (elegidas.length >= 5) break;
    const t = norm(termino);
    if (t.length < 3) continue;
    let mejor = null, mejorP = 0;
    for (const c of candidatos) {
      const p = puntua(t, c) + c.nivel; // a igualdad, gana la nota más específica
      if (p > mejorP && p > c.nivel) { mejor = c; mejorP = p; }
    }
    if (!mejor) continue;
    const clave = mejor.fam + '|' + mejor.sub + '|' + mejor.leaf;
    if (elegidas.some((e) => e.fam + '|' + e.sub + '|' + e.leaf === clave)) continue;
    elegidas.push({ ...mejor, termino });
  }
  if (!elegidas.length) return { elegidas: [] };

  // Una nota de familia enciende la familia entera; una de hoja, solo su rama.
  const fams = new Set(elegidas.map((e) => e.fam));
  const subs = new Set(elegidas.filter((e) => e.nivel >= 2).map((e) => e.fam + '|' + e.sub));
  const leaves = new Set(elegidas.filter((e) => e.nivel === 3).map((e) => e.fam + '|' + e.sub + '|' + e.leaf));
  const familiasEnteras = new Set(elegidas.filter((e) => e.nivel === 1).map((e) => e.fam));
  const subsEnteras = new Set(elegidas.filter((e) => e.nivel === 2).map((e) => e.fam + '|' + e.sub));
  const encendido = (w) => {
    const lv = w.getAttribute('data-level');
    const f = w.getAttribute('data-fam'), s = w.getAttribute('data-sub'), l = w.getAttribute('data-leaf');
    if (lv === '1') return fams.has(f);
    if (lv === '2') return subs.has(f + '|' + s) || familiasEnteras.has(f);
    return leaves.has(f + '|' + s + '|' + l) || familiasEnteras.has(f) || subsEnteras.has(f + '|' + s);
  };

  function exportar(conRotulos) {
    const clon = cont.cloneNode(true);
    const rotor = clon.querySelector('#wheelRotor');
    if (rotor) rotor.removeAttribute('transform');   // la rueda gira; el retrato no

    clon.querySelectorAll('.wedge').forEach((w) => {
      const on = encendido(w);
      const lv = w.getAttribute('data-level');
      const exacto =
        (lv === '3' && leaves.has(w.getAttribute('data-fam') + '|' + w.getAttribute('data-sub') + '|' + w.getAttribute('data-leaf'))) ||
        (lv === '2' && subsEnteras.has(w.getAttribute('data-fam') + '|' + w.getAttribute('data-sub'))) ||
        (lv === '1' && familiasEnteras.has(w.getAttribute('data-fam')));
      w.removeAttribute('class'); w.removeAttribute('style'); w.removeAttribute('tabindex');
      w.setAttribute('stroke', exacto ? '#2c1a52' : '#ffffff');
      w.setAttribute('stroke-width', exacto ? '3' : '1.2');
      if (!on) w.setAttribute('opacity', '0.10');
    });

    clon.querySelectorAll('.wedge-label, .wedge-icon').forEach((t) => {
      const familia = t.getAttribute('data-fam'), sub = t.getAttribute('data-sub'), hoja = t.getAttribute('data-leaf');
      const nivel = t.getAttribute('data-level');
      const on = nivel === '1' ? fams.has(familia) : nivel === '2' ? subs.has(familia + '|' + sub) : leaves.has(familia + '|' + sub + '|' + hoja);
      if (!conRotulos || !on) { t.remove(); return; }
      const cls = t.getAttribute('class') || '';
      let font = 'font-family:Arial,Helvetica,sans-serif;';
      if (cls.includes('l1')) font += 'font-weight:700;font-size:15px;';
      else if (cls.includes('l2')) font += 'font-weight:700;font-size:12px;';
      else if (cls.includes('l3')) font += 'font-weight:700;font-size:11px;';
      else if (cls.includes('wedge-icon')) font = 'font-size:22px;';
      t.setAttribute('style', font);
      t.removeAttribute('class');
    });

    clon.querySelectorAll('.steam, .needle-line, .needle-tip').forEach((e) => e.remove());
    const core = clon.querySelector('.core');
    if (core) { core.removeAttribute('class'); core.setAttribute('fill', '#f5f2fc'); core.setAttribute('stroke', '#e6e1f2'); core.setAttribute('stroke-width', '1.5'); }
    clon.querySelectorAll('.core-icon, .core-txt').forEach((e) => e.remove());

    const vb = svgRaiz.getAttribute('viewBox') || '0 0 1000 1000';
    const envoltorio = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    envoltorio.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    envoltorio.setAttribute('viewBox', vb);
    envoltorio.setAttribute('width', '520');
    envoltorio.setAttribute('height', '520');
    envoltorio.appendChild(clon);
    return new XMLSerializer().serializeToString(envoltorio);
  }

  return { elegidas, svg: exportar(true), mini: exportar(false) };
})()`;

let hechas = 0;
const resumen = [];
for (const lote of SNEAK_PEEK_MOCK) {
  const r = await enviar("Runtime.evaluate", {
    expression: GUION(terminos(lote.cup)),
    returnByValue: true,
  });
  if (r.result?.exceptionDetails) {
    console.error(`${lote.id}: EXCEPCIÓN`, JSON.stringify(r.result.exceptionDetails).slice(0, 300));
    continue;
  }
  const v = r.result?.result?.value;
  if (!v || !v.elegidas.length) {
    console.log(`⚠ ${lote.id}: ninguna nota casó con la rueda — «${lote.cup}»`);
    continue;
  }
  writeFileSync(`${SALIDA}/rueda-${lote.id}.svg`, v.svg, "utf8");
  writeFileSync(`${SALIDA}/rueda-${lote.id}-mini.svg`, v.mini, "utf8");
  hechas++;
  resumen.push({ id: lote.id, notas: v.elegidas.map((e) => e.label) });
  console.log(`${lote.id}: ${v.elegidas.map((e) => e.label).join(" · ")}`);
}

ws.close();
chrome.kill();
// Chrome suelta el perfil un instante DESPUÉS de morir; en Windows borrarlo aquí
// da EPERM. Es basura temporal, no un fallo del trabajo.
try {
  rmSync(PERFIL, { recursive: true, force: true });
} catch {
  console.log("(el perfil temporal quedó en .rueda-tmp-profile; es descartable)");
}
console.log(`\n${hechas}/${SNEAK_PEEK_MOCK.length} ruedas en public/images/catalogo/sneak-peek/`);
process.exit(hechas === SNEAK_PEEK_MOCK.length ? 0 : 1);
