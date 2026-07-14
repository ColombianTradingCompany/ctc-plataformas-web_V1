import { sendTransactionalEmail, type SendResult } from "./leadEmails";

// Passport email for the Kaffetal Club: sent when BCP emits a Número de
// Pasaporte for a producer (standard, earned with a galardón) or assigns a
// campaign passport ("Fundadores", ...). Plain text, same never-throw contract
// as the lead emails -- callers persist the outcome on the code row.

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://ctcexport.com";
const SIGN = "Un abrazo,\nColombian Trading Company · CTCx\ninfo@ctcexport.com";

export type PassportEmailInput = {
  nombre: string;
  email: string;
  code: string;
  campaign: string | null; // null = standard (earned in the Arena)
};

export function buildPassportEmail(input: PassportEmailInput): { subject: string; text: string } {
  const intro = input.campaign
    ? `CTC le otorga un Pasaporte «${input.campaign}» del Kaffetal Club: el círculo de productores-exportadores con los que firmamos contratos de compra y llevamos café con nombre propio a Europa.`
    : `Uno de sus cafés ganó un galardón en la Arena — y con él, su lugar en el Kaffetal Club: el círculo de productores-exportadores con los que CTC firma contratos de compra y lleva café con nombre propio a Europa.`;

  const text = [
    `Hola ${input.nombre},`,
    "",
    intro,
    "",
    "--- Su Pasaporte del Kaffetal Club ---",
    `Número de Pasaporte: ${input.code}`,
    ...(input.campaign ? [`Edición: ${input.campaign}`] : []),
    "",
    "Con su Pasaporte activo usted puede:",
    "· Firmar contratos de compra con CTC (precio congelado + liberaciones mensuales)",
    "· Entrar con sus lotes galardonados al catálogo activo",
    "· Vender con nombre propio en Cherry Picked, nuestra vitrina de microlotes en Europa",
    "",
    `Para activarlo: ingrese a Kaffetal Regal (${SITE}/kaffetal-regal), abra "Mis contratos", escriba su Número de Pasaporte y pulse "Activar Pasaporte".`,
    "",
    SIGN,
  ].join("\n");

  return { subject: "Su Pasaporte del Kaffetal Club · Colombian Trading Company", text };
}

export async function sendPassportEmail(input: PassportEmailInput): Promise<SendResult> {
  const { subject, text } = buildPassportEmail(input);
  return sendTransactionalEmail(input.email, subject, text);
}
