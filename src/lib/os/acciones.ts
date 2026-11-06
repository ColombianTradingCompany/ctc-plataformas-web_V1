import { DOMINIOS, type Dominio } from "@/lib/integraciones/dominios";
import { PIEZAS_DE_ACCIONES, esSinIntegracionNotion, type LecturaDeNotion, type Medida, type NotaDeMedida, type PiezaId } from "./fuentes";
import { resumenDelHud, sumarMedidas, type Aviso, type Tablero } from "./tablero";
import { textosDelOs } from "./textos/idioma";

// ── CTCx OS · el módulo Acciones (F3, F-23 de la consolidación) · PURO ───────
// Lo pendiente de hoy en un solo sitio: las tareas que CALCULA la plataforma (las del Tablero de
// Ejecución, ya contadas por hub en el tablero de F2: las mismas cifras que la Hacienda) y las Tareas
// de Notion (la única fuente de tareas de la casa, D-003), por su Área. Se unen EN LA VISTA, nunca en
// los datos: cada cifra conserva su pieza y su fuente, y ninguna suma mezcla las dos.
//
// Las Tareas de Notion llegan con la integración de solo lectura del OS (E-4, decisión CON-28, que se
// crea en la sesión del owner). Hasta entonces su lector devuelve `SIN_INTEGRACION_NOTION` y aquí sus
// cifras salen en «Sin datos» con la nota `sin_integracion_notion`: nunca un cero, y sin aviso (no es
// una lectura que falló). Con la integración leída, un hub sin tareas en Notion es un cero de verdad.
//
// Edificio: el hub 8 · Ejecución (la sala de mando: Misiones, Etapas, Acciones; CANALES §4.1).

/** Lo que traerá el lector de Notion: conteos por el Área (hub) de cada Tarea, nunca su título ni su texto. */
export type ConteoDeNotion = { abiertas: number; vencidas: number; esperando: number };
export type TareasDeNotion = { porHub: Partial<Record<Dominio, ConteoDeNotion>>; sinHub: number };

export type FilaDeAcciones = {
  dominio: Dominio;
  n: string;
  label: string;
  /** Las de la plataforma: las MISMAS medidas del tablero (Hacienda), sin copia ni recálculo. */
  plataforma: { abiertas: Medida; vencidas: Medida };
  notion: { abiertas: Medida; vencidas: Medida; esperando: Medida };
};

export type Acciones = {
  leidoAt: string;
  /** `sin_integracion`: Notion aún no se lee (CON-28); `leida` o `fallida`: lo que dijo su lector. */
  notion: "sin_integracion" | "leida" | "fallida";
  filas: readonly FilaDeAcciones[];
  totales: { plataformaAbiertas: Medida; notionAbiertas: Medida; notionEsperando: Medida; notionSinHub: Medida };
  /** Los avisos de las tareas de la plataforma (del tablero) y, si falló, el de Notion. */
  avisos: readonly Aviso[];
};

