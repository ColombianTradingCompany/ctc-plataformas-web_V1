// ── Definición de Contexto · exportar como Markdown (TAR-122) ────────────────
// La ficha viva, en un archivo `.md` que se sube como CONOCIMIENTO a un proyecto
// de Claude Chat: así el asistente del día a día escribe con las mismas tres
// preguntas, el mismo tono y los mismos Grados que la redacción asistida de la
// consola.
//
// Módulo PURO (sin servidor, sin sesión, sin fecha propia), como `definicion.ts`
// y `memoria.ts`: el guardián `qa-definicion-check` lo ejercita sin levantar la
// consola, y la misma entrada da SIEMPRE el mismo archivo — las fechas entran
// como argumento, el orden es el de `definicion.ts` y nada depende del orden de
// las claves en el jsonb.
//
// LO QUE NO SALE: quién editó (`updated_by`), ni ningún dato de la base que no sea
// el texto de las casillas. El archivo se comparte fuera de la consola.

import {
  GENERALES, PREGUNTAS, UNIDADES, avanceDeUnidad, claveDe, claveGeneral, type UnidadId,
} from "./definicion";
import { textoMemoria } from "./memoria";

export const SIN_RESPONDER = "_(sin responder)_";

/** `?unidad=` del enlace de exportación: SOLO un id de `UNIDADES` (lista blanca). */
export function unidadValida(v: string | null | undefined): UnidadId | null {
  return UNIDADES.some((u) => u.id === v) ? (v as UnidadId) : null;
}

/** «2026-11-05 07:12 UTC». Una fecha ilegible no inventa nada: «—». */
export function fechaUtc(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "—";
  return `${d.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

/** `ctcx-definicion-de-contexto[-kr]-2026-11-05.md`. */
export function nombreDeArchivo(exportadoEl: string, unidad: UnidadId | null = null): string {
  const dia = /^\d{4}-\d{2}-\d{2}/.test(exportadoEl) ? exportadoEl.slice(0, 10) : "sin-fecha";
  return `ctcx-definicion-de-contexto${unidad ? `-${unidad}` : ""}-${dia}.md`;
}

/** El texto de una casilla, tal cual lo escribió el equipo, salvo lo que se SALDRÍA de la casilla y rompería la estructura
 *  del archivo (el equipo pega a menudo Markdown copiado de Claude Chat): los saltos `\r\n`; una línea que empiece por `#`
 *  (un título nuevo); una valla de código ``` o ~~~ (sin cerrar, se tragaría el resto del archivo, la memoria incluida); una
 *  línea de solo `-` o `=` (debajo de un texto lo vuelve un título, «setext»); y una línea que empiece por `<` (un comentario
 *  HTML sin cerrar esconde lo que sigue). A esas líneas se les antepone `\`: el texto se lee igual y la estructura no se mueve.
 *  Revisión adversarial del 2026-11-05: la primera versión solo cuidaba el `#`. */
export function textoDeCasilla(v: unknown): string {
  if (typeof v !== "string") return SIN_RESPONDER;
  const limpio = v
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((l) =>
      l
        .replace(/\s+$/, "")
        .replace(/^(\s*)#/, "$1\\#")
        .replace(/^(\s*)(`{3,}|~{3,})/, "$1\\$2")
        .replace(/^(\s*)(=+|-+)$/, "$1\\$2")
        .replace(/^(\s*)</, "$1\\<"),
    )
    .join("\n")
    .trim();
  return limpio ? limpio : SIN_RESPONDER;
}

export type EntradaExportacion = {
  /** `data.values` de `direccionamiento_context` (ámbito «record»). */
  values: Record<string, unknown> | null | undefined;
  /** `direccionamiento_context.updated_at` — la última vez que se guardó. */
  actualizadoEl: string | null | undefined;
  /** El momento de la exportación (lo pone quien llama: este módulo no lee el reloj). */
  exportadoEl: string;
  /** Solo una unidad (más los generales y la memoria); `null` = las cuatro. */
  unidad?: UnidadId | null;
};

/** La ficha entera como Markdown. Determinista: misma entrada, mismo archivo. */
export function contextoComoMarkdown({ values, actualizadoEl, exportadoEl, unidad = null }: EntradaExportacion): string {
  const v = (values ?? {}) as Record<string, unknown>;
  const valoresTexto: Record<string, string> = {};
  for (const [k, x] of Object.entries(v)) if (typeof x === "string") valoresTexto[k] = x;

  const unidades = unidad ? UNIDADES.filter((u) => u.id === unidad) : UNIDADES;
  const out: string[] = [];
  const p = (...lineas: string[]) => out.push(...lineas);

  p(
    `# Definición de Contexto · CTCx${unidad ? ` · ${unidades[0].name}` : ""}`,
    "",
    "> La ficha viva desde la que la casa redacta: las tres preguntas (Producto · Cliente · Contexto) de cada unidad de negocio",
    "> y los campos generales. Exportada de la consola ECP · Herramientas Internas · Definición de Contexto.",
    `> Última edición guardada: ${fechaUtc(actualizadoEl)} · Exportada: ${fechaUtc(exportadoEl)}.`,
    `> Una casilla vacía dice ${SIN_RESPONDER}. Los Grados de Calidad del final salen de la definición vigente del código, no de esta ficha.`,
    "",
    "## Generales",
    "",
  );
  for (const c of GENERALES) {
    p(`### ${c.label}`, "", `_${c.help}_`, "", textoDeCasilla(v[claveGeneral(c.id)]), "");
  }

  for (const u of unidades) {
    const a = avanceDeUnidad(u.id, valoresTexto);
    p(
      `## ${u.code} · ${u.name}`,
      "",
      `- **Rol:** ${u.role}`,
      `- **Le habla a:** ${u.quien}`,
      ...(u.site ? [`- **Sitio:** ${u.site}`] : []),
      `- **Avance:** ${a.hechos} de ${a.total} campos respondidos`,
      "",
    );
    for (const q of PREGUNTAS) {
      p(`### ${q.titulo} — ${q.pregunta}`, "");
      for (const c of q.campos) {
        p(`#### ${c.label}`, "", `_${c.help}_`, "", textoDeCasilla(v[claveDe(u.id, q.id, c.id)]), "");
      }
    }
  }

  p(
    "## Memoria del sistema · Grados de Calidad CTC",
    "",
    "Lo que la redacción asistida de la consola pone delante de CADA petición. Prevalece sobre cualquier cifra de grados de arriba.",
    "",
    "```text",
    textoMemoria(),
    "```",
    "",
  );
  return out.join("\n");
}
