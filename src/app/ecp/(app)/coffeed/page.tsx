import type { Metadata } from "next";
import { requireConsoleAccess } from "@/lib/panel/requireConsoleAccess";
import { CoffeedConsole } from "@/components/coffeed/CoffeedConsole";

export const metadata: Metadata = { title: "Coffeed · ECP", robots: { index: false, follow: false } };

// Las Server Actions heredan el segment config de la page (lección GVG): el
// barrido de 7 días, la extracción y la redacción del post son llamadas largas
// con búsqueda web y se pasan del timeout por defecto de Vercel.
export const maxDuration = 300;

export default async function CoffeedPage() {
  await requireConsoleAccess("ecp");
  return <CoffeedConsole />;
}
