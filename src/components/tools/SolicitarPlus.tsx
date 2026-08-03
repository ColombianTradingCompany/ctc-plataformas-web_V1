"use client";

import { useEffect, useState } from "react";
import { miEstadoPlus, solicitarPlus, type PlusAudiencia, type PlusStatus } from "@/lib/tools/plusGrants";

// ── El botón de "Herramientas Plus" (owner, 2026-08-02) ─────────────────────
// Vive junto al panel de herramientas de cada plataforma (KR / CP / DC).
// Estado-consciente: solicitar → pendiente → activo/rechazada (con reintento).
// La decisión la toma el ECP en su sub-tablero; a futuro irá atada a un pago.

const COPY: Record<PlusAudiencia, string> = {
  producer: "como productor",
  buyer: "como comprador",
  dc: "como experto del Directorio",
};

export function SolicitarPlus({ audiencia, accent }: { audiencia: PlusAudiencia; accent?: string }) {
  const [estado, setEstado] = useState<PlusStatus | "cargando">("cargando");
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    miEstadoPlus(audiencia).then((e) => vivo && setEstado(e));
    return () => {
      vivo = false;
    };
  }, [audiencia]);

  const pedir = async () => {
    setOcupado(true);
    setError(null);
    const res = await solicitarPlus(audiencia);
    setOcupado(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setEstado("pendiente");
  };

  if (estado === "cargando") return null;

  const base: React.CSSProperties = { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 10 };
  const meta: React.CSSProperties = { fontSize: 12.5, color: "var(--muted, #6b6459)" };

  if (estado === "activo") {
    return (
      <p style={{ ...meta, marginTop: 10 }}>
        ✓ Tu activación de <b style={{ color: accent ?? "var(--primary)" }}>Herramientas Plus</b> está al día — ya ves el
        catálogo completo de esta superficie.
      </p>
    );
  }

  return (
    <div style={base}>
      {estado === "pendiente" ? (
        <span style={meta}>
          Tu solicitud de <b>Herramientas Plus</b> está en revisión por CTC — te avisamos al activarla.
        </span>
      ) : (
        <>
          <button className="btn btn-sm btn-solid" type="button" disabled={ocupado} onClick={pedir}>
            {ocupado ? "Enviando…" : estado === "rechazado" ? "Volver a solicitar Herramientas Plus" : "Solicitar Herramientas Plus"}
          </button>
          <span style={meta}>
            {estado === "rechazado"
              ? "Tu solicitud anterior no fue aprobada — puedes volver a intentarlo."
              : `Desbloquea las herramientas Plus ${COPY[audiencia]}. CTC revisa y activa tu solicitud.`}
          </span>
        </>
      )}
      {error && <span style={{ ...meta, color: "#8c1d18" }}>{error}</span>}
    </div>
  );
}
