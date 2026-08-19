// Guardián del TALLER de Herramientas y sus trabajos guardados (A8–A11, V5.4).
//
//   node scripts/qa-taller-check.mjs
//
// Estático a propósito (grep sobre los archivos, sin levantar nada): lo que
// protege son las COSTURAS que un refactor descuidado desharía sin que fallara
// ningún tipo — el filtro de propiedad en cada verbo, la validación de origen
// del puente, y las dos trampas ya pagadas (redirect dentro de un try,
// pathname con %20).

import { readFileSync } from "node:fs";

let ok = 0;
const fallos = [];
const check = (n, c) => (c ? ok++ : fallos.push(n));
const lee = (r) => readFileSync(new URL(`../${r}`, import.meta.url), "utf8");

// ── 1. Los verbos de trabajos: propiedad en CADA consulta ───────────────────
const trabajos = lee("src/lib/tools/trabajos.ts");
check("trabajos: es server action", trabajos.includes('"use server"'));
check(
  "cada verbo pasa por usuarioYVeredicto (sesión + acceso a la herramienta)",
  (trabajos.match(/await usuarioYVeredicto\(/g) ?? []).length >= 5
);
check(
  "toda lectura/escritura de tool_sessions filtra por user_id",
  (trabajos.match(/\.eq\("user_id", r\.user\.id\)/g) ?? []).length >= 5
);
check("el estado tiene techo de tamaño", trabajos.includes("MAX_ESTADO_BYTES"));
check("hay techo de trabajos por herramienta", trabajos.includes("MAX_TRABAJOS_POR_HERRAMIENTA"));
check(
  "los eventos de herramienta salen por el dominio de plataforma",
  trabajos.includes('dominio: "it_plataforma"')
);
check(
  "una herramienta sin puente no ofrece trabajos",
  trabajos.includes("soporta_memoria") && trabajos.includes("no guarda trabajos")
);

// ── 2. El puente: inerte fuera de la concha, sordo a extraños ───────────────
const puente = lee("public/tools/ctc-bridge.js");
check("el puente se anuncia (ready)", puente.includes('ctc: "ready"'));
check("solo obedece init de SU parent", puente.includes("e.source !== window.parent"));
check("jamás captura contraseñas ni archivos", (puente.match(/password/g) ?? []).length >= 2);
check("manda la foto completa con debounce", puente.includes("setTimeout(mandarEstado"));
check("expone CTC.emitir hacia el ecosistema", puente.includes("emitir: function"));

// ── 3. La concha: valida fuente Y origen, habla con origen explícito ────────
const sesion = lee("src/components/tools/SesionHerramienta.tsx");
check("la concha valida el source del mensaje", sesion.includes("e.source !== marco.contentWindow"));
check("la concha valida el origin del mensaje", sesion.includes("e.origin !== window.location.origin"));
check(
  "y al iframe le habla con origen explícito, nunca *",
  sesion.includes("window.location.origin\n        );") || /postMessage\([\s\S]{0,200}?window\.location\.origin\s*\)/.test(sesion)
);
check("cambiar de trabajo reinicia el iframe (key)", sesion.includes("key={enTrabajo ? modo.trabajoId"));

// ── 4. La superficie propia y sus puertas ───────────────────────────────────
const volver = lee("src/lib/tools/volverSeguro.ts");
check("la superficie herramientas existe en INICIO", volver.includes('herramientas: "/herramientas"'));

const taller = lee("src/app/herramientas/taller/page.tsx");
check("el taller manda a la puerta sin sesión", taller.includes('redirect("/herramientas/acceso")'));

const acceso = lee("src/app/herramientas/acceso/page.tsx");
check(
  "el redirect de acceso vive FUERA del try (NEXT_REDIRECT se lanza)",
  acceso.includes("conSesion") && acceso.includes('if (conSesion) redirect("/herramientas/taller")')
);

// ── 4b. El camino Google: callback propio, sin promover a nadie ─────────────
const callback = lee("src/app/herramientas/auth/callback/route.ts");
check("el callback canjea el código por la sesión", callback.includes("exchangeCodeForSession"));
check("y NO promueve roles (entrar por Herramientas solo identifica)", !callback.includes("promoteFreshBuyer"));
check("sin código o con error, de vuelta a la puerta", (callback.match(/herramientas\/acceso/g) ?? []).length >= 2);
const accesoTaller = lee("src/app/herramientas/acceso/AccesoTaller.tsx");
check("el botón de Google apunta al callback de ESTA superficie", accesoTaller.includes("/herramientas/auth/callback"));

// ── 5. La landing ya no abre herramientas: enseña y manda al taller ─────────
const landing = lee("src/components/services/HerramientasLanding.tsx");
check("la landing monta el carrusel", landing.includes("CarruselHerramientas"));
check("la landing NO embebe el ToolPanel", !landing.includes("ToolPanel"));

const carrusel = lee("src/components/services/CarruselHerramientas.tsx");
check("el carrusel respeta prefers-reduced-motion", carrusel.includes("prefers-reduced-motion"));
check("una captura ausente cae a tarjeta, no a hueco", carrusel.includes("onError"));

// ── 6. La herramienta de referencia lleva el puente ─────────────────────────
check(
  "costo-empaque incluye /tools/ctc-bridge.js",
  lee("public/tools/costo-empaque.html").includes('src="/tools/ctc-bridge.js"')
);

// ── 7. La trampa del %20, pagada una vez ────────────────────────────────────
check(
  "build-tool-shots usa fileURLToPath, no pathname",
  lee("scripts/build-tool-shots.mjs").includes("fileURLToPath")
);

if (fallos.length) {
  console.error(`✗ qa-taller: ${fallos.length} fallo(s):`);
  for (const f of fallos) console.error(`  · ${f}`);
  process.exit(1);
}
console.log(`✓ qa-taller: ${ok} comprobaciones OK, 0 fallos`);
