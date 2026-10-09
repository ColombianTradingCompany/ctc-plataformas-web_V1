"use client";

// ── ECP · Modelo de Producción · Empacado hasta FOB (V5.194) ──────────────────────────────────────────────────────────────────
// Lo que cuesta llevar un embarque de café verde de la bodega de CTCx a FOB: empacarlo (bolsas al vacío en cajas, o sacos con forro
// GrainPro), paletizarlo, llevarlo al puerto y despacharlo de exportación. El cálculo es PURO (`lib/produccion/empaqueFob.ts`) y
// corre aquí en vivo; al guardar una referencia el servidor lo vuelve a correr con los mismos parámetros. La referencia queda
// congelada y es la que el Triage de Catálogo Activo suma al café para anclar el precio FOB mínimo de un lote
// (`docs/PLAN_TRIAGE_CATALOGO.md` §2.2). Sin máquina ni amortización (owner, 2026-10-09): el empaque rinde lo que rinde la gente.

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { guardarReferenciaEmpaque, retirarReferenciaEmpaque } from "@/lib/produccion/actions";
import {
  CAMPOS_NUMERICOS, DESTINOS_FOB, ESTIMADOS_DEL_PVC, MODOS_DE_EMPAQUE, TRM_DE_RESPALDO, calcularEmpaqueFob, destinoDe, erroresDeParametros,
  modoDe, parametrosDelDestino, parametrosDelModo, parametrosPorDefecto,
  type CampoNumerico, type ClaveDeSeccion, type DestinoId, type ModoId, type ParametrosEmpaqueFob,
} from "@/lib/produccion/empaqueFob";
import type { ReferenciaEmpaque } from "@/lib/produccion/referencias";
import styles from "@/components/panel/shared.module.css";
import table from "@/components/cotizador/quotesTable.module.css";
import e from "./empaqueFob.module.css";

const cop = (v: number) => `$ ${new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(Math.round(v))}`;
const copKg = (v: number) => `$ ${new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(Math.round(v))}`;
const usd = (v: number, d = 2) => `US$ ${new Intl.NumberFormat("es-CO", { minimumFractionDigits: d, maximumFractionDigits: d }).format(v)}`;
const n2 = (v: number) => new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 }).format(v);
/** Una diferencia con su signo: «+US$ 0,28», «−US$ 0,21». */
const conSigno = (v: number) => `${v > 0.004 ? "+" : v < -0.004 ? "−" : ""}${usd(Math.abs(v))}`;
const day = (d: string) => new Date(d).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });

/** «5.000», «5000», «3141,36», «0.06»: el punto de miles se reconoce (como se escribe en Colombia); la coma es decimal. */
function num(s: string): number {
  let t = String(s ?? "").trim().replace(/[\s$]/g, "");
  t = /^[1-9]\d{0,2}(\.\d{3})+(,\d+)?$/.test(t) ? t.replace(/\./g, "").replace(",", ".") : t.replace(",", ".");
  const v = Number(t);
  return Number.isFinite(v) && v >= 0 ? v : 0;
}

type Formulario = { modo: ModoId; destino: DestinoId; paletizar: boolean; v: Record<CampoNumerico, string> };

function aFormulario(p: ParametrosEmpaqueFob): Formulario {
  const v = {} as Record<CampoNumerico, string>;
  // Con COMA decimal: «597.444» se leería como 597 444 (el punto es de miles en `num`).
  for (const k of CAMPOS_NUMERICOS) v[k] = String(p[k]).replace(".", ",");
  return { modo: p.modo, destino: p.destino, paletizar: p.paletizar, v };
}

function aParametros(f: Formulario): ParametrosEmpaqueFob {
  const p = { modo: f.modo, destino: f.destino, paletizar: f.paletizar } as ParametrosEmpaqueFob;
  for (const k of CAMPOS_NUMERICOS) p[k] = num(f.v[k]);
  return p;
}

const esVacio = (p: ParametrosEmpaqueFob) => modoDe(p.modo)?.tipo === "vacio";
const porUnidad = (p: ParametrosEmpaqueFob) => (esVacio(p) ? "COP por bolsa" : "COP por saco");

