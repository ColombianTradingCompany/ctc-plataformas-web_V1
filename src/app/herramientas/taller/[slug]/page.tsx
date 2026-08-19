import { notFound } from "next/navigation";
import { LangProvider } from "@/components/lang/i18n";
import { ConchaHerramienta } from "@/components/tools/ConchaHerramienta";
import { resolverHerramienta } from "@/lib/tools/unaHerramienta";

// ── Herramientas del Café · una herramienta, en SU casa (A8/A11, V5.4) ──────
// El tercer inquilino de la concha, tras KR y Cherry Picked. La ruta cuelga de
// la superficie para que el proxy le anteponga la base por construcción
// (gotcha 12): en herramientas.ctcexport.com esto es /taller/<slug>.
// El veredicto viene de la MISMA regla pura que en las otras dos superficies;
// aquí no se filtra por columna de reparto porque el taller es la casa —
// ofrece el catálogo compartible entero (decisión A8/A9).
export const dynamic = "force-dynamic";

export default async function HerramientaTallerPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ volver?: string }>;
}) {
  const { slug } = await params;
  const { volver } = await searchParams;

  const h = await resolverHerramienta("herramientas", slug);
  if (!h || !h.src) notFound();

  return (
    <div data-theme="ctc-home">
      <LangProvider storageKey="ctc-lang">
        <main style={{ maxWidth: 1180, margin: "0 auto", padding: "0 20px 40px" }}>
          <ConchaHerramienta
            superficie="herramientas"
            volver={volver ?? "/herramientas/taller"}
            toolId={h.id}
            nombre={h.nombre}
            descripcion={h.descripcion}
            esPlus={h.esPlus}
            src={h.src}
            veredicto={h.veredicto}
            soportaMemoria={h.soportaMemoria}
          />
        </main>
      </LangProvider>
    </div>
  );
}
