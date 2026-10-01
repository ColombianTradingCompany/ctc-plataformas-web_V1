"use client";

// ── La planilla de evaluación (B2/B3 · SCA 2004 y/o CVA · rueda) ─────────────
// Las mismas dos interfaces de la Ficha Técnica (B2 · Perfil de Taza y B3 · Caracterización Física con
// granulometría y factor), en versión compacta para quien evalúa: el Q-Grader del Centro de Calidad
// (`panel/evaluacion`, V5.81), CTCx en «Lotes en Evaluación» («Registrar a mano») y la Arena (segunda apreciación).
// Aritmética compartida (computeFactor / computeMesh / computeSca2004 / computeCva) — cero duplicación de fórmulas.
// V5.92 (owner, 2026-09-25): la planilla es DUAL con un conmutador de VISTA —SCA 2004 · CVA · Ambas—. El SCA 2004
// nativo es el protocolo primario (rige y calibra la escala de grados); un CVA solo se homologa con un intervalo y rige
// el piso; «Ambas» alimenta el banco comparativo. El Punto y su procedencia se enseñan siempre (`rotuloDelPunto`).
// Defectos del Café y el Coffee Varieties Map se ENLAZAN desde aquí (no se embeben; folio 11).
//
// V5.130 (owner, 2026-10-01): «hay un montón de espacio negativo, pero mucho peor aún, no estamos usando la herramienta de
// la rueda combinada con granulometría, la CTCx Datasheet Tool […] haz que la planilla tenga un toggle para hacerlo en
// inglés o español». Tres cambios, sin tocar un solo dato ni una fórmula:
//   1. La hoja se arma como la Datasheet Tool: arriba el RADAR vivo con el puntaje grande y su franja; B2 y la rueda lado
//      a lado; B3 con los pesos a la izquierda y la granulometría (con barras) a la derecha. Los atributos van en dos
//      columnas: cada cifra queda junto a su rótulo, no al otro lado de la pantalla.
//   2. La rueda es una RUEDA (`RuedaDeSabores`, la taxonomía única de `rueda.ts`), no una lista de botones.
//      V5.131 (owner: «deben ser iguales»): ES la Rueda del Café del taller — sus tres anillos, sus 85 notas, sus colores y sus
//      agujas —, a lo ancho de la hoja para que se lea, con las marcas y las notas descriptivas al lado.
//   3. El idioma: ES · EN (`planillaI18n.ts`). Sin `lang`, el editor lleva el suyo; quien lo aloja puede controlarlo
//      (`lang` + `onLang`) para traducir también lo que rodea a la planilla (el Centro de Calidad lo hace).

import { useState } from "react";
import { SCA_ATTRS } from "@/components/kaffetal-regal/ficha/fichaData";
import {
  computeCva,
  computeFactor,
  computeMesh,
  computeSca2004,
  CVA,
  CVA_DEFECTOS,
  CVA_SECCIONES,
  SCA2004,
  SCA2004_POR_TAZAS,
  VISTA_LABEL,
  erroresDePlanilla,
  puntoDeLaPlanilla,
  type CvaTaza,
  type LabEvaluation,
  type VistaDePlanilla,
} from "@/lib/arena/labEvaluation";
import { CVA_PROPOSITO, decidirPorPunto, rotuloDelPunto } from "@/lib/arena/homologacion";
import { familiaDe, normalizaRueda, rutaDe } from "@/lib/catacion/rueda";
import { scaClassFor } from "@/components/kaffetal-regal/ficha/fichaCalculations";
import {
  CLASE_LABEL,
  CVA_DEFECTO_LABEL,
  CVA_SECCION_LABEL,
  ESTADO_DE_MALLAS,
  IDIOMAS_DE_PLANILLA,
  MALLA_LABEL,
  PL,
  SCA_ATTR_LABEL,
  VISTA_LABEL_I18N,
  type IdiomaDePlanilla,
} from "@/lib/arena/planillaI18n";
import { origenDeSuperficie } from "@/lib/red/subdominios";
import { BarraDeMalla, RadarDeTaza, RuedaDeSabores, type EjeDeRadar } from "./PlanillaPiezas";

// Las dos herramientas de apoyo del folio 11 se ENLAZAN (no se embeben): viven en el taller de Herramientas del Café.
const TALLER = origenDeSuperficie("/herramientas");
const URL_DEFECTOS = `${TALLER}/taller/defectos-cafe`;
const URL_VARIEDADES = `${TALLER}/taller/mapa-variedades`;