type Campo = {
  k: CampoNumerico;
  rotulo: (p: ParametrosEmpaqueFob) => string;
  unidad: (p: ParametrosEmpaqueFob) => string;
  ayuda?: (p: ParametrosEmpaqueFob) => string | null;
  visible?: (p: ParametrosEmpaqueFob) => boolean;
};
const t = (s: string) => () => s;

/** Las casillas de cada sección, en el orden del cálculo. */
const CAMPOS: Record<ClaveDeSeccion, Campo[]> = {
  empaque: [
    { k: "costoUnidad", rotulo: (p) => (esVacio(p) ? `Bolsa al vacío de ${modoDe(p.modo)?.kgUnidad} kg` : `Saco de yute de ${modoDe(p.modo)?.kgUnidad} kg`), unidad: t("COP c/u, con IVA") },
    { k: "costoForro", rotulo: t("Forro GrainPro"), unidad: t("COP c/u"), visible: (p) => !esVacio(p) },
    { k: "costoCaja", rotulo: (p) => `Caja de ${modoDe(p.modo)?.kgCaja} kg`, unidad: t("COP c/u"), visible: esVacio },
    { k: "costoEtiqueta", rotulo: t("Etiqueta"), unidad: porUnidad },
    { k: "costoHic", rotulo: t("Tarjeta de humedad (HIC)"), unidad: (p) => (esVacio(p) ? "COP por caja" : "COP por saco") },
    { k: "jornal", rotulo: t("Jornal"), unidad: t("COP por día") },
    { k: "kgPorJornal", rotulo: t("Productividad"), unidad: t("kg empacados por jornal"), ayuda: (p) => (esVacio(p) ? "Al vacío: unos 125 kg por persona al día." : "En sacos: unos 500 kg por persona al día.") },
  ],
  paletizado: [
    { k: "kgPorEstiba", rotulo: t("Carga por estiba"), unidad: t("kg") },
    { k: "costoEstiba", rotulo: t("Estiba ISPM-15"), unidad: t("COP c/u") },
    { k: "costoMaterialesEstiba", rotulo: t("Film, esquineros y zunchos"), unidad: t("COP por estiba") },
  ],
  transporte: [
    {
      k: "costoViaje", rotulo: (p) => `Flete a ${destinoDe(p.destino)?.nombre ?? "el puerto"}`, unidad: t("COP por viaje"),
      ayuda: (p) => (destinoDe(p.destino)?.via === "aereo" ? "El del cotizador logístico: $420.000 por embarque hasta El Dorado." : "Escriba la cotización del transportador: un puerto no trae tarifa por defecto."),
    },
    { k: "kgPorViaje", rotulo: t("Capacidad por viaje"), unidad: t("kg · 0 = un solo viaje") },
  ],
  tramites: [
    { k: "agenciaAduanas", rotulo: t("Agencia de aduanas"), unidad: t("COP por embarque") },
    { k: "certificados", rotulo: t("Certificados (OIC, VUCE, ICA)"), unidad: t("COP por embarque") },
    { k: "repesajeDian", rotulo: t("Re-pesaje y guía DIAN"), unidad: t("COP por embarque") },
    { k: "inspeccion", rotulo: t("Inspección física"), unidad: t("COP por embarque") },
    { k: "terminalOrigen", rotulo: (p) => (destinoDe(p.destino)?.via === "aereo" ? "Manejo de carga en el aeropuerto" : "Terminal en origen (OTHC, ISPS, B/L, estiba)"), unidad: t("COP por embarque") },
    { k: "fumigacion", rotulo: t("Fumigación"), unidad: t("COP por embarque") },
    { k: "otros", rotulo: t("Otros"), unidad: t("COP por embarque") },
    { k: "contribucionUsdLb", rotulo: t("Contribución cafetera"), unidad: t("US$ por libra") },
  ],
};

const COLOR: Record<ClaveDeSeccion, string> = { empaque: "#3c0a86", paletizado: "#b45309", transporte: "#0f766e", tramites: "#1d4ed8" };
const CLAVES_DEL_MODO = ["costoUnidad", "costoForro", "costoCaja", "costoEtiqueta", "costoHic", "kgPorJornal", "kgPorEstiba"] as const;

type Donde = "guardar" | "lista";
type Aviso = { donde: Donde; texto: string; error: boolean } | null;

