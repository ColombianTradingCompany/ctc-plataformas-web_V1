// Guardián de «Definición de contexto» tras el rework de F7 (V4.32).
//
//   node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/qa-definicion-check.mjs
//
// Lo que protege NO es el formulario: es que las CLAVES con las que se guarda
// sigan casando con las que ya están escritas en la base. Renombrar un `id` de
// campo aquí deja su texto huérfano —la clave deja de casar, el campo sale
// vacío— y **no falla nada**: ni tsc, ni eslint, ni el build. El owner
// simplemente abriría la pantalla y encontraría en blanco algo que escribió.
//
// Los 15 campos que sobrevivieron al rework están listados abajo tal y como
// quedaron en la base tras la migración `definicion_contexto_rework_lift_answers`.
// El respaldo de los 20 originales: docs/archive/direccionamiento_context_2026-08-18.json

import { readFileSync } from "node:fs";
import {
  UNIDADES, PREGUNTAS, GENERALES, claveDe, claveGeneral, avanceDeUnidad,
} from "../src/lib/direccionamiento/definicion.ts";

let ok = 0;
const fallos = [];
const check = (n, c) => (c ? ok++ : fallos.push(n));
const lee = (r) => readFileSync(new URL(`../${r}`, import.meta.url), "utf8");

// ── 1. Las cuatro unidades, con Value Ecosystem entre ellas (F7) ───────────
check("hay cuatro unidades", UNIDADES.length === 4);
for (const id of ["ctcx", "kr", "chp", "ecosistema"]) {
  check(`la unidad ${id} existe`, UNIDADES.some((u) => u.id === id));
}
check("las tres preguntas son Producto · Cliente · Contexto",
  PREGUNTAS.map((p) => p.id).join(",") === "producto,cliente,contexto");

// ── 2. Las claves que YA están escritas siguen casando ─────────────────────
// Si una de estas deja de generarse, su texto queda huérfano en silencio.
const ESCRITAS = [
  "general|momento", "general|objetivo", "general|tono",
  "ctcx|cliente|duele", "ctcx|cliente|necesita", "ctcx|cliente|puede",
  "ctcx|cliente|quiere", "ctcx|cliente|relacion",
  "ctcx|producto|objetivo", "ctcx|producto|promesa", "ctcx|producto|cta",
  "ctcx|contexto|resultados", "ctcx|contexto|compartir",
  "ctcx|contexto|ensenar", "ctcx|contexto|identidad",
];
const generadas = new Set([
  ...GENERALES.map((c) => claveGeneral(c.id)),
  ...UNIDADES.flatMap((u) => PREGUNTAS.flatMap((p) => p.campos.map((c) => claveDe(u.id, p.id, c.id)))),
]);
for (const k of ESCRITAS) check(`la clave ya escrita «${k}» sigue teniendo casilla`, generadas.has(k));

// ── 3. El avance cuenta lo que hay, no lo que se declaró ──────────────────
{
  const total = PREGUNTAS.reduce((n, p) => n + p.campos.length, 0);
  check("avanceDeUnidad conoce todos los campos", avanceDeUnidad("ctcx", {}).total === total);
  check("y no cuenta los vacíos", avanceDeUnidad("ctcx", {}).hechos === 0);
  check("ni el espacio en blanco",
    avanceDeUnidad("ctcx", { [claveDe("ctcx", "producto", "cta")]: "   " }).hechos === 0);
  check("pero sí el texto real",
    avanceDeUnidad("ctcx", { [claveDe("ctcx", "producto", "cta")]: "x" }).hechos === 1);
}

// ── 4. Lo que el rework retiró, se quedó retirado ─────────────────────────
{
  // Se mira el CÓDIGO, no la prosa: las cabeceras de esos archivos EXPLICAN qué
  // se retiró, así que nombran «moodboard» y los formatos de vídeo para decir
  // que ya no están. Sin quitar comentarios, el guardián se delata sobre la
  // documentación del propio cambio — pasó igual en qa-crm-interes.
  const sinComentarios = (t) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const def = sinComentarios(lee("src/lib/direccionamiento/definicion.ts"));
  const comp = sinComentarios(lee("src/components/panel/direccionamiento/DefinicionDeContexto.tsx"));
  for (const muerto of ["FORMATS", "DERIVABLES", "moodboard", "corto plus", "corto fast"]) {
    check(`«${muerto}» no volvió a la definición`, !def.includes(muerto));
  }
  check("el módulo vendorizado ya no se importa", !comp.includes("DefinicionDeContexto.jsx"));
  check("la redacción asistida sigue inyectando la memoria del sistema", comp.includes("memory()"));
}

// ── 5. El tope de subida volvió a su sitio ────────────────────────────────
check("next.config.ts ya no levanta bodySizeLimit",
  !lee("next.config.ts").includes("bodySizeLimit"));

if (fallos.length) {
  console.error(`✗ qa-definicion: ${fallos.length} fallo(s), ${ok} OK\n`);
  for (const f of fallos) console.error("   " + f);
  process.exit(1);
}
console.log(`✓ qa-definicion: ${ok} comprobaciones OK, 0 fallos`);
