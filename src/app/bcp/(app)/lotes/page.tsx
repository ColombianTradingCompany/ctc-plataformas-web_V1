import { createServiceRoleClient } from "@/lib/supabase/server";
import { createLot, updateLotStage } from "../actions";
import styles from "../shared.module.css";

// evaluado/galardonado are deliberately absent: only closing an Arena session assigns them.
const STAGES = [
  { value: "borrador", label: "Borrador" },
  { value: "ficha_completa", label: "Ficha completa" },
  { value: "videos_ok", label: "Videos ✓" },
  { value: "muestra_transito", label: "Muestra en tránsito" },
  { value: "fila_arena", label: "En fila Arena" },
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

export default async function BcpLotesPage() {
  const service = createServiceRoleClient();

  const [{ data: lots }, { data: approvedFincas }] = await Promise.all([
    service
      .from("lots")
      .select("id, name, stage, grade, source, fincas(name)")
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
        {lots?.map((lot) => (
          <div className={styles.card} key={lot.id}>
            <div>
              <h3>{lot.name}</h3>
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
            </div>
            {lot.stage === "evaluado" || lot.stage === "galardonado" ? (
              <span className={styles.badge}>{STAGE_LABEL[lot.stage]} · asignado por la Arena</span>
            ) : (
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
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
