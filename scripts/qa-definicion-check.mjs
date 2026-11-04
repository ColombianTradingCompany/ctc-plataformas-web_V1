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
import {
  contextoComoMarkdown, nombreDeArchivo, unidadValida, textoDeCasilla, fechaUtc, SIN_RESPONDER,
} from "../src/lib/direccionamiento/markdown.ts";
import { textoMemoria } from "../src/lib/direccionamiento/memoria.ts";

let ok = 0;
const fallos = [];
const check = (n, c) => (c ? ok++ : fallos.push(n));
const lee = (r) => readFileSync(new URL(`../${r}`, import.meta.url), "utf8");
const sinComentariosExport = (t) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

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

// ── 6. Exportar como Markdown (TAR-122) ───────────────────────────────────
// El archivo sale de la consola y se sube a un proyecto de Claude: tiene que traer TODAS las casillas en el orden de
// `definicion.ts`, ser el mismo para la misma entrada, no traer quién editó y no romperse con lo que el equipo escriba.
{
  const valores = {
    [claveGeneral("tono")]: "Claro y conciso.\r\n# no es un título",
    [claveDe("kr", "producto", "promesa")]: "  Su nombre llega a la taza.  ",
    [claveDe("chp", "cliente", "duele")]: "   ",
    updated_by: "00000000-0000-0000-0000-000000000000",
    "ctcx|producto|objetivo": 42,
  };
  const entrada = { values: valores, actualizadoEl: "2026-10-05T14:03:09.000Z", exportadoEl: "2026-11-05T06:30:00.000Z" };
  const md = contextoComoMarkdown(entrada);
  check("export · determinista: misma entrada, mismo archivo", md === contextoComoMarkdown(entrada));
  check("export · no lee el reloj (las fechas son las de la entrada)", md.includes("2026-10-05 14:03 UTC") && md.includes("2026-11-05 06:30 UTC"));
  check("export · una fecha ilegible no inventa nada", fechaUtc("no-es-fecha") === "—" && fechaUtc(null) === "—");
  // El orden de las secciones es el de definicion.ts: generales, las cuatro unidades, la memoria.
  const marcas = [
    "## Generales",
    ...GENERALES.map((c) => `### ${c.label}`),
    ...UNIDADES.flatMap((u) => [`## ${u.code} · ${u.name}`, ...PREGUNTAS.flatMap((p) => [`### ${p.titulo} — ${p.pregunta}`, ...p.campos.map((c) => `#### ${c.label}`)])]),
    "## Memoria del sistema · Grados de Calidad CTC",
  ];
  let desde = 0, enOrden = true;
  for (const m of marcas) { const i = md.indexOf(m, desde); if (i < 0) { enOrden = false; break; } desde = i + m.length; }
  check("export · todas las casillas, en el orden de definicion.ts", enOrden);
  const casillas = GENERALES.length + UNIDADES.length * PREGUNTAS.reduce((n, p) => n + p.campos.length, 0);
  check("export · una casilla vacía, en blanco o que no es texto dice «sin responder»",
    // dos casillas tienen texto; la cabecera del archivo nombra el marcador una vez para explicarlo
    md.split(SIN_RESPONDER).length - 1 === casillas - 2 + 1);
  check("export · el texto se recorta y conserva", md.includes("\nSu nombre llega a la taza.\n"));
  check("export · un «#» al empezar una línea no abre un título nuevo", md.includes("\n\\# no es un título") && !md.includes("\n# no es un título"));
  check("export · sin \\r", !md.includes("\r"));
  check("export · no lleva quién editó ni claves que no son casillas", !md.includes("00000000-0000") && !/updated_by/.test(md) && !md.includes("42"));
  check("export · lleva la memoria del sistema tal cual la recibe la redacción", md.includes(textoMemoria()));
  check("export · textoDeCasilla no toca el texto normal", textoDeCasilla("a\n\nb") === "a\n\nb");
  // ?unidad= es lista blanca: un id de UNIDADES o nada.
  check("export · unidadValida acepta los cuatro ids", UNIDADES.every((u) => unidadValida(u.id) === u.id));
  check("export · unidadValida rechaza lo demás", [null, undefined, "", "KR", "kr ", "general", "../x"].every((x) => unidadValida(x) === null));
  const soloKr = contextoComoMarkdown({ ...entrada, unidad: "kr" });
  check("export · ?unidad=kr trae KR, los generales y la memoria, y ninguna otra unidad",
    soloKr.includes("## KR · Kaffetal Regal") && soloKr.includes("## Generales") && soloKr.includes("## Memoria del sistema")
      && UNIDADES.filter((u) => u.id !== "kr").every((u) => !soloKr.includes(`## ${u.code} · ${u.name}`)));
  check("export · nombre de archivo con la fecha de exportación", nombreDeArchivo("2026-11-05T06:30:00.000Z") === "ctcx-definicion-de-contexto-2026-11-05.md"
    && nombreDeArchivo("2026-11-05T06:30:00.000Z", "kr") === "ctcx-definicion-de-contexto-kr-2026-11-05.md");
  check("export · el módulo es puro (no lee el reloj ni el servidor)", (() => {
    const t = sinComentariosExport(lee("src/lib/direccionamiento/markdown.ts"));
    return !/new Date\(\)|Date\.now|server-only|supabase|process\.env/.test(t);
  })());

  const ruta = lee("src/app/ecp/(app)/direccionamiento/exportar/route.ts");
  check("export · la ruta pone la puerta de lectura del ECP antes de leer", /await requireConsoleAccess\("ecp"\);[\s\S]*from\("direccionamiento_context"\)/.test(ruta));
  check("export · la ruta valida ?unidad= con la lista blanca y responde 400 a lo demás", ruta.includes("unidadValida(") && ruta.includes("status: 400"));
  check("export · descarga .md privada y sin caché", ruta.includes('"text/markdown; charset=utf-8"') && ruta.includes("attachment; filename=") && ruta.includes("private, no-store"));
  check("export · la ruta no selecciona quién editó", !/updated_by/.test(ruta));
  const comp = lee("src/components/panel/direccionamiento/DefinicionDeContexto.tsx");
  check("export · el botón «Exportar como Markdown» guarda antes y descarga de la ruta",
    comp.includes("Exportar como Markdown") && /await guarda\(values\)[\s\S]*\/ecp\/direccionamiento\/exportar/.test(comp));
}

if (fallos.length) {
  console.error(`✗ qa-definicion: ${fallos.length} fallo(s), ${ok} OK\n`);
  for (const f of fallos) console.error("   " + f);
  process.exit(1);
}
console.log(`✓ qa-definicion: ${ok} comprobaciones OK, 0 fallos`);
