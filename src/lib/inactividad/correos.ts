// ── Los dos correos de la inactividad (V5.103) — PUROS: texto plano, como todo el correo transaccional de la casa ──
// El primero recuerda la cuenta y cómo entrar; el segundo avisa la fecha en que se borrará sola. Salen por el
// remitente único (`sendTransactionalEmail`), que ya salta las cuentas de prueba y las etiquetas sin buzón.

import { DIAS_ENTRE_PASOS } from "./reglas";

const SIGN = "Un abrazo,\nColombian Trading Company · CTCx\ninfo@ctcexport.com";

export function construirRecordatorioDeCuenta(o: { nombre: string; correo: string; enlaceKr: string; enlaceRecuperar: string }): { subject: string; text: string } {
  return {
    subject: "Su cuenta en Kaffetal Regal sigue esperando · Colombian Trading Company",
    text: [
      `Hola ${o.nombre},`,
      "",
      "Hace un tiempo creó su cuenta en Kaffetal Regal, la plataforma de CTC para caficultores, y todavía no tiene registrada ninguna finca ni ningún lote. Le escribimos para recordarle que la cuenta sigue ahí, a su nombre, lista para usarse.",
      "",
      "Cómo entrar:",
      `  · Abra ${o.enlaceKr} y pulse «Ingresar».`,
      `  · Su usuario es este correo: ${o.correo}.`,
      `  · Si no recuerda la contraseña, pida una nueva aquí: ${o.enlaceRecuperar}`,
      "",
      "Qué puede hacer desde su panel:",
      "  1. Completar su Información general (nombre, cédula cafetera, teléfono, departamento).",
      "  2. Registrar su finca en «Mis Fincas» y avanzar su Pasaporte EUDR.",
      "  3. Crear un lote y armar su Ficha Técnica para presentarlo a evaluación.",
      "",
      "Si necesita ayuda con cualquier paso, responda a este correo o escríbanos desde «Retroalimentación y ayuda» dentro de su panel.",
      "",
      SIGN,
    ].join("\n"),
  };
}

export function construirAvisoDeBorrado(o: { nombre: string; correo: string; enlaceKr: string; enlaceRecuperar: string; borradoEl: Date }): { subject: string; text: string } {
  const fecha = o.borradoEl.toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
  return {
    subject: `Su cuenta en Kaffetal Regal se borrará el ${fecha} por inactividad`,
    text: [
      `Hola ${o.nombre},`,
      "",
      `Hace un mes le recordamos su cuenta en Kaffetal Regal y sigue sin finca ni lote registrados. Por inactividad, la cuenta se borrará automáticamente el ${fecha} (en ${DIAS_ENTRE_PASOS} días).`,
      "",
      "Para conservarla basta con usarla: entre y registre su finca o cree un lote. Con una sola finca o un solo lote registrados, la cuenta no se borra.",
      "",
      `  · Entrar: ${o.enlaceKr} (usuario: ${o.correo})`,
      `  · Contraseña nueva: ${o.enlaceRecuperar}`,
      "",
      "Si prefiere que la borremos ya, o si tiene alguna duda, responda a este correo.",
      "",
      SIGN,
    ].join("\n"),
  };
}
