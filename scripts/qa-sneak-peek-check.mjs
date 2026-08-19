// Guardián del «Active Catalogue Sneak Peek».
//
//   node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/qa-sneak-peek-check.mjs
//
// Vigila las dos promesas del módulo, que son promesas de NEGOCIO y no de estilo:
//   1. Que por la cinta no pueda salir NADA comercial. La cinta se enseña sin
//      sesión en seis superficies; el día que alguien añada un precio «solo para
//      la tarjeta», esto falla.
//   2. Que LAS DEFINICIONES DE LA CASA MANDEN SOBRE LA FUENTE EXTERNA (regla del
//      owner, 2026-08-17): si el dato que viene de Notion contradice lo que
//      define este repo, gana el repo. Hoy eso se traduce en el grado (que sale
//      del puntaje) y en la validez del propio puntaje.
//   3. Que los lotes mock estén marcados y se puedan retirar de un tirón —
//      rotulados como temporada anterior, con id del espacio reservado, en UN
//      solo archivo y con el grado que su puntaje manda (su origen, Notion, tiene
//      el grado mal en 6 de 7 fichas: ver docs/V5_CONSOLAS_PLAN.md §9).
//
// No levanta la aplicación ni toca la base: son comprobaciones sobre los datos
// reales del módulo y sobre el texto de los archivos que lo montan. Mismo patrón
// que `qa-nav-check.mjs`, por el mismo motivo — lo que hay que proteger es una
// regla, y una regla se comprueba aquí y no a ojo.

import { readFileSync, existsSync } from "node:fs";
import { SNEAK_PEEK_MOCK, MOCK_ID_PREFIX } from "../src/lib/catalogo/sneakPeekMock.ts";
import { gradoPorPuntaje, puntajeValido, GRADO_POR_ID } from "../src/lib/grados/definicion.ts";

let ok = 0;
const fallos = [];
const check = (nombre, cond) => (cond ? ok++ : fallos.push(nombre));

const lee = (ruta) => readFileSync(new URL(`../${ruta}`, import.meta.url), "utf8");

const LIB = lee("src/lib/catalogo/sneakPeek.ts");
const MOCK_SRC = lee("src/lib/catalogo/sneakPeekMock.ts");
const RUTA_API = lee("src/app/api/catalogo/sneak-peek/route.ts");
const COMPONENTE = lee("src/components/catalogo/SneakPeek.tsx");
const TIENDA = lee("src/components/cherry-picked/CherryPickedExperience.tsx");
const POPUP = lee("src/components/catalogo/CatalogoPopup.tsx");
const CAAS = lee("src/components/services/CaasLanding.tsx");

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
// La cinta ya NO es una animación CSS (V4.20): con `@keyframes` el navegador
// reinicia la animación al cambiar velocidad o sentido, que era el salto que se
// veía al pasar el ratón por una flecha. Lo que se vigila ahora es el motor.
check("la cinta no vuelve a depender de una animación CSS", !CSS.includes("@keyframes sp-slide"));
check("la mueve un bucle de rAF sobre translate3d", COMPONENTE.includes("requestAnimationFrame") && COMPONENTE.includes("translate3d"));
check("la velocidad se PERSIGUE, no se asigna de golpe", COMPONENTE.includes("velRef.current +="));

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

// ── 7. Las definiciones de la casa mandan sobre la fuente externa ───────────
// Regla del owner (2026-08-17): si Notion contradice una definición del repo,
// gana el repo. Lo del grado ya se comprueba arriba; aquí, que el puntaje sea
// válido en la escala (dos decimales como máximo, dentro de 80–100) y que el
// grado exista en la definición única.
for (const l of SNEAK_PEEK_MOCK) {
  check(`${l.id}: el puntaje ${l.score} es válido en la escala`, puntajeValido(Number(l.score)));
  check(`${l.id}: el grado existe en la definición única`, !!GRADO_POR_ID[l.grade]);
}

