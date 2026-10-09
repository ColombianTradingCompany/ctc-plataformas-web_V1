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

import { existsSync, readFileSync, statSync } from "node:fs";
import {
  ALFABETO,
  LARGO_CUERPO,
  cuerpoDeReferencia,
  normalizaCodigo,
  normalizaReferencia,
  esCanonico,
  rutaDelCodigo,
  rutaDelLote,
  PREFIJO_REFERENCIA,
  RUTA_PORTAL,
} from "../src/lib/catalogo/codigoPublico.ts";
import { RUTAS_SOLO_WWW, SUBDOMAIN_ROUTES } from "../src/lib/red/subdominios.ts";

let ok = 0;
const fallos = [];
const check = (n, c) => (c ? ok++ : fallos.push(n));
const lee = (r) => readFileSync(new URL(`../${r}`, import.meta.url), "utf8");
const existe = (r) => existsSync(new URL(`../${r}`, import.meta.url));
/** Peso en KB. Una página que se abre con el móvil en una finca no puede servir
 *  el original de 4 MB que salió de la cámara. */
const kb = (r) => statSync(new URL(`../${r}`, import.meta.url)).size / 1024;
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

// ── 5b. La REFERENCIA del lote, dirección pública desde la V5.198 ──────────
// Owner, 2026-10-10: «Find my Lot […] debo escribir solo los 8 dígitos después de "CTC-L-"». La referencia SÍ sale del id del
// lote (`ctcLotReference`: sus ocho primeros caracteres hexadecimales) — es la que el lote ya lleva impresa en el paquete de
// muestra y en el Dossier. El código viejo de arriba sigue sin derivarse de nada y su ruta redirige a la referencia.
{
  const ref = "CTC-L-7E360302";
  check("el prefijo fijo del buscador es «CTC-L-»", PREFIJO_REFERENCIA === "CTC-L-");
  check("ida y vuelta de la referencia canónica", normalizaReferencia(ref) === ref);
  check("minúsculas", normalizaReferencia("ctc-l-7e360302") === ref);
  check("solo los ocho caracteres (lo que se escribe en el buscador)", normalizaReferencia("7e360302") === ref && normalizaReferencia(" 7E36 0302 ") === ref);
  check("sin guiones", normalizaReferencia("CTCL7E360302") === ref);
  check("O se lee como cero, I y L como uno (ninguna es hexadecimal)", normalizaReferencia("7E36O3O2") === ref && normalizaReferencia("1I1L0000") === "CTC-L-11110000");
  check("el prefijo se quita ANTES de leer los ambiguos (la L de «CTCL» no es un uno)", normalizaReferencia("ctcl00000001") === "CTC-L-00000001");
  for (const [nombre, entrada] of [["corto", "7E36030"], ["largo", "7E3603021"], ["no hexadecimal", "7E36030G"], ["vacío", ""], ["un código viejo", "CTCX-2345-6789"]]) {
    check(`la referencia rechaza ${nombre}`, normalizaReferencia(entrada) === null);
  }
  check("rechaza lo que no sea texto", normalizaReferencia(undefined) === null && normalizaReferencia(12345678) === null);
  check("la ruta del lote la arma el módulo", rutaDelLote(ref) === `${RUTA}/${ref}`);
  // V5.199: el campo deja solo los ocho (el prefijo va fijo delante): pegar la referencia entera, o con guiones, se queda en el cuerpo.
  check("el campo se queda con los ocho caracteres aunque peguen la referencia entera", cuerpoDeReferencia("ctc-l-7e360302") === "7E360302" && cuerpoDeReferencia("CTCL 7E36-0302") === "7E360302" && cuerpoDeReferencia("7e360302ff") === "7E360302" && cuerpoDeReferencia("7e36") === "7E36");
  const ficha = lee("src/components/kaffetal-regal/data.ts");
  check("es la MISMA referencia que el lote lleva en el paquete de muestra y el Dossier (`ctcLotReference`)", /return "CTC-L-" \+ id\.replace\(\/-\/g, ""\)\.slice\(0, 8\)\.toUpperCase\(\);/.test(ficha));
}

