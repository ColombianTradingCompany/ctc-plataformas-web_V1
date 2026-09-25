import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/panel/ActionForm";
import { GRADO_POR_ID } from "@/lib/grados/definicion";
import { MIN_COMPONENTES, MOQ_KG_MEZCLA, TIPO_MEZCLA_LABEL, resumenDeMezcla, tipoDeMezcla, validarCierre, validarComponente } from "@/lib/compras/mezclas";
import { CARGA_KG } from "@/lib/trato/terminos";
import { cargarMezcla, comprasDisponiblesPara } from "@/lib/compras/mezclasServidor";
import { agregarComponente, anularMezcla, cerrarMezcla, guardarObjetivoDeMezcla, quitarComponente } from "../../../comprasActions";
import styles from "@/components/panel/shared.module.css";

// ── Una mezcla (V5.87 · composición V5.91): sus lotes, el tipo que se deriva, lo que falta para cerrar, cerrar o anular ──

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
  const candidatas = borrador ? await comprasDisponiblesPara(service, mezcla.grado, id) : [];
  const resumen = resumenDeMezcla(mezcla.componentes);
  const derivado = tipoDeMezcla(mezcla.componentes);
  const faltas = validarCierre(mezcla.grado, mezcla.componentes);
  // Elegibles: las que, añadidas con cualquier kilaje, dejan a la mezcla con un tipo (la regla pura decide; los kilos se validan al añadir).
  const elegibles = candidatas.filter((c) => validarComponente(mezcla.grado, mezcla.componentes, { ...c, kg: Math.min(c.disponibleKg, 1) }).length === 0);
  const tipoMostrado = mezcla.tipo ?? derivado.tipo;
  const objetivo = mezcla.objetivoTemporadaKg;

  return (
    <div>
      <Link href="/ocp/compras/mezclas" className={styles.backLink}>
        ← Mezclas
      </Link>
      <h1 className={styles.title}>
        <code style={{ fontWeight: 400, marginRight: 8 }}>{mezcla.codigo}</code>
        {mezcla.nombre}{" "}
        <span className={styles.badge}>{GRADO_POR_ID[mezcla.grado]?.nombre ?? mezcla.grado}</span>{" "}
        {tipoMostrado && <span className={styles.badge}>{TIPO_MEZCLA_LABEL[tipoMostrado]}</span>}{" "}
        <span className={mezcla.status === "cerrada" ? styles.badgeGood : mezcla.status === "anulada" ? styles.badgeBad : styles.badge}>{STATUS_LABEL[mezcla.status]}</span>
      </h1>
      <p className={styles.subtitle}>
        {tipoMostrado === "single_origin" && <>Single Origin: varios estates con la misma variedad y proceso ({derivado.motivo}).</>}
        {tipoMostrado === "regional_blend" && <>Regional Blend: varios lotes de la misma región ({derivado.motivo}).</>}
        {!tipoMostrado && <>Sin tipo todavía: será {TIPO_MEZCLA_LABEL.single_origin} (varios estates, misma variedad y proceso) o {TIPO_MEZCLA_LABEL.regional_blend} (misma región) según sus lotes.</>}
        {mezcla.nota && <> · {mezcla.nota}</>}
      </p>
      <p className={styles.meta} style={{ marginBottom: 16 }}>
        <b>{resumen.kgTotal} kg de CPS</b> ({resumen.cargas} cargas{resumen.cubreMoq ? "" : ` — bajo el MOQ de compra de ${MOQ_KG_MEZCLA} kg`}) · {resumen.componentes} lote{resumen.componentes === 1 ? "" : "s"} ·{" "}
        {resumen.estates} estate{resumen.estates === 1 ? "" : "s"} · {resumen.productores} productor{resumen.productores === 1 ? "" : "es"}
        {resumen.variedades.length > 0 && <> · {resumen.variedades.join(" · ")}</>}
        {resumen.procesos.length > 0 && <> · {resumen.procesos.join(" · ")}</>}
        {resumen.regiones.length > 0 && <> · {resumen.regiones.join(" · ")}</>} · creada el {fecha(mezcla.createdAt)}
        {mezcla.cerradaAt && <> · cerrada el {fecha(mezcla.cerradaAt)}</>}
        {mezcla.status === "anulada" && <> · anulada el {fecha(mezcla.anuladaAt)}: {mezcla.anuladaMotivo}</>}
      </p>

      {mezcla.status !== "anulada" && (
        <section style={{ marginBottom: 28, maxWidth: 560 }}>
          <div className={styles.card} style={{ flexDirection: "column", alignItems: "stretch" }}>
            <h3 style={{ margin: 0 }}>Mínimo que CTCx asegura por temporada</h3>
            <p className={styles.meta}>
              {objetivo != null ? (
                <>
                  Objetivo {mezcla.temporada ?? "de temporada"}: <b>{objetivo} kg de CPS</b> —{" "}
                  {resumen.kgTotal + 1e-9 >= objetivo ? <b>cubierto</b> : <>faltan <b>{Math.round((objetivo - resumen.kgTotal) * 10) / 10} kg</b> desde Adquisición</>}.
                </>
              ) : (
                <>Sin objetivo: escriba la temporada y los kilos que CTCx asegura para esta mezcla (informa, no bloquea el cierre).</>
              )}
            </p>
            <ActionForm action={guardarObjetivoDeMezcla.bind(null, id)} submitLabel="Guardar" pendingLabel="Guardando…" buttonClassName="btn btn-sm" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input name="temporada" placeholder="Temporada (2026-B)" defaultValue={mezcla.temporada ?? ""} style={{ flex: "1 1 140px" }} />
              <input name="objetivo_temporada_kg" inputMode="decimal" placeholder={`kg de CPS (p. ej. ${MOQ_KG_MEZCLA})`} defaultValue={objetivo ?? ""} style={{ flex: "1 1 160px" }} />
            </ActionForm>
          </div>
        </section>
      )}

      <section style={{ marginBottom: 28 }}>
        <div className={styles.sectionHead}>
          <h2>Lotes de la mezcla ({mezcla.componentes.length})</h2>
        </div>
        {mezcla.componentes.length === 0 ? (
          <p className={styles.empty}>Sin lotes todavía. Añada compras {GRADO_POR_ID[mezcla.grado]?.nombre ?? mezcla.grado} destinadas a CTCx Selection abajo.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <thead>
                <tr style={{ color: "var(--muted)", textAlign: "left" }}>
                  <th style={td}>Lote</th>
                  <th style={td}>Productor · estate</th>
                  <th style={td}>Región</th>
                  <th style={td}>Variedad</th>
                  <th style={td}>Proceso</th>
                  <th style={{ ...td, textAlign: "right" }}>kg en la mezcla</th>
                  <th style={{ ...td, textAlign: "right" }}>Compra (kg)</th>
                  <th style={{ ...td, textAlign: "right" }}>Sin asignar en otras</th>
                  {borrador && <th style={td} />}
                </tr>
              </thead>
              <tbody>
                {mezcla.componentes.map((c) => (
                  <tr key={c.id} style={{ borderTop: "1px solid var(--line)" }}>
                    <td style={td}>
                      <Link href={`/ocp/kr?lote=${c.lotId}`}>{c.lotName}</Link>
                    </td>
                    <td style={td}>
                      {c.producerName}
                      <div className={styles.meta}>{c.fincaName ?? <span className={styles.warn}>sin finca</span>}</div>
                    </td>
                    <td style={td}>{c.departamento ?? <span className={styles.warn}>sin departamento</span>}</td>
                    <td style={td}>{c.variedad ?? <span className={styles.warn}>sin variedad</span>}</td>
                    <td style={td}>{c.proceso ?? <span className={styles.warn}>sin proceso</span>}</td>
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
          <section style={{ marginBottom: 28 }}>
            <div className={styles.sectionHead}>
              <h2>Añadir un lote</h2>
            </div>
            {elegibles.length === 0 ? (
              <p className={styles.empty}>
                No hay compras {GRADO_POR_ID[mezcla.grado]?.nombre ?? mezcla.grado} elegibles: hace falta una compra en firme destinada a CTCx Selection, con kilos sin
                asignar, que deje a la mezcla con un tipo ({TIPO_MEZCLA_LABEL.single_origin}: misma variedad y proceso; {TIPO_MEZCLA_LABEL.regional_blend}: misma
                región). Se registran en <Link href="/ocp/compras">Adquisición de Stock Café</Link>; la composición del lote se corrige en su ficha.
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
                          {c.lotName} · {c.producerName} · {c.fincaName ?? "sin finca"} · {c.departamento ?? "sin región"} · {c.variedad ?? "sin variedad"} · {c.proceso ?? "sin proceso"} ·{" "}
                          {c.disponibleKg} kg sin asignar
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="mz-kg">Kilos de CPS</label>
                    <input id="mz-kg" name="kg" inputMode="decimal" defaultValue={CARGA_KG} required />
                  </div>
                </div>
              </ActionForm>
            )}
          </section>

          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
            <div className={styles.card} style={{ flexDirection: "column", alignItems: "stretch" }}>
              <h3 style={{ margin: 0 }}>Cerrar la mezcla</h3>
              {faltas.length === 0 ? (
                <>
                  <p className={styles.meta}>
                    Es {tipoMostrado ? TIPO_MEZCLA_LABEL[tipoMostrado] : "—"}. Al cerrar, los lotes quedan fijos, el tipo se guarda (la base lo vuelve a derivar) y lo
                    asignado deja de estar disponible para ofrecer por lote.{!resumen.cubreMoq && <> Está bajo el MOQ de compra ({MOQ_KG_MEZCLA} kg): se puede cerrar, pero no cubre un pedido mínimo.</>}
                  </p>
                  <ActionForm action={cerrarMezcla.bind(null, id)} submitLabel="Cerrar la mezcla" pendingLabel="Cerrando…" buttonClassName="btn btn-sm btn-solid" />
                </>
              ) : (
                <ul className={styles.meta} style={{ paddingLeft: 18, margin: "6px 0 0", display: "grid", gap: 4 }}>
                  {faltas.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                  {mezcla.componentes.length < MIN_COMPONENTES && <li>Una mezcla es de varios lotes.</li>}
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
