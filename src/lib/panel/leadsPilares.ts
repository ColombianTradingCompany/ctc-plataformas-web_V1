import { CONSOLE_ORDER, type PanelConsoleKey } from "./consoles";

// ── Qué tablero —y por tanto qué consola— administra cada pilar de `leads` ────
// UNA sola tabla, dos cosas que se deducen de ella: qué ruta hay que revalidar
// cuando un lead cambia, y qué consola tiene que tener concedida (y con qué
// nivel) quien lo toca.
//
// ⚠️ HASTA LA V5.58 ERAN DOS MAPAS escritos a mano en `leadsActions.ts`:
// `PILLAR_BOARD_PATH` (rutas) y `PILLAR_CONSOLE` (permisos). El segundo no lleva
// barras, así que ninguna reescritura de rutas lo tocaba: `cocreate` se quedó
// pidiendo grant del BCP durante todo PR-A con el tablero ya en el OCP, y no
// falló nada visible — al operador se le pedía la consola equivocada. Desde la
// V5.59 la consola SE DEDUCE de la ruta (su primer segmento): mover un tablero
// es cambiar una línea, y el permiso viaja con ella. `qa-rutas-consolas` exige
// además que cada ruta de aquí sea un enlace real del rail de esa consola.
//
// Módulo PURO a propósito (sin "use server", sin Supabase): lo importan las
// acciones y lo lee el guardián.
export const PILLAR_BOARD_PATH: Record<string, string> = {
  general: "/lcp/leads", // Leads · Recepción — la puerta general de la red
  cocreate: "/lcp/crm/caas", // CRM CP CaaS
  tech: "/bcp/ctc-tech", // el tablero de SU superficie (D4 del overhaul): no es un CRM de Cherry Picked. BCP desde la V5.60
  varietales: "/bcp/varietales",
};

/** El pilar que no se conoce cae en la recepción general, que es donde se mira lo que no tiene dueño. */
const PILAR_POR_DEFECTO = "general";

export function tableroDelPilar(pillar: string): string {
  return PILLAR_BOARD_PATH[pillar] ?? PILLAR_BOARD_PATH[PILAR_POR_DEFECTO];
}

export function consolaDelPilar(pillar: string): PanelConsoleKey {
  const primera = tableroDelPilar(pillar).split("/")[1] as PanelConsoleKey;
  // Una ruta mal escrita aquí no puede abrir una consola que no existe: cae a la LCP,
  // que es la dueña de la recepción.
  return CONSOLE_ORDER.includes(primera) ? primera : "lcp";
}

/** Todas las consolas que administran algún pilar — la compuerta GRUESA de las acciones de leads. */
export const CONSOLAS_DE_LEADS: PanelConsoleKey[] = [
  ...new Set(Object.keys(PILLAR_BOARD_PATH).map((p) => consolaDelPilar(p))),
];
