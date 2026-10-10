"use client";

// ── Adquisición · registrar una compra a mano (V5.203, owner 2026-10-10) ─────────────────────────────────────────────────────────
// Lo comprado fuera de la plataforma (la ruta Desacoplada, un acuerdo directo), siempre con su nota. Desde la V5.203: «Es de» no trae
// valor por defecto y dice qué verá la vitrina en cada caso; ninguna fecha puede ir al futuro (el campo no lo deja y la acción tampoco,
// B4); si el lote tiene un trato por ventana vivo, se avisa —su saco y su adelanto ya son compras: nacen al recibirlos en el contrato—
// con el precio del contrato y su edición del PVC, y se pide confirmar que esta es otra compra; y al salir bien, el formulario se vacía
// y lo dice (antes un segundo clic registraba la compra dos veces).
// V5.203 · corrección (nodo final, 2026-10-10 · H6/H7, decisión 2): lo que dice «Es de» va por LOTE —si otra compra ya hace del lote un
// CTCx Selection, esta no cambia la vitrina— y, si una compra Selection le cambiaría la cara a un lote que YA sale en la vitrina como
// lote del productor, se pide confirmarlo (`confirma_vitrina`, la acción lo repite con la base fresca).

import { useState } from "react";
import Link from "next/link";
import { ActionForm } from "@/components/panel/ActionForm";
import { DESTINO_LABEL, VITRINA_SEGUN_DESTINO, textoDeVitrina, type FotoDeVitrina } from "@/lib/compras/selection";
import { registrarCompraManual } from "../comprasActions";
import shared from "@/components/panel/shared.module.css";
import s from "./compras.module.css";

export type LoteParaComprar = { id: string; etiqueta: string };
export type TratoParaAviso = { contractId: string; precioTexto: string; pvcCode: string | null };

export function CompraManualForm({ lotes, tratos, vitrina, hoy }: { lotes: LoteParaComprar[]; tratos: Record<string, TratoParaAviso>; vitrina: Record<string, FotoDeVitrina>; hoy: string }) {
  const [lote, setLote] = useState("");
  const [destino, setDestino] = useState<"" | "selection" | "stock">("");
  const trato = lote ? tratos[lote] ?? null : null;
  const queVeLaVitrina = destino ? textoDeVitrina(lote ? vitrina[lote] ?? null : null, destino, null) : null;
  return (
    <ActionForm
      action={registrarCompraManual}
      submitLabel="Registrar la compra"
      pendingLabel="Registrando…"
      buttonClassName="btn btn-solid"
      className={shared.card}
      style={{ display: "block", marginTop: 10 }}
      resetOnSuccess
      successMessage="Compra registrada: ya está en la tabla de abajo (y en el Stock CTCx, si tenía fecha de recibo)."
      onSuccess={() => {
        setLote("");
        setDestino("");
      }}
    >
      <p className={shared.meta} style={{ marginBottom: 10 }}>
        Para lo comprado fuera de la plataforma. El precio queda referido a la edición del PVC vigente el día del pago; la nota es obligatoria
        (de dónde sale la compra). Solo lotes galardonados, nunca Tyrian. Todo en kg de CPS (pergamino seco). Si ya llegó (con fecha de recibo),
        entra solo al Stock CTCx; si no, entra con «Entrar al stock» cuando llegue.
      </p>
      <div className={shared.formGrid}>
        <div className={shared.field} style={{ gridColumn: "1 / -1" }}>
          <label htmlFor="compra-lote">Lote</label>
          <select id="compra-lote" name="lot_id" required value={lote} onChange={(e) => setLote(e.target.value)}>
            <option value="" disabled>
              Elija el lote galardonado…
            </option>
            {lotes.map((l) => (
              <option key={l.id} value={l.id}>
                {l.etiqueta}
                {tratos[l.id] ? " · trato por ventana vivo" : ""}
              </option>
            ))}
          </select>
        </div>
        {trato && (
          <div style={{ gridColumn: "1 / -1" }}>
            <p className={s.aviso} role="note">
              Este lote tiene un <b>trato por ventana vivo</b> a <b>{trato.precioTexto}/kg</b>
              {trato.pvcCode ? <> (referencia {trato.pvcCode})</> : null}: su saco y su adelanto ya son compras de CTCx y nacen solos al recibirlos en
              el <Link href={`/ocp/contratos/${trato.contractId}`}>contrato →</Link>. Registre aquí solo una compra distinta.
            </p>
            <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, marginBottom: 12 }}>
              <input type="checkbox" name="confirma_trato" value="1" required /> Esta compra no es el saco ni el adelanto del trato.
            </label>
          </div>
        )}
        <div className={shared.field}>
          <label htmlFor="compra-kg">Kilos de CPS</label>
          <input id="compra-kg" name="kg" inputMode="decimal" required />
        </div>
        <div className={shared.field}>
          <label htmlFor="compra-cop">Precio pagado (COP/kg)</label>
          <input id="compra-cop" name="cop_kg" inputMode="numeric" required />
        </div>
        <div className={shared.field}>
          <label htmlFor="compra-pagada">Pagada el</label>
          <input id="compra-pagada" name="pagada_at" type="date" max={hoy} />
        </div>
        <div className={shared.field}>
          <label htmlFor="compra-ref">Referencia del pago</label>
          <input id="compra-ref" name="pago_ref" />
        </div>
        <div className={shared.field}>
          <label htmlFor="compra-recibida">Recibida el</label>
          <input id="compra-recibida" name="recibida_at" type="date" max={hoy} />
        </div>
        <div className={shared.field}>
          <label htmlFor="compra-ubicacion">Dónde está el café</label>
          <input id="compra-ubicacion" name="ubicacion" maxLength={200} placeholder="finca · Centro de Calidad · bodega" />
        </div>
        <div className={shared.field} style={{ gridColumn: "1 / -1" }}>
          <label htmlFor="compra-destino">Es de</label>
          <select id="compra-destino" name="destino" required value={destino} onChange={(e) => setDestino(e.target.value as "" | "selection" | "stock")}>
            <option value="" disabled>
              Elija: ¿{DESTINO_LABEL.selection} o {DESTINO_LABEL.stock.toLowerCase()}?
            </option>
            {(Object.keys(DESTINO_LABEL) as (keyof typeof DESTINO_LABEL)[]).map((d) => (
              <option key={d} value={d}>
                {DESTINO_LABEL[d]}
              </option>
            ))}
          </select>
          {queVeLaVitrina ? (
            <>
              <p className={queVeLaVitrina.confirmar ? s.regla : s.vitrina}>{queVeLaVitrina.texto}</p>
              {queVeLaVitrina.confirmar && (
                <label className={s.confirma}>
                  <input type="checkbox" name="confirma_vitrina" value="1" required /> Lo sé: confirmo el cambio en la vitrina.
                </label>
              )}
            </>
          ) : (
            <p className={s.vitrina}>
              <b>{DESTINO_LABEL.selection}</b>: {VITRINA_SEGUN_DESTINO.selection} <b>{DESTINO_LABEL.stock}</b>: {VITRINA_SEGUN_DESTINO.stock}
            </p>
          )}
        </div>
        <div className={shared.field} style={{ gridColumn: "1 / -1" }}>
          <label htmlFor="compra-nota">Nota (obligatoria)</label>
          <input id="compra-nota" name="nota" placeholder="Acuerdo por WhatsApp del 12/10; factura N.º…" required />
        </div>
      </div>
    </ActionForm>
  );
}
