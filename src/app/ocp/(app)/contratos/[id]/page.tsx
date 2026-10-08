import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireConsoleAccess } from "@/lib/panel/requireConsoleAccess";
import {
  declararRuptura,
  descongelarCuenta,
  markReconditioning,
  ofrecerRenovacion,
  pedirDelMes,
  recordHumidityReading,
  registrarEnvioDelMes,
  registrarPagoDelMes,
  resolveReconditioning,
  signContract,
} from "../../contractActions";
import { ActionForm } from "@/components/panel/ActionForm";
import { formatCop } from "@/lib/arena/inscriptions";
import { ESTADO_DE_CONTRATO } from "@/lib/ocp/etapas";
import { MORA, PENALIDAD_RETIRO_PCT, RENOVACION_DIAS } from "@/lib/trato/terminos";
import { MORA_LABEL, mesesDelTrato, moraDelMes, resumenDelTrato, type FilaDelMes } from "@/lib/trato/mesAMes";
import { MAX_RECORDATORIOS_MORA } from "@/lib/trato/mora";
import styles from "@/components/panel/shared.module.css";
import { MODALIDAD_LABEL, fechaLarga, type Modalidad } from "@/lib/trato/modalidades";
import { cuentaDeVentana } from "@/lib/trato/cuenta";
import { cobrarFaltante, confirmarDespacho, confirmarVentaSemanal, prepararRenovacion, prorrogarLoVendido, recibirDespacho } from "../../ventanaActions";
import { hoyEnColombia } from "@/lib/pvc/servicio";
import { documentoDelFirmante, esTipoDeDocumento } from "@/lib/trato/documento";

// ── El contrato, mes a mes (V5.84 · fase 7 del PLAN_CIRCUITO_DEL_LOTE) ──────────────────────
// Folio 8, pasos 16–18. Nació lleno de la aceptación con declaración (fase 6); CTCx lo FIRMA y desde ahí lo lleva
// mes a mes: PIDE la cantidad del mes, registra el ENVÍO (que se espeja en `contract_releases` para el stock del
// catálogo), registra el PAGO (primera semana del mes siguiente) y ve los RETIROS del productor. La mora y la
// ruptura potencial se DERIVAN y se pintan (decisión 6: nunca automática); la ruptura la declara el OWNER a mano y
// congela la cuenta; a los 90 días de la firma, «Ofrecer renovación» emite la oferta nueva al PVC vigente.

export const dynamic = "force-dynamic";

const GRADE_LABEL: Record<string, string> = { black: "Black", red: "Red", blue: "Blue", gold: "Gold", tyrian: "Tyrian" };

type MesRow = {
  mes: number;
  pedido_kg: number | string | null;
  pedido_at: string | null;
  enviado_kg: number | string | null;
  enviado_at: string | null;
  pagado_cop: number | string | null;
  pagado_at: string | null;
  pago_ref: string | null;
  retirado_kg: number | string;
  retirado_libre_kg: number | string;
  retirado_penalizado_kg: number | string;
  penalidad_cop: number | string;
  retiro_nota: string | null;
  /** V5.86: los recordatorios de mora que el cron semanal ya mandó por este mes (tope MAX_RECORDATORIOS_MORA). */
  recordatorios_mora?: number | null;
  ultimo_recordatorio_mora_at?: string | null;
};

const fecha = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString("es-CO") : "—");

