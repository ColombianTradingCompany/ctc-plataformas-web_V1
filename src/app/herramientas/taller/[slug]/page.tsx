import { notFound } from "next/navigation";
import { LangProvider } from "@/components/lang/i18n";
import { ConchaHerramienta } from "@/components/tools/ConchaHerramienta";
import { TallerBarra } from "@/components/tools/TallerBarra";
import { resolverHerramienta } from "@/lib/tools/unaHerramienta";
import { cargarTaller } from "@/lib/tools/taller";

// ── Herramientas del Café · una herramienta, en SU casa (A8/A11, V5.4) ──────
// Segunda pasada del owner (V5.6): PANTALLA COMPLETA. La herramienta llena la
// ventana — la barra del taller arriba (identidad + salida), la cabecera de la
// concha en una línea, y el marco con todo el alto restante. Nada de columnas
// de 1180px: «the working space is very reduced» era literal.
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

  const [h, taller] = await Promise.all([resolverHerramienta("herramientas", slug), cargarTaller()]);
  if (!h || !h.src) notFound();

  return (
    <div data-theme="ctc-home" style={{ height: "100dvh", display: "flex", flexDirection: "column" }}>
      <LangProvider storageKey="ctc-lang">
        <TallerBarra email={taller.email} compacta />
        <main style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", padding: "0 16px 12px" }}>
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
            guia={h.guia}
            pantallaCompleta
          />
        </main>
      </LangProvider>
    </div>
  );
}
