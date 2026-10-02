// ── La planilla de evaluación (B2/B3 · SCA 2004 y/o CVA · rueda) ─────────────
// La estructura con la que se registra una evaluación sensorial y física con las MISMAS interfaces B2 (Perfil
// de Taza) y B3 (Caracterización Física) de la Ficha Técnica. La escriben:
//   · el Q-Grader del Centro de Calidad (V5.81, `panel/evaluacion`) → `lot_evaluations` pendiente;
//   · CTCx en «Lotes en Evaluación» mientras el Centro no la registre (`arena_inscriptions.sondeo_evaluation`);
//   · la Arena, como segunda apreciación (`registrarApreciacion`).
// Los nombres de campo son los de FichaFormData a propósito: la aritmética (computeFactor/computeMesh/computeSca
// en fichaCalculations.ts) se comparte 1:1 y cualquier visor de Ficha entiende el shape sin traducción.
//
// V5.81 (folio 11 del owner): la planilla lleva su ESCALA y la RUEDA (descriptores de `src/lib/catacion/rueda.ts`).
// V5.92 (owner, 2026-09-25, sobre el informe del Q-Grader — `PLAN_CIRCUITO_DEL_LOTE.md` §10): la planilla es DUAL. La
// `vista` (sca · cva · ambas) dice qué bloques se llenan; `escala` es el protocolo que RIGE el Punto y se DERIVA: el SCA 2004
// nativo siempre que esté completo (es el protocolo primario y el que calibra la escala de grados); si solo hay CVA, el
// Punto se HOMOLOGA con un intervalo (`homologacion.ts`) y rige el piso. Con las dos completas, el CVA queda registrado
// (`cva_total`): es el banco comparativo con el que se calibrará la homologación. Correcciones del Q-Grader a la V5.81:
// ocho secciones CVA (Fragancia y Aroma aparte), la Impresión general cuenta UNA vez, redondeo al 0,25, tazas con tipo de
// defecto (una defectuosa es también no uniforme), una planilla incompleta NO da puntaje, y el formulario 2004 con sus dominios
// (atributos 6,00–10,00 en pasos de 0,25; uniformidad · taza limpia · dulzor 2 puntos por taza; defectos = tazas × 2 o × 4).

import { SCA_ATTRS } from "@/components/kaffetal-regal/ficha/fichaData";
import {
  computeFactor,
  computeMesh,
  computeSca,
  scaClassFor,
  type FactorFields,
  type MeshFields,
  type ScaFields,
} from "@/components/kaffetal-regal/ficha/fichaCalculations";
import { normalizaDetalle, normalizaRueda, type DetalleDeLaRueda } from "@/lib/catacion/rueda";
import { alGrid, puntoHomologado, puntoNativo, type PuntoSca } from "./homologacion";
import { CVA_SECCION_LABEL, PL, SCA_ATTR_LABEL, type IdiomaDePlanilla } from "./planillaI18n";
import { esAcidez, esColor, normalizaDefectos, normalizaTexturas } from "@/lib/catacion/fisico";

/** El protocolo que RIGE el Punto (derivado de la planilla; ver `protocoloDelPunto`). */
export type EscalaSensorial = "sca" | "cva";
export const ESCALA_LABEL: Record<EscalaSensorial, string> = { sca: "SCA 2004 · Perfil de taza (nativo)", cva: "CVA · Evaluación afectiva (SCA-104) → Punto homologado" };

/** Qué bloques llena el catador. «Ambas» = el banco comparativo que pidió el owner (2026-09-25). */
export type VistaDePlanilla = "sca" | "cva" | "ambas";
export const VISTA_LABEL: Record<VistaDePlanilla, string> = { sca: "SCA 2004", cva: "CVA (SCA-104)", ambas: "Ambas · banco comparativo" };

