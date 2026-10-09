import Link from "next/link";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/panel/ActionForm";
import { GRADO_POR_ID } from "@/lib/grados/definicion";
import { KITS, KIT_STATUS_LABEL, contenidoDelKit, kgCpsPorLote, type TipoDeKit } from "@/lib/compras/sampleKits";
import { listarKits, partidasParaKits } from "@/lib/compras/sampleKitsServidor";
import { ESTADO_INFO, STOCK_PATH, fmtKg } from "@/lib/stock/linaje";
import { PEDIDO_STATUS_LABEL, type EstadoDePedidoDeMuestra } from "@/lib/muestras/particion";
import { crearKit } from "../../comprasActions";
import { StockTabs } from "../StockTabs";
import styles from "@/components/panel/shared.module.css";

// ── OCP · Manejo de Stock Físico · Stock CTCx · Sample Kits (V5.90 · sobre el Stock CTCx desde la V5.195) ──────────────────────
// Los kits para compradores y Master Roasters (CP · Plus · Max) se arman con PARTIDAS del Stock CTCx: verde (o empacado de verde)
// para CP y Plus, pergamino (o empacado de pergamino) para Max. Lo que una partida tiene en un kit armado queda reservado; al
// enviarse el kit, sale del stock (lo escribe la base). La regla vive en `src/lib/compras/sampleKits.ts`.

export const dynamic = "force-dynamic";

const fecha = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("es-CO") : "—");
const td: React.CSSProperties = { padding: "6px 8px", whiteSpace: "nowrap", verticalAlign: "top" };
const TIPOS = Object.keys(KITS) as TipoDeKit[];
const unidadDe = (t: TipoDeKit) => (KITS[t].unidad === "verde" ? "verde" : "pergamino");

