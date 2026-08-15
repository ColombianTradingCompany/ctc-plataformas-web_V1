import { superficieConOverrides } from "@/lib/seo/openGraph";
import { graphLd, organizationLd, faqPageLd, gradosLd } from "@/lib/seo/jsonLd";
import { JsonLd } from "@/components/JsonLd";
import { KaffetalExperience } from "@/components/kaffetal-regal/KaffetalExperience";

export const generateMetadata = superficieConOverrides({
  route: "/kaffetal-regal",
  title: "Kaffetal Regal Â· CafÃ©s de Colombia, para el mundo",
  // La descripciÃ³n de una lÃ­nea que habÃ­a (Â«Portal del productor colombianoÂ»)
  // servÃ­a para la pestaÃ±a del navegador, pero es lo que se lee DEBAJO del
  // tÃ­tulo en WhatsApp: ahÃ­ tiene que decirle al productor quÃ© gana entrando.
  description:
    "El portal del caficultor colombiano: registre su finca y su lote, levante la Ficha TÃ©cnica una sola vez, compita en la Jornada de Arena por su Grado de Calidad CTC y vÃ©ndalo en Europa con contrato y precio pactado por escrito.",
  siteName: "Kaffetal Regal Â· CTC",
  image: "kaffetal-regal.jpg",
  imageAlt: "Logotipo de Kaffetal Regal sobre fondo verde",
});

export default function KaffetalRegalPage() {
  return (
    <>
      {/* Las 12 preguntas y los cinco grados, publicados como datos. El
          rastreador siempre llega sin sesiÃ³n, asÃ­ que lo que ve es la landing:
          describir la landing aquÃ­ es describir lo que de verdad se indexa.
          Las dos fichas apuntan a la empresa por `@id`, declarada en la casa
          matriz â€” de ahÃ­ que aquÃ­ vaya tambiÃ©n `organizationLd()`: en un
          subdominio, que Google trata como sitio aparte, la referencia sola se
          quedarÃ­a sin nada a lo que apuntar. */}
      <JsonLd data={graphLd([organizationLd(), faqPageLd(), gradosLd()])} />
      <KaffetalExperience />
    </>
  );
}
