"use client";

import { useEffect, useState } from "react";
import {
  cerrarJornadaRecolecta,
  crearJornadaRecolecta,
  misJornadasRecolecta,
  type ProducerJornada,
} from "@/lib/terratalento/actions";
import {
  FORMA_OPCIONES,
  FORMA_LABEL,
  FRECUENCIA_OPCIONES,
  FRECUENCIA_LABEL,
  MODALIDAD_LABEL,
  UNIDAD_OPCIONES,
  resumenTerminos,
  terminosFromRow,
} from "@/lib/terratalento/terminos";
import type { Finca } from "./data";

// ── Jornadas de Recolecta (Terratalento) · módulo del panel del productor ─────
// La finca publica su necesidad de manos para la cosecha con TÉRMINOS reales
// (pago, qué incluye, horario, requisitos) — no dos textos sueltos. Tablero por
// estado, y en cada jornada el conteo del embudo.
//
// §5.1 (owner, 2026-08-02): la finca ve nombre y celular SOLO de los recolectores
// CONFIRMADOS por CTC. Postulados y descartados no viajan hasta acá — el control
// de la selección sigue siendo de CTC.

const COLUMNAS: { key: string; label: string }[] = [
  { key: "abierta", label: "Abiertas" },
  { key: "en_gestion", label: "En gestión CTC" },
  { key: "cerrada", label: "Cerradas" },
];

const fecha = (iso: string | null) =>
  iso ? new Date(iso + "T12:00:00").toLocaleDateString("es-CO", { day: "numeric", month: "short" }) : null;

const S: Record<string, React.CSSProperties> = {
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10, marginTop: 10 },
  field: { display: "flex", flexDirection: "column", gap: 4 },
  label: { fontSize: 12, fontWeight: 600 },
  fieldset: { border: "1px solid var(--line, #dfd9cf)", borderRadius: 10, padding: "12px 14px", marginTop: 12 },
  legend: { fontSize: 11.5, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--primary)", padding: "0 6px" },
  board: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginTop: 12 },
  col: { background: "var(--paper, #faf8f5)", border: "1px solid var(--line, #dfd9cf)", borderRadius: 10, padding: 12, minHeight: 70 },
  colHead: { display: "flex", alignItems: "center", gap: 8, marginBottom: 10 },
  colTitle: { fontSize: 11.5, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--muted, #6b6459)", margin: 0 },
  colCount: { fontSize: 11, background: "var(--line, #e5e0d8)", borderRadius: 999, padding: "1px 8px", color: "var(--muted, #6b6459)" },
  card: { border: "1px solid var(--line, #dfd9cf)", borderLeft: "5px solid var(--accent)", borderRadius: 10, padding: "12px 14px", marginBottom: 10, background: "#fff" },
  meta: { fontSize: 12.5, color: "var(--muted, #6b6459)", margin: "4px 0 0" },
  strong: { color: "var(--ink, #333)" },
  err: { fontSize: 13, color: "#8c1d18", marginTop: 8 },
  medidor: { height: 6, borderRadius: 999, background: "var(--line, #e5e0d8)", overflow: "hidden", marginTop: 8 },
  roster: { marginTop: 10, paddingTop: 8, borderTop: "1px dashed var(--line, #dfd9cf)" },
};

