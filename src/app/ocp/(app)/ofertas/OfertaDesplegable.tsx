"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { emitOffer, type OfferKind } from "../ofertasActions";
import { formatCop } from "@/lib/arena/inscriptions";
import { CARGA_KG, LUGAR_DE_ENTREGA_POR_DEFECTO } from "@/lib/trato/terminos";
import type { AnclajeDeOferta } from "./OfertasClient";
import { NoOfertarForm } from "./OfertasClient";
import styles from "@/components/panel/shared.module.css";

// ── V5.168 (owner, 2026-10-06) · el lote elegible se DESPLIEGA antes de ofertar ──────────────────────────────────────────
// «Solo tengo la opción de directamente "Emitir Oferta…". Quiero poder desplegar el ítem para ver el resumen, y confirmar los
// parámetros de la oferta: cantidad mínima disponible de CPS, condiciones de entrega (por defecto el café es entregado en
// Bucaramanga en las instalaciones de CTCx) y la oferta de precio por kg/carga.»
// El precio llega del PVC (Lote de Temporada o Directa); si CTCx lo cambia, la oferta pasa a «excepción» y pide motivo: así
// el anclaje nunca se rompe en silencio. kg y carga se editan juntos (1 carga = 125 kg).

export type ResumenDelLote = {
  productor: string;
  finca: string | null;
  lugar: string | null;
  grado: string;
  gradoLogo: string | null;
  punto: number | null;
  triada: string | null;
  factor: number | null;
  variedad: string | null;
  proceso: string | null;
  altitud: number | null;
  cosecha: string | null;
  referencia: string;
};

const num = (s: string) => Number(String(s).replace(/\./g, "").replace(",", "."));

