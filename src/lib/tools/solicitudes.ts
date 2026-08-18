"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient, createSessionClient } from "@/lib/supabase/server";
import { requireActiveAdmin } from "@/lib/panel/requireActiveAdmin";
import { sendTransactionalEmail } from "@/lib/email/leadEmails";
import { CTC_EMAIL } from "@/lib/legal";

// ── Herramientas del Café · las solicitudes de acceso (V4.34) ───────────────
// Una herramienta Plus se ve pero no se abre; debajo hay un «Solicitar». Esto
// guarda la petición y avisa a CTC.
//
// ⚠️ PEDIR NO ES PODER. Estas filas viven en `tool_access_requests`, NO en
// `tool_user_grants`. Una fila de grants significa «puede abrir» sin más
// lectura; si las peticiones vivieran ahí con un `status`, cualquier consulta
// que olvidara filtrar lo convertiría en permiso sin que nada fallara. Conceder
// es un acto aparte: `concederHerramienta()` en `toolGrants.ts`.
//
// D4.1 (owner, por defecto): la solicitud TAMBIÉN avisa a info@ por correo, una
// línea, con las mismas reglas que los leads. Y como los leads: **el resultado
// del envío se guarda en la fila**. Un aviso que falla en silencio es una
// solicitud que nadie atiende — la lección del OTP del BCP, que se tragaba su
// propio fallo y podía dejar la consola sin puerta.

export type ResultadoSolicitud = { ok: true } | { ok: false; error: string };

/** La persona pide acceso a una herramienta. */
export async function solicitarHerramienta(toolId: string, nota?: string): Promise<ResultadoSolicitud> {
  const session = await createSessionClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) return { ok: false, error: "Entre con su cuenta para solicitar una herramienta." };

  const service = createServiceRoleClient();

  const { data: tool } = await service
    .from("tools")
    .select("id, nombre, tier")
    .eq("id", toolId)
    .maybeSingle();
  if (!tool) return { ok: false, error: "Esa herramienta no existe." };

  // Ya concedida: no se crea petición para algo que ya se puede abrir.
  const { data: yaTiene } = await service
    .from("tool_user_grants")
    .select("id")
    .eq("user_id", user.id)
    .eq("tool_id", toolId)
    .maybeSingle();
  if (yaTiene) return { ok: false, error: "Ya tiene acceso a esta herramienta." };

  const { data: fila, error } = await service
    .from("tool_access_requests")
    .insert({ user_id: user.id, tool_id: toolId, nota: nota?.trim() || null })
    .select("id")
    .maybeSingle();

  // El índice parcial impide dos pendientes a la vez; que choque no es un error
  // que haya que enseñarle a nadie, es «ya está pedida».
  if (error) {
    if (error.code === "23505") return { ok: true };
    return { ok: false, error: "No se pudo registrar la solicitud." };
  }

  const { data: perfil } = await service
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .maybeSingle();

  const envio = await sendTransactionalEmail(
    CTC_EMAIL,
    `Solicitud de herramienta · ${tool.nombre}`,
    [
      `${perfil?.full_name ?? "Una cuenta"} (${perfil?.email ?? user.id}) solicitó acceso a «${tool.nombre}».`,
      nota?.trim() ? `Nota: ${nota.trim()}` : null,
      "Se concede desde ECP → Herramientas del café.",
    ]
      .filter(Boolean)
      .join("\n")
  );

  // El resultado se persiste SIEMPRE, salga bien o mal. Si el correo no sale,
  // la solicitud sigue existiendo y el tablero del ECP la muestra igual — el
  // aviso es una comodidad, no el registro.
  if (fila?.id) {
    await service
      .from("tool_access_requests")
      .update(
        envio.ok
          ? { aviso_email_at: new Date().toISOString(), aviso_email_error: null }
          : { aviso_email_error: envio.error ?? "fallo desconocido" }
      )
      .eq("id", fila.id);
  }

  revalidatePath("/ecp/herramientas");
  return { ok: true };
}

/** Las solicitudes pendientes, para el tablero del ECP. */
export async function solicitudesPendientes() {
  await requireActiveAdmin();
  const service = createServiceRoleClient();
  const { data } = await service
    .from("tool_access_requests")
    .select("id, user_id, tool_id, nota, requested_at, aviso_email_error")
    .eq("status", "pendiente")
    .order("requested_at", { ascending: true });
  return data ?? [];
}

/** Cerrar una solicitud. Conceder el permiso es un paso APARTE, a propósito. */
export async function resolverSolicitud(
  solicitudId: string,
  decision: "concedida" | "rechazada"
): Promise<ResultadoSolicitud> {
  const adminId = await requireActiveAdmin();
  const service = createServiceRoleClient();

  const { error } = await service
    .from("tool_access_requests")
    .update({ status: decision, decided_at: new Date().toISOString(), decided_by: adminId })
    .eq("id", solicitudId)
    .eq("status", "pendiente");
  if (error) return { ok: false, error: "No se pudo cerrar la solicitud." };

  await service.from("audit_log").insert({
    entity_type: "tool_access_request",
    entity_id: solicitudId,
    action: decision,
    performed_by: adminId,
  });

  revalidatePath("/ecp/herramientas");
  return { ok: true };
}
