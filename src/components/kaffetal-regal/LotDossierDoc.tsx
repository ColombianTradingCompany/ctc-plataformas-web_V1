import { CTC_LEGAL_LINE, CTC_RAZON } from "@/lib/legal";
import { ATRIBUTOS_SCA, type AtributoSca, type FichaTecnicaData } from "@/lib/fichas/tipos";
import { PrintButton } from "./PrintButton";
import type { DossierCaracterizacion, Par } from "@/lib/kaffetal/dossierEvaluacion";

// ── El DOSSIER DEL LOTE, en español e inglés (V5.79, fase 2 del PLAN_CIRCUITO_DEL_LOTE) ──
// «El productor recibe los documentos de su café con la misma info que envió, sobre todo con el valor
// adicional del chequeo EUDR y un formato estandarizado formal para presentar en inglés y español»
// (folio 7 del owner, 2026-09-24; respuesta 4: UN dossier por lote). Reúne en un documento imprimible lo que
// antes eran tres páginas sueltas: la identidad y trazabilidad del lote (FT), el Pasaporte de su(s) finca(s)
// y la Visa del lote (EUDR), y la caracterización (FT2 transcrita o la evaluación del Q-Grader). Solo afirma
// lo que la plataforma tiene: si no hay caracterización, lo dice. Presentacional y puro: la ruta
// (`/kaffetal-regal/dossier/[id]?lang=`) resuelve los datos y el permiso.

export type Lang = "es" | "en";

export type DossierLot = {
  id: string;
  name: string;
  reference: string;
  publicCode: string | null;
  grade: string | null;
  gradeName: string | null;
  gradeLogo: string | null;
  productName: string | null;
  species: string | null;
  variety: string | null;
  process: string | null;
  altitudeM: number | null;
  harvestFrom: string | null;
  harvestTo: string | null;
  archetype: string | null;
};
export type DossierFincaLine = {
  code: string;
  name: string;
  municipio: string | null;
  departamento: string | null;
  pais?: string | null;
  /** El código de `fincaEudrStatus` — se traduce aquí. */
  pasaporte: string;
};
export type DossierCertLine = { schemeLabel: string; certNumber: string; validFrom: string; validTo: string };
export type DossierEvaluacion = { sca: number | null; factor: number | null; fecha: string; fuente: "q_grader_batch" | "bcp_arena" | "producer_claim" };

