// Guardián del «Active Catalogue Sneak Peek».
//
//   node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/qa-sneak-peek-check.mjs
//
// Vigila las promesas del módulo, que son promesas de NEGOCIO y no de estilo:
//   1. Que por la cinta no pueda salir NADA comercial. La cinta se enseña sin
//      sesión en siete superficies; el día que alguien añada un precio «solo para
//      la tarjeta», esto falla.
//   2. Que la cinta enseñe lotes REALES (V5.198, owner 2026-10-10): los que llegaron
//      al Triage de Catálogo Activo, leídos de una vista estrecha que lee `anon`
//      (`public_lot_vitrina`). Los siete lotes mock de la temporada anterior (V4.x)
//      se retiraron con sus fotos, sus ruedas, sus fichas en PDF y sus generadores,
//      y no pueden volver por la puerta de atrás.
//   3. Que la tarjeta que se voltea siga siendo usable y accesible (las maquetas del
//      owner del 2026-08-17), con el reverso de la V5.198: la telaraña del CVA, las
//      notas con su ícono y el Dossier público.
//   4. V5.202 (owner, 2026-10-10): que lo público no lleve al productor («omitir info
//      que haga fácil circumventar a CTCx para llegar al Productor»): la vista no
//      expone la finca ni el municipio, su nombre es GENERADO (nunca el del productor),
//      la foto es del lote, y la tarjeta enseña la región. Ni el `lot_id` viaja.
//      Tras la revisión del nodo final (mismo día): la migración ya no borra columnas
//      (`create or replace`, mismo orden; se aplica antes o después de desplegar), el
//      nombre no lleva texto libre (variedades de la lista canónica —la misma en SQL y
//      en TS, comparada aquí fila a fila— y proceso de su enum), `public_lot_catalog`
//      lleva el MISMO nombre y solo se lee, la altitud va en tramos de 100 m y la foto
//      solo si CTCx la aprobó.
//
// No levanta la aplicación ni toca la base: son comprobaciones sobre el texto de
// los archivos que montan el módulo y sobre la migración de la vista. Mismo patrón
// que `qa-nav-check.mjs`, por el mismo motivo — lo que hay que proteger es una
// regla, y una regla se comprueba aquí y no a ojo.

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { VARIEDADES_PUBLICAS, TILDES_DE, TILDES_A, claveDeVariedad, variedadPublica, nombrePublicoDelLote } from "../src/lib/catalogo/nombrePublico.ts";
import { PROCESOS_BASE } from "../src/components/kaffetal-regal/ficha/fichaData.ts";
import { altitudPublica, tramoDeAltitud } from "../src/lib/catalogo/vitrinaVista.ts";

let ok = 0;
const fallos = [];
const check = (nombre, cond) => (cond ? ok++ : fallos.push(nombre));

const lee = (ruta) => readFileSync(new URL(`../${ruta}`, import.meta.url), "utf8").replace(/\r\n/g, "\n");
const existe = (ruta) => existsSync(new URL(`../${ruta}`, import.meta.url));
const sinComentarios = (t) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");