/** Las OCHO secciones de la evaluación afectiva del CVA (SCA-104), en el orden del formulario. Fragancia y Aroma van aparte. */
export const CVA_SECCIONES: readonly [key: string, label: string][] = [
  ["fragrance", "Fragancia (café molido, en seco)"],
  ["aroma", "Aroma (en la bebida)"],
  ["flavor", "Sabor"],
  ["aftertaste", "Sabor residual"],
  ["acidity", "Acidez"],
  ["sweetness", "Dulzor"],
  ["mouthfeel", "Sensación en boca"],
  ["overall", "Impresión general"],
];

/** Constantes del CVA (SCA-104): S = 0,65625 × Σ h_i + 52,75 − 2·u − 4·d, con las ocho secciones a peso 1 y redondeo al 0,25. */
/** `pasoSeccion` (V5.135, owner): cada sección admite cuartos de punto (1 · 1,25 · … · 9), ya no solo enteros. */
export const CVA = { coeficiente: 0.65625, base: 52.75, castigoNoUniforme: 2, castigoDefectuosa: 4, min: 1, max: 9, tazas: 5, paso: 0.25, pasoSeccion: 0.25 } as const;

/** Un defecto cuenta solo con su tipo registrado. */
export const CVA_DEFECTOS: readonly [id: string, label: string][] = [
  ["moho", "Moho / humedad"],
  ["fenol", "Fenólico / químico"],
  ["papa", "Papa"],
  ["otro", "Otro (anotar en notas)"],
];

export type CvaTaza = { noUniforme: boolean; defectuosa: boolean; defecto: string };
export const TAZA_LIMPIA: CvaTaza = { noUniforme: false, defectuosa: false, defecto: "" };
const tazasLimpias = (): CvaTaza[] => Array.from({ length: CVA.tazas }, () => ({ ...TAZA_LIMPIA }));

export type CvaFields = {
  cva_fragrance: string;
  cva_aroma: string;
  cva_flavor: string;
  cva_aftertaste: string;
  cva_acidity: string;
  cva_sweetness: string;
  cva_mouthfeel: string;
  cva_overall: string;
  /** Las cinco tazas: no uniforme · defectuosa (con su tipo). u y d se DERIVAN de aquí. */
  cva_tazas: CvaTaza[];
};

/** Lo que el formulario SCA 2004 tiene además de los diez atributos: los defectos por taza (taint × 2 · fault × 4). */
export type Sca2004Extra = { sca_taint_cups: string; sca_fault_cups: string };

// V5.135 (owner, 2026-10-01): los defectos de taza del SCA 2004 se anotan TAZA A TAZA, con el mismo selector que la taza
// defectuosa del CVA — limpia · taint · fault, y el tipo de defecto—. Los dos contadores (`sca_taint_cups` · `sca_fault_cups`)
// se DERIVAN de aquí y siguen siendo lo que lee la fórmula: la aritmética no cambió.
export type EstadoDeTazaSca = "" | "taint" | "fault";
export type ScaTaza = { estado: EstadoDeTazaSca; defecto: string };
const TAZAS_SCA = 5;
const scaTazasLimpias = (): ScaTaza[] => Array.from({ length: TAZAS_SCA }, () => ({ estado: "" as EstadoDeTazaSca, defecto: "" }));
export function contarScaTazas(tazas: readonly ScaTaza[]): { taint: number; fault: number } {
  const t = tazas.slice(0, TAZAS_SCA);
  return { taint: t.filter((x) => x.estado === "taint").length, fault: t.filter((x) => x.estado === "fault").length };
}
/** Cinco tazas siempre. Acepta la lista nueva y los dos contadores de antes (V5.92–V5.134), que se reparten taza a taza. */
export function normalizaScaTazas(raw: unknown, taintViejo?: unknown, faultViejo?: unknown): ScaTaza[] {
  const out = scaTazasLimpias();
  if (Array.isArray(raw)) {
    raw.slice(0, TAZAS_SCA).forEach((t, i) => {
      const x = (t ?? {}) as Partial<ScaTaza>;
      const estado: EstadoDeTazaSca = x.estado === "taint" || x.estado === "fault" ? x.estado : "";
      out[i] = { estado, defecto: estado ? String(x.defecto ?? "") : "" };
    });
    return out;
  }
  const entero = (v: unknown) => {
    const n = Math.trunc(Number(String(v ?? "").replace(",", ".")));
    return Number.isFinite(n) ? Math.max(0, n) : 0;
  };
  const fault = Math.min(TAZAS_SCA, entero(faultViejo));
  const taint = Math.min(TAZAS_SCA - fault, entero(taintViejo));
  for (let i = 0; i < fault; i++) out[i] = { estado: "fault", defecto: "" };
  for (let i = fault; i < fault + taint; i++) out[i] = { estado: "taint", defecto: "" };
  return out;
}

