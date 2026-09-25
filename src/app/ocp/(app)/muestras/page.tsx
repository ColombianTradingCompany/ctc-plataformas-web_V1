import Link from "next/link";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/panel/ActionForm";
import { kgDelPedido, KILO_CTCX, MOTIVO_LABEL, PARTICION_KG, PEDIDO_STATUS_LABEL, saldoDe, TIPO_LABEL, trillaDelKilo, type EstadoDePedidoDeMuestra, type MotivoDeSalida, type TipoDeMuestra } from "@/lib/muestras/particion";
import { DIAS_REVISION_ALMACENAJE, KG_REVISION_ALMACENAJE } from "@/lib/muestras/almacenaje";
import { revisionesDeAlmacenaje } from "@/lib/muestras/almacenajeCarga";
import { ctcLotReferenceShort } from "@/components/kaffetal-regal/data";
import { agregarMuestraAlPedido, anotarRevisionDeAlmacenaje, anotarSalidaDeMuestra, crearBodega, guardarBodega, marcarPedidoEnviado, trillarMuestraCtcx, ubicarMuestra } from "../muestrasActions";
import styles from "@/components/panel/shared.module.css";

export const dynamic = "force-dynamic";

// ── OCP · Manejo de Stock Físico · Gestión de Muestras — V5.80 · V5.88 · V5.89 ────────────────
// El registro de cada muestra física que pasa por las manos de CTC (brief `consolas-gestion-de-muestras.md`). Los 2 kg de CPS
// del productor son de uso EXCLUSIVO de CTCx (owner, 2026-09-25; diagrama en `reference/muestras-y-sample-kits-2026-09-25/`):
// 2 × 250 g para el Q-Grader · 2 × 250 g de reserva CPS · 1 kg «Evaluación CTCx» que se TRILLA por completo (~750 g de verde:
// 400 g de tostado para ensayos piloto + 250 g de verde al vacío). Las muestras para compradores NO salen de aquí: salen de
// Adquisición de Stock. EL SALDO SE DERIVA (`saldoDe`): recibido − Σ salidas. El recibo vive en Solicitudes de Evaluación.
// Pestañas: qué hay y dónde (por lote, con su bodega) · bodegas (V5.89: responsable, dirección, capacidad en muestras de 1 kg,
// estado; la ocupación se deriva) · revisión de almacenaje a los 90 días (V5.88, derivada) · pedidos de muestra (V5.88).

type MuestraRow = {
  id: string;
  lot_id: string;
  tipo: TipoDeMuestra;
  kg: number;
  recibida_at: string;
  ubicacion: string | null;
  custodio: string | null;
  notas: string | null;
  bodega_id: string | null;
  origen_muestra_id: string | null;
  lots: { name: string; producer_id: string } | { name: string; producer_id: string }[] | null;
};
type MovRow = { id: string; muestra_id: string; kg: number; motivo: MotivoDeSalida; destino: string | null; fecha: string; notas: string | null; pedido_id: string | null };
type PedidoRow = { id: string; buyer_id: string; status: EstadoDePedidoDeMuestra; created_at: string; preparado_at: string | null; enviado_at: string | null; guia: string | null; notas_ctc: string | null };
type BodegaRow = { id: string; nombre: string; responsable: string | null; direccion: string | null; capacidad_muestras: number | null; estado: "activa" | "pendiente" | "inactiva"; notas: string | null };

const ESTADO_BODEGA_LABEL: Record<BodegaRow["estado"], string> = { activa: "Activa", pendiente: "Pendiente", inactiva: "Inactiva" };
const fecha = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString("es-CO") : "—");
const g = (kg: number | string) => Math.round(Number(kg) * 1000);

