// Guardián de los PERMISOS LEGIBLES de las consolas (2026-11-06, componente `consolas`).
//
//   node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/qa-permisos-legibles-check.mjs
//
// LA REGLA. La fila de `panel_users` de un operador dice a qué consolas entra, con qué nivel y si es owner. Un
// `bcp_admin` SIN fila es el de antes de la tabla, y entra a todo (`grantedConsoles`). Pero «no hay fila» y «no se
// pudo leer la fila» son cosas distintas: **si no se pueden leer los permisos, la consola no abre, la acción no se
// hace y las decisiones del owner no se toman.** `leerPanelUser` devuelve las tres salidas (`{ok:true,row}`,
// `{ok:true,row:null}`, `{ok:false}`) y cada compuerta decide con las tres.
//
// Y **toda lectura de `panel_users` que decide quién puede algo pasa por `leerPanelUser` / `esOwnerDelPanel`**
// (`src/lib/panel/panelUsers.ts`): fuera de ese archivo ningún código de src/ lee la tabla por `profile_id`, y las
// lecturas de la tabla que no deciden permisos (una lista, un recuento, un rótulo) están en `LECTURAS_PERMITIDAS`, cada
// una con su motivo.
//
// CÓMO LO PRUEBA. Corre el CÓDIGO REAL con un doble de `@/lib/supabase/server` (y de `next/navigation`, cuyo
// `redirect` aquí lanza una marca, `next/cache`, `next/server` y el envío del código de acceso) que responde como se
// le pida: con fila, sin fila, con error y lanzando, una respuesta o una secuencia (la 1.ª lectura, la 2.ª…).
//   · 1-3 · la lectura, la identidad de las consolas y las compuertas de escritura.
//   · 5   · las decisiones del owner (usuarios, socios, Mapa de Trabajo, Admin Lock, ruptura y descongelar del OCP),
//           la identidad del Buzón y los dos pasos del login (contraseña y código).
//   · 4,6 · por texto: lo que no se ejecuta aquí y la regla de arriba, con autopruebas de que una lectura mal hecha
//           la rompe.
//
// Puro: no toca la base ni la red, no gasta, no envía, no escribe.

import { registerHooks } from "node:module";
import { readdirSync } from "node:fs";
import { leeTexto } from "./texto-lf.mjs";

let ok = 0;
const fallos = [];
const check = (n, c, detalle = "") => (c ? ok++ : fallos.push(n + (detalle ? ` — ${detalle}` : "")));
const lee = (r) => leeTexto(new URL(`../${r}`, import.meta.url)); // con saltos LF en cualquier checkout

// ── Los dobles ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
// Lo que responde lo decide `globalThis.__QA_PERMISOS` (lo arma `pon`):
//   · `panel`  la respuesta a cada lectura de `panel_users` POR `profile_id`: { data, error }, "lanza", o una LISTA de
//              ellas (la 1.ª lectura, la 2.ª…; la última se repite).
//   · `tablas` la respuesta a las lecturas de otras tablas; `alEscribir` la de una escritura (si no, { data: null }).
//   · `escrito`, `leido`, `enviados` lo que el código escribió, qué tablas leyó y a quién se mandó el código de acceso.
const SUPABASE_DOBLE =
  "data:text/javascript," +
  encodeURIComponent(`
    const estado = () => globalThis.__QA_PERMISOS;
    const lanzaSi = (r) => { if (r === "lanza") throw new Error("sin conexión"); return r; };
    const responde = async (tabla, op) => {
      const e = estado();
      if (op.escribe) {
        e.escrito.push({ tabla, ...op.escribe, filtros: op.filtros });
        return e.alEscribir?.[tabla] ?? { data: null, error: null };
      }
      e.leido.push(tabla);
      if (tabla === "profiles") return { data: { id: e.user?.id, role: e.role, full_name: "QA", email: "qa@example.test" }, error: null };
      if (tabla === "panel_users") {
        if (!op.filtros.some(([k]) => k === "profile_id")) return lanzaSi(e.panelLista ?? { data: [], error: null, count: 0 });
        return lanzaSi(Array.isArray(e.panel) ? (e.panel.length > 1 ? e.panel.shift() : e.panel[0]) : e.panel);
      }
      return lanzaSi(e.tablas?.[tabla] ?? { data: null, error: null });
    };
    const consulta = (tabla) => {
      const op = { filtros: [], escribe: null };
      const q = {
        select: () => q,
        insert: (valor) => ((op.escribe = { accion: "insert", valor }), q),
        update: (valor) => ((op.escribe = { accion: "update", valor }), q),
        upsert: (valor) => ((op.escribe = { accion: "upsert", valor }), q),
        delete: () => ((op.escribe = { accion: "delete" }), q),
        eq: (k, v) => (op.filtros.push([k, v]), q),
        in: () => q, order: () => q, gte: () => q, is: () => q, ilike: () => q, limit: () => q,
        maybeSingle: () => responde(tabla, op),
        single: () => responde(tabla, op),
        then: (bien, mal) => responde(tabla, op).then(bien, mal),
      };
      return q;
    };
    export const createServiceRoleClient = () => ({ from: consulta });
    export const createPanelSessionClient = async () => ({
      auth: { getUser: async () => ({ data: { user: estado().user } }), setSession: async () => ({ error: null }) },
      from: consulta,
    });
    export const createPartnerSessionClient = async () => ({ auth: { getUser: async () => ({ data: { user: null } }) }, from: consulta });
    export const createEphemeralClient = () => ({
      auth: {
        signInWithPassword: async () => ({
          data: { session: { access_token: "a", refresh_token: "r" }, user: { ...estado().user, email: "qa@example.test" } },
          error: null,
        }),
      },
      from: consulta,
    });
    export const createClient = createPanelSessionClient;
  `);
