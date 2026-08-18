"use server";

// ── OCP · Anclas de mercado · Server Actions ─────────────────────────────────
// El módulo donde se consulta, se corrige y se acumula el histórico de las
// referencias de mercado. Hoy solo el precio interno de la FNC por carga; la
// tabla y la interfaz dejan sitio para las que vengan.
//
// La Calculadora de Mermas SIGUE usando el precio: lo que cambió es de dónde
// sale. Antes vivía en el localStorage del navegador de quien abriera la
// herramienta —se perdía al limpiar el caché y no lo veía nadie más—; ahora es
// una tabla y la herramienta recibe la última lectura al abrirse.

import { revalidatePath } from "next/cache";
import { requireConsoleWrite, quoteServiceClient } from "@/lib/panel/requireConsoleWrite";
import { fetchFncPrice } from "./fnc";
import type { MarketAnchor, AnchorResult } from "./types";

const NO_AUTH: AnchorResult = { ok: false, error: "Tu sesión del OCP no está activa. Vuelve a iniciar sesión." };

type Row = {
  id: string; kind: string; as_of: string; value: string | number; unit: string;
  source: string; source_url: string | null; note: string | null; automatic: boolean; created_at: string;
};

const toAnchor = (r: Row): MarketAnchor => ({
  id: r.id, kind: r.kind, asOf: r.as_of, value: Number(r.value), unit: r.unit,
  source: r.source, sourceUrl: r.source_url, note: r.note, automatic: r.automatic, createdAt: r.created_at,
});

export async function listAnchors(kind = "fnc_carga", limit = 180): Promise<MarketAnchor[] | null> {
  const who = await requireConsoleWrite("ecp");
  if (!who) return null;
  const service = quoteServiceClient();
  const { data } = await service
    .from("market_anchors")
    .select("id, kind, as_of, value, unit, source, source_url, note, automatic, created_at")
    .eq("kind", kind)
    .order("as_of", { ascending: false })
    .limit(limit);
  return ((data ?? []) as Row[]).map(toAnchor);
}

/** La última lectura. Sin gate: la usa la calculadora, que ya está detrás del
 *  gate de la consola, y no expone nada que no sea un precio público. */
export async function latestAnchor(kind = "fnc_carga"): Promise<MarketAnchor | null> {
  const service = quoteServiceClient();
  const { data } = await service
    .from("market_anchors")
    .select("id, kind, as_of, value, unit, source, source_url, note, automatic, created_at")
    .eq("kind", kind)
    .order("as_of", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? toAnchor(data as Row) : null;
}

/** Anotar a mano. Un mismo día se corrige en vez de duplicarse. */
export async function recordAnchor(input: {
  kind?: string; asOf: string; value: number; source?: string; note?: string; unit?: string;
}): Promise<AnchorResult> {
  const who = await requireConsoleWrite("ecp");
  if (!who) return NO_AUTH;
  if (!input.asOf) return { ok: false, error: "Falta la fecha de la lectura." };
  if (!(input.value > 0)) return { ok: false, error: "El valor tiene que ser mayor que cero." };

  const service = quoteServiceClient();
  const { error } = await service.from("market_anchors").upsert(
    {
      kind: input.kind ?? "fnc_carga",
      as_of: input.asOf,
      value: input.value,
      unit: input.unit ?? "COP/carga",
      source: input.source ?? "manual",
      note: input.note?.trim() || null,
      automatic: false,
      created_by: who.userId,
    },
    { onConflict: "kind,as_of" }
  );
  if (error) return { ok: false, error: error.message };
  revalidatePath("/ecp/anclas-mercado");
  return { ok: true };
}

export async function deleteAnchor(id: string): Promise<AnchorResult> {
  const who = await requireConsoleWrite("ecp");
  if (!who) return NO_AUTH;
  const service = quoteServiceClient();
  const { error } = await service.from("market_anchors").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/ecp/anclas-mercado");
  return { ok: true };
}

/** «Consultar precio de hoy», a mano. El cron hace lo mismo cada día. */
export async function consultFncNow(): Promise<AnchorResult> {
  const who = await requireConsoleWrite("ecp");
  if (!who) return NO_AUTH;
  try {
    const reading = await fetchFncPrice();
    if (!reading) {
      return { ok: false, error: "La página de la Federación no devolvió un precio reconocible. Anótalo a mano si lo tienes." };
    }
    const service = quoteServiceClient();
    const { error } = await service.from("market_anchors").upsert(
      {
        kind: "fnc_carga", as_of: reading.asOf, value: reading.value, unit: "COP/carga",
        source: "fnc", source_url: reading.sourceUrl, automatic: false, created_by: who.userId,
      },
      { onConflict: "kind,as_of" }
    );
    if (error) return { ok: false, error: error.message };
    revalidatePath("/ecp/anclas-mercado");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: `No se pudo consultar: ${(e as Error).message}` };
  }
}
