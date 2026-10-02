"use client";

import { Fragment, useState } from "react";
import styles from "@/components/panel/shared.module.css";

// ── Piezas visuales de la revisión EUDR de una finca (V5.119, owner 2026-10-01) ───────────────────────────────────
// «Quiero que la información sea más intuitiva para la revisión.» Cada pieza es PURA presentación: lee un valor y lo
// pinta contra su referencia; ninguna decide nada (las reglas siguen en `src/lib/eudr.ts`).
//   · BarraArea — el área cultivada contra los 4 ha del EUDR (≤4 ha basta un punto; >4 ha exige polígono); tope visual
//     de 30 ha: más allá, la barra se corta y lo dice.
//   · LineaDeTiempo — la fecha de establecimiento del cultivo contra el corte del EUDR (31/12/2020) y hoy.
//   · SiNo — un «Sí»/«No» en verde o rojo según cuál sea la buena respuesta para esa pregunta.
//   · Fichas — una ficha por opción (como las del cuestionario del productor): verde la marcada, gris la que no; o
//     verde/rojo cuando «no marcada» es una falta.
//   · Coordenada — lat, lng con botón de copiar (el centro del polígono, o el punto).

export const EUDR_HA_REFERENCIA = 4;
export const EUDR_HA_TOPE_VISUAL = 30;
/** El corte del EUDR: nada deforestado después de esta fecha (Reglamento (UE) 2023/1115, art. 2.8). */
export const EUDR_FECHA_CORTE = "2020-12-31";

const VERDE = "#166534";
const VERDE_FONDO = "#DCFCE7";
const ROJO = "#991B1B";
const ROJO_FONDO = "#FEE2E2";
const AMBAR = "#92400E";
const AMBAR_FONDO = "#FEF3C7";

