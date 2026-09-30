import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendTransactionalEmail } from "@/lib/email/leadEmails";
import { esCorreoDePrueba } from "@/lib/email/cuentasDePrueba";
import { origenDeSuperficie } from "@/lib/red/subdominios";
import { hrefRecuperar } from "@/lib/auth/puertas";
import { infoGeneralComplete, segmentProducer } from "@/lib/bcp/producerSegments";
import { supplierCode } from "@/components/kaffetal-regal/data";
import { decidirPasoDeInactividad, DIA_MS, DIAS_ENTRE_PASOS, type HechosDeInactividad } from "./reglas";
import { construirAvisoDeBorrado, construirRecordatorioDeCuenta } from "./correos";
import { borrarCuentaDeProductor } from "./borrarCuenta";

// ── El barrido semanal de la inactividad (V5.103, owner 2026-09-30) — el TERCER barrido de `/api/cron/recordatorios` ──
// El servidor de la regla pura de `./reglas.ts`. Por cada productor junta los MISMOS hechos con los que `/ocp/kr`
// pinta su estado (`segmentProducer`, `carga.ts`) y decide: recordatorio → (30 días) aviso → (30 días) borrado. Cada
// paso deja rastro en `audit_log` y en `producer_inactividad`; el correo sale por el remitente único, y el sello del
// paso se escribe SOLO si el correo salió (si falla, `ultimo_error` lo guarda y el lunes siguiente se reintenta).
// Idempotente: cada sello mueve el reloj, así que correrlo dos veces el mismo día no manda dos correos.

const FASES_ACTIVAS = new Set(["postulacion", "sondeo", "fila", "arena", "sesion"]);
const enlaceKr = () => `${origenDeSuperficie("/kaffetal-regal")}/kaffetal-regal`;
const enlaceRecuperar = () => `${origenDeSuperficie("/kaffetal-regal")}${hrefRecuperar("kaffetal-regal")}`;

type Resumen = { ok: true; recordadas: number; avisadas: number; borradas: number; reiniciadas: number; errores: string[] };

export async function correrBarridoDeInactividad(service: SupabaseClient, ahora = new Date()): Promise<Resumen> {
  const [{ data: pRaw }, { data: ppRaw }, { data: fRaw }, { data: lRaw }, { data: iRaw }, { data: eRaw }] = await Promise.all([
    service.from("profiles").select("id, full_name, email, phone, created_at, role").eq("role", "producer"),
    service.from("producer_profiles").select("profile_id, company_name, tax_id, cedula_cafetera, avatar_asset_id, country, department, gestion"),
    service.from("fincas").select("id, producer_id, status"),
    service.from("lots").select("id, producer_id, stage, intake_step"),
    service.from("arena_inscriptions").select("producer_id, phase"),
    service.from("producer_inactividad").select("profile_id, protegida, recordatorio_at, aviso_at"),
  ]);
  const pp = new Map((ppRaw ?? []).map((r) => [r.profile_id, r]));
  const fincasDe = new Map<string, { status: string }[]>();
  for (const f of fRaw ?? []) fincasDe.set(f.producer_id, [...(fincasDe.get(f.producer_id) ?? []), f]);
  const lotesDe = new Map<string, { stage: string; intake_step: number }[]>();
  for (const l of lRaw ?? []) lotesDe.set(l.producer_id, [...(lotesDe.get(l.producer_id) ?? []), l]);
  const estado = new Map((eRaw ?? []).map((r) => [r.profile_id, r]));

  const resumen: Resumen = { ok: true, recordadas: 0, avisadas: 0, borradas: 0, reiniciadas: 0, errores: [] };
  for (const p of pRaw ?? []) {
    const perfil = pp.get(p.id);
    const susFincas = fincasDe.get(p.id) ?? [];
    const susLotes = lotesDe.get(p.id) ?? [];
    const e = estado.get(p.id);
    const hechos: HechosDeInactividad = {
      segmento: segmentProducer(
        {
          joinedAt: p.created_at,
          infoComplete: infoGeneralComplete({
            fullName: p.full_name,
            companyName: perfil?.company_name ?? null,
            taxId: perfil?.tax_id ?? null,
            cedulaCafetera: perfil?.cedula_cafetera ?? null,
            phone: p.phone,
            avatarAssetId: perfil?.avatar_asset_id ?? null,
            country: perfil?.country ?? null,
            department: perfil?.department ?? null,
          }),
          hasFincas: susFincas.length > 0,
          hasEudrRequest: susLotes.some((l) => l.intake_step >= 2 || l.stage !== "borrador"),
          processed: susFincas.some((f) => f.status === "approved") && susLotes.some((l) => l.stage !== "borrador"),
          activeArena: (iRaw ?? []).some((i) => i.producer_id === p.id && FASES_ACTIVAS.has(i.phase)),
        },
        ahora.getTime()
      ),
      tieneFincas: susFincas.length > 0,
      tieneLotes: susLotes.length > 0,
      protegida: !!e?.protegida,
      esPrueba: esCorreoDePrueba(p.email),
      laLlevaCtcx: !!perfil?.gestion,
      recordatorioAt: e?.recordatorio_at ?? null,
      avisoAt: e?.aviso_at ?? null,
    };
    const paso = decidirPasoDeInactividad(hechos, ahora.getTime());
    if (paso === "nada") continue;
    const r = await ejecutarPaso(service, paso, { id: p.id, nombre: p.full_name || "caficultor", correo: p.email }, hechos, ahora);
    if (!r.ok) resumen.errores.push(`${supplierCode(p.id)}: ${r.error}`);
    else if (paso === "recordatorio") resumen.recordadas++;
    else if (paso === "aviso") resumen.avisadas++;
    else if (paso === "borrado") resumen.borradas++;
    else resumen.reiniciadas++;
  }
  return resumen;
}