export type LabEvaluation = ScaFields &
  FactorFields &
  MeshFields &
  CvaFields &
  Sca2004Extra & {
    escala: EscalaSensorial;
    vista: VistaDePlanilla;
    /** Ids de descriptor de la rueda (`src/lib/catacion/rueda.ts`). */
    rueda: string[];
    /** V5.133: la etapa y la intensidad de cada marca de `rueda` (formato descriptivo SCA-CVA). */
    rueda_detalle: DetalleDeLaRueda;
    /** V5.135: las cinco tazas del SCA 2004 (limpia · taint · fault, con su tipo). Los contadores salen de aquí. */
    sca_tazas: ScaTaza[];
    /** V5.135 · B3: el color del grano verde y el detalle de los defectos (granos por defecto; claves de `fisico.ts`). */
    fa_color: string;
    defectos_detalle: Record<string, string>;
    /** V5.135 · descriptivo: la intensidad (0–15) y el tipo de acidez (uno), y la de la sensación en boca con hasta dos texturas. */
    acidez_intensidad: string;
    acidez_tipo: string;
    boca_intensidad: string;
    boca_texturas: string[];
    /** V5.144 (owner): un comentario opcional en la acidez y en la sensación en boca (una línea; no entra en el puntaje). */
    acidez_nota: string;
    boca_nota: string;
    fa_parch_hum: string;
    /** V5.144 (owner): la humedad del café VERDE ya trillado — el mismo campo de la Ficha (`b3_humedad_verde`). */
    b3_humedad_verde: string;
    cupping_profile: string;
    analysis_notes: string;
  };

export const EMPTY_LAB_EVALUATION: LabEvaluation = {
  escala: "sca",
  vista: "sca",
  sca_fragrance: "", sca_flavor: "", sca_aftertaste: "", sca_acidity: "", sca_body: "",
  sca_balance: "", sca_uniformity: "", sca_clean_cup: "", sca_sweetness: "", sca_cuppers: "",
  sca_taint_cups: "", sca_fault_cups: "",
  cva_fragrance: "", cva_aroma: "", cva_flavor: "", cva_aftertaste: "", cva_acidity: "", cva_sweetness: "", cva_mouthfeel: "", cva_overall: "",
  cva_tazas: tazasLimpias(),
  rueda: [],
  rueda_detalle: {},
  sca_tazas: scaTazasLimpias(),
  fa_color: "", defectos_detalle: {},
  acidez_intensidad: "", acidez_tipo: "", boca_intensidad: "", boca_texturas: [], acidez_nota: "", boca_nota: "",
  fa_start: "", fa_green_remainder: "", fa_primary_defect: "", fa_secondary_defect: "",
  mesh_supremo_plus: "", mesh_supremo: "", mesh_extra: "", mesh_europa: "",
  mesh_ugq: "", mesh_peaberry: "", mesh_residue: "",
  fa_parch_hum: "", b3_humedad_verde: "", cupping_profile: "", analysis_notes: "",
};

const numOr = (v: string | number | null | undefined): number | null => {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
};
const r2 = (n: number) => Math.round(n * 100) / 100;

