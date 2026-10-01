import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireConsoleAccess } from "@/lib/panel/requireConsoleAccess";

// La instantánea de UN borrado nuclear, descargable (V5.134): todo lo que se borró, tabla por tabla, tal como estaba.
// OJO: un route handler NO hereda el layout del grupo (app), así que la puerta de la consola se pone aquí mismo, igual que
// en `kr/[id]/kml/route.ts`.
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  await requireConsoleAccess("ocp");
  const { id } = await ctx.params;
  const sinCache = { "cache-control": "private, no-store" };
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return new Response("No encontrado.", { status: 404, headers: sinCache });

  const service = createServiceRoleClient();
  const { data } = await service.from("borrados_nucleares").select("*").eq("id", id).maybeSingle();
  if (!data) return new Response("Ese borrado no está en el archivo.", { status: 404, headers: sinCache });

  const fila = data as { codigo: string; ejecutado_at: string };
  const nombre = `borrado-${fila.codigo}-${fila.ejecutado_at.slice(0, 10)}.json`;
  return new Response(JSON.stringify(data, null, 2), {
    headers: { ...sinCache, "content-type": "application/json; charset=utf-8", "content-disposition": `attachment; filename="${nombre}"` },
  });
}
