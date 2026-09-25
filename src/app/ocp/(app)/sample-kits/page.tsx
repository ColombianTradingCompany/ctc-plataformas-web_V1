import Link from "next/link";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/panel/ActionForm";
import { GRADO_POR_ID } from "@/lib/grados/definicion";
import { KITS, KIT_STATUS_LABEL, kgCpsDelKit, kgCpsPorLote, type TipoDeKit } from "@/lib/compras/sampleKits";
import { listarKits, stockDeSampleKits } from "@/lib/compras/sampleKitsServidor";
import { PEDIDO_STATUS_LABEL, type EstadoDePedidoDeMuestra } from "@/lib/muestras/particion";
import { crearKit } from "../comprasActions";
import styles from "@/components/panel/shared.module.css";

// ── OCP · Catálogo · Stock de Sample Kits (V5.90, owner 2026-09-25) ───────────────────────────
// El café que CTCx adquirió y NO va a «Oferta desde CTCx Selection»: el stock con que se arman los Sample Kits (CP · Plus · Max)
// para compradores y Master Roasters. Lo comprado entra por «Adquisición de Stock Café» con destino Sample Kits; lo disponible se
// deriva (comprado − asignado a kits no anulados). La regla vive en `src/lib/compras/sampleKits.ts`.

export const dynamic = "force-dynamic";

const fecha = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("es-CO") : "—");
const td: React.CSSProperties = { padding: "6px 8px", whiteSpace: "nowrap", verticalAlign: "top" };
const TIPOS = Object.keys(KITS) as TipoDeKit[];

