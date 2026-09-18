// ── El mapa de la red: subdominio → ruta interna ─────────────────────────────
// FUENTE ÚNICA. Vivía dentro de `src/proxy.ts`, que era su único lector, hasta
// que el 2026-08-13 los metadatos Open Graph necesitaron el mismo mapa AL REVÉS
// (ruta → subdominio) para poder firmar cada tarjeta de enlace con el origen
// absoluto que le corresponde. Copiarlo habría creado dos verdades: se sube un
// subdominio nuevo, el proxy lo sirve y la tarjeta de enlace sigue apuntando al
// dominio raíz. Así que el mapa vive aquí y lo importan los dos.
//
// Si añade una superficie: una línea aquí y ya la conocen el enrutado Y el
// Open Graph. Lo que NO se deriva solo es el DNS — sigue haciéndose a mano,
// patrón en docs/PARTNER_DOMAINS_SETUP.md.

/** El dominio de la red. Sin `www`: eso es un subdominio más. */
export const ROOT_DOMAIN = "ctcexport.com";

/** El host de la casa matriz. CTC Home se sirve en `www`, no en el ápex — es lo
 *  que el resto de la plataforma ya da por hecho (los enlaces absolutos a la
 *  casa matriz, la insignia de versión verificada en producción). */
export const WWW_ORIGIN = `https://www.${ROOT_DOMAIN}`;

/** Maps a subdomain label to the internal route that should serve it. */
export const SUBDOMAIN_ROUTES: Record<string, string> = {
  "kaffetal-regal": "/kaffetal-regal",
  // Cherry Picked es la PLATAFORMA de compra (owner, 2026-08-11): este
  // subdominio sirve la PORTADA que reparte sus cuatro programas — CaaS,
  // Green, Roast y X. Hasta esa fecha servía la tienda Green, que se mudó al
  // subdominio de abajo. DNS/Vercel de `cherry-picked-green`: mismo patrón de
  // docs/PARTNER_DOMAINS_SETUP.md.
  "cherry-picked": "/cherry-picked",
  "cherry-picked-green": "/cherry-picked-green",
  // Roast y X son los otros dos programas (andamiaje hasta que su lógica de
  // pedido se conecte al catálogo de Green).
  "cherry-picked-roast": "/cherry-picked-roast",
  "cherry-picked-x": "/cherry-picked-x",
  // Directorio de Especialistas del Café · Santander — la capa de PERSONAS
  // sobre el ecosistema (las otras superficies son de lotes y de café).
  // DNS/Vercel: docs/DIRECTORIO_DOMAIN_SETUP.md
  "directoriodelcafe": "/directorio",
  // Partner-node "couples" (landing + login), one subdomain per v3 node.
  // DNS/Vercel steps: docs/PARTNER_DOMAINS_SETUP.md
  "centro-calidad": "/socios/centro-calidad",
  "agente-carga": "/socios/agente-carga",
  "agente-nacionalizacion": "/socios/agente-nacionalizacion",
  "master-roaster": "/socios/master-roaster",
  // Public-facing subdomain is "ctc-content" (2026-07-16); the internal slug stays.
  "ctc-content": "/socios/estudio-contenido",
  // Superficies de captación Clase B (V4 · Fase 1): landing + project form,
  // sin login propio — depositan en `leads`. DNS/Vercel: mismo patrón de
  // docs/PARTNER_DOMAINS_SETUP.md.
  "ctc-tech": "/ctc-tech",
  // CaaS · Coffee as a Service. Se llamó «Co-Create» hasta el 2026-08-14; el
  // owner cambió el TÉRMINO, no lo que representa. El subdominio viejo sigue
  // enrutando a su propia ruta —que reenvía a /caas con un 308— para que ningún
  // enlace ya compartido, ni las tarjetas de enlace ya indexadas, caigan en un
  // 404. Las DOS entradas apuntan a rutas DISTINTAS a propósito: si las dos
  // apuntaran a `/caas`, el mapa inverso `ROUTE_SUBDOMAIN` —que se deriva de
  // este objeto— se quedaría con la última y el canonical podría acabar
  // firmando el subdominio viejo.
  "caas": "/caas",
  "co-create": "/co-create",
  "varietales": "/varietales",
  // V4 · Fase 3: la Home de Coffeed (Clase C, solo difusión) y la landing
  // pública del CTC Control Panel (el login maestro sigue en www/login).
  "coffeed": "/coffeed",
  "panel": "/control-panel",
  // V4 · Fase 4: Herramientas del Café (reparto público del tools_config).
  // OJO: los HTML viven en /tools (excluido del matcher) — la RUTA es
  // /herramientas, los archivos siguen sirviéndose desde la raíz.
  "herramientas": "/herramientas",
  // Terratalento (2026-08-02): la superficie del recolector — identidad única
  // del ecosistema, patrón Directorio.
  "terratalento": "/terratalento",
};

