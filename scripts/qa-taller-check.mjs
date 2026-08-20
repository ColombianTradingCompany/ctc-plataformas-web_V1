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

// ── 6. TODAS las herramientas vivas llevan el puente (V5.6, owner) ──────────
// mermas-detallada NO está: archivada el 2026-08-15, retirada es retirada.
for (const f of [
  "mermas-rapida", "mermas-ctc", "agtron-dial", "cogs-cafe-verde", "costo-empaque",
  "cool-pdf", "rueda-catacion", "green-coffee-datasheet", "generador-qr",
  "formula-calidad", "viaje-cafe",
  "rueda-del-cafe-v23", "mapa-variedades", // V5.7: la V23 del owner y la herramienta nueva
]) {
  check(`${f} incluye el puente`, lee(`public/tools/${f}.html`).includes('src="/tools/ctc-bridge.js"'));
}

// ── 6b. La segunda pasada del owner: barra, salida y pantalla completa ──────
const barra = lee("src/components/tools/TallerBarra.tsx");
check("la barra del taller tiene salida (signOut)", barra.includes("signOut"));
check("y avisa que salir cierra la identidad única", barra.includes("toda la red"));
check(
  "las tres superficies abren la herramienta a pantalla completa",
  ["src/app/herramientas/taller/[slug]/page.tsx",
   "src/app/kaffetal-regal/herramientas/[slug]/page.tsx",
   "src/app/cherry-picked-green/herramientas/[slug]/page.tsx",
  ].every((f) => lee(f).includes("pantallaCompleta"))
);
// V5.8: el taller es COVER FLOW (la mecánica de Cool PDF) en DOS estantes.
const tallerPage = lee("src/app/herramientas/taller/page.tsx");
check("el taller usa Cover Flow", tallerPage.includes("CoverFlow"));
check("y en dos estantes: abiertas y Plus", tallerPage.includes("Herramientas Plus") && tallerPage.includes("Tus herramientas"));
check("el estado Plus se dice con todas las letras", tallerPage.includes("plusEstado"));
check("el logotipo preside el taller", tallerPage.includes("herramientas-logo.png"));

const flow = lee("src/components/tools/CoverFlow.tsx");
check("la ficha distingue «activa en tu cuenta» de «se solicita»", flow.includes("ACTIVA en tu cuenta"));
check(
  "las constantes son las de Cool PDF (54deg, 170, .14, .38)",
  flow.includes("* 54") && flow.includes("170") && flow.includes("0.14") && flow.includes("0.38")
);
check("se conduce con teclado", flow.includes("ArrowRight") && flow.includes("ArrowLeft"));

// V5.8: la cinta fina y su rueda dentada
const cinta = lee("src/components/tools/BarraHerramienta.tsx");
check("la cinta lleva rueda dentada con menú", cinta.includes('aria-haspopup="menu"'));
check("la rueda esconde Mi Red", cinta.includes("Mi Red"));
check("y la salida", cinta.includes("signOut"));
check("«Mis trabajos» viaja por evento a la concha", cinta.includes("ctc:mis-trabajos"));
check(
  "la concha NO repite cabecera en pantalla completa",
  lee("src/components/tools/ConchaHerramienta.tsx").includes("{!pantallaCompleta && (")
);
check(
  "la sesión escucha el evento de la rueda",
  lee("src/components/tools/SesionHerramienta.tsx").includes('window.addEventListener("ctc:mis-trabajos"')
);

// V5.8: «Obtener Herramientas Plus» — explica ANTES de pedir
const obtener = lee("src/components/tools/ObtenerPlus.tsx");
check("el botón Plus explica antes de mandar", obtener.includes("¿Qué son las Herramientas Plus?"));
check("y mandar es un segundo gesto", obtener.includes("Enviar solicitud"));
const accionPlus = lee("src/lib/tools/solicitarPlus.ts");
check("la solicitud general NO inventa tabla", accionPlus.includes("tool_access_requests"));
check("y no pide lo que la cuenta ya abre", accionPlus.includes("puedeAbrir(ctx, t.id"));

// V5.8: los logotipos de la superficie
check("el logotipo corona la puerta", lee("src/app/herramientas/acceso/AccesoTaller.tsx").includes("herramientas-logo.png"));
check("y preside el hero de la landing", lee("src/components/services/HerramientasLanding.tsx").includes("heroMarca"));
check(
  "el acordeon de la guia va CERRADO por defecto (convencion de la casa)",
  lee("src/components/tools/SesionHerramienta.tsx").includes("<details className={styles.menuGuia}>") &&
    !lee("src/components/tools/SesionHerramienta.tsx").includes("menuGuia} open")
);
check(
  "el puente manda resumen con el estado",
  lee("public/tools/ctc-bridge.js").includes("resumen: resumenDe()")
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
