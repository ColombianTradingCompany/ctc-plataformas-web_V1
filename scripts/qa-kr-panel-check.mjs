// Guardián del panel del productor en 5 interfaces (V5.16).
//
//   node scripts/qa-kr-panel-check.mjs
//
// La rejilla de módulos se retiró y el panel son cinco pestañas detrás de una
// barra inferior fija. Lo que hay que proteger:
//
//   · El contrato `?m=<módulo>` (V4.34) sigue vivo: los enlaces de vuelta de
//     la concha de herramientas traen claves de la rejilla VIEJA. Cada clave
//     debe tener pestaña de destino — una clave sin mapear es un deep-link
//     que aterriza en silencio en la pestaña equivocada.
//   · El botón "Atrás" del teléfono: el DRILL es capa de historial, la
//     PESTAÑA no. Si alguien vuelve a contar la pestaña, cada cambio de
//     pestaña empuja historia y "Atrás" deja de salir de la app.
//   · Los FABs quedaron retirados — la franja inferior es de la barra.
//   · La trampa V4.30 de los CSS modules: un `styles.X` sin regla `.X` en su
//     .module.css se vuelve `undefined` y pinta desnudo sin error alguno.

import { readFileSync, existsSync } from "node:fs";

let ok = 0;
const fallos = [];
const check = (n, c) => (c ? ok++ : fallos.push(n));
const ruta = (r) => new URL(`../${r}`, import.meta.url);
const lee = (r) => readFileSync(ruta(r), "utf8");

const tabs = lee("src/components/kaffetal-regal/panel/panelTabs.ts");
const dash = lee("src/components/kaffetal-regal/AppDashboard.tsx");
const exp = lee("src/components/kaffetal-regal/KaffetalExperience.tsx");
const nav = lee("src/components/kaffetal-regal/panel/PanelNav.tsx");
const navCss = lee("src/components/kaffetal-regal/panel/PanelNav.module.css");
const dashCss = lee("src/components/kaffetal-regal/AppDashboard.module.css");

// ── 1. Las cinco pestañas, ni una más ─────────────────────────────────────
const TABS = ["perfil", "evaluaciones", "contratos", "ecosistema", "mensajes"];
{
  const m = tabs.match(/export type PanelTab = ([^;]+);/);
  const declaradas = m ? [...m[1].matchAll(/"(\w+)"/g)].map((x) => x[1]) : [];
  check("PanelTab declara exactamente las 5 pestañas", declaradas.length === 5 && TABS.every((t) => declaradas.includes(t)));
}
{
  const m = tabs.match(/TAB_ORDER: PanelTab\[\] = \[([^\]]+)\]/);
  const orden = m ? [...m[1].matchAll(/"(\w+)"/g)].map((x) => x[1]) : [];
  check("TAB_ORDER lista las 5 (Mi Perfil al centro)", orden.length === 5 && orden[2] === "perfil");
}
for (const t of TABS) {
  check(`TAB_META tiene la pestaña «${t}»`, new RegExp(`${t}:\\s*\\{`).test(tabs));
}

// ── 2. El contrato ?m= cubre TODA la rejilla vieja ────────────────────────
{
  const union = dash.match(/export type DashboardModule = ([^;]+);/);
  const modulos = union ? [...union[1].matchAll(/"(\w+)"/g)].map((x) => x[1]) : [];
  check("DashboardModule sigue exportado (vocabulario del contrato ?m=)", modulos.length >= 12);
  const mapa = tabs.match(/LEGACY_MODULE_TO_TAB[^=]*=\s*\{([\s\S]*?)\n\};/);
  const claves = mapa ? [...mapa[1].matchAll(/^\s*(\w+):/gm)].map((x) => x[1]) : [];
  for (const m of modulos) {
    check(`?m=${m} tiene pestaña de destino`, claves.includes(m));
  }
  check("KaffetalExperience lee ?m= al montar", exp.includes('.get("m")') && exp.includes("esModuloLegado"));
  check("y limpia la URL con replaceState", exp.includes("history.replaceState"));
}

// ── 3. La pila de "Atrás": drill sí, pestaña no ───────────────────────────
{
  const bloque = exp.match(/const backLayerCount =[\s\S]*?;/)?.[0] ?? "";
  check("el drill cuenta como capa", bloque.includes("(drill ? 1 : 0)"));
  check("la pestaña NO cuenta como capa", !bloque.includes("activeTab"));
  check("cerrar la capa de encima cierra el drill", /else if \(drill\) setDrill\(null\)/.test(exp));
}

// ── 4. Los FABs quedaron retirados ────────────────────────────────────────
check("SideModuleFabs.tsx ya no existe", !existsSync(ruta("src/components/kaffetal-regal/SideModuleFabs.tsx")));
check("y nadie lo importa", !dash.includes("SideModuleFabs") && !exp.includes("SideModuleFabs"));

// ── 5. La barra inferior ──────────────────────────────────────────────────
check("PanelNav pinta las pestañas de TAB_ORDER", nav.includes("TAB_ORDER.map"));
check("con su icono de línea (svg inline)", nav.includes("TAB_ICON[t]") && lee("src/components/kaffetal-regal/panel/icons.tsx").includes("<svg"));
check("fija al pie", /\.bar\{[^}]*position:fixed/.test(navCss) && /\.bar\{[^}]*bottom:0/.test(navCss));
check("el cascarón deja sitio a la barra", /\.page\{[^}]*padding-bottom/.test(dashCss));
check("AppDashboard monta la barra", dash.includes("<PanelNav"));

// ── 6. La trampa V4.30: cada styles.X tiene su regla .X ───────────────────
// Cada TSX del panel importa uno o más .module.css con alias; un uso
// `alias.X` sin regla `.X` en el css mapeado pinta desnudo sin error.
const TSX = [
  "src/components/kaffetal-regal/AppDashboard.tsx",
  "src/components/kaffetal-regal/panel/PanelNav.tsx",
  "src/components/kaffetal-regal/panel/PerfilTab.tsx",
  "src/components/kaffetal-regal/panel/EvaluacionesTab.tsx",
  "src/components/kaffetal-regal/panel/ContratosTab.tsx",
  "src/components/kaffetal-regal/panel/EcosistemaTab.tsx",
  "src/components/kaffetal-regal/panel/MensajesTab.tsx",
  "src/components/kaffetal-regal/panel/FlipCard.tsx",
];
for (const archivo of TSX) {
  const src = lee(archivo);
  const dir = archivo.slice(0, archivo.lastIndexOf("/"));
  for (const imp of src.matchAll(/import (\w+) from "(\.[^"]+\.module\.css)"/g)) {
    const alias = imp[1];
    const cssPath = new URL(imp[2], `file:///${dir}/`).pathname.replace(/^\//, "");
    const css = lee(cssPath);
    const clases = new Set([...css.matchAll(/\.([A-Za-z_][\w-]*)/g)].map((m) => m[1]));
    const usos = new Set([...src.matchAll(new RegExp(`${alias}\\.([A-Za-z_]\\w*)`, "g"))].map((m) => m[1]));
    for (const u of usos) {
      check(`${archivo.split("/").pop()}: ${alias}.${u} existe en ${cssPath.split("/").pop()}`, clases.has(u));
    }
  }
}

if (fallos.length) {
  console.error(`✗ qa-kr-panel: ${fallos.length} fallo(s), ${ok} OK\n`);
  for (const f of fallos) console.error("   " + f);
  process.exit(1);
}
console.log(`✓ qa-kr-panel: ${ok} comprobaciones OK, 0 fallos`);
