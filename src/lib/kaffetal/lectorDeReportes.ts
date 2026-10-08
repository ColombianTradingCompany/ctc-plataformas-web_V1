// ── El lector de reportes (V5.191, owner 2026-10-08) — PURO ───────────────────────────────────────────────────────────────
// «Cambiemos este botón de "Marcar revisada" por "Hacer revisión", lo cual abre un panel igual al de la evaluación, pero solo con la
// parte relevante (solo B2 o solo B3 si es de granulometría). Agrega un script que analice el adjunto para encontrar matches de la
// información a introducir para tener esto pre-hecho.»
//
// CTCx revisa un reporte que el productor agregó a su lote (`lot_referencias`) y lo lleva al formato CTCx: la planilla de evaluación,
// B2 (perfil de taza) o B3 (análisis físico). Este módulo PROPONE los campos de la planilla a partir de lo que el reporte DICE, cada
// uno con el trozo del reporte de donde salió y su modo:
//   · «leído»        — la cifra o la palabra está escrita en el reporte («Factor de rendimiento 86.46»);
//   · «derivado»     — sale de cifras leídas (el pergamino de la muestra, de la merma y la almendra);
//   · «interpretado» — una palabra del reporte llevada a la planilla («media alta» → 9 de 15; defectos sin separar → secundarios).
// Dos fuentes, UN mapeo (`lecturaDeLosDatos`):
//   1. EL TEXTO del adjunto —la capa de texto de un PDF, que el servidor saca con `unpdf`—: `leerTextoDeReporte`. Gratis, siempre.
//   2. LA IA, opt-in y con costo, para lo que solo está en una IMAGEN (el radar de atributos de la FNC, la foto de un reporte):
//      `LECTOR_IA_SYSTEM` + `datosDesdeIa`. El servidor la llama solo cuando CTCx pulsa el botón (`referenciasActions.ts`).
// Nada se guarda solo: el revisor ve la planilla junto al adjunto, la corrige y la guarda.

import { SCA_ATTRS } from "@/components/kaffetal-regal/ficha/fichaData";
import { CVA_SECCIONES, bloqueDeLaClave, toLabEvaluation, type BloqueDePlanilla, type LabEvaluation } from "@/lib/arena/labEvaluation";
import { CVA_SECCION_LABEL, SCA_ATTR_LABEL } from "@/lib/arena/planillaI18n";
import { DESCRIPTORES, ETAPA_LABEL, MARCA_POR_DEFECTO, descriptorLabel, type DetalleDeLaRueda, type EtapaDeLaRueda } from "@/lib/catacion/rueda";
import { TEXTURAS_EN_BOCA, TIPOS_DE_ACIDEZ, opcionLabel } from "@/lib/catacion/fisico";

export type ModoDeCampo = "leido" | "derivado" | "interpretado";
export const MODO_LABEL: Record<ModoDeCampo, string> = { leido: "leído", derivado: "derivado", interpretado: "interpretado" };
export type OrigenDeLectura = "texto" | "ia";
export type ProtocoloDelReporte = "sca2004" | "cva";

/** Un dato que el lector propone para la planilla: qué campos llena (`parche`), cómo se ve, de dónde salió. */
export type CampoLeido = {
  clave: string;
  bloque: BloqueDePlanilla;
  etiqueta: string;
  mostrado: string;
  parche: Partial<LabEvaluation>;
  modo: ModoDeCampo;
  fuente: string | null;
  origen: OrigenDeLectura;
};

export type ItemDeIdentidad = { etiqueta: string; valor: string };

/** Lo que el lector entrega a la pantalla. */
export type LecturaDeReporte = {
  formato: "fnc" | "generico" | "ia";
  origen: OrigenDeLectura;
  campos: CampoLeido[];
  /** La cifra total que trae el reporte, para compararla con la de la planilla. */
  puntaje: { valor: number; protocolo: ProtocoloDelReporte } | null;
  /** El factor de rendimiento que trae el reporte, para compararlo con el que dan los pesos. */
  factor: number | null;
  identidad: ItemDeIdentidad[];
  avisos: string[];
  confianza: "alta" | "media" | "baja" | null;
};

type Dato<T = number> = { valor: T; fuente: string; fin?: number };
type ClaveSca = "fragrance" | "flavor" | "aftertaste" | "acidity" | "body" | "balance" | "uniformity" | "clean_cup" | "sweetness" | "cuppers";
type ClaveCva = "fragrance" | "aroma" | "flavor" | "aftertaste" | "acidity" | "sweetness" | "mouthfeel" | "overall";
type ClaveFisica =
  | "pergaminoG" | "almendraG" | "sanaG" | "defectuosaG" | "primariosG" | "secundariosG" | "brocaG"
  | "mermaPct" | "humedadPergaminoPct" | "humedadVerdePct" | "factor" | "aw" | "densidad";

/** Lo que un reporte trae, en bruto (del texto o de la IA), antes de llevarlo a la planilla. */
export type DatosDelReporte = {
  formato: "fnc" | "generico" | "ia";
  origen: OrigenDeLectura;
  protocolo: Dato<ProtocoloDelReporte> | null;
  puntaje: Dato | null;
  sca: Partial<Record<ClaveSca, Dato>>;
  cva: Partial<Record<ClaveCva, Dato>>;
  perfil: Dato<string> | null;
  fisico: Partial<Record<ClaveFisica, Dato>>;
  mallas: { malla: number; gramos: number | null; pct: number | null; fuente: string }[];
  defectos: Dato<string> | null;
  identidad: ItemDeIdentidad[];
  avisos: string[];
  confianza: "alta" | "media" | "baja" | null;
};

const RANGO_FISICO: Record<ClaveFisica, [number, number]> = {
  pergaminoG: [50, 2000], almendraG: [30, 1800], sanaG: [30, 1800], defectuosaG: [0, 600], primariosG: [0, 600], secundariosG: [0, 600],
  brocaG: [0, 600], mermaPct: [5, 40], humedadPergaminoPct: [5, 30], humedadVerdePct: [5, 30], factor: [60, 150], aw: [0.2, 1], densidad: [0.3, 1200],
};

// ── Utilidades ─────────────────────────────────────────────────────────────────────────────────────────────────────────
/** Sin tildes ni diéresis. Sobre texto NFC conserva la longitud: las posiciones sirven en el original. */
export const sinTildes = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
const NUM = String.raw`(\d{1,4}(?:[.,]\d{1,3})?)`;
const G = String.raw`\(\s*g(?:r|rs|ramos)?\.?\s*\)`;
const patron = (p: string, flags = "i") => new RegExp(p.split("{N}").join(NUM).split("{G}").join(G), flags);
const aNumero = (s: string) => Number(s.replace(",", "."));
const limpia = (s: string, max = 160) => s.replace(/\s+/g, " ").trim().slice(0, max);
/** Una cifra para un campo de la planilla: hasta `dec` decimales, sin ceros de sobra. */
const cifra = (n: number, dec = 2) => String(Math.round(n * 10 ** dec) / 10 ** dec);

function busca(t: string, patrones: string[], [min, max]: [number, number]): Dato | null {
  for (const p of patrones) {
    const m = patron(p).exec(t);
    if (!m) continue;
    const v = aNumero(m[1]);
    if (Number.isFinite(v) && v >= min && v <= max) return { valor: v, fuente: limpia(m[0]), fin: m.index + m[0].length };
  }
  return null;
}

