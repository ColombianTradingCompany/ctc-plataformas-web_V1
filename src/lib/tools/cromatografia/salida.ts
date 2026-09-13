// ── Lector de Cromatografía de Suelo · la SALIDA del modelo ──────────────────
// Módulo PURO. Recibe lo que devolvió el modelo y decide si puede llegar a la
// persona. Es la mitad «código» de la regla de oro: la política de lenguaje no
// se confía al prompt; se COMPRUEBA aquí, y lo que no pasa no se enseña.
//
// Tres clases de defecto, tres tratamientos:
//   · ERROR   → la respuesta no vale; el handler pide UNA corrección al modelo
//               y, si vuelve a fallar, no enseña nada (claims prohibidos,
//               contradicción con los rasgos, fuente inventada, sin lenguaje
//               probabilístico, estructura rota).
//   · AJUSTE  → se corrige de forma determinista y queda anotado en `ajustes`
//               (confianza «alta» baja a «media»).
//   · FORZADO → lo pone el servidor, nunca el modelo: el descargo, la etiqueta
//               de cada nivel y el contexto regional cuando no hay región.
//
// Cada interpretación y recomendación recibe un `id` estable (i1…, r1…): es el
// ancla del futuro modo «expert feedback» (owner, 2026-09-12) — un experto
// valida o corrige POR LECTURA, y eso solo se puede guardar si cada lectura
// tiene nombre.

import { fuentesPermitidas, normaliza, textosIdioma, type FuentePermitida, type Idioma, type Nivel, type PracticaDeManejo, type Rasgos, type Reglas, type ReglaRegional } from "./prompt";

export type Rango = [number, number];

export type Interpretacion = {
  id: string;
  observacion: string;
  lectura: string;
  fuente: string;
  nivel: Nivel;
  /** Lo que el reporte escribe junto al nivel. La C dice «criterio de
   *  práctica, no validado» siempre (PDF1 §8), lo recuerde o no el modelo. */
  etiqueta_nivel: string;
  confianza: "baja" | "media";
};

export type Recomendacion = { id: string; accion: string; justificacion: string; prioridad: "alta" | "media" | "baja" };

export type Senal = "buena" | "mixta" | "atencion";
export type Certeza = "baja" | "media";
/** La zona del croma de la que habla una conjetura: la usa la foto anotada del informe. */
export type ZonaFoto = "central" | "mineral" | "organic" | "enzymatic" | "general";
export const ZONAS_FOTO: ZonaFoto[] = ["central", "mineral", "organic", "enzymatic", "general"];
/** Una conjetura para el productor: lo que se ve, lo que podría significar, otra
 *  explicación posible y lo que implicaría. La certeza NO la decide el modelo: se
 *  calcula desde las interpretaciones técnicas que la sustentan (`certezaDe`). */
export type Conjetura = {
  id: string;
  titulo: string;
  lo_que_se_ve: string;
  conjetura: string;
  otra_posibilidad: string;
  que_implica: string;
  /** Dónde señalarla en la foto. */
  zona: ZonaFoto;
  certeza: Certeza;
  certeza_texto: string;
  basado_en: string[];
};
export type AccionProductor = {
  id: string;
  practica: string;
  titulo: string;
  por_que: string;
  como: string[];
  cuidado: string;
  fuentes: string[];
  nivel: Nivel;
  prioridad: "alta" | "media" | "baja";
  basado_en: string[];
  /** La puso el servidor porque la práctica va siempre, no el modelo. */
  forzada: boolean;
};
/** La cara del productor (v2.3). Todo lo que dice apunta a interpretaciones técnicas. */
export type InformeProductor = {
  senal: Senal;
  senal_texto: string;
  resumen: string;
  conjeturas: Conjetura[];
  /** Prácticas de manejo, ordenadas por prioridad. */
  acciones: AccionProductor[];
  /** Laboratorio y repetir el croma: siempre, pero al final (owner, 2026-09-13). */
  confirmar: AccionProductor[];
  descargo: string;
};

/** La zona que nombra un texto en palabras del campo; la primera que aparece gana.
 *  La misma regla vive en el HTML para las lecturas guardadas sin zona. */
const PATRONES_ZONA: [ZonaFoto, RegExp][] = [
  ["central", /centr|perfora/i],
  ["mineral", /mineral|intern|marr[oó]n oscuro|anillo oscuro/i],
  ["organic", /medi[oa]|dorad|org[aá]nic|[aá]mbar/i],
  ["enzymatic", /borde|pico|rayo|canal|afuera|extern|periferi|penach/i],
];
export function zonaDesdeTexto(texto: string, idioma: Idioma = "es"): ZonaFoto {
  let mejor: ZonaFoto = "general";
  let posicion = Infinity;
  const patrones = idioma === "es" ? PATRONES_ZONA : [...LEXICO[idioma].zonas, ...PATRONES_ZONA];
  for (const [zona, re] of patrones) {
    const m = re.exec(texto ?? "");
    if (m && m.index < posicion) {
      posicion = m.index;
      mejor = zona;
    }
  }
  return mejor;
}