export default async function SampleKitsPage() {
  const service = createServiceRoleClient();
  const [partidas, kits, { data: pedidosRaw }] = await Promise.all([
    partidasParaKits(service),
    listarKits(service),
    service.from("sample_pack_orders").select("id, status, created_at").neq("status", "enviado").order("created_at", { ascending: false }),
  ]);
  const pedidos = (pedidosRaw as { id: string; status: EstadoDePedidoDeMuestra; created_at: string }[] | null) ?? [];
  const verde = partidas.filter((p) => p.contenido === "verde");
  const pergamino = partidas.filter((p) => p.contenido === "pergamino");
  const suma = (l: typeof partidas) => fmtKg(l.reduce((a, p) => a + p.disponibleKg, 0));
  const kpis = [
    { k: "Verde para CP y Plus", v: `${suma(verde)} kg`, sub: `${verde.length} partida${verde.length === 1 ? "" : "s"} con disponible` },
    { k: "Pergamino para Max", v: `${suma(pergamino)} kg`, sub: `${pergamino.length} partida${pergamino.length === 1 ? "" : "s"} con disponible` },
    { k: "Kits armados", v: String(kits.filter((k) => k.status === "armado").length), sub: "sus kilos quedan reservados" },
    { k: "Enviados", v: String(kits.filter((k) => k.status === "enviado").length), sub: `${kits.filter((k) => k.status === "anulado").length} anulados` },
  ];

  return (
    <div>
      <StockTabs activa="kits" />
      <h1 className={styles.title}>Sample Kits</h1>
      <p className={styles.subtitle}>
        Los kits para compradores y Master Roasters se arman con partidas del <Link href={STOCK_PATH}>Stock CTCx</Link>:{" "}
        <b>{KITS.cp.nombre}</b> ({KITS.cp.lotes} lotes × {KITS.cp.kgPorLote * 1000} g de verde ≈ {Math.round(kgCpsPorLote("cp") * 1000)} g de CPS cada uno;{" "}
        {KITS.cp.precioRef}) · <b>{KITS.plus.nombre}</b> ({KITS.plus.lotes} lotes × {KITS.plus.kgPorLote} kg de verde; {KITS.plus.precioRef}) ·{" "}
        <b>{KITS.max.nombre}</b> ({KITS.max.lotes} lotes × {KITS.max.kgPorLote} kg de CPS; {KITS.max.precioRef}).
      </p>
      <p className={styles.meta} style={{ marginBottom: 18 }}>
        Verde (o empacado de verde) para CP y Plus; pergamino (o empacado de pergamino) para Max. Lo vendido a nombre del productor no surte
        kits. Un kit se <b>arma</b> lote a lote (sus kilos quedan reservados en su partida), sale <b>enviado</b> cuando está completo —y entonces
        sale del stock— o se <b>anula</b> con motivo: nada se borra. Las muestras de 2 kg del circuito del lote son de uso exclusivo de CTCx y
        viven en <Link href="/ocp/muestras">Gestión de Muestras</Link>.
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
          <h2>Lo que puede surtir un kit ({partidas.length})</h2>
        </div>
        {partidas.length === 0 ? (
          <p className={styles.empty}>
            No hay partidas de verde ni de pergamino con disponible. El café entra al <Link href={STOCK_PATH}>Stock CTCx</Link> al recibir un despacho,
            al pagar el mes de una compra en firme o a mano; ahí se trilla y se empaca.
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <thead>
                <tr style={{ color: "var(--muted)", textAlign: "left" }}>
                  <th style={td}>Partida</th>
                  <th style={td}>Lote</th>
                  <th style={td}>Productor · finca</th>
                  <th style={td}>Grado</th>
                  <th style={td}>Café</th>
                  <th style={{ ...td, textAlign: "right" }}>Disponible (kg)</th>
                  <th style={td}>Surte</th>
                  <th style={td}>Ubicación</th>
                </tr>
              </thead>
              <tbody>
                {partidas.map((p) => (
                  <tr key={p.partidaId} style={{ borderTop: "1px solid var(--line)" }}>
                    <td style={td}>
                      <Link href={`${STOCK_PATH}?partida=${p.partidaId}`}><code>{p.codigo}</code></Link>
                    </td>
                    <td style={td}>
                      <Link href={`/ocp/kr?lote=${p.lotId}`}>{p.lotName}</Link>
                    </td>
                    <td style={td}>
                      {p.producerName}
                      <div className={styles.meta}>{p.fincaName ?? "—"}</div>
                    </td>
                    <td style={td}>{GRADO_POR_ID[(p.grado ?? "") as keyof typeof GRADO_POR_ID]?.nombre ?? p.grado ?? "—"}</td>
                    <td style={td}>
                      {ESTADO_INFO[p.estado].nombre}
                      {p.estado === "empacado" && <> de {p.contenido}</>}
                      {p.presentacion && <div className={styles.meta}>{p.presentacion}</div>}
                    </td>
                    <td style={{ ...td, textAlign: "right" }}>
                      <b>{fmtKg(p.disponibleKg)}</b>
                    </td>
                    <td style={td}>{p.contenido === "verde" ? "CP · Plus" : "Max"}</td>
                    <td style={td}>{p.ubicacion ?? "—"}</td>
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
                    {KITS[t].nombre} — {KITS[t].lotes} lotes × {KITS[t].kgPorLote} kg de {unidadDe(t)}
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
              <Link key={k.id} href={`${STOCK_PATH}/sample-kits/${k.id}`} style={{ textDecoration: "none" }}>
                <div className={styles.card}>
                  <div>
                    <h3>
                      <code style={{ fontWeight: 400, marginRight: 8 }}>{k.codigo}</code>
                      {KITS[k.tipo].nombre}
                      {k.destino && <span style={{ fontWeight: 400 }}> · {k.destino}</span>}
                    </h3>
                    <p className={styles.meta}>
                      {k.lotes} de {KITS[k.tipo].lotes} lotes · {fmtKg(k.kg)} kg de {contenidoDelKit(k.tipo)} · creado el {fecha(k.createdAt)}
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
