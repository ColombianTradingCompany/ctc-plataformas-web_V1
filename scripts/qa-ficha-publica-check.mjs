// Guardián de lo PÚBLICO de un lote: el Dossier público (V5.198) y sus puertas.
//
//   node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/qa-ficha-publica-check.mjs
//
// LO QUE PROTEGE. Desde la V4.42 la cara pública de un lote era una «ficha técnica» proyectada de `lots.datasheet` con una lista
// blanca (`fichaPublica.ts`). Desde la V5.198 (owner, 2026-10-10: «El Datasheet va a ser reemplazado por una versión simplificada
// del Dossier que omite los enlaces al pasaporte y la visa») esa cara es el DOSSIER PÚBLICO del CTCx Public Catalogue. El dossier
// del productor reúne MUCHO más que la ficha: el nombre, el contacto, el avatar y la galería del productor, las coordenadas y el
// polígono de la finca, la vereda, la tenencia, los siete criterios del Pasaporte EUDR, la DDS, lo que el productor declaró, las
// anotaciones de mejora, las conjeturas, el número de cada certificado y la marca de agua con su nombre. Ninguno sale.
//
// V5.202 (owner, 2026-10-10): el Dossier público «necesita mantener el Watermark y omitir info que haga fácil circumventar a CTCx
// para llegar al Productor». Pasan a PRIVADO: el nombre de la finca, el municipio, su historia y sus características (texto libre:
// una historia nombraba su vereda), la foto de perfil de la finca, el área, la infraestructura de un canal propio, y el nombre del
// lote y el del producto (solían llevar la finca: el público lleva el nombre que genera la vista). Y lleva la marca de agua
// PÚBLICA, que no nombra a nadie.
// V5.202, tras la revisión del nodo final (mismo día): ninguna foto del productor sale sin que CTCx la APRUEBE (`lot_fotos_publicas`)
// y sale UNA, la portada (el grado lleva la imagen de CTCx Selection o la ilustración por defecto); las variedades y el proceso
// solo si son canónicos (texto libre del productor: lo desconocido se omite); la altitud en tramos de 100 m; el mapa regional por
// el NOMBRE del departamento, sin coordenadas; la marca de agua como mosaico SVG; y un lote de CTCx Selection vuelve a enseñar la
// descripción de su perfil (texto de CTCx), bajo su propio rótulo.
//
// La defensa sigue siendo una LISTA BLANCA (`lib/kaffetal/dossierPublico.ts`): el objeto público se ARMA campo por campo. Este
// guardián la prueba con un dossier LLENO DE CENTINELAS —un valor reconocible en cada campo privado— y comprueba que ninguno
// sobrevive. Y vigila las puertas: la compuerta es la vista `public_lot_vitrina`; el dossier se lee DESPUÉS.

import { readFileSync } from "node:fs";
import { dossierPublico } from "../src/lib/kaffetal/dossierPublico.ts";
import { textoDeMarcaPublica } from "../src/lib/kaffetal/blindaje.ts";
import { IMAGEN_DE_ORIGEN_POR_DEFECTO } from "../src/lib/imagenDeOrigen.ts";
import { fotosAprobadasEnOrden, fotosPublicasDelLote } from "../src/lib/catalogo/fotosPublicas.ts";

let ok = 0;
const fallos = [];
const check = (n, c) => (c ? ok++ : fallos.push(n));
const lee = (r) => readFileSync(new URL(`../${r}`, import.meta.url), "utf8").replace(/\r\n/g, "\n");
const sinComentarios = (t) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