export default async function SampleKitsPage() {
  const service = createServiceRoleClient();
  const [stock, kits, { data: pedidosRaw }] = await Promise.all([
    stockDeSampleKits(service),
    listarKits(service),
    service.from("sample_pack_orders").select("id, status, created_at").neq("status", "enviado").order("created_at", { ascending: false }),
  ]);
  const pedidos = (pedidosRaw as { id: string; status: EstadoDePedidoDeMuestra; created_at: string }[] | null) ?? [];
  const r1 = (n: number) => Math.round(n * 10) / 10;
  const comprado = r1(stock.reduce((a, c) => a + c.compradoKg, 0));
  const asignado = r1(stock.reduce((a, c) => a + c.asignadoKg, 0));
  const disponible = r1(stock.reduce((a, c) => a + c.disponibleKg, 0));
  const kpis = [
    { k: "Comprado para kits", v: `${comprado} kg`, sub: `${stock.length} compra${stock.length === 1 ? "" : "s"} con destino Sample Kits` },
    { k: "Asignado a kits", v: `${asignado} kg`, sub: "en kits armados o enviados" },
    { k: "Disponible", v: `${disponible} kg`, sub: "comprado − asignado (derivado)" },
    { k: "Kits armados", v: String(kits.filter((k) => k.status === "armado").length), sub: `${kits.filter((k) => k.status === "enviado").length} enviados · ${kits.filter((k) => k.status === "anulado").length} anulados` },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <h1 className={styles.title}>Stock de Sample Kits</h1>
        <Link href="/ocp/compras" className={styles.backLink}>
          Adquisición de Stock Café →
        </Link>
      </div>
      <p className={styles.subtitle}>
        El café que CTCx adquirió para <b>Sample Kits</b> y no va a <Link href="/ocp/ctc-selection">Oferta desde CTCx Selection</Link>. Con él se arman
        los kits para compradores y Master Roasters: <b>{KITS.cp.nombre}</b> ({KITS.cp.lotes} lotes × {KITS.cp.kgPorLote * 1000} g de verde ≈ {Math.round(kgCpsPorLote("cp") * 1000)} g
        de CPS cada uno; {KITS.cp.precioRef}) · <b>{KITS.plus.nombre}</b> ({KITS.plus.lotes} lotes × {KITS.plus.kgPorLote} kg de verde; {KITS.plus.precioRef}) ·{" "}
        <b>{KITS.max.nombre}</b> ({KITS.max.lotes} lotes × {KITS.max.kgPorLote} kg de CPS; {KITS.max.precioRef}).
      </p>
      <p className={styles.meta} style={{ marginBottom: 18 }}>
        Lo comprado entra por <Link href="/ocp/compras">Adquisición de Stock Café (Selection/Sample Kits)</Link> con destino <b>Sample Kits</b>; lo
        disponible se deriva. Un kit se <b>arma</b> lote a lote, sale <b>enviado</b> cuando está completo (con su guía) o se <b>anula</b> con motivo:
        nada se borra. Las muestras de 2 kg del circuito del lote son de uso exclusivo de CTCx y viven en{" "}
        <Link href="/ocp/muestras">Gestión de Muestras</Link>.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 24 }}>
        {kpis.map((k) => (
          <div key={k.k} className={styles.card} style={{ flexDirection: "column", alignItems: "flex-start", gap: 2, padding: 14 }}>
            <span className={styles.meta} style={{ marginTop: 0 }}>{k.k}</span>
            <b style={{ fontSize: 20 }}>{k.v}</b>
            <span className={styles.meta} style={{ marginTop: 0 }}>{k.sub}</span>
          </div>
        ))}
      </div>

      <section style={{ marginBottom: 30 }}>
        <div className={styles.sectionHead}>
          <h2>Stock por lote ({stock.length})</h2>
        </div>
        {stock.length === 0 ? (
          <p className={styles.empty}>
            Todavía no hay compras con destino Sample Kits. Se registran (o se destinan) en <Link href="/ocp/compras">Adquisición de Stock Café</Link>.
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <thead>
                <tr style={{ color: "var(--muted)", textAlign: "left" }}>
                  <th style={td}>Lote</th>
                  <th style={td}>Productor · finca</th>
                  <th style={td}>Grado</th>
                  <th style={td}>Variedad</th>
                  <th style={{ ...td, textAlign: "right" }}>Comprado (kg CPS)</th>
                  <th style={{ ...td, textAlign: "right" }}>Asignado</th>
                  <th style={{ ...td, textAlign: "right" }}>Disponible</th>
                  <th style={td}>Pagada</th>
                  <th style={td}>Ubicación</th>
                </tr>
              </thead>
              <tbody>
                {stock.map((c) => (
                  <tr key={c.compraId} style={{ borderTop: "1px solid var(--line)" }}>
                    <td style={td}>
                      <Link href={`/ocp/kr?lote=${c.lotId}`}>{c.lotName}</Link>
                    </td>
                    <td style={td}>
                      {c.producerName}
                      <div className={styles.meta}>{c.fincaName ?? "—"}</div>
                    </td>
                    <td style={td}>{GRADO_POR_ID[c.grado as keyof typeof GRADO_POR_ID]?.nombre ?? c.grado}</td>
                    <td style={td}>{c.variedad ?? "—"}</td>
                    <td style={{ ...td, textAlign: "right" }}>{c.compradoKg}</td>
                    <td style={{ ...td, textAlign: "right" }}>{c.asignadoKg}</td>
                    <td style={{ ...td, textAlign: "right" }}>
                      <b>{c.disponibleKg}</b>
                    </td>
                    <td style={td}>{fecha(c.pagadaAt)}</td>
                    <td style={td}>{c.ubicacion ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section style={{ marginBottom: 30 }}>
        <div className={styles.sectionHead}>
          <h2>Armar un kit</h2>
        </div>
        <ActionForm action={crearKit} submitLabel="Crear el kit" pendingLabel="Creando…" buttonClassName="btn btn-solid" className={styles.card} style={{ display: "block" }}>
          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label htmlFor="sk-tipo">Tipo</label>
              <select id="sk-tipo" name="tipo" required defaultValue="cp">
                {TIPOS.map((t) => (
                  <option key={t} value={t}>
                    {KITS[t].nombre} — {KITS[t].lotes} lotes × {KITS[t].kgPorLote} kg {KITS[t].unidad === "verde" ? "verde" : "CPS"} ({kgCpsDelKit(t)} kg CPS en total)
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label htmlFor="sk-destino">Para quién (MR, comprador o región)</label>
              <input id="sk-destino" name="destino" placeholder="Ej. Master Roaster Berlín · comprador X · región UE" />
            </div>
            <div className={styles.field}>
              <label htmlFor="sk-pedido">Pedido de la tienda (opcional)</label>
              <select id="sk-pedido" name="pedido_id" defaultValue="">
                <option value="">— sin pedido —</option>
                {pedidos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.id.slice(0, 8)} · {PEDIDO_STATUS_LABEL[p.status] ?? p.status} · {fecha(p.created_at)}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label htmlFor="sk-notas">Notas</label>
              <input id="sk-notas" name="notas" placeholder="Perfil buscado, acuerdos…" />
            </div>
          </div>
          <p className={styles.meta}>{KITS.cp.para}. Los lotes se añaden en la página del kit; nadie de fuera ve un kit hasta que sale enviado.</p>
        </ActionForm>
      </section>

      <section>
        <div className={styles.sectionHead}>
          <h2>Kits ({kits.length})</h2>
        </div>
        {kits.length === 0 ? (
          <p className={styles.empty}>Todavía no hay kits.</p>
        ) : (
          <div className={styles.list}>
            {kits.map((k) => (
              <Link key={k.id} href={`/ocp/sample-kits/${k.id}`} style={{ textDecoration: "none" }}>
                <div className={styles.card}>
                  <div>
                    <h3>
                      <code style={{ fontWeight: 400, marginRight: 8 }}>{k.codigo}</code>
                      {KITS[k.tipo].nombre}
                      {k.destino && <span style={{ fontWeight: 400 }}> · {k.destino}</span>}
                    </h3>
                    <p className={styles.meta}>
                      {k.lotes} de {KITS[k.tipo].lotes} lotes · {k.kgCps} kg de CPS · creado el {fecha(k.createdAt)}
                      {k.enviadoAt && <> · enviado el {fecha(k.enviadoAt)}</>}
                    </p>
                  </div>
                  <div className={styles.actions}>
                    <span className={k.status === "enviado" ? styles.badgeGood : k.status === "anulado" ? styles.badgeBad : styles.badge}>{KIT_STATUS_LABEL[k.status]}</span>
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
