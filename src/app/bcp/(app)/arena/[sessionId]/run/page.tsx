import { notFound, redirect } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { ctcLotReferenceShort } from "@/components/kaffetal-regal/data";
import type { JornadaState } from "@/lib/arena/jornada";
import { JornadaRunner, type CupInfo } from "./JornadaRunner";

// Runner en vivo de la Jornada de Arena. Este server component solo reúne lo
// que el guion necesita mostrar (identidades para las revelaciones, URLs
// firmadas de los videos de los cafés) y le entrega el run_state persistido al
// client component; toda la interacción vive en JornadaRunner.

type LotJoin = {
  id: string;
  name: string;
  producer_id: string;
  finca_id: string | null;
  ficha_variedad: string | null;
  ficha_proceso: string | null;
  video_asset_id: string | null;
  datasheet: { base_processing?: string; varieties?: { pct: string; name: string }[]; region_dep?: string; county_muni?: string; county_muni_text?: string } | null;
};

export default async function JornadaRunPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const service = createServiceRoleClient();

  const { data: session } = await service
    .from("arena_sessions")
    .select("id, session_date, status, run_state, harvest_seasons(kind, year)")
    .eq("id", sessionId)
    .single();
  if (!session) notFound();
  if (!session.run_state || session.status === "completed") redirect(`/bcp/arena/${sessionId}`);

  const runState = session.run_state as JornadaState;

  const { data: lotRows } = await service
    .from("lots")
    .select("id, name, producer_id, finca_id, ficha_variedad, ficha_proceso, video_asset_id, datasheet")
    .in("id", runState.cup_order);
  const lots = (lotRows ?? []) as LotJoin[];

  const fincaIds = [...new Set(lots.map((l) => l.finca_id).filter((v): v is string => !!v))];
  const producerIds = [...new Set(lots.map((l) => l.producer_id))];
  const videoAssetIds = lots.map((l) => l.video_asset_id).filter((v): v is string => !!v);

  const [{ data: fincas }, { data: producers }, { data: videoAssets }] = await Promise.all([
    fincaIds.length
      ? service.from("fincas").select("id, name, municipio, departamento").in("id", fincaIds)
      : Promise.resolve({ data: [] as { id: string; name: string | null; municipio: string | null; departamento: string | null }[] }),
    service.from("producer_profiles").select("profile_id, company_name").in("profile_id", producerIds),
    videoAssetIds.length
      ? service.from("media_assets").select("id, path").in("id", videoAssetIds)
      : Promise.resolve({ data: [] as { id: string; path: string }[] }),
  ]);

  const fincaById = new Map((fincas ?? []).map((f) => [f.id, f]));
  const producerById = new Map((producers ?? []).map((p) => [p.profile_id, p.company_name as string | null]));

  // URLs firmadas a 6 h: una jornada dura ~3.5 h y los videos se muestran al
  // final (revelación completa) -- 1 h se vencería a mitad de evento.
  const videoUrlByAssetId = new Map<string, string>();
  for (const asset of videoAssets ?? []) {
    const { data } = await service.storage.from("kaffetal-media").createSignedUrl(asset.path, 21600);
    if (data?.signedUrl) videoUrlByAssetId.set(asset.id, data.signedUrl);
  }

  const cups: Record<string, CupInfo> = {};
  for (const lot of lots) {
    const finca = lot.finca_id ? fincaById.get(lot.finca_id) : undefined;
    const ds = lot.datasheet ?? {};
    const variety =
      lot.ficha_variedad ||
      (ds.varieties ?? [])
        .filter((v) => v.name?.trim())
        .map((v) => (v.pct ? `${v.name} (${v.pct}%)` : v.name))
        .join(", ") ||
      null;
    const originParts = [finca?.municipio || ds.county_muni_text || ds.county_muni, finca?.departamento || ds.region_dep].filter(Boolean);
    cups[lot.id] = {
      lotId: lot.id,
      lotName: lot.name,
      reference: ctcLotReferenceShort(lot.id),
      producerName: producerById.get(lot.producer_id) ?? null,
      fincaName: finca?.name ?? null,
      variety,
      process: lot.ficha_proceso || ds.base_processing || null,
      origin: originParts.length ? originParts.join(", ") : null,
      videoUrl: lot.video_asset_id ? videoUrlByAssetId.get(lot.video_asset_id) ?? null : null,
    };
  }

  const season = session.harvest_seasons as unknown as { kind: string; year: number } | null;
  const sessionTitle = `${season?.kind === "mitaca" ? "Mitaca" : "Principal"} ${season?.year ?? ""} · ${session.session_date}`;

  return <JornadaRunner sessionId={sessionId} sessionTitle={sessionTitle} initialState={runState} cups={cups} />;
}
