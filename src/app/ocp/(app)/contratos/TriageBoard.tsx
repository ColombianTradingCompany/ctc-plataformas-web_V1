"use client";

// ── OCP · Catálogo · Triage de Catálogo Activo (V5.196) ────────────────────────────────────────────────────────────────────────
// El owner, 2026-10-09: «en las "Ofertas CP Aceptadas" (que quiero que rebauticemos como "Triage de Catálogo Activo") debo recibir
// las ofertas que fueron aceptadas y también las cantidades del Stock CTCx, añadirles una referencia de costos de empaque hasta FOB,
// poner el O&P de CTCx y declararlo con ello como parte del catálogo activo». Dos entradas —los tratos por ventana vigentes y el
// Stock CTCx—; cada una se corrige o se acepta tal cual y se declara con su FOB mínimo, que se desglosa en vivo con la misma cuenta
// que guarda la base (`src/lib/triage/fobMinimo.ts` · `triage_declarar`). Al lado, el N2 de su banda en el PVC vigente: se exhibe,
// no gobierna.

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ESTADO_INFO, fmtCop, fmtKg } from "@/lib/stock/linaje";
import { calcularFobMinimo, empaqueSinEmpacar, precioInicial } from "@/lib/triage/fobMinimo";
import type { Declaracion, EntradaContrato, EntradaStock, LoteDelTriage, Triage } from "@/lib/triage/servidor";
import { declararEnCatalogo, guardarAjustesDelTriage, retirarDelCatalogo } from "../triageActions";
import shared from "@/components/panel/shared.module.css";
import s from "./triage.module.css";

