"use client";

// ── CTCx Coffee Datasheet Tool (V6.6, owner 2026-10-23) ───────────────────────────────────────────────────────────────
// «It does not look at all like the interface in the Centro de Calidad, it MUST be the SAME, adding to it the option to
// include the Extrinsic Characterization (I do like the "Parts to fill in").» Desde la V6.6 esta herramienta del taller
// RENDERIZA la planilla del Centro de Calidad —`LabEvalEditor`, el mismo componente que usan el Centro, el OCP y la
// Arena— y le suma las partes que la planilla no tiene porque el Q-Grader cata a ciegas: B1, la Caracterización
// Extrínseca (SCA 105) y la Información Comercial. Una implementación, no dos: si la planilla cambia, esto cambia con ella.
//
// Vive en una página de Next (`/tools/coffee-datasheet/app`) bajo `/tools`, que el proxy no reescribe, así que la misma
// URL abre en los 19 hosts y dentro de la concha del taller. El HTML autocontenido de la V5.132 queda como una página de
// paso a esta (`public/tools/coffee-datasheet/ctcx-coffee-datasheet-tool.html`): los enlaces viejos siguen abriendo.

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LabEvalEditor } from "@/components/bcp/LabEvalEditor";
import { Info } from "@/components/bcp/PlanillaPiezas";
import type { BloqueDePlanilla, LabEvaluation } from "@/lib/arena/labEvaluation";
import { INFO_PLANILLA } from "@/lib/arena/planillaInfo";
import { IDIOMAS_DE_PLANILLA, type IdiomaDePlanilla } from "@/lib/arena/planillaI18n";
import { CTC_EMAIL, CTC_LEGAL_LINE, CTC_RAZON, CTC_TELEFONOS, CTC_WEB } from "@/lib/legal";
import { BloqueB1 } from "./BloqueB1";
import { BloqueComercial } from "./BloqueComercial";
import { BloqueExtrinseca } from "./BloqueExtrinseca";
import { APP, LOTES_RECOMENDADOS, MAX_LOTES, PARTES, type B1, type Comercial, type Evaluacion, type Extrinseca, type Lote, type Parte, type Sesion, evaluacionVacia, hoy, loteVacio, normLote, normalizar, resumen } from "./estado";
import { E } from "./estilos";
import { FichaDeLote } from "./FichaImpresa";
import { TX } from "./textos";
import { leerBorrador, usePuente } from "./usePuente";

const PARTE_TX: Record<Parte, "pB1" | "pB2" | "pB3" | "pExt" | "pCom"> = { b1: "pB1", b2: "pB2", b3: "pB3", ext: "pExt", com: "pCom" };

function descargar(blob: Blob, nombre: string) {
  const u = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = u;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(u);
    a.remove();
  }, 150);
}

const ID_ARCHIVO = "cdt-archivo";

