import { metadatosDeSuperficie } from "@/lib/seo/openGraph";
import { OrganizationLd } from "@/components/JsonLd";
import { XLanding } from "@/components/cherry-picked-x/XLanding";

export const metadata = metadatosDeSuperficie({
  route: "/cherry-picked-x",
  title: "Cherry Picked X by CTC · The whole harvest, in small boxes · Coming 2027",
  description:
    "Coming 2027: the full Cherry Picked offer without Black, in per-season boxes from 3 kg — Red, Blue, Gold and Tyrian at discovery scale. Follow the build-up — Colombian Trading Company",
  siteName: "Cherry Picked X",
  image: "cherry-picked-x.jpg",
  imageAlt: "Cherry Picked X seal on a Tyrian purple background",
  locale: "en_GB",
  alternateLocale: ["es_CO", "de_DE"],
});

export default function CherryPickedXPage() {
  return (
    <>
      <OrganizationLd />
      <XLanding />
    </>
  );
}
