"use client";

// ── La ficha impresa de un lote (V6.6) ────────────────────────────────────────────────────────────────────────────────
// Lo que el evaluador entrega: una hoja por lote con la marca de agua CTCx (la del Dossier EUDR), la cabecera de la casa,
// el UID de la ficha, el método, cada parte activa con datos, la vigencia de la información comercial, la firma y el pie con
// el sitio web, el correo, los teléfonos, la línea legal y la reserva de derechos. Lee la MISMA aritmética de la planilla.

import Image from "next/image";
import { SCA_ATTRS } from "@/components/kaffetal-regal/ficha/fichaData";
import { computeCva, computeFactor, computeMesh, computeSca2004, CVA, CVA_SECCIONES, SCA2004, equivalenteDeLaPlanilla, puntoDeLaPlanilla, type LabEvaluation } from "@/lib/arena/labEvaluation";
import { rotuloDelPunto } from "@/lib/arena/punto";
import { CLAVES_CVA, CLAVES_SCA_ESCALADAS } from "@/lib/arena/equivalencia";
import { CVA_DEFECTO_LABEL, CVA_SECCION_LABEL, MALLA_LABEL, PL, SCA_ATTR_LABEL, type IdiomaDePlanilla } from "@/lib/arena/planillaI18n";
import { COLORES_DEL_VERDE, DEFECTOS_FISICOS, TEXTURAS_EN_BOCA, TIPOS_DE_ACIDEZ, calcDefectos, opcionLabel } from "@/lib/catacion/fisico";
import { detalleDe, etapasLabel, fmtIntensidad, normalizaRueda, rutaDe } from "@/lib/catacion/rueda";
import { RadarDeTaza, type EjeDeRadar } from "@/components/bcp/PlanillaPiezas";
import { CTC_EMAIL, CTC_LEGAL_LINE, CTC_RAZON, CTC_TELEFONOS, CTC_WEB } from "@/lib/legal";
import { CERT_OFICIALES, CERT_OTRAS, partesConDatos, precioTx, vigenciaDe, type Evaluacion, type Lote, type Parte } from "./estado";
import { TX } from "./textos";

const MORADO = "#3C0A86";
const numOrNull = (v: string): number | null => {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
};
const fmtFecha = (iso: string, lang: IdiomaDePlanilla) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.toLocaleDateString(lang === "en" ? "en-GB" : "es-CO", { year: "numeric", month: "long", day: "numeric" });
};

function Fila({ k, v }: { k: string; v: string | number | null | undefined }) {
  if (v == null || String(v).trim() === "") return null;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 11.5, padding: "3px 0", borderBottom: "1px dotted #DDD9EE" }}>
      <span style={{ color: "#4E4A60" }}>{k}</span>
      <span style={{ fontWeight: 600, textAlign: "right" }}>{v}</span>
    </div>
  );
}
function Seccion({ titulo, pie, children }: { titulo: string; pie?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 16, breakInside: "avoid" }}>
      <h3 style={{ fontSize: 10, letterSpacing: ".15em", textTransform: "uppercase", color: MORADO, borderBottom: "1px solid #DDD9EE", paddingBottom: 5, margin: "0 0 9px", display: "flex", gap: 8, alignItems: "center" }}>
        <span style={{ width: 3, height: 12, background: "#FFCD00", borderRadius: 1, display: "inline-block" }} />
        {titulo}
        {pie && <small style={{ marginLeft: "auto", letterSpacing: 0, textTransform: "none", color: "#8E8AA3", fontWeight: 400, fontFamily: "var(--font-spline-mono), monospace" }}>{pie}</small>}
      </h3>
      {children}
    </div>
  );
}
const dosCol: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "1px 22px" };

