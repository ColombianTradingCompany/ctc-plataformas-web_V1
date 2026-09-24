import Link from "next/link";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { fetchProducerContacts } from "@/lib/bcpProducers";
import { ActionForm } from "@/components/panel/ActionForm";
import { formatCop } from "@/lib/arena/inscriptions";
import { GRADO_POR_ID } from "@/lib/grados/definicion";
import { resumenDeCompras } from "@/lib/compras/reglas";
import { registrarCompraManual, ubicarCompra } from "../comprasActions";
import styles from "@/components/panel/shared.module.css";

// ── OCP · Manejo de Stock Físico · CTCx Selection · Compras (V5.85 · 2.ª tanda V5.87) ──────────
// El registro de cada compra EN FIRME de CTCx (brief `consolas-ctcx-selection-compras.md`): qué café, a quién, cuántos kilos,
// a qué precio (citando su edición del PVC), cuándo se pagó, cuándo llegó y DÓNDE está (V5.87, decisión 2 del brief: texto
// libre hasta que el owner fije los sitios). Una compra nace del PAGO de un mes de un contrato `directa`/`black`
// (`registrarPagoDelMes`) o a mano, aquí, con su nota. Cómo se combina vive en Mezclas (V5.87); lo DISPONIBLE no se guarda:
// se deriva en «Oferta desde CTCx Selection» (comprado − en mezclas − vendido). La pantalla habla en kg de CPS: la
// conversión a verde la da el Modelo de Producción (su brief), aquí no se inventa un factor (decisión 5).

export const dynamic = "force-dynamic";

type MezclaEmb = { codigo: string; status: string };
type CompraRow = {
  id: string;
  lot_id: string;
  contract_id: string | null;
  mes: number | null;
  grado: string;
  kg: number | string;
  cop_kg: number | string;
  total_cop: number | string;
  precio_fuente: string | null;
  modificador_pct: number | string | null;
  acordada_at: string | null;
  recibida_at: string | null;
  pagada_at: string | null;
  pago_ref: string | null;
  origen: string;
  nota: string | null;
  ubicacion: string | null;
  lots: { id: string; name: string; producer_id: string; fincas: { name: string } | null } | null;
  pvc_editions: { code: string } | null;
  mezcla_componentes: { kg: number | string; mezclas: MezclaEmb | MezclaEmb[] | null }[];
};
type LoteRow = { id: string; name: string; grade: string | null; fincas: { name: string } | null };

const fecha = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("es-CO") : "—");
const td: React.CSSProperties = { padding: "6px 8px", whiteSpace: "nowrap", verticalAlign: "top" };
const uno = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);

