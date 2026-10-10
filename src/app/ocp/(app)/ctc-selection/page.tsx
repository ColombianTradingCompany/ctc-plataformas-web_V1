import Link from "next/link";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { fetchProducerContacts } from "@/lib/bcpProducers";
import { ActionForm } from "@/components/panel/ActionForm";
import { formatCop } from "@/lib/arena/inscriptions";
import { GRADO_POR_ID } from "@/lib/grados/definicion";
import { CLAVE_PERFIL_CTCX, resumenDeCompras } from "@/lib/compras/reglas";
import { DESTINO_LABEL, esCompraSelection } from "@/lib/compras/selection";
import { fechaCorta } from "@/lib/compras/adquisicion";
import { aPerfilCtcx, urlDeImagenCtcx } from "@/lib/catalogo/perfilCtcx";
import { ESTADO_INFO, STOCK_PATH, fmtKg, movimientosDe, type Partida } from "@/lib/stock/linaje";
import { cargarStock } from "@/lib/stock/servidor";
import { TRIAGE_PATH, rutaDelTriage } from "@/lib/triage/fobMinimo";
import { guardarPerfilCtcx } from "../comprasActions";
import { CircuitoDelStock } from "../CircuitoDelStock";
import { ImagenCtcxUploader } from "./ImagenCtcxUploader";
import styles from "@/components/panel/shared.module.css";

// ── Oferta desde CTCx Selection (V5.85 · fase 8 del PLAN_CIRCUITO_DEL_LOTE · leída del Stock CTCx desde la V5.203) ─────────────────
// Decisión 7 del owner: «toma lo confirmado como COMPRADO en Compras y dice cuánto pasa al Catálogo Activo, en los mismos términos que
// cualquier productor (cantidad disponible)». Aquí NO se negocia (la negociación es una oferta `directa` desde «Pendiente Oferta») ni se
// publica: lo comprado entra al Stock CTCx y se declara en el Triage de Catálogo Activo (V5.196).
//
// V5.203 (owner, 2026-10-10: «…mejora el UI/UX […] también en relación a su interacción con el Triage de Catálogo Activo y la Oferta de
// CTCx Selection»): el disponible ya no es «comprado − mezclas» en kg de CPS (ignoraba la trilla, los kits, las salidas y lo declarado,
// hueco H5): se lee del STOCK REAL —las partidas SX- de cada compra Selection viva, con `movimientosDe` (= `stock_disponible`)—, con el
// pergamino (kg de CPS) y el verde separados y rotulados; el estado del listado va en español; «Declarar en el Triage →» abre ESA
// partida; y el estado vacío dice la verdad (H6): si hay compras solo stock, cuántas y dónde. Selection = `esCompraSelection` (B2).
//
// La VITRINA de un lote comprado enseña el PERFIL ÚNICO de CTCx Selection (respuesta 7 del 23-sep: uno para toda la casa, con opción de
// una imagen por lote); el REGISTRO conserva la finca real (D3.1), y por eso aquí, backstage, sí se ve.
//
// V5.203 · corrección (nodo final, 2026-10-10): si la lectura de las compras falla, la página lo dice y no pinta «0 compras» (H8); desde
// la V5.202 ningún lote enseña la finca en la vitrina —lo que cambia en un lote de Selection es el RÓTULO y la IMAGEN de CTCx frente a
// las fotos del lote— (H14); las fechas, con `fechaCorta` (H3); «Declarar en el Triage →» abre el formulario de ESA partida (H15).

export const dynamic = "force-dynamic";

type CompraRow = {
  id: string;
  lot_id: string;
  grado: string;
  kg: number | string;
  total_cop: number | string;
  precio_fuente: string | null;
  recibida_at: string | null;
  pagada_at: string | null;
  destino: string;
  anulada_at: string | null;
  lots: { id: string; name: string; producer_id: string; public_code: string | null; fincas: { name: string } | { name: string }[] | null } | null;
};
type ListingRow = { lot_id: string; status: string; total_kg: number | string | null; sold_kg: number | string | null; price_per_kg: number | string | null };
type ImagenRow = { lot_id: string; imagen_path: string | null; imagen_alt: string | null };

const STATUS_LISTADO: Record<string, string> = { draft: "Borrador", published: "Publicado", sold_out: "Agotado", archived: "Archivado" };
const n1 = (v: number | string | null | undefined) => Math.round(Number(v ?? 0) * 10) / 10;
const uno = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);