/** Arma el módulo. Puro y total: cada pieza de `PIEZAS_DE_ACCIONES` sale al menos una vez. */
export function armarAcciones(t: Tablero, notion: LecturaDeNotion<TareasDeNotion>): Acciones {
  const leidoAt = t.leidoAt;
  const sinIntegracion = esSinIntegracionNotion(notion);
  const leida = !sinIntegracion && notion.ok ? notion.valor : null;
  const truncado = !sinIntegracion && notion.ok && !!notion.truncado;
  const notas: NotaDeMedida[] = [...(sinIntegracion ? (["sin_integracion_notion"] as const) : []), ...(truncado ? (["tope_de_filas"] as const) : [])];
  const medida = (pieza: PiezaId, valor: number | null, clave?: string): Medida => ({
    valor,
    pieza,
    leidoAt,
    ...(clave !== undefined ? { clave } : {}),
    ...(notas.length ? { notas } : {}),
  });
  // Leído, un hub sin entrada es un cero de verdad; sin lectura (o fallida), «Sin datos».
  const deNotion = (d: Dominio, k: keyof ConteoDeNotion, pieza: PiezaId) => medida(pieza, leida ? (leida.porHub[d]?.[k] ?? 0) : null, d);

  const filas: FilaDeAcciones[] = DOMINIOS.map((d) => {
    const e = t.edificios[d.id];
    return {
      dominio: d.id,
      n: d.n,
      label: d.label,
      plataforma: { abiertas: e.abiertas, vencidas: e.vencidas },
      notion: {
        abiertas: deNotion(d.id, "abiertas", "acciones_notion_abiertas"),
        vencidas: deNotion(d.id, "vencidas", "acciones_notion_vencidas"),
        esperando: deNotion(d.id, "esperando", "acciones_notion_esperando"),
      },
    };
  });

  const avisosDeTareas = t.avisos.filter((a) => a.fuentes.some((p) => p === "tareas_abiertas" || p === "tareas_vencidas"));
  const avisoDeNotion: Aviso[] = !sinIntegracion && !notion.ok ? [{ error: notion.error, fuentes: notion.fuentes }] : [];

  return {
    leidoAt,
    notion: sinIntegracion ? "sin_integracion" : notion.ok ? "leida" : "fallida",
    filas,
    totales: {
      // Las de la plataforma: la misma suma que el HUD (solo los hubs que pueden tenerlas).
      plataformaAbiertas: resumenDelHud(t).abiertas,
      // Las de Notion CON hub (la suma de las filas); las sin Área van aparte en `notionSinHub`. La paridad de F-23
      // con Notion es: Tareas abiertas en Notion = notionAbiertas + notionSinHub (la etiqueta dice «con hub»).
      notionAbiertas: sumarMedidas(filas.map((f) => f.notion.abiertas), "acciones_notion_abiertas", leidoAt),
      notionEsperando: sumarMedidas(filas.map((f) => f.notion.esperando), "acciones_notion_esperando", leidoAt),
      notionSinHub: medida("acciones_notion_sin_hub", leida ? leida.sinHub : null),
    },
    avisos: [...avisosDeTareas, ...avisoDeNotion],
  };
}

/** Las piezas de Acciones que el módulo NO saca (debe ser vacío: sin entradas muertas en FUENTES). */
export function piezasMuertasDeAcciones(a: Acciones): PiezaId[] {
  const usadas = new Set<PiezaId>();
  for (const f of a.filas) for (const m of [f.notion.abiertas, f.notion.vencidas, f.notion.esperando]) usadas.add(m.pieza);
  for (const m of Object.values(a.totales)) usadas.add(m.pieza);
  return PIEZAS_DE_ACCIONES.filter((p) => !usadas.has(p));
}

/** «Copiar contexto para Tailor» de Acciones: SOLO conteos por hub y la hora de lectura (ni títulos, ni personas). */
export function contextoDeAcciones(a: Acciones): string {
  const c = textosDelOs().contexto;
  const demo = a.filas.some((f) => f.plataforma.abiertas.demo || f.notion.abiertas.demo);
  const n = (m: Medida) => (m.valor === null ? (m.notas?.includes("sin_integracion_notion") ? c.sinIntegracion : c.sinDatos) : String(m.valor));
  const lineas = [`${c.acciones} ${a.leidoAt}${demo ? ` · ${c.demo}` : ""}`];
  for (const f of a.filas) {
    lineas.push(
      `${f.n} · ${f.label}: ${c.plataforma} ${c.abiertas} ${n(f.plataforma.abiertas)}, ${c.vencidas} ${n(f.plataforma.vencidas)}; ` +
        `${c.notion} ${c.abiertas} ${n(f.notion.abiertas)}, ${c.vencidas} ${n(f.notion.vencidas)}, ${c.esperando} ${n(f.notion.esperando)}.`
    );
  }
  lineas.push(`${c.notion} ${c.sinHub}: ${n(a.totales.notionSinHub)}.`);
  return lineas.join("\n");
}
