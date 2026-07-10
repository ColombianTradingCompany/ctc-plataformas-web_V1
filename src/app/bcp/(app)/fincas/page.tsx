import { createServiceRoleClient } from "@/lib/supabase/server";
import { fincaEudrStatus, type FincaEudrFields } from "@/lib/eudr";
import { EudrStatusBadge } from "@/components/kaffetal-regal/EudrStatusBadge";
import { approveFinca, rejectFinca, updateFincaEudr } from "../actions";
import styles from "../shared.module.css";

const EVIDENCE_TYPES: [string, string][] = [
  ["satelital", "Imágenes satelitales"], ["observatory", "EU Observatory 2020"],
  ["registros", "Registros productivos"], ["terreno", "Verificación en campo"], ["catastro", "Mapas catastrales"],
];
const LEGAL_AREAS: [string, string][] = [
  ["suelo", "Uso del suelo y forestal"], ["ambiental", "Protección ambiental"],
  ["laboral", "Laborales y humanos"], ["clpi", "CLPI / terceros"], ["fiscal", "Fiscal / anticorrupción / aduanas"],
];
const SUSTAINABILITY_TAGS: [string, string][] = [
  ["sa8000", "SA 8000 evaluación voluntaria"], ["familiar", "Agricultura familiar campesina"],
  ["inclusion", "Inclusión de mujeres y jóvenes"], ["paisaje", "Conservación de paisajes"],
];

type FincaRow = {
  id: string;
  name: string;
  vereda: string | null;
  municipio: string | null;
  departamento: string | null;
  hectares: string | number | null;
  requires_eudr_polygon: boolean | null;
  eudr_polygon: unknown;
  eudr_lat: string | number | null;
  eudr_lng: string | number | null;
  eudr_planting_date: string | null;
  eudr_production_system: string | null;
  eudr_deforestation_free: boolean | null;
  eudr_legal_production: boolean | null;
  eudr_evidence_types: string[] | null;
  eudr_evidence_notes: string | null;
  eudr_legal_areas: string[] | null;
  eudr_tenure: string | null;
  eudr_legal_docs: string | null;
  eudr_sustainability_tags: string[] | null;
  eudr_sustainability_notes: string | null;
  created_at: string;
};

function toEudrFields(f: FincaRow): FincaEudrFields {
  return {
    name: f.name,
    ha: f.hectares != null ? String(f.hectares) : "—",
    lat: f.eudr_lat != null ? String(f.eudr_lat) : "",
    lng: f.eudr_lng != null ? String(f.eudr_lng) : "",
    vereda: f.vereda || "—",
    mun: f.municipio || "—",
    depto: f.departamento || "—",
    eudrDeforestationFree: f.eudr_deforestation_free,
    eudrLegalProduction: f.eudr_legal_production,
    eudrLegalAreas: f.eudr_legal_areas || [],
    eudrTenure: (f.eudr_tenure as FincaEudrFields["eudrTenure"]) || "",
  };
}

function missingChecks(f: FincaEudrFields): string[] {
  const gaps: string[] = [];
  if (!f.name) gaps.push("nombre");
  if (!((f.lat && f.lng) || f.vereda !== "—" || f.mun !== "—" || f.depto !== "—")) gaps.push("geolocalización o dirección");
  if (!(f.ha !== "—" && Number(f.ha.replace(",", ".")) > 0)) gaps.push("área cultivada");
  if (f.eudrDeforestationFree !== true) gaps.push("declaración de no deforestación");
  if (f.eudrLegalAreas.length === 0) gaps.push("áreas de legislación verificadas");
  if (!f.eudrTenure) gaps.push("tenencia de la tierra");
  return gaps;
}