/** Ruta interna → subdominio. Derivado, nunca escrito a mano: si el mapa de
 *  arriba cambia, este se entera solo. */
export const ROUTE_SUBDOMAIN: Record<string, string> = Object.fromEntries(
  Object.entries(SUBDOMAIN_ROUTES).map(([sub, route]) => [route, sub])
);

// ── Superficies públicas que viven SOLO en www (2026-09-18, V5.48) ───────────
// Hasta hoy «superficie pública» y «subdominio» eran la misma cosa, así que los
// dos lectores del mapa —el sitemap y el tablero de Manejo de Plataformas—
// derivaban su lista de `SUBDOMAIN_ROUTES` y con eso les bastaba.
//
// `/ctcx-public-catalogue` rompe esa equivalencia: es una superficie pública de
// pleno derecho (tarjeta propia, canonical propio, tres idiomas) que el owner
// pidió como RUTA de la casa matriz, sin subdominio ni DNS. Sin esta lista se
// caía por dos agujeros callados a la vez:
//
//   · `sitemap.xml/route.ts` no la anunciaría — invisible para los buscadores.
//   · `ecp/plataformasActions.ts` no la listaría, y `guardarSuperficie()` la
//     rechazaría («Esa superficie no existe en el mapa de la red»): el owner no
//     podría corregir su título ni apagarla del sitemap sin un deploy, y su
//     `superficieConOverrides({ route: "/ctcx-public-catalogue" })` quedaría
//     inerte SIN fallar — el peor modo de fallo, el que no se nota.
//
// Vive aquí y no en cada lector por el mismo motivo que `SUBDOMAIN_ROUTES`: dos
// copias serían garantizar que una superficie nueva se enrute bien y se
// gobierne mal. `rutasDeLaRed()` ya añadía `"/"` a mano por esta misma razón.
//
// ⚠️ Estas rutas responden SOLO en `www` (y en el ápex). El matcher de
// `src/proxy.ts` no las excluye, así que en un subdominio se reescriben
// (`kaffetal-regal.ctcexport.com/ctcx-public-catalogue` →
// `/kaffetal-regal/ctcx-public-catalogue`) y dan 404. Por eso todo enlace que
// venga de otra superficie tiene que ser ABSOLUTO contra `WWW_ORIGIN`. La
// alternativa —meterlas en `RAIZ_COMPARTIDA` del proxy, como
// `/recuperar-acceso`— existe y no se tomó: esta superficie no es una pantalla
// de rescate que haya que servir desde cualquier puerta, y `qa-recuperacion`
// solo comprueba que esa lista CONTENGA `/recuperar-acceso`, así que no
// atraparía un error ahí.
export const RUTAS_SOLO_WWW: string[] = ["/ctcx-public-catalogue"];

/** El origen absoluto donde vive una superficie en PRODUCCIÓN.
 *
 *  `/` y cualquier ruta sin subdominio propio (p. ej. `/login`) caen en la casa
 *  matriz — que es exactamente donde se sirven. */
export function origenDeSuperficie(route: string): string {
  const sub = ROUTE_SUBDOMAIN[route];
  return sub ? `https://${sub}.${ROOT_DOMAIN}` : WWW_ORIGIN;
}