/** Cinco tazas siempre. Acepta la lista nueva y los dos contadores de la V5.81 (`cva_nonuniform` · `cva_defective`), que se reparten taza a taza. */
export function normalizaTazas(raw: unknown, uViejo?: unknown, dViejo?: unknown): CvaTaza[] {
  const out = tazasLimpias();
  if (Array.isArray(raw)) {
    raw.slice(0, CVA.tazas).forEach((t, i) => {
      const x = (t ?? {}) as Partial<CvaTaza>;
      out[i] = { noUniforme: Boolean(x.noUniforme), defectuosa: Boolean(x.defectuosa), defecto: String(x.defecto ?? "") };
    });
    return out;
  }
  const u = Math.min(CVA.tazas, Math.max(0, Math.trunc(numOr(uViejo as string) ?? 0)));
  const d = Math.min(CVA.tazas, Math.max(0, Math.trunc(numOr(dViejo as string) ?? 0)));
  for (let i = 0; i < d; i++) out[i] = { noUniforme: true, defectuosa: true, defecto: "otro" };
  for (let i = 0; i < u; i++) out[i] = { ...out[i], noUniforme: true };
  return out;
}

/** El comentario de la acidez o de la sensación en boca: texto, con tope (mientras se escribe no se recorta más que eso). */
export const NOTA_DESCRIPTIVA_MAX = 240;
const notaDescriptiva = (v: unknown): string => (typeof v === "string" ? v.slice(0, NOTA_DESCRIPTIVA_MAX) : "");

/** Merge seguro sobre el vacío: campos nuevos nunca rompen datos viejos; escala, vista, tazas y rueda se normalizan. */
export function toLabEvaluation(raw: unknown): LabEvaluation {
  const { cva_nonuniform, cva_defective, ...r } = ((raw as (Partial<LabEvaluation> & { cva_nonuniform?: unknown; cva_defective?: unknown }) | null | undefined) ?? {});
  const escala: EscalaSensorial = r.escala === "cva" ? "cva" : "sca";
  const vista: VistaDePlanilla = r.vista === "ambas" || r.vista === "cva" || r.vista === "sca" ? r.vista : escala;
  const rueda = normalizaRueda(r.rueda);
  // V5.135: las tazas del SCA mandan sobre los contadores (una planilla anterior solo trae contadores: se reparten).
  const scaTazas = normalizaScaTazas(r.sca_tazas, r.sca_taint_cups, r.sca_fault_cups);
  const cuenta = contarScaTazas(scaTazas);
  const contadores = Array.isArray(r.sca_tazas) ? { sca_taint_cups: cuenta.taint ? String(cuenta.taint) : "", sca_fault_cups: cuenta.fault ? String(cuenta.fault) : "" } : {};
  return {
    ...EMPTY_LAB_EVALUATION,
    ...r,
    ...contadores,
    escala,
    vista,
    cva_tazas: normalizaTazas(r.cva_tazas, cva_nonuniform, cva_defective),
    rueda,
    rueda_detalle: normalizaDetalle(r.rueda_detalle, rueda),
    sca_tazas: scaTazas,
    fa_color: esColor(r.fa_color) ? r.fa_color : "",
    defectos_detalle: normalizaDefectos(r.defectos_detalle),
    acidez_tipo: esAcidez(r.acidez_tipo) ? r.acidez_tipo : "",
    boca_texturas: normalizaTexturas(r.boca_texturas),
    acidez_nota: notaDescriptiva(r.acidez_nota),
    boca_nota: notaDescriptiva(r.boca_nota),
    b3_humedad_verde: typeof r.b3_humedad_verde === "string" || typeof r.b3_humedad_verde === "number" ? String(r.b3_humedad_verde) : "",
  };
}

/**
 * Un lote puede tener VARIAS planillas registradas (pedido del owner 2026-07-20) — el jsonb guarda una LISTA.
 * Este lector acepta los tres estados que existen en datos vivos: null, el objeto suelto de la primera versión
 * (se envuelve en lista) y la lista nueva.
 */
