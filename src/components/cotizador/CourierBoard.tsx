"use client";

// ── ECP · Modelo Logístico · Cotizador Courier ───────────────────────────────────────────────────────
// Cuánto le cobra FedEx a CTCx por un envío de café (verde o tostado, < 100 kg): tarifa de lista de la
// guía vigente − descuentos del acuerdo + combustible de la semana. El cálculo corre en el servidor
// (`src/lib/courier/`): las tablas del acuerdo son CONFIDENCIALES y no viajan al navegador enteras.

import { useEffect, useState } from "react";
import {
  abrirCotizacionCourier, actualizarCombustibleAhora, anotarCombustible, borrarCombustible, cotizarCourier,
  guardarCotizacionCourier, listarCotizacionesCourier, resumenCourier,
} from "@/lib/courier/actions";
import { pesoDimensional, type Cotizacion, type Entrada, type Pieza } from "@/lib/courier/calculo";
import type { CotizacionAbierta, CotizacionGuardada, ResumenCourier } from "@/lib/courier/types";
import styles from "@/components/panel/shared.module.css";
import table from "./quotesTable.module.css";
import c from "./courier.module.css";

const FEDEX_RECARGOS = "https://www.fedex.com/es-co/shipping/surcharges.html";
const EIA_SERIE = "https://www.eia.gov/dnav/pet/hist/LeafHandler.ashx?n=PET&s=EER_EPJK_PF4_RGC_DPG&f=W";

const usd = (v: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(v);
const day = (d: string) => new Date(`${d.slice(0, 10)}T12:00:00`).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
const hoy = () => new Date().toISOString().slice(0, 10);
const num = (s: string) => { const v = Number(String(s).replace(",", ".")); return Number.isFinite(v) ? v : 0; };
const kg = (v: number) => new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 }).format(v);

type PiezaForm = { kg: string; largo: string; ancho: string; alto: string };
const piezaVacia = (k = ""): PiezaForm => ({ kg: k, largo: "", ancho: "", alto: "" });
const aForm = (p: Pieza): PiezaForm => ({ kg: String(p.kg ?? ""), largo: p.largoCm ? String(p.largoCm) : "", ancho: p.anchoCm ? String(p.anchoCm) : "", alto: p.altoCm ? String(p.altoCm) : "" });
type Donde = "envio" | "resultado" | "combustible" | "guardadas";
type Aviso = { donde: Donde; texto: string; error: boolean } | null;
type Punto = ResumenCourier["combustible"][number];