async function ejecutarPaso(
  service: SupabaseClient,
  paso: "reinicio" | "recordatorio" | "aviso" | "borrado",
  p: { id: string; nombre: string; correo: string | null },
  h: HechosDeInactividad,
  ahora: Date
): Promise<{ ok: true } | { ok: false; error: string }> {
  const sello = (campos: Record<string, unknown>) =>
    service.from("producer_inactividad").upsert({ profile_id: p.id, ...campos, updated_at: ahora.toISOString() }, { onConflict: "profile_id" });
  const rastro = (action: string, notes: string) =>
    service.from("audit_log").insert({ entity_type: "profile", entity_id: p.id, action, performed_by: null, notes });

  if (paso === "reinicio") {
    // Volvió a la vida (finca, lote, información completa, protección…): el reloj arranca de cero si vuelve a marchitar.
    const { error } = await sello({ recordatorio_at: null, aviso_at: null, ultimo_error: null });
    if (error) return { ok: false, error: error.message };
    await rastro("inactividad_reiniciada", "Registró finca o lote (o dejó de ser Marchitando): se borran los sellos del barrido.");
    return { ok: true };
  }
  if (paso === "borrado") {
    const r = await borrarCuentaDeProductor(service, p.id);
    if (!r.ok) {
      await sello({ ultimo_error: r.error });
      return r;
    }
    await rastro(
      "cuenta_borrada_por_inactividad",
      `Cuenta ${supplierCode(p.id)} (${r.correo ?? "sin correo"}) borrada por el barrido: recordatorio ${h.recordatorioAt?.slice(0, 10)} · aviso ${h.avisoAt?.slice(0, 10)} · sin finca ni lote.`
    );
    return { ok: true };
  }
  if (!p.correo) return { ok: false, error: "sin correo" };
  const correo =
    paso === "recordatorio"
      ? construirRecordatorioDeCuenta({ nombre: p.nombre, correo: p.correo, enlaceKr: enlaceKr(), enlaceRecuperar: enlaceRecuperar() })
      : construirAvisoDeBorrado({ nombre: p.nombre, correo: p.correo, enlaceKr: enlaceKr(), enlaceRecuperar: enlaceRecuperar(), borradoEl: new Date(ahora.getTime() + DIAS_ENTRE_PASOS * DIA_MS) });
  const envio = await sendTransactionalEmail(p.correo, correo.subject, correo.text);
  if (!envio.ok) {
    await sello({ ultimo_error: `${paso}: ${envio.error}` });
    return { ok: false, error: envio.error };
  }
  const { error } = await sello(paso === "recordatorio" ? { recordatorio_at: ahora.toISOString(), ultimo_error: null } : { aviso_at: ahora.toISOString(), ultimo_error: null });
  if (error) return { ok: false, error: error.message };
  await rastro(paso === "recordatorio" ? "inactividad_recordatorio_enviado" : "inactividad_aviso_enviado", `${correo.subject} → ${p.correo}`);
  await service.from("producer_comm_log").insert({ producer_id: p.id, context_label: "Su cuenta", note: correo.text, created_by: null });
  return { ok: true };
}