// ── 1 · El texto del adjunto ────────────────────────────────────────────────────────────────────────────────────────────
const PATRONES_FISICOS: Record<ClaveFisica, string[]> = {
  pergaminoG: [
    String.raw`peso (?:de la )?muestra(?: de)?(?: caf[eé])?(?: pergamino)?(?: seco)?\s*{G}\s*:?\s*{N}`,
    String.raw`pergamino seco\s*{G}\s*:?\s*{N}`,
    String.raw`peso (?:del )?pergamino\s*{G}\s*:?\s*{N}`,
  ],
  almendraG: [
    String.raw`peso (?:de la )?almendra(?: total)?\s*{G}\s*:?\s*{N}`,
    String.raw`almendra total\s*{G}\s*:?\s*{N}`,
    String.raw`(?:caf[eé] verde|excelso|caf[eé] oro)(?: total)?\s*{G}\s*:?\s*{N}`,
  ],
  sanaG: [String.raw`almendra sana\s*{G}\s*:?\s*{N}`],
  defectuosaG: [String.raw`almendra defectuosa\s*{G}\s*:?\s*{N}`, String.raw`\bpasilla\s*{G}\s*:?\s*{N}`],
  brocaG: [String.raw`\bbroca\s*{G}\s*:?\s*{N}`],
  primariosG: [
    String.raw`defectos? (?:del? )?(?:grupo|categor[ií]a) (?:1|i)\b\s*(?:{G})?\s*:?\s*{N}`,
    String.raw`defectos? primarios?\s*(?:{G})?\s*:?\s*{N}`,
  ],
  secundariosG: [
    String.raw`defectos? (?:del? )?(?:grupo|categor[ií]a) (?:2|ii)\b\s*(?:{G})?\s*:?\s*{N}`,
    String.raw`defectos? secundarios?\s*(?:{G})?\s*:?\s*{N}`,
  ],
  mermaPct: [String.raw`porcentaje de merma\s*:?\s*{N}\s*%`, String.raw`\bmerma\s*(?:\(%\))?\s*:?\s*{N}\s*%`],
  humedadPergaminoPct: [String.raw`humedad (?:del? )?(?:caf[eé] )?pergamino(?: seco)?\s*(?:\(%\))?\s*:?\s*{N}`],
  humedadVerdePct: [String.raw`humedad (?:del? )?(?:caf[eé] )?(?:verde|almendra|excelso|oro)\s*(?:\(%\))?\s*:?\s*{N}`],
  factor: [String.raw`factor de rendimiento\s*(?:\(kg\))?\s*:?\s*{N}`, String.raw`\bfactor\s*:?\s*{N}`],
  aw: [String.raw`actividad de(?:l)? agua\s*(?:\(a_?w\))?\s*:?\s*{N}`, String.raw`\ba_?w\s*:?\s*(0[.,]\d{1,3})`],
  densidad: [String.raw`densidad(?: aparente)?(?: del? (?:caf[eé] )?verde)?\s*(?:\((?:g\/l|g\/ml|kg\/m3)\))?\s*:?\s*{N}`],
};

// Los atributos escritos en el texto (otros laboratorios; en la FNC van en la gráfica). La etiqueta, un número y nada de «%».
const ETIQUETAS_SCA: [ClaveSca, string][] = [
  ["fragrance", String.raw`fragancia\s*(?:\/|y)\s*aroma|fragrance\s*\/\s*aroma|fragancia|fragrance`],
  ["aftertaste", String.raw`sabor[ _]residual|retrogusto|post\s?gusto|aftertaste`],
  ["flavor", String.raw`sabor(?![ _]residual)|flavou?r`],
  ["acidity", String.raw`acidez|acidity`],
  ["body", String.raw`cuerpo|body`],
  ["balance", String.raw`balance|equilibrio`],
  ["uniformity", String.raw`uniformidad|uniformity`],
  ["clean_cup", String.raw`taza[ _]limpia|clean[ _]cup`],
  ["sweetness", String.raw`dulzor|dulzura|sweetness`],
  ["cuppers", String.raw`puntaje (?:del )?catador|impresi[oó]n (?:global|general)|catador|overall|cupper'?s? (?:points?|score)`],
];
const ETIQUETAS_CVA: [ClaveCva, string][] = [
  ["fragrance", String.raw`fragancia|fragrance`],
  ["aroma", String.raw`aroma`],
  ["aftertaste", String.raw`sabor[ _]residual|retrogusto|post\s?gusto|aftertaste`],
  ["flavor", String.raw`sabor(?![ _]residual)|flavou?r`],
  ["acidity", String.raw`acidez|acidity`],
  ["sweetness", String.raw`dulzor|dulzura|sweetness`],
  ["mouthfeel", String.raw`sensaci[oó]n en boca|mouthfeel|textura`],
  ["overall", String.raw`impresi[oó]n (?:global|general)|overall`],
];
const atributo = (etiquetas: string) =>
  new RegExp(String.raw`(?:^|[^\p{L}])(?:${etiquetas})\s*:?\s*(\d{1,2}(?:[.,]\d{1,2})?)(?!\d)(?![.,]?\d*\s*%)`, "imu");

/** Las etiquetas de la «Información general» de un reporte (la FNC las pone de dos en dos por renglón). */
const ETIQUETAS_DE_IDENTIDAD = [
  "Documento", "Nombre", "Finca", "Código SICA", "Municipio", "Vereda", "Departamento", "Fecha de recepción", "Código de muestra",
  "Fecha de Análisis", "Fecha de Registro SGR", "Tipo beneficio", "Tipo secado", "Variedad", "Altura msnm", "Edad lote",
  "Horas fermentación", "Humedad verde", "Observación",
];
/** Las que se leen como dato (van a la planilla) o no ayudan a revisar: no se repiten en la identidad. */
const NO_VAN_EN_LA_IDENTIDAD = new Set(["Humedad verde", "Fecha de Registro SGR"]);

function identidadDe(t: string): ItemDeIdentidad[] {
  const etiquetas = ETIQUETAS_DE_IDENTIDAD.map((e) => ({ e, n: sinTildes(e).toLowerCase() }));
  const out: ItemDeIdentidad[] = [];
  let ultima: ItemDeIdentidad | null = null;
  for (const linea of t.split("\n")) {
    const l = linea.trim();
    if (!l) continue;
    const n = sinTildes(l).toLowerCase();
    const hits: { e: string; ini: number; fin: number }[] = [];
    for (const { e, n: en } of etiquetas) {
      for (let desde = 0; ; ) {
        const i = n.indexOf(en, desde);
        if (i < 0) break;
        const antes = i === 0 ? " " : n[i - 1];
        const despues = n[i + en.length] ?? " ";
        if (antes === " " && (despues === " " || despues === ":")) hits.push({ e, ini: i, fin: i + en.length });
        desde = i + en.length;
      }
    }
    hits.sort((a, b) => a.ini - b.ini || b.fin - a.fin);
    const limpios = hits.filter((h, i) => !hits.slice(0, i).some((o) => h.ini < o.fin));
    if (!limpios.length || limpios[0].ini !== 0) {
      // Un renglón corto sin etiqueta continúa el valor anterior («rotulado "Tanque» + «2"»).
      if (ultima && !limpios.length && l.length <= 24) ultima.valor = limpia(`${ultima.valor} ${l}`, 200);
      ultima = null;
      continue;
    }
    const base = n.length === l.length ? l : n;
    ultima = null;
    for (let i = 0; i < limpios.length; i++) {
      const h = limpios[i];
      const valor = limpia(base.slice(h.fin, limpios[i + 1]?.ini ?? base.length).replace(/^\s*:\s*/, ""), 200);
      if (!valor || NO_VAN_EN_LA_IDENTIDAD.has(h.e) || out.some((x) => x.etiqueta === h.e)) continue;
      const item = { etiqueta: h.e, valor };
      out.push(item);
      ultima = item;
    }
  }
  return out;
}

