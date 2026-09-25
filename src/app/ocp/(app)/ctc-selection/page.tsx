import Link from "next/link";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { fetchProducerContacts } from "@/lib/bcpProducers";
import { ActionForm } from "@/components/panel/ActionForm";
import { formatCop } from "@/lib/arena/inscriptions";
import { GRADO_POR_ID } from "@/lib/grados/definicion";
import { CLAVE_PERFIL_CTCX, disponibleKg, resumenDeCompras } from "@/lib/compras/reglas";
import { aPerfilCtcx, urlDeImagenCtcx } from "@/lib/catalogo/perfilCtcx";
import { guardarPerfilCtcx } from "../comprasActions";
import { ImagenCtcxUploader } from "./ImagenCtcxUploader";
import styles from "@/components/panel/shared.module.css";

// ── Oferta desde CTCx Selection (V5.85 · fase 8 del PLAN_CIRCUITO_DEL_LOTE) ───────────────────
// Decisión 7 del owner: «toma lo confirmado como COMPRADO en Compras y dice cuánto pasa al Catálogo Activo, en los mismos
// términos que cualquier productor (cantidad disponible)». Es el staging del Catálogo Activo del lado Compras («Ofertas CP
// Aceptadas» es el del lado KR). Aquí NO se negocia: la negociación de CTCx Selection es una oferta `directa` (PVC − 8 %,
// 30 días) que sale de «Pendiente Oferta», y lo comprado nace del pago de su mes (o a mano en Compras). El CRM de
// `black_negotiations` (kanban nueva · en conversación · acuerdo cerca) se retiró: tabla dormida, sin escritor.
//
// La VITRINA de un lote comprado enseña el PERFIL ÚNICO de CTCx Selection (respuesta 7 del 23-sep: uno para toda la casa,
// con opción de una imagen por lote); el REGISTRO conserva la finca real (D3.1), y por eso aquí, backstage, sí se ve.

export const dynamic = "force-dynamic";

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
  recibida_at: string | null;
  pagada_at: string | null;
  origen: string;
  lots: { id: string; name: string; producer_id: string; public_code: string | null; fincas: { name: string } | null } | null;
};
type ListingRow = { lot_id: string; status: string; total_kg: number | string | null; sold_kg: number | string | null; price_per_kg: number | string | null };
type ImagenRow = { lot_id: string; imagen_path: string | null; imagen_alt: string | null };

const fecha = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("es-CO") : "—");
const n1 = (v: number | string | null | undefined) => Math.round(Number(v ?? 0) * 10) / 10;

