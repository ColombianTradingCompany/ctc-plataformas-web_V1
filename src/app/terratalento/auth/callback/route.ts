import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createSessionClient } from "@/lib/supabase/server";

// Google sign-in para Terratalento. Como el del Directorio, NO promueve la
// cuenta a ningún rol: el recolector es ortogonal al modelo productor/comprador.
// Una cuenta nueva de Google aterriza aquí como el buyer inerte por defecto del
// trigger y simplemente gana su fila en `terratalento_recolectores` al completar
// el perfil; una cuenta existente de Kaffetal Regal / Cherry Picked / Directorio
// entra con la MISMA identidad y conserva su rol intacto.
//
// OJO con la ruta: el `redirectTo` del cliente incluye el prefijo
// `/terratalento` a propósito. `proxy.ts` no reescribe cuando la ruta ya empieza
// por la base, así que la MISMA URL funciona en el subdominio y en dev.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const origin = request.nextUrl.origin;

  if (!code) {
    return NextResponse.redirect(`${origin}/terratalento`);
  }

  const sessionClient = await createSessionClient();
  await sessionClient.auth.exchangeCodeForSession(code);

  return NextResponse.redirect(`${origin}/terratalento`);
}
