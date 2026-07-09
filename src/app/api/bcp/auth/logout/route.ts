import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createSessionClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const session = await createSessionClient();
  await session.auth.signOut();
  return NextResponse.redirect(new URL("/bcp/login", request.url));
}