const S = {
  h: { margin: "0", fontSize: 14, fontWeight: 800, color: "var(--ink)" } as const,
  h6: { margin: "0 0 4px", fontSize: 12.5, fontWeight: 700, color: "var(--ink)" } as const,
  hint: { fontSize: 11.5, color: "var(--muted)", margin: "0 0 8px" } as const,
  err: { fontSize: 11.5, color: "#B45309", margin: "4px 0 0" } as const,
  tbl: { width: "100%", borderCollapse: "collapse", fontSize: 12.5 } as const,
  th: { textAlign: "left", padding: "4px 6px", borderBottom: "1px solid var(--line)", fontSize: 11, textTransform: "uppercase", letterSpacing: ".04em", color: "var(--muted)" } as const,
  td: { padding: "3px 6px", borderBottom: "1px dashed var(--line)" } as const,
  num: { width: 76, padding: "5px 7px", border: "1.5px solid var(--line)", borderRadius: 7, fontSize: 12.5, background: "var(--paper)" } as const,
  sel: { padding: "5px 7px", border: "1.5px solid var(--line)", borderRadius: 7, fontSize: 12.5, background: "var(--paper)" } as const,
  lbl: { display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--ink)", marginBottom: 3 } as const,
  input: { width: "100%", padding: "6px 8px", border: "1.5px solid var(--line)", borderRadius: 7, fontSize: 12.5, background: "var(--paper)" } as const,
  total: { display: "flex", gap: 10, alignItems: "baseline", marginTop: 8, fontSize: 13, flexWrap: "wrap" } as const,
  pill: { fontSize: 11.5, border: "1px solid var(--line)", borderRadius: 999, padding: "2px 10px", color: "var(--muted)" } as const,
// Una marca de la rueda en la lista: su camino («Frutal › Cítricos › Lima») con el color de la familia al borde.
  marca: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, textAlign: "left", fontSize: 12, padding: "4px 8px", borderRadius: 7, border: "1px solid var(--line)", borderLeft: "5px solid var(--ink)", background: "var(--paper)", color: "var(--ink)", cursor: "pointer" } as const,
  bloque: { border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px" } as const,
  // Dos columnas cuando caben (≥ 2 × 330 px); una sola en un teléfono o dentro de una tarjeta estrecha.
  dosCol: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(330px, 1fr))", gap: 12, alignItems: "start" } as const,
  // Los pares rótulo–cifra, en dos columnas: la cifra queda junto a su rótulo.
  pares: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "4px 14px" } as const,
  par: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "3px 0", borderBottom: "1px dashed var(--line)", fontSize: 12.5 } as const,
  seccion: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", margin: "14px 0 8px", paddingBottom: 4, borderBottom: "2px solid var(--line)" } as const,
};