export function DatasheetTool({ langInicial = "es" }: { langInicial?: IdiomaDePlanilla }) {
  // El estado nace en el cliente (borrador del navegador, fecha de hoy): hasta montar no se pinta nada que pueda discrepar del servidor.
  const [ev, setEv] = useState<Evaluacion | null>(null);
  const [vista, setVista] = useState<"hoja" | "ficha">("hoja");
  const [todos, setTodos] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const hoyIso = useMemo(() => hoy(), []);

  useEffect(() => {
    // Lectura diferida: el marcado del servidor queda determinista y el cuerpo del efecto no llama a setState en
    // sincronía (react-hooks/set-state-in-effect, el patrón de la casa en cherry-picked/i18n.tsx).
    let vigente = true;
    Promise.resolve().then(() => { if (vigente) setEv(normalizar(leerBorrador(), langInicial)); });
    return () => { vigente = false; };
  }, [langInicial]);
  // El selector de archivo está oculto: el botón «Cargar» lo abre por id (un ref leído dentro de un manejador que pasa por
  // `boton()` dispara react-hooks/refs, que no distingue el manejador de un render).
  const abrirArchivo = useCallback(() => document.getElementById(ID_ARCHIVO)?.click(), []);

  const vivo: Evaluacion = ev ?? evaluacionVacia(langInicial);
  const lang = vivo.lang;
  const t = TX[lang];
  const lote = vivo.lotes[vivo.actual];

  const alInit = useCallback((estado: unknown) => setEv((prev) => normalizar(estado, prev?.lang ?? langInicial)), [langInicial]);
  usePuente({ estado: ev, resumen: ev ? resumen(ev) : "", alInit });

  const toast = (m: string) => {
    setAviso(m);
    setTimeout(() => setAviso(null), 3200);
  };
  const cambia = (fn: (e: Evaluacion) => Evaluacion) => setEv((prev) => fn(prev ?? evaluacionVacia(langInicial)));
  const cambiaLote = (fn: (l: Lote) => Lote) => cambia((e) => ({ ...e, lotes: e.lotes.map((l, i) => (i === e.actual ? fn(l) : l)) }));
  const setPlanilla = (patch: Partial<LabEvaluation>) => cambiaLote((l) => ({ ...l, planilla: { ...l.planilla, ...patch } }));
  const setB1 = (patch: Partial<B1>) => cambiaLote((l) => ({ ...l, b1: { ...l.b1, ...patch } }));
  const setExt = (patch: Partial<Extrinseca>) => cambiaLote((l) => ({ ...l, ext: { ...l.ext, ...patch } }));
  const setCom = (patch: Partial<Comercial>) => cambiaLote((l) => ({ ...l, com: { ...l.com, ...patch } }));
  const setSesion = (patch: Partial<Sesion>) => cambia((e) => ({ ...e, sesion: { ...e.sesion, ...patch } }));
  const setLang = (l: IdiomaDePlanilla) => cambia((e) => ({ ...e, lang: l }));
  const setParte = (p: Parte) =>
    cambia((e) => {
      const partes = { ...e.partes, [p]: !e.partes[p] };
      if (!PARTES.some((x) => partes[x])) {
        toast(t.unaParte);
        return e;
      }
      return { ...e, partes };
    });
  const codigoLibre = (e: Evaluacion) => {
    let n = e.lotes.length + 1, c = "";
    do {
      c = `L${String(n++).padStart(2, "0")}`;
    } while (e.lotes.some((l) => l.codigo === c));
    return c;
  };
  const agregar = (duplicar: boolean) =>
    cambia((e) => {
      if (e.lotes.length >= MAX_LOTES) {
        toast(t.topeLotes(MAX_LOTES));
        return e;
      }
      const uids = e.lotes.map((l) => l.uid);
      const nuevo = duplicar ? normLote(JSON.parse(JSON.stringify({ ...e.lotes[e.actual], uid: "" })), e.lotes.length, uids) : loteVacio(e.lotes.length, uids);
      nuevo.codigo = codigoLibre(e);
      if (e.lotes.length + 1 === LOTES_RECOMENDADOS + 1) toast(t.muchosLotes);
      return { ...e, lotes: [...e.lotes, nuevo], actual: e.lotes.length };
    });
  const quitar = () =>
    cambia((e) => {
      if (e.lotes.length < 2 || !window.confirm(t.delLoteConf(e.lotes[e.actual].codigo))) return e;
      const lotes = e.lotes.filter((_, i) => i !== e.actual);
      return { ...e, lotes, actual: Math.max(0, e.actual - 1) };
    });
  const guardar = () => {
    const base = (vivo.lotes.length === 1 ? vivo.lotes[0].nombre || vivo.lotes[0].codigo : vivo.sesion.fecha || "lotes").replace(/[^\w\-áéíóúüñÁÉÍÓÚÜÑ ]+/g, "").trim().replace(/\s+/g, "_").slice(0, 48) || "evaluacion";
    descargar(new Blob([JSON.stringify({ app: APP, v: vivo.v, estado: vivo }, null, 1)], { type: "application/json" }), `CTCx_Datasheet_${base}.json`);
    toast(t.guardado);
  };
  const cargar = (f: File) => {
    const fr = new FileReader();
    fr.onload = () => {
      try {
        const o = JSON.parse(String(fr.result)) as { app?: string; estado?: unknown };
        if (!o || o.app !== APP || !o.estado) throw new Error("otro");
        setEv(normalizar(o.estado, lang));
        toast(t.cargado);
      } catch {
        toast(t.cargaMal);
      }
    };
    fr.readAsText(f);
  };
  const nuevo = () => {
    if (!window.confirm(t.nuevoConf)) return;
    setEv(evaluacionVacia(lang));
    setVista("hoja");
    window.scrollTo(0, 0);
  };
  const bloques = useMemo(() => (["b2", "b3"] as BloqueDePlanilla[]).filter((b) => vivo.partes[b]), [vivo.partes]);
  const info = (k: keyof (typeof INFO_PLANILLA)["es"]) => {
    const x = INFO_PLANILLA[lang][k];
    return <Info texto={x.texto} titulo={x.titulo} std={x.std} />;
  };

  const selectorDeIdioma = (
    <div role="group" aria-label={t.idioma} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "#D3B8FA" }}>
      {t.idioma}
      <span style={{ display: "inline-flex", border: "1.5px solid rgba(255,255,255,.35)", borderRadius: 999, overflow: "hidden" }}>
        {IDIOMAS_DE_PLANILLA.map((l) => (
          <button key={l} type="button" aria-pressed={lang === l} onClick={() => setLang(l)} style={{ padding: "3px 12px", fontSize: 11.5, fontWeight: 800, border: "none", cursor: "pointer", background: lang === l ? "#FFCD00" : "transparent", color: lang === l ? "#2A0760" : "#D3B8FA" }}>
            {l.toUpperCase()}
          </button>
        ))}
      </span>
    </div>
  );
  const boton = (txt: string, onClick: () => void, solido = false) => (
    <button type="button" onClick={onClick} style={{ padding: "7px 12px", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer", minHeight: 34, border: `1px solid ${solido ? "#FFCD00" : "rgba(255,255,255,.3)"}`, background: solido ? "#FFCD00" : "rgba(255,255,255,.08)", color: solido ? "#2A0760" : "#fff" }}>
      {txt}
    </button>
  );

  return (
    <div style={{ minHeight: "100dvh", background: "var(--paper)", color: "var(--ink)" }}>
      <style>{`@media print { .cdt-no-print { display: none !important; } .cdt-ficha { border: none !important; box-shadow: none !important; margin: 0 !important; max-width: none !important; } .cdt-ficha header, .cdt-ficha footer, .cdt-agua { -webkit-print-color-adjust: exact; print-color-adjust: exact; } body { background: #fff !important; } }`}</style>
      <header className="cdt-no-print" style={{ background: "#12101A", color: "#fff", borderBottom: "3px solid #FFCD00", padding: "8px 18px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: "auto" }}>
          <Image src="/images/shared/ctc-logo-parrot-black.webp" alt={CTC_RAZON} width={34} height={38} style={{ filter: "invert(1)" }} priority />
          <div style={{ lineHeight: 1.15 }}>
            <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase" }}>CTCx · {t.marca}</div>
            <div style={{ fontSize: 10.5, color: "#D3B8FA", fontFamily: "var(--font-spline-mono), monospace" }}>{t.marcaSub}</div>
          </div>
        </div>
        {selectorDeIdioma}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {boton(t.nuevo, nuevo)}
          {boton(t.cargar, abrirArchivo)}
          {boton(t.guardar, guardar)}
          {vista === "hoja" ? boton(t.imprimir, () => { setVista("ficha"); window.scrollTo(0, 0); }, true) : boton(t.volverEditar, () => setVista("hoja"), true)}
        </div>
        <input id={ID_ARCHIVO} type="file" accept=".json,application/json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) cargar(f); e.target.value = ""; }} />
      </header>

      {!ev ? (
        <div style={{ padding: 24, color: "var(--muted)", fontSize: 13 }}>…</div>
      ) : vista === "ficha" ? (
        <main style={{ maxWidth: 1180, margin: "0 auto", padding: "14px 16px 60px" }}>
          <div className="cdt-no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
            {vivo.lotes.length > 1 ? (
              <span style={{ display: "inline-flex", border: "1.5px solid var(--line)", borderRadius: 999, overflow: "hidden" }}>
                {[false, true].map((v) => (
                  <button key={String(v)} type="button" aria-pressed={todos === v} onClick={() => setTodos(v)} style={{ padding: "4px 12px", fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer", background: todos === v ? "var(--primary)" : "transparent", color: todos === v ? "#fff" : "var(--muted)" }}>
                    {v ? t.fiTodos : `${t.fiEste} · ${lote.codigo}`}
                  </button>
                ))}
              </span>
            ) : (
              <span />
            )}
            <button type="button" className="btn btn-sm btn-solid" onClick={() => window.print()}>{t.imprimir}</button>
          </div>
          {(todos ? vivo.lotes : [lote]).map((l) => (
            <FichaDeLote key={l.uid} ev={vivo} lote={l} hoyIso={hoyIso} />
          ))}
        </main>
      ) : (
        <main style={{ maxWidth: 1180, margin: "0 auto", padding: "14px 16px 60px", display: "grid", gap: 12 }}>
          {/* La sesión: quién, cuándo, dónde y para qué (cabecera de todos los formatos SCA). */}
          <div style={E.bloque}>
            <div style={{ ...E.seccion, marginTop: 0, marginBottom: 8 }}>
              <h5 style={E.h}>{t.sesion} {info("sesion")}</h5>
            </div>
            <div style={E.tresCol}>
              {([["evaluador", t.evaluador, "text", ""], ["scaId", t.scaId, "text", "SCA-123456"], ["fecha", t.fecha, "date", ""], ["lugar", t.lugar, "text", ""]] as [keyof Sesion, string, string, string][]).map(([k, lbl, tipo, ph]) => (
                <label key={k} style={{ display: "grid", gap: 3 }}>
                  <span style={E.lbl}>{lbl}</span>
                  <input type={tipo} value={vivo.sesion[k]} placeholder={ph} onChange={(e) => setSesion({ [k]: e.target.value })} style={E.input} />
                </label>
              ))}
              <label style={{ display: "grid", gap: 3, gridColumn: "span 2" }}>
                <span style={E.lbl}>{t.objetivo}</span>
                <input value={vivo.sesion.objetivo} placeholder={t.objetivoPh} onChange={(e) => setSesion({ objetivo: e.target.value })} style={E.input} />
              </label>
            </div>
          </div>

          {/* Los lotes: uno o varios, cada uno con su UID acuñado al nacer. */}
          <div style={E.bloque}>
            <div style={{ ...E.seccion, marginTop: 0, marginBottom: 8 }}>
              <h5 style={E.h}>{t.lotes} {info("lotes")}</h5>
              {vivo.lotes.length > LOTES_RECOMENDADOS && <span style={{ ...E.pill, color: "#B45309" }}>{t.muchosLotes}</span>}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              {vivo.lotes.map((l, i) => (
                <button key={l.uid} type="button" aria-pressed={i === vivo.actual} onClick={() => cambia((e) => ({ ...e, actual: i }))} style={{ ...E.pildora, fontSize: 12, padding: "6px 12px", ...(i === vivo.actual ? E.pildoraOn : {}) }}>
                  {l.codigo} <span style={{ fontWeight: 400, opacity: 0.8 }}>{l.nombre.trim() || t.sinNombre}</span>
                </button>
              ))}
              {vivo.lotes.length < MAX_LOTES && (
                <>
                  <button type="button" className="btn btn-sm" onClick={() => agregar(false)}>{t.masLote}</button>
                  <button type="button" className="btn btn-sm" onClick={() => agregar(true)}>{t.dupLote}</button>
                </>
              )}
              {vivo.lotes.length > 1 && (
                <button type="button" className="btn btn-sm" onClick={quitar} style={{ color: "#C4402F", borderColor: "#C4402F" }}>{t.delLote}</button>
              )}
            </div>
            <div style={{ ...E.tresCol, marginTop: 10 }}>
              <label style={{ display: "grid", gap: 3 }}>
                <span style={E.lbl}>{t.codigo}</span>
                <input value={lote.codigo} onChange={(e) => cambiaLote((l) => ({ ...l, codigo: e.target.value.slice(0, 24) }))} style={E.input} />
              </label>
              <label style={{ display: "grid", gap: 3, gridColumn: "span 2" }}>
                <span style={E.lbl}>{t.nombreLote}</span>
                <input value={lote.nombre} placeholder={t.nombreLotePh} data-prueba="nombre" onChange={(e) => cambiaLote((l) => ({ ...l, nombre: e.target.value.slice(0, 120) }))} style={E.input} />
              </label>
              <div style={{ display: "grid", gap: 3 }}>
                <span style={E.lbl}>{t.uid} {info("uid")}</span>
                <span className="mono" data-prueba="uid" style={{ ...E.input, display: "inline-flex", alignItems: "center", background: "var(--line)", fontWeight: 700, letterSpacing: ".04em" }}>{lote.uid}</span>
              </div>
            </div>
            {/* Las partes: lo que el owner quiso conservar de la primera versión. */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginTop: 12 }}>
              <span style={{ fontSize: 11, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--muted)" }}>{t.partes} {info("partes")}</span>
              {PARTES.map((p) => (
                <button key={p} type="button" aria-pressed={vivo.partes[p]} onClick={() => setParte(p)} style={{ ...E.pildora, fontSize: 12, padding: "5px 12px", ...(vivo.partes[p] ? E.pildoraOn : {}) }}>
                  {vivo.partes[p] ? "☑" : "☐"} {t[PARTE_TX[p]]}
                </button>
              ))}
            </div>
          </div>

          {/* La hoja: B1 → la planilla del Centro (B2 · B3) → extrínseca → comercial. Una sola hoja, como la planilla. */}
          <div style={{ ...E.bloque, padding: "12px 14px" }} key={lote.uid}>
            {vivo.partes.b1 && <BloqueB1 b1={lote.b1} planilla={lote.planilla} lang={lang} onB1={setB1} onPlanilla={setPlanilla} />}
            {bloques.length > 0 && (
              <div style={{ marginTop: vivo.partes.b1 ? 14 : 0 }}>
                <LabEvalEditor value={lote.planilla} onChange={setPlanilla} lang={lang} onLang={setLang} ocultaGrado bloques={bloques} />
              </div>
            )}
            {vivo.partes.ext && <BloqueExtrinseca lote={lote} lang={lang} onExt={setExt} />}
            {vivo.partes.com && <BloqueComercial com={lote.com} lang={lang} onCom={setCom} hoyIso={hoyIso} />}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button type="button" className="btn btn-sm btn-solid" onClick={() => { setVista("ficha"); window.scrollTo(0, 0); }}>{t.imprimir}</button>
          </div>
          <footer style={{ fontSize: 10.5, color: "var(--muted)", lineHeight: 1.6, borderTop: "1px solid var(--line)", paddingTop: 8 }}>
            {CTC_WEB} · {CTC_EMAIL}{CTC_TELEFONOS.length ? ` · ${CTC_TELEFONOS.join(" · ")}` : ""} · {CTC_LEGAL_LINE} · © {hoyIso.slice(0, 4)} {CTC_RAZON} · {t.derechos}
          </footer>
        </main>
      )}

      {aviso && (
        <div role="status" style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", background: "#12101A", color: "#fff", padding: "10px 16px", borderRadius: 6, fontSize: 12.5, borderLeft: "3px solid #FFCD00", zIndex: 50, maxWidth: "92vw" }}>
          {aviso}
        </div>
      )}
    </div>
  );
}
