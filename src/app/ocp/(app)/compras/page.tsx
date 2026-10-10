import type { Metadata } from "next";
import Link from "next/link";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/panel/ActionForm";
import { formatCop } from "@/lib/arena/inscriptions";
import { GRADO_POR_ID } from "@/lib/grados/definicion";
import { resumenDeCompras } from "@/lib/compras/reglas";
import { DESTINO_LABEL } from "@/lib/compras/selection";
import { estadoDelDespacho, fechaCorta } from "@/lib/compras/adquisicion";
import { cargarAdquisicion, type CompraDeAdquisicion, type DespachoPorRecibir } from "@/lib/compras/adquisicionServidor";
import { STOCK_PATH, fmtKg } from "@/lib/stock/linaje";
import { TRIAGE_PATH } from "@/lib/triage/fobMinimo";
import { hoyEnColombia } from "@/lib/pvc/servicio";
import { anularCompra, destinarCompra, ubicarCompra } from "../comprasActions";
import { entrarCompraAlStock } from "../stockActions";
import { CircuitoDelStock } from "../CircuitoDelStock";
import { CompraManualForm, type TratoParaAviso } from "./CompraManualForm";
import styles from "@/components/panel/shared.module.css";
import s from "./compras.module.css";

export const metadata: Metadata = { title: "Adquisición de Stock Café · OCP", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// ── OCP · Manejo de Stock Físico · Adquisición de Stock Café (V5.85 · rehecha en la V5.203) ──────────────────────────────────────
// El registro de cada compra EN FIRME de CTCx: qué café, a quién, cuántos kilos, a qué precio (con su edición del PVC), cuándo se pagó,
// cuándo llegó, dónde está y si es de CTCx Selection o solo stock. Una compra nace al pagar el mes de un contrato directa o Black, al
// recibir el saco o el adelanto de un trato por ventana, o a mano. Lo que llega entra al Stock CTCx (V5.195) y desde allí se declara en el
// Triage de Catálogo Activo (V5.196). La pantalla habla en kg de CPS: la conversión a verde la hace el Triage (decisión 5).
//
// V5.203 (owner, 2026-10-10): «CTCx Compras no parece estar funcionando bien; revísalo y mejora el UI/UX con la nueva información que
// tienes donde sea pertinente (también en relación a su interacción con el Triage de Catálogo Activo y la Oferta de CTCx Selection)».
// La página se caía desde la primera compra (B1: el embed `stock_partidas` es uno a uno; lo normaliza `cargarAdquisicion`). Ahora:
// la franja del circuito arriba; dos pestañas —«Por recibir» (los sacos y adelantos pendientes de los tratos por ventana y las compras
// sin entrar al stock) y «Compras» (el registro)— más Mezclas; una tabla de ocho columnas con el origen legible, «Es de» con sus reglas
// (B5), el stock REAL de la compra y su SIGUIENTE PASO (entrar al stock → declarar en el Triage → en el catálogo); anular con motivo
// (B9); y el alta a mano plegada, sin destino por defecto, con el aviso de un trato vivo y el formulario que se vacía al registrar.
//
// V5.203 · corrección (nodo final, 2026-10-10 · revisión de textos y privacidad):
//   · decisión 2 / H7 — quitar o poner la marca Selection a un lote que YA sale en la vitrina (cambiar «Es de», anular, el alta) pide
//     CONFIRMAR (`confirma_vitrina`) con el texto de lo que cambia; si otra compra ya decide la vitrina, se dice que no cambia (H6);
//   · H3 las fechas `date` en UTC (`fechaCorta`); H4 el estado de un saco sin prometer un 60 % que no se pagó; H8 si una lectura falla,
//     solo la alerta (sin indicadores ni tablas vacías que mientan); H10 lo libre en kg de CPS equivalentes; H15 la fila que se pide por
//     `?compra=` se resalta desde el servidor (y abre «Anuladas» si lo es), «Registrada» es la fecha del registro y «Anuladas» tiene
//     su cabecera.

type Vista = "por-recibir" | "compras";

const gradoNombre = (g: string | null) => GRADO_POR_ID[(g ?? "") as keyof typeof GRADO_POR_ID]?.nombre ?? g ?? "—";
const kg1 = (n: number) => fmtKg(Math.round(n * 10) / 10);
const esUuid = (v: string | undefined) => (v && /^[0-9a-f-]{36}$/i.test(v) ? v : null);

export default async function AdquisicionPage({ searchParams }: { searchParams: Promise<{ vista?: string; compra?: string }> }) {
  const { vista: v, compra: compraPedida } = await searchParams;
  const vista: Vista = v === "por-recibir" ? "por-recibir" : "compras";
  const elegida = esUuid(compraPedida);
  const service = createServiceRoleClient();
  const a = await cargarAdquisicion(service);
  const hoy = hoyEnColombia();
  const sinRecibir = a.compras.filter((c) => !c.raiz);
  const sacos = a.porRecibir.filter((d) => d.tipo !== "vendido");
  const vendidos = a.porRecibir.filter((d) => d.tipo === "vendido");
  const resumen = resumenDeCompras(a.compras.map((c) => ({ lotId: c.lotId, grado: c.grado, kg: c.kg, totalCop: c.totalCop, recibidaAt: c.recibidaAt, pagadaAt: c.pagadaAt })));
  const selectionKg = a.compras.filter((c) => c.destino === "selection").reduce((x, c) => x + c.kg, 0);
  const porDeclarar = a.compras.filter((c) => c.pasos.some((p) => p.tipo === "declarar")).length;
  const kpis = [
    { k: "Por recibir", v: `${kg1(sacos.reduce((x, d) => x + d.kg, 0) + sinRecibir.reduce((x, c) => x + c.kg, 0))} kg`, sub: `${sacos.length} saco${sacos.length === 1 ? "" : "s"} de trato · ${sinRecibir.length} compra${sinRecibir.length === 1 ? "" : "s"} sin entrar` },
    { k: "Compras", v: String(resumen.compras), sub: `${kg1(resumen.kgComprados)} kg de CPS · ${resumen.lotes} lote${resumen.lotes === 1 ? "" : "s"}` },
    { k: "CTCx Selection", v: `${kg1(selectionKg)} kg`, sub: `solo stock: ${kg1(resumen.kgComprados - selectionKg)} kg` },
    // H10: en kg de CPS EQUIVALENTES (lo trillado o tostado se cuenta por lo que fue en pergamino).
    { k: "Libre en el stock", v: `≈ ${kg1(a.compras.reduce((x, c) => x + c.disponibleKg, 0))} kg`, sub: `de CPS equivalentes · ${porDeclarar ? `${porDeclarar} compra${porDeclarar === 1 ? "" : "s"} por declarar en el Triage` : "nada por declarar"}` },
    { k: "Pagado", v: formatCop(resumen.copPagado), sub: "compras con pago registrado" },
  ];
  const lotesParaComprar = a.galardonados.map((l) => ({ id: l.id, etiqueta: `${l.name} · ${l.fincaName ?? "—"} · ${gradoNombre(l.grade)}` }));
  const tratos: Record<string, TratoParaAviso> = Object.fromEntries(Object.entries(a.tratosVivos).map(([lotId, t]) => [lotId, { contractId: t.contractId, precioTexto: formatCop(t.precioCopKg), pvcCode: t.pvcCode }]));

  return (
    <div>
      <CircuitoDelStock actual="compras" stock={a.stock} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <h1 className={styles.title}>Adquisición de Stock Café</h1>
        <span style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          <Link href={STOCK_PATH} className={styles.backLink}>
            Stock CTCx →
          </Link>
          <Link href={TRIAGE_PATH} className={styles.backLink}>
            Triage de Catálogo Activo →
          </Link>
        </span>
      </div>
      <p className={styles.subtitle}>
        Lo que CTCx compra en firme y por qué camino: al <b>pagar el mes</b> de un contrato directa o Black, al <b>recibir el saco o el adelanto</b>{" "}
        de un trato por ventana, o <b>a mano</b>. Cada compra es de <b>{DESTINO_LABEL.selection}</b> (en la vitrina el lote sale con el rótulo y la
        imagen de CTCx, no con sus fotos) o <b>{DESTINO_LABEL.stock.toLowerCase()}</b>. Lo que llega entra al <Link href={STOCK_PATH}>Stock CTCx</Link> en
        pergamino y desde allí se declara en el <Link href={TRIAGE_PATH}>Triage de Catálogo Activo</Link>; el perfil y las imágenes de Selection viven en{" "}
        <Link href="/ocp/ctc-selection">Oferta desde CTCx Selection</Link>. Todo en kg de CPS (pergamino seco). Tyrian no se compra: va a subasta.
      </p>

      <nav className={s.tabs} aria-label="Adquisición de Stock Café">
        <Link href="/ocp/compras?vista=por-recibir" className={`${s.tab} ${vista === "por-recibir" ? s.tabActiva : ""}`} aria-current={vista === "por-recibir" ? "page" : undefined}>
          Por recibir{a.errorDeLectura ? "" : ` (${sacos.length + sinRecibir.length})`}
        </Link>
        <Link href="/ocp/compras" className={`${s.tab} ${vista === "compras" ? s.tabActiva : ""}`} aria-current={vista === "compras" ? "page" : undefined}>
          Compras{a.errorDeLectura ? "" : ` (${a.compras.length})`}
        </Link>
        <Link href="/ocp/compras/mezclas" className={`${s.tab} ${s.tabLink}`}>
          Mezclas →
        </Link>
      </nav>

      {a.errorDeLectura ? (
        // H8: con una lectura caída no se pintan indicadores en cero ni «no hay compras»: solo lo que pasó.
        <p className={s.aviso} role="alert">
          No se pudieron leer {a.errorDeLectura}. Esta pantalla no enseña cifras ni tablas mientras tanto: serían falsas. Si acaba de desplegarse una
          versión nueva, puede faltar aplicar su migración; si no, recargue en un momento.
        </p>
      ) : (
        <>
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

          {vista === "por-recibir" ? (
            <PorRecibir sacos={sacos} vendidos={vendidos.length} sinRecibir={sinRecibir} hoy={hoy} />
          ) : (
            <>
              <details className={s.registrar}>
                <summary className="btn btn-sm btn-solid">Registrar una compra a mano</summary>
                <CompraManualForm lotes={lotesParaComprar} tratos={tratos} vitrina={a.vitrinaDeLotes} hoy={hoy} />
              </details>
              <TablaDeCompras compras={a.compras} lotesConTrato={new Set(Object.keys(a.tratosVivos))} elegida={elegida} />
              {a.anuladas.length > 0 && (
                <details style={{ marginTop: 16 }} open={a.anuladas.some((c) => c.id === elegida)}>
                  <summary className={styles.meta} style={{ cursor: "pointer" }}>
                    Anuladas ({a.anuladas.length})
                  </summary>
                  <div className={s.desplazable} style={{ marginTop: 8 }}>
                    <table className={s.tabla}>
                      <thead>
                        <tr>
                          <th>Fecha</th>
                          <th>Lote</th>
                          <th>Grado</th>
                          <th className={s.num}>kg CPS · total</th>
                          <th>Origen</th>
                          <th>Anulada</th>
                        </tr>
                      </thead>
                      <tbody>
                        {a.anuladas.map((c) => (
                          <tr key={c.id} id={`compra-${c.id}`} className={`${s.tachada} ${c.id === elegida ? s.filaElegida : ""}`}>
                            <td>{fechaCorta(c.fecha)}</td>
                            <td>{c.lotName}</td>
                            <td>{gradoNombre(c.grado)}</td>
                            <td className={s.num}>
                              {kg1(c.kg)} kg · {formatCop(c.totalCop)}
                            </td>
                            <td>{c.origen}</td>
                            <td>
                              el {fechaCorta(c.anuladaAt)}
                              <span className={s.sub}>{c.anuladaMotivo}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

// ── Por recibir ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function PorRecibir({ sacos, vendidos, sinRecibir, hoy }: { sacos: DespachoPorRecibir[]; vendidos: number; sinRecibir: CompraDeAdquisicion[]; hoy: string }) {
  return (
    <>
      <section style={{ marginTop: 24 }}>
        <div className={styles.sectionHead}>
          <h2>Sacos y adelantos de los tratos por ventana ({sacos.length})</h2>
        </div>
        <p className={styles.meta} style={{ marginBottom: 10 }}>
          Lo que CTCx ya compró a un productor con trato por ventana y aún no llega. Se confirma (60 %) y se recibe (40 %) en su contrato: al
          recibirlo nace la compra —solo stock— y su partida en el Stock CTCx.
          {vendidos > 0 && ` Además hay ${vendidos} despacho${vendidos === 1 ? "" : "s"} de lo vendido en Cherry Picked: no son compras de CTCx (entran al stock comprometidos).`}
        </p>
        {sacos.length === 0 ? (
          <p className={s.vacio}>No hay sacos ni adelantos pendientes.</p>
        ) : (
          <div className={s.desplazable}>
            <table className={s.tabla}>
              <thead>
                <tr>
                  <th>Plazo</th>
                  <th>Lote · productor</th>
                  <th>Qué</th>
                  <th className={s.num}>kg CPS</th>
                  <th className={s.num}>Total</th>
                  <th>Estado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {sacos.map((d) => {
                  const vence = d.prorrogaHasta ?? d.plazo;
                  return (
                    <tr key={d.id}>
                      <td>
                        {/* H3: `plazo` y `prorroga_hasta` son `date`: se leen en UTC (en Bogotá salían un día antes). */}
                        <span className={vence && vence < hoy ? s.vencido : undefined}>{fechaCorta(vence)}</span>
                        {d.prorrogaHasta && <span className={s.sub}>con prórroga</span>}
                        {vence && vence < hoy && <span className={s.sub}>vencido</span>}
                      </td>
                      <td>
                        <Link href={`/ocp/kr?lote=${d.lotId}`}>{d.lotName}</Link>
                        <span className={s.sub}>{d.producerName}</span>
                      </td>
                      <td>{d.tipo === "adelanto" ? "Adelanto" : "Saco"}</td>
                      <td className={s.num}>{kg1(d.kg)}</td>
                      <td className={s.num}>
                        {formatCop(d.totalCop)}
                        <span className={s.sub}>{formatCop(d.copKg)}/kg</span>
                      </td>
                      <td>{estadoDelDespacho({ estado: d.estado, pago60: d.pago60 })}</td>
                      <td>
                        <Link href={`/ocp/contratos/${d.contractId}`}>Ver el contrato →</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section style={{ marginTop: 28 }}>
        <div className={styles.sectionHead}>
          <h2>Compras registradas que no han entrado al stock ({sinRecibir.length})</h2>
        </div>
        <p className={styles.meta} style={{ marginBottom: 10 }}>
          Se registraron antes de llegar. Cuando el café esté en CTCx, «Entrar al stock» crea su partida de pergamino (con la ubicación de la compra).
        </p>
        {sinRecibir.length === 0 ? (
          <p className={s.vacio}>Todas las compras vivas están en el Stock CTCx.</p>
        ) : (
          <div className={s.desplazable}>
            <table className={s.tabla}>
              <thead>
                <tr>
                  <th>Registrada</th>
                  <th>Lote · productor</th>
                  <th className={s.num}>kg CPS</th>
                  <th>Es de</th>
                  <th>Dónde está</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {sinRecibir.map((c) => (
                  <tr key={c.id}>
                    <td>
                      {fechaCorta(c.registradaAt)}
                      {c.pagadaAt && <span className={s.sub}>pagada el {fechaCorta(c.pagadaAt)}</span>}
                    </td>
                    <td>
                      <Link href={`/ocp/kr?lote=${c.lotId}`}>{c.lotName}</Link>
                      <span className={s.sub}>{c.producerName}</span>
                    </td>
                    <td className={s.num}>{kg1(c.kg)}</td>
                    <td>{DESTINO_LABEL[c.destino]}</td>
                    <td>{c.ubicacion ?? "—"}</td>
                    <td>
                      <ActionForm action={entrarCompraAlStock.bind(null, c.id)} submitLabel="Entrar al stock" pendingLabel="…" buttonClassName="btn btn-sm btn-solid" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

// ── El registro ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function TablaDeCompras({ compras, lotesConTrato, elegida }: { compras: CompraDeAdquisicion[]; lotesConTrato: Set<string>; elegida: string | null }) {
  if (compras.length === 0) {
    return <p className={s.vacio}>Todavía no hay compras en firme registradas. Nacen solas al pagar el mes de un contrato directa o Black y al recibir el saco o el adelanto de un trato por ventana; o se registran a mano, arriba.</p>;
  }
  return (
    <div className={s.desplazable}>
      <table className={s.tabla}>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Lote · productor</th>
            <th>Grado</th>
            <th className={s.num}>kg CPS · COP/kg · total</th>
            <th>Origen</th>
            <th>Es de</th>
            <th>Stock CTCx</th>
            <th>Siguiente paso</th>
          </tr>
        </thead>
        <tbody>
          {compras.map((c) => {
            const otro = c.destino === "selection" ? "stock" : "selection";
            const noCambia = c.noDestinable[otro];
            return (
              <tr key={c.id} id={`compra-${c.id}`} className={`${s.fila} ${c.id === elegida ? s.filaElegida : ""}`}>
                <td>
                  {fechaCorta(c.fecha)}
                  {c.pagoRef && <span className={s.sub}>ref. {c.pagoRef}</span>}
                  {!c.pagadaAt && <span className={s.sub}>sin pago registrado</span>}
                </td>
                <td>
                  <Link href={`/ocp/kr?lote=${c.lotId}`}>{c.lotName}</Link>
                  <span className={s.sub}>
                    {c.producerName}
                    {c.fincaName ? ` · ${c.fincaName}` : ""}
                  </span>
                </td>
                <td>
                  <span className={styles.badge}>{gradoNombre(c.grado)}</span>
                </td>
                <td className={s.num}>
                  <b>{kg1(c.kg)} kg</b>
                  <span className={s.sub}>{formatCop(c.copKg)}/kg</span>
                  <span className={s.sub}>{formatCop(c.totalCop)}</span>
                </td>
                <td>
                  {c.contractId ? <Link href={`/ocp/contratos/${c.contractId}`}>{c.origen}</Link> : c.origen}
                  <span className={s.sub}>{c.precio}</span>
                  {c.nota && <span className={s.sub}>{c.nota}</span>}
                </td>
                <td>
                  <span className={`${s.chip} ${c.destino === "selection" ? s.chipSelection : s.chipStock}`}>{DESTINO_LABEL[c.destino]}</span>
                  <details className={s.plegable}>
                    <summary>cambiar</summary>
                    <div className={s.plegableCuerpo}>
                      {noCambia ? (
                        <p className={s.regla}>{noCambia}</p>
                      ) : (
                        <ActionForm action={destinarCompra.bind(null, c.id)} submitLabel={`Pasar a «${DESTINO_LABEL[otro]}»`} pendingLabel="…" buttonClassName="btn btn-sm">
                          <input type="hidden" name="destino" value={otro} />
                          {/* Decisión 2 (H6/H7): lo que cambia en la vitrina —con confirmación si cambia la cara de un lote que ya sale—,
                              que no cambia si otra compra ya decide, o lo que verá el comprador. */}
                          <p className={c.vitrinaAlCambiar.confirmar ? s.regla : s.vitrina} style={{ marginTop: 0 }}>
                            {c.vitrinaAlCambiar.texto}
                          </p>
                          {c.vitrinaAlCambiar.confirmar && (
                            <label className={s.confirma}>
                              <input type="checkbox" name="confirma_vitrina" value="1" required /> Lo sé: confirmo el cambio en la vitrina.
                            </label>
                          )}
                          {/* V5.203 (hueco H2): la marca va por LOTE — con un trato por ventana vivo, también su preventa saldría como CTCx. */}
                          {otro === "selection" && lotesConTrato.has(c.lotId) && (
                            <p className={s.regla}>Este lote tiene un trato por ventana vivo: en la vitrina TODO el lote —también la preventa del productor— saldría con el rótulo y la imagen de CTCx.</p>
                          )}
                        </ActionForm>
                      )}
                    </div>
                  </details>
                </td>
                <td>
                  {c.raiz ? (
                    <>
                      <Link href={`${STOCK_PATH}?partida=${c.raiz.id}`}>
                        <code>{c.raiz.codigo}</code>
                      </Link>
                      {c.raizPorDespacho && <span className={s.sub}>por su despacho (la partida nació sin la compra)</span>}
                      <span className={s.sub}>≈ {kg1(c.disponibleKg)} kg CPS libres</span>
                    </>
                  ) : (
                    <span className={s.sub} style={{ marginTop: 0 }}>sin recibir</span>
                  )}
                  <span className={s.sub}>{c.ubicacion ?? "sin ubicación"}</span>
                  <details className={s.plegable}>
                    <summary>ubicar</summary>
                    <div className={s.plegableCuerpo}>
                      <ActionForm action={ubicarCompra.bind(null, c.id)} submitLabel="Guardar" pendingLabel="…" buttonClassName="btn btn-sm">
                        <input name="ubicacion" defaultValue={c.ubicacion ?? ""} maxLength={200} placeholder="finca · Centro · bodega" aria-label="Ubicación" />
                        {c.raiz && <p className={s.vitrina} style={{ marginTop: 0 }}>También la de su partida {c.raiz.codigo}: una sola ubicación.</p>}
                      </ActionForm>
                    </div>
                  </details>
                </td>
                <td>
                  {c.pasos.map((p, i) =>
                    p.tipo === "entrar" ? (
                      <ActionForm key={i} action={entrarCompraAlStock.bind(null, c.id)} submitLabel="Entrar al stock" pendingLabel="…" buttonClassName="btn btn-sm btn-solid" />
                    ) : p.href ? (
                      <Link key={i} href={p.href} className={`${s.paso} ${p.tipo === "declarar" ? s.pasoDeclarar : p.tipo === "catalogo" ? s.pasoCatalogo : ""}`}>
                        {p.texto}
                      </Link>
                    ) : (
                      <span key={i} className={s.paso}>
                        {p.texto}
                      </span>
                    )
                  )}
                  {c.origenCrudo === "manual" && (
                    <details className={s.plegable}>
                      <summary>anular</summary>
                      <div className={s.plegableCuerpo}>
                        {c.noAnulable ? (
                          <p className={s.regla}>{c.noAnulable}</p>
                        ) : (
                          <ActionForm action={anularCompra.bind(null, c.id)} submitLabel="Anular la compra" pendingLabel="Anulando…" buttonClassName="btn btn-sm">
                            <input name="motivo" required minLength={3} maxLength={300} placeholder="Motivo (queda en el rastro)" aria-label="Motivo para anular la compra" />
                            <p className={s.vitrina} style={{ marginTop: 0 }}>
                              La fila no se borra: queda tachada en «Anuladas»{c.raiz ? `, y su partida ${c.raiz.codigo} se anula con ella` : ""}. El productor recibe una nota de que el registro quedó sin efecto.
                            </p>
                            {/* Decisión 2: anular la última compra Selection de un lote que sigue en la vitrina le cambia la cara. */}
                            {c.vitrinaAlAnular && (
                              <>
                                <p className={s.regla}>{c.vitrinaAlAnular}</p>
                                <label className={s.confirma}>
                                  <input type="checkbox" name="confirma_vitrina" value="1" required /> Lo sé: confirmo el cambio en la vitrina.
                                </label>
                              </>
                            )}
                          </ActionForm>
                        )}
                      </div>
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
}