/** El perfil descriptivo de un reporte de la FNC: los renglones que siguen al puntaje, hasta la firma del Q-Grader. */
function perfilTrasElPuntaje(t: string, desde: number): { perfil: Dato<string> | null; qGrader: string | null } {
  const renglones = t.slice(desde).split("\n").map((l) => l.trim());
  const lineas: string[] = [];
  let qGrader: string | null = null;
  for (let i = 0; i < renglones.length && lineas.length < 14; i++) {
    const l = renglones[i];
    if (!l) continue;
    if (/^q[\s-]?grader/i.test(l) || /^(?:pbx|tel[eé]fono|federaci[oó]n|informaci[oó]n general|an[aá]lisis|recomendaciones)/i.test(l)) break;
    if (/^q[\s-]?grader/i.test(renglones.slice(i + 1).find((x) => x) ?? "")) {
      qGrader = limpia(l, 120);
      break;
    }
    lineas.push(l);
  }
  const perfil = limpia(lineas.join(" "), 1500);
  return { perfil: perfil.length >= 12 ? { valor: perfil, fuente: limpia(perfil, 120) } : null, qGrader };
}

function perfilConEtiqueta(t: string): Dato<string> | null {
  const m = /(?:notas de cataci[oó]n|notas de cata|descriptores|perfil (?:de taza|sensorial)|cupping notes|tasting notes|notas)\s*:\s*([^\n]+(?:\n(?![^\n]{0,40}:)[^\n]+){0,6})/i.exec(t);
  if (!m) return null;
  const perfil = limpia(m[1], 1500);
  return perfil.length >= 6 ? { valor: perfil, fuente: limpia(m[0], 120) } : null;
}

