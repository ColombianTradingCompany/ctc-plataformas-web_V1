"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "@/components/panel/shared.module.css";
import type { estadoDelAgente } from "@/lib/pvc/agente";
import type { FuenteDeInsumo } from "@/lib/pvc/tipos";
import { prepararBorradorAction } from "@/lib/pvc/actions";

// ── Modelo Económico · la edición siguiente (V5.179 · docs/PLAN_CICLOS.md §6) ─────────────────────────────────────────────────────
// El borrador que dejó el agente (semana 1 del ciclo 2, o cuando el owner lo pide): el PVC que da el motor, de dónde salió cada
// insumo —medido (FNC, TRM oficial) o ARRASTRADO de la vigente—, el informe con lo que sugiere y sus fuentes, y el camino para
// publicarlo: el Tablero, cargado con el borrador. Las sugerencias nunca se aplican solas.

export type EstadoDelAgente = Awaited<ReturnType<typeof estadoDelAgente>>;

const cop = (n: number | null | undefined) => (n == null ? "—" : `$${Math.round(n).toLocaleString("es-CO")}`);
const dia = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
const FUENTE: Record<FuenteDeInsumo, string> = {
  fnc_diaria: "FNC, serie diaria",
  fnc_mensual: "FNC, mensual oficial",
  trm_oficial: "TRM oficial del día",
  arrastrado: "⚠ arrastrado de la vigente",
  edicion_vigente: "la edición vigente",
  calendario: "calendario ISO",
};
const ETIQUETA: Record<string, string> = {
  fnc_corte: "FNC al corte",
  fnc_30d: "FNC, promedio 30 días",
  fnc_max90: "FNC, máximo 90 días",
  fnc_prom180: "FNC, promedio 180 días",
  trm: "TRM",
  c_strip: "C strip (US¢/lb)",
  delta: "Diferencial (US$/lb)",
  costo: "Costo de producción (COP/carga)",
  escalamiento: "Escalamiento del costo",
  pvc_anterior: "PVC anterior",
};

