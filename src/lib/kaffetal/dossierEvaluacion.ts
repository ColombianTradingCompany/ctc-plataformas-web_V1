// ── V5.165 (owner, 2026-10-06): «una vez galardonado, el dossier debe incluir TODO: B1, B2 y B3» ─────────────────────
// Lo que el dossier del lote pinta de la caracterización, ya resuelto en texto (ES · EN) para que el documento siga siendo
// presentacional:
//   · B1 — lo que DECLARÓ el productor en su Ficha (variedades con su porcentaje y su proceso, especie, humedad, densidad,
//     aw, factor).
//   · B2 — el perfil de taza de la EVALUACIÓN QUE RIGE (la planilla del Q-Grader): SCA 2004 atributo por atributo y tazas,
//     CVA si lo hubo, rueda con etapas e intensidad, acidez, sensación en boca, perfil.
//   · B3 — lo físico de esa misma evaluación: pesos, humedades, aw, densidad, factor, almendra defectuosa, color, detalle de
//     defectos y granulometría.
//   · Las anotaciones de mejora de la Rueda del Sabor para las notas de defecto marcadas.
// Una evaluación anterior a la V5.81 no guarda la planilla entera: se reconstruye de sus columnas (`sca_data`, `physical_data`).
// PURO: lo leen la página del dossier y `qa-centro-calidad`.

import { SCA_ATTRS } from "@/components/kaffetal-regal/ficha/fichaData";
import { CVA_SECCIONES, computeCva, computeFactor, computeMesh, computeSca2004, factorDeLaPlanilla, labEvaluationHasData, toLabEvaluation, type LabEvaluation } from "@/lib/arena/labEvaluation";
import { CVA_SECCION_LABEL, ESTADO_DE_MALLAS, MALLA_LABEL, SCA_ATTR_LABEL } from "@/lib/arena/planillaI18n";
import { COLORES_DEL_VERDE, DEFECTOS_FISICOS, TEXTURAS_EN_BOCA, TIPOS_DE_ACIDEZ, calcDefectos, opcionLabel } from "@/lib/catacion/fisico";
import { anotacionesDeMejora, descriptorLabel, detalleDe, etapasLabel, familiaDe, fmtIntensidad, normalizaDetalle, normalizaRueda, rutaDe, type AnotacionDeMejora } from "@/lib/catacion/rueda";

export type Lang = "es" | "en";
export type Par = { k: string; v: string };

export type DossierB1 = { variedades: { nombre: string; pct: string; proceso: string }[]; pares: Par[] };
export type DossierB2 = {
  sca: { filas: Par[]; total: string | null; tazas: string | null } | null;
  cva: { filas: Par[]; total: string | null } | null;
  rueda: { ruta: string; detalle: string; comentario: string }[];
  descriptivo: Par[];
  perfil: string | null;
};
export type DossierB3 = { pares: Par[]; defectos: { defecto: string; granos: string; completos: string }[]; mallas: { malla: string; gramos: string; pct: string }[]; estadoMallas: string | null; notas: string | null };
/** V5.166: las CIFRAS de la planilla que rige, en número, para las gráficas del dossier (radar, rendimiento, mallas, medidores). */
export type DossierCifras = {
  sca: { k: string; label: string; v: number }[];
  scaTotal: number | null;
  /** V5.197: `corto` = el rótulo de la esquina en la telaraña de 8 esquinas («Fragancia», no «Fragancia (café molido, en seco)»). */
  cva: { k: string; label: string; corto: string; v: number }[];
  cvaTotal: number | null;
  /** V5.197: las tazas del CVA (las que se usaron, las no uniformes y las defectuosas, que restan 2 y 4 puntos). */
  cvaTazas: { n: number; u: number; d: number } | null;
  /** Las notas de la rueda con el color de su familia y su intensidad (0–15). V5.197: `contexto` = de dónde cuelga en la
   *  rueda («Frutal › Otras frutas») y `comentario` = lo que el Q-Grader escribió de esa nota («Albaricoque», «Panela»). */
  rueda: { id: string; nota: string; familiaId: string; familia: string; contexto: string; color: string; intensidad: number; etapas: string; comentario: string; defecto: boolean }[];
  /** V5.197: lo descriptivo que no es una nota: el tipo de acidez y las texturas en boca, cada uno con su intensidad (0–15). */
  descriptivo: {
    acidez: { tipo: "dulce" | "seca" | null; intensidad: number | null; nota: string | null } | null;
    boca: { texturas: { key: string; label: string }[]; intensidad: number | null; nota: string | null } | null;
  };
  /** Los pesos del análisis físico, en gramos (null si no se pesó). */
  pesos: { pergamino: number; verde: number; merma: number; primario: number; secundario: number; sano: number } | null;
  humedadPergamino: number | null;
  humedadVerde: number | null;
  aw: number | null;
  densidad: number | null;
  factor: number | null;
  defectuosaPct: number | null;
  mallas: { key: string; malla: string; gramos: number; pct: number }[];
  defectos: { key: string; defecto: string; granos: number; completos: number; categoria: 1 | 2 }[];
};
export type DossierCaracterizacion = { b1: DossierB1 | null; b2: DossierB2 | null; b3: DossierB3 | null; anotaciones: AnotacionDeMejora[]; cifras?: DossierCifras | null };