export default async function BcpFincasPage() {
  const service = createServiceRoleClient();
  const { data: pendingFincas } = await service
    .from("fincas")
    // A single literal string (not runtime-concatenated) -- see the note on
    // the lots query in ../lotes/page.tsx for why that distinction matters.
    .select(
      `id, name, vereda, municipio, departamento, hectares, requires_eudr_polygon, eudr_polygon, eudr_lat, eudr_lng,
       eudr_planting_date, eudr_production_system, eudr_deforestation_free, eudr_legal_production, eudr_evidence_types,
       eudr_evidence_notes, eudr_legal_areas, eudr_tenure, eudr_legal_docs, eudr_sustainability_tags, eudr_sustainability_notes, created_at`
    )
    .eq("status", "pending_review")
    .order("created_at", { ascending: true });

  return (
    <div>
      <h1 className={styles.title}>Fincas pendientes de revisión</h1>
      {!pendingFincas?.length && <p className={styles.empty}>No hay fincas pendientes.</p>}
      <div className={styles.list}>
        {(pendingFincas as FincaRow[] | null)?.map((finca) => {
          const eudrFields = toEudrFields(finca);
          const status = fincaEudrStatus(eudrFields);
          const gaps = missingChecks(eudrFields);
          const blockedByPolygon = !!(finca.requires_eudr_polygon && !finca.eudr_polygon);
          const blockedByEudr = status.code === "no_apta" || blockedByPolygon;

          async function reject(formData: FormData) {
            "use server";
            await rejectFinca(finca.id, String(formData.get("notes") ?? ""));
          }
          async function saveEudr(formData: FormData) {
            "use server";
            await updateFincaEudr(finca.id, formData);
          }

          return (
            <div className={styles.card} key={finca.id} style={{ flexDirection: "column", alignItems: "stretch" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <h3>{finca.name}</h3>
                    <EudrStatusBadge status={status} />
                  </div>
                  <p className={styles.meta}>
                    {finca.municipio}, {finca.departamento} · {finca.hectares} ha
                    {finca.requires_eudr_polygon && " · requiere polígono EUDR"}
                  </p>
                  {blockedByPolygon && <p className={styles.warn}>Falta el polígono EUDR — no se puede aprobar todavía.</p>}
                  {status.code === "no_apta" && (
                    <p className={styles.warn}>Deforestación o producción ilegal declarada — no se puede aprobar.</p>
                  )}
                  {status.code === "pendiente" && gaps.length > 0 && (
                    <p className={styles.meta}>Falta: {gaps.join(", ")}.</p>
                  )}
                </div>
                <div className={styles.actions}>
                  <form action={approveFinca.bind(null, finca.id)}>
                    <button className="btn btn-solid" type="submit" disabled={blockedByEudr}>
                      Aprobar
                    </button>
                  </form>
                  <form action={reject} className={styles.rejectForm}>
                    <input name="notes" placeholder="Motivo del rechazo (opcional)" />
                    <button className="btn" type="submit">
                      Rechazar
                    </button>
                  </form>
                </div>
              </div>

              <details style={{ marginTop: 14 }}>
                <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 13.5 }}>
                  Completar información EUDR (asistencia BCP)
                </summary>
                <form action={saveEudr} style={{ marginTop: 14 }}>
                  <div className={styles.formGrid}>
                    <div className={styles.field}>
                      <label>Latitud (WGS84)</label>
                      <input name="eudr_lat" defaultValue={finca.eudr_lat ?? ""} placeholder="4.712345" />
                    </div>
                    <div className={styles.field}>
                      <label>Longitud (WGS84)</label>
                      <input name="eudr_lng" defaultValue={finca.eudr_lng ?? ""} placeholder="-75.612345" />
                    </div>
                    <div className={styles.field}>
                      <label>Fecha de establecimiento del cultivo</label>
                      <input type="date" name="eudr_planting_date" defaultValue={finca.eudr_planting_date ?? ""} />
                    </div>
                    <div className={styles.field}>
                      <label>Sistema productivo</label>
                      <select name="eudr_production_system" defaultValue={finca.eudr_production_system ?? ""}>
                        <option value="">Seleccione…</option>
                        <option value="sombra">Café bajo sombra</option>
                        <option value="agroforestal">Agroforestal</option>
                        <option value="tradicional">Tradicional / pleno sol</option>
                      </select>
                    </div>
                    <div className={styles.field}>
                      <label>¿Libre de deforestación posterior al 31/12/2020?</label>
                      <select name="eudr_deforestation_free" defaultValue={triSelectValue(finca.eudr_deforestation_free)}>
                        <option value="">Sin definir</option>
                        <option value="si">Sí</option>
                        <option value="no">No</option>
                      </select>
                    </div>
                    <div className={styles.field}>
                      <label>¿Producción en áreas legalmente establecidas?</label>
                      <select name="eudr_legal_production" defaultValue={triSelectValue(finca.eudr_legal_production)}>
                        <option value="">Sin definir</option>
                        <option value="si">Sí</option>
                        <option value="no">No</option>
                      </select>
                    </div>
                    <div className={styles.field}>
                      <label>Tenencia de la tierra</label>
                      <select name="eudr_tenure" defaultValue={finca.eudr_tenure ?? ""}>
                        <option value="">Seleccione…</option>
                        <option value="propietario">Propietario</option>
                        <option value="poseedor">Poseedor reconocido</option>
                        <option value="asociacion">Asociación</option>
                      </select>
                    </div>
                  </div>

                  <div className={styles.field}>
                    <label>Evidencia disponible</label>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      {EVIDENCE_TYPES.map(([key, label]) => (
                        <label key={key} style={{ display: "inline-flex", gap: 6, fontSize: 13, fontWeight: 400 }}>
                          <input type="checkbox" name="eudr_evidence_types" value={key} defaultChecked={finca.eudr_evidence_types?.includes(key)} /> {label}
                        </label>
                      ))}
                    </div>
                    <textarea name="eudr_evidence_notes" defaultValue={finca.eudr_evidence_notes ?? ""} placeholder="Fechas, fuente, quién verificó…" />
                  </div>

                  <div className={styles.field}>
                    <label>Áreas de legislación verificadas</label>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      {LEGAL_AREAS.map(([key, label]) => (
                        <label key={key} style={{ display: "inline-flex", gap: 6, fontSize: 13, fontWeight: 400 }}>
                          <input type="checkbox" name="eudr_legal_areas" value={key} defaultChecked={finca.eudr_legal_areas?.includes(key)} /> {label}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className={styles.field}>
                    <label>Documentos de respaldo disponibles</label>
                    <textarea name="eudr_legal_docs" defaultValue={finca.eudr_legal_docs ?? ""} />
                  </div>

                  <div className={styles.field}>
                    <label>Sostenibilidad y enfoque social</label>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      {SUSTAINABILITY_TAGS.map(([key, label]) => (
                        <label key={key} style={{ display: "inline-flex", gap: 6, fontSize: 13, fontWeight: 400 }}>
                          <input type="checkbox" name="eudr_sustainability_tags" value={key} defaultChecked={finca.eudr_sustainability_tags?.includes(key)} /> {label}
                        </label>
                      ))}
                    </div>
                    <textarea name="eudr_sustainability_notes" defaultValue={finca.eudr_sustainability_notes ?? ""} />
                  </div>

                  <button className="btn btn-solid" type="submit">Guardar información EUDR</button>
                </form>
              </details>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function triSelectValue(v: boolean | null): string {
  if (v === true) return "si";
  if (v === false) return "no";
  return "";
}
