// Guardián del CTCx Public Catalogue y del código público del lote (V5.48).
//
//   node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/qa-catalogo-publico-check.mjs
//
// LO QUE PROTEGE. Tres costuras que un refactor descuidado desharía sin que
// fallara ningún tipo:
//
// 1. EL NORMALIZADOR ES UN CONTRATO DE URLs, no una comodidad. La ruta
//    `/ctcx-public-catalogue/[codigo]` responde **308** —permanente, y el
//    navegador lo cachea para siempre— desde cualquier forma no canónica hacia
//    la canónica. Cambiar el alfabeto o el mapeo de ambiguos re-apunta
//    redirecciones ya emitidas: las que están impresas en una bolsa incluidas.
//    Por eso aquí se prueba el mapeo carácter a carácter y no «que funcione».
//
// 2. EL CÓDIGO NO SE DERIVA DE NADA. Esta columna existe justamente porque
//    había DOS códigos derivados y contradictorios (`codigoDeLote(lot_id)` en
//    la cinta, `listingCode(lot_listings.id)` en la tienda). Si alguien vuelve
//    a derivarlo, vuelve el problema con otra cara.
//
// 3. LA RUTA SOLO-WWW TIENE QUE TENER DOS LECTORES. `/ctcx-public-catalogue` no
//    es un subdominio, así que no está en `SUBDOMAIN_ROUTES`. Si `RUTAS_SOLO_WWW`
//    se queda con un solo lector, el fallo es CALLADO: o la superficie
//    desaparece del sitemap, o el owner se queda sin poder gobernarla desde
//    ECP · Manejo de Plataformas y su `superficieConOverrides` queda inerte sin
//    que nada falle.
//
// Lo que NO está aquí y es a propósito: quién puede leer el `datasheet`. Eso
// vive en `qa-ficha-publica-check.mjs` §8, que vigila las TRES puertas juntas —
// es el archivo donde el siguiente barrido va a mirar.

import { readFileSync } from "node:fs";
import { ALFABETO, LARGO_CUERPO, normalizaCodigo, esCanonico, rutaDelCodigo } from "../src/lib/catalogo/codigoPublico.ts";
import { RUTAS_SOLO_WWW, SUBDOMAIN_ROUTES } from "../src/lib/red/subdominios.ts";

let ok = 0;
const fallos = [];
const check = (n, c) => (c ? ok++ : fallos.push(n));
const lee = (r) => readFileSync(new URL(`../${r}`, import.meta.url), "utf8");
const sinComentarios = (t) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const RUTA = "/ctcx-public-catalogue";

// ── 1. El alfabeto ─────────────────────────────────────────────────────────
// Crockford base32. La MISMA cadena está en `public.ctc_public_code()`, que es
// quien acuña; si una cambia sin la otra, el generador produce códigos que el
// normalizador rechaza y «Find my Lot» deja de encontrar lo que sí existe. El
// DDL no vive en el repo (se aplica con `apply_migration`), así que lo que se
// puede comprobar desde aquí es la FORMA — y que quede escrito dónde está la
// otra mitad.
check("el alfabeto tiene 32 caracteres", ALFABETO.length === 32);
check("sin caracteres repetidos", new Set(ALFABETO).size === 32);
check("sin I, L, O ni U (las que se confunden al leer una etiqueta)", !/[ILOU]/.test(ALFABETO));
check("en mayúsculas y cifras nada más", /^[0-9A-Z]+$/.test(ALFABETO));
check("el cuerpo del código son 8 caracteres", LARGO_CUERPO === 8);

{
  const fuente = lee("src/lib/catalogo/codigoPublico.ts");
  check("queda escrito que la otra mitad es `ctc_public_code()`", fuente.includes("ctc_public_code()"));
  check("y que el mapeo de ambiguos está CONGELADO", /CONGELADO/.test(fuente));
  check("y que el código NO es una credencial", /NO ES UNA CREDENCIAL/.test(fuente));
}

