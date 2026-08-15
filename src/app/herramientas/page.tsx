import { superficieConOverrides } from "@/lib/seo/openGraph";
import { OrganizationLd } from "@/components/JsonLd";
import { LangProvider } from "@/components/lang/i18n";
import { loadToolAccess } from "@/lib/tools/toolAccess";
import { HerramientasLanding } from "@/components/services/HerramientasLanding";

export const generateMetadata = superficieConOverrides({
  route: "/herramientas",
  title: "Herramientas del CafÃ© Â· Calculadoras y utilidades del oficio Â· Colombian Trading Company",
  description:
    "Las herramientas de trabajo de la red CTC, abiertas al gremio: calculadoras de mermas y factor de rendimiento, la rueda del sabor, el disco Agtron y mÃ¡s. Gratis, sin instalaciÃ³n y funcionan sin internet.",
  siteName: "Herramientas del CafÃ© Â· CTC",
  image: "herramientas.jpg",
  imageAlt: "Logotipo de Herramientas del CafÃ© sobre fondo azul corporativo",
});

// La lista llega YA FILTRADA por el servidor: quÃ© herramienta ve un visitante
// anÃ³nimo (Default) y cuÃ¡les se suman con una cuenta de la red (Plus) lo decide
// el registro `tools`, administrado en ECP â†’ Herramientas del cafÃ©. Se rinde por
// request a propÃ³sito (la sesiÃ³n cambia el reparto, y publicar una versiÃ³n nueva
// tiene que verse sin esperar a un deploy).
export const dynamic = "force-dynamic";

export default async function HerramientasPage() {
  const access = await loadToolAccess("web");
  return (
    <div data-theme="ctc-home">
      <OrganizationLd />
      <LangProvider storageKey="ctc-lang">
        <HerramientasLanding tools={access.tools} isPlus={access.isPlus} lockedCount={access.lockedCount} />
      </LangProvider>
    </div>
  );
}
