// Prueba EN VIVO del Lector de Cromatografía de Suelo contra la API de Anthropic
// (kickoff v2 §7: estabilidad y controles sobre la salida real del modelo).
//
//   node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/qa-cromatografia-modelo.mjs [imagen] [departamento] [corridas]
//
// CUESTA DINERO (≈ US$ 0,013 por corrida con Haiku 4.5 y el prompt 1.1, medido el
// 2026-09-13; un reintento dobla esa corrida) y por eso NO es parte de la compuerta: se corre a mano al cambiar el
// prompt, las reglas o el modelo. Lee ANTHROPIC_API_KEY (y CROMA_MODEL si está)
// de `.env.local`.
//
// Sin [imagen], dibuja un croma SINTÉTICO radial en un Chromium sin cabeza (el
// mismo generador que el guardián puro). Con [imagen], mide esa foto. En ambos
// casos los rasgos los mide `public/tools/assets/cromatografia-rasgos.js` DENTRO
// del navegador — el mismo camino que recorre la herramienta — y el prompt y la
// validación son los módulos del servidor. No escribe en la base.
//
// Lo que comprueba:
//   · cada corrida pasa `validarSalida` (claims, coherencia, cadena de evidencia)
//   · entre corridas a temperatura 0, los rangos de Ford no difieren en más de 1

import { readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";
import { ensamblarSistema, ensamblarUsuario, reglaRegional } from "../src/lib/tools/cromatografia/prompt.ts";
import { extraerJson, validarSalida } from "../src/lib/tools/cromatografia/salida.ts";

const raiz = new URL("../", import.meta.url);
const env = Object.fromEntries(
  readFileSync(new URL(".env.local", raiz), "utf8")
    .split(/\r?\n/)
    .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2].replace(/^["']|["']$/g, "")])
);
// Misma precedencia que el handler: la clave propia del Lector y, si no está, la general.
const apiKey = process.env.CROMATOGRAPHY_ANTHROPIC_API_KEY || env.CROMATOGRAPHY_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY || env.ANTHROPIC_API_KEY;
const MODEL = process.env.CROMA_MODEL || env.CROMA_MODEL || "claude-haiku-4-5-20251001";
if (!apiKey) {
  console.error("✗ Falta CROMATOGRAPHY_ANTHROPIC_API_KEY o ANTHROPIC_API_KEY en .env.local");
  process.exit(1);
}

const [rutaImagen, departamento = "Santander", corridasTxt = "3"] = process.argv.slice(2);
const CORRIDAS = Math.max(1, Math.min(5, Number(corridasTxt) || 3));
const reglas = JSON.parse(readFileSync(new URL("src/lib/tools/cromatografia/reglas.json", raiz), "utf8"));
const motor = readFileSync(new URL("public/tools/assets/cromatografia-rasgos.js", raiz), "utf8");

// ── Medir en el navegador ─────────────────────────────────────────────────────
const navegador = await chromium.launch();
const pagina = await navegador.newPage();
await pagina.setContent("<!doctype html><body></body>");
await pagina.addScriptTag({ content: motor });

let fuente = null;
if (rutaImagen) {
  const buf = readFileSync(rutaImagen);
  const mime = /\.png$/i.test(rutaImagen) ? "image/png" : /\.webp$/i.test(rutaImagen) ? "image/webp" : "image/jpeg";
  fuente = `data:${mime};base64,${buf.toString("base64")}`;
}

const medido = await pagina.evaluate(async (src) => {
  const lienzo = (w, h) => Object.assign(document.createElement("canvas"), { width: w, height: h });
  let base;
  if (src) {
    const img = new Image();
    img.src = src;
    await img.decode();
    base = lienzo(img.naturalWidth, img.naturalHeight);
    base.getContext("2d").drawImage(img, 0, 0);
  } else {
    // Croma sintético radial: zonas del guardián + 36 espigas.
    base = lienzo(900, 900);
    const g = base.getContext("2d");
    g.fillStyle = "rgb(246,246,243)";
    g.fillRect(0, 0, 900, 900);
    const c = 450, R = 380;
    const zona = (r, col) => { g.fillStyle = col; g.beginPath(); g.arc(c, c, r, 0, 2 * Math.PI); g.fill(); };
    zona(R, "rgb(228,208,150)");
    g.fillStyle = "rgb(150,104,48)";
    for (let i = 0; i < 36; i++) {
      const a = (2 * Math.PI * i) / 36, da = (2 * Math.PI) / 36 * 0.28;
      g.beginPath();
      g.moveTo(c + R * 0.74 * Math.cos(a - da), c + R * 0.74 * Math.sin(a - da));
      g.lineTo(c + R * 1.04 * Math.cos(a), c + R * 1.04 * Math.sin(a));
      g.lineTo(c + R * 0.74 * Math.cos(a + da), c + R * 0.74 * Math.sin(a + da));
      g.fill();
    }
    zona(R * 0.76, "rgb(212,160,70)");
    zona(R * 0.48, "rgb(150,98,40)");
    zona(R * 0.19, "rgb(243,236,222)");
  }
  const reducir = (lado) => {
    const k = Math.min(1, lado / Math.max(base.width, base.height));
    const cv = lienzo(Math.round(base.width * k), Math.round(base.height * k));
    cv.getContext("2d").drawImage(base, 0, 0, cv.width, cv.height);
    return cv;
  };
  const cA = reducir(900);
  const res = window.CromaRasgos.analizar(cA.getContext("2d").getImageData(0, 0, cA.width, cA.height), { escalaOriginal: base.width / cA.width });
  return { res, imagen: reducir(1024).toDataURL("image/jpeg", 0.85) };
}, fuente);
await navegador.close();

console.log(`Compuerta: ${medido.res.valida ? "pasa" : "RECHAZA"} · ${JSON.stringify(medido.res.validation_report)}`);
if (!medido.res.valida) {
  console.error("✗ La foto no pasa la compuerta; no se llama al modelo.");
  process.exit(1);
}
const { rasgos, ford_programatico: ford } = medido.res;
console.log(`Rasgos: radialidad ${rasgos.radiality_index} · fronteras ${rasgos.zone_boundaries_rel} · Ford programático ${JSON.stringify(ford)}`);

// ── Leer con el modelo ────────────────────────────────────────────────────────
const regional = reglaRegional(reglas, departamento);
const contexto = { departamento, manejo: "orgánico", fecha_muestra: "2026-09-08", practicas: "Compost hace tres semanas; cobertura de leguminosas.", papel: "whatman-4", dilucion: "100", dias_revelado: 7 };
const system = ensamblarSistema(reglas, regional);
const m = medido.imagen.match(/^data:(image\/jpeg);base64,(.+)$/);

async function llamar(messages) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: MODEL, max_tokens: 4500, temperature: 0, system, messages }),
  });
  const j = await res.json();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${j?.error?.message}`);
  return { texto: j.content.find((c) => c.type === "text")?.text ?? "", usage: j.usage };
}

const resultados = [];
const fallidos = [];
let tokensIn = 0, tokensOut = 0, fallos = 0;
for (let i = 1; i <= CORRIDAS; i++) {
  const messages = [
    {
      role: "user",
      content: [
        { type: "image", source: { type: "base64", media_type: m[1], data: m[2] } },
        { type: "text", text: ensamblarUsuario(contexto, rasgos, regional, ford) },
      ],
    },
  ];
  let v = null;
  for (let intento = 1; intento <= 2; intento++) {
    const r = await llamar(messages);
    tokensIn += r.usage.input_tokens; tokensOut += r.usage.output_tokens;
    v = validarSalida(extraerJson(r.texto), reglas, rasgos, regional);
    console.log(`Corrida ${i}, intento ${intento}: ${v.ok ? "✓ pasa los controles" : "✗ " + v.errores.join(" | ")}`);
    if (!v.ok) fallidos.push({ corrida: i, intento, errores: v.errores, texto: r.texto });
    if (v.ok) break;
    messages.push({ role: "assistant", content: r.texto || "{}" }, { role: "user", content: `Tu respuesta no superó los controles del lector:\n- ${v.errores.join("\n- ")}\nDevuelve el JSON COMPLETO corregido con el mismo esquema, solo el JSON.` });
  }
  if (v.ok) resultados.push(v.reporte);
  else fallos++;
}

const coste = (tokensIn * 1 + tokensOut * 5) / 1e6;
console.log(`\nModelo ${MODEL} · ${tokensIn} tokens de entrada · ${tokensOut} de salida · ≈ US$ ${coste.toFixed(4)} (tarifa Haiku 4.5)`);

let estable = true;
for (const k of ["canales", "picos", "intensidad"]) {
  const los = resultados.map((r) => r.escala_ford[k].rango[0]);
  const his = resultados.map((r) => r.escala_ford[k].rango[1]);
  const dif = los.length ? Math.max(Math.max(...los) - Math.min(...los), Math.max(...his) - Math.min(...his)) : 0;
  console.log(`Estabilidad ${k}: ${resultados.map((r) => r.escala_ford[k].rango.join("–")).join(" · ")} (diferencia máx. ${dif})`);
  if (dif > 1) estable = false;
}

// Fuera del repo (es público): los reportes y los intentos fallidos, para leerlos.
const salida = join(tmpdir(), `croma-modelo-${Date.now()}.json`);
writeFileSync(salida, JSON.stringify({ modelo: MODEL, departamento, rasgos, ford, reportes: resultados, fallidos }, null, 2));
console.log(`Reportes e intentos fallidos en ${salida}`);

if (fallos || !estable) {
  console.error(`✗ qa-cromatografia-modelo: ${fallos} corrida(s) sin pasar los controles · estable=${estable}`);
  process.exit(1);
}
console.log(`✓ qa-cromatografia-modelo: ${CORRIDAS} corridas pasan los controles y son estables`);
