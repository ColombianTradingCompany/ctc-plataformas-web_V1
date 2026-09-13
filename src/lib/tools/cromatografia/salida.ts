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

import { fuentesPermitidas, normaliza, type FuentePermitida, type Nivel, type PracticaDeManejo, type Rasgos, type Reglas, type ReglaRegional } from "./prompt";

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
export function zonaDesdeTexto(texto: string): ZonaFoto {
  let mejor: ZonaFoto = "general";
  let posicion = Infinity;
  for (const [zona, re] of PATRONES_ZONA) {
    const m = re.exec(texto ?? "");
    if (m && m.index < posicion) {
      posicion = m.index;
      mejor = zona;
    }
  }
  return mejor;
}

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
  productor: InformeProductor;
  /** `mandatory_disclaimer_es`, íntegro, puesto por el servidor. */
  limites: string;
  ajustes: string[];
};

export type ResultadoValidacion = { ok: true; reporte: Reporte } | { ok: false; errores: string[] };

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

export function claimsProhibidos(texto: string): string[] {
  return PATRONES_PROHIBIDOS.filter((p) => p.re.test(texto)).map((p) => p.nombre);
}

/** La duda dicha en palabras del campo, para la cara del productor. */
export const DUDA_SENCILLA = /parece|puede que|puede|podr[ií]a|se ve|posiblemente|según la foto|al parecer|señal/i;

const escaparRegex = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** Una lista de palabras como patrón que las busca al principio de palabra. */
export function patronDePalabras(lista: string[] | undefined): RegExp | null {
  const limpias = (lista ?? []).map((p) => p.trim()).filter(Boolean);
  return limpias.length ? new RegExp(`(^|[^\\p{L}])(${limpias.map(escaparRegex).join("|")})`, "iu") : null;
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
export function validarSalida(bruto: unknown, reglas: Reglas, rasgos: Rasgos, regional: ReglaRegional): ResultadoValidacion {
  const errores: string[] = [];
  const ajustes: string[] = [];
  if (!bruto || typeof bruto !== "object" || Array.isArray(bruto)) {
    return { ok: false, errores: ["La respuesta no es un objeto JSON con el esquema pedido."] };
  }
  const x = bruto as Record<string, unknown>;

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
    else if (!LENGUAJE_PROBABILISTICO.test(lectura)) errores.push(`${pos}.lectura es categórica; usa lenguaje probabilístico según su nivel.`);
    // Sobrepresentar la evidencia es el error que importa: un manual de práctica
    // (nivel C) no puede sonar a institución ni a estudio revisado por pares.
    if (nivel === "C" && /institucional|revisad[oa]s?\s+por\s+pares|estudios\s+con\s+n\s*=/i.test(lectura)) {
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
      etiqueta_nivel: ETIQUETA_NIVEL[nivel] ?? "",
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
  else if (!DUDA_SENCILLA.test(resumenProductor)) errores.push("productor.resumen es categórico: usa parece, puede que o se ve.");
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
    if (str(c?.conjetura) && !DUDA_SENCILLA.test(str(c?.conjetura))) errores.push(`${pos}.conjetura es categórica: usa puede que, podría o parece.`);
    const ids = basado(c?.basado_en, pos);
    const certeza = certezaDe(ids, interpretaciones);
    const zonaBruta = str(c?.zona).toLowerCase() as ZonaFoto;
    const zona = ZONAS_FOTO.includes(zonaBruta) ? zonaBruta : zonaDesdeTexto(`${str(c?.titulo)} ${str(c?.lo_que_se_ve)}`);
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
      certeza_texto: lp?.certezas?.[certeza] ?? "",
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
    const accion: AccionProductor = {
      id: "", practica: practica.id, titulo: practica.titulo, por_que: str(a?.por_que), como: practica.como,
      cuidado: practica.cuidado ?? "", fuentes: practica.fuentes, nivel: practica.nivel,
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
    confirmar.push({ id: "", practica: p.id, titulo: p.titulo, por_que: p.para_que, como: p.como, cuidado: p.cuidado ?? "", fuentes: p.fuentes, nivel: p.nivel, prioridad: "media", basado_en: [], forzada: true });
  }
  acciones.forEach((a, i) => (a.id = `a${i + 1}`));
  confirmar.forEach((a, i) => (a.id = `k${i + 1}`));

  // 5 · Contexto regional: si no hay región, lo escribe el servidor.
  let contexto = str(x.contexto_regional_aplicado);
  const entrada = regional.entrada as { rule?: string; expected_baseline?: string };
  if (regional.clave === "unknown_region") {
    contexto = `No se aplicó línea base regional: ${reglas.regional_context_rules.unknown_region.rule}.`;
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
  // nutrientes ni acidez (la foto no los ve) y ni jerga técnica.
  const nutrientes = patronDePalabras(lp?.prohibido_nombrar);
  const jerga = patronDePalabras(lp?.palabras_tecnicas_prohibidas);
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
    const hallados = claimsProhibidos(texto);
    if (hallados.length) errores.push(`${campo} contiene afirmaciones prohibidas (${hallados.join(", ")}).`);
    const n = nutrientes?.exec(texto);
    if (n && practica !== "analisis-laboratorio") errores.push(`${campo} nombra «${n[2]}»: la foto no ve nutrientes ni acidez.`);
    const t = jerga?.exec(texto);
    if (t) errores.push(`${campo} usa lenguaje técnico («${t[2]}»); háblale al productor en palabras del campo.`);
  }

  for (const [campo, texto] of campos) {
    const hallados = claimsProhibidos(texto);
    if (hallados.length) errores.push(`${campo} contiene afirmaciones prohibidas (${hallados.join(", ")}).`);
  }

  // 7 · Coherencia rasgos ↔ texto
  const ri = rasgos?.radiality_index;
  const todoElTexto = campos.map(([, t]) => t).join("\n");
  if (typeof ri === "number") {
    if (ri < COHERENCIA.radialidadBaja) {
      if (escala.canales.rango[1] >= 4) errores.push(`Con radiality_index ${ri.toFixed(2)} (< ${COHERENCIA.radialidadBaja}) el rango de canales no puede llegar a 4.`);
      if (CONTRADICE_RADIALIDAD_BAJA.test(todoElTexto)) errores.push(`Con radiality_index ${ri.toFixed(2)} el texto no puede hablar de canales o picos bien desarrollados.`);
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
        !ZONA_EXTERIOR.test(frase) && (ZONA_INTERIOR.test(frase) || (!/\bcroma/i.test(frase) && ZONA_INTERIOR.test(previa)));
      const niega = campos
        .flatMap(([, texto]) => {
          const frases = texto.split(/[.;\n]/).map((f) => f.trim());
          return frases.map((frase, i) => ({ frase, previa: frases[i - 1] ?? "" }));
        })
        .find(({ frase, previa }) => CONTRADICE_RADIALIDAD_ALTA.test(frase) && !acotada(frase, previa));
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
      contexto_regional_regla: regional.parcial ? `${regla}. El departamento solo está parcialmente en esta zona.` : regla,
      recomendaciones,
      productor: {
        senal,
        senal_texto: lp?.senales?.[senal] ?? "",
        resumen: resumenProductor,
        conjeturas,
        acciones,
        confirmar,
        descargo: lp?.descargo_corto ?? "",
      },
      limites: reglas.mandatory_disclaimer_es,
      ajustes,
    },
  };
}
