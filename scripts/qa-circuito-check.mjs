// Guardián del CIRCUITO DEL LOTE — el estado derivado (`src/lib/ocp/circuito.ts`, V5.62).
//
//   node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/qa-circuito-check.mjs
//
// GRATIS y sin red: ejercita un módulo puro.
//
// QUÉ VIGILA. El owner redibujó el camino del lote (2026-09-19, notas 2–5 del overhaul):
//   a evaluar → en evaluación → evaluado, pendiente de oferta → catálogo activo.
// Ninguno de esos nombres es una columna: se DERIVAN. Este guardián es la tabla de verdad de esa
// derivación, y está escrita DESDE LAS NOTAS DEL OWNER (`docs/OVERHAUL_CONSOLAS_PLAN.md`, cabecera y
// hallazgo §1.3), no desde el módulo: la lección de la V5.53 —un guardián que copia la regla de lo que
// vigila afirma el error en verde—. Cada caso de abajo cita la nota de la que sale.
//
// Y vigila lo que más importa cuando DOS superficies van a leer el mismo estado: que sea TOTAL (toda
// combinación de entradas da un estado conocido) y MONÓTONO (añadir un dato que solo puede significar
// avance nunca hace retroceder al lote).

import { readFileSync } from "node:fs";
import { estadoDelCircuito, CIRCUITO_LABEL, ORDEN_DEL_CIRCUITO } from "../src/lib/ocp/circuito.ts";

let ok = 0;
const fallos = [];
const check = (nombre, cond, detalle = "") => (cond ? ok++ : fallos.push(nombre + (detalle ? ` — ${detalle}` : "")));

const base = {
  stage: "apto",
  registradoPorCtc: false,
  tieneInscripcion: false,
  pagoConfirmado: false,
  muestraRecibida: false,
  grado: null,
  ultimaOferta: null,
  contrato: null,
};
const E = (cambios) => estadoDelCircuito({ ...base, ...cambios });

// ── 1. La tabla de verdad, nota por nota ────────────────────────────────────
const CASOS = [
  // «todavía no»
  ["un borrador sin nada más está en ficha", { stage: "borrador" }, "en_ficha"],
  ["un lote en EVA documental sigue en ficha (la EVA no es la evaluación del circuito)", { stage: "ficha_completa" }, "en_ficha"],
  ["un apto que no ha pedido la evaluación sigue en ficha", { stage: "apto" }, "en_ficha"],
  // NOTA 2 — «el lote cae ahí cuando el productor confirma que quiere la evaluación y se queda mientras se
  // confirman pago y muestra»
  ["nota 2: pidió la evaluación, sin pago ni muestra → a evaluar", { tieneInscripcion: true }, "a_evaluar"],
  ["nota 2: pagó pero la muestra no ha llegado → a evaluar", { tieneInscripcion: true, pagoConfirmado: true }, "a_evaluar"],
  ["nota 2: llegó la muestra pero no consta el pago → a evaluar", { tieneInscripcion: true, muestraRecibida: true }, "a_evaluar"],
  // NOTA 3 — «pagados y recibidos, en cola para la evaluación completa»
  ["nota 3: pagado Y recibido → en evaluación", { tieneInscripcion: true, pagoConfirmado: true, muestraRecibida: true }, "en_evaluacion"],
  ["nota 3: el lote que registró CTC a mano no paga inscripción: con el recibo basta", { registradoPorCtc: true, muestraRecibida: true }, "en_evaluacion"],
  // NOTA 4 — «toda la información del Q-Grader está; falta que alguien de CTCx confirme el grado y empuje la oferta»
  ["nota 4: tiene grado y ninguna oferta → pendiente de oferta", { tieneInscripcion: true, pagoConfirmado: true, muestraRecibida: true, grado: "blue", stage: "galardonado" }, "pendiente_oferta"],
  ["nota 4: la oferta anterior fue rechazada → vuelve a estar pendiente de oferta", { grado: "red", ultimaOferta: "rechazada" }, "pendiente_oferta"],
  ["nota 4: la oferta anterior se retiró → pendiente de oferta", { grado: "red", ultimaOferta: "retirada" }, "pendiente_oferta"],
  ["nota 4: la oferta anterior expiró → pendiente de oferta", { grado: "gold", ultimaOferta: "expirada" }, "pendiente_oferta"],
  // entre la 4 y la 5: la oferta salió y el productor no ha contestado
  ["la oferta salió y espera al productor → oferta emitida", { grado: "blue", ultimaOferta: "emitida" }, "oferta_emitida"],
  // NOTA 5 — «ofertas aceptadas por el productor»
  ["nota 5: el productor aceptó → catálogo activo", { grado: "blue", ultimaOferta: "aceptada" }, "catalogo_activo"],
  ["nota 5: hay contrato por firmar → catálogo activo", { grado: "blue", ultimaOferta: "aceptada", contrato: "pending_signature" }, "catalogo_activo"],
  ["nota 5: contrato vigente → catálogo activo", { grado: "gold", contrato: "active" }, "catalogo_activo"],
  ["nota 5: un contrato cumplido sigue siendo catálogo (es historia del trato, no un lote por ofertar)", { grado: "gold", contrato: "completed" }, "catalogo_activo"],
  // la salida lateral
  ["un No apto es No apto aunque tenga inscripción", { stage: "no_apto", tieneInscripcion: true, pagoConfirmado: true }, "no_apto"],
];
for (const [nombre, entrada, esperado] of CASOS) {
  const r = E(entrada);
  check(nombre, r.estado === esperado, `dio «${r.estado}»`);
}