const num = (v: unknown): number | null => {
  const x = Number(String(v ?? "").replace(",", "."));
  return String(v ?? "").trim() !== "" && Number.isFinite(x) ? x : null;
};

const n = (v: unknown, d = 2): string | null => {
  const x = Number(String(v ?? "").replace(",", "."));
  return String(v ?? "").trim() !== "" && Number.isFinite(x) ? x.toFixed(d) : null;
};
const par = (k: string, v: string | null | undefined): Par | null => (v != null && String(v).trim() !== "" ? { k, v: String(v) } : null);
const pares = (...xs: (Par | null)[]): Par[] => xs.filter((x): x is Par => x !== null);

/** V5.197: el rótulo corto de cada atributo del CVA, para las esquinas de la telaraña. */
const CVA_CORTO: Record<Lang, Record<string, string>> = {
  es: { fragrance: "Fragancia", aroma: "Aroma", flavor: "Sabor", aftertaste: "Sabor residual", acidity: "Acidez", sweetness: "Dulzor", mouthfeel: "Sensación en boca", overall: "Impresión general" },
  en: { fragrance: "Fragrance", aroma: "Aroma", flavor: "Flavor", aftertaste: "Aftertaste", acidity: "Acidity", sweetness: "Sweetness", mouthfeel: "Mouthfeel", overall: "Overall" },
};

const L = {
  es: { especie: "Especie", humedad: "Humedad del verde", densidad: "Densidad", aw: "Actividad de agua (aw)", factor: "Factor de rendimiento", noLoSabe: "No lo sabe (declarado por el productor)", proceso: "Proceso", tazas: "Tazas", taint: "taint", fault: "fault", acidez: "Acidez", boca: "Sensación en boca", intensidad: "intensidad", pergamino: "Muestra de pergamino", trillado: "Trillado verde restante", humPerg: "Humedad del pergamino", humVerde: "Humedad del verde", defPrim: "Defecto primario", defSec: "Defecto secundario", merma: "Merma de trilla", sano: "Grano sano", defectuosa: "Almendra defectuosa", color: "Color del grano verde", factorRep: "Factor reportado por el laboratorio" },
  en: { especie: "Species", humedad: "Green moisture", densidad: "Density", aw: "Water activity (aw)", factor: "Yield factor", noLoSabe: "Unknown (declared by the producer)", proceso: "Process", tazas: "Cups", taint: "taint", fault: "fault", acidez: "Acidity", boca: "Mouthfeel", intensidad: "intensity", pergamino: "Parchment sample", trillado: "Green after hulling", humPerg: "Parchment moisture", humVerde: "Green moisture", defPrim: "Primary defects", defSec: "Secondary defects", merma: "Hulling loss", sano: "Sound beans", defectuosa: "Defective beans", color: "Green bean colour", factorRep: "Factor reported by the lab" },
};