export default async function OfertaDesdeCtcxSelectionPage() {
  const service = createServiceRoleClient();
  const [stock, { data: cRaw, error: errorCompras }, { data: perfilRaw }] = await Promise.all([
    cargarStock(service),
    service
      .from("compras")
      .select("id, lot_id, grado, kg, total_cop, precio_fuente, recibida_at, pagada_at, destino, anulada_at, lots(id, name, producer_id, public_code, fincas(name))")
      .order("pagada_at", { ascending: false, nullsFirst: false }),
    service.from("platform_settings").select("value").eq("key", CLAVE_PERFIL_CTCX).maybeSingle(),
  ]);
  const todas = (cRaw as unknown as CompraRow[] | null) ?? [];
  // V5.90 · V5.203: solo lo comprado como CTCx Selection y vivo (lo que es solo stock vive en Adquisición y el Stock CTCx).
  const compras = todas.filter(esCompraSelection);
  const soloStock = todas.filter((c) => !c.anulada_at && !esCompraSelection(c)).length;
  const lotIds = [...new Set(compras.map((c) => c.lot_id))];
  const [{ data: lRaw }, { data: iRaw }, producers] = await Promise.all([
    lotIds.length ? service.from("lot_listings").select("lot_id, status, total_kg, sold_kg, price_per_kg").in("lot_id", lotIds).neq("status", "archived") : Promise.resolve({ data: [] as ListingRow[] }),
    lotIds.length ? service.from("ctcx_selection_lotes").select("lot_id, imagen_path, imagen_alt").in("lot_id", lotIds) : Promise.resolve({ data: [] as ImagenRow[] }),
    fetchProducerContacts(service, compras.map((c) => c.lots?.producer_id)),
  ]);
  const valor = (perfilRaw?.value as Record<string, string | null> | null) ?? null;
  const perfil = aPerfilCtcx(valor ? { nombre: valor.nombre ?? null, lema: valor.lema ?? null, descripcion: valor.descripcion ?? null, imagen_path: valor.imagen_path ?? null } : null);
  const listingByLot = new Map(((lRaw as ListingRow[] | null) ?? []).map((l) => [l.lot_id, l]));
  const imagenByLot = new Map(((iRaw as ImagenRow[] | null) ?? []).map((i) => [i.lot_id, i]));

  const resumen = resumenDeCompras(compras.map((c) => ({ lotId: c.lot_id, grado: c.grado, kg: Number(c.kg), totalCop: Number(c.total_cop), recibidaAt: c.recibida_at, pagadaAt: c.pagada_at })));
  const porLote = lotIds.map((id) => {
    const filas = compras.filter((c) => c.lot_id === id);
    const lot = filas[0].lots;
    // Las partidas de las compras de este lote: la raíz de cada compra y todo lo que salió de ella (trilla, empaque…).
    const raices = stock.partidas.filter((p) => p.compraId && filas.some((c) => c.id === p.compraId) && p.raizId === p.id && !p.anulada);
    const partidas: (Partida & { disponibleKg: number; declaradoKg: number })[] = stock.partidas
      .filter((p) => !p.anulada && raices.some((r) => r.id === p.raizId))
      .map((p) => {
        const m = movimientosDe(p, stock);
        return { ...p, disponibleKg: m.disponibleKg, declaradoKg: m.declaradoKg };
      });
    const pergaminoKg = n1(partidas.filter((p) => p.contenido === "pergamino").reduce((a, p) => a + p.disponibleKg, 0));
    const verdeKg = n1(partidas.filter((p) => p.contenido === "verde").reduce((a, p) => a + p.disponibleKg, 0));
    const tostadoKg = n1(partidas.filter((p) => p.contenido === "tostado").reduce((a, p) => a + p.disponibleKg, 0));
    const declaradas = (stock.reservasCatalogo ?? []).filter((r) => partidas.some((p) => p.id === r.partidaId));
    const enMezclasKg = n1(stock.reservasMezcla.filter((r) => filas.some((c) => c.id === r.compraId)).reduce((a, r) => a + r.kg, 0));
    const declarable = partidas.filter((p) => (p.contenido === "pergamino" || p.contenido === "verde") && !p.comprometido && p.disponibleKg > 0).sort((a, b) => b.disponibleKg - a.disponibleKg)[0] ?? null;
    const sinRecibir = filas.filter((c) => !stock.partidas.some((p) => p.compraId === c.id && !p.anulada)).length;
    return {
      id,
      lot,
      grado: filas[0].grado,
      filas,
      compradoKg: n1(filas.reduce((a, c) => a + Number(c.kg), 0)),
      copPagado: Math.round(filas.filter((c) => c.pagada_at).reduce((a, c) => a + Number(c.total_cop), 0)),
      listing: listingByLot.get(id),
      partidas,
      pergaminoKg,
      verdeKg,
      tostadoKg,
      declaradas,
      enMezclasKg,
      declarable,
      sinRecibir,
      imagen: imagenByLot.get(id),
    };
  });
  const pergaminoTotal = n1(porLote.reduce((a, l) => a + l.pergaminoKg, 0));
  const verdeTotal = n1(porLote.reduce((a, l) => a + l.verdeKg, 0));
  const publicados = porLote.filter((l) => l.listing?.status === "published" || l.listing?.status === "sold_out").length;
  const vendidoVerde = n1(porLote.reduce((a, l) => a + Number(l.listing?.sold_kg ?? 0), 0));

  const kpis = [
    { k: "Lotes de CTCx Selection", v: String(resumen.lotes), sub: `${resumen.compras} compra${resumen.compras === 1 ? "" : "s"} · ${fmtKg(resumen.kgComprados)} kg de CPS` },
    { k: "Pergamino libre (kg de CPS)", v: `${fmtKg(pergaminoTotal)} kg`, sub: "en el Stock CTCx, sin declarar ni reservar" },
    { k: "Verde libre (kg de verde)", v: `${fmtKg(verdeTotal)} kg`, sub: "ya trillado, sin declarar ni reservar" },
    { k: "En el Catálogo Activo", v: String(publicados), sub: `listado${publicados === 1 ? "" : "s"} · ${fmtKg(vendidoVerde)} kg de verde vendidos` },
    { k: "Pagado a productores", v: formatCop(resumen.copPagado), sub: "compras de Selection pagadas" },
  ];

  return (
    <div>
      <CircuitoDelStock actual="selection" stock={stock} />
      <h1 className={styles.title}>Oferta desde CTCx Selection</h1>
      <p className={styles.subtitle}>
        Lo que CTCx <b>compró en firme como CTCx Selection</b> —registrado en <Link href="/ocp/compras">Adquisición de Stock Café</Link>— y dónde está
        hoy: sus partidas en el <Link href={STOCK_PATH}>Stock CTCx</Link> y lo declarado en el <Link href={TRIAGE_PATH}>Triage de Catálogo Activo</Link>, con su
        FOB mínimo, en los mismos términos que cualquier productor. En la vitrina, todo el lote sale con el rótulo y la imagen de CTCx Selection en vez
        de las fotos del lote (ningún lote enseña la finca); el registro (pasaporte, ficha, rastro EUDR) conserva la finca real.
      </p>
      <p className={styles.meta} style={{ marginBottom: 18 }}>
        La negociación de CTCx Selection ya no vive aquí: es una oferta <b>directa</b> (PVC − 8 %, 30 días, mínimo y máximo) que sale de{" "}
        <Link href="/ocp/ofertas">Pendiente Oferta</Link>; al pagar el mes de ese contrato, la compra aparece sola en Adquisición y aquí.
      </p>

      {errorCompras && (
        // H8: sin las compras no hay nada cierto que contar: la alerta, y ni indicadores ni «0 compras».
        <p className={styles.warn} role="alert" style={{ fontSize: 14 }}>
          No se pudieron leer las compras ({errorCompras.message}). Esta página no enseña cifras mientras tanto: serían falsas. Si acaba de desplegarse una
          versión nueva, puede faltar aplicar su migración.
        </p>
      )}
      {!errorCompras && (
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
      )}

      {!errorCompras && (
      <section style={{ marginTop: 30 }}>
        <div className={styles.sectionHead}>
          <h2>Lotes de CTCx Selection y su stock ({porLote.length})</h2>
        </div>
        {porLote.length === 0 ? (
          <p className={styles.empty}>
            0 compras de CTCx Selection.{" "}
            {soloStock > 0 ? (
              <>
                Hay {soloStock} compra{soloStock === 1 ? "" : "s"} <b>{DESTINO_LABEL.stock.toLowerCase()}</b> (sacos de tratos, café para kits): están en{" "}
                <Link href="/ocp/compras">Adquisición de Stock Café →</Link>, donde una compra a mano puede pasar a CTCx Selection.
              </>
            ) : (
              <>
                Nacen solas al pagar el mes de un contrato directa (o Black), o se registran a mano en <Link href="/ocp/compras">Adquisición de Stock Café →</Link>.
              </>
            )}
          </p>
        ) : (
          <div className={styles.list}>
            {porLote.map((l) => (
              <div key={l.id} className={styles.card} style={{ flexDirection: "column", alignItems: "stretch" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <div>
                    <h3>
                      <Link href={`/ocp/kr?lote=${l.id}`}>{l.lot?.name ?? "—"}</Link> {l.lot?.public_code && <code style={{ fontWeight: 400, marginLeft: 6 }}>{l.lot.public_code}</code>}
                    </h3>
                    <p className={styles.meta}>
                      {producers.get(l.lot?.producer_id ?? "")?.fullName ?? "Productor"} · {uno(l.lot?.fincas)?.name ?? "—"}{" "}
                      <span title="El registro conserva la finca real; la vitrina enseña el rótulo y la imagen de CTCx Selection (ningún lote enseña la finca)">(registro)</span>
                    </p>
                  </div>
                  <span className={styles.badge}>{GRADO_POR_ID[l.grado as keyof typeof GRADO_POR_ID]?.nombre ?? l.grado}</span>
                </div>
                <p className={styles.meta} style={{ margin: "8px 0 0" }}>
                  Comprado: <b>{fmtKg(l.compradoKg)} kg de CPS</b> en {l.filas.length} compra{l.filas.length === 1 ? "" : "s"} · pagado <b>{formatCop(l.copPagado)}</b> · última el{" "}
                  {fechaCorta(l.filas[0].pagada_at ?? l.filas[0].recibida_at)}
                  {l.sinRecibir > 0 && (
                    <>
                      {" "}· {l.sinRecibir} sin entrar al stock (<Link href="/ocp/compras?vista=por-recibir">entrar al stock →</Link>)
                    </>
                  )}
                </p>
                <p className={styles.meta} style={{ margin: "4px 0 0" }}>
                  Libre en el Stock CTCx: <b>{fmtKg(l.pergaminoKg)} kg de pergamino (CPS)</b> · <b>{fmtKg(l.verdeKg)} kg de verde</b>
                  {l.tostadoKg > 0 && <> · {fmtKg(l.tostadoKg)} kg tostado (no se declara)</>}
                  {l.enMezclasKg > 0 && <> · en mezclas {fmtKg(l.enMezclasKg)} kg de CPS</>}
                </p>
                {l.partidas.length > 0 && (
                  <p className={styles.meta} style={{ margin: "4px 0 0" }}>
                    Partidas:{" "}
                    {l.partidas.map((p, i) => (
                      <span key={p.id}>
                        {i ? " · " : ""}
                        <Link href={`${STOCK_PATH}?partida=${p.id}`}>
                          <code>{p.codigo}</code>
                        </Link>{" "}
                        {ESTADO_INFO[p.estado].nombre.toLowerCase()} {fmtKg(p.disponibleKg)} kg libres{p.declaradoKg > 0 ? ` (${fmtKg(p.declaradoKg)} declarados)` : ""}
                      </span>
                    ))}
                  </p>
                )}
                <p className={styles.meta} style={{ margin: "4px 0 0" }}>
                  Catálogo Activo:{" "}
                  {l.listing ? (
                    <>
                      <span className={l.listing.status === "published" ? styles.badgeGood : styles.badge}>{STATUS_LISTADO[l.listing.status] ?? l.listing.status}</span> · {fmtKg(n1(l.listing.sold_kg))} de{" "}
                      {fmtKg(n1(l.listing.total_kg))} kg de verde vendidos{l.listing.price_per_kg != null && <> · US$ {Number(l.listing.price_per_kg)}/kg</>} · <Link href="/ocp/catalogo">ver en el Catálogo</Link>
                    </>
                  ) : (
                    "sin publicar"
                  )}
                  {l.declaradas.length > 0 && <> · declarado: {l.declaradas.map((d) => d.codigo).join(", ")}</>}
                  {l.declarable && (
                    <>
                      {" "}· <Link href={rutaDelTriage({ partida: l.declarable.id, declarar: true })}>Declarar en el Triage →</Link> ({l.declarable.codigo}, {fmtKg(l.declarable.disponibleKg)} kg de {l.declarable.contenido})
                    </>
                  )}
                </p>
                <div style={{ marginTop: 10 }}>
                  <ImagenCtcxUploader destino={{ tipo: "lote", lotId: l.id }} imagenUrl={urlDeImagenCtcx(l.imagen?.imagen_path)} alt={l.imagen?.imagen_alt} etiqueta="Imagen de este lote en la vitrina (opcional)" />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      )}

      <section style={{ marginTop: 34 }}>
        <div className={styles.sectionHead}>
          <h2>El perfil de CTCx Selection (uno para toda la casa)</h2>
        </div>
        <div className={styles.card} style={{ flexDirection: "column", alignItems: "stretch" }}>
          <p className={styles.meta}>
            Es lo que el comprador ve en la tarjeta, la cinta y la ficha pública de todo lote comprado en firme como CTCx Selection: el rótulo y la
            imagen de CTCx en lugar de las fotos del lote (desde la V5.202 ningún lote enseña la finca; el nombre del lote es generado). Un solo
            perfil; la imagen de cada lote se adjunta arriba, en su tarjeta.
          </p>
          <ActionForm action={guardarPerfilCtcx} submitLabel="Guardar perfil" pendingLabel="Guardando…" buttonClassName="btn btn-sm btn-solid" style={{ display: "grid", gap: 8, marginTop: 8 }} successMessage="Perfil guardado.">
            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label htmlFor="ctcx-nombre">Nombre (el rótulo de CTCx en la vitrina)</label>
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
    </div>
  );
}
