// Guardián del rail de las consolas internas.
//
//   node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/qa-nav-check.mjs
//
// El rail vive detrás del login maestro (contraseña + OTP), así que no se puede
// conducir en un navegador automatizado — la regla de la regla se comprueba
// aquí, contra los datos REALES de CONSOLES. Nació el 2026-08-16 con el atajo a
// «Manejo de Plataformas», que fue la primera ruta del rail que es prefijo de
// otra y destapó que dos enlaces se pintaban activos a la vez.

import { CONSOLES } from "../src/lib/panel/consoles.ts";
import { hrefActivoDelRail, enlaceCubre } from "../src/lib/panel/navActivo.ts";

let ok = 0;
const fallos = [];
const check = (nombre, cond) => (cond ? ok++ : fallos.push(nombre));

const links = (consola) => CONSOLES[consola].nav.flatMap((g) => g.links);
const activo = (consola, ruta) => hrefActivoDelRail(links(consola), ruta);

// ── «Manejo de Plataformas» ya NO es un atajo: es un módulo suelto ──────────
// Hasta PR-C colgaba de Direccionamiento y el rail lo alcanzaba con un atajo,
// lo que obligaba a la regla del href más largo. PR-B mandó Direccionamiento al
// BCP y PR-C (F6) lo sacó a `/ecp/plataformas`: ya no hay dos enlaces que se
// disputen una página, y la aserción que exigía que esa ruta NO existiera está
// invertida a propósito.
const plataformas = links("ecp").find((l) => l.label === "Manejo de Plataformas");
check("Manejo de Plataformas está en el rail del ECP", !!plataformas);
check("y ES su propia ruta, no un atajo dentro de otro módulo", plataformas?.href === "/ecp/plataformas");
check(
  "vive en el grupo de IT y Plataforma",
  CONSOLES.ecp.nav.some((g) => g.label?.includes("IT y Plataforma") && g.links.some((l) => l === plataformas))
);
check("y su ruta enciende SOLO su propio enlace", activo("ecp", "/ecp/plataformas") === "/ecp/plataformas");
check(
  "sin que ningún otro enlace del rail la cubra también",
  links("ecp").filter((l) => enlaceCubre(l, "/ecp/plataformas")).length === 1
);

// ── Límite de segmento (misma familia que ESTR-3 en el proxy) ────────────────
check(
  "una ruta hermana con prefijo común NO enciende el enlace",
  !enlaceCubre({ href: "/ecp/varietales" }, "/ecp/varietalesx")
);
check("pero la propia ruta sí", enlaceCubre({ href: "/ecp/varietales" }, "/ecp/varietales"));
check("y sus hijas también", enlaceCubre({ href: "/ecp/varietales" }, "/ecp/varietales/algo"));

// ── `exact` sigue significando exacto ────────────────────────────────────────
check("el Panel (exact) no se enciende en una subruta", activo("ecp", "/ecp/buzon") !== "/ecp");
check("el Panel (exact) sí se enciende en su propia ruta", activo("ecp", "/ecp") === "/ecp");

// ── Ninguna consola tiene hrefs repetidos en su rail ─────────────────────────
for (const k of Object.keys(CONSOLES)) {
  const hs = links(k).map((l) => l.href);
  check(`${k}: sin hrefs duplicados en el rail`, new Set(hs).size === hs.length);
}

// ── Y cada ruta del rail resuelve a sí misma ─────────────────────────────────
for (const k of Object.keys(CONSOLES)) {
  const malos = links(k).filter((l) => activo(k, l.href) !== l.href);
  check(`${k}: cada enlace se enciende en su propia ruta`, malos.length === 0);
  if (malos.length) console.log("   ", k, malos.map((m) => m.href));
}

console.log(`${ok} comprobaciones OK, ${fallos.length} fallos`);
for (const f of fallos) console.log("  FALLO:", f);
process.exit(fallos.length ? 1 : 0);
