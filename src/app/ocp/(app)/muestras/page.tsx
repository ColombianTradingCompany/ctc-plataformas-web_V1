import Link from "next/link";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/panel/ActionForm";
import { kgDelPedido, MOTIVO_LABEL, PARTICION_KG, PEDIDO_STATUS_LABEL, saldoDe, TIPO_LABEL, type EstadoDePedidoDeMuestra, type MotivoDeSalida, type TipoDeMuestra } from "@/lib/muestras/particion";
import { DIAS_REVISION_ALMACENAJE, KG_REVISION_ALMACENAJE } from "@/lib/muestras/almacenaje";
import { revisionesDeAlmacenaje } from "@/lib/muestras/almacenajeCarga";
import { ctcLotReferenceShort } from "@/components/kaffetal-regal/data";
import { agregarMuestraAlPedido, anotarRevisionDeAlmacenaje, anotarSalidaDeMuestra, marcarPedidoEnviado, ubicarMuestra } from "../muestrasActions";
import styles from "@/components/panel/shared.module.css";

export const dynamic = "force-dynamic";

// ── OCP · Manejo de Stock Físico · Gestión de Muestras — 1.ª tanda (V5.80) · 2.ª tanda (V5.88) ──
// El registro de cada muestra física que pasa por las manos de CTC (brief `consolas-gestion-de-muestras.md`): qué lote,
// cuántos kilos llegaron y cómo se partieron (folio 7: 500 g evaluación · 500 g contramuestra · 1 kg testeo), dónde está
// y quién la tiene, qué salió y hacia dónde. EL SALDO SE DERIVA (`saldoDe`): recibido − Σ salidas. El recibo vive en
// Solicitudes de Evaluación. La 2.ª tanda trae (a) la REVISIÓN DE ALMACENAJE a los 90 días de la catación (owner, 2026-09-16:
// «no se recata; se revisa el almacenaje con 1 kg») — derivada de la fecha de la evaluación y de la última revisión, sin campo
// aparte, y como tarea del Tablero de Ejecución — y (b) las MUESTRAS PARA COMPRADOR: los pedidos de pack se arman con
// salidas `a_comprador` ligadas al pedido y se marcan enviados con su guía.

type MuestraRow = {
  id: string;
  lot_id: string;
  tipo: TipoDeMuestra;
  kg: number;
  recibida_at: string;
  ubicacion: string | null;
  custodio: string | null;
  notas: string | null;
  lots: { name: string; producer_id: string } | { name: string; producer_id: string }[] | null;
};
type MovRow = { id: string; muestra_id: string; kg: number; motivo: MotivoDeSalida; destino: string | null; fecha: string; notas: string | null; pedido_id: string | null };
type PedidoRow = { id: string; buyer_id: string; status: EstadoDePedidoDeMuestra; created_at: string; preparado_at: string | null; enviado_at: string | null; guia: string | null; notas_ctc: string | null };

const fecha = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString("es-CO") : "—");