const RX_MALLA = /\b(?:malla|zaranda|criba|tamiz|screen)\s*(?:n[°º.o]?\s*|#\s*)?(\d{1,2})\b\s*:?\s*(\d{1,4}(?:[.,]\d{1,3})?)\s*(%|g(?:r|ramos)?\b)?/gi;

/**
 * Lee el TEXTO de un reporte (la capa de texto de un PDF). `pista.escala` es la escala que declaró el productor: decide el protocolo
 * solo si el reporte no lo dice.
 */
export function leerTextoDeReporte(texto: string, pista: { escala?: "sca" | "cva" | null } = {}): DatosDelReporte {
  const t = texto.normalize("NFC").replace(/\r/g, "").replace(/[ \t ]+/g, " ");
  const fnc = /federaci[oó]n nacional de cafeteros|comit[eé] de cafeteros|almacaf[eé]/i.test(t);
  const avisos: string[] = [];

  // B3 · lo físico
  const fisico: DatosDelReporte["fisico"] = {};
  for (const clave of Object.keys(PATRONES_FISICOS) as ClaveFisica[]) {
    const d = busca(t, PATRONES_FISICOS[clave], RANGO_FISICO[clave]);
    if (d) fisico[clave] = d;
  }
  // La humedad sin apellido es la del pergamino si el reporte habla de pergamino; si no, la del verde.
  const humedad = busca(t, [String.raw`(?:porcentaje de humedad|\bhumedad)\s*(?:\(%\))?\s*:?\s*{N}\s*%`], [5, 30]);
  if (humedad) {
    const clave: ClaveFisica = /pergamino/i.test(t) ? "humedadPergaminoPct" : "humedadVerdePct";
    if (!fisico[clave]) fisico[clave] = humedad;
  }

  const mallas: DatosDelReporte["mallas"] = [];
  const enGramos = /\bgramos\b|n[°º]\s*gramos/i.test(t);
  for (const m of t.matchAll(RX_MALLA)) {
    const malla = Number(m[1]);
    const v = aNumero(m[2]);
    if (!Number.isFinite(v) || mallas.some((x) => x.malla === malla)) continue;
    const unidad = m[3]?.startsWith("%") ? "pct" : m[3] ? "g" : enGramos ? "g" : null;
    mallas.push({ malla, gramos: unidad === "pct" ? null : v, pct: unidad === "pct" ? v : null, fuente: limpia(m[0], 80) });
  }
  // Sin unidad escrita: si suman ~100 son porcentajes.
  if (!enGramos && mallas.length && mallas.every((x) => x.pct == null)) {
    const suma = mallas.reduce((s, x) => s + (x.gramos ?? 0), 0);
    const almendra = fisico.almendraG?.valor ?? null;
    if (Math.abs(suma - 100) <= 3 && !(almendra && Math.abs(suma - almendra) / almendra <= 0.05)) {
      for (const x of mallas) {
        x.pct = x.gramos;
        x.gramos = null;
      }
    }
  }

  const defectosTexto = /defectos? f[ií]sicos?(?: predominantes)?\s*:?\s*([^\n]{3,140})/i.exec(t);
  const defectos =
    defectosTexto && !/^\s*\d/.test(defectosTexto[1]) ? { valor: limpia(defectosTexto[1], 140), fuente: limpia(defectosTexto[0], 140) } : null;

  // B2 · el puntaje, el protocolo, los atributos y el perfil
  const puntaje = busca(
    t,
    [
      String.raw`puntaje (?:final |total )?(?:sca|cva)\s*:?\s*{N}`,
      String.raw`(?:puntaje|puntuaci[oó]n|calificaci[oó]n) (?:total|final)\s*:?\s*{N}`,
      String.raw`(?:total|final) (?:cupping )?score\s*:?\s*{N}`,
      String.raw`\bsca score\s*:?\s*{N}`,
    ],
    [50, 100],
  );
  const dichoCva = /\bCVA\b|SCA[- ]?104|coffee value assessment|evaluaci[oó]n de valor del caf[eé]/i.exec(t);
  const dichoSca = /\bSCA\b|\b2004\b/i.exec(t);
  const protocolo: Dato<ProtocoloDelReporte> | null = dichoCva
    ? { valor: "cva", fuente: limpia(dichoCva[0]) }
    : dichoSca
      ? { valor: "sca2004", fuente: limpia(puntaje?.fuente ?? dichoSca[0]) }
      : pista.escala === "cva" || pista.escala === "sca"
        ? { valor: pista.escala === "cva" ? "cva" : "sca2004", fuente: "la escala que declaró el productor" }
        : null;

  const sca: DatosDelReporte["sca"] = {};
  const cva: DatosDelReporte["cva"] = {};
  if (protocolo?.valor === "cva") {
    for (const [k, et] of ETIQUETAS_CVA) {
      const m = atributo(et).exec(t);
      const v = m ? aNumero(m[1]) : NaN;
      if (m && v >= 1 && v <= 9) cva[k] = { valor: v, fuente: limpia(m[0]) };
    }
  } else {
    for (const [k, et] of ETIQUETAS_SCA) {
      const m = atributo(et).exec(t);
      const v = m ? aNumero(m[1]) : NaN;
      if (m && v >= 0 && v <= 10) sca[k] = { valor: v, fuente: limpia(m[0]) };
    }
  }

  const trasPuntaje = fnc && puntaje?.fin != null ? perfilTrasElPuntaje(t, puntaje.fin) : { perfil: null, qGrader: null };
  const perfil = trasPuntaje.perfil ?? perfilConEtiqueta(t);
  const qGrader = trasPuntaje.qGrader ?? (/(?:q[\s-]?grader|catador(?:es)?|cupper)\s*:\s*([^\n]{3,80})/i.exec(t)?.[1]?.trim() || null);

  const identidad: ItemDeIdentidad[] = [];
  const emisor = t.split("\n").find((l) => /federaci[oó]n nacional de cafeteros|almacaf[eé]|laboratorio de calidad|cooperativa de caficultores/i.test(l));
  if (emisor) identidad.push({ etiqueta: "Emisor", valor: limpia(emisor, 140) });
  if (qGrader) identidad.push({ etiqueta: "Q Grader", valor: limpia(qGrader, 120) });
  identidad.push(...identidadDe(t));

  const advertencia = /[^.\n]*(?:fines comerciales|manera educativa|uso educativo|validez comercial)[^.\n]*\.?/i.exec(t);
  if (advertencia) avisos.push(`El reporte advierte: «${limpia(advertencia[0], 220)}»`);

  return {
    formato: fnc ? "fnc" : "generico",
    origen: "texto",
    protocolo: puntaje || Object.keys(sca).length || Object.keys(cva).length ? protocolo : null,
    puntaje,
    sca,
    cva,
    perfil,
    fisico,
    mallas,
    defectos,
    identidad,
    avisos,
    confianza: null,
  };
}

// ── 2 · La IA (opt-in), para lo que solo está en una imagen ─────────────────────────────────────────────────────────────
export const LECTOR_IA_SYSTEM = `Eres el equipo técnico de CTCx (Colombian Trading Company). Recibes UN reporte de laboratorio que un caficultor agregó a su lote: un perfil de taza (catación SCA 2004 o CVA, a menudo con un radar de atributos) y/o un análisis físico (pesos de la trilla, humedades, factor de rendimiento, granulometría por mallas, defectos). Puede ser un PDF o una foto.

Tu tarea: TRANSCRIBIR las cifras y los textos que el reporte muestra, para llevarlos a la planilla de CTCx. Reglas:
- Transcribe SOLO lo que el reporte muestra, tal cual. Lo que no aparece o no se lee con claridad va en null. NUNCA estimes, completes ni calcules.
- Lee también las GRÁFICAS: en los reportes de la Federación Nacional de Cafeteros los atributos del perfil van en un radar con su valor junto a cada eje. Equivalencias del radar: Fragancia → fragrance, Sabor → flavor, Sabor residual → aftertaste, Acidez → acidity, Cuerpo → body, Balance → balance, Uniformidad → uniformity, Taza_limpia → clean_cup, Dulzor → sweetness, Catador → cuppers.
- Números con coma decimal → punto decimal.

Responde ÚNICAMENTE con un objeto JSON (sin markdown, sin texto alrededor) con esta forma exacta:
{
  "protocolo": "sca2004"|"cva"|null,
  "puntaje": number|null,
  "sca": {"fragrance": number|null, "flavor": number|null, "aftertaste": number|null, "acidity": number|null, "body": number|null, "balance": number|null, "uniformity": number|null, "clean_cup": number|null, "sweetness": number|null, "cuppers": number|null}|null,
  "cva": {"fragrance": number|null, "aroma": number|null, "flavor": number|null, "aftertaste": number|null, "acidity": number|null, "sweetness": number|null, "mouthfeel": number|null, "overall": number|null}|null,
  "perfil": string|null,
  "q_grader": string|null,
  "laboratorio": string|null,
  "fecha_analisis": "YYYY-MM-DD"|null,
  "pergamino_g": number|null,
  "almendra_g": number|null,
  "almendra_sana_g": number|null,
  "defectuosa_g": number|null,
  "primarios_g": number|null,
  "secundarios_g": number|null,
  "broca_g": number|null,
  "merma_pct": number|null,
  "humedad_pergamino_pct": number|null,
  "humedad_verde_pct": number|null,
  "factor_rendimiento": number|null,
  "actividad_agua": number|null,
  "densidad_gl": number|null,
  "mallas": [{"malla": number, "gramos": number|null, "porcentaje": number|null}]|null,
  "defectos": string|null,
  "confianza": "alta"|"media"|"baja",
  "observaciones": string|null
}
"sca" son los diez atributos del formulario SCA 2004 (de 0 a 10); "cva" son las ocho secciones del CVA (de 1 a 9). "perfil" son las notas descriptivas tal como las escribe el reporte. "malla" es el número de la malla (18, 17, …; el fondo es 0).`;

/** La respuesta de la IA → los mismos datos en bruto que da el texto (saneados: rangos, tipos, largos). */
export function datosDesdeIa(raw: unknown): DatosDelReporte {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const fuente = "leído con IA";
  const num = (v: unknown, min: number, max: number): number | null => {
    const n = typeof v === "string" ? Number(v.replace(",", ".")) : typeof v === "number" ? v : NaN;
    return Number.isFinite(n) && n >= min && n <= max ? n : null;
  };
  const dato = (v: unknown, min: number, max: number): Dato | null => {
    const n = num(v, min, max);
    return n == null ? null : { valor: n, fuente };
  };
  const texto = (v: unknown, max: number): string | null => (typeof v === "string" && v.trim() ? limpia(v, max) : null);
  const protocolo: ProtocoloDelReporte | null = r.protocolo === "cva" ? "cva" : r.protocolo === "sca2004" || r.protocolo === "sca" ? "sca2004" : null;

  const sca: DatosDelReporte["sca"] = {};
  const srcSca = (r.sca && typeof r.sca === "object" ? r.sca : {}) as Record<string, unknown>;
  for (const [k] of ETIQUETAS_SCA) {
    const d = dato(srcSca[k], 0, 10);
    if (d) sca[k] = d;
  }
  const cva: DatosDelReporte["cva"] = {};
  const srcCva = (r.cva && typeof r.cva === "object" ? r.cva : {}) as Record<string, unknown>;
  for (const [k] of ETIQUETAS_CVA) {
    const d = dato(srcCva[k], 1, 9);
    if (d) cva[k] = d;
  }

  const fisico: DatosDelReporte["fisico"] = {};
  const desdeIa: [ClaveFisica, string][] = [
    ["pergaminoG", "pergamino_g"], ["almendraG", "almendra_g"], ["sanaG", "almendra_sana_g"], ["defectuosaG", "defectuosa_g"],
    ["primariosG", "primarios_g"], ["secundariosG", "secundarios_g"], ["brocaG", "broca_g"], ["mermaPct", "merma_pct"],
    ["humedadPergaminoPct", "humedad_pergamino_pct"], ["humedadVerdePct", "humedad_verde_pct"], ["factor", "factor_rendimiento"],
    ["aw", "actividad_agua"], ["densidad", "densidad_gl"],
  ];
  for (const [clave, campo] of desdeIa) {
    const d = dato(r[campo], ...RANGO_FISICO[clave]);
    if (d) fisico[clave] = d;
  }

  const mallas: DatosDelReporte["mallas"] = [];
  for (const m of Array.isArray(r.mallas) ? r.mallas : []) {
    const x = (m ?? {}) as Record<string, unknown>;
    const malla = num(x.malla, 0, 25);
    if (malla == null || mallas.some((y) => y.malla === Math.round(malla))) continue;
    const gramos = num(x.gramos, 0, 2000);
    const pct = num(x.porcentaje, 0, 100);
    if (gramos == null && pct == null) continue;
    mallas.push({ malla: Math.round(malla), gramos, pct: gramos == null ? pct : null, fuente });
  }

  const identidad: ItemDeIdentidad[] = [];
  const laboratorio = texto(r.laboratorio, 140);
  if (laboratorio) identidad.push({ etiqueta: "Emisor", valor: laboratorio });
  const q = texto(r.q_grader, 120);
  if (q) identidad.push({ etiqueta: "Q Grader", valor: q });
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(r.fecha_analisis ?? ""))) identidad.push({ etiqueta: "Fecha de Análisis", valor: String(r.fecha_analisis) });

  const perfil = texto(r.perfil, 1500);
  const defectos = texto(r.defectos, 140);
  const obs = texto(r.observaciones, 300);
  const conf = typeof r.confianza === "string" ? r.confianza.toLowerCase() : "";
  const puntaje = dato(r.puntaje, 50, 100);
  return {
    formato: "ia",
    origen: "ia",
    protocolo: protocolo ? { valor: protocolo, fuente } : null,
    puntaje,
    sca,
    cva,
    perfil: perfil ? { valor: perfil, fuente } : null,
    fisico,
    mallas,
    defectos: defectos ? { valor: defectos, fuente } : null,
    identidad,
    avisos: obs ? [`La IA anota: ${obs}`] : [],
    confianza: conf === "alta" || conf === "media" || conf === "baja" ? conf : "baja",
  };
}