const NAVEGACION_DOBLE =
  "data:text/javascript," +
  encodeURIComponent(`
    export const redirect = (url) => { throw { __redirect: url }; };
    export const notFound = () => { throw { __notFound: true }; };
  `);
const CACHE_DOBLE =
  "data:text/javascript," +
  encodeURIComponent(`
    export const revalidatePath = () => {};
    export const revalidateTag = () => {};
    export const unstable_cache = (fn) => fn;
    export const unstable_noStore = () => {};
  `);
const SERVIDOR_DOBLE =
  "data:text/javascript," +
  encodeURIComponent(`
    export class NextResponse {
      static json(body, init = {}) {
        const r = { body, status: init.status ?? 200, cookie: null, cookies: { set: (nombre) => { r.cookie = nombre; }, delete: () => {} } };
        return r;
      }
    }
    export class NextRequest {}
    export const after = () => {};
  `);
const OTP_DOBLE =
  "data:text/javascript," +
  encodeURIComponent(`
    export async function sendOtpEmail(_code, destino) { globalThis.__QA_PERMISOS.enviados.push(destino); return { ok: true }; }
  `);
const DOBLES = {
  "@/lib/supabase/server": SUPABASE_DOBLE,
  "next/navigation": NAVEGACION_DOBLE,
  "next/cache": CACHE_DOBLE,
  "next/server": SERVIDOR_DOBLE,
  "@/lib/bcp/sendOtpEmail": OTP_DOBLE,
};
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (DOBLES[specifier]) return { url: DOBLES[specifier], shortCircuit: true };
    return nextResolve(specifier, context);
  },
});

const { leerPanelUser, esOwnerDelPanel, PERMISOS_ILEGIBLES } = await import("../src/lib/panel/panelUsers.ts");
const { requirePanelIdentity, requireConsoleAccess, tieneConsola } = await import("../src/lib/panel/requireConsoleAccess.ts");
const { requireConsoleWrite } = await import("../src/lib/panel/requireConsoleWrite.ts");
const { requireActiveAdmin, permisoDeEscritura } = await import("../src/lib/panel/requireActiveAdmin.ts");
const { coffeedGate } = await import("../src/lib/coffeed/requireEcp.ts");
const { studioGate } = await import("../src/lib/coffeed/studioGate.ts");
const { CONSOLE_ORDER, consolaDelModulo } = await import("../src/lib/panel/consoles.ts");
const { hashOtpCode } = await import("../src/lib/bcp/otp.ts");
const usuarios = await import("../src/app/bcp/(app)/usuariosActions.ts");
const socios = await import("../src/app/bcp/(app)/sociosActions.ts");
const mapa = await import("../src/app/bcp/(app)/workmapActions.ts");
const candado = await import("../src/app/bcp/(app)/adminLockActions.ts");
const buzon = await import("../src/app/lcp/(app)/buzonActions.ts");
const contratos = await import("../src/app/ocp/(app)/contractActions.ts");
const loginClave = await import("../src/app/api/panel/auth/password/route.ts");
const loginCodigo = await import("../src/app/api/panel/auth/verify/route.ts");

const USER = { id: "00000000-0000-4000-8000-000000000001" };
const OTRO = "00000000-0000-4000-8000-000000000002";
const FILA = {
  profile_id: USER.id, email: "qa@example.test", delivery_email: null, display_name: "QA", is_owner: false,
  consoles: { bcp: "admin", ecp: "admin", ocp: "admin", lcp: "admin" }, status: "active", must_change_password: false,
  invited_by: null, invited_at: "2026-11-06T00:00:00Z", activated_at: null, suspended_at: null, last_login_at: null,
  invite_email_sent_at: null, invite_email_error: null, created_at: "2026-11-06T00:00:00Z",
};
const conFila = (fila) => ({ data: fila, error: null });
const ESCENARIOS = {
  fila: conFila(FILA),
  sinFila: { data: null, error: null },
  error: { data: null, error: { message: "fallo de lectura", code: "XX000" } },
  lanza: "lanza",
};
const OWNER = conFila({ ...FILA, is_owner: true });
const pon = (panel, extra = {}) =>
  (globalThis.__QA_PERMISOS = {
    user: USER, role: "bcp_admin", panel: Array.isArray(panel) ? [...panel] : panel, escrito: [], leido: [], enviados: [], ...extra,
  });

/** Qué hace una llamada: su valor, o la marca de la redirección / el error que lanzó. */
async function resultado(fn) {
  try {
    return { valor: await fn() };
  } catch (e) {
    if (e && typeof e === "object" && "__redirect" in e) return { redirige: e.__redirect };
    return { lanza: String(e?.message ?? e) };
  }
}

