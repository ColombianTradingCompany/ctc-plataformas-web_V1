import Link from "next/link";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { CatalogoTabs } from "../../catalogo/CatalogoTabs";
import { CONTRATOS_LISTA_PATH } from "@/lib/triage/fobMinimo";
import styles from "@/components/panel/shared.module.css";

const TABS = [
  { value: "pending_signature", label: "Por firmar" },
  { value: "active", label: "Activos" },
  { value: "reconditioning", label: "Reacondicionamiento" },
  { value: "completed", label: "Completados" },
  // V5.84 (fase 7): la ruptura la declara el owner; «renovado» = ya se ofreció la renovación con el PVC nuevo.
  { value: "renovado", label: "Renovados" },
  { value: "ruptura", label: "Ruptura" },
] as const;

const GRADE_LABEL: Record<string, string> = { black: "Black", red: "Red", blue: "Blue", gold: "Gold", tyrian: "Tyrian" };

// ── Los contratos del Triage de Catálogo Activo, por estado (V5.196) ──
// Hasta la V5.195 esta lista ERA «Ofertas CP Aceptadas» (`/ocp/contratos`); el módulo se rebautizó «Triage de Catálogo Activo» y
// su ruta es ahora el triage. Los contratos —firma, ventana, despachos, humedad— siguen aquí y en `/ocp/contratos/<id>`.
export default async function ContratosListaPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const activeStatus = (status && TABS.some((t) => t.value === status) ? status : "pending_signature") as (typeof TABS)[number]["value"];

  const service = createServiceRoleClient();
  // V5.85: la señal de negociaciones Black abiertas se fue con el CRM de `black_negotiations` (fase 8).
  const { data: contracts } = await service
    .from("purchase_contracts")
    .select("id, status, grade_snapshot, price_per_kg_locked, quantity_frozen_kg, provisional_at, ratificado_at, lots(name, fincas(name))")
    .eq("status", activeStatus)
    .order("created_at", { ascending: false });

  return (
    <div>
      <CatalogoTabs />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1 className={styles.title}>Contratos</h1>
        <Link href="/ocp/contratos/humedad" className={styles.backLink}>
          Humedad fuera de rango →
        </Link>
      </div>

      <div className={styles.tabs}>
        {TABS.map((t) => (
          <Link key={t.value} href={`${CONTRATOS_LISTA_PATH}?status=${t.value}`} className={activeStatus === t.value ? styles.tabActive : undefined}>
            {t.label}
          </Link>
        ))}
      </div>

      {!contracts?.length && <p className={styles.empty}>No hay contratos en este estado.</p>}
      <div className={styles.list}>
        {contracts?.map((c) => {
          const lot = c.lots as unknown as { name: string; fincas: { name: string } | null } | null;
          return (
            <Link key={c.id} href={`/ocp/contratos/${c.id}`} style={{ textDecoration: "none" }}>
              <div className={styles.card}>
                <div>
                  <h3>{lot?.name}</h3>
                  <p className={styles.meta}>{lot?.fincas?.name ?? "—"}</p>
                </div>
                <div className={styles.actions}>
                  {/* V5.190: aceptado provisionalmente por CTCx en una sesión asistida, hasta que el productor lo ratifique. */}
                  {c.provisional_at && !c.ratificado_at && <span className={styles.badge} style={{ background: "#FFE2A8", color: "#3A2C00" }}>Provisional · por ratificar</span>}
                  {c.grade_snapshot && <span className={styles.badge}>{GRADE_LABEL[c.grade_snapshot] ?? c.grade_snapshot}</span>}
                  {c.price_per_kg_locked && <span className={styles.meta}>{c.price_per_kg_locked} $/kg · {c.quantity_frozen_kg} kg</span>}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
