import { PARTNERS, type PartnerSlug } from "@/lib/partners/partners";

// Credential emails for partner-node accounts, delivered via the shared Resend
// sender in leadEmails.ts. Single-factor tier: the login email IS the inbox.
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://ctcexport.com";
const SIGN = "Colombian Trading Company · Red de socios";

export function buildPartnerInviteEmail(
  email: string,
  contactName: string | null,
  orgName: string,
  node: PartnerSlug,
  tempPassword: string
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
  tempPassword: string
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
    "Por seguridad, cámbiala desde tu panel en cuanto entres.",
    "",
    "Si no solicitaste este cambio, contacta a CTC de inmediato.",
    "",
    SIGN,
  ].join("\n");
  return { subject, text };
}