// ── 3 · Del perfil descriptivo a la rueda, la acidez y la sensación en boca ─────────────────────────────────────────────
type Region = { desde: number; hasta: number; tipo: "rueda" | "acidez" | "boca" | "otro"; etapas: EtapaDeLaRueda[] };

const RX_MARCADORES =
  /(?<![a-z])(fragancia y aroma|fragancia\s*\/\s*aroma|fragancia|aroma|sabor residual|retrogusto|post ?gusto|residual|sabor|acidez|cuerpo|sensacion en boca|mouthfeel|textura|balance|equilibrio|dulzor|uniformidad|impresion (?:global|general)|fragrance|flavou?r|aftertaste|acidity|body|overall)(?![a-z])/g;

function marcador(m: string): Pick<Region, "tipo" | "etapas"> {
  if (/^fragancia (?:y|\/) ?aroma$|^fragancia\s*\/\s*aroma$/.test(m)) return { tipo: "rueda", etapas: ["fragancia", "aroma"] };
  if (m === "fragancia" || m === "fragrance") return { tipo: "rueda", etapas: ["fragancia"] };
  if (m === "aroma") return { tipo: "rueda", etapas: ["aroma"] };
  if (/^(?:sabor residual|retrogusto|post ?gusto|residual|aftertaste)$/.test(m)) return { tipo: "rueda", etapas: ["residual"] };
  if (/^(?:sabor|flavou?r)$/.test(m)) return { tipo: "rueda", etapas: ["sabor"] };
  if (m === "acidez" || m === "acidity") return { tipo: "acidez", etapas: [] };
  if (/^(?:cuerpo|sensacion en boca|mouthfeel|textura|body)$/.test(m)) return { tipo: "boca", etapas: [] };
  return { tipo: "otro", etapas: [] };
}

function regionesDe(norm: string): Region[] {
  const out: Region[] = [];
  let finAnterior = -1;
  for (const m of norm.matchAll(RX_MARCADORES)) {
    const { tipo, etapas } = marcador(m[1]);
    const prev = out[out.length - 1];
    // «aroma y sabor»: dos etapas seguidas, unidas por «y», «/» o una coma, son UNA región.
    if (prev && prev.tipo === "rueda" && tipo === "rueda" && /^\s*(?:y|e|\/|,|and|&)\s*$/.test(norm.slice(finAnterior, m.index))) {
      prev.etapas = [...new Set([...prev.etapas, ...etapas])];
    } else {
      if (prev) prev.hasta = m.index!;
      out.push({ desde: m.index!, hasta: norm.length, tipo, etapas });
    }
    finAnterior = m.index! + m[0].length;
  }
  return out;
}

/** El patrón de una etiqueta de la rueda en el texto: cada palabra admite su plural («frutales», «pasa» de «Pasas»), y la que termina
 *  en «o» su femenino («vinosa»). Una que termina en «a» NO admite la «o»: «pera» no puede cazar «pero». Las etiquetas con «/» son
 *  paraguas («Ácido / Fermentado») y no se buscan. */
function patronDeEtiqueta(etiqueta: string): RegExp | null {
  const palabras = sinTildes(etiqueta).toLowerCase().split(/\s+/).filter(Boolean);
  if (!palabras.length || etiqueta.includes("/")) return null;
  const partes = palabras.map((w) =>
    /os$/.test(w) ? `${w.slice(0, -2)}[oa]s?`
    : /as$/.test(w) ? `${w.slice(0, -1)}s?`
    : /o$/.test(w) ? `${w.slice(0, -1)}[oa]s?`
    : /[ae]$/.test(w) ? `${w}s?`
    : /[lrndzt]$/.test(w) ? `${w}(?:es|s)?`
    : w,
  );
  return new RegExp(`(?<![a-z])${partes.join("\\s+")}(?![a-z])`, "g");
}

const PATRONES_DE_LA_RUEDA = DESCRIPTORES.flatMap((d) =>
  [d.es, d.en].map((et) => ({ id: d.id, nivel: d.nivel, rx: patronDeEtiqueta(et) })).filter((x): x is { id: string; nivel: 1 | 2 | 3; rx: RegExp } => x.rx !== null),
);

/** Las marcas de la rueda que nombra un perfil, con las etapas en que las nombra. Lo que se dice de la acidez o del cuerpo no es rueda. */
export function marcasDelPerfil(perfil: string): { ids: string[]; detalle: DetalleDeLaRueda } {
  const norm = sinTildes(perfil.normalize("NFC")).toLowerCase();
  const regiones = regionesDe(norm);
  const hallazgos: { id: string; nivel: number; ini: number; fin: number }[] = [];
  for (const p of PATRONES_DE_LA_RUEDA) {
    for (const m of norm.matchAll(p.rx)) hallazgos.push({ id: p.id, nivel: p.nivel, ini: m.index!, fin: m.index! + m[0].length });
  }
  // La más larga y la más honda primero; un hallazgo dentro de otro ya tomado no cuenta («chocolate» dentro de «chocolate amargo»).
  hallazgos.sort((a, b) => b.fin - b.ini - (a.fin - a.ini) || b.nivel - a.nivel || a.ini - b.ini);
  const tomados: typeof hallazgos = [];
  for (const h of hallazgos) if (!tomados.some((x) => h.ini < x.fin && x.ini < h.fin)) tomados.push(h);
  tomados.sort((a, b) => a.ini - b.ini);

  const etapasPorId = new Map<string, Set<EtapaDeLaRueda>>();
  for (const h of tomados) {
    const region = [...regiones].reverse().find((r) => r.desde <= h.ini);
    if (region && region.tipo !== "rueda") continue;
    const etapas = region ? region.etapas : MARCA_POR_DEFECTO.etapas;
    const set = etapasPorId.get(h.id) ?? new Set<EtapaDeLaRueda>();
    for (const e of etapas) set.add(e);
    etapasPorId.set(h.id, set);
  }
  const ids = [...etapasPorId.keys()];
  const orden: EtapaDeLaRueda[] = ["fragancia", "aroma", "sabor", "residual"];
  const detalle: DetalleDeLaRueda = Object.fromEntries(
    ids.map((id) => [id, { etapas: orden.filter((e) => etapasPorId.get(id)!.has(e)), intensidad: MARCA_POR_DEFECTO.intensidad, nota: "" }]),
  );
  return { ids, detalle };
}

const INTENSIDADES_DE_ACIDEZ: [RegExp, number][] = [
  [/muy alta/, 13.5], [/medi[ao][\s-]+alta/, 9], [/medi[ao][\s-]+baja/, 6], [/(?<![a-z])alta(?![a-z])|intensa|pronunciada/, 12],
  [/(?<![a-z])medi[ao](?![a-z])|moderada/, 7.5], [/(?<![a-z])baja(?![a-z])|tenue|debil|delicada/, 3],
];
const INTENSIDADES_DE_CUERPO: [RegExp, number][] = [
  [/(?<![a-z])(?:ligero|liviano|delgado|bajo|light|thin)(?![a-z])/, 4], [/(?<![a-z])(?:medio|moderado|medium)(?![a-z])/, 7.5],
  [/(?<![a-z])(?:pleno|completo|denso|alto|robusto|intenso|full|heavy)(?![a-z])/, 12],
];
const PALABRAS_DE_ACIDEZ: Record<string, RegExp> = {
  dulce: /(?<![a-z])(?:dulce|jugos[oa]|frutal|brillante|juicy|bright|sweet)(?![a-z])/,
  seca: /(?<![a-z])(?:seca|herbal|pasto|agri[oa]|tart|dry|grassy)(?![a-z])/,
};
const PALABRAS_DE_TEXTURA: Record<string, RegExp> = {
  rough: /(?<![a-z])(?:asper[oa]|arenos[oa]|rugos[oa]|raspos[oa]|calcare[oa]|gritty|chalky|sandy|rough)(?![a-z])/,
  oily: /(?<![a-z])(?:aceitos[oa]|untuos[oa]|cremos[oa]|mantecos[oa]|oily|creamy|buttery)(?![a-z])/,
  smooth: /(?<![a-z])(?:suave|aterciopelad[oa]|sedos[oa]|almibarad[oa]|redond[oa]|smooth|velvety|silky|syrupy|round)(?![a-z])/,
  drying: /(?<![a-z])(?:astringente|reseca|seca la boca|drying|astringent)(?![a-z])/,
  metallic: /(?<![a-z])(?:metalic[oa]|metallic)(?![a-z])/,
};

