// Guardián de los NIVELES por consola (V5.57, 2026-09-19).
//
//   node scripts/qa-niveles-check.mjs
//
// EL FALLO QUE ESTÁ AQUÍ PARA IMPEDIR. `panel_users.consoles` guarda un nivel por consola —"admin" o
// "viewer"— y durante dos meses ningún código lo leyó: un «viewer» pasaba todas las compuertas de
// escritura. No dio error, no rompió nada y no lo notó nadie: lo encontró una auditoría.
//
// LA REGLA SALE DEL PLAN, NO DEL CÓDIGO. La fuente es `docs/BCP_USER_ADMIN_PLAN.md`, sección «Niveles
// por consola»: su tabla de niveles × clases y su lista blanca de borradores. Este guardián las LEE de
// ahí y exige que `src/lib/panel/niveles.ts` y las llamadas del código digan lo mismo. (Tres guardianes
// afirmaron en verde una regla equivocada por copiarla del módulo que vigilaban — V5.53, V5.54, V5.56.)
//
// Puro: no toca la base ni la red. Las consolas no se conducen en un navegador.

import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { PUEDE, nivelEn, puede, mensajeSoloLectura } from "../src/lib/panel/niveles.ts";

let ok = 0;
const fallos = [];
const check = (nombre, cond, detalle = "") => (cond ? ok++ : fallos.push(nombre + (detalle ? ` — ${detalle}` : "")));
const lee = (f) => readFileSync(f, "utf8");

// ── 1 · la regla, leída del plan ───────────────────────────────────────────
const plan = lee("docs/BCP_USER_ADMIN_PLAN.md");
const seccion = plan.slice(plan.indexOf("## Niveles por consola"), plan.indexOf("## Preguntas abiertas"));
check("el plan tiene la sección «Niveles por consola»", seccion.length > 500);

const CLASES = ["lectura", "borrador", "emite"];
const delPlan = {};
for (const [, nivel, a, b, c] of seccion.matchAll(/^\| `(admin|viewer)` \| (sí|no) \| (sí|no) \| (sí|no) \|$/gm)) {
  delPlan[nivel] = CLASES.filter((_, i) => [a, b, c][i] === "sí");
}
check("el plan declara los dos niveles", Object.keys(delPlan).sort().join() === "admin,viewer", JSON.stringify(delPlan));
for (const nivel of ["admin", "viewer"]) {
  check(
    `niveles.ts concede a «${nivel}» exactamente lo que dice el plan`,
    JSON.stringify([...(PUEDE[nivel] ?? [])].sort()) === JSON.stringify([...(delPlan[nivel] ?? ["?"])].sort()),
    `plan: ${delPlan[nivel]} · código: ${PUEDE[nivel]}`
  );
}
// Lo que de verdad importa, dicho sin tabla: el plan dice que un viewer NO emite.
check("según el plan, un viewer NO ejecuta acciones que emiten", delPlan.viewer && !delPlan.viewer.includes("emite"));
check("puede(viewer, emite) es false", puede("viewer", "emite") === false);
check("puede(viewer, borrador) y puede(viewer, lectura) son true", puede("viewer", "borrador") && puede("viewer", "lectura"));
check("puede(admin, *) es true", CLASES.every((c) => puede("admin", c)));
check("sin nivel no se puede NADA, ni leer", CLASES.every((c) => puede(null, c) === false));

// ── 2 · un valor raro no es un nivel ───────────────────────────────────────
check("nivelEn lee admin y viewer", nivelEn({ bcp: "admin", ecp: "viewer" }, "bcp") === "admin" && nivelEn({ ecp: "viewer" }, "ecp") === "viewer");
check("nivelEn niega la consola ausente", nivelEn({ bcp: "admin" }, "ocp") === null);
check(
  "nivelEn niega lo que no sea exactamente un nivel (true, \"owner\", 1, \"ADMIN\")",
  [true, "owner", 1, "ADMIN", "", {}].every((v) => nivelEn({ bcp: v }, "bcp") === null)
);
check("nivelEn no revienta sin fila", nivelEn(null, "bcp") === null && nivelEn(undefined, "bcp") === null);
check("el rechazo nombra la consola y dice a quién pedírselo", /OCP/.test(mensajeSoloLectura("OCP")) && /administrador/.test(mensajeSoloLectura("OCP")));

