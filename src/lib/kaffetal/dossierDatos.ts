// ── V5.166 (owner, 2026-10-06): el dossier del lote con formato CTCx, por páginas ───────────────────────────────────────
// «Quiero un formato interesante, que use los recursos que hemos coleccionado del Lote, la Finca y el Productor, con las
// gráficas, el mapa y figuras conceptuales […] Organízalo en páginas […] de la marca CTCx», y que incluya la Visa EUDR.
// Este módulo REÚNE todo lo que el documento pinta (lote, finca(s) con su geometría y su foto, productor con su avatar y su
// galería, la Visa EUDR con sus criterios, el grado por El Punto y la Tríada, la caracterización B1/B2/B3 con sus cifras y
// las certificaciones). La ruta del productor (`/kaffetal-regal/dossier/[id]`) verifica la propiedad y lo llama; el
// documento (`components/kaffetal-regal/dossier/DossierCtcx.tsx`) es presentacional.

import type { SupabaseClient } from "@supabase/supabase-js";
import QRCode from "qrcode";
import sharp from "sharp";
import { fetchProducerContacts } from "@/lib/bcpProducers";
import { countryRiskFor, fincaEudrStatus, lotEudrStatus, type EudrStatus, type FincaEudrFields } from "@/lib/eudr";
import { fincaEudrFieldsDe } from "@/lib/ocp/fincaEudr";
import { deriveArchetype, deriveClaims, composicionDeVariedades, ARCHETYPE_LABEL, type ContributionInput } from "@/lib/lotComposition";
import { ORIGIN_CERTS, INTL_CERTS, type FichaFormData } from "@/components/kaffetal-regal/ficha/fichaData";
import { ctcLotReference, fincaCode } from "@/components/kaffetal-regal/data";
import { GRADO_POR_ID, esGradoValido, gradoDelLote, type Grado } from "@/lib/grados/definicion";
import { evaluacionQueRige } from "@/lib/evaluations";
import { rowToLotFicha, type FichaTecnicaData } from "@/lib/fichas/tipos";
import { puntoDeFila, type PuntoSca } from "@/lib/arena/punto";
import { triadaDeLaFicha, type TriadaDelLote } from "@/lib/pvc/triadaDelLote";
import { signedKaffetalMediaUrls } from "@/lib/kaffetalMedia";
import { caracterizacionDelDossier, planillaDeEvaluacion, type DossierCaracterizacion, type Lang } from "@/lib/kaffetal/dossierEvaluacion";
import { conjeturasDelLote, lecturaDeLaRueda, type Conjetura, type LecturaDeLaRueda } from "@/lib/kaffetal/conjeturas";
import { fichaDeVariedad, rangoDeAltitud, GRANO_LABEL } from "@/lib/catacion/variedades";
import { IMAGEN_DE_ORIGEN_POR_DEFECTO } from "@/lib/imagenDeOrigen";
import { ESTADOS_DE_CONTRATO_FIRMADO, textoDeMarca } from "@/lib/kaffetal/blindaje";
import { rutaDelLote } from "@/lib/catalogo/codigoPublico";

export type { Lang };

/** Un criterio de la debida diligencia de la finca: cumplido, pendiente o en contra. */
export type EstadoCriterio = "ok" | "pend" | "stop";
export type CriterioEudr = { id: "deforestacion" | "legal" | "tenencia" | "geo" | "ilegalidad" | "documentos" | "revision"; estado: EstadoCriterio; detalle: string | null };

export type DossierFincaCtcx = {
  id: string;
  code: string;
  name: string;
  vereda: string | null;
  municipio: string | null;
  departamento: string | null;
  pais: string;
  hectares: number | null;
  altitud: number | null;
  lat: number | null;
  lng: number | null;
  vertices: number;
  /** Los vértices del polígono (Art. 9 del Reglamento: la geolocalización del predio). */
  poligono: { lat: number; lng: number }[];
  sistema: string | null;
  siembra: string | null;
  tenencia: string | null;
  infra: string[];
  historia: string | null;
  caracteristicas: string | null;
  fotoUrl: string | null;
  kg: number | null;
  pasaporte: EudrStatus;
  criterios: CriterioEudr[];
};

