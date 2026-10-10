"use client";

// ── OCP · Stock CTCx · el linaje (V5.195) ──────────────────────────────────────────────────────────────────────────────────────
// El owner, 2026-10-09: el café de CTCx «debe poder moverse de estado "Pergamino", "Verde", "Tostado" y "Empacado" (adjunto), de
// tal manera que pueda saber qué viene de dónde de manera visual (hazlo interactivo e intuitivo…)». El adjunto: cuatro columnas con
// cajas unidas por curvas. Aquí, una FAMILIA por raíz (el café tal como entró): sus partidas en la columna de su estado, una curva
// de cada madre a cada hija; pasar el cursor por una caja enciende su camino (de dónde viene, a dónde fue) y un clic abre la partida
// con lo que se le puede hacer. Debajo de cada familia, el cuadre: cada kilo de la raíz en una cubeta.
//
// Las cuentas son las de `src/lib/stock/linaje.ts` (las mismas que la base). Las curvas se dibujan midiendo las cajas: se miden en el
// callback de un ResizeObserver (que también avisa al empezar a observar), nunca con un setState directo en el efecto.
//
// V5.203 (owner, 2026-10-10): el disponible resta también lo declarado vivo en el Triage (como `stock_disponible`, hueco H1) y la
// partida lo dice —«En el Catálogo Activo: N kg (CF-…) → Triage»—; la raíz que viene de una compra enlaza a su fila en Adquisición.

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ESTADOS, ESTADO_INFO, ORIGEN_LABEL, SALIDAS_A_MANO, SALIDA_LABEL, TRANSFORMACIONES, caminoDe, equivalenteEnRaiz,
  declaracionesDe, erroresDeTransformacion, faltaPorCuadrar, familias, fmtCop, fmtKg, movimientosDe, previaDeTransformacion, propuestaDeTransformacion,
  transformacionesDesde, type ContenidoDePartida, type Cuadre, type EstadoDePartida, type Familia, type Partida, type TipoDeTransformacion,
} from "@/lib/stock/linaje";
import type { StockCargado } from "@/lib/stock/servidor";
import { rutaDeLaCompra } from "@/lib/compras/adquisicion";
import { VITRINA_SEGUN_DESTINO } from "@/lib/compras/selection";
import {
  anularIngreso, anularSalida, anularTransformacion, ingresarAlStock, registrarSalida, transformarPartida, ubicarPartida,
} from "../stockActions";
import shared from "@/components/panel/shared.module.css";
import s from "./stock.module.css";

export type LoteOpcion = { id: string; name: string; finca: string | null };

