// ── V5.198 (owner, 2026-10-10) · el Dossier PÚBLICO: «una versión simplificada del Dossier que omite los enlaces al pasaporte
//    y la visa», y que reemplaza a la ficha técnica (datasheet) del catálogo ─────────────────────────────────────────────────
// El dossier del productor (`dossierDatos.ts`) reúne TODO lo del lote, la finca y el productor para el productor y el OCP. El
// público es otra cosa: lo lee cualquiera, sin sesión, desde la vitrina del Catálogo Activo y desde «Find my Lot». La regla de
// la casa para lo público (auditoría 2026-07-10, `qa-ficha-publica`) sigue intacta: la vitrina nunca enseña a la persona; ni la
// georreferencia del predio, ni la evaluación EUDR del proveedor, ni los datos fiscales salen (y desde la V5.202, tampoco la finca).
//
// LISTA BLANCA, NO NEGRA. El objeto público se ARMA campo por campo a partir del completo: lo que no se nombra aquí no sale, y un
// campo nuevo del dossier nace privado. Fuera: el productor (nombre, contacto, avatar, galería), las coordenadas y el polígono, la
// vereda, la tenencia, la fecha de siembra, el código interno de la finca, los criterios del Pasaporte, la DDS, lo que el productor
// declaró (para no exhibir su diferencia con lo medido), las anotaciones de mejora y las conjeturas (son devolución al productor),
// las notas internas del análisis físico, el número de cada certificado y la marca de agua con el nombre del productor.
// Un lote comprado en firme por CTCx Selection (D3.1) se enseña a nombre de CTCx, con su imagen y sin nada de la finca.
// V5.202 (owner, 2026-10-10): el Dossier público «necesita mantener el Watermark y omitir info que haga fácil circumventar a CTCx
// para llegar al Productor». Desde aquí la vitrina enseña la REGIÓN, no la finca: fuera también el nombre de la finca (y el del
// lote y el del producto, que solían llevarla: el nombre es el PÚBLICO que genera la vista), el municipio, la historia y las
// características (texto libre: una historia nombraba su vereda), la foto de perfil de la finca (solo fotos del LOTE), el área
// y la infraestructura que delata un canal propio (tostadora, molino, empacadora). Y lleva marca de agua: la pública, que no
// nombra a nadie (`textoDeMarcaPublica`).
// V5.202, tras la revisión del nodo final (mismo día): UNA sola foto, la portada, y solo si CTCx la aprobó (la filtra el cargador;
// el grado lleva la imagen de CTCx Selection o la ilustración por defecto, nunca otra foto del lote); las variedades solo si están
// en la lista canónica y con su nombre canónico, el proceso solo del enum de la Ficha (texto libre del productor: lo desconocido
// se omite); la altitud en tramos de 100 m; fuera también el empaque al vacío; y un lote de CTCx Selection vuelve a enseñar la
// descripción de su perfil (texto de CTCx), bajo un rótulo propio.
// PURO (tipos, la marca y la imagen por defecto, y dos módulos de datos: el nombre público y la vista): lo prueba el guardián con
// un dossier lleno de centinelas.

import type { DossierCtcxData, DossierFincaCtcx } from "./dossierDatos";
import { textoDeMarcaPublica } from "./blindaje";
import { IMAGEN_DE_ORIGEN_POR_DEFECTO } from "@/lib/imagenDeOrigen";
import { procesoPublico, variedadPublica } from "@/lib/catalogo/nombrePublico";
import { altitudPublica } from "@/lib/catalogo/vitrinaVista";

/** El perfil de CTCx Selection que reemplaza a la finca de un lote comprado en firme (null: el lote enseña su región). */
export type PerfilPublicoCtcx = { nombre: string; descripcion: string | null; imagenUrl: string | null } | null;

/** V5.202: la infraestructura que delata un canal propio del productor (tostar, moler, empacar para el consumidor, empacar al
 *  vacío) no sale. */
const INFRA_PRIVADA = new Set(["tostadora", "molino", "empacadora_consumible", "vacio"]);

/** V5.202 (nodo final): las variedades del lote en público: solo las canónicas, con su nombre canónico, sin repetir (si dos se
 *  vuelven la misma, sus porcentajes se suman). Lo que escribió el productor y no está en la lista NO sale. */
function variedadesPublicas(vs: { nombre: string; pct: number | null }[]): { nombre: string; pct: number | null }[] {
  const salida: { nombre: string; pct: number | null }[] = [];
  for (const v of vs) {
    const nombre = variedadPublica(v.nombre);
    if (!nombre) continue;
    const ya = salida.find((x) => x.nombre === nombre);
    if (ya) ya.pct = ya.pct != null && v.pct != null ? ya.pct + v.pct : ya.pct ?? v.pct;
    else salida.push({ nombre, pct: v.pct });
  }
  return salida;
}

function fincaPublica(f: DossierFincaCtcx, ctcx: PerfilPublicoCtcx, fotoDelLote: string | null): DossierFincaCtcx {
  return {
    id: "",
    code: "",
    // V5.202: la finca no se nombra; el lote de CTCx Selection lleva el rótulo de CTCx.
    name: ctcx ? ctcx.nombre : "",
    vereda: null,
    municipio: null,
    departamento: f.departamento,
    pais: f.pais,
    hectares: null,
    // V5.202 (nodo final): en tramos de 100 m (la exacta, con la variedad y el departamento, puede señalar una finca).
    altitud: altitudPublica(f.altitud),
    lat: null,
    lng: null,
    vertices: 0,
    poligono: [],
    sistema: ctcx ? null : f.sistema,
    siembra: null,
    tenencia: null,
    infra: ctcx ? [] : f.infra.filter((k) => !INFRA_PRIVADA.has(k)),
    historia: null,
    caracteristicas: null,
    // V5.202: nunca la foto de perfil de la finca: la portada lleva la foto del LOTE que CTCx aprobó (o la imagen de CTCx Selection).
    fotoUrl: ctcx ? ctcx.imagenUrl : fotoDelLote,
    kg: null,
    pasaporte: { code: f.pasaporte.code, label: f.pasaporte.label, tone: f.pasaporte.tone } as DossierFincaCtcx["pasaporte"],
    criterios: [],
  };
}