export function toLabEvaluationList(raw: unknown): LabEvaluation[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw.map(toLabEvaluation);
  return [toLabEvaluation(raw)];
}

/** ¿Hay al menos un dato digitado? (para no guardar planillas vacías). La escala y la vista son elecciones, no datos. */
export function labEvaluationHasData(ev: LabEvaluation): boolean {
  // V5.135: una regla para todo lo que la planilla guarda — una lista o un objeto tienen dato si lo tiene alguno de sus
  // valores; `false` y «» no cuentan (una taza limpia, un detalle vacío). El detalle de las marcas no es un dato por sí solo.
  const tieneDato = (v: unknown): boolean =>
    Array.isArray(v) ? v.some(tieneDato) : v && typeof v === "object" ? Object.values(v).some(tieneDato) : typeof v === "boolean" ? v : String(v ?? "").trim() !== "";
  return Object.entries(ev).some(([k, v]) => k !== "escala" && k !== "vista" && k !== "rueda_detalle" && tieneDato(v));
}

// ── CVA · la evaluación afectiva (SCA-104) ────────────────────────────────────
// Cada una de las OCHO secciones se califica con un entero de 1 a 9 y el puntaje sale de la fórmula publicada por el SCA:
//   S = 0,65625 × Σ h_i + 52,75 − 2·u − 4·d       (ocho términos a peso 1; ocho 9 → 100, ocho 5 → 79, ocho 1 → 58)
// u = tazas no uniformes y d = tazas defectuosas, sobre CINCO tazas: toda taza defectuosa es también no uniforme (una
// defectuosa resta 6), salvo que las cinco sean defectuosas por igual; un defecto cuenta solo con su tipo. El resultado
// se redondea al 0,25 más cercano. Menos de ocho secciones → INCOMPLETO, sin puntaje. Fuera de 1–9 o con decimales → error,
// no se recorta. (Así lo corrigió el Q-Grader el 2026-09-25 sobre la V5.81, que fundía Fragancia/Aroma y doblaba la general.)

// V5.130: los mensajes salen en el idioma de la planilla (`planillaI18n.ts`); por defecto, español, como siempre.
export function contarTazas(tazas: readonly CvaTaza[], lang: IdiomaDePlanilla = "es"): { u: number; d: number; errores: string[] } {
  const t = tazas.slice(0, CVA.tazas);
  const d = t.filter((x) => x.defectuosa).length;
  const u = d === CVA.tazas ? 0 : t.filter((x) => x.noUniforme || x.defectuosa).length;
  const errores = t.some((x) => x.defectuosa && !x.defecto) ? [PL[lang].errTazaSinTipo] : [];
  return { u, d, errores };
}

export type ResultadoCva = { suma: number; calificadas: number; completa: boolean; errores: string[]; u: number; d: number; total: number | null; cls: string };

export function computeCva(ev: CvaFields, lang: IdiomaDePlanilla = "es"): ResultadoCva {
  let suma = 0;
  let calificadas = 0;
  const errores: string[] = [];
  const faltan: string[] = [];
  for (const [key] of CVA_SECCIONES) {
    const label = CVA_SECCION_LABEL[lang][key];
    const raw = String(ev[`cva_${key}` as keyof CvaFields] ?? "").trim();
    if (!raw) {
      faltan.push(label);
      continue;
    }
    const n = numOr(raw);
    if (n == null || n < CVA.min || n > CVA.max || Math.abs(n / CVA.pasoSeccion - Math.round(n / CVA.pasoSeccion)) > 1e-9) {
      errores.push(PL[lang].errCvaEntero(label, CVA.min, CVA.max, raw));
      continue;
    }
    calificadas++;
    suma += n;
  }
  const tazas = contarTazas(Array.isArray(ev.cva_tazas) ? ev.cva_tazas : [], lang);
  errores.push(...tazas.errores);
  if (calificadas > 0 && faltan.length) errores.push(PL[lang].errCvaIncompleto(faltan.length, CVA_SECCIONES.length, faltan.join(", ")));
  const completa = calificadas === CVA_SECCIONES.length && errores.length === 0;
  const total = completa ? Math.max(0, alGrid(CVA.coeficiente * suma + CVA.base - CVA.castigoNoUniforme * tazas.u - CVA.castigoDefectuosa * tazas.d, "cerca")) : null;
  return { suma, calificadas, completa, errores, u: tazas.u, d: tazas.d, total, cls: total != null ? scaClassFor(total) : "Sin puntaje" };
}

