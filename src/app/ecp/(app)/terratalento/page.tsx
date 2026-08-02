import { requireConsoleAccess } from "@/lib/panel/requireConsoleAccess";
import { ConsoleScaffold } from "@/components/panel/ConsoleScaffold";

// ── Terratalento (scaffold, 2026-08-02) ──────────────────────────────────────
// El servicio del RECOLECTOR — un tipo de usuario NUEVO en la red. En una
// frase: el recolector crea su cuenta y su perfil en una superficie propia
// (landing + login, como el Directorio), una finca publica una "Jornada de
// Recolecta" desde Kaffetal Regal (módulo nuevo allá), y este módulo del ECP
// hace el MATCH: gestiona la solicitud y los recolectores potenciales.
// Se desarrolla en una sesión aparte — esta página solo planta la bandera
// para que la consola diga la verdad sobre lo que viene.

export default async function EcpTerratalentoPage() {
  await requireConsoleAccess("ecp");
  return (
    <ConsoleScaffold
      code="ECP"
      name="Terratalento"
      intro="El puente entre las fincas y las manos que recogen la cosecha: los recolectores crean su perfil en su propia superficie, las fincas publican Jornadas de Recolecta desde Kaffetal Regal, y aquí se hace el match y la gestión."
      accent="#FFCD00"
      modules={[
        {
          name: "Superficie del Recolector",
          desc: "Landing + login propios (terratalento.ctcexport.com): un nuevo tipo de cuenta donde el recolector arma su perfil y se postula para ser llamado a una finca.",
        },
        {
          name: "Jornadas de Recolecta",
          desc: "Publicadas por cada finca desde su panel de Kaffetal Regal (módulo nuevo allá): fechas, cupos y condiciones de la recolecta.",
        },
        {
          name: "Match y gestión",
          desc: "El tablero del ECP: empareja cada Jornada con los recolectores postulados, gestiona llamados y confirma cupos.",
        },
      ]}
    />
  );
}
