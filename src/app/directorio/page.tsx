import { superficieConOverrides } from "@/lib/seo/openGraph";
import { OrganizationLd } from "@/components/JsonLd";
import { DirectorioExperience } from "@/components/directorio/DirectorioExperience";

export const generateMetadata = superficieConOverrides({
  route: "/directorio",
  title: "Directorio de Especialistas del Café · Colombia — CTC",
  description:
    "Directorio Oficial de Especialistas en Café de Colombia. Inscripción gratuita para caficultores, baristas, tostadores, catadores y formadores del país. Una iniciativa de Colombian Trading Company, con Kaffetal Regal y Cherry Picked.",
  siteName: "Directorio del Café",
  image: "directorio.jpg",
  imageAlt: "Logotipo del Directorio del Café sobre fondo violeta",
});

export default function DirectorioPage() {
  return (
    <>
      <OrganizationLd />
      <DirectorioExperience />
    </>
  );
}
