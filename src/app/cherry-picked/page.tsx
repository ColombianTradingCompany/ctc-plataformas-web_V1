import { superficieConOverrides } from "@/lib/seo/openGraph";
import { graphLd, organizationLd, gradosLd } from "@/lib/seo/jsonLd";
import { JsonLd } from "@/components/JsonLd";
import { HubLanding } from "@/components/cherry-picked-hub/HubLanding";

// â”€â”€ Cherry Picked Â· el hub de la plataforma de compra â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Esta ruta servÃ­a la TIENDA de cafÃ© verde hasta el 2026-08-11. El owner definiÃ³
// Cherry Picked como la PLATAFORMA con cuatro programas dentro (CaaS,
// Green, Roast y X), asÃ­ que aquÃ­ queda el repartidor y la tienda se mudÃ³ a
// `/cherry-picked-green`, con su propio subdominio.
//
// Un marcador viejo a cherry-picked.ctcexport.com aterriza aquÃ­ y encuentra el
// selector con Green en primera fila: se pierde un clic, no el camino.

export const generateMetadata = superficieConOverrides({
  route: "/cherry-picked",
  title: "Cherry Picked by CTC Â· The buying platform: CaaS, Green, Roast and X",
  description:
    "One traced Colombian origin, four ways to buy it: CaaS to build your own supply, Green for microlots in fractions from Amsterdam, Roast and X from 2027 â€” Colombian Trading Company",
  siteName: "Cherry Picked by CTC",
  image: "cherry-picked.jpg",
  imageAlt: "Cherry Picked by CTC logo on a deep green background",
  // La familia Cherry Picked es trilingÃ¼e (components/cherry-picked/i18n.tsx) y
  // habla inglÃ©s por defecto: su lector es el tostador europeo.
  locale: "en_GB",
  alternateLocale: ["es_CO", "de_DE"],
});

export default function CherryPickedHubPage() {
  return (
    <>
      {/* El hub lleva la empresa y el vocabulario de grados: es la superficie
          donde un tostador europeo pregunta Â«Â¿quÃ© significa Blue?Â» â€” y es
          exactamente el hecho que un modelo puede citar sin inventarse nada. */}
      <JsonLd data={graphLd([organizationLd(), gradosLd()])} />
      <HubLanding />
    </>
  );
}
