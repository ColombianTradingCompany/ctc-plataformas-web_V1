import { fincaCode, LOCAL_INFRA } from "./data";
import { deriveChainComplexity, deriveProductRisk, deriveFincaRiskLevel, PRODUCT_RISK_QUESTIONS } from "@/lib/eudr";
import { PrintButton } from "./PrintButton";

const CUSTODY_LABEL: Record<string, string> = {
  finca: "Finca", beneficio: "Beneficio", secado: "Secado", trilla: "Trilla", almacenamiento: "Almacenamiento", exportacion: "Exportación",
};
const PRODUCT_RISK_LABEL: Record<string, string> = Object.fromEntries(PRODUCT_RISK_QUESTIONS.map(([k, l]) => [k, l]));
const CUSTODY_METHOD_LABEL: Record<string, string> = { ctc_standard: "CTC Parchment Storage Standard", custom: "Método propio" };

const INFRA_LABEL: Record<string, string> = Object.fromEntries(LOCAL_INFRA.map(([k, l]) => [k, l]));

const EVIDENCE_LABEL: Record<string, string> = {
  satelital: "Imágenes satelitales",
  observatory: "EU Observatory 2020",
  registros: "Registros productivos",
  terreno: "Verificación en campo",
  catastro: "Mapas catastrales",
};
const LEGAL_AREA_LABEL: Record<string, string> = {
  suelo: "Uso del suelo y forestal",
  ambiental: "Protección ambiental",
  laboral: "Laborales y humanos",
  clpi: "CLPI / terceros",
  fiscal: "Fiscal / anticorrupción / aduanas",
};
const SUSTAIN_LABEL: Record<string, string> = {
  sa8000: "SA 8000 evaluación voluntaria",
  familiar: "Agricultura familiar campesina",
  inclusion: "Inclusión de mujeres y jóvenes",
  paisaje: "Conservación de paisajes",
};
const PRODUCTION_SYSTEM_LABEL: Record<string, string> = { sombra: "Café bajo sombra", agroforestal: "Agroforestal", tradicional: "Tradicional / pleno sol" };
const TENURE_LABEL: Record<string, string> = { propietario: "Propietario", poseedor: "Poseedor reconocido", asociacion: "Asociación" };

type KeyedFiles = Record<string, { assetId: string; fileName: string }>;

export type DossierFinca = {
  id: string;
  name: string;
  status: string;
  vereda: string | null;
  municipio: string | null;
  departamento: string | null;
  hectares: string | number | null;
  eudr_lat: string | number | null;
  eudr_lng: string | number | null;
  eudr_polygon_geojson: { lat: number; lng: number }[] | null;
  eudr_planting_date: string | null;
  eudr_production_system: string | null;
  eudr_deforestation_free: boolean | null;
  eudr_legal_production: boolean | null;
  eudr_evidence_types: string[] | null;
  eudr_evidence_notes: string | null;
  eudr_legal_areas: string[] | null;
  eudr_tenure: string | null;
  eudr_legal_docs_filename: string | null;
  eudr_sustainability_tags: string[] | null;
  eudr_sustainability_notes: string | null;
  eudr_evidence_files: KeyedFiles | null;
  eudr_sustainability_files: KeyedFiles | null;
  eudr_local_infra: string[] | null;
  // Cuestionario de riesgo (2026-07-24).
  eudr_custody_stages: string[] | null;
  eudr_custody_method: string | null;
  eudr_custody_notes: string | null;
  eudr_product_risk_factors: string[] | null;
  eudr_illegality_indicators: boolean | null;
  eudr_docs_available: boolean | null;
  eudr_cert_scheme: string | null;
  eudr_mitigation_actions: string | null;
  eudr_mitigation_responsible: string | null;
  eudr_mitigation_effective: boolean | null;
};

const yesNo = (v: boolean | null) => (v === true ? "Sí" : v === false ? "No" : "Sin definir");
const isImage = (name: string) => /\.(png|jpe?g|webp|gif)$/i.test(name);