// ── 2. El normalizador, carácter a carácter ────────────────────────────────
{
  // Un código formado con TODO el alfabeto, por tramos de 8: si alguno no
  // sobrevive la ida y vuelta, el generador puede acuñar algo imposible de
  // buscar.
  for (let i = 0; i < ALFABETO.length; i += LARGO_CUERPO) {
    const cuerpo = ALFABETO.slice(i, i + LARGO_CUERPO);
    const canon = `CTCX-${cuerpo.slice(0, 4)}-${cuerpo.slice(4)}`;
    check(`ida y vuelta de «${canon}»`, normalizaCodigo(canon) === canon && esCanonico(canon));
  }

  const canon = "CTCX-2345-6789";
  check("minúsculas", normalizaCodigo("ctcx-2345-6789") === canon);
  check("sin guiones", normalizaCodigo("CTCX23456789") === canon);
  check("sin prefijo", normalizaCodigo("2345-6789") === canon);
  check("sin prefijo ni guiones", normalizaCodigo("23456789") === canon);
  check("con espacios y basura de un pegado", normalizaCodigo("  ctcx 2345 . 6789 \n") === canon);
  check("`esCanonico` solo acepta la forma exacta", esCanonico(canon) && !esCanonico("ctcx-2345-6789"));

  // El prefijo solo se recorta si lo que queda mide lo justo, así que
  // «CTCXCTCX» —ocho caracteres del alfabeto— se lee como un CUERPO, no como el
  // prefijo escrito dos veces. Es lo correcto: recortarlo haría desaparecer un
  // código legítimo, y este resuelve a 404 como cualquier otro que no exista.
  check("el prefijo no se come a sí mismo", normalizaCodigo("CTCXCTCX") === "CTCX-CTCX-CTCX");
}

// ── 3. El mapeo de ambiguos ────────────────────────────────────────────────
// O→0, I→1, L→1. Ninguno de los tres está en el alfabeto, así que el mapeo
// nunca puede tapar un carácter legítimo — se comprueba, no se supone.
{
  check("O se lee como cero", normalizaCodigo("CTCX-OOOO-2345") === "CTCX-0000-2345");
  check("I se lee como uno", normalizaCodigo("CTCX-IIII-2345") === "CTCX-1111-2345");
  check("L se lee como uno", normalizaCodigo("CTCX-LLLL-2345") === "CTCX-1111-2345");
  check("minúsculas ambiguas también", normalizaCodigo("ctcx-oil1-2345") === "CTCX-0111-2345");
  for (const c of "ILOU") {
    if (c === "U") continue; // U no se mapea: no es ambigua con ninguna cifra.
    check(`«${c}» no está en el alfabeto, así que el mapeo no tapa nada`, !ALFABETO.includes(c));
  }
}

// ── 4. Lo que NO es un código ──────────────────────────────────────────────
// Un 308 permanente no se emite «por si acaso»: lo que no sea exactamente un
// código tiene que caer en 404, no en una redirección que el navegador guarde.
{
  const malos = [
    ["vacío", ""],
    ["corto", "CTCX-234-6789"],
    ["largo", "CTCX-2345-67890"],
    ["con U (fuera del alfabeto)", "CTCX-UUUU-2345"],
    ["otro prefijo", "CTCY-2345-6789"],
    ["solo el prefijo", "CTCX"],
    ["con acentos", "CTCX-2345-67ñ9"],
  ];
  for (const [nombre, entrada] of malos) {
    check(`rechaza ${nombre}`, normalizaCodigo(entrada) === null);
  }
  check("rechaza lo que no sea texto", normalizaCodigo(undefined) === null && normalizaCodigo(12345678) === null);
}

// ── 5. El código no se deriva de nada ──────────────────────────────────────
{
  const fuente = sinComentarios(lee("src/lib/catalogo/codigoPublico.ts"));
  check("el módulo no conoce `lot_id`", !/lot_id/.test(fuente));
  check("ni `lot_listings`", !/lot_listings/.test(fuente));
  check("ni `ctc_uid` (que es privado)", !/ctc_uid/.test(fuente));
  check("es un módulo PURO: sin `server-only` y sin imports", !/^import\s/m.test(fuente) && !/server-only/.test(fuente));
  check("la ruta la arma el módulo, no cada pantalla", rutaDelCodigo("CTCX-2345-6789") === `${RUTA}/CTCX-2345-6789`);
}

