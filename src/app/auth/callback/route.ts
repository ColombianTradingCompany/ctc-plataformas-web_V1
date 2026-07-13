import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createSessionClient } from "@/lib/supabase/server";

// CTC Home's own OAuth callback for the "Escríbenos" Google path. Deliberately
// minimal: exchange the code and bounce back to the landing page, where the
// ContactModal resumes the stashed lead. NO role logic here -- the pillar isn't
// trustworthy in a URL; all role decisions happen server-side in
// submitLeadAuthed, which knows the pillar. (This is also what keeps a
// Co-Create lead from being promoted to producer by the Kaffetal callback.)
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const origin = request.nextUrl.origin;

  if (code) {
    const sessionClient = await createSessionClient();
    await sessionClient.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(`${origin}/?lead=resume`);
}
