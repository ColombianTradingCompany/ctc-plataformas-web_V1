// Guardián de la Ficha Técnica y el pop-up de Finca en el TELÉFONO
// (tanda de retroalimentación del owner, 2026-08-20).
//
//   node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/qa-kr-ficha-check.mjs
//
// EL FALLO QUE LO TRAE, y por qué merece guardián: los FABs («Ayuda» y «Guardar
// Ficha») estaban `position:fixed` en la esquina inferior derecha del viewport.
// La barra de acciones pegajosa pone sus botones EN ESA MISMA ESQUINA. En un
// teléfono se posaban justo encima de «Completar FT2 y continuar»: el productor
// tocaba el FAB creyendo tocar el botón, la etapa no avanzaba, y el defecto se
// reportó como «la FT2 tiene un impasse que bloquea la continuación».
//
// No era un impasse. Era un botón tapado. Y no lo cantaba nada: ni tsc, ni
// eslint, ni el build — dos elementos posicionados que se solapan son CSS
// perfectamente válido.
//
// LO QUE PROTEGE:
//   1. Que ningún FAB de estas dos superficies vuelva a ser `position:fixed`.
//      Es la causa raíz; cualquier otra aserción sobre el síntoma se puede
//      satisfacer sin arreglarla.
//   2. Que los FABs sigan RENDERIZÁNDOSE dentro de su contenedor anclado. Si
//      alguien los saca de ahí, el CSS deja de sujetarlos aunque la regla siga
//      escrita.
//   3. Que la fila de acciones pueda envolver. Sin `flex-wrap` no baja de su
//      ancho de contenido y el botón que se sale por la derecha es el principal.
//   4. Que toda clase de CSS module que se usa EXISTA (la trampa de la V4.30:
//      una clase inexistente sale `undefined` y el elemento se pinta desnudo,
//      en silencio). PaneA3 estrenó `.noteBox` en FichaView.module.css, donde
//      no existía — este chequeo lo habría cazado antes de mirar la pantalla.
//   5. La aritmética de la granulometría, en los DOS sentidos. El aviso viejo
//      solo podía detectar pasarse: como el Residuo absorbe la diferencia, la
//      suma daba 100,0 % siempre que las mallas pesaran de menos. Pesar una y
//      olvidar las otras cinco salía «impecable».

import { readFileSync } from "node:fs";
import { computeMesh } from "../src/components/kaffetal-regal/ficha/fichaCalculations.ts";

let ok = 0;
const fallos = [];
const check = (n, c) => (c ? ok++ : fallos.push(n));
const lee = (r) => readFileSync(new URL(`../${r}`, import.meta.url), "utf8");

// ── 1-3. Los FABs no vuelven a la esquina del viewport ─────────────────────
{
  const casos = [
    {
      css: "src/components/kaffetal-regal/FichaView.module.css",
      tsx: "src/components/kaffetal-regal/FichaView.tsx",
      contenedor: "fabStack",
    },
    {
      css: "src/components/kaffetal-regal/FincaModal.module.css",
      tsx: "src/components/kaffetal-regal/FincaModal.tsx",
      contenedor: "fabDock",
    },
  ];
  for (const { css, tsx, contenedor } of casos) {
    const hoja = lee(css);
    // La regla de cada FAB, aislada, para no confundirla con otra declaración
    // del archivo (el `.flash`, por ejemplo, sí es fixed y debe seguir siéndolo).
    for (const clase of ["fab", "fabHelp", "helpBox"]) {
      const m = hoja.match(new RegExp(`^\\.${clase}\\{([^}]*)\\}`, "m"));
      check(`${css}: existe la regla .${clase}`, !!m);
      if (m) check(`${css}: .${clase} NO es position:fixed`, !/position:\s*fixed/.test(m[1]));
    }
    const fuente = lee(tsx);
    check(`${css}: define el contenedor .${contenedor}`, new RegExp(`^\\.${contenedor}\\{`, "m").test(hoja));
    check(`${tsx}: los FABs se pintan dentro de .${contenedor}`, fuente.includes(`styles.${contenedor}`));
    // El contenedor tiene que estar ANCLADO a algo, no suelto.
    const reglaCont = hoja.match(new RegExp(`^\\.${contenedor}\\{([\\s\\S]*?)\\}`, "m"));
    check(
      `${css}: .${contenedor} está anclado (absolute o sticky), no fixed`,
      !!reglaCont && /position:\s*(absolute|sticky)/.test(reglaCont[1]) && !/position:\s*fixed/.test(reglaCont[1])
    );
  }

  const fv = lee("src/components/kaffetal-regal/FichaView.module.css");
  const csvRow = fv.match(/^\.csvRow\{([^}]*)\}/m);
  check("FichaView: la fila de acciones existe", !!csvRow);
  check("FichaView: y puede envolver (flex-wrap)", !!csvRow && /flex-wrap:\s*wrap/.test(csvRow[1]));
}