export default async function GestionDeMuestrasPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const service = createServiceRoleClient();
  const [{ data: muestrasRaw }, { data: movRaw }, { data: pedidosRaw }, revisiones] = await Promise.all([
    service.from("muestras").select("id, lot_id, tipo, kg, recibida_at, ubicacion, custodio, notas, lots(name, producer_id)").order("recibida_at", { ascending: false }),
    service.from("muestra_movimientos").select("id, muestra_id, kg, motivo, destino, fecha, notas, pedido_id").order("fecha", { ascending: false }),
    service.from("sample_pack_orders").select("id, buyer_id, status, created_at, preparado_at, enviado_at, guia, notas_ctc").order("created_at", { ascending: false }),
    revisionesDeAlmacenaje(service),
  ]);
  const muestras = (muestrasRaw as MuestraRow[] | null) ?? [];
  const movimientos = (movRaw as MovRow[] | null) ?? [];
  const pedidos = (pedidosRaw as PedidoRow[] | null) ?? [];

  const buyerIds = [...new Set(pedidos.map((p) => p.buyer_id))];
  const [{ data: buyersRaw }, { data: profilesRaw }] = buyerIds.length
    ? await Promise.all([
        service.from("buyer_profiles").select("profile_id, company_name").in("profile_id", buyerIds),
        service.from("profiles").select("id, full_name, email").in("id", buyerIds),
      ])
    : [{ data: [] }, { data: [] }];
  const empresa = new Map(((buyersRaw as { profile_id: string; company_name: string | null }[] | null) ?? []).map((b) => [b.profile_id, b.company_name]));
  const persona = new Map(((profilesRaw as { id: string; full_name: string | null; email: string | null }[] | null) ?? []).map((p) => [p.id, p]));

  const salidasDe = (id: string) => movimientos.filter((m) => m.muestra_id === id);
  const porLote = new Map<string, MuestraRow[]>();
  for (const m of muestras) porLote.set(m.lot_id, [...(porLote.get(m.lot_id) ?? []), m]);
  const lotName = (m: MuestraRow) => ((Array.isArray(m.lots) ? m.lots[0] : m.lots)?.name ?? "Lote");
  const muestraById = new Map(muestras.map((m) => [m.id, m]));
  const revisionDe = new Map(revisiones.map((r) => [r.lotId, r]));
  const debidas = revisiones.filter((r) => r.lectura.debida);
  const proximas = revisiones.filter((r) => !r.lectura.debida);
  // Las muestras con saldo, para armar un pedido (cualquier tipo: CTC decide de dónde sale — decisiones 4 y 5 del brief).
  const conSaldo = muestras.map((m) => ({ m, saldo: saldoDe(Number(m.kg), salidasDe(m.id)) })).filter((x) => x.saldo > 0);

  const vista = tab === "pedidos" ? "pedidos" : tab === "almacenaje" ? "almacenaje" : "stock";
  const tabStyle = (activo: boolean) => `btn btn-sm${activo ? " btn-solid" : ""}`;

  return (
    <div>
      <h1 className={styles.title}>Gestión de Muestras</h1>
      <p className={styles.subtitle}>
        Cada muestra física que pasa por CTC: qué lote, cuántos kilos llegaron y cómo se partieron (
        {PARTICION_KG.map((p) => `${p.kg * 1000} g ${TIPO_LABEL[p.tipo].toLowerCase()}`).join(" · ")}), dónde está, quién la tiene y qué salió. El saldo se
        deriva, nunca se guarda. El recibo se hace en <Link href="/ocp/solicitudes">Solicitudes de Evaluación</Link>.
      </p>

      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        <Link href="/ocp/muestras" className={tabStyle(vista === "stock")}>
          Qué hay y dónde ({muestras.length})
        </Link>
        <Link href="/ocp/muestras?tab=almacenaje" className={tabStyle(vista === "almacenaje")}>
          Revisión de almacenaje ({debidas.length} debida{debidas.length === 1 ? "" : "s"})
        </Link>
        <Link href="/ocp/muestras?tab=pedidos" className={tabStyle(vista === "pedidos")}>
          Pedidos de muestra ({pedidos.length})
        </Link>
      </div>

      {vista === "almacenaje" && (
        <div style={{ display: "grid", gap: 12 }}>
          <p className={styles.meta}>
            Regla del owner (2026-09-16): a más de <b>{DIAS_REVISION_ALMACENAJE} días de la catación</b> no se recata — se hace una <b>revisión de almacenaje con{" "}
            {KG_REVISION_ALMACENAJE} kg</b> (la porción de testeo). El reloj se deriva de la fecha de la evaluación que rige el grado y se reinicia con cada
            revisión anotada; no hay ningún campo que actualizar. Las debidas salen también como tarea en el{" "}
            <Link href="/ecp">Tablero de Ejecución</Link>. Anotar la revisión es una salida más de la muestra de testeo, con el resultado en notas.
          </p>
          {debidas.length === 0 && <p className={styles.empty}>Ninguna revisión debida hoy.</p>}
          {debidas.map((r) => (
            <div key={r.lotId} id={`lote-${r.lotId}`} className={styles.miniCard}>
              <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
                <b style={{ fontSize: 14 }}>
                  <Link href={`/ocp/kr?lote=${r.lotId}`}>{r.lotName}</Link>
                </b>
                <span className="mono">{ctcLotReferenceShort(r.lotId)}</span>
                <span className={styles.badgeWarn}>debida</span>
                <span className={styles.meta}>
                  catado el {fecha(r.evaluadaAt)} · hace {r.lectura.diasDesdeCatacion} días
                  {r.ultimaRevisionAt && <> · última revisión el {fecha(r.ultimaRevisionAt)} ({r.lectura.diasDesdeReferencia} días)</>} · testeo en la casa:{" "}
                  <b>{r.saldoTesteoKg} kg</b>
                </span>
              </div>
              {r.muestraTesteoId ? (
                <ActionForm action={anotarRevisionDeAlmacenaje.bind(null, r.lotId)} submitLabel="Anotar la revisión" pendingLabel="Anotando…" buttonClassName="btn btn-sm btn-solid" style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "end", marginTop: 8 }}>
                  <label className={styles.meta} style={{ display: "grid", gap: 2 }}>
                    kg usados
                    <input name="kg" inputMode="decimal" defaultValue={Math.min(KG_REVISION_ALMACENAJE, r.saldoTesteoKg)} style={{ width: 80 }} />
                  </label>
                  <label className={styles.meta} style={{ display: "grid", gap: 2, flex: 1, minWidth: 260 }}>
                    resultado (humedad, olor, estado del grano…)
                    <input name="resultado" placeholder="Ej. humedad 11,2 %, sin olores extraños; grano en buen estado" required />
                  </label>
                </ActionForm>
              ) : (
                <p className={styles.warn} style={{ marginTop: 6 }}>Sin muestra de testeo con saldo: pida una al productor antes de revisar.</p>
              )}
            </div>
          ))}
          {proximas.length > 0 && (
            <details className={styles.miniCard}>
              <summary className={styles.meta} style={{ cursor: "pointer" }}>Próximas ({proximas.length}): lotes catados con el reloj corriendo</summary>
              <div style={{ display: "grid", gap: 4, marginTop: 8 }}>
                {proximas.map((r) => (
                  <div key={r.lotId} className={styles.meta}>
                    <Link href={`/ocp/kr?lote=${r.lotId}`}>{r.lotName}</Link> · catado hace {r.lectura.diasDesdeCatacion} días · toca en{" "}
                    {Math.max(0, DIAS_REVISION_ALMACENAJE - r.lectura.diasDesdeReferencia)} días · testeo {r.saldoTesteoKg} kg
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      {vista === "pedidos" && (
        <div style={{ display: "grid", gap: 12 }}>
          <p className={styles.meta}>
            Lo que los compradores pidieron desde la tienda (`sample_pack_orders`). CTC arma el pack con salidas <b>a un comprador</b> ligadas al pedido
            (qué muestra y cuántos gramos: lo decide CTC; si el comprador podrá pedir la muestra de UN lote y la composición del pack de cosecha
            son las decisiones 4 y 5 del brief, del owner) y lo marca <b>enviado</b> con su guía.
          </p>
          {pedidos.length === 0 && <p className={styles.empty}>Ningún pedido.</p>}
          {pedidos.map((p) => {
            const per = persona.get(p.buyer_id);
            const items = movimientos.filter((m) => m.pedido_id === p.id);
            const enviado = p.status === "enviado";
            return (
              <div key={p.id} className={styles.miniCard}>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <b>{empresa.get(p.buyer_id) || per?.full_name || "Comprador"}</b>
                  <span className={styles.meta}>{per?.email ?? ""}</span>
                  <span className={enviado ? styles.badgeGood : p.status === "preparado" ? styles.badgeWarn : styles.badge}>{PEDIDO_STATUS_LABEL[p.status] ?? p.status}</span>
                  <span className={styles.meta}>
                    pedido el {fecha(p.created_at)}
                    {p.preparado_at && <> · en preparación desde el {fecha(p.preparado_at)}</>}
                    {p.enviado_at && <> · enviado el {fecha(p.enviado_at)}{p.guia ? ` · guía ${p.guia}` : ""}</>}
                  </span>
                </div>
                {p.notas_ctc && <div className={styles.meta} style={{ marginTop: 4 }}>{p.notas_ctc}</div>}
                <div style={{ marginTop: 8 }}>
                  {items.length === 0 ? (
                    <span className={styles.meta}>Sin muestras asignadas todavía.</span>
                  ) : (
                    <>
                      {items.map((i) => {
                        const m = muestraById.get(i.muestra_id);
                        return (
                          <div key={i.id} className={styles.meta}>
                            {fecha(i.fecha)} · {m ? `${lotName(m)} · ${TIPO_LABEL[m.tipo]}` : "muestra"} · {Math.round(Number(i.kg) * 1000)} g
                          </div>
                        );
                      })}
                      <div className={styles.meta}>
                        <b>{Math.round(kgDelPedido(items) * 1000)} g</b> en {items.length} muestra{items.length === 1 ? "" : "s"}
                      </div>
                    </>
                  )}
                </div>
                {!enviado && (
                  <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
                    {conSaldo.length === 0 ? (
                      <span className={styles.meta}>No hay muestras con saldo en la casa para armar el pedido.</span>
                    ) : (
                      <ActionForm action={agregarMuestraAlPedido.bind(null, p.id)} submitLabel="Añadir al pedido" pendingLabel="Añadiendo…" buttonClassName="btn btn-sm" style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "end" }}>
                        <select name="muestra_id" required defaultValue="" style={{ maxWidth: 360 }}>
                          <option value="" disabled>
                            Muestra…
                          </option>
                          {conSaldo.map(({ m, saldo }) => (
                            <option key={m.id} value={m.id}>
                              {lotName(m)} · {TIPO_LABEL[m.tipo]} · {saldo} kg
                            </option>
                          ))}
                        </select>
                        <input name="gramos" inputMode="numeric" defaultValue={125} style={{ width: 80 }} />
                        <span className={styles.meta}>g</span>
                      </ActionForm>
                    )}
                    {items.length > 0 && (
                      <ActionForm action={marcarPedidoEnviado.bind(null, p.id)} submitLabel="Marcar enviado" pendingLabel="Marcando…" buttonClassName="btn btn-sm btn-solid" style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "end" }}>
                        <input name="guia" placeholder="Guía / transportadora" style={{ maxWidth: 200 }} />
                        <input name="notas_ctc" placeholder="Notas (opcional)" style={{ maxWidth: 260 }} />
                      </ActionForm>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {vista === "stock" && (
        <div style={{ display: "grid", gap: 12 }}>
          {muestras.length === 0 && <p className={styles.empty}>Ninguna muestra recibida todavía.</p>}
          {[...porLote.entries()].map(([lotId, ms]) => {
            const rev = revisionDe.get(lotId);
            return (
              <div key={lotId} id={`lote-${lotId}`} className={styles.miniCard}>
                <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
                  <b style={{ fontSize: 14 }}>
                    <Link href={`/ocp/kr?lote=${lotId}`}>{lotName(ms[0])}</Link>
                  </b>
                  <span className="mono">{ctcLotReferenceShort(lotId)}</span>
                  <span className={styles.meta}>recibida {fecha(ms[0].recibida_at)}</span>
                  {rev && (
                    <span className={rev.lectura.debida ? styles.badgeWarn : styles.meta}>
                      {rev.lectura.debida ? "revisión de almacenaje debida" : `catado hace ${rev.lectura.diasDesdeCatacion} días · revisión en ${Math.max(0, DIAS_REVISION_ALMACENAJE - rev.lectura.diasDesdeReferencia)} días`}
                    </span>
                  )}
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8, fontSize: 12.5 }}>
                  <thead>
                    <tr className={styles.meta}>
                      <th style={{ textAlign: "left", padding: "4px 6px" }}>Muestra</th>
                      <th style={{ textAlign: "right", padding: "4px 6px" }}>Recibido</th>
                      <th style={{ textAlign: "right", padding: "4px 6px" }}>Saldo</th>
                      <th style={{ textAlign: "left", padding: "4px 6px" }}>Dónde · quién</th>
                      <th style={{ textAlign: "left", padding: "4px 6px" }}>Salidas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ms.map((m) => {
                      const salidas = salidasDe(m.id);
                      const saldo = saldoDe(Number(m.kg), salidas);
                      return (
                        <tr key={m.id} style={{ borderTop: "1px solid var(--line)", verticalAlign: "top" }}>
                          <td style={{ padding: "6px" }}>
                            <b>{TIPO_LABEL[m.tipo]}</b>
                            {m.notas && <div className={styles.meta}>{m.notas}</div>}
                          </td>
                          <td className="mono" style={{ padding: "6px", textAlign: "right" }}>{Number(m.kg)} kg</td>
                          <td className="mono" style={{ padding: "6px", textAlign: "right", color: saldo <= 0 ? "var(--muted)" : "var(--ink)" }}>{saldo} kg</td>
                          <td style={{ padding: "6px" }}>
                            <div>{m.ubicacion ?? "—"}{m.custodio ? ` · ${m.custodio}` : ""}</div>
                            <details>
                              <summary className={styles.meta} style={{ cursor: "pointer" }}>Ubicar…</summary>
                              <ActionForm action={ubicarMuestra.bind(null, m.id)} submitLabel="Guardar" buttonClassName="btn btn-sm" style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                                <input name="ubicacion" placeholder="Ubicación" defaultValue={m.ubicacion ?? ""} style={{ maxWidth: 160 }} />
                                <input name="custodio" placeholder="Custodio" defaultValue={m.custodio ?? ""} style={{ maxWidth: 140 }} />
                              </ActionForm>
                            </details>
                          </td>
                          <td style={{ padding: "6px" }}>
                            {salidas.map((s) => (
                              <div key={s.id} className={styles.meta}>
                                {fecha(s.fecha)} · {Number(s.kg)} kg · {MOTIVO_LABEL[s.motivo] ?? s.motivo}{s.destino ? ` → ${s.destino}` : ""}{s.notas ? ` · ${s.notas}` : ""}
                              </div>
                            ))}
                            {saldo > 0 && (
                              <details>
                                <summary className={styles.meta} style={{ cursor: "pointer" }}>Anotar salida…</summary>
                                <ActionForm action={anotarSalidaDeMuestra.bind(null, m.id)} submitLabel="Anotar" buttonClassName="btn btn-sm" style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                                  <input name="kg" placeholder="kg" inputMode="decimal" required style={{ width: 70 }} />
                                  <select name="motivo" defaultValue="cata">
                                    {(Object.keys(MOTIVO_LABEL) as MotivoDeSalida[]).map((k) => (
                                      <option key={k} value={k}>{MOTIVO_LABEL[k]}</option>
                                    ))}
                                  </select>
                                  <input name="destino" placeholder="Destino" style={{ maxWidth: 140 }} />
                                </ActionForm>
                              </details>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
