// ── Cotizador Courier · el recargo de combustible, al día ────────────────────────────────────────────
// Lo que corre el cron semanal (`/api/cron/courier-combustible`) y el botón «Actualizar ahora» de la
// pantalla: lee la EIA, pasa cada precio por la tabla de FedEx y anota el % de su semana en
// `courier_recargos` como AUTOMÁTICO. Nunca pisa un valor anotado a mano: si alguien lo escribió, manda.
// La regla y el porqué están en `./combustible.ts`.

import type { SupabaseClient } from "@supabase/supabase-js";
import { parseEiaSemanal, pctPorPrecio, semanaFedex, type EscalaCombustible } from "./combustible";

export const EIA_URL = "https://www.eia.gov/dnav/pet/hist/LeafHandler.ashx?n=PET&s=EER_EPJK_PF4_RGC_DPG&f=W";
const TRANSPORTISTA = "fedex";
/** Cuántas semanas recientes se revisan en cada pasada: la próxima y dos atrás, por si un lunes falló. */
const SEMANAS = 3;

export type ResultadoCombustible = {
  ok: boolean;
  anotadas: { semana: string; pct: number; usd: number }[];
  omitidas: { semana: string; motivo: string }[];
  error?: string;
};

export async function actualizarCombustible(db: SupabaseClient, signal?: AbortSignal): Promise<ResultadoCombustible> {
  const res = await fetch(EIA_URL, { signal, headers: { "User-Agent": "ctcexport.com cotizador-courier" }, cache: "no-store" });
  if (!res.ok) return { ok: false, anotadas: [], omitidas: [], error: `EIA respondió ${res.status}` };
  const precios = parseEiaSemanal(await res.text());
  if (!precios.length) return { ok: false, anotadas: [], omitidas: [], error: "La página de la EIA cambió de formato: no se reconoció ningún precio. No se anota nada." };

  const { data: tablas, error: e1 } = await db.from("courier_combustible_escalas")
    .select("vigente_desde, escalas, fuente").eq("transportista", TRANSPORTISTA).order("vigente_desde", { ascending: false });
  if (e1) return { ok: false, anotadas: [], omitidas: [], error: e1.message };

  const out: ResultadoCombustible = { ok: true, anotadas: [], omitidas: [] };
  for (const p of precios.slice(-SEMANAS)) {
    const semana = semanaFedex(p.semanaFin);
    const tabla = (tablas ?? []).find((t) => t.vigente_desde <= semana.desde);
    if (!tabla) { out.omitidas.push({ semana: semana.desde, motivo: "no hay tabla de FedEx vigente para esa semana" }); continue; }
    const pct = pctPorPrecio(tabla.escalas as EscalaCombustible[], p.usd);
    if (pct === null) { out.omitidas.push({ semana: semana.desde, motivo: `$${p.usd} está fuera de la tabla de FedEx: FedEx la habrá cambiado; anota el % a mano y actualiza la tabla` }); continue; }

    const { data: previa } = await db.from("courier_recargos").select("automatico, valor")
      .eq("transportista", TRANSPORTISTA).eq("concepto", "combustible").eq("vigente_desde", semana.desde).maybeSingle();
    if (previa && !previa.automatico) { out.omitidas.push({ semana: semana.desde, motivo: `ya anotada a mano (${previa.valor} %): manda la mano` }); continue; }

    const { error } = await db.from("courier_recargos").upsert({
      transportista: TRANSPORTISTA, concepto: "combustible", tipo: "pct", valor: pct,
      vigente_desde: semana.desde, vigente_hasta: semana.hasta, automatico: true,
      indice_usd: p.usd, indice_semana: p.semanaFin,
      fuente: `automático · EIA USGC jet fuel semana al ${p.semanaFin} = $${p.usd}/gal → tabla FedEx vigente desde ${tabla.vigente_desde}`,
    }, { onConflict: "transportista,concepto,vigente_desde" });
    if (error) { out.ok = false; out.error = error.message; break; }
    out.anotadas.push({ semana: semana.desde, pct, usd: p.usd });
  }
  return out;
}
