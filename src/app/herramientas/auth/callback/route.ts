import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createSessionClient } from "@/lib/supabase/server";
import { COOKIE_SIGUIENTE, rutaDeAcceso, siguienteSeguro, VUELTA_TALLER } from "@/lib/tools/entrada";

// ── Herramientas del Café · el callback de Google (A8b, 2026-08-19) ─────────
// El séptimo callback de la casa (KR, CP viejo, CP Green, Directorio,
// Terratalento, raíz — y ahora éste). Mismo patrón: canjear el código por la
// sesión y volver a la superficie. La ruta cuelga de la superficie para que el
// proxy la sirva por construcción en herramientas.ctcexport.com (gotcha 12).
//
// ⚠️ La URL COMPLETA tiene que estar en la allowlist de Supabase
// (Authentication → URL Configuration → Redirect URLs):
//   https://herramientas.ctcexport.com/herramientas/auth/callback
// Si falta, Google completa igual pero GoTrue devuelve al Site URL — el
// usuario aterriza en la portada CON sesión (la cookie es compartida) en vez
// de en el taller. Degradado, no roto; la entrada en la lista lo deja fino.
//
// AQUÍ NO SE PROMUEVE NADA, a diferencia del callback de KR (que asciende el
// buyer inerte a productor). Entrar por Herramientas no te hace productor ni
// comprador ni experto: solo identifica. Una cuenta nueva de Google queda en
// el default inerte y el taller le explica las tres puertas de la membresía —
// que es exactamente lo que debe pasar.

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const origin = request.nextUrl.origin;

  // TAR-121: si la puerta dejó un destino (la herramienta de la que vino), se vuelve ahí — validado OTRA vez aquí: la
  // cookie viene del navegador. Se lee ANTES de los caminos de error para no perderlo si Google falla o se cancela, y la
  // cookie se borra SIEMPRE (una vieja no puede secuestrar un ingreso posterior).
  // ⚠️ `request.cookies` YA decodifica el valor (decodeURIComponent en el parser de Next): decodificarlo otra vez convertiría
  // el `volver` codificado DENTRO de la URL en parámetros sueltos de la de fuera.
  const crudo = request.cookies.get(COOKIE_SIGUIENTE)?.value;
  const destino = siguienteSeguro(crudo ?? null) ?? VUELTA_TALLER;
  const responder = (url: string) => {
    const res = NextResponse.redirect(url);
    if (crudo !== undefined) res.cookies.set(COOKIE_SIGUIENTE, "", { path: "/", maxAge: 0 });
    return res;
  };

  // Sin código o con error: de vuelta a la puerta, que conserva el destino en `?siguiente=` para el siguiente intento.
  if (!code) {
    return responder(`${origin}${rutaDeAcceso(destino)}`);
  }

  const sessionClient = await createSessionClient();
  const { data, error } = await sessionClient.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    return responder(`${origin}${rutaDeAcceso(destino)}`);
  }

  return responder(`${origin}${destino}`);
}
