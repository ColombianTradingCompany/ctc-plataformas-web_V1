// ── Guardián de los HECHOS de CTCx OS ─────────────────────────────────────────
//   node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/qa-os-hechos-check.mjs
//
// Componente `ctcx-os` (BORRADOR · decide el owner). Sin red, sin base, sin
// credenciales: lee el código y corre los normalizadores PUROS de
// `src/lib/os/hechosCatalogo.ts` contra filas de mentira.
//
// Lo que puede romperse EN SILENCIO y aquí se vigila:
//   1. Una tanda estrena un `entity_type` en `audit_log` (o un `tipo` en
//      `emitEvent`) y el juego no se entera: el hecho entraría como «Sistema» sin
//      término. Todo literal de `src/` y de las funciones SQL de
//      `docs/migraciones/` debe estar en el catálogo, y al revés (sin entradas muertas).
//   2. Una acción del catálogo con una errata no casaría nunca: cada acción con
//      efecto debe existir como literal en el código o en una migración.
//   3. Una medida que no existe sería una cifra inventada: cada «tabla.columna» de
//      un efecto debe constar en el CREATE TABLE de su tabla o en un select del código.
//   4. Privacidad: el lector no selecciona `notes`, ni el `payload` entero, ni
//      `ultimo_error`/`destino`; las llaves del payload no son nombres, correos ni
//      importes; un centinela metido en esas columnas no aparece en ningún hecho.
//   5. La forma: `hechos.ts` es server-only y el catálogo no importa la base.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  ENTIDADES, ACCIONES, PREFIJOS, EVENTOS, EVENTOS_FUERA_DEL_JUEGO, LLAVES_DEL_PAYLOAD,
  reglaDeAccion, reglaDeEvento, normalizarAuditoria, normalizarEvento, normalizarLatido, resumirTurno,
} from "../src/lib/os/hechosCatalogo.ts";

const RAIZ = new URL("..", import.meta.url).pathname;
let pass = 0;
const fails = [];
const check = (name, cond, detail = "") => { if (cond) pass++; else fails.push(`${name}${detail ? ` — ${detail}` : ""}`); };

function archivos(dir, ext) {
  const out = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...archivos(p, ext));
    else if (ext.some((x) => p.endsWith(x))) out.push(p);
  }
  return out;
}
const SRC = archivos(join(RAIZ, "src"), [".ts", ".tsx"]).filter((p) => !p.includes(`${join("src", "lib", "os")}`));
const textoSrc = SRC.map((p) => readFileSync(p, "utf8"));
const TODO_SRC = textoSrc.join("\n");
const SQL = archivos(join(RAIZ, "docs", "migraciones"), [".sql"]).map((p) => readFileSync(p, "utf8"));
const TODO_SQL = SQL.join("\n");

// ── 1 · entity_type de audit_log ─────────────────────────────────────────────
const literalesDe = (expr) => {
  // `x ? "a" : "b"` → a, b (lo de antes del `?` es una comparación, no un tipo)
  const parte = expr.includes("?") ? expr.slice(expr.indexOf("?") + 1) : expr;
  return [...parte.matchAll(/"([a-z_]+)"/g)].map((m) => m[1]);
};
const tiposEnCodigo = new Set();
for (const t of textoSrc) {
  for (const m of t.matchAll(/entity_type:\s*([^,\n]+)/g)) for (const l of literalesDe(m[1])) tiposEnCodigo.add(l);
  // `logVerdicto(…, entityType = "directorio_profile")` y sus llamadas con otro tipo
  if (/entity_type:\s*entityType/.test(t)) {
    for (const m of t.matchAll(/entityType\s*=\s*"([a-z_]+)"/g)) tiposEnCodigo.add(m[1]);
    for (const m of t.matchAll(/,\s*"([a-z]+_[a-z_]+)",\s*[a-zA-Z]+Id\)/g)) tiposEnCodigo.add(m[1]);
  }
}
const tiposEnSql = new Set();
for (const t of SQL) {
  for (const m of t.matchAll(/audit_log\s*\(entity_type[^)]*\)\s*(?:values\s*\(|select\s+)\s*'([a-z_]+)'/gi)) tiposEnSql.add(m[1]);
}
check("1 · el código escribe entity_type en audit_log (el escáner los encuentra)", tiposEnCodigo.size >= 40, `${tiposEnCodigo.size}`);
for (const t of [...tiposEnCodigo, ...tiposEnSql]) check(`1 · entity_type «${t}» está en ENTIDADES`, t in ENTIDADES);
for (const k of Object.keys(ENTIDADES)) check(`1 · ENTIDADES «${k}» se escribe en algún sitio`, tiposEnCodigo.has(k) || tiposEnSql.has(k));

