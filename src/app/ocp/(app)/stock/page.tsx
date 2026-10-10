import type { Metadata } from "next";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { cargarStock } from "@/lib/stock/servidor";
import { LinajeBoard, type LoteOpcion } from "./LinajeBoard";
import { StockTabs } from "./StockTabs";
import { CircuitoDelStock } from "../CircuitoDelStock";

export const metadata: Metadata = { title: "Stock CTCx · OCP", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// ── OCP · Manejo de Stock Físico · Stock CTCx (V5.195, owner 2026-10-09) ──────────────────────────────────────────────────────
// El café que está físicamente en CTCx, en partidas de pergamino, verde, tostado y empacado, con su linaje y su cuadre
// (`docs/PLAN_TRIAGE_CATALOGO.md` §2.1). Absorbe el Stock de Sample Kits: los kits son la segunda pestaña. El layout del OCP ya
// pasó la compuerta de la consola; `?partida=<id>` abre esa partida. V5.203: la franja del circuito arriba (Adquisición → Stock →
// Triage → Catálogo Activo), con el mismo stock ya cargado.
export default async function StockCtcxPage({ searchParams }: { searchParams: Promise<{ partida?: string }> }) {
  const { partida } = await searchParams;
  const service = createServiceRoleClient();
  const [stock, { data: lotesRaw }] = await Promise.all([
    cargarStock(service),
    service.from("lots").select("id, name, fincas(name)").order("name").limit(2000),
  ]);
  const uno = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);
  const lotes: LoteOpcion[] = ((lotesRaw as unknown as { id: string; name: string; fincas: { name: string } | { name: string }[] | null }[] | null) ?? []).map((l) => ({
    id: l.id,
    name: l.name,
    finca: uno(l.fincas)?.name ?? null,
  }));
  const elegida = partida && /^[0-9a-f-]{36}$/i.test(partida) ? partida : null;
  return (
    <div>
      <CircuitoDelStock actual="stock" stock={stock} />
      <StockTabs activa="linaje" />
      <LinajeBoard stock={stock} lotes={lotes} partidaInicial={elegida} />
    </div>
  );
}
