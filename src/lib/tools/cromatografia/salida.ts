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

import { fuentesPermitidas, normaliza, type FuentePermitida, type Nivel, type Rasgos, type Reglas, type ReglaRegional } from "./prompt";

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

export type Reporte = {
  descripcion_visual: string;
  escala_ford: Record<"canales" | "picos" | "intensidad", { rango: Rango; base: string }>;
  interpretaciones: Interpretacion[];
  contexto_regional_aplicado: string;
  contexto_regional_clave: string;
  contexto_regional_regla: string;
  recomendaciones: Recomendacion[];
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
    const nivel = str(it?.nivel).toUpperCase() as Nivel;
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
    const f = resolverFuente(str(it?.fuente), permitidas);
    if (!f) errores.push(`${pos}.fuente «${str(it?.fuente)}» no está en la lista de fuentes permitidas.`);
    else if (["A", "B", "C"].includes(nivel) && ORDEN[nivel] < ORDEN[f.mejorNivel]) {
      errores.push(`${pos}: la fuente «${f.fuente}» no alcanza el nivel ${nivel} en las reglas (máximo ${f.mejorNivel}).`);
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
      limites: reglas.mandatory_disclaimer_es,
      ajustes,
    },
  };
}