export type DossierCtcxData = {
  lang: Lang;
  lot: {
    id: string;
    name: string;
    reference: string;
    publicCode: string | null;
    productName: string | null;
    species: string | null;
    variety: string | null;
    variedades: { nombre: string; pct: number | null }[];
    process: string | null;
    altitudeM: number | null;
    harvestFrom: string | null;
    harvestTo: string | null;
    archetype: string | null;
    /** Lo que el productor declaró en B1 (para ponerlo junto a lo medido); `noSabe` = lo que marcó «No lo sé». */
    declarado: { humedad: number | null; densidad: number | null; aw: number | null; factor: number | null; noSabe: string[] };
  };
  productor: { nombre: string; empresa: string | null; contacto: string; avatarUrl: string | null; galeria: string[] };
  fincas: DossierFincaCtcx[];
  /** El mapa de los cafetales (polígonos en dorado, pines numerados) y el de ubicación regional. */
  mapaUrl: string | null;
  ubicacionUrl: string | null;
  visa: {
    status: EudrStatus;
    paisRiesgo: string;
    dds: { reference: string; verificationCode: string | null; filedAt: string | null } | null;
    sellos: { label: string; verified: boolean }[];
  };
  grado: {
    grado: Grado | null;
    punto: PuntoSca | null;
    triada: TriadaDelLote;
    /** V5.167 (owner): «que el productor no vea el ajuste CTCx en el dossier». Solo el multiplicador de la tríada y los
     *  puntos finales; el ajuste (si lo hubo) va dentro de `puntos` y no se nombra en ninguna parte del documento. */
    puntaje: { puntos: number; mult: number } | null;
  };
  /** V5.167: la imagen de la hoja del grado: una foto del lote, o una del productor que no se haya usado, o la de CTCx. */
  imagenGrado: { url: string; porDefecto: boolean };
  /** V5.167: cada variedad del lote con su ficha del Mapa de Variedades (si la herramienta la tiene). */
  variedadesInfo: {
    nombre: string;
    pct: number | null;
    ficha: { nombre: string; grupo: string; tipo: string; color: string; lugar: string; historia: string; altitud: [number, number] | null; grano: string | null; notas: string[] } | null;
  }[];
  /** V5.167: la lectura de la rueda (como el reporte de la herramienta) y las conjeturas del lote. */
  lectura: LecturaDeLaRueda;
  conjeturas: Conjetura[];
  evaluacion: { sca: number | null; factor: number | null; fecha: string; fuente: "q_grader_batch" | "bcp_arena" | "producer_claim" } | null;
  caracterizacion: DossierCaracterizacion;
  ficha: FichaTecnicaData | null;
  fichaSource: "escaneo" | "productor" | "ctc" | null;
  certificates: { schemeLabel: string; certNumber: string; validFrom: string; validTo: string }[];
  /** La ficha pública del lote en el CTCx Public Catalogue (si ya tiene código público) y su QR en SVG. */
  catalogoUrl: string | null;
  qrSvg: string | null;
  generatedOn: string;
  /** V5.168 · el blindaje: la marca de agua (siempre) y si se puede imprimir (solo con contrato firmado de este lote). */
  blindaje: { puedeImprimir: boolean; marca: string };
  /** V5.198 · el Dossier PÚBLICO (CTCx Public Catalogue): su dirección y la de vuelta a «Find my Lot». Lo pone SOLO
   *  `dossierPublico()` (`lib/kaffetal/dossierPublico.ts`); con él, el documento omite la Visa, la mejora y lo privado. */
  publico?: { url: string; volver: string } | null;
};

type FincaRow = {
  id: string;
  name: string | null;
  municipio: string | null;
  departamento: string | null;
  pais: string | null;
  status: string | null;
  eudr_cert_shared: boolean | null;
  hectares: string | number | null;
  vereda: string | null;
  altitude_m: number | null;
  eudr_lat: string | number | null;
  eudr_lng: string | number | null;
  eudr_polygon_geojson: { lat: number; lng: number }[] | null;
  eudr_deforestation_free: boolean | null;
  eudr_legal_production: boolean | null;
  eudr_tenure: string | null;
  eudr_illegality_indicators: boolean | null;
  eudr_docs_available: boolean | null;
  eudr_mitigation_effective: boolean | null;
  eudr_planting_date: string | null;
  eudr_production_system: string | null;
  eudr_local_infra: string[] | null;
  history_text: string | null;
  characteristics_text: string | null;
  profile_photo_asset_id: string | null;
};