/** Lo que el perfil dice de la acidez y de la sensación en boca (el formato descriptivo de la planilla). */
export function descriptivoDelPerfil(perfil: string): {
  acidez: { texto: string; intensidad: number | null; tipo: string | null } | null;
  boca: { texto: string; intensidad: number | null; texturas: string[] } | null;
} {
  const original = perfil.normalize("NFC");
  const norm = sinTildes(original).toLowerCase();
  const base = norm.length === original.length ? original : norm;
  const regiones = regionesDe(norm);
  // Una región va de su marcador al siguiente; se corta en su último punto («Cuerpo cremoso. En» → «Cuerpo cremoso.»).
  const hastaElPunto = (r: Region) => {
    const s = norm.slice(r.desde, r.hasta);
    const m = /^([\s\S]*?[.!?])(?:\s|$)(?![\s\S]*[.!?](?:\s|$))/.exec(s);
    return r.desde + (m ? m[1].length : s.length);
  };
  const textoDe = (r: Region) => limpia(base.slice(r.desde, hastaElPunto(r)).replace(/[\s,;]+$/, ""), 240);
  const ra = regiones.find((r) => r.tipo === "acidez");
  const rb = regiones.find((r) => r.tipo === "boca");
  let acidez = null;
  if (ra) {
    const n = norm.slice(ra.desde, hastaElPunto(ra));
    const intensidad = INTENSIDADES_DE_ACIDEZ.find(([rx]) => rx.test(n))?.[1] ?? null;
    const tipo = Object.entries(PALABRAS_DE_ACIDEZ).find(([, rx]) => rx.test(n))?.[0] ?? null;
    acidez = { texto: textoDe(ra), intensidad, tipo };
  }
  let boca = null;
  if (rb) {
    const n = norm.slice(rb.desde, hastaElPunto(rb));
    const intensidad = INTENSIDADES_DE_CUERPO.find(([rx]) => rx.test(n))?.[1] ?? null;
    const texturas = TEXTURAS_EN_BOCA.map((o) => o.key).filter((k) => PALABRAS_DE_TEXTURA[k]?.test(n)).slice(0, 2);
    boca = { texto: textoDe(rb), intensidad, texturas };
  }
  return { acidez, boca };
}

// ── 4 · De los datos a los campos de la planilla ────────────────────────────────────────────────────────────────────────
const CLAVE_DE_MALLA = (m: number): keyof LabEvaluation | null =>
  m >= 18 ? "mesh_supremo_plus" : m === 17 ? "mesh_supremo" : m === 16 ? "mesh_extra" : m === 15 ? "mesh_europa" : m === 14 ? "mesh_ugq" : m >= 12 ? "mesh_peaberry" : null;
const MALLA_ETIQUETA: Record<string, string> = {
  mesh_supremo_plus: "Supremo + (M18)", mesh_supremo: "Supremo (M17)", mesh_extra: "Extra (M16)", mesh_europa: "Europa (M15)",
  mesh_ugq: "UGQ (M14)", mesh_peaberry: "Pea Berry (M13–12)",
};

