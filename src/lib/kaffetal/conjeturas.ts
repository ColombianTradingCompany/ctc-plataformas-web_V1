// ── La lectura del lote y sus conjeturas (V5.167, owner 2026-10-06) ─────────────────────────────────────────────────────
// «En "Mejora y respaldo" deben añadirse conjeturas derivadas de las observaciones y características, utilizando algo
// similar a lo que fue logrado antes en la Rueda del Café.» Dos partes:
//   · LA LECTURA DE LA RUEDA: la misma redacción del reporte de la herramienta (`public/tools/catacion/rueda-del-cafe-v23.html`,
//     `buildReportNarrative`): la familia dominante, una frase por familia con sus notas positivas y la síntesis varietal.
//     Las frases están adaptadas sin rayas largas (la guía de diseño del documento).
//   · LAS CONJETURAS: reglas sobre lo medido y lo declarado (taza, humedad, aw, defectos, mallas, factor, densidad, altitud
//     y la variedad según el Mapa de Variedades). Cada una dice de qué evidencia sale y se redacta como lo que es: una
//     hipótesis para revisar, nunca un diagnóstico.
// PURO: lo usa `dossierDatos.ts` y lo prueba `qa-centro-calidad`.

import { RUEDA, normalizaRueda, idDeNota } from "@/lib/catacion/rueda";
import { fichaDeVariedad, rangoDeAltitud, type FichaDeVariedad } from "@/lib/catacion/variedades";
import { FACTOR_MAXIMO, HUMEDAD_MAX, HUMEDAD_MIN } from "@/lib/pvc/escala";
import type { DossierCifras, Lang } from "@/lib/kaffetal/dossierEvaluacion";

export type IconoConjetura = "taza" | "gota" | "insecto" | "grano" | "mallas" | "montana" | "balanza" | "variedad" | "alerta";
export type Conjetura = { area: "taza" | "fisico" | "origen"; icono: IconoConjetura; tono: "bien" | "atencion"; titulo: string; texto: string; evidencia: string };
export type LecturaDeLaRueda = { intro: string | null; parrafos: string[]; sintesis: string | null };

