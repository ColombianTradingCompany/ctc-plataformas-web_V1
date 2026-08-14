import { metadatosDeSuperficie } from "@/lib/seo/openGraph";
import { OrganizationLd } from "@/components/JsonLd";
import { CherryPickedExperience } from "@/components/cherry-picked/CherryPickedExperience";

// ── Cherry Picked Green · la tienda ─────────────────────────────────────────
// Vivía en `/cherry-picked` hasta el 2026-08-11. Se mudó aquí cuando el owner
// definió Cherry Picked como PLATAFORMA con cuatro programas dentro (Co-Create,
// Green, Roast y X): `/cherry-picked` pasó a ser el hub que los reparte, y el
// verde por fracciones —que es lo que ese nombre significaba— se quedó con su
// propia puerta. El componente no cambió ni una línea.

export const metadata = metadatosDeSuperficie({
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
      <OrganizationLd />
      <CherryPickedExperience />
    </>
  );
}
