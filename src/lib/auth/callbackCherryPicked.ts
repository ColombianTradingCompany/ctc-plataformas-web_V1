// ── A dónde vuelve Google desde la ventana de login de Cherry Picked (V6.20) ──
// La MISMA ventana (`components/cherry-picked/LoginModal.tsx`) se pinta en las
// cuatro superficies de la familia: la portada, Green, Roast y X. Cada una vive
// en su subdominio, y el proxy antepone la base del subdominio a cualquier
// camino que no la lleve (gotcha 12). Por eso la vuelta de Google tiene que
// colgar de la base de la superficie DONDE se abrió la ventana: es la única
// ruta que existe en ese origen, y quedarse en el mismo origen es lo que deja
// leer la cookie del verificador PKCE con la que se canjea el código.
//
// Módulo PURO (ni React, ni Supabase, ni `next/headers`): lo importan la
// ventana de login y el guardián `scripts/qa-callbacks-google-check.mjs`, que
// lo pasa por el proxy real para cada host donde se pinta la ventana.
//
// Allowlist de Supabase: las cuatro vueltas quedan bajo el comodín de
// subdominios de la casa (Redirect URLs). En desarrollo cada vuelta de
// `localhost` necesita su propia entrada.

import { SUBDOMAIN_ROUTES } from "@/lib/red/subdominios";

/** Las bases de la familia, cada una con su `auth/callback` en `src/app`. */
export const SUPERFICIES_CHERRY_PICKED = ["/cherry-picked", "/cherry-picked-green", "/cherry-picked-roast", "/cherry-picked-x"] as const;

/** Sin pista de superficie (un host sin subdominio de la familia y una ruta ajena), se vuelve a la tienda. */
const POR_DEFECTO = "/cherry-picked-green";

/** La base de la familia a la que pertenece esta página. Primero el subdominio —lo mismo que lee el proxy—; en `www`,
 *  `localhost` y las previas, la ruta, comparada por FRONTERA DE SEGMENTO (`/cherry-picked` es prefijo de las otras tres). */
export function superficieCherryPicked(host: string, pathname: string): string {
  const sub = host.split(":")[0].split(".")[0];
  const base = SUBDOMAIN_ROUTES[sub];
  const familia: readonly string[] = SUPERFICIES_CHERRY_PICKED;
  if (base && familia.includes(base)) return base;
  return familia.find((s) => pathname === s || pathname.startsWith(s + "/")) ?? POR_DEFECTO;
}

/** El camino de vuelta de Google para la ventana abierta en `host` + `pathname` (se le antepone el origen). */
export function caminoCallbackCherryPicked(host: string, pathname: string): string {
  return `${superficieCherryPicked(host, pathname)}/auth/callback`;
}