// ── 3 · las cuatro compuertas MIRAN el nivel, y por defecto cierran ─────────
const COMPUERTAS = {
  "src/lib/panel/requireConsoleWrite.ts": /clase: ClaseDeAccion = "emite"/,
  "src/lib/panel/requireActiveAdmin.ts": /clase: Exclude<ClaseDeAccion, "lectura"> = "emite"/,
  "src/lib/coffeed/requireEcp.ts": /clase: ClaseDeAccion = "emite"/,
  "src/lib/coffeed/studioGate.ts": /clase: ClaseDeAccion = "emite"/,
};
for (const [f, rxDefecto] of Object.entries(COMPUERTAS)) {
  const t = lee(f);
  check(`${f} contrasta el nivel con la clase`, /puede\(nivelDeConsola\(/.test(t));
  check(`${f}: la clase por defecto es «emite» (una acción que olvida declararse queda CERRADA)`, rxDefecto.test(t));
}
const raa = lee("src/lib/panel/requireActiveAdmin.ts");
check(
  "permisoDeEscritura DEVUELVE el rechazo por nivel (no lanza: un throw en una Server Action tumba la página)",
  /return \{ ok: false, error: mensajeSoloLectura\(/.test(raa) && !/throw new Error\(mensajeSoloLectura/.test(raa)
);
check("grantedConsoles() sigue sin mirar el nivel — responde «¿entra?», no «¿qué puede hacer?»", /Boolean\(row\.consoles\?\.\[k\]\)/.test(lee("src/lib/panel/panelUsers.ts")));

// ── 4 · la lista blanca de borradores: plan === código ─────────────────────
const blancaPlan = new Set();
const tablaBlanca = seccion.slice(seccion.indexOf("**La lista blanca de borradores**"), seccion.indexOf("**Lo que parece un borrador"));
for (const [, fn] of tablaBlanca.matchAll(/^\| `(\w+)` \|/gm)) blancaPlan.add(fn);
check("el plan trae la lista blanca de borradores", blancaPlan.size >= 5, `${blancaPlan.size} acciones`);

const fuentes = execFileSync("git", ["ls-files", "src"], { encoding: "utf8" })
  .split("\n")
  .filter((f) => /\.(ts|tsx)$/.test(f) && existsSync(f));
const RX_FUNC = /^(?:export )?(?:default )?async function (\w+)\s*[<(]/gm;
const funcionesDe = (texto) => {
  const hitos = [...texto.matchAll(RX_FUNC)].map((m) => ({ nombre: m[1], ini: m.index }));
  return hitos.map((h, i) => ({ nombre: h.nombre, cuerpo: texto.slice(h.ini, hitos[i + 1]?.ini ?? texto.length) }));
};

const RX_CLASE = (clase) =>
  new RegExp("(?:requireConsoleWrite|permisoDeEscritura|coffeedGate|studioGate)\\([^)]*\"" + clase + "\"\\)");
const blancaCodigo = new Set();
const lecturaQueEscribe = [];
const sinClasificar = [];
const RX_ESCRIBE = /\.(insert|update|upsert|delete)\(|\.rpc\(|\.upload\(|\.remove\(|send\w*Email|emitEvent\(|registrarConsumo|auth\.admin\./;
for (const f of fuentes) {
  if (f.startsWith("src/lib/panel/")) continue;
  const texto = lee(f);
  if (!/requireAdmin\(|requireActiveAdmin\(|requireConsoleWrite\(|permisoDeEscritura\(|coffeedGate\(|studioGate\(/.test(texto)) continue;
  for (const { nombre, cuerpo } of funcionesDe(texto)) {
    // Solo cuenta la clase pasada a una COMPUERTA: `.eq("status", "borrador")` es el estado de una cotización.
    if (RX_CLASE("borrador").test(cuerpo)) blancaCodigo.add(nombre);
    // Detrás de la compuerta de SOLO LECTURA (la vieja, que no mira nivel) no puede quedar nada que escriba.
    if (nombre !== "requireAdmin" && /await (requireAdmin|requireActiveAdmin)\(\)/.test(cuerpo) && RX_ESCRIBE.test(cuerpo)) {
      lecturaQueEscribe.push(`${f}::${nombre}`);
    }
    // Y quien se declara «lectura» en una compuerta con clase tampoco escribe.
    if (RX_CLASE("lectura").test(cuerpo) && /\.(insert|upsert|delete)\(|emitEvent\(|send\w*Email|registrarConsumo/.test(cuerpo)) {
      sinClasificar.push(`${f}::${nombre}`);
    }
  }
}
// ── 4-bis · las compuertas INDIRECTAS (V5.58) ──────────────────────────────
// La V5.57 miraba la llamada a la vista y se le escapó el Buzón: sus acciones no llaman a
// `requireActiveAdmin()`, llaman a un AYUDANTE (`loadIfAllowed` → `buzonIdentity`) que la llama. Un
// viewer podía responder correos. Aquí se sigue la cadena dentro de cada archivo: toda función
// EXPORTADA que llegue a la compuerta vieja —directa o por ayudantes— y escriba, tiene que pasar
// además por una compuerta que mire el nivel.
const RX_VIEJA = /await (requireAdmin|requireActiveAdmin)\(\)/;
const RX_CON_NIVEL = /(?:permisoDeEscritura|requireConsoleWrite|coffeedGate|studioGate)\(/;
const RX_ESCRIBE_AMPLIO = /\.(insert|update|upsert|delete)\(|\.rpc\(|\.upload\(|\.remove\(|send\w*\(|emitEvent\(|registrarConsumo|auth\.admin\.|moveRemoteMessage\(/;
const RX_FUNC_TODA = /^(export )?(?:default )?(?:async )?function (\w+)\s*[<(]/gm;
const indirectas = [];
for (const f of fuentes) {
  if (f.startsWith("src/lib/panel/")) continue;
  const texto = lee(f);
  if (!RX_VIEJA.test(texto)) continue;
  const hitos = [...texto.matchAll(RX_FUNC_TODA)].map((m) => ({ nombre: m[2], exportada: Boolean(m[1]), ini: m.index }));
  const fns = hitos.map((h, i) => ({ ...h, cuerpo: texto.slice(h.ini, hitos[i + 1]?.ini ?? texto.length) }));
  const alcanza = new Set(fns.filter((x) => RX_VIEJA.test(x.cuerpo)).map((x) => x.nombre));
  for (let cambio = true; cambio; ) {
    cambio = false;
    for (const x of fns) {
      if (alcanza.has(x.nombre)) continue;
      if ([...alcanza].some((a) => new RegExp("\\b" + a + "\\(").test(x.cuerpo))) {
        alcanza.add(x.nombre);
        cambio = true;
      }
    }
  }
  for (const x of fns) {
    if (!x.exportada || !alcanza.has(x.nombre) || x.nombre === "requireAdmin") continue;
    if (RX_ESCRIBE_AMPLIO.test(x.cuerpo) && !RX_CON_NIVEL.test(x.cuerpo)) indirectas.push(`${f}::${x.nombre}`);
  }
}
check(
  "ninguna acción que ESCRIBE llega a la compuerta vieja —ni a través de un ayudante— sin pasar por una que mire el nivel",
  indirectas.length === 0,
  indirectas.join(" · ")
);

const soloPlan = [...blancaPlan].filter((x) => !blancaCodigo.has(x));
const soloCodigo = [...blancaCodigo].filter((x) => !blancaPlan.has(x));
check("toda acción que el PLAN llama borrador lo es en el código", soloPlan.length === 0, soloPlan.join(", "));
check(
  "NINGUNA acción es «borrador» en el código sin estar en la lista blanca del plan (se amplía allí primero)",
  soloCodigo.length === 0,
  soloCodigo.join(", ")
);
check("`logProducerComm` NO es un borrador: el productor ve esa nota en su panel", !blancaCodigo.has("logProducerComm") && !blancaPlan.has("logProducerComm"));
check(
  "detrás de la compuerta de solo lectura (`requireActiveAdmin()` a secas) no queda nada que escriba",
  lecturaQueEscribe.length === 0,
  lecturaQueEscribe.join(" · ")
);
check("nada declarado «lectura» inserta, borra, emite, envía ni gasta", sinClasificar.length === 0, sinClasificar.join(" · "));

// ── 5 · el viewer se entera ────────────────────────────────────────────────
const rail = lee("src/components/panel/PanelSidebar.tsx");
check("el rail anuncia el nivel «viewer»", /nivel === "viewer"/.test(rail) && /Lectura y borradores/.test(rail));
for (const k of ["bcp", "ecp", "ocp"]) {
  check(`el layout de ${k} entrega a la concha el nivel de SU consola`, lee(`src/app/${k}/(app)/layout.tsx`).includes(`identity.niveles["${k}"]`));
}
const usuarios = lee("src/app/bcp/(app)/usuarios/UsuariosClient.tsx");
check("la pantalla de usuarios dice qué hace cada nivel", /lee y prepara borradores/.test(usuarios) && /no ejecuta nada que emita/.test(usuarios));

// ── informe ────────────────────────────────────────────────────────────────
if (fallos.length) {
  console.error(`✗ qa-niveles: ${fallos.length} fallo(s), ${ok} OK\n`);
  for (const f of fallos) console.error("   " + f);
  process.exit(1);
}
console.log(`✓ qa-niveles: ${ok} comprobaciones OK, 0 fallos (${blancaPlan.size} borradores en la lista blanca)`);
