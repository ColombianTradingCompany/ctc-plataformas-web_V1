import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireConsoleAccess } from "@/lib/panel/requireConsoleAccess";
import { buildFincaKml } from "@/lib/earthKml";
import { fincaCode } from "@/components/kaffetal-regal/data";

// Sirve el archivo de Google Earth (.kml) de una finca, autogenerado con su
// punto, su polígono EUDR y la ficha de datos — para el análisis de imágenes
// satelitales (históricas incluidas) en Google Earth. OJO: un route handler NO
// hereda el layout del grupo (app), así que la puerta de la consola se pone
// aquí mismo, igual que en /ecp/herramientas/[tool].
export const dynamic = "force-dynamic";

const PRODUCTION_SYSTEM_LABEL: Record<string, string> = {
  sombra: "Café bajo sombra",
  agroforestal: "Agroforestal",
  tradicional: "Tradicional / pleno sol",
};

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  await requireConsoleAccess("bcp");

  const { id } = await ctx.params;
  const service = createServiceRoleClient();
  const { data: finca } = await service
    .from("fincas")
    .select("id, name, producer_id, municipio, departamento, hectares, eudr_lat, eudr_lng, eudr_polygon_geojson, eudr_planting_date, eudr_production_system")
    .eq("id", id)
    .maybeSingle();
  if (!finca) return new Response("Finca no encontrada.", { status: 404, headers: { "cache-control": "private, no-store" } });

  const { data: producer } = await service.from("profiles").select("full_name").eq("id", finca.producer_id).maybeSingle();

  const kml = buildFincaKml({
    name: finca.name,
    code: fincaCode(finca.id),
    producerName: producer?.full_name ?? null,
    municipio: finca.municipio,
    departamento: finca.departamento,
    hectares: finca.hectares,
    plantingDate: finca.eudr_planting_date,
    productionSystem: finca.eudr_production_system ? PRODUCTION_SYSTEM_LABEL[finca.eudr_production_system] ?? finca.eudr_production_system : null,
    lat: finca.eudr_lat,
    lng: finca.eudr_lng,
    polygon: (finca.eudr_polygon_geojson as { lat: number; lng: number }[] | null) ?? null,
  });

  const safeName = finca.name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9_-]+/g, "_").toLowerCase();
  return new Response(kml, {
    headers: {
      "content-type": "application/vnd.google-earth.kml+xml; charset=utf-8",
      "content-disposition": `attachment; filename="finca-${safeName}-eudr.kml"`,
      "cache-control": "private, no-store",
    },
  });
}
