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
import { MORA_LABEL, moraDelMes, resumenDelTrato, type FilaDelMes } from "@/lib/trato/mesAMes";
import styles from "@/components/panel/shared.module.css";

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
};

const fecha = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString("es-CO") : "—");

export default async function BcpContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const identity = await requireConsoleAccess("ocp");
  const service = createServiceRoleClient();

  const { data: contract } = await service
    .from("purchase_contracts")
    .select(
      "id, status, grade_snapshot, signed_at, reference_price_source, reference_price_snapshot, price_per_kg_locked, quantity_frozen_kg, terms_version, declaracion, compra_inicial_kg, modificador_pct, freeze_months, ruptura_at, ruptura_motivo, renovado_at, lots(name, producer_id, fincas(name))"
    )
    .eq("id", id)
    .single();
  if (!contract) notFound();

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
  const hoy = new Date();
  const nMeses = contract.freeze_months && contract.freeze_months > 0 ? Math.min(3, contract.freeze_months) : 3;
  const resumen = resumenDelTrato({ quantityFrozenKg: contract.quantity_frozen_kg != null ? Number(contract.quantity_frozen_kg) : null, freezeMonths: nMeses, signedAt: contract.signed_at }, meses, hoy);
  const vigente = contract.status === "active";
  const cuentaCongelada = perfil?.estado_cuenta === "congelada";

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
            {contract.declaracion && <> · {contract.declaracion === "trimestre" ? "por el trimestre" : "por 30 días"}</>}
            {contract.compra_inicial_kg != null && <> · CTC compra de inmediato {Number(contract.compra_inicial_kg)} kg</>}
            {contract.terms_version && <> · términos {contract.terms_version}</>}. Firmar activa el trato.
          </p>
        </ActionForm>
      ) : (
        <div className={styles.card} style={{ display: "block", marginBottom: 24 }}>
          <p className={styles.meta}>
            Referencia: {contract.reference_price_source ?? "—"} ({contract.reference_price_snapshot ?? "—"} $/kg) · Precio pactado:{" "}
            <b>{contract.price_per_kg_locked != null ? `${formatCop(Number(contract.price_per_kg_locked))}/kg` : "—"}</b> · Declarado: <b>{contract.quantity_frozen_kg} kg</b>
            {contract.declaracion && <> ({contract.declaracion === "trimestre" ? "trimestre" : "30 días"})</>}
            {contract.compra_inicial_kg != null && <> · compra inicial {Number(contract.compra_inicial_kg)} kg</>}
            {contract.terms_version && <> · términos {contract.terms_version}</>} · Firmado: {fecha(contract.signed_at)}
          </p>
          <p className={styles.meta} style={{ marginTop: 6 }}>
            Comprometido <b>{resumen.comprometidoKg} kg</b> · retirado {resumen.retiradoKg} kg · <b>vigente {resumen.vigenteKg} kg</b> · pedido {resumen.pedidoKg} kg · enviado{" "}
            {resumen.enviadoKg} kg · pagado <b>{formatCop(resumen.pagadoCop)}</b>
            {resumen.penalidadCop > 0 && <> · penalidades {formatCop(resumen.penalidadCop)}</>} · mes en curso {resumen.mesEnCurso} de {nMeses}
          </p>
          {contract.status === "ruptura" && (
            <p className={styles.warn} style={{ marginTop: 6 }}>
              Ruptura contractual declarada el {fecha(contract.ruptura_at)}: {contract.ruptura_motivo}
            </p>
          )}
          {contract.status === "renovado" && <p className={styles.meta} style={{ marginTop: 6 }}>Renovación ofrecida el {fecha(contract.renovado_at)} — la oferta nueva está en Pendiente de Oferta.</p>}
        </div>
      )}

      {contract.status !== "pending_signature" && (
        <>
          <h2 className={styles.title} style={{ fontSize: 16 }}>
            El trato mes a mes
          </h2>
          <p className={styles.meta} style={{ marginBottom: 10 }}>
            CTC pide la cantidad del mes; el productor la envía; CTC paga en la primera semana del mes siguiente. La mora se deriva del
            pedido sin envío: {MORA.semanasSinCargo} semanas sin cargo, {MORA.semanasConRecargo} más con recargo del {MORA.recargoPct} %, después{" "}
            <b>ruptura potencial</b> (visible; la declara el owner). El productor retira desde su panel: tramo libre 25 % al cerrar el mes 1 y 50 % al
            cerrar el mes 2; por encima, {PENALIDAD_RETIRO_PCT} % del precio de cada carga.
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
                A los {RENOVACION_DIAS} días de la firma CTC ofrece renovar con el PVC vigente y una cantidad nueva (past crop −10 % si la recolección
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
