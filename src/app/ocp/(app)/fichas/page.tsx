import Link from "next/link";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { fetchProducerContacts } from "@/lib/bcpProducers";
import { ctcLotReferenceShort } from "@/components/kaffetal-regal/data";
import { rowToLotFicha, ordenaFichas, type LotFicha } from "@/lib/fichas/tipos";
import type { FichaFormData } from "@/components/kaffetal-regal/ficha/fichaData";
import { LotFichasCard, type SoporteRef } from "./FichasClient";
import styles from "@/components/panel/shared.module.css";

// ── Fichas Técnicas (V5.23) ──────────────────────────────────────────────────
// El taller documental del lote, lado CTCx. Aquí están los SOPORTES que el
// productor adjuntó en B2/B3 (hojas de catación y análisis físicos), el
// ESCÁNER VISUAL que los lee con IA (opt-in: un botón por lote, nunca
// automático) y el SET de Fichas Técnicas que resulta — de las cuales CTCx
// fija UNA como la oficial. El productor ve el set en los panes B2/B3 de su
// Ficha (solo lectura, RLS select-own).

type LotRow = {
  id: string;
  name: string;
  stage: string;
  grade: string | null;
  producer_id: string;
  datasheet: Partial<FichaFormData> | null;
  fincas: { name: string } | { name: string }[] | null;
};

function soportesDe(ds: Partial<FichaFormData> | null): SoporteRef[] {
  if (!ds) return [];
  const out: SoporteRef[] = [];
  const add = (files: { assetId: string; fileName: string }[] | undefined, section: "b2" | "b3", kind: "pdf" | "foto") => {
    for (const f of files ?? []) if (f?.assetId) out.push({ ...f, section, kind });
  };
  add(ds.b2_files_pdf, "b2", "pdf");
  add(ds.b2_files_foto, "b2", "foto");
  add(ds.b3_files_pdf, "b3", "pdf");
  add(ds.b3_files_foto, "b3", "foto");
  return out;
}

/** ¿El productor reportó algo compilable en B2/B3? (para habilitar el botón
 *  «Compilar del reporte» sin gastar un viaje al servidor en saberlo). */
function tieneReporte(ds: Partial<FichaFormData> | null): boolean {
  if (!ds) return false;
  const campos = [ds.b2_score, ds.cupping_profile, ds.yield_factor_producer, ds.b3_almendra_total, ds.b3_densidad_verde, ds.fa_parch_hum, ds.b3_humedad_verde];
  return campos.some((v) => typeof v === "string" && v.trim() !== "");
}

export default async function OcpFichasPage() {
  const service = createServiceRoleClient();
  const [{ data: lotsRaw }, { data: fichasRaw }] = await Promise.all([
    service
      .from("lots")
      .select("id, name, stage, grade, producer_id, datasheet, fincas(name)")
      .order("created_at", { ascending: false }),
    service
      .from("lot_fichas")
      .select("id, lot_id, source, title, data, source_files, model, confianza, observaciones, is_official, created_at")
      .order("created_at", { ascending: false }),
  ]);

  const lots = (lotsRaw as LotRow[] | null) ?? [];
  const fichasByLot = new Map<string, LotFicha[]>();
  for (const r of (fichasRaw as Parameters<typeof rowToLotFicha>[0][] | null) ?? []) {
    const f = rowToLotFicha(r);
    fichasByLot.set(f.lotId, [...(fichasByLot.get(f.lotId) ?? []), f]);
  }

  // Solo lotes con material: soportes adjuntos, reporte compilable o fichas ya
  // creadas. Un lote recién nacido sin nada de eso no pinta aquí.
  const conMaterial = lots
    .map((l) => ({ lot: l, soportes: soportesDe(l.datasheet), reporte: tieneReporte(l.datasheet), fichas: ordenaFichas(fichasByLot.get(l.id) ?? []) }))
    .filter((x) => x.soportes.length > 0 || x.reporte || x.fichas.length > 0);

  const producers = await fetchProducerContacts(service, conMaterial.map((x) => x.lot.producer_id));
  const name = (id: string) => producers.get(id)?.fullName ?? producers.get(id)?.companyName ?? "—";

  return (
    <div>
      <h1 className={styles.title}>Fichas Técnicas</h1>
      <p className={styles.subtitle}>
        Los soportes que cada productor adjuntó en B2/B3, el <b>escáner visual</b> que los lee (IA, bajo demanda) y el{" "}
        <b>set de Fichas Técnicas</b> del lote — una de ellas se fija como <b>la oficial</b>. El productor ve el set en
        los panes B2 y B3 de su <Link href="/ocp/lotes">Ficha</Link>.
      </p>

      {!conMaterial.length && <p className={styles.empty}>Ningún lote tiene soportes, reporte B2/B3 ni fichas todavía.</p>}

      <div style={{ display: "grid", gap: 14 }}>
        {conMaterial.map(({ lot, soportes, reporte, fichas }) => {
          const finca = (Array.isArray(lot.fincas) ? lot.fincas[0] : lot.fincas) as { name: string } | null;
          return (
            <LotFichasCard
              key={lot.id}
              lotId={lot.id}
              header={
                <>
                  <Link href={`/ocp/lotes#lot-${lot.id}`} style={{ fontWeight: 700, color: "var(--ink)", textDecoration: "none" }}>
                    {lot.name}
                  </Link>
                  <p className={styles.meta} style={{ margin: "2px 0 0" }}>
                    {name(lot.producer_id)} · {finca?.name ?? "—"} · <span className="mono">{ctcLotReferenceShort(lot.id)}</span>
                    {lot.grade && <> · <b style={{ color: `var(--t-${lot.grade})` }}>{lot.grade}</b></>}
                  </p>
                </>
              }
              soportes={soportes}
              tieneReporte={reporte}
              fichas={fichas}
            />
          );
        })}
      </div>
    </div>
  );
}