// ── SCA 2004 · el formulario clásico, con sus dominios ────────────────────────
// Los siete atributos escalados van de 6,00 a 10,00 en pasos de 0,25; Uniformidad, Taza limpia y Dulzor son 2 puntos por
// taza (0 · 2 · 4 · 6 · 8 · 10); los defectos son tazas × intensidad (taint 2, fault 4). Diez atributos completos o no hay
// Punto: el 2004 ES el Punto y no admite sumas parciales. La suma la hace `computeSca` (compartida con la Ficha de KR).
export const SCA2004 = { min: 6, max: 10, paso: 0.25, porTaza: 2, tazas: 5, castigoTaint: 2, castigoFault: 4 } as const;
export const SCA2004_POR_TAZAS: readonly string[] = ["uniformity", "clean_cup", "sweetness"];

export type ResultadoSca2004 = { total: number | null; completa: boolean; calificados: number; errores: string[]; taint: number; fault: number; defectos: number };

export function computeSca2004(ev: ScaFields & Sca2004Extra, lang: IdiomaDePlanilla = "es"): ResultadoSca2004 {
  const errores: string[] = [];
  const faltan: string[] = [];
  let calificados = 0;
  for (const [key, etiqueta] of SCA_ATTRS) {
    // En español se conserva el rótulo del formulario (`SCA_ATTRS`, el de la Ficha); en inglés, el de la planilla.
    const label = lang === "es" ? etiqueta : SCA_ATTR_LABEL[lang][key];
    const raw = String(ev[`sca_${key}` as keyof ScaFields] ?? "").trim();
    if (!raw) {
      faltan.push(label);
      continue;
    }
    const n = numOr(raw);
    if (n == null) {
      errores.push(PL[lang].errNoNumero(label, raw));
      continue;
    }
    if (SCA2004_POR_TAZAS.includes(key)) {
      // V5.135 (owner): Uniformidad, Taza limpia y Dulzor se teclean como los demás —en pasos de 0,25—, de 0 a 10.
      if (n < 0 || n > SCA2004.max || Math.abs(n / SCA2004.paso - Math.round(n / SCA2004.paso)) > 1e-9) {
        errores.push(PL[lang].errPorTaza(label, SCA2004.porTaza, raw));
        continue;
      }
    } else if (n < SCA2004.min || n > SCA2004.max || Math.abs(n / SCA2004.paso - Math.round(n / SCA2004.paso)) > 1e-9) {
      errores.push(PL[lang].errEscalado(label, SCA2004.min.toFixed(2), SCA2004.max.toFixed(2), SCA2004.paso, raw));
      continue;
    }
    calificados++;
  }
  const tazasDe = (v: string, nombre: string) => {
    const n = numOr(v) ?? 0;
    if (!Number.isInteger(n) || n < 0 || n > SCA2004.tazas) {
      errores.push(PL[lang].errTazas(nombre, SCA2004.tazas));
      return 0;
    }
    return n;
  };
  const taint = tazasDe(ev.sca_taint_cups, PL[lang].nombreTaint);
  const fault = tazasDe(ev.sca_fault_cups, PL[lang].nombreFault);
  if (calificados > 0 && faltan.length) errores.push(PL[lang].errScaIncompleto(faltan.length, SCA_ATTRS.length, faltan.join(", ")));
  const completa = calificados === SCA_ATTRS.length && errores.length === 0;
  const defectos = SCA2004.castigoTaint * taint + SCA2004.castigoFault * fault;
  const total = completa ? r2(computeSca(ev).total - defectos) : null;
  return { total, completa, calificados, errores, taint, fault, defectos };
}

