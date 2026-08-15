import { superficieConOverrides } from "@/lib/seo/openGraph";
import { OrganizationLd } from "@/components/JsonLd";
import { LangProvider } from "@/components/lang/i18n";
import { CoffeedHome } from "@/components/coffeed/CoffeedHome";

export const generateMetadata = superficieConOverrides({
  route: "/coffeed",
  title: "Coffeed Â· El noticiero de la red del cafÃ© Â· Colombian Trading Company",
  description:
    "El muro de noticias de la red CTC: capÃ­tulos breves sobre el mercado del cafÃ© â€” cosechas, precios, regulaciÃ³n y oficio â€” con cada afirmaciÃ³n trazada a su fuente. Producido por el estudio editorial de CTC.",
  siteName: "Coffeed Â· CTC",
  image: "coffeed.jpg",
  imageAlt: "Logotipo de Coffeed sobre fondo azul corporativo",
});

// Superficie Clase C (V4 Â· Fase 3): SOLO difusiÃ³n â€” sin login, sin captaciÃ³n.
// El muro carga solo capÃ­tulos `published` + anuncios via getCoffeedWall().
export default function CoffeedPage() {
  return (
    <div data-theme="ctc-home">
      <OrganizationLd />
      <LangProvider storageKey="ctc-lang">
        <CoffeedHome />
      </LangProvider>
    </div>
  );
}
