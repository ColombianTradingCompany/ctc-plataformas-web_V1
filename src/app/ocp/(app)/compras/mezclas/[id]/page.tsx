import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/panel/ActionForm";
import { GRADO_POR_ID } from "@/lib/grados/definicion";
import { KG_MINIMOS_POR_COMPONENTE, MAX_COMPONENTES, MIN_COMPONENTES, resumenDeMezcla, unaSolaVariedad, validarCierre } from "@/lib/compras/mezclas";
import { cargarMezcla, comprasDisponiblesPara } from "@/lib/compras/mezclasServidor";
import { agregarComponente, anularMezcla, cerrarMezcla, quitarComponente } from "../../../comprasActions";
import styles from "@/components/panel/shared.module.css";

// ── Una mezcla (V5.87): sus componentes, lo que falta para cumplir la regla, cerrar o anular ──

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = { borrador: "Borrador", cerrada: "Cerrada", anulada: "Anulada" };
const fecha = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("es-CO") : "—");
const td: React.CSSProperties = { padding: "6px 8px", whiteSpace: "nowrap", verticalAlign: "top" };

export default async function MezclaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const service = createServiceRoleClient();
  const mezcla = await cargarMezcla(service, id);
  if (!mezcla) notFound();
  const borrador = mezcla.status === "borrador";
  const candidatas = borrador && mezcla.componentes.length < MAX_COMPONENTES ? await comprasDisponiblesPara(service, mezcla.grado, id) : [];
  const resumen = resumenDeMezcla(mezcla.componentes);
  const faltas = validarCierre(mezcla.grado, mezcla.componentes);
  const yaProductores = new Set(mezcla.componentes.map((c) => c.producerId));
  const variedadDeLaMezcla = unaSolaVariedad(mezcla.grado) ? mezcla.componentes[0]?.variedad?.trim().toLowerCase() : undefined;
  const elegibles = candidatas.filter((c) => !yaProductores.has(c.producerId) && (variedadDeLaMezcla == null || (c.variedad ?? "").trim().toLowerCase() === variedadDeLaMezcla));

  return (
    <div>
      <Link href="/ocp/compras/mezclas" className={styles.backLink}>
        ← Mezclas
      </Link>
      <h1 className={styles.title}>
        <code style={{ fontWeight: 400, marginRight: 8 }}>{mezcla.codigo}</code>
        {mezcla.nombre}{" "}
        <span className={styles.badge}>{GRADO_POR_ID[mezcla.grado]?.nombre ?? mezcla.grado}</span>{" "}
        <span className={mezcla.status === "cerrada" ? styles.badgeGood : mezcla.status === "anulada" ? styles.badgeBad : styles.badge}>{STATUS_LABEL[mezcla.status]}</span>
      </h1>
      <p className={styles.subtitle}>
        {unaSolaVariedad(mezcla.grado) ? "Una sola variedad, mezcla regional" : "Blend de orígenes y/o variedades"} de {MIN_COMPONENTES} a {MAX_COMPONENTES} orígenes · una carga ({KG_MINIMOS_POR_COMPONENTE} kg de CPS) por productor.
        {mezcla.nota && <> · {mezcla.nota}</>}
      </p>
      <p className={styles.meta} style={{ marginBottom: 16 }}>
        <b>{resumen.kgTotal} kg de CPS</b> ({resumen.cargas} cargas) · {resumen.componentes} componente{resumen.componentes === 1 ? "" : "s"} · {resumen.productores} productor{resumen.productores === 1 ? "" : "es"}
        {resumen.variedades.length > 0 && <> · {resumen.variedades.join(" · ")}</>} · creada el {fecha(mezcla.createdAt)}
        {mezcla.cerradaAt && <> · cerrada el {fecha(mezcla.cerradaAt)}</>}
        {mezcla.status === "anulada" && <> · anulada el {fecha(mezcla.anuladaAt)}: {mezcla.anuladaMotivo}</>}
      </p>

      <section style={{ marginBottom: 28 }}>
        <div className={styles.sectionHead}>
          <h2>Componentes ({mezcla.componentes.length})</h2>
        </div>
        {mezcla.componentes.length === 0 ? (
          <p className={styles.empty}>Sin componentes todavía. Añada compras del grado {GRADO_POR_ID[mezcla.grado]?.nombre ?? mezcla.grado} abajo.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <thead>
                <tr style={{ color: "var(--muted)", textAlign: "left" }}>
                  <th style={td}>Lote</th>
                  <th style={td}>Productor · finca</th>
                  <th style={td}>Variedad</th>
                  <th style={{ ...td, textAlign: "right" }}>kg en la mezcla</th>
                  <th style={{ ...td, textAlign: "right" }}>Compra (kg)</th>
                  <th style={{ ...td, textAlign: "right" }}>Sin asignar en otras</th>
                  {borrador && <th style={td} />}
                </tr>
              </thead>
              <tbody>
                {mezcla.componentes.map((c) => (
                  <tr key={c.id} style={{ borderTop: "1px solid var(--line)" }}>
                    <td style={td}>{c.lotName}</td>
                    <td style={td}>
                      {c.producerName}
                      <div className={styles.meta}>{c.fincaName ?? "—"}</div>
                    </td>
                    <td style={td}>{c.variedad ?? <span className={styles.warn}>sin variedad</span>}</td>
                    <td style={{ ...td, textAlign: "right" }}>
                      <b>{c.kg}</b>
                    </td>
                    <td style={{ ...td, textAlign: "right" }}>{c.compraKg}</td>
                    <td style={{ ...td, textAlign: "right" }}>{c.disponibleKg}</td>
                    {borrador && (
                      <td style={td}>
                        <ActionForm action={quitarComponente.bind(null, id, c.id)} submitLabel="Quitar" pendingLabel="Quitando…" buttonClassName="btn btn-sm" />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {borrador && (
        <>
          {mezcla.componentes.length < MAX_COMPONENTES && (
            <section style={{ marginBottom: 28 }}>
              <div className={styles.sectionHead}>
                <h2>Añadir un componente</h2>
              </div>
              {elegibles.length === 0 ? (
                <p className={styles.empty}>
                  No hay compras {GRADO_POR_ID[mezcla.grado]?.nombre ?? mezcla.grado} elegibles: hace falta una compra en firme de otro productor
                  {variedadDeLaMezcla ? ` de la variedad de la mezcla` : ""} con al menos {KG_MINIMOS_POR_COMPONENTE} kg sin asignar. Se registran en{" "}
                  <Link href="/ocp/compras">Compras</Link>.
                </p>
              ) : (
                <ActionForm action={agregarComponente.bind(null, id)} submitLabel="Añadir" pendingLabel="Añadiendo…" buttonClassName="btn btn-sm btn-solid" className={styles.card} style={{ display: "block" }}>
                  <div className={styles.formGrid}>
                    <div className={styles.field} style={{ gridColumn: "1 / -1" }}>
                      <label htmlFor="mz-compra">Compra</label>
                      <select id="mz-compra" name="compra_id" required defaultValue="">
                        <option value="" disabled>
                          Elija la compra…
                        </option>
                        {elegibles.map((c) => (
                          <option key={c.compraId} value={c.compraId}>
                            {c.lotName} · {c.producerName} · {c.fincaName ?? "—"} · {c.variedad ?? "sin variedad"} · {c.disponibleKg} kg sin asignar
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className={styles.field}>
                      <label htmlFor="mz-kg">Kilos de CPS (≥ {KG_MINIMOS_POR_COMPONENTE})</label>
                      <input id="mz-kg" name="kg" inputMode="decimal" defaultValue={KG_MINIMOS_POR_COMPONENTE} required />
                    </div>
                  </div>
                </ActionForm>
              )}
            </section>
          )}

          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
            <div className={styles.card} style={{ flexDirection: "column", alignItems: "stretch" }}>
              <h3 style={{ margin: 0 }}>Cerrar la mezcla</h3>
              {faltas.length === 0 ? (
                <>
                  <p className={styles.meta}>Cumple la regla. Al cerrar, los componentes quedan fijos y lo asignado deja de estar disponible para ofrecer por lote.</p>
                  <ActionForm action={cerrarMezcla.bind(null, id)} submitLabel="Cerrar la mezcla" pendingLabel="Cerrando…" buttonClassName="btn btn-sm btn-solid" />
                </>
              ) : (
                <ul className={styles.meta} style={{ paddingLeft: 18, margin: "6px 0 0", display: "grid", gap: 4 }}>
                  {faltas.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              )}
            </div>
            <div className={styles.card} style={{ flexDirection: "column", alignItems: "stretch" }}>
              <h3 style={{ margin: 0 }}>Anular</h3>
              <p className={styles.meta}>Nada se borra: la mezcla queda anulada con su motivo y sus compras vuelven a estar disponibles.</p>
              <ActionForm action={anularMezcla.bind(null, id)} submitLabel="Anular la mezcla" pendingLabel="Anulando…" buttonClassName="btn btn-sm" style={{ display: "grid", gap: 6 }}>
                <input name="motivo" placeholder="Motivo" required />
              </ActionForm>
            </div>
          </section>
        </>
      )}

      {mezcla.status === "cerrada" && (
        <section style={{ maxWidth: 420 }}>
          <div className={styles.card} style={{ flexDirection: "column", alignItems: "stretch" }}>
            <h3 style={{ margin: 0 }}>Anular</h3>
            <p className={styles.meta}>Una mezcla cerrada no se edita. Si no va, se anula con motivo y sus compras vuelven a estar disponibles.</p>
            <ActionForm action={anularMezcla.bind(null, id)} submitLabel="Anular la mezcla" pendingLabel="Anulando…" buttonClassName="btn btn-sm" style={{ display: "grid", gap: 6 }}>
              <input name="motivo" placeholder="Motivo" required />
            </ActionForm>
          </div>
        </section>
      )}
    </div>
  );
}
