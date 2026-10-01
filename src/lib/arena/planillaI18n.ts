// ── La planilla de evaluación en dos idiomas (V5.130, owner 2026-10-01) — PURO ───────────────────────────────────────
// «Haz que la planilla tenga un toggle para hacerlo en inglés o español.» El Q-Grader del Centro de Calidad puede no leer
// español; la planilla (B2 · Perfil de Taza, la rueda, B3 · Caracterización Física) se pinta en el idioma que elija.
// SOLO cambian los rótulos: los datos (`LabEvaluation`) son los mismos, y la rueda ya guardaba ids con dos etiquetas
// (`src/lib/catacion/rueda.ts`). No importa nada: la leen `labEvaluation.ts`, `homologacion.ts` y las pantallas.

export type IdiomaDePlanilla = "es" | "en";
export const IDIOMAS_DE_PLANILLA: readonly IdiomaDePlanilla[] = ["es", "en"];

/** Los diez atributos del formulario SCA 2004 (las claves de `SCA_ATTRS`). */
export const SCA_ATTR_LABEL: Record<IdiomaDePlanilla, Record<string, string>> = {
  es: {
    fragrance: "Fragancia / Aroma", flavor: "Sabor", aftertaste: "Sabor residual", acidity: "Acidez", body: "Cuerpo",
    balance: "Balance", uniformity: "Uniformidad", clean_cup: "Taza limpia", sweetness: "Dulzor", cuppers: "Puntaje del catador",
  },
  en: {
    fragrance: "Fragrance / Aroma", flavor: "Flavor", aftertaste: "Aftertaste", acidity: "Acidity", body: "Body",
    balance: "Balance", uniformity: "Uniformity", clean_cup: "Clean Cup", sweetness: "Sweetness", cuppers: "Cupper's Score",
  },
};

/** Las ocho secciones afectivas del CVA (las claves de `CVA_SECCIONES`). */
export const CVA_SECCION_LABEL: Record<IdiomaDePlanilla, Record<string, string>> = {
  es: {
    fragrance: "Fragancia (café molido, en seco)", aroma: "Aroma (en la bebida)", flavor: "Sabor", aftertaste: "Sabor residual",
    acidity: "Acidez", sweetness: "Dulzor", mouthfeel: "Sensación en boca", overall: "Impresión general",
  },
  en: {
    fragrance: "Fragrance (dry grounds)", aroma: "Aroma (in the brew)", flavor: "Flavor", aftertaste: "Aftertaste",
    acidity: "Acidity", sweetness: "Sweetness", mouthfeel: "Mouthfeel", overall: "Overall impression",
  },
};

export const CVA_DEFECTO_LABEL: Record<IdiomaDePlanilla, Record<string, string>> = {
  es: { moho: "Moho / humedad", fenol: "Fenólico / químico", papa: "Papa", otro: "Otro (anotar en notas)" },
  en: { moho: "Mold / musty", fenol: "Phenolic / chemical", papa: "Potato", otro: "Other (write it in the notes)" },
};

export const VISTA_LABEL_I18N: Record<IdiomaDePlanilla, Record<string, string>> = {
  es: { sca: "SCA 2004", cva: "CVA (SCA-104)", ambas: "Ambas · banco comparativo" },
  en: { sca: "SCA 2004", cva: "CVA (SCA-104)", ambas: "Both · comparative bank" },
};

/** Las mallas (las claves de `MESH`). */
export const MALLA_LABEL: Record<IdiomaDePlanilla, Record<string, string>> = {
  es: {
    mesh_supremo_plus: "Supremo + (M18)", mesh_supremo: "Supremo (M17)", mesh_extra: "Extra (M16)", mesh_europa: "Europa (M15)",
    mesh_ugq: "UGQ (M14)", mesh_peaberry: "Pea Berry (M13–12)", mesh_residue: "Residuo",
  },
  en: {
    mesh_supremo_plus: "Supremo + (screen 18)", mesh_supremo: "Supremo (screen 17)", mesh_extra: "Extra (screen 16)", mesh_europa: "Europa (screen 15)",
    mesh_ugq: "UGQ (screen 14)", mesh_peaberry: "Peaberry (screens 13–12)", mesh_residue: "Residue",
  },
};

