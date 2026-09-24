"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { permisoDeEscritura } from "@/lib/panel/requireActiveAdmin";
import { MOTIVO_LABEL, saldoDe, salidaValida, type MotivoDeSalida } from "@/lib/muestras/particion";

// ── OCP · Manejo de Stock Físico · Gestión de Muestras (1.ª tanda, V5.80) ────────────────────
// El recibo (que crea las filas) vive en Solicitudes de Evaluación (`solicitudesActions.ts`) y en la vista del lote.
// Aquí están las dos cosas que se hacen DESPUÉS con una muestra que ya está en la casa: ubicarla y anotar una
// salida. Las dos son `borrador` (lista blanca en `docs/BCP_USER_ADMIN_PLAN.md`): son el cuaderno interno de dónde
// está el café y qué se sacó; nadie de fuera lo ve, no disparan correo ni cobro, y se corrigen con otra anotación.
// El saldo NO se guarda: se deriva (recibido − Σ salidas) y una salida que no cabe se rechaza aquí.

type Result = { ok: true } | { ok: false; error: string };
const revalidar = () => {
  revalidatePath("/ocp/muestras");
  revalidatePath("/ocp/a-evaluar");
};

export async function ubicarMuestra(muestraId: string, formData: FormData): Promise<Result> {
  const permiso = await permisoDeEscritura("ocp", "borrador");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const service = createServiceRoleClient();
  const ubicacion = String(formData.get("ubicacion") ?? "").trim();
  const custodio = String(formData.get("custodio") ?? "").trim();
  if (!ubicacion && !custodio) return { ok: false, error: "Escriba dónde queda la muestra o quién la tiene." };
  const { error } = await service.from("muestras").update({ ubicacion: ubicacion || null, custodio: custodio || null }).eq("id", muestraId);
  if (error) return { ok: false, error: "No se pudo ubicar la muestra: " + error.message };
  revalidar();
  return { ok: true };
}

export async function anotarSalidaDeMuestra(muestraId: string, formData: FormData): Promise<Result> {
  const permiso = await permisoDeEscritura("ocp", "borrador");
  if (!permiso.ok) return { ok: false as const, error: permiso.error };
  const adminId = permiso.userId;
  const service = createServiceRoleClient();

  const kg = Number(String(formData.get("kg") ?? "").replace(",", ".").trim());
  const motivo = String(formData.get("motivo") ?? "") as MotivoDeSalida;
  const destino = String(formData.get("destino") ?? "").trim();
  const notas = String(formData.get("notas") ?? "").trim();
  if (!(motivo in MOTIVO_LABEL)) return { ok: false, error: "Elija el motivo de la salida." };

  const [{ data: muestra }, { data: salidas }] = await Promise.all([
    service.from("muestras").select("id, lot_id, kg, tipo").eq("id", muestraId).maybeSingle(),
    service.from("muestra_movimientos").select("kg").eq("muestra_id", muestraId),
  ]);
  if (!muestra) return { ok: false, error: "Muestra no encontrada." };
  const saldo = saldoDe(Number(muestra.kg), (salidas as { kg: number }[] | null) ?? []);
  if (!salidaValida(saldo, kg)) return { ok: false, error: `Esa salida no cabe: quedan ${saldo} kg de esta muestra.` };

  const { error } = await service.from("muestra_movimientos").insert({
    muestra_id: muestraId,
    kg,
    motivo,
    destino: destino || null,
    notas: notas || null,
    por: adminId,
  });
  if (error) return { ok: false, error: "No se pudo anotar la salida: " + error.message };
  await service.from("audit_log").insert({
    entity_type: "muestra",
    entity_id: muestraId,
    action: "salida",
    performed_by: adminId,
    notes: `${kg} kg · ${MOTIVO_LABEL[motivo]}${destino ? ` · ${destino}` : ""} · quedan ${saldoDe(saldo, [{ kg }])} kg`,
  });
  revalidar();
  return { ok: true };
}
