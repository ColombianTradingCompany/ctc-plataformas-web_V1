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
export async function sendOtpEmail(code: string, recipient?: string | null) {
  const to = recipient || process.env.BCP_OTP_RECIPIENT_EMAIL || "ctcexportmain@gmail.com";
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