export function lecturaDeLosDatos(d: DatosDelReporte): LecturaDeReporte {
  const campos: CampoLeido[] = [];
  const avisos = [...d.avisos];
  const pon = (c: Omit<CampoLeido, "bloque" | "origen">) => campos.push({ ...c, bloque: bloqueDeLaClave(Object.keys(c.parche)[0] ?? "vista"), origen: d.origen });

  // ── B2 ──
  const protocolo: ProtocoloDelReporte | null =
    d.protocolo?.valor ?? (Object.keys(d.cva).length ? "cva" : Object.keys(d.sca).length || d.puntaje ? "sca2004" : null);
  if (protocolo) {
    const v = protocolo === "cva" ? "cva" : "sca";
    pon({ clave: "protocolo", etiqueta: "Protocolo", mostrado: protocolo === "cva" ? "CVA" : "SCA 2004", parche: { vista: v, escala: v }, modo: d.protocolo ? (d.protocolo.fuente.startsWith("la escala") ? "interpretado" : "leido") : "interpretado", fuente: d.protocolo?.fuente ?? "por los atributos que trae" });
  }
  if (protocolo === "cva") {
    for (const [k] of CVA_SECCIONES) {
      const x = d.cva[k as ClaveCva];
      if (x) pon({ clave: `cva_${k}`, etiqueta: CVA_SECCION_LABEL.es[k] ?? k, mostrado: cifra(x.valor), parche: { [`cva_${k}`]: cifra(x.valor) } as Partial<LabEvaluation>, modo: "leido", fuente: x.fuente });
    }
  } else {
    for (const [k] of SCA_ATTRS) {
      const x = d.sca[k as ClaveSca];
      if (x) pon({ clave: `sca_${k}`, etiqueta: SCA_ATTR_LABEL.es[k] ?? k, mostrado: x.valor.toFixed(2), parche: { [`sca_${k}`]: cifra(x.valor) } as Partial<LabEvaluation>, modo: "leido", fuente: x.fuente });
    }
  }
  const atributos = protocolo === "cva" ? Object.keys(d.cva).length : Object.keys(d.sca).length;
  if (d.puntaje && atributos === 0) {
    avisos.push(
      `El reporte trae el puntaje (${d.puntaje.valor.toFixed(2)}) pero no sus atributos en texto${d.formato === "fnc" ? ": en los reportes de la FNC van en la gráfica, que es una imagen" : ""}. Léalos con IA o dígitelos mirando el adjunto; la planilla compara su total con el del reporte.`,
    );
  }
  if (d.perfil) {
    pon({ clave: "cupping_profile", etiqueta: "Perfil de taza", mostrado: limpia(d.perfil.valor, 90) + (d.perfil.valor.length > 90 ? "…" : ""), parche: { cupping_profile: d.perfil.valor }, modo: "leido", fuente: d.perfil.fuente });
    const { ids, detalle } = marcasDelPerfil(d.perfil.valor);
    if (ids.length) {
      pon({
        clave: "rueda",
        etiqueta: "Rueda",
        mostrado: ids.map((id) => `${descriptorLabel(id)} (${detalle[id].etapas.map((e) => ETAPA_LABEL.es[e].toLowerCase()).join(" + ")})`).join(" · "),
        parche: { rueda: ids, rueda_detalle: detalle },
        modo: "leido",
        fuente: "las notas del perfil, con la etapa en que las nombra (intensidad 10, la de la herramienta)",
      });
    }
    const { acidez, boca } = descriptivoDelPerfil(d.perfil.valor);
    if (acidez) {
      if (acidez.intensidad != null) pon({ clave: "acidez_intensidad", etiqueta: "Acidez · intensidad", mostrado: `${acidez.intensidad} de 15`, parche: { acidez_intensidad: String(acidez.intensidad) }, modo: "interpretado", fuente: acidez.texto });
      if (acidez.tipo) pon({ clave: "acidez_tipo", etiqueta: "Acidez · tipo", mostrado: opcionLabel(TIPOS_DE_ACIDEZ, acidez.tipo), parche: { acidez_tipo: acidez.tipo }, modo: "interpretado", fuente: acidez.texto });
      pon({ clave: "acidez_nota", etiqueta: "Acidez · comentario", mostrado: acidez.texto, parche: { acidez_nota: acidez.texto }, modo: "leido", fuente: acidez.texto });
    }
    if (boca) {
      if (boca.intensidad != null) pon({ clave: "boca_intensidad", etiqueta: "Sensación en boca · intensidad", mostrado: `${boca.intensidad} de 15`, parche: { boca_intensidad: String(boca.intensidad) }, modo: "interpretado", fuente: boca.texto });
      if (boca.texturas.length) pon({ clave: "boca_texturas", etiqueta: "Sensación en boca", mostrado: boca.texturas.map((k) => opcionLabel(TEXTURAS_EN_BOCA, k)).join(" · "), parche: { boca_texturas: boca.texturas }, modo: "leido", fuente: boca.texto });
      pon({ clave: "boca_nota", etiqueta: "Sensación en boca · comentario", mostrado: boca.texto, parche: { boca_nota: boca.texto }, modo: "leido", fuente: boca.texto });
    }
  }

  // ── B3 ──
  const f = d.fisico;
  const leido = (clave: keyof LabEvaluation, etiqueta: string, x: Dato | undefined, unidad = "", dec = 2) => {
    if (x) pon({ clave, etiqueta, mostrado: `${cifra(x.valor, dec)}${unidad}`, parche: { [clave]: cifra(x.valor, dec) } as Partial<LabEvaluation>, modo: "leido", fuente: x.fuente });
  };
  leido("fa_parch_hum", "Humedad del pergamino", f.humedadPergaminoPct, " %");
  leido("b3_humedad_verde", "Humedad del verde", f.humedadVerdePct, " %");
  leido("b3_factor_reportado", "Factor reportado", f.factor);
  leido("b3_actividad_agua", "Actividad de agua (aW)", f.aw, "", 3);
  if (f.densidad) {
    const gl = f.densidad.valor <= 1.2 ? f.densidad.valor * 1000 : f.densidad.valor;
    if (gl >= 300 && gl <= 1200) pon({ clave: "b3_densidad_verde", etiqueta: "Densidad", mostrado: `${cifra(gl, 0)} g/L`, parche: { b3_densidad_verde: cifra(gl, 0) }, modo: f.densidad.valor <= 1.2 ? "derivado" : "leido", fuente: f.densidad.fuente });
  }

  const sana = f.sanaG?.valor ?? null;
  let almendra = f.almendraG?.valor ?? null;
  if (almendra != null) leido("fa_green_remainder", "Trillado verde restante (almendra)", f.almendraG, " g");
  else if (sana != null && f.defectuosaG) {
    almendra = sana + f.defectuosaG.valor;
    pon({ clave: "fa_green_remainder", etiqueta: "Trillado verde restante (almendra)", mostrado: `${cifra(almendra)} g`, parche: { fa_green_remainder: cifra(almendra) }, modo: "derivado", fuente: `almendra sana ${cifra(sana)} g + defectuosa ${cifra(f.defectuosaG.valor)} g` });
  }

  let pergamino: number | null = null;
  if (f.pergaminoG) {
    pergamino = f.pergaminoG.valor;
    leido("fa_start", "Pergamino de la muestra", f.pergaminoG, " g");
  } else if (almendra != null && f.mermaPct) {
    pergamino = Math.round((almendra / (1 - f.mermaPct.valor / 100)) * 10) / 10;
    pon({ clave: "fa_start", etiqueta: "Pergamino de la muestra", mostrado: `${cifra(pergamino, 1)} g`, parche: { fa_start: cifra(pergamino, 1) }, modo: "derivado", fuente: `${cifra(almendra)} g de almendra ÷ (1 − ${cifra(f.mermaPct.valor)} % de merma) · «${f.mermaPct.fuente}»` });
  } else if (f.factor && sana != null) {
    pergamino = Math.round(((f.factor.valor * sana) / 70) * 10) / 10;
    pon({ clave: "fa_start", etiqueta: "Pergamino de la muestra", mostrado: `${cifra(pergamino, 1)} g`, parche: { fa_start: cifra(pergamino, 1) }, modo: "derivado", fuente: `factor ${cifra(f.factor.valor)} × ${cifra(sana)} g de almendra sana ÷ 70` });
  }

  let defectosG: number | null = null;
  if (f.primariosG || f.secundariosG) {
    leido("fa_primary_defect", "Defectos primarios", f.primariosG, " g");
    leido("fa_secondary_defect", "Defectos secundarios", f.secundariosG, " g");
    defectosG = (f.primariosG?.valor ?? 0) + (f.secundariosG?.valor ?? 0);
  } else if (f.defectuosaG) {
    defectosG = f.defectuosaG.valor;
    pon({ clave: "fa_secondary_defect", etiqueta: "Defectos secundarios", mostrado: `${cifra(defectosG)} g`, parche: { fa_secondary_defect: cifra(defectosG) }, modo: "interpretado", fuente: f.defectuosaG.fuente });
    avisos.push(`El reporte da la almendra defectuosa en total (${cifra(defectosG)} g) sin separar primarios de secundarios: va como secundarios —el factor no cambia—. Corríjalo si el reporte los separa${f.brocaG && f.brocaG.valor > 0 ? ` (trae ${cifra(f.brocaG.valor)} g de broca)` : ""}.`);
  } else if (almendra != null && sana != null && almendra >= sana) {
    defectosG = Math.round((almendra - sana) * 100) / 100;
    pon({ clave: "fa_secondary_defect", etiqueta: "Defectos secundarios", mostrado: `${cifra(defectosG)} g`, parche: { fa_secondary_defect: cifra(defectosG) }, modo: "derivado", fuente: `almendra ${cifra(almendra)} g − almendra sana ${cifra(sana)} g` });
    avisos.push("Los defectos salen de restar la almendra sana a la almendra total, sin separar primarios de secundarios: van como secundarios.");
  }
  if (pergamino != null && almendra != null && f.factor) {
    const sanaCalc = almendra - (defectosG ?? 0);
    const factorCalc = sanaCalc > 0 ? (70 * pergamino) / sanaCalc : null;
    if (factorCalc != null && Math.abs(factorCalc - f.factor.valor) > 0.05) {
      avisos.push(`Con esos pesos el factor da ${factorCalc.toFixed(2)} y el reporte dice ${f.factor.valor.toFixed(2)}: revise los pesos o los defectos.`);
    }
  }

  // Las mallas: cada número del reporte a su malla CTCx (13 y 12 juntas en Pea Berry; lo de menos de 12 es el residuo, que la planilla
  // calcula sola). En porcentaje, se llevan a gramos con la almendra.
  const porClave = new Map<keyof LabEvaluation, { gramos: number; fuentes: string[]; derivado: boolean }>();
  let mallasSinBase = false;
  for (const m of d.mallas) {
    const clave = CLAVE_DE_MALLA(m.malla);
    if (!clave) continue;
    const gramos = m.gramos ?? (m.pct != null && almendra != null ? (m.pct * almendra) / 100 : null);
    if (gramos == null) {
      mallasSinBase = true;
      continue;
    }
    const x = porClave.get(clave) ?? { gramos: 0, fuentes: [], derivado: false };
    x.gramos += gramos;
    x.fuentes.push(m.fuente);
    x.derivado ||= m.gramos == null || x.fuentes.length > 1;
    porClave.set(clave, x);
  }
  for (const [clave, x] of porClave) {
    const pct = almendra ? ` · ${((x.gramos / almendra) * 100).toFixed(1)} %` : "";
    pon({ clave, etiqueta: MALLA_ETIQUETA[clave] ?? clave, mostrado: `${cifra(x.gramos)} g${pct}`, parche: { [clave]: cifra(x.gramos) } as Partial<LabEvaluation>, modo: x.derivado ? "derivado" : "leido", fuente: x.fuentes.join(" · ") });
  }
  if (mallasSinBase) avisos.push("La granulometría viene en porcentajes y el reporte no da el peso de la almendra: dígite el trillado verde restante y los gramos de cada malla.");

  if (d.defectos) {
    const broca = f.brocaG ? `; broca ${cifra(f.brocaG.valor)} g` : "";
    const nota = `Defectos físicos (reporte): ${d.defectos.valor.toLowerCase()}${broca}.`;
    pon({ clave: "analysis_notes", etiqueta: "Notas del análisis", mostrado: nota, parche: { analysis_notes: nota }, modo: "leido", fuente: d.defectos.fuente });
  }

  return {
    formato: d.formato,
    origen: d.origen,
    campos,
    puntaje: d.puntaje ? { valor: d.puntaje.valor, protocolo: protocolo ?? "sca2004" } : null,
    factor: f.factor?.valor ?? null,
    identidad: d.identidad,
    avisos,
    confianza: d.confianza,
  };
}

