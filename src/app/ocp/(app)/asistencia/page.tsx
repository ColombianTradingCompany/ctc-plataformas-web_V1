import { createServiceRoleClient } from "@/lib/supabase/server";
import { ctcLotReference, fincaCode, supplierCode } from "@/components/kaffetal-regal/data";
import { infoGeneralComplete, PRODUCER_SEGMENTS, segmentProducer } from "@/lib/bcp/producerSegments";
import type { Gestion } from "@/lib/asistencia/desacoplado";
import { CerrarSesionAsistidaBoton } from "./SesionAsistidaBoton";
import { AsistenciaTabla, type AsistenciaFila } from "./AsistenciaTabla";
import styles from "@/components/panel/shared.module.css";

export const dynamic = "force-dynamic";

// ── OCP · Kaffetal Regal · Asistencia a Proveedores (V5.75, owner 2026-09-23) ──
// «Entrar al perfil de un productor para ejecutar por él la creación de fincas y lotes y hacer el
// proceso en su nombre.» La lista de productores inscritos con «Entrar como el productor»: abre KR en
// otra pestaña con la SESIÓN ASISTIDA (`src/lib/asistencia/actions.ts`), con rastro en `audit_log` y
// una nota que el productor ve. El mismo botón vive en la vista completa del productor (`/ocp/kr?productor=`).
// V5.105 (owner, 2026-09-30): filtros y buscador con «búsqueda profunda» en fincas y lotes (`AsistenciaTabla`).
// Esta página solo CARGA: los nombres y códigos de fincas y lotes viajan a la tabla para que busque en ellos.

type ProfileRow = { id: string; full_name: string | null; email: string | null; phone: string | null; role: string | null; created_at: string };
type PPRow = { profile_id: string; company_name: string | null; tax_id: string | null; cedula_cafetera: string | null; avatar_asset_id: string | null; country: string | null; department: string | null; gestion: Gestion | null };
type FincaRow = { id: string; producer_id: string; name: string; status: string; vereda: string | null; municipio: string | null };
type LotRow = { id: string; producer_id: string; name: string; stage: string; intake_step: number };

const FASES_ACTIVAS = new Set(["postulacion", "sondeo", "fila", "arena", "sesion"]);

export default async function AsistenciaPage() {
  const service = createServiceRoleClient();
  const [{ data: pRaw }, { data: ppRaw }, { data: fRaw }, { data: lRaw }, { data: iRaw }] = await Promise.all([
    service.from("profiles").select("id, full_name, email, phone, role, created_at").eq("role", "producer").order("full_name"),
    service.from("producer_profiles").select("profile_id, company_name, tax_id, cedula_cafetera, avatar_asset_id, country, department, gestion"),
    service.from("fincas").select("id, producer_id, name, status, vereda, municipio").order("created_at", { ascending: true }),
    service.from("lots").select("id, producer_id, name, stage, intake_step").order("created_at", { ascending: false }),
    service.from("arena_inscriptions").select("producer_id, phase"),
  ]);
  const productores = (pRaw as ProfileRow[] | null) ?? [];
  const perfil = new Map(((ppRaw as PPRow[] | null) ?? []).map((r) => [r.profile_id, r]));
  const fincasDe = new Map<string, FincaRow[]>();
  for (const f of (fRaw as FincaRow[] | null) ?? []) fincasDe.set(f.producer_id, [...(fincasDe.get(f.producer_id) ?? []), f]);
  const lotesDe = new Map<string, LotRow[]>();
  for (const l of (lRaw as LotRow[] | null) ?? []) lotesDe.set(l.producer_id, [...(lotesDe.get(l.producer_id) ?? []), l]);
  const inscripciones = (iRaw as { producer_id: string; phase: string }[] | null) ?? [];

  // El MISMO estado del productor que pinta /ocp/kr (`carga.ts`) y decide el barrido de inactividad.
  const filas: AsistenciaFila[] = productores.map((p) => {
    const pp = perfil.get(p.id);
    const susFincas = fincasDe.get(p.id) ?? [];
    const susLotes = lotesDe.get(p.id) ?? [];
    const segmentoId = segmentProducer({
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
      hasFincas: susFincas.length > 0,
      hasEudrRequest: susLotes.some((l) => l.intake_step >= 2 || l.stage !== "borrador"),
      processed: susFincas.some((f) => f.status === "approved") && susLotes.some((l) => l.stage !== "borrador"),
      activeArena: inscripciones.some((i) => i.producer_id === p.id && FASES_ACTIVAS.has(i.phase)),
    });
    return {
      id: p.id,
      nombre: p.full_name || p.email || "Productor",
      email: p.email,
      codigo: supplierCode(p.id),
      empresa: pp?.company_name ?? null,
      departamento: pp?.department ?? null,
      gestion: pp?.gestion ?? null,
      segmentoId,
      segmento: PRODUCER_SEGMENTS.find((s) => s.id === segmentoId)?.label ?? "",
      fincas: susFincas.map((f) => ({ nombre: f.name, codigo: fincaCode(f.id), lugar: [f.vereda, f.municipio].filter(Boolean).join(", ") })),
      lotes: susLotes.map((l) => ({ nombre: l.name, codigo: ctcLotReference(l.id) })),
    };
  });

  return (
    <div>
      <h1 className={styles.title}>Asistencia a Proveedores</h1>
      <p className={styles.subtitle}>
        Entre a la cuenta de un productor ya inscrito para crear sus fincas y lotes, completar su Ficha o pedir su evaluación <b>en su
        nombre</b>. Kaffetal Regal se abre en otra pestaña con su sesión; su consola sigue abierta en esta. Cada entrada queda registrada
        y el productor recibe una nota en su feed. El buscador mira al productor; con la <b>búsqueda profunda</b> mira también sus fincas
        y sus lotes (nombre o código).
      </p>

      <div className={styles.card} style={{ display: "block", marginBottom: 20 }}>
        <h3>Cómo funciona</h3>
        <p className={styles.meta}>
          Al pulsar «Entrar como el productor», el navegador queda con la sesión de ESE productor en todas las plataformas públicas
          (Kaffetal Regal, Cherry Picked…) hasta que la cierre aquí o desde Kaffetal Regal. Si usted entra a Kaffetal Regal con su
          propia cuenta de productor en este mismo navegador, esa sesión se reemplaza.
        </p>
        <div style={{ marginTop: 10 }}>
          <CerrarSesionAsistidaBoton />
        </div>
      </div>

      {!filas.length ? <p className={styles.empty}>No hay productores registrados.</p> : <AsistenciaTabla filas={filas} />}
    </div>
  );
}
