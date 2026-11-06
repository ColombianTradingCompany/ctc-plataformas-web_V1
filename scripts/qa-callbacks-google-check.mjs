// Guardián de las VUELTAS DE GOOGLE de las ventanas de login (V6.20).
//
//   node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/qa-callbacks-google-check.mjs
//
// GRATIS y sin red: lee las fuentes y pasa cada vuelta por el PROXY REAL (`src/proxy.ts`), sin cookies.
//
// LO QUE PROTEGE. Cada ventana con «Continuar con Google» le pide a Supabase que vuelva a
// `${window.location.origin}<camino>`. Esa vuelta tiene que cumplir dos cosas a la vez, en CADA host donde la ventana se pinta:
//   · quedarse en el MISMO origen donde se abrió (la cookie del verificador PKCE se escribió allí), y
//   · llegar, después de que el proxy anteponga la base del subdominio (gotcha 12), a un `auth/callback` que EXISTE en `src/app`.
// La ventana de Cherry Picked se pinta en cuatro superficies; la vuelta de cada una cuelga de su propia base
// (`src/lib/auth/callbackCherryPicked.ts`). Este guardián lo comprueba host por host, con la tabla de abajo, y obliga a
// actualizar la tabla si una ventana se pinta en un sitio nuevo.
//
// La allowlist de Redirect URLs de Supabase no se ve desde el repo: la cubre el comodín de subdominios de la casa
// (charter `cherry-picked`, «Google»). En desarrollo, cada vuelta de `localhost` es una entrada propia.

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { registerHooks } from "node:module";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { quitarComentarios } from "./os-qa-comun.mjs";

// `next/server` sin extensión no resuelve en ESM fuera de Next; el proxy lo importa así.
registerHooks({ resolve: (s, c, n) => n(s === "next/server" ? "next/server.js" : s, c) });
const { proxy, config } = await import("../src/proxy.ts");
const { NextRequest } = await import("next/server.js");
const { caminoCallbackCherryPicked, SUPERFICIES_CHERRY_PICKED } = await import("../src/lib/auth/callbackCherryPicked.ts");
const { SUBDOMAIN_ROUTES, ROOT_DOMAIN } = await import("../src/lib/red/subdominios.ts");

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(RAIZ, "src");
let ok = 0;
const fallos = [];
const check = (n, c, d = "") => (c ? ok++ : fallos.push(n + (d ? ` — ${d}` : "")));
// Cada comprobación lee el CÓDIGO, sin comentarios: un comentario que cite la línea buena no la sustituye.
const leeAbs = (abs) => quitarComentarios(readFileSync(abs, "utf8").replace(/\r\n/g, "\n"));
const lee = (r) => leeAbs(join(RAIZ, r));
const existe = (r) => existsSync(join(RAIZ, r));
const rel = (abs) => relative(RAIZ, abs).replace(/\\/g, "/");

// ── El proxy real: ¿qué ruta de `src/app` sirve este host para este camino? ─────────────────────────────────────────────
const MATCHER = new RegExp(`^${config.matcher[0]}$`);
async function rutaServida(host, camino) {
  if (!MATCHER.test(camino)) return camino; // fuera del matcher el proxy no corre: se sirve tal cual
  const r = await proxy(new NextRequest(`https://${host}${camino}`, { headers: { host } }));
  const reescrita = r.headers.get("x-middleware-rewrite");
  return reescrita ? new URL(reescrita).pathname : camino;
}
const archivoDeRuta = (ruta) => `src/app${ruta}/route.ts`;
const tieneGET = (f) => existe(f) && /export\s+(async\s+function\s+GET\b|\{\s*GET\s*\}\s+from\s+["'][^"']+["'])/.test(lee(f));

// ── Quién importa un archivo (para saber dónde se pinta cada ventana) ────────────────────────────────────────────────────
function archivos(dir, out = []) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) archivos(p, out);
    else if (/\.(ts|tsx)$/.test(n)) out.push(p);
  }
  return out;
}
const TODOS = archivos(SRC);
function resuelve(desde, spec) {
  const base = spec.startsWith("@/") ? join(SRC, spec.slice(2)) : spec.startsWith(".") ? resolve(dirname(desde), spec) : null;
  if (!base) return null;
  for (const ext of ["", ".ts", ".tsx", "/index.ts", "/index.tsx"]) if (existsSync(base + ext) && statSync(base + ext).isFile()) return base + ext;
  return null;
}
function importadores(r) {
  const objetivo = join(RAIZ, r);
  return TODOS.filter((f) => [...leeAbs(f).matchAll(/from\s+["']([^"']+)["']/g)].some((m) => resuelve(f, m[1]) === objetivo))
    .map(rel)
    .sort();
}

