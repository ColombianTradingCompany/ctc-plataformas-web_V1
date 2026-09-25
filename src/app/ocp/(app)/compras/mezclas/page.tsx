import Link from "next/link";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/panel/ActionForm";
import { GRADO_POR_ID } from "@/lib/grados/definicion";
import { GRADOS_DE_MEZCLA, MIN_COMPONENTES, MOQ_KG_MEZCLA, TIPO_MEZCLA_LABEL, type TipoDeMezcla } from "@/lib/compras/mezclas";
import { MOQ_CARGAS_BLACK_RED } from "@/lib/pvc/lectura";
import { crearMezcla } from "../../comprasActions";
import styles from "@/components/panel/shared.module.css";

// ── OCP · Adquisición · Mezclas (V5.87; por COMPOSICIÓN desde la V5.91, owner 2026-09-25) ─────────
// «Cómo se combina» lo comprado para CTCx Selection. Ya no hay regla de 3–4 productores: cada lote trae su composición
// (variedad, proceso, estate y región) y una mezcla Black/Red es Single Origin (varios estates, misma variedad y proceso) o
// Regional Blend (varios lotes de la misma región); el tipo se DERIVA. El mínimo lo pone el MOQ de compra (≥ 3 cargas) y CTCx
// asegura un mínimo por temporada desde Adquisición. La regla vive en `src/lib/compras/mezclas.ts` (lee `lectura.ts`).

export const dynamic = "force-dynamic";

type MezclaRow = { id: string; codigo: string; nombre: string; grado: string; status: string; tipo: TipoDeMezcla | null; temporada: string | null; objetivo_temporada_kg: number | string | null; created_at: string; cerrada_at: string | null; mezcla_componentes: { kg: number | string; compra_id: string }[] };
const STATUS_LABEL: Record<string, string> = { borrador: "Borrador", cerrada: "Cerrada", anulada: "Anulada" };
const fecha = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("es-CO") : "—");

export default async function MezclasPage() {
  const service = createServiceRoleClient();
  const { data } = await service.from("mezclas").select("id, codigo, nombre, grado, status, tipo, temporada, objetivo_temporada_kg, created_at, cerrada_at, mezcla_componentes(kg, compra_id)").order("created_at", { ascending: false });
  const mezclas = (data as unknown as MezclaRow[] | null) ?? [];
  const kg = (m: MezclaRow) => Math.round(m.mezcla_componentes.reduce((a, c) => a + Number(c.kg), 0) * 10) / 10;

  return (
    <div>
      <Link href="/ocp/compras" className={styles.backLink}>
        ← Adquisición de Stock Café
      </Link>
      <h1 className={styles.title}>Mezclas de CTCx Selection</h1>
      <p className={styles.subtitle}>
        Cómo se combina lo comprado en firme para la oferta. <b>Black</b> y <b>Red</b> los usa CTCx de forma estratégica como{" "}
        <b>{TIPO_MEZCLA_LABEL.single_origin}</b> (varios estates con la misma variedad y proceso) o <b>{TIPO_MEZCLA_LABEL.regional_blend}</b> (varios lotes
        de la misma región: Santander, Huila, Boyacá…). Cada lote trae su composición en la ficha —variedad, proceso, finca y región— y el tipo
        de la mezcla se deriva de ella. Blue, Gold y Tyrian son casi siempre Single Estate.
      </p>
      <p className={styles.meta} style={{ marginBottom: 18 }}>
        Ya no hay regla de «3 a 4 productores, una carga cada uno» (owner, 2026-09-25): el mínimo lo pone el <b>MOQ de compra</b> —una demanda de al
        menos {MOQ_CARGAS_BLACK_RED} cargas ({MOQ_KG_MEZCLA} kg de CPS)— y para estas mezclas CTCx <b>asegura un mínimo por temporada</b> desde
        Adquisición (el objetivo de cada mezcla; informa, no bloquea). Se arma como borrador con {MIN_COMPONENTES} o más lotes y se <b>cierra</b> cuando
        tiene tipo (la base lo vuelve a derivar). Lo asignado descuenta de lo disponible en <Link href="/ocp/ctc-selection">Oferta desde CTCx Selection</Link>.
        Una mezcla cerrada no se edita: se anula.
      </p>

      <section style={{ marginBottom: 30 }}>
        <div className={styles.sectionHead}>
          <h2>Nueva mezcla</h2>
        </div>
        <ActionForm action={crearMezcla} submitLabel="Crear el borrador" pendingLabel="Creando…" buttonClassName="btn btn-solid" className={styles.card} style={{ display: "block" }}>
          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label htmlFor="mz-nombre">Nombre</label>
              <input id="mz-nombre" name="nombre" placeholder="Ej. Papagayo Red Santander 2026-B" required />
            </div>
            <div className={styles.field}>
              <label htmlFor="mz-grado">Grado</label>
              <select id="mz-grado" name="grado" required defaultValue="black">
                {GRADOS_DE_MEZCLA.map((g) => (
                  <option key={g} value={g}>
                    {GRADO_POR_ID[g]?.nombre ?? g} — {TIPO_MEZCLA_LABEL.single_origin} o {TIPO_MEZCLA_LABEL.regional_blend}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label htmlFor="mz-temporada">Temporada (opcional)</label>
              <input id="mz-temporada" name="temporada" placeholder="Ej. 2026-B" />
            </div>
            <div className={styles.field}>
              <label htmlFor="mz-objetivo">Mínimo que CTCx asegura esta temporada (kg de CPS, opcional)</label>
              <input id="mz-objetivo" name="objetivo_temporada_kg" inputMode="decimal" placeholder={`Ej. ${MOQ_KG_MEZCLA}`} />
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
            {mezclas.map((m) => {
              const objetivo = m.objetivo_temporada_kg == null ? null : Number(m.objetivo_temporada_kg);
              return (
                <Link key={m.id} href={`/ocp/compras/mezclas/${m.id}`} style={{ textDecoration: "none" }}>
                  <div className={styles.card}>
                    <div>
                      <h3>
                        <code style={{ fontWeight: 400, marginRight: 8 }}>{m.codigo}</code>
                        {m.nombre}
                      </h3>
                      <p className={styles.meta}>
                        {m.mezcla_componentes.length} lote{m.mezcla_componentes.length === 1 ? "" : "s"} · {kg(m)} kg de CPS
                        {objetivo != null && <> · objetivo {m.temporada ?? "de temporada"}: {objetivo} kg ({kg(m) >= objetivo ? "cubierto" : `faltan ${Math.round((objetivo - kg(m)) * 10) / 10} kg`})</>}
                        {" "}· creada el {fecha(m.created_at)}
                        {m.cerrada_at && <> · cerrada el {fecha(m.cerrada_at)}</>}
                      </p>
                    </div>
                    <div className={styles.actions}>
                      <span className={styles.badge}>{GRADO_POR_ID[m.grado as keyof typeof GRADO_POR_ID]?.nombre ?? m.grado}</span>
                      {m.tipo && <span className={styles.badge}>{TIPO_MEZCLA_LABEL[m.tipo]}</span>}
                      <span className={m.status === "cerrada" ? styles.badgeGood : m.status === "anulada" ? styles.badgeBad : styles.badge}>{STATUS_LABEL[m.status] ?? m.status}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
