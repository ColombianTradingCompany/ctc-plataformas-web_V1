import { superficieConOverrides } from "@/lib/seo/openGraph";
import { JsonLd } from "@/components/JsonLd";
import { graphLd, organizationLd, gradosLd } from "@/lib/seo/jsonLd";
import { CherryPickedExperience } from "@/components/cherry-picked/CherryPickedExperience";

// â”€â”€ Cherry Picked Green Â· la tienda â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// VivÃ­a en `/cherry-picked` hasta el 2026-08-11. Se mudÃ³ aquÃ­ cuando el owner
// definiÃ³ Cherry Picked como PLATAFORMA con cuatro programas dentro (CaaS,
// Green, Roast y X): `/cherry-picked` pasÃ³ a ser el hub que los reparte, y el
// verde por fracciones â€”que es lo que ese nombre significabaâ€” se quedÃ³ con su
// propia puerta. El componente no cambiÃ³ ni una lÃ­nea.

export const generateMetadata = superficieConOverrides({
  route: "/cherry-picked-green",
  title: "Cherry Picked Green by CTC Â· Colombian microlots in fractions",
  description:
    "Colombian green-coffee microlots for European roasters, graded in the Kaffetal Regal Arena and sold in fractions from Amsterdam â€” Colombian Trading Company",
  siteName: "Cherry Picked Green",
  image: "cherry-picked-green.jpg",
  imageAlt: "Cherry Picked Green seal on a deep green background",
  locale: "en_GB",
  alternateLocale: ["es_CO", "de_DE"],
});

export default function CherryPickedGreenPage() {
  return (
    <>
      {/* Los grados van AQUÃ y no solo en el hub (2026-08-15): en la tienda el
          grado ES la taxonomÃ­a del producto â€”el catÃ¡logo se navega por pestaÃ±as
          Black/Red/Blue/Gold/Tyrianâ€”, asÃ­ que Ã©sta es la pÃ¡gina donde declarar
          el vocabulario tiene el respaldo mÃ¡s fuerte. Mismo grafo que
          `/cherry-picked`; el dato sigue saliendo de `lib/grados/definicion.ts`. */}
      <JsonLd data={graphLd([organizationLd(), gradosLd()])} />
      <CherryPickedExperience />
    </>
  );
}
