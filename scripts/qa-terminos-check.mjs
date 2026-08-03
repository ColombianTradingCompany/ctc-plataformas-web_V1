// Smoke check de los términos de una Jornada de Recolecta (módulo puro).
// node --experimental-strip-types scripts/qa-terminos-check.mjs
import {
  formatFormaPago,
  formatPago,
  incluye,
  resumenTerminos,
  terminosFromRow,
  tieneTerminosEstructurados,
} from "../src/lib/terratalento/terminos.ts";

let fails = 0;
const check = (name, cond) => {
  if (!cond) {
    fails++;
    console.error("FAIL:", name);
  }
};

// Fila completa, como la escribe el formulario de KR.
const fila = {
  pago_modalidad: "por_kilo",
  pago_valor: 800,
  pago_unidad: "kilo",
  pago_forma: "nequi",
  pago_frecuencia: "semanal",
  alojamiento: true,
  alojamiento_detalle: "Habitación compartida",
  alimentacion: true,
  alimentacion_detalle: "Desayuno y almuerzo",
  transporte: false,
  transporte_detalle: null,
  horario: "6:00 a.m. a 2:00 p.m.",
  duracion_estimada_dias: 15,
  requisitos: "Traer su propio coco",
  pago: "Bonificación por pasada selectiva",
  condiciones: "Cosecha principal",
};

const t = terminosFromRow(fila);
check("modalidad", t.pagoModalidad === "por_kilo");
check("valor numérico", t.pagoValor === 800);
check("pago formateado", formatPago(t) === "Por cantidad recogida · $800 por kilo");
check("forma de pago", formatFormaPago(t) === "Por Nequi, cada semana");
check("incluye 2", incluye(t).length === 2);
check("incluye detalle", incluye(t)[0] === "Alojamiento — Habitación compartida");
check("no incluye transporte", !incluye(t).some((x) => x.startsWith("Transporte")));
check("estructurados", tieneTerminosEstructurados(t) === true);

const lineas = resumenTerminos(t);
const label = (l) => lineas.find((x) => x.label === l)?.value;
check("línea pago", label("Pago") === "Por cantidad recogida · $800 por kilo");
check("línea horario", label("Horario") === "6:00 a.m. a 2:00 p.m.");
check("línea duración", label("Duración estimada") === "15 días");
check("nota de pago aparte", label("Nota sobre el pago") === "Bonificación por pasada selectiva");
check("condiciones", label("Condiciones") === "Cosecha principal");

// Jornada del V1: solo los dos textos libres. No debe romperse ni inventar.
const vieja = terminosFromRow({ pago: "$800/kilo + almuerzo", condiciones: "Transporte incluido." });
check("v1 sin estructurados", tieneTerminosEstructurados(vieja) === false);
check("v1 pago cae a la nota", formatPago(vieja) === "$800/kilo + almuerzo");
check("v1 sin forma de pago", formatFormaPago(vieja) === null);
check(
  "v1 incluye dice que no hay nada",
  resumenTerminos(vieja).find((l) => l.label === "Incluye")?.value.startsWith("No se ofrece")
);

// Fila vacía: nada explota.
const vacia = terminosFromRow({});
check("vacía sin pago", formatPago(vacia) === null);
check("vacía tiene la línea Incluye", resumenTerminos(vacia).length === 1);

// Snapshot en camelCase (por si alguna vez se congela ya normalizado).
const camel = terminosFromRow({ pagoModalidad: "jornal", pagoValor: 60000, pagoUnidad: "día" });
check("camelCase", formatPago(camel) === "Por jornal (día trabajado) · $60.000 por día");

console.log(fails === 0 ? "OK: 19/19 checks" : `${fails} FAILED`);
process.exit(fails === 0 ? 0 : 1);