function PerfilDeTaza({ p, lang }: { p: LabEvaluation; lang: IdiomaDePlanilla }) {
  const t = TX[lang], pl = PL[lang];
  const sca = computeSca2004(p, lang), cva = computeCva(p, lang), punto = puntoDeLaPlanilla(p), eq = equivalenteDeLaPlanilla(p);
  const verSca = p.vista !== "cva", verCva = p.vista !== "sca";
  const radarSca = p.vista !== "cva";
  const ejes: EjeDeRadar[] = radarSca
    ? SCA_ATTRS.map(([key]) => ({ label: SCA_ATTR_LABEL[lang][key], valor: numOrNull(p[`sca_${key}` as keyof LabEvaluation] as string) }))
    : CVA_SECCIONES.map(([key]) => ({ label: CVA_SECCION_LABEL[lang][key], valor: numOrNull(p[`cva_${key}` as keyof LabEvaluation] as string) }));
  const total = radarSca ? sca.total : cva.total;
  const rueda = normalizaRueda(p.rueda);
  const tazasSca = p.sca_tazas.map((x, i) => (x.estado ? `${pl.taza} ${i + 1}: ${x.estado}${x.defecto ? ` (${CVA_DEFECTO_LABEL[lang][x.defecto] ?? x.defecto})` : ""}` : "")).filter(Boolean).join(" · ");
  const tazasCva = p.cva_tazas.map((x, i) => (x.defectuosa ? `${pl.taza} ${i + 1}: ${pl.defectuosa}${x.defecto ? ` (${CVA_DEFECTO_LABEL[lang][x.defecto] ?? x.defecto})` : ""}` : x.noUniforme ? `${pl.taza} ${i + 1}: ${pl.noUniforme}` : "")).filter(Boolean).join(" · ");
  return (
    <Seccion titulo={t.fiPerfil} pie={verSca && verCva ? "SCA 2004 + CVA" : verCva ? "CVA · SCA 103 · 104" : "SCA 2004"}>
      <div style={{ display: "grid", gridTemplateColumns: "190px minmax(0, 1fr)", gap: 14, alignItems: "center" }}>
        <div>
          <RadarDeTaza ejes={ejes} max={radarSca ? SCA2004.max : CVA.max} marcas={radarSca ? [2, 4, 6, 8, 10] : [3, 6, 9]} color={MORADO} />
        </div>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, background: "#F2EDFD", border: "1px solid #D3B8FA", borderRadius: 4, padding: "8px 12px" }}>
            <span style={{ fontSize: 28, fontWeight: 800, color: MORADO, fontFamily: "var(--font-spline-mono), monospace" }}>{total != null ? total.toFixed(2) : "—"}</span>
            <div style={{ fontSize: 12 }}>
              <b>{radarSca ? pl.totalSca : pl.puntajeCva}</b>
              <br />
              {punto ? (
                <span>{t.fiPunto}: <b>{punto.valor.toFixed(2)}</b> · {rotuloDelPunto(punto, lang)}</span>
              ) : (
                <span style={{ color: "#8E8AA3" }}>{pl.sinPunto}</span>
              )}
            </div>
          </div>
          <div style={{ ...dosCol, marginTop: 6 }}>
            {verSca && SCA_ATTRS.map(([key]) => <Fila key={key} k={SCA_ATTR_LABEL[lang][key]} v={numOrNull(p[`sca_${key}` as keyof LabEvaluation] as string)?.toFixed(2)} />)}
            {verSca && <Fila k={pl.tazasSca} v={tazasSca} />}
            {verCva && CVA_SECCIONES.map(([key]) => <Fila key={key} k={CVA_SECCION_LABEL[lang][key]} v={numOrNull(p[`cva_${key}` as keyof LabEvaluation] as string)?.toFixed(2)} />)}
            {verCva && <Fila k={`u · d`} v={cva.calificadas ? `${cva.u} · ${cva.d}` : ""} />}
            {verCva && <Fila k={pl.taza} v={tazasCva} />}
          </div>
        </div>
      </div>
      {eq?.hoja && (
        <div style={{ marginTop: 8, fontSize: 11.5, color: "#4E4A60" }}>
          <b style={{ color: MORADO }}>{t.fiEquivalente}</b> · {eq.protocolo === "sca2004" ? pl.equivTituloSca : pl.equivTituloCva}:{" "}
          {eq.protocolo === "sca2004"
            ? [...CLAVES_SCA_ESCALADAS, "uniformity" as const, "clean_cup" as const, "sweetness" as const].map((k) => `${SCA_ATTR_LABEL[lang][k]} ${eq.hoja!.atributos[k].toFixed(2)}`).join(" · ")
            : CLAVES_CVA.map((k) => `${CVA_SECCION_LABEL[lang][k]} ${eq.hoja!.secciones[k].toFixed(2)}`).join(" · ")}{" "}
          → <b>{eq.hoja.total.toFixed(2)}</b>
        </div>
      )}
      {(rueda.length > 0 || p.acidez_intensidad || p.acidez_tipo || p.boca_intensidad || p.boca_texturas.length > 0) && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 10.5, letterSpacing: ".08em", textTransform: "uppercase", color: MORADO, margin: "0 0 4px" }}>{t.fiNotas} · {t.fiDescriptivo}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {rueda.map((id) => {
              const d = detalleDe(p.rueda_detalle, id);
              return (
                <span key={id} style={{ fontSize: 11.5, border: "1px solid #DDD9EE", borderRadius: 14, padding: "2px 9px" }}>
                  {rutaDe(id, lang)} <small style={{ color: "#8E8AA3" }}>· {etapasLabel(d.etapas, lang)} · {fmtIntensidad(d.intensidad)}/15{d.nota.trim() ? ` · «${d.nota.trim()}»` : ""}</small>
                </span>
              );
            })}
          </div>
          <div style={dosCol}>
            <Fila k={`${t.fiAcidez} · ${pl.intensidad}`} v={p.acidez_intensidad ? `${fmtIntensidad(Number(p.acidez_intensidad))}/15${p.acidez_tipo ? ` · ${opcionLabel(TIPOS_DE_ACIDEZ, p.acidez_tipo, lang)}` : ""}${p.acidez_nota ? ` · ${p.acidez_nota}` : ""}` : p.acidez_tipo ? opcionLabel(TIPOS_DE_ACIDEZ, p.acidez_tipo, lang) : ""} />
            <Fila k={`${t.fiBoca} · ${pl.intensidad}`} v={[p.boca_intensidad && `${fmtIntensidad(Number(p.boca_intensidad))}/15`, p.boca_texturas.map((k) => opcionLabel(TEXTURAS_EN_BOCA, k, lang)).join(", "), p.boca_nota].filter(Boolean).join(" · ")} />
          </div>
        </div>
      )}
      {p.cupping_profile.trim() && <p style={{ fontSize: 12, lineHeight: 1.5, margin: "8px 0 0" }}>{p.cupping_profile}</p>}
    </Seccion>
  );
}

