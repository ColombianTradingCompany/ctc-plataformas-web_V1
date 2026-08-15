import { superficieConOverrides } from "@/lib/seo/openGraph";
import { OrganizationLd } from "@/components/JsonLd";
import { DirectorioExperience } from "@/components/directorio/DirectorioExperience";

export const generateMetadata = superficieConOverrides({
  route: "/directorio",
  title: "Directorio de Especialistas del CafÃ© Â· Colombia â€” CTC",
  description:
    "Directorio Oficial de Especialistas en CafÃ© de Colombia. InscripciÃ³n gratuita para caficultores, baristas, tostadores, catadores y formadores del paÃ­s. Una iniciativa de Colombian Trading Company, con Kaffetal Regal y Cherry Picked.",
  siteName: "Directorio del CafÃ©",
  image: "directorio.jpg",
  imageAlt: "Logotipo del Directorio del CafÃ© sobre fondo violeta",
});

export default function DirectorioPage() {
  return (
    <>
      <OrganizationLd />
      <DirectorioExperience />
    </>
  );
}
