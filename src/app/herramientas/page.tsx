import { LangProvider } from "@/components/lang/i18n";
import { loadToolAccess } from "@/lib/tools/toolAccess";
import { HerramientasLanding } from "@/components/services/HerramientasLanding";

export const metadata = {
  title: "Herramientas del Café · Calculadoras y utilidades del oficio · Colombian Trading Company",
  description:
    "Las herramientas de trabajo de la red CTC, abiertas al gremio: calculadoras de mermas y factor de rendimiento, la rueda del sabor, el disco Agtron y más. Gratis, sin instalación y funcionan sin internet.",
};

// La lista llega YA FILTRADA por el servidor: qué herramienta ve un visitante
// anónimo (Default) y cuáles se suman con una cuenta de la red (Plus) lo
// decide platform_settings.tools_config, administrado en ECP → Herramientas →
// Disponibilidad. Se rinde por request a propósito (la sesión cambia el reparto).
export const dynamic = "force-dynamic";

export default async function HerramientasPage() {
  const access = await loadToolAccess("web");
  return (
    <div data-theme="ctc-home">
      <LangProvider storageKey="ctc-lang">
        <HerramientasLanding ids={access.ids} isPlus={access.isPlus} lockedCount={access.lockedCount} />
      </LangProvider>
    </div>
  );
}
