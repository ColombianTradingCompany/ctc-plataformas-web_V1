// Smoke check del correo del llamado (Terratalento): el builder es puro.
// node --experimental-strip-types scripts/qa-llamado-email-check.mjs
import { buildLlamadoEmail } from "../src/lib/email/llamadoEmail.ts";

const base = {
  nombre: "María Delgado", email: "x@example.com",
  fincaNombre: "La Esperanza", municipio: "Piedecuesta",
  fechaInicio: "2026-09-15", fechaFin: "2026-09-30",
  pago: "$800/kilo + almuerzo", condiciones: "Transporte incluido.",
};
let fails = 0;
const check = (name, cond) => { if (!cond) { fails++; console.error("FAIL:", name); } };

const llamado = buildLlamadoEmail({ ...base, tipo: "llamado" });
check("llamado subject", llamado.subject.includes("¡Te llamaron!") && llamado.subject.includes("La Esperanza"));
check("llamado saludo", llamado.text.startsWith("Hola María Delgado"));
check("llamado rango", llamado.text.includes("15 de septiembre") && llamado.text.includes("30 de septiembre"));
check("llamado pago", llamado.text.includes("$800/kilo"));
check("llamado panel", llamado.text.includes("/terratalento"));

const conf = buildLlamadoEmail({ ...base, tipo: "confirmado", fechaFin: null, pago: null, condiciones: null });
check("confirmado subject", conf.subject.includes("confirmado"));
check("confirmado sin fin", conf.text.includes("desde el 15 de septiembre") && !conf.text.includes("al 30"));
check("confirmado sin pago", !conf.text.includes("Pago:"));

console.log(fails === 0 ? "OK: 8/8 checks" : `${fails} FAILED`);
process.exit(fails === 0 ? 0 : 1);
