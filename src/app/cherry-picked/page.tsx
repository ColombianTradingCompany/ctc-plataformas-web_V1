import { superficieConOverrides } from "@/lib/seo/openGraph";
import { graphLd, organizationLd, gradosLd } from "@/lib/seo/jsonLd";
import { JsonLd } from "@/components/JsonLd";
import { HubLanding } from "@/components/cherry-picked-hub/HubLanding";

// ── Cherry Picked · el hub de la plataforma de compra ───────────────────────
// Esta ruta servía la TIENDA de café verde hasta el 2026-08-11. El owner definió
// Cherry Picked como la PLATAFORMA con cuatro programas dentro (CaaS,
// Green, Roast y X), así que aquí queda el repartidor y la tienda se mudó a
// `/cherry-picked-green`, con su propio subdominio.
//
// Un marcador viejo a cherry-picked.ctcexport.com aterriza aquí y encuentra el
// selector con Green en primera fila: se pierde un clic, no el camino.

export const generateMetadata = superficieConOverrides({
  route: "/cherry-picked",
  title: "Cherry Picked by CTC · The buying platform: CaaS, Green, Roast and X",
  description:
    "One traced Colombian origin, four ways to buy it: CaaS to build your own supply, Green for microlots in fractions from Amsterdam, Roast and X from 2027 — Colombian Trading Company",
  siteName: "Cherry Picked by CTC",
  image: "cherry-picked.jpg",
  imageAlt: "Cherry Picked by CTC logo on a deep green background",
  // La familia Cherry Picked es trilingüe (components/cherry-picked/i18n.tsx) y
  // habla inglés por defecto: su lector es el tostador europeo.
  locale: "en_GB",
  alternateLocale: ["es_CO", "de_DE"],
});

export default function CherryPickedHubPage() {
  return (
    <>
      {/* El hub lleva la empresa y el vocabulario de grados: es la superficie
          donde un tostador europeo pregunta «¿qué significa Blue?» — y es
          exactamente el hecho que un modelo puede citar sin inventarse nada. */}
      <JsonLd data={graphLd([organizationLd(), gradosLd()])} />
      <HubLanding />
    </>
  );
}
