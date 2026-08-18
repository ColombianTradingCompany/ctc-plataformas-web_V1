import { superficieConOverrides } from "@/lib/seo/openGraph";
import { graphLd, organizationLd, faqPageLd, gradosLd } from "@/lib/seo/jsonLd";
import { JsonLd } from "@/components/JsonLd";
import { KaffetalExperience } from "@/components/kaffetal-regal/KaffetalExperience";

export const generateMetadata = superficieConOverrides({
  route: "/kaffetal-regal",
  title: "Kaffetal Regal · Cafés de Colombia, para el mundo",
  // La descripción de una línea que había («Portal del productor colombiano»)
  // servía para la pestaña del navegador, pero es lo que se lee DEBAJO del
  // título en WhatsApp: ahí tiene que decirle al productor qué gana entrando.
  description:
    "El portal del caficultor colombiano: registre su finca y su lote, levante la Ficha Técnica una sola vez, compita en la Jornada de Arena por su Grado de Calidad CTC y véndalo en Europa con contrato y precio pactado por escrito.",
  siteName: "Kaffetal Regal · CTC",
  image: "kaffetal-regal.jpg",
  imageAlt: "Logotipo de Kaffetal Regal sobre fondo verde",
});

export default function KaffetalRegalPage() {
  return (
    <>
      {/* Las 12 preguntas y los cinco grados, publicados como datos. El
          rastreador siempre llega sin sesión, así que lo que ve es la landing:
          describir la landing aquí es describir lo que de verdad se indexa.
          Las dos fichas apuntan a la empresa por `@id`, declarada en la casa
          matriz — de ahí que aquí vaya también `organizationLd()`: en un
          subdominio, que Google trata como sitio aparte, la referencia sola se
          quedaría sin nada a lo que apuntar. */}
      <JsonLd data={graphLd([organizationLd(), faqPageLd(), gradosLd()])} />
      <KaffetalExperience />
    </>
  );
}