const FINCA_COLS =
  "id, name, municipio, departamento, pais, status, eudr_cert_shared, hectares, vereda, altitude_m, eudr_lat, eudr_lng, eudr_polygon_geojson, eudr_deforestation_free, eudr_legal_production, eudr_tenure, eudr_illegality_indicators, eudr_docs_available, eudr_mitigation_effective, eudr_planting_date, eudr_production_system, eudr_local_infra, history_text, characteristics_text, profile_photo_asset_id";

const numero = (v: unknown): number | null => {
  const x = Number(String(v ?? "").replace(",", "."));
  return String(v ?? "").trim() !== "" && Number.isFinite(x) ? x : null;
};

const SITIO = "https://www.ctcexport.com";

/** Los textos de las herramientas usan rayas largas; el documento no (guía de diseño): se vuelven comas. */
const sinRaya = (v: string) => v.replace(/\s*—\s*/g, ", ").replace(/,\s*([.,])/g, "$1").trim();

/** «castillo» → «Castillo»: el nombre tal como lo escribió el productor, con mayúscula inicial. */
export const capitaliza = (v: string) => (v ? v.charAt(0).toLocaleUpperCase("es") + v.slice(1) : v);

/** Una foto de Storage lista para el documento: orientada, con el lado mayor en 1.600 px y en JPEG (data URI). Si algo
 *  falla, la URL firmada original: el dossier nunca se queda sin la foto por optimizarla. */
async function fotoParaImprimir(url: string): Promise<string> {
  try {
    const r = await fetch(url);
    if (!r.ok) return url;
    const entrada = Buffer.from(await r.arrayBuffer());
    const salida = await sharp(entrada).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 78, mozjpeg: true }).toBuffer();
    return `data:image/jpeg;base64,${salida.toString("base64")}`;
  } catch {
    return url;
  }
}

/** El zoom que encuadra una caja de coordenadas en un mapa de `w`×`h` px (con margen), entre 3 y 18. */
function zoomPara(spanLat: number, spanLng: number, w: number, h: number): number {
  const z = (span: number, px: number) => (span <= 0 ? 18 : Math.log2((0.15 * px * 360) / (256 * span)));
  return Math.max(3, Math.min(18, Math.floor(Math.min(z(spanLng, w), z(spanLat * 1.0, h)))));
}

/**
 * V5.166: el mapa de los cafetales para el dossier. A diferencia de `mapaDeParcelasUrl` (que deja a Google encuadrar y
 * pinta los puntos de interés), este centra en la caja de la geometría con su propio zoom y apaga los rótulos ajenos: el
 * protagonista es el polígono. Polígono dorado con borde morado (la marca), pin morado numerado en cada cafetal.
 */
export function mapaDeCafetalesUrl(parcelas: { n: number; lat?: string | number | null; lng?: string | number | null; polygon?: { lat: number; lng: number }[] | null }[], w = 640, h = 400): string | null {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;
  const params = new URLSearchParams({ size: `${w}x${h}`, scale: "2", format: "jpg", maptype: "terrain", key: apiKey });
  const todos: { lat: number; lng: number }[] = [];
  for (const p of parcelas) {
    const poly = p.polygon && p.polygon.length >= 3 ? p.polygon : null;
    const lat = numero(p.lat);
    const lng = numero(p.lng);
    if (poly) {
      params.append("path", "color:0x3D0A8AFF|weight:3|fillcolor:0xFFCD0066|" + [...poly, poly[0]].map((v) => `${v.lat},${v.lng}`).join("|"));
      todos.push(...poly);
    }
    const punto = lat != null && lng != null ? { lat, lng } : poly ? { lat: poly.reduce((s, v) => s + v.lat, 0) / poly.length, lng: poly.reduce((s, v) => s + v.lng, 0) / poly.length } : null;
    if (punto) {
      params.append("markers", `color:0x3D0A8A|${p.n >= 1 && p.n <= 9 ? `label:${p.n}|` : ""}${punto.lat},${punto.lng}`);
      todos.push(punto);
    }
  }
  if (!todos.length) return null;
  const lats = todos.map((v) => v.lat);
  const lngs = todos.map((v) => v.lng);
  const [minLat, maxLat, minLng, maxLng] = [Math.min(...lats), Math.max(...lats), Math.min(...lngs), Math.max(...lngs)];
  params.set("center", `${(minLat + maxLat) / 2},${(minLng + maxLng) / 2}`);
  params.set("zoom", String(todos.length === 1 ? 15 : zoomPara(maxLat - minLat, maxLng - minLng, w, h)));
  params.append("style", "feature:poi|visibility:off");
  params.append("style", "feature:transit|visibility:off");
  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
}