const LIB = lee("src/lib/catalogo/sneakPeek.ts");
const VISTA = lee("src/lib/catalogo/vitrinaVista.ts");
const VITRINA = lee("src/lib/catalogo/vitrina.ts");
// V5.202: la vista vigente es la de `2026-10-10_vitrina_sin_finca.sql` (`create or replace` sobre la de `_vitrina_publica.sql`, tras
// la revisión del nodo final: antes era drop + create y obligaba a un orden frágil de despliegue). Se miran sus secciones —(0) las
// funciones, (1) la vitrina, (2) el catálogo, (3) `place_order`— sin los comentarios SQL ni los `comment on …` (cuentan la historia
// y nombran lo que quitan).
const SQL_NUEVA = lee("docs/migraciones/2026-10-10_vitrina_sin_finca.sql");
const sinComentariosSql = (t) => t.replace(/--[^\n]*/g, "").replace(/comment on (view|function) [\s\S]*?';/g, "");
const SQL_TODO = sinComentariosSql(SQL_NUEVA);
const corta = (desde, hasta) => SQL_TODO.slice(SQL_TODO.indexOf(desde), hasta ? SQL_TODO.indexOf(hasta) : undefined);
const SQL_FUNCIONES = corta("create or replace function public.clave_de_variedad(", "create or replace view public.public_lot_vitrina as");
const SQL = corta("create or replace view public.public_lot_vitrina as", "create or replace view public.public_lot_catalog as");
const SQL_CATALOGO = corta("create or replace view public.public_lot_catalog as", "CREATE OR REPLACE FUNCTION public.place_order(");
const SQL_PEDIDO = corta("CREATE OR REPLACE FUNCTION public.place_order(");
/** ¿Aparecen estos trozos EN ESTE ORDEN? (las columnas de una vista: `create or replace` exige el mismo orden). */
const enOrden = (texto, trozos) => {
  let i = 0;
  for (const x of trozos) {
    const j = texto.indexOf(x, i);
    if (j < 0) return false;
    i = j + x.length;
  }
  return true;
};
const RUTA_API = lee("src/app/api/catalogo/sneak-peek/route.ts");
const RUTA_FOTO = lee("src/app/api/catalogo/foto/[referencia]/route.ts");
const COMPONENTE = lee("src/components/catalogo/SneakPeek.tsx");
const RADAR = lee("src/components/catalogo/RadarCvaTarjeta.tsx");
const TIENDA = lee("src/components/cherry-picked/CherryPickedExperience.tsx");
const POPUP = lee("src/components/catalogo/CatalogoPopup.tsx");
const CAAS = lee("src/components/services/CaasLanding.tsx");
const CSS = lee("src/components/catalogo/SneakPeek.module.css");

// ── 1. Nada comercial en el tipo que viaja al navegador ──────────────────────
// La garantía es estructural: si el tipo no tiene dónde meter un precio, no hay
// descuido posible. Se mira el bloque del tipo, no todo el archivo (los
// comentarios NOMBRAN esos campos justamente para explicar que están fuera).
const bloqueTipo = LIB.slice(LIB.indexOf("export type SneakPeekLot = {"), LIB.indexOf("export type SneakPeekPayload"));
check("se encontró el tipo SneakPeekLot", bloqueTipo.length > 200);
const PROHIBIDOS = ["price", "precio", "moq", "unit_kg", "unitKg", "total_kg", "totalKg", "kg", "sold", "deposit", "anticipo", "arrival", "transparency", "eur", "cop", "fob", "ancla", "op", "productor", "producer", "lat", "lng", "datasheet"];
for (const campo of PROHIBIDOS) {
  check(`el tipo SneakPeekLot no declara «${campo}»`, !new RegExp(`^\\s*${campo}[?]?\\s*:`, "im").test(bloqueTipo));
}

// ── 2. Solo lee la vista pública estrecha de la vitrina (V5.198) ────────────
check("la vista se llama `public_lot_vitrina` y vive en un módulo sin imports", /export const VISTA_VITRINA = "public_lot_vitrina";/.test(VISTA) && !/^import\s/m.test(VISTA));
check("la cinta lee ESA vista con el cliente anónimo", LIB.includes("createEphemeralClient()") && LIB.includes("supabase.from(VISTA_VITRINA).select(COLUMNAS_VITRINA)"));
check("y no lee `lots`, `fincas` ni el catálogo de la tienda", !LIB.includes('.from("lots")') && !LIB.includes('.from("fincas")') && !LIB.includes('.from("lot_listings")') && !LIB.includes('.from("public_transparency_pricing")'));
{
  const columnas = /COLUMNAS_VITRINA =\s*"([^"]+)"/.exec(VISTA)?.[1].split(",").map((c) => c.trim()) ?? [];
  check(`las columnas de la vista son de exhibición (${columnas.length})`, columnas.length >= 15 && columnas.includes("referencia") && columnas.includes("en_catalogo") && columnas.includes("tiene_foto"));
  // V5.202: tampoco la finca, el municipio, la vereda ni la historia: llevan al productor.
  const malas = columnas.filter((c) => /datasheet|lat|lng|poligono|polygon|producer|productor|nit|precio|price|fob|kg|ancla|op_pct|phone|email|finca|municipio|vereda|historia/i.test(c));
  check(`y ninguna es privada, comercial ni lleva al productor${malas.length ? ` (${malas.join(", ")})` : ""}`, malas.length === 0);
}
check("la taza se lee DESPUÉS de la compuerta, solo para esos lotes, y solo la que rige", LIB.includes("const tazas = await tazasDe(vivas.map((f) => f.lot_id));") && LIB.includes('.eq("status", "accepted")') && LIB.includes('.eq("rige_grado", true)'));
check("y se reduce a lo que pinta el reverso: los 8 del CVA y las notas con su intensidad", LIB.includes("cifras.cva.length === 8 ? cifras.cva.map((x) => ({ k: x.k, v: x.v })) : null") && LIB.includes(".map((x) => ({ id: x.id, intensidad: x.intensidad }))"));
check("Tyrian queda fuera del teaser (es solo de subasta)", LIB.includes('=== "tyrian"'));

