import { createServiceRoleClient } from "@/lib/supabase/server";
import { createLot, updateLotStage, confirmSampleReceived, updateLotEudr } from "../actions";
import { fincaEudrStatus, lotEudrStatus, type FincaEudrFields } from "@/lib/eudr";
import { EudrStatusBadge } from "@/components/kaffetal-regal/EudrStatusBadge";
import styles from "../shared.module.css";

// evaluado/galardonado are deliberately absent: only closing an Arena session assigns them.
// fila_arena is deliberately absent too: only "Confirmar recibido" can reach it, since
// that action validates the producer already confirmed shipping the sample.
const STAGES = [
  { value: "borrador", label: "Borrador" },
  { value: "ficha_completa", label: "Ficha completa" },
  { value: "videos_ok", label: "Videos ✓" },
  { value: "muestra_transito", label: "Muestra en tránsito" },
] as const;

const STAGE_LABEL: Record<string, string> = {
  borrador: "Borrador",
  ficha_completa: "Ficha completa",
  videos_ok: "Videos ✓",
  muestra_transito: "Muestra en tránsito",
  fila_arena: "En fila Arena",
  evaluado: "Evaluado",
  galardonado: "Galardonado",
};

const GRADE_LABEL: Record<string, string> = { black: "Black", red: "Red", blue: "Blue", gold: "Gold", tyrian: "Tyrian" };

const CUSTODY_STAGES: [string, string][] = [
  ["finca", "Finca"], ["beneficio", "Beneficio"], ["secado", "Secado"],
  ["trilla", "Trilla"], ["almacenamiento", "Almacenamiento"], ["exportacion", "Exportación"],
];

type FincaJoin = {
  name: string | null;
  hectares: string | number | null;
  vereda: string | null;
  municipio: string | null;
  departamento: string | null;
  eudr_lat: string | number | null;
  eudr_lng: string | number | null;
  eudr_deforestation_free: boolean | null;
  eudr_legal_production: boolean | null;
  eudr_legal_areas: string[] | null;
  eudr_tenure: string | null;
} | null;