function Fisica({ p, lang }: { p: LabEvaluation; lang: IdiomaDePlanilla }) {
  const t = TX[lang], pl = PL[lang];
  const factor = computeFactor(p), mesh = computeMesh(p, factor.remainder), def = calcDefectos(p.defectos_detalle);
  const factorQueVale = factor.yieldFactor ?? numOrNull(p.b3_factor_reportado);
  return (
    <Seccion titulo={pl.b3} pie={t.fiGranulometria}>
      <div style={dosCol}>
        <Fila k={pl.pergamino} v={p.fa_start} />
        <Fila k={pl.trillado} v={p.fa_green_remainder} />
        <Fila k={pl.humedad} v={p.fa_parch_hum} />
        <Fila k={pl.humedadVerde} v={p.b3_humedad_verde} />
        <Fila k={pl.aw} v={p.b3_actividad_agua} />
        <Fila k={pl.densidad} v={p.b3_densidad_verde} />
        <Fila k={pl.color} v={p.fa_color ? opcionLabel(COLORES_DEL_VERDE, p.fa_color, lang) : ""} />
        <Fila k={pl.defPrimario} v={p.fa_primary_defect} />
        <Fila k={pl.defSecundario} v={p.fa_secondary_defect} />
        <Fila k={pl.merma} v={factor.start > 0 && factor.remainder > 0 ? factor.yieldLoss.toFixed(1) : ""} />
        <Fila k={pl.granoSano} v={factor.remainder > 0 ? factor.healthy.toFixed(1) : ""} />
        <Fila k={pl.almendraDefectuosa} v={factor.defectivePct != null ? `${factor.defectivePct.toFixed(1)} %` : ""} />
        <Fila k={t.fiFactor} v={factorQueVale != null ? factorQueVale.toFixed(2) : ""} />
        {def.granos > 0 && <Fila k={pl.totalDefectos} v={`${def.total} (${def.cat1} · ${def.cat2})`} />}
        {def.granos > 0 && DEFECTOS_FISICOS.filter((d) => def.filas[d.key].granos > 0).map((d) => <Fila key={d.key} k={`${d[lang]} (${d.granos}:1)`} v={`${def.filas[d.key].granos} → ${def.filas[d.key].completos}`} />)}
      </div>
      {factor.remainder > 0 && mesh.sum > 0 && (
        <div style={{ ...dosCol, marginTop: 8 }}>
          {mesh.rows.filter((r) => r.grams > 0).map((r) => (
            <Fila key={r.key} k={MALLA_LABEL[lang][r.key] ?? r.label} v={`${r.grams.toFixed(1)} g · ${r.pct != null ? r.pct.toFixed(1) : "—"} %`} />
          ))}
        </div>
      )}
      {p.analysis_notes.trim() && <p style={{ fontSize: 12, lineHeight: 1.5, margin: "8px 0 0" }}>{p.analysis_notes}</p>}
    </Seccion>
  );
}