// ── 1 · la lectura tiene tres salidas ──────────────────────────────────────────────────────────────────────────────────────
pon(ESCENARIOS.fila);
check("1 · con fila: { ok: true, row } con la fila", JSON.stringify(await leerPanelUser(USER.id)) === JSON.stringify({ ok: true, row: FILA }));
pon(ESCENARIOS.sinFila);
check("1 · sin fila: { ok: true, row: null }", JSON.stringify(await leerPanelUser(USER.id)) === JSON.stringify({ ok: true, row: null }));
pon(ESCENARIOS.error);
check("1 · si la consulta devuelve error: { ok: false } (no «sin fila»)", JSON.stringify(await leerPanelUser(USER.id)) === JSON.stringify({ ok: false }));
pon(ESCENARIOS.lanza);
check("1 · si la consulta lanza: { ok: false }, sin propagar", JSON.stringify((await resultado(() => leerPanelUser(USER.id))).valor) === JSON.stringify({ ok: false }));

// ── 2 · la identidad de las consolas (las páginas) ───────────────────────────────────────────────────────────────────────────
for (const k of ["error", "lanza"]) {
  pon(ESCENARIOS[k]);
  const r = await resultado(() => requirePanelIdentity());
  check(`2 · ${k}: si no se pueden leer los permisos, la consola no abre (al login)`, r.redirige === "/login", JSON.stringify(r));
  const c = await resultado(() => requireConsoleAccess("bcp"));
  check(`2 · ${k}: requireConsoleAccess("bcp") manda al login`, c.redirige === "/login", JSON.stringify(c));
  check(`2 · ${k}: tieneConsola responde que no`, (await tieneConsola("ocp")) === false);
}
pon(ESCENARIOS.sinFila);
{
  const r = await resultado(() => requirePanelIdentity());
  check("2 · sin fila: sigue como hoy — el bcp_admin de antes de panel_users entra a todas las consolas y es owner", Boolean(r.valor) && JSON.stringify(r.valor.consoles) === JSON.stringify([...CONSOLE_ORDER]) && r.valor.isOwner === true, JSON.stringify(r));
}
pon(ESCENARIOS.fila);
{
  const r = await resultado(() => requirePanelIdentity());
  check("2 · con fila: manda la fila (sus consolas, no es owner)", Boolean(r.valor) && JSON.stringify(r.valor.consoles) === JSON.stringify(CONSOLE_ORDER.filter((k) => FILA.consoles[k])) && r.valor.isOwner === false, JSON.stringify(r));
}

// ── 3 · las compuertas de escritura y las decisiones del owner ───────────────────────────────────────────────────────────────
const consolaCoffeed = consolaDelModulo("coffeed");
check("3 · Coffeed está enlazado en el rail (si no, sus compuertas cierran siempre y esta prueba no diría nada)", Boolean(consolaCoffeed));
for (const k of ["error", "lanza"]) {
  pon(ESCENARIOS[k]);
  check(`3 · ${k}: requireConsoleWrite no deja escribir`, (await resultado(() => requireConsoleWrite("ocp", "lectura"))).valor === null);
  check(`3 · ${k}: coffeedGate no deja escribir`, (await resultado(() => coffeedGate("lectura"))).valor === null);
  check(`3 · ${k}: studioGate no abre por la vía de la consola`, (await resultado(() => studioGate("lectura"))).valor === null);
  const p = await resultado(() => permisoDeEscritura("bcp", "borrador"));
  check(`3 · ${k}: permisoDeEscritura no deja escribir (lanza o responde ok:false)`, Boolean(p.lanza) || p.valor?.ok === false, JSON.stringify(p));
  check(`3 · ${k}: requireActiveAdmin no pasa`, Boolean((await resultado(() => requireActiveAdmin())).lanza));
  check(`3 · ${k}: esOwnerDelPanel responde que no`, (await esOwnerDelPanel(USER.id)) === false);
}
// La 1.ª lectura (la de `requireActiveAdmin`) se lee bien y la 2.ª (la del nivel) no: la compuerta tampoco deja escribir.
pon([ESCENARIOS.fila, ESCENARIOS.error]);
{
  const p = await resultado(() => permisoDeEscritura("bcp", "borrador"));
  check("3 · la 1.ª lectura pasa y la 2.ª no: permisoDeEscritura responde ok:false con el aviso en llano (no lanza)", p.valor?.ok === false && p.valor.error === PERMISOS_ILEGIBLES, JSON.stringify(p));
}
pon(ESCENARIOS.sinFila);
check("3 · sin fila: requireConsoleWrite deja escribir como hoy", (await requireConsoleWrite("ocp", "emite"))?.userId === USER.id);
check("3 · sin fila: permisoDeEscritura deja escribir como hoy", (await permisoDeEscritura("bcp", "emite")).ok === true);
check("3 · sin fila: coffeedGate y studioGate abren como hoy", (await coffeedGate("emite"))?.userId === USER.id && (await studioGate("emite"))?.via === "consola");
check("3 · sin fila: esOwnerDelPanel responde que sí, como hoy", (await esOwnerDelPanel(USER.id)) === true);
check("3 · el rechazo por permisos ilegibles dice qué pasó, en llano y sin detalles técnicos", /No se pudieron leer los permisos/.test(PERMISOS_ILEGIBLES) && !/error|supabase|null/i.test(PERMISOS_ILEGIBLES));
for (const [k, fila, pasa] of [["fila (activa)", ESCENARIOS.fila, true], ["fila (suspendida)", conFila({ ...FILA, status: "suspended" }), false], ["fila (invitada)", conFila({ ...FILA, status: "invited" }), false]]) {
  pon(fila);
  const r = await resultado(() => requireActiveAdmin());
  check(`3 · requireActiveAdmin · ${k}: ${pasa ? "pasa como hoy" : "no pasa, como hoy"}`, pasa ? r.valor === USER.id : r.lanza === "No autorizado.", JSON.stringify(r));
}

