import { requireConsoleAccess } from "@/lib/panel/requireConsoleAccess";
import { listarDirectorioAdmin } from "../directorioActions";
import { DirectorioAdmin } from "./DirectorioAdmin";

// ECP · Directorio del Café — verificación de fichas + moderación del muro.
// Gated by the (app) layout's requireConsoleAccess("ecp"); every action
// re-checks with requireActiveAdmin.
export default async function EcpDirectorioPage() {
  await requireConsoleAccess("ecp");
  const data = await listarDirectorioAdmin();
  return <DirectorioAdmin data={data} />;
}