// ── 5 · Aplicar una lectura a la planilla ───────────────────────────────────────────────────────────────────────────────
const tieneValor = (v: unknown): boolean =>
  Array.isArray(v) ? v.length > 0 : v && typeof v === "object" ? Object.keys(v).length > 0 : String(v ?? "").trim() !== "";
const mismoValor = (a: unknown, b: unknown): boolean => {
  if (Array.isArray(a) && Array.isArray(b)) return JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
  const na = Number(String(a ?? "").replace(",", "."));
  const nb = Number(String(b ?? "").replace(",", "."));
  if (String(a ?? "").trim() && String(b ?? "").trim() && Number.isFinite(na) && Number.isFinite(nb)) return Math.abs(na - nb) < 1e-9;
  return String(a ?? "").trim() === String(b ?? "").trim();
};
const CLAVES_SENSORIALES = [...SCA_ATTRS.map(([k]) => `sca_${k}`), ...CVA_SECCIONES.map(([k]) => `cva_${k}`)] as (keyof LabEvaluation)[];

export type ChoqueDeLectura = { campo: CampoLeido; actual: string };

/**
 * Pone los campos de una lectura en la planilla, solo los de los `bloques` que se revisan. Con `soloVacios` (la lectura con IA sobre
 * una planilla ya trabajada) no pisa nada: lo que difiere de lo que ya hay se devuelve como choque, para que el revisor decida.
 */
export function aplicaLectura(
  ev: LabEvaluation,
  campos: readonly CampoLeido[],
  bloques: readonly BloqueDePlanilla[],
  { soloVacios = false }: { soloVacios?: boolean } = {},
): { planilla: LabEvaluation; aplicados: CampoLeido[]; choques: ChoqueDeLectura[] } {
  let out: LabEvaluation = ev;
  const aplicados: CampoLeido[] = [];
  const choques: ChoqueDeLectura[] = [];
  for (const c of campos) {
    if (!bloques.includes(c.bloque)) continue;
    if (c.clave === "protocolo") {
      // La vista solo se cambia mientras no haya un atributo digitado.
      if (soloVacios && CLAVES_SENSORIALES.some((k) => tieneValor(out[k]))) continue;
      out = { ...out, ...c.parche };
      aplicados.push(c);
      continue;
    }
    const principal = Object.keys(c.parche)[0] as keyof LabEvaluation;
    if (soloVacios && tieneValor(out[principal])) {
      if (!mismoValor(out[principal], c.parche[principal])) {
        const actual = out[principal];
        choques.push({ campo: c, actual: Array.isArray(actual) ? actual.map((x) => (typeof x === "string" ? descriptorLabel(x) : String(x))).join(" · ") : String(actual) });
      }
      continue;
    }
    out = { ...out, ...c.parche };
    aplicados.push(c);
  }
  return { planilla: toLabEvaluation(out), aplicados, choques };
}

// ── 6 · El cotejo de la identidad del reporte con el lote ───────────────────────────────────────────────────────────────
export type ContextoDelLote = { productor: string | null; finca: string | null; municipio: string | null; vereda: string | null };
export type FilaDeCotejo = { etiqueta: string; reporte: string; lote: string | null; coincide: boolean | null };

const VACIAS = new Set(["la", "las", "los", "el", "del", "de", "finca", "lote", "hacienda", "vereda", "predio"]);
const palabrasDe = (s: string) => sinTildes(s).toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !VACIAS.has(w));
/** ¿Dicen lo mismo? Al menos el 60 % de las palabras del más corto están en el otro. */
export function parecidos(a: string, b: string): boolean {
  const A = new Set(palabrasDe(a));
  const B = new Set(palabrasDe(b));
  if (!A.size || !B.size) return false;
  const comunes = [...B].filter((w) => A.has(w)).length;
  return comunes / Math.min(A.size, B.size) >= 0.6;
}

export function cotejoDeIdentidad(identidad: readonly ItemDeIdentidad[], ctx: ContextoDelLote): FilaDeCotejo[] {
  const contra: Record<string, string | null> = { Nombre: ctx.productor, Finca: ctx.finca, Municipio: ctx.municipio, Vereda: ctx.vereda };
  return identidad.map((i) => {
    const lote = contra[i.etiqueta] ?? null;
    return { etiqueta: i.etiqueta, reporte: i.valor, lote, coincide: lote ? parecidos(i.valor, lote) : null };
  });
}

/** Lo que se guarda de las lecturas junto a la revisión (`lot_referencias.lectura_ctcx`): qué propuso el lector y de dónde, con sus
 *  avisos — sin la identidad del reporte. Llega del navegador: se lee a la defensiva (tipos, enums y largos). */
export function resumenDeLectura(lecturas: unknown) {
  const lista = (Array.isArray(lecturas) ? lecturas : []).slice(0, 4).filter((l): l is Record<string, unknown> => !!l && typeof l === "object");
  const texto = (v: unknown, max: number) => (typeof v === "string" ? limpia(v, max) : "");
  const origenDe = (v: unknown): OrigenDeLectura => (v === "ia" ? "ia" : "texto");
  const modos = new Set<string>(["leido", "derivado", "interpretado"]);
  const campos = lista
    .flatMap((l) => (Array.isArray(l.campos) ? l.campos : []).filter((c): c is Record<string, unknown> => !!c && typeof c === "object"))
    .map((c) => ({ clave: texto(c.clave, 40), modo: modos.has(String(c.modo)) ? String(c.modo) : "leido", mostrado: texto(c.mostrado, 120), origen: origenDe(c.origen) }))
    .filter((c) => c.clave)
    .slice(0, 80);
  const avisos = [...new Set(lista.flatMap((l) => (Array.isArray(l.avisos) ? l.avisos : []).map((a) => texto(a, 300)).filter(Boolean)))].slice(0, 12);
  const formato = ["fnc", "generico", "ia"].includes(String(lista[0]?.formato)) ? String(lista[0]?.formato) : null;
  const ia = lista.find((l) => l.origen === "ia");
  const confianza = ia && ["alta", "media", "baja"].includes(String(ia.confianza)) ? String(ia.confianza) : null;
  return { origenes: [...new Set(lista.map((l) => origenDe(l.origen)))], formato, campos, avisos, confianza };
}
