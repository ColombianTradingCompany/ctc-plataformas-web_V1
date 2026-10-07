"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { emitOffer, type OfferKind } from "../ofertasActions";
import { formatCop } from "@/lib/arena/inscriptions";
import { CARGA_KG, LUGAR_DE_ENTREGA_POR_DEFECTO } from "@/lib/trato/terminos";
import { fechaLarga } from "@/lib/trato/modalidades";
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
/** V5.172: los montos y los kilos se escriben con separador de miles («23.920»); `num` los vuelve a leer. */
const miles = (s: string) => {
  const d = String(s).replace(/\D/g, "");
  return d ? Number(d).toLocaleString("es-CO") : "";
};

// V5.172 (owner, 2026-10-06: «no hace muy claro que los números son dinero y que se pueden cambiar, igual que la cantidad»): cada
// cifra editable va en una caja con borde, su moneda o unidad a los lados y el lápiz que dice que se escribe ahí.
function Campo({
  etiqueta,
  prefijo,
  sufijo,
  valor,
  onCambio,
  ayuda,
}: {
  etiqueta: string;
  prefijo?: string;
  sufijo: string;
  valor: string;
  onCambio: (v: string) => void;
  ayuda?: React.ReactNode;
}) {
  return (
    <label style={{ fontSize: 12, display: "grid", gap: 4, fontWeight: 600, gridTemplateColumns: "minmax(0, 1fr)", minWidth: 0 }}>
      {etiqueta}
      <span className={styles.campoCifra}>
        {prefijo && <span className={styles.campoCifraLado}>{prefijo}</span>}
        <input inputMode="numeric" value={valor} onChange={(e) => onCambio(miles(e.target.value))} aria-label={etiqueta} />
        <span className={styles.campoCifraLado}>{sufijo}</span>
        <span aria-hidden className={styles.campoCifraLapiz}>
          ✎
        </span>
      </span>
      {ayuda && (
        <span className={styles.meta} style={{ margin: 0, fontWeight: 400 }}>
          {ayuda}
        </span>
      )}
    </label>
  );
}