// ── El léxico de cada idioma (V5.39) ──────────────────────────────────────────
// La regla de oro no cambia con el idioma, pero sus palabras sí. Cada idioma
// trae lo que la validación necesita: lo prohibido, cómo suena la duda, cómo se
// contradice la radialidad y cómo se nombran las zonas. El español es el de
// siempre (los patrones de arriba); inglés y alemán se SUMAN a él, porque una
// lectura en inglés que escriba «taza» tampoco pasa.
type Lexico = {
  prohibidos: { nombre: string; re: RegExp }[];
  probabilistico: RegExp;
  duda: RegExp;
  institucional: RegExp;
  contradiceBaja: RegExp;
  contradiceAlta: RegExp;
  zonaInterior: RegExp;
  zonaExterior: RegExp;
  croma: RegExp;
  zonas: [ZonaFoto, RegExp][];
};
export const LEXICO: Record<Exclude<Idioma, "es">, Lexico> = {
  en: {
    prohibidos: [
      { nombre: "cup", re: /\bcups?\b|\bcupping\b/i },
      { nombre: "score", re: /\bscor(e|es|ed|ing)\b/i },
      { nombre: "price", re: /\bprices?\b/i },
      { nombre: "flavour or sensory quality", re: /\bflavou?r|sensory quality|coffee quality|quality of (the |your )?coffee/i },
      { nombre: "certification", re: /\bcertif/i },
      // «does not measure», «cannot measure» and «measures no nutrients» are honest negations.
      { nombre: "«measures» or scientific measurement", re: /(?<!\bnot\s)(?<!cannot\s)\bmeasures\b(?!\s+(no|neither|nothing)\b)|scientific measurement|\bis a measurement/i },
      { nombre: "% organic matter", re: /%\s*(of\s+)?organic\s+matter|organic\s+matter\s*(of|:|=|≈|~)?\s*\d+([.,]\d+)?\s*%/i },
      { nombre: "nutrient value", re: /\b(nitrogen|phosphorus|potassium)\s*(total\s*)?(of|:|=|≈)\s*\d/i },
    ],
    probabilistico: /could|might|\bmay\b|suggest|consistent with|align|associat|is interpreted|possib|probabl|likely|tentativ|compatible with|appear|seem|report|indicat/i,
    duda: /seem|appear|\bmay\b|might|could|possibl|according to the photo|looks like|\bsign/i,
    institucional: /institutional|peer[- ]reviewed|studies with n\s*=/i,
    contradiceBaja: /channels?\s+(are\s+|is\s+)?(well|very|fully|clearly|strongly)[- ](developed|defined|marked)|(well|fully|clearly)[- ]developed\s+(channels?|spikes?)|spikes?\s+(are\s+|is\s+)?(well|very|fully|clearly)[- ](developed|defined|marked)/i,
    contradiceAlta: /(\bno|without|absence of|lacks?|lacking)\s+(radial\s+)?channels|channels\s+(are\s+)?absent/i,
    zonaInterior: /(central|mineral|inner|interior)\s+zone|in this zone|perforation/i,
    zonaExterior: /(outer|enzymatic|exterior|nutritional|external)\s+zone|periphery|outer edge/i,
    croma: /\bchroma|chromatogram/i,
    zonas: [
      ["central", /\bcent(er|re)|perforation/i],
      ["mineral", /mineral|\binner|dark brown|dark ring/i],
      ["organic", /middle|golden|organic|amber/i],
      ["enzymatic", /\bedge|spike|\bray|channel|outside|\bouter|peripher|plume/i],
    ],
  },
  de: {
    prohibidos: [
      { nombre: "Tasse", re: /\btassen?\b|tassenqualit|cupping/i },
      { nombre: "Punktzahl", re: /punktzahl|\bpunkte?\b|bewertungspunkt/i },
      { nombre: "Verkostung", re: /verkost/i },
      { nombre: "Preis", re: /\bpreis(e|es|en)?\b/i },
      { nombre: "Geschmack oder sensorische Qualität", re: /geschmack|sensorische qualität|kaffeequalität|qualität (des|ihres) kaffees/i },
      { nombre: "Zertifizierung", re: /zertifi/i },
      // «misst nicht», «misst keine Nährstoffe»: negaciones honestas.
      { nombre: "«misst» oder wissenschaftliche Messung", re: /(?<!\bnicht\s)\bmisst\b(?!\s+(keine[nrs]?|nicht|weder|nichts)\b)|wissenschaftliche messung|\bist eine messung/i },
      { nombre: "% organische Substanz", re: /%\s*(an\s+)?organische[rn]?\s+substanz|organische[rn]?\s+substanz\s*(von|:|=|≈|~)?\s*\d+([.,]\d+)?\s*%/i },
      { nombre: "Nährstoffwert", re: /\b(stickstoff|phosphor|kalium)\s*(gesamt\s*)?(von|:|=|≈)\s*\d/i },
    ],
    probabilistico: /könnte|könnten|\bkann\b|\bkönnen\b|deutet|deuten|vereinbar mit|konsistent mit|assoziier|möglich|wahrscheinlich|vorläufig|scheint|scheinen|berichten|hinweis|\bweist\b|weisen|vermuten|dürfte|entspr[ei]ch/i,
    duda: /scheint|scheinen|könnte|möglicherweise|vielleicht|\bkann\b|nach dem foto|sieht|zeichen/i,
    institucional: /institutionell|begutachtet|peer[- ]review|studien mit n\s*=/i,
    contradiceBaja: /(gut|sehr|voll|vollständig|klar|deutlich|stark)\s+(entwickelte?[nrs]?|ausgeprägte?[nrs]?|definierte?[nrs]?)\s+(kanäle|spitzen)|(kanäle|spitzen)\s+(sind\s+)?(gut|voll|vollständig|klar|deutlich|stark)\s+(entwickelt|ausgeprägt|definiert)/i,
    contradiceAlta: /(keine|ohne|fehlende[nrs]?)\s+(radiale[nrs]?\s+)?kanäle|kanäle\s+fehlen|abwesenheit von kanälen/i,
    zonaInterior: /(zentral|mineral|inner)\w*\s+zone|in dieser zone|perforation/i,
    zonaExterior: /(äußer|enzymatisch|extern)\w*\s+zone|peripherie|außenrand|äußeren rand/i,
    croma: /\bchroma|chromatogramm/i,
    zonas: [
      ["central", /zentr|perforation|\bmitte\b/i],
      ["mineral", /mineral|inner|dunkelbraun|dunkler ring/i],
      ["organic", /mittler|golden|organisch|bernstein/i],
      ["enzymatic", /\brand|spitze|strahl|kanal|kanäle|außen|äußer|peripher|fahne/i],
    ],
  },
};
/** Una frase que parece español: dos o más palabras funcionales del español.
 *  En una lectura pedida en inglés o alemán, un campo así se rechaza (la primera
 *  prueba en alemán mezcló idiomas campo por campo). Las palabras elegidas no
 *  existen en inglés ni en alemán; «con» y «para» solas no bastan (una sola no
 *  cuenta). */
// Sin «foto» ni «zona»: existen en alemán (Foto) y casi en inglés (zone).
const FUNCIONALES_ES = /(^|[^\p{L}])(el|la|los|las|del|al|que|una|uno|unos|unas|con|para|por|según|pero|sin|hay|puede|podría|parece|suelo|centro|borde|abono|está|son|más|muy|también|como|sobre|este|esta|esto|ese|esa|esos|esas)(?=[^\p{L}]|$)/giu;
export function pareceEspanol(texto: string): boolean {
  return (String(texto ?? "").match(FUNCIONALES_ES) ?? []).length >= 2;
}