// La vista misma (la migración): quién entra, qué sale y quién la lee.
check("vista: solo galardonados con grado, sin Tyrian", SQL.includes("where l.stage = 'galardonado'") && SQL.includes("and l.grade <> 'tyrian'"));
check("vista: solo lo que llegó al Triage (trato por ventana vigente, declaración viva o partida libre del Stock CTCx)", SQL.includes("c.status = 'active' and c.ventana_tipo is not null") && SQL.includes("cf.estado = 'declarada'") && SQL.includes("p.anulada_at is null and not p.comprometido") && SQL.includes("and (ct.lot_id is not null or d.lot_id is not null or s.lot_id is not null);"));
{
  // V5.202: del `datasheet` la vista solo lee la BANDERA de la foto del lote, y se lo pasa entero a `nombre_publico_lote`, que solo
  // lee sus variedades (y cada nombre pasa por la lista canónica).
  const claves = [...SQL.matchAll(/l\.datasheet -> '([a-z0-9_]+)'/g)].map((m) => m[1]);
  const clavesFn = [...SQL_FUNCIONES.matchAll(/p_datasheet -> '([a-z0-9_]+)'/g)].map((m) => m[1]);
  check(`vista: del \`datasheet\` solo lee la bandera de la foto, y la función del nombre solo las variedades (${[...new Set([...claves, ...clavesFn])].join(", ")})`, claves.length >= 2 && claves.every((k) => k === "b4_files_foto") && clavesFn.length >= 2 && clavesFn.every((k) => k === "varieties") && !/->>/.test(SQL.replace(/foto\.v ->> 'assetId'|r\.punto ->> 'protocoloFuente'/g, "")) && !/->>/.test(SQL_FUNCIONES.replace(/e\.v ->> 'name'/g, "")) && SQL_FUNCIONES.includes("public.variedad_publica(e.v ->> 'name')"));
}
// V5.202 (nodo final): «NOMBRE GENERADO SIN TEXTO LIBRE». Una sola función en la base, que usan las dos vistas y `place_order`.
const LLAMADA_NOMBRE = "public.nombre_publico_lote(l.id, l.datasheet, l.ficha_variedad, l.ficha_proceso, f.departamento, f.pais, l.harvest_to, l.harvest_from, l.created_at)";
check("V5.202 · vista: el nombre es GENERADO por la función común (variedades + proceso · región + año), nunca el del productor ni el del producto", SQL.includes(`${LLAMADA_NOMBRE} as nombre,`) && SQL_FUNCIONES.includes("create or replace function public.nombre_publico_lote(") && /\nstable\n/.test(SQL_FUNCIONES.slice(SQL_FUNCIONES.indexOf("public.nombre_publico_lote("))) && SQL_FUNCIONES.includes("to_char(p_harvest_to, 'YYYY')") && !/product_name/.test(SQL + SQL_FUNCIONES + SQL_CATALOGO) && !/\bl\.name\b/.test(SQL + SQL_CATALOGO));
check("V5.202 · las funciones son PURAS (no leen tablas) y con search_path vacío", !/\bfrom public\.|join public\./.test(SQL_FUNCIONES) && (SQL_FUNCIONES.match(/set search_path = ''/g) ?? []).length === 4);
{
  // La lista VALUES de `public.variedad_publica` es EXACTAMENTE la de `nombrePublico.ts` (la Ficha + el Mapa de Variedades + alias).
  const fn = SQL_FUNCIONES.slice(SQL_FUNCIONES.indexOf("create or replace function public.variedad_publica("), SQL_FUNCIONES.indexOf("create or replace function public.proceso_publico("));
  const filas = [...fn.matchAll(/\('([^']*)', '([^']*)'\)/g)].map((m) => `${m[1]}=${m[2]}`);
  const ts = VARIEDADES_PUBLICAS.map(([k, n]) => `${k}=${n}`);
  const sobran = filas.filter((x) => !ts.includes(x));
  const faltan = ts.filter((x) => !filas.includes(x));
  check(`V5.202 · la lista canónica de variedades es la MISMA en SQL y en TS (${filas.length} filas)${sobran.length || faltan.length ? ` — sobran en SQL: ${sobran.slice(0, 5).join(", ")}; faltan: ${faltan.slice(0, 5).join(", ")}` : ""}`, filas.length > 100 && filas.length === ts.length && sobran.length === 0 && faltan.length === 0);
  const clave = SQL_FUNCIONES.slice(SQL_FUNCIONES.indexOf("create or replace function public.clave_de_variedad("), SQL_FUNCIONES.indexOf("create or replace function public.variedad_publica("));
  check("V5.202 · y la CLAVE se calcula igual: la misma tabla de tildes, NFC, sin paréntesis, solo a-z 0-9 . espacio", clave.includes(`'${TILDES_DE}',`) && clave.includes(`'${TILDES_A}'`) && clave.includes("normalize(coalesce(p_nombre, ''), NFC)") && clave.includes(String.raw`'\(.*?\)', ' ', 'g'), '[^a-z0-9. ]+', ' ', 'g'), '\s+', ' ', 'g'))`) && claveDeVariedad("  Castillo (General) ") === "castillo" && claveDeVariedad("Borbón Rosado") === "borbon rosado");
  const proc = SQL_FUNCIONES.slice(SQL_FUNCIONES.indexOf("create or replace function public.proceso_publico("), SQL_FUNCIONES.indexOf("create or replace function public.nombre_publico_lote("));
  const cuando = [...proc.matchAll(/when '([a-z]+)' then '([A-Za-z]+)'/g)].map((m) => `${m[1]}=${m[2]}`);
  check("V5.202 · el proceso público es el enum de la Ficha (Lavado · Honey · Natural), ni uno más", JSON.stringify(cuando) === JSON.stringify(PROCESOS_BASE.map((p) => `${p.toLowerCase()}=${p}`)));
  // El centinela: una variedad que el productor escribió con su finca no sale; la canónica sale con su nombre canónico.
  const n = nombrePublicoDelLote({ lotId: "abcdef12-0000-0000-0000-000000000000", varieties: [{ name: "PRIVADO_finca" }, { name: "Castillo PRIVADO_finca" }, { name: "costa rica 95" }, { name: "Costa Rica 95" }], fichaVariedad: "PRIVADO_finca", fichaProceso: "PRIVADO_proceso", departamento: "Santander", pais: null, harvestTo: "2026-06-30" });
  check(`V5.202 · centinela «PRIVADO_finca»: ni la variedad libre ni el proceso libre entran en el nombre (${n})`, n === "Costa Rica 95 · Santander 2026" && variedadPublica("PRIVADO_finca") === null && variedadPublica("Castillo Mirador del Pino") === null && variedadPublica("Costa rica 95") === "Costa Rica 95");
}
check("V5.202 · vista: la variedad y el proceso salen normalizados (lo desconocido, null), la altitud en tramos de 100 m", SQL.includes("public.variedad_publica(l.ficha_variedad) as variedad,") && SQL.includes("public.proceso_publico(l.ficha_proceso) as proceso,") && SQL.includes("(l.ficha_altitud_m / 100) * 100 as altitud_m,") && altitudPublica(1794) === 1700 && altitudPublica(1393) === 1300 && tramoDeAltitud(1794, "es-CO") === "1.700–1.800 m" && tramoDeAltitud(null) === null);
check("V5.202 · vista: la finca y el municipio siguen en su sitio, SIEMPRE null (no se lee el nombre de la finca)", SQL.includes("null::text as finca_name,") && SQL.includes("null::text as municipio,") && !/\bf\.name\b|f\.municipio|f\.vereda/.test(SQL) && SQL.includes("f.departamento,") && SQL.includes("as pais,"));
check("V5.202 · vista: la foto es solo la del LOTE que CTCx APROBÓ (nunca la de perfil de la finca) y un lote de CTCx Selection no enseña foto propia", !/profile_photo_asset_id/.test(SQL) && /cm\.lot_id is null\s+and exists \(/.test(SQL) && SQL.includes("l.datasheet -> 'b4_files_foto'") && /as foto\(v\)\s+join public\.lot_fotos_publicas fp on fp\.lot_id = l\.id and fp\.asset_id::text = lower\(btrim\(foto\.v ->> 'assetId'\)\)\s+\) as tiene_foto/.test(SQL) && !/(left|right|full|cross)\s+join public\.lot_fotos_publicas/i.test(SQL));
// V5.202 (verificación del nodo final, 2026-10-10): el `join` de las aprobaciones es INTERNO; un `left join` dentro del `exists`
// devolvería verdadero con cualquier foto B4, aprobada o no (la prueba de mutación lo pasaba con el `includes` de antes).
check("V5.203 · vista: una compra ANULADA no hace del lote uno de CTCx Selection", SQL.includes("where cp.destino = 'selection' and cp.anulada_at is null"));
// V5.202 (nodo final): «MIGRACIÓN SIN ORDEN FRÁGIL». Ni un `drop`: `create or replace` con las MISMAS columnas en el MISMO orden,
// para que el código desplegado (el viejo, que pide `finca_name` y `municipio`, y el nuevo) lea la vista antes y después.
check("V5.202 · vista: `create or replace` (nada de drop) con sus 18 columnas en el MISMO orden, y la lee anon SOLO en lectura, con los MISMOS permisos de la V5.198", SQL.startsWith("create or replace view public.public_lot_vitrina as") && !/drop view/i.test(SQL_TODO) && enOrden(SQL.slice(SQL.indexOf("\nselect\n")), ["as lot_id,", "as referencia,", "as nombre,", "l.grade,", "as variedad,", "as proceso,", "as altitud_m,", "as punto,", "as protocolo,", "as finca_name,", "as municipio,", "f.departamento,", "as pais,", "as ctc_selection,", "as ctcx_imagen_path,", "as en_catalogo,", "as desde,", "as tiene_foto\nfrom"]) && SQL.includes("revoke all on public.public_lot_vitrina from public, anon, authenticated;") && SQL.includes("grant select on public.public_lot_vitrina to anon, authenticated, service_role;") && lee("docs/migraciones/2026-10-10_vitrina_publica.sql").includes("revoke all on public.public_lot_vitrina from public, anon, authenticated;\ngrant select on public.public_lot_vitrina to anon, authenticated, service_role;"));
check("V5.202 · la migración va en UNA transacción y empieza comprobando lo que necesita (V5.203 `anulada_at` y `lot_fotos_publicas`)", /^begin;$/m.test(SQL_TODO) && /^commit;$/m.test(SQL_TODO) && SQL_TODO.indexOf("begin;") < SQL_TODO.indexOf("create or replace function") && SQL_TODO.includes("column_name = 'anulada_at'") && SQL_TODO.includes("to_regclass('public.lot_fotos_publicas') is null") && SQL_NUEVA.includes("se puede aplicar ANTES o DESPUÉS de desplegar") && SQL_NUEVA.includes("PENDIENTE (limpieza futura"));

