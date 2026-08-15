import type { PanelNavLink } from "./consoles";

// ── Qué enlace del rail se pinta ACTIVO ──────────────────────────────────────
// Módulo PURO y sin `server-only` a propósito: la regla la corre el componente
// de cliente (PanelSidebar) y la comprueba un guardián de QA sin levantar la
// consola — que además está detrás de 2FA y no se puede conducir en un
// navegador automatizado. Mismo patrón que `lib/arena/jornada.ts` y
// `coffeed/.../model.ts`.
//
// POR QUÉ NO BASTA UN `startsWith` POR ENLACE (2026-08-16). Funcionaba mientras
// ninguna ruta del rail fuera prefijo de otra. El atajo a «Manejo de
// Plataformas» apunta a `/ecp/direccionamiento/plataformas`, y en el rail ya
// vivía `/ecp/direccionamiento`: los dos casaban y los dos se pintaban activos
// para UNA sola página. Gana el href MÁS LARGO, que es siempre el más
// específico.
//
// Y el segundo arreglo, de la misma familia que el del matcher del proxy
// (auditoría ESTR-3): `startsWith("/ecp/varietales")` también casaba un futuro
// `/ecp/varietalesx`. La comparación es por LÍMITE DE SEGMENTO — la ruta exacta,
// o la ruta seguida de una barra.

/** ¿Este enlace cubre esta ruta? */
export function enlaceCubre(link: Pick<PanelNavLink, "href" | "exact">, pathname: string): boolean {
  if (link.exact) return pathname === link.href;
  return pathname === link.href || pathname.startsWith(link.href + "/");
}

/**
 * El href del ÚNICO enlace que debe verse activo, o null si ninguno cubre la
 * ruta (pasa en subpáginas que no tienen entrada propia en el rail y cuyo padre
 * tampoco está listado).
 */
export function hrefActivoDelRail(
  links: Pick<PanelNavLink, "href" | "exact">[],
  pathname: string
): string | null {
  return links
    .filter((l) => enlaceCubre(l, pathname))
    .reduce<string | null>((mejor, l) => (mejor === null || l.href.length > mejor.length ? l.href : mejor), null);
}
