import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { revisionDeAlmacenaje, type LecturaDeAlmacenaje } from "./almacenaje";
import { saldoDe } from "./particion";

// ── La revisión de almacenaje · la CARGA (Gestión de Muestras, 2.ª tanda · V5.88) ─────────────
// Qué lotes catados siguen en juego y cómo va su reloj de 90 días. Lo leen el Tablero de Ejecución (tarea `muestra`) y
// `/ocp/muestras`: una sola lectura para que los dos digan lo mismo. La regla es pura (`./almacenaje.ts`); aquí solo se
// juntan las tres fechas: la evaluación que rige el grado, la última revisión anotada y hoy. Nada se escribe.

export type RevisionDeAlmacenajeDeLote = {
  lotId: string;
  lotName: string;
  producerId: string;
  evaluadaAt: string;
  ultimaRevisionAt: string | null;
  lectura: LecturaDeAlmacenaje;
  /** La muestra de testeo con saldo (la que se usa para revisar), si la hay. */
  muestraTesteoId: string | null;
  saldoTesteoKg: number;
  /** La clave de la tarea derivada: cambia con cada ciclo (catación o última revisión), para que una casilla vieja no la tape. */
  claveDeTarea: string;
};

/** Un lote cuyo último contrato ya cerró (cumplido, cancelado, en ruptura) no se revisa: el café ya no está en juego. */
const CONTRATO_CERRADO = new Set(["completed", "cancelled", "ruptura"]);

export async function revisionesDeAlmacenaje(service: SupabaseClient, ahora = new Date()): Promise<RevisionDeAlmacenajeDeLote[]> {
  const [{ data: lots }, { data: evals }, { data: contratos }, { data: muestras }, { data: movs }] = await Promise.all([
    service.from("lots").select("id, name, producer_id").eq("stage", "galardonado"),
    service.from("lot_evaluations").select("lot_id, reviewed_at, created_at").eq("rige_grado", true).eq("status", "accepted"),
    service.from("purchase_contracts").select("lot_id, status, created_at").order("created_at", { ascending: false }),
    service.from("muestras").select("id, lot_id, kg").eq("tipo", "testeo"),
    service.from("muestra_movimientos").select("muestra_id, kg, motivo, fecha"),
  ]);
  const evalDe = new Map<string, string>();
  for (const e of (evals as { lot_id: string; reviewed_at: string | null; created_at: string }[] | null) ?? []) {
    if (!evalDe.has(e.lot_id)) evalDe.set(e.lot_id, e.reviewed_at ?? e.created_at);
  }
  const ultimoContrato = new Map<string, string>();
  for (const c of (contratos as { lot_id: string; status: string }[] | null) ?? []) {
    if (!ultimoContrato.has(c.lot_id)) ultimoContrato.set(c.lot_id, c.status);
  }
  const testeos = (muestras as { id: string; lot_id: string; kg: number | string }[] | null) ?? [];
  const movimientos = (movs as { muestra_id: string; kg: number | string; motivo: string; fecha: string }[] | null) ?? [];

  const salida: RevisionDeAlmacenajeDeLote[] = [];
  for (const lot of (lots as { id: string; name: string; producer_id: string }[] | null) ?? []) {
    const evaluadaAt = evalDe.get(lot.id);
    if (!evaluadaAt) continue;
    if (CONTRATO_CERRADO.has(ultimoContrato.get(lot.id) ?? "")) continue;
    const mias = testeos.filter((m) => m.lot_id === lot.id);
    const ids = new Set(mias.map((m) => m.id));
    const revisiones = movimientos.filter((m) => ids.has(m.muestra_id) && m.motivo === "revision_almacenaje").map((m) => m.fecha).sort();
    const ultimaRevisionAt = revisiones.length ? revisiones[revisiones.length - 1] : null;
    const conSaldo = mias.map((m) => ({ id: m.id, saldo: saldoDe(Number(m.kg), movimientos.filter((x) => x.muestra_id === m.id)) })).filter((m) => m.saldo > 0);
    const lectura = revisionDeAlmacenaje({ evaluadaAt, ultimaRevisionAt }, ahora);
    salida.push({
      lotId: lot.id,
      lotName: lot.name,
      producerId: lot.producer_id,
      evaluadaAt,
      ultimaRevisionAt,
      lectura,
      muestraTesteoId: conSaldo[0]?.id ?? null,
      saldoTesteoKg: Math.round(conSaldo.reduce((a, m) => a + m.saldo, 0) * 1000) / 1000,
      claveDeTarea: `muestra:${lot.id}:${(ultimaRevisionAt ?? evaluadaAt).slice(0, 10)}`,
    });
  }
  return salida.sort((a, b) => b.lectura.diasDesdeReferencia - a.lectura.diasDesdeReferencia);
}
