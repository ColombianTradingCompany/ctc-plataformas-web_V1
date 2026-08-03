"use client";

import { useState } from "react";
import { miConstancia, postularJornada, retirarPostulacion, type JornadaPublica } from "@/lib/terratalento/actions";
import { openConstancia } from "@/lib/terratalento/constanciaPrint";
import { resumenTerminos, terminosFromRow, tieneTerminosEstructurados } from "@/lib/terratalento/terminos";
import styles from "./terratalento.module.css";

// La tarjeta de una jornada en la superficie del recolector. Muestra EL TRATO
// (términos estructurados, leídos con el módulo puro) y exige aceptarlo antes
// de postularse. Cuando el cupo queda confirmado, ofrece la constancia.

const ESTADO_CHIP: Record<string, { label: string; cls: "ok" | "warn" | "off" }> = {
  postulado: { label: "Postulado", cls: "warn" },
  llamado: { label: "Te llamaron", cls: "warn" },
  confirmado: { label: "Confirmado", cls: "ok" },
  descartado: { label: "No disponible", cls: "off" },
  retirado: { label: "Retirado", cls: "off" },
};

const fecha = (iso: string | null) =>
  iso ? new Date(iso + "T12:00:00").toLocaleDateString("es-CO", { day: "numeric", month: "short" }) : null;

export function JornadaCard({ j, onRecargar, compacta }: { j: JornadaPublica; onRecargar: () => void; compacta?: boolean }) {
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acepta, setAcepta] = useState(false);
  const [abierta, setAbierta] = useState(false);

  const t = terminosFromRow(j.terminos);
  const lineas = resumenTerminos(t);
  const chip = j.miPostulacion ? ESTADO_CHIP[j.miPostulacion] : null;
  const lleno = j.confirmados >= j.cupos;
  const puedePostular = !j.miPostulacion || j.miPostulacion === "retirado";

  const accion = async (fn: () => Promise<{ ok: true } | { ok: false; error: string }>) => {
    setOcupado(true);
    setError(null);
    const res = await fn();
    setOcupado(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setAcepta(false);
    onRecargar();
  };

  const verConstancia = async () => {
    setOcupado(true);
    const datos = await miConstancia(j.id);
    setOcupado(false);
    if (datos) openConstancia(datos);
    else setError("Tu constancia todavía no está lista. Escríbenos si crees que es un error.");
  };

  return (
    <div className={styles.jorCard}>
      <div className={styles.jorTop}>
        <b>{j.fincaNombre}</b>
        {chip && (
          <span className={`${styles.chip} ${chip.cls === "ok" ? styles.chipOk : chip.cls === "warn" ? styles.chipWarn : styles.chipOff}`}>
            {chip.label}
          </span>
        )}
      </div>
      <p className={styles.jorMeta}>{[j.fincaVereda, j.fincaMunicipio].filter(Boolean).join(" · ")}</p>
      <p className={styles.jorMeta}>
        {fecha(j.fechaInicio)}
        {j.fechaFin && ` – ${fecha(j.fechaFin)}`} · {j.cupos} cupo{j.cupos === 1 ? "" : "s"}
        {j.confirmados > 0 && ` (${j.confirmados} confirmado${j.confirmados === 1 ? "" : "s"})`}
      </p>

      {/* El trato. En las tarjetas del embudo se pliega para no repetir todo. */}
      {tieneTerminosEstructurados(t) || lineas.length > 0 ? (
        compacta && !abierta ? (
          <button className="btn btn-sm" type="button" style={{ marginTop: 10 }} onClick={() => setAbierta(true)}>
            Ver los términos
          </button>
        ) : (
          <div className={styles.terminos}>
            {lineas.map((l) => (
              <div className={styles.terminoLinea} key={l.label}>
                <span className={styles.terminoLabel}>{l.label}</span>
                <span>{l.value}</span>
              </div>
            ))}
          </div>
        )
      ) : (
        <p className={styles.jorMeta}>La finca no publicó términos detallados para esta jornada.</p>
      )}

      {puedePostular && !lleno && (
        <label className={styles.aceptar}>
          <input type="checkbox" checked={acepta} onChange={(e) => setAcepta(e.target.checked)} />
          <span>
            Entiendo los términos de esta jornada y quiero postularme. CTC conecta a las partes; la finca y yo
            acordamos los detalles del trabajo.
          </span>
        </label>
      )}

      <div className={styles.jorFoot}>
        {puedePostular && (
          <button
            className="btn btn-sm btn-solid"
            type="button"
            disabled={ocupado || lleno || !acepta}
            onClick={() => accion(() => postularJornada(j.id, acepta))}
          >
            {lleno ? "Cupos completos" : ocupado ? "Un momento…" : "Postularme"}
          </button>
        )}
        {j.miPostulacion && ["postulado", "llamado"].includes(j.miPostulacion) && (
          <button className="btn btn-sm" type="button" disabled={ocupado} onClick={() => accion(() => retirarPostulacion(j.id))}>
            Retirarme
          </button>
        )}
        {j.miPostulacion === "confirmado" && (
          <button className="btn btn-sm btn-solid" type="button" disabled={ocupado} onClick={verConstancia}>
            Ver mi constancia
          </button>
        )}
      </div>
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