/** El mapa de ubicación: la región, con un pin en la finca (sin satélite: la cuenta de Google es de la UE, ver `mapPreviewUrl`). */
export function mapaDeUbicacionUrl(lat: number, lng: number, size = "300x400"): string | null {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;
  const params = new URLSearchParams({ size, scale: "2", format: "jpg", maptype: "terrain", zoom: "6", center: `${lat},${lng}`, key: apiKey });
  params.append("markers", `color:0x3D0A8A|${lat},${lng}`);
  params.append("style", "feature:poi|visibility:off");
  params.append("style", "feature:road|visibility:simplified");
  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
}

/** Los siete criterios que la Visa hereda de la finca, leídos de su expediente. */
export function criteriosDeLaFinca(f: Pick<FincaRow, "eudr_deforestation_free" | "eudr_legal_production" | "eudr_tenure" | "eudr_illegality_indicators" | "eudr_docs_available" | "status" | "eudr_cert_shared">, geo: { vertices: number; punto: boolean }): CriterioEudr[] {
  const si = (v: boolean | null | undefined): EstadoCriterio => (v === true ? "ok" : v === false ? "stop" : "pend");
  return [
    { id: "deforestacion", estado: si(f.eudr_deforestation_free), detalle: null },
    { id: "legal", estado: si(f.eudr_legal_production), detalle: null },
    { id: "tenencia", estado: f.eudr_tenure ? "ok" : "pend", detalle: f.eudr_tenure },
    { id: "geo", estado: geo.vertices >= 3 || geo.punto ? "ok" : "pend", detalle: geo.vertices >= 3 ? `poligono:${geo.vertices}` : geo.punto ? "punto" : null },
    // La pregunta es «¿hay indicios?»: el «No» es lo que cumple.
    { id: "ilegalidad", estado: f.eudr_illegality_indicators === false ? "ok" : f.eudr_illegality_indicators === true ? "stop" : "pend", detalle: null },
    { id: "documentos", estado: si(f.eudr_docs_available), detalle: null },
    { id: "revision", estado: f.status === "approved" ? "ok" : f.status === "rejected" ? "stop" : "pend", detalle: f.status === "approved" && !f.eudr_cert_shared ? "sin_remitir" : null },
  ];
}

/** V5.198: `publico` = para el Dossier público (`lib/catalogo/vitrina.ts`): no lee al productor ni su galería, no arma el mapa de
 *  los cafetales y pone el pin del mapa regional a un decimal (~11 km). El documento que sale de aquí pasa además por
 *  `dossierPublico()`, la lista blanca: esto ahorra trabajo, aquello es la garantía. */
