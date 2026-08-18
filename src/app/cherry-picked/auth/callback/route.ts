import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createSessionClient } from "@/lib/supabase/server";

// A dónde vive la tienda. En producción es su subdominio propio, no un camino
// del subdominio de la portada: `${origin}/cherry-picked-green` desde
// `cherry-picked.ctcexport.com` TAMBIÉN sirve la tienda —el proxy compara el
// camino con `startsWith('/cherry-picked')` y `/cherry-picked-green` pasa el
// filtro por puro prefijo de cadena— pero deja al comprador en el hostname
// equivocado, con una URL que no es la canónica de la tienda.
const GREEN =
  process.env.NODE_ENV === "production" ? "https://cherry-picked-green.ctcexport.com" : null;

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const origin = request.nextUrl.origin;

  if (code) {
    const sessionClient = await createSessionClient();
    // Google sign-in carries no role metadata, but the shared handle_new_user
    // trigger already defaults a role-less new user to 'buyer' -- exactly
    // what a Cherry Picked signup needs, so no correction step is required here.
    await sessionClient.auth.exchangeCodeForSession(code);
  }

  // La tienda se mudó a /cherry-picked-green (2026-08-11) y su callback con
  // ella. Esta ruta se queda como red de seguridad: un consentimiento de Google
  // que salió con la URL vieja —una pestaña abierta desde antes del despliegue—
  // sigue canjeando su código y aterriza donde ahora vive la tienda.
  return NextResponse.redirect(GREEN ?? `${origin}/cherry-picked-green`);
}
