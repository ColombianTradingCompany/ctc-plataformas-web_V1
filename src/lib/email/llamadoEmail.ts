// ── Terratalento · el texto del correo del llamado (módulo PURO) ─────────────
// Sin imports a propósito (patrón GVG): el QA lo ejecuta directo con
// --experimental-strip-types. El envío vive en terratalentoEmails.ts.

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://ctcexport.com";
const SIGN = "Un abrazo,\nColombian Trading Company · Terratalento\ninfo@ctcexport.com";

export type LlamadoEmailInput = {
  nombre: string;
  email: string;
  tipo: "llamado" | "confirmado";
  fincaNombre: string;
  municipio: string;
  fechaInicio: string; // YYYY-MM-DD
  fechaFin: string | null;
  pago: string | null;
  condiciones: string | null;
};

const fecha = (iso: string) =>
  new Date(iso + "T12:00:00").toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });

export function buildLlamadoEmail(input: LlamadoEmailInput): { subject: string; text: string } {
  const rango = input.fechaFin ? `del ${fecha(input.fechaInicio)} al ${fecha(input.fechaFin)}` : `desde el ${fecha(input.fechaInicio)}`;
  const donde = [input.fincaNombre, input.municipio].filter(Boolean).join(", ");

  const intro =
    input.tipo === "confirmado"
      ? `¡Tu cupo quedó CONFIRMADO! Cuentas con un puesto en la Jornada de Recolecta de ${donde}, ${rango}.`
      : `¡Te llamaron! CTC te quiere para la Jornada de Recolecta de ${donde}, ${rango}. Muy pronto te contactaremos al celular que registraste para coordinar los detalles.`;

  const text = [
    `Hola ${input.nombre},`,
    "",
    intro,
    "",
    "--- La jornada ---",
    `Finca: ${input.fincaNombre}`,
    ...(input.municipio ? [`Dónde: ${input.municipio}`] : []),
    `Cuándo: ${rango}`,
    ...(input.pago ? [`Pago: ${input.pago}`] : []),
    ...(input.condiciones ? [`Condiciones: ${input.condiciones}`] : []),
    "",
    input.tipo === "confirmado"
      ? "Si algo cambia y no puedes asistir, avísanos cuanto antes respondiendo este correo o desde tu panel."
      : "Tu estado también se ve en tu panel — cuando confirmemos tu cupo te avisamos de nuevo por aquí.",
    `Tu panel: ${SITE}/terratalento`,
    "",
    SIGN,
  ].join("\n");

  const subject =
    input.tipo === "confirmado"
      ? `Tu cupo está confirmado · Jornada en ${input.fincaNombre} · Terratalento`
      : `¡Te llamaron! Jornada en ${input.fincaNombre} · Terratalento`;

  return { subject, text };
}
