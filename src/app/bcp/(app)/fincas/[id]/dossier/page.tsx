import { notFound } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { fetchProducerContacts } from "@/lib/bcpProducers";
import { signedKaffetalMediaUrls } from "@/lib/kaffetalMedia";
import { mapPreviewUrl } from "@/lib/eudr";
import { daneCodeFor } from "@/lib/daneCodes";
import { EudrDossierDoc, type DossierFinca } from "@/components/kaffetal-regal/EudrDossierDoc";

type CommRow = { id: string; note: string; created_at: string; author_role: string };

const DOSSIER_COLUMNS = `id, name, producer_id, status, vereda, municipio, departamento, hectares, eudr_lat, eudr_lng, eudr_polygon_geojson,
  eudr_planting_date, eudr_production_system, eudr_deforestation_free, eudr_legal_production, eudr_evidence_types,
  eudr_evidence_notes, eudr_legal_areas, eudr_tenure, eudr_legal_docs_asset_id, eudr_legal_docs_filename,
  eudr_sustainability_tags, eudr_sustainability_notes, eudr_evidence_files, eudr_sustainability_files, eudr_local_infra`;

export default async function FincaDossierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const service = createServiceRoleClient();

  const { data } = await service.from("fincas").select(DOSSIER_COLUMNS).eq("id", id).single();
  const finca = data as (DossierFinca & { producer_id: string; eudr_legal_docs_asset_id: string | null }) | null;
  if (!finca) notFound();

  const evidenceFiles = finca.eudr_evidence_files ?? {};
  const sustainFiles = finca.eudr_sustainability_files ?? {};
  const [producers, { data: commsData }, urlMap] = await Promise.all([
    fetchProducerContacts(service, [finca.producer_id]),
    service.from("producer_comm_log").select("id, note, created_at, author_role").eq("finca_id", id).order("created_at", { ascending: true }),
    signedKaffetalMediaUrls(service, [
      finca.eudr_legal_docs_asset_id,
      ...Object.values(evidenceFiles).map((v) => v.assetId),
      ...Object.values(sustainFiles).map((v) => v.assetId),
    ]),
  ]);
  const producer = producers.get(finca.producer_id);
  const dane = daneCodeFor(finca.departamento, finca.municipio);

  return (
    <EudrDossierDoc
      finca={finca}
      producerName={`${producer?.fullName ?? "—"}${producer?.companyName ? ` · ${producer.companyName}` : ""}`}
      producerContact={[producer?.phone, producer?.email].filter(Boolean).join(" · ")}
      daneText={dane ? `${dane.code} — ${dane.mun}, ${dane.dep} (depto ${dane.depCode})` : null}
      mapUrl={mapPreviewUrl({ lat: finca.eudr_lat, lng: finca.eudr_lng, polygon: finca.eudr_polygon_geojson }, "640x360")}
      legalDocUrl={finca.eudr_legal_docs_asset_id ? urlMap.get(finca.eudr_legal_docs_asset_id) : undefined}
      urlByAsset={Object.fromEntries(urlMap)}
      comms={(commsData as CommRow[] | null) ?? []}
    />
  );
}