// ── 4 · lo que no se ejecuta aquí: por texto ────────────────────────────────────────────────────────────────────────────────
const archivos = readdirSync(new URL("../src/", import.meta.url), { recursive: true })
  .map((f) => String(f).replace(/\\/g, "/"))
  .filter((f) => /\.(tsx?)$/.test(f))
  .map((f) => `src/${f}`);
{
  const viejos = [];
  const sinMirar = [];
  const ownerSuelto = [];
  for (const f of archivos) {
    const t = lee(f);
    if (/\bgetPanelUser\b/.test(t)) viejos.push(f);
    for (const m of t.matchAll(/const (\w+) = await leerPanelUser\(/g)) if (!t.includes(`${m[1]}.ok`)) sinMirar.push(f);
    if (f !== "src/lib/panel/panelUsers.ts" && /\bleerPanelUser\(/.test(t) && !/\.ok\b/.test(t)) sinMirar.push(f);
    if (/isPanelOwner\(\s*await\b/.test(t)) ownerSuelto.push(f);
  }
  check("4 · la fila se lee solo con leerPanelUser, la de las tres salidas (getPanelUser ya no existe)", viejos.length === 0, viejos.join(", "));
  check("4 · quien lee la fila con leerPanelUser mira si se pudo leer (.ok)", sinMirar.length === 0, [...new Set(sinMirar)].join(", "));
  check("4 · las decisiones del owner preguntan con esOwnerDelPanel (no con isPanelOwner sobre una lectura suelta)", ownerSuelto.length === 0, ownerSuelto.join(", "));
  const cambiar = lee("src/app/cambiar-contrasena/page.tsx");
  check("4 · /cambiar-contrasena: si no se pueden leer los permisos, al login", /const lectura = await leerPanelUser\(user\.id\);\s*if \(!lectura\.ok\) redirect\("\/login"\);/.test(cambiar));
  const pu = lee("src/lib/panel/panelUsers.ts");
  check("4 · panelUsers.ts: la consulta lee su `error` y lo convierte en { ok: false }", /const \{ data, error \} = await service\.from\("panel_users"\)/.test(pu) && /if \(error\) return \{ ok: false \};/.test(pu));
}

// ── 5 · las decisiones del owner, el Buzón y el login: con fila, sin fila, con error y lanzando ─────────────────────────────
// `fila` aquí es la de un OWNER activo (lo que la decisión pregunta); `colaborador`, una fila activa que no es owner.
const ACTOR = [
  ["fila", OWNER, true],
  ["colaborador", ESCENARIOS.fila, false],
  ["owner suspendido", conFila({ ...FILA, is_owner: true, status: "suspended" }), false],
  ["sinFila", ESCENARIOS.sinFila, true],
  ["error", ESCENARIOS.error, false],
  ["lanza", ESCENARIOS.lanza, false],
];

// 5a · gestionar usuarios y socios (`requireOwner` de cada archivo → `esOwnerDelPanel`). La 2.ª lectura es la fila del
// colaborador sobre el que se actúa: aquí no hay, así que quien pasa la compuerta oye «no encontrado» y no se escribe nada.
for (const [k, actor, pasa] of ACTOR) {
  pon([actor, ESCENARIOS.sinFila]);
  const u = await resultado(() => usuarios.reactivatePanelUser(OTRO));
  check(`5 · usuarios (requireOwner) · ${k}: ${pasa ? "pasa como hoy" : "no pasa"}`, pasa ? u.valor?.error === "Usuario no encontrado." : u.lanza === "Solo un owner puede gestionar usuarios del panel.", JSON.stringify(u));
  pon([actor]);
  const s = await resultado(() => socios.setPartnerStatus(OTRO, "active"));
  check(`5 · socios (requireOwner) · ${k}: ${pasa ? "pasa como hoy" : "no pasa"}`, pasa ? s.valor?.error === "Credencial no encontrada." : s.lanza === "Solo un owner puede gestionar credenciales de socios.", JSON.stringify(s));
}
// 5b · la fila del colaborador que el owner gestiona también se lee con `leerPanelUser`: ilegible → no se hace nada.
{
  const ACCIONES = {
    suspendPanelUser: () => usuarios.suspendPanelUser(OTRO),
    reactivatePanelUser: () => usuarios.reactivatePanelUser(OTRO),
    resendPanelInvite: () => usuarios.resendPanelInvite(OTRO),
    resetPanelUserPassword: () => usuarios.resetPanelUserPassword(OTRO),
    updateDeliveryEmail: () => usuarios.updateDeliveryEmail(OTRO, ""),
  };
  for (const [nombre, fn] of Object.entries(ACCIONES)) {
    for (const k of ["error", "lanza"]) {
      pon([OWNER, ESCENARIOS[k]]);
      const r = await resultado(fn);
      check(`5 · usuarios · ${nombre} · la fila del colaborador ${k}: responde el aviso en llano y no escribe`, r.valor?.ok === false && r.valor.error === PERMISOS_ILEGIBLES && globalThis.__QA_PERMISOS.escrito.length === 0, JSON.stringify(r));
    }
    pon([OWNER, ESCENARIOS.sinFila]);
    const r = await resultado(fn);
    check(`5 · usuarios · ${nombre} · sin fila del colaborador: «Usuario no encontrado.», como hoy`, r.valor?.error === "Usuario no encontrado." && globalThis.__QA_PERMISOS.escrito.length === 0, JSON.stringify(r));
  }
  pon([OWNER, conFila({ ...FILA, profile_id: OTRO, status: "suspended" })]);
  const r = await resultado(() => usuarios.reactivatePanelUser(OTRO));
  const escrito = globalThis.__QA_PERMISOS.escrito.find((w) => w.tabla === "panel_users");
  check("5 · usuarios · con la fila del colaborador: reactivar sigue como hoy (escribe status active)", r.valor?.ok === true && escrito?.valor?.status === "active", JSON.stringify({ r, escrito }));
}

// 5c · Mapa de Trabajo y Admin Lock (`esOwnerDelPanel` tras `permisoDeEscritura`: 1.ª y 2.ª lectura la compuerta, 3.ª el owner).
// Con un nombre vacío y una contraseña corta, quien pasa la compuerta del owner oye la validación siguiente y no se escribe.
for (const [k, actor, pasa] of ACTOR) {
  pon(actor);
  const m = await resultado(() => mapa.saveProposal({ name: "", config: {} }));
  pon(actor);
  const c = await resultado(() => candado.setAdminLockPassword("", ""));
  if (k === "error" || k === "lanza" || k === "owner suspendido") {
    check(`5 · Mapa de Trabajo · ${k}: la compuerta no deja pasar`, Boolean(m.lanza), JSON.stringify(m));
    check(`5 · Admin Lock · ${k}: la compuerta no deja pasar`, Boolean(c.lanza), JSON.stringify(c));
    continue;
  }
  check(`5 · Mapa de Trabajo · ${k}: ${pasa ? "el owner pasa como hoy" : "no es owner"}`, m.valor?.error === (pasa ? "Escriba un nombre para la propuesta." : "Solo el owner puede guardar propuestas."), JSON.stringify(m));
  check(`5 · Admin Lock · ${k}: ${pasa ? "el owner pasa como hoy" : "no es owner"}`, c.valor?.error === (pasa ? "La nueva contraseña necesita al menos 3 caracteres." : "Solo el owner puede cambiar el Admin Lock."), JSON.stringify(c));
}
for (const k of ["error", "lanza"]) {
  pon([OWNER, OWNER, ESCENARIOS[k]]);
  const m = await resultado(() => mapa.saveProposal({ name: "", config: {} }));
  check(`5 · Mapa de Trabajo · la lectura del owner ${k}: no es owner`, m.valor?.error === "Solo el owner puede guardar propuestas.", JSON.stringify(m));
  pon([OWNER, OWNER, ESCENARIOS[k]]);
  const b = await resultado(() => mapa.deleteProposal("propuesta-qa"));
  check(`5 · Mapa de Trabajo · borrar con la lectura del owner ${k}: no es owner y no se borra`, b.valor?.error === "Solo el owner puede borrar propuestas." && globalThis.__QA_PERMISOS.escrito.length === 0, JSON.stringify(b));
  pon([OWNER, OWNER, ESCENARIOS[k]]);
  const c = await resultado(() => candado.setAdminLockPassword("", ""));
  check(`5 · Admin Lock · la lectura del owner ${k}: no es owner`, c.valor?.error === "Solo el owner puede cambiar el Admin Lock.", JSON.stringify(c));
}

// 5d · ruptura y descongelar del OCP: aquí hace falta una fila de owner activo (el `bcp_admin` sin fila no basta, como hoy).
for (const [k, actor, pasaAqui] of [...ACTOR.map(([k, a, p]) => [k, a, p && k !== "sinFila"])]) {
  pon(actor);
  const d = await resultado(() => contratos.descongelarCuenta(OTRO, new FormData()));
  pon(actor);
  const r = await resultado(() => contratos.declararRuptura("contrato-qa", new FormData()));
  if (k === "error" || k === "lanza" || k === "owner suspendido") {
    check(`5 · OCP descongelar y ruptura · ${k}: la compuerta no deja pasar`, Boolean(d.lanza) && Boolean(r.lanza), JSON.stringify({ d, r }));
    continue;
  }
  check(`5 · OCP descongelar · ${k}: ${pasaAqui ? "el owner pasa como hoy" : "no es owner, como hoy"}`, d.valor?.error === (pasaAqui ? "Escriba por qué se descongela." : "Solo el owner descongela una cuenta."), JSON.stringify(d));
  check(`5 · OCP ruptura · ${k}: ${pasaAqui ? "el owner pasa como hoy" : "no es owner, como hoy"}`, r.valor?.error === (pasaAqui ? "Escriba el motivo — queda en el rastro y el productor lo lee." : "Solo el owner declara una ruptura contractual."), JSON.stringify(r));
}
for (const k of ["error", "lanza"]) {
  pon([OWNER, OWNER, ESCENARIOS[k]]);
  const d = await resultado(() => contratos.descongelarCuenta(OTRO, new FormData()));
  check(`5 · OCP descongelar · la lectura del owner ${k}: no es owner`, d.valor?.error === "Solo el owner descongela una cuenta.", JSON.stringify(d));
}

// 5e · el Buzón: el owner abre cualquier correo; un colaborador, solo el suyo. Ilegible = colaborador, nunca owner.
{
  const CORREO_AJENO = { tablas: { inbound_emails: conFila({ id: "correo-qa", to_email: "otro@example.test", attachments: [] }) } };
  const CORREO_PROPIO = { tablas: { inbound_emails: conFila({ id: "correo-qa", to_email: "qa@example.test", attachments: [] }) } };
  const abrir = () => resultado(() => buzon.getBuzonAttachmentUrls("correo-qa"));
  for (const [k, actor, pasa] of ACTOR) {
    pon(actor, CORREO_AJENO);
    const r = await abrir();
    if (k === "error" || k === "lanza" || k === "owner suspendido") {
      check(`5 · Buzón · ${k}: la compuerta no deja pasar`, r.lanza === "No autorizado.", JSON.stringify(r));
      continue;
    }
    check(`5 · Buzón · correo ajeno · ${k}: ${pasa ? "el owner lo abre como hoy" : "un colaborador no"}`, pasa ? Array.isArray(r.valor) : r.lanza === "No autorizado para este correo.", JSON.stringify(r));
  }
  for (const k of ["error", "lanza"]) {
    pon([OWNER, ESCENARIOS[k]], CORREO_AJENO);
    const r = await abrir();
    check(`5 · Buzón · la lectura de la identidad ${k}: no es owner (el correo ajeno no se abre)`, r.lanza === "No autorizado para este correo.", JSON.stringify(r));
    pon([OWNER, ESCENARIOS[k]], CORREO_PROPIO);
    const p = await abrir();
    check(`5 · Buzón · la lectura de la identidad ${k}: el correo propio sigue abriendo`, Array.isArray(p.valor), JSON.stringify(p));
  }
}

// 5f · login, paso 1 (contraseña): la fila manda como hoy; ilegible = 503 con un aviso para reintentar, sin código.
{
  const PEDIDO = { json: async () => ({ email: "qa@example.test", password: "clave-de-prueba" }) };
  const CODIGO = { alEscribir: { admin_otp_codes: { data: { pending_login_token: "tok-qa" }, error: null } } };
  const entrar = async (panel) => {
    pon(panel, CODIGO);
    const r = await resultado(() => loginClave.POST(PEDIDO));
    const e = globalThis.__QA_PERMISOS;
    return { r: r.valor, lanza: r.lanza, enviados: e.enviados, otp: e.leido.includes("admin_otp_codes") || e.escrito.some((w) => w.tabla === "admin_otp_codes") };
  };
  for (const [k, panel, destino] of [
    ["fila (activa)", ESCENARIOS.fila, "qa@example.test"],
    ["fila (invitada)", conFila({ ...FILA, status: "invited" }), "qa@example.test"],
    ["fila con buzón de entrega", conFila({ ...FILA, delivery_email: "entrega@example.test" }), "entrega@example.test"],
    ["sinFila", ESCENARIOS.sinFila, "qa@example.test"],
  ]) {
    const x = await entrar(panel);
    check(`5 · login (contraseña) · ${k}: sigue como hoy (200, el código va a ${destino})`, x.r?.status === 200 && x.r.body?.ok === true && x.r.cookie === "panel_pending" && JSON.stringify(x.enviados) === JSON.stringify([destino]), JSON.stringify(x));
  }
  {
    const x = await entrar(conFila({ ...FILA, status: "suspended" }));
    check("5 · login (contraseña) · fila suspendida: 401 «Credenciales inválidas.» y sin código, como hoy", x.r?.status === 401 && x.r.body?.error === "Credenciales inválidas." && x.enviados.length === 0 && !x.otp, JSON.stringify(x));
  }
  for (const k of ["error", "lanza"]) {
    const x = await entrar(ESCENARIOS[k]);
    check(`5 · login (contraseña) · ${k}: 503, sin código ni sesión pendiente`, x.r?.status === 503 && x.enviados.length === 0 && !x.otp && x.r.cookie === null, JSON.stringify(x));
    check(`5 · login (contraseña) · ${k}: la pantalla de login lee un aviso para reintentar, sin detalles técnicos`, typeof x.r?.body?.error === "string" && /Intenta de nuevo/.test(x.r.body.error) && !/error|supabase|null|panel_users/i.test(x.r.body.error), JSON.stringify(x.r?.body));
  }
}

// 5g · login, paso 2 (código): con fila se apunta el ingreso (y la invitada pasa a activa); sin fila o ilegible, nada.
{
  const OTP = { id: "otp-qa", profile_id: USER.id, code_hash: hashOtpCode("123456"), expires_at: "2999-01-01T00:00:00Z", consumed_at: null, attempt_count: 0 };
  const PENDIENTE = JSON.stringify({ pendingLoginToken: "tok-qa", access_token: "a", refresh_token: "r" });
  const PEDIDO = { cookies: { get: (n) => (n === "panel_pending" ? { value: PENDIENTE } : undefined) }, json: async () => ({ code: "123456" }) };
  const confirmar = async (panel) => {
    pon(panel, { tablas: { admin_otp_codes: conFila(OTP) } });
    const r = await resultado(() => loginCodigo.POST(PEDIDO));
    return { r, filas: globalThis.__QA_PERMISOS.escrito.filter((w) => w.tabla === "panel_users") };
  };
  {
    const x = await confirmar(conFila({ ...FILA, status: "invited" }));
    check("5 · login (código) · fila invitada: pasa a activa al entrar, como hoy", x.r.valor?.status === 200 && x.filas.length === 1 && x.filas[0].valor?.status === "active" && Boolean(x.filas[0].valor?.last_login_at), JSON.stringify(x));
  }
  {
    const x = await confirmar(ESCENARIOS.fila);
    check("5 · login (código) · fila activa: apunta el ingreso y no toca el estado, como hoy", x.r.valor?.status === 200 && x.filas.length === 1 && !("status" in (x.filas[0].valor ?? {})) && Boolean(x.filas[0].valor?.last_login_at), JSON.stringify(x));
  }
  for (const k of ["sinFila", "error", "lanza"]) {
    const x = await confirmar(ESCENARIOS[k]);
    check(`5 · login (código) · ${k}: no escribe en panel_users`, x.r.valor?.status === 200 && x.filas.length === 0, JSON.stringify(x));
  }
}

// ── 6 · fuera de panelUsers.ts nadie lee `panel_users` por profile_id ───────────────────────────────────────────────────────
// Las lecturas de la tabla que NO deciden quién puede algo, cada una con su motivo. `firma` es un
// trozo de la cadena (sin espacios) que la identifica dentro de su archivo. Una lectura nueva entra aquí con su motivo
// o pasa por `leerPanelUser` / `esOwnerDelPanel`; una por `profile_id` no entra nunca.
const LECTURAS_PERMITIDAS = [
  {
    archivo: "src/app/bcp/(app)/usuarios/page.tsx",
    firma: '.select("*").order("created_at"',
    motivo: "la lista de colaboradores que pinta la página de usuarios (la página pide primero requireConsoleAccess e isOwner)",
  },
  {
    archivo: "src/app/bcp/(app)/usuariosActions.ts",
    firma: '.select("profile_id", { count: "exact", head: true })',
    motivo: "cuenta los owners activos para no suspender al último; si no se puede contar, no se suspende",
  },
  {
    archivo: "src/lib/os/hechos.ts",
    firma: '.select("profile_id").in("profile_id", perfiles)',
    motivo: "rotula qué actores de los hechos son del equipo (un rótulo, no un permiso); si falla, la lectura de hechos responde error",
  },
];
const sinEspacios = (s) => s.replace(/\s+/g, "");

/** Cada cadena que empieza en `.from("panel_users")`: su línea, su texto, si escribe y si lee por `profile_id`. */
function cadenasDePanelUsers(texto) {
  const out = [];
  for (const m of texto.matchAll(/\.from\(\s*(["'`])panel_users\1\s*\)/g)) {
    let i = m.index + m[0].length;
    let prof = 0;
    let comilla = null;
    for (; i < texto.length; i++) {
      const c = texto[i];
      if (comilla) {
        if (c === "\\") i++;
        else if (c === comilla) comilla = null;
        continue;
      }
      if (c === '"' || c === "'" || c === "`") comilla = c;
      else if ("([{".includes(c)) prof++;
      else if (")]}".includes(c)) {
        if (prof === 0) break;
        prof--;
      } else if (prof === 0 && (c === ";" || c === ",")) break;
      else if (prof === 0 && c === "\n" && !/^\s*\./.test(texto.slice(i + 1, i + 400))) break;
    }
    const cadena = texto.slice(m.index, i);
    const escribe = /\.(insert|update|upsert|delete)\(/.test(cadena);
    const porPerfil = !escribe && /\.(eq|filter)\(\s*["'`]profile_id["'`]|\.match\(\s*\{[^}]*\bprofile_id\b/.test(cadena);
    out.push({ linea: texto.slice(0, m.index).split("\n").length, cadena, escribe, porPerfil });
  }
  return out;
}

/** Los problemas de un archivo: una lectura por `profile_id`, o una lectura que no está en la lista con su motivo. */
function revisa(archivo, texto, permitidas = LECTURAS_PERMITIDAS) {
  if (archivo === "src/lib/panel/panelUsers.ts") return [];
  const problemas = [];
  for (const c of cadenasDePanelUsers(texto)) {
    if (c.escribe) continue;
    if (c.porPerfil) problemas.push(`${archivo}:${c.linea} lee panel_users por profile_id (va por leerPanelUser / esOwnerDelPanel)`);
    else if (!permitidas.some((p) => p.archivo === archivo && sinEspacios(c.cadena).includes(sinEspacios(p.firma)))) {
      problemas.push(`${archivo}:${c.linea} lee panel_users y no está en LECTURAS_PERMITIDAS`);
    }
  }
  return problemas;
}

{
  const problemas = [];
  const usadas = new Map(LECTURAS_PERMITIDAS.map((p) => [p, 0]));
  for (const f of archivos) {
    const t = lee(f);
    if (!t.includes("panel_users")) continue;
    problemas.push(...revisa(f, t));
    for (const c of cadenasDePanelUsers(t)) {
      if (c.escribe) continue;
      for (const p of LECTURAS_PERMITIDAS) if (p.archivo === f && sinEspacios(c.cadena).includes(sinEspacios(p.firma))) usadas.set(p, usadas.get(p) + 1);
    }
  }
  check("6 · fuera de panelUsers.ts ningún archivo de src/ lee panel_users por profile_id, y toda otra lectura está en LECTURAS_PERMITIDAS", problemas.length === 0, problemas.join(" · "));
  const rancias = [...usadas].filter(([, n]) => n !== 1).map(([p, n]) => `${p.archivo} «${p.firma}» (${n})`);
  check("6 · cada entrada de LECTURAS_PERMITIDAS corresponde a UNA lectura que existe (ni rancias ni dobles)", rancias.length === 0, rancias.join(" · "));
  check("6 · cada entrada de LECTURAS_PERMITIDAS dice su motivo", LECTURAS_PERMITIDAS.every((p) => p.motivo && p.motivo.length > 20));
  const propias = cadenasDePanelUsers(lee("src/lib/panel/panelUsers.ts")).filter((c) => !c.escribe);
  check("6 · panelUsers.ts tiene UNA lectura de panel_users, por profile_id (la de leerPanelUser)", propias.length === 1 && propias[0].porPerfil, JSON.stringify(propias));
}

// 6 · autopruebas: una lectura mal hecha rompe la regla, y lo que está bien no.
{
  const una = (texto, archivo = "src/app/x/acciones.ts") => revisa(archivo, texto);
  check("6 · autoprueba · una lectura por profile_id en una línea se detecta",
    una('const { data } = await service.from("panel_users").select("is_owner").eq("profile_id", id).maybeSingle();').length === 1);
  check("6 · autoprueba · una lectura por profile_id en varias líneas se detecta",
    una('const { data: pu } = await service\n  .from("panel_users")\n  .select("status, delivery_email")\n  .eq("profile_id", user.id)\n  .maybeSingle();\n').length === 1);
  check("6 · autoprueba · con comillas simples y espacios también",
    una("const r = await service.from( 'panel_users' ).select('*').eq( 'profile_id', id ).single();").length === 1);
  check("6 · autoprueba · dentro de un Promise.all, la lectura por profile_id de panel_users se detecta",
    una('const [{ data: pu }, { data: prof }] = await Promise.all([\n  service.from("panel_users").select("is_owner, status").eq("profile_id", userId).maybeSingle(),\n  service.from("profiles").select("email").eq("id", userId).maybeSingle(),\n]);').length === 1);
  {
    const c = cadenasDePanelUsers('await Promise.all([\n  service.from("panel_users").select("profile_id").in("profile_id", ids),\n  service.from("partner_accounts").select("node_type").eq("profile_id", x),\n]);');
    check("6 · autoprueba · la cadena termina en su coma: el `profile_id` de la tabla siguiente no se le atribuye", c.length === 1 && !c[0].porPerfil && !c[0].cadena.includes("partner_accounts"), JSON.stringify(c));
  }
  check("6 · autoprueba · una escritura por profile_id no es una lectura",
    una('await service.from("panel_users").update({ must_change_password: false }).eq("profile_id", user.id);').length === 0);
  check("6 · autoprueba · una lista nueva fuera de LECTURAS_PERMITIDAS se detecta",
    una('const { data } = await service.from("panel_users").select("email").order("email");').length === 1);
  check("6 · autoprueba · la lista permitida pasa en su archivo y no en otro",
    una('    service.from("panel_users").select("profile_id").in("profile_id", perfiles),\n', "src/lib/os/hechos.ts").length === 0 &&
      una('    service.from("panel_users").select("profile_id").in("profile_id", perfiles),\n').length === 1);
  check("6 · autoprueba · preguntar con leerPanelUser / esOwnerDelPanel pasa",
    una("const lectura = await leerPanelUser(user.id);\nif (!lectura.ok) return null;\nif (!(await esOwnerDelPanel(user.id))) throw new Error(\"x\");").length === 0);
}

// ── informe ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
delete globalThis.__QA_PERMISOS;
if (fallos.length) {
  console.error(`✗ qa-permisos-legibles: ${fallos.length} fallo(s), ${ok} OK\n`);
  for (const f of fallos) console.error("   " + f);
  process.exit(1);
}
console.log(`✓ qa-permisos-legibles: ${ok} comprobaciones OK, 0 fallos`);
