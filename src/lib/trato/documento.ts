// ── El documento de quien firma el contrato (V5.188) ─────────────────────────────────────────────────────────────────────────
// Feedback de revisión de «Contratos y Compras»: «el contrato debe tener el espacio para escribir la CC (cédula de ciudadanía)
// además del nombre de quien firma». El tipo y el número se escriben al firmar, entran al texto firmado («identificado(a) con
// CC 1.098.765.432») —y con él a su huella SHA-256— y se guardan en el contrato (`purchase_contracts.producer_signer_doc_tipo` y
// `producer_signer_doc_numero`). La CC es lo habitual; los demás tipos cubren al extranjero, al PPT y a quien firma por una empresa.
// PURO: lo usan la firma (cliente), la acción que acepta (servidor), la página del contrato y los guardianes.

export const TIPOS_DE_DOCUMENTO = ["CC", "CE", "PPT", "PA", "NIT"] as const;
export type TipoDeDocumento = (typeof TIPOS_DE_DOCUMENTO)[number];

export const TIPO_DE_DOCUMENTO_LABEL: Record<TipoDeDocumento, string> = {
  CC: "Cédula de ciudadanía (CC)",
  CE: "Cédula de extranjería (CE)",
  PPT: "Permiso por Protección Temporal (PPT)",
  PA: "Pasaporte (PA)",
  NIT: "NIT (si firma por una empresa)",
};

export const esTipoDeDocumento = (v: unknown): v is TipoDeDocumento => typeof v === "string" && (TIPOS_DE_DOCUMENTO as readonly string[]).includes(v);

/** El número como se guarda: sin puntos ni espacios; el pasaporte en mayúsculas; el NIT con su dígito de verificación tras un guion. */
export function normalizarDocumento(tipo: TipoDeDocumento, numero: string): string {
  const s = String(numero ?? "").toUpperCase().replace(/[\s.]/g, "");
  if (tipo === "NIT") return s.replace(/[^0-9-]/g, "");
  if (tipo === "PA") return s.replace(/[^0-9A-Z]/g, "");
  return s.replace(/[^0-9]/g, "");
}

const REGLA: Record<TipoDeDocumento, RegExp> = {
  CC: /^[0-9]{4,10}$/,
  CE: /^[0-9]{4,10}$/,
  PPT: /^[0-9]{4,12}$/,
  PA: /^[0-9A-Z]{5,12}$/,
  NIT: /^[0-9]{8,10}(-[0-9])?$/,
};

// Lo que se le dice a quien firma cuando el número no cabe en la regla de su tipo (los puntos y espacios se aceptan y se quitan).
const AYUDA: Record<TipoDeDocumento, string> = {
  CC: "Revise el número de la cédula: de 4 a 10 dígitos.",
  CE: "Revise el número de la cédula de extranjería: de 4 a 10 dígitos.",
  PPT: "Revise el número del PPT: de 4 a 12 dígitos.",
  PA: "Revise el número del pasaporte: de 5 a 12 letras y números.",
  NIT: "Revise el NIT: de 8 a 10 dígitos y, si quiere, el dígito de verificación (900123456-7).",
};

export type DocumentoValidado = { ok: true; tipo: TipoDeDocumento; numero: string } | { ok: false; motivo: string };

/** ¿Es un documento que se puede poner en el contrato? Devuelve el número normalizado. */
export function validarDocumento(tipo: unknown, numero: unknown): DocumentoValidado {
  if (!esTipoDeDocumento(tipo)) return { ok: false, motivo: "Elija el tipo de documento." };
  const n = normalizarDocumento(tipo, String(numero ?? ""));
  if (!n) return { ok: false, motivo: "Escriba el número de su documento." };
  if (!REGLA[tipo].test(n)) return { ok: false, motivo: AYUDA[tipo] };
  return { ok: true, tipo, numero: n };
}

const conPuntos = (digitos: string) => digitos.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

/** El documento como lo dice el contrato: «CC 1.098.765.432» · «NIT 900.123.456-7» · «PA AB123456». */
export function documentoDelFirmante(tipo: TipoDeDocumento, numero: string): string {
  if (tipo === "PA") return `PA ${numero}`;
  const [base, dv] = numero.split("-");
  return `${tipo} ${conPuntos(base)}${dv ? `-${dv}` : ""}`;
}
