import { ctcLotReference, ctcLotReferenceShort, fincaCode } from "./data";
import { PRODUCT_RISK_QUESTIONS } from "@/lib/eudr";
import { PrintButton } from "./PrintButton";

const CUSTODY_LABEL: Record<string, string> = {
  finca: "Finca",
  beneficio: "Beneficio",
  secado: "Secado",
  trilla: "Trilla",
  almacenamiento: "Almacenamiento",
  exportacion: "Exportación",
};
const CUSTODY_ORDER = ["finca", "beneficio", "secado", "trilla", "almacenamiento", "exportacion"];
const PRODUCT_RISK_LABEL: Record<string, string> = Object.fromEntries(PRODUCT_RISK_QUESTIONS);
const RISK_LEVEL_LABEL: Record<string, string> = { insignificante: "Insignificante", no_insignificante: "No insignificante" };

export type CertLot = {
  id: string;
  name: string;
  ficha_variedad: string | null;
  ficha_proceso: string | null;
  ficha_altitud_m: number | null;
  eudr_custody_stages: string[] | null;
  eudr_custody_method: string | null;
  eudr_custody_notes: string | null;
  eudr_country: string | null;
  eudr_country_risk: string | null;
  eudr_chain_complexity: string | null;
  eudr_product_risk: string | null;
  eudr_product_risk_factors: string[] | null;
  eudr_illegality_indicators: boolean | null;
  eudr_docs_available: boolean | null;
  eudr_cert_scheme: string | null;
  eudr_risk_level: string | null;
  eudr_mitigation_actions: string | null;
  eudr_mitigation_effective: boolean | null;
  eudr_mitigation_responsible: string | null;
};

export type CertFinca = { id: string; name: string; municipio: string | null; departamento: string | null };

const yesNo = (v: boolean | null) => (v === true ? "Sí" : v === false ? "No" : "Sin definir");