// ── El camino que pide cada ventana ──────────────────────────────────────────────────────────────────────────────────────
// Dos formas reconocidas: un camino literal tras el origen, o el cálculo por superficie de Cherry Picked. Otra forma es un fallo:
// el guardián no puede decir a dónde vuelve, y quien la escriba tiene que enseñárselo aquí.
function caminoDe(archivo) {
  const src = lee(archivo);
  const usos = [...src.matchAll(/redirectTo:\s*`([^`]*)`/g)].map((m) => m[1]);
  if (usos.length !== 1) return { error: `esperaba UN redirectTo, hay ${usos.length}` };
  const u = usos[0];
  const literal = u.match(/^\$\{window\.location\.origin\}(\/[^$`{}]*)$/);
  if (literal) return { calcula: () => literal[1], forma: "literal" };
  if (u === "${window.location.origin}${caminoCallbackCherryPicked(window.location.host, window.location.pathname)}")
    return { calcula: (host, path) => caminoCallbackCherryPicked(host, path), forma: "por superficie" };
  return { error: `redirectTo no reconocido: ${u}` };
}

// ── Dónde se pinta cada ventana ──────────────────────────────────────────────────────────────────────────────────────────
// `superficies`: las bases donde la ventana aparece. Cada una se prueba en su subdominio (en la raíz, `/`), en www y en
// localhost (en su ruta). `renderizadores`: quién importa el archivo hoy; si cambia, la tabla se revisa.
const DEV = "localhost:3000";
const WWW = `www.${ROOT_DOMAIN}`;
const subdominioDe = (base) => Object.entries(SUBDOMAIN_ROUTES).find(([, r]) => r === base)?.[0] ?? null;
const VENTANAS = [
  {
    nombre: "Cherry Picked · LoginModal",
    archivo: "src/components/cherry-picked/LoginModal.tsx",
    renderizadores: ["src/components/cherry-picked/CherryPickedExperience.tsx", "src/components/cherry-picked/sesion.tsx"],
    superficies: [...SUPERFICIES_CHERRY_PICKED],
  },
  {
    nombre: "Kaffetal Regal · LoginModal",
    archivo: "src/components/kaffetal-regal/LoginModal.tsx",
    renderizadores: ["src/components/kaffetal-regal/KaffetalExperience.tsx"],
    superficies: ["/kaffetal-regal"],
  },
  {
    nombre: "Directorio · Login",
    archivo: "src/components/directorio/Login.tsx",
    renderizadores: ["src/components/directorio/DirectorioExperience.tsx"],
    superficies: ["/directorio"],
  },
  {
    nombre: "Herramientas · AccesoTaller",
    archivo: "src/app/herramientas/acceso/AccesoTaller.tsx",
    renderizadores: ["src/app/herramientas/acceso/page.tsx"],
    superficies: ["/herramientas"],
    sufijo: "/acceso",
  },
  {
    nombre: "Terratalento · TerratalentoExperience",
    archivo: "src/components/terratalento/TerratalentoExperience.tsx",
    renderizadores: ["src/app/terratalento/page.tsx"],
    superficies: ["/terratalento"],
  },
  {
    // CTC Home: solo `src/app/page.tsx` monta el modal CON Google; el resto lo monta con `googleAuth={false}` (abajo, 3).
    nombre: "CTC Home · ContactModal",
    archivo: "src/components/ctc-home/ContactModal.tsx",
    renderizadores: null,
    superficies: ["/"],
  },
];

// ── 1 · Cada vuelta, en cada host donde se pinta la ventana, llega a un callback que existe ──────────────────────────────
for (const v of VENTANAS) {
  const c = caminoDe(v.archivo);
  if (c.error) {
    check(`1 · ${v.nombre}: su redirectTo se puede leer`, false, c.error);
    continue;
  }
  if (v.renderizadores) {
    const hoy = importadores(v.archivo);
    check(`1 · ${v.nombre}: se pinta donde dice la tabla`, JSON.stringify(hoy) === JSON.stringify(v.renderizadores), `hoy la importan ${hoy.join(", ") || "nadie"}`);
  }
  for (const base of v.superficies) {
    const sub = base === "/" ? null : subdominioDe(base);
    if (base !== "/") check(`1 · ${v.nombre}: ${base} tiene subdominio en el mapa`, !!sub);
    const ruta = base === "/" ? "/" : `${base}${v.sufijo ?? ""}`;
    const sitios = [
      ...(sub ? [[`${sub}.${ROOT_DOMAIN}`, v.sufijo ?? "/"]] : []),
      [WWW, ruta],
      [DEV, ruta],
    ];
    for (const [host, pagina] of sitios) {
      const camino = c.calcula(host, pagina);
      const servida = await rutaServida(host, camino);
      const f = archivoDeRuta(servida);
      // El callback que sirve tiene que ser el DE ESTA SUPERFICIE: el de otra existe, pero canjea con otras reglas (el de Kaffetal
      // Regal asciende a productor; el de la raíz reanuda un lead de CTC Home).
      const propio = `${base === "/" ? "" : base}/auth/callback`;
      check(
        `1 · ${v.nombre} en ${host}${pagina}: vuelve a ${camino} (mismo origen) y el proxy lo sirve con ${archivoDeRuta(propio)}`,
        camino.startsWith("/") && !camino.startsWith("//") && servida === propio && tieneGET(f),
        `servida como ${servida}${tieneGET(f) ? "" : " (sin route.ts con GET)"}`
      );
    }
  }
}