// ── Un dossier COMPLETO con centinelas: lo privado lleva «PRIVADO_…», lo público «PUBLICO_…» ──
const finca = {
  id: "PRIVADO_finca_id",
  code: "PRIVADO_finca_code",
  name: "PRIVADO_finca",
  vereda: "PRIVADO_vereda",
  municipio: "PRIVADO_municipio",
  departamento: "PUBLICO_departamento",
  pais: "Colombia",
  hectares: 31.29,
  altitud: 1624,
  lat: 6.48765432,
  lng: -73.2654321,
  vertices: 4,
  poligono: [{ lat: 6.48711111, lng: -73.26522222 }],
  sistema: "sombra",
  siembra: "PRIVADO_siembra",
  tenencia: "PRIVADO_tenencia",
  infra: ["patios", "tostadora", "molino", "empacadora_consumible", "vacio"],
  historia: "PRIVADO_historia",
  caracteristicas: "PRIVADO_caracteristicas",
  fotoUrl: "PRIVADO_foto_finca",
  kg: 777,
  pasaporte: { code: "apta", label: "Apta", tone: "ok" },
  criterios: [{ id: "tenencia", estado: "ok", detalle: "PRIVADO_criterio" }],
};
const completo = {
  lang: "es",
  lot: {
    id: "lote-1", name: "PRIVADO_lote", reference: "CTC-L-ABCD1234", publicCode: "PRIVADO_codigo_viejo", productName: "PRIVADO_producto", species: "Arabica",
    // V5.202 (nodo final): la variedad y el proceso los ESCRIBE el productor: una variedad que no es canónica («Castillo PRIVADO_finca»,
    // como si alguien escribiera la finca junto a la variedad) y un proceso especial libre no salen; «gesha» sale con su nombre canónico.
    variety: "Gesha", variedades: [{ nombre: "gesha", pct: 60 }, { nombre: "Castillo PRIVADO_finca", pct: 40 }], process: "Lavado + PRIVADO_proceso_especial", altitudeM: 1794, harvestFrom: null, harvestTo: null, archetype: null,
    declarado: { humedad: 99.11, densidad: 999, aw: 0.999, factor: 99.99, noSabe: ["PRIVADO_nosabe"] },
  },
  productor: { nombre: "PRIVADO_productor", empresa: "PRIVADO_empresa", contacto: "PRIVADO_contacto", avatarUrl: "PRIVADO_avatar", galeria: ["PRIVADO_galeria"] },
  fincas: [finca, { ...finca, name: "PRIVADO_otra_finca", fotoUrl: "PRIVADO_otra_foto" }],
  mapaUrl: "PRIVADO_mapa_cafetales",
  ubicacionUrl: "PUBLICO_mapa_regional",
  visa: { status: { code: "eudr_ready", label: "Lista", tone: "ok" }, paisRiesgo: "estándar", dds: { reference: "PRIVADO_dds", verificationCode: "PRIVADO_dds_codigo", filedAt: null }, sellos: [{ label: "PUBLICO_sello", verified: true }] },
  grado: { grado: null, punto: null, triada: { triada: { variedad: "A", proceso: "C", reconocimiento: "C" }, variedad: { por: "" }, proceso: { por: "" }, reconocimiento: { por: "" } }, puntaje: null },
  // En el dossier completo la imagen del grado puede salir de la galería del productor o de otra finca: no se hereda.
  imagenGrado: { url: "PRIVADO_imagen_grado", porDefecto: false },
  fotosDelLote: ["PUBLICO_foto_lote_1", "PUBLICO_foto_lote_2"],
  variedadesInfo: [{ nombre: "gesha", pct: 60, ficha: null }, { nombre: "Castillo PRIVADO_finca", pct: 40, ficha: null }],
  lectura: { intro: "PUBLICO_lectura", parrafos: [], sintesis: null },
  conjeturas: [{ titulo: "PRIVADO_conjetura", texto: "PRIVADO_conjetura", area: "taza", tono: "atencion", icono: "taza", evidencia: "PRIVADO_evidencia" }],
  evaluacion: { sca: 85, factor: 92, fecha: "2026-10-01", fuente: "q_grader_batch" },
  caracterizacion: {
    b1: { variedades: [{ nombre: "PRIVADO_b1", pct: "100", proceso: "" }], pares: [{ k: "PRIVADO_b1", v: "PRIVADO_b1" }] },
    b2: { sca: null, cva: null, rueda: [{ ruta: "PUBLICO_rueda", detalle: "", comentario: "PUBLICO_comentario" }], descriptivo: [], perfil: "PUBLICO_perfil" },
    b3: { pares: [{ k: "PUBLICO_b3", v: "1" }], defectos: [], mallas: [], estadoMallas: null, notas: "PRIVADO_notas_del_analisis" },
    anotaciones: [{ id: "x", nota: "PRIVADO_anotacion", ruta: "PRIVADO_anotacion", causa: "PRIVADO_causa" }],
    cifras: null,
  },
  ficha: { atributos: { PRIVADO_ficha: 8 } },
  fichaSource: "productor",
  certificates: [{ schemeLabel: "PUBLICO_certificado", certNumber: "PRIVADO_numero_certificado", validFrom: "2026-01-01", validTo: "2027-01-01" }],
  catalogoUrl: "PUBLICO_catalogo",
  qrSvg: "<svg/>",
  generatedOn: "2026-10-10T00:00:00Z",
  blindaje: { puedeImprimir: false, marca: "PRIVADO_marca_con_el_productor" },
};
const OPC = { url: "/ctcx-public-catalogue/CTC-L-ABCD1234", volver: "/ctcx-public-catalogue", ctcx: null, nombre: "PUBLICO_nombre" };