export function JornadasRecolectaModule({ fincas }: { fincas: Finca[] }) {
  const [jornadas, setJornadas] = useState<ProducerJornada[] | null>(null);
  const [creando, setCreando] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [f, setF] = useState({
    fincaId: fincas[0]?.id ?? "",
    fechaInicio: "", fechaFin: "", cupos: "",
    pagoModalidad: "por_kilo", pagoValor: "", pagoUnidad: "kilo", pagoForma: "efectivo", pagoFrecuencia: "semanal", pagoNota: "",
    alojamiento: false, alojamientoDetalle: "", alimentacion: false, alimentacionDetalle: "", transporte: false, transporteDetalle: "",
    horario: "", duracionEstimadaDias: "", requisitos: "", condiciones: "",
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((prev) => ({ ...prev, [k]: v }));

  const recargar = () => misJornadasRecolecta().then(setJornadas);
  useEffect(() => {
    let vivo = true;
    misJornadasRecolecta().then((j) => vivo && setJornadas(j));
    return () => {
      vivo = false;
    };
  }, []);

  const publicar = async () => {
    setOcupado(true);
    setError(null);
    const res = await crearJornadaRecolecta(f);
    setOcupado(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setCreando(false);
    setF((p) => ({ ...p, fechaInicio: "", fechaFin: "", cupos: "", pagoValor: "", pagoNota: "", horario: "", duracionEstimadaDias: "", requisitos: "", condiciones: "" }));
    recargar();
  };

  const cerrar = async (id: string, cancelar: boolean) => {
    setOcupado(true);
    await cerrarJornadaRecolecta(id, cancelar);
    setOcupado(false);
    recargar();
  };

  if (fincas.length === 0) {
    return <p style={S.meta}>Registre primero una finca — las Jornadas de Recolecta se publican por finca.</p>;
  }

  return (
    <div>
      {!creando ? (
        <button className="btn btn-sm btn-solid" type="button" onClick={() => setCreando(true)}>
          Publicar una Jornada de Recolecta
        </button>
      ) : (
        <div style={{ ...S.card, borderLeftColor: "var(--primary)" }}>
          <b style={{ fontSize: 14 }}>Nueva Jornada de Recolecta</b>

          <fieldset style={S.fieldset}>
            <legend style={S.legend}>Cuándo y cuántos</legend>
            <div style={S.grid}>
              <div style={S.field}>
                <label style={S.label} htmlFor="jr-finca">Finca</label>
                <select id="jr-finca" value={f.fincaId} onChange={(e) => set("fincaId", e.target.value)}>
                  {fincas.map((x) => (
                    <option key={x.id} value={x.id}>{x.name}</option>
                  ))}
                </select>
              </div>
              <div style={S.field}>
                <label style={S.label} htmlFor="jr-desde">Inicio</label>
                <input id="jr-desde" type="date" value={f.fechaInicio} onChange={(e) => set("fechaInicio", e.target.value)} />
              </div>
              <div style={S.field}>
                <label style={S.label} htmlFor="jr-hasta">Fin (opcional)</label>
                <input id="jr-hasta" type="date" value={f.fechaFin} onChange={(e) => set("fechaFin", e.target.value)} />
              </div>
              <div style={S.field}>
                <label style={S.label} htmlFor="jr-cupos">Cupos</label>
                <input id="jr-cupos" type="number" min={1} max={200} value={f.cupos} onChange={(e) => set("cupos", e.target.value)} placeholder="Ej. 8" />
              </div>
              <div style={S.field}>
                <label style={S.label} htmlFor="jr-dur">Duración estimada (días)</label>
                <input id="jr-dur" type="number" min={1} max={365} value={f.duracionEstimadaDias} onChange={(e) => set("duracionEstimadaDias", e.target.value)} />
              </div>
            </div>
          </fieldset>

          <fieldset style={S.fieldset}>
            <legend style={S.legend}>El pago</legend>
            <div style={S.grid}>
              <div style={S.field}>
                <label style={S.label} htmlFor="jr-mod">Modalidad</label>
                <select id="jr-mod" value={f.pagoModalidad} onChange={(e) => set("pagoModalidad", e.target.value)}>
                  {(Object.keys(MODALIDAD_LABEL) as (keyof typeof MODALIDAD_LABEL)[]).map((k) => (
                    <option key={k} value={k}>{MODALIDAD_LABEL[k]}</option>
                  ))}
                </select>
              </div>
              <div style={S.field}>
                <label style={S.label} htmlFor="jr-valor">Valor (COP)</label>
                <input id="jr-valor" type="number" min={0} value={f.pagoValor} onChange={(e) => set("pagoValor", e.target.value)} placeholder="Ej. 800" />
              </div>
              <div style={S.field}>
                <label style={S.label} htmlFor="jr-unidad">Por</label>
                <select id="jr-unidad" value={f.pagoUnidad} onChange={(e) => set("pagoUnidad", e.target.value)}>
                  {UNIDAD_OPCIONES.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
              <div style={S.field}>
                <label style={S.label} htmlFor="jr-forma">Cómo se paga</label>
                <select id="jr-forma" value={f.pagoForma} onChange={(e) => set("pagoForma", e.target.value)}>
                  {FORMA_OPCIONES.map((o) => (
                    <option key={o} value={o}>{FORMA_LABEL[o]}</option>
                  ))}
                </select>
              </div>
              <div style={S.field}>
                <label style={S.label} htmlFor="jr-frec">Cada cuánto</label>
                <select id="jr-frec" value={f.pagoFrecuencia} onChange={(e) => set("pagoFrecuencia", e.target.value)}>
                  {FRECUENCIA_OPCIONES.map((o) => (
                    <option key={o} value={o}>{FRECUENCIA_LABEL[o]}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ ...S.field, marginTop: 10 }}>
              <label style={S.label} htmlFor="jr-pagonota">Nota sobre el pago (opcional)</label>
              <input id="jr-pagonota" value={f.pagoNota} onChange={(e) => set("pagoNota", e.target.value)} placeholder="Ej. bonificación por calidad de la pasada" />
            </div>
          </fieldset>

          <fieldset style={S.fieldset}>
            <legend style={S.legend}>Qué incluye</legend>
            {([
              ["alojamiento", "Alojamiento", "alojamientoDetalle", "Ej. habitación compartida en la finca"],
              ["alimentacion", "Alimentación", "alimentacionDetalle", "Ej. desayuno y almuerzo"],
              ["transporte", "Transporte", "transporteDetalle", "Ej. desde el parque del pueblo"],
            ] as const).map(([key, label, detKey, ph]) => (
              <div key={key} style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 8, flexWrap: "wrap" }}>
                <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13.5, minWidth: 130 }}>
                  <input type="checkbox" checked={f[key]} onChange={(e) => set(key, e.target.checked)} />
                  {label}
                </label>
                {f[key] && (
                  <input style={{ flex: 1, minWidth: 200 }} value={f[detKey]} onChange={(e) => set(detKey, e.target.value)} placeholder={ph} />
                )}
              </div>
            ))}
          </fieldset>

          <fieldset style={S.fieldset}>
            <legend style={S.legend}>El trabajo</legend>
            <div style={S.field}>
              <label style={S.label} htmlFor="jr-horario">Horario</label>
              <input id="jr-horario" value={f.horario} onChange={(e) => set("horario", e.target.value)} placeholder="Ej. 6:00 a.m. a 2:00 p.m." />
            </div>
            <div style={{ ...S.field, marginTop: 10 }}>
              <label style={S.label} htmlFor="jr-req">Requisitos</label>
              <input id="jr-req" value={f.requisitos} onChange={(e) => set("requisitos", e.target.value)} placeholder="Ej. traer su propio coco, experiencia en pasada selectiva" />
            </div>
            <div style={{ ...S.field, marginTop: 10 }}>
              <label style={S.label} htmlFor="jr-cond">Otras condiciones</label>
              <textarea id="jr-cond" rows={2} value={f.condiciones} onChange={(e) => set("condiciones", e.target.value)} />
            </div>
          </fieldset>

          {error && <p style={S.err}>{error}</p>}
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <button className="btn btn-sm btn-solid" type="button" disabled={ocupado} onClick={publicar}>
              {ocupado ? "Publicando…" : "Publicar jornada"}
            </button>
            <button className="btn btn-sm" type="button" onClick={() => setCreando(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {jornadas === null ? (
        <p style={S.meta}>Cargando sus jornadas…</p>
      ) : jornadas.length === 0 ? (
        <p style={S.meta}>Todavía no ha publicado ninguna jornada.</p>
      ) : (
        <div style={S.board}>
          {COLUMNAS.map((c) => {
            const col = jornadas.filter((j) =>
              c.key === "cerrada" ? ["cerrada", "cancelada"].includes(j.estado) : j.estado === c.key
            );
            return (
              <div style={S.col} key={c.key}>
                <div style={S.colHead}>
                  <h4 style={S.colTitle}>{c.label}</h4>
                  <span style={S.colCount}>{col.length}</span>
                </div>
                {col.length === 0 ? (
                  <p style={S.meta}>—</p>
                ) : (
                  col.map((j) => <TarjetaJornada key={j.id} j={j} ocupado={ocupado} onCerrar={cerrar} />)
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TarjetaJornada({
  j,
  ocupado,
  onCerrar,
}: {
  j: ProducerJornada;
  ocupado: boolean;
  onCerrar: (id: string, cancelar: boolean) => void;
}) {
  const [verTerminos, setVerTerminos] = useState(false);
  const lineas = resumenTerminos(terminosFromRow(j.terminos));
  const pct = j.cupos ? Math.min(100, Math.round((j.confirmados / j.cupos) * 100)) : 0;

  return (
    <div style={S.card}>
      <b style={{ fontSize: 13.5 }}>{j.fincaNombre}</b>
      <p style={S.meta}>
        {fecha(j.fechaInicio)}
        {j.fechaFin && ` – ${fecha(j.fechaFin)}`}
      </p>
      <div style={S.medidor}>
        <div style={{ width: `${pct}%`, height: "100%", background: "var(--accent)" }} />
      </div>
      <p style={S.meta}>
        <b style={S.strong}>{j.confirmados}</b> de {j.cupos} confirmados · {j.postulados} postulado
        {j.postulados === 1 ? "" : "s"} · {j.llamados} llamado{j.llamados === 1 ? "" : "s"}
      </p>

      {/* §5.1 · quién llega a la finca: solo confirmados, nombre y celular */}
      {j.rosterConfirmados.length > 0 && (
        <div style={S.roster}>
          <b style={{ fontSize: 12, color: "var(--primary)" }}>Quiénes llegan</b>
          {j.rosterConfirmados.map((r) => (
            <p key={r.celular + r.nombre} style={S.meta}>
              {r.nombre} · <a href={`tel:${r.celular.replace(/\s/g, "")}`}>{r.celular}</a>
            </p>
          ))}
        </div>
      )}

      {lineas.length > 0 && (
        <>
          <button className="btn btn-sm" type="button" style={{ marginTop: 10 }} onClick={() => setVerTerminos((v) => !v)}>
            {verTerminos ? "Ocultar términos" : "Ver términos"}
          </button>
          {verTerminos && (
            <div style={{ marginTop: 8 }}>
              {lineas.map((l) => (
                <p key={l.label} style={S.meta}>
                  <b style={S.strong}>{l.label}:</b> {l.value}
                </p>
              ))}
            </div>
          )}
        </>
      )}

      {["abierta", "en_gestion"].includes(j.estado) && (
        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          <button className="btn btn-sm" type="button" disabled={ocupado} onClick={() => onCerrar(j.id, false)}>
            Cerrar
          </button>
          <button className="btn btn-sm" type="button" disabled={ocupado} onClick={() => onCerrar(j.id, true)}>
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}
