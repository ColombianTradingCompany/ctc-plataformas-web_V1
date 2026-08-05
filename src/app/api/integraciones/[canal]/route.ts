import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { DOMINIOS, type Dominio } from "@/lib/integraciones/dominios";
import { aplicarEntrante } from "@/lib/integraciones/aplicar";

// ── Integraciones · la puerta de entrada ─────────────────────────────────────
// UNA ruta para todo lo que entra de fuera (Make, y a través de él Notion,
// Gmail, Drive…). El canal va en la url: /api/integraciones/make.
//
// El gate es el mismo patrón que ya funciona en /api/cron/market-anchors:
// `Authorization: Bearer <secreto>` y **503 si el secreto no está configurado**.
// Una url pública que escribe en la base es una invitación, así que sin secreto
// no se abre — falla ruidosamente en vez de quedar accesible.
//
// Qué hace: autentica, REGISTRA el evento, y luego lo aplica. El registro va
// primero y a propósito — si el manejador falla, la fila sigue ahí con el
// motivo escrito, y se puede ver qué mandó Make sin tener que pedírselo.
//
// La ruta no decide nada por sí misma: qué puede tocar un evento entrante vive
// en `aplicar.ts`, como lista blanca. Aquí no se añaden casos.

export const dynamic = "force-dynamic";

/** Un secreto por canal: comprometer uno no abre los demás. */
const SECRETO_POR_CANAL: Record<string, string | undefined> = {
  make: process.env.INTEGRACIONES_SECRET_MAKE,
};

export async function POST(request: Request, ctx: { params: Promise<{ canal: string }> }) {
  const { canal } = await ctx.params;

  if (!(canal in SECRETO_POR_CANAL)) {
    return NextResponse.json({ ok: false, error: "Canal desconocido" }, { status: 404 });
  }
  const secreto = SECRETO_POR_CANAL[canal];
  if (!secreto) {
    return NextResponse.json(
      { ok: false, error: `INTEGRACIONES_SECRET_${canal.toUpperCase()} sin configurar` },
      { status: 503 }
    );
  }
  if (request.headers.get("authorization") !== `Bearer ${secreto}`) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  let body: { dominio?: string; tipo?: string; payload?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Cuerpo JSON inválido" }, { status: 400 });
  }

  const tipo = (body.tipo ?? "").trim();
  if (!tipo) return NextResponse.json({ ok: false, error: "Falta `tipo`" }, { status: 400 });

  // El dominio tiene que ser del vocabulario compartido — si no, se rechaza en
  // vez de inventarse uno: es lo único que mantiene alineadas las tres
  // herramientas.
  const dominio = body.dominio as Dominio | undefined;
  if (!dominio || !DOMINIOS.some((d) => d.id === dominio)) {
    return NextResponse.json(
      { ok: false, error: "`dominio` desconocido", validos: DOMINIOS.map((d) => d.id) },
      { status: 400 }
    );
  }

  const service = createServiceRoleClient();
  const { data, error } = await service
    .from("integration_events")
    .insert({
      dominio,
      tipo: `entrante.${tipo}`,
      payload: body.payload ?? {},
      // `destino` se sella AL NACER justamente para que el despachador no lo
      // recoja: ya llegó, no hay nada que mandar hacia fuera.
      estado: "pendiente",
      destino: `entrada:${canal}`,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  // Ya está registrado; a partir de aquí nada puede perder el evento. Se aplica
  // en la misma petición para que Make reciba en la respuesta si su llamada
  // sirvió de algo — un 200 «lo recibí» que en realidad no hizo nada es cómo se
  // construye un escenario que parece funcionar durante meses.
  const resultado = await aplicarEntrante(tipo, body.payload ?? {});
  await service
    .from("integration_events")
    .update({
      estado: resultado.estado,
      aplicado_at: new Date().toISOString(),
      ultimo_error: resultado.estado === "fallido" ? resultado.detalle : null,
    })
    .eq("id", data.id);

  return NextResponse.json(
    { ok: resultado.estado !== "fallido", id: data.id, estado: resultado.estado, detalle: resultado.detalle },
    { status: resultado.estado === "fallido" ? 422 : 200 }
  );
}