/** El historial del recargo, semana a semana. SVG a mano: es una escalera y una retícula. */
function GraficaCombustible({ puntos }: { puntos: Punto[] }) {
  const serie = [...puntos].sort((a, b) => a.vigenteDesde.localeCompare(b.vigenteDesde));
  if (!serie.length) return <p className={c.nota}>Aún no hay semanas anotadas.</p>;
  const W = 760, H = 200, pl = 44, pr = 16, pt = 14, pb = 30;
  const t = (d: string) => new Date(`${d}T12:00:00Z`).getTime();
  const xs = serie.map((p) => t(p.vigenteDesde));
  const x0 = Math.min(...xs), x1 = Math.max(...xs, x0 + 7 * 864e5);
  const vs = serie.map((p) => p.valor);
  const y0 = Math.floor(Math.min(...vs) - 1), y1 = Math.ceil(Math.max(...vs) + 1);
  const sx = (v: number) => pl + ((v - x0) / (x1 - x0 || 1)) * (W - pl - pr);
  const sy = (v: number) => H - pb - ((v - y0) / (y1 - y0 || 1)) * (H - pt - pb);
  let d = "";
  serie.forEach((p, i) => { const x = sx(xs[i]), y = sy(p.valor); d += i ? ` H${x.toFixed(1)} V${y.toFixed(1)}` : `M${x.toFixed(1)},${y.toFixed(1)}`; });
  d += ` H${(sx(xs.at(-1)!) + 18).toFixed(1)}`;
  const marcas = [y0, (y0 + y1) / 2, y1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={c.grafica} role="img" aria-label="Recargo de combustible por semana">
      {marcas.map((m) => (
        <g key={m}>
          <line x1={pl} x2={W - pr} y1={sy(m)} y2={sy(m)} stroke="currentColor" strokeOpacity=".1" />
          <text x={pl - 6} y={sy(m) + 4} fontSize="10.5" textAnchor="end" fill="currentColor" fillOpacity=".6">{m.toFixed(1)} %</text>
        </g>
      ))}
      <path d={d} fill="none" stroke="#3c0a86" strokeWidth="2" />
      {serie.map((p, i) => (
        <circle key={`${p.vigenteDesde}-${i}`} cx={sx(xs[i])} cy={sy(p.valor)} r="4.5" fill={p.automatico ? "#3c0a86" : "#d97706"} stroke="#fff" strokeWidth="1.5">
          <title>{`${day(p.vigenteDesde)}${p.vigenteHasta ? ` → ${day(p.vigenteHasta)}` : ""}: ${p.valor} % · ${p.automatico ? "automático" : "a mano"}\n${p.fuente}`}</title>
        </circle>
      ))}
      <text x={pl} y={H - 8} fontSize="10.5" fill="currentColor" fillOpacity=".6">{day(serie[0].vigenteDesde)}</text>
      <text x={W - pr} y={H - 8} fontSize="10.5" textAnchor="end" fill="currentColor" fillOpacity=".6">{day(serie.at(-1)!.vigenteDesde)}</text>
    </svg>
  );
}

