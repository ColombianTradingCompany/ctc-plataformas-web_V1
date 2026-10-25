// ── Guardián de la espina de integración ─────────────────────────────────────
//   node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/qa-integraciones-check.mjs
//
// Comprueba lo que puede romperse EN SILENCIO:
//
// 1. Que el vocabulario compartido de TypeScript y el enum de Postgres digan lo
//    mismo. Si se desalinean, la puerta de entrada rechaza eventos válidos —o
//    acepta dominios que la base no tiene— y nadie se entera hasta que un
//    escenario de Make falla en producción.
//
// 2. S0 (P1 del plan de unificación, 2026-10-24): que en `ultimo_error` solo
//    entren CÓDIGOS de la lista cerrada (`src/lib/integraciones/errores.ts`).
//    Un valor secreto mal puesto en `MAKE_WEBHOOK_URL` acabó guardado dentro del
//    mensaje de una excepción y a la vista en el tablero. Aquí se corre el
//    despachador y los manejadores REALES contra dobles (cliente y `fetch`
//    inyectados: sin red, sin producción) con un «canario» de 64 hex metido en
//    cada entrada, y se exige que el canario no aparezca en ningún campo
//    guardado ni en ninguna línea de consola.
//
// El enum de Postgres se pasa por argumento para no necesitar credenciales:
//   node ... qa-integraciones-check.mjs "admin_estrategia,origen_suministro,..."
// Sin argumento, comprueba la coherencia interna y los casos de S0.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { DOMINIOS, DOMINIO_LABEL, SISTEMAS, ETAPAS, CRITICIDADES, CRITICIDAD_HINT } from "../src/lib/integraciones/dominios.ts";
import { esCodigo, limpiarError, validarWebhook, errorParaMostrar, CODIGOS } from "../src/lib/integraciones/errores.ts";
import { dispatchPending } from "../src/lib/integraciones/dispatch.ts";
import { aplicarEntrante } from "../src/lib/integraciones/aplicar.ts";

let pass = 0;
const fails = [];
const check = (name, cond, detail = "") => { if (cond) pass++; else fails.push(`${name}${detail ? ` — ${detail}` : ""}`); };

// ── Coherencia interna ──────────────────────────────────────────────────────
check("hay 7 dominios", DOMINIOS.length === 7, `son ${DOMINIOS.length}`);
check("los ids son únicos", new Set(DOMINIOS.map(d => d.id)).size === DOMINIOS.length);
check("los números 0-6 no se repiten", new Set(DOMINIOS.map(d => d.n)).size === DOMINIOS.length);
check("cada dominio tiene etiqueta", DOMINIOS.every(d => DOMINIO_LABEL[d.id]?.length > 0));
check("cada dominio declara su etiqueta de Gmail", DOMINIOS.every(d => typeof d.gmail === "string" && d.gmail.length > 0));
check("toda criticidad explica qué pasa si se cae", CRITICIDADES.every(c => CRITICIDAD_HINT[c]?.length > 10));
check("el ciclo de vida empieza en propuesta y acaba en deprecada",
  ETAPAS[0] === "propuesta" && ETAPAS[ETAPAS.length - 1] === "deprecada", ETAPAS.join("→"));
check("la plataforma está entre los sistemas", SISTEMAS.includes("plataforma"));
check("los sistemas del plan están todos", ["notion","gmail","drive","calendar","instagram","youtube","whatsapp"].every(s => SISTEMAS.includes(s)));

// ── Contra el enum real de Postgres, si se pasa ─────────────────────────────
const arg = process.argv[2];
if (arg) {
  const pg = arg.split(",").map(s => s.trim()).filter(Boolean);
  const ts = DOMINIOS.map(d => d.id);
  const faltanEnPg = ts.filter(x => !pg.includes(x));
  const faltanEnTs = pg.filter(x => !ts.includes(x));
  check("TS y Postgres tienen los mismos dominios",
    faltanEnPg.length === 0 && faltanEnTs.length === 0,
    `solo en TS: [${faltanEnPg}] · solo en PG: [${faltanEnTs}]`);
  check("y en el mismo orden", ts.join(",") === pg.join(","), `${ts} vs ${pg}`);
} else {
  console.log("(sin enum de Postgres: se comprobó la coherencia interna y los casos de S0)");
}

