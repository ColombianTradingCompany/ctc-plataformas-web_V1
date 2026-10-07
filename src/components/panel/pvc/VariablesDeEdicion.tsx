"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import styles from "@/components/panel/shared.module.css";
import type { PvcEdition } from "@/lib/pvc/tipos";
import { guardarVariablesDeEdicionAction } from "@/lib/pvc/actions";
import { agendaDelPvcSiguiente, calendarioPropuesto, diasEntre, semanasSinContratos, sumaDias, trimestreDe, validarCalendario } from "@/lib/trato/calendario";

// ── Modelo Económico · las variables de una edición (V5.174 · docs/PLAN_CICLOS.md §1, §3, §4, §6) ───────────────────────────
// Owner, 2026-10-07: «las fechas exactas de cada año son una de las variables a fijar cada vez» y «los mínimos deben poder
// editarse en el mejor lugar posible dentro del módulo del modelo económico». Aquí: las fechas de la edición (lunes a domingo,
// ciclos de 6 + 7 o 7 + 7 semanas, con la propuesta ISO a un clic), los mínimos por grado, los rangos de calidad con que se
// recibe el café y el auxilio de transporte por carga. Cada cambio deja su fila de auditoría (la acción valida y lo exige).

const GRADOS = [
  ["black", "Black"],
  ["red", "Red"],
  ["blue", "Blue"],
  ["gold", "Gold"],
] as const;
const dia = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("es-CO", { weekday: "short", day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
const semanas = (desde: string, hasta: string) => (diasEntre(desde, hasta) + 1) / 7;

export function VariablesDeEdicion({ edicion }: { edicion: PvcEdition }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [desde, setDesde] = useState(edicion.validFrom ?? "");
  const [ciclo1Hasta, setCiclo1Hasta] = useState(edicion.ciclo1Hasta ?? "");
  const [hasta, setHasta] = useState(edicion.validTo ?? "");
  const [minimos, setMinimos] = useState<Record<string, string>>(
    Object.fromEntries(GRADOS.map(([g]) => [g, String(edicion.minimosPorGrado?.[g] ?? "")]))
  );
  const [humMin, setHumMin] = useState(String(edicion.rangosCalidad?.humedad_min ?? 10));
  const [humMax, setHumMax] = useState(String(edicion.rangosCalidad?.humedad_max ?? 12));
  const [awMax, setAwMax] = useState(String(edicion.rangosCalidad?.aw_max ?? 0.7));
  const [auxilio, setAuxilio] = useState(edicion.auxilioTransporteCop != null ? String(edicion.auxilioTransporteCop) : "");
  const publicada = edicion.status === "published" || edicion.status === "corrected";
  const auxilioFijado = publicada && edicion.auxilioTransporteCop != null;

  const cal = desde && ciclo1Hasta && hasta ? { desde, ciclo1Hasta, hasta } : null;
  const error = cal ? validarCalendario(cal) : "Faltan fechas.";
  const agenda = cal && !error ? agendaDelPvcSiguiente(cal) : null;
  const bloqueo = cal && !error ? semanasSinContratos(cal) : null;
  const num = (s: string) => Number(String(s).replace(",", "."));

  function usarIso() {
    const base = desde || edicion.validFrom || "";
    if (!base) return;
    const p = calendarioPropuesto(trimestreDe(sumaDias(base, 14)));
    setDesde(p.desde);
    setCiclo1Hasta(p.ciclo1Hasta);
    setHasta(p.hasta);
  }

  function guardar() {
    setMsg(null);
    start(async () => {
      const r = await guardarVariablesDeEdicionAction(edicion.id, {
        desde,
        ciclo1Hasta,
        hasta,
        minimosPorGrado: { black: num(minimos.black), red: num(minimos.red), blue: num(minimos.blue), gold: num(minimos.gold) },
        rangosCalidad: { humedad_min: num(humMin), humedad_max: num(humMax), aw_max: num(awMax) },
        auxilioTransporteCop: auxilio.trim() === "" ? null : Math.round(num(auxilio.replace(/\./g, ""))),
      });
      if (r.ok) {
        setMsg({ ok: true, text: "Variables guardadas ✓" });
        router.refresh();
      } else setMsg({ ok: false, text: r.error });
    });
  }

  const campo: React.CSSProperties = { display: "grid", gap: 3, fontSize: 12, fontWeight: 600 };
  const input: React.CSSProperties = { padding: "7px 9px", border: "1.5px solid var(--line)", borderRadius: 7, background: "var(--card, #fff)", font: "inherit", fontSize: 13 };

  return (
    <div className={styles.card} style={{ display: "grid", gap: 12 }}>
      <div className={styles.sectionHead}>
        <strong>Variables de la edición · {edicion.code}</strong>
        <span className={styles.badge}>docs/PLAN_CICLOS.md</span>
      </div>

      <div>
        <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>Fechas (lunes a domingo)</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
          <label style={campo}>Empieza<input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} style={input} /></label>
          <label style={campo}>Termina el ciclo 1<input type="date" value={ciclo1Hasta} onChange={(e) => setCiclo1Hasta(e.target.value)} style={input} /></label>
          <label style={campo}>Termina<input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} style={input} /></label>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 6 }}>
          <button type="button" className="btn btn-sm" onClick={usarIso}>Usar las fechas ISO propuestas</button>
          {error ? <span className={styles.warn} style={{ margin: 0 }}>{error}</span> : null}
        </div>
        {cal && !error && agenda && (
          <p className={styles.meta} style={{ margin: "6px 0 0" }}>
            Ciclo 1: {dia(cal.desde)} → {dia(cal.ciclo1Hasta)} ({semanas(cal.desde, cal.ciclo1Hasta)} sem.) · Ciclo 2: {dia(sumaDias(cal.ciclo1Hasta, 1))} → {dia(cal.hasta)} ({semanas(sumaDias(cal.ciclo1Hasta, 1), cal.hasta)} sem.)
            {bloqueo ? <> · sin contratos nuevos {dia(bloqueo.desde)} → {dia(bloqueo.hasta)}</> : <> · sin semanas bloqueadas (aplican desde 2027)</>} · el agente propone la edición siguiente el{" "}
            <b>{dia(agenda.agenteEl)}</b> y se publica a más tardar el <b>{dia(agenda.publicaAMasTardar)}</b>.
          </p>
        )}
      </div>

      <div>
        <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>Mínimo por ventana (kg de CPS)</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 }}>
          {GRADOS.map(([g, label]) => (
            <label key={g} style={campo}>
              {label}
              <input inputMode="decimal" value={minimos[g]} onChange={(e) => setMinimos((m) => ({ ...m, [g]: e.target.value }))} style={input} />
            </label>
          ))}
        </div>
        <p className={styles.meta} style={{ margin: "6px 0 0" }}>
          Igual para una ventana de un ciclo que para una extendida. Un lote que continúa baja 10 % del mínimo por cada cambio de trimestre; si no le alcanza la existencia,
          declara hasta la mitad, sin retiro. Cada oferta congela el mínimo con el que nace.
        </p>
      </div>

      <div>
        <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>Recepción del café (pago del 40 %)</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
          <label style={campo}>Humedad mínima (%)<input inputMode="decimal" value={humMin} onChange={(e) => setHumMin(e.target.value)} style={input} /></label>
          <label style={campo}>Humedad máxima (%)<input inputMode="decimal" value={humMax} onChange={(e) => setHumMax(e.target.value)} style={input} /></label>
          <label style={campo}>Actividad de agua máx. (aw)<input inputMode="decimal" value={awMax} onChange={(e) => setAwMax(e.target.value)} style={input} /></label>
        </div>
      </div>

      <div>
        <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>Auxilio de transporte (COP por carga)</div>
        <label style={{ ...campo, maxWidth: 260 }}>
          Fijo para todos los grados
          <input inputMode="numeric" value={auxilio} onChange={(e) => setAuxilio(e.target.value)} disabled={auxilioFijado} placeholder="por fijar" style={input} />
        </label>
        <p className={styles.meta} style={{ margin: "6px 0 0" }}>
          El productor paga su flete hasta Bucaramanga; el PVC se lo reconoce: precio del grado = PVC × multiplicador + auxilio. D1 §5 del modelo lo tenía en $0 (las
          cooperativas no lo pagan por carga: absorben el acopio). {publicada ? "En una edición publicada se fija una sola vez; para cambiarlo, se publica una corrección." : ""}
        </p>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "flex-end", flexWrap: "wrap" }}>
        {msg && <span className={msg.ok ? styles.meta : styles.warn} style={{ margin: 0 }} role="status">{msg.text}</span>}
        <button type="button" className="btn btn-sm btn-solid" disabled={pending || !!error} onClick={guardar}>
          {pending ? "Guardando…" : "Guardar las variables"}
        </button>
      </div>
    </div>
  );
}
