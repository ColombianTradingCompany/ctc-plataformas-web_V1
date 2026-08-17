// Guardián del «Active Catalogue Sneak Peek».
//
//   node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/qa-sneak-peek-check.mjs
//
// Vigila las dos promesas del módulo, que son promesas de NEGOCIO y no de estilo:
//   1. Que por la cinta no pueda salir NADA comercial. La cinta se enseña sin
//      sesión en seis superficies; el día que alguien añada un precio «solo para
//      la tarjeta», esto falla.
//   2. Que los lotes mock estén marcados y se puedan retirar de un tirón —
//      rotulados como temporada anterior, con id del espacio reservado, en UN
//      solo archivo y con el grado que su puntaje manda (su origen, Notion, tiene
//      el grado mal en 6 de 7 fichas: ver docs/V5_CONSOLAS_PLAN.md §9).
//
// No levanta la aplicación ni toca la base: son comprobaciones sobre los datos
// reales del módulo y sobre el texto de los archivos que lo montan. Mismo patrón
// que `qa-nav-check.mjs`, por el mismo motivo — lo que hay que proteger es una
// regla, y una regla se comprueba aquí y no a ojo.

import { readFileSync } from "node:fs";
import { SNEAK_PEEK_MOCK, MOCK_ID_PREFIX } from "../src/lib/catalogo/sneakPeekMock.ts";
import { gradoPorPuntaje } from "../src/lib/grados/definicion.ts";

let ok = 0;
const fallos = [];
const check = (nombre, cond) => (cond ? ok++ : fallos.push(nombre));

const lee = (ruta) => readFileSync(new URL(`../${ruta}`, import.meta.url), "utf8");

const LIB = lee("src/lib/catalogo/sneakPeek.ts");
const MOCK_SRC = lee("src/lib/catalogo/sneakPeekMock.ts");
const RUTA_API = lee("src/app/api/catalogo/sneak-peek/route.ts");
const COMPONENTE = lee("src/components/catalogo/SneakPeek.tsx");
const TIENDA = lee("src/components/cherry-picked/CherryPickedExperience.tsx");

// ── 1. Nada comercial en el tipo que viaja al navegador ──────────────────────
// La garantía es estructural: si el tipo no tiene dónde meter un precio, no hay
// descuido posible. Se mira el bloque del tipo, no todo el archivo (los
// comentarios NOMBRAN esos campos justamente para explicar que están fuera).
const bloqueTipo = LIB.slice(LIB.indexOf("export type SneakPeekLot = {"), LIB.indexOf("export type SneakPeekPayload"));
const PROHIBIDOS = [
  "price",
  "precio",
  "moq",
  "unit_kg",
  "unitKg",
  "total_kg",
  "totalKg",
  "sold",
  "deposit",
  "anticipo",
  "arrival",
  "transparency",
  "eur",
  "cop",
];
for (const campo of PROHIBIDOS) {
  check(
    `el tipo SneakPeekLot no declara «${campo}»`,
    !new RegExp(`^\\s*${campo}[?]?\\s*:`, "im").test(bloqueTipo)
  );
}

// ── 2. Solo lee la vista pública estrecha ────────────────────────────────────
check("la librería lee `public_lot_catalog`", LIB.includes('.from("public_lot_catalog")'));
check(
  "no lee `lots` ni `fincas` directamente",
  !LIB.includes('.from("lots")') && !LIB.includes('.from("fincas")')
);
check(
  "de `lot_listings` solo saca el id de lo publicado (nunca precio ni kilos)",
  LIB.includes('.from("lot_listings").select("lot_id").eq("status", "published")')
);
// Se busca la LECTURA, no la palabra: el archivo nombra esa vista en un
// comentario justamente para explicar que se queda fuera.
check("no lee la vista de precios de transparencia", !LIB.includes('.from("public_transparency_pricing")'));
check("usa el cliente anónimo y sin cookies", LIB.includes("createEphemeralClient"));
check("Tyrian queda fuera del teaser (es solo de subasta)", LIB.includes('=== "tyrian"'));

// ── 3. La ruta pública ───────────────────────────────────────────────────────
check("la ruta sirve el payload de la librería", RUTA_API.includes("getSneakPeekPayload"));
check("la ruta no se congela en el build", RUTA_API.includes('export const dynamic = "force-dynamic"'));
check("la ruta cachea en el CDN", /s-maxage=\d+/.test(RUTA_API));

// ── 4. El componente no se cae solo y respeta el movimiento reducido ─────────
check("si la petición falla, la cinta no se dibuja", COMPONENTE.includes("if (failed) return null"));
check(
  "una cinta vacía tampoco se dibuja",
  COMPONENTE.includes("data.lots.length === 0") && COMPONENTE.includes("return null")
);
const CSS = lee("src/components/catalogo/SneakPeek.module.css");
check("respeta prefers-reduced-motion", CSS.includes("prefers-reduced-motion"));
check("se pausa al pasar el ratón o al recibir el foco", CSS.includes(":hover") && CSS.includes(":focus-within"));