export function BarraArea({ ha }: { ha: number | string | null | undefined }) {
  const n = ha == null || String(ha).trim() === "" ? NaN : Number(String(ha).replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) {
    return <span className={`${styles.badge} ${styles.badgeBad}`}>Área sin definir</span>;
  }
  const truncada = n > EUDR_HA_TOPE_VISUAL;
  const pct = Math.min(n, EUDR_HA_TOPE_VISUAL) / EUDR_HA_TOPE_VISUAL;
  const refPct = EUDR_HA_REFERENCIA / EUDR_HA_TOPE_VISUAL;
  const exigePoligono = n > EUDR_HA_REFERENCIA;
  return (
    <div style={{ maxWidth: 560 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        <b style={{ fontSize: 14 }}>{n.toLocaleString("es-CO")} ha</b>
        <span className={`${styles.badge} ${exigePoligono ? styles.badgeWarn : styles.badgeGood}`}>
          {exigePoligono ? `> ${EUDR_HA_REFERENCIA} ha · exige polígono` : `≤ ${EUDR_HA_REFERENCIA} ha · basta un punto`}
        </span>
      </div>
      <div style={{ position: "relative", height: 18, marginTop: 6, background: "var(--line)", borderRadius: 6, overflow: "hidden" }} aria-label={`Área ${n} ha sobre una escala de ${EUDR_HA_TOPE_VISUAL} ha; referencia ${EUDR_HA_REFERENCIA} ha`}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${pct * 100}%`, background: exigePoligono ? "#D97706" : "#16A34A", opacity: 0.85 }} />
        {truncada && (
          <div
            aria-hidden
            style={{
              position: "absolute", right: 0, top: 0, bottom: 0, width: 26,
              background: "repeating-linear-gradient(135deg, rgba(255,255,255,.75) 0 4px, transparent 4px 8px)",
            }}
          />
        )}
        <div style={{ position: "absolute", left: `${refPct * 100}%`, top: 0, bottom: 0, width: 2, background: "var(--ink)" }} />
      </div>
      <div style={{ position: "relative", height: 14, fontSize: 10.5, color: "var(--muted)", fontFamily: "var(--font-spline-mono), monospace" }}>
        <span style={{ position: "absolute", left: 0 }}>0</span>
        <span style={{ position: "absolute", left: `${refPct * 100}%`, transform: "translateX(-50%)", fontWeight: 700, color: "var(--ink)" }}>{EUDR_HA_REFERENCIA} ha ref.</span>
        <span style={{ position: "absolute", right: 0 }}>{truncada ? `${EUDR_HA_TOPE_VISUAL} ha + … (la barra se corta)` : `${EUDR_HA_TOPE_VISUAL} ha`}</span>
      </div>
    </div>
  );
}

/** Hacia dónde crece el rótulo de un punto de la línea: centrado, o hacia adentro si el punto cae cerca de un borde. */
export function anclaDelRotulo(fraccion: number, bordeIzq: number, bordeDer: number): "inicio" | "centro" | "fin" {
  return fraccion < bordeIzq ? "inicio" : fraccion > bordeDer ? "fin" : "centro";
}

export function LineaDeTiempo({ fecha }: { fecha: string | null | undefined }) {
  const [hoyAlMontar] = useState(() => Date.now());
  if (!fecha) return <span className={`${styles.badge} ${styles.badgeBad}`}>Fecha sin definir</span>;
  const siembra = Date.parse(fecha);
  if (!Number.isFinite(siembra)) return <span className={`${styles.badge} ${styles.badgeBad}`}>Fecha inválida ({fecha})</span>;
  const corte = Date.parse(EUDR_FECHA_CORTE);
  // «Hoy» se fija una vez al montar (el compilador de React no admite Date.now() en el render).
  const hoy = hoyAlMontar;
  const inicio = Math.min(siembra, corte) - 365 * 86_400_000; // un año de aire antes de lo más antiguo
  const fin = hoy;
  const frac = (t: number) => Math.max(0, Math.min(1, (t - inicio) / (fin - inicio)));
  // Dos decimales: el servidor y el navegador toman «hoy» con milisegundos de diferencia, y sin redondear la posición
  // salía distinta en el decimal 12 — un aviso de hidratación en cada carga, sin nada que ver en pantalla.
  const pos = (t: number) => `${(frac(t) * 100).toFixed(2)}%`;
  const despuesDelCorte = siembra > corte;
  const anos = Math.floor((hoy - siembra) / (365.25 * 86_400_000));
  const fmt = (t: number) => new Date(t).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
  return (
    <div style={{ maxWidth: 560 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        <b style={{ fontSize: 14 }}>{fmt(siembra)}</b>
        <span className={`${styles.badge} ${despuesDelCorte ? styles.badgeWarn : styles.badgeGood}`}>
          {despuesDelCorte ? "sembrado DESPUÉS del corte EUDR · exige evidencia de no deforestación" : `sembrado antes del corte EUDR · ${anos} año${anos === 1 ? "" : "s"} hasta hoy`}
        </span>
      </div>
      {/* V5.141 (owner, 2026-10-02): «siembra» y «corte EUDR» se pisaban cuando las dos fechas quedan cerca (un cultivo de
          2020). Los rótulos van en DOS renglones —la siembra ARRIBA de la línea; el corte y «hoy», debajo— y cada uno se
          ancla hacia adentro cuando su punto cae cerca de un borde, para que no se salga ni choque con «hoy». */}
      <div style={{ position: "relative", height: 46, marginTop: 6 }} aria-label={`Línea de tiempo: siembra ${fecha}, corte EUDR ${EUDR_FECHA_CORTE}, hoy`}>
        <div style={{ position: "absolute", left: 0, right: 0, top: 20, height: 4, background: "var(--line)", borderRadius: 2 }} />
        <div style={{ position: "absolute", left: pos(siembra), right: 0, top: 20, height: 4, background: despuesDelCorte ? "#D97706" : "#16A34A", borderRadius: 2 }} />
        {(
          [
            { t: siembra, label: "siembra", color: despuesDelCorte ? "#D97706" : "#16A34A", arriba: true, ancla: anclaDelRotulo(frac(siembra), 0.12, 0.88) },
            { t: corte, label: "corte EUDR 31/12/2020", color: "var(--ink)", arriba: false, ancla: anclaDelRotulo(frac(corte), 0.2, 0.7) },
            { t: hoy, label: "hoy", color: "var(--primary)", arriba: false, ancla: "fin" },
          ] as const
        ).map((m) => (
          <Fragment key={m.label}>
            <div style={{ position: "absolute", left: pos(m.t), top: 14, width: 12, height: 12, transform: "translateX(-50%)", borderRadius: "50%", background: m.color, border: "2px solid #fff", boxShadow: "0 0 0 1px var(--line)" }} />
            <div
              data-rotulo={m.arriba ? "arriba" : "abajo"}
              style={{
                position: "absolute",
                top: m.arriba ? 0 : 30,
                left: m.ancla === "inicio" ? `calc(${pos(m.t)} - 6px)` : m.ancla === "fin" ? `calc(${pos(m.t)} + 6px)` : pos(m.t),
                transform: m.ancla === "inicio" ? undefined : m.ancla === "fin" ? "translateX(-100%)" : "translateX(-50%)",
                fontSize: 10,
                lineHeight: "13px",
                color: "var(--muted)",
                whiteSpace: "nowrap",
                fontFamily: "var(--font-spline-mono), monospace",
              }}
            >
              {m.label}
            </div>
          </Fragment>
        ))}
      </div>
    </div>
  );
}

/** «Sí» / «No» en color. `bienSi` dice cuál es la respuesta buena para ESTA pregunta (p. ej. «¿indicios de ilegalidad?» → bien = No). */
export function SiNo({ v, bienSi = true, si = "Sí", no = "No" }: { v: boolean | null | undefined; bienSi?: boolean; si?: string; no?: string }) {
  if (v == null) return <span className={styles.badge}>Sin definir</span>;
  const bien = v === bienSi;
  return <span className={`${styles.badge} ${bien ? styles.badgeGood : styles.badgeBad}`}>{v ? si : no}</span>;
}

/** Fichas por opción. `faltante`: cómo pintar la NO marcada — «gris» (opcional) o «rojo» (es una falta). */
export function Fichas({
  opciones,
  activas,
  faltante = "gris",
  titulos,
}: {
  opciones: [string, string][];
  activas: string[] | null | undefined;
  faltante?: "gris" | "rojo";
  titulos?: Record<string, string>;
}) {
  const on = new Set(activas ?? []);
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
      {opciones.map(([k, label]) => {
        const activa = on.has(k);
        const bg = activa ? VERDE_FONDO : faltante === "rojo" ? ROJO_FONDO : "transparent";
        const color = activa ? VERDE : faltante === "rojo" ? ROJO : "var(--muted)";
        const borde = activa ? VERDE : faltante === "rojo" ? ROJO : "var(--line)";
        return (
          <span
            key={k}
            title={titulos?.[k]}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, border: `1.5px solid ${borde}`, background: bg, color, borderRadius: 10, padding: "5px 10px", fontSize: 12, fontWeight: activa ? 700 : 500, lineHeight: 1.3 }}
          >
            <span aria-hidden style={{ fontSize: 11 }}>{activa ? "✓" : faltante === "rojo" ? "✗" : "○"}</span>
            {label}
          </span>
        );
      })}
    </div>
  );
}

/** Lat, lng con botón de copiar. `origen` dice de dónde sale: el centro del polígono o el punto marcado. */
export function Coordenada({ lat, lng, origen }: { lat: number; lng: number; origen: "centro del polígono" | "punto marcado" }) {
  const [copiado, setCopiado] = useState(false);
  const texto = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 1600);
    } catch {
      window.prompt("Copie la coordenada:", texto);
    }
  }
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <span className="mono" style={{ fontSize: 12.5 }}>{texto}</span>
      <span className={styles.meta} style={{ margin: 0, fontSize: 11 }}>({origen})</span>
      <button type="button" className="btn btn-sm" onClick={copiar} title="Copiar lat, lng (WGS84)">
        {copiado ? "Copiado ✓" : "Copiar"}
      </button>
    </span>
  );
}

/** El documento de respaldo: rojo si no hay. */
export function Documento({ nombre, url, vacio = "No adjuntado" }: { nombre: string | null | undefined; url?: string | null; vacio?: string }) {
  if (!nombre) return <span className={`${styles.badge} ${styles.badgeBad}`}>{vacio}</span>;
  return (
    <span className={`${styles.badge} ${styles.badgeGood}`} style={{ textTransform: "none", letterSpacing: 0 }}>
      ✓ {url ? <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: "inherit" }}>{nombre}</a> : nombre}
    </span>
  );
}

export const COLORES_EUDR = { VERDE, VERDE_FONDO, ROJO, ROJO_FONDO, AMBAR, AMBAR_FONDO };
