import { notFound } from "next/navigation";
import { ConchaHerramienta } from "@/components/tools/ConchaHerramienta";
import { resolverHerramienta } from "@/lib/tools/unaHerramienta";

// ── Kaffetal Regal · una herramienta, dentro de la webapp (A5, V4.34) ───────
// La ruta pertenece a la SUPERFICIE y no a una consola, y eso no es estético:
// bajo `kaffetal-regal.ctcexport.com` el proxy antepone la base del subdominio,
// así que una ruta de esta superficie funciona por construcción — mientras que
// cualquier cosa colgada de `/ecp/…` se reescribiría y daría 404 desde aquí.
// Es la gotcha 12 del HANDOFF, la que condenó al mecanismo anterior.
export const dynamic = "force-dynamic";

export default async function HerramientaKrPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ volver?: string }>;
}) {
  const { slug } = await params;
  const { volver } = await searchParams;

  const h = await resolverHerramienta("kaffetal-regal", slug);
  if (!h || !h.src) notFound();

  // Pantalla completa (owner, V5.6): «make any tool open full screen» — vale
  // para las TRES superficies, no solo para el taller. La columna de 1180px se
  // va; la concha llena la ventana y el marco se queda con el alto.
  return (
    <main style={{ height: "100dvh", display: "flex", flexDirection: "column", padding: "0 16px 12px" }}>
      <ConchaHerramienta
        superficie="kaffetal-regal"
        volver={volver ?? null}
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
  );
}
