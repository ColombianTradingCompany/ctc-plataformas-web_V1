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

// ── «Manejo de Plataformas» es un módulo suelto, y vive donde se configura el sistema ──
// Hasta PR-C colgaba de Direccionamiento y el rail lo alcanzaba con un atajo, lo que obligaba a la regla
// del href más largo. PR-C (F6, V4.26) lo hizo módulo suelto del ECP, y la V5.60 lo llevó a «BCP ·
// Configuración del Sistema». La aserción de fondo no cambió: UN enlace, su propia ruta, y nadie más la cubre.
const CONSOLA_DE_PLATAFORMAS = "bcp";
const plataformas = links(CONSOLA_DE_PLATAFORMAS).find((l) => l.label === "Manejo de Plataformas");
check("Manejo de Plataformas está en el rail del BCP", !!plataformas);
check("y ES su propia ruta, no un atajo dentro de otro módulo", plataformas?.href === "/bcp/plataformas");
check(
  "vive en el grupo de Configuración del Sistema",
  CONSOLES[CONSOLA_DE_PLATAFORMAS].nav.some((g) => g.label?.includes("Configuración del Sistema") && g.links.some((l) => l === plataformas))
);
check("y su ruta enciende SOLO su propio enlace", activo(CONSOLA_DE_PLATAFORMAS, "/bcp/plataformas") === "/bcp/plataformas");
check(
  "sin que ningún otro enlace del rail la cubra también",
  links(CONSOLA_DE_PLATAFORMAS).filter((l) => enlaceCubre(l, "/bcp/plataformas")).length === 1
);
check("y ninguna otra consola la enlaza", ["ecp", "ocp", "lcp"].every((k) => !links(k).some((l) => l.label === "Manejo de Plataformas")));

// ── Límite de segmento (misma familia que ESTR-3 en el proxy) ────────────────
check(
  "una ruta hermana con prefijo común NO enciende el enlace",
  !enlaceCubre({ href: "/bcp/varietales" }, "/bcp/varietalesx")
);
check("pero la propia ruta sí", enlaceCubre({ href: "/bcp/varietales" }, "/bcp/varietales"));
check("y sus hijas también", enlaceCubre({ href: "/bcp/varietales" }, "/bcp/varietales/algo"));

// ── `exact` sigue significando exacto ────────────────────────────────────────
check("el Panel (exact) no se enciende en una subruta", activo("ecp", "/ecp/transcripciones") !== "/ecp");
// La LCP (V5.59) es la primera consola con un grupo ANIDADO (`/lcp/crm/…`) sin página en `/lcp/crm`:
// cada CRM enciende el suyo, ninguno enciende a un hermano, y el Panel no se enciende con ellos.
check("LCP: un CRM enciende solo su enlace", activo("lcp", "/lcp/crm/green") === "/lcp/crm/green");
check("LCP: y no el de un hermano", !enlaceCubre({ href: "/lcp/crm/x" }, "/lcp/crm/green"));
check("LCP: el Panel (exact) no se enciende en un CRM", activo("lcp", "/lcp/crm/caas") !== "/lcp");
check("LCP: el filtro de la lista de espera no apaga su enlace", activo("lcp", "/lcp/lista-espera") === "/lcp/lista-espera");
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
