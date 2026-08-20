// ── El correo de «Recuperar acceso» (V5.12) ─────────────────────────────────
// Sale por el mismo remitente verificado que los leads y el OTP del panel
// (`sendTransactionalEmail`, contrato de NUNCA lanzar: devuelve el resultado y
// quien llama decide). La regla de la casa se aplica entera aquí: un aviso que
// falla en silencio es una solicitud que nadie atiende — y en este caso, una
// persona que se queda fuera de su cuenta esperando un mensaje que no salió.
//
// Texto plano a propósito, como todo el correo transaccional de esta casa: la
// mitad de estos destinatarios lo abre en el móvil, en el campo, con mala
// señal, y un HTML que no carga es un enlace que no se puede pulsar.

import { sendTransactionalEmail, type SendResult } from "./leadEmails";
import { PUERTAS, type PuertaId } from "@/lib/auth/puertas";

const SIGN = "Colombian Trading Company · CTC Web Platform";

/** Cuántos minutos le quedan al vale, dicho en cristiano. */
function vigencia(expiraEn: Date): string {
  const minutos = Math.max(1, Math.round((expiraEn.getTime() - Date.now()) / 60000));
  return minutos >= 60 ? "una hora" : `${minutos} minutos`;
}

export function construirCorreoRecuperacion(opciones: {
  puerta: PuertaId;
  correoDeAcceso: string;
  enlace: string;
  expiraEn: Date;
  /** El vale viaja a un buzón distinto del usuario de acceso (etiqueta sin buzón). */
  destinoDistinto: boolean;
  sinConfirmar: boolean;
}): { subject: string; text: string } {
  const { puerta, correoDeAcceso, enlace, expiraEn, destinoDistinto, sinConfirmar } = opciones;
  const sitio = PUERTAS[puerta].nombre;

  const lineas = [
    "Hola,",
    "",
    `Alguien —esperamos que tú— pidió recuperar el acceso a ${sitio}.`,
    "",
    "Abre este enlace para elegir una contraseña nueva:",
    enlace,
    "",
    `El enlace caduca en ${vigencia(expiraEn)} y sirve UNA sola vez.`,
    "",
    `--- Tu cuenta ---`,
    `Usuario: ${correoDeAcceso}`,
  ];

  if (destinoDistinto) {
    lineas.push(
      "",
      `Nota: tu usuario (${correoDeAcceso}) es solo tu identidad de acceso — no es un buzón de correo. Por eso este mensaje llega a esta dirección.`
    );
  }

  if (sinConfirmar) {
    lineas.push(
      "",
      "De paso: tu correo estaba sin confirmar. Al usar este enlace queda confirmado y ya no tendrás que hacer nada más."
    );
  }

  lineas.push(
    "",
    "Es la misma cuenta de toda la red CTC: la contraseña que elijas te sirve en todas las plataformas donde ya entrabas con este correo.",
    "",
    "Si no fuiste tú, ignora este mensaje: tu contraseña actual sigue funcionando y este enlace caduca solo.",
    "",
    SIGN
  );

  return { subject: `Recupera tu acceso a ${sitio}`, text: lineas.join("\n") };
}

export async function enviarCorreoRecuperacion(
  destino: string,
  opciones: Parameters<typeof construirCorreoRecuperacion>[0]
): Promise<SendResult> {
  const { subject, text } = construirCorreoRecuperacion(opciones);
  return sendTransactionalEmail(destino, subject, text);
}
