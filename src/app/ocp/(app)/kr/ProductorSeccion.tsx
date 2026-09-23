import type { SupabaseClient } from "@supabase/supabase-js";
import { supplierCode, ctcLotReferenceShort } from "@/components/kaffetal-regal/data";
import { signedKaffetalMediaUrls } from "@/lib/kaffetalMedia";
import { PHASE_LABEL, type InscriptionPhase } from "@/lib/arena/inscriptions";
import { infoGeneralComplete, PRODUCER_SEGMENTS, segmentProducer } from "@/lib/bcp/producerSegments";
import { estadoDeFinca, etapaDelLote } from "@/lib/ocp/etapas";
import { ProducerPanel, type ProducerData, type ModuleStat } from "./ProducerPanel";
import type { Gestion } from "@/lib/asistencia/desacoplado";
import styles from "@/components/panel/shared.module.css";

// ── Vista completa · la sección del PRODUCTOR (V5.61) ────────────────────────
// Era la página del módulo Productores: un kanban de relación por «temperatura» (Marchitando · Nuevos ·
// Primíparos · Establecidos · Activos) con un panel de pestañas por productor. La tabla única se
// llevó el tablero; el PANEL sigue siendo el mismo (`ProducerPanel`: General con todo el material
// multimedia, Fincas, Lotes, Arena, Contratos y Comunicación) y el segmento viaja como un dato más
// —en la tabla, bajo el nombre; aquí, en la cabecera del panel—.
//
// La diferencia de fondo es de COSTE: la página vieja leía los perfiles, fincas, lotes, inscripciones,
// contratos y notas de TODOS para pintar un tablero; esto lee los de UNO.

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
  gestion: Gestion | null;
};
type FincaRow = { id: string; name: string; status: string; municipio: string | null };
type LotRow = { id: string; name: string; stage: string; intake_step: number };
type InsRow = { lot_id: string; phase: string; sondeo_result: string | null };
type ContractRow = { id: string; lot_id: string; status: string };
type CommRow = { id: string; context_label: string | null; note: string; created_at: string; author_role: string };

const FASES_ACTIVAS = new Set(["postulacion", "sondeo", "fila", "arena", "sesion"]);