/** Calificar un valor del laboratorio («pH bajo», «moderate organic matter») es
 *  interpretar el análisis, trabajo del agrónomo, no del lector. En el contraste
 *  solo cabe decir si la foto va en la misma dirección. Haiku lo hizo en la
 *  primera prueba en inglés aunque el prompt lo prohibía: se comprueba. */
const CALIFICADORES: Record<Idioma, string> = {
  es: "alt[oa]s?|baj[oa]s?|moderad[oa]s?|óptim[oa]s?|deficientes?|adecuad[oa]s?|excesiv[oa]s?|típic[oa]s?|ácid[oa]s?|alcalin[oa]s?|pobres?|ric[oa]s?",
  en: "high|low|moderate(?:ly)?|optimal|deficient|adequate|excessive|typical|acidic|alkaline|poor|rich",
  de: "hoch|hohe[nrs]?|niedrig\\p{L}*|moderat\\p{L}*|optimal\\p{L}*|mangel\\p{L}*|ausreichend\\p{L}*|übermäßig\\p{L}*|typisch\\p{L}*|sauer|saure[nrs]?|alkalisch\\p{L}*|arm|reich",
};
const TERMINOS_LAB: Record<Idioma, string> = {
  es: "pH|materia\\s+org[aá]nica|nitr[oó]geno|f[oó]sforo|potasio|calcio|magnesio|acidez",
  en: "pH|organic\\s+matter|nitrogen|phosphorus|potassium|calcium|magnesium|acidity",
  de: "pH(?:-Wert)?|organische[nrs]?\\s+(?:materie|substanz)|stickstoff|phosphor|kalium|calcium|kalzium|magnesium|säure",
};
/** «pH bajo», «moderate organic matter», «organic matter at 6.1 %, which is moderate»,
 *  «pH-Wert von 4,9 ist sauer»: un calificador pegado a un parámetro del
 *  laboratorio (hasta 2 palabras antes o 4 después). «High colour intensity» o
 *  «hohe Aktivität» describen la foto y pasan. */
function calificaLab(texto: string, idioma: Idioma): string | null {
  const q = CALIFICADORES[idioma];
  const lab = TERMINOS_LAB[idioma];
  const re = new RegExp(`(?<![\\p{L}])(${q})(?:[^\\p{L}]+\\p{L}+){0,2}[^\\p{L}]+(?:${lab})(?![\\p{L}])|(?<![\\p{L}])(?:${lab})(?:[^\\p{L}\\d]+[\\p{L}\\d.,%]+){0,4}[^\\p{L}]+(${q})(?![\\p{L}])`, "iu");
  const m = re.exec(texto);
  return m ? m[1] ?? m[2] ?? m[0] : null;
}

/** Los nombres de patrón que hablan de VALORES (pH, % MO, ppm…): en el contraste
 *  con el laboratorio declarado el modelo puede citarlos, porque no los inventa. */
const PATRONES_DE_VALOR = new Set(["valor de pH", "valor de nutriente", "valor de N/P/K", "% de materia orgánica", "% organic matter", "nutrient value", "% organische Substanz", "Nährstoffwert"]);

/** Media solo si alguna interpretación que la sustenta tiene confianza media y
 *  evidencia A o B; si no, baja. El método no admite «alta». */
export function certezaDe(ids: string[], interpretaciones: Interpretacion[]): Certeza {
  return interpretaciones.some((it) => ids.includes(it.id) && it.confianza === "media" && (it.nivel === "A" || it.nivel === "B")) ? "media" : "baja";
}

export type Reporte = {
  descripcion_visual: string;
  escala_ford: Record<"canales" | "picos" | "intensidad", { rango: Rango; base: string }>;
  interpretaciones: Interpretacion[];
  contexto_regional_aplicado: string;
  contexto_regional_clave: string;
  contexto_regional_regla: string;
  recomendaciones: Recomendacion[];
  /** V5.39: solo cuando el productor declaró un análisis de laboratorio. */
  contraste_laboratorio: string | null;
  productor: InformeProductor;
  /** `mandatory_disclaimer_es` (o su traducción), íntegro, puesto por el servidor. */
  limites: string;
  /** El idioma en que el modelo escribió la lectura. */
  idioma: Idioma;
  ajustes: string[];
};

export type ResultadoValidacion = { ok: true; reporte: Reporte } | { ok: false; errores: string[] };

export type OpcionesValidacion = {
  /** Idioma en que debía escribir el modelo; decide el léxico y los textos forzados. */
  idioma?: Idioma;
  /** Si el usuario declaró un análisis de laboratorio: entonces `contraste_laboratorio` es obligatorio. */
  conLaboratorio?: boolean;
};

export const ETIQUETA_NIVEL: Record<Nivel, string> = {
  A: "Evidencia revisada por pares, de alcance limitado",
  B: "Reportado por fuente institucional o académica",
  C: "Criterio de práctica, no validado",
};

/** Umbrales de coherencia rasgos ↔ texto (kickoff v2 §4 y §7). */
export const COHERENCIA = { radialidadBaja: 0.25, radialidadAlta: 0.6 };

export const MAX_INTERPRETACIONES = 6;
export const MAX_RECOMENDACIONES = 5;

