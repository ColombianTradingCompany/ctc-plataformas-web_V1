import { metadatosDeSuperficie } from "@/lib/seo/openGraph";
import { KaffetalExperience } from "@/components/kaffetal-regal/KaffetalExperience";

export const metadata = metadatosDeSuperficie({
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
  return <KaffetalExperience />;
}