// ── 1. Ni un centinela privado sobrevive a la proyección ───────────────────
{
  const pub = dossierPublico(completo, OPC);
  const json = JSON.stringify(pub);
  const coladas = [...new Set(json.match(/PRIVADO_[a-z_]+/g) ?? [])];
  check(`ningún dato privado sale en el dossier público${coladas.length ? ` (${coladas.join(", ")})` : ""}`, coladas.length === 0);
  check("ni las coordenadas ni el polígono de la finca", !json.includes("6.487") && !json.includes("-73.265") && pub.fincas[0].lat === null && pub.fincas[0].poligono.length === 0 && pub.mapaUrl === null);
  check("ni lo que el productor declaró (no se exhibe su diferencia con lo medido)", !json.includes("99.11") && !json.includes("999") && pub.lot.declarado.noSabe.length === 0);
  check("y sí sale lo que debe salir: nombre público, región, la foto aprobada, taza, lectura, certificado sin número, el mapa regional", ["PUBLICO_nombre", "PUBLICO_departamento", "PUBLICO_foto_lote_1", "PUBLICO_mapa_regional", "PUBLICO_comentario", "PUBLICO_perfil", "PUBLICO_lectura", "PUBLICO_certificado", "PUBLICO_sello", "PUBLICO_b3"].every((k) => json.includes(k)));
  check("UNA sola finca (la que se enseña), sin el código interno", pub.fincas.length === 1 && pub.fincas[0].code === "" && pub.fincas[0].id === "");
  check("el documento sabe que es público: su dirección y la vuelta a «Find my Lot»", pub.publico?.url === "/ctcx-public-catalogue/CTC-L-ABCD1234" && pub.publico.volver === "/ctcx-public-catalogue");

  // V5.202: lo que llevaba al productor.
  const f = pub.fincas[0];
  check("V5.202 · el nombre del lote es el PÚBLICO (el de la vista), sin el del lote ni el del producto", pub.lot.name === "PUBLICO_nombre" && pub.lot.productName === null);
  check("V5.202 · sin la finca: ni su nombre, ni el municipio, ni la vereda, ni el área", f.name === "" && f.municipio === null && f.vereda === null && f.hectares === null && !json.includes("31.29"));
  check("V5.202 · sin la historia ni las características de la finca (texto libre)", f.historia === null && f.caracteristicas === null);
  check("V5.202 · la infraestructura, sin lo que delata un canal propio (tostadora, molino, empacadora, empaque al vacío)", JSON.stringify(f.infra) === JSON.stringify(["patios"]));
  // V5.202 (nodo final): UNA foto, la portada; nunca una segunda en el grado (una segunda foto era la cara de una persona).
  check("V5.202 · UNA foto del lote, la portada; el grado lleva la ilustración de CTCx, nunca otra foto del lote", f.fotoUrl === "PUBLICO_foto_lote_1" && pub.fotosDelLote.length === 1 && !json.includes("PUBLICO_foto_lote_2") && pub.imagenGrado.url === IMAGEN_DE_ORIGEN_POR_DEFECTO && pub.imagenGrado.porDefecto === true);
  check("V5.202 · la variedad solo si es canónica y con su nombre canónico (lo libre del productor no sale)", pub.lot.variety === "Gesha" && JSON.stringify(pub.lot.variedades) === JSON.stringify([{ nombre: "Gesha", pct: 60 }]) && JSON.stringify(pub.variedadesInfo.map((v) => v.nombre)) === JSON.stringify(["Gesha"]));
  check("V5.202 · el proceso, solo el BASE de su enum (el especial es texto libre)", pub.lot.process === "Lavado" && !json.includes("proceso_especial"));
  check("V5.202 · la altitud en tramos de 100 m, hacia abajo (la exacta no sale)", pub.lot.altitudeM === 1700 && f.altitud === 1600 && !json.includes("1794") && !json.includes("1624"));
  check("V5.202 · un lote que no es de CTCx Selection no trae perfil de CTCx", pub.perfilCtcx === null);
  check("V5.202 · se queda la región: departamento y país", f.departamento === "PUBLICO_departamento" && f.pais === "Colombia");

  // La marca de agua PÚBLICA (V5.202): «necesita mantener el Watermark».
  const m = pub.blindaje.marca;
  check("NO se imprime (owner, V5.201: se consulta en línea)", pub.blindaje.puedeImprimir === false);
  check("V5.202 · lleva marca de agua: la PÚBLICA, con el catálogo, la referencia y «Se compra solo a través de CTCx»", m.includes("CTCx Public Catalogue") && m.includes("CTC-L-ABCD1234") && m.includes("Se compra solo a través de CTCx") && m.includes("ctcexport.com") && m.includes("2026-10-10") && !m.includes("PRIVADO_"));
  const en = dossierPublico({ ...completo, lang: "en" }, OPC).blindaje.marca;
  check("V5.202 · y en inglés, «Sourced only through CTCx»", en.includes("CTCx Public Catalogue") && en.includes("CTC-L-ABCD1234") && en.includes("Sourced only through CTCx"));
}

// ── 1b. Las fotos del lote: una, ninguna (V5.202) ──────────────────────────
// El cargador público ya trae solo la foto APROBADA (§6); la proyección, por si acaso, no deja pasar más de una.
{
  const una = dossierPublico({ ...completo, fotosDelLote: ["PUBLICO_foto_lote_1"] }, OPC);
  check("V5.202 · con UNA foto del lote: va a la portada y el grado lleva la ilustración de CTCx (sin repetirla)", una.fincas[0].fotoUrl === "PUBLICO_foto_lote_1" && una.imagenGrado.url === IMAGEN_DE_ORIGEN_POR_DEFECTO && una.imagenGrado.porDefecto === true);
  const mil = dossierPublico({ ...completo, lot: { ...completo.lot, variety: "PRIVADO_finca", variedades: [{ nombre: "PRIVADO_finca", pct: 100 }], process: "PRIVADO_proceso" }, variedadesInfo: [{ nombre: "PRIVADO_finca", pct: 100, ficha: null }] }, OPC);
  check("V5.202 · centinela de variedad «PRIVADO_finca»: ni en la variedad, ni en la lista, ni en las fichas; tampoco el proceso libre", mil.lot.variety === null && mil.lot.variedades.length === 0 && mil.variedadesInfo.length === 0 && mil.lot.process === null && !JSON.stringify(mil).includes("PRIVADO_"));
  const ninguna = dossierPublico({ ...completo, fotosDelLote: [] }, OPC);
  const json = JSON.stringify(ninguna);
  check("V5.202 · SIN fotos del lote: la portada no cae a la foto de la finca ni a la imagen del grado del dossier completo", ninguna.fincas[0].fotoUrl === null && ninguna.imagenGrado.porDefecto === true && !json.includes("PRIVADO_foto_finca") && !json.includes("PRIVADO_imagen_grado"));
  const sinNombre = dossierPublico(completo, { ...OPC, nombre: "  " });
  check("V5.202 · sin nombre público, el título es la referencia (nunca el nombre del lote)", sinNombre.lot.name === "CTC-L-ABCD1234" && sinNombre.lot.productName === null);
}

