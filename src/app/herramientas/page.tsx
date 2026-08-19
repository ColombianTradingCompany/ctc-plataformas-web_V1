import { superficieConOverrides } from "@/lib/seo/openGraph";
import { OrganizationLd } from "@/components/JsonLd";
import { LangProvider } from "@/components/lang/i18n";
import { cargarTaller } from "@/lib/tools/taller";
import { HerramientasLanding } from "@/components/services/HerramientasLanding";

export const generateMetadata = superficieConOverrides({
  route: "/herramientas",
  title: "Herramientas del Café · Calculadoras y utilidades del oficio · Colombian Trading Company",
  description:
    "El taller de la red CTC, abierto al gremio: calculadoras de mermas y factor de rendimiento, la rueda del sabor, el disco Agtron y más — con trabajos guardados en tu cuenta de la red.",
  siteName: "Herramientas del Café · CTC",
  image: "herramientas.jpg",
  imageAlt: "Logotipo de Herramientas del Café sobre fondo azul corporativo",
});

// A8 (2026-08-19): la landing dejó de abrir herramientas. Enseña el catálogo
// entero en el carrusel de capturas y manda al taller, que es donde se trabaja
// con la cuenta de la red. Se rinde por request: publicar una herramienta nueva
// tiene que verse aquí sin esperar a un deploy, y la sesión decide el CTA.
export const dynamic = "force-dynamic";

export default async function HerramientasPage() {
  const taller = await cargarTaller();
  return (
    <div data-theme="ctc-home">
      <OrganizationLd />
      <LangProvider storageKey="ctc-lang">
        <HerramientasLanding
          tarjetas={taller.herramientas.map((h) => ({
            id: h.id,
            nombre: h.nombre,
            descripcion: h.descripcion,
            esPlus: h.esPlus,
            soportaMemoria: h.soportaMemoria,
          }))}
          autenticado={taller.autenticado}
        />
      </LangProvider>
    </div>
  );
}
