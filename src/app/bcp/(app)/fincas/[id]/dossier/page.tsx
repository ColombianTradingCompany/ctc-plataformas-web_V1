import { notFound } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { fetchProducerContacts } from "@/lib/bcpProducers";
import { signedKaffetalMediaUrls } from "@/lib/kaffetalMedia";
import { mapPreviewUrl } from "@/lib/eudr";
import { fincaCode } from "@/components/kaffetal-regal/data";
import { daneCodeFor } from "@/lib/daneCodes";
import { PrintButton } from "./PrintButton";

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
type FincaRow = {
  id: string;
  name: string;
  producer_id: string;
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
  eudr_legal_docs_asset_id: string | null;
  eudr_legal_docs_filename: string | null;
  eudr_sustainability_tags: string[] | null;
  eudr_sustainability_notes: string | null;
  eudr_evidence_files: KeyedFiles | null;
  eudr_sustainability_files: KeyedFiles | null;
};
type CommRow = { id: string; note: string; created_at: string; author_role: string };

const yesNo = (v: boolean | null) => (v === true ? "Sí" : v === false ? "No" : "Sin definir");
const isImage = (name: string) => /\.(png|jpe?g|webp|gif)$/i.test(name);

export default async function FincaDossierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const service = createServiceRoleClient();

  const { data } = await service
    .from("fincas")
    .select(
      `id, name, producer_id, status, vereda, municipio, departamento, hectares, eudr_lat, eudr_lng, eudr_polygon_geojson,
       eudr_planting_date, eudr_production_system, eudr_deforestation_free, eudr_legal_production, eudr_evidence_types,
       eudr_evidence_notes, eudr_legal_areas, eudr_tenure, eudr_legal_docs_asset_id, eudr_legal_docs_filename,
       eudr_sustainability_tags, eudr_sustainability_notes, eudr_evidence_files, eudr_sustainability_files`
    )
    .eq("id", id)
    .single();
  const finca = data as FincaRow | null;
  if (!finca) notFound();

  const evidenceFiles = finca.eudr_evidence_files ?? {};
  const sustainFiles = finca.eudr_sustainability_files ?? {};
  const [producers, { data: commsData }, urlByAsset] = await Promise.all([
    fetchProducerContacts(service, [finca.producer_id]),
    service.from("producer_comm_log").select("id, note, created_at, author_role").eq("finca_id", id).order("created_at", { ascending: true }),
    signedKaffetalMediaUrls(service, [
      finca.eudr_legal_docs_asset_id,
      ...Object.values(evidenceFiles).map((v) => v.assetId),
      ...Object.values(sustainFiles).map((v) => v.assetId),
    ]),
  ]);
  const producer = producers.get(finca.producer_id);
  const comms = (commsData as CommRow[] | null) ?? [];
  const dane = daneCodeFor(finca.departamento, finca.municipio);
  const mapUrl = mapPreviewUrl({ lat: finca.eudr_lat, lng: finca.eudr_lng, polygon: finca.eudr_polygon_geojson }, "640x360");
  const legalDocUrl = finca.eudr_legal_docs_asset_id ? urlByAsset.get(finca.eudr_legal_docs_asset_id) : undefined;

  const row = (label: string, value: React.ReactNode) => (
    <tr>
      <td style={{ padding: "6px 12px 6px 0", color: "#555", verticalAlign: "top", width: 220 }}>{label}</td>
      <td style={{ padding: "6px 0", fontWeight: 600 }}>{value}</td>
    </tr>
  );

  const annexBlock = (files: KeyedFiles, labels: Record<string, string>) =>
    Object.entries(files).map(([key, f]) => {
      const url = urlByAsset.get(f.assetId);
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
      {/* CTCx watermark */}
      <div
        id="dossier-watermark"
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          overflow: "hidden",
          zIndex: 0,
          opacity: 0.06,
          backgroundImage:
            "repeating-linear-gradient(-30deg, transparent 0 120px, rgba(0,0,0,0.001) 120px 240px)",
        }}
      >
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

        <p style={{ fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "#3C0A86", margin: 0 }}>
          Colombian Trading Company · CTCx
        </p>
        <h1 style={{ fontSize: 26, margin: "4px 0 2px" }}>Expediente EUDR · Debida Diligencia</h1>
        <p style={{ color: "#555", margin: "0 0 4px" }}>
          Reglamento (UE) 2023/1115 · Documento generado el {new Date().toLocaleDateString("es-CO")}
        </p>
        <p style={{ margin: 0, fontWeight: 700 }}>
          {finca.name} · {fincaCode(finca.id)}
          {finca.status === "approved" ? " · APROBADA" : ` · ${finca.status}`}
        </p>

        <h2 style={{ fontSize: 15, marginTop: 22, borderBottom: "2px solid #3C0A86", paddingBottom: 4 }}>Identidad del predio y proveedor</h2>
        <table style={{ borderCollapse: "collapse", fontSize: 13, width: "100%" }}>
          <tbody>
            {row("Proveedor", `${producer?.fullName ?? "—"}${producer?.companyName ? ` · ${producer.companyName}` : ""}`)}
            {row("Contacto", [producer?.phone, producer?.email].filter(Boolean).join(" · ") || "—")}
            {row("Ubicación", `${finca.vereda ?? "—"}, ${finca.municipio ?? "—"}, ${finca.departamento ?? "—"}`)}
            {row("Código DANE", dane ? `${dane.code} — ${dane.mun}, ${dane.dep} (depto ${dane.depCode})` : "sin coincidencia")}
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

        <h2 style={{ fontSize: 15, marginTop: 22, borderBottom: "2px solid #3C0A86", paddingBottom: 4 }}>Declaraciones EUDR</h2>
        <table style={{ borderCollapse: "collapse", fontSize: 13, width: "100%" }}>
          <tbody>
            {row("Fecha de establecimiento del cultivo", finca.eudr_planting_date || "sin definir")}
            {row("Sistema productivo", finca.eudr_production_system ? PRODUCTION_SYSTEM_LABEL[finca.eudr_production_system] : "sin definir")}
            {row("Libre de deforestación (>31/12/2020)", yesNo(finca.eudr_deforestation_free))}
            {row("Producción en áreas legales", yesNo(finca.eudr_legal_production))}
            {row("Tenencia de la tierra", finca.eudr_tenure ? TENURE_LABEL[finca.eudr_tenure] : "sin definir")}
            {row("Áreas de legislación verificadas", (finca.eudr_legal_areas ?? []).map((k) => LEGAL_AREA_LABEL[k] ?? k).join(", ") || "ninguna")}
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