export default async function BcpContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const identity = await requireConsoleAccess("ocp");
  const service = createServiceRoleClient();

  const { data: contract } = await service
    .from("purchase_contracts")
    .select(
      "id, status, grade_snapshot, signed_at, reference_price_source, reference_price_snapshot, price_per_kg_locked, quantity_frozen_kg, terms_version, declaracion, compra_inicial_kg, modificador_pct, freeze_months, ruptura_at, ruptura_motivo, renovado_at, lugar_entrega, producer_signed_at, producer_signer_name, producer_signer_doc_tipo, producer_signer_doc_numero, producer_signature_path, provisional_at, provisional_responsable, provisional_por, ratificado_at, producer_signature_meta, contract_text_version, contract_text_sha256, vigencia_hasta, redeclarar_min_kg, redeclarar_at, redeclarado_at, redeclarado_kg, redeclaracion_origen, redeclarar_aviso_at, lots(name, producer_id, fincas(name)), ventana_tipo, ventana_ciclos, precio_regla, saco_kg, minimo_kg, sin_retiro, vigencia_desde, retiro_libre_pct"
    )
    .eq("id", id)
    .single();
  if (!contract) notFound();
  // V5.168: la firma del productor vive en Storage privado; se lee con una URL firmada de corta vida.
  const rutaFirma = (contract as { producer_signature_path?: string | null }).producer_signature_path ?? null;
  const firmaProductorUrl = rutaFirma ? ((await service.storage.from("kaffetal-media").createSignedUrl(rutaFirma, 600)).data?.signedUrl ?? null) : null;

  const lot = contract.lots as unknown as { name: string; producer_id: string; fincas: { name: string } | null } | null;

  const [{ data: mesesRaw }, { data: readings }, { data: perfil }] = await Promise.all([
    service.from("contract_months").select("*").eq("contract_id", id).order("mes"),
    service.from("humidity_readings").select("*").eq("contract_id", id).order("reading_month"),
    lot ? service.from("producer_profiles").select("estado_cuenta, estado_cuenta_motivo").eq("profile_id", lot.producer_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const meses = ((mesesRaw as MesRow[] | null) ?? []).map<FilaDelMes>((m) => ({
    mes: m.mes,
    pedidoKg: m.pedido_kg != null ? Number(m.pedido_kg) : null,
    pedidoAt: m.pedido_at,
    enviadoKg: m.enviado_kg != null ? Number(m.enviado_kg) : null,
    enviadoAt: m.enviado_at,
    pagadoCop: m.pagado_cop != null ? Number(m.pagado_cop) : null,
    pagadoAt: m.pagado_at,
    retiradoKg: Number(m.retirado_kg ?? 0),
    retiradoLibreKg: Number(m.retirado_libre_kg ?? 0),
    retiradoPenalizadoKg: Number(m.retirado_penalizado_kg ?? 0),
    penalidadCop: Number(m.penalidad_cop ?? 0),
  }));
  const notasDeRetiro = new Map(((mesesRaw as MesRow[] | null) ?? []).map((m) => [m.mes, m.retiro_nota]));
  const refsDePago = new Map(((mesesRaw as MesRow[] | null) ?? []).map((m) => [m.mes, m.pago_ref]));
  const recordatoriosDe = new Map(((mesesRaw as MesRow[] | null) ?? []).map((m) => [m.mes, m.recordatorios_mora ?? 0]));
  const hoy = new Date();
  const nMeses = mesesDelTrato(contract.freeze_months);
  const resumen = resumenDelTrato({ quantityFrozenKg: contract.quantity_frozen_kg != null ? Number(contract.quantity_frozen_kg) : null, freezeMonths: nMeses, signedAt: contract.signed_at, vigenciaHasta: contract.vigencia_hasta ?? null }, meses, hoy);
  const vigente = contract.status === "active";
  const cuentaCongelada = perfil?.estado_cuenta === "congelada";
  // V5.175 (docs/PLAN_CICLOS.md): un contrato por VENTANA no se lleva mes a mes — su ventana, sus ventas semanales, sus retiros y
  // sus despachos (saco · adelanto · vendido). Las operaciones de CTCx sobre ellos llegan en la tanda 3.
  const porVentana = Boolean((contract as { ventana_tipo?: string | null }).ventana_tipo);
  const cv = contract as unknown as { ventana_tipo: string | null; ventana_ciclos: string[] | null; saco_kg: number | string | null; minimo_kg: number | string | null; sin_retiro: boolean | null; vigencia_desde: string | null; vigencia_hasta: string | null; retiro_libre_pct: number | string | null };
  const [{ data: despachosRaw }, { data: ventasRaw }, { data: retirosRaw }] = porVentana
    ? await Promise.all([
        service.from("contract_despachos").select("*").eq("contract_id", id).order("plazo"),
        service.from("contract_ventas").select("*").eq("contract_id", id).order("semana"),
        service.from("contract_retiros").select("*").eq("contract_id", id).order("created_at"),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];
  const despachos = (despachosRaw as Record<string, unknown>[] | null) ?? [];
  const ventas = (ventasRaw as Record<string, unknown>[] | null) ?? [];
  const ventasVigentes = ventas.filter((v) => !v.anulada_at);
  const retiros = (retirosRaw as Record<string, unknown>[] | null) ?? [];
  const cuenta = porVentana
    ? cuentaDeVentana({
        declaradoKg: Number(contract.quantity_frozen_kg ?? 0),
        retiroLibrePct: cv.retiro_libre_pct != null ? Number(cv.retiro_libre_pct) : null,
        sinRetiro: Boolean(cv.sin_retiro),
        ventas: ventasVigentes.map((v) => ({ kg: Number(v.kg) })),
        retiros: retiros.map((r) => ({ kg: Number(r.kg), libreKg: Number(r.libre_kg) })),
      })
    : null;

  return (
    <div>
      <Link href="/ocp/contratos" className={styles.backLink}>
        ← Contratos
      </Link>
      <h1 className={styles.title}>
        {lot?.name} <span className={styles.badge}>{ESTADO_DE_CONTRATO[contract.status] ?? contract.status}</span>
      </h1>
      <p className={styles.subtitle}>
        {lot?.fincas?.name} {contract.grade_snapshot && `· grado ${GRADE_LABEL[contract.grade_snapshot] ?? contract.grade_snapshot}`}
        {cuentaCongelada && <> · <span className={styles.badgeBad}>cuenta del productor congelada</span></>}
      </p>

      {/* V5.190 (owner): aceptado PROVISIONALMENTE por CTCx en una sesión asistida — vigente, pendiente de la ratificación del productor. */}
      {contract.provisional_at && (
        <div className={styles.card} style={{ marginBottom: 14, borderLeft: "4px solid #E8A317", background: "#FFF8E8" }}>
          <p className={styles.meta} style={{ margin: 0, color: "#3A2C00" }}>
            <b>Contrato provisional</b> · aceptado por CTCx el {fecha(contract.provisional_at)} en una sesión asistida, en favor del productor (grupo de Pioneros) ·
            responsable: <b>{contract.provisional_responsable}</b> · operador de consola <span className="mono">{String(contract.provisional_por ?? "").slice(0, 8)}</span> ·{" "}
            {contract.ratificado_at ? <>el productor lo <b>ratificó</b> el {fecha(contract.ratificado_at)}</> : <b>pendiente de la ratificación del productor</b>}
            {!contract.ratificado_at && (
              <>
                <br />
                Vigente desde la aceptación. El productor lo ratifica y firma desde su cuenta («Contratos y Compras»), donde puede ajustar la cantidad declarada.
              </>
            )}
          </p>
        </div>
      )}

      {/* V5.168 · la firma del PRODUCTOR (con el dedo, al aceptar la oferta): su trazo, nombre, fecha y la huella del texto. */}
      {contract.producer_signed_at ? (
        <div className={styles.card} style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", marginBottom: 14 }}>
          {firmaProductorUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- la firma, URL firmada de Storage privado
            <img src={firmaProductorUrl} alt={`Firma de ${contract.producer_signer_name ?? "el productor"}`} style={{ height: 64, width: "auto", background: "#fff", border: "1px solid var(--line)", borderRadius: 6 }} />
          )}
          <p className={styles.meta} style={{ margin: 0 }}>
            Firmado por el productor: <b>{contract.producer_signer_name}</b>
            {/* V5.188: el documento con que se identificó al firmar (va en el texto firmado y en su huella). */}
            {contract.producer_signer_doc_numero && esTipoDeDocumento(contract.producer_signer_doc_tipo) && (
              <> · {documentoDelFirmante(contract.producer_signer_doc_tipo, contract.producer_signer_doc_numero)}</>
            )}{" "}
            · {fecha(contract.producer_signed_at)}
            {contract.lugar_entrega && <> · entrega: {contract.lugar_entrega}</>}
            <br />
            Texto {contract.contract_text_version ?? "—"} · SHA-256 <span className="mono">{String(contract.contract_text_sha256 ?? "").slice(0, 16)}…</span>
            {(contract.producer_signature_meta as { ip?: string | null } | null)?.ip && <> · IP {(contract.producer_signature_meta as { ip?: string | null }).ip}</>}
            {/* V5.190: si la firma se trazó dentro de una sesión asistida de CTCx (el productor presente), queda dicho. */}
            {Boolean((contract.producer_signature_meta as { sesion_asistida?: unknown } | null)?.sesion_asistida) && <> · <b>firmada en una sesión asistida de CTCx</b></>}
          </p>
        </div>
      ) : contract.provisional_at ? null : (
        <p className={styles.meta}>Contrato anterior a la firma digital del productor (V5.168).</p>
      )}

      {contract.status === "pending_signature" ? (
        <ActionForm
          action={signContract.bind(null, id)}
          submitLabel="Firmar contrato"
          pendingLabel="Firmando…"
          buttonClassName="btn btn-solid"
          className={styles.card}
          style={{ display: "block" }}
        >
          {/* V5.83 (fase 6): el contrato nació LLENO de la oferta aceptada con la declaración del productor. Aquí solo se firma. */}
          <p className={styles.meta} style={{ margin: "0 0 10px" }}>
            Nació de la oferta aceptada por el productor: precio <b>{contract.price_per_kg_locked != null ? `${formatCop(Number(contract.price_per_kg_locked))}/kg` : "—"}</b>
            {contract.reference_price_source && <> (referencia {contract.reference_price_source}{contract.modificador_pct ? ` ${Number(contract.modificador_pct) > 0 ? "+" : ""}${Number(contract.modificador_pct)} %` : ""})</>} · cantidad declarada{" "}
            <b>{contract.quantity_frozen_kg != null ? `${Number(contract.quantity_frozen_kg)} kg` : "—"}</b>
            {porVentana && cv.vigencia_desde && cv.vigencia_hasta && <> · ventana {fechaLarga(cv.vigencia_desde)} → {fechaLarga(cv.vigencia_hasta)} ({cv.ventana_tipo === "extendida" ? "extendida" : "un ciclo"})</>}
            {porVentana && Number(cv.saco_kg ?? 0) > 0 && <> · saco de {Number(cv.saco_kg)} kg fuera de lo declarado (sale al cierre de la semana de firma)</>}
            {contract.declaracion && <> · «{MODALIDAD_LABEL[contract.declaracion as Modalidad] ?? contract.declaracion}»</>}
            {contract.compra_inicial_kg != null && <> · CTC compra de inmediato {Number(contract.compra_inicial_kg)} kg</>}
            {contract.terms_version && <> · términos {contract.terms_version}</>}. Firmar activa el trato.
          </p>
        </ActionForm>
      ) : (
        <div className={styles.card} style={{ display: "block", marginBottom: 24 }}>
          <p className={styles.meta}>
            Referencia: {contract.reference_price_source ?? "—"} ({contract.reference_price_snapshot ?? "—"} $/kg) · Precio pactado:{" "}
            <b>{contract.price_per_kg_locked != null ? `${formatCop(Number(contract.price_per_kg_locked))}/kg` : "—"}</b> · Declarado: <b>{contract.quantity_frozen_kg} kg</b>
            {contract.declaracion && <> («{MODALIDAD_LABEL[contract.declaracion as Modalidad] ?? contract.declaracion}»)</>}
            {contract.compra_inicial_kg != null && <> · compra inicial {Number(contract.compra_inicial_kg)} kg</>}
            {contract.terms_version && <> · términos {contract.terms_version}</>} · Firmado: {fecha(contract.signed_at)}
          </p>
          {porVentana && cuenta ? (
            <p className={styles.meta} style={{ marginTop: 6 }}>
              Ventana <b>{cv.vigencia_desde ? fechaLarga(cv.vigencia_desde) : "—"} → {cv.vigencia_hasta ? fechaLarga(cv.vigencia_hasta) : "—"}</b> ({cv.ventana_tipo === "extendida" ? "extendida" : "un ciclo"}
              {cv.ventana_ciclos?.length ? ` · ${cv.ventana_ciclos.join(" y ")}` : ""}) · declarado <b>{cuenta.declaradoKg} kg</b> · vendido {cuenta.vendidoKg} kg · retirado {cuenta.retiradoKg} kg · <b>en la vitrina {cuenta.disponibleKg} kg</b>
              {cv.sin_retiro ? " · sin retiro libre (declaración reducida)" : ` · retiro libre ${Number(cv.retiro_libre_pct ?? 0)} % (quedan ${cuenta.libreRestanteKg} kg)`}
            </p>
          ) : (
          <p className={styles.meta} style={{ marginTop: 6 }}>
            Comprometido <b>{resumen.comprometidoKg} kg</b> · retirado {resumen.retiradoKg} kg · <b>vigente {resumen.vigenteKg} kg</b> · pedido {resumen.pedidoKg} kg · enviado{" "}
            {resumen.enviadoKg} kg · pagado <b>{formatCop(resumen.pagadoCop)}</b>
            {resumen.penalidadCop > 0 && <> · penalidades {formatCop(resumen.penalidadCop)}</>} · mes en curso {resumen.mesEnCurso} de {nMeses}
            {/* Decisión 7 (V5.85): «Ofertas CP Aceptadas» es el staging del Catálogo Activo del lado KR: con un envío registrado, se publica. */}
            {resumen.enviadoKg > 0 && <> · <Link href="/ocp/catalogo">Pasar al Catálogo Activo →</Link></>}
          </p>
          )}
          {contract.status === "ruptura" && (
            <p className={styles.warn} style={{ marginTop: 6 }}>
              Ruptura contractual declarada el {fecha(contract.ruptura_at)}: {contract.ruptura_motivo}
            </p>
          )}
          {contract.status === "renovado" && <p className={styles.meta} style={{ marginTop: 6 }}>Renovación ofrecida el {fecha(contract.renovado_at)} — la oferta nueva está en Pendiente de Oferta.</p>}
        </div>
      )}

      {porVentana && (
        <div style={{ marginBottom: 28 }}>
          <h2 className={styles.title} style={{ fontSize: 16 }}>
            La ventana
          </h2>
          <p className={styles.meta} style={{ marginBottom: 10 }}>
            CTCx confirma cada semana lo vendido en Cherry Picked (se agrega al bache abierto del productor, que sale cuando el productor lo decida —cada 2 o 3
            semanas es lo recomendado— y a más tardar 5 semanas después de su primera venta; V5.183); el productor
            despacha el saco al cierre de la semana de firma; CTCx confirma el tiquete y paga el 60 %, y al recibir —con la humedad y la
            actividad de agua medidas— paga el resto, o resuelve fuera de rango (devolución o compra con 0–15 % adicional). Lo vendido que
            no sale tras su prórroga se cobra como retiro penalizado; la ruptura la declara el owner.
          </p>
          {vigente && (
            <ActionForm action={confirmarVentaSemanal.bind(null, id)} submitLabel="Confirmar la venta de la semana" pendingLabel="Confirmando…" buttonClassName="btn btn-sm btn-solid" className={styles.card} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end", marginBottom: 12 }}>
              <div className={styles.field} style={{ marginBottom: 0 }}>
                <label>Semana (cualquier día)</label>
                <input name="semana" type="date" defaultValue={hoyEnColombia()} />
              </div>
              <div className={styles.field} style={{ marginBottom: 0 }}>
                <label>Kilos vendidos</label>
                <input name="kg" inputMode="decimal" placeholder="kg" style={{ width: 110 }} required />
              </div>
              <p className={styles.meta} style={{ margin: 0 }}>En la vitrina quedan {cuenta?.disponibleKg ?? 0} kg.</p>
            </ActionForm>
          )}
          <div className={styles.list}>
            {despachos.length === 0 && <p className={styles.empty}>Sin despachos todavía.</p>}
            {despachos.map((d) => {
              const did = String(d.id);
              const estado = String(d.estado);
              const tipo = String(d.tipo);
              const vence = String(d.prorroga_hasta ?? d.plazo);
              const vencido = hoyEnColombia() > vence;
              return (
                <div key={did} className={styles.card} style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}>
                  <p className={styles.meta} style={{ margin: 0 }}>
                    <b>{tipo === "saco" ? "Saco de la firma" : tipo === "adelanto" ? "Compra adelantada" : "Lo vendido"}</b> · {Number(d.kg)} kg · {formatCop(Number(d.total_cop))} ·{" "}
                    <span className={estado === "pendiente" && vencido ? styles.badgeBad : estado === "recibido" ? styles.badgeGood : styles.badge}>{estado}</span> · plazo {fechaLarga(vence)}
                    {d.prorroga_hasta ? " (prorrogado)" : ""}
                    {d.guia ? ` · guía ${String(d.guia)}` : ""}
                    {d.peso_kg != null ? ` · ${Number(d.peso_kg)} kg` : ""}
                    {d.pago_despacho_at ? ` · 60 % pagado (${formatCop(Number(d.pago_despacho_cop))})` : ""}
                    {d.recibido_at ? ` · recibido: humedad ${Number(d.humedad_pct)} %, aw ${Number(d.aw)} · ${String(d.resultado)}${d.pago_recepcion_cop != null ? ` · al recibir ${formatCop(Number(d.pago_recepcion_cop))}` : ""}` : ""}
                    {Number(d.advertencias ?? 0) > 0 ? ` · advertencias ${Number(d.advertencias)}` : ""}
                    {d.nota ? ` · ${String(d.nota)}` : ""}
                  </p>
                  {(estado === "pendiente" || estado === "despachado") && !d.pago_despacho_at && (
                    <ActionForm action={confirmarDespacho.bind(null, did)} submitLabel="Confirmar el tiquete y pagar el 60 %" pendingLabel="Confirmando…" buttonClassName="btn btn-sm btn-solid" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}>
                      <input name="guia" placeholder="Guía / tiquete" defaultValue={d.guia ? String(d.guia) : ""} style={{ width: 150 }} />
                      <input name="peso_kg" inputMode="decimal" placeholder="Peso (kg)" defaultValue={d.peso_kg != null ? String(d.peso_kg) : ""} style={{ width: 100 }} />
                      <input name="pago_ref" placeholder="Referencia del pago" style={{ width: 150 }} />
                    </ActionForm>
                  )}
                  {estado === "despachado" && Boolean(d.pago_despacho_at) && (
                    <ActionForm action={recibirDespacho.bind(null, did)} submitLabel="Registrar el recibo" pendingLabel="Registrando…" buttonClassName="btn btn-sm btn-solid" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}>
                      <input name="peso_kg" inputMode="decimal" placeholder="Peso recibido (kg)" required style={{ width: 130 }} />
                      <input name="humedad_pct" inputMode="decimal" placeholder="Humedad (%)" required style={{ width: 100 }} />
                      <input name="aw" inputMode="decimal" placeholder="aw" required style={{ width: 70 }} />
                      <select name="decision" defaultValue="">
                        <option value="">Si sale fuera de rango…</option>
                        <option value="devolucion">Devolución (CTCx paga el flete)</option>
                        <option value="compra_ajustada">Comprar con pago adicional</option>
                      </select>
                      <input name="ajuste_pct" inputMode="decimal" placeholder="0–15 %" style={{ width: 80 }} />
                      <input name="pago_ref" placeholder="Referencia del pago" style={{ width: 150 }} />
                    </ActionForm>
                  )}
                  {estado === "pendiente" && tipo === "vendido" && !d.prorroga_hasta && (
                    <ActionForm action={prorrogarLoVendido.bind(null, did)} submitLabel="Registrar la prórroga (advertencia)" pendingLabel="Guardando…" buttonClassName="btn btn-sm" />
                  )}
                  {estado === "pendiente" && tipo === "vendido" && Boolean(d.prorroga_hasta) && vencido && (
                    <ActionForm action={cobrarFaltante.bind(null, did)} submitLabel="Cobrar el faltante como retiro penalizado" pendingLabel="Cobrando…" buttonClassName="btn btn-sm" buttonStyle={{ borderColor: "var(--red)", color: "var(--red)" }} />
                  )}
                </div>
              );
            })}
          </div>
          {ventas.length > 0 && (
            <p className={styles.meta} style={{ marginTop: 8 }}>
              Ventas confirmadas:{" "}
              {ventas.map((v) => `semana del ${fecha(String(v.semana))}: ${Number(v.kg)} kg${v.anulada_at ? " (anulada: no se despachó)" : ""}`).join(" · ")}
            </p>
          )}
          {retiros.length > 0 && (
            <p className={styles.meta} style={{ marginTop: 4 }}>
              Retiros: {retiros.map((r) => `${Number(r.kg)} kg (${Number(r.libre_kg)} libres${Number(r.penalidad_cop) > 0 ? ` · penalidad ${formatCop(Number(r.penalidad_cop))}` : ""}${r.nota ? ` · ${String(r.nota)}` : ""})`).join(" · ")}
            </p>
          )}
          {vigente && (
            <div className={styles.card} style={{ flexDirection: "column", alignItems: "stretch", marginTop: 12 }}>
              <h3 style={{ margin: 0 }}>Renovación de la ventana</h3>
              <p className={styles.meta}>
                Desde la semana 4 del último ciclo de la ventana, la invitación de la ventana siguiente queda prellenada (mínimo de continuidad,
                compra adelantada típica, la misma entrega) y vence al terminar esta ventana. El productor confirma cuánto deja disponible, la
                humedad y el bodegaje, y firma.
              </p>
              <ActionForm action={prepararRenovacion.bind(null, id)} submitLabel="Preparar la renovación" pendingLabel="Preparando…" buttonClassName="btn btn-sm btn-solid" />
            </div>
          )}
        </div>
      )}

      {contract.status !== "pending_signature" && !porVentana && (
        <>
          <h2 className={styles.title} style={{ fontSize: 16 }}>
            El trato mes a mes
          </h2>
          <p className={styles.meta} style={{ marginBottom: 10 }}>
            CTC pide la cantidad del mes; el productor la envía; CTC paga en la primera semana del mes siguiente. La mora se deriva del
            pedido sin envío: {MORA.semanasSinCargo} semanas sin cargo, {MORA.semanasConRecargo} más con recargo del {MORA.recargoPct} %, después{" "}
            <b>ruptura potencial</b> (visible; la declara el owner). Cada lunes el cron se lo recuerda al productor por correo y en su feed
            mientras esté en mora, hasta {MAX_RECORDATORIOS_MORA} veces por mes (V5.86). El productor retira desde su panel: tramo libre 25 % al cerrar
            el mes 1 y 50 % al cerrar el mes 2; por encima, {PENALIDAD_RETIRO_PCT} % del precio de cada carga.
          </p>
          <div className={styles.list} style={{ marginBottom: 28 }}>
            {Array.from({ length: nMeses }, (_, i) => i + 1).map((mes) => {
              const fila = meses.find((m) => m.mes === mes);
              const mora = moraDelMes({ pedidoAt: fila?.pedidoAt ?? null, enviadoAt: fila?.enviadoAt ?? null }, hoy);
              const tono = mora.estado === "ruptura_potencial" ? styles.badgeBad : mora.estado === "con_recargo" ? styles.badgeWarn : mora.estado === "cumplido" ? styles.badgeGood : styles.badge;
              return (
                <div className={styles.card} key={mes} style={{ flexDirection: "column", alignItems: "stretch" }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
                    <h3 style={{ margin: 0 }}>Mes {mes}</h3>
                    <span className={tono}>{MORA_LABEL[mora.estado]}{mora.estado !== "sin_pedido" && mora.estado !== "cumplido" ? ` · ${mora.semanas} sem.` : ""}</span>
                    {fila?.retiradoKg ? (
                      <span className={styles.meta}>
                        retiró {fila.retiradoKg} kg ({fila.retiradoLibreKg} libres · {fila.retiradoPenalizadoKg} con penalidad {formatCop(fila.penalidadCop)}){notasDeRetiro.get(mes) ? ` · «${notasDeRetiro.get(mes)}»` : ""}
                      </span>
                    ) : null}
                    {(recordatoriosDe.get(mes) ?? 0) > 0 && (
                      <span className={styles.meta}>
                        · recordatorios de mora {recordatoriosDe.get(mes)}/{MAX_RECORDATORIOS_MORA}
                      </span>
                    )}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12, marginTop: 8 }}>
                    <div>
                      <p className={styles.meta} style={{ margin: "0 0 4px" }}>
                        <b>Pedido</b>: {fila?.pedidoKg != null ? `${fila.pedidoKg} kg · ${fecha(fila.pedidoAt)}` : "—"}
                      </p>
                      {vigente && !fila?.enviadoAt && (
                        <ActionForm action={pedirDelMes.bind(null, id, mes)} submitLabel={fila?.pedidoKg != null ? "Cambiar pedido" : "Pedir"} buttonClassName="btn btn-sm" style={{ display: "flex", gap: 6, alignItems: "end" }}>
                          <input name="pedido_kg" inputMode="decimal" placeholder="kg" defaultValue={fila?.pedidoKg ?? ""} style={{ width: 90 }} />
                        </ActionForm>
                      )}
                    </div>
                    <div>
                      <p className={styles.meta} style={{ margin: "0 0 4px" }}>
                        <b>Envío</b>: {fila?.enviadoKg != null ? `${fila.enviadoKg} kg · recibido ${fecha(fila.enviadoAt)}` : "—"}
                      </p>
                      {vigente && !fila?.enviadoAt && (
                        <ActionForm action={registrarEnvioDelMes.bind(null, id, mes)} submitLabel="Registrar envío" buttonClassName="btn btn-sm" style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "end" }}>
                          <input name="enviado_kg" inputMode="decimal" placeholder="kg" defaultValue={fila?.pedidoKg ?? ""} style={{ width: 90 }} />
                          <input name="enviado_at" type="date" />
                        </ActionForm>
                      )}
                    </div>
                    <div>
                      <p className={styles.meta} style={{ margin: "0 0 4px" }}>
                        <b>Pago</b>: {fila?.pagadoCop != null ? `${formatCop(fila.pagadoCop)} · ${fecha(fila.pagadoAt)}${refsDePago.get(mes) ? ` · ref. ${refsDePago.get(mes)}` : ""}` : "—"}
                      </p>
                      {vigente && fila?.enviadoAt && !fila.pagadoAt && (
                        <ActionForm action={registrarPagoDelMes.bind(null, id, mes)} submitLabel="Registrar pago" buttonClassName="btn btn-sm" style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "end" }}>
                          <input name="pagado_cop" inputMode="numeric" placeholder="COP" defaultValue={fila.enviadoKg != null && contract.price_per_kg_locked != null ? Math.round(fila.enviadoKg * Number(contract.price_per_kg_locked)) : ""} style={{ width: 120 }} />
                          <input name="pago_ref" placeholder="Referencia" style={{ width: 120 }} />
                          <input name="pagado_at" type="date" />
                        </ActionForm>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Renovación (paso 18) y ruptura (paso 16, decisión 6: solo el owner) */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12, marginBottom: 28 }}>
            <div className={styles.card} style={{ flexDirection: "column", alignItems: "stretch" }}>
              <h3 style={{ margin: 0 }}>Renovación</h3>
              <p className={styles.meta}>
                A los {RENOVACION_DIAS} días de la firma (o al terminar la vigencia, si es antes) CTC ofrece renovar con el PVC vigente y una cantidad nueva (past crop −10 % si la recolección
                pasó de 9 meses). Se ofrece sobre un trato <b>cumplido</b>.
              </p>
              {contract.status === "completed" && resumen.renovacionDebida ? (
                <ActionForm action={ofrecerRenovacion.bind(null, id)} submitLabel="Ofrecer renovación (PVC vigente)" buttonClassName="btn btn-sm btn-solid" />
              ) : (
                <p className={styles.meta}>{contract.status === "completed" ? "Todavía no se cumplen los 90 días de la firma." : contract.status === "renovado" ? "Ya se ofreció." : "El trato sigue en curso."}</p>
              )}
            </div>
            <div className={styles.card} style={{ flexDirection: "column", alignItems: "stretch" }}>
              <h3 style={{ margin: 0 }}>Ruptura contractual</h3>
              <p className={styles.meta}>
                {resumen.mora === "ruptura_potencial"
                  ? "Hay un pedido con más de cuatro semanas sin envío: ruptura POTENCIAL. La plataforma la enseña; declararla es del owner, con motivo, y congela la cuenta del productor. Excepción: causa legítima comunicada antes."
                  : "Se declara solo cuando la mora pasa de las cuatro semanas sin causa legítima. Nunca es automática."}
              </p>
              {vigente && identity.isOwner && (
                <ActionForm action={declararRuptura.bind(null, id)} submitLabel="Declarar ruptura y congelar la cuenta" buttonClassName="btn btn-sm" buttonStyle={{ borderColor: "var(--red)", color: "var(--red)" }} style={{ display: "grid", gap: 6 }}>
                  <input name="motivo" placeholder="Motivo (el productor lo lee)" required />
                </ActionForm>
              )}
              {vigente && !identity.isOwner && <p className={styles.meta}>Solo el owner puede declararla.</p>}
              {cuentaCongelada && identity.isOwner && lot && (
                <ActionForm action={descongelarCuenta.bind(null, lot.producer_id)} submitLabel="Descongelar la cuenta" buttonClassName="btn btn-sm" style={{ display: "grid", gap: 6, marginTop: 8 }}>
                  <input name="motivo" placeholder="Por qué se reactiva" required />
                </ActionForm>
              )}
            </div>
          </div>

          <h2 className={styles.title} style={{ fontSize: 16 }}>
            Humedad (registrada en nombre del productor)
          </h2>
          <div className={styles.auditList} style={{ marginBottom: 14 }}>
            {!readings?.length && <p className={styles.empty}>Sin lecturas todavía.</p>}
            {readings?.map((r) => (
              <div key={r.id}>
                Mes {r.reading_month}: <b>{r.humidity_pct}%</b>
                {r.flagged && <span className={`${styles.badge} ${styles.badgeWarn}`} style={{ marginLeft: 8 }}>fuera de rango</span>}
                {r.notes ? ` — ${r.notes}` : ""}
              </div>
            ))}
          </div>
          <ActionForm action={recordHumidityReading.bind(null, id)} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end", marginBottom: 28 }} submitLabel="Registrar" pendingLabel="Registrando…" buttonClassName="btn btn-sm">
            <div className={styles.field} style={{ marginBottom: 0 }}>
              <label>Mes</label>
              <select name="reading_month" defaultValue="1">
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
              </select>
            </div>
            <div className={styles.field} style={{ marginBottom: 0 }}>
              <label>Humedad (%)</label>
              <input name="humidity_pct" type="number" step="0.1" required style={{ width: 100 }} />
            </div>
            <div className={styles.field} style={{ marginBottom: 0, flex: 1, minWidth: 200 }}>
              <label>Comunicado por (requerido)</label>
              <input name="notes" placeholder="Ej. WhatsApp con el productor, 12/07" required />
            </div>
          </ActionForm>

          {contract.status === "active" && (
            <ActionForm action={markReconditioning.bind(null, id)} submitLabel="Marcar conversación de reacondicionamiento" pendingLabel="Guardando…" buttonClassName="btn">
            </ActionForm>
          )}
          {contract.status === "reconditioning" && (
            <div className={styles.actions}>
              <ActionForm action={resolveReconditioning.bind(null, id, "active")} submitLabel="Resuelto — volver a activo" pendingLabel="Guardando…" buttonClassName="btn btn-solid">
              </ActionForm>
              <ActionForm action={resolveReconditioning.bind(null, id, "cancelled")} submitLabel="No se resolvió — cancelar contrato" pendingLabel="Guardando…" buttonClassName="btn">
              </ActionForm>
            </div>
          )}
        </>
      )}
    </div>
  );
}