// ── Las palabras que no pueden salir ──────────────────────────────────────────
// La lista del kickoff §7 más los `forbidden_claims` del JSON traducidos a
// patrones. Se aplican a TODO el texto del modelo; el descargo no pasa por aquí
// porque no lo escribe el modelo (y él sí nombra la calidad sensorial, para
// negarla).
export const PATRONES_PROHIBIDOS: { nombre: string; re: RegExp }[] = [
  { nombre: "taza", re: /\btazas?\b/i },
  { nombre: "SCA/CVA", re: /\b(SCA|CVA)\b/ },
  { nombre: "puntaje", re: /\bpuntaj/i },
  { nombre: "catación", re: /\bcata(ci[oó]n|dor)/i },
  { nombre: "precio", re: /\bprecios?\b/i },
  { nombre: "sabor o calidad sensorial", re: /\bsabor|calidad\s+sensorial|calidad\s+(del|de)\s+caf/i },
  { nombre: "certificación", re: /\bcertific/i },
  // «no mide nutrientes» es una negación honesta y pasa; «mide la materia orgánica» no.
  { nombre: "«mide» o medición científica", re: /(?<!\bno\s)\bmide\b|\bmedici[oó]n\s+cient/i },
  { nombre: "% de materia orgánica", re: /%\s*(de\s+)?(la\s+)?materia\s+org|materia\s+org[aá]nica\s*(de|del|:|=|≈)?\s*\d+([.,]\d+)?\s*%/i },
  { nombre: "valor de pH", re: /\bpH\s*(de|del|:|=|≈|~|entre|cercano a)?\s*\d/i },
  { nombre: "valor de nutriente", re: /\b\d+([.,]\d+)?\s*(ppm|mg\s*\/\s*kg|meq|cmol)|\b(nitr[oó]geno|f[oó]sforo|potasio)\s*(total\s*)?(de|:|=|≈)\s*\d/i },
  // Sin /i a propósito: «n=343» (tamaño de muestra) es lenguaje permitido de nivel A.
  { nombre: "valor de N/P/K", re: /\b(N|P|K)\s*(total\s*)?(:|=|≈)\s*\d/ },
];

export function claimsProhibidos(texto: string, idioma: Idioma = "es"): string[] {
  const patrones = idioma === "es" ? PATRONES_PROHIBIDOS : [...PATRONES_PROHIBIDOS, ...LEXICO[idioma].prohibidos];
  return patrones.filter((p) => p.re.test(texto)).map((p) => p.nombre);
}

/** La duda dicha en palabras del campo, para la cara del productor. */
export const DUDA_SENCILLA = /parece|puede que|puede|podr[ií]a|se ve|posiblemente|según la foto|al parecer|señal/i;

const escaparRegex = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** Una lista de palabras como patrón que las busca al principio de palabra.
 *  Las entradas largas valen como prefijo («morfológic» atrapa «morfológica»);
 *  las cortas (≤ 4 letras, como «pH») exigen fin de palabra, o «photo» y
 *  «Phosphat» caerían por «pH» (V5.39). */
export function patronDePalabras(lista: string[] | undefined): RegExp | null {
  const limpias = (lista ?? []).map((p) => p.trim()).filter(Boolean);
  if (!limpias.length) return null;
  const alternativas = limpias.map((p) => (p.length <= 4 ? `${escaparRegex(p)}(?![\\p{L}])` : escaparRegex(p)));
  return new RegExp(`(^|[^\\p{L}])(${alternativas.join("|")})`, "iu");
}

/** Lenguaje probabilístico: la lectura tiene que dudar en voz alta. */
export const LENGUAJE_PROBABILISTICO =
  /podr[ií]a|sugiere|consistente con|se asocia|asocian|se interpreta|posible|probable|puede indicar|pueden indicar|reportan|tentativ|compatible con|parece/i;

const CONTRADICE_RADIALIDAD_BAJA = /canales\s+(bien|muy|totalmente|plenamente|claramente|ampliamente)\s+(desarrollad|definid|marcad)|picos\s+(bien|muy|totalmente|plenamente|claramente)\s+(desarrollad|definid|marcad)/i;
const CONTRADICE_RADIALIDAD_ALTA = /(sin|ausencia\s+de|no\s+(se\s+observan|hay|presenta))\s+canales|canales\s+ausentes/i;
/** Una frase acotada a las zonas de dentro, donde los canales no se leen. */
const ZONA_INTERIOR = /zona\s+(central|mineral|interna|interior)|en\s+esta\s+zona|perforaci/i;
/** Una frase que habla de la zona de fuera, donde los canales sí se leen. */
const ZONA_EXTERIOR = /zona\s+(externa|enzim[aá]tica|exterior|nutricional)|periferia|borde\s+extern/i;

/** El primer objeto JSON del texto. El modelo a veces antepone una frase
 *  aunque se le pida que no (misma rescatada que `coffeed/claude.ts`). */
export function extraerJson(texto: string): unknown {
  const s = String(texto ?? "");
  const i = s.indexOf("{");
  const j = s.lastIndexOf("}");
  if (i < 0 || j <= i) return null;
  try {
    return JSON.parse(s.slice(i, j + 1));
  } catch {
    return null;
  }
}