export default async function GestionDeMuestrasPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const service = createServiceRoleClient();
  const [{ data: muestrasRaw }, { data: movRaw }, { data: pedidosRaw }, { data: bodegasRaw }, revisiones] = await Promise.all([
    service.from("muestras").select("id, lot_id, tipo, kg, recibida_at, ubicacion, custodio, notas, bodega_id, origen_muestra_id, lots(name, producer_id)").order("recibida_at", { ascending: false }),
    service.from("muestra_movimientos").select("id, muestra_id, kg, motivo, destino, fecha, notas, pedido_id").order("fecha", { ascending: false }),
    service.from("sample_pack_orders").select("id, buyer_id, status, created_at, preparado_at, enviado_at, guia, notas_ctc").order("created_at", { ascending: false }),
    service.from("bodegas_muestras").select("id, nombre, responsable, direccion, capacidad_muestras, estado, notas").order("estado").order("nombre"),
    revisionesDeAlmacenaje(service),
  ]);
  const muestras = (muestrasRaw as MuestraRow[] | null) ?? [];
  const movimientos = (movRaw as MovRow[] | null) ?? [];
  const pedidos = (pedidosRaw as PedidoRow[] | null) ?? [];
  const bodegas = (bodegasRaw as BodegaRow[] | null) ?? [];
  const bodegaById = new Map(bodegas.map((b) => [b.id, b]));
  const bodegasActivas = bodegas.filter((b) => b.estado !== "inactiva");

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
  const saldoDeMuestra = (m: MuestraRow) => saldoDe(Number(m.kg), salidasDe(m.id));
  const porLote = new Map<string, MuestraRow[]>();
  for (const m of muestras) porLote.set(m.lot_id, [...(porLote.get(m.lot_id) ?? []), m]);
  const lotName = (m: MuestraRow) => ((Array.isArray(m.lots) ? m.lots[0] : m.lots)?.name ?? "Lote");
  const muestraById = new Map(muestras.map((m) => [m.id, m]));
  const revisionDe = new Map(revisiones.map((r) => [r.lotId, r]));
  const debidas = revisiones.filter((r) => r.lectura.debida);
  const proximas = revisiones.filter((r) => !r.lectura.debida);
  const conSaldo = muestras.map((m) => ({ m, saldo: saldoDeMuestra(m) })).filter((x) => x.saldo > 0);
  // La ocupación de cada bodega se DERIVA: muestras con saldo y kilos, contra la capacidad (en muestras de 1 kg).
  const ocupacion = (bodegaId: string) => {
    const mias = conSaldo.filter((x) => x.m.bodega_id === bodegaId);
    return { muestras: mias.length, kg: Math.round(mias.reduce((a, x) => a + x.saldo, 0) * 1000) / 1000 };
  };

  const vista = tab === "pedidos" ? "pedidos" : tab === "almacenaje" ? "almacenaje" : tab === "bodegas" ? "bodegas" : "stock";
  const tabStyle = (activo: boolean) => `btn btn-sm${activo ? " btn-solid" : ""}`;

  return (
    <div>
      <h1 className={styles.title}>Gestión de Muestras</h1>
      <p className={styles.subtitle}>
        Cada muestra física que pasa por CTC: qué lote, cuántos kilos llegaron y cómo se partieron ({PARTICION_KG.map((p) => `${p.kg * 1000} g ${TIPO_LABEL[p.tipo]}`).join(" · ")}
        ), en qué bodega está, quién la tiene y qué salió. Los 2 kg son de <b>uso exclusivo de CTCx</b> (evaluación y ensayos): las muestras para compradores
        salen de <Link href="/ocp/compras">Adquisición de Stock</Link>. El saldo se deriva, nunca se guarda. El recibo se hace en{" "}
        <Link href="/ocp/solicitudes">Solicitudes de Evaluación</Link>.
      </p>

      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        <Link href="/ocp/muestras" className={tabStyle(vista === "stock")}>
          Qué hay y dónde ({muestras.length})
        </Link>
        <Link href="/ocp/muestras?tab=bodegas" className={tabStyle(vista === "bodegas")}>
          Bodegas ({bodegas.length})
        </Link>
        <Link href="/ocp/muestras?tab=almacenaje" className={tabStyle(vista === "almacenaje")}>
          Revisión de almacenaje ({debidas.length} debida{debidas.length === 1 ? "" : "s"})
        </Link>
        <Link href="/ocp/muestras?tab=pedidos" className={tabStyle(vista === "pedidos")}>
          Pedidos de muestra ({pedidos.length})
        </Link>
      </div>

      {vista === "bodegas" && (
        <div style={{ display: "grid", gap: 12 }}>
          <p className={styles.meta}>
            Las bodegas de muestras de la casa (owner, 2026-09-25): responsable, dirección, capacidad en muestras de 1 kg y estado. La ocupación se deriva
            de las muestras con saldo. Es el arranque del módulo de administración de bodega que vendrá con más información.
          </p>
          {bodegas.map((b) => {
            const o = ocupacion(b.id);
            const pct = b.capacidad_muestras ? Math.round((o.kg / b.capacidad_muestras) * 100) : null;
            return (
              <details key={b.id} className={styles.miniCard}>
                <summary style={{ cursor: "pointer", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <b style={{ fontSize: 14 }}>{b.nombre}</b>
                  <span className={b.estado === "activa" ? styles.badgeGood : b.estado === "pendiente" ? styles.badgeWarn : styles.badge}>{ESTADO_BODEGA_LABEL[b.estado]}</span>
                  <span className={styles.meta}>
                    {b.responsable ? `responsable ${b.responsable}` : "sin responsable asignado"} · {b.direccion ?? "sin dirección"}
                  </span>
                  <span className={styles.meta}>
                    ocupación <b>{o.muestras}</b> muestra{o.muestras === 1 ? "" : "s"} · {o.kg} kg
                    {b.capacidad_muestras != null ? ` de ${b.capacidad_muestras} (${pct} %)` : " · capacidad pendiente"}
                  </span>
                </summary>
                <ActionForm action={guardarBodega.bind(null, b.id)} submitLabel="Guardar" pendingLabel="Guardando…" buttonClassName="btn btn-sm" style={{ display: "grid", gap: 6, marginTop: 8 }}>
                  <div className={styles.formGrid}>
                    <div className={styles.field}>
                      <label>Nombre</label>
                      <input name="nombre" defaultValue={b.nombre} required />
                    </div>
                    <div className={styles.field}>
                      <label>Responsable</label>
                      <input name="responsable" defaultValue={b.responsable ?? ""} placeholder="persona o rol" />
                    </div>
                    <div className={styles.field} style={{ gridColumn: "1 / -1" }}>
                      <label>Dirección</label>
                      <input name="direccion" defaultValue={b.direccion ?? ""} />
                    </div>
                    <div className={styles.field}>
                      <label>Capacidad (muestras de 1 kg)</label>
                      <input name="capacidad_muestras" inputMode="numeric" defaultValue={b.capacidad_muestras ?? ""} placeholder="pendiente" />
                    </div>
                    <div className={styles.field}>
                      <label>Estado</label>
                      <select name="estado" defaultValue={b.estado}>
                        {(Object.keys(ESTADO_BODEGA_LABEL) as BodegaRow["estado"][]).map((e) => (
                          <option key={e} value={e}>{ESTADO_BODEGA_LABEL[e]}</option>
                        ))}
                      </select>
                    </div>
                    <div className={styles.field} style={{ gridColumn: "1 / -1" }}>
                      <label>Notas</label>
                      <input name="notas" defaultValue={b.notas ?? ""} />
                    </div>
                  </div>
                </ActionForm>
              </details>
            );
          })}
          <details className={styles.miniCard}>
            <summary className={styles.meta} style={{ cursor: "pointer" }}>Nueva bodega…</summary>
            <ActionForm action={crearBodega} submitLabel="Crear la bodega" pendingLabel="Creando…" buttonClassName="btn btn-sm btn-solid" style={{ display: "grid", gap: 6, marginTop: 8 }}>
              <div className={styles.formGrid}>
                <div className={styles.field}>
                  <label>Nombre</label>
                  <input name="nombre" required />
                </div>
                <div className={styles.field}>
                  <label>Responsable</label>
                  <input name="responsable" placeholder="persona o rol" />
                </div>
                <div className={styles.field} style={{ gridColumn: "1 / -1" }}>
                  <label>Dirección</label>
                  <input name="direccion" />
                </div>
                <div className={styles.field}>
                  <label>Capacidad (muestras de 1 kg)</label>
                  <input name="capacidad_muestras" inputMode="numeric" placeholder="pendiente" />
                </div>
                <div className={styles.field}>
                  <label>Estado</label>
                  <select name="estado" defaultValue="pendiente">
                    {(Object.keys(ESTADO_BODEGA_LABEL) as BodegaRow["estado"][]).map((e) => (
                      <option key={e} value={e}>{ESTADO_BODEGA_LABEL[e]}</option>
                    ))}
                  </select>
                </div>
              </div>
            </ActionForm>
          </details>
        </div>
      )}

      {vista === "almacenaje" && (
        <div style={{ display: "grid", gap: 12 }}>
          <p className={styles.meta}>
            Regla del owner (2026-09-16): a más de <b>{DIAS_REVISION_ALMACENAJE} días de la catación</b> no se recata — se hace una <b>revisión de almacenaje con{" "}
            {KG_REVISION_ALMACENAJE} kg</b>. El reloj se deriva de la fecha de la evaluación que rige el grado y se reinicia con cada revisión anotada; no hay ningún
            campo que actualizar. Las debidas salen también como tarea en el <Link href="/ecp">Tablero de Ejecución</Link>. Si el kilo CTCx ya se trilló, se le pide
            al productor un kilo nuevo para la revisión.
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
                  {r.ultimaRevisionAt && <> · última revisión el {fecha(r.ultimaRevisionAt)} ({r.lectura.diasDesdeReferencia} días)</>} · kilo CTCx en la casa:{" "}
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
                <p className={styles.warn} style={{ marginTop: 6 }}>Sin kilo CTCx con saldo: pida al productor un kilo nuevo antes de revisar.</p>
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
                    {Math.max(0, DIAS_REVISION_ALMACENAJE - r.lectura.diasDesdeReferencia)} días · kilo CTCx {r.saldoTesteoKg} kg
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
            Lo que los compradores pidieron desde la tienda (`sample_pack_orders`). Los Sample Kits se surten desde{" "}
            <Link href="/ocp/compras">Adquisición de Stock</Link>; aquí solo se documenta con qué muestra de la casa se armó cada pedido y cuándo salió, con su guía.
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
                            {fecha(i.fecha)} · {m ? `${lotName(m)} · ${TIPO_LABEL[m.tipo]}` : "muestra"} · {g(i.kg)} g
                          </div>
                        );
                      })}
                      <div className={styles.meta}>
                        <b>{g(kgDelPedido(items))} g</b> en {items.length} muestra{items.length === 1 ? "" : "s"}
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
                  <span className={styles.meta}>recibida {fecha(ms[ms.length - 1].recibida_at)}</span>
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
                      <th style={{ textAlign: "left", padding: "4px 6px" }}>Bodega · dónde · quién</th>
                      <th style={{ textAlign: "left", padding: "4px 6px" }}>Salidas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ms.map((m) => {
                      const salidas = salidasDe(m.id);
                      const saldo = saldoDe(Number(m.kg), salidas);
                      const bodega = m.bodega_id ? bodegaById.get(m.bodega_id) : undefined;
                      const origen = m.origen_muestra_id ? muestraById.get(m.origen_muestra_id) : undefined;
                      const propuesta = m.tipo === "testeo" && saldo > 0 ? trillaDelKilo(saldo) : null;
                      return (
                        <tr key={m.id} style={{ borderTop: "1px solid var(--line)", verticalAlign: "top" }}>
                          <td style={{ padding: "6px" }}>
                            <b>{TIPO_LABEL[m.tipo]}</b>
                            {origen && <div className={styles.meta}>del {TIPO_LABEL[origen.tipo].toLowerCase()}</div>}
                            {m.notas && <div className={styles.meta}>{m.notas}</div>}
                          </td>
                          <td className="mono" style={{ padding: "6px", textAlign: "right" }}>{g(m.kg)} g</td>
                          <td className="mono" style={{ padding: "6px", textAlign: "right", color: saldo <= 0 ? "var(--muted)" : "var(--ink)" }}>{g(saldo)} g</td>
                          <td style={{ padding: "6px" }}>
                            <div>
                              {bodega ? <b>{bodega.nombre}</b> : <span className={styles.warn}>sin bodega</span>}
                              {m.ubicacion ? ` · ${m.ubicacion}` : ""}
                              {m.custodio ? ` · ${m.custodio}` : bodega?.responsable ? ` · ${bodega.responsable}` : ""}
                            </div>
                            <details>
                              <summary className={styles.meta} style={{ cursor: "pointer" }}>Ubicar…</summary>
                              <ActionForm action={ubicarMuestra.bind(null, m.id)} submitLabel="Guardar" buttonClassName="btn btn-sm" style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                                <select name="bodega_id" defaultValue={m.bodega_id ?? ""} style={{ maxWidth: 220 }}>
                                  <option value="">Bodega…</option>
                                  {bodegasActivas.map((b) => (
                                    <option key={b.id} value={b.id}>{b.nombre}</option>
                                  ))}
                                </select>
                                <input name="ubicacion" placeholder="Detalle (estante, caja…)" defaultValue={m.ubicacion ?? ""} style={{ maxWidth: 150 }} />
                                <input name="custodio" placeholder="Custodio" defaultValue={m.custodio ?? ""} style={{ maxWidth: 130 }} />
                              </ActionForm>
                            </details>
                          </td>
                          <td style={{ padding: "6px" }}>
                            {salidas.map((s) => (
                              <div key={s.id} className={styles.meta}>
                                {fecha(s.fecha)} · {g(s.kg)} g · {MOTIVO_LABEL[s.motivo] ?? s.motivo}{s.destino ? ` → ${s.destino}` : ""}{s.notas ? ` · ${s.notas}` : ""}
                              </div>
                            ))}
                            {propuesta && (
                              <details>
                                <summary className={styles.meta} style={{ cursor: "pointer" }}>Trillar el kilo CTCx…</summary>
                                <p className={styles.meta} style={{ margin: "4px 0" }}>
                                  Sale todo el saldo ({g(saldo)} g de CPS) → ~{g(propuesta.verdeKg)} g de verde: {g(propuesta.verdeVacioKg)} g al vacío y {g(propuesta.aTostarKg)} g a tostar → ~
                                  {g(propuesta.tostadoKg)} g de tostado (rendimiento {Math.round(KILO_CTCX.rendimientoTrilla * 100)} %, merma de tostión {Math.round(KILO_CTCX.mermaTostion * 100)} %). Corrija con lo que pesó.
                                </p>
                                <ActionForm action={trillarMuestraCtcx.bind(null, m.id)} submitLabel="Anotar la trilla" buttonClassName="btn btn-sm btn-solid" style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "end" }}>
                                  <label className={styles.meta} style={{ display: "grid", gap: 2 }}>
                                    verde al vacío (kg)
                                    <input name="verde_vacio_kg" inputMode="decimal" defaultValue={propuesta.verdeVacioKg} style={{ width: 80 }} />
                                  </label>
                                  <label className={styles.meta} style={{ display: "grid", gap: 2 }}>
                                    tostado (kg)
                                    <input name="tostado_kg" inputMode="decimal" defaultValue={propuesta.tostadoKg} style={{ width: 80 }} />
                                  </label>
                                  <input name="notas" placeholder="Notas" style={{ maxWidth: 160 }} />
                                </ActionForm>
                              </details>
                            )}
                            {saldo > 0 && (
                              <details>
                                <summary className={styles.meta} style={{ cursor: "pointer" }}>Anotar salida…</summary>
                                <ActionForm action={anotarSalidaDeMuestra.bind(null, m.id)} submitLabel="Anotar" buttonClassName="btn btn-sm" style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                                  <input name="kg" placeholder="kg" inputMode="decimal" required style={{ width: 70 }} />
                                  <select name="motivo" defaultValue="cata">
                                    {(Object.keys(MOTIVO_LABEL) as MotivoDeSalida[]).filter((k) => k !== "trilla_verde").map((k) => (
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
