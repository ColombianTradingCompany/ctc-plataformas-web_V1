// Espejo entre lo que ve Google y lo que ve el ECP (V4.38). Toca la base.
//
//   node scripts/qa-tools-seo-espejo.mjs
//
// LA CORRECCIÓN QUE MOTIVA ESTE GUARDIÁN: en V4.37 se anotó que
// `tools.meta_description` era un campo decorativo porque nada lo servía. Eso
// era medio cierto y por tanto engañoso. NO lo sirve nadie —y no puede: para
// una herramienta del repo, `/tools/h/[slug]` REDIRIGE al archivo estático, y
// para una subida responde con `X-Robots-Tag: noindex`—, pero sí lo LEE el
// tablero de «Manejo de Plataformas»: `cargarHerramientasSeo` lo usa para
// pintar la píldora roja «sin descripción» y el contador de indexables.
//
// O sea que la columna no es decoración: es el INVENTARIO. Y un inventario que
// no cuadra con la bodega es peor que no tenerlo, porque se consulta en vez de
// ir a mirar. Antes de V4.38 decía que 11 de 12 no tenían descripción; después
// de V4.37 las 12 la tienen en el archivo. El tablero estaba mintiendo al revés.
//
// LA REGLA, ENTONCES: para una herramienta del repositorio el ARCHIVO manda —
// es literalmente lo que se descarga el buscador— y la columna es su espejo.
// Este guardián comprueba que el espejo no se haya despegado. Si alguien edita
// la descripción desde el ECP creyendo que cambia algo, esto lo denuncia en vez
// de dejar que el owner viva con un inventario falso.
//
// ⚠️ Necesita `.env.local` con la llave de servicio: la tabla `tools` no se lee
// entera sin sesión de consola. Por eso vive aparte de `qa-tools-seo-check.mjs`,
// que es estático y corre siempre.

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const raiz = new URL("../", import.meta.url);
for (const linea of readFileSync(new URL(".env.local", raiz), "utf8").split("\n")) {
  const m = linea.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] ||= m[2].trim();
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !service) {
  console.error("✗ qa-tools-seo-espejo: faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}

// Herramientas VIVAS que, a propósito, no van al índice. La lista es corta y se
// amplía a mano: cada línea tiene que traer su porqué.
//
//   · mermas-rapida — es la segunda mitad del arreglo del 2026-08-14. El <title>
//     decía «para Café y Cacao» y buscar «Colombian Trading Company» devolvía
//     cacao; se cambió el título ese día. Pero un buscador indexa el CUERPO, y la
//     página conserva el conmutador Café/Cacao, «Diferencias Clave: Café vs.
//     Cacao» y el «Proceso del Cacao» entero — verificado en vivo el 2026-08-19.
//     El cacao dejó de ser producto de la casa; la HERRAMIENTA no se toca (el
//     owner paró la rama que quería amputarle el modo cacao). Se le quita la
//     candidatura al índice, no la vida: `follow`, sigue abriendo y compartiendo.
const FUERA_DEL_INDICE = {
  "mermas-rapida": "cacao en el cuerpo; producto retirado (2026-08-19, V4.45)",
};

let ok = 0;
const fallos = [];
const check = (n, c) => (c ? ok++ : fallos.push(n));

const db = createClient(url, service, { auth: { persistSession: false } });

const { data: tools, error } = await db
  .from("tools")
  .select("id, nombre, lang, clase, meta_description, archivado_at, version_publicada");
if (error) {
  console.error("✗ qa-tools-seo-espejo: no se pudo leer `tools`:", error.message);
  process.exit(1);
}
const { data: versiones, error: e2 } = await db.from("tool_versions").select("id, origen, src_publico");
if (e2) {
  console.error("✗ qa-tools-seo-espejo: no se pudo leer `tool_versions`:", e2.message);
  process.exit(1);
}
const porId = new Map(versiones.map((v) => [v.id, v]));

/** Lo que de verdad se descarga el buscador: el `<head>` del archivo servido. */
function delArchivo(src) {
  // `src_publico` es una ruta pública tipo `/tools/x.html`; el archivo está en
  // `public/`. Se lee tal cual, sin tocar el cuerpo.
  const html = readFileSync(new URL("public" + src, raiz), "utf8");
  const cab = html.slice(0, html.search(/<\/head>/i) + 1 || html.length);
  const d = cab.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i);
  const l = html.match(/<html[^>]*\blang=["']([a-z-]+)["']/i);
  const rb = cab.match(/<meta[^>]*name=["']robots["'][^>]*content=["']([^"']*)["']/i);
  return { desc: d?.[1]?.trim() ?? null, lang: l?.[1]?.slice(0, 2) ?? null, robots: rb?.[1]?.toLowerCase() ?? "" };
}

let revisadas = 0;
let retiradas = 0;
for (const t of tools) {
  const v = t.version_publicada ? porId.get(t.version_publicada) : null;
  if (!v || v.origen !== "repo" || !v.src_publico) continue; // solo el repo es URL indexable

  // ⚠️ ARCHIVAR NO RETIRA UNA HERRAMIENTA DEL REPOSITORIO DE LA WEB, y esto se
  // descubrió aquí. `archivado_at` la saca del inventario del ECP y hace que
  // `/tools/h/<id>` responda 404 — pero el ARCHIVO sigue en `public/`, servido
  // estático, en una ruta que el proxy ni siquiera mira. `mermas-detallada`
  // («Reporte de proceso de café», reemplazada el 2026-08-15) llevaba desde
  // entonces viva e indexable, compitiendo en el buscador con la herramienta
  // que la sustituyó — y en V4.37, sin saberlo, se le escribió una descripción
  // nueva, que es justo lo contrario de retirarla.
  //
  // Borrar el archivo sería otra decisión —puede estar enlazado desde fuera—,
  // así que lo que se exige es lo proporcionado: que una retirada diga
  // `noindex`. Sale del índice y el enlace viejo sigue abriendo.
  if (t.archivado_at) {
    retiradas++;
    const arch = delArchivo(v.src_publico);
    check(`${t.id}: retirada, y el archivo lo dice con noindex`, arch.robots.includes("noindex"));
    continue;
  }
  revisadas++;

  const arch = delArchivo(v.src_publico);
  // Y al revés: una herramienta viva NUNCA debe llevar noindex. Reactivar una
  // archivada sin quitarle la etiqueta la dejaría publicada e invisible.
  //
  // Salvo excepción DECLARADA. Una regla sin puerta se salta por la ventana: el
  // día que haga falta una excepción, o alguien borra la comprobación entera o
  // la deja fallando para siempre. Mejor una lista corta, con el motivo escrito
  // al lado, que hay que ampliar a mano.
  if (t.id in FUERA_DEL_INDICE) {
    check(`${t.id}: excepción declarada, y de verdad lleva noindex`, arch.robots.includes("noindex"));
    // Aunque no la indexe nadie, sigue siendo una URL pública que alguien abre
    // desde un enlace: su descripción y su idioma se comprueban igual.
  } else {
    check(`${t.id}: viva, y sin noindex`, !arch.robots.includes("noindex"));
  }

  // Lo que importa: que el inventario del ECP diga lo que dice el archivo.
  check(`${t.id}: el archivo tiene descripción`, !!arch.desc);
  check(`${t.id}: la columna no está vacía`, !!t.meta_description);
  check(`${t.id}: la columna ESPEJA el archivo`, t.meta_description === arch.desc);

  // El idioma se comprueba porque sale como píldora «ES»/«EN» en la tarjeta de
  // la herramienta: una herramienta española anunciada como inglesa se abre y
  // se cierra. `green-datasheet` estaba así hasta V4.38 — la base decía `en` y
  // el archivo, con la interfaz entera en español, decía `es`.
  check(`${t.id}: el idioma de la base espeja el del archivo`, t.lang === arch.lang);

  // Un archivo del repositorio nunca puede ser «interna»: se sirve estático
  // desde `public/`, así que no hay compuerta que valga. Lo garantiza el
  // trigger `guard_tools_clase`, y se comprueba también aquí.
  check(`${t.id}: una del repo no se marca interna`, t.clase !== "interna");
}

check("hay herramientas indexables que revisar", revisadas >= 11);

if (fallos.length) {
  console.error(`✗ qa-tools-seo-espejo: ${fallos.length} fallo(s), ${ok} OK\n`);
  for (const f of fallos) console.error("   " + f);
  process.exit(1);
}
console.log(
  `✓ qa-tools-seo-espejo: ${ok} comprobaciones OK, 0 fallos ` +
    `(${revisadas} indexables espejadas, ${retiradas} retirada(s) con noindex)`,
);