/** `nombre`: el nombre PÚBLICO del lote, el que genera la vista `public_lot_vitrina` (V5.202); nunca el del productor. */
export function dossierPublico(d: DossierCtcxData, o: { url: string; volver: string; ctcx: PerfilPublicoCtcx; nombre: string }): DossierCtcxData {
  const f0 = d.fincas[0] ?? null;
  const b2 = d.caracterizacion.b2;
  const b3 = d.caracterizacion.b3;
  // V5.202 (nodo final, 2026-10-10): UNA foto del lote, la portada (el cargador ya trae solo la que CTCx aprobó). La hoja del grado
  // lleva la imagen de CTCx Selection o la ilustración por defecto: nunca otra foto del lote (una era la cara de una persona).
  const fotos = d.fotosDelLote.filter((u) => !!u).slice(0, 1);
  const nombre = o.nombre.trim() || d.lot.reference;
  const variedades = variedadesPublicas(d.lot.variedades);
  const descripcionCtcx = o.ctcx?.descripcion?.trim() || null;
  return {
    lang: d.lang,
    publico: { url: o.url, volver: o.volver },
    lot: {
      id: d.lot.id,
      name: nombre,
      reference: d.lot.reference,
      publicCode: null,
      productName: null,
      species: d.lot.species,
      // V5.202 (nodo final): la variedad y el proceso son texto que escribe el productor: solo lo canónico, lo demás se omite.
      variety: variedadPublica(d.lot.variety),
      variedades,
      process: procesoPublico(String(d.lot.process ?? "").split("+")[0]),
      altitudeM: altitudPublica(d.lot.altitudeM),
      harvestFrom: d.lot.harvestFrom,
      harvestTo: d.lot.harvestTo,
      archetype: d.lot.archetype,
      declarado: { humedad: null, densidad: null, aw: null, factor: null, noSabe: [] },
    },
    productor: { nombre: "", empresa: null, contacto: "", avatarUrl: null, galeria: [] },
    fincas: f0 ? [fincaPublica(f0, o.ctcx, fotos[0] ?? null)] : [],
    mapaUrl: null,
    ubicacionUrl: d.ubicacionUrl,
    visa: { status: { code: d.visa.status.code, label: d.visa.status.label, tone: d.visa.status.tone } as DossierCtcxData["visa"]["status"], paisRiesgo: d.visa.paisRiesgo, dds: null, sellos: d.visa.sellos.map((x) => ({ label: x.label, verified: x.verified })) },
    grado: d.grado,
    // V5.202: la imagen del grado no se toma del dossier completo (allí puede ser de la galería o de otra finca) ni de las fotos del
    // lote: la de CTCx Selection o la ilustración por defecto.
    imagenGrado: o.ctcx?.imagenUrl ? { url: o.ctcx.imagenUrl, porDefecto: false } : { url: IMAGEN_DE_ORIGEN_POR_DEFECTO, porDefecto: true },
    fotosDelLote: o.ctcx ? [] : fotos,
    // V5.202 (nodo final): la descripción del perfil de CTCx Selection (texto de CTCx, no del productor), solo para sus lotes.
    perfilCtcx: o.ctcx && descripcionCtcx ? { rotulo: o.ctcx.nombre, descripcion: descripcionCtcx } : null,
    // La ficha de cada variedad sale del Mapa de Variedades (dato de CTCx); el NOMBRE, el canónico, y solo si lo es.
    variedadesInfo: variedades.map((v) => ({ nombre: v.nombre, pct: v.pct, ficha: d.variedadesInfo.find((x) => variedadPublica(x.nombre) === v.nombre)?.ficha ?? null })),
    lectura: d.lectura,
    conjeturas: [],
    evaluacion: d.evaluacion,
    caracterizacion: {
      b1: null,
      b2: b2 ? { sca: b2.sca, cva: b2.cva, rueda: b2.rueda, descriptivo: b2.descriptivo, perfil: b2.perfil } : null,
      b3: b3 ? { pares: b3.pares, defectos: b3.defectos, mallas: b3.mallas, estadoMallas: b3.estadoMallas, notas: null } : null,
      anotaciones: [],
      cifras: d.caracterizacion.cifras ?? null,
    },
    ficha: null,
    fichaSource: null,
    certificates: d.certificates.map((c) => ({ schemeLabel: c.schemeLabel, certNumber: "", validFrom: c.validFrom, validTo: c.validTo })),
    catalogoUrl: d.catalogoUrl,
    qrSvg: d.qrSvg,
    generatedOn: d.generatedOn,
    // V5.201 (owner, 2026-10-10): el Dossier público no se imprime ni se guarda en PDF (se consulta en línea).
    // V5.202 (owner, 2026-10-10): «necesita mantener el Watermark»: la marca PÚBLICA, que no nombra al productor ni a la finca.
    blindaje: { puedeImprimir: false, marca: textoDeMarcaPublica({ referencia: d.lot.reference, fecha: d.generatedOn, lang: d.lang }) },
  };
}
