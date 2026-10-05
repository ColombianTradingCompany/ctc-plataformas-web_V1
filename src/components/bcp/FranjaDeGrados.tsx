"use client";

import { GRADOS, SCA_MINIMO } from "@/lib/grados/definicion";
import { decidirPorPunto, type PuntoSca } from "@/lib/arena/homologacion";

// ── V5.157 (owner, 2026-10-06) · la franja de grados con el Punto encima ────────────────────────────────────────────────
// «Quiero ver la combinación y el punto donde cae en la franja correspondiente». La escalera de grados (`definicion.ts`:
// Black 80–81,99 · Red 82–83,99 · Blue 84–85,99 · Gold 86–87,99 · Tyrian 88–100) pintada como una franja de 78 a 92, y
// sobre ella el Punto que rige: una aguja en el piso y, si es homologado, el intervalo sombreado hasta su techo. Debajo, el
// grado firme con lo que ese grado espera de la variedad y del lote — la «combinación» que CTCx decide.
const DESDE = 78;
const HASTA = 92;
const pct = (v: number) => `${((Math.min(HASTA, Math.max(DESDE, v)) - DESDE) / (HASTA - DESDE)) * 100}%`;

export function FranjaDeGrados({ punto, compacta = false }: { punto: PuntoSca | null; compacta?: boolean }) {
  const decision = punto ? decidirPorPunto(punto) : null;
  const firme = decision?.tipo === "galardon" ? decision.grado : null;
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <div style={{ position: "relative", height: compacta ? 22 : 30, borderRadius: 8, overflow: "hidden", border: "1px solid var(--line)", display: "flex" }} role="img" aria-label={punto ? `Punto ${punto.bajo} sobre la franja de grados` : "Franja de grados"}>
        <div style={{ width: pct(SCA_MINIMO), background: "var(--line)", color: "var(--muted)", fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center" }} title="Por debajo de 80: sin grado">
          {!compacta && "< 80 · sin grado"}
        </div>
        {GRADOS.map((g) => (
          <div
            key={g.id}
            title={`${g.nombre} · ${g.scaMin}–${g.scaMax}`}
            style={{ flex: `0 0 calc(${pct(Math.min(HASTA, g.scaMax + 0.01))} - ${pct(g.scaMin)})`, background: g.hex, color: "#fff", fontSize: 10.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", opacity: firme && firme.id !== g.id ? 0.55 : 1 }}
          >
            {g.nombre}
          </div>
        ))}
        {punto && punto.origen === "homologado" && punto.alto > punto.bajo && (
          <div aria-hidden style={{ position: "absolute", top: 0, bottom: 0, left: pct(punto.bajo), width: `calc(${pct(punto.alto)} - ${pct(punto.bajo)})`, background: "rgba(255,255,255,.45)", borderLeft: "1px dashed #fff", borderRight: "1px dashed #fff" }} />
        )}
        {punto && (
          <div aria-hidden style={{ position: "absolute", top: -2, bottom: -2, left: `calc(${pct(punto.bajo)} - 2px)`, width: 4, background: "var(--ink)", boxShadow: "0 0 0 2px #fff", borderRadius: 2 }} />
        )}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--muted)" }}>
        {[80, 82, 84, 86, 88, 90].map((n) => (
          <span key={n}>{n}</span>
        ))}
      </div>
      {!compacta && (
        <p style={{ margin: 0, fontSize: 12.5 }}>
          {!punto ? (
            <span style={{ color: "var(--muted)" }}>Sin Punto todavía.</span>
          ) : decision?.tipo === "galardon" && firme ? (
            <>
              Punto <b>{punto.bajo.toFixed(2)}</b>
              {punto.origen === "homologado" && <> (homologado, hasta {punto.alto.toFixed(2)})</>} cae en <b style={{ color: firme.hex }}>{firme.nombre}</b> ({firme.scaMin}–{firme.scaMax})
              {decision.techo && <> · hasta <b style={{ color: decision.techo.hex }}>{decision.techo.nombre}</b> con recata SCA</>}
              {". "}
              <span style={{ color: "var(--muted)" }}>
                {firme.nombre} espera: {firme.variedad.toLowerCase()} · {firme.claseLote.toLowerCase()}.
              </span>
            </>
          ) : decision?.tipo === "pendiente_recata" ? (
            <>
              El intervalo {punto.bajo.toFixed(2)}–{punto.alto.toFixed(2)} cruza los 80: pendiente de recata SCA 2004 nativa.
            </>
          ) : (
            <>
              Punto <b>{punto.bajo.toFixed(2)}</b>: por debajo de 80, sin grado.
            </>
          )}
        </p>
      )}
    </div>
  );
}