export function OfertaDesplegable({ lotId, lotName, resumen, anclaje }: { lotId: string; lotName: string; resumen: ResumenDelLote; anclaje: AnclajeDeOferta | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [clase, setClase] = useState<OfferKind>("temporada");
  const precioAncla = anclaje ? (clase === "directa" ? anclaje.copKgDirecta : anclaje.copKg) : null;
  const [precioKg, setPrecioKg] = useState(precioAncla != null ? miles(String(Math.round(precioAncla))) : "");
  const [minKg, setMinKg] = useState(anclaje?.minKg != null ? miles(String(anclaje.minKg)) : "");
  // V5.169: la compra de CTCx Selection propone cuántos kilos compra (todo el lote o una parte).
  const [kgSelection, setKgSelection] = useState("");
  const [lugar, setLugar] = useState(LUGAR_DE_ENTREGA_POR_DEFECTO);
  // V5.175 (docs/PLAN_CICLOS.md §3): el saco de la firma (70–200 kg) o la compra adelantada de un lote que continúa (0–200 kg).
  const [saco, setSaco] = useState(anclaje ? miles(String(anclaje.saco.kg)) : "");
  const sacoN = saco.trim() === "" ? 0 : num(saco);
  const sacoOk = !anclaje || (Number.isFinite(sacoN) && sacoN >= anclaje.saco.min && sacoN <= anclaje.saco.max);
  const [notas, setNotas] = useState("");

  const kgN = num(precioKg);
  const esSelection = clase === "directa";
  // Participar en Cherry Picked va al PVC: cambiarlo la convierte en excepción (con motivo). Una compra de CTCx Selection va HASTA
  // el PVC − 8 %: se puede proponer menos, nunca más (V5.169).
  const cambiaPrecio = !esSelection && precioAncla != null && Number.isFinite(kgN) && Math.round(kgN) !== Math.round(precioAncla);
  const pasaTope = esSelection && precioAncla != null && Number.isFinite(kgN) && kgN > precioAncla;
  const claseEfectiva: OfferKind = cambiaPrecio || precioAncla == null ? "excepcion" : clase;
  const faltaMotivo = claseEfectiva === "excepcion" && !notas.trim();
  const minN = num(minKg);
  const kgSelN = num(kgSelection);
  const listo =
    Number.isFinite(kgN) && kgN > 0 && !faltaMotivo && lugar.trim() !== "" && !pasaTope && (esSelection ? Number.isFinite(kgSelN) && kgSelN > 0 : Number.isFinite(minN) && minN > 0 && sacoOk);

  function elegirClase(k: OfferKind) {
    setClase(k);
    if (anclaje && (k === "temporada" || k === "directa")) setPrecioKg(miles(String(Math.round(k === "directa" ? anclaje.copKgDirecta : anclaje.copKg))));
  }

  function emitir() {
    setError(null);
    start(async () => {
      const fd = new FormData();
      if (claseEfectiva === "excepcion" || claseEfectiva === "directa") fd.set("price_per_kg", String(kgN));
      if (claseEfectiva === "directa") fd.set("quantity_kg", String(kgSelN));
      else {
        fd.set("min_kg", String(minN));
        fd.set("saco_kg", String(sacoN));
      }
      fd.set("lugar_entrega", lugar.trim());
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
          <span className={styles.meta} style={{ margin: "-4px 0 0" }}>
            El precio llega del PVC y la cantidad del mínimo del grado: puede cambiar las cifras de las cajas antes de emitir.
          </span>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {(["temporada", "directa"] as const).map((k) => (
              <label key={k} style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12.5, cursor: "pointer" }}>
                <input type="radio" name={`clase-${lotId}`} checked={clase === k} onChange={() => elegirClase(k)} disabled={!anclaje} />
                {k === "temporada" ? "Participe en Cherry Picked (PVC)" : "Compra CTCx Selection (hasta PVC − 8 %)"}
              </label>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8 }}>
            <Campo
              etiqueta="Precio por kg de CPS"
              prefijo="$"
              sufijo="COP / kg"
              valor={precioKg}
              onCambio={setPrecioKg}
              ayuda={
                precioAncla != null && Number.isFinite(kgN) && Math.round(kgN) !== Math.round(precioAncla) ? (
                  <>
                    {esSelection ? "Tope" : "PVC"}: {formatCop(precioAncla)}/kg ·{" "}
                    <button type="button" className={styles.enlaceBoton} onClick={() => setPrecioKg(miles(String(Math.round(precioAncla))))}>
                      volver a ese precio
                    </button>
                  </>
                ) : precioAncla != null ? (
                  esSelection ? "El tope (PVC − 8 %); puede proponer menos." : "El PVC del grado."
                ) : null
              }
            />
            <Campo
              etiqueta={`Precio por carga (${CARGA_KG} kg)`}
              prefijo="$"
              sufijo="COP / carga"
              valor={Number.isFinite(kgN) && kgN > 0 ? miles(String(Math.round(kgN * CARGA_KG))) : ""}
              onCambio={(v) => {
                const c = num(v);
                setPrecioKg(Number.isFinite(c) && c > 0 ? miles(String(Math.round(c / CARGA_KG))) : "");
              }}
              ayuda="Se mueve junto con el precio por kg."
            />
            {esSelection ? (
              <Campo
                etiqueta="Kilos de CPS que CTCx propone comprar"
                sufijo="kg de CPS"
                valor={kgSelection}
                onCambio={setKgSelection}
                ayuda={Number.isFinite(kgSelN) && kgSelN > 0 ? `${(kgSelN / CARGA_KG).toLocaleString("es-CO", { maximumFractionDigits: 2 })} cargas · total ${formatCop(kgSelN * (Number.isFinite(kgN) ? kgN : 0))}` : "Escriba los kilos: todo el lote o una parte."}
              />
            ) : (
              <Campo
                etiqueta="Cantidad mínima disponible de CPS"
                sufijo="kg de CPS"
                valor={minKg}
                onCambio={setMinKg}
                ayuda={
                  <>
                    {Number.isFinite(minN) && minN > 0 ? `${(minN / CARGA_KG).toLocaleString("es-CO", { maximumFractionDigits: 2 })} cargas` : "—"}
                    {anclaje?.minKg != null ? ` · el mínimo del grado es ${anclaje.minKg} kg (por ventana)` : ""}
                  </>
                }
              />
            )}
            {!esSelection && anclaje && (
              <Campo
                etiqueta={anclaje.saco.continuacion ? "Compra adelantada (renovación)" : "Saco que CTCx compra con la firma"}
                sufijo="kg de CPS"
                valor={saco}
                onCambio={setSaco}
                ayuda={
                  sacoOk
                    ? `${anclaje.saco.continuacion ? "Normalmente 10–20 kg; puede ser 0" : "Mínimo 70 kg (≈ 50 kg de verde)"}; hasta ${anclaje.saco.max} kg. Fuera de lo declarado${Number.isFinite(kgN) && sacoN > 0 ? ` · ${formatCop(sacoN * kgN)}` : ""}.`
                    : `Entre ${anclaje.saco.min} y ${anclaje.saco.max} kg: por encima ya es CTCx Selection.`
                }
              />
            )}
          </div>
          <label style={{ fontSize: 12, display: "grid", gap: 4, fontWeight: 600 }}>
            Condiciones de entrega
            <textarea className={styles.campoTexto} rows={2} value={lugar} onChange={(e) => setLugar(e.target.value)} />
          </label>
          {pasaTope && (
            <p className={styles.warn} style={{ margin: 0 }}>
              Una compra de CTCx Selection va hasta el PVC − 8 %: {formatCop(precioAncla!)}/kg como máximo.
            </p>
          )}
          {esSelection && !pasaTope && precioAncla != null && (
            <p className={styles.meta} style={{ margin: 0 }}>
              Tope PVC {anclaje!.code} − 8 %: {formatCop(precioAncla)}/kg. El productor ve que este precio NO es el PVC, puede aceptar, contraofertar o desistir; la
              negociación vuelve aquí (Abiertas).
            </p>
          )}
          {esSelection ? null : precioAncla != null ? (
            cambiaPrecio ? (
              <p className={styles.warn} style={{ margin: 0 }}>
                El precio se aparta del PVC ({formatCop(precioAncla)}/kg): la oferta sale como <b>excepción</b> y necesita su motivo abajo.
              </p>
            ) : (
              <p className={styles.meta} style={{ margin: 0 }}>
                PVC {anclaje!.code} · banda {anclaje!.banda} ×{anclaje!.mult} → {formatCop(precioAncla)}/kg. Si el lote es de la temporada pasada, se aplica −10 % al
                emitir. La invitación vence al terminar esta edición del PVC.{" "}
                {/* V5.175 (docs/PLAN_CICLOS.md §2): la fecha de FIRMA decide la ventana; esto es lo que tocaría hoy. */}
                {anclaje!.ventanaHoy.abierta ? (
                  <>
                    Si el productor firma hoy: ventana <b>{fechaLarga(anclaje!.ventanaHoy.desde)} → {fechaLarga(anclaje!.ventanaHoy.hasta)}</b> (
                    {anclaje!.ventanaHoy.tipo === "extendida" ? "extendida al ciclo siguiente" : "un ciclo"}), retiro libre {anclaje!.ventanaHoy.retiroLibrePct} %
                    {anclaje!.ventanaHoy.precio === "promedio" ? ", al promedio de este PVC y el siguiente" : ""}.
                  </>
                ) : (
                  <>
                    <b>Hoy no se firman contratos nuevos</b>: {anclaje!.ventanaHoy.motivo}
                    {anclaje!.ventanaHoy.reabre ? ` Se puede firmar desde el ${fechaLarga(anclaje!.ventanaHoy.reabre)}.` : ""} La oferta se puede emitir igual.
                  </>
                )}{" "}
                {anclaje!.siguiente ? (
                  <>
                    PVC siguiente ({anclaje!.siguiente.code}): {formatCop(anclaje!.siguiente.copKg)}/kg.
                  </>
                ) : (
                  <>El PVC siguiente se publica a más tardar el {anclaje!.fechaLimiteSiguiente ? fechaLarga(anclaje!.fechaLimiteSiguiente) : "—"}.</>
                )}
              </p>
            )
          ) : (
            <p className={styles.warn} style={{ margin: 0 }}>Sin edición del PVC vigente: la oferta sale como excepción, con motivo.</p>
          )}
          <textarea
            className={styles.campoTexto}
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
              {pasaTope ? "El precio supera el tope de PVC − 8 %." : faltaMotivo ? "Falta el motivo de la excepción." : esSelection ? "Falta el precio, los kilos o las condiciones de entrega." : "Falta el precio, la cantidad mínima o las condiciones de entrega."}
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