// Shared, presentational EUDR dossier. Rendered both on the BCP side
// (/bcp/fincas/[id]/dossier) and the producer side (/kaffetal-regal/
// certificacion/[id]); each route resolves the data with its own client.
// F1 (2026-07-29): el dossier lista las PARCELAS (el átomo del Art. 9) y los
// certificados de la finca con número + vigencia (nota "¿Finca o Lote?").
export type DossierParcela = { name: string; areaHa: string; lat: string; lng: string; polygonPoints: number };
export type DossierCert = {
  schemeLabel: string;
  certNumber: string;
  validFrom: string;
  validTo: string;
  holderNote: string;
  verifiedByCtc: boolean;
};

export function EudrDossierDoc({
  finca,
  producerName,
  producerContact,
  daneText,
  mapUrl,
  legalDocUrl,
  urlByAsset,
  comms,
  parcelas = [],
  certificates = [],
}: {
  finca: DossierFinca;
  producerName: string;
  producerContact: string;
  daneText: string | null;
  mapUrl: string | null;
  legalDocUrl?: string;
  urlByAsset: Record<string, string>;
  comms: { id: string; note: string; created_at: string; author_role: string }[];
  parcelas?: DossierParcela[];
  certificates?: DossierCert[];
}) {
  const evidenceFiles = finca.eudr_evidence_files ?? {};
  const sustainFiles = finca.eudr_sustainability_files ?? {};

  const row = (label: string, value: React.ReactNode) => (
    <tr>
      <td style={{ padding: "6px 12px 6px 0", color: "#555", verticalAlign: "top", width: 220 }}>{label}</td>
      <td style={{ padding: "6px 0", fontWeight: 600 }}>{value}</td>
    </tr>
  );

  const annexBlock = (files: KeyedFiles, labels: Record<string, string>) =>
    Object.entries(files).map(([key, f]) => {
      const url = urlByAsset[f.assetId];
      return (
        <div key={key} style={{ marginTop: 8 }}>
          <div style={{ fontSize: 12, color: "#555" }}>
            {labels[key] ?? key} — {f.fileName}
            {url && !isImage(f.fileName) && (
              <>
                {" · "}
                <a href={url} target="_blank" rel="noopener noreferrer">ver archivo</a>
              </>
            )}
          </div>
          {url && isImage(f.fileName) && (
            // eslint-disable-next-line @next/next/no-img-element -- signed Supabase URL
            <img src={url} alt={f.fileName} style={{ maxWidth: 360, borderRadius: 6, border: "1px solid #ddd", marginTop: 4 }} />
          )}
        </div>
      );
    });

  return (
    <div id="dossier" style={{ position: "relative", background: "#fff", color: "#1a1a1a", maxWidth: 820, margin: "0 auto", padding: "32px 40px", fontFamily: "Georgia, serif" }}>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              body * { visibility: hidden !important; }
              #dossier, #dossier * { visibility: visible !important; }
              #dossier { position: absolute !important; inset: 0 !important; margin: 0 !important; }
              .no-print { display: none !important; }
              #dossier-watermark { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          `,
        }}
      />
      <div id="dossier-watermark" aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0, opacity: 0.06 }}>
        <div style={{ transform: "rotate(-30deg)", fontSize: 46, fontWeight: 800, lineHeight: "160px", whiteSpace: "nowrap", color: "#3C0A86" }}>
          {Array.from({ length: 40 }).map((_, i) => (
            <div key={i}>{"CTCx  ".repeat(12)}</div>
          ))}
        </div>
      </div>

      <div style={{ position: "relative", zIndex: 1 }}>
        <div className="no-print" style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
          <PrintButton />
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
          <div>
            <p style={{ fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "#3C0A86", margin: 0 }}>Colombian Trading Company · CTCx</p>
            <h1 style={{ fontSize: 26, margin: "4px 0 2px" }}>Visa EUDR de la Finca · Debida Diligencia</h1>
            <p style={{ color: "#555", margin: "0 0 4px" }}>Reglamento (UE) 2023/1115 · Documento generado el {new Date().toLocaleDateString("es-CO")}</p>
            <p style={{ margin: 0, fontWeight: 700 }}>
              {finca.name} · {fincaCode(finca.id)}
              {finca.status === "approved" ? " · APROBADA" : ` · ${finca.status}`}
            </p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element -- local public asset */}
          <img src="/docs/eudr/sello-eudr-voluntario.png" alt="Sello EUDR Voluntario CTC" style={{ width: 110, height: "auto", flex: "0 0 auto" }} />
        </div>

        <div style={{ background: "#F3EFFB", border: "1px solid #d9ccf2", borderRadius: 8, padding: "10px 14px", marginTop: 14, fontSize: 12.5, color: "#3a2a5e" }}>
          <b>Uno de dos documentos de la Certificación Voluntaria EUDR de un lote de café.</b> Este expediente acredita la
          debida diligencia a nivel de <b>finca</b> (origen y trazabilidad). El segundo documento es la <b>Ficha Técnica del
          lote</b>, que aporta la información productiva y de calidad necesaria para completar la certificación voluntaria.
        </div>

        <h2 style={{ fontSize: 15, marginTop: 22, borderBottom: "2px solid #3C0A86", paddingBottom: 4 }}>Identidad del predio y proveedor</h2>
        <table style={{ borderCollapse: "collapse", fontSize: 13, width: "100%" }}>
          <tbody>
            {row("Proveedor", producerName)}
            {row("Contacto", producerContact || "—")}
            {row("Ubicación", `${finca.vereda ?? "—"}, ${finca.municipio ?? "—"}, ${finca.departamento ?? "—"}`)}
            {row("Código DANE", daneText ?? "sin coincidencia")}
            {row("Área en café", `${finca.hectares ?? "—"} ha`)}
          </tbody>
        </table>

        <h2 style={{ fontSize: 15, marginTop: 22, borderBottom: "2px solid #3C0A86", paddingBottom: 4 }}>Geolocalización</h2>
        {mapUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- Google Static Maps URL
          <img src={mapUrl} alt={`Mapa de ${finca.name}`} style={{ maxWidth: "100%", borderRadius: 8, border: "1px solid #ddd" }} />
        ) : (
          <p style={{ color: "#555" }}>Sin coordenadas capturadas.</p>
        )}
        <p style={{ fontSize: 12, color: "#555" }}>
          {finca.eudr_polygon_geojson?.length
            ? `Polígono de ${finca.eudr_polygon_geojson.length} vértices.`
            : finca.eudr_lat && finca.eudr_lng
            ? `Punto: ${finca.eudr_lat}, ${finca.eudr_lng}.`
            : ""}
        </p>
        {parcelas.length > 0 && (
          <>
            <h3 style={{ fontSize: 13, margin: "10px 0 4px" }}>Parcelas del predio (Art. 9 — Reglamento (UE) 2023/1115)</h3>
            <table style={{ borderCollapse: "collapse", fontSize: 12.5, width: "100%" }}>
              <tbody>
                {parcelas.map((p, i) => (
                  <tr key={i}>
                    <td style={{ padding: "4px 12px 4px 0", color: "#555", width: 220 }}>{i + 1}. {p.name}</td>
                    <td style={{ padding: "4px 0", fontWeight: 600 }}>
                      {p.areaHa ? `${p.areaHa} ha · ` : ""}
                      {p.polygonPoints >= 3
                        ? `polígono de ${p.polygonPoints} vértices`
                        : p.lat && p.lng
                          ? `punto ${p.lat}, ${p.lng}`
                          : "sin geometría"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ fontSize: 11, color: "#777", margin: "4px 0 0" }}>
              Una parcela es un área continua de cultivo dentro del predio; las de más de 4 ha se declaran con polígono propio.
            </p>
          </>
        )}

        <h2 style={{ fontSize: 15, marginTop: 22, borderBottom: "2px solid #3C0A86", paddingBottom: 4 }}>Declaraciones EUDR</h2>
        <table style={{ borderCollapse: "collapse", fontSize: 13, width: "100%" }}>
          <tbody>
            {row("Fecha de establecimiento del cultivo", finca.eudr_planting_date || "sin definir")}
            {row("Sistema productivo", finca.eudr_production_system ? PRODUCTION_SYSTEM_LABEL[finca.eudr_production_system] : "sin definir")}
            {row("Libre de deforestación (>31/12/2020)", yesNo(finca.eudr_deforestation_free))}
            {row("Producción en áreas legales", yesNo(finca.eudr_legal_production))}
            {row("Tenencia de la tierra", finca.eudr_tenure ? TENURE_LABEL[finca.eudr_tenure] : "sin definir")}
            {row("Áreas de legislación verificadas", (finca.eudr_legal_areas ?? []).map((k) => LEGAL_AREA_LABEL[k] ?? k).join(", ") || "ninguna")}
            {row("Infraestructura local", (finca.eudr_local_infra ?? []).map((k) => INFRA_LABEL[k] ?? k).join(", ") || "no declarada")}
          </tbody>
        </table>

        <h2 style={{ fontSize: 15, marginTop: 22, borderBottom: "2px solid #3C0A86", paddingBottom: 4 }}>Evidencia disponible</h2>
        <p style={{ fontSize: 13 }}>{(finca.eudr_evidence_types ?? []).map((k) => EVIDENCE_LABEL[k] ?? k).join(", ") || "ninguna"}</p>
        {finca.eudr_evidence_notes && <p style={{ fontSize: 12.5, color: "#555" }}>{finca.eudr_evidence_notes}</p>}
        {annexBlock(evidenceFiles, EVIDENCE_LABEL)}
        <div style={{ marginTop: 8, fontSize: 12.5 }}>
          <b>Documento de respaldo:</b>{" "}
          {finca.eudr_legal_docs_filename ? (
            <>
              {finca.eudr_legal_docs_filename}
              {legalDocUrl && <> · <a href={legalDocUrl} target="_blank" rel="noopener noreferrer">ver</a></>}
            </>
          ) : (
            "no adjuntado"
          )}
        </div>

        <h2 style={{ fontSize: 15, marginTop: 22, borderBottom: "2px solid #3C0A86", paddingBottom: 4 }}>Sostenibilidad y enfoque social</h2>
        <p style={{ fontSize: 13 }}>{(finca.eudr_sustainability_tags ?? []).map((k) => SUSTAIN_LABEL[k] ?? k).join(", ") || "ninguna"}</p>
        {finca.eudr_sustainability_notes && <p style={{ fontSize: 12.5, color: "#555" }}>{finca.eudr_sustainability_notes}</p>}
        {annexBlock(sustainFiles, SUSTAIN_LABEL)}

        <h2 style={{ fontSize: 15, marginTop: 22, borderBottom: "2px solid #3C0A86", paddingBottom: 4 }}>Evaluación de riesgo (Art. 10-11)</h2>
        {(() => {
          const riskLevel = deriveFincaRiskLevel({
            eudrIllegalityIndicators: finca.eudr_illegality_indicators,
            eudrDocsAvailable: finca.eudr_docs_available,
            eudrMitigationEffective: finca.eudr_mitigation_effective,
          });
          const riskText = riskLevel === "insignificante" ? "Insignificante" : riskLevel === "no_insignificante" ? "No insignificante" : "Pendiente";
          return (
            <table style={{ borderCollapse: "collapse", fontSize: 13, width: "100%" }}>
              <tbody>
                {row("País / región de producción", "Colombia · riesgo estándar")}
                {row("Método de separación", finca.eudr_custody_method ? CUSTODY_METHOD_LABEL[finca.eudr_custody_method] ?? finca.eudr_custody_method : "sin definir")}
                {finca.eudr_custody_method === "custom" && finca.eudr_custody_notes ? row("Notas de custodia", finca.eudr_custody_notes) : null}
                {row("Cadena de custodia", `${(finca.eudr_custody_stages ?? []).map((k) => CUSTODY_LABEL[k] ?? k).join(", ") || "ninguna"} · complejidad ${deriveChainComplexity(finca.eudr_custody_stages) || "—"}`)}
                {row("Riesgo del producto", `${deriveProductRisk(finca.eudr_product_risk_factors)}${(finca.eudr_product_risk_factors ?? []).length ? " · " + (finca.eudr_product_risk_factors ?? []).map((k) => PRODUCT_RISK_LABEL[k] ?? k).join("; ") : ""}`)}
                {row("Esquemas de certificación", finca.eudr_cert_scheme || "ninguno declarado")}
                {row("Indicios de ilegalidad/deforestación", yesNo(finca.eudr_illegality_indicators))}
                {row("Documentos disponibles y verificables", yesNo(finca.eudr_docs_available))}
                {row("Nivel de riesgo determinado", riskText)}
                {finca.eudr_mitigation_actions ? row("Acciones de mitigación", finca.eudr_mitigation_actions) : null}
                {row("Mitigación efectiva", yesNo(finca.eudr_mitigation_effective))}
                {finca.eudr_mitigation_responsible ? row("Responsable de la determinación", finca.eudr_mitigation_responsible) : null}
              </tbody>
            </table>
          );
        })()}

        {certificates.length > 0 && (
          <>
            <h2 style={{ fontSize: 15, marginTop: 22, borderBottom: "2px solid #3C0A86", paddingBottom: 4 }}>Certificaciones de la finca</h2>
            <table style={{ borderCollapse: "collapse", fontSize: 12.5, width: "100%" }}>
              <thead>
                <tr style={{ color: "#555", textAlign: "left" }}>
                  <th style={{ padding: "4px 12px 4px 0", fontWeight: 600 }}>Esquema</th>
                  <th style={{ padding: "4px 12px 4px 0", fontWeight: 600 }}>N.º</th>
                  <th style={{ padding: "4px 12px 4px 0", fontWeight: 600 }}>Vigencia</th>
                  <th style={{ padding: "4px 0", fontWeight: 600 }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {certificates.map((c, i) => (
                  <tr key={i}>
                    <td style={{ padding: "4px 12px 4px 0", fontWeight: 600 }}>
                      {c.schemeLabel}
                      {c.holderNote ? <span style={{ fontWeight: 400, color: "#555" }}> · {c.holderNote}</span> : null}
                    </td>
                    <td style={{ padding: "4px 12px 4px 0" }}>{c.certNumber || "—"}</td>
                    <td style={{ padding: "4px 12px 4px 0" }}>{c.validFrom && c.validTo ? `${c.validFrom} → ${c.validTo}` : "sin registrar"}</td>
                    <td style={{ padding: "4px 0" }}>{c.verifiedByCtc ? "Verificado por CTC" : "Declarado"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ fontSize: 11, color: "#777", margin: "4px 0 0" }}>
              Los certificados son credenciales del predio/organización y constituyen información complementaria de la evaluación
              de riesgo (Art. 10(2)(n)) — no sustituyen la debida diligencia.
            </p>
          </>
        )}

        <h2 style={{ fontSize: 15, marginTop: 22, borderBottom: "2px solid #3C0A86", paddingBottom: 4 }}>Registro de comunicación</h2>
        {comms.length === 0 ? (
          <p style={{ color: "#555", fontSize: 13 }}>Sin comunicaciones registradas.</p>
        ) : (
          <ul style={{ fontSize: 12.5, paddingLeft: 18 }}>
            {comms.map((c) => (
              <li key={c.id} style={{ marginBottom: 4 }}>
                <b>{c.author_role === "producer" ? "Productor" : "CTC"}</b> · {new Date(c.created_at).toLocaleDateString("es-CO")} — {c.note}
              </li>
            ))}
          </ul>
        )}

        <p style={{ marginTop: 28, fontSize: 11, color: "#777", borderTop: "1px solid #ddd", paddingTop: 8 }}>
          Documento interno de debida diligencia EUDR generado por Colombian Trading Company (CTCx). Compila la información
          declarada, sus anexos y el registro de comunicación con el productor.
        </p>
      </div>
    </div>
  );
}
