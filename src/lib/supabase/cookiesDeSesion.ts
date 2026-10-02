import type { CookieOptions } from "@supabase/ssr";

// ── Las cookies de sesión que escribe el servidor: UNA por nombre, y la que vale (V5.138, 2026-10-02) ───────────────────
// El owner: «La Asistencia a Proveedores no está cargando nada de la información correspondiente». Los registros de Auth
// lo explicaron: Kaffetal Regal seguía pidiendo los datos de una cuenta que ya no existía, aunque la sesión asistida de
// otro productor se había abierto bien.
//
// LA CAUSA. Al cerrar una sesión —o al cambiarla por otra que ocupa otros trozos (`…-auth-token` · `.0` · `.1`)—,
// `@supabase/ssr` pide borrar cada cookie vieja DOS veces: con `Domain=.ctcexport.com` y sin dominio (la variante
// host-only, por si quedó de una migración). Son dos `Set-Cookie` del MISMO nombre. Pero `cookies()` de Next (y
// `response.cookies` del proxy) es un mapa POR NOMBRE: el segundo `.set()` reemplaza al primero. Llegaba al navegador
// solo el borrado host-only —que no borra nada— y la cookie compartida seguía viva:
//   · «Cerrar sesión asistida» no cerraba: el navegador seguía siendo el productor;
//   · al entrar como OTRO productor, el trozo viejo le tapaba la sesión nueva (`…-auth-token` se lee antes que `.0`):
//     Kaffetal Regal mostraba al productor anterior — o nada, si su cuenta ya se había borrado.
//
// LA REGLA. De las escrituras de un mismo nombre queda UNA: un valor le gana a un borrado; entre dos borrados, el que
// lleva dominio (es el que alcanza a la cookie compartida). El borrado host-only solo lo puede mandar quien arma la
// respuesta a mano —el proxy, como encabezado crudo—; en una Server Action no hay cómo mandar los dos.

export type CookieDeSesion = { name: string; value: string; options: CookieOptions };

const esValor = (c: CookieDeSesion) => c.value !== "";

/** Colapsa las escrituras repetidas de un mismo nombre en la que tiene que llegar al navegador. Conserva el orden. */
export function unaPorNombre(cookies: readonly CookieDeSesion[]): CookieDeSesion[] {
  const porNombre = new Map<string, CookieDeSesion>();
  for (const c of cookies) {
    const previa = porNombre.get(c.name);
    if (!previa || esValor(c)) {
      porNombre.set(c.name, c); // la primera, o un valor (el último valor escrito es el vigente)
      continue;
    }
    if (esValor(previa)) continue; // un borrado no le quita el sitio a un valor
    if (!previa.options?.domain && c.options?.domain) porNombre.set(c.name, c); // dos borrados: manda el que lleva dominio
  }
  return [...porNombre.values()];
}

/** El borrado de la variante host-only de una cookie, como encabezado crudo (solo sirve donde la respuesta se arma a mano). */
export const borradoHostOnly = (name: string) => `${name}=; Path=/; Max-Age=0`;

/** Auth respondió que el usuario del token ya no existe (su cuenta se borró con la sesión abierta). */
export function esUsuarioInexistente(error: unknown): boolean {
  return !!error && typeof error === "object" && (error as { code?: unknown }).code === "user_not_found";
}