export function EmpaqueFobBoard({ trmVigente, edicionCodigo, referencias }: { trmVigente: number | null; edicionCodigo: string | null; referencias: ReferenciaEmpaque[] }) {
  const router = useRouter();
  const trmBase = trmVigente && trmVigente > 0 ? trmVigente : TRM_DE_RESPALDO;
  const [f, setF] = useState<Formulario>(() => aFormulario(parametrosPorDefecto("vacio-6", "cartagena", trmBase)));
  const [cargada, setCargada] = useState<ReferenciaEmpaque | null>(null);
  const [nombre, setNombre] = useState("");
  const [busy, setBusy] = useState(false);
  const [aviso, setAviso] = useState<Aviso>(null);
  const [retirando, setRetirando] = useState<{ id: string; motivo: string } | null>(null);
  const [verRetiradas, setVerRetiradas] = useState(false);

  const p = useMemo(() => aParametros(f), [f]);
  const r = useMemo(() => calcularEmpaqueFob(p), [p]);
  const errores = erroresDeParametros(p);
  const comparacion = useMemo(
    () => MODOS_DE_EMPAQUE.map((m) => ({ m, actual: m.id === p.modo, r: calcularEmpaqueFob(m.id === p.modo ? p : { ...p, ...parametrosDelModo(m.id) }) })),
    [p],
  );
  const seccion = (k: ClaveDeSeccion) => r.secciones.find((s) => s.clave === k)!;

  const setV = (k: CampoNumerico, valor: string) => setF((x) => ({ ...x, v: { ...x.v, [k]: valor } }));
  const cambiarModo = (m: ModoId) =>
    setF((x) => {
      const d = parametrosDelModo(m);
      const v = { ...x.v };
      for (const k of CLAVES_DEL_MODO) v[k] = String(d[k]).replace(".", ",");
      return { ...x, modo: m, v };
    });
  const cambiarDestino = (id: DestinoId) =>
    setF((x) => {
      const d = parametrosDelDestino(id);
      return { ...x, destino: id, v: { ...x.v, costoViaje: String(d.costoViaje).replace(".", ","), kgPorViaje: String(d.kgPorViaje).replace(".", ","), terminalOrigen: String(d.terminalOrigen).replace(".", ",") } };
    });

  function cargar(ref: ReferenciaEmpaque) {
    setF(aFormulario(ref.parametros));
    setCargada(ref);
    setNombre("");
    setAviso(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function restablecer() {
    setF(aFormulario(parametrosPorDefecto("vacio-6", "cartagena", trmBase)));
    setCargada(null);
    setAviso(null);
  }

  async function guardar() {
    setBusy(true);
    setAviso(null);
    const res = await guardarReferenciaEmpaque(nombre, p);
    setBusy(false);
    if (!res.ok) {
      setAviso({ donde: "guardar", texto: res.error, error: true });
      return;
    }
    setAviso({ donde: "guardar", texto: `Guardada como ${res.codigo}: ya está en la lista de referencias.`, error: false });
    setNombre("");
    setCargada(null);
    router.refresh();
  }

  async function retirar() {
    if (!retirando) return;
    setBusy(true);
    setAviso(null);
    const res = await retirarReferenciaEmpaque(retirando.id, retirando.motivo);
    setBusy(false);
    if (!res.ok) {
      setAviso({ donde: "lista", texto: res.error, error: true });
      return;
    }
    setRetirando(null);
    setAviso({ donde: "lista", texto: "Referencia retirada: ya no se ofrece para anclar precios. Los lotes anclados en ella conservan su cifra.", error: false });
    router.refresh();
  }

  const mensaje = (donde: Donde) => (aviso?.donde === donde ? <p className={aviso.error ? e.error : e.ok} role="status">{aviso.texto}</p> : null);
  const modo = modoDe(p.modo)!;
  const destino = destinoDe(p.destino)!;
  const vigentes = referencias.filter((x) => x.estado === "vigente");
  const visibles = verRetiradas ? referencias : vigentes;
  const sinFlete = !(p.costoViaje > 0);
  const trmDistinta = trmVigente != null && Math.abs(p.trm - trmVigente) > 0.005;

  const casilla = (c: Campo) =>
    c.visible && !c.visible(p) ? null : (
      <div key={c.k} className={e.campo}>
        <label htmlFor={`ef-${c.k}`}>{c.rotulo(p)}</label>
        <input id={`ef-${c.k}`} inputMode="decimal" value={f.v[c.k]} onChange={(ev) => setV(c.k, ev.target.value)} />
        <small>{c.unidad(p)}{c.ayuda?.(p) ? ` · ${c.ayuda(p)}` : ""}</small>
      </div>
    );

  return (
    <>
      <h1 className={styles.title}>Empacado hasta FOB</h1>
      <p className={styles.subtitle}>
        Lo que cuesta llevar un embarque de café verde de la bodega de CTCx a FOB: empacarlo, paletizarlo, llevarlo al puerto y
        despacharlo de exportación. Cada valor por defecto tiene fuente (el cotizador logístico de CTCx) y se ajusta aquí. Una
        referencia guardada queda congelada: es la que se suma al costo del café para anclar el precio FOB mínimo de un lote en el
        Triage de Catálogo Activo.
      </p>

      {cargada && (
        <div className={e.cargada}>
          <span>
            Partiendo de <strong>{cargada.codigo}</strong> «{cargada.nombre}», guardada el {day(cargada.creadaEl)}. Cambiar estas casillas
            no la toca: al guardar nace otra referencia.
          </span>
          <button className="btn btn-sm" type="button" onClick={() => setCargada(null)}>Entendido</button>
        </div>
      )}

      <section className={e.panel}>
        <div className={e.head}>
          <h2>El embarque</h2>
          <button className="btn btn-sm" type="button" onClick={restablecer}>Valores por defecto</button>
        </div>
        <p className={e.rotuloGrupo}>Modo de empaque</p>
        <div className={e.modos} role="radiogroup" aria-label="Modo de empaque">
          {MODOS_DE_EMPAQUE.map((m) => (
            <button key={m.id} type="button" role="radio" aria-checked={m.id === p.modo} className={`${e.modo} ${m.id === p.modo ? e.modoActivo : ""}`} onClick={() => cambiarModo(m.id)}>
              <span className={e.modoTipo}>{m.tipo === "vacio" ? "Al vacío" : "GrainPro + yute"}</span>
              <strong>{m.tipo === "vacio" ? `Bolsas de ${m.kgUnidad} kg` : `Sacos de ${m.kgUnidad} kg`}</strong>
              <span className={e.modoDetalle}>{m.tipo === "vacio" ? `${m.unidadesPorCaja} por caja de ${m.kgCaja} kg` : "sin caja"}</span>
            </button>
          ))}
        </div>
        <p className={e.nota}>Al cambiar de modo se cargan los costos por defecto de sus materiales y su productividad.</p>

        <p className={e.rotuloGrupo}>Sale por</p>
        <div className={e.destinos} role="radiogroup" aria-label="Puerto o aeropuerto de salida">
          {DESTINOS_FOB.map((d) => (
            <button key={d.id} type="button" role="radio" aria-checked={d.id === p.destino} className={`${e.destino} ${d.id === p.destino ? e.modoActivo : ""}`} onClick={() => cambiarDestino(d.id)}>
              <strong>{d.nombre}</strong>
              <span className={e.modoDetalle}>{d.via === "aereo" ? "aéreo · FCA" : "marítimo · FOB"}</span>
            </button>
          ))}
        </div>

        <div className={e.campos} style={{ marginTop: 16 }}>
          <div className={e.campo}>
            <label htmlFor="ef-kgEmbarque">Café verde del embarque</label>
            <input id="ef-kgEmbarque" inputMode="decimal" value={f.v.kgEmbarque} onChange={(ev) => setV("kgEmbarque", ev.target.value)} />
            <small>kg de verde</small>
          </div>
          <div className={e.campo}>
            <label htmlFor="ef-trm">TRM</label>
            <input id="ef-trm" inputMode="decimal" value={f.v.trm} onChange={(ev) => setV("trm", ev.target.value)} />
            <small>
              COP por US$ · {trmVigente ? `la de la edición vigente del PVC${edicionCodigo ? ` (${edicionCodigo})` : ""}: ${n2(trmVigente)}` : `sin edición vigente del PVC: ${n2(TRM_DE_RESPALDO)} de respaldo`}
              {trmDistinta && trmVigente ? (
                <> · <button type="button" className={e.enlace} onClick={() => setV("trm", String(trmVigente).replace(".", ","))}>usarla</button></>
              ) : null}
            </small>
          </div>
        </div>
      </section>

      <div className={e.rejilla}>
        <div>
          {(["empaque", "paletizado", "transporte", "tramites"] as const).map((k) => (
            <section key={k} className={e.panel}>
              <div className={e.head}>
                <h2><i className={e.punto} style={{ background: COLOR[k] }} />{seccion(k).nombre}</h2>
                <small>{usd(seccion(k).usdKg)} /kg · {cop(seccion(k).cop)}</small>
              </div>
              {k === "paletizado" && (
                <label className={e.check}>
                  <input type="checkbox" checked={f.paletizar} onChange={(ev) => setF((x) => ({ ...x, paletizar: ev.target.checked }))} />
                  Paletizar el embarque (estibas ISPM-15)
                </label>
              )}
              {(k !== "paletizado" || f.paletizar) && <div className={e.campos}>{CAMPOS[k].map(casilla)}</div>}
            </section>
          ))}
        </div>

        <aside className={e.resultado} aria-live="polite">
          <div className={e.cifra}>
            <span className={e.cifraK}>Hasta {destino.incoterm} {destino.nombre}</span>
            <span className={e.cifraV}>{usd(r.usdKg)}</span>
            <span className={e.cifraSub}>por kg de verde · {copKg(r.copKg)} COP/kg</span>
          </div>
          <p className={e.cantidades}>
            {n2(p.kgEmbarque)} kg → <strong>{r.unidades}</strong> {modo.tipo === "vacio" ? "bolsas" : "sacos"}
            {r.cajas ? <> · <strong>{r.cajas}</strong> cajas</> : null} · <strong>{r.jornales}</strong> jornales
            {p.paletizar ? <> · <strong>{r.estibas}</strong> {r.estibas === 1 ? "estiba" : "estibas"}</> : null} · <strong>{r.viajes}</strong> {r.viajes === 1 ? "viaje" : "viajes"}
          </p>
          <div className={e.barra} role="img" aria-label={r.secciones.map((s) => `${s.nombre} ${usd(s.usdKg)} por kg`).join(", ")}>
            {r.secciones.filter((s) => s.cop > 0).map((s) => (
              <span key={s.clave} style={{ flexGrow: s.cop, background: COLOR[s.clave] }} title={`${s.nombre}: ${usd(s.usdKg)}/kg`} />
            ))}
          </div>
          <ul className={e.leyenda}>
            {r.secciones.map((s) => (
              <li key={s.clave}>
                <i className={e.punto} style={{ background: COLOR[s.clave] }} />
                <span>{s.nombre}</span>
                <strong>{usd(s.usdKg)}</strong>
                <small>{r.totalCop > 0 ? Math.round((s.cop / r.totalCop) * 100) : 0} %</small>
              </li>
            ))}
          </ul>
          <p className={e.total}>El embarque: <strong>{cop(r.totalCop)}</strong> COP</p>
          {r.avisos.map((a) => <p key={a} className={e.aviso}>{a}</p>)}
          {errores.map((x) => <p key={x} className={e.error}>{x}</p>)}

          <div className={e.guardar}>
            <label htmlFor="ef-nombre">Guardar como referencia</label>
            <input id="ef-nombre" placeholder={`p. ej. ${modo.tipo === "vacio" ? `Vacío ${modo.kgUnidad} kg` : `Sacos ${modo.kgUnidad} kg`} · ${destino.nombre} · ${n2(p.kgEmbarque)} kg`} value={nombre} maxLength={120} onChange={(ev) => setNombre(ev.target.value)} />
            <button className="btn btn-sm btn-solid" type="button" disabled={busy || errores.length > 0 || sinFlete || nombre.trim().length < 3} onClick={guardar}>
              Guardar referencia
            </button>
            {sinFlete && <small>Para guardarla falta la tarifa del flete: una referencia ancla precios.</small>}
            {mensaje("guardar")}
          </div>
        </aside>
      </div>

      <section className={e.panel}>
        <div className={e.head}><h2>El cálculo, línea por línea</h2><small>{modo.nombre} · {destino.nombre} · TRM {n2(p.trm)}</small></div>
        <div className={table.scroll}>
          <table className={table.t}>
            <thead>
              <tr><th>Concepto</th><th className={table.r}>Cantidad</th><th className={table.r}>Unitario</th><th className={table.r}>COP</th><th className={table.r}>US$/kg</th></tr>
            </thead>
            <tbody>
              {r.secciones.map((s) => (
                <SeccionFilas key={s.clave} nombre={s.nombre} color={COLOR[s.clave]} cop={s.cop} usdKg={s.usdKg} kg={p.kgEmbarque} trm={p.trm} lineas={s.lineas} />
              ))}
              <tr className={e.filaTotal}>
                <td>Total hasta {destino.incoterm}</td><td /><td /><td className={table.r}>{cop(r.totalCop)}</td><td className={table.r}>{usd(r.usdKg, 3)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className={e.panel}>
        <div className={e.head}><h2>Los cinco modos con este embarque</h2><small>mismo destino, trámites y TRM</small></div>
        <div className={table.scroll}>
          <table className={table.t}>
            <thead>
              <tr><th>Modo</th><th className={table.r}>Unidades</th><th className={table.r}>Empaque /kg</th><th className={table.r}>Paletizado /kg</th><th className={table.r}>Total hasta FOB /kg</th><th className={table.r}>Frente al actual</th><th className={table.acts} /></tr>
            </thead>
            <tbody>
              {comparacion.map(({ m, actual, r: q }) => {
                const delta = q.usdKg - r.usdKg;
                return (
                  <tr key={m.id}>
                    <td><span className={table.strong}>{m.nombre}</span>{actual && <span className={table.tag}>el actual</span>}</td>
                    <td className={table.r}>{q.unidades} {m.tipo === "vacio" ? `bolsas · ${q.cajas} cajas` : "sacos"}</td>
                    <td className={table.r}>{usd(q.secciones[0].usdKg)}</td>
                    <td className={table.r}>{usd(q.secciones[1].usdKg)}</td>
                    <td className={table.r}><span className={table.strong}>{usd(q.usdKg)}</span></td>
                    <td className={table.r}>{actual ? "—" : conSigno(delta)}</td>
                    <td className={table.acts}>{!actual && <button className="btn btn-sm" type="button" onClick={() => cambiarModo(m.id)}>Usar</button>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className={e.nota}>Los otros modos van con los costos por defecto de sus materiales; el actual, con lo que está escrito arriba.</p>
      </section>

      <section className={e.panel}>
        <div className={e.head}><h2>Frente a los estimados del Modelo Económico</h2><small>PVC v2.1.1 · US$ por kg de verde</small></div>
        <div className={table.scroll}>
          <table className={table.t}>
            <thead><tr><th>Concepto</th><th className={table.r}>Este cálculo</th><th className={table.r}>Estimado del PVC</th><th className={table.r}>Diferencia</th><th>Ojo</th></tr></thead>
            <tbody>
              {([
                ["empaque", ESTIMADOS_DEL_PVC.empaqueConTrilla, "El del PVC suma además la trilla y la selección: no es el mismo concepto."],
                ["paletizado", ESTIMADOS_DEL_PVC.paletizado, ""],
                ["transporte", ESTIMADOS_DEL_PVC.transporte, ""],
                ["tramites", ESTIMADOS_DEL_PVC.tramites, "Son costos por embarque: con más kg, menos por kg. El del PVC no separa la contribución cafetera."],
              ] as const).map(([k, pvc, ojo]) => {
                const aqui = seccion(k).usdKg;
                return (
                  <tr key={k}>
                    <td><i className={e.punto} style={{ background: COLOR[k] }} />{seccion(k).nombre}</td>
                    <td className={table.r}>{usd(aqui)}</td>
                    <td className={table.r}>{usd(pvc)}</td>
                    <td className={table.r}>{conSigno(aqui - pvc)}</td>
                    <td className={table.muted}>{ojo}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className={e.panel} id="referencias">
        <div className={e.head}>
          <h2>Referencias guardadas</h2>
          <small>
            {vigentes.length} vigente{vigentes.length === 1 ? "" : "s"}
            {referencias.length > vigentes.length && (
              <> · <button type="button" className={e.enlace} onClick={() => setVerRetiradas(!verRetiradas)}>{verRetiradas ? "ocultar las retiradas" : `ver también ${referencias.length - vigentes.length} retirada${referencias.length - vigentes.length === 1 ? "" : "s"}`}</button></>
            )}
          </small>
        </div>
        {mensaje("lista")}
        {visibles.length === 0 ? (
          <p className={e.nota}>Aún no hay referencias. Ajuste el embarque, escriba la tarifa del flete y guárdelo con un nombre.</p>
        ) : (
          <div className={table.scroll}>
            <table className={table.t}>
              <thead>
                <tr><th>Referencia</th><th>Modo · salida</th><th className={table.r}>Embarque</th><th className={table.r}>Hasta FOB</th><th className={table.r}>TRM</th><th>Guardada</th><th className={table.acts} /></tr>
              </thead>
              <tbody>
                {visibles.map((ref) => (
                  <tr key={ref.id} className={ref.estado === "retirada" ? e.retirada : undefined}>
                    <td>
                      <span className={table.strong}>{ref.codigo}</span> {ref.nombre}
                      {ref.estado === "retirada" && <small>Retirada el {ref.retiradaEl ? day(ref.retiradaEl) : "—"}{ref.motivoRetiro ? ` · ${ref.motivoRetiro}` : ""}</small>}
                    </td>
                    <td>{ref.modoNombre}<small>{ref.destinoNombre} · {ref.incoterm}</small></td>
                    <td className={table.r}>{n2(ref.kgEmbarque)} kg</td>
                    <td className={table.r}><span className={table.strong}>{usd(ref.usdKg)}</span><small>{copKg(ref.copKg)} COP/kg</small></td>
                    <td className={table.r}>{n2(ref.trm)}</td>
                    <td>{day(ref.creadaEl)}</td>
                    <td className={table.acts}>
                      <span className={e.acciones}>
                        <button className="btn btn-sm" type="button" onClick={() => cargar(ref)}>Cargar</button>
                        {ref.estado === "vigente" && (
                          <button className="btn btn-sm" type="button" onClick={() => setRetirando(retirando?.id === ref.id ? null : { id: ref.id, motivo: "" })}>
                            {retirando?.id === ref.id ? "Cancelar" : "Retirar"}
                          </button>
                        )}
                      </span>
                      {retirando?.id === ref.id && (
                        <span className={e.retiro}>
                          <input aria-label={`Por qué se retira ${ref.codigo}`} placeholder="Por qué se retira" value={retirando.motivo} maxLength={300} onChange={(ev) => setRetirando({ id: ref.id, motivo: ev.target.value })} />
                          <button className="btn btn-sm btn-solid" type="button" disabled={busy || retirando.motivo.trim().length < 3} onClick={retirar}>Retirarla</button>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className={e.nota}>Una referencia no se edita ni se borra: se retira, y los lotes que ya se anclaron en ella conservan su cifra.</p>
      </section>
    </>
  );
}

function SeccionFilas({ nombre, color, cop: total, usdKg, kg, trm, lineas }: { nombre: string; color: string; cop: number; usdKg: number; kg: number; trm: number; lineas: ReturnType<typeof calcularEmpaqueFob>["secciones"][number]["lineas"] }) {
  return (
    <>
      <tr className={e.filaSeccion}>
        <td><i className={e.punto} style={{ background: color }} />{nombre}</td><td /><td /><td className={table.r}>{cop(total)}</td><td className={table.r}>{usd(usdKg, 3)}</td>
      </tr>
      {lineas.length === 0 ? (
        <tr><td className={table.muted} colSpan={5}>— sin costo —</td></tr>
      ) : (
        lineas.map((l) => (
          <tr key={l.nombre}>
            <td className={e.sangria}>{l.nombre}</td>
            <td className={table.r}>{l.cantidad != null ? `${n2(l.cantidad)} ${l.unidad ?? ""}` : ""}</td>
            <td className={table.r}>{l.unitario != null ? cop(l.unitario) : ""}</td>
            <td className={table.r}>{cop(l.cop)}</td>
            <td className={table.r}>{kg > 0 && trm > 0 ? usd(l.cop / kg / trm, 3) : "—"}</td>
          </tr>
        ))
      )}
    </>
  );
}