// ── 6. La ruta SOLO-www y sus DOS lectores ─────────────────────────────────
{
  check("la superficie está en RUTAS_SOLO_WWW", RUTAS_SOLO_WWW.includes(RUTA));
  check("y NO está en SUBDOMAIN_ROUTES (no es un subdominio)", !Object.values(SUBDOMAIN_ROUTES).includes(RUTA));

  const sitemap = lee("src/app/sitemap.xml/route.ts");
  check("el sitemap lee RUTAS_SOLO_WWW", /RUTAS_SOLO_WWW/.test(sitemap) && /import[^;]*RUTAS_SOLO_WWW/s.test(sitemap));
  check("y las mezcla con las de subdominio", /Object\.values\(SUBDOMAIN_ROUTES\), \.\.\.RUTAS_SOLO_WWW/.test(sitemap));

  const plataformas = lee("src/app/ecp/(app)/plataformasActions.ts");
  check("Manejo de Plataformas lee RUTAS_SOLO_WWW", /RUTAS_SOLO_WWW/.test(plataformas));
  check(
    "y por tanto `guardarSuperficie()` la acepta",
    /rutasDeLaRed\(\)\.includes\(fila\.route\)/.test(plataformas) && /\.\.\.RUTAS_SOLO_WWW/.test(plataformas)
  );

  // El proxy NO la excluye, así que solo responde en www. Que siga siendo
  // verdad importa: si mañana se excluyera, los enlaces absolutos de
  // `PuertasDelPortal` seguirían siendo correctos, pero el comentario que lo
  // explica pasaría a mentir.
  const proxy = lee("src/proxy.ts");
  check("la ruta no está en RAIZ_COMPARTIDA (decisión escrita, no olvido)", !proxy.includes(RUTA));
}