// ── S0 · la lista cerrada ───────────────────────────────────────────────────
const CANARIO = "deadbeef".repeat(8); // 64 hex: la forma de un token
check("esCodigo acepta los códigos fijos", CODIGOS.every(c => esCodigo(c)));
check("esCodigo acepta http_404 y excepcion:TypeError", esCodigo("http_404") && esCodigo("excepcion:TypeError"));
check("esCodigo rechaza 64 hex", !esCodigo(CANARIO));
check("esCodigo rechaza texto libre, @ y clases con dígitos",
  !esCodigo("HTTP 500") && !esCodigo("a@b.co") && !esCodigo(`excepcion:${CANARIO}`) && !esCodigo("http_5000"));
check("validarWebhook: sin url → url_ausente", validarWebhook(undefined).codigo === "url_ausente");
check("validarWebhook: http: → url_invalida", validarWebhook("http://hook.eu2.make.com/x").codigo === "url_invalida");
check("validarWebhook: otro host → url_invalida", validarWebhook("https://make.com.evil.example/x").codigo === "url_invalida");
check("validarWebhook: hook de Make → ok", validarWebhook("https://hook.eu2.make.com/abc").ok === true);
check("limpiarError nunca usa .message", limpiarError(new Error(CANARIO)) === "excepcion:Error");
check("errorParaMostrar retira el texto libre", errorParaMostrar(`HTTP 500 ${CANARIO}`) === "texto retirado" && errorParaMostrar("http_500") === "http_500" && errorParaMostrar(null) === null);

// ── S0 · el despachador real contra dobles ──────────────────────────────────
const logs = [];
const original = { error: console.error, warn: console.warn, log: console.log };
for (const k of ["error", "warn", "log"]) console[k] = (...a) => { logs.push(a.map(String).join(" ")); };

function cliente(filas) {
  const escritos = [];
  return {
    escritos, filas,
    from() {
      return {
        select() {
          let soloId = null;
          const q = {
            eq: (col, val) => { if (col === "id") soloId = val; return q; }, is: () => q, lt: () => q, order: () => q,
            limit: async () => ({ data: filas.filter(f => f.estado === "pendiente" && !f.destino && f.intentos < 5 && (!soloId || f.id === soloId)).map(f => ({ ...f })) }),
          };
          return q;
        },
        update(valores) {
          return { eq: async (_c, id) => { escritos.push({ id, valores }); const f = filas.find(x => x.id === id); if (f) Object.assign(f, valores); return { error: null }; } };
        },
      };
    },
  };
}
const fila = (intentos = 0) => ({ id: "ev-1", dominio: "it_plataforma", tipo: "prueba.ping", payload: { at: "t" }, intentos, estado: "pendiente", destino: null, ultimo_error: null });
let llamadas = [];
const fetchCon = (fn) => async (url, init) => { llamadas.push({ url, init }); return fn(); };
const HOOK = "https://hook.eu2.make.com/abcdef";
const SECRETO = "s3cr3t-de-prueba";

async function caso(nombre, opts, esperado) {
  // `"url" in opts` y no un valor por defecto: un `undefined` explícito tiene que llegar como «sin url».
  const url = "url" in opts ? opts.url : HOOK;
  const secret = "secret" in opts ? opts.secret : SECRETO;
  const { produccion = true, intentos = 0, respuesta } = opts;
  llamadas = [];
  const c = cliente([fila(intentos)]);
  const r = await dispatchPending({ client: c, url, secret, produccion, fetchImpl: fetchCon(respuesta ?? (() => ({ ok: true, status: 200 }))) });
  const f = c.filas[0];
  const okFila = (esperado.estado === undefined || f.estado === esperado.estado)
    && (esperado.error === undefined || f.ultimo_error === esperado.error)
    && (esperado.intentos === undefined || f.intentos === esperado.intentos)
    && (esperado.fetch === undefined || (llamadas.length > 0) === esperado.fetch)
    && (esperado.motivo === undefined || r.motivo === esperado.motivo)
    && (esperado.intactas === undefined || (c.escritos.length === 0) === esperado.intactas);
  check(`despacho · ${nombre}`, okFila, JSON.stringify({ estado: f.estado, error: f.ultimo_error, intentos: f.intentos, fetch: llamadas.length, motivo: r.motivo, escritos: c.escritos.length }));
  for (const w of c.escritos) {
    const e = w.valores.ultimo_error;
    if (e != null) check(`despacho · ${nombre} · código válido`, esCodigo(e) && e.length <= 64 && !e.includes("@"), e);
    check(`despacho · ${nombre} · sin canario en lo guardado`, !JSON.stringify(w.valores).includes(CANARIO));
  }
  return { c, r };
}