/** B1 — lo que declaró el productor (la Ficha del lote). */
export function b1DelDossier(ds: Record<string, unknown> | null | undefined, lang: Lang): DossierB1 | null {
  if (!ds) return null;
  const t = L[lang];
  const variedades = ((ds.varieties as { name?: string; pct?: string; base?: string; special?: string }[] | undefined) ?? [])
    .filter((v) => String(v.name ?? "").trim())
    .map((v) => ({ nombre: String(v.name).trim(), pct: String(v.pct ?? "").trim(), proceso: [v.base, v.special].map((x) => String(x ?? "").trim()).filter(Boolean).join(" + ") }));
  // Lo que el productor marcó «No lo sé» se dice dato por dato, no en una línea suelta.
  const noSabe = new Set(Array.isArray(ds.b1_unknown) ? (ds.b1_unknown as string[]) : []);
  const oNoSabe = (clave: string, v: string | null) => v ?? (noSabe.has(clave) ? t.noLoSabe : null);
  const procesoDelLote = [ds.base_processing, ds.special_processing].map((x) => String(x ?? "").trim()).filter(Boolean).join(" + ");
  const b1 = {
    variedades,
    pares: pares(
      par(t.especie, ds.species as string),
      par(t.humedad, n(ds.green_bean_humidity, 1) ? `${n(ds.green_bean_humidity, 1)} %` : null),
      par(t.densidad, oNoSabe("density", n(ds.green_bean_density, 0) ? `${n(ds.green_bean_density, 0)} g/L` : null)),
      par(t.aw, oNoSabe("water_activity", n(ds.water_activity, 3))),
      par(t.factor, oNoSabe("yield_factor", n(ds.yield_factor_producer, 2))),
      // El proceso del lote cuando las variedades no traen el suyo.
      variedades.some((v) => v.proceso) ? null : par(t.proceso, procesoDelLote || null)
    ),
  };
  return b1.variedades.length || b1.pares.length ? b1 : null;
}

/** La planilla de una evaluación: la guardada entera (V5.81+), o reconstruida de sus columnas (anteriores). */
export function planillaDeEvaluacion(row: { physical_data?: unknown; sca_data?: unknown; rueda?: unknown; rueda_detalle?: unknown } | null | undefined): LabEvaluation | null {
  if (!row) return null;
  const pd = (row.physical_data ?? {}) as Record<string, unknown>;
  if (pd.planilla && typeof pd.planilla === "object") return toLabEvaluation(pd.planilla);
  const sd = (row.sca_data ?? {}) as Record<string, unknown>;
  const sca = Object.fromEntries(SCA_ATTRS.map(([k]) => [`sca_${k}`, sd[k] != null ? String(sd[k]) : ""]));
  const cva = Object.fromEntries(CVA_SECCIONES.map(([k]) => [`cva_${k}`, sd[`cva_${k}`] != null ? String(sd[`cva_${k}`]) : ""]));
  const ev = toLabEvaluation({ ...pd, ...sca, ...cva, sca_taint_cups: sd.sca_taint_cups != null ? String(sd.sca_taint_cups) : "", sca_fault_cups: sd.sca_fault_cups != null ? String(sd.sca_fault_cups) : "", rueda: row.rueda, rueda_detalle: row.rueda_detalle, vista: sd.cva_total != null && sd.sca_total_2004 == null ? "cva" : "sca" });
  return labEvaluationHasData(ev) ? ev : null;
}