// ── 4. Ninguna clase de CSS module usada se quedó sin definir ──────────────
// (la trampa de la V4.30, aplicada a los archivos que esta tanda tocó)
{
  const pares = [
    ["src/components/kaffetal-regal/FichaView.tsx", { styles: "src/components/kaffetal-regal/FichaView.module.css" }],
    ["src/components/kaffetal-regal/FincaModal.tsx", { styles: "src/components/kaffetal-regal/FincaModal.module.css" }],
    [
      "src/components/kaffetal-regal/ficha/panes/PaneB3.tsx",
      {
        styles: "src/components/kaffetal-regal/FichaView.module.css",
        bstyles: "src/components/kaffetal-regal/ficha/panes/PaneB3.module.css",
      },
    ],
    ["src/components/kaffetal-regal/ficha/panes/PaneA3.tsx", { styles: "src/components/kaffetal-regal/FichaView.module.css" }],
    ["src/components/kaffetal-regal/ficha/panes/PaneB1.tsx", {
      styles: "src/components/kaffetal-regal/FichaView.module.css",
      vstyles: "src/components/kaffetal-regal/ficha/panes/PaneB1.module.css",
    }],
  ];
  for (const [tsx, alias] of pares) {
    const src = lee(tsx).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    for (const [nombre, hojaRuta] of Object.entries(alias)) {
      const definidas = new Set([...lee(hojaRuta).matchAll(/^\.([a-zA-Z][\w-]*)/gm)].map((m) => m[1]));
      for (const m of src.matchAll(new RegExp(`\\b${nombre}\\.([a-zA-Z][\\w]*)`, "g"))) {
        check(`${tsx}: «${nombre}.${m[1]}» existe en ${hojaRuta.split("/").pop()}`, definidas.has(m[1]));
      }
    }
  }
}

