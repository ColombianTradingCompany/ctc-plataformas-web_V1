import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/panel/ActionForm";
import { GRADO_POR_ID } from "@/lib/grados/definicion";
import { KITS, KIT_STATUS_LABEL, contenidoDelKit, validarEnvioDeKit } from "@/lib/compras/sampleKits";
import { cargarKit, paraElKit, partidasParaKits } from "@/lib/compras/sampleKitsServidor";
import { ESTADO_INFO, STOCK_PATH, fmtKg } from "@/lib/stock/linaje";
import { agregarLoteAlKit, anularKit, marcarKitEnviado, quitarItemDelKit } from "../../../comprasActions";
import styles from "@/components/panel/shared.module.css";

// ── Un Sample Kit (V5.90 · sobre el Stock CTCx desde la V5.195): sus lotes —cada uno, una partida y sus kilos—, lo que falta para
// salir, enviarlo (sale del stock) o anularlo (vuelve al stock) ─────────────────────────────────────────────────────────────────

export const dynamic = "force-dynamic";

const fecha = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("es-CO") : "—");
const td: React.CSSProperties = { padding: "6px 8px", whiteSpace: "nowrap", verticalAlign: "top" };

export default async function SampleKitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const service = createServiceRoleClient();
  const kit = await cargarKit(service, id);
  if (!kit) notFound();
  const def = KITS[kit.tipo];
  const cafe = contenidoDelKit(kit.tipo);
  const armado = kit.status === "armado";
  const porLote = def.kgPorLote;
  const faltas = validarEnvioDeKit(kit.tipo, kit.items);
  const yaLotes = new Set(kit.items.map((i) => i.lotId));
  const yaPartidas = new Set(kit.items.map((i) => i.partidaId));
  const candidatas = armado && kit.items.length < def.lotes ? paraElKit(await partidasParaKits(service), kit.tipo).filter((p) => !yaPartidas.has(p.partidaId) && !yaLotes.has(p.lotId)) : [];
  const kgTotal = Math.round(kit.items.reduce((a, i) => a + i.kg, 0) * 1000) / 1000;

  return (
    <div>
      <Link href={`${STOCK_PATH}/sample-kits`} className={styles.backLink}>
        ← Sample Kits
      </Link>
      <h1 className={styles.title}>
        <code style={{ fontWeight: 400, marginRight: 8 }}>{kit.codigo}</code>
        {def.nombre}{" "}
        <span className={kit.status === "enviado" ? styles.badgeGood : kit.status === "anulado" ? styles.badgeBad : styles.badge}>{KIT_STATUS_LABEL[kit.status]}</span>
      </h1>
      <p className={styles.subtitle}>
        {def.lotes} lotes × {def.kgPorLote} kg de {cafe} · {def.precioRef}
        {kit.destino && (
          <>
            {" "}
            · para <b>{kit.destino}</b>
          </>
        )}
        {kit.pedidoId && <> · pedido de la tienda {kit.pedidoId.slice(0, 8)}</>}
      </p>
      <p className={styles.meta} style={{ marginBottom: 16 }}>
        <b>{fmtKg(kgTotal)} kg de {cafe}</b> en {kit.items.length} de {def.lotes} lotes · creado el {fecha(kit.createdAt)}
        {kit.enviadoAt && (
          <>
            {" "}
            · enviado el {fecha(kit.enviadoAt)}
            {kit.guia && <> · guía {kit.guia}</>}
          </>
        )}
        {kit.status === "anulado" && <> · anulado el {fecha(kit.anuladoAt)}: {kit.anuladoMotivo}</>}
        {kit.notas && <> · {kit.notas}</>}
      </p>

      <section style={{ marginBottom: 28 }}>
        <div className={styles.sectionHead}>
          <h2>
            Lotes del kit ({kit.items.length} / {def.lotes})
          </h2>
        </div>
        {kit.items.length === 0 ? (
          <p className={styles.empty}>Sin lotes todavía. Añada partidas del Stock CTCx abajo.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <thead>
                <tr style={{ color: "var(--muted)", textAlign: "left" }}>
                  <th style={td}>Partida</th>
                  <th style={td}>Lote</th>
                  <th style={td}>Productor</th>
                  <th style={td}>Grado</th>
                  <th style={{ ...td, textAlign: "right" }}>kg en el kit</th>
                  <th style={{ ...td, textAlign: "right" }}>Le queda a la partida</th>
                  {armado && <th style={td} />}
                </tr>
              </thead>
              <tbody>
                {kit.items.map((i) => (
                  <tr key={i.id} style={{ borderTop: "1px solid var(--line)" }}>
                    <td style={td}>
                      <Link href={`${STOCK_PATH}?partida=${i.partidaId}`}><code>{i.codigo}</code></Link>
                      <div className={styles.meta}>{i.estadoNombre}</div>
                    </td>
                    <td style={td}>
                      <Link href={`/ocp/kr?lote=${i.lotId}`}>{i.lotName}</Link>
                    </td>
                    <td style={td}>{i.producerName}</td>
                    <td style={td}>{GRADO_POR_ID[i.grado as keyof typeof GRADO_POR_ID]?.nombre ?? i.grado}</td>
                    <td style={{ ...td, textAlign: "right" }}>
                      <b>{fmtKg(i.kg)}</b>
                    </td>
                    <td style={{ ...td, textAlign: "right" }}>{fmtKg(i.disponibleKg)}</td>
                    {armado && (
                      <td style={td}>
                        <ActionForm action={quitarItemDelKit.bind(null, id, i.id)} submitLabel="Quitar" pendingLabel="Quitando…" buttonClassName="btn btn-sm" />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {armado && (
        <>
          {kit.items.length < def.lotes && (
            <section style={{ marginBottom: 28 }}>
              <div className={styles.sectionHead}>
                <h2>Añadir un lote</h2>
              </div>
              {candidatas.length === 0 ? (
                <p className={styles.empty}>
                  No hay partidas de {cafe} con disponible de otro lote. Se trilla, se empaca o se ingresa en el <Link href={STOCK_PATH}>Stock CTCx</Link>.
                </p>
              ) : (
                <ActionForm action={agregarLoteAlKit.bind(null, id)} submitLabel="Añadir" pendingLabel="Añadiendo…" buttonClassName="btn btn-sm btn-solid" className={styles.card} style={{ display: "block" }}>
                  <div className={styles.formGrid}>
                    <div className={styles.field} style={{ gridColumn: "1 / -1" }}>
                      <label htmlFor="sk-partida">Partida del Stock CTCx ({cafe})</label>
                      <select id="sk-partida" name="partida_id" required defaultValue="">
                        <option value="" disabled>
                          Elija la partida…
                        </option>
                        {candidatas.map((p) => (
                          <option key={p.partidaId} value={p.partidaId} disabled={p.disponibleKg + 1e-9 < porLote}>
                            {p.codigo} · {p.lotName} · {p.producerName} · {GRADO_POR_ID[(p.grado ?? "") as keyof typeof GRADO_POR_ID]?.nombre ?? p.grado ?? "—"} ·{" "}
                            {ESTADO_INFO[p.estado].nombre.toLowerCase()}{p.presentacion ? ` (${p.presentacion})` : ""} · {fmtKg(p.disponibleKg)} kg disponibles
                            {p.disponibleKg + 1e-9 < porLote ? ` (no alcanza para ${porLote} kg)` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className={styles.field}>
                      <label htmlFor="sk-kg">Kilos de {cafe} ({porLote} por lote de este kit)</label>
                      <input id="sk-kg" name="kg" inputMode="decimal" defaultValue={porLote} required />
                    </div>
                  </div>
                </ActionForm>
              )}
            </section>
          )}

          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
            <div className={styles.card} style={{ flexDirection: "column", alignItems: "stretch" }}>
              <h3 style={{ margin: 0 }}>Marcar enviado</h3>
              {faltas.length === 0 ? (
                <>
                  <p className={styles.meta}>
                    El kit está completo. Al enviarlo, sus lotes quedan fijos y sus kilos salen del Stock CTCx{kit.pedidoId ? "; el pedido de la tienda pasa a enviado" : ""}.
                  </p>
                  <ActionForm action={marcarKitEnviado.bind(null, id)} submitLabel="Marcar enviado" pendingLabel="Marcando…" buttonClassName="btn btn-sm btn-solid" style={{ display: "grid", gap: 6 }}>
                    <input name="guia" placeholder="Guía / tracking" />
                    <input name="notas" placeholder="Notas de envío (opcional)" defaultValue={kit.notas ?? ""} />
                  </ActionForm>
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
              <p className={styles.meta}>Nada se borra: el kit queda anulado con su motivo y sus kilos vuelven a estar disponibles en sus partidas.</p>
              <ActionForm action={anularKit.bind(null, id)} submitLabel="Anular el kit" pendingLabel="Anulando…" buttonClassName="btn btn-sm" style={{ display: "grid", gap: 6 }}>
                <input name="motivo" placeholder="Motivo" required />
              </ActionForm>
            </div>
          </section>
        </>
      )}

      {kit.status === "enviado" && (
        <section style={{ maxWidth: 420 }}>
          <div className={styles.card} style={{ flexDirection: "column", alignItems: "stretch" }}>
            <h3 style={{ margin: 0 }}>Anular</h3>
            <p className={styles.meta}>Un kit enviado no se edita. Si no salió, se anula con motivo y sus kilos vuelven al Stock CTCx.</p>
            <ActionForm action={anularKit.bind(null, id)} submitLabel="Anular el kit" pendingLabel="Anulando…" buttonClassName="btn btn-sm" style={{ display: "grid", gap: 6 }}>
              <input name="motivo" placeholder="Motivo" required />
            </ActionForm>
          </div>
        </section>
      )}
    </div>
  );
}
