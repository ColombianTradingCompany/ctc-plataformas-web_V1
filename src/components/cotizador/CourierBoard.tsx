"use client";

// ── ECP · Modelo Logístico · Cotizador Courier ───────────────────────────────────────────────────────
// Cuánto le cobra FedEx a CTCx por un envío de café (verde o tostado, < 100 kg): tarifa de lista de la
// guía vigente − descuentos del acuerdo + combustible de la semana. El cálculo corre en el servidor
// (`src/lib/courier/`): las tablas del acuerdo son CONFIDENCIALES y no viajan al navegador enteras.

import { useCallback, useEffect, useState } from "react";
import { actualizarCombustibleAhora, anotarCombustible, cotizarCourier, guardarCotizacionCourier, listarCotizacionesCourier, resumenCourier } from "@/lib/courier/actions";
import type { Cotizacion, Entrada, Pieza } from "@/lib/courier/calculo";
import type { CotizacionGuardada, ResumenCourier } from "@/lib/courier/types";
import styles from "@/components/panel/shared.module.css";
import table from "./quotesTable.module.css";

const usd = (v: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(v);
const day = (d: string) => new Date(`${d.slice(0, 10)}T12:00:00`).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
const hoy = () => new Date().toISOString().slice(0, 10);
const num = (s: string) => { const v = Number(String(s).replace(",", ".")); return Number.isFinite(v) ? v : 0; };

type PiezaForm = { kg: string; largo: string; ancho: string; alto: string };
const piezaVacia = (kg = ""): PiezaForm => ({ kg, largo: "", ancho: "", alto: "" });

export function CourierBoard() {
  const [resumen, setResumen] = useState<ResumenCourier | null | undefined>(undefined);
  const [guardadas, setGuardadas] = useState<CotizacionGuardada[]>([]);
  const [destino, setDestino] = useState("DE");
  const [fecha, setFecha] = useState(hoy());
  const [gasto, setGasto] = useState("");
  const [piezas, setPiezas] = useState<PiezaForm[]>([piezaVacia("25")]);
  const [res, setRes] = useState<Cotizacion | null>(null);
  const [abierta, setAbierta] = useState<string | null>(null);
  const [nota, setNota] = useState("");
  const [comb, setComb] = useState({ valor: "", desde: "", hasta: "", fuente: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    const [r, g] = await Promise.all([resumenCourier(), listarCotizacionesCourier()]);
    setResumen(r); setGuardadas(g ?? []);
  }, []);
  useEffect(() => {
    Promise.all([resumenCourier(), listarCotizacionesCourier()]).then(([r, g]) => { setResumen(r); setGuardadas(g ?? []); });
  }, []);

  const entrada = (): Entrada => ({
    destino, fechaEnvio: fecha, gastoAnualUsd: gasto.trim() ? num(gasto) : null,
    piezas: piezas.map((p): Pieza => ({ kg: num(p.kg), largoCm: num(p.largo) || null, anchoCm: num(p.ancho) || null, altoCm: num(p.alto) || null })),
  });

  async function cotizarAhora() {
    setBusy(true); setError(""); setMsg("");
    const c = await cotizarCourier(entrada());
    if (!c) setError("Tu sesión del ECP ya no está activa: vuelve a iniciar sesión.");
    setRes(c); setAbierta(null); setBusy(false);
  }

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>, okMsg: string) {
    setBusy(true); setError(""); setMsg("");
    const r = await fn();
    if (!r.ok) setError(r.error ?? "No se pudo.");
    else { setMsg(okMsg); await refresh(); }
    setBusy(false);
  }

  if (resumen === undefined) return <p className={styles.subtitle}>Cargando tarifas…</p>;
  if (resumen === null) return <p className={styles.warn}>Tu sesión del ECP ya no está activa: vuelve a iniciar sesión.</p>;

  const combVigente = resumen.combustible.find((c) => c.vigenteDesde <= fecha && (!c.vigenteHasta || fecha <= c.vigenteHasta));
  const enGracia = resumen.acuerdo?.finGracia ? fecha <= resumen.acuerdo.finGracia : false;
  const mejor = res?.opciones.find((o) => o.disponible) ?? null;

  return (
    <>
      <h1 className={styles.title}>Cotizador Courier · FedEx</h1>
      <p className={styles.subtitle}>
        Lo que FedEx le cobra a CTCx por un envío de café de menos de 100 kg: la tarifa de lista de la guía vigente,
        menos los descuentos del acuerdo, más el combustible de la semana. Costo para CTCx, sin margen. Los recargos
        especiales (manejo, zona remota, aranceles e impuestos en destino) no están incluidos.
      </p>

      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <span className={styles.kpiTop}><span className={styles.kpiK}>Guía de tarifas</span></span>
          <span className={styles.kpiV} style={{ display: "block" }}>{resumen.guia ? day(resumen.guia.vigenteDesde) : "—"}</span>
          <span className={styles.kpiSub}>{resumen.guia ? `${resumen.guia.filas} tarifas de exportación` : "sin guía cargada"}</span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiTop}><span className={styles.kpiK}>Acuerdo</span></span>
          <span className={styles.kpiV} style={{ display: "block" }}>{resumen.acuerdo ? day(resumen.acuerdo.vigenteDesde) : "—"}</span>
          <span className={styles.kpiSub}>
            {resumen.acuerdo ? (enGracia ? `periodo de gracia hasta ${day(resumen.acuerdo.finGracia!)}` : "descuento adquirido por escalón") : "sin acuerdo: precios de lista"}
          </span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiTop}><span className={styles.kpiK}>Combustible</span></span>
          <span className={styles.kpiV} style={{ display: "block" }}>{combVigente ? `${combVigente.valor} %` : "falta"}</span>
          <span className={styles.kpiSub}>{combVigente ? `semana desde ${day(combVigente.vigenteDesde)}` : "anótalo abajo para la fecha del envío"}</span>
        </div>
      </div>

      <div className={styles.card} style={{ marginTop: 18 }}>
        <div className={styles.sectionHead}><strong>El envío</strong></div>
        <div className={styles.formGrid}>
          <div className={styles.field} style={{ minWidth: 220 }}>
            <label htmlFor="c-dest">Destino</label>
            <select id="c-dest" value={destino} onChange={(e) => setDestino(e.target.value)}>
              {resumen.destinos.map((d) => <option key={d.clave} value={d.clave}>{d.pais} · zona {d.zona}</option>)}
            </select>
          </div>
          <div className={styles.field} style={{ minWidth: 150 }}>
            <label htmlFor="c-fecha">Fecha de envío</label>
            <input id="c-fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
          {!enGracia && (
            <div className={styles.field} style={{ minWidth: 200 }}>
              <label htmlFor="c-gasto">Gasto anualizado en FedEx (US$)</label>
              <input id="c-gasto" inputMode="decimal" placeholder="bruto, antes de descuentos" value={gasto} onChange={(e) => setGasto(e.target.value)} />
            </div>
          )}
        </div>

        <div className={table.scroll} style={{ marginTop: 12 }}>
          <table className={table.t}>
            <thead>
              <tr><th>Pieza</th><th className={table.r}>Peso (kg)</th><th className={table.r}>Largo (cm)</th><th className={table.r}>Ancho (cm)</th><th className={table.r}>Alto (cm)</th><th className={table.acts}></th></tr>
            </thead>
            <tbody>
              {piezas.map((p, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  {(["kg", "largo", "ancho", "alto"] as const).map((k) => (
                    <td key={k} className={table.r}>
                      <input aria-label={`${k} de la pieza ${i + 1}`} inputMode="decimal" style={{ width: 90, textAlign: "right" }} value={p[k]}
                        onChange={(e) => setPiezas(piezas.map((x, j) => (j === i ? { ...x, [k]: e.target.value } : x)))} />
                    </td>
                  ))}
                  <td className={table.acts}>
                    {piezas.length > 1 && <button className="btn btn-sm" type="button" onClick={() => setPiezas(piezas.filter((_, j) => j !== i))}>Quitar</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className={styles.meta}>
          Las medidas son opcionales: si el volumen (L×A×H / 5.000) pesa más que la caja, FedEx cobra el volumen.
          Una pieza de más de 68 kg ya no es paquete, es carga (Freight).
        </p>
        <div className={styles.actions} style={{ justifyContent: "flex-end", display: "flex", gap: 8 }}>
          <button className="btn btn-sm" type="button" onClick={() => setPiezas([...piezas, piezaVacia()])}>Añadir pieza</button>
          <button className="btn btn-sm btn-solid" type="button" disabled={busy} onClick={cotizarAhora}>Cotizar</button>
        </div>
        {error && <p className={styles.warn}>{error}</p>}
      </div>

      {res && (
        <div className={styles.card}>
          <div className={styles.sectionHead}>
            <strong>Resultado · {res.pais ?? "—"}{res.zona ? ` · zona ${res.zona}` : ""}</strong>
          </div>
          <p className={styles.meta}>
            Peso real {res.pesoRealKg} kg · volumétrico {res.pesoDimKg} kg · <strong>se cobra {res.pesoFacturableKg} kg</strong>
            {mejor && <> · la más barata: <strong>{mejor.etiqueta}, {usd(mejor.totalUsd)}</strong></>}
          </p>
          {res.avisos.map((a) => <p key={a} className={styles.warn}>{a}</p>)}

          <div className={table.scroll}>
            <table className={table.t}>
              <thead>
                <tr>
                  <th>Servicio</th><th className={table.r}>Lista</th><th className={table.r}>Descuento</th>
                  <th className={table.r}>Neta</th><th className={table.r}>Combustible</th><th className={table.r}>Total US$</th><th className={table.acts}></th>
                </tr>
              </thead>
              <tbody>
                {res.opciones.map((o) => {
                  const clave = `${o.servicio}:${o.embalaje}`;
                  return (
                    <tr key={clave}>
                      <td>
                        <span className={table.strong}>{o.etiqueta}</span>
                        {o === mejor && <span className={table.tag}>más barata</span>}
                        {!o.disponible && <small className={table.muted}>{o.motivo}</small>}
                        {o.avisos.map((a) => <small key={a} className={table.muted} style={{ display: "block" }}>⚠ {a}</small>)}
                      </td>
                      <td className={table.r}>{o.disponible ? usd(o.baseUsd) : "—"}</td>
                      <td className={table.r}>{o.disponible ? `${o.pctTotal} %` : "—"}</td>
                      <td className={table.r}>{o.disponible ? usd(o.netoUsd) : "—"}</td>
                      <td className={table.r}>{o.disponible ? usd(o.combustibleUsd) : "—"}</td>
                      <td className={table.r}><span className={table.strong}>{o.disponible ? usd(o.totalUsd) : "—"}</span></td>
                      <td className={table.acts}>
                        {o.disponible && (
                          <button className="btn btn-sm" type="button" aria-expanded={abierta === clave} onClick={() => setAbierta(abierta === clave ? null : clave)}>
                            {abierta === clave ? "Cerrar" : "Desglose"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {res.opciones.filter((o) => `${o.servicio}:${o.embalaje}` === abierta).map((o) => (
            <div key="desglose" className={table.scroll} style={{ marginTop: 12 }}>
              <table className={table.t}>
                <thead><tr><th>{o.etiqueta} · {o.pesoCobradoKg} kg</th><th className={table.r}>US$</th><th>Cómo sale</th><th>Fuente</th></tr></thead>
                <tbody>
                  {o.lineas.map((l, i) => (
                    <tr key={i}>
                      <td>{l.concepto}</td>
                      <td className={table.r}>{l.usd ? usd(l.usd) : ""}</td>
                      <td className={table.muted}>{l.detalle}</td>
                      <td className={table.muted}>{l.fuente}</td>
                    </tr>
                  ))}
                  <tr><td><span className={table.strong}>Total</span></td><td className={table.r}><span className={table.strong}>{usd(o.totalUsd)}</span></td><td /><td /></tr>
                </tbody>
              </table>
            </div>
          ))}

          {mejor && (
            <div className={styles.formGrid} style={{ marginTop: 12, justifyContent: "flex-end" }}>
              <div className={styles.field} style={{ flex: 1, minWidth: 220 }}>
                <label htmlFor="c-nota">Nota (para qué es este envío)</label>
                <input id="c-nota" placeholder="p. ej. muestras para tostador en Hamburgo" value={nota} onChange={(e) => setNota(e.target.value)} />
              </div>
              <button className="btn btn-sm btn-solid" type="button" disabled={busy}
                onClick={() => run(() => guardarCotizacionCourier(entrada(), abierta ?? `${mejor.servicio}:${mejor.embalaje}`, nota), "Cotización guardada.")}>
                Guardar cotización
              </button>
            </div>
          )}
          {msg && <p className={styles.meta}>{msg}</p>}
        </div>
      )}

      <div className={styles.card}>
        <div className={styles.sectionHead}>
          <strong>Recargo de combustible</strong>
          <span className={styles.actions}>
            <button className="btn btn-sm" type="button" disabled={busy}
              onClick={() => run(actualizarCombustibleAhora, "Recargo actualizado desde la EIA.")}>
              Actualizar ahora
            </button>
          </span>
        </div>
        <p className={styles.meta}>
          Se anota solo cada jueves: el precio semanal del queroseno de aviación (EIA, Costa del Golfo) pasa por la tabla
          de escalones de FedEx y da el % de la semana siguiente — el mismo cálculo que hace FedEx. Si FedEx publica otra
          cifra (fedex.com/es-co/shipping/surcharges.html), anótala a mano: lo anotado a mano nunca lo pisa el automático.
        </p>
        <form className={styles.formGrid} style={{ justifyContent: "flex-end" }}
          onSubmit={async (e) => {
            e.preventDefault();
            await run(() => anotarCombustible({ valor: num(comb.valor), vigenteDesde: comb.desde, vigenteHasta: comb.hasta || null, fuente: comb.fuente }), "Recargo anotado.");
            setComb({ valor: "", desde: "", hasta: "", fuente: "" });
          }}>
          <div className={styles.field} style={{ minWidth: 110 }}>
            <label htmlFor="f-val">Recargo (%)</label>
            <input id="f-val" inputMode="decimal" placeholder="41,00" value={comb.valor} onChange={(e) => setComb({ ...comb, valor: e.target.value })} required />
          </div>
          <div className={styles.field} style={{ minWidth: 150 }}>
            <label htmlFor="f-desde">Desde (lunes)</label>
            <input id="f-desde" type="date" value={comb.desde} onChange={(e) => setComb({ ...comb, desde: e.target.value })} required />
          </div>
          <div className={styles.field} style={{ minWidth: 150 }}>
            <label htmlFor="f-hasta">Hasta (domingo)</label>
            <input id="f-hasta" type="date" value={comb.hasta} onChange={(e) => setComb({ ...comb, hasta: e.target.value })} />
          </div>
          <div className={styles.field} style={{ flex: 1, minWidth: 180 }}>
            <label htmlFor="f-fuente">Fuente</label>
            <input id="f-fuente" placeholder="fedex.com · surcharges" value={comb.fuente} onChange={(e) => setComb({ ...comb, fuente: e.target.value })} />
          </div>
          <button className="btn btn-sm" type="submit" disabled={busy}>Anotar</button>
        </form>
        {resumen.combustible.length > 0 && (
          <p className={styles.meta}>
            Últimas semanas: {resumen.combustible.map((c) => `${c.valor} % (${day(c.vigenteDesde)}${c.automatico ? " · auto" : " · a mano"})`).join(" · ")}
          </p>
        )}
      </div>

      {guardadas.length > 0 && (
        <div className={table.scroll}>
          <table className={table.t}>
            <thead><tr><th>Fecha</th><th>Destino</th><th className={table.r}>Kg</th><th>Servicio</th><th className={table.r}>Total</th><th>Nota</th></tr></thead>
            <tbody>
              {guardadas.map((g) => (
                <tr key={g.id}>
                  <td>{day(g.createdAt)}</td>
                  <td>{g.destino}</td>
                  <td className={table.r}>{g.pesoFacturableKg}</td>
                  <td>{g.servicio ?? "—"}</td>
                  <td className={table.r}><span className={table.strong}>{g.totalUsd === null ? "—" : usd(g.totalUsd)}</span></td>
                  <td className={table.muted}>{g.nota ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
