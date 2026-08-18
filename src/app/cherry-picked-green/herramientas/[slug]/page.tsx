import { notFound } from "next/navigation";
import { ConchaHerramienta } from "@/components/tools/ConchaHerramienta";
import { resolverHerramienta } from "@/lib/tools/unaHerramienta";

// ── Cherry Picked Green · una herramienta, dentro de la webapp (A5, V4.34) ───────
// La ruta pertenece a la SUPERFICIE y no a una consola, y eso no es estético:
// bajo `cherry-picked-green.ctcexport.com` el proxy antepone la base del subdominio,
// así que una ruta de esta superficie funciona por construcción — mientras que
// cualquier cosa colgada de `/ecp/…` se reescribiría y daría 404 desde aquí.
// Es la gotcha 12 del HANDOFF, la que condenó al mecanismo anterior.
export const dynamic = "force-dynamic";

export default async function HerramientaCpPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ volver?: string }>;
}) {
  const { slug } = await params;
  const { volver } = await searchParams;

  const h = await resolverHerramienta("cherry-picked-green", slug);
  if (!h || !h.src) notFound();

  return (
    <main style={{ maxWidth: 1180, margin: "0 auto", padding: "0 20px 40px" }}>
      <ConchaHerramienta
        superficie="cherry-picked-green"
        volver={volver ?? null}
        toolId={h.id}
        nombre={h.nombre}
        descripcion={h.descripcion}
        esPlus={h.esPlus}
        src={h.src}
        veredicto={h.veredicto}
      />
    </main>
  );
}