// ── 5. Los mock: marcados, rotulados y retirables ───────────────────────────
check("hay exactamente 7 lotes mock", SNEAK_PEEK_MOCK.length === 7);
check(
  "todos llevan `mock: true`",
  SNEAK_PEEK_MOCK.every((l) => l.mock === true)
);
check(
  "todos tienen id del espacio reservado",
  SNEAK_PEEK_MOCK.every((l) => l.id.startsWith(MOCK_ID_PREFIX))
);
check(
  "ninguno repite id",
  new Set(SNEAK_PEEK_MOCK.map((l) => l.id)).size === SNEAK_PEEK_MOCK.length
);
check(
  "todos rotulan la temporada en los tres idiomas",
  SNEAK_PEEK_MOCK.every((l) => ["es", "en", "de"].every((k) => typeof l.season?.[k] === "string" && l.season[k].length > 3))
);
check(
  "el rótulo dice que son de la temporada ANTERIOR",
  SNEAK_PEEK_MOCK.every((l) => /anterior|last season|vorsaison/i.test(l.season.es + l.season.en + l.season.de))
);
check(
  "ninguno es Tyrian",
  SNEAK_PEEK_MOCK.every((l) => l.grade !== "tyrian")
);
// El grado tiene que ser el que el puntaje manda (regla 1 de grados/definicion).
for (const l of SNEAK_PEEK_MOCK) {
  const esperado = gradoPorPuntaje(Number(l.score));
  check(
    `${l.id}: grado «${l.grade}» coherente con el puntaje ${l.score} (${esperado?.id ?? "sin grado"})`,
    esperado?.id === l.grade
  );
}
check(
  "cada mock tiene lo mínimo para una tarjeta honesta",
  SNEAK_PEEK_MOCK.every(
    (l) => l.name && l.code && l.finca && l.departamento && l.variety && l.process && l.cup && l.score
  )
);
check(
  "las notas de cata caben en la tarjeta (<= 95 caracteres)",
  SNEAK_PEEK_MOCK.every((l) => l.cup.length <= 95)
);
check(
  "el archivo de mock lleva la receta de retirada en su cabecera",
  MOCK_SRC.includes("CÓMO SE RETIRA")
);
check(
  "el relleno con mock se retira solo al haber 7 lotes vivos",
  LIB.includes("SNEAK_PEEK_CARDS - vivos.length")
);

// Un solo sitio con datos mock: si mañana alguien los copia a otro archivo, esto
// falla y la retirada de un tirón sigue siendo posible.
const OTROS = [
  ["src/lib/catalogo/sneakPeek.ts", LIB],
  ["src/app/api/catalogo/sneak-peek/route.ts", RUTA_API],
  ["src/components/catalogo/SneakPeek.tsx", COMPONENTE],
  ["src/components/cherry-picked/CherryPickedExperience.tsx", TIENDA],
];
for (const [ruta, texto] of OTROS) {
  // Un literal ENTRECOMILLADO es dato; la misma cadena en un comentario es
  // documentación (y varios de estos archivos explican el espacio de ids).
  // Comilla simple o doble, no tilde invertida: en los comentarios de este
  // repo el estilo JSDoc usa `así` para nombrar cosas, y eso no es un dato.
  check(`${ruta} no contiene datos mock («mock-lote» entrecomillado)`, !/["']mock-lote/.test(texto));
}

// ── 6. La compuerta del catálogo en la tienda (decisión D0.5) ────────────────
// El catálogo completo solo con sesión: `loadCatalog()` no puede volver a
// correr para un visitante anónimo.
// El efecto de arranque es el que decide qué ve un visitante: dentro de él,
// la petición del catálogo tiene que ir DESPUÉS de la guarda que exige sesión.
// (Hay una tercera llamada, al refrescar tras un pedido, que por definición ya
// es de alguien con sesión — de ahí que se mire el orden y no el número.)
const efecto = TIENDA.slice(TIENDA.indexOf("supabase.auth.getSession()"), TIENDA.indexOf("onAuthStateChange"));
const guarda = efecto.indexOf("if (!data.session?.user) return;");
const carga = efecto.indexOf("loadCatalog()");
check("el efecto de arranque tiene la guarda de sesión", guarda !== -1);
check("`loadCatalog()` va después de la guarda, nunca antes", carga !== -1 && carga > guarda);
check(
  "la parrilla (Grados/Black) se pinta solo con sesión",
  /\{userId \? \(\s*<>\s*<GradosSection/.test(TIENDA)
);
check("el visitante recibe la cinta en ese sitio", TIENDA.includes("<SneakPeek"));
check("la cinta hereda el ancla `grados` de la parrilla", TIENDA.includes('id="grados"'));
check("al cerrar sesión se vacían los lotes", TIENDA.includes("setLots([])"));
check(
  "sin sesión el índice no ofrece la sección Black, que no existe",
  TIENDA.includes('t.quickNav.filter((s) => s.id !== "black")')
);

console.log(`${ok} comprobaciones OK, ${fallos.length} fallos`);
for (const f of fallos) console.log("  FALLO:", f);
process.exit(fallos.length ? 1 : 0);
