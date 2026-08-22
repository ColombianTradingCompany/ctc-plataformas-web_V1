"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { abrirSubasta, cerrarSubasta, adjudicarSubasta, cancelarSubasta } from "../subastasActions";
import type { AuctionStatus, MembershipTier } from "@/lib/subastas/tipos";
import styles from "@/components/panel/shared.module.css";

// Controles cliente de /ocp/subastas: abrir (con su formulario), y sobre
// cada subasta cerrar · adjudicar · cancelar. Las pujas se listan por
// fracción con la líder arriba.

export type SubastaAdmin = {
  id: string;
  lotId: string;
  status: AuctionStatus;
  fracciones: 1 | 2;
  kgTotal: number;
  kgFraccion: number;
  precioSalida: number;
  incremento: number;
  tierMinimo: MembershipTier;
  endsAt: string;
  vencida: boolean;
  lotName: string;
  fincaName: string | null;
  score: number | null;
  notes: string | null;
  adjudicatedAt: string | null;
  pujas: { id: string; fraccion: 1 | 2; comprador: string; monto: number; estado: "vigente" | "superada" | "ganadora"; fecha: string }[];
};

type ActionResult = { ok: true } | { ok: false; error: string };

function useAction() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<ActionResult>) => {
    setError(null);
    start(async () => {
      const res = await fn();
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  };
  return { pending, error, run };
}

const eur = (n: number) => n.toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const STATUS_LABEL: Record<AuctionStatus, string> = {
  abierta: "Abierta",
  cerrada: "Cerrada — por adjudicar",
  adjudicada: "Adjudicada ✓",
  cancelada: "Cancelada",
};

export function AbrirSubastaForm({ lotId, lotName }: { lotId: string; lotName: string }) {
  const { pending, error, run } = useAction();
  const [open, setOpen] = useState(false);
  const [fracciones, setFracciones] = useState<"1" | "2">("2");
  const [kg, setKg] = useState("");
  const [salida, setSalida] = useState("");
  const [incremento, setIncremento] = useState("0.5");
  const [endsAt, setEndsAt] = useState("");
  const [tier, setTier] = useState<MembershipTier>("pinton");
  const [notes, setNotes] = useState("");

  function abrir() {
    run(async () => {
      const fd = new FormData();
      fd.set("fracciones", fracciones);
      fd.set("kg_total", kg);
      fd.set("precio_salida", salida);
      fd.set("incremento", incremento);
      fd.set("ends_at", endsAt);
      fd.set("tier_minimo", tier);
      if (notes.trim()) fd.set("notes", notes);
      const res = await abrirSubasta(lotId, fd);
      if (res.ok) setOpen(false);
      return res;
    });
  }

  if (!open) {
    return (
      <button className="btn btn-sm btn-solid" onClick={() => setOpen(true)}>Abrir subasta…</button>
    );
  }
  return (
    <div style={{ border: "1px dashed var(--line)", borderRadius: 8, padding: "10px 12px", marginTop: 6, display: "grid", gap: 6 }}>
      <p className={styles.meta} style={{ margin: 0 }}>
        La subasta de <b>{lotName}</b> se muestra en Cherry Picked Green con sus datos públicos (nombre, finca, variedad, proceso, altitud, puntaje). La puja es en EUR/kg.
      </p>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <select value={fracciones} onChange={(e) => setFracciones(e.target.value as "1" | "2")} style={{ maxWidth: 170 }}>
          <option value="2">Dos mitades (A y B)</option>
          <option value="1">El lote completo</option>
        </select>
        <input placeholder="Kilos totales *" inputMode="decimal" value={kg} onChange={(e) => setKg(e.target.value)} style={{ maxWidth: 130 }} />
        <input placeholder="Salida EUR/kg *" inputMode="decimal" value={salida} onChange={(e) => setSalida(e.target.value)} style={{ maxWidth: 140 }} />
        <input placeholder="Incremento EUR/kg" inputMode="decimal" value={incremento} onChange={(e) => setIncremento(e.target.value)} style={{ maxWidth: 150 }} />
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <label className={styles.meta} style={{ margin: 0 }}>Cierre *</label>
        <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
        <select value={tier} onChange={(e) => setTier(e.target.value as MembershipTier)} style={{ maxWidth: 170 }}>
          <option value="pinton">Nivel mínimo: Pintón</option>
          <option value="maduro">Nivel mínimo: Maduro</option>
          <option value="verde">Nivel mínimo: Verde (todos)</option>
        </select>
      </div>
      <textarea rows={2} placeholder="Nota pública (opcional): empaque, embarque…" value={notes} onChange={(e) => setNotes(e.target.value)} />
      {error && <p className={styles.warn} style={{ margin: 0 }}>{error}</p>}
      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
        <button className="btn btn-sm" onClick={() => setOpen(false)}>Cancelar</button>
        <button className="btn btn-sm btn-solid" disabled={pending || !kg.trim() || !salida.trim() || !endsAt} onClick={abrir}>
          {pending ? "Abriendo…" : "Abrir subasta"}
        </button>
      </div>
    </div>
  );
}

export function SubastaCard({ subasta: a }: { subasta: SubastaAdmin }) {
  const { pending, error, run } = useAction();
  const fracciones = a.fracciones === 1 ? [1 as const] : [1 as const, 2 as const];
  const etiqueta = (f: 1 | 2) => (a.fracciones === 1 ? "Lote completo" : f === 1 ? "Mitad A" : "Mitad B");

  return (
    <div className={styles.miniCard}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <Link href={`/ocp/lotes#lot-${a.lotId}`} style={{ fontWeight: 700, color: "var(--ink)", textDecoration: "none" }}>{a.lotName}</Link>
        <span className={styles.meta}>{STATUS_LABEL[a.status]}{a.status === "abierta" && a.vencida && " · VENCIDA"}</span>
      </div>
      <p className={styles.meta} style={{ margin: "2px 0 6px" }}>
        {a.fincaName ?? "—"}{a.score != null && <> · SCA {a.score}</>} · {a.kgTotal} kg{a.fracciones === 2 && <> ({a.kgFraccion} kg por mitad)</>} · salida {eur(a.precioSalida)} €/kg · +{eur(a.incremento)} · cierra {new Date(a.endsAt).toLocaleString("es-CO")} · mín. {a.tierMinimo}
      </p>

      {fracciones.map((f) => {
        const pujas = a.pujas.filter((p) => p.fraccion === f).sort((x, y) => y.monto - x.monto);
        const lider = pujas[0];
        return (
          <div key={f} style={{ borderTop: "1px dashed var(--line)", paddingTop: 6, marginTop: 6 }}>
            <p className={styles.meta} style={{ margin: 0 }}>
              <b>{etiqueta(f)}</b> · {pujas.length} puja{pujas.length === 1 ? "" : "s"} · {new Set(pujas.map((p) => p.comprador)).size} pujador{new Set(pujas.map((p) => p.comprador)).size === 1 ? "" : "es"}
            </p>
            {lider ? (
              <p style={{ margin: "2px 0 0", fontSize: 13 }}>
                {lider.estado === "ganadora" ? "🏆 Ganador" : "Líder"}: <b>{lider.comprador}</b> a <b>{eur(lider.monto)} €/kg</b> ({eur(lider.monto * a.kgFraccion)} € la {a.fracciones === 1 ? "totalidad" : "mitad"})
              </p>
            ) : (
              <p className={styles.meta} style={{ margin: "2px 0 0" }}>Sin pujas todavía.</p>
            )}
            {pujas.length > 1 && (
              <p className={styles.meta} style={{ margin: "2px 0 0" }}>
                Anteriores: {pujas.slice(1, 6).map((p) => `${p.comprador} ${eur(p.monto)}`).join(" · ")}{pujas.length > 6 && " · …"}
              </p>
            )}
          </div>
        );
      })}

      {error && <p className={styles.warn} style={{ marginTop: 6 }}>{error}</p>}
      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", marginTop: 8, flexWrap: "wrap" }}>
        {a.status === "abierta" && (
          <>
            <button className="btn btn-sm" disabled={pending} onClick={() => { if (confirm("¿Cancelar la subasta? Las pujas quedan sin efecto.")) run(() => cancelarSubasta(a.id)); }}>Cancelar</button>
            <button className="btn btn-sm btn-solid" disabled={pending} onClick={() => run(() => cerrarSubasta(a.id))}>{pending ? "…" : "Cerrar subasta"}</button>
          </>
        )}
        {a.status === "cerrada" && (
          <>
            <button className="btn btn-sm" disabled={pending} onClick={() => { if (confirm("¿Cancelar la subasta sin adjudicar?")) run(() => cancelarSubasta(a.id)); }}>Cancelar</button>
            <button className="btn btn-sm btn-solid" disabled={pending} onClick={() => run(() => adjudicarSubasta(a.id))}>{pending ? "…" : "Adjudicar a los líderes"}</button>
          </>
        )}
        {a.status === "adjudicada" && (
          <Link href="/ocp/ofertas" className="btn btn-sm btn-solid">Registrar mejor postor en Ofertas →</Link>
        )}
      </div>
    </div>
  );
}