export function EdicionSiguiente({ estado }: { estado: EstadoDelAgente }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  if (!estado.ok) {
    return (
      <div className={styles.card} id="siguiente">
        <div className={styles.sectionHead}>
          <strong>Edición siguiente</strong>
        </div>
        <p className={styles.meta} style={{ margin: 0 }}>{estado.motivo}</p>
      </div>
    );
  }
  const { destino, borrador, publicada } = estado;
  const ag = borrador?.agente ?? null;
  const hoy = new Date().toISOString().slice(0, 10);
  const atrasada = !publicada && hoy > destino.publicaAMasTardar;
  const preparar = () =>
    start(async () => {
      setMsg(null);
      const r = await prepararBorradorAction();
      if (r.ok) {
        setMsg({ ok: true, text: "Borrador listo ✓" });
        router.refresh();
      } else setMsg({ ok: false, text: r.error });
    });
  const delta = borrador?.pvc != null && estado.vigentePvc ? borrador.pvc / estado.vigentePvc - 1 : null;
  const e = borrador?.inputs;

  return (
    <div className={styles.card} id="siguiente" style={{ display: "grid", gap: 10 }}>
      <div className={styles.sectionHead}>
        <strong>Edición siguiente · {destino.codigo}</strong>
        <span className={publicada ? styles.badgeGood : atrasada ? styles.badgeWarn : styles.badge}>
          {publicada ? "publicada" : borrador ? "borrador del agente" : `el agente la propone el ${dia(destino.agenteEl)}`}
        </span>
      </div>
      <p className={styles.meta} style={{ margin: 0 }}>
        Rige del <b>{dia(destino.desde)}</b> al <b>{dia(destino.hasta)}</b> (ciclo 1 hasta el {dia(destino.ciclo1Hasta)}). El agente corre en la semana 1 del ciclo 2 (
        {dia(destino.agenteEl)}) y un responsable la publica a más tardar el <b>{dia(destino.publicaAMasTardar)}</b>
        {atrasada ? " — el plazo ya venció" : ""}.
      </p>

      {publicada ? null : borrador && e ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 8 }}>
            {[
              ["PVC propuesto", cop(borrador.pvc), `gobierna ${borrador.gob ?? "—"}`],
              ["Frente a la vigente", delta == null ? "—" : `${delta >= 0 ? "+" : ""}${(delta * 100).toFixed(1).replace(".", ",")} %`, `${estado.vigenteCodigo}: ${cop(estado.vigentePvc)}`],
              ["Corte", ag ? dia(ag.corte) : "—", ag ? `preparado ${ag.porQuien === "cron" ? "por el cron" : "a pedido del owner"}` : ""],
            ].map(([t, v, n]) => (
              <div key={t} style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "8px 10px" }}>
                <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{t}</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{v}</div>
                <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{n}</div>
              </div>
            ))}
          </div>

          <details open>
            <summary style={{ cursor: "pointer", fontSize: 12.5, fontWeight: 700 }}>De dónde sale cada insumo</summary>
            <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse", marginTop: 6 }}>
              <tbody>
                <tr>
                  <td style={{ padding: "3px 6px" }}>FNC mensual (5 meses)</td>
                  <td style={{ padding: "3px 6px" }}>{(ag?.meses ?? []).map((m) => `${m.mes} ${cop(m.valor)}${m.fuente === "diaria" ? "*" : ""}`).join(" · ")}</td>
                  <td style={{ padding: "3px 6px", color: "var(--muted)" }}>{ag?.fuentes.fnc ? FUENTE[ag.fuentes.fnc] : ""}{(ag?.meses ?? []).some((m) => m.fuente === "diaria") ? " (* de la serie diaria)" : ""}</td>
                </tr>
                {(["fnc_corte", "fnc_30d", "fnc_max90", "fnc_prom180", "trm", "c_strip", "delta", "costo", "escalamiento", "pvc_anterior"] as const).map((k) => {
                  const v = e[k] as number;
                  const f = ag?.fuentes[k];
                  return (
                    <tr key={k} style={{ background: f === "arrastrado" ? "color-mix(in srgb, var(--warn, #b5532a) 8%, transparent)" : undefined }}>
                      <td style={{ padding: "3px 6px" }}>{ETIQUETA[k]}</td>
                      <td style={{ padding: "3px 6px", fontVariantNumeric: "tabular-nums" }}>
                        {k === "c_strip" || k === "delta" || k === "escalamiento" ? v : k === "trm" ? v.toLocaleString("es-CO") : cop(v)}
                      </td>
                      <td style={{ padding: "3px 6px", color: "var(--muted)" }}>{f ? FUENTE[f] : ""}</td>
                    </tr>
                  );
                })}
                <tr style={{ background: "color-mix(in srgb, var(--warn, #b5532a) 8%, transparent)" }}>
                  <td style={{ padding: "3px 6px" }}>Score (7 factores)</td>
                  <td style={{ padding: "3px 6px" }}>{Object.entries(e.score ?? {}).map(([k, [w, s]]) => `${k}: ${s > 0 ? "+1" : s < 0 ? "−1" : "0"} × ${String(w).replace(".", ",")}`).join(" · ")}</td>
                  <td style={{ padding: "3px 6px", color: "var(--muted)" }}>{FUENTE.arrastrado}</td>
                </tr>
              </tbody>
            </table>
            <p className={styles.meta} style={{ margin: "4px 0 0" }}>
              Cobertura de la serie diaria: {ag?.cobertura180 ?? "—"} de 180 días. Lo arrastrado no se mide aquí: revíselo en el Tablero antes de publicar.
            </p>
          </details>

          {ag?.informe ? (
            <div style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "10px 12px", display: "grid", gap: 6, fontSize: 12.5 }}>
              <b>Informe del agente</b>
              <p style={{ margin: 0 }}>{ag.informe.resumen}</p>
              {ag.informe.mercado.length > 0 && (
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {ag.informe.mercado.map((x, i) => (
                    <li key={i}>{x}</li>
                  ))}
                </ul>
              )}
              {ag.informe.insumos.length > 0 && (
                <>
                  <b style={{ fontSize: 12 }}>Sugiere para lo arrastrado (no se aplica solo)</b>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {ag.informe.insumos.map((s, i) => (
                      <li key={i}>
                        <b>{ETIQUETA[s.campo] ?? s.campo}</b>: {s.valor == null ? "—" : s.valor >= 1000 ? s.valor.toLocaleString("es-CO") : String(s.valor).replace(".", ",")} {s.unidad ?? ""}
                        {s.nota ? ` — ${s.nota}` : ""}
                        {s.fuente && /^https?:\/\//.test(s.fuente) ? (
                          <>
                            {" "}
                            <a href={s.fuente} target="_blank" rel="noreferrer">
                              fuente
                            </a>
                          </>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {ag.informe.score.length > 0 && (
                <>
                  <b style={{ fontSize: 12 }}>Score: lo que lee de cada factor</b>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {ag.informe.score.map((s, i) => (
                      <li key={i}>
                        {s.factor}: <b>{s.signo > 0 ? "+1" : s.signo < 0 ? "−1" : "0"}</b> — {s.razon}
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {ag.informe.riesgos.length > 0 && (
                <>
                  <b style={{ fontSize: 12 }}>Riesgos</b>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {ag.informe.riesgos.map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                </>
              )}
              <p style={{ margin: 0 }}>
                <b>Recomendación:</b> {ag.informe.recomendacion}
              </p>
              {ag.fuentesWeb.length > 0 && (
                <p className={styles.meta} style={{ margin: 0 }}>
                  Fuentes consultadas:{" "}
                  {ag.fuentesWeb.map((f, i) => (
                    <span key={f.url}>
                      {i ? " · " : ""}
                      <a href={f.url} target="_blank" rel="noreferrer">
                        {f.title || f.url}
                      </a>
                    </span>
                  ))}
                </p>
              )}
            </div>
          ) : (
            <p className={styles.warn} style={{ margin: 0 }}>Sin informe del agente{ag?.ia?.error ? `: ${ag.ia.error}` : ""}. El borrador sirve igual; lo arrastrado se revisa a mano.</p>
          )}
          {ag?.avisos?.creadoError && <p className={styles.warn} style={{ margin: 0 }}>El correo de aviso falló: {ag.avisos.creadoError}</p>}
        </>
      ) : (
        <p className={styles.meta} style={{ margin: 0 }}>
          Todavía no hay borrador. El agente lo deja solo el {dia(destino.agenteEl)}; si lo quiere antes, pídalo aquí.
        </p>
      )}

      {!publicada && (
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap", alignItems: "center" }}>
          {msg && (
            <span className={msg.ok ? styles.meta : styles.warn} style={{ margin: 0 }} role="status">
              {msg.text}
            </span>
          )}
          <button type="button" className="btn btn-sm" disabled={pending} onClick={preparar} title="Mide de nuevo y pide un informe nuevo (búsqueda web)">
            {pending ? "El agente está trabajando (1–3 min)…" : `${borrador ? "Regenerar" : "Prepararla ahora"} · ≈ US$0,15 de IA`}
          </button>
          {borrador && (
            <Link className="btn btn-sm btn-solid" href={`/ecp/pvc/tablero?borrador=${borrador.id}`}>
              Revisar y publicar en el Tablero →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