/** B2 y B3 de la evaluación que rige, más las anotaciones de mejora de su rueda. */
export function caracterizacionDelDossier(ds: Record<string, unknown> | null | undefined, planilla: LabEvaluation | null, lang: Lang): DossierCaracterizacion {
  const t = L[lang];
  const b1 = b1DelDossier(ds, lang);
  if (!planilla) return { b1, b2: null, b3: null, anotaciones: [] };
  const ev = planilla;
  // ── B2 ──
  const sca = computeSca2004(ev, lang);
  const filasSca = pares(...SCA_ATTRS.map(([k]) => par(SCA_ATTR_LABEL[lang][k], n(ev[`sca_${k}` as keyof LabEvaluation]))));
  const cva = computeCva(ev, lang);
  const filasCva = pares(...CVA_SECCIONES.map(([k]) => par(CVA_SECCION_LABEL[lang][k], n(ev[`cva_${k}` as keyof LabEvaluation]))));
  const ids = normalizaRueda(ev.rueda);
  const detalle = normalizaDetalle(ev.rueda_detalle, ids);
  const acidez = ev.acidez_tipo || ev.acidez_intensidad || ev.acidez_nota ? [ev.acidez_tipo ? opcionLabel(TIPOS_DE_ACIDEZ, ev.acidez_tipo, lang) : null, ev.acidez_intensidad ? `${t.intensidad} ${ev.acidez_intensidad}/15` : null, ev.acidez_nota || null].filter(Boolean).join(" · ") : null;
  const boca = ev.boca_texturas.length || ev.boca_intensidad || ev.boca_nota ? [ev.boca_texturas.map((k) => opcionLabel(TEXTURAS_EN_BOCA, k, lang)).join(", ") || null, ev.boca_intensidad ? `${t.intensidad} ${ev.boca_intensidad}/15` : null, ev.boca_nota || null].filter(Boolean).join(" · ") : null;
  const b2: DossierB2 = {
    sca: filasSca.length ? { filas: filasSca, total: sca.total != null ? sca.total.toFixed(2) : null, tazas: `${ev.sca_num_tazas} · ${t.taint} ${ev.sca_taint_cups || "0"} · ${t.fault} ${ev.sca_fault_cups || "0"}` } : null,
    cva: filasCva.length ? { filas: filasCva, total: cva.total != null ? cva.total.toFixed(2) : null } : null,
    rueda: ids.map((id) => {
      const d = detalleDe(detalle, id);
      return { ruta: rutaDe(id, lang), detalle: `${etapasLabel(d.etapas, lang)} · ${fmtIntensidad(d.intensidad)}/15`, comentario: d.nota };
    }),
    descriptivo: pares(par(t.acidez, acidez), par(t.boca, boca)),
    perfil: ev.cupping_profile?.trim() || null,
  };
  // ── B3 ──
  const factor = computeFactor(ev);
  const mesh = computeMesh(ev, factor.remainder);
  const defectos = calcDefectos(ev.defectos_detalle);
  const g = (v: unknown, d = 1) => (n(v, d) ? `${n(v, d)} g` : null);
  const pct = (v: unknown, d = 1) => (n(v, d) ? `${n(v, d)} %` : null);
  const fq = factorDeLaPlanilla(ev);
  const b3: DossierB3 = {
    pares: pares(
      par(t.pergamino, g(ev.fa_start)),
      par(t.trillado, g(ev.fa_green_remainder)),
      par(t.humPerg, pct(ev.fa_parch_hum)),
      par(t.humVerde, pct(ev.b3_humedad_verde)),
      par(t.aw, n(ev.b3_actividad_agua, 3)),
      par(t.densidad, n(ev.b3_densidad_verde, 0) ? `${n(ev.b3_densidad_verde, 0)} g/L` : null),
      par(t.defPrim, g(ev.fa_primary_defect)),
      par(t.defSec, g(ev.fa_secondary_defect)),
      par(t.merma, factor.start > 0 && factor.remainder > 0 ? `${factor.yieldLoss.toFixed(1)} g` : null),
      par(t.sano, factor.remainder > 0 ? `${factor.healthy.toFixed(1)} g` : null),
      par(t.defectuosa, factor.defectivePct != null ? `${factor.defectivePct.toFixed(1)} %` : null),
      par(t.color, ev.fa_color ? opcionLabel(COLORES_DEL_VERDE, ev.fa_color, lang) : null),
      par(t.factor, fq != null ? fq.toFixed(2) : null),
      par(t.factorRep, n(ev.b3_factor_reportado, 2))
    ),
    defectos: DEFECTOS_FISICOS.filter((d) => defectos.filas[d.key].granos > 0).map((d) => ({ defecto: d[lang], granos: String(defectos.filas[d.key].granos), completos: String(defectos.filas[d.key].completos) })),
    mallas: factor.remainder > 0 ? mesh.rows.filter((r) => r.grams > 0 || r.key === "mesh_residue").map((r) => ({ malla: MALLA_LABEL[lang][r.key] ?? r.label, gramos: r.key === "mesh_residue" ? mesh.residueGrams.toFixed(1) : r.grams.toFixed(1), pct: r.pct != null ? `${r.pct.toFixed(1)} %` : "—" })) : [],
    estadoMallas: factor.remainder > 0 ? ESTADO_DE_MALLAS[lang][mesh.state] ?? null : null,
    notas: ev.analysis_notes?.trim() || null,
  };
  // ── V5.166: las cifras para las gráficas ──
  const anot = new Set(anotacionesDeMejora(ev.rueda, lang).map((a) => a.id));
  const cifras: DossierCifras = {
    sca: SCA_ATTRS.flatMap(([k]) => {
      const v = num(ev[`sca_${k}` as keyof LabEvaluation]);
      return v == null ? [] : [{ k, label: SCA_ATTR_LABEL[lang][k], v }];
    }),
    scaTotal: sca.total ?? null,
    cva: CVA_SECCIONES.flatMap(([k]) => {
      const v = num(ev[`cva_${k}` as keyof LabEvaluation]);
      return v == null ? [] : [{ k, label: CVA_SECCION_LABEL[lang][k], corto: CVA_CORTO[lang][k] ?? CVA_SECCION_LABEL[lang][k], v }];
    }),
    cvaTotal: cva.total ?? null,
    cvaTazas: cva.total != null ? { n: num(ev.cva_num_tazas) ?? 0, u: cva.u, d: cva.d } : null,
    rueda: ids.map((id) => {
      const d = detalleDe(detalle, id);
      const f = familiaDe(id);
      const ruta = rutaDe(id, lang).split(" › ");
      return {
        id,
        nota: descriptorLabel(id, lang),
        familiaId: f?.id ?? "",
        familia: f ? (lang === "en" ? f.en : f.es) : "",
        contexto: ruta.length > 1 ? ruta.slice(0, -1).join(" › ") : "",
        color: f?.color ?? "#8A8F98",
        intensidad: d.intensidad,
        etapas: etapasLabel(d.etapas, lang),
        comentario: d.nota,
        defecto: anot.has(id),
      };
    }),
    descriptivo: {
      acidez:
        ev.acidez_tipo || ev.acidez_intensidad || ev.acidez_nota
          ? { tipo: ev.acidez_tipo === "dulce" || ev.acidez_tipo === "seca" ? ev.acidez_tipo : null, intensidad: num(ev.acidez_intensidad), nota: ev.acidez_nota?.trim() || null }
          : null,
      boca:
        ev.boca_texturas.length || ev.boca_intensidad || ev.boca_nota
          ? { texturas: ev.boca_texturas.map((k) => ({ key: k, label: opcionLabel(TEXTURAS_EN_BOCA, k, lang) })), intensidad: num(ev.boca_intensidad), nota: ev.boca_nota?.trim() || null }
          : null,
    },
    pesos: factor.start > 0 && factor.remainder > 0 ? { pergamino: factor.start, verde: factor.remainder, merma: factor.yieldLoss, primario: num(ev.fa_primary_defect) ?? 0, secundario: num(ev.fa_secondary_defect) ?? 0, sano: factor.healthy } : null,
    humedadPergamino: num(ev.fa_parch_hum),
    humedadVerde: num(ev.b3_humedad_verde),
    aw: num(ev.b3_actividad_agua),
    densidad: num(ev.b3_densidad_verde),
    factor: fq ?? null,
    defectuosaPct: factor.defectivePct,
    mallas: factor.remainder > 0 ? mesh.rows.filter((r) => r.grams > 0 || r.key === "mesh_residue").map((r) => ({ key: r.key, malla: MALLA_LABEL[lang][r.key] ?? r.label, gramos: r.key === "mesh_residue" ? mesh.residueGrams : r.grams, pct: r.pct ?? 0 })) : [],
    defectos: DEFECTOS_FISICOS.filter((d) => defectos.filas[d.key].granos > 0).map((d) => ({ key: d.key, defecto: d[lang], granos: defectos.filas[d.key].granos, completos: defectos.filas[d.key].completos, categoria: (d.cat === 2 ? 2 : 1) as 1 | 2 })),
  };
  return { b1, b2, b3, anotaciones: anotacionesDeMejora(ev.rueda, lang), cifras };
}
