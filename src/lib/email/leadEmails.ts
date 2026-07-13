import { Resend } from "resend";

// Transactional emails for CTC Home leads. Sender comes from EMAIL_FROM once
// ctcexport.com is verified in Resend; until then the resend.dev fallback only
// delivers to the Resend account owner's inbox (fine for testing). Both
// senders NEVER throw -- callers persist the outcome on the lead/reply row so
// BCP can see failures and retry.
const FROM = process.env.EMAIL_FROM || "Colombian Trading Company <onboarding@resend.dev>";
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://ctcexport.com";

export type LeadEmailInput = {
  pillar: string; // general | tech | cocreate | varietales
  nombre: string;
  email: string;
  account_provisioning: string; // created_password | created_google | existing
};

export const PILLAR_LABEL: Record<string, string> = {
  general: "Consulta general",
  tech: "CTC Tech",
  cocreate: "CTC Co-Create",
  varietales: "Varietales Registrados",
};

// Co-Create leads are demand-side (brands/roasters) -> Cherry Picked buyer
// accounts; every other pillar is supply-side -> Kaffetal Regal producer.
export function platformFor(pillar: string): { name: string; url: string } {
  return pillar === "cocreate"
    ? { name: "Cherry Picked", url: `${SITE}/cherry-picked` }
    : { name: "Kaffetal Regal", url: `${SITE}/kaffetal-regal` };
}

type SendResult = { ok: true } | { ok: false; error: string };

async function send(to: string, subject: string, text: string): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[lead email - dev fallback, no RESEND_API_KEY] to=${to} subject="${subject}"\n${text}`);
    return { ok: true };
  }
  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({ from: FROM, to, subject, text });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Fallo desconocido al enviar el correo." };
  }
}

// Automatic welcome: explains the platform (per pillar), encourages using it,
// and reassures that CTC answers soon. For accounts we created on the lead's
// behalf it notes that the access password arrives in CTC's first reply.
export function buildWelcomeEmail(lead: LeadEmailInput): { subject: string; text: string } {
  const platform = platformFor(lead.pillar);
  const isBuyer = lead.pillar === "cocreate";

  const platformIntro = isBuyer
    ? `${platform.name} es nuestra plataforma para tostadores y marcas: un catálogo curado de cafés colombianos evaluados en la Arena CTC, con reservas, trazabilidad y la historia de cada lote y su finca.`
    : `${platform.name} es nuestra plataforma para caficultores: allí registra su finca, arma la Ficha Técnica de cada lote, avanza la debida diligencia EUDR y presenta sus cafés a la Arena CTC para llegar a compradores en Europa y EE.UU.`;

  const accountLine =
    lead.account_provisioning === "created_password"
      ? `Creamos una cuenta en ${platform.name} a tu nombre con este correo. Tu contraseña de acceso llegará adjunta a nuestra primera respuesta.`
      : lead.account_provisioning === "created_google"
        ? `Tu cuenta de ${platform.name} quedó creada con tu acceso de Google: puedes entrar cuando quieras en ${platform.url}.`
        : `Vinculamos tu solicitud a tu cuenta existente de la plataforma (${platform.url}).`;

  const subject = `Recibimos tu solicitud · ${PILLAR_LABEL[lead.pillar] ?? "CTC"} · Colombian Trading Company`;
  const text = [
    `Hola ${lead.nombre},`,
    "",
    `Gracias por escribirnos. Recibimos tu solicitud de ${PILLAR_LABEL[lead.pillar] ?? "contacto"} y nuestro equipo la está revisando: te responderemos pronto a este mismo correo.`,
    "",
    platformIntro,
    "",
    accountLine,
    "",
    `Mientras tanto, te invitamos a explorar la plataforma: ${platform.url}`,
    "",
    "Un abrazo caficultor,",
    "Colombian Trading Company · CTCx",
    "info@ctcexport.com",
  ].join("\n");
  return { subject, text };
}

export async function sendLeadWelcomeEmail(lead: LeadEmailInput): Promise<SendResult> {
  const { subject, text } = buildWelcomeEmail(lead);
  return send(lead.email, subject, text);
}

// BCP reply. When tempPassword is set (first reply to an account created on
// the lead's behalf) a clearly separated access block is appended AT SEND TIME
// -- the stored reply body never contains the password.
export async function sendLeadReplyEmail(
  lead: LeadEmailInput,
  reply: { subject: string; body: string },
  tempPassword: string | null
): Promise<SendResult> {
  const platform = platformFor(lead.pillar);
  let text = `Hola ${lead.nombre},\n\n${reply.body}\n\nColombian Trading Company · CTCx\ninfo@ctcexport.com`;
  if (tempPassword) {
    text += [
      "",
      "",
      `--- Tu acceso a ${platform.name} ---`,
      `Usuario: ${lead.email}`,
      `Contraseña: ${tempPassword}`,
      `Ingresa en: ${platform.url}`,
      "Te recomendamos cambiarla al ingresar.",
    ].join("\n");
  }
  return send(lead.email, reply.subject, text);
}
