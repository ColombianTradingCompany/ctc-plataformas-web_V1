// ── Una carpeta por herramienta (V5.66, 2026-09-21) ──────────────────────────
// Hasta la V5.65 los HTML vivían sueltos en `public/tools/`. Desde la V5.66 cada
// herramienta del repositorio tiene SU carpeta, con el nombre de su `tools.id`:
//
//   public/tools/<id>/<archivo>.html
//
// El nombre del archivo NO cambió (es el que ya indexó el buscador y el que
// tiene palabras útiles en la URL); lo que cambió es la carpeta. Por eso:
//
//   1. Las URLs planas viejas (`/tools/<archivo>.html`) siguen abriendo: son un
//      308 a la nueva, declarado en `next.config.ts` a partir de esta lista. Un
//      enlace impreso, un marcador o un resultado de Google no se rompen.
//   2. `tool_versions.src_publico` apunta a la ruta NUEVA (se reapuntó con la
//      V5.66 ya desplegada, para que la base nunca señale un archivo inexistente).
//   3. Lo compartido se queda en la raíz y NO es carpeta de herramienta:
//      `ctc-bridge.js` (el puente) y `assets/` (fuentes, librerías, y —de
//      momento— los recursos del Lector de Cromatografía). `h` tampoco puede ser
//      una carpeta: es la ruta `/tools/h/[slug]` de las versiones subidas.
//
// Módulo PURO, sin imports: lo lee `next.config.ts` (las redirecciones) y lo
// vigila `scripts/qa-tools-carpetas.mjs` contra el disco.

export type CarpetaHerramienta = {
  /** `tools.id` — y nombre de la carpeta. */
  id: string;
  /** Archivos de la carpeta. El primero es el que la base tiene publicado. */
  archivos: string[];
};

export const CARPETAS_HERRAMIENTAS: CarpetaHerramienta[] = [
  { id: "agtron", archivos: ["agtron-dial.html"] },
  // Dos versiones: la V23 del owner es la publicada (tool_versions #2); la V10
  // (`rueda-catacion.html`, #1) sigue viva porque `scripts/build-ruedas-mock.mjs`
  // dibuja con ella el extracto de rueda del reverso del Sneak Peek.
  { id: "catacion", archivos: ["rueda-del-cafe-v23.html", "rueda-catacion.html"] },
  { id: "cogs-verde", archivos: ["cogs-cafe-verde.html"] },
  { id: "cool-pdf", archivos: ["cool-pdf.html"] },
  { id: "costo-empaque", archivos: ["costo-empaque.html"] },
  { id: "cromatografia-suelo", archivos: ["cromatografia-suelo.html"] },
  { id: "defectos-cafe", archivos: ["defectos-cafe.html"] },
  { id: "formula-calidad", archivos: ["formula-calidad.html"] },
  { id: "green-datasheet", archivos: ["green-coffee-datasheet.html"] },
  { id: "mapa-variedades", archivos: ["mapa-variedades.html"] },
  // ⚠️ Los ids de mermas están cruzados con sus nombres: `mermas-ctc` es la
  // DETALLADA y `mermas-detallada` es el «Reporte de proceso» archivado. La
  // carpeta sigue al id, que es lo que no se puede cambiar sin migrar trabajos.
  { id: "mermas-ctc", archivos: ["mermas-ctc.html"] },
  { id: "mermas-rapida", archivos: ["mermas-rapida.html"] },
  // Archivada el 2026-08-15: sigue en public/ con noindex (archivar no retira).
  { id: "mermas-detallada", archivos: ["mermas-detallada.html"] },
  { id: "qr", archivos: ["generador-qr.html"] },
  { id: "viaje-cafe", archivos: ["viaje-cafe.html"] },
];

/** Nombres de la raíz de `public/tools/` que NO son carpeta de herramienta. */
export const RAIZ_COMPARTIDA_TOOLS = ["assets", "ctc-bridge.js", "h"] as const;

/** La ruta pública de un archivo de herramienta. */
export function rutaHerramienta(id: string, archivo: string): string {
  return `/tools/${id}/${archivo}`;
}

/** Las 308 de la mudanza: cada URL plana vieja → su carpeta. */
export const REDIRECCIONES_HERRAMIENTAS: { source: string; destination: string; permanent: true }[] =
  CARPETAS_HERRAMIENTAS.flatMap((c) =>
    c.archivos.map((a) => ({ source: `/tools/${a}`, destination: rutaHerramienta(c.id, a), permanent: true as const }))
  );