// ── 8. La tarjeta que se voltea: foto, ficha y accesibilidad ────────────────
for (const l of SNEAK_PEEK_MOCK) {
  check(`${l.id}: declara foto`, typeof l.image === "string" && l.image.startsWith("/images/catalogo/sneak-peek/"));
  check(`${l.id}: la foto existe en el disco`, !!l.image && existsSync(new URL(`../public${l.image}`, import.meta.url)));
  check(`${l.id}: declara ficha técnica`, typeof l.datasheetUrl === "string");
  check(`${l.id}: la ficha existe en el disco`, !!l.datasheetUrl && existsSync(new URL(`../public${l.datasheetUrl}`, import.meta.url)));
  // El proxy antepone la base del subdominio a todo lo que no esté excluido del
  // matcher: una ficha fuera de `docs/` daría 404 en los 18 subdominios.
  check(`${l.id}: la ficha cuelga de /docs/ (excluida del proxy)`, !!l.datasheetUrl && l.datasheetUrl.startsWith("/docs/"));
}
check("la cara delantera es un botón con aria-expanded", COMPONENTE.includes("aria-expanded={volteada}"));
check("Escape cierra la tarjeta abierta", COMPONENTE.includes('e.key === "Escape"'));
check("la cinta se para con una tarjeta abierta", /objetivoVelRef.current = volteada[\s\S]{0,40}\? 0/.test(COMPONENTE));
// El sentido por defecto es hacia la DERECHA (owner, 2026-08-17): velocidad base
// POSITIVA, que es como el motor expresa ese sentido.
check("el sentido por defecto es hacia la derecha", /const BASE = \d+;/.test(COMPONENTE) && !/const BASE = -/.test(COMPONENTE));
check("la copia del bucle no recibe foco", COMPONENTE.includes("tabIndex={duplicada ? -1 : undefined}"));
check("el enlace de la ficha no voltea la tarjeta al pulsarlo", COMPONENTE.includes("e.stopPropagation()"));
check("la ficha se abre en otra pestaña sin ceder la ventana", COMPONENTE.includes('rel="noopener"'));
check("el volteo respeta prefers-reduced-motion", CSS.includes(".inner{transition:none}"));

// ── 9. La rueda de catación en el reverso ───────────────────────────────────
for (const l of SNEAK_PEEK_MOCK) {
  check(`${l.id}: declara rueda`, typeof l.wheel === "string" && l.wheel.includes("rueda-"));
  check(`${l.id}: la rueda existe en el disco`, !!l.wheel && existsSync(new URL(`../public${l.wheel}`, import.meta.url)));
}
check("el reverso pinta la rueda", COMPONENTE.includes("styles.wheelBox"));
// La rueda sale de la herramienta de la casa, no de una segunda rueda paralela.
check(
  "la rueda la genera la herramienta de catación de la casa",
  lee("scripts/build-ruedas-mock.mjs").includes("public/tools/rueda-catacion.html")
);

// ── 10. Las flechas de los extremos ─────────────────────────────────────────
check("hay flecha a cada lado", COMPONENTE.includes("styles.flechaIzq") && COMPONENTE.includes("styles.flechaDer"));
check("aceleran con el ratón Y con el foco", COMPONENTE.includes("onMouseEnter") && COMPONENTE.includes("onFocus"));
check("y sueltan al salir", COMPONENTE.includes("onMouseLeave") && COMPONENTE.includes("onBlur"));
check("la flecha izquierda invierte el sentido", COMPONENTE.includes('impulso === "izq"') && COMPONENTE.includes("-RAPIDO"));

// ── 13. Centrar y crecer al abrir (owner, 2026-08-17) ───────────────────────
check("al pulsar se centra la tarjeta antes de voltearla", COMPONENTE.includes("centrarYVoltear"));
check("el destino se calcula con el centro de la cinta", COMPONENTE.includes("cinta.clientWidth / 2 - centroTarjeta"));
check("se elige la copia más cercana de la tarjeta", COMPONENTE.includes("while (destino - posRef.current > w / 2)"));
check("y se voltea solo AL LLEGAR", COMPONENTE.includes("alLlegarRef.current = () => setVolteada"));
// El envoltorio del bucle no puede pelearse con el centrado: si envuelve
// mientras se persigue un destino, la tarjeta no llega nunca y no se voltea.
check("el bucle no envuelve mientras centra", COMPONENTE.includes("if (destinoRef.current === null) {"));
check("la tarjeta abierta crece un 15 %", CSS.includes(".flipped{transform:scale(1.15)"));
check("y se pone por encima de sus vecinas", /\.flipped\{[^}]*z-index/.test(CSS));