const COLOR_GRADO: Record<string, string> = { black: "#2b2b2b", red: "#b42318", blue: "#1f5fa8", gold: "#b8860b", tyrian: "#6b2c91" };
const NOMBRE_GRADO: Record<string, string> = { black: "Black", red: "Red", blue: "Blue", gold: "Gold", tyrian: "Tyrian" };
const conGrado = (g: string | null) => ({ ["--g" as string]: COLOR_GRADO[g ?? ""] ?? "#6b7280" }) as React.CSSProperties;
const usd = (v: number, d = 2) => `US$ ${new Intl.NumberFormat("es-CO", { minimumFractionDigits: d, maximumFractionDigits: d }).format(v)}`;
const pct = (v: number) => `${new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 }).format(v)} %`;
const fecha = (iso: string | null) => (iso ? new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" }) : "—");

/** «5.000» (miles a la colombiana), «0,6264», «32200». */
function num(v: string): number {
  let t = String(v ?? "").trim().replace(/[\s$%]/g, "");
  t = /^[1-9]\d{0,2}(\.\d{3})+(,\d+)?$/.test(t) ? t.replace(/\./g, "").replace(",", ".") : t.replace(",", ".");
  const x = Number(t);
  return Number.isFinite(x) ? x : NaN;
}
/** Un número para una casilla, con COMA decimal: «597.444» se leería como 597 444 (el punto es de miles en `num`). */
const str = (n: number | null | undefined, dec = 4) => (n == null || !Number.isFinite(n) ? "" : String(Math.round(n * 10 ** dec) / 10 ** dec).replace(".", ","));

/** Lo que el formulario de declarar necesita saber de una entrada (de un contrato, de una partida o de una declaración que se corrige). */
type Entrada = {
  clave: string;
  tipo: "contrato" | "stock";
  contractId: string | null;
  partidaId: string | null;
  lote: LoteDelTriage;
  /** COP por kg de origen (CPS del contrato o costo de la partida). */
  precioOrigenCopKg: number;
  conversion: number;
  conversionEditable: boolean;
  maxKgVerde: number;
  yaEmpacada: boolean;
  conTrilla: boolean;
  tieneListado: boolean;
  reemplaza: Declaracion | null;
};

export function TriageBoard({ triage }: { triage: Triage }) {
  const router = useRouter();
  const [abierta, setAbierta] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ texto: string; error: boolean } | null>(null);
  const { ajustes, edicion, referencias, contratos, stock, declaraciones, listados } = triage;
  const vivas = declaraciones.filter((d) => d.viva);
  const listadoDe = useMemo(() => new Set(listados.filter((l) => l.status !== "archived").map((l) => l.lotId)), [listados]);
  const kgEnCatalogo = vivas.reduce((a, d) => a + d.kgVerde, 0);
  const porDeclararVerde = contratos.reduce((a, c) => a + c.porDeclararKg * c.conversion, 0) + stock.filter((x) => x.declarable).reduce((a, x) => a + x.disponibleKg * x.conversion, 0);
  const alertas = contratos.filter((c) => c.deMasKg > 0).length + vivas.filter((d) => d.contratoVigente === false).length;
  const listo = () => {
    setAbierta(null);
    router.refresh();
  };

  const deContrato = (c: EntradaContrato, reemplaza: Declaracion | null = null): Entrada => ({
    clave: reemplaza ? `f:${reemplaza.id}` : `c:${c.contractId}`,
    tipo: "contrato",
    contractId: c.contractId,
    partidaId: null,
    lote: c.lote,
    precioOrigenCopKg: c.precioCopKgCps,
    conversion: reemplaza?.conversion ?? c.conversion,
    conversionEditable: true,
    maxKgVerde: Math.round((c.porDeclararKg + (reemplaza?.kgOrigen ?? 0)) * (reemplaza?.conversion ?? c.conversion) * 1000) / 1000,
    yaEmpacada: false,
    conTrilla: true,
    tieneListado: listadoDe.has(c.lote.id),
    reemplaza,
  });
  const deStock = (x: EntradaStock, reemplaza: Declaracion | null = null): Entrada => ({
    clave: reemplaza ? `f:${reemplaza.id}` : `s:${x.partidaId}`,
    tipo: "stock",
    contractId: null,
    partidaId: x.partidaId,
    lote: x.lote,
    precioOrigenCopKg: x.costoCopKg,
    conversion: reemplaza?.conversion ?? x.conversion,
    conversionEditable: x.contenido !== "verde",
    maxKgVerde: Math.round((x.disponibleKg + (reemplaza?.kgOrigen ?? 0)) * (reemplaza?.conversion ?? x.conversion) * 1000) / 1000,
    yaEmpacada: x.estado === "empacado",
    conTrilla: x.contenido === "pergamino",
    tieneListado: listadoDe.has(x.lote.id),
    reemplaza,
  });

  return (
    <>
      <h1 className={shared.title}>Triage de Catálogo Activo</h1>
      <p className={shared.subtitle}>
        El punto de control entre lo que los productores aceptaron, lo que está físicamente en CTCx y lo que se ofrece: cada entrada se corrige
        o se acepta y se declara en el <Link href="/ocp/catalogo">Catálogo Activo</Link> con su <b>FOB mínimo</b> —el café, más el Empacado hasta
        FOB de una referencia del ECP, más el O&P de CTCx—, que es el ancla de su precio: el lote no se vende por debajo. Los contratos, sus
        despachos y la humedad siguen en las otras pestañas.
      </p>

      <Ajustes ajustes={ajustes} edicion={edicion} onGuardado={() => router.refresh()} />
      {ajustes.opPct == null && <p className={s.aviso}>Falta el <b>O&P de CTCx</b>: escríbalo en los ajustes (arriba) para declarar con él por defecto.</p>}
      {referencias.length === 0 && (
        <p className={s.aviso}>
          No hay referencias de <b>Empacado hasta FOB</b> vigentes: guarde una (con la tarifa real del flete) en{" "}
          <Link href="/ecp/cotizador-empaque">ECP · Modelo de Producción → Empacado hasta FOB</Link>. Sin ella no se declara.
        </p>
      )}
      {aviso && <p className={aviso.error ? s.error : s.ok} role="status">{aviso.texto}</p>}

      <div className={s.kpis}>
        <div className={s.kpi}><span>Por declarar</span><b>≈ {fmtKg(Math.round(porDeclararVerde))} kg</b><span>de verde, en contratos y stock</span></div>
        <div className={s.kpi}><span>En el Catálogo Activo</span><b>{fmtKg(Math.round(kgEnCatalogo * 10) / 10)} kg</b><span>{vivas.length} entrada{vivas.length === 1 ? "" : "s"} · {listados.filter((l) => l.status !== "archived").length} listado{listados.filter((l) => l.status !== "archived").length === 1 ? "" : "s"}</span></div>
        <div className={s.kpi}><span>TRM</span><b>{edicion ? fmtKg(edicion.trm) : "—"}</b><span>{edicion ? `edición ${edicion.codigo}` : "sin edición vigente"}</span></div>
        <div className={s.kpi}><span>Declarado de más</span><b>{alertas}</b><span>{alertas ? "corregir abajo" : "todo en regla"}</span></div>
      </div>

      <section className={s.seccion}>
        <h2>Desde los contratos</h2>
        <p>Los tratos por ventana vigentes: el café sigue en la finca y se vende desde aquí. Lo que se puede ofrecer es lo declarado menos lo retirado.</p>
        {contratos.length === 0 ? (
          <p className={s.vacio}>No hay tratos por ventana vigentes.</p>
        ) : (
          <div className={s.lista}>
            {contratos.map((c) => {
              const enVivo = vivas.filter((d) => d.contractId === c.contractId);
              return (
                <article key={c.contractId} className={s.entrada} style={conGrado(c.lote.grade)}>
                  <div className={s.entradaHead}>
                    <h3>
                      <Link href={`/ocp/contratos/${c.contractId}`}>{c.lote.name}</Link>
                      <span className={s.grado}>{NOMBRE_GRADO[c.lote.grade ?? ""] ?? c.lote.grade}</span>
                    </h3>
                    <small>{c.lote.producerName}{c.lote.fincaName ? ` · ${c.lote.fincaName}` : ""} · ventana {c.ventanaTipo} hasta {fecha(c.vigenciaHasta)}</small>
                  </div>
                  <div className={s.cifras}>
                    <span>Precio <b>{fmtCop(c.precioCopKgCps)}/kg CPS</b></span>
                    <span>Declarado <b>{fmtKg(c.declaradoKg)} kg</b>{c.retiradoKg > 0 ? ` · retirado ${fmtKg(c.retiradoKg)}` : ""}{c.vendidoKg > 0 ? ` · vendido ${fmtKg(c.vendidoKg)}` : ""}</span>
                    <span>Por declarar <b>{fmtKg(c.porDeclararKg)} kg CPS</b> ≈ {fmtKg(Math.round(c.porDeclararKg * c.conversion))} kg verde</span>
                    <span>{c.conversionFuente === "factor" ? `FR ${fmtKg(Math.round((c.lote.fr ?? 0) * 100) / 100)}` : "sin FR (PVC: FR 94)"} → {str(c.conversion)} kg verde/kg CPS</span>
                    {c.enCatalogoKg > 0 && <span className={s.estadoCatalogo}>✓ en el catálogo: {fmtKg(c.enCatalogoKg)} kg CPS</span>}
                  </div>
                  {c.deMasKg > 0 && <p className={s.alerta}>Declarado de más: {fmtKg(c.deMasKg)} kg de CPS por encima de lo que el contrato puede ofrecer (el productor retiró café). Corrija la declaración.</p>}
                  <div className={s.botones}>
                    {c.porDeclararKg > 0 && enVivo.length === 0 && abierta !== `c:${c.contractId}` && (
                      <button className="btn btn-sm btn-solid" type="button" onClick={() => setAbierta(`c:${c.contractId}`)}>Declarar</button>
                    )}
                    {c.porDeclararKg > 0 && enVivo.length > 0 && <span className={s.cifras}>Una declaración por contrato: para declarar más, corrija {enVivo[0].codigo}.</span>}
                    {enVivo.map((d) => abierta !== `f:${d.id}` && (
                      <button key={d.id} className="btn btn-sm" type="button" onClick={() => setAbierta(`f:${d.id}`)}>Corregir {d.codigo}</button>
                    ))}
                  </div>
                  {abierta === `c:${c.contractId}` && <DeclararForm entrada={deContrato(c)} triage={triage} onCancelar={() => setAbierta(null)} onListo={(t) => { setAviso({ texto: t, error: false }); listo(); }} />}
                  {enVivo.map((d) => abierta === `f:${d.id}` && <DeclararForm key={d.id} entrada={deContrato(c, d)} triage={triage} onCancelar={() => setAbierta(null)} onListo={(t) => { setAviso({ texto: t, error: false }); listo(); }} />)}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className={s.seccion}>
        <h2>Desde el Stock CTCx</h2>
        <p>
          Las partidas libres del <Link href="/ocp/stock">Stock CTCx</Link> (lo comprometido no entra). Se declara pergamino —convertido a verde— o verde,
          también empacado; lo tostado se ve, pero la tienda Green vende verde.
        </p>
        {stock.length === 0 ? (
          <p className={s.vacio}>No hay partidas libres con disponible.</p>
        ) : (
          <div className={s.lista}>
            {stock.map((x) => {
              const enVivo = vivas.filter((d) => d.partidaId === x.partidaId);
              return (
                <article key={x.partidaId} className={s.entrada} style={conGrado(x.lote.grade)}>
                  <div className={s.entradaHead}>
                    <h3>
                      <Link href={`/ocp/stock?partida=${x.partidaId}`}>{x.codigo}</Link> · {x.lote.name}
                      <span className={s.grado}>{NOMBRE_GRADO[x.lote.grade ?? ""] ?? x.lote.grade}</span>
                    </h3>
                    <small>{ESTADO_INFO[x.estado].nombre}{x.estado === "empacado" ? ` de ${x.contenido}` : ""}{x.presentacion ? ` · ${x.presentacion}` : ""} · {x.lote.producerName}</small>
                  </div>
                  <div className={s.cifras}>
                    <span>Costo <b>{fmtCop(x.costoCopKg)}/kg</b> de {x.contenido}</span>
                    <span>Disponible <b>{fmtKg(x.disponibleKg)} kg</b>{x.contenido === "pergamino" ? ` ≈ ${fmtKg(Math.round(x.disponibleKg * x.conversion * 10) / 10)} kg verde` : ""}</span>
                    {x.declaradoKg > 0 && <span className={s.estadoCatalogo}>✓ en el catálogo: {fmtKg(x.declaradoKg)} kg</span>}
                  </div>
                  <div className={s.botones}>
                    {!x.declarable && <span className={s.cifras}>No se declara: la tienda Green vende verde.</span>}
                    {x.declarable && x.disponibleKg > 0 && enVivo.length === 0 && abierta !== `s:${x.partidaId}` && (
                      <button className="btn btn-sm btn-solid" type="button" onClick={() => setAbierta(`s:${x.partidaId}`)}>Declarar</button>
                    )}
                    {x.declarable && x.disponibleKg > 0 && enVivo.length > 0 && <span className={s.cifras}>Una declaración por partida: para declarar más, corrija {enVivo[0].codigo}.</span>}
                    {enVivo.map((d) => abierta !== `f:${d.id}` && (
                      <button key={d.id} className="btn btn-sm" type="button" onClick={() => setAbierta(`f:${d.id}`)}>Corregir {d.codigo}</button>
                    ))}
                  </div>
                  {abierta === `s:${x.partidaId}` && <DeclararForm entrada={deStock(x)} triage={triage} onCancelar={() => setAbierta(null)} onListo={(t) => { setAviso({ texto: t, error: false }); listo(); }} />}
                  {enVivo.map((d) => abierta === `f:${d.id}` && <DeclararForm key={d.id} entrada={deStock(x, d)} triage={triage} onCancelar={() => setAbierta(null)} onListo={(t) => { setAviso({ texto: t, error: false }); listo(); }} />)}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className={s.seccion}>
        <h2>En el Catálogo Activo</h2>
        <p>Lo declarado, por lote. El ancla de cada listado es su FOB mínimo más alto; lo comercial (precio, unidad, MOQ) se edita en el <Link href="/ocp/catalogo">Catálogo Activo</Link>.</p>
        {vivas.length === 0 ? (
          <p className={s.vacio}>Nada declarado todavía.</p>
        ) : (
          <div className={s.lista}>
            {listados.filter((l) => vivas.some((d) => d.listingId === l.id)).map((l) => (
              <article key={l.id} className={s.entrada} style={conGrado(l.grade)}>
                <div className={s.entradaHead}>
                  <h3>
                    {l.lotName}
                    <span className={s.grado}>{NOMBRE_GRADO[l.grade ?? ""] ?? l.grade}</span>
                  </h3>
                  <small>{l.publicCode ? <code>{l.publicCode}</code> : null} · {fmtKg(l.totalKg)} kg de verde · vendidos {fmtKg(l.vendidoKg)} · precio {usd(l.precioUsdKg)}/kg{l.anclaUsdKg != null ? ` · ancla ${usd(l.anclaUsdKg, 3)}/kg` : ""}</small>
                </div>
                {vivas.filter((d) => d.listingId === l.id).map((d) => (
                  <DeclaracionFila key={d.id} d={d} onRetirada={() => { setAviso({ texto: `${d.codigo} retirada.`, error: false }); router.refresh(); }} onError={(t) => setAviso({ texto: t, error: true })} />
                ))}
              </article>
            ))}
          </div>
        )}
        {declaraciones.some((d) => !d.viva) && (
          <details style={{ marginTop: 10 }}>
            <summary className={shared.meta} style={{ cursor: "pointer" }}>Retiradas ({declaraciones.filter((d) => !d.viva).length})</summary>
            <ul className={shared.meta}>
              {declaraciones.filter((d) => !d.viva).map((d) => (
                <li key={d.id}>{d.codigo} · {fmtKg(d.kgVerde)} kg · FOB {usd(d.fobUsdKg, 3)} · retirada el {fecha(d.retiradaEl)}: {d.motivoRetiro}</li>
              ))}
            </ul>
          </details>
        )}
      </section>
    </>
  );
}

// ── Los ajustes: el O&P de CTCx y la trilla por defecto ────────────────────────────────────────────────────────────────────────
function Ajustes({ ajustes, edicion, onGuardado }: { ajustes: Triage["ajustes"]; edicion: Triage["edicion"]; onGuardado: () => void }) {
  const [editando, setEditando] = useState(false);
  const [op, setOp] = useState(str(ajustes.opPct, 4));
  const [trilla, setTrilla] = useState(str(ajustes.trillaCopKgCps, 2));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function guardar() {
    setBusy(true);
    setError(null);
    const r = await guardarAjustesDelTriage({ opPct: num(op), trillaCopKgCps: num(trilla || "0") });
    setBusy(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setEditando(false);
    onGuardado();
  }
  return (
    <div className={s.ajustes}>
      {!editando ? (
        <>
          <dl>
            <div><dt>O&P de CTCx</dt><dd>{ajustes.opPct != null ? pct(ajustes.opPct) : "sin escribir"}</dd></div>
            <div><dt>Trilla por defecto</dt><dd>{ajustes.trillaCopKgCps != null ? `${fmtCop(ajustes.trillaCopKgCps)}/kg CPS` : "sin escribir"}</dd></div>
            <div><dt>TRM (PVC vigente)</dt><dd>{edicion ? `${fmtKg(edicion.trm)} · ${edicion.codigo}` : "sin edición vigente"}</dd></div>
          </dl>
          <button className="btn btn-sm" type="button" onClick={() => setEditando(true)}>Editar ajustes</button>
        </>
      ) : (
        <>
          <div className={s.campos} style={{ flex: 1 }}>
            <div className={s.campo}>
              <label htmlFor="aj-op">O&P de CTCx (%)</label>
              <input id="aj-op" inputMode="decimal" value={op} onChange={(e) => setOp(e.target.value)} />
              <small>Sobre café + empacado hasta FOB. Vive solo en la base.</small>
            </div>
            <div className={s.campo}>
              <label htmlFor="aj-trilla">Trilla (COP por kg de CPS)</label>
              <input id="aj-trilla" inputMode="numeric" value={trilla} onChange={(e) => setTrilla(e.target.value)} />
              <small>La maquila de pasar pergamino a verde.</small>
            </div>
          </div>
          <div className={s.botones} style={{ marginTop: 0 }}>
            {error && <span className={s.error}>{error}</span>}
            <button className="btn btn-sm" type="button" onClick={() => setEditando(false)}>Cancelar</button>
            <button className="btn btn-sm btn-solid" type="button" disabled={busy || !(num(op) >= 0)} onClick={guardar}>{busy ? "Guardando…" : "Guardar"}</button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Declarar (o corregir) una entrada ─────────────────────────────────────────────────────────────────────────────────────────
function DeclararForm({ entrada, triage, onCancelar, onListo }: { entrada: Entrada; triage: Triage; onCancelar: () => void; onListo: (texto: string) => void }) {
  const { ajustes, edicion, referencias } = triage;
  const r0 = entrada.reemplaza;
  const refInicial = (r0 && referencias.find((r) => r.id === r0.referenciaId)) ?? referencias[0] ?? null;
  const empaqueDe = (refId: string) => {
    const ref = referencias.find((r) => r.id === refId);
    if (!ref) return NaN;
    return entrada.yaEmpacada ? empaqueSinEmpacar(ref) : ref.copKg;
  };
  const [kg, setKg] = useState(str(r0?.kgVerde ?? entrada.maxKgVerde, 3));
  const [conversion, setConversion] = useState(str(entrada.conversion, 6));
  const [trilla, setTrilla] = useState(str(r0?.trillaCopKg ?? (entrada.conTrilla ? ajustes.trillaCopKgCps ?? 0 : 0), 2));
  const [refId, setRefId] = useState(refInicial?.id ?? "");
  const [empaque, setEmpaque] = useState(str(r0?.empaqueCopKg ?? (refInicial ? empaqueDe(refInicial.id) : NaN), 2));
  const [op, setOp] = useState(str(r0?.opPct ?? ajustes.opPct, 4));
  const [trm, setTrm] = useState(str(r0?.trm ?? edicion?.trm, 2));
  const [nota, setNota] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const conv = entrada.conversionEditable ? num(conversion) : 1;
  const d = calcularFobMinimo({ precioOrigenCopKg: entrada.precioOrigenCopKg, trillaCopKg: entrada.conTrilla ? num(trilla || "0") : 0, conversion: conv, empaqueCopKg: num(empaque), opPct: num(op), trm: num(trm) });
  const n2 = edicion?.n2[entrada.lote.grade ?? ""] ?? null;
  const kgN = num(kg);
  const valida = !!d && kgN > 0 && kgN <= entrada.maxKgVerde + 0.0005 && !!refId;

  async function enviar() {
    setBusy(true);
    setError(null);
    const r = await declararEnCatalogo({
      tipo: entrada.tipo,
      contractId: entrada.contractId,
      partidaId: entrada.partidaId,
      kgVerde: kgN,
      conversion: conv,
      trillaCopKg: entrada.conTrilla ? num(trilla || "0") : 0,
      referenciaId: refId,
      empaqueCopKg: num(empaque),
      opPct: num(op),
      trm: num(trm),
      nota: nota || null,
      reemplaza: r0?.id ?? null,
    });
    setBusy(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    onListo(r0 ? `${r0.codigo} corregida: la reemplaza ${r.codigo ?? "una declaración nueva"}.` : `Declarada ${r.codigo ?? ""} en el Catálogo Activo.`);
  }

  return (
    <div className={s.declarar}>
      <div>
        <div className={s.campos}>
          <div className={s.campo}>
            <label htmlFor={`kg-${entrada.clave}`}>Kg de verde</label>
            <input id={`kg-${entrada.clave}`} inputMode="decimal" value={kg} onChange={(e) => setKg(e.target.value)} />
            <small>hasta {fmtKg(entrada.maxKgVerde)} kg</small>
          </div>
          {entrada.conversionEditable && (
            <div className={s.campo}>
              <label htmlFor={`conv-${entrada.clave}`}>Conversión</label>
              <input id={`conv-${entrada.clave}`} inputMode="decimal" value={conversion} onChange={(e) => setConversion(e.target.value)} />
              <small>kg de verde por kg de CPS (70 ÷ FR × 78 ÷ 93,09)</small>
            </div>
          )}
          {entrada.conTrilla && (
            <div className={s.campo}>
              <label htmlFor={`tri-${entrada.clave}`}>Trilla (COP/kg CPS)</label>
              <input id={`tri-${entrada.clave}`} inputMode="numeric" value={trilla} onChange={(e) => setTrilla(e.target.value)} />
            </div>
          )}
          <div className={s.campo} style={{ gridColumn: "1 / -1" }}>
            <label htmlFor={`ref-${entrada.clave}`}>Empacado hasta FOB</label>
            <select id={`ref-${entrada.clave}`} value={refId} onChange={(e) => { setRefId(e.target.value); setEmpaque(str(empaqueDe(e.target.value), 2)); }}>
              {referencias.length === 0 && <option value="">— no hay referencias vigentes —</option>}
              {referencias.map((r) => (
                <option key={r.id} value={r.id}>{r.codigo} · {r.nombre} · {usd(r.usdKg)}/kg ({fmtCop(r.copKg)})</option>
              ))}
            </select>
            {entrada.yaEmpacada && <small>Esta partida ya está empacada: por defecto, la referencia sin su sección de empaque.</small>}
          </div>
          <div className={s.campo}>
            <label htmlFor={`emp-${entrada.clave}`}>Empacado (COP/kg verde)</label>
            <input id={`emp-${entrada.clave}`} inputMode="numeric" value={empaque} onChange={(e) => setEmpaque(e.target.value)} />
          </div>
          <div className={s.campo}>
            <label htmlFor={`op-${entrada.clave}`}>O&P de CTCx (%)</label>
            <input id={`op-${entrada.clave}`} inputMode="decimal" value={op} placeholder="de los ajustes" onChange={(e) => setOp(e.target.value)} />
          </div>
          <div className={s.campo}>
            <label htmlFor={`trm-${entrada.clave}`}>TRM</label>
            <input id={`trm-${entrada.clave}`} inputMode="decimal" value={trm} onChange={(e) => setTrm(e.target.value)} />
          </div>
          <div className={s.campo} style={{ gridColumn: "1 / -1" }}>
            <label htmlFor={`nota-${entrada.clave}`}>Nota</label>
            <input id={`nota-${entrada.clave}`} value={nota} maxLength={500} placeholder={r0 ? "por qué se corrige" : "opcional"} onChange={(e) => setNota(e.target.value)} />
          </div>
        </div>
        {error && <p className={s.error}>{error}</p>}
        <div className={s.botones}>
          <button className="btn btn-sm" type="button" onClick={onCancelar}>Cancelar</button>
          <button className="btn btn-sm btn-solid" type="button" disabled={busy || !valida} onClick={enviar}>
            {busy ? "Declarando…" : r0 ? `Corregir ${r0.codigo}` : "Declarar en el Catálogo Activo"}
          </button>
        </div>
      </div>
      <div className={s.desglose} aria-live="polite">
        <span className={shared.meta}>FOB mínimo por kg de verde</span>
        <div className={s.fob}>{d ? usd(d.fobUsdKg, 3) : "—"}</div>
        {d && (
          <table>
            <tbody>
              <tr><td>Café {entrada.conversionEditable ? `((${fmtCop(entrada.precioOrigenCopKg)}${entrada.conTrilla ? " + trilla" : ""}) ÷ ${str(conv, 4)})` : ""}</td><td>{fmtCop(d.cafeCopKg)}</td></tr>
              <tr><td>+ Empacado hasta FOB</td><td>{fmtCop(num(empaque))}</td></tr>
              <tr><td>= Base</td><td>{fmtCop(d.baseCopKg)}</td></tr>
              <tr><td>+ O&P</td><td>{fmtCop(d.opCopKg)}</td></tr>
              <tr className={s.total}><td>FOB mínimo</td><td>{fmtCop(d.fobCopKg)}</td></tr>
            </tbody>
          </table>
        )}
        <small>
          {n2 != null ? <>N2 del Modelo Económico para {NOMBRE_GRADO[entrada.lote.grade ?? ""] ?? "su banda"} (FCA Bogotá ≈ FOB): <b>{usd(n2, 3)}</b>/kg{d ? ` (${d.fobUsdKg > n2 ? "+" : "−"}${usd(Math.abs(d.fobUsdKg - n2), 2)})` : ""} — se exhibe, no gobierna.</> : "Sin N2 del PVC para esta banda."}
          {d && !entrada.tieneListado && <> El lote aún no tiene listado: nace publicado a <b>{usd(precioInicial(d.fobUsdKg))}</b>/kg (el FOB mínimo redondeado hacia arriba a US$ 0,05).</>}
        </small>
      </div>
    </div>
  );
}

function DeclaracionFila({ d, onRetirada, onError }: { d: Declaracion; onRetirada: () => void; onError: (t: string) => void }) {
  const [motivo, setMotivo] = useState("");
  const [busy, setBusy] = useState(false);
  async function retirar() {
    setBusy(true);
    const r = await retirarDelCatalogo(d.id, motivo);
    setBusy(false);
    if (!r.ok) {
      onError(r.error);
      return;
    }
    onRetirada();
  }
  return (
    <div className={s.declaracion}>
      <div>
        <b>{d.codigo}</b> · {d.tipo === "contrato" ? "contrato" : `stock ${d.partidaCodigo ?? ""}`} · <b>{fmtKg(d.kgVerde)} kg</b> de verde ({fmtKg(d.kgOrigen)} kg de origen × {str(d.conversion, 4)})
        {d.contratoVigente === false && <span className={s.alerta} style={{ display: "block" }}>El contrato ya no está vigente: retire esta declaración.</span>}
        <small>
          café {fmtCop(d.cafeCopKg)} + empacado {fmtCop(d.empaqueCopKg)} ({d.referenciaCodigo}) + O&P → FOB mínimo <b>{fmtCop(d.fobCopKg)}</b> · <b>{usd(d.fobUsdKg, 3)}</b>/kg a TRM {fmtKg(d.trm)}
          {d.pvcN2UsdKg != null ? ` · N2 ${usd(d.pvcN2UsdKg, 3)}` : ""} · {fecha(d.creadaEl)}{d.nota ? ` · ${d.nota}` : ""}
        </small>
      </div>
      <div className={s.retirar}>
        <input aria-label={`Motivo para retirar ${d.codigo}`} placeholder="Motivo para retirarla" value={motivo} maxLength={300} onChange={(e) => setMotivo(e.target.value)} />
        <button className="btn btn-sm" type="button" disabled={busy || motivo.trim().length < 3} onClick={retirar}>{busy ? "…" : "Retirar"}</button>
      </div>
    </div>
  );
}