/** Las franjas de `scaClassFor` (que devuelve el rótulo en español). */
export const CLASE_LABEL: Record<IdiomaDePlanilla, Record<string, string>> = {
  es: { "Sin puntaje": "Sin puntaje", Comercial: "Comercial", Especial: "Especial", Especialidad: "Especialidad", "Alta Especialidad": "Alta Especialidad", Rareza: "Rareza" },
  en: { "Sin puntaje": "No score", Comercial: "Commercial", Especial: "Special", Especialidad: "Specialty", "Alta Especialidad": "High Specialty", Rareza: "Rarity" },
};

/** El estado de la granulometría (`computeMesh().state`). */
export const ESTADO_DE_MALLAS: Record<IdiomaDePlanilla, Record<string, string>> = {
  es: {
    sin_base: "Ingrese el trillado verde y los defectos: el grano sano es la base de las mallas.",
    vacio: "Pese cada malla; el residuo se calcula solo.",
    excede: "Las mallas pesan MÁS que el grano sano: revise la balanza.",
    residuo_alto: "El residuo pasa del 15 %: ¿faltan mallas por pesar?",
    ok: "Mallas completas.",
  },
  en: {
    sin_base: "Enter the green weight after hulling and the defects: sound beans are the base for the screens.",
    vacio: "Weigh each screen; the residue is calculated.",
    excede: "The screens weigh MORE than the sound beans: check the scale.",
    residuo_alto: "The residue is above 15%: are there screens left to weigh?",
    ok: "Screens complete.",
  },
};

