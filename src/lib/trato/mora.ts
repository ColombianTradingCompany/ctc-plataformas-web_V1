// ── Los recordatorios de mora · la regla PURA (V5.86; fila «Recordatorios» del §4 del PLAN_CIRCUITO_DEL_LOTE) ──
// Decisión 6 del owner: «nunca automática; se hace visible de manera automática». El cron semanal le RECUERDA al productor el
// pedido del mes que sigue sin envío mientras esté en mora —desde que corre el recargo, no en las dos semanas sin cargo—, como
// mucho MAX_RECORDATORIOS veces por mes (el mismo tope ×4 de las certificaciones, riesgo del §7 del plan), y nada más: ni el
// contrato ni la cuenta cambian de estado por aquí. Puro a propósito: lo corren el cron y `qa-trato-check`.

import { DIAS_ENTRE_RECORDATORIOS, MAX_RECORDATORIOS } from "@/lib/registro/reglas";
import { enMora, moraDelMes } from "./mesAMes";

export type MesParaRecordar = {
  pedidoAt: string | null;
  enviadoAt: string | null;
  recordatoriosMora: number;
  ultimoRecordatorioMoraAt: string | null;
};

export type DecisionMora = "nada" | "recordar";

const MS_DIA = 24 * 60 * 60 * 1000;

/**
 * Qué toca hoy con el mes de un trato: nada, o mandar el recordatorio de mora.
 *   · Solo un mes PEDIDO y sin ENVÍO, y solo mientras la mora derivada esté en recargo o ruptura potencial.
 *   · El primero sale en cuanto entra en mora; los siguientes, cada DIAS_ENTRE_RECORDATORIOS; nunca más de MAX_RECORDATORIOS.
 *   · Un envío registrado apaga todo (la mora se deriva del envío, no del contador).
 */
export function decidirRecordatorioDeMora(m: MesParaRecordar, ahora: Date): DecisionMora {
  if (!m.pedidoAt || m.enviadoAt) return "nada";
  if (!enMora(moraDelMes({ pedidoAt: m.pedidoAt, enviadoAt: m.enviadoAt }, ahora).estado)) return "nada";
  if (m.recordatoriosMora >= MAX_RECORDATORIOS) return "nada";
  if (!m.ultimoRecordatorioMoraAt) return "recordar";
  const dias = (ahora.getTime() - new Date(m.ultimoRecordatorioMoraAt).getTime()) / MS_DIA;
  return dias >= DIAS_ENTRE_RECORDATORIOS ? "recordar" : "nada";
}

export { MAX_RECORDATORIOS as MAX_RECORDATORIOS_MORA };
