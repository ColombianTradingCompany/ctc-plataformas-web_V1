import { createServiceRoleClient } from "@/lib/supabase/server";
import { supplierCode, ctcLotReferenceShort } from "@/components/kaffetal-regal/data";
import { signedKaffetalMediaUrls } from "@/lib/kaffetalMedia";
import { PHASE_LABEL, type InscriptionPhase } from "@/lib/arena/inscriptions";
import { infoGeneralComplete, PRODUCER_SEGMENTS, segmentProducer, type ProducerSegment } from "@/lib/bcp/producerSegments";
import { ProductoresBoard, type BoardSegment } from "./ProductoresBoard";
import type { ProducerData } from "./ProducerPanel";
import styles from "../shared.module.css";

// ── Productores como kanban de RELACIÓN (2026-07-20, criterios del owner) ────
// Cinco segmentos derivados (la lógica vive en src/lib/bcp/producerSegments.ts,
// con los criterios documentados y un qa-script que los ejercita):
// Marchitando · Nuevos · Primíparos · Establecidos · Activos.
// Cada tarjeta lleva la FOTO DE PERFIL; al tocarla se abre el panel del
// productor CON PESTAÑAS (ProducerPanel): General (con TODO el material de
// Información general — foto, video, fotos adicionales), Fincas, Lotes, Arena,
// Contratos y Comunicación. Filtros por País/Departamento arriba
// (ProductoresBoard). El server sólo prepara datos + URLs firmadas.

const FINCA_STATUS_LABEL: Record<string, string> = {
  pending_review: "Pendiente",
  approved: "Aprobada",
  rejected: "Rechazada",
};
const STAGE_LABEL: Record<string, string> = {
  borrador: "Borrador",
  ficha_completa: "En evaluación (EVA)",
  apto: "Apto",
  no_apto: "No apto",
  fila_arena: "En sesión de Arena",
  evaluado: "Evaluado",
  galardonado: "Galardonado",
};

type ProfileRow = { id: string; full_name: string | null; email: string | null; phone: string | null; created_at: string; role: string | null };
type PPRow = {
  profile_id: string;
  company_name: string | null;
  tax_id: string | null;
  cedula_cafetera: string | null;
  avatar_asset_id: string | null;
  video_asset_id: string | null;
  gallery_asset_ids: string[] | null;
  country: string | null;
  department: string | null;
  whatsapp_confirmed: boolean | null;
  club_member_since: string | null;
};
type FincaRow = { id: string; name: string; producer_id: string; status: string; municipio: string | null };
type LotRow = { id: string; name: string; producer_id: string; stage: string; intake_step: number };
type InsRow = { lot_id: string; producer_id: string; phase: string; sondeo_result: string | null };
type ContractRow = { id: string; lot_id: string; status: string };
type CommRow = { id: string; producer_id: string; context_label: string | null; note: string; created_at: string; author_role: string };

