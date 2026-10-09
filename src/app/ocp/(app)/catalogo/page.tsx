import Link from "next/link";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/panel/ActionForm";
import { cargarTriage } from "@/lib/triage/servidor";
import { TRIAGE_PATH } from "@/lib/triage/fobMinimo";
import { archivarListado, editarListado } from "../catalogActions";
import { CatalogoTabs } from "./CatalogoTabs";
import styles from "@/components/panel/shared.module.css";

// ── OCP · Catálogo · Catálogo Activo (V5.196) ──────────────────────────────────────────────────────────────────────────────────
// Lo publicado. Desde la V5.196 un lote entra SOLO desde el Triage de Catálogo Activo (`/ocp/contratos`): su listado suma los kg de
// VERDE declarados, su ANCLA es el mayor FOB mínimo de sus entradas y el precio de venta no baja de ella (lo cuida la base). Aquí se
// edita lo comercial y se archiva lo que ya no tiene entradas. Un lote comprado en firme sale como CTCx Selection (la vitrina enseña
// el perfil, no la finca). (Hasta la V5.195 esta página publicaba a mano: kg de CPS 1:1 y precio tecleado.)

export const dynamic = "force-dynamic";

const GRADE_LABEL: Record<string, string> = { black: "Black", red: "Red", blue: "Blue", gold: "Gold", tyrian: "Tyrian" };
const STATUS_LABEL: Record<string, string> = { draft: "Borrador", published: "Publicado", sold_out: "Agotado", archived: "Archivado" };
const usd = (v: number, d = 2) => `US$ ${new Intl.NumberFormat("es-CO", { minimumFractionDigits: d, maximumFractionDigits: d }).format(v)}`;
const kg = (v: number) => new Intl.NumberFormat("es-CO", { maximumFractionDigits: 3 }).format(v);