const ES = {
  idioma: "Idioma",
  b2: "B2 · Perfil de Taza",
  hintVista:
    "El SCA 2004 nativo es el protocolo primario: rige el Punto y calibra la escala de grados. Un CVA solo se homologa con un intervalo (por lo general baja) y rige su piso; nunca da Tyrian. Con «Ambas», el SCA rige y el CVA queda registrado para el banco comparativo.",
  scaTitulo: "SCA 2004 · Perfil de taza",
  scaHint: (min: string, max: string, paso: number, porTaza: number, taint: number, fault: number) =>
    `Diez atributos: los escalados de ${min} a ${max} en pasos de ${paso}; Uniformidad, Taza limpia y Dulzor a ${porTaza} puntos por taza. Defectos: tazas con taint (×${taint}) y con fault (×${fault}). Sin los diez, no hay Punto.`,
  atributoSca: "Atributo SCA",
  puntos: "Puntos",
  tazasTaint: (n: number) => `Tazas con taint (×${n})`,
  tazasFault: (n: number) => `Tazas con fault (×${n})`,
  totalSca: "Total SCA 2004",
  incompleto: "Incompleto",
  defectosMenos: (n: number) => `defectos −${n}`,
  cvaTitulo: "CVA · Evaluación afectiva (SCA-104)",
  cvaHint: (min: number, max: number, coef: number, base: number, u: number, d: number, paso: number, proposito: string) =>
    `Ocho secciones, cada una con un entero de ${min} a ${max}. Puntaje = ${coef} × Σ + ${base} − ${u}·u − ${d}·d, redondeado al ${paso} (la Impresión general cuenta una vez). Propósito de la casa: «${proposito}».`,
  seccionCva: "Sección CVA",
  tazasHint: (n: number, resta: number) => `Las ${n} tazas: una taza defectuosa es también no uniforme (resta ${resta}); el defecto cuenta solo con su tipo.`,
  taza: "Taza",
  noUniforme: "no uniforme",
  defectuosa: "defectuosa",
  tipo: "tipo…",
  puntajeCva: "Puntaje CVA",
  puntoQueRige: "Punto que rige",
  gradoFirme: "grado firme",
  hastaConRecata: (g: string) => `(hasta ${g} con recata SCA)`,
  pendienteRecata: "el intervalo cruza los 80: pendiente de recata SCA nativa",
  sinGrado: "por debajo de 80: sin grado",
  sinPunto: "Sin Punto todavía",
  radar: "Radar de taza",
  radarEscalaSca: "Escala 6–10 por atributo",
  radarEscalaCva: "Escala 1–9 por sección",
  ruedaTitulo: "Rueda de sabores",
  ruedaHint: "Toque en la rueda los descriptores que percibe (taxonomía SCA / WCR).",
  elegidos: (n: number) => (n === 1 ? "1 elegido" : `${n} elegidos`),
  ninguno: "Ninguno todavía",
  quitar: "Quitar",
  perfil: "Perfil de taza (notas descriptivas)",
  perfilPh: "En fragancia y aroma se perciben notas a…",
  b3: "B3 · Caracterización Física — Granulometría & Factor",
  apoyo: "Herramientas de apoyo (se abren aparte):",
  defectosTool: "Defectos del Café ↗",
  variedadesTool: "Coffee Varieties Map ↗",
  pergamino: "Muestra pergamino inicial (g)",
  trillado: "Trillado verde restante (g)",
  humedad: "Humedad pergamino (%)",
  defPrimario: "Defecto primario (g)",
  defSecundario: "Defecto secundario (g)",
  merma: "Merma de trilla (g)",
  granoSano: "Grano sano (g)",
  derivado: "derivado",
  factor: "Factor de rendimiento",
  factorFormula: "= 70 × pergamino ÷ grano sano · referencia ≤ 94",
  granulometria: "Granulometría",
  peso: "Peso (g)",
  totalMallas: "Total mallas",
  notasAnalisis: "Notas de análisis",
  notasAnalisisPh: "Observaciones del análisis físico, condiciones de la muestra…",
  // ── los errores de la aritmética (`labEvaluation.ts`) ──
  errTazaSinTipo: "Cada taza defectuosa lleva el tipo de defecto (moho, fenol, papa…).",
  errCvaEntero: (label: string, min: number, max: number, raw: string) => `«${label}»: un entero de ${min} a ${max} (recibió ${raw}).`,
  errCvaIncompleto: (faltan: number, de: number, lista: string) => `CVA incompleto: faltan ${faltan} de ${de} secciones (${lista}).`,
  errNoNumero: (label: string, raw: string) => `«${label}»: no es un número (${raw}).`,
  errPorTaza: (label: string, porTaza: number, raw: string) => `«${label}»: ${porTaza} puntos por taza (0 · 2 · 4 · 6 · 8 · 10); recibió ${raw}.`,
  errEscalado: (label: string, min: string, max: string, paso: number, raw: string) => `«${label}»: de ${min} a ${max} en pasos de ${paso}; recibió ${raw}.`,
  errTazas: (nombre: string, max: number) => `«${nombre}»: tazas de 0 a ${max}.`,
  nombreTaint: "Tazas con taint",
  nombreFault: "Tazas con fault",
  errScaIncompleto: (faltan: number, de: number, lista: string) => `SCA 2004 incompleto: faltan ${faltan} de ${de} atributos (${lista}).`,
  completeSca: (n: number) => `Complete los ${n} atributos del SCA 2004.`,
  completeCva: (n: number) => `Complete las ${n} secciones del CVA.`,
  errAmbas: "Con «Ambas», el SCA 2004 (rige) y el CVA (banco comparativo) tienen que estar completos.",
  // ── el rótulo del Punto (`homologacion.ts`) ──
  puntoNativo: (valor: string) => `SCA 2004 nativo ${valor}`,
  puntoCvaRegistrado: (cva: string) => ` · CVA ${cva} registrado (banco comparativo)`,
  puntoHomologado: (cva: string, bajo: string, alto: string, modelo: string) => `Punto homologado desde CVA ${cva}: ${bajo}–${alto} (rige el piso ${bajo}; ${modelo}, sin calibrar; no catado en SCA)`,
};