export function CourierBoard() {
  const [resumen, setResumen] = useState<ResumenCourier | null | undefined>(undefined);
  const [guardadas, setGuardadas] = useState<CotizacionGuardada[]>([]);
  const [destino, setDestino] = useState("DE");
  const [fecha, setFecha] = useState(hoy());
  const [gasto, setGasto] = useState("");
  const [piezas, setPiezas] = useState<PiezaForm[]>([piezaVacia("25")]);
  const [res, setRes] = useState<Cotizacion | null>(null);
  const [abiertaDe, setAbiertaDe] = useState<CotizacionAbierta | null>(null);
  const [desglose, setDesglose] = useState<string | null>(null);
  const [nota, setNota] = useState("");
  const [comb, setComb] = useState({ valor: "", desde: "", hasta: "", fuente: "" });
  const [busy, setBusy] = useState(false);
  const [aviso, setAviso] = useState<Aviso>(null);

  const cargar = () => Promise.all([resumenCourier(), listarCotizacionesCourier()]).then(([r, g]) => { setResumen(r); setGuardadas(g ?? []); });
  useEffect(() => {
    Promise.all([resumenCourier(), listarCotizacionesCourier()]).then(([r, g]) => { setResumen(r); setGuardadas(g ?? []); });
  }, []);

  const entrada = (): Entrada => ({
    destino, fechaEnvio: fecha, gastoAnualUsd: gasto.trim() ? num(gasto) : null,
    piezas: piezas.map((p): Pieza => ({ kg: num(p.kg), largoCm: num(p.largo) || null, anchoCm: num(p.ancho) || null, altoCm: num(p.alto) || null })),
  });

  async function cotizarAhora() {
    setBusy(true); setAviso(null); setAbiertaDe(null);
    const r = await cotizarCourier(entrada());
    if (!r) setAviso({ donde: "envio", texto: "Tu sesión del ECP ya no está activa: vuelve a iniciar sesión.", error: true });
    setRes(r); setDesglose(null); setBusy(false);
  }

  async function run(donde: Donde, fn: () => Promise<{ ok: boolean; error?: string; mensaje?: string }>, okMsg: string) {
    setBusy(true); setAviso(null);
    const r = await fn();
    setAviso(r.ok ? { donde, texto: r.mensaje ?? okMsg, error: false } : { donde, texto: r.error ?? "No se pudo.", error: true });
    if (r.ok) await cargar();
    setBusy(false);
  }

  async function abrir(id: string) {
    setBusy(true); setAviso(null);
    const a = await abrirCotizacionCourier(id);
    setBusy(false);
    if (!a) { setAviso({ donde: "guardadas", texto: "No se pudo abrir esa cotización.", error: true }); return; }
    setDestino(a.entradas.destino); setFecha(a.entradas.fechaEnvio);
    setGasto(a.entradas.gastoAnualUsd != null ? String(a.entradas.gastoAnualUsd) : "");
    setPiezas(a.entradas.piezas.map(aForm)); setNota(a.nota ?? "");
    setRes(a.snapshot); setAbiertaDe(a); setDesglose(a.servicio);
    setTimeout(() => document.getElementById("courier-resultado")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  }

  const mensaje = (donde: Donde) =>
    aviso?.donde === donde ? <p className={aviso.error ? c.error : c.ok} role="status">{aviso.texto}</p> : null;

  if (resumen === undefined) return <p className={styles.subtitle}>Cargando tarifas…</p>;
  if (resumen === null) return <p className={styles.warn}>Tu sesión del ECP ya no está activa: vuelve a iniciar sesión.</p>;

  const combVigente = resumen.combustible.find((x) => x.vigenteDesde <= fecha && (!x.vigenteHasta || fecha <= x.vigenteHasta));
  const combUltimo = resumen.combustible.find((x) => x.vigenteDesde <= fecha);
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
          <span className={styles.kpiTop}><span className={styles.kpiK}>Combustible para el {day(fecha)}</span></span>
          <span className={styles.kpiV} style={{ display: "block" }}>
            {combVigente ? `${combVigente.valor} %` : combUltimo ? `${combUltimo.valor} %*` : "falta"}
          </span>
          <span className={styles.kpiSub}>
            {combVigente ? `semana desde ${day(combVigente.vigenteDesde)} · ${combVigente.automatico ? "automático" : "a mano"}`
              : combUltimo ? `* provisional: esa semana aún no está publicada (última: ${day(combUltimo.vigenteDesde)})` : "no hay ninguno anotado"}
          </span>
        </div>
      </div>

      <section className={c.panel}>
        <div className={c.head}><h2>El envío</h2></div>
        <div className={c.campos}>
          <div className={c.campo}>
            <label htmlFor="c-dest">Destino</label>
            <select id="c-dest" value={destino} onChange={(e) => setDestino(e.target.value)}>
              {resumen.destinos.map((d) => <option key={d.clave} value={d.clave}>{d.pais} · zona {d.zona}</option>)}
            </select>
          </div>
          <div className={c.campo}>
            <label htmlFor="c-fecha">Fecha de envío</label>
            <input id="c-fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            <small>Decide la tarifa, el descuento y el combustible que aplican.</small>
          </div>
          {!enGracia && (
            <div className={c.campo}>
              <label htmlFor="c-gasto">Gasto anualizado en FedEx (US$)</label>
              <input id="c-gasto" inputMode="decimal" placeholder="bruto, antes de descuentos" value={gasto} onChange={(e) => setGasto(e.target.value)} />
            </div>
          )}
        </div>

        <div className={c.piezas}>
          <div className={`${c.fila} ${c.cabecera}`}>
            <span>Pieza</span><span>Peso real (kg)</span><span>Largo (cm)</span><span>Ancho (cm)</span><span>Alto (cm)</span><span />
          </div>
          {piezas.map((p, i) => {
            const dim = pesoDimensional({ kg: 0, largoCm: num(p.largo), anchoCm: num(p.ancho), altoCm: num(p.alto) });
            return (
              <div key={i} className={c.fila}>
                <span className={c.num}>{i + 1}</span>
                {(["kg", "largo", "ancho", "alto"] as const).map((k) => (
                  <input key={k} aria-label={`${k} de la pieza ${i + 1}`} placeholder={k === "kg" ? "kg" : `${k} cm`} inputMode="decimal" value={p[k]}
                    onChange={(e) => setPiezas(piezas.map((x, j) => (j === i ? { ...x, [k]: e.target.value } : x)))} />
                ))}
                <span>{piezas.length > 1 && <button className="btn btn-sm" type="button" onClick={() => setPiezas(piezas.filter((_, j) => j !== i))}>Quitar</button>}</span>
                {dim > 0 && (
                  <span className={c.volumen}>
                    Volumétrico: {kg(dim)} kg{dim > num(p.kg) ? " — pesa más que el real: FedEx cobrará el volumen" : " — manda el peso real"}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <p className={c.nota}>
          Las medidas son opcionales: el volumen (L×A×H / 5.000) se cobra si pesa más que la caja. Una pieza de más de 68 kg
          reales, de más de 274 cm de largo o de más de 330 cm de largo + contorno ya no es paquete: es carga (Freight).
        </p>
        {mensaje("envio")}
        <div className={c.botones}>
          <button className="btn btn-sm" type="button" onClick={() => setPiezas([...piezas, piezaVacia()])}>Añadir pieza</button>
          <button className="btn btn-sm btn-solid" type="button" disabled={busy} onClick={cotizarAhora}>Cotizar</button>
        </div>
      </section>

      {res && (
        <section className={c.panel} id="courier-resultado">
          {abiertaDe && (
            <div className={c.congelada}>
              <span>
                <strong>Cotización guardada</strong> el {day(abiertaDe.createdAt)}{abiertaDe.nota ? ` · «${abiertaDe.nota}»` : ""} — se muestra tal
                como quedó ese día. Arriba están sus datos, listos para recotizar con las tarifas de hoy.
              </span>
              <span className={c.botones} style={{ marginTop: 0 }}>
                <button className="btn btn-sm" type="button" onClick={() => { setAbiertaDe(null); setRes(null); }}>Cerrar</button>
                <button className="btn btn-sm btn-solid" type="button" disabled={busy} onClick={cotizarAhora}>Recotizar con tarifas de hoy</button>
              </span>
            </div>
          )}
          <div className={c.head}><h2>Resultado · {res.pais ?? "—"}{res.zona ? ` · zona ${res.zona}` : ""}</h2></div>
          <p className={c.resumenPeso}>
            Peso real <strong>{kg(res.pesoRealKg)} kg</strong> · volumétrico {kg(res.pesoDimKg)} kg · se cobran <strong>{kg(res.pesoFacturableKg)} kg</strong>
            {mejor && <> · la más barata: <strong>{mejor.etiqueta}, {usd(mejor.totalUsd)}</strong></>}
          </p>
          {res.avisos.map((a) => <p key={a} className={c.aviso}>{a}</p>)}

          <div className={table.scroll} style={{ marginTop: 10 }}>
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
                        {abiertaDe?.servicio === clave && <span className={table.tag}>la elegida</span>}
                        {!o.disponible && <small className={table.muted}>{o.motivo}</small>}
                        {o.avisos.filter((a) => !a.startsWith("Combustible provisional")).map((a) => <small key={a} className={table.muted} style={{ display: "block" }}>⚠ {a}</small>)}
                      </td>
                      <td className={table.r}>{o.disponible ? usd(o.baseUsd) : "—"}</td>
                      <td className={table.r}>{o.disponible ? `${o.pctTotal} %` : "—"}</td>
                      <td className={table.r}>{o.disponible ? usd(o.netoUsd) : "—"}</td>
                      <td className={table.r}>{o.disponible ? <>{usd(o.combustibleUsd)}{o.combustiblePct !== null && <small>{o.combustiblePct} %</small>}</> : "—"}</td>
                      <td className={table.r}><span className={table.strong}>{o.disponible ? usd(o.totalUsd) : "—"}</span></td>
                      <td className={table.acts}>
                        {o.disponible && (
                          <button className="btn btn-sm" type="button" aria-expanded={desglose === clave} onClick={() => setDesglose(desglose === clave ? null : clave)}>
                            {desglose === clave ? "Cerrar" : "Desglose"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {res.opciones.filter((o) => `${o.servicio}:${o.embalaje}` === desglose).map((o) => (
            <div key="desglose" className={table.scroll} style={{ marginTop: 12 }}>
              <table className={table.t}>
                <thead><tr><th>{o.etiqueta} · {kg(o.pesoCobradoKg)} kg</th><th className={table.r}>US$</th><th>Cómo sale</th><th>Fuente</th></tr></thead>
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

          {mejor && !abiertaDe && (
            <>
              <div className={c.campos} style={{ marginTop: 16, marginBottom: 0 }}>
                <div className={c.campo}>
                  <label htmlFor="c-nota">Nota (para qué es este envío)</label>
                  <input id="c-nota" placeholder="p. ej. muestras para tostador en Hamburgo" value={nota} onChange={(e) => setNota(e.target.value)} />
                  <small>Se guarda {desglose ? "la opción abierta en el desglose" : "la más barata"}; ábrelo en otra para guardar esa.</small>
                </div>
              </div>
              {mensaje("resultado")}
              <div className={c.botones}>
                <button className="btn btn-sm btn-solid" type="button" disabled={busy}
                  onClick={() => run("resultado", () => guardarCotizacionCourier(entrada(), desglose ?? `${mejor.servicio}:${mejor.embalaje}`, nota), "Cotización guardada: está abajo, en «Cotizaciones guardadas».")}>
                  Guardar cotización
                </button>
              </div>
            </>
          )}
        </section>
      )}

      <section className={c.panel}>
        <div className={c.head}>
          <h2>Recargo de combustible</h2>
          <small>{resumen.combustible.length} semanas anotadas</small>
        </div>
        <GraficaCombustible puntos={resumen.combustible} />
        <div className={c.leyenda}>
          <span><span className={c.punto} style={{ background: "#3c0a86" }} />automático (cron de los jueves)</span>
          <span><span className={c.punto} style={{ background: "#d97706" }} />anotado a mano</span>
          <span>Pasa el cursor por un punto para ver su semana y su fuente.</span>
        </div>
        {resumen.combustible.length > 0 && (
          <details className={c.semanas}>
            <summary>Semanas anotadas ({resumen.combustible.length}) — ver, corregir o borrar</summary>
            <div className={table.scroll} style={{ marginTop: 10 }}>
              <table className={table.t}>
                <thead>
                  <tr><th>Desde</th><th>Hasta</th><th className={table.r}>Recargo</th><th>Origen</th><th>Fuente</th><th className={table.acts}></th></tr>
                </thead>
                <tbody>
                  {resumen.combustible.map((w) => (
                    <tr key={w.id}>
                      <td>{day(w.vigenteDesde)}</td>
                      <td>{w.vigenteHasta ? day(w.vigenteHasta) : "—"}</td>
                      <td className={table.r}><span className={table.strong}>{w.valor} %</span></td>
                      <td>{w.automatico ? <span className={table.tag}>auto</span> : "a mano"}</td>
                      <td className={table.muted}>{w.fuente}</td>
                      <td className={table.acts}>
                        <button className="btn btn-sm" type="button" disabled={busy}
                          onClick={() => {
                            if (!window.confirm(`¿Borrar el recargo de la semana del ${day(w.vigenteDesde)} (${w.valor} %)?${w.automatico ? "\n\nEs automático: si la EIA aún trae esa semana, el cron del jueves lo vuelve a anotar." : ""}`)) return;
                            void run("combustible", () => borrarCombustible(w.id), "Semana borrada.");
                          }}>
                          Borrar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}
        <div className={c.enlaces}>
          <a href={FEDEX_RECARGOS} target="_blank" rel="noopener noreferrer">FedEx · recargos de envío (tabla semanal) ↗</a>
          <a href={EIA_SERIE} target="_blank" rel="noopener noreferrer">EIA · precio semanal del queroseno de aviación USGC ↗</a>
        </div>
        <p className={c.nota}>
          Se anota solo cada jueves: el precio semanal de la EIA pasa por la tabla de escalones de FedEx y da el % de la
          semana siguiente — el mismo cálculo que hace FedEx. Si FedEx publica otra cifra, anótala a mano: lo anotado a mano
          nunca lo pisa el automático. Si la semana del envío aún no está publicada, la cotización usa la última conocida y
          lo marca como provisional.
        </p>
        <form className={c.combForm} style={{ marginTop: 14 }}
          onSubmit={async (e) => {
            e.preventDefault();
            await run("combustible", () => anotarCombustible({ valor: num(comb.valor), vigenteDesde: comb.desde, vigenteHasta: comb.hasta || null, fuente: comb.fuente }), "Recargo anotado.");
            setComb({ valor: "", desde: "", hasta: "", fuente: "" });
          }}>
          <div className={c.campo}>
            <label htmlFor="f-val">Recargo (%)</label>
            <input id="f-val" inputMode="decimal" placeholder="41,00" value={comb.valor} onChange={(e) => setComb({ ...comb, valor: e.target.value })} required />
          </div>
          <div className={c.campo}>
            <label htmlFor="f-desde">Desde (lunes)</label>
            <input id="f-desde" type="date" value={comb.desde} onChange={(e) => setComb({ ...comb, desde: e.target.value })} required />
          </div>
          <div className={c.campo}>
            <label htmlFor="f-hasta">Hasta (domingo)</label>
            <input id="f-hasta" type="date" value={comb.hasta} onChange={(e) => setComb({ ...comb, hasta: e.target.value })} />
          </div>
          <div className={c.campo}>
            <label htmlFor="f-fuente">Fuente</label>
            <input id="f-fuente" placeholder="fedex.com · surcharges" value={comb.fuente} onChange={(e) => setComb({ ...comb, fuente: e.target.value })} />
          </div>
          <div className={c.botones} style={{ gridColumn: "1 / -1", marginTop: 0 }}>
            <button className="btn btn-sm" type="button" disabled={busy} onClick={() => run("combustible", actualizarCombustibleAhora, "Recargo actualizado desde la EIA.")}>
              {busy ? "Consultando…" : "Actualizar ahora desde la EIA"}
            </button>
            <button className="btn btn-sm btn-solid" type="submit" disabled={busy}>Anotar a mano</button>
          </div>
        </form>
        {mensaje("combustible")}
      </section>

      <section className={c.panel}>
        <div className={c.head}><h2>Cotizaciones guardadas</h2><small>{guardadas.length ? "se abren tal como quedaron" : "aún no hay"}</small></div>
        {mensaje("guardadas")}
        {guardadas.length > 0 && (
          <div className={table.scroll}>
            <table className={table.t}>
              <thead>
                <tr>
                  <th>Guardada</th><th>Destino</th><th>Envío</th><th className={table.r}>Peso</th><th>Servicio</th>
                  <th className={table.r}>Total</th><th>Nota</th><th className={table.acts}></th>
                </tr>
              </thead>
              <tbody>
                {guardadas.map((g) => (
                  <tr key={g.id}>
                    <td>{day(g.createdAt)}</td>
                    <td>{g.pais ?? g.destino}</td>
                    <td>{g.fechaEnvio ? day(g.fechaEnvio) : "—"}</td>
                    <td className={table.r}>
                      <span className={table.strong}>{g.pesoRealKg !== null ? `${kg(g.pesoRealKg)} kg` : "—"}</span>
                      {g.pesoRealKg !== g.pesoFacturableKg && <small>se cobran {kg(g.pesoFacturableKg)} kg</small>}
                    </td>
                    <td>{g.servicioEtiqueta ?? g.servicio ?? "—"}</td>
                    <td className={table.r}><span className={table.strong}>{g.totalUsd === null ? "—" : usd(g.totalUsd)}</span></td>
                    <td className={table.muted}>{g.nota ?? "—"}</td>
                    <td className={table.acts}>
                      <button className="btn btn-sm" type="button" disabled={busy} onClick={() => abrir(g.id)}>Abrir</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