// ── 1 · tipos de emitEvent ───────────────────────────────────────────────────
const tiposDeEvento = new Set();
for (const t of textoSrc) {
  for (const m of t.matchAll(/emitEvent\(\{[\s\S]{0,200}?tipo:\s*([^,\n]+)/g)) for (const l of [...m[1].matchAll(/"([a-z_.]+)"/g)].map((x) => x[1])) tiposDeEvento.add(l);
}
check("1 · el escáner encuentra los emitEvent", tiposDeEvento.size >= 5, `${tiposDeEvento.size}`);
for (const t of tiposDeEvento) check(`1 · evento «${t}» está en EVENTOS o fuera del juego`, t in EVENTOS || EVENTOS_FUERA_DEL_JUEGO.includes(t));
for (const k of Object.keys(EVENTOS)) check(`1 · EVENTOS «${k}» se emite en algún sitio`, tiposDeEvento.has(k));
check("1 · las herramientas emiten `herramienta.<id>.<evento>`", /`herramienta\.\$\{toolId\}\./.test(TODO_SRC));

// ── 2 · cada acción con efecto existe como literal ───────────────────────────
for (const clave of Object.keys(ACCIONES)) {
  const punto = clave.indexOf(".");
  const ent = clave.slice(0, punto);
  const accion = clave.slice(punto + 1);
  check(`2 · «${clave}»: su entidad está en ENTIDADES`, ent in ENTIDADES);
  check(`2 · «${clave}»: la acción existe en el código o en SQL`, TODO_SRC.includes(`"${accion}"`) || TODO_SQL.includes(`'${accion}'`));
}
for (const p of PREFIJOS) check(`2 · prefijo «${p.prefijo}»: su entidad está en ENTIDADES`, p.prefijo.split(".")[0] in ENTIDADES);

// ── 3 · cada medida es una columna que existe ────────────────────────────────
function columnasDe(tabla) {
  const cols = new Set();
  for (const t of SQL) {
    const re = new RegExp(`create table (?:if not exists )?(?:public\\.)?${tabla}\\s*\\(([\\s\\S]*?)\\n\\);`, "gi");
    for (const m of t.matchAll(re)) for (const c of m[1].matchAll(/^\s+([a-z_0-9]+)\s+[a-z]/gm)) cols.add(c[1]);
    for (const m of t.matchAll(new RegExp(`alter table (?:public\\.)?${tabla}\\s+add column (?:if not exists )?([a-z_0-9]+)`, "gi"))) cols.add(m[1]);
  }
  for (const m of TODO_SRC.matchAll(new RegExp(`from\\("${tabla}"\\)[\\s\\S]{0,240}?select\\("([^"]+)"`, "g"))) {
    for (const c of m[1].split(",")) cols.add(c.trim().split(/[\s:(]/)[0]);
  }
  return cols;
}
const medidas = new Set();
for (const r of [...Object.values(ACCIONES), ...PREFIJOS.map((p) => p.regla), ...Object.values(EVENTOS)]) {
  for (const e of r.efectos) for (const m of e.medidas) medidas.add(m);
}
check("3 · hay medidas que comprobar", medidas.size >= 10, `${medidas.size}`);
for (const m of medidas) {
  const [tabla, col] = m.split(".");
  check(`3 · medida «${m}» es una columna real`, columnasDe(tabla).has(col));
}

// ── 4 · privacidad ───────────────────────────────────────────────────────────
const lector = readFileSync(join(RAIZ, "src/lib/os/hechos.ts"), "utf8");
const selects = [...lector.matchAll(/\.select\(([^)]*)\)/g)].map((m) => m[1]).join(" ");
check("4 · el lector no selecciona `notes`", !/\bnotes\b/.test(selects));
check("4 · el lector no selecciona `ultimo_error` ni `destino`", !/ultimo_error|destino/.test(lector.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "")));
check("4 · `payload` solo por ruta JSON", !/[^>]payload(?!->>)/.test(lector.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/`\$\{k\}:payload->>\$\{k\}`/g, "")));
check("4 · los perfiles se leen sin nombres ni correos", !/select\("[^"]*(name|email|nombre|correo)/.test(lector));
for (const k of LLAVES_DEL_PAYLOAD) check(`4 · la llave del payload «${k}» no es un dato personal ni un importe`, !/name|email|correo|nombre|phone|tel|total|title|titulo|detalle|monto/i.test(k));

const CANARIO = "c4n4r10-" + "f".repeat(24);
const actores = new Map([["p-equipo", { rol: "equipo", sello: null }], ["p-centro", { rol: "socio", sello: "centro-calidad" }]]);
const filaA = (entity_type, action, extra = {}) => ({
  id: "a1", entity_type, entity_id: "e1", action, previous_status: null, new_status: null, performed_by: "p-equipo",
  created_at: "2026-11-05T00:00:00Z", notes: CANARIO, ...extra,
});
const h1 = normalizarAuditoria(filaA("lot", "graded"), actores);
check("4 · `notes` no viaja en el hecho", !JSON.stringify(h1).includes(CANARIO));
const filaE = { id: "v1", dominio: "comercial", tipo: "cotizacion.emitida", created_at: "2026-11-05T00:00:00Z", ctc_id: "COT-1", contact_email: CANARIO, contact_name: CANARIO, total: CANARIO };
const h2 = normalizarEvento(filaE, actores);
check("4 · lo que no es llave permitida del payload no viaja en el hecho", !!h2 && !JSON.stringify(h2).includes(CANARIO));

