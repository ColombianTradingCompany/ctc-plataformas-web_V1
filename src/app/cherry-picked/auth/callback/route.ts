import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createSessionClient } from "@/lib/supabase/server";

// ── La vuelta de Google de la FAMILIA Cherry Picked (portada, Roast y X) ─────
// Nació como el callback de la tienda y se quedó como red de seguridad cuando la
// tienda se mudó a /cherry-picked-green (2026-08-11). Desde la V6.20 es la vuelta
// de las tres superficies que no son la tienda: la ventana de login se pinta en
// las cuatro y cada una vuelve a SU base (`lib/auth/callbackCherryPicked.ts`).
// Roast y X reexportan este mismo GET desde su `auth/callback`.
//
// Como un login con contraseña hecho en esas tres superficies (`ProveedorDeCuenta`,
// `components/cherry-picked/sesion.tsx`), aterriza en Green con «Mi cuenta» abierta
// (`?cuenta=1`): el catálogo con precio vive allí.
//
// En producción la tienda es su subdominio propio, no un camino del origen que
// llega aquí: se vuelve a su URL canónica.
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

  return NextResponse.redirect(`${GREEN ?? `${origin}/cherry-picked-green`}?cuenta=1`);
}
