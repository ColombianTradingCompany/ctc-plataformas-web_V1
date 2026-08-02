import { LangProvider } from "@/components/lang/i18n";
import { TerratalentoExperience } from "@/components/terratalento/TerratalentoExperience";

export const metadata = {
  title: "Terratalento · Las manos que recogen la cosecha · Colombian Trading Company",
  description:
    "El puente entre las fincas de la red CTC y los recolectores de café: crea tu perfil una sola vez, postúlate a las Jornadas de Recolecta y CTC hace el llamado. Gratis para el recolector.",
};

// Superficie Clase A (identidad única de la red, ortogonal a profiles.role —
// patrón Directorio). Contenido en español a propósito: es la superficie del
// campo. Tema verde de Kaffetal Regal.
export default function TerratalentoPage() {
  return (
    <div data-theme="kaffetal-regal">
      <LangProvider storageKey="ctc-lang">
        <TerratalentoExperience />
      </LangProvider>
    </div>
  );
}