const unir = (xs: string[], lang: Lang) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} ${lang === "en" ? "and" : "y"} ${xs[xs.length - 1]}`);
const num = (v: number, d: number, lang: Lang) => v.toLocaleString(lang === "en" ? "en-GB" : "es-CO", { minimumFractionDigits: d, maximumFractionDigits: d });

/** Las frases por familia de la herramienta (FAMILY_PHRASES), sin rayas largas. */
const FRASES: Record<Lang, Record<string, (l: string) => string>> = {
  es: {
    floral: (l) => `En nariz se destacaron notas florales (${l}), que aportan delicadeza y perfume a la taza.`,
    frutal: (l) => `El perfil frutal fue protagonista, con notas de ${l}.`,
    acido: (l) => `La acidez se percibió limpia y viva, con notas de ${l}.`,
    verde: (l) => `Se notaron también matices vegetales (${l}), típicos de un desarrollo de tueste más corto.`,
    especias: (l) => `Aparecieron especias cálidas (${l}), que suman complejidad en el retrogusto.`,
    tostado: (l) => `El tueste dejó su huella con notas de ${l}.`,
    cacao: (l) => `El cuerpo se apoyó en notas de cacao y frutos secos: ${l}.`,
    dulce: (l) => `El dulzor fue notorio, con notas de ${l}.`,
  },
  en: {
    floral: (l) => `Floral notes stood out on the nose (${l}), adding delicacy and perfume to the cup.`,
    frutal: (l) => `The fruity profile took center stage, with notes of ${l}.`,
    acido: (l) => `The acidity came through clean and lively, with notes of ${l}.`,
    verde: (l) => `Some vegetal nuances were also noted (${l}), typical of a shorter roast development.`,
    especias: (l) => `Warm spices appeared (${l}), adding complexity to the aftertaste.`,
    tostado: (l) => `The roast left its mark with notes of ${l}.`,
    cacao: (l) => `The body leaned on cocoa and nutty notes: ${l}.`,
    dulce: (l) => `Sweetness was notable, with notes of ${l}.`,
  },
};

/** La lectura de la rueda, como el reporte de la herramienta: familia dominante, frases por familia, síntesis varietal. */
export function lecturaDeLaRueda(rueda: unknown, lang: Lang): LecturaDeLaRueda {
  const ids = normalizaRueda(rueda);
  if (!ids.length) return { intro: null, parrafos: [], sintesis: null };
  const porFamilia = new Map<string, { nombre: string; positivas: string[] }>();
  const conteo = new Map<string, number>();
  const variedades = new Set<string>();
  for (const f of RUEDA) {
    for (const s of f.subs) {
      for (const h of s.hojas) {
        if (!ids.includes(idDeNota(s.id, h.id))) continue;
        const nombre = lang === "en" ? f.en : f.es;
        conteo.set(nombre, (conteo.get(nombre) ?? 0) + 1);
        if (h.causa) continue;
        const g = porFamilia.get(f.id) ?? { nombre, positivas: [] };
        g.positivas.push((lang === "en" ? h.en : h.es).toLowerCase());
        porFamilia.set(f.id, g);
        const fuente = h.variedades ?? s.variedades;
        for (const v of fuente?.[lang] ?? []) if (!/^(No asociado|Cualquier varietal|Not associated|Any varietal)/i.test(v)) variedades.add(v);
      }
    }
  }
  const dominante = [...conteo.entries()].sort((a, b) => b[1] - a[1])[0];
  const n = ids.length;
  const intro =
    lang === "en"
      ? `The sample showed a profile dominated by the ${dominante[0]} family, with ${n} note${n === 1 ? "" : "s"} identified in total during the cupping.`
      : `La muestra presentó un perfil predominante en la familia ${dominante[0]}, con ${n} nota${n === 1 ? "" : "s"} identificada${n === 1 ? "" : "s"} en total durante la catación.`;
  const parrafos = RUEDA.flatMap((f) => {
    const g = porFamilia.get(f.id);
    const frase = FRASES[lang][f.id];
    return g && frase ? [frase(unir(g.positivas, lang))] : [];
  });
  const lista = [...variedades];
  const sintesis = lista.length
    ? lang === "en"
      ? `This profile is consistent with varietals such as ${unir(lista, lang)}, though the final result in the cup also depends on terroir, processing and roast level.`
      : `Este perfil es consistente con varietales como ${unir(lista, lang)}, aunque el resultado final en taza depende también del terruño, el proceso de beneficio y el punto de tueste.`
    : null;
  return { intro, parrafos, sintesis };
}

/** Lo que el defecto suele indicar en la finca o el beneficio (hipótesis de manejo). */
const CAUSA_DEL_DEFECTO: Record<string, Record<Lang, string>> = {
  insecto_grave: {
    es: "La broca suele indicar recolección tardía o repases incompletos; la recolección oportuna, el re-re y las trampas la reducen.",
    en: "Berry borer usually points to late picking or incomplete gleaning; timely harvest, gleaning and traps reduce it.",
  },
  insecto_leve: {
    es: "El daño leve por insecto también apunta a la broca en campo; conviene reforzar el manejo integrado.",
    en: "Slight insect damage also points to berry borer in the field; integrated management is worth reinforcing.",
  },
  negro: { es: "El grano negro suele venir de frutos sobremaduros o caídos que entran a la cosecha.", en: "Black beans usually come from overripe or fallen cherries entering the harvest." },
  agrio: { es: "El grano agrio suele asociarse a fermentación excesiva o a demoras entre la cosecha y el despulpado.", en: "Sour beans are usually linked to over-fermentation or delays between picking and pulping." },
  cereza: { es: "La cereza seca indica frutos que pasaron sin despulpar: conviene revisar la calibración de la despulpadora.", en: "Dried cherries point to fruit that went through unpulped: the pulper calibration is worth checking." },
  hongos: { es: "El daño por hongos suele venir de humedad alta durante el secado o el almacenamiento.", en: "Fungus damage usually comes from high moisture during drying or storage." },
  inmaduro: { es: "Los inmaduros indican cosecha de frutos verdes: la recolección selectiva de maduros los evita.", en: "Unripe beans point to green cherries being picked: selective picking of ripe fruit avoids them." },
  flotador: { es: "Los flotadores suelen ser granos vanos o mal llenados que el flotado no separó.", en: "Floaters are usually hollow or poorly filled beans that flotation did not remove." },
  partido: { es: "Los granos partidos o mordidos suelen venir de la despulpadora o de la trilla.", en: "Broken or chipped beans usually come from the pulper or the huller." },
};

export type EntradaConjeturas = {
  cifras: DossierCifras | null;
  altitud: number | null;
  variedades: string[];
};

/** Las conjeturas del lote: cada una con su evidencia. Primero lo que pide atención, después lo que va bien. */
export function conjeturasDelLote(e: EntradaConjeturas, lang: Lang): Conjetura[] {
  const es = lang === "es";
  const out: Conjetura[] = [];
  const c = e.cifras;
  const fichas = e.variedades.map((v) => ({ nombre: v, ficha: fichaDeVariedad(v) })).filter((x): x is { nombre: string; ficha: FichaDeVariedad } => !!x.ficha);

  // ── Taza ──
  // Solo los atributos descriptivos: uniformidad, taza limpia y dulzor valen 10 por diseño (2 puntos por taza sana).
  const descriptivos = c ? c.sca.filter((x) => !["uniformity", "clean_cup", "sweetness"].includes(x.k)) : [];
  if (c && descriptivos.length >= 4) {
    const orden = [...descriptivos].sort((a, b) => b.v - a.v);
    const alto = orden[0];
    const bajo = orden[orden.length - 1];
    if (alto.v - bajo.v >= 1) {
      out.push({
        area: "taza",
        icono: "taza",
        tono: "atencion",
        titulo: es ? `Donde hay margen en taza: ${bajo.label.toLowerCase()}` : `Where the cup has room: ${bajo.label.toLowerCase()}`,
        texto: es
          ? `${alto.label} fue lo más alto (${num(alto.v, 2, lang)}) y ${bajo.label.toLowerCase()} lo más bajo (${num(bajo.v, 2, lang)}). Subir ese atributo es el camino más corto a más puntos.`
          : `${alto.label} scored highest (${num(alto.v, 2, lang)}) and ${bajo.label.toLowerCase()} lowest (${num(bajo.v, 2, lang)}). Lifting that attribute is the shortest path to more points.`,
        evidencia: es ? "Planilla SCA 2004 del Q-Grader" : "Q-Grader's SCA 2004 sheet",
      });
    }
  }
  // Las notas de la rueda frente al perfil típico de la variedad (Mapa de Variedades).
  if (c && c.rueda.length && fichas.length) {
    const marcadas = c.rueda.filter((r) => !r.defecto).map((r) => r.nota.toLowerCase());
    for (const { ficha } of fichas.slice(0, 2)) {
      const tipicas = ficha.notas.map((x) => x[lang].toLowerCase());
      const comunes = marcadas.filter((m) => tipicas.some((t) => t.includes(m) || m.includes(t)));
      out.push({
        area: "taza",
        icono: "variedad",
        tono: "bien",
        titulo: comunes.length
          ? es ? `Notas típicas de ${ficha.nombre}` : `Notes typical of ${ficha.nombre}`
          : es ? `Un perfil distinto al típico de ${ficha.nombre}` : `A profile unlike typical ${ficha.nombre}`,
        texto: comunes.length
          ? es
            ? `El Q-Grader marcó ${unir(comunes, lang)}, que la variedad suele dar. El café expresa bien su genética.`
            : `The Q-Grader marked ${unir(comunes, lang)}, which the variety tends to give. The coffee expresses its genetics well.`
          : es
            ? `${ficha.nombre} suele dar ${unir(tipicas.slice(0, 3), lang)}; aquí aparecieron ${unir(marcadas.slice(0, 3), lang)}. El terruño o el beneficio pueden estar sumando un carácter propio que vale la pena conservar.`
            : `${ficha.nombre} tends to give ${unir(tipicas.slice(0, 3), lang)}; here the cup showed ${unir(marcadas.slice(0, 3), lang)}. Terroir or processing may be adding a character of its own worth keeping.`,
        evidencia: es ? "Rueda del sabor y Mapa de Variedades" : "Flavour wheel and Variety Map",
      });
    }
  }

  // ── Físico ──
  if (c?.humedadVerde != null) {
    const h = c.humedadVerde;
    out.push(
      h < HUMEDAD_MIN
        ? { area: "fisico", icono: "gota", tono: "atencion", titulo: es ? "Café sobresecado" : "Over-dried coffee", texto: es ? `Con ${num(h, 1, lang)} % de humedad, el grano puede volverse quebradizo y perder frescura: conviene acortar el secado.` : `At ${num(h, 1, lang)} % moisture the bean can turn brittle and lose freshness: drying is worth shortening.`, evidencia: es ? "Humedad del verde medida" : "Measured green moisture" }
        : h > HUMEDAD_MAX
          ? { area: "fisico", icono: "gota", tono: "atencion", titulo: es ? "Humedad por encima del rango" : "Moisture above range", texto: es ? `Con ${num(h, 1, lang)} % de humedad sube el riesgo de moho en bodega: conviene terminar el secado antes de almacenar.` : `At ${num(h, 1, lang)} % moisture the risk of mould in storage rises: drying should be finished before storing.`, evidencia: es ? "Humedad del verde medida" : "Measured green moisture" }
          : { area: "fisico", icono: "gota", tono: "bien", titulo: es ? "Secado en su punto" : "Drying on point", texto: es ? `${num(h, 1, lang)} % de humedad, dentro del rango de exportación (${HUMEDAD_MIN} a ${HUMEDAD_MAX} %): el secado se hizo bien.` : `${num(h, 1, lang)} % moisture, inside the export range (${HUMEDAD_MIN} to ${HUMEDAD_MAX} %): drying was done well.`, evidencia: es ? "Humedad del verde medida" : "Measured green moisture" }
    );
  }
  if (c?.aw != null) {
    const aw = c.aw;
    if (aw > 0.7) out.push({ area: "fisico", icono: "gota", tono: "atencion", titulo: es ? "Actividad de agua alta" : "High water activity", texto: es ? `Una aw de ${num(aw, 3, lang)} favorece hongos en almacenamiento; un secado más parejo la baja.` : `An aw of ${num(aw, 3, lang)} favours mould in storage; more even drying lowers it.`, evidencia: es ? "Actividad de agua medida" : "Measured water activity" });
    else if (aw > 0.6) out.push({ area: "fisico", icono: "gota", tono: "atencion", titulo: es ? "Actividad de agua en el límite alto" : "Water activity at the upper limit", texto: es ? `Con aw ${num(aw, 3, lang)} el café es estable, pero conviene vigilar la bodega (humedad y ventilación).` : `At aw ${num(aw, 3, lang)} the coffee is stable, but storage conditions (humidity and ventilation) are worth watching.`, evidencia: es ? "Actividad de agua medida" : "Measured water activity" });
    else out.push({ area: "fisico", icono: "gota", tono: "bien", titulo: es ? "Grano estable" : "Stable bean", texto: es ? `Una aw de ${num(aw, 3, lang)} indica un grano estable para viajar y almacenarse.` : `An aw of ${num(aw, 3, lang)} points to a bean that is stable to ship and store.`, evidencia: es ? "Actividad de agua medida" : "Measured water activity" });
  }
  // El defecto que más pesa, con su causa probable.
  if (c?.defectos.length) {
    const principal = [...c.defectos].sort((a, b) => b.completos - a.completos || b.granos - a.granos)[0];
    const causa = CAUSA_DEL_DEFECTO[principal.key];
    out.push({
      area: "fisico",
      icono: principal.key.startsWith("insecto") ? "insecto" : "grano",
      tono: "atencion",
      titulo: es ? `El defecto que más pesa: ${principal.defecto.toLowerCase()}` : `The heaviest defect: ${principal.defecto.toLowerCase()}`,
      texto: causa ? causa[lang] : es ? "Los defectos secundarios suelen bajar con una mejor selección y clasificación del grano." : "Secondary defects usually drop with better bean selection and sorting.",
      evidencia: es ? `${principal.granos} granos en la muestra (${principal.completos} defectos completos)` : `${principal.granos} beans in the sample (${principal.completos} full defects)`,
    });
  }
  if (c?.defectuosaPct != null && c.defectuosaPct > 5) {
    out.push({ area: "fisico", icono: "grano", tono: "atencion", titulo: es ? "Mucha almendra defectuosa" : "High share of defective beans", texto: es ? `El ${num(c.defectuosaPct, 1, lang)} % del verde salió defectuoso: una selección más estricta en el beneficio sube el factor y la taza.` : `${num(c.defectuosaPct, 1, lang)} % of the green came out defective: stricter sorting at the mill improves both yield factor and cup.`, evidencia: es ? "Defectos primarios y secundarios pesados" : "Weighed primary and secondary defects" });
  }
  if (c?.mallas.length) {
    const supremo = c.mallas.filter((m) => m.key === "mesh_supremo_plus" || m.key === "mesh_supremo").reduce((s, m) => s + m.pct, 0);
    out.push(
      supremo >= 50
        ? { area: "fisico", icono: "mallas", tono: "bien", titulo: es ? "Grano grande" : "Large bean", texto: es ? `El ${num(supremo, 1, lang)} % del verde quedó en malla 17 o más (Supremo): un tamaño que el mercado valora.` : `${num(supremo, 1, lang)} % of the green stayed on screen 17 or above (Supremo): a size the market values.`, evidencia: es ? "Granulometría medida" : "Measured screen size" }
        : { area: "fisico", icono: "mallas", tono: "atencion", titulo: es ? "Grano de tamaño medio" : "Medium-sized bean", texto: es ? `Solo el ${num(supremo, 1, lang)} % quedó en malla 17 o más: la nutrición del cafetal y la cosecha de frutos bien llenos suben el tamaño.` : `Only ${num(supremo, 1, lang)} % stayed on screen 17 or above: plant nutrition and harvesting well-filled cherries raise bean size.`, evidencia: es ? "Granulometría medida" : "Measured screen size" }
    );
  }
  if (c?.factor != null) {
    const f = c.factor;
    out.push(
      f > FACTOR_MAXIMO
        ? { area: "fisico", icono: "balanza", tono: "atencion", titulo: es ? "Factor por encima del máximo" : "Yield factor above the maximum", texto: es ? `Un factor de ${num(f, 2, lang)} supera el máximo de ${FACTOR_MAXIMO}: se necesita más pergamino por cada 70 kg de verde sano. Menos defectos y menos merma lo bajan.` : `A factor of ${num(f, 2, lang)} exceeds the maximum of ${FACTOR_MAXIMO}: more parchment is needed per 70 kg of sound green. Fewer defects and less loss bring it down.`, evidencia: es ? "Pesos de la muestra" : "Sample weights" }
        : { area: "fisico", icono: "balanza", tono: "bien", titulo: es ? "Buen rendimiento en trilla" : "Good hulling yield", texto: es ? `Un factor de ${num(f, 2, lang)}, por debajo del máximo de ${FACTOR_MAXIMO}: el pergamino rinde bien en verde sano.` : `A factor of ${num(f, 2, lang)}, below the maximum of ${FACTOR_MAXIMO}: the parchment yields well in sound green.`, evidencia: es ? "Pesos de la muestra" : "Sample weights" }
    );
  }

  // ── Origen ──
  if (e.altitud != null) {
    for (const { ficha } of fichas.slice(0, 2)) {
      const r = rangoDeAltitud(ficha);
      if (!r) continue;
      const dentro = e.altitud >= r[0] && e.altitud <= r[1];
      out.push({
        area: "origen",
        icono: "montana",
        tono: dentro ? "bien" : "atencion",
        titulo: dentro ? (es ? `Altura adecuada para ${ficha.nombre}` : `Suitable altitude for ${ficha.nombre}`) : es ? `Altura fuera de la franja de ${ficha.nombre}` : `Altitude outside ${ficha.nombre}'s band`,
        texto: dentro
          ? es
            ? `La finca está a ${e.altitud.toLocaleString("es-CO")} m, dentro de la franja en que la variedad se da (${r[0].toLocaleString("es-CO")} a ${r[1].toLocaleString("es-CO")} m).`
            : `The farm sits at ${e.altitud.toLocaleString("en-GB")} m, inside the band where the variety thrives (${r[0].toLocaleString("en-GB")} to ${r[1].toLocaleString("en-GB")} m).`
          : es
            ? `La variedad suele darse entre ${r[0].toLocaleString("es-CO")} y ${r[1].toLocaleString("es-CO")} m y la finca está a ${e.altitud.toLocaleString("es-CO")} m: la maduración cambia y el perfil puede alejarse del típico.`
            : `The variety usually grows between ${r[0].toLocaleString("en-GB")} and ${r[1].toLocaleString("en-GB")} m and the farm sits at ${e.altitud.toLocaleString("en-GB")} m: ripening changes and the profile may drift from the typical one.`,
        evidencia: es ? "Altitud de la finca y Mapa de Variedades" : "Farm altitude and Variety Map",
      });
    }
  }
  if (c?.densidad != null && e.altitud != null) {
    const d = c.densidad;
    if (d >= 750 && e.altitud < 1400)
      out.push({ area: "origen", icono: "montana", tono: "bien", titulo: es ? "Grano denso para su altura" : "Dense bean for its altitude", texto: es ? `${d.toLocaleString("es-CO")} g/L a ${e.altitud.toLocaleString("es-CO")} m: el grano llenó bien pese a una altura moderada, buena señal del manejo del cafetal.` : `${d.toLocaleString("en-GB")} g/L at ${e.altitud.toLocaleString("en-GB")} m: the bean filled well despite moderate altitude, a good sign of plot management.`, evidencia: es ? "Densidad medida y altitud de la finca" : "Measured density and farm altitude" });
    else if (d < 650)
      out.push({ area: "origen", icono: "montana", tono: "atencion", titulo: es ? "Grano liviano" : "Light bean", texto: es ? `Con ${d.toLocaleString("es-CO")} g/L el grano es liviano: la madurez de cosecha y el secado son lo primero a revisar.` : `At ${d.toLocaleString("en-GB")} g/L the bean is light: harvest ripeness and drying are the first things to check.`, evidencia: es ? "Densidad medida" : "Measured density" });
  }
  // Primero lo que pide atención.
  return [...out.filter((x) => x.tono === "atencion"), ...out.filter((x) => x.tono === "bien")];
}
