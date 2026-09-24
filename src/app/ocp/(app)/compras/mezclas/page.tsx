import Link from "next/link";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/panel/ActionForm";
import { GRADO_POR_ID } from "@/lib/grados/definicion";
import { GRADOS_DE_MEZCLA, KG_MINIMOS_POR_COMPONENTE, MAX_COMPONENTES, MIN_COMPONENTES, unaSolaVariedad } from "@/lib/compras/mezclas";
import { crearMezcla } from "../../comprasActions";
import styles from "@/components/panel/shared.module.css";

// ── OCP · Compras · Mezclas (V5.87, 2.ª tanda del brief de Compras) ──────────────────────────
// «Cómo se combina»: las mezclas Black (3–4 orígenes y/o variedades) y Red (una sola variedad, 3–4 orígenes), una carga por
// productor, armadas con COMPRAS en firme. La regla vive en `src/lib/compras/mezclas.ts` (que la lee de `lectura.ts`) y la
// base la repite al cerrar. Una mezcla es un objeto de Compras con su código interno (decisión 4 del brief —si es un lote nuevo
// con código público y ficha— sigue con el owner: llevarla a la vitrina es otra tanda).

export const dynamic = "force-dynamic";

type MezclaRow = { id: string; codigo: string; nombre: string; grado: string; status: string; created_at: string; cerrada_at: string | null; mezcla_componentes: { kg: number | string; compra_id: string }[] };
const STATUS_LABEL: Record<string, string> = { borrador: "Borrador", cerrada: "Cerrada", anulada: "Anulada" };
const fecha = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("es-CO") : "—");

export default async function MezclasPage() {
  const service = createServiceRoleClient();
  const { data } = await service.from("mezclas").select("id, codigo, nombre, grado, status, created_at, cerrada_at, mezcla_componentes(kg, compra_id)").order("created_at", { ascending: false });
  const mezclas = (data as unknown as MezclaRow[] | null) ?? [];
  const kg = (m: MezclaRow) => Math.round(m.mezcla_componentes.reduce((a, c) => a + Number(c.kg), 0) * 10) / 10;

  return (
    <div>
      <Link href="/ocp/compras" className={styles.backLink}>
        ← Compras
      </Link>
      <h1 className={styles.title}>Mezclas de CTCx Selection</h1>
      <p className={styles.subtitle}>
        Cómo se combina lo comprado en firme. <b>Black</b>: blend de {MIN_COMPONENTES} a {MAX_COMPONENTES} orígenes y/o variedades. <b>Red</b>: una sola
        variedad, mezcla regional de {MIN_COMPONENTES} a {MAX_COMPONENTES} orígenes. <b>Una carga por productor</b> ({KG_MINIMOS_POR_COMPONENTE} kg de CPS) como
        mínimo en cada componente; una mezcla de dos no existe, de cinco tampoco. Blue, Gold y Tyrian son lote único.
      </p>
      <p className={styles.meta} style={{ marginBottom: 18 }}>
        Se arma como borrador, componente a componente, y se <b>cierra</b> cuando cumple la regla (la base la vuelve a comprobar). Lo asignado a una
        mezcla descuenta de lo disponible en <Link href="/ocp/ctc-selection">Oferta desde CTCx Selection</Link>. Una mezcla cerrada no se edita: se anula.
      </p>

      <section style={{ marginBottom: 30 }}>
        <div className={styles.sectionHead}>
          <h2>Nueva mezcla</h2>
        </div>
        <ActionForm action={crearMezcla} submitLabel="Crear el borrador" pendingLabel="Creando…" buttonClassName="btn btn-solid" className={styles.card} style={{ display: "block" }}>
          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label htmlFor="mz-nombre">Nombre</label>
              <input id="mz-nombre" name="nombre" placeholder="Ej. Papagayo Red Huila 2026-Q4" required />
            </div>
            <div className={styles.field}>
              <label htmlFor="mz-grado">Grado</label>
              <select id="mz-grado" name="grado" required defaultValue="black">
                {GRADOS_DE_MEZCLA.map((g) => (
                  <option key={g} value={g}>
                    {GRADO_POR_ID[g]?.nombre ?? g} — {unaSolaVariedad(g) ? "una sola variedad" : "orígenes y/o variedades"}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field} style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="mz-nota">Nota (opcional)</label>
              <input id="mz-nota" name="nota" placeholder="Para quién, perfil buscado…" />
            </div>
          </div>
        </ActionForm>
      </section>

      <section>
        <div className={styles.sectionHead}>
          <h2>Mezclas ({mezclas.length})</h2>
        </div>
        {mezclas.length === 0 ? (
          <p className={styles.empty}>Todavía no hay mezclas.</p>
        ) : (
          <div className={styles.list}>
            {mezclas.map((m) => (
              <Link key={m.id} href={`/ocp/compras/mezclas/${m.id}`} style={{ textDecoration: "none" }}>
                <div className={styles.card}>
                  <div>
                    <h3>
                      <code style={{ fontWeight: 400, marginRight: 8 }}>{m.codigo}</code>
                      {m.nombre}
                    </h3>
                    <p className={styles.meta}>
                      {m.mezcla_componentes.length} componente{m.mezcla_componentes.length === 1 ? "" : "s"} · {kg(m)} kg de CPS · creada el {fecha(m.created_at)}
                      {m.cerrada_at && <> · cerrada el {fecha(m.cerrada_at)}</>}
                    </p>
                  </div>
                  <div className={styles.actions}>
                    <span className={styles.badge}>{GRADO_POR_ID[m.grado as keyof typeof GRADO_POR_ID]?.nombre ?? m.grado}</span>
                    <span className={m.status === "cerrada" ? styles.badgeGood : m.status === "anulada" ? styles.badgeBad : styles.badge}>{STATUS_LABEL[m.status] ?? m.status}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
