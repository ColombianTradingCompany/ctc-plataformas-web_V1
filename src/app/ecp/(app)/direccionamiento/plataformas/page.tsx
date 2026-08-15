import { requireConsoleAccess } from "@/lib/panel/requireConsoleAccess";
import { cargarHerramientasSeo, cargarSuperficies } from "../plataformasActions";
import { PlataformasBoard } from "@/components/panel/direccionamiento/PlataformasBoard";

// ── ECP · Direccionamiento · Manejo de Plataformas (2026-08-15) ──────────────
// Cómo se presenta cada superficie de la red hacia afuera: el título y la
// descripción con los que aparece en un buscador y si entra en el sitemap.
//
// Se rinde por request: lo que se guarda aquí cambia lo que sirven las
// superficies, y verlo con retraso sería peor que no verlo.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Manejo de Plataformas · Direccionamiento · ECP",
};

export default async function PlataformasPage() {
  await requireConsoleAccess("ecp");
  const [superficies, herramientas] = await Promise.all([cargarSuperficies(), cargarHerramientasSeo()]);
  return <PlataformasBoard superficies={superficies} herramientas={herramientas} />;
}
