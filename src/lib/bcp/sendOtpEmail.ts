import { Resend } from "resend";

/**
 * Emails the master-login confirmation code to the inbox of the user logging in
 * (their delivery_email, or their own login email). `BCP_OTP_RECIPIENT_EMAIL` is
 * strictly a FALLBACK for calls with no recipient — it must never take precedence:
 * that env var is still set in Vercel from the original fixed-address setup, and
 * when it outranked `recipient` it sent a collaborator's OTP to the founder's
 * inbox in production (2026-07-15). Falls back to a server-console log when
 * RESEND_API_KEY isn't configured, so the flow stays testable locally.
 */
export type OtpSendResult = { ok: true } | { ok: false; error: string };

export async function sendOtpEmail(code: string, recipient?: string | null): Promise<OtpSendResult> {
  const to = recipient || process.env.BCP_OTP_RECIPIENT_EMAIL || "ctcexportmain@gmail.com";
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.log(`[BCP OTP - dev fallback, no RESEND_API_KEY set] code for ${to}: ${code}`);
    return { ok: true };
  }

  // El resultado del envío TIENE que viajar de vuelta (auditoría 2026-08-13,
  // EST-1). Resend devuelve `{error}` sin lanzar; si se descarta, la ruta
  // responde ok, el usuario espera un código que nunca llega y cada reintento
  // quema uno de los 3 slots por ventana — un modo de fallo invisible que puede
  // bloquear la ÚNICA puerta del panel. Un throw de red además escaparía del
  // try/catch de la ruta: por eso se envuelve aquí.
  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      // Same verified sender as the lead emails (EMAIL_FROM once ctcexport.com
      // is verified in Resend); resend.dev fallback only delivers to the
      // Resend account owner's inbox -- which is exactly this OTP's recipient.
      from: process.env.EMAIL_FROM || "CTC Business Control Panel <onboarding@resend.dev>",
      to,
      subject: "Tu código de confirmación · CTC BCP",
      text: `Código de confirmación: ${code}\n\nVálido por 10 minutos. Si no intentaste iniciar sesión en el Business Control Panel, ignora este mensaje.`,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Fallo de red al enviar el código." };
  }
}
