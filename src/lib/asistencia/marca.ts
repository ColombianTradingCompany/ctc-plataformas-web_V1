// ── La MARCA de la sesión asistida (V5.139, owner 2026-10-02) ──────────────────────────────────────────────────────────
// La sesión asistida es, para Auth, una sesión cualquiera del productor: Kaffetal Regal no tenía cómo saber que quien
// está delante es CTCx y no el productor — y el operador no tenía cómo saber COMO QUIÉN estaba entrado. El 2026-10-02 la
// cookie compartida se quedó con el productor anterior (V5.138) y nada en la pantalla lo decía.
//
// La marca es una cookie aparte, legible por el navegador, que el OCP escribe al abrir la sesión (con el id del
// productor) y borra al cerrarla. Kaffetal Regal pinta la franja «Sesión asistida · <productor>» SOLO si la marca dice
// el mismo id que la sesión que tiene cargada: una marca vieja de otro productor no enciende nada, y el productor de
// verdad —en su propio navegador— nunca la tiene.
//
// No autoriza NADA: es un rótulo. Lo que el operador puede hacer lo sigue decidiendo la sesión (RLS y guards).
// Módulo puro: lo importan el servidor (`actions.ts`), el cliente (`KaffetalExperience`) y el guardián.

export const COOKIE_SESION_ASISTIDA = "ctc-sesion-asistida";

/** Lo que dura la marca: lo que dura, como mucho, una jornada de carga. Vencida, la franja deja de salir. */
export const SEGUNDOS_DE_LA_MARCA = 12 * 60 * 60;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** El id del productor que dice la marca, leído de `document.cookie` (o de un encabezado `Cookie`). */
export function leerMarcaAsistida(cookies: string | null | undefined): string | null {
  for (const par of (cookies ?? "").split(";")) {
    const i = par.indexOf("=");
    if (i < 0 || par.slice(0, i).trim() !== COOKIE_SESION_ASISTIDA) continue;
    const valor = decodeURIComponent(par.slice(i + 1).trim());
    return UUID.test(valor) ? valor.toLowerCase() : null;
  }
  return null;
}

/** ¿La sesión cargada es la asistida que abrió el OCP? */
export function esSesionAsistida(cookies: string | null | undefined, userId: string | null | undefined): boolean {
  const marca = leerMarcaAsistida(cookies);
  return !!marca && !!userId && marca === userId.toLowerCase();
}

/** La cadena que borra la marca desde el navegador (`document.cookie = …`), en el mismo ámbito en que se escribió. */
export function borradoDeLaMarca(domain: string | undefined): string {
  return `${COOKIE_SESION_ASISTIDA}=; Path=/; Max-Age=0${domain ? `; Domain=${domain}` : ""}`;
}