export function OfertaDesplegable({ lotId, lotName, resumen, anclaje }: { lotId: string; lotName: string; resumen: ResumenDelLote; anclaje: AnclajeDeOferta | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [clase, setClase] = useState<OfferKind>("temporada");
  const precioAncla = anclaje ? (clase === "directa" ? anclaje.copKgDirecta : anclaje.copKg) : null;
  const [precioKg, setPrecioKg] = useState(precioAncla != null ? String(Math.round(precioAncla)) : "");
  const [minKg, setMinKg] = useState(anclaje?.minKg != null ? String(anclaje.minKg) : "");
  const [maxKg, setMaxKg] = useState("");
  const [lugar, setLugar] = useState(LUGAR_DE_ENTREGA_POR_DEFECTO);
  const [notas, setNotas] = useState("");

  const kgN = num(precioKg);
  // Cambiar el precio del PVC convierte la oferta en excepción (con motivo): se dice, no se oculta.
  const cambiaPrecio = precioAncla != null && Number.isFinite(kgN) && Math.round(kgN) !== Math.round(precioAncla);
  const claseEfectiva: OfferKind = cambiaPrecio || precioAncla == null ? "excepcion" : clase;
  const faltaMotivo = claseEfectiva === "excepcion" && !notas.trim();
  const minN = num(minKg);
  const listo = Number.isFinite(kgN) && kgN > 0 && Number.isFinite(minN) && minN > 0 && !faltaMotivo && lugar.trim() !== "";

  function elegirClase(k: OfferKind) {
    setClase(k);
    if (anclaje && (k === "temporada" || k === "directa")) setPrecioKg(String(Math.round(k === "directa" ? anclaje.copKgDirecta : anclaje.copKg)));
  }

  function emitir() {
    setError(null);
    start(async () => {
      const fd = new FormData();
      if (claseEfectiva === "excepcion") fd.set("price_per_kg", String(kgN));
      fd.set("min_kg", String(minN));
      fd.set("lugar_entrega", lugar.trim());
      if (claseEfectiva === "directa" && maxKg.trim()) fd.set("max_kg", String(num(maxKg)));
      if (notas.trim()) fd.set("notes", notas.trim());
      const res = await emitOffer(lotId, claseEfectiva, fd);
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  }

  const dato = (k: string, v: React.ReactNode) =>
    v == null || v === "" ? null : (
      <div>
        <div style={{ fontSize: 11, color: "var(--muted)" }}>{k}</div>
        <div style={{ fontWeight: 600, fontSize: 13 }}>{v}</div>
      </div>
    );

  return (
    <details className={styles.miniCard} style={{ padding: 0 }}>
      <summary style={{ cursor: "pointer", padding: "10px 12px", listStyle: "revert" }}>
        <b>{lotName}</b>
        <span className={styles.meta} style={{ display: "block", margin: "2px 0 0" }}>
          {resumen.productor} · {resumen.finca ?? "—"} · <span className="mono">{resumen.referencia}</span> · <b style={{ color: `var(--t-${resumen.grado})` }}>{resumen.grado}</b>
          {anclaje && <> · PVC {anclaje.code}: <b>{formatCop(anclaje.copKg)}/kg</b></>}
        </span>
      </summary>
      <div style={{ padding: "0 12px 12px", display: "grid", gap: 10 }}>
        {/* ── El resumen del lote ── */}
        <div style={{ display: "grid", gridTemplateColumns: resumen.gradoLogo ? "54px 1fr" : "1fr", gap: 10, alignItems: "start", borderTop: "1px solid var(--line)", paddingTop: 10 }}>
          {resumen.gradoLogo && (
            // eslint-disable-next-line @next/next/no-img-element -- sello del grado, asset público
            <img src={resumen.gradoLogo} alt={resumen.grado} width={54} height={54} style={{ objectFit: "contain" }} />
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: "6px 12px" }}>
            {dato("Punto SCA", resumen.punto != null ? resumen.punto.toFixed(2) : null)}
            {dato("Tríada", resumen.triada)}
            {dato("Factor", resumen.factor != null ? resumen.factor.toFixed(2) : null)}
            {dato("Variedad", resumen.variedad)}
            {dato("Proceso", resumen.proceso)}
            {dato("Altitud", resumen.altitud != null ? `${resumen.altitud.toLocaleString("es-CO")} m` : null)}
            {dato("Origen", resumen.lugar)}
            {dato("Cosecha", resumen.cosecha)}
          </div>
        </div>
        <a href={`/ocp/kr?lote=${lotId}`} className={styles.meta} style={{ margin: 0 }}>
          Ver el lote completo (Ficha, evaluación, finca) →
        </a>

        {/* ── Los parámetros de la oferta ── */}
        <div style={{ border: "1px dashed var(--line)", borderRadius: 8, padding: "10px 12px", display: "grid", gap: 8 }}>
          <b style={{ fontSize: 13 }}>Confirmar la oferta</b>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {(["temporada", "directa"] as const).map((k) => (
              <label key={k} style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12.5, cursor: "pointer" }}>
                <input type="radio" name={`clase-${lotId}`} checked={clase === k} onChange={() => elegirClase(k)} disabled={!anclaje} />
                {k === "temporada" ? "Lote de Temporada (PVC)" : "Directa · CTCx Selection (PVC − 8 %, 30 días)"}
              </label>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8 }}>
            <label style={{ fontSize: 12, display: "grid", gap: 3 }}>
              Precio COP por kg de CPS
              <input inputMode="numeric" value={precioKg} onChange={(e) => setPrecioKg(e.target.value)} />
            </label>
            <label style={{ fontSize: 12, display: "grid", gap: 3 }}>
              Precio COP por carga ({CARGA_KG} kg)
              <input
                inputMode="numeric"
                value={Number.isFinite(kgN) && kgN > 0 ? String(Math.round(kgN * CARGA_KG)) : ""}
                onChange={(e) => {
                  const c = num(e.target.value);
                  setPrecioKg(Number.isFinite(c) && c > 0 ? String(Math.round(c / CARGA_KG)) : "");
                }}
              />
            </label>
            <label style={{ fontSize: 12, display: "grid", gap: 3 }}>
              Cantidad mínima disponible de CPS (kg)
              <input inputMode="numeric" value={minKg} onChange={(e) => setMinKg(e.target.value)} />
              <span className={styles.meta} style={{ margin: 0 }}>
                {Number.isFinite(minN) && minN > 0 ? `${(minN / CARGA_KG).toLocaleString("es-CO", { maximumFractionDigits: 2 })} cargas` : "—"}
                {anclaje?.minKg != null ? ` · el mínimo del grado es ${anclaje.minKg} kg` : ""}
              </span>
            </label>
            {claseEfectiva === "directa" && (
              <label style={{ fontSize: 12, display: "grid", gap: 3 }}>
                Máximo kg (opcional)
                <input inputMode="numeric" value={maxKg} onChange={(e) => setMaxKg(e.target.value)} />
              </label>
            )}
          </div>
          <label style={{ fontSize: 12, display: "grid", gap: 3 }}>
            Condiciones de entrega
            <textarea rows={2} value={lugar} onChange={(e) => setLugar(e.target.value)} />
          </label>
          {precioAncla != null ? (
            cambiaPrecio ? (
              <p className={styles.warn} style={{ margin: 0 }}>
                El precio se aparta del PVC ({formatCop(precioAncla)}/kg): la oferta sale como <b>excepción</b> y necesita su motivo abajo.
              </p>
            ) : (
              <p className={styles.meta} style={{ margin: 0 }}>
                PVC {anclaje!.code} · banda {anclaje!.banda} ×{anclaje!.mult} → {formatCop(precioAncla)}/kg
                {clase === "temporada" && <> · CTC compra {anclaje!.compraInicialKg} kg de inmediato</>}. Si el lote es de la temporada pasada, se aplica −10 % al emitir.
              </p>
            )
          ) : (
            <p className={styles.warn} style={{ margin: 0 }}>Sin edición del PVC vigente: la oferta sale como excepción, con motivo.</p>
          )}
          <textarea
            rows={2}
            placeholder={claseEfectiva === "excepcion" ? "Motivo de la excepción (obligatorio; el productor lo ve)" : "Notas para el productor (opcional)"}
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
          />
          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", flexWrap: "wrap", alignItems: "center" }}>
            <NoOfertarForm lotId={lotId} />
            <button className="btn btn-sm btn-solid" disabled={pending || !listo} onClick={emitir}>
              {pending ? "Emitiendo…" : `Confirmar y emitir · ${Number.isFinite(kgN) && kgN > 0 ? formatCop(kgN) : "—"}/kg`}
            </button>
          </div>
          {!listo && !pending && (
            <p className={styles.meta} style={{ margin: 0, textAlign: "right" }}>
              {faltaMotivo ? "Falta el motivo de la excepción." : "Falta el precio, la cantidad mínima o las condiciones de entrega."}
            </p>
          )}
          {error && (
            <p className={styles.warn} style={{ margin: 0 }} role="status">
              {error}
            </p>
          )}
        </div>
      </div>
    </details>
  );
}