export default async function ComprasPage() {
  const service = createServiceRoleClient();
  const [{ data: cRaw }, { data: gRaw }] = await Promise.all([
    service
      .from("compras")
      .select(
        "id, lot_id, contract_id, mes, grado, kg, cop_kg, total_cop, precio_fuente, modificador_pct, acordada_at, recibida_at, pagada_at, pago_ref, origen, nota, ubicacion, lots(id, name, producer_id, fincas(name)), pvc_editions(code), mezcla_componentes(kg, mezclas(codigo, status))"
      )
      .order("created_at", { ascending: false }),
    service.from("lots").select("id, name, grade, fincas(name)").eq("stage", "galardonado").neq("grade", "tyrian").order("name"),
  ]);
  const compras = (cRaw as unknown as CompraRow[] | null) ?? [];
  const galardonados = (gRaw as unknown as LoteRow[] | null) ?? [];
  const producers = await fetchProducerContacts(service, [...new Set(compras.map((c) => c.lots?.producer_id ?? "").filter(Boolean))]);
  const resumen = resumenDeCompras(compras.map((c) => ({ lotId: c.lot_id, grado: c.grado, kg: Number(c.kg), totalCop: Number(c.total_cop), recibidaAt: c.recibida_at, pagadaAt: c.pagada_at })));
  // Lo asignado a mezclas (no anuladas) por compra: descuenta de lo disponible (derivado, nunca guardado).
  const enMezcla = (c: CompraRow) => c.mezcla_componentes.filter((m) => uno(m.mezclas)?.status !== "anulada");
  const kgEnMezclas = Math.round(compras.reduce((a, c) => a + enMezcla(c).reduce((b, m) => b + Number(m.kg), 0), 0) * 10) / 10;

  const kpis = [
    { k: "Compras en firme", v: String(resumen.compras), sub: `${resumen.lotes} lote${resumen.lotes === 1 ? "" : "s"}` },
    { k: "Kg comprados (CPS)", v: String(resumen.kgComprados), sub: `${resumen.kgRecibidos} kg recibidos` },
    { k: "En mezclas", v: `${kgEnMezclas} kg`, sub: "asignado a mezclas no anuladas" },
    { k: "Pagado", v: formatCop(resumen.copPagado), sub: "compras con pago registrado" },
    ...Object.entries(resumen.porGrado).map(([g, v]) => ({ k: `${GRADO_POR_ID[g as keyof typeof GRADO_POR_ID]?.nombre ?? g}`, v: `${v.kg} kg`, sub: `${v.compras} compra${v.compras === 1 ? "" : "s"}` })),
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <h1 className={styles.title}>CTCx Selection · Compras</h1>
        <Link href="/ocp/compras/mezclas" className={styles.backLink}>
          Mezclas →
        </Link>
      </div>
      <p className={styles.subtitle}>
        El registro de cada compra <b>en firme</b> de CTCx: qué café, a quién, cuántos kilos, a qué precio (con su edición del PVC),
        cuándo se pagó, cuándo llegó y dónde está. Lo comprado se ofrece como <b>CTCx Selection</b>; cómo se combina vive en{" "}
        <Link href="/ocp/compras/mezclas">Mezclas</Link>; cuánto queda disponible lo dice <Link href="/ocp/ctc-selection">Oferta desde CTCx Selection</Link>.
      </p>
      <p className={styles.meta} style={{ marginBottom: 18 }}>
        Una compra nace sola al <b>pagar el mes</b> de un contrato directa o Black (<Link href="/ocp/contratos">Ofertas CP Aceptadas</Link>). A mano,
        abajo, se documenta lo que se compró fuera de la plataforma (la ruta Desacoplada, un acuerdo directo): siempre con su nota.
        Tyrian no se compra: va a subasta. Todo en kg de CPS (pergamino seco); la conversión a verde es del Modelo de Producción.
      </p>

      <div className={styles.kpiGrid}>
        {kpis.map((kpi) => (
          <div key={kpi.k} className={styles.kpiCard}>
            <span className={styles.kpiTop}>
              <span className={styles.kpiK}>{kpi.k}</span>
            </span>
            <span className={styles.kpiV}>{kpi.v}</span>
            <span className={styles.kpiSub}>{kpi.sub}</span>
          </div>
        ))}
      </div>

      <section style={{ marginTop: 30 }}>
        <div className={styles.sectionHead}>
          <h2>Compras ({compras.length})</h2>
        </div>
        {compras.length === 0 ? (
          <p className={styles.empty}>Todavía no hay compras en firme registradas.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <thead>
                <tr style={{ color: "var(--muted)", textAlign: "left" }}>
                  <th style={td}>Pagada</th>
                  <th style={td}>Lote</th>
                  <th style={td}>Productor · finca</th>
                  <th style={td}>Grado</th>
                  <th style={{ ...td, textAlign: "right" }}>kg CPS</th>
                  <th style={{ ...td, textAlign: "right" }}>COP/kg</th>
                  <th style={{ ...td, textAlign: "right" }}>Total</th>
                  <th style={td}>Precio</th>
                  <th style={td}>Recibida</th>
                  <th style={td}>En mezcla</th>
                  <th style={td}>Ubicación</th>
                  <th style={td}>Origen</th>
                </tr>
              </thead>
              <tbody>
                {compras.map((c) => {
                  const mezclas = enMezcla(c);
                  const asignado = Math.round(mezclas.reduce((a, m) => a + Number(m.kg), 0) * 10) / 10;
                  return (
                    <tr key={c.id} style={{ borderTop: "1px solid var(--line)" }}>
                      <td style={td}>
                        {fecha(c.pagada_at)}
                        {c.pago_ref && <div className={styles.meta}>ref. {c.pago_ref}</div>}
                      </td>
                      <td style={td}>{c.lots?.name ?? "—"}</td>
                      <td style={td}>
                        {producers.get(c.lots?.producer_id ?? "")?.fullName ?? "Productor"}
                        <div className={styles.meta}>{c.lots?.fincas?.name ?? "—"}</div>
                      </td>
                      <td style={td}>
                        <span className={styles.badge}>{GRADO_POR_ID[c.grado as keyof typeof GRADO_POR_ID]?.nombre ?? c.grado}</span>
                      </td>
                      <td style={{ ...td, textAlign: "right" }}>{Number(c.kg)}</td>
                      <td style={{ ...td, textAlign: "right" }}>{formatCop(Number(c.cop_kg))}</td>
                      <td style={{ ...td, textAlign: "right" }}>
                        <b>{formatCop(Number(c.total_cop))}</b>
                      </td>
                      <td style={td}>
                        {c.pvc_editions?.code ? `PVC ${c.pvc_editions.code}` : c.precio_fuente ?? "—"}
                        {c.modificador_pct != null && Number(c.modificador_pct) !== 0 && <> ({Number(c.modificador_pct) > 0 ? "+" : ""}{Number(c.modificador_pct)} %)</>}
                      </td>
                      <td style={td}>{fecha(c.recibida_at)}</td>
                      <td style={td}>
                        {asignado > 0 ? (
                          <>
                            {asignado} kg
                            <div className={styles.meta}>{mezclas.map((m) => uno(m.mezclas)?.codigo).filter(Boolean).join(", ")}</div>
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td style={td}>
                        <ActionForm action={ubicarCompra.bind(null, c.id)} submitLabel="Ubicar" pendingLabel="…" buttonClassName="btn btn-sm" style={{ display: "flex", gap: 4, alignItems: "center" }}>
                          <input name="ubicacion" defaultValue={c.ubicacion ?? ""} placeholder="finca · Centro · bodega" style={{ width: 140, fontSize: 12 }} />
                        </ActionForm>
                      </td>
                      <td style={td}>
                        {c.origen === "contrato" ? (
                          <>
                            contrato{c.mes ? ` · mes ${c.mes}` : ""}
                            {c.contract_id && (
                              <div className={styles.meta}>
                                <Link href={`/ocp/contratos/${c.contract_id}`}>ver contrato</Link>
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            manual
                            {c.nota && <div className={styles.meta} style={{ whiteSpace: "normal", maxWidth: 260 }}>{c.nota}</div>}
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section style={{ marginTop: 34 }}>
        <div className={styles.sectionHead}>
          <h2>Registrar una compra a mano</h2>
        </div>
        <ActionForm action={registrarCompraManual} submitLabel="Registrar la compra" pendingLabel="Registrando…" buttonClassName="btn btn-solid" className={styles.card} style={{ display: "block" }}>
          <p className={styles.meta} style={{ marginBottom: 10 }}>
            Para lo comprado fuera de la plataforma. El precio queda referido a la edición del PVC vigente el día del pago; la nota es obligatoria
            (de dónde sale la compra). Solo lotes galardonados, nunca Tyrian.
          </p>
          <div className={styles.formGrid}>
            <div className={styles.field} style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="compra-lote">Lote</label>
              <select id="compra-lote" name="lot_id" required defaultValue="">
                <option value="" disabled>
                  Elija el lote galardonado…
                </option>
                {galardonados.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} · {l.fincas?.name ?? "—"} · {GRADO_POR_ID[(l.grade ?? "") as keyof typeof GRADO_POR_ID]?.nombre ?? l.grade}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label htmlFor="compra-kg">Kilos de CPS</label>
              <input id="compra-kg" name="kg" inputMode="decimal" required />
            </div>
            <div className={styles.field}>
              <label htmlFor="compra-cop">Precio pagado (COP/kg)</label>
              <input id="compra-cop" name="cop_kg" inputMode="numeric" required />
            </div>
            <div className={styles.field}>
              <label htmlFor="compra-pagada">Pagada el</label>
              <input id="compra-pagada" name="pagada_at" type="date" />
            </div>
            <div className={styles.field}>
              <label htmlFor="compra-ref">Referencia del pago</label>
              <input id="compra-ref" name="pago_ref" />
            </div>
            <div className={styles.field}>
              <label htmlFor="compra-recibida">Recibida el</label>
              <input id="compra-recibida" name="recibida_at" type="date" />
            </div>
            <div className={styles.field}>
              <label htmlFor="compra-ubicacion">Dónde está el café</label>
              <input id="compra-ubicacion" name="ubicacion" placeholder="finca · Centro de Calidad · bodega" />
            </div>
            <div className={styles.field} style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="compra-nota">Nota (obligatoria)</label>
              <input id="compra-nota" name="nota" placeholder="Acuerdo por WhatsApp del 12/10; factura N.º…" required />
            </div>
          </div>
        </ActionForm>
      </section>
    </div>
  );
}
