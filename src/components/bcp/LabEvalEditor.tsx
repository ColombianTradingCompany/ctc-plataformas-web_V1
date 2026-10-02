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
  contarScaTazas,
  type CvaTaza,
  type EstadoDeTazaSca,
  type LabEvaluation,
  type ScaTaza,
  type VistaDePlanilla, NOTA_DESCRIPTIVA_MAX, TAZAS_SCA, normalizaScaTazas, tazasUsadas } from "@/lib/arena/labEvaluation";
import { CVA_PROPOSITO, decidirPorPunto, rotuloDelPunto } from "@/lib/arena/homologacion";
import { ETAPAS_DE_LA_RUEDA, ETAPA_LABEL, INTENSIDAD, NOTA_MAX, ZONA_LABEL, ajustaIntensidad, alternaEtapa, detalleDe, etapasLabel, familiaDe, fmtIntensidad, normalizaRueda, rutaDe, zonaDeIntensidad, type DetalleDeMarca } from "@/lib/catacion/rueda";
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
import { COLORES_DEL_VERDE, DEFECTOS_FISICOS, MAX_TEXTURAS, TEXTURAS_EN_BOCA, TIPOS_DE_ACIDEZ, calcDefectos, normalizaTexturas } from "@/lib/catacion/fisico";
import { BarraDeMalla, Info, RadarDeTaza, RuedaDeSabores, type EjeDeRadar } from "./PlanillaPiezas";

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
marca: { fontSize: 12, padding: "4px 8px", borderRadius: 7, border: "1px solid var(--line)", borderLeft: "5px solid var(--ink)", background: "var(--paper)", color: "var(--ink)" } as const,
  marcaBoton: { flex: 1, minWidth: 0, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap", textAlign: "left", fontSize: 12, padding: 0, border: "none", background: "none", color: "inherit", cursor: "pointer" } as const,
  marcaInsignia: { fontSize: 10.5, fontWeight: 700, border: "1px solid var(--line)", borderRadius: 999, padding: "1px 7px", color: "var(--muted)", whiteSpace: "nowrap" } as const,
  marcaQuitar: { border: "none", background: "none", cursor: "pointer", color: "var(--muted)", fontSize: 15, lineHeight: 1, padding: "0 2px" } as const,
  // V5.135: la (R) de «Registrar detalle», las opciones del descriptivo y su caja.
  r: { width: 20, height: 20, borderRadius: 6, border: "1.5px solid var(--primary, #3C0A86)", background: "transparent", color: "var(--primary, #3C0A86)", fontSize: 10.5, fontWeight: 800, lineHeight: 1, cursor: "pointer", padding: 0 } as const,
  opcion: { display: "flex", gap: 6, alignItems: "flex-start", fontSize: 12, cursor: "pointer" } as const,
  descriptivo: { border: "1px solid var(--line)", borderRadius: 8, padding: "8px 10px", display: "grid", gap: 5 } as const,
  etapa: { fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999, border: "1.5px solid var(--line)", background: "transparent", color: "var(--muted)", cursor: "pointer" } as const,
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
  // V5.144 (owner, 2026-10-02): «los defectos primarios y secundarios hacen parte del trillado verde restante… no se suman con el
  // total de mallas: ya estaban incluidos allí». El verde ENTERO pasa por las mallas y los defectos se apartan de ahí: la suma de
  // mallas se compara con el TRILLADO VERDE RESTANTE, no con el grano sano. El grano sano sigue siendo la base del factor.
  const mesh = computeMesh(value, factor.remainder);
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

  // V5.133 (owner): cada marca lleva su etapa y su intensidad. Marcar crea el detalle con el valor de la herramienta (sabor · 10)
  // y abre su editor; desmarcar lo borra.
  const [marcaAbierta, setMarcaAbierta] = useState<string | null>(null);
  const toggleDescriptor = (id: string) => {
    const set = new Set(value.rueda);
    const detalle = { ...value.rueda_detalle };
    if (set.has(id)) {
      set.delete(id);
      delete detalle[id];
      if (marcaAbierta === id) setMarcaAbierta(null);
    } else {
      set.add(id);
      detalle[id] = detalleDe(null, id); // la marca nace como en la herramienta: sabor · 10, sin comentario
      setMarcaAbierta(id);
    }
    onChange({ rueda: [...set], rueda_detalle: detalle });
  };
  // V5.147 (owner): el catador elige cuántas tazas usó. Las que sobran se quitan; las que faltan nacen limpias.
  const setNumTazas = (v: string) => {
    const n = tazasUsadas(v);
    const next = normalizaScaTazas(value.sca_tazas, undefined, undefined, n);
    const cuenta = contarScaTazas(next);
    onChange({ sca_num_tazas: String(n), sca_tazas: next, sca_taint_cups: cuenta.taint ? String(cuenta.taint) : "", sca_fault_cups: cuenta.fault ? String(cuenta.fault) : "" });
  };
  // V5.135 (owner): las tazas del SCA 2004. Los contadores de taint y fault que lee la fórmula se derivan de ellas.
  const setScaTaza = (i: number, cambio: Partial<ScaTaza>) => {
    const next = value.sca_tazas.map((x, j) => (j === i ? { ...x, ...cambio, ...(cambio.estado === "" ? { defecto: "" } : {}) } : x));
    const n = contarScaTazas(next);
    onChange({ sca_tazas: next, sca_taint_cups: n.taint ? String(n.taint) : "", sca_fault_cups: n.fault ? String(n.fault) : "" });
  };
  // El detalle de los defectos físicos: se abre con la (R) de cada categoría.
  const [detalleAbierto, setDetalleAbierto] = useState<1 | 2 | null>(null);
  const defectos = calcDefectos(value.defectos_detalle);
  // La intensidad descriptiva (0–15) de la acidez y de la sensación en boca: «sin registrar» hasta que se mueve.
  // V5.144 (owner): «quiero poder tener también un comentario opcional en Acidez y Sensación en boca».
  const comentarioDe = (campo: "acidez_nota" | "boca_nota", de: string) => (
    <input
      type="text"
      value={value[campo]}
      maxLength={NOTA_DESCRIPTIVA_MAX}
      disabled={disabled}
      placeholder={t.comentarioPh}
      aria-label={`${t.comentario}: ${de}`}
      onChange={(e) => onChange({ [campo]: e.target.value.slice(0, NOTA_DESCRIPTIVA_MAX) } as Partial<LabEvaluation>)}
      style={{ width: "100%", marginTop: 6, fontSize: 12, padding: "5px 8px", borderRadius: 6, border: "1px solid var(--line)", background: "var(--card, #fff)", color: "var(--ink)" }}
    />
  );
  const intensidadDe = (campo: "acidez_intensidad" | "boca_intensidad") => {
    const v = numOrNull(value[campo]);
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input
          type="range"
          aria-label={t.intensidad}
          min={INTENSIDAD.min}
          max={INTENSIDAD.max}
          step={INTENSIDAD.paso}
          value={v ?? 0}
          disabled={disabled}
          onChange={(e) => onChange({ [campo]: String(ajustaIntensidad(e.target.value)) } as Partial<LabEvaluation>)}
          style={{ flex: 1, minWidth: 0, opacity: v == null ? 0.5 : 1 }}
        />
        <b className="mono" style={{ fontSize: 11.5, minWidth: 96, textAlign: "right", fontWeight: v == null ? 400 : 700, color: v == null ? "var(--muted)" : "var(--ink)" }}>
          {v == null ? t.sinRegistrar : `${fmtIntensidad(v)}/${INTENSIDAD.max} · ${ZONA_LABEL[lang][zonaDeIntensidad(v)]}`}
        </b>
        {v != null && (
          <button type="button" title={t.borrar} aria-label={t.borrar} disabled={disabled} onClick={() => onChange({ [campo]: "" } as Partial<LabEvaluation>)} style={S.marcaQuitar}>
            ×
          </button>
        )}
      </div>
    );
  };
  const setDetalle = (id: string, cambio: Partial<DetalleDeMarca>) => onChange({ rueda_detalle: { ...value.rueda_detalle, [id]: { ...detalleDe(value.rueda_detalle, id), ...cambio } } });

  // El radar enseña el protocolo que la vista deja ver: los diez atributos SCA o las ocho secciones CVA. V5.135: el centro es 0.
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
          <RadarDeTaza ejes={ejes} max={radarSca ? SCA2004.max : CVA.max} marcas={radarSca ? [2, 4, 6, 8, 10] : [3, 6, 9]} />
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
                    {/* V5.135 (owner): Uniformidad, Taza limpia y Dulzor se teclean igual que los demás (pasos de 0,25); su piso es 0. */}
                    {numInput(`sca_${key}` as keyof LabEvaluation, { step: String(SCA2004.paso), min: SCA2004_POR_TAZAS.includes(key) ? 0 : SCA2004.min, max: SCA2004.max })}
                  </label>
                ))}
              </div>
              {/* V5.135 (owner): taint y fault, taza a taza y con el mismo selector de tipo que la taza defectuosa del CVA; cada uno
                  con su «i». Los dos contadores que lee la fórmula se derivan de aquí. */}
              <div style={{ ...S.lbl, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", margin: "10px 0 4px" }}>
                <span>{t.tazasSca}</span>
                {/* V5.147 (owner): «permite elegir el número de tazas usadas» — cinco por protocolo, de 1 a 10. */}
                <label style={{ display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 400 }}>
                  {t.tazasUsadas}
                  <select value={value.sca_num_tazas} onChange={(e) => setNumTazas(e.target.value)} disabled={disabled} aria-label={t.tazasUsadas} style={{ ...S.sel, width: 58, fontSize: 11.5 }}>
                    {Array.from({ length: TAZAS_SCA.max - TAZAS_SCA.min + 1 }, (_, k) => TAZAS_SCA.min + k).map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </label>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 400 }}>
                  taint <Info texto={t.infoTaint} />
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 400 }}>
                  fault <Info texto={t.infoFault} />
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(118px, 1fr))", gap: 6 }}>
                {value.sca_tazas.map((x, i) => (
                  <div key={i} style={{ border: "1px dashed var(--line)", borderRadius: 8, padding: "4px 6px", fontSize: 11.5 }}>
                    <div style={{ fontWeight: 700, marginBottom: 2 }}>{t.taza} {i + 1}</div>
                    <select aria-label={`${t.taza} ${i + 1}`} value={x.estado} onChange={(e) => setScaTaza(i, { estado: e.target.value as EstadoDeTazaSca })} disabled={disabled} style={{ ...S.sel, width: "100%", fontSize: 11.5 }}>
                      <option value="">{t.limpia}</option>
                      <option value="taint">{t.tazaTaint(SCA2004.castigoTaint)}</option>
                      <option value="fault">{t.tazaFault(SCA2004.castigoFault)}</option>
                    </select>
                    {x.estado && (
                      <select value={x.defecto} onChange={(e) => setScaTaza(i, { defecto: e.target.value })} disabled={disabled} style={{ ...S.sel, width: "100%", marginTop: 2, fontSize: 11.5 }}>
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
                    {numInput(`cva_${key}` as keyof LabEvaluation, { step: String(CVA.pasoSeccion), min: CVA.min, max: CVA.max, ancho: 70 })}
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
                    {/* V5.133 (owner): cada marca lleva su ETAPA y su INTENSIDAD, como el modo Catar de la herramienta. Tocar la marca
                        abre su editor; la recién marcada llega abierta. */}
                    {normalizaRueda(value.rueda).map((id) => {
                      const d = detalleDe(value.rueda_detalle, id);
                      const abierta = marcaAbierta === id;
                      return (
                        <div key={id} style={{ ...S.marca, borderLeftColor: familiaDe(id)?.color ?? "var(--ink)" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <button type="button" aria-expanded={abierta} onClick={() => setMarcaAbierta(abierta ? null : id)} style={S.marcaBoton}>
                              <span>{rutaDe(id, lang)}</span>
                              <span style={S.marcaInsignia}>
                                {etapasLabel(d.etapas, lang)} · {fmtIntensidad(d.intensidad)}
                                {d.nota.trim() ? " · 💬" : ""}
                              </span>
                            </button>
                            <button type="button" disabled={disabled} onClick={() => toggleDescriptor(id)} title={t.quitar} aria-label={`${t.quitar}: ${rutaDe(id, lang)}`} style={S.marcaQuitar}>
                              ×
                            </button>
                          </div>
                          {abierta && (
                            <div style={{ display: "grid", gap: 6, marginTop: 6 }}>
                              {/* V5.140 (owner): una nota puede resaltarse en VARIAS etapas — cada píldora se enciende y se apaga
                                  por separado; la última encendida no se apaga (una nota sin etapa no dice dónde se percibió). */}
                              <div role="group" aria-label={t.etapa} style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                                {ETAPAS_DE_LA_RUEDA.map((etapa) => (
                                  <button
                                    key={etapa}
                                    type="button"
                                    aria-pressed={d.etapas.includes(etapa)}
                                    disabled={disabled}
                                    onClick={() => setDetalle(id, { etapas: alternaEtapa(d.etapas, etapa) })}
                                    style={{ ...S.etapa, ...(d.etapas.includes(etapa) ? { background: "var(--primary, #3C0A86)", border: "1.5px solid var(--primary, #3C0A86)", color: "#fff" } : {}) }}
                                  >
                                    {ETAPA_LABEL[lang][etapa]}
                                  </button>
                                ))}
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <input
                                  type="range"
                                  aria-label={t.intensidad}
                                  min={INTENSIDAD.min}
                                  max={INTENSIDAD.max}
                                  step={INTENSIDAD.paso}
                                  value={d.intensidad}
                                  disabled={disabled}
                                  onChange={(e) => setDetalle(id, { intensidad: ajustaIntensidad(e.target.value) })}
                                  style={{ flex: 1, minWidth: 0 }}
                                />
                                <b className="mono" style={{ fontSize: 12.5, minWidth: 58, textAlign: "right" }}>
                                  {fmtIntensidad(d.intensidad)}/{INTENSIDAD.max}
                                </b>
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5, letterSpacing: ".04em", color: "var(--muted)" }}>
                                {(["baja", "media", "alta"] as const).map((z) => (
                                  <span key={z} style={zonaDeIntensidad(d.intensidad) === z ? { color: "var(--ink)", fontWeight: 800 } : undefined}>
                                    {ZONA_LABEL[lang][z]}
                                  </span>
                                ))}
                              </div>
                              {/* V5.140 (owner): un comentario opcional por nota — una línea, no el perfil de taza. */}
                              <input
                                type="text"
                                value={d.nota}
                                maxLength={NOTA_MAX}
                                disabled={disabled}
                                placeholder={t.notaDeMarcaPh}
                                aria-label={`${t.notaDeMarca}: ${rutaDe(id, lang)}`}
                                onChange={(e) => setDetalle(id, { nota: e.target.value.slice(0, NOTA_MAX) })}
                                style={{ width: "100%", fontSize: 12, padding: "5px 8px", borderRadius: 6, border: "1px solid var(--line)", background: "var(--card, #fff)", color: "var(--ink)" }}
                              />
                            </div>
                          )}
                          {!abierta && d.nota.trim() && <div style={{ fontSize: 11, color: "var(--muted)", fontStyle: "italic", marginTop: 2 }}>«{d.nota.trim()}»</div>}
                        </div>
                      );
                    })}
                    <p style={{ ...S.hint, margin: "2px 0 0" }}>{t.marcasHint}</p>
                  </div>
                )}
              </div>
              {/* V5.135 (owner): lo que el formato descriptivo pide de la acidez y de la sensación en boca y «no está en la rueda como
                  tal» — la intensidad (0–15) y sus opciones: una para la acidez, hasta dos para la boca. No entra en el puntaje. */}
              <div style={S.descriptivo}>
                <div style={S.lbl}>
                  {t.acidez} <small style={{ fontWeight: 400, color: "var(--muted)" }}>· {t.intensidad} · {t.elijaUna}</small>
                </div>
                {intensidadDe("acidez_intensidad")}
                {TIPOS_DE_ACIDEZ.map((o) => (
                  <label key={o.key} style={S.opcion}>
                    <input type="checkbox" checked={value.acidez_tipo === o.key} disabled={disabled} onChange={(e) => onChange({ acidez_tipo: e.target.checked ? o.key : "" })} /> {o[lang]}
                  </label>
                ))}
                {comentarioDe("acidez_nota", t.acidez)}
              </div>
              <div style={S.descriptivo}>
                <div style={S.lbl}>
                  {t.boca} <small style={{ fontWeight: 400, color: "var(--muted)" }}>· {t.intensidad} · {t.hastaDos}</small>
                </div>
                {intensidadDe("boca_intensidad")}
                {TEXTURAS_EN_BOCA.map((o) => {
                  const on = value.boca_texturas.includes(o.key);
                  return (
                    <label key={o.key} style={{ ...S.opcion, ...(!on && value.boca_texturas.length >= MAX_TEXTURAS ? { opacity: 0.5 } : {}) }}>
                      <input
                        type="checkbox"
                        checked={on}
                        disabled={disabled || (!on && value.boca_texturas.length >= MAX_TEXTURAS)}
                        onChange={(e) => onChange({ boca_texturas: normalizaTexturas(e.target.checked ? [...value.boca_texturas, o.key] : value.boca_texturas.filter((k) => k !== o.key)) })}
                      />{" "}
                      {o[lang]}
                    </label>
                  );
                })}
                {comentarioDe("boca_nota", t.boca)}
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
            {/* V5.144 (owner): faltaba la humedad del café VERDE (el mismo campo de la Ficha, `b3_humedad_verde`). */}
            <label style={S.par}>
              <span>{t.humedadVerde}</span>
              {numInput("b3_humedad_verde")}
            </label>
            {/* V5.135 (owner): los gramos se quedan («me gusta por simplicidad»); la (R) abre el detalle — cuál defecto es cuál. */}
            {([1, 2] as const).map((cat) => (
              <div key={cat} style={S.par}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  {cat === 1 ? t.defPrimario : t.defSecundario}
                  <button type="button" onClick={() => setDetalleAbierto(detalleAbierto === cat ? null : cat)} aria-expanded={detalleAbierto === cat} title={t.detalle} aria-label={`${t.detalle}: ${cat === 1 ? t.defPrimario : t.defSecundario}`} style={{ ...S.r, ...(detalleAbierto === cat ? { background: "var(--primary, #3C0A86)", color: "#fff" } : {}) }}>
                    R
                  </button>
                  {(cat === 1 ? defectos.cat1 : defectos.cat2) > 0 && <small style={{ color: "var(--muted)" }}>{cat === 1 ? defectos.cat1 : defectos.cat2}</small>}
                </span>
                {numInput(cat === 1 ? "fa_primary_defect" : "fa_secondary_defect")}
              </div>
            ))}
            <label style={S.par}>
              <span>{t.color}</span>
              <select value={value.fa_color} onChange={(e) => onChange({ fa_color: e.target.value })} disabled={disabled} style={{ ...S.sel, maxWidth: 160 }}>
                <option value="">—</option>
                {COLORES_DEL_VERDE.map((o) => (
                  <option key={o.key} value={o.key}>{o[lang]}</option>
                ))}
              </select>
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
          {detalleAbierto && (
            <div style={{ border: "1px dashed var(--line)", borderRadius: 8, padding: "8px 10px", marginTop: 8 }}>
              <div style={{ ...S.lbl, display: "flex", justifyContent: "space-between", gap: 8 }}>
                <span>{t.detalleCat(detalleAbierto)}</span>
                <button type="button" onClick={() => setDetalleAbierto(null)} title={t.cerrar} aria-label={t.cerrar} style={S.marcaQuitar}>
                  ×
                </button>
              </div>
              <table style={S.tbl}>
                <thead>
                  <tr>
                    <th style={S.th}>{t.thDefecto}</th>
                    <th style={{ ...S.th, textAlign: "right", width: 54 }}>{t.thEq}</th>
                    <th style={{ ...S.th, textAlign: "right", width: 90 }}>{t.thGranos}</th>
                    <th style={{ ...S.th, textAlign: "right", width: 86 }}>{t.thCompletos}</th>
                  </tr>
                </thead>
                <tbody>
                  {DEFECTOS_FISICOS.filter((d) => d.cat === detalleAbierto).map((d) => (
                    <tr key={d.key}>
                      <td style={S.td}>{d[lang]}</td>
                      <td style={{ ...S.td, textAlign: "right", color: "var(--muted)" }}>({d.granos}:1)</td>
                      <td style={{ ...S.td, textAlign: "right" }}>
                        <input
                          type="number"
                          step="1"
                          min={0}
                          aria-label={`${d[lang]} · ${t.thGranos}`}
                          value={value.defectos_detalle[d.key] ?? ""}
                          onChange={(e) => onChange({ defectos_detalle: { ...value.defectos_detalle, [d.key]: e.target.value } })}
                          disabled={disabled}
                          style={{ ...S.num, width: 70 }}
                        />
                      </td>
                      <td style={{ ...S.td, textAlign: "right", fontWeight: 700 }}>{defectos.filas[d.key].granos > 0 ? defectos.filas[d.key].completos : "—"}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td style={{ ...S.td, fontWeight: 700, borderBottom: "none" }} colSpan={3}>{t.totalCat(detalleAbierto)}</td>
                    <td style={{ ...S.td, textAlign: "right", fontWeight: 800, borderBottom: "none" }}>{detalleAbierto === 1 ? defectos.cat1 : defectos.cat2}</td>
                  </tr>
                </tfoot>
              </table>
              <p style={{ ...S.hint, margin: "6px 0 0" }}>
                {t.detalleHint} {t.totalDefectos}: <b style={{ color: "var(--ink)" }}>{defectos.total}</b>
              </p>
            </div>
          )}
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
                        <input readOnly tabIndex={-1} value={factor.remainder > 0 ? mesh.residueGrams.toFixed(1) : ""} placeholder="auto" style={{ ...S.num, background: "var(--line)" }} />
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
                <td style={{ ...S.td, textAlign: "right", fontWeight: 700, borderBottom: "none" }}>{factor.remainder > 0 ? `${mesh.sum.toFixed(1)} g` : "—"}</td>
                <td style={{ ...S.td, textAlign: "right", fontWeight: 700, borderBottom: "none" }}>{factor.remainder > 0 ? `${mesh.totalPct.toFixed(0)}%` : "—"}</td>
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
