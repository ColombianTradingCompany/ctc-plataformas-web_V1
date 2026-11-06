import { redirect } from "next/navigation";
import { createPanelSessionClient } from "@/lib/supabase/server";
import { leerPanelUser } from "@/lib/panel/panelUsers";
import { ChangePasswordForm } from "./ChangePasswordForm";

// Forced password-change step. Does its OWN light auth on purpose: the console
// guard redirects HERE while must_change_password is set, so routing this page
// through that same guard would loop.
export default async function CambiarContrasenaPage() {
  const session = await createPanelSessionClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await session.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "bcp_admin") redirect("/login");

  // Nothing pending? Send them to the consoles.
  // Si no se pueden leer los permisos, no se cambia nada aquí: al login, como la consola.
  const lectura = await leerPanelUser(user.id);
  if (!lectura.ok) redirect("/login");
  if (!lectura.row?.must_change_password) redirect("/panel");

  return <ChangePasswordForm />;
}
