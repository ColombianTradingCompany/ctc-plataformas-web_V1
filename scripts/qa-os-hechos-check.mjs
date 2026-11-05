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
//   2. Una acción del catálogo con una errata no casaría nunca: cada acción debe
//      existir como literal en el código o en una migración (o, si el código la
//      arma con una plantilla, su sufijo debe ser un valor permitido en SQL).
//   3. Una medida que no existe sería una cifra inventada: cada «tabla.columna» de
//      un efecto o de un atributo debe constar en el CREATE TABLE de su tabla o en
//      un select del código.
//   4. Privacidad, por LISTA BLANCA: las columnas que el lector selecciona son
//      exactamente las del catálogo; las llaves del payload no son datos personales
//      ni importes; un centinela en `notes` o en el payload no llega a ningún hecho.
//   5. La forma: `hechos.ts` es server-only, no escribe y usa los selects del catálogo.
//   6. Las reglas del juego: un acto mueve cada barra una vez, deshacer devuelve,
//      el actor sale solo de `performed_by`, la regla del comprador real.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  ENTIDADES, ACCIONES, PREFIJOS, EVENTOS, EVENTOS_FUERA_DEL_JUEGO, LLAVES_DEL_PAYLOAD,
  SELECT_AUDITORIA, SELECT_EVENTOS, SELECT_LATIDOS, LATIDO_SIN_CIERRE_MS,
  reglaDeAccion, reglaDeEvento, rolDeActor, normalizarAuditoria, normalizarEvento, normalizarLatido, resumirTurno,
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
check("1 · la puerta de entrada guarda las copias como `entrante.<x>`", /`entrante\.\$\{/.test(TODO_SRC));

// ── 2 · cada acción del catálogo existe ──────────────────────────────────────
// `stock_${s.tipo}` (stockActions.ts): el sufijo es un valor del CHECK de `stock_transformaciones.tipo`.
const PLANTILLAS = [{ prefijo: "stock_", plantilla: "`stock_${s.tipo}`" }];
for (const clave of Object.keys(ACCIONES)) {
  const punto = clave.indexOf(".");
  const ent = clave.slice(0, punto);
  const accion = clave.slice(punto + 1);
  check(`2 · «${clave}»: su entidad está en ENTIDADES`, ent in ENTIDADES);
  const literal = TODO_SRC.includes(`"${accion}"`) || TODO_SQL.includes(`'${accion}'`);
  const armada = PLANTILLAS.some((p) => accion.startsWith(p.prefijo) && TODO_SRC.includes(p.plantilla) && TODO_SQL.includes(`'${accion.slice(p.prefijo.length)}'`));
  check(`2 · «${clave}»: la acción existe en el código o en SQL`, literal || armada);
}
for (const p of PREFIJOS) check(`2 · prefijo «${p.prefijo}»: su entidad está en ENTIDADES`, p.prefijo.split(".")[0] in ENTIDADES);
check("2 · los prefijos solo apagan (lo que juega va exacto)", PREFIJOS.every((p) => p.regla.efectos.length === 0));

// ── 3 · cada medida y cada atributo es una columna que existe ────────────────
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
const columnasCitadas = new Set();
for (const r of [...Object.values(ACCIONES), ...PREFIJOS.map((p) => p.regla), ...Object.values(EVENTOS)]) {
  for (const e of r.efectos) for (const m of e.medidas) columnasCitadas.add(m);
  for (const a of r.atributos ?? []) columnasCitadas.add(a);
}
check("3 · hay medidas que comprobar", columnasCitadas.size >= 15, `${columnasCitadas.size}`);
for (const m of columnasCitadas) {
  const [tabla, col] = m.split(".");
  check(`3 · «${m}» es una columna real`, columnasDe(tabla).has(col));
}

// ── 4 · privacidad por lista blanca ──────────────────────────────────────────
const cols = (s) => s.split(",").map((c) => c.trim()).filter(Boolean);
const igual = (a, b) => a.length === b.length && a.every((x) => b.includes(x));
check("4 · audit_log: exactamente las columnas permitidas (sin `notes`)",
  igual(cols(SELECT_AUDITORIA), ["id", "entity_type", "entity_id", "action", "previous_status", "new_status", "performed_by", "created_at"]), SELECT_AUDITORIA);
check("4 · latidos: exactamente las columnas permitidas", igual(cols(SELECT_LATIDOS), ["id", "clave", "estado", "inicio", "fin"]), SELECT_LATIDOS);
const permitidasEventos = ["id", "dominio", "tipo", "created_at", ...LLAVES_DEL_PAYLOAD.map((k) => `${k}:payload->>${k}`)];
check("4 · integration_events: columnas fijas + llaves del payload por ruta JSON, nada más", igual(cols(SELECT_EVENTOS), permitidasEventos), SELECT_EVENTOS);
check("4 · las llaves del payload son una lista cerrada de referencias", igual([...LLAVES_DEL_PAYLOAD], ["ctc_id", "ref", "deliverableId", "projectId"]));
for (const k of LLAVES_DEL_PAYLOAD) check(`4 · la llave «${k}» no es un dato personal, una identidad ni un importe`, !/name|email|correo|nombre|phone|tel|total|title|titulo|detalle|monto|usuario|user/i.test(k));

const lector = readFileSync(join(RAIZ, "src/lib/os/hechos.ts"), "utf8");
const sinComentarios = lector.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
const PERMITIDOS_ACTORES = {
  profiles: ["id", "role"], panel_users: ["profile_id"], partner_accounts: ["profile_id", "node_type"],
  buyer_profiles: ["profile_id", "membership_tier", "lifetime_points"], orders: ["buyer_id"], lot_reservations: ["buyer_id"],
};
const lecturas = [...sinComentarios.matchAll(/\.from\("([a-z_]+)"\)\s*\.select\(([^)]*)\)/g)].map((m) => ({ tabla: m[1], sel: m[2].trim() }));
const esperadas = { audit_log: "SELECT_AUDITORIA", integration_events: "SELECT_EVENTOS", latidos: "SELECT_LATIDOS" };
check("4 · el lector lee nueve tablas, ni una más", lecturas.length === 9, lecturas.map((l) => l.tabla).join(","));
for (const l of lecturas) {
  if (l.tabla in esperadas) check(`4 · ${l.tabla} se lee con ${esperadas[l.tabla]}`, l.sel === esperadas[l.tabla], l.sel);
  else if (l.tabla in PERMITIDOS_ACTORES) check(`4 · ${l.tabla}: solo ids, roles y actividad`, igual(cols(l.sel.replace(/^"|"$/g, "")), PERMITIDOS_ACTORES[l.tabla]), l.sel);
  else check(`4 · el lector no lee «${l.tabla}»`, false);
}

const CANARIO = "c4n4r10-" + "f".repeat(24);
const U1 = "11111111-1111-4111-8111-111111111111";
const U2 = "22222222-2222-4222-8222-222222222222";
const actores = new Map([[U1, { rol: "equipo", sello: null }], [U2, { rol: "socio", sello: "centro-calidad" }]]);
const filaA = (entity_type, action, extra = {}) => ({
  id: "a1", entity_type, entity_id: "e1", action, previous_status: null, new_status: null, performed_by: U1,
  created_at: "2026-11-05T00:00:00Z", notes: CANARIO, ...extra,
});
const h1 = normalizarAuditoria(filaA("lot", "graded"), actores);
check("4 · `notes` no viaja en el hecho", !JSON.stringify(h1).includes(CANARIO));
const filaE = { id: "v1", dominio: "comercial", tipo: "cotizacion.emitida", created_at: "2026-11-05T00:00:00Z", ctc_id: "COT-1", contact_email: CANARIO, contact_name: CANARIO, total: CANARIO, usuario: U1 };
const h2 = normalizarEvento(filaE);
check("4 · lo que no es llave permitida del payload no viaja en el hecho", !!h2 && !JSON.stringify(h2).includes(CANARIO));

// ── 5 · forma ────────────────────────────────────────────────────────────────
check("5 · hechos.ts empieza por `import \"server-only\"`", lector.startsWith('import "server-only";'));
const catalogo = readFileSync(join(RAIZ, "src/lib/os/hechosCatalogo.ts"), "utf8");
check("5 · el catálogo es puro (no importa la base ni server-only)", !/from "@\/lib\/supabase|import "server-only"/.test(catalogo));
check("5 · el lector no escribe", !/\.(insert|update|upsert|delete|rpc)\(/.test(sinComentarios));
check("5 · el cliente se crea dentro del try (sin credencial no lanza)", /try \{\s*const service = createServiceRoleClient\(\)/.test(sinComentarios));
check("5 · las copias entrantes se filtran en la base", /\.not\("tipo", "like", `\$\{PREFIJO_ENTRANTE\}%`\)/.test(sinComentarios));
check("5 · el rango es semiabierto en las tres fuentes", (sinComentarios.match(/\.lt\("(created_at|inicio)", r\.hasta\)/g) ?? []).length === 3 && !/\.lte\(/.test(sinComentarios));

// ── 6 · las reglas del juego ─────────────────────────────────────────────────
check("6 · lote galardonado → Ficha, origen, realización +1 con el Punto",
  h1.entidad.termino === "Ficha" && h1.dominio === "origen" && h1.efectos[0]?.barra === "realizacion" && h1.efectos[0]?.medidas.includes("lot_evaluations.sca_total"));
check("6 · el actor del equipo se reconoce", h1.actor.rol === "equipo" && h1.actor.perfil === U1);
const hRecibo = normalizarAuditoria(filaA("purchase_contract", "despacho_recibido"), actores);
check("6 · despacho recibido → Recibo en Operación y Logística: sale el 40 %, humedad y aw como atributos",
  hRecibo.entidad.termino === "Recibo" && hRecibo.dominio === "operacion_logistica"
  && hRecibo.efectos.length === 1 && hRecibo.efectos[0].barra === "financiera" && hRecibo.efectos[0].sentido === -1
  && hRecibo.efectos[0].medidas[0] === "contract_despachos.pago_recepcion_cop" && hRecibo.entidad.atributos.includes("contract_despachos.aw"));
const h60 = normalizarAuditoria(filaA("purchase_contract", "despacho_confirmado_60"), actores);
check("6 · el 60 % sale (financiera −1) y sube la felicidad", h60.efectos.some((e) => e.barra === "financiera" && e.sentido === -1) && h60.efectos.some((e) => e.barra === "felicidad" && e.sentido === 1));
const hCompra = normalizarAuditoria(filaA("compra", "compra_registrada"), actores);
check("6 · la compra de un trato no se cuenta dos veces (condición sobre contract_id)", /contract_id nulo/.test(hCompra.efectos[0]?.condicion ?? "") && !hCompra.efectos[0].medidas.includes("compras.kg"));
const trato = resumirTurno([
  normalizarAuditoria(filaA("lot_offer", "offer_accepted"), actores),
  normalizarAuditoria(filaA("purchase_contract", "created"), actores),
  normalizarAuditoria(filaA("purchase_contract", "signed"), actores),
]);
check("6 · aceptar + crear + firmar = UN compromiso y UNA subida de felicidad", trato.barras.financiera.compromete === 1 && trato.barras.felicidad.sube === 1, JSON.stringify(trato.barras));
const hSello = normalizarAuditoria(filaA("lot", "evaluacion_registrada_centro", { performed_by: U2 }), actores);
check("6 · la evaluación del Centro lleva su Sello", hSello.sello === "centro-calidad" && hSello.actor.rol === "socio");
check("6 · una salida de stock no juega", reglaDeAccion("stock_partida", "stock_salida_venta")?.efectos.length === 0);
check("6 · una trilla sube la realización, sin medida (la fila apunta a la madre)", reglaDeAccion("stock_partida", "stock_trilla")?.efectos[0]?.sentido === 1 && reglaDeAccion("stock_partida", "stock_trilla")?.efectos[0]?.medidas.length === 0);
check("6 · mover una partida de sitio no juega", reglaDeAccion("stock_partida", "stock_ubicada")?.efectos.length === 0);
check("6 · deshacer devuelve: anular una compra devuelve el dinero", reglaDeAccion("compra", "compra_anulada")?.efectos[0]?.sentido === 1);
check("6 · deshacer devuelve: anular una transformación baja la realización", reglaDeAccion("stock_partida", "stock_transformacion_anulada")?.efectos[0]?.sentido === -1);
check("6 · el mes a mes dormido no juega", reglaDeAccion("purchase_contract", "mes_3_pedido")?.efectos.length === 0);
const hRaro = normalizarAuditoria(filaA("tabla_que_no_existe", "algo", { performed_by: null }), actores);
check("6 · una entidad desconocida entra como Sistema, sin efecto, actor desconocido",
  hRaro.entidad.termino === "Sistema" && hRaro.efectos.length === 0 && hRaro.actor.rol === "desconocido");
check("6 · un performed_by que no es uuid no se toma como actor", normalizarAuditoria(filaA("lot", "graded", { performed_by: "ana" }), actores).actor.perfil === null);
check("6 · la prueba de vida no es un hecho", reglaDeEvento("prueba.ping") === null && normalizarEvento({ ...filaE, tipo: "prueba.ping" }) === null);
check("6 · las copias entrantes no son hechos", reglaDeEvento("entrante.cotizacion.espejada") === null && reglaDeEvento("entrante.prueba.token") === null);
const hHerr = normalizarEvento({ id: "v2", dominio: "conocimiento", tipo: "herramienta.catacion.guardado", created_at: "2026-11-05T00:00:00Z", usuario: U1 });
check("6 · un evento de herramienta es un Módulo y su actor NO sale del payload", hHerr?.entidad.termino === "Módulo" && hHerr.actor.perfil === null && hHerr.actor.rol === "desconocido");
check("6 · la cotización compromete con `quotes.total` en su moneda y lleva su código",
  h2?.entidad.ref === "COT-1" && h2.efectos[0].sentido === 0 && h2.efectos[0].medidas[0] === "quotes.total" && /quotes\.currency/.test(h2.efectos[0].condicion ?? ""));
const AHORA = "2026-11-05T01:00:00Z";
const viejo = new Date(Date.parse(AHORA) - LATIDO_SIN_CIERRE_MS - 1000).toISOString();
check("6 · un latido en curso y vivo no es un hecho", normalizarLatido({ id: "l1", clave: "/api/cron/integraciones", estado: "en_curso", inicio: "2026-11-05T00:59:00Z", fin: null }, AHORA) === null);
check("6 · un latido que murió sin cerrar es `cron.sin_cierre`", normalizarLatido({ id: "l3", clave: "/api/cron/integraciones", estado: "en_curso", inicio: viejo, fin: null }, AHORA)?.tipo === "cron.sin_cierre");
const hL = normalizarLatido({ id: "l2", clave: "/api/cron/integraciones", estado: "ok", inicio: "2026-11-05T00:00:00Z", fin: "2026-11-05T00:00:03Z" }, AHORA);
check("6 · un latido terminado es `cron.ok`, fechado por su inicio", hL?.tipo === "cron.ok" && hL.cuando === "2026-11-05T00:00:00Z");
check("6 · comprador real: buyer CON actividad", rolDeActor({ role: "buyer", enPanel: false, nodo: null, actividadDeComprador: true }).rol === "comprador");
check("6 · buyer sin actividad (Terratalento, Directorio, Google) no es comprador", rolDeActor({ role: "buyer", enPanel: false, nodo: null, actividadDeComprador: false }).rol === "desconocido");
check("6 · el equipo gana a cualquier otro rol", rolDeActor({ role: "buyer", enPanel: true, nodo: null, actividadDeComprador: true }).rol === "equipo");
check("6 · un socio lleva su nodo como sello", rolDeActor({ role: "partner", enPanel: false, nodo: "master-roaster", actividadDeComprador: false }).sello === "master-roaster");
const matriz = readFileSync(join(RAIZ, "src/lib/identidad/matriz.ts"), "utf8");
check("6 · la regla del comprador real sigue diciendo lo mismo en matriz.ts (pedidos, reservas, puntos, escalón)",
  /role === "buyer" &&/.test(matriz) && /pedidos/.test(matriz) && /reservas/.test(matriz) && /lifetime_points/.test(matriz) && /!== "verde"/.test(matriz));
const res = resumirTurno([h1, hRecibo, h60, hSello, hRaro, h2]);
check("6 · el resumen cuenta términos, barras y ubicables",
  res.total === 6 && res.porTermino.Ficha === 3 && res.porTermino.Recibo === 1 && res.barras.financiera.baja === 2 && res.barras.financiera.compromete === 1 && res.ubicables === 4,
  JSON.stringify(res));

console.log(`qa-os-hechos-check: ${pass} ok, ${fails.length} fallos`);
if (fails.length) {
  for (const f of fails) console.log("  ✗ " + f);
  process.exit(1);
}
