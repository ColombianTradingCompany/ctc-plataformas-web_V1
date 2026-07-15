import { Resend } from "resend";

/**
 * Emails the master-login confirmation code. The recipient is the account that
 * is logging in (`recipient`), so each internal collaborator gets their own OTP.
 * `BCP_OTP_RECIPIENT_EMAIL`, if set, overrides everything as an emergency
 * catch-all; the fixed founder address is the last-resort fallback. Falls back
 * to a server-console log when RESEND_API_KEY isn't configured yet, so the flow
 * stays testable before that key is supplied.
 */
export async function sendOtpEmail(code: string, recipient?: string | null) {
  const to = process.env.BCP_OTP_RECIPIENT_EMAIL || recipient || "ctcexportmain@gmail.com";
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.log(`[BCP OTP - dev fallback, no RESEND_API_KEY set] code for ${to}: ${code}`);
    return;
  }

  const resend = new Resend(apiKey);
  await resend.emails.send({
    // Same verified sender as the lead emails (EMAIL_FROM once ctcexport.com
    // is verified in Resend); resend.dev fallback only delivers to the
    // Resend account owner's inbox -- which is exactly this OTP's recipient.
    from: process.env.EMAIL_FROM || "CTC Business Control Panel <onboarding@resend.dev>",
    to,
    subject: "Tu código de confirmación · CTC BCP",
    text: `Código de confirmación: ${code}\n\nVálido por 10 minutos. Si no intentaste iniciar sesión en el Business Control Panel, ignora este mensaje.`,
  });
}