// ── 5 · forma ────────────────────────────────────────────────────────────────
check("5 · hechos.ts empieza por `import \"server-only\"`", lector.startsWith('import "server-only";'));
const catalogo = readFileSync(join(RAIZ, "src/lib/os/hechosCatalogo.ts"), "utf8");
check("5 · el catálogo es puro (no importa la base ni server-only)", !/from "@\/lib\/supabase|import "server-only"/.test(catalogo));
check("5 · el lector no escribe", !/\.(insert|update|upsert|delete|rpc)\(/.test(lector));

// ── 6 · los normalizadores hacen lo que dicen ────────────────────────────────
check("6 · lote galardonado → Ficha, origen, realización +1 con el Punto",
  h1.entidad.termino === "Ficha" && h1.dominio === "origen" && h1.efectos[0]?.barra === "realizacion" && h1.efectos[0]?.medidas.includes("lot_evaluations.sca_total"));
check("6 · el actor del equipo se reconoce", h1.actor.rol === "equipo" && h1.actor.perfil === "p-equipo");
const hRecibo = normalizarAuditoria(filaA("purchase_contract", "despacho_recibido"), actores);
check("6 · despacho recibido → Recibo en Operación y Logística con humedad y aw",
  hRecibo.entidad.termino === "Recibo" && hRecibo.dominio === "operacion_logistica" && hRecibo.efectos[0].medidas.includes("contract_despachos.aw"));
const h60 = normalizarAuditoria(filaA("purchase_contract", "despacho_confirmado_60"), actores);
check("6 · el 60 % sale (financiera −1) y sube la felicidad", h60.efectos.some((e) => e.barra === "financiera" && e.sentido === -1) && h60.efectos.some((e) => e.barra === "felicidad" && e.sentido === 1));
const hSello = normalizarAuditoria(filaA("lot", "evaluacion_registrada_centro", { performed_by: "p-centro" }), actores);
check("6 · la evaluación del Centro lleva su Sello", hSello.sello === "centro-calidad" && hSello.actor.rol === "socio");
check("6 · una salida de stock no juega (el prefijo de salida va antes)", reglaDeAccion("stock_partida", "stock_salida_venta")?.efectos.length === 0);
check("6 · una transformación sube la realización", reglaDeAccion("stock_partida", "stock_verde")?.efectos[0]?.sentido === 1);
check("6 · deshacer no juega", reglaDeAccion("stock_partida", "stock_transformacion_anulada") === null);
check("6 · el mes a mes dormido no juega", reglaDeAccion("purchase_contract", "mes_3_pedido")?.efectos.length === 0);
const hRaro = normalizarAuditoria(filaA("tabla_que_no_existe", "algo", { performed_by: null }), actores);
check("6 · una entidad desconocida entra como Sistema, sin efecto, actor desconocido",
  hRaro.entidad.termino === "Sistema" && hRaro.efectos.length === 0 && hRaro.actor.rol === "desconocido");
check("6 · la prueba de vida no es un hecho", reglaDeEvento("prueba.ping") === null && normalizarEvento({ ...filaE, tipo: "prueba.ping" }, actores) === null);
const hHerr = normalizarEvento({ id: "v2", dominio: "conocimiento", tipo: "herramienta.catacion.guardado", created_at: "2026-11-05T00:00:00Z", usuario: "p-equipo" }, actores);
check("6 · un evento de herramienta es un Módulo con su usuario", hHerr?.entidad.termino === "Módulo" && hHerr.actor.perfil === "p-equipo" && hHerr.actor.rol === "equipo");
check("6 · la cotización compromete con `quotes.total` y lleva su código", h2?.entidad.ref === "COT-1" && h2.efectos[0].sentido === 0 && h2.efectos[0].medidas[0] === "quotes.total");
check("6 · un latido en curso no es un hecho", normalizarLatido({ id: "l1", clave: "/api/cron/integraciones", estado: "en_curso", inicio: "2026-11-05T00:00:00Z", fin: null }) === null);
const hL = normalizarLatido({ id: "l2", clave: "/api/cron/integraciones", estado: "ok", inicio: "2026-11-05T00:00:00Z", fin: "2026-11-05T00:00:03Z" });
check("6 · un latido terminado es `cron.ok` cuando terminó", hL?.tipo === "cron.ok" && hL.cuando === "2026-11-05T00:00:03Z");
const res = resumirTurno([h1, hRecibo, h60, hSello, hRaro, h2]);
check("6 · el resumen cuenta términos, barras y ubicables",
  res.total === 6 && res.porTermino.Ficha === 3 && res.porTermino.Recibo === 1 && res.barras.financiera.baja === 1 && res.barras.financiera.compromete === 1 && res.ubicables === 4);

console.log(`qa-os-hechos-check: ${pass} ok, ${fails.length} fallos`);
if (fails.length) {
  for (const f of fails) console.log("  ✗ " + f);
  process.exit(1);
}