function toFincaEudrFields(f: FincaJoin): FincaEudrFields | null {
  if (!f) return null;
  return {
    name: f.name || "",
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

function triSelectValue(v: boolean | null): string {
  if (v === true) return "si";
  if (v === false) return "no";
  return "";
}

export default async function BcpLotesPage() {
  const service = createServiceRoleClient();

  const [{ data: lots }, { data: approvedFincas }] = await Promise.all([
    service
      .from("lots")
      // Supabase's select() must be a single literal string (not runtime-concatenated)
      // for its compile-time column parsing to work -- otherwise it falls back to a
      // GenericStringError type and every field access below breaks.
      .select(
        `id, name, stage, grade, source, sample_shipped_at, sample_2kg_confirmed_at,
         eudr_custody_stages, eudr_custody_notes, eudr_country_risk, eudr_chain_complexity, eudr_product_risk,
         eudr_illegality_indicators, eudr_docs_available, eudr_cert_scheme, eudr_risk_level, eudr_mitigation_actions,
         eudr_mitigation_effective, eudr_mitigation_responsible,
         fincas(name, hectares, vereda, municipio, departamento, eudr_lat, eudr_lng, eudr_deforestation_free, eudr_legal_production, eudr_legal_areas, eudr_tenure)`
      )
      .order("created_at", { ascending: false }),
    service.from("fincas").select("id, name, municipio").eq("status", "approved").order("name"),
  ]);

  return (
    <div>
      <h1 className={styles.title}>Lotes</h1>

      <details className={styles.card} style={{ display: "block", marginBottom: 28 }}>
        <summary style={{ cursor: "pointer", fontWeight: 600 }}>Nuevo lote (en nombre del productor)</summary>
        {!approvedFincas?.length ? (
          <p className={styles.empty} style={{ marginTop: 14 }}>
            Aprueba al menos una finca antes de poder crear un lote.
          </p>
        ) : (
          <form action={createLot} style={{ marginTop: 16 }}>
            <div className={styles.field}>
              <label htmlFor="finca_id">Finca</label>
              <select id="finca_id" name="finca_id" required>
                {approvedFincas.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.municipio})
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label htmlFor="name">Nombre del lote</label>
              <input id="name" name="name" required placeholder="Ej. Caturra Natural" />
            </div>
            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label htmlFor="ficha_variedad">Variedad</label>
                <input id="ficha_variedad" name="ficha_variedad" />
              </div>
              <div className={styles.field}>
                <label htmlFor="ficha_proceso">Proceso</label>
                <input id="ficha_proceso" name="ficha_proceso" />
              </div>
              <div className={styles.field}>
                <label htmlFor="ficha_altitud_m">Altitud (m)</label>
                <input id="ficha_altitud_m" name="ficha_altitud_m" type="number" />
              </div>
              <div className={styles.field}>
                <label htmlFor="ficha_peso_muestra_kg">Peso de muestra (kg)</label>
                <input id="ficha_peso_muestra_kg" name="ficha_peso_muestra_kg" type="number" step="0.1" defaultValue={2} />
              </div>
            </div>
            <div className={styles.field}>
              <label htmlFor="ficha_notas_cata">Notas de cata</label>
              <textarea id="ficha_notas_cata" name="ficha_notas_cata" rows={2} />
            </div>
            <button className="btn btn-solid" type="submit">
              Crear lote
            </button>
          </form>
        )}
      </details>

      {!lots?.length && <p className={styles.empty}>No hay lotes todavía.</p>}
      <div className={styles.list}>
        {lots?.map((lot) => {
          const finca = toFincaEudrFields(lot.fincas as unknown as FincaJoin);
          const eudrStatus = lotEudrStatus(lot, finca ? [finca] : []);

          async function saveEudr(formData: FormData) {
            "use server";
            await updateLotEudr(lot.id, formData);
          }

          return (
            <div className={styles.card} key={lot.id} style={{ flexDirection: "column", alignItems: "stretch" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <h3>{lot.name}</h3>
                    <EudrStatusBadge status={eudrStatus} />
                  </div>
                  <p className={styles.meta}>
                    {(lot.fincas as unknown as { name: string } | null)?.name ?? "—"}
                    {lot.grade && (
                      <>
                        {" · "}
                        <span className={styles.badge}>{GRADE_LABEL[lot.grade] ?? lot.grade}</span>
                      </>
                    )}
                    {lot.source === "bcp_manual_entry" && (
                      <>
                        {" · "}
                        <span className={styles.badge}>registrado por BCP</span>
                      </>
                    )}
                  </p>
                  {lot.sample_shipped_at && !lot.sample_2kg_confirmed_at && (
                    <p className={styles.meta}>
                      Muestra enviada por el productor el {new Date(lot.sample_shipped_at).toLocaleDateString("es-CO")} · pendiente de confirmar recibo
                    </p>
                  )}
                  {lot.sample_2kg_confirmed_at && (
                    <p className={styles.meta}>Muestra recibida el {new Date(lot.sample_2kg_confirmed_at).toLocaleDateString("es-CO")}</p>
                  )}
                </div>
                {lot.stage === "evaluado" || lot.stage === "galardonado" || lot.stage === "fila_arena" ? (
                  <span className={styles.badge}>{STAGE_LABEL[lot.stage]}{lot.stage !== "fila_arena" ? " · asignado por la Arena" : ""}</span>
                ) : (
                  <div className={styles.actions} style={{ flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                    <form
                      action={async (formData: FormData) => {
                        "use server";
                        await updateLotStage(lot.id, formData.get("stage") as (typeof STAGES)[number]["value"]);
                      }}
                      className={styles.actions}
                    >
                      <select name="stage" defaultValue={lot.stage}>
                        {STAGES.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                      <button className="btn btn-sm" type="submit">
                        Guardar etapa
                      </button>
                    </form>
                    {(lot.sample_shipped_at || lot.source === "bcp_manual_entry") && !lot.sample_2kg_confirmed_at && (
                      <form
                        action={async () => {
                          "use server";
                          await confirmSampleReceived(lot.id);
                        }}
                      >
                        <button className="btn btn-sm btn-solid" type="submit">
                          Confirmar recibido → fila Arena
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </div>

              {finca && fincaEudrStatus(finca).code === "no_apta" && (
                <p className={styles.warn} style={{ marginTop: 8 }}>
                  La finca de origen tiene deforestación o producción ilegal declarada — este lote no puede colocarse.
                </p>
              )}

              <details style={{ marginTop: 14 }}>
                <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 13.5 }}>
                  Completar información EUDR del lote (asistencia BCP)
                </summary>
                <form action={saveEudr} style={{ marginTop: 14 }}>
                  <div className={styles.field}>
                    <label>Cadena de custodia</label>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      {CUSTODY_STAGES.map(([key, label]) => (
                        <label key={key} style={{ display: "inline-flex", gap: 6, fontSize: 13, fontWeight: 400 }}>
                          <input type="checkbox" name="eudr_custody_stages" value={key} defaultChecked={lot.eudr_custody_stages?.includes(key)} /> {label}
                        </label>
                      ))}
                    </div>
                    <textarea name="eudr_custody_notes" defaultValue={lot.eudr_custody_notes ?? ""} placeholder="Método de separación física / documental…" />
                  </div>

                  <div className={styles.formGrid}>
                    <div className={styles.field}>
                      <label>Riesgo país / región</label>
                      <select name="eudr_country_risk" defaultValue={lot.eudr_country_risk ?? "Estándar"}>
                        {["Bajo", "Estándar", "Alto"].map((v) => <option key={v}>{v}</option>)}
                      </select>
                    </div>
                    <div className={styles.field}>
                      <label>Complejidad de la cadena</label>
                      <select name="eudr_chain_complexity" defaultValue={lot.eudr_chain_complexity ?? ""}>
                        <option value="">Seleccione…</option>
                        {["Bajo", "Medio", "Alto"].map((v) => <option key={v}>{v}</option>)}
                      </select>
                    </div>
                    <div className={styles.field}>
                      <label>Riesgo propio del producto</label>
                      <select name="eudr_product_risk" defaultValue={lot.eudr_product_risk ?? ""}>
                        <option value="">Seleccione…</option>
                        {["Bajo", "Medio", "Alto"].map((v) => <option key={v}>{v}</option>)}
                      </select>
                    </div>
                    <div className={styles.field}>
                      <label>Esquema de certificación (opcional)</label>
                      <input name="eudr_cert_scheme" defaultValue={lot.eudr_cert_scheme ?? ""} />
                    </div>
                    <div className={styles.field}>
                      <label>¿Indicios de ilegalidad/deforestación?</label>
                      <select name="eudr_illegality_indicators" defaultValue={triSelectValue(lot.eudr_illegality_indicators)}>
                        <option value="">Sin definir</option>
                        <option value="si">Sí, hay indicios</option>
                        <option value="no">No hay indicios</option>
                      </select>
                    </div>
                    <div className={styles.field}>
                      <label>¿Documentos disponibles y verificables?</label>
                      <select name="eudr_docs_available" defaultValue={triSelectValue(lot.eudr_docs_available)}>
                        <option value="">Sin definir</option>
                        <option value="si">Sí</option>
                        <option value="no">No</option>
                      </select>
                    </div>
                    <div className={styles.field}>
                      <label>Nivel de riesgo determinado</label>
                      <select name="eudr_risk_level" defaultValue={lot.eudr_risk_level ?? ""}>
                        <option value="">Seleccione…</option>
                        <option value="insignificante">Insignificante</option>
                        <option value="no_insignificante">No insignificante</option>
                      </select>
                    </div>
                  </div>

                  <div className={styles.field}>
                    <label>Acciones de mitigación</label>
                    <textarea name="eudr_mitigation_actions" defaultValue={lot.eudr_mitigation_actions ?? ""} />
                  </div>
                  <div className={styles.formGrid}>
                    <div className={styles.field}>
                      <label>¿La mitigación reduce el riesgo a insignificante?</label>
                      <select name="eudr_mitigation_effective" defaultValue={triSelectValue(lot.eudr_mitigation_effective)}>
                        <option value="">Sin definir</option>
                        <option value="si">Sí</option>
                        <option value="no">No</option>
                      </select>
                    </div>
                    <div className={styles.field}>
                      <label>Responsable y fecha</label>
                      <input name="eudr_mitigation_responsible" defaultValue={lot.eudr_mitigation_responsible ?? ""} />
                    </div>
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
