"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient, createSessionClient } from "@/lib/supabase/server";
import { sendTransactionalEmail } from "@/lib/email/leadEmails";
import { CTC_EMAIL } from "@/lib/legal";
import { contextoDeAcceso } from "./toolGrants";
import { puedeAbrir } from "./accesoHerramienta";

// ── «Obtener Herramientas Plus» · la solicitud de arriba (V5.8, owner) ──────
// Hasta ahora pedir una Plus solo se podía DENTRO de la herramienta bloqueada:
// quien no entraba a una nunca veía la puerta. El owner pidió el botón arriba
// del taller, que explique qué es Plus y mande la solicitud.
//
// NO SE INVENTA TABLA: una petición general es una fila de `tool_access_requests`
// por cada herramienta Plus que esta cuenta todavía no abre — el mismo modelo
// que ya atiende el ECP, la misma cola, el mismo botón de conceder. Así el
// owner ve exactamente qué pidió quién, y conceder sigue siendo el acto
// deliberado de siempre (`concederHerramienta`).
//
// El índice parcial de la tabla impide dos pendientes por (persona,
// herramienta): pedir dos veces no duplica nada — devuelve «ya está pedida».

export type ResultadoPlus =
  | { ok: true; pedidas: number; yaPendientes: number }
  | { ok: false; error: string };

export async function solicitarPlus(nota?: string): Promise<ResultadoPlus> {
  const session = await createSessionClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) return { ok: false, error: "Entra con tu cuenta para solicitar el nivel Plus." };

  const service = createServiceRoleClient();
  const ctx = await contextoDeAcceso();

  const { data: filas } = await service
    .from("tools")
    .select("id, nombre, tier")
    .eq("clase", "compartible")
    .is("archivado_at", null)
    .eq("tier", "plus");

  const plus = (filas as { id: string; nombre: string; tier: "default" | "plus" }[] | null) ?? [];
  // Las que esta cuenta YA abre no se piden: pedir lo que ya se tiene ensucia
  // la cola del ECP y confunde a quien la atiende.
  const faltantes = plus.filter((t) => !puedeAbrir(ctx, t.id, "plus").abre);
  if (faltantes.length === 0)
    return { ok: false, error: "Tu cuenta ya abre todas las herramientas Plus disponibles." };

  let pedidas = 0;
  let yaPendientes = 0;
  for (const t of faltantes) {
    const { error } = await service
      .from("tool_access_requests")
      .insert({ user_id: user.id, tool_id: t.id, nota: nota?.trim() || "Solicitud desde «Obtener Herramientas Plus»" });
    if (!error) pedidas += 1;
    else if (error.code === "23505") yaPendientes += 1; // ya había una pendiente
    else return { ok: false, error: "No se pudo registrar la solicitud. Inténtalo de nuevo." };
  }

  if (pedidas > 0) {
    const { data: perfil } = await service
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .maybeSingle();

    // Como los leads y como la solicitud por herramienta: el aviso es una
    // comodidad y NUNCA el registro. Si el correo falla, las filas siguen ahí
    // y el tablero del ECP las muestra igual.
    await sendTransactionalEmail(
      CTC_EMAIL,
      `Solicitud de nivel Plus · ${perfil?.full_name ?? "una cuenta"}`,
      [
        `${perfil?.full_name ?? "Una cuenta"} (${perfil?.email ?? user.id}) solicitó el nivel Plus desde el taller.`,
        `Herramientas pedidas (${pedidas}): ${faltantes.map((t) => t.nombre).join(", ")}.`,
        nota?.trim() ? `Nota: ${nota.trim()}` : null,
        "Se concede desde ECP → Herramientas del café.",
      ]
        .filter(Boolean)
        .join("\n")
    ).catch(() => ({ ok: false }));
  }

  revalidatePath("/ecp/herramientas");
  revalidatePath("/herramientas/taller");
  return { ok: true, pedidas, yaPendientes };
}