// ── 2. Lo que FALTA se dice, y se dice bien ─────────────────────────────────
// La nota 2 habla de DOS confirmaciones. Quien mira «a evaluar» tiene que saber cuál falta sin abrir el lote.
{
  const sinNada = E({ tieneInscripcion: true }).falta.join(" · ");
  check("a evaluar sin nada: faltan el pago y la muestra", /pago/.test(sinNada) && /muestra/.test(sinNada), sinNada);
  const soloPago = E({ tieneInscripcion: true, pagoConfirmado: true }).falta.join(" · ");
  check("a evaluar con el pago: solo falta la muestra", !/pago/.test(soloPago) && /muestra/.test(soloPago), soloPago);
  const soloMuestra = E({ tieneInscripcion: true, muestraRecibida: true }).falta.join(" · ");
  check("a evaluar con la muestra: solo falta el pago", /pago/.test(soloMuestra) && !/muestra/.test(soloMuestra), soloMuestra);
  check("un contrato por firmar lo dice", E({ grado: "blue", contrato: "pending_signature" }).falta.some((f) => /firmar/.test(f)));
  check("un contrato vigente no le debe nada a nadie aquí", E({ grado: "blue", contrato: "active" }).falta.length === 0);
  check("una oferta muerta dice por qué hay que decidir otra", E({ grado: "red", ultimaOferta: "rechazada" }).falta.some((f) => /rechazada/.test(f)));
}

// ── 3. TOTAL: toda combinación da un estado conocido, con etiqueta ───────────
const STAGES = ["borrador", "ficha_completa", "videos_ok", "muestra_transito", "apto", "no_apto", "fila_arena", "evaluado", "galardonado", "etapa_que_no_existe"];
const OFERTAS = [null, "emitida", "aceptada", "rechazada", "retirada", "expirada", "estado_nuevo"];
const CONTRATOS = [null, "pending_signature", "active", "reconditioning", "completed", "cancelled"];
const B = [false, true];
let combinaciones = 0;
const desconocidos = [];
for (const stage of STAGES) for (const registradoPorCtc of B) for (const tieneInscripcion of B) for (const pagoConfirmado of B)
  for (const muestraRecibida of B) for (const grado of [null, "blue"]) for (const ultimaOferta of OFERTAS) for (const contrato of CONTRATOS) {
    combinaciones++;
    const r = estadoDelCircuito({ stage, registradoPorCtc, tieneInscripcion, pagoConfirmado, muestraRecibida, grado, ultimaOferta, contrato });
    if (!CIRCUITO_LABEL[r.estado] || r.label !== CIRCUITO_LABEL[r.estado] || !Array.isArray(r.falta)) desconocidos.push(JSON.stringify(r));
  }
