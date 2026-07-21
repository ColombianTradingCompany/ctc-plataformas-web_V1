import Link from "next/link";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { fetchProducerContacts } from "@/lib/bcpProducers";
import styles from "../shared.module.css";

// ── Galardonados (nuevo, 2026-07-21) ─────────────────────────────────────────
// Registro de TODOS los lotes que ganaron un grado en la Kaffetal Regal Arena,
// organizados por su Grado CTC. Es la vitrina interna del palmarés; publicar a
// Cherry Picked (no-tyrian) o subastar (tyrian) se gestiona desde el Catálogo.

const GRADES: { key: string; label: string }[] = [
  { key: "black", label: "Black" },
  { key: "red", label: "Red" },
  { key: "blue", label: "Blue" },
  { key: "gold", label: "Gold" },
  { key: "tyrian", label: "Tyrian" },
];

type LotRow = { id: string; name: string; grade: string | null; producer_id: string; fincas: { name: string } | { name: string }[] | null };

export default async function BcpGalardonadosPage() {
  const service = createServiceRoleClient();
  const { data: lotsRaw } = await service
    .from("lots")
    .select("id, name, grade, producer_id, fincas(name)")
    .eq("stage", "galardonado")
    .order("name", { ascending: true });
  const lots = (lotsRaw as LotRow[] | null) ?? [];
  const producers = await fetchProducerContacts(service, lots.map((l) => l.producer_id));

  const byGrade = new Map<string, LotRow[]>();
  for (const l of lots) {
    const g = l.grade ?? "—";
    byGrade.set(g, [...(byGrade.get(g) ?? []), l]);
  }

  return (
    <div>
      <h1 className={styles.title}>Galardonados</h1>
      <p className={styles.subtitle}>
        Todos los lotes que ganaron un grado en la Kaffetal Regal Arena, organizados por su <b>Grado CTC</b>. Publicar a
        Cherry Picked o subastar un Tyrian se hace desde <Link href="/bcp/catalogo">Catálogo Cherry Picked</Link>.
      </p>
      {!lots.length && <p className={styles.empty}>Aún no hay lotes galardonados — llegan al cerrar cada jornada de Arena.</p>}
      <div className={styles.board}>
        {GRADES.map((g) => {
          const list = byGrade.get(g.key) ?? [];
          return (
            <div className={styles.column} key={g.key} style={{ borderTop: `3px solid var(--t-${g.key})` }}>
              <div className={styles.columnHead}>
                <h3>{g.label}</h3>
                <span className={styles.columnCount}>{list.length}</span>
              </div>
              <div className={styles.columnList}>
                {!list.length && <p className={styles.empty}>—</p>}
                {list.map((l) => {
                  const finca = (Array.isArray(l.fincas) ? l.fincas[0] : l.fincas) as { name: string } | null;
                  return (
                    <div key={l.id} className={styles.miniCard}>
                      <Link href={`/bcp/lotes#lot-${l.id}`} style={{ fontWeight: 700, color: "var(--ink)", textDecoration: "none" }}>
                        {l.name}
                      </Link>
                      <p className={styles.meta} style={{ margin: "4px 0 0" }}>
                        {producers.get(l.producer_id)?.fullName ?? "Productor"}
                        {finca?.name ? ` · ${finca.name}` : ""}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