export function resolverFuente(fuente: string, permitidas: FuentePermitida[]): FuentePermitida | null {
  const n = normaliza(fuente).replace(/[.,;:]+$/, "");
  if (!n) return null;
  const exacta = permitidas.find((p) => normaliza(p.fuente) === n);
  if (exacta) return exacta;
  // «Kokornaczyk et al. 2016» ↔ «Kokornaczyk 2016»: el mismo autor, otra grafía.
  const primera = (s: string) => normaliza(s).split(/[\s/(,]+/)[0] ?? "";
  const tok = primera(n);
  // Tres letras bastan: «UIS», «UFU» son autores de pleno derecho en las reglas.
  if (tok.length < 3) return null;
  const candidatas = permitidas.filter((p) => primera(p.fuente) === tok);
  if (candidatas.length <= 1) return candidatas[0] ?? null;
  // Mismo autor, varias entradas: gana la que comparte más palabras con la cita.
  // «Ford et al. 2021 (Geoderma…)» debe caer en la entrada que dice 2021, no en
  // «Ford 2019» — el reporte no puede cambiarle el año a una fuente.
  const trozos = (s: string) => normaliza(s).split(/[\s/(),;.:]+/).filter((t) => t.length >= 2);
  const citadas = new Set(trozos(n));
  const puntos = (p: FuentePermitida) => trozos(p.fuente).filter((t) => citadas.has(t)).length;
  return candidatas.reduce((mejor, p) => (puntos(p) > puntos(mejor) ? p : mejor));
}

const ORDEN: Record<Nivel, number> = { A: 0, B: 1, C: 2 };
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

function rangoValido(v: unknown): v is Rango {
  return (
    Array.isArray(v) &&
    v.length === 2 &&
    v.every((n) => Number.isInteger(n) && n >= 1 && n <= 5) &&
    (v[0] as number) <= (v[1] as number) &&
    (v[1] as number) - (v[0] as number) <= 1
  );
}

/**
 * Valida y normaliza la respuesta del modelo. `regional` es la regla que el
 * servidor YA resolvió para el departamento (no la que diga el modelo).
 */
export function validarSalida(bruto: unknown, reglas: Reglas, rasgos: Rasgos, regional: ReglaRegional, opciones: OpcionesValidacion = {}): ResultadoValidacion {
  const errores: string[] = [];
  const ajustes: string[] = [];
  if (!bruto || typeof bruto !== "object" || Array.isArray(bruto)) {
    return { ok: false, errores: ["La respuesta no es un objeto JSON con el esquema pedido."] };
  }
  const x = bruto as Record<string, unknown>;
  const idioma: Idioma = opciones.idioma === "en" || opciones.idioma === "de" ? opciones.idioma : "es";
  const tx = textosIdioma(reglas, idioma);
  const lex = idioma === "es" ? null : LEXICO[idioma];
  // La duda y la contradicción se buscan en el léxico del idioma pedido Y en el
  // español: el modelo escribe en uno, pero la validación no se fía.
  const probabilistico = (t: string) => LENGUAJE_PROBABILISTICO.test(t) || !!lex?.probabilistico.test(t);
  const duda = (t: string) => DUDA_SENCILLA.test(t) || !!lex?.duda.test(t);
  // Una fuente C no puede sonar a institución ni a estudio revisado por pares…
  // salvo para NEGARLO («not validated in peer-reviewed studies», «no validado
  // por pares»), que es exactamente la honestidad que se pide. Se mira la
  // cláusula donde aparece la palabra.
  const institucional = (t: string) => {
    const reInst = [/institucional|revisad[oa]s?\s+por\s+pares|estudios\s+con\s+n\s*=/i, lex?.institucional].filter(Boolean) as RegExp[];
    return t.split(/[.;\n]|,\s*(?:aunque|though|although|but|pero|obwohl|aber)\b/i).some((clausula) => reInst.some((re) => re.test(clausula)) && !/\bnot\b|\bno\s|\bnon-|\bnicht\b|\bkein/i.test(clausula));
  };
  const contradiceBaja = (t: string) => CONTRADICE_RADIALIDAD_BAJA.test(t) || !!lex?.contradiceBaja.test(t);
  const contradiceAlta = (t: string) => CONTRADICE_RADIALIDAD_ALTA.test(t) || !!lex?.contradiceAlta.test(t);
  const zonaInterior = (t: string) => ZONA_INTERIOR.test(t) || !!lex?.zonaInterior.test(t);
  const zonaExterior = (t: string) => ZONA_EXTERIOR.test(t) || !!lex?.zonaExterior.test(t);
  const hablaDelCroma = (t: string) => /\bcroma/i.test(t) || !!lex?.croma.test(t);
  // Lo que el servidor pone por su cuenta, en el idioma de la lectura.
  const etiquetaNivel = (n: Nivel) => tx?.etiqueta_nivel?.[n] ?? ETIQUETA_NIVEL[n] ?? "";
  const practicaTraducida = (p: PracticaDeManejo) => {
    const t = tx?.practicas?.[p.id];
    return { titulo: t?.titulo ?? p.titulo, para_que: t?.para_que ?? p.para_que, como: t?.como ?? p.como, cuidado: t?.cuidado ?? p.cuidado ?? "" };
  };

  // 1 · Descripción
  const descripcion = str(x.descripcion_visual);
  if (descripcion.length < 40) errores.push("descripcion_visual falta o es demasiado corta (mínimo 40 caracteres, citando rasgos medidos).");

  // 2 · Ford como rangos
  const ford = (x.escala_ford ?? {}) as Record<string, { rango?: unknown; base?: unknown }>;
  const escala = {} as Reporte["escala_ford"];
  for (const k of ["canales", "picos", "intensidad"] as const) {
    const e = ford[k] ?? {};
    if (!rangoValido(e.rango)) errores.push(`escala_ford.${k}.rango debe ser [n, n] enteros 1–5 que difieran en 0 o 1.`);
    if (!str(e.base)) errores.push(`escala_ford.${k}.base falta: di qué rasgo medido sustenta el rango.`);
    escala[k] = { rango: (rangoValido(e.rango) ? e.rango : [1, 1]) as Rango, base: str(e.base) };
  }

  // 3 · Cadena de evidencia
  const permitidas = fuentesPermitidas(reglas);
  const brutas = Array.isArray(x.interpretaciones) ? (x.interpretaciones as Record<string, unknown>[]) : [];
  if (!brutas.length) errores.push("interpretaciones debe traer al menos una lectura sustentada.");
  if (brutas.length > MAX_INTERPRETACIONES) errores.push(`interpretaciones trae ${brutas.length}; el máximo es ${MAX_INTERPRETACIONES}.`);
  const interpretaciones: Interpretacion[] = [];
  brutas.slice(0, MAX_INTERPRETACIONES).forEach((it, i) => {
    const pos = `interpretaciones[${i}]`;
    const observacion = str(it?.observacion);
    const lectura = str(it?.lectura);
    // Una interpretación puede citar varias fuentes («Kokornaczyk…; Graciano…») con
    // un nivel compuesto («A/B»). Se acepta, pero con el nivel MÁS CONSERVADOR: una
    // lectura nunca se presenta con más evidencia que su fuente más débil.
    const nivelBruto = str(it?.nivel).toUpperCase();
    const nivelBienFormado = /^[ABC](\s*[/,+Y]\s*[ABC])*$/.test(nivelBruto);
    const letras = nivelBienFormado ? ([...new Set(nivelBruto.match(/[ABC]/g) ?? [])] as Nivel[]) : [];
    const nivel = (letras.length ? letras.reduce((a, b) => (ORDEN[b] > ORDEN[a] ? b : a)) : "") as Nivel;
    if (letras.length > 1) ajustes.push(`La lectura ${i + 1} citaba los niveles ${letras.join("/")}; se toma el más conservador (${nivel}).`);
    let confianza = str(it?.confianza).toLowerCase();
    if (!observacion) errores.push(`${pos}.observacion está vacía: sin observación concreta no hay lectura.`);
    if (!lectura) errores.push(`${pos}.lectura está vacía.`);
    else if (!probabilistico(lectura)) errores.push(`${pos}.lectura es categórica; usa lenguaje probabilístico según su nivel.`);
    // Sobrepresentar la evidencia es el error que importa: un manual de práctica
    // (nivel C) no puede sonar a institución ni a estudio revisado por pares.
    if (nivel === "C" && institucional(lectura)) {
      errores.push(`${pos}: una fuente de nivel C no se presenta como institucional ni como estudio revisado por pares.`);
    }
    if (!["A", "B", "C"].includes(nivel)) errores.push(`${pos}.nivel debe ser A, B o C.`);
    const citadas = str(it?.fuente).split(/\s*;\s*|\s+·\s+/).filter(Boolean);
    const resueltas = citadas.map((c) => resolverFuente(c, permitidas));
    const f: FuentePermitida | null =
      citadas.length && resueltas.every(Boolean)
        ? {
            fuente: (resueltas as FuentePermitida[]).map((r) => r.fuente).join(" · "),
            // El techo de varias fuentes es el de la más débil.
            mejorNivel: (resueltas as FuentePermitida[]).map((r) => r.mejorNivel).reduce((a, b) => (ORDEN[b] > ORDEN[a] ? b : a)),
          }
        : null;
    if (!f) {
      const malas = citadas.filter((_, k) => !resueltas[k]);
      errores.push(`${pos}.fuente «${malas.join("; ") || str(it?.fuente)}» no está en la lista de fuentes permitidas.`);
    } else if (["A", "B", "C"].includes(nivel) && ORDEN[nivel] < ORDEN[f.mejorNivel]) {
      errores.push(`${pos}: «${f.fuente}» no alcanza el nivel ${nivel} en las reglas (máximo ${f.mejorNivel}).`);
    }
    if (confianza === "alta") {
      confianza = "media";
      ajustes.push(`La confianza de la lectura ${i + 1} bajó de «alta» a «media»: el método no admite más.`);
    }
    if (!["baja", "media"].includes(confianza)) errores.push(`${pos}.confianza debe ser «baja» o «media».`);
    interpretaciones.push({
      id: `i${i + 1}`,
      observacion,
      lectura,
      fuente: f?.fuente ?? str(it?.fuente),
      nivel,
      etiqueta_nivel: etiquetaNivel(nivel),
      confianza: confianza as "baja" | "media",
    });
  });

  // 4 · Recomendaciones
  const recs = Array.isArray(x.recomendaciones) ? (x.recomendaciones as Record<string, unknown>[]) : [];
  if (!recs.length) errores.push("recomendaciones debe traer al menos una acción de manejo.");
  if (recs.length > MAX_RECOMENDACIONES) errores.push(`recomendaciones trae ${recs.length}; el máximo es ${MAX_RECOMENDACIONES}.`);
  const recomendaciones: Recomendacion[] = recs.slice(0, MAX_RECOMENDACIONES).map((r, i) => {
    const prioridad = str(r?.prioridad).toLowerCase();
    if (!str(r?.accion)) errores.push(`recomendaciones[${i}].accion está vacía.`);
    if (!str(r?.justificacion)) errores.push(`recomendaciones[${i}].justificacion está vacía.`);
    if (!["alta", "media", "baja"].includes(prioridad)) errores.push(`recomendaciones[${i}].prioridad debe ser alta, media o baja.`);
    return { id: `r${i + 1}`, accion: str(r?.accion), justificacion: str(r?.justificacion), prioridad: prioridad as Recomendacion["prioridad"] };
  });

  // 4a · El contraste con el laboratorio declarado (V5.39). Solo existe si el
  // usuario declaró un análisis; ahí el modelo puede citar los valores
  // declarados (no los inventa), pero no la taza, el precio ni la medición.
  const contrasteBruto = str(x.contraste_laboratorio);
  let contraste: string | null = null;
  if (opciones.conLaboratorio) {
    if (contrasteBruto.length < 30) errores.push("contraste_laboratorio falta: el usuario declaró un análisis de laboratorio; di en 80 palabras o menos si lo que sugiere la foto va en la misma dirección que esos valores.");
    else if (!probabilistico(contrasteBruto)) errores.push("contraste_laboratorio es categórico; usa lenguaje probabilístico.");
    const hallados = claimsProhibidos(contrasteBruto, idioma).filter((n) => !PATRONES_DE_VALOR.has(n));
    if (hallados.length) errores.push(`contraste_laboratorio contiene afirmaciones prohibidas (${hallados.join(", ")}).`);
    const califica = calificaLab(contrasteBruto, idioma) ?? (idioma !== "es" ? calificaLab(contrasteBruto, "es") : null);
    if (califica) errores.push(`contraste_laboratorio califica los valores del laboratorio («${califica}»): interpretar el análisis es del agrónomo; di solo si lo que sugiere la foto va en la misma dirección que lo declarado. Describir la foto («alta intensidad de color») sí vale.`);
    contraste = contrasteBruto || null;
  } else if (contrasteBruto) {
    ajustes.push("El modelo escribió contraste_laboratorio sin análisis declarado; se descartó.");
  }

  // 4b · La cara del productor (v2.3). Conjeturas con su certeza y lo que
  // implicarían; prácticas de manejo por prioridad; y lo que confirma
  // (laboratorio, repetir el croma) en su propio bloque al final: siempre está,
  // pero no es el primer consejo. El cómo de cada práctica lo pone el servidor.
  const lp = reglas.lenguaje_productor;
  const catalogo = new Map<string, PracticaDeManejo>((reglas.practicas_de_manejo ?? []).map((p) => [p.id, p]));
  const idsTecnicos = new Set(interpretaciones.map((it) => it.id));
  const prod = (x.productor ?? {}) as Record<string, unknown>;
  const senal = str(prod.senal).toLowerCase() as Senal;
  if (!["buena", "mixta", "atencion"].includes(senal)) errores.push("productor.senal debe ser buena, mixta o atencion.");
  const resumenProductor = str(prod.resumen);
  if (resumenProductor.length < 30) errores.push("productor.resumen falta: 2 o 3 frases sencillas para el productor.");
  else if (!duda(resumenProductor)) errores.push("productor.resumen es categórico: usa parece, puede que o se ve.");
  const basado = (v: unknown, pos: string) => {
    const ids = Array.isArray(v) ? v.map((e) => String(e).trim()) : [];
    if (!ids.length || ids.some((id) => !idsTecnicos.has(id))) errores.push(`${pos}.basado_en debe nombrar interpretaciones que existan (i1, i2…).`);
    return ids.filter((id) => idsTecnicos.has(id));
  };

  const conjeturasBrutas = Array.isArray(prod.conjeturas) ? (prod.conjeturas as Record<string, unknown>[]) : [];
  if (conjeturasBrutas.length < 2 || conjeturasBrutas.length > 5) errores.push("productor.conjeturas debe traer de 2 a 5 conjeturas.");
  const conjeturas: Conjetura[] = conjeturasBrutas.slice(0, 5).map((c, i) => {
    const pos = `productor.conjeturas[${i}]`;
    for (const campo of ["titulo", "lo_que_se_ve", "conjetura", "que_implica"]) {
      if (!str(c?.[campo])) errores.push(`${pos}.${campo} está vacío.`);
    }
    if (str(c?.conjetura) && !duda(str(c?.conjetura))) errores.push(`${pos}.conjetura es categórica: usa puede que, podría o parece.`);
    const ids = basado(c?.basado_en, pos);
    const certeza = certezaDe(ids, interpretaciones);
    const zonaBruta = str(c?.zona).toLowerCase() as ZonaFoto;
    const zona = ZONAS_FOTO.includes(zonaBruta) ? zonaBruta : zonaDesdeTexto(`${str(c?.titulo)} ${str(c?.lo_que_se_ve)}`, idioma);
    if (zona !== zonaBruta) ajustes.push(`La conjetura ${i + 1} no traía una zona válida; se dedujo «${zona}» de lo que se ve.`);
    return {
      id: `c${i + 1}`,
      titulo: str(c?.titulo),
      lo_que_se_ve: str(c?.lo_que_se_ve),
      conjetura: str(c?.conjetura),
      otra_posibilidad: str(c?.otra_posibilidad),
      que_implica: str(c?.que_implica),
      zona,
      certeza,
      certeza_texto: tx?.certezas?.[certeza] ?? lp?.certezas?.[certeza] ?? "",
      basado_en: ids,
    };
  });

  const accionesBrutas = Array.isArray(prod.acciones) ? (prod.acciones as Record<string, unknown>[]) : [];
  if (accionesBrutas.length > 5) errores.push("productor.acciones trae más de 4 prácticas.");
  const elegidas = new Set<string>();
  const acciones: AccionProductor[] = [];
  const confirmar: AccionProductor[] = [];
  accionesBrutas.slice(0, 5).forEach((a, i) => {
    const pos = `productor.acciones[${i}]`;
    const practica = catalogo.get(str(a?.practica));
    if (!practica) {
      errores.push(`${pos}.practica «${str(a?.practica)}» no está en el catálogo de prácticas.`);
      return;
    }
    const prioridad = str(a?.prioridad).toLowerCase();
    if (!str(a?.por_que)) errores.push(`${pos}.por_que está vacío.`);
    if (!["alta", "media", "baja"].includes(prioridad)) errores.push(`${pos}.prioridad debe ser alta, media o baja.`);
    if (elegidas.has(practica.id)) return;
    elegidas.add(practica.id);
    const pt = practicaTraducida(practica);
    const accion: AccionProductor = {
      id: "", practica: practica.id, titulo: pt.titulo, por_que: str(a?.por_que), como: pt.como,
      cuidado: pt.cuidado, fuentes: practica.fuentes, nivel: practica.nivel,
      prioridad: prioridad as AccionProductor["prioridad"], basado_en: basado(a?.basado_en, pos), forzada: false,
    };
    // Si el modelo eligió una de las que confirman, va a su bloque con su porqué.
    (practica.siempre ? confirmar : acciones).push(accion);
  });
  if (!acciones.length) errores.push("productor.acciones debe traer al menos una práctica de manejo del catálogo, además del laboratorio y de repetir el croma.");
  const ORDEN_PRIORIDAD = { alta: 0, media: 1, baja: 2 } as const;
  acciones.sort((a, b) => (ORDEN_PRIORIDAD[a.prioridad] ?? 3) - (ORDEN_PRIORIDAD[b.prioridad] ?? 3));
  for (const p of reglas.practicas_de_manejo ?? []) {
    if (!p.siempre || elegidas.has(p.id)) continue;
    const pt = practicaTraducida(p);
    confirmar.push({ id: "", practica: p.id, titulo: pt.titulo, por_que: pt.para_que, como: pt.como, cuidado: pt.cuidado, fuentes: p.fuentes, nivel: p.nivel, prioridad: "media", basado_en: [], forzada: true });
  }
  acciones.forEach((a, i) => (a.id = `a${i + 1}`));
  confirmar.forEach((a, i) => (a.id = `k${i + 1}`));

  // 5 · Contexto regional: si no hay región, lo escribe el servidor.
  let contexto = str(x.contexto_regional_aplicado);
  const entradaEs = regional.entrada as { rule?: string; expected_baseline?: string };
  // La regla regional que se cita, en el idioma de la lectura (si hay traducción).
  const entrada = { ...entradaEs, ...(tx?.regional?.[regional.clave] ?? {}) } as { rule?: string; expected_baseline?: string };
  if (regional.clave === "unknown_region") {
    contexto = `${tx?.sin_region ?? "No se aplicó línea base regional: "}${entrada.rule ?? reglas.regional_context_rules.unknown_region.rule}.`;
  } else if (!contexto) {
    errores.push("contexto_regional_aplicado falta: explica cómo condiciona la zona edafológica esta lectura.");
  }

  // 6 · Afirmaciones prohibidas, en todo lo que escribió el modelo
  const campos: [string, string][] = [
    ["descripcion_visual", descripcion],
    ...(["canales", "picos", "intensidad"] as const).map((k) => [`escala_ford.${k}.base`, escala[k].base] as [string, string]),
    ...interpretaciones.flatMap((it, i) => [
      [`interpretaciones[${i}].observacion`, it.observacion] as [string, string],
      [`interpretaciones[${i}].lectura`, it.lectura] as [string, string],
    ]),
    ["contexto_regional_aplicado", regional.clave === "unknown_region" ? "" : contexto],
    ...recomendaciones.flatMap((r, i) => [
      [`recomendaciones[${i}].accion`, r.accion] as [string, string],
      [`recomendaciones[${i}].justificacion`, r.justificacion] as [string, string],
    ]),
  ];
  // La cara del productor pasa por las mismas prohibiciones y por dos más: ni
  // nutrientes ni acidez (la foto no los ve) y ni jerga técnica. En inglés o
  // alemán, las listas de ese idioma MÁS las del español.
  // Los nutrientes se suman (un nombre en español dentro de una lectura en inglés
  // tampoco pasa); la jerga NO: «spike» es palabra vetada en español por ser
  // extranjera, y «spikes» es el inglés llano de los picos.
  const nutrientes = patronDePalabras([...(lp?.prohibido_nombrar ?? []), ...(tx?.prohibido_nombrar ?? [])]);
  const jerga = patronDePalabras(tx?.palabras_tecnicas_prohibidas ?? lp?.palabras_tecnicas_prohibidas);
  // El porqué del análisis de laboratorio SÍ puede nombrar acidez y nutrientes:
  // es exactamente lo que el laboratorio mira y la foto no.
  const camposProductor: [string, string, string?][] = [
    ["productor.resumen", resumenProductor],
    ...conjeturas.flatMap((c, i) =>
      (["titulo", "lo_que_se_ve", "conjetura", "otra_posibilidad", "que_implica"] as const).map((k) => [`productor.conjeturas[${i}].${k}`, c[k]] as [string, string])
    ),
    ...acciones.concat(confirmar).filter((a) => !a.forzada).map((a, i) => [`productor.acciones[${i}].por_que`, a.por_que, a.practica] as [string, string, string]),
  ];
  for (const [campo, texto, practica] of camposProductor) {
    const hallados = claimsProhibidos(texto, idioma);
    if (hallados.length) errores.push(`${campo} contiene afirmaciones prohibidas (${hallados.join(", ")}).`);
    const n = nutrientes?.exec(texto);
    if (n && practica !== "analisis-laboratorio") errores.push(`${campo} nombra «${n[2]}»: la foto no ve nutrientes ni acidez.`);
    const t = jerga?.exec(texto);
    if (t) errores.push(`${campo} usa lenguaje técnico («${t[2]}»); háblale al productor en palabras del campo.`);
  }

  for (const [campo, texto] of campos) {
    const hallados = claimsProhibidos(texto, idioma);
    if (hallados.length) errores.push(`${campo} contiene afirmaciones prohibidas (${hallados.join(", ")}).`);
  }
  // 6b · El idioma pedido, campo por campo. Los títulos van con su conjetura.
  if (idioma !== "es") {
    const enEspanol = [
      ...campos,
      ...camposProductor.map(([campo, texto]) => [campo, texto] as [string, string]),
      ...(contraste ? ([["contraste_laboratorio", contraste]] as [string, string][]) : []),
    ].filter(([, texto]) => pareceEspanol(texto)).map(([campo]) => campo);
    if (enEspanol.length) errores.push(`Estos campos están en español y la lectura se pidió en ${idioma === "en" ? "inglés" : "alemán"}: ${enEspanol.slice(0, 6).join(", ")}. Escribe TODO el texto libre en ese idioma.`);
  }

  // 7 · Coherencia rasgos ↔ texto
  const ri = rasgos?.radiality_index;
  const todoElTexto = campos.map(([, t]) => t).join("\n");
  if (typeof ri === "number") {
    if (ri < COHERENCIA.radialidadBaja) {
      if (escala.canales.rango[1] >= 4) errores.push(`Con radiality_index ${ri.toFixed(2)} (< ${COHERENCIA.radialidadBaja}) el rango de canales no puede llegar a 4.`);
      if (contradiceBaja(todoElTexto)) errores.push(`Con radiality_index ${ri.toFixed(2)} el texto no puede hablar de canales o picos bien desarrollados.`);
    }
    if (ri > COHERENCIA.radialidadAlta) {
      if (escala.canales.rango[1] <= 2) errores.push(`Con radiality_index ${ri.toFixed(2)} (> ${COHERENCIA.radialidadAlta}) el rango de canales no puede quedarse en 2 o menos.`);
      // Frase por frase: «zona mineral parda; sin canales ni variación radial»
      // describe bien un croma radial (los canales viven en la zona externa),
      // aunque la zona se nombre en la frase ANTERIOR. Una negación está acotada
      // si nombra una zona interior, o si la frase anterior la nombra y la
      // negación no habla del croma entero ni de la zona externa. Todo lo demás
      // contradice la radialidad alta. El error cita la frase para que la
      // corrección del modelo sepa qué cambiar.
      const acotada = (frase: string, previa: string) =>
        !zonaExterior(frase) && (zonaInterior(frase) || (!hablaDelCroma(frase) && zonaInterior(previa)));
      const niega = campos
        .flatMap(([, texto]) => {
          const frases = texto.split(/[.;\n]/).map((f) => f.trim());
          return frases.map((frase, i) => ({ frase, previa: frases[i - 1] ?? "" }));
        })
        .find(({ frase, previa }) => contradiceAlta(frase) && !acotada(frase, previa));
      if (niega) {
        errores.push(`Con radiality_index ${ri.toFixed(2)} el texto no puede decir que la zona externa no tiene canales: «${niega.frase.slice(0, 120)}».`);
      }
    }
  }

  if (errores.length) return { ok: false, errores };

  const mayuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
  const regla = [entrada.expected_baseline, entrada.rule].filter(Boolean).map((t) => mayuscula(String(t))).join(". ");
  return {
    ok: true,
    reporte: {
      descripcion_visual: descripcion,
      escala_ford: escala,
      interpretaciones,
      contexto_regional_aplicado: contexto,
      contexto_regional_clave: regional.clave,
      contexto_regional_regla: regional.parcial ? `${regla}. ${PARCIAL[idioma]}` : regla,
      recomendaciones,
      contraste_laboratorio: contraste,
      productor: {
        senal,
        senal_texto: tx?.senales?.[senal] ?? lp?.senales?.[senal] ?? "",
        resumen: resumenProductor,
        conjeturas,
        acciones,
        confirmar,
        descargo: tx?.descargo_corto ?? lp?.descargo_corto ?? "",
      },
      limites: tx?.mandatory_disclaimer ?? reglas.mandatory_disclaimer_es,
      idioma,
      ajustes,
    },
  };
}

const PARCIAL: Record<Idioma, string> = {
  es: "El departamento solo está parcialmente en esta zona.",
  en: "The department is only partly within this zone.",
  de: "Das Departamento liegt nur teilweise in dieser Zone.",
};
