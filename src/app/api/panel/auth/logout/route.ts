import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createPanelSessionClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  // Cierra SOLO la sesión interna (su propia cookie): salir del BCP ya no
  // desloguea al mismo navegador de KR/Cherry Picked/socios.
  const session = await createPanelSessionClient();
  await session.auth.signOut();
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}