// ── 3. Las rutas públicas ────────────────────────────────────────────────────
check("la ruta sirve el payload de la librería", RUTA_API.includes("getSneakPeekPayload"));
check("la ruta no se congela en el build", RUTA_API.includes('export const dynamic = "force-dynamic"'));
check("la ruta cachea en el CDN", /s-maxage=\d+/.test(RUTA_API));
check("la foto pasa por la compuerta (la vista) y sale recortada en WebP, nunca la URL firmada", RUTA_FOTO.includes("fotoDeLaVitrina(referencia)") && RUTA_FOTO.includes('"content-type": "image/webp"') && VITRINA.includes("const fila = await filaDeLaVitrina(referencia);\n  if (!fila || !fila.tiene_foto || fila.ctc_selection) return null;") && VITRINA.includes(".webp({ quality: 74 })") && !/return url/.test(VITRINA));
check("la tarjeta pide la foto a esa ruta (cuelga de /api, que el proxy excluye)", LIB.includes("fila.tiene_foto ? `/api/catalogo/foto/${fila.referencia}` : undefined"));

// ── 4. El componente no se cae solo y respeta el movimiento reducido ─────────
// V5.199: sin cinta (falló la petición o aún no hay lotes en el Triage) no se dibuja una cinta hueca, pero «Find my Lot» se queda.
check("si la petición falla o no hay lotes, no se dibuja la cinta: solo «Find my Lot»", COMPONENTE.includes("if (failed || (data && data.lots.length === 0)) {") && /if \(failed \|\| \(data && data\.lots\.length === 0\)\) \{\s*return \(\s*<section[\s\S]{0,400}<FindMyLot lang=\{lang\} \/>/.test(COMPONENTE));
check("respeta prefers-reduced-motion", CSS.includes("prefers-reduced-motion"));
check("la cinta no vuelve a depender de una animación CSS", !CSS.includes("@keyframes sp-slide"));
check("la mueve un bucle de rAF sobre translate3d", COMPONENTE.includes("requestAnimationFrame") && COMPONENTE.includes("translate3d"));
check("la velocidad se PERSIGUE, no se asigna de golpe", COMPONENTE.includes("velRef.current +="));

// ── 5. Los mock se retiraron de verdad (V5.198) ─────────────────────────────
check("no existe `sneakPeekMock.ts`", !existe("src/lib/catalogo/sneakPeekMock.ts"));
check("ni sus fotos y ruedas, ni sus fichas en PDF", !existe("public/images/catalogo/sneak-peek") || readdirSync(new URL("../public/images/catalogo/sneak-peek", import.meta.url)).length === 0);
check("ni las fichas en PDF de los mock", !existe("public/docs/fichas-mock") || readdirSync(new URL("../public/docs/fichas-mock", import.meta.url)).length === 0);
check("ni sus generadores", !existe("scripts/build-fichas-mock.mjs") && !existe("scripts/build-ruedas-mock.mjs") && !existe("scripts/lib/analisis-intrinseco.mjs"));
{
  // Ningún literal «mock-lote» entrecomillado en todo `src` (un dato mock que volviera por otro archivo).
  const enSrc = [];
  const recorre = (dir) => {
    for (const n of readdirSync(dir)) {
      const p = join(dir, n);
      if (statSync(p).isDirectory()) recorre(p);
      else if (/\.(ts|tsx)$/.test(n) && /["']mock-lote/.test(readFileSync(p, "utf8"))) enSrc.push(p);
    }
  };
  recorre(fileURLToPath(new URL("../src", import.meta.url)));
  check(`ningún archivo de src trae datos mock («mock-lote» entrecomillado)${enSrc.length ? `: ${enSrc.join(", ")}` : ""}`, enSrc.length === 0);
}
check("la cinta ya no rellena con mock ni lleva rótulo de temporada", !LIB.includes("SNEAK_PEEK_MOCK") && !/^\s*season[?]?\s*:/m.test(bloqueTipo) && !/^\s*mock[?]?\s*:/m.test(bloqueTipo));

// ── 6. La compuerta del catálogo en la tienda (decisión D0.5) ────────────────
// El catálogo completo solo con sesión: `loadCatalog()` no puede volver a
// correr para un visitante anónimo.
const efecto = TIENDA.slice(TIENDA.indexOf("supabase.auth.getSession()"), TIENDA.indexOf("onAuthStateChange"));
const guarda = efecto.indexOf("if (!data.session?.user) return;");
const carga = efecto.indexOf("loadCatalog()");
check("el efecto de arranque tiene la guarda de sesión", guarda !== -1);
check("`loadCatalog()` va después de la guarda, nunca antes", carga !== -1 && carga > guarda);
check("la parrilla (Grados/Black) se pinta solo con sesión", /\{userId \? \(\s*<>\s*<GradosSection/.test(TIENDA));
check("el visitante recibe la cinta en ese sitio", TIENDA.includes("<SneakPeek"));
check("la cinta hereda el ancla `grados` de la parrilla", TIENDA.includes('id="grados"'));
check("al cerrar sesión se vacían los lotes", TIENDA.includes("setLots([])"));
check("sin sesión el índice no ofrece la sección Black, que no existe", TIENDA.includes('t.quickNav.filter((s) => s.id !== "black")'));

// ── 7. La tarjeta de un lote real (V5.198) ───────────────────────────────────
check("«Próximamente» en la foto de un lote que todavía no está declarado en el Catálogo Activo", COMPONENTE.includes("{!lot.inCatalogue && <span className={styles.seasonTag}>{t.proximamente}</span>}"));
check("el puntaje lleva el protocolo del Punto (CVA o SCA), no un «SCA» fijo ni un «est.»", COMPONENTE.includes("<i className={styles.sca}>{lot.scoreProtocol}</i>") && !COMPONENTE.includes("scoreEstimated"));
check("las notas de la cara son las que marcó el Q-Grader, en el idioma de la página", COMPONENTE.includes('const notas = lot.notes.slice(0, 5).map((x) => nombreDeNota(x.id, lang)).join(" · ");') && COMPONENTE.includes('descriptorLabel(id, lang === "de" ? "en" : lang)'));
check("la foto de una finca no da un segundo rodeo por el optimizador", COMPONENTE.includes('unoptimized={lot.image.startsWith("/api/")}'));

// ── 8. La tarjeta que se voltea: accesibilidad ──────────────────────────────
check("la cara delantera es un botón con aria-expanded", COMPONENTE.includes("aria-expanded={volteada}"));
check("Escape cierra la tarjeta abierta", COMPONENTE.includes('e.key === "Escape"'));
check("la cinta se para con una tarjeta abierta", /objetivoVelRef.current = volteada[\s\S]{0,40}\? 0/.test(COMPONENTE));
check("el sentido por defecto es hacia la derecha", /const BASE = \d+;/.test(COMPONENTE) && !/const BASE = -/.test(COMPONENTE));
check("la copia del bucle no recibe foco", COMPONENTE.includes("tabIndex={duplicada ? -1 : undefined}"));
check("el enlace del Dossier no voltea la tarjeta al pulsarlo", COMPONENTE.includes("e.stopPropagation()"));
check("el Dossier se abre en otra pestaña sin ceder la ventana", COMPONENTE.includes('rel="noopener"'));
check("el volteo respeta prefers-reduced-motion", CSS.includes(".inner{transition:none}"));

// ── 9. El reverso: la telaraña del CVA, las notas con ícono y el Dossier público (V5.198) ──
check("el reverso pinta la telaraña de 8 esquinas del CVA (no la de los diez atributos SCA de los mock)", COMPONENTE.includes("<RadarCvaTarjeta valores={lot.cva} lang={lang} />") && !COMPONENTE.includes("RadarIntrinseco") && !existe("src/components/catalogo/RadarIntrinseco.tsx"));
check("la telaraña de la tarjeta: octógono de cara plana, de 1 a 9, con los colores del tema", RADAR.includes("const ang = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2 + Math.PI / n;") && RADAR.includes("const MIN = 1;") && RADAR.includes("const MAX = 9;") && RADAR.includes("styles.radarFigura") && ["es:", "en:", "de:"].every((k) => RADAR.includes(k)));
check("las notas del reverso llevan su ícono (el de la rueda), su intensidad en casillas y su valor", COMPONENTE.includes("<IconoDeNota id={x.id} size={24} strokeWidth={1.8} />") && COMPONENTE.includes("<BarraDeIntensidad valor={x.intensidad} color={color} />") && COMPONENTE.includes("fmtIntensidad(x.intensidad, lang)"));
check("ya no hay rueda de imagen ni ficha técnica en el reverso", !COMPONENTE.includes("styles.wheelBox") && !COMPONENTE.includes("datasheetUrl"));
check("el botón del reverso abre el Dossier público, ABSOLUTO contra la casa matriz", COMPONENTE.includes("const PORTAL_BASE = process.env.NODE_ENV === \"development\" ? \"\" : origenDeSuperficie(RUTA_PORTAL);") && COMPONENTE.includes('href={`${PORTAL_BASE}${lot.dossierPath}${lang === "es" ? "" : "?lang=en"}`}') && LIB.includes("dossierPath: rutaDelLote(fila.referencia)"));
check("y va al pie del reverso", COMPONENTE.includes("className={`${styles.ficha} ${styles.fichaAlPie}`}") && CSS.includes(".fichaAlPie{margin-top:auto}") && CSS.includes(".ficha{") && CSS.includes("margin:10px auto 4px"));
check("el reverso no repite el puntaje", !/styles\.scoreRow/.test(COMPONENTE));

// ── 10. Las flechas de los extremos ─────────────────────────────────────────
check("hay flecha a cada lado", COMPONENTE.includes("styles.flechaIzq") && COMPONENTE.includes("styles.flechaDer"));
// V5.201: el «pasar por encima» es SOLO del ratón, y el foco solo acelera si es de teclado: el toque de un dedo dejaba la flecha
// «encima» o enfocada y la cinta se quedaba acelerando.
check("aceleran con el ratón (solo el ratón) Y con el foco de teclado", COMPONENTE.includes('onPointerEnter={(e) => e.pointerType === "mouse" && setImpulso(lado)}') && COMPONENTE.includes("onFocus={(e) => focoDeTeclado(e.currentTarget) && setImpulso(lado)}") && COMPONENTE.includes('return el.matches(":focus-visible");') && !COMPONENTE.includes("onMouseEnter"));
check("y sueltan al salir", COMPONENTE.includes('onPointerLeave={(e) => e.pointerType === "mouse" && setImpulso(null)}') && COMPONENTE.includes("onBlur={() => setImpulso(null)}"));
check("la flecha izquierda invierte el sentido", COMPONENTE.includes('impulso === "izq"') && COMPONENTE.includes("-RAPIDO"));
check("las flechas llevan rótulo accesible", COMPONENTE.includes("t.flechaAnterior") && COMPONENTE.includes("t.flechaSiguiente"));

// ── 11. La ventana del catálogo ─────────────────────────────────────────────
check("el pie abre la ventana en vez de navegar", COMPONENTE.includes("setPopup(true)"));
check("la ventana explica que el catálogo vive en Cherry Picked", /Cherry Picked/.test(POPUP));
check("y que registrarse es GRATIS", /gratis|free|kostenlos/i.test(POPUP));
check("la ventana está en los tres idiomas", ["es:", "en:", "de:"].every((k) => POPUP.includes(k)));
check("en las superficies CP el botón abre el login sin navegar", POPUP.includes("onOpenLogin"));

// ── 12. La landing de CaaS monta el módulo ──────────────────────────────────
check("CaaS monta la cinta", CAAS.includes("<SneakPeek"));
check("y la monta ENTRE «las dos clases» y «Dónde encaja»", CAAS.indexOf("{chrome.offerH2}") < CAAS.indexOf("<SneakPeek") && CAAS.indexOf("<SneakPeek") < CAAS.indexOf("{chrome.modelosH2}"));

// ── 13. Centrar y crecer al abrir (owner, 2026-08-17) ───────────────────────
check("al pulsar se centra la tarjeta antes de voltearla", COMPONENTE.includes("centrarYVoltear"));
check("el destino se calcula con el centro de la cinta", COMPONENTE.includes("cinta.clientWidth / 2 - centroTarjeta"));
check("se elige la copia más cercana de la tarjeta", COMPONENTE.includes("while (destino - posRef.current > w / 2)"));

// ── 14. El dedo (owner, 2026-10-10, V5.201) ─────────────────────────────────
// «En móvil, que el carrusel siga moviéndose por defecto de izquierda a derecha, pero si se interactúa con él, se transforma
// para moverse con el dedo de lado a lado. Después de 20 segundos de inactividad se vuelve a mover solo como al principio.»
{
  const motor = COMPONENTE.slice(COMPONENTE.indexOf("const paso = (ahora: number) => {"), COMPONENTE.indexOf("raf = requestAnimationFrame(paso);\n    };"));
  const iDestino = motor.indexOf("if (destinoRef.current !== null) {");
  const iDedo = motor.indexOf("} else if (arrastreRef.current?.movido) {");
  const iManual = motor.indexOf("} else if (manualRef.current) {");
  const iSola = motor.indexOf("} else if (!reducido) {");
  check("dedo · los 20 s de inactividad, en una constante", COMPONENTE.includes("const INACTIVIDAD_MS = 20_000;"));
  check("dedo · la cinta escucha al puntero (apoyar, mover, soltar, cancelar) y se traga el clic de un arrastre", COMPONENTE.includes("onPointerDown={alApoyar}") && COMPONENTE.includes("onPointerMove={alMover}") && COMPONENTE.includes("onPointerUp={(e) => alSoltar(e, false)}") && COMPONENTE.includes("onPointerCancel={(e) => alSoltar(e, true)}") && COMPONENTE.includes("if (performance.now() < sinClicHastaRef.current) {") && COMPONENTE.includes("sinClicHastaRef.current = performance.now() + 400;"));
  check("dedo · el ratón no arrastra (escritorio igual que antes) y con movimiento reducido manda el scroll nativo", COMPONENTE.includes('if (e.pointerType === "mouse" || movimientoReducido()) return;'));
  check("dedo · solo es arrastre si el dedo se corre en HORIZONTAL más que en vertical", COMPONENTE.includes("if (Math.abs(dx0) < UMBRAL_ARRASTRE_PX || Math.abs(dx0) < Math.abs(e.clientY - a.y0)) return;"));
  check("dedo · el motor: centrar, luego el dedo, luego la inercia manual y SOLO después la marcha sola", iDestino > 0 && iDedo > iDestino && iManual > iDedo && iSola > iManual && motor.includes("velRef.current *= Math.exp(-dt * 3.2);"));
  check("dedo · a los 20 s sin tocarla vuelve a andar sola (el reloj apaga el modo manual)", COMPONENTE.includes("relojRef.current = window.setTimeout(() => {\n      manualRef.current = false;\n    }, INACTIVIDAD_MS);"));
  check("dedo · bajar por la página pasando por la cinta NO la para (un cancelado sin arrastre no es tocarla)", COMPONENTE.includes("} else if (!cancelado) {") && /@media\(prefers-reduced-motion:no-preference\)\{\s*\.cinta\{touch-action:pan-y\}/.test(CSS));
  check("dedo · en táctil una flecha desliza la cinta una tarjeta hacia su lado", COMPONENTE.includes('} else if (ultimoPunteroRef.current !== "mouse") {\n                  empujarUnaTarjeta(lado);') && COMPONENTE.includes('destinoRef.current = posRef.current + (lado === "der" ? paso : -paso);'));
  check("dedo · el reloj no sobrevive al módulo", COMPONENTE.includes("return () => window.clearTimeout(reloj.current);"));
}
check("y se voltea solo AL LLEGAR", COMPONENTE.includes("alLlegarRef.current = () => setVolteada"));
check("el bucle no envuelve mientras centra", COMPONENTE.includes("if (destinoRef.current === null) {"));
check("la tarjeta abierta crece un 15 %", CSS.includes(".flipped{transform:scale(1.15)"));
check("y se pone por encima de sus vecinas", /\.flipped\{[^}]*z-index/.test(CSS));

// ── 15. La cara, según las maquetas del owner (2026-08-17) ──────────────────
check("«Ver detalle» va sobre la foto", COMPONENTE.includes("styles.verDetalle") && /\.verDetalle\{\s*position:absolute/.test(CSS));
check("la cara lleva el sello del grado a tamaño legible", COMPONENTE.includes("styles.sello") && /\.sello\{width:72px/.test(CSS));
// V5.202 (owner, 2026-10-10): sin la finca ni el municipio; la región en la línea que era de la finca (sin hueco).
check("V5.202 · la cara lleva el puntaje y la REGIÓN, sin la finca ni el municipio", COMPONENTE.includes("styles.frontFoot") && COMPONENTE.includes("lot.region && <span className={styles.region}>{lot.region}</span>") && COMPONENTE.includes("<span className={styles.rotulo}>{lot.rotulo}</span>") && !/lot\.finca|lot\.municipio|lot\.departamento|styles\.finca/.test(COMPONENTE) && CSS.includes(".region,.rotulo{font-size:12.5px;font-weight:700;"));
check("V5.202 · el tipo de la tarjeta no tiene dónde poner la finca, el municipio ni el `lot_id`", !/^\s*(finca|municipio|id)[?]?\s*:/m.test(bloqueTipo) && /^\s*region: string;/m.test(bloqueTipo) && LIB.includes("region: regionDeLaVitrina(fila),") && !/fila\.lot_id,?\n/.test(LIB.slice(LIB.indexOf("function aTarjeta("), LIB.indexOf("async function leeVitrina("))));
check("V5.202 · la clave de cada tarjeta (y la que se voltea) es su referencia", COMPONENTE.includes("key={lot.code}") && COMPONENTE.includes("volteada={volteada === lot.code}") && COMPONENTE.includes("centrarYVoltear(el, lot.code)") && !COMPONENTE.includes("lot.id"));
check("V5.202 · la región es departamento y país, de una sola fuente", VISTA.includes("export function regionDeLaVitrina(") && VISTA.includes("[fila.departamento, fila.pais]"));
check("la cara lleva variedad y altitud", COMPONENTE.includes("lot.variety, lot.altitudeM != null"));
// V5.202 (nodo final): el nombre es GENERADO y dos lotes pueden compartirlo («Castillo Lavado · Santander 2026»): la referencia los
// distingue a la vista y para un lector de pantalla.
check("V5.202 · la cara PINTA la referencia (mono, bajo el nombre) y la lleva en su aria-label", COMPONENTE.includes("<span className={styles.code} translate=\"no\">\n              {lot.code}\n            </span>") && COMPONENTE.includes("aria-label={t.tarjetaAria(`${lot.name} · ${lot.code}`)}") && /\.code\{font-family:var\(--font-spline-mono\)/.test(CSS));
check("V5.202 · la altitud de la cara es su TRAMO de 100 m, con los separadores del idioma", COMPONENTE.includes("tramoDeAltitud(lot.altitudeM, LOCALE[lang])") && COMPONENTE.includes('import { tramoDeAltitud } from "@/lib/catalogo/vitrinaVista";') && !/\$\{lot\.altitudeM\} m/.test(COMPONENTE));
check("V5.202 · la tarjeta normaliza otra vez variedad, proceso y altitud (idempotente; por si la vista vieja sigue puesta)", LIB.includes("altitudeM: altitudPublica(fila.altitud_m),") && LIB.includes("variety: variedadPublica(fila.variedad),") && LIB.includes("process: procesoPublico(fila.proceso),"));

// ── 16. El componente de cliente no arrastra el módulo `server-only` ─────────
// ⚠️ Importar un VALOR desde `lib/catalogo/sneakPeek.ts` (que es `server-only`) mete Supabase en el paquete del cliente y tumba la
// página con un 500 que `tsc --noEmit` NO ve. Del módulo solo se toman TIPOS.
for (const [n, f] of [["SneakPeek.tsx", COMPONENTE], ["RadarCvaTarjeta.tsx", RADAR]]) {
  const imports = [...f.matchAll(/^import (type )?\{[^}]*\} from "@\/lib\/catalogo\/sneakPeek";/gm)];
  check(`${n} importa de sneakPeek.ts solo TIPOS`, imports.every((m) => m[1] === "type "));
}
check("la cinta lee la vista desde un módulo sin `sharp` ni el cargador del dossier", LIB.includes('from "./vitrinaVista";') && !LIB.includes('from "./vitrina";'));

// ── D3.1 · la vitrina de un lote comprado en firme (V4.28) ───────────────────
// El owner decidió el 2026-08-18 que un lote que CTC compra sale en las tarjetas a nombre de CTC, SIN tocar su finca real. La vista
// NO devuelve el nombre de la finca en ese caso (§2) y el rótulo sale del perfil de CTCx Selection (`rotuloCtcx` → `legal.ts`).
{
  const perfil = lee("src/lib/catalogo/perfilCtcx.ts");
  check("la cinta pide ctc_selection a la vista", VISTA.includes("ctc_selection") && LIB.includes("fila.ctc_selection"));
  check("la tienda pide ctc_selection a la vista", TIENDA.includes("ctc_selection"));
  check("el rótulo de CTC sale del perfil de CTCx Selection en la cinta (rotuloCtcx → legal.ts), no escrito a mano", LIB.includes("rotuloCtcx(perfil)") && !/finca:\s*["'`]C(TC|olombian)/.test(LIB) && perfil.includes('from "@/lib/legal"') && /return nombre \|\| CTC_RAZON/.test(perfil));
  check("y en la tienda, el mismo rótulo", TIENDA.includes("rotuloCtcx(perfil)"));
  // V5.202: la vista vieja de la tienda (`public_lot_catalog`, la lee anon) ya no devuelve la finca ni el municipio de ningún lote.
  check("V5.202 · `public_lot_catalog` conserva sus columnas pero la finca y el municipio van a null para todos", SQL_CATALOGO.includes("null::text as finca_name,") && SQL_CATALOGO.includes("null::text as municipio,") && !/\bf\.name\b|f\.municipio/.test(SQL_CATALOGO) && SQL_CATALOGO.includes("where c.destino = 'selection' and c.anulada_at is null"));
  // V5.202 (nodo final): su `name` era `lots.name` (los 6 lotes de la vitrina llevaban ahí la finca o el municipio) y anon lo leía.
  check("V5.202 · `public_lot_catalog`: el MISMO nombre generado, las notas de cata (texto libre) a null, variedad y proceso normalizados, altitud en tramos", SQL_CATALOGO.includes(`${LLAMADA_NOMBRE} as name,`) && SQL_CATALOGO.includes("null::text as ficha_notas_cata,") && SQL_CATALOGO.includes("public.variedad_publica(l.ficha_variedad) as ficha_variedad,") && SQL_CATALOGO.includes("public.proceso_publico(l.ficha_proceso) as ficha_proceso,") && SQL_CATALOGO.includes("(l.ficha_altitud_m / 100) * 100 as ficha_altitud_m,") && !/\bl\.ficha_notas_cata\b/.test(SQL_CATALOGO));
  check("V5.202 · `public_lot_catalog`: sus 16 columnas en su orden y `pais` AL FINAL; anon y authenticated solo LEEN (revoke all + grant select)", SQL_CATALOGO.startsWith("create or replace view public.public_lot_catalog as") && enOrden(SQL_CATALOGO, ["as lot_id,", "as name,", "l.grade,", "as ficha_variedad,", "as ficha_proceso,", "as ficha_altitud_m,", "l.ficha_puntaje_estimado,", "as ficha_notas_cata,", "as finca_name,", "as municipio,", "f.departamento,", "as official_score,", "as ctc_selection,", "as tiene_ficha,", "l.public_code,", "as ctcx_imagen_path,", "as pais\nfrom"]) && SQL_CATALOGO.includes("revoke all on public.public_lot_catalog from public, anon, authenticated;") && SQL_CATALOGO.includes("grant select on public.public_lot_catalog to anon, authenticated, service_role;"));
  check("V5.202 · `place_order` guarda en el pedido el nombre GENERADO, no `lots.name` (el resto, la función de siempre)", SQL_PEDIDO.includes(`select ${LLAMADA_NOMBRE}\n      into v_lot_name`) && !SQL_PEDIDO.includes("select name into v_lot_name") && SQL_PEDIDO.includes(" SECURITY DEFINER\n SET search_path TO 'public'") && SQL_PEDIDO.includes("coalesce(v_lot_name, '—')") && SQL_PEDIDO.includes("insert into points_ledger (buyer_id, points_delta, reason, order_id)"));
  check("V5.202 · y la tienda enseña la región «departamento, país» (el MISMO formato que la cinta), sin un hueco ni la finca", TIENDA.includes('origin: [catalog.ctc_selection ? rotuloCtcx(perfil) : null, regionDeLaVitrina({ departamento: catalog.departamento, pais: catalog.pais ?? null })].filter(Boolean).join(" · ") || "—",') && TIENDA.includes('alt: tramoDeAltitud(catalog.ficha_altitud_m) ?? "—",') && !/finca_name|municipio/.test(sinComentarios(TIENDA)));
  check("ningún componente escribe la razón social a mano", !LIB.includes('"Colombian Trading Company"') && !TIENDA.includes('"Colombian Trading Company"'));
  check("la vitrina sigue enseñando CTC en vez de la finca cuando el lote es de CTC Selection", /ctc_selection\s*\?\s*rotuloCtcx\(perfil\)/.test(TIENDA) && /ctc_selection\s*\?\s*rotuloCtcx\(perfil\)/.test(LIB));
}

// ── La promesa pública y lo que la tarjeta enseña, ATADAS ──────────────────
// El Manifiesto, en su pilar 01, promete «finca, personas, proceso y evaluación, verificables lote a lote» y dice DÓNDE: en la
// ficha técnica y en la DDS. Estas comprobaciones solo impiden que el pilar pierda el «dónde» por un descuido; NO dicen que el
// Dossier público enseñe la finca: desde la V5.202 (owner, 2026-10-10: «omitir info que haga fácil circumventar a CTCx para llegar
// al Productor») no la enseña, ni a las personas. La redacción del pilar choca con eso y CAMBIARLA ES DECISIÓN DEL OWNER (queda
// como pendiente con dueño; propuesta de la revisión: «…verificables lote a lote en la DDS que recibe el comprador»). Hasta que
// decida, este guardián conserva su texto; devolver la finca a la tarjeta de un lote de CTC sigue rompiendo D3.1.
{
  const manifiesto = lee("src/components/cherry-picked/ManifiestoSection.tsx");
  check("manifiesto ES: el pilar 01 dice dónde (ficha técnica y DDS)", /verificables lote a lote en la ficha técnica y en la DDS/.test(manifiesto));
  check("manifiesto EN: el pilar 01 dice dónde (datasheet and DDS)", /verifiable lot by lot on the datasheet and the DDS/.test(manifiesto));
  check("manifiesto DE: el pilar 01 dice dónde (Datenblatt und DDS)", /überprüfbar — im Datenblatt und in der DDS/.test(manifiesto));
  check("y queda escrito por qué el pilar dice dónde", manifiesto.includes("EL PILAR 01 DICE DÓNDE SE VERIFICA"));
}

// Solo comprueba que el código no contiene los nombres en ejecución (los comentarios pueden contar la historia).
check("ninguna lectura de la vista vieja de la tienda en la cinta", !sinComentarios(LIB).includes("public_lot_catalog"));

console.log(`${ok} comprobaciones OK, ${fallos.length} fallos`);
for (const f of fallos) console.log("  FALLO:", f);
process.exit(fallos.length ? 1 : 0);