const VISTAS = Object.keys(VISTA_LABEL) as VistaDePlanilla[];
const numOrNull = (v: string): number | null => {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

export function LabEvalEditor({
  value,
  onChange,
  disabled,
  lang: langProp,
  onLang,
}: {
  value: LabEvaluation;
  onChange: (patch: Partial<LabEvaluation>) => void;
  disabled?: boolean;
  /** V5.130: el idioma de la planilla. Sin él, el editor lleva el suyo (español al abrir). */
  lang?: IdiomaDePlanilla;
  onLang?: (lang: IdiomaDePlanilla) => void;
}) {
  const [langPropio, setLangPropio] = useState<IdiomaDePlanilla>("es");
  const lang = langProp ?? langPropio;
  const setLang = (l: IdiomaDePlanilla) => (onLang ? onLang(l) : setLangPropio(l));
  const t = PL[lang];

  const sca = computeSca2004(value, lang);
  const cva = computeCva(value, lang);
  const factor = computeFactor(value);
  const mesh = computeMesh(value, factor.healthy);
  const punto = puntoDeLaPlanilla(value);
  const errores = erroresDePlanilla(value, lang);
  const decision = punto ? decidirPorPunto(punto) : null;
  const verSca = value.vista !== "cva";
  const verCva = value.vista !== "sca";

  const numInput = (key: keyof LabEvaluation, opts?: { step?: string; max?: number; min?: number; ancho?: number }) => (
    <input
      type="number"
      step={opts?.step ?? "0.1"}
      min={opts?.min ?? 0}
      max={opts?.max}
      value={value[key] as string}
      onChange={(e) => onChange({ [key]: e.target.value } as Partial<LabEvaluation>)}
      disabled={disabled}
      style={{ ...S.num, width: opts?.ancho ?? S.num.width }}
    />
  );

  const setVista = (v: VistaDePlanilla) => onChange({ vista: v, escala: v === "cva" ? "cva" : "sca" });
  const setTaza = (i: number, patch: Partial<CvaTaza>) => {
    const next = value.cva_tazas.map((x, j) => (j === i ? { ...x, ...patch, ...(patch.defectuosa === false ? { defecto: "" } : {}) } : x));
    onChange({ cva_tazas: next });
  };

  const toggleDescriptor = (id: string) => {
    const set = new Set(value.rueda);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    onChange({ rueda: [...set] });
  };

  // El radar enseña el protocolo que la vista deja ver: los diez atributos SCA (escala 6–10), o las ocho secciones CVA (1–9).
  const radarSca = value.vista !== "cva";
  const ejes: EjeDeRadar[] = radarSca
    ? SCA_ATTRS.map(([key]) => ({ label: SCA_ATTR_LABEL[lang][key], valor: numOrNull(value[`sca_${key}` as keyof LabEvaluation] as string) }))
    : CVA_SECCIONES.map(([key]) => ({ label: CVA_SECCION_LABEL[lang][key], valor: numOrNull(value[`cva_${key}` as keyof LabEvaluation] as string) }));
  const totalGrande = radarSca ? sca.total : cva.total;
  const clase = punto ? scaClassFor(punto.bajo) : "Sin puntaje";

  return (
    <div>
      {/* ── B2 · Perfil de Taza: la vista y el idioma se eligen; el Punto y su procedencia se ven ── */}
      <div style={{ ...S.seccion, marginTop: 0 }}>
        <h5 style={S.h}>{t.b2}</h5>
        <div role="group" aria-label={t.idioma} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "var(--muted)" }}>
          {t.idioma}
          <span style={{ display: "inline-flex", border: "1.5px solid var(--line)", borderRadius: 999, overflow: "hidden" }}>
            {IDIOMAS_DE_PLANILLA.map((l) => (
              <button
                key={l}
                type="button"
                aria-pressed={lang === l}
                onClick={() => setLang(l)}
                style={{ padding: "3px 12px", fontSize: 11.5, fontWeight: 800, border: "none", cursor: "pointer", background: lang === l ? "var(--primary, #3C0A86)" : "transparent", color: lang === l ? "#fff" : "var(--muted)" }}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </span>
        </div>
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 4 }}>
        {VISTAS.map((k) => (
          <label key={k} style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12.5, cursor: "pointer" }}>
            <input type="radio" name="vista" checked={value.vista === k} onChange={() => setVista(k)} disabled={disabled} />
            {VISTA_LABEL_I18N[lang][k]}
          </label>
        ))}
      </div>
      <p style={S.hint}>{t.hintVista}</p>

      {/* El radar vivo con el puntaje grande y su franja: la cabecera de Intrínsecos de la Datasheet Tool. */}
      <div style={{ ...S.bloque, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12, alignItems: "center", marginBottom: 12 }}>
        <div>
          <RadarDeTaza ejes={ejes} min={radarSca ? SCA2004.min : CVA.min} max={radarSca ? SCA2004.max : CVA.max} />
          <p style={{ ...S.hint, textAlign: "center", margin: "2px 0 0" }}>
            {t.radar} · {radarSca ? t.radarEscalaSca : t.radarEscalaCva}
          </p>
        </div>
        <div>
          <div style={{ fontSize: 46, fontWeight: 800, lineHeight: 1, color: "var(--ink)" }}>
            {totalGrande != null ? totalGrande.toFixed(2) : "—"}
            <small style={{ fontSize: 16, fontWeight: 600, color: "var(--muted)" }}>/100</small>
          </div>
          <div style={{ fontSize: 11.5, color: "var(--muted)", margin: "2px 0 6px" }}>{radarSca ? t.totalSca : t.puntajeCva}</div>
          <span style={{ display: "inline-block", fontSize: 12, fontWeight: 800, borderRadius: 999, padding: "3px 12px", background: punto ? "var(--primary, #3C0A86)" : "var(--line)", color: punto ? "#fff" : "var(--muted)" }}>
            {CLASE_LABEL[lang][clase] ?? clase}
          </span>
          <div style={{ marginTop: 8, fontSize: 13 }}>
            {punto ? (
              <span>
                {t.puntoQueRige}: <b style={{ fontSize: 17 }}>{punto.bajo.toFixed(2)}</b> · {rotuloDelPunto(punto, lang)}
                {decision?.tipo === "galardon" && (
                  <>
                    {" "}· {t.gradoFirme} <b>{decision.grado.nombre}</b>
                    {decision.techo && <> {t.hastaConRecata(decision.techo.nombre)}</>}
                  </>
                )}
                {decision?.tipo === "pendiente_recata" && <> · {t.pendienteRecata}</>}
                {decision?.tipo === "sin_grado" && <> · {t.sinGrado}</>}
              </span>
            ) : (
              <span style={{ fontSize: 12, color: "var(--muted)" }}>
                {t.sinPunto}
                {errores.length ? `: ${errores[0]}` : "."}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Los protocolos, a lo ancho; lado a lado solo cuando se llenan los dos («Ambas») ── */}
      <div>
        <div style={verSca && verCva ? S.dosCol : { display: "grid", gap: 12 }}>
          {verSca && (
            <div style={S.bloque}>
              <h6 style={S.h6}>{t.scaTitulo}</h6>
              <p style={S.hint}>{t.scaHint(SCA2004.min.toFixed(2), SCA2004.max.toFixed(2), SCA2004.paso, SCA2004.porTaza, SCA2004.castigoTaint, SCA2004.castigoFault)}</p>
              <div style={S.pares}>
                {SCA_ATTRS.map(([key]) => (
                  <label key={key} style={S.par}>
                    <span>{SCA_ATTR_LABEL[lang][key]}</span>
                    {SCA2004_POR_TAZAS.includes(key) ? (
                      <select value={value[`sca_${key}` as keyof LabEvaluation] as string} onChange={(e) => onChange({ [`sca_${key}`]: e.target.value } as Partial<LabEvaluation>)} disabled={disabled} style={{ ...S.sel, width: 76 }}>
                        <option value="">—</option>
                        {[0, 2, 4, 6, 8, 10].map((n) => (
                          <option key={n} value={String(n)}>{n}</option>
                        ))}
                      </select>
                    ) : (
                      numInput(`sca_${key}` as keyof LabEvaluation, { step: String(SCA2004.paso), min: SCA2004.min, max: SCA2004.max })
                    )}
                  </label>
                ))}
                <label style={S.par}>
                  <span>{t.tazasTaint(SCA2004.castigoTaint)}</span>
                  {numInput("sca_taint_cups", { step: "1", max: SCA2004.tazas })}
                </label>
                <label style={S.par}>
                  <span>{t.tazasFault(SCA2004.castigoFault)}</span>
                  {numInput("sca_fault_cups", { step: "1", max: SCA2004.tazas })}
                </label>
              </div>
              <div style={S.total}>
                <span>
                  {t.totalSca}: <b style={{ fontSize: 17 }}>{sca.total != null ? sca.total.toFixed(2) : sca.calificados ? t.incompleto : "—"}</b>
                  {sca.total != null && <>/100{sca.defectos > 0 && <> ({t.defectosMenos(sca.defectos)})</>}</>}
                </span>
              </div>
              {sca.errores.map((e) => (
                <p key={e} style={S.err}>{e}</p>
              ))}
            </div>
          )}

          {verCva && (
            <div style={S.bloque}>
              <h6 style={S.h6}>{t.cvaTitulo}</h6>
              <p style={S.hint}>{t.cvaHint(CVA.min, CVA.max, CVA.coeficiente, CVA.base, CVA.castigoNoUniforme, CVA.castigoDefectuosa, CVA.paso, CVA_PROPOSITO)}</p>
              <div style={S.pares}>
                {CVA_SECCIONES.map(([key]) => (
                  <label key={key} style={S.par}>
                    <span>{CVA_SECCION_LABEL[lang][key]}</span>
                    {numInput(`cva_${key}` as keyof LabEvaluation, { step: "1", min: CVA.min, max: CVA.max, ancho: 64 })}
                  </label>
                ))}
              </div>
              <p style={{ ...S.hint, margin: "8px 0 4px" }}>{t.tazasHint(CVA.tazas, CVA.castigoNoUniforme + CVA.castigoDefectuosa)}</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(96px, 1fr))", gap: 6 }}>
                {value.cva_tazas.map((x, i) => (
                  <div key={i} style={{ border: "1px dashed var(--line)", borderRadius: 8, padding: "4px 6px", fontSize: 11.5 }}>
                    <div style={{ fontWeight: 700, marginBottom: 2 }}>{t.taza} {i + 1}</div>
                    <label style={{ display: "flex", gap: 4, alignItems: "center" }}>
                      <input type="checkbox" checked={x.noUniforme} onChange={(e) => setTaza(i, { noUniforme: e.target.checked })} disabled={disabled} /> {t.noUniforme}
                    </label>
                    <label style={{ display: "flex", gap: 4, alignItems: "center" }}>
                      <input type="checkbox" checked={x.defectuosa} onChange={(e) => setTaza(i, { defectuosa: e.target.checked })} disabled={disabled} /> {t.defectuosa}
                    </label>
                    {x.defectuosa && (
                      <select value={x.defecto} onChange={(e) => setTaza(i, { defecto: e.target.value })} disabled={disabled} style={{ ...S.sel, width: "100%", marginTop: 2, fontSize: 11.5 }}>
                        <option value="">{t.tipo}</option>
                        {CVA_DEFECTOS.map(([id]) => (
                          <option key={id} value={id}>{CVA_DEFECTO_LABEL[lang][id]}</option>
                        ))}
                      </select>
                    )}
                  </div>
                ))}
              </div>
              <div style={S.total}>
                <span>
                  {t.puntajeCva}: <b style={{ fontSize: 17 }}>{cva.total != null ? cva.total.toFixed(2) : cva.calificadas ? t.incompleto : "—"}</b>
                  {cva.total != null && <>/100</>}
                </span>
                <span style={S.pill}>u = {cva.u} · d = {cva.d} → −{CVA.castigoNoUniforme * cva.u + CVA.castigoDefectuosa * cva.d}</span>
                {cva.total != null && <span style={S.pill}>{CLASE_LABEL[lang][cva.cls] ?? cva.cls}</span>}
              </div>
              {cva.errores.map((e) => (
                <p key={e} style={S.err}>{e}</p>
              ))}
            </div>
          )}
        </div>

        {/* ── La rueda (V5.131): la Rueda del Café del taller, a tamaño de lectura, con sus marcas y las notas al lado ── */}
        <div style={{ ...S.bloque, marginTop: 12 }}>
          <h6 style={S.h6}>{t.ruedaTitulo}</h6>
          <p style={S.hint}>{t.ruedaHint}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "flex-start" }}>
            <div style={{ flex: "4 1 620px", minWidth: 0, maxWidth: 880 }}>
              <RuedaDeSabores elegidos={value.rueda} onToggle={toggleDescriptor} lang={lang} disabled={disabled} rotuloCentro={t.ruedaCentro} pista={t.ruedaPista} />
            </div>
            <div style={{ flex: "1 1 240px", minWidth: 0, display: "grid", gap: 10 }}>
              <div>
                <div style={{ ...S.lbl, display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <span>{t.marcadas}</span>
                  <span style={{ fontWeight: 400, color: "var(--muted)" }}>{t.elegidos(value.rueda.length)}</span>
                </div>
                {value.rueda.length === 0 ? (
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>{t.ninguno}</span>
                ) : (
                  <div style={{ display: "grid", gap: 4 }}>
                    {normalizaRueda(value.rueda).map((id) => (
                      <button key={id} type="button" disabled={disabled} onClick={() => toggleDescriptor(id)} title={t.quitar} style={{ ...S.marca, borderLeftColor: familiaDe(id)?.color ?? "var(--ink)" }}>
                        <span>{rutaDe(id, lang)}</span>
                        <span aria-hidden style={{ color: "var(--muted)" }}>×</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label style={S.lbl}>{t.perfil}</label>
                <textarea rows={6} value={value.cupping_profile} onChange={(e) => onChange({ cupping_profile: e.target.value })} disabled={disabled} style={{ ...S.input, fontFamily: "inherit" }} placeholder={t.perfilPh} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── B3 · Caracterización Física ── */}
      <div style={S.seccion}>
        <h5 style={S.h}>{t.b3}</h5>
        <span style={{ fontSize: 11.5, color: "var(--muted)" }}>
          {t.apoyo} <a href={URL_DEFECTOS} target="_blank" rel="noreferrer">{t.defectosTool}</a> · <a href={URL_VARIEDADES} target="_blank" rel="noreferrer">{t.variedadesTool}</a>
        </span>
      </div>
      <div style={S.dosCol}>
        {/* Los pesos de la trilla y el factor. */}
        <div style={S.bloque}>
          <div style={S.pares}>
            <label style={S.par}>
              <span>{t.pergamino}</span>
              {numInput("fa_start")}
            </label>
            <label style={S.par}>
              <span>{t.trillado}</span>
              {numInput("fa_green_remainder")}
            </label>
            <label style={S.par}>
              <span>{t.humedad}</span>
              {numInput("fa_parch_hum")}
            </label>
            <label style={S.par}>
              <span>{t.defPrimario}</span>
              {numInput("fa_primary_defect")}
            </label>
            <label style={S.par}>
              <span>{t.defSecundario}</span>
              {numInput("fa_secondary_defect")}
            </label>
            <div style={S.par}>
              <span>
                {t.merma} <small style={{ color: "var(--muted)" }}>· {t.derivado}</small>
              </span>
              <input readOnly tabIndex={-1} value={factor.start > 0 && factor.remainder > 0 ? factor.yieldLoss.toFixed(1) : ""} placeholder="auto" style={{ ...S.num, background: "var(--line)" }} />
            </div>
            <div style={S.par}>
              <span>
                {t.granoSano} <small style={{ color: "var(--muted)" }}>· {t.derivado}</small>
              </span>
              <input readOnly tabIndex={-1} value={factor.remainder > 0 ? factor.healthy.toFixed(1) : ""} placeholder="auto" style={{ ...S.num, background: "var(--line)" }} />
            </div>
          </div>
          <div style={{ marginTop: 10, display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13 }}>{t.factor}:</span>
            <b style={{ fontSize: 28, lineHeight: 1 }}>{factor.yieldFactor !== null ? factor.yieldFactor.toFixed(2) : "—"}</b>
            <span style={{ fontSize: 11.5, color: "var(--muted)" }}>{t.factorFormula}</span>
          </div>
          <div style={{ marginTop: 10 }}>
            <label style={S.lbl}>{t.notasAnalisis}</label>
            <textarea rows={3} value={value.analysis_notes} onChange={(e) => onChange({ analysis_notes: e.target.value })} disabled={disabled} style={{ ...S.input, fontFamily: "inherit" }} placeholder={t.notasAnalisisPh} />
          </div>
        </div>

        {/* La granulometría: cada malla con su peso, su porcentaje y su barra. */}
        <div style={S.bloque}>
          <table style={S.tbl}>
            <thead>
              <tr>
                <th style={S.th}>{t.granulometria}</th>
                <th style={{ ...S.th, textAlign: "right", width: 90 }}>{t.peso}</th>
                <th style={{ ...S.th, textAlign: "right", width: 56 }}>%</th>
                <th style={{ ...S.th, width: "32%" }} aria-hidden />
              </tr>
            </thead>
            <tbody>
              {mesh.rows.map((r) => {
                const isResidue = r.key === "mesh_residue";
                const alerta = isResidue && (mesh.state === "residuo_alto" || mesh.state === "excede");
                return (
                  <tr key={r.key}>
                    <td style={S.td}>{MALLA_LABEL[lang][r.key] ?? r.label}</td>
                    <td style={{ ...S.td, textAlign: "right" }}>
                      {isResidue ? (
                        <input readOnly tabIndex={-1} value={factor.healthy > 0 ? mesh.residueGrams.toFixed(1) : ""} placeholder="auto" style={{ ...S.num, background: "var(--line)" }} />
                      ) : (
                        numInput(r.key as keyof LabEvaluation)
                      )}
                    </td>
                    <td style={{ ...S.td, textAlign: "right", color: alerta ? "#C4402F" : undefined, fontWeight: isResidue ? 700 : undefined }}>{r.pct !== null ? `${r.pct.toFixed(1)}%` : "—"}</td>
                    <td style={S.td}>
                      <BarraDeMalla pct={r.pct} alerta={alerta} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td style={{ ...S.td, fontWeight: 700, borderBottom: "none" }}>{t.totalMallas}</td>
                <td style={{ ...S.td, textAlign: "right", fontWeight: 700, borderBottom: "none" }}>{factor.healthy > 0 ? `${mesh.sum.toFixed(1)} g` : "—"}</td>
                <td style={{ ...S.td, textAlign: "right", fontWeight: 700, borderBottom: "none" }}>{factor.healthy > 0 ? `${mesh.totalPct.toFixed(0)}%` : "—"}</td>
                <td style={{ ...S.td, borderBottom: "none" }} />
              </tr>
            </tfoot>
          </table>
          <p style={{ ...(mesh.state === "excede" || mesh.state === "residuo_alto" ? S.err : S.hint), margin: "6px 0 0" }}>{ESTADO_DE_MALLAS[lang][mesh.state]}</p>
        </div>
      </div>
    </div>
  );
}
