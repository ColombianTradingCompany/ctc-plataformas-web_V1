import { requireConsoleAccess } from "@/lib/panel/requireConsoleAccess";
import { listarDirectorioAdmin } from "../directorioActions";
import { DirectorioAdmin } from "./DirectorioAdmin";
import { InteresBoard } from "@/components/panel/interes/InteresBoard";

// ECP · Directorio del Café — verificación de fichas + moderación del muro.
// Gated by the (app) layout's requireConsoleAccess("ecp"); every action
// re-checks with requireActiveAdmin.
export default async function EcpDirectorioPage() {
  await requireConsoleAccess("ecp");
  const data = await listarDirectorioAdmin();
  return (
    <>
      <DirectorioAdmin data={data} />
      {/* La lista de espera va DEBAJO de la moderación: lo primero es lo que ya
          está dentro; esto es quien todavía está en la puerta (A6). */}
      <div style={{ marginTop: 40 }}>
        <InteresBoard
          fuente="directorio"
          titulo="Lista de espera · Directorio del Café"
          origen="la ficha del Directorio, en el índice de la red de la portada"
          intro="Quién dejó su correo y su especialidad esperando a que se abran las inscripciones. La especialidad es la que ellos mismos declararon al apuntarse — no está verificada, y sirve para saber a quién se le escribe primero."
        />
      </div>
    </>
  );
}