export default async function BcpProductoresPage() {
  const service = createServiceRoleClient();

  const [{ data: profilesRaw }, { data: ppRaw }, { data: fincasRaw }, { data: lotsRaw }, { data: insRaw }, { data: contractsRaw }, { data: commsRaw }] =
    await Promise.all([
      // Sin filtro por rol: un "productor" del tablero es cualquier cuenta con
      // HUELLA de productor (perfil de productor, o fincas/lotes propios), no
      // solo role='producer'. Así aparece la cuenta del dueño (bcp_admin que
      // además opera como productor de prueba, con fincas y lotes reales),
      // mientras que los administradores y compradores puros —sin huella— se
      // filtran abajo.
      service.from("profiles").select("id, full_name, email, phone, created_at, role").order("created_at", { ascending: true }),
      service
        .from("producer_profiles")
        .select("profile_id, company_name, tax_id, cedula_cafetera, avatar_asset_id, video_asset_id, gallery_asset_ids, country, department, whatsapp_confirmed, club_member_since"),
      service.from("fincas").select("id, name, producer_id, status, municipio").order("created_at", { ascending: true }),
      service.from("lots").select("id, name, producer_id, stage, intake_step").order("created_at", { ascending: false }),
      service.from("arena_inscriptions").select("lot_id, producer_id, phase, sondeo_result"),
      service.from("purchase_contracts").select("id, lot_id, status"),
      service.from("producer_comm_log").select("id, producer_id, context_label, note, created_at, author_role").order("created_at", { ascending: false }),
    ]);

  const allProfiles = (profilesRaw as ProfileRow[] | null) ?? [];
  const ppById = new Map(((ppRaw as PPRow[] | null) ?? []).map((p) => [p.profile_id, p]));
  const fincas = (fincasRaw as FincaRow[] | null) ?? [];
  const lots = (lotsRaw as LotRow[] | null) ?? [];
  const inscriptions = (insRaw as InsRow[] | null) ?? [];
  const contracts = (contractsRaw as ContractRow[] | null) ?? [];
  const comms = (commsRaw as CommRow[] | null) ?? [];

  const lotById = new Map(lots.map((l) => [l.id, l]));
  const fincasBy = groupBy(fincas, (f) => f.producer_id);
  const lotsBy = groupBy(lots, (l) => l.producer_id);
  const insBy = groupBy(inscriptions, (i) => i.producer_id);
  const commsBy = groupBy(comms, (c) => c.producer_id);
  const contractsBy = new Map<string, ContractRow[]>();
  for (const c of contracts) {
    const owner = lotById.get(c.lot_id)?.producer_id;
    if (!owner) continue;
    contractsBy.set(owner, [...(contractsBy.get(owner) ?? []), c]);
  }

  const profiles = allProfiles.filter(
    (p) =>
      p.role === "producer" ||
      ppById.has(p.id) ||
      (fincasBy.get(p.id)?.length ?? 0) > 0 ||
      (lotsBy.get(p.id)?.length ?? 0) > 0
  );

  // TODO el material multimedia de Información general (foto + video + fotos
  // adicionales) firmado en un solo lote.
  const mediaIds: (string | null | undefined)[] = [];
  for (const p of profiles) {
    const pp = ppById.get(p.id);
    if (!pp) continue;
    mediaIds.push(pp.avatar_asset_id, pp.video_asset_id, ...(pp.gallery_asset_ids ?? []));
  }
  const signedUrls = await signedKaffetalMediaUrls(service, mediaIds);

  const ACTIVE_PHASES = new Set(["postulacion", "sondeo", "fila", "arena", "sesion"]);
  const bySegment = new Map<ProducerSegment, ProfileRow[]>(PRODUCER_SEGMENTS.map((s) => [s.id, []]));
  const segmentOf = new Map<string, ProducerSegment>();
  for (const p of profiles) {
    const pp = ppById.get(p.id);
    const pFincas = fincasBy.get(p.id) ?? [];
    const pLots = lotsBy.get(p.id) ?? [];
    const seg = segmentProducer({
      joinedAt: p.created_at,
      infoComplete: infoGeneralComplete({
        fullName: p.full_name,
        companyName: pp?.company_name ?? null,
        taxId: pp?.tax_id ?? null,
        cedulaCafetera: pp?.cedula_cafetera ?? null,
        phone: p.phone,
        avatarAssetId: pp?.avatar_asset_id ?? null,
        country: pp?.country ?? null,
        department: pp?.department ?? null,
      }),
      hasFincas: pFincas.length > 0,
      hasEudrRequest: pLots.some((l) => l.intake_step >= 2 || l.stage !== "borrador"),
      processed: pFincas.some((f) => f.status === "approved") && pLots.some((l) => l.stage !== "borrador"),
      activeArena: (insBy.get(p.id) ?? []).some((i) => ACTIVE_PHASES.has(i.phase)),
    });
    bySegment.get(seg)!.push(p);
    segmentOf.set(p.id, seg);
  }

  const segmentLabel = (id: string) => PRODUCER_SEGMENTS.find((s) => s.id === id)?.label ?? "";

  function toData(p: ProfileRow): ProducerData {
    const pp = ppById.get(p.id);
    return {
      id: p.id,
      supplierCode: supplierCode(p.id),
      fullName: p.full_name ?? "",
      companyName: pp?.company_name ?? null,
      email: p.email,
      phone: p.phone,
      whatsappConfirmed: !!pp?.whatsapp_confirmed,
      taxId: pp?.tax_id ?? null,
      cedulaCafetera: pp?.cedula_cafetera ?? null,
      country: pp?.country ?? null,
      department: pp?.department ?? null,
      createdAt: p.created_at,
      clubMemberSince: pp?.club_member_since ?? null,
      segmentLabel: segmentLabel(segmentOf.get(p.id) ?? ""),
      media: {
        avatarUrl: pp?.avatar_asset_id ? signedUrls.get(pp.avatar_asset_id) ?? null : null,
        videoUrl: pp?.video_asset_id ? signedUrls.get(pp.video_asset_id) ?? null : null,
        galleryUrls: (pp?.gallery_asset_ids ?? []).map((id) => signedUrls.get(id)).filter((u): u is string => !!u),
      },
      fincas: (fincasBy.get(p.id) ?? []).map((f) => ({ id: f.id, name: f.name, municipio: f.municipio, statusLabel: FINCA_STATUS_LABEL[f.status] ?? f.status })),
      lotes: (lotsBy.get(p.id) ?? []).map((l) => ({ id: l.id, name: l.name, stageLabel: STAGE_LABEL[l.stage] ?? l.stage })),
      arena: (insBy.get(p.id) ?? [])
        .filter((i) => ACTIVE_PHASES.has(i.phase))
        .map((i) => ({
          lotId: i.lot_id,
          lotName: lotById.get(i.lot_id)?.name ?? ctcLotReferenceShort(i.lot_id),
          phaseLabel: PHASE_LABEL[i.phase as InscriptionPhase] ?? i.phase,
          sondeoAprobado: i.sondeo_result === "aprobado",
        })),
      contratos: (contractsBy.get(p.id) ?? []).map((c) => ({ id: c.id, lotName: lotById.get(c.lot_id)?.name ?? "Contrato", status: c.status })),
      comms: (commsBy.get(p.id) ?? []).map((cm) => ({ id: cm.id, authorRole: cm.author_role, createdAt: cm.created_at, contextLabel: cm.context_label, note: cm.note })),
    };
  }

  const segments: BoardSegment[] = PRODUCER_SEGMENTS.map((seg) => ({
    id: seg.id,
    label: seg.label,
    producers: (bySegment.get(seg.id) ?? []).map(toData),
  }));

  return (
    <div>
      <h1 className={styles.title}>Productores</h1>
      <p className={styles.subtitle}>
        La relación con cada productor, por temperatura: <b>Marchitando</b> (se enfría) · <b>Nuevos</b> (≤7 días) ·{" "}
        <b>Primíparos</b> (listos para arrancar) · <b>Establecidos</b> (finca y lote procesados) · <b>Activos</b> (en la
        Arena). Filtre por País/Departamento y toque una tarjeta para abrir el panel del productor.
      </p>

      {!profiles.length ? <p className={styles.empty}>No hay productores registrados.</p> : <ProductoresBoard segments={segments} />}
    </div>
  );
}

function groupBy<T>(rows: T[], key: (row: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const k = key(row);
    map.set(k, [...(map.get(k) ?? []), row]);
  }
  return map;
}