await caso("url malformada con canario, intento 4", { url: `no es una url ${CANARIO}`, intentos: 4 }, { estado: "fallido", error: "url_invalida", intentos: 5, fetch: false });
await caso("url malformada con canario, intento 0", { url: `no es una url ${CANARIO}`, intentos: 0 }, { estado: "pendiente", error: "url_invalida", intentos: 1, fetch: false });
await caso("esquema http:", { url: `http://hook.eu2.make.com/${CANARIO}` }, { error: "url_invalida", fetch: false });
await caso("otro host", { url: `https://evil.example.com/${CANARIO}` }, { error: "url_invalida", fetch: false });
await caso("sin url", { url: undefined }, { motivo: "url_ausente", intactas: true, fetch: false });
await caso("sin secreto en producción", { secret: undefined }, { motivo: "secreto_ausente", intactas: true, fetch: false });
const ok = await caso("url y secreto válidos, HTTP 200", {}, { estado: "enviado", fetch: true });
check("despacho · 200 · destino make", ok.c.filas[0].destino === "make");
const cab = llamadas[0]?.init?.headers ?? {};
check("despacho · 200 · el secreto va SOLO en x-make-apikey", cab["x-make-apikey"] === SECRETO && !("x-ctc-secret" in cab) && !String(llamadas[0]?.init?.body).includes(SECRETO));
await caso("HTTP 500", { respuesta: () => ({ ok: false, status: 500 }) }, { estado: "pendiente", error: "http_500", intentos: 1 });
await caso("timeout", { respuesta: () => { const e = new Error(`timeout ${CANARIO}`); e.name = "TimeoutError"; throw e; } }, { error: "timeout" });
await caso("error de red con canario", { respuesta: () => { throw new TypeError(`fetch failed ${CANARIO}`); } }, { error: "red" });
await caso("excepción cuyo name lleva el canario", { respuesta: () => { const e = new Error("x"); e.name = CANARIO; throw e; } }, { error: "excepcion" });

// V6.9 · el despacho inmediato de emitEvent manda SOLO su fila; el resto espera al cron.
{
  llamadas = [];
  const c = cliente([{ ...fila(0), id: "ev-vieja" }, { ...fila(0), id: "ev-nueva" }]);
  const r = await dispatchPending({ client: c, url: HOOK, secret: SECRETO, produccion: true, soloId: "ev-nueva", timeoutMs: 3000, fetchImpl: fetchCon(() => ({ ok: true, status: 200 })) });
  const [vieja, nueva] = c.filas;
  check("despacho · soloId manda solo esa fila", r.enviados === 1 && llamadas.length === 1 && nueva.estado === "enviado" && vieja.estado === "pendiente" && vieja.intentos === 0,
    JSON.stringify({ enviados: r.enviados, llamadas: llamadas.length, vieja: vieja.estado, nueva: nueva.estado }));
  check("despacho · soloId lleva su propia señal de techo", llamadas[0]?.init?.signal instanceof AbortSignal);
}

// ── S0 · los manejadores de entrada reales ──────────────────────────────────
const refMala = await aplicarEntrante("jornada.agendada", { ref: `otra:${CANARIO}`, calendar_event_id: "e1" });
check("entrada · ref no reconocido → código", refMala.estado === "fallido" && refMala.codigo === "ref_no_reconocido", JSON.stringify(refMala));
check("entrada · el canario solo viaja en el detalle de la respuesta", refMala.detalle.includes(CANARIO) && !refMala.codigo.includes(CANARIO));
const clienteRoto = { from() { return { update() { return { eq() { return { select: async () => ({ data: null, error: { message: `boom ${CANARIO}` } }) }; } }; } }; } };
const bdMala = await aplicarEntrante("jornada.agendada", { ref: "arena:1", calendar_event_id: "e1" }, { client: clienteRoto });
check("entrada · error de base con canario → error_bd", bdMala.estado === "fallido" && bdMala.codigo === "error_bd", JSON.stringify(bdMala));
const faltan = await aplicarEntrante("cotizacion.nota", { nota: "hola" });
check("entrada · falta un campo → falta_campo", faltan.codigo === "falta_campo");
const larga = await aplicarEntrante("cotizacion.nota", { ctc_id: "Q-1", nota: "x".repeat(4001) });
check("entrada · nota larga → nota_demasiado_larga", larga.codigo === "nota_demasiado_larga");
const http = await aplicarEntrante("rts.tablero", { jobId: "j1", url: `http://x/${CANARIO}` });
check("entrada · url sin https → url_no_https", http.codigo === "url_no_https");
for (const r of [refMala, bdMala, faltan, larga, http]) check(`entrada · ${r.codigo} es código`, esCodigo(r.codigo));

