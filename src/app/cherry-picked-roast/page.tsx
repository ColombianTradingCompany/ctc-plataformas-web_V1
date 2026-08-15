import { superficieConOverrides } from "@/lib/seo/openGraph";
import { OrganizationLd } from "@/components/JsonLd";
import { RoastLanding } from "@/components/cherry-picked-roast/RoastLanding";

export const generateMetadata = superficieConOverrides({
  route: "/cherry-picked-roast",
  title: "Cherry Picked Roast by CTC Â· The full Green offer, roasted Â· Coming 2027",
  description:
    "Coming 2027: every Cherry Picked Green lot, roasted in Europe by the CTC Master Roaster â€” Green price + 9.50 â‚¬/kg fulfillment, your label or ours, same lot passport. Follow the build-up â€” Colombian Trading Company",
  siteName: "Cherry Picked Roast",
  image: "cherry-picked-roast.jpg",
  imageAlt: "Cherry Picked Roast seal on a coffee-brown background",
  locale: "en_GB",
  alternateLocale: ["es_CO", "de_DE"],
});

export default function CherryPickedRoastPage() {
  return (
    <>
      <OrganizationLd />
      <RoastLanding />
    </>
  );
}
