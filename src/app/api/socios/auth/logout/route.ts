import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createSessionClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const session = await createSessionClient();
  await session.auth.signOut();
  const node = new URL(request.url).searchParams.get("node");
  return NextResponse.redirect(new URL(node ? `/socios/${node}` : "/", request.url), { status: 303 });
}