export default async function OfertaDesdeCtcxSelectionPage() {
  const service = createServiceRoleClient();
  const [{ data: cRaw }, { data: perfilRaw }] = await Promise.all([
    service
      .from("compras")
      .select("id, lot_id, contract_id, mes, grado, kg, cop_kg, total_cop, precio_fuente, recibida_at, pagada_at, origen, lots(id, name, producer_id, public_code, fincas(name))")
      // V5.90: solo lo comprado CON DESTINO CTCx Selection (lo de Sample Kits vive en /ocp/sample-kits).
      .eq("destino", "selection")
      .order("pagada_at", { ascending: false, nullsFirst: false }),
    service.from("platform_settings").select("value").eq("key", CLAVE_PERFIL_CTCX).maybeSingle(),
  ]);
  const compras = (cRaw as unknown as CompraRow[] | null) ?? [];
  const lotIds = [...new Set(compras.map((c) => c.lot_id))];
  const producerIds = [...new Set(compras.map((c) => c.lots?.producer_id ?? "").filter(Boolean))];
  const [{ data: lRaw }, { data: iRaw }, producers, { data: mcRaw }] = await Promise.all([
    lotIds.length
      ? service.from("lot_listings").select("lot_id, status, total_kg, sold_kg, price_per_kg").in("lot_id", lotIds).neq("status", "archived")
      : Promise.resolve({ data: [] as ListingRow[] }),
    lotIds.length ? service.from("ctcx_selection_lotes").select("lot_id, imagen_path, imagen_alt").in("lot_id", lotIds) : Promise.resolve({ data: [] as ImagenRow[] }),
    fetchProducerContacts(service, producerIds),
    // V5.87: lo asignado a mezclas (no anuladas) descuenta de lo disponible por lote.
    compras.length
      ? service.from("mezcla_componentes").select("compra_id, kg, mezclas!inner(status)").in("compra_id", compras.map((c) => c.id)).neq("mezclas.status", "anulada")
      : Promise.resolve({ data: [] as { compra_id: string; kg: number | string }[] }),
  ]);
  const asignadoByCompra = new Map<string, number>();
  for (const r of ((mcRaw as { compra_id: string; kg: number | string }[] | null) ?? [])) asignadoByCompra.set(r.compra_id, (asignadoByCompra.get(r.compra_id) ?? 0) + Number(r.kg));
  const valor = (perfilRaw?.value as Record<string, string | null> | null) ?? null;
  const perfil = aPerfilCtcx(valor ? { nombre: valor.nombre ?? null, lema: valor.lema ?? null, descripcion: valor.descripcion ?? null, imagen_path: valor.imagen_path ?? null } : null);
  const listingByLot = new Map(((lRaw as ListingRow[] | null) ?? []).map((l) => [l.lot_id, l]));
  const imagenByLot = new Map(((iRaw as ImagenRow[] | null) ?? []).map((i) => [i.lot_id, i]));

  const resumen = resumenDeCompras(compras.map((c) => ({ lotId: c.lot_id, grado: c.grado, kg: Number(c.kg), totalCop: Number(c.total_cop), recibidaAt: c.recibida_at, pagadaAt: c.pagada_at })));
  const porLote = lotIds.map((id) => {
    const filas = compras.filter((c) => c.lot_id === id);
    const lot = filas[0].lots;
    const compradoKg = n1(filas.reduce((a, c) => a + Number(c.kg), 0));
    const copPagado = Math.round(filas.filter((c) => c.pagada_at).reduce((a, c) => a + Number(c.total_cop), 0));
    const listing = listingByLot.get(id);
    const vendidoKg = n1(listing?.sold_kg);
    const asignadoKg = n1(filas.reduce((a, c) => a + (asignadoByCompra.get(c.id) ?? 0), 0));
    return { id, lot, grado: filas[0].grado, filas, compradoKg, copPagado, listing, vendidoKg, asignadoKg, disponibleKg: disponibleKg({ compradoKg, vendidoKg, asignadoKg }), imagen: imagenByLot.get(id) };
  });
  const kgDisponibles = n1(porLote.reduce((a, l) => a + l.disponibleKg, 0));
  const kgVendidos = n1(porLote.reduce((a, l) => a + l.vendidoKg, 0));
  const publicados = porLote.filter((l) => l.listing?.status === "published" || l.listing?.status === "sold_out").length;

  const kpis = [
    { k: "Lotes comprados en firme", v: String(resumen.lotes), sub: `${resumen.compras} compra${resumen.compras === 1 ? "" : "s"}` },
    { k: "Kg comprados (CPS)", v: String(resumen.kgComprados), sub: `${resumen.kgRecibidos} kg recibidos` },
    { k: "Disponible para ofrecer", v: `${kgDisponibles} kg`, sub: "comprado − en mezclas − vendido (derivado)" },
    { k: "En el Catálogo Activo", v: String(publicados), sub: `${kgVendidos} kg vendidos en Cherry Picked` },
    { k: "Pagado a productores", v: formatCop(resumen.copPagado), sub: "compras pagadas" },
  ];

  return (
    <div>
      <h1 className={styles.title}>Oferta desde CTCx Selection</h1>
      <p className={styles.subtitle}>
        Lo que CTCx <b>compró en firme con destino CTCx Selection</b> —documentado en <Link href="/ocp/compras">Adquisición de Stock</Link>— y cuánto de eso pasa al{" "}
        <b>Catálogo Activo</b> como disponibilidad, en los mismos términos que cualquier productor. La vitrina enseña el perfil de CTCx
        Selection en vez de la finca; el registro (pasaporte, ficha, rastro EUDR) conserva la finca real.
      </p>
      <p className={styles.meta} style={{ marginBottom: 18 }}>
        La negociación de CTCx Selection ya no vive aquí: es una oferta <b>directa</b> (PVC − 8 %, 30 días, mínimo y máximo) que sale de{" "}
        <Link href="/ocp/ofertas">Pendiente Oferta</Link>; al pagar el mes de ese contrato, la compra aparece aquí sola.
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
          <h2>El perfil de CTCx Selection (uno para toda la casa)</h2>
        </div>
        <div className={styles.card} style={{ flexDirection: "column", alignItems: "stretch" }}>
          <p className={styles.meta}>
            Es lo que el comprador ve en la tarjeta, la cinta y la ficha pública de todo lote comprado en firme, en lugar del nombre de la
            finca. Un solo perfil; la imagen de cada lote se adjunta abajo.
          </p>
          <ActionForm action={guardarPerfilCtcx} submitLabel="Guardar perfil" pendingLabel="Guardando…" buttonClassName="btn btn-sm btn-solid" style={{ display: "grid", gap: 8, marginTop: 8 }}>
            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label htmlFor="ctcx-nombre">Nombre (reemplaza a la finca)</label>
                <input id="ctcx-nombre" name="nombre" defaultValue={perfil.nombre} required />
              </div>
              <div className={styles.field}>
                <label htmlFor="ctcx-lema">Lema</label>
                <input id="ctcx-lema" name="lema" defaultValue={perfil.lema ?? ""} />
              </div>
            </div>
            <div className={styles.field}>
              <label htmlFor="ctcx-descripcion">Descripción</label>
              <textarea id="ctcx-descripcion" name="descripcion" rows={3} defaultValue={perfil.descripcion ?? ""} />
            </div>
          </ActionForm>
          <div style={{ marginTop: 12 }}>
            <ImagenCtcxUploader destino={{ tipo: "perfil" }} imagenUrl={perfil.imagenUrl} alt={perfil.nombre} etiqueta="Imagen del perfil (la de un lote sin imagen propia)" />
          </div>
        </div>
      </section>

      <section style={{ marginTop: 34 }}>
        <div className={styles.sectionHead}>
          <h2>Lotes comprados y su disponibilidad ({porLote.length})</h2>
        </div>
        {porLote.length === 0 ? (
          <p className={styles.empty}>
            Todavía no hay compras en firme. Nacen solas al pagar el mes de un contrato directa (o Black), o se registran a mano en{" "}
            <Link href="/ocp/compras">Compras</Link>.
          </p>
        ) : (
          <div className={styles.list}>
            {porLote.map((l) => (
              <div key={l.id} className={styles.card} style={{ flexDirection: "column", alignItems: "stretch" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <div>
                    <h3>
                      {l.lot?.name ?? "—"} {l.lot?.public_code && <code style={{ fontWeight: 400, marginLeft: 6 }}>{l.lot.public_code}</code>}
                    </h3>
                    <p className={styles.meta}>
                      {producers.get(l.lot?.producer_id ?? "")?.fullName ?? "Productor"} · {l.lot?.fincas?.name ?? "—"} <span title="El registro conserva la finca real; la vitrina enseña el perfil de CTCx Selection">(registro)</span>
                    </p>
                  </div>
                  <span className={styles.badge}>{GRADO_POR_ID[l.grado as keyof typeof GRADO_POR_ID]?.nombre ?? l.grado}</span>
                </div>
                <p className={styles.meta} style={{ margin: "8px 0 0" }}>
                  Comprado: <b>{l.compradoKg} kg</b> en {l.filas.length} compra{l.filas.length === 1 ? "" : "s"} · pagado <b>{formatCop(l.copPagado)}</b> · última el{" "}
                  {fecha(l.filas[0].pagada_at ?? l.filas[0].recibida_at)}
                  {l.filas[0].precio_fuente && <> · {l.filas[0].precio_fuente}</>}
                </p>
                <p className={styles.meta} style={{ margin: "4px 0 0" }}>
                  Catálogo Activo:{" "}
                  {l.listing ? (
                    <>
                      <span className={l.listing.status === "published" ? styles.badgeGood : styles.badge}>{l.listing.status}</span> · {l.vendidoKg} / {n1(l.listing.total_kg)} kg
                      vendidos{l.listing.price_per_kg != null && <> · US${Number(l.listing.price_per_kg)}/kg</>} · <Link href="/ocp/catalogo">ver en Catálogo</Link>
                    </>
                  ) : (
                    <>
                      sin publicar — <Link href="/ocp/catalogo">Pasar al Catálogo Activo →</Link>
                    </>
                  )}{" "}
                  {l.asignadoKg > 0 && <> · en mezclas {l.asignadoKg} kg</>} · <b>disponible {l.disponibleKg} kg</b>
                </p>
                <div style={{ marginTop: 10 }}>
                  <ImagenCtcxUploader destino={{ tipo: "lote", lotId: l.id }} imagenUrl={urlDeImagenCtcx(l.imagen?.imagen_path)} alt={l.imagen?.imagen_alt} etiqueta="Imagen de este lote en la vitrina (opcional)" />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
