import { redirect } from "next/navigation";
import { createSessionClient } from "@/lib/supabase/server";
import { getPanelUser } from "@/lib/panel/panelUsers";
import { ChangePasswordForm } from "./ChangePasswordForm";

// Forced password-change step. Does its OWN light auth on purpose: the console
// guard redirects HERE while must_change_password is set, so routing this page
// through that same guard would loop.
export default async function CambiarContrasenaPage() {
  const session = await createSessionClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await session.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "bcp_admin") redirect("/login");

  // Nothing pending? Send them to the consoles.
  const row = await getPanelUser(user.id);
  if (!row?.must_change_password) redirect("/panel");

  return <ChangePasswordForm />;
}