for (const k of ["error", "warn", "log"]) console[k] = original[k];
check("ninguna línea de consola lleva el canario", logs.every(l => !l.includes(CANARIO)), `${logs.filter(l => l.includes(CANARIO)).length} líneas`);

// ── S0 · lectura del código: nada de .message ni detalle hacia la base o la consola ─
const RAIZ = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const archivos = [
  ...readdirSync(join(RAIZ, "src/lib/integraciones")).filter(f => f.endsWith(".ts")).map(f => join(RAIZ, "src/lib/integraciones", f)),
  join(RAIZ, "src/app/api/integraciones/[canal]/route.ts"),
  join(RAIZ, "src/app/api/cron/integraciones/route.ts"),
].filter(existsSync);
let detallesEnRespuesta = 0;
for (const a of archivos) {
  const src = readFileSync(a, "utf8");
  const corto = a.slice(RAIZ.length);
  for (const linea of src.split("\n")) {
    if (/ultimo_error\s*:/.test(linea)) check(`fuente · ${corto} · ultimo_error sin .message ni detalle`, !/\.message|detalle/.test(linea), linea.trim());
    if (/console\.(error|warn|log)\(/.test(linea)) check(`fuente · ${corto} · consola sin .message ni detalle`, !/\.message|detalle/.test(linea), linea.trim());
  }
  for (const m of src.matchAll(/NextResponse\.json\(([\s\S]*?)\)\s*;/g)) {
    check(`fuente · ${corto} · respuesta sin .message`, !/\.message/.test(m[1]), m[1].slice(0, 80));
    if (/detalle/.test(m[1])) detallesEnRespuesta++;
  }
}
check("fuente · `detalle` sale solo en la respuesta de la puerta de entrada", detallesEnRespuesta === 1, `${detallesEnRespuesta}`);
const acciones = readFileSync(join(RAIZ, "src/lib/integraciones/actions.ts"), "utf8");
check("fuente · listRecentEvents pasa ultimo_error por errorParaMostrar", /listRecentEvents[\s\S]*?errorParaMostrar\(e\.ultimo_error\)/.test(acciones));
check("fuente · retryFailedEvents solo reencola salientes", /retryFailedEvents[\s\S]*?\.is\("destino", null\)/.test(acciones));
const despacho = readFileSync(join(RAIZ, "src/lib/integraciones/dispatch.ts"), "utf8");
check("fuente · el despachador usa x-make-apikey y no x-ctc-secret", despacho.includes("x-make-apikey") && !despacho.includes("x-ctc-secret"));
const tablero = readFileSync(join(RAIZ, "src/components/panel/AutomatizacionesBoard.tsx"), "utf8");
check("fuente · sin textos viejos de cadencia", ![...archivos.map(a => readFileSync(a, "utf8")), tablero].some(t => /hobby|cada 15 min/i.test(t)));

// V6.9 · el envío inmediato ya no depende de after(): se espera, acotado, y el cron cada 10 min es la red.
const emite = readFileSync(join(RAIZ, "src/lib/integraciones/emit.ts"), "utf8");
check("fuente · emitEvent espera el despacho de SU fila con techo de 3 s", /await dispatchPending\(\{ soloId: id, timeoutMs: 3_000 \}\)/.test(emite));
check("fuente · emitEvent ya no usa after()", !/after\(/.test(emite.replace(/^\s*\/\/.*$/gm, "")));
const vercel = JSON.parse(readFileSync(join(RAIZ, "vercel.json"), "utf8"));
const cronInt = vercel.crons.find(c => c.path === "/api/cron/integraciones");
check("vercel.json · el despachador corre cada 10 minutos", cronInt?.schedule === "*/10 * * * *", cronInt?.schedule);
const rutaCron = readFileSync(join(RAIZ, "src/app/api/cron/integraciones/route.ts"), "utf8");
check("cron · el barrido del directorio sigue siendo diario (vuelta de las 11:30 UTC)", /vueltaDiaria/.test(rutaCron) && /getUTCHours\(\) === 11/.test(rutaCron) && /if \(vueltaDiaria\)/.test(rutaCron));

console.log(`\nIntegraciones · ${pass}/${pass + fails.length} comprobaciones`);
if (fails.length) { console.log("\nFALLAN:"); for (const f of fails) console.log("  ·", f); process.exit(1); }
console.log("El vocabulario está alineado y en ultimo_error solo entran códigos.\n");