const T = {
  es: {
    title: "Dossier del lote",
    subtitle: "Trazabilidad · Pasaporte y Visa EUDR · Caracterización",
    lang: "Versión en inglés",
    langHref: "en",
    generated: "Generado el",
    s1: "1 · Identidad y trazabilidad",
    s2: "2 · Debida diligencia EUDR",
    s3: "3 · Caracterización del café",
    s4: "4 · Certificaciones corroboradas",
    b1: "B1 · Variedades y caracterización básica (declarado por el productor)",
    b2: "B2 · Perfil de taza (evaluación que rige el grado)",
    b3: "B3 · Caracterización física (evaluación que rige el grado)",
    anot: "Anotaciones de mejora · Rueda del Sabor",
    anotHint: "Notas de defecto marcadas en la evaluación y su posible causa en el beneficio — lo que conviene revisar.",
    anotLimpio: "La rueda del sabor no marcó notas a revisar en el beneficio: perfil sin defectos de proceso.",
    variedad: "Variedad", pct: "%", proceso: "Proceso", sca2004: "SCA 2004", cvaT: "CVA (SCA-104)", total: "Total", tazas: "Tazas",
    rueda: "Rueda del sabor", etapas: "Etapas · intensidad", comentario: "Comentario", perfil: "Perfil de taza",
    defectos: "Detalle de defectos", defecto: "Defecto", granos: "Granos", completos: "Defectos completos", mallas: "Granulometría", malla: "Malla", gramos: "Gramos",
    notasAnalisis: "Notas del análisis físico", causa: "Posible causa en el beneficio",
    producer: "Productor",
    contact: "Contacto",
    lot: "Lote",
    reference: "Referencia CTC",
    publicCode: "Código público",
    product: "Producto",
    species: "Especie",
    variety: "Variedad",
    process: "Proceso",
    altitude: "Altitud",
    harvest: "Ventana de recolección",
    archetype: "Tipo de lote",
    farms: "Finca(s) de origen",
    farm: "Finca",
    location: "Ubicación",
    passport: "Pasaporte EUDR de la finca",
    visa: "Visa EUDR del lote",
    visaNote: "La Visa del lote se hereda del Pasaporte de su(s) finca(s): la debida diligencia (Reglamento (UE) 2023/1115) vive en la finca. Es el primer entregable de CTCx, y es gratis.",
    dds: "Declaración de diligencia debida (DDS)",
    ddsNone: "Sin DDS registrada todavía.",
    seeVisa: "Ver la Visa EUDR completa",
    grade: "Grado CTC",
    noGrade: "Sin grado todavía",
    evaluation: "Evaluación del Q-Grader",
    evalSource: { q_grader_batch: "Evaluación CTCx · Q-Grader", bcp_arena: "Apreciación CTCx · Arena", producer_claim: "Reportada por el productor, contrastada por CTCx" },
    score: "Puntaje",
    scale: "Escala",
    attributes: "Atributos",
    notes: "Notas de cata",
    cupper: "Catador",
    lab: "Laboratorio",
    date: "Fecha del análisis",
    yield: "Factor de rendimiento",
    bean: "Almendra total (g)",
    density: "Densidad verde (g/L)",
    parchHum: "Humedad pergamino",
    greenHum: "Humedad verde",
    aw: "Actividad de agua",
    defects: "Defectos",
    fichaSource: "Fuente de la caracterización",
    fichaSources: { escaneo: "Soportes del productor, transcritos por CTCx (escáner)", productor: "Reportado por el productor", ctc: "Transcrita por CTCx" },
    noFicha: "Este lote todavía no tiene caracterización: llegará con la Evaluación de Muestras en Origen (EVA) o cuando CTCx transcriba los soportes de FT2.",
    certs: "Certificaciones de la finca corroboradas por CTCx",
    noCerts: "Ninguna certificación corroborada todavía. Las declaradas sin respaldo no se imprimen.",
    scheme: "Esquema",
    number: "N.º",
    validity: "Vigencia",
    disclaimer: `Este dossier lo produce ${CTC_RAZON} con la información que el productor registró en Kaffetal Regal y lo que CTCx contrastó. Lo que CTCx no verificó no se afirma.`,
    attr: { fragrance: "Fragancia/Aroma", flavor: "Sabor", aftertaste: "Sabor residual", acidity: "Acidez", body: "Cuerpo", balance: "Balance", uniformity: "Uniformidad", clean_cup: "Taza limpia", sweetness: "Dulzor", cuppers: "Puntaje catador" } as Record<AtributoSca, string>,
    eudr: { apta: "Pasaporte vigente", aprobada: "Pasaporte aprobado · expediente sin remitir", en_revision: "En revisión por CTCx", pendiente: "En trámite", rechazada: "Rechazado", no_apta: "Sin Pasaporte", eudr_ready: "Visa lista", bloqueado: "Sin Pasaporte de finca", sin_origen: "Sin origen" } as Record<string, string>,
  },
  en: {
    title: "Lot Dossier",
    subtitle: "Traceability · EUDR Passport and Visa · Characterization",
    lang: "Versión en español",
    langHref: "es",
    generated: "Generated on",
    s1: "1 · Identity and traceability",
    s2: "2 · EUDR due diligence",
    s3: "3 · Coffee characterization",
    s4: "4 · Corroborated certifications",
    b1: "B1 · Varieties and basic characterization (declared by the producer)",
    b2: "B2 · Cup profile (evaluation that governs the grade)",
    b3: "B3 · Physical characterization (evaluation that governs the grade)",
    anot: "Improvement notes · Flavour Wheel",
    anotHint: "Defect notes marked in the evaluation and their likely cause in processing — what is worth reviewing.",
    anotLimpio: "The flavour wheel marked no notes to review in processing: a profile free of process defects.",
    variedad: "Variety", pct: "%", proceso: "Process", sca2004: "SCA 2004", cvaT: "CVA (SCA-104)", total: "Total", tazas: "Cups",
    rueda: "Flavour wheel", etapas: "Stages · intensity", comentario: "Comment", perfil: "Cup profile",
    defectos: "Defect detail", defecto: "Defect", granos: "Beans", completos: "Full defects", mallas: "Screen size", malla: "Screen", gramos: "Grams",
    notasAnalisis: "Physical analysis notes", causa: "Likely cause in processing",
    producer: "Producer",
    contact: "Contact",
    lot: "Lot",
    reference: "CTC reference",
    publicCode: "Public code",
    product: "Product",
    species: "Species",
    variety: "Variety",
    process: "Process",
    altitude: "Altitude",
    harvest: "Harvest window",
    archetype: "Lot type",
    farms: "Farm(s) of origin",
    farm: "Farm",
    location: "Location",
    passport: "Farm EUDR Passport",
    visa: "Lot EUDR Visa",
    visaNote: "The lot's Visa is inherited from its farm(s) Passport: due diligence (Regulation (EU) 2023/1115) lives at the farm. It is CTCx's first deliverable, and it is free.",
    dds: "Due diligence statement (DDS)",
    ddsNone: "No DDS filed yet.",
    seeVisa: "See the full EUDR Visa",
    grade: "CTC Grade",
    noGrade: "No grade yet",
    evaluation: "Q-Grader evaluation",
    evalSource: { q_grader_batch: "CTCx evaluation · Q-Grader", bcp_arena: "CTCx appraisal · Arena", producer_claim: "Reported by the producer, checked by CTCx" },
    score: "Score",
    scale: "Scale",
    attributes: "Attributes",
    notes: "Cupping notes",
    cupper: "Cupper",
    lab: "Laboratory",
    date: "Analysis date",
    yield: "Yield factor",
    bean: "Total bean (g)",
    density: "Green density (g/L)",
    parchHum: "Parchment moisture",
    greenHum: "Green moisture",
    aw: "Water activity",
    defects: "Defects",
    fichaSource: "Characterization source",
    fichaSources: { escaneo: "Producer's supporting documents, transcribed by CTCx (scanner)", productor: "Reported by the producer", ctc: "Transcribed by CTCx" },
    noFicha: "This lot has no characterization yet: it arrives with the Sample Evaluation at Origin (EVA) or once CTCx transcribes the FT2 supporting documents.",
    certs: "Farm certifications corroborated by CTCx",
    noCerts: "No corroborated certification yet. Declared certifications without evidence are not printed.",
    scheme: "Scheme",
    number: "No.",
    validity: "Validity",
    disclaimer: `This dossier is produced by ${CTC_RAZON} from the information the producer registered in Kaffetal Regal and what CTCx checked. What CTCx did not verify is not claimed.`,
    attr: { fragrance: "Fragrance/Aroma", flavor: "Flavor", aftertaste: "Aftertaste", acidity: "Acidity", body: "Body", balance: "Balance", uniformity: "Uniformity", clean_cup: "Clean cup", sweetness: "Sweetness", cuppers: "Cupper's points" } as Record<AtributoSca, string>,
    eudr: { apta: "Passport in force", aprobada: "Passport approved · dossier not yet released", en_revision: "Under review by CTCx", pendiente: "In progress", rechazada: "Rejected", no_apta: "No Passport", eudr_ready: "Visa ready", bloqueado: "No farm Passport", sin_origen: "No origin" } as Record<string, string>,
  },
} as const;

