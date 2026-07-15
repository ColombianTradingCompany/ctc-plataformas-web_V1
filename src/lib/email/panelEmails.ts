import { CONSOLES, type PanelConsoleKey } from "@/lib/panel/consoles";
import type { ConsoleLevel } from "@/lib/panel/panelUsers";

// Invitation / password-reset emails for internal panel collaborators. Delivered
// via the shared Resend sender in leadEmails.ts (dev-fallback + never-throw
// contract) to the collaborator's DELIVERY inbox — the login email itself may be
// a mailbox-less @ctcexport.com label. Temp passwords appear here at send time only.
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://ctcexport.com";
const SIGN = "Colombian Trading Company · CTC Web Platform";

function accessBlock(loginEmail: string, tempPassword: string, deliveryEmail: string | null): string[] {
  const lines = [
    "--- Tu acceso ---",
    `Usuario: ${loginEmail}`,
    `Contraseña temporal: ${tempPassword}`,
    `Ingresa en: ${SITE}/login`,
    "Al entrar, el sistema te pedirá crear tu propia contraseña.",
  ];
  if (deliveryEmail) {
    lines.push(
      "",
      `Nota: tu usuario (${loginEmail}) es solo tu identidad de acceso — no es un buzón de correo. Los códigos de confirmación y avisos del panel llegarán siempre a este correo (${deliveryEmail}).`
    );
  }
  return lines;
}

export function buildPanelInviteEmail(
  loginEmail: string,
  displayName: string | null,
  tempPassword: string,
  consoles: Partial<Record<PanelConsoleKey, ConsoleLevel>>,
  deliveryEmail: string | null
): { subject: string; text: string } {
  const grantLines = (Object.keys(consoles) as PanelConsoleKey[])
    .map((k) => `  · ${CONSOLES[k].code} — ${CONSOLES[k].name} (${consoles[k]})`)
    .join("\n");

  const subject = "Tu acceso a la CTC Web Platform";
  const text = [
    `Hola${displayName ? ` ${displayName}` : ""},`,
    "",
    "Se te ha dado acceso a la CTC Web Platform, el panel interno de Colombian Trading Company.",
    "",
    ...accessBlock(loginEmail, tempPassword, deliveryEmail),
    "",
    "Consolas concedidas:",
    grantLines,
    "",
    "Al iniciar sesión recibirás un código de confirmación de 6 dígitos en este mismo correo (segundo factor).",
    "",
    SIGN,
  ].join("\n");

  return { subject, text };
}

export function buildPanelResetEmail(
  loginEmail: string,
  displayName: string | null,
  tempPassword: string,
  deliveryEmail: string | null
): { subject: string; text: string } {
  const subject = "Restablecimiento de tu contraseña · CTC Web Platform";
  const text = [
    `Hola${displayName ? ` ${displayName}` : ""},`,
    "",
    "Un administrador restableció tu contraseña de la CTC Web Platform.",
    "",
    ...accessBlock(loginEmail, tempPassword, deliveryEmail),
    "",
    "Si no solicitaste este cambio, contacta al equipo de CTC de inmediato.",
    "",
    SIGN,
  ].join("\n");

  return { subject, text };
}