export default async function CatalogoActivoPage() {
  const service = createServiceRoleClient();
  const [triage, { data: comprasRows }] = await Promise.all([
    cargarTriage(service),
    // V5.85 · V5.195: los lotes comprados en firme como CTCx Selection (no los sacos de un trato, que son solo stock).
    service.from("compras").select("lot_id").eq("destino", "selection"),
  ]);
  const selection = new Set(((comprasRows ?? []) as { lot_id: string }[]).map((c) => c.lot_id));
  const vivas = triage.declaraciones.filter((d) => d.viva);
  const activos = triage.listados.filter((l) => l.status !== "archived");
  const archivados = triage.listados.filter((l) => l.status === "archived");

  return (
    <div>
      <CatalogoTabs />
      <h1 className={styles.title}>Catálogo Activo</h1>
      <p className={styles.subtitle}>
        Lo que se ofrece en Cherry Picked, en kg de <b>verde</b>. Un lote entra desde el <Link href={TRIAGE_PATH}>Triage de Catálogo Activo</Link> con su
        FOB mínimo: el mayor de sus entradas es el <b>ancla</b> y el precio de venta no baja de ella. Aquí se edita lo comercial; las entradas se
        declaran, corrigen y retiran en el Triage.
      </p>

      {activos.length === 0 ? (
        <p className={styles.empty}>
          Nada publicado todavía. Se publica declarando café en el <Link href={TRIAGE_PATH}>Triage</Link>.
        </p>
      ) : (
        <div className={styles.list}>
          {activos.map((l) => {
            const entradas = vivas.filter((d) => d.listingId === l.id);
            return (
              <details className={styles.card} key={l.id} style={{ display: "block" }}>
                <summary style={{ cursor: "pointer" }}>
                  <b>{l.lotName}</b>{" "}
                  <span className={styles.meta}>
                    <span className={styles.badge}>{GRADE_LABEL[l.grade ?? ""] ?? l.grade}</span>{" "}
                    {selection.has(l.lotId) && <><span className={styles.badgeGood}>CTCx Selection</span> </>}
                    <span className={styles.badge}>{STATUS_LABEL[l.status] ?? l.status}</span> · {l.modo} · {kg(l.vendidoKg)}/{kg(l.totalKg)} kg vendidos · {usd(l.precioUsdKg)}/kg
                    {l.anclaUsdKg != null && <> · ancla {usd(l.anclaUsdKg, 3)}/kg</>}
                    {l.publicCode && <> · <code>{l.publicCode}</code></>}
                  </span>
                </summary>

                <div className={styles.meta} style={{ marginTop: 10 }}>
                  {entradas.length === 0 ? (
                    "Sin entradas vivas."
                  ) : (
                    <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
                      {entradas.map((d) => (
                        <li key={d.id}>
                          {d.codigo} · {d.tipo === "contrato" ? "contrato" : `stock ${d.partidaCodigo ?? ""}`} · {kg(d.kgVerde)} kg de verde · FOB mínimo {usd(d.fobUsdKg, 3)}/kg
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <ActionForm action={editarListado.bind(null, l.id)} submitLabel="Guardar lo comercial" pendingLabel="Guardando…" buttonClassName="btn btn-sm btn-solid" style={{ marginTop: 12 }}>
                  <div className={styles.formGrid}>
                    <div className={styles.field}>
                      <label htmlFor={`price-${l.id}`}>Precio de venta (US$/kg de verde)</label>
                      <input id={`price-${l.id}`} name="price_per_kg" type="number" step="0.01" min={l.anclaUsdKg ?? 0} defaultValue={l.precioUsdKg} required />
                    </div>
                    <div className={styles.field}>
                      <label htmlFor={`mode-${l.id}`}>Modalidad</label>
                      <select id={`mode-${l.id}`} name="commercial_mode" defaultValue={l.modo}>
                        <option value="spot">Spot (inventario disponible)</option>
                        <option value="pre">Pre-venta</option>
                      </select>
                    </div>
                    <div className={styles.field}>
                      <label htmlFor={`unit-${l.id}`}>Unidad de compra (kg)</label>
                      <input id={`unit-${l.id}`} name="unit_kg" type="number" step="0.1" defaultValue={l.unidadKg} required />
                    </div>
                    <div className={styles.field}>
                      <label htmlFor={`moq-${l.id}`}>MOQ (kg)</label>
                      <input id={`moq-${l.id}`} name="moq_kg" type="number" step="0.1" defaultValue={l.moqKg} required />
                    </div>
                    <div className={styles.field}>
                      <label htmlFor={`deposit-${l.id}`}>Depósito pre-venta (%)</label>
                      <input id={`deposit-${l.id}`} name="deposit_pct" type="number" defaultValue={l.depositoPct} />
                    </div>
                    <div className={styles.field}>
                      <label htmlFor={`arrival-${l.id}`}>Fecha de llegada</label>
                      <input id={`arrival-${l.id}`} name="arrival_date" type="date" defaultValue={l.llegada ?? ""} />
                    </div>
                  </div>
                  <label className={styles.field} style={{ display: "flex", alignItems: "center", gap: 8, flexDirection: "row" }}>
                    <input type="checkbox" name="transparency_credit_enabled" value="true" defaultChecked={l.creditoTransparencia} />
                    Activar Transparency Credit (muestra el precio pactado con el productor frente al de referencia, en la página pública del lote)
                  </label>
                </ActionForm>
                {entradas.length === 0 && (
                  <ActionForm action={archivarListado.bind(null, l.id)} submitLabel="Archivar" pendingLabel="Archivando…" buttonClassName="btn btn-sm" style={{ marginTop: 8 }} />
                )}
              </details>
            );
          })}
        </div>
      )}

      {archivados.length > 0 && (
        <>
          <h3 style={{ marginTop: 32 }}>Archivados ({archivados.length})</h3>
          <div className={styles.list}>
            {archivados.map((l) => (
              <div className={styles.card} key={l.id}>
                <div>
                  <h3>{l.lotName}</h3>
                  <p className={styles.meta}>
                    <span className={styles.badge}>{GRADE_LABEL[l.grade ?? ""] ?? l.grade}</span> · {kg(l.vendidoKg)} kg vendidos · {usd(l.precioUsdKg)}/kg
                    {l.publicCode && <> · <code>{l.publicCode}</code></>} · vuelve a publicarse declarando en el Triage
                  </p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
