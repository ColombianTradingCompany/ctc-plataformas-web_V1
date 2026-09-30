"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { permisoDeEscritura } from "@/lib/panel/requireActiveAdmin";
import { borrarCuentaDeProductor } from "@/lib/inactividad/borrarCuenta";
import { supplierCode } from "@/components/kaffetal-regal/data";

// ── V5.103 (owner, 2026-09-30): las dos acciones del OCP sobre la inactividad de una cuenta ─────────────────────────
// Las dos EMITEN (clase `emite`, nivel admin): borrar la cuenta de un productor sin finca ni lote, y decidir que una
// cuenta no se borre nunca (protegida: amigos y familia, CTC Redes…). El barrido automático (`src/lib/inactividad/`)
// respeta la protección y usa la MISMA rutina de borrado (`borrarCuentaDeProductor`), que vuelve a comprobar la regla.

export async function protegerCuenta(producerId: string, protegida: boolean, motivo?: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const permiso = await permisoDeEscritura("ocp", "emite");
  if (!permiso.ok) return { ok: false, error: permiso.error };
  const service = createServiceRoleClient();
  const ahora = new Date().toISOString();
  const { error } = await service.from("producer_inactividad").upsert(
    {
      profile_id: producerId,
      protegida,
      protegida_motivo: protegida ? motivo?.trim() || "Protegida por el owner desde el OCP" : null,
      protegida_at: protegida ? ahora : null,
      protegida_por: protegida ? permiso.userId : null,
      updated_at: ahora,
    },
    { onConflict: "profile_id" }
  );
  if (error) return { ok: false, error: error.message };
  await service.from("audit_log").insert({
    entity_type: "profile",
    entity_id: producerId,
    action: protegida ? "cuenta_protegida" : "cuenta_desprotegida",
    performed_by: permiso.userId,
    notes: protegida ? `${supplierCode(producerId)} no entra en el barrido de inactividad${motivo?.trim() ? `: ${motivo.trim()}` : ""}` : `${supplierCode(producerId)} vuelve a entrar en el barrido de inactividad`,
  });
  revalidatePath("/ocp/kr");
  return { ok: true };
}

export async function borrarCuentaInactiva(producerId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const permiso = await permisoDeEscritura("ocp", "emite");
  if (!permiso.ok) return { ok: false, error: permiso.error };
  const service = createServiceRoleClient();
  const codigo = supplierCode(producerId);
  const r = await borrarCuentaDeProductor(service, producerId);
  if (!r.ok) return r;
  await service.from("audit_log").insert({
    entity_type: "profile",
    entity_id: producerId,
    action: "cuenta_borrada_por_owner",
    performed_by: permiso.userId,
    notes: `Cuenta ${codigo} (${r.correo ?? "sin correo"}) borrada desde el OCP: sin finca ni lote.`,
  });
  revalidatePath("/ocp/kr");
  return { ok: true };
}