export async function ProductorSeccion({ service, productorId }: { service: SupabaseClient; productorId: string }) {
  const [{ data: pRaw }, { data: ppRaw }, { data: fRaw }, { data: lRaw }, { data: iRaw }, { data: mRaw }] = await Promise.all([
    service.from("profiles").select("id, full_name, email, phone, created_at, role").eq("id", productorId).maybeSingle(),
    service
      .from("producer_profiles")
      .select("profile_id, company_name, tax_id, cedula_cafetera, avatar_asset_id, video_asset_id, gallery_asset_ids, country, department, whatsapp_confirmed, club_member_since, gestion")
      .eq("profile_id", productorId)
      .maybeSingle(),
    service.from("fincas").select("id, name, status, municipio").eq("producer_id", productorId).order("created_at", { ascending: true }),
    service.from("lots").select("id, name, stage, intake_step").eq("producer_id", productorId).order("created_at", { ascending: false }),
    service.from("arena_inscriptions").select("lot_id, phase, sondeo_result").eq("producer_id", productorId),
    service
      .from("producer_comm_log")
      .select("id, context_label, note, created_at, author_role")
      .eq("producer_id", productorId)
      .order("created_at", { ascending: false }),
  ]);

  const p = pRaw as ProfileRow | null;
  if (!p) return <p className={styles.empty}>Ese productor ya no existe.</p>;
  const pp = ppRaw as PPRow | null;
  const fincas = (fRaw as FincaRow[] | null) ?? [];
  const lotes = (lRaw as LotRow[] | null) ?? [];
  const arena = ((iRaw as InsRow[] | null) ?? []).filter((i) => FASES_ACTIVAS.has(i.phase));
  const comms = (mRaw as CommRow[] | null) ?? []; // de más nueva a más vieja → comms[0] es la última nota

  // Los contratos no tienen FK al productor: se llega por sus lotes.
  const { data: cRaw } = lotes.length
    ? await service.from("purchase_contracts").select("id, lot_id, status").in("lot_id", lotes.map((l) => l.id))
    : { data: [] as ContractRow[] };
  const contratos = (cRaw as ContractRow[] | null) ?? [];
  const lotePorId = new Map(lotes.map((l) => [l.id, l]));

  const firmadas = await signedKaffetalMediaUrls(service, [pp?.avatar_asset_id, pp?.video_asset_id, ...(pp?.gallery_asset_ids ?? [])]);

  const infoCompleta = infoGeneralComplete({
    fullName: p.full_name,
    companyName: pp?.company_name ?? null,
    taxId: pp?.tax_id ?? null,
    cedulaCafetera: pp?.cedula_cafetera ?? null,
    phone: p.phone,
    avatarAssetId: pp?.avatar_asset_id ?? null,
    country: pp?.country ?? null,
    department: pp?.department ?? null,
  });
  const segmento = segmentProducer({
    joinedAt: p.created_at,
    infoComplete: infoCompleta,
    hasFincas: fincas.length > 0,
    hasEudrRequest: lotes.some((l) => l.intake_step >= 2 || l.stage !== "borrador"),
    processed: fincas.some((f) => f.status === "approved") && lotes.some((l) => l.stage !== "borrador"),
    activeArena: arena.length > 0,
  });

  // ✓ en orden · ✗ algo requiere atención · — sin registros. Reglas de «algo mal»: Fincas = una finca
  // rechazada; Lotes = un lote No Apto; Comunicación = la última nota la escribió el productor (CTC aún
  // no responde). Arena y Contratos no tienen regla de error por ahora.
  const mod = (count: number, issue: boolean): ModuleStat => ({ count, state: count === 0 ? "empty" : issue ? "issue" : "ok" });

  const data: ProducerData = {
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
    gestion: pp?.gestion ?? null,
    segmentLabel: PRODUCER_SEGMENTS.find((s) => s.id === segmento)?.label ?? "",
    media: {
      avatarUrl: pp?.avatar_asset_id ? firmadas.get(pp.avatar_asset_id) ?? null : null,
      videoUrl: pp?.video_asset_id ? firmadas.get(pp.video_asset_id) ?? null : null,
      galleryUrls: (pp?.gallery_asset_ids ?? []).map((id) => firmadas.get(id)).filter((u): u is string => !!u),
    },
    modules: {
      general: { count: null, state: infoCompleta ? "ok" : "issue" },
      fincas: mod(fincas.length, fincas.some((f) => f.status === "rejected")),
      lotes: mod(lotes.length, lotes.some((l) => l.stage === "no_apto")),
      arena: mod(arena.length, false),
      contratos: mod(contratos.length, false),
      comm: mod(comms.length, comms[0]?.author_role === "producer"),
    },
    fincas: fincas.map((f) => ({ id: f.id, name: f.name, municipio: f.municipio, statusLabel: estadoDeFinca(f.status) })),
    lotes: lotes.map((l) => ({ id: l.id, name: l.name, stageLabel: etapaDelLote(l.stage) })),
    arena: arena.map((i) => ({
      lotId: i.lot_id,
      lotName: lotePorId.get(i.lot_id)?.name ?? ctcLotReferenceShort(i.lot_id),
      phaseLabel: PHASE_LABEL[i.phase as InscriptionPhase] ?? i.phase,
      sondeoAprobado: i.sondeo_result === "aprobado",
    })),
    contratos: contratos.map((c) => ({ id: c.id, lotName: lotePorId.get(c.lot_id)?.name ?? "Contrato", status: c.status })),
    comms: comms.map((cm) => ({ id: cm.id, authorRole: cm.author_role, createdAt: cm.created_at, contextLabel: cm.context_label, note: cm.note })),
  };

  return <ProducerPanel data={data} />;
}