// ── 1c. La marca pública no tiene dónde poner un nombre (V5.202) ────────────
{
  const fuente = lee("src/lib/kaffetal/blindaje.ts");
  check("V5.202 · `textoDeMarcaPublica` recibe SOLO la referencia, la fecha y el idioma", fuente.includes('export function textoDeMarcaPublica(o: { referencia: string; fecha: Date | string; lang?: "es" | "en" }): string {'));
  check("V5.202 · y una «referencia» que no tiene forma de referencia no entra en la marca", !textoDeMarcaPublica({ referencia: "PRIVADO_Finca Los Pinos", fecha: "2026-10-10", lang: "es" }).includes("PRIVADO_") && textoDeMarcaPublica({ referencia: "CTC-L-016DF280", fecha: "2026-10-10", lang: "es" }) === "CTCx Public Catalogue · CTC-L-016DF280 · Se compra solo a través de CTCx · ctcexport.com · 2026-10-10");
}

// ── 2. D3.1: un lote de CTCx Selection se enseña a nombre de CTCx, sin nada de la finca ──
{
  const pub = dossierPublico(completo, { url: "/x", volver: "/y", ctcx: { nombre: "CTCx Selection", descripcion: "El perfil de CTCx", imagenUrl: "https://img/ctcx.jpg" }, nombre: "PUBLICO_nombre" });
  const json = JSON.stringify(pub);
  check("CTCx Selection: la finca es el rótulo de CTCx", pub.fincas[0].name === "CTCx Selection");
  check("CTCx Selection: no queda rastro del nombre, la historia, la foto ni la infraestructura de la finca", !/PRIVADO_/.test(json) && pub.fincas[0].infra.length === 0 && pub.fincas[0].hectares === null && pub.fincas[0].historia === null);
  check("CTCx Selection: la foto y la imagen del grado son las de CTCx (ni las del lote)", pub.fincas[0].fotoUrl === "https://img/ctcx.jpg" && pub.imagenGrado.url === "https://img/ctcx.jpg" && !json.includes("PUBLICO_foto_lote"));
  // V5.202 (nodo final): la descripción del perfil de CTCx Selection vuelve a salir, SOLO en sus lotes y bajo su propio rótulo (no
  // como «la historia de la finca»).
  check("V5.202 · CTCx Selection: la descripción de su perfil sale como perfil de CTCx (no como historia de la finca)", pub.perfilCtcx?.descripcion === "El perfil de CTCx" && pub.perfilCtcx?.rotulo === "CTCx Selection" && pub.fincas[0].historia === null);
}

// ── 3. Que siga siendo LISTA BLANCA ────────────────────────────────────────
{
  const fuente = sinComentarios(lee("src/lib/kaffetal/dossierPublico.ts"));
  check("la proyección no copia objetos enteros por un atajo (`...d`, `...f`, `Object.assign`)", !/\.\.\.(d|f|b2|b3|d\.lot|d\.visa|d\.caracterizacion)\b/.test(fuente) && !/Object\.assign/.test(fuente));
  // V5.202: además de tipos, importa la marca pública y la imagen por defecto (dos módulos SIN imports), el nombre público (que solo
  // importa DATOS: la Ficha, el Mapa de Variedades y su emparejador) y la vista (sin imports).
  const PUROS = ["./blindaje", "@/lib/imagenDeOrigen", "@/lib/catalogo/nombrePublico", "@/lib/catalogo/vitrinaVista"];
  const valores = [...fuente.matchAll(/^import (?!type )[^\n]* from "([^"]+)";/gm)].map((x) => x[1]);
  const importsDe = (r) => [...lee(r).matchAll(/^import (?!type )[^\n]* from "([^"]+)";/gm)].map((x) => x[1]);
  check(`es un módulo PURO (tipos, la marca, la imagen por defecto, el nombre público y la vista)${valores.length ? ` (${valores.join(", ")})` : ""}`, valores.every((x) => PUROS.includes(x)) && !/^import (?!type )/m.test(lee("src/lib/kaffetal/blindaje.ts")) && !/^import /m.test(lee("src/lib/imagenDeOrigen.ts")) && !/^import /m.test(lee("src/lib/catalogo/vitrinaVista.ts")));
  check("y el nombre público solo importa datos (la Ficha, el Mapa de Variedades y su emparejador, sin imports de valor)", JSON.stringify(importsDe("src/lib/catalogo/nombrePublico.ts").sort()) === JSON.stringify(["@/components/kaffetal-regal/ficha/fichaData", "@/lib/catacion/variedades", "@/lib/catacion/variedadesDatos"]) && importsDe("src/components/kaffetal-regal/ficha/fichaData.ts").length === 0 && importsDe("src/lib/catacion/variedadesDatos.ts").length === 0 && JSON.stringify(importsDe("src/lib/catacion/variedades.ts")) === JSON.stringify(["./variedadesDatos"]));
  check("queda escrito por qué es lista blanca", lee("src/lib/kaffetal/dossierPublico.ts").includes("LISTA BLANCA, NO NEGRA"));
}

