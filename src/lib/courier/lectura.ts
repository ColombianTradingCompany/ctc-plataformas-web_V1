import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { Cotizacion, Entrada } from "./calculo";

// ── El acta congelada de una cotización courier, para LEERLA desde otra consola (V5.97) ─────────
// El owner (2026-09-30) le dio LECTURA al colaborador que tiene la LCP y no el ECP: ve el desglose de una cotización
// guardada, no el cotizador. Este lector NO lleva compuerta propia: la pone la página que lo monta —hoy
// `/lcp/crm/caas/cotizacion/[id]`, bajo el layout de la LCP (`requireConsoleAccess("lcp")`)—, igual que las lecturas
// de `LeadsBoard`. Devuelve SOLO lo que la tarjeta del CRM ya enseña más el desglose por concepto: nunca los % del
// acuerdo con FedEx (confidencial, cláusula 6), que se quedan en el cotizador del ECP.

export type CotizacionLeida = {
  id: string;
  leadId: string | null;
  itemCaas: string | null;
  nota: string | null;
  createdAt: string;
  servicioElegido: string | null;
  entradas: Entrada;
  pais: string | null;
  pesoRealKg: number;
  pesoFacturableKg: number;
  avisos: string[];
  opciones: { clave: string; etiqueta: string; disponible: boolean; motivo?: string; pesoCobradoKg: number; totalUsd: number; lineas: { concepto: string; usd: number }[] }[];
};

export async function cotizacionCongelada(id: string): Promise<CotizacionLeida | null> {
  const { data } = await createServiceRoleClient()
    .from("courier_cotizaciones")
    .select("id, lead_id, nota, created_at, servicio_elegido, entradas, snapshot, leads(nombre)")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const snapshot = data.snapshot as Cotizacion;
  const lead = (Array.isArray(data.leads) ? data.leads[0] : data.leads) as { nombre: string } | null;
  return {
    id: data.id,
    leadId: data.lead_id ?? null,
    itemCaas: lead?.nombre ?? null,
    nota: data.nota ?? null,
    createdAt: data.created_at,
    servicioElegido: data.servicio_elegido ?? null,
    entradas: data.entradas as Entrada,
    pais: snapshot.pais ?? null,
    pesoRealKg: snapshot.pesoRealKg,
    pesoFacturableKg: snapshot.pesoFacturableKg,
    avisos: snapshot.avisos ?? [],
    opciones: (snapshot.opciones ?? []).map((o) => ({
      clave: `${o.servicio}:${o.embalaje}`,
      etiqueta: o.etiqueta,
      disponible: o.disponible,
      motivo: o.motivo,
      pesoCobradoKg: o.pesoCobradoKg,
      totalUsd: o.totalUsd,
      lineas: (o.lineas ?? []).map((l) => ({ concepto: l.concepto, usd: l.usd })),
    })),
  };
}