// ── 14. El Análisis Intrínseco de la ficha ──────────────────────────────────
const ANALISIS_SRC = lee("scripts/lib/analisis-intrinseco.mjs");
check("la ficha lleva el análisis intrínseco", lee("scripts/build-fichas-mock.mjs").includes("radarSVG"));
check("son los diez atributos del formulario SCA", (ANALISIS_SRC.match(/clave: "/g) || []).length === 10);
check(
  "y el archivo AVISA de que esos números son inventados por encargo",
  /INVENTADOS, POR ENCARGO/.test(ANALISIS_SRC)
);
check("las flechas llevan rótulo accesible", COMPONENTE.includes("t.flechaAnterior") && COMPONENTE.includes("t.flechaSiguiente"));

// ── 11. La ventana del catálogo ─────────────────────────────────────────────
check("el pie abre la ventana en vez de navegar", COMPONENTE.includes("setPopup(true)"));
check("la ventana explica que el catálogo vive en Cherry Picked", /Cherry Picked/.test(POPUP));
check("y que registrarse es GRATIS", /gratis|free|kostenlos/i.test(POPUP));
check("la ventana está en los tres idiomas", ["es:", "en:", "de:"].every((k) => POPUP.includes(k)));
check("en las superficies CP el botón abre el login sin navegar", POPUP.includes("onOpenLogin"));

// ── 12. La landing de CaaS monta el módulo ──────────────────────────────────
check("CaaS monta la cinta", CAAS.includes("<SneakPeek"));
// Se miden los USOS en el JSX, no la primera aparición del nombre: las claves
// aparecen antes en la declaración del tipo y en los tres diccionarios, así que
// un `indexOf` a secas comparaba con la línea equivocada.
check(
  "y la monta ENTRE «las dos clases» y «Dónde encaja»",
  CAAS.indexOf("{chrome.offerH2}") < CAAS.indexOf("<SneakPeek") &&
    CAAS.indexOf("<SneakPeek") < CAAS.indexOf("{chrome.modelosH2}")
);

// ── 15. Las dos caras, según las maquetas del owner (2026-08-17) ────────────
// CARA: foto con «Ver detalle» encima, nombre, variedad·altitud, notas y el pie
// con el sello del grado frente al puntaje, la finca y el municipio.
check(
  "«Ver detalle» va sobre la foto",
  COMPONENTE.includes("styles.verDetalle") && /\.verDetalle\{\s*position:absolute/.test(CSS)
);
check("la cara lleva el sello del grado a tamaño legible", COMPONENTE.includes("styles.sello") && /\.sello\{width:7\d px?|\.sello\{width:72px/.test(CSS));
check("la cara lleva el puntaje, la finca y el municipio", COMPONENTE.includes("styles.frontFoot") && COMPONENTE.includes("styles.finca"));
check("la cara lleva variedad y altitud", COMPONENTE.includes("lot.variety, lot.altitudeM != null"));
// REVERSO: telaraña, ficha en el medio, rueda al pie.
check("el reverso lleva la telaraña", COMPONENTE.includes("<RadarIntrinseco"));
check("y la ficha centrada entre la telaraña y la rueda", CSS.includes(".ficha{") && CSS.includes("margin:10px auto 4px"));
check("el reverso ya no repite el puntaje ni las notas", !/styles\.scoreRow/.test(COMPONENTE));

// ── 16. Los diez atributos, sin arrastrar `server-only` al navegador ─────────
// ⚠️ Importar un VALOR desde `lib/catalogo/sneakPeek.ts` (que es `server-only`)
// mete Supabase en el paquete del cliente y tumba la página con un 500 que
// `tsc --noEmit` NO ve. Por eso la lista vive en un archivo puro.
const ATRIB_SRC = lee("src/lib/catalogo/atributosSca.ts");
const RADAR_SRC = lee("src/components/catalogo/RadarIntrinseco.tsx");
check(
  "los atributos viven en un archivo SIN server-only",
  !/^\s*import "server-only"/m.test(ATRIB_SRC)
);
check("y son los diez del formulario", (ATRIB_SRC.match(/^  "/gm) || []).length === 10);
check(
  "el radar toma el VALOR del archivo puro, no del módulo server-only",
  RADAR_SRC.includes('from "@/lib/catalogo/atributosSca"') &&
    /import type \{ SneakPeekLang \} from "@\/lib\/catalogo\/sneakPeek"/.test(RADAR_SRC)
);
for (const l of SNEAK_PEEK_MOCK) {
  check(`${l.id}: trae los diez atributos`, !!l.intrinseco && Object.keys(l.intrinseco).length === 10);
  const suma = l.intrinseco ? Object.values(l.intrinseco).reduce((a, b) => a + b, 0) : 0;
  check(`${l.id}: los diez suman su puntaje (${l.score})`, Math.abs(suma - Number(l.score)) < 0.01);
}

// ── D3.1 · la vitrina de un lote comprado en firme (V4.28) ───────────────────
// El owner decidió el 2026-08-18 que un lote que CTC compra sale en las
// tarjetas a nombre de CTC, SIN tocar su finca real. La regla tiene dos mitades
// y las dos se comprueban aquí, porque cada una falla de forma distinta:
//
//   1. Que la vista NO devuelva el nombre de la finca cuando el lote está
//      comprado. `public_lot_catalog` la lee `anon`: si devolviera el nombre y
//      lo tapáramos solo en el componente, cualquiera lo leería por la API.
//   2. Que el rótulo salga de `legal.ts` y no esté escrito a mano en la vista
//      ni en el componente — una segunda definición de la razón social es una
//      contradicción esperando su turno.
{
  const sneak = lee("src/lib/catalogo/sneakPeek.ts");
  const tienda = lee("src/components/cherry-picked/CherryPickedExperience.tsx");

  check(
    "la cinta pide ctc_selection a la vista",
    sneak.includes("ctc_selection")
  );
  check(
    "la tienda pide ctc_selection a la vista",
    tienda.includes("ctc_selection")
  );
  check(
    "el rótulo de CTC sale de legal.ts en la cinta, no escrito a mano",
    sneak.includes("CTC_RAZON") && !/finca:\s*["'`]C(TC|olombian)/.test(sneak)
  );
  check(
    "el rótulo de CTC sale de legal.ts en la tienda, no escrito a mano",
    tienda.includes("CTC_RAZON")
  );
  check(
    "ningún componente escribe la razón social a mano",
    !sneak.includes('"Colombian Trading Company"') && !tienda.includes('"Colombian Trading Company"')
  );
}

// ── Las dos discrepancias resueltas, CLAVADAS ──────────────────────────────
// D0.9 y D0.10 se cerraron el 2026-08-19 leyendo Notion y, en el caso de la
// variedad, preguntándole al owner. Pero AGUAS ARRIBA LOS DOS ERRORES SIGUEN
// AHÍ: la ficha del Bourbon conserva `Variedad: Castillo`, y el Gesha sigue
// relacionado con «La Floresta».
//
// Esto importa porque este archivo es TEMPORAL: el día que los lotes se
// importen de verdad —de Notion o de la base—, esos dos valores volverían a
// entrar sin que nada falle. Serían dos campos plausibles en dos tarjetas
// bonitas. Así que se fijan aquí: si alguien los cambia, que sea a sabiendas y
// leyendo por qué, no de rebote en una importación.
{
  const lote = (n) => SNEAK_PEEK_MOCK.find((l) => l.id.endsWith(n));

  // D0.9 — el título manda sobre el campo `Variedad`. La taza lo respalda: 87.00
  // floral/mandarina/cardamomo, contra los dos Castillo de la MISMA finca a
  // 84.25 y 84.50 con chocolate y especias.
  const dos = lote("02");
  check("D0.9: la tarjeta 2 sigue siendo Bourbon, no Castillo", dos?.variety === "Bourbon");

  // D0.10 — La Floresta no cultiva Gesha («Castillo 90%, colombia 10%»), así que
  // el lote no puede salir de allí. La Fortaleza sí cuadra con título, proveedor
  // y RUT. Se clava también la altura: 1300 m (La Floresta) contra 1700 m.
  const tres = lote("03");
  check("D0.10: la tarjeta 3 sigue en La Fortaleza, no La Floresta", tres?.finca === "La Fortaleza");
  check("D0.10: con su municipio de Ragonvalia", tres?.municipio === "Ragonvalia");
  check("D0.10: y a 1700 m, no a los 1300 m de La Floresta", tres?.altitudeM === 1700);

  // Y que el archivo siga EXPLICANDO por qué, que es la mitad del valor: un
  // valor clavado sin su razón se desclava en cuanto alguien lo cuestione.
  const fuente = readFileSync(new URL("../src/lib/catalogo/sneakPeekMock.ts", import.meta.url), "utf8");
  check("D0.9 deja escrito que está resuelta", fuente.includes("D0.9 RESUELTA"));
  check("D0.10 deja escrito que está resuelta", fuente.includes("D0.10 RESUELTA"));
  check(
    "y que aguas arriba sigue sin corregirse",
    (fuente.match(/PENDIENTE AGUAS ARRIBA/g) ?? []).length === 2
  );
}

console.log(`${ok} comprobaciones OK, ${fallos.length} fallos`);
for (const f of fallos) console.log("  FALLO:", f);
process.exit(fallos.length ? 1 : 0);
