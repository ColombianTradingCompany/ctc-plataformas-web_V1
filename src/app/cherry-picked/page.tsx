import { HubLanding } from "@/components/cherry-picked-hub/HubLanding";

// ── Cherry Picked · el hub de la plataforma de compra ───────────────────────
// Esta ruta servía la TIENDA de café verde hasta el 2026-08-11. El owner definió
// Cherry Picked como la PLATAFORMA con cuatro programas dentro (Co-Create,
// Green, Roast y X), así que aquí queda el repartidor y la tienda se mudó a
// `/cherry-picked-green`, con su propio subdominio.
//
// Un marcador viejo a cherry-picked.ctcexport.com aterriza aquí y encuentra el
// selector con Green en primera fila: se pierde un clic, no el camino.

export const metadata = {
  title: "Cherry Picked by CTC · The buying platform: Co-Create, Green, Roast and X",
  description:
    "One traced Colombian origin, four ways to buy it: Co-Create to build your own supply, Green for microlots in fractions from Amsterdam, Roast and X from 2027 — Colombian Trading Company",
};

export default function CherryPickedHubPage() {
  return <HubLanding />;
}