export async function cargarDossier(service: SupabaseClient, lotId: string, lang: Lang, opciones: { publico?: boolean } = {}): Promise<(DossierCtcxData & { producerId: string }) | null> {
  const publico = opciones.publico === true;
  const { data: lotRaw } = await service
    .from("lots")
    .select(
      `id, name, producer_id, public_code, grade, stage, ficha_variedad, ficha_proceso, ficha_altitud_m, harvest_from, harvest_to, datasheet,
       dds_reference, dds_verification_code, dds_filed_at, eudr_risk_level, eudr_mitigation_effective, fincas(${FINCA_COLS})`
    )
    .eq("id", lotId)
    .maybeSingle();
  type LotRow = {
    id: string;
    name: string;
    producer_id: string;
    public_code: string | null;
    grade: string | null;
    ficha_variedad: string | null;
    ficha_proceso: string | null;
    ficha_altitud_m: number | null;
    harvest_from: string | null;
    harvest_to: string | null;
    datasheet: Partial<FichaFormData> | null;
    dds_reference: string | null;
    dds_verification_code: string | null;
    dds_filed_at: string | null;
    eudr_risk_level: string | null;
    eudr_mitigation_effective: boolean | null;
    fincas: FincaRow | null;
  };
  const lot = lotRaw as LotRow | null;
  if (!lot) return null;

  // El origen: los aportes (F2), o la finca primaria si no los hay.
  type ContribJoin = { weight_kg: number | string | null; fincas: FincaRow | FincaRow[] | null };
  const { data: contribRaw } = await service.from("lot_contributions").select(`weight_kg, fincas(${FINCA_COLS})`).eq("lot_id", lotId);
  const contribJoins = ((contribRaw as ContribJoin[] | null) ?? [])
    .map((r) => ({ f: (Array.isArray(r.fincas) ? r.fincas[0] : r.fincas) as FincaRow | null, kg: r.weight_kg != null ? Number(r.weight_kg) : null }))
    .filter((x): x is { f: FincaRow; kg: number | null } => !!x.f);
  const origen = contribJoins.length ? contribJoins : lot.fincas ? [{ f: lot.fincas, kg: null }] : [];
  const camposDe = (f: FincaRow): FincaEudrFields => fincaEudrFieldsDe(f as unknown as Parameters<typeof fincaEudrFieldsDe>[0]);
  const fincaIds = origen.map((x) => x.f.id);

  const [producers, { data: perfilRaw }, { data: certRaw }, { data: fichaRaw }, { data: evalRaw }, { data: parcelasRaw }, { data: firmadosRaw }, { data: vitrinaRaw }] = await Promise.all([
    publico ? Promise.resolve(new Map() as Awaited<ReturnType<typeof fetchProducerContacts>>) : fetchProducerContacts(service, [lot.producer_id]),
    publico ? Promise.resolve({ data: null }) : service.from("producer_profiles").select("company_name, avatar_asset_id, gallery_asset_ids").eq("profile_id", lot.producer_id).maybeSingle(),
    fincaIds.length
      ? service.from("finca_certificates").select("finca_id, scheme, cert_number, valid_from, valid_to, status, verified_by_ctc").in("finca_id", fincaIds)
      : Promise.resolve({ data: [] }),
    service.from("lot_fichas").select("id, lot_id, source, title, data, source_files, model, confianza, observaciones, is_official, created_at").eq("lot_id", lotId).eq("is_official", true).maybeSingle(),
    service
      .from("lot_evaluations")
      .select("status, source, sca_total, punto, factor_rendimiento, created_at, rige_grado, physical_data, sca_data, rueda, rueda_detalle, ajuste_ctcx_puntos")
      .eq("lot_id", lotId),
    fincaIds.length ? service.from("finca_parcelas").select("finca_id, name, area_ha, lat, lng, polygon_geojson, position").in("finca_id", fincaIds).order("position") : Promise.resolve({ data: [] }),
    service.from("purchase_contracts").select("id").eq("lot_id", lotId).in("status", [...ESTADOS_DE_CONTRATO_FIRMADO]).limit(1),
    // V5.198: si el lote está en la vitrina (llegó al Triage), su Dossier público existe y el QR lleva a él.
    service.from("public_lot_vitrina").select("referencia").eq("lot_id", lotId).maybeSingle(),
  ]);

  const perfil = perfilRaw as { company_name: string | null; avatar_asset_id: string | null; gallery_asset_ids: string[] | null } | null;
  const galeriaIds = (perfil?.gallery_asset_ids ?? []).slice(0, 4);
  const fotosDelLote = (((lot.datasheet as { b4_files_foto?: { assetId: string }[] } | null)?.b4_files_foto ?? []) as { assetId: string }[]).map((x) => x.assetId).filter(Boolean).slice(0, 2);
  const firmadas = await signedKaffetalMediaUrls(service, [perfil?.avatar_asset_id, ...galeriaIds, ...fotosDelLote, ...origen.map((x) => x.f.profile_photo_asset_id)]);
  // Las fotos van ya orientadas, reducidas y en JPEG: el PDF del navegador incrusta un JPEG tal cual, pero una foto de
  // 5.700 px (o un WebP) la vuelve a codificar sin pérdida, y un dossier pesaba 29 MB.
  const urls = new Map(await Promise.all([...firmadas].map(async ([id, url]) => [id, await fotoParaImprimir(url)] as const)));
  const producer = producers.get(lot.producer_id);

  // ── Las fincas, con su geometría y su expediente EUDR ──
  type ParcelaRow = { finca_id: string; name: string | null; area_ha: string | number | null; lat: string | number | null; lng: string | number | null; polygon_geojson: { lat: number; lng: number }[] | null };
  const parcelas = (parcelasRaw as ParcelaRow[] | null) ?? [];
  const fincas: DossierFincaCtcx[] = origen.map(({ f, kg }) => {
    const poly = Array.isArray(f.eudr_polygon_geojson) ? f.eudr_polygon_geojson : [];
    const lat = numero(f.eudr_lat);
    const lng = numero(f.eudr_lng);
    return {
      id: f.id,
      code: fincaCode(f.id),
      name: f.name ?? "—",
      vereda: f.vereda,
      municipio: f.municipio,
      departamento: f.departamento,
      pais: f.pais || "Colombia",
      hectares: numero(f.hectares),
      altitud: f.altitude_m,
      lat,
      lng,
      vertices: poly.length,
      poligono: poly.filter((v) => Number.isFinite(Number(v.lat)) && Number.isFinite(Number(v.lng))).map((v) => ({ lat: Number(v.lat), lng: Number(v.lng) })),
      sistema: f.eudr_production_system,
      siembra: f.eudr_planting_date,
      tenencia: f.eudr_tenure,
      infra: f.eudr_local_infra ?? [],
      historia: f.history_text?.trim() || null,
      caracteristicas: f.characteristics_text?.trim() || null,
      fotoUrl: f.profile_photo_asset_id ? urls.get(f.profile_photo_asset_id) ?? null : null,
      kg,
      pasaporte: fincaEudrStatus(camposDe(f)),
      criterios: criteriosDeLaFinca(f, { vertices: poly.length, punto: lat != null && lng != null }),
    };
  });

  // El mapa: los cafetales de todas las fincas de origen (o la geometría de la finca si no tiene parcelas).
  const enMapa = fincas.flatMap((fi, i) => {
    const propias = parcelas.filter((p) => p.finca_id === fi.id);
    if (propias.length) return propias.map((p, j) => ({ n: i * 3 + j + 1, lat: p.lat, lng: p.lng, polygon: Array.isArray(p.polygon_geojson) ? p.polygon_geojson : null }));
    const f = origen[i].f;
    return [{ n: i + 1, lat: f.eudr_lat, lng: f.eudr_lng, polygon: Array.isArray(f.eudr_polygon_geojson) ? f.eudr_polygon_geojson : null }];
  });
  const mapaUrl = publico ? null : mapaDeCafetalesUrl(enMapa);
  const ancla = fincas.find((f) => f.lat != null && f.lng != null);
  // En público, el pin del mapa regional va a un decimal (~11 km): dice la región sin decir el predio (la URL del mapa la lee
  // cualquiera, y lleva las coordenadas).
  const aproxima = (v: number) => Math.round(v * 10) / 10;
  const ubicacionUrl = ancla ? (publico ? mapaDeUbicacionUrl(aproxima(ancla.lat!), aproxima(ancla.lng!), "640x360") : mapaDeUbicacionUrl(ancla.lat!, ancla.lng!)) : null;

  // ── La Visa EUDR del lote (heredada del Pasaporte de las fincas) ──
  const status = lotEudrStatus(lot, origen.map((x) => camposDe(x.f)));
  const SCHEME_LABEL: Record<string, string> = Object.fromEntries([...ORIGIN_CERTS, ...INTL_CERTS.map(([key, , label]) => [key, label] as [string, string])]);
  type CertRow = { finca_id: string; scheme: string; cert_number: string | null; valid_from: string | null; valid_to: string | null; status: string; verified_by_ctc: boolean };
  const certRows = (certRaw as CertRow[] | null) ?? [];
  const contribInputs: ContributionInput[] = origen.map((x) => ({
    fincaId: x.f.id,
    fincaName: x.f.name ?? "—",
    weightKg: x.kg,
    municipio: x.f.municipio ?? "",
    departamento: x.f.departamento ?? "",
    pais: x.f.pais || "Colombia",
  }));
  const sellos = deriveClaims(
    contribInputs,
    certRows.map((c) => ({ fincaId: c.finca_id, scheme: c.scheme, validFrom: c.valid_from, validTo: c.valid_to, verifiedByCtc: c.verified_by_ctc })),
    { from: lot.harvest_from, to: lot.harvest_to }
  )
    .filter((c) => c.claim)
    .map((c) => ({ label: SCHEME_LABEL[c.scheme] ?? c.scheme, verified: c.fullyVerified }));

  // ── El grado: El Punto y la Tríada (la tríada sale de la Ficha) ──
  const ds = (lot.datasheet ?? {}) as Partial<FichaFormData>;
  type EvalRow = {
    status: "pending" | "accepted" | "rejected";
    source: "q_grader_batch" | "bcp_arena" | "producer_claim";
    sca_total: number | null;
    punto: unknown;
    factor_rendimiento: number | null;
    created_at: string;
    rige_grado: boolean;
    physical_data: unknown;
    sca_data: unknown;
    rueda: unknown;
    rueda_detalle: unknown;
    ajuste_ctcx_puntos: number | null;
  };
  const rige = evaluacionQueRige((evalRaw as EvalRow[] | null) ?? []);
  const aceptada = rige && rige.status === "accepted" ? rige : null;
  const punto = aceptada ? puntoDeFila(aceptada) : null;
  const triada = triadaDeLaFicha(ds as Parameters<typeof triadaDeLaFicha>[0]);
  const calculo = punto ? gradoDelLote(punto.valor, triada.triada, aceptada?.ajuste_ctcx_puntos ?? 0) : null;
  const gradoGuardado = lot.grade && esGradoValido(lot.grade) ? GRADO_POR_ID[lot.grade] : null;

  const fichaRow = fichaRaw ? rowToLotFicha(fichaRaw as Parameters<typeof rowToLotFicha>[0]) : null;
  const archetype = deriveArchetype(contribInputs, composicionDeVariedades(ds.varieties));
  const variedades = (ds.varieties ?? [])
    .filter((v) => String(v.name ?? "").trim())
    .map((v) => ({ nombre: capitaliza(String(v.name).trim()), pct: numero(v.pct) }));

  const caracterizacion = caracterizacionDelDossier(ds as Record<string, unknown>, aceptada ? planillaDeEvaluacion(aceptada) : null, lang);
  // V5.198: la dirección pública del lote es su referencia (`CTC-L-…`), y solo existe si el lote está en la vitrina.
  const referenciaPublica = (vitrinaRaw as { referencia: string } | null)?.referencia ?? null;
  const catalogoUrl = referenciaPublica ? `${SITIO}${rutaDelLote(referenciaPublica)}` : null;
  const qrSvg = catalogoUrl ? await QRCode.toString(catalogoUrl, { type: "svg", margin: 0, color: { dark: "#17121F", light: "#00000000" } }) : null;

  return {
    producerId: lot.producer_id,
    lang,
    lot: {
      id: lot.id,
      name: lot.name,
      reference: ctcLotReference(lot.id),
      publicCode: lot.public_code,
      productName: ds.product_name || null,
      species: ds.species || null,
      variety: lot.ficha_variedad ? capitaliza(lot.ficha_variedad) : null,
      variedades,
      process: [ds.base_processing || lot.ficha_proceso, ds.special_processing].filter(Boolean).join(" + ") || null,
      altitudeM: lot.ficha_altitud_m ?? numero(ds.masl),
      harvestFrom: lot.harvest_from,
      harvestTo: lot.harvest_to,
      archetype: archetype ? ARCHETYPE_LABEL[archetype] : null,
      declarado: {
        humedad: numero(ds.green_bean_humidity),
        densidad: numero(ds.green_bean_density),
        aw: numero(ds.water_activity),
        factor: numero(ds.yield_factor_producer),
        noSabe: Array.isArray(ds.b1_unknown) ? (ds.b1_unknown as string[]) : [],
      },
    },
    productor: {
      nombre: producer?.fullName ?? "—",
      empresa: perfil?.company_name || producer?.companyName || null,
      contacto: [producer?.phone, producer?.email].filter(Boolean).join(" · "),
      avatarUrl: perfil?.avatar_asset_id ? urls.get(perfil.avatar_asset_id) ?? null : null,
      // La hoja de origen pinta hasta 3; la cuarta queda para la hoja del grado si no hay foto de lote.
      galeria: galeriaIds.slice(0, 3).map((id) => urls.get(id)).filter((u): u is string => !!u),
    },
    fincas,
    mapaUrl,
    ubicacionUrl,
    visa: {
      status,
      paisRiesgo: countryRiskFor(fincas[0]?.pais ?? "Colombia"),
      dds: lot.dds_reference ? { reference: lot.dds_reference, verificationCode: lot.dds_verification_code, filedAt: lot.dds_filed_at } : null,
      sellos,
    },
    grado: {
      // El grado que vale es el guardado (lo puso CTCx al galardonar); el cálculo lo explica.
      grado: gradoGuardado ?? calculo?.grado ?? null,
      punto,
      triada,
      puntaje: calculo ? { puntos: calculo.puntaje.puntos, mult: calculo.puntaje.mult } : null,
    },
    imagenGrado: (() => {
      // Una imagen que no se haya mostrado ya: foto del lote, la cuarta de la galería, la foto de otra finca; si no, la de CTCx.
      // En público, nunca la galería del productor (puede tener personas): solo fotos del lote o de otra finca.
      const libre = [...fotosDelLote, publico ? null : galeriaIds[3], ...origen.slice(1).map((x) => x.f.profile_photo_asset_id)].map((id) => (id ? urls.get(id) : undefined)).find((u): u is string => !!u);
      return libre ? { url: libre, porDefecto: false } : { url: IMAGEN_DE_ORIGEN_POR_DEFECTO, porDefecto: true };
    })(),
    variedadesInfo: variedades.map((v) => {
      const f = fichaDeVariedad(v.nombre);
      return {
        nombre: v.nombre,
        pct: v.pct,
        ficha: f
          ? { nombre: f.nombre, grupo: sinRaya(f.grupo[lang]), tipo: sinRaya(f.tipoTexto[lang]), color: f.color, lugar: f.lugar[lang], historia: sinRaya(f.historia[lang]), altitud: rangoDeAltitud(f), grano: f.grano != null ? GRANO_LABEL[lang][f.grano] : null, notas: f.notas.map((x) => x[lang]) }
          : null,
      };
    }),
    lectura: lecturaDeLaRueda(aceptada ? planillaDeEvaluacion(aceptada)?.rueda : null, lang),
    conjeturas: conjeturasDelLote(
      {
        cifras: caracterizacion.cifras ?? null,
        altitud: fincas[0]?.altitud ?? lot.ficha_altitud_m ?? numero(ds.masl),
        variedades: variedades.length ? variedades.map((v) => v.nombre) : lot.ficha_variedad ? [lot.ficha_variedad] : [],
      },
      lang
    ),
    evaluacion: aceptada ? { sca: aceptada.sca_total, factor: aceptada.factor_rendimiento, fecha: aceptada.created_at ?? "", fuente: aceptada.source ?? "q_grader_batch" } : null,
    caracterizacion,
    ficha: fichaRow?.data ?? null,
    fichaSource: fichaRow?.source ?? null,
    certificates: certRows
      .filter((c) => c.status === "corroborada")
      .map((c) => ({ schemeLabel: SCHEME_LABEL[c.scheme] ?? c.scheme, certNumber: c.cert_number ?? "", validFrom: c.valid_from ?? "", validTo: c.valid_to ?? "" })),
    catalogoUrl,
    qrSvg,
    generatedOn: new Date().toISOString(),
    blindaje: publico
      ? { puedeImprimir: true, marca: "" }
      : {
          puedeImprimir: (((firmadosRaw as { id: string }[] | null) ?? []).length) > 0,
          marca: textoDeMarca({ referencia: ctcLotReference(lot.id), productor: producer?.fullName ?? null, fecha: new Date(), lang }),
        },
  };
}