// ── 6. La ruta SOLO-www y sus DOS lectores ─────────────────────────────────
{
  // Las dos mitades nombran la ruta: el mapa de la red (`subdominios.ts`) y el
  // módulo puro (`codigoPublico.ts`, que no puede importar nada). Que digan lo
  // mismo se comprueba aquí, que es lo único que las ata.
  check("`RUTA_PORTAL` y la ruta del mapa son la misma", RUTA_PORTAL === RUTA);
  check("la superficie está en RUTAS_SOLO_WWW", RUTAS_SOLO_WWW.includes(RUTA_PORTAL));
  check("y NO está en SUBDOMAIN_ROUTES (no es un subdominio)", !Object.values(SUBDOMAIN_ROUTES).includes(RUTA));

  const sitemap = lee("src/app/sitemap.xml/route.ts");
  check("el sitemap lee RUTAS_SOLO_WWW", /RUTAS_SOLO_WWW/.test(sitemap) && /import[^;]*RUTAS_SOLO_WWW/s.test(sitemap));
  check("y las mezcla con las de subdominio", /Object\.values\(SUBDOMAIN_ROUTES\), \.\.\.RUTAS_SOLO_WWW/.test(sitemap));

  const plataformas = lee("src/app/bcp/(app)/plataformasActions.ts");
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
  // Tarjeta PROPIA desde la V5.50: hasta entonces prestaba la de la casa
  // matriz, y compartir un lote por WhatsApp enseñaba el logotipo de CTC sin
  // decir a dónde llevaba el enlace. El protocolo pide JPEG 1200×630.
  const OG = "public/images/og/ctcx-public-catalogue.jpg";
  check("la landing usa su propia tarjeta", landing.includes('image: "ctcx-public-catalogue.jpg"'));
  check("existe el archivo de la tarjeta", existe(OG));
  check(`y pesa menos de 300 KB (${existe(OG) ? kb(OG).toFixed(0) : "?"} KB)`, existe(OG) && kb(OG) < 300);
  check("y NO se vuelve dinámica (es página de marketing)", !/force-dynamic/.test(landing));

  const paqueteBruto = lee("src/app/ctcx-public-catalogue/[codigo]/page.tsx");
  const paquete = sinComentarios(paqueteBruto);
  check("el paquete es dinámico", /export const dynamic = "force-dynamic"/.test(paquete));
  check("sin generateStaticParams (se quedaría viejo al publicar un lote)", !/generateStaticParams/.test(paquete));
  // El canonical de CADA lote es su propia ruta. Firmar la del portal dejaría a
  // todos los lotes declarando la misma página canónica.
  check("cada lote firma su canonical completo (su referencia)", /route: rutaDelLote\(lote\.referencia\)/.test(paquete));
  check("y devuelve {} para un código desconocido", /if \(!lote\) return \{\};/.test(paquete));
  check("lee la vista con el cliente anónimo (en `lib/catalogo/vitrina.ts`)", /createEphemeralClient\(\)/.test(lee("src/lib/catalogo/vitrina.ts")) && /from "@\/lib\/catalogo\/vitrina"/.test(paquete));
  check("una referencia mal escrita y un código viejo se canonizan con 308, nunca con 307", paquete.includes("permanentRedirect(rutaDelLote(referencia));") && paquete.includes("permanentRedirect(`${rutaDelLote(c.codigo)}") && !/[^t]\bredirect\(/.test(paquete));
  check("un código viejo solo si EMPIEZA por CTCX (ocho caracteres sueltos son una referencia)", paquete.includes("if (/^\\s*ctcx/i.test(s)) {"));
  check("y el lote comparte la tarjeta del portal", paquete.includes('image: "ctcx-public-catalogue.jpg"'));

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
    "src/components/catalogo/LoteNoEncontrado.tsx",
    "src/components/catalogo/PuertasDelPortal.tsx",
    "src/components/catalogo/ProcedenciaCTCx.tsx",
    // La cinta del Catálogo Activo entra aquí desde la V5.49, cuando estrenó la
    // puerta al portal: su diccionario alimenta las siete superficies, así que
    // una clave que falte en alemán se ve en siete sitios a la vez.
    "src/components/catalogo/SneakPeek.tsx",
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
  check("el H1 es «Find my Lot»", /<h1[^>]*>Find my Lot<\/h1>/.test(landing));
  check("y queda explicado por qué no se traduce", /nombre de la función/.test(landing));
}

// ── 11. La marca del portal y la firma de procedencia (V5.50) ─────────────
{
  // La marca vive DOS veces: en React (hereda `currentColor`, así que se pinta
  // con el tema de cada superficie) y como .svg suelto (para lo que no puede
  // usar React: una tarjeta, un favicon, un documento). Dos copias del mismo
  // dibujo se separan solas si nadie las mira, así que se comparan los
  // trazados — que es lo único que tienen que compartir.
  const marcaTsx = lee("src/components/catalogo/MarcaPortal.tsx");
  const marcaSvg = lee("public/images/ctcx-public-catalogue/marca-ctcx-portal.svg");
  const trazos = (t) => (t.match(/[Mm]13\.2 4\.2c[-\d. s]+|19\.9 19\.9 27\.6 27\.6|cx="13\.2"|r="9\.2"/g) ?? []).sort().join("|");
  check("la marca en React y el .svg dibujan lo mismo", trazos(marcaTsx) === trazos(marcaSvg) && trazos(marcaTsx).length > 0);
  check("la marca hereda el color del tema", /currentColor/.test(marcaTsx) && !/#[0-9a-fA-F]{3,6}/.test(sinComentarios(marcaTsx)));
  check("y es decorativa (el texto de al lado ya la nombra)", /aria-hidden="true"/.test(marcaTsx));

  // La tira de la cadena empareja FOTO con PIE por índice, así que una foto de
  // más —o un pie de menos en un idioma— es una página que revienta en
  // producción con `t.pasos[i]` undefined. Los tipos no lo ven: es un array.
  {
    const src = lee("src/components/catalogo/CatalogoPublicoLanding.tsx");
    const fotos = (/const FOTOS = \[([\s\S]*?)\n\];/.exec(src)?.[1].match(/src:/g) ?? []).length;
    const pies = [...src.matchAll(/pasos: \[([\s\S]*?)\n\s{4}\],/g)].map((m) => (m[1].match(/\{ t: "/g) ?? []).length);
    check(`la tira declara ${fotos} fotos`, fotos > 0);
    check(`los tres idiomas traen los ${fotos} pies (${pies.join("·")})`, pies.length === 3 && pies.every((n) => n === fotos));
  }

  // La firma de procedencia es lo que le dice a quien llega desde una bolsa de
  // quién es esto. Las tres casas, con su logo.
  const proc = lee("src/components/catalogo/ProcedenciaCTCx.tsx");
  for (const logo of ["logo-ctc.webp", "logo-kaffetal-regal.webp", "logo-cherry-picked.webp"]) {
    check(`la firma muestra ${logo}`, proc.includes(logo));
  }
  check("nombra el dominio de la casa", proc.includes("ctcexport.com"));
  check(
    "es una FIRMA, no una llamada a la acción (sin botones)",
    !/className=\{?["'`]?btn/.test(proc) && !/<button/.test(proc)
  );
  const portada = lee("src/components/catalogo/CatalogoPublicoLanding.tsx");
  check("la portada la monta", portada.includes("<ProcedenciaCTCx"));
  check("y el Dossier público del lote firma con la marca de CTCx en cada hoja", lee("src/components/kaffetal-regal/dossier/DossierCtcx.tsx").includes('src="/tools/assets/ctcx-logo.png" alt="Colombian Trading Company"'));

  // Las fotos son del archivo de CTC y viven optimizadas. Si alguien apunta a
  // un original de `reference/`, no se despliega: esa carpeta no va al build.
  check("la portada no apunta a `reference/`", !/reference\//.test(sinComentarios(portada)));
  for (const f of [
    // La primera imagen de la página (V5.51): el grabado del owner. Va sin
    // recortar, así que pesa más que una foto recortada — de ahí el margen.
    "cesta-flavour-quality-traceability.webp",
    "cadena-mesa-cafe.webp",
    // Los cinco pasos de la cadena, en su orden.
    "finca-cerezas.webp",
    "secado-patio-guacamayo.webp",
    "productor-pergamino.webp",
    "tostador-probat.webp",
    "destino-molinillos.webp",
  ]) {
    const ruta = `public/images/ctcx-public-catalogue/${f}`;
    check(`existe la foto ${f}`, existe(ruta));
    // 320 KB por foto: holgado para un hero, imposible para un original de
    // cámara (los de `reference/` pesan entre 1,5 y 6,7 MB).
    check(`${f} va optimizada (${existe(ruta) ? kb(ruta).toFixed(0) : "?"} KB)`, existe(ruta) && kb(ruta) < 320);
  }
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

// ── 10. La puerta desde la cinta del Catálogo Activo (V5.49) ───────────────
// La cinta está montada en SIETE superficies de hosts distintos, y esta ruta
// solo responde en `www`. Un href relativo funcionaría en la casa matriz y
// daría 404 en las otras seis — un fallo que solo se ve en producción y solo
// en algunos hosts. Es la misma trampa que ya se pagó con el botón de la ficha.
{
  const cinta = lee("src/components/catalogo/SneakPeek.tsx");
  check("la cinta enlaza el portal", cinta.includes("PORTAL_HREF"));
  // V5.199 (owner): «En la página de CTCx, KR y CP debe haber mención de "Find my Lot" […] con la cual debo escribir solo los 8
  // dígitos después de "CTC-L-"». La cinta está en las tres familias: su pie lleva el campo, y sin tarjetas se queda solo él.
  check("«Find my Lot» en el pie de la cinta: el prefijo fijo, los ocho caracteres y la navegación ABSOLUTA al Dossier público", cinta.includes("function FindMyLot({ lang }: { lang: SneakPeekLang })") && cinta.includes("{PREFIJO_REFERENCIA}") && cinta.includes("setValor(cuerpoDeReferencia(e.target.value));") && cinta.includes("const referencia = normalizaReferencia(valor);") && cinta.includes("const destino = new URL(`${PORTAL_HREF}/${referencia}${lang === \"es\" ? \"\" : \"?lang=en\"}`, window.location.href);") && cinta.includes("window.location.assign(destino.href);") && (cinta.match(/<FindMyLot lang=\{lang\} \/>/g) ?? []).length === 2);
  for (const [n, f] of [["CTC Home", "src/components/ctc-home/SneakPeekHome.tsx"], ["Kaffetal Regal", "src/components/kaffetal-regal/Landing.tsx"], ["Cherry Picked (tienda)", "src/components/cherry-picked/CherryPickedExperience.tsx"], ["Cherry Picked (hub)", "src/components/cherry-picked-hub/HubLanding.tsx"]]) {
    check(`${n} monta la cinta (y con ella «Find my Lot»)`, lee(f).includes("<SneakPeek"));
  }
  check(
    "y lo hace ABSOLUTO contra la casa matriz en producción",
    /origenDeSuperficie\(RUTA_PORTAL\)\}\$\{RUTA_PORTAL\}/.test(cinta)
  );
  check("la ruta la trae del módulo, no la teclea", !new RegExp(`["'\`]${RUTA}`).test(sinComentarios(cinta)));
  check("es una navegación de verdad, no el pop-up del catálogo", /href=\{PORTAL_HREF\}/.test(cinta));
  const css = lee("src/components/catalogo/SneakPeek.module.css");
  check("el botón respeta el mínimo táctil de 44 px", /\.portal\{[^}]*min-height:44px/s.test(css));
}

// ── 12. «Find my Lot» por la referencia (V5.199) ──────────────────────────
{
  const buscador = lee("src/components/catalogo/BuscadorDeLote.tsx");
  check("el buscador del portal lleva «CTC-L-» fijo y pide solo los ocho caracteres", buscador.includes("{PREFIJO_REFERENCIA}") && buscador.includes("setValor(cuerpoDeReferencia(e.target.value));") && buscador.includes("const referencia = normalizaReferencia(valor);") && buscador.includes("router.push(`${rutaDelLote(referencia)}"));
  check("y ya no pide el código viejo `CTCX-…`", !/normalizaCodigo|rutaDelCodigo|CTCX-XXXX/.test(buscador));
  const landing = lee("src/components/catalogo/CatalogoPublicoLanding.tsx");
  check("la landing dice que aparecen los lotes del Catálogo Activo, no solo los publicados (los tres idiomas)", !landing.includes("Solo aparecen los lotes publicados") && !landing.includes("Only published lots appear") && !landing.includes("Es erscheinen nur veröffentlichte Lose") && landing.includes("llegaron al Catálogo Activo") && landing.includes("reached the Active Catalogue") && landing.includes("den aktiven Katalog erreicht haben"));
  check("y su descripción para buscadores también", !lee("src/app/ctcx-public-catalogue/page.tsx").includes("Solo lotes publicados."));
  const noEncontrado = lee("src/app/ctcx-public-catalogue/[codigo]/not-found.tsx");
  const vista = lee("src/components/catalogo/LoteNoEncontrado.tsx");
  check("una referencia que no lleva a un lote pinta «no encontramos ese lote», con el buscador y las puertas del portal (y responde 404)", noEncontrado.includes("<LoteNoEncontrado />") && vista.includes("<BuscadorDeLote />") && vista.includes("<PuertasDelPortal />") && vista.includes('titulo: "No encontramos ese lote"'));
}

if (fallos.length) {
  console.error(`✗ qa-catalogo-publico: ${fallos.length} fallo(s), ${ok} OK\n`);
  for (const f of fallos) console.error("   " + f);
  process.exit(1);
}
console.log(`✓ qa-catalogo-publico: ${ok} comprobaciones OK, 0 fallos`);