check(`TOTAL: las ${combinaciones} combinaciones dan un estado conocido y etiquetado`, desconocidos.length === 0, desconocidos.slice(0, 3).join(" "));

// ── 4. MONÓTONO: un dato que solo puede ser avance nunca hace retroceder ─────
// Confirmar el pago, recibir la muestra, poner el grado, emitir la oferta o que la acepten son pasos ADELANTE.
// Si añadir cualquiera de ellos moviera al lote hacia atrás en el circuito, dos pantallas leyendo el mismo
// lote con segundos de diferencia dirían cosas contradictorias.
{
  const pos = (estado) => ORDEN_DEL_CIRCUITO.indexOf(estado);
  const AVANCES = [
    ["confirmar el pago", { pagoConfirmado: true }],
    ["recibir la muestra", { muestraRecibida: true }],
    ["poner el grado", { grado: "blue" }],
    ["emitir la oferta", { ultimaOferta: "emitida" }],
    ["que acepten la oferta", { ultimaOferta: "aceptada" }],
    ["crear el contrato", { contrato: "pending_signature" }],
  ];
  const retrocesos = [];
  for (const registradoPorCtc of B) for (const tieneInscripcion of B) for (const pagoConfirmado of B) for (const muestraRecibida of B)
    for (const grado of [null, "blue"]) {
      const antes = { ...base, registradoPorCtc, tieneInscripcion, pagoConfirmado, muestraRecibida, grado };
      const a = pos(estadoDelCircuito(antes).estado);
      for (const [nombre, cambio] of AVANCES) {
        const d = pos(estadoDelCircuito({ ...antes, ...cambio }).estado);
        if (d < a) retrocesos.push(`${nombre}: ${JSON.stringify(antes)}`);
      }
    }
  check("MONÓTONO: ningún avance hace retroceder a un lote", retrocesos.length === 0, retrocesos.slice(0, 2).join(" | "));
  check("el orden del circuito nombra los cuatro estados del owner, en su orden", ["a_evaluar", "en_evaluacion", "pendiente_oferta", "catalogo_activo"].every((s, i, arr) => i === 0 || pos(arr[i - 1]) < pos(s)));
}

// ── 5. El módulo es puro, y quien pinta el estado lo LEE de él ───────────────
{
  const fuente = readFileSync("src/lib/ocp/circuito.ts", "utf8");
  const codigo = fuente.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
  check("circuito.ts no importa nada: es puro", !/^\s*import\s/m.test(codigo));
  check("ni escribe en la base", !/\.(update|insert|upsert|delete)\(/.test(codigo));
  const tabla = readFileSync("src/app/ocp/(app)/kr/carga.ts", "utf8");
  check("la tabla del OCP deriva el estado con estadoDelCircuito()", tabla.includes("estadoDelCircuito("));
  check("y no se inventa etiquetas del circuito por su cuenta", !/["'`](A evaluar|En evaluación|Pendiente de oferta|Catálogo activo)["'`]/.test(tabla));
}

if (fallos.length) {
  console.error(`✗ qa-circuito: ${fallos.length} fallo(s), ${ok} OK\n`);
  for (const f of fallos) console.error("   " + f);
  process.exit(1);
}
console.log(`✓ qa-circuito: ${ok} comprobaciones OK, 0 fallos (${combinaciones} combinaciones)`);
