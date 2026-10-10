// ── V5.198 (owner, 2026-10-10) · el Dossier PÚBLICO: «una versión simplificada del Dossier que omite los enlaces al pasaporte
//    y la visa», y que reemplaza a la ficha técnica (datasheet) del catálogo ─────────────────────────────────────────────────
// El dossier del productor (`dossierDatos.ts`) reúne TODO lo del lote, la finca y el productor para el productor y el OCP. El
// público es otra cosa: lo lee cualquiera, sin sesión, desde la vitrina del Catálogo Activo y desde «Find my Lot». La regla de
// la casa para lo público (auditoría 2026-07-10, `qa-ficha-publica`) sigue intacta: la vitrina enseña la FINCA, nunca a la
// persona; ni la georreferencia del predio, ni la evaluación EUDR del proveedor, ni los datos fiscales salen.
//
// LISTA BLANCA, NO NEGRA. El objeto público se ARMA campo por campo a partir del completo: lo que no se nombra aquí no sale, y un
// campo nuevo del dossier nace privado. Fuera: el productor (nombre, contacto, avatar, galería), las coordenadas y el polígono, la
// vereda, la tenencia, la fecha de siembra, el código interno de la finca, los criterios del Pasaporte, la DDS, lo que el productor
// declaró (para no exhibir su diferencia con lo medido), las anotaciones de mejora y las conjeturas (son devolución al productor),
// las notas internas del análisis físico, el número de cada certificado y la marca de agua con el nombre del productor.
// Un lote comprado en firme por CTCx Selection (D3.1) se enseña a nombre de CTCx, con su imagen y sin nada de la finca.
// PURO (solo tipos): lo prueba el guardián con un dossier lleno de centinelas.

import type { DossierCtcxData, DossierFincaCtcx } from "./dossierDatos";

/** El perfil de CTCx Selection que reemplaza a la finca de un lote comprado en firme (null: el lote enseña su finca). */
export type PerfilPublicoCtcx = { nombre: string; descripcion: string | null; imagenUrl: string | null } | null;

function fincaPublica(f: DossierFincaCtcx, ctcx: PerfilPublicoCtcx): DossierFincaCtcx {
  return {
    id: "",
    code: "",
    name: ctcx ? ctcx.nombre : f.name,
    vereda: null,
    municipio: f.municipio,
    departamento: f.departamento,
    pais: f.pais,
    hectares: ctcx ? null : f.hectares,
    altitud: f.altitud,
    lat: null,
    lng: null,
    vertices: 0,
    poligono: [],
    sistema: ctcx ? null : f.sistema,
    siembra: null,
    tenencia: null,
    infra: ctcx ? [] : f.infra.slice(),
    historia: ctcx ? ctcx.descripcion : f.historia,
    caracteristicas: ctcx ? null : f.caracteristicas,
    fotoUrl: ctcx ? ctcx.imagenUrl : f.fotoUrl,
    kg: null,
    pasaporte: { code: f.pasaporte.code, label: f.pasaporte.label, tone: f.pasaporte.tone } as DossierFincaCtcx["pasaporte"],
    criterios: [],
  };
}

export function dossierPublico(d: DossierCtcxData, o: { url: string; volver: string; ctcx: PerfilPublicoCtcx }): DossierCtcxData {
  const f0 = d.fincas[0] ?? null;
  const b2 = d.caracterizacion.b2;
  const b3 = d.caracterizacion.b3;
  return {
    lang: d.lang,
    publico: { url: o.url, volver: o.volver },
    lot: {
      id: d.lot.id,
      name: d.lot.name,
      reference: d.lot.reference,
      publicCode: null,
      productName: d.lot.productName,
      species: d.lot.species,
      variety: d.lot.variety,
      variedades: d.lot.variedades.map((v) => ({ nombre: v.nombre, pct: v.pct })),
      process: d.lot.process,
      altitudeM: d.lot.altitudeM,
      harvestFrom: d.lot.harvestFrom,
      harvestTo: d.lot.harvestTo,
      archetype: d.lot.archetype,
      declarado: { humedad: null, densidad: null, aw: null, factor: null, noSabe: [] },
    },
    productor: { nombre: "", empresa: null, contacto: "", avatarUrl: null, galeria: [] },
    fincas: f0 ? [fincaPublica(f0, o.ctcx)] : [],
    mapaUrl: null,
    ubicacionUrl: d.ubicacionUrl,
    visa: { status: { code: d.visa.status.code, label: d.visa.status.label, tone: d.visa.status.tone } as DossierCtcxData["visa"]["status"], paisRiesgo: d.visa.paisRiesgo, dds: null, sellos: d.visa.sellos.map((x) => ({ label: x.label, verified: x.verified })) },
    grado: d.grado,
    imagenGrado: o.ctcx ? { url: o.ctcx.imagenUrl ?? d.imagenGrado.url, porDefecto: !o.ctcx.imagenUrl && d.imagenGrado.porDefecto } : d.imagenGrado,
    variedadesInfo: d.variedadesInfo,
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
    // V5.201 (owner, 2026-10-10): el Dossier público no se imprime ni se guarda en PDF (se consulta en línea); sin marca de
    // agua porque no hay productor que nombrar.
    blindaje: { puedeImprimir: false, marca: "" },
  };
}
