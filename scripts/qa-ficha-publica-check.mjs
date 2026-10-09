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
// La defensa sigue siendo una LISTA BLANCA (`lib/kaffetal/dossierPublico.ts`): el objeto público se ARMA campo por campo. Este
// guardián la prueba con un dossier LLENO DE CENTINELAS —un valor reconocible en cada campo privado— y comprueba que ninguno
// sobrevive. Y vigila las puertas: la compuerta es la vista `public_lot_vitrina`; el dossier se lee DESPUÉS.

import { readFileSync } from "node:fs";
import { dossierPublico } from "../src/lib/kaffetal/dossierPublico.ts";

let ok = 0;
const fallos = [];
const check = (n, c) => (c ? ok++ : fallos.push(n));
const lee = (r) => readFileSync(new URL(`../${r}`, import.meta.url), "utf8").replace(/\r\n/g, "\n");
const sinComentarios = (t) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

// ── Un dossier COMPLETO con centinelas: lo privado lleva «PRIVADO_…», lo público «PUBLICO_…» ──
const finca = {
  id: "PRIVADO_finca_id",
  code: "PRIVADO_finca_code",
  name: "PUBLICO_finca",
  vereda: "PRIVADO_vereda",
  municipio: "PUBLICO_municipio",
  departamento: "PUBLICO_departamento",
  pais: "Colombia",
  hectares: 3,
  altitud: 1624,
  lat: 6.48765432,
  lng: -73.2654321,
  vertices: 4,
  poligono: [{ lat: 6.48711111, lng: -73.26522222 }],
  sistema: "sombra",
  siembra: "PRIVADO_siembra",
  tenencia: "PRIVADO_tenencia",
  infra: ["patios"],
  historia: "PUBLICO_historia",
  caracteristicas: "PUBLICO_caracteristicas",
  fotoUrl: "PUBLICO_foto_finca",
  kg: 777,
  pasaporte: { code: "apta", label: "Apta", tone: "ok" },
  criterios: [{ id: "tenencia", estado: "ok", detalle: "PRIVADO_criterio" }],
};
const completo = {
  lang: "es",
  lot: {
    id: "lote-1", name: "PUBLICO_lote", reference: "CTC-L-ABCD1234", publicCode: "PRIVADO_codigo_viejo", productName: "PUBLICO_producto", species: "Arabica",
    variety: "Gesha", variedades: [{ nombre: "Gesha", pct: 100 }], process: "Lavado", altitudeM: 1700, harvestFrom: null, harvestTo: null, archetype: null,
    declarado: { humedad: 99.11, densidad: 999, aw: 0.999, factor: 99.99, noSabe: ["PRIVADO_nosabe"] },
  },
  productor: { nombre: "PRIVADO_productor", empresa: "PRIVADO_empresa", contacto: "PRIVADO_contacto", avatarUrl: "PRIVADO_avatar", galeria: ["PRIVADO_galeria"] },
  fincas: [finca, { ...finca, name: "PRIVADO_otra_finca", fotoUrl: "PRIVADO_otra_foto" }],
  mapaUrl: "PRIVADO_mapa_cafetales",
  ubicacionUrl: "PUBLICO_mapa_regional",
  visa: { status: { code: "eudr_ready", label: "Lista", tone: "ok" }, paisRiesgo: "estándar", dds: { reference: "PRIVADO_dds", verificationCode: "PRIVADO_dds_codigo", filedAt: null }, sellos: [{ label: "PUBLICO_sello", verified: true }] },
  grado: { grado: null, punto: null, triada: { triada: { variedad: "A", proceso: "C", reconocimiento: "C" }, variedad: { por: "" }, proceso: { por: "" }, reconocimiento: { por: "" } }, puntaje: null },
  imagenGrado: { url: "PUBLICO_imagen_grado", porDefecto: false },
  variedadesInfo: [],
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

// ── 1. Ni un centinela privado sobrevive a la proyección ───────────────────
{
  const pub = dossierPublico(completo, { url: "/ctcx-public-catalogue/CTC-L-ABCD1234", volver: "/ctcx-public-catalogue", ctcx: null });
  const json = JSON.stringify(pub);
  const coladas = [...new Set(json.match(/PRIVADO_[a-z_]+/g) ?? [])];
  check(`ningún dato privado sale en el dossier público${coladas.length ? ` (${coladas.join(", ")})` : ""}`, coladas.length === 0);
  check("ni las coordenadas ni el polígono de la finca", !json.includes("6.487") && !json.includes("-73.265") && pub.fincas[0].lat === null && pub.fincas[0].poligono.length === 0 && pub.mapaUrl === null);
  check("ni lo que el productor declaró (no se exhibe su diferencia con lo medido)", !json.includes("99.11") && !json.includes("999") && pub.lot.declarado.noSabe.length === 0);
  check("y sí sale lo que debe salir: finca, región, historia, foto, taza, lectura, certificado sin número, el mapa regional", ["PUBLICO_finca", "PUBLICO_municipio", "PUBLICO_departamento", "PUBLICO_historia", "PUBLICO_caracteristicas", "PUBLICO_foto_finca", "PUBLICO_mapa_regional", "PUBLICO_comentario", "PUBLICO_perfil", "PUBLICO_lectura", "PUBLICO_certificado", "PUBLICO_sello", "PUBLICO_b3", "PUBLICO_producto"].every((k) => json.includes(k)));
  check("UNA sola finca (la que se enseña), sin el código interno", pub.fincas.length === 1 && pub.fincas[0].code === "" && pub.fincas[0].id === "");
  check("se puede imprimir y no lleva marca de agua (no hay productor que nombrar)", pub.blindaje.puedeImprimir === true && pub.blindaje.marca === "");
  check("el documento sabe que es público: su dirección y la vuelta a «Find my Lot»", pub.publico?.url === "/ctcx-public-catalogue/CTC-L-ABCD1234" && pub.publico.volver === "/ctcx-public-catalogue");
}

// ── 2. D3.1: un lote de CTCx Selection se enseña a nombre de CTCx, sin nada de la finca ──
{
  const pub = dossierPublico(completo, { url: "/x", volver: "/y", ctcx: { nombre: "CTCx Selection", descripcion: "El perfil de CTCx", imagenUrl: "https://img/ctcx.jpg" } });
  const json = JSON.stringify(pub);
  check("CTCx Selection: la finca es el rótulo de CTCx", pub.fincas[0].name === "CTCx Selection");
  check("CTCx Selection: no queda rastro del nombre, la historia, la foto ni la infraestructura de la finca", !json.includes("PUBLICO_finca") && !json.includes("PUBLICO_historia") && !json.includes("PUBLICO_caracteristicas") && !json.includes("PUBLICO_foto_finca") && pub.fincas[0].infra.length === 0 && pub.fincas[0].hectares === null);
  check("CTCx Selection: la foto y la imagen del grado son las de CTCx", pub.fincas[0].fotoUrl === "https://img/ctcx.jpg" && pub.imagenGrado.url === "https://img/ctcx.jpg");
}

// ── 3. Que siga siendo LISTA BLANCA ────────────────────────────────────────
{
  const fuente = sinComentarios(lee("src/lib/kaffetal/dossierPublico.ts"));
  check("la proyección no copia objetos enteros por un atajo (`...d`, `...f`, `Object.assign`)", !/\.\.\.(d|f|b2|b3|d\.lot|d\.visa|d\.caracterizacion)\b/.test(fuente) && !/Object\.assign/.test(fuente));
  check("es un módulo PURO (solo tipos)", !/^import (?!type )/m.test(fuente));
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
  check("un código viejo (CTCX) se resuelve contra la vista pública del catálogo, NUNCA contra `lots`", vitrina.includes('anon.from("public_lot_catalog").select("lot_id").eq("public_code", codigo)') && !/from\("lots"\)[\s\S]{0,200}public_code/.test(vitrina));
  check("la página del portal pinta el dossier que devuelve la compuerta, o 404", pagina.includes("const datos = await dossier(c.codigo, lang);\n  if (!datos) notFound();\n  return <DossierCtcx d={datos} />;"));
  check("y no toca la base por su cuenta", !/createServiceRoleClient|createEphemeralClient|\.from\("/.test(sinComentarios(pagina)));
  check("la ficha técnica vieja (`/docs/ficha/[lotId]`) ya no sirve nada: redirige al dossier de un lote de la vitrina, o 404", vieja.includes("const fila = await filaDeLaVitrina(ctcLotReference(lotId));") && vieja.includes("if (!fila || fila.lot_id !== lotId) notFound();") && vieja.includes("permanentRedirect(") && !/datasheet|createServiceRoleClient/.test(sinComentarios(vieja)));
  check("la proyección de la ficha (`fichaPublica.ts`) y el paquete (`PaquetePublico.tsx`) se retiraron", !(await import("node:fs")).existsSync(new URL("../src/lib/catalogo/fichaPublica.ts", import.meta.url)) && !(await import("node:fs")).existsSync(new URL("../src/components/catalogo/PaquetePublico.tsx", import.meta.url)));

  // El cargador en modo público no lee al productor ni arma el mapa de los cafetales, y el pin regional va a un decimal.
  check("cargador público: sin productor, sin galería, sin mapa de cafetales", datos.includes("publico ? Promise.resolve(new Map() as Awaited<ReturnType<typeof fetchProducerContacts>>) : fetchProducerContacts(") && datos.includes('publico ? Promise.resolve({ data: null }) : service.from("producer_profiles")') && datos.includes("const mapaUrl = publico ? null : mapaDeCafetalesUrl(enMapa);"));
  check("cargador público: el pin del mapa regional a un decimal (~11 km)", datos.includes("const aproxima = (v: number) => Math.round(v * 10) / 10;") && datos.includes("mapaDeUbicacionUrl(aproxima(ancla.lat!), aproxima(ancla.lng!), \"640x360\")"));
  check("cargador público: la imagen del grado nunca sale de la galería del productor", datos.includes("publico ? null : galeriaIds[3]"));
  check("el QR del dossier lleva a la dirección pública SOLO si el lote está en la vitrina", datos.includes('service.from("public_lot_vitrina").select("referencia").eq("lot_id", lotId).maybeSingle()') && datos.includes("const catalogoUrl = referenciaPublica ? `${SITIO}${rutaDelLote(referenciaPublica)}` : null;"));
}

// ── 5. El documento en modo público ────────────────────────────────────────
{
  const doc = lee("src/components/kaffetal-regal/dossier/DossierCtcx.tsx");
  check("en público no van la Visa ni la Mejora (ni sus enlaces al Pasaporte y a la Visa)", doc.includes('for (const fuera of ["visa", "mejora"]) {') && doc.includes("if (pub) {"));
  const iniOrigen = doc.indexOf("const origenPublico = pub ? (");
  const bloqueOrigen = doc.slice(iniOrigen, doc.indexOf(") : null;", iniOrigen));
  check("el origen público: región, altitud y finca; sin productor, sin coordenadas, sin el mapa de los cafetales", doc.includes("pub ? origenPublico : <>") && iniOrigen > 0 && bloqueOrigen.length > 500 && !/d\.productor|finca\.lat|finca\.lng|finca\.poligono|finca\.vereda|finca\.tenencia|d\.mapaUrl/.test(bloqueOrigen));
  check("sin lo declarado frente a lo medido, sin la matriz interna y sin número de certificado", doc.includes("].filter((x) => !pub && (x.dec || x.med));") && doc.includes("{!pub && (\n            <div>\n              <div className={s.h3}>{t.respaldoTitulo}</div>") && doc.includes("{!pub && <th>{t.numero}</th>}"));
  check("sin blindaje ni marca de agua, y con la vuelta a «Find my Lot»", doc.includes("{!pub && <Blindaje") && doc.includes("{d.blindaje.marca ? <MarcaDeAgua texto={d.blindaje.marca} /> : null}") && doc.includes("<Link href={pub.volver} className={s.barraVolver}>"));
}

if (fallos.length) {
  console.error(`✗ qa-ficha-publica: ${fallos.length} fallo(s), ${ok} OK\n`);
  for (const f of fallos) console.error("   " + f);
  process.exit(1);
}
console.log(`✓ qa-ficha-publica: ${ok} comprobaciones OK, 0 fallos (dossier público con centinelas)`);
