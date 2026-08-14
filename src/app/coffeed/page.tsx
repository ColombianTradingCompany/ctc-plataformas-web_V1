import { metadatosDeSuperficie } from "@/lib/seo/openGraph";
import { LangProvider } from "@/components/lang/i18n";
import { CoffeedHome } from "@/components/coffeed/CoffeedHome";

export const metadata = metadatosDeSuperficie({
  route: "/coffeed",
  title: "Coffeed · El noticiero de la red del café · Colombian Trading Company",
  description:
    "El muro de noticias de la red CTC: capítulos breves sobre el mercado del café — cosechas, precios, regulación y oficio — con cada afirmación trazada a su fuente. Producido por el estudio editorial de CTC.",
  siteName: "Coffeed · CTC",
  image: "coffeed.jpg",
  imageAlt: "Logotipo de Coffeed sobre fondo azul corporativo",
});

// Superficie Clase C (V4 · Fase 3): SOLO difusión — sin login, sin captación.
// El muro carga solo capítulos `published` + anuncios via getCoffeedWall().
export default function CoffeedPage() {
  return (
    <div data-theme="ctc-home">
      <LangProvider storageKey="ctc-lang">
        <CoffeedHome />
      </LangProvider>
    </div>
  );
}