const S = {
  page: { maxWidth: 860, margin: "0 auto", padding: "28px 24px 60px", fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif", color: "#1A1C1E", fontSize: 13.5, lineHeight: 1.55 } as const,
  h1: { fontSize: 24, margin: "0 0 2px", letterSpacing: "-.01em" } as const,
  h2: { fontSize: 15, margin: "26px 0 8px", paddingBottom: 4, borderBottom: "2px solid #1A1C1E" } as const,
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "4px 18px" } as const,
  k: { fontSize: 11, textTransform: "uppercase" as const, letterSpacing: ".06em", color: "#6B6F76" } as const,
  v: { fontWeight: 600 } as const,
  meta: { fontSize: 12, color: "#6B6F76" } as const,
  table: { width: "100%", borderCollapse: "collapse" as const, fontSize: 13 } as const,
  th: { textAlign: "left" as const, padding: "5px 10px 5px 0", fontWeight: 600, borderBottom: "1px solid #D9DCE1", fontSize: 11.5, textTransform: "uppercase" as const, letterSpacing: ".05em", color: "#6B6F76" } as const,
  td: { padding: "5px 10px 5px 0", borderBottom: "1px solid #EEF0F3", verticalAlign: "top" as const } as const,
};

const Dato = ({ k, v }: { k: string; v: string | number | null | undefined }) =>
  v == null || v === "" ? null : (
    <div>
      <div style={S.k}>{k}</div>
      <div style={S.v}>{v}</div>
    </div>
  );