export function FichaDeLote({ ev, lote, hoyIso }: { ev: Evaluacion; lote: Lote; hoyIso: string }) {
  const lang = ev.lang, t = TX[lang];
  const hay = partesConDatos(lote);
  const activa = (p: Parte) => ev.partes[p] && hay[p];
  const p = lote.planilla, e = lote.ext, c = lote.com, s = ev.sesion;
  const variedades = lote.b1.variedades.filter((v) => v.nombre.trim()).map((v) => (v.pct ? `${v.pct} % ${v.nombre}` : v.nombre)).join(" · ");
  const proceso = lote.b1.proceso === "Otro" ? lote.b1.proceso_otro || "Otro" : lote.b1.proceso;
  const protocolo = p.vista === "ambas" ? "SCA 2004 + CVA" : p.vista === "sca" ? "SCA 2004" : "CVA";
  const vig = vigenciaDe(c.valido_hasta, hoyIso);
  const certs = [...CERT_OFICIALES, ...CERT_OTRAS].filter((k) => e.certs[k]).map((k) => t.ce[k]).concat(e.cert_otro.trim() ? [e.cert_otro.trim()] : []);
  const nada = !PARTES_ORDEN.some(activa);
  const tags = [lote.codigo, [e.pais, e.region].filter(Boolean).join(" · "), variedades, proceso, protocolo].filter(Boolean);

  return (
    <article className="cdt-ficha" style={{ position: "relative", background: "#fff", color: "#12101A", maxWidth: 900, margin: "0 auto 18px", border: "1px solid #DDD9EE", overflow: "hidden", fontFamily: "var(--font-instrument-sans), 'Helvetica Neue', Arial, sans-serif", breakAfter: "page" }}>
      {/* La marca de agua de la casa: la misma del Dossier EUDR. */}
      <div aria-hidden className="cdt-agua" style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0, opacity: 0.06 }}>
        <div style={{ transform: "rotate(-30deg)", fontSize: 46, fontWeight: 800, lineHeight: "160px", whiteSpace: "nowrap", color: MORADO }}>
          {Array.from({ length: 40 }).map((_, i) => (
            <div key={i}>{`${t.marcaAgua}  `.repeat(12)}</div>
          ))}
        </div>
      </div>
      <div style={{ position: "relative", zIndex: 1 }}>
        <header style={{ background: "#12101A", color: "#fff", padding: "18px 26px 14px", display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 14 }}>
          <div>
            <div style={{ fontSize: 10.5, letterSpacing: ".2em", textTransform: "uppercase", color: "#D3B8FA" }}>{t.fiCo}</div>
            <div style={{ fontSize: 22, fontWeight: 700, marginTop: 2 }}>{lote.nombre.trim() || lote.codigo}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 }}>
              {tags.map((x) => (
                <span key={x} style={{ fontSize: 10.5, background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.2)", borderRadius: 2, padding: "2px 8px", fontFamily: "var(--font-spline-mono), monospace" }}>{x}</span>
              ))}
            </div>
          </div>
          <div style={{ textAlign: "right", fontSize: 10, color: "#D3B8FA", lineHeight: 1.6, fontFamily: "var(--font-spline-mono), monospace" }}>
            <Image src="/images/shared/ctc-logo-parrot-black.webp" alt={CTC_RAZON} width={44} height={49} style={{ filter: "invert(1)", marginBottom: 4 }} />
            <div style={{ color: "#FFCD00", fontWeight: 700, fontSize: 12 }}>{lote.uid}</div>
            {[s.evaluador, s.scaId, s.fecha, s.lugar].filter(Boolean).map((x) => <div key={x}>{x}</div>)}
          </div>
        </header>
        <div style={{ background: "#FFCD00", color: "#2A0760", padding: "6px 26px", fontSize: 12, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <b style={{ fontSize: 14, letterSpacing: ".04em" }}>{protocolo}</b>
          <span>{t.fiProtocolo}: {protocolo === "CVA" ? "Coffee Value Assessment (SCA 102–105)" : protocolo === "SCA 2004" ? "SCA Cupping Protocol 2004" : "CVA + SCA 2004"}</span>
          {s.objetivo && <span style={{ marginLeft: "auto" }}>{t.objetivo}: {s.objetivo}</span>}
        </div>
        <div style={{ padding: "16px 26px 18px" }}>
          {nada && <p style={{ color: "#8E8AA3", fontSize: 12.5 }}>{t.fiVacia}</p>}
          {activa("b1") && (
            <Seccion titulo={t.b1}>
              <div style={dosCol}>
                <Fila k={t.variedades} v={variedades} />
                <Fila k={t.proceso} v={proceso} />
                <Fila k={t.procesoEspecial} v={lote.b1.proceso_especial} />
                <Fila k={t.humedadVerde} v={p.b3_humedad_verde} />
                <Fila k={t.densidad} v={p.b3_densidad_verde} />
                <Fila k={t.aw} v={p.b3_actividad_agua} />
              </div>
            </Seccion>
          )}
          {activa("b2") && <PerfilDeTaza p={p} lang={lang} />}
          {activa("b3") && <Fisica p={p} lang={lang} />}
          {activa("ext") && (
            <Seccion titulo={t.ext} pie="SCA 105">
              <div style={dosCol}>
                <Fila k={t.xPais} v={e.pais} /><Fila k={t.xRegion} v={e.region} /><Fila k={t.xMuni} v={e.municipio} /><Fila k={t.xFinca} v={e.finca} /><Fila k={t.xProductor} v={e.productor} />
                <Fila k={t.xCosecha} v={e.cosecha} /><Fila k={t.xAltitud} v={e.altitud} /><Fila k={t.xGeo} v={e.geo} />
                <Fila k={t.xHumedo} v={e.humedo} /><Fila k={t.xTrilla} v={e.trilla} /><Fila k={t.xProcOtro} v={e.proc_otro} />
                <Fila k={t.xDescaf} v={e.descaf === "si" ? `${t.xSi}${e.descaf_cual ? ` · ${e.descaf_cual}` : ""}` : e.descaf === "no" ? t.xNo : ""} />
                <Fila k={t.xGrado} v={e.grado} /><Fila k={t.xOic} v={e.oic} /><Fila k={t.xExport} v={e.exportador} /><Fila k={t.xImport} v={e.importador} />
                <Fila k={t.xProveedor} v={e.proveedor} /><Fila k={t.xNit} v={e.nit} /><Fila k={t.xHs} v={e.hs} />
                <Fila k={t.xCerts} v={certs.join(" · ")} /><Fila k={t.xPremios} v={e.premios} />
              </div>
              {[e.cultivo_info, e.proc_desc, e.proc_info, e.comercio_info, e.cert_info, e.historia].filter((x) => x.trim()).map((x, i) => (
                <p key={i} style={{ fontSize: 12, lineHeight: 1.5, margin: "6px 0 0" }}>{x}</p>
              ))}
            </Seccion>
          )}
          {activa("com") && (
            <Seccion titulo={t.com} pie={c.valido_hasta ? t.vigente(fmtFecha(c.valido_hasta, lang)) : undefined}>
              {vig === "vencida" && <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 700, color: "#C4402F" }}>⚠ {t.vencida} · {fmtFecha(c.valido_hasta, lang)}</p>}
              <div style={dosCol}>
                <Fila k={t.pergaminoKg} v={c.pergamino_kg} />
                <Fila k={t.verdeKg} v={c.verde_kg} />
                <Fila k={t.farmGate} v={precioTx(c.farm_gate, c.farm_gate_unidad)} />
                <Fila k={`${t.fob}${c.fob_puerto ? ` · ${c.fob_puerto}` : ""}`} v={precioTx(c.fob, c.fob_unidad)} />
                <Fila k={`${c.incoterm || t.destino}${c.destino_region ? ` · ${c.destino_region}` : ""}`} v={precioTx(c.destino_precio, c.destino_unidad)} />
                <Fila k={t.norma} v={c.norma === "Otra" ? c.norma_otra : c.norma} />
              </div>
              {c.empaque.trim() && <p style={{ fontSize: 12, lineHeight: 1.5, margin: "6px 0 0" }}><b>{t.empaque}:</b> {c.empaque}</p>}
              {c.condiciones.trim() && <p style={{ fontSize: 12, lineHeight: 1.5, margin: "4px 0 0" }}><b>{t.condicionesNotas}:</b> {c.condiciones}</p>}
            </Seccion>
          )}
          <div style={{ marginTop: 28, display: "flex", gap: 30, fontSize: 10.5, color: "#4E4A60", fontFamily: "var(--font-spline-mono), monospace" }}>
            <div style={{ borderTop: "1px solid #12101A", paddingTop: 4, minWidth: 220 }}>{t.fiFirma}{s.evaluador ? ` · ${s.evaluador}` : ""}</div>
            <div style={{ marginLeft: "auto", alignSelf: "flex-end" }}>{t.fiGenerada} {fmtFecha(hoyIso, lang)}</div>
          </div>
        </div>
        <footer style={{ background: "#F5F3FC", borderTop: `2px solid ${MORADO}`, padding: "10px 26px", fontSize: 9.5, color: "#4E4A60", lineHeight: 1.6, fontFamily: "var(--font-spline-mono), monospace" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 16px", fontWeight: 700, color: MORADO }}>
            <span>{t.web}: {CTC_WEB}</span>
            <span>{t.correo}: {CTC_EMAIL}</span>
            {CTC_TELEFONOS.length > 0 && <span>{t.telefonos}: {CTC_TELEFONOS.join(" · ")}</span>}
          </div>
          <div>{t.fiAviso}</div>
          <div style={{ marginTop: 3 }}>
            © {new Date(hoyIso).getFullYear()} {CTC_RAZON} · {t.derechos} · {CTC_LEGAL_LINE}
          </div>
        </footer>
      </div>
    </article>
  );
}
const PARTES_ORDEN: Parte[] = ["b1", "b2", "b3", "ext", "com"];
