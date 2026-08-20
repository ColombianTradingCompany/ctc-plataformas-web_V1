// ── Los módulos que se fueron de la plataforma ───────────────────────────────
// Hermana de `rutasMovidas.ts`, y separada de ella a propósito.
//
// `RUTAS_MOVIDAS` describe mudanzas ENTRE consolas: su destino es una ruta de
// esta misma aplicación, y el guardián `qa-rutas-consolas.mjs` comprueba que esa
// ruta tenga página. Aquí el destino está en OTRO dominio, así que ninguna de
// las dos cosas aplica — meterlo en la misma lista rompería el guardián y, peor,
// mentiría: el módulo no se movió de sitio, se fue del edificio.
//
// La regla F2 sigue mandando: **una URL vieja nunca muere**. Queda como 308
// hacia donde vive ahora.

export type SalidaDeLaPlataforma = {
  /** La ruta vieja, todavía viva como 308. */
  de: string;
  /** A dónde se fue. Absoluta: es otro dominio. */
  a: string;
  /** Qué pasó, para quien llegue a esta lista sin contexto. */
  nota: string;
  desde: string;
};

export const SALIDAS: SalidaDeLaPlataforma[] = [
  {
    de: "/bcp/gvg",
    a: "https://cv.commaas.cloud",
    nota:
      "El GVG-Space y su CV App Manager salen de CTC y se montan como servicio del CommaaS Hub. " +
      "El candado de contraseña del espacio desaparece con la mudanza: el permiso pasa a ser un " +
      "grant del hub, que se concede y se revoca por persona.",
    desde: "V5.1",
  },
  {
    // El talón de la mudanza ECP → BCP (V4.25) se mantiene vivo y se REAPUNTA
    // al destino final, en vez de encadenarse contra el otro talón. Es la misma
    // regla que `rutasMovidas.ts` aplica a las cadenas.
    de: "/ecp/gvg",
    a: "https://cv.commaas.cloud",
    nota: "Estuvo en el ECP hasta V4.25 y en el BCP hasta V5.1. Ahora vive en CommaaS.",
    desde: "V5.1",
  },
];

/** El destino de una ruta que salió, o null si esa ruta sigue siendo de casa. */
export function salidaDe(ruta: string): SalidaDeLaPlataforma | null {
  // El más específico primero, para que `/bcp/gvg/cv` no se resuelva por `/bcp`.
  const orden = [...SALIDAS].sort((a, b) => b.de.length - a.de.length);
  return orden.find((s) => ruta === s.de || ruta.startsWith(`${s.de}/`)) ?? null;
}
