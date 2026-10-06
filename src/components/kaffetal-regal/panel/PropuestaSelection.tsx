"use client";

import { useState } from "react";
import { contraofertarSeleccion, respondToOffer } from "@/lib/ofertas/producerActions";
import { CARGA_KG, LUGAR_DE_ENTREGA_POR_DEFECTO } from "@/lib/trato/terminos";
import { formatCop } from "@/lib/arena/inscriptions";
import { ctcLotReference, type ProducerOffer } from "../data";
import { FirmaDelContrato, type FirmaDelProductor } from "./FirmaDelContrato";
import { useToast } from "@/components/Toast";

// ── V5.169 (owner, 2026-10-06) · la propuesta de compra de CTCx Selection ────────────────────────────────────────────────
// «Si el Productor recibe una oferta de CTCx Selection, esto es directamente una propuesta para completar una venta, con la
// claridad directa que el precio ofrecido NO es el del PVC actual, sino que es HASTA PVC − 8 % actual, determinado en la oferta;
// el Productor puede contestar rebatiendo con una contraoferta, llevándolo de nuevo a OCP para que CTCx responda. Esto puede
// suceder las veces que se quiera hasta que alguno de los dos acepte o desista del todo.»

export function PropuestaSelection({ offer, onRefreshData }: { offer: ProducerOffer; onRefreshData: () => void }) {
  const { showToast } = useToast();
  const [modo, setModo] = useState<"ver" | "contraofertar" | "firmar" | "desistir">("ver");
  const [busy, setBusy] = useState(false);
  const [precio, setPrecio] = useState(String(Math.round(offer.pricePerKg)));
  const [kg, setKg] = useState(offer.quantityKg != null ? String(offer.quantityKg) : "");
  const [nota, setNota] = useState("");
  const kgN = offer.quantityKg ?? 0;
  const fncKg = offer.fncCargaRef ? offer.fncCargaRef / CARGA_KG : null;
  const primaFnc = fncKg ? Math.round((offer.pricePerKg / fncKg - 1) * 1000) / 10 : null;
  const esperaCtcx = offer.status === "contraofertada";
  const ultimaCtcx = [...offer.rondas].reverse().find((r) => r.autor === "ctcx");
  const ctcxAcepto = ultimaCtcx?.accion === "acepta";

  async function enviar(fn: () => Promise<{ ok: true } | { ok: false; message: string }>, ok: string) {
    setBusy(true);
    const res = await fn();
    setBusy(false);
    if (res.ok) {
      showToast(ok);
      setModo("ver");
      onRefreshData();
    } else showToast(res.message);
  }

  return (
    <div style={{ marginTop: 10, border: "1px solid var(--line)", borderRadius: 10, padding: "12px 14px", background: "var(--card)", display: "grid", gap: 10 }}>
      <div>
        <b style={{ fontSize: 14 }}>Propuesta de compra · CTCx Selection</b>
        <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 2 }}>
          CTCx le propone comprar café de este lote ahora. <b>Este precio no es el PVC actual</b>: es hasta el PVC − 8 %
          {offer.precioTopeKg != null && <> (el tope de hoy es {formatCop(offer.precioTopeKg)}/kg)</>}, fijado en la propuesta. Puede aceptarla, contraofertar las
          veces que quiera, o desistir.
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
        {[
          ["Precio propuesto", `${formatCop(offer.pricePerKg)}/kg`, `${formatCop(offer.pricePerKg * CARGA_KG)} por carga`],
          ["Cantidad", `${kgN.toLocaleString("es-CO")} kg`, `${(kgN / CARGA_KG).toLocaleString("es-CO", { maximumFractionDigits: 2 })} cargas`],
          ["Total de la venta", formatCop(offer.pricePerKg * kgN), "en firme, con la entrega"],
          ...(primaFnc != null ? [["Frente a la FNC", `${primaFnc >= 0 ? "+" : ""}${primaFnc.toLocaleString("es-CO")} %`, `FNC del día: ${formatCop(offer.fncCargaRef ?? 0)}/carga`]] : []),
        ].map(([t, v, n]) => (
          <div key={t} style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "8px 10px", background: "var(--paper)", display: "grid", gap: 2 }}>
            <span style={{ fontSize: 11.5, color: "var(--muted)" }}>{t}</span>
            <b style={{ fontSize: 16 }}>{v}</b>
            <span style={{ fontSize: 11, color: "var(--muted)" }}>{n}</span>
          </div>
        ))}
      </div>
      {offer.rondas.length > 0 && (
        <details>
          <summary style={{ cursor: "pointer", fontSize: 12.5 }}>La negociación ({offer.rondas.length} {offer.rondas.length === 1 ? "paso" : "pasos"})</summary>
          <ol style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 12 }}>
            {offer.rondas.map((r, i) => (
              <li key={i}>
                <b>{r.autor === "ctcx" ? "CTCx" : "Usted"}</b> {r.accion === "propone" ? "propone" : r.accion === "contraoferta" ? "contraoferta" : r.accion === "acepta" ? "acepta" : "desiste"}
                {r.precioKg != null && <> · {formatCop(r.precioKg)}/kg</>}
                {r.kg != null && <> · {r.kg} kg</>}
                {r.nota && <> · «{r.nota}»</>}
              </li>
            ))}
          </ol>
        </details>
      )}
      {ctcxAcepto && !esperaCtcx && <div style={{ fontSize: 12.5, color: "var(--green)", fontWeight: 700 }}>CTCx aceptó su contraoferta: solo falta que usted firme.</div>}
      {esperaCtcx && <div style={{ fontSize: 12.5, fontWeight: 700 }}>Su contraoferta está en manos de CTCx. Le avisamos cuando responda.</div>}

      {modo === "contraofertar" && (
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <label style={{ fontSize: 12.5, display: "grid", gap: 3 }}>
              Precio que propone (COP/kg)
              <input inputMode="numeric" value={precio} onChange={(e) => setPrecio(e.target.value)} style={{ padding: "6px 8px", border: "1.5px solid var(--line)", borderRadius: 7 }} />
            </label>
            <label style={{ fontSize: 12.5, display: "grid", gap: 3 }}>
              Kilos que vende
              <input inputMode="numeric" value={kg} onChange={(e) => setKg(e.target.value)} style={{ padding: "6px 8px", border: "1.5px solid var(--line)", borderRadius: 7 }} />
            </label>
          </div>
          <textarea rows={2} placeholder="Una nota para CTCx (opcional)" value={nota} onChange={(e) => setNota(e.target.value)} style={{ padding: "8px 10px", border: "1.5px solid var(--line)", borderRadius: 8, fontFamily: "inherit" }} />
        </div>
      )}
      {modo === "desistir" && (
        <textarea rows={2} placeholder="¿Por qué desiste? (opcional)" value={nota} onChange={(e) => setNota(e.target.value)} style={{ padding: "8px 10px", border: "1.5px solid var(--line)", borderRadius: 8, fontFamily: "inherit" }} />
      )}
      {modo === "firmar" && (
        <FirmaDelContrato
          datos={{
            tipo: "selection",
            condiciones: null,
            productorDocumento: null,
            loteNombre: offer.lotName,
            loteReferencia: ctcLotReference(offer.lotId),
            grado: offer.grade ?? "—",
            copKg: offer.pricePerKg,
            declaradoKg: kgN,
            lugarEntrega: offer.lugarEntrega ?? LUGAR_DE_ENTREGA_POR_DEFECTO,
            termsVersion: offer.termsVersion,
            temporada: offer.seasonLabel,
          }}
          ocupado={busy}
          onFirmar={(f: FirmaDelProductor) => enviar(() => respondToOffer(offer.id, "aceptar", undefined, undefined, f), "Venta firmada ✓ · CTCx firma y queda en firme")}
          onVolver={() => setModo("ver")}
        />
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
        {modo === "ver" && !esperaCtcx && (
          <>
            <button className="btn btn-sm btn-solid-accent" disabled={busy} onClick={() => setModo("firmar")}>
              Aceptar y firmar la venta
            </button>
            <button className="btn btn-sm" disabled={busy} onClick={() => setModo("contraofertar")}>
              Contraofertar…
            </button>
          </>
        )}
        {modo === "contraofertar" && (
          <>
            <button
              className="btn btn-sm btn-solid-accent"
              disabled={busy || !precio.trim() || !kg.trim()}
              onClick={() => enviar(() => contraofertarSeleccion(offer.id, Number(precio.replace(/\./g, "").replace(",", ".")), Number(kg.replace(",", ".")), nota), "Contraoferta enviada a CTCx")}
            >
              {busy ? "Enviando…" : "Enviar contraoferta"}
            </button>
            <button className="btn btn-sm" disabled={busy} onClick={() => setModo("ver")}>
              Volver
            </button>
          </>
        )}
        {modo === "desistir" ? (
          <>
            <button className="btn btn-sm btn-solid" disabled={busy} onClick={() => enviar(() => respondToOffer(offer.id, "rechazar", nota), "Usted desistió de la venta")}>
              {busy ? "Enviando…" : "Confirmar: desisto"}
            </button>
            <button className="btn btn-sm" disabled={busy} onClick={() => setModo("ver")}>
              Volver
            </button>
          </>
        ) : (
          modo === "ver" && (
            <button className="btn btn-sm" disabled={busy} onClick={() => setModo("desistir")}>
              Desistir…
            </button>
          )
        )}
      </div>
    </div>
  );
}