// ── 5. Objetivos táctiles y anchura de los pop-up de consola ───────────────
{
  const g = lee("src/app/globals.css");
  check("globals: hay un bloque para punteros gruesos (dedos)", /@media\s*\(pointer:\s*coarse\)/.test(g));
  const coarse = g.slice(g.indexOf("@media (pointer: coarse)"));
  check("globals: .btn-sm alcanza el objetivo táctil de 44 px", /\.btn-sm\{[^}]*min-height:\s*44px/.test(coarse));
  check("globals: las casillas crecen con el dedo", /input\[type=checkbox\][^{]*\{[^}]*width:\s*22px/.test(coarse));
  check("globals: existe el pop-up ancho de revisión", /^\.modal-wide\{/m.test(g));

  // Y que las consolas lo USEN: definirla sin aplicarla no ensancha nada.
  for (const ruta of [
    "src/app/ocp/(app)/fincas/FincaModalRow.tsx",
    "src/app/ocp/(app)/arena/ArenaBoardClient.tsx",
    "src/app/ocp/(app)/nominados/NominadosClient.tsx",
  ]) {
    const src = lee(ruta);
    check(`${ruta}: usa modal-wide`, src.includes('"modal modal-wide"'));
    check(`${ruta}: y ya no fija un ancho a mano`, !/className="modal"\s+style=\{\{\s*maxWidth/.test(src));
  }
}

// ── 6. La granulometría avisa en LOS DOS sentidos ──────────────────────────
{
  const vacio = { mesh_supremo_plus: "", mesh_supremo: "", mesh_extra: "", mesh_europa: "", mesh_ugq: "", mesh_peaberry: "", mesh_residue: "" };
  const sano = 200; // gramos de grano sano

  check("sin grano sano no se juzga nada", computeMesh(vacio, 0).state === "sin_base");
  check("con grano sano y ninguna malla pesada: vacío", computeMesh(vacio, sano).state === "vacio");

  // EL CASO DEL DEFECTO: una sola malla pesada, cinco olvidadas. Antes esto
  // daba «Suma de mallas: 100,0 %» y se veía perfecto.
  const unaSola = computeMesh({ ...vacio, mesh_europa: "50" }, sano);
  check("una malla de seis ⇒ se avisa que faltan mallas", unaSola.state === "residuo_alto");
  check("y se dice CUÁNTOS gramos faltan por repartir", unaSola.pendingGrams === 150);
  check("el total seguía diciendo 100 % — por eso no bastaba", Math.round(unaSola.totalPct) === 100);

  // Pasarse sigue detectándose.
  const pasado = computeMesh({ ...vacio, mesh_europa: "150", mesh_supremo: "120" }, sano);
  check("mallas por encima del grano sano ⇒ se pasó", pasado.state === "excede");
  check("y se dice en cuánto se pasó", pasado.pendingGrams === -70);

  // Un reparto realista cuadra y no molesta.
  const bien = computeMesh(
    { ...vacio, mesh_supremo_plus: "20", mesh_supremo: "60", mesh_extra: "55", mesh_europa: "40", mesh_ugq: "15", mesh_peaberry: "5" },
    sano
  );
  check("un reparto completo cuadra", bien.state === "ok");
  check("y el residuo queda en lo que sobra", bien.residueGrams === 5);
  check("con un residuo creíble (≤5 %)", bien.residuePct <= 5);
}

// ── 7. Lo que la compuerta le dice al productor ────────────────────────────
{
  const fv = lee("src/components/kaffetal-regal/FichaView.tsx");
  // Sin comentarios: el propio código CITA el texto viejo para explicar por qué
  // se cambió, y esa cita no es el aviso. Comprobar el archivo en crudo hacía
  // fallar al guardián por su propia documentación.
  const fvCodigo = fv.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  check("el aviso ya no recita la etapa entera", !fvCodigo.includes("Complete A3, A4, B2 y B3"));
  check("hay un mapa de «qué falta» por pane", fv.includes("QUE_FALTA"));
  check("y nombra el índice del pane (A1, B2, …)", /A1 · Identidad/.test(fv) && /B2 · Perfil de Taza/.test(fv));
  check("el aviso respeta los saltos de línea", fv.includes('whiteSpace: "pre-line"'));
}

// ── 8. El canal interno, no el correo ──────────────────────────────────────
{
  const ke = lee("src/components/kaffetal-regal/KaffetalExperience.tsx");
  check("«Solicitar revisión» ya no abre un mailto:", !/mailto:[^`"']*Revisi/.test(ke) && !ke.includes("window.location.href = `mailto:"));
  check("y va por producer_comm_log como el resto", ke.includes("enviarRevisionFinca") && ke.includes("requestFincaHelp"));
  const rp = lee("src/components/kaffetal-regal/RetroalimentacionPanel.tsx");
  check("el hilo llama al productor por su nombre", rp.includes("nombreProductor") && !rp.includes('? "Usted" : "CTC"'));
}

if (fallos.length) {
  console.error(`✗ qa-kr-ficha: ${fallos.length} fallo(s), ${ok} OK\n`);
  for (const f of fallos) console.error("   " + f);
  process.exit(1);
}
console.log(`✓ qa-kr-ficha: ${ok} comprobaciones OK, 0 fallos`);