// ── 2 · Cherry Picked: cada superficie vuelve a SU base, y la familia aterriza en Green con «Mi cuenta» ───────────────────
{
  for (const base of SUPERFICIES_CHERRY_PICKED) {
    const sub = subdominioDe(base);
    check(`2 · ${base}: en su subdominio vuelve a su propio callback`, caminoCallbackCherryPicked(`${sub}.${ROOT_DOMAIN}`, "/") === `${base}/auth/callback`);
    check(`2 · ${base}: en www vuelve a su propio callback`, caminoCallbackCherryPicked(WWW, base) === `${base}/auth/callback`);
    check(`2 · ${base}: tiene su route.ts con GET`, tieneGET(archivoDeRuta(`${base}/auth/callback`)));
  }
  // Frontera de segmento: `/cherry-picked` es prefijo de las otras tres y no puede quedarse con ellas.
  check("2 · /cherry-picked-roast en www no cae en la portada", caminoCallbackCherryPicked(WWW, "/cherry-picked-roast/x") === "/cherry-picked-roast/auth/callback");
  check("2 · sin pista de superficie se vuelve a la tienda", caminoCallbackCherryPicked(WWW, "/") === "/cherry-picked-green/auth/callback");
  const familia = lee("src/app/cherry-picked/auth/callback/route.ts");
  // Las expresiones exactas, en el código: el canje dentro de `if (code)`, la URL canónica de Green en producción y el aterrizaje.
  check("2 · la vuelta de la familia canjea el código",
    /if \(code\) \{\s*const sessionClient = await createSessionClient\(\);\s*await sessionClient\.auth\.exchangeCodeForSession\(code\);\s*\}/.test(familia));
  check("2 · la vuelta de la familia conoce la URL de Green en producción",
    /const GREEN =\s*process\.env\.NODE_ENV === "production" \? "https:\/\/cherry-picked-green\.ctcexport\.com" : null;/.test(familia));
  check("2 · la vuelta de la familia aterriza en Green con «Mi cuenta» abierta",
    /return NextResponse\.redirect\(`\$\{GREEN \?\? `\$\{origin\}\/cherry-picked-green`\}\?cuenta=1`\);/.test(familia));
  for (const s of ["cherry-picked-roast", "cherry-picked-x"]) {
    const f = `src/app/${s}/auth/callback/route.ts`;
    check(`2 · ${s} reusa la vuelta de la familia`, existe(f) && lee(f).includes('export { GET } from "@/app/cherry-picked/auth/callback/route";'));
  }
  // Las landings que montan el proveedor (y con él la ventana) son exactamente la portada, Roast y X.
  // Un montaje es JSX (`<ProveedorDeCuenta>` o con props), no la mención en un comentario ni en un mensaje de error.
  const conProveedor = TODOS.filter((f) => /^\s*<ProveedorDeCuenta[\s>]/m.test(leeAbs(f))).map(rel).sort();
  const esperadas = ["src/components/cherry-picked-hub/HubLanding.tsx", "src/components/cherry-picked-roast/RoastLanding.tsx", "src/components/cherry-picked-x/XLanding.tsx"];
  check("2 · la ventana de la familia se monta en la portada, Roast y X (y la tienda la monta ella misma)", JSON.stringify(conProveedor) === JSON.stringify(esperadas), conProveedor.join(", "));
}

// ── 3 · CTC Home: el modal con Google solo en la casa matriz (los subdominios no tienen dónde volver) ────────────────────
{
  const montajes = TODOS.filter((f) => /<ContactModalProvider[\s>]/.test(leeAbs(f))).map(rel).sort();
  for (const f of montajes) {
    const src = lee(f);
    const conGoogle = /<ContactModalProvider(\s*>|\s+(?![^>]*googleAuth=\{false\})[^>]*>)/.test(src);
    check(`3 · ${f}: ${f === "src/app/page.tsx" ? "monta el modal con Google" : "monta el modal sin Google"}`, f === "src/app/page.tsx" ? conGoogle : !conGoogle);
  }
}

if (fallos.length) {
  console.error(`✗ qa-callbacks-google: ${fallos.length} fallo(s), ${ok} OK\n`);
  for (const f of fallos) console.error("   " + f);
  process.exit(1);
}
console.log(`✓ qa-callbacks-google: ${ok} comprobaciones OK, 0 fallos`);
