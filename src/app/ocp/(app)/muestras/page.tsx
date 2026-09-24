import Link from "next/link";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/panel/ActionForm";
import { MOTIVO_LABEL, PARTICION_KG, TIPO_LABEL, saldoDe, type MotivoDeSalida, type TipoDeMuestra } from "@/lib/muestras/particion";
import { ctcLotReferenceShort } from "@/components/kaffetal-regal/data";
import { anotarSalidaDeMuestra, ubicarMuestra } from "../muestrasActions";
import styles from "@/components/panel/shared.module.css";

export const dynamic = "force-dynamic";

// ── OCP · Manejo de Stock Físico · Gestión de Muestras — 1.ª tanda (V5.80) ──────────────────
// Hasta la V5.79 esta página decía que el módulo no existía. Ahora es el registro de cada muestra física que pasa por
// las manos de CTC (brief `consolas-gestion-de-muestras.md`): qué lote, cuántos kilos llegaron y cómo se partieron
// (folio 7: 500 g evaluación · 500 g contramuestra · 1 kg testeo), dónde está y quién la tiene, qué salió y hacia
// dónde — y, por fin, los pedidos de pack de muestras de los compradores, que ninguna pantalla enseñaba.
// EL SALDO SE DERIVA (`saldoDe`): recibido − Σ salidas. El recibo vive en Solicitudes de Evaluación.
// Segunda tanda (pendiente): la alerta de los 90 días como tarea derivada; muestras «para comprador» desde la tienda.

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
type MovRow = { id: string; muestra_id: string; kg: number; motivo: MotivoDeSalida; destino: string | null; fecha: string; notas: string | null };
type PedidoRow = { id: string; buyer_id: string; status: string; created_at: string };

const fecha = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString("es-CO") : "—");

export default async function GestionDeMuestrasPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const service = createServiceRoleClient();
  const [{ data: muestrasRaw }, { data: movRaw }, { data: pedidosRaw }] = await Promise.all([
    service.from("muestras").select("id, lot_id, tipo, kg, recibida_at, ubicacion, custodio, notas, lots(name, producer_id)").order("recibida_at", { ascending: false }),
    service.from("muestra_movimientos").select("id, muestra_id, kg, motivo, destino, fecha, notas").order("fecha", { ascending: false }),
    service.from("sample_pack_orders").select("id, buyer_id, status, created_at").order("created_at", { ascending: false }),
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

  const vista = tab === "pedidos" ? "pedidos" : "stock";
  const tabStyle = (activo: boolean) => `btn btn-sm${activo ? " btn-solid" : ""}`;

  return (
    <div>
      <h1 className={styles.title}>Gestión de Muestras</h1>
      <p className={styles.subtitle}>
        Cada muestra física que pasa por CTC: qué lote, cuántos kilos llegaron y cómo se partieron (
        {PARTICION_KG.map((p) => `${p.kg * 1000} g ${TIPO_LABEL[p.tipo].toLowerCase()}`).join(" · ")}), dónde está, quién la tiene y qué salió. El saldo se
        deriva, nunca se guarda. El recibo se hace en <Link href="/ocp/solicitudes">Solicitudes de Evaluación</Link>.
      </p>

      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        <Link href="/ocp/muestras" className={tabStyle(vista === "stock")}>
          Qué hay y dónde ({muestras.length})
        </Link>
        <Link href="/ocp/muestras?tab=pedidos" className={tabStyle(vista === "pedidos")}>
          Pedidos de muestra ({pedidos.length})
        </Link>
      </div>

      {vista === "pedidos" ? (
        <div className={styles.card} style={{ display: "block" }}>
          <h3>Pedidos de pack de muestras (compradores)</h3>
          <p className={styles.meta}>
            Lo que los compradores pidieron desde la tienda (`sample_pack_orders`). Hoy solo se sabe quién y cuándo; qué lotes y cuántos
            gramos van en el pack es la segunda tanda del brief.
          </p>
          {pedidos.length === 0 && <p className={styles.empty}>Ningún pedido.</p>}
          {pedidos.map((p) => {
            const per = persona.get(p.buyer_id);
            return (
              <div key={p.id} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", padding: "8px 0", borderTop: "1px solid var(--line)" }}>
                <b>{empresa.get(p.buyer_id) || per?.full_name || "Comprador"}</b>
                <span className={styles.meta}>{per?.email ?? ""}</span>
                <span className={styles.badge}>{p.status}</span>
                <span className={styles.meta}>pedido el {fecha(p.created_at)}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {muestras.length === 0 && <p className={styles.empty}>Ninguna muestra recibida todavía.</p>}
          {[...porLote.entries()].map(([lotId, ms]) => (
            <div key={lotId} className={styles.miniCard}>
              <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
                <b style={{ fontSize: 14 }}>
                  <Link href={`/ocp/kr?lote=${lotId}`}>{lotName(ms[0])}</Link>
                </b>
                <span className="mono">{ctcLotReferenceShort(lotId)}</span>
                <span className={styles.meta}>recibida {fecha(ms[0].recibida_at)}</span>
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
                              {fecha(s.fecha)} · {Number(s.kg)} kg · {MOTIVO_LABEL[s.motivo] ?? s.motivo}{s.destino ? ` → ${s.destino}` : ""}
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
          ))}
        </div>
      )}
    </div>
  );
}