// ── 4. Las puertas ─────────────────────────────────────────────────────────
{
  const vitrina = lee("src/lib/catalogo/vitrina.ts");
  const pagina = lee("src/app/ctcx-public-catalogue/[codigo]/page.tsx");
  const vieja = lee("src/app/docs/ficha/[lotId]/page.tsx");
  const datos = lee("src/lib/kaffetal/dossierDatos.ts");

  // La COMPUERTA es la vista, con el cliente anónimo; el dossier se lee DESPUÉS y sale por la proyección.
  check("la vitrina se lee con el cliente anónimo", /const anon = createEphemeralClient\(\);\n  const \{ data \} = await anon\.from\(VISTA_VITRINA\)/.test(vitrina));
  check("el dossier público se carga SOLO tras pasar la vista, en modo público, y sale por `dossierPublico()`", /const fila = await filaDeLaVitrina\(referencia\);\n  if \(!fila\) return null;\n  const datos = await cargarDossier\(createServiceRoleClient\(\), fila\.lot_id, lang, \{ publico: true \}\);/.test(vitrina) && vitrina.includes("return dossierPublico(datos, {"));
  check("V5.202 · y con el nombre PÚBLICO de la vista (no el del lote)", vitrina.includes("return dossierPublico(datos, { url: rutaDelLote(referencia), volver: RUTA_PORTAL, ctcx, nombre: fila.nombre });"));
  check("V5.202 · la foto de la tarjeta es del LOTE: la vitrina ni lee la foto de perfil de la finca", !sinComentarios(vitrina).includes("profile_photo_asset_id") && vitrina.includes('.select("datasheet->b4_files_foto")'));
  check("V5.202 · y es la primera que CTCx APROBÓ (la misma regla que la portada del Dossier público)", vitrina.includes("const [asset] = await fotosPublicasDelLote(service, fila.lot_id, fotosB4(fila2?.b4_files_foto));"));
  check("un código viejo (CTCX) se resuelve contra la vista pública del catálogo, NUNCA contra `lots`", vitrina.includes('anon.from("public_lot_catalog").select("lot_id").eq("public_code", codigo)') && !/from\("lots"\)[\s\S]{0,200}public_code/.test(vitrina));
  check("la página del portal pinta el dossier que devuelve la compuerta, o 404", pagina.includes("const datos = await dossier(c.codigo, lang);\n  if (!datos) notFound();\n  return <DossierCtcx d={datos} />;"));
  check("y no toca la base por su cuenta", !/createServiceRoleClient|createEphemeralClient|\.from\("/.test(sinComentarios(pagina)));
  check("la ficha técnica vieja (`/docs/ficha/[lotId]`) ya no sirve nada: redirige al dossier de un lote de la vitrina, o 404", vieja.includes("const fila = await filaDeLaVitrina(ctcLotReference(lotId));") && vieja.includes("if (!fila || fila.lot_id !== lotId) notFound();") && vieja.includes("permanentRedirect(") && !/datasheet|createServiceRoleClient/.test(sinComentarios(vieja)));
  check("la proyección de la ficha (`fichaPublica.ts`) y el paquete (`PaquetePublico.tsx`) se retiraron", !(await import("node:fs")).existsSync(new URL("../src/lib/catalogo/fichaPublica.ts", import.meta.url)) && !(await import("node:fs")).existsSync(new URL("../src/components/catalogo/PaquetePublico.tsx", import.meta.url)));

  // El cargador en modo público no lee al productor ni arma el mapa de los cafetales, y el pin regional va al departamento.
  check("cargador público: sin productor, sin galería, sin mapa de cafetales", datos.includes("publico ? Promise.resolve(new Map() as Awaited<ReturnType<typeof fetchProducerContacts>>) : fetchProducerContacts(") && datos.includes('publico ? Promise.resolve({ data: null }) : service.from("producer_profiles")') && datos.includes("const mapaUrl = publico ? null : mapaDeCafetalesUrl(enMapa);"));
  // V5.202 (nodo final): el mapa regional se centra por el NOMBRE del departamento y el país: ninguna coordenada de la finca en la URL.
  check("V5.202 · cargador público: el mapa regional por el NOMBRE del departamento, sin coordenadas de la finca", datos.includes("const ubicacionUrl = publico ? mapaDeRegionUrl(fincas[0]?.departamento, fincas[0]?.pais) : ancla ? mapaDeUbicacionUrl(ancla.lat!, ancla.lng!) : null;") && !datos.includes("aproxima(") && /export function mapaDeRegionUrl\(departamento: string \| null \| undefined, pais: string \| null \| undefined, size = "640x360"\): string \| null \{/.test(datos));
  {
    const { mapaDeRegionUrl } = await import("../src/lib/kaffetal/dossierDatos.ts");
    const antes = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = "CLAVE_DE_PRUEBA";
    const u = new URL(mapaDeRegionUrl("Santander", "Colombia"));
    const sinDep = new URL(mapaDeRegionUrl(null, null));
    if (antes === undefined) delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    else process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = antes;
    check("V5.202 · y la URL lleva el lugar en palabras («Santander, Colombia»), ni un número de coordenada", u.searchParams.get("center") === "Santander, Colombia" && u.searchParams.get("markers") === "color:0x3D0A8A|Santander, Colombia" && !/\d\.\d/.test(u.searchParams.get("center") + u.searchParams.get("markers")) && sinDep.searchParams.get("center") === "Colombia");
  }
  check("cargador público: la imagen del grado no sale de NINGUNA foto (ni del lote, ni de la galería, ni de otra finca): la decide `dossierPublico()`", datos.includes("const libre = publico ? undefined : [...fotosDelLote, galeriaIds[3], ...origen.slice(1).map((x) => x.f.profile_photo_asset_id)]"));
  check("V5.202 · cargador público: de las fotos del lote, solo las que CTCx APROBÓ y como mucho UNA (la portada)", datos.includes("const fotosDelLote = publico ? (await fotosPublicasDelLote(service, lot.id, b4)).slice(0, 1) : b4.slice(0, 2);"));
  check("V5.202 · cargador público: ni firma la foto de perfil de las fincas ni la pone en la finca", datos.includes("...(publico ? [] : origen.map((x) => x.f.profile_photo_asset_id))") && datos.includes("fotoUrl: !publico && f.profile_photo_asset_id ?"));
  check("V5.202 · cargador: las fotos del LOTE viajan aparte (las únicas que enseña el público)", datos.includes("fotosDelLote: fotosDelLote.map((id) => urls.get(id)).filter((u): u is string => !!u),"));
  check("el QR del dossier lleva a la dirección pública SOLO si el lote está en la vitrina", datos.includes('service.from("public_lot_vitrina").select("referencia").eq("lot_id", lotId).maybeSingle()') && datos.includes("const catalogoUrl = referenciaPublica ? `${SITIO}${rutaDelLote(referenciaPublica)}` : null;"));
  check("el Dossier del productor sigue con SU marca (referencia, su nombre, «Uso exclusivo con CTCx»)", datos.includes("marca: textoDeMarca({ referencia: ctcLotReference(lot.id), productor: producer?.fullName ?? null, fecha: new Date(), lang }),"));

  // V5.202: si una foto no se puede preparar, en público NO sale la URL firmada del original (trae su EXIF y el uid en la ruta).
  const { fotoParaImprimir } = await import("../src/lib/kaffetal/dossierDatos.ts");
  const original = "data:text/plain,PRIVADO_url_firmada_del_original";
  check("V5.202 · `fotoParaImprimir` en público: si falla, null (nunca la URL firmada del original)", (await fotoParaImprimir(original, true)) === null && (await fotoParaImprimir("nada://x", true)) === null);
  check("V5.202 · y para el productor sigue como estaba: si falla, el original (el dossier no se queda sin foto)", (await fotoParaImprimir(original, false)) === original && datos.includes("await fotoParaImprimir(url, publico)"));
}

// ── 5. El documento en modo público ────────────────────────────────────────
{
  const doc = lee("src/components/kaffetal-regal/dossier/DossierCtcx.tsx");
  const nav = lee("src/components/kaffetal-regal/dossier/NavegacionDelDossier.tsx");
  const css = lee("src/components/kaffetal-regal/dossier/dossier.module.css");
  const textos = lee("src/components/kaffetal-regal/dossier/textos.ts");
  check("en público no van la Visa ni la Mejora (ni sus enlaces al Pasaporte y a la Visa)", doc.includes('for (const fuera of ["visa", "mejora"]) {') && doc.includes("if (pub) {"));
  const iniOrigen = doc.indexOf("const origenPublico = pub ? (");
  const bloqueOrigen = doc.slice(iniOrigen, doc.indexOf(") : null;", iniOrigen));
  check("el origen público: región y altitud; sin productor, sin coordenadas, sin el mapa de los cafetales", doc.includes("pub ? origenPublico : <>") && iniOrigen > 0 && bloqueOrigen.length > 500 && !/d\.productor|finca\.lat|finca\.lng|finca\.poligono|finca\.vereda|finca\.tenencia|d\.mapaUrl/.test(bloqueOrigen));
  // V5.202: «omitir info que haga fácil circumventar a CTCx para llegar al Productor».
  const malas = bloqueOrigen.match(/finca\.name|finca\.historia|finca\.caracteristicas|finca\.municipio|finca\.hectares|t\.municipio|t\.area\b|t\.historia|t\.caracteristicas/g) ?? [];
  check(`V5.202 · el origen público no pinta la finca: ni nombre, ni municipio, ni área, ni historia o características${malas.length ? ` (${[...new Set(malas)].join(", ")})` : ""}`, malas.length === 0);
  // V5.202 (nodo final): el departamento y el país ya los dice la frase de arriba (`lugar`): no se repiten en los datos, que son dos.
  check("V5.202 · el origen público no repite departamento y país en los datos; altitud (en su tramo) y sistema en dos columnas", !/t\.departamento|t\.pais\b/.test(bloqueOrigen) && bloqueOrigen.includes("<div className={s.datos2}>") && bloqueOrigen.includes("<Dato k={t.altitud} v={tramoDeAltitud(altitudPub, loc)} />") && /\.datos2 \{ display: grid; grid-template-columns: repeat\(2, 1fr\);/.test(css));
  check("V5.202 · el dibujo de la altitud escribe el TRAMO, no la altitud exacta", bloqueOrigen.includes("<AltitudEnLaMontana metros={altitudPub + 50} etiqueta={t.altitud} loc={loc} rotulo={tramoDeAltitud(altitudPub, loc)} />") && lee("src/components/kaffetal-regal/dossier/figuras.tsx").includes("{rotulo || `${metros.toLocaleString(loc)} m`}"));
  check("V5.202 · la portada pública también da la altitud en su tramo", doc.includes("<Dato k={t.altitud} v={pub ? tramoDeAltitud(d.lot.altitudeM, loc) : "));
  check("V5.202 · un lote de CTCx Selection enseña la descripción de su perfil, bajo SU rótulo (no «La historia de la finca»)", bloqueOrigen.includes("{d.perfilCtcx && (") && bloqueOrigen.includes("<div className={s.k}>{t.perfilCtcx}</div>") && bloqueOrigen.includes("{d.perfilCtcx.descripcion}") && textos.includes('perfilCtcx: "Perfil de CTCx Selection"') && textos.includes('perfilCtcx: "CTCx Selection profile"'));
  check("V5.202 · el título público es el nombre del lote que da la vista, y el lugar no lleva el municipio", doc.includes("const titulo = pub ? d.lot.name : d.lot.productName || d.lot.name;") && doc.includes("const lugar = finca ? [pub ? null : finca.municipio, finca.departamento, finca.pais].filter(Boolean).join(\", \") : null;") && doc.includes("{!pub && titulo !== d.lot.name ? `${d.lot.name} · ` : \"\"}"));
  check("V5.202 · la foto de la portada pública es «Foto del lote · región» (o el rótulo de CTCx Selection), sin la finca en el pie ni en el alt", doc.includes("alt={pub ? `${rotuloCtcx ?? t.fotoLote} · ${titulo}` : `${t.fotoFinca} ${finca.name}`}") && doc.includes("[rotuloCtcx ?? t.fotoLote, lugar].filter(Boolean).join(\" · \")") && textos.includes('fotoLote: "Foto del lote"') && textos.includes('fotoLote: "Lot photo"'));
  check("sin lo declarado frente a lo medido, sin la matriz interna y sin número de certificado", doc.includes("].filter((x) => !pub && (x.dec || x.med));") && doc.includes("{!pub && (\n            <div>\n              <div className={s.h3}>{t.respaldoTitulo}</div>") && doc.includes("{!pub && <th>{t.numero}</th>}"));
  // V5.201 (owner, 2026-10-10): «El Dossier que abre el carrusel NO debe tener la opción de imprimir en PDF. Es más, quiero que
  // sea un html continuo con un botón en la parte inferior para navegar sus titulares».
  const iniPub = doc.indexOf("  if (pub) {\n    return (\n      <div className={cx(s.lienzo, s.lienzoContinuo, display.variable)} lang={d.lang}>");
  const ramaPublica = iniPub > 0 ? doc.slice(iniPub, doc.indexOf("\n  return (", iniPub)) : "";
  const iniSeccion = doc.indexOf("    pub ? (");
  const seccionPublica = iniSeccion > 0 ? doc.slice(iniSeccion, doc.indexOf("<section className={s.hoja}", iniSeccion)) : "";
  check("sin imprimir: ni el botón ni el candado, y sin el blindaje que bloquea copiar; con la vuelta a «Find my Lot»", ramaPublica.length > 300 && !/<BotonImprimir|<Blindaje|s\.candado/.test(ramaPublica) && ramaPublica.includes("<Link href={pub.volver} className={s.barraVolver}>") && doc.includes("{d.blindaje.marca ? <MarcaDeAgua texto={d.blindaje.marca} /> : null}"));
  check("un documento CONTINUO: cada sección con su ancla, sin cabecera ni pie de página por hoja (la línea legal va una vez)", seccionPublica.includes("<section className={s.seccionContinua} key={id} id={ancla(id)} tabIndex={-1}") && !/t\.pagina|s\.cabecera\b|s\.pie\b/.test(seccionPublica) && ramaPublica.includes("<article className={s.papel}>") && ramaPublica.includes("<div className={cx(s.pie, s.pieContinuo)}>") && doc.includes("const ancla = (id: Hoja[\"id\"]) => `dossier-${id}`;"));
  check("V5.202 · cada sección pública lleva la marca de agua PÚBLICA (y la sección es su contenedor relativo)", seccionPublica.includes("{d.blindaje.marca ? <MarcaDeAguaMosaico texto={d.blindaje.marca} id={`marca-${id}`} opacidad={0.06} /> : null}") && /\.seccionContinua \{ position: relative;/.test(css));
  // V5.202 (nodo final): un mosaico SVG (cubre cualquier alto: en móvil las 22 líneas giradas no llegaban abajo) y poco HTML.
  {
    const marca = lee("src/components/kaffetal-regal/blindaje/MarcaDeAgua.tsx");
    const mosaico = marca.slice(marca.indexOf("export function MarcaDeAguaMosaico("));
    check("V5.202 · la marca pública es un MOSAICO SVG: un patrón girado que un rectángulo al 100 % repite (tres copias del texto, no 132)", mosaico.length > 300 && mosaico.includes('patternUnits="userSpaceOnUse" patternTransform="rotate(-28)"') && mosaico.includes('<rect width="100%" height="100%" fill={`url(#${id})`} />') && (mosaico.match(/\{texto\}/g) ?? []).length === 3 && !mosaico.includes("Array.from(") && !mosaico.includes(".repeat("));
  }
  check("el índice de la portada lleva a cada sección (sin números de página)", doc.includes("<a href={`#${ancla(h.id)}`} className={s.indiceEnlace}>"));
  check("abajo, el botón que navega sus titulares: las secciones en su orden y la que se está leyendo", ramaPublica.includes("<NavegacionDelDossier") && ramaPublica.includes("secciones={hojas.map((h, i) => ({ id: ancla(h.id),") && nav.includes("new IntersectionObserver(") && nav.includes("destino.focus({ preventScroll: true });") && nav.includes('aria-current={x.id === actual ? "true" : undefined}') && css.includes("position: fixed;") && css.includes("bottom: calc(16px + env(safe-area-inset-bottom, 0px));"));
  check("si alguien imprime desde el navegador, sale solo el aviso de que se consulta en línea", ramaPublica.includes("<p className={s.soloImpresion}>") && css.includes(".lienzoContinuo > * { display: none !important; }") && css.includes(".lienzoContinuo > .soloImpresion { display: block !important;") && textos.includes("soloEnLinea: \"Este Dossier se consulta en línea") && textos.includes("soloEnLinea: \"This dossier is read online"));
  check("el del productor sigue en hojas A4, con su botón de imprimir y su blindaje", doc.includes("d.blindaje.puedeImprimir ? <BotonImprimir label={t.imprimir} />") && doc.includes("<Blindaje puedeImprimir={d.blindaje.puedeImprimir} aviso={AVISO_SIN_CONTRATO[d.lang]} />") && css.includes(".hoja { margin: 0; box-shadow: none; break-after: page;"));
}

// ── 6. Las fotos públicas: ninguna sin la aprobación de CTCx (V5.202, nodo final) ──
// La revisión de privacidad del 2026-10-10: la segunda foto B4 de un lote era el primer plano de una cara; la portada de otro, una
// persona junto a la casa. Ninguna foto de la cámara del productor sale en público sin que CTCx la apruebe, foto por foto.
{
  check("V5.202 · las aprobadas salen en el ORDEN de la Ficha y sin repetir (la primera es la portada)", JSON.stringify(fotosAprobadasEnOrden(["a1", "B2", "c3", "a1"], new Set(["c3", "a1", "b2"]))) === JSON.stringify(["a1", "B2", "c3"]) && fotosAprobadasEnOrden(["a1", "b2"], new Set()).length === 0);
  // Falla CERRADA: sin la tabla (la migración no se aplicó) o con un error, ninguna foto.
  const falso = (respuesta) => ({ from: () => ({ select: () => ({ eq: async () => respuesta }) }) });
  check("V5.202 · falla CERRADA: sin la tabla o con un error de lectura, NINGUNA foto pública", (await fotosPublicasDelLote(falso({ data: null, error: { code: "42P01", message: "relation lot_fotos_publicas does not exist" } }), "l", ["a1"])).length === 0 && (await fotosPublicasDelLote(falso({ data: [{ asset_id: "A1" }], error: null }), "l", ["a1", "b2"])).join() === "a1");

  const sql = lee("docs/migraciones/2026-10-10_fotos_publicas.sql");
  const sqlSin = sql.replace(/--[^\n]*/g, "");
  check("V5.202 · migración: la tabla de aprobaciones (lote, foto, quién, cuándo) con su llave y sus cascadas", sqlSin.includes("create table if not exists public.lot_fotos_publicas (") && sqlSin.includes("lot_id uuid not null references public.lots(id) on delete cascade,") && sqlSin.includes("asset_id uuid not null references public.media_assets(id) on delete cascade,") && sqlSin.includes("aprobada_por uuid references public.profiles(id) on delete set null,") && sqlSin.includes("primary key (lot_id, asset_id)"));
  check("V5.202 · migración: solo service role (RLS activa y SIN políticas; anon y authenticated, nada) y en una transacción", sqlSin.includes("alter table public.lot_fotos_publicas enable row level security;") && !/create policy/i.test(sqlSin) && sqlSin.includes("revoke all on public.lot_fotos_publicas from public, anon, authenticated;") && /^begin;$/m.test(sqlSin) && /^commit;$/m.test(sqlSin));

  const acciones = lee("src/app/ocp/(app)/kr/fotosPublicasActions.ts");
  const ui = lee("src/app/ocp/(app)/kr/FotosPublicas.tsx");
  const lote = lee("src/app/ocp/(app)/kr/LoteSeccion.tsx");
  const cuerpo = (n) => acciones.slice(acciones.indexOf(`export async function ${n}(`), acciones.indexOf("\n}\n", acciones.indexOf(`export async function ${n}(`)));
  for (const n of ["aprobarFotoPublica", "retirarFotoPublica"]) {
    const c = cuerpo(n);
    check(`V5.202 · ${n}: clase EMITE por la compuerta del OCP, deja su fila en audit_log, revalida y nunca lanza`, acciones.startsWith('"use server"') && c.includes('const permiso = await permisoDeEscritura("ocp", "emite");') && c.includes("if (!permiso.ok) return { ok: false, error: permiso.error };") && c.includes("await dejaRastro(") && c.includes("revalidar();") && !/\bthrow\b/.test(c));
  }
  check("V5.202 · aprobar exige que la foto sea una foto B4 de ESE lote", cuerpo("aprobarFotoPublica").includes("if (!(await esFotoDelLote(lotId, assetId)))") && acciones.includes('entity_type: "lot",'));
  check("V5.202 · la vista del lote del OCP pinta las fotos B4 con «Pública en la vitrina: sí/no» y la advertencia antes de aprobar", lote.includes("<FotosPublicas") && ui.includes("Pública en la vitrina: <b>{publica ? \"sí\" : \"no\"}</b>") && ui.includes("Antes de aprobar, revise la foto entera: {CONSEJO_FOTO_PUBLICA.charAt(0).toLowerCase() + CONSEJO_FOTO_PUBLICA.slice(1)}") && ui.includes("aprobarFotoPublica.bind(null, lotId, f.assetId)") && ui.includes("retirarFotoPublica.bind(null, lotId, f.assetId)"));
  const consejo = lee("src/lib/catalogo/fotosPublicas.ts");
  check("V5.202 · el productor ve el consejo al subir sus fotos B4 (el mismo texto que CTCx al aprobar): sin personas, letreros, logos ni contacto", consejo.includes('export const CONSEJO_FOTO_PUBLICA = "Sin personas reconocibles, letreros, logos ni datos de contacto') && lee("src/components/kaffetal-regal/ficha/panes/PaneB4.tsx").includes("`${CONSEJO_FOTO_PUBLICA} CTCx revisa cada foto antes de enseñarla en el catálogo público.`"));
  const ruta = lee("src/app/api/catalogo/foto/[referencia]/route.ts");
  check("V5.202 · la foto pública se cachea 10 minutos (más una hora de reserva), no un día: retirarla se nota pronto", ruta.includes('"cache-control": "public, max-age=600, s-maxage=600, stale-while-revalidate=3600"') && !ruta.includes("86400"));
}

if (fallos.length) {
  console.error(`✗ qa-ficha-publica: ${fallos.length} fallo(s), ${ok} OK\n`);
  for (const f of fallos) console.error("   " + f);
  process.exit(1);
}
console.log(`✓ qa-ficha-publica: ${ok} comprobaciones OK, 0 fallos (dossier público con centinelas)`);
