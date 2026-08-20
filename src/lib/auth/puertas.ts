// ── Las puertas de la red, y por dónde se vuelve a cada una ─────────────────
// FUENTE ÚNICA de «Recuperar acceso» (V5.12). La red CTC tiene UNA identidad y
// ONCE puertas: cinco superficies públicas, cinco nodos de socio y el login
// maestro. Todas comparten `auth.users` y la cookie de `.ctcexport.com`, así
// que la recuperación es UNA sola — lo único que cambia por puerta es cómo se
// llama el sitio y a dónde se vuelve cuando termina.
//
// Este módulo es PURO a propósito (ni Supabase, ni `next/headers`, ni React):
// lo importan el servidor, los formularios de cliente y el guardián
// `scripts/qa-recuperacion-check.mjs`, que comprueba sus invariantes sin
// levantar nada.
//
// REGLA que sostiene `hrefPuerta`: `camino` SIEMPRE empieza por `ruta`. En
// producción el subdominio ya sirve la base, así que la URL absoluta es el
// origen de la superficie + lo que sobra del camino (gotcha 12: el proxy
// antepone la base a cualquier ruta que no la lleve). El guardián lo verifica.

import { origenDeSuperficie } from "@/lib/red/subdominios";

export type PuertaId =
  | "kaffetal-regal"
  | "cherry-picked"
  | "directorio"
  | "terratalento"
  | "herramientas"
  | "panel"
  | "socios-centro-calidad"
  | "socios-agente-carga"
  | "socios-agente-nacionalizacion"
  | "socios-master-roaster"
  | "socios-estudio-contenido";

export type Puerta = {
  /** Cómo se llama el sitio, tal cual se le dice a la persona. */
  nombre: string;
  /** La base de la superficie — la clave con la que `subdominios.ts` sabe su origen. */
  ruta: string;
  /** El camino EXACTO de la puerta (la pantalla donde se escribe la contraseña). */
  camino: string;
};

export const PUERTAS: Record<PuertaId, Puerta> = {
  "kaffetal-regal": { nombre: "Kaffetal Regal", ruta: "/kaffetal-regal", camino: "/kaffetal-regal" },
  // La tienda vive en su propio subdominio desde el 2026-08-11; la portada
  // `/cherry-picked` reparte programas y no tiene login propio.
  "cherry-picked": { nombre: "Cherry Picked", ruta: "/cherry-picked-green", camino: "/cherry-picked-green" },
  directorio: { nombre: "Directorio del Café", ruta: "/directorio", camino: "/directorio" },
  terratalento: { nombre: "Terratalento", ruta: "/terratalento", camino: "/terratalento" },
  herramientas: { nombre: "Herramientas del Café", ruta: "/herramientas", camino: "/herramientas/acceso" },
  // El login maestro no tiene subdominio propio: vive en la casa matriz.
  panel: { nombre: "CTC Web Platform", ruta: "/login", camino: "/login" },
  "socios-centro-calidad": {
    nombre: "Centro de Calidad",
    ruta: "/socios/centro-calidad",
    camino: "/socios/centro-calidad/acceso",
  },
  "socios-agente-carga": {
    nombre: "Agente de Carga",
    ruta: "/socios/agente-carga",
    camino: "/socios/agente-carga/acceso",
  },
  "socios-agente-nacionalizacion": {
    nombre: "Agente de Nacionalización",
    ruta: "/socios/agente-nacionalizacion",
    camino: "/socios/agente-nacionalizacion/acceso",
  },
  "socios-master-roaster": {
    nombre: "Master Roaster",
    ruta: "/socios/master-roaster",
    camino: "/socios/master-roaster/acceso",
  },
  "socios-estudio-contenido": {
    nombre: "Estudio de Contenido",
    ruta: "/socios/estudio-contenido",
    camino: "/socios/estudio-contenido/acceso",
  },
};

/** La superficie compartida. Se sirve desde la RAÍZ en todos los hosts — ver la
 *  lista `RAIZ_COMPARTIDA` de `src/proxy.ts`, que impide que el subdominio le
 *  anteponga su base y la convierta en un 404. */
export const RUTA_RECUPERAR = "/recuperar-acceso";

/**
 * ¿Es `v` una puerta conocida? Se usa para SANEAR el `?puerta=` de la URL.
 *
 * ⚠️ Esto es lo que impide un REDIRECT ABIERTO. La lección es del 2026-08-19
 * (`?volver=` en Herramientas): si la pantalla aceptara una URL de vuelta
 * cualquiera, un enlace como `…/recuperar-acceso?volver=https://sitio-falso`
 * pondría, DENTRO del dominio de CTC y en la página donde alguien está
 * recuperando su contraseña, un botón que lleva a una copia del login. Por eso
 * lo que viaja en la URL es un IDENTIFICADOR de esta lista, nunca un destino.
 */
export function esPuerta(v: unknown): v is PuertaId {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(PUERTAS, v);
}

/** La puerta pedida, o Kaffetal Regal si el parámetro no dice nada legible.
 *  (Es la puerta con más gente detrás: 23 de las 29 cuentas de hoy.) */
export const PUERTA_POR_DEFECTO: PuertaId = "kaffetal-regal";

export function puertaDe(v: unknown): PuertaId {
  return esPuerta(v) ? v : PUERTA_POR_DEFECTO;
}

/**
 * A dónde vuelve el botón «Volver a …».
 *
 * En DESARROLLO no hay subdominios: el camino relativo ya sirve. En PRODUCCIÓN
 * cada superficie tiene el suyo y hay que dar la URL absoluta, porque quien
 * recupera puede haber abierto el enlace del correo en cualquier host de la red.
 */
export function hrefPuerta(id: PuertaId, produccion: boolean): string {
  const p = PUERTAS[id];
  if (!produccion) return p.camino;
  return `${origenDeSuperficie(p.ruta)}${p.camino.slice(p.ruta.length)}`;
}

/** El enlace «¿Olvidaste tu contraseña?» que monta cada puerta. Relativo a
 *  propósito: la superficie se sirve en TODOS los hosts (ver RUTA_RECUPERAR). */
export function hrefRecuperar(id: PuertaId): string {
  return `${RUTA_RECUPERAR}?puerta=${encodeURIComponent(id)}`;
}