// Lot-level EUDR certificate: the LOT document of the voluntary EUDR
// certification (the finca-level Expediente EUDR is its sibling — see
// EudrDossierDoc). Same watermarked print-ready language; rendered from the
// producer route /kaffetal-regal/certificacion-lote/[id].
export function LotEudrCertDoc({
  lot,
  fincas,
  producerName,
  producerContact,
  comms,
}: {
  lot: CertLot;
  fincas: CertFinca[];
  producerName: string;
  producerContact: string;
  comms: { id: string; note: string; created_at: string; author_role: string }[];
}) {
  const row = (label: string, value: React.ReactNode) => (
    <tr>
      <td style={{ padding: "6px 12px 6px 0", color: "#555", verticalAlign: "top", width: 230 }}>{label}</td>
      <td style={{ padding: "6px 0", fontWeight: 600 }}>{value}</td>
    </tr>
  );
  const custody = CUSTODY_ORDER.filter((k) => lot.eudr_custody_stages?.includes(k));
  const factors = lot.eudr_product_risk_factors ?? [];

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
            <h1 style={{ fontSize: 26, margin: "4px 0 2px" }}>Sello EUDR del Lote</h1>
            <p style={{ color: "#555", margin: "0 0 4px" }}>Reglamento (UE) 2023/1115 · Documento generado el {new Date().toLocaleDateString("es-CO")}</p>
            <p style={{ margin: 0, fontWeight: 700 }}>
              {lot.name} · <span style={{ fontFamily: "monospace" }}>{ctcLotReferenceShort(lot.id)}</span>
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 11, color: "#555", fontFamily: "monospace", overflowWrap: "anywhere" }}>{ctcLotReference(lot.id)}</p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element -- local public asset */}
          <img src="/docs/eudr/sello-eudr-voluntario.png" alt="Sello EUDR Voluntario CTC" style={{ width: 110, height: "auto", flex: "0 0 auto" }} />
        </div>

        <div style={{ background: "#F3EFFB", border: "1px solid #d9ccf2", borderRadius: 8, padding: "10px 14px", marginTop: 14, fontSize: 12.5, color: "#3a2a5e" }}>
          <b>Sello EUDR del lote — heredado de la Visa EUDR de su(s) finca(s) de origen.</b> La debida diligencia
          (Reglamento (UE) 2023/1115) vive en la finca: su <b>Visa EUDR</b> acredita el origen libre de deforestación
          posterior al 31/12/2020, la producción legal, la tenencia y la geolocalización del predio. Este Sello se
          emite por herencia directa de esa Visa vigente — el lote no requiere trámites adicionales.
        </div>

        <h2 style={{ fontSize: 15, marginTop: 22, borderBottom: "2px solid #3C0A86", paddingBottom: 4 }}>Identidad del lote</h2>
        <table style={{ borderCollapse: "collapse", fontSize: 13, width: "100%" }}>
          <tbody>
            {row("Proveedor", producerName)}
            {row("Contacto", producerContact || "—")}
            {row("Variedad", lot.ficha_variedad || "—")}
            {row("Proceso", lot.ficha_proceso || "—")}
            {row("Altitud", lot.ficha_altitud_m ? `${lot.ficha_altitud_m} msnm` : "—")}
            {row(
              "Finca(s) de origen",
              fincas.length
                ? fincas.map((f) => `${f.name} (${fincaCode(f.id)}) · ${f.municipio ?? "—"}, ${f.departamento ?? "—"}`).join(" · ")
                : "sin resolver"
            )}
          </tbody>
        </table>

        {/* Anexo HISTÓRICO (modelo Visa/Sello 2026-07-24): la cadena de custodia y
            la evaluación de riesgo por lote ya no se diligencian — se imprimen solo
            si el lote las tiene de antes. */}
        {custody.length > 0 && (<>
        <h2 style={{ fontSize: 15, marginTop: 22, borderBottom: "2px solid #3C0A86", paddingBottom: 4 }}>Cadena de custodia (anexo histórico)</h2>
        <p style={{ fontSize: 13, fontWeight: 600 }}>{custody.map((k) => CUSTODY_LABEL[k]).join(" → ")}</p>
        <p style={{ fontSize: 12.5, color: "#555" }}>
          {lot.eudr_custody_method === "ctc_standard" ? (
            <>
              <b>CTC Parchment Storage Standard:</b> sacos de yute con liner hermético, tarjeta indicadora de humedad (HIC)
              y código QR vinculado al código CTC del lote — separación física y documental cubiertas por el estándar.
            </>
          ) : lot.eudr_custody_method === "custom" ? (
            <>
              <b>Método propio de separación:</b> {lot.eudr_custody_notes || "sin descripción"}
            </>
          ) : (
            "Método de separación sin definir."
          )}
        </p>

        </>)}

        {(lot.eudr_country || lot.eudr_risk_level) && (
          <>
            <h2 style={{ fontSize: 15, marginTop: 22, borderBottom: "2px solid #3C0A86", paddingBottom: 4 }}>Evaluación de riesgo (anexo histórico · Art. 10)</h2>
            <table style={{ borderCollapse: "collapse", fontSize: 13, width: "100%" }}>
              <tbody>
                {row("País / región de producción", lot.eudr_country ? `${lot.eudr_country} · riesgo ${lot.eudr_country_risk ?? "Estándar"} (Reg. UE 2025/1093)` : "sin definir")}
                {row("Complejidad de la cadena", lot.eudr_chain_complexity || "sin definir")}
                {row("Riesgo propio del producto", lot.eudr_product_risk || "sin definir")}
                {factors.length > 0 &&
                  row(
                    "Factores declarados",
                    <ul style={{ margin: 0, paddingLeft: 16, fontWeight: 400 }}>
                      {factors.map((k) => (
                        <li key={k}>{PRODUCT_RISK_LABEL[k] ?? k}</li>
                      ))}
                    </ul>
                  )}
                {row("Esquemas de certificación / verificación", lot.eudr_cert_scheme || "ninguno declarado")}
                {row("Indicios de ilegalidad o deforestación", yesNo(lot.eudr_illegality_indicators))}
                {row("Documentos disponibles y verificables", yesNo(lot.eudr_docs_available))}
                {row(
                  "Nivel de riesgo determinado",
                  <span style={{ color: lot.eudr_risk_level === "no_insignificante" ? "#C4402F" : "#166534" }}>
                    {RISK_LEVEL_LABEL[lot.eudr_risk_level ?? ""] ?? "Pendiente"}
                  </span>
                )}
              </tbody>
            </table>
          </>
        )}

        {(lot.eudr_mitigation_actions || lot.eudr_mitigation_effective !== null || lot.eudr_mitigation_responsible) && (
          <>
            <h2 style={{ fontSize: 15, marginTop: 22, borderBottom: "2px solid #3C0A86", paddingBottom: 4 }}>Mitigación (Art. 11)</h2>
            <table style={{ borderCollapse: "collapse", fontSize: 13, width: "100%" }}>
              <tbody>
                {row("Acciones adoptadas (productor)", lot.eudr_mitigation_actions || "—")}
                {row("¿Reduce el riesgo a insignificante?", yesNo(lot.eudr_mitigation_effective))}
                {row("Responsable de la determinación", lot.eudr_mitigation_responsible || "—")}
              </tbody>
            </table>
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
          Documento de debida diligencia EUDR a nivel de lote generado por Colombian Trading Company (CTCx). Compila la
          cadena de custodia declarada, la evaluación de riesgo y su mitigación, junto con el registro de comunicación.
        </p>
      </div>
    </div>
  );
}
