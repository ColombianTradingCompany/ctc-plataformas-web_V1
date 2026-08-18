import { superficieConOverrides } from "@/lib/seo/openGraph";
import { JsonLd } from "@/components/JsonLd";
import { graphLd, organizationLd, gradosLd } from "@/lib/seo/jsonLd";
import { CherryPickedExperience } from "@/components/cherry-picked/CherryPickedExperience";

// ── Cherry Picked Green · la tienda ─────────────────────────────────────────
// Vivía en `/cherry-picked` hasta el 2026-08-11. Se mudó aquí cuando el owner
// definió Cherry Picked como PLATAFORMA con cuatro programas dentro (CaaS,
// Green, Roast y X): `/cherry-picked` pasó a ser la portada que los reparte, y el
// verde por fracciones —que es lo que ese nombre significaba— se quedó con su
// propia puerta. El componente no cambió ni una línea.

export const generateMetadata = superficieConOverrides({
  route: "/cherry-picked-green",
  title: "Cherry Picked Green by CTC · Colombian microlots in fractions",
  description:
    "Colombian green-coffee microlots for European roasters, graded in the Kaffetal Regal Arena and sold in fractions from Amsterdam — Colombian Trading Company",
  siteName: "Cherry Picked Green",
  image: "cherry-picked-green.jpg",
  imageAlt: "Cherry Picked Green seal on a deep green background",
  locale: "en_GB",
  alternateLocale: ["es_CO", "de_DE"],
});

export default function CherryPickedGreenPage() {
  return (
    <>
      {/* Los grados van AQUÍ y no solo en la portada (2026-08-15): en la tienda el
          grado ES la taxonomía del producto —el catálogo se navega por pestañas
          Black/Red/Blue/Gold/Tyrian—, así que ésta es la página donde declarar
          el vocabulario tiene el respaldo más fuerte. Mismo grafo que
          `/cherry-picked`; el dato sigue saliendo de `lib/grados/definicion.ts`. */}
      <JsonLd data={graphLd([organizationLd(), gradosLd()])} />
      <CherryPickedExperience />
    </>
  );
}
