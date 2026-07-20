import { PARTNERS, type PartnerSlug } from "@/lib/partners/partners";

// Credential emails for partner-node accounts, delivered via the shared Resend
// sender in leadEmails.ts. Tier de un solo factor.
//
// OJO: el correo de ACCESO puede NO ser el buzón que recibe este mensaje (ver
// partner_accounts.delivery_email). Cuando difieren hay que decirlo explícito:
// si no, el socio intenta entrar con la dirección donde le llegó el correo y
// no puede. De ahí la línea "Este mensaje llegó a …".
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://ctcexport.com";
const SIGN = "Colombian Trading Company · Red de socios";

export function buildPartnerInviteEmail(
  email: string,
  contactName: string | null,
  orgName: string,
  node: PartnerSlug,
  tempPassword: string,
  deliveryEmail?: string | null
): { subject: string; text: string } {
  const p = PARTNERS[node];
  const subject = `Tu credencial de socio · ${p.name} · Red CTC`;
  const text = [
    `Hola${contactName ? ` ${contactName}` : ""},`,
    "",
    `${orgName} ya tiene su credencial de socio en la red de Colombian Trading Company, para el nodo ${p.name} (${p.role}).`,
    "",
    "--- Tu acceso ---",
    `Usuario: ${email}`,
    `Contraseña temporal: ${tempPassword}`,
    `Ingresa en: ${SITE}/socios/${node}/acceso`,
    ...(deliveryEmail && deliveryEmail !== email
      ? [
          "",
          `Este mensaje llegó a ${deliveryEmail}, pero ESE NO es tu usuario:`,
          `entra siempre con ${email}.`,
        ]
      : []),
    "Por seguridad, cámbiala desde tu panel en cuanto entres.",
    "",
    "Tu credencial abre únicamente tu módulo: ves tu tramo del pasaporte de cada lote y estampas el sello que te corresponde.",
    "",
    SIGN,
  ].join("\n");
  return { subject, text };
}

export function buildPartnerResetEmail(
  email: string,
  contactName: string | null,
  node: PartnerSlug,
  tempPassword: string,
  deliveryEmail?: string | null
): { subject: string; text: string } {
  const p = PARTNERS[node];
  const subject = `Restablecimiento de contraseña · ${p.name} · Red CTC`;
  const text = [
    `Hola${contactName ? ` ${contactName}` : ""},`,
    "",
    "El equipo de CTC restableció la contraseña de tu credencial de socio.",
    "",
    "--- Tu acceso ---",
    `Usuario: ${email}`,
    `Contraseña temporal: ${tempPassword}`,
    `Ingresa en: ${SITE}/socios/${node}/acceso`,
    ...(deliveryEmail && deliveryEmail !== email
      ? ["", `Este mensaje llegó a ${deliveryEmail}, pero tu usuario sigue siendo ${email}.`]
      : []),
    "Por seguridad, cámbiala desde tu panel en cuanto entres.",
    "",
    "Si no solicitaste este cambio, contacta a CTC de inmediato.",
    "",
    SIGN,
  ].join("\n");
  return { subject, text };
}