// ── 7. La superficie declara su tarjeta y su canonical ─────────────────────
{
  // Se mira el CÓDIGO, no la prosa: estos dos archivos explican largo y tendido
  // por qué NO llevan `force-dynamic` y por qué NO hay `generateStaticParams`,
  // y contar los comentarios haría fallar al guardián por decir la verdad.
  // Mismo tropiezo que en `qa-ficha-publica-check.mjs` §8.
  const landing = sinComentarios(lee("src/app/ctcx-public-catalogue/page.tsx"));
  check("la landing firma su tarjeta por la única puerta", landing.includes("superficieConOverrides("));
  check("con la ruta que el mapa conoce", landing.includes(`route: "${RUTA}"`));
  check("y NO se vuelve dinámica (es página de marketing)", !/force-dynamic/.test(landing));

  const paqueteBruto = lee("src/app/ctcx-public-catalogue/[codigo]/page.tsx");
  const paquete = sinComentarios(paqueteBruto);
  check("el paquete es dinámico", /export const dynamic = "force-dynamic"/.test(paquete));
  check("sin generateStaticParams (se quedaría viejo al publicar un lote)", !/generateStaticParams/.test(paquete));
  // El canonical de CADA lote es su propia ruta. Firmar la del portal dejaría a
  // todos los lotes declarando la misma página canónica.
  check("cada lote firma su canonical completo", /route: rutaDelCodigo\(lote\.codigo\)/.test(paquete));
  check("y devuelve {} para un código desconocido", /if \(!lote\) return \{\};/.test(paquete));
  check("lee la vista con el cliente anónimo", /createEphemeralClient\(\)/.test(paquete));

  // `generateMetadata` NO puede redirigir ni lanzar 404: Next la ejecuta aparte
  // del render, y un control de flujo ahí dentro se traga o se duplica. De eso
  // se encarga la página, que es quien decide.
  const meta = /export async function generateMetadata\(\{[\s\S]*?\n\}/.exec(paquete)?.[0] ?? "";
  check("se encontró el cuerpo de generateMetadata", meta.length > 0);
  check("generateMetadata no lanza 404", !/notFound\(/.test(meta));
  check("ni redirige", !/[Rr]edirect\(/.test(meta));
}

// ── 8. Tres idiomas, y los tres completos ──────────────────────────────────
// `ALINEACION.md` §1 pide ES·EN·DE en toda superficie pública. Un diccionario
// al que le falta una clave en alemán no rompe nada: pinta `undefined`. Por eso
// se comparan los JUEGOS de claves, no que existan los tres bloques.
{
  /** Las claves de primer nivel del bloque `<lang>: {` de un diccionario.
   *
   *  ⚠️ SALTA LAS CADENAS. El primer intento no lo hacía y el guardián nacía
   *  rojo: en «…registrado de él: origen…» la regex veía `l:` y lo apuntaba
   *  como una clave. Un guardián que falla por la prosa de una traducción
   *  enseña a ignorar los fallos. */
  const clavesDe = (fuente, lang) => {
    const i = fuente.indexOf(`\n  ${lang}: {`);
    if (i < 0) return null;
    let j = fuente.indexOf("{", i);
    let prof = 0;
    const claves = [];
    for (; j < fuente.length; j++) {
      const c = fuente[j];
      if (c === '"' || c === "'" || c === "`") {
        // Se salta la cadena entera, respetando el escape.
        const comilla = c;
        j++;
        while (j < fuente.length && fuente[j] !== comilla) j += fuente[j] === "\\" ? 2 : 1;
        continue;
      }
      if (c === "{" || c === "[") prof++;
      else if (c === "}" || c === "]") {
        prof--;
        if (prof === 0) break;
      } else if (prof === 1 && /[A-Za-z_]/.test(c)) {
        const m = /^([A-Za-z_][A-Za-z0-9_]*)\s*:/.exec(fuente.slice(j));
        if (m) {
          claves.push(m[1]);
          j += m[0].length - 1;
        }
      }
    }
    return claves.sort().join(",");
  };

  for (const archivo of [
    "src/components/catalogo/CatalogoPublicoLanding.tsx",
    "src/components/catalogo/BuscadorDeLote.tsx",
    "src/components/catalogo/PuertasDelPortal.tsx",
    "src/components/catalogo/PaquetePublico.tsx",
  ]) {
    const fuente = lee(archivo);
    const es = clavesDe(fuente, "es");
    const en = clavesDe(fuente, "en");
    const de = clavesDe(fuente, "de");
    const corto = archivo.split("/").pop();
    check(`${corto}: tiene los tres idiomas`, !!es && !!en && !!de);
    check(`${corto}: EN dice lo mismo que ES`, es === en);
    check(`${corto}: DE dice lo mismo que ES`, es === de);
  }

  // «Find my Lot» es el NOMBRE de la función y se queda en inglés en los tres
  // idiomas — como «Cherry Picked». Que esté escrito por qué evita que el
  // siguiente barrido lo «arregle».
  const landing = lee("src/components/catalogo/CatalogoPublicoLanding.tsx");
  check("el H1 es «Find my Lot»", /<h1>Find my Lot<\/h1>/.test(landing));
  check("y queda explicado por qué no se traduce", /nombre de la función/.test(landing));
}

// ── 9. Las tres puertas, y que no nazca un cuarto buzón ────────────────────
{
  const puertas = lee("src/components/catalogo/PuertasDelPortal.tsx");
  check("el tercer botón abre el «Escríbenos» que ya existe", /openForm\("general"\)/.test(puertas));
  check("y no un formulario propio", !/submitLead|<form/.test(sinComentarios(puertas)));
  check("va a Kaffetal Regal", /U\("kaffetal-regal"/.test(puertas));
  check("y a la portada de Cherry Picked", /U\("cherry-picked"/.test(puertas));
  // En un subdominio esta superficie da 404, así que los destinos tienen que
  // ser absolutos en producción — es el desdoblamiento de siempre.
  check("los destinos son absolutos en producción", /https:\/\/\$\{sub\}\.ctcexport\.com/.test(puertas));
}

if (fallos.length) {
  console.error(`✗ qa-catalogo-publico: ${fallos.length} fallo(s), ${ok} OK\n`);
  for (const f of fallos) console.error("   " + f);
  process.exit(1);
}
console.log(`✓ qa-catalogo-publico: ${ok} comprobaciones OK, 0 fallos`);
