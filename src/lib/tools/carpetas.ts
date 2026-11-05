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
  /** TAR-121: qué prellenan `?finca=` y `?lote=` al abrirla desde el taller. Sin esta clave, la herramienta los ignora. */
  entrada?: EntradaHerramienta;
};

// ── TAR-121 · la herramienta como MÓDULO: el contrato de entrada del taller ───────────────────────────────────────────────
// `herramientas.ctcexport.com/taller/<id>` acepta, además de `?volver=`, `?trabajo=<id>` (abre un trabajo guardado de la
// propia cuenta; vale para toda herramienta con memoria, sin declararlo aquí: lo dice `tools.soporta_memoria`) y
// `?finca=` / `?lote=` (prellenan un trabajo nuevo con una finca o un lote DE LA CUENTA). Lo segundo sí se declara aquí,
// herramienta por herramienta, porque cada una tiene sus campos: el dato del registro → el selector CSS del campo en SU
// documento. Solo `#id` o `[data-field="x"]`: `qa-taller-entrada-check` comprueba que el campo existe en el archivo.
// Una herramienta de esquema propio (React, o con `CTC.usarEstado`) que prefiere recibir el registro entero lo pide con
// `propio: true` y lo lee con `CTC.usarPrefill(fn)`. La lista vive AQUÍ y no en otro sitio: es el registro tipado de las
// herramientas del repo; el contrato completo, en `docs/componentes/herramientas-cafe.md` («El contrato de URL del taller»).

/** Los datos de una finca que una herramienta puede pedir (`resumen` = una línea con nombre, municipio y altitud). */
export const DATOS_FINCA = ["id", "referencia", "nombre", "municipio", "departamento", "altitud_m", "resumen"] as const;
/** Los datos de un lote (`resumen` = referencia, nombre, variedad, proceso y finca en una línea). */
export const DATOS_LOTE = ["referencia", "nombre", "variedad", "proceso", "altitud_m", "resumen"] as const;
export type DatoFinca = (typeof DATOS_FINCA)[number];
export type DatoLote = (typeof DATOS_LOTE)[number];

export type EntradaHerramienta = {
  /** dato de la finca → selector del campo que llena. */
  finca?: Partial<Record<DatoFinca, string>>;
  /** dato del lote → selector del campo que llena. */
  lote?: Partial<Record<DatoLote, string>>;
  /** true = la herramienta recibe además el registro entero (finca y lote) por `CTC.usarPrefill`. */
  propio?: boolean;
};