const EN: typeof ES = {
  idioma: "Language",
  b2: "B2 · Cup Profile",
  hintVista:
    "The native SCA 2004 form is the primary protocol: it sets the Point and calibrates the grade scale. A CVA is only homologated, with an interval (it usually comes out lower), and its floor governs; it never awards Tyrian. With “Both”, the SCA governs and the CVA is recorded for the comparative bank.",
  scaTitulo: "SCA 2004 · Cup profile",
  scaHint: (min, max, paso, porTaza, taint, fault) =>
    `Ten attributes: the scaled ones from ${min} to ${max} in steps of ${paso}; Uniformity, Clean Cup and Sweetness at ${porTaza} points per cup. Defects: cups with a taint (×${taint}) and with a fault (×${fault}). Without all ten there is no Point.`,
  atributoSca: "SCA attribute",
  puntos: "Points",
  tazasTaint: (n) => `Cups with a taint (×${n})`,
  tazasFault: (n) => `Cups with a fault (×${n})`,
  totalSca: "SCA 2004 total",
  incompleto: "Incomplete",
  defectosMenos: (n) => `defects −${n}`,
  cvaTitulo: "CVA · Affective assessment (SCA-104)",
  cvaHint: (min, max, coef, base, u, d, paso, proposito) =>
    `Eight sections, each scored with a whole number from ${min} to ${max}. Score = ${coef} × Σ + ${base} − ${u}·u − ${d}·d, rounded to ${paso} (the Overall impression counts once). House purpose: “${proposito}”.`,
  seccionCva: "CVA section",
  tazasHint: (n, resta) => `The ${n} cups: a defective cup is also non-uniform (it subtracts ${resta}); a defect only counts with its type.`,
  taza: "Cup",
  noUniforme: "non-uniform",
  defectuosa: "defective",
  tipo: "type…",
  puntajeCva: "CVA score",
  puntoQueRige: "Governing Point",
  gradoFirme: "firm grade",
  hastaConRecata: (g) => `(up to ${g} with an SCA re-cupping)`,
  pendienteRecata: "the interval crosses 80: pending a native SCA re-cupping",
  sinGrado: "below 80: no grade",
  sinPunto: "No Point yet",
  radar: "Cup radar",
  radarEscalaSca: "Scale 6–10 per attribute",
  radarEscalaCva: "Scale 1–9 per section",
  ruedaTitulo: "Flavor wheel",
  ruedaHint: "Tap on the wheel the descriptors you perceive (SCA / WCR taxonomy).",
  elegidos: (n) => `${n} selected`,
  ninguno: "None yet",
  quitar: "Remove",
  perfil: "Cup profile (descriptive notes)",
  perfilPh: "Fragrance and aroma show notes of…",
  b3: "B3 · Physical Characterization — Screen Size & Yield Factor",
  apoyo: "Support tools (they open separately):",
  defectosTool: "Coffee Defects ↗",
  variedadesTool: "Coffee Varieties Map ↗",
  pergamino: "Initial parchment sample (g)",
  trillado: "Green after hulling (g)",
  humedad: "Parchment moisture (%)",
  defPrimario: "Primary defects (g)",
  defSecundario: "Secondary defects (g)",
  merma: "Hulling loss (g)",
  granoSano: "Sound beans (g)",
  derivado: "derived",
  factor: "Yield factor",
  factorFormula: "= 70 × parchment ÷ sound beans · reference ≤ 94",
  granulometria: "Screen size",
  peso: "Weight (g)",
  totalMallas: "Total screens",
  notasAnalisis: "Analysis notes",
  notasAnalisisPh: "Remarks on the physical analysis, condition of the sample…",
  errTazaSinTipo: "Every defective cup needs its defect type (mold, phenolic, potato…).",
  errCvaEntero: (label, min, max, raw) => `“${label}”: a whole number from ${min} to ${max} (got ${raw}).`,
  errCvaIncompleto: (faltan, de, lista) => `CVA incomplete: ${faltan} of ${de} sections missing (${lista}).`,
  errNoNumero: (label, raw) => `“${label}”: not a number (${raw}).`,
  errPorTaza: (label, porTaza, raw) => `“${label}”: ${porTaza} points per cup (0 · 2 · 4 · 6 · 8 · 10); got ${raw}.`,
  errEscalado: (label, min, max, paso, raw) => `“${label}”: from ${min} to ${max} in steps of ${paso}; got ${raw}.`,
  errTazas: (nombre, max) => `“${nombre}”: cups from 0 to ${max}.`,
  nombreTaint: "Cups with a taint",
  nombreFault: "Cups with a fault",
  errScaIncompleto: (faltan, de, lista) => `SCA 2004 incomplete: ${faltan} of ${de} attributes missing (${lista}).`,
  completeSca: (n) => `Fill in the ${n} attributes of the SCA 2004 form.`,
  completeCva: (n) => `Fill in the ${n} sections of the CVA.`,
  errAmbas: "With “Both”, the SCA 2004 (governs) and the CVA (comparative bank) must both be complete.",
  puntoNativo: (valor) => `Native SCA 2004 ${valor}`,
  puntoCvaRegistrado: (cva) => ` · CVA ${cva} recorded (comparative bank)`,
  puntoHomologado: (cva, bajo, alto, modelo) => `Point homologated from CVA ${cva}: ${bajo}–${alto} (the floor ${bajo} governs; ${modelo}, uncalibrated; not cupped in SCA)`,
};

/** Los textos de la planilla, por idioma. `PL.es` es el original; `PL.en` tiene las MISMAS claves (lo exige el tipo). */
export const PL: Record<IdiomaDePlanilla, typeof ES> = { es: ES, en: EN };
