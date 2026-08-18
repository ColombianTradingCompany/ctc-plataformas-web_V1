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

// ── El atajo y su módulo no pueden encenderse a la vez ───────────────────────
check(
  "en /ecp/direccionamiento/plataformas gana el ATAJO, no Direccionamiento",
  activo("ecp", "/ecp/direccionamiento/plataformas") === "/ecp/direccionamiento/plataformas"
);
check(
  "solo UN enlace del rail cubre-y-gana esa ruta",
  links("ecp").filter((l) => l.href === activo("ecp", "/ecp/direccionamiento/plataformas")).length === 1
);
// Direccionamiento se mudó al BCP el 2026-08-18 (PR-B del paso (ii)), así que
// esta comprobación cambió de consola: son las pestañas del BCP las que ahora
// encienden su módulo. En el ECP ya no hay nada que encender.
check(
  "en el BCP, las pestañas de Direccionamiento encienden su módulo",
  activo("bcp", "/bcp/direccionamiento/grados") === "/bcp/direccionamiento" &&
    activo("bcp", "/bcp/direccionamiento") === "/bcp/direccionamiento"
);
check(
  "y el rail del ECP ya no enciende nada en esa ruta",
  activo("ecp", "/bcp/direccionamiento") === null
);

// ── El atajo existe y apunta a la página que VIVE en Direccionamiento ────────
const atajo = links("ecp").find((l) => l.label === "Manejo de Plataformas");
check("el atajo está en el rail del ECP", !!atajo);
// Sigue anidado bajo la ruta que Direccionamiento tenía en el ECP, aunque el módulo padre se fuera
// al BCP: es una ruta huérfana a propósito hasta PR-C, que la vuelve
// `/ecp/plataformas` (F6). La página está en ecp/(app)/direccionamiento/plataformas/,
// y el talón del padre es EXPLÍCITO —no catch-all— justamente para no comérsela.
check("el atajo apunta a la página que sigue viva en el ECP", atajo?.href === "/ecp/direccionamiento/plataformas");
check(
  "el atajo vive en el grupo de IT y Plataforma",
  CONSOLES.ecp.nav.some((g) => g.label?.includes("IT y Plataforma") && g.links.some((l) => l === atajo))
);
check(
  "y NO se duplicó como módulo propio: no hay ruta /ecp/plataformas",
  !links("ecp").some((l) => l.href === "/ecp/plataformas")
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
