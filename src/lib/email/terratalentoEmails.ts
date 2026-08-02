import { sendTransactionalEmail, type SendResult } from "./leadEmails";
import { buildLlamadoEmail, type LlamadoEmailInput } from "./llamadoEmail";

// ── Terratalento · el correo del llamado ─────────────────────────────────────
// Se envía cuando el ECP marca una postulación como "llamado" (CTC te quiere
// para esta jornada) o "confirmado" (tu cupo quedó asegurado). El TEXTO vive
// en llamadoEmail.ts (módulo puro, testeable por QA); aquí solo el envío, con
// el mismo contrato never-throw de los correos de leads — quien llama persiste
// el resultado en la fila de la postulación.

export type { LlamadoEmailInput };
export { buildLlamadoEmail };

export async function sendLlamadoEmail(input: LlamadoEmailInput): Promise<SendResult> {
  const { subject, text } = buildLlamadoEmail(input);
  return sendTransactionalEmail(input.email, subject, text);
}