// ── El Punto de la planilla ───────────────────────────────────────────────────
/** ¿Qué bloque cuenta? Lo que la vista deja ver: en «sca» el CVA no cuenta aunque tenga datos viejos, y al revés. */
const cuentaSca = (ev: LabEvaluation) => ev.vista !== "cva";
const cuentaCva = (ev: LabEvaluation) => ev.vista !== "sca";

/** EL PUNTO de la planilla, con su procedencia: nativo si el SCA 2004 está completo (con el CVA registrado si también lo está);
 *  homologado si solo hay CVA completo; null si no hay Punto. Con vista «ambas», las dos tienen que estar completas. */
export function puntoDeLaPlanilla(ev: LabEvaluation): PuntoSca | null {
  const sca = cuentaSca(ev) ? computeSca2004(ev) : null;
  const cva = cuentaCva(ev) ? computeCva(ev) : null;
  if (ev.vista === "ambas" && !(sca?.total != null && cva?.total != null)) return null;
  if (sca?.total != null) return puntoNativo(sca.total, cva?.total ?? null);
  if (cva?.total != null) return puntoHomologado(cva.total);
  return null;
}

/** Por qué la planilla todavía no tiene Punto (para la pantalla y para el rechazo de la acción). */
export function erroresDePlanilla(ev: LabEvaluation, lang: IdiomaDePlanilla = "es"): string[] {
  const out: string[] = [];
  if (cuentaSca(ev)) {
    const sca = computeSca2004(ev, lang);
    if (sca.total == null) out.push(...(sca.errores.length ? sca.errores : [PL[lang].completeSca(SCA_ATTRS.length)]));
  }
  if (cuentaCva(ev)) {
    const cva = computeCva(ev, lang);
    if (cva.total == null) out.push(...(cva.errores.length ? cva.errores : [PL[lang].completeCva(CVA_SECCIONES.length)]));
  }
  if (ev.vista === "ambas" && out.length) out.unshift(PL[lang].errAmbas);
  return out;
}

/** El protocolo que RIGE el Punto de esta planilla (lo que va a `lot_evaluations.escala`). */
export function protocoloDelPunto(ev: LabEvaluation): EscalaSensorial {
  return puntoDeLaPlanilla(ev)?.protocoloFuente === "cva" ? "cva" : "sca";
}

/** El puntaje que RIGE (el piso del Punto), o null si la planilla no tiene Punto. */
export function labEvaluationScore(ev: LabEvaluation): number | null {
  return puntoDeLaPlanilla(ev)?.bajo ?? null;
}

/** Los valores por atributo/sección que se guardan como `sca_data` (números): los dos bloques que cuenten y estén calificados. */
export function labEvaluationScaData(ev: LabEvaluation): Record<string, number> {
  const out: Record<string, number> = {};
  if (cuentaSca(ev)) {
    const sca = computeSca2004(ev);
    if (sca.calificados) {
      for (const [key] of SCA_ATTRS) out[key] = numOr(ev[`sca_${key}` as keyof ScaFields]) ?? 0;
      out.sca_taint_cups = sca.taint;
      out.sca_fault_cups = sca.fault;
      if (sca.total != null) out.sca_total_2004 = sca.total;
    }
  }
  if (cuentaCva(ev)) {
    const cva = computeCva(ev);
    if (cva.calificadas) {
      for (const [key] of CVA_SECCIONES) out[`cva_${key}`] = numOr(ev[`cva_${key}` as keyof CvaFields] as string) ?? 0;
      out.cva_u = cva.u;
      out.cva_d = cva.d;
      if (cva.total != null) out.cva_total = cva.total;
    }
  }
  return out;
}

export { computeFactor, computeMesh, computeSca };