export const CARPETAS_HERRAMIENTAS: CarpetaHerramienta[] = [
  { id: "agtron", archivos: ["agtron-dial.html"] },
  // V6.11 (2026-10-26): peso, CBM y estiba en pallets estándar (hasta 2,2 m o el tope de peso), vista 3D con
  // persona de 1,80 m y PDF. ES · EN; memoria con esquema propio. Fuentes en reference/html_tools/calculadora-logistica/.
  { id: "calculadora-logistica", archivos: ["calculadora-logistica-cafe.html"] },
  // Dos versiones: la V23 del owner es la publicada (tool_versions #2); la V10
  // (`rueda-catacion.html`, #1) sigue viva porque `scripts/build-ruedas-mock.mjs`
  // dibuja con ella el extracto de rueda del reverso del Sneak Peek.
  { id: "catacion", archivos: ["rueda-del-cafe-v23.html", "rueda-catacion.html"] },
  { id: "cogs-verde", archivos: ["cogs-cafe-verde.html"] },
  // V5.132: nace de combinar `catacion` (la rueda) y `green-datasheet` (la ficha), que siguen vivas. V6.6: la herramienta es la
  // planilla del Centro de Calidad en React (`/tools/coffee-datasheet/app`, `src/components/tools/datasheet/`); este HTML es
  // solo la página de paso a esa ruta, para los enlaces viejos.
  { id: "coffee-datasheet", archivos: ["ctcx-coffee-datasheet-tool.html"] },
  { id: "cool-pdf", archivos: ["cool-pdf.html"] },
  { id: "costo-empaque", archivos: ["costo-empaque.html"] },
  { id: "cromatografia-suelo", archivos: ["cromatografia-suelo.html"] },
  { id: "defectos-cafe", archivos: ["defectos-cafe.html"] },
  { id: "formula-calidad", archivos: ["formula-calidad.html"] },
  { id: "green-datasheet", archivos: ["green-coffee-datasheet.html"] },
  // V6.14 (2026-10-29): Navegador de Incoterms® 2020, mar y aire lado a lado, EN · ES · JA · DE, hoja de dos
  // páginas imprimible. Sin memoria (el estado es solo regla · idioma · destino). La FUENTE vive en el repo de la
  // campaña SCAJ 2026 (`entregables/incoterms-navigator/`, `build.py` arma esta copia con las fuentes locales).
  { id: "incoterms", archivos: ["incoterms-navigator.html"] },
  // V5.149 (2026-10-04): japonés de bolsillo para SCAJ 2026. Plus, memoria con esquema propio; el
  // evento vive en UN bloque del HTML (`/*<EVENTO>*/`) — lo vigila scripts/qa-gulliver-check.mjs.
  { id: "gulliver", archivos: ["gulliver-7-dias-a-tokio.html"] },
  { id: "mapa-variedades", archivos: ["mapa-variedades.html"] },
  // ⚠️ Los ids de mermas están cruzados con sus nombres: `mermas-ctc` es la
  // DETALLADA y `mermas-detallada` era el «Reporte de proceso» (borrado, abajo). La
  // carpeta sigue al id, que es lo que no se puede cambiar sin migrar trabajos.
  // TAR-121: las notas del cálculo («Ej.: Lote Huila 2026, proceso lavado…») reciben la línea del lote o de la finca.
  { id: "mermas-ctc", archivos: ["mermas-ctc.html"], entrada: { lote: { resumen: "#notes" }, finca: { resumen: "#notes" } } },
  { id: "mermas-rapida", archivos: ["mermas-rapida.html"] },
  { id: "qr", archivos: ["generador-qr.html"] },
  { id: "viaje-cafe", archivos: ["viaje-cafe.html"] },
];

/** Nombres de la raíz de `public/tools/` que NO son carpeta de herramienta. */
export const RAIZ_COMPARTIDA_TOOLS = ["assets", "ctc-bridge.js", "h"] as const;

/** La ruta pública de un archivo de herramienta. */
export function rutaHerramienta(id: string, archivo: string): string {
  return `/tools/${id}/${archivo}`;
}

/** Herramientas cuyo ARCHIVO se borró de `public/` (la fila de `tools` se queda,
 *  archivada, como registro). Sus URLs —la plana y la de carpeta— no dan 404:
 *  van con 308 a la herramienta que la sustituyó, porque pueden estar enlazadas
 *  desde fuera.
 *
 *  · mermas-detallada («Reporte de proceso de café») — archivada el 2026-08-15,
 *    sustituida por `mermas-ctc` (la Detallada); el owner mandó borrarla el
 *    2026-09-22 (V5.67). La fuente original sigue en reference/html_tools/. */
export const HERRAMIENTAS_BORRADAS: { id: string; archivo: string; sucesora: { id: string; archivo: string } }[] = [
  { id: "mermas-detallada", archivo: "mermas-detallada.html", sucesora: { id: "mermas-ctc", archivo: "mermas-ctc.html" } },
];

/** Las 308: cada URL plana vieja → su carpeta; y las de una borrada → su sucesora. */
export const REDIRECCIONES_HERRAMIENTAS: { source: string; destination: string; permanent: true }[] = [
  ...CARPETAS_HERRAMIENTAS.flatMap((c) =>
    c.archivos.map((a) => ({ source: `/tools/${a}`, destination: rutaHerramienta(c.id, a), permanent: true as const }))
  ),
  ...HERRAMIENTAS_BORRADAS.flatMap((b) =>
    [`/tools/${b.archivo}`, rutaHerramienta(b.id, b.archivo)].map((source) => ({
      source,
      destination: rutaHerramienta(b.sucesora.id, b.sucesora.archivo),
      permanent: true as const,
    }))
  ),
];