const fmt = (n: number | null | undefined, d = 2) => (n == null ? null : Number(n).toFixed(d));

export function LotDossierDoc({
  lang,
  lot,
  producerName,
  producerContact,
  fincas,
  visaCode,
  dds,
  ficha,
  fichaSource,
  evaluacion,
  caracterizacion = null,
  certificates,
  generatedOn,
}: {
  lang: Lang;
  lot: DossierLot;
  producerName: string;
  producerContact: string;
  fincas: DossierFincaLine[];
  /** El código de `lotEudrStatus`. */
  visaCode: string;
  dds: { reference: string; filedAt: string | null } | null;
  /** La ficha oficial ★ del set (o `null`). */
  ficha: FichaTecnicaData | null;
  fichaSource: "escaneo" | "productor" | "ctc" | null;
  /** La evaluación que rige el grado (o `null`). */
  evaluacion: DossierEvaluacion | null;
  /** V5.165 (owner): «el dossier debe incluir TODO: B1, B2 y B3» — y las anotaciones de mejora de la Rueda del Sabor. */
  caracterizacion?: DossierCaracterizacion | null;
  certificates: DossierCertLine[];
  generatedOn: string;
}) {
  const t = T[lang];
  const loc = lang === "en" ? "en-GB" : "es-CO";
  const fecha = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString(loc, { day: "2-digit", month: "short", year: "numeric" }) : null);
  const visaOk = visaCode === "eudr_ready";

  return (
    <div style={S.page}>
      <style>{`@media print { .no-print { display: none !important } body { background: #fff } } .no-print a { color: #1A1C1E }`}</style>
      <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <a href={`/kaffetal-regal/dossier/${lot.id}?lang=${t.langHref}`} style={{ fontSize: 13 }}>
          {t.lang} →
        </a>
        <PrintButton />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div>
          <div style={{ ...S.k, marginBottom: 4 }}>{CTC_RAZON} · Kaffetal Regal</div>
          <h1 style={S.h1}>
            {t.title} · {lot.name}
          </h1>
          <div style={S.meta}>{t.subtitle}</div>
        </div>
        {lot.gradeLogo && lot.gradeName && (
          <div style={{ textAlign: "center" }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- documento imprimible, sin optimizador */}
            <img src={lot.gradeLogo} alt={lot.gradeName} width={84} height={84} style={{ display: "block", margin: "0 auto" }} />
            <div style={{ fontSize: 12, fontWeight: 700 }}>{t.grade} · {lot.gradeName}</div>
          </div>
        )}
      </div>

      <h2 style={S.h2}>{t.s1}</h2>
      <div style={S.grid}>
        <Dato k={t.producer} v={producerName} />
        <Dato k={t.contact} v={producerContact} />
        <Dato k={t.lot} v={lot.name} />
        <Dato k={t.reference} v={lot.reference} />
        <Dato k={t.publicCode} v={lot.publicCode} />
        <Dato k={t.product} v={lot.productName} />
        <Dato k={t.species} v={lot.species} />
        <Dato k={t.variety} v={lot.variety} />
        <Dato k={t.process} v={lot.process} />
        <Dato k={t.altitude} v={lot.altitudeM != null ? `${lot.altitudeM} m` : null} />
        <Dato k={t.harvest} v={lot.harvestFrom && lot.harvestTo ? `${lot.harvestFrom} → ${lot.harvestTo}` : null} />
        <Dato k={t.archetype} v={lot.archetype} />
      </div>
      <div style={{ marginTop: 10 }}>
        <div style={S.k}>{t.farms}</div>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>{t.farm}</th>
              <th style={S.th}>{t.location}</th>
              <th style={S.th}>{t.passport}</th>
            </tr>
          </thead>
          <tbody>
            {fincas.map((f) => (
              <tr key={f.code}>
                <td style={S.td}>
                  <b>{f.name}</b> <span style={S.meta}>{f.code}</span>
                </td>
                <td style={S.td}>{[f.municipio, f.departamento, f.pais || "Colombia"].filter(Boolean).join(", ")}</td>
                <td style={S.td}>{t.eudr[f.pasaporte] ?? f.pasaporte}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 style={S.h2}>{t.s2}</h2>
      <div style={S.grid}>
        <Dato k={t.visa} v={t.eudr[visaCode] ?? visaCode} />
        <Dato k={t.dds} v={dds ? `${dds.reference}${dds.filedAt ? ` · ${fecha(dds.filedAt)}` : ""}` : t.ddsNone} />
      </div>
      <p style={{ ...S.meta, marginTop: 6 }}>{t.visaNote}</p>
      {visaOk && (
        <p className="no-print" style={{ marginTop: 4 }}>
          <a href={`/kaffetal-regal/certificacion-lote/${lot.id}`}>{t.seeVisa} →</a>
        </p>
      )}

      <h2 style={S.h2}>{t.s3}</h2>
      {!ficha && !evaluacion && <p style={S.meta}>{t.noFicha}</p>}
      {evaluacion && (
        <div style={{ marginBottom: 10 }}>
          <div style={S.k}>{t.evaluation}</div>
          <div style={S.grid}>
            <Dato k={t.grade} v={lot.gradeName ?? t.noGrade} />
            <Dato k={t.score} v={fmt(evaluacion.sca)} />
            <Dato k={t.yield} v={fmt(evaluacion.factor)} />
            <Dato k={t.date} v={fecha(evaluacion.fecha)} />
          </div>
          <div style={S.meta}>{t.evalSource[evaluacion.fuente]}</div>
        </div>
      )}
      {ficha && (
        <div>
          <div style={S.grid}>
            <Dato k={t.score} v={fmt(ficha.puntaje)} />
            <Dato k={t.scale} v={ficha.escala ? ficha.escala.toUpperCase() : null} />
            <Dato k={t.cupper} v={ficha.catador} />
            <Dato k={t.lab} v={ficha.laboratorio} />
            <Dato k={t.date} v={ficha.fecha_analisis} />
            <Dato k={t.yield} v={fmt(ficha.factor_rendimiento)} />
            <Dato k={t.bean} v={fmt(ficha.almendra_total_g, 1)} />
            <Dato k={t.density} v={fmt(ficha.densidad_verde_gl, 0)} />
            <Dato k={t.parchHum} v={ficha.humedad_pergamino_pct != null ? `${fmt(ficha.humedad_pergamino_pct, 1)} %` : null} />
            <Dato k={t.greenHum} v={ficha.humedad_verde_pct != null ? `${fmt(ficha.humedad_verde_pct, 1)} %` : null} />
            <Dato k={t.aw} v={fmt(ficha.actividad_agua, 3)} />
            <Dato k={t.defects} v={ficha.defectos} />
          </div>
          {ficha.atributos && (
            <div style={{ marginTop: 8 }}>
              <div style={S.k}>{t.attributes}</div>
              <div style={{ display: "flex", gap: "4px 14px", flexWrap: "wrap", fontSize: 12.5 }}>
                {ATRIBUTOS_SCA.filter((k) => ficha.atributos?.[k] != null).map((k) => (
                  <span key={k}>
                    {t.attr[k]}: <b>{fmt(ficha.atributos?.[k] ?? null)}</b>
                  </span>
                ))}
              </div>
            </div>
          )}
          {ficha.mallas && ficha.mallas.length > 0 && (
            <div style={{ ...S.meta, marginTop: 6 }}>
              {ficha.mallas.map((m) => `${m.malla}: ${m.porcentaje}%`).join(" · ")}
            </div>
          )}
          {ficha.notas_cata && (
            <div style={{ marginTop: 8 }}>
              <div style={S.k}>{t.notes}</div>
              <div>{ficha.notas_cata}</div>
            </div>
          )}
          {fichaSource && <div style={{ ...S.meta, marginTop: 6 }}>{t.fichaSource}: {t.fichaSources[fichaSource]}</div>}
        </div>
      )}

      {/* V5.165 (owner): B1 (lo declarado), B2 y B3 (la evaluación que rige) y las anotaciones de mejora de la rueda. */}
      {caracterizacion?.b1 && (
        <div style={{ marginTop: 14 }}>
          <div style={S.k}>{t.b1}</div>
          {caracterizacion.b1.variedades.length > 0 && (
            <table style={S.table}>
              <thead>
                <tr><th style={S.th}>{t.variedad}</th><th style={S.th}>{t.pct}</th>{caracterizacion.b1.variedades.some((v) => v.proceso) && <th style={S.th}>{t.proceso}</th>}</tr>
              </thead>
              <tbody>
                {caracterizacion.b1.variedades.map((v, i) => (
                  <tr key={i}><td style={S.td}>{v.nombre}</td><td style={S.td}>{v.pct || "—"}</td>{caracterizacion.b1!.variedades.some((x) => x.proceso) && <td style={S.td}>{v.proceso || "—"}</td>}</tr>
                ))}
              </tbody>
            </table>
          )}
          <Pares pares={caracterizacion.b1.pares} />
        </div>
      )}
      {caracterizacion?.b2 && (
        <div style={{ marginTop: 14 }}>
          <div style={S.k}>{t.b2}</div>
          {caracterizacion.b2.sca && (
            <>
              <div style={{ fontSize: 12.5, fontWeight: 700, marginTop: 4 }}>{t.sca2004}{caracterizacion.b2.sca.total && <> · {t.total} {caracterizacion.b2.sca.total}</>}</div>
              <Pares pares={[...caracterizacion.b2.sca.filas, ...(caracterizacion.b2.sca.tazas ? [{ k: t.tazas, v: caracterizacion.b2.sca.tazas }] : [])]} />
            </>
          )}
          {caracterizacion.b2.cva && (
            <>
              <div style={{ fontSize: 12.5, fontWeight: 700, marginTop: 6 }}>{t.cvaT}{caracterizacion.b2.cva.total && <> · {t.total} {caracterizacion.b2.cva.total}</>}</div>
              <Pares pares={caracterizacion.b2.cva.filas} />
            </>
          )}
          {caracterizacion.b2.rueda.length > 0 && (
            <table style={{ ...S.table, marginTop: 6 }}>
              <thead>
                <tr><th style={S.th}>{t.rueda}</th><th style={S.th}>{t.etapas}</th><th style={S.th}>{t.comentario}</th></tr>
              </thead>
              <tbody>
                {caracterizacion.b2.rueda.map((r, i) => (
                  <tr key={i}><td style={S.td}>{r.ruta}</td><td style={S.td}>{r.detalle}</td><td style={S.td}>{r.comentario || "—"}</td></tr>
                ))}
              </tbody>
            </table>
          )}
          <Pares pares={caracterizacion.b2.descriptivo} />
          {caracterizacion.b2.perfil && (
            <div style={{ marginTop: 6 }}>
              <div style={S.k}>{t.perfil}</div>
              <div>{caracterizacion.b2.perfil}</div>
            </div>
          )}
        </div>
      )}
      {caracterizacion?.b3 && (
        <div style={{ marginTop: 14 }}>
          <div style={S.k}>{t.b3}</div>
          <Pares pares={caracterizacion.b3.pares} />
          {caracterizacion.b3.defectos.length > 0 && (
            <table style={{ ...S.table, marginTop: 6 }}>
              <thead>
                <tr><th style={S.th}>{t.defecto}</th><th style={S.th}>{t.granos}</th><th style={S.th}>{t.completos}</th></tr>
              </thead>
              <tbody>
                {caracterizacion.b3.defectos.map((d, i) => (
                  <tr key={i}><td style={S.td}>{d.defecto}</td><td style={S.td}>{d.granos}</td><td style={S.td}>{d.completos}</td></tr>
                ))}
              </tbody>
            </table>
          )}
          {caracterizacion.b3.mallas.length > 0 && (
            <table style={{ ...S.table, marginTop: 6 }}>
              <thead>
                <tr><th style={S.th}>{t.malla}</th><th style={S.th}>{t.gramos}</th><th style={S.th}>%</th></tr>
              </thead>
              <tbody>
                {caracterizacion.b3.mallas.map((m, i) => (
                  <tr key={i}><td style={S.td}>{m.malla}</td><td style={S.td}>{m.gramos}</td><td style={S.td}>{m.pct}</td></tr>
                ))}
              </tbody>
            </table>
          )}
          {caracterizacion.b3.estadoMallas && <div style={S.meta}>{caracterizacion.b3.estadoMallas}</div>}
          {caracterizacion.b3.notas && (
            <div style={{ marginTop: 6 }}>
              <div style={S.k}>{t.notasAnalisis}</div>
              <div>{caracterizacion.b3.notas}</div>
            </div>
          )}
        </div>
      )}
      {caracterizacion && caracterizacion.anotaciones.length > 0 && (
        <div style={{ marginTop: 14, border: "1px solid #E5C76B", background: "#FFF9E6", borderRadius: 6, padding: "8px 10px" }}>
          <div style={S.k}>⚠ {t.anot}</div>
          <div style={S.meta}>{t.anotHint}</div>
          <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
            {caracterizacion.anotaciones.map((a) => (
              <li key={a.id} style={{ marginBottom: 4 }}>
                <b>{a.ruta}</b> — {t.causa}: {a.causa}
              </li>
            ))}
          </ul>
        </div>
      )}

      {caracterizacion && caracterizacion.anotaciones.length === 0 && (caracterizacion.b2?.rueda.length ?? 0) > 0 && (
        <div style={{ marginTop: 14, border: "1px solid #9CCB9C", background: "#F1FAF1", borderRadius: 6, padding: "8px 10px" }}>
          <div style={S.k}>✓ {t.anot}</div>
          <div>{t.anotLimpio}</div>
        </div>
      )}

      <h2 style={S.h2}>{t.s4}</h2>
      {!certificates.length ? (
        <p style={S.meta}>{t.noCerts}</p>
      ) : (
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>{t.scheme}</th>
              <th style={S.th}>{t.number}</th>
              <th style={S.th}>{t.validity}</th>
            </tr>
          </thead>
          <tbody>
            {certificates.map((c, i) => (
              <tr key={i}>
                <td style={S.td}>{c.schemeLabel}</td>
                <td style={S.td}>{c.certNumber || "—"}</td>
                <td style={S.td}>{c.validFrom && c.validTo ? `${c.validFrom} → ${c.validTo}` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div style={{ marginTop: 30, paddingTop: 10, borderTop: "1px solid #D9DCE1", ...S.meta }}>
        <div>{t.disclaimer}</div>
        <div style={{ marginTop: 4 }}>
          {t.generated} {fecha(generatedOn)} · {CTC_LEGAL_LINE}
        </div>
      </div>
    </div>
  );
}

/** V5.165: pares rótulo–valor en rejilla (los de B1, B2 y B3). */
function Pares({ pares }: { pares: Par[] }) {
  if (!pares.length) return null;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "2px 14px", fontSize: 12.5, marginTop: 4 }}>
      {pares.map((p, i) => (
        <span key={i}>
          {p.k}: <b>{p.v}</b>
        </span>
      ))}
    </div>
  );
}
