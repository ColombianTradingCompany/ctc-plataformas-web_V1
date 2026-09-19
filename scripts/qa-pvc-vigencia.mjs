// Guardián de la vigencia del PVC (V5.43, hallazgo A1 de docs/PVC_BCP_PLAN.md §10.2).
//
//   node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/qa-pvc-vigencia.mjs
//
// LO QUE PROTEGE. El PVC se publica SIETE U OCHO SEMANAS antes de su fecha
// efectiva y rige tres meses (plan §1). Entre la publicación y el `valid_from`
// hay, por diseño, casi dos meses en los que DOS ediciones están publicadas y
// solo una manda: la vieja.
//
// Hasta V5.42 «vigente» era «la última publicada por `published_at`» en los
// tres sitios que lo decidían — `edicionVigente()`, la vista pública y, por su
// cuenta, la pantalla de Ediciones. Con esa regla, publicar la franja siguiente
// habría puesto su precio a regir el mismo día. No hizo daño porque todavía
// nadie lee el PVC (0 ofertas, 0 contratos, 0 listados el 2026-09-16); este
// guardián existe para que no vuelva a colarse cuando sí lo lean.
//
// Es un guardián de CÓDIGO (no toca la base): comprueba que la regla esté
// escrita donde se decide, y prueba la aritmética de la ventana con fechas.

import { readFileSync } from "node:fs";

const raiz = new URL("../", import.meta.url);
const lee = (r) => readFileSync(new URL(r, raiz), "utf8");

let ok = 0;
const fallos = [];
const check = (n, c) => (c ? ok++ : fallos.push(n));

// ── 1 · el servicio decide por ventana, no por fecha de publicación ────────
const servicio = lee("src/lib/pvc/servicio.ts");
check("existe edicionVigente", /export async function edicionVigente/.test(servicio));
check("existe edicionProxima", /export async function edicionProxima/.test(servicio));
check("existe hoyEnColombia", /export function hoyEnColombia/.test(servicio));
check("la fecha se toma en America/Bogota", servicio.includes("America/Bogota"));
check("edicionVigente mira valid_from", /edicionVigente[\s\S]{0,1200}valid_from/.test(servicio));
check("edicionVigente mira valid_to", /edicionVigente[\s\S]{0,1200}valid_to/.test(servicio));
check("edicionVigente cae a publish_date si falta la ventana", /edicionVigente[\s\S]{0,1200}publish_date/.test(servicio));
check("edicionProxima mira valid_from", /edicionProxima[\s\S]{0,1200}valid_from/.test(servicio));
check("hay lectura pública de la próxima", /export async function pvcProximoPublico/.test(servicio));
check("la próxima sale de su propia vista", servicio.includes("public_pvc_next"));

// ── 2 · la pantalla NO vuelve a derivar cuál rige ──────────────────────────
const board = lee("src/components/panel/pvc/EdicionesBoard.tsx");
check("EdicionesBoard recibe vigenteId", /vigenteId/.test(board));
check("EdicionesBoard recibe proximaId", /proximaId/.test(board));
check(
  "EdicionesBoard ya NO deriva la vigente por status",
  !/ediciones\.find\(\(e\)\s*=>\s*e\.status\s*===\s*"published"/.test(board)
);
const pagina = lee("src/app/ecp/(app)/pvc/page.tsx");
check("la página resuelve la vigente en el servidor", /edicionVigente/.test(pagina));
check("la página resuelve la próxima en el servidor", /edicionProxima/.test(pagina));

// ── 3 · el endpoint público expone las dos ─────────────────────────────────
const ruta = lee("src/app/api/pvc/current/route.ts");
check("el endpoint devuelve la próxima", /proxima/.test(ruta));
check("el endpoint sigue devolviendo la vigente en la raíz", /\.\.\.current/.test(ruta));

// ── 4 · la aritmética de la ventana ────────────────────────────────────────
// La misma regla que aplica el servicio, probada aquí con fechas fijas: una
// edición publicada hoy para regir dentro de siete semanas NO rige hoy.
const rige = (e, hoy) => (e.valid_from ?? e.publish_date ?? "") <= hoy && (!e.valid_to || e.valid_to >= hoy);
const viene = (e, hoy) => (e.valid_from ?? e.publish_date ?? "") > hoy;

const actual = { valid_from: "2026-09-15", valid_to: "2026-12-15", publish_date: "2026-09-09" };
const siguiente = { valid_from: "2026-12-16", valid_to: "2027-03-15", publish_date: "2026-10-27" };
const sinVentana = { valid_from: null, valid_to: null, publish_date: "2026-09-01" };

check("la franja en curso rige", rige(actual, "2026-09-16"));
check("la siguiente NO rige el día que se publica", !rige(siguiente, "2026-10-27"));
check("la siguiente aparece como próxima el día que se publica", viene(siguiente, "2026-10-27"));
check("la siguiente NO rige la víspera", !rige(siguiente, "2026-12-15"));
check("la siguiente rige el día que entra", rige(siguiente, "2026-12-16"));
check("la que expiró deja de regir", !rige(actual, "2026-12-16"));
check("la que expiró tampoco es próxima", !viene(actual, "2026-12-16"));
check("sin ventana declarada, rige desde su publicación", rige(sinVentana, "2026-09-16"));
check("sin ventana declarada, no rige antes de publicarse", !rige(sinVentana, "2026-08-31"));

// ── 5 · la doctrina está escrita donde se lee ──────────────────────────────
const plan = lee("docs/PVC_BCP_PLAN.md");
check("el plan declara la cadencia de 7–8 semanas", /7–8\s*semanas/.test(plan));
check("el plan declara que se fija por 3 meses", /fija\*{0,2}\s*por\s*(3|tres)\s*meses/i.test(plan));

console.log(`qa-pvc-vigencia: ${ok} comprobaciones OK${fallos.length ? `, ${fallos.length} FALLOS: ${fallos.join(", ")}` : ""}`);
if (fallos.length) process.exit(1);