const conColor = (c: string) => ({ ["--c" as string]: c }) as React.CSSProperties;
const fecha = (iso: string | null | undefined) => (iso ? new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" }) : "—");

/** «5.000» (miles a la colombiana), «3141,36», «0.5». */
function num(v: string): number {
  let t = String(v ?? "").trim().replace(/[\s$]/g, "");
  t = /^[1-9]\d{0,2}(\.\d{3})+(,\d+)?$/.test(t) ? t.replace(/\./g, "").replace(",", ".") : t.replace(",", ".");
  const x = Number(t);
  return Number.isFinite(x) ? x : NaN;
}
/** Un número para una casilla, con COMA decimal: «98.765» se leería como 98 765 (el punto es de miles en `num`). */
const str = (n: number) => (Number.isFinite(n) ? String(Math.round(n * 1000) / 1000).replace(".", ",") : "");

export function LinajeBoard({ stock, lotes, partidaInicial }: { stock: StockCargado; lotes: LoteOpcion[]; partidaInicial: string | null }) {
  const router = useRouter();
  const fams = useMemo(() => familias(stock), [stock]);
  const porId = useMemo(() => new Map(stock.partidas.map((p) => [p.id, p])), [stock]);
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState<"" | EstadoDePartida>("");
  const [verAgotadas, setVerAgotadas] = useState(false);
  const [elegida, setElegida] = useState<string | null>(partidaInicial);
  const [hover, setHover] = useState<string | null>(null);
  const [ingreso, setIngreso] = useState(false);

  useEffect(() => {
    if (partidaInicial) document.getElementById(`partida-${partidaInicial}`)?.scrollIntoView({ block: "center" });
  }, [partidaInicial]);

  const totales = useMemo(() => {
    const t = { pergamino: 0, verde: 0, tostado: 0, empacado: 0 } as Record<EstadoDePartida, number>;
    for (const f of fams) for (const e of ESTADOS) t[e] += f.disponiblePorEstado[e];
    return t;
  }, [fams]);

  const texto = q.trim().toLowerCase();
  const visibles = fams.filter((f) => {
    if (!verAgotadas && f.agotada && !f.partidas.some((p) => p.id === elegida)) return false;
    if (estado && !(f.disponiblePorEstado[estado] > 0)) return false;
    if (!texto) return true;
    const lote = f.raiz.lotId ? stock.lotes[f.raiz.lotId] : null;
    return [lote?.name, lote?.producerName, lote?.fincaName, lote?.publicCode, f.raiz.origenTexto, ...f.partidas.map((p) => p.codigo)].some((x) => x?.toLowerCase().includes(texto));
  });
  const agotadas = fams.filter((f) => f.agotada).length;
  const partidaElegida = elegida ? porId.get(elegida) ?? null : null;
  const refrescar = () => router.refresh();

  return (
    <>
      <h1 className={shared.title}>Stock CTCx</h1>
      <p className={shared.subtitle}>
        El café que está físicamente en CTCx —recibido de un trato, comprado en firme o ingresado a mano—, en partidas de pergamino, verde,
        tostado o empacado. Cada familia es el café tal como entró y todo lo que salió de él: pase el cursor por una caja para ver de dónde
        viene y a dónde fue, y haga clic para trillarla, tostarla, empacarla o darle salida. Lo comprado llega desde{" "}
        <Link href="/ocp/compras">Adquisición de Stock Café</Link>; lo libre se declara en el <Link href="/ocp/contratos">Triage de Catálogo Activo</Link>.
        Las muestras del circuito siguen en <Link href="/ocp/muestras">Gestión de Muestras</Link>.
      </p>

      <div className={s.kpis}>
        {ESTADOS.map((e) => (
          <div key={e} className={s.kpi} style={conColor(ESTADO_INFO[e].color)}>
            <span>{ESTADO_INFO[e].nombre} disponible</span>
            <b>{fmtKg(Math.round(totales[e] * 1000) / 1000)} kg</b>
          </div>
        ))}
        <div className={s.kpi}>
          <span>Familias</span>
          <b>{fams.length - agotadas}</b>
          <span>{agotadas ? `${agotadas} agotada${agotadas === 1 ? "" : "s"}` : "con café en la bodega"}</span>
        </div>
      </div>

      <div className={s.barraFiltros}>
        <input type="search" placeholder="Buscar lote, productor, código SX-…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar en el stock" />
        <select value={estado} onChange={(e) => setEstado(e.target.value as "" | EstadoDePartida)} aria-label="Con disponible en">
          <option value="">Con disponible en cualquier estado</option>
          {ESTADOS.map((e) => (
            <option key={e} value={e}>Con {ESTADO_INFO[e].nombre.toLowerCase()} disponible</option>
          ))}
        </select>
        <label>
          <input type="checkbox" checked={verAgotadas} onChange={(e) => setVerAgotadas(e.target.checked)} /> Ver las agotadas
        </label>
        <button className="btn btn-sm" type="button" onClick={() => setIngreso(!ingreso)} aria-expanded={ingreso}>
          {ingreso ? "Cerrar el ingreso" : "Ingresar café a mano"}
        </button>
      </div>

      {ingreso && <IngresoForm lotes={lotes} onListo={() => { setIngreso(false); refrescar(); }} />}

      {visibles.length === 0 ? (
        <p className={s.vacio}>
          {fams.length === 0
            ? "Todavía no hay café en el Stock CTCx. Entra solo al recibir un despacho de un trato, al pagar el mes de una compra en firme o al registrar una compra que ya llegó; o a mano, arriba."
            : "Nada coincide con el filtro."}
        </p>
      ) : (
        visibles.map((f) => (
          <FamiliaCard key={f.raiz.id} familia={f} stock={stock} elegida={elegida} hover={hover} onElegir={setElegida} onHover={setHover} />
        ))
      )}

      {partidaElegida && <PanelDePartida key={partidaElegida.id} partida={partidaElegida} stock={stock} onCerrar={() => setElegida(null)} onElegir={setElegida} onCambio={refrescar} />}
    </>
  );
}

// ── Una familia ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
function FamiliaCard({ familia, stock, elegida, hover, onElegir, onHover }: {
  familia: Familia; stock: StockCargado; elegida: string | null; hover: string | null; onElegir: (id: string) => void; onHover: (id: string | null) => void;
}) {
  const raiz = familia.raiz;
  const lote = raiz.lotId ? stock.lotes[raiz.lotId] : null;
  const origen = stock.origenes[raiz.id];
  const ids = useMemo(() => new Set(familia.partidas.map((p) => p.id)), [familia]);
  const activo = hover && ids.has(hover) ? hover : elegida && ids.has(elegida) ? elegida : null;
  const camino = useMemo(() => (activo ? caminoDe(activo, familia.aristas) : null), [activo, familia.aristas]);
  const restoPorEstado = familia.cuadre.enEstado;
  return (
    <section className={`${s.familia} ${familia.agotada ? s.familiaAgotada : ""}`} aria-label={`Familia de ${raiz.codigo}`}>
      <div className={s.familiaHead}>
        <h3>
          {lote ? <Link href={`/ocp/kr?lote=${lote.id}`}>{lote.name}</Link> : raiz.origenTexto ?? "Sin lote"}
          {raiz.comprometido && <span className={s.etiqueta} title="Vendido a nombre del productor: no surte kits ni se declara al catálogo">comprometido</span>}
        </h3>
        <small>
          {lote ? `${lote.producerName}${lote.fincaName ? ` · ${lote.fincaName}` : ""} · ` : ""}
          {origen?.etiqueta ?? origen?.tipo ?? ORIGEN_LABEL[raiz.origen]}
          {origen?.detalle && origen.clase === "despacho" ? ` (${origen.detalle})` : ""}
          {origen?.compraId && <> · <Link href={rutaDeLaCompra(origen.compraId)}>su compra</Link></>}
          {origen?.contractId && <> · <Link href={`/ocp/contratos/${origen.contractId}`}>contrato</Link></>} · entró {fmtKg(raiz.kg)} kg de {ESTADO_INFO[raiz.estado].nombre.toLowerCase()} el {fecha(raiz.createdAt)}
        </small>
      </div>
      <div className={s.desplazable}>
        <div className={s.columnas}>
          {ESTADOS.map((e) => (
            <div key={e} className={s.columna} style={conColor(ESTADO_INFO[e].color)}>
              {ESTADO_INFO[e].nombre}
              <small>{restoPorEstado[e] > 0 ? `${fmtKg(restoPorEstado[e])} kg` : "—"}</small>
            </div>
          ))}
        </div>
        <Tablero familia={familia} stock={stock} camino={camino} elegida={elegida} onElegir={onElegir} onHover={onHover} />
      </div>
      <CuadreBar cuadre={familia.cuadre} raiz={raiz} />
    </section>
  );
}

type Linea = { key: string; d: string; madreId: string; hijaId: string; color: string; titulo: string };

function Tablero({ familia, stock, camino, elegida, onElegir, onHover }: {
  familia: Familia; stock: StockCargado; camino: Set<string> | null; elegida: string | null; onElegir: (id: string) => void; onHover: (id: string | null) => void;
}) {
  const cont = useRef<HTMLDivElement>(null);
  const cajas = useRef(new Map<string, HTMLButtonElement>());
  const [geo, setGeo] = useState<{ w: number; h: number; lineas: Linea[] }>({ w: 0, h: 0, lineas: [] });
  const porId = useMemo(() => new Map(familia.partidas.map((p) => [p.id, p])), [familia]);

  useLayoutEffect(() => {
    const el = cont.current;
    if (!el) return;
    const medir = () => {
      const base = el.getBoundingClientRect();
      const lineas: Linea[] = [];
      for (const a of familia.aristas) {
        const m = cajas.current.get(a.madreId)?.getBoundingClientRect();
        const h = cajas.current.get(a.hijaId)?.getBoundingClientRect();
        const hija = porId.get(a.hijaId);
        if (!m || !h || !hija) continue;
        const x1 = m.right - base.left;
        const y1 = m.top + m.height / 2 - base.top;
        const x2 = h.left - base.left;
        const y2 = h.top + h.height / 2 - base.top;
        const dx = Math.max(18, (x2 - x1) / 2);
        const t = a.transformacion;
        lineas.push({
          key: `${t.id}:${a.hijaId}`,
          d: `M${x1.toFixed(1)},${y1.toFixed(1)} C${(x1 + dx).toFixed(1)},${y1.toFixed(1)} ${(x2 - dx).toFixed(1)},${y2.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`,
          madreId: a.madreId,
          hijaId: a.hijaId,
          color: ESTADO_INFO[hija.estado].color,
          titulo: `${t.codigo} · ${TRANSFORMACIONES[t.tipo].nombre} del ${fecha(t.fecha)}: entraron ${fmtKg(t.kgEntrada)} kg → ${hija.codigo} (${fmtKg(hija.kg)} kg)` +
            ` · humedad ${fmtKg(t.humedadKg)} · residuos ${fmtKg(t.residuosKg)} · pérdidas ${fmtKg(t.perdidasKg)}`,
        });
      }
      setGeo({ w: el.offsetWidth, h: el.offsetHeight, lineas });
    };
    // El ResizeObserver avisa también al empezar a observar: esa es la primera medida.
    const ro = new ResizeObserver(() => medir());
    ro.observe(el);
    return () => ro.disconnect();
  }, [familia, porId]);

  return (
    <div ref={cont} className={s.tablero} style={{ gridTemplateRows: `repeat(${familia.filas}, minmax(70px, auto))` }} onMouseLeave={() => onHover(null)}>
      <svg className={s.curvas} width={geo.w} height={geo.h} viewBox={`0 0 ${Math.max(1, geo.w)} ${Math.max(1, geo.h)}`} aria-hidden="true">
        {geo.lineas.map((l) => {
          const enCamino = camino ? camino.has(l.madreId) && camino.has(l.hijaId) : false;
          return (
            <path key={l.key} d={l.d} stroke={l.color} className={camino ? (enCamino ? s.resaltada : s.tenue) : undefined}>
              <title>{l.titulo}</title>
            </path>
          );
        })}
      </svg>
      {familia.celdas.map((c) => {
        const p = porId.get(c.partidaId);
        if (!p) return null;
        const m = movimientosDe(p, stock);
        const info = ESTADO_INFO[p.estado];
        const consumida = m.restoKg <= 0.0005;
        const clases = [s.caja, elegida === p.id ? s.cajaElegida : "", camino && !camino.has(p.id) ? s.cajaTenue : "", consumida ? s.cajaConsumida : ""].join(" ");
        const raizEstado = familia.raiz.estado;
        return (
          <button
            key={p.id}
            id={`partida-${p.id}`}
            ref={(el) => {
              if (el) cajas.current.set(p.id, el);
              else cajas.current.delete(p.id);
            }}
            type="button"
            className={clases}
            style={{ ...conColor(info.color), gridColumn: c.columna + 1, gridRow: `${c.filaDesde + 1} / ${c.filaHasta + 2}` }}
            onMouseEnter={() => onHover(p.id)}
            onFocus={() => onHover(p.id)}
            onBlur={() => onHover(null)}
            onClick={() => onElegir(p.id)}
            aria-pressed={elegida === p.id}
            title={`${p.codigo} · ${info.nombre}${p.estado === "empacado" ? ` de ${p.contenido}` : ""} · ${fmtKg(p.kg)} kg · disponible ${fmtKg(m.disponibleKg)} kg`}
          >
            <span className={s.cajaCodigo}>
              <span>{p.codigo}</span>
              <span>{p.comprometido ? "⚑" : ""}</span>
            </span>
            <span className={s.cajaKg}>
              {fmtKg(consumida ? p.kg : m.restoKg)} kg
              <small>{consumida ? "transformada" : m.disponibleKg < m.restoKg ? `disp. ${fmtKg(m.disponibleKg)}` : ""}</small>
            </span>
            {p.id !== familia.raiz.id && (
              <span className={s.cajaDetalle}>≈ {fmtKg(equivalenteEnRaiz(p, consumida ? p.kg : m.restoKg))} kg de {raizEstado}</span>
            )}
            <span className={s.cajaDetalle}>
              {[p.estado === "empacado" ? `de ${p.contenido}` : null, p.presentacion, p.ubicacion, `${fmtCop(p.costoCopKg)}/kg`].filter(Boolean).join(" · ")}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ── El cuadre: cada kilo de la raíz en una cubeta ─────────────────────────────────────────────────────────────────────────────
const CUBETAS_FIJAS = [
  { k: "kit" as const, nombre: "Salió en kits", color: "#7c6fb0" },
  { k: "venta" as const, nombre: "Vendido", color: "#9a8fc7" },
  { k: "consumo" as const, nombre: "Consumo interno", color: "#b7aed8" },
  { k: "ajuste" as const, nombre: "Ajustes", color: "#d3cde9" },
];

function CuadreBar({ cuadre, raiz }: { cuadre: Cuadre; raiz: Partida }) {
  const total = cuadre.raizKg || 1;
  const cubetas = [
    ...ESTADOS.map((e) => ({ k: e, nombre: `En ${ESTADO_INFO[e].nombre.toLowerCase()}`, color: ESTADO_INFO[e].color, kg: cuadre.enEstado[e] })),
    ...CUBETAS_FIJAS.map((c) => ({ ...c, kg: cuadre.salidas[c.k] })),
    { k: "humedad", nombre: "Merma de humedad", color: "#7fb7d8", kg: cuadre.humedadKg },
    { k: "residuos", nombre: "Residuos", color: "#b58b5a", kg: cuadre.residuosKg },
    { k: "perdidas", nombre: "Pérdidas", color: "#d0574f", kg: cuadre.perdidasKg },
  ].filter((c) => c.kg > 0.0005);
  return (
    <div className={s.cuadre}>
      <div className={s.barra} role="img" aria-label={cubetas.map((c) => `${c.nombre} ${fmtKg(c.kg)} kg`).join(", ")}>
        {cubetas.map((c) => (
          <span key={c.k} style={{ flexGrow: c.kg / total, flexBasis: 0, background: c.color }} title={`${c.nombre}: ${fmtKg(c.kg)} kg`} />
        ))}
      </div>
      <div className={s.leyenda}>
        {cubetas.map((c) => (
          <span key={c.k}>
            <i style={{ background: c.color }} />
            {c.nombre} <b>{fmtKg(c.kg)}</b>
          </span>
        ))}
        <span className={cuadre.cuadra ? s.cuadra : s.noCuadra}>
          {cuadre.cuadra
            ? `✓ cuadra: ${fmtKg(cuadre.sumaKg)} de ${fmtKg(cuadre.raizKg)} kg de ${raiz.estado}`
            : `⚠ no cuadra: las cubetas suman ${fmtKg(cuadre.sumaKg)} kg y la raíz tiene ${fmtKg(cuadre.raizKg)}`}
        </span>
      </div>
    </div>
  );
}

// ── La partida elegida ───────────────────────────────────────────────────────────────────────────────────────────────────────
// V5.203 · corrección (H12): tres tonos — bien (verde), falló (rojo) y «se hizo, pero algo de después no» (ámbar, `s.avisoParcial`).
type Aviso = { texto: string; tono: "ok" | "error" | "parcial" } | null;

/** V5.203 · corrección (H6): qué pasa en la vitrina con el café de esta partida. La marca CTCx Selection va por LOTE (la vista
 *  `public_lot_vitrina`), no por compra ni por partida; lo comprometido (vendido) y lo que no tiene lote no van a la vitrina, y un Tyrian
 *  va a subasta. Desde la V5.202 ningún lote enseña la finca: lo que cambia es el rótulo y la imagen de CTCx frente a las fotos del lote. */
function enLaVitrina(partida: Partida, stock: StockCargado): string {
  if (partida.comprometido) return "No va a la vitrina (vendido: ya tiene comprador).";
  if (!partida.lotId) return "No va a la vitrina (sin lote de la plataforma).";
  if (stock.lotes[partida.lotId]?.grade === "tyrian") return "No va a la vitrina (Tyrian: va a subasta).";
  return stock.lotesSelection.includes(partida.lotId) ? `El lote es CTCx Selection. ${VITRINA_SEGUN_DESTINO.selection}` : `El lote no es CTCx Selection. ${VITRINA_SEGUN_DESTINO.stock}`;
}

function PanelDePartida({ partida, stock, onCerrar, onElegir, onCambio }: {
  partida: Partida; stock: StockCargado; onCerrar: () => void; onElegir: (id: string) => void; onCambio: () => void;
}) {
  const m = movimientosDe(partida, stock);
  const info = ESTADO_INFO[partida.estado];
  const lote = partida.lotId ? stock.lotes[partida.lotId] : null;
  const raiz = stock.partidas.find((p) => p.id === partida.raizId) ?? partida;
  const madreTx = partida.madreTransformacionId ? stock.transformaciones.find((t) => t.id === partida.madreTransformacionId) ?? null : null;
  const madre = madreTx ? stock.partidas.find((p) => p.id === madreTx.madreId) ?? null : null;
  const hechas = stock.transformaciones.filter((t) => t.madreId === partida.id && !t.anulada);
  const salidas = stock.salidas.filter((x) => x.partidaId === partida.id && !x.anulada);
  const reservas = stock.reservasKit.filter((r) => r.partidaId === partida.id);
  const declaradas = declaracionesDe(partida.id, stock);
  const tipos = transformacionesDesde(partida.estado);
  const [aviso, setAviso] = useState<Aviso>(null);
  const [busy, setBusy] = useState(false);
  const [ubicacion, setUbicacion] = useState(partida.ubicacion ?? "");
  const [motivos, setMotivos] = useState<Record<string, string>>({});
  const motivo = (k: string) => motivos[k] ?? "";
  const setMotivo = (k: string, v: string) => setMotivos((x) => ({ ...x, [k]: v }));

  const correr = async (fn: () => Promise<{ ok: boolean; error?: string }>, ok: string) => {
    setBusy(true);
    setAviso(null);
    const r = await fn();
    setBusy(false);
    // V5.203: un `aviso` (lo principal se hizo, algo de después no) se dice en ámbar, nunca se calla.
    const avisoDeLaAccion = r.ok && "aviso" in r && typeof (r as { aviso?: unknown }).aviso === "string" ? (r as { aviso: string }).aviso : null;
    setAviso(r.ok ? (avisoDeLaAccion ? { texto: avisoDeLaAccion, tono: "parcial" } : { texto: ok, tono: "ok" }) : { texto: r.error ?? "No se pudo.", tono: "error" });
    if (r.ok) onCambio();
  };
  const hijasMovidas = (txId: string) =>
    stock.partidas.filter((p) => p.madreTransformacionId === txId && !p.anulada).some((h) => {
      const mh = movimientosDe(h, stock);
      return mh.transformadoKg > 0 || mh.salidoKg > 0 || mh.reservadoKitKg > 0 || mh.declaradoKg > 0;
    });

  return (
    <aside className={s.panel} aria-label={`Partida ${partida.codigo}`}>
      <div className={s.panelHead}>
        <h2>
          {partida.codigo}
          <span className={s.chip} style={conColor(info.color)}>{info.nombre}{partida.estado === "empacado" ? ` · ${partida.contenido}` : ""}</span>
        </h2>
        <button className="btn btn-sm" type="button" onClick={onCerrar}>Cerrar</button>
      </div>
      {partida.anulada && <p className={s.error}>Anulada: {partida.anuladaMotivo}</p>}
      <dl className={s.datos}>
        <dt>Lote</dt>
        <dd>{lote ? <Link href={`/ocp/kr?lote=${lote.id}`}>{lote.name}</Link> : partida.origenTexto ?? "—"}{lote ? ` · ${lote.producerName}` : ""}</dd>
        <dt>Origen</dt>
        <dd>
          {madreTx && madre ? (
            <>
              {TRANSFORMACIONES[madreTx.tipo].nombre} {madreTx.codigo} de{" "}
              <button type="button" className={s.enlace} onClick={() => onElegir(madre.id)}>{madre.codigo}</button> ({fecha(madreTx.fecha)})
            </>
          ) : (
            <>
              {stock.origenes[partida.id]?.tipo ?? ORIGEN_LABEL[partida.origen]}
              {stock.origenes[partida.id]?.detalle ? ` · ${stock.origenes[partida.id]?.detalle}` : ""}
              {partida.compraId && <> · <Link href={rutaDeLaCompra(partida.compraId)}>su compra en Adquisición →</Link></>}
            </>
          )}
        </dd>
        {!partida.anulada && (
          <>
            <dt>En la vitrina</dt>
            <dd>{enLaVitrina(partida, stock)}</dd>
          </>
        )}
        <dt>Kg</dt>
        <dd><b>{fmtKg(partida.kg)}</b> al nacer · {fmtKg(m.restoKg)} siguen aquí</dd>
        <dt>Disponible</dt>
        <dd>
          <b>{fmtKg(m.disponibleKg)} kg</b>
          {m.reservadoKitKg > 0 && <> · {fmtKg(m.reservadoKitKg)} reservados en kits</>}
          {m.reservadoMezclaKg > 0 && <> · {fmtKg(m.reservadoMezclaKg)} en mezclas</>}
          {m.declaradoKg > 0 && <> · {fmtKg(m.declaradoKg)} declarados</>}
        </dd>
        {declaradas.length > 0 && (
          <>
            <dt>En el Catálogo Activo</dt>
            <dd>
              {fmtKg(m.declaradoKg)} kg ({declaradas.map((d) => d.codigo).join(", ")}) · <Link href={`/ocp/contratos?partida=${partida.id}`}>Triage →</Link>
            </dd>
          </>
        )}
        <dt>Equivale a</dt>
        <dd>{fmtKg(equivalenteEnRaiz(partida, 1))} kg de {raiz.estado} por kg ({fmtKg(equivalenteEnRaiz(partida, m.restoKg))} kg por lo que sigue aquí)</dd>
        <dt>Costo</dt>
        <dd>{fmtCop(partida.costoCopKg)} por kg de {partida.estado}</dd>
        {partida.presentacion && (
          <>
            <dt>Presentación</dt>
            <dd>{partida.presentacion}</dd>
          </>
        )}
        {partida.comprometido && (
          <>
            <dt>Comprometido</dt>
            <dd>Vendido a nombre del productor: no surte kits ni se declara al catálogo.</dd>
          </>
        )}
        {partida.nota && (
          <>
            <dt>Nota</dt>
            <dd>{partida.nota}</dd>
          </>
        )}
      </dl>
      {aviso && <p className={aviso.tono === "error" ? s.error : aviso.tono === "parcial" ? s.avisoParcial : s.ok} role="status">{aviso.texto}</p>}

      {!partida.anulada && tipos.length > 0 && m.disponibleKg > 0 && (
        <div className={s.seccion}>
          <h3>Transformar</h3>
          <TransformarForm key={`${partida.id}:${m.disponibleKg}`} partida={partida} disponibleKg={m.disponibleKg} tipos={tipos} raizEstado={raiz.estado} onListo={(codigo) => { setAviso({ texto: `Registrada ${codigo}.`, tono: "ok" }); onCambio(); }} />
        </div>
      )}

      {!partida.anulada && m.disponibleKg > 0 && (
        <div className={s.seccion}>
          <h3>Dar salida</h3>
          <SalidaForm key={`${partida.id}:${m.disponibleKg}`} partida={partida} disponibleKg={m.disponibleKg} onListo={() => { setAviso({ texto: "Salida registrada.", tono: "ok" }); onCambio(); }} />
        </div>
      )}

      {!partida.anulada && (
        <div className={s.seccion}>
          <h3>Ubicación</h3>
          <div className={s.campos}>
            <div className={s.campo}>
              <input aria-label="Ubicación" value={ubicacion} placeholder="Bodega · estante · Centro de Calidad" maxLength={200} onChange={(e) => setUbicacion(e.target.value)} />
            </div>
          </div>
          <div className={s.botones}>
            <button className="btn btn-sm" type="button" disabled={busy || ubicacion === (partida.ubicacion ?? "")} onClick={() => correr(() => ubicarPartida(partida.id, ubicacion), "Ubicación guardada.")}>
              Guardar ubicación
            </button>
          </div>
        </div>
      )}

      {(hechas.length > 0 || salidas.length > 0 || reservas.length > 0) && (
        <div className={s.seccion}>
          <h3>Lo que salió de aquí</h3>
          <ul className={s.movs}>
            {hechas.map((t) => {
              const hijas = stock.partidas.filter((p) => p.madreTransformacionId === t.id && !p.anulada);
              return (
                <li key={t.id}>
                  <b>{TRANSFORMACIONES[t.tipo].nombre} {t.codigo}</b> · {fecha(t.fecha)} · entraron {fmtKg(t.kgEntrada)} kg →{" "}
                  {hijas.map((h, i) => (
                    <span key={h.id}>
                      {i ? ", " : ""}
                      <button type="button" className={s.enlace} onClick={() => onElegir(h.id)}>{h.codigo}</button> ({fmtKg(h.kg)})
                    </span>
                  ))}
                  <small>
                    humedad {fmtKg(t.humedadKg)} · residuos {fmtKg(t.residuosKg)} · pérdidas {fmtKg(t.perdidasKg)}
                    {t.costoOperacionCop > 0 ? ` · operación ${fmtCop(t.costoOperacionCop)}` : ""}
                    {t.nota ? ` · ${t.nota}` : ""}
                  </small>
                  {!hijasMovidas(t.id) && (
                    <span className={s.botones} style={{ justifyContent: "flex-start", marginTop: 6 }}>
                      <input aria-label={`Motivo para anular ${t.codigo}`} placeholder="Motivo para deshacerla" value={motivo(t.id)} onChange={(e) => setMotivo(t.id, e.target.value)} style={{ flex: 1, minWidth: 140 }} />
                      <button className="btn btn-sm" type="button" disabled={busy || motivo(t.id).trim().length < 3} onClick={() => correr(() => anularTransformacion(t.id, motivo(t.id)), `${t.codigo} anulada: lo que entró volvió a esta partida.`)}>
                        Deshacer
                      </button>
                    </span>
                  )}
                </li>
              );
            })}
            {salidas.map((x) => (
              <li key={x.id}>
                <b>{SALIDA_LABEL[x.tipo]}</b> · {fmtKg(x.kg)} kg · {fecha(x.fecha)}
                <small>{x.tipo === "kit" && x.kitId ? `${stock.kits[x.kitId]?.codigo ?? "kit"} · se deshace anulando el kit` : x.motivo}</small>
                {x.tipo !== "kit" && (
                  <span className={s.botones} style={{ justifyContent: "flex-start", marginTop: 6 }}>
                    <input aria-label="Motivo para anular la salida" placeholder="Motivo para anularla" value={motivo(x.id)} onChange={(e) => setMotivo(x.id, e.target.value)} style={{ flex: 1, minWidth: 140 }} />
                    <button className="btn btn-sm" type="button" disabled={busy || motivo(x.id).trim().length < 3} onClick={() => correr(() => anularSalida(x.id, motivo(x.id)), "Salida anulada: los kilos volvieron.")}>
                      Anular
                    </button>
                  </span>
                )}
              </li>
            ))}
            {reservas.map((r) => (
              <li key={`${r.kitId}-${r.partidaId}`}>
                <b>Reservado en {r.kitCodigo}</b> · {fmtKg(r.kg)} kg
                <small>
                  Sale del stock al enviarse el kit · <Link href={`/ocp/stock/sample-kits/${r.kitId}`}>ver el kit</Link>
                </small>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!partida.anulada && partida.origen === "compra" && partida.compraId && (
        <p className={s.previa}>
          Esta partida es la raíz de una compra: si la compra se registró por error, se anula con ella en{" "}
          <Link href={rutaDeLaCompra(partida.compraId)}>Adquisición de Stock Café</Link>.
        </p>
      )}

      {!partida.anulada && partida.origen === "manual" && !partida.madreTransformacionId && hechas.length === 0 && salidas.length === 0 && reservas.length === 0 && declaradas.length === 0 && (
        <div className={s.seccion}>
          <h3>Anular el ingreso</h3>
          <p className={s.previa}>Si se registró por error. Queda en el rastro con su motivo; nada se borra.</p>
          <div className={s.botones} style={{ justifyContent: "flex-start" }}>
            <input aria-label="Motivo para anular el ingreso" placeholder="Motivo" value={motivo("ingreso")} onChange={(e) => setMotivo("ingreso", e.target.value)} style={{ flex: 1 }} />
            <button className="btn btn-sm" type="button" disabled={busy || motivo("ingreso").trim().length < 3} onClick={() => correr(() => anularIngreso(partida.id, motivo("ingreso")), "Ingreso anulado.")}>
              Anular
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}

// ── Transformar ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
type HijaForm = { kg: string; presentacion: string; ubicacion: string };
const hijasDe = (kgs: number[]): HijaForm[] => kgs.map((k) => ({ kg: str(k), presentacion: "", ubicacion: "" }));

function TransformarForm({ partida, disponibleKg, tipos, raizEstado, onListo }: {
  partida: Partida; disponibleKg: number; tipos: TipoDeTransformacion[]; raizEstado: EstadoDePartida; onListo: (codigo: string) => void;
}) {
  const inicial = propuestaDeTransformacion(tipos[0], disponibleKg);
  const [tipo, setTipo] = useState<TipoDeTransformacion>(tipos[0]);
  const [entrada, setEntrada] = useState(str(disponibleKg));
  const [hijas, setHijas] = useState<HijaForm[]>(hijasDe(inicial.hijas.map((h) => h.kg)));
  const [humedad, setHumedad] = useState(str(inicial.humedadKg));
  const [residuos, setResiduos] = useState(str(inicial.residuosKg));
  const [perdidas, setPerdidas] = useState(str(inicial.perdidasKg));
  const [costo, setCosto] = useState("");
  const [fechaOp, setFechaOp] = useState("");
  const [nota, setNota] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const solicitud = {
    tipo,
    kgEntrada: num(entrada),
    hijas: hijas.map((h) => ({ kg: num(h.kg), presentacion: h.presentacion || null, ubicacion: h.ubicacion || null })),
    humedadKg: num(humedad || "0"),
    residuosKg: num(residuos || "0"),
    perdidasKg: num(perdidas || "0"),
    costoOperacionCop: num(costo || "0"),
  };
  const falta = faltaPorCuadrar(solicitud);
  const errores = erroresDeTransformacion(partida, disponibleKg, solicitud);
  const previa = previaDeTransformacion(partida, solicitud);
  const hacia = TRANSFORMACIONES[tipo].hacia;

  const proponer = (t: TipoDeTransformacion, kg: number) => {
    const p = propuestaDeTransformacion(t, kg);
    setHijas(hijasDe(p.hijas.map((h) => h.kg)));
    setHumedad(str(p.humedadKg));
    setResiduos(str(p.residuosKg));
    setPerdidas(str(p.perdidasKg));
  };
  const sumarA = (campo: "humedad" | "residuos" | "perdidas") => {
    const actual = num((campo === "humedad" ? humedad : campo === "residuos" ? residuos : perdidas) || "0") || 0;
    const nuevo = str(Math.max(0, actual + falta));
    if (campo === "humedad") setHumedad(nuevo);
    else if (campo === "residuos") setResiduos(nuevo);
    else setPerdidas(nuevo);
  };

  async function enviar() {
    setBusy(true);
    setError(null);
    const r = await transformarPartida(partida.id, { ...solicitud, fecha: fechaOp || null, nota: nota || null });
    setBusy(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    onListo(r.codigo ?? "la transformación");
  }

  return (
    <div>
      <div className={s.campos}>
        <div className={s.campo}>
          <label htmlFor="tx-tipo">Qué se hace</label>
          <select id="tx-tipo" value={tipo} onChange={(e) => { const t = e.target.value as TipoDeTransformacion; setTipo(t); proponer(t, num(entrada) || 0); }}>
            {tipos.map((t) => (
              <option key={t} value={t}>{TRANSFORMACIONES[t].nombre} → {ESTADO_INFO[TRANSFORMACIONES[t].hacia].nombre.toLowerCase()}</option>
            ))}
          </select>
        </div>
        <div className={s.campo}>
          <label htmlFor="tx-entra">Kg que entran</label>
          <input id="tx-entra" inputMode="decimal" value={entrada} onChange={(e) => setEntrada(e.target.value)} onBlur={() => proponer(tipo, num(entrada) || 0)} />
          <small>de {fmtKg(disponibleKg)} kg disponibles</small>
        </div>
      </div>

      <p className={s.previa} style={{ marginTop: 10 }}>
        <b>Sale</b> — una fila por partida de {ESTADO_INFO[hacia].nombre.toLowerCase()} (kg{tipo === "empaque" ? ", presentación" : ""}, ubicación):
      </p>
      <div className={s.hijas}>
        {hijas.map((h, i) => (
          <div key={i} className={s.hija}>
            <input aria-label={`Kg de la partida ${i + 1}`} inputMode="decimal" placeholder="kg" value={h.kg} onChange={(e) => setHijas(hijas.map((x, j) => (j === i ? { ...x, kg: e.target.value } : x)))} />
            <input aria-label={`Presentación de la partida ${i + 1}`} placeholder={tipo === "empaque" ? "bolsas de 250 g al vacío" : "presentación (opcional)"} value={h.presentacion} onChange={(e) => setHijas(hijas.map((x, j) => (j === i ? { ...x, presentacion: e.target.value } : x)))} />
            <input aria-label={`Ubicación de la partida ${i + 1}`} placeholder={partida.ubicacion ?? "ubicación"} value={h.ubicacion} onChange={(e) => setHijas(hijas.map((x, j) => (j === i ? { ...x, ubicacion: e.target.value } : x)))} />
            <button className="btn btn-sm" type="button" aria-label={`Quitar la partida ${i + 1}`} disabled={hijas.length === 1} onClick={() => setHijas(hijas.filter((_, j) => j !== i))}>×</button>
          </div>
        ))}
      </div>
      <button type="button" className={s.enlace} onClick={() => setHijas([...hijas, { kg: "", presentacion: "", ubicacion: "" }])}>+ partir en otra partida</button>

      <div className={s.campos} style={{ marginTop: 10 }}>
        <div className={s.campo}>
          <label htmlFor="tx-hum">Merma de humedad (kg)</label>
          <input id="tx-hum" inputMode="decimal" value={humedad} onChange={(e) => setHumedad(e.target.value)} />
          <small>{tipo === "tostion" ? "la merma de la tostión" : "agua que se fue"}</small>
        </div>
        <div className={s.campo}>
          <label htmlFor="tx-res">Residuos (kg)</label>
          <input id="tx-res" inputMode="decimal" value={residuos} onChange={(e) => setResiduos(e.target.value)} />
          <small>cascarilla, cisco, pasilla</small>
        </div>
        <div className={s.campo}>
          <label htmlFor="tx-per">Pérdidas (kg)</label>
          <input id="tx-per" inputMode="decimal" value={perdidas} onChange={(e) => setPerdidas(e.target.value)} />
          <small>derrames, lo que no apareció</small>
        </div>
      </div>

      <div className={`${s.balance} ${Math.abs(falta) <= 0.01 ? s.balanceOk : s.balanceMal}`}>
        <span>
          Entran <b>{fmtKg(num(entrada) || 0)}</b> kg · salen <b>{fmtKg((num(entrada) || 0) - falta)}</b> kg ·{" "}
          {Math.abs(falta) <= 0.01 ? "✓ cuadra" : falta > 0 ? `faltan ${fmtKg(falta)} kg por repartir` : `sobran ${fmtKg(-falta)} kg`}
        </span>
        {Math.abs(falta) > 0.01 && falta > 0 && (
          <span>
            <button type="button" className={s.enlace} onClick={() => sumarA("residuos")}>a residuos</button> ·{" "}
            <button type="button" className={s.enlace} onClick={() => sumarA("humedad")}>a humedad</button> ·{" "}
            <button type="button" className={s.enlace} onClick={() => sumarA("perdidas")}>a pérdidas</button>
          </span>
        )}
      </div>

      <div className={s.campos}>
        <div className={s.campo}>
          <label htmlFor="tx-costo">Costo de la operación (COP)</label>
          <input id="tx-costo" inputMode="numeric" placeholder="maquila, tostión, materiales" value={costo} onChange={(e) => setCosto(e.target.value)} />
        </div>
        <div className={s.campo}>
          <label htmlFor="tx-fecha">Fecha</label>
          <input id="tx-fecha" type="date" value={fechaOp} onChange={(e) => setFechaOp(e.target.value)} />
          <small>vacía = hoy</small>
        </div>
      </div>
      <div className={s.campo} style={{ marginTop: 8 }}>
        <label htmlFor="tx-nota">Nota</label>
        <input id="tx-nota" value={nota} maxLength={500} placeholder="trilladora, tostador, perfil…" onChange={(e) => setNota(e.target.value)} />
      </div>

      {previa && (
        <p className={s.previa}>
          Cada partida nueva: <b>{ESTADO_INFO[previa.hacia].nombre}{previa.hacia === "empacado" ? ` de ${previa.contenido as ContenidoDePartida}` : ""}</b> a{" "}
          <b>{fmtCop(previa.costoCopKg)}/kg</b> (lo que entró más la operación, por kg de lo que sale) · cada kg ≈{" "}
          <b>{fmtKg(previa.equivalencia)} kg de {raizEstado}</b> · rendimiento {fmtKg(previa.rendimientoPct)} %.
        </p>
      )}
      {errores.length > 0 && <p className={s.error}>{errores[0]}</p>}
      {error && <p className={s.error}>{error}</p>}
      <div className={s.botones}>
        <button className="btn btn-sm btn-solid" type="button" disabled={busy || errores.length > 0} onClick={enviar}>
          {busy ? "Registrando…" : `${TRANSFORMACIONES[tipo].verbo}`}
        </button>
      </div>
    </div>
  );
}

// ── Dar salida ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
function SalidaForm({ partida, disponibleKg, onListo }: { partida: Partida; disponibleKg: number; onListo: () => void }) {
  const [tipo, setTipo] = useState<(typeof SALIDAS_A_MANO)[number]>("venta");
  const [kg, setKg] = useState("");
  const [motivo, setMotivo] = useState("");
  const [fechaS, setFechaS] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const kgN = num(kg);
  const valida = kgN > 0 && kgN <= disponibleKg + 0.0005 && motivo.trim().length >= 3;

  async function enviar() {
    setBusy(true);
    setError(null);
    const r = await registrarSalida(partida.id, { tipo, kg: kgN, motivo, fecha: fechaS || null });
    setBusy(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setKg("");
    setMotivo("");
    onListo();
  }

  return (
    <div>
      <div className={s.campos}>
        <div className={s.campo}>
          <label htmlFor="sal-tipo">Qué es</label>
          <select id="sal-tipo" value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)}>
            {SALIDAS_A_MANO.map((t) => (
              <option key={t} value={t}>{SALIDA_LABEL[t]}</option>
            ))}
          </select>
        </div>
        <div className={s.campo}>
          <label htmlFor="sal-kg">Kg</label>
          <input id="sal-kg" inputMode="decimal" value={kg} placeholder={`hasta ${fmtKg(disponibleKg)}`} onChange={(e) => setKg(e.target.value)} />
        </div>
        <div className={s.campo}>
          <label htmlFor="sal-fecha">Fecha</label>
          <input id="sal-fecha" type="date" value={fechaS} onChange={(e) => setFechaS(e.target.value)} />
        </div>
      </div>
      <div className={s.campo} style={{ marginTop: 8 }}>
        <label htmlFor="sal-motivo">Motivo</label>
        <input id="sal-motivo" value={motivo} maxLength={300} placeholder="a quién, para qué, por qué" onChange={(e) => setMotivo(e.target.value)} />
      </div>
      <p className={s.previa}>Los Sample Kits no salen de aquí: salen solos al enviarse el kit.</p>
      {error && <p className={s.error}>{error}</p>}
      <div className={s.botones}>
        <button className="btn btn-sm" type="button" disabled={busy || !valida} onClick={enviar}>
          {busy ? "Registrando…" : "Registrar la salida"}
        </button>
      </div>
    </div>
  );
}

// ── Ingresar a mano ──────────────────────────────────────────────────────────────────────────────────────────────────────────
function IngresoForm({ lotes, onListo }: { lotes: LoteOpcion[]; onListo: () => void }) {
  const [lotId, setLotId] = useState("");
  const [origenTexto, setOrigenTexto] = useState("");
  const [estado, setEstado] = useState<EstadoDePartida>("pergamino");
  const [contenido, setContenido] = useState<ContenidoDePartida>("verde");
  const [kg, setKg] = useState("");
  const [costo, setCosto] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [presentacion, setPresentacion] = useState("");
  const [nota, setNota] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valida = num(kg) > 0 && nota.trim().length >= 3 && (lotId !== "" || origenTexto.trim().length > 0);

  async function enviar() {
    setBusy(true);
    setError(null);
    const r = await ingresarAlStock({
      lotId: lotId || null,
      origenTexto: lotId ? null : origenTexto,
      estado,
      contenido: estado === "empacado" ? contenido : null,
      kg: num(kg),
      costoCopKg: num(costo || "0"),
      ubicacion: ubicacion || null,
      presentacion: presentacion || null,
      nota,
    });
    setBusy(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    onListo();
  }

  return (
    <div className={s.ingreso}>
      <h3 style={{ margin: "0 0 6px", fontSize: 14 }}>Ingresar café a mano</h3>
      <p className={s.previa}>
        Para el inventario que ya estaba en CTCx o el café que llegó por fuera de la plataforma. Lo recibido de un trato, lo pagado de una compra
        en firme y las compras que ya llegaron entran solos.
      </p>
      <div className={s.campos}>
        <div className={s.campo} style={{ gridColumn: "1 / -1" }}>
          <label htmlFor="ing-lote">Lote</label>
          <select id="ing-lote" value={lotId} onChange={(e) => setLotId(e.target.value)}>
            <option value="">— sin lote de la plataforma —</option>
            {lotes.map((l) => (
              <option key={l.id} value={l.id}>{l.name}{l.finca ? ` · ${l.finca}` : ""}</option>
            ))}
          </select>
        </div>
        {!lotId && (
          <div className={s.campo} style={{ gridColumn: "1 / -1" }}>
            <label htmlFor="ing-origen">De dónde es</label>
            <input id="ing-origen" value={origenTexto} maxLength={200} placeholder="finca, productor, región" onChange={(e) => setOrigenTexto(e.target.value)} />
          </div>
        )}
        <div className={s.campo}>
          <label htmlFor="ing-estado">Estado</label>
          <select id="ing-estado" value={estado} onChange={(e) => setEstado(e.target.value as EstadoDePartida)}>
            {ESTADOS.map((e) => (
              <option key={e} value={e}>{ESTADO_INFO[e].nombre}</option>
            ))}
          </select>
        </div>
        {estado === "empacado" && (
          <div className={s.campo}>
            <label htmlFor="ing-contenido">Lleva dentro</label>
            <select id="ing-contenido" value={contenido} onChange={(e) => setContenido(e.target.value as ContenidoDePartida)}>
              <option value="pergamino">Pergamino</option>
              <option value="verde">Verde</option>
              <option value="tostado">Tostado</option>
            </select>
          </div>
        )}
        <div className={s.campo}>
          <label htmlFor="ing-kg">Kg</label>
          <input id="ing-kg" inputMode="decimal" value={kg} onChange={(e) => setKg(e.target.value)} />
        </div>
        <div className={s.campo}>
          <label htmlFor="ing-costo">Costo por kg (COP)</label>
          <input id="ing-costo" inputMode="numeric" value={costo} placeholder="0 si no se sabe" onChange={(e) => setCosto(e.target.value)} />
        </div>
        <div className={s.campo}>
          <label htmlFor="ing-ubic">Ubicación</label>
          <input id="ing-ubic" value={ubicacion} maxLength={200} onChange={(e) => setUbicacion(e.target.value)} />
        </div>
        <div className={s.campo}>
          <label htmlFor="ing-pres">Presentación</label>
          <input id="ing-pres" value={presentacion} maxLength={120} placeholder="saco de 70 kg, bolsas…" onChange={(e) => setPresentacion(e.target.value)} />
        </div>
        <div className={s.campo} style={{ gridColumn: "1 / -1" }}>
          <label htmlFor="ing-nota">Nota (obligatoria)</label>
          <input id="ing-nota" value={nota} maxLength={500} placeholder="inventario inicial del 10/10; acuerdo con…" onChange={(e) => setNota(e.target.value)} />
        </div>
      </div>
      {error && <p className={s.error}>{error}</p>}
      <div className={s.botones}>
        <button className="btn btn-sm btn-solid" type="button" disabled={busy || !valida} onClick={enviar}>
          {busy ? "Ingresando…" : "Ingresar al stock"}
        </button>
      </div>
    </div>
  );
}
