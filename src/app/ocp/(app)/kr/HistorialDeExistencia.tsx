import styles from "@/components/panel/shared.module.css";
import { ORIGEN_DE_EXISTENCIA_LABEL, CONTROL_DE_EXISTENCIA, type ControlDeExistencia, type NivelDeAlerta } from "@/lib/kaffetal/controlDeExistencia";

// ── V5.182 · el ancla de control de la existencia, en la vista del lote (owner, 2026-10-07) ────────────────────────────────────
// Cada cambio de la existencia de CPS —dónde, quién, antes → ahora, cuánto— tal como lo guardó la base (inmutable), calificado
// por `controlDeExistencia`: notable (≥ 20 %, borrada, 3 cambios en 30 días) o abrupto (≥ 50 %, o por encima de la producción
// estimada de A2). Sin estado propio: se pinta en el servidor.

const fecha = (iso: string) =>
  new Date(iso.replace(" ", "T")).toLocaleString("es-CO", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/Bogota" });
const kg = (n: number | null) => (n == null ? "—" : `${Math.round(n).toLocaleString("es-CO")} kg`);
const CHIP: Record<NivelDeAlerta, { texto: string; cls: string | undefined }> = {
  normal: { texto: "", cls: undefined },
  notable: { texto: "notable", cls: styles.badgeWarn },
  abrupto: { texto: "⚠ abrupto", cls: styles.badgeWarn },
};

export function HistorialDeExistencia({ control, quien }: { control: ControlDeExistencia; quien: (uid: string | null | undefined) => string }) {
  if (!control.cambios.length) return null;
  const C = CONTROL_DE_EXISTENCIA;
  return (
    <details open={control.nivel !== "normal"} style={{ marginTop: 8 }}>
      <summary style={{ cursor: "pointer", fontSize: 12.5 }}>
        <b>Historial de la existencia</b> · {control.resumen}{" "}
        {control.nivel !== "normal" && <span className={CHIP[control.nivel].cls}>{CHIP[control.nivel].texto}</span>}
      </summary>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginTop: 6 }}>
        <thead>
          <tr style={{ textAlign: "left", color: "var(--muted)" }}>
            <th style={{ padding: "3px 6px" }}>Cuándo</th>
            <th style={{ padding: "3px 6px" }}>Punto de control</th>
            <th style={{ padding: "3px 6px" }}>Quién</th>
            <th style={{ padding: "3px 6px", textAlign: "right" }}>Antes</th>
            <th style={{ padding: "3px 6px", textAlign: "right" }}>Ahora</th>
            <th style={{ padding: "3px 6px", textAlign: "right" }}>Cambio</th>
            <th style={{ padding: "3px 6px" }}>Control</th>
          </tr>
        </thead>
        <tbody>
          {control.cambios.map((c, i) => (
            <tr key={i} title={c.nota ?? undefined} style={{ borderTop: "1px solid var(--line)", background: c.nivel === "abrupto" ? "color-mix(in srgb, var(--warn, #b5532a) 10%, transparent)" : undefined }}>
              <td style={{ padding: "3px 6px", whiteSpace: "nowrap" }}>{fecha(c.fecha)}</td>
              <td style={{ padding: "3px 6px" }}>
                {ORIGEN_DE_EXISTENCIA_LABEL[c.origen]}
                {c.etapa ? <span style={{ color: "var(--muted)" }}> · {c.etapa}</span> : null}
              </td>
              <td style={{ padding: "3px 6px", whiteSpace: "nowrap" }}>{quien(c.porQuien)}</td>
              <td style={{ padding: "3px 6px", textAlign: "right", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{kg(c.antes)}</td>
              <td style={{ padding: "3px 6px", textAlign: "right", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                <b>{kg(c.nuevo)}</b>
              </td>
              <td style={{ padding: "3px 6px", textAlign: "right", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                {c.cambioPct == null ? "—" : `${c.cambioPct > 0 ? "+" : ""}${Math.round(c.cambioPct)} %`}
              </td>
              <td style={{ padding: "3px 6px" }}>
                {c.nivel !== "normal" && <span className={CHIP[c.nivel].cls}>{CHIP[c.nivel].texto}</span>} {c.motivos.join(" · ")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className={styles.meta} style={{ margin: "4px 0 0" }}>
        El historial lo escribe la base en cada cambio, venga de donde venga, y no se edita ni se borra. Notable: cambia ≥ {C.notablePct} % de una vez, se borra o
        es el {C.cambiosFrecuentes}.º cambio en {C.ventanaDias} días. Abrupto: cambia ≥ {C.abruptoPct} % de una vez o supera la producción estimada (A2) en más de{" "}
        {Math.round((C.margenProduccion - 1) * 100)} %.
      </p>
    </details>
  );
}
