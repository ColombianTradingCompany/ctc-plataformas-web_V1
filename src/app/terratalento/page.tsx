import { superficieConOverrides } from "@/lib/seo/openGraph";
import { OrganizationLd } from "@/components/JsonLd";
import { LangProvider } from "@/components/lang/i18n";
import { TerratalentoExperience } from "@/components/terratalento/TerratalentoExperience";

export const generateMetadata = superficieConOverrides({
  route: "/terratalento",
  title: "Terratalento Â· Las manos que recogen la cosecha Â· Colombian Trading Company",
  description:
    "El puente entre las fincas de la red CTC y los recolectores de cafÃ©: crea tu perfil una sola vez, postÃºlate a las Jornadas de Recolecta y CTC hace el llamado. Gratis para el recolector.",
  siteName: "Terratalento Â· CTC",
  image: "terratalento.jpg",
  imageAlt: "Logotipo de Terratalento sobre fondo verde",
});

// Superficie Clase A (identidad Ãºnica de la red, ortogonal a profiles.role â€”
// patrÃ³n Directorio). Contenido en espaÃ±ol a propÃ³sito: es la superficie del
// campo. Tema verde de Kaffetal Regal.
export default function TerratalentoPage() {
  return (
    <div data-theme="kaffetal-regal">
      <OrganizationLd />
      <LangProvider storageKey="ctc-lang">
        <TerratalentoExperience />
      </LangProvider>
    </div>
  );
}
