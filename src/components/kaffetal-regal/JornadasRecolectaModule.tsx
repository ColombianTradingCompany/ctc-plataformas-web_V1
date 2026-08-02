"use client";

import { useEffect, useState } from "react";
import {
  cerrarJornadaRecolecta,
  crearJornadaRecolecta,
  misJornadasRecolecta,
  type ProducerJornada,
} from "@/lib/terratalento/actions";
import type { Finca } from "./data";

// ── Jornadas de Recolecta (Terratalento) · módulo del hub del productor ─────
// La finca publica su necesidad de manos para la cosecha: fechas, cupos y
// condiciones. Los recolectores se postulan desde terratalento.ctcexport.com
// y CTC hace el match desde el ECP — aquí el productor solo publica y ve los
// conteos (los datos de contacto los maneja CTC, no viajan al productor).
// Autocontenido (patrón CoffeedWall): carga sus propios datos al montarse.

const ESTADO_LABEL: Record<string, string> = {
  abierta: "Abierta",
  en_gestion: "En gestión CTC",
  cerrada: "Cerrada",
  cancelada: "Cancelada",
};

const fecha = (iso: string | null) =>
  iso ? new Date(iso + "T12:00:00").toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" }) : null;

const S: Record<string, React.CSSProperties> = {
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10, marginTop: 10 },
  field: { display: "flex", flexDirection: "column", gap: 4 },
  label: { fontSize: 12, fontWeight: 600 },
  card: { border: "1px solid var(--line, #dfd9cf)", borderLeft: "5px solid var(--accent)", borderRadius: 10, padding: "12px 14px", marginTop: 10, background: "#fff" },
  meta: { fontSize: 12.5, color: "var(--muted, #6b6459)", margin: "4px 0 0" },
  err: { fontSize: 13, color: "#8c1d18", marginTop: 8 },
};

export function JornadasRecolectaModule({ fincas }: { fincas: Finca[] }) {
  const [jornadas, setJornadas] = useState<ProducerJornada[] | null>(null);
  const [creando, setCreando] = useState(false);
  const [fincaId, setFincaId] = useState(fincas[0]?.id ?? "");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [cupos, setCupos] = useState("");
  const [pago, setPago] = useState("");
  const [condiciones, setCondiciones] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    const res = await crearJornadaRecolecta({ fincaId, fechaInicio, fechaFin, cupos, pago, condiciones });
    setOcupado(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setCreando(false);
    setFechaInicio(""); setFechaFin(""); setCupos(""); setPago(""); setCondiciones("");
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
          <div style={S.grid}>
            <div style={S.field}>
              <label style={S.label} htmlFor="jr-finca">Finca</label>
              <select id="jr-finca" value={fincaId} onChange={(e) => setFincaId(e.target.value)}>
                {fincas.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
            <div style={S.field}>
              <label style={S.label} htmlFor="jr-desde">Inicio</label>
              <input id="jr-desde" type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
            </div>
            <div style={S.field}>
              <label style={S.label} htmlFor="jr-hasta">Fin (opcional)</label>
              <input id="jr-hasta" type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
            </div>
            <div style={S.field}>
              <label style={S.label} htmlFor="jr-cupos">Cupos</label>
              <input id="jr-cupos" type="number" min={1} max={200} value={cupos} onChange={(e) => setCupos(e.target.value)} placeholder="Ej. 8" />
            </div>
            <div style={S.field}>
              <label style={S.label} htmlFor="jr-pago">Pago</label>
              <input id="jr-pago" value={pago} onChange={(e) => setPago(e.target.value)} placeholder="Ej. $800/kilo + almuerzo" />
            </div>
          </div>
          <div style={{ ...S.field, marginTop: 10 }}>
            <label style={S.label} htmlFor="jr-cond">Condiciones (lo que el recolector debe saber)</label>
            <textarea id="jr-cond" rows={2} value={condiciones} onChange={(e) => setCondiciones(e.target.value)} placeholder="Transporte, hospedaje, horario, variedad…" />
          </div>
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
        jornadas.map((j) => (
          <div key={j.id} style={S.card}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "baseline" }}>
              <b style={{ fontSize: 14 }}>{j.fincaNombre}</b>
              <span style={S.meta}>{ESTADO_LABEL[j.estado] ?? j.estado}</span>
            </div>
            <p style={S.meta}>
              {fecha(j.fechaInicio)}
              {j.fechaFin && ` – ${fecha(j.fechaFin)}`} · {j.cupos} cupo{j.cupos === 1 ? "" : "s"}
              {j.pago && ` · ${j.pago}`}
            </p>
            <p style={S.meta}>
              <b style={{ color: "var(--ink, #333)" }}>{j.postulados}</b> postulado{j.postulados === 1 ? "" : "s"} ·{" "}
              <b style={{ color: "var(--ink, #333)" }}>{j.llamados}</b> llamado{j.llamados === 1 ? "" : "s"} ·{" "}
              <b style={{ color: "var(--ink, #333)" }}>{j.confirmados}</b> de {j.cupos} confirmado{j.confirmados === 1 ? "" : "s"}
            </p>
            {["abierta", "en_gestion"].includes(j.estado) && (
              <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                <button className="btn btn-sm" type="button" disabled={ocupado} onClick={() => cerrar(j.id, false)}>
                  Cerrar jornada
                </button>
                <button className="btn btn-sm" type="button" disabled={ocupado} onClick={() => cerrar(j.id, true)}>
                  Cancelar jornada
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
