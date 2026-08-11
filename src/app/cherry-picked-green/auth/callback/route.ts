import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createSessionClient } from "@/lib/supabase/server";

// El callback de Google de la TIENDA. Se mudó con ella (2026-08-11): la ruta
// tiene que empezar por el mismo prefijo que sirve el subdominio, porque el
// proxy antepone la base a cualquier camino que no la lleve ya — desde
// `cherry-picked-green.ctcexport.com`, un `/cherry-picked/auth/callback` se
// reescribiría a `/cherry-picked-green/cherry-picked/auth/callback` y sería 404.

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

  return NextResponse.redirect(`${origin}/cherry-picked-green`);
}
